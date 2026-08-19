'use strict';

/* =========================================================
   Shared state + data
   ========================================================= */
const SITE_DATA = JSON.parse(document.getElementById('site-data').textContent);

const state = {
  lang: localStorage.getItem('av-lang') || 'ru',
};

window.XP = {
  data: SITE_DATA,
  lang: () => state.lang,
  t: (ru, en) => (state.lang === 'ru' ? ru : en),
  onLangChange: [],
};

/* =========================================================
   i18n
   ========================================================= */
function applyStaticI18n(root) {
  (root || document).querySelectorAll('[data-ru][data-en]').forEach((el) => {
    el.textContent = el.dataset[state.lang];
  });
}
window.XP.applyStaticI18n = applyStaticI18n;

function setLang(lang) {
  state.lang = lang;
  localStorage.setItem('av-lang', lang);
  document.documentElement.lang = lang;
  document.getElementById('lang-btn').textContent = lang.toUpperCase();
  const cLangBtn = document.getElementById('c-lang-btn');
  if (cLangBtn) cLangBtn.textContent = lang.toUpperCase();
  applyStaticI18n();
  window.XP.onLangChange.forEach((fn) => {
    try {
      fn(lang);
    } catch (e) {
      /* a window content re-render failing shouldn't break the toggle */
    }
  });
}
window.XP.setLang = setLang;

/* =========================================================
   Boot sequence
   ========================================================= */
function runBoot() {
  const boot = document.getElementById('boot');
  const desktop = document.getElementById('desktop');
  setTimeout(() => {
    boot.classList.add('fade-out');
    desktop.hidden = false;
    setTimeout(() => {
      boot.hidden = true;
      showBalloon();
    }, 550);
  }, 1750);
}

function showBalloon() {
  const balloon = document.getElementById('balloon');
  balloon.hidden = false;
  const dismiss = () => (balloon.hidden = true);
  document.getElementById('balloon-close').addEventListener('click', dismiss);
  setTimeout(dismiss, 8000);
}

/* =========================================================
   Mode: the XP desktop vs. the plain scrolling résumé
   ========================================================= */
function setMode(mode) {
  localStorage.setItem('av-mode', mode);
  const desktop = document.getElementById('desktop');
  const boot = document.getElementById('boot');
  const classic = document.getElementById('classic');

  if (mode === 'classic') {
    desktop.hidden = true;
    boot.hidden = true;
    classic.hidden = false;
    if (window.XP.renderClassic && !window.XP.classicRendered) {
      window.XP.renderClassic();
      window.XP.classicRendered = true;
    }
  } else {
    if (window.XP.teardownClassicGames) window.XP.teardownClassicGames();
    classic.hidden = true;
    boot.hidden = true;
    desktop.hidden = false;
  }
}
window.XP.setMode = setMode;

/* =========================================================
   Clock
   ========================================================= */
function tickClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString(state.lang === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' });
}

/* =========================================================
   Toast
   ========================================================= */
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), 2200);
}
window.XP.toast = showToast;

/* =========================================================
   Effects: confetti / matrix / party / bsod / shutdown
   ========================================================= */
function confettiBurst() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors = ['#ff5f5f', '#6ee06e', '#5fa8ff', '#ffd25f'];
  const pieces = Array.from({ length: 130 }, () => ({
    x: canvas.width / 2,
    y: canvas.height / 2,
    vx: (Math.random() - 0.5) * 14,
    vy: (Math.random() - 0.5) * 14 - 4,
    size: Math.random() * 6 + 3,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
  }));
  let frame = 0;
  function step() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((p) => {
      p.vy += 0.28;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });
    frame += 1;
    if (frame < 110) requestAnimationFrame(step);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  step();
}

let matrixRAF = null;
function matrixToggle(durationMs) {
  const canvas = document.getElementById('matrix-canvas');
  if (matrixRAF) {
    cancelAnimationFrame(matrixRAF);
    matrixRAF = null;
    canvas.hidden = true;
    return;
  }
  canvas.hidden = false;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const cols = Math.floor(canvas.width / 16);
  const drops = new Array(cols).fill(1);
  const chars = '01アントンANTON01バジリエフ';
  function draw() {
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#3bff6b';
    ctx.font = '15px monospace';
    drops.forEach((y, i) => {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(ch, i * 16, y * 16);
      if (y * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i] += 1;
    });
    matrixRAF = requestAnimationFrame(draw);
  }
  draw();
  if (durationMs) {
    setTimeout(() => {
      if (matrixRAF) {
        cancelAnimationFrame(matrixRAF);
        matrixRAF = null;
        canvas.hidden = true;
      }
    }, durationMs);
  }
}

function partyMode(durationMs) {
  document.body.classList.add('party');
  setTimeout(() => document.body.classList.remove('party'), durationMs || 3000);
}

function bsodShow() {
  const el = document.getElementById('bsod');
  applyStaticI18n(el);
  el.hidden = false;
  function dismiss(e) {
    if (e && e.key && e.key !== 'Escape') return;
    el.hidden = true;
    document.removeEventListener('keydown', dismiss);
    el.removeEventListener('click', dismiss);
  }
  document.addEventListener('keydown', dismiss);
  el.addEventListener('click', dismiss);
}

function shutdownSequence() {
  const screen = document.getElementById('shutdown-screen');
  applyStaticI18n(screen);
  screen.hidden = false;
  setTimeout(() => {
    screen.hidden = true;
    document.getElementById('desktop').hidden = true;
    const boot = document.getElementById('boot');
    boot.hidden = false;
    boot.classList.remove('fade-out');
    boot.querySelector('.boot-bar-fill').style.animation = 'none';
    void boot.offsetWidth;
    boot.querySelector('.boot-bar-fill').style.animation = '';
    runBoot();
  }, 2200);
}

window.XP.effects = {
  confetti: confettiBurst,
  matrix: matrixToggle,
  party: partyMode,
  bsod: bsodShow,
  shutdown: shutdownSequence,
};

/* =========================================================
   Konami code — bonus, not one of the 10 console commands
   ========================================================= */
function initKonami() {
  const seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let pos = 0;
  document.addEventListener('keydown', (e) => {
    pos = e.key === seq[pos] ? pos + 1 : e.key === seq[0] ? 1 : 0;
    if (pos === seq.length) {
      pos = 0;
      confettiBurst();
      showToast(window.XP.t('🏆 Достижение: рекрутер старой школы', '🏆 Achievement: old-school recruiter'));
    }
  });
}

/* =========================================================
   Init
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.lang = state.lang;
  document.getElementById('lang-btn').textContent = state.lang.toUpperCase();
  const cLangBtn = document.getElementById('c-lang-btn');
  if (cLangBtn) cLangBtn.textContent = state.lang.toUpperCase();
  applyStaticI18n();
  initKonami();

  document.getElementById('lang-btn').addEventListener('click', () => setLang(state.lang === 'ru' ? 'en' : 'ru'));
  if (cLangBtn) cLangBtn.addEventListener('click', () => setLang(state.lang === 'ru' ? 'en' : 'ru'));
  document.getElementById('mode-btn').addEventListener('click', () => setMode('classic'));
  const cModeBtn = document.getElementById('c-mode-btn');
  if (cModeBtn) cModeBtn.addEventListener('click', () => setMode('xp'));

  tickClock();
  setInterval(tickClock, 1000 * 15);

  const savedMode = localStorage.getItem('av-mode');
  if (savedMode === 'classic') {
    document.getElementById('boot').hidden = true;
    setMode('classic');
  } else {
    runBoot();
  }
});
