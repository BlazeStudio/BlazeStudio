"""Freezes the FastAPI app (api/index.py) into a static site in dist/, which is
what GitHub Pages serves. Every GET route is requested once and its response
written to the file at that path; static/ is copied as is.

    python scripts/build_static.py

.github/workflows/deploy.yml runs this on every push and once an hour, and that
hourly rebuild is what keeps the Steam/FACEIT/GitHub/Codewars numbers current.
"""

from __future__ import annotations

import json
import shutil
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "api"))

from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

from index import app

DIST = ROOT / "dist"
SITE_URL = "https://anton-vas.digital"


def published_snapshot(path: str):
    """What the live site serves at this path right now, or None (first deploy,
    site unreachable, ...). Only ever a fallback, so it must not fail the build."""
    try:
        with urllib.request.urlopen(SITE_URL + path, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception:
        return None


def keep_last_good(new, old):
    """A widget whose source failed this run ("synced": false) keeps its last
    published numbers instead of going blank until the next build."""
    if not (isinstance(new, dict) and isinstance(old, dict)):
        return new
    if new.get("synced") is False and old.get("synced"):
        return old
    return {key: keep_last_good(value, old.get(key)) for key, value in new.items()}


def write(url_path: str, content: bytes) -> None:
    target = DIST / url_path.lstrip("/")
    if url_path.endswith("/"):
        target = target / "index.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")  # track names aren't all in a Windows console's code page
    shutil.rmtree(DIST, ignore_errors=True)
    shutil.copytree(ROOT / "static", DIST / "static")

    paths = [route.path for route in app.routes if isinstance(route, APIRoute) and "{" not in route.path]
    with TestClient(app, base_url=SITE_URL) as client:
        for path in paths:
            response = client.get(path)
            response.raise_for_status()
            if path.endswith(".json"):
                data = keep_last_good(response.json(), published_snapshot(path))
                write(path, json.dumps(data, ensure_ascii=False).encode("utf-8"))
            else:
                write(path, response.content)
            print(f"{path} ({len(response.content)} bytes)", flush=True)

        # The one parametrized route: each track's embedded cover art.
        for track in client.get("/api/music.json").json()["tracks"]:
            if track["cover_url"]:
                response = client.get(track["cover_url"])
                response.raise_for_status()
                write(track["cover_url"], response.content)
                print(f"{track['cover_url']} ({len(response.content)} bytes)", flush=True)


if __name__ == "__main__":
    main()
