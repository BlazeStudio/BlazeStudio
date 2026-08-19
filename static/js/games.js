'use strict';

/* =========================================================
   Arcade tab switching
   ========================================================= */
document.querySelectorAll('.arcade-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.arcade-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.game-view').forEach((v) => v.classList.remove('active'));
    document.getElementById('game-' + tab.dataset.game).classList.add('active');
  });
});

function lang() {
  return window.viLang ? window.viLang() : 'ru';
}

/* =========================================================
   Bug Hunt
   ========================================================= */
(function bugHunt() {
  const field = document.getElementById('bughunt-field');
  const codeEl = document.getElementById('bughunt-code');
  const scoreEl = document.getElementById('bughunt-score');
  const timeEl = document.getElementById('bughunt-time');
  const bestEl = document.getElementById('bughunt-best');
  const startBtn = document.getElementById('bughunt-start');
  if (!field) return;

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
    def pop(self):
        return self.items.pop(0)

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

  const best = Number(localStorage.getItem('vi-bughunt-best') || 0);
  bestEl.textContent = best;

  function spawnBug() {
    if (!running) return;
    const bug = document.createElement('button');
    bug.className = 'bug';
    bug.textContent = '🐞';
    bug.style.left = Math.random() * 90 + '%';
    bug.style.top = Math.random() * 82 + '%';
    bug.addEventListener('click', () => {
      score += 1;
      scoreEl.textContent = score;
      bug.remove();
    });
    field.appendChild(bug);
    setTimeout(() => bug.remove(), 1600);
  }

  function endGame() {
    running = false;
    clearInterval(spawnTimer);
    clearInterval(countdownTimer);
    field.querySelectorAll('.bug').forEach((b) => b.remove());
    if (score > best) {
      localStorage.setItem('vi-bughunt-best', String(score));
      bestEl.textContent = score;
      window.showToast(lang() === 'ru' ? `🏆 Новый рекорд: ${score}` : `🏆 New best: ${score}`);
    } else {
      window.showToast(lang() === 'ru' ? `Игра окончена. Счёт: ${score}` : `Game over. Score: ${score}`);
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
})();

/* =========================================================
   Memory Match
   ========================================================= */
(function memoryMatch() {
  const grid = document.getElementById('memory-grid');
  const movesEl = document.getElementById('memory-moves');
  const bestEl = document.getElementById('memory-best');
  const restartBtn = document.getElementById('memory-restart');
  if (!grid) return;

  const SYMBOLS = ['🐍', '🎯', '⚡', '🐳', '🗄️', '🔴', '☸️', '🔧'];
  let cards = [];
  let flipped = [];
  let matched = 0;
  let moves = 0;
  let lock = false;

  function bestKey() {
    return 'vi-memory-best';
  }

  function refreshBest() {
    const best = localStorage.getItem(bestKey());
    bestEl.textContent = best ? best : '—';
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function build() {
    cards = shuffle([...SYMBOLS, ...SYMBOLS]);
    flipped = [];
    matched = 0;
    moves = 0;
    lock = false;
    movesEl.textContent = '0';
    grid.innerHTML = cards
      .map((sym, idx) => `<div class="memory-card hidden-face" data-idx="${idx}" data-sym="${sym}">?</div>`)
      .join('');
    grid.querySelectorAll('.memory-card').forEach((card) => card.addEventListener('click', () => onFlip(card)));
  }

  function onFlip(card) {
    if (lock || card.classList.contains('flipped') || card.classList.contains('matched')) return;
    card.classList.remove('hidden-face');
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
        setTimeout(() => {
          [a, b].forEach((c) => {
            c.classList.remove('flipped');
            c.classList.add('hidden-face');
            c.textContent = '?';
          });
          flipped = [];
          lock = false;
        }, 700);
      }
    }
  }

  function onWin() {
    const best = Number(localStorage.getItem(bestKey()) || Infinity);
    if (moves < best) {
      localStorage.setItem(bestKey(), String(moves));
      window.showToast(lang() === 'ru' ? `🏆 Новый рекорд: ${moves} ходов` : `🏆 New best: ${moves} moves`);
    } else {
      window.showToast(lang() === 'ru' ? `Готово за ${moves} ходов` : `Solved in ${moves} moves`);
    }
    refreshBest();
  }

  restartBtn.addEventListener('click', build);
  refreshBest();
  build();
})();

/* =========================================================
   Snake_Deploy.py
   ========================================================= */
(function snakeDeploy() {
  const canvas = document.getElementById('snake-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('snake-score');
  const bestEl = document.getElementById('snake-best');
  const startBtn = document.getElementById('snake-start');

  const SIZE = 20;
  const CELLS = canvas.width / SIZE;
  let snake, dir, nextDir, food, score, loopId, running;

  const best = Number(localStorage.getItem('vi-snake-best') || 0);
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
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    for (let i = 0; i <= CELLS; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * SIZE, 0);
      ctx.lineTo(i * SIZE, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * SIZE);
      ctx.lineTo(canvas.width, i * SIZE);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffb454';
    ctx.fillRect(food.x * SIZE + 3, food.y * SIZE + 3, SIZE - 6, SIZE - 6);

    snake.forEach((seg, idx) => {
      ctx.fillStyle = idx === 0 ? '#3bffa0' : 'rgba(59,255,160,0.7)';
      ctx.fillRect(seg.x * SIZE + 1, seg.y * SIZE + 1, SIZE - 2, SIZE - 2);
    });
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
    running = false;
    clearInterval(loopId);
    const currentBest = Number(localStorage.getItem('vi-snake-best') || 0);
    if (score > currentBest) {
      localStorage.setItem('vi-snake-best', String(score));
      bestEl.textContent = String(score);
      window.showToast(lang() === 'ru' ? `🏆 Новый рекорд: ${score}` : `🏆 New best: ${score}`);
    } else {
      window.showToast(
        lang() === 'ru' ? `💥 Downtime! Обработано запросов: ${score}` : `💥 Downtime! Requests served: ${score}`
      );
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

  document.addEventListener('keydown', (e) => {
    if (!running) return;
    const next = KEY_MAP[e.key];
    if (!next) return;
    if (next.x === -dir.x && next.y === -dir.y) return;
    nextDir = next;
    e.preventDefault();
  });

  startBtn.addEventListener('click', start);
  resetState();
  draw();
})();
