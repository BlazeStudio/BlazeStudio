'use strict';

(function () {
  const PROFILE = window.XP.data.profile;

  function t(ru, en) {
    return window.XP.t(ru, en);
  }

  /* ---------- logo ---------- */
  function renderLogo() {
    const el = document.getElementById('e-logo');
    const name = PROFILE.name.en.replace(/\s+/g, '\u00A0\u00A0');
    el.innerHTML = Array.from(name)
      .map((ch, i) => `<span style="--r:${((i * 37) % 9) - 4}deg">${ch === '\u00A0' ? '&nbsp;' : ch}</span>`)
      .join('');
  }

  /* ---------- marquee ---------- */
  function renderMarquee() {
    const items = [
      t('★ обновлено: сегодня (всегда)', '★ updated: today (always)'),
      t('★ добавь в избранное', '★ bookmark this page'),
      t(`★ добро пожаловать на домашнюю страничку ${PROFILE.name.ru}!`, `★ welcome to ${PROFILE.name.en}'s home page!`),
      `★ ${t('ты посетитель №', "you're visitor #")} ${visitorNumber()}`,
      t('★ включи звук', '★ turn your sound on'),
    ];
    const text = items.join('\u00A0\u00A0\u00A0\u00A0');
    const track = document.getElementById('e-marquee-track');
    track.innerHTML = `<span>${text}</span><span aria-hidden="true">\u00A0\u00A0\u00A0\u00A0${text}</span>`;
  }

  /* ---------- decorative visitor counter (no backend — purely for flavor) ---------- */
  function visitorNumber() {
    const epoch = Date.UTC(2026, 0, 1);
    const days = Math.max(0, Math.floor((Date.now() - epoch) / 86400000));
    return String(13375 + days * 7).padStart(7, '0');
  }

  function renderStatusLine() {
    document.getElementById('e-guests').textContent = visitorNumber();
  }

  /* ---------- about.txt ---------- */
  function renderAbout() {
    const lang = window.XP.lang();
    const lines = PROFILE.about[lang] || [];
    document.getElementById('e-about-text').textContent = lines.join('\n\n');
  }

  /* ---------- cmd.exe boot log (real GitHub stats, no fake numbers) ---------- */
  const PROMPT = '<span class="e-term-prompt">C:\\ANTON&gt;</span>';

  async function renderTerminal() {
    const body = document.getElementById('e-term-body');
    const lang = window.XP.lang();
    let statLine;
    try {
      const res = await fetch('/api/github/stats');
      const stats = await res.json();
      statLine = stats.synced
        ? `{ public_repos: ${stats.public_repos}, followers: ${stats.followers} }`
        : t('{ офлайн-режим — GitHub недоступен }', '{ offline mode — GitHub unreachable }');
    } catch (e) {
      statLine = t('{ офлайн-режим }', '{ offline mode }');
    }
    body.innerHTML = [
      `${PROMPT} whoami`,
      `${PROFILE.name.en} — ${PROFILE.role[lang]}`,
      '',
      `${PROMPT} curl api.github.com/users/BlazeStudio`,
      statLine,
      '',
      `${PROMPT} <span class="e-cursor"></span>`,
    ].join('\n');
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

  /* ---------- guestbook (decorative — static entries, no real submissions) ---------- */
  function renderGuestbook() {
    const lang = window.XP.lang();
    const entries = [
      { name: 'sys_admin_98', date: '14.03.2005', ru: 'Красивый сайт! Как делал анимацию?', en: 'Nice site! How did you make the animation?' },
      { name: PROFILE.name.ru, date: '14.03.2005', ru: 'Спасибо! Всё руками, никакого фреймворка :)', en: 'Thanks! All by hand, no framework :)' },
      { name: 'anon', date: '02.09.2026', ru: 'ждал этот редизайн 20 лет', en: 'been waiting 20 years for this redesign' },
    ];
    document.getElementById('e-guestbook-entries').innerHTML = entries
      .map((e) => `<div class="e-guestbook-entry"><span class="e-gb-date">${e.date}</span><b>${e.name}:</b> ${lang === 'ru' ? e.ru : e.en}</div>`)
      .join('');
  }

  /* ---------- contacts ---------- */
  function renderContacts() {
    const lang = window.XP.lang();
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

  /* ---------- nostalgic joke buttons ---------- */
  function initJokeLinks() {
    document.getElementById('e-fav-btn').addEventListener('click', (e) => {
      e.preventDefault();
      window.XP.toast(t('Браузеры это больше не умеют — но Ctrl+D сработает!', "Browsers don't do this anymore — but Ctrl+D works!"));
    });
    document.getElementById('e-home-btn').addEventListener('click', (e) => {
      e.preventDefault();
      window.XP.toast(t('В 2026-м так уже не делают, но идея была хорошая', "Nobody does this in 2026, but it was a good idea"));
    });
  }

  function renderAll() {
    renderMarquee();
    renderStatusLine();
    renderAbout();
    renderGuestbook();
    renderContacts();
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderLogo();
    renderAll();
    renderTerminal();
    renderSteam();
    renderFaceit();
    initMusic();
    initJokeLinks();
    window.XP.onLangChange.push(renderAll);
  });
})();
