/**
 * Singularity App Frontend Logic
 * Universal AI Gateway & Hub Client
 */

// Global State
const state = {
  currentTab: 'playground',
  services: [],
  limits: {},
  models: [],
  activeCookieProvider: 'chatgpt',
  cookiesData: {},
  selectedModel: 'gpt-5.6-sol',
  chatMessages: [],
  isStreaming: false,
  playgroundModality: 'all',
  selectedAspectRatio: '1:1',
  tunnel: { status: 'offline', public_url: null, has_authtoken: false },
  enableArtifacts: true,
  artifacts: {},
  activeArtifactId: null,
  activeArtifactView: 'preview',
  artifactWorkbenchOpen: false,
  toolsEnabled: false,
  toolsInfo: null,
};

// ===================================================================
// Custom Toast Notification System (NO DEFAULT GOOGLE POPUPS)
// ===================================================================
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconSvg = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97757" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
  }[type] || '';

  toast.innerHTML = `
    ${iconSvg}
    <div class="toast-message">${escapeHtml(message)}</div>
    <button class="toast-close" title="Close">&times;</button>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Media URLs pulled out of model output: allow only web, generated-file and inline media sources.
// Callers still escapeHtml() the result before putting it in an attribute.
function safeMediaUrl(url) {
  const u = String(url || '').trim();
  if (/^https?:\/\//i.test(u) || /^\/static\//.test(u) || /^blob:/i.test(u)) return u;
  if (/^data:(?:image\/(?:png|jpe?g|gif|webp|svg\+xml)|video\/(?:mp4|webm));base64,[A-Za-z0-9+/=]+$/i.test(u)) return u;
  return '';
}

// ===================================================================
// Gateway Login (off-machine browsers only: phone, LAN, ngrok tunnel)
// ===================================================================
// On the machine running Singularity the gateway trusts loopback requests, so this never shows.
// Anywhere else, the gateway answers 401 until the browser logs in with the gateway key and
// receives an HttpOnly session cookie.

const nativeFetch = window.fetch.bind(window);
let gatewayLoginShown = false;

function showGatewayLogin() {
  if (gatewayLoginShown || !document.body) return;
  gatewayLoginShown = true;

  const overlay = document.createElement('div');
  overlay.id = 'gateway-login-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'gateway-login-title');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:var(--bg-primary);';
  overlay.innerHTML = `
    <form style="width:100%;max-width:380px;display:flex;flex-direction:column;gap:12px;padding:24px;border-radius:var(--radius-xl);border:1px solid var(--border-medium);background:var(--bg-elevated);box-shadow:var(--shadow-lg);color:var(--text-primary);font-family:var(--font-sans);">
      <div id="gateway-login-title" style="font-family:var(--font-serif);font-size:var(--font-size-xl);">Enter gateway key</div>
      <div style="font-size:var(--font-size-sm);color:var(--text-muted);line-height:1.5;">
        This device isn't the one running Singularity. On that machine, run
        <code style="font-family:var(--font-mono);">./singular key</code> and paste the key here.
      </div>
      <input type="password" name="key" autocomplete="current-password" placeholder="sk-sing-…" required
             style="padding:10px 12px;border-radius:var(--radius-md);border:1px solid var(--border-medium);background:var(--bg-input);color:var(--text-primary);font-family:var(--font-mono);font-size:var(--font-size-sm);" />
      <div class="gateway-login-error" role="alert" style="font-size:var(--font-size-xs);color:var(--color-error);min-height:16px;"></div>
      <button type="submit" style="padding:10px 12px;border:none;border-radius:var(--radius-md);background:var(--brand-primary);color:#fff;font-weight:600;font-size:var(--font-size-sm);cursor:pointer;">Unlock</button>
    </form>`;
  document.body.appendChild(overlay);

  const form = overlay.querySelector('form');
  const input = overlay.querySelector('input');
  const errorEl = overlay.querySelector('.gateway-login-error');
  input.focus();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    try {
      const res = await nativeFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: input.value.trim() }),
      });
      if (res.ok) {
        window.location.reload();
        return;
      }
      errorEl.textContent = 'That key was not accepted.';
    } catch (err) {
      errorEl.textContent = `Could not reach Singularity: ${err.message}`;
    }
    input.select();
  });
}

window.fetch = async (input, init) => {
  const res = await nativeFetch(input, init);
  if (res.status === 401) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.startsWith('/') || url.startsWith(window.location.origin)) showGatewayLogin();
  }
  return res;
};

nativeFetch('/api/auth/status')
  .then((r) => r.json())
  .then((s) => {
    if (s && s.authenticated === false) {
      if (document.body) showGatewayLogin();
      else document.addEventListener('DOMContentLoaded', showGatewayLogin);
    }
  })
  .catch(() => {});

// ===================================================================
// Theme Controller (3-Option Segmented Control + OS Dynamic Scheme)
// ===================================================================
let systemThemeMediaQuery = null;

function applyThemePref(pref, animate = true) {
  const validPref = ['system', 'light', 'dark'].includes(pref) ? pref : 'system';
  localStorage.setItem('singularity_theme_pref', validPref);

  let effectiveTheme = validPref;
  if (validPref === 'system') {
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    effectiveTheme = isDark ? 'dark' : 'light';
  }

  if (animate) {
    document.documentElement.classList.add('theme-transitioning');
    clearTimeout(window.__themeTransitionTimeout);
    window.__themeTransitionTimeout = setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 280);
  }

  document.documentElement.setAttribute('data-theme', effectiveTheme);
  localStorage.setItem('singularity_theme', effectiveTheme);

  // Update 3-icon segmented control UI
  const btnSystem = document.getElementById('btn-theme-system');
  const btnLight = document.getElementById('btn-theme-light');
  const btnDark = document.getElementById('btn-theme-dark');
  const indicator = document.getElementById('theme-seg-indicator');

  if (btnSystem) {
    btnSystem.classList.toggle('active', validPref === 'system');
    btnSystem.setAttribute('aria-checked', validPref === 'system' ? 'true' : 'false');
  }
  if (btnLight) {
    btnLight.classList.toggle('active', validPref === 'light');
    btnLight.setAttribute('aria-checked', validPref === 'light' ? 'true' : 'false');
  }
  if (btnDark) {
    btnDark.classList.toggle('active', validPref === 'dark');
    btnDark.setAttribute('aria-checked', validPref === 'dark' ? 'true' : 'false');
  }

  if (indicator) {
    if (validPref === 'system') indicator.style.transform = 'translateX(0%)';
    else if (validPref === 'light') indicator.style.transform = 'translateX(100%)';
    else if (validPref === 'dark') indicator.style.transform = 'translateX(200%)';
  }

  if (typeof syncGlobeTheme === 'function' && typeof globeRunning !== 'undefined' && globeRunning) {
    var isOnline = state.tunnel && state.tunnel.status === 'online';
    syncGlobeTheme(isOnline);
  }
}

function setAppTheme(theme) {
  applyThemePref(theme, true);
}

function initTheme() {
  const savedPref = localStorage.getItem('singularity_theme_pref') || 
                    (localStorage.getItem('singularity_theme') ? localStorage.getItem('singularity_theme') : 'system');
  applyThemePref(savedPref, false);

  // Dynamic OS preference listener
  if (window.matchMedia && !systemThemeMediaQuery) {
    systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    systemThemeMediaQuery.addEventListener('change', (e) => {
      const currentPref = localStorage.getItem('singularity_theme_pref') || 'system';
      if (currentPref === 'system') {
        applyThemePref('system', true);
      }
    });
  }

  // 3-Icon Segmented Buttons Event Listeners
  const btnSystem = document.getElementById('btn-theme-system');
  const btnLight = document.getElementById('btn-theme-light');
  const btnDark = document.getElementById('btn-theme-dark');

  if (btnSystem) {
    btnSystem.addEventListener('click', (e) => {
      e.stopPropagation();
      applyThemePref('system', true);
      showToast('Theme set to Match System', 'info', 1800);
    });
  }
  if (btnLight) {
    btnLight.addEventListener('click', (e) => {
      e.stopPropagation();
      applyThemePref('light', true);
      showToast('Theme set to Light Mode', 'info', 1800);
    });
  }
  if (btnDark) {
    btnDark.addEventListener('click', (e) => {
      e.stopPropagation();
      applyThemePref('dark', true);
      showToast('Theme set to Dark Mode', 'info', 1800);
    });
  }

  // Initialize Profile Settings
  initClaudeSettings();
}

function initUserProfile() {
  return initClaudeSettings();
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard write failed, using fallback:', err);
    }
  }
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err);
    return false;
  }
}

function processAvatarFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Please select an image file (PNG, JPG, WebP).'));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        const targetDim = Math.min(size, 256);
        const canvas = document.createElement('canvas');
        canvas.width = targetDim;
        canvas.height = targetDim;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, size, size, 0, 0, targetDim, targetDim);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

function playCompletionChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    
    // Smooth chime: C5 (523.25Hz) followed by E5 (659.25Hz)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.08);

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.06, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.08);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
    setTimeout(() => ctx.close(), 600);
  } catch (err) {
    // AudioContext autoplay might be constrained; ignore silently
  }
}

function initClaudeSettings() {
  if (window._claudeSettingsInitialized) return;
  window._claudeSettingsInitialized = true;

  const settingsBtn = document.getElementById('btn-open-settings') || document.getElementById('btn-user-avatar');
  const settingsModal = document.getElementById('claude-settings-modal');
  const settingsDialog = document.getElementById('claude-settings-dialog');
  const closeBtn = document.getElementById('btn-close-settings-modal');
  const searchInput = document.getElementById('claude-settings-search');
  const navItems = document.querySelectorAll('.claude-settings-nav-item');
  const panels = document.querySelectorAll('.claude-settings-panel');
  const avatarUploadTrigger = document.getElementById('user-avatar-upload-trigger');
  const avatarCircle = document.getElementById('user-profile-avatar-circle');
  const avatarFileInput = document.getElementById('user-avatar-file-input');
  const removeAvatarBtn = document.getElementById('btn-remove-avatar');
  const nameInput = document.getElementById('user-profile-name-input');
  const saveNameBtn = document.getElementById('btn-save-user-name');
  const copyEndpointRow = document.getElementById('profile-copy-endpoint');
  const endpointTextEl = document.getElementById('profile-endpoint-text');
  const endpointCopyBtn = document.getElementById('btn-copy-gateway-endpoint');
  const copyHintEl = document.getElementById('profile-copy-hint');
  const apikeyCopyRow = document.getElementById('apikey-copy-row');
  const apikeyCopyBtn = document.getElementById('btn-copy-apikey');
  const apikeyCopyHint = document.getElementById('apikey-copy-hint');
  const profileApikeyText = document.getElementById('profile-apikey-text');
  const inputGatewayKey = document.getElementById('input-gateway-key');
  const btnSaveGatewayKey = document.getElementById('btn-save-gateway-key');
  const btnCopyCustomGatewayKey = document.getElementById('btn-copy-custom-gateway-key');
  const btnRotateGatewayKey = document.getElementById('btn-rotate-gateway-key');

  // Modal open / close logic
  let isModalOpen = false;
  let closeTimer = null;

  const openModal = (defaultTab = null) => {
    const modal = settingsModal || document.getElementById('claude-settings-modal');
    if (!modal) return;
    clearTimeout(closeTimer);
    modal.style.display = 'flex';
    modal.style.pointerEvents = 'auto';
    void modal.offsetWidth; // Force reflow for CSS spring transition
    modal.classList.add('open');
    isModalOpen = true;

    if (defaultTab) {
      switchTab(defaultTab);
    }
    if (typeof initSmoothInputs === 'function') {
      setTimeout(() => initSmoothInputs(), 50);
    }
  };

  const closeModal = () => {
    const modal = settingsModal || document.getElementById('claude-settings-modal');
    if (!modal || !isModalOpen) return;
    modal.classList.remove('open');
    modal.style.pointerEvents = 'none';
    isModalOpen = false;
    closeTimer = setTimeout(() => {
      if (!isModalOpen) {
        modal.style.display = 'none';
      }
    }, 220);
  };

  window.openClaudeSettings = openModal;
  window.closeClaudeSettings = closeModal;

  // Global event delegation for opening settings modal
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('#btn-open-settings, #profile-open-settings, .claude-settings-gear-btn, [data-action="open-settings"]');
    if (trigger) {
      e.preventDefault();
      e.stopPropagation();
      openModal();
    }
  });

  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openModal();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
  }

  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        closeModal();
      }
    });
  }

  if (settingsDialog) {
    settingsDialog.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isModalOpen) {
      closeModal();
    }
  });

  // Tab switching logic
  const switchTab = (tabId) => {
    navItems.forEach(btn => {
      const isMatch = btn.getAttribute('data-tab') === tabId;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });

    panels.forEach(p => {
      const isMatch = p.id === `settings-panel-${tabId}`;
      p.classList.toggle('active', isMatch);
    });

    if (searchInput && searchInput.value.trim()) {
      filterSettings(searchInput.value.trim());
    }
  };

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.getAttribute('data-tab');
      if (tabId) switchTab(tabId);
    });
  });

  // Search filter across active panel & rows
  const filterSettings = (query) => {
    const q = query.toLowerCase();
    const activePanel = document.querySelector('.claude-settings-panel.active');
    if (!activePanel) return;

    const rows = activePanel.querySelectorAll('.claude-settings-row');
    rows.forEach(row => {
      const searchAttr = row.getAttribute('data-search-text') || '';
      const text = (row.textContent + ' ' + searchAttr).toLowerCase();
      if (!q || text.includes(q)) {
        row.style.display = 'flex';
      } else {
        row.style.display = 'none';
      }
    });
  };

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterSettings(e.target.value.trim());
    });
  }

  // Chat Font Selector Logic
  const fontSelectWrap = document.getElementById('chat-font-select-wrap');
  const fontSelectBtn = document.getElementById('btn-chat-font-select');
  const fontSelectMenu = document.getElementById('chat-font-select-menu');
  const fontSelectedLabel = document.getElementById('chat-font-selected-label');
  const fontOptions = fontSelectMenu ? fontSelectMenu.querySelectorAll('.claude-select-option') : [];

  const fontMap = {
    'serif': { label: 'Anthropic Serif', value: 'var(--font-serif)' },
    'sans': { label: 'Anthropic Sans', value: 'var(--font-sans)' },
    'system': { label: 'System', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    'mono': { label: 'OpenDyslexic', value: 'var(--font-mono)' }
  };

  const applyChatFont = (fontKey, save = true) => {
    const config = fontMap[fontKey] || fontMap['sans'];
    document.documentElement.style.setProperty('--chat-font', config.value);
    if (fontSelectedLabel) fontSelectedLabel.textContent = config.label;

    fontOptions.forEach(opt => {
      opt.classList.toggle('active', opt.getAttribute('data-font') === fontKey);
    });

    if (save) {
      localStorage.setItem('singularity_chat_font', fontKey);
      showToast(`Chat font set to ${config.label}`, 'info', 1600);
    }
  };

  const savedFont = localStorage.getItem('singularity_chat_font') || 'sans';
  applyChatFont(savedFont, false);

  if (fontSelectBtn && fontSelectMenu) {
    fontSelectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fontSelectMenu.classList.toggle('open');
    });

    fontOptions.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const fontKey = opt.getAttribute('data-font');
        if (fontKey) {
          applyChatFont(fontKey, true);
        }
        fontSelectMenu.classList.remove('open');
      });
    });

    document.addEventListener('click', (e) => {
      if (!fontSelectBtn.contains(e.target) && !fontSelectMenu.contains(e.target)) {
        fontSelectMenu.classList.remove('open');
      }
    });
  }

  // Generic Custom Dropdown Helper for Claude Settings
  const setupCustomDropdown = (wrapId, btnId, menuId, labelId, storageKey, defaultValue, onChange) => {
    const wrap = document.getElementById(wrapId);
    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    const label = document.getElementById(labelId);
    if (!wrap || !btn || !menu) return null;

    const options = menu.querySelectorAll('.claude-select-option');

    const setValue = (val, save = true) => {
      let activeText = '';
      options.forEach(opt => {
        const isMatch = opt.getAttribute('data-value') === val || opt.getAttribute('data-font') === val;
        opt.classList.toggle('active', isMatch);
        if (isMatch) {
          const spanEl = opt.querySelector('span');
          activeText = spanEl ? spanEl.textContent : opt.textContent.trim();
        }
      });

      if (label && activeText) {
        label.textContent = activeText;
      }

      if (save && storageKey) {
        localStorage.setItem(storageKey, val);
      }

      if (typeof onChange === 'function') {
        onChange(val, save);
      }
    };

    const initial = storageKey ? (localStorage.getItem(storageKey) || defaultValue) : defaultValue;
    if (initial) {
      setValue(initial, false);
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.claude-custom-select-menu.open').forEach(m => {
        if (m !== menu) m.classList.remove('open');
      });
      menu.classList.toggle('open');
    });

    options.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = opt.getAttribute('data-value') || opt.getAttribute('data-font');
        if (val) {
          setValue(val, true);
        }
        menu.classList.remove('open');
      });
    });

    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) {
        menu.classList.remove('open');
      }
    });

    return { setValue };
  };

  // Voice Custom Select Dropdowns
  setupCustomDropdown(
    'voice-language-select-wrap',
    'btn-voice-language-select',
    'voice-language-select-menu',
    'voice-language-selected-label',
    'singularity_voice_language',
    'en-US',
    (val, save) => {
      if (save) showToast(`Voice language set to ${val}`, 'info', 1600);
    }
  );

  setupCustomDropdown(
    'voice-style-select-wrap',
    'btn-voice-style-select',
    'voice-style-select-menu',
    'voice-style-selected-label',
    'singularity_voice_style',
    'buttery',
    (val, save) => {
      if (save) showToast(`Voice style set to ${val}`, 'info', 1600);
    }
  );

  setupCustomDropdown(
    'voice-speed-select-wrap',
    'btn-voice-speed-select',
    'voice-speed-select-menu',
    'voice-speed-selected-label',
    'singularity_voice_speed',
    'normal',
    (val, save) => {
      if (save) showToast(`Voice speed set to ${val}`, 'info', 1600);
    }
  );

  // Motion Toggle Switch
  const motionToggle = document.getElementById('toggle-reduce-motion');
  if (motionToggle) {
    const isReduced = localStorage.getItem('singularity_reduce_motion') === 'true';
    motionToggle.checked = isReduced;
    document.documentElement.classList.toggle('reduce-motion', isReduced);

    motionToggle.addEventListener('change', (e) => {
      const reduced = e.target.checked;
      document.documentElement.classList.toggle('reduce-motion', reduced);
      localStorage.setItem('singularity_reduce_motion', reduced ? 'true' : 'false');
      showToast(reduced ? 'Reduced motion enabled' : 'Smooth animations restored', 'info', 1800);
    });
  }

  // Audio Chime Toggle
  const chimeToggle = document.getElementById('toggle-response-chime');
  if (chimeToggle) {
    chimeToggle.checked = localStorage.getItem('singularity_response_chime') === 'true';
    chimeToggle.addEventListener('change', (e) => {
      localStorage.setItem('singularity_response_chime', e.target.checked ? 'true' : 'false');
      if (e.target.checked) {
        playCompletionChime();
        showToast('Completion chime enabled', 'info', 1800);
      }
    });
  }

  // Profile Avatar & Name in Account Panel
  const renderUserAvatar = (dataUrl) => {
    if (dataUrl) {
      if (avatarCircle) {
        avatarCircle.innerHTML = `<img src="${dataUrl}" class="user-avatar-img" alt="Profile Picture" />`;
      }
      if (removeAvatarBtn) removeAvatarBtn.style.display = 'inline-block';
    } else {
      if (avatarCircle) {
        avatarCircle.innerHTML = `
          <svg class="default-avatar-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        `;
      }
      if (removeAvatarBtn) removeAvatarBtn.style.display = 'none';
    }
  };

  const storedAvatar = localStorage.getItem('singularity_user_avatar');
  renderUserAvatar(storedAvatar);

  const savedName = (localStorage.getItem('singularity_user_name') || 'Operator').trim();
  if (nameInput) {
    nameInput.value = savedName;
  }

  const saveProfileName = (showNotification = true) => {
    const raw = nameInput ? nameInput.value.trim() : '';
    const name = raw || 'Operator';
    if (nameInput) nameInput.value = name;
    localStorage.setItem('singularity_user_name', name);

    if (saveNameBtn) {
      saveNameBtn.classList.remove('visible');
      saveNameBtn.classList.add('saved');
      setTimeout(() => saveNameBtn.classList.remove('saved'), 1500);
    }
    if (showNotification) {
      showToast(`Profile name saved as "${name}"`, 'success', 2000);
    }
  };

  if (nameInput) {
    nameInput.addEventListener('input', () => {
      const currentStored = localStorage.getItem('singularity_user_name') || 'Operator';
      if (nameInput.value.trim() !== currentStored) {
        if (saveNameBtn) saveNameBtn.classList.add('visible');
      } else {
        if (saveNameBtn) saveNameBtn.classList.remove('visible');
      }
    });

    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        nameInput.blur();
        saveProfileName(true);
      }
    });

    nameInput.addEventListener('blur', () => {
      const currentStored = localStorage.getItem('singularity_user_name') || 'Operator';
      if (nameInput.value.trim() && nameInput.value.trim() !== currentStored) {
        saveProfileName(true);
      }
    });
  }

  if (saveNameBtn) {
    saveNameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      saveProfileName(true);
    });
  }

  if (avatarUploadTrigger && avatarFileInput) {
    avatarUploadTrigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        avatarFileInput.click();
      }
    });

    avatarFileInput.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    avatarFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await processAvatarFile(file);
        localStorage.setItem('singularity_user_avatar', dataUrl);
        renderUserAvatar(dataUrl);
        showToast('Profile picture updated', 'success', 2200);
      } catch (err) {
        showToast(err.message || 'Failed to process picture', 'error', 3000);
      } finally {
        avatarFileInput.value = '';
      }
    });
  }

  if (removeAvatarBtn) {
    removeAvatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      localStorage.removeItem('singularity_user_avatar');
      renderUserAvatar(null);
      showToast('Profile picture removed', 'info', 2000);
    });
  }

  // Allowed Web Origins / CORS Client Management
  const originsContainer = document.getElementById('allowed-origins-container');
  const newOriginInput = document.getElementById('input-new-allowed-origin');
  const addOriginBtn = document.getElementById('btn-add-allowed-origin');
  const presetOriginBtns = document.querySelectorAll('.preset-origin-btn');

  const renderAllowedOrigins = (origins) => {
    if (!originsContainer) return;
    if (!origins || origins.length === 0) {
      originsContainer.innerHTML = '<span style="font-size: 12px; color: var(--text-muted); font-style: italic;">No external web origins added. Gateway allows localhost and local network by default.</span>';
      return;
    }
    originsContainer.innerHTML = origins.map(orig => `
      <div class="origin-tag" style="display: inline-flex; align-items: center; gap: 6px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 6px; padding: 4px 8px; font-size: 12px; font-family: var(--font-mono);">
        <span style="color: var(--text-primary);">${orig}</span>
        <button type="button" class="btn-delete-origin" data-origin="${orig}" title="Revoke origin" style="background: none; border: none; color: var(--color-error); cursor: pointer; padding: 0 2px; font-weight: bold; font-size: 14px; line-height: 1;">&times;</button>
      </div>
    `).join('');

    originsContainer.querySelectorAll('.btn-delete-origin').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const orig = btn.getAttribute('data-origin');
        if (!orig) return;
        try {
          const res = await fetch(`/api/security/allowed-origins?origin=${encodeURIComponent(orig)}`, { method: 'DELETE' });
          if (res.ok) {
            const data = await res.json();
            renderAllowedOrigins(data.allowed_origins);
            showToast(`Revoked access for ${orig}`, 'info', 2000);
          } else {
            showToast(`Failed to remove origin`, 'error', 2000);
          }
        } catch (err) {
          showToast(`Error removing origin: ${err.message}`, 'error', 2000);
        }
      });
    });
  };

  const loadAllowedOrigins = async () => {
    if (!originsContainer) return;
    try {
      const res = await fetch('/api/security/allowed-origins');
      if (res.ok) {
        const data = await res.json();
        renderAllowedOrigins(data.allowed_origins);
      }
    } catch (e) {
      console.warn('Failed to fetch allowed origins:', e);
    }
  };

  const handleAddOrigin = async (originUrl) => {
    let clean = (originUrl || '').trim();
    if (!clean) return;
    if (clean !== '*' && !clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    if (clean !== '*') {
      try {
        const parsed = new URL(clean);
        clean = `${parsed.protocol}//${parsed.host}`;
      } catch (e) {
        clean = clean.replace(/\/+$/, '');
      }
    }
    try {
      const res = await fetch('/api/security/allowed-origins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: clean })
      });
      if (res.ok) {
        const data = await res.json();
        renderAllowedOrigins(data.allowed_origins);
        if (newOriginInput) newOriginInput.value = '';
        showToast(`Authorized ${clean} to access Singularity`, 'success', 2500);
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.detail || 'Failed to add origin', 'error', 2500);
      }
    } catch (err) {
      showToast(`Error adding origin: ${err.message}`, 'error', 2500);
    }
  };

  if (addOriginBtn && newOriginInput) {
    addOriginBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleAddOrigin(newOriginInput.value);
    });
    newOriginInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddOrigin(newOriginInput.value);
      }
    });
  }

  if (presetOriginBtns) {
    presetOriginBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const orig = btn.getAttribute('data-origin');
        if (orig) handleAddOrigin(orig);
      });
    });
  }

  loadAllowedOrigins();

  // Gateway Custom API Key Management
  let currentGatewayKey = 'sk-singularity-local';

  const updateGatewayKeyDisplays = (key) => {
    currentGatewayKey = key;
    if (inputGatewayKey) inputGatewayKey.value = key;
    if (profileApikeyText) profileApikeyText.textContent = key;
  };

  const loadGatewayKey = async () => {
    try {
      const res = await fetch('/api/security/gateway-key');
      if (res.ok) {
        const data = await res.json();
        if (data && data.gateway_key) {
          updateGatewayKeyDisplays(data.gateway_key);
        }
      }
    } catch (err) {
      console.warn('Failed to load gateway key:', err);
    }
  };

  const handleSaveGatewayKey = async (newKey) => {
    const key = (newKey || '').trim();
    if (!key) {
      showToast('API Key cannot be empty', 'error', 2000);
      return;
    }
    try {
      const res = await fetch('/api/security/gateway-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gateway_key: key })
      });
      if (res.ok) {
        const data = await res.json();
        updateGatewayKeyDisplays(data.gateway_key || key);
        showToast(`Gateway API Key saved: ${data.gateway_key || key}`, 'success', 2500);
      } else {
        showToast('Failed to save API key', 'error', 2500);
      }
    } catch (err) {
      showToast(`Error saving API key: ${err.message}`, 'error', 2500);
    }
  };

  const handleRotateGatewayKey = async () => {
    try {
      const res = await fetch('/api/security/gateway-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rotate' })
      });
      if (res.ok) {
        const data = await res.json();
        updateGatewayKeyDisplays(data.gateway_key);
        showToast(`Generated new Gateway API Key`, 'success', 2500);
      } else {
        showToast('Failed to generate key', 'error', 2500);
      }
    } catch (err) {
      showToast(`Error generating key: ${err.message}`, 'error', 2500);
    }
  };

  if (btnSaveGatewayKey && inputGatewayKey) {
    btnSaveGatewayKey.addEventListener('click', (e) => {
      e.stopPropagation();
      handleSaveGatewayKey(inputGatewayKey.value);
    });
    inputGatewayKey.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSaveGatewayKey(inputGatewayKey.value);
      }
    });
  }

  if (btnRotateGatewayKey) {
    btnRotateGatewayKey.addEventListener('click', (e) => {
      e.stopPropagation();
      handleRotateGatewayKey();
    });
  }

  if (btnCopyCustomGatewayKey) {
    btnCopyCustomGatewayKey.addEventListener('click', async (e) => {
      e.stopPropagation();
      const val = inputGatewayKey ? inputGatewayKey.value : currentGatewayKey;
      if (val) {
        const ok = await copyTextToClipboard(val);
        if (ok) showToast('Copied Gateway API Key to clipboard', 'success', 2000);
      }
    });
  }

  loadGatewayKey();

  // Clear Local Cache
  const clearCacheBtn = document.getElementById('btn-clear-local-cache');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', () => {
      try {
        const keysToKeep = ['singularity_user_avatar', 'singularity_user_name', 'singularity_theme', 'singularity_theme_pref', 'singularity_chat_font', 'singularity_custom_instructions'];
        const saved = {};
        keysToKeep.forEach(k => {
          const val = localStorage.getItem(k);
          if (val) saved[k] = val;
        });
        localStorage.clear();
        Object.entries(saved).forEach(([k, v]) => localStorage.setItem(k, v));
        showToast('Local cache reset successfully', 'success', 2200);
      } catch (err) {
        showToast('Failed to reset cache', 'error', 2000);
      }
    });
  }

  // Gateway Endpoint Quick-Copy with animated feedback
  const dynamicOrigin = (window.location && window.location.origin && window.location.origin.startsWith('http'))
    ? window.location.origin
    : 'http://localhost:9000';
  const gatewayEndpointUrl = `${dynamicOrigin}/v1`;

  if (endpointTextEl) {
    endpointTextEl.textContent = gatewayEndpointUrl;
  }

  let copyResetTimer = null;
  const executeEndpointCopy = async (e) => {
    if (e) e.stopPropagation();
    const success = await copyTextToClipboard(gatewayEndpointUrl);
    if (success) {
      if (copyEndpointRow) copyEndpointRow.classList.add('copied');
      if (copyHintEl) copyHintEl.textContent = 'Copied!';
      const defaultIcon = copyEndpointRow ? copyEndpointRow.querySelector('.copy-default-icon') : null;
      const successIcon = copyEndpointRow ? copyEndpointRow.querySelector('.copy-success-icon') : null;
      if (defaultIcon) defaultIcon.style.display = 'none';
      if (successIcon) successIcon.style.display = 'inline-block';

      showToast(`Copied API endpoint: ${gatewayEndpointUrl}`, 'success', 2500);

      clearTimeout(copyResetTimer);
      copyResetTimer = setTimeout(() => {
        if (copyEndpointRow) copyEndpointRow.classList.remove('copied');
        if (copyHintEl) copyHintEl.textContent = 'Copy';
        if (defaultIcon) defaultIcon.style.display = 'inline-block';
        if (successIcon) successIcon.style.display = 'none';
      }, 2000);
    } else {
      showToast('Failed to copy endpoint to clipboard', 'error', 2500);
    }
  };

  if (copyEndpointRow) {
    copyEndpointRow.addEventListener('click', executeEndpointCopy);
    copyEndpointRow.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        executeEndpointCopy(e);
      }
    });
  }

  if (endpointCopyBtn) {
    endpointCopyBtn.addEventListener('click', executeEndpointCopy);
  }

  // API Key Quick-Copy
  let apiKeyResetTimer = null;
  const executeApiKeyCopy = async (e) => {
    if (e) e.stopPropagation();
    const apiKey = currentGatewayKey || 'sk-singularity-local';
    const success = await copyTextToClipboard(apiKey);
    if (success) {
      if (apikeyCopyRow) apikeyCopyRow.classList.add('copied');
      if (apikeyCopyHint) apikeyCopyHint.textContent = 'Copied!';
      const defaultIcon = apikeyCopyRow ? apikeyCopyRow.querySelector('.copy-default-icon') : null;
      const successIcon = apikeyCopyRow ? apikeyCopyRow.querySelector('.copy-success-icon') : null;
      if (defaultIcon) defaultIcon.style.display = 'none';
      if (successIcon) successIcon.style.display = 'inline-block';

      showToast(`Copied Gateway API Key: ${apiKey}`, 'success', 2200);

      clearTimeout(apiKeyResetTimer);
      apiKeyResetTimer = setTimeout(() => {
        if (apikeyCopyRow) apikeyCopyRow.classList.remove('copied');
        if (apikeyCopyHint) apikeyCopyHint.textContent = 'Copy';
        if (defaultIcon) defaultIcon.style.display = 'inline-block';
        if (successIcon) successIcon.style.display = 'none';
      }, 2000);
    } else {
      showToast('Failed to copy API key to clipboard', 'error', 2500);
    }
  };

  if (apikeyCopyRow) {
    apikeyCopyRow.addEventListener('click', executeApiKeyCopy);
  }
  if (apikeyCopyBtn) {
    apikeyCopyBtn.addEventListener('click', executeApiKeyCopy);
  }

  // Capabilities & Inference Defaults - Reasoning Effort Custom Dropdown
  setupCustomDropdown(
    'reasoning-effort-select-wrap',
    'btn-reasoning-effort-select',
    'reasoning-effort-select-menu',
    'reasoning-effort-selected-label',
    'singularity_reasoning_effort',
    'medium',
    (val, save) => {
      if (save) showToast(`Reasoning effort set to ${val}`, 'info', 1600);
    }
  );

  const tempSlider = document.getElementById('settings-temperature-slider');
  const tempVal = document.getElementById('settings-temperature-val');
  if (tempSlider && tempVal) {
    const savedTemp = localStorage.getItem('singularity_default_temp') || '0.7';
    tempSlider.value = savedTemp;
    tempVal.textContent = parseFloat(savedTemp).toFixed(2);

    tempSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value).toFixed(2);
      tempVal.textContent = val;
      localStorage.setItem('singularity_default_temp', val);
    });
  }

  const genuiToggle = document.getElementById('toggle-genui-artifacts');
  if (genuiToggle) {
    genuiToggle.checked = localStorage.getItem('singularity_genui_enabled') !== 'false';
    genuiToggle.addEventListener('change', (e) => {
      localStorage.setItem('singularity_genui_enabled', e.target.checked ? 'true' : 'false');
    });
  }

  // Memory & Custom Instructions
  const customInstructionsArea = document.getElementById('settings-custom-instructions');
  const saveInstructionsBtn = document.getElementById('btn-save-custom-instructions');
  const identityToggle = document.getElementById('toggle-identity-awareness');

  if (customInstructionsArea) {
    customInstructionsArea.value = localStorage.getItem('singularity_custom_instructions') || '';
  }

  if (saveInstructionsBtn && customInstructionsArea) {
    saveInstructionsBtn.addEventListener('click', () => {
      const instructions = customInstructionsArea.value.trim();
      localStorage.setItem('singularity_custom_instructions', instructions);
      showToast('Custom instructions saved for AI models', 'success', 2200);
    });
  }

  if (identityToggle) {
    identityToggle.checked = localStorage.getItem('singularity_identity_awareness') !== 'false';
    identityToggle.addEventListener('change', (e) => {
      localStorage.setItem('singularity_identity_awareness', e.target.checked ? 'true' : 'false');
    });
  }

  // Dynamic Connectors Grid across all 8 providers
  const connectorsGrid = document.getElementById('settings-connectors-grid');
  if (connectorsGrid && connectorsGrid.children.length === 0) {
    const providers = [
      { id: 'chatgpt', name: 'OpenAI ChatGPT', meta: 'GPT-5.4, GPT-5.3 Thinking, GPT-4o, Canvas', icon: '/static/icons/chatgpt.svg' },
      { id: 'claude', name: 'Anthropic Claude', meta: 'Claude 3.7 Sonnet, Thinking, Opus, Haiku', icon: '/static/icons/claude.svg' },
      { id: 'gemini', name: 'Google Gemini', meta: 'Gemini 3.8 Flash & Thinking, 3.7, 3.1 Pro', icon: '/static/icons/gemini.svg' },
      { id: 'grok', name: 'xAI Grok', meta: 'Grok 3, Grok 3 Mini, Thinking Mode', icon: '/static/icons/grok.svg' },
      { id: 'deepseek', name: 'DeepSeek AI', meta: 'DeepSeek V4, V3, R1 Reasoner', icon: '/static/icons/deepseek.svg' },
      { id: 'kimi', name: 'Moonshot Kimi', meta: 'Kimi K2.5, K1.5 Long Context & Research', icon: '/static/icons/kimi.svg' },
      { id: 'glm', name: 'Zhipu GLM', meta: 'GLM-5, GLM-4 Plus & Flash', icon: '/static/icons/glm.svg' },
      { id: 'qwen', name: 'Alibaba Qwen', meta: 'Qwen 2.5 Max, QwQ 32B Reasoner', icon: '/static/icons/qwen.svg' }
    ];

    connectorsGrid.innerHTML = providers.map(p => `
      <div class="claude-connector-card">
        <div class="claude-connector-icon">
          <img src="${p.icon}" width="24" height="24" alt="${p.name}" />
        </div>
        <div class="claude-connector-info">
          <div class="claude-connector-name">${p.name}</div>
          <div class="claude-connector-meta">${p.meta}</div>
        </div>
      </div>
    `).join('');
  }
}
window.initUserProfile = initClaudeSettings;
window.initClaudeSettings = initClaudeSettings;

// ===================================================================
// Navigation Tabs
// ===================================================================
function initNavigation() {
  const tabs = document.querySelectorAll('.nav-item');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const mobileToggle = document.getElementById('mobile-nav-toggle');

  const closeSidebar = () => {
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
  };

  const toggleSidebar = () => {
    if (sidebar) {
      const isOpen = sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('active', isOpen);
    }
  };

  if (mobileToggle) {
    mobileToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSidebar();
    });
  }

  if (overlay) {
    ['click', 'touchstart', 'pointerdown'].forEach(evt => {
      overlay.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeSidebar();
      }, { passive: false });
    });
  }

  // Also catch any click outside the sidebar when open on mobile
  document.addEventListener('click', (e) => {
    if (sidebar && sidebar.classList.contains('open')) {
      if (!sidebar.contains(e.target) && !mobileToggle?.contains(e.target)) {
        closeSidebar();
      }
    }
  });

  tabs.forEach(tab => {
    if (tab.id === 'tavern-nav-btn') {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openTavernStudio();
        if (window.innerWidth <= 1024) {
          closeSidebar();
        }
      });
      return;
    }
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      if (target) switchTab(target);
      if (window.innerWidth <= 1024) {
        closeSidebar();
      }
    });
  });

  document.body.dataset.activeTab = state.currentTab || 'playground';
  document.documentElement.dataset.activeTab = state.currentTab || 'playground';
}

