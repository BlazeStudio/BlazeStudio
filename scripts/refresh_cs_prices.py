"""Records current Steam Market prices (RUB) into static/data/cs_inventory.json.

The site asks the Market for live prices too, but Steam's priceoverview
endpoint allows only ~20 lookups a minute per IP and is stricter still with
datacenter IPs like Vercel's — so the snapshot carries a recent price for
every shown skin as the fallback. Run this from a home connection now and
then, and commit the result:

    python scripts/refresh_cs_prices.py

It goes slowly on purpose and backs off when Steam answers 429.
"""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

SNAPSHOT = Path(__file__).resolve().parent.parent / "static" / "data" / "cs_inventory.json"
DELAY = 3.5  # seconds between lookups — keeps us under ~20/min
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"


def market_name(url: str | None) -> str | None:
    if not url or "/market/listings/730/" not in url:
        return None
    return urllib.parse.unquote(url.rsplit("/", 1)[-1]) or None


def parse_price(text: str | None) -> float | None:
    m = re.search(r"\d[\d\s  ]*(?:[.,]\d+)?", text or "")
    if not m:
        return None
    try:
        return float(re.sub(r"[\s  ]", "", m.group(0)).replace(",", "."))
    except ValueError:
        return None


def lookup(name: str) -> float | None:
    url = "https://steamcommunity.com/market/priceoverview/?appid=730&currency=5&market_hash_name=" + urllib.parse.quote(name)
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            return parse_price(data.get("lowest_price") or data.get("median_price")) if data.get("success") else None
        except urllib.error.HTTPError as e:
            if e.code != 429:
                return None
            wait = 30 * (attempt + 1)
            print(f"  429 — waiting {wait}s")
            time.sleep(wait)
        except (urllib.error.URLError, TimeoutError, ValueError):
            return None
    return None


def main() -> None:
    payload = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    prices: dict[str, float] = {}
    for it in payload.get("items") or []:
        name = market_name(it.get("market_url"))
        if not name:
            continue
        price = lookup(name)
        print(f"{name}: {price if price is not None else '—'}")
        if price is not None:
            prices[name] = round(price, 2)
        time.sleep(DELAY)
    if not prices:
        print("no prices fetched (Steam kept answering 429?) — snapshot left untouched; try again later")
        return
    for it in list(payload.get("items") or []) + list(payload.get("all_marketable") or []):
        name = market_name(it.get("market_url"))
        if name in prices:
            it["price_rub"] = prices[name]
    payload["prices_updated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    SNAPSHOT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"updated {len(prices)} prices")


if __name__ == "__main__":
    main()
