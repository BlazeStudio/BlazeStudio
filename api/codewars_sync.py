"""Codewars profile for the desktop's Codewars window — same defensive shape
as github_sync.py. The v1 users endpoint is public (no key), so this works out
of the box; CODEWARS_USER overrides the username.
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

USER = os.environ.get("CODEWARS_USER", "BlazeStudio")
TIMEOUT = 4.0
CACHE_TTL = 3600  # honor/rank move slowly

_cache: tuple[float, dict] | None = None


def _get_json(url: str) -> Any | None:
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "vasiliev-inc-site"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError):
        return None


def get_profile() -> dict:
    global _cache
    now = time.time()
    if _cache and now - _cache[0] < CACHE_TTL:
        return _cache[1]
    data = _get_json(f"https://www.codewars.com/api/v1/users/{urllib.parse.quote(USER)}")
    if not isinstance(data, dict) or "ranks" not in data:
        # Keep serving the last good answer through a transient failure.
        return _cache[1] if _cache else {"synced": False, "url": f"https://www.codewars.com/users/{USER}"}
    ranks = data.get("ranks") or {}
    overall = ranks.get("overall") or {}
    languages = sorted(
        (
            {"lang": lang, "name": r.get("name"), "color": r.get("color"), "score": r.get("score") or 0}
            for lang, r in (ranks.get("languages") or {}).items()
        ),
        key=lambda x: x["score"],
        reverse=True,
    )
    profile = {
        "synced": True,
        "username": data.get("username") or USER,
        "honor": data.get("honor"),
        "leaderboard": data.get("leaderboardPosition"),
        "rank": {"name": overall.get("name"), "color": overall.get("color"), "score": overall.get("score")},
        "completed": (data.get("codeChallenges") or {}).get("totalCompleted"),
        "languages": languages,
        "url": f"https://www.codewars.com/users/{urllib.parse.quote(data.get('username') or USER)}",
    }
    _cache = (now, profile)
    return profile
