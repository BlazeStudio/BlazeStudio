"""The Command Prompt's command set.
Pattern matching only: no eval(), no subprocess, nothing that
touches a real filesystem or shell. Effects are instructions the frontend interprets
(open a window, run a screen effect); this module never renders anything itself.
"""

from __future__ import annotations

import random
import re

import log_sync
from data.profile import PROFILE
from data.projects import PROJECTS

COMMANDS = [
    "help",
    "whoami",
    "cv",
    "projects",
    "contact",
    "sudo su",
    "tail",
    "matrix",
    "bsod",
    "shutdown",
    "bible",
    "coffee",
    "neofetch",
    "taskmgr",
    "explorer",
    "games",
    "calc",
    "notepad",
    "glitch",
    "rickroll",
    "cowsay",
    "clear",
]

MAX_TAIL_LINES = 200

# Ключ — короткое имя книги (без главы:стиха).
# Значение: (русский текст, английский текст)
_VERSES = {
    "genesis": (
        "В начале сотворил Бог небо и землю.",
        "In the beginning God created the heaven and the earth.",
    ),
    "exodus": (
        "Бог сказал Моисею: Я есмь Сущий.",
        "And God said unto Moses, I AM THAT I AM.",
    ),
    "psalm": (
        "Господь — Пастырь мой; я ни в чём не буду нуждаться.",
        "The LORD is my shepherd; I shall not want.",
    ),
    "proverbs": (
        "Начало мудрости — страх Господень.",
        "The fear of the LORD is the beginning of knowledge.",
    ),
    "ecclesiastes": (
        "Суета сует, сказал Екклесиаст, суета сует, — всё суета!",
        "Vanity of vanities, saith the Preacher, vanity of vanities; all is vanity.",
    ),
    "isaiah": (
        "А надеющиеся на Господа обновятся в силе.",
        "But they that wait upon the LORD shall renew their strength.",
    ),
    "matthew": (
        "Просите, и дано будет вам; ищите, и найдёте.",
        "Ask, and it shall be given you; seek, and ye shall find.",
    ),
    "john": (
        "В начале было Слово, и Слово было у Бога, и Слово было Бог.",
        "In the beginning was the Word, and the Word was with God, and the Word was God.",
    ),
    "romans": (
        "Любящим Бога, призванным по Его изволению, всё содействует ко благу.",
        "And we know that all things work together for good to them that love God.",
    ),
    "corinthians": (
        "Любовь долготерпит, милосердствует.",
        "Charity suffereth long, and is kind.",
    ),
    "revelation": (
        "Се, стою у двери и стучу.",
        "Behold, I stand at the door, and knock.",
    ),
}

# Алиасы для удобства
_BOOK_ALIASES = {
    "gen": "genesis",
    "exo": "exodus",
    "ps": "psalm",
    "psalms": "psalm",
    "prov": "proverbs",
    "ecc": "ecclesiastes",
    "isa": "isaiah",
    "matt": "matthew",
    "mt": "matthew",
    "jn": "john",
    "rom": "romans",
    "1cor": "corinthians",
    "1 corinthians": "corinthians",
    "rev": "revelation",
}


def _cv_txt(lang: str) -> str:
    lines = [f"{PROFILE['name'][lang]} — {PROFILE['role'][lang]}"]
    lines += [f"  {p}" for p in PROFILE["about"][lang]]
    return "\n".join(lines)


def _projects_txt(lang: str) -> str:
    lines = [
        f"{len(PROJECTS)} public repos worth showing:"
        if lang == "en"
        else f"{len(PROJECTS)} репозиториев, которые не стыдно показать:"
    ]
    lines += [f"  - {p['name']} ({', '.join(p['stack'][:2])})" for p in PROJECTS]
    return "\n".join(lines)


def _contact_txt(lang: str) -> str:
    c = PROFILE["contacts"]
    return "\n".join(
        [
            f"email     {c['email']}",
            f"telegram  {c['telegram_handle']}",
            f"github    {c['github']}",
            f"linkedin  {c['linkedin']}",
        ]
    )


