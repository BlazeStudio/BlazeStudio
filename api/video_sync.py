"""Reads video files dropped into static/video/ so the desktop's Video app
can list and play them. Nothing to configure — an mp4/webm/ogg/mov file
placed there just shows up (same "drop a file in, it appears" idea as
music_sync.py's playlist); its title, position and thumbnail icon come from
api/data/video_meta.py's per-file overrides, falling back to the filename
(and no icon) when a file isn't listed there.
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

from data.video_meta import VIDEO_META

VIDEO_DIR = Path(__file__).resolve().parent.parent / "static" / "video"
ICONS_DIR = VIDEO_DIR / "icons"
SUPPORTED_EXT = {".mp4", ".webm", ".ogg", ".mov", ".mkv"}
CACHE_TTL = 600  # seconds — re-scan the directory occasionally rather than on every request

_cache: tuple[float, list[dict[str, Any]]] | None = None


def get_videos() -> dict:
    global _cache
    now = time.time()
    if _cache and now - _cache[0] < CACHE_TTL:
        return {"videos": _cache[1]}
    videos = []
    if VIDEO_DIR.exists():
        for path in sorted(VIDEO_DIR.iterdir()):
            if not (path.is_file() and path.suffix.lower() in SUPPORTED_EXT):
                continue
            meta = VIDEO_META.get(path.name, {})
            icon_name = meta.get("icon")
            videos.append(
                {
                    "title": meta.get("title") or path.stem.strip(),
                    "url": f"/static/video/{path.name}",
                    "icon": f"/static/video/icons/{icon_name}" if icon_name and (ICONS_DIR / icon_name).is_file() else None,
                    "order": meta.get("order"),
                }
            )
    # Files with an explicit order come first (by that order); the rest keep
    # their filename order after them — a stable sort makes that "after them"
    # fall out naturally since they all share the same (no-op) sort key.
    videos.sort(key=lambda v: (v["order"] is None, v["order"]))
    for v in videos:
        del v["order"]
    _cache = (now, videos)
    return {"videos": videos}
