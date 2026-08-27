'use strict';

window.XP.gameCleanup = window.XP.gameCleanup || {};

function t(ru, en) {
  return window.XP.lang() === 'ru' ? ru : en;
}

/* =========================================================
   Bug Hunt
   ========================================================= */
function initBugHunt(root, key) {
  const field = root.querySelector('#bughunt-field');
  const codeEl = root.querySelector('#bughunt-code');
  const scoreEl = root.querySelector('#bughunt-score');
  const timeEl = root.querySelector('#bughunt-time');
  const bestEl = root.querySelector('#bughunt-best');
  const startBtn = root.querySelector('#bughunt-start');

  const SNIPPET = `def process_payment(amount, account):
    balance = get_balance(account)
    if balance >= amount:
        balance -= amount
        save(account, balance)
    return balance

class RequestQueue:
    def __init__(self):
        self.items = []
    def push(self, item):
        self.items.append(item)

@app.route("/api/v1/deploy")
def deploy():
    run_migrations()
    restart_workers()
    return {"status": "ok"}`;
  codeEl.textContent = SNIPPET;

  let score = 0;
  let timeLeft = 20;
  let spawnTimer = null;
  let countdownTimer = null;
  let running = false;

  const best = Number(localStorage.getItem('av-bughunt-best') || 0);
  bestEl.textContent = best;

  function spawnBug() {
    if (!running) return;
    const bug = document.createElement('button');
    bug.className = 'bug';
    bug.textContent = '🐞';
    bug.style.left = Math.random() * 88 + '%';
    bug.style.top = Math.random() * 78 + '%';
    bug.addEventListener('click', () => {
      score += 1;
      scoreEl.textContent = score;
      bug.remove();
    });
    field.appendChild(bug);
    setTimeout(() => bug.remove(), 1500);
  }

  function stop() {
    running = false;
    clearInterval(spawnTimer);
    clearInterval(countdownTimer);
  }

  function endGame() {
    stop();
    field.querySelectorAll('.bug').forEach((b) => b.remove());
    const currentBest = Number(localStorage.getItem('av-bughunt-best') || 0);
    if (score > currentBest) {
      localStorage.setItem('av-bughunt-best', String(score));
      bestEl.textContent = score;
      window.XP.toast(t(`🏆 Новый рекорд: ${score}`, `🏆 New best: ${score}`));
    } else {
      window.XP.toast(t(`Игра окончена. Счёт: ${score}`, `Game over. Score: ${score}`));
    }
  }

  startBtn.addEventListener('click', () => {
    if (running) return;
    running = true;
    score = 0;
    timeLeft = 20;
    scoreEl.textContent = '0';
    timeEl.textContent = '20';
    field.querySelectorAll('.bug').forEach((b) => b.remove());
    spawnTimer = setInterval(spawnBug, 650);
    countdownTimer = setInterval(() => {
      timeLeft -= 1;
      timeEl.textContent = String(timeLeft);
      if (timeLeft <= 0) endGame();
    }, 1000);
  });

  window.XP.gameCleanup[key] = stop;
}

/* =========================================================
   Memory Match
   ========================================================= */
