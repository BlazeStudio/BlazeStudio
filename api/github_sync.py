"""Thin, defensive wrapper around the public GitHub REST API (plus two endpoints
that aren't REST but are still safe to scrape unauthenticated: the commit search
count and the profile's public contribution-calendar fragment).

No database and no third-party HTTP client: stdlib urllib is enough for a handful of
small JSON/HTML responses, and it keeps the serverless bundle tiny. Results are cached in
a module-level dict for the lifetime of the function instance — on Vercel that's
usually minutes, which is plenty to avoid hammering GitHub's unauthenticated rate
limit (60 req/hour/IP for the REST API, 10 req/min for search) while still feeling
"live" to a visitor. Set GITHUB_TOKEN (any fine-grained token with public read access)
to lift that to 5000/hour — the per-repo language and code-size stats need it on
Vercel, where many instances share a few IPs.
"""

from __future__ import annotations

import json
import os
import re
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import urllib.error
import urllib.request
from typing import Any

GITHUB_USER = "BlazeStudio"
API_BASE = f"https://api.github.com/users/{GITHUB_USER}"
TIMEOUT = 4.0
CACHE_TTL = 600  # seconds
REPO_STATS_TTL = 6 * 3600  # per-repo languages / code size barely move — and cost one call per repo
TOKEN = os.environ.get("GITHUB_TOKEN", "")

_cache: dict[str, tuple[float, Any]] = {}


def _headers() -> dict[str, str]:
    h = {"Accept": "application/vnd.github+json", "User-Agent": "vasiliev-inc-site"}
    if TOKEN:
        h["Authorization"] = f"Bearer {TOKEN}"
    return h


def _get(url: str, parse: str = "json") -> Any | None:
    req = urllib.request.Request(url, headers=_headers())
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            raw = resp.read()
            return json.loads(raw) if parse == "json" else raw.decode("utf-8", "ignore")
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError):
        return None


def _cached(key: str, url: str, parse: str = "json", ttl: float = CACHE_TTL, valid=None) -> Any | None:
    now = time.time()
    if key in _cache:
        ts, value = _cache[key]
        if now - ts < ttl:
            return value
    value = _get(url, parse)
    if value is not None and (valid is None or valid(value)):
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
    # The fragment is a table laid out row by row (every Sunday of the year,
    # then every Monday…), so document order isn't date order — sort it, or
    # the weeks come out scrambled when drawn column by column.
    days = sorted(({"date": d, "level": int(level)} for d, level in _CONTRIB_DAY_RE.findall(html)), key=lambda x: x["date"])
    total_match = _CONTRIB_TOTAL_RE.search(html)
    total = int(total_match.group(1).replace(",", "")) if total_match else None
    return {"synced": bool(days), "total": total, "days": days}


def _search_total(key: str, query: str) -> int | None:
    data = _cached(key, f"https://api.github.com/search/issues?q={query}&per_page=1")
    return data.get("total_count") if isinstance(data, dict) else None


TOP_LANGUAGES = 10


def _repo_languages(repo: str) -> dict[str, int]:
    """Bytes of code per language in one repo (GitHub linguist's own breakdown)."""
    data = _cached(f"langs:{repo}", f"https://api.github.com/repos/{GITHUB_USER}/{repo}/languages", ttl=REPO_STATS_TTL, valid=lambda v: isinstance(v, dict))
    return data if isinstance(data, dict) else {}


def _repo_lines(repo: str) -> int | None:
    """Net lines in the repo's history: weekly additions minus deletions from
    /stats/code_frequency. GitHub computes that lazily — the first ask gets an
    empty 202 and kicks off the job — so a repo counts once it's ready (the
    empty answer is never cached, the next visit asks again)."""
    data = _cached(
        f"loc:{repo}",
        f"https://api.github.com/repos/{GITHUB_USER}/{repo}/stats/code_frequency",
        ttl=REPO_STATS_TTL,
        valid=lambda v: isinstance(v, list) and len(v) > 0,
    )
    if not isinstance(data, list) or not data:
        return None
    return max(0, sum((week[1] or 0) + (week[2] or 0) for week in data if len(week) >= 3))


def get_repo_stats() -> dict:
    """Totals across the user's own (non-fork) public repos — stars, forks,
    languages by bytes of code (up to TOP_LANGUAGES of them), lines of code —
    plus authored PR/issue counts from search."""
    repos = _cached("repos", f"{API_BASE}/repos?per_page=100&type=owner")
    if not isinstance(repos, list):
        return {"synced": False}
    own = [r for r in repos if not r.get("fork") and r.get("name")]
    names = [r["name"] for r in own]
    with ThreadPoolExecutor(max_workers=8) as pool:
        per_repo_langs = list(pool.map(_repo_languages, names))
        per_repo_lines = list(pool.map(_repo_lines, names))
    language_bytes: Counter = Counter()
    for langs in per_repo_langs:
        language_bytes.update(langs)
    if not language_bytes:  # per-repo calls rate-limited — fall back to each repo's primary language
        language_bytes = Counter({lang: n for lang, n in Counter(r.get("language") for r in own if r.get("language")).items()})
    counted = [n for n in per_repo_lines if n is not None]
    return {
        "synced": True,
        "stars": sum(r.get("stargazers_count") or 0 for r in own),
        "forks": sum(r.get("forks_count") or 0 for r in own),
        "languages": [{"name": name, "size": size} for name, size in language_bytes.most_common(TOP_LANGUAGES)],
        "lines": sum(counted) if counted else None,
        "lines_repos": len(counted),
        "repos_total": len(names),
        "prs": _search_total("search_prs", f"author:{GITHUB_USER}+type:pr"),
        "issues": _search_total("search_issues", f"author:{GITHUB_USER}+type:issue"),
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
