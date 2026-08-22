"""LinkedIn-sourced résumé data. Selected when config.RESUME_SOURCE == "linkedin"."""

PROFILE = {
    "name": {"ru": "Васильев Антон", "en": "Anton Vasiliev"},
    "role": {"ru": "Python Backend Developer / Actuarial Science", "en": "Python Backend Developer / Actuarial Science"},
    "tagline": {
        "ru": "Партизан надевает корпортивное худи и выходит к людям",
        "en": "100 years of offers",
    },
    "location": {"ru": "Москва, Россия", "en": "Moscow, Russia"},
    "age": 21,
    "employment": {
        "ru": "Открыт к предложениям — remote-first команды",
        "en": "Open to offers — remote-first teams",
    },
    "format": {"ru": "Удалённо", "en": "Remote"},
    "contacts": {
        "email": "praim916@gmail.com",
        "telegram": "https://t.me/OlegGortsev",
        "telegram_handle": "@OlegGortsev",
        "github": "https://github.com/BlazeStudio",
        "linkedin": "https://www.linkedin.com/in/anton-vasiliev-developer",
        "hh": "https://hh.ru/resume/3753c2bcff0ea2b0390039ed1f576348314c68",
    },
    "languages": [
        {"name": {"ru": "Русский", "en": "Russian"}, "level": {"ru": "Родной", "en": "Native"}, "value": 100},
        {"name": {"ru": "Английский", "en": "English"}, "level": {"ru": "Средний", "en": "Intermediate"}, "value": 50},
    ],
    "certifications": [
        {"ru": "Python Engineering & Programming Policy", "en": "Python Engineering & Programming Policy"},
    ],
    "about": {
        "ru": [
            "5+ лет в Python backend и DevOps, в основном FinTech и InsurTech — актуарное моделирование, автоматизация пенсионных фондов, риск-отчётность.",
            "От и до: микросервисы, REST API, CI/CD, Docker, миграции PostgreSQL с legacy-систем.",
            "Remote-first по умолчанию. Свободное владение английским языком, особенно в письменной/технической коммуникации.",
        ],
        "en": [
            "5+ years in Python backend and DevOps, mostly FinTech and InsurTech — actuarial modeling, pension fund automation, risk reporting.",
            "End to end: microservices, REST APIs, CI/CD, Docker, PostgreSQL migrations off legacy systems.",
            "Remote-first by default. Working proficiency in English, stronger in written/technical communication",
        ],
    },
    "traits": [
        {"ru": "Не боюсь легаси", "en": "Not afraid of legacy code"},
        {"ru": "Самые красивые логи", "en": "The most beatiful logs"},
        {"ru": "Не кладу прод в пятницу", "en": "Don't shutdown prod on friday"},
        {"ru": "Люблю документацию и автотесты", "en": "Love docs and autotests"},
    ],
    "skills": {
        "backend": {
            "label": {"ru": "Backend", "en": "Backend"},
            "items": [
                {"name": "Python", "level": 95},
                {"name": "Django", "level": 92},
                {"name": "Django REST Framework", "level": 90},
                {"name": "FastAPI", "level": 85},
                {"name": "NumPy", "level": 78},
            ],
        },
        "data": {
            "label": {"ru": "Данные", "en": "Data"},
            "items": [
                {"name": "SQL", "level": 88},
                {"name": "PostgreSQL", "level": 88},
                {"name": "pandas", "level": 78},
                {"name": "Redis", "level": 75},
                {"name": "RAG", "level": 55},
            ],
        },
        "infra": {
            "label": {"ru": "Инфраструктура", "en": "Infrastructure"},
            "items": [
                {"name": "Docker", "level": 90},
                {"name": "Docker Compose", "level": 88},
                {"name": "CI/CD", "level": 85},
                {"name": "Cloud Deploys", "level": 80},
                {"name": "HTTPS", "level": 85},
            ],
        },
        "practice": {
            "label": {"ru": "Практики", "en": "Practices"},
            "items": [
                {"name": "Git", "level": 92},
                {"name": "Systems Management", "level": 80},
                {"name": "Web Development", "level": 85},
                {"name": "Agile", "level": 78},
            ],
        },
    },
    "experience": [
        {
            "period": {"ru": "Июнь 2024 — настоящее время", "en": "Jun 2024 — Present"},
            "duration": {"ru": "2 года 3 месяца", "en": "2 yr 3 mo"},
            "company": {"ru": "Ominimo (Будапешт, Венгрия)", "en": "Ominimo (Budapest, Hungary)"},
            "title": {"ru": "Middle Backend Developer", "en": "Middle Backend Developer"},
            "summary": {
                "ru": "Backend для актуарного моделирования и отчётности в европейском insurtech. Пенсионные и страховые продукты для институциональных клиентов.",
                "en": "Backend for actuarial modeling and reporting at a fast-growing European insurtech. Pension and insurance products for institutional clients.",
            },
            "highlight": {
                "ru": "Ключевые клиенты: Compensa Vienna Insurance Group, Magna Insurance, Balta Insurance.",
                "en": "Key clients: Compensa Vienna Insurance Group, Magna Insurance, Balta Insurance.",
            },
            "tasks": {
                "ru": [
                    "Python-микросервисы на Django для расчёта премий и резервов",
                    "REST API для внутренних дашбордов и интеграций",
                    "Миграция клиентских данных в PostgreSQL",
                    "Деплой в Docker-контейнерах",
                    "CI/CD пайплайны",
                    "Мониторинг продакшена",
                ],
                "en": [
                    "Python microservices in Django for premium & reserve calculations",
                    "REST APIs for internal dashboards and integrations",
                    "Migrated client data to PostgreSQL",
                    "Deployed in Docker containers",
                    "CI/CD pipelines",
                    "Production monitoring",
                ],
            },
            "tags": ["Python", "Django", "PostgreSQL", "Docker", "CI/CD"],
        },
        {
            "period": {"ru": "Март 2022 — Июнь 2024", "en": "Mar 2022 — Jun 2024"},
            "duration": {"ru": "2 года 4 месяца", "en": "2 yr 4 mo"},
            "company": {"ru": "RTL Consulting (бывш. SAS Enterprise)", "en": "RTL Consulting (ex. SAS Enterprise)"},
            "title": {"ru": "Python Backend Developer", "en": "Python Backend Developer"},
            "summary": {
                "ru": "Математические алгоритмы для пенсионных фондов, страховых компаний и банков. Актуарный модуль, отчётность, синхронизация с интерфейсом, деплой на стендах заказчика.",
                "en": "Mathematical algorithms for pension funds, insurers and banks. Owned the actuarial module and reporting, synced with the UI, deployed to client test environments.",
            },
            "highlight": {
                "ru": 'Реализовал PDS, OPS и NGO для: "Renaissance Insurance", "Blagosostoyanie", "Gazfond PN", "Alliance", "National", "Socium", "Rostec", "SberNPF", "Khanty-Mansiysky", "VTB".',
                "en": 'Implemented PDS, OPS and NGO for: "Renaissance Insurance", "Blagosostoyanie", "Gazfond PN", "Alliance", "National", "Socium", "Rostec", "SberNPF", "Khanty-Mansiysky", "VTB".',
            },
            "tasks": {
                "ru": [
                    "Масштабирование серверной инфраструктуры",
                    "Стратегии отказоустойчивости",
                    "Миграция данных из старых систем",
                    "Мониторинг производительности",
                    "CI/CD",
                    "Контейнеризация и распределённые системы",
                ],
                "en": [
                    "Scaling server infrastructure",
                    "Fault-tolerance strategies",
                    "Migrating data from legacy systems",
                    "Performance monitoring",
                    "CI/CD",
                    "Containerization & distributed systems",
                ],
            },
            "tags": ["Python", "SQL", "CI/CD", "Docker", "Data Migration"],
        },
        {
            "period": {"ru": "Сентябрь 2022 — Май 2024", "en": "Sep 2022 — May 2024"},
            "duration": {"ru": "1 год 9 месяцев", "en": "1 yr 9 mo"},
            "company": {"ru": "YA-Networks RU (Москва)", "en": "YA-Networks RU (Moscow)"},
            "title": {"ru": "FullStack Developer", "en": "FullStack Developer"},
            "summary": {
                "ru": "Django: сайт для поиска досуга в Москве с Yandex Maps API (февр. 2023 — май 2024). Flask: браузерный аналог pgAdmin/DBeaver для PostgreSQL и социальная сеть с Ajax-сообщениями (сент. — дек. 2022).",
                "en": "Django: a leisure-discovery site for Moscow with the Yandex Maps API (Feb 2023 – May 2024). Flask: a browser-based pgAdmin/DBeaver alternative for PostgreSQL, and a social network with Ajax messaging (Sep – Dec 2022).",
            },
            "highlight": {"ru": "Открытые проекты: Ritm Goroda, PostgreSQL Web GUI, Vostok Messenger", "en": "Public projects: Ritm Goroda, PostgreSQL Web GUI, Vostok Messenger"},
            "tasks": {"ru": [], "en": []},
            "tags": ["Python", "Django", "Flask", "PostgreSQL", "Ajax"],
        },
    ],
    "education": {
        "school": {"ru": "Moscow State University of Transport (MIIT)", "en": "Moscow State University of Transport (MIIT)"},
        "degree": {
            "ru": "Бакалавр, Computer and Information Sciences and Support Services",
            "en": "Bachelor's, Computer and Information Sciences and Support Services",
        },
        "year": "2022—2026",
        "city": {"ru": "Москва", "en": "Moscow"},
    },
}
