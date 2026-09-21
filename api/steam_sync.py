"""Thin, defensive wrapper around the Steam Web API — same shape as github_sync.py.

Needs two env vars to do anything: STEAM_API_KEY (from
https://steamcommunity.com/dev/apikey) and STEAM_ID64 (your 17-digit SteamID64,
e.g. via https://steamid.io). Without them every function returns synced=False
and the frontend renders an "not connected" placeholder instead of breaking.
"""

from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.request
from typing import Any

API_KEY = os.environ.get("STEAM_API_KEY", "")
STEAM_ID = os.environ.get("STEAM_ID64", "")
TIMEOUT = 4.0
CACHE_TTL = 600  # seconds

_cache: dict[str, tuple[float, Any]] = {}


def _get(url: str, parse: str = "json") -> Any | None:
    req = urllib.request.Request(url, headers={"User-Agent": "vasiliev-inc-site"})
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
    return _cache[key][1] if key in _cache else None


def get_profile() -> dict:
    if not (API_KEY and STEAM_ID):
        return {"synced": False}
    url = f"https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key={API_KEY}&steamids={STEAM_ID}"
    data = _cached("steam:profile", url)
    players = (data or {}).get("response", {}).get("players", [])
    if not players:
        return {"synced": False}
    p = players[0]
    return {
        "synced": True,
        "persona_name": p.get("personaname"),
        "avatar": p.get("avatarfull"),
        "profile_url": p.get("profileurl"),
        "status": {0: "offline", 1: "online", 2: "busy", 3: "away"}.get(p.get("personastate"), "offline"),
    }


def get_extra_stats() -> dict:
    """Owned-games count + total playtime, and the Steam level — a couple more
    numbers for the profile card beyond the basics in get_profile()."""
    if not (API_KEY and STEAM_ID):
        return {"synced": False, "game_count": None, "total_playtime_hours": None, "level": None}
    games_url = f"https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key={API_KEY}&steamid={STEAM_ID}&include_played_free_games=1"
    level_url = f"https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key={API_KEY}&steamid={STEAM_ID}"
    games_data = (_cached("steam:owned_games", games_url) or {}).get("response", {})
    level_data = (_cached("steam:level", level_url) or {}).get("response", {})
    games = games_data.get("games", [])
    total_minutes = sum(g.get("playtime_forever", 0) for g in games)
    return {
        "synced": True,
        "game_count": games_data.get("game_count"),
        "total_playtime_hours": round(total_minutes / 60) if games else None,
        "level": level_data.get("player_level"),
    }


def get_recently_played(count: int = 6) -> dict:
    if not (API_KEY and STEAM_ID):
        return {"synced": False, "games": []}
    url = f"https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key={API_KEY}&steamid={STEAM_ID}&count={count}"
    data = _cached("steam:recent", url)
    if data is None:
        return {"synced": False, "games": []}
    games = data.get("response", {}).get("games", [])
    return {
        "synced": True,
        "games": [
            {
                "appid": g["appid"],
                "name": g.get("name"),
                "playtime_2weeks_min": g.get("playtime_2weeks", 0),
                "playtime_forever_min": g.get("playtime_forever", 0),
                "icon": f"https://media.steampowered.com/steamcommunity/public/images/apps/{g['appid']}/{g.get('img_icon_url')}.jpg" if g.get("img_icon_url") else None,
                "header": f"https://cdn.akamai.steamstatic.com/steam/apps/{g['appid']}/header.jpg",
            }
            for g in games
        ],
    }


_SCREENSHOT_RE = re.compile(r"background-image:\s*url\('(https://images\.steamusercontent\.com/ugc/[^']+)'\)[^>]*id=\"imgWallItem_(\d+)\"")


def get_recent_screenshots(count: int = 6) -> dict:
    """Scrapes the community profile's public screenshots grid page. The old
    ?xml=1 output format this used to read is dead — Steam now ignores that
    param and just serves the normal HTML page — so this reads the actual grid
    markup instead: each screenshot is a `background-image: url('...')` on a
    `.imgWallItem` div, carrying the published-file id in its element id.
    Returns an empty list rather than raising if the format ever changes again,
    or if the profile (or its screenshot tab) turns out to be private.
    """
    if not STEAM_ID:
        return {"synced": False, "screenshots": []}
    url = f"https://steamcommunity.com/profiles/{STEAM_ID}/screenshots/?appid=0&sort=newestfirst&browsefilter=myfiles&view=grid"
    html = _cached("steam:screenshots:html", url, parse="text")
    if not html or "This profile is private" in html:
        return {"synced": False, "screenshots": []}
    shots = []
    for image_url, published_id in _SCREENSHOT_RE.findall(html)[:count]:
        shots.append({"full": image_url, "thumb": image_url, "title": "", "view_url": f"https://steamcommunity.com/sharedfiles/filedetails/?id={published_id}"})
    return {"synced": bool(shots), "screenshots": shots}
