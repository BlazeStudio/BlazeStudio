'use strict';

(function () {
  const PROFILE = window.XP.data.profile;
  const CATEGORIES = window.XP.data.categories;
  const STATIC_PROJECTS = window.XP.data.projects;
  const CATEGORY_ICON = { web: '🌐', tools: '🛠️', security: '🔐', games: '🎮', practice: '📘' };

  let liveProjects = STATIC_PROJECTS.map((p) => ({ ...p, live: { synced: false } }));
  let activeCat = 'all';
  let activeGame = null;

  function t(ru, en) {
    return window.XP.t(ru, en);
  }

  /* ---------- theme ---------- */
  function detectTheme() {
    const saved = localStorage.getItem('av-classic-theme');
    if (saved) return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'day';
    return 'night'; // unclear system preference → dark by default
  }
  function applyTheme() {
    const theme = detectTheme();
    document.getElementById('classic').dataset.theme = theme;
    const btn = document.getElementById('c-theme-btn');
    if (btn) btn.textContent = theme === 'day' ? '☀️' : '🌙';
  }
  function toggleTheme() {
    const cur = document.getElementById('classic').dataset.theme;
    localStorage.setItem('av-classic-theme', cur === 'day' ? 'night' : 'day');
    applyTheme();
  }

  /* ---------- sections ---------- */
  function renderHero() {
    const lang = window.XP.lang();
    document.getElementById('c-brand-name').textContent = PROFILE.name[lang];
    document.getElementById('c-brand-role').textContent = PROFILE.role[lang];
    document.getElementById('c-pdf').href = `/dossier?lang=${lang}`;

    document.getElementById('c-hero').innerHTML = `
      <svg class="c-motif" viewBox="0 0 100 80" aria-hidden="true">
        <path d="M62 14 A22 22 0 1 0 62 64 A17 17 0 1 1 62 14 Z" style="fill:none;stroke:currentColor;stroke-width:2.2;stroke-linejoin:round"/>
        <path d="M18 18 L21 25 L28 28 L21 31 L18 38 L15 31 L8 28 L15 25 Z" style="fill:currentColor;opacity:0.7"/>
        <circle cx="10" cy="54" r="2.4" style="fill:currentColor;opacity:0.5"/>
      </svg>
      <svg class="c-seal" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="42" style="fill:none;stroke:var(--cb-accent);stroke-width:5"/>
        <text x="50" y="45" text-anchor="middle" style="font-family:var(--font-display);font-size:25px;font-weight:700;fill:var(--cb-accent)">А</text>
        <text x="50" y="74" text-anchor="middle" style="font-family:var(--font-display);font-size:25px;font-weight:700;fill:var(--cb-accent)">В</text>
      </svg>
      <div class="c-hero-kicker">${t('РЕЗЮМЕ · ОБЫЧНАЯ ВЕРСИЯ', 'RÉSUMÉ · PLAIN VERSION')}</div>
      <h1 class="c-hero-title">${PROFILE.name[lang]} <mark>${PROFILE.role[lang]}</mark></h1>
      <p class="c-hero-tagline">${PROFILE.tagline[lang]}</p>
      <div class="c-hero-cta">
        <a class="c-btn c-btn-accent" href="/dossier?lang=${lang}" target="_blank">📄 ${t('Скачать PDF', 'Download PDF')}</a>
        <a class="c-btn" href="#c-contact-section">✉️ ${t('Связаться', 'Get in touch')}</a>
      </div>
      <div class="c-hero-stats">
        <div class="c-stat"><div class="k">${t('Локация', 'Location')}</div><div class="v">${PROFILE.location[lang]}</div></div>
        <div class="c-stat"><div class="k">${t('Формат', 'Format')}</div><div class="v">${PROFILE.format[lang]}</div></div>
        <div class="c-stat"><div class="k">${t('Занятость', 'Employment')}</div><div class="v">${PROFILE.employment[lang]}</div></div>
      </div>
    `;
  }

  function renderAbout() {
    const lang = window.XP.lang();
    document.getElementById('c-about-section').innerHTML = `
      <div class="c-section-title">${t('О себе', 'About')}</div>
      <div class="c-card c-about">
        ${PROFILE.about[lang].map((p) => `<p>${p}</p>`).join('')}
        <div class="c-chips">${PROFILE.traits.map((tr) => `<span class="c-chip">${tr[lang]}</span>`).join('')}</div>
        <div class="c-lang-bars">
          ${PROFILE.languages
            .map(
              (l) => `<div class="c-lang-row">
                <div class="lbl">${l.name[lang]}<small>${l.level[lang]}</small></div>
                <div class="c-track"><div class="c-fill" data-v="${l.value}"></div></div>
              </div>`
            )
            .join('')}
        </div>
      </div>
    `;
    animateFills(document.getElementById('c-about-section'));
  }

  function renderSkills() {
    const lang = window.XP.lang();
    const icons = { backend: '⚙️', data: '📊', infra: '🧱', practice: '✅' };
    document.getElementById('c-skills-section').innerHTML = `
      <div class="c-section-title">${t('Стек', 'Stack')}</div>
      <div class="c-section-sub">${t('Проценты — самооценка, не сертификат', 'Percentages are self-rated, not certified')}</div>
      <div class="c-skills-grid">
        ${Object.entries(PROFILE.skills)
          .map(
            ([key, group]) => `<div class="c-card c-skill-card">
              <h3>${icons[key] || '▸'} ${group.label[lang]}</h3>
              ${group.items
                .map(
                  (item) => `<div class="c-skill-row">
                    <div class="top"><span>${item.name}</span><span>${item.level}%</span></div>
                    <div class="c-track"><div class="c-fill" data-v="${item.level}"></div></div>
                  </div>`
                )
                .join('')}
            </div>`
          )
          .join('')}
      </div>
    `;
    animateFills(document.getElementById('c-skills-section'));
  }

  function renderExperience() {
    const lang = window.XP.lang();
    const edu = PROFILE.education;
    document.getElementById('c-experience-section').innerHTML = `
      <div class="c-section-title">${t('Опыт и образование', 'Experience & education')}</div>
      <div class="c-timeline">
        ${PROFILE.experience
          .map(
            (job) => `<div class="c-card">
              <div class="c-job-head"><span class="c-job-title">${job.title[lang]}</span><span class="c-job-company">— ${job.company[lang]}</span><span class="c-job-period">${job.period[lang]}</span></div>
              <p class="c-job-summary">${job.summary[lang]}</p>
              ${job.highlight[lang] ? `<p class="c-job-highlight">◆ ${job.highlight[lang]}</p>` : ''}
              ${job.tasks[lang] && job.tasks[lang].length ? `<ul class="c-job-tasks">${job.tasks[lang].map((tk) => `<li>${tk}</li>`).join('')}</ul>` : ''}
              <div class="c-tags">${job.tags.map((tg) => `<span class="c-tag">${tg}</span>`).join('')}</div>
            </div>`
          )
          .join('')}
        <div class="c-card c-edu">
          <div class="c-job-head"><span class="c-job-title">${edu.school[lang]}</span><span class="c-job-period">${edu.year}</span></div>
          <p class="c-job-summary">${edu.degree[lang]}</p>
        </div>
      </div>
    `;
  }

  function renderProjectsSection() {
    document.getElementById('c-projects-section').innerHTML = `
      <div class="c-section-title">${t('Проекты', 'Projects')}</div>
      <div class="c-sync" id="c-sync"><span class="dot"></span><span id="c-sync-text">${t('Синхронизация с GitHub…', 'Syncing with GitHub…')}</span></div>
      <div class="c-filters" id="c-filters"></div>
      <div class="c-projects-grid" id="c-projects-grid"></div>
    `;
    paintFilters();
    paintProjectsGrid();
  }

  function paintFilters() {
    const lang = window.XP.lang();
    const el = document.getElementById('c-filters');
    el.innerHTML = CATEGORIES.map((c) => `<button class="c-filter${c.id === activeCat ? ' active' : ''}" data-cat="${c.id}">${c.label[lang]}</button>`).join('');
    el.querySelectorAll('.c-filter').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeCat = btn.dataset.cat;
        paintFilters();
        paintProjectsGrid();
      });
    });
  }

  function paintProjectsGrid() {
    const lang = window.XP.lang();
    const grid = document.getElementById('c-projects-grid');
    if (!grid) return;
    const list = liveProjects.filter((p) => activeCat === 'all' || p.category === activeCat);
    grid.innerHTML = list
      .map((p) => {
        const stars = p.live && p.live.synced ? `★ ${p.live.stars}` : '';
        const homepageLabel = p.homepage_label ? p.homepage_label[lang] : t('Демо', 'Demo');
        return `<article class="c-card c-project-card">
          <div class="c-project-top"><h3>${CATEGORY_ICON[p.category] || '📦'} ${p.name}</h3>${stars ? `<span class="c-project-stars">${stars}</span>` : ''}</div>
          <div class="c-project-role">${p.role[lang]}</div>
          <p class="c-project-desc">${p.description[lang]}</p>
          ${p.note ? `<div class="c-project-note">${p.note[lang]}</div>` : ''}
          <div class="c-tags">${p.stack.map((s) => `<span class="c-tag">${s}</span>`).join('')}</div>
          <div class="c-project-links">
            <a href="${p.github}" target="_blank" rel="noopener">GitHub ↗</a>
            ${p.homepage ? `<a href="${p.homepage}" target="_blank" rel="noopener">${homepageLabel} ↗</a>` : ''}
          </div>
        </article>`;
      })
      .join('');
  }

  async function syncGithub() {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      liveProjects = data.projects;
      const text = document.getElementById('c-sync-text');
      if (text) text.textContent = t(`Синхронизировано · ${liveProjects.length} проектов`, `Synced · ${liveProjects.length} projects`);
    } catch (e) {
      const text = document.getElementById('c-sync-text');
      if (text) text.textContent = t('Офлайн-режим (кэш)', 'Offline mode (cache)');
    }
    paintProjectsGrid();
  }

  function renderContactSection() {
    const lang = window.XP.lang();
    const c = PROFILE.contacts;
    const items = [
      { ic: '✉️', label: 'Email', value: c.email, href: `mailto:${c.email}` },
      { ic: '💬', label: 'Telegram', value: c.telegram_handle, href: c.telegram },
      { ic: '📂', label: 'GitHub', value: 'BlazeStudio', href: c.github },
      { ic: '💼', label: 'LinkedIn', value: t('Профиль', 'Profile'), href: c.linkedin },
      { ic: '📋', label: 'hh.ru', value: t('Резюме', 'Résumé'), href: c.hh },
    ];
    document.getElementById('c-contact-section').innerHTML = `
      <div class="c-section-title">${t('Связаться', 'Get in touch')}</div>
      <div class="c-contact-grid">
        ${items.map((i) => `<a class="c-card c-contact-card" href="${i.href}" target="_blank" rel="noopener"><span class="ic">${i.ic}</span><span><span class="lbl">${i.label}</span><br><span class="val">${i.value}</span></span></a>`).join('')}
      </div>
    `;
  }

  /* ---------- fun zone (built once — never rebuilt on lang toggle) ---------- */
  function renderFunSection() {
    document.getElementById('c-fun-section').innerHTML = `
      <div class="c-section-title" data-ru="Развлечения" data-en="Fun stuff">Развлечения</div>
      <div class="c-section-sub" data-ru="Тот же терминал и те же игры, что и в XP-версии" data-en="The same terminal and games as the XP version">Тот же терминал и те же игры, что и в XP-версии</div>
      <div class="c-fun-grid">
        <div class="c-term">
          <div id="term-output"></div>
          <div class="term-input-row"><span class="prompt">C:\\ANTON&gt;</span><input id="term-input" type="text" autocomplete="off" spellcheck="false"></div>
        </div>
        <div class="c-fun-games">
          <div class="c-games-tabs">
            <button data-game="bughunt" class="active" data-ru="🐛 Охота на баги" data-en="🐛 Bug Hunt">🐛 Охота на баги</button>
            <button data-game="memory" data-ru="🧠 Память" data-en="🧠 Memory Match">🧠 Память</button>
            <button data-game="snake" data-ru="🐍 Snake_Deploy" data-en="🐍 Snake_Deploy">🐍 Snake_Deploy</button>
          </div>
          <div class="c-game-view active" data-game="bughunt">
            <div class="c-game-toolbar">
              <div class="c-game-stats"><span data-ru="Счёт" data-en="Score">Счёт</span>: <b id="bughunt-score">0</b> <span data-ru="Время" data-en="Time">Время</span>: <b id="bughunt-time">20</b> <span data-ru="Рекорд" data-en="Best">Рекорд</span>: <b id="bughunt-best">0</b></div>
              <button class="c-btn" id="bughunt-start" data-ru="▶ Начать" data-en="▶ Start">▶ Начать</button>
            </div>
            <div id="bughunt-field"><pre id="bughunt-code"></pre></div>
          </div>
          <div class="c-game-view" data-game="memory">
            <div class="c-game-toolbar">
              <div class="c-game-stats"><span data-ru="Ходы" data-en="Moves">Ходы</span>: <b id="memory-moves">0</b> <span data-ru="Рекорд" data-en="Best">Рекорд</span>: <b id="memory-best">—</b></div>
              <button class="c-btn" id="memory-restart" data-ru="🔄 Заново" data-en="🔄 Restart">🔄 Заново</button>
            </div>
            <div class="c-memory-grid" id="memory-grid"></div>
          </div>
          <div class="c-game-view" data-game="snake">
            <div class="c-game-toolbar">
              <div class="c-game-stats"><span data-ru="Запросов" data-en="Requests">Запросов</span>: <b id="snake-score">0</b> <span data-ru="Рекорд" data-en="Best">Рекорд</span>: <b id="snake-best">0</b></div>
              <button class="c-btn" id="snake-start" data-ru="▶ Деплой" data-en="▶ Deploy">▶ Деплой</button>
            </div>
            <canvas id="snake-canvas" width="300" height="300"></canvas>
          </div>
        </div>
      </div>
    `;
    window.XP.applyStaticI18n(document.getElementById('c-fun-section'));
    window.XP.initConsole(document.getElementById('c-fun-section'));

    document.querySelectorAll('.c-games-tabs button').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.c-games-tabs button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.c-game-view').forEach((v) => v.classList.remove('active'));
        const view = document.querySelector(`.c-game-view[data-game="${btn.dataset.game}"]`);
        view.classList.add('active');
        mountGame(btn.dataset.game);
      });
    });
    mountGame('bughunt');
  }

  function mountGame(kind) {
    if (activeGame) {
      const prevKey = 'classic-' + activeGame;
      if (window.XP.gameCleanup[prevKey]) {
        window.XP.gameCleanup[prevKey]();
        delete window.XP.gameCleanup[prevKey];
      }
    }
    activeGame = kind;
    const root = document.querySelector(`.c-game-view[data-game="${kind}"]`);
    window.XP.initGame(kind, root, 'classic-' + kind);
  }

  window.XP.teardownClassicGames = function () {
    if (activeGame) {
      const key = 'classic-' + activeGame;
      if (window.XP.gameCleanup[key]) {
        window.XP.gameCleanup[key]();
        delete window.XP.gameCleanup[key];
      }
    }
  };

  function animateFills(scope) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scope.querySelectorAll('.c-fill').forEach((el) => (el.style.width = el.dataset.v + '%'));
      });
    });
  }

  /* ---------- cityscape: the painting, revealed on scroll ---------- */
  function renderCityscape() {
    const layer = document.getElementById('c-cityscape');
    if (!layer) return;
    layer.innerHTML = `
      <svg class="c-wires" viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-20 60 C 250 180, 550 -10, 900 120 S 1250 40, 1300 90" stroke="currentColor" stroke-width="2.5" fill="none"/>
        <path d="M-20 130 C 300 30, 650 220, 1000 60 S 1250 140, 1300 100" stroke="currentColor" stroke-width="2" fill="none" opacity="0.7"/>
      </svg>
      <svg class="c-building left" viewBox="0 0 220 640" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <defs>
          <pattern id="winL" width="24" height="32" patternUnits="userSpaceOnUse">
            <rect x="5" y="7" width="9" height="13" fill="#d8dde3" opacity="0.5"/>
          </pattern>
        </defs>
        <rect x="14" y="30" width="192" height="610" fill="var(--cb-mauve)"/>
        <rect x="96" y="30" width="60" height="610" fill="#b9adae" opacity="0.55"/>
        <rect x="14" y="55" width="192" height="585" fill="url(#winL)"/>
        <rect x="50" y="6" width="16" height="30" fill="var(--cb-ink)" opacity="0.5"/>
      </svg>
      <svg class="c-building right" viewBox="0 0 320 640" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <defs>
          <pattern id="winT" width="22" height="30" patternUnits="userSpaceOnUse">
            <rect x="4" y="6" width="9" height="13" fill="#dff3ea" opacity="0.45"/>
          </pattern>
          <pattern id="winCo" width="24" height="30" patternUnits="userSpaceOnUse">
            <rect x="4" y="6" width="10" height="13" fill="#fff1e6" opacity="0.5"/>
          </pattern>
        </defs>
        <path d="M210 70 Q235 10 262 70 L262 110 L210 110 Z" fill="var(--cb-gold)"/>
        <rect x="228" y="90" width="16" height="220" fill="var(--cb-gold)" opacity="0.85"/>
        <rect x="30" y="60" width="160" height="580" fill="var(--cb-teal)"/>
        <rect x="30" y="85" width="160" height="555" fill="url(#winT)"/>
        <rect x="150" y="260" width="170" height="380" fill="var(--cb-coral)"/>
        <rect x="160" y="285" width="150" height="345" fill="url(#winCo)"/>
        <path d="M140 640 Q165 570 190 640 Z" fill="#2f6b46" opacity="0.85"/>
      </svg>
    `;
  }

  function initCityscapeReveal() {
    const scroller = document.getElementById('classic');
    const buildings = () => document.querySelectorAll('.c-building');
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const REVEAL_DISTANCE = 520;

    function update() {
      const progress = Math.min(1, Math.max(0, scroller.scrollTop / REVEAL_DISTANCE));
      buildings().forEach((el) => {
        el.style.transform = `translateY(${(1 - progress) * 38}%)`;
        el.style.opacity = String(0.35 + progress * 0.65);
      });
    }

    if (reduced) {
      buildings().forEach((el) => {
        el.style.transform = 'translateY(0)';
        el.style.opacity = '1';
      });
      return;
    }

    let ticking = false;
    scroller.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          update();
        });
      },
      { passive: true }
    );
    update();
  }

  /* ---------- side quick-nav ---------- */
  const SIDENAV_SECTIONS = [
    { id: 'c-about-section', ic: '👤', ru: 'О себе', en: 'About' },
    { id: 'c-skills-section', ic: '🛠️', ru: 'Стек', en: 'Stack' },
    { id: 'c-experience-section', ic: '💼', ru: 'Опыт', en: 'Experience' },
    { id: 'c-projects-section', ic: '📁', ru: 'Проекты', en: 'Projects' },
    { id: 'c-fun-section', ic: '🎮', ru: 'Развлечения', en: 'Fun' },
    { id: 'c-contact-section', ic: '✉️', ru: 'Контакты', en: 'Contact' },
  ];

  function buildSidenav() {
    const nav = document.createElement('nav');
    nav.id = 'c-sidenav';
    nav.innerHTML = SIDENAV_SECTIONS.map(
      (s) => `<a class="c-sidenav-item" href="#${s.id}" data-target="${s.id}">${s.ic}<span class="tip" data-ru="${s.ru}" data-en="${s.en}">${s.ru}</span></a>`
    ).join('');
    document.getElementById('classic').appendChild(nav);
    window.XP.applyStaticI18n(nav);

    nav.querySelectorAll('.c-sidenav-item').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(a.dataset.target);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    const scroller = document.getElementById('classic');
    function updateActive() {
      const items = SIDENAV_SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
      const centerY = scroller.getBoundingClientRect().top + scroller.clientHeight / 2;
      let current = items[0];
      items.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= centerY && rect.bottom >= centerY) current = el;
      });
      nav.querySelectorAll('.c-sidenav-item').forEach((a) => a.classList.toggle('active', current && a.dataset.target === current.id));
    }
    let ticking = false;
    scroller.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          updateActive();
        });
      },
      { passive: true }
    );
    updateActive();
  }

  /* ---------- init ---------- */
  window.XP.renderClassic = function () {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    applyTheme();
    document.getElementById('c-theme-btn').addEventListener('click', toggleTheme);

    document.getElementById('c-main').innerHTML = `
      <section class="c-hero" id="c-hero"></section>
      <section class="c-section" id="c-about-section"></section>
      <section class="c-section" id="c-skills-section"></section>
      <section class="c-section" id="c-experience-section"></section>
      <section class="c-section" id="c-projects-section"></section>
      <section class="c-section" id="c-fun-section"></section>
      <section class="c-section" id="c-contact-section"></section>
    `;

    renderHero();
    renderAbout();
    renderSkills();
    renderExperience();
    renderProjectsSection();
    renderFunSection();
    renderContactSection();
    document.getElementById('c-footer').innerHTML = `
      Anton Vasiliev © <span id="c-year"></span> · <a href="https://github.com/BlazeStudio" target="_blank" rel="noopener">github.com/BlazeStudio</a>
      <br>
      <button class="c-btn" id="c-to-top" data-ru="↑ Наверх" data-en="↑ Back to top">↑ Наверх</button>
    `;
    document.getElementById('c-year').textContent = new Date().getFullYear();
    window.XP.applyStaticI18n(document.getElementById('c-footer'));
    document.getElementById('c-to-top').addEventListener('click', () => {
      document.getElementById('classic').scrollTo({ top: 0, behavior: 'smooth' });
    });

    buildSidenav();
    renderCityscape();
    initCityscapeReveal();
    document.getElementById('classic').scrollTop = 0;

    syncGithub();

    window.XP.onLangChange.push(() => {
      renderHero();
      renderAbout();
      renderSkills();
      renderExperience();
      paintFilters();
      paintProjectsGrid();
      renderContactSection();
    });
  };
})();
