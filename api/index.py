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
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

import github_sync
import terminal
from config import RESUME_SOURCE
from data.profile import PROFILE
from data.projects import CATEGORIES, PROJECTS

ROOT = Path(__file__).resolve().parent.parent
START_TIME = time.time()

app = FastAPI(title="Anton Vasiliev", docs_url=None, redoc_url=None)

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
    }


@app.get("/")
def index(request: Request):
    return templates.TemplateResponse(request, "index.html", _base_context())


@app.get("/xp")
def xp(request: Request):
    return templates.TemplateResponse(request, "xp.html", _base_context())


@app.get("/dossier")
def dossier(request: Request, lang: str = "ru"):
    lang = lang if lang in ("ru", "en") else "ru"
    return templates.TemplateResponse(request, "dossier.html", {"profile": PROFILE, "lang": lang, "resume_source": RESUME_SOURCE})


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
    return github_sync.get_profile_stats()


class TerminalRequest(BaseModel):
    cmd: str = ""
    lang: str = "ru"


@app.post("/api/terminal")
def terminal_command(payload: TerminalRequest):
    result = terminal.run_command(payload.cmd, payload.lang)
    return JSONResponse(result)
