"""A tiny in-memory activity log, purely for the terminal's `tail`/`log`
easter egg. The whole site is deliberately stateless (see index.py's
docstring) — no database — so this is just a capped ring buffer that lives
as long as the server process does: real history on a long-running local
server, a rolling few minutes of it on a warm serverless instance, and empty
again after a cold start. That's an honest tradeoff for a portfolio easter
egg, not a real logging pipeline, and it's why `tail` is gated behind a
password at all: so it's opt-in (via TERMINAL_ROOT_PASSWORD) rather than
something every visitor stumbles into by typing `tail`.
"""

from __future__ import annotations

import os
import time
from collections import deque
from typing import Any

MAX_ENTRIES = 300
_entries: deque[dict[str, Any]] = deque(maxlen=MAX_ENTRIES)
_next_id = 0


def record(text: str) -> None:
    global _next_id
    _entries.append({"id": _next_id, "ts": time.time(), "text": text})
    _next_id += 1


def tail(n: int = 20, since: int | None = None) -> list[dict[str, Any]]:
    """`since` (an entry id) takes priority when given — used for `-f`
    polling, where the caller wants everything new rather than a fixed count."""
    entries = list(_entries)
    if since is not None:
        return [e for e in entries if e["id"] > since]
    return entries[-n:] if n > 0 else entries


def format_entry(entry: dict[str, Any]) -> str:
    return f"[{time.strftime('%H:%M:%S', time.localtime(entry['ts']))}] {entry['text']}"


def check_password(password: str) -> bool:
    expected = os.environ.get("TERMINAL_ROOT_PASSWORD", "")
    return bool(expected) and password == expected