function switchTab(tabId) {
  state.currentTab = tabId;
  document.body.dataset.activeTab = tabId;
  document.documentElement.dataset.activeTab = tabId;

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tabId);
  });

  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `pane-${tabId}`);
  });

  window.SingularityGlassDock?.updateActiveDockTab?.();
  window.SingularityGlassDock?.updateDockMode?.();

  const heading = document.getElementById('page-heading');
  const subheading = document.getElementById('page-subheading');

  const titles = {
    control: {
      h: 'Control Center',
      sub: '',
    },
    limits: {
      h: 'Limits & Quotas',
      sub: '',
    },
    models: {
      h: 'Available Models',
      sub: '',
    },
    cookies: {
      h: 'Cookie Stacker & Accounts',
      sub: '',
    },
    playground: {
      h: 'Playground',
      sub: '',
    },
    presets: {
      h: 'Presets & Lorebooks',
      sub: '',
    },
    tunnel: {
      h: 'Singularity-Access',
      sub: '',
    },
    bio: {
      h: 'Janitor Bio Studio',
      sub: '',
    },
  }[tabId] || { h: 'Singularity', sub: '' };

  if (heading) heading.textContent = titles.h;
  if (subheading) {
    subheading.textContent = titles.sub;
    subheading.style.display = titles.sub ? 'block' : 'none';
  }

  try {
    if (tabId === 'limits') renderLimits();
    if (tabId === 'models') renderModels();
    if (tabId === 'cookies') {
      loadCookiesTab();
      if (window.SingularityConnections?.show) window.SingularityConnections.show();
    }
    if (tabId === 'presets') {
      if (window.SingularityPresets?.show) window.SingularityPresets.show();
    }
    if (tabId === 'bio') {
      if (window.JanitorBioStudio?.init) window.JanitorBioStudio.init();
    }
    if (tabId === 'tunnel') {
      loadTunnelTab();
    } else {
      stopGlobeAnimation();
      stopUptimeTracker();
    }
  } catch (err) {
    console.error('Error rendering tab content:', err);
  }
}

// ===================================================================
// Control Center & Telemetry
// ===================================================================
async function fetchServices() {
  try {
    const res = await fetch('/api/services');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.services = data.services || [];
    renderServices();
    updateSidebarStatus(data.hub);
  } catch (err) {
    console.error('Error fetching services:', err);
    const dot = document.getElementById('hub-dot');
    const text = document.getElementById('hub-status-text');
    if (dot) dot.className = 'status-dot offline';
    if (text) text.textContent = 'Gateway Offline';
  }
}

function renderServices() {
  const container = document.getElementById('providers-container');
  if (!container) return;

  const onlineCount = state.services.filter(s => s.running).length;
  const totalCount = state.services.length || 8;
  const activeBadge = document.getElementById('nav-active-count');
  if (activeBadge) activeBadge.textContent = `${onlineCount}/${totalCount} Active`;

  container.innerHTML = state.services.map(srv => {
    const isOnline = srv.running;
    const badgeClass = isOnline ? 'online' : 'offline';
    const badgeText = isOnline ? 'RUNNING' : 'STOPPED';

    const providerIcons = {
      gemini: '/static/icons/gemini.svg',
      chatgpt: '/static/icons/chatgpt.svg',
      claude: '/static/icons/claude.svg',
      kimi: '/static/icons/kimi.svg',
      glm: '/static/icons/glm.svg',
      grok: '/static/icons/grok.svg',
      deepseek: '/static/icons/deepseek.svg',
      qwen: '/static/icons/qwen.svg',
    };
    const iconUrl = providerIcons[srv.id] || '/logo.svg';

    return `
      <div class="provider-card" data-provider="${srv.id}">
        <div class="provider-card-top">
          <div class="provider-identity">
            <div class="provider-badge-icon">
              <img src="${iconUrl}" alt="${escapeHtml(srv.name)}" />
            </div>
            <div>
              <div class="provider-name">${escapeHtml(srv.name)}</div>
              <div class="provider-company">${escapeHtml(srv.badge)}</div>
            </div>
          </div>
          <span class="provider-status-badge ${badgeClass}">${badgeText}</span>
        </div>

        <div class="provider-stats-row">
          <div class="stat-box">
            <span class="stat-label">Port</span>
            <span class="stat-value">:${srv.port}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">PID</span>
            <span class="stat-value">${srv.pid || '—'}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Latency</span>
            <span class="stat-value">${srv.latency_ms !== null ? srv.latency_ms + 'ms' : 'Offline'}</span>
          </div>
        </div>

        <div class="provider-card-actions">
          ${isOnline
        ? `
                <button class="btn btn-secondary btn-sm" onclick="restartService('${srv.id}')">Restart</button>
                <button class="btn btn-danger btn-sm" onclick="stopService('${srv.id}')">Stop</button>
              `
        : `
                <button class="btn btn-primary btn-sm" onclick="startService('${srv.id}')">Start</button>
              `
      }
        </div>
      </div>
    `;
  }).join('');
}

function updateSidebarStatus(hub) {
  const dot = document.getElementById('hub-dot');
  const text = document.getElementById('hub-status-text');
  if (dot) {
    dot.className = hub && hub.running ? 'status-dot' : 'status-dot offline';
  }
  if (text) {
    text.textContent = hub && hub.running ? 'Gateway Online' : 'Gateway Offline';
  }
}