function initMemory(root, key) {
  const grid = root.querySelector('#memory-grid');
  const movesEl = root.querySelector('#memory-moves');
  const bestEl = root.querySelector('#memory-best');
  const restartBtn = root.querySelector('#memory-restart');

  const SYMBOLS = ['🐍', '🎯', '⚡', '🐳', '🗄️', '🔴', '☸️', '🔧'];
  let flipped = [];
  let matched = 0;
  let moves = 0;
  let lock = false;
  let disposed = false;
  let pendingFlipBack = null;

  function refreshBest() {
    const best = localStorage.getItem('av-memory-best');
    bestEl.textContent = best || '—';
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function build() {
    const cards = shuffle([...SYMBOLS, ...SYMBOLS]);
    flipped = [];
    matched = 0;
    moves = 0;
    lock = false;
    movesEl.textContent = '0';
    grid.innerHTML = cards.map((sym) => `<div class="memory-card" data-sym="${sym}">?</div>`).join('');
    grid.querySelectorAll('.memory-card').forEach((card) => card.addEventListener('click', () => onFlip(card)));
  }

  function onFlip(card) {
    if (lock || card.classList.contains('flipped') || card.classList.contains('matched')) return;
    card.classList.add('flipped');
    card.textContent = card.dataset.sym;
    flipped.push(card);

    if (flipped.length === 2) {
      moves += 1;
      movesEl.textContent = String(moves);
      lock = true;
      const [a, b] = flipped;
      if (a.dataset.sym === b.dataset.sym) {
        a.classList.add('matched');
        b.classList.add('matched');
        flipped = [];
        lock = false;
        matched += 1;
        if (matched === SYMBOLS.length) onWin();
      } else {
        pendingFlipBack = setTimeout(() => {
          if (disposed) return;
          [a, b].forEach((c) => {
            c.classList.remove('flipped');
            c.textContent = '?';
          });
          flipped = [];
          lock = false;
        }, 700);
      }
    }
  }

  function onWin() {
    const best = Number(localStorage.getItem('av-memory-best') || Infinity);
    if (moves < best) {
      localStorage.setItem('av-memory-best', String(moves));
      window.XP.toast(t(`🏆 Новый рекорд: ${moves} ходов`, `🏆 New best: ${moves} moves`));
    } else {
      window.XP.toast(t(`Готово за ${moves} ходов`, `Solved in ${moves} moves`));
    }
    refreshBest();
  }

  restartBtn.addEventListener('click', build);
  refreshBest();
  build();

  window.XP.gameCleanup[key] = () => {
    disposed = true;
    if (pendingFlipBack) clearTimeout(pendingFlipBack);
  };
}

/* =========================================================
   Snake_Deploy.py
   ========================================================= */
function initSnake(root, key) {
  const canvas = root.querySelector('#snake-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = root.querySelector('#snake-score');
  const bestEl = root.querySelector('#snake-best');
  const startBtn = root.querySelector('#snake-start');

  const SIZE = 18;
  const CELLS = Math.floor(canvas.width / SIZE);
  let snake, dir, nextDir, food, score, loopId, running;

  const best = Number(localStorage.getItem('av-snake-best') || 0);
  bestEl.textContent = best;

  function resetState() {
    snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    scoreEl.textContent = '0';
    placeFood();
  }

  function placeFood() {
    do {
      food = { x: Math.floor(Math.random() * CELLS), y: Math.floor(Math.random() * CELLS) };
    } while (snake.some((s) => s.x === food.x && s.y === food.y));
  }

  function draw() {
    ctx.fillStyle = '#06210f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffd25f';
    ctx.fillRect(food.x * SIZE + 2, food.y * SIZE + 2, SIZE - 4, SIZE - 4);
    snake.forEach((seg, idx) => {
      ctx.fillStyle = idx === 0 ? '#6ee06e' : 'rgba(110,224,110,0.75)';
      ctx.fillRect(seg.x * SIZE + 1, seg.y * SIZE + 1, SIZE - 2, SIZE - 2);
    });
  }

  function stop() {
    running = false;
    clearInterval(loopId);
  }

  function tick() {
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (head.x < 0 || head.y < 0 || head.x >= CELLS || head.y >= CELLS || snake.some((s) => s.x === head.x && s.y === head.y)) {
      gameOver();
      return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 1;
      scoreEl.textContent = String(score);
      placeFood();
    } else {
      snake.pop();
    }
    draw();
  }

  function gameOver() {
    stop();
    const currentBest = Number(localStorage.getItem('av-snake-best') || 0);
    if (score > currentBest) {
      localStorage.setItem('av-snake-best', String(score));
      bestEl.textContent = String(score);
      window.XP.toast(t(`🏆 Новый рекорд: ${score}`, `🏆 New best: ${score}`));
    } else {
      window.XP.toast(t(`💥 Downtime! Запросов: ${score}`, `💥 Downtime! Requests served: ${score}`));
    }
  }

  function start() {
    if (running) return;
    running = true;
    resetState();
    draw();
    loopId = setInterval(tick, 130);
  }

  const KEY_MAP = {
    ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, S: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }, D: { x: 1, y: 0 },
  };
  function onKey(e) {
    if (!running) return;
    const next = KEY_MAP[e.key];
    if (!next) return;
    if (next.x === -dir.x && next.y === -dir.y) return;
    nextDir = next;
    e.preventDefault();
  }

  document.addEventListener('keydown', onKey);
  startBtn.addEventListener('click', start);
  resetState();
  draw();

  window.XP.gameCleanup[key] = () => {
    stop();
    document.removeEventListener('keydown', onKey);
  };
}

/* =========================================================
   Minesweeper (Сапёр)
   ========================================================= */
function initMines(root, key) {
  const grid = root.querySelector('#mines-grid');
  const flagsEl = root.querySelector('#mines-flags');
  const timeEl = root.querySelector('#mines-time');
  const bestEl = root.querySelector('#mines-best');
  const restartBtn = root.querySelector('#mines-restart');
  const flagBtn = root.querySelector('#mines-flag-mode');

  const COLS = 9;
  const ROWS = 9;
  const MINES = 10;
  let cells, revealedCount, flagCount, firstClick, timer, elapsed, disposed, flagMode;

  const best = localStorage.getItem('av-mines-best');
  bestEl.textContent = best ? best + 's' : '—';

  function neighbors(i) {
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    const out = [];
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push(nr * COLS + nc);
      }
    }
    return out;
  }

  function placeMines(excludeIdx) {
    const excluded = new Set([excludeIdx, ...neighbors(excludeIdx)]);
    let placed = 0;
    while (placed < MINES) {
      const idx = Math.floor(Math.random() * COLS * ROWS);
      if (excluded.has(idx) || cells[idx].mine) continue;
      cells[idx].mine = true;
      placed += 1;
    }
    cells.forEach((cell, idx) => {
      if (cell.mine) return;
      cell.count = neighbors(idx).filter((n) => cells[n].mine).length;
    });
  }

  function paintCell(idx) {
    const btn = grid.children[idx];
    const cell = cells[idx];
    if (cell.revealed) {
      btn.className = 'mines-cell revealed' + (cell.mine ? ' mine' : '');
      if (cell.mine) {
        btn.textContent = '💣';
      } else if (cell.count > 0) {
        btn.textContent = String(cell.count);
        btn.dataset.n = String(cell.count);
      } else {
        btn.textContent = '';
      }
    } else {
      btn.className = 'mines-cell' + (cell.flagged ? ' flagged' : '');
      btn.textContent = cell.flagged ? '🚩' : '';
    }
  }

  function floodReveal(startIdx) {
    const stack = [startIdx];
    while (stack.length) {
      const idx = stack.pop();
      const cell = cells[idx];
      if (cell.revealed || cell.flagged) continue;
      cell.revealed = true;
      revealedCount += 1;
      paintCell(idx);
      if (cell.count === 0 && !cell.mine) {
        neighbors(idx).forEach((n) => {
          if (!cells[n].revealed) stack.push(n);
        });
      }
    }
  }

  function startTimer() {
    timer = setInterval(() => {
      elapsed += 1;
      timeEl.textContent = String(elapsed);
    }, 1000);
  }

  function stop() {
    clearInterval(timer);
  }

  function loseGame(hitIdx) {
    stop();
    cells.forEach((c, i) => {
      if (c.mine) {
        c.revealed = true;
        paintCell(i);
      }
    });
    grid.children[hitIdx].classList.add('hit');
    window.XP.toast(t('💥 Мина! Игра окончена', '💥 Boom! Game over'));
  }

  function checkWin() {
    if (revealedCount !== COLS * ROWS - MINES) return;
    stop();
    const currentBest = Number(localStorage.getItem('av-mines-best') || Infinity);
    if (elapsed < currentBest) {
      localStorage.setItem('av-mines-best', String(elapsed));
      bestEl.textContent = elapsed + 's';
      window.XP.toast(t(`🏆 Новый рекорд: ${elapsed}с`, `🏆 New best: ${elapsed}s`));
    } else {
      window.XP.toast(t(`Обезврежено за ${elapsed}с`, `Cleared in ${elapsed}s`));
    }
  }

  function onReveal(idx) {
    if (disposed) return;
    const cell = cells[idx];
    if (cell.revealed || cell.flagged) return;
    if (firstClick) {
      placeMines(idx);
      firstClick = false;
      startTimer();
    }
    if (cell.mine) {
      cell.revealed = true;
      paintCell(idx);
      loseGame(idx);
      return;
    }
    floodReveal(idx);
    checkWin();
  }

  function onFlag(idx) {
    if (disposed) return;
    const cell = cells[idx];
    if (cell.revealed) return;
    if (!cell.flagged && flagCount >= MINES) return;
    cell.flagged = !cell.flagged;
    flagCount += cell.flagged ? 1 : -1;
    flagsEl.textContent = String(MINES - flagCount);
    paintCell(idx);
  }

  function build() {
    stop();
    cells = Array.from({ length: COLS * ROWS }, () => ({ mine: false, count: 0, revealed: false, flagged: false }));
    revealedCount = 0;
    flagCount = 0;
    firstClick = true;
    elapsed = 0;
    flagMode = false;
    flagBtn.classList.remove('active');
    timeEl.textContent = '0';
    flagsEl.textContent = String(MINES);
    grid.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    grid.innerHTML = cells.map((_, i) => `<button class="mines-cell" data-i="${i}" type="button"></button>`).join('');
    grid.querySelectorAll('.mines-cell').forEach((btn) => {
      const idx = Number(btn.dataset.i);
      btn.addEventListener('click', () => (flagMode ? onFlag(idx) : onReveal(idx)));
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        onFlag(idx);
      });
    });
  }

  flagBtn.addEventListener('click', () => {
    flagMode = !flagMode;
    flagBtn.classList.toggle('active', flagMode);
  });
  restartBtn.addEventListener('click', build);
  build();

  window.XP.gameCleanup[key] = () => {
    disposed = true;
    stop();
  };
}

