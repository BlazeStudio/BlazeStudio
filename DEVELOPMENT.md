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

- **http://localhost:8000/** — the retro "визитка" entry screen (boots into either version below)
- **http://localhost:8000/desktop** — the plain scrolling résumé
- **http://localhost:8000/xp** — the Windows XP desktop version
- **http://localhost:8000/dossier** — the printable PDF résumé (`?lang=en` for English)

`--reload` restarts the server automatically when you edit a `.py` file. Static files
(`static/css`, `static/js`) and templates are picked up on the next request without a
restart.

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

## Steam / FACEIT integration on the entry page

The `/` entry page's Steam and FACEIT windows are live if — and only if — these
environment variables are set (locally: `export`/`$env:` before running uvicorn; in
prod: Vercel project → Settings → Environment Variables). Missing any of them makes
that window render a "not connected" placeholder instead of breaking:

| Variable | Where to get it |
| --- | --- |
| `STEAM_API_KEY` | https://steamcommunity.com/dev/apikey |
| `STEAM_ID64` | Your 17-digit SteamID64 — https://steamid.io |
| `FACEIT_API_KEY` | https://developers.faceit.com/apps → an app → "API keys" (server-side key, not OAuth) |
| `FACEIT_NICKNAME` | Your FACEIT username |

Steam screenshots use the community profile's public `?xml=1` feed (there's no
official Web API for another user's screenshots) — your Steam privacy settings need
"Game details" / inventory visible to the public for it to return anything.

The "Включить музыку" button plays `/static/audio/theme.mp3` if that file exists;
drop your own track there (not committed by default) — nothing plays otherwise.

## Deploying

Push to `main` — the connected Vercel project redeploys automatically. `vercel.json`
routes `/static/*` to static hosting and everything else to the FastAPI function.

If your custom domain (not `*.vercel.app`) only loads over a VPN, that's Roskomnadzor
blocking Vercel's shared IP by range, not a bug here — see the domain note in chat.
The fix is DNS-side (proxy the domain through Cloudflare, or ask Vercel to move you to
an unblocked edge IP), not something this repo controls.
