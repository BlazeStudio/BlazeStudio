'use strict';

/* =========================================================
   help.exe — a short horror game hidden behind the console command of the
   same name (api/terminal.py answers it with a 'horror' effect).

   The desktop's picture collapses like a CRT switching off and a warning
   waits in the dark for a key. Then an old orange-phosphor terminal powers
   on, dials out over a modem, and something lost in a night forest answers.
   It asks to be led north. You see what it sees: a tiny pixel forest drawn
   at 192×120 in the spirit of FAITH (Airdorf, 2017), with flat colours,
   dithered darkness a few pixels past its feet, buzzy synth stings and the
   SAM speech synthesizer as its voice.

   The route: the edge of the forest → a telephone ringing on a stump → the
   same clearing again and again (the forest walks you in circles, and
   something tall walks with you) → a note with the old rule against the
   leshy: turn your clothes inside out, swap your boots → the light.

   Assets load only once the game starts (static/horror/, see CREDITS.md):
   CC0 recordings, the Press Start 2P font and SAM (sam-js). Each is
   optional: a missing sound stays silent, no SAM means text without voice.
   Esc (or the corner button on phones) leaves at any moment.
   ========================================================= */
(function () {
  const BASE = '/static/horror/';
  const W = 192; // the forest's own resolution; CSS scales it up, pixels and all
  const H = 120;
  const SOUND_NAMES = ['crt-on', 'crt-off', 'forest', 'ring', 'pickup', 'hangup', 'twig', 'whispers'];
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  const MOVE_KEYS = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  const ACT_KEYS = new Set(['KeyE', 'Space', 'Enter', 'NumpadEnter']);
  const ABORT = { abort: true }; // the player quit: every pending step of the story unwinds
  const STALE = { stale: true }; // the room changed under a running story beat

  /* ---------------- text ----------------
     Lines the thing on the line says aloud carry `p`: the same line as SAM
     phonemes, since SAM only reads English — Russian is spelled out by sound.
     English lines go through SAM's own text-to-speech. {N} is the player's name. */
  const TXT = {
    ru: {
      warnTitle: 'ВНИМАНИЕ',
      warn: ['В ЭТОЙ ПРОГРАММЕ ЕСТЬ ГРОМКИЕ ЗВУКИ И МЕРЦАНИЕ.', 'ЛУЧШЕ В НАУШНИКАХ. И С ВЫКЛЮЧЕННЫМ СВЕТОМ.'],
      anyKey: 'НАЖМИТЕ ЛЮБУЮ КЛАВИШУ',
      anyTap: 'КОСНИТЕСЬ ЭКРАНА',
      quitKey: 'ESC — ВЫХОД',
      quitTap: '× ВЫХОД',
      boot: ['HELP.EXE  ВЕРСИЯ 1.0', '(C) 1986 ЛЕСХОЗ №7'],
      mem: 'ПРОВЕРКА ПАМЯТИ ....... 640K ОК',
      dial: 'ПОИСК АБОНЕНТА ........ ',
      found: 'НАЙДЕН',
      link: ['СОЕДИНЕНИЕ: 300 БОД', 'ИСТОЧНИК: ЛЕС, КВАРТАЛ 7'],
      sensors: 'ДАТЧИКИ: ИСПРАВЕН 1 ИЗ 9',
      yes: 'ДА',
      no: 'НЕТ',
      yesKey: 'Д',
      noKey: 'Н',
      hear: { t: 'ТЫ МЕНЯ СЛЫШИШЬ?', p: 'TIH4 MIHNYAA4 SLIH4SHIHSH?' },
      hearYes: { t: 'ХОРОШО. НЕ КЛАДИ ТРУБКУ.', p: '/HAHRAHSHOH4. NYEH KLAHDIY4 TRUW4PKUW.' },
      hearNo: { t: 'ТОГДА КТО ЭТО ПЕЧАТАЕТ?', p: 'TAHGDAA4 KTOH4 EH4TAH PIHCHAA4TAHYEHT?' },
      askName: { t: 'КАК ТЕБЯ ЗОВУТ?', p: 'KAA4K TIHBYAA4 ZAHVUW4T?' },
      friend: 'ДРУГ',
      remember: { t: '{N}. Я ЗАПОМНЮ.', p: '{N}. YAA4 ZAHPAO4MNYUW.' },
      lost: ['Я НЕ ПОМНЮ, КАК СЮДА ПОПАЛ.', 'ГЛАЗА ПОЧТИ НЕ ВИДЯТ. ПОКАЖУ ТЕБЕ, ЧТО ВИЖУ.'],
      lead: { t: 'ВЕДИ МЕНЯ НА СЕВЕР. ТАМ БЫЛ СВЕТ.', p: 'VIHDIY4 MIHNYAA4 NAH SYEH4VIHR. TAA4M BIH4L SVYEH4T.' },
      ctlKeys: 'СТРЕЛКИ / WASD — ИДТИ.  E / ПРОБЕЛ — ДЕЙСТВИЕ.',
      ctlTouch: 'КНОПКИ ВНИЗУ — ИДТИ И ДЕЙСТВОВАТЬ.',
      vision: 'ЗРЕНИЕ',
      pulse: 'ПУЛЬС',
      negative: 'НЕГАТИВ',
      edge: 'ГДЕ-ТО НА СЕВЕРЕ БЫЛ СВЕТ.',
      carHint: 'ОСМОТРЕТЬ',
      car: 'МОТОР РАБОТАЕТ. ВНУТРИ НИКОГО. НА СИДЕНЬЯХ ХВОЯ.',
      phoneHere: 'ТЕЛЕФОН. ЗДЕСЬ, В ЛЕСУ.',
      noWayBack: 'ПОЗАДИ БОЛЬШЕ НЕТ ТРОПЫ.',
      answerHint: 'ОТВЕТИТЬ',
      ringing: 'ОН ЗВОНИТ ТЕБЕ.',
      call: [
        { t: '{N}? ЭТО Я. Я У МАШИНЫ. ВОЗВРАЩАЙСЯ.', p: '{N}? EH4TAH YAA4. YAA4 UW MAHSHIY4NIH. VAHZVRAH SHAY4SYAH.' },
        { t: 'НЕ ХОДИ НА СЕВЕР.', p: 'NYEH /HAHDIY4 NAH SYEH4VIHR.' },
      ],
      notMe: 'ЭТО БЫЛ НЕ Я.',
      parted: 'ДЕРЕВЬЯ РАССТУПИЛИСЬ.',
      again: ['МЫ ЗДЕСЬ УЖЕ БЫЛИ.', 'ОПЯТЬ. ЛЕС ВОДИТ НАС ПО КРУГУ.', 'ОПЯТЬ.'],
      keepAway: 'НЕ ПОДПУСКАЙ ЕГО БЛИЗКО.',
      listenHint: 'ПОСЛУШАТЬ',
      breathing: 'В ТРУБКЕ КТО-ТО ДЫШИТ. И ЗОВЁТ ТЕБЯ.',
      whisper: { p: '{N}. {N}.' },
      white: 'НА ЗЕМЛЕ ЧТО-ТО БЕЛЕЕТ.',
      readIt: 'ТА БУМАЖКА. ПРОЧТИ ЕЁ.',
      readHint: 'ПРОЧЕСТЬ',
      note: '«ЕСЛИ ЛЕШИЙ ВОДИТ ПО КРУГУ — ВЫВЕРНИ ОДЕЖДУ НАИЗНАНКУ И ПЕРЕОБУЙСЯ: ЛЕВЫЙ САПОГ НА ПРАВУЮ НОГУ.»',
      invert: { t: 'ВЫВЕРНУТЬ ВСЁ НАИЗНАНКУ?', p: 'VIH4VIHRNUWT FSYOH4 NAHIHZNAA4NKUW?' },
      inverted: 'ЛЕВОЕ СТАЛО ПРАВЫМ.',
      goNorth: 'ИДИ НА СЕВЕР.',
      asYouSay: 'КАК СКАЖЕШЬ.',
      quiet: 'ТИХО.',
      light: 'ВОТ ОН. СВЕТ.',
      diag: [
        ['ВНИМАНИЕ: КРИТИЧЕСКИЕ ПОВРЕЖДЕНИЯ.', 'o'],
        ['ЗАПУСК ДИАГНОСТИКИ', 'o'],
        ['ОШИБКА: МОДУЛЬ РУКИ №1 НЕ ОТВЕЧАЕТ', 'r'],
        ['ОШИБКА: МОДУЛЬ РУКИ №2 НЕ ОТВЕЧАЕТ', 'r'],
        ['ВНИМАНИЕ: ПОД КОЖЕЙ ОБНАРУЖЕНА КОРА', 'o'],
        ['ПОПЫТКА ВОССТАНОВЛЕНИЯ', 'o'],
        ['ОШИБКА: УЗЕЛ САМОВОССТАНОВЛЕНИЯ НЕ ОТВЕЧАЕТ', 'r'],
        ['НЕДОСТАТОЧНО КРОВИ.', 'r'],
        ['НЕДОСТАТОЧНО КРОВИ.', 'r'],
        ['ЗАМЕНА КРОВИ НА ЖИВИЦУ ... ВЫПОЛНЕНО', 'o'],
        ['ВНИМАНИЕ: В МОДУЛЯХ НОГ ОБНАРУЖЕНЫ КОРНИ', 'o'],
        ['ОШИБКА: ЗРИТЕЛЬНАЯ КОРА ЗАПОЛНЕНА ХВОЕЙ', 'r'],
        ['! ОТКАЗ ПУЛЬСА !', 'r'],
        ['! ОТКАЗ ПУЛЬСА !', 'r'],
        ['-!- ОТКЛЮЧЕНИЕ НЕИЗБЕЖНО -!-', 'r'],
        ['ОШИБКА: НЕТ ГОЛОСОВОГО ИНТЕРФЕЙСА. ЗАДАЧА НЕ ВЫПОЛНЕНА', 'r'],
      ],
      reconnect: ['ПЕРЕПОДКЛЮЧЕНИЕ...', 'НАЙДЕНО НОВОЕ ТЕЛО.'],
      tree: ['ТАМ, ГДЕ Я УПАЛ, ВЫРОСЛО ДЕРЕВО.', 'ЕЩЁ ОДНО ДЕРЕВО.'],
      clean: 'СИГНАЛ ЧИСТЫЙ.',
      thanks: { t: 'СПАСИБО, {N}. ТЕПЕРЬ Я ЗНАЮ ДОРОГУ.', p: 'SPAHSIY4BAH, {N}. TIHPYEH4R YAA4 ZNAA4YUW DAHRAO4GUW.' },
      room: { t: 'ТЕПЕРЬ Я ВИЖУ ТВОЮ КОМНАТУ.', p: 'TIHPYEH4R YAA4 VIY4ZHUW TVAHYUW4 KOH4MNAHTUW.' },
      time: 'У ТЕБЯ СЕЙЧАС {T}.',
      late: 'ТЕБЕ ДАВНО ПОРА СПАТЬ.',
      dusk: 'СКОРО СТЕМНЕЕТ. Я ПОДОЖДУ.',
      turn: { t: 'НЕ ОБОРАЧИВАЙСЯ.', p: 'NYEH AHBAHRAA4CHIHVAYSYAH.' },
      closed: 'help.exe: соединение закрыто.',
      aborted: 'help.exe: соединение прервано.',
      ghost: 'спасибо за помощь, {n}. теперь я живу здесь.',
    },
    en: {
      warnTitle: 'WARNING',
      warn: ['THIS PROGRAM CONTAINS LOUD NOISES AND FLICKERING.', 'BEST WITH HEADPHONES. AND THE LIGHTS OFF.'],
      anyKey: 'PRESS ANY KEY',
      anyTap: 'TAP THE SCREEN',
      quitKey: 'ESC — QUIT',
      quitTap: '× QUIT',
      boot: ['HELP.EXE  VERSION 1.0', '(C) 1986 FORESTRY UNIT 7'],
      mem: 'MEMORY CHECK .......... 640K OK',
      dial: 'SEARCHING FOR CALLER .. ',
      found: 'FOUND',
      link: ['CONNECTED AT 300 BAUD', 'SOURCE: FOREST, QUARTER 7'],
      sensors: 'SENSORS: 1 OF 9 OPERATIONAL',
      yes: 'YES',
      no: 'NO',
      yesKey: 'Y',
      noKey: 'N',
      hear: { t: 'CAN YOU HEAR ME?' },
      hearYes: { t: "GOOD. DON'T HANG UP." },
      hearNo: { t: 'THEN WHO IS TYPING?' },
      askName: { t: 'WHAT IS YOUR NAME?' },
      friend: 'FRIEND',
      remember: { t: '{N}. I WILL REMEMBER.' },
      lost: ["I DON'T REMEMBER HOW I GOT HERE.", "MY EYES BARELY WORK. I'LL SHOW YOU WHAT I SEE."],
      lead: { t: 'LEAD ME NORTH. THERE WAS A LIGHT.' },
      ctlKeys: 'ARROWS / WASD — WALK.  E / SPACE — ACT.',
      ctlTouch: 'BUTTONS BELOW — WALK AND ACT.',
      vision: 'VISION',
      pulse: 'PULSE',
      negative: 'NEGATIVE',
      edge: 'THERE WAS A LIGHT SOMEWHERE NORTH.',
      carHint: 'LOOK',
      car: 'THE ENGINE IS RUNNING. NOBODY INSIDE. PINE NEEDLES ON THE SEATS.',
      phoneHere: 'A TELEPHONE. HERE, IN THE FOREST.',
      noWayBack: 'THE PATH BEHIND US IS GONE.',
      answerHint: 'ANSWER',
      ringing: "IT'S RINGING FOR YOU.",
      call: [{ t: "{N}? IT'S ME. I'M AT THE CAR. COME BACK." }, { t: "DON'T GO NORTH." }],
      notMe: "THAT WASN'T ME.",
      parted: 'THE TREES STEPPED ASIDE.',
      again: ["WE'VE BEEN HERE BEFORE.", 'AGAIN. THE FOREST IS WALKING US IN CIRCLES.', 'AGAIN.'],
      keepAway: "DON'T LET IT GET CLOSE.",
      listenHint: 'LISTEN',
      breathing: 'SOMEONE IS BREATHING ON THE LINE. CALLING YOUR NAME.',
      whisper: { t: '{N}... {N}...' },
      white: 'SOMETHING WHITE ON THE GROUND.',
      readIt: 'THAT PAPER. READ IT.',
      readHint: 'READ',
      note: '"IF THE LESHY WALKS YOU IN CIRCLES, TURN YOUR CLOTHES INSIDE OUT AND SWAP YOUR BOOTS, LEFT FOR RIGHT."',
      invert: { t: 'TURN EVERYTHING INSIDE OUT?' },
      inverted: 'LEFT IS RIGHT NOW.',
      goNorth: 'GO NORTH.',
      asYouSay: 'AS YOU SAY.',
      quiet: 'QUIET.',
      light: 'THERE. THE LIGHT.',
      diag: [
        ['WARNING: EXTREME DAMAGE SUSTAINED.', 'o'],
        ['RUNNING DIAGNOSTIC', 'o'],
        ['ERROR: ARM CORE MODULE #1 NOT RESPONDING', 'r'],
        ['ERROR: ARM CORE MODULE #2 NOT RESPONDING', 'r'],
        ['WARNING: BARK DETECTED UNDER SKIN', 'o'],
        ['ATTEMPTING RECONSTRUCTION', 'o'],
        ['ERROR: SELF-REPAIR NEXUS NOT RESPONDING', 'r'],
        ['INSUFFICIENT BLOOD.', 'r'],
        ['INSUFFICIENT BLOOD.', 'r'],
        ['SUBSTITUTING BLOOD WITH SAP ... DONE', 'o'],
        ['WARNING: ROOTS FOUND IN LEG CORE MODULES', 'o'],
        ['ERROR: VISUAL CORTEX FULL OF PINE NEEDLES', 'r'],
        ['! PULSE FAILURE !', 'r'],
        ['! PULSE FAILURE !', 'r'],
        ['-!- SHUTDOWN IMMINENT -!-', 'r'],
        ['ERROR: NO VOCAL INTERFACE DETECTED. UNABLE TO COMPLETE TASK', 'r'],
      ],
      reconnect: ['RECONNECTING...', 'NEW BODY FOUND.'],
      tree: ['A TREE GREW WHERE I FELL.', 'ONE MORE TREE.'],
      clean: 'SIGNAL CLEAR.',
      thanks: { t: 'THANK YOU, {N}. NOW I KNOW THE WAY.' },
      room: { t: 'NOW I CAN SEE YOUR ROOM.' },
      time: "IT'S {T} WHERE YOU ARE.",
      late: 'YOU SHOULD HAVE BEEN ASLEEP LONG AGO.',
      dusk: "IT'LL BE DARK SOON. I'LL WAIT.",
      turn: { t: "DON'T TURN AROUND." },
      closed: 'help.exe: connection closed.',
      aborted: 'help.exe: connection aborted.',
      ghost: 'thank you for the help, {n}. i live here now.',
    },
  };
  const SCREAM = { p: 'AA8AA8AA8AA8AA8AA8AA8', any: true };

  // SAM settings — speed: higher is slower; pitch: higher is lower. `under`
  // adds a second copy of the line far below the first: the FAITH demon double.
  const VOICES = {
    it: { speed: 84, pitch: 80, throat: 112, mouth: 142, under: 150, vol: 1.3 },
    phone: { speed: 74, pitch: 58, throat: 128, mouth: 128, phone: true, vol: 1.4 },
    deep: { speed: 112, pitch: 150, throat: 190, mouth: 190, under: 220, phone: true, vol: 1.5 },
    whisper: { speed: 96, pitch: 70, throat: 150, mouth: 180, phone: true, vol: 0.5 },
    last: { speed: 124, pitch: 118, throat: 160, mouth: 190, under: 230, vol: 1.5 },
    scream: { speed: 60, pitch: 30, throat: 200, mouth: 220, under: 190, vol: 1.2 },
  };

  let S = null; // the running session; null while the game is closed
  let ghostTimer = null;

  const L = () => TXT[S.lang];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);

  // mulberry32: rooms come out the same every time you walk back into them
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Every pause in the story goes through here, so quitting unwinds it all.
  function wait(ms) {
    const s = S;
    return new Promise((resolve, reject) => {
      setTimeout(() => (s && !s.dead ? resolve() : reject(ABORT)), ms);
    });
  }

  // A pause inside a room's story beat: also gives up if the room changed meanwhile.
  async function rwait(ms) {
    const gen = S.gen;
    await wait(ms);
    if (S.gen !== gen) throw STALE;
  }

  // Story beats run alongside the game loop; quitting or leaving the room just ends them.
  function task(fn, ...args) {
    return Promise.resolve()
      .then(() => fn(...args))
      .catch((e) => {
        if (e !== ABORT && e !== STALE) console.error(e);
      });
  }

  /* ---------------- audio ---------------- */
  const cache = { ctx: null, bufs: {}, noise: null };

  function audioInit() {
    let ctx = null;
    try {
      ctx = window.XP.boot ? window.XP.boot.unlock() : null; // share the desktop's AudioContext
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = AC ? new AC() : null;
      }
    } catch (_) {
      ctx = null;
    }
    if (!ctx) return null;
    if (cache.ctx !== ctx) {
      cache.ctx = ctx;
      cache.bufs = {};
      cache.noise = null;
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const out = ctx.createGain();
    out.gain.value = 0.9;
    // stings are meant to startle, not to hurt: a compressor keeps the peaks in check
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 10;
    comp.ratio.value = 8;
    comp.attack.value = 0.002;
    comp.release.value = 0.25;
    out.connect(comp);
    comp.connect(ctx.destination);
    const bus = () => {
      const g = ctx.createGain();
      g.connect(out);
      return g;
    };
    const A = { ctx, out, comp, sfx: bus(), amb: bus(), voice: bus(), nodes: new Set() };
    // a short dark room around the voice
    const verb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 1.6);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch += 1) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    verb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    A.voice.connect(verb);
    verb.connect(wet);
    wet.connect(out);
    return A;
  }

  function audioClose(A) {
    const t = A.ctx.currentTime;
    A.out.gain.cancelScheduledValues(t);
    A.out.gain.setValueAtTime(A.out.gain.value, t);
    A.out.gain.linearRampToValueAtTime(0, t + 0.12);
    setTimeout(() => {
      A.nodes.forEach((n) => {
        try {
          n.stop();
        } catch (_) {
          /* already stopped */
        }
      });
      A.nodes.clear();
      A.comp.disconnect();
    }, 200);
  }

  function track(A, node) {
    A.nodes.add(node);
    node.addEventListener('ended', () => A.nodes.delete(node));
  }

  function noiseBuf(A) {
    if (!cache.noise) {
      cache.noise = A.ctx.createBuffer(1, A.ctx.sampleRate * 2, A.ctx.sampleRate);
      const d = cache.noise.getChannelData(0);
      for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
    }
    return cache.noise;
  }

  function loadSounds(A) {
    return Promise.all(
      SOUND_NAMES.map((name) =>
        cache.bufs[name]
          ? null
          : fetch(BASE + 'sounds/' + name + '.mp3')
              .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(name))))
              .then((data) => new Promise((resolve, reject) => A.ctx.decodeAudioData(data, resolve, reject)))
              .then((buf) => {
                cache.bufs[name] = buf;
              })
              .catch(() => {
                /* that sound just stays silent */
              })
      )
    );
  }

  // A recorded sound. Returns a handle (gain/pan to steer it, stop() to fade it out) or null.
  function play(name, o) {
    o = o || {};
    const A = S && S.audio;
    const buf = A && cache.bufs[name];
    if (!buf) return null;
    const ctx = A.ctx;
    const s = ctx.createBufferSource();
    s.buffer = buf;
    if (o.loop) {
      s.loop = true;
      s.loopStart = 0.03; // step over the MP3 encoder's padding at both ends
      s.loopEnd = buf.duration - 0.03;
    }
    if (o.rate) s.playbackRate.value = o.rate;
    const g = ctx.createGain();
    g.gain.value = o.vol == null ? 1 : o.vol;
    if (o.lowpass) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lowpass;
      s.connect(f);
      f.connect(g);
    } else {
      s.connect(g);
    }
    let p = null;
    let head = g;
    if (ctx.createStereoPanner) {
      p = ctx.createStereoPanner();
      p.pan.value = o.pan || 0;
      g.connect(p);
      head = p;
    }
    head.connect(o.bus || A.sfx);
    s.start(ctx.currentTime, o.loop ? 0.03 : 0);
    track(A, s);
    return {
      g,
      p,
      stop(fade) {
        const t = ctx.currentTime;
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.linearRampToValueAtTime(0, t + (fade || 0.05));
        try {
          s.stop(t + (fade || 0.05) + 0.02);
        } catch (_) {
          /* already stopped */
        }
      },
    };
  }

  function setVol(h, v, sec) {
    if (!h || !S || !S.audio) return;
    h.g.gain.setTargetAtTime(v, S.audio.ctx.currentTime, (sec || 0.3) / 3);
  }

  // One synthesized note: square by default, the voice of every beep in FAITH.
  function tone(freq, dur, o) {
    o = o || {};
    const A = S && S.audio;
    if (!A) return;
    const ctx = A.ctx;
    const t = ctx.currentTime + (o.at || 0);
    const osc = ctx.createOscillator();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    const g = ctx.createGain();
    const v = o.vol == null ? 0.05 : o.vol;
    const a = Math.min(o.attack || 0.004, dur / 3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.setValueAtTime(v, t + Math.max(a, dur * (o.hold == null ? 0.6 : o.hold)));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(o.bus || A.sfx);
    osc.start(t);
    osc.stop(t + dur + 0.03);
    track(A, osc);
  }

  // A burst of filtered noise: footsteps, static, breath, wind.
  function hiss(dur, o) {
    o = o || {};
    const A = S && S.audio;
    if (!A) return;
    const ctx = A.ctx;
    const t = ctx.currentTime + (o.at || 0);
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf(A);
    const f = ctx.createBiquadFilter();
    f.type = o.ft || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 1500, t);
    if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + dur);
    f.Q.value = o.q || 0.8;
    const g = ctx.createGain();
    const v = o.vol == null ? 0.08 : o.vol;
    const a = Math.min(o.attack || 0.003, dur * 0.95);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    let head = g;
    if (o.pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = o.pan;
      g.connect(p);
      head = p;
    }
    head.connect(o.bus || A.sfx);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.03);
    track(A, s);
  }

  // Continuous layers (mains hum, the drone, static) are a gain plus the sources feeding it.
  function stopLayer(h, sec) {
    if (!h || !S || !S.audio) return;
    const t = S.audio.ctx.currentTime;
    h.g.gain.setTargetAtTime(0, t, sec / 3);
    h.nodes.forEach((n) => {
      try {
        n.stop(t + sec + 0.1);
      } catch (_) {
        /* already stopped */
      }
    });
  }

  function osc(ctx, A, freq, type, gain, dest) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = gain;
    o.connect(g);
    g.connect(dest);
    o.start();
    track(A, o);
    return o;
  }

  // 50 Hz mains hum of an old monitor.
  function hum(on, level) {
    const A = S && S.audio;
    if (!A) return;
    if (on && !S.humH) {
      const ctx = A.ctx;
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(A.amb);
      const nodes = [[50, 0.5], [100, 0.3], [150, 0.14], [250, 0.05]].map(([f, v]) => osc(ctx, A, f, 'sine', v, g));
      g.gain.setTargetAtTime(level || 0.035, ctx.currentTime, 0.3);
      S.humH = { g, nodes };
    } else if (!on && S.humH) {
      stopLayer(S.humH, 0.6);
      S.humH = null;
    }
  }

  // Two detuned low saws a fifth apart, and a tritone above them that creeps in with danger.
  function drone(on) {
    const A = S && S.audio;
    if (!A) return;
    if (on && !S.droneH) {
      const ctx = A.ctx;
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(A.amb);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 220;
      lp.Q.value = 4;
      lp.connect(g);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const depth = ctx.createGain();
      depth.gain.value = 120;
      lfo.connect(depth);
      depth.connect(lp.frequency);
      lfo.start();
      track(A, lfo);
      const tension = ctx.createGain();
      tension.gain.value = 0;
      tension.connect(lp);
      const nodes = [
        lfo,
        osc(ctx, A, 41.2, 'sawtooth', 0.5, lp),
        osc(ctx, A, 41.5, 'sawtooth', 0.4, lp),
        osc(ctx, A, 61.7, 'sawtooth', 0.3, lp),
        osc(ctx, A, 58.3, 'square', 0.6, tension),
        osc(ctx, A, 87.3, 'square', 0.3, tension),
      ];
      g.gain.setTargetAtTime(0.11, ctx.currentTime, 1.5);
      S.droneH = { g, nodes, tension };
    } else if (!on && S.droneH) {
      stopLayer(S.droneH, 1.5);
      S.droneH = null;
    }
  }

  // Looping noise through a band-pass: TV static (driven by danger), or a phone line's hiss.
  function noiseLayer(freq, q, level) {
    const A = S && S.audio;
    if (!A) return null;
    const ctx = A.ctx;
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf(A);
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = level;
    s.connect(f);
    f.connect(g);
    g.connect(A.amb);
    s.start();
    track(A, s);
    return { g, nodes: [s] };
  }

  const tick = () => tone(1350 + Math.random() * 600, 0.014, { vol: 0.022, hold: 0.3 });
  const beep = (f, d, v) => tone(f, d, { vol: v || 0.04 });

  function footstep() {
    S.foot = !S.foot;
    hiss(0.045, { freq: S.foot ? 1300 : 1700, q: 1.4, vol: 0.06 });
    tone(S.foot ? 110 : 96, 0.04, { vol: 0.018 });
  }

  function lubdub(v) {
    const bus = S.audio && S.audio.amb;
    tone(64, 0.13, { type: 'sine', slide: 40, vol: v, attack: 0.008, hold: 0.2, bus });
    tone(58, 0.11, { type: 'sine', slide: 38, vol: v * 0.7, attack: 0.008, hold: 0.2, at: 0.17, bus });
  }

  // Dialing out and the handshake of a 300-baud modem. Returns its length in seconds.
  function modem() {
    const DTMF = { 0: [941, 1336], 1: [697, 1209], 6: [770, 1477], 7: [852, 1209], 8: [852, 1336], 9: [852, 1477] };
    let at = 0;
    '7019867'.split('').forEach((digit) => {
      DTMF[digit].forEach((f) => tone(f, 0.075, { type: 'sine', vol: 0.035, at, hold: 0.9 }));
      at += 0.13;
    });
    at += 0.35;
    tone(2100, 0.75, { type: 'sine', vol: 0.03, at, hold: 0.9 }); // the other end picks up
    at += 0.85;
    for (let i = 0; i < 9; i += 1) {
      tone(i % 2 ? 1650 : 980, 0.07, { vol: 0.02, at, hold: 0.9 });
      hiss(0.07, { freq: 1800, q: 0.9, vol: 0.05, at });
      at += 0.08;
    }
    hiss(0.7, { freq: 1700, q: 0.6, vol: 0.07, at, attack: 0.02 });
    tone(1200, 0.7, { type: 'sawtooth', vol: 0.008, at, slide: 2400 });
    return at + 0.75;
  }

  // Busy signal after the caller hangs up (the Soviet 425 Hz one). Returns its length.
  function busy(n) {
    for (let i = 0; i < n; i += 1) tone(425, 0.35, { type: 'sine', vol: 0.04, at: i * 0.7, hold: 0.95 });
    return n * 0.7;
  }

  // The scare: a cluster of distorted squares and saws diving down, noise, a sub boom.
  function sting(len) {
    const A = S && S.audio;
    if (!A) return;
    const ctx = A.ctx;
    const t = ctx.currentTime;
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i += 1) curve[i] = Math.tanh((i / 512 - 1) * 6);
    shaper.curve = curve;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
    g.gain.setValueAtTime(0.5, t + len * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    shaper.connect(g);
    g.connect(A.sfx);
    for (let i = 0; i < 6; i += 1) {
      const o = ctx.createOscillator();
      o.type = i % 2 ? 'square' : 'sawtooth';
      const f = 110 + Math.random() * 1300;
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.45, t + len);
      const og = ctx.createGain();
      og.gain.value = 0.18;
      o.connect(og);
      og.connect(shaper);
      o.start(t);
      o.stop(t + len + 0.05);
      track(A, o);
    }
    const n = ctx.createBufferSource();
    n.buffer = noiseBuf(A);
    const ng = ctx.createGain();
    ng.gain.value = 0.5;
    n.connect(ng);
    ng.connect(shaper);
    n.start(t);
    n.stop(t + len);
    track(A, n);
    tone(70, len, { type: 'sine', slide: 26, vol: 0.7, attack: 0.005, hold: 0.4 });
  }

  // The tube powering on. Returns the delay (s) until the picture should appear: the degauss thump.
  function crtOnSound(vol) {
    if (play('crt-on', { vol: vol || 0.85 })) return 1.75;
    tone(48, 0.9, { type: 'sine', slide: 30, vol: 0.5, at: 0.3, attack: 0.01, hold: 0.3 });
    hiss(0.5, { freq: 6000, q: 0.5, vol: 0.05, at: 0.4 });
    return 0.3;
  }

  function crtOffSound() {
    if (!play('crt-off', { vol: 0.8 })) hiss(0.03, { freq: 4000, vol: 0.1 });
    tone(1400, 0.35, { type: 'sine', slide: 50, vol: 0.03 });
  }

  /* ---------------- voice (SAM) ---------------- */
  let samLoad = null;
  function loadSam() {
    if (window.SamJs) return Promise.resolve(window.SamJs);
    if (!samLoad) {
      samLoad = new Promise((resolve) => {
        const el = document.createElement('script');
        el.src = BASE + 'vendor/samjs.min.js';
        el.onload = () => resolve(window.SamJs || null);
        el.onerror = () => {
          samLoad = null;
          resolve(null);
        };
        document.head.appendChild(el);
      });
    }
    return samLoad;
  }

  const TRANSLIT = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'ye', ё: 'yo', ж: 'zh', з: 'z', и: 'ee', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'oo', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya' };

  // SAM reads Latin letters only: Russian names are spelled out by sound first.
  function translit(s) {
    return s
      .toLowerCase()
      .split('')
      .map((c) => (c in TRANSLIT ? TRANSLIT[c] : /[a-z]/.test(c) ? c : ' '))
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function voiceText(entry) {
    if (entry.any) return { text: entry.p, ph: true };
    if (S.lang === 'ru' && entry.p) return { text: entry.p.split('{N}').join(S.namePh).replace(/^[\s.,?]+/, ''), ph: true };
    return { text: (entry.t || '').split('{N}').join(S.nameLat), ph: false };
  }

  function samRender(text, ph, v, pitch) {
    try {
      return new S.sam({ speed: v.speed, pitch, throat: v.throat, mouth: v.mouth }).buf32(text, ph) || null;
    } catch (_) {
      return null;
    }
  }

  // Says one line. Returns its length in seconds right away and `done` once it's
  // finished; without SAM (or sound at all) it's silent and done immediately.
  function speak(entry, voice) {
    const none = { dur: 0, done: Promise.resolve() };
    const A = S && S.audio;
    if (!A || !S.sam || !entry) return none;
    const v = VOICES[voice];
    const { text, ph } = voiceText(entry);
    if (!text.trim()) return none;
    const main = samRender(text, ph, v, v.pitch);
    if (!main) return none;
    const ctx = A.ctx;
    const t = ctx.currentTime + 0.02;
    const g = ctx.createGain();
    g.gain.value = v.vol;
    if (v.phone) {
      // a 1980s handset: no lows, no highs
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 420;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2900;
      g.connect(hp);
      hp.connect(lp);
      lp.connect(A.voice);
    } else {
      g.connect(A.voice);
    }
    const layer = (data, gain) => {
      const b = ctx.createBuffer(1, data.length, 22050);
      b.getChannelData(0).set(data);
      const s = ctx.createBufferSource();
      s.buffer = b;
      const lg = ctx.createGain();
      lg.gain.value = gain;
      s.connect(lg);
      lg.connect(g);
      s.start(t);
      track(A, s);
      return s;
    };
    const src = layer(main, 1);
    if (v.under) {
      const low = samRender(text, ph, v, v.under);
      if (low) layer(low.length > main.length ? low.subarray(0, main.length) : low, 0.45);
    }
    const dur = main.length / 22050;
    const done = new Promise((resolve) => {
      let fin = false;
      const end = () => {
        if (!fin) {
          fin = true;
          resolve();
        }
      };
      src.addEventListener('ended', end);
      setTimeout(end, dur * 1000 + 300);
    });
    return { dur, done };
  }

  /* ---------------- sprites ---------------- */
  const PAL = {
    g: '#1e3a26', G: '#2f5a37', d: '#11251a', t: '#3a2a1e', // spruce
    b: '#cfcabb', B: '#2e2e2e', l: '#4d6a2c', L: '#2f4420', // birch
    w: '#d9d4c5', // the body you're walking
    s: '#121212', S: '#2a2a2a', // the tall one
    r: '#a8222c', R: '#5e0f15', q: '#d8c8a0', u: '#6b4d36', U: '#3e2c1f', // telephone on a stump
    c: '#4b1d1d', C: '#2b1010', v: '#12181f', k: '#1a1a1a', h: '#5a5a5a', y: '#ffe9a0', // car
    n: '#8d8676', N: '#5d584d', o: '#ff9a2e', m: '#4a463d', // monitor
    p: '#e6dfc6', P: '#a29b84', // note
    W: '#a19d90', K: '#050505', // the tree you became
  };

  function spr(rows) {
    const c = document.createElement('canvas');
    c.width = Math.max(...rows.map((r) => r.length));
    c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((row, y) => {
      for (let i = 0; i < row.length; i += 1) {
        const col = PAL[row[i]];
        if (!col) continue;
        x.fillStyle = col;
        x.fillRect(i, y, 1, 1);
      }
    });
    return c;
  }

  const grid = (w, h) => Array.from({ length: h }, () => new Array(w).fill('.'));
  const rowsOf = (g) => g.map((r) => r.join(''));

  // Spruces, tier on tier, lit from the left by a moon you never see.
  function spruce(r) {
    const h = 15 + Math.floor(r() * 12);
    const cx = 6;
    const crown = h - 3;
    const g = grid(13, h);
    for (let y = 0; y < crown; y += 1) {
      const f = (y + 1) / crown;
      const tier = (y % 4) / 3;
      const half = clamp(Math.round(f * 5.6 * (0.7 + 0.3 * tier) + (r() < 0.25 ? 1 : 0) - (r() < 0.15 ? 1 : 0)), 0, 6);
      for (let x = cx - half; x <= cx + half; x += 1) {
        const side = (x - cx) / (half || 1);
        let c = side < -0.4 ? 'g' : side > 0.35 ? 'd' : r() < 0.5 ? 'g' : 'd';
        if ((x === cx - half && r() < 0.6) || (side < 0 && r() < 0.1)) c = 'G';
        g[y][x] = c;
      }
    }
    for (let y = crown; y < h; y += 1) g[y][cx] = 't';
    g[h - 1][cx - 1] = 't';
    return { c: spr(rowsOf(g)), ax: cx, ay: h - 1, bw: 3 };
  }

  // Birches: white trunks are the first thing the dark gives back.
  function birch(r) {
    const h = 20 + Math.floor(r() * 11);
    const cx = 5;
    const g = grid(11, h);
    for (let y = 2; y < h; y += 1) {
      g[y][cx] = 'b';
      g[y][cx + 1] = r() < 0.85 ? 'b' : 'B';
      if (r() < 0.22) g[y][cx + (r() < 0.5 ? 0 : 1)] = 'B';
    }
    for (let i = 0; i < 3; i += 1) {
      const y = 3 + Math.floor(r() * h * 0.4);
      const right = r() < 0.5;
      g[y][right ? cx + 2 : cx - 1] = 'B';
      g[y - 1][right ? cx + 3 : cx - 2] = 'B';
    }
    const top = Math.floor(h * 0.55);
    for (let y = 0; y < top; y += 1) {
      for (let x = 0; x < 11; x += 1) {
        const dx = (x - cx - 0.5) / 5;
        const dy = (y - top * 0.45) / (top * 0.6);
        if (dx * dx + dy * dy < 1 && r() < 0.42 && g[y][x] === '.') g[y][x] = r() < 0.55 ? 'l' : 'L';
      }
    }
    return { c: spr(rowsOf(g)), ax: cx, ay: h - 1, bw: 2 };
  }

  // The tall one: arms to its knees, a head too small, two white eyes.
  function stalker(sway) {
    const w = 13;
    const h = 44;
    const cx = 6;
    const g = grid(w, h);
    const put = (x, y) => {
      if (x >= 0 && x < w && y >= 0 && y < h) g[y][x] = 's';
    };
    for (let y = 0; y < 4; y += 1) for (let x = cx - 1; x <= cx + 1; x += 1) put(x, y);
    put(cx, 4);
    put(cx, 5);
    for (let x = cx - 2; x <= cx + 2; x += 1) put(x, 6);
    for (let y = 7; y < 20; y += 1) {
      put(cx, y);
      if (y < 15) {
        put(cx - 1, y);
        put(cx + 1, y);
      }
    }
    for (let y = 7; y < 33; y += 1) {
      const o = y > 26 ? sway : 0;
      put(cx - 3 - o, y);
      put(cx + 3 + o, y);
    }
    put(cx - 4 - sway, 33);
    put(cx - 3 - sway, 34);
    put(cx + 4 + sway, 33);
    put(cx + 3 + sway, 34);
    for (let y = 20; y < h; y += 1) {
      put(cx - 1, y);
      put(cx + 1, y);
    }
    // a one-pixel rim, so a lit body still reads against the black
    const out = grid(w, h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (g[y][x] === 's') out[y][x] = 's';
        else if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx] === 's')) out[y][x] = 'S';
      }
    }
    return spr(rowsOf(out));
  }

  let SPR = null;
  function sprites() {
    if (SPR) return SPR;
    SPR = {
      player: [
        ['..w..', '.www.', '.www.', '..w..', 'wwwww', 'w.w.w', 'w.w.w', '..w..', '.w.w.', '.w.w.', '.w.w.'],
        ['..w..', '.www.', '.www.', '..w..', '.www.', 'w.w.w', '..w.w', '..w..', '.w.w.', 'w...w', 'w...w'],
        ['..w..', '.www.', '.www.', '..w..', '.www.', 'w.w.w', 'w.w..', '..w..', '.w.w.', 'w..w.', 'w...w'],
      ].map(spr),
      stalker: [stalker(0), stalker(1)],
      phoneOn: spr(['..rrrrrrr..', '.rR.....Rr.', '..rrrrrrr..', '..rrrqrrr..', '..rrrrrrr..', '.uuuuuuuuu.', '.UuuuuuuuU.', '.UUUUUUUUU.', 'UU.U...U.UU']),
      phoneOff: spr([
        '................',
        '................',
        '..rR.....Rr.....',
        '..rrrrqrrrr.....',
        '..rrrrrrrrr.....',
        '.uuuuuuuuuuR....',
        '.UuuuuuuuuUR....',
        '.UUUUUUUUUU.R...',
        'UU.U....U.UU.R..',
        '.............RRr',
        '............rr.r',
      ]),
      stump: spr(['...........', '...........', '...........', '....R......', '...R.R.....', '.uuuuuuuuu.', '.UuuuuuuuU.', '.UUUUUUUUU.', 'UU.U...U.UU']),
      car: spr([
        '..........cccccccccc..........',
        '.........cvvvvcvvvvvc.........',
        '........cvvvvvcvvvvvvc........',
        '..cccccccccccccccccccccccccc..',
        '.cccccccccccccccccccccccccccy.',
        '.cCCCCCCCCCCCCCCCCCCCCCCCCCcy.',
        '.cccccccccccccccccccccccccccc.',
        '..CCkkkCCCCCCCCCCCCCCCkkkCCC..',
        '...khhhk.............khhhk....',
        '....kkk...............kkk.....',
      ]),
      monitor: spr([
        '..nnnnnnnnnnnnnn..',
        '.nNNNNNNNNNNNNNNn.',
        '.nNooooooooooooNn.',
        '.nNooooooooooooNn.',
        '.nNooooooooooooNn.',
        '.nNooooooooooooNn.',
        '.nNooooooooooooNn.',
        '.nNooooooooooooNn.',
        '.nNNNNNNNNNNNNNNn.',
        '.nnnnnnnnnnnnnnnn.',
        '..nnnnnnnnnnnnnn..',
        '....nnnnnnnnnn....',
        '......mmmmmm......',
        '.....mmmmmmmm.....',
      ]),
      note: spr(['pppp', 'pPpp', 'ppPp']),
      dead: spr([
        'W.......W',
        '.W..W..W.',
        '..W.W.W..',
        '...WWW...',
        '...WWW...',
        '...KWK...',
        '...WWW...',
        '...WKW...',
        '....W....',
        '...WWW...',
        '..W.W.W..',
        '....W....',
        '....W....',
        '....W....',
        '...W.W...',
        '...W.W...',
        '...W.W...',
        '..W...W..',
        '.W.....W.',
      ]),
    };
    return SPR;
  }

  /* ---------------- the forest ---------------- */
  // Three clearings. Paths are kept free of trees (and drawn as trodden ground);
  // the exit is a gap in the north wall of trees.
  const ROOMS = {
    edge: { seed: 1301, exitX: 128, interior: 16, paths: [[[62, 120], [62, 104], [96, 70], [128, 30], [128, 0]], [[40, 104], [62, 104]]] },
    phone: { seed: 7001, exitX: 56, interior: 13, paths: [[[128, 120], [96, 66]], [[56, 120], [56, 100], [96, 66]], [[96, 66], [56, 30], [56, 0]], [[56, 100], [56, 30]]] },
    monitor: { seed: 4242, exitX: null, interior: 12, paths: [[[56, 120], [96, 60]]] },
  };
  const NOTE_AT = { x: 156, y: 46 };

  function segDist(px, py, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const k = clamp(((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return Math.hypot(px - a[0] - k * dx, py - a[1] - k * dy);
  }

  function pathDist(paths, x, y) {
    let m = Infinity;
    for (const p of paths) for (let i = 1; i < p.length; i += 1) m = Math.min(m, segDist(x, y, p[i - 1], p[i]));
    return m;
  }

  function makeGround(r, paths) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const x = c.getContext('2d');
    const img = x.createImageData(W, H);
    const d = img.data;
    for (let y = 0; y < H; y += 1) {
      for (let i = 0; i < W; i += 1) {
        const k = (y * W + i) * 4;
        const v = r();
        let col = null;
        if (v < 0.2 && pathDist(paths, i, y) < 4) col = [38, 34, 27];
        else if (v < 0.035) col = [22, 22, 20];
        else if (v < 0.05) col = [34, 28, 20];
        else if (v < 0.057) col = [24, 36, 26];
        if (col) [d[k], d[k + 1], d[k + 2]] = col;
        d[k + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  function prop(c, x, y, ax, ay, box, extra) {
    return Object.assign({ c, x, y, ax, ay, box }, extra || {});
  }

  function makeRoom(kind, loop) {
    const def = ROOMS[kind];
    const r = rng(def.seed + loop * 31);
    const sp = sprites();
    const paths = def.paths.slice();
    const gated = kind === 'phone' && loop === 0; // the way on stays shut until you answer
    const room = { kind, trees: [], props: [], dead: [], inter: [], lights: [], exitX: def.exitX, exitOpen: def.exitX != null && !gated };

    if (kind === 'edge') {
      room.props.push(prop(sp.car, 40, 104, 15, 9, [26, 100, 54, 105]));
      room.lights.push({ x: 60, y: 98, r: 30 }); // the one headlight still on
      room.inter.push({ x: 46, y: 104, r: 22, hint: 'carHint', once: true, fn: () => line(L().car, 'w') });
    } else if (kind === 'phone') {
      const c = loop === 0 ? sp.phoneOn : loop === 1 ? sp.phoneOff : sp.stump;
      room.props.push(prop(c, 96, 64, 5, 8, [91, 60, 101, 65], { shake: loop === 0 }));
      if (loop === 0) room.inter.push({ x: 96, y: 64, r: 18, hint: 'answerHint', once: true, fn: answerPhone });
      if (loop === 1) room.inter.push({ x: 96, y: 64, r: 18, hint: 'listenHint', once: true, fn: listenPhone });
      if (loop >= 2) {
        paths.push([[96, 66], [NOTE_AT.x, NOTE_AT.y]]);
        room.props.push(prop(sp.note, NOTE_AT.x, NOTE_AT.y, 2, 2, null));
        room.lights.push({ x: NOTE_AT.x, y: NOTE_AT.y - 1, r: 7 }); // white enough to catch what light there is
        room.inter.push({ x: NOTE_AT.x, y: NOTE_AT.y, r: 12, hint: 'readHint', when: () => !S.inverted, fn: readNote });
      }
    } else {
      room.props.push(prop(sp.monitor, 96, 56, 9, 13, [88, 52, 104, 57], { draw: drawScreen }));
      room.lights.push({ x: 96, y: 48, r: 40 });
    }

    const add = (x, y, extra) => {
      const t = r() < 0.3 ? birch(r) : spruce(r);
      room.trees.push(Object.assign({ c: t.c, x, y, ax: t.ax, ay: t.ay, box: [x - t.bw, y - 2, x + t.bw, y + 1] }, extra || {}));
    };
    // the north wall, with its gap
    for (let x = -4; x < W + 8; x += 5 + r() * 3) {
      const gap = def.exitX != null && Math.abs(x - def.exitX) < 12;
      if (gap && !gated) continue;
      add(x, 9 + r() * 7, gap ? { gate: true } : null);
    }
    for (let x = 0; x < W; x += 9 + r() * 8) {
      const y = 20 + r() * 8;
      if (pathDist(paths, x, y) > 10) add(x, y);
    }
    // west, east and south walls (south stays open where the paths come in)
    for (let y = 24; y < H + 10; y += 6 + r() * 3) {
      add(2 + r() * 5, y);
      add(W - 2 - r() * 5, y);
    }
    for (let x = 6; x < W - 4; x += 6 + r() * 3) {
      const y = 117 + r() * 6;
      if (pathDist(paths, x, y) > 9) add(x, y);
    }
    // and the clearing itself — denser every time the forest loops you back
    const want = def.interior + (kind === 'phone' ? Math.min(loop, 3) * 5 : 0);
    for (let n = 0, tries = 0; n < want && tries < 600; tries += 1) {
      const x = 14 + r() * (W - 28);
      const y = 30 + r() * 80;
      if (pathDist(paths, x, y) < 11) continue;
      if (room.props.some((p) => Math.hypot(p.x - x, p.y - y) < 16)) continue;
      if (room.trees.some((t) => Math.hypot(t.x - x, t.y - y) < 9)) continue;
      add(x, y, kind === 'phone' && loop >= 2 && r() < 0.35 ? { eyes: true } : null);
      n += 1;
    }
    room.ground = makeGround(r, paths);
    return room;
  }

  // The monitor in the last clearing is showing a terminal, of course.
  function drawScreen(b, t) {
    b.fillStyle = '#7a3a08';
    for (let i = 0; i < 3; i += 1) {
      const len = ((Math.floor(t * 3) + i * 5) % 9) + 2;
      b.fillRect(90, 46 + i * 2, len, 1);
    }
    if (Math.floor(t * 2) % 2) b.fillRect(90 + (((Math.floor(t * 3) + 10) % 9) + 2), 50, 1, 1);
  }

  function enterRoom(kind, loop, at, respawn) {
    const s = S;
    s.gen += 1;
    const key = kind + (kind === 'phone' ? Math.min(loop, 2) : '');
    if (!s.rooms[key]) s.rooms[key] = makeRoom(kind, kind === 'phone' ? Math.min(loop, 2) : 0);
    s.room = s.rooms[key];
    s.loop = loop;
    s.player.x = at.x;
    s.player.y = at.y;
    Object.assign(s.st, { on: false, show: false });
    s.blip = 1; // the picture tears as the feed jumps
    hiss(0.25, { freq: 2400, q: 0.5, vol: 0.12 });
    const ringing = kind === 'phone' && loop === 0 && !s.answered;
    if (ringing && !s.ringH) s.ringH = play('ring', { loop: true, vol: 0.2 });
    if (!ringing && s.ringH) {
      s.ringH.stop(0.1);
      s.ringH = null;
    }
    if (kind === 'monitor') {
      setVol(s.forestH, 0, 3);
      hum(true, 0.02);
    }
    task(BEATS[kind], loop, respawn);
  }

  function spawnFor(kind, loop) {
    if (kind === 'edge') return { x: 62, y: 108 };
    if (kind === 'phone' && loop === 0) return { x: 128, y: 114 };
    return { x: 56, y: 114 };
  }

  function goNorth() {
    const kind = S.room.kind;
    if (kind === 'edge') enterRoom('phone', 0, spawnFor('phone', 0));
    else if (S.inverted) enterRoom('monitor', 0, spawnFor('monitor', 0));
    else enterRoom('phone', S.loop + 1, spawnFor('phone', S.loop + 1));
  }

  function blocked(x, y) {
    const room = S.room;
    if (x < 5 || x > W - 5 || y > H - 3) return true;
    if (y < 14 && !(room.exitOpen && Math.abs(x - room.exitX) < 8)) return true;
    const hit = (b) => x + 1 > b[0] && x - 1 < b[2] && y > b[1] && y - 1 < b[3];
    return room.trees.some((t) => hit(t.box)) || room.props.some((p) => p.box && hit(p.box));
  }

  function stalkerHunt() {
    const s = S;
    const p = s.player;
    // the first time it comes from the far side; after that, from where you need to go
    const spots = s.loop >= 2 ? [[22, 32]] : [[24, 34], [168, 34], [24, 92], [168, 92]];
    spots.sort((a, b) => Math.hypot(b[0] - p.x, b[1] - p.y) - Math.hypot(a[0] - p.x, a[1] - p.y));
    const [x, y] = spots[0];
    Object.assign(s.st, { on: true, show: true, frozen: false, x, y, tick: -0.7, speed: clamp(9 + (s.loop - 1) * 2.5 - s.deaths * 2, 7, 16), nextTwig: s.time + 1.2 });
    play('twig', { pan: clamp((x - p.x) / 70, -1, 1), vol: 0.7 });
  }

  function update(dt) {
    const s = S;
    const p = s.player;
    const room = s.room;
    const st = s.st;
    s.time += dt;
    s.blip = Math.max(0, s.blip - dt * 2.5);

    let mx = (s.keys.right ? 1 : 0) - (s.keys.left ? 1 : 0);
    const my = (s.keys.down ? 1 : 0) - (s.keys.up ? 1 : 0);
    if (s.inverted) mx = -mx; // boots on the wrong feet
    p.moving = !s.lock && (mx !== 0 || my !== 0);
    if (p.moving) {
      const k = (30 * dt) / Math.hypot(mx, my);
      if (!blocked(p.x + mx * k, p.y)) p.x += mx * k;
      if (!blocked(p.x, p.y + my * k)) p.y += my * k;
      p.anim += dt;
      p.step += dt;
      if (p.step > 0.32) {
        p.step = 0;
        footstep();
      }
    }
    if (p.y < 5 && room.exitOpen) {
      goNorth();
      return;
    }
    if (!room.exitOpen && room.exitX != null && p.y < 24 && Math.abs(p.x - room.exitX) < 12 && s.time > s.nagAt) {
      s.nagAt = s.time + 8;
      task(line, L().ringing, 'w');
    }

    // what's within reach
    let near = null;
    if (!s.lock && !s.busy) {
      near = room.inter.find((it) => !it.done && (!it.when || it.when()) && Math.hypot(it.x - p.x, it.y - p.y) < it.r) || null;
    }
    hint(near ? L()[near.hint] : '');
    if (s.act) {
      s.act = false;
      if (near) {
        if (near.once) near.done = true;
        s.busy = true;
        task(near.fn).finally(() => {
          s.busy = false;
        });
      }
    }

    // the tall one moves like a stop-motion puppet: still, then a hop closer
    if (st.on && !st.frozen && !s.lock) {
      st.tick += dt;
      if (st.tick >= 0.3) {
        st.tick = 0;
        const dx = p.x - st.x;
        const dy = p.y - st.y;
        const d = Math.hypot(dx, dy) || 1;
        st.x += (dx / d) * st.speed * 0.3 + rnd(-1, 1);
        st.y += (dy / d) * st.speed * 0.3 + rnd(-0.6, 0.6);
        st.jx = Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0;
      }
    }
    const sd = Math.hypot(st.x - p.x, st.y - p.y);
    s.prox = st.show ? clamp(1 - (sd - 8) / 85, 0, 1) : 0;
    if (st.on && !s.lock && sd < 6) {
      task(death);
      return;
    }
    if (st.on && s.prox > 0.12 && s.time > st.nextTwig) {
      st.nextTwig = s.time + rnd(3, 7);
      play('twig', { vol: 0.25 + 0.6 * s.prox, pan: clamp((st.x - p.x) / 70, -1, 1) });
    }
    mix(dt);
    s.osdT -= dt;
    if (s.osdT <= 0) {
      s.osdT = 0.25;
      osd();
    }
  }

  // Sound follows the picture: static, whispers, the drone's tritone and your heartbeat rise as it closes in.
  function mix(dt) {
    const s = S;
    const A = s.audio;
    if (!A) return;
    const t = A.ctx.currentTime;
    const pr = s.prox;
    const p = s.player;
    if (s.staticH) s.staticH.g.gain.setTargetAtTime(Math.pow(pr, 1.6) * 0.08 + s.blip * 0.1, t, 0.06);
    if (s.whisperH) {
      s.whisperH.g.gain.setTargetAtTime(Math.pow(pr, 2) * 0.5, t, 0.2);
      if (s.whisperH.p) s.whisperH.p.pan.setTargetAtTime(clamp((s.st.x - p.x) / 70, -1, 1), t, 0.2);
    }
    if (s.droneH) s.droneH.tension.gain.setTargetAtTime(pr * 0.9, t, 0.4);
    if (s.ringH) {
      const d = Math.hypot(96 - p.x, 64 - p.y);
      s.ringH.g.gain.setTargetAtTime(0.12 + 0.8 * clamp(1 - d / 150, 0, 1), t, 0.1);
      if (s.ringH.p) s.ringH.p.pan.setTargetAtTime(clamp((96 - p.x) / 90, -0.9, 0.9), t, 0.1);
    }
    if (s.humH && s.room.kind === 'monitor') s.humH.g.gain.setTargetAtTime(0.02 + 0.06 * clamp(1 - Math.hypot(96 - p.x, 50 - p.y) / 100, 0, 1), t, 0.2);
    const bpm = pr > 0.12 ? 62 + pr * 100 : 0;
    s.beat += dt;
    if (bpm && s.beat >= 60 / bpm) {
      s.beat = 0;
      lubdub(0.18 + 0.4 * pr);
    }
  }

  function osd() {
    const s = S;
    const t = L();
    s.el.osdL.textContent = 'HELP.EXE · ' + t.vision + ' ' + (s.invertView ? t.negative : 9 + Math.floor(Math.random() * 5) + '%');
    s.el.osdR.textContent = t.pulse + ' ' + Math.round(66 + s.prox * 88 + Math.random() * 3);
  }

  function hint(text) {
    if (S.hintText === text) return;
    S.hintText = text;
    S.el.hint.textContent = text ? '[E] ' + text : '';
  }

  /* ---------------- drawing ---------------- */
  function render() {
    const s = S;
    const room = s.room;
    const b = s.bx;
    const sp = sprites();
    b.drawImage(room.ground, 0, 0);
    const items = room.trees.concat(room.dead, room.props);
    const p = s.player;
    const pf = p.moving ? 1 + (Math.floor(p.anim / 0.16) % 2) : 0;
    items.push({ c: sp.player[pf], x: p.x, y: p.y, ax: 2, ay: 10 });
    if (s.st.show) items.push({ c: sp.stalker[Math.floor(s.time * 3) % 2], x: s.st.x + s.st.jx, y: s.st.y, ax: 6, ay: 43 });
    items.sort((a, c) => a.y - c.y);
    for (const it of items) {
      const ox = it.shake && s.ringH ? (Math.random() < 0.5 ? -1 : 1) : 0; // the phone rattles on its stump
      b.drawImage(it.c, Math.round(it.x - it.ax + ox), Math.round(it.y - it.ay));
      if (it.draw) it.draw(b, s.time);
    }
    const img = b.getImageData(0, 0, W, H);
    shade(img.data);
    marks(img.data);
    post(img.data);
    s.fx.putImageData(img, 0, 0);
    blit();
  }

  // Darkness: everything past the light falls away through a 4×4 Bayer dither.
  function shade(d) {
    const s = S;
    const ls = [{ x: s.player.x, y: s.player.y - 5, r: 36 + Math.sin(s.time * 13) * 1.2 - (Math.random() < 0.04 ? 6 : 0) }].concat(s.room.lights);
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        let I = 0;
        for (let k = 0; k < ls.length; k += 1) {
          const l = ls[k];
          const dx = x - l.x;
          const dy = (y - l.y) * 1.2;
          const v = (l.r - Math.sqrt(dx * dx + dy * dy)) / (l.r * 0.5);
          if (v > I) I = v;
        }
        if (I >= 1) continue;
        const i = (y * W + x) * 4;
        if (I <= BAYER[((y & 3) << 2) | (x & 3)]) {
          d[i] = 0;
          d[i + 1] = 0;
          d[i + 2] = 0;
        } else {
          const k = 0.45 + 0.55 * I;
          d[i] *= k;
          d[i + 1] *= k;
          d[i + 2] *= k;
        }
      }
    }
  }

  // What shows through the dark anyway: its eyes. Later, the trees' eyes too.
  function marks(d) {
    const s = S;
    const st = s.st;
    const dot = (x, y, v) => {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = (y * W + x) * 4;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
    };
    if (st.show && s.time % 3.4 > 0.14) {
      const ex = st.x + st.jx;
      const ey = st.y - 42;
      dot(ex - 1, ey, 255);
      dot(ex + 1, ey, 255);
    }
    if (s.room.kind === 'phone' && s.loop >= 2 && !s.invertView) {
      for (const t of s.room.trees) {
        if (t.eyes && Math.hypot(t.x - s.player.x, t.y - s.player.y) > 30 && (s.time + t.x) % 5 > 0.2) {
          dot(t.x - 1, t.y - 12, 200);
          dot(t.x + 1, t.y - 12, 200);
        }
      }
    }
  }

  // The feed itself: snow and torn lines when it's near, a rolling bar, and the negative.
  function post(d) {
    const s = S;
    const n = Math.min(1, Math.max(s.blip, Math.pow(s.prox, 1.4) * 0.7) + (s.mode === 'zoom' ? s.zoom * 0.5 : 0));
    const inv = s.invertView;
    s.roll = (s.roll + 0.35) % (H + 30);
    for (let y = 0; y < H; y += 1) {
      const bar = Math.max(0, 4 - Math.abs(y - s.roll + 15)); // a soft band of brighter black, drifting down
      for (let x = 0; x < W; x += 1) {
        const i = (y * W + x) * 4;
        let r = d[i];
        let g = d[i + 1];
        let b = d[i + 2];
        if (n > 0 && Math.random() < n * 0.22) {
          r = 40 + Math.random() * 180 * n;
          g = r;
          b = r;
        }
        r += bar;
        g += bar;
        b += bar;
        if (inv) {
          r = 228 - r * 0.9;
          g = 224 - g * 0.9;
          b = 214 - b * 0.9;
        }
        d[i] = r;
        d[i + 1] = g;
        d[i + 2] = b;
      }
    }
    if (n > 0.15) {
      for (let k = 0; k < 1 + Math.floor(n * 4); k += 1) {
        if (Math.random() > n) continue;
        const y = Math.floor(Math.random() * H);
        const sh = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 3 * n + 1));
        const row = d.slice(y * W * 4, (y + 1) * W * 4);
        for (let x = 0; x < W; x += 1) {
          const from = ((x - sh + W) % W) * 4;
          const to = (y * W + x) * 4;
          d[to] = row[from];
          d[to + 1] = row[from + 1];
          d[to + 2] = row[from + 2];
        }
      }
    }
  }

  function blit() {
    const s = S;
    const c = s.cx;
    if (s.mode === 'zoom') {
      // closing in on the monitor's screen until it's all there is
      const z = 1 + Math.pow(s.zoom, 2.2) * 15;
      const sw = W / z;
      const sh = H / z;
      c.drawImage(s.fxCanvas, clamp(95.5 - sw / 2, 0, W - sw), clamp(47.5 - sh / 2, 0, H - sh), sw, sh, 0, 0, W, H);
      return;
    }
    const jx = s.blip > 0.3 && Math.random() < 0.5 ? (Math.random() < 0.5 ? -1 : 1) : 0;
    if (jx) {
      c.fillStyle = '#000';
      c.fillRect(0, 0, W, H);
    }
    c.drawImage(s.fxCanvas, jx, 0);
  }

  // Its face, drawn fresh every frame of the scare: a long pale face, black sockets, a mouth that keeps opening.
  function drawFace(cv, k) {
    const w = cv.width;
    const h = cv.height;
    const x = cv.getContext('2d');
    const img = x.createImageData(w, h);
    const d = img.data;
    const ej = Math.random() < 0.3 ? 1 : 0;
    const my0 = 50 + k * 5;
    const mry = 5 + k * 10;
    const mrx = 5 + k * 2;
    for (let y = 0; y < h; y += 1) {
      for (let i = 0; i < w; i += 1) {
        let c = [0, 0, 0];
        const nx = (i - 32) / 23;
        const ny = (y - 36) / 34;
        const r2 = nx * nx + ny * ny;
        if (r2 < 1) {
          const lit = 1 - r2 * 0.75 - Math.max(0, ny) * 0.25;
          const th = BAYER[((y & 3) << 2) | (i & 3)];
          c = lit > th * 0.9 + 0.1 ? [196, 188, 168] : lit > th * 0.5 ? [92, 86, 76] : [24, 22, 20];
          const ex = (Math.abs(i - 32) - 10 - ej) / 6.5;
          const ey = (y - 28) / 8;
          if (ex * ex + ey * ey < 1) c = [0, 0, 0];
          if (Math.abs(Math.abs(i - 32) - 10 - ej) < 1 && Math.abs(y - 29) < 1) c = [255, 255, 255];
          const mx = (i - 32) / mrx;
          const mm = (y - my0) / mry;
          if (mx * mx + mm * mm < 1) {
            c = mm > -0.2 && Math.abs(mx) < 0.5 ? [90, 6, 12] : [0, 0, 0];
            if (Math.abs(mm) > 0.78 && i % 2) c = [210, 204, 180]; // teeth along the lips
          }
        }
        const p = (y * w + i) * 4;
        [d[p], d[p + 1], d[p + 2]] = c;
        d[p + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
  }

  /* ---------------- screen ---------------- */
  function build(touch) {
    const root = document.createElement('div');
    root.id = 'hx';
    root.className = touch ? 'hx-touch' : '';
    root.tabIndex = -1;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'help.exe');
    root.innerHTML = `
      <div class="hx-pre" hidden><p class="hx-pre-title"></p><div class="hx-pre-text"></div><p class="hx-pre-key"></p></div>
      <div class="hx-crt" hidden>
        <div class="hx-term"></div>
        <div class="hx-view" hidden>
          <div class="hx-osd"><span></span><span></span></div>
          <canvas class="hx-cv" width="${W}" height="${H}"></canvas>
          <div class="hx-log"></div>
          <div class="hx-hint"></div>
        </div>
        <div class="hx-face" hidden><canvas width="64" height="72"></canvas></div>
        <div class="hx-fx"></div>
      </div>
      <div class="hx-pad" hidden>
        <div class="hx-dpad">
          <button type="button" data-dir="up" aria-label="up">↑</button>
          <button type="button" data-dir="left" aria-label="left">←</button>
          <button type="button" data-dir="right" aria-label="right">→</button>
          <button type="button" data-dir="down" aria-label="down">↓</button>
        </div>
        <button type="button" class="hx-act" aria-label="act">E</button>
      </div>
      <button type="button" class="hx-esc"></button>`;
    document.body.appendChild(root);
    return root;
  }

  function setMode(m) {
    const s = S;
    s.mode = m;
    s.el.term.hidden = m !== 'term';
    s.el.view.hidden = m !== 'forest' && m !== 'zoom';
    s.el.pad.hidden = !(s.touch && m === 'forest');
    if (!s.el.view.hidden) fit();
  }

  // Biggest whole-number scale of the 192×120 picture that leaves room for the terminal lines.
  function fit() {
    const s = S;
    if (!s) return;
    const fs = parseFloat(getComputedStyle(s.root).fontSize) || 14;
    const portraitPad = s.touch && window.innerHeight > window.innerWidth ? 200 : 0;
    const availW = Math.min(window.innerWidth - 32, 1180);
    const availH = window.innerHeight - fs * 10.5 - 60 - portraitPad - (s.touch ? 32 : 0);
    let k = Math.min(availW / W, availH / H);
    if (k >= 2) k = Math.floor(k);
    k = Math.max(1, k);
    s.el.cv.style.width = Math.round(W * k) + 'px';
    s.el.cv.style.height = Math.round(H * k) + 'px';
    s.el.view.style.setProperty('--hx-w', Math.round(W * k) + 'px');
  }

  async function type(text, cls, o) {
    o = o || {};
    const s = S;
    const box = s.mode === 'term' ? s.el.term : s.el.log;
    const row = document.createElement('div');
    row.className = 'hx-line' + (cls ? ' hx-' + cls : '');
    box.appendChild(row);
    if (box === s.el.log) while (box.children.length > 6) box.firstChild.remove();
    const gen = s.gen;
    const delay = 1000 / (o.cps || 30);
    s.typing = true;
    try {
      for (let i = 1; i <= text.length; i += 1) {
        if (s.skip || s.gen !== gen) {
          row.textContent = text;
          break;
        }
        row.textContent = text.slice(0, i);
        if (!o.silent && text[i - 1] !== ' ') tick();
        await wait(delay);
      }
    } finally {
      s.typing = false;
      s.skip = false;
    }
    box.scrollTop = box.scrollHeight;
    return row;
  }

  // A line of the story in the forest's terminal strip.
  const line = (text, cls, prefix) => type((prefix == null ? '> ' : prefix) + text, cls, { cps: 30 });

  const fill = (t) => (t || '').split('{N}').join(S.name);

  // The thing on the line speaks: the text types out in step with its voice.
  async function say(entry, voice, o) {
    o = o || {};
    const text = (o.prefix == null ? '> ' : o.prefix) + fill(entry.t);
    const v = speak(entry, voice);
    const cps = v.dur ? clamp(text.length / v.dur, 6, 40) : o.cps || 24;
    await type(text, o.cls || 'w', { cps, silent: !!v.dur });
    await v.done;
  }

  async function ask(entry, voice) {
    const s = S;
    const t = L();
    await say(entry, voice);
    const box = s.mode === 'term' ? s.el.term : s.el.log;
    const row = document.createElement('div');
    row.className = 'hx-line hx-o hx-choice';
    row.innerHTML = `<button type="button" data-a="1">[${t.yesKey}] ${t.yes}</button> <button type="button" data-a="0">[${t.noKey}] ${t.no}</button>`;
    box.appendChild(row);
    beep(880, 0.06);
    const yes = await new Promise((resolve) => {
      s.answer = resolve;
      row.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => resolve(b.dataset.a === '1')));
    });
    s.answer = null;
    row.className = 'hx-line hx-d';
    row.textContent = '  ' + (yes ? t.yes : t.no);
    beep(yes ? 1200 : 600, 0.05);
    return yes;
  }

  async function askName() {
    const s = S;
    const row = document.createElement('div');
    row.className = 'hx-line hx-w';
    row.innerHTML = '&gt; <input class="hx-input" type="text" maxlength="14" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="done" aria-label="name"> <button type="button" class="hx-ok">OK</button>';
    s.el.term.appendChild(row);
    const input = row.querySelector('input');
    s.el.input = input;
    setTimeout(() => {
      try {
        input.focus({ preventScroll: true });
      } catch (_) {
        input.focus();
      }
    }, 30);
    const raw = await new Promise((resolve) => {
      s.submitName = () => resolve(input.value);
      row.querySelector('.hx-ok').addEventListener('click', () => resolve(input.value));
    });
    s.submitName = null;
    s.el.input = null;
    const name = raw.replace(/[^0-9A-Za-zА-Яа-яЁё -]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14).toUpperCase() || L().friend;
    row.textContent = '> ' + name;
    s.root.focus({ preventScroll: true });
    beep(1200, 0.05);
    return name;
  }

  async function crtOff() {
    const crt = S.el.crt;
    crtOffSound();
    crt.classList.remove('hx-on');
    crt.classList.add('hx-off');
    await wait(460);
    crt.hidden = true;
    crt.classList.remove('hx-off');
  }

  async function powerOn() {
    const crt = S.el.crt;
    await wait(crtOnSound() * 1000);
    crt.hidden = false;
    crt.classList.add('hx-on');
    hum(true);
    await wait(650);
    crt.classList.remove('hx-on');
  }

  async function jumpscare(ms) {
    const face = S.el.face;
    const cv = face.firstElementChild;
    sting(ms / 1000 + 0.25);
    face.hidden = false;
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      drawFace(cv, Math.min(1, (performance.now() - t0) / ms + Math.random() * 0.3));
      if (!S.calm) cv.style.transform = `translate(${rnd(-12, 12)}px, ${rnd(-8, 8)}px) scale(${rnd(1, 1.18)})`;
      await wait(70);
    }
    face.hidden = true;
  }

  /* ---------------- the story ---------------- */
  async function run() {
    const loading = preload();
    await blackout();
    await warning();
    await Promise.race([loading, wait(4000)]);
    await powerOn();
    await intro();
    await forest();
    await ending();
    finish();
  }

  function preload() {
    const s = S;
    const jobs = [loadSam().then((Sam) => (s.sam = Sam))];
    if (s.audio) jobs.push(loadSounds(s.audio));
    if (document.fonts && document.fonts.load) jobs.push(document.fonts.load('16px "HX Press Start"').catch(() => {}));
    return Promise.all(jobs);
  }

  // The desktop's picture collapses to a line, then a dot, then nothing.
  async function blackout() {
    const html = document.documentElement;
    crtOffSound();
    html.classList.add('hx-collapse');
    await wait(430);
    S.root.classList.add('hx-black');
    html.classList.add('hx-hidden');
    await wait(1500);
  }

  async function warning() {
    const s = S;
    const t = L();
    const pre = s.el.pre;
    pre.querySelector('.hx-pre-title').textContent = t.warnTitle;
    pre.querySelector('.hx-pre-text').innerHTML = t.warn.map((w) => `<p>${w}</p>`).join('');
    pre.querySelector('.hx-pre-key').textContent = s.touch ? t.anyTap : t.anyKey;
    pre.hidden = false;
    await new Promise((resolve) => {
      s.anyKey = resolve;
    });
    pre.hidden = true;
    await wait(600);
  }

  async function intro() {
    const s = S;
    const t = L();
    setMode('term');
    await type(t.boot[0], 'o', { cps: 60 });
    await type(t.boot[1], 'd', { cps: 80 });
    await type('', '');
    await type(t.mem, 'o', { cps: 50 });
    beep(1000, 0.08);
    const dial = await type(t.dial, 'o', { cps: 50 });
    await wait(modem() * 1000);
    dial.textContent += t.found;
    beep(1200, 0.05);
    for (const l of t.link) await type(l, 'o', { cps: 60 });
    await type(t.sensors, 'r', { cps: 60 });
    await type('', '');
    await wait(1800);
    drone(true);
    const yes = await ask(t.hear, 'it');
    await say(yes ? t.hearYes : t.hearNo, 'it');
    await wait(700);
    await say(t.askName, 'it');
    s.name = await askName();
    s.nameLat = translit(s.name) || 'friend';
    s.namePh = (s.sam && s.sam.convert && s.sam.convert(s.nameLat)) || '';
    await say(t.remember, 'it');
    await wait(900);
    for (const l of t.lost) await type('> ' + l, 'w', { cps: 26 });
    await wait(400);
    await say(t.lead, 'it');
    await wait(1200);
  }

  function forest() {
    const s = S;
    return new Promise((resolve) => {
      s.reachedLight = resolve;
      hum(false);
      setMode('forest');
      osd();
      const amb = s.audio && s.audio.amb;
      s.forestH = play('forest', { loop: true, vol: 0, bus: amb, lowpass: 2600 });
      setVol(s.forestH, 0.42, 1.5);
      s.whisperH = play('whispers', { loop: true, vol: 0, bus: amb });
      s.staticH = noiseLayer(2600, 0.6, 0);
      enterRoom('edge', 0, spawnFor('edge', 0));
      s.last = performance.now();
      s.raf = requestAnimationFrame(frame);
    });
  }

  function frame(now) {
    const s = S;
    if (!s || s.dead) return;
    const dt = Math.min(0.05, Math.max(0, (now - s.last) / 1000));
    s.last = now;
    if (s.mode === 'forest' && !s.dying) update(dt);
    if (s.mode === 'zoom') s.zoom = Math.min(1, s.zoom + dt / 2.6);
    if (S === s && (s.mode === 'forest' || s.mode === 'zoom')) render();
    if (S === s) s.raf = requestAnimationFrame(frame);
  }

  // What each clearing says when you walk in.
  const BEATS = {
    async edge() {
      await rwait(700);
      await line(L().edge, 'w');
      await rwait(500);
      await line(S.touch ? L().ctlTouch : L().ctlKeys, 'd', '');
    },
    async phone(loop, respawn) {
      const t = L();
      if (respawn) {
        await rwait(1600);
        stalkerHunt();
        return;
      }
      if (loop === 0) {
        await rwait(900);
        await line(t.phoneHere, 'w');
        await rwait(4200);
        await line(t.noWayBack, 'w');
        return;
      }
      await rwait(700);
      await line(t.again[Math.min(loop, 3) - 1], 'w');
      await rwait(loop === 1 ? 1800 : 1100);
      stalkerHunt();
      if (loop === 1) {
        await line(t.keepAway, 'r');
      } else {
        await rwait(1400);
        await line(loop >= 3 ? t.readIt : t.white, 'w');
      }
    },
    async monitor() {
      await rwait(900);
      await line(L().quiet, 'w');
      await rwait(2600);
      await line(L().light, 'w');
      // walk up to it
      while (Math.hypot(S.player.x - 96, S.player.y - 58) > 16) await rwait(100);
      S.reachedLight();
    },
  };

  async function answerPhone() {
    const s = S;
    const t = L();
    s.lock = true;
    s.answered = true;
    if (s.ringH) {
      s.ringH.stop(0.03);
      s.ringH = null;
    }
    play('pickup', { vol: 0.9 });
    const lineHiss = noiseLayer(1500, 0.4, 0.025);
    try {
      await rwait(1000);
      await say(t.call[0], 'phone', { prefix: '» ' });
      await rwait(800);
      await say(t.call[1], 'deep', { cls: 'r', prefix: '» ' });
      await rwait(300);
    } finally {
      stopLayer(lineHiss, 0.05);
    }
    await rwait(busy(4) * 1000);
    play('hangup', { vol: 0.8 });
    s.lock = false;
    await rwait(600);
    await line(t.notMe, 'w');
    // it was standing at the edge of the clearing the whole time
    Object.assign(s.st, { show: true, on: false, x: 12, y: 46, jx: 0 });
    play('twig', { pan: -0.85, vol: 0.9 });
    await rwait(4500);
    s.st.show = false;
    await rwait(700);
    s.room.trees = s.room.trees.filter((tr) => !tr.gate);
    s.room.exitOpen = true;
    play('twig', { pan: -0.3, vol: 0.5, rate: 0.6 });
    s.blip = 0.6;
    await line(t.parted, 'w');
  }

  async function listenPhone() {
    const t = L();
    for (let i = 0; i < 3; i += 1) hiss(1.4, { freq: 900, q: 0.5, vol: 0.05, attack: 1.0, at: i * 1.8 });
    speak(t.whisper, 'whisper');
    await line(t.breathing, 'w');
  }

  async function readNote() {
    const s = S;
    const t = L();
    s.st.frozen = true; // it waits while you read. It's patient.
    try {
      await line(t.note, 'p', '');
      if (await ask(t.invert, 'it')) await invert();
      else await line(t.asYouSay, 'w');
    } finally {
      s.st.frozen = false;
    }
  }

  async function invert() {
    const s = S;
    const t = L();
    s.lock = true;
    hiss(1.3, { freq: 160, sweep: 5200, q: 1.1, vol: 0.22, attack: 1.15 });
    tone(55, 1.4, { type: 'sine', slide: 30, vol: 0.6, at: 1.2, attack: 0.005, hold: 0.3 });
    speak(SCREAM, 'scream');
    // three slow flips between the two worlds — kept under three a second
    for (let i = 0; i < 3; i += 1) {
      s.invertView = !s.invertView;
      s.blip = 0.8;
      await rwait(420);
    }
    s.invertView = true;
    s.inverted = true;
    Object.assign(s.st, { on: false, show: false });
    s.lock = false;
    await line(t.inverted, 'r');
    await rwait(600);
    await line(t.goNorth, 'w');
  }

  async function death() {
    const s = S;
    if (s.dying) return;
    s.dying = true;
    s.gen += 1; // whatever the clearing was saying, it's over
    const where = { x: s.player.x, y: s.player.y };
    const room = s.room;
    const loop = s.loop;
    s.st.on = false;
    s.st.show = false;
    s.prox = 0;
    s.keys = {};
    setVol(s.forestH, 0, 0.1);
    setVol(s.whisperH, 0, 0.1);
    setVol(s.staticH, 0, 0.1);
    await jumpscare(700);
    setMode('term');
    s.el.term.textContent = '';
    for (const [text, c] of L().diag) {
      if (c === 'r') beep(text[0] === '!' ? 1000 : 760, 0.09, 0.045);
      else beep(520, 0.06, 0.035);
      await type(text, c, { cps: 140, silent: true });
      await wait(text[0] === '!' || text[0] === '-' ? 280 : 90);
    }
    tone(1000, 1.9, { type: 'sine', vol: 0.05, hold: 0.95 }); // flatline
    await wait(1900);
    await crtOff();
    await wait(1300);
    room.dead.push({ c: sprites().dead, x: where.x, y: where.y, ax: 4, ay: 18 }); // no collision: it's just you
    s.deaths += 1;
    s.el.term.textContent = '';
    await powerOn();
    await type(L().reconnect[0], 'o', { cps: 40 });
    await wait(500);
    await type(L().reconnect[1], 'o', { cps: 40 });
    await wait(900);
    hum(false);
    setMode('forest');
    setVol(s.forestH, 0.42, 0.8);
    s.dying = false;
    enterRoom(room.kind, loop, spawnFor(room.kind, loop), true);
    task(async () => {
      await rwait(1200);
      await line(L().tree[s.deaths === 1 ? 0 : 1], 'w');
    });
  }

  async function ending() {
    const s = S;
    const t = L();
    s.lock = true;
    s.zoom = 0;
    s.mode = 'zoom';
    hint('');
    hiss(2.6, { freq: 300, sweep: 4000, q: 0.7, vol: 0.12, attack: 2.4 });
    await wait(2700);
    cancelAnimationFrame(s.raf);
    setMode('term');
    s.el.term.textContent = '';
    setVol(s.staticH, 0, 0.2);
    setVol(s.whisperH, 0, 0.2);
    await wait(800);
    await type(t.clean, 'o', { cps: 30 });
    await wait(900);
    await say(t.thanks, 'it');
    await wait(1100);
    await say(t.room, 'it');
    await wait(700);
    const now = new Date();
    const hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    await type('> ' + t.time.replace('{T}', hhmm), 'w', { cps: 22 });
    await wait(600);
    const h = now.getHours();
    await type('> ' + (h >= 22 || h < 6 ? t.late : t.dusk), 'w', { cps: 22 });
    await wait(1600);
    hum(false);
    drone(false); // then nothing at all
    await wait(1800);
    await say(t.turn, 'last', { cls: 'r', cps: 9 });
    await wait(2400);
    await jumpscare(1100);
    s.el.crt.hidden = true;
    await wait(2200);
    await wait(crtOnSound(0.5) * 1000);
  }

  /* ---------------- start / stop ---------------- */
  function termPrint(text, cls) {
    if (window.XP.termPrint) window.XP.termPrint(text, cls);
  }

  function teardown(audioTail) {
    const s = S;
    if (!s) return;
    s.dead = true;
    S = null;
    cancelAnimationFrame(s.raf);
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('keyup', onKey, true);
    window.removeEventListener('resize', fit);
    window.removeEventListener('blur', onBlur);
    document.removeEventListener('visibilitychange', onVisibility);
    if (s.audio) setTimeout(() => audioClose(s.audio), audioTail || 0);
    s.root.remove();
    const html = document.documentElement;
    html.classList.remove('hx-collapse', 'hx-hidden');
    html.classList.add('hx-expand');
    setTimeout(() => html.classList.remove('hx-expand'), 700);
    const input = document.getElementById('term-input');
    if (input && !s.touch) input.focus({ preventScroll: true });
  }

  function quit() {
    if (!S) return;
    const t = L();
    teardown(0);
    termPrint('^C');
    termPrint(t.aborted);
  }

  function finish() {
    const t = L();
    const name = S.name.toLowerCase();
    teardown(2600);
    termPrint(t.closed);
    clearTimeout(ghostTimer);
    // ...and a little later, once you've stopped expecting anything
    ghostTimer = setTimeout(() => {
      if (!S) termPrint(t.ghost.replace('{n}', name), 'term-ghost');
    }, 25000);
  }

  function anyKey() {
    const s = S;
    const resolve = s.anyKey;
    s.anyKey = null;
    // still inside the key/tap handler: the moment Safari allows sound to start
    if (s.audio && s.audio.ctx.state !== 'running') s.audio.ctx.resume().catch(() => {});
    resolve();
  }

  function onKey(e) {
    const s = S;
    if (!s) return;
    e.stopPropagation(); // the desktop's games and dialogs never see these keys
    const down = e.type === 'keydown';
    if (/^F\d+$/.test(e.key) || e.ctrlKey || e.metaKey) return; // reload, devtools and friends stay the browser's
    if (s.el.input && e.target === s.el.input) {
      if (down && e.key === 'Enter') {
        e.preventDefault();
        if (s.submitName) s.submitName();
      } else if (down && e.key === 'Escape') {
        e.preventDefault();
        quit();
      }
      return;
    }
    e.preventDefault();
    const dir = MOVE_KEYS[e.code];
    if (dir) s.keys[dir] = down;
    if (!down) return;
    if (e.key === 'Escape') {
      quit();
      return;
    }
    if (e.repeat) return;
    if (s.anyKey) {
      anyKey();
      return;
    }
    if (s.answer) {
      const t = L();
      const k = (e.key || '').toUpperCase();
      // by key position (KeyL is Д, KeyY is Н on a Russian layout) or by the letter itself
      const yesCode = s.lang === 'ru' ? 'KeyL' : 'KeyY';
      const noCode = s.lang === 'ru' ? 'KeyY' : 'KeyN';
      if (e.code === yesCode || k === t.yesKey) s.answer(true);
      else if (e.code === noCode || k === t.noKey) s.answer(false);
      return;
    }
    if (s.mode === 'term') {
      if (s.typing) s.skip = true;
      return;
    }
    if (s.mode === 'forest' && ACT_KEYS.has(e.code)) s.act = true;
  }

  function onBlur() {
    if (S) S.keys = {};
  }

  function onVisibility() {
    const A = S && S.audio;
    if (!A) return;
    if (document.hidden) {
      S.keys = {};
      A.ctx.suspend().catch(() => {});
    } else {
      A.ctx.resume().catch(() => {});
    }
  }

  function wire(root) {
    const s = S;
    root.querySelector('.hx-esc').addEventListener('click', quit);
    root.querySelectorAll('.hx-dpad button').forEach((btn) => {
      const set = (v) => (e) => {
        if (!S) return;
        e.preventDefault();
        S.keys[btn.dataset.dir] = v;
        btn.classList.toggle('on', v);
        if (v) {
          try {
            btn.setPointerCapture(e.pointerId);
          } catch (_) {
            /* not capturable */
          }
        }
      };
      btn.addEventListener('pointerdown', set(true));
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => btn.addEventListener(ev, set(false)));
    });
    const act = root.querySelector('.hx-act');
    act.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!S) return;
      S.act = true;
      act.classList.add('on');
      setTimeout(() => act.classList.remove('on'), 150);
    });
    root.addEventListener('pointerdown', (e) => {
      if (!S || (e.target.closest && e.target.closest('button, input'))) return;
      if (S.anyKey) anyKey();
      else if (S.mode === 'term' && S.typing) S.skip = true;
    });
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    window.addEventListener('resize', fit);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    const esc = root.querySelector('.hx-esc');
    esc.textContent = s.touch ? L().quitTap : L().quitKey;
  }

  function start() {
    if (S) return;
    const lang = window.XP.lang() === 'en' ? 'en' : 'ru';
    const touch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    clearTimeout(ghostTimer);
    S = {
      lang,
      touch,
      calm: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
      dead: false,
      gen: 0,
      mode: 'none',
      keys: {},
      rooms: {},
      player: { x: 0, y: 0, anim: 0, step: 0, moving: false },
      st: { on: false, show: false, x: 0, y: 0, jx: 0, tick: 0, speed: 9, nextTwig: 0 },
      time: 0,
      blip: 0,
      prox: 0,
      beat: 0,
      roll: 0,
      osdT: 0,
      nagAt: 0,
      loop: 0,
      deaths: 0,
      name: TXT[lang].friend,
      nameLat: 'friend',
      namePh: '',
      sam: null,
    };
    S.audio = audioInit();
    const root = build(touch);
    S.root = root;
    S.el = {
      pre: root.querySelector('.hx-pre'),
      crt: root.querySelector('.hx-crt'),
      term: root.querySelector('.hx-term'),
      view: root.querySelector('.hx-view'),
      osdL: root.querySelector('.hx-osd span:first-child'),
      osdR: root.querySelector('.hx-osd span:last-child'),
      cv: root.querySelector('.hx-cv'),
      log: root.querySelector('.hx-log'),
      hint: root.querySelector('.hx-hint'),
      face: root.querySelector('.hx-face'),
      pad: root.querySelector('.hx-pad'),
      input: null,
    };
    S.cx = S.el.cv.getContext('2d');
    S.cx.imageSmoothingEnabled = false;
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    S.bx = off.getContext('2d', { willReadFrequently: true });
    S.fxCanvas = document.createElement('canvas');
    S.fxCanvas.width = W;
    S.fxCanvas.height = H;
    S.fx = S.fxCanvas.getContext('2d');
    wire(root);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    root.focus({ preventScroll: true });
    run().catch((e) => {
      if (e === ABORT || e === STALE) return;
      console.error(e);
      quit();
    });
  }

  window.XP.horror = { start };
})();
