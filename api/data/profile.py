"""Structured resume data for both locales. No database — this module is the single
source of truth that templates and the /api endpoints read from."""

PROFILE = {
    "name": {"ru": "Васильев Антон", "en": "Anton Vasiliev"},
    "role": {"ru": "Python Backend Developer", "en": "Python Backend Developer"},
    "tagline": {
        "ru": "Пишу серверный код, который не падает по ночам",
        "en": "Writing backend code that doesn't page anyone at 3 a.m.",
    },
    "location": {"ru": "Москва, Россия", "en": "Moscow, Russia"},
    "age": 21,
    "employment": {
        "ru": "Открыт к предложениям — полная, частичная занятость, проекты",
        "en": "Open to offers — full-time, part-time, project work",
    },
    "format": {"ru": "Удалённо / гибрид", "en": "Remote / hybrid"},
    "contacts": {
        "email": "praim916@mail.ru",
        "telegram": "https://t.me/OlegGortsev",
        "telegram_handle": "@OlegGortsev",
        "github": "https://github.com/BlazeStudio",
        "linkedin": "https://www.linkedin.com/in/anton-vasiliev-b19458321/",
        "hh": "https://hh.ru/resume/3753c2bcff0ea2b0390039ed1f576348314c68",
    },
    "languages": [
        {"name": {"ru": "Русский", "en": "Russian"}, "level": {"ru": "Родной", "en": "Native"}, "value": 100},
        {"name": {"ru": "Английский", "en": "English"}, "level": {"ru": "B1 — средний", "en": "B1 — Intermediate"}, "value": 55},
    ],
    "about": {
        "ru": [
            "Backend-разработчик с опытом промышленной эксплуатации: два года пишу актуарные и отчётные модули для банков, страховых и пенсионных фондов — системы, где цена бага измеряется в чужих деньгах.",
            "Параллельно веду сторонние проекты — от мессенджеров на Flask до модов для видеоигр — просто потому что нравится собирать вещи с нуля и разбираться, как они работают.",
            "Учусь в РУТ (МИИТ) на управлении информационными процессами. Английский подтягиваю, чтобы читать документацию без скидок на перевод.",
        ],
        "en": [
            "Backend developer with real production mileage: two years building actuarial and reporting modules for banks, insurers and pension funds — systems where a bug's cost is measured in someone else's money.",
            "In parallel I run side projects — from Flask messengers to video game mods — mostly because I like building things from scratch and figuring out how they tick.",
            "Studying information process management at Russian University of Transport. Still leveling up my English so documentation stops needing a translator.",
        ],
    },
    "traits": [
        {"ru": "Не боюсь легаси", "en": "Not afraid of legacy code"},
        {"ru": "Читаю логи для удовольствия", "en": "Reads logs for fun"},
        {"ru": "Мигрировал БД и остался жив", "en": "Migrated a database and survived"},
        {"ru": "Спорит с багами до победного", "en": "Argues with bugs until they lose"},
    ],
    "skills": {
        "backend": {
            "label": {"ru": "Backend", "en": "Backend"},
            "items": [
                {"name": "Python", "level": 95},
                {"name": "Django", "level": 90},
                {"name": "Django REST Framework", "level": 88},
                {"name": "FastAPI", "level": 85},
                {"name": "Flask", "level": 88},
            ],
        },
        "data": {
            "label": {"ru": "Данные", "en": "Data"},
            "items": [
                {"name": "SQL", "level": 88},
                {"name": "pandas", "level": 80},
                {"name": "NumPy", "level": 75},
                {"name": "Polars", "level": 65},
                {"name": "DuckDB", "level": 60},
                {"name": "Redis", "level": 78},
            ],
        },
        "infra": {
            "label": {"ru": "Инфраструктура", "en": "Infrastructure"},
            "items": [
                {"name": "Docker", "level": 85},
                {"name": "Docker Compose", "level": 85},
                {"name": "Kubernetes", "level": 60},
                {"name": "Kafka", "level": 55},
                {"name": "Celery", "level": 75},
                {"name": "GitLab CI", "level": 78},
                {"name": "Linux / Bash / SSH", "level": 82},
            ],
        },
        "practice": {
            "label": {"ru": "Практики", "en": "Practices"},
            "items": [
                {"name": "Git", "level": 92},
                {"name": "Pytest", "level": 78},
                {"name": "Agile", "level": 80},
                {"name": "ML basics", "level": 55},
                {"name": "RAG", "level": 50},
            ],
        },
    },
    "experience": [
        {
            "period": {"ru": "Июнь 2024 — Июль 2026", "en": "Jun 2024 — Jul 2026"},
            "duration": {"ru": "2 года 2 месяца", "en": "2 yr 2 mo"},
            "company": {"ru": "РТЛ (бывш. САС Институт)", "en": "RTL (formerly SAS Institute)"},
            "title": {"ru": "Junior Backend Developer", "en": "Junior Backend Developer"},
            "summary": {
                "ru": "Писал математические алгоритмы для пенсионных фондов, страховых компаний и банков. Отвечал за актуарный модуль, модуль отчётности, синхронизацию с интерфейсом и другими модулями, разворачивал проекты на стендах заказчика.",
                "en": "Built mathematical algorithms for pension funds, insurers and banks. Owned the actuarial module and the reporting module, kept them in sync with the UI and other modules, deployed to client environments.",
            },
            "highlight": {
                "ru": 'Реализовал ПДС, ОПС и НПО для 10 заказчиков: "Ренессанс страхование", "Благосостояние", "Газфонд ПН", "Альянс", "Национальный", "Социум", "Ростех", "СберНПФ", "Ханты-Мансийский", "ВТБ".',
                "en": "Delivered pension-program calculation modules (ПДС/ОПС/НПО) for 10 clients, including Renaissance Insurance, Gazfond, Alliance, SberNPF and VTB.",
            },
            "tasks": {
                "ru": [
                    "Масштабирование серверной инфраструктуры",
                    "Стратегии отказоустойчивости и масштабируемости",
                    "Миграция данных из старых систем в новые",
                    "Мониторинг работоспособности и производительности",
                    "CI/CD в направлении и компании",
                    "Контейнеризация и распределённые системы",
                ],
                "en": [
                    "Scaled server infrastructure",
                    "Designed fault-tolerance & scalability strategies",
                    "Migrated data from legacy systems to new ones",
                    "Monitored production health and performance",
                    "Built and maintained CI/CD pipelines",
                    "Worked with containerization and distributed systems",
                ],
            },
            "tags": ["Python", "SQL", "CI/CD", "Docker", "Data Migration"],
        },
        {
            "period": {"ru": "Февраль 2024 — Май 2024", "en": "Feb 2024 — May 2024"},
            "duration": {"ru": "4 месяца", "en": "4 mo"},
            "company": {"ru": "Фриланс", "en": "Freelance"},
            "company_en": "Freelance",
            "title": {"ru": "Django Fullstack Developer", "en": "Django Fullstack Developer"},
            "summary": {
                "ru": "Разработал веб-сайт для поиска досуга в Москве. Интегрировал Yandex Maps API с динамическим добавлением событий на карту и графической статистикой посещений, оценок и закладок.",
                "en": "Built a leisure-discovery website for Moscow. Integrated the Yandex Maps API with dynamic event pins and per-event charts for visits, ratings and bookmarks.",
            },
            "highlight": {"ru": "Открытый проект: Ritm Goroda", "en": "Public project: Ritm Goroda"},
            "tasks": {"ru": [], "en": []},
            "tags": ["Python", "Django", "JavaScript", "SQLite", "Yandex Maps API"],
        },
        {
            "period": {"ru": "Сентябрь 2023 — Декабрь 2023", "en": "Sep 2023 — Dec 2023"},
            "duration": {"ru": "4 месяца", "en": "4 mo"},
            "company": {"ru": "Фриланс", "en": "Freelance"},
            "company_en": "Freelance",
            "title": {"ru": "Flask Fullstack Developer", "en": "Flask Fullstack Developer"},
            "summary": {
                "ru": "Два проекта параллельно: браузерный аналог pgAdmin/DBeaver для PostgreSQL с отдельной SQL-консолью, и небольшая социальная сеть с друзьями, жалобами и обменом сообщениями на Ajax.",
                "en": "Two projects in parallel: a browser-based pgAdmin/DBeaver alternative for PostgreSQL with its own SQL console, and a small social network with friends, moderation reports and Ajax-driven messaging.",
            },
            "highlight": {"ru": "Открытые проекты: PostgreSQL Web GUI, Vostok Messenger", "en": "Public projects: PostgreSQL Web GUI, Vostok Messenger"},
            "tasks": {"ru": [], "en": []},
            "tags": ["Python", "Flask", "Psycopg", "PostgreSQL", "Ajax"],
        },
    ],
    "education": {
        "school": {"ru": "Российский университет транспорта (МИИТ)", "en": "Russian University of Transport (RUT MIIT)"},
        "degree": {
            "ru": "Цифровые технологии управления транспортными процессами / Управление информационными процессами на транспорте",
            "en": "Digital technologies for transport process management / Information process management in transport",
        },
        "year": "2026",
        "city": {"ru": "Москва", "en": "Moscow"},
    },
}
