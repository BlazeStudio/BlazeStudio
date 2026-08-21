"""The Command Prompt's command set. Exactly ten, as requested — placeholders for
now, will grow later. Pattern matching only: no eval(), no subprocess, nothing that
touches a real filesystem or shell. Effects are instructions the frontend interprets
(open a window, run a screen effect); this module never renders anything itself.
"""

from __future__ import annotations

import random

from data.profile import PROFILE
from data.projects import PROJECTS

COMMANDS = [
    "help",
    "whoami",
    "cv",
    "projects",
    "contact",
    "sudo hire-anton",
    "matrix",
    "party",
    "bsod",
    "shutdown",
    "bible",
    "coffee",
    "logs",
]

_VERSES = {
    "1:1": (
        "В начале был код, и код был у бэкенда, и бэкенд был код.",
        "In the beginning was the Code, and the Code was with the Backend, and the Backend was the Code.",
    ),
    "3:16": (
        "Ибо так возлюбил рекрутер резюме моё, что назначил собеседование.",
        "For the recruiter so loved this résumé, that they scheduled an interview.",
    ),
    "23:1": (
        "Git — пастырь мой; я не буду нуждаться в бэкапах.",
        "Git is my shepherd; I shall not want for backups.",
    ),
    "500:1": (
        "И сказал сервер: да будет 500. И стал 500. И увидел админ, что это плохо.",
        "And the server said, let there be 500. And there was 500. And the admin saw that it was not good.",
    ),
}


def _cv_txt(lang: str) -> str:
    lines = [f"{PROFILE['name'][lang]} — {PROFILE['role'][lang]}"]
    lines += [f"  {p}" for p in PROFILE["about"][lang]]
    return "\n".join(lines)


def _projects_txt(lang: str) -> str:
    lines = [f"{len(PROJECTS)} public repos worth showing:" if lang == "en" else f"{len(PROJECTS)} репозиториев, которые не стыдно показать:"]
    lines += [f"  - {p['name']} ({', '.join(p['stack'][:2])})" for p in PROJECTS]
    return "\n".join(lines)


def _contact_txt(lang: str) -> str:
    c = PROFILE["contacts"]
    return "\n".join([f"email     {c['email']}", f"telegram  {c['telegram_handle']}", f"github    {c['github']}", f"linkedin  {c['linkedin']}"])


def run_command(raw: str, lang: str = "ru") -> dict:
    lang = lang if lang in ("ru", "en") else "ru"
    cmd = (raw or "").strip()
    if not cmd:
        return {"output": "", "effect": None}

    parts = cmd.split(maxsplit=1)
    name = parts[0].lower()
    arg = parts[1].strip().lower() if len(parts) > 1 else ""
    full = f"{name} {arg}".strip()

    if name in ("help", "?"):
        return {"output": _help(lang), "effect": None}

    if name == "whoami":
        msg = (
            f"{PROFILE['name'][lang]}\n{PROFILE['role'][lang]}\n(на самом деле просто человек, который слишком долго настраивал этот терминал)"
            if lang == "ru"
            else f"{PROFILE['name'][lang]}\n{PROFILE['role'][lang]}\n(actually just a guy who spent too long styling this terminal)"
        )
        return {"output": msg, "effect": None}

    if name == "cv":
        return {"output": _cv_txt(lang), "effect": {"type": "open", "target": "resume"}}

    if name == "projects":
        return {"output": _projects_txt(lang), "effect": {"type": "open", "target": "projects"}}

    if name == "contact":
        return {"output": _contact_txt(lang), "effect": {"type": "open", "target": "contact"}}

    if full == "sudo hire-anton":
        msg = (
            "[sudo] пароль для recruiter: ********\nдоступ разрешён. Антон добавлен в команду."
            if lang == "ru"
            else "[sudo] password for recruiter: ********\naccess granted. Anton has been added to the team."
        )
        return {"output": msg, "effect": {"type": "confetti"}}

    if name == "sudo":
        msg = "Permission denied. (тоже неплохой навык)" if lang == "ru" else "Permission denied. (also a valid life skill)"
        return {"output": msg, "effect": None}

    if name == "matrix":
        msg = "Открой глаза, рекрутер..." if lang == "ru" else "Wake up, recruiter..."
        return {"output": msg, "effect": {"type": "matrix"}}

    if name == "party":
        msg = "party mode: ON" if lang == "en" else "режим вечеринки: ВКЛ"
        return {"output": msg, "effect": {"type": "party"}}

    if name == "bsod":
        return {"output": "", "effect": {"type": "bsod"}}

    if name == "shutdown":
        return {"output": "", "effect": {"type": "shutdown"}}

    if name == "bible":
        idx = 1 if lang == "en" else 0
        if not arg:
            msg = "используй: bible <глава:стих>. например: bible 3:16" if lang == "ru" else "usage: bible <chapter:verse>. try: bible 3:16"
            return {"output": msg, "effect": None}
        verse = _VERSES.get(arg) or random.choice(list(_VERSES.values()))
        return {"output": verse[idx], "effect": None}

    if name == "coffee":
        art = "        ) )\n       ( (\n      ........\n      |      |]\n      \\      /\n       `----'"
        caption = "кофе закончился. продуктивность бэкендера обнулена." if lang == "ru" else "coffee's out. backend productivity reset to zero."
        return {"output": f"{art}\n{caption}", "effect": None}

    if name == "logs":
        lines = (
            ["tail -f logs.txt", "[INFO] всё работает", "[INFO] нет, правда работает", "[WARN] опять этот legacy-модуль", "[ERROR] ладно, не всё"]
            if lang == "ru"
            else ["tail -f logs.txt", "[INFO] everything works", "[INFO] no really, it works", "[WARN] that legacy module again", "[ERROR] okay, not everything"]
        )
        return {"output": "\n".join(lines), "effect": None}

    msg = f"'{name}' is not recognized as an internal or external command." if lang == "en" else f"«{name}» не является внутренней или внешней командой."
    return {"output": msg + ("\ntype 'help'" if lang == "en" else "\nнаберите 'help'"), "effect": None}


def _help(lang: str) -> str:
    if lang == "en":
        rows = [
            ("help", "this list"),
            ("whoami", "who's typing this"),
            ("cv", "opens the résumé window"),
            ("projects", "opens the projects window"),
            ("contact", "opens the contact window"),
            ("sudo hire-anton", "???"),
            ("matrix", "green rain, obviously"),
            ("party", "shakes the desktop icons"),
            ("bsod", "a scare, nothing more"),
            ("shutdown", "does what it says"),
            ("bible <ch:v>", "seek and you shall find"),
            ("coffee", "essential dependency"),
            ("logs", "tail -f, mostly fine"),
        ]
    else:
        rows = [
            ("help", "этот список"),
            ("whoami", "кто это печатает"),
            ("cv", "открывает окно резюме"),
            ("projects", "открывает окно проектов"),
            ("contact", "открывает окно контактов"),
            ("sudo hire-anton", "???"),
            ("matrix", "зелёный дождь, а как же без него"),
            ("party", "трясёт иконки на столе"),
            ("bsod", "просто пугалка"),
            ("shutdown", "делает ровно то, что написано"),
            ("bible <гл:ст>", "ищите и найдёте"),
            ("coffee", "критическая зависимость"),
            ("logs", "tail -f, почти всё в порядке"),
        ]
    return "\n".join(f"{c:<18}{d}" for c, d in rows)
