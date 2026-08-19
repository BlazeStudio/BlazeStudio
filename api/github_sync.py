"""Thin, defensive wrapper around the public GitHub REST API.

No database and no third-party HTTP client: stdlib urllib is enough for a handful of
small JSON responses, and it keeps the serverless bundle tiny. Results are cached in
a module-level dict for the lifetime of the function instance — on Vercel that's
usually minutes, which is plenty to avoid hammering GitHub's unauthenticated rate
limit (60 req/hour/IP) while still feeling "live" to a visitor.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from typing import Any

GITHUB_USER = "BlazeStudio"
API_BASE = f"https://api.github.com/users/{GITHUB_USER}"
TIMEOUT = 4.0
CACHE_TTL = 600  # seconds

_cache: dict[str, tuple[float, Any]] = {}


def _get_json(url: str) -> Any | None:
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "vasiliev-inc-site"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError):
        return None


def _cached(key: str, url: str) -> Any | None:
    now = time.time()
    if key in _cache:
        ts, value = _cache[key]
        if now - ts < CACHE_TTL:
            return value
    value = _get_json(url)
    if value is not None:
        _cache[key] = (now, value)
        return value
    if key in _cache:
        return _cache[key][1]
    return None


def get_profile_stats() -> dict:
    data = _cached("profile", API_BASE)
    if not data:
        return {"public_repos": None, "followers": None, "synced": False}
    return {
        "public_repos": data.get("public_repos"),
        "followers": data.get("followers"),
        "created_at": data.get("created_at"),
        "synced": True,
    }


def get_repo_live(repo: str) -> dict:
    data = _cached(f"repo:{repo}", f"https://api.github.com/repos/{GITHUB_USER}/{repo}")
    if not data:
        return {"stars": None, "pushed_at": None, "synced": False}
    return {
        "stars": data.get("stargazers_count"),
        "pushed_at": data.get("pushed_at"),
        "synced": True,
    }


def merge_live_projects(projects: list[dict]) -> list[dict]:
    merged = []
    for project in projects:
        live = get_repo_live(project["repo"])
        merged.append({**project, "live": live})
    return merged
