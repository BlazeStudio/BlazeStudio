"""FastAPI backend for Anton Vasiliev's portfolio — a fake desktop OS. Deliberately
stateless: every route reads from the Python modules in api/data/ or from GitHub's
public API, so the whole thing runs on Vercel's free tier without a database.
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware

import faceit_sync
import github_sync
import music_sync
import steam_sync
import terminal
import video_sync
from config import RESUME_SOURCE
from data.profile import PROFILE
from data.projects import CATEGORIES, PROJECTS

ROOT = Path(__file__).resolve().parent.parent
START_TIME = time.time()
ASSET_VERSION = str(int(START_TIME))  # busts browser cache for static/* on every (re)deploy

app = FastAPI(title="Anton Vasiliev", docs_url=None, redoc_url=None)


class NoCacheStaticMiddleware(BaseHTTPMiddleware):
    """/static/* URLs are versioned with ?v=<ASSET_VERSION>, but that only
    changes on a server (re)start — editing a CSS/JS/template file mid-session
    doesn't bump it. Without an explicit Cache-Control, browsers apply their
    own heuristic freshness lifetime to that unchanged URL and can silently
    keep serving the pre-edit file for a while. "no-cache" (not "no-store")
    just forces a revalidation round-trip every time — StaticFiles already
    answers those with 304s when the file hasn't actually changed, so this
    costs nothing but a cheap conditional request, not the whole payload."""

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/static/"):
            response.headers["Cache-Control"] = "no-cache"
        return response


app.add_middleware(NoCacheStaticMiddleware)

templates = Jinja2Templates(directory=str(ROOT / "templates"))

static_dir = ROOT / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

STATUS_MESSAGES = {
    "ru": [
        "Кофе-машина: онлайн",
        "Продакшен: без инцидентов",
        "Код-ревью: в очереди 0",
        "Дедлайны: под контролем",
        "Миграции БД: применены",
    ],
    "en": [
        "Coffee machine: online",
        "Production: no incidents",
        "Code review queue: empty",
        "Deadlines: under control",
        "DB migrations: applied",
    ],
}


def _site_data_json() -> str:
    payload = {"profile": PROFILE, "projects": PROJECTS, "categories": CATEGORIES, "resume_source": RESUME_SOURCE}
    return json.dumps(payload, ensure_ascii=False).replace("</", "<\\/")


def _base_context() -> dict:
    return {
        "profile": PROFILE,
        "projects": PROJECTS,
        "categories": CATEGORIES,
        "resume_source": RESUME_SOURCE,
        "site_data_json": _site_data_json(),
        "v": ASSET_VERSION,
    }


@app.get("/")
def home(request: Request):
    return templates.TemplateResponse(request, "new_desktop.html", _base_context())


@app.get("/desktop")
def desktop(request: Request):
    return templates.TemplateResponse(request, "index.html", _base_context())


@app.get("/xp")
def xp(request: Request):
    return templates.TemplateResponse(request, "xp.html", _base_context())


@app.get("/isaac")
def isaac(request: Request):
    return templates.TemplateResponse(request, "isaac.html", _base_context())


@app.get("/dossier")
def dossier(request: Request, lang: str = "ru"):
    lang = lang if lang in ("ru", "en") else "ru"
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.hostname
    return templates.TemplateResponse(
        request,
        "dossier.html",
        {"profile": PROFILE, "lang": lang, "resume_source": RESUME_SOURCE, "site_host": host, "v": ASSET_VERSION},
    )


@app.get("/api/health")
def health():
    return {"status": "ok", "uptime_seconds": round(time.time() - START_TIME, 1)}


@app.get("/api/status")
def status(lang: str = "ru"):
    lang = lang if lang in STATUS_MESSAGES else "ru"
    messages = STATUS_MESSAGES[lang]
    idx = int(time.time() / 15) % len(messages)
    return {
        "time": time.strftime("%H:%M:%S"),
        "message": messages[idx],
        "uptime_seconds": round(time.time() - START_TIME, 1),
    }


@app.get("/api/projects")
def projects(live: bool = True):
    data = github_sync.merge_live_projects(PROJECTS) if live else PROJECTS
    return {"projects": data}


@app.get("/api/github/stats")
def github_stats():
    stats = github_sync.get_profile_stats()
    stats["commit_count"] = github_sync.get_commit_count()
    stats["contributions"] = github_sync.get_contribution_calendar()
    return stats


@app.get("/api/steam")
def steam_stats():
    # Screenshots and the CS inventory both live on their own endpoints
    # (see below) rather than being bundled in here, for the same reason in
    # both cases: this endpoint's profile/extra/games calls are the official,
    # API-key'd Web API and answer near-instantly, while inventory pricing
    # and the screenshot scrape each hit steamcommunity.com directly and can
    # legitimately take several seconds (or get rate-limited and fail) on
    # their own. Bundling either into this one meant a slow/failing one of
    # them held the whole response hostage — worst case actually timing out
    # the request outright on a serverless deploy's function-duration limit —
    # so profile/stats never even rendered even though they'd been ready
    # instantly. Splitting them out means each piece loads (or fails) on its
    # own, on its own retry schedule, without blocking or re-triggering the
    # others.
    return {
        "profile": steam_sync.get_profile(),
        "extra": steam_sync.get_extra_stats(),
        "recent_games": steam_sync.get_recently_played(),
        "top_games": steam_sync.get_top_games(),
    }


@app.get("/api/steam/screenshots")
def steam_screenshots():
    return {"screenshots": steam_sync.get_recent_screenshots(count=12)}


@app.get("/api/steam/inventory")
def steam_inventory():
    return {"cs_inventory": steam_sync.get_cs_inventory()}


@app.get("/api/faceit")
def faceit_stats():
    return {
        "player": faceit_sync.get_player(),
        "stats": faceit_sync.get_player_stats(),
        "recent_matches": faceit_sync.get_recent_matches(),
    }


@app.get("/api/music")
def music_tracks():
    return music_sync.get_tracks()


@app.get("/api/music/cover/{filename}")
def music_cover(filename: str):
    result = music_sync.get_cover(filename)
    if not result:
        return Response(status_code=404)
    data, mime = result
    return Response(content=data, media_type=mime, headers={"Cache-Control": "public, max-age=3600"})


@app.get("/api/video")
def video_list():
    return video_sync.get_videos()


class TerminalRequest(BaseModel):
    cmd: str = ""
    lang: str = "ru"


@app.post("/api/terminal")
def terminal_command(payload: TerminalRequest):
    result = terminal.run_command(payload.cmd, payload.lang)
    return JSONResponse(result)
