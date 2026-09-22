"""Reads video files dropped into static/video/ so the desktop's Video tab
can list and play them. Nothing to configure — an mp4/webm/ogg/mov file
placed there just shows up, with its title read from the filename (same
"drop a file in, it appears" idea as music_sync.py's playlist).
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

VIDEO_DIR = Path(__file__).resolve().parent.parent / "static" / "video"
SUPPORTED_EXT = {".mp4", ".webm", ".ogg", ".mov", ".mkv"}
CACHE_TTL = 600  # seconds — re-scan the directory occasionally rather than on every request

_cache: tuple[float, list[dict[str, Any]]] | None = None


def _title_from_filename(name: str) -> str:
    return Path(name).stem.strip()


def get_videos() -> dict:
    global _cache
    now = time.time()
    if _cache and now - _cache[0] < CACHE_TTL:
        return {"videos": _cache[1]}
    videos = []
    if VIDEO_DIR.exists():
        for path in sorted(VIDEO_DIR.iterdir()):
            if path.is_file() and path.suffix.lower() in SUPPORTED_EXT:
                videos.append({"title": _title_from_filename(path.name), "url": f"/static/video/{path.name}"})
    _cache = (now, videos)
    return {"videos": videos}