async function startService(id) {
  try {
    showToast(`Starting ${id}...`, 'info');
    const res = await fetch(`/api/services/${id}/start`, { method: 'POST' });
    const data = await res.json();
    if (data.status === 'ok') {
      showToast(data.message, 'success');
    } else {
      showToast(data.message || 'Failed to start', 'error');
    }
    await fetchServices();
    setTimeout(fetchServices, 1000);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function stopService(id) {
  try {
    showToast(`Stopping ${id}...`, 'info');
    const res = await fetch(`/api/services/${id}/stop`, { method: 'POST' });
    const data = await res.json();
    if (data.status === 'ok') {
      showToast(data.message, 'success');
    } else {
      showToast(data.message || 'Failed to stop', 'error');
    }
    await fetchServices();
    setTimeout(fetchServices, 800);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function restartService(id) {
  try {
    showToast(`Restarting ${id}...`, 'info');
    const res = await fetch(`/api/services/${id}/restart`, { method: 'POST' });
    const data = await res.json();
    if (data.status === 'ok') {
      showToast(data.message || `Restarted ${id}`, 'success');
    } else {
      showToast(data.message || `Could not restart ${id}`, 'warning');
    }
    await fetchServices();
    setTimeout(fetchServices, 1000);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function startAllServices() {
  try {
    showToast('Starting all 7 providers...', 'info');
    const res = await fetch('/api/services/start_all', { method: 'POST' });
    const data = await res.json();
    showToast('All 7 providers started successfully.', 'success');
    await fetchServices();
    setTimeout(fetchServices, 1000);
    setTimeout(fetchServices, 2500);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function stopAllServices() {
  try {
    showToast('Stopping all 7 providers...', 'info');
    const res = await fetch('/api/services/stop_all', { method: 'POST' });
    const data = await res.json();
    showToast('All providers stopped.', 'success');
    await fetchServices();
    setTimeout(fetchServices, 1000);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ===================================================================
// Limits & Quotas Section
// ===================================================================
async function fetchLimits() {
  try {
    const res = await fetch('/api/limits');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.limits = await res.json();
    if (state.currentTab === 'limits') {
      renderLimits();
    }
  } catch (err) {
    console.error('Error fetching limits:', err);
  }
}

function renderLimits() {
  const container = document.getElementById('limits-container');
  if (!container) return;

  const chatgpt = state.limits.chatgpt || {};
  const grok = state.limits.grok || {};
  const kimi = state.limits.kimi || {};
  const claude = state.limits.claude || {};
  const gemini = state.limits.gemini || {};
  const glm = state.limits.glm || {};
  const deepseek = state.limits.deepseek || {};
  const qwen = state.limits.qwen || {};

  // ChatGPT Accounts Table
  const chatgptRows = (chatgpt.accounts || []).map(acc => {
    return `
      <tr>
        <td style="font-weight: 600; font-family: var(--font-mono);">${escapeHtml(acc.email || 'Account')}</td>
        <td><span class="brand-badge">${escapeHtml(acc.type || 'FREE')}</span></td>
        <td><strong>${acc.image_quota !== undefined ? acc.image_quota : '—'}</strong></td>
        <td>${acc.reason_remaining !== undefined ? acc.reason_remaining : '—'}</td>
        <td>${acc.deep_research !== undefined ? acc.deep_research : '—'}</td>
        <td>${acc.file_upload !== undefined ? acc.file_upload : '—'}</td>
        <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${escapeHtml(acc.restore_at || 'Active')}</td>
      </tr>
    `;
  }).join('');

  // Grok Rate limits and imagine quotas
  const grokData = grok.data || {};
  const grokLimits = grokData.rate_limits || {};
  const grokImagine = grokData.imagine_quota || {};
  const grokRows = Object.entries(grokLimits).map(([mod, item]) => {
    return `
      <tr>
        <td style="font-weight: 600; font-family: var(--font-mono);">${escapeHtml(mod)}</td>
        <td><strong>${item.remainingQueries || 0} / ${item.totalQueries || 0}</strong></td>
        <td>${Math.round((item.windowSizeSeconds || 0) / 3600)} Hours</td>
        <td><span class="lock-badge unlocked">Operational</span></td>
      </tr>
    `;
  }).join('');

  // Kimi Accounts Table and Quotas
  const kimiSummary = kimi.summary || {};
  const kimiRows = (kimi.accounts || []).map(acc => {
    return `
      <tr>
        <td style="font-weight: 600; font-family: var(--font-mono);">${escapeHtml(acc.name || acc.id || 'Kimi Account')}</td>
        <td><span class="brand-badge">${escapeHtml(acc.plan || 'Free')}</span></td>
        <td><strong>${escapeHtml(acc.research_today || '50 / 50')}</strong></td>
        <td>${escapeHtml(acc.deep_research || '1 / 1 left')}</td>
        <td>${escapeHtml(acc.ok_computer || '3 / 3 left')}</td>
        <td>${escapeHtml(acc.slides || '3 / 3 left')}</td>
        <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${escapeHtml(acc.reset_date || 'Active')}</td>
        <td><span class="lock-badge ${acc.status === 'Active' ? 'unlocked' : 'locked'}">${escapeHtml(acc.status || 'Active')}</span></td>
      </tr>
    `;
  }).join('');

  // Claude Accounts & Quotas
  const claudeAccounts = claude.accounts || [];
  const claudeRows = claudeAccounts.map(acc => {
    return `
      <tr>
        <td style="font-weight: 600; font-family: var(--font-mono);">${escapeHtml(acc.email || acc.identifier || 'Claude Session')}</td>
        <td><span class="brand-badge">${escapeHtml(acc.type || acc.plan || 'PRO')}</span></td>
        <td><strong>${escapeHtml(acc.messages || '45 / 5 hrs')}</strong></td>
        <td>${escapeHtml(acc.reasoning || 'Included (5 hrs)')}</td>
        <td>${escapeHtml(acc.file_upload || '30MB / file')}</td>
        <td>${escapeHtml(acc.web_search || 'Extended')}</td>
        <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${escapeHtml(acc.restore_at || 'Rolling (5 hrs)')}</td>
      </tr>
    `;
  }).join('');

  // Gemini Accounts & Quotas
  const geminiAccounts = gemini.accounts || [];
  const geminiRows = geminiAccounts.map(acc => {
    return `
      <tr>
        <td style="font-weight: 600; font-family: var(--font-mono);">${escapeHtml(acc.email || acc.identifier || 'Gemini Account')}</td>
        <td><span class="brand-badge">${escapeHtml(acc.type || acc.plan || 'FREE')}</span></td>
        <td><strong>${acc.image_quota !== undefined ? acc.image_quota : '30'}</strong></td>
        <td>${escapeHtml(acc.reason_remaining || 'Standard (60/hr)')}</td>
        <td>${escapeHtml(acc.deep_research || '0 / day')}</td>
        <td>${escapeHtml(acc.file_upload || '10 / prompt')}</td>
        <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${escapeHtml(acc.restore_at || 'Daily (Midnight PST)')}</td>
      </tr>
    `;
  }).join('');

  // GLM Accounts & Quotas
  const glmAccounts = glm.accounts || [];
  const glmRows = glmAccounts.map(acc => {
    return `
      <tr>
        <td style="font-weight: 600; font-family: var(--font-mono);">${escapeHtml(acc.email || acc.identifier || 'GLM Account')}</td>
        <td><span class="brand-badge">${escapeHtml(acc.type || acc.plan || 'FREE')}</span></td>
        <td><strong>${acc.image_quota !== undefined ? acc.image_quota : '10'}</strong></td>
        <td>${escapeHtml(acc.video_quota || '2 / day')}</td>
        <td>${escapeHtml(acc.reason_remaining || '200 / day')}</td>
        <td>${escapeHtml(acc.deep_research || '100 / day')}</td>
        <td>${escapeHtml(acc.file_upload || '5 docs / day')}</td>
        <td>${escapeHtml(acc.concurrency || '2 requests')}</td>
        <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${escapeHtml(acc.restore_at || 'Daily (Midnight CST)')}</td>
      </tr>
    `;
  }).join('');

  // DeepSeek Accounts & Quotas
  const deepseekAccounts = deepseek.accounts || [];
  const deepseekRows = deepseekAccounts.map(acc => {
    return `
      <tr>
        <td style="font-weight: 600; font-family: var(--font-mono);">${escapeHtml(acc.email || acc.identifier || 'DeepSeek Account')}</td>
        <td><span class="brand-badge">${escapeHtml(acc.type || acc.plan || 'FREE')}</span></td>
        <td><strong>${escapeHtml(acc.image_quota !== undefined ? String(acc.image_quota) : '—')}</strong></td>
        <td>${escapeHtml(acc.reason_remaining || '50 / day')}</td>
        <td>${escapeHtml(acc.deep_research || '50 / day')}</td>
        <td>${escapeHtml(acc.web_search || '200 / day')}</td>
        <td>${escapeHtml(acc.file_upload || '5 files (100MB)')}</td>
        <td>${escapeHtml(acc.concurrency || '1 request (5/min)')}</td>
        <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${escapeHtml(acc.restore_at || 'Daily (Midnight CST)')}</td>
      </tr>
    `;
  }).join('');

  // Qwen Accounts & Quotas
  const qwenAccounts = qwen.accounts || [];
  const qwenRows = qwenAccounts.map(acc => {
    let accountName = acc.email || acc.identifier || 'user_766931c8';
    if (accountName.startsWith('qwen_ey')) {
      accountName = 'user_766931c8';
    }
    return `
      <tr>
        <td style="font-weight: 600; font-family: var(--font-mono);">${escapeHtml(accountName)}</td>
        <td><span class="brand-badge">${escapeHtml(acc.type || acc.plan || 'FREE')}</span></td>
        <td><strong>${escapeHtml(acc.image_quota !== undefined ? String(acc.image_quota) : '30 / day')}</strong></td>
        <td>${escapeHtml(acc.reason_remaining || '100 / day')}</td>
        <td>${escapeHtml(acc.deep_research || '10 / day')}</td>
        <td>${escapeHtml(acc.web_search || '500 / day')}</td>
        <td>${escapeHtml(acc.file_upload || '50 files (100MB)')}</td>
        <td>${escapeHtml(acc.concurrency || '2 requests (10/min)')}</td>
        <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${escapeHtml(acc.restore_at || 'Daily (Midnight CST)')}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <!-- ChatGPT Section -->
    <div class="limits-group">
      <div class="limits-group-header">
        <div>
          <h3 style="font-size: 16px; font-weight: 700;">ChatGPT Account Quotas</h3>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="editorial-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Plan</th>
              <th>Image Quota</th>
              <th>Reasoning</th>
              <th>Deep Res</th>
              <th>Uploads</th>
              <th>Quota Reset</th>
            </tr>
          </thead>
          <tbody>
            ${chatgptRows || '<tr><td colspan="7">No accounts loaded</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Grok Section -->
    <div class="limits-group">
      <div class="limits-group-header">
        <div>
          <h3 style="font-size: 16px; font-weight: 700;">Grok / xAI Limits & Quotas</h3>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px;">
        <div class="card" style="padding: 14px;">
          <div style="font-size: 11px; font-family: var(--font-mono); color: var(--text-muted);">IMAGINE PRO 1.5</div>
          <div style="font-size: 20px; font-weight: 700; color: var(--brand-primary); margin-top: 4px;">
            ${grokImagine.imagePro?.remainingQueries ?? 0} Queries
          </div>
          <div style="font-size: 11px; color: var(--text-muted);">Reset: ${grokImagine.imagePro?.nextAvailableAt ? new Date(grokImagine.imagePro.nextAvailableAt).toLocaleTimeString() : '—'}</div>
        </div>
        <div class="card" style="padding: 14px;">
          <div style="font-size: 11px; font-family: var(--font-mono); color: var(--text-muted);">VIDEO 720P GENERATION</div>
          <div style="font-size: 20px; font-weight: 700; color: var(--color-success); margin-top: 4px;">
            ${grokImagine.video720p?.remainingQueries ?? 0} Slots
          </div>
          <div style="font-size: 11px; color: var(--text-muted);">${(grokData.account_uid && grokData.account_uid !== 'default') ? '24-hour window' : 'No account integrated'}</div>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="editorial-table">
          <thead>
            <tr>
              <th>Mode / Model</th>
              <th>Remaining Queries</th>
              <th>Rolling Window</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${grokRows || '<tr><td colspan="4">No quota data</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Kimi Section -->
    <div class="limits-group">
      <div class="limits-group-header">
        <div>
          <h3 style="font-size: 16px; font-weight: 700;">Kimi / Moonshot AI Live Limits & Features</h3>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 16px;">
        <div class="card" style="padding: 14px;">
          <div style="font-size: 11px; font-family: var(--font-mono); color: var(--text-muted);">DAILY RESEARCH QUOTA</div>
          <div style="font-size: 20px; font-weight: 700; color: var(--brand-primary); margin-top: 4px;">
            ${kimiSummary.research_queries || '—'}
          </div>
          <div style="font-size: 11px; color: var(--text-muted);">Reset: Midnight CST</div>
        </div>
        <div class="card" style="padding: 14px;">
          <div style="font-size: 11px; font-family: var(--font-mono); color: var(--text-muted);">DEEP RESEARCH</div>
          <div style="font-size: 20px; font-weight: 700; color: var(--color-success); margin-top: 4px;">
            ${kimiSummary.deep_research ?? 0} Queries
          </div>
          <div style="font-size: 11px; color: var(--text-muted);">Multi-Step Synthesis</div>
        </div>
        <div class="card" style="padding: 14px;">
          <div style="font-size: 11px; font-family: var(--font-mono); color: var(--text-muted);">OK COMPUTER AGENT</div>
          <div style="font-size: 20px; font-weight: 700; color: #38bdf8; margin-top: 4px;">
            ${kimiSummary.ok_computer ?? 0} Tasks
          </div>
          <div style="font-size: 11px; color: var(--text-muted);">Autonomous Execution</div>
        </div>
        <div class="card" style="padding: 14px;">
          <div style="font-size: 11px; font-family: var(--font-mono); color: var(--text-muted);">SLIDES GENERATOR</div>
          <div style="font-size: 20px; font-weight: 700; color: #a78bfa; margin-top: 4px;">
            ${kimiSummary.slides ?? 0} Decks
          </div>
          <div style="font-size: 11px; color: var(--text-muted);">Presentation Maker</div>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="editorial-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Plan & Tier</th>
              <th>Daily Research</th>
              <th>Deep Research</th>
              <th>Ok Computer</th>
              <th>Slides Gen</th>
              <th>Cycle Reset</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${kimiRows || '<tr><td colspan="8">No Kimi accounts active in vault</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Claude Section -->
    <div class="limits-group">
      <div class="limits-group-header">
        <div>
          <h3 style="font-size: 16px; font-weight: 700;">Claude / Anthropic Account Quotas</h3>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="editorial-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Plan</th>
              <th>Messages</th>
              <th>Reasoning / CoT</th>
              <th>Uploads</th>
              <th>Web Search</th>
              <th>Quota Reset</th>
            </tr>
          </thead>
          <tbody>
            ${claudeRows || '<tr><td colspan="7">No Claude session keys configured in vault. Stack a sessionKey in the Control Center.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Gemini Section -->
    <div class="limits-group">
      <div class="limits-group-header">
        <div>
          <h3 style="font-size: 16px; font-weight: 700;">Google Gemini Account Quotas</h3>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="editorial-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Plan</th>
              <th>Image Quota</th>
              <th>Hourly Rate</th>
              <th>Deep Research</th>
              <th>Uploads</th>
              <th>Quota Reset</th>
            </tr>
          </thead>
          <tbody>
            ${geminiRows || '<tr><td colspan="7">No Gemini accounts active</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- GLM Section -->
    <div class="limits-group">
      <div class="limits-group-header">
        <div>
          <h3 style="font-size: 16px; font-weight: 700;">GLM / Zhipu AI Account Quotas</h3>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="editorial-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Plan</th>
              <th>Image Quota</th>
              <th>Video Quota</th>
              <th>Messages</th>
              <th>Web Search</th>
              <th>Uploads</th>
              <th>Concurrency</th>
              <th>Quota Reset</th>
            </tr>
          </thead>
          <tbody>
            ${glmRows || '<tr><td colspan="9">No GLM accounts active in vault</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- DeepSeek Section -->
    <div class="limits-group">
      <div class="limits-group-header">
        <div>
          <h3 style="font-size: 16px; font-weight: 700;">DeepSeek AI Account Quotas</h3>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="editorial-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Plan</th>
              <th>Image Quota</th>
              <th>Reasoning / CoT</th>
              <th>Deep Research</th>
              <th>Web Search</th>
              <th>Uploads</th>
              <th>Concurrency</th>
              <th>Quota Reset</th>
            </tr>
          </thead>
          <tbody>
            ${deepseekRows || '<tr><td colspan="9">No DeepSeek accounts active in vault</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Qwen Section -->
    <div class="limits-group">
      <div class="limits-group-header">
        <div>
          <h3 style="font-size: 16px; font-weight: 700;">Qwen / Alibaba Cloud Account Quotas</h3>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="editorial-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Plan</th>
              <th>Image Quota</th>
              <th>Reasoning / CoT</th>
              <th>Deep Research</th>
              <th>Web Search</th>
              <th>Uploads</th>
              <th>Concurrency</th>
              <th>Quota Reset</th>
            </tr>
          </thead>
          <tbody>
            ${qwenRows || '<tr><td colspan="9">No Qwen accounts active in vault</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ===================================================================
// Available Models Catalog
// ===================================================================
async function fetchModels() {
  try {
    const res = await fetch('/api/models');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.models = data.models || [];
    const modelBadge = document.getElementById('nav-model-count');
    if (modelBadge) modelBadge.textContent = `${state.models.length} Models`;
    renderModels();
    renderCustomSelectOptions();
    const label = document.getElementById('model-select-label');
    if (label) label.textContent = formatModelDisplayName(state.selectedModel);
  } catch (err) {
    console.error('Error fetching models:', err);
  }
}

const PROVIDER_METAS = {
  chatgpt: { name: 'ChatGPT', icon: '/static/icons/chatgpt.svg' },
  claude: { name: 'Claude', icon: '/static/icons/claude.svg' },
  gemini: { name: 'Gemini', icon: '/static/icons/gemini.svg' },
  kimi: { name: 'Kimi', icon: '/static/icons/kimi.svg' },
  glm: { name: 'GLM', icon: '/static/icons/glm.svg' },
  grok: { name: 'Grok', icon: '/static/icons/grok.svg' },
  deepseek: { name: 'DeepSeek', icon: '/static/icons/deepseek.svg' },
  qwen: { name: 'Qwen', icon: '/static/icons/qwen.svg' },
  external: { name: 'API Connections', icon: '/static/icons/chatgpt.svg' },
};

let isScrollSpyLocked = false;
let scrollSpyUnlockTimer = null;

function initModelFilters() {
  const pills = document.querySelectorAll('#model-filter-pills .filter-btn');
  pills.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      pills.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (['chatgpt', 'claude', 'gemini', 'kimi', 'glm', 'grok', 'deepseek', 'qwen', 'external'].includes(filter)) {
        const sec = document.getElementById(`models-section-${filter}`);
        const viewport = document.querySelector('.panel-viewport');
        if (sec && viewport) {
          isScrollSpyLocked = true;
          sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          clearTimeout(scrollSpyUnlockTimer);
          scrollSpyUnlockTimer = setTimeout(() => {
            isScrollSpyLocked = false;
          }, 700);
          return;
        }
      }

      if (filter === 'all') {
        const viewport = document.querySelector('.panel-viewport');
        if (viewport) {
          isScrollSpyLocked = true;
          viewport.scrollTo({ top: 0, behavior: 'smooth' });
          clearTimeout(scrollSpyUnlockTimer);
          scrollSpyUnlockTimer = setTimeout(() => {
            isScrollSpyLocked = false;
          }, 700);
        }
      }

      renderModels();
    });
  });

  const searchInput = document.getElementById('model-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderModels();
    });
  }

  initModelsScrollSpy();
}

function initModelsScrollSpy() {
  const viewport = document.querySelector('.panel-viewport');
  if (!viewport || viewport._hasScrollSpyAttached) return;
  viewport._hasScrollSpyAttached = true;

  viewport.addEventListener('scroll', () => {
    if (isScrollSpyLocked) return;

    const activePane = document.querySelector('.tab-pane.active');
    if (!activePane || activePane.id !== 'pane-models') return;

    const activeFilterBtn = document.querySelector('#model-filter-pills .filter-btn.active');
    const currentFilter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';
    if (currentFilter === 'unlocked' || currentFilter === 'locked') return;

    // Near top -> highlight 'all'
    if (viewport.scrollTop < 60) {
      const allBtn = document.querySelector('#model-filter-pills .filter-btn[data-filter="all"]');
      if (allBtn && !allBtn.classList.contains('active')) {
        document.querySelectorAll('#model-filter-pills .filter-btn').forEach(b => b.classList.remove('active'));
        allBtn.classList.add('active');
      }
      return;
    }

    const sections = document.querySelectorAll('.provider-models-section');
    if (!sections.length) return;

    const viewportRect = viewport.getBoundingClientRect();
    const probeY = viewportRect.top + 90;

    let currentSectionProvider = null;
    sections.forEach(sec => {
      const rect = sec.getBoundingClientRect();
      if (rect.top <= probeY && rect.bottom > probeY) {
        currentSectionProvider = sec.dataset.provider;
      }
    });

    if (!currentSectionProvider && sections.length > 0) {
      if (viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 30) {
        currentSectionProvider = sections[sections.length - 1].dataset.provider;
      }
    }

    if (currentSectionProvider) {
      const targetBtn = document.querySelector(`#model-filter-pills .filter-btn[data-filter="${currentSectionProvider}"]`);
      if (targetBtn && !targetBtn.classList.contains('active')) {
        document.querySelectorAll('#model-filter-pills .filter-btn').forEach(b => b.classList.remove('active'));
        targetBtn.classList.add('active');
      }
    }
  }, { passive: true });
}

function renderSingleModelCard(m) {
  const isLocked = m.locked;
  const lockBadge = isLocked
    ? `<span class="lock-badge locked">LOCKED</span>`
    : `<span class="lock-badge unlocked">UNLOCKED</span>`;

  const capsHtml = (m.capabilities || []).map(c => `<span class="cap-tag">${escapeHtml(c)}</span>`).join('');

  return `
    <div class="model-card ${isLocked ? 'locked-model' : ''}">
      <div class="model-header">
        <div>
          <div class="model-title">${escapeHtml(m.name)}</div>
          <div class="model-id-badge">${escapeHtml(m.id)}</div>
        </div>
        ${lockBadge}
      </div>

      <p class="model-desc">${escapeHtml(m.description || '')}</p>

      ${isLocked && m.reason ? `<div style="font-size: 11px; color: var(--color-warning); font-family: var(--font-mono);">${escapeHtml(m.reason)}</div>` : ''}

      <div class="model-capabilities">
        <span class="cap-tag" style="color: var(--brand-primary); font-weight: 600;">${escapeHtml((m.provider || '').toUpperCase())}</span>
        <span class="cap-tag">${escapeHtml(m.context || '')}</span>
        ${capsHtml}
      </div>

      <div class="model-card-footer">
        <span style="color: var(--text-muted); font-size: 11px;">Base: /v1/chat/completions</span>
        <button class="btn btn-secondary btn-sm" onclick="selectAndTestModel('${escapeHtml(m.id)}')">
          Test in Playground
        </button>
      </div>
    </div>
  `;
}

function renderModels() {
  const container = document.getElementById('models-container');
  if (!container) return;

  const activeFilterBtn = document.querySelector('#model-filter-pills .filter-btn.active');
  const filter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';
  const query = (document.getElementById('model-search')?.value || '').toLowerCase().trim();

  const filtered = state.models.filter(m => {
    if (filter === 'unlocked' && m.locked) return false;
    if (filter === 'locked' && !m.locked) return false;
    if (filter === 'external' && (m.provider || '').toLowerCase() !== 'external') return false;

    if (query) {
      const matchName = m.name.toLowerCase().includes(query);
      const matchId = m.id.toLowerCase().includes(query);
      const matchDesc = (m.description || '').toLowerCase().includes(query);
      const matchCaps = (m.capabilities || []).some(c => c.toLowerCase().includes(query));
      if (!matchName && !matchId && !matchDesc && !matchCaps) return false;
    }

    return true;
  });

  const providerOrder = ['chatgpt', 'claude', 'gemini', 'kimi', 'glm', 'grok', 'deepseek', 'qwen', 'external'];
  const grouped = {};
  providerOrder.forEach(p => grouped[p] = []);

  filtered.forEach(m => {
    const p = (m.provider || '').toLowerCase();
    if (!grouped[p]) grouped[p] = [];
    grouped[p].push(m);
  });

  let html = '';
  providerOrder.forEach(provider => {
    const list = grouped[provider] || [];
    if (list.length === 0) return;

    const meta = PROVIDER_METAS[provider] || { name: provider.toUpperCase(), icon: '' };

    html += `
      <section class="provider-models-section" id="models-section-${provider}" data-provider="${provider}">
        <div class="provider-section-header">
          <div class="provider-section-title">
            <img src="${meta.icon}" class="provider-section-icon" alt="${meta.name}" onerror="this.style.display='none'" />
            <h3 class="provider-section-name">${escapeHtml(meta.name)}</h3>
          </div>
          <span class="provider-section-count">${list.length} Models</span>
        </div>
        <div class="models-grid">
          ${list.map(m => renderSingleModelCard(m)).join('')}
        </div>
      </section>
    `;
  });

  if (!html) {
    html = `
      <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
        <p style="font-size: 16px; margin-bottom: 8px;">No models found matching your criteria</p>
        <span style="font-size: 13px;">Try changing the filter or clearing the search box.</span>
      </div>
    `;
  }

  container.innerHTML = html;
}

function selectAndTestModel(modelId) {
  state.selectedModel = modelId;
  const label = document.getElementById('model-select-label');
  if (label) label.textContent = formatModelDisplayName(modelId);
  const inputModel = document.getElementById('input-model-name');
  if (inputModel) inputModel.textContent = formatModelDisplayName(modelId);
  if (typeof loadModelSettings === 'function') {
    loadModelSettings(modelId);
  }
  switchTab('playground');
  showToast(`Selected model: ${formatModelDisplayName(modelId)}`, 'info');
  document.getElementById('chat-input')?.focus();
}

// ===================================================================
// Cookie Changer & Stacker Section
// ===================================================================
function initCookieTabs() {
  const tabs = document.querySelectorAll('#cookie-provider-tabs .provider-tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeCookieProvider = btn.dataset.p;
      loadCookiesTab();
    });
  });

  const saveBtn = document.getElementById('btn-save-cookie');
  if (saveBtn) saveBtn.addEventListener('click', saveCookies);

  const exportBtn = document.getElementById('btn-export-cookies');
  if (exportBtn) exportBtn.addEventListener('click', exportAllCookies);

  const importBtn = document.getElementById('btn-import-cookies');
  const importInput = document.getElementById('import-file-input');
  if (importBtn && importInput) {
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', handleImportCookiesFile);
  }
}

function getRuleIconSvg(icon) {
  if (icon === 'users') {
    return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
  }
  if (icon === 'lock') {
    return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
  }
  if (icon === 'shield') {
    return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
  }
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
}

const TOKEN_GUIDES = {
  chatgpt: {
    title: 'How to Extract ChatGPT Session Tokens',
    steps: [
      {
        num: '1',
        text: 'Sign in to your ChatGPT account at <a href="https://chatgpt.com" target="_blank" rel="noopener" class="token-guide-link">chatgpt.com</a> in a dedicated browser profile.'
      },
      {
        num: '2',
        text: 'In the exact same browser profile, open <a href="https://chatgpt.com/api/auth/session" target="_blank" rel="noopener" class="token-guide-link">chatgpt.com/api/auth/session</a>.'
      },
      {
        num: '3',
        text: 'Copy the full JSON response dump (or the <code>accessToken</code> string) and paste it into the box below.'
      }
    ],
    rules: [
      {
        icon: 'users',
        title: 'Create Separate Chrome Profiles',
        desc: 'Always create a separate, isolated Chrome profile for each ChatGPT account you stack to prevent session cookie collisions.'
      },
      {
        icon: 'lock',
        title: 'Never Click "Log Out"',
        desc: 'Do not log out of the account in your browser! Logging out immediately revokes your session token on OpenAI servers. Simply close the tab/window.'
      },
      {
        icon: 'shield',
        title: 'Do Not Use Your Main Account',
        desc: 'Never use your primary daily personal ChatGPT account. Use dedicated secondary or throwaway accounts for API pooling.'
      }
    ]
  },
  claude: {
    title: 'How to Extract Claude SessionKey',
    steps: [
      {
        num: '1',
        text: 'Sign in to <a href="https://claude.ai" target="_blank" rel="noopener" class="token-guide-link">claude.ai</a> in your browser.'
      },
      {
        num: '2',
        text: 'Open Chrome Developer Tools (press <code>F12</code> or right-click &rarr; Inspect) &rarr; navigate to <strong>Application</strong> &rarr; <strong>Cookies</strong> &rarr; <code>https://claude.ai</code>.'
      },
      {
        num: '3',
        text: 'Locate the cookie named <code>sessionKey</code> (starts with <code>sk-ant-sid02-...</code>), copy its entire string value, and paste it below.'
      }
    ],
    rules: [
      {
        icon: 'users',
        title: 'Separate Browser Profiles',
        desc: 'Use distinct browser profiles when managing multiple Claude accounts to keep session credentials fully independent.'
      },
      {
        icon: 'lock',
        title: 'Do Not Log Out',
        desc: 'Logging out terminates the sessionKey immediately on Anthropic authentication servers. Just close the browser tab.'
      },
      {
        icon: 'shield',
        title: 'Avoid Personal Main Accounts',
        desc: 'Use secondary/dedicated accounts so automated API calls do not burn through your personal conversation rate limits.'
      }
    ]
  },
  grok: {
    title: 'How to Extract Grok SSO Cookies',
    steps: [
      {
        num: '1',
        text: 'Log into <a href="https://grok.com" target="_blank" rel="noopener" class="token-guide-link">grok.com</a> or <a href="https://x.com" target="_blank" rel="noopener" class="token-guide-link">x.com</a> in your browser.'
      },
      {
        num: '2',
        text: 'Open DevTools (<code>F12</code>) &rarr; go to <strong>Application</strong> &rarr; <strong>Cookies</strong> &rarr; <code>https://grok.com</code>.'
      },
      {
        num: '3',
        text: 'Copy the values for <code>sso</code> and <code>sso-rw</code>, or paste your raw Cookie header string into the box below.'
      }
    ],
    rules: [
      {
        icon: 'users',
        title: 'Separate Browser Profiles',
        desc: 'Keep separate browser profiles for each X/Grok account to prevent cookie collisions and cross-account logouts.'
      },
      {
        icon: 'lock',
        title: 'Never Click Sign Out',
        desc: 'Signing out revokes the Twitter/X SSO session. Leave the session active and just close the window.'
      },
      {
        icon: 'shield',
        title: 'Dedicated Grok Accounts',
        desc: 'Avoid using your primary personal Twitter profile for heavy API querying.'
      }
    ]
  },
  kimi: {
    title: 'How to Extract Kimi JWT Refresh Tokens',
    steps: [
      {
        num: '1',
        text: 'Log into <a href="https://kimi.com" target="_blank" rel="noopener" class="token-guide-link">kimi.com</a> in your browser.'
      },
      {
        num: '2',
        text: 'Press <code>F12</code> &rarr; select <strong>Application</strong> &rarr; <strong>Local Storage</strong> &rarr; <code>https://kimi.com</code>.'
      },
      {
        num: '3',
        text: 'Copy the <code>refresh_token</code> string (recommended for long-term access) or <code>access_token</code> and paste it below. (JSON dumps and quotes are auto-unwrapped).'
      }
    ],
    rules: [
      {
        icon: 'users',
        title: 'Separate Browser Profiles',
        desc: 'Use distinct browser profiles if stacking multiple Moonshot / Kimi accounts.'
      },
      {
        icon: 'lock',
        title: 'Keep Sessions Active',
        desc: 'Do not click sign out in the web interface; simply close the browser window.'
      },
      {
        icon: 'shield',
        title: 'Dedicated Phone Accounts',
        desc: 'Use dedicated numbers for high-throughput automated workloads.'
      }
    ]
  },
  gemini: {
    title: 'How to Extract Gemini Google Cookies',
    steps: [
      {
        num: '1',
        text: 'Sign in to <a href="https://gemini.google.com" target="_blank" rel="noopener" class="token-guide-link">gemini.google.com</a> in an isolated Google Chrome profile.'
      },
      {
        num: '2',
        text: 'Press <code>F12</code> (DevTools) &rarr; go to <strong>Application</strong> tab &rarr; <strong>Cookies</strong> &rarr; <code>https://gemini.google.com</code>.'
      },
      {
        num: '3',
        text: 'Copy the values for <code>__Secure-1PSID</code> and <code>__Secure-1PSIDTS</code> (and optionally <code>SAPISID</code>), or in <strong>Network</strong> tab copy the entire <strong>Cookie</strong> header from any Gemini request.'
      }
    ],
    rules: [
      {
        icon: 'users',
        title: 'Dedicated Chrome Profiles',
        desc: 'CRITICAL: Always create a separate Chrome profile for each Google account to keep Google credentials isolated.'
      },
      {
        icon: 'lock',
        title: 'Never Click Sign Out',
        desc: 'Signing out immediately destroys Google security tickets across all apps. Just close the Chrome window.'
      },
      {
        icon: 'shield',
        title: 'Never Use Primary Google Account',
        desc: 'Do NOT use your personal Google account with private Gmail, Drive, Photos, or payment methods. Use dedicated burner/secondary Google accounts.'
      }
    ]
  },
  deepseek: {
    title: 'How to Extract DeepSeek userToken',
    steps: [
      {
        num: '1',
        text: 'Sign in to <a href="https://chat.deepseek.com" target="_blank" rel="noopener" class="token-guide-link">chat.deepseek.com</a> in your browser.'
      },
      {
        num: '2',
        text: 'Press <code>F12</code> (DevTools) &rarr; go to <strong>Application</strong> &rarr; <strong>Local Storage</strong> &rarr; <code>https://chat.deepseek.com</code>.'
      },
      {
        num: '3',
        text: 'Copy the value of <code>userToken</code> (starts with <code>ey...</code>) or your session Bearer token from the Network tab, and paste it below.'
      }
    ],
    rules: [
      {
        icon: 'users',
        title: '100% Free Frontier Models',
        desc: 'DeepSeek web accounts provide full access to DeepSeek-V3 and DeepSeek-R1 with zero subscription fees.'
      },
      {
        icon: 'lock',
        title: 'Do Not Click Log Out',
        desc: 'Logging out invalidates the token on DeepSeek authentication servers. Simply close the browser window.'
      },
      {
        icon: 'shield',
        title: 'Multi-Account Pooling',
        desc: 'Stack multiple DeepSeek userTokens into the Singularity vault to balance capacity during peak traffic periods.'
      }
    ]
  },
  qwen: {
    title: 'How to Extract Qwen Bearer Token',
    steps: [
      {
        num: '1',
        text: 'Sign in to <a href="https://chat.qwen.ai" target="_blank" rel="noopener" class="token-guide-link">chat.qwen.ai</a> in your browser.'
      },
      {
        num: '2',
        text: 'Press <code>F12</code> (DevTools) &rarr; go to <strong>Application</strong> &rarr; <strong>Local Storage</strong> &rarr; <code>https://chat.qwen.ai</code>.'
      },
      {
        num: '3',
        text: 'Copy the value of <code>token</code> (or authorization header from Network tab) and paste it below.'
      }
    ],
    rules: [
      {
        icon: 'users',
        title: 'Native 1M Context Frontier Models',
        desc: 'Qwen web sessions support Qwen 3.8 Max, Omni-Flash, and Plus with up to 1M token contexts.'
      },
      {
        icon: 'lock',
        title: 'Session Persistence',
        desc: 'Avoid clicking Log Out in chat.qwen.ai to keep your Bearer session alive in the Singularity pool.'
      },
      {
        icon: 'shield',
        title: 'Quark Search & Multimodal',
        desc: 'Web sessions seamlessly execute real-time grounding, Quark search, and multimodal visual comprehension.'
      }
    ]
  }
};

async function loadCookiesTab() {
  try {
    const res = await fetch('/api/cookies');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.cookiesData = await res.json();
  } catch (err) {
    console.error('Error fetching cookies:', err);
  }

  // Update cross-device SQLite status badge
  let totalAccounts = 0;
  if (state.cookiesData) {
    Object.values(state.cookiesData).forEach(entry => {
      if (entry && Array.isArray(entry.accounts)) {
        totalAccounts += entry.accounts.length;
      }
    });
  }
  const syncBadge = document.getElementById('sync-db-status');
  if (syncBadge) {
    syncBadge.textContent = `${totalAccounts} Stacked`;
  }
  if (window.SingularityConnections?.show) window.SingularityConnections.show();

  const p = state.activeCookieProvider;
  const pData = state.cookiesData[p] || { accounts: [] };

  const title = document.getElementById('cookie-input-title');
  const desc = document.getElementById('cookie-input-desc');
  const textarea = document.getElementById('cookie-textarea');

  const meta = {
    chatgpt: {
      title: 'ChatGPT Account Stacker',
      desc: 'Paste Next-Auth session JSON dumps or access tokens. Paste multiple accounts line-by-line to stack your pool.',
      placeholder: '{"accessToken": "eyJhbGci...", "user": {"email": "account@gmail.com"}}',
    },
    claude: {
      title: 'Claude SessionKey Stacker',
      desc: 'Paste sessionKey strings (sk-ant-sid02-...). Stacks multiple sessions into the Singularity Unified Vault (SQLite).',
      placeholder: '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',
    },
    grok: {
      title: 'Grok SSO Stacker',
      desc: 'Paste Grok cookie strings containing sso=... and x-userid=... (one per line).',
      placeholder: 'sso=...; sso-rw=...; x-userid=b9e803ff-94ed-46c1-88bd-4baf02c5ccfe',
    },
    kimi: {
      title: 'Kimi JWT Stacker',
      desc: 'Paste Kimi refresh token JWT (one per line). Stored securely in Singularity Unified Vault (SQLite).',
      placeholder: 'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9...',
    },
    gemini: {
      title: 'Gemini Cookie Stacker',
      desc: 'Paste raw Google cookies containing __Secure-1PSID and __Secure-1PSIDTS (one per line).',
      placeholder: '__Secure-1PSID=...; __Secure-1PSIDTS=...',
    },
    glm: {
      title: 'GLM Token Stacker',
      desc: 'Paste Zhipu AI refresh tokens (one per line). Stored securely in Singularity Unified Vault (SQLite).',
      placeholder: 'Paste GLM refresh token line-by-line...',
    },
    deepseek: {
      title: 'DeepSeek Token Stacker',
      desc: 'Paste DeepSeek userToken (JWT from chat.deepseek.com) or {"email": "...", "password": "..."}.',
      placeholder: 'userToken (Bearer ey...) or login credentials dump...',
    },
    qwen: {
      title: 'Qwen Token Stacker',
      desc: 'Paste Qwen Bearer token, session cookie string, or localStorage JSON (one per line).',
      placeholder: 'Bearer token or {"token": "..."} dump...',
    },
  }[p] || { title: 'Account Stacker', desc: '', placeholder: '' };

  title.textContent = meta.title;
  desc.textContent = meta.desc;
  textarea.placeholder = meta.placeholder;
  textarea.value = '';

  // Render dynamic Token Extraction & Safety Guide (GLM has no guide)
  const guideCard = document.getElementById('token-guide-card');
  const guide = TOKEN_GUIDES[p];

  if (!guide || p === 'glm') {
    if (guideCard) guideCard.style.display = 'none';
  } else {
    if (guideCard) {
      guideCard.style.display = 'flex';
      guideCard.innerHTML = `
        <div class="token-guide-header">
          <div class="token-guide-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>${escapeHtml(guide.title)}</span>
          </div>
        </div>

        <div class="token-guide-steps">
          ${guide.steps.map(s => `
            <div class="token-step-item">
              <span class="token-step-num">${s.num}</span>
              <div>${s.text}</div>
            </div>
          `).join('')}
        </div>

        <div class="token-guide-rules">
          <div class="token-rules-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>Session Stability & Account Safeguards</span>
          </div>
          <div class="token-rules-list">
            ${guide.rules.map(r => `
              <div class="token-rule-item">
                <span class="token-rule-icon-wrap">${getRuleIconSvg(r.icon)}</span>
                <div class="token-rule-text">
                  <strong>${escapeHtml(r.title)}:</strong>
                  <span>${escapeHtml(r.desc)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  // Render active stacked accounts
  const listContainer = document.getElementById('stacked-accounts-list');
  const accounts = pData.accounts || [];

  if (accounts.length === 0) {
    listContainer.innerHTML = `
      <div class="card" style="padding: 16px; color: var(--text-muted); text-align: center; font-size: 13px;">
        No active stacked accounts found for ${p.toUpperCase()}. Paste new credentials above to stack.
      </div>
    `;
    return;
  }

  listContainer.innerHTML = accounts.map((acc, idx) => {
    const label = acc.email || acc.name || acc.masked || `Account #${idx + 1}`;
    const sub = acc.plan ? `Plan: ${acc.plan.toUpperCase()}` : (acc.masked || 'Active Session');
    const ident = acc.identifier || acc.email || acc.sessionKey || acc.token || acc.raw || '';
    const cardId = `acc-card-${p}-${acc.id != null ? acc.id : idx}`;
    const badgeId = `acc-badge-${p}-${acc.id != null ? acc.id : idx}`;
    const descId = `acc-desc-${p}-${acc.id != null ? acc.id : idx}`;

    return `
      <div class="account-card" id="${cardId}">
        <div class="account-card-info">
          <div class="account-card-title">${escapeHtml(label)}</div>
          <div class="account-card-desc" id="${descId}" style="display:flex;align-items:center;gap:6px;">
            <span>${escapeHtml(sub)}</span>
            <span id="${badgeId}" style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:600;padding:2px 7px;border-radius:10px;background:rgba(255,255,255,0.07);color:var(--text-muted);">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="animation:spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Checking…
            </span>
          </div>
        </div>
        <div class="account-card-actions">
          <button class="btn-remove-acc" onclick="removeStackedAccount('${escapeHtml(p)}', ${Number(acc.id != null ? acc.id : idx)}, '${escapeHtml(ident)}')" title="Remove this account">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            <span>Remove</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Fire real-time token validation for providers that support it
  if (p === 'chatgpt' || p === 'gemini') {
    _validateAccountsLive(p, accounts);
  } else {
    // For other providers just show DB status
    accounts.forEach((acc, idx) => {
      const badgeId = `acc-badge-${p}-${acc.id != null ? acc.id : idx}`;
      const badge = document.getElementById(badgeId);
      if (badge) {
        badge.innerHTML = '● STACKED';
        badge.style.background = 'rgba(34,197,94,0.12)';
        badge.style.color = '#4ade80';
        badge.style.animation = 'none';
      }
    });
  }
}

async function _validateAccountsLive(provider, accounts) {
  // Show spinner CSS if not already added
  if (!document.getElementById('spin-keyframes')) {
    const style = document.createElement('style');
    style.id = 'spin-keyframes';
    style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }

  try {
    const res = await fetch(`/api/accounts/validate?provider=${encodeURIComponent(provider)}`);
    if (!res.ok) return;
    const data = await res.json();
    const validated = data.accounts || [];

    validated.forEach(vAcc => {
      const cardIndex = accounts.findIndex(a => (a.id != null ? a.id : -1) === (vAcc.id != null ? vAcc.id : -2));
      const idx = cardIndex >= 0 ? cardIndex : validated.indexOf(vAcc);
      const badgeId = `acc-badge-${provider}-${vAcc.id != null ? vAcc.id : idx}`;
      const badge = document.getElementById(badgeId);
      if (!badge) return;

      if (vAcc.valid) {
        let expLabel = '';
        if (vAcc.expires_at) {
          const d = new Date(vAcc.expires_at * 1000);
          expLabel = ` · exp ${d.toLocaleDateString()}`;
        }
        badge.innerHTML = `✓ Valid${expLabel}`;
        badge.style.background = 'rgba(34,197,94,0.12)';
        badge.style.color = '#4ade80';
      } else {
        badge.innerHTML = `✗ Expired`;
        badge.style.background = 'rgba(239,68,68,0.12)';
        badge.style.color = '#f87171';
        badge.title = vAcc.reason || 'Token expired or invalid';
        // Also dim the whole card
        const cardId = `acc-card-${provider}-${vAcc.id != null ? vAcc.id : idx}`;
        const card = document.getElementById(cardId);
        if (card) card.style.opacity = '0.55';
      }
    });
  } catch (e) {
    // Validation probe failed silently — leave badges as-is
  }
}

async function removeStackedAccount(provider, index, identifier) {
  if (!confirm(`Are you sure you want to remove this account from ${provider.toUpperCase()}?`)) {
    return;
  }

  try {
    showToast(`Removing account from ${provider.toUpperCase()}...`, 'info');
    const res = await fetch(`/api/cookies/${provider}/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: index, identifier: identifier, id: index }),
    });
    const data = await res.json();
    if (data.status === 'ok') {
      showToast(data.message, 'success');
      await loadCookiesTab();
      // Also refresh limits tab in background
      try {
        const limRes = await fetch('/api/limits');
        if (limRes.ok) {
          state.limits = await limRes.json();
          renderLimits();
        }
      } catch (_) { }

      // Restart daemon to apply removal if currently running
      const srv = state.services?.find(s => s.id === provider);
      if (srv && srv.running) {
        setTimeout(() => {
          showToast(`Restarting ${provider} daemon to apply changes...`, 'info');
          restartService(provider);
        }, 800);
      }
    } else {
      showToast(data.message || 'Failed to remove account', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveCookies() {
  const p = state.activeCookieProvider;
  const textarea = document.getElementById('cookie-textarea');
  const content = textarea.value.trim();

  if (!content) {
    showToast('Please enter credential content to save.', 'error');
    return;
  }

  try {
    showToast(`Saving credentials for ${p.toUpperCase()}...`, 'info');
    const res = await fetch(`/api/cookies/${p}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accounts: content }),
    });
    const data = await res.json();
    if (data.status === 'ok') {
      showToast(data.message, 'success');
      if (data.warning) {
        setTimeout(() => showToast(data.warning, 'warning', 10000), 600);
      } else if (p === 'gemini' && content.includes('__Secure-1PSID') && !content.includes('__Secure-1PSIDTS')) {
        setTimeout(() => showToast('⚠️ Warning: __Secure-1PSIDTS was not found in your pasted cookie! Image generation strictly requires both __Secure-1PSID and __Secure-1PSIDTS.', 'warning', 10000), 600);
      }
      textarea.value = '';
      await loadCookiesTab();
      // Refresh limits tab so new accounts appear immediately
      try {
        const limRes = await fetch('/api/limits');
        if (limRes.ok) {
          state.limits = await limRes.json();
          renderLimits();
        }
      } catch (_) { }

      // Restart daemon to apply new credentials only if it is already running
      const srv = state.services?.find(s => s.id === p);
      if (srv && srv.running) {
        setTimeout(() => {
          showToast(`Restarting ${p} daemon to apply new credentials...`, 'info');
          restartService(p);
        }, 800);
      }
    } else {
      showToast(data.message || 'Failed to save', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function exportAllCookies() {
  try {
    showToast('Exporting credentials backup...', 'info');
    const res = await fetch('/api/cookies/export');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `singularity_credentials_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Exported ${data.total_accounts || 0} accounts successfully!`, 'success');
  } catch (err) {
    showToast(`Export failed: ${err.message}`, 'error');
  }
}

async function handleImportCookiesFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    showToast('Reading credentials file...', 'info');
    const text = await file.text();
    const parsed = JSON.parse(text);

    showToast('Importing credentials to SQLite...', 'info');
    const res = await fetch('/api/cookies/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    });

    const data = await res.json();
    if (!res.ok || data.status !== 'ok') {
      throw new Error(data.message || data.detail || 'Import failed');
    }

    showToast(data.message || 'Imported accounts successfully!', 'success');
    await loadCookiesTab();
    fetchServices();
  } catch (err) {
    showToast(`Import error: ${err.message}`, 'error');
  } finally {
    event.target.value = '';
  }
}


// ===================================================================
// Model Display Formatter & Custom Select Component
// ===================================================================
function formatModelDisplayName(modelId) {
  if (!modelId) return 'Gpt 5.6 Sol';
  const found = state.models?.find(m => m.id.toLowerCase() === modelId.toLowerCase());
  if (found && found.name) {
    return found.name.replace(/^GPT[- ]/i, 'Gpt ').replace(/-/g, ' ');
  }
  return modelId
    .split(/[-_]/)
    .filter(Boolean)
    .map(token => {
      if (/^\d+(\.\d+)*$/.test(token)) return token;
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(' ');
}

function initCustomSelect() {
  const trigger = document.getElementById('model-select-trigger');
  const popover = document.getElementById('model-select-popover');
  const searchInput = document.getElementById('model-filter-input');

  const label = document.getElementById('model-select-label');
  if (label) {
    label.textContent = formatModelDisplayName(state.selectedModel);
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = popover.classList.toggle('open');
    trigger.classList.toggle('active', isOpen);
    if (isOpen) {
      searchInput.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (!popover.contains(e.target) && !trigger.contains(e.target)) {
      popover.classList.remove('open');
      trigger.classList.remove('active');
    }
  });

  searchInput.addEventListener('input', () => {
    renderCustomSelectOptions(searchInput.value.toLowerCase().trim());
  });
}

function renderCustomSelectOptions(query = '') {
  const list = document.getElementById('select-options-list');
  if (!list) return;

  const modality = state.playgroundModality || 'all';

  const filtered = state.models.filter(m => {
    // Modality filter
    if (modality === 'image') {
      const isImg = (m.capabilities && (m.capabilities.includes('image') || m.capabilities.includes('image_generation'))) ||
        /(image|imagine|cogview|dall-e|flux|imagen|sdxl|wanx)/i.test(m.id) ||
        /(image|imagine|cogview|dall-e)/i.test(m.name);
      if (!isImg) return false;
    } else if (modality === 'video') {
      const isVid = (m.capabilities && m.capabilities.includes('video')) ||
        /(video|cogvideox|kling|sora|runway)/i.test(m.id) ||
        /(video|animation)/i.test(m.name);
      if (!isVid) return false;
    }

    if (!query) return true;
    return m.name.toLowerCase().includes(query) || m.id.toLowerCase().includes(query) || m.provider.toLowerCase().includes(query);
  });

  list.innerHTML = filtered.map(m => {
    const isSelected = m.id === state.selectedModel;
    return `
      <div class="select-option ${isSelected ? 'selected' : ''}" data-id="${escapeHtml(m.id)}">
        <div>
          <span style="font-weight: 600;">${escapeHtml(m.name)}</span>
          <span style="font-size: 11px; color: var(--text-muted); margin-left: 6px;">(${escapeHtml(m.provider)})</span>
        </div>
        ${m.locked ? '<span class="lock-badge locked" style="font-size: 9px;">LOCKED</span>' : ''}
      </div>
    `;
  }).join('');

  list.querySelectorAll('.select-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const modelId = opt.dataset.id;
      state.selectedModel = modelId;
      const label = document.getElementById('model-select-label');
      if (label) label.textContent = formatModelDisplayName(modelId);
      const inputModel = document.getElementById('input-model-name');
      if (inputModel) inputModel.textContent = formatModelDisplayName(modelId);
      document.getElementById('model-select-popover').classList.remove('open');
      document.getElementById('model-select-trigger').classList.remove('active');
      renderCustomSelectOptions();
      if (typeof loadModelSettings === 'function') {
        loadModelSettings(modelId);
      }
    });
  });
}

// ===================================================================
// Interactive Playground with Rich Media & Motion Graphics
// ===================================================================

let currentLightboxSrc = null;

function openMediaLightbox(src, type = 'image', caption = '') {
  const modal = document.getElementById('playground-lightbox');
  const box = document.getElementById('lightbox-content-box');
  if (!modal || !box) return;

  currentLightboxSrc = src;
  box.innerHTML = `<img src="${escapeHtml(safeMediaUrl(src))}" alt="${escapeHtml(caption || 'Generated Media')}" />`;
  modal.classList.add('open');
}

function closeMediaLightbox() {
  const modal = document.getElementById('playground-lightbox');
  if (modal) modal.classList.remove('open');
  currentLightboxSrc = null;
}

function downloadMediaFile(src, filename) {
  const safeSrc = safeMediaUrl(src);
  if (!safeSrc) return;
  const link = document.createElement('a');
  link.href = safeSrc;
  link.download = filename || 'download';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Downloading media file...', 'info');
}

async function copyMediaToClipboard(src) {
  try {
    if (src.startsWith('data:image/')) {
      const resp = await fetch(src);
      const blob = await resp.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      showToast('Image copied to clipboard!', 'success');
      return;
    }
    await navigator.clipboard.writeText(src);
    showToast('Image link copied to clipboard!', 'success');
  } catch (err) {
    await navigator.clipboard.writeText(src);
    showToast('Copied media URL to clipboard!', 'success');
  }
}

function detectQueryModality(modelId, promptText) {
  if (state.playgroundModality === 'image') return 'image';
  if (state.playgroundModality === 'video') return 'video';

  const m = (modelId || '').toLowerCase();
  const text = (promptText || '').toLowerCase();
  const modelInfo = (state.models || []).find(x => x.id === modelId);
  const caps = modelInfo?.capabilities || [];

  if (
    caps.includes('video') ||
    /(video|veo|cogvideox|kling|sora|runway)/i.test(m) ||
    /(\bgenerate\b|\bmake\b|\bcreate\b|\brender\b).*(\bvideo\b|\banimation\b|\bclip\b|\bmp4\b|\bmovie\b)/i.test(text)
  ) {
    return 'video';
  }

  if (
    caps.includes('image') ||
    caps.includes('image_generation') ||
    /(image|imagine|dall-e|cogview|flux|imagen|sdxl|wanx|banana)/i.test(m) ||
    /(\bgenerate\b|\bmake\b|\bcreate\b|\bdraw\b|\bpaint\b|\brender\b).*(\bimage\b|\bimg\b|\bpicture\b|\bphoto\b|\billustration\b|\bart\b|\bwallpaper\b|\bposter\b|\bapple\b)/i.test(text)
  ) {
    return 'image';
  }

  return 'text';
}

function detectImageAspectRatio(promptText) {
  const p = (promptText || '').toLowerCase();

  // 1. Explicit numeric aspect ratios take highest precedence
  if (/(?:^|\D)16\s*[:/x]\s*9(?:\D|$)/i.test(p)) {
    return { ratio: '16 / 9', maxWidth: '512px', isDefault: false };
  }
  if (/(?:^|\D)9\s*[:/x]\s*16(?:\D|$)/i.test(p)) {
    return { ratio: '9 / 16', maxWidth: '300px', isDefault: false };
  }
  if (/(?:^|\D)4\s*[:/x]\s*3(?:\D|$)/i.test(p)) {
    return { ratio: '4 / 3', maxWidth: '480px', isDefault: false };
  }
  if (/(?:^|\D)3\s*[:/x]\s*4(?:\D|$)/i.test(p)) {
    return { ratio: '3 / 4', maxWidth: '360px', isDefault: false };
  }
  if (/(?:^|\D)2\s*[:/x]\s*1(?:\D|$)/i.test(p)) {
    return { ratio: '2 / 1', maxWidth: '520px', isDefault: false };
  }
  if (/(?:^|\D)1\s*[:/x]\s*2(?:\D|$)/i.test(p)) {
    return { ratio: '1 / 2', maxWidth: '260px', isDefault: false };
  }
  if (/(?:^|\D)1\s*[:/x]\s*1(?:\D|$)/i.test(p)) {
    return { ratio: '1 / 1', maxWidth: '440px', isDefault: false };
  }

  // 2. Generic semantic format descriptors
  if (/\b(?:widescreen|landscape|wide|horizontal)\b/i.test(p)) {
    return { ratio: '16 / 9', maxWidth: '512px', isDefault: false };
  }
  if (/\b(?:portrait|vertical|story|reel|tiktok)\b/i.test(p)) {
    return { ratio: '9 / 16', maxWidth: '300px', isDefault: false };
  }
  if (/\b(?:panoramic|banner|header|ultrawide)\b/i.test(p)) {
    return { ratio: '2 / 1', maxWidth: '520px', isDefault: false };
  }
  if (/\b(?:square)\b/i.test(p)) {
    return { ratio: '1 / 1', maxWidth: '440px', isDefault: false };
  }

  // 3. Default is strictly 1:1 square
  return { ratio: '1 / 1', maxWidth: '440px', isDefault: true };
}

/**
 * High-Definition Real-Time Fluid Simulation (WebGL GPU Navier-Stokes & Curl Advection)
 * Renders at full Retina/display native resolution (zero pixelation/blockiness).
 * Autonomously billows and swirls without user controls.
 * - Light theme: Pure white #ffffff background with #d97757 terracotta and white fluid flowing and merging.
 * - Dark theme: Dark obsidian #0d0c0b background with glowing terracotta streams.
 */
function startCanvasFluidSimulation(canvas, progressPill) {
  let isRunning = true;
  let animId = null;

  // Progress counter simulation (as shown in Image 1: "19%", etc.)
  let progressPct = 12;
  const progressTimer = setInterval(() => {
    if (!isRunning) return;
    if (progressPct < 92) {
      progressPct += Math.floor(Math.random() * 6) + 3;
      if (progressPct > 92) progressPct = 92;
      if (progressPill) progressPill.textContent = `${progressPct}%`;
    }
  }, 450);

  const vsSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fsSource = `
    precision highp float;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_is_dark;

    void main() {
      vec2 res = max(u_resolution, vec2(1.0, 1.0));
      vec2 p = (gl_FragCoord.xy * 2.0 - res) / min(res.x, res.y);
      float t = u_time * 0.55;

      // Harmonic rotating vortex currents: advect, stretch, and fold the fluid coordinates
      for (int i = 1; i <= 4; i++) {
        float fi = float(i);
        vec2 center = vec2(
          sin(t * 0.35 * fi + fi * 1.5) * 0.45,
          cos(t * 0.30 * fi + fi * 0.8) * 0.45
        );
        vec2 delta = p - center;
        float dist = length(delta);
        float angle = atan(delta.y, delta.x);

        // Smooth tangential vortex flow + gentle radial current (100% continuous, zero noise hash)
        float strength = 0.28 / (1.0 + dist * 2.2);
        p.x += sin(angle * 2.0 + dist * 3.2 - t * 0.7 * fi) * strength;
        p.y += cos(angle * 2.0 - dist * 3.2 + t * 0.6 * fi) * strength;
      }

      // Smooth liquid interference currents (creamy continuous waves, zero TV grain)
      float w1 = sin(p.x * 2.6 + sin(p.y * 2.0 + t * 0.5)) * cos(p.y * 2.4 - sin(p.x * 1.6 - t * 0.4));
      float w2 = sin(length(p) * 3.8 - t * 0.9) * 0.5;
      float density = clamp((w1 + w2) * 0.55 + 0.5, 0.0, 1.0);

      // Buttery-smooth fluid boundaries
      float fluid = smoothstep(0.22, 0.78, density);
      float detail = smoothstep(0.32, 0.68, sin(p.x * 4.2 - p.y * 3.5 + t * 0.8) * 0.5 + 0.5);

      vec3 color;
      if (u_is_dark > 0.5) {
        // DARK THEME: UI background color #000000 with glowing #d97757 terracotta streams
        vec3 bgDark = vec3(0.0, 0.0, 0.0);
        vec3 terra = vec3(0.851, 0.467, 0.341); // #d97757
        vec3 peach = vec3(0.988, 0.68, 0.56);
        vec3 stream = mix(terra, peach, detail * 0.5);
        color = mix(bgDark, stream, fluid);
      } else {
        // LIGHT THEME: Pure white #ffffff and whitish fluid (zero dark/black!)
        vec3 pureWhite = vec3(1.0, 1.0, 1.0);
        vec3 softWhite = vec3(0.985, 0.980, 0.975);
        vec3 terracotta = vec3(0.851, 0.467, 0.341); // #d97757
        vec3 deepTerra = vec3(0.78, 0.38, 0.26);

        vec3 terraStream = mix(terracotta, deepTerra, detail * 0.38);

        // Terracotta and white fluids folding, swirling, and merging together
        float whiteMerge = smoothstep(0.35, 0.74, cos(p.y * 3.2 + p.x * 2.4 - t * 0.75) * 0.5 + 0.5);
        vec3 mergedFluid = mix(terraStream, softWhite, whiteMerge * 0.85);

        // Fluid stream over pure white background
        color = mix(pureWhite, mergedFluid, fluid);
      }

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  // Helper to reliably check theme from documentElement
  function isThemeDark() {
    const theme = document.documentElement.getAttribute('data-theme') ||
                  document.body.getAttribute('data-theme');
    return theme !== 'light';
  }

  // Try WebGL first for full native hardware resolution (zero pixelation!)
  let gl = null;
  try {
    gl = canvas.getContext('webgl', { antialias: true, alpha: false, depth: false }) ||
         canvas.getContext('experimental-webgl', { antialias: true, alpha: false, depth: false });
  } catch (e) {
    gl = null;
  }

  if (gl) {
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.useProgram(program);

      const posBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
          -1, -1,
           1, -1,
          -1,  1,
          -1,  1,
           1, -1,
           1,  1
        ]),
        gl.STATIC_DRAW
      );

      const aPos = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      const uRes = gl.getUniformLocation(program, 'u_resolution');
      const uTime = gl.getUniformLocation(program, 'u_time');
      const uDark = gl.getUniformLocation(program, 'u_is_dark');

      const startTime = performance.now();

      function renderGL() {
        if (!isRunning) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.floor((canvas.clientWidth || 440) * dpr);
        const h = Math.floor((canvas.clientHeight || 440) * dpr);

        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          gl.viewport(0, 0, w, h);
        }

        const elapsed = (performance.now() - startTime) * 0.001;
        const isDark = isThemeDark() ? 1.0 : 0.0;

        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, elapsed);
        gl.uniform1f(uDark, isDark);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        animId = requestAnimationFrame(renderGL);
      }

      animId = requestAnimationFrame(renderGL);

      return {
        finish() {
          isRunning = false;
          clearInterval(progressTimer);
          if (animId) cancelAnimationFrame(animId);
          if (progressPill) progressPill.textContent = '100%';
          try {
            gl.deleteProgram(program);
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            gl.deleteBuffer(posBuffer);
          } catch (_) {}
        },
        updateProgress(pct) {
          progressPct = pct;
          if (progressPill) progressPill.textContent = `${pct}%`;
        }
      };
    }
  }

  // Smooth Canvas 2D Fallback if WebGL is unavailable
  const ctx = canvas.getContext('2d');
  const startTime2D = performance.now();

  function render2D() {
    if (!isRunning) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = (canvas.clientWidth || 440) * dpr;
    const h = (canvas.clientHeight || 440) * dpr;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const t = (performance.now() - startTime2D) * 0.001;
    const isDark = isThemeDark();

    // Pure white in light mode, pitch black #000000 in dark mode
    ctx.fillStyle = isDark ? '#000000' : '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Render smooth layered fluid plumes in #d97757
    const cx = w * 0.5 + Math.sin(t * 0.6) * (w * 0.15);
    const cy = h * 0.5 + Math.cos(t * 0.5) * (h * 0.15);
    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, w * 0.45);
    grad.addColorStop(0, '#d97757');
    grad.addColorStop(0.6, isDark ? 'rgba(217, 119, 87, 0.65)' : 'rgba(217, 119, 87, 0.45)');
    grad.addColorStop(1, isDark ? 'rgba(13, 12, 11, 0)' : 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.45, 0, Math.PI * 2);
    ctx.fill();

    animId = requestAnimationFrame(render2D);
  }

  animId = requestAnimationFrame(render2D);

  return {
    finish() {
      isRunning = false;
      clearInterval(progressTimer);
      if (animId) cancelAnimationFrame(animId);
      if (progressPill) progressPill.textContent = '100%';
    },
    updateProgress(pct) {
      progressPct = pct;
      if (progressPill) progressPill.textContent = `${pct}%`;
    }
  };
}

function createThinkingLoader(modality, promptText) {
  const container = document.createElement('div');
  let updateProgress = () => {};
  let finish = () => {};

  if (modality === 'image') {
    // 1. IMAGE LOADER: Authentic HTML5 Canvas Fluid Simulation (Navier-Stokes) with aspect ratio & progress pill
    const aspect = detectImageAspectRatio(promptText);
    container.className = 'image-gen-loader';
    container.style.width = aspect.maxWidth;

    container.innerHTML = `
      <div class="image-gen-header">
        <span class="image-gen-title">Creating image</span>
      </div>
      <div class="image-gen-viewport" style="aspect-ratio: ${aspect.ratio};">
        <canvas class="image-gen-canvas"></canvas>
        <div class="image-gen-progress-pill">12%</div>
      </div>
    `;

    const canvas = container.querySelector('.image-gen-canvas');
    const pill = container.querySelector('.image-gen-progress-pill');
    const sim = startCanvasFluidSimulation(canvas, pill);

    return {
      el: container,
      updateProgress(pct) {
        sim.updateProgress(pct);
      },
      finish() {
        sim.finish();
      },
    };

  } else if (modality === 'video') {
    // 2. VIDEO LOADER: Cinematic 16:9 Frame Scanline with Sprockets & HUD
    container.className = 'video-gen-loader';
    container.innerHTML = `
      <div class="media-gen-header">
        <div class="media-gen-title-wrap">
          <span style="color: #c084fc; display: flex;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="23 7 16 12 23 17 23 7"></polygon>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
          </span>
          <span class="media-gen-title">Generating video</span>
        </div>
        <span class="media-gen-subtitle" style="color: #c084fc;">Interpolating keyframes...</span>
      </div>
      <div class="cinematic-frame">
        <div class="film-perforations"></div>
        <div class="cinematic-canvas">
          <div class="video-scanline"></div>
          <span class="video-hud-res">720P • 24FPS</span>
          <div class="video-hud-rec">
            <span class="rec-dot"></span> REC
          </div>
          <svg class="video-vectors-svg" viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="vidWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#a855f7" stop-opacity="0.3"/>
                <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.9"/>
                <stop offset="100%" stop-color="#a855f7" stop-opacity="0.3"/>
              </linearGradient>
            </defs>
            <line x1="0" y1="60" x2="320" y2="60" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="4 4" />
            <path d="M 20 60 Q 60 20, 100 60 T 180 60 T 260 60 T 300 60" fill="none" stroke="url(#vidWaveGrad)" stroke-width="2">
              <animate attributeName="d" dur="2.5s" repeatCount="indefinite"
                values="M 20 60 Q 60 20, 100 60 T 180 60 T 260 60 T 300 60;
                        M 20 60 Q 60 90, 100 60 T 180 60 T 260 60 T 300 60;
                        M 20 60 Q 60 20, 100 60 T 180 60 T 260 60 T 300 60" />
            </path>
            <polygon points="100,55 105,60 100,65 95,60" fill="#38bdf8" />
            <polygon points="180,53 187,60 180,67 173,60" fill="#c084fc" />
            <polygon points="260,55 265,60 260,65 255,60" fill="#38bdf8" />
          </svg>
        </div>
        <div class="film-perforations"></div>
      </div>
      <div class="gen-progress-pill video-pill">
        <span class="gen-progress-num">0%</span>
      </div>
    `;

    const pillNum = container.querySelector('.gen-progress-num');
    let progress = 0;
    const startTime = Date.now();

    timerId = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed < 3) {
        progress = Math.min(35, Math.round((elapsed / 3) * 35));
      } else if (elapsed < 8) {
        progress = Math.min(78, 35 + Math.round(((elapsed - 3) / 5) * 43));
      } else {
        progress = Math.min(97, 78 + Math.round(((elapsed - 8) / 8) * 19));
      }
      pillNum.textContent = `${progress}%`;
    }, 140);

    updateProgress = (p) => {
      progress = Math.max(progress, p);
      pillNum.textContent = `${progress}%`;
    };

    finish = () => {
      clearInterval(timerId);
      pillNum.textContent = '100%';
    };

  } else {
    // 3. TEXT / REASONING LOADER: Neural Orbital Spinner & Live Timer
    container.className = 'text-thinking-loader';
    const isDeepReasoning = /(deepseek-r1|reasoner|o1|o3|think)/i.test(state.selectedModel);

    container.innerHTML = `
      <div class="neural-orbital-spinner">
        <div class="orbital-ring orbital-ring-outer"></div>
        <div class="orbital-ring orbital-ring-inner"></div>
      </div>
      <div class="thinking-text-container">
        <span class="thinking-main-label">${isDeepReasoning ? 'Reasoning deeply' : 'Thinking'}</span>
        <span class="thinking-timer-pill">(0.0s)</span>
        <span class="thinking-wave-bars">
          <span class="thinking-wave-bar"></span>
          <span class="thinking-wave-bar"></span>
          <span class="thinking-wave-bar"></span>
          <span class="thinking-wave-bar"></span>
        </span>
      </div>
    `;

    const timerPill = container.querySelector('.thinking-timer-pill');
    const startTime = Date.now();

    timerId = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      timerPill.textContent = `(${elapsed}s)`;
    }, 100);

    finish = () => {
      clearInterval(timerId);
    };
  }

  return { el: container, updateProgress, finish, timerId };
}

function convertGenUiToArtifact(text) {
  if (!text || typeof text !== 'string' || !text.includes('※genui※')) {
    return text;
  }
  return text.replace(/※genui※(\{[\s\S]*?)(?:※|$)/g, (match, rawJson) => {
    let data = null;
    for (const suffix of ['', '}}', '"}}', '"]}}']) {
      try {
        data = JSON.parse(rawJson.trim() + suffix);
        break;
      } catch (e) { }
    }

    let title = 'Interactive Application';
    let content = '';

    if (data) {
      const block = data.app_block || data;
      title = block.title || title;
      content = block.content || '';
    } else {
      const titleMatch = rawJson.match(/"title"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
      if (titleMatch) title = titleMatch[1].replace(/\\"/g, '"');
      const contentMatch = rawJson.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)/);
      if (contentMatch) {
        let rawC = contentMatch[1];
        try {
          content = JSON.parse('"' + rawC + (rawC.endsWith('"') ? '' : '"'));
        } catch (_) {
          content = rawC.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
      } else {
        return match;
      }
    }

    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'genui-app';
    let type = 'text/html';
    if (/export\s+default|import\s+React|from\s+["']react["']/.test(content)) {
      type = 'application/vnd.ant.react';
    }

    return `\n\n<antArtifact identifier="${id}" type="${type}" title="${title}">\n${content}\n</antArtifact>\n`;
  });
}

function renderMarkdown(text) {
  if (!text) return '';
  text = convertGenUiToArtifact(text);

  // 0. Remove thinking trace tags from the visible chat bubble
  let processed = text.replace(/<antThinking>[\s\S]*?<\/antThinking>/gi, '');
  processed = processed.replace(/<antThinking>[\s\S]*$/gi, '');

  // 0.05 Strip internal search citations and OpenAI private PUA markers
  processed = processed.replace(/[※\u203B][^\s]*/g, '');
  processed = processed.replace(/\bcite[a-zA-Z0-9_]*turn[a-zA-Z0-9_]*\b/gi, '');
  processed = processed.replace(/\bturn\d+[a-zA-Z0-9_]*\b/gi, '');
  processed = processed.replace(/[\uE200-\uE20F]message_reaction[\uE200-\uE20F][^\uE200-\uE20F]*[\uE200-\uE20F]/g, '');
  processed = processed.replace(/[\uE200-\uE20F]/g, '');

  // 0.1 Extract Artifacts and replace with clean interactive pill placeholders
  const artifactPills = [];
  // Match closed artifacts
  processed = processed.replace(/<antArtifact\s+([^>]+)>([\s\S]*?)<\/antArtifact>/gi, (match, rawAttrs, code) => {
    const attrs = parseXmlAttributes(rawAttrs);
    const id = attrs.identifier || 'artifact';
    const type = attrs.type || 'application/vnd.ant.code';
    const title = attrs.title || id;
    const cleanContent = stripArtifactCodeFences(code);

    if (!state.artifacts[id]) {
      state.artifacts[id] = {
        identifier: id,
        type: type,
        title: title,
        language: attrs.language || '',
        currentVersion: 1,
        versions: [{ version: 1, content: cleanContent, timestamp: Date.now() }],
        isStreaming: false,
      };
    } else {
      const art = state.artifacts[id];
      art.type = type;
      art.title = title;
      art.language = attrs.language || art.language || '';
      art.isStreaming = false;
      const curVer = art.currentVersion || 1;
      if (art.versions && art.versions[curVer - 1]) {
        art.versions[curVer - 1].content = cleanContent;
      }
    }

    const placeholder = `@@ARTIFACT_PILL_${artifactPills.length}@@`;
    artifactPills.push({ id, title, type, isStreaming: false });
    return placeholder;
  });

  // Match in-flight (unclosed) streaming artifact
  processed = processed.replace(/<antArtifact\s+([^>]+)>([\s\S]*)$/gi, (match, rawAttrs, partialCode) => {
    const attrs = parseXmlAttributes(rawAttrs);
    const id = attrs.identifier || 'artifact';
    const type = attrs.type || 'application/vnd.ant.code';
    const title = attrs.title || id;
    const cleanPartial = stripArtifactCodeFences(partialCode);

    if (!state.artifacts[id]) {
      state.artifacts[id] = {
        identifier: id,
        type: type,
        title: title,
        language: attrs.language || '',
        currentVersion: 1,
        versions: [{ version: 1, content: cleanPartial, timestamp: Date.now() }],
        isStreaming: true,
      };
    } else {
      const art = state.artifacts[id];
      const curVer = art.currentVersion || 1;
      if (art.versions && art.versions[curVer - 1]) {
        art.versions[curVer - 1].content = cleanPartial;
      }
      art.isStreaming = true;
    }

    const placeholder = `@@ARTIFACT_PILL_${artifactPills.length}@@`;
    artifactPills.push({ id, title, type, isStreaming: true });
    return placeholder;
  });

  // 1. Extract and safeguard code blocks
  const codeBlocks = [];
  processed = processed.replace(/```([a-zA-Z0-9_\-\+]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `@@CODE_BLOCK_${codeBlocks.length}@@`;
    codeBlocks.push({ lang: (lang || 'code').toLowerCase(), code });
    return placeholder;
  });

  // 2. Extract and safeguard inline code
  const inlineCodes = [];
  processed = processed.replace(/`([^`\n]+)`/g, (match, code) => {
    const placeholder = `@@INLINE_CODE_${inlineCodes.length}@@`;
    inlineCodes.push(code);
    return placeholder;
  });

  // 3. Escape HTML entities
  processed = escapeHtml(processed);

  // 4. Markdown Tables
  processed = processed.replace(/((?:\|[^\n]+\|\r?\n)+)/g, (match) => {
    const lines = match.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2 && lines[1].includes('---')) {
      const parseRow = (rowStr, tag = 'td') => {
        const cells = rowStr.split('|').slice(1, -1);
        return '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
      };
      const headerHtml = '<thead>' + parseRow(lines[0], 'th') + '</thead>';
      const bodyLines = lines.slice(2);
      const bodyHtml = '<tbody>' + bodyLines.map(r => parseRow(r, 'td')).join('') + '</tbody>';
      return `<div class="chat-table-wrapper"><table class="chat-md-table">${headerHtml}${bodyHtml}</table></div>`;
    }
    return match;
  });

  // 5. Horizontal rules
  processed = processed.replace(/^(?:---|\*\*\*|___)\s*$/gm, '<hr class="chat-md-hr"/>');

  // 6. Headings
  processed = processed.replace(/^######\s+(.+)$/gm, '<h6 class="chat-md-h6">$1</h6>');
  processed = processed.replace(/^#####\s+(.+)$/gm, '<h5 class="chat-md-h5">$1</h5>');
  processed = processed.replace(/^####\s+(.+)$/gm, '<h4 class="chat-md-h4">$1</h4>');
  processed = processed.replace(/^###\s+(.+)$/gm, '<h3 class="chat-md-h3">$1</h3>');
  processed = processed.replace(/^##\s+(.+)$/gm, '<h2 class="chat-md-h2">$1</h2>');
  processed = processed.replace(/^#\s+(.+)$/gm, '<h1 class="chat-md-h1">$1</h1>');

  // 7. Blockquotes
  processed = processed.replace(/^>\s*(.+)$/gm, '<blockquote class="chat-md-blockquote">$1</blockquote>');

  // 8. Markdown Links [label](url)
  processed = processed.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)\"\'<>]+)\)/g, (match, title, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="chat-md-link">${title} <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="link-ext-icon"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>`;
  });

  // 9. Autolink standalone raw URLs
  processed = processed.replace(/(^|[\s(])(https?:\/\/[^\s\)\"\'<>]+)(?=$|[\s)])/g, (match, prefix, url) => {
    return `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer" class="chat-md-link">${url} <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="link-ext-icon"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>`;
  });

  // 10. Bold & Italic
  processed = processed.replace(/\*\*\*([^\*\n]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  processed = processed.replace(/___([^_\n]+)___/g, '<strong><em>$1</em></strong>');
  processed = processed.replace(/\*\*([^\*\n]+)\*\*/g, '<strong>$1</strong>');
  processed = processed.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
  processed = processed.replace(/(^|[^\w])\*([^\*\n]+)\*([^\w]|$)/g, '$1<em>$2</em>$3');
  processed = processed.replace(/(^|[^\w])_([^_\n]+)_([^\w]|$)/g, '$1<em>$2</em>$3');

  // 11. Strikethrough
  processed = processed.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');

  // 12. Lists
  processed = processed.replace(/((?:^(?:[\*\-•]|\d+\.)\s+[^\n]+(?:\n|$))+)/gm, (match) => {
    const isOrdered = /^\d+\./.test(match.trim());
    const items = match.trim().split('\n').map(l => {
      const clean = l.replace(/^(?:[\*\-•]|\d+\.)\s+/, '');
      return `<li>${clean}</li>`;
    }).join('');
    const tag = isOrdered ? 'ol' : 'ul';
    return `<${tag} class="chat-md-list">${items}</${tag}>`;
  });

  // 13. Paragraph breaks & Linebreaks
  processed = processed.replace(/\n\n+/g, '<div class="chat-md-spacer"></div>');
  processed = processed.replace(/\n/g, '<br/>');

  // 14. Restore Inline Codes
  processed = processed.replace(/@@INLINE_CODE_(\d+)@@/g, (match, idx) => {
    const code = inlineCodes[Number(idx)] || '';
    return `<code class="chat-md-inline-code">${escapeHtml(code)}</code>`;
  });

  // 15. Restore Code Blocks
  processed = processed.replace(/@@CODE_BLOCK_(\d+)@@/g, (match, idx) => {
    const item = codeBlocks[Number(idx)];
    if (!item) return '';
    const cleanLang = escapeHtml(item.lang || 'text');
    const cleanCode = escapeHtml(item.code.trim());
    let rawB64 = '';
    try {
      rawB64 = btoa(unescape(encodeURIComponent(item.code.trim())));
    } catch (e) {
      rawB64 = btoa(item.code.trim().substring(0, 500));
    }
    return `
      <div class="chat-code-card">
        <div class="chat-code-header">
          <span class="chat-code-lang">${cleanLang}</span>
          <button class="chat-code-copy-btn" data-code-b64="${rawB64}" title="Copy code">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy</span>
          </button>
        </div>
        <pre class="chat-code-pre"><code>${cleanCode}</code></pre>
      </div>
    `;
  });

  // 16. Restore Artifact Pills
  processed = processed.replace(/@@ARTIFACT_PILL_(\d+)@@/g, (match, idx) => {
    const item = artifactPills[Number(idx)];
    if (!item) return '';
    return renderArtifactChatPillHtml(item.id, item.title, item.type, item.isStreaming);
  });

  return processed;
}

function formatMarkdownSimple(text) {
  return renderMarkdown(text);
}

function parseAndRenderMediaContent(assistantMsgEl, bubbleEl, rawContent, reasoningText, promptText, modality) {
  bubbleEl.classList.remove('playground-loader-bubble');
  bubbleEl.innerHTML = '';

  let content = rawContent || '';

  // Preserve artifacts before any raw base64 or media cleaning
  const preservedArtifacts = [];
  content = content.replace(/<antArtifact\s+[^>]+>[\s\S]*?<\/antArtifact>/gi, (match) => {
    const ph = `@@ARTIFACT_RAW_PRESERVE_${preservedArtifacts.length}@@`;
    preservedArtifacts.push(match);
    return ph;
  });

  const extractedImages = [];
  const extractedVideos = [];

  // 0. Extract markdown videos !?[alt](url.mp4) or data:video/
  content = content.replace(/!?\[(.*?)\]\(((?:https?:\/\/|\/|data:video\/)[^\)]+\.(?:mp4|webm|mov|m3u8)[^\)]*|data:video\/[^\)]+)\)/gi, (match, title, url) => {
    extractedVideos.push({ src: url.trim(), title: title || 'Generated Video' });
    return '';
  });

  // 1. Extract markdown images ![alt](url)
  content = content.replace(/!\[(.*?)\]\((data:image\/[^\)]+|https?:\/\/[^\)]+|\/[^\)]+)\)/gi, (match, alt, url) => {
    extractedImages.push({ src: url.trim(), alt: alt || 'Generated Image' });
    return '';
  });

  // 2. Extract HTML images <img src="...">
  content = content.replace(/<img[^>]+src=["'](data:image\/[^"']+|https?:\/\/[^"']+|\/[^"']+)["'][^>]*>/gi, (match, url) => {
    extractedImages.push({ src: url.trim(), alt: 'Generated Image' });
    return '';
  });

  // 3. Extract standalone base64 data URLs: data:image/...;base64,...
  content = content.replace(/data:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+/gi, (match) => {
    extractedImages.push({ src: match.trim(), alt: 'Generated Image' });
    return '';
  });

  // 4. Extract raw base64 image chunks (> 160 base64 chars without spaces)
  content = content.replace(/```(?:base64|img|image)?\s*([A-Za-z0-9+/=\s]{160,})\s*```/gi, (match, b64) => {
    const cleanB64 = b64.replace(/\s+/g, '');
    const prefix = cleanB64.startsWith('/9j/') ? 'data:image/jpeg;base64,' :
      cleanB64.startsWith('UklGR') ? 'data:image/webp;base64,' :
        cleanB64.startsWith('PHN2Zy') ? 'data:image/svg+xml;base64,' :
          'data:image/png;base64,';
    extractedImages.push({ src: prefix + cleanB64, alt: 'Generated Image' });
    return '';
  });

  // 4b. Extract unadorned bare base64 chunks (120+ chars) if not yet caught
  content = content.replace(/(?:^|\s)([A-Za-z0-9+/=]{120,})(?:\s|$)/g, (match, b64) => {
    const cleanB64 = b64.trim();
    const prefix = cleanB64.startsWith('/9j/') ? 'data:image/jpeg;base64,' :
      cleanB64.startsWith('UklGR') ? 'data:image/webp;base64,' :
        cleanB64.startsWith('PHN2Zy') ? 'data:image/svg+xml;base64,' :
          cleanB64.startsWith('iVBORw0KGgo') ? 'data:image/png;base64,' : '';
    if (prefix) {
      extractedImages.push({ src: prefix + cleanB64, alt: 'Generated Image' });
    }
    return '';
  });

  // 5. Extract markdown videos [video](url) or video URLs (.mp4, .webm, .mov)
  content = content.replace(/\[(.*?)\]\(((?:https?:\/\/|\/)[^\)]+\.(?:mp4|webm|mov|m3u8)[^\)]*)\)/gi, (match, title, url) => {
    extractedVideos.push({ src: url.trim(), title: title || 'Generated Video' });
    return '';
  });

  content = content.replace(/(?:https?:\/\/[^\s"'<>]|\/static\/[^\s"'<>])+\.(?:mp4|webm|mov|m3u8)(?:\?[^\s"'<>]*)?/gi, (match) => {
    extractedVideos.push({ src: match.trim(), title: 'Generated Video' });
    return '';
  });

  content = content.replace(/data:video\/(?:mp4|webm);base64,[A-Za-z0-9+/=]+/gi, (match) => {
    extractedVideos.push({ src: match.trim(), title: 'Generated Video' });
    return '';
  });

  // 6. Absolute safety cleanup: strip any orphaned markdown brackets and leftover long base64 blocks
  content = content.replace(/!\[.*?\]\(\s*\)/g, '');
  content = content.replace(/[A-Za-z0-9+/=]{90,}/g, '');

  // Restore preserved raw artifacts
  content = content.replace(/@@ARTIFACT_RAW_PRESERVE_(\d+)@@/g, (m, idx) => {
    return preservedArtifacts[Number(idx)] || '';
  });

  const cleanText = content.trim();

  // If there is accompanying commentary text, render it cleanly
  if (cleanText) {
    const textNode = document.createElement('div');
    textNode.className = 'chat-md-content';
    textNode.innerHTML = renderMarkdown(cleanText);
    bubbleEl.appendChild(textNode);
  } else if (!extractedImages.length && !extractedVideos.length) {
    if (reasoningText && reasoningText.trim()) {
      const textNode = document.createElement('div');
      textNode.className = 'chat-md-content';
      textNode.style.color = 'var(--text-secondary)';
      textNode.style.fontStyle = 'italic';
      textNode.textContent = 'Thinking process complete.';
      bubbleEl.appendChild(textNode);
    } else {
      const textNode = document.createElement('div');
      textNode.className = 'chat-md-content';
      textNode.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">No text response generated.</span>';
      bubbleEl.appendChild(textNode);
    }
  }

  // Render Interactive ChatGPT-Style Image Cards
  extractedImages.forEach((img, idx) => {
    const aspect = detectImageAspectRatio(promptText);
    const card = document.createElement('div');
    card.className = 'gpt-rendered-image-card';
    card.style.aspectRatio = aspect.ratio;
    card.style.width = aspect.maxWidth;
    const filename = `singularity-${state.selectedModel || 'image'}-${Date.now()}-${idx + 1}.png`;

    card.innerHTML = `
      <div class="gpt-image-viewport" style="aspect-ratio: ${aspect.ratio}; width: 100%; height: 100%;">
        <img src="${escapeHtml(safeMediaUrl(img.src))}" alt="${escapeHtml(img.alt || promptText || 'Generated Image')}" class="gpt-image-element gpt-image-fadein" loading="eager" />
        <div class="gpt-image-glass-toolbar">
          <button class="gpt-glass-action-btn btn-copy" data-tooltip="Copy" aria-label="Copy image">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="gpt-glass-action-btn btn-download" data-tooltip="Download" aria-label="Download image">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
        </div>
      </div>
    `;

    const imgEl = card.querySelector('.gpt-image-element');
    const viewportEl = card.querySelector('.gpt-image-viewport');

    imgEl.addEventListener('load', () => {
      imgEl.classList.add('gpt-image-loaded');
      if (aspect.isDefault && imgEl.naturalWidth && imgEl.naturalHeight) {
        const natRatio = `${imgEl.naturalWidth} / ${imgEl.naturalHeight}`;
        viewportEl.style.aspectRatio = natRatio;
        card.style.aspectRatio = natRatio;
      }
    });

    viewportEl.addEventListener('click', (e) => {
      if (e.target.closest('.gpt-glass-action-btn')) return;
      openMediaLightbox(img.src, 'image', promptText || img.alt);
    });

    const copyBtn = card.querySelector('.btn-copy');
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await copyMediaToClipboard(img.src);
      copyBtn.setAttribute('data-tooltip', 'Copied!');
      copyBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #10b981;">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      const tip = document.getElementById('singularity-tooltip');
      if (tip && tip.classList.contains('visible')) {
        tip.textContent = 'Copied!';
      }
      setTimeout(() => {
        copyBtn.setAttribute('data-tooltip', 'Copy');
        copyBtn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        `;
      }, 2000);
    });

    const downloadBtn = card.querySelector('.btn-download');
    downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      downloadMediaFile(img.src, filename);
    });

    bubbleEl.appendChild(card);
  });

  // Render Interactive ChatGPT-Style Video Cards
  extractedVideos.forEach((vid, idx) => {
    const card = document.createElement('div');
    card.className = 'gpt-rendered-video-card';
    const filename = `singularity-${state.selectedModel || 'video'}-${Date.now()}-${idx + 1}.mp4`;

    card.innerHTML = `
      <div class="gpt-video-viewport" style="aspect-ratio: 16/9; width: 100%; max-width: 680px;">
        <video controls autoplay muted loop playsinline preload="auto" class="gpt-video-element" src="${escapeHtml(safeMediaUrl(vid.src))}"></video>
        <div class="gpt-image-glass-toolbar">
          <button class="gpt-glass-action-btn btn-copy" data-tooltip="Copy Link" aria-label="Copy video link">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="gpt-glass-action-btn btn-download" data-tooltip="Download" aria-label="Download video">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
        </div>
      </div>
    `;

    const videoEl = card.querySelector('video');
    const viewportEl = card.querySelector('.gpt-video-viewport');

    videoEl.addEventListener('loadedmetadata', () => {
      if (videoEl.videoWidth && videoEl.videoHeight) {
        const natRatio = `${videoEl.videoWidth} / ${videoEl.videoHeight}`;
        viewportEl.style.aspectRatio = natRatio;
        card.style.aspectRatio = natRatio;
      }
    });

    const copyBtn = card.querySelector('.btn-copy');
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(vid.src);
        copyBtn.setAttribute('data-tooltip', 'Copied!');
        copyBtn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #10b981;">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;
        const tip = document.getElementById('singularity-tooltip');
        if (tip && tip.classList.contains('visible')) {
          tip.textContent = 'Copied!';
        }
        setTimeout(() => {
          copyBtn.setAttribute('data-tooltip', 'Copy Link');
          copyBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          `;
        }, 2000);
      } catch (err) { }
    });

    const downloadBtn = card.querySelector('.btn-download');
    downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      downloadMediaFile(vid.src, filename);
    });

    bubbleEl.appendChild(card);
  });

  if (!extractedImages.length && !extractedVideos.length && !cleanText) {
    bubbleEl.textContent = '(Model completed response without text output)';
  }
}

