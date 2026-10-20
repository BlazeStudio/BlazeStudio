'use strict';

/* =========================================================
   BlazeBIOS CMOS Setup Utility — what DEL opens during the POST in
   boot.js. An Award-style text UI: a blue main menu, grey submenus, a
   pop-up list per setting and Y/N prompts, driven by the keyboard as on
   the real thing (arrows, Enter, Esc, +/-, PgUp/PgDn, F7, F10) and by
   clicks/taps on every item, since a phone has no DEL or F10.

   The settings are real and survive reloads (localStorage "av-cmos"):
   boot.js reads the POST/boot ones (quick POST, boot device, logo, CPU
   ratio, keyboard, sounds), apply() below handles the desktop ones
   (wallpaper, scanlines, mono video), and Language switches the site's
   language on Save & Exit.
   ========================================================= */
(function () {
  const STORE = 'av-cmos';

  const ON_OFF = [['on', 'Enabled'], ['off', 'Disabled']];
  const FUEL = { 1: 'Tea', 2: 'Coffee', 3: 'Espresso', 4: 'Energy drink', 6: 'Deadline' };
  const RATIOS = Object.keys(FUEL).map((r) => [r, 'x' + r + ' (' + FUEL[r] + ')']);

  /* Items: { key, def, opts } is a setting, { info } a fixed value,
     { live } a value redrawn every second, { gap } an empty line. */
  const MENUS = {
    std: {
      title: 'Standard CMOS Features',
      items: [
        { label: 'Date (mm:dd:yy)', live: () => dateStr() },
        { label: 'Time (hh:mm:ss)', live: () => new Date().toTimeString().slice(0, 8) },
        { gap: true },
        { label: 'IDE Primary Master', info: 'PYTHON-BACKEND 3000' },
        { label: 'IDE Primary Slave', info: 'DATA-ENGINEERING 2000' },
        { label: 'IDE Secondary Master', info: 'FINTECH CD-ROM 52X' },
        { label: 'IDE Secondary Slave', info: 'None' },
        { gap: true },
        { label: 'Drive A', key: 'floppy', def: '144', opts: [['144', '1.44M, 3.5 in.'], ['none', 'None']], help: 'Select the type of floppy disk drive installed in your system' },
        { label: 'Video', key: 'video', def: 'ega', opts: [['ega', 'EGA/VGA'], ['mono', 'MONO']], help: 'Select the type of primary video subsystem. MONO turns the whole desktop monochrome' },
        { label: 'Halt On', key: 'halt', def: 'kbd', opts: [['all', 'All Errors'], ['none', 'No Errors'], ['kbd', 'All, But Keyboard']], help: 'Select the situation in which you want the BIOS to stop the POST process and notify you' },
        { label: 'Language', key: 'lang', opts: [['ru', 'Russian'], ['en', 'English']], help: 'Language of the desktop' },
        { gap: true },
        { label: 'Base Memory', info: '640K' },
        { label: 'Extended Memory', info: '523264K' },
        { label: 'Total Memory', info: '524288K' },
      ],
    },
    adv: {
      title: 'Advanced BIOS Features',
      items: [
        { label: 'Quick Power On Self Test', key: 'quickPost', def: 'off', opts: ON_OFF, help: 'Allows the system to skip certain tests while booting' },
        { label: 'First Boot Device', key: 'bootDev', def: 'hdd', opts: [['hdd', 'HDD-0'], ['floppy', 'Floppy'], ['cdrom', 'CDROM'], ['lan', 'LAN']], help: 'Select your boot device priority. There is a disc in the CD-ROM drive' },
        { label: 'Second Boot Device', info: 'HDD-0' },
        { label: 'Boot Up NumLock Status', key: 'numlock', def: 'on', opts: [['on', 'On'], ['off', 'Off']] },
        { label: 'Security Option', key: 'security', def: 'setup', opts: [['setup', 'Setup'], ['system', 'System']] },
        { label: 'OS Select For DRAM > 64MB', key: 'os2', def: 'non', opts: [['non', 'Non-OS2'], ['os2', 'OS2']] },
        { label: 'Small Logo(EPA) Show', key: 'logo', def: 'on', opts: ON_OFF, help: 'The Energy Star logo in the corner of the POST screen' },
      ],
    },
    chip: {
      title: 'Advanced Chipset Features',
      items: [
        { label: 'Desktop Wallpaper', key: 'wallpaper', def: 'blackhole', opts: [['blackhole', 'Black Hole'], ['classic', 'Classic Blue'], ['off', 'Disabled']], help: 'The animated wallpaper is the heaviest thing on the desktop. Turn it off on a slow machine' },
        { label: 'CRT Scanlines', key: 'scanlines', def: 'on', opts: ON_OFF, help: 'The scanline overlay over the desktop' },
        { label: 'AGP Aperture Size (MB)', key: 'aperture', def: '64', opts: [['32', '32'], ['64', '64'], ['128', '128'], ['256', '256']] },
        { label: 'System BIOS Cacheable', key: 'biosCache', def: 'on', opts: ON_OFF },
        { label: 'Video RAM Cacheable', key: 'vramCache', def: 'off', opts: ON_OFF },
        { label: 'Memory Hole At 15M-16M', key: 'memHole', def: 'off', opts: ON_OFF },
      ],
    },
    periph: {
      title: 'Integrated Peripherals',
      items: [
        { label: 'Onboard AC97 Audio', key: 'sounds', def: 'on', opts: ON_OFF, help: 'The PC noises, the POST beep and the Windows startup and shutdown sounds' },
        { label: 'Onboard LAN Controller', key: 'lan', def: 'on', opts: ON_OFF },
        { label: 'USB Keyboard Support', key: 'usbKbd', def: 'on', opts: ON_OFF, help: 'Without it the POST reports a keyboard error. Whether that stops the boot depends on Halt On' },
        { label: 'Onboard Serial Port 1', key: 'com1', def: '3f8', opts: [['3f8', '3F8/IRQ4'], ['2f8', '2F8/IRQ3'], ['off', 'Disabled']] },
        { label: 'Onboard Parallel Port', key: 'lpt', def: '378', opts: [['378', '378/IRQ7'], ['278', '278/IRQ5'], ['off', 'Disabled']] },
        { label: 'Parallel Port Mode', key: 'lptMode', def: 'spp', opts: [['spp', 'SPP'], ['epp', 'EPP'], ['ecp', 'ECP']] },
      ],
    },
    power: {
      title: 'Power Management Setup',
      items: [
        { label: 'ACPI Function', key: 'acpi', def: 'on', opts: ON_OFF },
        { label: 'ACPI Suspend Type', key: 'acpiType', def: 's1', opts: [['s1', 'S1(POS)'], ['s3', 'S3(STR)']] },
        { label: 'Video Off Method', key: 'videoOff', def: 'dpms', opts: [['dpms', 'DPMS'], ['blank', 'Blank Screen'], ['vh', 'V/H SYNC+Blank']] },
        { label: 'Soft-Off by PWR-BTTN', key: 'pwrBtn', def: 'instant', opts: [['instant', 'Instant-Off'], ['delay', 'Delay 4 Sec.']] },
        { label: 'Power On by Ring', key: 'ring', def: 'off', opts: ON_OFF },
        { label: 'Resume by Alarm', key: 'alarm', def: 'off', opts: ON_OFF },
        { label: 'Wake Up on Job Offer', key: 'offerWake', def: 'on', opts: ON_OFF, help: 'Recommended setting: Enabled' },
      ],
    },
    health: {
      title: 'PC Health Status',
      items: [
        { label: 'Shutdown Temperature', key: 'shutdownTemp', def: '70', opts: [['60', '60°C/140°F'], ['65', '65°C/149°F'], ['70', '70°C/158°F'], ['75', '75°C/167°F'], ['off', 'Disabled']], help: 'If the CPU runs hotter than this, the POST puts the CPU clock ratio back to default' },
        { gap: true },
        { label: 'Current CPU Temperature', live: () => tempStr() },
        { label: 'Current CPU FAN Speed', live: () => Math.round(1500 + 450 * workRatio() + wobble(40)) + ' RPM' },
        { label: 'Vcore', live: () => (1.45 + 0.05 * workRatio() + wobble(0.01)).toFixed(2) + ' V' },
        { label: '+ 3.3 V', live: () => (3.3 + wobble(0.02)).toFixed(2) + ' V' },
        { label: '+ 5 V', live: () => (4.97 + wobble(0.03)).toFixed(2) + ' V' },
        { label: '+12 V', live: () => (12.1 + wobble(0.08)).toFixed(2) + ' V' },
        { label: 'Coffee Level', live: () => Math.min(100, 20 + 15 * workRatio()) + ' %' },
        { label: 'Motivation', info: 'OK' },
      ],
    },
    freq: {
      title: 'Frequency/Voltage Control',
      items: [
        { label: 'CPU Clock Ratio', key: 'ratio', def: '2', opts: RATIOS, help: 'Overclocking heats the CPU up. Check PC Health Status before you save' },
        { label: 'CPU Host Clock (MHz)', key: 'fsb', def: '133', opts: [['100', '100'], ['133', '133'], ['166', '166']] },
        { label: 'AGP/PCI Clock (MHz)', key: 'agpClock', def: '66', opts: [['66', '66/33'], ['75', '75/37']] },
        { label: 'Spread Spectrum', key: 'spread', def: 'off', opts: ON_OFF },
        { label: 'Auto Detect PCI Clk', key: 'pciClk', def: 'on', opts: ON_OFF },
      ],
    },
  };

  // The main screen: two columns of six, left one first.
  const MAIN = [
    { menu: 'std', desc: 'Time, Date, Hard Disk Type...' },
    { menu: 'adv', desc: 'Boot Device, Quick POST, Logo...' },
    { menu: 'chip', desc: 'Wallpaper, Scanlines, AGP...' },
    { menu: 'periph', desc: 'Audio, LAN, Keyboard, Ports...' },
    { menu: 'power', desc: 'ACPI, Power Button, Wake Events...' },
    { menu: 'health', desc: 'Temperature, Fan Speed, Voltages...' },
    { menu: 'freq', desc: 'CPU Clock Ratio, Host Clock...' },
    { act: 'defaults', label: 'Load Optimized Defaults', desc: 'Load Optimized Defaults' },
    { act: 'password', label: 'Set Supervisor Password', desc: 'Change/Set/Disable Password' },
    { act: 'password', label: 'Set User Password', desc: 'Change/Set/Disable Password' },
    { act: 'save', label: 'Save & Exit Setup', desc: 'Save Data to CMOS' },
    { act: 'quit', label: 'Exit Without Saving', desc: 'Abandon all Datas' },
  ];

  const SETTINGS = [];
  Object.values(MENUS).forEach((m) => m.items.forEach((it) => it.opts && it.key !== 'lang' && SETTINGS.push(it)));
  const DEFAULTS = {};
  SETTINGS.forEach((it) => (DEFAULTS[it.key] = it.def));

  /* ---------------- stored settings ---------------- */
  function load() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORE)) || {};
    } catch (_) {
      saved = {};
    }
    const out = {};
    SETTINGS.forEach((it) => (out[it.key] = it.opts.some((o) => o[0] === saved[it.key]) ? saved[it.key] : it.def));
    return out;
  }

  let cmos = load();

  function persist() {
    try {
      localStorage.setItem(STORE, JSON.stringify(cmos));
    } catch (_) {
      /* no storage — the settings last until the page is closed */
    }
  }

  function set(key, value) {
    cmos[key] = value;
    persist();
  }

  // The desktop half of the settings; the boot half is read by boot.js as it goes.
  function apply() {
    const html = document.documentElement;
    html.classList.toggle('cmos-no-scanlines', cmos.scanlines === 'off');
    html.classList.toggle('cmos-mono', cmos.video === 'mono');
    html.dataset.wallpaper = cmos.wallpaper;
    // A hidden iframe would keep animating, so the wallpaper is unloaded, not just hidden.
    const wp = document.getElementById('nd-wallpaper');
    if (wp) {
      if (!wp.dataset.src) wp.dataset.src = wp.getAttribute('src');
      const src = cmos.wallpaper === 'blackhole' ? wp.dataset.src : 'about:blank';
      if (wp.getAttribute('src') !== src) wp.setAttribute('src', src);
    }
  }

  function cpuTemp(ratio) {
    return 34 + 7 * Number(ratio);
  }
  function overheated(s) {
    return s.shutdownTemp !== 'off' && cpuTemp(s.ratio) >= Number(s.shutdownTemp);
  }
  function fuel(ratio) {
    return FUEL[ratio] + ' x' + ratio;
  }

  /* ---------------- live readouts ---------------- */
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function dateStr() {
    const d = new Date();
    return DAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + String(d.getDate()).padStart(2, '0') + ' ' + d.getFullYear();
  }
  function wobble(amp) {
    return (Math.random() * 2 - 1) * amp;
  }
  // PC Health shows the ratio being edited, so an overclock can be checked before saving it.
  function workRatio() {
    return Number(ui ? ui.work.ratio : cmos.ratio);
  }
  function tempStr() {
    const s = ui ? ui.work : cmos;
    const c = cpuTemp(s.ratio) + Math.round(wobble(1));
    return c + '°C/' + Math.round((c * 9) / 5 + 32) + '°F' + (overheated(s) ? '  !! HOT' : '');
  }

  /* ---------------- UI ---------------- */
  let ui = null;
  let liveTimer = null;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  }

  function optLabel(item) {
    const o = item.opts.find((x) => x[0] === ui.work[item.key]);
    return o ? o[1] : '';
  }

  function selectable(menu) {
    return menu.items.map((it, i) => (it.opts ? i : -1)).filter((i) => i >= 0);
  }

  function renderMain() {
    const half = MAIN.length / 2;
    const col = (from) =>
      MAIN.slice(from, from + half)
        .map((m, j) => {
          const i = from + j;
          const label = m.menu ? '► ' + MENUS[m.menu].title : '  ' + m.label;
          return `<button type="button" class="bios-mi${i === ui.mainSel ? ' sel' : ''}" data-act="main" data-i="${i}">${esc(label)}</button>`;
        })
        .join('');
    return `<div class="bios-title">BlazeBIOS CMOS Setup Utility</div>
      <div class="bios-box">
        <div class="bios-menu"><div class="bios-col">${col(0)}</div><div class="bios-col">${col(half)}</div></div>
        <div class="bios-keys">
          <button type="button" data-act="key" data-k="Escape">Esc : Quit</button>
          <span>↑ ↓ → ← : Select Item</span>
          <button type="button" data-act="key" data-k="F10">F10 : Save &amp; Exit Setup</button>
        </div>
        <div class="bios-desc">${esc(MAIN[ui.mainSel].desc)}</div>
      </div>`;
  }

  function renderSub(menu, live) {
    const cur = menu.items[ui.sel];
    const rows = menu.items
      .map((it, i) => {
        if (it.gap) return '<div class="bios-row bios-gap"></div>';
        const label = `<span class="bios-lbl">${esc(it.label)}</span>`;
        if (it.opts) {
          return `<button type="button" class="bios-row bios-set${i === ui.sel ? ' sel' : ''}" data-act="item" data-i="${i}">${label}<span class="bios-val">[${esc(optLabel(it))}]</span></button>`;
        }
        const val = it.live ? `<span class="bios-val" data-live="${live.push(it.live) - 1}">${esc(it.live())}</span>` : `<span class="bios-val">${esc(it.info)}</span>`;
        return `<div class="bios-row">${label}${val}</div>`;
      })
      .join('');
    return `<div class="bios-title">BlazeBIOS CMOS Setup Utility<br>${esc(menu.title)}</div>
      <div class="bios-box">
        <div class="bios-body">
          <div class="bios-items">${rows}</div>
          <div class="bios-help">
            <div class="bios-help-title">Item Help</div>
            <div class="bios-help-text">Menu Level ►<br><br>${esc((cur && cur.help) || '')}</div>
          </div>
        </div>
      </div>
      <div class="bios-keys">
        <span>↑↓:Move</span><span>Enter:Select</span><span>+/-/PU/PD:Value</span>
        <button type="button" data-act="key" data-k="F10">F10:Save</button>
        <button type="button" data-act="key" data-k="Escape">ESC:Exit</button>
        <button type="button" data-act="key" data-k="F7">F7:Optimized Defaults</button>
      </div>`;
  }

  function renderModal() {
    const m = ui.modal;
    if (!m) return '';
    if (m.type === 'options') {
      const current = ui.work[m.item.key];
      const opts = m.item.opts
        .map((o, i) => `<button type="button" class="bios-pop-opt${i === m.idx ? ' sel' : ''}" data-act="opt" data-i="${i}"><span>${esc(o[1])}</span><span>${o[0] === current ? '[■]' : '[ ]'}</span></button>`)
        .join('');
      return `<div class="bios-shade" data-act="key" data-k="Escape"></div>
        <div class="bios-pop" role="dialog" aria-label="${esc(m.item.label)}">
          <div class="bios-pop-title">${esc(m.item.label)}</div>
          <div class="bios-pop-list">${opts}</div>
          <div class="bios-pop-keys">↑↓:Move ENTER:Accept <button type="button" data-act="key" data-k="Escape">ESC:Abort</button></div>
        </div>`;
    }
    if (m.type === 'confirm') {
      return `<div class="bios-shade"></div>
        <div class="bios-dlg" role="alertdialog">
          <div>${esc(m.text)} <span>${m.answer}</span><span class="bios-cursor">_</span></div>
          <div class="bios-dlg-btns"><button type="button" data-act="answer" data-v="Y">[Y]es</button><button type="button" data-act="answer" data-v="N">[N]o</button></div>
        </div>`;
    }
    // Password prompt and the message after it: a tap stands in for Enter.
    const text = m.type === 'password' ? 'Enter Password: ' + '*'.repeat(m.stars) + '<span class="bios-cursor">_</span>' : m.lines.map(esc).join('<br>');
    return `<div class="bios-shade"></div><button type="button" class="bios-dlg" data-act="key" data-k="Enter">${text}</button>`;
  }

  function render() {
    const live = [];
    const screen = ui.view ? renderSub(MENUS[ui.view], live) : renderMain();
    ui.root.innerHTML = `<div class="bios ${ui.view ? 'bios-sub' : 'bios-main'}">${screen}${renderModal()}</div>`;
    ui.live = live;
  }

  function updateLive() {
    if (!ui) return;
    ui.root.querySelectorAll('[data-live]').forEach((node) => {
      node.textContent = ui.live[node.dataset.live]();
    });
  }

  /* ---------------- actions ---------------- */
  function confirm(text, answer, onYes) {
    ui.modal = { type: 'confirm', text, answer, onYes };
    render();
  }
  function askSave() {
    confirm('SAVE to CMOS and EXIT (Y/N)?', 'Y', () => close(true));
  }
  function askQuit() {
    confirm('Quit Without Saving (Y/N)?', 'N', () => close(false));
  }
  function askDefaults() {
    confirm('Load Optimized Defaults (Y/N)?', 'N', () => {
      ui.work = Object.assign({}, DEFAULTS, { lang: ui.work.lang });
      render();
    });
  }

  function activate(i) {
    const m = MAIN[i];
    if (m.menu) {
      ui.view = m.menu;
      ui.sel = selectable(MENUS[m.menu])[0];
      render();
    } else if (m.act === 'defaults') askDefaults();
    else if (m.act === 'password') {
      ui.modal = { type: 'password', stars: 0 };
      render();
    } else if (m.act === 'save') askSave();
    else askQuit();
  }

  function openOptions(item) {
    ui.modal = { type: 'options', item, idx: Math.max(0, item.opts.findIndex((o) => o[0] === ui.work[item.key])) };
    render();
  }

  function step(item, dir) {
    const n = item.opts.length;
    const i = item.opts.findIndex((o) => o[0] === ui.work[item.key]);
    ui.work[item.key] = item.opts[(i + dir + n) % n][0];
  }

  function mainKey(k) {
    const rows = MAIN.length / 2;
    let col = Math.floor(ui.mainSel / rows);
    let row = ui.mainSel % rows;
    if (k === 'ArrowUp') row = (row + rows - 1) % rows;
    else if (k === 'ArrowDown') row = (row + 1) % rows;
    else if (k === 'ArrowLeft' || k === 'ArrowRight') col = 1 - col;
    else if (k === 'Enter') return activate(ui.mainSel);
    else if (k === 'Escape') return askQuit();
    else return;
    ui.mainSel = col * rows + row;
    render();
  }

  function subKey(k) {
    const menu = MENUS[ui.view];
    const sel = selectable(menu);
    const p = sel.indexOf(ui.sel);
    const item = menu.items[ui.sel];
    if (k === 'ArrowUp') ui.sel = sel[(p + sel.length - 1) % sel.length];
    else if (k === 'ArrowDown') ui.sel = sel[(p + 1) % sel.length];
    else if (k === 'Enter') return openOptions(item);
    else if (k === '+' || k === 'PageDown') step(item, 1);
    else if (k === '-' || k === 'PageUp') step(item, -1);
    else if (k === 'F7') return askDefaults();
    else if (k === 'Escape') ui.view = null;
    else return;
    render();
  }

  function modalKey(m, k) {
    if (m.type === 'options') {
      const n = m.item.opts.length;
      if (k === 'ArrowUp') m.idx = (m.idx + n - 1) % n;
      else if (k === 'ArrowDown') m.idx = (m.idx + 1) % n;
      else if (k === 'Enter') {
        ui.work[m.item.key] = m.item.opts[m.idx][0];
        ui.modal = null;
      } else if (k === 'Escape') ui.modal = null;
      else return;
    } else if (m.type === 'confirm') {
      if (k === 'y' || k === 'Y') m.answer = 'Y';
      else if (k === 'n' || k === 'N') m.answer = 'N';
      else if (k === 'Enter') {
        ui.modal = null;
        if (m.answer === 'Y') return m.onYes();
      } else if (k === 'Escape') ui.modal = null;
      else return;
    } else if (m.type === 'password') {
      // Just Enter on the real thing means "no password" — so does anything here.
      if (k === 'Enter') ui.modal = { type: 'message', lines: ['PASSWORD DISABLED !!!', 'Press any key to continue...'] };
      else if (k === 'Escape') ui.modal = null;
      else if (k === 'Backspace') m.stars = Math.max(0, m.stars - 1);
      else if (k.length === 1) m.stars = Math.min(8, m.stars + 1);
      else return;
    } else {
      ui.modal = null;
    }
    render();
  }

  function press(k) {
    if (ui.modal) modalKey(ui.modal, k);
    else if (k === 'F10') askSave();
    else if (ui.view) subKey(k);
    else mainKey(k);
  }

  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || ['F5', 'F11', 'F12'].includes(e.key)) return; // browser shortcuts still work
    e.preventDefault();
    e.stopPropagation(); // the desktop underneath (console, games, dialogs) mustn't see these keys
    press(e.key);
  }

  function onClick(e) {
    const t = e.target.closest('[data-act]');
    if (!t || !ui) return;
    const i = Number(t.dataset.i);
    const act = t.dataset.act;
    if (act === 'main') {
      ui.mainSel = i;
      activate(i);
    } else if (act === 'item') {
      ui.sel = i;
      openOptions(MENUS[ui.view].items[i]);
    } else if (act === 'opt') {
      ui.modal.idx = i;
      modalKey(ui.modal, 'Enter');
    } else if (act === 'answer') {
      ui.modal.answer = t.dataset.v;
      modalKey(ui.modal, 'Enter');
    } else if (act === 'key') press(t.dataset.k);
  }

  // Runs the setup inside `root` until it's left; resolves with whether it was saved.
  function open(root) {
    return new Promise((resolve) => {
      ui = { root, view: null, mainSel: 0, sel: 0, modal: null, live: [], work: Object.assign({}, cmos, { lang: window.XP.lang() }), resolve };
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); // e.g. the console's input
      window.addEventListener('keydown', onKey, true);
      root.addEventListener('click', onClick);
      liveTimer = setInterval(updateLive, 1000);
      render();
    });
  }

  function close(saved) {
    const { root, work, resolve } = ui;
    window.removeEventListener('keydown', onKey, true);
    root.removeEventListener('click', onClick);
    clearInterval(liveTimer);
    root.innerHTML = '';
    ui = null;
    if (saved) {
      const { lang, ...rest } = work;
      cmos = rest;
      persist();
      apply();
      if (lang !== window.XP.lang()) window.XP.setLang(lang);
    }
    resolve(saved);
  }

  apply();

  window.XP.bios = { open, settings: () => Object.assign({}, cmos), set, fuel, overheated };
})();
