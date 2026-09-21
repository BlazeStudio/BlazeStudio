'use strict';

(function () {
  const PROFILE = window.XP.data.profile;

  function t(ru, en) {
    return window.XP.t(ru, en);
  }

  /* ---------- decorative visitor counter (no backend — purely for flavor) ---------- */
  function visitorNumber() {
    const epoch = Date.UTC(2026, 0, 1);
    const days = Math.max(0, Math.floor((Date.now() - epoch) / 86400000));
    return String(13375 + days * 7).padStart(7, '0');
  }

  /* ---------- title / role ---------- */
  function renderTitle() {
    const lang = window.XP.lang();
    document.getElementById('e-title').textContent = PROFILE.name[lang].toUpperCase();
    document.getElementById('e-role').textContent = PROFILE.role[lang];
  }

  /* ---------- HUD: hearts / keys / coins (original SVG icons, no ripped sprites) ---------- */
  function heartSvg() {
    return '<svg viewBox="0 0 24 24" class="e-heart" fill="#c23a3a" stroke="#c23a3a" stroke-width="1.5"><path d="M12 21s-7.5-4.6-10-9.1C.4 8.4 2 4.8 5.6 4.2c2-.3 3.9.6 5 2.2 1.1-1.6 3-2.5 5-2.2 3.6.6 5.2 4.2 3.6 7.7C19.5 16.4 12 21 12 21z"/></svg>';
  }
  function keySvg() {
    return '<svg viewBox="0 0 24 24" class="e-key" fill="none" stroke="#e0b84b" stroke-width="1.5"><circle cx="7" cy="12" r="4"/><line x1="11" y1="12" x2="21" y2="12"/><line x1="17" y1="12" x2="17" y2="16"/><line x1="21" y1="12" x2="21" y2="16"/></svg>';
  }
  function renderHud() {
    document.getElementById('e-hud-hearts').innerHTML = Array.from({ length: 4 }, heartSvg).join('');
    const keyCount = (PROFILE.languages || []).length || 1;
    document.getElementById('e-hud-keys').innerHTML = Array.from({ length: keyCount }, keySvg).join('');
    document.getElementById('e-guests').textContent = visitorNumber();
  }

  /* ---------- flavor text + D6 reroll (all original lines, written for this page) ---------- */
  const FLAVOR_LINES = [
    () => PROFILE.tagline[window.XP.lang()],
    () => t('+1 к пониманию бизнес-логики. Заказчики теперь боятся сложных требований.', '+1 grasp of business logic. Clients now fear complex requirements.'),
    () => t('Прод не падает по пятницам. Постоянный эффект.', "Prod doesn't go down on Fridays. Permanent effect."),
    () => t('Каждый баг — заряженный предмет: страшно, но потом гордишься.', 'Every bug is a charged item: scary, but you brag about it later.'),
    () => t('+3 к Docker. Инфраструктура больше не плачет.', '+3 Docker. The infrastructure stopped crying.'),
    () => t('Пишет тесты добровольно. Редкий предмет, шанс выпадения: низкий.', 'Writes tests voluntarily. Rare item, low drop chance.'),
  ];
  let flavorIndex = 0;
  function renderFlavor() {
    document.getElementById('e-flavor-text').textContent = FLAVOR_LINES[flavorIndex]();
  }
  function initD6() {
    const el = document.getElementById('e-d6-btn');
    el.addEventListener('click', () => {
      flavorIndex = (flavorIndex + 1) % FLAVOR_LINES.length;
      renderFlavor();
      el.classList.remove('spin');
      void el.offsetWidth;
      el.classList.add('spin');
    });
  }

  /* ---------- journal (real about text) ---------- */
  function renderJournal() {
    const lang = window.XP.lang();
    const lines = PROFILE.about[lang] || [];
    document.getElementById('e-about-text').textContent = lines.join('\n\n');
  }

  /* ---------- GitHub artifact card (real stats, no fake numbers) ---------- */
  async function renderGithubCard() {
    const body = document.getElementById('e-term-body');
    try {
      const res = await fetch('/api/github/stats');
      const stats = await res.json();
      if (!stats.synced) {
        body.innerHTML = `<p class="e-sync-text">${t('Руны стёрлись — GitHub недоступен', 'Runes faded — GitHub unreachable')}</p>`;
        return;
      }
      body.innerHTML = `
        <div class="e-widget-head"><div class="e-widget-name">BlazeStudio</div></div>
        <p class="e-widget-sub">+${stats.public_repos} ${t('репозиториев (перманентный эффект)', 'repos (permanent effect)')}</p>
        <p class="e-widget-sub">+${stats.followers} ${t('подписчиков', 'followers')}</p>
      `;
    } catch (e) {
      body.innerHTML = `<p class="e-sync-text">${t('Руны стёрлись', 'Runes faded')}</p>`;
    }
  }

  /* ---------- Steam ---------- */
  function notConnectedHtml(envVars, docsUrl) {
    return `<p class="e-not-connected">${t('Ещё не подключено.', 'Not connected yet.')}<br>${t('Задайте', 'Set')} ${envVars.map((v) => `<code>${v}</code>`).join(', ')} ${t('в переменных окружения', 'as environment variables')}${docsUrl ? ` (<a href="${docsUrl}" target="_blank" rel="noopener">${t('получить ключ', 'get a key')}</a>)` : ''}.</p>`;
  }

  async function renderSteam() {
    const body = document.getElementById('e-steam-body');
    try {
      const res = await fetch('/api/steam');
      const data = await res.json();
      if (!data.profile.synced) {
        body.innerHTML = notConnectedHtml(['STEAM_API_KEY', 'STEAM_ID64'], 'https://steamcommunity.com/dev/apikey');
        return;
      }
      const p = data.profile;
      const games = (data.recent_games.games || []).slice(0, 5);
      const shots = (data.screenshots.screenshots || []).slice(0, 6);
      body.innerHTML = `
        <div class="e-widget-head">
          <img class="e-widget-avatar" src="${p.avatar}" alt="">
          <div>
            <div class="e-widget-name">${p.persona_name}</div>
            <div class="e-widget-sub">${t('статус', 'status')}: ${p.status}</div>
          </div>
        </div>
        ${games.length ? `<ul class="e-game-list">${games
          .map(
            (g) =>
              `<li class="e-game-row">${g.icon ? `<img src="${g.icon}" alt="">` : ''}<span>${g.name}</span><span class="e-game-time">${Math.round(g.playtime_2weeks_min / 60)}${t('ч за 2 нед', 'h / 2wk')}</span></li>`
          )
          .join('')}</ul>` : `<p class="e-widget-sub">${t('недавних игр нет', 'no recent games')}</p>`}
        ${shots.length ? `<div class="e-shots-grid">${shots.map((s) => `<a href="${s.full}" target="_blank" rel="noopener"><img src="${s.thumb}" alt="${s.title}" loading="lazy"></a>`).join('')}</div>` : ''}
      `;
    } catch (e) {
      body.innerHTML = notConnectedHtml(['STEAM_API_KEY', 'STEAM_ID64'], 'https://steamcommunity.com/dev/apikey');
    }
  }

  /* ---------- FACEIT ---------- */
  async function renderFaceit() {
    const body = document.getElementById('e-faceit-body');
    try {
      const res = await fetch('/api/faceit');
      const data = await res.json();
      if (!data.player.synced) {
        body.innerHTML = notConnectedHtml(['FACEIT_API_KEY', 'FACEIT_NICKNAME'], 'https://developers.faceit.com/apps');
        return;
      }
      const p = data.player;
      const matches = (data.recent_matches.matches || []).slice(0, 5);
      body.innerHTML = `
        <div class="e-widget-head">
          <img class="e-widget-avatar" src="${p.avatar}" alt="">
          <div>
            <div class="e-widget-name">${p.nickname}</div>
            <div class="e-widget-sub">Elo ${p.elo ?? '—'} · ${t('уровень', 'level')} ${p.level ?? '—'}</div>
          </div>
        </div>
        ${matches.length ? `<ul class="e-match-list">${matches
          .map(
            (m) =>
              `<li class="e-match-row ${m.result || ''}"><a href="${m.faceit_url}" target="_blank" rel="noopener">${t('матч', 'match')} ${new Date(m.finished_at * 1000).toLocaleDateString()}</a><span>${m.result ? t(m.result === 'win' ? 'победа' : 'поражение', m.result) : '—'}</span></li>`
          )
          .join('')}</ul>` : `<p class="e-widget-sub">${t('недавних матчей нет', 'no recent matches')}</p>`}
      `;
    } catch (e) {
      body.innerHTML = notConnectedHtml(['FACEIT_API_KEY', 'FACEIT_NICKNAME'], 'https://developers.faceit.com/apps');
    }
  }

  /* ---------- old diary entries (decorative — static, no real submissions) ---------- */
  function renderGuestbook() {
    const lang = window.XP.lang();
    const entries = [
      { name: t('мама', 'mom'), date: '???', ru: 'Тебе нужно больше молиться и меньше сидеть в подвале.', en: 'You should pray more and spend less time in the basement.' },
      { name: PROFILE.name.ru, date: '2024', ru: 'Нашёл способ выйти — научился программировать.', en: 'Found a way out — learned to program.' },
      { name: 'anon', date: '2026', ru: 'зашёл в подвал, увидел код, испугался, зауважал', en: 'walked into the basement, saw the code, got scared, gained respect' },
    ];
    document.getElementById('e-guestbook-entries').innerHTML = entries
      .map((e) => `<div class="e-guestbook-entry"><span class="e-gb-date">${e.date}</span><b>${e.name}:</b> ${lang === 'ru' ? e.ru : e.en}</div>`)
      .join('');
  }

  /* ---------- contacts ---------- */
  function renderContacts() {
    const c = PROFILE.contacts;
    const items = [
      { ic: '✉️', label: 'Email', href: `mailto:${c.email}` },
      { ic: '💬', label: 'Telegram', href: c.telegram },
      { ic: '📂', label: 'GitHub', href: c.github },
      { ic: '💼', label: 'LinkedIn', href: c.linkedin },
      { ic: '📋', label: 'hh.ru', href: c.hh },
    ];
    document.getElementById('e-contacts-row').innerHTML = items
      .map((i) => `<a href="${i.href}" target="_blank" rel="noopener">${i.ic} ${i.label}</a>`)
      .join('');
  }

  /* ---------- music toggle ---------- */
  function initMusic() {
    const btn = document.getElementById('e-music-btn');
    const audio = document.getElementById('e-audio');
    const noFile = () => {
      btn.classList.remove('playing');
      window.XP.toast(t('Нет аудиофайла — положите его в static/audio/theme.mp3', 'No audio file — drop one at static/audio/theme.mp3'));
    };
    audio.addEventListener('error', noFile);
    btn.addEventListener('click', () => {
      if (audio.error || audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        noFile();
        return;
      }
      if (audio.paused) {
        audio.play().then(() => {
          btn.classList.add('playing');
          setTimeout(() => {
            if (audio.currentTime === 0 && !audio.paused) noFile();
          }, 1200);
        }, noFile);
      } else {
        audio.pause();
        btn.classList.remove('playing');
      }
    });
  }

  function renderAll() {
    renderTitle();
    renderHud();
    renderFlavor();
    renderJournal();
    renderGuestbook();
    renderContacts();
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderAll();
    renderGithubCard();
    renderSteam();
    renderFaceit();
    initD6();
    initMusic();
    window.XP.onLangChange.push(renderAll);
  });
})();
