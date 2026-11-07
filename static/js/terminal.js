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

    const data = await window.XP.runTerminalCommand(cmd, lang);
    if (data.output) printLine(output, data.output);

    if (data.effect) {
      const eff = data.effect;
      if (eff.type === 'open') window.XP.open(eff.target);
      else if (eff.type === 'confetti') window.XP.effects.confetti();
      else if (eff.type === 'matrix') window.XP.effects.matrix(6000);
      else if (eff.type === 'party') window.XP.effects.party(3000);
      else if (eff.type === 'bsod') window.XP.effects.bsod();
      else if (eff.type === 'shutdown') window.XP.effects.shutdown();
      else if (eff.type === 'glitch') window.XP.effects.glitch(1800);
      else if (eff.type === 'rickroll') window.XP.effects.rickroll();
      else if (eff.type === 'horror' && window.XP.effects.horror) window.XP.effects.horror();
      else if (eff.type === 'url' && /^https?:\/\//i.test(eff.url)) {
        const w = window.open(eff.url, '_blank');
        if (w) w.opener = null;
      }
    }
  }

  window.XP.initConsole = function (root, autofocus) {
    const output = root.querySelector('#term-output');
    const input = root.querySelector('#term-input');
    printLine(output, WELCOME[window.XP.lang()]);

    // Lets other programs (help.exe) leave a line in the console, optionally styled.
    window.XP.termPrint = function (text, cls) {
      printLine(output, text);
      if (cls) output.lastChild.classList.add(cls);
    };

    // A desktop restart wipes the session: output and history.
    window.XP.resetConsole = function () {
      history.length = 0;
      historyPos = -1;
      output.innerHTML = '';
      input.value = '';
      printLine(output, WELCOME[window.XP.lang()]);
    };

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