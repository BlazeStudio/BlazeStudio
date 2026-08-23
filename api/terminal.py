"""The Command Prompt's command set. Exactly ten, as requested — placeholders for
now, will grow later. Pattern matching only: no eval(), no subprocess, nothing that
touches a real filesystem or shell. Effects are instructions the frontend interprets
(open a window, run a screen effect); this module never renders anything itself.
"""

from __future__ import annotations

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

# Real verses only — Synodal translation (ru) / King James Version (en), both public domain.
_VERSES = {
    "genesis 1:1": (
        "В начале сотворил Бог небо и землю.",
        "In the beginning God created the heaven and the earth.",
    ),
    "exodus 3:14": (
        "Бог сказал Моисею: Я есмь Сущий.",
        "And God said unto Moses, I AM THAT I AM.",
    ),
    "psalm 23:1": (
        "Господь — Пастырь мой; я ни в чём не буду нуждаться.",
        "The LORD is my shepherd; I shall not want.",
    ),
    "proverbs 1:7": (
        "Начало мудрости — страх Господень.",
        "The fear of the LORD is the beginning of knowledge.",
    ),
    "ecclesiastes 1:2": (
        "Суета сует, сказал Екклесиаст, суета сует, — всё суета!",
        "Vanity of vanities, saith the Preacher, vanity of vanities; all is vanity.",
    ),
    "isaiah 40:31": (
        "А надеющиеся на Господа обновятся в силе.",
        "But they that wait upon the LORD shall renew their strength.",
    ),
    "matthew 7:7": (
        "Просите, и дано будет вам; ищите, и найдёте.",
        "Ask, and it shall be given you; seek, and ye shall find.",
    ),
    "john 1:1": (
        "В начале было Слово, и Слово было у Бога, и Слово было Бог.",
        "In the beginning was the Word, and the Word was with God, and the Word was God.",
    ),
    "john 3:16": (
        "Ибо так возлюбил Бог мир, что отдал Сына Своего Единородного.",
        "For God so loved the world, that he gave his only begotten Son.",
    ),
    "romans 8:28": (
        "Любящим Бога, призванным по Его изволению, всё содействует ко благу.",
        "And we know that all things work together for good to them that love God.",
    ),
    "1 corinthians 13:4": (
        "Любовь долготерпит, милосердствует.",
        "Charity suffereth long, and is kind.",
    ),
    "revelation 3:20": (
        "Се, стою у двери и стучу.",
        "Behold, I stand at the door, and knock.",
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
            f"{PROFILE['name'][lang]}\n{PROFILE['role'][lang]}\n(я — просто слишком долго настраивал этот терминал)"
            if lang == "ru"
            else f"{PROFILE['name'][lang]}\n{PROFILE['role'][lang]}\n(me — spent way too long styling this terminal)"
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
            "[sudo] пароль для recruiter: ********\nдоступ разрешён. Готов начинать."
            if lang == "ru"
            else "[sudo] password for recruiter: ********\naccess granted. Ready to start."
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
        ref = " ".join(arg.split())
        if not ref:
            examples = ", ".join(sorted(_VERSES.keys())[:4])
            msg = f"используй: bible <книга глава:стих>. например: bible john 3:16\nдоступны: {examples}, ..." if lang == "ru" else f"usage: bible <book chapter:verse>. try: bible john 3:16\navailable: {examples}, ..."
            return {"output": msg, "effect": None}
        verse = _VERSES.get(ref)
        if not verse:
            msg = f"стих «{ref}» не найден. наберите 'bible' для примеров." if lang == "ru" else f"verse '{ref}' not found. type 'bible' for examples."
            return {"output": msg, "effect": None}
        return {"output": verse[idx], "effect": None}

    if name == "coffee":
        art = "        ) )\n       ( (\n      ........\n      |      |]\n      \\      /\n       `----'"
        caption = "кофе закончился. моя продуктивность обнулена." if lang == "ru" else "coffee's out. my productivity just hit zero."
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
            ("bible <book ch:v>", "seek and you shall find"),
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
            ("bible <книга гл:ст>", "ищите и найдёте"),
            ("coffee", "критическая зависимость"),
            ("logs", "tail -f, почти всё в порядке"),
        ]
    return "\n".join(f"{c:<18}{d}" for c, d in rows)
