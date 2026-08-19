'use strict';

(function () {
  const output = document.getElementById('term-output');
  const input = document.getElementById('term-input');
  if (!output || !input) return;

  const WELCOME = {
    ru: "Добро пожаловать в терминал VASILIEV INC.\nВведите 'help' для списка команд.\n",
    en: "Welcome to the VASILIEV INC. terminal.\nType 'help' for a list of commands.\n",
  };

  let welcomed = { ru: false, en: false };
  const history = [];
  let historyPos = -1;

  function printLine(text, isCmd) {
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

  function ensureWelcome() {
    const lang = window.viLang ? window.viLang() : 'ru';
    if (!welcomed[lang] && output.childElementCount === 0) {
      printLine(WELCOME[lang]);
      welcomed[lang] = true;
    }
  }

  async function runCommand(cmd) {
    const lang = window.viLang ? window.viLang() : 'ru';
    printLine(cmd, true);
    history.push(cmd);
    historyPos = history.length;

    try {
      const res = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd, lang }),
      });
      const data = await res.json();
      if (data.output) printLine(data.output);

      if (data.effect) {
        if (data.effect.type === 'clear') {
          output.innerHTML = '';
        } else if (data.effect.type === 'confetti') {
          window.confettiBurst && window.confettiBurst();
        } else if (data.effect.type === 'navigate') {
          const target = document.getElementById(data.effect.target);
          if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth' }), 350);
        } else if (data.effect.type === 'matrix') {
          document.body.classList.add('matrix-flash');
          setTimeout(() => document.body.classList.remove('matrix-flash'), 900);
        } else if (data.effect.type === 'close') {
          printLine(lang === 'ru' ? '(нельзя закрыть вкладку рекрутера, простите)' : '(cannot actually close a recruiter tab, sorry)');
        }
      }
    } catch (e) {
      printLine(lang === 'ru' ? 'ошибка сети: сервер недоступен' : 'network error: server unreachable');
    }
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const cmd = input.value;
      input.value = '';
      if (cmd.trim()) runCommand(cmd);
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

  document.querySelectorAll('.arcade-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tab.dataset.game === 'terminal') {
        ensureWelcome();
        setTimeout(() => input.focus(), 50);
      }
    });
  });

  document.addEventListener('DOMContentLoaded', ensureWelcome);
})();
