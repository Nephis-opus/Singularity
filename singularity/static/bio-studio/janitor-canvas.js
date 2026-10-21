/**
 * Singularity Janitor Bio Canvas & AI Visual Engine
 * Ported & upgraded with Kimi AI Integration and Universal Design System compliance.
 */
(function() {
  'use strict';

  // State & Data Models
  const FONTS = [
    'Georgia, serif',
    'Fraunces, Georgia, serif',
    'Jura, sans-serif',
    'Dancing Script, cursive',
    'Bradley Hand, cursive',
    'Avenir Next Condensed, Arial Narrow, sans-serif',
    'Impact, Arial Black, sans-serif',
    'Arial, sans-serif',
    'Trebuchet MS, sans-serif',
    'Times New Roman, serif',
    'Courier New, monospace'
  ];

  const LB = {
    left: 'Left',
    center: 'Center',
    right: 'Right',
    400: 'Regular',
    700: 'Bold',
    0: 'In Image (Baked)',
    1: 'Live HTML'
  };

  const OK = /^https:\/\/ella\.janitorai\.com\/media-approved\//;
  const U = 'https://ella.janitorai.com/media-approved/';

  let S = null;
  let SEL = [];
  let Z = 1;
  let D = null;
  let ED = null;
  let hist = [];
  let hi = -1;
  let G = [];
  let tm = null;
  let sv = null;
  let FM = '';
  let pk = '';
  let isAltHeld = false;
  const BAD = new Set();
  const BAD_DIRECT = new Set();
  const PRB = new Set();
  const BU = {};
  const PROXIED = new Map();

  const camera = {
    x: 0,
    y: 0,
    zoom: 1.0,
    isPanning: false,
    startX: 0,
    startY: 0,
    startCamX: 0,
    startCamY: 0
  };

  const framePos = {
    x: 0,
    y: 0,
    isDragging: false,
    startX: 0,
    startY: 0,
    startFrameX: 0,
    startFrameY: 0
  };

  let isSpaceHeld = false;

  function getProxiedUrl(rawUrl) {
    if (!rawUrl || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) return rawUrl;
    if (PROXIED.has(rawUrl)) return PROXIED.get(rawUrl);
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      const pUrl = `/api/janitor/image-proxy?url=${encodeURIComponent(rawUrl)}`;
      PROXIED.set(rawUrl, pUrl);
      return pUrl;
    }
    return rawUrl;
  }

  const rid = () => 'l' + Math.random().toString(36).slice(2, 8);

  const mk = (t, o = {}) => ({
    id: rid(),
    t,
    name: { text: 'Text', img: 'Photo', rect: 'Shape' }[t],
    x: 40,
    y: 40,
    op: 1,
    rad: 0,
    lock: 0,
    hide: 0,
    rot: 0,
    ...({
      text: { w: 300, h: 40, txt: 'New text', fs: 28, fw: 400, col: '#efe6d8', al: 'left', lh: 1.25, ff: FONTS[0], live: 0 },
      img: { w: 240, h: 320, src: '', lk: '', fx: 50, fy: 50, fT: 0, fB: 0, fL: 0, fR: 0 },
      rect: { w: 200, h: 120, col: '#1a2026', col2: '#1a2026', a1: 1, a2: 1 }
    }[t]),
    ...o
  });

  const blank = () => ({
    schema: 'bio-canvas',
    v: 1,
    W: 480,
    H: 560,
    bg: '#0f1418',
    layers: [],
    imgs: {},
    mode: 'hyb',
    pub: null,
    alt: '',
    legacy: [],
    sections: [],
    tx: '#d8d2c8',
    ac: '#d9a273'
  });

  const tpl = () => ({
    W: 480,
    H: 560,
    bg: '#0f1418',
    tx: '#d8d2c8',
    ac: '#d9a273',
    layers: [
      mk('img', { name: 'Left portrait', x: -40, y: 0, w: 300, h: 430, src: U + 'YZIE0EJBA1sV-U5zSn3ZF.webp', fR: 45, fB: 25 }),
      mk('img', { name: 'Right portrait', x: 220, y: 0, w: 300, h: 430, src: U + 'fmnDnm4e1CA83zCvcLEMd.webp', fL: 45, fB: 25 }),
      mk('img', { name: 'Center portrait', x: 110, y: 50, w: 260, h: 400, src: U + 'CkTH0Xj-rM1_D2ae7h-t6.webp', fL: 30, fR: 30, fB: 40 }),
      mk('rect', { name: 'Dark gradient', x: 0, y: 290, w: 480, h: 270, col: '#0f1418', col2: '#0f1418', a1: 0, a2: 1 }),
      mk('text', { name: 'Title', live: 1, x: 30, y: 410, w: 420, txt: 'Character Title', fs: 44, fw: 700, col: '#d9a273', al: 'center' }),
      mk('text', { name: 'Quote', live: 1, x: 60, y: 480, w: 360, txt: '«A quote that hooks the reader from the first line.»', fs: 20, col: '#d8d2c8', al: 'center' })
    ],
    sections: []
  });

  const tplMidnight = () => ({
    W: 480,
    H: 640,
    bg: '#000000',
    tx: '#d8d0cb',
    ac: '#e9b7ab',
    layers: [
      mk('img', { name: 'Ambient Hero', x: 0, y: 0, w: 480, h: 480, src: 'https://files.catbox.moe/ra4a2z.webp', fT: 20, fB: 55 }),
      mk('rect', { name: 'Deep Obsidian Mask', x: 0, y: 320, w: 480, h: 320, col: '#000000', col2: '#000000', a1: 0, a2: 1 }),
      mk('text', { name: 'Tagline', live: 1, x: 20, y: 440, w: 440, txt: 'MIDNIGHT RESEARCH CLUB', fs: 14, fw: 700, col: '#e9b7ab', al: 'center', ff: 'Arial, sans-serif' }),
      mk('text', { name: 'Title', live: 1, x: 20, y: 475, w: 440, txt: 'THE SECRET LOUNGE', fs: 38, fw: 700, col: '#ffffff', al: 'center', ff: 'Georgia, serif' }),
      mk('text', { name: 'Quote', live: 1, x: 40, y: 540, w: 400, txt: '«Door\'s open, darlin\'. Grab a drink and keep your voice down.»', fs: 17, col: '#a8938d', al: 'center', ff: 'Georgia, serif' })
    ],
    sections: [
      {
        id: rid(),
        t: 'audio',
        title: '34+35 (Midnight Mix)',
        artist: 'Ariana Grande',
        src: 'https://files.catbox.moe/zj8w8j.mp3',
        img: 'https://ella.janitorai.com/media-approved/0gv3MT5Gu1xgy4O8anKSC.webp',
        note: 'Now Playing · Catbox Stream 🎧'
      },
      {
        id: rid(),
        t: 'audio',
        title: 'Voice Note · 1:13',
        artist: 'Kat',
        src: 'https://files.catbox.moe/fnjxox.mp3',
        img: 'https://ella.janitorai.com/media-approved/FGtVUWhBbzD4sqcfKUnqt.webp',
        note: '«Hiii! Oh my god congrats, you made it in... Just don\'t tell anyone.»'
      },
      {
        id: rid(),
        t: 'polaroid',
        img: 'https://ella.janitorai.com/media-approved/Zp8uncdAfdKzoj_V0K6uJ.webp',
        caption: '«Club photo. Don\'t post this.» — Kat',
        tape: 'rgba(233, 183, 171, 0.45)',
        rot: -1.5
      },
      {
        id: rid(),
        t: 'divider',
        txt: 'The Inner Circle'
      },
      {
        id: rid(),
        t: 'chars',
        items: [
          { img: 'https://ella.janitorai.com/media-approved/FGtVUWhBbzD4sqcfKUnqt.webp', name: 'Kat', gender: 'Female', age: '21', height: '165 cm', desc: 'Founder & ringleader. Warm smile with sharp secrets.' },
          { img: 'https://ella.janitorai.com/media-approved/CkTH0Xj-rM1_D2ae7h-t6.webp', name: 'Damon', gender: 'Male', age: '22', height: '184 cm', desc: 'Senior captain. Quiet, watchful, and protective of the room.' }
        ]
      },
      {
        id: rid(),
        t: 'note',
        txt: 'Campus security has no idea this room exists. Keep your invite token secure.'
      }
    ]
  });

  const tplPapercraft = () => ({
    W: 480,
    H: 660,
    bg: '#221d2b',
    tx: '#ded9e3',
    ac: '#b5d2eb',
    layers: [
      mk('rect', { name: 'Paper Base', x: 10, y: 10, w: 460, h: 640, col: '#383344', col2: '#2a2436', rad: 8 }),
      mk('img', { name: 'Hero Portrait', x: 30, y: 30, w: 420, h: 360, src: 'https://ella.janitorai.com/media-approved/lsyntXKQqidd2DDOvXXq4.webp', rad: 6, fB: 35 }),
      mk('text', { name: 'Campus Label', live: 1, x: 40, y: 400, w: 400, txt: 'ASTERMONT UNIVERSITY · AUTUMN 2026', fs: 12, fw: 700, col: '#e8b7c2', al: 'center', ff: 'Courier New, monospace' }),
      mk('text', { name: 'Title', live: 1, x: 30, y: 430, w: 420, txt: 'She Lost Her Voice?', fs: 42, fw: 700, col: '#b5d2eb', al: 'center', ff: 'Georgia, serif' }),
      mk('text', { name: 'Quote', live: 1, x: 40, y: 505, w: 400, txt: '«The girl you knew is back on campus. But every word is typed on a screen.»', fs: 17, col: '#b8b0c4', al: 'center', ff: 'Georgia, serif' })
    ],
    sections: [
      {
        id: rid(),
        t: 'warning',
        title: 'CONTENT WARNING',
        txt: 'Grief, emotional distress, mutism, and university slow-burn drama.'
      },
      {
        id: rid(),
        t: 'ticket',
        title: 'The Return to Astermont',
        txt: 'During her first year, Alice was an easy person to find yourself around. Coffee at The Hollow, brisk lake walks, and direct laughter. Then news arrived of a serious summer accident. She survived, but can no longer speak a single word.',
        tag: 'ANYPOV · DRAMA',
        badge: 'PREMISE',
        seal: 'UNSPOKEN',
        rot: 0.3
      },
      {
        id: rid(),
        t: 'intro',
        items: [
          { title: 'Scenario 1: Library Encounter', txt: 'You spot her studying by the tall arched windows. She slides a yellow sticky note across the mahogany table...' },
          { title: 'Scenario 2: Dorm Corridor', txt: 'Her door is slightly ajar. You hear keystrokes from her laptop, followed by a soft, frustrated sigh.' }
        ]
      },
      {
        id: rid(),
        t: 'note',
        txt: 'Original story concept. All characters are 18+ university students.'
      }
    ]
  });

  const tplEditorial = () => ({
    W: 480,
    H: 640,
    bg: '#060607',
    tx: '#cfcac4',
    ac: '#e5485f',
    layers: [
      mk('text', { name: 'Tag Stamp', live: 1, x: 30, y: 40, w: 260, txt: 'FINAL YEAR / CAPSTONE', fs: 13, fw: 700, col: '#e5485f', rot: -2, ff: 'Arial, sans-serif' }),
      mk('text', { name: 'Script Subtitle', live: 1, x: 30, y: 80, w: 420, txt: 'FOUR PEOPLE. ONE PROJECT.', fs: 20, col: '#b9b4ad', ff: 'Georgia, serif', rot: 1.5 }),
      mk('text', { name: 'Title Headline', live: 1, x: 30, y: 125, w: 420, txt: 'FOURTH MEMBER', fs: 52, fw: 700, col: '#f4efe6', ff: 'Impact, Arial Black, sans-serif' }),
      mk('img', { name: 'Hero Polaroid', x: 40, y: 220, w: 400, h: 300, src: 'https://ella.janitorai.com/media-approved/fC3hddfZv9cbtpDc_URRA.webp', rad: 4, rot: -1.2 }),
      mk('text', { name: 'Opening Hook', live: 1, x: 30, y: 540, w: 420, txt: '«You have a team again. But they don\'t trust you.»', fs: 19, col: '#f4efe6', al: 'center', ff: 'Georgia, serif' })
    ],
    sections: [
      {
        id: rid(),
        t: 'polaroid',
        img: 'https://ella.janitorai.com/media-approved/kN2p2_TM3qClDLhs_hKfN.webp',
        caption: '«Sarah never liked the idea of taking that gamble.»',
        tape: 'rgba(221, 208, 138, 0.72)',
        rot: 1.3
      },
      {
        id: rid(),
        t: 'roster',
        title: 'Project Group Roster',
        items: [
          { name: '1) Sarah Hall', role: 'Project Manager · 3.98 GPA', color: '#e5485f', desc: 'No tolerance for dead weight or missed deadlines.' },
          { name: '2) Chloe Scott', role: 'Lead Designer · UX/UI', color: '#e3b04b', desc: 'Friendly on the surface, but secretly dreading having to carry you.' },
          { name: '3) Nika Myers', role: 'Systems Engineer', color: '#79c7e8', desc: 'Already re-checking your git commits line by line.' },
          { name: '4) You (Fourth Member)', role: 'Technical Staff', color: '#94a3b8', desc: 'Last chance to keep your degree on track.' }
        ]
      },
      {
        id: rid(),
        t: 'gallery',
        tape: 'rgba(229, 72, 95, 0.82)',
        items: [
          { img: 'https://ella.janitorai.com/media-approved/TZQ0MD3s1PmolDchlXgQA.webp', name: 'Sarah Hall', caption: '«Get your part done on time.»' },
          { img: 'https://ella.janitorai.com/media-approved/hcMxSv56NDuH-yEEHAyi9.webp', name: 'Chloe Scott', caption: '«Let me know if you need help!»' },
          { img: 'https://ella.janitorai.com/media-approved/Y23K_HsqqhVYtX2M5eG2e.webp', name: 'Nika Myers', caption: '«Did you even test this code?»' }
        ]
      },
      {
        id: rid(),
        t: 'note',
        txt: 'Deadlines don\'t wait. One sprint at a time.'
      }
    ]
  });

  function openTemplatePickerModal() {
    const html = `
      <div class="bio-tpl-modal-body">
        <div class="bio-tpl-grid">
          <div class="bio-tpl-card" data-load-tpl="midnight">
            <div class="bio-tpl-header">
              <h4 class="bio-tpl-title">Midnight Lounge & Audio</h4>
              <span class="bio-tpl-badge">Audio Engine</span>
            </div>
            <p class="bio-tpl-desc">Obsidian dark glass styling inspired by premier club bios. Includes working Catbox audio player card, character voice note memo, rose-gold gradient glow, and tilted snapshot card.</p>
            <div class="bio-tpl-features">
              <span class="bio-tpl-tag">Now Playing Card</span>
              <span class="bio-tpl-tag">Voice Message Note</span>
              <span class="bio-tpl-tag">Frosted Glass</span>
            </div>
          </div>

          <div class="bio-tpl-card" data-load-tpl="papercraft">
            <div class="bio-tpl-header">
              <h4 class="bio-tpl-title">Astermont Papercraft & Ticket</h4>
              <span class="bio-tpl-badge">Tactile</span>
            </div>
            <p class="bio-tpl-desc">Organic campus notebook with perforated tear-off ticket edges, rotated dashed stamp pills, circular postal stamp seal, Fraunces serif headlines, and content warning accordion.</p>
            <div class="bio-tpl-features">
              <span class="bio-tpl-tag">Perforated Stamp Edge</span>
              <span class="bio-tpl-tag">Rotated Badges</span>
              <span class="bio-tpl-tag">Warning Accordion</span>
            </div>
          </div>

          <div class="bio-tpl-card" data-load-tpl="editorial">
            <div class="bio-tpl-header">
              <h4 class="bio-tpl-title">Editorial Polaroid & Roster</h4>
              <span class="bio-tpl-badge">Magazine</span>
            </div>
            <p class="bio-tpl-desc">Punchy modern editorial magazine layout with vintage scotch-taped Polaroid photos, horizontal scroll-snap swiper gallery, multi-color stripes, and chunky color-coded team roster.</p>
            <div class="bio-tpl-features">
              <span class="bio-tpl-tag">Scotch Tape Polaroids</span>
              <span class="bio-tpl-tag">Horizontal Swiper</span>
              <span class="bio-tpl-tag">Team Roster</span>
            </div>
          </div>

          <div class="bio-tpl-card" data-load-tpl="classic">
            <div class="bio-tpl-header">
              <h4 class="bio-tpl-title">Classic Character Banner</h4>
              <span class="bio-tpl-badge">Standard</span>
            </div>
            <p class="bio-tpl-desc">The classic 3-portrait banner composition with seamless bottom dark fade, bold centered typography, and introductory quote.</p>
            <div class="bio-tpl-features">
              <span class="bio-tpl-tag">Triple Portrait</span>
              <span class="bio-tpl-tag">Gradient Vignette</span>
              <span class="bio-tpl-tag">Clean Hybrid</span>
            </div>
          </div>

          <div class="bio-tpl-card" data-load-tpl="blank">
            <div class="bio-tpl-header">
              <h4 class="bio-tpl-title">Blank Canvas</h4>
              <span class="bio-tpl-badge">Scratch</span>
            </div>
            <p class="bio-tpl-desc">Clean empty canvas stage with infinite pan/zoom. Add your own custom text, media photos, shapes, and section modules.</p>
            <div class="bio-tpl-features">
              <span class="bio-tpl-tag">480 × 560</span>
              <span class="bio-tpl-tag">Custom Colors</span>
            </div>
          </div>
        </div>
      </div>
    `;

    showModal({
      title: '🎨 Choose a Bio Design Template',
      bodyHtml: html,
      confirmText: '',
      cancelText: 'Close'
    });

    const modal = document.getElementById('bio-canvas-modal-wrap');
    if (!modal) return;
    modal.querySelectorAll('.bio-tpl-card').forEach(card => {
      card.onclick = () => {
        const type = card.dataset.loadTpl;
        if (type === 'midnight') setComp(tplMidnight());
        else if (type === 'papercraft') setComp(tplPapercraft());
        else if (type === 'editorial') setComp(tplEditorial());
        else if (type === 'classic') setComp(tpl());
        else if (type === 'blank') setComp({ W: 480, H: 560, bg: '#0f1418', layers: [], sections: [] });
        modal.remove();
        say(`Loaded "${card.querySelector('.bio-tpl-title').textContent}" template!`);
      };
    });
  }

  const norm = d => ({
    ...blank(),
    ...d,
    layers: (d.layers || []).map(l => ({ ...mk(l.t || 'text'), ...l })),
    imgs: d.imgs || {},
    legacy: Array.isArray(d.legacy) ? d.legacy : [],
    sections: Array.isArray(d.sections) ? d.sections : []
  });

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const q = u => String(u).replace(/['"()\s]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  const rgba = (h, a) => {
    const n = parseInt(h.slice(1), 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  };

  const L = id => S.layers.find(l => l.id == id);
  const sl = () => SEL.map(L).filter(Boolean);
  const lv = l => l.t == 'text' && l.live && !l.rot;

  const bb = l => {
    if (!l.rot) return { x: l.x, y: l.y, w: l.w, h: l.h };
    const a = l.rot * Math.PI / 180, c = Math.abs(Math.cos(a)), n = Math.abs(Math.sin(a));
    const w = l.w * c + l.h * n, h = l.w * n + l.h * c;
    return { x: l.x + l.w / 2 - w / 2, y: l.y + l.h / 2 - h / 2, w, h };
  };

  function say(m, e) {
    const s = $('#c-st');
    if (s) {
      s.textContent = m;
      s.title = m;
      s.style.color = e ? 'var(--color-error, #ef4444)' : 'var(--text-muted, #78716c)';
    }
    if (window.JanitorBioStudio && typeof window.JanitorBioStudio.showToast === 'function') {
      window.JanitorBioStudio.showToast(m, e ? 'error' : 'success');
    }
  }

  const sig = () => JSON.stringify([S.W, S.H, S.bg, S.mode == 'hyb', S.layers.filter(l => !(S.mode == 'hyb' && lv(l))).map(l => ({ ...l, name: 0, lock: 0, h: l.t == 'text' ? 0 : l.h }))]);
  const snap = () => JSON.stringify([S.W, S.H, S.bg, S.layers, S.sections]);

  function dispU(l) {
    if (l.lk && S.imgs[l.lk]) {
      if (BU[l.lk] === undefined) {
        BU[l.lk] = '';
        fetch(S.imgs[l.lk]).then(r => r.blob()).then(b => {
          BU[l.lk] = URL.createObjectURL(b);
          render();
        });
      }
      return BU[l.lk];
    }
    if (!l.src) return '';
    if (BAD_DIRECT.has(l.src)) {
      return getProxiedUrl(l.src);
    }
    return l.src;
  }

  // IndexedDB Storage
  const idb = new Promise((ok, no) => {
    try {
      const r = indexedDB.open('singularity_bc', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('p');
      r.onsuccess = () => ok(r.result);
      r.onerror = () => no(r.error);
    } catch (e) { no(e); }
  });

  const idbT = async (m, f) => {
    const d = await idb;
    return new Promise((ok, no) => {
      const t = d.transaction('p', m), r = f(t.objectStore('p'));
      t.oncomplete = () => ok(r.result);
      t.onerror = t.onabort = () => no(t.error);
    });
  };

  const idbPut = (k, v) => idbT('readwrite', o => o.put(v, k));
  const idbGet = k => idbT('readonly', o => o.get(k));
  const idbDel = k => idbT('readwrite', o => o.delete(k));
  const idbAll = () => idbT('readonly', o => o.getAll());

  let FH = null;
  let DIRTY = false;
  let lastCp = '';

  function autosave() {
    clearTimeout(sv);
    DIRTY = true;
    const v = $('#c-sv2');
    if (v) {
      v.style.color = '';
      v.textContent = 'Saving…';
    }
    sv = setTimeout(async () => {
      S.t = Date.now();
      const js = JSON.stringify(S), ok = [], er = [];
      try {
        await idbPut('auto', { t: S.t, s: js });
        ok.push('vault');
      } catch {
        try {
          localStorage.setItem('singularity_bc:auto', js);
          ok.push('vault (backup)');
        } catch { er.push('vault'); }
      }
      if (FH) {
        try {
          const w = await FH.createWritable();
          await w.write(js);
          await w.close();
          ok.push('file');
        } catch { er.push('file'); }
      }
      DIRTY = !ok.length;
      if (v) {
        v.style.color = er.length ? 'var(--color-error)' : '';
        v.textContent = ok.length ? `Saved ${new Date().toTimeString().slice(0, 5)} · ${ok.join(' + ')}` : '⚠ Not saved';
      }
      if (er.length) say(`Failed to write: ${er.join(', ')}`, 1);
    }, 400);
  }

  function commit() {
    clearTimeout(tm);
    const s = snap();
    if (hist[hi] !== s) {
      hist = hist.slice(0, hi + 1);
      hist.push(s);
      if (hist.length > 100) hist.shift();
      hi = hist.length - 1;
    }
    autosave();
    ui();
  }

  const later = () => {
    clearTimeout(tm);
    tm = setTimeout(commit, 500);
  };

  function jump(d) {
    commit();
    const j = hi + d;
    if (j < 0 || j >= hist.length) return;
    hi = j;
    [S.W, S.H, S.bg, S.layers, S.sections] = JSON.parse(hist[hi]);
    SEL = SEL.filter(L);
    pk = '\0';
    sizeStage();
    render();
    secUI();
    autosave();
    ui();
  }

  const undo = () => jump(-1);
  const redo = () => jump(1);

  function mask(l) {
    const g = [['T', 'to bottom'], ['B', 'to top'], ['L', 'to right'], ['R', 'to left']]
      .filter(([k]) => l['f' + k] > 0)
      .map(([k, d]) => `linear-gradient(${d},transparent,#000 ${l['f' + k]}%)`).join(',');
    return g ? `-webkit-mask-image:${g};mask-image:${g};-webkit-mask-composite:source-in;mask-composite:intersect;` : '';
  }

  function render() {
    if (ED) return;
    const cv = $('#c-cv');
    if (!cv) return;
    const keep = new Set();
    cv.style.background = S.bg;

    S.layers.forEach(l => {
      if (l.hide) return;
      keep.add(l.id);
      let e = cv.querySelector(`[data-id="${l.id}"]`);
      if (!e) {
        e = document.createElement('div');
        e.dataset.id = l.id;
      }
      let s = `left:${l.x}px;top:${l.y}px;width:${l.w}px;opacity:${l.op};transform:rotate(${l.rot || 0}deg);`, k = '';
      if (l.t == 'text') {
        s += `font:${l.fw} ${l.fs}px/${l.lh} ${l.ff};color:${l.col};text-align:${l.al};`;
        if (e.textContent !== l.txt) e.textContent = l.txt;
      } else {
        s += `height:${l.h}px;border-radius:${l.rad}px;`;
        if (l.t == 'rect') {
          s += `background:linear-gradient(${rgba(l.col, l.a1)},${rgba(l.col2, l.a2)});`;
        } else {
          const u = dispU(l);
          s += `background:${u ? `url("${u}")` : 'none'} ${l.fx}% ${l.fy}%/cover no-repeat;` + mask(l);
          if ((!u && !l.lk) || BAD.has(u)) k = ' bad';
          if (u && !PRB.has(u)) {
            PRB.add(u);
            const i = new Image();
            i.referrerPolicy = 'no-referrer';
            i.onload = () => {
              BAD.delete(u);
              render();
            };
            i.onerror = () => {
              BAD_DIRECT.add(u);
              const proxyUrl = getProxiedUrl(u);
              if (proxyUrl && proxyUrl !== u) {
                const pi = new Image();
                pi.referrerPolicy = 'no-referrer';
                pi.onload = () => {
                  BAD.delete(u);
                  BAD.delete(proxyUrl);
                  render();
                };
                pi.onerror = () => {
                  BAD.add(u);
                  render();
                };
                pi.src = proxyUrl;
              } else {
                BAD.add(u);
                render();
              }
            };
            i.src = u;
          }
        }
      }
      e.style.cssText = s;
      e.className = 'ly2' + k + (l.lock ? ' lk' : '');
      cv.appendChild(e);
    });

    [...cv.children].forEach(e => {
      if (!keep.has(e.dataset.id)) e.remove();
    });

    S.layers.forEach(l => {
      if (l.t == 'text' && !l.hide) {
        const e = cv.querySelector(`[data-id="${l.id}"]`);
        if (e) l.h = e.offsetHeight;
      }
    });
    ovr();
  }

  function ovr() {
    const ov = $('#c-ov');
    if (!ov) return;
    const s = sl().filter(l => !l.hide), px = 1 / Z, z = 9 * px;
    let h = s.map(l => {
      const one = s.length == 1 && !l.lock;
      return `<div class="sb" style="left:${l.x}px;top:${l.y}px;width:${l.w}px;height:${l.h}px;border-width:${px}px;transform:rotate(${l.rot || 0}deg)">` +
        (one ? (l.t == 'text' ? ['w', 'e'] : ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'])
          .map(k => `<div class="hd" data-h="${k}" style="left:${k.includes('w') ? 0 : k.includes('e') ? 100 : 50}%;top:${k.includes('n') ? 0 : k.includes('s') ? 100 : 50}%;width:${z}px;height:${z}px;margin:${-z / 2}px 0 0 ${-z / 2}px;cursor:${k}-resize"></div>`).join('') +
          `<div class="gd" style="left:50%;top:${-26 * px}px;width:${px}px;height:${26 * px}px"></div><div class="hd" data-h="rot" style="left:50%;top:${-26 * px}px;width:${z * 1.3}px;height:${z * 1.3}px;margin:${-z * .65}px 0 0 ${-z * .65}px;border-radius:50%;cursor:grab"></div>` : '') +
        '</div>';
    }).join('');

    h += G.map(g => g.ax == 'x' ?
      `<div class="gd" style="left:${g.p}px;top:0;width:${px}px;height:100%"></div>` :
      `<div class="gd" style="top:${g.p}px;left:0;height:${px}px;width:100%"></div>`
    ).join('');
    ov.innerHTML = h;
  }

  function applyCameraTransform() {
    const world = $('#c-world');
    const C = $('#c-C');
    if (!world || !C) return;
    world.style.transform = `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.zoom})`;
    world.style.transformOrigin = '0 0';

    const dotSpacing = Math.max(12, Math.round(24 * camera.zoom));
    C.style.backgroundSize = `${dotSpacing}px ${dotSpacing}px`;
    C.style.backgroundPosition = `${camera.x % dotSpacing}px ${camera.y % dotSpacing}px`;
  }

  function applyFrameTransform() {
    const frame = $('#c-frame-container');
    if (!frame) return;
    frame.style.transform = `translate3d(${framePos.x}px, ${framePos.y}px, 0)`;
  }

  function updateZoomUI() {
    const zv = $('#c-zv');
    if (zv) zv.textContent = Math.round(camera.zoom * 100) + '%';
  }

  function sizeStage() {
    const frame = $('#c-frame-container');
    const SEl = $('#c-S');
    const cv = $('#c-cv');
    const rzH = $('#c-rz-h');
    const dims = $('#c-frame-dims');
    if (!SEl || !cv) return;

    SEl.style.width = S.W + 'px';
    SEl.style.height = S.H + 'px';
    cv.style.width = S.W + 'px';
    cv.style.height = S.H + 'px';

    if (frame) {
      frame.style.width = S.W + 'px';
    }
    if (rzH) rzH.textContent = S.H;
    if (dims) dims.textContent = `${S.W} × ${S.H}`;

    for (const [id, v] of [['c-tw', S.W], ['c-th', S.H]]) {
      const el = $('#' + id);
      if (el && document.activeElement !== el) el.value = v;
    }

    applyFrameTransform();
    applyCameraTransform();
    updateZoomUI();
  }

  const setZ = (z, centerPoint) => {
    const newZoom = Math.max(0.15, Math.min(4.0, z));
    const C = $('#c-C');
    if (!C) return;

    const cx = centerPoint ? centerPoint.x : C.clientWidth / 2;
    const cy = centerPoint ? centerPoint.y : C.clientHeight / 2;

    camera.x = cx - ((cx - camera.x) / camera.zoom) * newZoom;
    camera.y = cy - ((cy - camera.y) / camera.zoom) * newZoom;
    camera.zoom = newZoom;
    Z = camera.zoom;

    applyCameraTransform();
    updateZoomUI();
    ovr();
  };

  const fit = () => {
    const C = $('#c-C');
    if (!C) return;
    const padding = 80;
    const availableW = C.clientWidth - padding;
    const availableH = C.clientHeight - padding - 40;
    if (availableW <= 0 || availableH <= 0) return;

    const fitZoom = Math.min(1.5, Math.max(0.2, Math.min(availableW / S.W, availableH / S.H)));
    camera.zoom = fitZoom;
    Z = camera.zoom;
    framePos.x = 0;
    framePos.y = 0;
    applyFrameTransform();

    const framePixelW = S.W * camera.zoom;
    const framePixelH = S.H * camera.zoom;
    camera.x = Math.round((C.clientWidth - framePixelW) / 2);
    camera.y = Math.round(Math.max(30, (C.clientHeight - 40 - framePixelH) / 2 + 30));

    applyCameraTransform();
    updateZoomUI();
    ovr();
  };

  function layersUI() {
    const ll = $('#c-ll');
    if (!ll) return;
    ll.innerHTML = [...S.layers].reverse().map(l =>
      `<div class="bio-layer-row${SEL.includes(l.id) ? ' active' : ''}" data-id="${l.id}">
        <span class="bio-layer-name">${esc(l.name)}</span>
        ${lv(l) ? '<span class="bio-layer-badge">HTML</span>' : l.rot ? '<span class="bio-layer-badge">↻</span>' : ''}
        <button type="button" class="bio-layer-icon-btn${l.hide ? ' active' : ''}" data-a="hide" title="Show/Hide">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${l.hide ? '<circle cx="12" cy="12" r="3"></circle>' : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>'}</svg>
        </button>
        <button type="button" class="bio-layer-icon-btn${l.lock ? ' active' : ''}" data-a="lock" title="Lock Layer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${l.lock ? '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>' : '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path>'}</svg>
        </button>
      </div>`
    ).join('') || '<div style="padding:10px;text-align:center;color:var(--text-muted);font-size:11px;">No layers — add text, photo, or shape.</div>';
  }

  const COM = [
    ['x', 'X', 'n'],
    ['y', 'Y', 'n'],
    ['w', 'Width', 'n', 8],
    ['h', 'Height', 'n', 8],
    ['op', 'Opacity', 'n', 0, 1, .05],
    ['rot', 'Rotation, °', 'n', -360, 360]
  ];

  const FLD = {
    text: [
      ['txt', 'Text', 't'],
      ['ff', 'Font Family', 's', FONTS],
      ['fs', 'Size, px', 'n', 6, 300],
      ['fw', 'Weight', 's', [400, 700]],
      ['lh', 'Line Height', 'n', .8, 3, .05],
      ['al', 'Alignment', 's', ['left', 'center', 'right']],
      ['col', 'Color', 'c'],
      ['live', 'Text Mode', 's', [0, 1]]
    ],
    img: [
      ['src', 'media-approved URL', 'u'],
      ['fx', 'Focus X, %', 'n', 0, 100],
      ['fy', 'Focus Y, %', 'n', 0, 100],
      ['fT', 'Fade top, %', 'n', 0, 100],
      ['fB', 'Fade bottom, %', 'n', 0, 100],
      ['fL', 'Fade left, %', 'n', 0, 100],
      ['fR', 'Fade right, %', 'n', 0, 100],
      ['rad', 'Border radius, px', 'n', 0, 500]
    ],
    rect: [
      ['col', 'Top color', 'c'],
      ['a1', 'Top opacity', 'n', 0, 1, .05],
      ['col2', 'Bottom color', 'c'],
      ['a2', 'Bottom opacity', 'n', 0, 1, .05],
      ['rad', 'Border radius, px', 'n', 0, 500]
    ]
  };

  const PH = {
    src: 'https://ella.janitorai.com/media-approved/IMAGE_ID.webp',
    img: 'https://ella.janitorai.com/media-approved/IMAGE_ID.webp',
    au: 'https://discord.gg/invite_code',
    bu: 'https://discord.gg/invite_code'
  };

  function fh([k, n, t, a, b, s], v) {
    let i;
    if (t == 't') {
      i = `<textarea class="bio-f-textarea" data-k="${k}" rows="3">${esc(v)}</textarea>`;
    } else if (t == 's') {
      const isFont = k == 'ff';
      const selectedLabel = LB[v] || String(v).split(',')[0] || v;
      i = `<div class="claude-custom-select-wrap bio-custom-dropdown" data-k="${k}"${typeof a[0] == 'number' ? ' data-n="1"' : ''}>
        <button type="button" class="claude-custom-select-btn bio-dropdown-btn">
          <span class="selected-text" ${isFont ? `style="font-family:${esc(v)}"` : ''}>${esc(selectedLabel)}</span>
          <svg class="claude-select-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <div class="claude-custom-select-menu bio-dropdown-menu">
          ${a.map(o => {
            const lbl = LB[o] || String(o).split(',')[0] || o;
            const isAct = o == v;
            return `<div class="claude-select-option ${isAct ? 'active' : ''}" data-val="${esc(o)}">
              <span class="option-label" ${isFont ? `style="font-family:${esc(o)};font-size:13px;"` : ''}>${esc(lbl)}</span>
              <svg class="option-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    } else if (t == 'c') {
      i = `<input class="bio-f-color bio-f-input" type="color" data-k="${k}" value="${v}">`;
    } else if (t == 'u') {
      i = `<input class="bio-f-input" data-k="${k}" value="${esc(v)}"${PH[k] ? ` placeholder="${PH[k]}"` : ''}>`;
    } else {
      const stepVal = s || 1;
      i = `<div class="bio-num-group" data-k-parent="${k}">
        <button type="button" class="bio-num-step-btn" data-step-for="${k}" data-step="-${stepVal}">−</button>
        <input class="bio-num-step-input bio-f-input" type="text" inputmode="decimal" data-k="${k}" data-n="1" value="${v}" ${a != null ? `data-min="${a}"` : ''} ${b != null ? `data-max="${b}"` : ''} data-step="${stepVal}">
        <button type="button" class="bio-num-step-btn" data-step-for="${k}" data-step="${stepVal}">+</button>
      </div>`;
    }
    return `<label class="bio-f-label ${'tus'.includes(t) && t != 'c' ? 'w2' : ''}">${n}${i}</label>`;
  }

  function propsUI() {
    const s = sl(), el = $('#c-p1');
    if (!el) return;
    const key = SEL.join() + s.map(l => l.t).join();
    if (key == pk && el.innerHTML) return syncP();
    pk = key;

    if (!s.length) {
      el.innerHTML = `<h4 class="bio-sec-title">Canvas Properties</h4>
        <div class="bio-f-grid">
          ${fh(['W', 'Width, px', 'n', 200, 1200], S.W)}
          ${fh(['H', 'Height, px', 'n', 100, 4000], S.H)}
          ${fh(['bg', 'Background', 'c'], S.bg)}
        </div>
        <div class="bio-canvas-tips-box">
          <b>Design Coordinate Width:</b> Width defines the proportional canvas bounds. When published, covers span 100% available width seamlessly across desktop and mobile.
        </div>`;
      return;
    }

    const ty = [...new Set(s.map(l => l.t))];
    const f = [...COM.filter(c => !(c[0] == 'h' && ty.every(t => t == 'text'))), ...(ty.length == 1 ? FLD[ty[0]] : [])];

    let aiActionsHtml = '';
    if (ty.length == 1 && ty[0] == 'text') {
      aiActionsHtml = `<div class="bio-btn-row" style="margin-top:6px;">
        <button type="button" class="bio-c-btn ai-btn" data-ai="hook" title="Generate Hook Quote with Kimi">✨ AI Hook Quote</button>
        <button type="button" class="bio-c-btn ai-btn" data-ai="title" title="Generate Bot Title with Kimi">✨ AI Title</button>
      </div>`;
    } else if (ty.length == 1 && ty[0] == 'img') {
      aiActionsHtml = `<div class="bio-btn-row" style="margin-top:6px;">
        <button type="button" class="bio-c-btn ai-btn" data-ai="imgprompt" title="Generate Midjourney / FLUX Prompt with Kimi">✨ AI Image Prompt</button>
      </div>`;
    }

    el.innerHTML = `<h4 class="bio-sec-title">${s.length > 1 ? s.length + ' layers selected' : esc(s[0].name)}</h4>
      <div class="bio-f-grid">${f.map(x => fh(x, s[0][x[0]])).join('')}</div>
      ${aiActionsHtml}
      <div class="bio-btn-row" style="margin-top: 8px;">
        <button type="button" class="bio-c-btn" data-a="cx">Center X</button>
        <button type="button" class="bio-c-btn" data-a="cy">Center Y</button>
        <button type="button" class="bio-c-btn" data-a="r90">Rotate 90°</button>
        <button type="button" class="bio-c-btn" data-a="r0">Reset Rot</button>
      </div>` +
      (ty.length == 1 && ty[0] == 'img' ?
        `<div class="bio-btn-row" style="margin-top: 6px;">
          <button type="button" class="bio-c-btn" data-a="file">Local File…</button>
          <button type="button" class="bio-c-btn" data-a="nofile">Remove File</button>
        </div>
        <p class="bio-canvas-status-item" id="c-imgst"></p>` : '');
    syncP();
  }

  function syncP() {
    const s = sl()[0];
    $$('#c-p1 [data-k]').forEach(i => {
      if (i === document.activeElement) return;
      const v = s ? s[i.dataset.k] : S[i.dataset.k];
      if (v != null) {
        if (i.classList.contains('claude-custom-select-wrap')) {
          const btnText = i.querySelector('.selected-text');
          if (btnText) {
            const lbl = LB[v] || String(v).split(',')[0] || v;
            btnText.textContent = lbl;
            if (i.dataset.k === 'ff') btnText.style.fontFamily = v;
          }
          i.querySelectorAll('.claude-select-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.val == v);
          });
        } else {
          i.value = v;
        }
      }
    });
    const e = $('#c-imgst');
    if (e && s) {
      e.textContent = `URL: ${!s.src ? 'none' : OK.test(s.src) ? 'media-approved ✓' : 'not media-approved'} · Local file: ${s.lk ? 'attached' : 'none'}`;
    }
  }

  const pc = v => +(v / S.W * 100).toFixed(2) + '%';

  function cover() {
    if (S.mode == 'hyb') return hyb();
    if (S.mode == 'img') {
      return S.pub ? `<div style="width:100%;max-width:none;min-width:0;margin:0 auto"><img src="${q(S.pub.url)}" alt="${esc(S.alt || 'Cover')}" style="display:block;width:100%;height:auto"></div>` : '';
    }
    let o = `<div style="display:grid;grid-template-columns:minmax(0,1fr);width:100%;max-width:none;min-width:0;margin:0 auto;overflow:hidden;background:${S.bg}"><div style="grid-area:1/1;padding-top:${pc(S.H)}"></div>`;
    S.layers.forEach(l => {
      if (l.hide || l.rot) return;
      const geo = `grid-area:1/1;margin:${pc(l.y)} 0 0 ${pc(l.x)};width:${pc(l.w)};`;
      if (l.t == 'text') {
        o += `<div style="${geo}opacity:${l.op};font:${l.fw} ${l.fs}px/${l.lh} ${l.ff};color:${l.col};text-align:${l.al}">${esc(l.txt).replace(/\n/g, '<br>')}</div>`;
      } else {
        const bx = geo + `padding-top:${pc(l.h)};border-radius:${l.rad}px;`;
        if (l.t == 'rect') {
          o += `<div style="${bx}opacity:${l.op};background:linear-gradient(${rgba(l.col, l.a1)},${rgba(l.col2, l.a2)})"></div>`;
        } else {
          o += `<div role="img" aria-label="${esc(l.name)}" style="${bx}opacity:${l.op};background:url('${q(l.src)}') ${l.fx}% ${l.fy}%/cover no-repeat"></div>`;
          const fd = ['T', 'B', 'L', 'R'].map((k, i) => l['f' + k] > 0 ? `linear-gradient(${['to bottom', 'to top', 'to right', 'to left'][i]},${S.bg} 0,transparent ${l['f' + k]}%)` : '').filter(Boolean).join(',');
          if (fd) o += `<div style="${bx}background:${fd}"></div>`;
        }
      }
    });
    return o + '</div>';
  }

  function hyb() {
    if (!S.pub) return '';
    const T = S.layers.filter(l => lv(l) && !l.hide).sort((a, b) => a.y - b.y);
    let o = `<div${T.length ? '' : ` role="img" aria-label="${esc(S.alt || 'Cover')}"`} style="display:grid;grid-template-columns:minmax(0,1fr);width:100%;max-width:none;min-width:0;margin:0 auto;overflow:hidden;background:${S.bg} url('${q(S.pub.url)}') center top/100% auto no-repeat"><div style="grid-area:1/1;padding-top:${pc(S.H)};pointer-events:none"></div>`;
    T.forEach(l => {
      o += `<div style="grid-area:1/1;align-self:start;min-width:0;margin:${pc(l.y)} 0 0 ${pc(l.x)};width:${pc(l.w)};opacity:${l.op};font:${l.fw} ${l.fs}px/${l.lh} ${l.ff};color:${l.col};text-align:${l.al};white-space:pre-wrap;overflow-wrap:break-word">${esc(l.txt)}</div>`;
    });
    return o + '</div>';
  }

  const nl = t => esc(t || '').replace(/\n/g, '<br>');
  const bgu = u => u ? `url('${q(u)}') center/cover no-repeat` : '#1a2026';

  function secHTML(s) {
    const a = S.ac, x = S.tx, P = 'padding:18px 16px;', ln = rgba(a, .35);
    if (s.t == 'quote') return `<div style="${P}text-align:center;font:italic 20px/1.5 Georgia,serif;color:${x}">${nl(s.txt)}</div>`;
    if (s.t == 'divider') return `<div style="margin:10px 16px 0;padding:10px 0 6px;border-bottom:1px solid ${ln};font:700 22px/1.3 Georgia,serif;color:${a}">${nl(s.txt)}</div>`;
    if (s.t == 'text') return `<div style="${P}display:flex;flex-wrap:wrap;gap:16px"><div style="flex:1 1 180px;min-height:240px;border-radius:4px;background:${bgu(s.img)};${s.side == 'right' ? 'order:2' : ''}"></div><div style="flex:2 1 260px;min-width:0"><div style="font:700 22px/1.3 Georgia,serif;color:${a};margin:0 0 8px">${nl(s.title)}</div>${nl(s.txt)}</div></div>`;
    if (s.t == 'chars') return `<div style="display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:8px 16px 14px">${(s.items || []).map(c => `<div style="flex:0 0 78%;max-width:300px;scroll-snap-align:start;background:#171c21;border:1px solid ${ln};border-radius:4px;overflow:hidden"><div style="height:260px;background:${bgu(c.img)}"></div><div style="padding:12px 14px 16px"><div style="font:700 21px/1.25 Georgia,serif;color:${a}">${nl(c.name)}</div><div style="font:15px/1.5 Arial,sans-serif;color:${rgba(x, .7)};margin:4px 0 8px">${[c.gender, c.age, c.height].filter(Boolean).map(esc).join(' · ')}</div><div style="font:16px/1.6 Arial,sans-serif">${nl(c.desc)}</div></div></div>`).join('')}</div>`;
    if (s.t == 'intro') return `<div style="${P}">${(s.items || []).map(it => `<details style="border-top:1px solid ${ln};padding:10px 0"><summary style="cursor:pointer;font:700 17px/1.4 Georgia,serif;color:${a}">${esc(it.title)}</summary><div style="padding-top:8px">${nl(it.txt)}</div></details>`).join('')}</div>`;
    if (s.t == 'note') return `<div style="margin:14px 16px;padding:12px 16px;border-left:3px solid ${a};background:${rgba(a, .08)}">${nl(s.txt)}</div>`;
    if (s.t == 'audio') return `<div style="margin:16px 0;padding:0 18px;"><div style="background-color:rgba(15,12,10,0.92);border:1px solid ${rgba(a,0.3)};border-radius:14px;padding:16px;display:flex;flex-direction:column;align-items:center;gap:10px;box-shadow:0 8px 24px rgba(0,0,0,0.6);text-align:center;">${s.img ? `<div style="width:100%;height:180px;border-radius:8px;background:${bgu(s.img)};background-size:cover;background-position:center;margin-bottom:2px;"></div>` : ''}<div style="font:700 16px/1.3 Arial,sans-serif;color:${x};">${esc(s.title || 'Audio Track')}</div>${s.artist ? `<div style="font:13px/1.3 Arial,sans-serif;color:${rgba(x,0.7)};margin-top:-4px;">${esc(s.artist)}</div>` : ''}<audio controls preload="none" src="${q(s.src || '')}" style="width:100%;height:32px;outline:none;border-radius:8px;margin-top:4px;"></audio>${s.note ? `<div style="font:italic 12px/1.4 Georgia,serif;color:${rgba(x,0.65)};margin-top:2px;">${esc(s.note)}</div>` : ''}</div></div>`;
    if (s.t == 'polaroid') return `<div style="margin:26px 16px 18px;text-align:center;"><div style="display:inline-block;max-width:440px;width:100%;background:#ece6da;padding:18px 12px 22px;border-radius:2px;box-shadow:0 10px 25px rgba(0,0,0,0.5);transform:rotate(${s.rot || -1.5}deg);box-sizing:border-box;"><div style="width:62px;height:20px;margin:-28px auto 10px;background:${s.tape || 'rgba(221,208,138,0.75)'};transform:rotate(${s.rot ? -s.rot * 1.5 : 3}deg);box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div><div style="width:100%;height:260px;background:${bgu(s.img)};background-size:cover;background-position:center;border-radius:2px;"></div>${s.caption ? `<div style="margin-top:12px;font:italic 15px/1.4 Georgia,serif;color:#2c2a25;">${esc(s.caption)}</div>` : ''}</div></div>`;
    if (s.t == 'ticket') return `<div style="margin:20px 14px;transform:rotate(${s.rot || -0.4}deg);box-sizing:border-box;"><div aria-hidden="true" style="height:9px;background-color:#383344;background-image:radial-gradient(circle at 9px 0px,${S.bg} 0px,${S.bg} 4px,transparent 5px);background-size:18px 10px;background-repeat:repeat-x;"></div><div style="padding:18px 18px 22px;background-color:#383344;background-image:repeating-linear-gradient(0deg,transparent 0,transparent 24px,rgba(255,255,255,0.03) 24px,rgba(255,255,255,0.03) 25px);border:1px solid rgba(255,255,255,0.12);border-top:none;border-radius:0 0 6px 6px;box-shadow:0 8px 20px rgba(0,0,0,0.35);"><div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px;"><span style="display:inline-block;padding:3px 8px;border:1px dashed ${a};transform:rotate(-3deg);font:700 11px/1.4 'Courier New',monospace;letter-spacing:1px;color:${a};">${esc(s.tag || 'RECORD')}</span><span style="display:inline-block;padding:3px 8px;background:${rgba(a,0.2)};border:1px solid ${rgba(a,0.4)};transform:rotate(2deg);font:700 11px/1.4 'Courier New',monospace;color:${x};">${esc(s.badge || 'VERIFIED')}</span></div><div style="font:italic 700 24px/1.2 Georgia,serif;color:${a};margin-bottom:8px;text-align:center;">${esc(s.title || 'Official Ticket')}</div><div style="display:flex;justify-content:center;margin:10px 0;"><span style="display:inline-block;padding:6px 12px;border:2px solid ${rgba(a,0.7)};border-radius:50%;transform:rotate(-6deg);font:700 10px/1.3 'Courier New',monospace;color:${a};text-align:center;">${esc(s.seal || 'OFFICIAL')}<br>ARCHIVE</span></div><div style="font:14px/1.65 Arial,sans-serif;color:${x};margin-top:10px;">${nl(s.txt)}</div></div></div>`;
    if (s.t == 'gallery') return `<div style="margin:20px 0;padding:6px 0;"><div style="display:flex;gap:16px;max-width:100%;overflow-x:auto;scroll-snap-type:x mandatory;padding:20px 20px 24px;scrollbar-width:thin;">${(s.items || []).map((it, idx) => {
      const rot = [-1.8, 1.2, -0.8, 1.9, -1.3, 0.9][idx % 6];
      const tapeRot = [2.5, -5, 4, -2, 4.5, -3.5][idx % 6];
      return `<div style="flex:0 0 min(72%,320px);scroll-snap-align:start;background:#ece6da;padding:16px 10px 14px;transform:rotate(${rot}deg);box-shadow:0 8px 20px rgba(0,0,0,0.4);border-radius:3px;box-sizing:border-box;"><div style="width:52px;height:18px;margin:-25px auto 10px;background:${it.tape || s.tape || 'rgba(229,72,95,0.8)'};transform:rotate(${tapeRot}deg);"></div><div style="width:100%;height:220px;background:${bgu(it.img)};background-size:cover;background-position:center;border-radius:2px;"></div><div style="margin-top:10px;font:700 14px/1.3 Arial,sans-serif;color:#1a1917;text-align:center;">${esc(it.name || '')}</div>${it.caption ? `<div style="font:italic 12px/1.4 Georgia,serif;color:#555;text-align:center;margin-top:2px;">${esc(it.caption)}</div>` : ''}</div>`;
    }).join('')}</div></div>`;
    if (s.t == 'warning') return `<div style="margin:16px 16px;"><details style="background:${rgba(a,0.08)};border:1px dashed ${rgba(a,0.5)};border-radius:6px;overflow:hidden;"><summary style="cursor:pointer;padding:10px 16px;text-align:center;font:700 12px/1.4 'Courier New',Arial,sans-serif;letter-spacing:1px;color:${a};user-select:none;">${esc(s.title || 'CONTENT WARNING')}</summary><div style="padding:4px 16px 14px;text-align:center;font:14px/1.6 Arial,sans-serif;color:${x};">${nl(s.txt)}</div></details></div>`;
    if (s.t == 'roster') return `<div style="margin:24px 16px;">${s.title ? `<div style="font:700 12px/1.4 'Courier New',sans-serif;letter-spacing:2px;color:${a};margin-bottom:12px;text-transform:uppercase;">${esc(s.title)}</div>` : ''}<div style="display:flex;flex-direction:column;gap:8px;">${(s.items || []).map((it, idx) => {
      const col = it.color || ['#e5485f', '#e3b04b', '#79c7e8', '#a855f7'][idx % 4];
      const rot = [-0.6, 0.5, -0.4, 0.7][idx % 4];
      return `<div style="padding:12px 14px;border-left:10px solid ${col};background:${rgba(col,0.12)};border-radius:0 4px 4px 0;transform:rotate(${rot}deg);box-sizing:border-box;"><div style="font:700 18px/1.2 Arial,sans-serif;text-transform:uppercase;color:${x};">${esc(it.name || `Member ${idx + 1}`)}</div><div style="font:13px/1.4 Arial,sans-serif;color:${rgba(x,0.75)};margin-top:2px;">${esc(it.role || '')}</div>${it.desc ? `<div style="font:13px/1.5 Arial,sans-serif;color:${rgba(x,0.9)};margin-top:6px;">${esc(it.desc)}</div>` : ''}</div>`;
    }).join('')}</div></div>`;
    return `<div style="display:flex;flex-wrap:wrap;gap:12px;padding:14px 16px">${[[s.an, s.au], [s.bn, s.bu]].map(([n, u]) => {
      const st = `flex:1 1 220px;display:block;padding:16px;border:1px solid ${rgba(a, .45)};border-radius:4px;background:#171c21;text-decoration:none;color:${x};font:700 19px/1.3 Georgia,serif`, ct = `${esc(n)}<div style="font:15px Arial,sans-serif;color:${rgba(x, .7)};margin-top:4px">Join Discord</div>`;
      return u ? `<a href="${esc(u)}" style="${st}">${ct}</a>` : `<div style="${st}">${ct}</div>`;
    }).join('')}</div>`;
  }

  const pageHTML = () => S.sections.length ? `<div style="width:100%;max-width:none;min-width:0;margin:0 auto;background:${S.bg};color:${S.tx};font:16px/1.65 Arial,sans-serif">${S.sections.map(secHTML).join('')}</div>` : '';
  const full = () => (cover() + pageHTML() + S.legacy.filter(x => x.on).map(x => x.h).join('')).trim().replace(/\r?\n\s*/g, ' ');

  function warns() {
    const w = [], im = S.mode != 'live';
    S.layers.forEach(l => {
      if (l.hide) return;
      if (l.t == 'text') {
        if (!l.txt.trim()) w.push(`"${l.name}": empty text`);
        if (im && !(S.mode == 'hyb' && l.live) && l.fs * 360 / S.W < 12) {
          w.push(`"${l.name}": at 360px viewport text becomes ≈${Math.round(l.fs * 360 / S.W)}px — too small. Increase font size or reduce canvas width.`);
        }
      }
      if (l.t == 'img') {
        const u = dispU(l);
        if (!l.src && !l.lk) w.push(`"${l.name}": no image`);
        else if (u && BAD.has(u)) w.push(`"${l.name}": image URL failed to load — check URL or attach local file`);
        if (!im) {
          if (!l.src) w.push(`"${l.name}": Live HTML requires an approved URL (local file cannot be published)`);
          else if (!OK.test(l.src)) w.push(`"${l.name}": URL not from media-approved — Bio Studio will reject it`);
        }
      }
    });

    if (im) {
      if (!S.pub) w.push('Image not uploaded: download PNG, upload to JanitorAI media library, and link approved URL.');
      else if (!OK.test(S.pub.url)) w.push('Image URL is not from media-approved domain.');
      else if (S.pub.h !== sig()) w.push('⚠ Published image OUTDATED: canvas composition changed after linking URL. Re-export and upload again.');
    }
    if (S.mode == 'live' && S.layers.some(l => !l.hide && l.rot)) {
      w.push('Rotated layers in "Live HTML" are skipped (rotation unverified on JanitorAI). Use "Hybrid" or "Image": rotated layers are baked in.');
    }
    if (S.mode == 'hyb') {
      const T = S.layers.filter(l => lv(l) && !l.hide).sort((a, b) => a.y - b.y);
      T.forEach((l, i) => {
        if (i && l.y < T[i - 1].y + T[i - 1].h - 1) {
          w.push(`Live text "${l.name}" vertically overlaps "${T[i - 1].name}" — in HTML it will stack below. Separate them or bake one into the image.`);
        }
      });
      S.layers.forEach((a, i) => {
        if (lv(a) && !a.hide) {
          S.layers.slice(i + 1).forEach(b => {
            if (b.t != 'text' && !b.hide && b.x < a.x + a.w && b.x + b.w > a.x && b.y < a.y + a.h && b.y + b.h > a.y) {
              w.push(`"${b.name}" is layered above live text "${a.name}", but in hybrid mode live text is always on top.`);
            }
          });
        }
      });
    }
    if (S.mode != 'live' && !S.sections.length && !S.legacy.some(x => x.on) && !(S.mode == 'hyb' && S.layers.some(l => lv(l) && !l.hide))) {
      w.push('Output consists solely of an image. Consider setting some text to live ("Text mode" in properties) or adding page sections.');
    }
    S.sections.forEach(s => {
      const im2 = s.t == 'text' ? [s.img] : s.t == 'chars' ? s.items.map(c => c.img) : [];
      im2.forEach(u => {
        if (u && !OK.test(u)) w.push(`${SC[s.t][0]}: photo URL is not media-approved — Bio Studio will reject it`);
      });
      if (s.t == 'discord') {
        [[s.an, s.au], [s.bn, s.bu]].forEach(([n, u]) => {
          if (!/^https:\/\/\S+$/.test(u || '')) w.push(`Discord "${n}": enter invite link https://…`);
        });
      }
    });
    return w;
  }

  function exportUI() {
    const m = S.mode;
    const btnImg = $('#c-m-img'), btnHyb = $('#c-m-hyb'), btnLive = $('#c-m-live');
    if (btnImg) btnImg.classList.toggle('active', m == 'img');
    if (btnHyb) btnHyb.classList.toggle('active', m == 'hyb');
    if (btnLive) btnLive.classList.toggle('active', m == 'live');
    const ib = $('#c-imgbox');
    if (ib) ib.hidden = m == 'live';

    const mh = $('#c-mh');
    if (mh) {
      mh.textContent = {
        img: 'Everything is baked into a single image: text is not selectable. Layers remain in project.',
        hyb: 'Photos, shapes, and "In Image" text are baked into background; "Live HTML" text stays real selectable text over background, preserving relative placement. Rotated layers are always baked.',
        live: 'Layers are assembled with live CSS grid overlays. Unverified on JanitorAI — see "Compatibility". Containers scale with width, font size does not.'
      }[m];
    }

    const w = warns(), p = $('#c-pst');
    if (p) {
      p.className = S.pub ? (S.pub.h === sig() ? 'bio-alert-item success' : 'bio-alert-item warning') : 'bio-canvas-status-item';
      p.textContent = S.pub ? (S.pub.h === sig() ? '✓ URL matches current composition' : '⚠ Image outdated — upload new version') : 'URL not linked';
    }

    const wn = $('#c-wn');
    if (wn) {
      wn.innerHTML = w.length ? w.map(x => `<div class="bio-alert-item warning">⚠ ${esc(x)}</div>`).join('') : '<div class="bio-alert-item success">✓ No issues found</div>';
    }

    const cd = $('#c-code');
    if (cd) cd.value = full();
  }

  // Canvas 2D Painter for PNG/WebP Export
  const wrap = (g, t, w) => {
    const o = [];
    t.split('\n').forEach(p => {
      let ln = '';
      p.split(' ').forEach(wd => {
        const tr = ln ? ln + ' ' + wd : wd;
        if (g.measureText(tr).width > w && ln) {
          o.push(ln);
          ln = wd;
        } else ln = tr;
      });
      o.push(ln);
    });
    return o;
  };

  async function paint(sc) {
    if (S.W * sc > 8192 || S.H * sc > 16384) throw Error('Dimensions too large: reduce export scale.');
    try { await document.fonts.ready; } catch {}
    const c = document.createElement('canvas');
    c.width = Math.round(S.W * sc);
    c.height = Math.round(S.H * sc);
    const g = c.getContext('2d');
    g.scale(sc, sc);
    g.fillStyle = S.bg;
    g.fillRect(0, 0, S.W, S.H);
    const bad = [];

    for (const l of S.layers) {
      if (l.hide) continue;
      g.save();
      g.globalAlpha = l.op;
      if (l.rot) {
        const cx = l.x + l.w / 2, cy = l.y + l.h / 2;
        g.translate(cx, cy);
        g.rotate(l.rot * Math.PI / 180);
        g.translate(-cx, -cy);
      }
      if (l.t == 'rect') {
        const r = g.createLinearGradient(0, l.y, 0, l.y + l.h);
        r.addColorStop(0, rgba(l.col, l.a1));
        r.addColorStop(1, rgba(l.col2, l.a2));
        g.fillStyle = r;
        g.beginPath();
        g.roundRect(l.x, l.y, l.w, l.h, l.rad);
        g.fill();
      } else if (l.t == 'img') {
        const u = (l.lk && S.imgs[l.lk]) || l.src;
        let im = null;
        if (u) {
          try {
            im = await new Promise((ok, no) => {
              const i = new Image();
              i.crossOrigin = 'anonymous';
              i.onload = () => ok(i);
              i.onerror = no;
              i.src = u;
            });
          } catch {}
        }
        if (!im) {
          bad.push(`"${l.name}": ${u ? 'failed to load for export (CORS blocked or URL unavailable). Attach local file: photo properties → "Local File…"' : 'no URL or file'}`);
        } else {
          const o = document.createElement('canvas');
          o.width = Math.ceil(l.w * sc);
          o.height = Math.ceil(l.h * sc);
          const t = o.getContext('2d');
          t.scale(sc, sc);
          t.beginPath();
          t.roundRect(0, 0, l.w, l.h, l.rad);
          t.clip();
          const k = Math.max(l.w / im.naturalWidth, l.h / im.naturalHeight), dw = im.naturalWidth * k, dh = im.naturalHeight * k;
          t.drawImage(im, (l.w - dw) * l.fx / 100, (l.h - dh) * l.fy / 100, dw, dh);
          t.globalCompositeOperation = 'destination-out';
          [['fT', 0, 0, 0, 1], ['fB', 0, l.h, 0, -1], ['fL', 0, 0, 1, 0], ['fR', l.w, 0, -1, 0]].forEach(([f, x, y, sx, sy]) => {
            const v = l[f];
            if (v > 0) {
              const d = (sx ? l.w : l.h) * v / 100, r = t.createLinearGradient(x, y, x + sx * d, y + sy * d);
              r.addColorStop(0, '#000');
              r.addColorStop(1, 'rgba(0,0,0,0)');
              t.fillStyle = r;
              t.fillRect(sx < 0 ? l.w - d : 0, sy < 0 ? l.h - d : 0, sx ? d : l.w, sy ? d : l.h);
            }
          });
          g.drawImage(o, l.x, l.y, l.w, l.h);
        }
      } else if (!(S.mode == 'hyb' && lv(l))) {
        g.font = `${l.fw} ${l.fs}px ${l.ff}`;
        g.fillStyle = l.col;
        g.textBaseline = 'middle';
        g.textAlign = l.al;
        const lh = l.fs * l.lh, x = l.al == 'center' ? l.x + l.w / 2 : l.al == 'right' ? l.x + l.w : l.x;
        wrap(g, l.txt, l.w).forEach((s, i) => g.fillText(s, x, l.y + (i + .5) * lh));
      }
      g.restore();
    }
    if (bad.length) throw Error(bad.join('\n'));
    return c;
  }

  async function expImg(type) {
    const sc = +$('#c-sc').value, es = $('#c-es');
    say('Preparing image…');
    if (es) es.className = 'bio-canvas-status-item';
    try {
      const c = await paint(sc), b = await new Promise(r => c.toBlob(r, type, .92));
      if (!b) throw Error('Browser failed to create blob: try PNG or lower scale.');
      dl(b, 'cover.' + (type == 'image/png' ? 'png' : 'webp'), type);
      const kb = Math.round(b.size / 1024);
      if (es) {
        es.textContent = `${c.width}×${c.height} px, ${kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB'}` + (b.size > 2e6 ? ' — large file: reduce scale or choose WebP' : '');
      }
      say('Downloaded. Upload to JanitorAI media library and paste approved link below.');
    } catch (e) {
      say(e.message.split('\n')[0], 1);
      if (es) {
        es.className = 'bio-alert-item warning';
        es.innerHTML = esc(e.message).replace(/\n/g, '<br>');
      }
    }
  }

  const dl = (b, n, t) => {
    const u = URL.createObjectURL(b instanceof Blob ? b : new Blob([b], { type: t })), a = document.createElement('a');
    a.href = u;
    a.download = n;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
  };

  // Sections Model & UI
  const SC = {
    quote: ['Quote', [['txt', 'Text', 't']]],
    text: ['Text with Photo', [['title', 'Heading', 'u'], ['txt', 'Text', 't'], ['img', 'Photo (media-approved)', 'u'], ['side', 'Photo Position', 's', ['left', 'right']]]],
    chars: ['Characters'],
    intro: ['Starter Options'],
    audio: ['Audio / Voice Note', [['title', 'Track Title', 'u'], ['artist', 'Artist / Speaker', 'u'], ['src', 'Audio URL (Catbox/Approved)', 'u'], ['img', 'Album Art / Avatar', 'u'], ['note', 'Caption Note', 'u']]],
    polaroid: ['Scotch Tape Polaroid', [['caption', 'Caption / Signature', 'u'], ['img', 'Photo (media-approved)', 'u'], ['tape', 'Tape Color (e.g. rgba(221,208,138,0.75))', 'u'], ['rot', 'Tilt Angle (-5 to 5)', 'n']]],
    ticket: ['Perforated Ticket', [['title', 'Ticket Title', 'u'], ['txt', 'Lore / Narrative', 't'], ['tag', 'Stamp Tag (e.g. RECORD)', 'u'], ['badge', 'Status Badge (e.g. VERIFIED)', 'u'], ['seal', 'Postal Seal Text', 'u'], ['rot', 'Tilt Angle (-2 to 2)', 'n']]],
    gallery: ['Swipe Photo Gallery'],
    warning: ['Content Warning Box', [['title', 'Warning Title', 'u'], ['txt', 'Warning Details', 't']]],
    roster: ['Team / Route Roster', [['title', 'Roster Title', 'u']]],
    note: ['Author Note', [['txt', 'Text', 't']]],
    discord: ['Discord Banners', [['an', 'Server 1', 'u'], ['au', 'Invite 1', 'u'], ['bn', 'Server 2', 'u'], ['bu', 'Invite 2', 'u']]],
    divider: ['Section Divider', [['txt', 'Text', 'u']]]
  };

  const IT = {
    chars: [['img', 'Photo (media-approved)', 'u'], ['name', 'Full Name', 'u'], ['gender', 'Gender', 'u'], ['age', 'Age', 'u'], ['height', 'Height', 'u'], ['desc', 'Description', 't']],
    intro: [['title', 'Option Title', 'u'], ['txt', 'Text', 't']],
    gallery: [['img', 'Photo (media-approved)', 'u'], ['name', 'Photo Title', 'u'], ['caption', 'Caption / Quote', 'u'], ['tape', 'Tape Color', 'u']],
    roster: [['name', 'Member Name', 'u'], ['role', 'Role / Subtitle', 'u'], ['color', 'Border Color (#hex)', 'c'], ['desc', 'Description / Stats', 't']]
  };

  const newItem = t => {
    if (t == 'chars') return { img: '', name: 'Character Name', gender: 'Female', age: '24', height: '170 cm', desc: 'Personality and character overview.' };
    if (t == 'intro') return { title: 'Option 1', txt: 'Intro scenario text...' };
    if (t == 'gallery') return { img: '', name: 'Photo Subject', caption: 'Memories...', tape: 'rgba(229, 72, 95, 0.82)' };
    if (t == 'roster') return { name: 'Sarah Hall', role: 'Project Manager', color: '#e5485f', desc: 'High expectations and zero tolerance for missed work.' };
    return {};
  };

  const newSec = t => ({
    id: rid(),
    t,
    ...({
      quote: { txt: '«A quote that hooks the reader from the first line.»' },
      text: { title: 'Lore & Backstory', txt: 'Section text goes here.', img: '', side: 'left' },
      chars: { items: [newItem('chars')] },
      intro: { items: [{ title: 'Option 1', txt: 'Describe the starting scenario.' }] },
      audio: { title: 'Now Playing', artist: 'Artist / Speaker', src: '', img: '', note: 'Catbox audio stream 🎧' },
      polaroid: { caption: 'Polaroid snapshot', img: '', tape: 'rgba(221, 208, 138, 0.75)', rot: -1.5 },
      ticket: { title: 'Campus Ticket', txt: 'Lore and narrative backstory.', tag: 'ANYPOV · DRAMA', badge: 'PREMISE', seal: 'RECORD', rot: 0.3 },
      gallery: { tape: 'rgba(229, 72, 95, 0.82)', items: [newItem('gallery')] },
      warning: { title: 'CONTENT WARNING', txt: 'Grief, angst, emotional distress, or other trigger warnings.' },
      roster: { title: 'Project Roster', items: [newItem('roster')] },
      note: { txt: 'Author Note.' },
      discord: { an: "Mina's Toybox", au: '', bn: "Zero's Cohort", bu: '' },
      divider: { txt: 'Section Title' }
    }[t])
  });

  const sf = (f, v, i, j) => fh(f, v || '').replace('data-k=', `data-i="${i}" ${j != null ? `data-j="${j}" ` : ''}data-k=`);

  function secUI() {
    const el = $('#c-p4');
    if (!el) return;
    el.innerHTML = `<div class="bio-f-grid">
        ${fh(['tx', 'Text Color', 'c'], S.tx)}
        ${fh(['ac', 'Accent Color', 'c'], S.ac)}
      </div>
      <div class="bio-canvas-tips-box">
        Page background matches canvas background. Sections are rendered sequentially below the cover.
      </div>
      <div class="bio-btn-row">
        ${Object.keys(SC).map(t => `<button type="button" class="bio-c-btn" data-new="${t}">+ ${SC[t][0]}</button>`).join('')}
      </div>
      <div class="bio-btn-row" style="margin-top: 4px;">
        <button type="button" class="bio-c-btn ai-btn" data-ai="chars-gen">✨ AI Add Characters</button>
        <button type="button" class="bio-c-btn ai-btn" data-ai="intro-gen">✨ AI Add Starter Options</button>
      </div>` +
      S.sections.map((s, i) =>
        `<div class="bio-sec-card" data-si="${i}">
          <div class="bio-sec-header">
            <span class="bio-sec-title">${SC[s.t] ? SC[s.t][0] : s.t}</span>
            <div class="bio-btn-row">
              <button type="button" class="bio-c-btn" data-s="up">↑</button>
              <button type="button" class="bio-c-btn" data-s="dn">↓</button>
              <button type="button" class="bio-c-btn" data-s="x">×</button>
            </div>
          </div>
          ${s.items ?
            s.items.map((it, j) =>
              `<div class="bio-item-row" data-ij="${j}">
                <div class="bio-f-grid">${IT[s.t] ? IT[s.t].map(f => sf(f, it[f[0]], i, j)).join('') : ''}</div>
                <div style="margin-top:6px; display:flex; justify-content:flex-end;">
                  <button type="button" class="bio-c-btn" data-s="ix">Remove Item</button>
                </div>
              </div>`
            ).join('') + (s.t == 'intro' && s.items.length >= 10 ? '' : `<div style="margin-top: 6px;"><button type="button" class="bio-c-btn" data-s="ia">+ ${s.t == 'chars' ? 'Card' : s.t == 'gallery' ? 'Photo' : s.t == 'roster' ? 'Member' : 'Option'}</button></div>`) :
            `<div class="bio-f-grid">${SC[s.t] && SC[s.t][1] ? SC[s.t][1].map(f => sf(f, s[f[0]], i)).join('') : ''}</div>`
          }
        </div>`
      ).join('');
  }

  // Compatibility Inspector
  const CP = [
    ['Inline styles (color, font, margin, padding, border, background)', 'ok', 'Verified in practice.'],
    ['Horizontal scroll / swipe (overflow-x:auto)', 'ok', ''],
    ['details/summary accordions', 'ok', ''],
    ['Single-line HTML without indentation', 'ok', 'Prevents Markdown code block wrapping.'],
    ['media-approved images (img and url())', 'ok', ''],
    ['CSS grid cell overlay (grid-area:1/1)', 'new', 'Core of Live mode. Test T1'],
    ['Negative margins', 'new', 'T2'],
    ['position:absolute', 'new', 'One unconfirmed report of layers stacking vertically. T3'],
    ['mask-image (fade gradients)', 'new', 'T4'],
    ['padding-top in % (aspect ratio)', 'new', 'T5'],
    ['linear-gradient in background', 'new', 'T6'],
    ['aspect-ratio property', 'new', 'T7'],
    ['Custom web fonts, JS, iframe, SVG, data URI', 'new', 'Do not use until verified.'],
    ['Flex layout (flex-wrap, gap): "Page" sections', 'new', 'Used in previous Bio, not individually verified. T8'],
    ['scroll-snap (character carousel)', 'new', 'Swipe works, snap behavior unconfirmed. T9']
  ];

  function cmpUI() {
    let st = {};
    try { st = JSON.parse(localStorage.getItem('singularity_bc:cmp') || '{}'); } catch {}
    const ST = { ok: 'Verified on JanitorAI', loc: 'Verified locally only', new: 'Unverified', no: 'Not supported' };
    const el = $('#c-p3');
    if (!el) return;
    el.innerHTML = `<div class="bio-canvas-tips-box">
        Compatibility statuses reflect testing against JanitorAI live profile markdown engine.
      </div>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        ${CP.map((r, i) => {
          const curVal = st[i] || r[1];
          const curLabel = ST[curVal] || curVal;
          return `<tr><td style="padding:6px 0;border-bottom:1px solid var(--border-subtle);">
            <div style="font-weight:500;color:var(--text-primary);">${r[0]}</div>
            <small style="color:var(--text-muted);display:block;margin:2px 0 6px;">${r[2]}</small>
            <div class="claude-custom-select-wrap bio-custom-dropdown" data-cmp-i="${i}" style="width:100%;max-width:240px;">
              <button type="button" class="claude-custom-select-btn bio-dropdown-btn" style="height:30px;padding:4px 10px;width:100%;min-width:0;">
                <span class="selected-text" style="font-size:11px;">${esc(curLabel)}</span>
                <svg class="claude-select-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <div class="claude-custom-select-menu bio-dropdown-menu">
                ${Object.entries(ST).map(([k, v]) => `
                  <div class="claude-select-option ${k == curVal ? 'active' : ''}" data-val="${k}">
                    <span>${v}</span>
                    <svg class="option-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                `).join('')}
              </div>
            </div>
          </td></tr>`;
        }).join('')}
      </table>`;

    el.onclick = e => {
      const dropBtn = e.target.closest('.bio-dropdown-btn, .claude-custom-select-btn');
      if (dropBtn) {
        e.stopPropagation();
        const wrap = dropBtn.closest('.claude-custom-select-wrap');
        const wasOpen = wrap.classList.contains('open');
        $$('.claude-custom-select-wrap.open').forEach(w => w.classList.remove('open'));
        if (!wasOpen) wrap.classList.add('open');
        return;
      }
      const opt = e.target.closest('.claude-select-option');
      if (opt) {
        e.stopPropagation();
        const wrap = opt.closest('.claude-custom-select-wrap');
        const idx = wrap.dataset.cmpI;
        const val = opt.dataset.val;
        st[idx] = val;
        wrap.querySelector('.selected-text').textContent = ST[val];
        wrap.querySelectorAll('.claude-select-option').forEach(o => o.classList.toggle('active', o === opt));
        wrap.classList.remove('open');
        try { localStorage.setItem('singularity_bc:cmp', JSON.stringify(st)); } catch { say('Status not saved in browser', 1); }
      }
    };
  }

  function tab(n) {
    $$('.bio-inspector-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab == n));
    [1, 2, 3, 4].forEach(i => {
      const p = $('#c-p' + i);
      if (p) p.hidden = i != n;
    });
    if (n == 2) exportUI();
  }

  function ui() {
    const un = $('#c-b-un'), re = $('#c-b-re');
    if (un) un.disabled = hi <= 0;
    if (re) re.disabled = hi >= hist.length - 1;
    layersUI();
    propsUI();
    exportUI();
    ovr();
    if (isAltHeld) renderRedlines();
  }

  function add(t) {
    const l = mk(t, t == 'rect' ? { w: S.W, h: 120, x: 0, y: S.H - 120 } : {});
    S.layers.push(l);
    SEL = [l.id];
    render();
    commit();
  }

  function dup() {
    const n = sl().map(l => ({ ...l, id: rid(), name: l.name + ' copy', x: l.x + 16, y: l.y + 16 }));
    if (!n.length) return;
    S.layers.push(...n);
    SEL = n.map(l => l.id);
    render();
    commit();
  }

  function del() {
    if (!SEL.length) return;
    S.layers = S.layers.filter(l => !SEL.includes(l.id));
    SEL = [];
    render();
    commit();
  }

  function ord(d) {
    const a = S.layers, ix = a.map((l, i) => i).filter(i => SEL.includes(a[i].id));
    if (d > 0) ix.reverse();
    ix.forEach(i => {
      const j = i + d;
      if (j < 0 || j >= a.length || SEL.includes(a[j].id)) return;
      [a[i], a[j]] = [a[j], a[i]];
    });
    render();
    commit();
  }

  function setComp(c) {
    Object.assign(S, {
      W: c.W,
      H: c.H,
      bg: c.bg,
      layers: c.layers || [],
      sections: c.sections || [],
      tx: c.tx || S.tx || '#d8d2c8',
      ac: c.ac || S.ac || '#d9a273',
      pub: null
    });
    SEL = [];
    pk = '\0';
    sizeStage();
    render();
    commit();
    fit();
    secUI();
  }

  // Figma Precision Tools: Alignment Toolbar
  function alignLayers(mode) {
    const selected = sl().filter(l => !l.lock);
    if (!selected.length) {
      say('Select layer(s) to align', 1);
      return;
    }
    histPush();

    if (selected.length === 1) {
      const l = selected[0];
      if (mode === 'left') l.x = 0;
      else if (mode === 'center') l.x = Math.round((S.W - l.w) / 2);
      else if (mode === 'right') l.x = Math.round(S.W - l.w);
      else if (mode === 'top') l.y = 0;
      else if (mode === 'middle') l.y = Math.round((S.H - l.h) / 2);
      else if (mode === 'bottom') l.y = Math.round(S.H - l.h);
    } else {
      if (mode === 'left') {
        const minX = Math.min(...selected.map(l => l.x));
        selected.forEach(l => l.x = minX);
      } else if (mode === 'center') {
        const minX = Math.min(...selected.map(l => l.x));
        const maxX = Math.max(...selected.map(l => l.x + l.w));
        const midX = (minX + maxX) / 2;
        selected.forEach(l => l.x = Math.round(midX - l.w / 2));
      } else if (mode === 'right') {
        const maxX = Math.max(...selected.map(l => l.x + l.w));
        selected.forEach(l => l.x = Math.round(maxX - l.w));
      } else if (mode === 'top') {
        const minY = Math.min(...selected.map(l => l.y));
        selected.forEach(l => l.y = minY);
      } else if (mode === 'middle') {
        const minY = Math.min(...selected.map(l => l.y));
        const maxY = Math.max(...selected.map(l => l.y + l.h));
        const midY = (minY + maxY) / 2;
        selected.forEach(l => l.y = Math.round(midY - l.h / 2));
      } else if (mode === 'bottom') {
        const maxY = Math.max(...selected.map(l => l.y + l.h));
        selected.forEach(l => l.y = Math.round(maxY - l.h));
      }
    }
    render();
    later();
    say(`Aligned selection (${mode})`);
  }

  // Snapping logic & Guides
  function snapA(n, w, ax) {
    const C = ax == 'x' ? S.W : S.H, T = 6 / Z, cs = [0, C / 2, C];
    let b = null;
    S.layers.forEach(o => {
      if (!o.hide && !D.o.some(a => a[0] == o)) {
        const B = bb(o), a = ax == 'x' ? B.x : B.y, s = ax == 'x' ? B.w : B.h;
        cs.push(a, a + s / 2, a + s);
      }
    });
    for (const c of cs) {
      for (const k of [0, w / 2, w]) {
        const d = c - (n + k);
        if (Math.abs(d) <= T && (!b || Math.abs(d) < Math.abs(b.d))) b = { d, c };
      }
    }
    return b ? { v: n + b.d, g: b.c } : { v: n };
  }

  function renderGuides(guides) {
    const el = document.getElementById('c-guides');
    if (!el) return;
    if (!guides || !guides.length) {
      if (!isAltHeld) el.innerHTML = '';
      return;
    }
    el.innerHTML = guides.map(g => {
      if (g.ax === 'x') {
        return `<line class="bio-snap-guide-line" x1="${g.p}" y1="0" x2="${g.p}" y2="${S.H}"></line>`;
      } else {
        return `<line class="bio-snap-guide-line" x1="0" y1="${g.p}" x2="${S.W}" y2="${g.p}"></line>`;
      }
    }).join('');
  }

  function renderRedlines() {
    const el = document.getElementById('c-guides');
    if (!el) return;
    if (!isAltHeld || SEL.length !== 1) {
      if (!G.length) el.innerHTML = '';
      return;
    }
    const l = sl()[0];
    if (!l) return;

    const dLeft = Math.round(l.x);
    const dRight = Math.round(S.W - (l.x + l.w));
    const dTop = Math.round(l.y);
    const dBottom = Math.round(S.H - (l.y + l.h));

    const cx = Math.round(l.x + l.w / 2);
    const cy = Math.round(l.y + l.h / 2);

    let svg = '';
    // Left distance
    if (dLeft > 0) {
      svg += `<line class="bio-measure-line" x1="0" y1="${cy}" x2="${l.x}" y2="${cy}"></line>
              <rect class="bio-measure-badge-rect" x="${Math.round(l.x / 2 - 14)}" y="${cy - 7}" width="28" height="14"></rect>
              <text class="bio-measure-badge-text" x="${Math.round(l.x / 2)}" y="${cy}">${dLeft}</text>`;
    }
    // Right distance
    if (dRight > 0) {
      const rx = Math.round(l.x + l.w + dRight / 2);
      svg += `<line class="bio-measure-line" x1="${l.x + l.w}" y1="${cy}" x2="${S.W}" y2="${cy}"></line>
              <rect class="bio-measure-badge-rect" x="${rx - 14}" y="${cy - 7}" width="28" height="14"></rect>
              <text class="bio-measure-badge-text" x="${rx}" y="${cy}">${dRight}</text>`;
    }
    // Top distance
    if (dTop > 0) {
      const ty = Math.round(l.y / 2);
      svg += `<line class="bio-measure-line" x1="${cx}" y1="0" x2="${cx}" y2="${l.y}"></line>
              <rect class="bio-measure-badge-rect" x="${cx - 14}" y="${ty - 7}" width="28" height="14"></rect>
              <text class="bio-measure-badge-text" x="${cx}" y="${ty}">${dTop}</text>`;
    }
    // Bottom distance
    if (dBottom > 0) {
      const by = Math.round(l.y + l.h + dBottom / 2);
      svg += `<line class="bio-measure-line" x1="${cx}" y1="${l.y + l.h}" x2="${cx}" y2="${S.H}"></line>
              <rect class="bio-measure-badge-rect" x="${cx - 14}" y="${by - 7}" width="28" height="14"></rect>
              <text class="bio-measure-badge-text" x="${cx}" y="${by}">${dBottom}</text>`;
    }

    el.innerHTML = svg;
  }

  function startInlineTextEdit(l) {
    if (!l || l.t !== 'text' || l.lock) return;
    const scaler = document.getElementById('c-S');
    if (!scaler) return;

    const old = document.querySelector('.bio-inline-text-edit');
    if (old) old.remove();

    const textarea = document.createElement('textarea');
    textarea.className = 'bio-inline-text-edit';
    textarea.value = l.txt;
    textarea.style.left = `${l.x}px`;
    textarea.style.top = `${l.y}px`;
    textarea.style.width = `${Math.max(l.w, 140)}px`;
    textarea.style.height = `${Math.max(l.h, 48)}px`;
    textarea.style.color = l.col;
    textarea.style.font = `${l.fw} ${l.fs}px/${l.lh || 1.25} ${l.ff}`;
    textarea.style.textAlign = l.al;

    scaler.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const commit = () => {
      if (!textarea.isConnected) return;
      const newTxt = textarea.value.trim();
      textarea.remove();
      if (newTxt && newTxt !== l.txt) {
        histPush();
        l.txt = newTxt;
        render();
        later();
      }
    };

    textarea.addEventListener('blur', commit);
    textarea.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        textarea.value = l.txt;
        commit();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        commit();
      }
      e.stopPropagation();
    });
  }

  const pt = e => {
    const cv = $('#c-cv');
    if (!cv) return [0, 0];
    const r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) / camera.zoom, (e.clientY - r.top) / camera.zoom];
  };

  // Custom Modal System (Replaces prompt, alert, confirm)
  function showModal({ title, bodyHtml, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm }) {
    const existing = document.getElementById('bio-canvas-modal-wrap');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'bio-canvas-modal-wrap';
    backdrop.className = 'bio-modal-backdrop';

    backdrop.innerHTML = `
      <div class="bio-modal-card">
        <div class="bio-modal-header">
          <h3 class="bio-modal-title">${title}</h3>
          <button type="button" class="bio-c-btn" id="bio-modal-close" style="padding:4px 6px;">×</button>
        </div>
        <div class="bio-modal-body">
          ${bodyHtml}
        </div>
        <div class="bio-modal-footer">
          ${cancelText ? `<button type="button" class="bio-c-btn" id="bio-modal-cancel">${cancelText}</button>` : ''}
          <button type="button" class="bio-c-btn primary" id="bio-modal-confirm">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const close = () => backdrop.remove();
    backdrop.querySelector('#bio-modal-close').onclick = close;
    if (cancelText) backdrop.querySelector('#bio-modal-cancel').onclick = close;

    backdrop.querySelector('#bio-modal-confirm').onclick = async () => {
      if (onConfirm) {
        const res = await onConfirm(backdrop);
        if (res !== false) close();
      } else close();
    };

    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) { close(); return; }
      const dropBtn = e.target.closest('.bio-dropdown-btn, .claude-custom-select-btn');
      if (dropBtn) {
        const wrap = dropBtn.closest('.claude-custom-select-wrap');
        const wasOpen = wrap.classList.contains('open');
        backdrop.querySelectorAll('.claude-custom-select-wrap.open').forEach(w => w.classList.remove('open'));
        if (!wasOpen) wrap.classList.add('open');
        return;
      }
      const opt = e.target.closest('.claude-select-option');
      if (opt) {
        const wrap = opt.closest('.claude-custom-select-wrap');
        const hidden = wrap.querySelector('input[type="hidden"]');
        const val = opt.dataset.val;
        if (hidden) {
          hidden.value = val;
          hidden.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const span = opt.querySelector('span');
        const selText = wrap.querySelector('.selected-text');
        if (selText && span) selText.textContent = span.textContent;
        wrap.querySelectorAll('.claude-select-option').forEach(o => o.classList.toggle('active', o === opt));
        wrap.classList.remove('open');
        return;
      }
      if (!e.target.closest('.claude-custom-select-wrap')) {
        backdrop.querySelectorAll('.claude-custom-select-wrap.open').forEach(w => w.classList.remove('open'));
      }
    });
  }

  // -----------------------------------------------------------------
  // Kimi AI Integration Engine
  // -----------------------------------------------------------------
  const CanvasAI = {
    async callAI(messages, model = 'kimi-k3') {
      const res = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.8
        })
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error('AI Gateway Error: ' + err);
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    },

    openFullGeneratorModal() {
      const html = `
        <label class="bio-f-label">
          Character Lore, Bot Premise or Raw Notes
          <textarea id="ai-gen-prompt" class="bio-f-textarea" rows="4" placeholder="e.g. A brooding gothic vampire lord named Lord Malachar who rules a frozen subterranean citadel in the Frostfall Expanse..."></textarea>
        </label>
        <div class="bio-f-grid">
          <label class="bio-f-label">
            Aesthetic Archetype
            <div class="claude-custom-select-wrap bio-custom-dropdown" id="ai-wrap-archetype">
              <input type="hidden" id="ai-gen-archetype" value="papercraft" />
              <button type="button" class="claude-custom-select-btn bio-dropdown-btn">
                <span class="selected-text">Warm Papercraft & Editorial</span>
                <svg class="claude-select-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <div class="claude-custom-select-menu bio-dropdown-menu">
                <div class="claude-select-option" data-val="grimdark"><span>Obsidian Grimdark (Slate & Gold)</span><svg class="option-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                <div class="claude-select-option" data-val="cyberpunk"><span>Cyberpunk Telemetry (Cyan & CRT)</span><svg class="option-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                <div class="claude-select-option active" data-val="papercraft"><span>Warm Papercraft & Editorial</span><svg class="option-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                <div class="claude-select-option" data-val="literary"><span>Classical Literary Serif</span><svg class="option-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                <div class="claude-select-option" data-val="romantic"><span>Romantic Soft Fantasy</span><svg class="option-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
              </div>
            </div>
          </label>
          <label class="bio-f-label">
            Inference Engine
            <div class="claude-custom-select-wrap bio-custom-dropdown" id="ai-wrap-model">
              <input type="hidden" id="ai-gen-model" value="kimi-k3" />
              <button type="button" class="claude-custom-select-btn bio-dropdown-btn">
                <span class="selected-text">Kimi K3 (Recommended)</span>
                <svg class="claude-select-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <div class="claude-custom-select-menu bio-dropdown-menu">
                <div class="claude-select-option active" data-val="kimi-k3"><span>Kimi K3 (Recommended)</span><svg class="option-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                <div class="claude-select-option" data-val="kimi-k3-thinking"><span>Kimi K3 Thinking</span><svg class="option-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                <div class="claude-select-option" data-val="gemini-4-argon"><span>Gemini 4 Argon</span><svg class="option-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                <div class="claude-select-option" data-val="gemini-3.8-flash"><span>Gemini 3.8 Flash</span><svg class="option-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                <div class="claude-select-option" data-val="deepseek-chat-v4"><span>DeepSeek V4</span><svg class="option-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
              </div>
            </div>
          </label>
        </div>
        <div class="bio-canvas-tips-box">
          Kimi will automatically synthesize title layers, an evocative opening quote, harmonious canvas palette, companion character cards, and 3 starter options.
        </div>
      `;

      showModal({
        title: '✨ Kimi AI Bio Canvas Generator',
        bodyHtml: html,
        confirmText: 'Generate Design',
        onConfirm: async modal => {
          const prompt = modal.querySelector('#ai-gen-prompt').value.trim();
          const archetype = modal.querySelector('#ai-gen-archetype').value;
          const model = modal.querySelector('#ai-gen-model').value;
          if (!prompt) {
            say('Please enter character notes or premise.', 1);
            return false;
          }

          const btn = modal.querySelector('#bio-modal-confirm');
          btn.disabled = true;
          btn.textContent = 'Synthesizing with Kimi…';

          try {
            const systemPrompt = `You are the master designer for JanitorAI visual character profiles.
Based on user premise, return a structured JSON response matching the following JSON schema:
{
  "title": "Short Bot Title (max 4 words)",
  "quote": "Evocative opening quote (max 15 words)",
  "bg": "#hex for background (dark, deep, e.g. #0d1117, #120e0b, #09090b)",
  "tx": "#hex for text color (e.g. #ede9e3)",
  "ac": "#hex for accent color (e.g. #d97757, #38bdf8, #f0b92d)",
  "characters": [
    { "name": "Name", "gender": "Gender", "age": "Age", "height": "Height", "desc": "Short 1-line personality overview." }
  ],
  "starters": [
    { "title": "Scenario 1 Name", "txt": "Immersive scenario intro description (1-2 sentences)." },
    { "title": "Scenario 2 Name", "txt": "Alternate scenario intro." },
    { "title": "Scenario 3 Name", "txt": "Alternate scenario intro." }
  ],
  "author_note": "A thoughtful author note with content guidelines or trigger warnings."
}
Return ONLY valid raw JSON with NO markdown backticks.`;

            const raw = await CanvasAI.callAI([
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Character Concept: ${prompt}\nStyle Archetype: ${archetype}` }
            ], model);

            const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
            const data = JSON.parse(clean);

            // Apply design to canvas
            S.bg = data.bg || S.bg;
            S.tx = data.tx || S.tx;
            S.ac = data.ac || S.ac;

            // Update title and quote layers
            const titleLayer = S.layers.find(l => l.name.toLowerCase().includes('title') || l.name.toLowerCase().includes('название'));
            if (titleLayer && data.title) {
              titleLayer.txt = data.title;
              titleLayer.col = S.ac;
            }

            const quoteLayer = S.layers.find(l => l.name.toLowerCase().includes('quote') || l.name.toLowerCase().includes('цитата'));
            if (quoteLayer && data.quote) {
              quoteLayer.txt = `«${data.quote.replace(/[«»"]/g, '')}»`;
              quoteLayer.col = S.tx;
            }

            // Populate Page Sections
            S.sections = [];
            if (data.quote) {
              S.sections.push({ id: rid(), t: 'quote', txt: `«${data.quote.replace(/[«»"]/g, '')}»` });
            }
            if (data.characters && data.characters.length) {
              S.sections.push({ id: rid(), t: 'divider', txt: 'Dramatis Personae' });
              S.sections.push({
                id: rid(),
                t: 'chars',
                items: data.characters.map(c => ({
                  img: '',
                  name: c.name || 'Character',
                  gender: c.gender || '',
                  age: c.age || '',
                  height: c.height || '',
                  desc: c.desc || ''
                }))
              });
            }
            if (data.starters && data.starters.length) {
              S.sections.push({ id: rid(), t: 'divider', txt: 'Starter Scenarios' });
              S.sections.push({
                id: rid(),
                t: 'intro',
                items: data.starters.map(st => ({
                  title: st.title || 'Starting Scenario',
                  txt: st.txt || ''
                }))
              });
            }
            if (data.author_note) {
              S.sections.push({ id: rid(), t: 'note', txt: data.author_note });
            }

            render();
            secUI();
            commit();
            say('✓ Canvas layout and page sections synthesized with Kimi!');
            return true;
          } catch (err) {
            say('Kimi generation failed: ' + err.message, 1);
            btn.disabled = false;
            btn.textContent = 'Generate Design';
            return false;
          }
        }
      });
    },

    async rewriteSelectedText(type = 'hook') {
      const s = sl()[0];
      if (!s || s.t != 'text') return say('Select a text layer first.', 1);

      say('Polishing text with Kimi…');
      try {
        const prompt = type == 'hook' ?
          `Rewrite this into an impactful, atmospheric, dramatic hook quote (12-18 words max): "${s.txt}"` :
          `Rewrite this into a punchy, evocative character bot title (2-4 words max): "${s.txt}"`;

        const res = await CanvasAI.callAI([
          { role: 'system', content: 'You are an expert JanitorAI bot copywriter. Return ONLY the polished text string with no preamble, quotes, or conversational commentary.' },
          { role: 'user', content: prompt }
        ]);

        if (res) {
          s.txt = res.trim().replace(/^["']|["']$/g, '');
          render();
          syncP();
          commit();
          say('✓ Text polished with Kimi!');
        }
      } catch (e) {
        say('AI rewrite error: ' + e.message, 1);
      }
    },

    async generateImagePrompt() {
      const s = sl()[0];
      say('Crafting Midjourney / FLUX prompt with Kimi…');
      try {
        const titleLayer = S.layers.find(l => l.t == 'text');
        const botContext = titleLayer ? titleLayer.txt : 'dark aesthetic character';

        const res = await CanvasAI.callAI([
          { role: 'system', content: 'You are an expert prompt engineer for Midjourney and FLUX. Craft a high-aesthetic, cinematic prompt for a JanitorAI character card cover. Return ONLY the prompt.' },
          { role: 'user', content: `Character theme: ${botContext}. Style: cinematic lighting, 8k resolution, detailed atmospheric digital portrait, masterpiece.` }
        ]);

        if (res) {
          navigator.clipboard.writeText(res.trim());
          say('✓ Image prompt generated and copied to clipboard!');
          showModal({
            title: '🎨 Midjourney / FLUX Image Prompt',
            bodyHtml: `
              <div class="bio-canvas-tips-box">Prompt copied to your clipboard! Paste into Midjourney, Stable Diffusion, or FLUX to create your character cover:</div>
              <textarea class="bio-f-textarea" rows="4" readonly style="margin-top:8px;">${esc(res.trim())}</textarea>
            `,
            confirmText: 'Done',
            cancelText: ''
          });
        }
      } catch (e) {
        say('Prompt generation error: ' + e.message, 1);
      }
    }
  };

  // Cross-Studio Deployment & Integration
  function deployDirect() {
    const code = full();
    if (!code) return say('No bio HTML content to deploy.', 1);

    if (window.JanitorBioStudio) {
      // Synchronize generated code with Studio Editor
      const codeEditor = document.getElementById('bio-code-editor');
      if (codeEditor) codeEditor.value = code;

      // Check credentials
      const uuid = localStorage.getItem('singularity_jai_uuid') || '';
      const token = localStorage.getItem('singularity_jai_token') || '';

      if (!uuid || !token) {
        say('Configure UUID and Token in Credentials tab first.', 1);
        window.JanitorBioStudio.switchSubtab('auth');
        return;
      }

      window.JanitorBioStudio.deployToJanitor();
    } else {
      say('JanitorBioStudio bridge not available.', 1);
    }
  }

  function openInSandbox() {
    const code = full();
    if (window.JanitorBioStudio) {
      const codeEditor = document.getElementById('bio-code-editor');
      if (codeEditor) codeEditor.value = code;
      window.JanitorBioStudio.switchSubtab('output');
      const frame = document.getElementById('bio-sandbox-iframe');
      if (frame && typeof window.JanitorBioStudio.updateSandboxPreview === 'function') {
        window.JanitorBioStudio.updateSandboxPreview(code);
      }
    }
  }

  // Event Handlers & Initialization
  function bindCanvasEvents() {
    // Toolbar buttons
    $('#c-b-new').onclick = () => setComp({ W: 480, H: 560, bg: '#0f1418', layers: [] });
    $('#c-b-tpl').onclick = openTemplatePickerModal;
    $('#c-b-open').onclick = () => { FM = 'proj'; $('#c-fi').accept = '.json,application/json'; $('#c-fi').click(); };
    $('#c-b-save').onclick = () => { dl(new Blob([JSON.stringify(S)], { type: 'application/json' }), 'bio-canvas.json', 'application/json'); say('Project downloaded: layers and local images bundled inside.'); };
    $('#c-b-un').onclick = undo;
    $('#c-b-re').onclick = redo;
    $('#c-b-dup').onclick = dup;
    $('#c-b-del').onclick = del;
    $('#c-b-up').onclick = () => ord(1);
    $('#c-b-dn').onclick = () => ord(-1);
    $('#c-b-ai').onclick = () => CanvasAI.openFullGeneratorModal();
    $('#c-b-deploy').onclick = deployDirect;

    // Back to Singularity (redirect to playground)
    const backBtn = $('#btn-bio-back-singularity');
    if (backBtn) {
      backBtn.onclick = (e) => {
        e.preventDefault();
        if (typeof window.switchTab === 'function') {
          window.switchTab('playground');
        } else {
          const pgTab = document.querySelector('[data-tab="playground"]');
          if (pgTab) pgTab.click();
          else window.location.hash = '#playground';
        }
      };
    }

    // Figma Alignment toolbar buttons
    const alL = $('#c-al-l'); if (alL) alL.onclick = () => alignLayers('left');
    const alC = $('#c-al-c'); if (alC) alC.onclick = () => alignLayers('center');
    const alR = $('#c-al-r'); if (alR) alR.onclick = () => alignLayers('right');
    const alT = $('#c-al-t'); if (alT) alT.onclick = () => alignLayers('top');
    const alM = $('#c-al-m'); if (alM) alM.onclick = () => alignLayers('middle');
    const alB = $('#c-al-b'); if (alB) alB.onclick = () => alignLayers('bottom');

    // Zoom buttons
    $('#c-zo').onclick = () => setZ(camera.zoom - .1);
    $('#c-zi').onclick = () => setZ(camera.zoom + .1);
    $('#c-z0').onclick = fit;
    const z1 = $('#c-z1');
    if (z1) z1.onclick = () => setZ(1.0);

    // Toolbar dimension stepper buttons (+ / - 10px)
    $$('.bio-canvas-controls-bar .bio-num-step-btn').forEach(btn => {
      btn.onclick = () => {
        const tid = btn.dataset.stepFor;
        const inp = document.getElementById(tid);
        if (!inp) return;
        const step = +(btn.dataset.step || 10);
        const cur = +inp.value || 0;
        const next = Math.max(100, Math.min(4000, cur + step));
        inp.value = next;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      };
    });

    // Add elements
    $$('[data-add]').forEach(b => b.onclick = () => add(b.dataset.add));

    // Inspector Tabs
    $$('.bio-inspector-tab-btn').forEach(b => b.onclick = () => tab(b.dataset.tab));

    // Export Tab Controls
    $('#c-m-img').onclick = () => { S.mode = 'img'; autosave(); exportUI(); };
    $('#c-m-hyb').onclick = () => { S.mode = 'hyb'; autosave(); exportUI(); };
    $('#c-m-live').onclick = () => { S.mode = 'live'; autosave(); exportUI(); };
    $('#c-e-png').onclick = () => expImg('image/png');
    $('#c-e-webp').onclick = () => expImg('image/webp');
    $('#c-alt').oninput = e => { S.alt = e.target.value; autosave(); exportUI(); };
    $('#c-pub').onclick = () => {
      const u = $('#c-pu').value.trim();
      if (!/^https:\/\/\S+$/.test(u)) return say('Enter full URL https://…', 1);
      S.pub = { url: u, h: sig() };
      autosave();
      exportUI();
      say('URL linked to current composition version.');
    };
    $('#c-copy').onclick = async () => {
      try {
        await navigator.clipboard.writeText(full());
        say('Code copied to clipboard!');
      } catch {
        $('#c-code').select();
        say(document.execCommand('copy') ? 'Code copied' : 'Failed to copy — select manually', 0);
      }
    };
    $('#c-dl').onclick = () => dl(full(), 'bio.html', 'text/html');
    $('#c-pv-btn').onclick = openInSandbox;

    // =========================================================
    // Figma UI3 Floating Tools Dock Controller
    // =========================================================
    let currentTool = 'move';

    function setTool(toolName) {
      currentTool = toolName || 'move';

      // 1. Update active item across menus
      $$('.bio-dock-menu-item').forEach(item => {
        const isActive = item.dataset.tool === currentTool;
        item.classList.toggle('active', isActive);
        const check = item.querySelector('.menu-check');
        if (check) check.textContent = isActive ? '✓' : '';
      });

      // 2. Update group active states and icon badges
      $$('.bio-dock-group').forEach(grp => {
        const activeItem = grp.querySelector(`.bio-dock-menu-item[data-tool="${currentTool}"]`);
        if (activeItem) {
          grp.classList.add('has-active');
          const pBtn = grp.querySelector('.bio-dock-btn');
          if (pBtn) {
            pBtn.dataset.tool = currentTool;
            pBtn.title = (activeItem.querySelector('.menu-label')?.textContent || currentTool) + ' (' + (activeItem.querySelector('.menu-key')?.textContent || '') + ')';
            const itemSvg = activeItem.querySelector('svg');
            if (itemSvg) {
              pBtn.innerHTML = itemSvg.outerHTML;
            }
          }
        } else {
          grp.classList.remove('has-active');
        }
      });

      // 3. Standalone tool buttons
      const commentBtn = $('#btn-tool-comment');
      if (commentBtn) commentBtn.classList.toggle('active', currentTool === 'comment');

      // 4. Update cursor on canvas stage
      const stageContainer = $('#c-C');
      if (stageContainer) {
        stageContainer.classList.remove('cursor-hand', 'cursor-crosshair', 'cursor-text');
        if (currentTool === 'hand') stageContainer.classList.add('cursor-hand');
        else if (['rect', 'ellipse', 'line', 'arrow', 'polygon', 'star', 'frame', 'pen', 'pencil'].includes(currentTool)) stageContainer.classList.add('cursor-crosshair');
        else if (['text', 'header-text', 'quote-text', 'comment'].includes(currentTool)) stageContainer.classList.add('cursor-text');
      }

      // Close all open popover menus
      $$('.bio-dock-menu.open').forEach(m => m.classList.remove('open'));
    }

    // Toggle menu upward on chevron click
    $$('.bio-dock-chevron').forEach(chev => {
      chev.onclick = (e) => {
        e.stopPropagation();
        const menuId = chev.dataset.menu;
        const targetMenu = document.getElementById(menuId);
        const wasOpen = targetMenu ? targetMenu.classList.contains('open') : false;
        $$('.bio-dock-menu.open').forEach(m => m.classList.remove('open'));
        if (targetMenu && !wasOpen) {
          targetMenu.classList.add('open');
        }
      };
    });

    // Close menus when clicking outside
    document.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('#bio-figma-dock')) {
        $$('.bio-dock-menu.open').forEach(m => m.classList.remove('open'));
      }
    });

    // Menu item selection
    $$('.bio-dock-menu-item').forEach(item => {
      item.onclick = (e) => {
        e.stopPropagation();
        const tool = item.dataset.tool;
        if (tool === 'image') {
          FM = 'img';
          $('#c-fi').accept = 'image/*';
          $('#c-fi').click();
          setTool('move');
          return;
        }
        if (tool === 'section') {
          openTemplatePickerModal();
          setTool('move');
          return;
        }
        if (tool === 'slice') {
          expImg('image/png');
          setTool('move');
          return;
        }
        setTool(tool);
      };
    });

    // Primary dock buttons
    $$('.bio-dock-group > .bio-dock-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        setTool(btn.dataset.tool);
      };
    });

    // Standalone comment button
    const btnComment = $('#btn-tool-comment');
    if (btnComment) {
      btnComment.onclick = () => setTool(currentTool === 'comment' ? 'move' : 'comment');
    }

    // Assets / Templates button
    const btnAssets = $('#btn-tool-assets');
    if (btnAssets) {
      btnAssets.onclick = () => openTemplatePickerModal();
    }

    // Dev Mode (copy JanitorAI production HTML)
    const btnDev = $('#btn-tool-dev');
    if (btnDev) {
      btnDev.onclick = async () => {
        try {
          await navigator.clipboard.writeText(full());
          say('JanitorAI production HTML copied to clipboard! 📋');
        } catch {
          $('#c-code').select();
          document.execCommand('copy');
          say('JanitorAI code copied to clipboard! 📋');
        }
      };
    }

    // Live preview toggle
    const btnPreview = $('#btn-tool-preview');
    if (btnPreview) {
      btnPreview.onclick = () => {
        if (window.JanitorBioStudio && typeof window.JanitorBioStudio.switchSubtab === 'function') {
          window.JanitorBioStudio.switchSubtab('output');
        } else {
          openInSandbox();
        }
      };
    }

    // Measure / guides toggle
    const btnMeasure = $('#btn-tool-measure');
    if (btnMeasure) {
      btnMeasure.onclick = () => {
        btnMeasure.classList.toggle('active');
        const guides = $('#c-guides');
        if (guides) {
          guides.style.display = btnMeasure.classList.contains('active') ? '' : 'none';
        }
        say(btnMeasure.classList.contains('active') ? 'Smart Magnetic Guides Enabled' : 'Smart Guides Disabled');
      };
    }

    // Draw / doodle toggle
    const btnDraw = $('#btn-tool-draw');
    if (btnDraw) {
      btnDraw.onclick = () => {
        setTool(currentTool === 'pen' ? 'move' : 'pen');
      };
    }

    // Dimension inputs
    $('#c-tw').oninput = e => {
      const v = +e.target.value;
      if (v >= 200 && v <= 1200) { S.W = v; sizeStage(); later(); }
    };
    $('#c-th').oninput = e => {
      const v = +e.target.value;
      if (v >= 100 && v <= 4000) { S.H = v; sizeStage(); later(); }
    };

    // Inspector Events
    $('#c-p1').addEventListener('input', e => {
      const t = e.target, k = t.dataset.k;
      if (!k) return;
      const v = t.dataset.n ? +t.value : t.value;
      if (t.dataset.n && (t.value === '' || isNaN(v))) return;
      if (!SEL.length) { S[k] = v; sizeStage(); }
      else sl().forEach(l => { if (k in l) l[k] = v; });
      if (k == 'src') BAD.delete(v);
      render();
      later();
    });

    $('#c-p1').onclick = e => {
      const a = e.target.dataset.a;
      const ai = e.target.dataset.ai;
      if (ai) {
        if (ai == 'hook') CanvasAI.rewriteSelectedText('hook');
        else if (ai == 'title') CanvasAI.rewriteSelectedText('title');
        else if (ai == 'imgprompt') CanvasAI.generateImagePrompt();
        return;
      }
      if (!a) return;
      const s = sl();
      if (a == 'cx') s.forEach(l => l.x = Math.round((S.W - l.w) / 2));
      else if (a == 'cy') s.forEach(l => l.y = Math.round((S.H - l.h) / 2));
      else if (a == 'r90') s.forEach(l => l.rot = ((l.rot || 0) + 90) % 360);
      else if (a == 'r0') s.forEach(l => l.rot = 0);
      else if (a == 'file') { FM = 'img'; $('#c-fi').accept = 'image/*'; $('#c-fi').click(); return; }
      else if (a == 'nofile') s.forEach(l => { l.lk = ''; });
      render();
      commit();
    };

    // Page Tab Actions
    $('#c-p4').addEventListener('input', e => {
      const t = e.target, k = t.dataset.k;
      if (!k) return;
      if (t.dataset.i == null) S[k] = t.value;
      else {
        const s = S.sections[t.dataset.i];
        (t.dataset.j != null ? s.items[t.dataset.j] : s)[k] = t.value;
      }
      later();
    });

    $('#c-p4').onclick = e => {
      const b = e.target.closest('button');
      if (!b) return;
      const a = b.dataset.s, n = b.dataset.new, ai = b.dataset.ai, S2 = S.sections;
      if (ai == 'chars-gen') {
        S2.push(newSec('divider'));
        S2.push({ ...newSec('chars'), items: [newItem('chars'), newItem('chars')] });
        secUI();
        commit();
        return;
      }
      if (ai == 'intro-gen') {
        S2.push(newSec('divider'));
        S2.push({ ...newSec('intro'), items: [{ title: 'Scenario 1', txt: '' }, { title: 'Scenario 2', txt: '' }] });
        secUI();
        commit();
        return;
      }
      if (n) S2.push(newSec(n));
      else if (a) {
        const card = b.closest('[data-si]');
        if (!card) return;
        const i = +card.dataset.si;
        const row = b.closest('[data-ij]');
        const j = row ? +row.dataset.ij : 0;
        if (a == 'x') S2.splice(i, 1);
        else if (a == 'up' && i > 0) [S2[i - 1], S2[i]] = [S2[i], S2[i - 1]];
        else if (a == 'dn' && i < S2.length - 1) [S2[i + 1], S2[i]] = [S2[i], S2[i + 1]];
        else if (a == 'ia') S2[i].items.push(newItem(S2[i].t));
        else if (a == 'ix') S2[i].items.splice(j, 1);
      } else return;
      secUI();
      commit();
    };

    // Universal Custom Select & Number Steppers Delegator
    const appEl = $('.bio-canvas-app');
    if (appEl) {
      appEl.addEventListener('click', e => {
        // 1. Toggle dropdown menu open/close
        const selectBtn = e.target.closest('.claude-custom-select-btn');
        if (selectBtn) {
          const wrap = selectBtn.closest('.claude-custom-select-wrap');
          if (wrap) {
            const wasOpen = wrap.classList.contains('open');
            $$('.claude-custom-select-wrap.open').forEach(w => w.classList.remove('open'));
            if (!wasOpen) wrap.classList.add('open');
            return;
          }
        }

        // 2. Select an option from custom menu
        const option = e.target.closest('.claude-select-option');
        if (option) {
          const wrap = option.closest('.claude-custom-select-wrap');
          if (wrap) {
            const val = option.dataset.val;
            const labelEl = option.querySelector('.option-label');
            const labelText = labelEl ? labelEl.textContent : val;
            const selectedText = wrap.querySelector('.selected-text');
            if (selectedText) {
              selectedText.textContent = labelText;
              if (wrap.dataset.k === 'ff') selectedText.style.fontFamily = val;
            }
            wrap.querySelectorAll('.claude-select-option').forEach(o => o.classList.toggle('active', o === option));
            wrap.classList.remove('open');

            // Hidden input sync (e.g. #c-sc in Export tab)
            const hiddenInput = wrap.querySelector('input[type="hidden"]');
            if (hiddenInput) {
              hiddenInput.value = val;
              hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
              hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Compatibility table item
            if (wrap.dataset.cmpI != null) {
              let st = {};
              try { st = JSON.parse(localStorage.getItem('singularity_bc:cmp') || '{}'); } catch {}
              st[wrap.dataset.cmpI] = val;
              localStorage.setItem('singularity_bc:cmp', JSON.stringify(st));
              return;
            }

            const k = wrap.dataset.k;
            if (!k) return;

            // Page sections item (tab 4)
            if (wrap.dataset.i != null) {
              const s = S.sections[+wrap.dataset.i];
              if (s) {
                (wrap.dataset.j != null ? s.items[+wrap.dataset.j] : s)[k] = val;
                secUI();
                commit();
              }
              return;
            }

            // Canvas Properties or Selected Layer Properties (tab 1)
            const isNum = !!wrap.dataset.n;
            const finalVal = isNum ? +val : val;
            if (!SEL.length) {
              S[k] = finalVal;
              sizeStage();
            } else {
              sl().forEach(l => { if (k in l) l[k] = finalVal; });
            }
            if (k === 'src') BAD.delete(finalVal);
            render();
            syncP();
            later();
            return;
          }
        }

        // 3. Number Stepper Buttons (+ / -) inside inspector panels
        const stepBtn = e.target.closest('.bio-num-step-btn');
        if (stepBtn && !stepBtn.closest('.bio-canvas-controls-bar')) {
          let inp = null;
          if (stepBtn.dataset.stepFor) inp = document.getElementById(stepBtn.dataset.stepFor);
          if (!inp) {
            const group = stepBtn.closest('.bio-num-group');
            inp = group ? group.querySelector('.bio-num-step-input') : null;
          }
          if (inp) {
            const step = +(stepBtn.dataset.step || 1);
            let cur = parseFloat(inp.value) || 0;
            let next = cur + step;
            if (inp.dataset.min != null) next = Math.max(+inp.dataset.min, next);
            if (inp.dataset.max != null) next = Math.min(+inp.dataset.max, next);
            if (Math.abs(step) < 1) next = Math.round(next * 100) / 100;
            else next = Math.round(next);
            inp.value = next;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            return;
          }
        }
      });
    }

    // Dismiss open select menus on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('.claude-custom-select-wrap')) {
        $$('.claude-custom-select-wrap.open').forEach(w => w.classList.remove('open'));
      }
    });

    // Layers List Events
    $('#c-ll').onclick = e => {
      const r = e.target.closest('.bio-layer-row');
      if (!r) return;
      const l = L(r.dataset.id);
      const btn = e.target.closest('[data-a]');
      const a = btn ? btn.dataset.a : null;
      if (a) {
        l[a] = l[a] ? 0 : 1;
        if (a == 'hide' && l.hide) SEL = SEL.filter(i => i != l.id);
        render();
        commit();
        return;
      }
      SEL = e.shiftKey ? (SEL.includes(l.id) ? SEL.filter(i => i != l.id) : [...SEL, l.id]) : [l.id];
      ui();
      render();
    };

    $('#c-ll').ondblclick = e => {
      const r = e.target.closest('.bio-layer-row');
      if (!r || e.target.closest('[data-a]')) return;
      const l = L(r.dataset.id);
      showModal({
        title: 'Rename Layer',
        bodyHtml: `<input type="text" id="rename-layer-input" class="bio-f-input" value="${esc(l.name)}" />`,
        confirmText: 'Save',
        onConfirm: m => {
          const val = m.querySelector('#rename-layer-input').value.trim();
          if (val) {
            l.name = val;
            commit();
          }
        }
      });
    };

    // Infinite Canvas & Stage Pointer Drag & Transforms
    let isSpacePressed = false;

    $('#c-C').addEventListener('pointerdown', e => {
      if (e.target.closest('.bio-canvas-controls-bar') || e.target.closest('#bio-figma-dock')) return;

      // 1. Hand tool mode, Spacebar pan, or Middle mouse button pan
      if (e.button === 1 || isSpacePressed || currentTool === 'hand') {
        e.preventDefault();
        D = { m: 'pan', startClientX: e.clientX, startClientY: e.clientY, startCamX: camera.x, startCamY: camera.y, mv: 0 };
        $('#c-C').classList.add('is-panning');
        return;
      }

      if (e.button !== 0) return; // Only handle primary left click for canvas objects

      // Handle Creation Tools (Shapes, Text, Notes, Frames)
      const p = pt(e);
      const isInsideFrame = !!e.target.closest('#c-frame-container');
      const clickX = isInsideFrame ? Math.max(0, Math.min(S.W - 80, Math.round(p[0]))) : Math.round(p[0]);
      const clickY = isInsideFrame ? Math.max(0, Math.min(S.H - 40, Math.round(p[1]))) : Math.round(p[1]);

      if (['rect', 'ellipse', 'line', 'arrow', 'polygon', 'star', 'pen', 'pencil'].includes(currentTool)) {
        let newLayer;
        if (currentTool === 'rect') {
          newLayer = mk('rect', { x: clickX, y: clickY, w: 160, h: 100, name: 'Rectangle' });
        } else if (currentTool === 'ellipse') {
          newLayer = mk('rect', { x: clickX, y: clickY, w: 120, h: 120, rad: 9999, name: 'Ellipse' });
        } else if (currentTool === 'line') {
          newLayer = mk('rect', { x: clickX, y: clickY, w: 220, h: 2, name: 'Line' });
        } else if (currentTool === 'arrow') {
          newLayer = mk('text', { x: clickX, y: clickY, w: 60, h: 40, txt: '➔', fs: 32, col: '#d97757', name: 'Arrow' });
        } else if (currentTool === 'polygon') {
          newLayer = mk('rect', { x: clickX, y: clickY, w: 100, h: 100, rad: 8, rot: 45, name: 'Polygon' });
        } else if (currentTool === 'star') {
          newLayer = mk('text', { x: clickX, y: clickY, w: 60, h: 40, txt: '✦', fs: 36, col: '#f0b92d', name: 'Star' });
        } else if (currentTool === 'pen' || currentTool === 'pencil') {
          newLayer = mk('text', { x: clickX, y: clickY, w: 140, h: 40, txt: '～ ❖ ～', fs: 24, col: '#d97757', name: 'Ink Accent' });
        }
        if (newLayer) {
          S.layers.push(newLayer);
          SEL = [newLayer.id];
          render();
          commit();
          setTool('move');
        }
        return;
      }

      if (['text', 'header-text', 'quote-text'].includes(currentTool)) {
        let newLayer;
        if (currentTool === 'text') {
          newLayer = mk('text', { x: clickX, y: clickY, w: 240, h: 36, txt: 'New text', fs: 20 });
        } else if (currentTool === 'header-text') {
          newLayer = mk('text', { x: clickX, y: clickY, w: 360, h: 54, txt: 'DISPLAY HEADING', fs: 36, fw: 700, ff: 'Georgia, serif' });
        } else if (currentTool === 'quote-text') {
          newLayer = mk('text', { x: clickX, y: clickY, w: 360, h: 64, txt: '«Your memorable character quote goes here.»', fs: 18, col: '#c4b5aa', ff: 'Georgia, serif' });
        }
        if (newLayer) {
          S.layers.push(newLayer);
          SEL = [newLayer.id];
          render();
          commit();
          setTool('move');
          setTimeout(() => startInlineTextEdit(newLayer), 50);
        }
        return;
      }

      if (currentTool === 'comment') {
        const newLayer = mk('text', {
          x: clickX,
          y: clickY,
          w: 220,
          h: 60,
          txt: '📌 Note: Add lore reminder...',
          fs: 13,
          col: '#ede9e3',
          ff: 'JetBrains Mono, monospace'
        });
        S.layers.push(newLayer);
        SEL = [newLayer.id];
        render();
        commit();
        setTool('move');
        setTimeout(() => startInlineTextEdit(newLayer), 50);
        return;
      }

      if (currentTool === 'frame') {
        const newLayer = mk('rect', { x: clickX, y: clickY, w: 260, h: 180, rad: 8, col: '#1b1b1b', col2: '#1b1b1b', a1: 0.8, a2: 0.8, name: 'Frame Container' });
        S.layers.push(newLayer);
        SEL = [newLayer.id];
        render();
        commit();
        setTool('move');
        return;
      }

      // 2. Dragging the Frame Header (Figma style frame move)
      const frameHeader = e.target.closest('#c-frame-header');
      if (frameHeader) {
        D = { m: 'frame_drag', startClientX: e.clientX, startClientY: e.clientY, startFrameX: framePos.x, startFrameY: framePos.y, mv: 0 };
        return;
      }

      const hd = e.target.closest('[data-h]'), el = e.target.closest('#c-cv [data-id]');
      if (ED) {
        if (el && el.dataset.id == ED.id) return;
        document.activeElement.blur();
      }

      // 3. Height Resize Bar
      if (e.target.closest('#c-rz')) {
        D = { m: 'h', y0: p[1], h0: S.H, mv: 1 };
        return;
      }

      // 4. Handle resize / rotate handles
      if (hd) {
        const l = sl()[0];
        D = { m: hd.dataset.h == 'rot' ? 'ro' : 'rs', h: hd.dataset.h, l, x0: p[0], y0: p[1], o: { x: l.x, y: l.y, w: l.w, h: l.h, r: l.rot || 0 }, mv: 0 };
        return;
      }

      // 5. Layer inside canvas
      const l = el && L(el.dataset.id);
      if (!l) {
        // Clicked on empty canvas background
        if (!e.shiftKey && SEL.length) { SEL = []; ui(); render(); }

        // If clicked outside the frame container entirely, pan the infinite canvas (Figma behavior)
        if (!e.target.closest('#c-frame-container')) {
          D = { m: 'pan', startClientX: e.clientX, startClientY: e.clientY, startCamX: camera.x, startCamY: camera.y, mv: 0 };
          $('#c-C').classList.add('is-panning');
        }
        return;
      }

      if (e.shiftKey) SEL = SEL.includes(l.id) ? SEL.filter(i => i != l.id) : [...SEL, l.id];
      else if (!SEL.includes(l.id)) SEL = [l.id];
      ui();
      render();
      if (l.lock || !SEL.includes(l.id)) return;
      D = { m: 'mv', x0: p[0], y0: p[1], mv: 0, b0: bb(l), o: [[l, l.x, l.y], ...sl().filter(a => a !== l && !a.lock).map(a => [a, a.x, a.y])] };
    });

    addEventListener('pointermove', e => {
      if (!D) return;

      // Handle Canvas Pan
      if (D.m === 'pan') {
        const dx = e.clientX - D.startClientX;
        const dy = e.clientY - D.startClientY;
        if (!D.mv) {
          if (Math.hypot(dx, dy) < 2) return;
          D.mv = 1;
        }
        camera.x = D.startCamX + dx;
        camera.y = D.startCamY + dy;
        applyCameraTransform();
        return;
      }

      // Handle Draggable Frame
      if (D.m === 'frame_drag') {
        const dx = (e.clientX - D.startClientX) / camera.zoom;
        const dy = (e.clientY - D.startClientY) / camera.zoom;
        if (!D.mv) {
          if (Math.hypot(dx, dy) * camera.zoom < 2) return;
          D.mv = 1;
        }
        framePos.x = Math.round(D.startFrameX + dx);
        framePos.y = Math.round(D.startFrameY + dy);
        applyFrameTransform();
        return;
      }

      const p = pt(e);
      let dx = p[0] - D.x0, dy = p[1] - D.y0;
      if (!D.mv) {
        if (Math.hypot(dx, dy) * camera.zoom < 3) return;
        D.mv = 1;
      }
      if (D.m == 'h') {
        S.H = Math.max(100, Math.min(4000, Math.round(D.h0 + dy)));
        sizeStage();
        return;
      }
      if (D.m == 'ro') {
        const l = D.l, cx = l.x + l.w / 2, cy = l.y + l.h / 2;
        let a = Math.atan2(p[1] - cy, p[0] - cx) * 180 / Math.PI + 90;
        a = ((Math.round(a) % 360) + 360) % 360;
        if (e.shiftKey) a = Math.round(a / 15) * 15 % 360;
        else [0, 90, 180, 270].forEach(k => { if (Math.abs(a - k) < 3) a = k; });
        if (a > 357) a = 0;
        l.rot = a;
        render();
        syncP();
        return;
      }
      if (D.m == 'mv') {
        const [l0, x0, y0] = D.o[0], B = D.b0, a = snapA(B.x + dx, B.w, 'x'), b = snapA(B.y + dy, B.h, 'y');
        G = [a.g != null && { ax: 'x', p: a.g }, b.g != null && { ax: 'y', p: b.g }].filter(Boolean);
        dx = a.v - B.x;
        dy = b.v - B.y;
        D.o.forEach(([l, x, y]) => {
          l.x = Math.round(x + dx);
          l.y = Math.round(y + dy);
        });
        renderGuides(G);
      } else {
        const { x, y, w, h, r } = D.o, k = D.h, l = D.l, an = r * Math.PI / 180, c = Math.cos(an), sn = Math.sin(an);
        const ux = dx * c + dy * sn, uy = -dx * sn + dy * c;
        let nw = w, nh = h;
        if (k.includes('e')) nw = w + ux;
        if (k.includes('w')) nw = w - ux;
        if (k.includes('s')) nh = h + uy;
        if (k.includes('n')) nh = h - uy;
        if (l.t == 'text') nh = h;
        else if ((l.t == 'img') != e.shiftKey && k.length == 2) {
          const ra = w / h;
          if (Math.abs(nw / w) > Math.abs(nh / h)) nh = nw / ra;
          else nw = nh * ra;
        }
        nw = Math.max(8, Math.round(nw));
        nh = Math.max(8, Math.round(nh));
        const sx = (k.includes('e') ? 1 : k.includes('w') ? -1 : 0) * (nw - w) / 2;
        const sy = (k.includes('s') ? 1 : k.includes('n') ? -1 : 0) * (nh - h) / 2;
        const cx = x + w / 2 + sx * c - sy * sn, cy = y + h / 2 + sx * sn + sy * c;
        l.w = nw;
        l.h = nh;
        l.x = Math.round(cx - nw / 2);
        l.y = Math.round(cy - nh / 2);
      }
      render();
      syncP();
    });

    addEventListener('pointerup', () => {
      if (D) {
        if (D.m === 'pan') {
          const C = $('#c-C');
          if (C) C.classList.remove('is-panning');
        }
        const m = D.mv;
        D = null;
        G = [];
        renderGuides([]);
        ovr();
        if (isAltHeld) renderRedlines();
        if (m) commit();
      }
    });

    // Infinite Canvas Wheel Handling (Two-finger pan & Pinch/Ctrl-scroll zoom centered at cursor)
    const stageEl = $('#c-C');
    if (stageEl) {
      stageEl.addEventListener('wheel', e => {
        if (e.target.closest('.bio-canvas-controls-bar')) return;
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
          const rect = stageEl.getBoundingClientRect();
          const mousePos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          };
          setZ(camera.zoom * zoomFactor, mousePos);
        } else {
          camera.x -= e.deltaX;
          camera.y -= e.deltaY;
          applyCameraTransform();
        }
      }, { passive: false });
    }

    // Inline Text Editing on Double-Click (Figma Direct Editing)
    if (stageEl) {
      stageEl.addEventListener('dblclick', e => {
        const el = e.target.closest('#c-cv [data-id], #c-ov [data-id], [data-id]');
        const l = el && L(el.dataset.id);
        if (l && l.t === 'text' && !l.lock) {
          startInlineTextEdit(l);
        }
      });
    }

    // Hotkeys, Alt Redlines & Spacebar pan trigger
    addEventListener('keydown', e => {
      const t = e.target;
      const isInput = /INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable;

      if (e.key === 'Alt') {
        isAltHeld = true;
        renderRedlines();
      }

      if (e.code === 'Space' && !isInput) {
        isSpacePressed = true;
        const c = $('#c-C');
        if (c) c.classList.add('can-pan');
        if (t.closest('.bio-canvas-app') || document.body.dataset.activeTab === 'bio') {
          e.preventDefault();
        }
        return;
      }

      if (isInput) return;
      const c = e.ctrlKey || e.metaKey, k = e.code;

      // Figma Tool Switch Hotkeys (V, H, F, R, O, L, T, P, C, K)
      if (!c && !e.altKey) {
        if (k === 'KeyV') { e.preventDefault(); setTool('move'); return; }
        else if (k === 'KeyH') { e.preventDefault(); setTool('hand'); return; }
        else if (k === 'KeyF') { e.preventDefault(); setTool('frame'); return; }
        else if (k === 'KeyR') { e.preventDefault(); setTool('rect'); return; }
        else if (k === 'KeyO') { e.preventDefault(); setTool('ellipse'); return; }
        else if (k === 'KeyL') { e.preventDefault(); setTool('line'); return; }
        else if (k === 'KeyT') { e.preventDefault(); setTool('text'); return; }
        else if (k === 'KeyP') { e.preventDefault(); setTool('pen'); return; }
        else if (k === 'KeyC') { e.preventDefault(); setTool('comment'); return; }
        else if (k === 'KeyK') { e.preventDefault(); setTool('scale'); return; }
      }

      if (c && (k === 'Digit0' || k === 'Numpad0')) { e.preventDefault(); fit(); }
      else if (c && (k === 'Digit1' || k === 'Numpad1')) { e.preventDefault(); setZ(1.0); }
      else if (c && (k === 'Equal' || k === 'NumpadAdd')) { e.preventDefault(); setZ(camera.zoom + 0.1); }
      else if (c && (k === 'Minus' || k === 'NumpadSubtract')) { e.preventDefault(); setZ(camera.zoom - 0.1); }
      else if (c && k == 'KeyZ') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (c && k == 'KeyY') { e.preventDefault(); redo(); }
      else if (c && k == 'KeyD') { e.preventDefault(); dup(); }
      else if (k == 'Delete' || k == 'Backspace') { e.preventDefault(); del(); }
      else if (k == 'Escape') { SEL = []; ui(); render(); setTool('move'); }
      else if (k == 'PageUp') { e.preventDefault(); ord(1); }
      else if (k == 'PageDown') { e.preventDefault(); ord(-1); }
      else if (k.startsWith('Arrow') && SEL.length) {
        e.preventDefault();
        const n = e.shiftKey ? 10 : 1;
        sl().forEach(l => {
          if (l.lock) return;
          if (k == 'ArrowLeft') l.x -= n;
          if (k == 'ArrowRight') l.x += n;
          if (k == 'ArrowUp') l.y -= n;
          if (k == 'ArrowDown') l.y += n;
        });
        render();
        syncP();
        later();
      }
    });

    addEventListener('keyup', e => {
      if (e.key === 'Alt') {
        isAltHeld = false;
        renderRedlines();
      }
      if (e.code === 'Space') {
        isSpacePressed = false;
        const c = $('#c-C');
        if (c) {
          c.classList.remove('can-pan');
          if (!D || D.m !== 'pan') c.classList.remove('is-panning');
        }
      }
    });

    // File Upload handling
    const rd = f => new Promise((r, j) => {
      const x = new FileReader();
      x.onload = () => r(x.result);
      x.onerror = () => j(Error('Failed to read file'));
      x.readAsDataURL(f);
    });

    $('#c-fi').onchange = async e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      try {
        if (FM == 'img') {
          if (f.size > 6e6) throw Error('File exceeds 6 MB');
          const k = 'i' + Date.now().toString(36);
          S.imgs[k] = await rd(f);
          sl().forEach(l => { if (l.t == 'img') l.lk = k; });
          render();
          commit();
          say('Local image connected to selected layer.');
        } else {
          const parsed = JSON.parse(await f.text());
          if (parsed && parsed.schema == 'bio-canvas') {
            S = norm(parsed);
            SEL = [];
            hist = [snap()];
            hi = 0;
            pk = '\0';
            sizeStage();
            render();
            secUI();
            ui();
            fit();
            say('Project loaded from ' + f.name);
          }
        }
      } catch (x) {
        say(x.message, 1);
      }
    };

    // Auto-fit and resize synchronization when tab becomes visible or window resizes
    const stageContainer = $('#c-C');
    if (stageContainer && window.ResizeObserver) {
      let hasInitialFit = false;
      const ro = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 50 && height > 50) {
            if (!hasInitialFit) {
              hasInitialFit = true;
              fit();
            } else {
              applyCameraTransform();
            }
          }
        }
      });
      ro.observe(stageContainer);
    }
  }

  function init() {
    S = blank();
    Object.assign(S, tpl());
    hist = [snap()];
    hi = 0;

    // Check autosave
    idbGet('auto').then(d => {
      if (d && d.s) {
        S = norm(JSON.parse(d.s));
        SEL = [];
        hist = [snap()];
        hi = 0;
      }
      sizeStage();
      render();
      secUI();
      cmpUI();
      ui();
      fit();
    }).catch(() => {
      sizeStage();
      render();
      secUI();
      cmpUI();
      ui();
      fit();
    });

    bindCanvasEvents();
  }

  window.JanitorBioCanvas = {
    init,
    fit,
    setComp,
    full,
    deployDirect,
    openInSandbox
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 50);
  }
})();
