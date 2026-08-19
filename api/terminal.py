"""A small, deliberately-safe fake shell for the Arcade department's terminal game.

Everything here is pattern matching over a fixed whitelist — no eval(), no subprocess,
no filesystem access. It exists to let a recruiter "poke around" the candidate through
a familiar CLI metaphor, backed by the same profile/projects data as the rest of the
site so answers can never drift out of sync with the page content.
"""

from __future__ import annotations

from data.profile import PROFILE

FILES = {
    "about.txt": lambda lang: "\n".join(PROFILE["about"][lang]),
    "skills.txt": lambda lang: _skills_txt(lang),
    "experience.log": lambda lang: _experience_txt(lang),
    "contact.card": lambda lang: _contact_txt(lang),
}

DEPARTMENTS = ["reception", "hr", "engineering", "lab", "archive", "arcade", "contact"]


def _skills_txt(lang: str) -> str:
    lines = []
    for group in PROFILE["skills"].values():
        names = ", ".join(item["name"] for item in group["items"])
        lines.append(f"{group['label'][lang]}: {names}")
    return "\n".join(lines)


def _experience_txt(lang: str) -> str:
    lines = []
    for job in PROFILE["experience"]:
        company = job["company"][lang]
        title = job["title"][lang]
        period = job["period"][lang]
        lines.append(f"[{period}] {title} @ {company}")
    return "\n".join(lines)


def _contact_txt(lang: str) -> str:
    c = PROFILE["contacts"]
    return "\n".join([f"email : {c['email']}", f"telegram : {c['telegram_handle']}", f"github : {c['github']}", f"linkedin : {c['linkedin']}"])


def run_command(raw: str, lang: str = "ru") -> dict:
    lang = lang if lang in ("ru", "en") else "ru"
    cmd = (raw or "").strip()
    if not cmd:
        return {"output": "", "effect": None}

    parts = cmd.split(maxsplit=1)
    name = parts[0].lower()
    arg = parts[1].strip() if len(parts) > 1 else ""

    if name in ("help", "?"):
        return {"output": _help(lang), "effect": None}

    if name == "whoami":
        return {"output": f"{PROFILE['name'][lang]} — {PROFILE['role'][lang]}", "effect": None}

    if name in ("ls", "dir"):
        target = arg.strip("/") or "."
        if target in ("departments", "."):
            listing = "  ".join(DEPARTMENTS)
        elif target == "files":
            listing = "  ".join(FILES.keys())
        else:
            listing = "departments/  files/"
        return {"output": listing, "effect": None}

    if name == "cat":
        key = arg.strip().lower()
        if key in FILES:
            return {"output": FILES[key](lang), "effect": None}
        msg = f"cat: {arg}: {'файл не найден' if lang == 'ru' else 'no such file'}"
        return {"output": msg, "effect": None}

    if name == "cd":
        target = arg.strip("/ ").lower()
        if target in DEPARTMENTS:
            return {"output": f"→ {target}", "effect": {"type": "navigate", "target": target}}
        msg = f"cd: {arg}: {'нет такого отдела' if lang == 'ru' else 'no such department'}"
        return {"output": msg, "effect": None}

    if name in ("contact", "hire"):
        return {"output": _contact_txt(lang), "effect": {"type": "navigate", "target": "contact"}}

    if name == "sudo" and arg.lower() in ("hire anton", "hire-anton", "hire_anton"):
        msg = (
            "Permission granted. Anton has been added to your team.\n[sudo] чувство юмора не помешает и в проде."
            if lang == "ru"
            else "Permission granted. Anton has been added to your team.\n[sudo] a sense of humor never hurt production either."
        )
        return {"output": msg, "effect": {"type": "confetti"}}

    if name == "sudo":
        msg = "Permission denied: nice try." if lang == "en" else "Permission denied: хорошая попытка."
        return {"output": msg, "effect": None}

    if name == "ping":
        target = arg or ("рекрутера" if lang == "ru" else "recruiter")
        msg = f"64 bytes from {target}: time=0.9ms — {'на связи' if lang == 'ru' else 'reachable'}"
        return {"output": msg, "effect": None}

    if name == "coffee":
        msg = "☕ заварено. Продуктивность +100%." if lang == "ru" else "☕ brewed. Productivity +100%."
        return {"output": msg, "effect": None}

    if name == "matrix":
        return {"output": "Wake up, recruiter...", "effect": {"type": "matrix"}}

    if name in ("clear", "cls"):
        return {"output": "", "effect": {"type": "clear"}}

    if name in ("exit", "quit"):
        return {"output": "logout" , "effect": {"type": "close"}}

    suggestion = "help" if lang == "en" else "help"
    msg = (
        f"bash: {name}: команда не найдена (попробуйте '{suggestion}')"
        if lang == "ru"
        else f"bash: {name}: command not found (try '{suggestion}')"
    )
    return {"output": msg, "effect": None}


def _help(lang: str) -> str:
    rows = [
        ("whoami", "кто это" if lang == "ru" else "who this is"),
        ("ls departments", "список отделов" if lang == "ru" else "list departments"),
        ("cat about.txt", "о кандидате" if lang == "ru" else "about the candidate"),
        ("cat skills.txt", "стек технологий" if lang == "ru" else "tech stack"),
        ("cat experience.log", "опыт работы" if lang == "ru" else "work history"),
        ("cat contact.card", "контакты" if lang == "ru" else "contacts"),
        ("cd <department>", "перейти в отдел" if lang == "ru" else "jump to a department"),
        ("sudo hire anton", "???", ),
        ("clear", "очистить экран" if lang == "ru" else "clear the screen"),
    ]
    return "\n".join(f"{cmd:<20}{desc}" for cmd, desc in rows)
