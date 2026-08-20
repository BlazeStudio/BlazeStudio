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

- **http://localhost:8000/** — the plain résumé (main page)
- **http://localhost:8000/xp** — the Windows XP desktop version
- **http://localhost:8000/dossier** — the printable PDF résumé (`?lang=en` for English)

`--reload` restarts the server automatically when you edit a `.py` file. Static files
(`static/css`, `static/js`) and templates are picked up on the next request without a
restart.

## Switching the résumé content

`api/config.py` has one constant:

```python
RESUME_SOURCE = "linkedin"  # or "linkedin"
```

- `"hh"` — the hh.ru-sourced story (RTL Consulting)
- `"linkedin"` — the LinkedIn-sourced story (Ominimo)

Flip it and restart the server (or redeploy) — every page, the terminal's `cv`/`whoami`
commands, and the PDF dossier all switch to the other résumé automatically. The actual
content lives in `api/data/profile_hh.py` and `api/data/profile_linkedin.py` — edit
those directly to change wording, dates, skills, etc. Projects (`api/data/projects.py`)
are shared between both résumé versions.

## Deploying

Push to `main` — the connected Vercel project redeploys automatically. `vercel.json`
routes `/static/*` to static hosting and everything else to the FastAPI function.
