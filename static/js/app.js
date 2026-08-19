'use strict';

/* =========================================================
   Data
   ========================================================= */
const SITE_DATA = JSON.parse(document.getElementById('site-data').textContent);
const PROFILE = SITE_DATA.profile;
const CATEGORIES = SITE_DATA.categories;

const state = {
  lang: localStorage.getItem('vi-lang') || 'ru',
  theme: localStorage.getItem('vi-theme') || 'night',
  activeCategory: 'all',
  liveProjects: SITE_DATA.projects.map((p) => ({ ...p, live: { synced: false } })),
};

const FLOOR_DESC = {
  hr: { ru: 'Кто я и почему стоит поговорить', en: 'Who I am and why it is worth a chat' },
  engineering: { ru: 'Технологии, которыми пользуюсь', en: 'Technologies I actually use' },
  lab: { ru: 'Проекты с живой синхронизацией GitHub', en: 'Projects, live-synced from GitHub' },
  archive: { ru: 'Опыт работы и образование', en: 'Work history and education' },
  arcade: { ru: 'Мини-игры, пока ждёте ответа', en: 'Mini-games while you wait' },
  contact: { ru: 'Как со мной связаться', en: 'How to reach me' },
};

const BOOT_LINES = {
  ru: [
    ['boot', 'vasiliev-inc-os v2.6 — запуск...'],
    ['ok', 'проверка кофемашины... OK'],
    ['ok', 'загрузка личного дела сотрудника №0001... OK'],
    ['ok', 'подключение к api.github.com... OK'],
    ['ok', 'инициализация 7 отделов... OK'],
    ['ok', 'запуск мини-игр в комнате отдыха... OK'],
    ['boot', 'система готова.'],
  ],
  en: [
    ['boot', 'vasiliev-inc-os v2.6 — starting...'],
    ['ok', 'checking coffee machine... OK'],
    ['ok', 'loading employee file #0001... OK'],
    ['ok', 'connecting to api.github.com... OK'],
    ['ok', 'initializing 7 departments... OK'],
    ['ok', 'starting break-room arcade... OK'],
    ['boot', 'system ready.'],
  ],
};

/* =========================================================
   Boot sequence
   ========================================================= */
function runBoot() {
  const linesEl = document.getElementById('boot-lines');
  const enterBtn = document.getElementById('boot-enter');
  const lines = BOOT_LINES[state.lang];
  let i = 0;

  function typeNext() {
    if (i >= lines.length) {
      enterBtn.classList.add('visible');
      return;
    }
    const [cls, text] = lines[i];
    const row = document.createElement('div');
    row.className = cls === 'ok' ? 'line-ok' : 'line-dim';
    row.textContent = text;
    linesEl.appendChild(row);
    i += 1;
    setTimeout(typeNext, 220 + Math.random() * 160);
  }
  typeNext();

  function enter() {
    document.removeEventListener('keydown', enter);
    enterBtn.removeEventListener('click', enter);
    const boot = document.getElementById('boot');
    boot.classList.add('fade-out');
    document.body.classList.remove('no-scroll');
    document.getElementById('app').hidden = false;
    setTimeout(() => { boot.hidden = true; }, 650);
  }
  enterBtn.addEventListener('click', enter);
  document.addEventListener('keydown', enter);
}

/* =========================================================
   i18n — simple attribute-based toggle + dynamic re-render
   ========================================================= */
function applyStaticI18n() {
  document.querySelectorAll('[data-ru][data-en]').forEach((el) => {
    el.textContent = el.dataset[state.lang];
  });
  document.documentElement.lang = state.lang;
  document.querySelectorAll('.pill-toggle button').forEach((b) => {
    b.classList.toggle('active', b.dataset.lang === state.lang);
  });
}

function setLang(lang) {
  state.lang = lang;
  localStorage.setItem('vi-lang', lang);
  applyStaticI18n();
  renderAll();
  buildElevator();
  updateActiveFloor();
}

/* =========================================================
   Theme
   ========================================================= */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme === 'day' ? 'day' : 'night');
  document.getElementById('theme-toggle').textContent = state.theme === 'day' ? '☀️' : '🌙';
}
function toggleTheme() {
  state.theme = state.theme === 'day' ? 'night' : 'day';
  localStorage.setItem('vi-theme', state.theme);
  applyTheme();
}

