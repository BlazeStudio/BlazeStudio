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
     Window manager. The desktop itself never scrolls — #nd-surface
     always exactly fills the viewport — so by default every window
     just sits in a responsive 3-column flex grid (CSS) that shares
     out the available space, wider or narrower depending on the
     monitor. Dragging a titlebar or the resize handle "detaches"
     that one window into free pixel positioning within the same
     fixed box; "Расставить" clears all detached state and lets
     everything fall back into the grid.
     ========================================================= */
  const GAMES = window.XP.GAMES || {};
  const GAME_KINDS = Object.keys(GAMES);
  const gameWinId = (kind) => 'game-' + kind;
  const GAME_WIN_IDS = GAME_KINDS.map(gameWinId);

  // Small "apps" that don't live in the template — built on the fly by
  // createAppWindow() below, same markup as the template's windows.
  const APP_TITLES = {
    taskmgr: ['Диспетчер задач Windows', 'Windows Task Manager'],
    calc: ['Калькулятор', 'Calculator'],
    notepad: ['Безымянный — Блокнот', 'Untitled — Notepad'],
  };
  GAME_KINDS.forEach((kind) => (APP_TITLES[gameWinId(kind)] = GAMES[kind].title));

  const WIN_ORDER = ['avatar', 'steam', 'faceit', 'explorer', 'console', 'github', 'codewars', 'contacts', 'music', 'games', 'videos', 'taskmgr', 'calc', 'notepad', ...GAME_WIN_IDS];
  const WIN_LABEL = {
    avatar: () => 'avatar.gif',
    steam: () => t('Steam', 'Steam'),
    faceit: () => 'FACEIT',
    explorer: () => t('Проводник', 'Explorer'),
    github: () => 'GitHub',
    codewars: () => 'Codewars',
    console: () => t('Консоль', 'Console'),
    contacts: () => t('Контакты', 'Contacts'),
    music: () => 'Winamp',
    games: () => t('Игры', 'Games'),
    videos: () => t('Видео', 'Videos'),
    taskmgr: () => t('Диспетчер задач', 'Task Manager'),
  };
  Object.keys(APP_TITLES).forEach((id) => {
    if (!WIN_LABEL[id]) WIN_LABEL[id] = () => t(APP_TITLES[id][0], APP_TITLES[id][1]);
  });
  const WIN_ICON = {
    avatar: 'ico-avatar',
    steam: 'ico-steam',
    faceit: 'ico-faceit',
    explorer: 'ico-folder',
    github: 'ico-github',
    codewars: 'ico-codewars',
    console: 'ico-console',
    contacts: 'ico-contacts',
    music: 'ico-music',
    games: 'ico-games',
    videos: 'ico-videos',
    taskmgr: 'ico-taskmgr',
    calc: 'ico-calc',
    notepad: 'ico-notepad',
  };
  GAME_KINDS.forEach((kind) => (WIN_ICON[gameWinId(kind)] = GAMES[kind].icon));

  // Default size for windows that float over the desktop instead of taking a
  // slot in the grid — they open centered-ish, cascading, at this size.
  const FLOAT_SIZE = {
    music: [300, 460],
    games: [470, 320],
    videos: [480, 420],
    taskmgr: [440, 440],
    calc: [262, 322],
    notepad: [500, 380],
  };
  GAME_KINDS.forEach((kind) => (FLOAT_SIZE[gameWinId(kind)] = GAMES[kind].size));
  const MIN_WIN_W = 200;
  const MIN_WIN_H = 140;
  // The Steam window packs an avatar row, a stat grid, a recent-games list
  // and an inventory grid — it needs more room than a generic window before
  // its content starts overflowing its own borders when shrunk.
  const MIN_SIZE = {
    steam: { w: 260, h: 300 },
  };
  function minSizeFor(id) {
    const m = MIN_SIZE[id];
    return { w: (m && m.w) || MIN_WIN_W, h: (m && m.h) || MIN_WIN_H };
  }


  // Reliable tap on iOS/Android: click alone often fails on small titlebar
  // buttons when ancestors use touch-action:none / pointer handlers.
  // pointerup (touch/pen) + click, with a short guard against double-fire.
  function onTap(el, handler) {
    if (!el) return;
    let last = 0;
    const run = (e) => {
      const now = Date.now();
      if (now - last < 350) return;
      last = now;
      handler(e);
    };
    el.addEventListener('click', run);
    el.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        e.preventDefault();
        e.stopPropagation();
        run(e);
      }
    }, { passive: false });
  }


  // hidden = not on screen (minimized or closed); closed = a floating app
  // that's been shut entirely, so it drops off the taskbar too.
  const state = { hidden: {}, closed: {}, detached: {}, preMax: {}, z: {}, tab: 'resume' };
  let zOrder = []; // back-to-front stacking order, kept short so z-index never has to grow unbounded (and stays well under the taskbar's)

  function winEl(id) {
    return document.getElementById('nd-win-' + id);
  }

  function surfaceRect() {
    return document.getElementById('nd-surface').getBoundingClientRect();
  }

  // Captures the window's CURRENT on-screen box (wherever the responsive
  // grid put it) as pixel coordinates, so the first drag/resize frame
  // doesn't jump. A no-op if it's already detached.
  function ensureDetached(id) {
    if (state.detached[id]) return state.detached[id];
    const el = winEl(id);
    const wr = el.getBoundingClientRect();
    const sr = surfaceRect();
    // Keep the captured box in exact (sub-pixel) coordinates rather than
    // rounding — rounding here is what used to produce a ~1px snap the
    // instant a window detaches, visible as a tiny jump on the first touch.
    const d = { left: wr.left - sr.left, top: wr.top - sr.top, width: wr.width, height: wr.height };
    state.detached[id] = d;
    return d;
  }

  // A detached or maximized window is pulled out of its column's flex flow
  // by its own CSS (position: absolute/fixed), which otherwise frees up its
  // slot and makes sibling windows grow/shift to fill the gap. Keep an
  // invisible placeholder with the same flex-grow/max-height in its spot for
  // as long as it's out of flow, so the rest of the column never reflows.
  function placeholderIdFor(id) {
    return 'nd-ph-' + id;
  }
  function showPlaceholder(id) {
    if (document.getElementById(placeholderIdFor(id))) return;
    const el = winEl(id);
    if (!el || !el.parentNode) return;
    const ph = document.createElement('div');
    ph.id = placeholderIdFor(id);
    ph.className = 'nd-win-placeholder';
    ph.style.flexGrow = el.style.flexGrow || '1';
    ph.style.maxHeight = el.style.maxHeight || '';
    el.parentNode.insertBefore(ph, el);
  }
  function hidePlaceholder(id) {
    const ph = document.getElementById(placeholderIdFor(id));
    if (ph) ph.remove();
  }
  // Winamp/mini-games/Video live directly under #nd-surface, not inside a
  // #nd-grid column — they're always position:absolute (see CSS) even before
  // their first drag, so there's no column slot to preserve. Giving them a
  // placeholder anyway inserted a flex-grow:1 sibling straight into
  // #nd-surface's OWN row flex (icons + grid), squeezing #nd-grid every time
  // one of these was dragged or maximized — worse with each one, since each
  // left its own leftover placeholder competing for the same row.
  const FLOATING_WIN_IDS = new Set(['music', 'games', 'videos', 'taskmgr', 'calc', 'notepad', ...GAME_WIN_IDS]);
  function syncPlaceholder(id) {
    if (FLOATING_WIN_IDS.has(id)) {
      hidePlaceholder(id);
      return;
    }
    if (state.detached[id] || isMaximized(id)) showPlaceholder(id);
    else hidePlaceholder(id);
  }

  function applyWinStyle(id) {
    const el = winEl(id);
    if (!el) return;
    const d = state.detached[id];
    // Reserve the placeholder's space before the window itself leaves flow,
    // so the column never has a frame where the slot is briefly unclaimed.
    syncPlaceholder(id);
    if (d) {
      el.classList.add('nd-detached');
      el.style.left = d.left + 'px';
      el.style.top = d.top + 'px';
      el.style.width = d.width + 'px';
      el.style.height = d.height + 'px';
    } else {
      el.classList.remove('nd-detached');
      el.style.left = '';
      el.style.top = '';
      el.style.width = '';
      el.style.height = '';
    }
    el.style.zIndex = state.z[id] || 1;
  }

  function raise(id) {
    zOrder = zOrder.filter((x) => x !== id);
    zOrder.push(id);
    zOrder.forEach((wid, i) => {
      state.z[wid] = 10 + i;
      const el = winEl(wid);
      if (el) el.style.zIndex = state.z[wid];
    });
    syncTaskbar();
  }

  function setHidden(id, val) {
    state.hidden[id] = val;
    const el = winEl(id);
    if (el) el.classList.toggle('nd-hidden', !!val);
    syncTaskbar();
  }

  function toggleWin(id) {
    if (state.hidden[id]) show(id);
    else setHidden(id, true);
  }

  // Per-window lifecycle hooks: ON_OPEN runs when a floating app goes from
  // closed to open (not on restore-from-minimized), ON_CLOSE when it's shut.
  const ON_OPEN = {};
  const ON_CLOSE = {};

  let cascade = 0;
  function defaultBox(id) {
    const sr = surfaceRect();
    const [dw, dh] = FLOAT_SIZE[id] || [420, 360];
    const w = Math.min(dw, sr.width - 20);
    const h = Math.min(dh, sr.height - 20);
    const step = (cascade++ % 8) * 26;
    return {
      left: Math.max(10, Math.min(sr.width - w - 10, Math.round((sr.width - w) / 2) - 80 + step)),
      top: Math.max(10, Math.min(sr.height - h - 10, Math.round((sr.height - h) / 2) - 70 + step)),
      width: w,
      height: h,
    };
  }

  // Running = not closed. Minimizing (_) keeps a window running; closing (×
  // or Task Manager's End Task) doesn't. Grid windows keep a taskbar button
  // even when closed (it reopens them); floating apps drop off the taskbar.
  function isOpen(id) {
    return !state.closed[id];
  }

  function closeWin(id) {
    if (state.closed[id]) return;
    state.closed[id] = true;
    if (ON_CLOSE[id]) ON_CLOSE[id]();
    if (isMaximized(id)) toggleMaximize(id);
    setHidden(id, true);
  }

  // The topmost window that's actually on screen — the one keyboard-driven
  // games and the calculator listen to.
  function activeWinId() {
    for (let i = zOrder.length - 1; i >= 0; i -= 1) {
      if (!state.hidden[zOrder[i]]) return zOrder[i];
    }
    return null;
  }
  window.XP.isGameActive = function (root) {
    const w = root && root.closest ? root.closest('.nd-win') : null;
    return !!w && w.id === 'nd-win-' + activeWinId();
  };

  function show(id) {
    if (!winEl(id)) return;
    if (state.closed[id] && !FLOATING_WIN_IDS.has(id)) state.closed[id] = false;
    if (FLOATING_WIN_IDS.has(id) && state.closed[id]) {
      state.closed[id] = false;
      if (!state.detached[id] && !isMaximized(id)) {
        state.detached[id] = defaultBox(id);
        applyWinStyle(id);
      }
      if (ON_OPEN[id]) ON_OPEN[id]();
    }
    if (state.hidden[id]) setHidden(id, false);
    raise(id);
    // iOS: virtual keyboard / caret only appear after an explicit focus
    // following a user gesture; reopen console with input ready.
    if (id === 'console') {
      setTimeout(() => {
        const input = document.getElementById('term-input');
        if (input) {
          try { input.focus({ preventScroll: false }); } catch (_) { input.focus(); }
        }
      }, 60);
    }
  }

  function isMaximized(id) {
    const el = winEl(id);
    return !!el && el.classList.contains('nd-maximized');
  }

  function toggleMaximize(id) {
    const el = winEl(id);
    if (!el) return;
    if (isMaximized(id)) {
      el.classList.remove('nd-maximized');
      state.detached[id] = state.preMax[id] || null;
      if (!state.detached[id]) delete state.detached[id];
      delete state.preMax[id];
      applyWinStyle(id);
    } else {
      state.preMax[id] = state.detached[id] ? Object.assign({}, state.detached[id]) : null;
      el.classList.add('nd-maximized');
      syncPlaceholder(id);
      raise(id);
    }
    updateMaxIcon(id);
  }

  function updateMaxIcon(id) {
    const el = winEl(id);
    if (!el) return;
    const use = el.querySelector('.nd-max use');
    if (use) use.setAttribute('href', isMaximized(id) ? '#ico-restore' : '#ico-maximize');
    const btn = el.querySelector('.nd-max');
    if (btn) btn.setAttribute('aria-label', isMaximized(id) ? t('Восстановить окно', 'Restore window') : t('Развернуть окно', 'Maximize window'));
  }

  function startDrag(id) {
    return function (e) {
      if (window.innerWidth <= 900) return; // windows go fixed full-screen on mobile — nothing to drag
      if (e.button !== undefined && e.button !== 0) return;
      if (e.target.closest('button')) return;
      if (isMaximized(id)) return; // dragging a maximized window doesn't make sense
      const sx = e.clientX;
      const sy = e.clientY;
      let dragging = false;
      let base = null;
      // Detaching (flex item -> absolute-positioned) only once the pointer
      // has actually moved, not on every titlebar mousedown, so a plain
      // click-to-focus never touches the window's layout mode at all — that
      // switch is what could produce a tiny visible hop, and a click that
      // was never going to drag has no reason to risk it.
      function move(ev) {
        if (!dragging) {
          if (Math.abs(ev.clientX - sx) < 4 && Math.abs(ev.clientY - sy) < 4) return;
          dragging = true;
          const d = ensureDetached(id);
          base = { left: d.left, top: d.top };
          applyWinStyle(id);
          raise(id);
        }
        state.detached[id].left = base.left + (ev.clientX - sx);
        state.detached[id].top = base.top + (ev.clientY - sy);
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

  function startResize(id) {
    return function (e) {
      if (window.innerWidth <= 900) return; // windows go fixed full-screen on mobile — nothing to resize
      if (e.button !== undefined && e.button !== 0) return;
      if (isMaximized(id)) return;
      e.stopPropagation(); // don't let the window's own pointerdown->raise fight this
      e.preventDefault();
      const d = ensureDetached(id);
      applyWinStyle(id);
      const sx = e.clientX;
      const sy = e.clientY;
      const base = { width: d.width, height: d.height };
      const sr = surfaceRect();
      const maxW = Math.round(sr.width * 0.94); // a resize handle can make a window big, but never big enough to bury the whole desktop under it — use Maximize for that
      const maxH = Math.round(sr.height * 0.94);
      const min = minSizeFor(id);
      raise(id);
      function move(ev) {
        state.detached[id].width = Math.min(maxW, Math.max(min.w, Math.round(base.width + (ev.clientX - sx))));
        state.detached[id].height = Math.min(maxH, Math.max(min.h, Math.round(base.height + (ev.clientY - sy))));
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
      onTap(min, () => toggleWin(id));
      const close = el.querySelector('.nd-x');
      onTap(close, () => closeWin(id));
      const maxBtn = el.querySelector('.nd-max');
      onTap(maxBtn, () => toggleMaximize(id));
      const resizeHandle = el.querySelector('.nd-resize');
      if (resizeHandle) resizeHandle.addEventListener('pointerdown', startResize(id));
      el.addEventListener('pointerdown', () => raise(id));
      raise(id);
    });
  }

  function taskbarIds() {
    return WIN_ORDER.filter((id) => winEl(id) && (!FLOATING_WIN_IDS.has(id) || isOpen(id)));
  }

  // XP windows carry their app icon at the left of the title bar.
  function addTitlebarIcons() {
    WIN_ORDER.forEach((id) => {
      const tb = winEl(id) && winEl(id).querySelector('.nd-tb');
      if (!tb || tb.querySelector('.nd-tb-ico') || !WIN_ICON[id]) return;
      tb.insertAdjacentHTML('afterbegin', `<svg class="nd-tb-ico" width="16" height="16" aria-hidden="true"><use href="#${WIN_ICON[id]}"></use></svg>`);
    });
  }

  function syncTaskbar() {
    const bar = document.getElementById('nd-tasks');
    if (!bar) return;
    bar.innerHTML = '';
    const ids = taskbarIds();
    ids.forEach((id) => {
      const btn = document.createElement('button');
      const hidden = !!state.hidden[id];
      btn.className = 'nd-task' + (hidden ? '' : ' active');
      btn.innerHTML = `<svg aria-hidden="true"><use href="#${WIN_ICON[id]}"></use></svg>`;
      btn.title = WIN_LABEL[id]();
      btn.setAttribute('aria-label', (hidden ? t('Показать окно ', 'Show window ') : t('Скрыть окно ', 'Hide window ')) + WIN_LABEL[id]());
      onTap(btn, () => toggleWin(id));
      bar.appendChild(btn);
    });
    const allBtn = document.getElementById('nd-toggle-all');
    const allVisible = ids.every((id) => !state.hidden[id]);
    if (allBtn) allBtn.textContent = allVisible ? t('Свернуть всё', 'Hide all') : t('Показать всё', 'Show all');
    if (isOpen('taskmgr') && !state.hidden.taskmgr) updateTaskmgr();
  }

  function arrange() {
    cascade = 0;
    WIN_ORDER.forEach((id) => {
      if (isMaximized(id)) toggleMaximize(id);
      delete state.detached[id];
      // Open floating apps get re-cascaded; closed ones get a fresh spot next time they open.
      if (FLOATING_WIN_IDS.has(id) && isOpen(id)) state.detached[id] = defaultBox(id);
      applyWinStyle(id);
    });
    window.XP.toast(t('Окна расставлены по местам.', 'Windows arranged.'));
  }

  function toggleAll() {
    const ids = taskbarIds();
    const allVisible = ids.every((id) => !state.hidden[id]);
    ids.forEach((id) => {
      if (!allVisible) state.closed[id] = false; // "show all" reopens closed grid windows too
      setHidden(id, allVisible);
    });
  }

  /* Builds a floating app window with the same chrome as the template's. */
  function createAppWindow(id, opts) {
    if (winEl(id)) return winEl(id);
    const [ru, en] = APP_TITLES[id];
    const el = document.createElement('div');
    el.className = 'nd-win nd-hidden nd-app' + (opts && opts.cls ? ' ' + opts.cls : '');
    el.id = 'nd-win-' + id;
    el.innerHTML = `
      <div class="nd-tb"><svg class="nd-tb-ico" width="16" height="16" aria-hidden="true"><use href="#${WIN_ICON[id]}"></use></svg><span class="nd-cap" data-ru="${ru}" data-en="${en}">${t(ru, en)}</span><button class="nd-min" aria-label="${t('Свернуть', 'Minimize')}">_</button>${
        opts && opts.fixed ? '' : `<button class="nd-max" aria-label="${t('Развернуть', 'Maximize')}"><svg width="14" height="14" aria-hidden="true"><use href="#ico-maximize"></use></svg></button>`
      }<button class="nd-x" aria-label="${t('Закрыть', 'Close')}">×</button></div>
      <div class="nd-body${opts && opts.bodyCls ? ' ' + opts.bodyCls : ''}" id="nd-${id}-body"></div>
      ${opts && opts.fixed ? '' : '<div class="nd-resize" aria-hidden="true"></div>'}`;
    document.getElementById('nd-surface').appendChild(el);
    return el;
  }

  /* =========================================================
     Explorer — tabs + content panels
     ========================================================= */
  const TAB_NAME = {
    resume: { ru: 'Резюме', en: 'Résumé' },
    pdf: { ru: 'Резюме (PDF)', en: 'Résumé (PDF)' },
    projects: { ru: 'Проекты', en: 'Projects' },
    screens: { ru: 'Скриншоты Steam', en: 'Steam screenshots' },
    links: { ru: 'Сервисы', en: 'Services' },
  };

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

  function wirePanelTaps(root) {
    // Kept as a no-op hook: the document-level pointerup→click safety net
    // (see DOMContentLoaded) covers explorer/games content without double-firing.
    // CSS fix (#nd-surface overflow:visible on mobile) is the real cure.
    void root;
  }

  function renderTabPanel(tab) {
    cleanupScreenNav();
    const panel = document.getElementById('nd-explorer-panel');
    if (!panel) return;
    const l = lang();
    if (tab === 'resume') panel.innerHTML = resumeHtml(l);
    else if (tab === 'pdf') panel.innerHTML = pdfHtml(l);
    else if (tab === 'projects') panel.innerHTML = projectsHtml(l);
    else if (tab === 'screens') {
      panel.innerHTML = screensHtml();
      loadScreens(panel);
    } else if (tab === 'links') panel.innerHTML = linksHtml(l);
    wirePanelTaps(panel);
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
    return `<div class="nd-screens">
      <div class="nd-big-shot-row">
        <button type="button" class="nd-shot-nav" id="nd-shot-prev" aria-label="${t('Предыдущий скриншот', 'Previous screenshot')}">‹</button>
        <div class="nd-big-shot" id="nd-big-shot">${t('Загрузка…', 'Loading…')}</div>
        <button type="button" class="nd-shot-nav" id="nd-shot-next" aria-label="${t('Следующий скриншот', 'Next screenshot')}">›</button>
      </div>
      <div class="nd-shots-grid" id="nd-shots-grid"></div>
    </div>`;
  }

  /* Shared between the inline "big shot" viewer and the fullscreen lightbox
     so both ‹ › buttons and the arrow keys work in either place. */
  const screenState = { shots: [] };
  let screenKeyHandler = null;

  function paintBigShot(bigEl, s) {
    const linkHtml = s.view_url ? `<div class="nd-big-shot-link"><a href="${s.view_url}" target="_blank" rel="noopener">${t('Открыть на Steam ↗', 'Open on Steam ↗')}</a></div>` : '';
    bigEl.innerHTML = `<img src="${s.full}" alt="${s.title || ''}" draggable="false"><div class="nd-big-shot-hint">${t('нажмите, чтобы открыть на весь экран', 'click to open full screen')}</div>${linkHtml}`;
    bigEl.setAttribute('role', 'button');
    bigEl.setAttribute('tabindex', '0');
    bigEl.title = t('Открыть на весь экран', 'Open full screen');
    // Replace previous handlers (showShot re-paints often)
    bigEl.onclick = null;
    bigEl.onkeydown = null;
    const openShot = (e) => {
      if (e && e.target && e.target.closest && e.target.closest('a')) return;
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      openLightbox(s.full, s.view_url, true);
    };
    bigEl.onclick = openShot;
    bigEl.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openShot(e);
      }
    };
    // Dedicated touch path — some iOS builds drop click on non-<button> divs
    bigEl.ontouchend = (e) => {
      if (e.target && e.target.closest && e.target.closest('a')) return;
      e.preventDefault();
      openShot(e);
    };
  }

  function showShot(index) {
    const shots = screenState.shots;
    if (!shots.length) return;
    const i = ((index % shots.length) + shots.length) % shots.length;
    screenState.index = i;
    const s = shots[i];
    const bigEl = document.getElementById('nd-big-shot');
    if (bigEl) paintBigShot(bigEl, s);
    document.querySelectorAll('#nd-shots-grid .nd-shot').forEach((btn) => btn.classList.toggle('active', Number(btn.dataset.i) === i));
    const overlay = document.getElementById('nd-lightbox');
    if (overlay && !overlay.hidden && overlay.dataset.nav === 'screens') setLightboxImage(s.full, s.view_url);
  }

  function cleanupScreenNav() {
    if (screenKeyHandler) {
      document.removeEventListener('keydown', screenKeyHandler);
      screenKeyHandler = null;
    }
  }

  async function loadScreens(root) {
    const bigEl = document.getElementById('nd-big-shot');
    const gridEl = document.getElementById('nd-shots-grid');
    if (!bigEl || !gridEl) return;
    const prevBtn = root.querySelector('#nd-shot-prev');
    const nextBtn = root.querySelector('#nd-shot-next');
    if (prevBtn) prevBtn.addEventListener('click', () => showShot(screenState.index - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => showShot(screenState.index + 1));
    cleanupScreenNav();
    screenKeyHandler = (e) => {
      // the lightbox has its own keydown handling while it's open
      const overlay = document.getElementById('nd-lightbox');
      if (overlay && !overlay.hidden) return;
      if (e.key === 'ArrowLeft') showShot(screenState.index - 1);
      else if (e.key === 'ArrowRight') showShot(screenState.index + 1);
    };
    document.addEventListener('keydown', screenKeyHandler);
    try {
      const data = await fetchScreenshots();
      const shots = (data.screenshots && data.screenshots.screenshots) || [];
      screenState.shots = shots;
      screenState.index = 0;
      if (!shots.length) {
        bigEl.textContent = t('Скриншотов пока нет (Steam не подключен или профиль приватный).', 'No screenshots yet (Steam not connected, or the profile is private).');
        gridEl.innerHTML = '';
        return;
      }
      showShot(0);
      gridEl.innerHTML = shots.map((s, i) => `<button type="button" class="nd-shot${i === 0 ? ' active' : ''}" data-i="${i}"><img src="${s.thumb}" alt="${s.title || ''}" loading="lazy"></button>`).join('');
      gridEl.querySelectorAll('.nd-shot').forEach((btn) => {
        btn.addEventListener('click', () => showShot(Number(btn.dataset.i)));
      });
    } catch (e) {
      bigEl.textContent = t('Не удалось загрузить скриншоты.', 'Could not load screenshots.');
    }
  }

  /* =========================================================
     Video — its own standalone window (like Winamp/mini-games), not an
     Explorer tab. Whatever's dropped into static/video/ (read server-side
     by api/video_sync.py, titles overridden via api/data/video_titles.py)
     shows up as a large-icons grid on open; picking one swaps the grid for
     a player, with a way back to the grid instead of a separate window.
     ========================================================= */
  const videoState = { videos: [], index: -1 };

  function videoIconsHtml(videos) {
    return `<div class="nd-videos-grid">${videos
      .map(
        (v, i) => `
      <button type="button" class="nd-video-icon" data-i="${i}">
        ${v.icon ? `<img src="${v.icon}" alt="" width="40" height="40">` : `<svg width="40" height="40" aria-hidden="true"><use href="#ico-video"></use></svg>`}
        <span>${v.title}</span>
      </button>`
      )
      .join('')}</div>`;
  }

  function videoPlayerHtml(v) {
    return `<div class="nd-video-player">
      <button type="button" class="nd-btn98 nd-video-back">${t('‹ К списку', '‹ Back to list')}</button>
      <video src="${v.url}" controls autoplay></video>
      <div class="nd-video-title">${v.title}</div>
    </div>`;
  }

  function renderVideoView() {
    const app = document.getElementById('nd-videos-app');
    if (!app) return;
    if (videoState.index === -1) {
      app.innerHTML = videoIconsHtml(videoState.videos);
      app.querySelectorAll('.nd-video-icon').forEach((btn) => {
        btn.addEventListener('click', () => {
          videoState.index = Number(btn.dataset.i);
          renderVideoView();
        });
      });
    } else {
      app.innerHTML = videoPlayerHtml(videoState.videos[videoState.index]);
      const back = app.querySelector('.nd-video-back');
      if (back) {
        back.addEventListener('click', () => {
          videoState.index = -1;
          renderVideoView();
        });
      }
    }
  }

  async function loadVideos() {
    const app = document.getElementById('nd-videos-app');
    if (!app) return;
    try {
      const res = await fetch('/api/video');
      const data = await res.json();
      videoState.videos = (data && data.videos) || [];
    } catch (e) {
      videoState.videos = [];
    }
    videoState.index = -1;
    if (!videoState.videos.length) {
      app.innerHTML = `<div class="nd-music-empty">
        <div class="nd-wa-art nd-wa-art-empty">🎬</div>
        <p>${t(
          'Видео пока нет. Положи mp4/webm файлы в static/video/ — они появятся здесь сами.',
          "No videos yet. Drop mp4/webm files into static/video/ and they'll show up here on their own."
        )}</p>
      </div>`;
      return;
    }
    renderVideoView();
  }

  function initVideosWin() {
    const body = document.getElementById('nd-videos-body');
    if (!body) return;
    body.innerHTML = `<div id="nd-videos-app">${t('Загрузка…', 'Loading…')}</div>`;
    loadVideos();
  }

  function stopVideoPlayback() {
    const app = document.getElementById('nd-videos-app');
    const video = app && app.querySelector('video');
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  }

  /* =========================================================
     Lightbox — fullscreen view, navigable when opened on a screenshot
     (nav === true); a single still image (e.g. from the item popup) when not.
     ========================================================= */
  function setLightboxImage(src, viewUrl) {
    const img = document.getElementById('nd-lightbox-img');
    const link = document.getElementById('nd-lightbox-link');
    if (img) img.src = src;
    if (link) {
      if (viewUrl) {
        link.href = viewUrl;
        link.hidden = false;
      } else {
        link.hidden = true;
      }
    }
  }
  function openLightbox(src, viewUrl, nav) {
    const overlay = document.getElementById('nd-lightbox');
    if (!overlay) {
      console.warn('[lightbox] #nd-lightbox missing from DOM');
      return;
    }
    setLightboxImage(src, viewUrl);
    overlay.dataset.nav = nav ? 'screens' : '';
    const prevBtn = document.getElementById('nd-lightbox-prev');
    const nextBtn = document.getElementById('nd-lightbox-next');
    if (prevBtn) prevBtn.hidden = !nav;
    if (nextBtn) nextBtn.hidden = !nav;
    // Remove [hidden] entirely — CSS uses #nd-lightbox[hidden]{display:none!important}
    // which beats an inline display:flex unless the attribute is gone.
    overlay.removeAttribute('hidden');
    overlay.style.setProperty('display', 'flex', 'important');
    overlay.style.setProperty('z-index', '9999', 'important');
    overlay.style.setProperty('position', 'fixed', 'important');
    overlay.style.setProperty('inset', '0', 'important');
    // Move to <body> so no ancestor transform/overflow can clip or trap it
    if (overlay.parentElement !== document.body) {
      document.body.appendChild(overlay);
    }
  }
  function closeLightbox() {
    const overlay = document.getElementById('nd-lightbox');
    if (!overlay) return;
    overlay.setAttribute('hidden', '');
    overlay.style.removeProperty('display');
    overlay.style.removeProperty('z-index');
    overlay.style.removeProperty('position');
    overlay.style.removeProperty('inset');
  }
  function initLightbox() {
    const overlay = document.getElementById('nd-lightbox');
    const closeBtn = document.getElementById('nd-lightbox-close');
    const prevBtn = document.getElementById('nd-lightbox-prev');
    const nextBtn = document.getElementById('nd-lightbox-next');
    if (!overlay) return;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeLightbox();
    });
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (prevBtn) prevBtn.addEventListener('click', () => showShot(screenState.index - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => showShot(screenState.index + 1));
    document.addEventListener('keydown', (e) => {
      if (overlay.hidden) return;
      if (e.key === 'Escape') closeLightbox();
      else if (overlay.dataset.nav === 'screens' && e.key === 'ArrowLeft') showShot(screenState.index - 1);
      else if (overlay.dataset.nav === 'screens' && e.key === 'ArrowRight') showShot(screenState.index + 1);
    });
  }

  /* =========================================================
     Item popup — a small card with an inventory item's details, instead of
     blowing it up to fullscreen like a screenshot.
     ========================================================= */
  function openItemPopup(it) {
    const overlay = document.getElementById('nd-item-popup');
    if (!overlay) return;
    const img = document.getElementById('nd-item-popup-img');
    const name = document.getElementById('nd-item-popup-name');
    const meta = document.getElementById('nd-item-popup-meta');
    const link = document.getElementById('nd-item-popup-link');
    if (img) img.src = it.icon || '';
    if (name) name.textContent = it.name;
    const paint = (loading) => {
      if (!meta || overlay.dataset.item !== (it.market_url || '')) return; // another item was opened meanwhile
      let price;
      if (it.price_rub != null) {
        const note = it.price_source === 'live' ? t('Steam Market, сейчас', 'Steam Market, now') : t('Steam Market, последняя известная', 'Steam Market, last known');
        price = `${Math.round(it.price_rub).toLocaleString('ru-RU')} ₽<span class="nd-item-popup-note">${note}</span>`;
      } else {
        price = loading ? t('Узнаём цену на Steam Market…', 'Checking the Steam Market price…') : t('Цена неизвестна', 'Price unknown');
      }
      const bits = [it.exterior, it.rarity].filter(Boolean).join(' · ');
      meta.innerHTML = `${bits ? `<div>${bits}</div>` : ''}<div class="nd-item-popup-price">${price}</div>`;
    };
    overlay.dataset.item = it.market_url || '';
    // Not live-priced yet (snapshot figure or none at all) — ask the Market now.
    const needsPrice = it.market_url && it.price_source !== 'live' && !it.priceChecked;
    paint(needsPrice);
    if (needsPrice) {
      it.priceChecked = true;
      const marketName = decodeURIComponent(it.market_url.split('/').pop());
      fetch('/api/steam/price?name=' + encodeURIComponent(marketName))
        .then((r) => r.json())
        .then((res) => {
          if (res && res.price_rub != null) {
            it.price_rub = res.price_rub;
            it.price_source = res.source;
          }
        })
        .catch(() => {})
        .finally(() => paint(false));
    }
    if (link) {
      if (it.market_url) {
        link.href = it.market_url;
        link.hidden = false;
        link.textContent = t('Открыть на Steam Market ↗', 'Open on Steam Market ↗');
      } else {
        link.hidden = true;
      }
    }
    overlay.hidden = false;
  }
  function closeItemPopup() {
    const overlay = document.getElementById('nd-item-popup');
    if (overlay) overlay.hidden = true;
  }
  function initItemPopup() {
    const overlay = document.getElementById('nd-item-popup');
    const closeBtn = document.getElementById('nd-item-popup-close');
    if (!overlay) return;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeItemPopup();
    });
    if (closeBtn) closeBtn.addEventListener('click', closeItemPopup);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.hidden) closeItemPopup();
    });
  }

  /* =========================================================
     Games — a folder window listing every game as a large icon; each game
     opens in its own window (mounted by games.js on open, torn down on
     close, so a closed game costs nothing).
     ========================================================= */
  function renderGamesFolder() {
    const body = document.getElementById('nd-games-body');
    if (!body) return;
    body.innerHTML = `
      <div class="nd-folder-grid">${GAME_KINDS.map((kind) => {
        const [ru, en] = GAMES[kind].title;
        return `<button type="button" class="nd-folder-item" data-game="${kind}">
          <svg width="40" height="40" aria-hidden="true"><use href="#${GAMES[kind].icon}"></use></svg>
          <span data-ru="${ru}" data-en="${en}">${t(ru, en)}</span>
        </button>`;
      }).join('')}</div>
      <div class="nd-folder-status">${t('Объектов', 'Objects')}: ${GAME_KINDS.length}</div>`;
    body.querySelectorAll('.nd-folder-item').forEach((btn) => onTap(btn, () => show(gameWinId(btn.dataset.game))));
  }

  const gameCleanups = {};
  function initGameWindows() {
    GAME_KINDS.forEach((kind) => {
      const id = gameWinId(kind);
      createAppWindow(id, { bodyCls: 'nd-game-body' });
      const body = document.getElementById(`nd-${id}-body`);
      // A focused button would turn the next Space press (pause/drop/spin)
      // into a click on itself — games use Space, so buttons give focus back.
      body.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (b) b.blur();
      });
      ON_OPEN[id] = () => {
        gameCleanups[id] = window.XP.mountGame(kind, body);
      };
      ON_CLOSE[id] = () => {
        if (gameCleanups[id]) gameCleanups[id]();
        delete gameCleanups[id];
        body.innerHTML = '';
      };
    });
  }

  /* =========================================================
     Task Manager — "Applications" lists the real open windows (End Task
     really closes them), "Processes" maps them onto XP-era process names,
     "Performance" draws CPU/memory history. The load figures are simulated
     (a page can't read real CPU usage) but track what's actually open —
     each running real-time game adds visible load.
     ========================================================= */
  const PROC_NAMES = {
    avatar: 'mspaint.exe',
    steam: 'steam.exe',
    faceit: 'faceit.exe',
    explorer: 'explorer.exe',
    console: 'cmd.exe',
    github: 'github.exe',
    codewars: 'codewars.exe',
    contacts: 'msmsgs.exe',
    music: 'winamp.exe',
    games: 'explorer.exe',
    videos: 'wmplayer.exe',
    taskmgr: 'taskmgr.exe',
    calc: 'calc.exe',
    notepad: 'notepad.exe',
    'game-mines': 'winmine.exe',
    'game-slots': 'slots.exe',
    'game-snake': 'snake.exe',
    'game-tetris': 'tetris.exe',
    'game-breakout': 'arkanoid.exe',
    'game-g2048': '2048.exe',
  };
  const SYSTEM_PROCS = [
    ['System', 'SYSTEM', 236],
    ['smss.exe', 'SYSTEM', 388],
    ['csrss.exe', 'SYSTEM', 3480],
    ['winlogon.exe', 'SYSTEM', 2904],
    ['services.exe', 'SYSTEM', 3612],
    ['lsass.exe', 'SYSTEM', 1320],
    ['svchost.exe', 'SYSTEM', 4876],
    ['svchost.exe', 'NETWORK SERVICE', 3104],
    ['spoolsv.exe', 'SYSTEM', 4410],
  ];
  const CRITICAL_PROCS = new Set(['csrss.exe', 'winlogon.exe', 'smss.exe']);
  const PROC_MEM = { 'explorer.exe': 21480, 'iexplore.exe': 18760, 'steam.exe': 34120, 'wmplayer.exe': 15630, 'winamp.exe': 9820, 'cmd.exe': 2110 };
  const tm = { tab: 'apps', selected: null, timer: null, cpu: Array(60).fill(0), mem: Array(60).fill(0), load: 4, startedAt: Date.now(), rowsSig: '' };

  // What "Новая задача…" understands — program names map onto this desktop's windows.
  const RUN_TARGETS = {
    calc: 'calc', notepad: 'notepad', cmd: 'console', command: 'console', console: 'console', taskmgr: 'taskmgr',
    explorer: 'explorer', winamp: 'music', wmplayer: 'videos', mspaint: 'avatar', steam: 'steam',
    faceit: 'faceit', github: 'github', codewars: 'codewars', msmsgs: 'contacts', games: 'games', winmine: 'game-mines', mines: 'game-mines',
    slots: 'game-slots', snake: 'game-snake', tetris: 'game-tetris', arkanoid: 'game-breakout', breakout: 'game-breakout', 2048: 'game-g2048',
  };

  function runningIds() {
    return WIN_ORDER.filter((id) => winEl(id) && isOpen(id));
  }

  function runningGames() {
    return ['game-snake', 'game-tetris', 'game-breakout'].filter((id) => isOpen(id) && !state.hidden[id]).length;
  }

  function tmTick() {
    const target = 3 + runningIds().filter((id) => !state.hidden[id]).length * 1.5 + runningGames() * 9 + (musicState.playing ? 4 : 0);
    tm.load = Math.max(1, Math.min(100, tm.load + (target - tm.load) * 0.35 + (Math.random() - 0.5) * 8));
    tm.cpu.push(Math.round(tm.load));
    tm.cpu.shift();
    tm.mem.push(Math.round(118 + runningIds().length * 6.5 + Math.random() * 3));
    tm.mem.shift();
    if (!state.hidden.taskmgr) updateTaskmgr();
  }

  function tmProcs() {
    const cpuNow = tm.cpu[tm.cpu.length - 1];
    const system = SYSTEM_PROCS.map(([name, user, mem], i) => ({ key: 'sys' + i, name, user, mem }));
    const apps = runningIds().map((id) => ({
      key: id,
      id,
      name: PROC_NAMES[id] || id + '.exe',
      user: 'anton',
      mem: (PROC_MEM[PROC_NAMES[id]] || 6200) + (id.charCodeAt(id.length - 1) % 9) * 311,
    }));
    const all = [...system, ...apps];
    // Split the current load across processes, weighted towards the "heavy" ones.
    let budget = cpuNow;
    all.forEach((p) => {
      const heavy = p.id && /^game-(snake|tetris|breakout)$/.test(p.id) && !state.hidden[p.id];
      const share = Math.min(budget, Math.round((heavy ? 0.3 : 0.04) * cpuNow * Math.random() * 2));
      p.cpu = share;
      budget -= share;
    });
    return [{ key: 'idle', name: t('Бездействие системы', 'System Idle Process'), user: 'SYSTEM', mem: 28, cpu: Math.max(0, 100 - cpuNow) }, ...all];
  }

  function graphSvg(data, max) {
    const w = 180;
    const h = 70;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (Math.min(v, max) / max) * (h - 2) - 1}`).join(' ');
    const grid = [];
    for (let x = 0; x <= w; x += 12) grid.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}"/>`);
    for (let y = 0; y <= h; y += 12) grid.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`);
    return `<svg class="tm-graph" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><g stroke="#0a5a0a" stroke-width="0.6">${grid.join('')}</g><polyline points="${pts}" fill="none" stroke="#3cff3c" stroke-width="1.4" vector-effect="non-scaling-stroke"/></svg>`;
  }

  function fmtKb(kb) {
    return `${Math.round(kb).toLocaleString('ru-RU')} ${t('КБ', 'K')}`;
  }

  function tmSelectRow(row) {
    tm.selected = row ? row.dataset.key : null;
    document.querySelectorAll('#tm-panel .tm-row').forEach((r) => r.classList.toggle('sel', r === row));
  }

  // End whatever's selected on the current tab — the one action both
  // "Снять задачу" and "Завершить процесс" (and the Delete key) share.
  function tmEndSelected() {
    const row = document.querySelector('#tm-panel .tm-row.sel');
    if (!row) {
      window.XP.toast(t('Сначала выберите задачу в списке.', 'Select a task in the list first.'));
      return;
    }
    const id = row.dataset.id;
    if (id) {
      closeWin(id);
      tmSelectRow(null);
    } else if (CRITICAL_PROCS.has(row.dataset.name)) {
      window.XP.effects.bsod(); // exactly what real XP did when you killed csrss.exe
    } else {
      window.XP.toast(t('Не удаётся завершить процесс. Отказано в доступе.', 'Unable to terminate process. Access is denied.'));
    }
  }

  /* The panel's structure (table, buttons) is built once per tab; after that
     only the rows' contents change in place. Rebuilding it on every tick or
     every window raise used to swap the rows/buttons out from under the
     mouse between pointerdown and pointerup — so the click never landed and
     "End Task" appeared to do nothing. */
  function buildTaskmgrPanel() {
    const panel = document.getElementById('tm-panel');
    if (!panel) return;
    tm.rowsSig = '';
    if (tm.tab === 'apps' || tm.tab === 'procs') {
      const apps = tm.tab === 'apps';
      const head = apps
        ? `<th>${t('Задача', 'Task')}</th><th>${t('Состояние', 'Status')}</th>`
        : `<th>${t('Имя образа', 'Image Name')}</th><th>${t('Пользователь', 'User Name')}</th><th class="num">${t('ЦП', 'CPU')}</th><th class="num">${t('Память', 'Mem Usage')}</th>`;
      const buttons = apps
        ? `<button type="button" class="nd-btn98" data-tm="end">${t('Снять задачу', 'End Task')}</button>
           <button type="button" class="nd-btn98" data-tm="switch">${t('Переключиться', 'Switch To')}</button>
           <button type="button" class="nd-btn98" data-tm="new">${t('Новая задача…', 'New Task…')}</button>`
        : `<button type="button" class="nd-btn98" data-tm="end">${t('Завершить процесс', 'End Process')}</button>`;
      panel.innerHTML = `<div class="tm-list"><table><thead><tr>${head}</tr></thead><tbody id="tm-rows"></tbody></table></div><div class="tm-actions">${buttons}</div>`;
      const rows = panel.querySelector('#tm-rows');
      rows.addEventListener('click', (e) => {
        const row = e.target.closest('.tm-row');
        if (row) tmSelectRow(row);
      });
      rows.addEventListener('dblclick', (e) => {
        const row = e.target.closest('.tm-row');
        if (row && row.dataset.id) show(row.dataset.id);
      });
      panel.querySelector('[data-tm="end"]').addEventListener('click', tmEndSelected);
      const sw = panel.querySelector('[data-tm="switch"]');
      if (sw) {
        sw.addEventListener('click', () => {
          const row = panel.querySelector('.tm-row.sel');
          if (row && row.dataset.id) show(row.dataset.id);
        });
      }
      const nw = panel.querySelector('[data-tm="new"]');
      if (nw) nw.addEventListener('click', openRunDialog);
    } else {
      panel.innerHTML = `
        <div class="tm-perf">
          <fieldset><legend>${t('Загрузка ЦП', 'CPU Usage')}</legend><div class="tm-meter"><b data-tm="cpu"></b><div class="tm-meter-bar"><div data-tm="cpubar"></div></div></div></fieldset>
          <fieldset><legend>${t('Хронология загрузки ЦП', 'CPU Usage History')}</legend><div data-tm="cpugraph"></div></fieldset>
          <fieldset><legend>${t('Файл подкачки', 'PF Usage')}</legend><div class="tm-meter"><b data-tm="mem"></b><div class="tm-meter-bar"><div data-tm="membar"></div></div></div></fieldset>
          <fieldset><legend>${t('Хронология файла подкачки', 'Page File Usage History')}</legend><div data-tm="memgraph"></div></fieldset>
          <fieldset class="tm-wide"><legend>${t('Всего', 'Totals')}</legend>
            <div class="tm-kv"><span>${t('Процессов', 'Processes')}</span><b data-tm="procs"></b></div>
            <div class="tm-kv"><span>${t('Окон открыто', 'Open windows')}</span><b data-tm="wins"></b></div>
            <div class="tm-kv"><span>${t('Время работы', 'Up Time')}</span><b data-tm="uptime"></b></div>
            <div class="tm-kv" data-tm="heaprow" hidden><span>${t('Память JS (реальная)', 'JS heap (real)')}</span><b data-tm="heap"></b></div>
          </fieldset>
        </div>`;
    }
    updateTaskmgr();
  }

  function updateTaskmgr() {
    const panel = document.getElementById('tm-panel');
    if (!panel) return;
    const cpu = tm.cpu[tm.cpu.length - 1];
    const memMb = tm.mem[tm.mem.length - 1];
    const procCount = SYSTEM_PROCS.length + 1 + runningIds().length;
    const status = document.getElementById('tm-status');
    if (status) {
      status.innerHTML = `<span>${t('Процессов', 'Processes')}: ${procCount}</span><span>${t('Загрузка ЦП', 'CPU Usage')}: ${cpu}%</span><span>${t('Выделение памяти', 'Commit Charge')}: ${memMb}${t('М', 'M')} / 512${t('М', 'M')}</span>`;
    }
    const q = (name) => panel.querySelector(`[data-tm="${name}"]`);
    const rowsEl = panel.querySelector('#tm-rows');
    if (tm.tab === 'apps' && rowsEl) {
      const ids = runningIds().filter((id) => id !== 'taskmgr');
      const sig = ids.map((id) => id + (state.hidden[id] ? '-' : '+')).join(',') + lang();
      if (sig === tm.rowsSig) return;
      tm.rowsSig = sig;
      if (tm.selected && !ids.includes(tm.selected)) tm.selected = null;
      rowsEl.innerHTML = ids
        .map(
          (id) => `<tr class="tm-row${tm.selected === id ? ' sel' : ''}" data-key="${id}" data-id="${id}"><td><svg width="16" height="16" aria-hidden="true"><use href="#${WIN_ICON[id]}"></use></svg>${WIN_LABEL[id]()}</td><td>${
            state.hidden[id] ? t('Свёрнуто', 'Minimized') : t('Работает', 'Running')
          }</td></tr>`
        )
        .join('');
    } else if (tm.tab === 'procs' && rowsEl) {
      const procs = tmProcs();
      const sig = procs.map((p) => p.key).join(',') + lang();
      if (sig !== tm.rowsSig) {
        tm.rowsSig = sig;
        if (tm.selected && !procs.some((p) => p.key === tm.selected)) tm.selected = null;
        rowsEl.innerHTML = procs
          .map(
            (p) =>
              `<tr class="tm-row${tm.selected === p.key ? ' sel' : ''}" data-key="${p.key}" data-id="${p.id || ''}" data-name="${p.name}"><td>${p.name}</td><td>${p.user}</td><td class="num"></td><td class="num"></td></tr>`
          )
          .join('');
      }
      // Same processes as last tick: just refresh the numbers in place.
      procs.forEach((p, i) => {
        const cells = rowsEl.children[i] && rowsEl.children[i].children;
        if (!cells) return;
        cells[2].textContent = String(p.cpu).padStart(2, '0');
        cells[3].textContent = fmtKb(p.mem);
      });
    } else if (tm.tab === 'perf' && q('cpu')) {
      const uptime = Math.floor((Date.now() - tm.startedAt) / 1000);
      const heap = performance && performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
      q('cpu').textContent = cpu + '%';
      q('cpubar').style.height = cpu + '%';
      q('cpugraph').innerHTML = graphSvg(tm.cpu, 100);
      q('mem').textContent = `${memMb} ${t('МБ', 'MB')}`;
      q('membar').style.height = Math.round((memMb / 512) * 100) + '%';
      q('memgraph').innerHTML = graphSvg(tm.mem, 512);
      q('procs').textContent = String(procCount);
      q('wins').textContent = String(runningIds().length);
      q('uptime').textContent = [Math.floor(uptime / 3600), Math.floor((uptime % 3600) / 60), uptime % 60].map((n) => String(n).padStart(2, '0')).join(':');
      if (heap != null) {
        q('heaprow').hidden = false;
        q('heap').textContent = `${heap} ${t('МБ', 'MB')}`;
      }
    }
  }

  /* "Новая задача…" — XP's Create New Task box: type a program name, it opens. */
  function openRunDialog() {
    const body = document.getElementById('nd-taskmgr-body');
    const dlg = body && body.querySelector('.tm-run');
    if (!dlg) return;
    dlg.hidden = false;
    dlg.querySelector('.tm-run-err').textContent = '';
    const input = dlg.querySelector('input');
    input.value = '';
    input.focus();
  }

  function runTask(raw) {
    const cmd = raw.trim();
    if (!cmd) return true;
    if (/^https?:\/\//i.test(cmd)) {
      const w = window.open(cmd, '_blank');
      if (w) w.opener = null;
      return true;
    }
    const name = cmd.toLowerCase().replace(/\.exe$/, '');
    const target = RUN_TARGETS[name];
    if (!target) return false;
    show(target);
    return true;
  }

  function renderTaskmgr() {
    const body = document.getElementById('nd-taskmgr-body');
    if (!body) return;
    const tabs = [
      ['apps', 'Приложения', 'Applications'],
      ['procs', 'Процессы', 'Processes'],
      ['perf', 'Быстродействие', 'Performance'],
    ];
    body.innerHTML = `
      <div class="tm">
        <div class="tm-tabs">${tabs.map(([id, ru, en]) => `<button type="button" class="tm-tab${tm.tab === id ? ' active' : ''}" data-tab="${id}">${t(ru, en)}</button>`).join('')}</div>
        <div class="tm-panel" id="tm-panel"></div>
        <div class="tm-status" id="tm-status"></div>
      </div>
      <div class="tm-run" hidden>
        <form class="tm-run-box" role="dialog" aria-label="${t('Создать новую задачу', 'Create New Task')}">
          <div class="tm-run-title">${t('Создать новую задачу', 'Create New Task')}</div>
          <p>${t('Введите имя программы, папки, документа или ресурса Интернета, которые требуется открыть.', 'Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.')}</p>
          <label>${t('Открыть:', 'Open:')} <input type="text" list="tm-run-list" autocomplete="off" spellcheck="false"></label>
          <datalist id="tm-run-list">${['calc', 'notepad', 'cmd', 'explorer', 'winamp', 'wmplayer', 'winmine', 'snake', 'tetris', 'arkanoid', '2048', 'slots'].map((n) => `<option value="${n}">`).join('')}</datalist>
          <div class="tm-run-err" aria-live="polite"></div>
          <div class="tm-run-btns"><button type="submit" class="nd-btn98">OK</button><button type="button" class="nd-btn98" data-run="cancel">${t('Отмена', 'Cancel')}</button></div>
        </form>
      </div>`;
    body.querySelectorAll('.tm-tab').forEach((b) =>
      b.addEventListener('click', () => {
        tm.tab = b.dataset.tab;
        tm.selected = null;
        body.querySelectorAll('.tm-tab').forEach((x) => x.classList.toggle('active', x === b));
        buildTaskmgrPanel();
      })
    );
    const dlg = body.querySelector('.tm-run');
    const form = dlg.querySelector('form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = form.querySelector('input').value;
      if (runTask(value)) {
        dlg.hidden = true;
      } else {
        dlg.querySelector('.tm-run-err').textContent = t(
          `Не удаётся найти «${value.trim()}». Проверьте, правильно ли указано имя, и повторите попытку.`,
          `Windows cannot find '${value.trim()}'. Make sure you typed the name correctly, and then try again.`
        );
      }
    });
    dlg.querySelector('[data-run="cancel"]').addEventListener('click', () => (dlg.hidden = true));
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        dlg.hidden = true;
      }
    });
    buildTaskmgrPanel();
  }

  function initTaskmgr() {
    createAppWindow('taskmgr', { bodyCls: 'nd-app-body' });
    ON_OPEN.taskmgr = () => {
      renderTaskmgr();
      clearInterval(tm.timer);
      tm.timer = setInterval(tmTick, 1000);
    };
    ON_CLOSE.taskmgr = () => {
      clearInterval(tm.timer);
      tm.timer = null;
    };
    // Delete ends the selected task, Enter switches to it — as in the real one.
    document.addEventListener('keydown', (e) => {
      if (activeWinId() !== 'taskmgr' || (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'))) return;
      if (e.key === 'Delete') {
        e.preventDefault();
        tmEndSelected();
      } else if (e.key === 'Enter' && tm.tab === 'apps') {
        const row = document.querySelector('#tm-panel .tm-row.sel');
        if (row && row.dataset.id) show(row.dataset.id);
      }
    });
  }

  /* =========================================================
     Calculator — Windows' standard calc: immediate execution (no operator
     precedence), repeat-last-operation on "=", memory keys, keyboard input.
     ========================================================= */
  // fresh: the next digit starts a new number; entered: the display holds an
  // operand the pending operation hasn't consumed yet (typed, or produced by
  // sqrt/%/1/x/MR) — so "100 + 10 % +" still applies the pending +.
  const calc = { display: '0', acc: null, op: null, fresh: true, entered: false, lastOp: null, lastArg: null, mem: 0, error: false };

  function calcFormat(n) {
    if (!Number.isFinite(n)) return null;
    let s = String(parseFloat(n.toPrecision(15)));
    if (s.replace('-', '').replace('.', '').length > 16) s = n.toExponential(9);
    return s;
  }

  function calcApply(a, op, b) {
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === '*') return a * b;
    if (op === '/') return b === 0 ? NaN : a / b;
    return b;
  }

  function calcSet(n, divZero) {
    const s = calcFormat(n);
    if (s === null) {
      calc.display = divZero ? t('Деление на ноль невозможно.', 'Cannot divide by zero.') : t('Недопустимый ввод.', 'Invalid input.');
      calc.error = true;
      calc.acc = null;
      calc.op = null;
    } else {
      calc.display = s;
    }
    calc.fresh = true;
    calc.entered = true;
  }

  function calcPress(key) {
    if (calc.error && key !== 'C') calcPress('C');
    const cur = parseFloat(calc.display);
    if (/^\d$/.test(key)) {
      if (calc.fresh || calc.display === '0') calc.display = key;
      else if (calc.display.replace(/[-.]/g, '').length < 16) calc.display += key;
      calc.fresh = false;
      calc.entered = true;
    } else if (key === '.') {
      if (calc.fresh) calc.display = '0.';
      else if (!calc.display.includes('.')) calc.display += '.';
      calc.fresh = false;
      calc.entered = true;
    } else if ('+-*/'.includes(key)) {
      if (calc.op && calc.entered) calcSet(calcApply(calc.acc, calc.op, cur), calc.op === '/' && cur === 0);
      if (calc.error) return renderCalcDisplay();
      calc.acc = parseFloat(calc.display);
      calc.op = key;
      calc.fresh = true;
      calc.entered = false;
    } else if (key === '=') {
      if (calc.op) {
        calc.lastOp = calc.op;
        calc.lastArg = cur;
        calcSet(calcApply(calc.acc, calc.op, cur), calc.op === '/' && cur === 0);
        calc.op = null;
        calc.acc = null;
      } else if (calc.lastOp) {
        calcSet(calcApply(cur, calc.lastOp, calc.lastArg), calc.lastOp === '/' && calc.lastArg === 0);
      }
    } else if (key === 'sqrt') {
      calcSet(cur < 0 ? NaN : Math.sqrt(cur));
    } else if (key === '%') {
      calcSet(calc.acc === null ? 0 : (calc.acc * cur) / 100);
    } else if (key === '1/x') {
      calcSet(cur === 0 ? NaN : 1 / cur, cur === 0);
    } else if (key === 'neg') {
      if (calc.display !== '0') calc.display = calc.display.startsWith('-') ? calc.display.slice(1) : '-' + calc.display;
      calc.entered = true;
    } else if (key === 'back') {
      if (!calc.fresh) calc.display = calc.display.length > 1 && calc.display !== '-0' ? calc.display.slice(0, -1).replace(/^-$/, '0') : '0';
    } else if (key === 'CE') {
      calc.display = '0';
      calc.fresh = true;
      calc.entered = true;
    } else if (key === 'C') {
      Object.assign(calc, { display: '0', acc: null, op: null, fresh: true, entered: false, lastOp: null, lastArg: null, error: false });
    } else if (key === 'MC') {
      calc.mem = 0;
    } else if (key === 'MR') {
      calcSet(calc.mem);
    } else if (key === 'MS') {
      calc.mem = cur;
      calc.fresh = true;
    } else if (key === 'M+') {
      calc.mem += cur;
      calc.fresh = true;
    }
    renderCalcDisplay();
  }

  function renderCalcDisplay() {
    const d = document.getElementById('calc-display');
    const m = document.getElementById('calc-mem');
    if (d) d.textContent = calc.error ? calc.display : lang() === 'ru' ? calc.display.replace('.', ',') : calc.display;
    if (m) m.textContent = calc.mem !== 0 ? 'M' : '';
  }

  function renderCalc() {
    const body = document.getElementById('nd-calc-body');
    if (!body) return;
    const dec = lang() === 'ru' ? ',' : '.';
    const rows = [
      [['MC', 'MC', 'm'], ['7', '7'], ['8', '8'], ['9', '9'], ['/', '/', 'op'], ['sqrt', 'sqrt', 'fn']],
      [['MR', 'MR', 'm'], ['4', '4'], ['5', '5'], ['6', '6'], ['*', '*', 'op'], ['%', '%', 'fn']],
      [['MS', 'MS', 'm'], ['1', '1'], ['2', '2'], ['3', '3'], ['-', '-', 'op'], ['1/x', '1/x', 'fn']],
      [['M+', 'M+', 'm'], ['0', '0'], ['neg', '+/-'], ['.', dec], ['+', '+', 'op'], ['=', '=', 'op']],
    ];
    body.innerHTML = `
      <div class="calc">
        <div class="calc-display" id="calc-display" aria-live="polite">0</div>
        <div class="calc-top">
          <span class="calc-mem" id="calc-mem"></span>
          <button type="button" class="calc-key op" data-k="back">${t('Назад', 'Backspace')}</button>
          <button type="button" class="calc-key op" data-k="CE">CE</button>
          <button type="button" class="calc-key op" data-k="C">C</button>
        </div>
        <div class="calc-grid">${rows
          .flat()
          .map(([k, label, cls]) => `<button type="button" class="calc-key${cls ? ' ' + cls : ''}" data-k="${k}">${label}</button>`)
          .join('')}</div>
      </div>`;
    body.querySelectorAll('.calc-key').forEach((b) =>
      b.addEventListener('click', () => {
        calcPress(b.dataset.k);
        b.blur();
      })
    );
    renderCalcDisplay();
  }

  function initCalc() {
    createAppWindow('calc', { fixed: true, bodyCls: 'nd-app-body' });
    ON_OPEN.calc = renderCalc;
    document.addEventListener('keydown', (e) => {
      if (activeWinId() !== 'calc' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const map = { Enter: '=', '=': '=', Backspace: 'back', Escape: 'C', Delete: 'CE', ',': '.', '.': '.', '+': '+', '-': '-', '*': '*', '/': '/', '%': '%' };
      const key = /^\d$/.test(e.key) ? e.key : map[e.key];
      if (!key) return;
      e.preventDefault();
      calcPress(key);
    });
  }

  /* =========================================================
     Notepad — a real little editor; the text is kept in this browser.
     ========================================================= */
  const NOTEPAD_KEY = 'av-notepad';
  let notepadSaveTimer = null;

  function notepadDefault() {
    return t(
      'Привет! Это настоящий Блокнот: всё, что здесь напишете, сохранится в этом браузере.\n\nФайл → Сохранить скачает текст как .txt, Правка → Время и дата (F5) вставит текущее время — как в оригинале.\n',
      "Hi! This is a real Notepad: whatever you type here is kept in this browser.\n\nFile → Save downloads it as a .txt, Edit → Time/Date (F5) inserts the current time — just like the original.\n"
    );
  }

  function renderNotepad(initialText) {
    const body = document.getElementById('nd-notepad-body');
    if (!body) return;
    let text = null;
    try {
      text = localStorage.getItem(NOTEPAD_KEY);
    } catch (_) {
      text = null;
    }
    let wrap = true;
    try {
      wrap = localStorage.getItem('av-notepad-wrap') !== '0';
    } catch (_) {
      wrap = true;
    }
    const menus = [
      ['file', t('Файл', 'File'), [['new', t('Создать', 'New')], ['save', t('Сохранить…', 'Save…') + '<kbd>Ctrl+S</kbd>']]],
      ['edit', t('Правка', 'Edit'), [['all', t('Выделить всё', 'Select All') + '<kbd>Ctrl+A</kbd>'], ['time', t('Время и дата', 'Time/Date') + '<kbd>F5</kbd>']]],
      ['format', t('Формат', 'Format'), [['wrap', t('Перенос по словам', 'Word Wrap')]]],
    ];
    body.innerHTML = `
      <div class="np">
        <div class="np-menubar">${menus
          .map(
            ([id, label, items]) => `<div class="np-menu"><button type="button" class="np-menu-btn" data-menu="${id}">${label}</button><div class="np-drop" hidden>${items
              .map(([act, text2]) => `<button type="button" class="np-item" data-act="${act}">${act === 'wrap' ? `<span class="np-check">${wrap ? '✓' : ''}</span>` : '<span class="np-check"></span>'}${text2}</button>`)
              .join('')}</div></div>`
          )
          .join('')}</div>
        <textarea class="np-text${wrap ? '' : ' nowrap'}" id="np-text" spellcheck="false" aria-label="${t('Текст', 'Text')}"></textarea>
      </div>`;
    const ta = body.querySelector('#np-text');
    ta.value = initialText != null ? initialText : text === null ? notepadDefault() : text;
    const persist = () => {
      clearTimeout(notepadSaveTimer);
      notepadSaveTimer = setTimeout(() => {
        try {
          localStorage.setItem(NOTEPAD_KEY, ta.value);
        } catch (_) {
          /* storage blocked — the note just won't survive a reload */
        }
      }, 300);
    };
    const insertAtCursor = (str) => {
      const { selectionStart: a, selectionEnd: b } = ta;
      ta.setRangeText(str, a, b, 'end');
      persist();
      ta.focus();
    };
    const closeMenus = () => body.querySelectorAll('.np-drop').forEach((d) => (d.hidden = true));
    const actions = {
      new: () => {
        ta.value = '';
        persist();
        ta.focus();
      },
      save: () => {
        const blob = new Blob([ta.value], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = t('Безымянный.txt', 'Untitled.txt');
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      },
      all: () => {
        ta.focus();
        ta.select();
      },
      time: () => {
        const now = new Date();
        const loc = lang() === 'ru' ? 'ru-RU' : 'en-US';
        insertAtCursor(`${now.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })} ${now.toLocaleDateString(loc)}`);
      },
      wrap: () => {
        const on = ta.classList.toggle('nowrap') === false;
        try {
          localStorage.setItem('av-notepad-wrap', on ? '1' : '0');
        } catch (_) {
          /* ignore */
        }
        const check = body.querySelector('[data-act="wrap"] .np-check');
        if (check) check.textContent = on ? '✓' : '';
      },
    };
    ta.addEventListener('input', persist);
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'F5') {
        e.preventDefault();
        actions.time();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'ы')) {
        e.preventDefault();
        actions.save();
      }
    });
    body.querySelectorAll('.np-menu-btn').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const drop = btn.nextElementSibling;
        const willOpen = drop.hidden;
        closeMenus();
        drop.hidden = !willOpen;
      })
    );
    body.querySelectorAll('.np-item').forEach((item) =>
      item.addEventListener('click', () => {
        closeMenus();
        actions[item.dataset.act]();
      })
    );
    if (!body.dataset.wired) {
      body.dataset.wired = '1';
      body.addEventListener('click', (e) => {
        if (!e.target.closest('.np-menu')) body.querySelectorAll('.np-drop').forEach((d) => (d.hidden = true));
      });
    }
  }

  // Re-render (e.g. on a language switch) without losing unsaved keystrokes.
  function rerenderNotepad() {
    const ta = document.getElementById('np-text');
    if (!ta) return;
    clearTimeout(notepadSaveTimer);
    try {
      localStorage.setItem(NOTEPAD_KEY, ta.value);
    } catch (_) {
      /* ignore */
    }
    renderNotepad(ta.value);
  }

  function initNotepad() {
    createAppWindow('notepad', { bodyCls: 'nd-app-body' });
    ON_OPEN.notepad = () => {
      if (!document.getElementById('np-text')) renderNotepad();
      setTimeout(() => {
        const ta = document.getElementById('np-text');
        if (ta) ta.focus();
      }, 60);
    };
  }

  /* =========================================================
     Winamp — real playback of whatever's dropped into static/music/
     (title/artist/cover read server-side by api/music_sync.py). The window
     is standalone now (not an Explorer tab), so playback just keeps going
     regardless of what else is open, like a real Winamp instance would.
     ========================================================= */
  const MUSIC_HUES = [165, 265, 25, 200, 330]; // fallback "art" tile color when a track has no embedded cover
  const musicState = { playing: false, track: 0, repeat: false };
  let musicTracks = [];
  let musicTracksLoaded = false;
  let musicAudioEl = null;

  async function loadMusicTracks() {
    try {
      const res = await fetch('/api/music');
      const data = await res.json();
      musicTracks = (data && data.tracks) || [];
    } catch (e) {
      musicTracks = [];
    }
    musicTracksLoaded = true;
    renderMusicWin(); // refresh out of the (until-now loading) placeholder
  }

  function renderMusicWin() {
    const body = document.getElementById('nd-music-body');
    if (!body) return;
    body.innerHTML = musicHtml();
    if (musicTracksLoaded) mountMusic();
  }

  function musicHtml() {
    if (!musicTracksLoaded) {
      return `<div class="nd-music nd-music-empty"><p>${t('Загрузка плейлиста…', 'Loading playlist…')}</p></div>`;
    }
    if (!musicTracks.length) {
      return `<div class="nd-music nd-music-empty">
        <div class="nd-wa-art nd-wa-art-empty">♪</div>
        <p>${t('Плейлист пуст. Положи mp3/m4a/flac/ogg файлы в static/music/ — они появятся здесь сами.', "Playlist's empty. Drop mp3/m4a/flac/ogg files into static/music/ and they'll show up here on their own.")}</p>
      </div>`;
    }
    const bars = Array.from({ length: 14 })
      .map((_, i) => `<span class="nd-bar" style="animation-delay:${((i * 137) % 55) / 100}s"></span>`)
      .join('');
    return `
      <div class="nd-music">
        <audio id="nd-music-audio" preload="metadata"></audio>
        <div class="nd-wa-display">
          <div class="nd-wa-art" id="nd-music-art">♪</div>
          <div class="nd-wa-display-main">
            <div class="nd-music-display">
              <div class="nd-music-time" id="nd-music-time">00:00</div>
              <div class="nd-music-bars" id="nd-music-bars">${bars}</div>
            </div>
            <div class="nd-wa-seek" id="nd-music-seek-track" role="slider" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="nd-wa-seek-fill" id="nd-music-seek"></div></div>
          </div>
        </div>
        <div class="nd-music-ticker"><span class="nd-tick" id="nd-music-track"></span></div>
        <div class="nd-music-controls">

          <button class="nd-wbtn" id="nd-music-prev" aria-label="${t('Предыдущий трек', 'Previous track')}">◀◀</button>
          <button class="nd-wbtn" id="nd-music-play" aria-label="${t('Играть', 'Play')}">▶</button>
          <button class="nd-wbtn" id="nd-music-stop" aria-label="${t('Стоп', 'Stop')}">■</button>
          <button class="nd-wbtn" id="nd-music-next" aria-label="${t('Следующий трек', 'Next track')}">▶▶</button>
          <button class="nd-wbtn" id="nd-music-repeat" aria-label="${t('Повтор трека', 'Repeat track')}" title="${t('Повтор трека', 'Repeat track')}"><svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true"><path d="M2.5 6.5V5a2 2 0 0 1 2-2h9.5M15.5 7.5V9a2 2 0 0 1-2 2H4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M12.2.4 15.4 3l-3.2 2.6zM5.8 8.4 2.6 11l3.2 2.6z" fill="currentColor"/></svg></button>
        </div>
        <div class="nd-wa-volume-row">
          <span class="nd-wa-volume-ico" aria-hidden="true">🔊</span>
          <input type="range" id="nd-music-volume" class="nd-wa-volume" min="0" max="100" value="80" aria-label="${t('Громкость', 'Volume')}">
        </div>
        <div class="nd-music-playlist" id="nd-music-playlist"></div>
      </div>
    `;
  }

  function trackLabel(tr) {
    return tr.artist ? `${tr.artist} — ${tr.title}` : tr.title;
  }

  function paintMusic() {
    if (!musicTracks.length) return;
    const track = musicTracks[musicState.track];
    const trackEl = document.getElementById('nd-music-track');
    const playBtn = document.getElementById('nd-music-play');
    const barsEl = document.getElementById('nd-music-bars');
    const playlistEl = document.getElementById('nd-music-playlist');
    const artEl = document.getElementById('nd-music-art');
    if (!trackEl || !playlistEl) return;
    const label = trackLabel(track);
    trackEl.textContent = label + ' *** ' + label;
    playBtn.textContent = musicState.playing ? '❚❚' : '▶';
    playBtn.setAttribute('aria-label', musicState.playing ? t('Пауза', 'Pause') : t('Играть', 'Play'));
    barsEl.classList.toggle('on', musicState.playing);
    const repeatBtn = document.getElementById('nd-music-repeat');
    if (repeatBtn) {
      repeatBtn.classList.toggle('active', !!musicState.repeat);
      repeatBtn.setAttribute('aria-pressed', musicState.repeat ? 'true' : 'false');
      repeatBtn.setAttribute(
        'aria-label',
        musicState.repeat ? t('Повтор включён', 'Repeat on') : t('Повтор трека', 'Repeat track')
      );
    }
    if (artEl) {
      if (track.cover_url) {
        artEl.style.background = `center / cover no-repeat url("${track.cover_url}")`;
        artEl.textContent = '';
      } else {
        const hue = MUSIC_HUES[musicState.track % MUSIC_HUES.length];
        artEl.style.background = `linear-gradient(135deg, hsl(${hue}, 65%, 42%), hsl(${(hue + 45) % 360}, 65%, 18%))`;
        artEl.textContent = '♪';
      }
    }
    playlistEl.innerHTML = musicTracks.map((tr, i) => `<button class="nd-plrow${i === musicState.track ? ' active' : ''}" data-i="${i}">${i + 1}. ${trackLabel(tr)}</button>`).join('');
    playlistEl.querySelectorAll('.nd-plrow').forEach((b) => {
      b.addEventListener('click', () => playTrack(Number(b.dataset.i)));
    });
  }

  function updateMusicTime() {
    const timeEl = document.getElementById('nd-music-time');
    const seekEl = document.getElementById('nd-music-seek');
    if (!musicAudioEl || !timeEl || musicState.seeking) return; // mid-drag, the bar shows the drag position, not playback
    const cur = musicAudioEl.currentTime || 0;
    const dur = musicAudioEl.duration || 0;
    timeEl.textContent = `${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(Math.floor(cur % 60)).padStart(2, '0')}`;
    if (seekEl) seekEl.style.width = (dur ? cur / dur : 0) * 100 + '%';
  }

  function playTrack(i) {
    if (!musicTracks.length || !musicAudioEl) return;
    musicState.track = ((i % musicTracks.length) + musicTracks.length) % musicTracks.length;
    musicAudioEl.src = musicTracks[musicState.track].url;
    musicAudioEl.currentTime = 0;
    musicState.playing = true;
    musicAudioEl.play().catch(() => {
      musicState.playing = false;
      paintMusic();
    });
    paintMusic();
  }

  function stopMusicPlayback() {
    if (!musicAudioEl) return;
    musicAudioEl.pause();
    musicAudioEl.currentTime = 0;
    musicState.playing = false;
    updateMusicTime();
    paintMusic();
  }

  function mountMusic() {
    if (!musicTracks.length) return;
    musicAudioEl = document.getElementById('nd-music-audio');
    const play = document.getElementById('nd-music-play');
    const stop = document.getElementById('nd-music-stop');
    const prev = document.getElementById('nd-music-prev');
    const next = document.getElementById('nd-music-next');
    const seekTrack = document.getElementById('nd-music-seek-track');
    if (musicAudioEl) {
      musicAudioEl.src = musicTracks[musicState.track].url;
      const savedVolumeRaw = localStorage.getItem('av-music-volume'); // Number(null) is 0, not NaN — check for absence first
      const savedVolume = savedVolumeRaw === null ? NaN : Number(savedVolumeRaw);
      musicAudioEl.volume = (Number.isFinite(savedVolume) ? Math.min(100, Math.max(0, savedVolume)) : 80) / 100;
      musicAudioEl.addEventListener('timeupdate', updateMusicTime);
      musicAudioEl.addEventListener('loadedmetadata', updateMusicTime);
      musicAudioEl.addEventListener('ended', () => {
        if (musicState.repeat) {
          // Replay the same track (audio.loop can glitch with some formats on iOS)
          musicAudioEl.currentTime = 0;
          musicAudioEl.play().catch(() => {
            musicState.playing = false;
            paintMusic();
          });
        } else {
          playTrack(musicState.track + 1);
        }
      });
    }
    const volumeInput = document.getElementById('nd-music-volume');
    if (volumeInput && musicAudioEl) {
      volumeInput.value = String(Math.round(musicAudioEl.volume * 100));
      volumeInput.addEventListener('input', () => {
        musicAudioEl.volume = Number(volumeInput.value) / 100;
        localStorage.setItem('av-music-volume', volumeInput.value);
      });
    }
    if (play) {
      play.addEventListener('click', () => {
        if (!musicAudioEl) return;
        if (musicState.playing) {
          musicAudioEl.pause();
          musicState.playing = false;
          paintMusic();
        } else {
          musicState.playing = true;
          musicAudioEl.play().catch(() => {
            musicState.playing = false;
            paintMusic();
          });
          paintMusic();
        }
      });
    }
    if (stop) {
      stop.addEventListener('click', stopMusicPlayback);
    }
    if (prev) prev.addEventListener('click', () => playTrack(musicState.track - 1));
    if (next) next.addEventListener('click', () => playTrack(musicState.track + 1));
    if (seekTrack) {
      // Dragging only moves the bar and the time readout; the audio itself
      // seeks exactly once, on release. Seeking on every pointerdown/move/up
      // (plus the click that follows) used to restart decoding several times
      // per gesture — each later seek landed a fraction of a second *behind*
      // where playback had already got to, which is the audible "jump back".
      const ratioAt = (e) => {
        const rect = seekTrack.getBoundingClientRect();
        return rect.width ? Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) : 0;
      };
      const canSeek = () => musicAudioEl && Number.isFinite(musicAudioEl.duration) && musicAudioEl.duration > 0;
      const preview = (ratio) => {
        const fill = document.getElementById('nd-music-seek');
        const timeEl = document.getElementById('nd-music-time');
        const cur = ratio * musicAudioEl.duration;
        if (fill) fill.style.width = ratio * 100 + '%';
        if (timeEl) timeEl.textContent = `${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(Math.floor(cur % 60)).padStart(2, '0')}`;
      };
      let dragRatio = null;
      seekTrack.addEventListener('pointerdown', (e) => {
        if (!canSeek() || (e.button !== undefined && e.button !== 0)) return;
        e.preventDefault();
        seekTrack.setPointerCapture(e.pointerId);
        musicState.seeking = true;
        dragRatio = ratioAt(e);
        preview(dragRatio);
      });
      seekTrack.addEventListener('pointermove', (e) => {
        if (dragRatio === null) return;
        dragRatio = ratioAt(e);
        preview(dragRatio);
      });
      const finish = (commit) => {
        if (dragRatio === null) return;
        if (commit && canSeek()) musicAudioEl.currentTime = dragRatio * musicAudioEl.duration;
        dragRatio = null;
        musicState.seeking = false;
        updateMusicTime();
      };
      seekTrack.addEventListener('pointerup', () => finish(true));
      seekTrack.addEventListener('pointercancel', () => finish(false));
      seekTrack.addEventListener('lostpointercapture', () => finish(true));
    }
    const repeatBtn = document.getElementById('nd-music-repeat');
    if (repeatBtn) {
      onTap(repeatBtn, () => {
        musicState.repeat = !musicState.repeat;
        if (musicAudioEl) musicAudioEl.loop = false; // we handle loop in 'ended'
        paintMusic();
      });
    }
    paintMusic();
  }

  function linksHtml(l) {
    const c = PROFILE.contacts;
    const items = [
      { name: 'GitHub', handle: 'BlazeStudio', icon: 'ico-github', href: c.github },
      { name: 'hh.ru', handle: t('Резюме', 'Résumé'), tag: 'hh', bg: '#d6001c', fg: '#fff', href: c.hh },
      { name: 'LinkedIn', handle: t('Профиль', 'Profile'), tag: 'in', bg: '#0a66c2', fg: '#fff', href: c.linkedin },
      { name: 'Telegram', handle: c.telegram_handle, icon: 'ico-telegram', href: c.telegram },
      { name: 'Email', handle: c.email, tag: '@', bg: '#555', fg: '#fff', href: `mailto:${c.email}` },
    ];
    return `
      <div class="nd-links-grid">${items
        .map(
          (i) => `
        <a class="nd-svc" href="${i.href}" target="_blank" rel="noopener">
          ${i.icon ? `<svg class="nd-svc-tag nd-svc-icon" width="34" height="34" aria-hidden="true"><use href="#${i.icon}"></use></svg>` : `<span class="nd-svc-tag" style="background:${i.bg};color:${i.fg}">${i.tag}</span>`}
          <span><b>${i.name}</b><br><span class="nd-svc-handle">${i.handle}</span></span>
        </a>`
        )
        .join('')}</div>
      <div class="nd-links-note">${t('GitHub и Codewars есть и в виде отдельных окон со статистикой на рабочем столе.', 'GitHub and Codewars also have their own windows with live stats on the desktop.')}</div>
    `;
  }

  /* =========================================================
     Live-data windows: GitHub / Steam / FACEIT / Codewars
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
    const memberSince = s.created_at ? new Date(s.created_at).getFullYear() : null;
    const repos = s.repos && s.repos.synced ? s.repos : {};
    const langs = repos.languages || [];
    const langTotal = langs.reduce((a, x) => a + x.repos, 0);
    const langHtml = langTotal
      ? `<div class="nd-gh-heat-label"><span>${t('Языки по репозиториям', 'Top languages by repo')}</span></div>
        <div class="nd-gh-langbar">${langs.map((x) => `<span style="flex-grow:${x.repos};background:${langColor(x.name)}" title="${x.name}: ${x.repos}"></span>`).join('')}</div>
        <div class="nd-gh-legend">${langs
          .map((x) => `<span><i style="background:${langColor(x.name)}"></i>${x.name} <b>${Math.round((x.repos / langTotal) * 100)}%</b></span>`)
          .join('')}</div>`
      : '';
    const contrib = s.contributions || {};
    const days = contrib.days || [];
    const heatHtml = days.length
      ? `
        <div class="nd-gh-heat-label"><span>${t('Активность за год', 'Activity, past year')}</span><span>${contrib.total ?? days.filter((d) => d.level > 0).length} ${t('коммитов', 'commits')}</span></div>
        <div class="nd-gh-heat-wrap" id="nd-gh-heat-wrap"><div class="nd-gh-heat">${days.map((d) => `<span class="nd-gh-cell" data-lvl="${d.level}" title="${d.date}"></span>`).join('')}</div></div>`
      : '';
    body.innerHTML = `
      <div class="nd-win-head">
        <div class="nd-win-avatar-badge">${s.avatar_url ? `<img src="${s.avatar_url}" alt="">` : 'GH'}</div>
        <div><div class="nd-win-name">BlazeStudio</div><a class="nd-win-link" href="${PROFILE.contacts.github}" target="_blank" rel="noopener">github.com/BlazeStudio</a>${memberSince ? `<div class="nd-gh-since">${t('на GitHub с', 'on GitHub since')} ${memberSince}</div>` : ''}</div>
      </div>
      <div class="nd-stat-grid nd-gh-stats">
        <div class="nd-stat">${t('Репозитории', 'Repos')}<b>${s.public_repos ?? '—'}</b></div>
        <div class="nd-stat">${t('Звёзды', 'Stars')}<b>${repos.stars ?? '—'}</b></div>
        <div class="nd-stat">${t('Подписчики', 'Followers')}<b>${s.followers ?? '—'}</b></div>
        <div class="nd-stat">${t('Коммиты', 'Commits')}<b>${s.commit_count != null ? s.commit_count + '+' : '—'}</b></div>
        <div class="nd-stat">Pull requests<b>${repos.prs ?? '—'}</b></div>
        <div class="nd-stat">Issues<b>${repos.issues ?? '—'}</b></div>
      </div>
      ${langHtml}
      ${heatHtml}
      <a class="nd-btn98 nd-block" href="${PROFILE.contacts.github}" target="_blank" rel="noopener">${t('Открыть профиль', 'Open profile')}</a>
    `;
    const heatWrap = document.getElementById('nd-gh-heat-wrap');
    if (heatWrap) heatWrap.scrollLeft = heatWrap.scrollWidth; // scrolled to the most recent weeks by default
  }

  // GitHub's own linguist colors (a couple of too-dark ones lifted so they read on the dark window).
  const LANG_COLORS = {
    Python: '#3572A5', HTML: '#e34c26', JavaScript: '#f1e05a', TypeScript: '#3178c6', Java: '#b07219', Lua: '#4b5fe0',
    CSS: '#663399', 'C++': '#f34b7d', C: '#8b8b8b', 'C#': '#178600', Go: '#00ADD8', Shell: '#89e051', 'Jupyter Notebook': '#DA5B0B',
  };
  function langColor(name) {
    return LANG_COLORS[name] || '#8b949e';
  }

  /* Codewars — rank, honor, leaderboard spot, katas and per-language kyu. */
  const KYU_COLORS = { white: '#e6e6e6', yellow: '#ecb613', blue: '#3c7ebb', purple: '#866cc7', black: '#6b6b6b', red: '#b1361e' };
  let codewarsCache = null;
  async function loadCodewars() {
    try {
      const res = await fetch('/api/codewars');
      codewarsCache = await res.json();
    } catch (e) {
      codewarsCache = { synced: false };
    }
    renderCodewars();
  }
  function kyuBadge(rank, size) {
    const color = KYU_COLORS[(rank && rank.color) || 'white'] || '#e6e6e6';
    const [num, unit] = String((rank && rank.name) || '? kyu').split(' ');
    const s = size || 44;
    return `<svg class="nd-cw-hex" width="${s}" height="${s}" viewBox="0 0 44 44" aria-hidden="true"><path d="M22 3l16.5 9.5v19L22 41 5.5 31.5v-19z" fill="#1f2023" stroke="${color}" stroke-width="3" stroke-linejoin="round"/><text x="22" y="${unit ? 22 : 27}" text-anchor="middle" font-family="Verdana" font-weight="bold" font-size="14" fill="#fff">${num}</text>${
      unit ? `<text x="22" y="33" text-anchor="middle" font-family="Verdana" font-size="8" fill="${color}">${unit}</text>` : ''
    }</svg>`;
  }
  function renderCodewars() {
    const body = document.getElementById('nd-codewars-body');
    if (!body) return;
    const c = codewarsCache;
    if (!c) return;
    const url = c.url || 'https://www.codewars.com/users/BlazeStudio';
    if (!c.synced) {
      body.innerHTML = `<p class="nd-not-connected">${t('Codewars сейчас недоступен.', 'Codewars is unreachable right now.')}</p><a class="nd-btn98 nd-block" href="${url}" target="_blank" rel="noopener">${t('Открыть профиль', 'Open profile')}</a>`;
      return;
    }
    const n = (v) => (v == null ? '—' : Number(v).toLocaleString('ru-RU'));
    body.innerHTML = `
      <div class="nd-win-head">
        ${kyuBadge(c.rank, 48)}
        <div><div class="nd-win-name">${c.username}</div><div class="nd-cw-honor">${t('Честь', 'Honor')} <b>${n(c.honor)}</b></div></div>
      </div>
      <div class="nd-stat-grid">
        <div class="nd-stat">${t('Место в рейтинге', 'Leaderboard')}<b>#${n(c.leaderboard)}</b></div>
        <div class="nd-stat">${t('Решено кат', 'Katas solved')}<b>${n(c.completed)}</b></div>
      </div>
      ${
        (c.languages || []).length
          ? `<div class="nd-cw-langs">${c.languages.map((l) => `<span class="nd-cw-lang" title="${l.score} ${t('очков', 'points')}">${kyuBadge(l, 22)}${l.lang}</span>`).join('')}</div>`
          : ''
      }
      <a class="nd-btn98 nd-block" href="${url}" target="_blank" rel="noopener">${t('Открыть профиль', 'Open profile')}</a>`;
  }

  /* Shared fetch helper for all three /api/steam* endpoints: logs to the
     console on any failure (bad status, network error, or a hang) instead
     of failing silently into "stuck on loading forever" with nothing to go
     on, and aborts a request that's taking too long rather than leaving a
     dangling fetch() that (fetch has no default timeout) could otherwise
     wait forever on a server that never responds. */
  function fetchJsonSafe(url, fallback, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`${url} responded ${res.status}`);
        return res.json();
      })
      .catch((err) => {
        console.error(`[steam] request to ${url} failed:`, err);
        return fallback;
      })
      .finally(() => clearTimeout(timer));
  }

  /* /api/steam (profile + extra stats + recent/top games) backs the bulk of
     the Steam window. It's all the official, API-key'd Web API, so
     profile.synced is a reliable "did this actually connect" signal and a
     couple of quick retries is enough for a transient hiccup. */
  const STEAM_RETRY_DELAYS_MS = [1500, 3000];
  let steamData = null;
  let steamPromise = null;
  function fetchSteamOnce() {
    return fetchJsonSafe('/api/steam', { profile: { synced: false }, extra: { synced: false }, recent_games: { games: [] }, top_games: { games: [] } }, 12000);
  }
  function fetchSteam() {
    if (steamData) return Promise.resolve(steamData);
    if (!steamPromise) {
      steamPromise = (async () => {
        let data = await fetchSteamOnce();
        for (const delay of STEAM_RETRY_DELAYS_MS) {
          if (data && data.profile && data.profile.synced) break;
          await new Promise((resolve) => setTimeout(resolve, delay));
          data = await fetchSteamOnce();
        }
        if (!data || !data.profile || !data.profile.synced) {
          console.error('[steam] /api/steam never synced after retries — giving up. Last response:', data);
        }
        return data;
      })();
    }
    return steamPromise.then((data) => {
      steamData = data;
      return data;
    });
  }

  /* /api/steam/inventory is its own endpoint on purpose: it scrapes
     steamcommunity.com's anonymous inventory listing AND prices each item
     via the Market (rate-limited hard by Steam, up to a several-second
     budget server-side — see PRICE_BUDGET_SECONDS in steam_sync.py). Bundled
     into /api/steam like it used to be, a slow or rate-limited inventory
     held the whole response hostage — on a real deploy, sometimes past a
     serverless function's time limit, which killed the request outright and
     took profile/stats down with it even though those were ready instantly.
     Split out, a slow inventory just means the inventory section takes a
     moment (or, after retrying, stays empty) while the rest of the window
     works fine. Retries are capped at two (not screenshots' ten): retrying
     re-runs the same rate-limited price lookups, so hammering it harder
     would fight the very throttling that's slowing it down. */
  const INVENTORY_RETRY_DELAYS_MS = [1500, 3000];
  let inventoryData = null;
  let inventoryPromise = null;
  function fetchInventoryOnce() {
    return fetchJsonSafe('/api/steam/inventory', { cs_inventory: { synced: false, items: [] } }, 20000);
  }
  function fetchInventory() {
    if (inventoryData) return Promise.resolve(inventoryData);
    if (!inventoryPromise) {
      inventoryPromise = (async () => {
        let data = await fetchInventoryOnce();
        for (const delay of INVENTORY_RETRY_DELAYS_MS) {
          if (data && data.cs_inventory && data.cs_inventory.synced) break;
          await new Promise((resolve) => setTimeout(resolve, delay));
          data = await fetchInventoryOnce();
        }
        return data;
      })();
    }
    return inventoryPromise.then((data) => {
      inventoryData = data;
      return data;
    });
  }

  /* /api/steam/screenshots backs only the Explorer's Screenshots tab. Its
     scrape (a community-profile page fetch plus one detail-page fetch per
     screenshot) is the genuinely flaky part, so this is the one that gets
     the long, patient retry — up to SCREENSHOTS_MAX_ATTEMPTS — without ever
     touching the Steam window's data or its rate-limited inventory pricing.
     (An account with genuinely zero public screenshots looks the same as
     "failed to load" here and pays for the full retry budget too — an
     acceptable tradeoff since this profile does have public screenshots.) */
  const SCREENSHOTS_MAX_ATTEMPTS = 10;
  const SCREENSHOTS_RETRY_DELAY_MS = 1500;
  let screenshotsData = null;
  let screenshotsPromise = null;
  function fetchScreenshotsOnce() {
    return fetchJsonSafe('/api/steam/screenshots', { screenshots: { synced: false, screenshots: [] } }, 12000);
  }
  function fetchScreenshots() {
    if (screenshotsData) return Promise.resolve(screenshotsData);
    if (!screenshotsPromise) {
      screenshotsPromise = (async () => {
        let data = await fetchScreenshotsOnce();
        for (let attempt = 1; attempt < SCREENSHOTS_MAX_ATTEMPTS && !(data && data.screenshots && data.screenshots.synced); attempt++) {
          await new Promise((resolve) => setTimeout(resolve, SCREENSHOTS_RETRY_DELAY_MS));
          data = await fetchScreenshotsOnce();
        }
        if (!data || !data.screenshots || !data.screenshots.synced) {
          console.error('[steam] screenshots never synced after retries — giving up. Last response:', data);
        }
        return data;
      })();
    }
    return screenshotsPromise.then((data) => {
      screenshotsData = data;
      return data;
    });
  }

  async function loadSteamWin() {
    await fetchSteam();
    renderSteamWin();
    loadInventory(); // independent of the above — never blocks profile/stats, and never gets blocked by them
  }

  function invHtml(inv) {
    if (!inv || !inv.synced || !inv.items || !inv.items.length) {
      return `<div class="nd-steam-inv-label"><span>${t('Инвентарь CS', 'CS inventory')}</span></div>
        <p class="nd-steam-dim" id="nd-steam-inv-fail">${t(
          'Не удалось загрузить инвентарь (Steam rate-limit / приватный профиль / таймаут).',
          'Could not load inventory (Steam rate-limit / private profile / timeout).'
        )} <button type="button" class="nd-btn98" id="nd-steam-inv-retry" style="margin-top:6px">${t('Повторить', 'Retry')}</button></p>`;
    }
    return `<div class="nd-steam-inv-label"><span>${t('Инвентарь CS · по ценности', 'CS inventory · by value')}</span><span>${t('показано', 'showing')} ${inv.items.length}${inv.total ? ' / ' + inv.total : ''}</span></div>
      <div class="nd-steam-inv-grid">${inv.items
        .map((it, i) => {
          const priceLabel = it.price_rub != null ? ` · ${Math.round(it.price_rub).toLocaleString('ru-RU')} ₽` : '';
          const title = `${it.name}${it.exterior ? ' (' + it.exterior + ')' : ''} — ${it.rarity || ''}${priceLabel}`;
          const inner = it.icon ? `<img src="${it.icon}" alt="" loading="lazy">` : '';
          const style = `style="--inv-color:${it.rarity_color || '#4b69ff'}"`;
          return `<button type="button" class="nd-steam-inv-item" ${style} title="${title}" data-i="${i}">${inner}</button>`;
        })
        .join('')}</div>`;
  }

  function renderInventorySlot(inv) {
    const slot = document.getElementById('nd-steam-inv-slot');
    if (!slot) return; // the Steam window re-rendered (e.g. language toggle) before this resolved
    // Keep a stable id on the wrapper so later retries can find it again
    // after outerHTML replaces the node.
    const html = invHtml(inv);
    const wrap = document.createElement('div');
    wrap.id = 'nd-steam-inv-slot';
    wrap.innerHTML = html;
    // invHtml may already be a full block — use outer content
    slot.replaceWith(wrap);
    // If invHtml returned a fragment starting with the label, the id is on wrap
    if (inv && inv.synced && inv.items && inv.items.length) {
      wrap.querySelectorAll('.nd-steam-inv-item').forEach((btn) => {
        onTap(btn, () => {
          const it = inv.items[Number(btn.dataset.i)];
          if (!it) return;
          openItemPopup(it);
        });
      });
    } else {
      const retry = wrap.querySelector('#nd-steam-inv-retry');
      onTap(retry, () => {
        inventoryData = null;
        inventoryPromise = null;
        wrap.innerHTML = `<p class="nd-steam-dim">${t('Загружаем инвентарь…', 'Loading inventory…')}</p>`;
        loadInventory();
      });
    }
  }

  async function loadInventory() {
    const data = await fetchInventory();
    renderInventorySlot(data && data.cs_inventory);
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
    const extra = steamData.extra || {};
    const statsHtml = extra.synced
      ? `<div class="nd-stat-grid">
           <div class="nd-stat">${t('Игр', 'Games')}<b>${extra.game_count ?? '—'}</b></div>
           <div class="nd-stat">${t('Часов', 'Hours')}<b>${extra.total_playtime_hours ?? '—'}</b></div>
           <div class="nd-stat">${t('Уровень', 'Level')}<b>${extra.level ?? '—'}</b></div>
         </div>`
      : '';
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
    const topGames = (steamData.top_games && steamData.top_games.games) || [];
    const topGamesHtml = topGames.length
      ? `<div class="nd-steam-games-label">${t('Больше всего наиграно', 'Most played')}</div>
         <ul class="nd-steam-games">${topGames
           .map((g) => `<li>${g.icon ? `<img src="${g.icon}" alt="">` : '<span class="nd-steam-noicon">🎮</span>'}<span class="nd-steam-game-name">${g.name}</span><span class="nd-steam-hours">${g.playtime_forever_hours}${t('ч', 'h')}</span></li>`)
           .join('')}</ul>`
      : '';
    body.innerHTML = `
      <div class="nd-win-head">
        <div class="nd-win-avatar-badge"><img src="${p.avatar}" alt=""></div>
        <div><div class="nd-win-name">${p.persona_name || ''}</div><div class="nd-steam-status">● ${statusLabel}</div></div>
      </div>
      ${statsHtml}
      ${gamesHtml}
      <div id="nd-steam-inv-slot"><p class="nd-steam-dim">${t('Загружаем инвентарь…', 'Loading inventory…')}</p></div>
      ${topGamesHtml}
      <a class="nd-btn98 nd-block" href="${p.profile_url}" target="_blank" rel="noopener">${t('Открыть профиль', 'Open profile')}</a>
    `;
    if (inventoryData) renderInventorySlot(inventoryData.cs_inventory); // already loaded (e.g. restoring after a language toggle) — fill it in immediately instead of waiting on loadInventory() again
  }

  /* FACEIT's real skill levels are 1-10, tiered into 5 color bands — grey,
     green, yellow, orange, red — shown on faceit.com as a flat dark circular
     badge with a solid ring in the tier's color (not a proportional
     progress meter; the "how close to the next level" figure is its own
     separate text, see faceitNextLevelHtml). Bracket cutoffs and colors are
     sampled straight from FACEIT's own level-icon legend so the badge here
     actually matches theirs, drawn locally instead of hotlinking their CDN. */
  const FACEIT_ELO_BRACKETS = [null, 100, 501, 751, 901, 1051, 1201, 1351, 1531, 1751, 2001];
  function faceitTier(level) {
    const tiers = [
      { max: 1, color: '#c7c7c7' },
      { max: 3, color: '#48e46c' },
      { max: 7, color: '#fccc24' },
      { max: 9, color: '#fc6c24' },
      { max: 10, color: '#e40024' },
    ];
    return tiers.find((tr) => level <= tr.max) || tiers[tiers.length - 1];
  }
  function faceitLevelIcon(level) {
    const lvl = Math.max(1, Math.min(10, Number(level) || 1));
    const tier = faceitTier(lvl);
    return `<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true" class="nd-faceit-lvl-ico">
      <circle cx="16" cy="16" r="15" fill="#141414"/>
      <circle cx="16" cy="16" r="13" fill="none" stroke="${tier.color}" stroke-width="2.6"/>
      <text x="16" y="20.5" text-anchor="middle" font-family="Verdana" font-weight="bold" font-size="13" fill="${tier.color}">${lvl}</text>
    </svg>`;
  }
  function faceitNextLevelHtml(level, elo) {
    const lvl = Number(level);
    const e = Number(elo);
    if (!lvl || !e || lvl >= 10 || !FACEIT_ELO_BRACKETS[lvl + 1]) return '';
    const remaining = FACEIT_ELO_BRACKETS[lvl + 1] - e;
    if (remaining <= 0) return '';
    return `<span class="nd-faceit-next">+${remaining} ${t('до', 'to')} ${lvl + 1} ${t('ур.', 'lvl')}</span>`;
  }

  function faceitWinbarHtml(winRate) {
    const pct = Math.max(0, Math.min(100, Number(winRate)));
    if (!Number.isFinite(pct)) return '';
    return `<div class="nd-faceit-winbar-row">
      <span class="nd-faceit-winbar-label">${t('Винрейт', 'Win rate')}</span>
      <div class="nd-faceit-winbar"><div class="nd-faceit-winbar-fill" style="width:${pct}%"></div></div>
      <span class="nd-faceit-winbar-pct">${pct}%</span>
    </div>`;
  }

  /* K/D per match instead of a flat win/loss bar — bar height maps K/D onto
     a 0-2.0 scale (capped), color still marks the win/loss so neither signal
     is lost, and the exact figure is in the title tooltip. */
  function faceitFormHtml(matches) {
    if (!matches || !matches.length) return '';
    const bars = matches
      .slice(0, 10)
      .map((m) => {
        const kd = Number(m.kd);
        const hasKd = Number.isFinite(kd);
        const heightPct = hasKd ? Math.max(10, Math.min(100, (kd / 2) * 100)) : 30;
        const cls = m.result === 'win' ? 'win' : m.result === 'loss' ? 'loss' : 'unknown';
        const title = hasKd ? `K/D ${kd.toFixed(2)}` : t('K/D неизвестен', 'K/D unknown');
        return `<span class="nd-faceit-bar ${cls}" style="height:${heightPct}%" title="${title}"></span>`;
      })
      .join('');
    return `<div class="nd-faceit-form-label">${t('Форма · K/D за матч', 'Form · K/D per match')}</div><div class="nd-faceit-form">${bars}</div>`;
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
    const stats = (faceitCache && faceitCache.stats) || {};
    const statsHtml = stats.synced
      ? `<div class="nd-stat-grid">
           <div class="nd-stat">${t('Матчи', 'Matches')}<b>${stats.matches ?? '—'}</b></div>
           <div class="nd-stat">${t('Победы %', 'Win rate %')}<b>${stats.win_rate ?? '—'}</b></div>
           <div class="nd-stat">K/D<b>${stats.kd_ratio ?? '—'}</b></div>
           <div class="nd-stat">HS%<b>${stats.headshot_pct ?? '—'}</b></div>
         </div>`
      : '';
    const matches = (faceitCache.recent_matches && faceitCache.recent_matches.matches) || [];
    const matchesHtml = matches.length
      ? `<div class="nd-faceit-matches-label">${t('Последние матчи', 'Recent matches')}</div>
         <div class="nd-faceit-matches">${matches
           .slice(0, 5)
           .map((m) => {
             const cls = m.result === 'win' ? 'win' : m.result === 'loss' ? 'loss' : 'unknown';
             const label = m.result === 'win' ? 'W' : m.result === 'loss' ? 'L' : '?';
             const date = m.finished_at ? new Date(m.finished_at * 1000).toLocaleDateString() : '';
             const kd = Number(m.kd);
             const kdLabel = Number.isFinite(kd) ? kd.toFixed(2) : '—';
             return `<a class="nd-faceit-match ${cls}" href="${m.faceit_url || '#'}" target="_blank" rel="noopener" title="${date}"><span>${label}</span><span class="nd-faceit-match-kd">${kdLabel}</span></a>`;
           })
           .join('')}</div>`
      : '';
    const winbarHtml = faceitWinbarHtml(stats.win_rate);
    const formHtml = faceitFormHtml(matches);
    body.innerHTML = `
      <div class="nd-win-head">
        <div class="nd-win-avatar-badge"><img src="${p.avatar}" alt=""></div>
        <div><div class="nd-win-name">${p.nickname || ''}</div><div class="nd-steam-status nd-faceit-level-row">${faceitLevelIcon(p.level)}<span>Elo ${p.elo ?? '—'} · ${t('уровень', 'level')} ${p.level ?? '—'} ${faceitNextLevelHtml(p.level, p.elo)}</span></div></div>
      </div>
      ${p.country ? `<div class="nd-faceit-country">${t('Страна', 'Country')}: ${String(p.country).toUpperCase()}</div>` : ''}
      ${statsHtml}
      ${winbarHtml}
      ${formHtml}
      ${matchesHtml}
      <a class="nd-btn98 nd-block" href="${p.faceit_url}" target="_blank" rel="noopener">${t('Открыть профиль', 'Open profile')}</a>
    `;
  }

  function renderAvatar() {
    const l = lang();
    const name = document.getElementById('nd-av-name');
    const tagline = document.getElementById('nd-av-tagline');
    if (name) name.textContent = PROFILE.name[l];
    if (tagline) tagline.textContent = (PROFILE.tagline && PROFILE.tagline[l]) || '';
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

    const input = document.getElementById('term-input');
    const focusInput = () => {
      if (!input) return;
      try { input.focus({ preventScroll: false }); } catch (_) { input.focus(); }
    };

    // touchstart fires before the 300ms click delay / callout — single tap
    // must open the keyboard immediately (no press-and-hold to "select").
    const maybeFocus = (e) => {
      if (!e.target) return;
      if (e.target.closest && e.target.closest('a, button')) return;
      // already on the input — leave it alone
      if (e.target === input) return;
      focusInput();
    };
    root.addEventListener('touchstart', maybeFocus, { passive: true });
    root.addEventListener('pointerdown', maybeFocus);
    // Also the whole window chrome body (padding around the black box)
    const win = document.getElementById('nd-win-console');
    if (win) {
      const body = win.querySelector('.nd-body') || win;
      body.addEventListener('touchstart', (e) => {
        if (e.target.closest && e.target.closest('button, .nd-tb')) return;
        focusInput();
      }, { passive: true });
    }
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
    // Targets come from terminal.py effect payloads (cv/projects/contact/…)
    // and a few aliases for convenience / future commands.
    const openers = {
      resume: () => openExplorer('resume'),
      projects: () => openExplorer('projects'),
      screens: () => openExplorer('screens'),
      screenshots: () => openExplorer('screens'),
      links: () => openExplorer('links'),
      pdf: () => openExplorer('pdf'),
      contact: () => show('contacts'),
      contacts: () => show('contacts'),
      explorer: () => openExplorer(state.tab || 'resume'),
      github: () => show('github'),
      codewars: () => show('codewars'),
      steam: () => show('steam'),
      faceit: () => show('faceit'),
      console: () => show('console'),
      music: () => show('music'),
      games: () => show('games'),
      videos: () => show('videos'),
      avatar: () => show('avatar'),
      taskmgr: () => show('taskmgr'),
      calc: () => show('calc'),
      notepad: () => show('notepad'),
    };
    GAME_KINDS.forEach((kind) => (openers[kind] = () => show(gameWinId(kind))));
    const fn = openers[id];
    if (fn) fn();
    else console.warn('[XP.open] unknown target:', id);
  };

  /* =========================================================
     Contacts window — a standalone version of the Explorer's
     "Сервисы" tab, open by default alongside the other windows.
     ========================================================= */
  function renderContacts() {
    const body = document.getElementById('nd-contacts-body');
    if (!body) return;
    body.innerHTML = linksHtml(lang());
  }

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
    document.querySelectorAll('.nd-ico').forEach((btn) => onTap(btn, () => openWinOrTab(btn)));
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
        openTurnOffDialog();
      });
    }
    const logoffBtn = document.getElementById('nd-sm-logoff');
    if (logoffBtn) {
      logoffBtn.addEventListener('click', () => {
        closeStartMenu();
        window.XP.boot.unlock();
        xpScreen(t('Выход из системы…', 'Logging off…'), () => window.location.reload());
      });
    }
  }

  /* =========================================================
     Windows XP "Turn off computer" — the desktop fades to grey behind the
     three-button dialog, then the blue "shutting down" screen with the
     shutdown chime. Restart runs the full cold boot (boot.js) right here;
     Turn Off lands back on this same page, powered off, and the power
     button there boots it the same way.
     ========================================================= */
  const SHUTDOWN_REDIRECT = '/';
  const POWER_FLAG = 'av-power';

  function xpScreen(message, then) {
    closeTurnOffDialog();
    const screen = document.getElementById('nd-xp-screen');
    const msg = document.getElementById('nd-xp-screen-msg');
    if (!screen) {
      then();
      return;
    }
    stopMusicPlayback();
    stopVideoPlayback();
    window.XP.boot.chime('shutdown'); // still inside the click, so the browser lets it play
    if (msg) msg.textContent = message;
    screen.hidden = false;
    setTimeout(then, 2800);
  }

  function hideXpScreen() {
    const screen = document.getElementById('nd-xp-screen');
    if (screen) screen.hidden = true;
  }

  function shutdownNow() {
    window.XP.boot.unlock();
    xpScreen(t('Завершение работы Windows…', 'Windows is shutting down…'), async () => {
      await window.XP.boot.crtOff();
      try {
        sessionStorage.setItem(POWER_FLAG, 'off');
      } catch (_) {
        /* no storage — it'll just come back up already on */
      }
      window.location.href = SHUTDOWN_REDIRECT;
    });
  }

  function restartNow() {
    window.XP.boot.unlock();
    xpScreen(t('Перезагрузка Windows…', 'Windows is restarting…'), async () => {
      await window.XP.boot.crtOff();
      hideXpScreen();
      resetDesktop();
      await window.XP.boot.boot();
    });
  }

  // What a reboot leaves behind: apps closed, grid windows back in place, a fresh console.
  function resetDesktop() {
    closeStartMenu();
    WIN_ORDER.forEach((id) => {
      if (FLOATING_WIN_IDS.has(id)) {
        closeWin(id);
      } else {
        state.closed[id] = false;
        setHidden(id, window.innerWidth <= 900); // phones start on the icon "home screen"
      }
      if (isMaximized(id)) toggleMaximize(id);
      delete state.detached[id];
      applyWinStyle(id);
    });
    cascade = 0;
    setTab('resume');
    if (window.XP.resetConsole) window.XP.resetConsole();
  }

  function openTurnOffDialog() {
    const dlg = document.getElementById('nd-xp-off');
    if (!dlg) {
      shutdownNow();
      return;
    }
    dlg.hidden = false;
    document.getElementById('nd-desktop').classList.add('nd-greyed');
    const off = dlg.querySelector('[data-off="shutdown"]');
    if (off) off.focus();
  }

  function closeTurnOffDialog() {
    const dlg = document.getElementById('nd-xp-off');
    if (dlg) dlg.hidden = true;
    document.getElementById('nd-desktop').classList.remove('nd-greyed');
  }

  function standBy() {
    closeTurnOffDialog();
    const cover = document.getElementById('nd-xp-standby');
    if (!cover) return;
    cover.hidden = false;
    const armedAt = Date.now();
    function wake(e) {
      if (Date.now() - armedAt < 500) return; // the click that chose "Stand By" shouldn't wake it straight back up
      if (e.type === 'keydown') e.preventDefault();
      cover.hidden = true;
      document.removeEventListener('keydown', wake, true);
      cover.removeEventListener('pointerdown', wake);
    }
    document.addEventListener('keydown', wake, true);
    cover.addEventListener('pointerdown', wake);
  }

  function initTurnOff() {
    const dlg = document.getElementById('nd-xp-off');
    if (!dlg) return;
    dlg.querySelectorAll('[data-off]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const act = btn.dataset.off;
        if (act === 'shutdown') shutdownNow();
        else if (act === 'restart') restartNow();
        else if (act === 'standby') standBy();
        else closeTurnOffDialog();
      })
    );
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) closeTurnOffDialog();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !dlg.hidden) closeTurnOffDialog();
    });
    // The terminal's `shutdown` goes straight to the XP shutdown screen.
    window.XP.effects.shutdown = shutdownNow;
  }

  /* =========================================================
     Init
     ========================================================= */
  document.addEventListener('DOMContentLoaded', () => {
    // Coming back from "Turn Off": start on the powered-off screen.
    let poweredOff = false;
    try {
      poweredOff = sessionStorage.getItem(POWER_FLAG) === 'off';
      sessionStorage.removeItem(POWER_FLAG);
    } catch (_) {
      poweredOff = false;
    }
    if (poweredOff) window.XP.boot.powerOff();
    else document.documentElement.classList.remove('pc-off');

    // Global iOS safety net for window content: only synthesize a click when
    // the browser fails to deliver one after a touch (fixed-in-overflow quirk).
    // If a real click arrives, cancel the pending synthetic one — never double-fire.
    let pending = null;
    document.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      const t = e.target;
      if (!t || !t.closest) return;
      const win = t.closest('.nd-win');
      if (!win || win.classList.contains('nd-hidden')) return;
      if (t.closest('.nd-tb')) return;
      const clickable = t.closest(
        'button, .nd-btn98, .mines-cell, .nd-shot, .nd-tabbtn, .nd-ico, .nd-plrow, .nd-video-icon, .nd-steam-inv-item, a.nd-btn98, .nd-card-links a, a.nd-win-link, #nd-big-shot img, #nd-lightbox-close, .nd-lightbox-nav, #nd-shot-prev, #nd-shot-next'
      );
      if (!clickable) return;
      // External links: open explicitly on touch (iOS sometimes swallows <a target=_blank>)
      if (clickable.tagName === 'A' && clickable.getAttribute('href')) {
        const href = clickable.getAttribute('href');
        if (href && !href.startsWith('#') && (clickable.target === '_blank' || href.startsWith('http'))) {
          if (pending) { clearTimeout(pending.timer); pending = null; }
          // Let the browser handle it if it will; also schedule open as backup
          const url = clickable.href;
          pending = {
            el: clickable,
            timer: setTimeout(() => {
              pending = null;
              try { window.open(url, '_blank', 'noopener'); } catch (_) { location.href = url; }
            }, 300),
          };
          return;
        }
      }
      if (pending) {
        clearTimeout(pending.timer);
        pending = null;
      }
      const el = clickable;
      pending = {
        el,
        timer: setTimeout(() => {
          // No click arrived in time — synthesize one.
          pending = null;
          try { el.click(); } catch (_) {}
        }, 300),
      };
    }, { passive: true });
    document.addEventListener('click', (e) => {
      if (!pending) return;
      if (pending.el === e.target || (e.target.closest && pending.el.contains(e.target)) || pending.el === e.target.closest('button, .nd-btn98, .mines-cell, .nd-shot, .nd-tabbtn, .nd-ico, .nd-plrow, .nd-video-icon, .nd-steam-inv-item, a.nd-btn98')) {
        clearTimeout(pending.timer);
        pending = null;
      }
    }, true);

    // Floating apps built in JS have to exist before initWindows() wires them.
    initTaskmgr();
    initCalc();
    initNotepad();
    initGameWindows();
    ON_CLOSE.music = stopMusicPlayback; // real Winamp: closing stops playback, minimizing doesn't
    ON_CLOSE.videos = stopVideoPlayback;
    initWindows();
    addTitlebarIcons();
    // Winamp, Games, Video and the small apps float over the desktop and,
    // unlike the grid windows, start closed (off the taskbar too) — opened
    // on demand from their icon / Start menu entry / console command.
    FLOATING_WIN_IDS.forEach((id) => {
      state.closed[id] = true;
      setHidden(id, true);
    });
    // Mobile: windows render as fixed full-screen overlays (see the
    // max-width: 900px rules below), so starting with all of them open would
    // stack full-screen panels on load with no way back to the desktop icons.
    // Start from a clean "home screen" instead — one tap opens what's wanted.
    if (window.innerWidth <= 900) {
      WIN_ORDER.forEach((id) => setHidden(id, true));
    }
    initIcons();
    initLightbox();
    initItemPopup();
    setTab('resume');
    renderAvatar();
    renderContacts();
    initConsoleWindow();
    renderGamesFolder();
    renderMusicWin();
    initVideosWin();
    loadGithub();
    loadSteamWin();
    loadFaceit();
    loadCodewars();
    loadMusicTracks();
    initTurnOff();

    document.querySelectorAll('.nd-tabbtn').forEach((b) => onTap(b, () => setTab(b.dataset.tab)));

    const arrangeBtn = document.getElementById('nd-arrange');
    if (arrangeBtn) arrangeBtn.addEventListener('click', arrange);
    const toggleAllBtn = document.getElementById('nd-toggle-all');
    if (toggleAllBtn) toggleAllBtn.addEventListener('click', toggleAll);
    initStartMenu();

    window.XP.onLangChange.push(() => {
      syncTaskbar();
      renderAvatar();
      renderGithub();
      renderSteamWin();
      renderFaceitWin();
      renderCodewars();
      renderContacts();
      renderGamesFolder();
      if (isOpen('taskmgr')) renderTaskmgr();
      if (isOpen('calc')) renderCalc();
      rerenderNotepad();
      const title = document.getElementById('nd-explorer-title');
      const addr = document.getElementById('nd-explorer-address');
      const l = lang();
      if (title) title.textContent = TAB_NAME[state.tab][l] + ' — ' + t('Мои документы', 'My Documents');
      if (addr) addr.textContent = 'C:\\' + t('Мои документы', 'My Documents') + '\\' + TAB_NAME[state.tab][l];
      renderTabPanel(state.tab);
    });
  });
})();