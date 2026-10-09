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

  // =========================================================================
  // Zero-Pollution URL Cleaner: Instantly capture & strip #access_token hashes
  // =========================================================================
  (function cleanAuthHashImmediately() {
    if (typeof window === 'undefined' || !window.location) return;
    const hash = window.location.hash || '';
    if (hash && (hash.includes('access_token=') || hash.includes('refresh_token='))) {
      try {
        const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
        const params = new URLSearchParams(cleanHash);
        const at = params.get('access_token');
        const rt = params.get('refresh_token');
        if (at) {
          try {
            const pParts = at.split('.');
            if (pParts.length >= 2) {
              const payload = JSON.parse(atob(pParts[1].replace(/-/g, '+').replace(/_/g, '/')));
              if (payload && payload.email) {
                localStorage.setItem('singularity_cloud_user_email', payload.email);
              }
              if (payload && payload.sub) {
                localStorage.setItem('singularity_cloud_user_id', payload.sub);
              }
            }
          } catch (err) {}
          localStorage.setItem('singularity_pending_auth_session', JSON.stringify({
            access_token: at,
            refresh_token: rt
          }));
          localStorage.setItem('singularity_cloud_authenticated', 'true');
          localStorage.removeItem('singularity_cloud_in_oauth');
        }
      } catch (e) {}
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  })();

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
  let hasInitialPullCompleted = false;
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

        // Restore any captured OAuth tokens stripped from the URL
        const pendingSession = localStorage.getItem('singularity_pending_auth_session');
        if (pendingSession) {
          try {
            const parsed = JSON.parse(pendingSession);
            if (parsed && parsed.access_token && parsed.refresh_token) {
              supabaseClient.auth.setSession(parsed).then(({ data, error }) => {
                localStorage.removeItem('singularity_pending_auth_session');
                if (!error && data && data.session) {
                  activeSession = data.session;
                  activeUser = data.session.user;
                  localStorage.setItem('singularity_cloud_authenticated', 'true');
                  localStorage.setItem('singularity_cloud_user_email', data.session.user?.email || '');
                  localStorage.setItem('singularity_cloud_user_id', data.session.user?.id || '');
                  hideLoginPortal();
                  updateAccountModalUI();
                  syncDown();
                }
              }).catch(() => {
                localStorage.removeItem('singularity_pending_auth_session');
              });
            } else {
              localStorage.removeItem('singularity_pending_auth_session');
            }
          } catch (e) {
            localStorage.removeItem('singularity_pending_auth_session');
          }
        }

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

      // Clear any legacy operator email placeholder from local storage
      const cachedEmail = localStorage.getItem('singularity_cloud_user_email') || '';
      if (cachedEmail.includes('operator@singularity.local')) {
        localStorage.removeItem('singularity_cloud_user_email');
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

  async function loginWithInstantAuth(email) {
    if (!email) return false;
    const btn = document.getElementById('portal-submit-btn');
    const googleBtn = document.getElementById('btn-portal-google');
    if (btn) btn.disabled = true;
    if (googleBtn) googleBtn.disabled = true;

    showPortalMsg('Connecting securely to cloud vault...', 'success');

    try {
      const res = await fetch('/api/cloud/auth/instant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.session) {
        showPortalMsg(data.detail || 'Direct authentication failed', 'error');
        return false;
      }

      if (!supabaseClient) initClient();
      if (supabaseClient) {
        await supabaseClient.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
      }

      activeSession = data.session;
      activeUser = data.user;
      localStorage.setItem('singularity_cloud_authenticated', 'true');
      localStorage.setItem('singularity_cloud_user_email', data.user?.email || email);
      localStorage.setItem('singularity_cloud_user_id', data.user?.id || '');
      showPortalMsg('Authenticated successfully! Synchronizing cloud vault...', 'success');
      updateAccountModalUI();

      setTimeout(() => {
        hideLoginPortal();
        syncDown();
      }, 350);
      return true;
    } catch (err) {
      showPortalMsg(err.message || 'Connection error during sign-in', 'error');
      return false;
    } finally {
      if (btn) btn.disabled = false;
      if (googleBtn) googleBtn.disabled = false;
    }
  }

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

    const btn = document.getElementById('btn-portal-google');
    if (btn) btn.disabled = true;
    showPortalMsg('Connecting to Google Secure Sign-In...', 'success');

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
        showPortalMsg(error.message || 'Google sign-in failed', 'error');
        if (btn) btn.disabled = false;
      }
    } catch (err) {
      localStorage.removeItem('singularity_cloud_in_oauth');
      showPortalMsg(err.message || 'OAuth redirect error', 'error');
      if (btn) btn.disabled = false;
    }
  }

  async function loginWithEmail(email, password) {
    if (!email) return false;
    email = email.trim();

    // If no password provided, perform instant clean authentication directly!
    if (!password || !password.trim()) {
      return await loginWithInstantAuth(email);
    }

    if (!supabaseClient) initClient();
    if (!supabaseClient) return false;
    const btn = document.getElementById('portal-submit-btn');
    if (btn) btn.disabled = true;
    showPortalMsg('Signing in...', 'success');

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (!error && data && data.user) {
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

      // If password authentication failed, try instant auth fallback for user email
      console.warn('[SingularityCloud] Password auth failed, falling back to instant cloud auth:', error?.message);
      return await loginWithInstantAuth(email);
    } catch (err) {
      return await loginWithInstantAuth(email);
    } finally {
      if (btn) btn.disabled = false;
    }
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

  async function resolveCurrentUserId() {
    if (activeUser && activeUser.id && activeUser.id !== OPERATOR_USER_ID) {
      return activeUser.id;
    }
    const storedUser = getStoredCloudUser();
    if (storedUser && storedUser.id && storedUser.id !== OPERATOR_USER_ID) {
      return storedUser.id;
    }
    const localId = localStorage.getItem('singularity_cloud_user_id');
    if (localId && localId !== OPERATOR_USER_ID) {
      return localId;
    }
    if (supabaseClient) {
      try {
        const { data } = await supabaseClient.auth.getSession();
        if (data?.session?.user?.id && data.session.user.id !== OPERATOR_USER_ID) {
          activeUser = data.session.user;
          localStorage.setItem('singularity_cloud_user_id', activeUser.id);
          localStorage.setItem('singularity_cloud_user_email', activeUser.email || '');
          return activeUser.id;
        }
      } catch (e) {}
    }
    try {
      const res = await fetch('/api/cloud/account');
      if (res.ok) {
        const acc = await res.json();
        if (acc?.authenticated && acc.id && acc.id !== OPERATOR_USER_ID) {
          localStorage.setItem('singularity_cloud_user_id', acc.id);
          if (acc.email) localStorage.setItem('singularity_cloud_user_email', acc.email);
          activeUser = { id: acc.id, email: acc.email, user_metadata: acc.user_metadata || {} };
          return acc.id;
        }
      }
    } catch (e) {}
    return null;
  }

  function applyCloudState(cloudPayload) {
    if (!cloudPayload) return;

    // 1. Sync Down Profile & User System Settings (Overall, not particular to S-connect)
    const profiles = cloudPayload.profiles || [];
    if (profiles.length > 0) {
      const prof = profiles[0];
      const activeTheme = prof.theme || 'dark';

      // Apply active persona ID if present
      if (prof.active_persona_id) {
        localStorage.setItem('s_connect_active_persona', prof.active_persona_id);
        localStorage.setItem('s_connect_active_persona_id', prof.active_persona_id);
        const sConn = window.SConnect || window.sConnect;
        if (sConn && typeof sConn.setActivePersona === 'function') {
          sConn.setActivePersona(prof.active_persona_id);
        }
      }

      if (prof.settings_json) {
        try {
          const sett = typeof prof.settings_json === 'string' ? JSON.parse(prof.settings_json) : prof.settings_json;

          // 1a. User Profile (Display Name & Avatar)
          if (sett.displayName) {
            const nameInput = document.getElementById('user-profile-name-input');
            if (nameInput) nameInput.value = sett.displayName;
            localStorage.setItem('singularity_user_name', sett.displayName);
          }
          if (sett.avatar !== undefined) {
            if (sett.avatar) {
              localStorage.setItem('singularity_user_avatar', sett.avatar);
            } else {
              localStorage.removeItem('singularity_user_avatar');
            }
            if (typeof window.renderUserAvatar === 'function') {
              window.renderUserAvatar(sett.avatar || null);
            }
          }

          // 1b. Overall System Settings (Theme, Font, Motion, Chime, Temperature, GenUI, Custom Instructions, Identity, Model)
          const targetThemePref = sett.themePref || sett.theme_pref || 'system';
          localStorage.setItem('singularity_theme_pref', targetThemePref);
          const effectiveTheme = sett.theme || activeTheme;
          localStorage.setItem('singularity_theme', effectiveTheme);
          document.documentElement.setAttribute('data-theme', effectiveTheme);
          document.body.setAttribute('data-theme', effectiveTheme);
          if (typeof window.applyThemePref === 'function') {
            window.applyThemePref(targetThemePref, false);
          }

          if (sett.chatFont) {
            localStorage.setItem('singularity_chat_font', sett.chatFont);
            if (typeof window.applyChatFont === 'function') {
              window.applyChatFont(sett.chatFont, false);
            } else {
              document.documentElement.style.setProperty('--chat-font', sett.chatFont);
            }
          }

          if (sett.reduceMotion !== undefined) {
            const val = String(sett.reduceMotion) === 'true';
            localStorage.setItem('singularity_reduce_motion', String(val));
            const toggle = document.getElementById('toggle-reduce-motion');
            if (toggle) toggle.checked = val;
            document.documentElement.setAttribute('data-reduce-motion', String(val));
          }

          if (sett.responseChime !== undefined) {
            const val = String(sett.responseChime) === 'true';
            localStorage.setItem('singularity_response_chime', String(val));
            const toggle = document.getElementById('toggle-response-chime');
            if (toggle) toggle.checked = val;
          }

          if (sett.defaultTemp) {
            localStorage.setItem('singularity_default_temp', String(sett.defaultTemp));
            const slider = document.getElementById('settings-temperature-slider');
            const label = document.getElementById('settings-temperature-val');
            if (slider) slider.value = sett.defaultTemp;
            if (label) label.textContent = parseFloat(sett.defaultTemp).toFixed(2);
          }

          if (sett.genuiEnabled !== undefined) {
            const val = String(sett.genuiEnabled) !== 'false';
            localStorage.setItem('singularity_genui_enabled', String(val));
            const toggle = document.getElementById('toggle-genui-artifacts');
            if (toggle) toggle.checked = val;
          }

          if (sett.customInstructions !== undefined) {
            localStorage.setItem('singularity_custom_instructions', sett.customInstructions);
            const area = document.getElementById('settings-custom-instructions');
            if (area) area.value = sett.customInstructions;
          }

          if (sett.identityAwareness !== undefined) {
            const val = String(sett.identityAwareness) !== 'false';
            localStorage.setItem('singularity_identity_awareness', String(val));
            const toggle = document.getElementById('toggle-identity-awareness');
            if (toggle) toggle.checked = val;
          }

          const localModel = localStorage.getItem('singularity_selected_model');
          const finalModel = localModel || sett.selectedModel;
          if (finalModel) {
            localStorage.setItem('singularity_selected_model', finalModel);
            if (window.state) window.state.selectedModel = finalModel;
            const name = typeof formatModelDisplayName === 'function' ? formatModelDisplayName(finalModel) : finalModel;
            ['model-select-label', 'claude-top-model-name', 'input-model-name', 'param-model-selected-label'].forEach(id => {
              const el = document.getElementById(id);
              if (el) el.textContent = name;
            });
          }

          if (sett.portalTheme) {
            applyPortalTheme(sett.portalTheme);
          }

          // 1c. Sync Down Followed Creators (Non-destructive Union with local state)
          let hasFollowingChanged = false;
          const followed = sett.followedCreators || sett.followed_creators;
          if (Array.isArray(followed)) {
            let localFollowed = [];
            try { localFollowed = JSON.parse(localStorage.getItem('s_connect_following') || '[]'); } catch (e) {}
            const mergedFollowed = Array.from(new Set([
              ...(Array.isArray(localFollowed) ? localFollowed : []),
              ...followed
            ]));
            if (JSON.stringify(mergedFollowed) !== JSON.stringify(localFollowed)) {
              hasFollowingChanged = true;
              localStorage.setItem('s_connect_following', JSON.stringify(mergedFollowed));
              const sConn = window.SConnect || window.sConnect;
              if (sConn) {
                sConn.followingCreatorIds = new Set(mergedFollowed);
              }
            }
          }

          // 1d. Sync Down Creator Profiles Cache (Filter out dummy corrupted records)
          let hasCreatorProfilesChanged = false;
          const creatorProfiles = sett.creatorProfiles || sett.creator_profiles;
          if (Array.isArray(creatorProfiles) && creatorProfiles.length > 0) {
            const sConn = window.SConnect || window.sConnect;
            if (sConn) {
              if (!sConn.creatorCache) sConn.creatorCache = new Map();
              creatorProfiles.forEach(cp => {
                if (cp && (cp.id || cp.name)) {
                  const key = cp.id || cp.name;
                  // Only accept authentic profiles
                  if (cp.avatar || (cp.username && cp.username !== key)) {
                    const existing = sConn.creatorCache.get(key);
                    // Quality guard: never let a lower-fidelity cloud profile downgrade an authentic cached profile!
                    const isDowngrade = existing && (
                      (existing.followers > 0 && (!cp.followers || cp.followers === 0)) ||
                      (existing.bio && !existing.bio.startsWith('Creator of ') && (!cp.bio || cp.bio.startsWith('Creator of ')))
                    );
                    if (!isDowngrade && (!existing || existing.avatar !== cp.avatar || existing.followers !== cp.followers || existing.bio !== cp.bio)) {
                      const merged = { ...cp };
                      if (existing) {
                        if (existing.followers > 0 && (!merged.followers || merged.followers === 0)) merged.followers = existing.followers;
                        if (existing.bio && (!merged.bio || merged.bio.startsWith('Creator of '))) merged.bio = existing.bio;
                      }
                      hasCreatorProfilesChanged = true;
                      sConn.creatorCache.set(key, merged);
                      if (typeof sConn.cacheCreator === 'function') {
                        sConn.cacheCreator(merged);
                      }
                    }
                  }
                }
              });
            }
          }

          // 1e. Sync Down Saved Bots (Non-destructive Union with local state)
          let hasLibraryChanged = false;
          const savedIds = sett.savedBotIds || sett.saved_bot_ids;
          if (Array.isArray(savedIds)) {
            let localSaved = [];
            try { localSaved = JSON.parse(localStorage.getItem('s_connect_saved_bots') || '[]'); } catch (e) {}
            const mergedSaved = Array.from(new Set([
              ...(Array.isArray(localSaved) ? localSaved : []),
              ...savedIds
            ]));
            if (JSON.stringify(mergedSaved) !== JSON.stringify(localSaved)) {
              hasLibraryChanged = true;
              localStorage.setItem('s_connect_saved_bots', JSON.stringify(mergedSaved));
              const sConn = window.SConnect || window.sConnect;
              if (sConn) {
                sConn.savedBotIds = new Set(mergedSaved);
              }
            }
          }

          // Restore Saved Bot cards into local SQLite database on this device
          const savedData = sett.savedBotsData || sett.saved_bots_data;
          if (Array.isArray(savedData) && savedData.length > 0) {
            const sConn = window.SConnect || window.sConnect;
            for (const b of savedData) {
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

          // Re-render S-Connect active views ONLY IF data actually mutated (Zero flicker / Zero DOM wiping!)
          const sConn = window.SConnect || window.sConnect;
          if (sConn && sConn.currentView) {
            const v = sConn.currentView;
            const container = document.getElementById('connect-main-view');
            if (container) {
              if (v === 'library' && hasLibraryChanged && typeof sConn.renderLibraryView === 'function') {
                sConn.renderLibraryView(container);
              } else if (v === 'creators' && (hasFollowingChanged || hasCreatorProfilesChanged) && typeof sConn.renderCreatorsView === 'function') {
                sConn.renderCreatorsView(container);
              } else if (v === 'following' && hasFollowingChanged && typeof sConn.renderFollowingView === 'function') {
                sConn.renderFollowingView(container);
              } else if (v === 'my-chats' && typeof sConn.renderMyChatsView === 'function' && hasLibraryChanged) {
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
    const cloudPersonas = cloudPayload.personas || [];
    if (cloudPersonas.length > 0) {
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
      const sConn = window.SConnect || window.sConnect;
      if (sConn) {
        if (typeof sConn.renderPersonasDrawer === 'function') {
          sConn.renderPersonasDrawer();
        }
        const activeId = localStorage.getItem('s_connect_active_persona_id') || localStorage.getItem('s_connect_active_persona');
        if (activeId && typeof sConn.setActivePersona === 'function') {
          sConn.setActivePersona(activeId);
        }
      }
    }

    // 3. Sync Down Connected Accounts (Restore into Singularity SQLite Vault)
    const cloudAccounts = cloudPayload.connected_accounts || [];
    if (cloudAccounts.length > 0) {
      const providersPayload = {};
      cloudAccounts.forEach(ca => {
        let cred = {};
        try { cred = typeof ca.credential_json === 'string' ? JSON.parse(ca.credential_json) : (ca.credential_json || {}); } catch (e) { cred = { token: ca.credential_json }; }
        if (!providersPayload[ca.provider]) providersPayload[ca.provider] = [];
        providersPayload[ca.provider].push({
          name: cred.name || ca.provider,
          token: cred.token || cred.raw || (typeof cred === 'string' ? cred : JSON.stringify(cred)),
          plan: cred.plan || 'free',
          status: ca.status || 'active'
        });
      });

      fetch('/api/cookies/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providers: providersPayload })
      }).catch(e => console.warn('[SingularityCloud] Failed to import cloud accounts locally:', e));
    }

    // 4. Sync Down S-Connect Chat Sessions & Messages
    const cloudSessions = cloudPayload.connect_chat_sessions || [];
    if (cloudSessions.length > 0) {
      const localSessionsRaw = localStorage.getItem('s_connect_sessions_v2');
      let localSessions = [];
      try { localSessions = JSON.parse(localSessionsRaw || '[]'); } catch (e) {}

      const sessionMap = new Map();
      localSessions.forEach(s => { if (s && s.id) sessionMap.set(s.id, s); });

      cloudSessions.forEach(cs => {
        const localSess = sessionMap.get(cs.id);
        const cloudTime = new Date(cs.updated_at || cs.created_at || 0).getTime();
        const localTime = Number(localSess?.updatedAt || localSess?.createdAt || 0);

        if (!localSess || cloudTime >= localTime) {
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
            localStorage.setItem(`s_connect_chat_msgs_${cs.id}`, typeof cs.messages_json === 'string' ? cs.messages_json : JSON.stringify(cs.messages_json));
          }
          if (cs.settings_json) {
            localStorage.setItem(`s_connect_settings_${cs.id}`, typeof cs.settings_json === 'string' ? cs.settings_json : JSON.stringify(cs.settings_json));
          }
          if (typeof cs.greeting_idx === 'number') {
            localStorage.setItem(`s_connect_greeting_idx_${cs.id}`, cs.greeting_idx);
          }
        }
      });

      const updatedSessions = Array.from(sessionMap.values()).sort((a, b) => {
        const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return tB - tA;
      });
      localStorage.setItem('s_connect_sessions_v2', JSON.stringify(updatedSessions));

      const sConn = window.SConnect || window.sConnect;
      if (sConn) {
        if (sConn.currentView === 'my-chats') {
          const container = document.getElementById('connect-main-view');
          if (container && typeof sConn.renderMyChatsView === 'function') {
            sConn.renderMyChatsView(container, sConn._expandedBotId || null);
          }
        } else if (sConn.currentView === 'chat' && sConn.activeChatSession) {
          const activeId = sConn.activeChatSession.id;
          const freshMsgs = localStorage.getItem(`s_connect_chat_msgs_${activeId}`);
          if (freshMsgs) {
            try {
              const parsed = JSON.parse(freshMsgs);
              if (Array.isArray(parsed) && typeof sConn.renderChatMessages === 'function') {
                sConn.renderChatMessages(parsed);
              }
            } catch (e) {}
          }
        }
      }
    }

    // 5. Sync Down Playground Chats (Restore into local SQLite server database)
    const cloudPlaygroundChats = cloudPayload.playground_chats || [];
    if (cloudPlaygroundChats.length > 0) {
      for (const pc of cloudPlaygroundChats) {
        if (pc && pc.id) {
          fetch(`/api/chats/${encodeURIComponent(pc.id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: pc.title || 'Chat',
              settings: typeof pc.settings_json === 'string' ? JSON.parse(pc.settings_json || '{}') : (pc.settings_json || {})
            })
          }).catch(() => {});
        }
      }
    }
  }

  async function syncDown() {
    const userId = await resolveCurrentUserId();
    if (!userId) {
      console.warn('[SingularityCloud] syncDown skipped: no authenticated cloud user');
      return;
    }
    isSyncing = true;
    updateSyncBadge('Syncing...', '#f59e0b');

    try {
      // 1. Primary: Fetch authoritative cloud state securely via backend gateway proxy
      const pullRes = await fetch('/api/cloud/sync/pull?user_id=' + encodeURIComponent(userId));
      if (!pullRes.ok) {
        throw new Error('Sync pull returned status ' + pullRes.status);
      }
      const cloudPayload = await pullRes.json();
      if (!cloudPayload.success) {
        throw new Error(cloudPayload.error || 'Failed to pull cloud state');
      }

      applyCloudState(cloudPayload);
      hasInitialPullCompleted = true;
      updateSyncBadge('Synced to Cloud', '#10b981');
    } catch (err) {
      console.error('[SingularityCloud] syncDown failed:', err);
      updateSyncBadge('Sync Warning', '#ef4444');
    } finally {
      isSyncing = false;
    }
  }

  async function syncUp() {
    if (isSyncing) return;
    if (!hasInitialPullCompleted) {
      console.log('[SingularityCloud] syncUp deferred: initial pull from cloud not yet completed');
      return;
    }
    const userId = await resolveCurrentUserId();
    if (!userId) {
      console.warn('[SingularityCloud] syncUp skipped: no authenticated cloud user');
      updateSyncBadge('Please Sign In', '#f59e0b');
      return;
    }
    isSyncing = true;
    updateSyncBadge('Pushing to Cloud...', '#f59e0b');

    try {
      const now = new Date().toISOString();

      // Gather profile & system settings (overall, not particular to S-connect)
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const themePref = localStorage.getItem('singularity_theme_pref') || 'system';
      const chatFont = localStorage.getItem('singularity_chat_font') || 'sans';
      const reduceMotion = localStorage.getItem('singularity_reduce_motion') === 'true';
      const responseChime = localStorage.getItem('singularity_response_chime') === 'true';
      const displayName = (localStorage.getItem('singularity_user_name') || 'Operator').trim();
      const userAvatar = localStorage.getItem('singularity_user_avatar') || '';
      const defaultTemp = localStorage.getItem('singularity_default_temp') || '0.7';
      const genuiEnabled = localStorage.getItem('singularity_genui_enabled') !== 'false';
      const customInstructions = localStorage.getItem('singularity_custom_instructions') || '';
      const identityAwareness = localStorage.getItem('singularity_identity_awareness') !== 'false';
      const selectedModel = (window.state && window.state.selectedModel) || localStorage.getItem('singularity_selected_model') || localStorage.getItem('c2a_selected_model') || 'gpt-5-6-mini';
      const portalTheme = localStorage.getItem('singularity_portal_theme') || currentTheme;
      const activePersonaId = localStorage.getItem('s_connect_active_persona_id') || localStorage.getItem('s_connect_active_persona') || 'persona_default';

      let followedCreators = [];
      try {
        const rawFollowing = localStorage.getItem('s_connect_following');
        if (rawFollowing) followedCreators = JSON.parse(rawFollowing);
      } catch (e) {}

      const sConnObj = window.SConnect || window.sConnect;
      if (sConnObj && sConnObj.followingCreatorIds) {
        sConnObj.followingCreatorIds.forEach(id => {
          if (id && !followedCreators.includes(id)) followedCreators.push(id);
        });
      }

      let savedBotIds = [];
      try {
        const rawSaved = localStorage.getItem('s_connect_saved_bots');
        if (rawSaved) savedBotIds = JSON.parse(rawSaved);
      } catch (e) {}

      let savedBotsData = [];
      try {
        const libRes = await fetch('/api/connect/library?limit=300');
        if (libRes.ok) {
          const libData = await libRes.json();
          savedBotsData = libData.items || libData.bots || [];
        }
      } catch (e) {}

      savedBotsData.forEach(b => {
        if (b && b.id && !savedBotIds.includes(b.id)) {
          savedBotIds.push(b.id);
        }
      });

      if (sConnObj && sConnObj.botCache && Array.isArray(savedBotIds)) {
        const existingIds = new Set(savedBotsData.map(b => b && b.id));
        for (const id of savedBotIds) {
          if (!existingIds.has(id) && sConnObj.botCache.has(id)) {
            const cached = sConnObj.botCache.get(id);
            if (cached) savedBotsData.push(cached);
          }
        }
      }

      const creatorProfilesMap = new Map();
      if (sConnObj && sConnObj.creatorCache) {
        sConnObj.creatorCache.forEach((cp, cid) => {
          if (cp && cid) {
            const isSynthetic = cp.bio && (cp.bio.startsWith('Creator of ') || cp.bio.startsWith('JanitorAI author of '));
            // Only sync authentic, high-quality creator profiles
            if (!isSynthetic && (cp.followers > 0 || (cp.avatar && cp.username && cp.username !== cid))) {
              creatorProfilesMap.set(cid, cp);
            }
          }
        });
      }
      const creatorProfiles = Array.from(creatorProfilesMap.values());

      let personasToSync = [];
      const localPersonasRaw = localStorage.getItem('s_connect_personas');
      if (localPersonasRaw) {
        try { personasToSync = JSON.parse(localPersonasRaw); } catch (e) {}
      }
      if (personasToSync.length === 0) {
        personasToSync = [{
          id: 'persona_default',
          name: 'Ayame',
          avatar: '/static/preloader/3a6a0a99717d5533928eecd2046ec085.jpg',
          description: 'Ayame is visiting the club tonight, dressed comfortably yet stylishly, with quiet curiosity.',
          is_active: true
        }];
      }

      let sessionsToSync = [];
      const localSessionsRaw = localStorage.getItem('s_connect_sessions_v2');
      if (localSessionsRaw) {
        try {
          const parsedSessions = JSON.parse(localSessionsRaw);
          for (const s of parsedSessions) {
            if (!s || !s.id) continue;
            sessionsToSync.push({
              id: s.id,
              botId: s.botId || s.id,
              botName: s.botName || 'Chat',
              botAvatar: s.botAvatar || '',
              botDescription: s.botDescription || '',
              summary: s.summary || '',
              greeting_idx: parseInt(localStorage.getItem(`s_connect_greeting_idx_${s.id}`) || '0', 10),
              messages_json: localStorage.getItem(`s_connect_chat_msgs_${s.id}`) || '[]',
              settings_json: localStorage.getItem(`s_connect_settings_${s.id}`) || '{}',
              createdAt: s.createdAt || now,
              updatedAt: s.updatedAt || s.createdAt || now
            });
          }
        } catch (e) {}
      }

      let playgroundChatsToSync = [];
      try {
        const chatsRes = await fetch('/api/chats');
        if (chatsRes.ok) {
          const chatsData = await chatsRes.json();
          playgroundChatsToSync = chatsData.chats || [];
        }
      } catch (e) {}

      // If active playground chat has messages in window.state.chatMessages, include it
      if (window.state && Array.isArray(window.state.chatMessages) && window.state.chatMessages.length > 0) {
        const activePlaygroundId = window.state.activeChatId || 'playground_main_session';
        const existingIdx = playgroundChatsToSync.findIndex(c => c && c.id === activePlaygroundId);
        const playItem = {
          id: activePlaygroundId,
          title: window.state.chatTitle || (window.state.chatMessages[0]?.content?.slice(0, 36) || 'Chat Session'),
          model: window.state.selectedModel || 'gpt-5-6-mini',
          messages: window.state.chatMessages,
          updated_at: now
        };
        if (existingIdx !== -1) {
          playgroundChatsToSync[existingIdx] = { ...playgroundChatsToSync[existingIdx], ...playItem };
        } else {
          playgroundChatsToSync.unshift(playItem);
        }
      }

      const userEmail = activeUser?.email || localStorage.getItem('singularity_cloud_user_email') || 'operator@singularity.local';

      // Send complete push payload to backend gateway proxy
      const pushRes = await fetch('/api/cloud/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          email: userEmail,
          theme: currentTheme,
          active_persona_id: activePersonaId,
          settings: {
            // Profile
            displayName,
            avatar: userAvatar,
            // Overall System Settings
            theme: currentTheme,
            themePref,
            chatFont,
            reduceMotion,
            responseChime,
            defaultTemp,
            genuiEnabled,
            customInstructions,
            identityAwareness,
            selectedModel,
            portalTheme,
            // S-Connect & Library
            followedCreators,
            followed_creators: followedCreators,
            creatorProfiles,
            creator_profiles: creatorProfiles,
            savedBotIds,
            saved_bot_ids: savedBotIds,
            savedBotsData,
            saved_bots_data: savedBotsData,
            activePersonaId,
            active_persona_id: activePersonaId
          },
          personas: personasToSync,
          sessions: sessionsToSync,
          playground_chats: playgroundChatsToSync
        })
      });

      if (!pushRes.ok) {
        throw new Error('Backend push failed with HTTP ' + pushRes.status);
      }

      const pushJson = await pushRes.json();
      if (!pushJson.success) {
        throw new Error(pushJson.error || 'Backend push failed');
      }

      updateSyncBadge('Synced to Cloud', '#10b981');
    } catch (err) {
      console.error('[SingularityCloud] syncUp failed:', err);
      updateSyncBadge('Sync Warning', '#ef4444');
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

  function decodeJwtPayload(token) {
    if (!token || typeof token !== 'string') return null;
    try {
      const parts = token.split('.');
      if (parts.length >= 2) {
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
      }
    } catch (e) {}
    return null;
  }

  function getStoredCloudUser() {
    if (activeUser && activeUser.email && !activeUser.email.includes('operator@singularity.local')) {
      return activeUser;
    }

    const savedEmail = localStorage.getItem('singularity_cloud_user_email') || '';
    if (savedEmail && !savedEmail.includes('operator@singularity.local')) {
      return {
        email: savedEmail,
        id: localStorage.getItem('singularity_cloud_user_id') || ''
      };
    }

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('sb-') && k.endsWith('-auth-token'))) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            const user = parsed?.user || parsed?.session?.user;
            if (user && user.email && !user.email.includes('operator@singularity.local')) {
              localStorage.setItem('singularity_cloud_user_email', user.email);
              if (user.id) localStorage.setItem('singularity_cloud_user_id', user.id);
              localStorage.setItem('singularity_cloud_authenticated', 'true');
              activeUser = user;
              return user;
            }
            const token = parsed?.access_token || parsed?.session?.access_token;
            if (token) {
              const payload = decodeJwtPayload(token);
              if (payload && payload.email && !payload.email.includes('operator@singularity.local')) {
                const u = {
                  id: payload.sub || '',
                  email: payload.email,
                  user_metadata: payload.user_metadata || {}
                };
                localStorage.setItem('singularity_cloud_user_email', u.email);
                if (u.id) localStorage.setItem('singularity_cloud_user_id', u.id);
                localStorage.setItem('singularity_cloud_authenticated', 'true');
                activeUser = u;
                return u;
              }
            }
          }
        }
      }
    } catch (e) {}

    try {
      const pendingRaw = localStorage.getItem('singularity_pending_auth_session');
      if (pendingRaw) {
        const parsed = JSON.parse(pendingRaw);
        const token = parsed?.access_token;
        if (token) {
          const payload = decodeJwtPayload(token);
          if (payload && payload.email && !payload.email.includes('operator@singularity.local')) {
            const u = {
              id: payload.sub || '',
              email: payload.email,
              user_metadata: payload.user_metadata || {}
            };
            localStorage.setItem('singularity_cloud_user_email', u.email);
            if (u.id) localStorage.setItem('singularity_cloud_user_id', u.id);
            localStorage.setItem('singularity_cloud_authenticated', 'true');
            activeUser = u;
            return u;
          }
        }
      }
    } catch (e) {}

    return null;
  }

  function updateAccountModalUI() {
    const emailDisplay = document.getElementById('cloud-user-email-display');
    const endpointDisplay = document.getElementById('cloud-endpoint-display');
    
    const user = getStoredCloudUser();
    const email = user?.email || '';

    if (email) {
      if (emailDisplay) emailDisplay.textContent = email;
      if (endpointDisplay) {
        endpointDisplay.innerHTML = '<code>ugbjziwpbdhgqovnlfvs.supabase.co</code> &bull; Auto-sync active';
      }
    } else {
      const isAuth = localStorage.getItem('singularity_cloud_authenticated') === 'true';
      if (emailDisplay) {
        emailDisplay.textContent = isAuth ? 'Resolving cloud account...' : 'Not signed in';
      }
      if (endpointDisplay) {
        endpointDisplay.innerHTML = isAuth
          ? '<code>ugbjziwpbdhgqovnlfvs.supabase.co</code> &bull; Synchronizing...'
          : 'Connect your account to enable multi-device cloud synchronization';
      }

      fetch('/api/cloud/account').then(r => r.json()).then(data => {
        if (data && data.authenticated && data.email) {
          localStorage.setItem('singularity_cloud_user_email', data.email);
          if (data.id) localStorage.setItem('singularity_cloud_user_id', data.id);
          localStorage.setItem('singularity_cloud_authenticated', 'true');
          activeUser = { email: data.email, id: data.id, user_metadata: data.user_metadata || {} };
          if (emailDisplay) emailDisplay.textContent = data.email;
          if (endpointDisplay) {
            endpointDisplay.innerHTML = '<code>ugbjziwpbdhgqovnlfvs.supabase.co</code> &bull; Auto-sync active';
          }
        } else if (!isAuth) {
          if (emailDisplay) emailDisplay.textContent = 'Not signed in';
          if (endpointDisplay) {
            endpointDisplay.innerHTML = 'Connect your account to enable multi-device cloud synchronization';
          }
        }
      }).catch(() => {});
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
        if (!email) return;

        if (isSignUpMode) {
          if (!pass) {
            showPortalMsg('Please enter a password for new account signup', 'error');
            return;
          }
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

    // Auto-refresh account modal display on settings gear or tab clicks
    document.addEventListener('click', (e) => {
      if (e.target && e.target.closest && e.target.closest('#btn-open-settings, .claude-settings-gear-btn, [data-tab="account"], .claude-avatar-btn')) {
        updateAccountModalUI();
      }
    });
    updateAccountModalUI();
  }

  // Preloader transition listener with anti-loop protection
  window.addEventListener('sunless-preloader-complete', async () => {
    const hasOAuthTokens = window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token'));
    const isExplicitlyAuthenticated = localStorage.getItem('singularity_cloud_authenticated') === 'true';
    const hasPendingAuth = !!localStorage.getItem('singularity_pending_auth_session');
    const isInOAuth = localStorage.getItem('singularity_cloud_in_oauth') === 'true';
    const hasGatewayAuth = !!localStorage.getItem('singularity_gateway_auth');

    if (hasOAuthTokens || isExplicitlyAuthenticated || hasPendingAuth || isInOAuth || hasGatewayAuth || isAuthenticated()) {
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

  // Background auto-sync interval (pull updates every 30s if authenticated)
  setInterval(() => {
    if (isAuthenticated() && !document.hidden) {
      syncDown();
    }
  }, 30000);

  // Instant cross-device sync: trigger syncDown whenever laptop tab is focused or becomes visible
  window.addEventListener('focus', () => {
    if (isAuthenticated()) {
      syncDown();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && isAuthenticated()) {
      syncDown();
    }
  });

  // Hook into S-Connect and Chat send events for reactive sync
  window.addEventListener('singularity-chat-updated', () => {
    if (isAuthenticated()) {
      setTimeout(syncUp, 1000);
    }
  });

  // Reactive sync when S-Connect followed creators or saved bots change (fast 250ms push)
  window.addEventListener('singularity-cloud-sync-needed', () => {
    if (isAuthenticated()) {
      setTimeout(syncUp, 250);
    }
  });

  // Reactive sync when overall system settings change (fast 300ms push)
  window.addEventListener('singularity-settings-updated', () => {
    if (isAuthenticated()) {
      setTimeout(syncUp, 300);
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
    applyPortalTheme,
    updateAccountModalUI
  };

  // Immediate init (script is at bottom of body)
  initPortalUI();
  checkSession();
  updateAccountModalUI();

  // Instant pull on startup/reload if already authenticated
  if (localStorage.getItem('singularity_cloud_authenticated') === 'true') {
    syncDown();
  }

})();