/* =========================================================
   Elevator nav
   ========================================================= */
function buildElevator() {
  const nav = document.getElementById('elevator');
  const floors = Array.from(document.querySelectorAll('main .floor'));
  nav.innerHTML = '';
  floors.forEach((floor) => {
    const btn = document.createElement('button');
    btn.className = 'elevator-floor';
    btn.dataset.target = floor.id;
    btn.innerHTML = `<span class="ic">${floor.dataset.icon}</span><span class="num">${floor.dataset.floor}</span><span class="tip">${floor.dataset['name' + (state.lang === 'ru' ? 'Ru' : 'En')]}</span>`;
    btn.addEventListener('click', () => floor.scrollIntoView({ behavior: 'smooth' }));
    nav.appendChild(btn);
  });
}

// Whichever floor's box contains the vertical center of the viewport "wins" — this
// stays correct no matter how tall an individual floor's content grows (a section
// several viewports tall would never cross a 50%-of-its-own-area IO threshold).
function updateActiveFloor() {
  const floors = Array.from(document.querySelectorAll('main .floor'));
  const centerY = window.innerHeight / 2;
  let current = floors[0];
  floors.forEach((f) => {
    const rect = f.getBoundingClientRect();
    if (rect.top <= centerY && rect.bottom >= centerY) current = f;
  });
  document.querySelectorAll('.elevator-floor').forEach((b) => b.classList.toggle('active', current && b.dataset.target === current.id));
}

function observeFloors() {
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      updateActiveFloor();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateActiveFloor();
}

/* =========================================================
   Dynamic renders
   ========================================================= */
function renderDirectory() {
  const el = document.getElementById('directory');
  const floors = Array.from(document.querySelectorAll('main .floor')).filter((f) => f.id !== 'reception');
  el.innerHTML = floors
    .map((f) => {
      const name = f.dataset['name' + (state.lang === 'ru' ? 'Ru' : 'En')];
      const desc = FLOOR_DESC[f.id] ? FLOOR_DESC[f.id][state.lang] : '';
      return `<a class="directory-item panel" href="#${f.id}">
        <span class="fl-num">${f.dataset.floor}</span>
        <span>
          <span class="fl-name">${f.dataset.icon} ${name}</span>
          <span class="fl-desc">${desc}</span>
        </span>
      </a>`;
    })
    .join('');

  document.getElementById('hero-role').textContent = PROFILE.role[state.lang];
  document.getElementById('hero-tagline').textContent = PROFILE.tagline[state.lang];
}

function renderHR() {
  document.getElementById('id-name').textContent = PROFILE.name[state.lang];
  document.getElementById('id-role').textContent = PROFILE.role[state.lang];
  document.getElementById('id-location').textContent = PROFILE.location[state.lang];
  document.getElementById('id-format').textContent = PROFILE.format[state.lang];
  const employmentParts = PROFILE.employment[state.lang].split(' — ');
  document.getElementById('stat-employment').textContent = employmentParts[1] || employmentParts[0];

  document.getElementById('about-text').innerHTML = PROFILE.about[state.lang].map((p) => `<p>${p}</p>`).join('');
  document.getElementById('trait-chips').innerHTML = PROFILE.traits.map((t) => `<span class="chip">${t[state.lang]}</span>`).join('');

  document.getElementById('lang-bars').innerHTML = PROFILE.languages
    .map(
      (l) => `<div class="lang-bar-row">
        <div class="lang-bar-label">${l.name[state.lang]}<small>${l.level[state.lang]}</small></div>
        <div class="bar-track"><div class="bar-fill" data-value="${l.value}"></div></div>
      </div>`
    )
    .join('');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll('#lang-bars .bar-fill').forEach((el) => {
        el.style.width = el.dataset.value + '%';
      });
    });
  });
}

function renderSkills() {
  const el = document.getElementById('skills-grid');
  const icons = { backend: '⚙️', data: '📊', infra: '🧱', practice: '✅' };
  el.innerHTML = Object.entries(PROFILE.skills)
    .map(([key, group]) => {
      const rows = group.items
        .map(
          (item) => `<div class="skill-row">
            <div class="top"><span>${item.name}</span><span>${item.level}%</span></div>
            <div class="bar-track"><div class="bar-fill" data-value="${item.level}"></div></div>
          </div>`
        )
        .join('');
      return `<div class="skill-card panel"><h3>${icons[key] || '▸'} ${group.label[state.lang]}</h3>${rows}</div>`;
    })
    .join('');

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.bar-fill').forEach((b) => (b.style.width = b.dataset.value + '%'));
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );
  document.querySelectorAll('.skill-card').forEach((c) => obs.observe(c));
}