def _neofetch(lang: str) -> str:
    name = PROFILE["name"][lang]
    role = PROFILE["role"][lang]
    return f"""\
       _______
      /       \\
     |  ●   ●  |     {name}
     |    ▽    |     -----------
      \\_______/      OS: Portfolio OS 1.0
                     Host: recruiter-desktop
                     Kernel: FastAPI + vanilla JS
                     Uptime: too long polishing this terminal
                     Shell: custom-cmd
                     Resolution: 1920x1080 (probably)
                     Theme: dark + green accents
                     CPU: 1x Anton
                     Memory: enough for one more coffee
                     Role: {role}"""


def _fortune(lang: str) -> str:
    fortunes_ru = [
        "Код, который работает с первого раза — это баг в матрице.",
        "Лучший способ понять задачу — написать для неё README.",
        "Рефакторинг никогда не заканчивается. Он просто уходит в отпуска.",
        "Если всё работает — ты что-то упустил.",
        "Документация — это письмо самому себе из прошлого. Обычно злое.",
        "Дедлайн — лучший мотиватор после кофе.",
    ]
    fortunes_en = [
        "Code that works on the first try is a bug in the Matrix.",
        "The best way to understand a task is to write its README.",
        "Refactoring never ends. It just goes on vacation.",
        "If everything works — you missed something.",
        "Documentation is a letter to yourself from the past. Usually angry.",
        "Deadline is the best motivator after coffee.",
    ]
    return random.choice(fortunes_ru if lang == "ru" else fortunes_en)


def _bible_frame(verse: str, book: str, lang: str) -> str:
    """Мистическое обрамление стиха."""
    cross = r"""
            ✝
           /|\
          / | \
         /  |  \
            |
         ___|___
"""
    book_art = r"""
      .--.
     /    \
    |  📖  |
     \    /
      '--'
"""
    light = r"""
         *
        /|\
       / | \
      *  |  *
         |
      ---*---
"""
    frames = [cross, book_art, light]
    art = random.choice(frames)

    if lang == "ru":
        header = "✠  Священное Писание  ✠"
        footer = f"— {book.capitalize()} —"
        whisper = random.choice(
            [
                "Слышишь ли ты шёпот веков?",
                "Слово было в начале…",
                "И свет во тьме светит…",
                "Ищите — и найдёте.",
                "Се, стою у двери…",
            ]
        )
    else:
        header = "✠  Holy Scripture  ✠"
        footer = f"— {book.capitalize()} —"
        whisper = random.choice(
            [
                "Do you hear the whisper of ages?",
                "In the beginning was the Word…",
                "And the light shineth in darkness…",
                "Seek, and ye shall find.",
                "Behold, I stand at the door…",
            ]
        )

    return f"""{art}
{header}

  « {verse} »

{footer}

  {whisper}
"""


_BROWSERS = [
    (r"YaBrowser/(\d+)", ("Яндекс Браузер", "Yandex Browser")),
    (r"Edg(?:e|A|iOS)?/(\d+)", ("Edge", "Edge")),
    (r"OPR/(\d+)", ("Opera", "Opera")),
    (r"(?:Firefox|FxiOS)/(\d+)", ("Firefox", "Firefox")),
    (r"(?:CriOS|Chrome)/(\d+)", ("Chrome", "Chrome")),
    (r"Version/(\d+)[\d.]* .*Safari", ("Safari", "Safari")),
]
_SYSTEMS = [
    (r"Windows NT 10", "Windows 10/11"),
    (r"Windows NT 6\.3", "Windows 8.1"),
    (r"Windows NT 6\.1", "Windows 7"),
    (r"Windows", "Windows"),
    (r"iPhone|iPad|iPod", "iOS"),
    (r"Android", "Android"),
    (r"Mac OS X|Macintosh", "macOS"),
    (r"CrOS", "ChromeOS"),
    (r"Linux", "Linux"),
]


def _browser_and_os(ua: str, lang: str) -> str:
    browser = next((f"{names[0 if lang == 'ru' else 1]} {m.group(1)}" for rx, names in _BROWSERS if (m := re.search(rx, ua))), None)
    system = next((label for rx, label in _SYSTEMS if re.search(rx, ua)), None)
    return " · ".join(x for x in (browser, system) if x) or ("неизвестно" if lang == "ru" else "unknown")


