/**
 * Singularity S-Connect Controller Module
 * JanitorAI Bot Hub, Prompt Interceptor & SillyTavern Character Card Matrix
 * Faithful recreation of Domcord Cards architecture and UI workflow.
 */

(function () {
  const DEFAULT_AVATAR = "/static/preloader/3a6a0a99717d5533928eecd2046ec085.jpg";

  const ICONS = {
    search: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    back: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`,
    download: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    bookmark: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`,
    bookmarkFilled: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="currentColor" stroke-width="1"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`,
    chat: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
    token: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
    copy: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    check: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    play: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
    lock: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
    unlock: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`,
    user: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    arrowRight: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`,
    menu: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`,
    sparkle: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"></path></svg>`,
    send: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`,
    chevronDown: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
    volume: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`,
    refresh: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`,
    trash: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    edit: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    settings: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`,
    save: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`,
    palette: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle><path d="M12 2C6.49 2 2 6.49 2 12c0 4.41 3.59 8 8 8 .55 0 1-.45 1-1 0-.28-.11-.53-.29-.71-.3-.3-.49-.7-.49-1.16 0-.89.72-1.61 1.61-1.61.46 0 .86.19 1.16.49.18.18.43.29.71.29 4.41 0 8-3.59 8-8 0-5.51-4.49-10-9.7-10z"></path></svg>`,
    globe: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`,
    newChat: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><circle cx="9" cy="10" r="1" fill="currentColor"></circle><circle cx="12" cy="10" r="1" fill="currentColor"></circle><circle cx="15" cy="10" r="1" fill="currentColor"></circle></svg>`,
    allChats: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="10" x2="16" y2="10"></line><line x1="8" y1="14" x2="12" y2="14"></line></svg>`,
    briefcase: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
    cloudSync: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><polyline points="13 14 11 16 9 14"/><line x1="11" y1="10" x2="11" y2="16"/></svg>`
  };

  const SConnect = {
    currentView: 'discover',
    prevView: 'discover',
    homeSort: 'trending_24h',
    homeTag: 'all',
    homeBots: [],
    recentBots: [],
    featuredCreators: [],
    activeBot: null,
    activeCreator: null,
    activeDetailTab: 'bio',
    activeGreetingIdx: 0,
    searchDebounce: null,
    savedBotIds: new Set(),
    followingCreatorIds: new Set(),
    botCache: new Map(),

    init() {
      try {
        const saved = JSON.parse(localStorage.getItem('s_connect_saved_bots') || '[]');
        this.savedBotIds = new Set(saved);
        const following = JSON.parse(localStorage.getItem('s_connect_following') || '[]');
        this.followingCreatorIds = new Set(following);
      } catch (e) {
        console.warn('Failed to load connect preferences:', e);
      }

      this.migrateLegacyChats();
      this.syncWithServer();

      // Native-like tab coordination for <details name="..."> across all browsers
      if (!this._tabsListenerBound) {
        this._tabsListenerBound = true;
        document.addEventListener('toggle', (e) => {
          const target = e.target;
          if (target && target.tagName === 'DETAILS' && target.open) {
            const name = target.getAttribute('name');
            if (name) {
              const container = target.closest('.tab-box, .tab-nav, .creator-bio-body, .detail-panel-body') || document;
              container.querySelectorAll(`details[name="${name}"]`).forEach(d => {
                if (d !== target && d.open) d.open = false;
              });
            }
          }
        }, true);
      }

      // Profile navigation button tabs (Fraise/Sepha/Puppy anchor tabs)
      if (!this._navButtonsBound) {
        this._navButtonsBound = true;
        document.addEventListener('click', (e) => {
          const btn = e.target.closest('.profile-nav-buttons a, .about-nav a');
          if (btn) {
            const href = btn.getAttribute('href');
            if (href && href.startsWith('#')) {
              e.preventDefault();
              const targetId = href.slice(1);
              const container = btn.closest('.creator-bio-body, .detail-panel-body, .bot-detail-page') || document;
              
              // Highlight active link
              const parent = btn.parentElement;
              if (parent) {
                parent.querySelectorAll('a').forEach(a => a.classList.remove('is-active'));
              }
              btn.classList.add('is-active');

              // Switch profile tabs if tab containers exist
              const tabs = container.querySelectorAll('.profile-tab, .about-box, .about-tab');
              let foundMatching = false;
              tabs.forEach(tab => {
                if (tab.classList.contains(`profile-${targetId}`) || tab.classList.contains(targetId) || tab.id === targetId) {
                  tab.style.display = 'block';
                  foundMatching = true;
                } else if (tabs.length > 1) {
                  tab.style.display = 'none';
                }
              });

              const targetEl = document.getElementById(targetId);
              if (targetEl && !foundMatching) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }
          }
        });
      }

      if (!this._popstateBound) {
        this._popstateBound = true;
        window.addEventListener('popstate', () => {
          this.handleHashRoute();
        });
      }

      const hash = (window.location.hash || '').replace('#', '');
      if (hash.startsWith('connect/')) {
        const parts = hash.split('/');
        const view = parts[1];
        const param = parts[2] ? decodeURIComponent(parts[2]) : null;
        if (view === 'bot') this.navigate('bot', { id: param }, false);
        else if (view === 'chat') this.navigate('chat', { id: param }, false);
        else if (view === 'creator') this.navigate('creator', { id: param }, false);
        else if (view === 'my-chats') this.navigate('my-chats', { id: param }, false);
        else if (view) this.navigate(view, {}, false);
        else this.navigate('discover', {}, false);
      } else {
        this.navigate('discover', {}, false);
      }
    },

    handleHashRoute() {
      const hash = (window.location.hash || '').replace('#', '');
      if (hash.startsWith('connect/')) {
        const parts = hash.split('/');
        const view = parts[1];
        const param = parts[2] ? decodeURIComponent(parts[2]) : null;
        if (view === 'bot') this.navigate('bot', { id: param }, false);
        else if (view === 'chat') this.navigate('chat', { id: param }, false);
        else if (view === 'creator') this.navigate('creator', { id: param }, false);
        else if (view === 'my-chats') this.navigate('my-chats', { id: param }, false);
        else if (view) this.navigate(view, {}, false);
        else this.navigate('discover', {}, false);
      }
    },

    show() {
      if (this.currentView === 'discover' && (!this.homeBots || this.homeBots.length === 0)) {
        this.loadDiscoverData();
      }
    },

    cacheBot(bot) {
      if (bot && bot.id) {
        this.botCache.set(bot.id, bot);
      }
    },

    resolveCategoryBadge(bot) {
      const tags = Array.isArray(bot.tags) ? bot.tags : [];
      const cat = bot.category || tags[0] || 'FICTIONAL';
      const upper = cat.toUpperCase();
      if (upper.includes('FEMALE') || upper.includes('WOMAN')) return `🔥 FEMALE`;
      if (upper.includes('MALE') || upper.includes('MAN')) return `👑 MALE`;
      if (upper.includes('MULTIPLE') || upper.includes('GROUP')) return `👥 MULTIPLE`;
      if (upper.includes('ANIME')) return `📖 ANIME`;
      if (upper.includes('SCENARIO') || upper.includes('RPG')) return `🎭 SCENARIO`;
      return `🏷️ ${cat.replace(/^[^\w\s]+/, '').trim().toUpperCase() || 'FICTIONAL'}`;
    },

    formatNumber(num) {
      const n = Number(num) || 0;
      if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
      if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
      return n.toLocaleString();
    },

    // -------------------------------------------------------------------------
    // NAVIGATION ROUTER
    // -------------------------------------------------------------------------
    navigate(view, params = {}, updateHash = true) {
      if (this.currentView !== 'bot' && this.currentView !== 'creator' && this.currentView !== 'chat') {
        this.prevView = this.currentView;
      }
      this.currentView = view;

      // Update Nav Capsule Pill States
      document.querySelectorAll('.cards-nav-pill-btn').forEach(btn => btn.classList.remove('is-active'));
      const activeNavBtn = document.getElementById(`cnav-${view}`);
      if (activeNavBtn) activeNavBtn.classList.add('is-active');

      // Seamlessly sync URL hash for browser forward/back buttons
      if (updateHash) {
        let targetHash = `connect/${view}`;
        if (params.id) {
          targetHash += `/${params.id}`;
        } else if (params.q) {
          targetHash += `/${encodeURIComponent(params.q)}`;
        }
        if (window.location.hash !== '#' + targetHash) {
          history.pushState(null, '', '#' + targetHash);
        }
      }

      // Fullscreen Janitor Chat Class Toggle
      if (view === 'chat') {
        document.body.classList.add('is-janitor-chat-active');
        document.documentElement.classList.add('is-janitor-chat-active');
      } else {
        document.body.classList.remove('is-janitor-chat-active');
        document.documentElement.classList.remove('is-janitor-chat-active');
      }

      // Hide or show top nav bar depending on chat view
      const topNav = document.querySelector('.cards-top-nav-bar');
      if (topNav) {
        topNav.style.display = (view === 'chat') ? 'none' : '';
      }

      const container = document.getElementById('connect-main-view');
      if (!container) return;

      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (view === 'discover') {
        this.renderDiscoverView(container);
      } else if (view === 'following') {
        this.renderFollowingView(container);
      } else if (view === 'search') {
        this.renderSearchView(container, params.q || '');
      } else if (view === 'creators') {
        this.renderCreatorsView(container);
      } else if (view === 'library') {
        this.renderLibraryView(container);
      } else if (view === 'interceptor') {
        this.renderInterceptorView(container);
      } else if (view === 'bot') {
        this.renderBotDetailView(container, params.id);
      } else if (view === 'creator') {
        this.renderCreatorDetailView(container, params.id);
      } else if (view === 'my-chats') {
        this.renderMyChatsView(container, params.id || null);
      } else if (view === 'chat') {
        this.renderChatView(container, params.id);
      }
    },

    navigateBack() {
      document.body.classList.remove('is-janitor-chat-active');
      document.documentElement.classList.remove('is-janitor-chat-active');
      if (window.history.length > 1) {
        window.history.back();
      } else {
        this.navigate(this.prevView || 'discover');
      }
    },

    // -------------------------------------------------------------------------
    // 1. DISCOVER VIEW (Exact Match to Screenshot 1)
    // -------------------------------------------------------------------------
    renderDiscoverView(container) {
      container.innerHTML = `
        <div class="view-discover-wrapper">
          <!-- Hero Section: Omni-Search -->
          <section class="hero-deck-section">
            <!-- Omni-Search Bar -->
            <div class="search-component-wrapper">
              <div class="search-input-shell">
                <span class="search-icon">${ICONS.search}</span>
                <input 
                  id="hero-search-input" 
                  class="search-main-input" 
                  type="text" 
                  placeholder="Search bots, creators, or links..." 
                  autocomplete="off"
                  oninput="SConnect.handleSearchInput(this.value)"
                  onkeydown="SConnect.handleSearchKeyDown(event)"
                  onfocus="SConnect.showSuggestions(true)"
                />
                <button class="search-submit-btn" onclick="SConnect.submitHeroSearch()">Search</button>
              </div>

              <!-- Autocomplete Suggestions Dropdown -->
              <div id="hero-suggestions" class="search-suggestions-dropdown"></div>
            </div>
          </section>

          <!-- Category Filter Chips Bar -->
          <div class="filter-chips-bar">
            <button class="filter-chip ${this.homeTag === 'all' ? 'is-active' : ''}" onclick="SConnect.filterTag('all', this)">All Cards</button>
            <button class="filter-chip ${this.homeTag === 'Romance' ? 'is-active' : ''}" onclick="SConnect.filterTag('Romance', this)">Romance</button>
            <button class="filter-chip ${this.homeTag === 'Fantasy' ? 'is-active' : ''}" onclick="SConnect.filterTag('Fantasy', this)">Dark Fantasy</button>
            <button class="filter-chip ${this.homeTag === 'Sci-Fi' ? 'is-active' : ''}" onclick="SConnect.filterTag('Sci-Fi', this)">Cyberpunk / Sci-Fi</button>
            <button class="filter-chip ${this.homeTag === 'Wholesome' ? 'is-active' : ''}" onclick="SConnect.filterTag('Wholesome', this)">Wholesome</button>
            <button class="filter-chip ${this.homeTag === 'Anime' ? 'is-active' : ''}" onclick="SConnect.filterTag('Anime', this)">Anime</button>
            <button class="filter-chip ${this.homeTag === 'Dominant' ? 'is-active' : ''}" onclick="SConnect.filterTag('Dominant', this)">Dominant</button>
          </div>

          <!-- Section Header: Community Characters + Segmented Sort Capsule -->
          <div class="section-header">
            <div class="section-title-wrap">
              <h2 class="section-title">Community Characters</h2>
              <span class="section-subtitle">Real-time character cards from JanitorAI</span>
            </div>

            <!-- Sort Segmented Capsule: 24H Trending, Weekly, Popular, Newest -->
            <div class="home-sort-segment">
              <button class="library-segment-btn ${this.homeSort === 'trending_24h' ? 'is-active' : ''}" onclick="SConnect.setSort('trending_24h', this)">
                24H Trending
              </button>
              <button class="library-segment-btn ${this.homeSort === 'trending_week' ? 'is-active' : ''}" onclick="SConnect.setSort('trending_week', this)">
                Weekly
              </button>
              <button class="library-segment-btn ${this.homeSort === 'popular' ? 'is-active' : ''}" onclick="SConnect.setSort('popular', this)">
                Popular
              </button>
              <button class="library-segment-btn ${this.homeSort === 'latest' ? 'is-active' : ''}" onclick="SConnect.setSort('latest', this)">
                Newest
              </button>
            </div>
          </div>

          <!-- Character Cards Grid (4 Columns, Tall Aspect Ratio) -->
          <div id="home-trending-grid" class="bot-cards-grid">
            ${Array.from({ length: 8 }, () => `<div class="bot-card skeleton"></div>`).join('')}
          </div>

          <!-- Load More Button -->
          <div style="display:flex; justify-content:center; margin: var(--c-space-8) 0 var(--c-space-10);">
            <button class="load-more-btn" onclick="SConnect.loadMoreBots()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
              <span>Load More Characters</span>
            </button>
          </div>

          <!-- Recently Released Section -->
          <div style="margin-top: var(--c-space-8);">
            <div class="section-header">
              <div class="section-title-wrap">
                <h2 class="section-title">Recently Added</h2>
                <span class="section-subtitle">Fresh character releases</span>
              </div>
            </div>

            <div id="home-recent-grid" class="bot-cards-grid">
              ${Array.from({ length: 4 }, () => `<div class="bot-card skeleton"></div>`).join('')}
            </div>
          </div>
        </div>
      `;

      this.loadDiscoverData();
    },

    async loadDiscoverData() {
      try {
        const tagParam = this.homeTag !== 'all' ? `&tag=${encodeURIComponent(this.homeTag)}` : '';
        const [resMain, resRecent] = await Promise.all([
          fetch(`/api/connect/search?sort=${this.homeSort}${tagParam}&page=1&limit=24`).then(r => r.json()),
          fetch(`/api/connect/search?sort=latest&page=1&limit=8`).then(r => r.json())
        ]);

        const bots = (resMain.data && resMain.data.bots) || resMain.bots || resMain.items || [];
        const recentBots = (resRecent.data && resRecent.data.bots) || resRecent.bots || resRecent.items || [];

        this.homeBots = bots;
        this.recentBots = recentBots;

        bots.forEach(b => this.cacheBot(b));
        recentBots.forEach(b => this.cacheBot(b));

        // 1. Hydrate Main Trending Grid
        const grid = document.getElementById('home-trending-grid');
        if (grid) {
          if (bots.length > 0) {
            grid.innerHTML = bots.map((b, i) => this.renderBotCardHTML(b, i)).join('');
          } else {
            grid.innerHTML = `<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--c-text-muted);">No characters found for this filter.</div>`;
          }
        }

        // 2. Hydrate Recently Released Grid
        const rGrid = document.getElementById('home-recent-grid');
        if (rGrid && recentBots.length > 0) {
          rGrid.innerHTML = recentBots.slice(0, 8).map((b, i) => this.renderBotCardHTML(b, i)).join('');
        }
      } catch (err) {
        console.error('Error hydrating discover feed:', err);
      }
    },

    setSort(sort, btn) {
      this.homeSort = sort;
      document.querySelectorAll('.home-sort-segment .library-segment-btn').forEach(b => b.classList.remove('is-active'));
      if (btn) btn.classList.add('is-active');

      const grid = document.getElementById('home-trending-grid');
      if (grid) {
        grid.innerHTML = Array.from({ length: 8 }, () => `<div class="bot-card skeleton"></div>`).join('');
      }
      this.loadDiscoverData();
    },

    filterTag(tag, btn) {
      this.homeTag = tag;
      document.querySelectorAll('.filter-chips-bar .filter-chip').forEach(c => c.classList.remove('is-active'));
      if (btn) btn.classList.add('is-active');

      const grid = document.getElementById('home-trending-grid');
      if (grid) {
        grid.innerHTML = Array.from({ length: 8 }, () => `<div class="bot-card skeleton"></div>`).join('');
      }
      this.loadDiscoverData();
    },

    async loadMoreBots() {
      const nextPage = Math.floor(this.homeBots.length / 24) + 1;
      try {
        const tagParam = this.homeTag !== 'all' ? `&tag=${encodeURIComponent(this.homeTag)}` : '';
        const res = await fetch(`/api/connect/search?sort=${this.homeSort}${tagParam}&page=${nextPage}&limit=24`).then(r => r.json());
        const newBots = (res.data && res.data.bots) || res.bots || res.items || [];
        if (newBots.length > 0) {
          newBots.forEach(b => {
            this.cacheBot(b);
            this.homeBots.push(b);
          });
          const grid = document.getElementById('home-trending-grid');
          if (grid) {
            grid.insertAdjacentHTML('beforeend', newBots.map((b, i) => this.renderBotCardHTML(b, i)).join(''));
          }
        }
      } catch (e) {
        console.warn('Error loading more bots:', e);
      }
    },

    // -------------------------------------------------------------------------
    // BOT POSTER CARD HTML (Tall Portrait Format 9:16)
    // -------------------------------------------------------------------------
    renderBotCardHTML(bot, index = 0) {
      if (!bot) return '';
      this.cacheBot(bot);

      const isSaved = this.savedBotIds.has(bot.id);
      const catBadge = this.resolveCategoryBadge(bot);
      const tags = Array.isArray(bot.tags) ? bot.tags : [];
      const botAvatar = bot.avatar || DEFAULT_AVATAR;
      const creatorName = bot.creator_name || bot.creatorName || 'Janitor Creator';
      const creatorAvatar = bot.creator_avatar || bot.creatorAvatar || DEFAULT_AVATAR;

      return `
        <div class="bot-card pp-cc-wrapper profile-character-card-wrapper css-13wmn96 css-1sxhvxh" onclick="SConnect.openBotDetail('${bot.id}')">
          <!-- Full Bleed Character Portrait -->
          <img class="bot-card-bg-image pp-cc-avatar profile-character-card-avatar-image css-147i79y css-1q7rmf0" src="${botAvatar}" alt="${bot.name}" loading="lazy" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';">
          
          <!-- Gradient Overlay -->
          <div class="bot-card-gradient-overlay"></div>

          <!-- Top Bar: Category Chip + Quick Hover Buttons -->
          <div class="bot-card-top-bar">
            <span class="bot-card-cat-chip">${catBadge}</span>
            <div class="bot-card-actions-group">
              <button class="card-action-btn ${isSaved ? 'is-saved' : ''}" title="Save to Library" onclick="event.stopPropagation(); SConnect.toggleSaveBot('${bot.id}', this)">
                ${isSaved ? ICONS.bookmarkFilled : ICONS.bookmark}
              </button>
              <button class="card-action-btn" title="Download SillyTavern V2 PNG" onclick="event.stopPropagation(); SConnect.downloadBotPNG('${bot.id}')">
                ${ICONS.download}
              </button>
            </div>
          </div>

          <!-- Bottom Content Area -->
          <div class="bot-card-content-area pp-cc-stack profile-character-card-stack css-1s5evre">
            <div class="bot-card-stat-pills-row profile-character-card-stats-box css-10cv7r2">
              <span class="bot-card-stat-pill pp-cc-ribbon pp-cc-chats profile-character-card-ribbon profile-character-card-chats-hstack css-1ket5wn css-euh5x6">
                ${ICONS.chat}
                <span class="pp-cc-chats-count profile-character-card-chats-count">${this.formatNumber(bot.messages || bot.chats || 0)}</span>
              </span>
              <span class="bot-card-stat-pill pp-cc-tokens-count profile-character-card-tokens-count css-1c9wmts">
                ${ICONS.token}
                <span>${(bot.tokens || 0).toLocaleString()} t</span>
              </span>
            </div>

            <h3 class="bot-card-title pp-cc-name profile-character-card-name-box css-nlxhw4" title="${bot.name}">${bot.name}</h3>

            <div class="bot-card-creator pp-cc-creator-name profile-character-card-creator-name-link css-1xhci6i" onclick="event.stopPropagation(); SConnect.openCreatorDetail('${bot.creator_id || bot.creatorId || creatorName}')">
              <img class="bot-card-creator-avatar" src="${creatorAvatar}" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';">
              <span class="line-clamp-1">${creatorName}</span>
            </div>

            <div class="bot-card-tags-row pp-cc-tags profile-character-card-tags css-4ofde4">
              ${tags.slice(0, 4).map(t => `<span class="bot-card-tag pp-cc-tag profile-character-card-tags-wrap css-123m5uu">${t}</span>`).join('')}
            </div>
          </div>
        </div>
      `;
    },

    renderCreatorCardHTML(creator, index = 0) {
      if (!creator) return '';
      const isFollowing = this.followingCreatorIds.has(creator.id);
      const cAvatar = creator.avatar || DEFAULT_AVATAR;
      const cName = creator.displayName || creator.username || 'Creator';
      const cleanBio = this.stripHTML(creator.bio || '').replace(/[\r\n]+/g, ' ').trim() || 'JanitorAI creator crafting immersive character cards.';

      return `
        <div class="creator-card" onclick="SConnect.openCreatorDetail('${creator.id}')">
          <div class="creator-card-header">
            <img class="creator-card-avatar" src="${cAvatar}" alt="${this.escapeHTML(cName)}" onerror="if(this.src.includes('/user-avatars/')){this.src=this.src.replace('/user-avatars/','/avatars/');}else if(this.src.includes('/avatars/')){this.src=this.src.replace('/avatars/','/user-avatars/');}else{this.onerror=null;this.src='${DEFAULT_AVATAR}';}">
            <div class="creator-card-info">
              <div class="creator-card-name-row">
                <span class="creator-card-name">${this.escapeHTML(cName)}</span>
              </div>
              <div class="creator-card-handle">
                <span>@${this.escapeHTML(creator.username || 'creator')}</span>
                <span>&bull;</span>
                <span>${this.formatNumber(creator.followers || 0)} followers</span>
              </div>
            </div>
            <button class="follow-toggle-btn ${isFollowing ? 'is-following' : ''}" onclick="event.stopPropagation(); SConnect.toggleFollowCreator('${creator.id}', this)">
              ${isFollowing ? ICONS.check : '+'}
              <span>${isFollowing ? 'Following' : 'Follow'}</span>
            </button>
          </div>

          <div class="creator-card-bio">
            ${this.escapeHTML(cleanBio.slice(0, 160))}${cleanBio.length > 160 ? '...' : ''}
          </div>
        </div>
      `;
    },

    // -------------------------------------------------------------------------
    // 2. BOT DETAIL DOSSIER VIEW (Exact Match to Screenshot 2)
    // -------------------------------------------------------------------------
    async renderBotDetailView(container, botId) {
      let bot = this.botCache.get(botId);
      if (!bot) {
        container.innerHTML = `
          <div class="bot-detail-page">
            <button class="back-nav-btn" onclick="SConnect.navigateBack()">
              ${ICONS.back}
              <span>Back</span>
            </button>
            <div style="padding: 60px; text-align: center; color: var(--c-text-muted);">
              Loading character dossier...
            </div>
          </div>
        `;
        try {
          const res = await fetch(`/api/connect/bot/${botId}`).then(r => r.json());
          bot = (res.data || res);
          this.cacheBot(bot);
        } catch (e) {
          container.innerHTML = `<div class="bot-detail-page"><button class="back-nav-btn" onclick="SConnect.navigateBack()">${ICONS.back} <span>Back</span></button><div style="color:var(--c-amber); padding:40px;">Failed to load character.</div></div>`;
          return;
        }
      }

      this.activeBot = bot;
      this.activeDetailTab = 'bio';
      this.activeGreetingIdx = 0;

      const isSaved = this.savedBotIds.has(bot.id);
      const isUnmasked = bot.is_unmasked || bot.isUnmasked || false;
      const tags = Array.isArray(bot.tags) ? bot.tags : [];
      const creatorName = bot.creator_name || bot.creatorName || 'Janitor Creator';
      const creatorAvatar = bot.creator_avatar || bot.creatorAvatar || DEFAULT_AVATAR;

      container.innerHTML = `
        <div class="bot-detail-page">
          <!-- Back Button Pill -->
          <button class="back-nav-btn" onclick="SConnect.navigateBack()">
            ${ICONS.back}
            <span>Back</span>
          </button>

          <!-- Split Layout: Sidebar + Main Content -->
          <div class="bot-detail-layout">
            <!-- Left Sidebar -->
            <aside class="bot-detail-sidebar">
              <div class="bot-detail-poster" onclick="SConnect.openImageLightbox('${bot.avatar || DEFAULT_AVATAR}', '${this.escapeHTML(bot.name)}')">
                <img class="bot-detail-poster-img" src="${bot.avatar || DEFAULT_AVATAR}" alt="${bot.name}" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';">
              </div>

              <!-- 2x2 Action Button Grid -->
              <div class="bot-detail-actions">
                <button class="download-primary-btn" onclick="SConnect.downloadBotPNG('${bot.id}')">
                  ${ICONS.download}
                  <span>Download Card</span>
                </button>
                <button class="save-card-action-btn ${isSaved ? 'is-saved' : ''}" onclick="SConnect.toggleSaveBot('${bot.id}', this)">
                  ${isSaved ? ICONS.bookmarkFilled : ICONS.bookmark}
                  <span>${isSaved ? 'Saved' : 'Save to Library'}</span>
                </button>
                <button class="save-card-action-btn" onclick="SConnect.playBotInChat('${bot.id}')">
                  ${ICONS.play}
                  <span>Play in Chat</span>
                </button>
                <button class="save-card-action-btn" id="detail-unmask-btn" onclick="SConnect.triggerUnmask('${bot.id}')">
                  ${isUnmasked ? ICONS.unlock : ICONS.lock}
                  <span>${isUnmasked ? 'Unmasked' : 'Unmask'}</span>
                </button>
              </div>

              <!-- Metadata Statistics Box -->
              <div class="bot-metadata-card">
                <div class="metadata-line">
                  <span class="metadata-lbl">${ICONS.token} Tokens</span>
                  <span class="metadata-val">${(bot.tokens || 0).toLocaleString()}</span>
                </div>
                <div class="metadata-line">
                  <span class="metadata-lbl">${ICONS.chat} Total Chats</span>
                  <span class="metadata-val">${this.formatNumber(bot.chats || 0)}</span>
                </div>
                <div class="metadata-line">
                  <span class="metadata-lbl">${ICONS.chat} Total Messages</span>
                  <span class="metadata-val">${this.formatNumber(bot.messages || 0)}</span>
                </div>
                <div class="metadata-line">
                  <span class="metadata-lbl">Published</span>
                  <span class="metadata-val">${bot.created_at ? String(bot.created_at).slice(0, 10) : '2023-06-22'}</span>
                </div>
                <div class="metadata-line">
                  <span class="metadata-lbl">Export Format</span>
                  <span class="metadata-val">SillyTavern V2 PNG</span>
                </div>
              </div>
            </aside>

            <!-- Right Content Area -->
            <section class="bot-detail-content">
              <!-- Title, Creator & Tags -->
              <div class="bot-desktop-header">
                <h1 class="bot-detail-title">${this.escapeHTML(bot.name)}</h1>

                <div class="bot-detail-creator-row" onclick="SConnect.openCreatorDetail('${bot.creator_id || bot.creatorId || creatorName}')">
                  <img class="bot-detail-creator-avatar" src="${creatorAvatar}" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';">
                  <span class="bot-detail-creator-name">${this.escapeHTML(creatorName)}</span>
                </div>

                <div class="bot-detail-tags">
                  ${tags.map(t => `<span class="detail-tag-chip" onclick="SConnect.navigate('search', { q: '${t}' })">${t}</span>`).join('')}
                </div>
              </div>

              <!-- Segmented Navigation Tabs: Bio | Personality | Greetings | Scenario -->
              <div class="detail-tabs-segment">
                <button class="detail-tab-pill ${this.activeDetailTab === 'bio' ? 'is-active' : ''}" onclick="SConnect.setDetailTab('bio', this)">Bio</button>
                <button class="detail-tab-pill ${this.activeDetailTab === 'personality' ? 'is-active' : ''}" onclick="SConnect.setDetailTab('personality', this)">Personality</button>
                <button class="detail-tab-pill ${this.activeDetailTab === 'greetings' ? 'is-active' : ''}" onclick="SConnect.setDetailTab('greetings', this)">Greetings</button>
                <button class="detail-tab-pill ${this.activeDetailTab === 'scenario' ? 'is-active' : ''}" onclick="SConnect.setDetailTab('scenario', this)">Scenario</button>
              </div>

              <!-- Content Panel Box -->
              <div class="detail-tab-panel" id="detail-tab-panel">
                ${this.renderDetailTabContent()}
              </div>

              <!-- More by Creator Shelf -->
              <div class="more-by-creator-section">
                <div class="section-header">
                  <div class="section-title-wrap">
                    <h3 class="section-title" style="font-size:1.15rem;">More by ${creatorName}</h3>
                  </div>
                </div>
                <div class="more-by-creator-grid" id="detail-more-grid">
                  ${Array.from({ length: 4 }, () => `<div class="bot-card skeleton" style="height:220px;"></div>`).join('')}
                </div>
              </div>
            </section>
          </div>
        </div>
      `;

      this.loadMoreByCreator(bot.creator_id || bot.creatorId || creatorName, bot.id);
    },

    setDetailTab(tab, btn) {
      this.activeDetailTab = tab;
      document.querySelectorAll('.detail-tabs-segment .detail-tab-pill').forEach(p => p.classList.remove('is-active'));
      if (btn) btn.classList.add('is-active');

      const panel = document.getElementById('detail-tab-panel');
      if (panel) {
        panel.innerHTML = this.renderDetailTabContent();
      }
    },

    renderDetailTabContent() {
      const bot = this.activeBot;
      if (!bot) return '';

      let title = 'CREATOR NOTES & CHARACTER BIO';
      let content = bot.description || '';
      let copyPayload = content;

      if (this.activeDetailTab === 'personality') {
        title = 'CHARACTER PERSONALITY & DIRECTIVES';
        if (bot.personality && bot.personality.trim()) {
          content = bot.personality;
          copyPayload = content;
        } else if (bot.definition_private || !bot.is_unmasked) {
          content = `[Definition Hidden by Creator]\n\nThis character's definition is currently masked on JanitorAI. Click the 'Unmask' button above to unlock the authentic character definitions from the cloud vault.`;
          copyPayload = '';
        } else {
          content = 'No detailed personality directives specified.';
        }
      } else if (this.activeDetailTab === 'greetings') {
        title = 'FIRST MESSAGE & ALTERNATE GREETINGS';
        const greetings = bot.greetings && bot.greetings.length ? bot.greetings : [{ title: 'Greeting 1', text: bot.first_message || bot.firstMessage || '' }];
        const activeGreeting = greetings[this.activeGreetingIdx] || greetings[0] || { text: '' };
        content = activeGreeting.text || bot.first_message || bot.firstMessage || 'No greeting available.';
        copyPayload = content;

        const subtabs = greetings.length > 1 ? `
          <div class="greeting-subtabs-row">
            ${greetings.map((g, idx) => `
              <button class="greeting-subtab-pill ${idx === this.activeGreetingIdx ? 'is-active' : ''}" onclick="SConnect.switchGreeting(${idx})">
                ${g.title || `Greeting ${idx + 1}`}
              </button>
            `).join('')}
          </div>
        ` : '';

        this.activeDetailCopyPayload = copyPayload;

        return `
          <div class="panel-header-bar">
            <span class="panel-title-lbl">${title}</span>
            <button class="panel-copy-btn" onclick="SConnect.copyCurrentTabContent(this)">
              ${ICONS.copy}
              <span>Copy Greeting</span>
            </button>
          </div>
          ${subtabs}
          <div class="detail-panel-body profile-character-card-description-markdown-container css-96l1id" style="border-left: 2px solid var(--c-brand); padding-left: 14px;">${this.renderRichText(content)}</div>
        `;
      } else if (this.activeDetailTab === 'scenario') {
        title = 'WORLD SCENARIO & CONTEXT';
        content = bot.scenario || 'No specific scenario context specified.';
        copyPayload = content;
      }

      this.activeDetailCopyPayload = copyPayload;

      return `
        <div class="panel-header-bar">
          <span class="panel-title-lbl">${title}</span>
          <button class="panel-copy-btn" onclick="SConnect.copyCurrentTabContent(this)">
            ${ICONS.copy}
            <span>Copy ${this.activeDetailTab === 'bio' ? 'Bio' : 'Text'}</span>
          </button>
        </div>
        <div class="detail-panel-body profile-character-card-description-markdown-container css-96l1id">${this.renderRichText(content)}</div>
      `;
    },

    switchGreeting(idx) {
      this.activeGreetingIdx = idx;
      const panel = document.getElementById('detail-tab-panel');
      if (panel) panel.innerHTML = this.renderDetailTabContent();
    },

    async loadMoreByCreator(creatorId, currentBotId) {
      const grid = document.getElementById('detail-more-grid');
      if (!grid) return;
      try {
        const res = await fetch(`/api/connect/creators/${encodeURIComponent(creatorId)}/bots?limit=8`).then(r => r.json());
        const bots = (res.data && res.data.bots) || res.bots || [];
        const others = bots.filter(b => b.id !== currentBotId).slice(0, 4);
        if (others.length > 0) {
          grid.innerHTML = others.map((b, i) => this.renderBotCardHTML(b, i)).join('');
        } else {
          // Fallback to random popular
          const fallback = this.homeBots.filter(b => b.id !== currentBotId).slice(0, 4);
          grid.innerHTML = fallback.map((b, i) => this.renderBotCardHTML(b, i)).join('');
        }
      } catch (e) {
        grid.innerHTML = this.homeBots.filter(b => b.id !== currentBotId).slice(0, 4).map((b, i) => this.renderBotCardHTML(b, i)).join('');
      }
    },

    // -------------------------------------------------------------------------
    // 3. FOLLOWING VIEW
    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // 3. FOLLOWING VIEW (Mixed / Interleaved Across Creators)
    // -------------------------------------------------------------------------
    renderFollowingView(container) {
      const followingList = Array.from(this.followingCreatorIds);
      container.innerHTML = `
        <div style="padding: var(--c-space-6) 0;">
          <div class="section-header">
            <div class="section-title-wrap">
              <h2 class="section-title">Following Feed</h2>
              <span class="section-subtitle">Mixed releases from authors you follow (${followingList.length} followed)</span>
            </div>
          </div>

          <div id="following-grid" class="bot-cards-grid">
            ${followingList.length === 0 ? `
              <div style="grid-column: 1/-1; padding: 60px 20px; text-align: center; background: var(--c-surface-1); border-radius: var(--c-radius-xl); border: 1px solid var(--c-border);">
                <div style="font-size: 2.25rem; margin-bottom: 12px;">👤</div>
                <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 8px; color: var(--c-text-primary);">You haven't followed any creators yet</h3>
                <p style="font-size: 0.8125rem; color: var(--c-text-muted); margin-bottom: 20px; max-width: 440px; margin-left: auto; margin-right: auto;">Follow authors on character cards or dossiers to see their newest bot releases mixed here.</p>
                <button class="search-submit-btn" onclick="SConnect.navigate('discover')">Explore Characters</button>
              </div>
            ` : Array.from({ length: 8 }, () => `<div class="bot-card skeleton"></div>`).join('')}
          </div>
        </div>
      `;

      if (followingList.length > 0) {
        // Concurrently fetch recent cards for each followed creator and interleave them
        Promise.all(followingList.slice(0, 24).map(id => 
          fetch(`/api/connect/creators/${encodeURIComponent(id)}/bots?limit=16`)
            .then(r => r.json())
            .catch(() => null)
        )).then(results => {
          const creatorLists = results.map(r => (r && r.data && r.data.bots) || (r && r.bots) || []);
          const maxLen = Math.max(0, ...creatorLists.map(l => l.length));
          const mixedBots = [];
          const seenIds = new Set();

          // Round-robin interleave across creators so feed is evenly mixed
          for (let i = 0; i < maxLen; i++) {
            for (const list of creatorLists) {
              if (list[i] && !seenIds.has(list[i].id)) {
                seenIds.add(list[i].id);
                this.cacheBot(list[i]);
                mixedBots.push(list[i]);
              }
            }
          }

          const grid = document.getElementById('following-grid');
          if (grid) {
            if (mixedBots.length > 0) {
              grid.innerHTML = mixedBots.map((b, i) => this.renderBotCardHTML(b, i)).join('');
            } else {
              grid.innerHTML = `<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--c-text-muted);">No cards found from your followed creators yet.</div>`;
            }
          }
        });
      }
    },

    // -------------------------------------------------------------------------
    // MY CHATS VIEW (Screenshots 2 & 3)
    // -------------------------------------------------------------------------
    _myChatsTab: 'chats',
    _myChatsSort: 'latest',
    _myChatsSearchQuery: '',
    _expandedBotId: null,

    renderMyChatsView(container, expandedBotId = null) {
      if (expandedBotId) {
        this._expandedBotId = expandedBotId;
      }
      this.migrateLegacyChats();
      const allSessions = this.getAllChatSessions();

      // Group sessions by botId
      const botSessionsMap = new Map();
      allSessions.forEach(s => {
        const bId = String(s.botId);
        if (!botSessionsMap.has(bId)) {
          botSessionsMap.set(bId, []);
        }
        botSessionsMap.get(bId).push(s);
      });

      const totalCharacters = botSessionsMap.size;
      const totalChats = allSessions.length;
      const activeTab = this._myChatsTab || 'chats';
      const sortCriterion = this._myChatsSort || 'latest';
      const query = (this._myChatsSearchQuery || '').toLowerCase().trim();

      const botEntries = Array.from(botSessionsMap.entries()).map(([botId, sessions]) => {
        const bot = this.botCache.get(botId) || {
          id: botId,
          name: sessions[0]?.botName || 'Character',
          avatar: sessions[0]?.botAvatar || DEFAULT_AVATAR,
          description: sessions[0]?.botDescription || '',
          personality: '',
          chats: sessions.length
        };
        const latestTs = Math.max(...sessions.map(s => s.updatedAt || s.createdAt || 0));
        return { botId, bot, sessions, latestTs };
      });

      // Filter by search query if any
      let filteredEntries = botEntries;
      if (query) {
        filteredEntries = filteredEntries.filter(e => 
          (e.bot.name || '').toLowerCase().includes(query) ||
          (e.bot.description || '').toLowerCase().includes(query)
        );
      }

      // Filter by activeTab if 'published'
      if (activeTab === 'published') {
        filteredEntries = filteredEntries.filter(entry => entry.sessions.some(s => s.isPublished));
      }

      // Sort entries
      if (sortCriterion === 'latest') {
        filteredEntries.sort((a, b) => b.latestTs - a.latestTs);
      } else if (sortCriterion === 'chats') {
        filteredEntries.sort((a, b) => b.sessions.length - a.sessions.length);
      } else if (sortCriterion === 'name') {
        filteredEntries.sort((a, b) => (a.bot.name || '').localeCompare(b.bot.name || ''));
      }

      container.innerHTML = `
        <div class="my-chats-view-wrapper">
          <!-- Top Row: Stat Pill + Search + Sort (Screenshot 2) -->
          <div class="my-chats-header-row">
            <div class="my-chats-stat-pill" id="my-chats-stat-pill">
              ${totalCharacters} characters ${totalChats.toLocaleString()} chats
            </div>

            <div class="my-chats-controls-group">
              <div class="my-chats-search-box" style="position:relative; display:flex; align-items:center;">
                <span style="position:absolute; left:10px; color:#9ca3af; pointer-events:none; display:flex; align-items:center;">${ICONS.search}</span>
                <input 
                  type="text" 
                  id="my-chats-search-input" 
                  placeholder="Search" 
                  value="${this.escapeHTML(this._myChatsSearchQuery || '')}"
                  style="background:#181820; border:1px solid rgba(255,255,255,0.12); border-radius:8px; color:#f3f4f6; font-size:0.84rem; padding:6px 12px 6px 32px; outline:none; width: 170px;" 
                  oninput="SConnect.filterMyChats(this.value)" 
                />
              </div>

              <select class="my-chats-sort-select" id="my-chats-sort-select" onchange="SConnect.sortMyChats(this.value)">
                <option value="latest" ${sortCriterion === 'latest' ? 'selected' : ''}>Latest</option>
                <option value="chats" ${sortCriterion === 'chats' ? 'selected' : ''}>Most Chats</option>
                <option value="name" ${sortCriterion === 'name' ? 'selected' : ''}>Alphabetical</option>
              </select>
            </div>
          </div>

          <!-- Sub-tabs: Chats / Published Chats (Screenshot 2) -->
          <div class="my-chats-tabs-row">
            <button class="my-chats-tab-btn ${activeTab === 'chats' ? 'is-active' : ''}" id="my-chats-tab-chats" onclick="SConnect.switchMyChatsTab('chats')">Chats</button>
            <button class="my-chats-tab-btn ${activeTab === 'published' ? 'is-active' : ''}" id="my-chats-tab-published" onclick="SConnect.switchMyChatsTab('published')">Published Chats</button>
          </div>

          <!-- Character Accordion List (Screenshot 2 & 3) -->
          <div class="my-chats-char-list" id="my-chats-char-list">
            ${filteredEntries.length === 0 ? `
              <div class="my-chats-empty-box">
                <div class="my-chats-empty-title">No conversations found</div>
                <div class="my-chats-empty-sub">You have no active chats${activeTab === 'published' ? ' published yet.' : '. Start exploring characters to begin your first chat!'}</div>
                <button class="my-chats-action-pill-btn" style="margin-top:8px;" onclick="SConnect.navigate('discover')">Explore Characters</button>
              </div>
            ` : filteredEntries.map(entry => this.renderMyChatsCharCardHtml(entry)).join('')}
          </div>
        </div>
      `;
    },

    renderMyChatsCharCardHtml(entry) {
      const { botId, bot, sessions } = entry;
      const isExpanded = (this._expandedBotId && String(this._expandedBotId) === String(botId));
      const activeTab = this._myChatsTab || 'chats';
      const visibleSessions = activeTab === 'published' ? sessions.filter(s => s.isPublished) : sessions;
      const isUnpublished = bot.is_unmasked === false || bot.is_unpublished || false;

      // Group visible sessions by time
      const grouped = {};
      visibleSessions.forEach(s => {
        const tag = this.getTimeGroupTag(s.updatedAt || s.createdAt);
        if (!grouped[tag]) grouped[tag] = [];
        grouped[tag].push(s);
      });

      return `
        <div class="my-chats-char-card ${isExpanded ? 'is-expanded' : ''}" id="my-chats-card-${botId}">
          <!-- Header Summary Row (Screenshot 2) -->
          <div class="my-chats-char-summary-row" onclick="SConnect.toggleMyChatsBotAccordion('${botId}')">
            <div class="my-chats-char-left">
              <img src="${bot.avatar || DEFAULT_AVATAR}" class="my-chats-char-avatar" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';" />
              <div class="my-chats-char-meta">
                <span class="my-chats-char-name">${this.escapeHTML(bot.name)}</span>
                <span class="my-chats-count-text">chats: ${visibleSessions.length}</span>
              </div>
            </div>

            <div class="my-chats-char-right">
              ${isUnpublished ? `<span class="my-chats-unpub-badge">Unpublished</span>` : ''}
              <span class="my-chats-accordion-arrow">${ICONS.chevronDown}</span>
            </div>
          </div>

          <!-- Expanded Body (Screenshot 3) -->
          <div class="my-chats-expanded-body" id="my-chats-expanded-${botId}">
            <!-- Character Dossier Card -->
            <div class="my-chats-dossier-box">
              <div class="my-chats-dossier-desc">
                ${this.escapeHTML(bot.description || bot.personality || 'Welcome to this roleplay scenario. Chat with this character and shape the unfolding story together.')}
              </div>
              <div class="my-chats-dossier-actions">
                <button class="my-chats-action-pill-btn" onclick="SConnect.navigate('bot', { id: '${bot.id}' })">Character Page</button>
                <button class="my-chats-action-pill-btn" onclick="SConnect.navigate('creator', { id: '${bot.creator_id || 'creator'}' })">Creator Profile</button>
                <button class="my-chats-new-chat-btn" onclick="SConnect.triggerNewChatFromDrawer('${bot.id}')">+ New Chat</button>
              </div>
            </div>

            <div style="display:flex; justify-content:flex-end; margin: 12px 0 6px 0;">
              <select class="my-chats-sort-select" style="font-size:0.82rem; padding: 4px 10px;" onchange="SConnect.sortDrawerSessions('${bot.id}', this.value)">
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>

            <!-- Sessions List grouped by Time Tag (Screenshot 3) -->
            ${Object.keys(grouped).map(tag => `
              <div class="my-chats-time-tag">${tag}</div>
              <div class="my-chats-sessions-list">
                ${grouped[tag].map(s => `
                  <div class="my-chat-session-row" onclick="SConnect.resumeChatSession('${bot.id}', '${s.id}')">
                    <div class="my-chat-session-left">
                      <span class="my-chat-lock-icon">${ICONS.briefcase}</span>
                      <div class="my-chat-text-col">
                        <span class="my-chat-time-label">${this.formatRelativeTime(s.updatedAt || s.createdAt)}</span>
                        <span class="my-chat-summary-preview">${this.escapeHTML(s.summary || 'no summary :(')}</span>
                      </div>
                    </div>
                    <div class="my-chat-session-right">
                      ${s.personaAvatar ? `<img src="${s.personaAvatar}" class="my-chat-persona-bubble" title="${this.escapeHTML(s.personaName || 'Persona')}" />` : ''}
                      <span class="my-chat-msg-count-chip">${ICONS.chat} ${s.messageCount || 1}</span>
                      <button class="my-chat-delete-btn" onclick="SConnect.deleteChatSession('${s.id}', '${bot.id}', event)" title="Delete Chat">${ICONS.trash}</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    },

    toggleMyChatsBotAccordion(botId) {
      if (this._expandedBotId === botId) {
        this._expandedBotId = null;
      } else {
        this._expandedBotId = botId;
      }
      const container = document.getElementById('connect-main-view');
      if (container) this.renderMyChatsView(container, this._expandedBotId);
    },

    switchMyChatsTab(tab) {
      this._myChatsTab = tab;
      const container = document.getElementById('connect-main-view');
      if (container) this.renderMyChatsView(container, this._expandedBotId);
    },

    sortMyChats(criteria) {
      this._myChatsSort = criteria;
      const container = document.getElementById('connect-main-view');
      if (container) this.renderMyChatsView(container, this._expandedBotId);
    },

    filterMyChats(val) {
      this._myChatsSearchQuery = val;
      const container = document.getElementById('connect-main-view');
      if (container) this.renderMyChatsView(container, this._expandedBotId);
    },

    sortDrawerSessions(botId, criteria) {
      const all = this.getAllChatSessions();
      const sessions = all.filter(s => String(s.botId) === String(botId));
      if (criteria === 'latest') {
        sessions.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
      } else {
        sessions.sort((a, b) => (a.updatedAt || a.createdAt || 0) - (b.updatedAt || b.createdAt || 0));
      }
      const container = document.getElementById('connect-main-view');
      if (container) this.renderMyChatsView(container, botId);
    },

    // -------------------------------------------------------------------------
    // 4. SEARCH VIEW
    // -------------------------------------------------------------------------
    renderSearchView(container, initialQ = '') {
      container.innerHTML = `
        <div style="padding: var(--c-space-6) 0;">
          <div class="search-component-wrapper" style="max-width: 720px; margin-bottom: var(--c-space-6);">
            <div class="search-input-shell" style="height: 52px;">
              <span class="search-icon">${ICONS.search}</span>
              <input 
                id="search-page-input" 
                class="search-main-input" 
                type="text" 
                value="${this.escapeHTML(initialQ)}"
                placeholder="Search character names, tags, creators, or paste JanitorAI URL..." 
                onkeydown="if(event.key==='Enter') SConnect.performSearch(this.value)"
              />
              <button class="search-submit-btn" onclick="SConnect.performSearch(document.getElementById('search-page-input').value)">Search</button>
            </div>
          </div>

          <div class="section-header">
            <div class="section-title-wrap">
              <h2 class="section-title" id="search-results-title">Search Results</h2>
              <span class="section-subtitle" id="search-results-sub">Showing character cards matching your query</span>
            </div>
          </div>

          <div id="search-page-grid" class="bot-cards-grid">
            ${Array.from({ length: 8 }, () => `<div class="bot-card skeleton"></div>`).join('')}
          </div>
        </div>
      `;

      this.performSearch(initialQ);
    },

    async performSearch(query) {
      const q = String(query || '').trim();
      const grid = document.getElementById('search-page-grid');
      const title = document.getElementById('search-results-title');
      const sub = document.getElementById('search-results-sub');

      if (grid) grid.innerHTML = Array.from({ length: 8 }, () => `<div class="bot-card skeleton"></div>`).join('');

      try {
        const res = await fetch(`/api/connect/search?q=${encodeURIComponent(q)}&limit=30`).then(r => r.json());
        const bots = (res.data && res.data.bots) || res.bots || res.items || [];
        bots.forEach(b => this.cacheBot(b));

        if (title) title.textContent = q ? `Results for "${q}"` : 'All Characters';
        if (sub) sub.textContent = `Found ${bots.length} matching cards`;

        if (grid) {
          if (bots.length > 0) {
            grid.innerHTML = bots.map((b, i) => this.renderBotCardHTML(b, i)).join('');
          } else {
            grid.innerHTML = `<div style="grid-column: 1/-1; padding: 60px; text-align: center; color: var(--c-text-muted);">No character cards found matching "${q}".</div>`;
          }
        }
      } catch (e) {
        if (grid) grid.innerHTML = `<div style="color:var(--c-amber); padding:40px;">Search request failed.</div>`;
      }
    },

    // -------------------------------------------------------------------------
    // 5. CREATORS VIEW (Strictly Shows Followed Creators)
    // -------------------------------------------------------------------------
    async renderCreatorsView(container) {
      const followingList = Array.from(this.followingCreatorIds);
      container.innerHTML = `
        <div style="padding: var(--c-space-6) 0;">
          <div class="section-header">
            <div class="section-title-wrap">
              <h2 class="section-title">Followed Creators</h2>
              <span class="section-subtitle">JanitorAI authors you are currently following (${followingList.length} followed)</span>
            </div>
          </div>

          <div id="creators-page-grid" class="creators-shelf-grid">
            ${followingList.length === 0 ? `
              <div style="grid-column: 1/-1; padding: 60px 20px; text-align: center; background: var(--c-surface-1); border-radius: var(--c-radius-xl); border: 1px solid var(--c-border);">
                <div style="font-size: 2.25rem; margin-bottom: 12px;">👤</div>
                <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 8px; color: var(--c-text-primary);">You haven't followed any creators yet</h3>
                <p style="font-size: 0.8125rem; color: var(--c-text-muted); margin-bottom: 20px; max-width: 440px; margin-left: auto; margin-right: auto;">Follow your favorite authors on character cards or dossiers to easily track their releases here.</p>
                <button class="search-submit-btn" onclick="SConnect.navigate('discover')">Explore Characters</button>
              </div>
            ` : Array.from({ length: Math.min(followingList.length, 6) }, () => `<div class="creator-card" style="opacity:0.4; height:120px;"></div>`).join('')}
          </div>
        </div>
      `;

      if (followingList.length > 0) {
        try {
          const results = await Promise.all(
            followingList.map(id =>
              fetch(`/api/connect/creators/${encodeURIComponent(id)}`)
                .then(r => r.json())
                .catch(() => null)
            )
          );

          const creators = [];
          results.forEach((r, idx) => {
            const rawId = followingList[idx];
            if (r && (r.data || r.creator)) {
              const c = (r.data && (r.data.creator || r.data)) || r.creator || r;
              if (c && !c.id) c.id = rawId;
              creators.push(c);
            } else {
              creators.push({
                id: rawId,
                username: rawId,
                displayName: rawId,
                followers: 0,
                bio: 'Creator on JanitorAI'
              });
            }
          });

          const grid = document.getElementById('creators-page-grid');
          if (grid) {
            if (creators.length > 0) {
              grid.innerHTML = creators.map((c, i) => this.renderCreatorCardHTML(c, i)).join('');
            } else {
              grid.innerHTML = `<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--c-text-muted);">No followed creator profiles available.</div>`;
            }
          }
        } catch (e) {
          console.warn('Failed to load followed creators:', e);
        }
      }
    },

    async renderCreatorDetailView(container, creatorId) {
      container.innerHTML = `
        <div class="bot-detail-page">
          <button class="back-nav-btn" onclick="SConnect.navigateBack()">
            ${ICONS.back}
            <span>Back</span>
          </button>
          <div style="padding:60px; text-align:center; color:var(--c-text-muted);">Loading creator profile...</div>
        </div>
      `;

      try {
        const res = await fetch(`/api/connect/creators/${encodeURIComponent(creatorId)}`).then(r => r.json());
        const data = res.data || res;
        const creator = data.creator || data;
        const bots = data.bots || [];
        const isFollowing = this.followingCreatorIds.has(creator.id);
        const cAvatar = creator.avatar || DEFAULT_AVATAR;
        const cName = creator.displayName || creator.username || 'Creator';

        container.innerHTML = `
          <div class="bot-detail-page profile-page-container css-14l6kwv">
            <button class="back-nav-btn" onclick="SConnect.navigateBack()">
              ${ICONS.back}
              <span>Back</span>
            </button>

            <!-- Native Janitor Creator Profile Header (Zero synthetic gradient, exact Puppy JAI CSS selectors) -->
            <div class="pp-uc-background profile-uc-background-flex css-vqimyu">
              <div class="profile-info-wrapper-box css-15vqpxh">
                <div class="profile-info-stack css-8g8ihq">
                  <div class="creator-profile-header profile-info-hstack css-1uodvt1">
                    <div class="creator-identity-group">
                      <div class="creator-avatar-wrapper profile-avatar-container pp-uc-avatar-container css-79elbk" onclick="SConnect.openImageLightbox('${cAvatar}', '${this.escapeHTML(cName)}')">
                        <img class="profile-avatar pp-uc-avatar css-18bnokj" src="${cAvatar}" alt="${this.escapeHTML(cName)}" onerror="if(this.src.includes('/user-avatars/')){this.src=this.src.replace('/user-avatars/','/avatars/');}else if(this.src.includes('/avatars/')){this.src=this.src.replace('/avatars/','/user-avatars/');}else{this.onerror=null;this.src='${DEFAULT_AVATAR}';}">
                      </div>
                      <div class="creator-names-wrap profile-info-stack-inner css-8g8ihq">
                        <div class="profile-info-stack-inner-flex css-70qvj9">
                          <h1 class="creator-display-name profile-title-heading pp-uc-title css-o5an2m">${this.escapeHTML(cName)}</h1>
                          <div class="creator-meta-sub">@${this.escapeHTML(creator.username || 'creator')}</div>
                        </div>
                      </div>
                    </div>

                    <div class="creator-header-right">
                      <div class="creator-stats-bar">
                        <div class="creator-stat-box pp-uc-followers-count profile-followers-count">
                          <span class="creator-stat-val">${this.formatNumber(creator.followers)}</span>
                          <span class="creator-stat-lbl">Followers</span>
                        </div>
                        <div class="creator-stat-box pp-pg-total">
                          <span class="creator-stat-val">${bots.length}</span>
                          <span class="creator-stat-lbl">Characters</span>
                        </div>
                      </div>
                      <div class="profile-uc-follow-flex css-1vakbk4">
                        <button class="follow-toggle-btn profile-uc-follow-button pp-uc-follow-button Btn ${isFollowing ? 'is-following' : ''}" onclick="SConnect.toggleFollowCreator('${creator.id}', this)">
                          ${isFollowing ? ICONS.check : '+'}
                          <span>${isFollowing ? 'Following' : 'Follow Creator'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Creator Bio Dossier with Full Rich HTML/Markdown Parsing (.profile-about-me / .pp-uc-about-me / .css-1bn1yyx) -->
            ${creator.bio ? `
              <div class="creator-bio-card profile-about-me pp-uc-about-me css-1bn1yyx">
                <div class="detail-panel-body creator-bio-body">
                  ${this.renderRichText(creator.bio)}
                </div>
              </div>
            ` : ''}

            <!-- Authored Characters Grid (.profile-page-container-flex-box / .pp-cc-list-container / .css-1bx5ylf) -->
            <div class="section-header">
              <div class="section-title-wrap">
                <h2 class="section-title">Characters by ${cName}</h2>
                <span class="section-subtitle">${bots.length} publicly available cards</span>
              </div>
            </div>

            <div class="bot-cards-grid pp-cc-list-container profile-page-container-flex-box css-1bx5ylf">
              ${bots.map((b, i) => this.renderBotCardHTML(b, i)).join('')}
            </div>
          </div>
        `;
      } catch (e) {
        container.innerHTML = `<div class="bot-detail-page"><button class="back-nav-btn" onclick="SConnect.navigateBack()">${ICONS.back} <span>Back</span></button><div style="color:var(--c-amber); padding:40px;">Creator not found.</div></div>`;
      }
    },

    // -------------------------------------------------------------------------
    // 6. LIBRARY VIEW (Saved Cards & Custom Vault - Strict User Saved Only)
    // -------------------------------------------------------------------------
    async renderLibraryView(container) {
      const savedCount = this.savedBotIds.size;
      container.innerHTML = `
        <div style="padding: var(--c-space-6) 0;">
          <div class="section-header">
            <div class="section-title-wrap">
              <h2 class="section-title">My Character Library</h2>
              <span class="section-subtitle">Characters you've explicitly saved (${savedCount} saved)</span>
            </div>
          </div>

          <div id="library-grid" class="bot-cards-grid">
            ${savedCount === 0 ? `
              <div style="grid-column: 1/-1; padding: 60px 20px; text-align: center; background: var(--c-surface-1); border-radius: var(--c-radius-xl); border: 1px solid var(--c-border);">
                <div style="font-size: 2.25rem; margin-bottom: 12px;">💾</div>
                <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 8px; color: var(--c-text-primary);">Your library is currently empty</h3>
                <p style="font-size: 0.8125rem; color: var(--c-text-muted); margin-bottom: 20px; max-width: 440px; margin-left: auto; margin-right: auto;">Bookmark your favorite JanitorAI bots in Discover or Search to save them here for offline access.</p>
                <button class="search-submit-btn" onclick="SConnect.navigate('discover')">Explore Characters</button>
              </div>
            ` : Array.from({ length: Math.min(savedCount, 8) }, () => `<div class="bot-card skeleton"></div>`).join('')}
          </div>
        </div>
      `;

      if (savedCount === 0) return;

      try {
        const res = await fetch(`/api/connect/library?limit=100`).then(r => r.json());
        const cards = res.items || [];
        const cardMap = new Map();
        cards.forEach(c => {
          this.cacheBot(c);
          cardMap.set(c.id, c);
        });

        // Reconstruct in exact user-saved order (newest saved at top)
        const savedIdsList = Array.from(this.savedBotIds);
        const finalCards = [];
        for (const id of savedIdsList) {
          if (cardMap.has(id)) {
            finalCards.push(cardMap.get(id));
          } else if (this.botCache.has(id)) {
            finalCards.push(this.botCache.get(id));
          }
        }

        // Auto-hydrate any missing saved bots in the background if not yet in SQLite/cache
        const missingIds = savedIdsList.filter(id => !cardMap.has(id) && !this.botCache.has(id));
        if (missingIds.length > 0) {
          Promise.all(missingIds.map(id =>
            fetch(`/api/connect/bot/${encodeURIComponent(id)}`)
              .then(r => r.ok ? r.json() : null)
              .catch(() => null)
          )).then(fetched => {
            let hasNew = false;
            fetched.forEach(b => {
              if (b && b.id) {
                this.cacheBot(b);
                hasNew = true;
                fetch('/api/connect/save', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(b)
                }).catch(() => {});
              }
            });
            if (hasNew && this.currentView === 'library') {
              const grid = document.getElementById('library-grid');
              if (grid) {
                const refreshed = [];
                for (const id of savedIdsList) {
                  if (cardMap.has(id)) refreshed.push(cardMap.get(id));
                  else if (this.botCache.has(id)) refreshed.push(this.botCache.get(id));
                }
                if (refreshed.length > 0) {
                  grid.innerHTML = refreshed.map((b, i) => this.renderBotCardHTML(b, i)).join('');
                }
              }
            }
          });
        }

        const grid = document.getElementById('library-grid');
        if (grid) {
          if (finalCards.length > 0) {
            grid.innerHTML = finalCards.map((b, i) => this.renderBotCardHTML(b, i)).join('');
          } else {
            grid.innerHTML = `
              <div style="grid-column: 1/-1; padding: 60px 20px; text-align: center; background: var(--c-surface-1); border-radius: var(--c-radius-xl); border: 1px solid var(--c-border);">
                <div style="font-size: 2.25rem; margin-bottom: 12px;">💾</div>
                <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 8px; color: var(--c-text-primary);">Your library is currently empty</h3>
                <p style="font-size: 0.8125rem; color: var(--c-text-muted); margin-bottom: 20px; max-width: 440px; margin-left: auto; margin-right: auto;">Bookmark your favorite JanitorAI bots in Discover or Search to save them here for offline access.</p>
                <button class="search-submit-btn" onclick="SConnect.navigate('discover')">Explore Characters</button>
              </div>
            `;
          }
        }
      } catch (e) {
        console.warn('Failed to load library:', e);
      }
    },

    // -------------------------------------------------------------------------
    // 7. PROMPT INTERCEPTOR VIEW (Janitor Custom LLM Proxy Exploit)
    // -------------------------------------------------------------------------
    async renderInterceptorView(container) {
      let lanIp = '127.0.0.1';
      try {
        const info = await fetch('/api/connect/proxy/info').then(r => r.json());
        lanIp = info.lan_url || 'http://127.0.0.1:9000/v1';
      } catch (e) {}

      container.innerHTML = `
        <div style="padding: var(--c-space-6) 0;">
          <!-- Banner Card -->
          <div class="interceptor-banner-card">
            <div>
              <h2 style="font-size: 1.5rem; font-weight: 800; margin: 0 0 6px; color: var(--c-text-primary);">JanitorAI Custom LLM Prompt Interceptor</h2>
              <p style="font-size: 0.875rem; color: var(--c-text-secondary); margin: 0; line-height: 1.6;">
                Unmask hidden character definitions and private system prompts in real-time. By configuring JanitorAI's chat settings to route through Singularity, you can automatically capture and compile full SillyTavern character cards.
              </p>
            </div>

            <!-- Configuration Endpoints Box -->
            <div class="interceptor-config-box">
              <div>
                <span style="color:var(--c-text-muted); font-size:0.75rem; display:block;">REVERSE PROXY / CUSTOM LLM ENDPOINT:</span>
                <code>${lanIp}</code>
              </div>
              <button class="panel-copy-btn" onclick="SConnect.copyText(this, '${lanIp}')">
                ${ICONS.copy}
                <span>Copy URL</span>
              </button>
            </div>

            <div class="interceptor-config-box">
              <div>
                <span style="color:var(--c-text-muted); font-size:0.75rem; display:block;">MODEL ID (OPENAI OR CUSTOM):</span>
                <code>s-connect-proxy</code>
              </div>
              <button class="panel-copy-btn" onclick="SConnect.copyText(this, 's-connect-proxy')">
                ${ICONS.copy}
                <span>Copy Model</span>
              </button>
            </div>
          </div>

          <!-- Live Captures Header -->
          <div class="section-header">
            <div class="section-title-wrap">
              <h3 class="section-title" style="font-size: 1.25rem;">Live Captured Prompts</h3>
              <span class="section-subtitle">Real-time hidden prompts extracted from active Janitor chat sessions</span>
            </div>
            <button class="panel-copy-btn" onclick="SConnect.clearIntercepts()">
              <span>Clear Log</span>
            </button>
          </div>

          <div id="intercepts-list-grid" class="intercept-list-grid">
            <div style="padding: 40px; text-align: center; color: var(--c-text-muted);">Listening for chat completions on port 9000...</div>
          </div>
        </div>
      `;

      this.loadIntercepts();
    },

    async loadIntercepts() {
      try {
        const res = await fetch('/api/connect/proxy/intercepts?limit=30').then(r => r.json());
        const list = res.intercepts || [];
        this.interceptedPrompts = list;
        const grid = document.getElementById('intercepts-list-grid');
        if (grid) {
          if (list.length > 0) {
            grid.innerHTML = list.map((item, idx) => `
              <div class="intercept-card">
                <div class="intercept-header">
                  <div class="intercept-title">${this.escapeHTML(item.bot_name || 'Captured Character')} (${item.token_count || 0} tokens)</div>
                  <span style="font-size: 0.75rem; color: var(--c-text-muted);">${item.timestamp ? String(item.timestamp).slice(0, 19) : 'Just now'}</span>
                </div>
                <div class="intercept-prompt-preview">${this.escapeHTML(item.system_prompt || '')}</div>
                <div style="display:flex; justify-content:flex-end; gap:8px;">
                  <button class="panel-copy-btn" onclick="SConnect.copyInterceptPrompt(this, ${idx})">
                    ${ICONS.copy} <span>Copy Prompt</span>
                  </button>
                </div>
              </div>
            `).join('');
          } else {
            grid.innerHTML = `<div style="padding: 50px; text-align: center; color: var(--c-text-muted); background: var(--c-surface-1); border-radius: var(--c-radius-lg); border: 1px solid var(--c-border);">No intercepted prompts captured yet. Send 1 message in JanitorAI using the proxy URL to capture.</div>`;
          }
        }
      } catch (e) {
        console.warn('Failed to load intercepts:', e);
      }
    },

    async clearIntercepts() {
      try {
        await fetch('/api/connect/proxy/intercepts', { method: 'DELETE' });
        this.loadIntercepts();
      } catch (e) {}
    },

    // -------------------------------------------------------------------------
    // ACTIONS & CONTROLS
    // -------------------------------------------------------------------------
    openBotDetail(botId) {
      this.navigate('bot', { id: botId });
    },

    openCreatorDetail(creatorId) {
      this.navigate('creator', { id: creatorId });
    },

    downloadBotPNG(botId) {
      window.location.href = `/api/connect/bot/${encodeURIComponent(botId)}/download_png`;
    },

    async toggleSaveBot(botId, btn) {
      const isSaved = this.savedBotIds.has(botId);
      if (isSaved) {
        this.savedBotIds.delete(botId);
        if (btn) {
          btn.classList.remove('is-saved');
          btn.innerHTML = `${ICONS.bookmark} <span>Save to Library</span>`;
        }
        fetch(`/api/connect/save/${encodeURIComponent(botId)}`, { method: 'DELETE' }).catch(() => {});
      } else {
        // Prepend so newly saved item appears at the top
        const updated = [botId, ...Array.from(this.savedBotIds).filter(id => id !== botId)];
        this.savedBotIds = new Set(updated);
        if (btn) {
          btn.classList.add('is-saved');
          btn.innerHTML = `${ICONS.bookmarkFilled} <span>Saved</span>`;
        }
        // Save to SQLite
        const bot = this.botCache.get(botId) || (this.activeBot && this.activeBot.id === botId ? this.activeBot : null) || { id: botId };
        if (bot && bot.name && !this.botCache.has(botId)) {
          this.cacheBot(bot);
        }
        fetch('/api/connect/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bot)
        }).catch(() => {});
      }
      localStorage.setItem('s_connect_saved_bots', JSON.stringify(Array.from(this.savedBotIds)));

      // Reactive cloud sync to Supabase
      window.dispatchEvent(new CustomEvent('singularity-cloud-sync-needed'));

      if (this.currentView === 'library') {
        const container = document.getElementById('connect-main-view');
        if (container) this.renderLibraryView(container);
      }
    },

    toggleFollowCreator(creatorId, btn) {
      const isFollowing = this.followingCreatorIds.has(creatorId);
      if (isFollowing) {
        this.followingCreatorIds.delete(creatorId);
        if (btn) {
          btn.classList.remove('is-following');
          btn.innerHTML = `+ <span>Follow</span>`;
        }
      } else {
        this.followingCreatorIds.add(creatorId);
        if (btn) {
          btn.classList.add('is-following');
          btn.innerHTML = `${ICONS.check} <span>Following</span>`;
        }
      }
      localStorage.setItem('s_connect_following', JSON.stringify(Array.from(this.followingCreatorIds)));

      // Reactive cloud sync to Supabase
      window.dispatchEvent(new CustomEvent('singularity-cloud-sync-needed'));

      // If currently on creators page or following feed, re-render smoothly
      if (this.currentView === 'creators') {
        const container = document.getElementById('connect-main-view');
        if (container) this.renderCreatorsView(container);
      } else if (this.currentView === 'following') {
        const container = document.getElementById('connect-main-view');
        if (container) this.renderFollowingView(container);
      }
    },

    playBotInChat(botId) {
      this.navigate('chat', { id: botId });
    },

    // -------------------------------------------------------------------------
    // JANITOR ROLEPLAY CHAT SYSTEM & PARSER
    // -------------------------------------------------------------------------
    getPersonas() {
      try {
        const p = JSON.parse(localStorage.getItem('s_connect_personas') || '[]');
        if (p && p.length) return p;
      } catch (e) {}
      const defaultPersonas = [
        {
          id: 'persona_default',
          name: 'Ayame',
          avatar: '/static/preloader/3a6a0a99717d5533928eecd2046ec085.jpg',
          description: 'Ayame is visiting the club tonight, dressed comfortably yet stylishly, with quiet curiosity.'
        }
      ];
      localStorage.setItem('s_connect_personas', JSON.stringify(defaultPersonas));
      return defaultPersonas;
    },

    getActivePersona() {
      const personas = this.getPersonas();
      const activeId = localStorage.getItem('s_connect_active_persona_id');
      const found = personas.find(p => p.id === activeId);
      return found || personas[0];
    },

    setActivePersona(id) {
      localStorage.setItem('s_connect_active_persona_id', id);
      localStorage.setItem('s_connect_active_persona', id);
      const capsule = document.getElementById('janitor-persona-capsule-btn');
      if (capsule) {
        const active = this.getActivePersona();
        capsule.innerHTML = `
          <img src="${active.avatar || DEFAULT_AVATAR}" class="janitor-persona-thumb" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';" />
          <span class="janitor-persona-name">${this.escapeHTML(active.name)}</span>
          <span class="janitor-chevron">${ICONS.chevronDown}</span>
        `;
      }
      window.dispatchEvent(new CustomEvent('singularity-cloud-sync-needed'));
    },

    // -------------------------------------------------------------------------
    // MULTI-SESSION CHAT STORE & MEMORY ISOLATION (Zero Leakage)
    // -------------------------------------------------------------------------
    getAllChatSessions() {
      try {
        const raw = localStorage.getItem('s_connect_sessions_v2');
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return [];
    },

    saveAllChatSessions(sessions) {
      try {
        localStorage.setItem('s_connect_sessions_v2', JSON.stringify(sessions));
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('singularity-chat-updated'));
    },

    getBotChatSessions(botId) {
      const all = this.getAllChatSessions();
      return all.filter(s => String(s.botId) === String(botId)).sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    },

    getActiveChatSession(botId, createIfMissing = true, botObj = null) {
      const activeId = localStorage.getItem(`s_connect_active_chat_${botId}`);
      const sessions = this.getBotChatSessions(botId);
      if (activeId) {
        const found = sessions.find(s => s.id === activeId);
        if (found) return found;
      }
      if (sessions.length > 0) {
        localStorage.setItem(`s_connect_active_chat_${botId}`, sessions[0].id);
        return sessions[0];
      }
      if (createIfMissing) {
        const bot = botObj || this.botCache.get(botId) || (this.activeBot && this.activeBot.id === botId ? this.activeBot : { id: botId, name: 'Character' });
        return this.createNewChat(bot, 0);
      }
      return null;
    },

    updateChatSessionMeta(session) {
      if (!session || !session.id) return;
      const all = this.getAllChatSessions();
      const idx = all.findIndex(s => s.id === session.id);
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...session };
      } else {
        all.unshift(session);
      }
      this.saveAllChatSessions(all);
      this.scheduleSessionSyncToBackend(session.id);
    },

    createNewChat(bot, greetingIdx = 0) {
      const persona = this.getActivePersona();
      const greetings = this.getBotGreetings(bot);
      const chosenGreeting = greetings[greetingIdx] || greetings[0] || `*${bot.name} stands before you.* "Hey."`;
      const formattedGreeting = this.replaceMacros(chosenGreeting, bot.name, persona.name);

      const timestamp = Date.now();
      const chatId = `chat_${bot.id}_${timestamp}`;

      const initialMessage = {
        id: 'msg_' + timestamp,
        role: 'assistant',
        author: bot.name,
        avatar: bot.avatar || DEFAULT_AVATAR,
        content: formattedGreeting,
        timestamp: timestamp
      };

      // Isolated messages for this chat session
      this.saveChatMessages(chatId, [initialMessage]);

      // Inherit bot default parameters, but ensure memorySummary is blank for ZERO memory leakage!
      const inheritedSettings = this.getBotDefaultSettings(bot.id);
      inheritedSettings.memorySummary = '';
      localStorage.setItem(`s_connect_settings_${chatId}`, JSON.stringify(inheritedSettings));

      const session = {
        id: chatId,
        botId: bot.id,
        botName: bot.name,
        botAvatar: bot.avatar || DEFAULT_AVATAR,
        botDescription: bot.description || bot.personality || '',
        createdAt: timestamp,
        updatedAt: timestamp,
        summary: 'no summary :(',
        messageCount: 1,
        greetingIdx: greetingIdx,
        personaId: persona.id,
        personaAvatar: persona.avatar,
        personaName: persona.name,
        isPublished: false
      };

      const all = this.getAllChatSessions();
      all.unshift(session);
      this.saveAllChatSessions(all);

      localStorage.setItem(`s_connect_active_chat_${bot.id}`, chatId);
      localStorage.setItem(`s_connect_greeting_idx_${chatId}`, greetingIdx);

      this.scheduleSessionSyncToBackend(chatId);

      return session;
    },

    getChatMessages(chatId) {
      try {
        const raw = localStorage.getItem(`s_connect_chat_msgs_${chatId}`);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return [];
    },

    saveChatMessages(chatId, messages) {
      try {
        localStorage.setItem(`s_connect_chat_msgs_${chatId}`, JSON.stringify(messages));
      } catch (e) {}
      this.scheduleSessionSyncToBackend(chatId);
      window.dispatchEvent(new CustomEvent('singularity-chat-updated'));
    },

    deleteChatSession(chatId, botId, event) {
      if (event) {
        event.stopPropagation();
      }
      if (!confirm('Are you sure you want to permanently delete this chat?')) return;

      localStorage.removeItem(`s_connect_chat_msgs_${chatId}`);
      localStorage.removeItem(`s_connect_settings_${chatId}`);
      localStorage.removeItem(`s_connect_greeting_idx_${chatId}`);

      let all = this.getAllChatSessions();
      all = all.filter(s => s.id !== chatId);
      this.saveAllChatSessions(all);

      // Delete from backend SQLite vault asynchronously
      fetch(`/api/connect/sync/session/${encodeURIComponent(chatId)}`, { method: 'DELETE' }).catch(() => {});

      const activeId = localStorage.getItem(`s_connect_active_chat_${botId}`);
      if (activeId === chatId) {
        const remaining = all.filter(s => String(s.botId) === String(botId));
        if (remaining.length > 0) {
          localStorage.setItem(`s_connect_active_chat_${botId}`, remaining[0].id);
        } else {
          localStorage.removeItem(`s_connect_active_chat_${botId}`);
        }
      }

      if (this.currentView === 'my-chats') {
        const container = document.getElementById('connect-main-view');
        if (container) this.renderMyChatsView(container, botId);
      } else if (this.currentView === 'chat') {
        const container = document.getElementById('connect-main-view');
        if (container) this.renderChatView(container, botId);
      }
    },

    resumeChatSession(botId, chatId) {
      localStorage.setItem(`s_connect_active_chat_${botId}`, chatId);
      this.navigate('chat', { id: botId });
    },

    triggerNewChat(botId) {
      this.closeHamburgerMenu();
      const bot = this.botCache.get(botId) || (this.activeBot && this.activeBot.id === botId ? this.activeBot : null);
      if (!bot) return;
      this.createNewChat(bot, 0);
      const container = document.getElementById('connect-main-view');
      if (container) {
        this.renderChatView(container, bot.id);
      }
    },

    triggerNewChatFromDrawer(botId) {
      const bot = this.botCache.get(botId) || (this.activeBot && this.activeBot.id === botId ? this.activeBot : null);
      if (!bot) {
        this.navigate('chat', { id: botId });
        return;
      }
      const newSession = this.createNewChat(bot, 0);
      this.resumeChatSession(botId, newSession.id);
    },

    publishCurrentChat(botId) {
      this.closeHamburgerMenu();
      const session = this.getActiveChatSession(botId);
      if (!session) return;
      const history = this.getChatMessages(session.id);
      const all = this.getAllChatSessions();
      const found = all.find(s => s.id === session.id);
      if (found) {
        found.isPublished = true;
        this.saveAllChatSessions(all);
        this.scheduleSessionSyncToBackend(found.id);
      }
      const text = history.map(m => `[${m.author}]: ${m.content}`).join('\n\n');
      navigator.clipboard.writeText(text).then(() => {
        alert('Chat published! Complete conversation transcript copied to clipboard.');
      }).catch(() => {
        alert('Chat marked as published in your library!');
      });
    },

    // -------------------------------------------------------------------------
    // PERSISTENT CLOUD & SQLITE BACKEND SYNCHRONIZATION
    // -------------------------------------------------------------------------
    async syncWithServer() {
      try {
        const res = await fetch('/api/connect/sync');
        if (!res.ok) return;
        const json = await res.json();
        const serverData = json.data || json;
        if (!serverData) return;

        // 1. Merge Sessions
        const serverSessions = serverData.sessions || [];
        const localSessions = this.getAllChatSessions();
        const sessionMap = new Map();

        serverSessions.forEach(s => {
          if (s && s.id) sessionMap.set(s.id, s);
        });

        let hasNewLocalSessions = false;
        localSessions.forEach(loc => {
          if (!loc || !loc.id) return;
          const srv = sessionMap.get(loc.id);
          if (!srv) {
            sessionMap.set(loc.id, loc);
            hasNewLocalSessions = true;
          } else {
            const locTime = Number(loc.updatedAt || loc.createdAt || 0);
            const srvTime = Number(srv.updatedAt || srv.createdAt || 0);
            if (locTime > srvTime) {
              sessionMap.set(loc.id, loc);
              hasNewLocalSessions = true;
            } else if (srv.messages && srv.messages.length > 0) {
              this.saveChatMessages(loc.id, srv.messages);
              if (srv.settings && Object.keys(srv.settings).length > 0) {
                localStorage.setItem(`s_connect_settings_${loc.id}`, JSON.stringify(srv.settings));
              }
            }
          }
        });

        const unified = Array.from(sessionMap.values()).sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
        this.saveAllChatSessions(unified);

        // Populate messages for sessions missing local messages
        serverSessions.forEach(s => {
          if (s && s.id && Array.isArray(s.messages) && s.messages.length > 0) {
            const existing = this.getChatMessages(s.id);
            if (!existing || existing.length === 0) {
              this.saveChatMessages(s.id, s.messages);
            }
            if (s.settings && Object.keys(s.settings).length > 0) {
              if (!localStorage.getItem(`s_connect_settings_${s.id}`)) {
                localStorage.setItem(`s_connect_settings_${s.id}`, JSON.stringify(s.settings));
              }
            }
          }
        });

        // 2. Personas sync
        if (Array.isArray(serverData.personas) && serverData.personas.length > 0) {
          const localPersonas = this.getAllPersonas();
          const pMap = new Map();
          serverData.personas.forEach(p => { if (p && p.id) pMap.set(p.id, p); });
          localPersonas.forEach(p => { if (p && p.id) pMap.set(p.id, p); });
          this.saveAllPersonas(Array.from(pMap.values()));
        }

        // 3. Saved bots & following sync
        if (Array.isArray(serverData.saved_bots) && serverData.saved_bots.length > 0) {
          serverData.saved_bots.forEach(id => this.savedBotIds.add(id));
          localStorage.setItem('s_connect_saved_bots', JSON.stringify(Array.from(this.savedBotIds)));
        }
        if (Array.isArray(serverData.following) && serverData.following.length > 0) {
          serverData.following.forEach(id => this.followingCreatorIds.add(id));
          localStorage.setItem('s_connect_following', JSON.stringify(Array.from(this.followingCreatorIds)));
        }

        if (hasNewLocalSessions) {
          this.pushAllToBackend();
        }
      } catch (e) {
        console.warn('[S-Connect] Auto-sync with server skipped:', e);
      }
    },

    scheduleSessionSyncToBackend(chatId) {
      if (!chatId) return;
      if (!this._syncTimers) this._syncTimers = {};
      clearTimeout(this._syncTimers[chatId]);
      this._syncTimers[chatId] = setTimeout(() => {
        this.syncSessionToBackend(chatId);
      }, 700);
    },

    async syncSessionToBackend(chatId) {
      try {
        const all = this.getAllChatSessions();
        const session = all.find(s => s.id === chatId);
        if (!session) return;
        const messages = this.getChatMessages(chatId);
        let settings = {};
        try {
          const rawSett = localStorage.getItem(`s_connect_settings_${chatId}`);
          if (rawSett) settings = JSON.parse(rawSett);
        } catch (e) {}

        const payload = {
          ...session,
          messages: messages,
          settings: settings
        };

        await fetch('/api/connect/sync/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (e) {
        console.warn('[S-Connect] Error syncing session to backend:', e);
      }
    },

    async pushAllToBackend() {
      try {
        const all = this.getAllChatSessions();
        const fullSessions = all.map(s => {
          const msgs = this.getChatMessages(s.id);
          let sett = {};
          try {
            const rawSett = localStorage.getItem(`s_connect_settings_${s.id}`);
            if (rawSett) sett = JSON.parse(rawSett);
          } catch (e) {}
          return { ...s, messages: msgs, settings: sett };
        });

        const personas = this.getAllPersonas();
        const activePersonaId = localStorage.getItem('s_connect_active_persona') || 'persona_default';
        const savedBots = Array.from(this.savedBotIds || []);
        const following = Array.from(this.followingCreatorIds || []);

        const bundle = {
          version: 2,
          sessions: fullSessions,
          personas: personas,
          active_persona_id: activePersonaId,
          saved_bots: savedBots,
          following: following
        };

        const res = await fetch('/api/connect/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bundle)
        });
        return res.ok;
      } catch (e) {
        console.warn('[S-Connect] Push all to backend error:', e);
        return false;
      }
    },

    openCloudSyncModal() {
      // Manual LAN modal removed - replaced by automatic real-time Supabase cloud sync
      this.closeHamburgerMenu();
      if (window.SingularityCloud && typeof window.SingularityCloud.syncUp === 'function') {
        window.SingularityCloud.syncUp();
        window.SingularityCloud.syncDown();
      }
    },

    closeCloudSyncModal() {
      const modal = document.getElementById('s-connect-sync-modal');
      if (modal) modal.remove();
    },

    exportBackupJson() {
      try {
        const allSessions = this.getAllChatSessions();
        const fullSessions = allSessions.map(s => {
          const msgs = this.getChatMessages(s.id);
          let sett = {};
          try {
            const rawSett = localStorage.getItem(`s_connect_settings_${s.id}`);
            if (rawSett) sett = JSON.parse(rawSett);
          } catch (e) {}
          return { ...s, messages: msgs, settings: sett };
        });

        const backup = {
          version: 2,
          exported_at: new Date().toISOString(),
          sessions: fullSessions,
          personas: this.getAllPersonas(),
          active_persona_id: localStorage.getItem('s_connect_active_persona') || 'persona_default',
          saved_bots: Array.from(this.savedBotIds || []),
          following: Array.from(this.followingCreatorIds || [])
        };

        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `singularity-connect-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.setSyncLog(`Exported backup with ${fullSessions.length} conversations.`);
      } catch (e) {
        this.setSyncLog(`Export failed: ${e.message}`, true);
      }
    },

    importBackupJson(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target.result;
          const data = JSON.parse(content);
          if (!data || (!data.sessions && !Array.isArray(data))) {
            throw new Error('Invalid backup file format.');
          }

          const payload = {
            sessions: Array.isArray(data) ? data : (data.sessions || []),
            personas: data.personas || [],
            saved_bots: data.saved_bots || [],
            following: data.following || []
          };

          const res = await fetch('/api/connect/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!res.ok) throw new Error('Server rejected backup bundle.');
          await this.syncWithServer();
          this.setSyncLog(`Imported ${payload.sessions.length} sessions successfully!`);
          if (this.currentView === 'my-chats') {
            const container = document.getElementById('connect-main-view');
            if (container) this.renderMyChatsView(container, this._expandedBotId);
          }
        } catch (err) {
          this.setSyncLog(`Import error: ${err.message}`, true);
        }
      };
      reader.readAsText(file);
    },

    toggleHamburgerMenu(event, botId) {
      if (event) event.stopPropagation();
      const dropdown = document.getElementById('janitor-menu-dropdown');
      if (!dropdown) return;
      const isVisible = dropdown.style.display !== 'none';
      if (isVisible) {
        this.closeHamburgerMenu();
      } else {
        dropdown.style.display = 'flex';
        setTimeout(() => {
          const closeHandler = (e) => {
            if (!e.target.closest('#janitor-header-menu-anchor')) {
              this.closeHamburgerMenu();
              document.removeEventListener('click', closeHandler);
            }
          };
          document.addEventListener('click', closeHandler);
        }, 10);
      }
    },

    closeHamburgerMenu() {
      const dropdown = document.getElementById('janitor-menu-dropdown');
      if (dropdown) dropdown.style.display = 'none';
    },

    handleMenuAction(action, botId) {
      this.closeHamburgerMenu();
      if (action === 'settings') {
        this.openChatSettingsModal(botId);
        this.switchSettingsTab('settings');
      } else if (action === 'memory') {
        this.openChatSettingsModal(botId);
        this.switchSettingsTab('memory');
      } else if (action === 'customize') {
        this.openChatSettingsModal(botId);
        this.switchSettingsTab('customize');
      } else if (action === 'publish') {
        this.publishCurrentChat(botId);
      } else if (action === 'cloudSync') {
        this.openCloudSyncModal();
      } else if (action === 'newChat') {
        this.triggerNewChat(botId);
      } else if (action === 'allChats') {
        this.navigate('my-chats', { id: botId });
      }
    },

    formatRelativeTime(timestamp) {
      if (!timestamp) return 'JUST NOW';
      const now = Date.now();
      const diff = Math.max(0, now - timestamp);
      const sec = Math.floor(diff / 1000);
      const min = Math.floor(sec / 60);
      const hr = Math.floor(min / 60);
      const day = Math.floor(hr / 24);

      if (min < 1) return 'JUST NOW';
      if (min < 60) return `${min} MINUTE${min > 1 ? 'S' : ''} AGO`;
      if (hr < 24) return `ABOUT ${hr} HOUR${hr > 1 ? 'S' : ''} AGO`;
      if (day === 1) return 'YESTERDAY';
      if (day < 7) return `${day} DAYS AGO`;
      if (day < 30) return `ABOUT ${Math.floor(day / 7)} WEEKS AGO`;
      return `${Math.floor(day / 30)} MONTHS AGO`;
    },

    getTimeGroupTag(timestamp) {
      if (!timestamp) return 'TODAY';
      const now = new Date();
      const date = new Date(timestamp);
      const diffDays = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(date.getFullYear(), date.getMonth(), date.getDate())) / 86400000);
      if (diffDays <= 0) return 'TODAY';
      if (diffDays === 1) return 'YESTERDAY';
      if (diffDays < 7) return 'PREVIOUS 7 DAYS';
      return 'OLDER';
    },

    migrateLegacyChats() {
      try {
        let allSessions = this.getAllChatSessions();
        let changed = false;

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('s_connect_chat_') && !key.startsWith('s_connect_chat_msgs_') && !key.startsWith('s_connect_chat_model')) {
            const botId = key.replace('s_connect_chat_', '');
            if (!botId) continue;
            const msgsRaw = localStorage.getItem(key);
            if (!msgsRaw) continue;
            let msgs = null;
            try { msgs = JSON.parse(msgsRaw); } catch (e) {}
            if (!Array.isArray(msgs) || msgs.length === 0) continue;

            const existingForBot = allSessions.filter(s => String(s.botId) === String(botId));
            if (existingForBot.length === 0) {
              const bot = this.botCache.get(botId) || (this.activeBot && this.activeBot.id === botId ? this.activeBot : null);
              const chatId = `chat_${botId}_${Date.now()}`;
              this.saveChatMessages(chatId, msgs);
              const persona = this.getActivePersona();
              const lastMsg = msgs[msgs.length - 1];
              const session = {
                id: chatId,
                botId: botId,
                botName: bot ? bot.name : (msgs[0]?.author || 'Character'),
                botAvatar: bot?.avatar || msgs[0]?.avatar || DEFAULT_AVATAR,
                botDescription: bot?.description || '',
                createdAt: msgs[0]?.timestamp || Date.now(),
                updatedAt: lastMsg?.timestamp || Date.now(),
                summary: 'no summary :(',
                messageCount: msgs.length,
                greetingIdx: 0,
                personaId: persona.id,
                personaAvatar: persona.avatar,
                personaName: persona.name,
                isPublished: false
              };
              allSessions.push(session);
              localStorage.setItem(`s_connect_active_chat_${botId}`, chatId);
              changed = true;
            }
          }
        }
        if (changed) {
          this.saveAllChatSessions(allSessions);
        }
      } catch (e) {
        console.warn('Chat migration error:', e);
      }
    },

    getChatHistory(botId) {
      const session = this.getActiveChatSession(botId, false);
      if (session) {
        return this.getChatMessages(session.id);
      }
      try {
        const raw = localStorage.getItem(`s_connect_chat_${botId}`);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return [];
    },

    saveChatHistory(botId, history) {
      const session = this.getActiveChatSession(botId, true);
      if (session) {
        this.saveChatMessages(session.id, history);
        session.updatedAt = Date.now();
        session.messageCount = history.length;
        this.updateChatSessionMeta(session);
      } else {
        try {
          localStorage.setItem(`s_connect_chat_${botId}`, JSON.stringify(history));
        } catch (e) {}
      }
    },

    replaceMacros(text, charName, userName) {
      if (!text) return '';
      return text
        .replace(/\{\{char\}\}/gi, charName || 'Character')
        .replace(/\{\{user\}\}/gi, userName || 'User')
        .replace(/<BOT>/gi, charName || 'Character')
        .replace(/<USER>/gi, userName || 'User');
    },

    parseJanitorChatMarkdown(rawText) {
      if (!rawText) return '';
      let str = String(rawText);

      // 1. Tokenize code blocks & inline code FIRST to protect them from regex formatting
      const codeTokens = [];
      const saveCode = (html) => {
        codeTokens.push(html);
        return `\uE002CODE${codeTokens.length - 1}\uE003`;
      };

      // Triple backticks code block
      str = str.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
        return saveCode(`<pre class="rp-pre"><code class="rp-code-block">${this.escapeHTML(code.trim())}</code></pre>`);
      });

      // Inline code with backticks (`Hi`, etc.)
      str = str.replace(/`([^`\n\r]+?)`/g, (_, code) => {
        return saveCode(`<code class="rp-code">${this.escapeHTML(code)}</code>`);
      });

      // 2. Escape general HTML safely
      str = this.escapeHTML(str);

      // 3. Spoilers ||hidden||
      str = str.replace(/\|\|([\s\S]+?)\|\|/g, '<span class="rich-spoiler" onclick="this.classList.toggle(\'is-revealed\')" title="Click to reveal spoiler">$1</span>');

      // 4. Bold + Italic: ***...*** or ___...___
      str = str.replace(/\*\*\*([^\*\n\r]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
      str = str.replace(/___([^_\n\r]+?)___/g, '<strong><em>$1</em></strong>');

      // 5. Bold: **...** or __...__
      str = str.replace(/\*\*([^\*\n\r]+?)\*\*/g, '<strong>$1</strong>');
      str = str.replace(/__([^_\n\r]+?)__/g, '<strong>$1</strong>');

      // 6. Spoken dialogue in quotes: "..." or “...”
      // In Janitor roleplay, dialogue within quotes is highlighted in bold
      str = str.replace(/(?:“|")([^"\n\r“”]+?)(?:”|")/g, '<strong class="rp-dialogue">“$1”</strong>');

      // 7. Narration / Actions in single asterisks or underscores: *...* or _..._
      str = str.replace(/\*([^\*\n\r]+?)\*/g, '<em class="rp-narration">$1</em>');
      str = str.replace(/_([^_\n\r]+?)_/g, '<em class="rp-narration">$1</em>');

      // 8. Strikethrough: ~~...~~
      str = str.replace(/~~([^~\n\r]+?)~~/g, '<del>$1</del>');

      // 9. Restore code tokens
      for (let i = 0; i < codeTokens.length; i++) {
        str = str.split(`\uE002CODE${i}\uE003`).join(codeTokens[i]);
      }

      // 10. Natural paragraph breaks
      const paragraphs = str.split(/\n\n+/).map(p => {
        const trimmed = p.trim();
        if (!trimmed) return '';
        return `<p class="rp-para">${trimmed.replace(/\n/g, '<br>')}</p>`;
      }).filter(Boolean);

      return paragraphs.join('') || `<p class="rp-para">${str}</p>`;
    },

    async renderChatView(container, botId) {
      let bot = this.botCache.get(botId) || (this.activeBot && this.activeBot.id === botId ? this.activeBot : null);
      if (!bot) {
        container.innerHTML = `
          <div class="janitor-chat-view" style="display:flex; justify-content:center; align-items:center; min-height:60vh;">
            <div class="empty-state-card" style="text-align:center;">
              <div class="empty-state-title" style="margin-bottom:8px;">Connecting to Bot Memory...</div>
              <div class="empty-state-subtitle">Loading character card and conversation session</div>
            </div>
          </div>
        `;
        try {
          const res = await fetch(`/api/connect/bot/${botId}`).then(r => r.json());
          bot = res.data || res;
          if (bot && bot.id) {
            this.cacheBot(bot);
            this.activeBot = bot;
          }
        } catch (e) {
          console.error('Failed to load bot for chat:', e);
        }
      }

      if (!bot) {
        container.innerHTML = `
          <div class="janitor-chat-view" style="display:flex; justify-content:center; align-items:center; min-height:60vh;">
            <div class="empty-state-card" style="text-align:center;">
              <div class="empty-state-title" style="color:var(--c-danger);">Character Not Found</div>
              <button class="back-nav-btn" style="margin:16px auto;" onclick="SConnect.navigateBack()">Back to Discover</button>
            </div>
          </div>
        `;
        return;
      }

      const persona = this.getActivePersona();
      const session = this.getActiveChatSession(bot.id, true, bot);
      const settings = this.getChatSettings(session.id);
      const greetings = this.getBotGreetings(bot);
      const greetingIdx = (typeof session.greetingIdx === 'number') ? session.greetingIdx : this.getGreetingIndex(bot.id);

      let history = this.getChatMessages(session.id);
      if (!history || history.length === 0) {
        const greetingRaw = greetings[greetingIdx] || greetings[0] || `*${bot.name} stands before you.* "Hey."`;
        const formattedGreeting = this.replaceMacros(greetingRaw, bot.name, persona.name);
        history = [
          {
            id: 'msg_' + Date.now(),
            role: 'assistant',
            author: bot.name,
            avatar: bot.avatar || DEFAULT_AVATAR,
            content: formattedGreeting,
            timestamp: Date.now()
          }
        ];
        this.saveChatMessages(session.id, history);
        session.messageCount = 1;
        this.updateChatSessionMeta(session);
      }

      const isUnmasked = bot.is_unmasked || bot.isUnmasked || false;
      const bgImg = settings.customBg || bot.avatar || '';

      container.innerHTML = `
        <div class="janitor-chat-view" id="janitor-chat-view">
          <!-- Background image layer with opacity & blur -->
          <div class="janitor-chat-bg-layer" id="janitor-chat-bg-layer" style="background-image: url('${bgImg}'); opacity: ${settings.bgOpacity / 100}; filter: blur(${settings.bgBlur}px);"></div>

          <!-- Top Sticky Header (Exact match to screenshot) -->
          <header class="janitor-chat-header">
            <button class="janitor-chat-back-btn" onclick="SConnect.navigateBack()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"></polyline></svg>
              <span>Back</span>
            </button>

            <div class="janitor-chat-title" onclick="SConnect.navigate('bot', { id: '${bot.id}' })" title="View Bot Card Details">
              ${isUnmasked ? ICONS.unlock : ICONS.lock}
              <span>${this.escapeHTML(bot.name)}</span>
            </div>

            <div class="janitor-chat-header-actions">
              <div class="janitor-proxy-pill" onclick="SConnect.openChatSettingsModal('${bot.id}')" title="Gateway proxy active">
                <span>using proxy</span>
              </div>
              <div class="janitor-header-menu-anchor" id="janitor-header-menu-anchor">
                <button class="janitor-chat-menu-btn" id="janitor-hamburger-btn" onclick="SConnect.toggleHamburgerMenu(event, '${bot.id}')" title="Menu">
                  ${ICONS.menu}
                </button>
                <div class="janitor-menu-dropdown" id="janitor-menu-dropdown" style="display: none;">
                  <button class="janitor-dropdown-item" onclick="SConnect.handleMenuAction('settings', '${bot.id}')">
                    ${ICONS.settings}
                    <span>Settings</span>
                  </button>
                  <button class="janitor-dropdown-item" onclick="SConnect.handleMenuAction('memory', '${bot.id}')">
                    ${ICONS.save}
                    <span>Chat Memory</span>
                  </button>
                  <button class="janitor-dropdown-item" onclick="SConnect.handleMenuAction('customize', '${bot.id}')">
                    ${ICONS.palette}
                    <span>Customize</span>
                  </button>
                  <button class="janitor-dropdown-item" onclick="SConnect.handleMenuAction('publish', '${bot.id}')">
                    ${ICONS.globe}
                    <span>Publish Chat</span>
                  </button>
                  <button class="janitor-dropdown-item" onclick="SConnect.handleMenuAction('newChat', '${bot.id}')">
                    ${ICONS.newChat}
                    <span>New Chat</span>
                  </button>
                  <button class="janitor-dropdown-item" onclick="SConnect.handleMenuAction('allChats', '${bot.id}')">
                    ${ICONS.allChats}
                    <span>All Chats</span>
                  </button>
                </div>
              </div>
            </div>
          </header>

          <!-- Main Message Stream (Full width, scrolls independently) -->
          <div class="janitor-chat-stream" id="janitor-chat-stream">
            ${history.map((msg, idx) => this.renderMessageRowHtml(msg, idx, bot, persona)).join('')}
          </div>

          <!-- Floating Bottom Input Bar (Fixed at bottom even when scrolling) -->
          <div class="janitor-input-floating-bar" id="janitor-input-bar">
            <textarea 
              id="janitor-chat-input"
              class="janitor-textarea"
              placeholder="Enter to send. Shift+Enter for linebreak."
              rows="1"
              onkeydown="SConnect.handleChatKeyDown(event, '${bot.id}')"
              oninput="SConnect.autoResizeInput(this)"
            ></textarea>
            
            <div class="janitor-input-controls-row">
              <div class="janitor-input-left">
                <button class="janitor-sparkle-btn" onclick="SConnect.triggerPromptEnhance('${bot.id}')" title="Suggest action / Sparkle">
                  ${ICONS.sparkle}
                </button>
                <button class="janitor-persona-capsule-btn" id="janitor-persona-capsule-btn" onclick="SConnect.openPersonaModal('${bot.id}')" title="Switch Persona">
                  <img src="${persona.avatar || DEFAULT_AVATAR}" class="janitor-persona-thumb" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';" />
                  <span class="janitor-persona-name">${this.escapeHTML(persona.name)}</span>
                  <span class="janitor-chevron">${ICONS.chevronDown}</span>
                </button>
              </div>

              <div class="janitor-input-right">
                <button id="janitor-send-btn" class="janitor-send-btn" onclick="SConnect.sendChatMessage('${bot.id}')" title="Send message (Enter)">
                  ${ICONS.send}
                </button>
              </div>
            </div>
          </div>

          <!-- Janitor Settings Sheet Modal (Screenshots 3, 4, 5) -->
          <div id="janitor-settings-modal" class="janitor-settings-sheet-modal" onclick="SConnect.handleSettingsBackdropClick(event)">
            <div class="janitor-sheet-dialog">
              <!-- Header -->
              <div class="janitor-sheet-header">
                <div class="janitor-sheet-header-left">
                  <button class="janitor-sheet-icon-btn" onclick="SConnect.closeSettingsModal()" title="Close">&times;</button>
                  <button class="janitor-sheet-icon-btn" onclick="SConnect.closeSettingsModal()" title="Minimize">&minus;</button>
                </div>
                <div class="janitor-sheet-tabs">
                  <button class="janitor-sheet-tab-btn is-active" id="tab-btn-settings" onclick="SConnect.switchSettingsTab('settings')">Settings</button>
                  <button class="janitor-sheet-tab-btn" id="tab-btn-memory" onclick="SConnect.switchSettingsTab('memory')">Memory</button>
                  <button class="janitor-sheet-tab-btn" id="tab-btn-customize" onclick="SConnect.switchSettingsTab('customize')">Customize</button>
                </div>
              </div>

              <!-- Content Area -->
              <div class="janitor-sheet-content">
                <!-- 1. SETTINGS TAB (Screenshot 3) -->
                <div class="janitor-tab-panel is-active" id="panel-settings">
                  <div class="janitor-card-group">
                    <div class="janitor-nav-row" onclick="SConnect.cycleGlobalPrompt('${bot.id}')">
                      <span class="janitor-nav-label">Global prompt</span>
                      <span class="janitor-nav-val"><span id="val-global-prompt">${settings.globalPromptPreset}</span> &gt;</span>
                    </div>
                    <div class="janitor-nav-row" onclick="SConnect.togglePrefill('${bot.id}')">
                      <span class="janitor-nav-label">Prefill</span>
                      <span class="janitor-nav-val"><span id="val-prefill">${settings.prefill ? 'On' : 'Off'}</span> &gt;</span>
                    </div>
                    <div class="janitor-nav-row" onclick="SConnect.openForbiddenWordsPrompt('${bot.id}')">
                      <span class="janitor-nav-label">Forbidden words</span>
                      <span class="janitor-nav-val"><span id="val-forbidden-words">${(settings.forbiddenWords || []).length}/10</span> &gt;</span>
                    </div>
                  </div>

                  <div class="janitor-card-group">
                    <div class="janitor-card-title-row">
                      <span class="janitor-card-heading">Generation settings</span>
                      <button class="janitor-reset-link" onclick="SConnect.resetGenerationSettings('${bot.id}')">Reset to Defaults</button>
                    </div>

                    <!-- Temperature -->
                    <div class="janitor-slider-row">
                      <div class="janitor-slider-header">
                        <span class="janitor-slider-label">Temperature</span>
                        <input type="number" id="gen-temp-num" class="janitor-num-input" min="0" max="2" step="0.05" value="${settings.temperature}" oninput="SConnect.syncInputToSlider('temp', this.value)" />
                      </div>
                      <input type="range" id="gen-temp-slider" class="janitor-purple-slider" min="0" max="2" step="0.05" value="${settings.temperature}" oninput="SConnect.syncSliderToInput('temp', this.value)" />
                      <span class="janitor-slider-sub">Controls how varied replies are. Lower is more focused; higher is more creative.</span>
                    </div>

                    <!-- Max tokens -->
                    <div class="janitor-slider-row">
                      <div class="janitor-slider-header">
                        <span class="janitor-slider-label">Max tokens</span>
                        <input type="number" id="gen-tokens-num" class="janitor-num-input" min="0" max="4096" step="16" value="${settings.max_tokens}" oninput="SConnect.syncInputToSlider('tokens', this.value)" />
                      </div>
                      <input type="range" id="gen-tokens-slider" class="janitor-purple-slider" min="0" max="4096" step="16" value="${settings.max_tokens}" oninput="SConnect.syncSliderToInput('tokens', this.value)" />
                      <span class="janitor-slider-sub">Limits how long replies can be. 0 lets the model choose the length.</span>
                    </div>

                    <!-- Context size -->
                    <div class="janitor-slider-row">
                      <div class="janitor-slider-header">
                        <span class="janitor-slider-label">Context size</span>
                        <input type="number" id="gen-context-num" class="janitor-num-input" min="2048" max="128000" step="2048" value="${settings.context_size}" oninput="SConnect.syncInputToSlider('context', this.value)" />
                      </div>
                      <input type="range" id="gen-context-slider" class="janitor-purple-slider" min="2048" max="128000" step="2048" value="${settings.context_size}" oninput="SConnect.syncSliderToInput('context', this.value)" />
                      <span class="janitor-slider-sub">Controls how much of the conversation the AI can use at once. Lower it if replies fail to generate.</span>
                    </div>
                  </div>

                  <div class="janitor-card-group">
                    <div class="janitor-card-title-row">
                      <span class="janitor-card-heading">Advanced settings</span>
                    </div>

                    <!-- Top K -->
                    <div class="janitor-slider-row">
                      <div class="janitor-slider-header">
                        <span class="janitor-slider-label">Top K</span>
                        <input type="number" id="gen-topk-num" class="janitor-num-input" min="0" max="100" step="1" value="${settings.top_k}" oninput="SConnect.syncInputToSlider('topk', this.value)" />
                      </div>
                      <input type="range" id="gen-topk-slider" class="janitor-purple-slider" min="0" max="100" step="1" value="${settings.top_k}" oninput="SConnect.syncSliderToInput('topk', this.value)" />
                    </div>

                    <!-- Top P -->
                    <div class="janitor-slider-row">
                      <div class="janitor-slider-header">
                        <span class="janitor-slider-label">Top P</span>
                        <input type="number" id="gen-topp-num" class="janitor-num-input" min="0" max="1" step="0.05" value="${settings.top_p}" oninput="SConnect.syncInputToSlider('topp', this.value)" />
                      </div>
                      <input type="range" id="gen-topp-slider" class="janitor-purple-slider" min="0" max="1" step="0.05" value="${settings.top_p}" oninput="SConnect.syncSliderToInput('topp', this.value)" />
                    </div>

                    <!-- Rep. penalty -->
                    <div class="janitor-slider-row">
                      <div class="janitor-slider-header">
                        <span class="janitor-slider-label">Rep. penalty</span>
                        <input type="number" id="gen-reppen-num" class="janitor-num-input" min="0" max="2" step="0.05" value="${settings.rep_penalty}" oninput="SConnect.syncInputToSlider('reppen', this.value)" />
                      </div>
                      <input type="range" id="gen-reppen-slider" class="janitor-purple-slider" min="0" max="2" step="0.05" value="${settings.rep_penalty}" oninput="SConnect.syncSliderToInput('reppen', this.value)" />
                    </div>

                    <!-- Freq. penalty -->
                    <div class="janitor-slider-row">
                      <div class="janitor-slider-header">
                        <span class="janitor-slider-label">Freq. penalty</span>
                        <input type="number" id="gen-freqpen-num" class="janitor-num-input" min="0" max="2" step="0.05" value="${settings.freq_penalty}" oninput="SConnect.syncInputToSlider('freqpen', this.value)" />
                      </div>
                      <input type="range" id="gen-freqpen-slider" class="janitor-purple-slider" min="0" max="2" step="0.05" value="${settings.freq_penalty}" oninput="SConnect.syncSliderToInput('freqpen', this.value)" />
                    </div>
                  </div>
                </div>

                <!-- 2. MEMORY TAB (Screenshot 4) -->
                <div class="janitor-tab-panel" id="panel-memory">
                  <div class="janitor-card-group">
                    <span class="janitor-card-heading">Summary of this chat</span>
                    <span class="janitor-card-desc">Enter a summary for your chat. This will be included into the prompt as long-term memory.</span>
                    <span class="janitor-memory-stats" id="memory-msg-stats">You have ~${history.length} messages (${Math.ceil(JSON.stringify(history).length / 3.5)} tokens) to be summarized.</span>

                    <textarea id="memory-summary-input" class="janitor-memory-input" rows="6" placeholder="Enter your chat summary here..." oninput="SConnect.updateMemoryTokenEst(this.value)">${this.escapeHTML(settings.memorySummary || '')}</textarea>

                    <div class="janitor-memory-footer-row">
                      <span class="janitor-token-est" id="memory-token-est">&asymp;${Math.ceil((settings.memorySummary || '').length / 3.5)} tokens</span>
                      <button class="janitor-copy-link" onclick="SConnect.copyMemorySummary()">Copy</button>
                    </div>

                    <button class="janitor-auto-summary-btn" id="btn-auto-summary" onclick="SConnect.triggerAutoSummary('${bot.id}')">Auto summary (as far as possible)</button>
                  </div>
                </div>

                <!-- 3. CUSTOMIZE TAB (Screenshot 5) -->
                <div class="janitor-tab-panel" id="panel-customize">
                  <div class="janitor-card-group">
                    <span class="janitor-card-heading">Options</span>

                    <div class="janitor-toggle-row">
                      <div class="janitor-toggle-text">
                        <div class="janitor-toggle-title">Enable autoscroll</div>
                        <div class="janitor-toggle-sub">When off, the chat won't follow replies as they're being generated.</div>
                      </div>
                      <label class="janitor-switch">
                        <input type="checkbox" id="toggle-autoscroll" ${settings.enableAutoscroll !== false ? 'checked' : ''} onchange="SConnect.setAutoscroll(this.checked)" />
                        <span class="janitor-slider-switch"></span>
                      </label>
                    </div>

                    <div class="janitor-toggle-row">
                      <div class="janitor-toggle-text">
                        <div class="janitor-toggle-title">Text streaming</div>
                        <div class="janitor-toggle-sub">Determines if text comes all at once or bit-by-bit. Turning this off may improve performance.</div>
                      </div>
                      <label class="janitor-switch">
                        <input type="checkbox" id="toggle-streaming" ${settings.textStreaming !== false ? 'checked' : ''} onchange="SConnect.setStreaming(this.checked)" />
                        <span class="janitor-slider-switch"></span>
                      </label>
                    </div>
                  </div>

                  <div class="janitor-card-group">
                    <span class="janitor-card-heading">Background image</span>
                    <div class="janitor-bg-preview-wrap">
                      <div class="janitor-bg-preview-img" id="janitor-bg-thumb-preview" style="background-image: url('${bgImg}');">
                        ${bgImg ? `<button class="janitor-bg-remove-btn" onclick="SConnect.clearCustomBg('${bot.id}')" title="Remove background">&times;</button>` : `<span class="janitor-bg-placeholder" onclick="SConnect.promptCustomBg('${bot.id}')">+ Set image URL</span>`}
                      </div>
                    </div>

                    <div class="janitor-slider-row">
                      <div class="janitor-slider-header">
                        <span class="janitor-slider-label">Background opacity</span>
                        <span class="janitor-slider-badge" id="badge-bg-opacity">${settings.bgOpacity}%</span>
                      </div>
                      <input type="range" id="slider-bg-opacity" class="janitor-purple-slider" min="0" max="100" value="${settings.bgOpacity}" oninput="SConnect.updateBgOpacity(this.value)" />
                    </div>

                    <div class="janitor-slider-row">
                      <div class="janitor-slider-header">
                        <span class="janitor-slider-label">Background blur</span>
                        <span class="janitor-slider-badge" id="badge-bg-blur">${settings.bgBlur}%</span>
                      </div>
                      <input type="range" id="slider-bg-blur" class="janitor-purple-slider" min="0" max="20" value="${settings.bgBlur}" oninput="SConnect.updateBgBlur(this.value)" />
                    </div>
                  </div>

                  <div class="janitor-card-group">
                    <span class="janitor-card-heading">Text settings</span>
                    <div class="janitor-text-preview-box">
                      <span class="janitor-text-preview-tag">PREVIEW</span>
                      <div class="janitor-text-preview-content">
                        This is regular text. <em>This is italic text.</em> <strong>This is bold text.</strong> <code class="rp-code">code</code> <span class="rp-dialogue">&ldquo;dialogue&rdquo;</span> <span style="color:#d946ef;">[edited]</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Sticky Footer -->
              <div class="janitor-sheet-footer">
                <button class="janitor-sheet-save-btn" onclick="SConnect.saveAllChatSettings('${bot.id}')">
                  <span class="janitor-dot">&bull;</span> Save
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      const stream = document.getElementById('janitor-chat-stream');
      if (stream && settings.enableAutoscroll !== false) {
        stream.scrollTop = stream.scrollHeight;
      }
    },

    renderMessageRowHtml(msg, idx, bot, persona) {
      const isBot = msg.role === 'assistant';
      const author = isBot ? (bot.name || 'Character') : (persona ? persona.name : 'You');
      const avatar = isBot ? (bot.avatar || DEFAULT_AVATAR) : (persona && persona.avatar ? persona.avatar : DEFAULT_AVATAR);
      const parsedBody = this.parseJanitorChatMarkdown(msg.content);

      const greetings = this.getBotGreetings(bot);
      const greetingIdx = this.getGreetingIndex(bot.id);
      const showGreetingNav = (idx === 0 && isBot && greetings.length > 1);

      return `
        <div class="janitor-msg-row ${isBot ? 'janitor-bot-row' : 'janitor-user-row'}" id="janitor-msg-${msg.id || idx}">
          <div class="janitor-avatar-col">
            <img src="${avatar}" class="janitor-msg-avatar" alt="${this.escapeHTML(author)}" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';" />
          </div>
          <div class="janitor-msg-content-col">
            <div class="janitor-msg-meta">
              <span class="janitor-msg-author">${this.escapeHTML(author)}</span>
              ${isBot ? `<span class="janitor-sound-icon" title="Voice / Audio">${ICONS.volume}</span>` : ''}
            </div>
            <div class="janitor-msg-body" id="body-${msg.id || idx}">
              ${parsedBody}
            </div>

            <!-- Greeting Switcher for First Bot Message (Screenshot 2) -->
            ${showGreetingNav ? `
              <div class="janitor-greeting-switcher" id="janitor-greeting-switcher-${bot.id}">
                <button class="janitor-greeting-nav-btn ${greetingIdx === 0 ? 'is-disabled' : ''}" onclick="SConnect.shiftGreeting('${bot.id}', -1)" title="Previous Greeting">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <span class="janitor-greeting-counter" id="greeting-counter-${bot.id}">${greetingIdx + 1} / ${greetings.length}</span>
                <button class="janitor-greeting-nav-btn ${greetingIdx >= greetings.length - 1 ? 'is-disabled' : ''}" onclick="SConnect.shiftGreeting('${bot.id}', 1)" title="Next Greeting">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              </div>
            ` : ''}

            <div class="janitor-msg-actions">
              <button class="janitor-msg-action-btn" onclick="SConnect.copyMessageText('${msg.id || idx}')" title="Copy text">
                ${ICONS.copy} <span>Copy</span>
              </button>
              <button class="janitor-msg-action-btn" onclick="SConnect.editMessagePrompt('${bot.id}', '${msg.id || idx}')" title="Edit message">
                ${ICONS.edit} <span>Edit</span>
              </button>
              <button class="janitor-msg-action-btn" onclick="SConnect.deleteMessage('${bot.id}', '${msg.id || idx}')" title="Delete message">
                ${ICONS.trash} <span>Delete</span>
              </button>
              ${isBot && idx > 0 ? `
                <button class="janitor-msg-action-btn" onclick="SConnect.regenerateResponse('${bot.id}')" title="Regenerate">
                  ${ICONS.refresh} <span>Retry</span>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    },

    async sendChatMessage(botId) {
      const inputEl = document.getElementById('janitor-chat-input');
      if (!inputEl) return;
      const text = inputEl.value.trim();
      if (!text) return;

      const bot = this.botCache.get(botId) || this.activeBot;
      if (!bot) return;

      const persona = this.getActivePersona();
      const session = this.getActiveChatSession(botId, true, bot);
      let history = this.getChatMessages(session.id);
      const settings = this.getChatSettings(session.id);

      // Add user message
      const userMsg = {
        id: 'msg_' + Date.now(),
        role: 'user',
        author: persona.name,
        avatar: persona.avatar || DEFAULT_AVATAR,
        content: text,
        timestamp: Date.now()
      };
      history.push(userMsg);
      this.saveChatMessages(session.id, history);
      session.updatedAt = Date.now();
      session.messageCount = history.length;
      if (!session.summary || session.summary === 'no summary :(') {
        session.summary = text.length > 80 ? (text.slice(0, 80) + '...') : text;
      }
      this.updateChatSessionMeta(session);

      // Clear input and reset height
      inputEl.value = '';
      inputEl.style.height = 'auto';

      const streamEl = document.getElementById('janitor-chat-stream');
      if (streamEl) {
        streamEl.insertAdjacentHTML('beforeend', this.renderMessageRowHtml(userMsg, history.length - 1, bot, persona));
        if (settings.enableAutoscroll !== false) {
          streamEl.scrollTop = streamEl.scrollHeight;
        }
      }

      // Add assistant placeholder
      const botMsgId = 'msg_' + (Date.now() + 1);
      const botPlaceholder = {
        id: botMsgId,
        role: 'assistant',
        author: bot.name,
        avatar: bot.avatar || DEFAULT_AVATAR,
        content: '',
        timestamp: Date.now()
      };

      if (streamEl) {
        const placeholderHtml = `
          <div class="janitor-msg-row janitor-bot-row is-streaming" id="janitor-msg-${botMsgId}">
            <div class="janitor-avatar-col">
              <img src="${bot.avatar || DEFAULT_AVATAR}" class="janitor-msg-avatar" alt="${this.escapeHTML(bot.name)}" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';" />
            </div>
            <div class="janitor-msg-content-col">
              <div class="janitor-msg-meta">
                <span class="janitor-msg-author">${this.escapeHTML(bot.name)}</span>
                <span class="janitor-sound-icon" title="Voice / Audio">${ICONS.volume}</span>
              </div>
              <div class="janitor-msg-body" id="body-${botMsgId}">
                <span class="janitor-typing-cursor"></span>
              </div>
            </div>
          </div>
        `;
        streamEl.insertAdjacentHTML('beforeend', placeholderHtml);
        if (settings.enableAutoscroll !== false) {
          streamEl.scrollTop = streamEl.scrollHeight;
        }
      }

      // 1. Build System Directives with Global Prompt Preset
      let systemPrompt = `[Roleplay Instruction: You are roleplaying as ${bot.name}. Stay strictly in-character. Depict ${bot.name}'s actions, thoughts, and spoken dialogue using rich, vivid 3rd-person descriptive prose. Put spoken dialogue inside quotation marks ("..."). Put actions, thoughts, and narration inside asterisks (*...*). Never speak, decide, or act on behalf of {{user}}. Maintain scene continuity.]`;

      if (settings.globalPromptPreset === 'Ultimate') {
        systemPrompt = `[System Directive - Ultimate RP Protocol: Write in a rich, literary multi-paragraph prose style for an immersive roleplay experience. Describe sensory details, ambient environment, emotional subtleties, body language, facial micro-expressions, pacing, and authentic spoken dialogue. Stay strictly in character as {{char}}. Use quotes ("...") for speech, italics (*...*) for narration and actions. Avoid repetitive phrases, maintain high narrative momentum, and never impersonate, decide for, or speak as {{user}}.]\n\n` + systemPrompt;
      }

      // 2. Inject Memory Summary if present
      if (settings.memorySummary && settings.memorySummary.trim()) {
        systemPrompt += `\n\n<chat_summary>\n${settings.memorySummary.trim()}\n</chat_summary>`;
      }

      // 3. Inject Forbidden Words Constraint if configured
      if (Array.isArray(settings.forbiddenWords) && settings.forbiddenWords.length > 0) {
        systemPrompt += `\n\n[Negative Constraint: Avoid using or mentioning any of the following forbidden words or phrases: ${settings.forbiddenWords.join(', ')}]`;
      }

      // 4. Character & User Definition Cards
      systemPrompt += `\n\n<character_definition>\nName: ${bot.name}\nDescription: ${bot.description || ''}\nPersonality: ${bot.personality || ''}\nScenario: ${bot.scenario || ''}\n</character_definition>\n\n<user_persona>\nName: ${persona.name}\nDetails: ${persona.description || ''}\n</user_persona>`;

      const formattedMsgs = [
        { role: 'system', content: this.replaceMacros(systemPrompt, bot.name, persona.name) }
      ];

      // 5. Context Size Window Management
      const maxContextTokens = Number(settings.context_size) || 128000;
      const estimateTokens = (text) => Math.ceil((text || '').length / 3.5);
      let totalTokens = estimateTokens(systemPrompt);

      const greetingTurn = history[0];
      const subsequentTurns = history.slice(1);
      if (greetingTurn) totalTokens += estimateTokens(greetingTurn.content);

      const keptTurns = [];
      for (let i = subsequentTurns.length - 1; i >= 0; i--) {
        const tTokens = estimateTokens(subsequentTurns[i].content);
        if (totalTokens + tTokens < maxContextTokens) {
          totalTokens += tTokens;
          keptTurns.unshift(subsequentTurns[i]);
        } else {
          break;
        }
      }

      if (greetingTurn) {
        formattedMsgs.push({
          role: greetingTurn.role === 'assistant' ? 'assistant' : 'user',
          content: greetingTurn.content
        });
      }
      keptTurns.forEach(m => {
        formattedMsgs.push({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        });
      });

      // 6. Optional Prefill
      if (settings.prefill && settings.prefill !== 'Off' && settings.prefill.trim()) {
        formattedMsgs.push({ role: 'assistant', content: settings.prefill.trim() });
      }

      const activeModel = localStorage.getItem('s_connect_chat_model') || 'gpt-4o-mini';
      const bodyEl = document.getElementById(`body-${botMsgId}`);

      // 7. Request Payload with Working Generation Parameters
      const payload = {
        model: activeModel,
        messages: formattedMsgs,
        temperature: Number(settings.temperature)
      };

      if (Number(settings.max_tokens) > 0) {
        payload.max_tokens = Number(settings.max_tokens);
      }
      if (Number(settings.top_p) > 0) {
        payload.top_p = Number(settings.top_p);
      }
      if (Number(settings.freq_penalty) > 0) {
        payload.frequency_penalty = Number(settings.freq_penalty);
      }
      if (Number(settings.rep_penalty) > 0) {
        payload.presence_penalty = Number(settings.rep_penalty);
      }

      const isStreaming = settings.textStreaming !== false;
      payload.stream = isStreaming;

      let accumulated = '';

      try {
        const response = await fetch('/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText}`);
        }

        if (isStreaming) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let done = false;
          let buffer = '';

          while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) {
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop();

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data:')) continue;
                const jsonStr = trimmed.slice(5).trim();
                if (jsonStr === '[DONE]') break;
                try {
                  const parsed = JSON.parse(jsonStr);
                  const delta = parsed.choices?.[0]?.delta?.content || '';
                  if (delta) {
                    accumulated += delta;
                    if (bodyEl) {
                      bodyEl.innerHTML = this.parseJanitorChatMarkdown(accumulated) + '<span class="janitor-typing-cursor"></span>';
                      if (settings.enableAutoscroll !== false && streamEl) {
                        streamEl.scrollTop = streamEl.scrollHeight;
                      }
                    }
                  }
                } catch (e) {}
              }
            }
          }
        } else {
          const jsonRes = await response.json();
          accumulated = jsonRes.choices?.[0]?.message?.content || '';
        }

        if (bodyEl) {
          bodyEl.innerHTML = this.parseJanitorChatMarkdown(accumulated || '...');
        }
        const rowEl = document.getElementById(`janitor-msg-${botMsgId}`);
        if (rowEl) {
          rowEl.classList.remove('is-streaming');
          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'janitor-msg-actions';
          actionsDiv.innerHTML = `
            <button class="janitor-msg-action-btn" onclick="SConnect.copyMessageText('${botMsgId}')" title="Copy text">
              ${ICONS.copy} <span>Copy</span>
            </button>
            <button class="janitor-msg-action-btn" onclick="SConnect.editMessagePrompt('${bot.id}', '${botMsgId}')" title="Edit message">
              ${ICONS.edit} <span>Edit</span>
            </button>
            <button class="janitor-msg-action-btn" onclick="SConnect.deleteMessage('${bot.id}', '${botMsgId}')" title="Delete message">
              ${ICONS.trash} <span>Delete</span>
            </button>
            <button class="janitor-msg-action-btn" onclick="SConnect.regenerateResponse('${bot.id}')" title="Regenerate">
              ${ICONS.refresh} <span>Retry</span>
            </button>
          `;
          rowEl.querySelector('.janitor-msg-content-col')?.appendChild(actionsDiv);
        }

        botPlaceholder.content = accumulated;
        history.push(botPlaceholder);
        this.saveChatMessages(session.id, history);
        session.updatedAt = Date.now();
        session.messageCount = history.length;
        this.updateChatSessionMeta(session);

      } catch (err) {
        console.error('Chat completion failed:', err);
        if (bodyEl) {
          bodyEl.innerHTML = `
            <div class="janitor-stream-error">
              <span>Failed to generate response: ${this.escapeHTML(err.message)}</span>
              <button class="janitor-retry-btn" onclick="SConnect.regenerateResponse('${bot.id}')">Retry</button>
            </div>
          `;
        }
      }
    },

    handleChatKeyDown(event, botId) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.sendChatMessage(botId);
      }
    },

    autoResizeInput(el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 180) + 'px';
    },

    openPersonaModal(botId) {
      const personas = this.getPersonas();
      const active = this.getActivePersona();

      const modalHtml = `
        <div id="janitor-persona-modal" class="janitor-modal-backdrop" onclick="if(event.target===this)SConnect.closePersonaModal()">
          <div class="janitor-persona-card-modal">
            <div class="janitor-modal-header">
              <h3 class="janitor-modal-title">Select or Create Persona</h3>
              <button class="janitor-modal-close" onclick="SConnect.closePersonaModal()">&times;</button>
            </div>
            <div class="janitor-personas-list">
              ${personas.map(p => `
                <div class="janitor-persona-item ${p.id === active.id ? 'is-active' : ''}" onclick="SConnect.choosePersona('${p.id}', '${botId}')">
                  <img src="${p.avatar || DEFAULT_AVATAR}" class="janitor-persona-item-avatar" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';" />
                  <div class="janitor-persona-item-info">
                    <div class="janitor-persona-item-name">${this.escapeHTML(p.name)}</div>
                    <div class="janitor-persona-item-desc">${this.escapeHTML(p.description || 'No description provided.')}</div>
                  </div>
                  ${p.id === active.id ? `<span class="janitor-persona-check">${ICONS.check}</span>` : ''}
                </div>
              `).join('')}
            </div>

            <div class="janitor-persona-new-box">
              <div class="janitor-persona-new-title">+ Create New Persona</div>
              <input type="text" id="new-persona-name" class="drawer-input" placeholder="Persona Name (e.g. Ayame)" style="margin-bottom:8px;" />
              <input type="text" id="new-persona-avatar" class="drawer-input" placeholder="Avatar URL (optional)" style="margin-bottom:8px;" />
              <textarea id="new-persona-desc" class="drawer-textarea" placeholder="Persona Details / Background (used for {{user}} context in prompts)" rows="2" style="margin-bottom:10px;"></textarea>
              <button class="search-submit-btn" style="width:100%;" onclick="SConnect.saveNewPersona('${botId}')">Save Persona</button>
            </div>
          </div>
        </div>
      `;

      const existing = document.getElementById('janitor-persona-modal');
      if (existing) existing.remove();

      document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    closePersonaModal() {
      const el = document.getElementById('janitor-persona-modal');
      if (el) el.remove();
    },

    choosePersona(personaId, botId) {
      this.setActivePersona(personaId);
      this.closePersonaModal();
      if (botId) {
        const container = document.getElementById('connect-main-view');
        if (container) this.renderChatView(container, botId);
      }
    },

    saveNewPersona(botId) {
      const name = (document.getElementById('new-persona-name')?.value || '').trim();
      const avatar = (document.getElementById('new-persona-avatar')?.value || '').trim() || DEFAULT_AVATAR;
      const desc = (document.getElementById('new-persona-desc')?.value || '').trim();

      if (!name) {
        alert('Please enter a Persona name.');
        return;
      }

      const personas = this.getPersonas();
      const newP = {
        id: 'persona_' + Date.now(),
        name,
        avatar,
        description: desc
      };
      personas.push(newP);
      localStorage.setItem('s_connect_personas', JSON.stringify(personas));
      window.dispatchEvent(new CustomEvent('singularity-chat-updated'));
      window.dispatchEvent(new CustomEvent('singularity-cloud-sync-needed'));
      this.choosePersona(newP.id, botId);
    },

    // -------------------------------------------------------------------------
    // GREETINGS & SETTINGS STATE MANAGEMENT (Screenshots 2, 3, 4, 5)
    // -------------------------------------------------------------------------
    getBotGreetings(bot) {
      if (!bot) return [];
      const list = [];
      const primary = (bot.first_message || bot.first_mes || bot.firstMessage || '').trim();
      if (primary) list.push(primary);

      if (Array.isArray(bot.alternate_greetings)) {
        bot.alternate_greetings.forEach(g => {
          const s = (typeof g === 'string' ? g : (g.text || g.content || '')).trim();
          if (s && !list.includes(s)) list.push(s);
        });
      }

      if (Array.isArray(bot.greetings)) {
        bot.greetings.forEach(g => {
          const s = (typeof g === 'string' ? g : (g.text || g.content || '')).trim();
          if (s && !list.includes(s)) list.push(s);
        });
      }

      if (bot.definition && Array.isArray(bot.definition.alternate_greetings)) {
        bot.definition.alternate_greetings.forEach(g => {
          const s = (typeof g === 'string' ? g : (g.text || g.content || '')).trim();
          if (s && !list.includes(s)) list.push(s);
        });
      }

      if (list.length === 0) {
        list.push(`*${bot.name} stands before you.* "Hey."`);
      }
      return list;
    },

    getGreetingIndex(botId) {
      const session = this.getActiveChatSession(botId, false);
      if (session && typeof session.greetingIdx === 'number') {
        return session.greetingIdx;
      }
      const saved = localStorage.getItem(`s_connect_greeting_idx_${botId}`);
      return saved !== null ? (parseInt(saved, 10) || 0) : 0;
    },

    shiftGreeting(botId, delta) {
      const bot = this.botCache.get(botId) || this.activeBot;
      if (!bot) return;
      const greetings = this.getBotGreetings(bot);
      if (greetings.length <= 1) return;

      const session = this.getActiveChatSession(botId, true, bot);
      let cur = (session && typeof session.greetingIdx === 'number') ? session.greetingIdx : this.getGreetingIndex(botId);
      let next = cur + delta;
      if (next < 0) next = 0;
      if (next >= greetings.length) next = greetings.length - 1;

      if (next === cur) return;
      if (session) {
        session.greetingIdx = next;
        this.updateChatSessionMeta(session);
      }
      localStorage.setItem(`s_connect_greeting_idx_${botId}`, next);

      const persona = this.getActivePersona();
      const formatted = this.replaceMacros(greetings[next], bot.name, persona.name);

      let history = this.getChatHistory(botId);
      if (history && history.length > 0 && history[0].role === 'assistant') {
        history[0].content = formatted;
        this.saveChatHistory(botId, history);

        const bodyEl = document.getElementById(`body-${history[0].id || 0}`);
        if (bodyEl) {
          bodyEl.innerHTML = this.parseJanitorChatMarkdown(formatted);
        }
      }

      const counterEl = document.getElementById(`greeting-counter-${botId}`);
      if (counterEl) counterEl.textContent = `${next + 1} / ${greetings.length}`;

      const switcherEl = document.getElementById(`janitor-greeting-switcher-${botId}`);
      if (switcherEl) {
        const btns = switcherEl.querySelectorAll('.janitor-greeting-nav-btn');
        if (btns[0]) btns[0].classList.toggle('is-disabled', next === 0);
        if (btns[1]) btns[1].classList.toggle('is-disabled', next >= greetings.length - 1);
      }
    },

    getBotDefaultSettings(botId) {
      const defaults = {
        globalPromptPreset: 'Ultimate',
        prefill: '',
        forbiddenWords: [],
        temperature: 1.0,
        max_tokens: 0,
        context_size: 128000,
        top_k: 0,
        top_p: 0,
        rep_penalty: 0,
        freq_penalty: 0,
        memorySummary: '',
        enableAutoscroll: true,
        textStreaming: true,
        bgOpacity: 100,
        bgBlur: 0,
        customBg: ''
      };
      const saved = localStorage.getItem(`s_connect_settings_${botId}`);
      if (!saved) return defaults;
      try {
        return { ...defaults, ...JSON.parse(saved) };
      } catch (e) {
        return defaults;
      }
    },

    getChatSettings(targetId) {
      const defaults = {
        globalPromptPreset: 'Ultimate',
        prefill: '',
        forbiddenWords: [],
        temperature: 1.0,
        max_tokens: 0,
        context_size: 128000,
        top_k: 0,
        top_p: 0,
        rep_penalty: 0,
        freq_penalty: 0,
        memorySummary: '',
        enableAutoscroll: true,
        textStreaming: true,
        bgOpacity: 100,
        bgBlur: 0,
        customBg: ''
      };

      if (!targetId) return defaults;

      // 1. Direct key match (e.g., specific session ID)
      const saved = localStorage.getItem(`s_connect_settings_${targetId}`);
      if (saved) {
        try {
          return { ...defaults, ...JSON.parse(saved) };
        } catch (e) {}
      }

      // 2. If targetId is a botId or session, resolve through active session
      const session = targetId.startsWith('chat_') 
        ? this.getAllChatSessions().find(s => s.id === targetId)
        : this.getActiveChatSession(targetId, false);

      if (session) {
        const sessionSaved = localStorage.getItem(`s_connect_settings_${session.id}`);
        if (sessionSaved) {
          try {
            return { ...defaults, ...JSON.parse(sessionSaved) };
          } catch (e) {}
        }
        const botDef = this.getBotDefaultSettings(session.botId);
        if (session.summary && session.summary !== 'no summary :(') {
          botDef.memorySummary = session.summary;
        } else {
          botDef.memorySummary = '';
        }
        return botDef;
      }

      return defaults;
    },

    saveChatSettings(targetId, settings) {
      localStorage.setItem(`s_connect_settings_${targetId}`, JSON.stringify(settings));

      let session = null;
      if (targetId && targetId.startsWith('chat_')) {
        session = this.getAllChatSessions().find(s => s.id === targetId);
      } else if (targetId) {
        session = this.getActiveChatSession(targetId, false);
        if (session) {
          localStorage.setItem(`s_connect_settings_${session.id}`, JSON.stringify(settings));
        }
      }

      if (session) {
        session.summary = settings.memorySummary && settings.memorySummary.trim() ? settings.memorySummary.trim() : 'no summary :(';
        this.updateChatSessionMeta(session);
      }
    },

    openChatSettingsModal(botId) {
      const modal = document.getElementById('janitor-settings-modal');
      if (modal) modal.classList.add('is-open');
    },

    closeSettingsModal() {
      const modal = document.getElementById('janitor-settings-modal');
      if (modal) modal.classList.remove('is-open');
    },

    handleSettingsBackdropClick(e) {
      if (e.target && e.target.id === 'janitor-settings-modal') {
        this.closeSettingsModal();
      }
    },

    switchSettingsTab(tabName) {
      document.querySelectorAll('.janitor-sheet-tab-btn').forEach(btn => btn.classList.remove('is-active'));
      document.querySelectorAll('.janitor-tab-panel').forEach(panel => panel.classList.remove('is-active'));

      const activeBtn = document.getElementById(`tab-btn-${tabName}`);
      const activePanel = document.getElementById(`panel-${tabName}`);
      if (activeBtn) activeBtn.classList.add('is-active');
      if (activePanel) activePanel.classList.add('is-active');
    },

    cycleGlobalPrompt(botId) {
      const settings = this.getChatSettings(botId);
      const presets = ['Ultimate', 'Standard RP', 'Creative', 'Custom'];
      let idx = presets.indexOf(settings.globalPromptPreset);
      idx = (idx + 1) % presets.length;
      settings.globalPromptPreset = presets[idx];
      this.saveChatSettings(botId, settings);

      const el = document.getElementById('val-global-prompt');
      if (el) el.textContent = settings.globalPromptPreset;
    },

    togglePrefill(botId) {
      const settings = this.getChatSettings(botId);
      const cur = settings.prefill || '';
      const promptVal = prompt('Enter assistant prefill prefix (leave blank for Off):', cur);
      if (promptVal !== null) {
        settings.prefill = promptVal.trim();
        this.saveChatSettings(botId, settings);
        const el = document.getElementById('val-prefill');
        if (el) el.textContent = settings.prefill ? 'On' : 'Off';
      }
    },

    openForbiddenWordsPrompt(botId) {
      const settings = this.getChatSettings(botId);
      const existing = (settings.forbiddenWords || []).join(', ');
      const val = prompt('Enter forbidden words separated by commas (max 10 words):', existing);
      if (val !== null) {
        const words = val.split(',').map(w => w.trim()).filter(Boolean).slice(0, 10);
        settings.forbiddenWords = words;
        this.saveChatSettings(botId, settings);
        const el = document.getElementById('val-forbidden-words');
        if (el) el.textContent = `${words.length}/10`;
      }
    },

    syncInputToSlider(param, val) {
      const slider = document.getElementById(`gen-${param}-slider`);
      if (slider) slider.value = val;
    },

    syncSliderToInput(param, val) {
      const num = document.getElementById(`gen-${param}-num`);
      if (num) num.value = val;
    },

    resetGenerationSettings(botId) {
      const settings = this.getChatSettings(botId);
      settings.temperature = 1.0;
      settings.max_tokens = 0;
      settings.context_size = 128000;
      settings.top_k = 0;
      settings.top_p = 0;
      settings.rep_penalty = 0;
      settings.freq_penalty = 0;
      this.saveChatSettings(botId, settings);

      this.syncSliderToInput('temp', 1.0);
      this.syncInputToSlider('temp', 1.0);
      this.syncSliderToInput('tokens', 0);
      this.syncInputToSlider('tokens', 0);
      this.syncSliderToInput('context', 128000);
      this.syncInputToSlider('context', 128000);
      this.syncSliderToInput('topk', 0);
      this.syncInputToSlider('topk', 0);
      this.syncSliderToInput('topp', 0);
      this.syncInputToSlider('topp', 0);
      this.syncSliderToInput('reppen', 0);
      this.syncInputToSlider('reppen', 0);
      this.syncSliderToInput('freqpen', 0);
      this.syncInputToSlider('freqpen', 0);
    },

    updateMemoryTokenEst(text) {
      const est = Math.ceil((text || '').length / 3.5);
      const el = document.getElementById('memory-token-est');
      if (el) el.innerHTML = `&asymp;${est} tokens`;
    },

    copyMemorySummary() {
      const el = document.getElementById('memory-summary-input');
      if (!el || !el.value.trim()) return;
      navigator.clipboard.writeText(el.value.trim()).then(() => {
        alert('Chat summary copied to clipboard!');
      });
    },

    async triggerAutoSummary(botId) {
      const bot = this.botCache.get(botId) || this.activeBot;
      const persona = this.getActivePersona();
      const history = this.getChatHistory(botId);
      if (!history || history.length < 2) {
        alert('Need at least 2 messages in conversation history to generate a memory summary.');
        return;
      }

      const btn = document.getElementById('btn-auto-summary');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Generating summary...';
      }

      try {
        const convoSnippet = history.slice(0, 30).map(m => `${m.role === 'assistant' ? (bot ? bot.name : 'Bot') : persona.name}: ${m.content}`).join('\n\n');
        const res = await fetch('/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: localStorage.getItem('s_connect_chat_model') || 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an expert RPG narrative summarizer. Summarize the roleplay conversation between {{char}} and {{user}} into a concise, high-density 2-paragraph long-term memory recap focusing on key plot developments, emotional shifts, relationships, and agreed facts.' },
              { role: 'user', content: `Summarize the following chat history:\n\n${convoSnippet}` }
            ],
            temperature: 0.5,
            max_tokens: 400,
            stream: false
          })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const summaryText = data.choices?.[0]?.message?.content || '';

        const textarea = document.getElementById('memory-summary-input');
        if (textarea && summaryText) {
          textarea.value = summaryText;
          this.updateMemoryTokenEst(summaryText);
        }
      } catch (e) {
        alert('Failed to generate summary: ' + e.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Auto summary (as far as possible)';
        }
      }
    },

    setAutoscroll(enabled) {
      const settings = this.getChatSettings(this.activeBot ? this.activeBot.id : 'default');
      settings.enableAutoscroll = enabled;
      this.saveChatSettings(this.activeBot ? this.activeBot.id : 'default', settings);
    },

    setStreaming(enabled) {
      const settings = this.getChatSettings(this.activeBot ? this.activeBot.id : 'default');
      settings.textStreaming = enabled;
      this.saveChatSettings(this.activeBot ? this.activeBot.id : 'default', settings);
    },

    updateBgOpacity(val) {
      const badge = document.getElementById('badge-bg-opacity');
      if (badge) badge.textContent = `${val}%`;
      const bgLayer = document.getElementById('janitor-chat-bg-layer');
      if (bgLayer) bgLayer.style.opacity = Number(val) / 100;
    },

    updateBgBlur(val) {
      const badge = document.getElementById('badge-bg-blur');
      if (badge) badge.textContent = `${val}%`;
      const bgLayer = document.getElementById('janitor-chat-bg-layer');
      if (bgLayer) bgLayer.style.filter = `blur(${val}px)`;
    },

    clearCustomBg(botId) {
      const settings = this.getChatSettings(botId);
      settings.customBg = '';
      this.saveChatSettings(botId, settings);

      const previewThumb = document.getElementById('janitor-bg-thumb-preview');
      if (previewThumb) {
        previewThumb.style.backgroundImage = 'none';
        previewThumb.innerHTML = `<span class="janitor-bg-placeholder" onclick="SConnect.promptCustomBg('${botId}')">+ Set image URL</span>`;
      }
      const bgLayer = document.getElementById('janitor-chat-bg-layer');
      if (bgLayer) bgLayer.style.backgroundImage = 'none';
    },

    promptCustomBg(botId) {
      const url = prompt('Enter custom background image URL:');
      if (url && url.trim()) {
        const settings = this.getChatSettings(botId);
        settings.customBg = url.trim();
        this.saveChatSettings(botId, settings);

        const previewThumb = document.getElementById('janitor-bg-thumb-preview');
        if (previewThumb) {
          previewThumb.style.backgroundImage = `url('${url.trim()}')`;
          previewThumb.innerHTML = `<button class="janitor-bg-remove-btn" onclick="SConnect.clearCustomBg('${botId}')" title="Remove background">&times;</button>`;
        }
        const bgLayer = document.getElementById('janitor-chat-bg-layer');
        if (bgLayer) bgLayer.style.backgroundImage = `url('${url.trim()}')`;
      }
    },

    saveAllChatSettings(botId) {
      const settings = this.getChatSettings(botId);

      const tempNum = document.getElementById('gen-temp-num');
      if (tempNum) settings.temperature = parseFloat(tempNum.value) || 1.0;

      const tokensNum = document.getElementById('gen-tokens-num');
      if (tokensNum) settings.max_tokens = parseInt(tokensNum.value, 10) || 0;

      const contextNum = document.getElementById('gen-context-num');
      if (contextNum) settings.context_size = parseInt(contextNum.value, 10) || 128000;

      const topkNum = document.getElementById('gen-topk-num');
      if (topkNum) settings.top_k = parseInt(topkNum.value, 10) || 0;

      const toppNum = document.getElementById('gen-topp-num');
      if (toppNum) settings.top_p = parseFloat(toppNum.value) || 0;

      const reppenNum = document.getElementById('gen-reppen-num');
      if (reppenNum) settings.rep_penalty = parseFloat(reppenNum.value) || 0;

      const freqpenNum = document.getElementById('gen-freqpen-num');
      if (freqpenNum) settings.freq_penalty = parseFloat(freqpenNum.value) || 0;

      const summaryInput = document.getElementById('memory-summary-input');
      if (summaryInput) settings.memorySummary = summaryInput.value.trim();

      const autoscrollCheck = document.getElementById('toggle-autoscroll');
      if (autoscrollCheck) settings.enableAutoscroll = autoscrollCheck.checked;

      const streamingCheck = document.getElementById('toggle-streaming');
      if (streamingCheck) settings.textStreaming = streamingCheck.checked;

      const opacitySlider = document.getElementById('slider-bg-opacity');
      if (opacitySlider) settings.bgOpacity = parseInt(opacitySlider.value, 10) || 100;

      const blurSlider = document.getElementById('slider-bg-blur');
      if (blurSlider) settings.bgBlur = parseInt(blurSlider.value, 10) || 0;

      this.saveChatSettings(botId, settings);

      const bgLayer = document.getElementById('janitor-chat-bg-layer');
      if (bgLayer) {
        bgLayer.style.opacity = settings.bgOpacity / 100;
        bgLayer.style.filter = `blur(${settings.bgBlur}px)`;
      }

      this.closeSettingsModal();
    },

    toggleChatDrawer(botId) {
      this.openChatSettingsModal(botId || (this.activeBot ? this.activeBot.id : ''));
    },

    clearChatSession(botId) {
      if (!confirm('Are you sure you want to reset this chat session?')) return;
      localStorage.removeItem(`s_connect_chat_${botId}`);
      this.toggleChatDrawer();
      const container = document.getElementById('connect-main-view');
      if (container) this.renderChatView(container, botId);
    },

    exportChatSession(botId) {
      const history = this.getChatHistory(botId);
      const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `janitor_chat_${botId}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },

    copyMessageText(msgId) {
      const bodyEl = document.getElementById(`body-${msgId}`);
      if (!bodyEl) return;
      const text = bodyEl.innerText || bodyEl.textContent || '';
      navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
      });
    },

    deleteMessage(botId, msgId) {
      let history = this.getChatHistory(botId);
      history = history.filter(m => m.id !== msgId);
      this.saveChatHistory(botId, history);
      const row = document.getElementById(`janitor-msg-${msgId}`);
      if (row) row.remove();
    },

    editMessagePrompt(botId, msgId) {
      let history = this.getChatHistory(botId);
      const msg = history.find(m => m.id === msgId);
      if (!msg) return;
      const updated = prompt('Edit message content:', msg.content);
      if (updated !== null && updated.trim()) {
        msg.content = updated.trim();
        this.saveChatHistory(botId, history);
        const bodyEl = document.getElementById(`body-${msgId}`);
        if (bodyEl) bodyEl.innerHTML = this.parseJanitorChatMarkdown(msg.content);
      }
    },

    regenerateResponse(botId) {
      let history = this.getChatHistory(botId);
      if (history.length < 2) return;
      // Remove last assistant message
      if (history[history.length - 1].role === 'assistant') {
        const last = history.pop();
        const row = document.getElementById(`janitor-msg-${last.id}`);
        if (row) row.remove();
        this.saveChatHistory(botId, history);
      }
      // Re-trigger sending with last user message
      const lastUser = history[history.length - 1];
      if (lastUser && lastUser.role === 'user') {
        history.pop();
        const rowUser = document.getElementById(`janitor-msg-${lastUser.id}`);
        if (rowUser) rowUser.remove();
        this.saveChatHistory(botId, history);

        const inputEl = document.getElementById('janitor-chat-input');
        if (inputEl) {
          inputEl.value = lastUser.content;
          this.sendChatMessage(botId);
        }
      }
    },

    triggerPromptEnhance(botId) {
      const inputEl = document.getElementById('janitor-chat-input');
      if (!inputEl) return;
      const cur = inputEl.value.trim();
      const suggestions = [
        '*glances over quietly, observing their expression*',
        '*hesitates for a moment before speaking*',
        '*crosses arms and leans against the counter*',
        '*takes a slow breath, trying to steady their pulse*',
        '*smiles faintly, stepping closer*'
      ];
      if (!cur) {
        inputEl.value = suggestions[Math.floor(Math.random() * suggestions.length)] + ' ';
      } else {
        inputEl.value = `${cur}\n*looks up softly*`;
      }
      this.autoResizeInput(inputEl);
      inputEl.focus();
    },

    openProxySettings() {
      this.toggleChatDrawer();
    },

    async triggerUnmask(botId) {
      const btn = document.getElementById('detail-unmask-btn');
      if (btn) btn.innerHTML = `<span>Unmasking...</span>`;

      try {
        const res = await fetch(`/api/connect/bot/${botId}/unmask`, { method: 'POST' }).then(r => r.json());
        if (res.is_unmasked) {
          const fresh = await fetch(`/api/connect/bot/${botId}`).then(r => r.json());
          this.activeBot = fresh.data || fresh;
          this.cacheBot(this.activeBot);
          const panel = document.getElementById('detail-tab-panel');
          if (panel) panel.innerHTML = this.renderDetailTabContent();
          if (btn) btn.innerHTML = `${ICONS.unlock} <span>Unmasked</span>`;
          return;
        }

        // Poll cloud worker up to 15 times
        let polls = 0;
        const pollInterval = setInterval(async () => {
          polls++;
          try {
            const st = await fetch(`/api/connect/bot/${botId}/unmask_status`).then(r => r.json());
            if (st.is_unmasked) {
              clearInterval(pollInterval);
              const fresh = await fetch(`/api/connect/bot/${botId}`).then(r => r.json());
              this.activeBot = fresh.data || fresh;
              this.cacheBot(this.activeBot);
              const panel = document.getElementById('detail-tab-panel');
              if (panel) panel.innerHTML = this.renderDetailTabContent();
              if (btn) btn.innerHTML = `${ICONS.unlock} <span>Unmasked</span>`;
            } else if (polls >= 15) {
              clearInterval(pollInterval);
              if (btn) btn.innerHTML = `${ICONS.lock} <span>Unmask</span>`;
            }
          } catch (err) {
            clearInterval(pollInterval);
            if (btn) btn.innerHTML = `${ICONS.lock} <span>Unmask</span>`;
          }
        }, 1200);
      } catch (e) {
        if (btn) btn.innerHTML = `${ICONS.lock} <span>Unmask</span>`;
      }
    },

    copyText(btn, text) {
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        const origHTML = btn.innerHTML;
        btn.innerHTML = `${ICONS.check} <span>Copied!</span>`;
        setTimeout(() => {
          btn.innerHTML = origHTML;
        }, 1800);
      });
    },

    // -------------------------------------------------------------------------
    // OMNI-SEARCH INPUT & AUTOCOMPLETE SUGGESTIONS
    // -------------------------------------------------------------------------
    handleSearchInput(val) {
      clearTimeout(this.searchDebounce);
      const v = String(val || '').trim();
      const dd = document.getElementById('hero-suggestions');
      if (!dd) return;

      if (!v) {
        this.renderDefaultSuggestions(dd);
        return;
      }

      this.searchDebounce = setTimeout(async () => {
        try {
          const res = await fetch(`/api/connect/search?q=${encodeURIComponent(v)}&limit=6`).then(r => r.json());
          const bots = (res.data && res.data.bots) || res.bots || res.items || [];
          const creators = (res.data && res.data.creators) || res.creators || [];

          if (bots.length === 0 && creators.length === 0) {
            dd.innerHTML = `<div style="padding:10px; text-align:center; color:var(--c-text-muted); font-size:12px;">Press Enter to search for "${this.escapeHTML(v)}"</div>`;
            dd.classList.add('is-visible');
            return;
          }

          let html = '';
          if (creators.length > 0) {
            html += `<div class="suggestion-category-title">Creators</div>`;
            creators.slice(0, 3).forEach(c => {
              html += `
                <div class="suggestion-item" onclick="SConnect.openCreatorDetail('${c.id}')">
                  <img class="suggestion-avatar is-creator" src="${c.avatar || DEFAULT_AVATAR}" onerror="this.src='${DEFAULT_AVATAR}'">
                  <div class="suggestion-meta">
                    <div class="suggestion-name">${c.displayName || c.username}</div>
                    <div class="suggestion-sub">@${c.username} &bull; ${SConnect.formatNumber(c.followers)} followers</div>
                  </div>
                </div>
              `;
            });
          }

          if (bots.length > 0) {
            html += `<div class="suggestion-category-title">Characters</div>`;
            bots.slice(0, 5).forEach(b => {
              html += `
                <div class="suggestion-item" onclick="SConnect.openBotDetail('${b.id}')">
                  <img class="suggestion-avatar" src="${b.avatar || DEFAULT_AVATAR}" onerror="this.src='${DEFAULT_AVATAR}'">
                  <div class="suggestion-meta">
                    <div class="suggestion-name">${b.name}</div>
                    <div class="suggestion-sub">by ${b.creator_name || b.creatorName || 'Janitor'}</div>
                  </div>
                  <span class="suggestion-tag-chip">${(b.tokens || 0).toLocaleString()} t</span>
                </div>
              `;
            });
          }

          dd.innerHTML = html;
          dd.classList.add('is-visible');
        } catch (e) {}
      }, 150);
    },

    showSuggestions(show) {
      const dd = document.getElementById('hero-suggestions');
      const input = document.getElementById('hero-search-input');
      if (!dd) return;
      if (show) {
        if (input && input.value.trim()) {
          this.handleSearchInput(input.value);
        } else {
          this.renderDefaultSuggestions(dd);
        }
      } else {
        setTimeout(() => dd.classList.remove('is-visible'), 200);
      }
    },

    renderDefaultSuggestions(dd) {
      dd.innerHTML = `
        <div class="suggestion-category-title">Popular Categories</div>
        <div class="suggestion-item" onclick="SConnect.navigate('search', { q: 'Romance' })">
          <span style="color:var(--c-text-muted); line-height:0;">${ICONS.search}</span>
          <div class="suggestion-meta"><div class="suggestion-name">Romance</div></div>
        </div>
        <div class="suggestion-item" onclick="SConnect.navigate('search', { q: 'Fantasy' })">
          <span style="color:var(--c-text-muted); line-height:0;">${ICONS.search}</span>
          <div class="suggestion-meta"><div class="suggestion-name">Dark Fantasy</div></div>
        </div>
        <div class="suggestion-item" onclick="SConnect.navigate('search', { q: 'Cyberpunk' })">
          <span style="color:var(--c-text-muted); line-height:0;">${ICONS.search}</span>
          <div class="suggestion-meta"><div class="suggestion-name">Cyberpunk / Sci-Fi</div></div>
        </div>
      `;
      dd.classList.add('is-visible');
    },

    handleSearchKeyDown(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.submitHeroSearch();
      }
    },

    submitHeroSearch() {
      const input = document.getElementById('hero-search-input');
      const val = input ? input.value.trim() : '';
      if (val) {
        const dd = document.getElementById('hero-suggestions');
        if (dd) dd.classList.remove('is-visible');
        this.navigate('search', { q: val });
      }
    },

    // -------------------------------------------------------------------------
    // UTILITIES, HELPERS & ROBUST RICH TEXT PARSER
    // -------------------------------------------------------------------------
    copyCurrentTabContent(btn) {
      const payload = this.activeDetailCopyPayload !== undefined ? this.activeDetailCopyPayload : (this.activeBot?.description || '');
      this.copyText(btn, payload);
    },

    copyInterceptPrompt(btn, idx) {
      const item = this.interceptedPrompts?.[idx];
      if (item && item.system_prompt) {
        this.copyText(btn, item.system_prompt);
      }
    },

    openImageLightbox(src, alt = '') {
      if (typeof window.openMediaLightbox === 'function') {
        window.openMediaLightbox(src, 'image', alt);
      }
    },

    resolveMediaUrl(url) {
      if (!url) return '';
      let clean = String(url).trim();
      if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:image/')) {
        if (/^https?:\/\/(?:www\.)?janitorai\.com\/media-approved\//i.test(clean)) {
          return clean.replace(/^https?:\/\/(?:www\.)?janitorai\.com\/media-approved\//i, 'https://ella.janitorai.com/media-approved/');
        }
        if (/^https?:\/\/(?:www\.)?janitorai\.com\/user-avatars\//i.test(clean)) {
          return clean.replace(/^https?:\/\/(?:www\.)?janitorai\.com\/user-avatars\//i, 'https://ella.janitorai.com/user-avatars/');
        }
        if (/^https?:\/\/(?:www\.)?janitorai\.com\/avatars\//i.test(clean)) {
          return clean.replace(/^https?:\/\/(?:www\.)?janitorai\.com\/avatars\//i, 'https://ella.janitorai.com/avatars/');
        }
        if (/^https?:\/\/(?:www\.)?janitorai\.com\/bot-avatars\//i.test(clean)) {
          return clean.replace(/^https?:\/\/(?:www\.)?janitorai\.com\/bot-avatars\//i, 'https://ella.janitorai.com/bot-avatars/');
        }
        return clean;
      }
      if (/^_[a-zA-Z0-9_\-]+\.(webp|png|jpe?g|gif)$/i.test(clean)) {
        return 'https://ella.janitorai.com/media-approved/' + clean;
      }
      if (clean.startsWith('/media-approved/') || clean.startsWith('media-approved/')) {
        return 'https://ella.janitorai.com/' + clean.replace(/^\/+/, '');
      }
      if (clean.startsWith('profile-') || clean.startsWith('/profile-')) {
        return 'https://ella.janitorai.com/' + clean.replace(/^\/+/, '');
      }
      if (clean.startsWith('user-avatars') || clean.startsWith('/user-avatars')) {
        return 'https://ella.janitorai.com/' + clean.replace(/^\/+/, '');
      }
      if (clean.startsWith('avatars') || clean.startsWith('/avatars')) {
        return 'https://ella.janitorai.com/' + clean.replace(/^\/+/, '');
      }
      if (clean.startsWith('bot-avatars') || clean.startsWith('/bot-avatars')) {
        return 'https://ella.janitorai.com/' + clean.replace(/^\/+/, '');
      }
      return clean;
    },

    stripHTML(html) {
      if (!html) return '';
      return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    },

    escapeHTML(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    renderRichText(raw) {
      if (!raw) return '';
      let text = String(raw);

      // Normalize common JSON-escaped quotes and newlines
      text = text.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');

      const tokens = [];
      const saveToken = (content) => {
        const key = `\uE000TOK${tokens.length}\uE001`;
        tokens.push(content);
        return key;
      };

      // 1. Strictly preserve <style> tags so creator custom CSS is never stripped or broken
      text = text.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, match => saveToken(match));

      // 2. SoundCloud embeds
      text = text.replace(/<iframe[^>]*src=["'](https:\/\/w\.soundcloud\.com\/player\/[^"']+)["'][^>]*><\/iframe>/gi, (match, src) => {
        return saveToken(`
          <div class="rich-soundcloud-embed">
            <div class="rich-soundcloud-header">
              <svg class="ui-icon-sm" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              <span>SoundCloud Audio</span>
            </div>
            <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="${src}"></iframe>
          </div>
        `);
      });

      // 3. Strip dangerous scripts & event handlers
      text = text
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
        .replace(/<embed[^>]*>[\s\S]*?<\/embed>/gi, '')
        .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '')
        .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\son\w+\s*=\s*[^>\s]+/gi, '')
        .replace(/javascript:/gi, '');

      // Sanitize all inline styles on ALL HTML elements (clamp 100vw, clamp excessive min-widths, prevent viewport overflows)
      text = text.replace(/style=["']([^"']+)["']/gi, (match, styleContent) => {
        let clean = styleContent
          .replace(/width\s*:\s*100vw\s*;?/gi, 'width:100%;')
          .replace(/min-width\s*:\s*(?:100vw|[5-9]\d{2,}px|\d{4,}px)\s*;?/gi, 'min-width:0;max-width:100%;')
          .replace(/width\s*:\s*(?:[8-9]\d{2,}px|\d{4,}px)\s*;?/gi, 'max-width:100%;')
          .replace(/max-width\s*:\s*none\s*;?/gi, 'max-width:100%;')
          .trim();
        return `style="${clean}"`;
      });

      // Collapse excessive consecutive empty paragraphs
      text = text.replace(/(?:<p[^>]*>\s*(?:&nbsp;|<br\s*\/?>)?\s*<\/p>\s*){2,}/gi, '');

      // 4. Protect code blocks & inline code
      text = text.replace(/```([\w]*)\n?([\s\S]*?)```/g, (_, lang, code) => saveToken(`<pre class="rich-code-block"><code>${this.escapeHTML(code)}</code></pre>`));
      text = text.replace(/`([^`\n]+)`/g, (_, code) => saveToken(`<code class="rich-inline-code">${this.escapeHTML(code)}</code>`));

      // 5. Normalize HTML <img> tags (resolve src, prevent overflow, strip fixed dimensions, add lightbox & onerror auto-healing)
      text = text.replace(/<img\s+([^>]*?)>/gi, (match, attrs) => {
        const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
        const src = srcMatch ? srcMatch[1] : '';
        const cleanSrc = this.resolveMediaUrl(src);
        const altMatch = attrs.match(/alt=["']([^"']*)["']/i);
        const alt = altMatch ? altMatch[1] : '';
        let cleanAttrs = attrs
          .replace(/src=["'][^"']+["']/gi, '')
          .replace(/node=["'][^"']+["']/gi, '')
          .replace(/\s+(?:width|height)=["']?[^"'\s>]+["']?/gi, '')
          .replace(/style=["']([^"']*)["']/gi, (m, s) => {
            let cleanStyle = s
              .replace(/width\s*:\s*100vw;?/gi, 'max-width:100%;')
              .replace(/min-width\s*:[^;]+;?/gi, 'min-width:0;')
              .replace(/max-width\s*:\s*none;?/gi, 'max-width:100%;')
              .replace(/height\s*:\s*\d{3,}px;?/gi, 'height:auto;')
              .trim();
            return `style="${cleanStyle}"`;
          })
          .replace(/\s+/g, ' ')
          .trim();

        // Inject standard responsive and chakra classes
        if (!cleanAttrs.includes('class=')) {
          cleanAttrs += ' class="rich-rendered-img chakra-image css-4g6ai3"';
        } else {
          cleanAttrs = cleanAttrs.replace(/class=["']([^"']*)["']/, 'class="$1 rich-rendered-img chakra-image css-4g6ai3"');
        }

        const autoHeal = "if(this.src.includes('/user-avatars/')){this.src=this.src.replace('/user-avatars/','/avatars/');}else if(this.src.includes('/avatars/')){this.src=this.src.replace('/avatars/','/user-avatars/');}else{this.remove();}";
        let extra = '';
        if (!cleanAttrs.includes('onerror')) extra += ` onerror="${autoHeal}"`;
        if (!cleanAttrs.includes('loading')) extra += ' loading="lazy"';
        if (!cleanAttrs.includes('onclick')) extra += ' onclick="SConnect.openImageLightbox(this.src, this.alt)"';

        return saveToken(`<img src="${cleanSrc}" ${cleanAttrs}${extra}>`);
      });

      // 6. Normalize HTML <a> tags with in-app routing
      text = text.replace(/<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>([\s\S]*?)<\/a>/gi, (match, before, href, after, content) => {
        const cleanHref = String(href || '').trim();
        const botMatch = cleanHref.match(/(?:https?:\/\/(?:www\.)?janitorai\.com)?\/characters\/([0-9a-fA-F-]{36})/i);
        if (botMatch && botMatch[1]) {
          return saveToken(`<a ${before}href="javascript:void(0)" onclick="event.preventDefault(); SConnect.navigate('bot', { id: '${botMatch[1]}' });"${after}>${content}</a>`);
        }
        const profMatch = cleanHref.match(/(?:https?:\/\/(?:www\.)?janitorai\.com)?\/profiles\/([0-9a-fA-F-]{36})/i);
        if (profMatch && profMatch[1]) {
          return saveToken(`<a ${before}href="javascript:void(0)" onclick="event.preventDefault(); SConnect.navigate('creator', { id: '${profMatch[1]}' });"${after}>${content}</a>`);
        }
        let targetRel = '';
        if (!before.includes('target') && !after.includes('target')) targetRel += ' target="_blank"';
        if (!before.includes('rel') && !after.includes('rel')) targetRel += ' rel="noopener noreferrer"';
        return saveToken(`<a ${before}href="${cleanHref}"${targetRel}${after}>${content}</a>`);
      });

      // 7. Normalize HTML <audio> tags
      text = text.replace(/<audio\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>([\s\S]*?)<\/audio>/gi, (match, before, src, after, content) => {
        return saveToken(`<audio controls style="width:100%;height:34px;margin:8px 0;" ${before}src="${src}"${after}>${content}</audio>`);
      });

      // Detect whether content is predominantly structured with block HTML
      const hasBlockHTML = /<(?:article|section|div|p|details|summary|table|ul|ol|h[1-6]|header|footer|aside)\b/i.test(text);

      // 8. Tokenize remaining existing HTML tags so they are protected from regex mangling
      text = text.replace(/<[^>]+>/g, tag => saveToken(tag));

      // 9. Markdown images & links
      text = text.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s\)]+|\/media-approved\/[^\s\)]+|media-approved\/[^\s\)]+|_[a-zA-Z0-9_\-]+\.(?:webp|png|jpe?g|gif))\)/gi, (_, alt, url) => {
        const cleanSrc = this.resolveMediaUrl(url);
        const cleanAlt = (alt && alt !== 'image') ? this.escapeHTML(alt) : '';
        return saveToken(`<div class="rich-img-wrapper"><img src="${cleanSrc}" alt="${cleanAlt || 'Visual'}" class="rich-rendered-img chakra-image css-4g6ai3" onclick="SConnect.openImageLightbox(this.src, this.alt)" loading="lazy" />${cleanAlt ? `<div class="rich-img-caption">${cleanAlt}</div>` : ''}</div>`);
      });

      text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+|\/characters\/[^\s\)]+|\/profiles\/[^\s\)]+)\)/gi, (_, label, url) => {
        const cleanHref = String(url || '').trim();
        const botMatch = cleanHref.match(/(?:https?:\/\/(?:www\.)?janitorai\.com)?\/characters\/([0-9a-fA-F-]{36})/i);
        if (botMatch && botMatch[1]) {
          return saveToken(`<a href="javascript:void(0)" onclick="event.preventDefault(); SConnect.navigate('bot', { id: '${botMatch[1]}' });" class="rich-link">${label}</a>`);
        }
        const profMatch = cleanHref.match(/(?:https?:\/\/(?:www\.)?janitorai\.com)?\/profiles\/([0-9a-fA-F-]{36})/i);
        if (profMatch && profMatch[1]) {
          return saveToken(`<a href="javascript:void(0)" onclick="event.preventDefault(); SConnect.navigate('creator', { id: '${profMatch[1]}' });" class="rich-link">${label}</a>`);
        }
        return saveToken(`<a href="${cleanHref}" target="_blank" rel="noopener noreferrer" class="rich-link">${label}</a>`);
      });

      // 10. Plain standalone URLs
      text = text.replace(/(https?:\/\/[^\s<>"'\)]+)/gi, (url) => {
        const isAudio = /\.(mp3|ogg|wav|m4a)(\?.*)?$/i.test(url) || url.includes('files.catbox.moe');
        if (isAudio && !url.includes('.webp') && !url.includes('.jpg') && !url.includes('.png')) {
          return saveToken(`<audio controls style="width:100%;height:34px;margin:8px 0;" src="${url}"></audio>`);
        }
        const isImg = /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(url) || 
                      url.includes('/bot-avatars/') || 
                      url.includes('/media-approved/') || 
                      url.includes('i.imgur.com');
        if (isImg) {
          return saveToken(`<div class="rich-img-wrapper"><img src="${this.resolveMediaUrl(url)}" alt="Visual" class="rich-rendered-img chakra-image css-4g6ai3" onclick="SConnect.openImageLightbox(this.src, this.alt)" loading="lazy" /></div>`);
        }
        return saveToken(`<a href="${url}" target="_blank" rel="noopener noreferrer" class="rich-link">${url}</a>`);
      });

      // 11. Spoilers
      text = text.replace(/\|\|([\s\S]+?)\|\|/g, '<span class="rich-spoiler" onclick="this.classList.toggle(\'is-revealed\')" title="Click to reveal spoiler">$1</span>');

      // 12. Markdown inline formatting
      text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
      text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      text = text.replace(/\*([^\*\n]+?)\*/g, '<em>$1</em>');
      text = text.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
      text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
      text = text.replace(/_([^_\n]+?)_/g, '<em>$1</em>');
      text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');

      // 13. Headings & Blockquotes
      text = text.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
      text = text.replace(/^#####\s+(.+)$/gm,  '<h5>$1</h5>');
      text = text.replace(/^####\s+(.+)$/gm,   '<h4>$1</h4>');
      text = text.replace(/^###\s+(.+)$/gm,    '<h3>$1</h3>');
      text = text.replace(/^##\s+(.+)$/gm,     '<h2>$1</h2>');
      text = text.replace(/^#\s+(.+)$/gm,      '<h1>$1</h1>');
      text = text.replace(/^>\s*(.+)$/gm,      '<blockquote>$1</blockquote>');

      // 14. Lists
      text = text.replace(/((?:^[-*+]\s+.+\n?)+)/gm, block => {
        const items = block.trim().split('\n').map(l => `<li>${l.replace(/^[-*+]\s+/, '')}</li>`).join('');
        return `<ul>${items}</ul>`;
      });
      text = text.replace(/((?:^\d+\.\s+.+\n?)+)/gm, block => {
        const items = block.trim().split('\n').map(l => `<li>${l.replace(/^\d+\.\s+/, '')}</li>`).join('');
        return `<ol>${items}</ol>`;
      });

      // 15. Paragraph formatting (if not already structured block HTML)
      if (!hasBlockHTML) {
        text = text.split(/\n\n+/).map(p => p.trim() ? `<p>${p.replace(/\n/g, '<br>')}</p>` : '').join('');
        text = text.replace(/<p>\s*(<(?:h[1-6]|ul|ol|blockquote|div|hr)[\s\S]*?<\/(?:h[1-6]|ul|ol|blockquote|div)>|<hr>)\s*<\/p>/gi, '$1');
      }

      // Clean empty paragraphs produced by rich editors
      text = text.replace(/<p>\s*(?:&nbsp;|<br\s*\/?>)?\s*<\/p>/gi, '');

      // 16. Restore tokens
      let passes = 0;
      while (text.includes('\uE000TOK') && passes < 10) {
        passes++;
        for (let i = tokens.length - 1; i >= 0; i--) {
          text = text.split(`\uE000TOK${i}\uE001`).join(tokens[i]);
        }
      }

      // Collapse any remaining excessive empty paragraphs after token restoration
      text = text.replace(/(?:<p[^>]*>\s*(?:&nbsp;|<br\s*\/?>)?\s*<\/p>\s*){2,}/gi, '');

      return text.replace(/\uE000TOK\d+\uE001/g, '');
    }
  };

  // Expose globally
  window.SConnect = SConnect;
  window.sConnect = SConnect;

  // Auto-init on DOMContentLoaded or immediate
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SConnect.init());
  } else {
    SConnect.init();
  }
})();