function timeAgo(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return state.lang === 'ru' ? 'сегодня' : 'today';
  if (days === 1) return state.lang === 'ru' ? 'вчера' : 'yesterday';
  if (days < 30) return state.lang === 'ru' ? `${days} дн. назад` : `${days}d ago`;
  const months = Math.floor(days / 30);
  return state.lang === 'ru' ? `${months} мес. назад` : `${months}mo ago`;
}

function renderFilters() {
  const el = document.getElementById('filters');
  el.innerHTML = CATEGORIES.map(
    (c) => `<button class="filter-btn${c.id === state.activeCategory ? ' active' : ''}" data-cat="${c.id}">${c.label[state.lang]}</button>`
  ).join('');
  el.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeCategory = btn.dataset.cat;
      renderFilters();
      renderProjects();
    });
  });
}

function renderProjects() {
  const el = document.getElementById('projects-grid');
  const list = state.liveProjects.filter((p) => state.activeCategory === 'all' || p.category === state.activeCategory);
  el.innerHTML = list
    .map((p) => {
      const stars = p.live && p.live.synced ? `★ ${p.live.stars}` : '';
      const homepageLabel = p.homepage_label ? p.homepage_label[state.lang] : state.lang === 'ru' ? 'Демо' : 'Demo';
      return `<article class="project-card panel">
        <div class="p-top">
          <h3>${p.name}</h3>
          ${stars ? `<span class="p-stars">${stars}</span>` : ''}
        </div>
        <div class="p-role">${p.role[state.lang]}</div>
        <p class="p-desc">${p.description[state.lang]}</p>
        ${p.note ? `<div class="p-note">${p.note[state.lang]}</div>` : ''}
        <div class="stack-tags">${p.stack.map((s) => `<span class="stack-tag">${s}</span>`).join('')}</div>
        <div class="p-links">
          <a href="${p.github}" target="_blank" rel="noopener">⌥ GitHub</a>
          ${p.homepage ? `<a href="${p.homepage}" target="_blank" rel="noopener">↗ ${homepageLabel}</a>` : ''}
        </div>
      </article>`;
    })
    .join('');
}

function refreshSyncBadge() {
  const synced = state.liveProjects.some((p) => p.live && p.live.synced);
  const text = document.getElementById('sync-text');
  if (synced) {
    text.textContent =
      state.lang === 'ru' ? `Синхронизировано с GitHub · ${state.liveProjects.length} проектов` : `Synced with GitHub · ${state.liveProjects.length} projects`;
  } else {
    text.textContent = state.lang === 'ru' ? 'Автономный режим (кэш) · GitHub недоступен' : 'Offline mode (cache) · GitHub unreachable';
  }
}

async function syncGithub() {
  try {
    const res = await fetch('/api/projects');
    if (!res.ok) throw new Error('bad response');
    const data = await res.json();
    state.liveProjects = data.projects;
  } catch (e) {
    // keep static fallback silently — the badge communicates offline mode
  }
  refreshSyncBadge();
  renderProjects();
}