def _whoami(lang: str, v: dict) -> str:
    """The visitor, not the site owner: IP and rough location (Vercel's geo
    headers — only there in production), browser/OS from the User-Agent,
    screen/timezone/languages as the page reports them. Shown back to that
    same visitor only — none of it is logged or stored."""
    ru = lang == "ru"
    unknown = "неизвестно" if ru else "unknown"
    place = ", ".join(x for x in (v.get("city"), v.get("region"), v.get("country")) if x)
    screen = " · ".join(x for x in (v.get("screen"), v.get("tz"), v.get("langs")) if x)
    rows = [
        ("IP", v.get("ip") or unknown),
        ("Откуда" if ru else "Where", place if place else unknown),
        ("Браузер" if ru else "Browser", _browser_and_os(v.get("ua") or "", lang)),
        ("Экран" if ru else "Screen", screen or unknown),
    ]
    head = "guest@blaze-studio — это Вы:" if ru else "guest@blaze-studio — that's you:"
    tail = (
        f"Ничего из этого не сохраняется."
        if ru
        else f"None of this is stored."
    )
    return "\n".join([head, *(f"  {k:<9} {val}" for k, val in rows), tail])


def run_command(raw: str, lang: str = "ru", elevated_password: str = "", visitor: dict | None = None) -> dict:
    lang = lang if lang in ("ru", "en") else "ru"
    cmd = (raw or "").strip()
    if not cmd:
        return {"output": "", "effect": None}

    parts = cmd.split(maxsplit=1)
    name = parts[0].lower()
    arg = parts[1].strip() if len(parts) > 1 else ""
    full = f"{name} {arg}".strip().lower()

    if name in ("help", "?"):
        return {"output": _help(lang), "effect": None}

    if name == "help.exe":
        return {"output": "", "effect": {"type": "horror"}}

    if name == "whoami":
        return {"output": _whoami(lang, visitor or {}), "effect": None}

    if name == "cv":
        return {"output": _cv_txt(lang), "effect": {"type": "open", "target": "resume"}}

    if name == "projects":
        return {"output": _projects_txt(lang), "effect": {"type": "open", "target": "projects"}}

    if name == "contact":
        return {"output": _contact_txt(lang), "effect": {"type": "open", "target": "contact"}}

    if name == "sudo" and arg.split(" ", 1)[0:1] == ["su"]:
        password = arg[len("su"):].strip()
        if log_sync.check_password(password):
            msg = (
                "Пароль принят. Теперь root — веди себя прилично.\nПодсказка: 'tail' покажет лог сайта."
                if lang == "ru"
                else "Password accepted. You're root now — behave.\nHint: 'tail' shows the site log."
            )
            return {"output": msg, "effect": {"type": "elevate"}}
        msg = (
            f"[sudo] пароль для {PROFILE['name']['ru'].split()[-1].lower()}: \nSorry, try again."
            if lang == "ru"
            else "[sudo] password: \nSorry, try again."
        )
        return {"output": msg, "effect": None}

    if name in ("tail", "log"):
        if not log_sync.check_password(elevated_password):
            msg = (
                "tail: невозможно открыть «site.log»: Отказано в доступе\nПодсказка: сначала 'sudo su <пароль>'"
                if lang == "ru"
                else "tail: cannot open 'site.log': Permission denied\nHint: 'sudo su <password>' first"
            )
            return {"output": msg, "effect": None}
        n = 20
        follow = False
        tokens = arg.split()
        i = 0
        while i < len(tokens):
            tok = tokens[i]
            if tok == "-f":
                follow = True
            elif tok == "-n" and i + 1 < len(tokens) and tokens[i + 1].lstrip("-").isdigit():
                n = int(tokens[i + 1])
                i += 1
            elif tok.startswith("-n") and tok[2:].isdigit():
                n = int(tok[2:])
            i += 1
        n = max(1, min(n, MAX_TAIL_LINES))
        entries = log_sync.tail(n=n)
        lines = [log_sync.format_entry(e) for e in entries]
        body = "\n".join(lines) if lines else ("(пусто)" if lang == "ru" else "(empty)")
        if follow:
            hint = "\n(живой хвост — остановится на следующей команде)" if lang == "ru" else "\n(live-tailing — stops on your next command)"
            body += hint
            effect = {"type": "tail", "follow": True, "next_id": entries[-1]["id"] if entries else -1}
        else:
            effect = None
        return {"output": body, "effect": effect}

    if name == "sudo":
        msg = (
            "Permission denied. (тоже неплохой навык)"
            if lang == "ru"
            else "Permission denied. (also a valid life skill)"
        )
        return {"output": msg, "effect": None}

    if name == "matrix":
        msg = "Открой глаза, рекрутер..." if lang == "ru" else "Wake up, recruiter..."
        return {"output": msg, "effect": {"type": "matrix"}}

    if name == "bsod":
        msg = (
            "A problem has been detected and Windows has been shut down to prevent damage\n"
            "to your computer.\n\n"
            "The problem seems to be caused by the following file: RECRUITER.SYS\n\n"
            "PAGE_FAULT_IN_NONPAGED_AREA\n\n"
            "If this is the first time you've seen this stop error screen,\n"
            "restart your computer. If this screen appears again, follow\n"
            "these steps:\n\n"
            "Check to make sure any new hardware or software is properly installed.\n"
            "If this is a new installation, ask your hardware or software manufacturer\n"
            "for any Windows updates you might need.\n\n"
            "Technical information:\n\n"
            "*** STOP: 0x00000050 (0xFD3094C2, 0x00000001, 0xFBFE7617, 0x00000000)\n\n"
            "*** RECRUITER.SYS - Address FBFE7617 base at FBFE5000, DateStamp 3d6dd67c"
            if lang == "en"
            else "Обнаружена проблема, и Windows была завершена, чтобы предотвратить повреждение\n"
            "компьютера.\n\n"
            "Проблема, судя по всему, вызвана следующим файлом: RECRUITER.SYS\n\n"
            "PAGE_FAULT_IN_NONPAGED_AREA\n\n"
            "Если вы видите этот экран ошибки впервые,\n"
            "перезагрузите компьютер. Если экран появится снова, выполните\n"
            "следующие действия:\n\n"
            "Убедитесь, что новое оборудование или программное обеспечение установлено правильно.\n"
            "Если это новая установка, обратитесь к производителю оборудования или ПО\n"
            "за обновлениями Windows.\n\n"
            "Техническая информация:\n\n"
            "*** STOP: 0x00000050 (0xFD3094C2, 0x00000001, 0xFBFE7617, 0x00000000)\n\n"
            "*** RECRUITER.SYS - Address FBFE7617 base at FBFE5000, DateStamp 3d6dd67c"
        )
        return {"output": msg, "effect": {"type": "bsod"}}

    if name == "shutdown":
        return {"output": "", "effect": {"type": "shutdown"}}

    if name == "bible":
        idx = 1 if lang == "en" else 0
        arg_lower = arg.strip().lower()

        if not arg_lower:
            usage = (
                "Использование:\n"
                "  bible              — случайный стих\n"
                "  bible <книга>      — стих из книги\n"
                "  bible list         — список книг\n\n"
                "Примеры: bible genesis, bible john, bible psalm"
                if lang == "ru"
                else "Usage:\n"
                "  bible              — random verse\n"
                "  bible <book>       — verse from a book\n"
                "  bible list         — list of books\n\n"
                "Examples: bible genesis, bible john, bible psalm"
            )
            return {"output": usage, "effect": None}

        if arg_lower in ("list", "список"):
            header = "Доступные книги:" if lang == "ru" else "Available books:"
            books = "  " + "  ".join(sorted(_VERSES.keys()))
            return {"output": f"{header}\n{books}", "effect": None}

        # нормализуем алиасы
        book = _BOOK_ALIASES.get(arg_lower, arg_lower)
        verse_pair = _VERSES.get(book)

        if not verse_pair:
            msg = (
                f"Книга «{arg}» не найдена.\nНаберите 'bible list' для списка."
                if lang == "ru"
                else f"Book '{arg}' not found.\nType 'bible list' for available books."
            )
            return {"output": msg, "effect": None}

        framed = _bible_frame(verse_pair[idx], book, lang)
        return {"output": framed, "effect": None}

    if name == "coffee":
        art = "        ) )\n       ( (\n      ........\n      |      |]\n      \\      /\n       `----'"
        caption = (
            "кофе закончился. моя продуктивность обнулена."
            if lang == "ru"
            else "coffee's out. my productivity just hit zero."
        )
        return {"output": f"{art}\n{caption}", "effect": None}

    if name == "neofetch":
        return {"output": _neofetch(lang), "effect": None}

    if name == "taskmgr":
        msg = (
            "Диспетчер задач открыт. «Снять задачу» правда закрывает окна."
            if lang == "ru"
            else "Task Manager opened. \"End Task\" really does close windows."
        )
        return {"output": msg, "effect": {"type": "open", "target": "taskmgr"}}

    if name == "games":
        msg = "Папка «Игры» открыта." if lang == "ru" else "Games folder opened."
        return {"output": msg, "effect": {"type": "open", "target": "games"}}

    if name == "explorer":
        msg = (
            "Проводник открыт. Здесь можно найти резюме, проекты и контакты."
            if lang == "ru"
            else "File Explorer opened. You can find resume, projects and contacts here."
        )
        return {"output": msg, "effect": {"type": "open", "target": "explorer"}}

    if name == "calc":
        msg = (
            "Калькулятор открыт. С клавиатуры тоже считает."
            if lang == "ru"
            else "Calculator opened. The keyboard works too."
        )
        return {"output": msg, "effect": {"type": "open", "target": "calc"}}

    if name == "notepad":
        msg = (
            "Блокнот открыт. Заметка сохраняется в этом браузере."
            if lang == "ru"
            else "Notepad opened. Your note is saved in this browser."
        )
        return {"output": msg, "effect": {"type": "open", "target": "notepad"}}

    if name == "glitch":
        msg = "glitch mode activated" if lang == "en" else "режим глитча активирован"
        return {"output": msg, "effect": {"type": "glitch"}}

    if name == "rickroll":
        msg = "Never gonna give you up...\nNever gonna let you down..."
        return {"output": msg, "effect": {"type": "rickroll"}}

    if name == "cowsay":
        text = arg or ("Мооо!" if lang == "ru" else "Moo!")
        art = f"""\
 {'_' * (len(text) + 2)}
< {text} >
 {'_' * (len(text) + 2)}
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||"""
        return {"output": art, "effect": None}

    if name == "clear":
        return {"output": "", "effect": {"type": "clear"}}

    msg = (
        f"'{name}' is not recognized as an internal or external command."
        if lang == "en"
        else f"«{name}» не является внутренней или внешней командой."
    )
    return {
        "output": msg + ("\ntype 'help'" if lang == "en" else "\nнаберите 'help'"),
        "effect": None,
    }


