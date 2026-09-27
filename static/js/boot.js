'use strict';

/* =========================================================
   Power cycle for the desktop: a 90s PC cold boot (BIOS POST with fan,
   hard-drive and floppy noises, the POST beep) → the Windows XP loading
   screen → the XP "welcome" screen with its chime → the desktop.

   Sounds come from static/sounds/ (pc-boot, xp-startup, xp-shutdown —
   .mp3/.ogg/.wav/.m4a); api/index.py lists whichever exist in site data.
   Any that's missing is synthesized with the Web Audio API instead, on the
   same cues, so the sequence works with or without the files.

   Browsers only allow sound after the user has clicked on the page, which
   is why a shutdown ends on a "powered off" screen with a power button
   (that click is what unlocks audio for the boot that follows), while a
   restart runs straight through — the click on "Restart" already did.
   ========================================================= */
(function () {
  const t = (ru, en) => window.XP.t(ru, en);
  const SOUND_FILES = (window.XP.data && window.XP.data.sounds) || {};

  /* ---------------- audio ---------------- */
  let ctx = null;
  let master = null;
  let reverb = null;
  let noiseBuf = null;
  const stoppers = new Set(); // everything that's still making noise, so a skip can silence it

  function unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function noise() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  function reverbIn() {
    if (!reverb) {
      reverb = ctx.createConvolver();
      const len = ctx.sampleRate * 2.4;
      const ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch += 1) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
      reverb.buffer = ir;
      const wet = ctx.createGain();
      wet.gain.value = 0.35;
      reverb.connect(wet).connect(master);
    }
    return reverb;
  }

  // group: 'hw' (the PC's own noises — cut when the desktop shows) or
  // 'chime' (the XP startup sound — allowed to ring on over the desktop).
  function playFile(key, volume, group) {
    const url = SOUND_FILES[key];
    if (!url) return null;
    const a = new Audio(url);
    a.volume = volume == null ? 1 : volume;
    a.play().catch(() => {});
    const stop = () => {
      a.pause();
      stoppers.delete(stop);
    };
    stop.audio = a;
    stop.group = group || 'hw';
    stop.fade = (sec) => {
      const from = a.volume;
      const t0 = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / (sec * 1000));
        a.volume = from * (1 - k);
        if (k < 1) requestAnimationFrame(step);
        else stop();
      };
      step();
    };
    stoppers.add(stop);
    return stop;
  }

  // PC-speaker POST beep: one short square-wave beep means "all good".
  function beep() {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = 1000;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.09, t0 + 0.004);
    g.gain.setValueAtTime(0.09, t0 + 0.17);
    g.gain.linearRampToValueAtTime(0, t0 + 0.18);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + 0.2);
  }

  // Case fan + hard drive spinning up (a rising motor whine), left humming.
  let hum = null;
  function humStart() {
    if (!ctx || hum) return;
    const t0 = ctx.currentTime;
    const fan = ctx.createBufferSource();
    fan.buffer = noise();
    fan.loop = true;
    const fanLp = ctx.createBiquadFilter();
    fanLp.type = 'lowpass';
    fanLp.frequency.value = 420;
    const fanG = ctx.createGain();
    fanG.gain.setValueAtTime(0, t0);
    fanG.gain.linearRampToValueAtTime(0.5, t0 + 1.4);
    fan.connect(fanLp).connect(fanG).connect(master);

    const motor = ctx.createOscillator();
    motor.type = 'sawtooth';
    motor.frequency.setValueAtTime(25, t0);
    motor.frequency.exponentialRampToValueAtTime(120, t0 + 4);
    const motorLp = ctx.createBiquadFilter();
    motorLp.type = 'lowpass';
    motorLp.frequency.value = 500;
    const motorG = ctx.createGain();
    motorG.gain.setValueAtTime(0, t0);
    motorG.gain.linearRampToValueAtTime(0.05, t0 + 0.6);
    motorG.gain.linearRampToValueAtTime(0.028, t0 + 5);
    motor.connect(motorLp).connect(motorG).connect(master);

    const whine = ctx.createOscillator();
    whine.type = 'sine';
    whine.frequency.setValueAtTime(180, t0);
    whine.frequency.exponentialRampToValueAtTime(1800, t0 + 4);
    const whineG = ctx.createGain();
    whineG.gain.setValueAtTime(0, t0);
    whineG.gain.linearRampToValueAtTime(0.012, t0 + 1.2);
    whineG.gain.linearRampToValueAtTime(0.004, t0 + 6);
    whine.connect(whineG).connect(master);

    [fan, motor, whine].forEach((n) => n.start(t0));
    hum = { sources: [fan, motor, whine], gains: [fanG, motorG, whineG] };
    const stop = (sec) => {
      if (!hum) return;
      const h = hum;
      hum = null;
      stoppers.delete(stop);
      const now = ctx.currentTime;
      const fade = sec || 0.05;
      h.gains.forEach((g) => {
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.linearRampToValueAtTime(0, now + fade);
      });
      h.sources.forEach((s) => s.stop(now + fade + 0.05));
    };
    hum.stop = stop;
    stoppers.add(stop);
  }
  function humStop(sec) {
    if (hum) hum.stop(sec);
  }

  // Hard-drive head seeks: a few short, bright ticks.
  function seek(count) {
    if (!ctx) return;
    let tt = ctx.currentTime;
    for (let i = 0; i < (count || 3); i += 1) {
      tt += 0.03 + Math.random() * 0.09;
      const src = ctx.createBufferSource();
      src.buffer = noise();
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1600 + Math.random() * 1600;
      bp.Q.value = 2.2;
      const g = ctx.createGain();
      const len = 0.02 + Math.random() * 0.025;
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(0.9, tt + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + len);
      src.connect(bp).connect(g).connect(master);
      src.start(tt, Math.random() * 1.5, len + 0.02);
    }
  }

  // Floppy drive seek test: the stepper motor's buzzy grind, out and back.
  function floppy() {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(62, t0);
    o.frequency.setValueAtTime(96, t0 + 0.34);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 850;
    bp.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.16, t0 + 0.02);
    g.gain.setValueAtTime(0.16, t0 + 0.3);
    g.gain.linearRampToValueAtTime(0.02, t0 + 0.33);
    g.gain.linearRampToValueAtTime(0.16, t0 + 0.36);
    g.gain.setValueAtTime(0.16, t0 + 0.62);
    g.gain.linearRampToValueAtTime(0, t0 + 0.66);
    o.connect(bp).connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + 0.7);
  }

  // A soft pad + bell arpeggio in the spirit of the XP chimes (not a copy of them).
  function chime(kind) {
    if (playFile(kind === 'startup' ? 'xp_startup' : 'xp_shutdown', 0.9, 'chime')) return;
    if (!unlock()) return;
    const t0 = ctx.currentTime + 0.05;
    const up = kind === 'startup';
    const pad = up ? [155.56, 233.08, 392.0] : [207.65, 311.13, 392.0];
    const bells = up ? [392.0, 466.16, 622.25, 783.99, 932.33] : [783.99, 622.25, 466.16, 311.13];
    const voice = (freq, start, dur, gain, attack, type) => {
      const o = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      o.type = type;
      o2.type = 'sine';
      o.frequency.value = freq;
      o2.frequency.value = freq * 1.003;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2600;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(gain, start + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(lp);
      o2.connect(lp);
      lp.connect(g);
      g.connect(master);
      g.connect(reverbIn());
      o.start(start);
      o2.start(start);
      o.stop(start + dur + 0.05);
      o2.stop(start + dur + 0.05);
    };
    pad.forEach((f) => voice(f, t0, up ? 3.6 : 2.8, 0.05, 0.5, 'triangle'));
    bells.forEach((f, i) => voice(f, t0 + 0.15 + i * (up ? 0.2 : 0.24), i === bells.length - 1 ? 2.6 : 1.4, 0.07, 0.015, 'sine'));
  }

  /* ---------------- screens ---------------- */
  let root = null;
  function el(sel) {
    return root.querySelector(sel);
  }

  function build() {
    if (root) return root;
    root = document.createElement('div');
    root.id = 'nd-boot';
    root.hidden = true;
    root.innerHTML = `
      <div class="boot-stage boot-post" hidden>
        <img class="boot-post-logo" src="/static/img/energy-star.png" alt="" hidden>
        <pre class="boot-post-text"></pre>
        <pre class="boot-post-foot"></pre>
      </div>
      <div class="boot-stage boot-xp" hidden>
        <div class="boot-xp-logo">
          <svg width="96" height="96" aria-hidden="true"><use href="#ico-winflag"></use></svg>
          <div class="xp-screen-brand"><span>Anton Vasiliev</span><b>Windows<sup>xp</sup></b></div>
        </div>
        <div class="boot-xp-bar"><div class="boot-xp-blocks"><i></i><i></i><i></i></div></div>
        <div class="boot-xp-copy">Copyright © Anton Vasiliev</div>
        <div class="boot-xp-brand">BlazeStudio</div>
      </div>
      <div class="boot-stage boot-welcome" hidden>
        <div class="xp-screen-band"></div>
        <div class="xp-screen-mid boot-welcome-mid"><span class="boot-welcome-text"></span></div>
        <div class="xp-screen-band"></div>
      </div>
      <div class="boot-stage boot-off" hidden>
        <button type="button" class="boot-power"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.6 7.4a6.2 6.2 0 1 0 8.8 0M12 4v7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>
        <div class="boot-off-hint"></div>
      </div>
      <div class="boot-crt" hidden></div>
      <button type="button" class="boot-skip" hidden></button>`;
    document.body.appendChild(root);
    el('.boot-skip').addEventListener('click', skip);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && run && !root.hidden) {
        e.preventDefault();
        skip();
      }
    });
    return root;
  }

  function stage(name) {
    root.querySelectorAll('.boot-stage').forEach((s) => (s.hidden = !s.classList.contains('boot-' + name)));
  }

  /* ---------------- sequence ---------------- */
  let run = null;

  function sleep(ms) {
    return new Promise((resolve) => {
      const id = setTimeout(resolve, ms);
      if (run) run.timers.push(id);
    });
  }

  function pad(s, n) {
    return (s + ' '.repeat(n)).slice(0, n);
  }

  function configTable() {
    const rows = [
      ['CPU Type', 'ANTON-III', 'Base Memory', '640K'],
      ['Co-Processor', 'Coffee x2', 'Extended Memory', '523264K'],
      ['CPU Clock', '3+ years', 'Cache Memory', '512K'],
      ['Diskette Drive A', '1.44M, 3.5 in.', 'Display Type', 'EGA/VGA'],
      ['Diskette Drive B', 'None', 'Serial Port(s)', '3F8 2F8'],
      ['Pri. Master Disk', 'PYTHON, 3000MB', 'Parallel Port(s)', '378'],
      ['Pri. Slave  Disk', 'DATA, 2000MB', 'Frameworks', 'Django, FastAPI'],
      ['Sec. Master Disk', 'CDROM, Mode 4', 'Domain', 'FinTech/InsurTech'],
      ['Sec. Slave  Disk', 'None', 'Status', 'Open to offers'],
    ];
    const inner = 74;
    const line = (s) => '║' + pad(s, inner) + '║';
    const out = [
      '╔' + '═'.repeat(inner) + '╗',
      line(pad('', 13) + 'System Configurations  (C) Copyright 1998-' + new Date().getFullYear() + ', BlazeStudio'),
      '╠' + '═'.repeat(inner) + '╣',
      ...rows.map(([a, b, c, d]) => line(' ' + pad(a, 17) + ': ' + pad(b, 17) + '│ ' + pad(c, 16) + ': ' + d)),
      '╚' + '═'.repeat(inner) + '╝',
    ];
    return out.join('\n');
  }

  /* The timeline is pinned to the recorded boot track (static/sounds/pc-boot.mp3):
     power-on + fan/HDD spin-up 0.5–2.5 s, the POST beep at ~3.7 s, the floppy
     seek and its clunk 6.4–7.3 s, then the hard drive churning 9–17 s. The
     screens hit those marks — memory finishes counting right on the beep,
     the configuration table lands on the clunk, XP loads over the disk
     activity. Without the file the synthesized noises fire on the same cues. */
  const CUE = {
    monitorOn: 0.9,
    cpu: 1.4,
    memStart: 1.6,
    memEnd: 3.62,
    beep: 3.68,
    pnp: 4.1,
    drives: [4.5, 5.05, 5.6, 6.15],
    floppy: 6.4,
    table: 7.2,
    dmi: 8.5,
    bootHdd: 9.4,
    xpOn: 10.2,
    xpOff: 15.9,
    welcome: 16.3,
    desktop: 17.7,
  };

  function at(r, sec) {
    return sleep(Math.max(0, r.t0 + sec * 1000 - performance.now()));
  }

  // Resolves once the track is actually playing (or gives up), so t0 lines up with its first sample.
  function whenPlaying(audio, timeoutMs) {
    return new Promise((resolve) => {
      if (!audio.paused && audio.currentTime > 0) {
        resolve();
        return;
      }
      let timer = null;
      const done = () => {
        clearTimeout(timer);
        audio.removeEventListener('playing', done);
        resolve();
      };
      timer = setTimeout(done, timeoutMs);
      audio.addEventListener('playing', done);
    });
  }

  async function post(r) {
    const text = el('.boot-post-text');
    const foot = el('.boot-post-foot');
    const logo = el('.boot-post-logo');
    const print = (s) => {
      text.textContent += s + '\n';
    };
    text.textContent = '';
    foot.textContent = '';
    logo.hidden = true;
    stage('post');
    const now = new Date();
    const mdY = [now.getMonth() + 1, now.getDate(), now.getFullYear()].map((n) => String(n).padStart(2, '0')).join('/');

    r.file = playFile('pc_boot', 0.9, 'hw');
    if (r.file) await whenPlaying(r.file.audio, 1500);
    if (r.cancelled) return;
    r.t0 = performance.now() - (r.file ? r.file.audio.currentTime * 1000 : 0);
    if (!r.file) humStart();

    await at(r, CUE.monitorOn);
    if (r.cancelled) return;
    logo.hidden = false;
    print(' BlazeBIOS v4.51PG, An Energy Star Ally');
    print(' Copyright (C) 1998-' + now.getFullYear() + ', BlazeStudio Software, Inc.');
    print('');
    print(' #401A0-0203');
    print('');
    foot.textContent = ' Press DEL to enter SETUP\n ' + mdY + '-i440BX-8671-2A69KA1AC-00';
    await at(r, CUE.cpu);
    if (r.cancelled) return;
    print(' ANTON-III CPU at 3.0 YRS');
    text.textContent += ' Memory Test :        ';
    await at(r, CUE.memStart);
    if (r.cancelled) return;
    // Count the memory up like the real thing, landing on the one-beep "OK".
    const total = 524288;
    const base = text.textContent;
    const span = CUE.memEnd - CUE.memStart;
    await new Promise((resolve) => {
      const tick = () => {
        if (r.cancelled) {
          resolve();
          return;
        }
        const k = Math.min(1, Math.max(0, (performance.now() - r.t0) / 1000 - CUE.memStart) / span);
        text.textContent = base.slice(0, -8) + String(Math.round((total * k) / 1024) * 1024).padStart(7, ' ') + 'K';
        if (k < 1) requestAnimationFrame(tick);
        else resolve();
      };
      tick();
    });
    if (r.cancelled) return;
    print(' OK');
    await at(r, CUE.beep);
    if (!r.file) beep();
    await at(r, CUE.pnp);
    if (r.cancelled) return;
    print('');
    print(' BlazeBIOS Plug and Play Extension v1.0A');
    print(' Copyright (C) ' + now.getFullYear() + ', BlazeStudio Software, Inc.');
    const drives = [
      ['Primary Master  ', 'PYTHON-BACKEND 3000'],
      ['Primary Slave   ', 'DATA-ENGINEERING 2000'],
      ['Secondary Master', 'FINTECH ATAPI CD-ROM 52X'],
      ['Secondary Slave ', 'None'],
    ];
    for (let i = 0; i < drives.length; i += 1) {
      const [slot, name] = drives[i];
      await at(r, CUE.drives[i]);
      if (r.cancelled) return;
      text.textContent += '    Detecting HDD ' + slot + ' ... ';
      await at(r, CUE.drives[i] + 0.3);
      if (r.cancelled) return;
      print(name);
      if (!r.file && name !== 'None') seek(2 + Math.floor(Math.random() * 3));
    }
    await at(r, CUE.floppy);
    if (!r.file) floppy();
    await at(r, CUE.table);
    if (r.cancelled) return;
    // Second screen: the configuration summary, then off to the OS.
    logo.hidden = true;
    text.textContent = '\n' + configTable() + '\n\n';
    foot.textContent = '';
    await at(r, CUE.dmi);
    if (r.cancelled) return;
    text.textContent += ' Verifying DMI Pool Data ';
    for (let i = 1; i <= 8; i += 1) {
      await at(r, CUE.dmi + i * 0.1);
      if (r.cancelled) return;
      text.textContent += '.';
    }
    if (!r.file) seek(4);
    await at(r, CUE.bootHdd);
    if (r.cancelled) return;
    print('');
    print(' Boot from HDD 0 ...');
  }

  async function xpLoading(r) {
    await at(r, CUE.bootHdd + 0.5);
    if (r.cancelled) return;
    stage('none');
    await at(r, CUE.xpOn);
    if (r.cancelled) return;
    stage('xp');
    while (performance.now() < r.t0 + CUE.xpOff * 1000 - 300) {
      await sleep(350 + Math.random() * 550);
      if (r.cancelled) return;
      if (!r.file) seek(1 + Math.floor(Math.random() * 4));
    }
    await at(r, CUE.xpOff);
    if (r.cancelled) return;
    stage('none');
  }

  // XP shows "welcome" while the desktop loads; the startup sound plays as the desktop appears.
  async function welcome(r) {
    await at(r, CUE.welcome);
    if (r.cancelled) return;
    el('.boot-welcome-text').textContent = t('приветствие', 'welcome');
    stage('welcome');
    if (r.file) r.file.fade(0.9);
    humStop(1.5);
    await at(r, CUE.desktop);
    if (r.cancelled) return;
    chime('startup');
    await sleep(250);
  }

  // Skipped: silence everything. Finished normally: only the PC's own noise
  // stops — the XP startup sound rings on over the freshly shown desktop.
  function finish(skipped) {
    if (!run) return;
    const r = run;
    run = null;
    r.timers.forEach(clearTimeout);
    stoppers.forEach((stop) => {
      if (!skipped && stop.group === 'chime') return;
      if (stop.fade) stop.fade(0.4);
      else stop(0.4);
    });
    el('.boot-skip').hidden = true;
    root.classList.add('boot-fade');
    setTimeout(() => {
      root.hidden = true;
      root.classList.remove('boot-fade');
      stage('none');
    }, 450);
    document.documentElement.classList.remove('pc-off');
    r.resolve();
  }

  function skip() {
    if (!run) return;
    run.cancelled = true;
    finish(true);
  }

  // The whole cold boot, POST to welcome. Resolves when the desktop should show.
  function boot() {
    if (run) return run.promise;
    build();
    unlock();
    const r = { cancelled: false, timers: [], t0: performance.now() };
    run = r;
    r.promise = new Promise((resolve) => {
      r.resolve = resolve;
    });
    root.hidden = false;
    stage('none');
    const skipBtn = el('.boot-skip');
    skipBtn.textContent = t('Esc — пропустить', 'Esc — skip');
    skipBtn.hidden = false;
    (async () => {
      await post(r);
      if (r.cancelled) return;
      await xpLoading(r);
      if (r.cancelled) return;
      await welcome(r);
      if (r.cancelled) return;
      finish(false);
    })();
    return r.promise;
  }

  // Old-CRT switch-off: the picture collapses to a line, then a dot.
  function crtOff() {
    build();
    root.hidden = false;
    stage('none');
    const crt = el('.boot-crt');
    crt.hidden = false;
    crt.classList.remove('on');
    void crt.offsetWidth;
    crt.classList.add('on');
    return new Promise((resolve) =>
      setTimeout(() => {
        crt.hidden = true;
        resolve();
      }, 650)
    );
  }

  // "Powered off" screen shown after a shutdown; the power button boots.
  function powerOff(onBooted) {
    build();
    root.hidden = false;
    stage('off');
    el('.boot-off-hint').textContent = t('Компьютер выключен. Нажмите кнопку питания.', 'The computer is off. Press the power button.');
    const btn = el('.boot-power');
    btn.setAttribute('aria-label', t('Включить компьютер', 'Turn the computer on'));
    btn.focus();
    btn.onclick = () => {
      btn.onclick = null;
      boot().then(onBooted);
    };
  }

  window.XP.boot = { unlock, chime, boot, crtOff, powerOff };
})();
