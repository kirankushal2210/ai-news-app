from datetime import datetime

from flask import Flask, redirect, render_template, url_for

from app.database.connection import SessionLocal
from app.database.models import AnthropicArticle, Digest, OpenAIArticle, YouTubeVideo
from app.runner import run_scrapers


def create_app() -> Flask:
    app = Flask(__name__, template_folder="templates", static_folder="static")

    @app.route("/")
    def index():
        session = SessionLocal()

        youtube_videos = session.query(YouTubeVideo).order_by(YouTubeVideo.published_at.desc()).limit(6).all()
        openai_articles = session.query(OpenAIArticle).order_by(OpenAIArticle.published_at.desc()).limit(6).all()
        anthropic_articles = session.query(AnthropicArticle).order_by(AnthropicArticle.published_at.desc()).limit(6).all()
        digests = session.query(Digest).order_by(Digest.created_at.desc()).limit(6).all()

        latest_created = session.query(Digest.created_at).order_by(Digest.created_at.desc()).first()
        all_counts = {
            "youtube": session.query(YouTubeVideo).count(),
            "openai": session.query(OpenAIArticle).count(),
            "anthropic": session.query(AnthropicArticle).count(),
            "digests": session.query(Digest).count(),
        }

        session.close()

        return render_template(
            "dashboard.html",
            youtube_videos=youtube_videos,
            openai_articles=openai_articles,
            anthropic_articles=anthropic_articles,
            digests=digests,
            counts=all_counts,
            last_updated=(latest_created[0] if latest_created else None)
        )

    @app.route("/refresh")
    def refresh():
        run_scrapers(hours=24)
        return redirect(url_for("index"))

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
