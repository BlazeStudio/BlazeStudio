'use strict';

/* =========================================================
   Desktop games. Each game owns its markup and logic: the desktop
   (new_desktop.js) hands it a window body to mount into and calls the
   returned cleanup when that window is closed. Keyboard-driven games only
   listen while their window is the active (topmost, visible) one, and the
   real-time ones pause themselves the moment it isn't — so two games open
   side by side never both eat the arrow keys.
   The old 2024 page keeps its own frozen copy in classic_games.js.
   ========================================================= */
(function () {
  const t = (ru, en) => window.XP.t(ru, en);
  // Static label that app.js's applyStaticI18n re-translates on a language switch.
  const L = (ru, en) => `<span data-ru="${ru}" data-en="${en}">${t(ru, en)}</span>`;

  function load(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch (_) {
      return fallback;
    }
  }
  function save(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch (_) {
      /* private mode / storage blocked — records just don't persist */
    }
  }

  function isActive(root) {
    return window.XP.isGameActive ? window.XP.isGameActive(root) : true;
  }
  function isTyping(e) {
    const el = e.target;
    return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  }
  function ownsKey(root, e) {
    return !isTyping(e) && isActive(root);
  }

  function els(root) {
    return (name) => root.querySelector(`[data-el="${name}"]`);
  }

  /* Keeps a canvas at the largest size that fits its box at the game's
     aspect ratio, with a devicePixelRatio-sized backing store so it stays
     crisp at any window size. Drawing code works in fixed logical units —
     setTransform does the scaling. */
  function fitCanvas(canvas, w, h, redraw) {
    const box = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    function resize() {
      const bw = box.clientWidth - 4; // minus the canvas's 2px border on each side (new_desktop.css)
      const bh = box.clientHeight - 4;
      if (bw <= 0 || bh <= 0) return;
      const scale = Math.min(bw / w, bh / h);
      const cssW = Math.max(1, Math.floor(w * scale));
      const cssH = Math.max(1, Math.floor(h * scale));
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
      redraw();
    }
    // No synchronous first call: the observer's initial callback sizes it
    // before the next paint, and by then the caller has its `ctx` in hand.
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    return { ctx, stop: () => ro.disconnect() };
  }

  function onSwipe(el, cb) {
    let sx = 0;
    let sy = 0;
    let tracking = false;
    el.addEventListener('touchstart', (e) => {
      const p = e.touches[0];
      sx = p.clientX;
      sy = p.clientY;
      tracking = true;
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      if (tracking) e.preventDefault();
    }, { passive: false });
    el.addEventListener('touchend', (e) => {
      if (!tracking) return;
      tracking = false;
      const p = e.changedTouches[0];
      const dx = p.clientX - sx;
      const dy = p.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      cb(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
    });
  }

  // On-screen buttons for touch devices (hidden on mouse/keyboard setups by CSS).
  function padHtml(buttons) {
    return `<div class="g-pad">${buttons
      .map(([act, label, ru, en]) => `<button type="button" class="nd-btn98 g-pad-btn" data-act="${act}" aria-label="${t(ru, en)}">${label}</button>`)
      .join('')}</div>`;
  }
  function wirePad(root, handler) {
    root.querySelectorAll('.g-pad-btn').forEach((b) => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        handler(b.dataset.act);
      });
    });
  }

  function overlay(el, html) {
    el.innerHTML = html || '';
    el.hidden = !html;
  }

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const KEY_DIR = {
    ArrowUp: 'up', w: 'up', W: 'up', 'ц': 'up', 'Ц': 'up',
    ArrowDown: 'down', s: 'down', S: 'down', 'ы': 'down', 'Ы': 'down',
    ArrowLeft: 'left', a: 'left', A: 'left', 'ф': 'left', 'Ф': 'left',
    ArrowRight: 'right', d: 'right', D: 'right', 'в': 'right', 'В': 'right',
  };

  // Beveled block — the one "3D" look Tetris and Breakout share.
  function bevel(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(x, y, w, 3);
    ctx.fillRect(x, y, 3, h);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(x, y + h - 3, w, 3);
    ctx.fillRect(x + w - 3, y, 3, h);
  }

  function paper(ctx, w, h, cell) {
    ctx.fillStyle = '#f7f6f0';
    ctx.fillRect(0, 0, w, h);
    if (!cell) return;
    ctx.strokeStyle = '#e6e3d6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = cell; x < w; x += cell) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    for (let y = cell; y < h; y += cell) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();
  }

  function recordBest(key, score, higherIsBetter) {
    const prev = Number(load(key, higherIsBetter ? 0 : Infinity));
    const better = higherIsBetter ? score > prev : score < prev;
    if (better) save(key, score);
    return better;
  }

  /* =========================================================
     Minesweeper
     ========================================================= */
  function mountMines(root) {
    const COLS = 9;
    const ROWS = 9;
    const MINES = 10;
    root.innerHTML = `
      <div class="g-wrap g-mines">
        <div class="mines-head">
          <span class="g-led" data-el="flags">010</span>
          <button type="button" class="mines-face" data-el="face" aria-label="${t('Новая игра', 'New game')}">🙂</button>
          <span class="g-led" data-el="time">000</span>
        </div>
        <div class="mines-grid" data-el="grid"></div>
        <div class="g-foot">
          <button type="button" class="nd-btn98" data-el="flagmode">🚩 ${L('Флажки', 'Flags')}</button>
          <span class="g-best">${L('Рекорд', 'Best')}: <b data-el="best">—</b></span>
        </div>
        <div class="g-hint">${L('ПКМ — флажок, клик по цифре — открыть соседей', 'Right-click flags, clicking a number opens its neighbours')}</div>
      </div>`;
    const $ = els(root);
    const grid = $('grid');
    const face = $('face');
    const flagsEl = $('flags');
    const timeEl = $('time');
    const bestEl = $('best');
    const flagBtn = $('flagmode');
    const led = (n) => String(n).padStart(3, '0');
    let cells;
    let revealed;
    let flags;
    let first;
    let timer = null;
    let elapsed;
    let over;
    let flagMode = false;

    function refreshBest() {
      const b = load('av-mines-best', '');
      bestEl.textContent = b ? b + t(' с', 's') : '—';
    }

    function neighbors(i) {
      const r = Math.floor(i / COLS);
      const c = i % COLS;
      const out = [];
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          if (!dr && !dc) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push(nr * COLS + nc);
        }
      }
      return out;
    }

    function placeMines(safe) {
      const excluded = new Set([safe, ...neighbors(safe)]);
      let placed = 0;
      while (placed < MINES) {
        const i = Math.floor(Math.random() * COLS * ROWS);
        if (excluded.has(i) || cells[i].mine) continue;
        cells[i].mine = true;
        placed += 1;
      }
      cells.forEach((c, i) => {
        c.n = neighbors(i).filter((n) => cells[n].mine).length;
      });
    }

    function paint(i) {
      const b = grid.children[i];
      const c = cells[i];
      b.className = 'mines-cell' + (c.open ? ' revealed' : '') + (c.open && c.mine ? ' mine' : '') + (!c.open && c.flag ? ' flagged' : '') + (c.hit ? ' hit' : '') + (c.wrong ? ' wrong' : '');
      if (c.open) b.textContent = c.mine ? '💣' : c.n || '';
      else b.textContent = c.wrong ? '❌' : c.flag ? '🚩' : '';
      if (c.open && c.n && !c.mine) b.dataset.n = c.n;
      else delete b.dataset.n;
    }

    function flood(start) {
      const stack = [start];
      while (stack.length) {
        const i = stack.pop();
        const c = cells[i];
        if (c.open || c.flag) continue;
        c.open = true;
        revealed += 1;
        paint(i);
        if (!c.n && !c.mine) neighbors(i).forEach((n) => !cells[n].open && stack.push(n));
      }
    }

    function stopTimer() {
      clearInterval(timer);
      timer = null;
    }

    function lose(i) {
      over = true;
      stopTimer();
      cells[i].hit = true;
      cells.forEach((c, k) => {
        if (c.mine && !c.flag) c.open = true;
        if (!c.mine && c.flag) c.wrong = true;
        paint(k);
      });
      face.textContent = '😵';
      window.XP.toast(t('💥 Мина! Игра окончена', '💥 Boom! Game over'));
    }

    function checkWin() {
      if (revealed !== COLS * ROWS - MINES) return;
      over = true;
      stopTimer();
      cells.forEach((c, k) => {
        if (c.mine && !c.flag) {
          c.flag = true;
          paint(k);
        }
      });
      flagsEl.textContent = led(0);
      face.textContent = '😎';
      if (recordBest('av-mines-best', elapsed, false)) window.XP.toast(t(`🏆 Новый рекорд: ${elapsed} с`, `🏆 New best: ${elapsed}s`));
      else window.XP.toast(t(`Поле разминировано за ${elapsed} с`, `Cleared in ${elapsed}s`));
      refreshBest();
    }

    function reveal(i) {
      const c = cells[i];
      if (over || c.open || c.flag) return;
      if (first) {
        first = false;
        placeMines(i);
        timer = setInterval(() => {
          elapsed = Math.min(999, elapsed + 1);
          timeEl.textContent = led(elapsed);
        }, 1000);
      }
      if (c.mine) {
        lose(i);
        return;
      }
      flood(i);
      checkWin();
    }

    // Classic "chord": clicking a number whose flags are all placed opens the rest around it.
    function chord(i) {
      const c = cells[i];
      if (over || !c.open || !c.n) return;
      const around = neighbors(i);
      if (around.filter((n) => cells[n].flag).length !== c.n) return;
      for (const n of around) {
        if (cells[n].open || cells[n].flag) continue;
        if (cells[n].mine) {
          lose(n);
          return;
        }
        flood(n);
      }
      checkWin();
    }

    function toggleFlag(i) {
      const c = cells[i];
      if (over || c.open) return;
      if (!c.flag && flags >= MINES) return;
      c.flag = !c.flag;
      flags += c.flag ? 1 : -1;
      flagsEl.textContent = led(MINES - flags);
      paint(i);
    }

    function build() {
      stopTimer();
      cells = Array.from({ length: COLS * ROWS }, () => ({ mine: false, n: 0, open: false, flag: false }));
      revealed = 0;
      flags = 0;
      first = true;
      elapsed = 0;
      over = false;
      face.textContent = '🙂';
      flagsEl.textContent = led(MINES);
      timeEl.textContent = led(0);
      grid.innerHTML = cells.map((_, i) => `<button type="button" class="mines-cell" data-i="${i}"></button>`).join('');
    }

    grid.addEventListener('click', (e) => {
      const b = e.target.closest('.mines-cell');
      if (!b) return;
      const i = Number(b.dataset.i);
      if (flagMode && !cells[i].open) toggleFlag(i);
      else if (cells[i].open) chord(i);
      else reveal(i);
    });
    grid.addEventListener('contextmenu', (e) => {
      const b = e.target.closest('.mines-cell');
      if (!b) return;
      e.preventDefault();
      toggleFlag(Number(b.dataset.i));
    });
    grid.addEventListener('pointerdown', (e) => {
      if (!over && e.button === 0 && e.target.closest('.mines-cell')) face.textContent = '😮';
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) =>
      grid.addEventListener(ev, () => {
        if (!over) face.textContent = '🙂';
      })
    );
    face.addEventListener('click', build);
    flagBtn.addEventListener('click', () => {
      flagMode = !flagMode;
      flagBtn.classList.toggle('active', flagMode);
    });
    refreshBest();
    build();
    return stopTimer;
  }

  /* =========================================================
     Slots — a classic three-reel fruit machine with weighted reels
     (rarer symbols pay more), an adjustable bet and a paytable.
     ========================================================= */
  const SLOT_SYMBOLS = [
    { id: 'cherry', html: '🍒', weight: 6, pay: 5 },
    { id: 'lemon', html: '🍋', weight: 5, pay: 8 },
    { id: 'orange', html: '🍊', weight: 5, pay: 10 },
    { id: 'grape', html: '🍇', weight: 4, pay: 15 },
    { id: 'bell', html: '🔔', weight: 3, pay: 20 },
    { id: 'bar', html: '<span class="sym-bar">BAR</span>', weight: 2, pay: 50 },
    { id: 'seven', html: '<span class="sym-7">7</span>', weight: 1, pay: 100 },
  ];
  const SLOT_TOTAL_WEIGHT = SLOT_SYMBOLS.reduce((a, s) => a + s.weight, 0);
  const SLOT_BETS = [1, 5, 10, 25, 50, 100];
  const SLOT_START = 100;
  const CHERRY = SLOT_SYMBOLS[0];

  function slotPayout(ids, bet) {
    if (ids[0] === ids[1] && ids[1] === ids[2]) return bet * SLOT_SYMBOLS.find((s) => s.id === ids[0]).pay;
    const cherries = ids.filter((id) => id === 'cherry').length;
    if (cherries === 2) return bet * 2;
    if (cherries === 1) return bet;
    return 0;
  }

  function mountSlots(root) {
    root.innerHTML = `
      <div class="g-wrap g-slots">
        <div class="g-bar">
          <div class="g-stats"><span>${L('Кредиты', 'Credits')}: <b data-el="credits">0</b></span><span>${L('Рекорд', 'Best')}: <b data-el="best">0</b></span></div>
          <div class="g-bar-btns">
            <button type="button" class="nd-btn98 g-help" data-el="help" title="${t('Таблица выплат', 'Paytable')}" aria-label="${t('Таблица выплат', 'Paytable')}">?</button>
            <button type="button" class="nd-btn98" data-el="reset">${L('Заново', 'Restart')}</button>
          </div>
        </div>
        <div class="slots-machine">
          <div class="slots-window" data-el="window">
            <div class="slots-reel"></div><div class="slots-reel"></div><div class="slots-reel"></div>
            <div class="slots-payline" aria-hidden="true"></div>
          </div>
          <div class="slots-bet">
            <span>${L('Ставка', 'Bet')}</span>
            <button type="button" class="nd-btn98 slots-bet-btn" data-el="betdown" aria-label="${t('Уменьшить ставку', 'Lower bet')}">−</button>
            <b class="g-led slots-bet-val" data-el="bet">10</b>
            <button type="button" class="nd-btn98 slots-bet-btn" data-el="betup" aria-label="${t('Увеличить ставку', 'Raise bet')}">+</button>
            <button type="button" class="nd-btn98 slots-bet-btn" data-el="betmax">MAX</button>
          </div>
          <button type="button" class="nd-btn98 slots-spin" data-el="spin">${L('Крутить', 'Spin')}</button>
          <div class="slots-msg" data-el="msg"></div>
        </div>
        <div class="slots-paytable" data-el="paytable" hidden>
          <div class="slots-paytable-box" role="dialog" aria-label="${t('Таблица выплат', 'Paytable')}">
            <div class="slots-paytable-title">${L('Таблица выплат', 'Paytable')}</div>
            <table><tbody data-el="paybody"></tbody></table>
            <p class="slots-paytable-note">${L('Выигрыш = ставка × множитель. Вишни считаются в любой позиции.', 'Win = bet × multiplier. Cherries count in any position.')}</p>
            <button type="button" class="nd-btn98" data-el="helpclose">OK</button>
          </div>
        </div>
      </div>`;
    const $ = els(root);
    const reelEls = [...root.querySelectorAll('.slots-reel')];
    const creditsEl = $('credits');
    const bestEl = $('best');
    const betEl = $('bet');
    const msgEl = $('msg');
    const spinBtn = $('spin');
    const windowEl = $('window');
    const paytable = $('paytable');
    const betBtns = [$('betdown'), $('betup'), $('betmax')];

    let credits = Number(load('av-slots-credits', SLOT_START));
    if (!Number.isFinite(credits) || credits < 0) credits = SLOT_START;
    let betIdx = SLOT_BETS.indexOf(10);
    let spinning = false;
    let spinTimer = null;
    let flashTimer = null;

    const randomSymbol = () => {
      let x = Math.random() * SLOT_TOTAL_WEIGHT;
      for (const s of SLOT_SYMBOLS) {
        x -= s.weight;
        if (x < 0) return s;
      }
      return CHERRY;
    };
    const reels = [0, 1, 2].map(() => [randomSymbol(), randomSymbol(), randomSymbol()]);

    function paintReel(r, blurred) {
      reelEls[r].innerHTML = reels[r].map((s, k) => `<div class="slots-cell${k === 1 ? '' : ' dim'}">${s.html}</div>`).join('');
      reelEls[r].classList.toggle('spinning', !!blurred);
    }

    function bet() {
      return SLOT_BETS[betIdx];
    }

    function renderPaytable() {
      const b = bet();
      const rows = SLOT_SYMBOLS.slice()
        .reverse()
        .map((s) => [s.html.repeat(3), s.pay]);
      rows.push([CHERRY.html.repeat(2) + ' <small>' + t('любые две', 'any two') + '</small>', 2]);
      rows.push([CHERRY.html + ' <small>' + t('любая одна', 'any one') + '</small>', 1]);
      $('paybody').innerHTML = rows
        .map(([combo, mult]) => `<tr><td class="slots-pt-combo">${combo}</td><td>×${mult}</td><td class="slots-pt-win">${(mult * b).toLocaleString('ru-RU')}</td></tr>`)
        .join('');
    }

    function sync() {
      creditsEl.textContent = String(credits);
      bestEl.textContent = load('av-slots-best', String(SLOT_START));
      betEl.textContent = String(bet());
      spinBtn.disabled = spinning || credits < bet();
      betBtns.forEach((b) => (b.disabled = spinning));
      save('av-slots-credits', credits);
      if (!paytable.hidden) renderPaytable();
    }

    function affordableIdx() {
      let i = 0;
      SLOT_BETS.forEach((b, k) => {
        if (b <= credits) i = k;
      });
      return i;
    }

    function setBet(i) {
      if (spinning) return;
      betIdx = Math.max(0, Math.min(SLOT_BETS.length - 1, i));
      if (bet() > credits && credits >= SLOT_BETS[0]) betIdx = affordableIdx();
      sync();
    }

    function finish() {
      spinning = false;
      const ids = reels.map((r) => r[1].id);
      const win = slotPayout(ids, bet());
      credits += win;
      if (win >= bet() * 50) {
        msgEl.textContent = t(`ДЖЕКПОТ! +${win}`, `JACKPOT! +${win}`);
        window.XP.effects.confetti();
      } else if (win > bet()) {
        msgEl.textContent = t(`Выигрыш: +${win}`, `You win: +${win}`);
      } else if (win === bet()) {
        msgEl.textContent = t('Вишня — ставка вернулась', 'Cherry — bet returned');
      } else {
        msgEl.textContent = t('Мимо. Ещё раз?', 'No luck. Again?');
      }
      if (win > 0) {
        windowEl.classList.add('win');
        clearTimeout(flashTimer);
        flashTimer = setTimeout(() => windowEl.classList.remove('win'), 1400);
      }
      if (credits > Number(load('av-slots-best', SLOT_START))) save('av-slots-best', credits);
      if (credits < SLOT_BETS[0]) msgEl.textContent = t('Кредиты закончились. Нажмите «Заново».', 'Out of credits. Hit “Restart”.');
      else if (credits < bet()) betIdx = affordableIdx();
      sync();
    }

    function spin() {
      if (spinning || credits < bet()) return;
      spinning = true;
      credits -= bet();
      msgEl.textContent = '';
      windowEl.classList.remove('win');
      sync();
      const stopAt = [11, 17, 23]; // reels stop one after another, left to right
      let tick = 0;
      spinTimer = setInterval(() => {
        tick += 1;
        for (let r = 0; r < 3; r += 1) {
          if (tick > stopAt[r]) continue;
          reels[r] = [randomSymbol(), reels[r][0], reels[r][1]];
          paintReel(r, tick < stopAt[r]);
        }
        if (tick >= stopAt[2]) {
          clearInterval(spinTimer);
          finish();
        }
      }, 65);
    }

    function onKey(e) {
      if (e.key !== ' ' || !ownsKey(root, e)) return;
      e.preventDefault();
      if (paytable.hidden) spin();
    }

    spinBtn.addEventListener('click', spin);
    $('betdown').addEventListener('click', () => setBet(betIdx - 1));
    $('betup').addEventListener('click', () => {
      if (SLOT_BETS[betIdx + 1] <= credits) setBet(betIdx + 1);
    });
    $('betmax').addEventListener('click', () => setBet(affordableIdx()));
    $('reset').addEventListener('click', () => {
      if (spinning) return;
      credits = SLOT_START;
      betIdx = SLOT_BETS.indexOf(10);
      msgEl.textContent = t('Новая игра: 100 кредитов', 'New game: 100 credits');
      sync();
    });
    $('help').addEventListener('click', () => {
      renderPaytable();
      paytable.hidden = false;
    });
    $('helpclose').addEventListener('click', () => (paytable.hidden = true));
    paytable.addEventListener('click', (e) => {
      if (e.target === paytable) paytable.hidden = true;
    });
    document.addEventListener('keydown', onKey);

    [0, 1, 2].forEach((r) => paintReel(r, false));
    if (credits < bet()) betIdx = affordableIdx();
    sync();
    return () => {
      clearInterval(spinTimer);
      clearTimeout(flashTimer);
      if (spinning) credits += bet(); // closing mid-spin refunds the bet instead of eating it
      save('av-slots-credits', credits);
      document.removeEventListener('keydown', onKey);
    };
  }

  /* =========================================================
     Snake
     ========================================================= */
  function mountSnake(root) {
    const N = 20;
    const CELL = 18;
    const W = N * CELL;
    root.innerHTML = `
      <div class="g-wrap g-snake">
        <div class="g-bar">
          <div class="g-stats"><span>${L('Очки', 'Score')}: <b data-el="score">0</b></span><span>${L('Рекорд', 'Best')}: <b data-el="best">0</b></span></div>
          <button type="button" class="nd-btn98" data-el="start">▶ ${L('Старт', 'Start')}</button>
        </div>
        <div class="g-stage" data-el="stage"><canvas></canvas><div class="g-overlay" data-el="overlay"></div></div>
        ${padHtml([
          ['left', '◀', 'Влево', 'Left'],
          ['up', '▲', 'Вверх', 'Up'],
          ['down', '▼', 'Вниз', 'Down'],
          ['right', '▶', 'Вправо', 'Right'],
        ])}
        <div class="g-hint">${L('Стрелки или WASD, пробел — пауза', 'Arrows or WASD, space pauses')}</div>
      </div>`;
    const $ = els(root);
    const canvas = root.querySelector('canvas');
    const overlayEl = $('overlay');
    const scoreEl = $('score');
    const bestEl = $('best');
    let snake;
    let dir;
    let queue;
    let food;
    let score;
    let state = 'idle'; // idle | play | paused | over
    let timer = null;

    function reset() {
      snake = [{ x: 7, y: 10 }, { x: 6, y: 10 }, { x: 5, y: 10 }];
      dir = DIRS.right;
      queue = [];
      score = 0;
      scoreEl.textContent = '0';
      placeFood();
    }

    function placeFood() {
      do {
        food = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) };
      } while (snake.some((s) => s.x === food.x && s.y === food.y));
    }

    const view = fitCanvas(canvas, W, W, () => draw());
    const ctx = view.ctx;

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
      else ctx.rect(x, y, w, h);
      ctx.fill();
    }

    function draw() {
      if (!snake) return;
      paper(ctx, W, W, CELL);
      // apple
      const fx = food.x * CELL + CELL / 2;
      const fy = food.y * CELL + CELL / 2 + 1;
      ctx.fillStyle = '#d93a22';
      ctx.beginPath();
      ctx.arc(fx, fy, CELL * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(fx - 2.5, fy - 2.5, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3c9a3c';
      ctx.beginPath();
      ctx.ellipse(fx + 2.5, fy - CELL * 0.38, 3.2, 1.6, -0.5, 0, Math.PI * 2);
      ctx.fill();
      // body, tail-to-head so the head draws on top
      for (let i = snake.length - 1; i >= 0; i -= 1) {
        const s = snake[i];
        const k = snake.length > 1 ? i / (snake.length - 1) : 0;
        ctx.fillStyle = i === 0 ? '#0a3fb0' : `hsl(${216 - k * 6}, 78%, ${46 + k * 20}%)`;
        roundRect(s.x * CELL + 1.5, s.y * CELL + 1.5, CELL - 3, CELL - 3, 4);
      }
      // eyes look where the snake is heading
      const h = snake[0];
      const cx = h.x * CELL + CELL / 2;
      const cy = h.y * CELL + CELL / 2;
      const px = -dir.y;
      const py = dir.x;
      [-1, 1].forEach((side) => {
        const ex = cx + dir.x * 3 + px * side * 3.6;
        const ey = cy + dir.y * 3 + py * side * 3.6;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ex, ey, 2.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(ex + dir.x, ey + dir.y, 1.1, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function speed() {
      return Math.max(65, 125 - score * 2);
    }

    function step() {
      if (state !== 'play') return;
      if (!isActive(root)) {
        pause();
        return;
      }
      if (queue.length) dir = queue.shift();
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      const hitsSelf = snake.some((s, i) => i < snake.length - 1 && s.x === head.x && s.y === head.y);
      if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || hitsSelf) {
        gameOver();
        return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 1;
        scoreEl.textContent = String(score);
        if (snake.length === N * N) {
          gameOver();
          return;
        }
        placeFood();
      } else {
        snake.pop();
      }
      draw();
    }

    function loop() {
      step();
      if (state === 'play') timer = setTimeout(loop, speed());
    }

    function start() {
      clearTimeout(timer);
      reset();
      state = 'play';
      overlay(overlayEl, '');
      draw();
      timer = setTimeout(loop, speed());
    }

    function pause() {
      if (state !== 'play') return;
      state = 'paused';
      clearTimeout(timer);
      overlay(overlayEl, `<b>${t('Пауза', 'Paused')}</b><span>${t('Пробел или клик — продолжить', 'Space or click to resume')}</span>`);
    }

    function resume() {
      if (state !== 'paused') return;
      state = 'play';
      overlay(overlayEl, '');
      timer = setTimeout(loop, speed());
    }

    function gameOver() {
      state = 'over';
      clearTimeout(timer);
      draw();
      const record = recordBest('av-snake-best', score, true);
      bestEl.textContent = load('av-snake-best', '0');
      overlay(
        overlayEl,
        `<b>${t('Игра окончена', 'Game over')}</b><span>${record ? t('Новый рекорд: ', 'New best: ') : t('Очки: ', 'Score: ')}${score}</span><span>${t('Клик — ещё раз', 'Click to play again')}</span>`
      );
    }

    function turn(name) {
      const next = DIRS[name];
      if (!next) return;
      if (state === 'idle' || state === 'over') return;
      if (state === 'paused') resume();
      const last = queue.length ? queue[queue.length - 1] : dir;
      if ((next.x === -last.x && next.y === -last.y) || (next.x === last.x && next.y === last.y)) return;
      if (queue.length < 2) queue.push(next);
    }

    function onKey(e) {
      if (!ownsKey(root, e)) return;
      if (e.key === ' ') {
        e.preventDefault();
        if (state === 'play') pause();
        else if (state === 'paused') resume();
        else start();
        return;
      }
      const name = KEY_DIR[e.key];
      if (!name) return;
      e.preventDefault();
      turn(name);
    }

    overlayEl.addEventListener('click', () => (state === 'paused' ? resume() : start()));
    $('start').addEventListener('click', start);
    document.addEventListener('keydown', onKey);
    onSwipe($('stage'), turn);
    wirePad(root, turn);

    bestEl.textContent = load('av-snake-best', '0');
    reset();
    draw();
    overlay(overlayEl, `<b>${t('Змейка', 'Snake')}</b><span>${t('Нажмите «Старт» или пробел', 'Press Start or space')}</span>`);
    return () => {
      clearTimeout(timer);
      view.stop();
      document.removeEventListener('keydown', onKey);
    };
  }

  /* =========================================================
     Tetris
     ========================================================= */
  const TETRO = {
    I: { color: '#29b6f6', shapes: [[[1, 1, 1, 1]], [[1], [1], [1], [1]]] },
    O: { color: '#fdd835', shapes: [[[1, 1], [1, 1]]] },
    T: { color: '#ab47bc', shapes: [[[0, 1, 0], [1, 1, 1]], [[1, 0], [1, 1], [1, 0]], [[1, 1, 1], [0, 1, 0]], [[0, 1], [1, 1], [0, 1]]] },
    S: { color: '#43a047', shapes: [[[0, 1, 1], [1, 1, 0]], [[1, 0], [1, 1], [0, 1]]] },
    Z: { color: '#e53935', shapes: [[[1, 1, 0], [0, 1, 1]], [[0, 1], [1, 1], [1, 0]]] },
    J: { color: '#1e63d6', shapes: [[[1, 0, 0], [1, 1, 1]], [[1, 1], [1, 0], [1, 0]], [[1, 1, 1], [0, 0, 1]], [[0, 1], [0, 1], [1, 1]]] },
    L: { color: '#fb8c00', shapes: [[[0, 0, 1], [1, 1, 1]], [[1, 0], [1, 0], [1, 1]], [[1, 1, 1], [1, 0, 0]], [[1, 1], [0, 1], [0, 1]]] },
  };
  const TETRO_TYPES = Object.keys(TETRO);

  function mountTetris(root) {
    const COLS = 10;
    const ROWS = 20;
    const CELL = 24;
    root.innerHTML = `
      <div class="g-wrap g-tetris">
        <div class="g-bar">
          <div class="g-stats"><span>${L('Очки', 'Score')}: <b data-el="score">0</b></span><span>${L('Рекорд', 'Best')}: <b data-el="best">0</b></span></div>
          <button type="button" class="nd-btn98" data-el="start">▶ ${L('Старт', 'Start')}</button>
        </div>
        <div class="g-tetris-main">
          <div class="g-stage" data-el="stage"><canvas></canvas><div class="g-overlay" data-el="overlay"></div></div>
          <div class="g-side">
            <div class="g-side-label">${L('Далее', 'Next')}</div>
            <div class="g-next"><canvas data-el="next"></canvas></div>
            <div class="g-side-label">${L('Линии', 'Lines')}</div><b class="g-led" data-el="lines">0</b>
            <div class="g-side-label">${L('Уровень', 'Level')}</div><b class="g-led" data-el="level">1</b>
            <div class="g-side-keys">${L('← → ход, ↑ поворот, ↓ быстрее, пробел — сброс, P — пауза', '← → move, ↑ rotate, ↓ soft drop, space hard drop, P pause')}</div>
          </div>
        </div>
        ${padHtml([
          ['left', '◀', 'Влево', 'Left'],
          ['rotate', '⟳', 'Повернуть', 'Rotate'],
          ['down', '▼', 'Вниз', 'Down'],
          ['right', '▶', 'Вправо', 'Right'],
          ['drop', '⤓', 'Сбросить', 'Drop'],
        ])}
      </div>`;
    const $ = els(root);
    const canvas = root.querySelector('.g-stage canvas');
    const overlayEl = $('overlay');
    const scoreEl = $('score');
    const bestEl = $('best');
    const linesEl = $('lines');
    const levelEl = $('level');
    let board = emptyBoard();
    let cur = null;
    let nextType = randomType();
    let score = 0;
    let lines = 0;
    let state = 'idle';
    let timer = null;

    function emptyBoard() {
      return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    }
    function randomType() {
      return TETRO_TYPES[Math.floor(Math.random() * TETRO_TYPES.length)];
    }
    function level() {
      return 1 + Math.floor(lines / 10);
    }
    function shape(p, rot) {
      const s = TETRO[p.type].shapes;
      return s[(rot == null ? p.rot : rot) % s.length];
    }
    function collides(p, dx, dy, rot) {
      const sh = shape(p, rot);
      for (let r = 0; r < sh.length; r += 1) {
        for (let c = 0; c < sh[r].length; c += 1) {
          if (!sh[r][c]) continue;
          const x = p.x + c + dx;
          const y = p.y + r + dy;
          if (x < 0 || x >= COLS || y >= ROWS) return true;
          if (y >= 0 && board[y][x]) return true;
        }
      }
      return false;
    }

    const view = fitCanvas(canvas, COLS * CELL, ROWS * CELL, () => draw());
    const ctx = view.ctx;
    const nextView = fitCanvas($('next'), 96, 72, () => drawNext());

    function drawNext() {
      const nctx = nextView.ctx;
      nctx.fillStyle = '#f7f6f0';
      nctx.fillRect(0, 0, 96, 72);
      const sh = TETRO[nextType].shapes[0];
      const s = 18;
      const ox = (96 - sh[0].length * s) / 2;
      const oy = (72 - sh.length * s) / 2;
      sh.forEach((row, r) => row.forEach((v, c) => v && bevel(nctx, ox + c * s, oy + r * s, s, s, TETRO[nextType].color)));
    }

    function dropY(p) {
      let dy = 0;
      while (!collides(p, 0, dy + 1)) dy += 1;
      return p.y + dy;
    }

    function draw() {
      paper(ctx, COLS * CELL, ROWS * CELL, CELL);
      board.forEach((row, r) => row.forEach((type, c) => type && bevel(ctx, c * CELL, r * CELL, CELL, CELL, TETRO[type].color)));
      if (!cur) return;
      const gy = dropY(cur);
      ctx.strokeStyle = TETRO[cur.type].color;
      ctx.lineWidth = 2;
      shape(cur).forEach((row, r) =>
        row.forEach((v, c) => {
          if (v && gy + r >= 0) ctx.strokeRect((cur.x + c) * CELL + 2, (gy + r) * CELL + 2, CELL - 4, CELL - 4);
        })
      );
      shape(cur).forEach((row, r) =>
        row.forEach((v, c) => {
          if (v && cur.y + r >= 0) bevel(ctx, (cur.x + c) * CELL, (cur.y + r) * CELL, CELL, CELL, TETRO[cur.type].color);
        })
      );
    }

    function syncStats() {
      scoreEl.textContent = String(score);
      linesEl.textContent = String(lines);
      levelEl.textContent = String(level());
    }

    function spawn() {
      const type = nextType;
      nextType = randomType();
      drawNext();
      const sh = TETRO[type].shapes[0];
      cur = { type, rot: 0, x: Math.floor((COLS - sh[0].length) / 2), y: -sh.length + 1 };
      if (collides(cur, 0, 0)) gameOver();
    }

    function clearLines() {
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r -= 1) {
        if (board[r].every(Boolean)) {
          board.splice(r, 1);
          board.unshift(Array(COLS).fill(null));
          cleared += 1;
          r += 1;
        }
      }
      if (cleared) {
        score += [0, 100, 300, 500, 800][cleared] * level();
        lines += cleared;
        syncStats();
      }
    }

    function lock() {
      let topOut = false;
      shape(cur).forEach((row, r) =>
        row.forEach((v, c) => {
          if (!v) return;
          if (cur.y + r < 0) topOut = true;
          else board[cur.y + r][cur.x + c] = cur.type;
        })
      );
      if (topOut) {
        gameOver();
        return;
      }
      clearLines();
      spawn();
    }

    function interval() {
      return Math.max(90, 700 - (level() - 1) * 60);
    }

    function tick() {
      if (state !== 'play') return;
      if (!isActive(root)) {
        pause();
        return;
      }
      if (!collides(cur, 0, 1)) cur.y += 1;
      else lock();
      draw();
      if (state === 'play') timer = setTimeout(tick, interval());
    }

    function start() {
      clearTimeout(timer);
      board = emptyBoard();
      score = 0;
      lines = 0;
      syncStats();
      state = 'play';
      overlay(overlayEl, '');
      spawn();
      draw();
      timer = setTimeout(tick, interval());
    }

    function pause() {
      if (state !== 'play') return;
      state = 'paused';
      clearTimeout(timer);
      overlay(overlayEl, `<b>${t('Пауза', 'Paused')}</b><span>${t('P или клик — продолжить', 'P or click to resume')}</span>`);
    }

    function resume() {
      if (state !== 'paused') return;
      state = 'play';
      overlay(overlayEl, '');
      timer = setTimeout(tick, interval());
    }

    function gameOver() {
      state = 'over';
      clearTimeout(timer);
      cur = null;
      draw();
      const record = recordBest('av-tetris-best', score, true);
      bestEl.textContent = load('av-tetris-best', '0');
      overlay(
        overlayEl,
        `<b>${t('Игра окончена', 'Game over')}</b><span>${record ? t('Новый рекорд: ', 'New best: ') : t('Очки: ', 'Score: ')}${score}</span><span>${t('Клик — ещё раз', 'Click to play again')}</span>`
      );
    }

    function act(name) {
      if (state === 'paused' && name !== 'pause') resume();
      if (state !== 'play') return;
      if (name === 'left' || name === 'right') {
        const dx = name === 'left' ? -1 : 1;
        if (!collides(cur, dx, 0)) cur.x += dx;
      } else if (name === 'rotate') {
        const rot = (cur.rot + 1) % TETRO[cur.type].shapes.length;
        const kick = [0, -1, 1, -2, 2].find((dx) => !collides(cur, dx, 0, rot));
        if (kick !== undefined) {
          cur.x += kick;
          cur.rot = rot;
        }
      } else if (name === 'down') {
        if (!collides(cur, 0, 1)) {
          cur.y += 1;
          score += 1;
        } else {
          lock();
        }
        syncStats();
      } else if (name === 'drop') {
        const gy = dropY(cur);
        score += (gy - cur.y) * 2;
        cur.y = gy;
        lock();
        syncStats();
      }
      if (state === 'play') draw();
    }

    function onKey(e) {
      if (!ownsKey(root, e)) return;
      const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'rotate', ArrowDown: 'down', ' ': 'drop', x: 'rotate', X: 'rotate' };
      if (e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З') {
        e.preventDefault();
        if (state === 'play') pause();
        else resume();
        return;
      }
      const name = map[e.key];
      if (!name) return;
      e.preventDefault();
      if (state === 'idle' || state === 'over') {
        if (e.key === ' ') start();
        return;
      }
      act(name);
    }

    overlayEl.addEventListener('click', () => (state === 'paused' ? resume() : start()));
    $('start').addEventListener('click', start);
    document.addEventListener('keydown', onKey);
    wirePad(root, act);

    bestEl.textContent = load('av-tetris-best', '0');
    syncStats();
    draw();
    drawNext();
    overlay(overlayEl, `<b>${t('Тетрис', 'Tetris')}</b><span>${t('Нажмите «Старт» или пробел', 'Press Start or space')}</span>`);
    return () => {
      clearTimeout(timer);
      view.stop();
      nextView.stop();
      document.removeEventListener('keydown', onKey);
    };
  }

  /* =========================================================
     Breakout (Арканоид)
     ========================================================= */
  function mountBreakout(root) {
    const W = 480;
    const H = 360;
    const PAD_W = 78;
    const PAD_H = 10;
    const PAD_Y = H - 26;
    const R = 6;
    const COLS = 10;
    const GAP = 4;
    const SIDE = 16;
    const BRICK_W = (W - SIDE * 2 - GAP * (COLS - 1)) / COLS;
    const BRICK_H = 14;
    const TOP = 44;
    const ROW_COLORS = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#00acc1', '#6d4c41'];
    root.innerHTML = `
      <div class="g-wrap g-breakout">
        <div class="g-bar">
          <div class="g-stats"><span>${L('Очки', 'Score')}: <b data-el="score">0</b></span><span>${L('Жизни', 'Lives')}: <b data-el="lives">3</b></span><span>${L('Уровень', 'Level')}: <b data-el="level">1</b></span><span>${L('Рекорд', 'Best')}: <b data-el="best">0</b></span></div>
          <button type="button" class="nd-btn98" data-el="start">▶ ${L('Заново', 'Restart')}</button>
        </div>
        <div class="g-stage" data-el="stage"><canvas></canvas><div class="g-overlay" data-el="overlay"></div></div>
        ${padHtml([
          ['left', '◀', 'Влево', 'Left'],
          ['launch', '●', 'Запустить', 'Launch'],
          ['right', '▶', 'Вправо', 'Right'],
        ])}
        <div class="g-hint">${L('Мышь или ← →, пробел/клик — запуск мяча, P — пауза', 'Mouse or ← →, space/click launches, P pauses')}</div>
      </div>`;
    const $ = els(root);
    const canvas = root.querySelector('canvas');
    const stage = $('stage');
    const overlayEl = $('overlay');
    const scoreEl = $('score');
    const livesEl = $('lives');
    const levelEl = $('level');
    const bestEl = $('best');

    let paddleX;
    let ball;
    let bricks;
    let score;
    let lives;
    let lvl;
    let state; // ready | play | paused | over
    let raf = null;
    let last = 0;
    const held = { left: false, right: false };

    const view = fitCanvas(canvas, W, H, () => draw());
    const ctx = view.ctx;

    function ballSpeed() {
      return 250 + (lvl - 1) * 30;
    }

    function buildLevel() {
      const rows = Math.min(8, 3 + lvl);
      bricks = [];
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < COLS; c += 1) {
          bricks.push({ x: SIDE + c * (BRICK_W + GAP), y: TOP + r * (BRICK_H + GAP), color: ROW_COLORS[r], pts: (rows - r) * 10, alive: true });
        }
      }
    }

    function readyBall() {
      state = 'ready';
      ball = { x: paddleX + PAD_W / 2, y: PAD_Y - R, vx: 0, vy: 0 };
      overlay(overlayEl, `<span>${t('Пробел или клик — запустить мяч', 'Space or click to launch')}</span>`);
      overlayEl.classList.add('g-overlay-soft');
    }

    function newGame() {
      score = 0;
      lives = 3;
      lvl = 1;
      paddleX = (W - PAD_W) / 2;
      buildLevel();
      syncStats();
      readyBall();
      draw();
    }

    function syncStats() {
      scoreEl.textContent = String(score);
      livesEl.textContent = String(lives);
      levelEl.textContent = String(lvl);
      bestEl.textContent = load('av-breakout-best', '0');
    }

    function launch() {
      if (state === 'paused') {
        resume();
        return;
      }
      if (state === 'over') {
        newGame();
        return;
      }
      if (state !== 'ready') return;
      const angle = (Math.random() * 0.8 - 0.4) * (Math.PI / 3);
      ball.vx = ballSpeed() * Math.sin(angle);
      ball.vy = -ballSpeed() * Math.cos(angle);
      state = 'play';
      overlay(overlayEl, '');
      overlayEl.classList.remove('g-overlay-soft');
    }

    function pause() {
      if (state !== 'play') return;
      state = 'paused';
      overlay(overlayEl, `<b>${t('Пауза', 'Paused')}</b><span>${t('P или клик — продолжить', 'P or click to resume')}</span>`);
    }

    function resume() {
      if (state !== 'paused') return;
      state = 'play';
      overlay(overlayEl, '');
    }

    function loseLife() {
      lives -= 1;
      syncStats();
      if (lives <= 0) {
        state = 'over';
        const record = recordBest('av-breakout-best', score, true);
        syncStats();
        overlay(
          overlayEl,
          `<b>${t('Игра окончена', 'Game over')}</b><span>${record ? t('Новый рекорд: ', 'New best: ') : t('Очки: ', 'Score: ')}${score}</span><span>${t('Клик — ещё раз', 'Click to play again')}</span>`
        );
        return;
      }
      readyBall();
    }

    function hitBrick(prevX, prevY) {
      for (const b of bricks) {
        if (!b.alive) continue;
        const cx = Math.max(b.x, Math.min(ball.x, b.x + BRICK_W));
        const cy = Math.max(b.y, Math.min(ball.y, b.y + BRICK_H));
        if ((ball.x - cx) ** 2 + (ball.y - cy) ** 2 > R * R) continue;
        b.alive = false;
        score += b.pts;
        syncStats();
        // Came in from the side → bounce horizontally, otherwise vertically.
        if (prevX + R <= b.x || prevX - R >= b.x + BRICK_W) ball.vx = -ball.vx;
        else ball.vy = -ball.vy;
        ball.x = prevX;
        ball.y = prevY;
        if (!bricks.some((k) => k.alive)) {
          lvl += 1;
          buildLevel();
          syncStats();
          window.XP.toast(t(`Уровень ${lvl}!`, `Level ${lvl}!`));
          readyBall();
        }
        return;
      }
    }

    function physics(dt) {
      const speedPad = 430;
      if (held.left) paddleX -= speedPad * dt;
      if (held.right) paddleX += speedPad * dt;
      paddleX = Math.max(0, Math.min(W - PAD_W, paddleX));
      if (state === 'ready') {
        ball.x = paddleX + PAD_W / 2;
        ball.y = PAD_Y - R;
        return;
      }
      if (state !== 'play') return;
      const steps = Math.ceil((Math.hypot(ball.vx, ball.vy) * dt) / 3);
      for (let i = 0; i < steps && state === 'play'; i += 1) {
        const prevX = ball.x;
        const prevY = ball.y;
        ball.x += (ball.vx * dt) / steps;
        ball.y += (ball.vy * dt) / steps;
        if (ball.x < R) {
          ball.x = R;
          ball.vx = Math.abs(ball.vx);
        } else if (ball.x > W - R) {
          ball.x = W - R;
          ball.vx = -Math.abs(ball.vx);
        }
        if (ball.y < R) {
          ball.y = R;
          ball.vy = Math.abs(ball.vy);
        }
        if (ball.vy > 0 && ball.y + R >= PAD_Y && ball.y - R <= PAD_Y + PAD_H && ball.x >= paddleX - R && ball.x <= paddleX + PAD_W + R) {
          // Where it lands on the paddle sets the bounce angle (up to 60° off vertical).
          const rel = Math.max(-1, Math.min(1, (ball.x - (paddleX + PAD_W / 2)) / (PAD_W / 2)));
          const angle = rel * (Math.PI / 3);
          const sp = ballSpeed();
          ball.vx = sp * Math.sin(angle);
          ball.vy = -sp * Math.cos(angle);
          ball.y = PAD_Y - R;
        }
        if (ball.y > H + R) {
          loseLife();
          return;
        }
        hitBrick(prevX, prevY);
      }
    }

    function draw() {
      if (!bricks) return;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#fbfaf5');
      g.addColorStop(1, '#e9e6da');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      bricks.forEach((b) => b.alive && bevel(ctx, b.x, b.y, BRICK_W, BRICK_H, b.color));
      const pg = ctx.createLinearGradient(0, PAD_Y, 0, PAD_Y + PAD_H);
      pg.addColorStop(0, '#5aa0ff');
      pg.addColorStop(1, '#0a4fd0');
      ctx.fillStyle = pg;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(paddleX, PAD_Y, PAD_W, PAD_H, 5);
      else ctx.rect(paddleX, PAD_Y, PAD_W, PAD_H);
      ctx.fill();
      ctx.fillStyle = '#0a246a';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(ball.x - 2, ball.y - 2, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.033, (now - (last || now)) / 1000);
      last = now;
      if (!isActive(root)) {
        // Minimized or behind another window: freeze, and skip redrawing a canvas nobody's looking at.
        if (state === 'play') {
          pause();
          draw();
        }
        return;
      }
      if (state === 'play' || state === 'ready') physics(dt);
      draw();
    }

    function pointerToPaddle(e) {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      const x = ((e.clientX - rect.left) / rect.width) * W;
      paddleX = Math.max(0, Math.min(W - PAD_W, x - PAD_W / 2));
    }

    function onKey(e) {
      if (!ownsKey(root, e)) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        held[e.key === 'ArrowLeft' ? 'left' : 'right'] = e.type === 'keydown';
        if (state === 'paused' && e.type === 'keydown') resume();
      } else if (e.type === 'keydown' && e.key === ' ') {
        e.preventDefault();
        launch();
      } else if (e.type === 'keydown' && (e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З')) {
        e.preventDefault();
        if (state === 'play') pause();
        else resume();
      }
    }
    function onKeyUp(e) {
      if (e.key === 'ArrowLeft') held.left = false;
      if (e.key === 'ArrowRight') held.right = false;
    }

    stage.addEventListener('pointermove', (e) => {
      if (state === 'play' || state === 'ready') pointerToPaddle(e);
    });
    stage.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    stage.addEventListener('click', launch);
    $('start').addEventListener('click', newGame);
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onKeyUp);
    root.querySelectorAll('.g-pad-btn').forEach((b) => {
      const act = b.dataset.act;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (act === 'launch') launch();
        else held[act] = true;
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) =>
        b.addEventListener(ev, () => {
          if (act !== 'launch') held[act] = false;
        })
      );
    });

    newGame();
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      view.stop();
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keyup', onKeyUp);
    };
  }

  /* =========================================================
     2048
     ========================================================= */
  function mount2048(root) {
    root.innerHTML = `
      <div class="g-wrap g-2048">
        <div class="g-bar">
          <div class="g-stats"><span>${L('Очки', 'Score')}: <b data-el="score">0</b></span><span>${L('Рекорд', 'Best')}: <b data-el="best">0</b></span></div>
          <button type="button" class="nd-btn98" data-el="restart">${L('Новая игра', 'New game')}</button>
        </div>
        <div class="g2048-stage" data-el="stage">
          <div class="g2048-board" data-el="board"></div>
          <div class="g-overlay" data-el="overlay"></div>
        </div>
        <div class="g-hint">${L('Стрелки / WASD или свайп. Соберите плитку 2048!', 'Arrows / WASD or swipe. Get the 2048 tile!')}</div>
      </div>`;
    const $ = els(root);
    const boardEl = $('board');
    const overlayEl = $('overlay');
    const scoreEl = $('score');
    const bestEl = $('best');
    let grid;
    let score;
    let won;
    let over;

    function addTile() {
      const empty = grid.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
      if (!empty.length) return -1;
      const i = empty[Math.floor(Math.random() * empty.length)];
      grid[i] = Math.random() < 0.9 ? 2 : 4;
      return i;
    }

    function render(fresh, merged) {
      boardEl.innerHTML = grid
        .map((v, i) => {
          const cls = ['g2048-cell'];
          if (v) cls.push('t' + Math.min(v, 4096));
          if (v >= 1024) cls.push('big');
          if (i === fresh) cls.push('new');
          if (merged && merged.has(i)) cls.push('merged');
          return `<div class="${cls.join(' ')}">${v || ''}</div>`;
        })
        .join('');
      scoreEl.textContent = String(score);
      bestEl.textContent = load('av-2048-best', '0');
    }

    function lines(dir) {
      const out = [];
      for (let k = 0; k < 4; k += 1) {
        let idx;
        if (dir === 'left') idx = [0, 1, 2, 3].map((c) => k * 4 + c);
        else if (dir === 'right') idx = [3, 2, 1, 0].map((c) => k * 4 + c);
        else if (dir === 'up') idx = [0, 1, 2, 3].map((r) => r * 4 + k);
        else idx = [3, 2, 1, 0].map((r) => r * 4 + k);
        out.push(idx);
      }
      return out;
    }

    function canMove() {
      if (grid.some((v) => !v)) return true;
      for (let i = 0; i < 16; i += 1) {
        if (i % 4 < 3 && grid[i] === grid[i + 1]) return true;
        if (i < 12 && grid[i] === grid[i + 4]) return true;
      }
      return false;
    }

    function move(dir) {
      if (over || !overlayEl.hidden) return;
      let moved = false;
      const merged = new Set();
      lines(dir).forEach((idx) => {
        const vals = idx.map((i) => grid[i]).filter(Boolean);
        const res = [];
        for (let k = 0; k < vals.length; k += 1) {
          if (vals[k] === vals[k + 1]) {
            res.push(vals[k] * 2);
            score += vals[k] * 2;
            merged.add(idx[res.length - 1]);
            k += 1;
          } else {
            res.push(vals[k]);
          }
        }
        while (res.length < 4) res.push(0);
        idx.forEach((i, k) => {
          if (grid[i] !== res[k]) moved = true;
          grid[i] = res[k];
        });
      });
      if (!moved) return;
      const fresh = addTile();
      recordBest('av-2048-best', score, true);
      render(fresh, merged);
      if (!won && grid.some((v) => v >= 2048)) {
        won = true;
        overlay(overlayEl, `<b>2048!</b><span>${t('Вы победили. Клик — играть дальше', 'You win! Click to keep going')}</span>`);
      } else if (!canMove()) {
        over = true;
        overlay(overlayEl, `<b>${t('Ходов больше нет', 'No moves left')}</b><span>${t('Очки: ', 'Score: ')}${score}</span><span>${t('Клик — новая игра', 'Click for a new game')}</span>`);
      }
    }

    function newGame() {
      grid = Array(16).fill(0);
      score = 0;
      won = false;
      over = false;
      overlay(overlayEl, '');
      addTile();
      addTile();
      render(-1);
    }

    function onKey(e) {
      if (!ownsKey(root, e)) return;
      const name = KEY_DIR[e.key];
      if (!name) return;
      e.preventDefault();
      move(name);
    }

    overlayEl.addEventListener('click', () => {
      if (over) newGame();
      else overlay(overlayEl, '');
    });
    $('restart').addEventListener('click', newGame);
    document.addEventListener('keydown', onKey);
    onSwipe($('stage'), move);
    newGame();
    return () => document.removeEventListener('keydown', onKey);
  }

  /* =========================================================
     Registry — what the desktop's Games folder lists and opens.
     ========================================================= */
  window.XP.GAMES = {
    mines: { title: ['Сапёр', 'Minesweeper'], icon: 'ico-g-mines', size: [300, 410], mount: mountMines },
    slots: { title: ['Слоты', 'Slots'], icon: 'ico-g-slots', size: [360, 480], mount: mountSlots },
    snake: { title: ['Змейка', 'Snake'], icon: 'ico-g-snake', size: [380, 500], mount: mountSnake },
    tetris: { title: ['Тетрис', 'Tetris'], icon: 'ico-g-tetris', size: [400, 580], mount: mountTetris },
    breakout: { title: ['Арканоид', 'Breakout'], icon: 'ico-g-breakout', size: [540, 500], mount: mountBreakout },
    g2048: { title: ['2048', '2048'], icon: 'ico-g-2048', size: [360, 480], mount: mount2048 },
  };

  window.XP.mountGame = function (kind, root) {
    const game = window.XP.GAMES[kind];
    return game ? game.mount(root) || (() => {}) : () => {};
  };
})();
