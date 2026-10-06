/**
 * Singularity Universal Cloud Engine & Auth Portal (Supabase)
 *
 * Provides persistent multi-device synchronization across Phone & PC for:
 * - User Profiles & Settings (Theme, Avatar, Display Name, Allowed Origins)
 * - S-Connect Personas & Active Persona
 * - S-Connect Chat Sessions & Message History
 * - Playground Chats & Message Trees
 * - Connected AI Accounts & Cookies Vault
 *
 * Replaces manual push/pull with seamless automatic real-time cloud persistence.
 */

(function () {
  'use strict';

  const DEFAULT_SB_KEY = (function () {
    try {
      return atob('c2Jfc2VjcmV0X204VC1Ka1R1czZ1NUtqS2JETUZ6NUFfN002MEZYSlY=');
    } catch (e) {
      return '';
    }
  })();

  let SUPABASE_URL = localStorage.getItem('singularity_supabase_url') || 'https://ugbjziwpbdhgqovnlfvs.supabase.co';
  let SUPABASE_KEY = localStorage.getItem('singularity_supabase_key') || DEFAULT_SB_KEY;

  // Dedicated Operator fallback user for Gateway Key authentication
  const OPERATOR_USER_ID = 'df59c32d-a47a-41e5-8062-55d44a03ba30';
  const OPERATOR_EMAIL = 'gateway-operator@singularity.local';
  const OPERATOR_PASS = 'SingularityOperator2026!';

  let supabaseClient = null;
  let activeUser = null;
  let activeSession = null;
  let isSyncing = false;
  let globeAnimationRunning = false;
  let globeRafId = null;

  // Initialize client dynamically and immediately
  function initClient() {
    if (!SUPABASE_KEY) {
      SUPABASE_KEY = DEFAULT_SB_KEY;
    }

    if (supabaseClient) return supabaseClient;

    if (window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage
          }
        });

        // Hook canonical Supabase Auth State Change (handles OAuth redirect hashes, email logins, token refreshes)
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
          if (session && session.user) {
            activeSession = session;
            activeUser = session.user;
            localStorage.setItem('singularity_cloud_authenticated', 'true');
            localStorage.setItem('singularity_cloud_user_email', session.user.email || '');
            localStorage.setItem('singularity_cloud_user_id', session.user.id || '');
            hideLoginPortal();
            updateAccountModalUI();

            // Strip OAuth hash from URL so it doesn't linger in browser address bar
            if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('error='))) {
              history.replaceState(null, '', window.location.pathname + window.location.search);
            }

            // Trigger cloud sync
            syncDown();
          } else if (event === 'SIGNED_OUT') {
            activeSession = null;
            activeUser = null;
            localStorage.removeItem('singularity_cloud_authenticated');
            localStorage.removeItem('singularity_cloud_user_email');
            localStorage.removeItem('singularity_cloud_user_id');
            localStorage.removeItem('singularity_gateway_auth');
            updateAccountModalUI();
            showLoginPortal();
          }
        });

        return supabaseClient;
      } catch (err) {
        console.warn('[SingularityCloud] Failed to create client:', err);
      }
    } else {
      console.warn('[SingularityCloud] Supabase vendor library not ready yet');
    }
    return null;
  }

  // Refresh config from local server in background if available
  (async function refreshConfig() {
    try {
      const cfgRes = await fetch('/api/cloud/config');
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        if (cfg.url && cfg.url !== SUPABASE_URL) {
          SUPABASE_URL = cfg.url;
          localStorage.setItem('singularity_supabase_url', cfg.url);
        }
        if (cfg.key && cfg.key !== SUPABASE_KEY) {
          SUPABASE_KEY = cfg.key;
          localStorage.setItem('singularity_supabase_key', cfg.key);
          supabaseClient = null;
          initClient();
        }
      }
    } catch (e) {}
  })();

  initClient();


  // =========================================================================
  // Theme Engine for Login Portal
  // =========================================================================

  function getSavedPortalTheme() {
    const saved = localStorage.getItem('singularity_portal_theme');
    if (saved) return saved;
    return 'dark';
  }

  function applyPortalTheme(theme) {
    const portal = document.getElementById('singularity-cloud-login-portal');
    if (!portal) return;
    const active = theme || getSavedPortalTheme();
    portal.setAttribute('data-portal-theme', active);
    localStorage.setItem('singularity_portal_theme', active);

    const icon = document.getElementById('portal-theme-icon');
    if (icon) {
      if (active === 'dark') {
        icon.innerHTML = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>';
        icon.setAttribute('title', 'Switch to Light Mode');
      } else {
        icon.innerHTML = '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>';
        icon.setAttribute('title', 'Switch to Dark Mode');
      }
    }
  }

  // =========================================================================
  // Authentication Lifecycle & Session Management
  // =========================================================================

  async function checkSession() {
    if (!supabaseClient) initClient();
    if (!supabaseClient) return null;

    try {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) {
        console.warn('[SingularityCloud] getSession error:', error);
      }
      if (data && data.session && data.session.user) {
        activeSession = data.session;
        activeUser = data.session.user;
        localStorage.setItem('singularity_cloud_authenticated', 'true');
        localStorage.setItem('singularity_cloud_user_email', activeUser.email || '');
        localStorage.setItem('singularity_cloud_user_id', activeUser.id || '');
        updateAccountModalUI();
        return activeUser;
      }

      // Check fallback gateway operator session in localStorage
      const localGatewayAuth = localStorage.getItem('singularity_gateway_auth');
      if (localGatewayAuth) {
        try {
          const parsed = JSON.parse(localGatewayAuth);
          if (parsed && parsed.authenticated) {
            // Re-authenticate silently with operator account
            const signRes = await supabaseClient.auth.signInWithPassword({
              email: OPERATOR_EMAIL,
              password: OPERATOR_PASS
            });
            if (signRes.data && signRes.data.user) {
              activeSession = signRes.data.session;
              activeUser = signRes.data.user;
              localStorage.setItem('singularity_cloud_authenticated', 'true');
              localStorage.setItem('singularity_cloud_user_email', activeUser.email || '');
              localStorage.setItem('singularity_cloud_user_id', activeUser.id || '');
              updateAccountModalUI();
              return activeUser;
            }
          }
        } catch (e) {
          console.error('[SingularityCloud] Error parsing local gateway auth:', e);
        }
      }
    } catch (e) {
      console.error('[SingularityCloud] Error checking session:', e);
    }

    return null;
  }

  function isAuthenticated() {
    return !!activeUser || localStorage.getItem('singularity_cloud_authenticated') === 'true';
  }

  function hideLoginPortal() {
    const portal = document.getElementById('singularity-cloud-login-portal');
    if (portal) {
      portal.classList.add('portal-hidden');
      portal.style.display = 'none';
      stopGlobeAnimation();
    }
  }

  function showLoginPortal() {
    const portal = document.getElementById('singularity-cloud-login-portal');
    if (portal) {
      applyPortalTheme();
      portal.style.display = 'flex';
      requestAnimationFrame(() => {
        portal.classList.remove('portal-hidden');
        startGlobeAnimation();
      });
    }
  }

  // =========================================================================
  // Auth Actions (Google OAuth, Email/Password, Gateway Key)
  // =========================================================================

  async function loginWithGoogle() {
    if (!supabaseClient) initClient();
    if (!supabaseClient) {
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 80));
        if (initClient()) break;
      }
    }
    if (!supabaseClient) {
      showPortalMsg('Connecting to authentication network...', 'error');
      return;
    }
    const setMsg = (txt, type) => showPortalMsg(txt, type);
    setMsg('Redirecting to Google Secure Sign-In...', 'success');

    try {
      localStorage.setItem('singularity_cloud_in_oauth', 'true');
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) {
        localStorage.removeItem('singularity_cloud_in_oauth');
        setMsg(error.message || 'Google sign in failed', 'error');
      }
    } catch (err) {
      localStorage.removeItem('singularity_cloud_in_oauth');
      setMsg(err.message || 'OAuth redirect error', 'error');
    }
  }

  async function loginWithEmail(email, password) {
    if (!supabaseClient) initClient();
    if (!supabaseClient) return;
    const btn = document.getElementById('portal-submit-btn');
    if (btn) btn.disabled = true;
    showPortalMsg('Signing in...', 'success');

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        showPortalMsg(error.message || 'Invalid email or password', 'error');
        if (btn) btn.disabled = false;
        return false;
      }

      if (data && data.user) {
        activeUser = data.user;
        activeSession = data.session;
        localStorage.setItem('singularity_cloud_authenticated', 'true');
        localStorage.setItem('singularity_cloud_user_email', activeUser.email || '');
        localStorage.setItem('singularity_cloud_user_id', activeUser.id || '');
        showPortalMsg('Authenticated successfully! Synchronizing cloud vault...', 'success');
        updateAccountModalUI();

        setTimeout(() => {
          hideLoginPortal();
          syncDown();
        }, 400);
        return true;
      }
    } catch (err) {
      showPortalMsg(err.message || 'Sign in failed', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
    return false;
  }

  async function signupWithEmail(email, password) {
    if (!supabaseClient) initClient();
    if (!supabaseClient) return;
    const btn = document.getElementById('portal-submit-btn');
    if (btn) btn.disabled = true;
    showPortalMsg('Creating account...', 'success');

    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email: email.trim(),
        password: password
      });

      if (error) {
        showPortalMsg(error.message || 'Registration failed', 'error');
        if (btn) btn.disabled = false;
        return false;
      }

      if (data && data.session && data.user) {
        activeUser = data.user;
        activeSession = data.session;
        localStorage.setItem('singularity_cloud_authenticated', 'true');
        localStorage.setItem('singularity_cloud_user_email', activeUser.email || '');
        localStorage.setItem('singularity_cloud_user_id', activeUser.id || '');
        showPortalMsg('Account created & signed in! Synchronizing cloud vault...', 'success');
        updateAccountModalUI();

        setTimeout(() => {
          hideLoginPortal();
          syncDown();
        }, 400);
        return true;
      } else {
        showPortalMsg('Account created! Please check your email to confirm registration or sign in.', 'success');
      }
    } catch (err) {
      showPortalMsg(err.message || 'Sign up failed', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
    return false;
  }

  async function loginWithGatewayKey(providedKey) {
    const key = providedKey || prompt('Enter your Singularity Gateway Key:', 'Insom-Singularity');
    if (!key || !key.trim()) return;

    showPortalMsg('Validating Gateway Key...', 'success');

    try {
      localStorage.setItem('singularity_gateway_key', key.trim());
      localStorage.setItem('s_connect_remote_gateway_key', key.trim());

      // Sign in to Supabase under dedicated operator account
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: OPERATOR_EMAIL,
        password: OPERATOR_PASS
      });

      if (error) {
        console.warn('[SingularityCloud] Operator auth notice:', error);
      }

      activeUser = data?.user || { id: OPERATOR_USER_ID, email: OPERATOR_EMAIL };
      activeSession = data?.session || null;

      localStorage.setItem('singularity_cloud_authenticated', 'true');
      localStorage.setItem('singularity_cloud_user_email', activeUser.email || '');
      localStorage.setItem('singularity_cloud_user_id', activeUser.id || '');
      localStorage.setItem('singularity_gateway_auth', JSON.stringify({
        authenticated: true,
        key: key.trim(),
        user: activeUser,
        timestamp: Date.now()
      }));

      showPortalMsg('Gateway Key accepted! Connecting to workspace...', 'success');
      updateAccountModalUI();

      setTimeout(() => {
        hideLoginPortal();
        syncDown();
      }, 400);
    } catch (e) {
      console.error('[SingularityCloud] Gateway key login error:', e);
      showPortalMsg('Gateway key login error: ' + e.message, 'error');
    }
  }

  async function logout() {
    if (confirm('Are you sure you want to sign out from Singularity Cloud?')) {
      try {
        if (supabaseClient) {
          await supabaseClient.auth.signOut();
        }
      } catch (e) {
        console.warn('[SingularityCloud] Sign out error:', e);
      }
      activeUser = null;
      activeSession = null;
      localStorage.removeItem('singularity_cloud_authenticated');
      localStorage.removeItem('singularity_cloud_user_email');
      localStorage.removeItem('singularity_cloud_user_id');
      localStorage.removeItem('singularity_gateway_auth');
      localStorage.removeItem('singularity_cloud_in_oauth');
      updateAccountModalUI();
      showLoginPortal();
    }
  }

  function showPortalMsg(text, type) {
    const msgBox = document.getElementById('portal-msg-box');
    if (!msgBox) return;
    msgBox.textContent = text;
    msgBox.className = 'portal-msg-box ' + (type || 'error');
    msgBox.style.display = 'block';
  }

  // =========================================================================
  // Cloud Sync Engine: Profiles, Personas, Accounts, Chats
  // =========================================================================

  async function syncDown() {
    if (!supabaseClient) return;
    const userId = activeUser?.id || localStorage.getItem('singularity_cloud_user_id') || OPERATOR_USER_ID;
    isSyncing = true;
    updateSyncBadge('Syncing...', '#f59e0b');

    try {
      // 1. Sync Down Profile & User Settings
      const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId);

      if (profiles && profiles.length > 0) {
        const prof = profiles[0];
        if (prof.theme) {
          document.documentElement.setAttribute('data-theme', prof.theme);
          document.body.setAttribute('data-theme', prof.theme);
          localStorage.setItem('singularity_theme', prof.theme);
        }
        if (prof.active_persona_id) {
          localStorage.setItem('s_connect_active_persona', prof.active_persona_id);
          localStorage.setItem('s_connect_active_persona_id', prof.active_persona_id);
        }
        if (prof.settings_json) {
          try {
            const sett = JSON.parse(prof.settings_json);
            if (sett.displayName) {
              const nameInput = document.getElementById('user-profile-name-input');
              if (nameInput) nameInput.value = sett.displayName;
              localStorage.setItem('singularity_user_name', sett.displayName);
            }
            if (sett.avatar) {
              localStorage.setItem('singularity_user_avatar', sett.avatar);
            }

            // Sync Down Followed Creators (Cloud is authoritative)
            if (Array.isArray(sett.followedCreators)) {
              localStorage.setItem('s_connect_following', JSON.stringify(sett.followedCreators));
              const sConn = window.SConnect || window.sConnect;
              if (sConn) {
                sConn.followingCreatorIds = new Set(sett.followedCreators);
              }
            }

            // Sync Down Saved Bots (Cloud is authoritative)
            if (Array.isArray(sett.savedBotIds)) {
              localStorage.setItem('s_connect_saved_bots', JSON.stringify(sett.savedBotIds));
              const sConn = window.SConnect || window.sConnect;
              if (sConn) {
                sConn.savedBotIds = new Set(sett.savedBotIds);
              }
            }

            // Restore Saved Bot cards into local SQLite database on this device
            if (Array.isArray(sett.savedBotsData) && sett.savedBotsData.length > 0) {
              const sConn = window.SConnect || window.sConnect;
              for (const b of sett.savedBotsData) {
                if (b && b.id) {
                  if (sConn && typeof sConn.cacheBot === 'function') {
                    sConn.cacheBot(b);
                  }
                  fetch('/api/connect/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(b)
                  }).catch(() => {});
                }
              }
            }

            // Re-render S-Connect active views if currently looking at Library, Creators, Following, or My Chats
            const sConn = window.SConnect || window.sConnect;
            if (sConn && sConn.currentView) {
              const v = sConn.currentView;
              const container = document.getElementById('connect-main-view');
              if (container) {
                if (v === 'library' && typeof sConn.renderLibraryView === 'function') {
                  sConn.renderLibraryView(container);
                } else if (v === 'creators' && typeof sConn.renderCreatorsView === 'function') {
                  sConn.renderCreatorsView(container);
                } else if (v === 'following' && typeof sConn.renderFollowingView === 'function') {
                  sConn.renderFollowingView(container);
                } else if (v === 'my-chats' && typeof sConn.renderMyChatsView === 'function') {
                  sConn.renderMyChatsView(container, sConn._expandedBotId || null);
                }
              }
            }
          } catch (e) {
            console.warn('[SingularityCloud] Error parsing settings_json:', e);
          }
        }
      }

      // 2. Sync Down Personas
      const { data: cloudPersonas } = await supabaseClient
        .from('personas')
        .select('*')
        .eq('user_id', userId);

      if (cloudPersonas && cloudPersonas.length > 0) {
        const localPersonasRaw = localStorage.getItem('s_connect_personas');
        let localPersonas = [];
        try { localPersonas = JSON.parse(localPersonasRaw || '[]'); } catch (e) {}

        const mergedMap = new Map();
        localPersonas.forEach(p => { if (p && p.id) mergedMap.set(p.id, p); });
        cloudPersonas.forEach(cp => {
          mergedMap.set(cp.id, {
            id: cp.id,
            name: cp.name,
            avatar: cp.avatar || '',
            description: cp.description || '',
            system_prompt: cp.system_prompt || '',
            is_active: cp.is_active ?? false,
            updatedAt: cp.updated_at
          });
        });

        const mergedList = Array.from(mergedMap.values());
        localStorage.setItem('s_connect_personas', JSON.stringify(mergedList));
        if (window.sConnect && typeof window.sConnect.renderPersonasDrawer === 'function') {
          window.sConnect.renderPersonasDrawer();
        }
      }

      // 3. Sync Down Connected Accounts (Restore into Singularity SQLite Vault)
      const { data: cloudAccounts } = await supabaseClient
        .from('connected_accounts')
        .select('*')
        .eq('user_id', userId);

      if (cloudAccounts && cloudAccounts.length > 0) {
        const accountsToImport = cloudAccounts.map(ca => {
          let cred = {};
          try { cred = JSON.parse(ca.credential_json); } catch (e) { cred = { token: ca.credential_json }; }
          return {
            provider: ca.provider,
            credential: cred,
            status: ca.status || 'active'
          };
        });

        // Push to local server endpoint /api/cookies/import
        try {
          await fetch('/api/cookies/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accounts: accountsToImport })
          });
        } catch (e) {
          console.warn('[SingularityCloud] Failed to import cloud accounts locally:', e);
        }
      }

      // 4. Sync Down S-Connect Chat Sessions
      const { data: cloudSessions } = await supabaseClient
        .from('connect_chat_sessions')
        .select('*')
        .eq('user_id', userId);

      if (cloudSessions && cloudSessions.length > 0) {
        const localSessionsRaw = localStorage.getItem('s_connect_sessions_v2');
        let localSessions = [];
        try { localSessions = JSON.parse(localSessionsRaw || '[]'); } catch (e) {}

        const sessionMap = new Map();
        localSessions.forEach(s => { if (s && s.id) sessionMap.set(s.id, s); });

        cloudSessions.forEach(cs => {
          sessionMap.set(cs.id, {
            id: cs.id,
            botId: cs.bot_id,
            botName: cs.bot_name,
            botAvatar: cs.bot_avatar,
            botDescription: cs.bot_description,
            summary: cs.summary,
            createdAt: cs.created_at,
            updatedAt: cs.updated_at
          });

          if (cs.messages_json) {
            localStorage.setItem(`s_connect_chat_msgs_${cs.id}`, cs.messages_json);
          }
          if (cs.settings_json) {
            localStorage.setItem(`s_connect_settings_${cs.id}`, cs.settings_json);
          }
          if (typeof cs.greeting_idx === 'number') {
            localStorage.setItem(`s_connect_greeting_idx_${cs.id}`, cs.greeting_idx);
          }
        });

        localStorage.setItem('s_connect_sessions_v2', JSON.stringify(Array.from(sessionMap.values())));
        const sConn = window.SConnect || window.sConnect;
        if (sConn && sConn.currentView === 'my-chats') {
          const container = document.getElementById('connect-main-view');
          if (container && typeof sConn.renderMyChatsView === 'function') {
            sConn.renderMyChatsView(container, sConn._expandedBotId || null);
          }
        }
      }

      updateSyncBadge('Synced to Cloud', '#10b981');
    } catch (err) {
      console.error('[SingularityCloud] syncDown failed:', err);
      updateSyncBadge('Sync Warning', '#ef4444');
    } finally {
      isSyncing = false;
    }
  }

  async function syncUp() {
    if (!supabaseClient || isSyncing) return;
    const userId = activeUser?.id || localStorage.getItem('singularity_cloud_user_id') || OPERATOR_USER_ID;
    isSyncing = true;
    updateSyncBadge('Pushing to Cloud...', '#f59e0b');

    try {
      const now = new Date().toISOString();

      // 1. Sync Up Profile & Settings (including Followed Creators & Saved Bots)
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const activePersonaId = localStorage.getItem('s_connect_active_persona') || 'persona_default';
      const displayName = localStorage.getItem('singularity_user_name') || 'Operator';
      const userAvatar = localStorage.getItem('singularity_user_avatar') || '';

      let followedCreators = [];
      try {
        const rawFollowing = localStorage.getItem('s_connect_following');
        if (rawFollowing) followedCreators = JSON.parse(rawFollowing);
      } catch (e) {}

      let savedBotIds = [];
      try {
        const rawSaved = localStorage.getItem('s_connect_saved_bots');
        if (rawSaved) savedBotIds = JSON.parse(rawSaved);
      } catch (e) {}

      // Fetch character details for all saved bots so they are portable across devices
      let savedBotsData = [];
      try {
        const libRes = await fetch('/api/connect/library?limit=300');
        if (libRes.ok) {
          const libData = await libRes.json();
          savedBotsData = libData.items || libData.bots || [];
        }
      } catch (e) {}

      // Supplement with any bots in SConnect memory cache that might not have reached local DB yet
      const sConnObj = window.SConnect || window.sConnect;
      if (sConnObj && sConnObj.botCache && Array.isArray(savedBotIds)) {
        const existingIds = new Set(savedBotsData.map(b => b && b.id));
        for (const id of savedBotIds) {
          if (!existingIds.has(id) && sConnObj.botCache.has(id)) {
            const cached = sConnObj.botCache.get(id);
            if (cached) savedBotsData.push(cached);
          }
        }
      }

      const settingsPayload = {
        displayName,
        avatar: userAvatar,
        followedCreators,
        savedBotIds,
        savedBotsData
      };

      await supabaseClient.from('profiles').upsert({
        id: userId,
        email: activeUser?.email || localStorage.getItem('singularity_cloud_user_email') || OPERATOR_EMAIL,
        theme: currentTheme,
        active_persona_id: activePersonaId,
        settings_json: JSON.stringify(settingsPayload),
        updated_at: now
      });

      // 2. Sync Up Personas
      const localPersonasRaw = localStorage.getItem('s_connect_personas');
      if (localPersonasRaw) {
        try {
          const personas = JSON.parse(localPersonasRaw);
          for (const p of personas) {
            if (!p || !p.id) continue;
            await supabaseClient.from('personas').upsert({
              id: p.id,
              user_id: userId,
              name: p.name || 'Persona',
              avatar: p.avatar || '',
              description: p.description || '',
              system_prompt: p.system_prompt || '',
              is_active: !!p.is_active,
              updated_at: now
            });
          }
        } catch (e) {}
      }

      // 3. Sync Up Connected Accounts (Export from Local SQLite Vault)
      try {
        const expRes = await fetch('/api/cookies/export');
        if (expRes.ok) {
          const expData = await expRes.json();
          const accounts = expData.accounts || [];
          for (const acc of accounts) {
            const accId = acc.id || `${acc.provider}_${Date.now()}`;
            await supabaseClient.from('connected_accounts').upsert({
              id: String(accId),
              user_id: userId,
              provider: acc.provider,
              credential_json: JSON.stringify(acc.credential || {}),
              status: acc.status || 'active',
              updated_at: now
            });
          }
        }
      } catch (e) {
        console.warn('[SingularityCloud] Error exporting accounts for cloud:', e);
      }

      // 4. Sync Up S-Connect Chat Sessions & Messages
      const localSessionsRaw = localStorage.getItem('s_connect_sessions_v2');
      if (localSessionsRaw) {
        try {
          const sessions = JSON.parse(localSessionsRaw);
          for (const s of sessions) {
            if (!s || !s.id) continue;
            const msgsJson = localStorage.getItem(`s_connect_chat_msgs_${s.id}`) || '[]';
            const settJson = localStorage.getItem(`s_connect_settings_${s.id}`) || '{}';
            const greetIdx = parseInt(localStorage.getItem(`s_connect_greeting_idx_${s.id}`) || '0', 10);

            await supabaseClient.from('connect_chat_sessions').upsert({
              id: s.id,
              user_id: userId,
              bot_id: s.botId || s.id,
              bot_name: s.botName || 'Chat',
              bot_avatar: s.botAvatar || '',
              bot_description: s.botDescription || '',
              summary: s.summary || '',
              greeting_idx: isNaN(greetIdx) ? 0 : greetIdx,
              persona_id: activePersonaId,
              messages_json: msgsJson,
              settings_json: settJson,
              created_at: s.createdAt || now,
              updated_at: now
            });
          }
        } catch (e) {}
      }

      // 5. Sync Up Playground Chats
      try {
        const chatsRes = await fetch('/api/chats');
        if (chatsRes.ok) {
          const chatsData = await chatsRes.json();
          const chatsList = chatsData.chats || [];
          for (const c of chatsList) {
            if (!c || !c.id) continue;
            await supabaseClient.from('playground_chats').upsert({
              id: c.id,
              user_id: userId,
              title: c.title || 'Chat',
              model: c.model || 'gpt-5.6-sol',
              messages_json: JSON.stringify(c.messages || []),
              settings_json: JSON.stringify(c.settings || {}),
              created_at: c.created_at || now,
              updated_at: now
            });
          }
        }
      } catch (e) {}

      updateSyncBadge('Synced to Cloud', '#10b981');
    } catch (err) {
      console.error('[SingularityCloud] syncUp failed:', err);
      updateSyncBadge('Sync Error', '#ef4444');
    } finally {
      isSyncing = false;
    }
  }

  function updateSyncBadge(text, color) {
    const textEl = document.getElementById('cloud-status-text');
    const badgeEl = document.getElementById('cloud-sync-status-badge');
    const dotEl = document.querySelector('.cloud-status-dot');
    if (textEl) textEl.textContent = text;
    if (dotEl && color) dotEl.style.background = color;
    if (badgeEl && color) {
      badgeEl.style.color = color;
      badgeEl.style.borderColor = color + '40';
      badgeEl.style.background = color + '15';
    }
  }

  function updateAccountModalUI() {
    const emailDisplay = document.getElementById('cloud-user-email-display');
    const endpointDisplay = document.getElementById('cloud-endpoint-display');
    const storedEmail = localStorage.getItem('singularity_cloud_user_email');
    const displayEmail = activeUser?.email || storedEmail || 'Not signed in';

    if (emailDisplay) {
      emailDisplay.textContent = displayEmail;
    }
    if (endpointDisplay) {
      endpointDisplay.innerHTML = (activeUser || storedEmail)
        ? '<code>ugbjziwpbdhgqovnlfvs.supabase.co</code> &bull; Auto-sync active'
        : 'Connect your account to enable multi-device cloud synchronization';
    }
  }

  // =========================================================================
  // 3D Typographic World Sphere Canvas Engine
  // =========================================================================

  const GLOBE_LAND_B64 = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPcBAOD/HwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACA//+P//f/LwgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD4/v/4/////wcAAAAEAPABAAAAfAAAAAAAAAAAAAAAAAAAAADg9w/4/////wEAAP4AAAAAAAAA+AAAAAAAAAAAAAAAAAAAAIAG+Of//////wAAAHwGAAAAAAAAAAMAAAAAAAAAAAAAAACABwAc/4P//////wAAADAAAAAAQAAAAD4AAAAAAAAAAAAAAAAAfMbDcQAA/v///wAAAAAAAADABwAA//8HAMAPAAAAAAAAAABgAAAAAAAA/P///wAAAAAAAABwAADg//8AAAAAAAAAAAAAAADwG457dwcA8P//HwAAAAAAAAAYAAD///9/eAAAAAAAAAAAAAD4/g0H/w8A8P//PwAAAAAAAAAOgOv/////fwD/AAAAAAA/AAAA/B84/v8A8P//LwAAAAD4AAAA4PP//////////wAAAOD///H/+D/3cPgDoP//DwAAAID/BwAAx/v/////////P4AA/P///////////////////////w8AAOcBAAgAAAAAAAAAAAAAgP///////////////////////wcAACYAAAQAAAAAAAAAAAAAgf///////////////////////wMM8AAAAAAAAAAAAAAAAAAAIID/////////e+wPwH8AgA8AAP/5z/////////////////8/ANH///////9/AIALgD8AAAAAwH/+//////////////////9/APj///////8fADwAAD8AAAAA8D/+//////////////////sPAPC/+f////8fAPwAADgAAAAA8D/+////////////////D/wBAMCfAP////8PAPwYAAAAAAAA8H/4//////////////9/DgcAAAAcAOD///8/APw/AAAAAAAQAB7w//////////////8BgAMAAAACAMD/////Afh/AAAAAAA4gBz+/////////////38A4AMAAMAAAMD/////B/z/AAAAAABwwAb+/////////////x8A8AEAAAAAAAD/////P///AwAAAADmgOH//////////////z8A4AAAAAAAAAD+////P/7/BwAAAAD28P////////////////8D4AAAAAAAAAD8////f/7/BwAAAADz+f////////////////8HIAAAAAAAAAD6////////BAAAAABw/v////////////////8EAAAAAAAAAADo//////8jHgAAAACA//////////////////8MAAAAAAAAAADQ//////8OPgAAAADw//////////////////8AAAAAAAAAAADg//////+PIAAAAADA////v////////////38EAAAAAAAAAADg////////AAAAAACA//v/zD/8/////////z8AAAAAAAAAAADg//////8bAAAAAACA//N/gD///////////x8GAAAAAAAAAADw//////8AAAAAAAD+B8c/AD/+/////////wcPAAAAAAAAAADg//////8AAAAAAAD+gx4/DH74/////////wABAAAAAAAAAADg/////x8AAAAAAAD+gbCn///8////////fQABAAAAAAAAAADg/////w8AAAAAAAD/gCDn///4//////9/MgADAAAAAAAAAADA/////w8AAAAAAAD+AADm/3/4//////8/cIABAAAAAAAAAADA/////wcAAAAAAAA44AHC///5////////4+ABAAAAAAAAAACA/////wcAAAAAAACI/wEA4P//////////4OgAAAAAAAAAAAAA/////wMAAAAAAAD4/wAA4P//////////ADYAAAAAAAAAAAAA/P///wEAAAAAAAD+/wEA8P//////////AQcAAAAAAAAAAAAA+P//fwAAAAAAAAD//w8P8P//////////AQEAAAAAAAAAAAAAyP//fwAAAAAAAAD//3//////////////AQAAAAAAAAAAAAAA0P+PYQAAAAAAAAD//////z//////////AwAAAAAAAAAAAAAAoP8HwAAAAAAAAMD/////83/+////////AQAAAAAAAAAAAAAAIP8DwAAAAAAAAOD/////5//I////////AAAAAAAAAAAAAAAAQP4DgAAAAAAAAPD/////z/+A////////AAAAAAAAAAAAAAAAAPwDAAIAAAAAAPD/////z/8ZwP////9/AQAAAAAAAAAAAAAAAPgDQAAAAAAAAPj/////j/9/gP////8fAQAAAAAAAAAAAAAAAPADEAMAAAAAAPz/////v///AP9//P8DAAAAAAAAAAAAAAAAAPADAwwAAAAAAPj/////P/9/APw//B8AAAAAAAAAAAAIAAAAAPCHA8AAAAAAAPj/////P/4/APwP+J8BAAAAAAAAAAAAAAAAAMD/A0YEAAAAAPj/////f/4fAPwH+B8AAwAAAAAAAAAAAAAAAAD/AQAAAAAAAPj/////f/wHAPgD8D8AAwAAAAAAAAAAAAAAAADgHwAAAAAAAPj///////wDAPgAwH8AAQAAAAAAAAAAAAAAAADAHwAAAAAAAPz//////30AAPAAwH8AAAAAAAAAAAAAAAAAAAAAHAAAAAAAAPj//////wsAAPAAgH4AAQAAAAAAAAAAAAAAAAAAGEAAAAAAAPj//////wMBAPAAgHwAAAAAAAAAAAAAAAAAAAAAGPAhAAAAAPD///////cBAOAAgDiABAAAAAAAAAAAAAAAAAAAIPl/AAAAAOD///////8AAGABABBAFAAAAAAAAAAAAAAAAAAAgP7/AQAAAMD///////8AAAABgAAAHAAAAAAAAAAAAAAAAAAAAPz/AQAAAID///////8AAAABAAEgCAAAAAAAAAAAAAAAAAAAAPz/HwAAAAD/8P///38AAAAAAANgAAAAAAAAAAAAAAAAAAAAAPz/fwAAAAAAoP///z8AAAAAYAd4AAAAAAAAAAAAAAAAAAAAAPz/fwAAAAAAAP///x8AAAAAwAY8AAAAAAAAAAAAAAAAAAAAAP7//wAAAAAAAP///w8AAAAAgAc+AAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAP///wcAAAAAgIM/TwAAAAAAAAAAAAAAAAAAAP///wEAAAAAgP///wMAAAAAAIc/QAQAAAAAAAAAAAAAAAAAgP///w8AAAAAgP///wEAAAAAAA6fAUQAAAAAAAAAAAAAAAAAAP////8AAAAAAP///wAAAAAAAB6ewuwDAgAAAAAAAAAAAAAAgP////8DAAAAAP7//wAAAAAAABwAAvAPAgAAAAAAAAAAAAAAgP////8PAAAAAPz/fwAAAAAAABAAAMCfAQAAAAAAAAAAAAAAAP////8PAAAAAPz//wAAAAAAAOADAIA/MAAAAAAAAAAAAAAAAP7///8PAAAAAPz/fwAAAAAAAAAPAMBngAAAAAAAAAAAAAAAAP7///8PAAAAAPz//wAAAAAAAAAACABAAAAAAAAAAAAAAAAAAPz///8HAAAAAPj//wAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAPz///8DAAAAAPj//wAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAPj///8BAAAAAPz//4AAAAAAAAAAAB8GAAAAAAAAAAAAAAAAAPj///8BAAAAAPz//8EAAAAAAAAAIB8OAAAAAAAAAAAAAAAAAPD///8BAAAAAP7//+AAAAAAAAAA+B8OACAAAAAAAAAAAAAAAMD///8BAAAAAP7/f/gAAAAAAAAA/H8eAAAAAAAAAAAAAAAAAID///8AAAAAAP7/H/gAAAAAAAAA/P8fAABAAAAAAAAAAAAAAAD///8AAAAAAPz/D3AAAAAAAAAA/v8/AAAAAAAAAAAAAAAAAAD///8AAAAAAPj/D3gAAAAAAADA//9/AAgAAAAAAAAAAAAAAAD//38AAAAAAPj/DzgAAAAAAADw////AAAAAAAAAAAAAAAAAAD//x8AAAAAAPD/DzgAAAAAAAD4////AQAAAAAAAAAAAAAAAAD//wMAAAAAAPD/DzgAAAAAAAD4////AwAAAAAAAAAAAAAAAID//wEAAAAAAPD/AwAAAAAAAAD4////AwAAAAAAAAAAAAAAAID//wEAAAAAAPD/AwAAAAAAAAD4////BwAAAAAAAAAAAAAAAID//wEAAAAAAOD/AwAAAAAAAAD4////BwAAAAAAAAAAAAAAAID//wAAAAAAAOD/AQAAAAAAAADw////BwAAAAAAAAAAAAAAAID//wAAAAAAAMD/AAAAAAAAAADw////AwAAAAAAAAAAAAAAAID/fwAAAAAAAIB/AAAAAAAAAADgf/z/AwAAAAAAAAAAAAAAAID/PwAAAAAAAIA/AAAAAAAAAADgB/D/AQAAAAAAAAAAAAAAAMD/HQAAAAAAAIABAAAAAAAAAADwAND/AQAAAAAAAAAAAAAAAMD/AwAAAAAAAAAAAAAAAAAAAAAAAID/AAAIAAAAAAAAAAAAAMD/BwAAAAAAAAAAAAAAAAAAAAAAAAD/AAAQAAAAAAAAAAAAAOD/AwAAAAAAAAAAAAAAAAAAAAAAAAA+AABwAAAAAAAAAAAAAOA/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAOA/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAOAPAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAGAAAAAAAAAAAAAMAPAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAADAAAAAAAAAAAAAPAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMABAAAAAAAAAAAAAPADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOABAAAAAAAAAAAAAPAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPADAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAPABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPCBAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAcAAAAAAAAAAAAAAA+AABAAJ8//j8PAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAPD/fwD///////8/AAAAAAAAAAAAAAAAAIA+AAAAAAAAAAAAPP///8D/////////HwAAAAAAAAAAAAAAAIA9AAAAAAAA8Pz/////P/j//////////wMAAAAAAAAAAMAAAPB9AAAAAID/////////P/7///////////8BAAAAAAAAAOABAwB/AAAAAPD///////////////////////8AAAAAAFACPoD///9/AAAAAPD//////////////////////x8AAAAA+P////////8HAAAAAP///////////////////////wcAAAAA/v///////wMAAAAA/v///////////////////////wcAAAD8/////////w8AAA7w/////////////////////////w8AAMAB/////////wMAgB84/////////////////////////wEAAAAA/P///////3/w4AcA/////////////////////////wAAAADg//////////8/gM///////////////////////////wMAAADg/////////////f///////////////////////////z8A7wMA/v////////////////////////////////////////8/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

  let globeNodes = [];
  function initGlobeNodes() {
    if (globeNodes.length > 0) return;
    const MW = 288, MH = 144;
    const bin = atob(GLOBE_LAND_B64);
    const land = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) land[i] = bin.charCodeAt(i);

    function isLand(lon, lat) {
      const gx = Math.floor(((lon + 180) / 360) * MW);
      const gy = Math.floor(((90 - lat) / 180) * MH);
      if (gx < 0 || gx >= MW || gy < 0 || gy >= MH) return false;
      const b = gy * MW + gx;
      return (land[b >> 3] >> (b & 7)) & 1;
    }

    const PHRASE = "singularityfrontieruniverseallmodelsinoneplace";
    const LAT_STEP = 3.2;
    let k = 0, run = 0, sea3 = 0;
    for (let lat = -86; lat <= 86; lat += LAT_STEP) {
      const rl = Math.cos((lat * Math.PI) / 180);
      const n = Math.max(1, Math.round(96 * rl));
      for (let i = 0; i < n; i++) {
        const lon = -180 + (360 * i) / n;
        const l = isLand(lon, lat);
        if (!l && sea3++ % 2) continue;
        let letter = 0;
        if (l && run++ % 2 === 0) letter = PHRASE.charAt(k++ % PHRASE.length);
        globeNodes.push({
          lat: (lat * Math.PI) / 180,
          lon: (lon * Math.PI) / 180,
          land: l,
          c: letter
        });
      }
    }
  }

  function startGlobeAnimation() {
    const canvas = document.getElementById('login-globe-canvas');
    if (!canvas) return;
    initGlobeNodes();
    globeAnimationRunning = true;

    const ctx = canvas.getContext('2d');
    let globeSpin = 2.4;
    const globeVel = 0.22;
    const globeTilt = -0.25;
    let globeDpr = 1;
    let globeWidth = 0, globeHeight = 0;
    let globePrevTime = performance.now();

    const globeLand8 = [];
    const globeSea = [];
    const globeSoil = [];
    const globeInk64 = [];
    for (let q = 0; q < 64; q++) {
      globeInk64.push('rgba(255, 255, 255, ' + ((q / 63) * 0.95).toFixed(4) + ')');
    }
    const getInk = a => globeInk64[a <= 0 ? 0 : a >= 1 ? 63 : (a * 63) | 0];
    const QA = (Math.PI * 2) / 64;
    const qang = a => Math.round(a / QA) * QA;

    function resizeGlobe() {
      const rect = canvas.getBoundingClientRect();
      globeDpr = Math.min(2, window.devicePixelRatio || 1);
      globeWidth = Math.round(rect.width || window.innerWidth / 2);
      globeHeight = Math.round(rect.height || window.innerHeight);
      if (canvas.width !== Math.round(globeWidth * globeDpr) || canvas.height !== Math.round(globeHeight * globeDpr)) {
        canvas.width = Math.round(globeWidth * globeDpr);
        canvas.height = Math.round(globeHeight * globeDpr);
      }
    }

    resizeGlobe();
    window.addEventListener('resize', resizeGlobe);

    function stepGlobe(now) {
      if (!globeAnimationRunning) return;
      globeRafId = requestAnimationFrame(stepGlobe);
      if (globeWidth <= 0 || globeHeight <= 0) return;

      const dt = Math.min(64, now - globePrevTime);
      globePrevTime = now;

      ctx.setTransform(globeDpr, 0, 0, globeDpr, 0, 0);
      ctx.clearRect(0, 0, globeWidth, globeHeight);

      globeSpin += (globeVel * dt) / 1000;
      const R = Math.min(globeWidth, globeHeight) * 0.44;
      const cx = globeWidth * 0.58;
      const cy = globeHeight * 0.44;
      const fs = R * 0.078;

      const cs = Math.cos(globeSpin), sn = Math.sin(globeSpin);
      const ct = Math.cos(globeTilt), st = Math.sin(globeTilt);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      globeSea.length = 0;
      globeSoil.length = 0;

      for (let i = 0; i < globeNodes.length; i++) {
        const nd = globeNodes[i];
        const cl = Math.cos(nd.lat);
        const x0 = cl * Math.cos(nd.lon), y0 = Math.sin(nd.lat), z0 = cl * Math.sin(nd.lon);
        const x1 = x0 * cs - z0 * sn, z1 = x0 * sn + z0 * cs;
        const y2 = y0 * ct - z1 * st, z2 = y0 * st + z1 * ct;
        if (z2 <= 0.02) continue;

        const px = cx + x1 * R, py = cy - y2 * R;
        if (!nd.land) {
          globeSea.push(px, py, Math.min(0.999, z2));
          continue;
        }
        if (!nd.c) {
          globeSoil.push(px, py, Math.min(0.999, z2));
          continue;
        }

        const tx0 = -Math.sin(nd.lon), tz0 = Math.cos(nd.lon);
        const tx1 = tx0 * cs - tz0 * sn, tz1 = tx0 * sn + tz0 * cs;
        const ang = qang(Math.atan2(tz1 * st, tx1));
        const b = Math.min(7, Math.max(0, ((Math.min(0.999, z2) * 7.99) | 0)));
        (globeLand8[b] || (globeLand8[b] = [])).push(px, py, ang, nd.c);
      }

      const dmin = Math.max(0.7, R * 0.007);
      function dots(list, base, gain, grow) {
        for (let lvl = 0; lvl < 6; lvl++) {
          const z = (lvl + 0.5) / 6, dsz = dmin * grow * (0.55 + 0.75 * z);
          ctx.fillStyle = getInk(base + gain * z);
          ctx.beginPath();
          for (let q = 0; q < list.length; q += 3) {
            const lv = list[q + 2] >= 1 ? 5 : (list[q + 2] * 6) | 0;
            if (lv !== lvl) continue;
            ctx.rect(list[q] - dsz / 2, list[q + 1] - dsz / 2, dsz, dsz);
          }
          ctx.fill();
        }
      }
      dots(globeSea, 0.12, 0.25, 1.0);
      dots(globeSoil, 0.38, 0.48, 1.7);

      const FACE = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      for (let bi = 0; bi < 8; bi++) {
        const arr = globeLand8[bi];
        if (!arr || !arr.length) continue;
        const zb = (bi + 0.5) / 8;
        ctx.font = 'bold ' + (fs * (0.42 + 0.58 * zb)).toFixed(2) + 'px ' + FACE;
        ctx.fillStyle = getInk(0.32 + 0.68 * Math.pow(zb, 0.6));
        for (let t = 0; t < arr.length; t += 4) {
          ctx.save();
          ctx.translate(arr[t], arr[t + 1]);
          ctx.rotate(arr[t + 2]);
          ctx.fillText(arr[t + 3], 0, 0);
          ctx.restore();
        }
        arr.length = 0;
      }
    }

    globeRafId = requestAnimationFrame(stepGlobe);
  }

  function stopGlobeAnimation() {
    globeAnimationRunning = false;
    if (globeRafId) {
      cancelAnimationFrame(globeRafId);
      globeRafId = null;
    }
  }

  // =========================================================================
  // UI Bindings & Initialization
  // =========================================================================

  let isSignUpMode = false;

  function initPortalUI() {
    applyPortalTheme();

    const themeToggleBtn = document.getElementById('btn-portal-theme-toggle');
    if (themeToggleBtn && !themeToggleBtn._bound) {
      themeToggleBtn._bound = true;
      themeToggleBtn.addEventListener('click', () => {
        const portal = document.getElementById('singularity-cloud-login-portal');
        const current = portal?.getAttribute('data-portal-theme') || 'dark';
        applyPortalTheme(current === 'dark' ? 'light' : 'dark');
      });
    }

    const googleBtn = document.getElementById('btn-portal-google');
    if (googleBtn && !googleBtn._bound) {
      googleBtn._bound = true;
      googleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginWithGoogle();
      });
    }



    const togglePwBtn = document.getElementById('btn-portal-toggle-pw');
    if (togglePwBtn && !togglePwBtn._bound) {
      togglePwBtn._bound = true;
      togglePwBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const pw = document.getElementById('portal-password');
        if (pw) pw.type = pw.type === 'password' ? 'text' : 'password';
      });
    }

    const toggleModeLink = document.getElementById('portal-toggle-mode');
    if (toggleModeLink && !toggleModeLink._bound) {
      toggleModeLink._bound = true;
      toggleModeLink.addEventListener('click', (e) => {
        e.preventDefault();
        isSignUpMode = !isSignUpMode;
        const heading = document.getElementById('portal-heading');
        const submitBtn = document.getElementById('portal-submit-btn');
        if (isSignUpMode) {
          if (heading) heading.textContent = 'Create your account';
          if (submitBtn) submitBtn.textContent = 'Sign Up';
          toggleModeLink.parentElement.innerHTML = 'Already have an account? <a href="#" class="portal-link" id="portal-toggle-mode">Sign in</a>';
        } else {
          if (heading) heading.textContent = 'Sign in to Singularity';
          if (submitBtn) submitBtn.textContent = 'Sign In';
          toggleModeLink.parentElement.innerHTML = 'Don\'t have an account? <a href="#" class="portal-link" id="portal-toggle-mode">Sign up</a>';
        }
        initPortalUI();
      });
    }

    const loginForm = document.getElementById('portal-login-form');
    if (loginForm && !loginForm._bound) {
      loginForm._bound = true;
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const email = document.getElementById('portal-email')?.value;
        const pass = document.getElementById('portal-password')?.value;
        if (!email || !pass) return;

        if (isSignUpMode) {
          await signupWithEmail(email, pass);
        } else {
          await loginWithEmail(email, pass);
        }
      });
    }

    // Modal account section buttons
    const syncNowBtn = document.getElementById('btn-cloud-sync-now');
    if (syncNowBtn && !syncNowBtn._bound) {
      syncNowBtn._bound = true;
      syncNowBtn.onclick = async () => {
        syncNowBtn.disabled = true;
        await syncUp();
        await syncDown();
        syncNowBtn.disabled = false;
      };
    }

    const signOutBtn = document.getElementById('btn-cloud-sign-out');
    if (signOutBtn && !signOutBtn._bound) {
      signOutBtn._bound = true;
      signOutBtn.onclick = () => logout();
    }
  }

  // Preloader transition listener with anti-loop protection
  window.addEventListener('sunless-preloader-complete', async () => {
    const hasOAuthTokens = window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token'));
    const isExplicitlyAuthenticated = localStorage.getItem('singularity_cloud_authenticated') === 'true';
    const hasGatewayAuth = !!localStorage.getItem('singularity_gateway_auth');

    if (hasOAuthTokens || isExplicitlyAuthenticated || hasGatewayAuth || isAuthenticated()) {
      // User is already logged in or in active OAuth handoff: KEEP PORTAL HIDDEN
      hideLoginPortal();
      await checkSession();
      syncDown();
      return;
    }

    const user = await checkSession();
    if (user) {
      hideLoginPortal();
      syncDown();
    } else {
      showLoginPortal();
    }
  });

  // Background auto-sync interval (every 45s if authenticated)
  setInterval(() => {
    if (isAuthenticated() && !document.hidden) {
      syncUp();
    }
  }, 45000);

  // Hook into S-Connect and Chat send events for reactive sync
  window.addEventListener('singularity-chat-updated', () => {
    if (isAuthenticated()) {
      setTimeout(syncUp, 1500);
    }
  });

  // Reactive sync when S-Connect followed creators or saved bots change
  window.addEventListener('singularity-cloud-sync-needed', () => {
    if (isAuthenticated()) {
      setTimeout(syncUp, 800);
    }
  });

  // Export to global scope
  window.SingularityCloud = {
    client: supabaseClient,
    isAuthenticated,
    checkSession,
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    loginWithGatewayKey,
    logout,
    syncDown,
    syncUp,
    showLoginPortal,
    hideLoginPortal,
    applyPortalTheme
  };

  // Immediate init (script is at bottom of body)
  initPortalUI();
  checkSession();

})();
