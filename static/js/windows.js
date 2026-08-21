'use strict';

/* =========================================================
   Window manager
   ========================================================= */
const PROFILE = window.XP.data.profile;
const PROJECTS = window.XP.data.projects;
const CATEGORIES = window.XP.data.categories;
const RESUME_SOURCE = window.XP.data.resume_source;

const CATEGORY_ICON = { web: '🌐', tools: '🛠️', security: '🔐', games: '🎮', practice: '📘' };

const open = new Map(); // id -> { el, minimized, rerender }
let zTop = 10;
let cascade = 0;

function title(id) {
  return WINDOW_DEFS[id].title[window.XP.lang()];
}

function makeWindowShell(id) {
  const def = WINDOW_DEFS[id];
  const el = document.createElement('div');
  el.className = 'xp-window' + (def.extraClass ? ' ' + def.extraClass : '');
  el.style.width = (def.width || 520) + 'px';
  el.style.height = (def.height || 420) + 'px';
  const offset = 30 + (cascade % 6) * 26;
  el.style.left = offset + 'px';
  el.style.top = offset + 'px';
  cascade += 1;

  el.innerHTML = `
    <div class="xp-titlebar">
      <span class="t-icon">${def.icon}</span>
      <span class="t-title">${title(id)}</span>
      <button class="t-btn min" title="minimize">_</button>
      <button class="t-btn close" title="close">✕</button>
    </div>
    <div class="xp-shell"></div>
  `;
  return el;
}

function openWindow(id) {
  if (!WINDOW_DEFS[id]) return;
  if (open.has(id)) {
    restoreAndFocus(id);
    return;
  }
  const el = makeWindowShell(id);
  document.getElementById('windows-layer').appendChild(el);

  const wrap = el.querySelector('.xp-shell');
  const def = WINDOW_DEFS[id];
  def.render(wrap);
  window.XP.applyStaticI18n(el);

  el.querySelector('.close').addEventListener('click', () => closeWindow(id));
  el.querySelector('.min').addEventListener('click', () => minimizeWindow(id));
  el.addEventListener('mousedown', () => focusWindow(id));
  makeDraggable(el, el.querySelector('.xp-titlebar'));

  // Stateful windows (console session, a running game) keep their content across a
  // language toggle — only the chrome (title) updates. Everything else re-renders
  // from scratch since it's pure data display with nothing to lose.
  const rerender = () => {
    el.querySelector('.t-title').textContent = title(id);
    if (def.stateful) return;
    const w = wrap;
    w.innerHTML = '';
    def.render(w);
    window.XP.applyStaticI18n(el);
  };
  window.XP.onLangChange.push(rerender);

  open.set(id, { el, minimized: false, rerender });
  addTaskbarButton(id);
  focusWindow(id);
}

function closeWindow(id) {
  const w = open.get(id);
  if (!w) return;
  if (window.XP.gameCleanup && window.XP.gameCleanup[id]) {
    window.XP.gameCleanup[id]();
    delete window.XP.gameCleanup[id];
  }
  const idx = window.XP.onLangChange.indexOf(w.rerender);
  if (idx !== -1) window.XP.onLangChange.splice(idx, 1);
  w.el.remove();
  open.delete(id);
  const btn = document.querySelector(`.taskbar-app[data-id="${id}"]`);
  if (btn) btn.remove();
}

function minimizeWindow(id) {
  const w = open.get(id);
  if (!w) return;
  w.el.classList.add('minimized');
  w.minimized = true;
  syncTaskbarActive();
}

function restoreAndFocus(id) {
  const w = open.get(id);
  if (!w) return;
  w.el.classList.remove('minimized');
  w.minimized = false;
  focusWindow(id);
}

function focusWindow(id) {
  document.querySelectorAll('.xp-window').forEach((w) => w.classList.remove('focused'));
  const w = open.get(id);
  if (!w) return;
  zTop += 1;
  w.el.style.zIndex = zTop;
  w.el.classList.add('focused');
  syncTaskbarActive();
}

function syncTaskbarActive() {
  const focused = document.querySelector('.xp-window.focused:not(.minimized)');
  const focusedId = focused ? [...open.entries()].find(([, v]) => v.el === focused)?.[0] : null;
  document.querySelectorAll('.taskbar-app').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.id === focusedId);
  });
}