// ===================================================================
// Model Parameter Overrides & Global Thinking Budget Enforcement
// ===================================================================

function updateThinkingBudgetDisplay(tokens) {
  const valEl = document.getElementById('thinking-budget-val');
  const t = parseInt(tokens, 10) || 0;
  if (valEl) {
    valEl.textContent = t > 0 ? `${t.toLocaleString()} tokens` : 'Off (0)';
  }
  const btns = document.querySelectorAll('#thinking-preset-btns .preset-btn');
  btns.forEach(b => {
    const btnTok = parseInt(b.dataset.tokens, 10);
    b.classList.toggle('active', btnTok === t);
  });
}

function applyModelSettingsToUI(cfg, model) {
  const activeModelLabel = document.getElementById('param-active-model-name');
  if (activeModelLabel) activeModelLabel.textContent = model || state.selectedModel || 'gpt-5.6-sol';

  const thinkingRange = document.getElementById('thinking-budget-range');
  const maxTokensRange = document.getElementById('max-tokens-range');
  const maxTokensVal = document.getElementById('max-tokens-val');
  const tempRange = document.getElementById('temp-range');
  const tempVal = document.getElementById('temp-val');
  const promptInput = document.getElementById('system-prompt-input');

  const budget = (cfg && cfg.thinking_budget !== undefined) ? cfg.thinking_budget : 0;
  if (thinkingRange) thinkingRange.value = budget;
  updateThinkingBudgetDisplay(budget);

  const maxTokens = (cfg && cfg.max_tokens !== undefined) ? cfg.max_tokens : 4096;
  if (maxTokensRange) maxTokensRange.value = maxTokens;
  if (maxTokensVal) maxTokensVal.textContent = `${Number(maxTokens).toLocaleString()} tokens`;

  const maxBtns = document.querySelectorAll('#max-tokens-preset-btns .preset-btn');
  maxBtns.forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.tokens, 10) === maxTokens);
  });

  if (cfg && cfg.temperature !== undefined && tempRange) {
    tempRange.value = cfg.temperature;
    if (tempVal) tempVal.textContent = Number(cfg.temperature).toFixed(2);
  }
  if (cfg && cfg.system_prompt !== undefined && promptInput) {
    promptInput.value = cfg.system_prompt;
  }
}

async function loadModelSettings(model) {
  const targetModel = model || state.selectedModel || 'gpt-5.6-sol';
  const activeModelLabel = document.getElementById('param-active-model-name');
  if (activeModelLabel) activeModelLabel.textContent = targetModel;

  try {
    const res = await fetch(`/api/model-settings?model=${encodeURIComponent(targetModel)}`);
    if (res.ok) {
      const data = await res.json();
      applyModelSettingsToUI(data.settings || {}, targetModel);
    }
  } catch (e) {
    console.warn('Failed to load model settings:', e);
  }
}

let _saveSettingsDebounceTimer = null;
async function saveCurrentModelSettings(showNotice = true, applyGlobally = false) {
  const model = state.selectedModel || 'gpt-5.6-sol';
  const thinkingRange = document.getElementById('thinking-budget-range');
  const maxTokensRange = document.getElementById('max-tokens-range');
  const tempRange = document.getElementById('temp-range');
  const promptInput = document.getElementById('system-prompt-input');
  const statusEl = document.getElementById('model-settings-status');

  const payload = {
    model: model,
    apply_globally: applyGlobally,
    thinking_budget: parseInt(thinkingRange?.value || 0, 10),
    max_tokens: parseInt(maxTokensRange?.value || 4096, 10),
    temperature: parseFloat(tempRange?.value || 0.7),
    system_prompt: promptInput?.value.trim() || '',
  };

  try {
    const res = await fetch('/api/model-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      const msg = data.message || 'Settings saved successfully';
      if (statusEl) {
        statusEl.textContent = msg;
        clearTimeout(_saveSettingsDebounceTimer);
        _saveSettingsDebounceTimer = setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 4000);
      }
      if (showNotice) {
        showToast(msg, 'success');
      }
    }
  } catch (e) {
    if (showNotice) showToast(`Failed to save settings: ${e.message}`, 'error');
  }
}

async function resetCurrentModelSettings() {
  const model = state.selectedModel || 'gpt-5.6-sol';
  try {
    await fetch(`/api/model-settings?model=${encodeURIComponent(model)}`, { method: 'DELETE' });
    applyModelSettingsToUI({ thinking_budget: 0, max_tokens: 4096, temperature: 0.7, system_prompt: '' }, model);
    showToast(`Reset settings for '${model}' to factory defaults.`, 'info');
  } catch (e) {
    showToast(`Failed to reset: ${e.message}`, 'error');
  }
}

function getHeroGreetingText() {
  const hour = new Date().getHours();
  const rawName = (localStorage.getItem('singularity_user_name') || 'Operator').trim();
  const name = rawName || 'Operator';
  if (hour >= 5 && hour < 12) return `Good morning, ${name}`;
  if (hour >= 12 && hour < 17) return `Good afternoon, ${name}`;
  if (hour >= 17 && hour < 22) return `Good evening, ${name}`;
  return `Good night, ${name}`;
}

const HERO_DIALOGUES = [
  // --- JJK & Shonen Anime ---
  "Nah, I'd win",
  "Stand proud, you're strong",
  "Throughout Heaven and Earth, I alone am the honored one",
  "With this treasure I summon...",
  "Domain Expansion: Infinite Yap",
  "Domain Expansion: Malevolent Kitchen",
  "You are my specialz",

  // --- Anime Classics & Romcoms ---
  "Aura, kill yourself",
  "Himmel the Hero would've fixed this bug",
  "Frieren sleeping through 80 years of updates",
  "Get in the fucking robot, Shinji",
  "Shinji, crank that Soulja Boy",
  "I will take a potato chip... AND EAT IT!",
  "All according to keikaku (keikaku means plan)",
  "El Psy Kongroo",
  "Steins;Gate was a documentary",
  "I reject my humanity, JoJo!",
  "KONO DIO DA!",
  "Is that a motherfucking JoJo reference?!",
  "Zasshu (Mongrel)",
  "Yorokobe Shounen",
  "I yearn for true gender equality",
  "EXPLOSION! 💥",
  "Watch Konosuba, Trust.",
  "Giga Drill Break!",
  "Row row fight the power!",
  "Bocchi just like me fr fr",
  "Griffith did nothing wrong (cap, fuck that guy)",
  "Omae wa mou shindeiru",
  "Ara ara, what do we have here?",
  "Tomboys for the win!",
  "Ore wa Ochinchin ga Daisuki Nandayo",

  // --- Gaming & Soulsborne ---
  "Hey you, you're finally awake",
  "I used to be an adventurer like you...",
  "Praise the Sun! \\[T]/",
  "Git gud, scrub",
  "You died. Again.",
  "Put these foolish ambitions to rest",
  "I am Malenia, Blade of Miquella",
  "Maidenless behavior detected",
  "Touch grace immediately",
  "Kept you waiting, huh?",
  "Nanomachines, son!",
  "Making the mother of all omelettes here, Jack",
  "Memes, the DNA of the soul",
  "The cake is a lie",
  "Protocol 3: Protect the Pilot",
  "Ah shit, here we go again",
  "All you had to do was follow the damn train, CJ!",
  "Would you kindly?",
  "War. War never changes.",
  "Snake? Snake?! SNAAAAKE!",
  "Rush B, don't stop cyka",
  "Report jg diff, ff at 15",
  "Mid or feed, uninstall trash",
  "Wake the fuck up Samurai, we have a city to burn",
  "A corpse should be left well alone",
  "Cheeki Breeki I v Damke",
  "Clutch or kick",

  // --- TV Shows & Pop Culture ---
  "Say my name. (Heisenberg)",
  "Waltuh, put your dick away Waltuh",
  "Jesse, we need to cook",
  "Better Call Saul!",
  "I am the one who knocks!",
  "Lisan al-Gaib! As written!",
  "May thy knife chip and shatter",
  "Winter is coming",
  "Shut up and take my money!",
  "Good news, everyone!",

  // --- Internet & Dev Brainrot ---
  "Am I cooking, Chat?",
  "Let him cook, I said LET HIM COOK",
  "Who let bro cook in production?",
  "Bro think he the main character",
  "Bro is definitely not him",
  "L + Ratio + Maidenless + Skill Issue",
  "Touch grass? In this economy?",
  "Certified yapper in the building",
  "Works on my machine, ship it",
  "Submitting PR and fleeing the country",
  "Sir, a second PR has hit production",
  "Zero bitches? Fascinating.",
  "Bait used to be believable",
  "Absolute cinema ✋😔🤚",
  "We ball regardless",
  "Trust the process (I have no plan)",
  "The voices told me to refactor",
  "Terminal open, brain disconnected"
];

let lastGreetingIndex = -1;
function updateHeroGreeting(forceNew = true) {
  const greetingEl = document.getElementById('claude-hero-greeting');
  if (!greetingEl) return;
  const list = HERO_DIALOGUES;
  let idx = Math.floor(Math.random() * list.length);
  if (forceNew && list.length > 1 && idx === lastGreetingIndex) {
    idx = (idx + 1) % list.length;
  }
  lastGreetingIndex = idx;
  const text = list[idx];

  greetingEl.className = 'claude-hero-greeting';
  greetingEl.style.opacity = '0';
  greetingEl.style.transform = 'translateY(4px)';
  setTimeout(() => {
    greetingEl.textContent = text;
    greetingEl.style.opacity = '1';
    greetingEl.style.transform = 'translateY(0)';
  }, 160);
}

// ===================================================================
// Universal Artifacts Workbench Engine (Claude-Style Multi-Model System)
// ===================================================================

