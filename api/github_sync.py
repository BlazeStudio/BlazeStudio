"""Thin, defensive wrapper around the public GitHub REST API (plus two endpoints
that aren't REST but are still safe to scrape unauthenticated: the commit search
count and the profile's public contribution-calendar fragment).

No database and no third-party HTTP client: stdlib urllib is enough for a handful of
small JSON/HTML responses, and it keeps the serverless bundle tiny. Results are cached in
a module-level dict for the lifetime of the function instance — on Vercel that's
usually minutes, which is plenty to avoid hammering GitHub's unauthenticated rate
limit (60 req/hour/IP for the REST API, 10 req/min for search) while still feeling
"live" to a visitor.
"""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from typing import Any

GITHUB_USER = "BlazeStudio"
API_BASE = f"https://api.github.com/users/{GITHUB_USER}"
TIMEOUT = 4.0
CACHE_TTL = 600  # seconds

_cache: dict[str, tuple[float, Any]] = {}


def _get(url: str, parse: str = "json") -> Any | None:
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "vasiliev-inc-site"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            raw = resp.read()
            return json.loads(raw) if parse == "json" else raw.decode("utf-8", "ignore")
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError):
        return None


def _cached(key: str, url: str, parse: str = "json") -> Any | None:
    now = time.time()
    if key in _cache:
        ts, value = _cache[key]
        if now - ts < CACHE_TTL:
            return value
    value = _get(url, parse)
    if value is not None:
        _cache[key] = (now, value)
        return value
    if key in _cache:
        return _cache[key][1]
    return None


def get_profile_stats() -> dict:
    data = _cached("profile", API_BASE)
    if not data:
        return {"public_repos": None, "followers": None, "avatar_url": None, "html_url": None, "created_at": None, "synced": False}
    return {
        "public_repos": data.get("public_repos"),
        "followers": data.get("followers"),
        "avatar_url": data.get("avatar_url"),
        "html_url": data.get("html_url"),
        "created_at": data.get("created_at"),
        "synced": True,
    }


def get_commit_count() -> int | None:
    """Total commits authored by the user, per the commit-search index. This only
    covers indexed default branches of non-fork public repos, so it's an
    approximation of the real total, not an exact count — good enough for a
    portfolio stat, not for anything that needs to be precise."""
    data = _cached("commit_search", f"https://api.github.com/search/commits?q=author:{GITHUB_USER}&per_page=1")
    if not data:
        return None
    return data.get("total_count")


_CONTRIB_DAY_RE = re.compile(r'data-date="(\d{4}-\d{2}-\d{2})"[^>]*?data-level="(\d)"')
_CONTRIB_TOTAL_RE = re.compile(r'id="js-contribution-activity-description"[^>]*>\s*([\d,]+)\s*contributions')


def get_contribution_calendar() -> dict:
    """Scrapes the small public HTML fragment GitHub itself serves at
    /users/<login>/contributions (used to render the embeddable contribution
    graph) — no auth needed, unlike the GraphQL API this data otherwise requires."""
    html = _cached(f"contrib:{GITHUB_USER}", f"https://github.com/users/{GITHUB_USER}/contributions", parse="text")
    if not html:
        return {"synced": False, "total": None, "days": []}
    days = [{"date": d, "level": int(level)} for d, level in _CONTRIB_DAY_RE.findall(html)]
    total_match = _CONTRIB_TOTAL_RE.search(html)
    total = int(total_match.group(1).replace(",", "")) if total_match else None
    return {"synced": bool(days), "total": total, "days": days}


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
