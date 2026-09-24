'use strict';

(function () {
  const WELCOME = {
    ru: "Anton Vasiliev [Версия 10.0.19045]\n(c) Anton Vasiliev. Все права наверное защищены.\n\nВведите 'help' для списка команд.\n",
    en: "Anton Vasiliev [Version 10.0.19045]\n(c) Anton Vasiliev. All rights probably reserved.\n\nType 'help' for a list of commands.\n",
  };

  const PROMPT = 'anton@blaze-studio:~$';
  window.XP.termPrompt = PROMPT;

  const URL_RE = /(https?:\/\/[^\s<>"']+|\b(?:github\.com|t\.me|linkedin\.com)\/[^\s<>"']+)/gi;

  function linkify(text) {
    // Escape HTML then turn URLs into anchors so contact/cv output is tappable.
    const esc = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return esc.replace(URL_RE, (raw) => {
      const href = raw.startsWith('http') ? raw : 'https://' + raw;
      return `<a href="${href}" target="_blank" rel="noopener">${raw}</a>`;
    });
  }

  function printLine(output, text, isCmd) {
    const row = document.createElement('div');
    if (isCmd) {
      row.className = 'cmd-line';
      row.textContent = `${PROMPT} ${text}`;
    } else {
      // Preserve newlines; linkify each line independently
      row.innerHTML = String(text)
        .split('\n')
        .map((line) => linkify(line))
        .join('<br>');
    }
    output.appendChild(row);
    output.scrollTop = output.scrollHeight;
  }

  const history = [];
  let historyPos = -1;

  // 'sudo su <password>' remembers the password in memory only (never
  // localStorage — it resets on reload, same spirit as a real shell session)
  // and resends it with every command afterward so the stateless backend can
  // verify 'tail' access fresh each time without needing a real session.
  let elevatedPassword = '';
  let followTimer = null;
  let followNextId = -1;

  function stopFollow() {
    if (followTimer) {
      clearInterval(followTimer);
      followTimer = null;
    }
  }

  function startFollow(output, nextId) {
    stopFollow();
    followNextId = nextId;
    followTimer = setInterval(async () => {
      try {
        const res = await fetch(`/api/terminal/log?password=${encodeURIComponent(elevatedPassword)}&since=${followNextId}`);
        if (!res.ok) {
          stopFollow();
          return;
        }
        const data = await res.json();
        (data.lines || []).forEach((line) => printLine(output, line));
        if (typeof data.next_id === 'number') followNextId = data.next_id;
      } catch (e) {
        stopFollow();
      }
    }, 2000);
  }

  async function runCommand(output, cmd) {
    const lang = window.XP.lang();
    stopFollow(); // a live tail stops the moment another command is submitted
    printLine(output, cmd, true);
    history.push(cmd);
    historyPos = history.length;

    const lower = cmd.trim().toLowerCase();
    if (lower === 'clear' || lower === 'cls') {
      output.innerHTML = '';
      return;
    }

    try {
      const res = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd, lang, elevated_password: elevatedPassword }),
      });
      const data = await res.json();
      if (data.output) printLine(output, data.output);

      if (data.effect) {
        const eff = data.effect;
        if (eff.type === 'open') window.XP.open(eff.target);
        else if (eff.type === 'confetti') window.XP.effects.confetti();
        else if (eff.type === 'matrix') window.XP.effects.matrix(6000);
        else if (eff.type === 'party') window.XP.effects.party(3000);
        else if (eff.type === 'bsod') window.XP.effects.bsod();
        else if (eff.type === 'shutdown') window.XP.effects.shutdown();
        else if (eff.type === 'elevate') {
          const m = cmd.trim().match(/^sudo\s+su\s+(.+)$/i);
          if (m) elevatedPassword = m[1].trim();
        } else if (eff.type === 'tail' && eff.follow) {
          startFollow(output, eff.next_id);
        }
      }
    } catch (e) {
      printLine(output, lang === 'ru' ? 'ошибка сети: сервер недоступен' : 'network error: server unreachable');
    }
  }

  window.XP.initConsole = function (root, autofocus) {
    const output = root.querySelector('#term-output');
    const input = root.querySelector('#term-input');
    printLine(output, WELCOME[window.XP.lang()]);

    let submitting = false;
    function submit() {
      if (submitting) return;
      const cmd = input.value;
      if (!cmd.trim()) return;
      submitting = true;
      input.value = '';
      Promise.resolve(runCommand(output, cmd)).finally(() => {
        submitting = false;
        // keep focus for the next command (esp. important on desktop)
        try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); }
      });
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      } else if (e.key === 'ArrowUp') {
        if (historyPos > 0) {
          historyPos -= 1;
          input.value = history[historyPos];
          e.preventDefault();
        }
      } else if (e.key === 'ArrowDown') {
        if (historyPos < history.length - 1) {
          historyPos += 1;
          input.value = history[historyPos];
        } else {
          historyPos = history.length;
          input.value = '';
        }
        e.preventDefault();
      }
    });
    // Some iOS keyboards only fire keyup for Enter on contenteditable-like fields
    input.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });

    if (autofocus) setTimeout(() => input.focus(), 30);
  };
})();