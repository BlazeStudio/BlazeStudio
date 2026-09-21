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

  const PILL_ICONS = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `/static/img/isaac/pill-${i}.png`);
  function pillIcon(i) {
    return PILL_ICONS[i % PILL_ICONS.length];
  }

  /* ---------- hero ---------- */
  function renderHero() {
    document.getElementById('i-hero-role').textContent = PROFILE.role[lang()];
    document.getElementById('i-hero-tagline').textContent = PROFILE.tagline[lang()];
  }

  /* ---------- about / character card ---------- */
  function renderAbout() {
    const l = lang();
    document.getElementById('i-name').textContent = PROFILE.name[l];
    document.getElementById('i-role2').textContent = PROFILE.role[l];
    document.getElementById('i-location').textContent = PROFILE.location[l];
    document.getElementById('i-age').textContent = PROFILE.age;
    document.getElementById('i-employment').textContent = PROFILE.employment[l];
    document.getElementById('i-format').textContent = PROFILE.format[l];

    document.getElementById('i-traits').innerHTML = (PROFILE.traits || [])
      .map((tr, i) => `<span class="i-trait"><img src="${pillIcon(i)}" alt="">${tr[l]}</span>`)
      .join('');

    document.getElementById('i-about-text').innerHTML = (PROFILE.about[l] || [])
      .map((p) => `<p>${p}</p>`)
      .join('');
  }

  /* ---------- experience / boss fights ---------- */
  function renderExperience() {
    const l = lang();
    const html = (PROFILE.experience || [])
      .map((job) => {
        const tasks = (job.tasks && job.tasks[l]) || [];
        const tasksHtml = tasks
          .map(
            (group) => `
              <div class="i-boss-taskgroup">
                <div class="i-boss-taskcat">${group.category}</div>
                <ul>${group.items.map((it) => `<li>${it}</li>`).join('')}</ul>
              </div>`
          )
          .join('');
        const tagsHtml = (job.tags || []).map((tag, i) => `<span class="i-tag"><img src="${pillIcon(i)}" alt="">${tag}</span>`).join('');
        return `
          <article class="i-boss-card">
            <div class="i-boss-head">
              <div>
                <div class="i-boss-name">${job.company[l]}</div>
                <div class="i-boss-title">${job.title[l]}</div>
              </div>
              <div class="i-boss-period">
                <div>${job.period[l]}</div>
                <div class="i-boss-duration">${job.duration[l]}</div>
              </div>
            </div>
            ${job.summary && job.summary[l] ? `<p class="i-boss-summary">${job.summary[l]}</p>` : ''}
            ${job.highlight && job.highlight[l] ? `<p class="i-boss-highlight">💥 ${job.highlight[l]}</p>` : ''}
            <div class="i-boss-tasks">${tasksHtml}</div>
            <div class="i-boss-tags">${tagsHtml}</div>
          </article>`;
      })
      .join('');
    document.getElementById('i-experience-list').innerHTML = html;
  }

  /* ---------- skills / devil deal ---------- */
  function renderSkills() {
    const l = lang();
    const skills = PROFILE.skills || {};
    let iconCounter = 0;
    const html = Object.keys(skills)
      .map((key) => {
        const group = skills[key];
        const itemsHtml = (group.items || [])
          .map((item) => {
            const icon = pillIcon(iconCounter++);
            return `
              <div class="i-skill-item">
                <img class="i-skill-ic" src="${icon}" alt="">
                <span class="i-skill-name">${item.name}</span>
                <span class="i-skill-bar"><span class="i-skill-bar-fill" style="width:${item.level}%"></span></span>
              </div>`;
          })
          .join('');
        return `
          <div class="i-skill-group">
            <h3>${group.label[l]}</h3>
            <div class="i-skill-items">${itemsHtml}</div>
          </div>`;
      })
      .join('');
    document.getElementById('i-skills-groups').innerHTML = html;
  }

  /* ---------- projects / treasure room ---------- */
  const ITEM_ICONS = ['/static/img/isaac/rune-gold.png', '/static/img/isaac/rune-red.png'].concat(PILL_ICONS);
  function renderProjects() {
    const l = lang();
    const html = (PROJECTS || [])
      .map((p, i) => {
        const special = p.id === 'tboi-mod';
        const icon = ITEM_ICONS[i % ITEM_ICONS.length];
        const homepageLink = p.homepage
          ? `<a href="${p.homepage}" target="_blank" rel="noopener">${(p.homepage_label && p.homepage_label[l]) || t('сайт', 'homepage')}</a>`
          : '';
        return `
          <article class="i-item-card${special ? ' i-item-special' : ''}">
            ${special ? `<div class="i-item-badge">★ ${t('этот самый мод', 'this very mod')}</div>` : ''}
            <div class="i-item-pedestal"><img src="${icon}" alt=""></div>
            <h3>${p.name}</h3>
            <p class="i-item-role">${p.role[l]}</p>
            <p class="i-item-desc">${p.description[l]}</p>
            ${p.note ? `<p class="i-item-note">${p.note[l]}</p>` : ''}
            <div class="i-item-stack">${(p.stack || []).map((s) => `<span>${s}</span>`).join('')}</div>
            <div class="i-item-links">
              <a href="${p.github}" target="_blank" rel="noopener">GitHub</a>
              ${homepageLink}
            </div>
          </article>`;
      })
      .join('');
    document.getElementById('i-projects-grid').innerHTML = html;
  }

  /* ---------- achievements ---------- */
  function renderAchievements() {
    const l = lang();
    const rows = [];
    (PROFILE.certifications || []).forEach((c) => {
      rows.push({ icon: 'rune-gold', title: t('Сертификат', 'Certification'), sub: c[l] });
    });
    (PROFILE.languages || []).forEach((lg) => {
      rows.push({ icon: 'soulheart', title: lg.name[l], sub: `${lg.level[l]} · ${lg.value}%` });
    });
    if (PROFILE.education) {
      rows.push({ icon: 'rune-red', title: PROFILE.education.school[l], sub: `${PROFILE.education.degree[l]} · ${PROFILE.education.year}` });
    }
    document.getElementById('i-achievements-list').innerHTML = rows
      .map(
        (r) => `
        <div class="i-ach-row">
          <img src="/static/img/isaac/${r.icon}.png" alt="">
          <div>
            <div class="i-ach-title">${r.title}</div>
            <div class="i-ach-sub">${r.sub}</div>
          </div>
        </div>`
      )
      .join('');

    const epoch = Date.UTC(2024, 5, 1); // job start, June 2024 — "permanent effect" joke from the entry page
    const days = Math.max(0, Math.floor((Date.now() - epoch) / 86400000));
    document.getElementById('i-winstreak-num').textContent = days.toLocaleString(l === 'ru' ? 'ru-RU' : 'en-US');
  }

  /* ---------- contact / holy room ---------- */
  function renderContact() {
    const c = PROFILE.contacts;
    const items = [
      { ic: 'soulheart', label: 'Email', href: `mailto:${c.email}` },
      { ic: 'rune-gold', label: 'Telegram', href: c.telegram },
      { ic: 'rune-red', label: 'GitHub', href: c.github },
      { ic: 'soulheart', label: 'LinkedIn', href: c.linkedin },
      { ic: 'rune-gold', label: 'hh.ru', href: c.hh },
    ];
    document.getElementById('i-contact-list').innerHTML = items
      .map((i) => `<a class="i-offering" href="${i.href}" target="_blank" rel="noopener"><img src="/static/img/isaac/${i.ic}.png" alt="">${i.label}</a>`)
      .join('');
  }

  /* ---------- easter egg: click the poop ---------- */
  function initPoop() {
    const btn = document.getElementById('i-poop');
    const lines = [
      () => t('Ничего не нашёл. Ну, почти.', 'Found nothing. Well, almost.'),
      () => t('+1 предмет. Он бесполезный, но твой.', '+1 item. It is useless, but it is yours.'),
      () => t('Это была просто какашка. Как и ожидалось.', 'It was just poop. As expected.'),
      () => t('Секретная комната не найдена — попробуй ещё раз.', 'No secret room found — try again.'),
    ];
    btn.addEventListener('click', () => {
      window.XP.toast(lines[Math.floor(Math.random() * lines.length)]());
      btn.classList.remove('i-poop-bounce');
      void btn.offsetWidth;
      btn.classList.add('i-poop-bounce');
    });
  }

  function renderAll() {
    renderHero();
    renderAbout();
    renderExperience();
    renderSkills();
    renderProjects();
    renderAchievements();
    renderContact();
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderAll();
    initPoop();
    window.XP.onLangChange.push(renderAll);
  });
})();
