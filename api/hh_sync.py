"""Job-market stats from the official hh.ru API for the desktop's hh.ru window
— same defensive shape as faceit_sync.py / steam_sync.py.

hh.ru no longer answers /vacancies anonymously (it returns 403 "forbidden"),
so this needs HH_APP_TOKEN: an *application* token for an app registered at
https://dev.hh.ru/admin, obtained once with
    POST https://hh.ru/oauth/token
         grant_type=client_credentials&client_id=…&client_secret=…
Application tokens don't expire (unlike user tokens), which is what makes this
workable on a stateless serverless deploy. Without it, synced=False and the
window just shows the résumé card.

Personal résumé stats (views, invitations) would need the applicant's own
OAuth token — those expire every couple of weeks and their refresh tokens are
single-use, which a database-less deploy has nowhere to rotate, so they're
deliberately not attempted here.
"""

from __future__ import annotations

import json
import os
import statistics
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from typing import Any

APP_TOKEN = os.environ.get("HH_APP_TOKEN", "")
# hh.ru rejects requests without an identifying HH-User-Agent ("Name/Version (contact)").
USER_AGENT = os.environ.get("HH_USER_AGENT", "BlazeStudioPortfolio/1.0 (github.com/BlazeStudio)")
BASE = "https://api.hh.ru"
TIMEOUT = 5.0
CACHE_TTL = 3600  # the market doesn't move fast enough to justify hitting the API more often

QUERY = {"text": "Python", "search_field": "name", "area": "1"}  # "Python" in the vacancy title, Moscow

_cache: tuple[float, dict] | None = None


def _get_json(params: dict[str, str]) -> Any | None:
    url = f"{BASE}/vacancies?{urllib.parse.urlencode({**QUERY, **params})}"
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {APP_TOKEN}",
            "HH-User-Agent": USER_AGENT,
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError):
        return None


def _found(data: Any) -> int | None:
    return data.get("found") if isinstance(data, dict) else None


def _salary_point(salary: dict | None) -> float | None:
    """One number per vacancy: the midpoint of a from–to range, or whichever
    end is given. Rouble salaries only, so the median isn't mixing currencies."""
    if not salary or salary.get("currency") != "RUR":
        return None
    lo, hi = salary.get("from"), salary.get("to")
    if lo and hi:
        return (lo + hi) / 2
    return lo or hi or None


def get_market_stats() -> dict:
    global _cache
    if not APP_TOKEN:
        return {"synced": False}
    now = time.time()
    if _cache and now - _cache[0] < CACHE_TTL:
        return _cache[1]

    requests = {
        "total": {"per_page": "1"},
        "remote": {"per_page": "1", "work_format": "REMOTE"},
        "mid": {"per_page": "1", "experience": "between3And6"},
        "salaries": {"per_page": "100", "only_with_salary": "true", "currency": "RUR", "order_by": "publication_time"},
    }
    with ThreadPoolExecutor(max_workers=len(requests)) as pool:
        results = dict(zip(requests, pool.map(_get_json, requests.values())))

    total = _found(results["total"])
    if total is None:
        # Keep serving the last good answer through a transient API failure.
        return _cache[1] if _cache else {"synced": False}

    items = (results["salaries"] or {}).get("items") or []
    points = sorted(p for p in (_salary_point(v.get("salary")) for v in items) if p)
    stats = {
        "synced": True,
        "query": "Python",
        "area": {"ru": "Москва", "en": "Moscow"},
        "total": total,
        "remote": _found(results["remote"]),
        "mid_level": _found(results["mid"]),
        "salary_median": round(statistics.median(points), -3) if points else None,
        "salary_sample": len(points),
        "search_url": "https://hh.ru/search/vacancy?" + urllib.parse.urlencode({**QUERY, "search_field": "name"}),
    }
    _cache = (now, stats)
    return stats
