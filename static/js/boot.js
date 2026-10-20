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

   There's no skipping it. DEL (or a tap on "Press DEL to enter SETUP")
   opens the BIOS setup (bios.js) instead, and what's saved there shapes
   the next POST: quick memory test, logo, CPU ratio, keyboard errors,
   sounds, and what it boots from.
   ========================================================= */
(function () {
  const t = (ru, en) => window.XP.t(ru, en);
  const SOUND_FILES = (window.XP.data && window.XP.data.sounds) || {};
  const bios = window.XP.bios;
  const muted = () => bios.settings().sounds === 'off'; // BIOS → Onboard AC97 Audio

  /* ---------------- audio ---------------- */
  let ctx = null;
  let master = null;
  let reverb = null;
  let noiseBuf = null;
  const stoppers = new Set(); // everything that's still making noise, so the end of the boot can silence it

  function unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.connect(ctx.destination);
    }
    master.gain.value = muted() ? 0 : 0.55;
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
    if (!url || muted()) return null;
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
  // spunUp: fade straight into the steady hum (taking over from the recording mid-boot).
  let hum = null;
  function humStart(spunUp) {
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
    fanG.gain.linearRampToValueAtTime(0.5, t0 + (spunUp ? 0.8 : 1.4));
    fan.connect(fanLp).connect(fanG).connect(master);

    const motor = ctx.createOscillator();
    motor.type = 'sawtooth';
    motor.frequency.setValueAtTime(spunUp ? 120 : 25, t0);
    if (!spunUp) motor.frequency.exponentialRampToValueAtTime(120, t0 + 4);
    const motorLp = ctx.createBiquadFilter();
    motorLp.type = 'lowpass';
    motorLp.frequency.value = 500;
    const motorG = ctx.createGain();
    motorG.gain.setValueAtTime(0, t0);
    if (!spunUp) motorG.gain.linearRampToValueAtTime(0.05, t0 + 0.6);
    motorG.gain.linearRampToValueAtTime(0.028, t0 + (spunUp ? 0.8 : 5));
    motor.connect(motorLp).connect(motorG).connect(master);

    const whine = ctx.createOscillator();
    whine.type = 'sine';
    whine.frequency.setValueAtTime(spunUp ? 1800 : 180, t0);
    if (!spunUp) whine.frequency.exponentialRampToValueAtTime(1800, t0 + 4);
    const whineG = ctx.createGain();
    whineG.gain.setValueAtTime(0, t0);
    if (!spunUp) whineG.gain.linearRampToValueAtTime(0.012, t0 + 1.2);
    whineG.gain.linearRampToValueAtTime(0.004, t0 + (spunUp ? 0.8 : 6));
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
      <div class="boot-stage boot-setup" hidden></div>
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
      <div class="boot-crt" hidden></div>`;
    document.body.appendChild(root);
    // Phones have no DEL key, so the "Press DEL" line takes a tap as well.
    root.addEventListener('click', (e) => {
      if (e.target.closest('.boot-del')) askSetup();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' && run && run.canSetup) {
        e.preventDefault();
        askSetup();
      }
    });
    return root;
  }

  function stage(name) {
    root.querySelectorAll('.boot-stage').forEach((s) => (s.hidden = !s.classList.contains('boot-' + name)));
  }

  // The POST is 80×25 text mode: whatever runs off the bottom scrolls the top away.
  const POST_ROWS = 24;
  function write(s) {
    const text = el('.boot-post-text');
    text.textContent = (text.textContent + s).split('\n').slice(-POST_ROWS).join('\n');
  }
  function print(s) {
    write(s + '\n');
  }

  /* ---------------- sequence ---------------- */
  let run = null;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function pad(s, n) {
    return (s + ' '.repeat(n)).slice(0, n);
  }

  function configTable(s) {
    const rows = [
      ['CPU Type', 'ANTON-III', 'Base Memory', '640K'],
      ['Co-Processor', bios.fuel(s.ratio), 'Extended Memory', '523264K'],
      ['CPU Clock', '3+ years', 'Cache Memory', '512K'],
      ['Diskette Drive A', s.floppy === 'none' ? 'None' : '1.44M, 3.5 in.', 'Display Type', s.video === 'mono' ? 'MONO' : 'EGA/VGA'],
      ['Diskette Drive B', 'None', 'Serial Port(s)', '3F8 2F8'],
      ['Pri. Master Disk', 'PYTHON, 3000MB', 'Parallel Port(s)', '378'],
      ['Pri. Slave  Disk', 'DATA, 2000MB', 'Frameworks', 'Django, FastAPI'],
      ['Sec. Master Disk', 'CDROM, Mode 4', 'Domain', 'FinTech/InsurTech'],
      ['Sec. Slave  Disk', 'None', 'Status', 'Open to offers'],
    ];
    const inner = 74;
    const line = (str) => '║' + pad(str, inner) + '║';
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

  // Resolves with the key pressed (any key, or one of `keys`) or 'tap' for a
  // click/tap anywhere on the screen — or with null after `ms`, if given.
  function waitKey(keys, ms) {
    return new Promise((resolve) => {
      let timer = null;
      const done = (e) => {
        if (e && e.type === 'keydown') {
          if (keys && !keys.includes(e.key)) return;
          e.preventDefault();
        }
        clearTimeout(timer);
        document.removeEventListener('keydown', done, true);
        root.removeEventListener('pointerdown', done);
        resolve(!e ? null : e.type === 'keydown' ? e.key : 'tap');
      };
      document.addEventListener('keydown', done, true);
      root.addEventListener('pointerdown', done);
      if (ms) timer = setTimeout(() => done(null), ms);
    });
  }

  // Waiting on the user (a "strike any key" prompt, the BIOS setup) breaks the
  // lock-step with the boot recording: the synthesized PC noises take over
  // from it, and the rest of the timeline moves on by however long it took.
  function handOff(r) {
    if (!r.file) return;
    r.file.fade(0.8);
    r.file = null;
    humStart(true);
  }
  async function hold(r, wait) {
    handOff(r);
    const from = performance.now();
    const result = await wait;
    r.t0 += performance.now() - from;
    return result;
  }

  function askSetup() {
    if (!run || !run.canSetup || run.setup) return;
    run.setup = true;
    const del = el('.boot-del');
    if (del) del.textContent = 'Entering SETUP...';
  }

  // First screen: banner, CPU, memory count, drive detection. Cut short once
  // DEL has been pressed — the setup opens right after the step in progress.
  async function postScreen(r, s) {
    const foot = el('.boot-post-foot');
    const logo = el('.boot-post-logo');
    el('.boot-post-text').textContent = '';
    foot.textContent = '';
    logo.hidden = true;
    stage('post');
    const now = new Date();
    const mdY = [now.getMonth() + 1, now.getDate(), now.getFullYear()].map((n) => String(n).padStart(2, '0')).join('/');

    r.file = playFile('pc_boot', 0.9, 'hw');
    if (r.file) await whenPlaying(r.file.audio, 1500);
    r.t0 = performance.now() - (r.file ? r.file.audio.currentTime * 1000 : 0);
    if (!r.file) humStart();

    await at(r, CUE.monitorOn);
    logo.hidden = s.logo === 'off';
    print(' BlazeBIOS v4.51PG, An Energy Star Ally');
    print(' Copyright (C) 1998-' + now.getFullYear() + ', BlazeStudio Software, Inc.');
    print('');
    print(' #401A0-0203');
    print('');
    foot.innerHTML = ' <button type="button" class="boot-del">Press DEL to enter SETUP</button>\n ' + mdY + '-i440BX-8671-2A69KA1AC-00';
    r.canSetup = true;
    await at(r, CUE.cpu);
    print(' ANTON-III CPU at 3.0 YRS' + (s.ratio === '2' ? '' : ', ' + bios.fuel(s.ratio)));
    if (bios.overheated(s)) {
      print(' CPU Over Temperature!! Clock ratio restored to ' + bios.fuel('2'));
      bios.set('ratio', '2');
    }
    write(' Memory Test :        ');
    await at(r, CUE.memStart);
    // Count the memory up like the real thing, landing on the one-beep "OK" —
    // or all of it at once with Quick POST.
    const text = el('.boot-post-text');
    const base = text.textContent.slice(0, -8);
    const total = 524288;
    const shown = (k) => {
      text.textContent = base + String(Math.round((total * k) / 1024) * 1024).padStart(7, ' ') + 'K';
    };
    if (s.quickPost === 'on') shown(1);
    else {
      const span = CUE.memEnd - CUE.memStart;
      // A timer, not requestAnimationFrame: that one stops in a background tab and would hang the POST there.
      await new Promise((resolve) => {
        const tick = () => {
          const k = Math.min(1, Math.max(0, (performance.now() - r.t0) / 1000 - CUE.memStart) / span);
          shown(k);
          if (k < 1) setTimeout(tick, 16);
          else resolve();
        };
        tick();
      });
    }
    print(' OK');
    await at(r, CUE.beep);
    if (!r.file) beep();
    if (s.usbKbd === 'off') {
      print(' Keyboard error or no keyboard present');
      if (s.halt === 'all') {
        print(' Press F1 to continue, DEL to enter SETUP');
        await hold(r, waitKey(['F1', 'Delete']));
      }
    }
    if (r.setup) return;
    await at(r, CUE.pnp);
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
      write('    Detecting HDD ' + slot + ' ... ');
      await at(r, CUE.drives[i] + 0.3);
      print(name);
      if (!r.file && name !== 'None') seek(2 + Math.floor(Math.random() * 3));
      if (r.setup) return;
    }
    await at(r, CUE.floppy);
    if (!r.file && s.floppy !== 'none') floppy();
  }

  // DEL was pressed: the BIOS setup holds the screen until it's left, then the
  // POST picks up at the configuration summary, which already shows the changes.
  async function setup(r) {
    await hold(r, sleep(500)); // a moment on "Entering SETUP..."
    stage('setup');
    await bios.open(el('.boot-setup'));
    unlock(); // Onboard AC97 Audio may have been switched
    stage('none');
    r.t0 = performance.now() - (CUE.table - 0.6) * 1000;
  }

  // Second screen: the configuration summary, then whatever the BIOS boots
  // from. Resolves false if that wasn't Windows on the hard disk.
  async function postSummary(r, s) {
    await at(r, CUE.table);
    stage('post');
    el('.boot-post-logo').hidden = true;
    el('.boot-post-foot').textContent = '';
    el('.boot-post-text').textContent = '';
    print('');
    write(configTable(s) + '\n\n');
    await at(r, CUE.dmi);
    write(' Verifying DMI Pool Data ');
    for (let i = 1; i <= 8; i += 1) {
      await at(r, CUE.dmi + i * 0.1);
      write('.');
    }
    if (!r.file) seek(4);
    await at(r, CUE.bootHdd);
    print('');
    if (s.bootDev === 'floppy' && s.floppy !== 'none') await floppyBoot(r);
    else if (s.bootDev === 'cdrom' && (await cdBoot(r))) return false;
    else if (s.bootDev === 'lan' && s.lan === 'on') await hold(r, pxeBoot());
    print(' Boot from HDD 0 ...');
    return true;
  }

  // Floppy first: the disk left in drive A isn't a boot disk.
  async function floppyBoot(r) {
    handOff(r);
    floppy();
    await hold(r, sleep(900));
    print('');
    print('Non-System disk or disk error');
    print('Replace and strike any key when ready');
    await hold(r, waitKey());
    print('');
  }

  // CD-ROM first: the disc in the drive is help.exe. Like a Windows CD it only
  // boots if a key is pressed in time — otherwise it's on to the hard disk.
  async function cdBoot(r) {
    await hold(r, sleep(700));
    print('');
    write('Press any key to boot from CD');
    let key = null;
    for (let i = 0; i < 5 && !key; i += 1) {
      key = await hold(r, waitKey(null, 1000));
      if (!key) write('.');
    }
    print('');
    if (!key || !window.XP.effects.horror) return false;
    stage('none');
    window.XP.effects.horror(); // its screen goes over this one
    finish();
    return true;
  }

  // LAN first: the network boot ROM asks for an address nobody hands out.
  async function pxeBoot() {
    print('');
    print('Intel UNDI, PXE-2.0 (build 082)');
    print('Copyright (C) 1997-2000  Intel Corporation');
    print('');
    print('CLIENT MAC ADDR: 00 0B 1A 2E 04 20  GUID: C0FFEE00-2004-4B1D-A000-000000000000');
    write('DHCP.  ');
    const text = el('.boot-post-text');
    for (let i = 0; i < 18; i += 1) {
      await sleep(170);
      text.textContent = text.textContent.slice(0, -1) + '|/-\\'[i % 4];
    }
    print('');
    print('');
    print('PXE-E51: No DHCP or proxy DHCP offers were received.');
    print('');
    print('PXE-M0F: Exiting Intel PXE ROM.');
    await sleep(900);
  }

  async function xpLoading(r) {
    await at(r, CUE.bootHdd + 0.5);
    stage('none');
    await at(r, CUE.xpOn);
    stage('xp');
    while (performance.now() < r.t0 + CUE.xpOff * 1000 - 300) {
      await sleep(350 + Math.random() * 550);
      if (!r.file) seek(1 + Math.floor(Math.random() * 4));
    }
    await at(r, CUE.xpOff);
    stage('none');
  }

  // XP shows "welcome" while the desktop loads; the startup sound plays as the desktop appears.
  async function welcome(r) {
    await at(r, CUE.welcome);
    el('.boot-welcome-text').textContent = t('приветствие', 'welcome');
    stage('welcome');
    if (r.file) r.file.fade(0.9);
    humStop(1.5);
    await at(r, CUE.desktop);
    chime('startup');
    await sleep(250);
  }

  // The PC's own noise stops; the XP startup sound rings on over the freshly shown desktop.
  function finish() {
    if (!run) return;
    const r = run;
    run = null;
    stoppers.forEach((stop) => {
      if (stop.group === 'chime') return;
      if (stop.fade) stop.fade(0.4);
      else stop(0.4);
    });
    root.classList.add('boot-fade');
    setTimeout(() => {
      root.hidden = true;
      root.classList.remove('boot-fade');
      stage('none');
    }, 450);
    document.documentElement.classList.remove('pc-off');
    r.resolve();
  }

  // The whole cold boot, POST to welcome. Resolves when the desktop should show.
  function boot() {
    if (run) return run.promise;
    build();
    unlock();
    const r = { t0: performance.now(), file: null, canSetup: false, setup: false };
    run = r;
    r.promise = new Promise((resolve) => {
      r.resolve = resolve;
    });
    root.hidden = false;
    stage('none');
    (async () => {
      await postScreen(r, bios.settings());
      if (!r.setup) await at(r, CUE.table);
      r.canSetup = false;
      if (r.setup) await setup(r);
      // Read again: the setup may have changed them, and so may an overheat in the POST.
      if (!(await postSummary(r, bios.settings()))) return;
      await xpLoading(r);
      await welcome(r);
      finish();
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
