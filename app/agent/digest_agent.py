import os
from typing import Optional
import ollama
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
        self.model = "llama3.2:3b"  # Small, fast model for local inference
        self.system_prompt = PROMPT

    def generate_digest(self, title: str, content: str, article_type: str) -> Optional[DigestOutput]:
        try:
            user_prompt = f"Create a digest for this {article_type}: \n Title: {title} \n Content: {content[:4000]}"  # Shorter for local model

            response = ollama.chat(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                options={
                    "temperature": 0.7,
                    "num_predict": 300  # Limit response length
                }
            )
            
            content = response['message']['content']
            if content:
                # Parse the response - look for title and summary
                lines = content.strip().split('\n', 1)
                if len(lines) >= 2:
                    title_line = lines[0].strip()
                    # Remove common prefixes like "Title:" or "**Title:**"
                    title_line = title_line.replace("Title:", "").replace("**Title:**", "").strip()
                    summary = lines[1].strip()
                    return DigestOutput(title=title_line, summary=summary)
                else:
                    # Fallback: use first line as title, rest as summary
                    all_lines = content.strip().split('\n')
                    title_line = all_lines[0] if all_lines else "AI News Digest"
                    summary = '\n'.join(all_lines[1:]) if len(all_lines) > 1 else content
                    return DigestOutput(title=title_line[:50], summary=summary)
            return None
        except Exception as e:
            print(f"Error generating digest: {e}")
            return None