/* =========================================================
   Slots
   ========================================================= */
function initSlots(root, key) {
  const reelEls = [root.querySelector('#slots-r1'), root.querySelector('#slots-r2'), root.querySelector('#slots-r3')];
  const creditsEl = root.querySelector('#slots-credits');
  const bestEl = root.querySelector('#slots-best');
  const msgEl = root.querySelector('#slots-msg');
  const spinBtn = root.querySelector('#slots-spin');
  const restartBtn = root.querySelector('#slots-restart');

  const SYMBOLS = ['🐍', '☕', '🐛', '💾', '🔥', '⭐', '💎'];
  const BET = 10;
  const START_CREDITS = 100;
  let credits, spinning, disposed, spinTimer;

  const best = Number(localStorage.getItem('av-slots-best') || START_CREDITS);
  bestEl.textContent = String(best);

  function randomSymbol() {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  }

  function reset() {
    credits = START_CREDITS;
    creditsEl.textContent = String(credits);
    msgEl.textContent = '';
    spinBtn.disabled = false;
    reelEls.forEach((el) => (el.textContent = SYMBOLS[0]));
  }

  function finishSpin() {
    const result = [randomSymbol(), randomSymbol(), randomSymbol()];
    reelEls.forEach((el, i) => (el.textContent = result[i]));
    let win = 0;
    if (result[0] === result[1] && result[1] === result[2]) win = BET * 8;
    else if (result[0] === result[1] || result[1] === result[2] || result[0] === result[2]) win = BET * 2;

    if (win > 0) {
      credits += win;
      msgEl.textContent = t(`🎉 Выигрыш: +${win}`, `🎉 Win: +${win}`);
    } else {
      msgEl.textContent = t('Мимо. Ещё раз?', 'No luck. Try again?');
    }
    creditsEl.textContent = String(credits);

    const currentBest = Number(localStorage.getItem('av-slots-best') || START_CREDITS);
    if (credits > currentBest) {
      localStorage.setItem('av-slots-best', String(credits));
      bestEl.textContent = String(credits);
    }
    if (credits <= 0) {
      msgEl.textContent = t('Кредиты закончились. Нажмите «Заново».', 'Out of credits. Hit "Restart".');
    }
    spinning = false;
    spinBtn.disabled = false;
  }

  function spin() {
    if (spinning || disposed || credits < BET) return;
    spinning = true;
    credits -= BET;
    creditsEl.textContent = String(credits);
    msgEl.textContent = '';
    spinBtn.disabled = true;

    let ticks = 0;
    spinTimer = setInterval(() => {
      reelEls.forEach((el) => (el.textContent = randomSymbol()));
      ticks += 1;
      if (ticks >= 12) {
        clearInterval(spinTimer);
        finishSpin();
      }
    }, 80);
  }

  spinBtn.addEventListener('click', spin);
  restartBtn.addEventListener('click', reset);
  reset();

  window.XP.gameCleanup[key] = () => {
    disposed = true;
    clearInterval(spinTimer);
  };
}