function addTaskbarButton(id) {
  const bar = document.getElementById('taskbar-open');
  const btn = document.createElement('button');
  btn.className = 'taskbar-app';
  btn.dataset.id = id;
  btn.innerHTML = `<span>${WINDOW_DEFS[id].icon}</span><span class="tb-label">${title(id)}</span>`;
  btn.addEventListener('click', () => {
    const w = open.get(id);
    if (!w) return;
    if (w.minimized || !w.el.classList.contains('focused')) restoreAndFocus(id);
    else minimizeWindow(id);
  });
  bar.appendChild(btn);
}

function makeDraggable(el, handle) {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let origX = 0;
  let origY = 0;

  function onDown(e) {
    if (window.innerWidth <= 720) return; // windows are fixed full-screen on mobile
    if (e.target.closest('.t-btn')) return;
    dragging = true;
    const point = e.touches ? e.touches[0] : e;
    startX = point.clientX;
    startY = point.clientY;
    origX = el.offsetLeft;
    origY = el.offsetTop;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }
  function onMove(e) {
    if (!dragging) return;
    if (e.cancelable) e.preventDefault();
    const point = e.touches ? e.touches[0] : e;
    const dx = point.clientX - startX;
    const dy = point.clientY - startY;
    el.style.left = Math.max(0, origX + dx) + 'px';
    el.style.top = Math.max(0, origY + dy) + 'px';
  }
  function onUp() {
    dragging = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
  }
  handle.addEventListener('mousedown', onDown);
  handle.addEventListener('touchstart', onDown, { passive: true });
}

/* =========================================================
   Desktop icons — draggable, positions are not persisted
   (a fresh visit always starts from the same tidy grid).
   ========================================================= */