function parseXmlAttributes(rawAttrs) {
  const attrs = {};
  if (!rawAttrs) return attrs;
  const attrRegex = /([a-zA-Z0-9_\-]+)=["']([^"']*)["']/g;
  let m;
  while ((m = attrRegex.exec(rawAttrs)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

function stripArtifactCodeFences(code) {
  if (!code) return '';
  let str = String(code).trim();
  // Strip leading code fence e.g. ```jsx, ```html, ```css, etc.
  str = str.replace(/^\s*```[a-zA-Z0-9_\-\+]*\s*(\r?\n)?/i, '');
  // Strip trailing code fence e.g. ```
  str = str.replace(/(\r?\n)?```\s*$/i, '');
  return str.replace(/^\r?\n+/, '').replace(/\r?\n+$/, '');
}

function getArtifactIconSvg(type) {
  if (type === 'application/vnd.ant.react') {
    return `<img src="/static/icons/react-js-icon.svg" class="artifact-icon-img artifact-icon-react" alt="React" width="22" height="22" />`;
  } else if (type === 'text/html') {
    return `<img src="/static/icons/html-icon.svg" class="artifact-icon-img artifact-icon-html" alt="HTML" width="20" height="20" />`;
  } else if (type === 'image/svg+xml') {
    return `<img src="/static/icons/svg-icon.svg" class="artifact-icon-img artifact-icon-svg" alt="SVG" width="20" height="20" />`;
  } else if (type === 'text/markdown') {
    return `<img src="/static/icons/markdown-icon.svg" class="artifact-icon-img artifact-icon-md" alt="Markdown" width="20" height="20" />`;
  } else if (type === 'application/vnd.ant.mermaid') {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="artifact-icon-img artifact-icon-diagram"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="8.5" y="14" width="7" height="7" rx="1"></rect><path d="M6.5 10v2a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2"></path><path d="M12 14v-2"></path></svg>`;
  }
  return `<img src="/static/icons/code-icon.svg" class="artifact-icon-img artifact-icon-code" alt="Code" width="20" height="20" />`;
}

function getArtifactShortTypeLabel(type, language) {
  if (type === 'application/vnd.ant.react') return 'React';
  if (type === 'text/html') return 'HTML';
  if (type === 'image/svg+xml') return 'SVG';
  if (type === 'application/vnd.ant.mermaid') return 'Mermaid';
  if (type === 'text/markdown') return 'Markdown';
  return (language || 'Code').toUpperCase();
}

function updateArtifactDownloadLabel(type, language) {
  const labelEl = document.getElementById('artifact-download-label');
  if (!labelEl) return;
  if (type === 'text/html') labelEl.textContent = 'Download as HTML';
  else if (type === 'application/vnd.ant.react') labelEl.textContent = 'Download as TSX';
  else if (type === 'image/svg+xml') labelEl.textContent = 'Download as SVG';
  else if (type === 'text/markdown') labelEl.textContent = 'Download as Markdown';
  else if (type === 'application/vnd.ant.mermaid') labelEl.textContent = 'Download as Mermaid';
  else {
    const ext = (language || 'txt').toUpperCase();
    labelEl.textContent = `Download as ${ext}`;
  }
}

function getArtifactTypeLabel(type) {
  if (type === 'application/vnd.ant.react') return 'React Component';
  if (type === 'text/html') return 'HTML Web App';
  if (type === 'image/svg+xml') return 'Vector Art (SVG)';
  if (type === 'application/vnd.ant.mermaid') return 'Mermaid Diagram';
  if (type === 'text/markdown') return 'Markdown Document';
  return 'Source Code';
}

function getArtifactFileExtension(type, language) {
  if (type === 'application/vnd.ant.react') return '.tsx';
  if (type === 'text/html') return '.html';
  if (type === 'image/svg+xml') return '.svg';
  if (type === 'application/vnd.ant.mermaid') return '.mmd';
  if (type === 'text/markdown') return '.md';
  const langMap = { python: '.py', javascript: '.js', typescript: '.ts', html: '.html', css: '.css', json: '.json', rust: '.rs', go: '.go', c: '.c', cpp: '.cpp', bash: '.sh', sql: '.sql' };
  return langMap[(language || '').toLowerCase()] || '.txt';
}

function renderArtifactChatPillHtml(id, title, type, isStreaming) {
  const icon = getArtifactIconSvg(type);
  const label = getArtifactTypeLabel(type);
  const activeClass = (state.activeArtifactId === id && state.artifactWorkbenchOpen) ? 'active' : '';
  const streamingDot = isStreaming ? '<span class="artifact-pill-streaming-dot"></span> Generating ' : '';
  return `
    <div class="artifact-chat-pill ${activeClass}" data-artifact-id="${escapeHtml(id)}" onclick="openArtifact('${escapeHtml(id)}')">
      <div class="artifact-pill-icon">${icon}</div>
      <div class="artifact-pill-info">
        <div class="artifact-pill-title">${escapeHtml(title || id)}</div>
        <div class="artifact-pill-subtitle">${streamingDot}${label}</div>
      </div>
      <div class="artifact-pill-action">
        <span>${isStreaming ? 'View' : 'Open'}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </div>
    </div>
  `;
}

function openArtifact(identifier, versionNum = null) {
  const art = state.artifacts[identifier];
  if (!art) return;

  state.activeArtifactId = identifier;
  state.artifactWorkbenchOpen = true;

  const workspace = document.getElementById('playground-workspace');
  if (workspace) {
    workspace.classList.add('artifact-open');
  }
  const resizer = document.getElementById('artifact-resizer');
  const wb = document.getElementById('artifact-workbench');
  if (resizer) resizer.style.display = 'flex';
  if (wb) wb.style.display = 'flex';

  const ver = versionNum || art.currentVersion || 1;
  art.currentVersion = ver;

  // Update Header UI
  const titleEl = document.getElementById('artifact-title');
  if (titleEl) {
    titleEl.textContent = art.title || art.identifier;
    titleEl.title = art.title || art.identifier;
  }

  const badgeEl = document.getElementById('artifact-type-badge');
  if (badgeEl) badgeEl.textContent = getArtifactShortTypeLabel(art.type, art.language);

  updateArtifactDownloadLabel(art.type, art.language);
  updateVersionStepper(art);

  // Set default view: React/HTML/CSS/SVG/Mermaid default to 'preview', Code defaults to 'code'
  const isVisualType = art.type === 'application/vnd.ant.react' ||
    art.type === 'text/html' ||
    art.type === 'text/css' ||
    (art.type === 'application/vnd.ant.code' && art.language === 'css') ||
    art.type === 'image/svg+xml' ||
    art.type === 'application/vnd.ant.mermaid';
  if (!isVisualType && art.type === 'application/vnd.ant.code') {
    switchArtifactView('code');
  } else {
    switchArtifactView(state.activeArtifactView || 'preview');
  }

  renderArtifactContent(art, ver);

  // Highlight pill in chat
  document.querySelectorAll('.artifact-chat-pill').forEach(pill => {
    if (pill.dataset.artifactId === identifier) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });
}

function closeArtifactWorkbench() {
  state.artifactWorkbenchOpen = false;
  const workspace = document.getElementById('playground-workspace');
  if (workspace) {
    workspace.classList.remove('artifact-open');
  }
  const resizer = document.getElementById('artifact-resizer');
  const wb = document.getElementById('artifact-workbench');
  if (resizer) resizer.style.display = 'none';
  if (wb) {
    wb.style.display = 'none';
    wb.classList.remove('is-fullscreen');
  }
  document.querySelectorAll('.artifact-chat-pill').forEach(pill => {
    pill.classList.remove('active');
  });
}

function switchArtifactVersion(delta) {
  const art = state.artifacts[state.activeArtifactId];
  if (!art || !art.versions) return;

  const newVer = (art.currentVersion || 1) + delta;
  if (newVer >= 1 && newVer <= art.versions.length) {
    art.currentVersion = newVer;
    updateVersionStepper(art);
    renderArtifactContent(art, newVer);
  }
}

function updateVersionStepper(art) {
  const label = document.getElementById('artifact-version-label');
  const prevBtn = document.getElementById('btn-artifact-prev-ver');
  const nextBtn = document.getElementById('btn-artifact-next-ver');

  const total = art.versions ? art.versions.length : 1;
  const current = art.currentVersion || 1;

  if (label) label.textContent = total > 1 ? `v${current} of ${total}` : `v${current}`;
  if (prevBtn) prevBtn.disabled = current <= 1;
  if (nextBtn) nextBtn.disabled = current >= total;
}

function switchArtifactView(view) {
  state.activeArtifactView = view;
  const btnPrev = document.getElementById('btn-artifact-preview');
  const btnCode = document.getElementById('btn-artifact-code');
  const panePrev = document.getElementById('artifact-preview-pane');
  const paneCode = document.getElementById('artifact-code-pane');

  if (view === 'preview') {
    if (btnPrev) btnPrev.classList.add('active');
    if (btnCode) btnCode.classList.remove('active');
    if (panePrev) panePrev.classList.add('active');
    if (paneCode) paneCode.classList.remove('active');
  } else {
    if (btnPrev) btnPrev.classList.remove('active');
    if (btnCode) btnCode.classList.add('active');
    if (panePrev) panePrev.classList.remove('active');
    if (paneCode) paneCode.classList.add('active');
  }
}

function copyActiveArtifactCode() {
  const art = state.artifacts[state.activeArtifactId];
  if (!art || !art.versions) return;
  const ver = art.versions[art.currentVersion - 1];
  const code = ver ? stripArtifactCodeFences(ver.content) : '';
  if (!code) return;

  navigator.clipboard.writeText(code).then(() => {
    const copyBtn = document.getElementById('btn-artifact-copy');
    if (copyBtn) {
      const span = copyBtn.querySelector('span');
      if (span) span.textContent = 'Copied!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        if (span) span.textContent = 'Copy';
        copyBtn.classList.remove('copied');
      }, 2000);
    }
    showToast('Copied artifact code to clipboard', 'success');
  }).catch(() => {
    showToast('Failed to copy to clipboard', 'error');
  });
}

function toggleArtifactMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('artifact-dropdown-menu');
  if (menu) {
    const isShown = menu.style.display !== 'none';
    menu.style.display = isShown ? 'none' : 'block';
  }
}

function downloadActiveArtifact() {
  const menu = document.getElementById('artifact-dropdown-menu');
  if (menu) menu.style.display = 'none';

  const art = state.artifacts[state.activeArtifactId];
  if (!art || !art.versions) return;
  const ver = art.versions[art.currentVersion - 1];
  const code = ver ? stripArtifactCodeFences(ver.content) : '';
  if (!code) return;

  const ext = getArtifactFileExtension(art.type, art.language);
  const filename = `${art.identifier || 'artifact'}${ext}`;
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Downloaded ${filename}`, 'success');
}

function toggleArtifactFullscreen() {
  const wb = document.getElementById('artifact-workbench');
  if (wb) {
    wb.classList.toggle('is-fullscreen');
  }
}

function renderArtifactContent(art, versionNum) {
  if (!art || !art.versions) return;
  const verObj = art.versions[versionNum - 1] || art.versions[art.versions.length - 1];
  if (!verObj) return;

  const content = stripArtifactCodeFences(verObj.content || '');

  // 1. Update Code Pane & Line Numbers
  const codeEl = document.getElementById('artifact-code-content');
  const gutterEl = document.getElementById('artifact-code-gutter');
  if (codeEl) codeEl.textContent = content;

  if (gutterEl) {
    const lines = content.length > 0 ? content.split('\n') : [''];
    let gutterHtml = '';
    for (let i = 1; i <= lines.length; i++) {
      gutterHtml += `<div class="line-number">${i}</div>`;
    }
    gutterEl.innerHTML = gutterHtml;
  }

  const langLabel = document.getElementById('artifact-code-lang');
  if (langLabel) {
    if (art.type === 'application/vnd.ant.react') langLabel.textContent = 'REACT / JSX';
    else if (art.type === 'text/html') langLabel.textContent = 'HTML5 / WEB';
    else if (art.type === 'image/svg+xml') langLabel.textContent = 'SVG / VECTOR';
    else if (art.type === 'application/vnd.ant.mermaid') langLabel.textContent = 'MERMAID DIAGRAM';
    else if (art.type === 'text/markdown') langLabel.textContent = 'MARKDOWN';
    else langLabel.textContent = (art.language || 'CODE').toUpperCase();
  }

  // 2. Update Preview Pane
  const iframe = document.getElementById('artifact-sandbox-frame');
  const svgBox = document.getElementById('artifact-svg-container');
  const mmdBox = document.getElementById('artifact-mermaid-container');
  const mdBox = document.getElementById('artifact-md-container');

  if (iframe) { iframe.style.display = 'none'; iframe.classList.add('hidden'); }
  if (svgBox) { svgBox.style.display = 'none'; svgBox.classList.add('hidden'); }
  if (mmdBox) { mmdBox.style.display = 'none'; mmdBox.classList.add('hidden'); }
  if (mdBox) { mdBox.style.display = 'none'; mdBox.classList.add('hidden'); }

  const isCss = art.type === 'text/css' ||
    (art.type === 'application/vnd.ant.code' && (art.language === 'css' || (content && (content.includes('@keyframes') || content.includes('backdrop-filter') || content.includes('.glass') || content.includes('background:')) && !content.includes('import ') && !content.includes('function ') && !content.includes('<html'))));

  // Every executable or markup artifact renders inside the sandboxed iframe, never in this page's DOM.
  const sandboxDoc =
    art.type === 'application/vnd.ant.react' ? buildReactSandboxHtml(content) :
    art.type === 'text/html' ? buildHtmlSandboxDoc(content) :
    isCss ? buildCssSandboxDoc(content) :
    art.type === 'image/svg+xml' ? buildSvgSandboxDoc(content) :
    art.type === 'application/vnd.ant.mermaid' ? buildMermaidSandboxDoc(content) :
    null;

  if (sandboxDoc !== null) {
    if (iframe) {
      iframe.style.display = 'block';
      iframe.classList.remove('hidden');
      iframe.srcdoc = withSandboxShims(sandboxDoc);
    }
  } else if (art.type === 'text/markdown') {
    if (mdBox) {
      mdBox.style.display = 'block';
      mdBox.classList.remove('hidden');
      mdBox.innerHTML = renderMarkdown(content);
    }
  } else {
    // Plain code -> show formatted guidance in preview pane instead of black screen
    if (mdBox) {
      mdBox.style.display = 'block';
      mdBox.classList.remove('hidden');
      mdBox.innerHTML = `
        <div style="padding: 48px 24px; text-align: center; color: var(--text-muted); max-width: 480px; margin: 0 auto;">
          <div style="font-size: 36px; margin-bottom: 16px;">📄</div>
          <h3 style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0 0 8px 0;">Source Code Artifact (${escapeHtml(art.language || 'code')})</h3>
          <p style="font-size: 13px; line-height: 1.6; color: var(--text-secondary); margin: 0 0 20px 0;">This artifact contains raw source code without an interactive DOM runtime. Click below to inspect, edit, or copy the source code.</p>
          <button class="btn btn-secondary btn-sm" onclick="switchArtifactView('code')">Open Code Tab</button>
        </div>
      `;
    }
    switchArtifactView('code');
  }
}

function buildCssSandboxDoc(cssCode) {
  let cleanCss = (cssCode || '')
    .replace(/^\s*```[a-zA-Z0-9_\-\+]*\s*\n?/gi, '')
    .replace(/\n?```\s*$/gi, '')
    .trim();

  const styleTag = cleanCss.includes('<style') ? cleanCss : `<style>${cleanCss}</style>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <base href="${window.location.origin}/"/>
  <style>
    :root {
      --viz-bg: #0b0f19;
      --viz-card: rgba(255, 255, 255, 0.05);
      --viz-border: rgba(255, 255, 255, 0.12);
      --viz-text: #f1f5f9;
      --viz-muted: #94a3b8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px 20px;
      background: radial-gradient(circle at 50% 0%, #1e1b4b 0%, #0b0f19 80%);
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      gap: 24px;
    }
    .sandbox-preview-container {
      width: 100%;
      max-width: 680px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
    }
    .sandbox-stage {
      width: 100%;
      padding: 40px 24px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }
    .sandbox-header {
      text-align: center;
    }
    .sandbox-title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin: 0 0 6px 0;
      color: #fff;
    }
    .sandbox-subtitle {
      font-size: 13px;
      color: var(--viz-muted);
      margin: 0;
    }
    .sandbox-hint {
      font-size: 12px;
      color: #64748b;
      margin-top: 8px;
    }
  </style>
  ${styleTag}
</head>
<body>
  <div class="sandbox-preview-container">
    <div class="sandbox-header">
      <h2 class="sandbox-title">Interactive CSS Preview</h2>
      <p class="sandbox-subtitle">Styles applied live to the interactive test elements below</p>
    </div>

    <div class="sandbox-stage" id="css-dynamic-stage">
      <button class="btn btn-primary glass-btn glass-button glassmorphism">Primary Action</button>
      <button class="btn btn-secondary glass-btn glass-button glassmorphism-secondary">Secondary</button>
      <button class="btn btn-glow glass-btn-glow glass-button-glow">Glow Effect</button>
      <button class="btn btn-accent glass-accent" disabled>Disabled</button>
    </div>

    <div class="sandbox-stage" style="flex-direction: column; align-items: stretch; gap: 16px;">
      <div class="glass-card card glassmorphism-card" style="padding: 20px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); backdrop-filter: blur(12px);">
        <h4 style="margin: 0 0 8px 0; font-size: 15px; color: #fff;">Glassmorphism Surface</h4>
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #94a3b8;">Interactive test container with glass backdrop and button actions.</p>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button class="glass-btn glass-button btn">Click State</button>
          <button class="glass-btn glass-button btn" style="opacity: 0.85;">Hover State</button>
        </div>
      </div>
    </div>

    <div class="sandbox-hint">Switch to the "Code" tab at top right to copy the full stylesheet.</div>
  </div>

  <script>
    try {
      const stage = document.getElementById('css-dynamic-stage');
      const cssRules = [];
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules || []) {
            if (rule.selectorText) {
              const selectors = rule.selectorText.split(',');
              selectors.forEach(sel => {
                const match = sel.trim().match(/^\\.([a-zA-Z0-9_\\-]+)(?::[a-zA-Z0-9_\\-]+)?$/);
                if (match && match[1] && !match[1].startsWith('sandbox') && !match[1].startsWith('btn')) {
                  cssRules.push(match[1]);
                }
              });
            }
          }
        } catch(e) {}
      }
      const uniqueClasses = [...new Set(cssRules)];
      if (uniqueClasses.length > 0) {
        uniqueClasses.slice(0, 6).forEach(cls => {
          const btn = document.createElement('button');
          btn.className = cls;
          btn.textContent = '.' + cls;
          btn.style.cursor = 'pointer';
          stage.appendChild(btn);
        });
      }
    } catch(e) {}
  </script>
</body>
</html>`;
}

function buildReactSandboxHtml(jsxCode) {
  let cleanCode = jsxCode || '';

  // 0. Universal Markdown Code-Fence Stripper
  cleanCode = cleanCode.replace(/^\s*```[a-zA-Z0-9_\-\+]*\s*\n?/gi, '');
  cleanCode = cleanCode.replace(/\n?```\s*$/gi, '').trim();

  // 1. Universal Import Stripper & Identifier Collector
  const importedIcons = new Set();
  cleanCode = cleanCode.replace(/import\s+(?:(?:\*\s+as\s+([a-zA-Z0-9_$]+))|(?:([a-zA-Z0-9_$]+)\s*,?\s*)?(?:\{([^}]+)\})?)\s+from\s*['"][^'"]+['"]\s*;?/g, (m, star, def, named) => {
    if (star) importedIcons.add(star.trim());
    if (named) {
      named.split(',').forEach(n => {
        const cleanName = n.trim().split(/\s+as\s+/)[0].trim();
        if (cleanName) importedIcons.add(cleanName);
      });
    }
    return '';
  });
  // Strip any remaining imports safely (both single-line and multiline without eating code)
  cleanCode = cleanCode.replace(/import\s+(?:[\s\S]*?)\s+from\s+['"][^'"]+['"]\s*;?/g, '');
  cleanCode = cleanCode.replace(/import\s+['"][^'"]+['"]\s*;?/g, '');

  // 2. Export default handler
  let detectedName = null;
  const funcMatch = cleanCode.match(/export\s+default\s+function\s+([a-zA-Z0-9_$]+)/);
  if (funcMatch) {
    detectedName = funcMatch[1];
    cleanCode = cleanCode.replace(/export\s+default\s+function\s+([a-zA-Z0-9_$]+)/, 'function $1');
  } else {
    const identMatch = cleanCode.match(/export\s+default\s+([a-zA-Z0-9_$]+);?/);
    if (identMatch) {
      detectedName = identMatch[1];
      cleanCode = cleanCode.replace(/export\s+default\s+([a-zA-Z0-9_$]+);?/, '');
    } else {
      cleanCode = cleanCode.replace(/export\s+default\s+/, 'const __AppExport = ');
      detectedName = '__AppExport';
    }
  }
  cleanCode = cleanCode.replace(/export\s*\{[^}]*\};?/g, '');
  cleanCode = cleanCode.replace(/export\s+(const|let|var|function|class)\s+/g, '$1 ');

  // Candidate component names
  const candidateNames = [...new Set([...cleanCode.matchAll(/(?:function|const|let|var|class)\s+([A-Z][a-zA-Z0-9_$]*)/g)].map(m => m[1]))];

  const safeCodeJson = JSON.stringify(cleanCode).replace(/<\/script/gi, '<\\/script');
  const safeNameJson = JSON.stringify(detectedName || '');
  const safeIconsJson = JSON.stringify([...importedIcons]);
  const safeCandidatesJson = JSON.stringify(candidateNames);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <base href="${window.location.origin}/"/>
  <script src="/static/vendor/react.min.js" onerror="this.onerror=null;this.src='https://unpkg.com/react@18/umd/react.production.min.js'"></script>
  <script src="/static/vendor/react-dom.min.js" onerror="this.onerror=null;this.src='https://unpkg.com/react-dom@18/umd/react-dom.production.min.js'"></script>
  <script src="/static/vendor/babel.min.js" onerror="this.onerror=null;this.src='https://unpkg.com/@babel/standalone/babel.min.js'"></script>
  <script src="https://cdn.tailwindcss.com" async></script>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0f19;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
    }
    #root { min-height: 100vh; }
    #error-boundary {
      display: none;
      position: fixed;
      top: 16px;
      left: 16px;
      right: 16px;
      z-index: 999999;
      padding: 16px;
      background: rgba(220, 38, 38, 0.95);
      border: 1px solid #ef4444;
      border-radius: 8px;
      color: #fff;
      font-family: monospace;
      font-size: 13px;
      line-height: 1.5;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      max-height: 80vh;
      overflow: auto;
    }
    /* Fallback styles for immediate rendering */
    .bg-white\\/5 { background-color: rgba(255, 255, 255, 0.05); }
    .bg-white\\/10 { background-color: rgba(255, 255, 255, 0.10); }
    .bg-white\\/15 { background-color: rgba(255, 255, 255, 0.15); }
    .bg-white\\/20 { background-color: rgba(255, 255, 255, 0.20); }
    .border-white\\/10 { border-color: rgba(255, 255, 255, 0.10); }
    .border-white\\/20 { border-color: rgba(255, 255, 255, 0.20); }
    .backdrop-blur-xl { backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
    .rounded-2xl { border-radius: 1rem; }
    .rounded-3xl { border-radius: 1.5rem; }
    .min-h-screen { min-height: 100vh; }
    .flex { display: flex; }
    .flex-1 { flex: 1 1 0%; }
    .items-center { align-items: center; }
    .justify-center { justify-content: center; }
    .justify-between { justify-content: space-between; }
    .text-center { text-align: center; }
    .text-white { color: #ffffff; }
    button { cursor: pointer; border-style: solid; }
  </style>
</head>
<body>
  <div id="error-boundary"></div>
  <div id="root"></div>

  <script>
    function showError(title, msg) {
      var box = document.getElementById('error-boundary');
      if (box) {
        box.style.display = 'block';
        box.innerHTML = '<strong style="color:#ffffff">' + title + '</strong><br>' +
          '<pre style="white-space:pre-wrap;font-size:12px;margin-top:6px;color:#fee2e2;max-height:300px;overflow:auto;">' +
          String(msg || '').replace(/</g, '&lt;') +
          '</pre>';
      }
    }

    window.onerror = function(msg, src, line, col, err) {
      showError('Uncaught Runtime Error:', (err && err.stack) ? err.stack : (msg + ' (line ' + line + ')'));
    };

    function waitForDependencies(callback, maxAttempts = 300) {
      let attempts = 0;
      function check() {
        try {
          if (!window.React && window.parent && window.parent.React) window.React = window.parent.React;
          if (!window.ReactDOM && window.parent && window.parent.ReactDOM) window.ReactDOM = window.parent.ReactDOM;
          if (!window.Babel && window.parent && window.parent.Babel) window.Babel = window.parent.Babel;
        } catch (_) { /* sandboxed: parent is cross-origin, load our own copies */ }

        if (window.React && window.ReactDOM && window.Babel && window.ReactDOM.createRoot) {
          callback();
        } else if (++attempts < maxAttempts) {
          setTimeout(check, 30);
        } else {
          showError('Engine Initialization Error', 'Timeout loading React, ReactDOM, or Babel engine.');
        }
      }
      check();
    }

    waitForDependencies(function() {
      // 1. Universal ClassName helpers (cn, clsx, twMerge)
      const cn = (...args) => args.flat(Infinity).filter(Boolean).map(x => {
        if (typeof x === 'object' && x !== null) {
          return Object.keys(x).filter(k => x[k]).join(' ');
        }
        return String(x);
      }).join(' ');
      const clsx = cn;
      const twMerge = cn;

      // 2. Universal Icon Proxy: returns crisp SVGs for requested icons
      const ICON_PATHS = {
        Minus: [React.createElement('line', { key: '1', x1: 5, y1: 12, x2: 19, y2: 12 })],
        Plus: [
          React.createElement('line', { key: '1', x1: 12, y1: 5, x2: 12, y2: 19 }),
          React.createElement('line', { key: '2', x1: 5, y1: 12, x2: 19, y2: 12 })
        ],
        RotateCcw: [
          React.createElement('path', { key: '1', d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }),
          React.createElement('path', { key: '2', d: 'M3 3v5h5' })
        ],
        RotateCw: [
          React.createElement('path', { key: '1', d: 'M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' }),
          React.createElement('path', { key: '2', d: 'M21 3v5h-5' })
        ],
        RefreshCw: [
          React.createElement('path', { key: '1', d: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' }),
          React.createElement('path', { key: '2', d: 'M21 3v5h-5' }),
          React.createElement('path', { key: '3', d: 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' }),
          React.createElement('path', { key: '4', d: 'M8 16H3v5' })
        ],
        Check: [React.createElement('polyline', { key: '1', points: '20 6 9 17 4 12' })],
        X: [
          React.createElement('line', { key: '1', x1: 18, y1: 6, x2: 6, y2: 18 }),
          React.createElement('line', { key: '2', x1: 6, y1: 6, x2: 18, y2: 18 })
        ],
        Search: [
          React.createElement('circle', { key: '1', cx: 11, cy: 11, r: 8 }),
          React.createElement('line', { key: '2', x1: 21, y1: 21, x2: 16.65, y2: 16.65 })
        ],
        ArrowLeft: [
          React.createElement('line', { key: '1', x1: 19, y1: 12, x2: 5, y2: 12 }),
          React.createElement('polyline', { key: '2', points: '12 19 5 12 12 5' })
        ],
        ArrowRight: [
          React.createElement('line', { key: '1', x1: 5, y1: 12, x2: 19, y2: 12 }),
          React.createElement('polyline', { key: '2', points: '12 5 19 12 12 19' })
        ],
        ChevronLeft: [React.createElement('polyline', { key: '1', points: '15 18 9 12 15 6' })],
        ChevronRight: [React.createElement('polyline', { key: '1', points: '9 18 15 12 9 6' })],
        ChevronDown: [React.createElement('polyline', { key: '1', points: '6 9 12 15 18 9' })],
        ChevronUp: [React.createElement('polyline', { key: '1', points: '18 15 12 9 6 15' })],
        Heart: [React.createElement('path', { key: '1', d: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' })],
        Star: [React.createElement('polygon', { key: '1', points: '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' })]
      };

      const LucideIcons = new Proxy({}, {
        get: (target, prop) => {
          if (prop === '__esModule') return true;
          if (prop === 'default') return target;
          const IconComp = (props = {}) => {
            const s = props.size || props.width || 20;
            const stroke = props.color || 'currentColor';
            const sw = props.strokeWidth || 2;
            const knownChildren = ICON_PATHS[prop];
            return React.createElement('svg', {
              width: s,
              height: s,
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: stroke,
              strokeWidth: sw,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              className: props.className || '',
              style: props.style
            },
              knownChildren || [
                React.createElement('circle', { key: 'c', cx: 12, cy: 12, r: 9, opacity: 0.25 }),
                React.createElement('text', {
                  key: 't',
                  x: 12, y: 15,
                  fontSize: 8,
                  textAnchor: 'middle',
                  fill: stroke,
                  stroke: 'none',
                  fontWeight: 'bold',
                  fontFamily: 'sans-serif'
                }, String(prop || '').substring(0, 3).toUpperCase())
              ]
            );
          };
          IconComp.displayName = String(prop || 'Icon');
          return IconComp;
        }
      });

      // 3. Mock animation library proxies (framer-motion)
      const motion = new Proxy({}, {
        get: (target, tag) => {
          const MotionComp = ({ children, whileHover, whileTap, animate, initial, transition, ...rest } = {}) => {
            return React.createElement(tag || 'div', rest, children);
          };
          MotionComp.displayName = 'motion.' + String(tag || 'div');
          return MotionComp;
        }
      });
      const AnimatePresence = ({ children }) => children;

      // 4. React Error Boundary
      class SandboxErrorBoundary extends React.Component {
        constructor(props) {
          super(props);
          this.state = { hasError: false, error: null };
        }
        static getDerivedStateFromError(error) {
          return { hasError: true, error };
        }
        componentDidCatch(error, info) {
          console.error("Component Caught Error:", error, info);
        }
        render() {
          if (this.state.hasError) {
            const err = this.state.error;
            const msg = (err && (err.stack || err.message)) ? String(err.stack || err.message) : 'Unknown render error';
            return React.createElement('div', {
              style: {
                margin: '16px',
                padding: '16px',
                background: 'rgba(239, 68, 68, 0.9)',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: '13px',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap'
              }
            },
              React.createElement('strong', { style: { color: '#ffffff' } }, 'React Component Render Error: '),
              msg
            );
          }
          return this.props.children;
        }
      }

      // 5. Transform and execute
      try {
        const rawCode = ${safeCodeJson};
        const detectedName = ${safeNameJson};
        const importedIcons = ${safeIconsJson};
        const candidateNames = ${safeCandidatesJson};

        // Compile JSX / TSX via Babel directly
        let compiled = '';
        try {
          compiled = Babel.transform(rawCode, { filename: 'app.tsx', presets: ['react', 'typescript'] }).code;
        } catch (compileErr) {
          showError('Component Compilation Error:', (compileErr.stack || compileErr.message));
          return;
        }

        // Clean any residual export statements in compiled code so new Function never throws SyntaxError
        compiled = compiled.replace(/export\\s+default\\s+(function\\s+[a-zA-Z0-9_$]+)/g, '$1');
        compiled = compiled.replace(/export\\s+default\\s+/g, 'const __AppExport = ');
        compiled = compiled.replace(/export\\s+(const|let|var|function|class)\\s+/g, '$1 ');
        compiled = compiled.replace(/export\\s*\\{[^}]*\\};?/g, '');

        const excluded = new Set([
          'React', 'ReactDOM', 'useState', 'useEffect', 'useRef', 'useMemo', 'useCallback',
          'createContext', 'useContext', 'useReducer', 'cn', 'clsx', 'twMerge', 'motion', 'AnimatePresence'
        ]);
        const iconDecls = importedIcons
          .filter(id => id && !excluded.has(id) && /^[A-Z][a-zA-Z0-9_$]*$/.test(id))
          .map(id => 'const ' + id + ' = LucideIcons.' + id + ';')
          .join('\\n');

        const probeCandidates = candidateNames
          .filter(n => n && !excluded.has(n))
          .map(n => 'if (!__Target && typeof ' + n + ' !== "undefined" && typeof ' + n + ' === "function") __Target = ' + n + ';')
          .join('\\n');

        const runnerCode = [
          iconDecls,
          compiled,
          'let __Target = null;',
          detectedName ? ('if (typeof ' + detectedName + ' !== "undefined" && typeof ' + detectedName + ' === "function") __Target = ' + detectedName + ';') : '',
          probeCandidates,
          'if (!__Target && typeof GlassCounter !== "undefined") __Target = GlassCounter;',
          'if (!__Target && typeof App !== "undefined") __Target = App;',
          'if (!__Target && typeof CounterApp !== "undefined") __Target = CounterApp;',
          'if (!__Target && typeof Counter !== "undefined") __Target = Counter;',
          'if (!__Target && typeof DarkGlassCounter !== "undefined") __Target = DarkGlassCounter;',
          'if (!__Target && typeof DarkGlassmorphismCounter !== "undefined") __Target = DarkGlassmorphismCounter;',
          'if (!__Target && typeof GlassButtonSystem !== "undefined") __Target = GlassButtonSystem;',
          'if (!__Target && typeof ButtonSystem !== "undefined") __Target = ButtonSystem;',
          'if (!__Target && typeof __AppExport !== "undefined" && typeof __AppExport === "function") __Target = __AppExport;',
          'if (!__Target) {',
          '  const globals = Object.keys(window).filter(k => /^[A-Z][a-zA-Z0-9]+$/.test(k) && typeof window[k] === "function");',
          '  for (const k of globals) {',
          '    if (k !== "React" && k !== "ReactDOM" && k !== "Babel") { __Target = window[k]; break; }',
          '  }',
          '}',
          'return __Target;'
        ].join('\\n');

        let factory = null;
        try {
          factory = new Function(
            'React', 'ReactDOM', 'useState', 'useEffect', 'useRef', 'useMemo', 'useCallback',
            'createContext', 'useContext', 'useReducer', 'cn', 'clsx', 'twMerge', 'LucideIcons',
            'motion', 'AnimatePresence',
            runnerCode
          );
        } catch (fnErr) {
          showError('Component Factory Creation Error:', (fnErr.stack || fnErr.message));
          return;
        }

        let Component = null;
        try {
          Component = factory(
            React, ReactDOM, React.useState, React.useEffect, React.useRef, React.useMemo, React.useCallback,
            React.createContext, React.useContext, React.useReducer, cn, clsx, twMerge, LucideIcons,
            motion, AnimatePresence
          );
        } catch (factoryExecErr) {
          showError('Component Factory Call Error:', (factoryExecErr.stack || factoryExecErr.message));
          return;
        }

        if (!Component || typeof Component !== 'function') {
          showError('Component Mount Error:', 'No valid React component function was returned from the code.');
          return;
        }

        try {
          const rootEl = document.getElementById('root');
          const root = ReactDOM.createRoot(rootEl);
          root.render(React.createElement(SandboxErrorBoundary, null, React.createElement(Component)));
        } catch (renderErr) {
          showError('Component Render Error:', (renderErr.stack || renderErr.message));
          return;
        }
      } catch (err) {
        showError('Component Execution Error:', (err.stack || err.message));
      }
    });
  </script>
</body>
</html>`;
}

function buildHtmlSandboxDoc(html) {
  let cleanHtml = (html || '').replace(/^\s*```[a-zA-Z0-9_\-\+]*\s*\n?/gi, '').replace(/\n?```\s*$/gi, '').trim();

  if (cleanHtml.includes('<!DOCTYPE html>') || cleanHtml.includes('<html')) {
    return cleanHtml;
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <base href="${window.location.origin}/"/>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
      --viz-text: #f1f5f9;
      --viz-muted: #94a3b8;
      --viz-panel: rgba(255, 255, 255, 0.05);
      --viz-border: rgba(255, 255, 255, 0.15);
      --viz-accent: #6366f1;
      --viz-accent-bg: rgba(99, 102, 241, 0.2);
    }
    body {
      margin: 0;
      padding: 16px;
      background: #0b0f19;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  </style>
</head>
<body>
  ${cleanHtml}
</body>
</html>`;
}

// Runs first inside every sandbox document. The iframe has an opaque origin, so the real
// localStorage/sessionStorage throw; artifacts get per-render in-memory stand-ins instead.
const SANDBOX_SHIM = `<script>(function(){function mk(){var d=Object.create(null);return{getItem:function(k){k=String(k);return k in d?d[k]:null},setItem:function(k,v){d[String(k)]=String(v)},removeItem:function(k){delete d[String(k)]},clear:function(){d=Object.create(null)},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}['localStorage','sessionStorage'].forEach(function(n){try{window[n].getItem('x')}catch(e){try{Object.defineProperty(window,n,{value:mk(),configurable:true})}catch(_){}}});})();</script>`;

function withSandboxShims(doc) {
  if (/<head[^>]*>/i.test(doc)) return doc.replace(/<head[^>]*>/i, (m) => m + SANDBOX_SHIM);
  return SANDBOX_SHIM + doc;
}

function buildSvgSandboxDoc(content) {
  const svg = (content || '').includes('<svg') ? content : `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${content || ''}</svg>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <style>
    html, body { margin: 0; height: 100%; }
    body { display: flex; align-items: center; justify-content: center; background: transparent; }
    body > svg { max-width: 100%; max-height: 100%; }
  </style>
</head>
<body>${svg}</body>
</html>`;
}

function buildMermaidSandboxDoc(code) {
  // JSON-encode and escape '<' so diagram text can't close the script tag.
  const source = JSON.stringify((code || '').trim()).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <style>
    body { margin: 0; padding: 16px; background: #0b0f19; color: #f1f5f9; display: flex; justify-content: center; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    .notice { padding: 16px; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 8px; color: #fca5a5; white-space: pre-wrap; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</head>
<body>
  <div id="out">Rendering diagram...</div>
  <script>
    (async function () {
      const out = document.getElementById('out');
      const code = ${source};
      try {
        mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict' });
        const { svg } = await mermaid.render('mermaid-svg-' + Date.now(), code);
        out.innerHTML = svg;
      } catch (err) {
        out.className = 'notice';
        out.textContent = 'Mermaid Syntax / Render Notice: ' + ((err && err.message) || 'Syntax error') + '\\n\\n' + code;
      }
    })();
  </script>
</body>
</html>`;
}

function handleStreamingArtifact(content, isFinished = false) {
  content = convertGenUiToArtifact(content);
  const artifactRegex = /<antArtifact\s+([^>]+)>([\s\S]*?)(?:<\/antArtifact>|$)/gi;
  let match;
  while ((match = artifactRegex.exec(content)) !== null) {
    const rawAttrs = match[1];
    const extractedCode = match[2];
    const isTagClosed = /<\/antArtifact\s*>/i.test(match[0]);
    const attrs = parseXmlAttributes(rawAttrs);
    const id = attrs.identifier;
    if (!id) continue;

    const type = attrs.type || 'application/vnd.ant.code';
    const title = attrs.title || id;
    const lang = attrs.language || '';
    const cleanCode = stripArtifactCodeFences(extractedCode);

    if (!state.artifacts[id]) {
      state.artifacts[id] = {
        identifier: id,
        type: type,
        title: title,
        language: lang,
        currentVersion: 1,
        versions: [{ version: 1, content: cleanCode, timestamp: Date.now() }],
        isStreaming: !isTagClosed && !isFinished,
      };
      openArtifact(id);
    } else {
      const art = state.artifacts[id];
      if (!art.isStreaming && !isTagClosed && !isFinished) {
        const newVer = art.versions.length + 1;
        art.versions.push({ version: newVer, content: cleanCode, timestamp: Date.now() });
        art.currentVersion = newVer;
        art.title = title;
        art.type = type;
        art.language = lang;
        art.isStreaming = true;
        openArtifact(id, newVer);
      } else {
        const curVerIdx = (art.currentVersion || 1) - 1;
        if (art.versions[curVerIdx]) {
          art.versions[curVerIdx].content = cleanCode;
        }
        art.isStreaming = !isTagClosed && !isFinished;
      }
    }

    if (state.activeArtifactId === id) {
      const codeEl = document.getElementById('artifact-code-content');
      const gutterEl = document.getElementById('artifact-code-gutter');
      if (codeEl) {
        codeEl.textContent = cleanCode;
      }
      if (gutterEl) {
        const lines = cleanCode.length > 0 ? cleanCode.split('\n') : [''];
        let gutterHtml = '';
        for (let i = 1; i <= lines.length; i++) {
          gutterHtml += `<div class="line-number">${i}</div>`;
        }
        gutterEl.innerHTML = gutterHtml;
      }
      if (isTagClosed || isFinished) {
        const art = state.artifacts[id];
        renderArtifactContent(art, art.currentVersion);
        updateVersionStepper(art);
      }
    }
  }
}

function initArtifactsWorkbench() {
  const resizer = document.getElementById('artifact-resizer');
  const wb = document.getElementById('artifact-workbench');
  if (resizer) resizer.style.display = 'none';
  if (wb) wb.style.display = 'none';

  const toggle = document.getElementById('toggle-artifacts-enable');
  if (toggle) {
    toggle.checked = state.enableArtifacts;
    toggle.addEventListener('change', () => {
      state.enableArtifacts = toggle.checked;
      showToast(state.enableArtifacts ? 'Singularity Artifacts enabled' : 'Singularity Artifacts disabled', 'info');
    });
  }

  const btnPrev = document.getElementById('btn-artifact-preview');
  const btnCode = document.getElementById('btn-artifact-code');
  if (btnPrev) btnPrev.addEventListener('click', () => switchArtifactView('preview'));
  if (btnCode) btnCode.addEventListener('click', () => switchArtifactView('code'));

  const prevVerBtn = document.getElementById('btn-artifact-prev-ver');
  const nextVerBtn = document.getElementById('btn-artifact-next-ver');
  if (prevVerBtn) prevVerBtn.addEventListener('click', () => switchArtifactVersion(-1));
  if (nextVerBtn) nextVerBtn.addEventListener('click', () => switchArtifactVersion(1));

  const copyBtn = document.getElementById('btn-artifact-copy');
  if (copyBtn) copyBtn.addEventListener('click', copyActiveArtifactCode);

  const moreBtn = document.getElementById('btn-artifact-more');
  if (moreBtn) moreBtn.addEventListener('click', toggleArtifactMenu);

  document.addEventListener('click', (e) => {
    const splitBtn = document.getElementById('artifact-split-btn');
    const menu = document.getElementById('artifact-dropdown-menu');
    if (menu && splitBtn && !splitBtn.contains(e.target)) {
      menu.style.display = 'none';
    }
  });

  const dlBtn = document.getElementById('btn-artifact-download');
  if (dlBtn) dlBtn.addEventListener('click', downloadActiveArtifact);

  const fsBtn = document.getElementById('btn-artifact-fullscreen');
  if (fsBtn) fsBtn.addEventListener('click', toggleArtifactFullscreen);

  const closeBtn = document.getElementById('btn-artifact-close');
  if (closeBtn) closeBtn.addEventListener('click', closeArtifactWorkbench);

  initArtifactResizer();
}

function initArtifactResizer() {
  const resizer = document.getElementById('artifact-resizer');
  const workspace = document.getElementById('playground-workspace');
  if (!resizer || !workspace) return;

  let isDragging = false;

  const startDrag = (e) => {
    isDragging = true;
    resizer.classList.add('is-dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const doDrag = (e) => {
    if (!isDragging) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    if (!clientX) return;
    const rect = workspace.getBoundingClientRect();
    const offset = clientX - rect.left;
    const pct = Math.max(25, Math.min(75, (offset / rect.width) * 100));
    workspace.style.setProperty('--chat-pane-width', `${pct}%`);
  };

  const stopDrag = () => {
    if (isDragging) {
      isDragging = false;
      resizer.classList.remove('is-dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  };

  resizer.addEventListener('mousedown', startDrag);
  window.addEventListener('mousemove', doDrag);
  window.addEventListener('mouseup', stopDrag);

  resizer.addEventListener('touchstart', startDrag, { passive: true });
  window.addEventListener('touchmove', doDrag, { passive: true });
  window.addEventListener('touchend', stopDrag, { passive: true });
}

// ===================================================================
// VengeanceUI Animated Light Lines (Playground Background)
// ===================================================================
let playgroundLightLinesRunning = false;

function initPlaygroundLightLines() {
  if (playgroundLightLinesRunning) return;
  const container = document.getElementById('playground-light-lines');
  if (!container) return;

  const lightsDown = [
    { selector: '.light4', from: -1080, to: 1080 },
    { selector: '.light5', from: -1080, to: 1080 },
    { selector: '.light6', from: -1080, to: 1080 },
    { selector: '.light7', from: -1080, to: 1080 },
    { selector: '.light8', from: -1080, to: 1080 },
    { selector: '.light11', from: -1080, to: 1080 },
    { selector: '.light12', from: -1080, to: 1080 },
    { selector: '.light13', from: -1080, to: 1080 },
    { selector: '.light14', from: -1080, to: 1080 },
    { selector: '.light15', from: -1080, to: 1080 },
    { selector: '.light16', from: -1080, to: 1080 },
  ];

  const lightsUp = [
    { selector: '.light1', from: 1080, to: -1080 },
    { selector: '.light2', from: 1080, to: -1080 },
    { selector: '.light3', from: 1080, to: -1080 },
    { selector: '.light9', from: 1080, to: -1080 },
    { selector: '.light10', from: 1080, to: -1080 },
    { selector: '.light17', from: 1080, to: -1080 },
  ];

  const allLights = [...lightsDown, ...lightsUp];
  const animations = allLights.map(light => {
    const element = container.querySelector(light.selector);
    const duration = ((Math.floor(Math.random() * 59) + 2) * 0.5 + 0.5);
    return {
      element,
      from: light.from,
      to: light.to,
      duration,
      startTime: performance.now() - Math.random() * 5000,
    };
  });

  let isVisible = true;
  let frameId = null;

  const animate = (time) => {
    if (!isVisible) {
      frameId = requestAnimationFrame(animate);
      return;
    }

    for (let i = 0; i < animations.length; i++) {
      const ref = animations[i];
      if (!ref.element) continue;

      const elapsed = (time - ref.startTime) / 1000;
      const progress = (elapsed % ref.duration) / ref.duration;
      const currentY = ref.from + (ref.to - ref.from) * progress;

      ref.element.style.transform = `translateY(${currentY}px)`;
    }

    frameId = requestAnimationFrame(animate);
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    }, { threshold: 0 });
    observer.observe(container);
  }

  playgroundLightLinesRunning = true;
  frameId = requestAnimationFrame(animate);
}

function initPlayground() {
  initPlaygroundLightLines();
  const sendBtn = document.getElementById('btn-send-chat');
  const input = document.getElementById('chat-input');
  const tempRange = document.getElementById('temp-range');
  const tempVal = document.getElementById('temp-val');
  const clearBtn = document.getElementById('btn-clear-chat');
  const inputModelName = document.getElementById('input-model-name');
  if (inputModelName) inputModelName.textContent = formatModelDisplayName(state.selectedModel || 'gpt-5.6-sol');

  // Initialize dynamic time-aware greeting
  updateHeroGreeting(false);
  const heroTrigger = document.getElementById('claude-hero-trigger');
  if (heroTrigger) {
    heroTrigger.addEventListener('click', () => updateHeroGreeting(true));
  }

  // Parameters Popover Toggle (Settings)
  const btnToggleSettings = document.getElementById('btn-toggle-playground-settings');
  const settingsDropdown = document.getElementById('playground-settings-dropdown');
  const btnCloseSettings = document.getElementById('btn-close-pg-settings');

  if (btnToggleSettings && settingsDropdown) {
    btnToggleSettings.addEventListener('click', (e) => {
      e.stopPropagation();
      settingsDropdown.classList.toggle('open');
      if (settingsDropdown.classList.contains('open')) {
        loadModelSettings(state.selectedModel || 'gpt-5.6-sol');
      }
    });
    if (btnCloseSettings) {
      btnCloseSettings.addEventListener('click', () => {
        settingsDropdown.classList.remove('open');
      });
    }
    document.addEventListener('click', (e) => {
      if (!settingsDropdown.contains(e.target) && !btnToggleSettings.contains(e.target)) {
        settingsDropdown.classList.remove('open');
      }
    });
  }

  // Model Parameter Overrides (Thinking Budget, Max Tokens, Temperature)
  const thinkingRange = document.getElementById('thinking-budget-range');
  const maxTokensRange = document.getElementById('max-tokens-range');
  const maxTokensVal = document.getElementById('max-tokens-val');
  const btnSaveSettings = document.getElementById('btn-save-model-settings');
  const btnResetSettings = document.getElementById('btn-reset-model-settings');

  if (thinkingRange) {
    thinkingRange.addEventListener('input', () => {
      updateThinkingBudgetDisplay(thinkingRange.value);
    });
    thinkingRange.addEventListener('change', () => {
      saveCurrentModelSettings(false);
    });
  }

  const thinkingBtns = document.querySelectorAll('#thinking-preset-btns .preset-btn');
  thinkingBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tokens = parseInt(btn.dataset.tokens, 10);
      if (thinkingRange) thinkingRange.value = tokens;
      updateThinkingBudgetDisplay(tokens);
      saveCurrentModelSettings(true);
    });
  });

  if (maxTokensRange && maxTokensVal) {
    maxTokensRange.addEventListener('input', () => {
      const val = parseInt(maxTokensRange.value, 10);
      maxTokensVal.textContent = `${val.toLocaleString()} tokens`;
    });
    maxTokensRange.addEventListener('change', () => {
      saveCurrentModelSettings(false);
    });
  }

  const maxTokensBtns = document.querySelectorAll('#max-tokens-preset-btns .preset-btn');
  maxTokensBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tokens = parseInt(btn.dataset.tokens, 10);
      if (maxTokensRange) maxTokensRange.value = tokens;
      if (maxTokensVal) maxTokensVal.textContent = `${tokens.toLocaleString()} tokens`;
      maxTokensBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      saveCurrentModelSettings(true);
    });
  });

  if (tempRange && tempVal) {
    tempRange.addEventListener('input', () => {
      tempVal.textContent = parseFloat(tempRange.value).toFixed(2);
    });
    tempRange.addEventListener('change', () => {
      saveCurrentModelSettings(false);
    });
  }

  const sysPromptInput = document.getElementById('system-prompt-input');
  if (sysPromptInput) {
    sysPromptInput.addEventListener('change', () => {
      saveCurrentModelSettings(false);
    });
  }

  const btnSaveGlobal = document.getElementById('btn-save-global-settings');
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', () => {
      saveCurrentModelSettings(true, false);
    });
  }

  if (btnSaveGlobal) {
    btnSaveGlobal.addEventListener('click', () => {
      saveCurrentModelSettings(true, true);
    });
  }

  if (btnResetSettings) {
    btnResetSettings.addEventListener('click', resetCurrentModelSettings);
  }

  // Initial load of model settings
  loadModelSettings(state.selectedModel || 'gpt-5.6-sol');

  // Lightbox close & download
  const btnCloseLightbox = document.getElementById('btn-lightbox-close');
  const btnDownloadLightbox = document.getElementById('btn-lightbox-download');
  const lightboxModal = document.getElementById('playground-lightbox');

  if (btnCloseLightbox) {
    btnCloseLightbox.addEventListener('click', closeMediaLightbox);
  }
  if (btnDownloadLightbox) {
    btnDownloadLightbox.addEventListener('click', () => {
      if (currentLightboxSrc) {
        downloadMediaFile(currentLightboxSrc, `singularity-export-${Date.now()}.png`);
      }
    });
  }
  if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) {
        closeMediaLightbox();
      }
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMediaLightbox();
    }
  });

  // Delegated code copy action for code blocks rendered in chat history
  const chatHistoryEl = document.getElementById('chat-history');
  if (chatHistoryEl) {
    chatHistoryEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.chat-code-copy-btn');
      if (!btn) return;
      const b64 = btn.getAttribute('data-code-b64');
      if (!b64) return;
      try {
        const code = decodeURIComponent(escape(atob(b64)));
        navigator.clipboard.writeText(code).then(() => {
          const span = btn.querySelector('span');
          if (span) span.textContent = 'Copied!';
          btn.classList.add('copied');
          setTimeout(() => {
            if (span) span.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 2000);
        });
      } catch (err) {
        console.error('Code copy failed:', err);
      }
    });
  }

  // Auto-grow textarea & send button enabling
  if (input) {
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 180) + 'px';
      if (sendBtn) {
        sendBtn.disabled = !input.value.trim() || state.isStreaming;
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }

  if (sendBtn) sendBtn.addEventListener('click', sendChatMessage);

  // Claude Suggestion Pills & Legacy Chips Click
  document.addEventListener('click', (e) => {
    const pill = e.target.closest('.claude-pill-btn, .hero-chip');
    if (pill) {
      const prompt = pill.getAttribute('data-prompt');
      if (input && prompt) {
        input.value = prompt;
        input.focus();
        input.dispatchEvent(new Event('input', { bubbles: true }));
        if (sendBtn) sendBtn.disabled = false;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 180) + 'px';
      }
    }
  });



  // Attachment button
  const attachBtn = document.getElementById('claude-attach-btn');
  const fileInput = document.getElementById('claude-file-input');
  if (attachBtn && fileInput) {
    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        showToast(`Attached ${e.target.files.length} file(s)`, 'info');
      }
    });
  }

  // Voice buttons
  document.getElementById('btn-voice-input')?.addEventListener('click', () => {
    showToast('Voice dictation ready (Microphone active)', 'info');
  });
  document.getElementById('btn-voice-chat')?.addEventListener('click', () => {
    showToast('Voice conversation mode ready', 'info');
  });
  // Clear Chat Button Handler
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      state.chatMessages = [];
      state.artifacts = {};
      state.activeArtifactId = null;
      closeArtifactWorkbench();
      const history = document.getElementById('chat-history');
      const thread = history?.querySelector('.chat-thread-container');
      if (thread) thread.innerHTML = '';
      const workspace = document.getElementById('playground-workspace');
      if (workspace) workspace.classList.remove('has-messages');
      document.body.classList.remove('dock-vertical');
      window.SingularityGlassDock?.updateDockMode(false);
      const heroEl = document.getElementById('playground-hero');
      if (heroEl) heroEl.classList.remove('hidden');
      updateHeroGreeting(true);
      if (input) {
        input.value = '';
        input.style.height = 'auto';
      }
      if (sendBtn) sendBtn.disabled = true;
      showToast('Chat history cleared', 'info');
    });
  }

  // Initialize Artifacts Workbench controls & resizer
  initArtifactsWorkbench();
}

