import json
import os
import queue
import threading
import time
from datetime import datetime, timezone

from dotenv import load_dotenv
from flask import (
    Flask, Response, jsonify, redirect,
    render_template, request, send_from_directory,
    stream_with_context, url_for,
)

load_dotenv()

from app.database.connection import SessionLocal
from app.database.models import AnthropicArticle, Digest, OpenAIArticle, YouTubeVideo
from app.runner import run_scrapers
from app.services.process_anthropic import process_anthropic_markdown
from app.services.process_youtube import process_youtube_transcripts
from app.services.process_digest import process_digests

try:
    from app.services.process_email import send_digest_email
    _has_email = True
except Exception:
    _has_email = False

# ── SSE subscriber registry ───────────────────────────────────────────────────
_subscribers: list = []
_sub_lock = threading.Lock()

# ── Pipeline state ────────────────────────────────────────────────────────────
_pl_lock = threading.Lock()
_pl: dict = {
    "running": False,
    "step": 0,
    "step_label": "",
    "started_at": None,
    "finished_at": None,
    "result": None,
    "error": None,
    "next_run_at": None,
}

STEPS = [
    "",
    "Scraping articles from YouTube, OpenAI & Anthropic…",
    "Processing Anthropic markdown content…",
    "Fetching YouTube transcripts…",
    "Generating AI digests…",
    "Sending email digest…",
]

AUTO_INTERVAL_MINUTES = 30
DEFAULT_HOURS = 168  # full 7-day window — sources like Anthropic publish infrequently


# ── Helpers ───────────────────────────────────────────────────────────────────
def _publish(event: str, data: dict) -> None:
    """Broadcast an SSE event to all connected clients."""
    msg = json.dumps(data, default=str)
    with _sub_lock:
        dead = []
        for q in _subscribers:
            try:
                q.put_nowait((event, msg))
            except queue.Full:
                dead.append(q)
        for d in dead:
            _subscribers.remove(d)


def _to_dict(item, source: str) -> dict:
    pub = getattr(item, "published_at", None)
    vid_id = getattr(item, "video_id", None)
    guid   = getattr(item, "guid", None)
    return {
        "id":           vid_id or guid or "",
        "source":       source,
        "title":        item.title or "",
        "url":          item.url or "",
        "description":  (item.description or "")[:280],
        "published_at": pub.isoformat() if pub else datetime.now(timezone.utc).isoformat(),
    }


def _stats_from_session(session) -> dict:
    latest = (
        session.query(Digest.created_at)
        .order_by(Digest.created_at.desc())
        .first()
    )
    return {
        "youtube":      session.query(YouTubeVideo).count(),
        "openai":       session.query(OpenAIArticle).count(),
        "anthropic":    session.query(AnthropicArticle).count(),
        "digests":      session.query(Digest).count(),
        "last_updated": latest[0].isoformat() if latest else None,
        "next_run_at":  _pl.get("next_run_at"),
    }


def _get_stats() -> dict:
    session = SessionLocal()
    try:
        return _stats_from_session(session)
    finally:
        session.close()