function layoutDesktopIcons() {
  const container = document.getElementById('icons');
  const icons = Array.from(container.querySelectorAll('.desktop-icon'));
  const colWidth = 92;
  const rowHeight = 88;
  const perCol = 7;

  icons.forEach((icon, i) => {
    icon.style.left = Math.floor(i / perCol) * colWidth + 4 + 'px';
    icon.style.top = (i % perCol) * rowHeight + 4 + 'px';

    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let origX = 0;
    let origY = 0;

    function onDown(e) {
      dragging = true;
      moved = false;
      icon.classList.add('dragging');
      const point = e.touches ? e.touches[0] : e;
      startX = point.clientX;
      startY = point.clientY;
      origX = icon.offsetLeft;
      origY = icon.offsetTop;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
    }
    function onMove(e) {
      if (!dragging) return;
      if (e.cancelable) e.preventDefault();
      const point = e.touches ? e.touches[0] : e;
      const dx = point.clientX - startX;
      const dy = point.clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      const bounds = container.getBoundingClientRect();
      icon.style.left = Math.min(Math.max(0, origX + dx), bounds.width - icon.offsetWidth) + 'px';
      icon.style.top = Math.min(Math.max(0, origY + dy), bounds.height - icon.offsetHeight) + 'px';
    }
    function onUp() {
      dragging = false;
      icon.classList.remove('dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      if (!moved) openWindow(icon.dataset.window);
    }
    icon.addEventListener('mousedown', onDown);
    icon.addEventListener('touchstart', onDown, { passive: true });
  });
}

window.XP.open = openWindow;
window.XP.close = closeWindow;

/* =========================================================
   Content renderers
   ========================================================= */
function renderMyPC(root) {
  const lang = window.XP.lang();
  const t = window.XP.t;
  root.innerHTML = `
    <div class="xp-tabs">
      <button class="xp-tab active" data-tab="general">${t('Общие', 'General')}</button>
      <button class="xp-tab" data-tab="hardware">${t('Оборудование', 'Hardware')}</button>
      <button class="xp-tab" data-tab="advanced">${t('Дополнительно', 'Advanced')}</button>
    </div>
    <div class="xp-body" id="pc-panel"></div>
  `;
  const panel = root.querySelector('#pc-panel');

  function paintGeneral() {
    panel.innerHTML = `
      <fieldset class="xp-fieldset">
        <legend>${t('Система', 'System')}</legend>
        <div class="kv-row"><span class="k">${t('Владелец', 'Registered to')}</span><span class="v">${PROFILE.name[lang]}</span></div>
        <div class="kv-row"><span class="k">${t('Роль', 'Role')}</span><span class="v">${PROFILE.role[lang]}</span></div>
        <div class="kv-row"><span class="k">${t('Локация', 'Location')}</span><span class="v">${PROFILE.location[lang]}</span></div>
        <div class="kv-row"><span class="k">${t('Занятость', 'Employment')}</span><span class="v">${PROFILE.employment[lang]}</span></div>
        <div class="kv-row"><span class="k">${t('Формат', 'Work format')}</span><span class="v">${PROFILE.format[lang]}</span></div>
        <div class="kv-row"><span class="k">${t('Сборка', 'Build')}</span><span class="v">resume-source: ${RESUME_SOURCE}</span></div>
      </fieldset>
      <fieldset class="xp-fieldset">
        <legend>${t('Описание', 'Description')}</legend>
        ${PROFILE.about[lang].map((p) => `<p style="margin-bottom:8px;">${p}</p>`).join('')}
      </fieldset>
      <fieldset class="xp-fieldset">
        <legend>${t('Особые приметы', 'Notable traits')}</legend>
        <div class="f-tags">${PROFILE.traits.map((tr) => `<span class="stack-tag f-tag">${tr[lang]}</span>`).join('')}</div>
      </fieldset>
    `;
  }

  function paintHardware() {
    const icons = { backend: '⚙️', data: '📊', infra: '🧱', practice: '✅' };
    panel.innerHTML = `<div class="hw-list">${Object.entries(PROFILE.skills)
      .map(([key, group]) => {
        const rows = group.items
          .map(
            (item) => `<div class="hw-row">
              <span class="name">${icons[key] || '▸'} ${item.name}</span>
              <span class="bar-track"><span class="bar-fill" data-v="${item.level}"></span></span>
              <span class="pct">${item.level}%</span>
            </div>`
          )
          .join('');
        return `<div class="hw-group-title">${group.label[lang]}</div>${rows}`;
      })
      .join('')}</div>`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panel.querySelectorAll('.bar-fill').forEach((b) => (b.style.width = b.dataset.v + '%'));
      });
    });
  }

  function paintAdvanced() {
    const certs = PROFILE.certifications || [];
    panel.innerHTML = `
      <fieldset class="xp-fieldset">
        <legend>${t('Языковые пакеты', 'Language packs')}</legend>
        ${PROFILE.languages
          .map(
            (l) => `<div class="hw-row">
              <span class="name">${l.name[lang]}</span>
              <span class="bar-track"><span class="bar-fill" data-v="${l.value}"></span></span>
              <span class="pct">${l.level[lang]}</span>
            </div>`
          )
          .join('')}
      </fieldset>
      ${
        certs.length
          ? `<fieldset class="xp-fieldset"><legend>${t('Сертификаты', 'Certifications')}</legend>${certs
              .map((c) => `<div class="kv-row"><span class="v">🏅 ${c[lang]}</span></div>`)
              .join('')}</fieldset>`
          : ''
      }
      <button class="xp-btn" id="restore-btn">${t('Восстановление системы…', 'System Restore…')}</button>
    `;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panel.querySelectorAll('.bar-fill').forEach((b) => (b.style.width = b.dataset.v + '%'));
      });
    });
    panel.querySelector('#restore-btn').addEventListener('click', () => {
      window.XP.toast(t('Ничего не сломано — восстанавливать нечего.', 'Nothing broken — nothing to restore.'));
    });
  }

  const tabs = { general: paintGeneral, hardware: paintHardware, advanced: paintAdvanced };
  root.querySelectorAll('.xp-tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      root.querySelectorAll('.xp-tab').forEach((b) => b.classList.remove('active'));
      tabBtn.classList.add('active');
      tabs[tabBtn.dataset.tab]();
    });
  });
  paintGeneral();
}