/* =========================================================
   Tetris (Blocks_Deploy)
   ========================================================= */
function initTetris(root, key) {
  const canvas = root.querySelector('#tetris-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = root.querySelector('#tetris-score');
  const linesEl = root.querySelector('#tetris-lines');
  const bestEl = root.querySelector('#tetris-best');
  const startBtn = root.querySelector('#tetris-start');

  const COLS = 10;
  const ROWS = 20;
  const SIZE = 18;
  const COLORS = { I: '#5fd0ff', O: '#ffd25f', T: '#c98bff', S: '#6ee06e', Z: '#ff5f5f', J: '#5f8bff', L: '#ff9a4c' };
  const SHAPES = {
    I: [[[1, 1, 1, 1]], [[1], [1], [1], [1]]],
    O: [[[1, 1], [1, 1]]],
    T: [[[0, 1, 0], [1, 1, 1]], [[1, 0], [1, 1], [1, 0]], [[1, 1, 1], [0, 1, 0]], [[0, 1], [1, 1], [0, 1]]],
    S: [[[0, 1, 1], [1, 1, 0]], [[1, 0], [1, 1], [0, 1]]],
    Z: [[[1, 1, 0], [0, 1, 1]], [[0, 1], [1, 1], [1, 0]]],
    J: [[[1, 0, 0], [1, 1, 1]], [[1, 1], [1, 0], [1, 0]], [[1, 1, 1], [0, 0, 1]], [[0, 1], [0, 1], [1, 1]]],
    L: [[[0, 0, 1], [1, 1, 1]], [[1, 0], [1, 0], [1, 1]], [[1, 1, 1], [1, 0, 0]], [[1, 1], [0, 1], [0, 1]]],
  };
  const TYPES = Object.keys(SHAPES);

  let board, current, running, loopId, score, lines, disposed;

  const best = Number(localStorage.getItem('av-tetris-best') || 0);
  bestEl.textContent = String(best);

  function emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function spawnPiece() {
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    const shape = SHAPES[type][0];
    const x = Math.floor((COLS - shape[0].length) / 2);
    return { type, rot: 0, x, y: 0 };
  }

  function shapeOf(piece) {
    return SHAPES[piece.type][piece.rot];
  }

  function collides(piece, dx, dy, rot) {
    const shape = SHAPES[piece.type][rot != null ? rot : piece.rot];
    for (let r = 0; r < shape.length; r += 1) {
      for (let c = 0; c < shape[r].length; c += 1) {
        if (!shape[r][c]) continue;
        const nx = piece.x + c + dx;
        const ny = piece.y + r + dy;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r -= 1) {
      if (board[r].every((cell) => cell)) {
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(null));
        cleared += 1;
        r += 1;
      }
    }
    if (cleared > 0) {
      lines += cleared;
      score += [0, 100, 300, 500, 800][cleared] || cleared * 200;
      linesEl.textContent = String(lines);
      scoreEl.textContent = String(score);
    }
  }

  function stop() {
    running = false;
    clearInterval(loopId);
  }

  function gameOver() {
    stop();
    const currentBest = Number(localStorage.getItem('av-tetris-best') || 0);
    if (score > currentBest) {
      localStorage.setItem('av-tetris-best', String(score));
      bestEl.textContent = String(score);
      window.XP.toast(t(`🏆 Новый рекорд: ${score}`, `🏆 New best: ${score}`));
    } else {
      window.XP.toast(t(`Game over. Счёт: ${score}`, `Game over. Score: ${score}`));
    }
  }

  function lockPiece() {
    const shape = shapeOf(current);
    shape.forEach((row, r) => {
      row.forEach((v, c) => {
        if (!v) return;
        const ny = current.y + r;
        const nx = current.x + c;
        if (ny >= 0) board[ny][nx] = current.type;
      });
    });
    clearLines();
    current = spawnPiece();
    if (collides(current, 0, 0)) gameOver();
  }

  function drawCell(x, y, color) {
    if (y < 0) return;
    ctx.fillStyle = color;
    ctx.fillRect(x * SIZE + 1, y * SIZE + 1, SIZE - 2, SIZE - 2);
  }

  function draw() {
    ctx.fillStyle = '#06210f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    board.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) drawCell(c, r, COLORS[cell]);
      });
    });
    if (current) {
      shapeOf(current).forEach((row, r) => {
        row.forEach((v, c) => {
          if (v) drawCell(current.x + c, current.y + r, COLORS[current.type]);
        });
      });
    }
  }

  function tick() {
    if (!running) return;
    if (!collides(current, 0, 1)) {
      current.y += 1;
    } else {
      lockPiece();
    }
    draw();
  }

  function start() {
    if (running) return;
    running = true;
    board = emptyBoard();
    score = 0;
    lines = 0;
    scoreEl.textContent = '0';
    linesEl.textContent = '0';
    current = spawnPiece();
    draw();
    loopId = setInterval(tick, 500);
  }

  function move(dx) {
    if (!running) return;
    if (!collides(current, dx, 0)) {
      current.x += dx;
      draw();
    }
  }

  function rotate() {
    if (!running) return;
    const nextRot = (current.rot + 1) % SHAPES[current.type].length;
    if (!collides(current, 0, 0, nextRot)) {
      current.rot = nextRot;
      draw();
    }
  }

  function hardDrop() {
    if (!running) return;
    while (!collides(current, 0, 1)) current.y += 1;
    lockPiece();
    draw();
  }

  function onKey(e) {
    if (!running) return;
    if (e.key === 'ArrowLeft') {
      move(-1);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      move(1);
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      tick();
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      rotate();
      e.preventDefault();
    } else if (e.key === ' ') {
      hardDrop();
      e.preventDefault();
    }
  }

  document.addEventListener('keydown', onKey);
  startBtn.addEventListener('click', start);
  board = emptyBoard();
  draw();

  window.XP.gameCleanup[key] = () => {
    stop();
    document.removeEventListener('keydown', onKey);
    disposed = true;
  };
}

window.XP.initGame = function (kind, root, key) {
  key = key || 'game-' + kind;
  if (kind === 'bughunt') initBugHunt(root, key);
  else if (kind === 'memory') initMemory(root, key);
  else if (kind === 'snake') initSnake(root, key);
  else if (kind === 'mines') initMines(root, key);
  else if (kind === 'slots') initSlots(root, key);
  else if (kind === 'tetris') initTetris(root, key);
};
