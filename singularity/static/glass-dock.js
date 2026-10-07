/**
 * Singularity Glass Dock Navigation Module
 * Inspired by VengeanceUI @vengeanceui/glass-dock
 * Strictly adheres to DESIGN-SYS.md & MISTAKES.md (Pure vanilla ES6+, zero build step)
 */

(function () {
  let hoveredIndex = null;
  let prevIndex = null;
  let dockTooltip = null;
  let tooltipTextEl = null;

  const NAV_ITEMS = [
    {
      id: 'playground',
      type: 'tab',
      title: 'Playground',
      icon: `<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
    },
    {
      id: 'control',
      type: 'tab',
      title: 'Control Center',
      icon: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
    },
    {
      id: 'limits',
      type: 'tab',
      title: 'Limits & Quotas',
      icon: `<svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
    },
    {
      id: 'models',
      type: 'tab',
      title: 'Available Models',
      icon: `<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
    },
    {
      id: 'cookies',
      type: 'tab',
      title: 'Cookie Stacker',
      icon: `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    },
    {
      id: 'presets',
      type: 'tab',
      title: 'Presets & Lorebooks',
      icon: `<svg viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>`,
    },
    {
      id: 'tunnel',
      type: 'tab',
      title: 'Singularity-Access',
      icon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path></svg>`,
    },
    {
      id: 'bio',
      type: 'tab',
      title: 'Janitor Bio Studio',
      icon: `<svg viewBox="0 0 512 512" style="fill: currentColor; stroke: none;"><g transform="matrix(-1, 0, 0, 1, 512, 0)"><path d="M161.33,230.809C132.658,198.504,106.362,164.047,82.482,128c-11.926-18.02-23.265-36.443-33.857-55.246 C38.046,53.957,28.1,34.765,19.587,15.236L0,23.712c8.98,20.547,19.192,40.208,30.033,59.516 c10.885,19.295,22.459,38.128,34.663,56.558c24.422,36.846,51.305,72.065,80.679,105.182L161.33,230.809z"/><path d="M225.014,247.51c-7.97-11.684-15.588-23.58-22.869-35.622L123.078,284.4 c12.614,9.669,25.477,18.986,38.56,27.894c0.571-1.092,1.274-2.102,2.153-2.988l58.323-59.539 C222.993,248.873,223.96,248.125,225.014,247.51z"/><path d="M425.123,330.563c-53.84-5.765-110.566-24.327-165.226-52.294c-0.557,1.428-1.319,2.769-2.344,3.955 l-54.133,63.37c-1.011,1.201-2.256,2.132-3.618,2.856c21.14,27.595,44.698,54.251,71.127,79.274 c26.415,25.016,55.744,48.39,88.254,69.04l6.446-16.269c-22.562-14.687-43.541-30.737-63.026-47.768 c21.536,13.376,44.127,25.499,67.669,36.062l9.216-23.214c-28.525-15.639-55.1-33.681-79.713-53.43 c26.561,16.57,54.588,31.125,83.83,43.043l11.456-28.861c-11.588-6.19-22.883-12.834-33.842-19.873 c12.175,4.57,24.481,8.658,36.89,12.225l12.98-32.736c-13.582-5.406-26.957-11.493-40.084-18.233 c15.061,2.974,30.019,5.106,44.772,6.417L425.123,330.563z"/><path d="M245.877,259.465c-4.982-4.571-11.852-5.347-15.398-1.634l-57.37,60.455 c-3.56,3.714-1.861,11.075,3.867,16.335c5.743,5.274,13.259,6.322,16.643,2.454l55.202-62.432 C252.22,270.782,250.857,264.035,245.877,259.465z"/><path d="M438.821,301.592c6.124,0,11.09-4.96,11.09-11.076c0-6.109-4.966-11.075-11.09-11.075 c-6.109,0-11.075,4.966-11.075,11.075C427.746,296.632,432.712,301.592,438.821,301.592z"/><path d="M472.62,225.205c-4.147,0-7.501,3.354-7.501,7.501c0,4.146,3.354,7.501,7.501,7.501 c4.146,0,7.501-3.355,7.501-7.501C480.121,228.56,476.766,225.205,472.62,225.205z"/><path d="M450.117,383.348c-5.186,0-9.376,4.19-9.376,9.376c0,5.178,4.19,9.376,9.376,9.376 c5.186,0,9.376-4.198,9.376-9.376C459.493,387.538,455.303,383.348,450.117,383.348z"/><path d="M502.624,331.464c-5.186,0-9.376,4.19-9.376,9.376c0,5.179,4.19,9.376,9.376,9.376 c5.186,0,9.376-4.198,9.376-9.376C512,335.654,507.81,331.464,502.624,331.464z"/><path d="M430.119,443.978c-5.186,0-9.376,4.19-9.376,9.376c0,5.178,4.19,9.376,9.376,9.376 c5.186,0,9.376-4.198,9.376-9.376C439.496,448.168,435.306,443.978,430.119,443.978z"/><path d="M378.36,273.551c5.582,0,10.094-4.513,10.094-10.087c0-5.56-4.512-10.072-10.094-10.072 c-5.553,0-10.065,4.513-10.065,10.072C368.295,269.038,372.807,273.551,378.36,273.551z"/></g></svg>`,
    },
    {
      id: 'connect',
      type: 'tab',
      title: 'S-Connect',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M14 9h4"/><path d="M14 13h4"/><path d="M14 17h2"/><circle cx="6" cy="7" r="1"/></svg>`,
    },
    {
      id: 'updates',
      type: 'tab',
      title: 'S-Update Logs',
      icon: `<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 16h5v5"></path></svg>`,
    },
    {
      id: 'tavern',
      type: 'action',
      title: 'Open Tavern in a separate window',
      icon: `<svg viewBox="0 0 512 512" style="fill: currentColor; stroke: none;"><path d="M105 41v96h30V41zm272 0v98h30V41zM25 57v30h62V57zm128 0v30h206V57zm272 0v30h62V57zM69 137v99l56.8 14.2L69 265.7v126.1c14.39-3.5 29.01-1.7 42.7 3.4 17.9 6.5 34.9 18 51.6 30.1 33.4 24.3 65.9 50.3 92.7 50.3 26.8 0 59.3-26 92.7-50.3 16.7-12.1 33.7-23.6 51.6-30.1 13.7-5.1 28.3-6.9 42.7-3.4v-42.6l-15.4-10.7-28.2-19.6L443 323V220.4l-45.7-14.5 45.7-9.5V137h-18v20h-66v-20H153v18H87v-18zm184.3 30H253.6c14.9.5 22.8 11.9 26.5 15.5 1.9 1.9 1.8 1.6 2.1 1.6 5.5-2.5 6.8-3.7 11.3-7.7h3.4c10 0 18.8 5.3 24.7 12.8 5.9 7.5 9.2 17.4 9.2 28.1 0 3.9-.4 7.6-1.3 11.2 4.1-1.5 8.1-2.7 12.2-2.9 1.5-.2 2.9-.1 4.3.1 5.9.6 12.7 5.2 14.6 11.7 10.3 34.2 7.7 71.4.1 100.8-2.7 10.6-10.6 17.6-18.6 20.3-4.5 1.5-8.9 2.1-13.1 2.4-.2 2 0 32.6 0 50.1H183c-.1-17.9 0-34.7 0-52 3.5-30.3 8.9-71.6 12.6-104.5-13.1-6.2-22.3-18.8-22.3-33.7 0-21.2 18.7-37.8 40.6-37.8 4.1 0 8.2.6 12 1.8 6.3-10.5 15.9-17.8 27.4-17.8zm-.1 18c-4.7.1-10.7 4.3-14.5 14.4l-3.6 9.7-9.1-5c-3.6-2-7.9-3.1-12.1-3.1-13.1 0-22.6 9.2-22.6 19.8 0 10.6 9.5 19.8 22.6 19.8 5.4 0 10.6-1.7 14.5-4.6l7.9-5.9 5.2 8.4c3.8 6.3 8.1 8.5 11.8 8.5 4.7 0 10.8-4.3 14.7-14.6l6.9-18.5 9.4 17.3c3.5 6.3 8.1 9 12.6 9 3.7 0 7.3-1.9 10.5-5.9 3.1-4 5.4-10.1 5.4-17s-2.3-13-5.4-17c-2.4-3-5-4.8-7.8-5.6-5.6 4.4-10.8 7.1-16.5 7.4-6.7.3-12.2-3.5-15.5-6.6-6.4-6.2-8.1-10.2-14.4-10.5zm90.4 58.6c-9.9 1.2-19.7 7.5-26.9 13.2l9.6 86.1c3.9-.2 7.5-.6 10-1.5 3.9-1.3 5.6-2.3 7-7.6 6.8-26.5 8.9-60.6.3-90.2zm-65.6 7.6c-6.2 8.3-14.7 13.8-24.7 13.8-8.4 0-16-3.9-21.9-10.2-5.5 2.5-11.5 3.8-17.5 3.8h-.6L202.1 359h107.8l-11.2-100.9c-.6.1-1.2.1-1.8.1-7 0-13.5-2.6-18.9-7zM201 377v16h110v-16z"/></svg>`,
    }
  ];

  function createGlassDock() {
    if (document.getElementById('singularity-glass-dock')) return;

    const container = document.createElement('div');
    container.className = 'glass-dock-container';
    container.id = 'singularity-glass-dock';

    const dock = document.createElement('div');
    dock.className = 'glass-dock';

    // Tooltip Element
    dockTooltip = document.createElement('div');
    dockTooltip.className = 'glass-dock-tooltip';
    dockTooltip.innerHTML = `
      <div class="glass-dock-tooltip-inner">
        <span class="glass-dock-tooltip-text slide-in" id="glass-dock-tooltip-label"></span>
      </div>
    `;
    dock.appendChild(dockTooltip);
    tooltipTextEl = dockTooltip.querySelector('#glass-dock-tooltip-label');

    let itemIndex = 0;
    NAV_ITEMS.forEach((item) => {
      const el = document.createElement('button');
      el.className = 'glass-dock-item';
      el.type = 'button';
      el.dataset.dockId = item.id;
      el.dataset.index = itemIndex++;
      el.dataset.title = item.title;
      if (item.type === 'tab') {
        el.dataset.tab = item.id;
      }
      el.innerHTML = item.icon + `<span class="glass-dock-badge" id="dock-badge-${item.id}"></span>`;

      // Mouseenter for sliding tooltip
      el.addEventListener('mouseenter', () => {
        handleMouseEnter(el, dock);
      });

      // Click handling
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleItemClick(item, el);
      });

      dock.appendChild(el);
    });

    dock.addEventListener('mouseleave', () => {
      hoveredIndex = null;
      prevIndex = null;
      if (dockTooltip) {
        dockTooltip.classList.remove('visible');
      }
    });

    container.appendChild(dock);
    document.body.appendChild(container);

    updateActiveDockTab();
  }

  // ===================================================================
  // Phone-only Sidebar (replaces the dock at <=768px; dock hidden via CSS)
  // ===================================================================
  const MOBILE_MQ = window.matchMedia('(max-width: 768px)');
  let sbEl = null;
  let sbScrim = null;
  let sbToggle = null;
  let sbOpen = false;
  let sbWidth = 300;

  function triggerHaptic(ms = 8) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) {}
  }
  window.triggerHaptic = triggerHaptic;

  // Real-time Visual Viewport & Soft Keyboard tracking (iOS Safari & Chrome Mobile)
  function initVisualViewportSync() {
    if (!window.visualViewport) return;
    let rAF = null;
    function updateViewport() {
      if (rAF) cancelAnimationFrame(rAF);
      rAF = requestAnimationFrame(() => {
        const vv = window.visualViewport;
        const winH = window.innerHeight;
        // Difference between layout viewport and visual viewport = soft keyboard height
        const keyboardInset = Math.max(0, winH - vv.height - (vv.offsetTop || 0));
        document.documentElement.style.setProperty('--keyboard-inset', `${Math.round(keyboardInset)}px`);
        document.documentElement.style.setProperty('--vv-height', `${Math.round(vv.height)}px`);
        const isKb = keyboardInset > 60;
        document.body.classList.toggle('keyboard-visible', isKb);
        if (isKb) {
          const chatHist = document.getElementById('chat-history');
          if (chatHist) {
            chatHist.scrollTop = chatHist.scrollHeight;
          }
        }
      });
    }
    window.visualViewport.addEventListener('resize', updateViewport, { passive: true });
    window.visualViewport.addEventListener('scroll', updateViewport, { passive: true });
    updateViewport();
  }

  function sbSetProgress(p) {
    p = Math.max(0, Math.min(1, p));
    if (sbEl) sbEl.style.setProperty('--p', p);
    if (sbScrim) {
      sbScrim.style.setProperty('--p', p);
      sbScrim.classList.toggle('visible', p > 0.001);
    }
  }

  function sbSetOpen(open, skipHistory = false) {
    sbOpen = !!open;
    triggerHaptic(8);
    if (sbEl) {
      sbEl.classList.remove('dragging');
      sbEl.classList.toggle('open', sbOpen);
      sbEl.setAttribute('aria-hidden', String(!sbOpen));
    }
    if (sbScrim) {
      sbScrim.classList.remove('dragging');
    }
    sbSetProgress(sbOpen ? 1 : 0);
    if (sbToggle) {
      sbToggle.classList.toggle('open', sbOpen);
      sbToggle.setAttribute('aria-expanded', String(sbOpen));
      sbToggle.setAttribute('aria-label', sbOpen ? 'Close navigation' : 'Open navigation');
    }
    document.body.classList.toggle('m-sidebar-open', sbOpen);
    
    // Native back button integration
    if (sbOpen && !skipHistory) {
      try {
        history.pushState({ singularity_drawer_open: true }, '');
      } catch (e) {}
    } else if (!sbOpen && !skipHistory && history.state?.singularity_drawer_open) {
      try {
        history.back();
      } catch (e) {}
    }

    if (sbOpen && sbEl) {
      updateSidebarProfile();
      const active = sbEl.querySelector('.m-sidebar-item.active');
      if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
    }
  }

  function resolveUserProfile() {
    let name = (localStorage.getItem('singularity_user_name') || '').trim();
    let avatar = (localStorage.getItem('singularity_user_avatar') || '').trim();

    // Check S-Connect active persona if not set or default 'Operator'
    if (!name || name.toLowerCase() === 'operator') {
      try {
        const activePersonaId = localStorage.getItem('s_connect_active_persona_id') || localStorage.getItem('s_connect_active_persona');
        const rawPersonas = localStorage.getItem('s_connect_personas');
        if (rawPersonas) {
          const personas = JSON.parse(rawPersonas);
          const active = (Array.isArray(personas) && personas.find(p => p.id === activePersonaId)) || (Array.isArray(personas) && personas[0]);
          if (active && active.name && active.name.trim()) {
            name = active.name.trim();
            if (!avatar && active.avatar) avatar = active.avatar.trim();
          }
        }
      } catch (_) {}
    }

    if (!name || name.toLowerCase() === 'operator') {
      const alt = (localStorage.getItem('singularity_user_profile_name') || '').trim();
      if (alt) name = alt;
    }
    if (!avatar) {
      avatar = (localStorage.getItem('singularity_user_avatar_url') || '').trim();
    }

    if (!name) name = 'Operator';
    return { name, avatar };
  }

  function updateSidebarProfile() {
    if (!sbEl) return;
    const profile = resolveUserProfile();
    const isCloud = localStorage.getItem('singularity_cloud_authenticated') === 'true';

    const nameEl = sbEl.querySelector('.m-sidebar-user-name');
    if (nameEl) nameEl.textContent = profile.name;

    const badgeEl = sbEl.querySelector('.m-sidebar-user-badge');
    if (badgeEl) {
      badgeEl.className = `m-sidebar-user-badge ${isCloud ? 'cloud' : 'local'}`;
      badgeEl.textContent = isCloud ? 'Cloud Synced' : 'Offline Vault';
    }

    const avatarBox = sbEl.querySelector('#m-sidebar-avatar-box');
    if (avatarBox) {
      if (profile.avatar) {
        avatarBox.innerHTML = `<img src="${profile.avatar}" alt="${profile.name}" />`;
      } else {
        avatarBox.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
      }
    }
  }

  function createMobileSidebar() {
    if (document.getElementById('singularity-mobile-sidebar')) return;

    initVisualViewportSync();

    // Toggle button with morphing three-bar -> X icon
    sbToggle = document.createElement('button');
    sbToggle.type = 'button';
    sbToggle.id = 'singularity-sidebar-toggle';
    sbToggle.className = 'm-sidebar-toggle';
    sbToggle.setAttribute('aria-label', 'Open navigation');
    sbToggle.setAttribute('aria-controls', 'singularity-mobile-sidebar');
    sbToggle.setAttribute('aria-expanded', 'false');
    sbToggle.innerHTML = `
      <span class="m-burger" aria-hidden="true">
        <span class="m-burger-bar b1"></span>
        <span class="m-burger-bar b2"></span>
        <span class="m-burger-bar b3"></span>
      </span>`;
    sbToggle.addEventListener('click', () => sbSetOpen(!sbOpen));

    sbScrim = document.createElement('div');
    sbScrim.className = 'm-sidebar-scrim';
    sbScrim.addEventListener('click', () => sbSetOpen(false));

    sbEl = document.createElement('aside');
    sbEl.id = 'singularity-mobile-sidebar';
    sbEl.className = 'm-sidebar';
    sbEl.setAttribute('aria-label', 'Main navigation');
    sbEl.setAttribute('aria-hidden', 'true');

    // Sidebar Header: Logo & Branding (Subtitle removed per user request)
    const head = document.createElement('div');
    head.className = 'm-sidebar-head';
    head.innerHTML = `
      <img class="m-sidebar-logo" src="/logo.svg" alt="Singularity" />
      <div class="m-sidebar-brand">
        <span class="m-sidebar-title">Singularity</span>
      </div>`;
    sbEl.appendChild(head);

    // Navigation Items List
    const list = document.createElement('nav');
    list.className = 'm-sidebar-list';
    NAV_ITEMS.forEach((item) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'm-sidebar-item';
      b.dataset.dockId = item.id;
      if (item.type === 'tab') b.dataset.tab = item.id;
      const label = item.id === 'tavern' ? 'Tavern Studio' : item.title;
      b.innerHTML = `<span class="m-sidebar-icon">${item.icon}</span><span class="m-sidebar-label">${label}</span>` +
        (item.id === 'tavern' ? `<span class="m-sidebar-ext" aria-hidden="true">↗</span>` : '');
      b.addEventListener('click', () => {
        triggerHaptic(8);
        handleItemClick(item, b);
        sbSetOpen(false);
      });
      list.appendChild(b);
    });
    sbEl.appendChild(list);

    // Sidebar Footer: User Account Capsule & Settings Gear
    const foot = document.createElement('div');
    foot.className = 'm-sidebar-foot';

    const userProfile = resolveUserProfile();
    const isCloud = localStorage.getItem('singularity_cloud_authenticated') === 'true';

    foot.innerHTML = `
      <div class="m-sidebar-profile-card">
        <div class="m-sidebar-avatar-circle" id="m-sidebar-avatar-box">
          ${userProfile.avatar ? `<img src="${userProfile.avatar}" alt="${userProfile.name}" />` : `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`}
        </div>
        <div class="m-sidebar-user-details" id="m-sidebar-user-details">
          <span class="m-sidebar-user-name">${userProfile.name}</span>
          <span class="m-sidebar-user-badge ${isCloud ? 'cloud' : 'local'}">${isCloud ? 'Cloud Synced' : 'Offline Vault'}</span>
        </div>
        <button type="button" class="m-sidebar-gear-btn" id="m-sidebar-gear-btn" aria-label="Settings" title="Open Settings">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
      </div>
    `;

    const profileTrigger = foot.querySelector('.m-sidebar-profile-card');
    profileTrigger.addEventListener('click', (e) => {
      triggerHaptic(10);
      sbSetOpen(false);
      const gear = document.getElementById('btn-open-settings');
      if (gear) setTimeout(() => gear.click(), 220);
    });

    sbEl.appendChild(foot);

    document.body.appendChild(sbScrim);
    document.body.appendChild(sbEl);
    document.body.appendChild(sbToggle);
    sbSetProgress(0);

    // Sync profile on events
    window.addEventListener('singularity-settings-updated', updateSidebarProfile);
    window.addEventListener('storage', updateSidebarProfile);

    // Esc closes
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sbOpen) sbSetOpen(false);
    });

    // Hardware back button / swipe-back closes drawer
    window.addEventListener('popstate', (e) => {
      if (sbOpen) {
        sbSetOpen(false, true);
      }
    });

    // Close if viewport grows past phone breakpoint
    const onMq = () => { if (!MOBILE_MQ.matches && sbOpen) sbSetOpen(false); };
    if (MOBILE_MQ.addEventListener) MOBILE_MQ.addEventListener('change', onMq);
    else if (MOBILE_MQ.addListener) MOBILE_MQ.addListener(onMq);

    bindSidebarGestures();
    updateActiveDockTab();

    // Mobile Top Bar Model Chip click handler
    const topModelChip = document.getElementById('claude-top-model-chip');
    if (topModelChip) {
      topModelChip.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerHaptic(8);
        const popover = document.getElementById('model-select-popover');
        if (popover) {
          const isOpen = popover.classList.toggle('open');
          topModelChip.classList.toggle('active', isOpen);
          if (isOpen) {
            document.getElementById('model-filter-input')?.focus();
          }
        }
      });
    }

    initBottomSheets();
  }

  // Mobile Bottom Sheet Scrim & Swipe-Down-To-Dismiss Engine
  function initBottomSheets() {
    let bsScrim = document.getElementById('bottom-sheet-scrim');
    if (!bsScrim) {
      bsScrim = document.createElement('div');
      bsScrim.id = 'bottom-sheet-scrim';
      bsScrim.className = 'bottom-sheet-scrim';
      document.body.appendChild(bsScrim);
    }

    const popover = document.getElementById('model-select-popover');
    const settings = document.getElementById('playground-settings-dropdown');
    const topChip = document.getElementById('claude-top-model-chip');
    const modelTrigger = document.getElementById('model-select-trigger');

    function closeBottomSheets() {
      triggerHaptic(6);
      if (popover) popover.classList.remove('open');
      if (settings) settings.classList.remove('open');
      if (topChip) topChip.classList.remove('active');
      if (modelTrigger) modelTrigger.classList.remove('active');
      if (bsScrim) bsScrim.classList.remove('visible');
      document.body.classList.remove('bottom-sheet-open');
    }

    bsScrim.addEventListener('click', closeBottomSheets);

    function syncScrim() {
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      const isOpen = isMobile && ((popover && popover.classList.contains('open')) || (settings && settings.classList.contains('open')));
      if (bsScrim) bsScrim.classList.toggle('visible', !!isOpen);
      document.body.classList.toggle('bottom-sheet-open', !!isOpen);
    }

    if (window.MutationObserver) {
      const mo = new MutationObserver(syncScrim);
      if (popover) mo.observe(popover, { attributes: true, attributeFilter: ['class'] });
      if (settings) mo.observe(settings, { attributes: true, attributeFilter: ['class'] });
    }
    window.addEventListener('singularity-bottomsheet-change', syncScrim);

    // Swipe-down-to-dismiss for bottom sheets on mobile
    function bindDismiss(sheet) {
      if (!sheet) return;
      let startY = 0;
      let currentY = 0;
      let dragging = false;

      sheet.addEventListener('touchstart', (e) => {
        if (!window.matchMedia('(max-width: 768px)').matches) return;
        if (sheet.scrollTop > 6) return;
        startY = e.touches[0].clientY;
        dragging = true;
      }, { passive: true });

      sheet.addEventListener('touchmove', (e) => {
        if (!dragging) return;
        currentY = e.touches[0].clientY;
        const dy = currentY - startY;
        if (dy > 0) {
          sheet.style.transform = `translate3d(0, ${dy}px, 0)`;
          sheet.style.transition = 'none';
        }
      }, { passive: true });

      const onEnd = () => {
        if (!dragging) return;
        dragging = false;
        sheet.style.transition = '';
        const dy = currentY - startY;
        if (dy > 70) {
          closeBottomSheets();
          sheet.style.transform = '';
        } else {
          sheet.style.transform = '';
        }
        startY = 0;
        currentY = 0;
      };

      sheet.addEventListener('touchend', onEnd, { passive: true });
      sheet.addEventListener('touchcancel', onEnd, { passive: true });
    }

    bindDismiss(popover);
    bindDismiss(settings);
  }

  // Edge-swipe to open, drag-to-close, finger-following drawer
  function bindSidebarGestures() {
    let tracking = null; // { mode:'open'|'close', startX, startY, lastX, lastT, vx, locked }
    const EDGE = 22;

    function width() { return sbEl.offsetWidth || sbWidth; }

    document.addEventListener('touchstart', (e) => {
      if (!MOBILE_MQ.matches || e.touches.length !== 1) return;
      const t = e.touches[0];
      if (!sbOpen && t.clientX <= EDGE) {
        tracking = { mode: 'open', startX: t.clientX, startY: t.clientY, lastX: t.clientX, lastT: Date.now(), vx: 0, locked: false };
      } else if (sbOpen) {
        tracking = { mode: 'close', startX: t.clientX, startY: t.clientY, lastX: t.clientX, lastT: Date.now(), vx: 0, locked: false };
      }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!tracking) return;
      const t = e.touches[0];
      const dx = t.clientX - tracking.startX;
      const dy = t.clientY - tracking.startY;
      if (!tracking.locked) {
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { tracking = null; return; }
        if (Math.abs(dx) > 8) {
          tracking.locked = true;
          sbEl.classList.add('dragging');
          sbScrim.classList.add('dragging');
        } else return;
      }
      const now = Date.now();
      const dt = Math.max(1, now - tracking.lastT);
      tracking.vx = (t.clientX - tracking.lastX) / dt;
      tracking.lastX = t.clientX;
      tracking.lastT = now;
      const w = width();
      const p = tracking.mode === 'open' ? dx / w : 1 + dx / w;
      sbSetProgress(p);
    }, { passive: true });

    function end() {
      if (!tracking) return;
      const wasLocked = tracking.locked;
      const vx = tracking.vx;
      const mode = tracking.mode;
      tracking = null;
      if (!wasLocked) return;
      const cur = parseFloat(sbEl.style.getPropertyValue('--p')) || 0;
      let open;
      if (Math.abs(vx) > 0.4) open = vx > 0;
      else open = cur > 0.5;
      sbSetOpen(open);
    }
    document.addEventListener('touchend', end, { passive: true });
    document.addEventListener('touchcancel', end, { passive: true });
  }

  function handleMouseEnter(itemEl, dockEl) {
    try {
      const idx = parseInt(itemEl.dataset.index, 10);
      const title = itemEl.dataset.title;

      if (!dockTooltip || !tooltipTextEl) return;

      tooltipTextEl.textContent = title;

      const itemRect = itemEl.getBoundingClientRect();
      const dockRect = dockEl.getBoundingClientRect();
      const isVertical = document.body.classList.contains('dock-vertical');

      const direction = (hoveredIndex !== null && idx !== hoveredIndex)
        ? (idx > hoveredIndex ? 1 : -1)
        : 0;

      prevIndex = hoveredIndex;
      hoveredIndex = idx;

      if (isVertical) {
        // In vertical format: tooltip is on the right of the dock, positioned at item's Y
        const tooltipHeight = dockTooltip.offsetHeight || 28;
        const centerOffsetY = (itemRect.top - dockRect.top) + (itemRect.height / 2) - (tooltipHeight / 2);
        dockTooltip.style.transform = `translate3d(0, ${Math.round(centerOffsetY)}px, 0) scale(1)`;
      } else {
        // In horizontal format: tooltip is on top of the dock, positioned at item's X
        const tooltipWidth = dockTooltip.offsetWidth || 100;
        const centerOffsetX = (itemRect.left - dockRect.left) + (itemRect.width / 2) - (tooltipWidth / 2);
        dockTooltip.style.transform = `translate3d(${Math.round(centerOffsetX)}px, 0, 0) scale(1)`;
      }

      dockTooltip.classList.add('visible');

      // Direction-aware blur slide
      if (direction !== 0) {
        if (isVertical) {
          tooltipTextEl.className = 'glass-dock-tooltip-text ' + (direction > 0 ? 'slide-from-bottom' : 'slide-from-top');
        } else {
          tooltipTextEl.className = 'glass-dock-tooltip-text ' + (direction > 0 ? 'slide-from-right' : 'slide-from-left');
        }
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (tooltipTextEl) {
              tooltipTextEl.className = 'glass-dock-tooltip-text slide-in';
            }
          });
        });
      } else {
        tooltipTextEl.className = 'glass-dock-tooltip-text slide-in';
      }
    } catch (err) {
      console.warn('Dock tooltip calculation:', err);
    }
  }

  function handleItemClick(item, el) {
    if (dockTooltip) {
      dockTooltip.classList.remove('visible');
    }
    hoveredIndex = null;
    prevIndex = null;

    if (item.type === 'tab') {
      try {
        if (typeof window.switchTab === 'function') {
          window.switchTab(item.id);
        }
      } catch (err) {
        console.error('switchTab error:', err);
      }
      updateActiveDockTab();
      updateDockMode();
    } else if (item.id === 'tavern') {
      try {
        if (typeof window.openTavernStudio === 'function') {
          window.openTavernStudio();
        }
      } catch (err) {
        console.error('openTavernStudio error:', err);
      }
    }
  }

  function updateActiveDockTab() {
    const activeTab = document.body.dataset.activeTab || 'playground';
    document.querySelectorAll('.glass-dock-item[data-tab], .m-sidebar-item[data-tab]').forEach((el) => {
      el.classList.toggle('active', el.dataset.tab === activeTab);
    });
  }

  // Updates dock between horizontal bottom and vertical left format
  function updateDockMode(forceVertical) {
    const isPlayground = (document.body.dataset.activeTab || 'playground') === 'playground';
    const workspace = document.getElementById('playground-workspace');
    const hasMessages = workspace ? workspace.classList.contains('has-messages') : false;

    const shouldBeVertical = (typeof forceVertical === 'boolean')
      ? forceVertical
      : (!isPlayground || hasMessages);

    if (shouldBeVertical) {
      if (!document.body.classList.contains('dock-vertical')) {
        document.body.classList.add('dock-vertical');
      }
    } else {
      if (document.body.classList.contains('dock-vertical')) {
        document.body.classList.remove('dock-vertical');
      }
    }
  }

  // Observe active tab or has-messages changes without feedback loops
  const observer = new MutationObserver(() => {
    updateActiveDockTab();
    updateDockMode();
  });

  function init() {
    createGlassDock();
    createMobileSidebar();
    updateDockMode();

    // Observe data-active-tab only (NOT class on body to avoid feedback loops)
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-active-tab'] });

    const workspace = document.getElementById('playground-workspace');
    if (workspace) {
      observer.observe(workspace, { attributes: true, attributeFilter: ['class'] });
    }

    window.SingularityGlassDock = {
      updateDockMode,
      updateActiveDockTab,
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