function renderProjects(root) {
  const lang = window.XP.lang();
  const t = window.XP.t;
  root.innerHTML = `
    <div class="explorer">
      <div class="explorer-side" id="proj-side"></div>
      <div class="explorer-main">
        <div class="file-grid" id="proj-grid"></div>
      </div>
    </div>
    <div class="file-detail" id="proj-detail"></div>
  `;
  let activeCat = 'all';
  let activeProject = null;

  const side = root.querySelector('#proj-side');
  const grid = root.querySelector('#proj-grid');
  const detail = root.querySelector('#proj-detail');

  function paintSide() {
    side.innerHTML = CATEGORIES.map((c) => `<div class="side-item${c.id === activeCat ? ' active' : ''}" data-cat="${c.id}">📁 ${c.label[lang]}</div>`).join('');
    side.querySelectorAll('.side-item').forEach((item) => {
      item.addEventListener('click', () => {
        activeCat = item.dataset.cat;
        paintSide();
        paintGrid();
      });
    });
  }

  function paintDetail(p) {
    if (!p) {
      detail.innerHTML = `<span style="color:var(--xp-text-dim)">${t('Выберите файл слева', 'Select a file on the left')}</span>`;
      return;
    }
    const homepageLabel = p.homepage_label ? p.homepage_label[lang] : t('Демо', 'Demo');
    detail.innerHTML = `
      <div class="f-name">${p.name}</div>
      <div>${p.description[lang]}</div>
      <div class="f-tags">${p.stack.map((s) => `<span class="f-tag">${s}</span>`).join('')}</div>
      ${p.note ? `<div class="f-note">${p.note[lang]}</div>` : ''}
      <div class="f-links">
        <a href="${p.github}" target="_blank" rel="noopener">📂 GitHub</a>
        ${p.homepage ? `<a href="${p.homepage}" target="_blank" rel="noopener">↗ ${homepageLabel}</a>` : ''}
      </div>
    `;
  }

  function paintGrid() {
    const list = PROJECTS.filter((p) => activeCat === 'all' || p.category === activeCat);
    grid.innerHTML = list
      .map((p) => `<div class="file-item${p.id === activeProject ? ' selected' : ''}" data-id="${p.id}"><span class="f-icon">${CATEGORY_ICON[p.category] || '📦'}</span><span>${p.name}</span></div>`)
      .join('');
    grid.querySelectorAll('.file-item').forEach((item) => {
      item.addEventListener('click', () => {
        activeProject = item.dataset.id;
        paintGrid();
        paintDetail(PROJECTS.find((p) => p.id === activeProject));
      });
      item.addEventListener('dblclick', () => {
        const p = PROJECTS.find((pr) => pr.id === item.dataset.id);
        if (p) window.open(p.github, '_blank', 'noopener');
      });
    });
  }

  paintSide();
  paintGrid();
  paintDetail(null);
}

function renderResume(root) {
  const lang = window.XP.lang();
  const t = window.XP.t;
  const edu = PROFILE.education;
  root.innerHTML = `
    <div class="xp-body">
      <div class="doc-page">
        <div class="doc-h1">${PROFILE.name[lang]}</div>
        <div style="color:var(--xp-accent);font-size:12.5px;">${PROFILE.role[lang]}</div>
        <div class="doc-h2">${t('О себе', 'Summary')}</div>
        ${PROFILE.about[lang].map((p) => `<p style="font-size:12.5px;color:var(--xp-text-dim);">${p}</p>`).join('')}
        <div class="doc-h2">${t('Опыт работы', 'Experience')}</div>
        ${PROFILE.experience
          .map(
            (job) => `<div class="doc-job">
              <div class="doc-job-head"><span>${job.title[lang]} — ${job.company[lang]}</span><span class="doc-period">${job.period[lang]}</span></div>
              <p>${job.summary[lang]}</p>
              ${job.highlight[lang] ? `<p class="highlight">◆ ${job.highlight[lang]}</p>` : ''}
              ${job.tasks[lang] && job.tasks[lang].length ? `<ul>${job.tasks[lang].map((tk) => `<li>${tk}</li>`).join('')}</ul>` : ''}
            </div>`
          )
          .join('')}
        <div class="doc-h2">${t('Образование', 'Education')}</div>
        <div class="doc-job">
          <div class="doc-job-head"><span>${edu.school[lang]}</span><span class="doc-period">${edu.year}</span></div>
          <p>${edu.degree[lang]}</p>
        </div>
      </div>
      <a class="xp-btn" href="/dossier?lang=${lang}" target="_blank">${t('🖨 Печать / PDF', '🖨 Print / PDF')}</a>
    </div>
  `;
}

