"""Thin, defensive wrapper around the FACEIT Data API v4 — same shape as
github_sync.py / steam_sync.py.

Needs FACEIT_API_KEY (a server-side API key from
https://developers.faceit.com/apps, "API keys" tab — not an OAuth client) and
FACEIT_NICKNAME (your FACEIT username). Without them, synced=False.
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from typing import Any

API_KEY = os.environ.get("FACEIT_API_KEY", "")
NICKNAME = os.environ.get("FACEIT_NICKNAME", "")
BASE = "https://open.faceit.com/data/v4"
TIMEOUT = 4.0
CACHE_TTL = 600  # seconds

_cache: dict[str, tuple[float, Any]] = {}


def _get_json(url: str) -> Any | None:
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {API_KEY}", "Accept": "application/json"})
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
    return _cache[key][1] if key in _cache else None


def get_player() -> dict:
    if not (API_KEY and NICKNAME):
        return {"synced": False}
    data = _cached("faceit:player", f"{BASE}/players?nickname={NICKNAME}")
    if not data:
        return {"synced": False}
    games = data.get("games", {})
    cs2 = games.get("cs2") or games.get("csgo") or {}
    return {
        "synced": True,
        "player_id": data.get("player_id"),
        "nickname": data.get("nickname"),
        "avatar": data.get("avatar"),
        "country": data.get("country"),
        "faceit_url": (data.get("faceit_url") or "").replace("{lang}", "en"),
        "elo": cs2.get("faceit_elo"),
        "level": cs2.get("skill_level"),
    }


def get_recent_matches(limit: int = 5) -> dict:
    player = get_player()
    if not player.get("synced") or not player.get("player_id"):
        return {"synced": False, "matches": []}
    url = f"{BASE}/players/{player['player_id']}/history?game=cs2&offset=0&limit={limit}"
    data = _cached(f"faceit:history:{player['player_id']}", url)
    if not data:
        return {"synced": False, "matches": []}
    player_id = player["player_id"]
    items = data.get("items", [])
    matches = []
    for m in items:
        teams = m.get("teams", {})
        winner = (m.get("results", {}) or {}).get("winner")
        my_faction = next(
            (faction for faction, team in teams.items() if any(p.get("player_id") == player_id for p in team.get("players", []))),
            None,
        )
        matches.append(
            {
                "match_id": m.get("match_id"),
                "finished_at": m.get("finished_at"),
                "result": ("win" if my_faction == winner else "loss") if my_faction and winner else None,
                "faceit_url": f"https://www.faceit.com/en/cs2/room/{m.get('match_id')}" if m.get("match_id") else None,
            }
        )
    return {"synced": True, "matches": matches}
