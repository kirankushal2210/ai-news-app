import os
import json
import re
from typing import List, Optional
import ollama
from openai import OpenAI
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()


class RankedArticle(BaseModel):
    digest_id: str = Field(description="The ID of the digest (article_type:article_id)")
    relevance_score: float = Field(description="Relevance score from 0.0 to 10.0", ge=0.0, le=10.0)
    rank: int = Field(description="Rank position (1 = most relevant)", ge=1)
    reasoning: str = Field(description="Brief explanation of why this article is ranked here")


class RankedDigestList(BaseModel):
    articles: List[RankedArticle] = Field(description="List of ranked articles")


CURATOR_PROMPT = """You are an expert AI news curator specializing in personalized content ranking for AI professionals.

Your role is to analyze and rank AI-related news articles, research papers, and video content based on a user's specific profile, interests, and background.

Ranking Criteria:
1. Relevance to user's stated interests and background
2. Technical depth and practical value
3. Novelty and significance of the content
4. Alignment with user's expertise level
5. Actionability and real-world applicability

Scoring Guidelines:
- 9.0-10.0: Highly relevant, directly aligns with user interests, significant value
- 7.0-8.9: Very relevant, strong alignment with interests, good value
- 5.0-6.9: Moderately relevant, some alignment, decent value
- 3.0-4.9: Somewhat relevant, limited alignment, lower value
- 0.0-2.9: Low relevance, minimal alignment, little value

Rank articles from most relevant (rank 1) to least relevant. Ensure each article has a unique rank."""


class CuratorAgent:
    def __init__(self, user_profile: dict):
        self.ollama_model = "llama3.2:3b"
        self.openai_model = "gpt-4o-mini"
        self.user_profile = user_profile
        self.system_prompt = self._build_system_prompt()
        self.openai_client = None
        
        # Check if we should use Cloud LLM
        self.use_cloud = os.getenv("USE_CLOUD_LLM", "false").lower() == "true"
        
        if self.use_cloud or not self._is_ollama_available():
            api_key = os.getenv("OPENAI_API_KEY")
            if api_key:
                self.openai_client = OpenAI(api_key=api_key)
                self.use_cloud = True

    def _is_ollama_available(self) -> bool:
        try:
            ollama.list()
            return True
        except Exception:
            return False

    def _build_system_prompt(self) -> str:
        interests = "\n".join(f"- {interest}" for interest in self.user_profile["interests"])
        preferences = self.user_profile["preferences"]
        pref_text = "\n".join(f"- {k}: {v}" for k, v in preferences.items())
        
        return f"""{CURATOR_PROMPT}

User Profile:
Name: {self.user_profile["name"]}
Background: {self.user_profile["background"]}
Expertise Level: {self.user_profile["expertise_level"]}

Interests:
{interests}

Preferences:
{pref_text}"""

    def rank_digests(self, digests: List[dict]) -> List[RankedArticle]:
        if not digests:
            return []
        
        digest_list = "\n\n".join([
            f"ID: {d['id']}\nTitle: {d['title']}\nSummary: {d['summary']}\nType: {d['article_type']}"
            for d in digests
        ])
        
        user_prompt = f"""Rank these {len(digests)} AI news digests based on the user profile:

{digest_list}

Provide the output as a JSON object matching this schema:
{{
  "articles": [
    {{
      "digest_id": "string",
      "relevance_score": float,
      "rank": integer,
      "reasoning": "string"
    }}
  ]
}}"""

        try:
            if self.use_cloud and self.openai_client:
                # Use OpenAI for Cloud/Production
                response = self.openai_client.chat.completions.create(
                    model=self.openai_model,
                    messages=[
                        {"role": "system", "content": self.system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.3
                )
                content = response.choices[0].message.content
                if content:
                    data = json.loads(content)
                    return [RankedArticle(**article) for article in data.get("articles", [])]
            else:
                # Fallback to Ollama for Local
                response = ollama.chat(
                    model=self.ollama_model,
                    messages=[
                        {"role": "system", "content": self.system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    options={"temperature": 0.3}
                )
                
                content = response['message']['content']
                return self._parse_ollama_response(content)
                
            return []
        except Exception as e:
            print(f"Error ranking digests: {e}")
            return []

    def _parse_ollama_response(self, content: str) -> List[RankedArticle]:
        """Heuristic parsing for local models that may not follow JSON format perfectly."""
        if not content:
            return []
            
        ranked_articles = []
        # Try to find JSON inside the content
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(0))
                if isinstance(data, dict) and "articles" in data:
                    return [RankedArticle(**article) for article in data["articles"]]
            except:
                pass

        # Fallback to line-by-line parsing as before
        lines = content.strip().split('\n')
        current_article = None
        for line in lines:
            line = line.strip()
            if line.startswith('ID:') or 'digest_id:' in line.lower():
                if current_article:
                    ranked_articles.append(current_article)
                match = re.search(r'["\']?([^"\']+)["\']?$', line)
                digest_id = match.group(1) if match else line.split(':')[-1].strip()
                current_article = RankedArticle(
                    digest_id=digest_id,
                    relevance_score=5.0,
                    rank=len(ranked_articles) + 1,
                    reasoning="Ranked by local AI model"
                )
            elif 'score:' in line.lower() or 'relevance:' in line.lower():
                if current_article and any(char.isdigit() for char in line):
                    score_match = re.search(r'(\d+\.?\d*)', line)
                    if score_match:
                        current_article.relevance_score = float(score_match.group(1))

        if current_article:
            ranked_articles.append(current_article)
        
        ranked_articles.sort(key=lambda x: x.relevance_score, reverse=True)
        for i, article in enumerate(ranked_articles, 1):
            article.rank = i
        return ranked_articles