# ── Pipeline ──────────────────────────────────────────────────────────────────
def _run_pipeline(hours: int = 24, top_n: int = 10) -> None:
    def _step(n: int) -> None:
        _pl.update({"step": n, "step_label": STEPS[n]})
        _publish("pipeline_status", {"running": True, "step": n, "step_label": STEPS[n]})

    # Snapshot existing IDs before scraping so we can detect additions
    snap = SessionLocal()
    try:
        ex_yt = {r[0] for r in snap.query(YouTubeVideo.video_id).all()}
        ex_oa = {r[0] for r in snap.query(OpenAIArticle.guid).all()}
        ex_an = {r[0] for r in snap.query(AnthropicArticle.guid).all()}
    finally:
        snap.close()

    try:
        _step(1); run_scrapers(hours=hours)
        _step(2); process_anthropic_markdown()
        _step(3); process_youtube_transcripts()
        _step(4); process_digests()
        _step(5)
        if _has_email:
            try:
                send_digest_email(hours=hours, top_n=top_n)
            except Exception:
                pass

        # Detect and broadcast new articles to all SSE clients
        new_s = SessionLocal()
        try:
            new_count = 0

            if ex_yt:
                new_vids = (
                    new_s.query(YouTubeVideo)
                    .filter(YouTubeVideo.video_id.notin_(ex_yt))
                    .order_by(YouTubeVideo.published_at.desc())
                    .all()
                )
                for v in new_vids:
                    _publish("new_article", _to_dict(v, "youtube"))
                    new_count += 1

            if ex_oa:
                new_oas = (
                    new_s.query(OpenAIArticle)
                    .filter(OpenAIArticle.guid.notin_(ex_oa))
                    .order_by(OpenAIArticle.published_at.desc())
                    .all()
                )
                for a in new_oas:
                    _publish("new_article", _to_dict(a, "openai"))
                    new_count += 1

            if ex_an:
                new_ans = (
                    new_s.query(AnthropicArticle)
                    .filter(AnthropicArticle.guid.notin_(ex_an))
                    .order_by(AnthropicArticle.published_at.desc())
                    .all()
                )
                for a in new_ans:
                    _publish("new_article", _to_dict(a, "anthropic"))
                    new_count += 1

            # Push refreshed stats
            updated_stats = _stats_from_session(new_s)
            _publish("stats", updated_stats)
        finally:
            new_s.close()

        _pl["result"] = "success"

    except Exception as exc:
        _pl.update({"result": "error", "error": str(exc)})

    finally:
        _pl.update({
            "running":    False,
            "step":       0,
            "step_label": "",
            "finished_at": datetime.now(timezone.utc).isoformat(),
        })
        _publish("pipeline_status", {
            "running": False,
            "result":  _pl["result"],
            "error":   _pl.get("error"),
        })


def _start_pipeline(hours: int = 24, top_n: int = 10) -> bool:
    """Start the pipeline in a background thread. Returns True if started."""
    with _pl_lock:
        if _pl["running"]:
            return False
        _pl.update({
            "running":    True,
            "step":       1,
            "step_label": STEPS[1],
            "started_at": datetime.now(timezone.utc).isoformat(),
            "finished_at": None,
            "result":     None,
            "error":      None,
        })
    threading.Thread(
        target=_run_pipeline, args=(hours, top_n), daemon=True
    ).start()
    return True


def _scheduler() -> None:
    """Auto-trigger the pipeline every AUTO_INTERVAL_MINUTES minutes."""
    interval = AUTO_INTERVAL_MINUTES * 60
    while True:
        next_ts = time.time() + interval
        _pl["next_run_at"] = (
            datetime.fromtimestamp(next_ts, tz=timezone.utc).isoformat()
        )
        time.sleep(interval)
        _start_pipeline()


# ── Guard so the scheduler starts only once per process ──────────────────────
_scheduler_started = False
_scheduler_guard   = threading.Lock()


