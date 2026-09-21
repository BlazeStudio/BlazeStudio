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
import urllib.parse
import urllib.request
from typing import Any

API_KEY = os.environ.get("STEAM_API_KEY", "")
STEAM_ID = os.environ.get("STEAM_ID64", "")
TIMEOUT = 4.0
CACHE_TTL = 600  # seconds

_cache: dict[str, tuple[float, Any]] = {}


def _get(url: str, parse: str = "json", timeout: float = TIMEOUT) -> Any | None:
    req = urllib.request.Request(url, headers={"User-Agent": "vasiliev-inc-site"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            return json.loads(raw) if parse == "json" else raw.decode("utf-8", "ignore")
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError):
        return None


def _cached(key: str, url: str, parse: str = "json", ttl: float = CACHE_TTL, timeout: float = TIMEOUT) -> Any | None:
    now = time.time()
    if key in _cache:
        ts, value = _cache[key]
        if now - ts < ttl:
            return value
    value = _get(url, parse, timeout=timeout)
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
_UGC_ID_RE = re.compile(r"images\.steamusercontent\.com/ugc/(\d+)/([0-9A-Fa-f]+)/")


def _screenshot_full_res(published_id: str) -> str | None:
    """The grid page's own background-image is a small pre-baked thumbnail —
    a genuinely different (and much smaller, ~10KB vs ~220KB) asset, not just
    a CSS-scaled crop of the original. The screenshot's own detail page
    references the real high-res asset id, so that page is fetched once per
    screenshot (and cached) to build a properly sized image URL instead."""
    html = _cached(f"steam:shot_detail:{published_id}", f"https://steamcommunity.com/sharedfiles/filedetails/?id={published_id}", parse="text")
    if not html:
        return None
    m = _UGC_ID_RE.search(html)
    if not m:
        return None
    return f"https://images.steamusercontent.com/ugc/{m.group(1)}/{m.group(2)}/"


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
    for _grid_url, published_id in _SCREENSHOT_RE.findall(html)[:count]:
        base = _screenshot_full_res(published_id)
        if not base:
            continue
        shots.append(
            {
                "full": f"{base}?imw=1920&imh=1080&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false",
                "thumb": f"{base}?imw=320&imh=180&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false",
                "title": "",
                "view_url": f"https://steamcommunity.com/sharedfiles/filedetails/?id={published_id}",
            }
        )
    return {"synced": bool(shots), "screenshots": shots}


# CS2 rarity tiers, roughly cheapest to priciest — used to pre-rank the
# inventory before pricing it (see get_cs_inventory) and as the fallback
# order for any item real market data couldn't be fetched for.
_RARITY_RANK = {
    "Consumer Grade": 1,
    "Base Grade": 1,
    "Industrial Grade": 2,
    "Mil-Spec Grade": 3,
    "High Grade": 3,
    "Restricted": 4,
    "Remarkable": 4,
    "Classified": 5,
    "Exotic": 5,
    "Covert": 6,
    "Master": 6,
    "Extraordinary": 7,
    "Contraband": 8,
}

PRICE_CURRENCY = "5"  # RUB
PRICE_CACHE_TTL = 3600  # prices move slowly enough that an hour-old figure is fine
PRICE_TIMEOUT = 1.5  # the market endpoint is aggressively rate-limited — fail fast rather than stall the page
PRICE_BUDGET_SECONDS = 6.0  # total wall-clock time this request may spend pricing items
PRICE_MAX_CONSECUTIVE_FAILURES = 3  # stop hammering an endpoint that's already started rate-limiting us

_PRICE_NUM_RE = re.compile(r"[\d][\d\s  ]*(?:[.,]\d+)?")


def _parse_price(price_str: str | None) -> float | None:
    """Steam formats priceoverview numbers per-locale, e.g. "80 000,00 pуб."
    for RUB. Strip the currency label and thousands separators and normalize
    the decimal comma so the figure can be sorted/compared numerically."""
    if not price_str:
        return None
    m = _PRICE_NUM_RE.search(price_str)
    if not m:
        return None
    raw = re.sub(r"[\s  ]", "", m.group(0))
    raw = raw.replace(",", ".")
    try:
        return float(raw)
    except ValueError:
        return None


def _get_market_price(market_hash_name: str) -> float | None:
    url = f"https://steamcommunity.com/market/priceoverview/?appid=730&currency={PRICE_CURRENCY}&market_hash_name={urllib.parse.quote(market_hash_name)}"
    data = _cached(f"steam:price:{market_hash_name}", url, ttl=PRICE_CACHE_TTL, timeout=PRICE_TIMEOUT)
    if not data or not data.get("success"):
        return None
    return _parse_price(data.get("lowest_price") or data.get("median_price"))


def get_cs_inventory(count: int = 12) -> dict:
    """Public CS2 inventory (appid 730, context 2) — no API key needed, but the
    profile's inventory privacy has to be set to public. Pre-ranked by rarity
    (highest first, a cheap stand-in for value), then the top of that pool is
    priced for real via the Steam Market so the final order reflects actual
    value — matching "sorted by price" on steamcommunity.com's own inventory
    page — instead of just the rarity tier. Capped at `count` items so a big
    inventory doesn't try to render hundreds of cards; `total` carries the
    real size so the frontend can show "showing N of total". Each marketable
    item links out to its Steam Community Market listing.

    Real-time pricing is bounded (PRICE_BUDGET_SECONDS wall clock, and it
    backs off after a few consecutive failures) since the market endpoint
    rate-limits hard — any item that couldn't be priced in time just falls
    back to the rarity order instead of stalling the page.
    """
    if not STEAM_ID:
        return {"synced": False, "items": [], "total": None}
    url = f"https://steamcommunity.com/inventory/{STEAM_ID}/730/2?l=english&count=200"
    data = _cached("steam:cs_inventory", url)
    if not data or not data.get("success"):
        return {"synced": False, "items": [], "total": None}
    descriptions = {(d.get("classid"), d.get("instanceid")): d for d in data.get("descriptions", [])}
    items = []
    seen_names = set()
    for a in data.get("assets", []):
        d = descriptions.get((a.get("classid"), a.get("instanceid")))
        if not d:
            continue
        # Service medals, operation coins and other profile trinkets aren't
        # tradeable or sellable — they carry no real value, so they'd only
        # clutter a "by value" list (and some carry a flashy but meaningless
        # rarity tag that could otherwise outrank actual skins). Only show
        # what can actually be sold on the Market.
        if not d.get("marketable"):
            continue
        name = d.get("market_hash_name") or d.get("name")
        if not name or name in seen_names:
            continue
        seen_names.add(name)
        tags = d.get("tags", [])
        rarity = next((tag for tag in tags if tag.get("category") == "Rarity"), None)
        exterior = next((tag for tag in tags if tag.get("category") == "Exterior"), None)
        icon = d.get("icon_url")
        rarity_name = rarity.get("localized_tag_name") if rarity else None
        items.append(
            {
                "name": d.get("name") or name,
                "icon": f"https://community.akamai.steamstatic.com/economy/image/{icon}" if icon else None,
                "rarity": rarity_name,
                "rarity_color": f"#{rarity['color']}" if rarity and rarity.get("color") else None,
                "rarity_rank": _RARITY_RANK.get(rarity_name, 0),
                "exterior": exterior.get("localized_tag_name") if exterior else None,
                "market_url": f"https://steamcommunity.com/market/listings/730/{urllib.parse.quote(name)}",
                "_mhn": name,
            }
        )
    # Price every item in the (already marketable-only) list, not just a
    # rarity-prefiltered slice — stickers/patches/music kits carry real value
    # but often don't have a "Rarity" tag at all (rarity_rank 0), and would
    # otherwise never be considered next to a common weapon skin that does
    # have one. Attempts run in the inventory's own (unbiased) order and are
    # bounded purely by the wall-clock budget and the failure backoff below.
    deadline = time.time() + PRICE_BUDGET_SECONDS
    consecutive_failures = 0
    for it in items:
        mhn = it.pop("_mhn")
        if time.time() >= deadline or consecutive_failures >= PRICE_MAX_CONSECUTIVE_FAILURES:
            it["price_rub"] = None
            continue
        price = _get_market_price(mhn)
        it["price_rub"] = price
        consecutive_failures = 0 if price is not None else consecutive_failures + 1

    items.sort(key=lambda it: (it["price_rub"] is not None, it["price_rub"] or 0, it["rarity_rank"]), reverse=True)
    top = items[:count]
    for it in top:
        del it["rarity_rank"]
        it["price_rub"] = round(it["price_rub"], 2) if it["price_rub"] is not None else None
    return {"synced": bool(top), "items": top, "total": data.get("total_inventory_count")}