function formatShortMonthDate(date = new Date()) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function cleanTextForSpeech(raw) {
  if (!raw) return '';
  return raw
    .replace(/<antArtifact[\s\S]*?<\/antArtifact>/gi, 'Interactive artifact rendered.')
    .replace(/<[^>]+>/g, '')
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_#~>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function createResponseActionBar(assistantMsgEl, fullContent, promptText, modelName, elapsedMs, timestamp = new Date()) {
  if (assistantMsgEl.querySelector('.response-actions')) {
    return;
  }

  const bar = document.createElement('div');
  bar.className = 'response-actions';

  const shortDate = formatShortMonthDate(timestamp);
  const fullDateTime = timestamp.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // 1. Copy Button
  const copyBtn = document.createElement('button');
  copyBtn.className = 'response-action-btn btn-copy-response';
  copyBtn.setAttribute('data-tooltip', 'Copy');
  copyBtn.setAttribute('aria-label', 'Copy response');
  copyBtn.innerHTML = `
    <svg class="icon-copy" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  `;
  copyBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      const textToCopy = (fullContent || '')
        .replace(/<antArtifact\s+[^>]+>[\s\S]*?<\/antArtifact>/gi, '')
        .replace(/data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]+/g, '[Image]')
        .trim();
      await navigator.clipboard.writeText(textToCopy);
      copyBtn.innerHTML = `
        <svg class="icon-check" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      copyBtn.setAttribute('data-tooltip', 'Copied!');
      copyBtn.classList.add('active');
      showToast('Copied to clipboard', 'success');

      const tip = document.getElementById('singularity-tooltip');
      if (tip && tip.classList.contains('visible')) {
        tip.textContent = 'Copied!';
      }

      setTimeout(() => {
        copyBtn.innerHTML = `
          <svg class="icon-copy" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        `;
        copyBtn.setAttribute('data-tooltip', 'Copy');
        copyBtn.classList.remove('active');
      }, 2000);
    } catch (err) {
      console.error('Failed to copy response:', err);
      showToast('Failed to copy to clipboard', 'error');
    }
  });
  bar.appendChild(copyBtn);

  // 2. Read Aloud / Speaker Button
  const speakBtn = document.createElement('button');
  speakBtn.className = 'response-action-btn btn-speak-response';
  speakBtn.setAttribute('data-tooltip', 'Read aloud');
  speakBtn.setAttribute('aria-label', 'Read response aloud');
  speakBtn.innerHTML = `
    <svg class="icon-speak" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
    </svg>
  `;
  speakBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!('speechSynthesis' in window)) {
      showToast('Speech synthesis not supported in this browser', 'info');
      return;
    }
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      document.querySelectorAll('.btn-speak-response.active').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('data-tooltip', 'Read aloud');
      });
      return;
    }

    const speakText = cleanTextForSpeech(fullContent);
    if (!speakText) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speakText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    speakBtn.classList.add('active');
    speakBtn.setAttribute('data-tooltip', 'Stop reading');

    const tip = document.getElementById('singularity-tooltip');
    if (tip && tip.classList.contains('visible')) {
      tip.textContent = 'Stop reading';
    }

    utterance.onend = () => {
      speakBtn.classList.remove('active');
      speakBtn.setAttribute('data-tooltip', 'Read aloud');
    };
    utterance.onerror = () => {
      speakBtn.classList.remove('active');
      speakBtn.setAttribute('data-tooltip', 'Read aloud');
    };

    window.speechSynthesis.speak(utterance);
  });
  bar.appendChild(speakBtn);

  // 3. Thumbs Up Button
  const thumbsUpBtn = document.createElement('button');
  thumbsUpBtn.className = 'response-action-btn btn-thumbs-up';
  thumbsUpBtn.setAttribute('data-tooltip', 'Good response');
  thumbsUpBtn.setAttribute('aria-label', 'Good response');
  thumbsUpBtn.innerHTML = `
    <svg class="icon-thumbs-up" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
    </svg>
  `;
  thumbsUpBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isCurrentlyActive = thumbsUpBtn.classList.contains('active');
    thumbsDownBtn.classList.remove('active');
    thumbsDownBtn.setAttribute('data-tooltip', 'Bad response');
    if (isCurrentlyActive) {
      thumbsUpBtn.classList.remove('active');
      thumbsUpBtn.setAttribute('data-tooltip', 'Good response');
    } else {
      thumbsUpBtn.classList.add('active');
      thumbsUpBtn.setAttribute('data-tooltip', 'Helpful');
      showToast('Thanks for your feedback!', 'info');
    }
  });
  bar.appendChild(thumbsUpBtn);

  // 4. Thumbs Down Button
  const thumbsDownBtn = document.createElement('button');
  thumbsDownBtn.className = 'response-action-btn btn-thumbs-down';
  thumbsDownBtn.setAttribute('data-tooltip', 'Bad response');
  thumbsDownBtn.setAttribute('aria-label', 'Bad response');
  thumbsDownBtn.innerHTML = `
    <svg class="icon-thumbs-down" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
    </svg>
  `;
  thumbsDownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isCurrentlyActive = thumbsDownBtn.classList.contains('active');
    thumbsUpBtn.classList.remove('active');
    thumbsUpBtn.setAttribute('data-tooltip', 'Good response');
    if (isCurrentlyActive) {
      thumbsDownBtn.classList.remove('active');
      thumbsDownBtn.setAttribute('data-tooltip', 'Bad response');
    } else {
      thumbsDownBtn.classList.add('active');
      thumbsDownBtn.setAttribute('data-tooltip', 'Reported');
      showToast('Feedback noted', 'info');
    }
  });
  bar.appendChild(thumbsDownBtn);

  // 5. Retry Button
  const retryBtn = document.createElement('button');
  retryBtn.className = 'response-action-btn btn-retry-response';
  retryBtn.setAttribute('data-tooltip', 'Retry');
  retryBtn.setAttribute('aria-label', 'Retry response');
  retryBtn.innerHTML = `
    <svg class="icon-retry" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="23 4 23 10 17 10"></polyline>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
    </svg>
  `;
  retryBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.isStreaming) {
      showToast('A message is already generating', 'warning');
      return;
    }
    retryBtn.classList.add('spinning');
    retryChatMessage(promptText, assistantMsgEl);
  });
  bar.appendChild(retryBtn);

  // 6. Response Date Timestamp (short month like Aug, Sep, Oct + day)
  const dateEl = document.createElement('span');
  dateEl.className = 'response-date';
  dateEl.textContent = shortDate;
  dateEl.setAttribute('data-tooltip', `${fullDateTime} • ${modelName || state.selectedModel} (${elapsedMs}ms)`);
  bar.appendChild(dateEl);

  assistantMsgEl.appendChild(bar);
}

function createUserActionBar(userMsgEl, userText, timestamp = new Date()) {
  if (userMsgEl.querySelector('.user-msg-actions')) {
    return;
  }

  const bar = document.createElement('div');
  bar.className = 'user-msg-actions';

  const shortDate = formatShortMonthDate(timestamp);
  const fullDateTime = timestamp.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // 1. Date Timestamp (short month like Aug, Sep, Oct)
  const dateEl = document.createElement('span');
  dateEl.className = 'user-msg-date';
  dateEl.textContent = shortDate;
  dateEl.setAttribute('data-tooltip', fullDateTime);
  bar.appendChild(dateEl);

  // 2. Retry Button
  const retryBtn = document.createElement('button');
  retryBtn.className = 'response-action-btn btn-retry-user';
  retryBtn.setAttribute('data-tooltip', 'Retry');
  retryBtn.setAttribute('aria-label', 'Retry prompt');
  retryBtn.innerHTML = `
    <svg class="icon-retry" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="23 4 23 10 17 10"></polyline>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
    </svg>
  `;
  retryBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.isStreaming) {
      showToast('A message is already generating', 'warning');
      return;
    }
    retryBtn.classList.add('spinning');
    retryUserMessage(userMsgEl, userMsgEl.dataset.promptText || userText);
  });
  bar.appendChild(retryBtn);

  // 3. Edit Button
  const editBtn = document.createElement('button');
  editBtn.className = 'response-action-btn btn-edit-user';
  editBtn.setAttribute('data-tooltip', 'Edit');
  editBtn.setAttribute('aria-label', 'Edit message');
  editBtn.innerHTML = `
    <svg class="icon-edit" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  `;
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.isStreaming) {
      showToast('A message is already generating', 'warning');
      return;
    }
    startInlineUserEdit(userMsgEl, userMsgEl.dataset.promptText || userText, bar);
  });
  bar.appendChild(editBtn);

  // 4. Copy Button
  const copyBtn = document.createElement('button');
  copyBtn.className = 'response-action-btn btn-copy-user';
  copyBtn.setAttribute('data-tooltip', 'Copy');
  copyBtn.setAttribute('aria-label', 'Copy message');
  copyBtn.innerHTML = `
    <svg class="icon-copy" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  `;
  copyBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      const textToCopy = userMsgEl.dataset.promptText || userText;
      await navigator.clipboard.writeText(textToCopy);
      copyBtn.innerHTML = `
        <svg class="icon-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      copyBtn.setAttribute('data-tooltip', 'Copied!');
      copyBtn.classList.add('active');
      showToast('Copied to clipboard', 'success');

      const tip = document.getElementById('singularity-tooltip');
      if (tip && tip.classList.contains('visible')) {
        tip.textContent = 'Copied!';
      }

      setTimeout(() => {
        copyBtn.innerHTML = `
          <svg class="icon-copy" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        `;
        copyBtn.setAttribute('data-tooltip', 'Copy');
        copyBtn.classList.remove('active');
      }, 2000);
    } catch (err) {
      console.error('Failed to copy user message:', err);
      showToast('Failed to copy to clipboard', 'error');
    }
  });
  bar.appendChild(copyBtn);

  userMsgEl.appendChild(bar);
}

function retryUserMessage(userMsgEl, userText) {
  if (state.isStreaming) {
    showToast('A message is already generating', 'warning');
    return;
  }

  const history = document.getElementById('chat-history');
  const thread = history?.querySelector('.chat-thread-container');
  if (!thread) return;

  // Remove all siblings following userMsgEl in thread
  let nextEl = userMsgEl.nextElementSibling;
  while (nextEl) {
    const toRemove = nextEl;
    nextEl = nextEl.nextElementSibling;
    toRemove.remove();
  }

  // Find index of this user message among all .chat-msg.user in thread
  const allUserEls = Array.from(thread.querySelectorAll('.chat-msg.user'));
  const userIdx = allUserEls.indexOf(userMsgEl);

  // Slice state.chatMessages up to this user message
  if (userIdx !== -1) {
    let countUsers = 0;
    const newChatMessages = [];
    for (const msg of state.chatMessages) {
      if (msg.role === 'user') {
        if (countUsers === userIdx) {
          newChatMessages.push({ role: 'user', content: userText });
          break;
        }
        countUsers++;
      }
      newChatMessages.push(msg);
    }
    state.chatMessages = newChatMessages;
  } else {
    state.chatMessages = [{ role: 'user', content: userText }];
  }

  const modality = detectQueryModality(state.selectedModel, userText);

  // Append assistant message container
  const assistantMsgEl = document.createElement('div');
  assistantMsgEl.className = 'chat-msg assistant';

  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'msg-bubble playground-loader-bubble';

  // Mount the motion graphic thinking loader
  const loaderObj = createThinkingLoader(modality, userText);
  bubbleEl.appendChild(loaderObj.el);
  assistantMsgEl.appendChild(bubbleEl);
  thread.appendChild(assistantMsgEl);

  history.scrollTop = history.scrollHeight;

  runAssistantStream(assistantMsgEl, bubbleEl, loaderObj, userText, modality);
}

function startInlineUserEdit(userMsgEl, userText, actionBar) {
  const bubble = userMsgEl.querySelector('.msg-bubble');
  if (!bubble) return;

  if (userMsgEl.classList.contains('is-editing')) return;
  userMsgEl.classList.add('is-editing');
  if (actionBar) actionBar.style.display = 'none';

  const originalHtml = bubble.innerHTML;
  const currentText = userMsgEl.dataset.promptText || userText;

  // Replace bubble with editor
  bubble.innerHTML = `
    <div class="user-msg-edit-box">
      <textarea class="user-msg-edit-textarea" rows="1" placeholder="Edit your message..."></textarea>
      <div class="user-msg-edit-actions">
        <button type="button" class="user-msg-btn-cancel">Cancel</button>
        <button type="button" class="user-msg-btn-submit">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
          Send
        </button>
      </div>
    </div>
  `;

  const textarea = bubble.querySelector('.user-msg-edit-textarea');
  const cancelBtn = bubble.querySelector('.user-msg-btn-cancel');
  const submitBtn = bubble.querySelector('.user-msg-btn-submit');

  textarea.value = currentText;

  const cancelEdit = () => {
    userMsgEl.classList.remove('is-editing');
    bubble.innerHTML = originalHtml;
    if (actionBar) actionBar.style.display = '';
  };

  const autoResize = () => {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(Math.max(textarea.scrollHeight, 24), 260) + 'px';
    if (textarea.scrollHeight > 260) {
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }
  };

  textarea.addEventListener('input', autoResize);
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    autoResize();
  }, 30);

  cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    cancelEdit();
  });

  const submitEdit = () => {
    const newText = textarea.value.trim();
    if (!newText) {
      showToast('Message cannot be empty', 'warning');
      return;
    }

    userMsgEl.classList.remove('is-editing');
    userMsgEl.dataset.promptText = newText;
    bubble.innerHTML = escapeHtml(newText);
    if (actionBar) {
      actionBar.style.display = '';
      actionBar.remove();
      createUserActionBar(userMsgEl, newText, new Date());
    }

    retryUserMessage(userMsgEl, newText);
  };

  submitBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    submitEdit();
  });

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitEdit();
    }
  });
}

async function retryChatMessage(promptText, failedAssistantEl = null) {
  if (state.isStreaming) {
    showToast('A message is already generating', 'warning');
    return;
  }

  const history = document.getElementById('chat-history');
  const thread = history?.querySelector('.chat-thread-container');
  if (!thread) return;

  // Remove the previous assistant element if supplied
  if (failedAssistantEl && failedAssistantEl.parentNode) {
    failedAssistantEl.remove();
  }

  // Pop previous assistant message from state.chatMessages if present
  if (state.chatMessages.length && state.chatMessages[state.chatMessages.length - 1].role === 'assistant') {
    state.chatMessages.pop();
  }

  const modality = detectQueryModality(state.selectedModel, promptText);

  // Append fresh assistant message container
  const assistantMsgEl = document.createElement('div');
  assistantMsgEl.className = 'chat-msg assistant';

  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'msg-bubble playground-loader-bubble';

  const loaderObj = createThinkingLoader(modality, promptText);
  bubbleEl.appendChild(loaderObj.el);
  assistantMsgEl.appendChild(bubbleEl);
  thread.appendChild(assistantMsgEl);

  history.scrollTop = history.scrollHeight;

  await runAssistantStream(assistantMsgEl, bubbleEl, loaderObj, promptText, modality);
}

async function runAssistantStream(assistantMsgEl, bubbleEl, loaderObj, userText, modality) {
  const history = document.getElementById('chat-history');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('btn-send-chat');

  state.isStreaming = true;
  if (sendBtn) sendBtn.disabled = true;

  const systemPrompt = document.getElementById('system-prompt-input')?.value.trim();
  const messagesPayload = [];
  if (systemPrompt) {
    messagesPayload.push({ role: 'system', content: systemPrompt });
  }
  messagesPayload.push(...state.chatMessages);

  const temperature = parseFloat(document.getElementById('temp-range')?.value || 0.7);
  const thinkingBudget = parseInt(document.getElementById('thinking-budget-range')?.value || 0, 10);
  const maxTokens = parseInt(document.getElementById('max-tokens-range')?.value || 4096, 10);

  const requestTools = state.toolsEnabled && !!window.SingularityToolSteps;
  let toolGroup = null;
  const ensureToolGroup = () => {
    if (!toolGroup) {
      toolGroup = window.SingularityToolSteps.createGroup();
      assistantMsgEl.insertBefore(toolGroup.root, bubbleEl);
    }
    return toolGroup;
  };

  let fullContent = '';
  let fullReasoning = '';
  let reasoningBox = null;
  const startTime = performance.now();
  let hasTransformedToText = false;

  try {
    const response = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-singularity-artifacts': state.enableArtifacts ? 'true' : 'false',
      },
      body: JSON.stringify({
        model: state.selectedModel,
        messages: messagesPayload,
        temperature: temperature,
        max_tokens: maxTokens,
        thinking_budget: thinkingBudget,
        artifacts: state.enableArtifacts,
        stream: true,
        ...(requestTools ? { singularity_tools: window.SingularityToolSteps.TOOL_NAMES } : {}),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (loaderObj.finish) loaderObj.finish();
      bubbleEl.classList.remove('playground-loader-bubble');
      bubbleEl.innerHTML = `<span style="color: var(--color-error);">Error: ${escapeHtml(errText)}</span>`;
      const elapsed = Math.round(performance.now() - startTime);
      createResponseActionBar(assistantMsgEl, `Error: ${errText}`, userText, state.selectedModel, elapsed, new Date());
      state.isStreaming = false;
      if (sendBtn) sendBtn.disabled = false;
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep remainder

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const rawJson = trimmed.substring(6).trim();
        if (rawJson === '[DONE]') continue;

        try {
          const parsed = JSON.parse(rawJson);
          const delta = parsed.choices?.[0]?.delta || {};

          // Tool loop progress: a step began, a tool started or finished
          if (delta.singularity_event && requestTools) {
            ensureToolGroup().handleEvent(delta.singularity_event);
            history.scrollTop = history.scrollHeight;
          }

          // Reasoning Content Delta
          if (delta.reasoning_content) {
            fullReasoning += delta.reasoning_content;
            if (requestTools) {
              ensureToolGroup().addReasoning(delta.reasoning_content);
            } else {
              if (!reasoningBox) {
                reasoningBox = document.createElement('div');
                reasoningBox.className = 'reasoning-box';
                reasoningBox.innerHTML = `
                  <div class="reasoning-summary">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
                    Thinking Process Trace
                  </div>
                  <div class="reasoning-content"></div>
                `;
                assistantMsgEl.insertBefore(reasoningBox, bubbleEl);
              }
              reasoningBox.querySelector('.reasoning-content').textContent = fullReasoning;
            }
          }

          // Main Content Delta
          if (delta.content) {
            const cleanDelta = delta.content
              .replace(/[※\u203B][^\s]*/g, '')
              .replace(/\bcite[a-zA-Z0-9_]*turn[a-zA-Z0-9_]*\b/gi, '')
              .replace(/\bturn\d+[a-zA-Z0-9_]*\b/gi, '')
              .replace(/[\uE200-\uE20F]message_reaction[\uE200-\uE20F][^\uE200-\uE20F]*[\uE200-\uE20F]/g, '')
              .replace(/[\uE200-\uE20F]/g, '');
            fullContent += cleanDelta;
            if (toolGroup && cleanDelta.trim()) toolGroup.noteAnswerStarted();

            // Stream thinking trace if tag is present (e.g. from models outputting <antThinking>)
            const thinkingMatch = fullContent.match(/<antThinking>([\s\S]*?)(?:<\/antThinking>|$)/i);
            if (thinkingMatch && thinkingMatch[1] && !delta.reasoning_content) {
              const streamedThinking = thinkingMatch[1].trim();
              if (streamedThinking) {
                if (!reasoningBox) {
                  reasoningBox = document.createElement('div');
                  reasoningBox.className = 'reasoning-box';
                  reasoningBox.innerHTML = `
                    <div class="reasoning-summary">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
                      Thinking Process Trace
                    </div>
                    <div class="reasoning-content"></div>
                  `;
                  assistantMsgEl.insertBefore(reasoningBox, bubbleEl);
                }
                const reasoningContentEl = reasoningBox.querySelector('.reasoning-content');
                if (reasoningContentEl) reasoningContentEl.textContent = streamedThinking;
              }
            }

            // Realtime streaming artifact extraction
            const displayContent = convertGenUiToArtifact(fullContent);
            if (state.enableArtifacts && (displayContent.includes('<antArtifact') || fullContent.includes('※genui※'))) {
              handleStreamingArtifact(displayContent, false);
            }

            // Check if chunks contain base64 image or video data
            const isBase64Stream = fullContent.includes('data:image/') || fullContent.includes('data:video/') || /[A-Za-z0-9+/=]{180,}/.test(fullContent);

            if (isBase64Stream) {
              if (loaderObj.updateProgress) {
                loaderObj.updateProgress(92);
              }
            } else {
              if (!hasTransformedToText) {
                hasTransformedToText = true;
                if (loaderObj.finish) loaderObj.finish();
                bubbleEl.classList.remove('playground-loader-bubble');
                bubbleEl.innerHTML = '<div class="chat-md-content"></div>';
              }
              const contentBox = bubbleEl.querySelector('.chat-md-content');
              if (contentBox) {
                contentBox.innerHTML = renderMarkdown(displayContent);
              } else {
                bubbleEl.innerHTML = `<div class="chat-md-content">${renderMarkdown(displayContent)}</div>`;
              }
            }
          }
        } catch (e) {
          // ignore chunk parse errors
        }
      }
      history.scrollTop = history.scrollHeight;
    }

    // Finalize streaming artifact once stream finishes
    const finalDisplayContent = convertGenUiToArtifact(fullContent);
    if (state.enableArtifacts && (finalDisplayContent.includes('<antArtifact') || fullContent.includes('※genui※'))) {
      handleStreamingArtifact(finalDisplayContent, true);
    }

    if (loaderObj.finish) loaderObj.finish();
    bubbleEl.classList.remove('playground-loader-bubble');

    // Finalize tools work group & display sources row if present
    if (toolGroup) {
      toolGroup.finish();
      const sources = toolGroup.sources ? toolGroup.sources() : [];
      if (sources && sources.length && window.SingularityToolSteps) {
        const sourcesRow = window.SingularityToolSteps.renderSourcesRow(sources);
        if (sourcesRow) assistantMsgEl.insertBefore(sourcesRow, bubbleEl.nextSibling);
      }
    }

    const elapsed = Math.round(performance.now() - startTime);
    state.chatMessages.push({ role: 'assistant', content: finalDisplayContent });

    // Parse and render rich interactive media cards (without any raw base64!)
    parseAndRenderMediaContent(assistantMsgEl, bubbleEl, fullContent, fullReasoning, userText, modality);

    // Create Claude-grade interactive response action bar
    createResponseActionBar(assistantMsgEl, fullContent, userText, state.selectedModel, elapsed, new Date());

  } catch (err) {
    if (loaderObj.finish) loaderObj.finish();
    bubbleEl.classList.remove('playground-loader-bubble');
    bubbleEl.innerHTML = `<span style="color: var(--color-error);">Stream Failed: ${escapeHtml(err.message)}</span>`;
    const elapsed = Math.round(performance.now() - startTime);
    createResponseActionBar(assistantMsgEl, `Stream Failed: ${err.message}`, userText, state.selectedModel, elapsed, new Date());
  } finally {
    state.isStreaming = false;
    if (sendBtn && input) sendBtn.disabled = !input.value.trim();
    history.scrollTop = history.scrollHeight;
  }
}

async function sendChatMessage() {
  if (state.isStreaming) return;

  const input = document.getElementById('chat-input');
  const userText = input.value.trim();
  if (!userText) return;

  // Toggle active chat workspace mode & shift dock to left vertical format
  const workspace = document.getElementById('playground-workspace');
  if (workspace) {
    workspace.classList.add('has-messages');
  }
  document.body.classList.add('dock-vertical');
  window.SingularityGlassDock?.updateDockMode(true);

  // Hide the centered playground hero when sending message
  const heroEl = document.getElementById('playground-hero');
  if (heroEl) {
    heroEl.classList.add('hidden');
  }

  input.value = '';
  input.style.height = '24px';

  const history = document.getElementById('chat-history');
  let thread = history.querySelector('.chat-thread-container');
  if (!thread) {
    thread = document.createElement('div');
    thread.className = 'chat-thread-container';
    history.appendChild(thread);
  }

  // Append user message
  const userMsgEl = document.createElement('div');
  userMsgEl.className = 'chat-msg user';
  userMsgEl.dataset.promptText = userText;
  userMsgEl.innerHTML = `<div class="msg-bubble">${escapeHtml(userText)}</div>`;
  createUserActionBar(userMsgEl, userText, new Date());
  thread.appendChild(userMsgEl);

  state.chatMessages.push({ role: 'user', content: userText });

  // Detect modality: 'image', 'video', or 'text'
  const modality = detectQueryModality(state.selectedModel, userText);

  // Append assistant message container
  const assistantMsgEl = document.createElement('div');
  assistantMsgEl.className = 'chat-msg assistant';

  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'msg-bubble playground-loader-bubble';

  // Mount the motion graphic thinking loader
  const loaderObj = createThinkingLoader(modality, userText);
  bubbleEl.appendChild(loaderObj.el);
  assistantMsgEl.appendChild(bubbleEl);
  thread.appendChild(assistantMsgEl);

  history.scrollTop = history.scrollHeight;

  await runAssistantStream(assistantMsgEl, bubbleEl, loaderObj, userText, modality);
}

// ===================================================================
// Copy Endpoint Action
// ===================================================================
function initCopyAction() {
  const btn = document.getElementById('btn-copy-url');
  btn.addEventListener('click', () => {
    const text = document.getElementById('gateway-url-text').textContent;
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied endpoint to clipboard: ' + text, 'success');
    });
  });

  const stChip = document.getElementById('chip-sillytavern');
  if (stChip) {
    stChip.addEventListener('click', () => {
      const urlSpan = document.getElementById('gateway-url-text');
      const base = 'http://localhost:9000/v1';
      if (urlSpan.textContent.endsWith('/chat/completions')) {
        urlSpan.textContent = base;
        stChip.classList.remove('active');
        showToast('Switched to Base URL: ' + base, 'info');
      } else {
        urlSpan.textContent = base + '/chat/completions';
        stChip.classList.add('active');
        showToast('Appended /chat/completions for SillyTavern', 'success');
      }
    });
  }

  const tavChip = document.getElementById('chip-tavern-studio');
  if (tavChip) {
    tavChip.addEventListener('click', () => {
      openTavernStudio();
    });
  }
}

// ===================================================================
// Cloud Tunnel (ngrok Remote Access)
// ===================================================================
async function fetchTunnelStatus() {
  try {
    const res = await fetch('/api/tunnel/status');
    if (!res.ok) return;
    const data = await res.json();
    state.tunnel = data;
    updateTunnelUI();
  } catch (err) {
    console.error('Failed to fetch tunnel status:', err);
  }
}

function updateTunnelUI() {
  const t = state.tunnel || { status: 'offline' };
  const isOnline = t.status === 'online' && !!t.public_url;
  const isInstalled = t.installed !== false;

  // Sidebar badge
  const navBadge = document.getElementById('nav-tunnel-badge');
  if (navBadge) {
    navBadge.textContent = isOnline ? 'ONLINE' : 'OFFLINE';
    navBadge.className = `nav-badge ${isOnline ? 'online' : 'offline'}`;
  }

  // Toggle button text & styles
  const toggleBtn = document.getElementById('btn-toggle-tunnel');
  const toggleBtnText = document.getElementById('btn-toggle-tunnel-text');
  if (toggleBtn && toggleBtnText) {
    if (isOnline) {
      toggleBtn.className = 'btn btn-secondary btn-sm';
      toggleBtnText.textContent = 'Stop Tunnel';
    } else {
      toggleBtn.className = 'btn btn-primary btn-sm';
      toggleBtnText.textContent = isInstalled ? 'Start ngrok Tunnel' : 'Install & Start Tunnel';
    }
  }

  // Install native ngrok button
  const installBtn = document.getElementById('btn-install-tunnel');
  const installBtnText = document.getElementById('btn-install-tunnel-text');
  if (installBtn) {
    if (!isInstalled) {
      installBtn.style.display = 'inline-flex';
      if (installBtnText) {
        installBtnText.textContent = t.is_termux ? 'Install ngrok (Termux Phone)' : 'Install ngrok (Native)';
      }
    } else {
      installBtn.style.display = 'none';
    }
  }

  // URL Display Box & Text
  const urlText = document.getElementById('tunnel-url-text');
  if (urlText) {
    if (isOnline) {
      urlText.textContent = `${t.public_url}/v1/chat/completions`;
    } else {
      if (!isInstalled) {
        urlText.textContent = t.is_termux
          ? '📱 Phone Mode: ngrok not yet installed in Termux — Click "Install ngrok" to install natively!'
          : 'Offline — Click "Install & Start Tunnel" to set up natively for this device';
      } else {
        urlText.textContent = 'Offline — Click "Start ngrok Tunnel" to expose';
      }
    }
  }

  // Authtoken input placeholder
  const tokenInput = document.getElementById('input-ngrok-authtoken');
  if (tokenInput && t.has_authtoken && !tokenInput.value) {
    tokenInput.placeholder = '✓ Authtoken configured (paste new token to update)';
  }

  // Sync ThreeUI rotating typographic globe sphere theme
  syncGlobeTheme(isOnline);
  updateUptimeDisplay();
}

// ===================================================================
// Direct Typographic World Sphere Canvas Engine (In-Site, No Iframe)
// ===================================================================
var globeAnimationId = null;
var globeRunning = false;
var globeCanvas = null;
var globeCtx = null;
var globeWidth = 0;
var globeHeight = 0;
var globeDpr = 1;
var globeInk = '226,228,233';
var globeInk64 = [];
var GLOBE_SOFT = 0.88;

function updateGlobeInk(inkRgb) {
  globeInk = inkRgb || '226,228,233';
  globeInk64 = [];
  for (var q = 0; q < 64; q++) {
    globeInk64.push('rgba(' + globeInk + ',' + ((q / 63) * GLOBE_SOFT).toFixed(4) + ')');
  }
}
updateGlobeInk('226,228,233');

function getGlobeInk(a) {
  return globeInk64[a <= 0 ? 0 : a >= 1 ? 63 : (a * 63) | 0];
}

var GLOBE_QA = (Math.PI * 2) / 64;
function globeQang(a) {
  return Math.round(a / GLOBE_QA) * GLOBE_QA;
}

