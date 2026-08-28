"""hh.ru-sourced résumé data. Selected when config.RESUME_SOURCE == "hh"."""

PROFILE = {
    "name": {"ru": "Васильев Антон", "en": "Anton Vasiliev"},
    "role": {"ru": "Python Backend Developer · Data Analyst", "en": "Python Backend Developer · Data Analyst"},
    "tagline": {
        "ru": "Партизан надевает корпортивное худи и выходит к людям",
        "en": "100 years of offers",
    },
    "location": {"ru": "Москва, Россия (готов к переезду в СПб)", "en": "Moscow, Russia (open to relocating to St. Petersburg)"},
    "age": 21,
    "employment": {
        "ru": "Открыт к предложениям — полная, частичная занятость, проекты, стажировки",
        "en": "Open to offers — full-time, part-time, project work, internships",
    },
    "format": {"ru": "На месте / удалённо / гибрид", "en": "On-site / remote / hybrid"},
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
            "3+ года коммерческой разработки на Python, из них 2+ года — в FinTech/InsurTech. Глубоко погружён в data-инженерию (Pandas/Polars) и инфраструктуру (Docker/K8s). Понимаю бизнес-логику финансовых продуктов и умею переводить требования заказчиков в технические решения.",
            "В свободное время изучаю LLM и RAG-приложения, создание AI-агентов — вижу в этом большой потенциал для автоматизации бизнес-процессов. Пишу документацию и тесты, прод по пятницам не роняю.",
            "Закончил РУТ (МИИТ) по управлению информационными процессами.",
        ],
        "en": [
            "3+ years of commercial Python development, 2+ of them in FinTech/InsurTech. Deep in data engineering (Pandas/Polars) and infrastructure (Docker/K8s). I understand the business logic behind financial products and translate client requirements into technical solutions.",
            "Off the clock: exploring LLMs, RAG apps, and building AI agents — I see real potential there for automating business processes. Docs and tests aren't a checkbox, and prod doesn't go down on Fridays.",
            "Graduated from Russian University of Transport (RUT MIIT) with a degree in information process management.",
        ],
    },
    "traits": [
        {"ru": "Не боюсь легаси", "en": "Not afraid of legacy code"},
        {"ru": "Самые красивые логи", "en": "The most beautiful logs"},
        {"ru": "Не кладу прод в пятницу", "en": "Don't take prod down on Fridays"},
        {"ru": "Люблю документацию и автотесты", "en": "Loves docs and autotests"},
        {"ru": "Изучаю LLM/RAG", "en": "Learning LLM/RAG"},
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
                {"name": "Asyncio", "level": 80},
            ],
        },
        "data": {
            "label": {"ru": "Данные", "en": "Data"},
            "items": [
                {"name": "SQL", "level": 88},
                {"name": "PostgreSQL", "level": 85},
                {"name": "ETL", "level": 82},
                {"name": "Query Optimization", "level": 80},
                {"name": "pandas", "level": 80},
                {"name": "NumPy", "level": 75},
                {"name": "Polars", "level": 65},
                {"name": "Redis", "level": 78},
            ],
        },
        "infra": {
            "label": {"ru": "Инфраструктура", "en": "Infrastructure"},
            "items": [
                {"name": "Docker", "level": 85},
                {"name": "Docker Compose", "level": 85},
                {"name": "Kubernetes", "level": 75},
                {"name": "Kafka", "level": 75},
                {"name": "Celery", "level": 85},
                {"name": "GitLab CI", "level": 78},
                {"name": "CI/CD", "level": 78},
                {"name": "Prometheus", "level": 70},
                {"name": "Linux / Bash / SSH", "level": 82},
            ],
        },
        "practice": {
            "label": {"ru": "Практики", "en": "Practices"},
            "items": [
                {"name": "Git", "level": 92},
                {"name": "Pytest", "level": 78},
                {"name": "Integration Testing", "level": 75},
                {"name": "Agile", "level": 80},
                {"name": "Jira", "level": 75},
                {"name": "ML basics", "level": 55},
                {"name": "RAG", "level": 55},
                {"name": "LLM", "level": 60},
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
                "ru": "Разрабатывал высоконагруженную микросервисную систему на Django, Celery и PostgreSQL для актуарных расчётов НПФ, страховых компаний и банков. Реализовал продукты ПДС, ОПС и НПО для 10+ крупнейших клиентов, включая СберНПФ, ВТБ, Газфонд ПН, Благосостояние и Ренессанс страхование.",
                "en": "Built a high-load microservice system on Django, Celery and PostgreSQL for actuarial calculations at pension funds, insurers and banks. Delivered pension-program modules (ПДС/ОПС/НПО) for 10+ major clients, including SberNPF, VTB, Gazfond PN, Blagosostoyanie and Renaissance Insurance.",
            },
            "highlight": {
                "ru": "Система обрабатывает расчёты для 10+ крупнейших финансовых институтов России с суммарным объёмом пенсионных накоплений свыше 1 трлн рублей.",
                "en": "The system processes calculations for 10+ of Russia's largest financial institutions, covering pension assets worth over ₽1 trillion combined.",
            },
            "tasks": {
                "ru": [
                    {
                        "category": "Data & Analytics",
                        "items": [
                            "ETL-пайплайн на Pandas/Polars для актуарных расчётов — до 2 млн записей за цикл, время обработки снижено на 73% за счёт оптимизации памяти",
                            "Модуль аналитической отчётности с агрегацией метрик по портфелям — доходность, риски, распределение активов",
                            "Анализ и трансформация исторических данных (до 15 лет) при подключении новых клиентов, скрипты на Pandas для валидации и очистки",
                            "Оптимизация 15+ критических SQL-запросов (индексация, оконные функции) — генерация сложных отчётов ускорена ~в 4 раза",
                        ],
                    },
                    {
                        "category": "Backend & Architecture",
                        "items": [
                            "Асинхронная система очередей на Celery + Redis для тяжёлых расчётов — пропускная способность выросла в 3 раза",
                            "Сервис-ориентированная архитектура: актуарный модуль и модуль отчётности вынесены в отдельные микросервисы, синхронизация через REST API и Kafka",
                            "Интеграция с внешним интерфейсом и смежными модулями, обработка событий в реальном времени",
                        ],
                    },
                    {
                        "category": "DevOps & Reliability",
                        "items": [
                            "CI/CD пайплайн (GitLab CI, Pytest, линтеры, деплой в Kubernetes) — релиз с 2 часов до 20 минут, ошибок при выкатке на 80% меньше",
                            "Централизованное логирование и трейсинг (ELK Stack + OpenTelemetry) — детекция инцидентов в проде ускорена на 40%",
                            "Алертинг, healthchecks и автовосстановление для финансово-чувствительных расчётов",
                            "Автоматизация деплоя на стендах заказчика через Docker Compose и Ansible",
                        ],
                    },
                    {
                        "category": "Business Analysis",
                        "items": [
                            "Сбор и формализация требований от бизнес-заказчиков, перевод бизнес-потребностей в технические задачи",
                            "Демонстрации функционала заказчикам, сбор обратной связи и приоритизация разработки",
                        ],
                    },
                ],
                "en": [
                    {
                        "category": "Data & Analytics",
                        "items": [
                            "Pandas/Polars ETL pipeline for actuarial calculations — up to 2M records per cycle, processing time cut by 73% via memory optimization",
                            "Analytics reporting module aggregating key portfolio metrics — returns, risk, asset allocation",
                            "Analyzed and transformed up to 15 years of historical data during client onboarding, wrote Pandas scripts for validation and cleanup",
                            "Optimized 15+ critical SQL queries (indexing, window functions) — complex report generation sped up ~4x",
                        ],
                    },
                    {
                        "category": "Backend & Architecture",
                        "items": [
                            "Async task-queue system on Celery + Redis for heavy calculations — throughput up 3x via horizontal worker scaling",
                            "Service-oriented architecture: split the actuarial and reporting modules into separate microservices, synced via REST API and Kafka",
                            "Integrated with the external UI and adjacent modules, handling real-time event processing",
                        ],
                    },
                    {
                        "category": "DevOps & Reliability",
                        "items": [
                            "CI/CD pipeline (GitLab CI, Pytest, linters, Kubernetes deploys) — release time down from 2 hours to 20 minutes, rollout errors down 80%",
                            "Centralized logging and tracing (ELK Stack + OpenTelemetry) — incident detection in prod sped up 40%",
                            "Alerting, healthchecks and auto-recovery for financially sensitive calculations",
                            "Automated client-environment deploys with Docker Compose and Ansible",
                        ],
                    },
                    {
                        "category": "Business Analysis",
                        "items": [
                            "Gathered and formalized requirements from business stakeholders, translated business needs into engineering tasks",
                            "Ran functionality demos for clients, collected feedback, and prioritized the roadmap",
                        ],
                    },
                ],
            },
            "tags": ["Python", "Django", "Celery", "PostgreSQL", "Kubernetes", "Kafka", "Polars", "Pandas", "Numpy", "Gitlab CI/CD"],
        },
        {
            "period": {"ru": "Сентябрь 2023 — Май 2024", "en": "Sep 2023 — May 2024"},
            "duration": {"ru": "9 месяцев", "en": "9 mo"},
            "company": {"ru": "Веб-студия «Фрилансер» (Краснодар)", "en": "Freelance web studio (Krasnodar)"},
            "title": {"ru": "Fullstack Developer", "en": "Fullstack Developer"},
            "summary": {
                "ru": "",
                "en": "",
            },
            "highlight": {"ru": "Открытые проекты: Ritm Goroda, PostgreSQL Web GUI, Vostok Messenger", "en": "Public projects: Ritm Goroda, PostgreSQL Web GUI, Vostok Messenger"},
            "tasks": {"ru": [
                    {
                        "category": "Django (февраль — май 2024)",
                        "items": [
                            "Веб-сервис для поиска досуга в Москве с Yandex Maps API — динамическое добавление событий, графическая статистика посещений/оценок/закладок",
                            "Админ-панель для управления событиями и модерации"
                        ],
                    },
                    {
                        "category": "Flask (сентябрь — декабрь 2023)",
                        "items": [
                            "Веб-инструмент для управления PostgreSQL (аналог pgAdmin/DBeaver) с GUI и SQL-консолью, поддержка нескольких БД одновременно; MVP социальной сети — регистрация, друзья, жалобы, обмен сообщениями в реальном времени на Ajax"
                        ],
                    },
            ], "en": [
                    {
                        "category": "Django (Feb – May 2024)",
                        "items": [
                            "A leisure-discovery web service for Moscow with the Yandex Maps API — dynamic event pins, per-event charts for visits/ratings/bookmarks",
                            "An admin panel for managing events and moderating content."
                        ],
                    },
                    {
                        "category": "Flask (Sep – Dec 2023)",
                        "items": [
                            "A PostgreSQL management tool (a pgAdmin/DBeaver alternative) with a GUI and SQL console, supporting multiple simultaneous DB connections; a social-network MVP — registration, friends, reports, real-time Ajax messaging"
                        ],
                    },
            ]},
            "tags": ["Python", "Django", "Flask", "PostgreSQL", "Ajax", "Gitlab CI/CD"],
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
