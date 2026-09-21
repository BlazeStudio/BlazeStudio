"""Reads audio files dropped into static/music/ so the Winamp-styled player
can show real track info instead of its built-in placeholders. Nothing to
configure — an mp3/m4a/flac/ogg/wav file placed there just shows up, with
title/artist read from its tags (falling back to the filename) and cover art
read from whatever embedded picture the file carries, if any.

mutagen is an optional dependency: if it isn't installed, tracks still show
up (title/artist from filename, no cover art) instead of the endpoint
breaking.
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

try:
    import mutagen
except ImportError:
    mutagen = None

MUSIC_DIR = Path(__file__).resolve().parent.parent / "static" / "music"
SUPPORTED_EXT = {".mp3", ".m4a", ".flac", ".ogg", ".wav"}
CACHE_TTL = 600  # seconds — re-scan the directory occasionally rather than on every request

_cache: tuple[float, list[dict[str, Any]]] | None = None


def _title_artist_from_filename(name: str) -> tuple[str, str | None]:
    stem = Path(name).stem
    if " - " in stem:
        artist, title = stem.split(" - ", 1)
        return title.strip(), artist.strip()
    return stem.strip(), None


def _extract_cover_bytes(audio) -> tuple[bytes, str] | None:
    """Cover art isn't a unified concept across containers, so this checks
    the handful of shapes mutagen actually returns: ID3 APIC frames (mp3),
    MP4 'covr' atoms (m4a), and FLAC's own .pictures list."""
    tags = getattr(audio, "tags", None)
    try:
        if tags is not None:
            for key in tags.keys():
                if str(key).startswith("APIC"):
                    frame = tags[key]
                    return bytes(frame.data), frame.mime
            if "covr" in tags:
                cov = tags["covr"][0]
                mime = "image/png" if getattr(cov, "imageformat", None) == 14 else "image/jpeg"
                return bytes(cov), mime
        pictures = getattr(audio, "pictures", None)
        if pictures:
            pic = pictures[0]
            return bytes(pic.data), pic.mime
    except Exception:
        return None
    return None


def _read_track(path: Path) -> dict[str, Any]:
    title, artist = _title_artist_from_filename(path.name)
    track = {"title": title, "artist": artist, "url": f"/static/music/{path.name}", "cover_url": None}
    if mutagen is None:
        return track
    try:
        easy = mutagen.File(str(path), easy=True)
        if easy and easy.tags:
            tag_title = easy.tags.get("title")
            tag_artist = easy.tags.get("artist")
            if tag_title:
                track["title"] = tag_title[0]
            if tag_artist:
                track["artist"] = tag_artist[0]
        audio = mutagen.File(str(path))
        if audio is not None and _extract_cover_bytes(audio) is not None:
            track["cover_url"] = f"/api/music/cover/{path.name}"
    except Exception:
        pass
    return track


def get_tracks() -> dict:
    global _cache
    now = time.time()
    if _cache and now - _cache[0] < CACHE_TTL:
        return {"tracks": _cache[1]}
    tracks = []
    if MUSIC_DIR.exists():
        for path in sorted(MUSIC_DIR.iterdir()):
            if path.is_file() and path.suffix.lower() in SUPPORTED_EXT:
                tracks.append(_read_track(path))
    _cache = (now, tracks)
    return {"tracks": tracks}


def get_cover(filename: str) -> tuple[bytes, str] | None:
    """Looks up one track's embedded cover art by its static/music/ filename.
    Rejects anything that isn't a plain filename inside MUSIC_DIR."""
    if mutagen is None or not filename or "/" in filename or "\\" in filename:
        return None
    path = MUSIC_DIR / filename
    try:
        resolved = path.resolve()
        if not resolved.is_relative_to(MUSIC_DIR.resolve()) or not resolved.is_file():
            return None
    except OSError:
        return None
    try:
        audio = mutagen.File(str(resolved))
    except Exception:
        return None
    if audio is None:
        return None
    return _extract_cover_bytes(audio)
