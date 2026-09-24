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
  const WIN_ORDER = ['avatar', 'steam', 'faceit', 'explorer', 'console', 'github', 'hh', 'contacts', 'music', 'games', 'videos'];
  const WIN_LABEL = {
    avatar: () => 'avatar.gif',
    steam: () => t('Steam', 'Steam'),
    faceit: () => 'FACEIT',
    explorer: () => t('Проводник', 'Explorer'),
    github: () => 'GitHub',
    hh: () => 'hh.ru',
    console: () => t('Консоль', 'Console'),
    contacts: () => t('Контакты', 'Contacts'),
    music: () => 'Winamp',
    games: () => t('Мини-игры', 'Mini-games'),
    videos: () => t('Видео', 'Video'),
  };
  const WIN_ICON = {
    avatar: 'ico-avatar',
    steam: 'ico-steam',
    faceit: 'ico-faceit',
    explorer: 'ico-folder',
    github: 'ico-github',
    hh: 'ico-hh',
    console: 'ico-console',
    contacts: 'ico-contacts',
    music: 'ico-music',
    games: 'ico-games',
    videos: 'ico-video',
  };
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


  const state = { hidden: {}, detached: {}, preMax: {}, z: {}, tab: 'resume' };
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
  const FLOATING_WIN_IDS = new Set(['music', 'games', 'videos']);
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
      onTap(close, () => {
        // Real Winamp behavior: closing it stops playback, minimizing it
        // (to the taskbar, same as every other window here) doesn't. Video
        // gets the same treatment — closing the player shouldn't leave it
        // playing in the background.
        if (id === 'music') stopMusicPlayback();
        else if (id === 'videos') stopVideoPlayback();
        toggleWin(id);
      });
      const maxBtn = el.querySelector('.nd-max');
      onTap(maxBtn, () => toggleMaximize(id));
      const resizeHandle = el.querySelector('.nd-resize');
      if (resizeHandle) resizeHandle.addEventListener('pointerdown', startResize(id));
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
      btn.innerHTML = `<svg aria-hidden="true"><use href="#${WIN_ICON[id]}"></use></svg>`;
      btn.title = WIN_LABEL[id]();
      btn.setAttribute('aria-label', (hidden ? t('Показать окно ', 'Show window ') : t('Скрыть окно ', 'Hide window ')) + WIN_LABEL[id]());
      onTap(btn, () => toggleWin(id));
      bar.appendChild(btn);
    });
    const allBtn = document.getElementById('nd-toggle-all');
    const allVisible = WIN_ORDER.every((id) => !state.hidden[id]);
    if (allBtn) allBtn.textContent = allVisible ? t('Свернуть всё', 'Hide all') : t('Показать всё', 'Show all');
  }

  function arrange() {
    state.detached = {};
    WIN_ORDER.forEach((id) => {
      if (isMaximized(id)) toggleMaximize(id);
      applyWinStyle(id);
    });
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
    bigEl.innerHTML = `<img src="${s.full}" alt="${s.title || ''}"><div class="nd-big-shot-hint">${t('нажмите, чтобы открыть на весь экран', 'click to open full screen')}</div>${linkHtml}`;
    bigEl.querySelector('img').addEventListener('click', () => openLightbox(s.full, s.view_url, true));
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
    if (!overlay) return;
    setLightboxImage(src, viewUrl);
    overlay.dataset.nav = nav ? 'screens' : '';
    const prevBtn = document.getElementById('nd-lightbox-prev');
    const nextBtn = document.getElementById('nd-lightbox-next');
    if (prevBtn) prevBtn.hidden = !nav;
    if (nextBtn) nextBtn.hidden = !nav;
    overlay.hidden = false;
  }
  function closeLightbox() {
    const overlay = document.getElementById('nd-lightbox');
    if (overlay) overlay.hidden = true;
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
    if (meta) {
      const priceLabel = it.price_rub != null ? `${Math.round(it.price_rub).toLocaleString('ru-RU')} ₽` : t('Цена неизвестна', 'Price unknown');
      const bits = [it.exterior, it.rarity].filter(Boolean).join(' · ');
      meta.innerHTML = `${bits ? `<div>${bits}</div>` : ''}<div class="nd-item-popup-price">${priceLabel}</div>`;
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
          <div class="nd-gcard-title">Snake_Deploy</div>
          <div id="nd-snake-root"></div>
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
    const snakeRoot = document.getElementById('nd-snake-root');
    if (snakeRoot) {
      snakeRoot.innerHTML = `
        <div class="nd-game-toolbar">
          <div class="nd-game-stats"><span>${t('Запросов', 'Requests')}: <b id="snake-score">0</b></span><span>${t('Рекорд', 'Best')}: <b id="snake-best">0</b></span></div>
          <button class="nd-btn98" id="snake-start">${t('▶ Деплой', '▶ Deploy')}</button>
        </div>
        <canvas id="snake-canvas" width="360" height="360"></canvas>
      `;
      window.XP.initGame('snake', snakeRoot, 'nd-snake');
    }
    void l;
  }

  function initGamesWin() {
    const body = document.getElementById('nd-games-body');
    if (!body) return;
    body.innerHTML = gamesHtml(lang());
    mountGames();
  }

  /* =========================================================
     Winamp — real playback of whatever's dropped into static/music/
     (title/artist/cover read server-side by api/music_sync.py). The window
     is standalone now (not an Explorer tab), so playback just keeps going
     regardless of what else is open, like a real Winamp instance would.
     ========================================================= */
  const MUSIC_HUES = [165, 265, 25, 200, 330]; // fallback "art" tile color when a track has no embedded cover
  const musicState = { playing: false, track: 0 };
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
            <div class="nd-wa-seek" id="nd-music-seek-track"><div class="nd-wa-seek-fill" id="nd-music-seek"></div></div>
          </div>
        </div>
        <div class="nd-music-ticker"><span class="nd-tick" id="nd-music-track"></span></div>
        <div class="nd-music-controls">
          <button class="nd-wbtn" id="nd-music-prev" aria-label="${t('Предыдущий трек', 'Previous track')}">◀◀</button>
          <button class="nd-wbtn" id="nd-music-play" aria-label="${t('Играть', 'Play')}">▶</button>
          <button class="nd-wbtn" id="nd-music-stop" aria-label="${t('Стоп', 'Stop')}">■</button>
          <button class="nd-wbtn" id="nd-music-next" aria-label="${t('Следующий трек', 'Next track')}">▶▶</button>
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
    if (!musicAudioEl || !timeEl) return;
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
      musicAudioEl.addEventListener('ended', () => playTrack(musicState.track + 1));
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
      seekTrack.addEventListener('click', (e) => {
        if (!musicAudioEl || !musicAudioEl.duration) return;
        const rect = seekTrack.getBoundingClientRect();
        musicAudioEl.currentTime = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) * musicAudioEl.duration;
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
    const memberSince = s.created_at ? new Date(s.created_at).getFullYear() : null;
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
        <div><div class="nd-win-name">BlazeStudio</div><a class="nd-win-link" href="${PROFILE.contacts.github}" target="_blank" rel="noopener">github.com/BlazeStudio</a></div>
      </div>
      <div class="nd-stat-grid nd-gh-stats">
        <div class="nd-stat">${t('Репозитории', 'Repos')}<b>${s.public_repos ?? '—'}</b></div>
        <div class="nd-stat">${t('Подписчики', 'Followers')}<b>${s.followers ?? '—'}</b></div>
        <div class="nd-stat">${t('Коммиты', 'Commits')}<b>${s.commit_count != null ? s.commit_count + '+' : '—'}</b></div>
        <div class="nd-stat">${t('На GitHub с', 'On GitHub since')}<b>${memberSince ?? '—'}</b></div>
      </div>
      ${heatHtml}
      <a class="nd-btn98 nd-block" href="${PROFILE.contacts.github}" target="_blank" rel="noopener">${t('Открыть профиль', 'Open profile')}</a>
    `;
    const heatWrap = document.getElementById('nd-gh-heat-wrap');
    if (heatWrap) heatWrap.scrollLeft = heatWrap.scrollWidth; // scrolled to the most recent weeks by default
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
    return fetchJsonSafe('/api/steam/inventory', { cs_inventory: { synced: false, items: [] } }, 12000);
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
        if (!data || !data.cs_inventory || !data.cs_inventory.synced) {
          console.error('[steam] CS inventory never synced after retries — giving up. Last response:', data);
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
    // iOS: the input only gets focus from a real user gesture on the field
    // (or its row). Tapping the output area used to do nothing, which felt
    // like "console is not clickable". Focus the input on any tap inside.
    const focusInput = () => {
      const input = document.getElementById('term-input');
      if (input) {
        try { input.focus({ preventScroll: false }); } catch (_) { input.focus(); }
      }
    };
    root.addEventListener('pointerdown', (e) => {
      // don't steal taps from buttons (close lives outside root anyway)
      if (e.target && e.target.closest && e.target.closest('button')) return;
      // defer focus slightly so the same gesture still registers as a click
      setTimeout(focusInput, 0);
    });
    const input = document.getElementById('term-input');
    if (input) {
      // Enter on mobile software keyboard
      input.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
          // keydown handler in terminal.js already runs the command;
          // this is a safety net for some iOS keyboards that only fire keyup
        }
      });
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
      steam: () => show('steam'),
      faceit: () => show('faceit'),
      console: () => show('console'),
      music: () => show('music'),
      games: () => show('games'),
      videos: () => show('videos'),
      hh: () => show('hh'),
      avatar: () => show('avatar'),
      // easter-egg "apps" that don't have their own window — land on console
      taskmgr: () => show('console'),
      calc: () => show('console'),
      notepad: () => show('console'),
    };
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
        window.XP.effects.shutdown();
      });
    }
  }

  /* =========================================================
     Init
     ========================================================= */
  document.addEventListener('DOMContentLoaded', () => {
    initWindows();
    // Winamp, mini-games and Video are standalone floating windows, but
    // unlike the rest they start closed even on desktop — opened on demand
    // from their icon/Start menu entry, on top of whatever else is open.
    setHidden('music', true);
    setHidden('games', true);
    setHidden('videos', true);
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
    renderHh();
    renderContacts();
    initConsoleWindow();
    initGamesWin();
    renderMusicWin();
    initVideosWin();
    loadGithub();
    loadSteamWin();
    loadFaceit();
    loadMusicTracks();

    document.querySelectorAll('.nd-tabbtn').forEach((b) => onTap(b, () => setTab(b.dataset.tab)));

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
      renderContacts();
      const title = document.getElementById('nd-explorer-title');
      const addr = document.getElementById('nd-explorer-address');
      const l = lang();
      if (title) title.textContent = TAB_NAME[state.tab][l] + ' — ' + t('Мои документы', 'My Documents');
      if (addr) addr.textContent = 'C:\\' + t('Мои документы', 'My Documents') + '\\' + TAB_NAME[state.tab][l];
      renderTabPanel(state.tab);
    });
  });
})();