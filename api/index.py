"""FastAPI app for Anton Vasiliev's portfolio — a fake desktop OS. In production
nothing runs it: scripts/build_static.py requests every GET route once and writes
the responses to dist/ for GitHub Pages. Locally it's the dev server. So a route
only belongs here if it can be frozen: its URL is a file path, and its answer is
the same for every visitor.
"""

from __future__ import annotations

import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, Request
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.base import BaseHTTPMiddleware

import codewars_sync
import faceit_sync
import github_sync
import music_sync
import steam_sync
import video_sync
from config import RESUME_SOURCE
from data.lol import LOL
from data.profile import current_profile
from data.projects import CATEGORIES, PROJECTS

ROOT = Path(__file__).resolve().parent.parent
# Busts browser cache for static/*. The commit in a Pages build, so the hourly
# data refresh doesn't make every visitor re-download all the assets; the server
# start locally.
ASSET_VERSION = os.environ.get("GITHUB_SHA", "")[:8] or str(int(time.time()))

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


# Optional real recordings for the desktop's power cycle (static/js/boot.js):
# drop e.g. static/sounds/xp-startup.mp3 in and it replaces the synthesized one.
SOUND_NAMES = {"pc_boot": "pc-boot", "xp_startup": "xp-startup", "xp_shutdown": "xp-shutdown"}
SOUND_EXTS = (".mp3", ".ogg", ".wav", ".m4a")


def _sound_files() -> dict:
    sounds_dir = ROOT / "static" / "sounds"
    found = {}
    for key, stem in SOUND_NAMES.items():
        match = next((sounds_dir / (stem + ext) for ext in SOUND_EXTS if (sounds_dir / (stem + ext)).is_file()), None)
        found[key] = f"/static/sounds/{match.name}" if match else None
    return found


def _site_data_json() -> str:
    payload = {
        "profile": current_profile(),
        "projects": PROJECTS,
        "categories": CATEGORIES,
        "resume_source": RESUME_SOURCE,
        "sounds": _sound_files(),
        "lol": LOL,
    }
    return json.dumps(payload, ensure_ascii=False).replace("</", "<\\/")


def _base_context() -> dict:
    return {
        "profile": current_profile(),
        "projects": PROJECTS,
        "categories": CATEGORIES,
        "resume_source": RESUME_SOURCE,
        "site_data_json": _site_data_json(),
        "v": ASSET_VERSION,
    }


@app.get("/")
def home(request: Request):
    return templates.TemplateResponse(request, "new_desktop.html", _base_context())


@app.get("/desktop/")
def desktop(request: Request):
    return templates.TemplateResponse(request, "index.html", _base_context())


def _dossier(request: Request, lang: str):
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.hostname
    return templates.TemplateResponse(
        request,
        "dossier.html",
        {"profile": current_profile(), "lang": lang, "resume_source": RESUME_SOURCE, "site_host": host, "v": ASSET_VERSION},
    )


@app.get("/dossier/")
def dossier_ru(request: Request):
    return _dossier(request, "ru")


@app.get("/dossier/en/")
def dossier_en(request: Request):
    return _dossier(request, "en")


@app.get("/api/projects.json")
def projects():
    return {"projects": github_sync.merge_live_projects(PROJECTS)}


@app.get("/api/github/stats.json")
def github_stats():
    # Independent GitHub calls — run them side by side instead of paying for
    # each round-trip in turn.
    with ThreadPoolExecutor(max_workers=4) as pool:
        profile = pool.submit(github_sync.get_profile_stats)
        commits = pool.submit(github_sync.get_commit_count)
        contributions = pool.submit(github_sync.get_contribution_calendar)
        repos = pool.submit(github_sync.get_repo_stats)
        all_time = pool.submit(github_sync.get_total_contributions)
        stats = profile.result()
        stats["commit_count"] = commits.result()
        stats["contributions"] = contributions.result()
        stats["repos"] = repos.result()
        stats["contributions_total"] = all_time.result()
    return stats


@app.get("/api/codewars.json")
def codewars_stats():
    return codewars_sync.get_profile()


@app.get("/api/steam.json")
def steam_stats():
    # Screenshots and the CS inventory get their own files because the page
    # loads them separately: screenshots only when the Explorer tab opens,
    # the inventory without holding up the profile.
    return {
        "profile": steam_sync.get_profile(),
        "extra": steam_sync.get_extra_stats(),
        "recent_games": steam_sync.get_recently_played(),
        "top_games": steam_sync.get_top_games(),
    }


@app.get("/api/steam/screenshots.json")
def steam_screenshots():
    return {"screenshots": steam_sync.get_recent_screenshots(count=12)}


@app.get("/api/steam/inventory.json")
def steam_inventory():
    return {"cs_inventory": steam_sync.get_cs_inventory()}


@app.get("/api/faceit.json")
def faceit_stats():
    return {
        "player": faceit_sync.get_player(),
        "stats": faceit_sync.get_player_stats(),
        "recent_matches": faceit_sync.get_recent_matches(),
    }


@app.get("/api/music.json")
def music_tracks():
    return music_sync.get_tracks()


@app.get("/api/music/cover/{filename}")
def music_cover(filename: str):
    result = music_sync.get_cover(filename)
    if not result:
        return Response(status_code=404)
    data, mime = result
    return Response(content=data, media_type=mime, headers={"Cache-Control": "public, max-age=3600"})


@app.get("/api/video.json")
def video_list():
    return video_sync.get_videos()
