'use strict';

/* The Command Prompt's command set. Pattern matching only: nothing here touches
   a real filesystem or shell. Effects are instructions terminal.js interprets
   (open a window, run a screen effect); this file never renders anything itself. */
(function () {
  const SHITPOST_URL = 'https://dist-alpha-sable-48.vercel.app/';

  // Book name → [Russian, English].
  const VERSES = {
    genesis: ['В начале сотворил Бог небо и землю.', 'In the beginning God created the heaven and the earth.'],
    exodus: ['Бог сказал Моисею: Я есмь Сущий.', 'And God said unto Moses, I AM THAT I AM.'],
    psalm: ['Господь — Пастырь мой; я ни в чём не буду нуждаться.', 'The LORD is my shepherd; I shall not want.'],
    proverbs: ['Начало мудрости — страх Господень.', 'The fear of the LORD is the beginning of knowledge.'],
    ecclesiastes: ['Суета сует, сказал Екклесиаст, суета сует, — всё суета!', 'Vanity of vanities, saith the Preacher, vanity of vanities; all is vanity.'],
    isaiah: ['А надеющиеся на Господа обновятся в силе.', 'But they that wait upon the LORD shall renew their strength.'],
    matthew: ['Просите, и дано будет вам; ищите, и найдёте.', 'Ask, and it shall be given you; seek, and ye shall find.'],
    john: ['В начале было Слово, и Слово было у Бога, и Слово было Бог.', 'In the beginning was the Word, and the Word was with God, and the Word was God.'],
    romans: ['Любящим Бога, призванным по Его изволению, всё содействует ко благу.', 'And we know that all things work together for good to them that love God.'],
    corinthians: ['Любовь долготерпит, милосердствует.', 'Charity suffereth long, and is kind.'],
    revelation: ['Се, стою у двери и стучу.', 'Behold, I stand at the door, and knock.'],
  };

  const BOOK_ALIASES = {
    gen: 'genesis',
    exo: 'exodus',
    ps: 'psalm',
    psalms: 'psalm',
    prov: 'proverbs',
    ecc: 'ecclesiastes',
    isa: 'isaiah',
    matt: 'matthew',
    mt: 'matthew',
    jn: 'john',
    rom: 'romans',
    '1cor': 'corinthians',
    '1 corinthians': 'corinthians',
    rev: 'revelation',
  };

  const BIBLE_FRAMES = [
    ['', '            ✝', '           /|\\', '          / | \\', '         /  |  \\', '            |', '         ___|___', ''].join('\n'),
    ['', '      .--.', '     /    \\', '    |  📖  |', '     \\    /', "      '--'", ''].join('\n'),
    ['', '         *', '        /|\\', '       / | \\', '      *  |  *', '         |', '      ---*---', ''].join('\n'),
  ];

  const BIBLE_WHISPERS = {
    ru: ['Слышишь ли ты шёпот веков?', 'Слово было в начале…', 'И свет во тьме светит…', 'Ищите — и найдёте.', 'Се, стою у двери…'],
    en: ['Do you hear the whisper of ages?', 'In the beginning was the Word…', 'And the light shineth in darkness…', 'Seek, and ye shall find.', 'Behold, I stand at the door…'],
  };

  const BROWSERS = [
    [/YaBrowser\/(\d+)/, ['Яндекс Браузер', 'Yandex Browser']],
    [/Edg(?:e|A|iOS)?\/(\d+)/, ['Edge', 'Edge']],
    [/OPR\/(\d+)/, ['Opera', 'Opera']],
    [/(?:Firefox|FxiOS)\/(\d+)/, ['Firefox', 'Firefox']],
    [/(?:CriOS|Chrome)\/(\d+)/, ['Chrome', 'Chrome']],
    [/Version\/(\d+)[\d.]* .*Safari/, ['Safari', 'Safari']],
  ];

  const SYSTEMS = [
    [/Windows NT 10/, 'Windows 10/11'],
    [/Windows NT 6\.3/, 'Windows 8.1'],
    [/Windows NT 6\.1/, 'Windows 7'],
    [/Windows/, 'Windows'],
    [/iPhone|iPad|iPod/, 'iOS'],
    [/Android/, 'Android'],
    [/Mac OS X|Macintosh/, 'macOS'],
    [/CrOS/, 'ChromeOS'],
    [/Linux/, 'Linux'],
  ];

  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const profile = () => window.XP.data.profile;

  function cvTxt(lang) {
    const p = profile();
    return [`${p.name[lang]} — ${p.role[lang]}`, ...p.about[lang].map((line) => `  ${line}`)].join('\n');
  }

  function projectsTxt(lang) {
    const projects = window.XP.data.projects;
    return [
      lang === 'en' ? `${projects.length} public repos worth showing:` : `${projects.length} репозиториев, которые не стыдно показать:`,
      ...projects.map((p) => `  - ${p.name} (${p.stack.slice(0, 2).join(', ')})`),
    ].join('\n');
  }

  function contactTxt() {
    const c = profile().contacts;
    return [`email     ${c.email}`, `telegram  ${c.telegram_handle}`, `github    ${c.github}`, `linkedin  ${c.linkedin}`].join('\n');
  }

  function neofetch(lang) {
    const p = profile();
    return [
      '       _______',
      '      /       \\',
      `     |  ●   ●  |     ${p.name[lang]}`,
      '     |    ▽    |     -----------',
      '      \\_______/      OS: Portfolio OS 1.0',
      '                     Host: recruiter-desktop',
      '                     Kernel: GitHub Pages + vanilla JS',
      '                     Uptime: too long polishing this terminal',
      '                     Shell: custom-cmd',
      '                     Resolution: 1920x1080 (probably)',
      '                     Theme: dark + green accents',
      '                     CPU: 1x Anton',
      '                     Memory: enough for one more coffee',
      `                     Role: ${p.role[lang]}`,
    ].join('\n');
  }

  function bibleFrame(verse, book, lang) {
    const header = lang === 'ru' ? '✠  Священное Писание  ✠' : '✠  Holy Scripture  ✠';
    return `${pick(BIBLE_FRAMES)}\n${header}\n\n  « ${verse} »\n\n— ${capitalize(book)} —\n\n  ${pick(BIBLE_WHISPERS[lang])}\n`;
  }

  function bible(arg, lang) {
    const ru = lang === 'ru';
    const query = arg.toLowerCase();
    if (!query) {
      return ru
        ? 'Использование:\n  bible              — случайный стих\n  bible <книга>      — стих из книги\n  bible list         — список книг\n\nПримеры: bible genesis, bible john, bible psalm'
        : 'Usage:\n  bible              — random verse\n  bible <book>       — verse from a book\n  bible list         — list of books\n\nExamples: bible genesis, bible john, bible psalm';
    }
    if (query === 'list' || query === 'список') {
      return `${ru ? 'Доступные книги:' : 'Available books:'}\n  ${Object.keys(VERSES).sort().join('  ')}`;
    }
    const book = BOOK_ALIASES[query] || query;
    const verses = Object.prototype.hasOwnProperty.call(VERSES, book) ? VERSES[book] : null;
    if (!verses) {
      return ru ? `Книга «${arg}» не найдена.\nНаберите 'bible list' для списка.` : `Book '${arg}' not found.\nType 'bible list' for available books.`;
    }
    return bibleFrame(verses[ru ? 0 : 1], book, lang);
  }

  function browserAndOs(ua, lang) {
    const ru = lang === 'ru';
    let browser = null;
    for (const [rx, names] of BROWSERS) {
      const m = ua.match(rx);
      if (m) {
        browser = `${names[ru ? 0 : 1]} ${m[1]}`;
        break;
      }
    }
    const system = SYSTEMS.find(([rx]) => rx.test(ua));
    return [browser, system && system[1]].filter(Boolean).join(' · ') || (ru ? 'неизвестно' : 'unknown');
  }

  // A static page can't see its visitor's address, so this one command asks
  // ipinfo.io for it. Only `whoami` calls it, and it degrades to "unknown".
  async function ipAndPlace() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch('https://ipinfo.io/json', { signal: controller.signal });
      return res.ok ? await res.json() : {};
    } catch (_) {
      return {};
    } finally {
      clearTimeout(timer);
    }
  }

  function screenInfo() {
    let tz = '';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch (_) {
      tz = '';
    }
    const langs = (navigator.languages || [navigator.language]).slice(0, 3).join(', ');
    return [`${window.screen.width}×${window.screen.height}`, tz, langs].filter(Boolean).join(' · ');
  }

  // The visitor, not the site owner. Shown back to that same visitor only.
  async function whoami(lang) {
    const ru = lang === 'ru';
    const unknown = ru ? 'неизвестно' : 'unknown';
    const geo = await ipAndPlace();
    const place = [geo.city, geo.region, geo.country].filter(Boolean).join(', ');
    const rows = [
      ['IP', geo.ip || unknown],
      [ru ? 'Откуда' : 'Where', place || unknown],
      [ru ? 'Браузер' : 'Browser', browserAndOs(navigator.userAgent || '', lang)],
      [ru ? 'Экран' : 'Screen', screenInfo() || unknown],
    ];
    return [
      ru ? 'guest@blaze-studio — это Вы:' : "guest@blaze-studio — that's you:",
      ...rows.map(([k, v]) => `  ${k.padEnd(9)} ${v}`),
      ru ? 'Сайт ничего из этого не сохраняет.' : 'This site stores none of this.',
    ].join('\n');
  }

  function cowsay(arg, lang) {
    const text = arg || (lang === 'ru' ? 'Мооо!' : 'Moo!');
    const line = '_'.repeat(text.length + 2);
    return [
      ` ${line}`,
      `< ${text} >`,
      ` ${line}`,
      '        \\   ^__^',
      '         \\  (oo)\\_______',
      '            (__)\\       )\\/\\',
      '                ||----w |',
      '                ||     ||',
    ].join('\n');
  }

  function bsodText(lang) {
    const tech = [
      'Техническая информация:',
      '*** STOP: 0x00000050 (0xFD3094C2, 0x00000001, 0xFBFE7617, 0x00000000)',
      '*** RECRUITER.SYS - Address FBFE7617 base at FBFE5000, DateStamp 3d6dd67c',
    ];
    if (lang === 'en') {
      tech[0] = 'Technical information:';
      return [
        'A problem has been detected and Windows has been shut down to prevent damage\nto your computer.',
        'The problem seems to be caused by the following file: RECRUITER.SYS',
        'PAGE_FAULT_IN_NONPAGED_AREA',
        "If this is the first time you've seen this stop error screen,\nrestart your computer. If this screen appears again, follow\nthese steps:",
        'Check to make sure any new hardware or software is properly installed.\nIf this is a new installation, ask your hardware or software manufacturer\nfor any Windows updates you might need.',
        ...tech,
      ].join('\n\n');
    }
    return [
      'Обнаружена проблема, и Windows была завершена, чтобы предотвратить повреждение\nкомпьютера.',
      'Проблема, судя по всему, вызвана следующим файлом: RECRUITER.SYS',
      'PAGE_FAULT_IN_NONPAGED_AREA',
      'Если вы видите этот экран ошибки впервые,\nперезагрузите компьютер. Если экран появится снова, выполните\nследующие действия:',
      'Убедитесь, что новое оборудование или программное обеспечение установлено правильно.\nЕсли это новая установка, обратитесь к производителю оборудования или ПО\nза обновлениями Windows.',
      ...tech,
    ].join('\n\n');
  }

  function help(lang) {
    const rows =
      lang === 'en'
        ? [
            ['help', 'this list'],
            ['help.exe', 'someone needs help'],
            ['shitpost.exe', '???'],
            ['whoami', 'who you are'],
            ['cv', 'opens the résumé window'],
            ['projects', 'opens the projects window'],
            ['contact', 'opens the contact window'],
            ['matrix', 'green rain, obviously'],
            ['bsod', 'classic blue screen of death'],
            ['shutdown', 'does what it says'],
            ['bible [book]', 'verse from a book'],
            ['bible list', 'available books'],
            ['coffee', 'essential dependency'],
            ['neofetch', 'system info'],
            ['taskmgr', 'task manager window'],
            ['explorer', 'file explorer'],
            ['games', 'games folder'],
            ['calc', 'calculator'],
            ['notepad', 'simple notepad'],
            ['glitch', 'glitch'],
            ['rickroll', 'you know the rules'],
            ['cowsay [text]', 'talking cow'],
            ['clear', 'clear the terminal'],
          ]
        : [
            ['help', 'этот список'],
            ['help.exe', 'кому-то нужна помощь'],
            ['shitpost.exe', '???'],
            ['whoami', 'кто вы'],
            ['cv', 'открывает окно резюме'],
            ['projects', 'открывает окно проектов'],
            ['contact', 'открывает окно контактов'],
            ['matrix', 'зелёный дождь, а как же без него'],
            ['bsod', 'классический синий экран смерти'],
            ['shutdown', 'делает ровно то, что написано'],
            ['bible [книга]', 'стих из книги'],
            ['bible list', 'список книг'],
            ['coffee', 'критическая зависимость'],
            ['neofetch', 'информация о системе'],
            ['taskmgr', 'диспетчер задач'],
            ['explorer', 'проводник'],
            ['games', 'папка с играми'],
            ['calc', 'калькулятор'],
            ['notepad', 'блокнот'],
            ['glitch', 'глитч'],
            ['rickroll', 'ты знаешь правила'],
            ['cowsay [текст]', 'говорящая корова'],
            ['clear', 'очистить терминал'],
          ];
    return rows.map(([cmd, desc]) => cmd.padEnd(18) + desc).join('\n');
  }

  function openWindow(target, ru, en, lang) {
    return { output: lang === 'ru' ? ru : en, effect: { type: 'open', target } };
  }

  // Resolves to { output, effect }.
  window.XP.runTerminalCommand = async function (raw, requestedLang) {
    const lang = requestedLang === 'en' ? 'en' : 'ru';
    const ru = lang === 'ru';
    const cmd = (raw || '').trim();
    if (!cmd) return { output: '', effect: null };

    const [, first, rest] = cmd.match(/^(\S+)\s*([\s\S]*)$/);
    const name = first.toLowerCase();
    const arg = rest.trim();

    switch (name) {
      case 'help':
      case '?':
        return { output: help(lang), effect: null };
      case 'help.exe':
        return { output: '', effect: { type: 'horror' } };
      case 'whoami':
        return { output: await whoami(lang), effect: null };
      case 'cv':
        return { output: cvTxt(lang), effect: { type: 'open', target: 'resume' } };
      case 'projects':
        return { output: projectsTxt(lang), effect: { type: 'open', target: 'projects' } };
      case 'shitpost.exe':
        return { output: '', effect: { type: 'url', url: SHITPOST_URL } };
      case 'contact':
        return { output: contactTxt(), effect: { type: 'open', target: 'contact' } };
      case 'tail':
      case 'log':
        return {
          output: ru
            ? 'tail: site.log: нет такого файла\nУ статического сайта нет сервера, а значит, и лога.'
            : 'tail: site.log: No such file or directory\nA static site has no server, and so no log.',
          effect: null,
        };
      case 'sudo':
        return { output: ru ? 'Permission denied. (тоже неплохой навык)' : 'Permission denied. (also a valid life skill)', effect: null };
      case 'matrix':
        return { output: ru ? 'Открой глаза, рекрутер...' : 'Wake up, recruiter...', effect: { type: 'matrix' } };
      case 'bsod':
        return { output: bsodText(lang), effect: { type: 'bsod' } };
      case 'shutdown':
        return { output: '', effect: { type: 'shutdown' } };
      case 'bible':
        return { output: bible(arg, lang), effect: null };
      case 'coffee':
        return {
          output: `        ) )\n       ( (\n      ........\n      |      |]\n      \\      /\n       \`----'\n${ru ? 'кофе закончился. моя продуктивность обнулена.' : "coffee's out. my productivity just hit zero."}`,
          effect: null,
        };
      case 'neofetch':
        return { output: neofetch(lang), effect: null };
      case 'taskmgr':
        return openWindow('taskmgr', 'Диспетчер задач открыт. «Снять задачу» правда закрывает окна.', 'Task Manager opened. "End Task" really does close windows.', lang);
      case 'games':
        return openWindow('games', 'Папка «Игры» открыта.', 'Games folder opened.', lang);
      case 'explorer':
        return openWindow('explorer', 'Проводник открыт. Здесь можно найти резюме, проекты и контакты.', 'File Explorer opened. You can find resume, projects and contacts here.', lang);
      case 'calc':
        return openWindow('calc', 'Калькулятор открыт. С клавиатуры тоже считает.', 'Calculator opened. The keyboard works too.', lang);
      case 'notepad':
        return openWindow('notepad', 'Блокнот открыт. Заметка сохраняется в этом браузере.', 'Notepad opened. Your note is saved in this browser.', lang);
      case 'glitch':
        return { output: ru ? 'режим глитча активирован' : 'glitch mode activated', effect: { type: 'glitch' } };
      case 'rickroll':
        return { output: 'Never gonna give you up...\nNever gonna let you down...', effect: { type: 'rickroll' } };
      case 'cowsay':
        return { output: cowsay(arg, lang), effect: null };
      case 'clear':
        return { output: '', effect: { type: 'clear' } };
      default:
        return {
          output: ru
            ? `«${name}» не является внутренней или внешней командой.\nнаберите 'help'`
            : `'${name}' is not recognized as an internal or external command.\ntype 'help'`,
          effect: null,
        };
    }
  };
})();
