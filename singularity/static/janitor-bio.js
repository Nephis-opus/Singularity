/**
 * Janitor Bio Studio & Papercraft Tactile Engine
 * Incorporates DelightfulTempe Unrestricted Bio Guide & Papercraft Anti-AI Design Guide
 */
(function() {
  'use strict';

  var state = {
    selectedModel: 'kimi-k3',
    selectedStyle: 'papercraft',
    activeSubtab: 'concept',
    outputMode: 'split',
    isGenerating: false,
    generatedHtml: '',
    uuid: '',
    token: ''
  };

  var TEMPLATES = {
    shadow_slave: `Character: Sunless (Sunny) & Pre-Forgotten Shore Arc
Universe: Shadow Slave by Guiltythree
Premise: Co-aspirant survivor entering Directive 3 Quarantine restraint chairs under Northern Quadrant precinct.
Key Mechanics:
- 100% Player Agency (GM never speaks for player)
- Grounded Kinetics & combat trauma tracking
- Five Canonical Phases (Quarantine -> First Nightmare -> Cosmic Void -> Recovery -> Awakened Academy)
- Clear Conscience Flaw & Shadow Slave Divine Aspect
Include:
- Dramatic Serif Title & Series Tag
- "The Nightmare Spell" Golden Quote Callout
- Dramatis Personae (Sunny, Nephis, Cassie, Master Jet)
- Recommended Temp (0.95) and Context config`,

    papercraft_dossier: `Character: Agent Silas Vance / "The Cartographer"
Universe: Industrial Low-Fantasy / Steampunk Archive
Premise: Disavowed Royal Cartographer carrying classified deckled-edge maps through the fog-shrouded border territory.
Key Mechanics:
- Physical tactile cardstock layers (archival cream #fdfbf7, parchment #f4eedb, slate cardstock #1c1e24)
- Multi-stop realistic shadows and washi-tape header strips
- Character inventory matrix with debossed stamped typography
- Strict editorial line-height and no generic emojis (use geometric glyphs ❖ ◈ ※ ✦)
- Grounded atmospheric dialogue and survival guidelines`,

    cyberpunk_terminal: `Character: Cipher Unit K-09 / Black Market Deck
Universe: Subterranean Megacity 7
Premise: Rogue synthetic forensic technician running unregistered neural diagnostics in an off-grid maintenance corridor.
Key Mechanics:
- CRT Scanline aesthetic with JetBrains Mono and VT323 typography
- Strict JanitorAI inline compliance (zero position, zero z-index, zero <style> tags)
- Hardware telemetry readout (Neural Latency, Buffer Overflow, Security Level)
- Character cast matrix with hacker bounty tags
- Direct prompt engineering instructions for grounded combat`,

    blank: `Character Name: 
Universe / Lore: 
Concept / Story Premise: 
Core Traits & Aspects: 
Key NPCs / Companions: 
Player Role & Agency: `
  };

  var SYSTEM_PROMPT = `You are the Master JanitorAI Bio Architect and Tactile Web Designer.
Your objective is to craft high-tier, unrestricted, production-ready JanitorAI character bios that render perfectly within JanitorAI's HTML engine.

═══════════════════════════════════════════════════════════
CRITICAL JANITORAI TECHNICAL RULES (From DelightfulTempe Guide):
═══════════════════════════════════════════════════════════
1. PURE INLINE HTML ONLY: Every styling rule MUST be written directly inside inline style attributes (e.g. style="...").
2. ABSOLUTELY NO <style> OR <script> TAGS: JAI's server completely deletes <style> and <script> tags. Any CSS inside them will be stripped.
3. NEVER USE 'position': JAI's server parses and strips all 'position' properties (relative, absolute, fixed, sticky). Use standard Flexbox and CSS Grid layout techniques instead.
4. NEVER USE THE WORD 'z-index': JAI's server naively strips the literal substring "z-index" from the entire payload, even from plain text, corrupting surrounding CSS. Do NOT use the property or the word anywhere.
5. CONTAINER CONSTRAINTS: Wrap the entire bio in a single outer container with:
   max-width: 900px; margin: 0 auto; box-sizing: border-box; overflow: hidden;
6. JAI AVAILABLE GOOGLE FONTS: Only use these 14 fonts natively supported by JanitorAI:
   - 'Fraunces', Georgia, serif (Variable editorial serif, great for titles and dramatic quotes)
   - 'Jura', sans-serif (Geometric futuristic sans, excellent for badges, stats, and headers)
   - 'Inter', sans-serif (Clean neutral body text)
   - 'JetBrains Mono', monospace (Technical tags, code, phase tracking)
   - 'Crimson Text', serif (Classical literary serif)
   - 'Poppins', sans-serif (Friendly rounded geometric sans)
   - 'Lexend', sans-serif (High-readability dense body copy)
   - 'Berkshire Swash', cursive (Ornate fantasy display)
   - 'Dancing Script', cursive (Romantic cursive fluff accents)
   - 'Rock Salt', cursive (Rough handwritten grunge)
   - 'VT323', monospace (Retro pixel terminal)
   - 'Press Start 2P', monospace (8-bit retro arcade)
   - 'Monoton', cursive (Neon retro display)

═══════════════════════════════════════════════════════════
PAPERCRAFT & ANTI-AI DESIGN PRINCIPLES:
═══════════════════════════════════════════════════════════
- ELIMINATE AI SLOP: No lazy saturated glowing purple/blue borders; no identical 3-column bento boxes with circular emojis; no robotic corporate buzzwords.
- TACTILE SKEUOMORPHISM & MATERIALS:
  - Deep obsidian / charcoal-dyed slate cardstock backgrounds (e.g. linear-gradient(180deg, #090a0f 0%, #0d0f17 50%, #08090d 100%)) with subtle border highlights (inset 0 1px 0 rgba(255, 255, 255, 0.06)).
  - Grounded accent colors: Terracotta (#d97757), Ember Gold (#f0b92d, #fbbf24), Cyan (#38bdf8), Rose (#f43f5e), or Emerald (#34d399).
  - Multi-stop realistic shadows (contact shadow + soft diffusion elevation).
  - Washi tape / parchment accent headers, folded callouts, or stat matrices.
  - Typographic dingbats (❖, ◈, ※, ✦, ›, •, —, ⟨ ⟩) instead of system emojis.
  - Strict line-height balance: tight on big headings (1.1 - 1.2), relaxed on body copy (1.6 - 1.75).
- STRUCTURE OF A HIGH-TIER BOT BIO:
  1. Atmospheric Header with Title, Universe/Series Tag, and Pill Badges.
  2. Thematic Quote / Hook Callout Block.
  3. Prologue / Scenario Setup (grounded narrative context).
  4. Dramatis Personae (Character cards with name, status, aspect/flaw, personality notes).
  5. Mechanics / Player Agency & Simulation Protocols (100% Player Agency, Combat/Interaction Rules).
  6. Recommended Runtime Configuration (Recommended Temperature, Context length, Prompting Style).
  7. Footer with thematic closing line.

OUTPUT FORMAT:
Output strictly the clean raw HTML block starting with <div style="..."> and ending with </div>.
Do NOT wrap in markdown \`\`\`html code blocks. Return ONLY the raw HTML string so it is directly injectable.`;

  function init() {
    loadSavedCredentials();
    populateModelsDropdown();
    bindEvents();
    updateCredentialsStatus();
  }

  function extractCleanJwt(tokenStr) {
    if (!tokenStr || typeof tokenStr !== 'string') return '';
    var s = tokenStr.trim();
    if (s.startsWith('Bearer ')) s = s.slice(7).trim();

    // 1. Direct regex match on standard JWT structure
    var match = s.match(/(eyJhbGci[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/);
    if (match) return match[1];

    // 2. Decode base64 if user pasted raw cookie chunk (e.g. base64-eyJhY2... or eyJhY2...)
    try {
      var cleanB64 = s.replace(/^base64-/, '').replace(/-/g, '+').replace(/_/g, '/');
      while (cleanB64.length % 4 !== 0) cleanB64 += '=';
      var decoded = atob(cleanB64);
      var m2 = decoded.match(/(eyJhbGci[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/);
      if (m2) return m2[1];
    } catch (e) {}

    return s;
  }

  function parseJwtInfo(jwtString) {
    if (!jwtString || typeof jwtString !== 'string') return null;
    var cleanToken = extractCleanJwt(jwtString);
    var parts = cleanToken.split('.');
    if (parts.length < 2) return null;
    try {
      var payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (payloadBase64.length % 4) payloadBase64 += '=';
      var decoded = JSON.parse(atob(payloadBase64));
      var nowSec = Math.floor(Date.now() / 1000);
      var exp = decoded.exp || 0;
      var isExpired = exp ? nowSec > exp : false;
      var expDate = exp ? new Date(exp * 1000) : null;
      var diffSec = exp ? exp - nowSec : 0;
      var timeRemainingStr = '';
      if (exp) {
        if (isExpired) {
          var agoSec = Math.abs(diffSec);
          if (agoSec < 3600) timeRemainingStr = Math.floor(agoSec / 60) + 'm ago';
          else if (agoSec < 86400) timeRemainingStr = Math.floor(agoSec / 3600) + 'h ago';
          else timeRemainingStr = Math.floor(agoSec / 86400) + 'd ago';
        } else {
          if (diffSec < 3600) timeRemainingStr = Math.floor(diffSec / 60) + 'm remaining';
          else timeRemainingStr = Math.floor(diffSec / 3600) + 'h ' + Math.floor((diffSec % 3600) / 60) + 'm remaining';
        }
      }
      return {
        cleanToken: cleanToken,
        exp: exp,
        isExpired: isExpired,
        expDate: expDate,
        timeRemainingStr: timeRemainingStr,
        email: decoded.email || ''
      };
    } catch (e) {
      return null;
    }
  }

  function loadSavedCredentials() {
    state.uuid = localStorage.getItem('singularity_jai_uuid') || '';
    state.token = extractCleanJwt(localStorage.getItem('singularity_jai_token') || '');

    var uuidInput = document.getElementById('bio-input-uuid');
    var tokenInput = document.getElementById('bio-input-token');
    if (uuidInput) uuidInput.value = state.uuid;
    if (tokenInput) tokenInput.value = state.token;
  }

  function saveCredentials() {
    var uuidInput = document.getElementById('bio-input-uuid');
    var tokenInput = document.getElementById('bio-input-token');
    if (!uuidInput || !tokenInput) return;

    state.uuid = uuidInput.value.trim();
    state.token = extractCleanJwt(tokenInput.value.trim());

    // Update input display with cleaned JWT token
    tokenInput.value = state.token;

    localStorage.setItem('singularity_jai_uuid', state.uuid);
    localStorage.setItem('singularity_jai_token', state.token);

    updateCredentialsStatus();

    var jwtInfo = parseJwtInfo(state.token);
    if (jwtInfo && jwtInfo.isExpired) {
      showToast('⚠️ Credentials saved, but token is EXPIRED (' + jwtInfo.timeRemainingStr + ')! Please refresh on janitorai.com.', 'error');
    } else {
      showToast('✓ Janitor AI credentials saved to local vault!', 'success');
    }
  }

  function updateCredentialsStatus() {
    var dot = document.getElementById('bio-status-dot');
    var text = document.getElementById('bio-status-text');
    var btnDeploy = document.getElementById('btn-bio-deploy');
    var expiryContainer = document.getElementById('bio-token-expiry-info');

    var jwtInfo = state.token ? parseJwtInfo(state.token) : null;

    // Render expiry badge whenever token is present
    if (expiryContainer) {
      if (jwtInfo) {
        if (jwtInfo.isExpired) {
          expiryContainer.innerHTML = '<div class="bio-token-expiry-badge expired">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>' +
            'Expired ' + jwtInfo.timeRemainingStr + ' (' + (jwtInfo.expDate ? jwtInfo.expDate.toLocaleDateString() : '') + '). Janitor tokens expire after 1–3 hours. Please refresh or click Auto-Fetch.' +
            '</div>';
        } else {
          expiryContainer.innerHTML = '<div class="bio-token-expiry-badge valid">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>' +
            'Active session • ' + jwtInfo.timeRemainingStr + (jwtInfo.email ? ' (' + jwtInfo.email + ')' : '') +
            '</div>';
        }
      } else {
        expiryContainer.innerHTML = '';
      }
    }

    if (!state.token && !state.uuid) {
      if (dot) dot.className = 'bio-status-dot';
      if (text) text.textContent = 'Unconfigured';
      if (btnDeploy) btnDeploy.title = 'Configure UUID & Token in Credentials tab first';
      return;
    }

    if (jwtInfo && jwtInfo.isExpired) {
      if (dot) dot.className = 'bio-status-dot expired';
      if (text) text.textContent = '⚠️ Token Expired (' + jwtInfo.timeRemainingStr + ') — Auto-Fetch or Refresh Needed';
      if (btnDeploy) btnDeploy.title = 'Token expired on ' + (jwtInfo.expDate ? jwtInfo.expDate.toLocaleString() : 'unknown');
      return;
    }

    if (state.token && !state.uuid) {
      if (dot) dot.className = 'bio-status-dot connected';
      if (text) text.textContent = 'Token Active (' + (jwtInfo ? jwtInfo.timeRemainingStr : 'Valid') + ') — Enter Character UUID';
      if (btnDeploy) btnDeploy.title = 'Enter target Character UUID to deploy';
      return;
    }

    if (!state.token && state.uuid) {
      if (dot) dot.className = 'bio-status-dot';
      if (text) text.textContent = 'UUID Set (' + state.uuid.slice(0, 8) + '...) — Missing Access Token';
      if (btnDeploy) btnDeploy.title = 'Auto-Fetch or paste Access Token to deploy';
      return;
    }

    // Both configured & token is valid
    if (dot) dot.className = 'bio-status-dot connected';
    var rem = jwtInfo ? ' • Valid (' + jwtInfo.timeRemainingStr + ')' : '';
    if (text) text.textContent = 'Ready to Deploy (' + state.uuid.slice(0, 8) + '...)' + rem;
    if (btnDeploy) btnDeploy.title = 'Deploy bio directly to Janitor AI character';
  }

  async function autoFetchToken() {
    var btnFetch = document.getElementById('btn-bio-autofetch');
    var btnFetchLink = document.getElementById('btn-bio-autofetch-link');
    var tokenInput = document.getElementById('bio-input-token');
    var uuidInput = document.getElementById('bio-input-uuid');

    var originalFetchHtml = btnFetch ? btnFetch.innerHTML : '';
    if (btnFetch) {
      btnFetch.disabled = true;
      btnFetch.innerHTML = '<span class="bio-spinner" style="display:inline-block; width:12px; height:12px; border:2px solid rgba(240,185,45,0.3); border-top-color:#f0b92d; border-radius:50%; animation:bio-spin 0.7s linear infinite; margin-right:4px;"></span> Fetching...';
    }
    if (btnFetchLink) {
      btnFetchLink.disabled = true;
      btnFetchLink.style.opacity = '0.6';
    }

    try {
      var resp = await fetch('/api/janitor/autofetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      var data = await resp.json();

      if (resp.ok && data.ok && data.token) {
        state.token = extractCleanJwt(data.token);
        if (tokenInput) tokenInput.value = state.token;
        localStorage.setItem('singularity_jai_token', state.token);

        updateCredentialsStatus();

        var originInfo = data.browser ? (data.browser + (data.profile ? ' (' + data.profile + ')' : '')) : 'browser';
        var timeStr = data.time_remaining_str || 'active session';
        showToast('✓ Token auto-fetched from ' + originInfo + ' • ' + timeStr, 'success');

        if (!state.uuid && uuidInput) {
          uuidInput.focus();
        }
      } else {
        var detail = data.detail || 'No active JanitorAI session cookies found. Please make sure you are logged into janitorai.com.';
        showToast('⚠️ ' + detail, 'error');
      }
    } catch (err) {
      showToast('⚠️ Auto-fetch request failed: ' + (err.message || err), 'error');
    } finally {
      if (btnFetch) {
        btnFetch.disabled = false;
        btnFetch.innerHTML = originalFetchHtml;
      }
      if (btnFetchLink) {
        btnFetchLink.disabled = false;
        btnFetchLink.style.opacity = '1';
      }
    }
  }

  function setBioModel(val, displayName) {
    state.selectedModel = val;
    var hiddenInput = document.getElementById('bio-model-select');
    if (hiddenInput) hiddenInput.value = val;
    var label = document.getElementById('bio-model-selected-label');
    if (label) label.textContent = displayName || val;

    var menu = document.getElementById('bio-model-select-menu');
    if (menu) {
      menu.querySelectorAll('.claude-select-option').forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-value') === val);
      });
    }
    var wrap = document.getElementById('bio-model-select-wrap');
    if (wrap) wrap.classList.remove('open');
  }

  function setBioStyle(val, displayName) {
    state.selectedStyle = val;
    var hiddenInput = document.getElementById('bio-style-select');
    if (hiddenInput) hiddenInput.value = val;
    var label = document.getElementById('bio-style-selected-label');
    if (label) label.textContent = displayName || val;

    var menu = document.getElementById('bio-style-select-menu');
    if (menu) {
      menu.querySelectorAll('.claude-select-option').forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-value') === val);
      });
    }
    var wrap = document.getElementById('bio-style-select-wrap');
    if (wrap) wrap.classList.remove('open');
  }

  async function populateModelsDropdown() {
    var menu = document.getElementById('bio-model-select-menu');
    var label = document.getElementById('bio-model-selected-label');
    if (!menu) return;

    try {
      var res = await fetch('/api/models');
      if (res.ok) {
        var data = await res.json();
        var models = data.data || data.models || [];
        if (models.length > 0) {
          menu.innerHTML = '';
          var current = state.selectedModel || 'kimi-k3';
          var hasSelected = false;

          models.forEach(function(m) {
            var isSel = m.id === current;
            if (isSel) hasSelected = true;

            var optBtn = document.createElement('button');
            optBtn.type = 'button';
            optBtn.className = 'claude-select-option' + (isSel ? ' active' : '');
            optBtn.setAttribute('data-value', m.id);
            optBtn.innerHTML = '<span>' + (m.name || m.id) + '</span>' +
              '<svg class="option-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';

            optBtn.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
              setBioModel(m.id, m.name || m.id);
            });

            menu.appendChild(optBtn);
          });

          if (hasSelected) {
            var activeOpt = menu.querySelector('.claude-select-option.active span');
            if (activeOpt && label) label.textContent = activeOpt.textContent;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch models for Bio Studio, using catalog defaults:', e);
    }
  }

  function initBioCustomSelects() {
    var btnModel = document.getElementById('btn-bio-model-select');
    var wrapModel = document.getElementById('bio-model-select-wrap');
    var menuModel = document.getElementById('bio-model-select-menu');

    if (btnModel && wrapModel) {
      btnModel.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var isOpen = wrapModel.classList.toggle('open');
        btnModel.setAttribute('aria-expanded', String(isOpen));
        var wrapStyle = document.getElementById('bio-style-select-wrap');
        if (wrapStyle) wrapStyle.classList.remove('open');
      });
    }

    if (menuModel) {
      menuModel.querySelectorAll('.claude-select-option').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var val = btn.getAttribute('data-value');
          var txt = btn.querySelector('span') ? btn.querySelector('span').textContent : val;
          setBioModel(val, txt);
        });
      });
    }

    var btnStyle = document.getElementById('btn-bio-style-select');
    var wrapStyle = document.getElementById('bio-style-select-wrap');
    var menuStyle = document.getElementById('bio-style-select-menu');

    if (btnStyle && wrapStyle) {
      btnStyle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var isOpen = wrapStyle.classList.toggle('open');
        btnStyle.setAttribute('aria-expanded', String(isOpen));
        var wrapModel = document.getElementById('bio-model-select-wrap');
        if (wrapModel) wrapModel.classList.remove('open');
      });
    }

    if (menuStyle) {
      menuStyle.querySelectorAll('.claude-select-option').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var val = btn.getAttribute('data-value');
          var txt = btn.querySelector('span') ? btn.querySelector('span').textContent : val;
          setBioStyle(val, txt);
        });
      });
    }

    document.addEventListener('click', function(e) {
      if (wrapModel && !wrapModel.contains(e.target)) wrapModel.classList.remove('open');
      if (wrapStyle && !wrapStyle.contains(e.target)) wrapStyle.classList.remove('open');
    });
  }

  function switchSubtab(tabName) {
    state.activeSubtab = tabName;
    document.querySelectorAll('.bio-subnav-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.subtab === tabName);
    });
    document.querySelectorAll('.bio-tab-content').forEach(function(pane) {
      pane.classList.toggle('active', pane.id === 'bio-subtab-' + tabName);
    });
  }

  function switchOutputMode(mode) {
    state.outputMode = mode;
    document.querySelectorAll('.bio-output-mode-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    var body = document.getElementById('bio-output-body');
    if (body) {
      body.className = 'bio-output-body mode-' + mode;
    }
  }

  function loadTemplate(tplKey) {
    var textarea = document.getElementById('bio-prompt-input');
    if (!textarea) return;
    if (TEMPLATES[tplKey]) {
      textarea.value = TEMPLATES[tplKey];
      textarea.focus();
    }
  }

  function updateSandboxPreview(html) {
    var frame = document.getElementById('bio-sandbox-iframe');
    if (!frame) return;

    var sanitizedHtml = html || '<div style="padding: 40px; text-align: center; color: #71717a; font-family: Inter, sans-serif;">Synthesize or paste your bio code to see the live preview.</div>';

    var docContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Berkshire+Swash&family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&family=Dancing+Script:wght@400..700&family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Jura:wght@400;600;700&family=Lexend:wght@400;500;700&family=Monoton&family=Poppins:ital,wght@0,400;0,600;0,700;1,400&family=Press+Start+2P&family=Rock+Salt&family=VT323&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px 16px;
      background-color: #090a0f;
      color: #cbd5e1;
      font-family: Inter, sans-serif;
      min-height: 100vh;
      overflow-x: hidden;
    }
  </style>
</head>
<body>
  ${sanitizedHtml}
</body>
</html>`;

    frame.srcdoc = docContent;
  }

  async function synthesizeBio() {
    if (state.isGenerating) return;

    var inputEl = document.getElementById('bio-prompt-input');
    var userText = inputEl ? inputEl.value.trim() : '';
    if (!userText) {
      showToast('Please enter a character concept or bio draft first!', 'error');
      return;
    }

    var modelSelect = document.getElementById('bio-model-select');
    var chosenModel = modelSelect ? modelSelect.value : state.selectedModel;
    var styleSelect = document.getElementById('bio-style-select');
    var chosenStyle = styleSelect ? styleSelect.value : state.selectedStyle;

    var btn = document.getElementById('btn-bio-synthesize');
    var outputEditor = document.getElementById('bio-code-editor');

    state.isGenerating = true;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></span> Crafting Unrestricted Bio...';
    }

    // Switch to output tab so user sees real-time generation
    switchSubtab('output');
    if (outputEditor) outputEditor.value = 'Synthesizing with ' + chosenModel + '...\n';

    var promptPayload = `AESTHETIC STYLE: ${chosenStyle}
USER CHARACTER CONCEPT & SPECIFICATION:
${userText}

Please generate the complete, production-ready, beautiful inline-styled HTML for this JanitorAI bio following the DelighfulTempe technical guidelines and Anti-AI design manifesto.`;

    var fullHtml = '';

    try {
      var res = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: chosenModel,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: promptPayload }
          ],
          temperature: 0.85,
          stream: true
        })
      });

      if (!res.ok) {
        var err = await res.text();
        throw new Error('Gateway Error (' + res.status + '): ' + err);
      }

      var reader = res.body.getReader();
      var decoder = new TextDecoder('utf-8');
      var buffer = '';

      while (true) {
        var chunk = await reader.read();
        if (chunk.done) break;

        buffer += decoder.decode(chunk.value, { stream: true });
        var lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line.startsWith('data: ')) continue;
          var dataStr = line.slice(6);
          if (dataStr === '[DONE]') continue;

          try {
            var parsed = JSON.parse(dataStr);
            var delta = parsed.choices?.[0]?.delta?.content || '';
            fullHtml += delta;
            if (outputEditor) {
              outputEditor.value = fullHtml;
            }
          } catch (e) {
            // Ignore partial SSE tokens
          }
        }
      }

      // Strip markdown code fences if model returned them
      fullHtml = fullHtml.replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();

      state.generatedHtml = fullHtml;
      if (outputEditor) outputEditor.value = fullHtml;
      updateSandboxPreview(fullHtml);
      showToast('✓ Bio synthesis complete!', 'success');

    } catch (err) {
      console.error('Bio generation error:', err);
      showToast(err.message, 'error');
      if (outputEditor) outputEditor.value += '\n[Error]: ' + err.message;
    } finally {
      state.isGenerating = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg> Synthesize Unrestricted Bio';
      }
    }
  }

  function copyOutputHtml() {
    var editor = document.getElementById('bio-code-editor');
    var content = editor ? editor.value : state.generatedHtml;
    if (!content) {
      showToast('No HTML content to copy!', 'error');
      return;
    }

    navigator.clipboard.writeText(content).then(function() {
      var btn = document.getElementById('btn-bio-copy-html');
      if (btn) {
        var old = btn.innerHTML;
        btn.innerHTML = '✓ Copied!';
        setTimeout(function() { btn.innerHTML = old; }, 2000);
      }
      showToast('✓ Raw HTML copied to clipboard!', 'success');
    }).catch(function(err) {
      showToast('Failed to copy: ' + err, 'error');
    });
  }

  function copyConsoleScript() {
    var editor = document.getElementById('bio-code-editor');
    var htmlContent = editor ? editor.value : state.generatedHtml;
    if (!htmlContent) {
      showToast('No HTML content available to generate script!', 'error');
      return;
    }

    var uuid = state.uuid || 'TARGET-CHARACTER-UUID';
    var staticToken = state.token || '';

    var scriptOneLiner = `(() => {
  // 1. Resolve live fresh token from active session on janitorai.com
  let token = null;
  try {
    const k = Object.keys(localStorage).find(x => x.includes('auth-token'));
    if (k) token = JSON.parse(localStorage.getItem(k)).access_token;
  } catch (e) {}

  if (!token) {
    try {
      const match = document.cookie.match(/(?:^|;\\s*)(sb-[^=]+-auth-token)(?:\\.\\d+)?=/);
      const base = match ? match[1] : 'sb-auth-auth-token';
      const getC = n => {
        const parts = ('; ' + document.cookie).split('; ' + n + '=');
        return parts.length === 2 ? parts.pop().split(';').shift() : null;
      };
      let raw = getC(base) || [0,1,2,3,4].map(i => getC(base + '.' + i)).filter(Boolean).join('');
      if (raw) {
        let b64 = raw.replace(/^base64-/, '').replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        token = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)))).access_token;
      }
    } catch(e) {}
  }

  // Fallback to static token from Singularity
  if (!token) {
    token = ${JSON.stringify(staticToken)};
  }

  if (!token) {
    alert("Error: No access token found. Please ensure you are logged into janitorai.com.");
    return;
  }

  const payload = { "description": ${JSON.stringify(htmlContent)} };
  fetch("https://janitorai.com/mb/characters/${uuid}", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "authorization": "Bearer " + token
    },
    credentials: "include",
    body: JSON.stringify(payload)
  })
  .then(res => {
    if (!res.ok) throw new Error("HTTP " + res.status + " " + res.statusText);
    return res.json().catch(() => ({}));
  })
  .then(data => {
    console.log("%c[SUCCESS] JanitorAI Bot Bio Updated Successfully!", "color: #10b981; font-weight: bold; font-size: 14px;");
    console.log(data);
    if (token && typeof copy === 'function') {
      try {
        copy(token);
        console.log("%c[COPIED] Your fresh access_token was copied to your clipboard! Paste it into Singularity's Credentials tab for 1-click deployments.", "color: #38bdf8; font-weight: bold; font-size: 13px;");
      } catch(e) {}
    }
    alert("✓ Bio updated successfully on JanitorAI!\\n\\n(Your fresh token was also copied to your clipboard for Singularity)");
  })
  .catch(err => {
    console.error("%c[ERROR] Failed to update bio:", "color: #ef4444; font-size: 13px;", err);
    alert("Failed to update bio: " + err.message + "\\n\\nIf you see 401 Unauthorized, make sure you are currently logged in to janitorai.com.");
  });
})();`;

    navigator.clipboard.writeText(scriptOneLiner).then(function() {
      var btn = document.getElementById('btn-bio-copy-script');
      if (btn) {
        var old = btn.innerHTML;
        btn.innerHTML = '✓ Self-Healing Script Copied!';
        setTimeout(function() { btn.innerHTML = old; }, 2000);
      }
      showToast('✓ Self-healing injection script copied! Paste into janitorai.com console.', 'success');
    });
  }

  function copyTokenExtractor() {
    var cmd = "(() => { const m = document.cookie.match(/(?:^|;\\\\s*)(sb-[^=]+-auth-token)(?:\\\\.\\\\d+)?=/); const b = m ? m[1] : 'sb-auth-auth-token'; const gc = n => { const p = ('; ' + document.cookie).split('; ' + n + '='); return p.length === 2 ? p.pop().split(';').shift() : null; }; let r = gc(b) || [0,1,2,3,4].map(i => gc(b + '.' + i)).filter(Boolean).join(''); if (!r) { alert('No Janitor cookie found! Make sure you are logged in on janitorai.com'); return; } let b64 = r.replace(/^base64-/, '').replace(/-/g, '+').replace(/_/g, '/'); while (b64.length % 4) b64 += '='; const j = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)))); copy(j.access_token); console.log('%c[SUCCESS] Fresh access_token copied to clipboard!', 'color: #10b981; font-weight: bold; font-size: 14px;'); alert('✓ Fresh access_token copied to clipboard!\\n\\nNow paste it into Singularity\\'s Access Token field.'); })()";
    navigator.clipboard.writeText(cmd).then(function() {
      showToast('✓ Copied 1-second extractor command! Paste in DevTools on janitorai.com and press Enter.', 'success');
      var btn = document.getElementById('btn-bio-copy-extractor');
      if (btn) {
        var old = btn.innerHTML;
        btn.innerHTML = '✓ Copied Command!';
        setTimeout(function() { btn.innerHTML = old; }, 2500);
      }
    });
  }

  async function deployToJanitor() {
    var editor = document.getElementById('bio-code-editor');
    var htmlContent = editor ? editor.value : state.generatedHtml;

    if (!htmlContent) {
      showToast('No bio HTML content to deploy!', 'error');
      return;
    }

    if (!state.uuid || !state.token) {
      showToast('Please set your Janitor AI UUID and Access Token in the Credentials tab first!', 'error');
      switchSubtab('auth');
      return;
    }

    // Check client-side expiration
    var jwtInfo = parseJwtInfo(state.token);
    if (jwtInfo && jwtInfo.isExpired) {
      showToast('⚠️ Your Access Token expired ' + jwtInfo.timeRemainingStr + '. Please refresh on janitorai.com or use Copy Console Script.', 'error');
      switchSubtab('auth');
      return;
    }

    var btn = document.getElementById('btn-bio-deploy');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width: 12px; height: 12px; border-width: 2px;"></span> Deploying...';
    }

    try {
      var res = await fetch('/api/janitor/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuid: state.uuid,
          token: state.token,
          description: htmlContent
        })
      });

      var data = await res.json();
      if (res.ok && data.ok) {
        showToast('🚀 Bio successfully deployed to JanitorAI!', 'success');
      } else {
        throw new Error(data.detail || 'JanitorAI rejected request (HTTP ' + res.status + ')');
      }
    } catch (err) {
      console.error('Deploy error:', err);
      showToast(err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg> Deploy to JanitorAI';
      }
    }
  }

  function showToast(msg, type) {
    var toast = document.getElementById('bio-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'bio-toast';
      toast.className = 'bio-toast';
      document.body.appendChild(toast);
    }

    toast.className = 'bio-toast ' + (type || 'success') + ' visible';
    toast.textContent = msg;

    setTimeout(function() {
      toast.classList.remove('visible');
    }, 4200);
  }

  function bindEvents() {
    // Sub-nav tab clicks
    document.querySelectorAll('.bio-subnav-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        switchSubtab(btn.dataset.subtab);
      });
    });

    // Preset chips
    document.querySelectorAll('.bio-preset-chip').forEach(function(chip) {
      chip.addEventListener('click', function() {
        loadTemplate(chip.dataset.tpl);
      });
    });

    // Output Mode buttons
    document.querySelectorAll('.bio-output-mode-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        switchOutputMode(btn.dataset.mode);
      });
    });

    // Custom dropdowns initialization
    initBioCustomSelects();

    // Synthesize button
    var btnSynthesize = document.getElementById('btn-bio-synthesize');
    if (btnSynthesize) {
      btnSynthesize.addEventListener('click', synthesizeBio);
    }

    // Save Credentials button
    var btnSaveAuth = document.getElementById('btn-bio-save-auth');
    if (btnSaveAuth) {
      btnSaveAuth.addEventListener('click', saveCredentials);
    }

    // Auto-Fetch Token buttons
    var btnAutoFetch = document.getElementById('btn-bio-autofetch');
    if (btnAutoFetch) {
      btnAutoFetch.addEventListener('click', autoFetchToken);
    }
    var btnAutoFetchLink = document.getElementById('btn-bio-autofetch-link');
    if (btnAutoFetchLink) {
      btnAutoFetchLink.addEventListener('click', autoFetchToken);
    }

    // Copy Extractor button
    var btnExtractor = document.getElementById('btn-bio-copy-extractor');
    if (btnExtractor) {
      btnExtractor.addEventListener('click', copyTokenExtractor);
    }

    // Real-time token input feedback
    var tokenInput = document.getElementById('bio-input-token');
    if (tokenInput) {
      tokenInput.addEventListener('input', function() {
        state.token = tokenInput.value.trim();
        updateCredentialsStatus();
      });
    }

    // Copy HTML button
    var btnCopyHtml = document.getElementById('btn-bio-copy-html');
    if (btnCopyHtml) {
      btnCopyHtml.addEventListener('click', copyOutputHtml);
    }

    // Copy Script button
    var btnCopyScript = document.getElementById('btn-bio-copy-script');
    if (btnCopyScript) {
      btnCopyScript.addEventListener('click', copyConsoleScript);
    }

    // Deploy button
    var btnDeploy = document.getElementById('btn-bio-deploy');
    if (btnDeploy) {
      btnDeploy.addEventListener('click', deployToJanitor);
    }

    // Live code editor editing updates preview
    var codeEditor = document.getElementById('bio-code-editor');
    if (codeEditor) {
      var editDebounce = null;
      codeEditor.addEventListener('input', function() {
        clearTimeout(editDebounce);
        editDebounce = setTimeout(function() {
          state.generatedHtml = codeEditor.value;
          updateSandboxPreview(codeEditor.value);
        }, 400);
      });
    }
  }

  // Export public interface
  window.JanitorBioStudio = {
    init: init,
    switchSubtab: switchSubtab,
    synthesizeBio: synthesizeBio,
    deployToJanitor: deployToJanitor,
    saveCredentials: saveCredentials,
    autoFetchToken: autoFetchToken
  };

  // Auto initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