function renderTimeline() {
  const el = document.getElementById('timeline');
  el.innerHTML = PROFILE.experience
    .map(
      (job) => `<div class="tl-entry">
        <div class="tl-card panel">
          <div class="tl-period">${job.period[state.lang]} · ${job.duration[state.lang]}</div>
          <div class="tl-title">${job.title[state.lang]}</div>
          <div class="tl-company">${job.company[state.lang]}</div>
          <p class="tl-summary">${job.summary[state.lang]}</p>
          ${job.highlight[state.lang] ? `<p class="tl-highlight">◆ ${job.highlight[state.lang]}</p>` : ''}
          ${job.tasks[state.lang] && job.tasks[state.lang].length ? `<ul class="tl-tasks">${job.tasks[state.lang].map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}
          <div class="stack-tags">${job.tags.map((t) => `<span class="stack-tag">${t}</span>`).join('')}</div>
        </div>
      </div>`
    )
    .join('');

  const edu = PROFILE.education;
  document.getElementById('edu-card').innerHTML = `
    <div class="edu-icon">🎓</div>
    <div>
      <div class="tl-title">${edu.school[state.lang]}</div>
      <div class="tl-company">${edu.degree[state.lang]} · ${edu.year}</div>
    </div>`;
}

function renderContact() {
  const c = PROFILE.contacts;
  const items = [
    { ic: '✉️', label: { ru: 'Email', en: 'Email' }, value: c.email, href: `mailto:${c.email}` },
    { ic: '💬', label: { ru: 'Telegram', en: 'Telegram' }, value: c.telegram_handle, href: c.telegram },
    { ic: '⌥', label: { ru: 'GitHub', en: 'GitHub' }, value: 'BlazeStudio', href: c.github },
    { ic: '💼', label: { ru: 'LinkedIn', en: 'LinkedIn' }, value: 'anton-vasiliev', href: c.linkedin },
    { ic: '📋', label: { ru: 'hh.ru', en: 'hh.ru' }, value: state.lang === 'ru' ? 'Резюме' : 'Résumé', href: c.hh },
    { ic: '📄', label: { ru: 'Досье', en: 'Dossier' }, value: state.lang === 'ru' ? 'PDF-версия' : 'PDF version', href: `/dossier?lang=${state.lang}` },
  ];
  document.getElementById('contact-grid').innerHTML = items
    .map(
      (i) => `<a class="contact-card panel" href="${i.href}" target="_blank" rel="noopener">
        <span class="c-ic">${i.ic}</span>
        <span><span class="c-label">${i.label[state.lang]}</span><span class="c-value">${i.value}</span></span>
      </a>`
    )
    .join('');
}

function renderAll() {
  renderDirectory();
  renderHR();
  renderSkills();
  renderFilters();
  renderProjects();
  refreshSyncBadge();
  renderTimeline();
  renderContact();
}

/* =========================================================
   Live clock + status
   ========================================================= */
function tickClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString(state.lang === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

async function pollStatus() {
  try {
    const res = await fetch(`/api/status?lang=${state.lang}`);
    if (!res.ok) return;
    const data = await res.json();
    document.querySelector('.brandmark').title = data.message;
  } catch (e) {
    /* silent */
  }
}

/* =========================================================
   Toast
   ========================================================= */
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), 2400);
}
window.showToast = showToast;

/* =========================================================
   Background canvas — drifting dust / stars
   ========================================================= */
function initBackground() {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const count = Math.min(70, Math.floor((canvas.width * canvas.height) / 22000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.6 + 0.4,
      vy: Math.random() * 0.15 + 0.03,
      a: Math.random() * 0.5 + 0.15,
    }));
  }

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#3bffa0';
    particles.forEach((p) => {
      p.y -= p.vy;
      if (p.y < -5) p.y = canvas.height + 5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.globalAlpha = p.a;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (!reduceMotion) requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize();
  frame();
}

/* =========================================================
   Confetti burst
   ========================================================= */
function confettiBurst() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors = ['#3bffa0', '#ffb454', '#7c9dff', '#ff6161'];
  const pieces = Array.from({ length: 140 }, () => ({
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
window.confettiBurst = confettiBurst;

/* =========================================================
   Konami code easter egg
   ========================================================= */
function initKonami() {
  const seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let pos = 0;
  document.addEventListener('keydown', (e) => {
    pos = e.key === seq[pos] ? pos + 1 : e.key === seq[0] ? 1 : 0;
    if (pos === seq.length) {
      pos = 0;
      confettiBurst();
      showToast(state.lang === 'ru' ? '🏆 Достижение: рекрутер старой школы' : '🏆 Achievement: old-school recruiter');
    }
  });
}

/* =========================================================
   Init
   ========================================================= */
window.viLang = () => state.lang;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();
  applyTheme();
  applyStaticI18n();
  buildElevator();
  observeFloors();
  renderAll();
  initBackground();
  initKonami();

  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  document.querySelectorAll('#lang-toggle button').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));

  tickClock();
  setInterval(tickClock, 1000);
  pollStatus();
  setInterval(pollStatus, 20000);

  runBoot();
  syncGithub();
});
