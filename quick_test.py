#!/usr/bin/env python3
"""Quick test to demonstrate the AI News Aggregator working with local Llama"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.database.repository import Repository
from app.database.models import YouTubeVideo, OpenAIArticle, AnthropicArticle
from app.agent.digest_agent import DigestAgent

def main():
    repo = Repository()
    
    # Get all articles (YouTube, OpenAI, Anthropic)
    youtube_videos = repo.session.query(YouTubeVideo).all()
    openai_articles = repo.session.query(OpenAIArticle).all()
    anthropic_articles = repo.session.query(AnthropicArticle).all()
    
    print(f"\n📰 Found {len(youtube_videos)} YouTube videos")
    print(f"📰 Found {len(openai_articles)} OpenAI articles")
    print(f"📰 Found {len(anthropic_articles)} Anthropic articles")
    
    # Create digests from OpenAI articles (they have descriptions)
    agent = DigestAgent()
    
    print("\n\n🤖 Generating digests with Llama 3.2 (Local AI)...\n")
    print("=" * 60)
    
    for article in openai_articles:
        print(f"\n📝 Article: {article.title}")
        print(f"URL: {article.url}")
        
        digest = agent.generate_digest(
            title=article.title,
            content=article.description or "Article description unavailable",
            article_type="openai"
        )
        
        if digest:
            print(f"\n✅ Generated Digest:")
            print(f"   Title: {digest.title}")
            print(f"   Summary: {digest.summary}")
        else:
            print("❌ Failed to generate digest")
        print("\n" + "-" * 60)
    
    print("\n✅ Test complete!")

if __name__ == "__main__":
    main()
