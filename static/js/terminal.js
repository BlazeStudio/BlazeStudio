'use strict';

(function () {
  const WELCOME = {
    ru: "Anton Vasiliev [Версия 10.0.19045]\n(c) Anton Vasiliev. Все права наверное защищены.\n\nВведите 'help' для списка команд.\n",
    en: "Anton Vasiliev [Version 10.0.19045]\n(c) Anton Vasiliev. All rights probably reserved.\n\nType 'help' for a list of commands.\n",
  };

  const PROMPT = 'anton@blaze-studio:~$';
  window.XP.termPrompt = PROMPT;

  function printLine(output, text, isCmd) {
    const row = document.createElement('div');
    if (isCmd) {
      row.className = 'cmd-line';
      row.textContent = `${PROMPT} ${text}`;
    } else {
      row.textContent = text;
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

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const cmd = input.value;
        input.value = '';
        if (cmd.trim()) runCommand(output, cmd);
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

    if (autofocus) setTimeout(() => input.focus(), 30);
  };
})();
