"""hh.ru-sourced résumé data. Selected when config.RESUME_SOURCE == "hh"."""

PROFILE = {
    "name": {"ru": "Васильев Антон", "en": "Anton Vasiliev"},
    "role": {"ru": "AI/LLM-инженер · Python Backend (AI)", "en": "AI/LLM Engineer · Python Backend (AI)"},
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
    "format": {"ru": "Удалённо / гибрид / на месте", "en": "Remote / hybrid / on-site"},
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
            "AI/LLM-инженер с 3+ годами в финтехе. Строю прикладные LLM-системы в закрытом контуре: RAG по нормативке, локальный инференс (vLLM, Ollama), AI-агенты для разработки и разбора инцидентов.",
            "В одиночку запустил и поддерживаю open-source проект, которым уже пользуются больше 100 человек. Ищу интересные проекты.",
        ],
        "en": [
            "AI/LLM engineer with 3+ years in fintech. I build applied LLM systems inside closed environments: RAG over regulations, local inference (vLLM, Ollama), AI agents for development and incident triage.",
            "On my own, I launched and maintain an open-source project that more than 100 people already use. Looking for interesting projects.",
        ],
    },
    "traits": [
        {"ru": "Строю RAG и AI-агентов", "en": "Building RAG and AI agents"},
        {"ru": "Не боюсь легаси", "en": "Not afraid of legacy code"},
        {"ru": "Самые красивые логи", "en": "The most beautiful logs"},
        {"ru": "Не кладу прод в пятницу", "en": "Don't take prod down on Fridays"},
        {"ru": "Люблю документацию и автотесты", "en": "Loves docs and autotests"},
    ],
    "skills": {
        "ai": {
            "label": {"ru": "LLM и AI", "en": "LLM & AI"},
            "items": [
                {"name": "LLM", "level": 85},
                {"name": "RAG", "level": 85},
                {"name": "AI Agents / MCP", "level": 80},
                {"name": "Ollama", "level": 80},
                {"name": "vLLM", "level": 75},
                {"name": "Embeddings", "level": 75},
                {"name": "Machine Learning", "level": 65},
                {"name": "scikit-learn", "level": 60},
            ],
        },
        "backend": {
            "label": {"ru": "Backend", "en": "Backend"},
            "items": [
                {"name": "Python", "level": 95},
                {"name": "FastAPI", "level": 85},
                {"name": "Pydantic", "level": 85},
                {"name": "Asyncio", "level": 80},
                {"name": "REST API", "level": 88},
                {"name": "Django", "level": 85},
                {"name": "Django REST Framework", "level": 82},
                {"name": "Flask", "level": 82},
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
                {"name": "pandas", "level": 82},
                {"name": "NumPy", "level": 75},
                {"name": "Polars", "level": 70},
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
                {"name": "Kubernetes", "level": 75},
                {"name": "Kafka", "level": 75},
                {"name": "Celery", "level": 85},
                {"name": "GitLab CI", "level": 80},
                {"name": "CI/CD", "level": 80},
                {"name": "Prometheus", "level": 70},
                {"name": "Grafana", "level": 70},
                {"name": "ELK / OpenTelemetry", "level": 65},
                {"name": "Ansible", "level": 65},
                {"name": "Linux / Bash", "level": 82},
            ],
        },
        "practice": {
            "label": {"ru": "Практики", "en": "Practices"},
            "items": [
                {"name": "Git", "level": 92},
                {"name": "Pytest", "level": 78},
                {"name": "DevOps", "level": 75},
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
            "title": {"ru": "Python-разработчик / ML-инженер (LLM)", "en": "Python Developer / ML Engineer (LLM)"},
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
                        "category": "LLM и AI-автоматизация",
                        "items": [
                            "Развернул локальные LLM (Qwen, Llama) на vLLM и Ollama в закрытом контуре, чтобы данные клиентов не уходили во внешние API",
                            "RAG-ассистент по методологии и нормативке (836-П, МСФО 17) и документации проекта (~100 документов): ответ на типовой вопрос аналитика — секунды вместо поиска по документам и вопросов коллегам",
                            "Внедрил AI-ассистированную разработку в команде (Claude Code, Cursor, Codex): инструкции для агентов, 40+ навыков (ревью, сверка с эталоном, релиз), граф знаний кодовой базы и MCP-серверы. Сверка расчёта с эталоном сократилась с 2–3 дней до нескольких часов, вход нового разработчика — с месяца до недели",
                            "AI-агент разбора упавших расчётов: читает логи и статусы, сопоставляет с реестром ошибок и предлагает причину — первичный разбор инцидента быстрее в несколько раз",
                        ],
                    },
                    {
                        "category": "Data & Analytics",
                        "items": [
                            "Построил ETL-пайплайн на Polars и DuckDB до 2 млн записей за расчёт: время обработки −73%, падений по памяти больше нет",
                            "Разработал модуль аналитической отчётности с агрегацией ключевых метрик по портфелям клиентов. Визуализация данных позволяла бизнес-заказчикам принимать решения на основе актуальных показателей (доходность, риски, распределение активов)",
                            "Проводил анализ и трансформацию исторических данных (до 15 лет) при подключении новых клиентов. Разработал скрипты на Pandas для валидации, очистки и конвертации данных без потери целостности",
                            "Переписал 15+ критичных SQL-запросов отчётности на оконные функции и индексы: сложные отчёты строятся в ~4 раза быстрее",
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
                        "category": "Business Analysis",
                        "items": [
                            "Участвовал в сборе и формализации требований от бизнес-заказчиков (пенсионные фонды и страховые компании). Переводил бизнес-потребности в технические задачи для команды разработки",
                            "Проводил демонстрации реализованного функционала заказчикам, собирал обратную связь и корректировал приоритеты разработки",
                        ],
                    },
                ],
                "en": [
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
                        "category": "Data & Analytics",
                        "items": [
                            "Built a Polars + DuckDB ETL pipeline handling up to 2M records per calculation: processing time down 73%, no more out-of-memory crashes",
                            "Built an analytics reporting module aggregating key metrics across client portfolios. Its visualizations let business stakeholders decide on current figures (returns, risk, asset allocation)",
                            "Analyzed and transformed up to 15 years of historical data during client onboarding; wrote Pandas scripts for validation, cleanup and conversion with no loss of integrity",
                            "Rewrote 15+ critical reporting SQL queries with window functions and indexes: complex reports build ~4x faster",
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
                        "category": "Business Analysis",
                        "items": [
                            "Gathered and formalized requirements from business stakeholders (pension funds and insurers), turning business needs into technical tasks for the development team",
                            "Ran functionality demos for clients, collected feedback and adjusted development priorities",
                        ],
                    },
                ],
            },
            "tags": ["Python", "FastAPI", "Pydantic", "Celery", "Redis", "PostgreSQL", "DuckDB", "Polars", "pandas", "Parquet/PyArrow", "Docker", "Kubernetes", "GitLab CI", "Bash", "Linux", "pytest", "vLLM", "Ollama", "RAG", "Power BI"],
        },
        {
            "period": {"ru": "Март 2023 — Июнь 2024", "en": "Mar 2023 — Jun 2024"},
            "start": "2023-03",
            "end": "2024-06",
            "company": {"ru": "ARQA Technologies (Новосибирск)", "en": "ARQA Technologies (Novosibirsk)"},
            "title": {"ru": "Python Developer / ML Engineer (Data / LLM)", "en": "Python Developer / ML Engineer (Data / LLM)"},
            "summary": {
                "ru": "Работал в команде аналитической инфраструктуры продуктов QUIK и QORT (торговые и бэк-офисные системы для брокеров и банков). Готовил данные для внутренней отчётности и прогнозирования нагрузки, участвовал в создании прототипа LLM-ассистента по документации для поддержки и внедрения.",
                "en": "Worked on the analytics infrastructure team for QUIK and QORT (trading and back-office systems for brokers and banks). Prepared data for internal reporting and load forecasting, and helped build a prototype LLM assistant over the documentation for support and implementation teams.",
            },
            "highlight": {"ru": "", "en": ""},
            "tasks": {
                "ru": [
                    "Писал пайплайн подготовки данных о клиентской нагрузке на pandas и SQL: очистка, валидация, обогащение. Датасеты для прогноза пиковых периодов стали собираться автоматически, а не вручную, примерно на 40% быстрее",
                    "Сделал отчёт по использованию продуктов (подключения, активность, объёмы операций) с дашбордами в Power BI для внутренних заказчиков",
                    "В составе команды из 2–3 человек собрал прототип RAG-ассистента по технической документации QUIK/QORT и базе знаний поддержки. На мне были подготовка и чанкинг документов, эмбеддинги, поиск релевантных фрагментов и оценка качества ответов на наборе типовых вопросов",
                    "Настроил проверки качества входящих выгрузок и уведомления об аномалиях: пропуски, дубли, выбросы по объёмам",
                ],
                "en": [
                    "Wrote a pandas + SQL pipeline preparing client-load data: cleanup, validation, enrichment. Datasets for forecasting peak periods are now built automatically instead of by hand, about 40% faster",
                    "Built a product-usage report (connections, activity, transaction volumes) with Power BI dashboards for internal stakeholders",
                    "In a team of 2–3, built a prototype RAG assistant over the QUIK/QORT technical documentation and the support knowledge base. I owned document preparation and chunking, embeddings, retrieval of relevant passages and answer-quality evaluation on a set of typical questions",
                    "Set up quality checks on incoming data exports and anomaly alerts: gaps, duplicates, volume outliers",
                ],
            },
            "tags": ["Python", "pandas", "NumPy", "SQL", "PostgreSQL", "scikit-learn", "RAG", "Embeddings", "Power BI", "Docker", "GitLab CI"],
        },
        {
            "period": {"ru": "Октябрь 2022 — Март 2023", "en": "Oct 2022 — Mar 2023"},
            "start": "2022-10",
            "end": "2023-03",
            "company": {"ru": "Смартекссофт (Москва)", "en": "Smartexsoft (Moscow)"},
            "title": {"ru": "Junior Python Developer", "en": "Junior Python Developer"},
            "summary": {
                "ru": "Разрабатывал внутренние и клиентские сервисы для банковских проектов: модуль скоринга, инструмент аналитика для работы с PostgreSQL, MVP клиентского портала.",
                "en": "Built internal and client-facing services for banking projects: a scoring module, an analyst tool for working with PostgreSQL, a client portal MVP.",
            },
            "highlight": {"ru": "", "en": ""},
            "tasks": {
                "ru": [
                    "Разработал модуль скоринга для оценки платёжеспособности клиентов: подготовка признаков, валидация входных данных и обработка ошибок",
                    "Создал внутренний инструмент аналитика для работы с PostgreSQL — GUI для SQL-запросов и отдельная консоль; поддерживал подключение к нескольким базам данных одновременно",
                    "Реализовал MVP клиентского портала: регистрация, личный кабинет, история операций, обмен сообщениями с поддержкой в реальном времени (Ajax)",
                    "Автоматизировал сбор и анализ обратной связи клиентов: классификация обращений и жалоб, формирование сводок для поддержки",
                ],
                "en": [
                    "Built a scoring module for assessing client creditworthiness: feature preparation, input validation and error handling",
                    "Created an internal analyst tool for PostgreSQL — a GUI for SQL queries plus a separate console, supporting several simultaneous database connections",
                    "Implemented a client portal MVP: registration, personal account, transaction history, real-time messaging with support (Ajax)",
                    "Automated collection and analysis of client feedback: classifying requests and complaints, building summaries for support",
                ],
            },
            "tags": ["Python", "Django", "Flask", "JavaScript", "HTML/CSS", "SQLite", "PostgreSQL", "Psycopg", "Docker", "Git"],
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
