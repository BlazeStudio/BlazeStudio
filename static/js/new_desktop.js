'use strict';

(function () {
  const PROFILE = window.XP.data.profile;
  const PROJECTS = window.XP.data.projects;

  function t(ru, en) {
    return window.XP.t(ru, en);
  }
  function lang() {
    return window.XP.lang();
  }

  /* =========================================================
     Window manager — same drag/raise/hide idea as windows.js,
     but for a fixed set of windows already present in the DOM
     (this page isn't a window-open/close shell, it's a snapshot
     desktop where every window already exists and can be shown,
     hidden, dragged and raised).
     ========================================================= */
  const DEFS = {
    avatar: { l: 112, t: 10, w: 226, h: 260 },
    steam: { l: 112, t: 294, w: 226, h: 240 },
    faceit: { l: 112, t: 558, w: 226, h: 240 },
    explorer: { l: 358, t: 10, w: 640, h: 560 },
    github: { l: 1018, t: 10, w: 256, h: 320 },
    hh: { l: 1018, t: 348, w: 256, h: 210 },
    console: { l: 358, t: 588, w: 640, h: 210 },
    corner: { l: 1018, t: 578, w: 256, h: 220 },
  };
  const WIN_ORDER = ['avatar', 'explorer', 'github', 'hh', 'console', 'steam', 'faceit', 'corner'];
  const WIN_LABEL = {
    avatar: () => 'avatar.gif',
    steam: () => t('Steam', 'Steam'),
    faceit: () => 'FACEIT',
    explorer: () => t('Проводник', 'Explorer'),
    github: () => 'GitHub',
    hh: () => 'hh.ru',
    console: () => t('Консоль', 'Console'),
    corner: () => t('Уголок', 'Corner'),
  };

  const state = { hidden: {}, pos: {}, z: {}, zc: 10, tab: 'resume' };

  function winEl(id) {
    return document.getElementById('nd-win-' + id);
  }

  function applyWinStyle(id) {
    const el = winEl(id);
    if (!el) return;
    const d = DEFS[id];
    const p = state.pos[id] || { x: 0, y: 0 };
    el.style.left = d.l + p.x + 'px';
    el.style.top = d.t + p.y + 'px';
    el.style.width = d.w + 'px';
    el.style.height = d.h + 'px';
    el.style.zIndex = state.z[id] || 1;
  }

  function raise(id) {
    state.zc += 1;
    state.z[id] = state.zc;
    applyWinStyle(id);
    syncTaskbar();
  }

  function setHidden(id, val) {
    state.hidden[id] = val;
    const el = winEl(id);
    if (el) el.classList.toggle('nd-hidden', !!val);
    syncTaskbar();
  }

  function toggleWin(id) {
    if (state.hidden[id]) {
      setHidden(id, false);
      raise(id);
    } else {
      setHidden(id, true);
    }
  }

  function show(id) {
    if (state.hidden[id]) setHidden(id, false);
    raise(id);
  }

  function startDrag(id) {
    return function (e) {
      if (window.innerWidth <= 720) return; // windows go fixed full-screen on mobile — nothing to drag
      if (e.button !== undefined && e.button !== 0) return;
      if (e.target.closest('button')) return;
      const base = state.pos[id] || { x: 0, y: 0 };
      const sx = e.clientX;
      const sy = e.clientY;
      raise(id);
      function move(ev) {
        state.pos[id] = { x: Math.round(base.x + (ev.clientX - sx)), y: Math.round(base.y + (ev.clientY - sy)) };
        applyWinStyle(id);
      }
      function up() {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);
      }
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
      document.addEventListener('pointercancel', up);
    };
  }

  function initWindows() {
    WIN_ORDER.forEach((id) => {
      const el = winEl(id);
      if (!el) return;
      applyWinStyle(id);
      const tb = el.querySelector('.nd-tb');
      if (tb) tb.addEventListener('pointerdown', startDrag(id));
      const min = el.querySelector('.nd-min');
      if (min) min.addEventListener('click', () => toggleWin(id));
      const close = el.querySelector('.nd-x');
      if (close) close.addEventListener('click', () => toggleWin(id));
      el.addEventListener('pointerdown', () => raise(id));
      raise(id);
    });
  }

  function syncTaskbar() {
    const bar = document.getElementById('nd-tasks');
    if (!bar) return;
    bar.innerHTML = '';
    WIN_ORDER.forEach((id) => {
      const btn = document.createElement('button');
      const hidden = !!state.hidden[id];
      btn.className = 'nd-task' + (hidden ? '' : ' active');
      btn.textContent = WIN_LABEL[id]();
      btn.setAttribute('aria-label', (hidden ? t('Показать окно ', 'Show window ') : t('Скрыть окно ', 'Hide window ')) + WIN_LABEL[id]());
      btn.addEventListener('click', () => toggleWin(id));
      bar.appendChild(btn);
    });
    const allBtn = document.getElementById('nd-toggle-all');
    const allVisible = WIN_ORDER.every((id) => !state.hidden[id]);
    if (allBtn) allBtn.textContent = allVisible ? t('Свернуть всё', 'Hide all') : t('Показать всё', 'Show all');
  }

  function arrange() {
    state.pos = {};
    WIN_ORDER.forEach(applyWinStyle);
    window.XP.toast(t('Окна расставлены по местам.', 'Windows arranged.'));
  }

  function toggleAll() {
    const allVisible = WIN_ORDER.every((id) => !state.hidden[id]);
    WIN_ORDER.forEach((id) => setHidden(id, allVisible));
  }

  /* =========================================================
     Explorer — tabs + content panels
     ========================================================= */
  const TAB_NAME = {
    resume: { ru: 'Резюме', en: 'Résumé' },
    pdf: { ru: 'Резюме (PDF)', en: 'Résumé (PDF)' },
    projects: { ru: 'Проекты', en: 'Projects' },
    screens: { ru: 'Скриншоты Steam', en: 'Steam screenshots' },
    games: { ru: 'Мини-игры', en: 'Mini-games' },
    music: { ru: 'Музыка', en: 'Music' },
    links: { ru: 'Сервисы', en: 'Services' },
  };

  function cleanupGame(key) {
    if (window.XP.gameCleanup && window.XP.gameCleanup[key]) {
      window.XP.gameCleanup[key]();
      delete window.XP.gameCleanup[key];
    }
  }

  function setTab(tab) {
    state.tab = tab;
    document.querySelectorAll('.nd-tabbtn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    const l = lang();
    const title = document.getElementById('nd-explorer-title');
    const addr = document.getElementById('nd-explorer-address');
    if (title) title.textContent = TAB_NAME[tab][l] + ' — ' + t('Мои документы', 'My Documents');
    if (addr) addr.textContent = 'C:\\' + t('Мои документы', 'My Documents') + '\\' + TAB_NAME[tab][l];
    renderTabPanel(tab);
  }

  function openExplorer(tab) {
    show('explorer');
    setTab(tab || state.tab);
  }

  function renderTabPanel(tab) {
    cleanupGame('nd-mines');
    cleanupGame('nd-slots');
    const panel = document.getElementById('nd-explorer-panel');
    if (!panel) return;
    const l = lang();
    if (tab === 'resume') panel.innerHTML = resumeHtml(l);
    else if (tab === 'pdf') panel.innerHTML = pdfHtml(l);
    else if (tab === 'projects') panel.innerHTML = projectsHtml(l);
    else if (tab === 'screens') {
      panel.innerHTML = screensHtml();
      loadScreens();
    } else if (tab === 'games') {
      panel.innerHTML = gamesHtml(l);
      mountGames();
    } else if (tab === 'music') {
      panel.innerHTML = musicHtml(l);
      mountMusic();
    } else if (tab === 'links') panel.innerHTML = linksHtml(l);
  }

  function tasksHtml(tasks) {
    if (!tasks || !tasks.length) return '';
    if (tasks[0] && tasks[0].category) {
      return tasks.map((g) => `<div class="nd-taskgroup"><div class="nd-taskcat">${g.category}</div><ul>${g.items.map((it) => `<li>${it}</li>`).join('')}</ul></div>`).join('');
    }
    return `<ul>${tasks.map((tk) => `<li>${tk}</li>`).join('')}</ul>`;
  }

  function resumeHtml(l) {
    const edu = PROFILE.education;
    const c = PROFILE.contacts;
    return `
      <div class="nd-doc-name">${PROFILE.name[l]}</div>
      <div class="nd-doc-role">${PROFILE.role[l]}</div>
      <div class="nd-doc-meta">${PROFILE.location[l]} · <b>${c.email}</b> · <b>${c.telegram_handle}</b> · <a href="${c.github}" target="_blank" rel="noopener">github.com/BlazeStudio</a></div>
      <div class="nd-doc-about">${PROFILE.about[l].map((p) => `<p>${p}</p>`).join('')}</div>
      <h3 class="nd-h2">${t('Опыт работы', 'Experience')}</h3>
      ${PROFILE.experience
        .map(
          (job) => `
        <div class="nd-job">
          <div class="nd-job-head"><b>${job.title[l]} — ${job.company[l]}</b><span>${job.period[l]}</span></div>
          ${job.summary[l] ? `<p>${job.summary[l]}</p>` : ''}
          ${job.highlight[l] ? `<p class="nd-highlight">◆ ${job.highlight[l]}</p>` : ''}
          ${tasksHtml(job.tasks[l])}
        </div>`
        )
        .join('')}
      <h3 class="nd-h2">${t('Образование', 'Education')}</h3>
      <div class="nd-job"><div class="nd-job-head"><b>${edu.school[l]}</b><span>${edu.year}</span></div><p>${edu.degree[l]}</p></div>
      <h3 class="nd-h2">${t('Навыки', 'Skills')}</h3>
      <div class="nd-chips">${Object.values(PROFILE.skills)
        .flatMap((g) => g.items)
        .map((s) => `<span class="nd-chip">${s.name}</span>`)
        .join('')}</div>
      <h3 class="nd-h2">${t('Языки', 'Languages')}</h3>
      <div style="font-size:12.5px">${PROFILE.languages.map((lg) => `${lg.name[l]} — ${lg.level[l]}`).join(' · ')}</div>
    `;
  }

  function pdfHtml(l) {
    const href = `/dossier?lang=${l}`;
    return `
      <div class="nd-pdf-bar">
        <b>${t('резюме.pdf · стр. 1', 'resume.pdf · page 1')}</b>
        <a class="nd-btn98" href="${href}" target="_blank" rel="noopener">${t('Открыть / скачать', 'Open / download')}</a>
      </div>
      <div class="nd-pdf-preview">
        <div class="nd-pdf-page">
          <div class="nd-pdf-title">${(PROFILE.name[l] || '').toUpperCase()}</div>
          <div><b>${PROFILE.role[l]}</b></div>
          <div class="nd-pdf-dim">${PROFILE.location[l]} · ${PROFILE.contacts.email}</div>
          <hr>
          <div>${(PROFILE.about[l] && PROFILE.about[l][0]) || ''}</div>
          <div class="nd-pdf-dim" style="margin-top:auto">${t('…полная версия — по кнопке выше', '…the full version opens via the button above')}</div>
        </div>
      </div>
    `;
  }

  function projectsHtml(l) {
    return `<div class="nd-projects-grid">${PROJECTS.map(
      (p) => `
      <div class="nd-card">
        <div class="nd-card-title">${p.name}</div>
        <div class="nd-card-stack">${p.stack.join(' · ')}</div>
        <div class="nd-card-desc">${p.description[l]}</div>
        ${p.note ? `<div class="nd-card-note">${p.note[l]}</div>` : ''}
        <div class="nd-card-links"><a href="${p.github}" target="_blank" rel="noopener">GitHub</a>${
          p.homepage ? `<a href="${p.homepage}" target="_blank" rel="noopener">${(p.homepage_label && p.homepage_label[l]) || t('демо', 'demo')}</a>` : ''
        }</div>
      </div>`
    ).join('')}</div>`;
  }

  function screensHtml() {
    return `<div class="nd-screens"><div class="nd-big-shot" id="nd-big-shot">${t('Загрузка…', 'Loading…')}</div><div class="nd-shots-grid" id="nd-shots-grid"></div></div>`;
  }

  async function loadScreens() {
    const bigEl = document.getElementById('nd-big-shot');
    const gridEl = document.getElementById('nd-shots-grid');
    if (!bigEl || !gridEl) return;
    try {
      const data = await fetchSteam();
      const shots = (data.screenshots && data.screenshots.screenshots) || [];
      if (!shots.length) {
        bigEl.textContent = t('Скриншотов пока нет (Steam не подключен или профиль приватный).', 'No screenshots yet (Steam not connected, or the profile is private).');
        gridEl.innerHTML = '';
        return;
      }
      bigEl.innerHTML = `<img src="${shots[0].full}" alt="${shots[0].title || ''}">`;
      gridEl.innerHTML = shots.map((s, i) => `<button class="nd-shot" data-i="${i}"><img src="${s.thumb}" alt="${s.title || ''}" loading="lazy"></button>`).join('');
      gridEl.querySelectorAll('.nd-shot').forEach((btn) => {
        btn.addEventListener('click', () => {
          const s = shots[Number(btn.dataset.i)];
          bigEl.innerHTML = `<img src="${s.full}" alt="${s.title || ''}">`;
        });
      });
    } catch (e) {
      bigEl.textContent = t('Не удалось загрузить скриншоты.', 'Could not load screenshots.');
    }
  }

  function gamesHtml(l) {
    return `
      <div class="nd-games">
        <div class="nd-gcard">
          <div class="nd-gcard-title">${t('Сапёр', 'Minesweeper')}</div>
          <div id="nd-mines-root"></div>
        </div>
        <div class="nd-gcard">
          <div class="nd-gcard-title">${t('Слоты', 'Slots')}</div>
          <div id="nd-slots-root"></div>
        </div>
        <div class="nd-gcard">
          <div class="nd-gcard-title">${t('Рисовалка', 'Doodle pad')}</div>
          <div class="nd-gcard-placeholder">${t('Холст, кисть, палитра — скоро.', 'Canvas, brush, palette — coming soon.')}</div>
          <span class="nd-soon">${t('СКОРО', 'SOON')}</span>
        </div>
      </div>
    `;
  }

  function mountGames() {
    const l = lang();
    const minesRoot = document.getElementById('nd-mines-root');
    const slotsRoot = document.getElementById('nd-slots-root');
    if (minesRoot) {
      minesRoot.innerHTML = `
        <div class="nd-game-toolbar">
          <div class="nd-game-stats"><span>${t('Флаги', 'Flags')}: <b id="mines-flags">10</b></span><span>${t('Время', 'Time')}: <b id="mines-time">0</b></span><span>${t('Рекорд', 'Best')}: <b id="mines-best">—</b></span></div>
          <div class="nd-btn-row">
            <button class="nd-btn98" id="mines-flag-mode">🚩 ${t('Флажки', 'Flags')}</button>
            <button class="nd-btn98" id="mines-restart">${t('🔄 Заново', '🔄 Restart')}</button>
          </div>
        </div>
        <div class="mines-grid" id="mines-grid"></div>
      `;
      window.XP.initGame('mines', minesRoot, 'nd-mines');
    }
    if (slotsRoot) {
      slotsRoot.innerHTML = `
        <div class="nd-game-toolbar">
          <div class="nd-game-stats"><span>${t('Кредиты', 'Credits')}: <b id="slots-credits">100</b></span><span>${t('Рекорд', 'Best')}: <b id="slots-best">100</b></span></div>
          <button class="nd-btn98" id="slots-restart">${t('🔄 Заново', '🔄 Restart')}</button>
        </div>
        <div class="slots-machine">
          <div class="slots-reels"><span class="slots-reel" id="slots-r1">🐍</span><span class="slots-reel" id="slots-r2">🐍</span><span class="slots-reel" id="slots-r3">🐍</span></div>
          <button class="nd-btn98 slots-spin-btn" id="slots-spin">${t('🎰 Крутить', '🎰 Spin')}</button>
          <div class="slots-msg" id="slots-msg"></div>
        </div>
      `;
      window.XP.initGame('slots', slotsRoot, 'nd-slots');
    }
    void l;
  }

  const musicState = { playing: false, sec: 0, track: 0 };

  function musicHtml() {
    const bars = Array.from({ length: 12 })
      .map((_, i) => `<span class="nd-bar" style="animation-delay:${((i * 137) % 55) / 100}s"></span>`)
      .join('');
    return `
      <div class="nd-music">
        <div class="nd-music-display">
          <div class="nd-music-time" id="nd-music-time">00:00</div>
          <div class="nd-music-bars" id="nd-music-bars">${bars}</div>
        </div>
        <div class="nd-music-ticker"><span class="nd-tick" id="nd-music-track"></span></div>
        <div class="nd-music-controls">
          <button class="nd-wbtn" id="nd-music-prev" aria-label="${t('Предыдущий трек', 'Previous track')}">◀◀</button>
          <button class="nd-wbtn" id="nd-music-play" aria-label="${t('Играть', 'Play')}">▶</button>
          <button class="nd-wbtn" id="nd-music-stop" aria-label="${t('Стоп', 'Stop')}">■</button>
          <button class="nd-wbtn" id="nd-music-next" aria-label="${t('Следующий трек', 'Next track')}">▶▶</button>
        </div>
        <div class="nd-music-playlist" id="nd-music-playlist"></div>
        <div class="nd-music-note">${t('Плейлист: заменить на свои треки.', 'Playlist: swap in your own tracks.')}</div>
      </div>
    `;
  }

  function musicTrackNames() {
    return [t('[Трек 1] — [Исполнитель]', '[Track 1] — [Artist]'), t('[Трек 2] — [Исполнитель]', '[Track 2] — [Artist]'), t('[Трек 3] — [Исполнитель]', '[Track 3] — [Artist]')];
  }

  function paintMusic() {
    const names = musicTrackNames();
    const timeEl = document.getElementById('nd-music-time');
    const trackEl = document.getElementById('nd-music-track');
    const playBtn = document.getElementById('nd-music-play');
    const barsEl = document.getElementById('nd-music-bars');
    const playlistEl = document.getElementById('nd-music-playlist');
    if (!timeEl || !playlistEl) return;
    const mm = String(Math.floor(musicState.sec / 60)).padStart(2, '0');
    const ss = String(musicState.sec % 60).padStart(2, '0');
    timeEl.textContent = `${mm}:${ss}`;
    trackEl.textContent = names[musicState.track] + ' *** ' + names[musicState.track];
    playBtn.textContent = musicState.playing ? '❚❚' : '▶';
    playBtn.setAttribute('aria-label', musicState.playing ? t('Пауза', 'Pause') : t('Играть', 'Play'));
    barsEl.classList.toggle('on', musicState.playing);
    playlistEl.innerHTML = names.map((n, i) => `<button class="nd-plrow${i === musicState.track ? ' active' : ''}" data-i="${i}">${i + 1}. ${n}</button>`).join('');
    playlistEl.querySelectorAll('.nd-plrow').forEach((b) => {
      b.addEventListener('click', () => {
        musicState.track = Number(b.dataset.i);
        musicState.sec = 0;
        musicState.playing = true;
        paintMusic();
      });
    });
  }

  function mountMusic() {
    const play = document.getElementById('nd-music-play');
    const stop = document.getElementById('nd-music-stop');
    const prev = document.getElementById('nd-music-prev');
    const next = document.getElementById('nd-music-next');
    const names = musicTrackNames();
    if (play) play.addEventListener('click', () => { musicState.playing = !musicState.playing; paintMusic(); });
    if (stop) stop.addEventListener('click', () => { musicState.playing = false; musicState.sec = 0; paintMusic(); });
    if (prev) prev.addEventListener('click', () => { musicState.track = (musicState.track + names.length - 1) % names.length; musicState.sec = 0; paintMusic(); });
    if (next) next.addEventListener('click', () => { musicState.track = (musicState.track + 1) % names.length; musicState.sec = 0; paintMusic(); });
    paintMusic();
  }

  setInterval(() => {
    if (!musicState.playing) return;
    musicState.sec += 1;
    const timeEl = document.getElementById('nd-music-time');
    if (!timeEl) return;
    const mm = String(Math.floor(musicState.sec / 60)).padStart(2, '0');
    const ss = String(musicState.sec % 60).padStart(2, '0');
    timeEl.textContent = `${mm}:${ss}`;
  }, 1000);

  function linksHtml(l) {
    const c = PROFILE.contacts;
    const items = [
      { name: 'GitHub', handle: 'BlazeStudio', tag: 'GH', bg: '#24292f', fg: '#fff', href: c.github },
      { name: 'hh.ru', handle: t('Резюме', 'Résumé'), tag: 'hh', bg: '#d6001c', fg: '#fff', href: c.hh },
      { name: 'LinkedIn', handle: t('Профиль', 'Profile'), tag: 'in', bg: '#0a66c2', fg: '#fff', href: c.linkedin },
      { name: 'Telegram', handle: c.telegram_handle, tag: 'TG', bg: '#229ed9', fg: '#000', href: c.telegram },
      { name: 'Email', handle: c.email, tag: '@', bg: '#555', fg: '#fff', href: `mailto:${c.email}` },
    ];
    return `
      <div class="nd-links-grid">${items
        .map(
          (i) => `
        <a class="nd-svc" href="${i.href}" target="_blank" rel="noopener">
          <span class="nd-svc-tag" style="background:${i.bg};color:${i.fg}">${i.tag}</span>
          <span><b>${i.name}</b><br><span class="nd-svc-handle">${i.handle}</span></span>
        </a>`
        )
        .join('')}</div>
      <div class="nd-links-note">${t('GitHub и hh.ru есть и в виде отдельных окон со статистикой на рабочем столе.', 'GitHub and hh.ru also have their own windows with live stats on the desktop.')}</div>
    `;
  }

  /* =========================================================
     Live-data windows: GitHub / Steam / FACEIT / hh.ru
     ========================================================= */
  function notConnectedHtml(envVars, docsUrl) {
    return `<p class="nd-not-connected">${t('Ещё не подключено.', 'Not connected yet.')}<br>${t('Задайте', 'Set')} ${envVars.map((v) => `<code>${v}</code>`).join(', ')} ${t('в переменных окружения', 'as environment variables')}${
      docsUrl ? ` (<a href="${docsUrl}" target="_blank" rel="noopener">${t('получить ключ', 'get a key')}</a>)` : ''
    }.</p>`;
  }

  let githubCache = null;
  async function loadGithub() {
    try {
      const res = await fetch('/api/github/stats');
      githubCache = await res.json();
    } catch (e) {
      githubCache = { synced: false };
    }
    renderGithub();
  }
  function renderGithub() {
    const body = document.getElementById('nd-github-body');
    if (!body) return;
    const s = githubCache;
    if (!s || !s.synced) {
      body.innerHTML = `<p class="nd-not-connected">${t('GitHub сейчас недоступен.', 'GitHub is unreachable right now.')}</p>`;
      return;
    }
    body.innerHTML = `
      <div class="nd-win-head">
        <div class="nd-win-avatar-badge">GH</div>
        <div><div class="nd-win-name">BlazeStudio</div><a class="nd-win-link" href="${PROFILE.contacts.github}" target="_blank" rel="noopener">github.com/BlazeStudio</a></div>
      </div>
      <div class="nd-stat-grid">
        <div class="nd-stat">${t('Репозитории', 'Repos')}<b>${s.public_repos ?? '—'}</b></div>
        <div class="nd-stat">${t('Подписчики', 'Followers')}<b>${s.followers ?? '—'}</b></div>
      </div>
      <a class="nd-btn98 nd-block" href="${PROFILE.contacts.github}" target="_blank" rel="noopener">${t('Открыть профиль', 'Open profile')}</a>
    `;
  }

  /* One shared fetch of /api/steam for both the Steam window (profile +
     recent games) and the Explorer's Screenshots tab, instead of hitting
     the endpoint twice. */
  let steamData = null;
  let steamPromise = null;
  function fetchSteam() {
    if (steamData) return Promise.resolve(steamData);
    if (!steamPromise) {
      steamPromise = fetch('/api/steam')
        .then((res) => res.json())
        .catch(() => ({ profile: { synced: false }, recent_games: { games: [] }, screenshots: { screenshots: [] } }));
    }
    return steamPromise.then((data) => {
      steamData = data;
      return data;
    });
  }

  async function loadSteamWin() {
    await fetchSteam();
    renderSteamWin();
  }
  function renderSteamWin() {
    const body = document.getElementById('nd-steam-body');
    if (!body) return;
    const p = steamData && steamData.profile;
    if (!p || !p.synced) {
      body.innerHTML = notConnectedHtml(['STEAM_API_KEY', 'STEAM_ID64'], 'https://steamcommunity.com/dev/apikey');
      return;
    }
    const statusLabel = { online: t('в сети', 'online'), offline: t('не в сети', 'offline'), busy: t('занят', 'busy'), away: t('отошёл', 'away') }[p.status] || p.status;
    const games = (steamData.recent_games && steamData.recent_games.games) || [];
    const gamesHtml = games.length
      ? `<div class="nd-steam-games-label">${t('Недавно играл', 'Recently played')}</div>
         <ul class="nd-steam-games">${games
           .slice(0, 3)
           .map(
             (g) => `<li>${g.icon ? `<img src="${g.icon}" alt="">` : '<span class="nd-steam-noicon">🎮</span>'}<span class="nd-steam-game-name">${g.name}</span><span class="nd-steam-hours">${Math.round(g.playtime_2weeks_min / 60)}${t('ч/2нед', 'h/2wk')}</span></li>`
           )
           .join('')}</ul>`
      : `<p class="nd-steam-dim">${t('недавних игр нет', 'no recent games')}</p>`;
    body.innerHTML = `
      <div class="nd-win-head">
        <div class="nd-win-avatar-badge"><img src="${p.avatar}" alt=""></div>
        <div><div class="nd-win-name">${p.persona_name || ''}</div><div class="nd-steam-status">● ${statusLabel}</div></div>
      </div>
      ${gamesHtml}
      <a class="nd-btn98 nd-block" href="${p.profile_url}" target="_blank" rel="noopener">${t('Открыть профиль', 'Open profile')}</a>
    `;
  }

  let faceitCache = null;
  async function loadFaceit() {
    try {
      const res = await fetch('/api/faceit');
      faceitCache = await res.json();
    } catch (e) {
      faceitCache = { player: { synced: false } };
    }
    renderFaceitWin();
  }
  function renderFaceitWin() {
    const body = document.getElementById('nd-faceit-body');
    if (!body) return;
    const p = faceitCache && faceitCache.player;
    if (!p || !p.synced) {
      body.innerHTML = notConnectedHtml(['FACEIT_API_KEY', 'FACEIT_NICKNAME'], 'https://developers.faceit.com/apps');
      return;
    }
    body.innerHTML = `
      <div class="nd-win-head">
        <div class="nd-win-avatar-badge"><img src="${p.avatar}" alt=""></div>
        <div><div class="nd-win-name">${p.nickname || ''}</div><div class="nd-steam-status">Elo ${p.elo ?? '—'} · ${t('уровень', 'level')} ${p.level ?? '—'}</div></div>
      </div>
      <a class="nd-btn98 nd-block" href="${p.faceit_url}" target="_blank" rel="noopener">${t('Открыть профиль', 'Open profile')}</a>
    `;
  }

  function renderHh() {
    const body = document.getElementById('nd-hh-body');
    if (!body) return;
    const l = lang();
    body.innerHTML = `
      <div class="nd-win-head">
        <div class="nd-win-avatar-badge nd-hh-badge">hh</div>
        <div><div class="nd-win-name">${PROFILE.role[l]}</div><div class="nd-win-sub">${PROFILE.location[l]}</div></div>
      </div>
      <p style="margin:0 0 10px">${PROFILE.employment[l]}</p>
      <a class="nd-btn98 nd-block" href="${PROFILE.contacts.hh}" target="_blank" rel="noopener">${t('Открыть резюме на hh.ru', 'Open résumé on hh.ru')}</a>
    `;
  }

  function renderAvatar() {
    const l = lang();
    const name = document.getElementById('nd-av-name');
    const role = document.getElementById('nd-av-role');
    if (name) name.textContent = PROFILE.name[l];
    if (role) role.textContent = PROFILE.role[l];
  }

  /* =========================================================
     Guest corner — decorative visitor counter, same formula
     entry.js uses (no backend behind it, purely flavor).
     ========================================================= */
  function visitorNumber() {
    const epoch = Date.UTC(2026, 0, 1);
    const days = Math.max(0, Math.floor((Date.now() - epoch) / 86400000));
    return String(13375 + days * 7).padStart(7, '0');
  }
  function renderCorner() {
    const el = document.getElementById('nd-counter');
    if (!el) return;
    el.innerHTML = visitorNumber()
      .split('')
      .map((d) => `<span>${d}</span>`)
      .join('');
  }

  /* =========================================================
     Console — the real thing: terminal.js + POST /api/terminal.
     No fake canned answers here.
     ========================================================= */
  function initConsoleWindow() {
    const root = document.getElementById('nd-console-root');
    if (!root) return;
    const promptEl = root.querySelector('.prompt');
    if (promptEl) promptEl.textContent = window.XP.termPrompt;
    window.XP.initConsole(root, false);
  }

  function trashEasterEgg() {
    show('console');
    raise('console');
    setTimeout(() => {
      const input = document.getElementById('term-input');
      if (!input) return;
      input.focus();
      input.value = 'sudo rm -rf';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }, 30);
  }

  /* Terminal effects can ask to "open" a window by id — map the
     three targets terminal.py's effect payloads use onto this
     page's actual windows/tabs. */
  window.XP.open = function (id) {
    if (id === 'resume') openExplorer('resume');
    else if (id === 'projects') openExplorer('projects');
    else if (id === 'contact') openExplorer('links');
  };

  /* =========================================================
     Icons
     ========================================================= */
  function openWinOrTab(btn) {
    if (btn.dataset.action === 'trash') {
      trashEasterEgg();
      return;
    }
    const win = btn.dataset.win;
    if (win === 'explorer') openExplorer(btn.dataset.tab);
    else show(win);
  }

  function initIcons() {
    document.querySelectorAll('.nd-ico').forEach((btn) => btn.addEventListener('click', () => openWinOrTab(btn)));
  }

  /* =========================================================
     Start menu — a real menu, not a joke toast: it opens the same
     windows/tabs the desktop icons do, links out to the site's
     other cuts, and its "Shut Down" runs the shared shutdown effect.
     ========================================================= */
  function startMenuEls() {
    return { menu: document.getElementById('nd-start-menu'), btn: document.getElementById('nd-start') };
  }
  function closeStartMenu() {
    const { menu, btn } = startMenuEls();
    if (menu) menu.hidden = true;
    if (btn) btn.classList.remove('active');
  }
  function toggleStartMenu() {
    const { menu, btn } = startMenuEls();
    if (!menu) return;
    const willOpen = menu.hidden;
    menu.hidden = !willOpen;
    if (btn) btn.classList.toggle('active', willOpen);
  }

  function initStartMenu() {
    const { menu, btn } = startMenuEls();
    if (!menu || !btn) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleStartMenu();
    });
    menu.querySelectorAll('.nd-sm-item[data-win], .nd-sm-item[data-action]').forEach((item) => {
      item.addEventListener('click', () => {
        openWinOrTab(item);
        closeStartMenu();
      });
    });
    document.addEventListener('click', (e) => {
      if (!menu.hidden && !menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) closeStartMenu();
    });
    const shutdownBtn = document.getElementById('nd-sm-shutdown');
    if (shutdownBtn) {
      shutdownBtn.addEventListener('click', () => {
        closeStartMenu();
        window.XP.effects.shutdown();
      });
    }
  }

  /* =========================================================
     Init
     ========================================================= */
  document.addEventListener('DOMContentLoaded', () => {
    initWindows();
    initIcons();
    setTab('resume');
    renderAvatar();
    renderHh();
    renderCorner();
    initConsoleWindow();
    loadGithub();
    loadSteamWin();
    loadFaceit();

    document.querySelectorAll('.nd-tabbtn').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));

    const arrangeBtn = document.getElementById('nd-arrange');
    if (arrangeBtn) arrangeBtn.addEventListener('click', arrange);
    const toggleAllBtn = document.getElementById('nd-toggle-all');
    if (toggleAllBtn) toggleAllBtn.addEventListener('click', toggleAll);
    initStartMenu();

    window.XP.onLangChange.push(() => {
      syncTaskbar();
      renderAvatar();
      renderHh();
      renderGithub();
      renderSteamWin();
      renderFaceitWin();
      renderCorner();
      const title = document.getElementById('nd-explorer-title');
      const addr = document.getElementById('nd-explorer-address');
      const l = lang();
      if (title) title.textContent = TAB_NAME[state.tab][l] + ' — ' + t('Мои документы', 'My Documents');
      if (addr) addr.textContent = 'C:\\' + t('Мои документы', 'My Documents') + '\\' + TAB_NAME[state.tab][l];
      if (state.tab !== 'games') renderTabPanel(state.tab); // a running game keeps its own state, like windows.js's "stateful" windows
    });
  });
})();