var GLOBE_LAND_B64 = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPcBAOD/HwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACA//+P//f/LwgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD4/v/4/////wcAAAAEAPABAAAAfAAAAAAAAAAAAAAAAAAAAADg9w/4/////wEAAP4AAAAAAAAA+AAAAAAAAAAAAAAAAAAAAIAG+Of//////wAAAHwGAAAAAAAAAAMAAAAAAAAAAAAAAACABwAc/4P//////wAAADAAAAAAQAAAAD4AAAAAAAAAAAAAAAAAfMbDcQAA/v///wAAAAAAAADABwAA//8HAMAPAAAAAAAAAABgAAAAAAAA/P///wAAAAAAAABwAADg//8AAAAAAAAAAAAAAADwG457dwcA8P//HwAAAAAAAAAYAAD///9/eAAAAAAAAAAAAAD4/g0H/w8A8P//PwAAAAAAAAAOgOv/////fwD/AAAAAAA/AAAA/B84/v8A8P//LwAAAAD4AAAA4PP//////////wAAAOD///H/+D/3cPgDoP//DwAAAID/BwAAx/v/////////P4AA/P///////////////////////w8AAOcBAAgAAAAAAAAAAAAAgP///////////////////////wcAACYAAAQAAAAAAAAAAAAAgf///////////////////////wMM8AAAAAAAAAAAAAAAAAAAIID/////////e+wPwH8AgA8AAP/5z/////////////////8/ANH///////9/AIALgD8AAAAAwH/+//////////////////9/APj///////8fADwAAD8AAAAA8D/+//////////////////sPAPC/+f////8fAPwAADgAAAAA8D/+////////////////D/wBAMCfAP////8PAPwYAAAAAAAA8H/4//////////////9/DgcAAAAcAOD///8/APw/AAAAAAAQAB7w//////////////8BgAMAAAACAMD/////Afh/AAAAAAA4gBz+/////////////38A4AMAAMAAAMD/////B/z/AAAAAABwwAb+/////////////x8A8AEAAAAAAAD/////P///AwAAAADmgOH//////////////z8A4AAAAAAAAAD+////P/7/BwAAAAD28P////////////////8D4AAAAAAAAAD8////f/7/BwAAAADz+f////////////////8HIAAAAAAAAAD6////////BAAAAABw/v////////////////8EAAAAAAAAAADo//////8jHgAAAACA//////////////////8MAAAAAAAAAADQ//////8OPgAAAADw//////////////////8AAAAAAAAAAADg//////+PIAAAAADA////v////////////38EAAAAAAAAAADg////////AAAAAACA//v/zD/8/////////z8AAAAAAAAAAADg//////8bAAAAAACA//N/gD///////////x8GAAAAAAAAAADw//////8AAAAAAAD+B8c/AD/+/////////wcPAAAAAAAAAADg//////8AAAAAAAD+gx4/DH74/////////wABAAAAAAAAAADg/////x8AAAAAAAD+gbCn///8////////fQABAAAAAAAAAADg/////w8AAAAAAAD/gCDn///4//////9/MgADAAAAAAAAAADA/////w8AAAAAAAD+AADm/3/4//////8/cIABAAAAAAAAAADA/////wcAAAAAAAA44AHC///5////////4+ABAAAAAAAAAACA/////wcAAAAAAACI/wEA4P//////////4OgAAAAAAAAAAAAA/////wMAAAAAAAD4/wAA4P//////////ADYAAAAAAAAAAAAA/P///wEAAAAAAAD+/wEA8P//////////AQcAAAAAAAAAAAAA+P//fwAAAAAAAAD//w8P8P//////////AQEAAAAAAAAAAAAAyP//fwAAAAAAAAD//3//////////////AQAAAAAAAAAAAAAA0P+PYQAAAAAAAAD//////z//////////AwAAAAAAAAAAAAAAoP8HwAAAAAAAAMD/////83/+////////AQAAAAAAAAAAAAAAIP8DwAAAAAAAAOD/////5//I////////AAAAAAAAAAAAAAAAQP4DgAAAAAAAAPD/////z/+A////////AAAAAAAAAAAAAAAAAPwDAAIAAAAAAPD/////z/8ZwP////9/AQAAAAAAAAAAAAAAAPgDQAAAAAAAAPj/////j/9/gP////8fAQAAAAAAAAAAAAAAAPADEAMAAAAAAPz/////v///AP9//P8DAAAAAAAAAAAAAAAAAPADAwwAAAAAAPj/////P/9/APw//B8AAAAAAAAAAAAIAAAAAPCHA8AAAAAAAPj/////P/4/APwP+J8BAAAAAAAAAAAAAAAAAMD/A0YEAAAAAPj/////f/4fAPwH+B8AAwAAAAAAAAAAAAAAAAD/AQAAAAAAAPj/////f/wHAPgD8D8AAwAAAAAAAAAAAAAAAADgHwAAAAAAAPj///////wDAPgAwH8AAQAAAAAAAAAAAAAAAADAHwAAAAAAAPz//////30AAPAAwH8AAAAAAAAAAAAAAAAAAAAAHAAAAAAAAPj//////wsAAPAAgH4AAQAAAAAAAAAAAAAAAAAAGEAAAAAAAPj//////wMBAPAAgHwAAAAAAAAAAAAAAAAAAAAAGPAhAAAAAPD///////cBAOAAgDiABAAAAAAAAAAAAAAAAAAAIPl/AAAAAOD///////8AAGABABBAFAAAAAAAAAAAAAAAAAAAgP7/AQAAAMD///////8AAAABgAAAHAAAAAAAAAAAAAAAAAAAAPz/AQAAAID///////8AAAABAAEgCAAAAAAAAAAAAAAAAAAAAPz/HwAAAAD/8P///38AAAAAAANgAAAAAAAAAAAAAAAAAAAAAPz/fwAAAAAAoP///z8AAAAAYAd4AAAAAAAAAAAAAAAAAAAAAPz/fwAAAAAAAP///x8AAAAAwAY8AAAAAAAAAAAAAAAAAAAAAP7//wAAAAAAAP///w8AAAAAgAc+AAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAP///wcAAAAAgIM/TwAAAAAAAAAAAAAAAAAAAP///wEAAAAAgP///wMAAAAAAIc/QAQAAAAAAAAAAAAAAAAAgP///w8AAAAAgP///wEAAAAAAA6fAUQAAAAAAAAAAAAAAAAAAP////8AAAAAAP///wAAAAAAAB6ewuwDAgAAAAAAAAAAAAAAgP////8DAAAAAP7//wAAAAAAABwAAvAPAgAAAAAAAAAAAAAAgP////8PAAAAAPz/fwAAAAAAABAAAMCfAQAAAAAAAAAAAAAAAP////8PAAAAAPz//wAAAAAAAOADAIA/MAAAAAAAAAAAAAAAAP7///8PAAAAAPz/fwAAAAAAAAAPAMBngAAAAAAAAAAAAAAAAP7///8PAAAAAPz//wAAAAAAAAAACABAAAAAAAAAAAAAAAAAAPz///8HAAAAAPj//wAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAPz///8DAAAAAPj//wAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAPj///8BAAAAAPz//4AAAAAAAAAAAB8GAAAAAAAAAAAAAAAAAPj///8BAAAAAPz//8EAAAAAAAAAIB8OAAAAAAAAAAAAAAAAAPD///8BAAAAAP7//+AAAAAAAAAA+B8OACAAAAAAAAAAAAAAAMD///8BAAAAAP7/f/gAAAAAAAAA/H8eAAAAAAAAAAAAAAAAAID///8AAAAAAP7/H/gAAAAAAAAA/P8fAABAAAAAAAAAAAAAAAD///8AAAAAAPz/D3AAAAAAAAAA/v8/AAAAAAAAAAAAAAAAAAD///8AAAAAAPj/D3gAAAAAAADA//9/AAgAAAAAAAAAAAAAAAD//38AAAAAAPj/DzgAAAAAAADw////AAAAAAAAAAAAAAAAAAD//x8AAAAAAPD/DzgAAAAAAAD4////AQAAAAAAAAAAAAAAAAD//wMAAAAAAPD/DzgAAAAAAAD4////AwAAAAAAAAAAAAAAAID//wEAAAAAAPD/AwAAAAAAAAD4////AwAAAAAAAAAAAAAAAID//wEAAAAAAPD/AwAAAAAAAAD4////BwAAAAAAAAAAAAAAAID//wEAAAAAAOD/AwAAAAAAAAD4////BwAAAAAAAAAAAAAAAID//wAAAAAAAOD/AQAAAAAAAADw////BwAAAAAAAAAAAAAAAID//wAAAAAAAMD/AAAAAAAAAADw////AwAAAAAAAAAAAAAAAID/fwAAAAAAAIB/AAAAAAAAAADgf/z/AwAAAAAAAAAAAAAAAID/PwAAAAAAAIA/AAAAAAAAAADgB/D/AQAAAAAAAAAAAAAAAMD/HQAAAAAAAIABAAAAAAAAAADwAND/AQAAAAAAAAAAAAAAAMD/AwAAAAAAAAAAAAAAAAAAAAAAAID/AAAIAAAAAAAAAAAAAMD/BwAAAAAAAAAAAAAAAAAAAAAAAAD/AAAQAAAAAAAAAAAAAOD/AwAAAAAAAAAAAAAAAAAAAAAAAAA+AABwAAAAAAAAAAAAAOA/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAOA/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAOAPAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAGAAAAAAAAAAAAAMAPAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAADAAAAAAAAAAAAAPAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMABAAAAAAAAAAAAAPADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOABAAAAAAAAAAAAAPAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPADAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAPABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPCBAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAcAAAAAAAAAAAAAAA+AABAAJ8//j8PAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAPD/fwD///////8/AAAAAAAAAAAAAAAAAIA+AAAAAAAAAAAAPP///8D/////////HwAAAAAAAAAAAAAAAIA9AAAAAAAA8Pz/////P/j//////////wMAAAAAAAAAAMAAAPB9AAAAAID/////////P/7///////////8BAAAAAAAAAOABAwB/AAAAAPD///////////////////////8AAAAAAFACPoD///9/AAAAAPD//////////////////////x8AAAAA+P////////8HAAAAAP///////////////////////wcAAAAA/v///////wMAAAAA/v///////////////////////wcAAAD8/////////w8AAA7w/////////////////////////w8AAMAB/////////wMAgB84/////////////////////////wEAAAAA/P///////3/w4AcA/////////////////////////wAAAADg//////////8/gM///////////////////////////wMAAADg/////////////f///////////////////////////z8A7wMA/v////////////////////////////////////////8/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

var globeNodes = [];
(function initGlobeNodes() {
  var MW = 288, MH = 144;
  var bin = atob(GLOBE_LAND_B64);
  var land = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) land[i] = bin.charCodeAt(i);

  function isLand(lon, lat) {
    var gx = Math.floor(((lon + 180) / 360) * MW);
    var gy = Math.floor(((90 - lat) / 180) * MH);
    if (gx < 0 || gx >= MW || gy < 0 || gy >= MH) return false;
    var b = gy * MW + gx;
    return (land[b >> 3] >> (b & 7)) & 1;
  }

  var PHRASE = "everypointonthisballisapathbacktoanotherone";
  var LAT_STEP = 3.05;
  var k = 0, run = 0, sea3 = 0;
  for (var lat = -86; lat <= 86; lat += LAT_STEP) {
    var rl = Math.cos((lat * Math.PI) / 180);
    var n = Math.max(1, Math.round(98 * rl));
    for (var i = 0; i < n; i++) {
      var lon = -180 + (360 * i) / n;
      var l = isLand(lon, lat);
      if (!l && sea3++ % 2) continue;
      var letter = 0;
      if (l && run++ % 2 === 0) letter = PHRASE.charAt(k++ % PHRASE.length);
      globeNodes.push({
        lat: (lat * Math.PI) / 180,
        lon: (lon * Math.PI) / 180,
        land: l,
        c: letter,
      });
    }
  }
})();

var globeSpin = 2.1;
var globeVel = 0.20;
var globeTilt = -0.26;
var globeLand8 = [];
var globeSea = [];
var globeSoil = [];
var globePrevTime = performance.now();

function resizeGlobeCanvas() {
  if (!globeCanvas) {
    globeCanvas = document.getElementById('tunnel-globe-canvas');
    if (globeCanvas) globeCtx = globeCanvas.getContext('2d');
  }
  if (!globeCanvas) return;
  var parent = globeCanvas.parentElement;
  var rect = parent ? parent.getBoundingClientRect() : globeCanvas.getBoundingClientRect();
  globeDpr = Math.min(2, window.devicePixelRatio || 1);
  var w = Math.round(rect.width || (parent ? parent.clientWidth : 0) || window.innerWidth || 800);
  var h = Math.round(rect.height || (parent ? parent.clientHeight : 0) || 500);
  if (w > 0 && h > 0) {
    globeWidth = w;
    globeHeight = h;
    if (globeCanvas.width !== Math.round(w * globeDpr) || globeCanvas.height !== Math.round(h * globeDpr)) {
      globeCanvas.width = Math.round(w * globeDpr);
      globeCanvas.height = Math.round(h * globeDpr);
    }
  }
}

function drawGlobeFrame(now) {
  if (!globeRunning) return;

  if (!globeCanvas || !globeCtx) {
    globeCanvas = document.getElementById('tunnel-globe-canvas');
    if (globeCanvas) globeCtx = globeCanvas.getContext('2d');
  }

  if (!globeCtx) {
    globeAnimationId = requestAnimationFrame(drawGlobeFrame);
    return;
  }

  if (globeWidth <= 0 || globeHeight <= 0) {
    resizeGlobeCanvas();
  }

  // Keep RAF loop constantly running when globeRunning is true
  globeAnimationId = requestAnimationFrame(drawGlobeFrame);

  if (globeWidth <= 0 || globeHeight <= 0) return;

  var dt = Math.min(64, now - globePrevTime);
  globePrevTime = now;

  globeCtx.setTransform(globeDpr, 0, 0, globeDpr, 0, 0);
  globeCtx.clearRect(0, 0, globeWidth, globeHeight);

  globeSpin += (globeVel * dt) / 1000;

  // Whole, majestic 3D sphere centered vertically and horizontally with NO cut-off lines
  var availableHalfHeight = Math.max(80, (globeHeight / 2) - 4);
  var availableHalfWidth = Math.max(80, (globeWidth / 2) - 4);
  var R = Math.min(availableHalfWidth, availableHalfHeight);
  var cx = globeWidth / 2;
  var cy = globeHeight / 2;
  var fs = R * 0.076;

  var cs = Math.cos(globeSpin), sn = Math.sin(globeSpin);
  var ct = Math.cos(globeTilt), st = Math.sin(globeTilt);

  globeCtx.textAlign = 'center';
  globeCtx.textBaseline = 'middle';

  globeSea.length = 0;
  globeSoil.length = 0;

  for (var i = 0; i < globeNodes.length; i++) {
    var nd = globeNodes[i];
    var cl = Math.cos(nd.lat);
    var x0 = cl * Math.cos(nd.lon), y0 = Math.sin(nd.lat), z0 = cl * Math.sin(nd.lon);
    var x1 = x0 * cs - z0 * sn, z1 = x0 * sn + z0 * cs;
    var y2 = y0 * ct - z1 * st, z2 = y0 * st + z1 * ct;
    if (z2 <= 0.02) continue;

    var px = cx + x1 * R, py = cy - y2 * R;
    if (!nd.land) {
      globeSea.push(px, py, Math.min(0.999, z2));
      continue;
    }
    if (!nd.c) {
      globeSoil.push(px, py, Math.min(0.999, z2));
      continue;
    }

    var tx0 = -Math.sin(nd.lon), tz0 = Math.cos(nd.lon);
    var tx1 = tx0 * cs - tz0 * sn, tz1 = tx0 * sn + tz0 * cs;
    var ang = globeQang(Math.atan2(tz1 * st, tx1));
    var b = Math.min(7, Math.max(0, ((Math.min(0.999, z2) * 7.99) | 0)));
    (globeLand8[b] || (globeLand8[b] = [])).push(px, py, ang, nd.c);
  }

  var dmin = Math.max(0.7, R * 0.0065);
  function dots(list, base, gain, grow) {
    for (var lvl = 0; lvl < 6; lvl++) {
      var z = (lvl + 0.5) / 6, dsz = dmin * grow * (0.55 + 0.75 * z);
      globeCtx.fillStyle = getGlobeInk(base + gain * z);
      globeCtx.beginPath();
      for (var q = 0; q < list.length; q += 3) {
        var lv = list[q + 2] >= 1 ? 5 : (list[q + 2] * 6) | 0;
        if (lv !== lvl) continue;
        globeCtx.rect(list[q] - dsz / 2, list[q + 1] - dsz / 2, dsz, dsz);
      }
      globeCtx.fill();
    }
  }
  dots(globeSea, 0.10, 0.22, 1.0);
  dots(globeSoil, 0.34, 0.46, 1.7);

  var FACE = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
  for (var bi = 0; bi < 8; bi++) {
    var arr = globeLand8[bi];
    if (!arr || !arr.length) continue;
    var zb = (bi + 0.5) / 8;
    globeCtx.font = 'bold ' + (fs * (0.42 + 0.58 * zb)).toFixed(2) + 'px ' + FACE;
    globeCtx.fillStyle = getGlobeInk(0.28 + 0.72 * Math.pow(zb, 0.6));
    for (var t = 0; t < arr.length; t += 4) {
      globeCtx.save();
      globeCtx.translate(arr[t], arr[t + 1]);
      globeCtx.rotate(arr[t + 2]);
      globeCtx.fillText(arr[t + 3], 0, 0);
      globeCtx.restore();
    }
    arr.length = 0;
  }
}

function startGlobeAnimation() {
  globeRunning = true;
  globePrevTime = performance.now();
  resizeGlobeCanvas();
  if (!globeAnimationId) {
    globeAnimationId = requestAnimationFrame(drawGlobeFrame);
  }
}

function stopGlobeAnimation() {
  globeRunning = false;
  if (typeof globeAnimationId !== 'undefined' && globeAnimationId) {
    cancelAnimationFrame(globeAnimationId);
    globeAnimationId = null;
  }
}

function initTunnelGlobe() {
  globeCanvas = document.getElementById('tunnel-globe-canvas');
  if (!globeCanvas) return;
  globeCtx = globeCanvas.getContext('2d');

  var isOnline = state.tunnel && state.tunnel.status === 'online';
  syncGlobeTheme(isOnline);

  resizeGlobeCanvas();
  setTimeout(resizeGlobeCanvas, 60);
  setTimeout(resizeGlobeCanvas, 200);

  if (window.ResizeObserver && globeCanvas.parentElement && !globeCanvas._ro) {
    var ro = new ResizeObserver(function() {
      if (globeRunning) {
        resizeGlobeCanvas();
      }
    });
    ro.observe(globeCanvas.parentElement);
    globeCanvas._ro = ro;
  }

  startGlobeAnimation();
}

function syncGlobeTheme(isOnline) {
  var isDark = (document.documentElement.getAttribute('data-theme') || document.body.getAttribute('data-theme')) !== 'light';
  var ink;
  if (isOnline) {
    ink = '219,125,37'; // #db7d25 (replacing terracotta orange)
  } else {
    ink = isDark ? '226,228,233' : '45,45,45';
  }
  updateGlobeInk(ink);
}

window.addEventListener('resize', function() {
  if (globeRunning) {
    resizeGlobeCanvas();
  }
});

async function installNativeNgrok() {
  const btn = document.getElementById('btn-install-tunnel');
  const btnText = document.getElementById('btn-install-tunnel-text');
  const origText = btnText ? btnText.textContent : 'Install ngrok';
  if (btnText) btnText.textContent = 'Installing...';
  if (btn) btn.disabled = true;

  try {
    showToast('Downloading and installing native ngrok binary for this device...', 'info');
    const res = await fetch('/api/tunnel/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: false }),
    });
    const data = await res.json();
    if (data.status === 'ok') {
      showToast(data.message || 'ngrok installed natively!', 'success');
    } else {
      showToast(data.message || 'Installation failed', 'error');
    }
    await fetchTunnelStatus();
  } catch (err) {
    showToast(`Install error: ${err.message}`, 'error');
    await fetchTunnelStatus();
  } finally {
    if (btnText) btnText.textContent = origText;
    if (btn) btn.disabled = false;
  }
}

async function toggleTunnel() {
  const isOnline = state.tunnel && state.tunnel.status === 'online';
  const isInstalled = state.tunnel && state.tunnel.installed !== false;
  const endpoint = isOnline ? '/api/tunnel/stop' : '/api/tunnel/start';
  const toggleBtnText = document.getElementById('btn-toggle-tunnel-text');

  if (toggleBtnText) {
    toggleBtnText.textContent = isOnline ? 'Stopping...' : (!isInstalled ? 'Installing & Starting...' : 'Starting...');
  }

  try {
    if (!isOnline && !isInstalled) {
      showToast('Installing native ngrok binary for this device and starting tunnel...', 'info');
    } else {
      showToast(isOnline ? 'Stopping ngrok tunnel...' : 'Starting ngrok tunnel on port 9000...', 'info');
    }
    const res = await fetch(endpoint, { method: 'POST' });
    const data = await res.json();

    if (data.status === 'error') {
      showToast(data.message || 'Tunnel operation failed', 'error');
    } else if (data.status === 'online') {
      showToast(`Tunnel active: ${data.public_url} (log in there with the key from ./singular key)`, 'success');
    } else if (data.status === 'offline') {
      showToast('ngrok tunnel stopped successfully', 'info');
    }
    await fetchTunnelStatus();
  } catch (err) {
    showToast(`Tunnel error: ${err.message}`, 'error');
    await fetchTunnelStatus();
  }
}

async function saveNgrokAuthtoken() {
  const input = document.getElementById('input-ngrok-authtoken');
  if (!input) return;
  const token = input.value.trim();
  if (!token) {
    showToast('Please paste an ngrok authtoken first.', 'error');
    return;
  }

  try {
    showToast('Saving ngrok authtoken...', 'info');
    const res = await fetch('/api/tunnel/authtoken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authtoken: token })
    });
    const data = await res.json();
    if (data.status === 'error') {
      showToast(data.message || 'Failed to save authtoken', 'error');
    } else {
      showToast('ngrok authtoken configured successfully!', 'success');
      input.value = '';
      await fetchTunnelStatus();
    }
  } catch (err) {
    showToast(`Failed to configure token: ${err.message}`, 'error');
  }
}

function initTunnelControls() {
  const btnToggle = document.getElementById('btn-toggle-tunnel');
  if (btnToggle) {
    btnToggle.addEventListener('click', toggleTunnel);
  }

  const btnRefresh = document.getElementById('btn-refresh-tunnel');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      showToast('Refreshing tunnel status...', 'info');
      fetchTunnelStatus();
    });
  }

  const btnInstall = document.getElementById('btn-install-tunnel');
  if (btnInstall) {
    btnInstall.addEventListener('click', installNativeNgrok);
  }

  const btnCopy = document.getElementById('btn-copy-tunnel-url');
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const urlText = document.getElementById('tunnel-url-text');
      const text = urlText ? urlText.textContent : '';
      if (!text || text.startsWith('Offline')) {
        showToast('Start ngrok tunnel first to get an endpoint', 'info');
        return;
      }
      navigator.clipboard.writeText(text).then(() => {
        showToast('Copied endpoint to clipboard: ' + text, 'success');
      });
    });
  }

  const btnSaveToken = document.getElementById('btn-save-authtoken');
  if (btnSaveToken) {
    btnSaveToken.addEventListener('click', saveNgrokAuthtoken);
  }

  initTunnelGlobe();
  startUptimeTracker();
}

// Skiper37-Inspired Live Server Uptime Tracker
var STORAGE_TUNNEL_START_KEY = 'singularity_tunnel_started_at';
var uptimeInterval = null;
var tunnelUptimeStart = null;

// Read cached start time immediately so timer starts without resetting on page refresh
try {
  var cachedStart = localStorage.getItem(STORAGE_TUNNEL_START_KEY);
  if (cachedStart) {
    var parsedStart = parseInt(cachedStart, 10);
    if (!isNaN(parsedStart) && parsedStart > 0 && parsedStart <= Date.now()) {
      tunnelUptimeStart = parsedStart;
    }
  }
} catch (e) {}

function setSkiper37Digit(colName, nextDigit) {
  var col = document.querySelector('.skiper37-digit-col[data-col="' + colName + '"]');
  if (!col) return;
  var track = col.querySelector('.skiper37-digit-track');
  if (!track) return;

  var currentDigitStr = col.dataset.currentDigit;
  var targetDigit = parseInt(nextDigit, 10);
  if (isNaN(targetDigit)) targetDigit = 0;

  var itemHeight = 42;
  var firstSpan = track.querySelector('span');
  if (firstSpan && firstSpan.offsetHeight > 0) {
    itemHeight = firstSpan.offsetHeight;
  }

  // Initial load without transition
  if (currentDigitStr === undefined || currentDigitStr === null || currentDigitStr === '') {
    track.style.transition = 'none';
    track.style.transform = 'translateY(' + (-targetDigit * itemHeight) + 'px)';
    col.dataset.currentDigit = String(targetDigit);
    return;
  }

  var currentDigit = parseInt(currentDigitStr, 10);
  if (currentDigit === targetDigit) return;

  // Skiper37 / NumberFlow smooth forward roll:
  // Moving 9 -> 0 rolls forward to index 10 (the bottom 0 span),
  // then after the animation completes, snaps back to 0 without transition.
  if (currentDigit === 9 && targetDigit === 0) {
    track.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
    track.style.transform = 'translateY(' + (-10 * itemHeight) + 'px)';
    col.dataset.currentDigit = '0';
    setTimeout(function() {
      if (col.dataset.currentDigit === '0') {
        track.style.transition = 'none';
        track.style.transform = 'translateY(0px)';
        void track.offsetHeight;
      }
    }, 480);
  } else {
    track.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
    track.style.transform = 'translateY(' + (-targetDigit * itemHeight) + 'px)';
    col.dataset.currentDigit = String(targetDigit);
  }
}

function updateUptimeDisplay() {
  var t = state.tunnel;

  if (t && t.status === 'online') {
    var accurateStart = null;
    if (t.started_at) {
      accurateStart = Math.floor(t.started_at * 1000);
    } else if (t.uptime_seconds) {
      accurateStart = Date.now() - (t.uptime_seconds * 1000);
    }

    if (accurateStart && (!tunnelUptimeStart || Math.abs(tunnelUptimeStart - accurateStart) > 2000)) {
      tunnelUptimeStart = accurateStart;
      try {
        localStorage.setItem(STORAGE_TUNNEL_START_KEY, String(accurateStart));
      } catch (e) {}
    } else if (!tunnelUptimeStart) {
      tunnelUptimeStart = accurateStart || Date.now();
      try {
        localStorage.setItem(STORAGE_TUNNEL_START_KEY, String(tunnelUptimeStart));
      } catch (e) {}
    }
  } else if (t && t.status !== 'online') {
    tunnelUptimeStart = null;
    try {
      localStorage.removeItem(STORAGE_TUNNEL_START_KEY);
    } catch (e) {}
    setSkiper37Digit('h0', 0);
    setSkiper37Digit('h1', 0);
    setSkiper37Digit('m0', 0);
    setSkiper37Digit('m1', 0);
    setSkiper37Digit('s0', 0);
    setSkiper37Digit('s1', 0);
    return;
  }

  if (!tunnelUptimeStart) {
    setSkiper37Digit('h0', 0);
    setSkiper37Digit('h1', 0);
    setSkiper37Digit('m0', 0);
    setSkiper37Digit('m1', 0);
    setSkiper37Digit('s0', 0);
    setSkiper37Digit('s1', 0);
    return;
  }

  var elapsedMs = Math.max(0, Date.now() - tunnelUptimeStart);
  var totalSec = Math.floor(elapsedMs / 1000);
  var hrs = Math.floor(totalSec / 3600);
  var mins = Math.floor((totalSec % 3600) / 60);
  var secs = totalSec % 60;

  var h0 = Math.floor(hrs / 10) % 10;
  var h1 = hrs % 10;
  var m0 = Math.floor(mins / 10);
  var m1 = mins % 10;
  var s0 = Math.floor(secs / 10);
  var s1 = secs % 10;

  setSkiper37Digit('h0', h0);
  setSkiper37Digit('h1', h1);
  setSkiper37Digit('m0', m0);
  setSkiper37Digit('m1', m1);
  setSkiper37Digit('s0', s0);
  setSkiper37Digit('s1', s1);
}

function startUptimeTracker() {
  updateUptimeDisplay();
  if (!uptimeInterval) {
    uptimeInterval = setInterval(updateUptimeDisplay, 1000);
  }
}

function stopUptimeTracker() {
  if (uptimeInterval) {
    clearInterval(uptimeInterval);
    uptimeInterval = null;
  }
}

// ===================================================================
// VengeanceUI Testimonials Card Stack Controller (Ngrok Key Guide)
// ===================================================================
var GUIDE_STEPS = [
  {
    id: 1,
    title: "1. Create Free Account",
    description: "Sign up at <a href=\"https://dashboard.ngrok.com\" target=\"_blank\" rel=\"noopener noreferrer\">dashboard.ngrok.com</a> to access your private tunnel credentials.",
    url: "https://dashboard.ngrok.com",
    svg: `<svg viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1f1a14"/>
          <stop offset="100%" stop-color="#0e0e11"/>
        </linearGradient>
        <linearGradient id="vog1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#db7d25"/>
          <stop offset="100%" stop-color="#f59e0b"/>
        </linearGradient>
      </defs>
      <rect width="160" height="160" fill="url(#vg1)"/>
      <circle cx="80" cy="65" r="44" fill="#db7d25" opacity="0.08"/>
      <circle cx="80" cy="65" r="30" fill="none" stroke="#db7d25" stroke-width="1.5" stroke-dasharray="3 3"/>
      <path d="M80 46 A11 11 0 1 0 80 68 A11 11 0 1 0 80 46 Z M65 82 C65 72 72 68 80 68 C88 68 95 72 95 82 Z" fill="url(#vog1)"/>
      <rect x="18" y="116" width="124" height="24" rx="6" fill="#18181b" stroke="#27272a" stroke-width="1"/>
      <text x="80" y="132" fill="#db7d25" font-family="monospace" font-size="8.5" font-weight="700" text-anchor="middle" letter-spacing="0.8">DASHBOARD.NGROK.COM ↗</text>
    </svg>`,
    image: null
  },
  {
    id: 2,
    title: "2. Your Authtoken",
    description: "Navigate to 'Your Authtoken' under Getting Started in the left dashboard sidebar.",
    svg: `<svg viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vg2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1a1c23"/>
          <stop offset="100%" stop-color="#0d0e12"/>
        </linearGradient>
      </defs>
      <rect width="160" height="160" fill="url(#vg2)"/>
      <rect x="18" y="24" width="46" height="112" rx="6" fill="#141417" stroke="#27272a" stroke-width="1"/>
      <line x1="24" y1="36" x2="52" y2="36" stroke="#52525b" stroke-width="2" stroke-linecap="round"/>
      <line x1="24" y1="46" x2="44" y2="46" stroke="#3f3f46" stroke-width="2" stroke-linecap="round"/>
      <rect x="22" y="56" width="38" height="16" rx="4" fill="rgba(219, 125, 37, 0.2)" stroke="#db7d25" stroke-width="1"/>
      <line x1="26" y1="64" x2="52" y2="64" stroke="#db7d25" stroke-width="2" stroke-linecap="round"/>
      <line x1="24" y1="82" x2="48" y2="82" stroke="#3f3f46" stroke-width="2" stroke-linecap="round"/>
      <circle cx="110" cy="74" r="28" fill="#db7d25" opacity="0.12"/>
      <path d="M104 62 A10 10 0 1 0 114 78 L122 86 L128 86 L128 80 L124 80 L124 76 L116 68 A10 10 0 0 0 104 62 Z M102 68 A3 3 0 1 1 108 68 A3 3 0 1 1 102 68 Z" fill="#db7d25"/>
    </svg>`,
    image: null
  },
  {
    id: 3,
    title: "3. Copy Secret Token",
    description: "Click the 'Copy' button beside your authtoken string to copy it to clipboard.",
    svg: `<svg viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vg3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#181a17"/>
          <stop offset="100%" stop-color="#0d0f0d"/>
        </linearGradient>
      </defs>
      <rect width="160" height="160" fill="url(#vg3)"/>
      <rect x="18" y="52" width="124" height="42" rx="8" fill="#131514" stroke="#27272a" stroke-width="1.2"/>
      <text x="26" y="76" fill="#a1a1aa" font-family="monospace" font-size="11" letter-spacing="2">2tX•••••••••</text>
      <rect x="108" y="58" width="28" height="30" rx="6" fill="rgba(219, 125, 37, 0.22)" stroke="#db7d25" stroke-width="1"/>
      <path d="M117 73 L121 77 L128 68" fill="none" stroke="#db7d25" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="80" cy="122" r="12" fill="#10b981" opacity="0.15"/>
      <text x="80" y="126" fill="#10b981" font-family="monospace" font-size="9" font-weight="700" text-anchor="middle">TOKEN READY</text>
    </svg>`,
    image: null
  },
  {
    id: 4,
    title: "4. Paste & Save",
    description: "Paste it into the Authtoken field above and click 'Save Token' to activate.",
    svg: `<svg viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vg4" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#211710"/>
          <stop offset="100%" stop-color="#0f0c0a"/>
        </linearGradient>
      </defs>
      <rect width="160" height="160" fill="url(#vg4)"/>
      <circle cx="80" cy="62" r="32" fill="#db7d25" opacity="0.12"/>
      <path d="M60 62 L74 62 M86 62 L100 62" stroke="#db7d25" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="2 3"/>
      <circle cx="56" cy="62" r="5" fill="#db7d25"/>
      <circle cx="80" cy="62" r="7" fill="#10b981"/>
      <circle cx="104" cy="62" r="5" fill="#db7d25"/>
      <rect x="36" y="112" width="88" height="26" rx="6" fill="#db7d25"/>
      <text x="80" y="128" fill="#ffffff" font-family="sans-serif" font-size="10" font-weight="700" text-anchor="middle" letter-spacing="0.5">SAVE TOKEN</text>
    </svg>`,
    image: null
  }
];

var guideActiveIndex = 0;
var guideRotations = [4, -2, -9, 7];
var guideIsAnimating = false;

function buildGuideTransform(x, y, z, rotDeg, scaleVal) {
  return 'translate3d(' + x + 'px, ' + y + 'px, ' + z + 'px) rotateZ(' + rotDeg + 'deg) scale(' + scaleVal + ')';
}

