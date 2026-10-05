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
    document.querySelectorAll('.glass-dock-item[data-tab]').forEach((el) => {
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
