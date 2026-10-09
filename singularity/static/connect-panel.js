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
    message: `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><line x1="8" y1="9" x2="16" y2="9"></line><line x1="8" y1="13" x2="14" y2="13"></line></svg>`,
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
    homeSort: 'trending',
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
    creatorCache: new Map(),

    cacheCreator(c) {
      if (!c || (!c.id && !c.creator_id)) return;
      const cid = c.id || c.creator_id;
      // Filter out dummy corrupted entries
      if (c.username === cid && !c.avatar && !c.followers) return;

      const existing = this.creatorCache.get(cid);
      const merged = { ...c };
      if (existing) {
        // Quality guard: never let incoming partial/synthetic records downgrade authentic data
        if ((!merged.followers || Number(merged.followers) === 0) && Number(existing.followers || 0) > 0) {
          merged.followers = existing.followers;
        }
        if ((!merged.bio || merged.bio.startsWith('Creator of ') || merged.bio.startsWith('JanitorAI author of ')) && 
            existing.bio && !existing.bio.startsWith('Creator of ') && !existing.bio.startsWith('JanitorAI author of ')) {
          merged.bio = existing.bio;
        }
        if ((!merged.displayName || merged.displayName === 'Janitor Creator' || this.isUuid(merged.displayName)) &&
            existing.displayName && existing.displayName !== 'Janitor Creator' && !this.isUuid(existing.displayName)) {
          merged.displayName = existing.displayName;
        }
        if ((!merged.avatar || merged.avatar === DEFAULT_AVATAR) && existing.avatar && existing.avatar !== DEFAULT_AVATAR) {
          merged.avatar = existing.avatar;
        }
        if (existing.badges && (!merged.badges || merged.badges.length === 0)) {
          merged.badges = existing.badges;
        }
        if (existing.style && (!merged.style || Object.keys(merged.style).length === 0)) {
          merged.style = existing.style;
        }
      }
      this.creatorCache.set(cid, merged);
      this.saveCreatorCacheToStorage();
    },

    saveCreatorCacheToStorage() {
      try {
        const obj = {};
        this.creatorCache.forEach((v, k) => {
          if (v && (v.avatar || (v.username && v.username !== k))) {
            obj[k] = v;
          }
        });
        localStorage.setItem('s_connect_creator_cache', JSON.stringify(obj));
      } catch (e) {}
    },

    init() {
      try {
        const saved = JSON.parse(localStorage.getItem('s_connect_saved_bots') || '[]');
        this.savedBotIds = new Set(saved);
        const following = JSON.parse(localStorage.getItem('s_connect_following') || '[]');
        this.followingCreatorIds = new Set(following);
        const storedCreators = JSON.parse(localStorage.getItem('s_connect_creator_cache') || '{}');
        Object.entries(storedCreators).forEach(([k, v]) => {
          if (v && (v.id || v.name)) this.creatorCache.set(k, v);
        });
      } catch (e) {
        console.warn('Failed to load connect preferences:', e);
      }

      // Ensure bottom capsule is attached directly to document.body on mobile so it is NEVER trapped by scroll containers
      const capsule = document.querySelector('.cards-nav-capsule');
      if (capsule && capsule.parentElement !== document.body) {
        document.body.appendChild(capsule);
      }

      this.migrateLegacyChats();
      this.syncWithServer();

      window.addEventListener('singularity-chat-updated', () => {
        if (this.currentView === 'discover') {
          this.renderHomeRecentChats();
        }
      });

      // Asynchronously hydrate followed creators and pre-cache their full profiles
      fetch('/api/connect/following')
        .then(r => r.json())
        .then(d => {
          if (d && Array.isArray(d.following)) {
            d.following.forEach(id => { if (id) this.followingCreatorIds.add(String(id)); });
            localStorage.setItem('s_connect_following', JSON.stringify(Array.from(this.followingCreatorIds)));
            if (d.following.length > 0) {
              fetch(`/api/connect/creators/batch?ids=${encodeURIComponent(d.following.join(','))}`)
                .then(res => res.json())
                .then(batch => {
                  if (batch && Array.isArray(batch.creators)) {
                    batch.creators.forEach(c => this.cacheCreator(c));
                  } else {
                    // Fallback to parallel individual fetches
                    d.following.forEach(cid => {
                      fetch(`/api/connect/creators/${encodeURIComponent(cid)}`)
                        .then(r => r.json())
                        .then(j => {
                          if (j && j.data && j.data.creator) this.cacheCreator(j.data.creator);
                        })
                        .catch(() => {});
                    });
                  }
                })
                .catch(() => {});
            }
          }
        })
        .catch(() => {});

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

      // Close open custom dropdowns on outside click
      if (!this._selectListenerBound) {
        this._selectListenerBound = true;
        document.addEventListener('click', (e) => {
          if (!e.target.closest('.claude-custom-select-wrap')) {
            document.querySelectorAll('.claude-custom-select-wrap.open').forEach(el => {
              el.classList.remove('open');
            });
            document.querySelectorAll('.claude-custom-select-menu.open').forEach(el => {
              el.classList.remove('open');
            });
          }
        });
      }

      // Auto-disappearing scrollbar (Janitor UX: disappears smoothly in 0.5s when not scrolling)
      if (!this._scrollListenerBound) {
        this._scrollListenerBound = true;
        let _sbTimer = null;
        window.addEventListener('scroll', () => {
          document.documentElement.classList.add('is-scrolling');
          document.body.classList.add('is-scrolling');
          clearTimeout(_sbTimer);
          _sbTimer = setTimeout(() => {
            document.documentElement.classList.remove('is-scrolling');
            document.body.classList.remove('is-scrolling');
          }, 500);
        }, { passive: true, capture: true });
      }

      if (!this._popstateBound) {
        this._popstateBound = true;
        window.addEventListener('popstate', () => {
          this.handleHashRoute();
        });
      }

      // Top header user avatar sync
      this.updateTopAvatar();
      window.addEventListener('singularity-settings-updated', () => this.updateTopAvatar());
      window.addEventListener('storage', () => this.updateTopAvatar());

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

    updateTopAvatar() {
      const box = document.getElementById('cards-top-avatar-box');
      if (!box) return;
      let avatar = (localStorage.getItem('singularity_user_avatar') || '').trim();
      let name = (localStorage.getItem('singularity_user_name') || '').trim();

      if (!avatar) {
        try {
          const activePersonaId = localStorage.getItem('s_connect_active_persona_id') || localStorage.getItem('s_connect_active_persona');
          const rawPersonas = localStorage.getItem('s_connect_personas');
          if (rawPersonas) {
            const personas = JSON.parse(rawPersonas);
            const active = (Array.isArray(personas) && personas.find(p => p.id === activePersonaId)) || (Array.isArray(personas) && personas[0]);
            if (active && active.avatar) avatar = active.avatar.trim();
            if (!name && active && active.name) name = active.name.trim();
          }
        } catch (_) {}
      }
      if (!avatar) {
        avatar = (localStorage.getItem('singularity_user_avatar_url') || '').trim();
      }

      if (avatar) {
        box.innerHTML = `<img src="${avatar}" class="cards-top-avatar-img" alt="${this.escapeHTML(name || 'User')}" />`;
      } else {
        box.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
      }
    },

    toggleUserMenu(e) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      const dropdown = document.getElementById('cards-top-user-dropdown');
      const btn = document.getElementById('cards-top-avatar-btn');
      if (!dropdown) return;
      const isOpen = dropdown.classList.toggle('is-open');
      if (btn) btn.setAttribute('aria-expanded', String(isOpen));

      if (isOpen) {
        this.updateTopAvatar();
        const closeHandler = (evt) => {
          if (!dropdown.contains(evt.target) && !btn?.contains(evt.target)) {
            dropdown.classList.remove('is-open');
            if (btn) btn.setAttribute('aria-expanded', 'false');
            document.removeEventListener('click', closeHandler);
          }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 10);
      }
    },

    closeUserMenu() {
      const dropdown = document.getElementById('cards-top-user-dropdown');
      const btn = document.getElementById('cards-top-avatar-btn');
      if (dropdown) dropdown.classList.remove('is-open');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    },

    selectUserMenuItem(view) {
      this.closeUserMenu();
      this.navigate(view);
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

    resetScrollToTop() {
      const performReset = () => {
        try {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        } catch (e) {
          try { window.scrollTo(0, 0); } catch (_) {}
        }
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;

        const selectors = [
          '.panel-viewport',
          '#pane-connect',
          '#connect-main-view',
          '.cards-app-container',
          '.bot-detail-page',
          '.bot-detail-layout',
          '.bot-detail-content'
        ];
        selectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            if (el) {
              el.scrollTop = 0;
              try { el.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (_) { el.scrollTop = 0; }
            }
          });
        });

        // Ensure the absolute top of the page (nav bar or pane root at Y=0) is aligned, never inner main content
        const topEl = document.getElementById('cards-top-nav-bar') || document.getElementById('pane-connect');
        if (topEl && typeof topEl.scrollIntoView === 'function') {
          try { topEl.scrollIntoView({ behavior: 'instant', block: 'start' }); } catch (_) {}
        }
      };

      performReset();
      requestAnimationFrame(() => {
        performReset();
      });
    },

    // -------------------------------------------------------------------------
    // NAVIGATION ROUTER
    // -------------------------------------------------------------------------
    navigate(view, params = {}, updateHash = true) {
      if (this.currentView !== 'bot' && this.currentView !== 'creator' && this.currentView !== 'chat') {
        this.prevView = this.currentView;
      }
      this.currentView = view;
      this.closeUserMenu();
      this.updateTopAvatar();

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
        const mToggle = document.getElementById('singularity-sidebar-toggle');
        if (mToggle) mToggle.style.setProperty('display', 'none', 'important');
        const deskToggle = document.getElementById('sidebar-toggle-btn');
        if (deskToggle) deskToggle.style.setProperty('display', 'none', 'important');
      } else {
        document.body.classList.remove('is-janitor-chat-active');
        document.documentElement.classList.remove('is-janitor-chat-active');
        const mToggle = document.getElementById('singularity-sidebar-toggle');
        if (mToggle) mToggle.style.removeProperty('display');
        const deskToggle = document.getElementById('sidebar-toggle-btn');
        if (deskToggle) deskToggle.style.removeProperty('display');
      }

      // Toggle top header back button and detail state
      const topBackBtn = document.getElementById('cards-top-back-btn');
      if (view === 'bot' || view === 'creator' || view === 'personas' || (this.history && this.history.length > 0 && view !== 'discover')) {
        document.body.classList.add('is-sconnect-detail-view');
        if (topBackBtn) topBackBtn.style.display = 'inline-flex';
      } else {
        document.body.classList.remove('is-sconnect-detail-view');
        if (topBackBtn) topBackBtn.style.display = 'none';
      }

      // Hide or show top nav bar depending on chat view
      const topNav = document.querySelector('.cards-top-nav-bar');
      if (topNav) {
        topNav.style.display = (view === 'chat') ? 'none' : '';
      }

      const container = document.getElementById('connect-main-view');
      if (!container) return;

      this.resetScrollToTop();

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
      } else if (view === 'personas' || view === 'interceptor') {
        this.renderPersonasView(container);
      } else if (view === 'bot') {
        this.renderBotDetailView(container, params.id);
      } else if (view === 'creator') {
        this.renderCreatorDetailView(container, params.id);
      } else if (view === 'my-chats') {
        this.renderMyChatsView(container, params.id || null);
      } else if (view === 'chat') {
        this.renderChatView(container, params.id);
      }
      this.resetScrollToTop();
    },

    navigateBack() {
      this.resetScrollToTop();
      document.body.classList.remove('is-janitor-chat-active');
      document.documentElement.classList.remove('is-janitor-chat-active');
      const mToggle = document.getElementById('singularity-sidebar-toggle');
      if (mToggle) mToggle.style.removeProperty('display');
      const deskToggle = document.getElementById('sidebar-toggle-btn');
      if (deskToggle) deskToggle.style.removeProperty('display');
      document.body.classList.remove('is-sconnect-detail-view');
      const topBackBtn = document.getElementById('cards-top-back-btn');
      if (topBackBtn) topBackBtn.style.display = 'none';
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

          <!-- Most Recent Chats (Above Trending this week header) -->
          <div id="home-recent-chats-container" class="home-recent-chats-container"></div>

          <!-- Section Header: Trending this week + Segmented Sort Capsule -->
          <div class="section-header">
            <div class="section-title-wrap">
              <h2 class="section-title">Trending this week</h2>
              <span class="section-subtitle">Real-time character cards from JanitorAI</span>
            </div>

            <!-- Sort Segmented Capsule: Trending, Popular, Newest -->
            <div class="home-sort-segment">
              <button class="library-segment-btn ${this.homeSort === 'trending' ? 'is-active' : ''}" onclick="SConnect.setSort('trending', this)">
                Trending
              </button>
              <button class="library-segment-btn ${this.homeSort === 'popular' ? 'is-active' : ''}" onclick="SConnect.setSort('popular', this)">
                Popular
              </button>
              <button class="library-segment-btn ${this.homeSort === 'latest' ? 'is-active' : ''}" onclick="SConnect.setSort('latest', this)">
                Newest
              </button>
            </div>
          </div>

          <!-- Character Cards Grid -->
          <div id="home-trending-grid" class="bot-cards-grid">
            ${Array.from({ length: 8 }, () => `<div class="bot-card skeleton"></div>`).join('')}
          </div>

          <!-- Load More Button -->
          <div class="load-more-container">
            <button class="load-more-btn" onclick="SConnect.loadMoreBots(this)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
              <span>Load More Characters</span>
            </button>
          </div>
        </div>
      `;

      this.renderHomeRecentChats();
      this.loadDiscoverData();
    },

    async loadDiscoverData() {
      try {
        const tagParam = this.homeTag !== 'all' ? `&tag=${encodeURIComponent(this.homeTag)}` : '';
        
        const resMain = await fetch(`/api/connect/search?sort=${this.homeSort}${tagParam}&page=1&limit=24`).then(r => r.json());
        const bots = (resMain.data && resMain.data.bots) || resMain.bots || resMain.items || [];
        this.homeBots = bots;
        bots.forEach(b => this.cacheBot(b));

        const grid = document.getElementById('home-trending-grid');
        if (grid) {
          if (bots.length > 0) {
            grid.innerHTML = bots.map((b, i) => this.renderBotCardHTML(b, i)).join('');
          } else {
            grid.innerHTML = `<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--c-text-muted);">No characters found for this filter.</div>`;
          }
        }

        this.renderHomeRecentChats();
      } catch (err) {
        console.error('Error hydrating discover feed:', err);
      }
    },

    formatRecentChatBio(bio) {
      if (!bio) return 'Janitor AI character roleplay.';
      let str = String(bio)
        .replace(/<image[^>]*>.*?<\/image>/gis, '')
        .replace(/<image[^>]*>/gi, '')
        .replace(/<\/image>/gi, '')
        .replace(/<img[^>]*>/gi, '')
        .replace(/<picture[^>]*>.*?<\/picture>/gis, '')
        .replace(/<video[^>]*>.*?<\/video>/gis, '')
        .replace(/<audio[^>]*>.*?<\/audio>/gis, '')
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[img\].*?\[\/img\]/gis, '')
        .replace(/<style[^>]*>.*?<\/style>/gis, '')
        .replace(/<script[^>]*>.*?<\/script>/gis, '')
        .replace(/<\/?details[^>]*>/gi, '')
        .replace(/<\/?summary[^>]*>/gi, '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/p>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/[*_~`]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      const words = str.split(' ');
      if (words.length > 45) {
        return this.escapeHTML(words.slice(0, 45).join(' ')) + '...';
      }
      if (str.length > 240) {
        return this.escapeHTML(str.slice(0, 235).trim()) + '...';
      }
      return this.escapeHTML(str);
    },

    formatRecentChatTime(timestamp) {
      if (!timestamp) return 'just now';
      const now = Date.now();
      const diff = Math.max(0, now - timestamp);
      const min = Math.floor(diff / 60000);
      const hr = Math.floor(min / 60);
      const day = Math.floor(hr / 24);
      if (min < 1) return 'just now';
      if (min < 60) return `about ${min} minute${min > 1 ? 's' : ''} ago`;
      if (hr < 24) return `about ${hr} hour${hr > 1 ? 's' : ''} ago`;
      if (day === 1) return 'yesterday';
      if (day < 7) return `about ${day} days ago`;
      return `about ${Math.floor(day / 7)} weeks ago`;
    },

    renderHomeRecentChats() {
      const container = document.getElementById('home-recent-chats-container');
      if (!container) return;

      const allSessions = this.getAllChatSessions();
      if (!allSessions || allSessions.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
      }

      const sorted = [...allSessions].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)).slice(0, 4);

      container.style.display = 'block';
      container.innerHTML = `
        <div class="janitor-recent-chats-section">
          <div class="janitor-recent-chats-header">
            <h3 class="janitor-recent-chats-title">Recent Chats</h3>
            <button class="janitor-recent-view-all-btn" onclick="SConnect.navigate('my-chats')">View All</button>
          </div>
          <div class="janitor-recent-chats-scroll" data-count="${sorted.length}">
            ${sorted.map(s => this.renderRecentChatCardHTML(s)).join('')}
          </div>
        </div>
      `;
    },

    resolveSessionPersonaAvatar(session) {
      if (!session) return DEFAULT_AVATAR;
      const personas = this.getPersonas();
      // 1. Look up by personaId on the session if specified
      if (session.personaId) {
        const found = Array.isArray(personas) && personas.find(p => p.id === session.personaId);
        if (found && found.avatar) return found.avatar;
      }
      // 2. Check chat messages: find any user message and grab its avatar
      if (session.id) {
        const history = this.getChatMessages(session.id);
        if (Array.isArray(history)) {
          const userMsg = [...history].reverse().find(m => m.role === 'user');
          if (userMsg && userMsg.avatar) return userMsg.avatar;
        }
      }
      // 3. Directly stored personaAvatar if valid
      if (session.personaAvatar && session.personaAvatar !== DEFAULT_AVATAR) {
        return session.personaAvatar;
      }
      // 4. Fallback to active persona or first persona
      const active = this.getActivePersona();
      return (active && active.avatar) || (personas && personas[0] && personas[0].avatar) || DEFAULT_AVATAR;
    },

    renderRecentChatCardHTML(session) {
      if (!session) return '';
      const bot = this.botCache.get(session.botId) || { id: session.botId, name: session.botName, avatar: session.botAvatar };
      const botChatName = this.getBotChatName(bot || { name: session.botName }) || session.botName || 'Chat';
      const botAvatar = session.botAvatar || bot.avatar || DEFAULT_AVATAR;

      const history = this.getChatMessages(session.id);
      const msgCount = (history && history.length > 0) ? history.length : (session.messageCount || 1);
      const timeText = this.formatRecentChatTime(session.updatedAt || session.createdAt);

      // Distinct randomized watch progress between 20% and 92% per chat session
      const idKey = String(session.id || session.botId || 'session');
      let hash = 0;
      for (let i = 0; i < idKey.length; i++) {
        hash = (hash * 33 + idKey.charCodeAt(i)) & 0x7fffffff;
      }
      const progressPct = 20 + (hash % 73); // range: 20% to 92%

      return `
        <div class="janitor-recent-card" onclick="SConnect.resumeChatSession('${session.botId}', '${session.id}')" title="Resume chat with ${this.escapeHTML(botChatName)}">
          <!-- Widescreen Netflix Thumbnail Background Image -->
          <img class="janitor-recent-bg-img" src="${botAvatar}" alt="${this.escapeHTML(botChatName)}" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';" />

          <!-- Center Frosted Glass Circular Play Button -->
          <div class="janitor-recent-play-btn" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <polygon points="7 4 20 12 7 20 7 4"></polygon>
            </svg>
          </div>

          <!-- Bottom Cinematic Gradient Overlay -->
          <div class="janitor-recent-overlay">
            <div class="janitor-recent-title-row">
              <span class="janitor-recent-lock-icon">🔒</span>
              <span class="janitor-recent-title" title="${this.escapeHTML(botChatName)}">${this.escapeHTML(botChatName)}</span>
            </div>
            <div class="janitor-recent-meta-row">
              <span class="janitor-recent-meta-item">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span>${timeText}</span>
              </span>
              <span class="janitor-recent-meta-item">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <span>${msgCount} message${msgCount === 1 ? '' : 's'}</span>
              </span>
            </div>
          </div>

          <!-- Netflix Continue Watching Red Progress Bar -->
          <div class="janitor-recent-progress-track">
            <div class="janitor-recent-progress-bar" style="width: ${progressPct}%;"></div>
          </div>
        </div>
      `;
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

    async loadMoreBots(btn) {
      const button = btn || document.querySelector('.load-more-btn');
      if (button) {
        button.classList.add('is-loading');
        button.disabled = true;
      }
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
      } finally {
        if (button) {
          button.classList.remove('is-loading');
          button.disabled = false;
        }
      }
    },

    formatBotCardBio(bio) {
      if (!bio) return '';
      let str = String(bio)
        .replace(/<image[^>]*>.*?<\/image>/gis, '')
        .replace(/<image[^>]*>/gi, '')
        .replace(/<\/image>/gi, '')
        .replace(/<img[^>]*>/gi, '')
        .replace(/<picture[^>]*>.*?<\/picture>/gis, '')
        .replace(/<video[^>]*>.*?<\/video>/gis, '')
        .replace(/<audio[^>]*>.*?<\/audio>/gis, '')
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[img\].*?\[\/img\]/gis, '')
        .replace(/<style[^>]*>.*?<\/style>/gis, '')
        .replace(/<script[^>]*>.*?<\/script>/gis, '')
        .replace(/<\/?details[^>]*>/gi, '')
        .replace(/<\/?summary[^>]*>/gi, '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/p>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/[*_~`]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      const words = str.split(' ');
      if (words.length > 25) {
        return this.escapeHTML(words.slice(0, 25).join(' ')) + '...';
      }
      if (str.length > 130) {
        return this.escapeHTML(str.slice(0, 125).trim()) + '...';
      }
      return this.escapeHTML(str);
    },

    // -------------------------------------------------------------------------
    // BOT POSTER CARD HTML (Tall Portrait Format 9:16)
    // -------------------------------------------------------------------------
    renderBotCardHTML(bot, index = 0) {
      if (!bot) return '';
      this.cacheBot(bot);

      const isSaved = this.savedBotIds.has(bot.id);
      const botAvatar = bot.avatar || DEFAULT_AVATAR;
      const creatorName = bot.creator_name || bot.creatorName || 'Janitor Creator';
      let creatorAvatar = bot.creator_avatar || bot.creatorAvatar || DEFAULT_AVATAR;
      if (creatorAvatar && creatorAvatar.includes('/bot-avatars/')) {
        creatorAvatar = creatorAvatar.replace('/bot-avatars/', '/avatars/');
      }

      const chatsVal = Number(bot.chats || bot.total_chat || bot.chat_count || 0);
      const msgsVal = Number(bot.messages || bot.total_message || bot.message_count || 0);
      const displayChats = chatsVal || (msgsVal > 100 ? Math.round(msgsVal / 18) : msgsVal);
      const displayMsgs = msgsVal || (chatsVal > 0 ? chatsVal * 18 : 0);

      const rawBio = bot.description || bot.personality || bot.scenario || '';
      const cleanBio = this.formatBotCardBio(rawBio);

      return `
        <div class="bot-card pp-cc-wrapper profile-character-card-wrapper css-13wmn96 css-1sxhvxh" onclick="SConnect.openBotDetail('${bot.id}')">
          <!-- Full Bleed Character Portrait -->
          <img class="bot-card-bg-image pp-cc-avatar profile-character-card-avatar-image css-147i79y css-1q7rmf0" src="${botAvatar}" alt="${this.escapeHTML(bot.name)}" loading="lazy" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';">
          
          <!-- Gradient Overlay -->
          <div class="bot-card-gradient-overlay"></div>

          <!-- Top Bar: Quick Hover Action Buttons on left, Glassmorphism Stats Pill on right -->
          <div class="bot-card-top-bar">
            <div class="bot-card-actions-group">
              <button class="card-action-btn ${isSaved ? 'is-saved' : ''}" title="Save to Library" onclick="event.stopPropagation(); SConnect.toggleSaveBot('${bot.id}', this)">
                ${isSaved ? ICONS.bookmarkFilled : ICONS.bookmark}
              </button>
              <button class="card-action-btn" title="Download SillyTavern V2 PNG" onclick="event.stopPropagation(); SConnect.downloadBotPNG('${bot.id}')">
                ${ICONS.download}
              </button>
            </div>
            <!-- Glassmorphism Stats Pill with original ICONS.chat and ICONS.message -->
            <div class="bot-card-stats-pill">
              <span class="bot-card-stat-item" title="Total Chats">
                ${ICONS.chat}
                <span>${this.formatNumber(displayChats)}</span>
              </span>
              <span class="bot-card-stat-item" title="Total Messages">
                ${ICONS.message}
                <span>${this.formatNumber(displayMsgs)}</span>
              </span>
            </div>
          </div>

          <!-- Bottom Content Area -->
          <div class="bot-card-content-area pp-cc-stack profile-character-card-stack css-1s5evre">
            <!-- 1. Bot Title -->
            <h3 class="bot-card-title pp-cc-name profile-character-card-name-box css-nlxhw4" title="${this.escapeHTML(bot.name)}">${this.escapeHTML(bot.name)}</h3>

            <!-- 2. Creator Avatar and Name (No boxing, no bordering) -->
            <div class="bot-card-creator-row" onclick="event.stopPropagation(); SConnect.openCreatorDetail('${bot.creator_id || bot.creatorId || creatorName}')" title="Creator: ${this.escapeHTML(creatorName)}">
              <span class="bot-card-creator-handle">@${this.escapeHTML(creatorName)}</span>
              <img class="bot-card-creator-avatar-inline" src="${creatorAvatar}" alt="${this.escapeHTML(creatorName)}" onerror="SConnect.handleAvatarError(this)" />
            </div>

            <!-- 3. Hover Bio Preview (Smooth slide-up & fade-in, text only) -->
            ${cleanBio ? `
              <div class="bot-card-bio-hover-preview">
                <p class="bot-card-bio-hover-text">${cleanBio}</p>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    },

    isUuid(val) {
      if (!val || typeof val !== 'string') return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
    },

    handleAvatarError(img) {
      if (!img) return;
      let step = parseInt(img.dataset.tryStep || '0', 10);
      const curSrc = img.src || '';

      if (step === 0 && curSrc.includes('/bot-avatars/')) {
        img.dataset.tryStep = '1';
        img.src = curSrc.replace('/bot-avatars/', '/avatars/');
        return;
      }
      if (step <= 1 && curSrc.includes('/user-avatars/')) {
        img.dataset.tryStep = '2';
        img.src = curSrc.replace('/user-avatars/', '/avatars/');
        return;
      }
      if (step <= 2 && curSrc.includes('/avatars/') && !curSrc.includes('/user-avatars/')) {
        img.dataset.tryStep = '3';
        img.src = curSrc.replace('/avatars/', '/user-avatars/');
        return;
      }
      if (step <= 3 && curSrc.includes('/profile-avatar-approved/')) {
        const parts = curSrc.split('/');
        const fname = parts[parts.length - 1];
        if (fname && (fname.endsWith('.webp') || fname.endsWith('.png') || fname.endsWith('.jpg'))) {
          img.dataset.tryStep = '4';
          img.src = `https://ella.janitorai.com/avatars/${fname}`;
          return;
        }
      }

      img.onerror = null;
      img.src = DEFAULT_AVATAR;
    },

    renderCreatorCardHTML(creator, index = 0) {
      if (!creator) return '';
      const cid = creator.id || creator.creator_id || '';
      const isFollowing = this.followingCreatorIds.has(cid);

      let resolved = { ...creator };
      if (cid && this.creatorCache && this.creatorCache.has(cid)) {
        const cached = this.creatorCache.get(cid);
        if (cached) {
          if (cached.avatar && !resolved.avatar) resolved.avatar = cached.avatar;
          if (cached.username && (!resolved.username || this.isUuid(resolved.username))) resolved.username = cached.username;
          if (cached.displayName && (!resolved.displayName || this.isUuid(resolved.displayName))) resolved.displayName = cached.displayName;
          if (cached.name && (!resolved.displayName || this.isUuid(resolved.displayName))) resolved.displayName = cached.name;
          if (cached.bio && (!resolved.bio || resolved.bio.startsWith('Creator of ') || resolved.bio.startsWith('JanitorAI author of '))) {
            resolved.bio = cached.bio;
          }
          if (cached.followers && (!resolved.followers || Number(resolved.followers) === 0)) {
            resolved.followers = cached.followers;
          }
        }
      }

      // If username or displayName is still a UUID or missing, search botCache for authored cards
      if (!resolved.displayName || this.isUuid(resolved.displayName) || !resolved.username || this.isUuid(resolved.username)) {
        if (this.botCache && cid) {
          for (const [_, b] of this.botCache) {
            if ((b.creator_id === cid || (b.creator && b.creator.id === cid)) && b.author && !this.isUuid(b.author)) {
              resolved.displayName = b.author;
              resolved.username = b.creator?.username || b.author;
              if (!resolved.avatar && (b.creator_avatar || b.creator?.avatar)) {
                resolved.avatar = b.creator_avatar || b.creator?.avatar;
              }
              break;
            }
          }
        }
      }

      let cName = resolved.displayName || resolved.username;
      if (!cName || this.isUuid(cName)) {
        cName = 'Janitor Creator';
      }
      let cHandle = resolved.username;
      if (!cHandle || this.isUuid(cHandle)) {
        cHandle = cName.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'creator';
      }

      let cAvatar = resolved.avatar || DEFAULT_AVATAR;
      if (cAvatar && cAvatar.includes('/bot-avatars/')) {
        cAvatar = cAvatar.replace('/bot-avatars/', '/avatars/');
      }
      let cleanBio = this.stripHTML(resolved.bio || '').replace(/[\r\n]+/g, ' ').trim();
      if (!cleanBio || cleanBio.startsWith('Creator of ') || cleanBio.startsWith('JanitorAI author of ')) {
        const cached = this.creatorCache?.get(cid);
        if (cached && cached.bio && !cached.bio.startsWith('Creator of ') && !cached.bio.startsWith('JanitorAI author of ')) {
          cleanBio = this.stripHTML(cached.bio).replace(/[\r\n]+/g, ' ').trim();
        }
      }
      if (!cleanBio) {
        cleanBio = 'JanitorAI creator crafting immersive character cards.';
      }
      const followersNum = Number(resolved.followers || 0);

      return `
        <div class="creator-card" onclick="SConnect.openCreatorDetail('${cid}')">
          <div class="creator-card-header">
            <img class="creator-card-avatar" src="${cAvatar}" alt="${this.escapeHTML(cName)}" onerror="SConnect.handleAvatarError(this)">
            <div class="creator-card-info">
              <div class="creator-card-name-row">
                <span class="creator-card-name">${this.escapeHTML(cName)}</span>
              </div>
              <div class="creator-card-handle">
                <span>@${this.escapeHTML(cHandle)}</span>
                <span>&bull;</span>
                <span>${followersNum > 0 ? this.formatNumber(followersNum) + ' followers' : 'Creator'}</span>
              </div>
            </div>
            <button class="follow-toggle-btn ${isFollowing ? 'is-following' : ''}" onclick="event.stopPropagation(); SConnect.toggleFollowCreator('${cid}', this)">
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
      this.resetScrollToTop();

      // Render immediately with current cached bot for instantaneous navigation
      this.drawBotDetailPage(container, bot);

      // Asynchronously fetch complete authentic character dossier from JanitorAI
      // to guarantee full untruncated bio (not capped at 4096), all greetings, and exact token counts
      fetch(`/api/connect/bot/${botId}`)
        .then(r => r.json())
        .then(res => {
          const fresh = res.data || res;
          if (fresh && fresh.id && this.activeBot && this.activeBot.id === fresh.id) {
            const prevDescLen = (this.activeBot.description || '').length;
            const newDescLen = (fresh.description || '').length;
            this.activeBot = Object.assign({}, this.activeBot, fresh);
            this.cacheBot(this.activeBot);

            // Update bio panel seamlessly if content was lengthened or on bio tab
            const panel = document.getElementById('detail-tab-panel');
            if (panel && (this.activeDetailTab === 'bio' || newDescLen > prevDescLen)) {
              panel.innerHTML = this.renderDetailTabContent();
            }

            // Update metadata box tokens and counts
            const metaBox = document.querySelector('.bot-metadata-card');
            if (metaBox && fresh.tokens) {
              const lines = metaBox.querySelectorAll('.metadata-line');
              if (lines.length > 0) {
                const tokVal = lines[0].querySelector('.metadata-val');
                if (tokVal) tokVal.textContent = (fresh.tokens || 0).toLocaleString();
              }
            }
          }
        })
        .catch(() => {});
    },

    drawBotDetailPage(container, bot) {
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

              <!-- Live JanitorAI Reviews & Comments Section -->
              <div class="bot-reviews-section" id="bot-reviews-section">
                <div class="reviews-header">
                  <div class="reviews-header-left">
                    <h3 class="reviews-title">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                      <span>Comments & Reviews</span>
                      <span class="reviews-count-badge" id="reviews-count-badge"></span>
                    </h3>
                  </div>
                  <div class="reviews-header-right">
                    <div class="reviews-sort-pills" role="radiogroup" aria-label="Sort Reviews">
                      <button type="button" class="reviews-sort-btn is-active" id="sort-rev-likes" onclick="SConnect.switchReviewsSort('likes')">Top Liked</button>
                      <button type="button" class="reviews-sort-btn" id="sort-rev-latest" onclick="SConnect.switchReviewsSort('latest')">Newest</button>
                      <button type="button" class="reviews-sort-btn" id="sort-rev-oldest" onclick="SConnect.switchReviewsSort('oldest')">Oldest</button>
                    </div>
                  </div>
                </div>
                <div class="reviews-list" id="reviews-list">
                  <div class="reviews-loading-skeleton">
                    <div class="review-card skeleton" style="height:110px; margin-bottom:12px; border-radius:12px;"></div>
                    <div class="review-card skeleton" style="height:110px; margin-bottom:12px; border-radius:12px;"></div>
                  </div>
                </div>
                <div class="reviews-footer" id="reviews-footer"></div>
              </div>
            </section>
          </div>
        </div>
      `;

      this.resetScrollToTop();
      this.loadMoreByCreator(bot.creator_id || bot.creatorId || creatorName, bot.id);
      this.loadBotReviews(bot.id, 1, 'likes', false);
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

    formatRelativeTime(isoStr) {
      if (!isoStr) return '';
      try {
        const d = new Date(isoStr);
        const now = new Date();
        const diffMs = now - d;
        const diffSec = Math.floor(diffMs / 1000);
        if (diffSec < 60) return 'Just now';
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `${diffHr}h ago`;
        const diffDays = Math.floor(diffHr / 24);
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 30) return `${diffDays}d ago`;
        const diffMonths = Math.floor(diffDays / 30);
        if (diffMonths < 12) return `${diffMonths}mo ago`;
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      } catch (_) {
        return '';
      }
    },

    renderCommentBody(rawText) {
      if (!rawText) return '';
      let safe = this.escapeHTML(rawText);
      safe = safe.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="review-link">$1</a>');
      return safe.replace(/\n/g, '<br />');
    },

    async switchReviewsSort(sortBy) {
      if (this.currentReviewsSort === sortBy && this.currentReviewsPage === 1) return;
      this.currentReviewsSort = sortBy;
      document.querySelectorAll('.reviews-sort-btn').forEach(btn => {
        btn.classList.toggle('is-active', btn.getAttribute('id') === `sort-rev-${sortBy}`);
      });
      if (this.activeBot && this.activeBot.id) {
        await this.loadBotReviews(this.activeBot.id, 1, sortBy, false);
      }
    },

    async loadBotReviews(botId, page = 1, sortBy = 'likes', append = false) {
      if (!botId) return;
      this.currentReviewsBotId = botId;
      this.currentReviewsPage = page;
      this.currentReviewsSort = sortBy;

      const listEl = document.getElementById('reviews-list');
      const footerEl = document.getElementById('reviews-footer');
      const badgeEl = document.getElementById('reviews-count-badge');
      if (!listEl) return;

      if (!append) {
        listEl.innerHTML = `
          <div class="reviews-loading-skeleton">
            <div class="review-card skeleton" style="height:110px; margin-bottom:12px; border-radius:12px;"></div>
            <div class="review-card skeleton" style="height:110px; margin-bottom:12px; border-radius:12px;"></div>
          </div>
        `;
        if (footerEl) footerEl.innerHTML = '';
      } else {
        const loadBtn = document.getElementById('btn-load-more-reviews');
        if (loadBtn) {
          loadBtn.disabled = true;
          loadBtn.innerHTML = `<span class="review-spinner"></span> Loading more...`;
        }
      }

      try {
        let resp = await fetch(`/api/connect/reviews?bot_id=${encodeURIComponent(botId)}&page=${page}&size=20&sortBy=${sortBy}`);
        if (resp.status === 404) {
          resp = await fetch(`/api/connect/search?q=${encodeURIComponent('__action:reviews:' + botId)}&tag=__reviews__&sort=${encodeURIComponent(sortBy)}&page=${page}&limit=20`);
        }
        if (!resp.ok) throw new Error('Failed to fetch reviews');
        const data = await resp.json();
        const reviews = data.reviews || [];
        const counts = data.counts || {};
        const totalReviews = counts.total ?? (data.total || reviews.length);

        if (badgeEl) {
          badgeEl.textContent = totalReviews > 0 ? `(${totalReviews})` : '(0)';
        }

        if (!append) {
          listEl.innerHTML = '';
        }

        if (!append && reviews.length === 0) {
          listEl.innerHTML = `
            <div class="reviews-empty-state">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <h4>No comments yet on JanitorAI</h4>
              <p>Be the first to explore this character and start a scenario.</p>
            </div>
          `;
          if (footerEl) footerEl.innerHTML = '';
          return;
        }

        const cardsHTML = reviews.map(rev => {
          const user = rev.user || {};
          const uName = user.name || 'Anonymous';
          const uInitial = uName.charAt(0).toUpperCase() || 'U';
          const uAvatar = user.avatar;
          const timeAgo = this.formatRelativeTime(rev.created_at);
          const hasReplies = rev.comment_count > 0;

          return `
            <div class="review-card ${rev.is_pinned ? 'is-pinned' : ''}" id="review-card-${rev.id}">
              ${rev.is_pinned ? `
                <div class="review-pinned-badge">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6l.8.8.8-.8v-6H18v-2l-2-2z"/></svg>
                  <span>Pinned by Creator</span>
                </div>
              ` : ''}
              <div class="review-card-header">
                <div class="review-user-info">
                  <div class="review-avatar-wrap">
                    ${uAvatar ? `
                      <img src="${uAvatar}" class="review-avatar-img" alt="${this.escapeHTML(uName)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
                      <div class="review-avatar-fallback" style="display:none;">${this.escapeHTML(uInitial)}</div>
                    ` : `
                      <div class="review-avatar-fallback">${this.escapeHTML(uInitial)}</div>
                    `}
                  </div>
                  <div class="review-user-meta">
                    <div class="review-user-name-row">
                      <span class="review-user-name">${this.escapeHTML(uName)}</span>
                      ${user.plus_badge ? `<span class="review-plus-pill" title="Janitor+ Subscriber">PLUS</span>` : ''}
                      ${user.is_verified ? `<span class="review-verified-pill" title="Verified Creator">✓</span>` : ''}
                    </div>
                    ${timeAgo ? `<span class="review-timestamp">${timeAgo}</span>` : ''}
                  </div>
                </div>
              </div>
              <div class="review-card-body">
                ${this.renderCommentBody(rev.content)}
              </div>
              <div class="review-card-actions">
                <div class="review-likes-pill" title="${rev.like_count} likes">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                  <span>${rev.like_count}</span>
                </div>
                ${hasReplies ? `
                  <button type="button" class="review-replies-btn" id="btn-replies-${rev.id}" onclick="SConnect.toggleReviewReplies('${rev.id}')">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" class="replies-chevron"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    <span>${rev.comment_count} ${rev.comment_count === 1 ? 'reply' : 'replies'}</span>
                  </button>
                ` : ''}
              </div>
              ${hasReplies ? `
                <div class="review-replies-container" id="replies-container-${rev.id}" style="display:none;"></div>
              ` : ''}
            </div>
          `;
        }).join('');

        if (append) {
          listEl.insertAdjacentHTML('beforeend', cardsHTML);
        } else {
          listEl.innerHTML = cardsHTML;
        }

        // Handle Load More Button
        if (footerEl) {
          if (data.has_more) {
            footerEl.innerHTML = `
              <button type="button" class="review-load-more-btn" id="btn-load-more-reviews" onclick="SConnect.loadMoreReviews()">
                <span>Load More Comments</span>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
            `;
          } else {
            footerEl.innerHTML = reviews.length > 0 ? `<div class="reviews-end-indicator">All comments loaded</div>` : '';
          }
        }
      } catch (err) {
        console.error('Error loading bot reviews:', err);
        if (!append) {
          listEl.innerHTML = `
            <div class="reviews-empty-state">
              <p style="color:var(--c-amber, #f59e0b);">Unable to load comments at this moment. You can try refreshing.</p>
            </div>
          `;
        }
        if (footerEl) footerEl.innerHTML = '';
      }
    },

    async loadMoreReviews() {
      if (!this.currentReviewsBotId) return;
      await this.loadBotReviews(this.currentReviewsBotId, (this.currentReviewsPage || 1) + 1, this.currentReviewsSort || 'likes', true);
    },

    async toggleReviewReplies(reviewId) {
      const container = document.getElementById(`replies-container-${reviewId}`);
      const btn = document.getElementById(`btn-replies-${reviewId}`);
      if (!container || !btn) return;

      const isHidden = container.style.display === 'none';
      if (!isHidden) {
        container.style.display = 'none';
        btn.classList.remove('is-open');
        return;
      }

      container.style.display = 'block';
      btn.classList.add('is-open');

      if (container.dataset.loaded === 'true') {
        return;
      }

      container.innerHTML = `
        <div class="review-replies-loading">
          <span class="review-spinner"></span>
          <span>Loading replies...</span>
        </div>
      `;

      try {
        let resp = await fetch(`/api/connect/reviews/${encodeURIComponent(reviewId)}/replies`);
        if (resp.status === 404) {
          resp = await fetch(`/api/connect/search?q=${encodeURIComponent('__action:replies:' + reviewId)}&tag=__replies__`);
        }
        if (!resp.ok) throw new Error('Failed to fetch replies');
        const data = await resp.json();
        const replies = data.replies || [];

        if (replies.length === 0) {
          container.innerHTML = `<div class="review-reply-empty">No replies found.</div>`;
          container.dataset.loaded = 'true';
          return;
        }

        container.innerHTML = replies.map(rep => {
          const user = rep.user || {};
          const uName = user.name || 'Anonymous';
          const uInitial = uName.charAt(0).toUpperCase() || 'U';
          const uAvatar = user.avatar;
          const timeAgo = this.formatRelativeTime(rep.created_at);

          return `
            <div class="review-reply-card">
              <div class="review-reply-header">
                <div class="review-avatar-wrap is-small">
                  ${uAvatar ? `
                    <img src="${uAvatar}" class="review-avatar-img" alt="${this.escapeHTML(uName)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
                    <div class="review-avatar-fallback is-small" style="display:none;">${this.escapeHTML(uInitial)}</div>
                  ` : `
                    <div class="review-avatar-fallback is-small">${this.escapeHTML(uInitial)}</div>
                  `}
                </div>
                <div class="review-reply-meta">
                  <div class="review-user-name-row">
                    <span class="review-user-name is-reply">${this.escapeHTML(uName)}</span>
                    ${user.plus_badge ? `<span class="review-plus-pill" title="Janitor+ Subscriber">PLUS</span>` : ''}
                  </div>
                  ${timeAgo ? `<span class="review-timestamp">${timeAgo}</span>` : ''}
                </div>
              </div>
              <div class="review-reply-body">
                ${this.renderCommentBody(rep.content)}
              </div>
              ${rep.like_count > 0 ? `
                <div class="review-reply-actions">
                  <span class="review-reply-likes"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> ${rep.like_count}</span>
                </div>
              ` : ''}
            </div>
          `;
        }).join('');
        container.dataset.loaded = 'true';
      } catch (err) {
        console.error('Error loading replies:', err);
        container.innerHTML = `<div class="review-reply-empty" style="color:var(--c-amber,#f59e0b);">Unable to load replies.</div>`;
      }
    },

    // -------------------------------------------------------------------------
    // 3. FOLLOWING VIEW
    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // 3. FOLLOWING VIEW (Mixed / Interleaved Across Creators)
    // -------------------------------------------------------------------------
    _cachedFollowingBots: null,

    async renderFollowingView(container) {
      if (this.followingCreatorIds.size === 0) {
        try {
          const r = await fetch('/api/connect/following');
          if (r.ok) {
            const d = await r.json();
            if (Array.isArray(d.following) && d.following.length > 0) {
              d.following.forEach(id => { if (id) this.followingCreatorIds.add(String(id)); });
              localStorage.setItem('s_connect_following', JSON.stringify(Array.from(this.followingCreatorIds)));
            }
          }
        } catch (e) {}
      }
      const followingList = Array.from(this.followingCreatorIds);
      const hasCached = Array.isArray(this._cachedFollowingBots) && this._cachedFollowingBots.length > 0;

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
            ` : (hasCached ? this._cachedFollowingBots.map((b, i) => this.renderBotCardHTML(b, i)).join('') : Array.from({ length: 8 }, () => `<div class="bot-card skeleton"></div>`).join(''))}
          </div>
        </div>
      `;

      if (followingList.length > 0) {
        try {
          const params = new URLSearchParams();
          params.set('limit', '48');
          params.set('sort', 'latest');
          if (followingList.length > 0) {
            params.set('ids', followingList.join(','));
          }
          const res = await fetch(`/api/connect/following/feed?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            const bots = data.bots || (data.data && data.data.bots) || [];
            if (Array.isArray(bots)) {
              this._cachedFollowingBots = bots;
              bots.forEach(b => this.cacheBot(b));
              const grid = document.getElementById('following-grid');
              if (grid) {
                if (bots.length > 0) {
                  grid.innerHTML = bots.map((b, i) => this.renderBotCardHTML(b, i)).join('');
                } else {
                  grid.innerHTML = `<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--c-text-muted);">No cards found from your followed creators yet.</div>`;
                }
              }
            }
          }
        } catch (err) {
          console.warn('[S-Connect] Following feed fetch failed:', err);
        }
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

              <div class="claude-custom-select-wrap my-chats-custom-select-wrap" id="my-chats-top-sort-wrap">
                <button type="button" class="claude-custom-select-btn" onclick="SConnect.toggleCustomSelect('my-chats-top-sort-wrap', event)">
                  <span class="claude-custom-select-text">${sortCriterion === 'chats' ? 'Most Chats' : (sortCriterion === 'name' ? 'Alphabetical' : 'Latest')}</span>
                  <span class="claude-select-chevron">${ICONS.chevronDown}</span>
                </button>
                <div class="claude-custom-select-menu">
                  <div class="claude-select-option ${sortCriterion === 'latest' ? 'active' : ''}" onclick="SConnect.sortMyChats('latest')">
                    <span>Latest</span>
                    <span class="option-check">${ICONS.check}</span>
                  </div>
                  <div class="claude-select-option ${sortCriterion === 'chats' ? 'active' : ''}" onclick="SConnect.sortMyChats('chats')">
                    <span>Most Chats</span>
                    <span class="option-check">${ICONS.check}</span>
                  </div>
                  <div class="claude-select-option ${sortCriterion === 'name' ? 'active' : ''}" onclick="SConnect.sortMyChats('name')">
                    <span>Alphabetical</span>
                    <span class="option-check">${ICONS.check}</span>
                  </div>
                </div>
              </div>
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
      const visibleSessions = activeTab === 'published' ? sessions.filter(s => s.isPublished) : [...sessions];
      const isUnpublished = bot.is_unmasked === false || bot.is_unpublished || false;

      // Sort sessions for this specific bot drawer
      const drawerSort = (this._drawerSorts && this._drawerSorts[botId]) || 'latest';
      if (drawerSort === 'oldest') {
        visibleSessions.sort((a, b) => (a.updatedAt || a.createdAt || 0) - (b.updatedAt || b.createdAt || 0));
      } else if (drawerSort === 'count') {
        visibleSessions.sort((a, b) => (b.messageCount || 1) - (a.messageCount || 1));
      } else {
        visibleSessions.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
      }

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
                <span class="my-chats-count-text">chats: <span class="my-chats-count-num">${visibleSessions.length}</span></span>
              </div>
            </div>

            <div class="my-chats-char-right">
              ${isUnpublished ? `<span class="my-chats-unpub-badge">Unpublished</span>` : ''}
              <span class="my-chats-accordion-arrow">▼</span>
            </div>
          </div>

          <!-- Expanded Body (Screenshot 3) -->
          <div class="my-chats-expanded-body" id="my-chats-expanded-${botId}">
            <!-- Character Dossier Card -->
            <div class="my-chats-dossier-box">
              <div class="my-chats-dossier-desc">
                ${this.renderDossierSnippet(bot.description || bot.personality || 'Welcome to this roleplay scenario. Chat with this character and shape the unfolding story together.', bot.id)}
              </div>
              <div class="my-chats-dossier-actions">
                <div class="my-chats-nav-btns-group">
                  <button class="my-chats-action-pill-btn" onclick="SConnect.navigate('bot', { id: '${bot.id}' })">Character Page</button>
                  <button class="my-chats-action-pill-btn" onclick="SConnect.navigate('creator', { id: '${bot.creator_id || 'creator'}' })">Creator Profile</button>
                </div>
              </div>
            </div>

            <!-- Drawer Sort Dropdown with Latest, Oldest, Count (Screenshot 3 Reference) -->
            <div class="my-chats-drawer-sort-row">
              <div class="claude-custom-select-wrap my-chats-drawer-select-wrap" id="drawer-sort-wrap-${botId}">
                <button type="button" class="claude-custom-select-btn my-chats-drawer-select-btn" onclick="SConnect.toggleCustomSelect('drawer-sort-wrap-${botId}', event)">
                  <span class="claude-custom-select-text">${drawerSort === 'oldest' ? 'Oldest' : (drawerSort === 'count' ? 'Count' : 'Latest')}</span>
                  <span class="claude-select-chevron">${ICONS.chevronDown}</span>
                </button>
                <div class="claude-custom-select-menu">
                  <div class="claude-select-option ${drawerSort === 'latest' ? 'active' : ''}" onclick="SConnect.sortDrawerSessions('${bot.id}', 'latest')">
                    <span>Latest</span>
                    <span class="option-check">${ICONS.check}</span>
                  </div>
                  <div class="claude-select-option ${drawerSort === 'oldest' ? 'active' : ''}" onclick="SConnect.sortDrawerSessions('${bot.id}', 'oldest')">
                    <span>Oldest</span>
                    <span class="option-check">${ICONS.check}</span>
                  </div>
                  <div class="claude-select-option ${drawerSort === 'count' ? 'active' : ''}" onclick="SConnect.sortDrawerSessions('${bot.id}', 'count')">
                    <span>Count</span>
                    <span class="option-check">${ICONS.check}</span>
                  </div>
                </div>
              </div>
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
      this._drawerSorts = this._drawerSorts || {};
      this._drawerSorts[botId] = criteria;
      this._expandedBotId = botId;
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

      // Collect whatever we already have in local cache or bot cache for instant 0ms render
      const initialCards = [];
      for (const id of followingList) {
        let c = this.creatorCache ? this.creatorCache.get(id) : null;
        if (!c || !c.displayName || this.isUuid(c.displayName) || !c.avatar) {
          if (this.botCache) {
            for (const [_, b] of this.botCache) {
              if ((b.creator_id === id || (b.creator && b.creator.id === id)) && b.author && !this.isUuid(b.author)) {
                c = {
                  id,
                  username: b.creator?.username || b.author,
                  displayName: b.author,
                  avatar: b.creator_avatar || b.creator?.avatar || '',
                  followers: c?.followers || 0,
                  bio: c?.bio || 'JanitorAI creator crafting immersive character cards.'
                };
                break;
              }
            }
          }
        }
        if (c) initialCards.push(c);
      }

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
            ` : (initialCards.length > 0
                ? initialCards.map((c, i) => this.renderCreatorCardHTML(c, i)).join('')
                : Array.from({ length: Math.min(followingList.length, 6) }, () => `<div class="creator-card" style="opacity:0.4; height:120px;"></div>`).join('')
              )}
          </div>
        </div>
      `;

      if (followingList.length > 0) {
        try {
          let res = null;
          try {
            res = await fetch(`/api/connect/creators/batch?ids=${encodeURIComponent(followingList.join(','))}`).then(r => r.json());
          } catch (_) {}

          let creators = (res && Array.isArray(res.creators)) ? res.creators : [];
          if (creators.length === 0 && followingList.length > 0) {
            try {
              const ind = await Promise.all(
                followingList.map(cid =>
                  fetch(`/api/connect/creators/${encodeURIComponent(cid)}`)
                    .then(r => r.json())
                    .then(j => (j && j.data && j.data.creator) ? j.data.creator : null)
                    .catch(() => null)
                )
              );
              creators = ind.filter(Boolean);
            } catch (_) {}
          }

          creators.forEach(c => {
            if (c) this.cacheCreator(c);
          });

          // Build final list in exact order of followingList
          const finalCreators = followingList.map(id => {
            let found = creators.find(c => c && c.id === id);
            if (!found && this.creatorCache && this.creatorCache.has(id)) {
              found = this.creatorCache.get(id);
            }
            if (!found && this.botCache) {
              for (const [_, b] of this.botCache) {
                if ((b.creator_id === id || (b.creator && b.creator.id === id)) && b.author && !this.isUuid(b.author)) {
                  found = {
                    id,
                    username: b.creator?.username || b.author,
                    displayName: b.author,
                    avatar: b.creator_avatar || b.creator?.avatar || '',
                    followers: 0,
                    bio: 'JanitorAI creator crafting immersive character cards.'
                  };
                  break;
                }
              }
            }
            return found || { id, username: 'creator', displayName: 'Janitor Creator', followers: 0 };
          });

          const grid = document.getElementById('creators-page-grid');
          if (grid) {
            const newHTML = finalCreators.map((c, i) => this.renderCreatorCardHTML(c, i)).join('');
            if (grid.innerHTML !== newHTML) {
              grid.innerHTML = newHTML;
            }
          }
        } catch (e) {
          console.warn('Failed to refresh followed creators:', e);
        }
      }
    },

    async renderCreatorDetailView(container, creatorId) {
      this._activeCreatorId = creatorId;

      // Tier 1: Check cache or synthesize from botCache for 0ms instant display
      let creator = null;
      if (this.creatorCache && this.creatorCache.has(creatorId)) {
        creator = this.creatorCache.get(creatorId);
      }
      const authoredBots = [];
      if (this.botCache) {
        for (const [_, b] of this.botCache) {
          if (b && (b.creator_id === creatorId || (b.creator && b.creator.id === creatorId))) {
            authoredBots.push(b);
          }
        }
      }

      if (!creator || !creator.displayName || this.isUuid(creator.displayName)) {
        if (authoredBots.length > 0) {
          const first = authoredBots[0];
          creator = {
            id: creatorId,
            username: first.creator?.username || first.author || 'creator',
            displayName: first.author || first.creator?.username || 'Creator',
            avatar: first.creator_avatar || first.creator?.avatar || '',
            bio: (creator && creator.bio) || '',
            followers: (creator && creator.followers) || 0,
            totalBots: authoredBots.length
          };
        }
      }

      // If we have a cached creator profile, render immediately at 0ms
      if (creator && (creator.avatar || (creator.displayName && !this.isUuid(creator.displayName)))) {
        this.drawCreatorDetailPage(container, creator, authoredBots);
      } else {
        container.innerHTML = `
          <div class="bot-detail-page">
            <button class="back-nav-btn" onclick="SConnect.navigateBack()">
              ${ICONS.back}
              <span>Back</span>
            </button>
            <div style="padding:60px; text-align:center; color:var(--c-text-muted);">Loading creator profile...</div>
          </div>
        `;
      }

      // Tier 2: Asynchronously revalidate from server
      try {
        const res = await fetch(`/api/connect/creators/${encodeURIComponent(creatorId)}`).then(r => r.json());
        if (this.currentView !== 'creator' || this._activeCreatorId !== creatorId) return;

        const data = res.data || res;
        const freshCreator = data.creator || data;
        let freshBots = data.bots || [];

        if (freshBots.length === 0 && authoredBots.length > 0) {
          freshBots = authoredBots;
        }

        if (freshCreator) {
          if (freshCreator.id) this.cacheCreator(freshCreator);
          if (Array.isArray(freshBots)) {
            freshBots.forEach(b => this.cacheBot(b));
          }
          this.drawCreatorDetailPage(container, freshCreator, freshBots);
        }
      } catch (e) {
        console.warn('Failed to fetch full creator profile:', e);
        if (!creator && container) {
          container.innerHTML = `<div class="bot-detail-page"><button class="back-nav-btn" onclick="SConnect.navigateBack()">${ICONS.back} <span>Back</span></button><div style="color:var(--c-amber); padding:40px;">Creator not found.</div></div>`;
        }
      }
    },

    drawCreatorDetailPage(container, creator, bots = []) {
      const isFollowing = this.followingCreatorIds.has(creator.id);
      let cAvatar = creator.avatar || DEFAULT_AVATAR;
      if (cAvatar && cAvatar.includes('/bot-avatars/')) {
        cAvatar = cAvatar.replace('/bot-avatars/', '/avatars/');
      }
      let cName = creator.displayName || creator.username || 'Creator';
      if (this.isUuid(cName)) {
        if (bots.length > 0 && bots[0].author && !this.isUuid(bots[0].author)) {
          cName = bots[0].author;
        } else {
          cName = 'Janitor Creator';
        }
      }
      let cHandle = creator.username || 'creator';
      if (this.isUuid(cHandle)) {
        cHandle = cName.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'creator';
      }
      const followersCount = Number(creator.followers || 0);
      const totalCards = Math.max(Number(creator.totalBots || 0), bots.length);

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
                      <img class="profile-avatar pp-uc-avatar css-18bnokj" src="${cAvatar}" alt="${this.escapeHTML(cName)}" onerror="SConnect.handleAvatarError(this)">
                    </div>
                    <div class="creator-names-wrap profile-info-stack-inner css-8g8ihq">
                      <div class="profile-info-stack-inner-flex css-70qvj9">
                        <h1 class="creator-display-name profile-title-heading pp-uc-title css-o5an2m">${this.escapeHTML(cName)}</h1>
                        <div class="creator-meta-sub">@${this.escapeHTML(cHandle)}</div>
                      </div>
                    </div>
                  </div>

                  <div class="creator-header-right">
                    <div class="creator-stats-bar">
                      <div class="creator-stat-box pp-uc-followers-count profile-followers-count">
                        <span class="creator-stat-val">${this.formatNumber(followersCount)}</span>
                        <span class="creator-stat-lbl">Followers</span>
                      </div>
                      <div class="creator-stat-box pp-pg-total">
                        <span class="creator-stat-val">${totalCards}</span>
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
              <h2 class="section-title">Characters by ${this.escapeHTML(cName)}</h2>
              <span class="section-subtitle">${bots.length < totalCards ? `${bots.length} of ${totalCards} publicly available cards` : `${bots.length} publicly available cards`}</span>
            </div>
          </div>

          <div class="bot-cards-grid pp-cc-list-container profile-page-container-flex-box css-1bx5ylf">
            ${bots.length > 0 
              ? bots.map((b, i) => this.renderBotCardHTML(b, i)).join('')
              : `<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--c-text-muted);">No cards loaded yet for this creator.</div>`
            }
          </div>
        </div>
      `;
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
    // 7. MY PERSONAS ARCHITECTURE (JanitorAI Style Multi-Persona Matrix)
    // -------------------------------------------------------------------------
    _personasTab: 'all',
    _personasSort: 'default',
    _personasSearchQuery: '',
    _expandedPersonaIds: new Set(['persona_default']),
    _personaGlobalListenersBound: false,

    _initPersonaGlobalListeners() {
      if (this._personaGlobalListenersBound) return;
      this._personaGlobalListenersBound = true;
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#personas-sort-dropdown')) {
          const sortWrap = document.getElementById('personas-sort-dropdown');
          if (sortWrap) sortWrap.classList.remove('is-open');
        }
        if (!e.target.closest('.persona-custom-select-wrap')) {
          document.querySelectorAll('.persona-custom-select-wrap.is-open').forEach(el => el.classList.remove('is-open'));
        }
        if (!e.target.closest('.persona-dots-wrap')) {
          document.querySelectorAll('.persona-dots-wrap.is-open').forEach(el => el.classList.remove('is-open'));
        }
      });
    },

    formatPersonaDate(ts) {
      if (!ts) return 'Recently';
      const d = new Date(ts);
      if (isNaN(d.getTime())) return 'Recently';
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    },

    getPersonaGroups() {
      try {
        const raw = localStorage.getItem('s_connect_persona_groups');
        if (raw) {
          const groups = JSON.parse(raw);
          if (Array.isArray(groups)) {
            // Filter out old seed/mock groups
            const cleaned = groups.filter(g => g && !['new-age', 'sex', 'anime', 'all'].includes(g.toLowerCase()));
            return cleaned;
          }
        }
      } catch (e) {}
      return [];
    },

    showInlineNewGroupInput() {
      const container = document.getElementById('persona-new-group-container');
      if (!container) return;
      container.innerHTML = `
        <div class="persona-new-group-box">
          <input type="text" class="persona-new-group-input" id="persona-new-group-input" placeholder="Group name" maxlength="24" onkeydown="SConnect.onNewGroupInputKey(event)" onblur="SConnect.commitInlineNewGroup(false)" />
        </div>
      `;
      const input = document.getElementById('persona-new-group-input');
      if (input) {
        input.focus();
      }
    },

    onNewGroupInputKey(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.commitInlineNewGroup(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.cancelInlineNewGroup();
      }
    },

    cancelInlineNewGroup() {
      const container = document.getElementById('persona-new-group-container');
      if (!container) return;
      container.innerHTML = `
        <button type="button" class="persona-new-group-btn" id="persona-new-group-btn" onclick="SConnect.showInlineNewGroupInput()">
          <span>+ New group</span>
        </button>
      `;
    },

    commitInlineNewGroup(forceCommit) {
      const input = document.getElementById('persona-new-group-input');
      if (!input) return;
      const clean = input.value.trim();
      if (!clean) {
        this.cancelInlineNewGroup();
        return;
      }
      if (clean.toLowerCase() === 'all') {
        alert("Group cannot be named 'All'.");
        this.cancelInlineNewGroup();
        return;
      }
      const groups = this.getPersonaGroups();
      if (!groups.some(g => g.toLowerCase() === clean.toLowerCase())) {
        groups.push(clean);
        localStorage.setItem('s_connect_persona_groups', JSON.stringify(groups));
      }
      this._personasTab = clean;
      this.renderPersonasView();
    },

    setPersonaTab(tab) {
      this._personasTab = tab || 'all';
      this.renderPersonasView();
    },

    togglePersonaSortMenu(e) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      const wrap = document.getElementById('personas-sort-dropdown');
      if (wrap) {
        const isOpen = wrap.classList.toggle('is-open');
        if (isOpen) {
          document.querySelectorAll('.persona-custom-select-wrap.is-open').forEach(el => el.classList.remove('is-open'));
          document.querySelectorAll('.persona-dots-wrap.is-open').forEach(el => el.classList.remove('is-open'));
        }
      }
    },

    setPersonaSort(sortKey) {
      this._personasSort = sortKey;
      const wrap = document.getElementById('personas-sort-dropdown');
      if (wrap) wrap.classList.remove('is-open');
      this.renderPersonasView();
    },

    onPersonaSearch(val) {
      this._personasSearchQuery = (val || '').toLowerCase().trim();
      this.renderPersonasView();
    },

    toggleCustomSelect(e, wrapId) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      const wrap = document.getElementById(wrapId);
      if (!wrap) return;
      const isCurrentlyOpen = wrap.classList.contains('is-open');
      document.querySelectorAll('.persona-custom-select-wrap.is-open').forEach(el => el.classList.remove('is-open'));
      document.querySelectorAll('.persona-dots-wrap.is-open').forEach(el => el.classList.remove('is-open'));
      const sortWrap = document.getElementById('personas-sort-dropdown');
      if (sortWrap) sortWrap.classList.remove('is-open');

      if (!isCurrentlyOpen) {
        wrap.classList.add('is-open');
      }
    },

    selectPersonaGroup(e, id, group) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      const val = document.getElementById('persona-group-val-' + id);
      if (val) val.textContent = group;
      const wrap = document.getElementById('persona-group-select-' + id);
      if (wrap) wrap.classList.remove('is-open');
    },

    selectPersonaPronouns(e, id, pronoun) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      const val = document.getElementById('persona-pronouns-val-' + id);
      if (val) val.textContent = pronoun;
      const wrap = document.getElementById('persona-pronouns-select-' + id);
      if (wrap) wrap.classList.remove('is-open');
    },

    togglePersonaDotsMenu(e, id) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      const wrap = document.getElementById('persona-dots-wrap-' + id);
      if (!wrap) return;
      const isCurrentlyOpen = wrap.classList.contains('is-open');
      document.querySelectorAll('.persona-dots-wrap.is-open').forEach(el => el.classList.remove('is-open'));
      document.querySelectorAll('.persona-custom-select-wrap.is-open').forEach(el => el.classList.remove('is-open'));
      if (!isCurrentlyOpen) {
        wrap.classList.add('is-open');
      }
    },

    movePersonaToGroup(e, id, group) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      const personas = this.getPersonas();
      const p = personas.find(x => x && x.id === id);
      if (p) {
        p.group = group;
        p.updatedAt = Date.now();
        this.savePersonas(personas);
      }
      const wrap = document.getElementById('persona-dots-wrap-' + id);
      if (wrap) wrap.classList.remove('is-open');
      this.renderPersonasView();
    },

    promptNewGroupFromDotsMenu(e, id) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      const wrap = document.getElementById('persona-dots-wrap-' + id);
      if (wrap) wrap.classList.remove('is-open');
      const name = window.prompt('Enter new group name:');
      if (!name || !name.trim()) return;
      const clean = name.trim();
      if (clean.toLowerCase() === 'all') {
        alert("Group cannot be named 'All'.");
        return;
      }
      const groups = this.getPersonaGroups();
      if (!groups.some(g => g.toLowerCase() === clean.toLowerCase())) {
        groups.push(clean);
        localStorage.setItem('s_connect_persona_groups', JSON.stringify(groups));
      }
      const personas = this.getPersonas();
      const p = personas.find(x => x && x.id === id);
      if (p) {
        p.group = clean;
        p.updatedAt = Date.now();
        this.savePersonas(personas);
      }
      this.renderPersonasView();
    },

    clonePersonaFromDots(e, id) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      const wrap = document.getElementById('persona-dots-wrap-' + id);
      if (wrap) wrap.classList.remove('is-open');
      this.clonePersona(id);
    },

    deletePersonaFromDots(e, id) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      const wrap = document.getElementById('persona-dots-wrap-' + id);
      if (wrap) wrap.classList.remove('is-open');
      this.deletePersona(id);
    },

    toggleActivePersona(e, id) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      this.setActivePersona(id);
      this.renderPersonasView();
    },

    togglePersonaAccordion(id) {
      const card = document.getElementById('persona-card-' + id);
      if (!card) return;
      const arrow = document.getElementById('persona-arrow-' + id);
      const isExpanded = card.classList.toggle('is-expanded');
      if (isExpanded) {
        this._expandedPersonaIds.add(id);
        if (arrow) arrow.innerHTML = '&#9662;';
      } else {
        this._expandedPersonaIds.delete(id);
        if (arrow) arrow.innerHTML = '&#9656;';
      }
      this.renderPersonasView();
    },

    saveDefaultPersonaContext(id) {
      const textarea = document.getElementById('persona-context-' + id);
      const val = textarea ? textarea.value.trim() : '';
      const personas = this.getPersonas();
      const p = personas.find(x => x && (x.id === id || x.isDefault));
      if (p) {
        p.description = val;
        p.updatedAt = Date.now();
        this.savePersonas(personas);
      }
      const snippet = document.getElementById('persona-snippet-' + id);
      if (snippet) snippet.textContent = val || 'Nice guy';
      const btn = document.getElementById('persona-save-btn-' + id);
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = 'Saved ✓';
        setTimeout(() => { btn.textContent = orig; }, 1600);
      }
    },

    saveCustomPersona(id) {
      const nameInput = document.getElementById('persona-name-' + id);
      const textarea = document.getElementById('persona-context-' + id);
      const groupSpan = document.getElementById('persona-group-val-' + id);
      const pronounsSpan = document.getElementById('persona-pronouns-val-' + id);

      const newName = nameInput ? nameInput.value.trim() : 'Persona';
      const newDesc = textarea ? textarea.value.trim() : '';
      const newGroup = groupSpan ? groupSpan.textContent.trim() : 'Ungrouped';
      const newPronouns = pronounsSpan ? pronounsSpan.textContent.trim() : 'He/Him';

      const personas = this.getPersonas();
      const p = personas.find(x => x && x.id === id);
      if (p) {
        p.name = newName || 'Persona';
        p.description = newDesc;
        p.group = newGroup;
        p.pronouns = newPronouns;
        p.updatedAt = Date.now();
        this.savePersonas(personas);
      }

      const headerName = document.getElementById('persona-header-name-' + id);
      if (headerName) headerName.textContent = newName || 'Persona';
      const snippet = document.getElementById('persona-snippet-' + id);
      if (snippet) snippet.textContent = newDesc || 'No description set';

      const btn = document.getElementById('persona-save-btn-' + id);
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = 'Saved ✓';
        setTimeout(() => { btn.textContent = orig; }, 1600);
      }
    },

    clonePersona(id) {
      const personas = this.getPersonas();
      const p = personas.find(x => x && x.id === id);
      if (!p) return;
      const cloneId = 'persona_' + Date.now();
      const cloned = {
        ...p,
        id: cloneId,
        isDefault: false,
        name: (p.name || 'Persona') + ' (Clone)',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      personas.push(cloned);
      this.savePersonas(personas);
      this._expandedPersonaIds.add(cloneId);
      this.renderPersonasView();
    },

    deletePersona(id) {
      if (id === 'persona_default') {
        alert('Default persona cannot be deleted.');
        return;
      }
      if (!confirm('Are you sure you want to delete this persona?')) return;
      let personas = this.getPersonas();
      personas = personas.filter(p => p && p.id !== id);
      this.savePersonas(personas);
      this._expandedPersonaIds.delete(id);
      this.renderPersonasView();
    },

    createNewPersona() {
      const personas = this.getPersonas();
      const newId = 'persona_' + Date.now();
      const defaultGroup = (this._personasTab && this._personasTab.toLowerCase() !== 'all') ? this._personasTab : 'Ungrouped';
      const newPersona = {
        id: newId,
        isDefault: false,
        name: 'New Persona',
        avatar: '/static/preloader/3a6a0a99717d5533928eecd2046ec085.jpg',
        description: '',
        group: defaultGroup,
        pronouns: 'He/Him',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      personas.push(newPersona);
      this.savePersonas(personas);
      this._expandedPersonaIds.add(newId);
      this.renderPersonasView();

      setTimeout(() => {
        const card = document.getElementById('persona-card-' + newId);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const nameInput = document.getElementById('persona-name-' + newId);
          if (nameInput) {
            nameInput.focus();
            nameInput.select();
          }
        }
      }, 60);
    },

    changePersonaAvatar(id) {
      this._avatarTargetPersonaId = id;
      const input = document.getElementById('persona-file-input');
      if (input) {
        input.value = '';
        input.click();
      }
    },

    onPersonaFileSelected(input) {
      if (!input.files || !input.files[0]) return;
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        const id = this._avatarTargetPersonaId;
        if (!id) return;
        const img = document.getElementById('persona-avatar-img-' + id);
        if (img) img.src = dataUrl;
        const thumb = document.querySelector(`#persona-card-${id} .persona-avatar-thumb`);
        if (thumb) thumb.src = dataUrl;

        const personas = this.getPersonas();
        const p = personas.find(x => x && x.id === id);
        if (p) {
          p.avatar = dataUrl;
          p.updatedAt = Date.now();
          this.savePersonas(personas);
        }
      };
      reader.readAsDataURL(file);
    },

    renderPersonasView(container) {
      this._initPersonaGlobalListeners();
      if (!container) container = document.getElementById('connect-main-view');
      if (!container) return;

      const allPersonas = this.getPersonas();
      const groups = this.getPersonaGroups();
      const activePersona = this.getActivePersona();
      const activePersonaId = (activePersona && activePersona.id) || 'persona_default';

      let filtered = allPersonas.filter(p => {
        if (!p) return false;
        if (this._personasTab && this._personasTab.toLowerCase() !== 'all') {
          if ((p.group || 'ungrouped').toLowerCase() !== this._personasTab.toLowerCase()) {
            return false;
          }
        }
        if (this._personasSearchQuery) {
          const q = this._personasSearchQuery;
          const matchName = (p.name || '').toLowerCase().includes(q);
          const matchDesc = (p.description || '').toLowerCase().includes(q);
          if (!matchName && !matchDesc) return false;
        }
        return true;
      });

      if (this._personasSort === 'oldest') {
        filtered.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      } else if (this._personasSort === 'newest') {
        filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      } else if (this._personasSort === 'last_edited') {
        filtered.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
      } else if (this._personasSort === 'alphabetical') {
        filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      } else {
        filtered.sort((a, b) => {
          if (a.id === 'persona_default' || a.isDefault) return -1;
          if (b.id === 'persona_default' || b.isDefault) return 1;
          return 0;
        });
      }

      const sortMap = {
        default: 'Default',
        oldest: 'Oldest',
        newest: 'Newest',
        last_edited: 'Last edited',
        alphabetical: 'Alphabetical'
      };
      const sortLabel = sortMap[this._personasSort] || 'Default';

      const allCount = allPersonas.length;
      const activeGroupCount = (this._personasTab === 'all')
        ? allCount
        : allPersonas.filter(p => (p.group || 'ungrouped').toLowerCase() === this._personasTab.toLowerCase()).length;

      container.innerHTML = `
        <div class="personas-view-wrapper">
          <!-- Hidden file input for custom persona avatar upload -->
          <input type="file" id="persona-file-input" style="display:none;" accept="image/*" onchange="SConnect.onPersonaFileSelected(this)" />

          <!-- Header Row -->
          <div class="personas-header-row">
            <h1 class="personas-page-title">My Personas</h1>
            <button class="personas-new-btn" onclick="SConnect.createNewPersona()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>New persona</span>
            </button>
          </div>

          <!-- Controls Row: Search + Sort Dropdown -->
          <div class="personas-controls-row">
            <div class="personas-search-wrap">
              <svg class="personas-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" class="personas-search-input" placeholder="Search personas" value="${this.escapeHTML(this._personasSearchQuery || '')}" oninput="SConnect.onPersonaSearch(this.value)" />
            </div>

            <div class="personas-sort-wrap" id="personas-sort-dropdown">
              <button class="personas-sort-btn" onclick="SConnect.togglePersonaSortMenu(event)">
                <span id="personas-sort-label">${sortLabel}</span>
                <span class="personas-sort-arrow">&#9662;</span>
              </button>
              <div class="personas-sort-menu">
                <button class="personas-sort-option ${this._personasSort === 'default' ? 'is-active' : ''}" onclick="SConnect.setPersonaSort('default')">Default</button>
                <button class="personas-sort-option ${this._personasSort === 'oldest' ? 'is-active' : ''}" onclick="SConnect.setPersonaSort('oldest')">Oldest</button>
                <button class="personas-sort-option ${this._personasSort === 'newest' ? 'is-active' : ''}" onclick="SConnect.setPersonaSort('newest')">Newest</button>
                <button class="personas-sort-option ${this._personasSort === 'last_edited' ? 'is-active' : ''}" onclick="SConnect.setPersonaSort('last_edited')">Last edited</button>
                <button class="personas-sort-option ${this._personasSort === 'alphabetical' ? 'is-active' : ''}" onclick="SConnect.setPersonaSort('alphabetical')">Alphabetical</button>
              </div>
            </div>
          </div>

          <!-- Heading Block -->
          <div class="personas-heading-block">
            <h2 class="personas-count-heading">Your personas (${activeGroupCount})</h2>
            <p class="personas-count-sub">Create and manage personas you use in chats.</p>
          </div>

          <!-- Category Filter Tabs Bar: Only 'All' by default + Inline New Group transformation -->
          <div class="personas-groups-bar">
            <button class="persona-group-pill ${this._personasTab === 'all' ? 'is-active' : ''}" onclick="SConnect.setPersonaTab('all')">
              <span>All</span>
              <span class="persona-group-count">${allCount}</span>
            </button>
            ${groups.map(grp => {
              const grpCount = allPersonas.filter(p => (p.group || '').toLowerCase() === grp.toLowerCase()).length;
              return `
                <button class="persona-group-pill ${this._personasTab.toLowerCase() === grp.toLowerCase() ? 'is-active' : ''}" onclick="SConnect.setPersonaTab('${this.escapeHTML(grp)}')">
                  <span>${this.escapeHTML(grp)}</span>
                  <span class="persona-group-count">${grpCount}</span>
                </button>
              `;
            }).join('')}
            <div class="persona-new-group-container" id="persona-new-group-container">
              <button type="button" class="persona-new-group-btn" id="persona-new-group-btn" onclick="SConnect.showInlineNewGroupInput()">
                <span>+ New group</span>
              </button>
            </div>
          </div>

          <!-- Personas Accordion List -->
          <div class="personas-card-list">
            ${filtered.length === 0 ? `
              <div style="padding: 48px; text-align: center; color: #9ca3af; background: #20222a; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
                No personas found matching your search.
              </div>
            ` : filtered.map(p => {
              const isDefault = p.isDefault || p.id === 'persona_default';
              const isExpanded = this._expandedPersonaIds.has(p.id);
              const isActive = (p.id === activePersonaId);

              if (isDefault) {
                return `
                  <div class="persona-card ${isExpanded ? 'is-expanded' : ''}" id="persona-card-${p.id}">
                    <div class="persona-summary-row" ${!isExpanded ? `onclick="SConnect.togglePersonaAccordion('${p.id}')"` : ''}>
                      <div class="persona-summary-left">
                        <span class="persona-accordion-arrow" id="persona-arrow-${p.id}" onclick="SConnect.togglePersonaAccordion('${p.id}')">${isExpanded ? '&#9662;' : '&#9656;'}</span>
                        <div class="persona-inline-avatar-btn is-disabled" title="Default persona avatar is linked to your user profile">
                          <img src="${p.avatar || DEFAULT_AVATAR}" class="persona-avatar-thumb" alt="${this.escapeHTML(p.name)}" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';" />
                        </div>
                        ${isExpanded ? `
                          <div class="persona-inline-name-wrap">
                            <span class="persona-name-pen-icon" style="opacity: 0.4;" title="Default persona name cannot be changed">&#9998;</span>
                            <input type="text" class="persona-inline-name-input" value="${this.escapeHTML(p.name)}" readonly title="Default persona name cannot be changed" />
                          </div>
                        ` : `
                          <div class="persona-summary-meta">
                            <div class="persona-summary-name">${this.escapeHTML(p.name)}</div>
                            <div class="persona-summary-snippet" id="persona-snippet-${p.id}">${this.escapeHTML(p.description || 'Nice guy')}</div>
                          </div>
                        `}
                      </div>
                      <div class="persona-summary-right">
                        <span class="persona-default-badge">Default</span>
                        <button type="button" class="persona-custom-check ${isActive ? 'is-checked' : ''}" onclick="SConnect.toggleActivePersona(event, '${p.id}')" title="${isActive ? 'Active Persona' : 'Set as Active Persona'}">
                          ${isActive ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
                        </button>
                      </div>
                    </div>
                    <div class="persona-expanded-body">
                      <div class="persona-badge-uppercase">DEFAULT PERSONA</div>
                      <textarea class="persona-context-textarea" id="persona-context-${p.id}" placeholder="Persona context / scenario notes">${this.escapeHTML(p.description || '')}</textarea>
                      <div class="persona-bottom-actions">
                        <button type="button" class="persona-cancel-btn" onclick="SConnect.togglePersonaAccordion('${p.id}')">Cancel</button>
                        <button type="button" class="persona-save-btn" id="persona-save-btn-${p.id}" onclick="SConnect.saveDefaultPersonaContext('${p.id}')">Save Changes</button>
                      </div>
                    </div>
                  </div>
                `;
              }

              // Custom Persona Card (Single top row when expanded, NO duplicate body row)
              return `
                <div class="persona-card ${isExpanded ? 'is-expanded' : ''}" id="persona-card-${p.id}">
                  <div class="persona-summary-row" ${!isExpanded ? `onclick="SConnect.togglePersonaAccordion('${p.id}')"` : ''}>
                    <div class="persona-summary-left">
                      <span class="persona-accordion-arrow" id="persona-arrow-${p.id}" onclick="SConnect.togglePersonaAccordion('${p.id}')">${isExpanded ? '&#9662;' : '&#9656;'}</span>
                      ${isExpanded ? `
                        <div class="persona-inline-avatar-btn" onclick="SConnect.changePersonaAvatar('${p.id}')" title="Click to change photo">
                          <img src="${p.avatar || DEFAULT_AVATAR}" class="persona-avatar-thumb" id="persona-avatar-img-${p.id}" alt="${this.escapeHTML(p.name)}" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';" />
                          <span class="persona-inline-avatar-edit-icon" title="Change photo">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                          </span>
                        </div>
                        <div class="persona-inline-name-wrap">
                          <span class="persona-name-pen-icon" onclick="document.getElementById('persona-name-${p.id}')?.focus()">&#9998;</span>
                          <input type="text" class="persona-inline-name-input" id="persona-name-${p.id}" value="${this.escapeHTML(p.name)}" placeholder="Persona name" onclick="event.stopPropagation();" />
                        </div>
                      ` : `
                        <img src="${p.avatar || DEFAULT_AVATAR}" class="persona-avatar-thumb" alt="${this.escapeHTML(p.name)}" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';" />
                        <div class="persona-summary-meta">
                          <div class="persona-summary-name" id="persona-header-name-${p.id}">${this.escapeHTML(p.name)}</div>
                          <div class="persona-summary-snippet" id="persona-snippet-${p.id}">${this.escapeHTML(p.description || 'No description set')}</div>
                        </div>
                      `}
                    </div>
                    <div class="persona-summary-right">
                      ${!isExpanded ? `
                        <!-- 3-Dots wrap & button (hidden when persona is open) -->
                        <div class="persona-dots-wrap" id="persona-dots-wrap-${p.id}">
                          <button type="button" class="persona-dots-btn" onclick="SConnect.togglePersonaDotsMenu(event, '${p.id}')" title="More options" aria-label="More options">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="5" cy="12" r="2"></circle>
                              <circle cx="12" cy="12" r="2"></circle>
                              <circle cx="19" cy="12" r="2"></circle>
                            </svg>
                          </button>
                          <div class="persona-dots-menu" id="persona-dots-menu-${p.id}">
                            <div class="persona-dots-menu-title">${this.escapeHTML(p.name)}</div>
                            <div class="persona-dots-menu-subtitle">MOVE TO GROUP</div>
                            <div class="persona-dots-menu-groups">
                              <button type="button" class="persona-dots-menu-item ${(!p.group || p.group === 'Ungrouped') ? 'is-current' : ''}" onclick="SConnect.movePersonaToGroup(event, '${p.id}', 'Ungrouped')">
                                <span class="persona-dots-check-icon">${(!p.group || p.group === 'Ungrouped') ? '&#10003;' : ''}</span>
                                <span>Ungrouped</span>
                              </button>
                              ${groups.map(g => `
                                <button type="button" class="persona-dots-menu-item ${(p.group === g) ? 'is-current' : ''}" onclick="SConnect.movePersonaToGroup(event, '${p.id}', '${this.escapeHTML(g)}')">
                                  <span class="persona-dots-check-icon">${(p.group === g) ? '&#10003;' : ''}</span>
                                  <span>${this.escapeHTML(g)}</span>
                                </button>
                              `).join('')}
                              <button type="button" class="persona-dots-menu-item persona-dots-newgroup-btn" onclick="SConnect.promptNewGroupFromDotsMenu(event, '${p.id}')">
                                <span class="persona-dots-check-icon">+</span>
                                <span>New group</span>
                              </button>
                            </div>
                            <div class="persona-dots-divider"></div>
                            <button type="button" class="persona-dots-menu-item" onclick="SConnect.clonePersonaFromDots(event, '${p.id}')">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                              <span>Clone persona</span>
                            </button>
                            <button type="button" class="persona-dots-menu-item is-danger" onclick="SConnect.deletePersonaFromDots(event, '${p.id}')">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ` : ''}
                      <!-- Custom Checkbox -->
                      <button type="button" class="persona-custom-check ${isActive ? 'is-checked' : ''}" onclick="SConnect.toggleActivePersona(event, '${p.id}')" title="${isActive ? 'Active Persona' : 'Set as Active Persona'}">
                        ${isActive ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
                      </button>
                    </div>
                  </div>
                  <div class="persona-expanded-body">
                    <!-- Context Textarea directly on top (No duplicate name/avatar row) -->
                    <textarea class="persona-context-textarea" id="persona-context-${p.id}" placeholder="Persona description, traits, or context">${this.escapeHTML(p.description || '')}</textarea>

                    <!-- Group Field Row -->
                    <div class="persona-field-row">
                      <div class="persona-field-label">Group</div>
                      <div class="persona-custom-select-wrap" id="persona-group-select-${p.id}">
                        <button type="button" class="persona-custom-select-btn" onclick="SConnect.toggleCustomSelect(event, 'persona-group-select-${p.id}')">
                          <span id="persona-group-val-${p.id}">${this.escapeHTML(p.group || 'Ungrouped')}</span>
                          <span style="font-size:10px; color:#9ca3af; pointer-events:none;">&#9662;</span>
                        </button>
                        <div class="persona-custom-select-menu">
                          <button type="button" class="persona-custom-select-option" onclick="SConnect.selectPersonaGroup(event, '${p.id}', 'Ungrouped')">Ungrouped</button>
                          ${groups.map(g => `<button type="button" class="persona-custom-select-option" onclick="SConnect.selectPersonaGroup(event, '${p.id}', '${this.escapeHTML(g)}')">${this.escapeHTML(g)}</button>`).join('')}
                        </div>
                      </div>
                    </div>

                    <!-- Pronouns Field Row -->
                    <div class="persona-field-row">
                      <div class="persona-field-label">Pronouns</div>
                      <div class="persona-custom-select-wrap" id="persona-pronouns-select-${p.id}">
                        <button type="button" class="persona-custom-select-btn" onclick="SConnect.toggleCustomSelect(event, 'persona-pronouns-select-${p.id}')">
                          <span id="persona-pronouns-val-${p.id}">${this.escapeHTML(p.pronouns || 'He/Him')}</span>
                          <span style="font-size:10px; color:#9ca3af; pointer-events:none;">&#9662;</span>
                        </button>
                        <div class="persona-custom-select-menu">
                          <button type="button" class="persona-custom-select-option" onclick="SConnect.selectPersonaPronouns(event, '${p.id}', 'He/Him')">He/Him</button>
                          <button type="button" class="persona-custom-select-option" onclick="SConnect.selectPersonaPronouns(event, '${p.id}', 'She/Her')">She/Her</button>
                          <button type="button" class="persona-custom-select-option" onclick="SConnect.selectPersonaPronouns(event, '${p.id}', 'They/Them')">They/Them</button>
                          <button type="button" class="persona-custom-select-option" onclick="SConnect.selectPersonaPronouns(event, '${p.id}', 'Any')">Any</button>
                        </div>
                      </div>
                    </div>

                    <div class="persona-timestamps-row">Created ${this.formatPersonaDate(p.createdAt)} &middot; Updated ${this.formatPersonaDate(p.updatedAt)}</div>

                    <div class="persona-upper-actions">
                      <button type="button" class="persona-clone-btn" onclick="SConnect.clonePersona('${p.id}')">Clone persona</button>
                      <button type="button" class="persona-delete-btn" onclick="SConnect.deletePersona('${p.id}')">Delete</button>
                    </div>

                    <div class="persona-bottom-actions">
                      <button type="button" class="persona-cancel-btn" onclick="SConnect.togglePersonaAccordion('${p.id}')">Cancel</button>
                      <button type="button" class="persona-save-btn" id="persona-save-btn-${p.id}" onclick="SConnect.saveCustomPersona('${p.id}')">Save Changes</button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    },

    // -------------------------------------------------------------------------
    // ACTIONS & CONTROLS
    // -------------------------------------------------------------------------
    openBotDetail(botId) {
      this.resetScrollToTop();
      this.navigate('bot', { id: botId });
      this.resetScrollToTop();
    },

    openCreatorDetail(creatorId) {
      this.resetScrollToTop();
      this.navigate('creator', { id: creatorId });
      this.resetScrollToTop();
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
      let creatorMeta = {};
      if (this.creatorCache && this.creatorCache.has(creatorId)) {
        creatorMeta = this.creatorCache.get(creatorId);
      } else if (this.activeCreator && this.activeCreator.id === creatorId) {
        creatorMeta = this.activeCreator;
      }

      if ((!creatorMeta.displayName || this.isUuid(creatorMeta.displayName) || !creatorMeta.avatar) && this.botCache) {
        for (const [_, b] of this.botCache) {
          if ((b.creator_id === creatorId || (b.creator && b.creator.id === creatorId)) && b.author && !this.isUuid(b.author)) {
            creatorMeta = {
              ...creatorMeta,
              id: creatorId,
              name: b.author,
              displayName: b.author,
              username: b.creator?.username || b.author,
              avatar: b.creator_avatar || b.creator?.avatar || creatorMeta.avatar || ''
            };
            break;
          }
        }
      }

      if (isFollowing) {
        this.followingCreatorIds.delete(creatorId);
        if (btn) {
          btn.classList.remove('is-following');
          btn.innerHTML = `+ <span>Follow</span>`;
        }
        // Explicit atomic delete in cloud and SQLite
        fetch(`/api/connect/creators/${encodeURIComponent(creatorId)}/follow`, {
          method: 'DELETE'
        }).catch(() => {});
      } else {
        this.followingCreatorIds.add(creatorId);
        if (btn) {
          btn.classList.add('is-following');
          btn.innerHTML = `${ICONS.check} <span>Following</span>`;
        }
        if (creatorMeta && creatorMeta.id) {
          this.cacheCreator(creatorMeta);
        }
        // Explicit atomic save in cloud and SQLite
        const payloadName = creatorMeta.displayName || creatorMeta.name;
        fetch(`/api/connect/creators/${encodeURIComponent(creatorId)}/follow`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: creatorId,
            name: (payloadName && !this.isUuid(payloadName)) ? payloadName : 'Creator',
            username: (creatorMeta.username && !this.isUuid(creatorMeta.username)) ? creatorMeta.username : 'creator',
            avatar: creatorMeta.avatar || '',
            bio: creatorMeta.bio || ''
          })
        }).catch(() => {});
      }
      localStorage.setItem('s_connect_following', JSON.stringify(Array.from(this.followingCreatorIds)));
      this._cachedFollowingBots = null;

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
      let personas = [];
      try {
        personas = JSON.parse(localStorage.getItem('s_connect_personas') || '[]');
        if (!Array.isArray(personas)) personas = [];
      } catch (e) {
        personas = [];
      }

      const userName = (localStorage.getItem('singularity_user_name') || 'Insomniac').trim() || 'Operator';
      const userAvatar = (localStorage.getItem('singularity_user_avatar') || localStorage.getItem('singularity_user_avatar_url') || DEFAULT_AVATAR).trim();

      let defaultPersona = personas.find(p => p && (p.id === 'persona_default' || p.isDefault));
      if (!defaultPersona) {
        defaultPersona = {
          id: 'persona_default',
          isDefault: true,
          name: userName,
          avatar: userAvatar,
          description: 'Nice guy',
          group: 'All',
          pronouns: 'He/Him',
          createdAt: Date.now() - 86400000 * 90,
          updatedAt: Date.now() - 86400000 * 10
        };
        personas.unshift(defaultPersona);
      } else {
        defaultPersona.name = userName;
        defaultPersona.avatar = userAvatar;
        defaultPersona.isDefault = true;
      }

      // Sanitize legacy mock groups so only user-created groups and 'All' exist
      personas.forEach(p => {
        if (p && p.group && ['new-age', 'sex', 'anime'].includes(p.group.toLowerCase())) {
          p.group = 'Ungrouped';
        }
      });

      // Seed sample personas from reference on first load if only default exists
      if (personas.length === 1 && !localStorage.getItem('s_connect_personas_seeded')) {
        const samples = [
          {
            id: 'persona_kenji',
            name: 'Kenji',
            avatar: '/static/preloader/3a6a0a99717d5533928eecd2046ec085.jpg',
            description: 'Kenji, white hair, sunglasses, cocky',
            group: 'Ungrouped',
            pronouns: 'He/Him',
            createdAt: Date.now() - 86400000 * 60,
            updatedAt: Date.now() - 86400000 * 5
          },
          {
            id: 'persona_loid',
            name: 'Loid',
            avatar: '/static/preloader/3a6a0a99717d5533928eecd2046ec085.jpg',
            description: '[Loid\'s Name; ("Loid Forger") Loid\'s hair color ("Blond" + "Short" + "Undercut")]',
            group: 'Ungrouped',
            pronouns: 'He/Him',
            createdAt: Date.now() - 86400000 * 50,
            updatedAt: Date.now() - 86400000 * 4
          },
          {
            id: 'persona_yor',
            name: 'Yor',
            avatar: '/static/preloader/3a6a0a99717d5533928eecd2046ec085.jpg',
            description: '[Yor\'s Name ("Yor" + "Yor Forger") Yor\'s hair color ("Jet black" + "Long and straight")]',
            group: 'Ungrouped',
            pronouns: 'She/Her',
            createdAt: Date.now() - 86400000 * 40,
            updatedAt: Date.now() - 86400000 * 2
          }
        ];
        personas.push(...samples);
        localStorage.setItem('s_connect_personas_seeded', 'true');
        localStorage.setItem('s_connect_personas', JSON.stringify(personas));
      }

      return personas;
    },

    savePersonas(personas) {
      try {
        localStorage.setItem('s_connect_personas', JSON.stringify(personas));
        window.dispatchEvent(new CustomEvent('singularity-cloud-sync-needed'));
      } catch (e) {
        console.warn('Failed to save personas:', e);
      }
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

      // 0. Remove thinking tags if present (e.g. from models outputting <antThinking> or <think>)
      str = str.replace(/<antThinking>[\s\S]*?<\/antThinking>/gi, '');
      str = str.replace(/<antThinking>[\s\S]*$/gi, '');
      str = str.replace(/<think>[\s\S]*?<\/think>/gi, '');
      str = str.replace(/<think>[\s\S]*$/gi, '');

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

    getBotChatName(bot) {
      if (!bot) return 'Character';
      if (bot.chat_name && typeof bot.chat_name === 'string' && bot.chat_name.trim()) {
        return bot.chat_name.trim();
      }
      if (bot.character_chat_name && typeof bot.character_chat_name === 'string' && bot.character_chat_name.trim()) {
        return bot.character_chat_name.trim();
      }
      if (bot.char_name && typeof bot.char_name === 'string' && bot.char_name.trim()) {
        return bot.char_name.trim();
      }
      if (bot.character_name && typeof bot.character_name === 'string' && bot.character_name.trim()) {
        return bot.character_name.trim();
      }

      const raw = String(bot.name || '').trim();
      if (!raw) return 'Character';

      // Pipe delimiter: e.g. "Still Yours, My Love.. | Nessa" or "Nessa | The Cold Knight"
      if (raw.includes('|')) {
        const parts = raw.split('|').map(s => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const p0 = parts[0];
          const p1 = parts[1];
          const words0 = p0.split(/\s+/).length;
          const words1 = p1.split(/\s+/).length;
          if (words1 <= 3 && p1.length <= 25) return p1;
          if (words0 <= 3 && p0.length <= 25) return p0;
          return p1;
        }
      }

      // Hyphen / dash delimiter: e.g. "Still Yours - Nessa" or "Nessa - The Cold Knight"
      if (raw.includes(' - ') || raw.includes(' — ')) {
        const sep = raw.includes(' - ') ? ' - ' : ' — ';
        const parts = raw.split(sep).map(s => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const p0 = parts[0];
          const p1 = parts[1];
          if (p1.split(/\s+/).length <= 3 && p1.length <= 25) return p1;
          if (p0.split(/\s+/).length <= 3 && p0.length <= 25) return p0;
        }
      }

      // Bracketed name: e.g. "[Nessa] The Cold Knight" or "The Cold Knight [Nessa]"
      const bracketMatch = raw.match(/\[([A-Z][a-zA-Z0-9_\s]{1,20})\]/);
      if (bracketMatch && bracketMatch[1]) {
        return bracketMatch[1].trim();
      }

      // Long title fallback
      if (raw.length > 28) {
        const tokens = raw.split(/[:;,]/);
        if (tokens.length > 1 && tokens[0].trim().length <= 25) {
          return tokens[0].trim();
        }
      }

      return raw;
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
      const charChatName = this.getBotChatName(bot);

      let history = this.getChatMessages(session.id);
      if (!history || history.length === 0) {
        const greetingRaw = greetings[greetingIdx] || greetings[0] || `*${charChatName} stands before you.* "Hey."`;
        const formattedGreeting = this.replaceMacros(greetingRaw, charChatName, persona.name);
        history = [
          {
            id: 'msg_' + Date.now(),
            role: 'assistant',
            author: charChatName,
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
      const bgImg = settings.customBg || ''; // Base background image of chat is black screen unless customBg is set

      container.innerHTML = `
        <div class="janitor-chat-view" id="janitor-chat-view">
          <!-- Background image layer with opacity & blur -->
          <div class="janitor-chat-bg-layer" id="janitor-chat-bg-layer" style="${bgImg ? `background-image: url('${bgImg}');` : ''} opacity: ${settings.bgOpacity / 100}; filter: blur(${settings.bgBlur}px);"></div>

          <!-- Top Sticky Header (Exact match to screenshot) -->
          <header class="janitor-chat-header">
            <button class="janitor-chat-back-btn" onclick="SConnect.navigateBack()" title="Back">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"></polyline></svg>
              <span>Back</span>
            </button>

            <div class="janitor-chat-title" onclick="SConnect.navigate('bot', { id: '${bot.id}' })" title="View Bot Card Details: ${this.escapeHTML(bot.name)}">
              ${isUnmasked ? ICONS.unlock : ICONS.lock}
              <span class="janitor-header-bot-name">${this.escapeHTML(charChatName)}</span>
            </div>

            <div class="janitor-chat-header-actions">
              <div class="janitor-proxy-pill" onclick="SConnect.openChatSettingsModal('${bot.id}')" title="Proxy settings">
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
                  <!-- Model & Intelligence (Custom Selector & Thinking Slider) -->
                  <div class="janitor-card-group">
                    <div class="janitor-card-title-row">
                      <span class="janitor-card-heading">Model &amp; Intelligence</span>
                      <span class="janitor-active-model-badge" id="janitor-active-model-badge">${settings.model || 'kimi-k3'}</span>
                    </div>

                    <!-- Custom Model Selector -->
                    <div class="janitor-custom-model-selector" id="janitor-model-selector-wrap">
                      <label class="janitor-field-label">Active Model</label>
                      <input type="hidden" id="janitor-chat-model-val" value="${settings.model || 'kimi-k3'}" />
                      <div class="janitor-model-trigger" id="janitor-model-trigger" onclick="SConnect.toggleChatModelDropdown(event)">
                        <div class="janitor-model-trigger-left">
                          <span class="janitor-model-provider-dot"></span>
                          <span class="janitor-model-trigger-name" id="janitor-model-trigger-name">${settings.model || 'kimi-k3'}</span>
                        </div>
                        <span class="janitor-model-chevron">${ICONS.chevronDown}</span>
                      </div>
                      
                      <!-- Custom Popover Dropdown -->
                      <div class="janitor-model-dropdown-menu" id="janitor-model-dropdown-menu" style="display: none;">
                        <div class="janitor-model-search-box">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                          <input type="text" id="janitor-model-search-input" placeholder="Search models (kimi, deepseek, gpt, claude)..." oninput="SConnect.filterChatModelOptions(this.value)" />
                        </div>
                        <div class="janitor-model-options-list" id="janitor-model-options-list">
                          <!-- Populated dynamically -->
                        </div>
                      </div>
                    </div>

                    <!-- Thinking Budget Range Slider & Presets (Identical to Playground) -->
                    <div class="janitor-slider-row" style="margin-top: 14px;">
                      <div class="janitor-slider-header">
                        <span class="janitor-slider-label">Thinking Budget Cap</span>
                        <span class="janitor-slider-badge" id="janitor-thinking-val">${(settings.thinking_budget > 0) ? (Number(settings.thinking_budget).toLocaleString() + ' tokens') : 'Off (0)'}</span>
                      </div>
                      <input 
                        type="range" 
                        id="janitor-thinking-slider" 
                        class="janitor-purple-slider" 
                        min="0" 
                        max="65536" 
                        step="1024" 
                        value="${settings.thinking_budget || 0}" 
                        oninput="SConnect.onChatThinkingSliderInput(this.value)" 
                      />
                      <div class="janitor-thinking-presets-row" id="janitor-thinking-presets">
                        <button type="button" class="janitor-preset-btn ${(!settings.thinking_budget || settings.thinking_budget === 0) ? 'active' : ''}" data-tokens="0" onclick="SConnect.setChatThinkingPreset(0)">Off</button>
                        <button type="button" class="janitor-preset-btn ${settings.thinking_budget === 2048 ? 'active' : ''}" data-tokens="2048" onclick="SConnect.setChatThinkingPreset(2048)">2K</button>
                        <button type="button" class="janitor-preset-btn ${settings.thinking_budget === 4096 ? 'active' : ''}" data-tokens="4096" onclick="SConnect.setChatThinkingPreset(4096)">4K</button>
                        <button type="button" class="janitor-preset-btn ${settings.thinking_budget === 8192 ? 'active' : ''}" data-tokens="8192" onclick="SConnect.setChatThinkingPreset(8192)">8K</button>
                        <button type="button" class="janitor-preset-btn ${settings.thinking_budget === 16384 ? 'active' : ''}" data-tokens="16384" onclick="SConnect.setChatThinkingPreset(16384)">16K</button>
                        <button type="button" class="janitor-preset-btn ${settings.thinking_budget === 32768 ? 'active' : ''}" data-tokens="32768" onclick="SConnect.setChatThinkingPreset(32768)">32K</button>
                        <button type="button" class="janitor-preset-btn ${settings.thinking_budget === 65536 ? 'active' : ''}" data-tokens="65536" onclick="SConnect.setChatThinkingPreset(65536)">64K</button>
                      </div>
                      <span class="janitor-slider-sub">Controls internal reasoning/thinking budget for models supporting CoT (Kimi K3, DeepSeek R1, GPT-5 Thinking, Claude 3.7 Thinking, Gemini 3.8 Flash).</span>
                    </div>
                  </div>

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
      const author = isBot ? this.getBotChatName(bot) : (persona ? persona.name : 'You');
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
      if (persona) {
        session.personaId = persona.id;
        session.personaAvatar = persona.avatar;
        session.personaName = persona.name;
      }
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
      const botAuthorName = this.getBotChatName(bot);
      const botPlaceholder = {
        id: botMsgId,
        role: 'assistant',
        author: botAuthorName,
        avatar: bot.avatar || DEFAULT_AVATAR,
        content: '',
        timestamp: Date.now()
      };

      if (streamEl) {
        const placeholderHtml = `
          <div class="janitor-msg-row janitor-bot-row is-streaming" id="janitor-msg-${botMsgId}">
            <div class="janitor-avatar-col">
              <img src="${bot.avatar || DEFAULT_AVATAR}" class="janitor-msg-avatar" alt="${this.escapeHTML(botAuthorName)}" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';" />
            </div>
            <div class="janitor-msg-content-col">
              <div class="janitor-msg-meta">
                <span class="janitor-msg-author">${this.escapeHTML(botAuthorName)}</span>
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

      const activeModel = settings.model || localStorage.getItem('s_connect_chat_model') || 'kimi-k3';
      const thinkingBudget = parseInt(settings.thinking_budget !== undefined ? settings.thinking_budget : (localStorage.getItem('s_connect_thinking_budget') || 0), 10);
      const bodyEl = document.getElementById(`body-${botMsgId}`);

      // 7. Request Payload with Working Generation Parameters
      const payload = {
        model: activeModel,
        messages: formattedMsgs,
        temperature: Number(settings.temperature)
      };

      if (thinkingBudget > 0) {
        payload.thinking_budget = thinkingBudget;
      }

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
        const session = this.getActiveChatSession(botId, false);
        if (session) {
          const p = this.getPersonas().find(x => x.id === personaId);
          if (p) {
            session.personaId = p.id;
            session.personaAvatar = p.avatar;
            session.personaName = p.name;
            this.updateChatSessionMeta(session);
          }
        }
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
        customBg: '',
        model: localStorage.getItem('s_connect_chat_model') || 'kimi-k3',
        thinking_budget: parseInt(localStorage.getItem('s_connect_thinking_budget') || '0', 10)
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
      if (settings.model) {
        localStorage.setItem('s_connect_chat_model', settings.model);
      }
      if (settings.thinking_budget !== undefined) {
        localStorage.setItem('s_connect_thinking_budget', String(settings.thinking_budget));
      }
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

      window.dispatchEvent(new CustomEvent('singularity-cloud-sync-needed'));
      window.dispatchEvent(new CustomEvent('singularity-settings-updated'));
    },

    openChatSettingsModal(botId) {
      const modal = document.getElementById('janitor-settings-modal');
      if (modal) modal.classList.add('is-open');
      const wrap = document.getElementById('janitor-model-selector-wrap');
      if (wrap) wrap.classList.remove('is-open');
      const menu = document.getElementById('janitor-model-dropdown-menu');
      if (menu) menu.style.display = 'none';
      this.populateChatModelList();
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

      const modelVal = document.getElementById('janitor-chat-model-val');
      if (modelVal && modelVal.value) {
        settings.model = modelVal.value;
      }

      const thinkingSlider = document.getElementById('janitor-thinking-slider');
      if (thinkingSlider) {
        settings.thinking_budget = parseInt(thinkingSlider.value, 10) || 0;
      }

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

    async getAvailableModelsList() {
      if (window.state && Array.isArray(window.state.models) && window.state.models.length > 0) {
        return window.state.models;
      }
      try {
        const res = await fetch('/api/models');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.models)) {
            if (window.state) window.state.models = data.models;
            return data.models;
          }
        }
      } catch (e) {
        console.warn('Failed to fetch /api/models:', e);
      }
      return [
        { id: 'kimi-k3', name: 'Kimi K3 (Roleplay & Reasoning)', provider: 'kimi' },
        { id: 'kimi-k3-thinking', name: 'Kimi K3 Thinking', provider: 'kimi' },
        { id: 'deepseek-v4', name: 'DeepSeek V4', provider: 'deepseek' },
        { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', provider: 'deepseek' },
        { id: 'deepseek-reasoner', name: 'DeepSeek R1', provider: 'deepseek' },
        { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', provider: 'chatgpt' },
        { id: 'gpt-5-6-mini', name: 'GPT-5.6 Mini', provider: 'chatgpt' },
        { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'claude' },
        { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', provider: 'gemini' },
        { id: 'qwen-max-2025', name: 'Qwen Max 2025', provider: 'qwen' }
      ];
    },

    async populateChatModelList(query = '') {
      const listEl = document.getElementById('janitor-model-options-list');
      if (!listEl) return;
      const models = await this.getAvailableModelsList();
      const currentSelected = document.getElementById('janitor-chat-model-val')?.value || localStorage.getItem('s_connect_chat_model') || 'kimi-k3';
      const q = (query || '').toLowerCase().trim();

      const filtered = models.filter(m => {
        if (!q) return true;
        const id = (m.id || '').toLowerCase();
        const name = (m.name || '').toLowerCase();
        const prov = (m.provider || '').toLowerCase();
        return id.includes(q) || name.includes(q) || prov.includes(q);
      });

      if (filtered.length === 0) {
        listEl.innerHTML = `<div style="padding:12px; text-align:center; color:#9ca3af; font-size:0.82rem;">No matching models found</div>`;
        return;
      }

      listEl.innerHTML = filtered.map(m => {
        const isSelected = m.id === currentSelected;
        return `
          <div class="janitor-model-option-item ${isSelected ? 'is-selected' : ''}" onclick="SConnect.selectChatModel('${this.escapeHTML(m.id)}', '${this.escapeHTML(m.name || m.id)}')">
            <div class="janitor-model-opt-info">
              <span class="janitor-model-opt-title">${this.escapeHTML(m.name || m.id)}</span>
              <span class="janitor-model-opt-meta">${this.escapeHTML(m.id)} &bull; ${this.escapeHTML(m.provider || 'AI')}</span>
            </div>
            ${isSelected ? '<span class="janitor-model-opt-tag">Active</span>' : ''}
          </div>
        `;
      }).join('');
    },

    toggleChatModelDropdown(event) {
      if (event) event.stopPropagation();
      const menu = document.getElementById('janitor-model-dropdown-menu');
      const wrap = document.getElementById('janitor-model-selector-wrap');
      if (!menu || !wrap) return;
      const isOpen = menu.style.display !== 'none';
      if (isOpen) {
        menu.style.display = 'none';
        wrap.classList.remove('is-open');
      } else {
        menu.style.display = 'flex';
        wrap.classList.add('is-open');
        this.populateChatModelList();
        const searchInput = document.getElementById('janitor-model-search-input');
        if (searchInput) {
          searchInput.value = '';
          setTimeout(() => searchInput.focus(), 50);
        }
      }
    },

    filterChatModelOptions(query) {
      this.populateChatModelList(query);
    },

    selectChatModel(modelId, modelName) {
      const valInput = document.getElementById('janitor-chat-model-val');
      if (valInput) valInput.value = modelId;
      const triggerName = document.getElementById('janitor-model-trigger-name');
      if (triggerName) triggerName.textContent = modelName || modelId;
      const badge = document.getElementById('janitor-active-model-badge');
      if (badge) badge.textContent = modelId;

      localStorage.setItem('s_connect_chat_model', modelId);

      const menu = document.getElementById('janitor-model-dropdown-menu');
      const wrap = document.getElementById('janitor-model-selector-wrap');
      if (menu) menu.style.display = 'none';
      if (wrap) wrap.classList.remove('is-open');
    },

    onChatThinkingSliderInput(val) {
      const tokens = parseInt(val, 10) || 0;
      const label = document.getElementById('janitor-thinking-val');
      if (label) {
        label.textContent = tokens > 0 ? `${tokens.toLocaleString()} tokens` : 'Off (0)';
      }
      const btns = document.querySelectorAll('#janitor-thinking-presets .janitor-preset-btn');
      btns.forEach(b => {
        const btnTok = parseInt(b.dataset.tokens, 10);
        b.classList.toggle('active', btnTok === tokens);
      });
      localStorage.setItem('s_connect_thinking_budget', String(tokens));
    },

    setChatThinkingPreset(tokens) {
      const slider = document.getElementById('janitor-thinking-slider');
      if (slider) slider.value = tokens;
      this.onChatThinkingSliderInput(tokens);
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
      return String(html)
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&bull;/gi, '•')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
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
    },

    toggleCustomSelect(wrapId, e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      const wrap = document.getElementById(wrapId);
      if (!wrap) return;
      const isOpen = wrap.classList.contains('open');

      document.querySelectorAll('.claude-custom-select-wrap.open').forEach(el => {
        el.classList.remove('open');
      });
      document.querySelectorAll('.claude-custom-select-menu.open').forEach(el => {
        el.classList.remove('open');
      });

      if (!isOpen) {
        wrap.classList.add('open');
        const menu = wrap.querySelector('.claude-custom-select-menu');
        if (menu) menu.classList.add('open');
      }
    },

    renderDossierSnippet(raw, botId) {
      if (!raw) return '<p><em>No description provided.</em></p>';

      const fullHtml = this.renderRichText(raw);

      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div id="dossier-snippet-root">${fullHtml}</div>`, 'text/html');
        const root = doc.getElementById('dossier-snippet-root') || doc.body;

        const plainText = (root.textContent || '').trim();
        const TARGET_LIMIT = 150;

        if (plainText.length <= TARGET_LIMIT) {
          return root.innerHTML;
        }

        let charCount = 0;
        let cutDone = false;

        const traverse = (node) => {
          if (cutDone) {
            node.remove();
            return;
          }

          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            if (charCount + text.length > TARGET_LIMIT) {
              const remaining = Math.max(0, TARGET_LIMIT - charCount);
              let cutIdx = -1;

              // Flexible window search: look ahead up to 60 chars for sentence ends [.!?]
              const sub = text.slice(remaining, Math.min(text.length, remaining + 60));
              const punctMatch = sub.search(/[.!?](\s+|$)/);
              if (punctMatch !== -1) {
                cutIdx = remaining + punctMatch + 1;
              } else {
                // If no sentence end, look for comma, semicolon or whitespace
                const commaMatch = sub.search(/[,;](\s+|$)/);
                if (commaMatch !== -1) {
                  cutIdx = remaining + commaMatch;
                } else {
                  const spaceMatch = sub.search(/\s+/);
                  if (spaceMatch !== -1) {
                    cutIdx = remaining + spaceMatch;
                  } else {
                    cutIdx = Math.min(text.length, remaining + 30);
                  }
                }
              }

              node.textContent = text.slice(0, cutIdx).trimEnd() + '...';
              charCount += cutIdx;
              cutDone = true;
            } else {
              charCount += text.length;
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = node.tagName.toLowerCase();
            // In chat snippet, don't include audio/video or iframe embeds
            if (['audio', 'video', 'iframe', 'style', 'script', 'form'].includes(tag)) {
              node.remove();
              return;
            }

            const children = Array.from(node.childNodes);
            for (const child of children) {
              if (cutDone) {
                child.remove();
              } else {
                traverse(child);
              }
            }

            // Remove empty non-void tags
            if (!['br', 'hr', 'img'].includes(tag) && node.childNodes.length === 0) {
              node.remove();
            }
          }
        };

        traverse(root);
        return root.innerHTML;
      } catch (e) {
        console.warn('[renderDossierSnippet] fallback', e);
        return this.escapeHTML(String(raw).slice(0, 300)) + '...';
      }
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
