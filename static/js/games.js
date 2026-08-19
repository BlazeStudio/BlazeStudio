'use strict';

window.XP.gameCleanup = window.XP.gameCleanup || {};

function t(ru, en) {
  return window.XP.lang() === 'ru' ? ru : en;
}

/* =========================================================
   Bug Hunt
   ========================================================= */
function initBugHunt(root) {
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

  window.XP.gameCleanup['game-bughunt'] = stop;
}

/* =========================================================
   Memory Match
   ========================================================= */
function initMemory(root) {
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

  window.XP.gameCleanup['game-memory'] = () => {
    disposed = true;
    if (pendingFlipBack) clearTimeout(pendingFlipBack);
  };
}

/* =========================================================
   Snake_Deploy.py
   ========================================================= */
function initSnake(root) {
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

  window.XP.gameCleanup['game-snake'] = () => {
    stop();
    document.removeEventListener('keydown', onKey);
  };
}

window.XP.initGame = function (kind, root) {
  if (kind === 'bughunt') initBugHunt(root);
  else if (kind === 'memory') initMemory(root);
  else if (kind === 'snake') initSnake(root);
};
