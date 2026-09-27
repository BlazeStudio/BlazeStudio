# Running this site locally

FastAPI backend, no build step for the frontend (plain HTML/CSS/JS), no database.

## 1. Set up a virtual environment

```bash
python -m venv .venv
```

Activate it:

```powershell
# Windows (PowerShell)
.venv\Scripts\Activate.ps1
```

```bash
# macOS / Linux
source .venv/bin/activate
```

## 2. Install dependencies

```bash
pip install -r requirements.txt
```

## 3. Run the dev server

```bash
uvicorn api.index:app --reload --port 8000
```

Then open:

- **http://localhost:8000/** — the "2004 homepage" desktop cut: draggable windows, a Start menu, live Steam/FACEIT/GitHub widgets, a real console, a Games folder (each game in its own window), Task Manager, Calculator and Notepad
- **http://localhost:8000/desktop** — "old 2024": the previous plain scrolling résumé, kept as an archive (it runs its own frozen copy of the old games, `static/js/classic_games.js`)
- **http://localhost:8000/dossier** — the printable PDF résumé (`?lang=en` for English)

The homepage's Start menu → "Другие версии сайта" links to old 2024 (`/desktop`) and to
old 2018 (https://blazestudio.wixsite.com/notoxic, an external Wix site).

`--reload` restarts the server automatically when you edit a `.py` file. Static files
(`static/css`, `static/js`) and templates are picked up on the next request without a
restart.

## Restart / shutdown sounds

Start → Выключение → "Перезагрузка" plays a full cold boot (`static/js/boot.js`): a 90s
BIOS POST screen with fan, hard-drive, floppy and POST-beep sounds, the Windows XP loading
screen, then the XP welcome screen with a chime. "Выключение" ends on a powered-off
screen; its power button runs the same boot (browsers only allow sound after a click,
which is why it waits for one). Esc skips the boot.

Sounds live in `static/sounds/` (`.mp3`, `.ogg`, `.wav` or `.m4a`) — `api/index.py` picks up
whichever exist, and any that's missing is synthesized in the browser instead.
`pc-boot.mp3` and `xp-startup.mp3` are in the repo; there's no `xp-shutdown` yet, so that
chime is synthesized. The boot screens are timed to `pc-boot.mp3` (the `CUE` table at the
top of the sequence in `boot.js`) — if you swap the recording, retime those cues. The
BIOS logo is `static/img/energy-star.png`.

| File | Replaces |
| --- | --- |
| `pc-boot.*` | the whole PC hardware soundtrack under the BIOS + XP loading screens |
| `xp-startup.*` | the chime on the welcome screen |
| `xp-shutdown.*` | the chime on the "shutting down" / "restarting" screen |

## Winamp playlist order

Tracks are whatever audio files sit in `static/music/`. Their order (and, optionally, a
title/artist that overrides the file's tags) is set in `api/data/music_meta.py`, keyed by
filename — same idea as `api/data/video_meta.py` for videos.

## Switching the résumé content

`api/config.py` has one constant:

```python
RESUME_SOURCE = "hh"  # or "linkedin"
```

- `"hh"` — the hh.ru-sourced story (RTL Consulting)
- `"linkedin"` — the LinkedIn-sourced story (Ominimo)

Flip it and restart the server (or redeploy) — every page, the terminal's `cv`/`whoami`
commands, and the PDF dossier all switch to the other résumé automatically. The actual
content lives in `api/data/profile_hh.py` and `api/data/profile_linkedin.py` — edit
those directly to change wording, dates, skills, etc. Projects (`api/data/projects.py`)
are shared between both résumé versions.

## Steam / FACEIT integration on the homepage

The `/` homepage's Steam and FACEIT windows (avatar, status, recent games/matches) are
live if — and only if — these environment variables are set (locally: `export`/`$env:`
before running uvicorn; in prod: Vercel project → Settings → Environment Variables).
Missing any of them makes that window render a "not connected" placeholder instead of
breaking:

| Variable | Where to get it |
| --- | --- |
| `STEAM_API_KEY` | https://steamcommunity.com/dev/apikey |
| `STEAM_ID64` | Your 17-digit SteamID64 — https://steamid.io |
| `FACEIT_API_KEY` | https://developers.faceit.com/apps → an app → "API keys" (server-side key, not OAuth) |
| `FACEIT_NICKNAME` | Your FACEIT username |

The CS inventory shown in the Steam window comes from `static/data/cs_inventory.json`
(Steam blocks the live inventory endpoint from Vercel's IPs). Prices are asked from the
Steam Market live and cached for hours, but its `priceoverview` endpoint allows only about
20 lookups a minute per IP, so the snapshot also keeps the last known price of each skin.
Refresh those from a home connection now and then and commit the file:

```bash
python scripts/refresh_cs_prices.py
```

The GitHub window works without a key, but its per-repo stats (languages by code size —
up to 10, `TOP_LANGUAGES` in `api/github_sync.py` — and lines of code) cost two API calls
per repo, and unauthenticated GitHub allows only 60 calls an hour per IP. Set
`GITHUB_TOKEN` (a fine-grained token with read-only access to public repos:
https://github.com/settings/personal-access-tokens) to raise that to 5000. Lines of code
come from each repo's `/stats/code_frequency`, which GitHub computes on first request, so
the total fills in over the first few visits.

The Codewars window reads the public Codewars API (no key) for `BlazeStudio`;
set `CODEWARS_USER` to show someone else.

The terminal's `whoami` shows the *visitor* their own IP, rough location, browser/OS
and screen. The location comes from the geo headers Vercel adds in production
(`x-vercel-ip-city` etc.), so locally it just says "unknown". Nothing of it is logged.

Steam screenshots (Explorer → "Скриншоты Steam") use the community profile's public
`?xml=1` feed (there's no official Web API for another user's screenshots) — your
Steam privacy settings need "Game details" / inventory visible to the public for it to
return anything.

## Deploying

Push to `main` — the connected Vercel project redeploys automatically. `vercel.json`
routes `/static/*` to static hosting and everything else to the FastAPI function.

If your custom domain (not `*.vercel.app`) only loads over a VPN, that's Roskomnadzor
blocking Vercel's shared IP by range, not a bug here — see the domain note in chat.
The fix is DNS-side (proxy the domain through Cloudflare, or ask Vercel to move you to
an unblocked edge IP), not something this repo controls.
