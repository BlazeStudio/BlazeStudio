'use strict';

(function () {
  const WELCOME = {
    ru: "Anton Vasiliev [Версия 10.0.19045]\n(c) Anton Vasiliev. Все права наверное защищены.\n\nВведите 'help' для списка команд.\n",
    en: "Anton Vasiliev [Version 10.0.19045]\n(c) Anton Vasiliev. All rights probably reserved.\n\nType 'help' for a list of commands.\n",
  };

  function printLine(output, text, isCmd) {
    const row = document.createElement('div');
    if (isCmd) {
      row.className = 'cmd-line';
      row.textContent = text;
    } else {
      row.textContent = text;
    }
    output.appendChild(row);
    output.scrollTop = output.scrollHeight;
  }

  const history = [];
  let historyPos = -1;

  async function runCommand(output, cmd) {
    const lang = window.XP.lang();
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
        body: JSON.stringify({ cmd, lang }),
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
      }
    } catch (e) {
      printLine(output, lang === 'ru' ? 'ошибка сети: сервер недоступен' : 'network error: server unreachable');
    }
  }

  window.XP.initConsole = function (root) {
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

    setTimeout(() => input.focus(), 30);
  };
})();