def _help(lang: str) -> str:
    if lang == "en":
        rows = [
            ("help", "this list"),
            ("help.exe", "someone needs help"),
            ("whoami", "who you are"),
            ("cv", "opens the résumé window"),
            ("projects", "opens the projects window"),
            ("contact", "opens the contact window"),
            ("sudo su <password>", "elevate (needed for 'tail')"),
            ("tail [-n N] [-f]", "site log — root only"),
            ("matrix", "green rain, obviously"),
            ("bsod", "classic blue screen of death"),
            ("shutdown", "does what it says"),
            ("bible [book]", "verse from a book"),
            ("bible list", "available books"),
            ("coffee", "essential dependency"),
            ("neofetch", "system info"),
            ("taskmgr", "task manager window"),
            ("explorer", "file explorer"),
            ("games", "games folder"),
            ("calc", "calculator"),
            ("notepad", "simple notepad"),
            ("glitch", "glitch"),
            ("rickroll", "you know the rules"),
            ("cowsay [text]", "talking cow"),
            ("clear", "clear the terminal"),
        ]
    else:
        rows = [
            ("help", "этот список"),
            ("help.exe", "кому-то нужна помощь"),
            ("whoami", "кто вы"),
            ("cv", "открывает окно резюме"),
            ("projects", "открывает окно проектов"),
            ("contact", "открывает окно контактов"),
            ("sudo su <пароль>", "повышение прав (нужно для 'tail')"),
            ("tail [-n N] [-f]", "лог сайта — только для root"),
            ("matrix", "зелёный дождь, а как же без него"),
            ("bsod", "классический синий экран смерти"),
            ("shutdown", "делает ровно то, что написано"),
            ("bible [книга]", "стих из книги"),
            ("bible list", "список книг"),
            ("coffee", "критическая зависимость"),
            ("neofetch", "информация о системе"),
            ("taskmgr", "диспетчер задач"),
            ("explorer", "проводник"),
            ("games", "папка с играми"),
            ("calc", "калькулятор"),
            ("notepad", "блокнот"),
            ("glitch", "глитч"),
            ("rickroll", "ты знаешь правила"),
            ("cowsay [текст]", "говорящая корова"),
            ("clear", "очистить терминал"),
        ]
    return "\n".join(f"{c:<18}{d}" for c, d in rows)