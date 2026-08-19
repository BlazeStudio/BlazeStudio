"""Curated project data. Every entry here is backed by a real public repository at
github.com/BlazeStudio — descriptions are translated/tightened from the repo's own
README or GitHub description, not invented. Live stars/last-push are merged in at
request time by api/github.py; this file is the offline fallback and source of copy."""

PROJECTS = [
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
        "id": "detective-board",
        "repo": "Detecitve-Board",
        "name": "Detective Board",
        "category": "tools",
        "stack": ["Python", "PyQt5"],
        "description": {
            "ru": "Десктопная «доска расследования»: карточки с описаниями, нити-связи со стрелками, теги, поиск, undo/redo, сохранение дела в файл и экспорт доски в изображение.",
            "en": "A desktop \"investigation board\" app: evidence cards, threaded connections with arrows, tags, search, undo/redo, save-to-file, and board-to-image export.",
        },
        "role": {"ru": "Desktop-приложение, соло", "en": "Desktop app, solo"},
        "github": "https://github.com/BlazeStudio/Detecitve-Board",
        "homepage": None,
        "note": {
            "ru": "Да, эта штука реально существует и не является метафорой.",
            "en": "Yes, this thing genuinely exists and is not a metaphor.",
        },
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
        "stack": ["Python"],
        "description": {
            "ru": "Решения задач с Codewars — тренировочная площадка для алгоритмов и структур данных между рабочими проектами.",
            "en": "Codewars problem solutions — an algorithms-and-data-structures training ground between production projects.",
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
