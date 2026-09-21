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


def get_player_stats() -> dict:
    """Lifetime CS2 stats — matches, win rate, K/D, headshot %, streaks. The
    FACEIT API's lifetime block is an untyped bag of string-valued fields
    (its own schema just says "object"); these are the real key names FACEIT
    itself uses, so a value going missing just falls back to None/dash rather
    than raising."""
    player = get_player()
    if not player.get("synced") or not player.get("player_id"):
        return {"synced": False}
    data = _cached(f"faceit:stats:{player['player_id']}", f"{BASE}/players/{player['player_id']}/stats/cs2")
    if not data:
        return {"synced": False}
    life = data.get("lifetime", {})
    return {
        "synced": True,
        "matches": life.get("Matches"),
        "win_rate": life.get("Win Rate %"),
        "kd_ratio": life.get("Average K/D Ratio"),
        "headshot_pct": life.get("Average Headshots %"),
        "current_streak": life.get("Current Win Streak"),
        "longest_streak": life.get("Longest Win Streak"),
        "recent_results": life.get("Recent Results", []),
    }


def _match_kd(match_id: str, player_id: str) -> float | None:
    """That player's K/D for one match — a separate call per match (FACEIT's
    history endpoint doesn't carry per-match stats), cached per match_id so
    it's only ever fetched once."""
    data = _cached(f"faceit:matchstats:{match_id}", f"{BASE}/matches/{match_id}/stats")
    if not data:
        return None
    for round_ in data.get("rounds", []):
        for team in round_.get("teams", []):
            for p in team.get("players", []):
                if p.get("player_id") != player_id:
                    continue
                stats = p.get("player_stats", {})
                kd = stats.get("K/D Ratio")
                if kd is not None:
                    try:
                        return round(float(kd), 2)
                    except (TypeError, ValueError):
                        return None
                try:
                    kills = float(stats.get("Kills"))
                    deaths = float(stats.get("Deaths"))
                    return round(kills / deaths, 2) if deaths else kills
                except (TypeError, ValueError):
                    return None
    return None


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
        match_id = m.get("match_id")
        matches.append(
            {
                "match_id": match_id,
                "finished_at": m.get("finished_at"),
                "result": ("win" if my_faction == winner else "loss") if my_faction and winner else None,
                "faceit_url": f"https://www.faceit.com/en/cs2/room/{match_id}" if match_id else None,
                "kd": _match_kd(match_id, player_id) if match_id else None,
            }
        )
    return {"synced": True, "matches": matches}
