"""Curated project data. Every entry here is backed by a real public repository at
github.com/BlazeStudio — descriptions are translated/tightened from the repo's own
README or GitHub description, not invented. Live stars/last-push are merged in at
request time by api/github_sync.py; this file is the offline fallback and source of copy."""

PROJECTS = [
    {
        "id": "hh-auto-response",
        "repo": "HH-Auto-Response",
        "name": "HH-Auto-Response",
        "category": "tools",
        # Shown on its own above the grid, with a star count (live from GitHub
        # when it answers, else this snapshot).
        "featured": True,
        "stars": 0,
        "stack": ["Python", "Playwright", "CustomTkinter", "OpenRouter / DeepSeek / Ollama", "Docker", "GitHub Actions"],
        "description": {
            "ru": "Десктоп-приложение, которое само откликается на вакансии hh.ru: проходит выдачу страница за страницей, пишет сопроводительное письмо под конкретную вакансию, заполняет анкеты работодателей по резюме и разбирает чаты с отказами. Живых рекрутеров, приглашения и всё про документы и деньги оставляет человеку.",
            "en": "A desktop app that applies to hh.ru vacancies by itself: it walks the search results page by page, writes a cover letter for each vacancy, fills in employer questionnaires from the résumé and sorts out rejection chats. Live recruiters, invitations and anything about documents or money stay with the human.",
        },
        "highlights": {
            "ru": [
                "Все фильтры поиска hh плюс свои; настройки заполняются одной ссылкой с сайта",
                "Нейросеть на выбор: OpenRouter, DeepSeek или локальная Ollama",
                "Технологии, зарплату и сроки выхода берёт из резюме и настроек, а не придумывает",
                "Сборки под Windows, macOS, Linux и Docker, обновляется само из релизов GitHub",
            ],
            "en": [
                "Every hh search filter plus its own; settings fill in from a single hh link",
                "LLM of your choice: OpenRouter, DeepSeek or a local Ollama",
                "Skills, salary and start date come from the résumé and settings, never made up",
                "Builds for Windows, macOS, Linux and Docker, self-updating from GitHub releases",
            ],
        },
        "role": {"ru": "Desktop-приложение, соло", "en": "Desktop app, solo"},
        "github": "https://github.com/BlazeStudio/HH-Auto-Response",
        "homepage": "https://github.com/BlazeStudio/HH-Auto-Response/releases/latest",
        "homepage_label": {"ru": "Скачать", "en": "Download"},
    },
    {
        "id": "fresh-multitool",
        "repo": "Fresh-Multitool",
        "name": "Fresh Multitool",
        "category": "tools",
        "stack": ["Python", "Rich", "prompt_toolkit", "psutil", "WinAPI", "Windows Terminal"],
        "description": {
  "ru": "Лаунчер для Windows Terminal: градиентный баннер, powerline со статистикой нагрузки, индикаторы приложений, Tab-автодополнение, Alt+`, системные команды и меню из config.json с hot-reload.",
  "en": "Windows Terminal launcher with gradient banner, powerline system stats, app indicators, Tab completion, Alt+` hotkey, system commands, and config.json menu with hot-reload."            },
        "role": {"ru": "CLI-утилита, соло", "en": "CLI tool, solo"},
        "github": "https://github.com/BlazeStudio/Fresh-Multitool",
        "homepage": None,
    },
    {
        "id": "ritm-goroda",
        "repo": "Ritm-Goroda",
        "name": "Ritm Goroda",
        "category": "web",
        "stack": ["Python", "Django", "JavaScript", "SQLite", "Yandex Maps API"],
        "description": {
            "ru": "Сайт для поиска досуга в Москве: события подтягиваются на Яндекс.Карты автоматически из базы, у каждой точки — своя графика посещений, оценок и закладок.",
            "en": "A leisure-discovery site for Moscow: events populate a Yandex Maps layer straight from the database, each pin carrying its own charts for visits, ratings and bookmarks.",
        },
        "role": {"ru": "Fullstack, соло", "en": "Fullstack, solo"},
        "github": "https://github.com/BlazeStudio/Ritm-Goroda",
        "homepage": None,
    },
    {
        "id": "pg-web-gui",
        "repo": "PostrgreSQL-Web-GUI",
        "name": "PostgreSQL Web GUI",
        "category": "tools",
        "stack": ["Python", "Flask", "Psycopg", "PostgreSQL"],
        "description": {
            "ru": "Браузерный аналог pgAdmin и DBeaver: подключение к PostgreSQL, визуальная работа с таблицами и отдельная консоль для сырых SQL-запросов.",
            "en": "A browser-based pgAdmin/DBeaver alternative: connect to PostgreSQL, browse and edit tables visually, plus a dedicated console for raw SQL.",
        },
        "role": {"ru": "Fullstack, соло", "en": "Fullstack, solo"},
        "github": "https://github.com/BlazeStudio/PostrgreSQL-Web-GUI",
        "homepage": None,
    },
    {
        "id": "vostok-messenger",
        "repo": "Vostok-Flask-Messenger",
        "name": "Vostok Messenger",
        "category": "web",
        "stack": ["Python", "Flask", "Ajax", "HTML/CSS"],
        "description": {
            "ru": "Небольшая социальная сеть: регистрация, друзья, жалобы модераторам и обмен сообщениями с подгрузкой через Ajax без перезагрузки страницы.",
            "en": "A compact social network: registration, friend lists, moderation reports, and Ajax-driven messaging that loads without a page refresh.",
        },
        "role": {"ru": "Fullstack, соло", "en": "Fullstack, solo"},
        "github": "https://github.com/BlazeStudio/Vostok-Flask-Messenger",
        "homepage": None,
    },
    {
        "id": "des-ofb",
        "repo": "DES-OFB-on-Pure-Python",
        "name": "DES-OFB Cipher",
        "category": "security",
        "stack": ["Python", "Cryptography"],
        "description": {
            "ru": "Реализация шифра DES в режиме Output Feedback на чистом Python с подробным разбором алгоритма и простым GUI для демонстрации.",
            "en": "A pure-Python implementation of DES in Output Feedback mode, with a step-by-step algorithm write-up and a small GUI for demos.",
        },
        "role": {"ru": "Исследовательский проект, соло", "en": "Research project, solo"},
        "github": "https://github.com/BlazeStudio/DES-OFB-on-Pure-Python",
        "homepage": None,
    },
    {
        "id": "tboi-mod",
        "repo": "TBoI-ES-Modification",
        "name": "The Binding of Isaac — ES Mod",
        "category": "games",
        "stack": ["Lua"],
        "description": {
            "ru": "Мод для The Binding of Isaac: новые персонажи, предметы и карты, переработанное главное меню и новые анимации. Опубликован в Steam Workshop.",
            "en": "A mod for The Binding of Isaac adding new characters, items and maps, a redesigned main menu, and new animations. Published on Steam Workshop.",
        },
        "role": {"ru": "Game modding, соло", "en": "Game modding, solo"},
        "github": "https://github.com/BlazeStudio/TBoI-ES-Modification",
        "homepage": "https://steamcommunity.com/sharedfiles/filedetails/?id=1984690013",
        "homepage_label": {"ru": "Steam Workshop", "en": "Steam Workshop"},
    },
    {
        "id": "spring-practice",
        "repo": "Spring-Practice",
        "name": "Spring Practice",
        "category": "practice",
        "stack": ["Java", "Spring REST"],
        "description": {
            "ru": "Учебный проект в институте на Spring REST Framework — вылазка за пределы Python-стека, чтобы понять, как та же задача решается на Java.",
            "en": "A university practice project on Spring REST Framework — a deliberate excursion outside the Python stack to see the same problems solved in Java.",
        },
        "role": {"ru": "Учебный проект", "en": "Academic project"},
        "github": "https://github.com/BlazeStudio/Spring-Practice",
        "homepage": None,
    },
    {
        "id": "codewars",
        "repo": "Codewars-Solutions",
        "name": "Codewars Solutions",
        "category": "practice",
        "stack": ["Shell", "Python", "SQL", "Go", "C++"],
        "description": {
            "ru": "Решения кат с Codewars — больше 180 задач на Shell, Python, SQL, Go и C++, вплоть до 1 kyu (Tiny Three-Pass Compiler, Simple Interactive Interpreter). Файлы и таблица в README с разбивкой по языкам и сложности обновляются собственным скриптом синхронизации.",
            "en": "Codewars kata solutions — over 180 problems in Shell, Python, SQL, Go and C++, up to 1 kyu (Tiny Three-Pass Compiler, Simple Interactive Interpreter). The files and the README table, broken down by language and rank, are kept up to date by a custom sync script.",
        },
        "role": {"ru": "Практика", "en": "Practice"},
        "github": "https://github.com/BlazeStudio/Codewars-Solutions",
        "homepage": None,
    },
]

CATEGORIES = [
    {"id": "all", "label": {"ru": "Все проекты", "en": "All projects"}},
    {"id": "web", "label": {"ru": "Web", "en": "Web"}},
    {"id": "tools", "label": {"ru": "Инструменты", "en": "Tools"}},
    {"id": "security", "label": {"ru": "Безопасность", "en": "Security"}},
    {"id": "games", "label": {"ru": "Игры", "en": "Games"}},
    {"id": "practice", "label": {"ru": "Практика", "en": "Practice"}},
]
