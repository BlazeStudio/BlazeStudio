"""hh.ru-sourced résumé data. Selected when config.RESUME_SOURCE == "hh"."""

PROFILE = {
    "name": {"ru": "Васильев Антон", "en": "Anton Vasiliev"},
    "role": {"ru": "Data / System Analyst", "en": "Data / System Analyst"},
    "tagline": {
        "ru": "Партизан надевает корпортивное худи и выходит к людям",
        "en": "100 years of offers",
    },
    "location": {"ru": "Москва, Россия (готов к переезду в СПб)", "en": "Moscow, Russia (open to relocating to St. Petersburg)"},
    "age": 22,
    "employment": {
        "ru": "Открыт к предложениям — полная, частичная занятость, проектная работа",
        "en": "Open to offers — full-time, part-time, project work",
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
        {"name": {"ru": "Английский", "en": "English"}, "level": {"ru": "C1 — Продвинутый", "en": "C1 — Advanced"}, "value": 85},
    ],
    "certifications": [
        {
            "ru": "«Инженерия и программирование на языке Python», МГТУ им. Н.Э. Баумана (2022)",
            "en": "“Python Engineering & Programming”, Bauman Moscow State Technical University (2022)",
        },
    ],
    "about": {
        "ru": [
            "Python-разработчик / Дата аналитик, 3+ года в финтехе. Делаю бэкенд платформы для НПФ и страховых: расчёты, ETL, отчётность. Люблю превращать ручную рутину в инструменты: CLI для релизов, локальные LLM, RAG-ассистенты по нормативке.",
            "В одиночку запустил и поддерживаю open-source проект, которым уже пользуются больше 100 человек. Ищу интересные проекты.",
        ],
        "en": [
            "Python developer / Data Analyst, 3+ years in fintech. I build the backend of a platform for pension funds and insurers: calculations, ETL, reporting. I like turning manual routine into tools: a release CLI, local LLMs, RAG assistants over regulations.",
            "On my own, I launched and maintain an open-source project that more than 100 people already use. Looking for interesting projects.",
        ],
    },
    "traits": [
        {"ru": "Не боюсь легаси", "en": "Not afraid of legacy code"},
        {"ru": "Самые красивые логи", "en": "The most beautiful logs"},
        {"ru": "Не кладу прод в пятницу", "en": "Don't take prod down on Fridays"},
        {"ru": "Люблю документацию и автотесты", "en": "Loves docs and autotests"},
        {"ru": "Строю RAG и AI-агентов", "en": "Building RAG and AI agents"},
    ],
    "skills": {
        "backend": {
            "label": {"ru": "Backend", "en": "Backend"},
            "items": [
                {"name": "Python", "level": 95},
                {"name": "FastAPI", "level": 85},
                {"name": "Pydantic", "level": 85},
                {"name": "Django", "level": 90},
                {"name": "Django REST Framework", "level": 88},
                {"name": "Flask", "level": 88},
                {"name": "Asyncio", "level": 80},
                {"name": "REST API", "level": 88},
            ],
        },
        "data": {
            "label": {"ru": "Данные", "en": "Data"},
            "items": [
                {"name": "SQL", "level": 88},
                {"name": "PostgreSQL", "level": 85},
                {"name": "ClickHouse", "level": 60},
                {"name": "DuckDB", "level": 70},
                {"name": "ETL", "level": 82},
                {"name": "Query Optimization", "level": 80},
                {"name": "pandas", "level": 80},
                {"name": "NumPy", "level": 75},
                {"name": "Polars", "level": 65},
                {"name": "Parquet / PyArrow", "level": 70},
                {"name": "Apache Airflow", "level": 60},
                {"name": "Power BI", "level": 70},
                {"name": "Data Analysis", "level": 75},
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
                {"name": "Ansible", "level": 70},
                {"name": "Linux / Bash / SSH", "level": 82},
            ],
        },
        "ai": {
            "label": {"ru": "LLM и AI", "en": "LLM & AI"},
            "items": [
                {"name": "LLM", "level": 60},
                {"name": "RAG", "level": 55},
                {"name": "vLLM", "level": 55},
                {"name": "Ollama", "level": 60},
                {"name": "Machine Learning", "level": 55},
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
            ],
        },
    },
    # start/end ("YYYY-MM", end None = still there) drive the total-experience
    # counter — see current_profile() in profile.py.
    "experience": [
        {
            "period": {"ru": "Июнь 2024 — настоящее время", "en": "Jun 2024 — Present"},
            "start": "2024-06",
            "end": None,
            "company": {"ru": "RTL Consulting (ex. SAS Enterprise)", "en": "RTL Consulting (ex. SAS Enterprise)"},
            "title": {"ru": "Middle Data / System Analyst", "en": "Middle Data / System Analyst"},
            "summary": {
                "ru": "Разрабатывал высоконагруженную расчётную платформу для НПФ, страховых компаний и банков: актуарные прогнозы денежных потоков, отчётность МСФО 17 и 836-П. Продукты ОПС, НПО и ПДС для 10+ крупных клиентов (СберНПФ, ВТБ, Газфонд ПН, Благосостояние, Ренессанс страхование).",
                "en": "Built a high-load calculation platform for pension funds, insurers and banks: actuarial cash-flow projections, IFRS 17 and 836-P reporting. Delivered pension and long-term savings products (ОПС, НПО, ПДС) for 10+ major clients (SberNPF, VTB, Gazfond PN, Blagosostoyanie, Renaissance Insurance).",
            },
            "highlight": {
                "ru": "Суммарный объём пенсионных накоплений в расчётах — свыше 1 трлн ₽.",
                "en": "Pension assets covered by the calculations total over ₽1 trillion.",
            },
            "tasks": {
                "ru": [
                    {
                        "category": "Анализ данных и отчётность",
                        "items": [
                            "Собирал и формализовывал требования от бизнес-заказчиков (пенсионные фонды и страховые), переводил их в аналитические задачи и технические спецификации для команды",
                            "Разработал модуль аналитической отчётности с агрегацией ключевых метрик по портфелям клиентов: доходность, риски, распределение активов, денежные потоки. Визуализация позволяла бизнесу принимать решения на актуальных данных",
                            "Переписал 15+ критичных SQL-запросов отчётности на оконные функции и индексы: сложные отчёты строятся в ~4 раза быстрее",
                            "Проводил анализ и трансформацию исторических данных (до 15 лет) при подключении новых клиентов. Разработал скрипты на Pandas для валидации, очистки и конвертации данных без потери целостности",
                            "Построил ETL-пайплайн на Polars и DuckDB до 2 млн записей за расчёт: время обработки сократилось на 73%, падений по памяти больше нет",
                            "Настроил аналитическое хранилище на ClickHouse для тяжёлых агрегатов и отчётов: быстрые выборки по большим объёмам данных без нагрузки на OLTP-базу",
                        ],
                    },
                    {
                        "category": "LLM и AI-автоматизация",
                        "items": [
                            "Развернул локальные LLM (Qwen, Llama) на vLLM и Ollama в закрытом контуре, чтобы данные клиентов не уходили во внешние API",
                            "RAG-ассистент по методологии и нормативке (836-П, МСФО 17) и документации проекта (~100 документов): ответ на типовой вопрос аналитика — секунды вместо поиска по документам и вопросов коллегам",
                            "Внедрил AI-ассистированную разработку в команде (Claude Code, Cursor, Codex): инструкции для агентов, 40+ навыков (ревью, сверка с эталоном, релиз), граф знаний кодовой базы и MCP-серверы. Сверка расчёта с эталоном сократилась с 2–3 дней до нескольких часов, вход нового разработчика — с месяца до недели",
                            "AI-агент разбора упавших расчётов: читает логи и статусы, сопоставляет с реестром ошибок и предлагает причину — первичный разбор инцидента быстрее в несколько раз",
                        ],
                    },
                    {
                        "category": "DevOps & Reliability",
                        "items": [
                            "Создал с нуля CLI сборки и поставки, через который команда выпускает все релизы: выпуск — 20 минут вместо рабочего дня",
                            "Настроил CI/CD в GitLab (тесты, линтеры, сборка образов): ошибок при выкатке стало меньше на 80%",
                            "Внедрил централизованное логирование и трейсинг (ELK Stack + OpenTelemetry) для мониторинга микросервисов. Сократил время детекции и анализа инцидентов в проде на 40%",
                            "Поддерживал стабильность систем с финансово-чувствительными расчётами: настроил алертинг, healthchecks и автоматическое восстановление при сбоях",
                        ],
                    },
                    {
                        "category": "BI-аналитика",
                        "items": [
                            "Дашборды Power BI по результатам расчётов: обязательства и денежные потоки по продуктам, доходность портфелей, отклонения от эталона. Модель данных, DAX, Power Query, подключение к PostgreSQL",
                            "Аналитическая отчётность вместо ручных Excel-сводок: подготовка пакета для руководства клиента сократилась с 2 дней до 3 часов",
                        ],
                    },
                    {
                        "category": "Backend & Architecture",
                        "items": [
                            "Разработал асинхронную систему очередей задач на Celery + Redis для распределённой обработки тяжёлых расчётов. Увеличил пропускную способность системы в 3 раза за счёт горизонтального масштабирования воркеров",
                            "Ввёл контроль состояния воркеров перед запуском расчёта: зависших и потерянных расчётов стало меньше на 90%",
                            "Участвовал в проектировании сервис-ориентированной архитектуры: выделил актуарный модуль и модуль отчётности в отдельные микросервисы, настроил их синхронизацию через REST API и Kafka",
                            "Интегрировал систему с внешним интерфейсом и смежными модулями, обеспечивая согласованность данных и обработку событий в реальном времени",
                        ],
                    },
                    {
                        "category": "Business Analysis",
                        "items": [
                            "Проводил демонстрации реализованного функционала заказчикам, собирал обратную связь и корректировал приоритеты разработки",
                        ],
                    },
                ],
                "en": [
                    {
                        "category": "Data Analysis & Reporting",
                        "items": [
                            "Gathered and formalized requirements from business stakeholders (pension funds and insurers), turning them into analytical tasks and technical specifications for the team",
                            "Built an analytics reporting module aggregating key metrics across client portfolios: returns, risk, asset allocation, cash flows. Its visualizations let the business decide on current data",
                            "Rewrote 15+ critical reporting SQL queries with window functions and indexes: complex reports build ~4x faster",
                            "Analyzed and transformed up to 15 years of historical data during client onboarding; wrote Pandas scripts for validation, cleanup and conversion with no loss of integrity",
                            "Built a Polars + DuckDB ETL pipeline handling up to 2M records per calculation: processing time down 73%, no more out-of-memory crashes",
                            "Set up a ClickHouse analytical store for heavy aggregates and reports: fast queries over large data volumes without loading the OLTP database",
                        ],
                    },
                    {
                        "category": "LLM & AI Automation",
                        "items": [
                            "Deployed local LLMs (Qwen, Llama) on vLLM and Ollama in a closed environment so client data never reaches external APIs",
                            "RAG assistant over methodology, regulations (836-P, IFRS 17) and project docs (~100 documents): answers an analyst's typical question in seconds instead of digging through documents and asking colleagues",
                            "Rolled out AI-assisted development across the team (Claude Code, Cursor, Codex): agent instructions, 40+ skills (review, reconciliation against the reference, release), a codebase knowledge graph and MCP servers. Reconciling a calculation against the reference went from 2–3 days to a few hours, onboarding a new developer from a month to a week",
                            "AI agent for triaging failed calculations: reads logs and statuses, matches them against an error registry and suggests a cause — initial incident triage is several times faster",
                        ],
                    },
                    {
                        "category": "DevOps & Reliability",
                        "items": [
                            "Built a build-and-delivery CLI from scratch that the team ships every release with: a release takes 20 minutes instead of a working day",
                            "Set up CI/CD in GitLab (tests, linters, image builds): rollout errors down 80%",
                            "Introduced centralized logging and tracing (ELK Stack + OpenTelemetry) for monitoring microservices — time to detect and analyze production incidents down 40%",
                            "Kept systems with financially sensitive calculations stable: set up alerting, healthchecks and automatic failure recovery",
                        ],
                    },
                    {
                        "category": "BI Analytics",
                        "items": [
                            "Power BI dashboards on calculation results: liabilities and cash flows by product, portfolio returns, deviations from the reference. Data model, DAX, Power Query, PostgreSQL connection",
                            "Analytical reporting replaced manual Excel summaries: preparing the package for a client's leadership went from 2 days to 3 hours",
                        ],
                    },
                    {
                        "category": "Backend & Architecture",
                        "items": [
                            "Built an async task-queue system on Celery + Redis for distributed processing of heavy calculations — throughput up 3x via horizontal worker scaling",
                            "Added worker health checks before each calculation run: hung and lost calculations down 90%",
                            "Contributed to the service-oriented architecture: split the actuarial and reporting modules into separate microservices, synced via REST API and Kafka",
                            "Integrated the system with the external UI and adjacent modules, ensuring data consistency and real-time event processing",
                        ],
                    },
                    {
                        "category": "Business Analysis",
                        "items": [
                            "Ran functionality demos for clients, collected feedback and adjusted development priorities",
                        ],
                    },
                ],
            },
            "tags": ["Python", "FastAPI", "Pydantic", "Celery", "Redis", "PostgreSQL", "DuckDB", "Polars", "pandas", "Parquet/PyArrow", "Docker", "Kubernetes", "GitLab CI", "Bash", "Linux", "pytest", "vLLM", "Ollama", "RAG", "Power BI"],
        },
        {
            "period": {"ru": "Август 2026 — Ноябрь 2026", "en": "Aug 2026 — Nov 2026"},
            "start": "2026-08",
            "end": "2026-11",
            "company": {"ru": "HH-Auto (Open Source)", "en": "HH-Auto (Open Source)"},
            "title": {"ru": "Lead Developer & Maintainer", "en": "Lead Developer & Maintainer"},
            # Same text as the hh.ru résumé.
            "summary": {
                "ru": "В одиночку запустил и поддерживаю open-source приложение для соискателей на hh.ru: от идеи и кода до сборок, релизов, сайта и поддержки пользователей. В данный момент им пользуются больше 100 человек. Приложение помогает с поиском, сравнивает резюме с рынком, ведёт статистику и анализ откликов, подбирает подходящие вакансии и навыки, которые нужно подтянуть.",
                "en": "On my own, I launched and maintain an open-source app for job seekers on hh.ru: from the idea and code to builds, releases, the website and user support. More than 100 people use it right now. The app helps with the job search, compares the résumé with the market, tracks and analyzes applications, and picks suitable vacancies and the skills worth brushing up.",
            },
            "highlight": {"ru": "", "en": ""},
            "tasks": {
                "ru": [
                    "LLM: письма, ответы на вопросы ботов и фильтр вакансий по описанию своими словами. Подключается к OpenRouter, DeepSeek или локальной Ollama. Ответ сверяется с резюме: если модель приписала технологию, которой там нет, ответ переписывается, а если не помогло, такие фразы вырезаются",
                    "Анализ резюме против открытых вакансий: каких навыков не хватает, сколько вакансий откроет каждый и сколько за него платят; воронка «запрос → приглашения и отказы»",
                    "Поставка: сборки под Windows, macOS, Linux и Docker через GitHub Actions; автообновление со сверкой контрольной суммы и откатом при сбое",
                    "Сайт проекта на Astro и Tailwind CSS: лендинг с интерактивным демо, страницы о безопасности и контактах, актуальная версия и ссылки на скачивание из GitHub API",
                    "Документация для людей без опыта в IT: установка, первый запуск, гайд по локальной LLM; changelog к каждому релизу",
                ],
                "en": [
                    "LLM: cover letters, answers to bots' questions and a vacancy filter driven by a plain-language description. Works with OpenRouter, DeepSeek or a local Ollama. Each answer is checked against the résumé: if the model claims a technology that isn't there, the answer is rewritten, and failing that, such sentences are cut",
                    "Résumé analysis against open vacancies: which skills are missing, how many vacancies each would open and what it pays; a funnel from search query to invitations and rejections",
                    "Delivery: builds for Windows, macOS, Linux and Docker via GitHub Actions; self-update with checksum verification and rollback on failure",
                    "Project website on Astro and Tailwind CSS: a landing page with an interactive demo, safety and contacts pages, the current version and download links from the GitHub API",
                    "Docs for people with no IT background: installation, first run, a local-LLM guide; a changelog for every release",
                ],
            },
            "tags": ["Python", "Playwright", "OpenRouter / DeepSeek / Ollama", "CustomTkinter", "PyInstaller", "Docker", "GitHub Actions", "Astro", "Tailwind CSS"],
        },
        {
            "period": {"ru": "Сентябрь 2023 — Май 2024", "en": "Sep 2023 — May 2024"},
            "start": "2023-09",
            "end": "2024-05",
            "company": {"ru": "Веб-студия «Фрилансер» (Краснодар)", "en": "Freelance web studio (Krasnodar)"},
            "title": {"ru": "Fullstack Developer", "en": "Fullstack Developer"},
            "summary": {
                "ru": "",
                "en": "",
            },
            "highlight": {"ru": "Открытые проекты: Ritm Goroda, PostgreSQL Web GUI, Vostok Messenger", "en": "Public projects: Ritm Goroda, PostgreSQL Web GUI, Vostok Messenger"},
            "tasks": {"ru": [
                    {
                        "category": "Django Fullstack Developer (февраль — май 2024)",
                        "items": [
                            "Разработал веб-сервис для поиска досуга в Москве с интеграцией Yandex Maps API: динамическое добавление событий на карту, графическая статистика посещений, оценок и закладок",
                            "Реализовал админ-панель для управления событиями и модерации контента",
                        ],
                    },
                    {
                        "category": "Flask Fullstack Developer (сентябрь — декабрь 2023)",
                        "items": [
                            "Создал веб-инструмент для управления PostgreSQL — аналог pgAdmin/DBeaver с GUI для SQL-запросов и отдельной консолью. Поддерживал подключение к нескольким базам данных одновременно",
                            "Разработал MVP социальной сети: регистрация, система друзей, жалобы администрации, обмен сообщениями в реальном времени (Ajax)",
                        ],
                    },
            ], "en": [
                    {
                        "category": "Django Fullstack Developer (Feb – May 2024)",
                        "items": [
                            "Built a leisure-discovery web service for Moscow with the Yandex Maps API: dynamic event pins on the map, charts for visits, ratings and bookmarks",
                            "Implemented an admin panel for managing events and moderating content",
                        ],
                    },
                    {
                        "category": "Flask Fullstack Developer (Sep – Dec 2023)",
                        "items": [
                            "Created a PostgreSQL management tool — a pgAdmin/DBeaver alternative with a GUI for SQL queries and a separate console, supporting several simultaneous database connections",
                            "Built a social-network MVP: registration, friends, reports to admins, real-time messaging (Ajax)",
                        ],
                    },
            ]},
            "tags": ["Python", "Django", "Flask", "Psycopg", "PostgreSQL", "SQLite", "JavaScript", "HTML/CSS", "Ajax"],
        },
    ],
    "education": {
        "school": {"ru": "Российский университет транспорта (МИИТ)", "en": "Russian University of Transport (RUT MIIT)"},
        "degree": {
            "ru": "Цифровые технологии управления транспортными процессами / Управление информационными процессами на транспорте",
            "en": "Digital technologies for transport process management / Information process management in transport",
        },
        "year": "2027",
        "city": {"ru": "Москва", "en": "Moscow"},
    },
}