function initGuideCardsDOM() {
  var stackEl = document.getElementById('guide-card-stack');
  if (!stackEl) return;

  if (stackEl.children.length !== GUIDE_STEPS.length) {
    stackEl.innerHTML = '';
    GUIDE_STEPS.forEach(function(step, index) {
      var card = document.createElement('div');
      card.className = 'guide-card-item';
      card.dataset.index = index;
      if (step.url) {
        card.dataset.hasUrl = 'true';
        card.setAttribute('title', 'Click to open ' + step.url.replace(/^https?:\/\//, ''));
      }

      var innerHtml = '';
      if (step.image) {
        innerHtml = '<img src="' + step.image + '" alt="' + step.title + '" draggable="false">';
      } else if (step.svg) {
        innerHtml = step.svg;
      }

      if (step.url) {
        card.innerHTML = '<a href="' + step.url + '" target="_blank" rel="noopener noreferrer" class="guide-card-link" aria-label="' + step.title + '">' + innerHtml + '</a>';
      } else {
        card.innerHTML = innerHtml;
      }

      card.addEventListener('click', function(e) {
        if (guideIsAnimating) {
          e.preventDefault();
          return;
        }
        if (index === guideActiveIndex) {
          if (step.url) {
            window.open(step.url, '_blank', 'noopener,noreferrer');
            e.preventDefault();
          }
        } else {
          e.preventDefault();
          animateGuideDeck(index, index > guideActiveIndex ? 1 : -1);
        }
      });
      stackEl.appendChild(card);
    });
  }
}

function setGuideCardsStatic() {
  var stackEl = document.getElementById('guide-card-stack');
  if (!stackEl) return;
  var cards = stackEl.querySelectorAll('.guide-card-item');

  cards.forEach(function(card, index) {
    var offset = index - guideActiveIndex;
    var rot = guideRotations[index % 4];

    if (offset === 0) {
      card.style.transform = buildGuideTransform(0, 0, 0, 0, 1);
      card.style.opacity = '1';
      card.style.zIndex = '100';
      card.style.pointerEvents = 'auto';
    } else if (offset > 0) {
      var x = offset * 15;
      var y = Math.abs(offset) * 6;
      var z = -150 * Math.abs(offset);
      var scale = Math.max(0.65, 0.85 - Math.abs(offset) * 0.04);
      var opacity = offset === 1 ? 0.55 : (offset === 2 ? 0.35 : 0);
      card.style.transform = buildGuideTransform(x, y, z, rot, scale);
      card.style.opacity = String(opacity);
      card.style.zIndex = String(10 - Math.abs(offset));
      card.style.pointerEvents = 'auto';
    } else {
      card.style.transform = buildGuideTransform(-250, 0, -260, -10, 0.75);
      card.style.opacity = '0';
      card.style.zIndex = '0';
      card.style.pointerEvents = 'none';
    }
  });

  var currentStep = GUIDE_STEPS[guideActiveIndex];
  var counterEl = document.getElementById('guide-deck-counter');
  var titleEl = document.getElementById('guide-deck-title');
  var descEl = document.getElementById('guide-deck-desc');
  var btnPrev = document.getElementById('btn-guide-prev');
  var btnNext = document.getElementById('btn-guide-next');

  if (counterEl) counterEl.textContent = (guideActiveIndex + 1) + ' / ' + GUIDE_STEPS.length;
  if (titleEl) titleEl.textContent = currentStep.title;
  if (descEl) descEl.innerHTML = currentStep.description;
  if (btnPrev) btnPrev.disabled = (guideActiveIndex === 0);
  if (btnNext) btnNext.disabled = (guideActiveIndex === GUIDE_STEPS.length - 1);
}

function animateGuideDeck(targetIndex, direction) {
  if (guideIsAnimating) return;
  if (targetIndex === guideActiveIndex) return;
  if (targetIndex < 0 || targetIndex >= GUIDE_STEPS.length) return;

  var prevIndex = guideActiveIndex;
  var dir = direction !== undefined ? direction : (targetIndex > prevIndex ? 1 : -1);
  guideActiveIndex = targetIndex;
  guideIsAnimating = true;

  var currentStep = GUIDE_STEPS[guideActiveIndex];
  var counterEl = document.getElementById('guide-deck-counter');
  var titleEl = document.getElementById('guide-deck-title');
  var descEl = document.getElementById('guide-deck-desc');
  var btnPrev = document.getElementById('btn-guide-prev');
  var btnNext = document.getElementById('btn-guide-next');

  if (counterEl) counterEl.textContent = (guideActiveIndex + 1) + ' / ' + GUIDE_STEPS.length;
  if (btnPrev) btnPrev.disabled = (guideActiveIndex === 0);
  if (btnNext) btnNext.disabled = (guideActiveIndex === GUIDE_STEPS.length - 1);

  // Animate Text Area (VengeanceUI AnimatePresence mode="wait")
  var textWrapper = document.querySelector('.guide-deck-text');
  if (textWrapper && titleEl && descEl) {
    textWrapper.animate([
      { opacity: 1, transform: 'translateY(0px)' },
      { opacity: 0, transform: 'translateY(' + (dir === 1 ? -25 : 25) + 'px)' }
    ], {
      duration: 200,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards'
    }).onfinish = function() {
      titleEl.textContent = currentStep.title;
      descEl.innerHTML = currentStep.description;
      textWrapper.animate([
        { opacity: 0, transform: 'translateY(' + (dir === 1 ? 25 : -25) + 'px)' },
        { opacity: 1, transform: 'translateY(0px)' }
      ], {
        duration: 350,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards'
      });
    };
  }

  // Exact VengeanceUI 3D Animation Physics (750ms, cubic-bezier(0.22, 1, 0.36, 1))
  var stackEl = document.getElementById('guide-card-stack');
  if (!stackEl) {
    guideIsAnimating = false;
    return;
  }
  var cards = stackEl.querySelectorAll('.guide-card-item');

  cards.forEach(function(card, index) {
    var prevOffset = index - prevIndex;
    var newOffset = index - guideActiveIndex;
    var rot = guideRotations[index % 4];

    // 1. Exiting card
    if (prevOffset === 0 && newOffset !== 0) {
      card.style.zIndex = '80';
      var exitX = dir === 1 ? -250 : 250;
      var exitZ = -260;
      var exitRot = dir === 1 ? -10 : 10;
      var exitScale = 0.75;

      var exitAnim = card.animate([
        {
          transform: buildGuideTransform(0, 0, 0, 0, 1),
          opacity: 1
        },
        {
          transform: buildGuideTransform(exitX, 0, exitZ, exitRot, exitScale),
          opacity: 0
        }
      ], {
        duration: 750,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards'
      });

      exitAnim.onfinish = function() {
        var finalX = newOffset * 15;
        var finalY = Math.abs(newOffset) * 6;
        var finalZ = -150 * Math.abs(newOffset);
        var finalScale = Math.max(0.65, 0.85 - Math.abs(newOffset) * 0.04);
        var finalOpacity = newOffset > 0 ? (newOffset === 1 ? 0.55 : 0.35) : 0;
        card.style.transform = buildGuideTransform(finalX, finalY, finalZ, rot, finalScale);
        card.style.opacity = String(finalOpacity);
        card.style.zIndex = String(Math.max(1, 10 - Math.abs(newOffset)));
        card.style.pointerEvents = newOffset > 0 ? 'auto' : 'none';
      };
      return;
    }

    // 2. Incoming card (the signature 3-keyframe 3D swoop)
    if (newOffset === 0) {
      card.style.zIndex = '100';
      card.style.pointerEvents = 'auto';

      var startX = prevOffset * 15;
      var startY = Math.abs(prevOffset) * 6;
      var startZ = -150 * Math.abs(prevOffset);
      var startScale = Math.max(0.65, 0.85 - Math.abs(prevOffset) * 0.04);

      var swoopX = dir === 1 ? -200 : 200;
      var swoopZ = 150;
      var swoopRot = dir === 1 ? -5 : 5;
      var swoopScale = 1.05;

      var enterAnim = card.animate([
        {
          transform: buildGuideTransform(startX, startY, startZ, rot, startScale),
          opacity: 0.55,
          offset: 0
        },
        {
          transform: buildGuideTransform(swoopX, 0, swoopZ, swoopRot, swoopScale),
          opacity: 1,
          offset: 0.48
        },
        {
          transform: buildGuideTransform(0, 0, 0, 0, 1),
          opacity: 1,
          offset: 1
        }
      ], {
        duration: 750,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards'
      });

      enterAnim.onfinish = function() {
        card.style.transform = buildGuideTransform(0, 0, 0, 0, 1);
        card.style.opacity = '1';
        card.style.zIndex = '100';
      };
      return;
    }

    // 3. Other cards in the background stack
    var fromX = prevOffset * 15;
    var fromY = Math.abs(prevOffset) * 6;
    var fromZ = -150 * Math.abs(prevOffset);
    var fromScale = Math.max(0.65, 0.85 - Math.abs(prevOffset) * 0.04);
    var fromOpacity = prevOffset > 0 ? (prevOffset === 1 ? 0.55 : (prevOffset === 2 ? 0.35 : 0)) : 0;

    var toX = newOffset * 15;
    var toY = Math.abs(newOffset) * 6;
    var toZ = -150 * Math.abs(newOffset);
    var toScale = Math.max(0.65, 0.85 - Math.abs(newOffset) * 0.04);
    var toOpacity = newOffset > 0 ? (newOffset === 1 ? 0.55 : (newOffset === 2 ? 0.35 : 0)) : 0;

    card.style.zIndex = String(Math.max(1, 10 - Math.abs(newOffset)));
    card.style.pointerEvents = newOffset > 0 ? 'auto' : 'none';

    var bgAnim = card.animate([
      {
        transform: buildGuideTransform(fromX, fromY, fromZ, rot, fromScale),
        opacity: fromOpacity
      },
      {
        transform: buildGuideTransform(toX, toY, toZ, rot, toScale),
        opacity: toOpacity
      }
    ], {
      duration: 750,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards'
    });

    bgAnim.onfinish = function() {
      card.style.transform = buildGuideTransform(toX, toY, toZ, rot, toScale);
      card.style.opacity = String(toOpacity);
    };
  });

  setTimeout(function() {
    guideIsAnimating = false;
  }, 760);
}

function initTestimonialsGuideDeck() {
  var btnPrev = document.getElementById('btn-guide-prev');
  var btnNext = document.getElementById('btn-guide-next');

  initGuideCardsDOM();
  setGuideCardsStatic();

  if (btnPrev && !btnPrev.dataset.bound) {
    btnPrev.dataset.bound = 'true';
    btnPrev.addEventListener('click', function(e) {
      e.stopPropagation();
      if (!guideIsAnimating && guideActiveIndex > 0) {
        animateGuideDeck(guideActiveIndex - 1, -1);
      }
    });
  }

  if (btnNext && !btnNext.dataset.bound) {
    btnNext.dataset.bound = 'true';
    btnNext.addEventListener('click', function(e) {
      e.stopPropagation();
      if (!guideIsAnimating && guideActiveIndex < GUIDE_STEPS.length - 1) {
        animateGuideDeck(guideActiveIndex + 1, 1);
      }
    });
  }
}

function loadTunnelTab() {
  fetchTunnelStatus();
  initTunnelGlobe();
  startUptimeTracker();
  initTestimonialsGuideDeck();
}

// ===================================================================
// Claude-Grade Global Floating Tooltip System
// ===================================================================
function initTooltips() {
  let tooltipEl = document.getElementById('singularity-tooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'singularity-tooltip';
    document.body.appendChild(tooltipEl);
  }

  let hoverTimer = null;
  let isWarm = false;
  let warmResetTimer = null;
  let currentTarget = null;

  function showTooltip(target) {
    const text = target.getAttribute('data-tooltip') || target.getAttribute('data-title');
    if (!text || !text.trim()) return;

    tooltipEl.textContent = text.trim();
    tooltipEl.style.display = 'block';

    const rect = target.getBoundingClientRect();
    const tipRect = tooltipEl.getBoundingClientRect();

    let top = rect.top - tipRect.height - 8;
    let left = rect.left + (rect.width / 2) - (tipRect.width / 2);

    if (top < 8) {
      top = rect.bottom + 8;
    }

    if (left < 10) left = 10;
    if (left + tipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tipRect.width - 10;
    }

    tooltipEl.style.top = `${Math.round(top)}px`;
    tooltipEl.style.left = `${Math.round(left)}px`;
    tooltipEl.classList.add('visible');

    isWarm = true;
    clearTimeout(warmResetTimer);
  }

  function hideTooltip() {
    clearTimeout(hoverTimer);
    if (tooltipEl.classList.contains('visible')) {
      tooltipEl.classList.remove('visible');
      warmResetTimer = setTimeout(() => {
        isWarm = false;
        tooltipEl.style.display = 'none';
      }, 250);
    }
    currentTarget = null;
  }

  // Intercept titles and upgrade them to buttery data-tooltips
  function convertTitles(root = document) {
    root.querySelectorAll('[title]').forEach(el => {
      if (el.id === 'sidebar-toggle-btn' || el.hasAttribute('data-no-tooltip') || el.closest('#sidebar-toggle-btn')) {
        return;
      }
      const title = el.getAttribute('title');
      if (title && !el.hasAttribute('data-tooltip')) {
        el.setAttribute('data-tooltip', title);
        el.removeAttribute('title');
      }
    });
  }

  convertTitles();

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'childList') {
        m.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            convertTitles(node);
          }
        });
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-tooltip]');
    if (!target || target === currentTarget || target.id === 'sidebar-toggle-btn' || target.hasAttribute('data-no-tooltip')) return;

    clearTimeout(hoverTimer);
    currentTarget = target;

    if (isWarm) {
      showTooltip(target);
    } else {
      hoverTimer = setTimeout(() => {
        if (currentTarget === target) {
          showTooltip(target);
        }
      }, 260);
    }
  }, true);

  document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('[data-tooltip]');
    if (target && target === currentTarget) {
      const related = e.relatedTarget ? e.relatedTarget.closest('[data-tooltip]') : null;
      if (!related || related !== currentTarget) {
        hideTooltip();
      }
    }
  }, true);

  document.addEventListener('click', hideTooltip, true);
  window.addEventListener('scroll', hideTooltip, true);
}

// ===================================================================
// Claude-Style Resizable & Collapsible Sidebar
// ===================================================================
function initSidebar() {
  const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
  const resizer = document.getElementById('sidebar-resizer');
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  const collapseBtn = document.getElementById('sidebar-collapse-btn');
  const expandBtn = document.getElementById('sidebar-expand-btn');
  if (!sidebar) return;

  const STORAGE_WIDTH_KEY = 'singularity_sidebar_width';
  const STORAGE_COLLAPSED_KEY = 'singularity_sidebar_collapsed';
  const DEFAULT_WIDTH = 270;
  const MIN_WIDTH = 180;
  const MAX_WIDTH = 500;
  const COLLAPSE_THRESHOLD = 150;

  // Restore saved width
  let savedWidth = parseInt(localStorage.getItem(STORAGE_WIDTH_KEY), 10);
  if (isNaN(savedWidth) || savedWidth < MIN_WIDTH || savedWidth > MAX_WIDTH) {
    savedWidth = DEFAULT_WIDTH;
  }
  document.documentElement.style.setProperty('--sidebar-width', `${savedWidth}px`);

  let peekTimer = null;

  function showPeek() {
    clearTimeout(peekTimer);
    if (document.body.classList.contains('has-collapsed-sidebar') || sidebar.classList.contains('collapsed')) {
      document.body.classList.add('sidebar-peeking');
    }
  }

  function scheduleHidePeek() {
    clearTimeout(peekTimer);
    peekTimer = setTimeout(() => {
      document.body.classList.remove('sidebar-peeking');
    }, 180);
  }

  function updateButtonTooltip(collapsed) {
    const tip = collapsed ? 'Expand sidebar (Ctrl+[)' : 'Collapse sidebar (Ctrl+[';
    if (toggleBtn) {
      delete toggleBtn.dataset.tooltip;
      toggleBtn.removeAttribute('data-tooltip');
      toggleBtn.setAttribute('aria-label', tip);
    }
    if (collapseBtn) {
      delete collapseBtn.dataset.tooltip;
      collapseBtn.removeAttribute('data-tooltip');
      collapseBtn.setAttribute('aria-label', 'Collapse sidebar');
    }
    if (expandBtn) {
      delete expandBtn.dataset.tooltip;
      expandBtn.removeAttribute('data-tooltip');
      expandBtn.setAttribute('aria-label', 'Expand sidebar');
    }
  }

  function setSidebarCollapsed(collapsed) {
    clearTimeout(peekTimer);
    document.body.classList.remove('sidebar-peeking');
    if (collapsed) {
      sidebar.classList.add('collapsed');
      document.body.classList.add('has-collapsed-sidebar');
      localStorage.setItem(STORAGE_COLLAPSED_KEY, 'true');
    } else {
      sidebar.classList.remove('collapsed');
      document.body.classList.remove('has-collapsed-sidebar');
      localStorage.setItem(STORAGE_COLLAPSED_KEY, 'false');
      document.documentElement.style.setProperty('--sidebar-width', `${savedWidth}px`);
    }
    updateButtonTooltip(collapsed);
  }

  // Restore collapsed state
  const isCollapsed = localStorage.getItem(STORAGE_COLLAPSED_KEY) === 'true';
  if (isCollapsed) {
    setSidebarCollapsed(true);
  } else {
    updateButtonTooltip(false);
  }

  // Claude Hover-Peek on Toggle Button
  if (toggleBtn) {
    toggleBtn.addEventListener('mouseenter', showPeek);
    toggleBtn.addEventListener('mouseleave', scheduleHidePeek);

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearTimeout(peekTimer);
      document.body.classList.remove('sidebar-peeking');
      const isCurrentlyCollapsed = sidebar.classList.contains('collapsed') || document.body.classList.contains('has-collapsed-sidebar');
      setSidebarCollapsed(!isCurrentlyCollapsed);
    });
  }

  // Claude Hover-Peek on Sidebar itself (keeps it open while cursor is inside)
  if (sidebar) {
    sidebar.addEventListener('mouseenter', showPeek);
    sidebar.addEventListener('mouseleave', scheduleHidePeek);

    // If user clicks a nav item while peeking, activate tab and close peek
    sidebar.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (document.body.classList.contains('sidebar-peeking')) {
          scheduleHidePeek();
        }
      });
    });
  }

  if (collapseBtn) {
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setSidebarCollapsed(true);
    });
  }

  if (expandBtn) {
    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setSidebarCollapsed(false);
    });
  }

  // Keyboard shortcut: Ctrl+[ or Cmd+[
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === '[') {
      e.preventDefault();
      const current = sidebar.classList.contains('collapsed') || document.body.classList.contains('has-collapsed-sidebar');
      setSidebarCollapsed(!current);
    }
  });

  // Drag to Resize Handling
  if (resizer) {
    let startX = 0;
    let startWidth = savedWidth;
    let isDragging = false;

    resizer.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      isDragging = true;
      startX = e.clientX;
      startWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width'), 10) || DEFAULT_WIDTH;

      sidebar.classList.add('resizing');
      document.body.classList.add('sidebar-resizing');

      function onMouseMove(moveEvent) {
        if (!isDragging) return;
        const currentX = moveEvent.clientX;

        // If dragged too close to the left, visually hint collapse
        if (currentX < COLLAPSE_THRESHOLD) {
          sidebar.style.opacity = '0.35';
          return;
        }

        sidebar.style.opacity = '1';
        let newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, currentX));
        document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
        savedWidth = newWidth;
      }

      function onMouseUp(upEvent) {
        if (!isDragging) return;
        isDragging = false;
        sidebar.classList.remove('resizing');
        document.body.classList.remove('sidebar-resizing');
        sidebar.style.opacity = '';

        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        if (upEvent.clientX < COLLAPSE_THRESHOLD) {
          setSidebarCollapsed(true);
        } else {
          setSidebarCollapsed(false);
          localStorage.setItem(STORAGE_WIDTH_KEY, String(savedWidth));
        }
      }

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    // Double-click to reset width
    resizer.addEventListener('dblclick', () => {
      savedWidth = DEFAULT_WIDTH;
      document.documentElement.style.setProperty('--sidebar-width', `${DEFAULT_WIDTH}px`);
      localStorage.setItem(STORAGE_WIDTH_KEY, String(DEFAULT_WIDTH));
      setSidebarCollapsed(false);
      showToast('Sidebar reset to default width (270px)', 'info');
    });
  }
}

// ===================================================================
// Initialization
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initClaudeSettings();
  initSidebar();
  initTooltips();
  initNavigation();
  initModelFilters();
  initCookieTabs();
  initCustomSelect();
  initPlayground();
  initCopyAction();
  initTunnelControls();
  initSmoothInputs();
  initSearchToggle();
  initToolsTray();
  window.SingularityToolSteps?.initCitationCards?.();

  // Fleet controls (Desktop & Mobile)
  const handleRefresh = () => {
    showToast('Refreshing telemetry...', 'info');
    fetchServices();
    fetchLimits();
  };

  const btnRefresh = document.getElementById('btn-refresh-telemetry');
  if (btnRefresh) btnRefresh.addEventListener('click', handleRefresh);

  const btnRefreshMobile = document.getElementById('btn-refresh-telemetry-mobile');
  if (btnRefreshMobile) btnRefreshMobile.addEventListener('click', handleRefresh);

  const btnStartAll = document.getElementById('btn-start-all');
  if (btnStartAll) btnStartAll.addEventListener('click', startAllServices);

  const btnStartAllMobile = document.getElementById('btn-start-all-mobile');
  if (btnStartAllMobile) btnStartAllMobile.addEventListener('click', startAllServices);

  const btnStopAll = document.getElementById('btn-stop-all');
  if (btnStopAll) btnStopAll.addEventListener('click', stopAllServices);

  const btnStopAllMobile = document.getElementById('btn-stop-all-mobile');
  if (btnStopAllMobile) btnStopAllMobile.addEventListener('click', stopAllServices);

  // Initial Data Fetches
  fetchServices();
  fetchLimits();
  fetchModels();
  fetchTunnelStatus();
  updateTavernAndMobileChips();

  // Background Telemetry Polling (every 3.5s)
  setInterval(() => {
    fetchServices();
    if (state.currentTab === 'limits') {
      fetchLimits();
    }
    if (state.currentTab === 'tunnel') {
      fetchTunnelStatus();
    }
  }, 3500);

  // Periodic status refresh (every 10s)
  setInterval(() => {
    updateTavernAndMobileChips();
    if (state.currentTab !== 'tunnel') {
      fetchTunnelStatus();
    }
  }, 10000);
});

// ===================================================================
// Tavern Studio & Phone LAN Integration
// ===================================================================
async function updateTavernAndMobileChips() {
  try {
    const res = await fetch('/api/tavern/status');
    if (!res.ok) return;
    const data = await res.json();
    state.tavernStatus = data;
    const tavCode = document.getElementById('tavern-chip-url');
    if (tavCode) {
      let host = window.location.hostname;
      if (!host || host === '0.0.0.0' || host === '::') host = 'localhost';
      const port = data.port || 5173;
      tavCode.textContent = `:${port}`;
      const chip = document.getElementById('chip-tavern-studio');
      if (chip) {
        if (data.running) {
          chip.style.borderColor = 'rgba(168, 85, 247, 0.7)';
          chip.style.boxShadow = '0 0 10px rgba(168, 85, 247, 0.25)';
          chip.title = `Tavern Studio is LIVE on port ${port} — click to open`;
        } else {
          chip.style.borderColor = 'rgba(168, 85, 247, 0.3)';
          chip.style.boxShadow = 'none';
          chip.title = 'Tavern Studio is offline — click to start natively';
        }
      }
    }
  } catch (_) { }
}

async function openTavernStudio() {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 800;
  let currentHost = window.location.hostname;
  if (!currentHost || currentHost === '0.0.0.0' || currentHost === '::') {
    currentHost = 'localhost';
  }
  let targetUrl = `${window.location.protocol}//${currentHost}:5173`;

  // 1. Fast path: If already verified running, open immediately with zero delay
  if (state.tavernStatus && state.tavernStatus.running && state.tavernStatus.client_url) {
    try {
      const u = new URL(state.tavernStatus.client_url);
      u.hostname = currentHost;
      u.protocol = window.location.protocol;
      targetUrl = u.toString();
    } catch {
      targetUrl = state.tavernStatus.client_url;
    }

    if (isMobile) {
      window.location.href = targetUrl;
    } else {
      const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        if (typeof showToast === 'function') {
          showToast(`Tavern ready: <a href="${targetUrl}" target="_blank" style="color:var(--accent);text-decoration:underline;">Click here to open ${targetUrl}</a>`, 'success');
        }
      }
    }
    return;
  }

  // 2. Synchronously open placeholder tab on desktop to bypass browser popup blockers
  let tabWin = null;
  if (!isMobile) {
    try {
      tabWin = window.open('about:blank', '_blank');
      if (tabWin && tabWin.document) {
        tabWin.document.write(`
          <!DOCTYPE html>
          <html>
            <head><title>Launching Tavern Web Studio...</title></head>
            <body style="margin:0;background:#0d0d12;color:#d8b4fe;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;">
              <div style="text-align:center;padding:2.5rem;background:rgba(255,255,255,0.03);border:1px solid rgba(168,85,247,0.3);border-radius:18px;max-width:420px;box-shadow:0 12px 36px rgba(0,0,0,0.5);">
                <div style="font-size:3rem;margin-bottom:12px;">🏰</div>
                <h2 style="margin:0 0 8px 0;color:#f8fafc;font-size:1.3rem;">Starting Tavern Web Studio...</h2>
                <p id="tav-status-msg" style="color:#94a3b8;font-size:0.9rem;margin:0 0 16px 0;line-height:1.4;">Connecting to Singularity gateway & spinning up dev server...</p>
                <div style="display:inline-block;width:24px;height:24px;border:3px solid rgba(168,85,247,0.3);border-top-color:#d8b4fe;border-radius:50%;animation:spin 1s linear infinite;"></div>
                <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
              </div>
            </body>
          </html>
        `);
      }
    } catch (_) { }
  }

  if (typeof showToast === 'function') {
    showToast('Starting Tavern Studio natively in background...', 'info', 4000);
  }

  // 3. Trigger native backend boot
  try {
    const startRes = await fetch('/api/tavern/start', { method: 'POST' });
    if (startRes.ok) {
      const startData = await startRes.json();
      if (startData.error) {
        if (tabWin && !tabWin.closed) tabWin.close();
        if (typeof showToast === 'function') showToast(startData.error, 'error', 6000);
        return;
      }
      if (startData.client_url) targetUrl = startData.client_url;
    }
  } catch (err) {
    console.warn('Tavern auto-start call failed:', err);
  }

  // 4. Poll for port readiness (poll up to 45 seconds to allow first-time npm install to finish)
  let ready = false;
  for (let i = 0; i < 45; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const res = await fetch('/api/tavern/status');
      if (res.ok) {
        const data = await res.json();
        if (data && data.running) {
          state.tavernStatus = data;
          if (data.client_url) targetUrl = data.client_url;
          ready = true;
          break;
        }
      }
    } catch (_) { }

    // Update placeholder window progress
    if (tabWin && !tabWin.closed && tabWin.document) {
      const msgEl = tabWin.document.getElementById('tav-status-msg');
      if (msgEl) {
        msgEl.textContent = `Compiling and waiting for port 5173... (${i + 1}s / 45s)`;
      }
    }
  }

  try {
    const u = new URL(targetUrl);
    u.hostname = currentHost;
    u.protocol = window.location.protocol;
    targetUrl = u.toString();
  } catch { }

  if (ready) {
    if (typeof showToast === 'function') {
      showToast(`Tavern Web Studio ready! Launching ${targetUrl}...`, 'success', 2500);
    }

    if (isMobile) {
      window.location.href = targetUrl;
    } else if (tabWin && !tabWin.closed) {
      tabWin.location.replace(targetUrl);
    } else {
      const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        if (typeof showToast === 'function') {
          showToast(`Tavern ready: <a href="${targetUrl}" target="_blank" style="color:var(--accent);text-decoration:underline;">Click here to open ${targetUrl}</a>`, 'success');
        }
      }
    }
  } else {
    // Port NOT ready yet — DO NOT redirect to dead port to avoid ERR_CONNECTION_REFUSED
    if (typeof showToast === 'function') {
      showToast('Tavern Studio is taking a moment to start (installing packages or compiling). Please wait or click Check Again in the new tab.', 'warning', 8000);
    }
    if (tabWin && !tabWin.closed && tabWin.document && tabWin.document.body) {
      tabWin.document.body.innerHTML = `
        <div style="text-align:center;padding:2.5rem;background:rgba(255,255,255,0.03);border:1px solid rgba(168,85,247,0.4);border-radius:18px;max-width:450px;box-shadow:0 12px 36px rgba(0,0,0,0.5);font-family:system-ui,sans-serif;color:#f8fafc;">
          <div style="font-size:3rem;margin-bottom:12px;">⏳</div>
          <h2 style="margin:0 0 8px 0;color:#d8b4fe;font-size:1.3rem;">Tavern Studio Still Starting</h2>
          <p style="color:#94a3b8;font-size:0.9rem;margin:0 0 20px 0;line-height:1.5;">
            The dev server is still downloading packages or compiling Vite. Keep this tab open — click below to check if port 5173 is live!
          </p>
          <button onclick="window.location.reload()" style="background:#a855f7;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.95rem;box-shadow:0 4px 14px rgba(168,85,247,0.4);">
            Check Port 5173
          </button>
        </div>
      `;
    }
  }
}

// Global exports for modular UI integrations (e.g. Glass Dock, Artifacts)
window.switchTab = switchTab;
window.openTavernStudio = openTavernStudio;
window.showToast = showToast;
window.openArtifact = openArtifact;
window.closeArtifactWorkbench = closeArtifactWorkbench;
window.switchArtifactView = switchArtifactView;
window.switchArtifactVersion = switchArtifactVersion;
window.copyActiveArtifactCode = copyActiveArtifactCode;
window.downloadActiveArtifact = downloadActiveArtifact;
window.toggleArtifactFullscreen = toggleArtifactFullscreen;
window.initTunnelGlobe = initTunnelGlobe;
window.startGlobeAnimation = startGlobeAnimation;
window.stopGlobeAnimation = stopGlobeAnimation;

// ===================================================================
// Skiper106 Smooth Caret Input Component (@skiper-ui/skiper106)
// Spring-interpolated smooth caret with Canvas & DOM mirror tracking
// ===================================================================

class SkiperSmoothCaret {
  constructor(inputEl) {
    if (!inputEl || inputEl._skiperSmoothCaret) return;
    this.el = inputEl;
    this.el._skiperSmoothCaret = this;

    this.isTextarea = this.el.tagName.toLowerCase() === 'textarea';
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.idleTimer = null;
    this.mirrorEl = null;

    this.setupDOM();
    this.bindEvents();
  }

  setupDOM() {
    let wrapper = this.el.parentElement;
    if (!wrapper || !wrapper.classList.contains('skiper-smooth-wrapper')) {
      wrapper = document.createElement('div');
      wrapper.className = 'skiper-smooth-wrapper';
      if (this.isTextarea) {
        wrapper.classList.add('block-wrapper');
      }
      this.el.parentNode.insertBefore(wrapper, this.el);
      wrapper.appendChild(this.el);
    }
    this.wrapper = wrapper;

    this.caret = document.createElement('div');
    this.caret.className = 'skiper-smooth-caret';
    this.wrapper.appendChild(this.caret);

    this.el.classList.add('skiper-smooth-input');

    if (this.isTextarea) {
      this.mirrorEl = document.createElement('div');
      this.mirrorEl.setAttribute('aria-hidden', 'true');
      this.mirrorEl.style.cssText = `
        position: absolute;
        top: -9999px;
        left: -9999px;
        visibility: hidden;
        pointer-events: none;
        white-space: pre-wrap;
        word-wrap: break-word;
        overflow-wrap: break-word;
      `;
      document.body.appendChild(this.mirrorEl);
    }
  }

  bindEvents() {
    const update = () => this.updateCaretPosition();
    const onActivity = () => {
      this.caret.classList.add('active-typing', 'visible');
      this.caret.classList.remove('idle-blinking');
      update();
      clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => {
        this.caret.classList.remove('active-typing');
        if (document.activeElement === this.el) {
          this.caret.classList.add('idle-blinking');
        }
      }, 380);
    };

    this.el.addEventListener('focus', () => {
      this.caret.classList.add('visible', 'idle-blinking');
      update();
    });

    this.el.addEventListener('blur', () => {
      this.caret.classList.remove('visible', 'active-typing', 'idle-blinking');
    });

    this.el.addEventListener('input', onActivity);
    this.el.addEventListener('keydown', onActivity);
    this.el.addEventListener('keyup', update);
    this.el.addEventListener('click', update);
    this.el.addEventListener('select', update);
    this.el.addEventListener('mouseup', update);
    this.el.addEventListener('scroll', update);

    window.addEventListener('resize', update);
  }

  updateCaretPosition() {
    if (document.activeElement !== this.el) return;

    const start = this.el.selectionStart;
    const end = this.el.selectionEnd;

    // Hide caret if there's an active text selection range
    if (start === null || start === undefined || start !== end) {
      this.caret.style.opacity = '0';
      return;
    } else {
      this.caret.style.opacity = '';
    }

    const style = window.getComputedStyle(this.el);
    const fontSize = parseFloat(style.fontSize) || 14;
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const borderLeft = parseFloat(style.borderLeftWidth) || 0;
    const borderTop = parseFloat(style.borderTopWidth) || 0;

    const val = this.el.value || '';
    const textBefore = val.substring(0, start);

    let caretX = 0;
    let caretY = 0;
    let caretHeight = fontSize * 1.18;

    if (!this.isTextarea) {
      // Single-line text/password/search input
      let measuredText = textBefore;
      if (this.el.type === 'password') {
        measuredText = '•'.repeat(textBefore.length);
      }
      this.ctx.font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const textWidth = this.ctx.measureText(measuredText).width;
      
      const inputHeight = this.el.offsetHeight || parseFloat(style.height) || (fontSize + paddingTop * 2);
      caretX = paddingLeft + borderLeft + textWidth - this.el.scrollLeft;
      caretY = Math.max(0, (inputHeight - caretHeight) / 2);
    } else {
      // Multi-line textarea with pixel-perfect DOM mirror probe
      if (this.mirrorEl) {
        const mirrorStyles = [
          'boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
          'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
          'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight',
          'textTransform', 'wordSpacing', 'textIndent', 'whiteSpace', 'wordBreak', 'overflowWrap'
        ];
        mirrorStyles.forEach(prop => {
          this.mirrorEl.style[prop] = style[prop];
        });
        this.mirrorEl.style.width = `${this.el.clientWidth}px`;

        // Escape HTML
        const safeText = textBefore
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');

        this.mirrorEl.innerHTML = `${safeText}<span id="skiper-probe" style="display:inline-block;width:0;height:${caretHeight}px;vertical-align:baseline;">&#8203;</span>`;
        const probe = this.mirrorEl.querySelector('#skiper-probe');

        if (probe) {
          caretX = paddingLeft + borderLeft + probe.offsetLeft - this.el.scrollLeft;
          caretY = paddingTop + borderTop + probe.offsetTop - this.el.scrollTop;
        } else {
          caretX = paddingLeft;
          caretY = paddingTop;
        }
      }
    }

    this.caret.style.height = `${Math.round(caretHeight)}px`;
    this.caret.style.transform = `translate3d(${Math.round(caretX)}px, ${Math.round(caretY)}px, 0)`;
  }
}

function initSmoothInputs() {
  const selectors = [
    '#chat-input',
    '#model-search',
    '#model-filter-input',
    '#claude-settings-search',
    '#input-ngrok-authtoken',
    '#user-profile-name-input',
    '#system-prompt-input',
    '.smooth-input',
    '[data-smooth-input]'
  ];
  document.querySelectorAll(selectors.join(', ')).forEach(el => {
    if (!el._skiperSmoothCaret) {
      new SkiperSmoothCaret(el);
    }
  });
}

// ===================================================================
// Chat tools: the Search toggle and web search settings
// ===================================================================
function setToolsEnabled(on) {
  state.toolsEnabled = !!on && !!state.toolsInfo;
  const btn = document.getElementById('btn-search-toggle');
  if (btn) btn.setAttribute('aria-pressed', state.toolsEnabled ? 'true' : 'false');
  syncToolsMenuButton();
}

function syncToolsMenuButton() {
  const circle = document.getElementById('btn-tools-menu');
  const tray = document.getElementById('composer-tools-tray');
  if (!circle || !tray) return;
  circle.classList.toggle('has-active', !!tray.querySelector('.claude-tool-pill[aria-pressed="true"]'));
}

function setToolsTrayOpen(open) {
  const circle = document.getElementById('btn-tools-menu');
  const tray = document.getElementById('composer-tools-tray');
  if (!circle || !tray) return;
  tray.classList.toggle('open', open);
  tray.inert = !open;
  tray.setAttribute('aria-hidden', open ? 'false' : 'true');
  circle.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function initToolsTray() {
  const circle = document.getElementById('btn-tools-menu');
  if (!circle) return;
  circle.addEventListener('click', () => {
    setToolsTrayOpen(circle.getAttribute('aria-expanded') !== 'true');
  });
  syncToolsMenuButton();
}

function saveChatTools(chatId) {
  if (!chatId) return;
  const tools = state.toolsEnabled && window.SingularityToolSteps ? window.SingularityToolSteps.TOOL_NAMES : [];
  fetch(`/api/chats/${chatId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tools }) }).catch((err) => {
    console.error('Could not save the Search setting for this chat:', err);
  });
}

function updateSearchToggleHint() {
  const btn = document.getElementById('btn-search-toggle');
  if (!btn || !state.toolsInfo) return;
  const via = state.toolsInfo.search && state.toolsInfo.search.name;
  const keySaved = !!(state.toolsInfo.search && state.toolsInfo.search.key_saved);
  btn.title = `Let the model search the web and read pages${via ? ` (via ${via})` : ''}`
    + (keySaved ? '' : '. No search key: results can be blocked. Add one in Parameters.');
  btn.classList.toggle('needs-key', !keySaved);
  if (window.SingularityToolSteps) window.SingularityToolSteps.setSearchKeySaved(keySaved);
}

function openSearchSettings() {
  const dropdown = document.getElementById('playground-settings-dropdown');
  if (!dropdown) return;
  if (!dropdown.classList.contains('open')) {
    dropdown.classList.add('open');
    if (typeof loadModelSettings === 'function') loadModelSettings(state.selectedModel || 'gpt-5.6-sol');
  }
  const group = document.getElementById('search-settings');
  if (group && group.scrollIntoView) group.scrollIntoView({ block: 'center' });
  const select = document.getElementById('search-backend-select');
  const customBtn = document.getElementById('btn-search-backend-select');
  const keyInput = document.getElementById('search-api-key-input');
  const target = (select && select.value === 'auto') ? (customBtn || select) : keyInput;
  if (target) target.focus();
}

async function loadSearchSettings() {
  try {
    const res = await fetch('/api/tools');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.toolsInfo = await res.json();
    return true;
  } catch (err) {
    state.toolsInfo = null;
    return false;
  }
}

function initSearchToggle() {
  const btn = document.getElementById('btn-search-toggle');
  const select = document.getElementById('search-backend-select');
  const keyInput = document.getElementById('search-api-key-input');
  const hint = document.getElementById('search-settings-hint');
  const saveBtn = document.getElementById('btn-save-search-settings');
  if (!btn) return;
  const defaultHint = hint ? hint.textContent : '';

  const updateSearchBackendCustomUI = (val) => {
    if (select) select.value = val;
    const label = document.getElementById('search-backend-selected-label');
    const menu = document.getElementById('search-backend-select-menu');
    if (menu) {
      menu.querySelectorAll('.claude-select-option').forEach(opt => {
        const isMatch = opt.getAttribute('data-value') === val;
        opt.classList.toggle('active', isMatch);
        if (isMatch && label) {
          const spanEl = opt.querySelector('span');
          label.textContent = spanEl ? spanEl.textContent : opt.textContent.trim();
        }
      });
    }
  };

  const customWrap = document.getElementById('search-backend-select-wrap');
  const customBtn = document.getElementById('btn-search-backend-select');
  const customMenu = document.getElementById('search-backend-select-menu');

  if (customBtn && customMenu) {
    customBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.claude-custom-select-menu.open').forEach(m => {
        if (m !== customMenu) m.classList.remove('open');
      });
      customMenu.classList.toggle('open');
    });

    customMenu.querySelectorAll('.claude-select-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = opt.getAttribute('data-value') || 'auto';
        updateSearchBackendCustomUI(val);
        customMenu.classList.remove('open');
      });
    });

    document.addEventListener('click', (e) => {
      if (customWrap && !customWrap.contains(e.target)) {
        customMenu.classList.remove('open');
      }
    });
  }

  const syncSettingsForm = () => {
    const search = state.toolsInfo && state.toolsInfo.search;
    const val = search ? (search.backend_setting || 'auto') : 'auto';
    updateSearchBackendCustomUI(val);
    if (keyInput) {
      keyInput.value = '';
      keyInput.placeholder = search && search.key_saved ? 'Key saved. Type to replace it.' : 'API key (optional)';
    }
  };

  const refresh = async () => {
    const ok = await loadSearchSettings();
    btn.disabled = !ok;
    if (ok) {
      updateSearchToggleHint();
    } else {
      btn.title = 'Search needs a newer Singularity server. Restart Singularity.';
    }
    setToolsEnabled(state.toolsEnabled);
    syncSettingsForm();
  };

  document.addEventListener('singularity:open-search-settings', openSearchSettings);

  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    setToolsEnabled(!state.toolsEnabled);
    if (state.chatId) saveChatTools(state.chatId);
  });

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const payload = { search_backend: select ? select.value : 'auto' };
      if (keyInput && keyInput.value.trim()) payload.search_api_key = keyInput.value.trim();
      else if (select && select.value === 'auto') payload.search_api_key = '';
      saveBtn.disabled = true;
      try {
        const res = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          let detail = `HTTP ${res.status}`;
          try { detail = (await res.json()).detail || detail; } catch (_) {}
          throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
        }
        await refresh();
        showToast('Search settings saved', 'success', 2200);
      } catch (err) {
        showToast(`Could not save search settings: ${err.message}`, 'error', 6000);
      } finally {
        saveBtn.disabled = false;
      }
    });
  }

  refresh();
}

window.initSmoothInputs = initSmoothInputs;
window.SkiperSmoothCaret = SkiperSmoothCaret;



