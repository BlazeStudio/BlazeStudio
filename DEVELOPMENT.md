# Running this site locally

Plain HTML/CSS/JS with no frontend build step and no database. FastAPI is the dev server;
production is a static copy of it on GitHub Pages (see [Deploying](#deploying)).

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
- **http://localhost:8000/desktop/** — "old 2024": the previous plain scrolling résumé, kept as an archive (it runs its own frozen copy of the old games, `static/js/classic_games.js`)
- **http://localhost:8000/dossier/** — the printable PDF résumé (`/dossier/en/` for English)

The homepage's Start menu → "Другие версии сайта" links to old 2024 (`/desktop/`) and to
old 2018 (https://blazestudio.wixsite.com/notoxic, an external Wix site).

`--reload` restarts the server automatically when you edit a `.py` file. Static files
(`static/css`, `static/js`) and templates are picked up on the next request without a
restart.

## Restart / shutdown sounds

Start → Выключение → "Перезагрузка" plays a full cold boot (`static/js/boot.js`): a 90s
BIOS POST screen with fan, hard-drive, floppy and POST-beep sounds, the Windows XP loading
screen, then the XP welcome screen with a chime. "Выключение" ends on a powered-off
screen; its power button runs the same boot (browsers only allow sound after a click,
which is why it waits for one). The boot can't be skipped.

## BIOS setup

While the POST shows "Press DEL to enter SETUP", DEL (or a tap on that line — phones have
no DEL key) opens an Award-style CMOS Setup Utility (`static/js/bios.js`). Keyboard works
like the real thing (arrows, Enter, Esc, +/−, PgUp/PgDn, F7 defaults, F10 save), and every
item takes a click/tap. After Save & Exit / Exit Without Saving the POST carries on from the
configuration table, which already shows the changes.

What's saved goes to the visitor's `localStorage` (`av-cmos`) and actually does something:

| Setting | Effect |
| --- | --- |
| Standard CMOS → Language | switches the site language |
| Standard CMOS → Video: MONO | the whole desktop goes grayscale |
| Standard CMOS → Drive A, Halt On | floppy / keyboard-error behaviour in the POST |
| Advanced BIOS → Quick Power On Self Test | memory test finishes instantly |
| Advanced BIOS → First Boot Device | Floppy: "Non-System disk", CDROM: "Press any key to boot from CD" starts help.exe, LAN: a failing PXE boot; all fall back to HDD |
| Advanced BIOS → Small Logo(EPA) Show | the Energy Star logo in the POST |
| Advanced Chipset → Desktop Wallpaper | Black Hole / Classic Blue / off (unloads the animated iframe) |
| Advanced Chipset → CRT Scanlines | the scanline overlay |
| Integrated Peripherals → Onboard AC97 Audio | all boot/startup/shutdown sounds |
| Integrated Peripherals → USB Keyboard Support | off = "Keyboard error" in the POST (halts with Halt On = All Errors) |
| Frequency/Voltage → CPU Clock Ratio | shown in the POST and the config table; heats the CPU (PC Health Status) — over the Shutdown Temperature the next POST resets it to x2 |

Everything else in the menus is decoration.

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

## help.exe

The `help.exe` desktop icon, the console command of the same name (listed in `help`) and
Task Manager → "Новая задача" all start a short horror game, `static/js/horror.js` +
`static/css/horror.css`: the screen goes dark, an old orange terminal powers on, and you
lead something out of a night forest, FAITH-style (about 5 minutes; Esc quits at any point, +/- set the volume).

Its assets live in `static/horror/` and load only when the game starts. Sources and
licences are in `static/horror/CREDITS.md`: CC0 recordings from freesound.org, the Press
Start 2P font (OFL), and SAM, the 1982 speech synthesizer (`vendor/samjs.min.js`, an
abandonware port with no formal licence). Delete that file to drop the voice and the
game stays text-only.

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

The total shown next to the "Experience" heading isn't written by hand: it's computed
on every build from each job's `start`/`end` (`"YYYY-MM"`, `end: None` for a current job)
by `current_profile()` in `api/data/profile.py`. Changing a job's dates means updating
both `period` (the displayed text) and `start`/`end`.

## Steam / FACEIT integration on the homepage

The `/` homepage's Steam and FACEIT windows (avatar, status, recent games/matches) are
filled in if — and only if — these environment variables are set (locally: `export`/`$env:`
before running uvicorn; in prod: repo → Settings → Secrets and variables → Actions).
Missing any of them makes that window render a "not connected" placeholder instead of
breaking:

| Variable | Where to get it |
| --- | --- |
| `STEAM_API_KEY` | https://steamcommunity.com/dev/apikey |
| `STEAM_ID64` | Your 17-digit SteamID64 — https://steamid.io |
| `FACEIT_API_KEY` | https://developers.faceit.com/apps → an app → "API keys" (server-side key, not OAuth) |
| `FACEIT_NICKNAME` | Your FACEIT username |

The CS inventory shown in the Steam window comes from `static/data/cs_inventory.json`
(Steam blocks the live inventory endpoint from datacenter IPs). Each build asks the Steam
Market for current prices, but its `priceoverview` endpoint allows only about 20 lookups a
minute per IP, so the snapshot also keeps the last known price of each skin. Refresh those
from a home connection now and then and commit the file:

```bash
python scripts/refresh_cs_prices.py
```

The GitHub window works without a key, but its per-repo stats (languages by code size —
up to 10, `TOP_LANGUAGES` in `api/github_sync.py` — and total commits) cost two API calls
per repo, and unauthenticated GitHub allows only 60 calls an hour per IP: two local builds
in a row can run out and show "GitHub is unreachable". The deploy workflow passes its
built-in token; locally, set `GITHUB_TOKEN` (a fine-grained token with read-only access to
public repos: https://github.com/settings/personal-access-tokens). "Lines of code" is an
estimate from those language sizes (programming languages only, ~35 bytes a line); all-time
contributions are summed from GitHub's yearly contribution calendars.

The Codewars window reads the public Codewars API (no key) for `BlazeStudio`;
set `CODEWARS_USER` to show someone else.


The terminal's commands run in the browser (`static/js/terminal_commands.js`). `whoami`
shows the *visitor* their own IP, rough location, browser/OS and screen. A static site
can't see the IP or location itself, so that one command asks https://ipinfo.io from the
visitor's browser, and says "unknown" if that fails. The site stores none of it.

Steam screenshots (Explorer → "Скриншоты Steam") use the community profile's public
`?xml=1` feed (there's no official Web API for another user's screenshots) — your
Steam privacy settings need "Game details" / inventory visible to the public for it to
return anything.

## Deploying

Push to `main`. `.github/workflows/deploy.yml` runs `scripts/build_static.py`, which
requests every GET route of the FastAPI app, writes the responses to `dist/` next to a copy
of `static/`, and publishes that to GitHub Pages.

The workflow also runs once an hour, and that's the only thing refreshing the
Steam/FACEIT/GitHub/Codewars numbers. A source that fails during a build keeps its last
published numbers instead of going blank. GitHub turns scheduled workflows off after 60
days without repository activity: if the numbers stop moving, re-enable the workflow in
the Actions tab.

Since nothing runs on a server in production, a route in `api/index.py` has to be
freezable: its URL is a file path, and its answer is the same for every visitor. New
routes without path parameters are picked up by the build automatically.

To see exactly what will be published:

```bash
python scripts/build_static.py
```

```bash
python -m http.server 8002 --directory dist
```

### Moving to GitHub Pages (once, in this order)

1. Repo → Settings → Secrets and variables → Actions: add `STEAM_API_KEY`, `STEAM_ID64`,
   `FACEIT_API_KEY` and `FACEIT_NICKNAME`, with the values from the Vercel project's
   environment variables.
2. Repo → Settings → Pages → Source: **GitHub Actions**. The deploy fails without this.
3. Push to `main` and wait for a green run in the Actions tab. Vercel redeploys from the same
   push, and that's fine: the new code still runs there.
4. Repo → Settings → Pages → Custom domain: `anton-vas.digital`. Its DNS check fails until
   the next step.
5. In Cloudflare DNS, replace the Vercel records with these, all **DNS only** (grey cloud):
   Cloudflare's proxy is throttled in Russia and gets in the way of the GitHub certificate.

   | Type | Name | Value |
   | --- | --- | --- |
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | CNAME | `www` | `blazestudio.github.io` |

   GitHub issues the certificate only after this, which can take up to an hour. Vercel sent
   HSTS, so browsers that visited before show a certificate error until then. To roll back,
   put the Vercel records back (TTL is 5 minutes).
6. Once the certificate is issued, tick **Enforce HTTPS** in the same Pages settings.
7. Open the site from Russia without a VPN, on home internet and on mobile.
8. When that has held for a while, disconnect the Vercel project and delete `vercel.json`.

If the site stops opening from Russia again: `dist/` is plain files, so any static host
works, and only the last step of the workflow and the DNS records are specific to GitHub.
Yandex Object Storage is the fallback: it's hosted in Russia and needs a billing account.