function renderContact(root) {
  const lang = window.XP.lang();
  const t = window.XP.t;
  const c = PROFILE.contacts;
  const items = [
    { ic: '✉️', label: t('Email', 'Email'), value: c.email, href: `mailto:${c.email}` },
    { ic: '💬', label: 'Telegram', value: c.telegram_handle, href: c.telegram },
    { ic: '📂', label: 'GitHub', value: 'BlazeStudio', href: c.github },
    { ic: '💼', label: 'LinkedIn', value: t('Профиль', 'Profile'), href: c.linkedin },
    { ic: '📋', label: 'hh.ru', value: t('Резюме', 'Résumé'), href: c.hh },
  ];
  root.innerHTML = `<div class="xp-body"><div class="addr-list">${items
    .map((i) => `<a class="addr-row" href="${i.href}" target="_blank" rel="noopener"><span class="a-ic">${i.ic}</span><span><span class="a-label">${i.label}</span><br><span class="a-value">${i.value}</span></span></a>`)
    .join('')}</div></div>`;
}

function renderBin(root) {
  const t = window.XP.t;
  const items = [
    { ic: '📄', name: t('сомнения.exe', 'self_doubt.exe'), note: t('удалено безвозвратно', 'permanently deleted') },
    { ic: '📄', name: t('оправдания_почему_не_доделал_pet-проект.txt', 'excuses_for_unfinished_side_project.txt'), note: t('16 КБ', '16 KB') },
    { ic: '📄', name: t('план_Б.docx', 'plan_B.docx'), note: t('пока не понадобился', 'not needed yet') },
  ];
  root.innerHTML = `
    <div class="xp-body">
      <div class="bin-empty-note">${t('3 объекта, 0 надежд на восстановление', '3 items, 0 hope of recovery')}</div>
      ${items.map((i) => `<div class="bin-item"><span class="b-ic">${i.ic}</span><span class="b-name">${i.name}</span><span class="b-note">${i.note}</span></div>`).join('')}
    </div>
  `;
}

function renderGamesFolder(root) {
  const t = window.XP.t;
  const games = [
    { id: 'game-bughunt', ic: '🐛', name: t('Охота на баги', 'Bug Hunt'), best: localStorage.getItem('av-bughunt-best') || '0' },
    { id: 'game-memory', ic: '🧠', name: t('Память', 'Memory Match'), best: localStorage.getItem('av-memory-best') || '—' },
    { id: 'game-snake', ic: '🐍', name: 'Snake_Deploy', best: localStorage.getItem('av-snake-best') || '0' },
  ];
  root.innerHTML = `<div class="xp-body"><div class="games-list">${games
    .map((g) => `<div class="game-shortcut" data-id="${g.id}"><span class="g-ic">${g.ic}</span><span class="g-name">${g.name}</span><span class="g-best">${t('рекорд', 'best')}: ${g.best}</span></div>`)
    .join('')}</div></div>`;
  root.querySelectorAll('.game-shortcut').forEach((el) => el.addEventListener('click', () => window.XP.open(el.dataset.id)));
}

function renderConsole(root) {
  root.innerHTML = `
    <div id="term-output"></div>
    <div class="term-input-row">
      <span class="prompt">${window.XP.termPrompt}</span>
      <input id="term-input" type="text" autocomplete="off" spellcheck="false">
    </div>
  `;
  window.XP.initConsole(root, true);
}

