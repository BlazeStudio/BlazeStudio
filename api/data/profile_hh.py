"""hh.ru-sourced résumé data. Selected when config.RESUME_SOURCE == "hh"."""

PROFILE = {
    "name": {"ru": "Васильев Антон", "en": "Anton Vasiliev"},
    "role": {"ru": "Python Backend Developer", "en": "Python Backend Developer"},
    "tagline": {
        "ru": "Партизан надевает корпортивное худи и выходит к людям",
        "en": "100 years of offers",
    },
    "location": {"ru": "Москва, Россия", "en": "Moscow, Russia"},
    "age": 21,
    "employment": {
        "ru": "Открыт к предложениям — полная, частичная занятость, проекты, стажировки",
        "en": "Open to offers — full-time, part-time, project work, internships",
    },
    "format": {"ru": "Удалённо / гибрид", "en": "Remote / hybrid"},
    "contacts": {
        "email": "praim916@mail.ru",
        "telegram": "https://t.me/terminallover",
        "telegram_handle": "@terminallover",
        "github": "https://github.com/BlazeStudio",
        "linkedin": "https://www.linkedin.com/in/anton-vasiliev-b19458321/",
        "hh": "https://hh.ru/resume/3753c2bcff0ea2b0390039ed1f576348314c68",
    },
    "languages": [
        {"name": {"ru": "Русский", "en": "Russian"}, "level": {"ru": "Родной", "en": "Native"}, "value": 100},
        {"name": {"ru": "Английский", "en": "English"}, "level": {"ru": "B2", "en": "B2"}, "value": 68},
    ],
    "certifications": [
        {
            "ru": "«Инженерия и программирование на языке Python», МГТУ им. Н.Э. Баумана (2022)",
            "en": "“Python Engineering & Programming”, Bauman Moscow State Technical University (2022)",
        },
    ],
    "about": {
        "ru": [
            "Больше трёх лет пишу на Python, из них два с лишним — в FinTech и InsurTech: актуарное моделирование, автоматизация пенсионных фондов, риск-отчётность — там, где цена бага считается в чужих деньгах, а не в звёздах на GitHub.",
            "Разбираться с легаси или собирать архитектуру микросервиса с нуля — то, что реально нравится. Документация и автотесты — не для галочки, прод по пятницам не роняю.",
            "Учусь в РУТ (МИИТ) на управлении информационными процессами.",
        ],
        "en": [
            "Three-plus years writing Python, two of them in FinTech and InsurTech — actuarial modeling, pension fund automation, risk reporting — where a bug's cost is measured in someone else's money, not GitHub stars.",
            "Digging into legacy code or building a microservice's architecture from scratch — both genuinely enjoyable. Docs and autotests aren't a checkbox, and prod doesn't go down on Fridays.",
            "Studying information process management at Russian University of Transport (RUT MIIT).",
        ],
    },
    "traits": [
        {"ru": "Не боюсь легаси", "en": "Not afraid of legacy code"},
        {"ru": "Самые красивые логи", "en": "The most beautiful logs"},
        {"ru": "Не кладу прод в пятницу", "en": "Don't take prod down on Fridays"},
        {"ru": "Люблю документацию и автотесты", "en": "Loves docs and autotests"},
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
                {"name": "PostgreSQL", "level": 85},
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
                {"name": "CI/CD", "level": 78},
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
            "period": {"ru": "Июнь 2024 — Август 2026", "en": "Jun 2024 — Aug 2026"},
            "duration": {"ru": "2 года 3 месяца", "en": "2 yr 3 mo"},
            "company": {"ru": "RTL Consulting (бывш. SAS Enterprise)", "en": "RTL Consulting (ex. SAS Enterprise)"},
            "title": {"ru": "Middle Backend Developer", "en": "Middle Backend Developer"},
            "summary": {
                "ru": "Математические алгоритмы для пенсионных фондов, страховых компаний и банков. Актуарный модуль, модуль отчётности, синхронизация с интерфейсом и другими модулями, деплой на стендах заказчика.",
                "en": "Mathematical algorithms for pension funds, insurers and banks. Owned the actuarial module and reporting module, kept them in sync with the UI and other modules, deployed to client environments.",
            },
            "highlight": {
                "ru": 'Реализовал ПДС, ОПС и НПО для 10 заказчиков: "Ренессанс страхование", "Благосостояние", "Газфонд ПН", "Альянс", "Национальный", "Социум", "Ростех", "СберНПФ", "Ханты-Мансийский", "ВТБ".',
                "en": "Delivered pension-program calculation modules (ПДС/ОПС/НПО) for 10 clients, including Renaissance Insurance, Gazfond, Alliance, SberNPF and VTB.",
            },
            "tasks": {
                "ru": [
                    "Участие в развитии и поддержке серверной части проекта",
                    "Работа над надёжностью и стабильностью систем",
                    "Разработка и сопровождение программного кода",
                    "Участие в процессах переноса и актуализации данных",
                    "Контроль состояния и работоспособности продукта",
                    "Участие в процессах автоматизации разработки",
                    "Работа с современными подходами к организации распределённых систем",
                ],
                "en": [
                    "Contributed to development and support of the project's server side",
                    "Worked on system reliability and stability",
                    "Developed and maintained production code",
                    "Took part in data migration and refresh processes",
                    "Monitored product health and uptime",
                    "Took part in development-automation initiatives",
                    "Worked with modern approaches to distributed systems",
                ],
            },
            "tags": ["Python", "SQL", "CI/CD", "Docker", "Data Migration"],
        },
        {
            "period": {"ru": "Сентябрь 2023 — Май 2024", "en": "Sep 2023 — May 2024"},
            "duration": {"ru": "9 месяцев", "en": "9 mo"},
            "company": {"ru": "Веб-студия «Фрилансер» (Краснодар)", "en": "Freelance web studio (Krasnodar)"},
            "title": {"ru": "Fullstack Developer", "en": "Fullstack Developer"},
            "summary": {
                "ru": "Django (февраль — май 2024): сайт для поиска досуга в Москве с Yandex Maps API — динамическое добавление событий и графическая статистика посещений, оценок и закладок. Flask (сентябрь — декабрь 2023): браузерный аналог pgAdmin/DBeaver для PostgreSQL с отдельной SQL-консолью, и социальная сеть с друзьями, жалобами и Ajax-сообщениями.",
                "en": "Django (Feb – May 2024): a leisure-discovery site for Moscow with the Yandex Maps API — dynamic event pins and per-event charts for visits, ratings and bookmarks. Flask (Sep – Dec 2023): a browser-based pgAdmin/DBeaver alternative for PostgreSQL with its own SQL console, and a small social network with friends, complaints and Ajax messaging.",
            },
            "highlight": {"ru": "Открытые проекты: Ritm Goroda, PostgreSQL Web GUI, Vostok Messenger", "en": "Public projects: Ritm Goroda, PostgreSQL Web GUI, Vostok Messenger"},
            "tasks": {"ru": [], "en": []},
            "tags": ["Python", "Django", "Flask", "PostgreSQL", "Ajax"],
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