def create_app() -> Flask:
    global _scheduler_started

    app = Flask(__name__, template_folder="templates", static_folder="static")

    with _scheduler_guard:
        if not _scheduler_started:
            _scheduler_started = True
            threading.Thread(target=_scheduler, daemon=True).start()

    # ── Dashboard — serve React SPA build ────────────────────────────────────
    REACT_DIR = os.path.join(os.path.dirname(__file__), 'static', 'react')

    @app.route("/", defaults={'path': ''})
    @app.route("/<path:path>")
    def serve_react(path):
        # Serve static assets from the React directory
        if path and os.path.exists(os.path.join(REACT_DIR, path)):
            return send_from_directory(REACT_DIR, path)
        
        # fallback to API check (though APIs are defined below, 
        # Flask checks routes in order, so we should put this below API routes or handle it here)
        if path.startswith('api/'):
            return None # Fall through to rest of routes
            
        # Default: serve index.html for SPA routing
        react_index = os.path.join(REACT_DIR, 'index.html')
        if os.path.exists(react_index):
            return send_from_directory(REACT_DIR, 'index.html')
            
        # Fallback: plain stats page while React build is absent
        session = SessionLocal()
        try:
            stats = _stats_from_session(session)
        finally:
            session.close()
        return jsonify(stats)  # bare JSON fallback

    # ── REST API ──────────────────────────────────────────────────────────────
    @app.route("/api/stats")
    def api_stats():
        return jsonify(_get_stats())

    @app.route("/api/news")
    def api_news():
        source = request.args.get("source", "all")
        limit  = min(int(request.args.get("limit", 20)), 100)
        offset = int(request.args.get("offset", 0))
        session = SessionLocal()
        items: list = []
        try:
            if source in ("all", "youtube"):
                for v in (session.query(YouTubeVideo)
                          .order_by(YouTubeVideo.published_at.desc()).all()):
                    items.append(_to_dict(v, "youtube"))
            if source in ("all", "openai"):
                for a in (session.query(OpenAIArticle)
                          .order_by(OpenAIArticle.published_at.desc()).all()):
                    items.append(_to_dict(a, "openai"))
            if source in ("all", "anthropic"):
                for a in (session.query(AnthropicArticle)
                          .order_by(AnthropicArticle.published_at.desc()).all()):
                    items.append(_to_dict(a, "anthropic"))

            items.sort(key=lambda x: x["published_at"], reverse=True)
            total = len(items)
            items = items[offset: offset + limit]
        finally:
            session.close()
        return jsonify({"items": items, "total": total, "offset": offset, "limit": limit})

    @app.route("/api/digests")
    def api_digests():
        limit = min(int(request.args.get("limit", 10)), 50)
        session = SessionLocal()
        try:
            ds = (session.query(Digest)
                  .order_by(Digest.created_at.desc()).limit(limit).all())
            return jsonify({"items": [
                {
                    "id":           d.id,
                    "article_type": d.article_type,
                    "url":          d.url,
                    "title":        d.title,
                    "summary":      d.summary,
                    "created_at":   d.created_at.isoformat() if d.created_at else None,
                }
                for d in ds
            ]})
        finally:
            session.close()

    @app.route("/api/pipeline/run", methods=["POST"])
    def api_pipeline_run():
        started = _start_pipeline(hours=DEFAULT_HOURS)
        return jsonify({"status": "started" if started else "already_running"}), 202

    @app.route("/api/pipeline/status")
    def api_pipeline_status():
        return jsonify(dict(_pl))

    # ── SSE stream ────────────────────────────────────────────────────────────
    @app.route("/api/stream")
    def api_stream():
        def gen():
            q: queue.Queue = queue.Queue(maxsize=200)
            with _sub_lock:
                _subscribers.append(q)
            try:
                # Send initial state
                yield f"event: stats\ndata: {json.dumps(_get_stats(), default=str)}\n\n"
                if _pl["running"]:
                    yield (
                        f"event: pipeline_status\ndata: "
                        f"{json.dumps({'running': True, 'step': _pl['step'], 'step_label': _pl['step_label']})}\n\n"
                    )
                while True:
                    try:
                        event, msg = q.get(timeout=20)
                        yield f"event: {event}\ndata: {msg}\n\n"
                    except queue.Empty:
                        yield ": heartbeat\n\n"
            finally:
                with _sub_lock:
                    try:
                        _subscribers.remove(q)
                    except ValueError:
                        pass

        return Response(
            stream_with_context(gen()),
            content_type="text/event-stream",
            headers={
                "Cache-Control":    "no-cache",
                "X-Accel-Buffering": "no",
                "Connection":       "keep-alive",
            },
        )

    # Legacy redirect
    @app.route("/refresh")
    def refresh():
        _start_pipeline(hours=DEFAULT_HOURS)
        return redirect(url_for("index"))

    return app


if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5001
    create_app().run(
        host="0.0.0.0", port=port,
        debug=True, threaded=True, use_reloader=False,
    )
