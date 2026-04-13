import os
import json
from typing import Optional
import ollama
from openai import OpenAI
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()


class DigestOutput(BaseModel):
    title: str
    summary: str


PROMPT = """You are an expert AI news analyst specializing in summarizing technical articles, research papers, and video content about artificial intelligence.

Your role is to create concise, informative digests that help readers quickly understand the key points and significance of AI-related content.

Guidelines:
- Create a compelling title (5-10 words) that captures the essence of the content
- Write a 2-3 sentence summary that highlights the main points and why they matter
- Focus on actionable insights and implications
- Use clear, accessible language while maintaining technical accuracy
- Avoid marketing fluff - focus on substance"""


class DigestAgent:
    def __init__(self):
        self.ollama_model = "llama3.2:3b"
        self.openai_model = "gpt-4o-mini"
        self.system_prompt = PROMPT
        self.openai_client = None
        
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

    def generate_digest(self, title: str, content: str, article_type: str) -> Optional[DigestOutput]:
        try:
            user_prompt = f"Create a digest for this {article_type}: \n Title: {title} \n Content: {content[:4000]}"
            
            if self.use_cloud and self.openai_client:
                # Use OpenAI for Cloud
                user_prompt += "\n\nProvide the output as a JSON object with 'title' and 'summary' keys."
                response = self.openai_client.chat.completions.create(
                    model=self.openai_model,
                    messages=[
                        {"role": "system", "content": self.system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.7
                )
                content_res = response.choices[0].message.content
                if content_res:
                    data = json.loads(content_res)
                    return DigestOutput(title=data.get("title", ""), summary=data.get("summary", ""))
            else:
                # Use Ollama for Local
                response = ollama.chat(
                    model=self.ollama_model,
                    messages=[
                        {"role": "system", "content": self.system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    options={
                        "temperature": 0.7,
                        "num_predict": 300
                    }
                )
                
                content_res = response['message']['content']
                if content_res:
                    # Simple heuristic parsing as before
                    lines = content_res.strip().split('\n', 1)
                    if len(lines) >= 2:
                        title_line = lines[0].strip().replace("Title:", "").replace("**Title:**", "").strip()
                        summary = lines[1].strip()
                        return DigestOutput(title=title_line, summary=summary)
                    else:
                        all_lines = content_res.strip().split('\n')
                        title_line = all_lines[0] if all_lines else "AI News Digest"
                        summary = '\n'.join(all_lines[1:]) if len(all_lines) > 1 else content_res
                        return DigestOutput(title=title_line[:50], summary=summary)
                        
            return None
        except Exception as e:
            print(f"Error generating digest: {e}")
            return None