function renderGame(kind) {
  return function (root) {
    const t = window.XP.t;
    let inner = '';
    if (kind === 'bughunt') {
      inner = `
        <div class="game-toolbar">
          <div class="game-stats"><span>${t('Счёт', 'Score')}: <b id="bughunt-score">0</b></span><span>${t('Время', 'Time')}: <b id="bughunt-time">20</b></span><span>${t('Рекорд', 'Best')}: <b id="bughunt-best">0</b></span></div>
          <button class="xp-btn" id="bughunt-start">${t('▶ Начать', '▶ Start')}</button>
        </div>
        <div id="bughunt-field"><pre id="bughunt-code"></pre></div>
      `;
    } else if (kind === 'memory') {
      inner = `
        <div class="game-toolbar">
          <div class="game-stats"><span>${t('Ходы', 'Moves')}: <b id="memory-moves">0</b></span><span>${t('Рекорд', 'Best')}: <b id="memory-best">—</b></span></div>
          <button class="xp-btn" id="memory-restart">${t('🔄 Заново', '🔄 Restart')}</button>
        </div>
        <div class="memory-grid" id="memory-grid"></div>
      `;
    } else if (kind === 'snake') {
      inner = `
        <div class="game-toolbar">
          <div class="game-stats"><span>${t('Запросов', 'Requests')}: <b id="snake-score">0</b></span><span>${t('Рекорд', 'Best')}: <b id="snake-best">0</b></span></div>
          <button class="xp-btn" id="snake-start">${t('▶ Деплой', '▶ Deploy')}</button>
        </div>
        <canvas id="snake-canvas" width="360" height="360"></canvas>
      `;
    }
    root.innerHTML = `<div class="xp-body">${inner}</div>`;
    window.XP.initGame(kind, root);
  };
}

/* =========================================================
   Registry
   ========================================================= */
const WINDOW_DEFS = {
  mypc: { title: { ru: 'Свойства системы', en: 'System Properties' }, icon: '🖥️', width: 540, height: 480, render: renderMyPC },
  projects: { title: { ru: 'Мои проекты', en: 'My Projects' }, icon: '📁', width: 660, height: 460, render: renderProjects },
  resume: { title: { ru: 'Резюме.doc — WordPad', en: 'Resume.doc — WordPad' }, icon: '📄', width: 560, height: 520, render: renderResume },
  games: { title: { ru: 'Игры', en: 'Games' }, icon: '🎮', width: 420, height: 260, render: renderGamesFolder },
  console: { title: { ru: 'Командная строка', en: 'Command Prompt' }, icon: '⌨️', width: 540, height: 400, render: renderConsole, extraClass: 'cmd-window', stateful: true },
  contact: { title: { ru: 'Адресная книга', en: 'Address Book' }, icon: '📇', width: 400, height: 380, render: renderContact },
  bin: { title: { ru: 'Корзина', en: 'Recycle Bin' }, icon: '🗑️', width: 420, height: 300, render: renderBin },
  'game-bughunt': { title: { ru: 'Охота на баги', en: 'Bug Hunt' }, icon: '🐛', width: 460, height: 400, render: renderGame('bughunt'), stateful: true },
  'game-memory': { title: { ru: 'Память', en: 'Memory Match' }, icon: '🧠', width: 400, height: 460, render: renderGame('memory'), stateful: true },
  'game-snake': { title: { ru: 'Snake_Deploy', en: 'Snake_Deploy' }, icon: '🐍', width: 420, height: 470, render: renderGame('snake'), stateful: true },
};

/* =========================================================
   Desktop icons / start menu / taskbar wiring
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  layoutDesktopIcons();

  const startBtn = document.getElementById('start-btn');
  const startMenu = document.getElementById('start-menu');
  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = startMenu.hidden;
    startMenu.hidden = !willOpen;
    startBtn.classList.toggle('active', willOpen);
  });
  document.addEventListener('click', (e) => {
    if (!startMenu.hidden && !startMenu.contains(e.target) && e.target !== startBtn) {
      startMenu.hidden = true;
      startBtn.classList.remove('active');
    }
  });
  startMenu.querySelectorAll('.sm-item[data-window]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openWindow(btn.dataset.window);
      startMenu.hidden = true;
      startBtn.classList.remove('active');
    });
  });
  document.getElementById('sm-shutdown').addEventListener('click', () => {
    startMenu.hidden = true;
    startBtn.classList.remove('active');
    window.XP.effects.shutdown();
  });
});
