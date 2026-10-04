// ===================================================================
// API connections card (Cookie Stacker & Accounts tab): external OpenAI-compatible providers with your own key
// ===================================================================
// The pure helpers are tested in tests/ui/connections-panel.test.js. An API key is typed into a password field and sent
// once; the gateway never sends it back, so this page cannot show or leak it. Everything else reaches the page through
// textContent or element properties.
(function (global) {
  'use strict';

  const QUICK = [
    { label: 'OpenRouter', name: 'openrouter', base_url: 'https://openrouter.ai/api/v1', requires_key: true },
    { label: 'OpenAI', name: 'openai-api', base_url: 'https://api.openai.com/v1', requires_key: true },
    { label: 'DeepSeek', name: 'deepseek-api', base_url: 'https://api.deepseek.com/v1', requires_key: true },
    { label: 'Groq', name: 'groq', base_url: 'https://api.groq.com/openai/v1', requires_key: true },
    { label: 'Together', name: 'together', base_url: 'https://api.together.xyz/v1', requires_key: true },
    { label: 'Mistral', name: 'mistral', base_url: 'https://api.mistral.ai/v1', requires_key: true },
    { label: 'Ollama (this computer)', name: 'ollama', base_url: 'http://localhost:11434/v1', requires_key: false },
    { label: 'LM Studio (this computer)', name: 'lmstudio', base_url: 'http://localhost:1234/v1', requires_key: false },
  ];

  // ---- pure helpers ----

  function headersToText(headers) {
    return Object.entries(headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n');
  }
  function textToHeaders(text) {
    const out = {};
    String(text || '').split('\n').forEach((line) => {
      const i = line.indexOf(':');
      if (i > 0) {
        const k = line.slice(0, i).trim();
        const v = line.slice(i + 1).trim();
        if (k && v) out[k] = v;
      }
    });
    return out;
  }
  function linesToList(text) {
    const out = [];
    String(text || '').split('\n').forEach((l) => { const t = l.trim(); if (t && !out.includes(t)) out.push(t); });
    return out;
  }

  function emptyForm() {
    return { name: '', base_url: '', api_key: '', clear_key: false, requires_key: true, headers: '', models: '', enabled: true };
  }
  function formFromConnection(c) {
    return { name: c.name, base_url: c.base_url, api_key: '', clear_key: false, requires_key: c.requires_key, headers: headersToText(c.headers), models: (c.models || []).join('\n'), enabled: c.enabled };
  }

  // The body to send. A new connection sends its key; an existing one sends a key only when one was typed (or "remove").
  function payload(form, isNew) {
    const body = {
      name: String(form.name || '').trim().toLowerCase(),
      base_url: String(form.base_url || '').trim(),
      requires_key: !!form.requires_key,
      enabled: form.enabled !== false,
      headers: textToHeaders(form.headers),
      models: linesToList(form.models),
    };
    const key = String(form.api_key || '').trim();
    if (key) body.api_key = key;
    else if (form.clear_key && !isNew) body.api_key = '';
    return body;
  }

  function exampleModel(c) {
    const first = (c.models || [])[0] || 'model-name';
    return `${c.name}/${first}`;
  }

  const helpers = { headersToText, textToHeaders, linesToList, emptyForm, formFromConnection, payload, exampleModel, QUICK };
  global.SingularityConnections = Object.assign(global.SingularityConnections || {}, helpers);

  // ---- the card (needs a page) ----
  if (typeof document === 'undefined' || !document.getElementById) return;

  const state = { list: [], form: null, editing: null, busy: false, loaded: false };

  async function api(path, options) {
    const res = await fetch(`/api/connections${path}`, {
      ...(options || {}),
      headers: { 'Content-Type': 'application/json', ...((options && options.headers) || {}) },
    });
    let data = null;
    try { data = await res.json(); } catch (_) { /* no body */ }
    if (!res.ok) {
      const detail = data && (data.detail || (data.error && data.error.message) || data.error);
      throw new Error(res.status === 404 && (!detail || detail === 'Not Found')
        ? 'The Singularity server is older than this page. Restart it to use API connections.'
        : (typeof detail === 'string' ? detail : `HTTP ${res.status}`));
    }
    return data;
  }
  function toast(message, type) {
    if (typeof global.showToast === 'function') global.showToast(message, type || 'info');
  }
  function el(tag, props, children) {
    const node = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (k.includes('-')) node.setAttribute(k, v);
      else if (v !== undefined && v !== null && v !== false) node[k] = v;
    });
    (children || []).forEach((c) => c && node.appendChild(c));
    return node;
  }
  function host_() { return document.getElementById('connections-body'); }

  function refreshModelList() {
    // The model selectors read /v1/models; ask the page to reload them if it can.
    if (typeof global.fetchModels === 'function') { try { global.fetchModels(); } catch (_) { /* optional */ } }
  }

  function renderList(host) {
    const list = el('div', { class: 'conn-list' });
    if (!state.list.length) list.appendChild(el('p', { class: 'conn-empty', text: 'No API connections yet. Add one below to use a provider with your own key.' }));
    state.list.forEach((c) => {
      const switchBox = el('input', { type: 'checkbox', checked: c.enabled, title: 'Use this connection' });
      switchBox.addEventListener('change', async () => {
        try { await api(`/${encodeURIComponent(c.name)}`, { method: 'PUT', body: JSON.stringify({ enabled: switchBox.checked }) }); await load(); refreshModelList(); } catch (e) { toast(e.message, 'error'); switchBox.checked = c.enabled; }
      });
      list.appendChild(el('div', { class: `conn-row${c.enabled ? '' : ' off'}` }, [
        el('div', { class: 'conn-head' }, [
          switchBox,
          el('strong', { class: 'conn-name', text: c.name }),
          el('span', { class: `conn-tag ${c.requires_key ? (c.key_saved ? 'ok' : 'bad') : ''}`, text: c.requires_key ? (c.key_saved ? 'Key saved' : 'Needs a key') : 'No key needed' }),
          el('span', { class: 'conn-tag', text: `${(c.models || []).length} models` }),
        ]),
        el('div', { class: 'conn-url', text: c.base_url }),
        el('div', { class: 'conn-use', text: `Use as ${exampleModel(c)}  (add @preset to use a preset)` }),
        el('div', { class: 'conn-actions' }, [
          el('button', { type: 'button', class: 'btn btn-secondary btn-sm conn-load', text: 'Test and load models', onclick: () => loadModels(c) }),
          el('button', { type: 'button', class: 'btn btn-secondary btn-sm conn-edit', text: 'Edit', onclick: () => edit(c) }),
          el('button', { type: 'button', class: 'btn btn-secondary btn-sm conn-delete', text: 'Delete', onclick: () => remove(c) }),
        ]),
      ]));
    });
    host.appendChild(list);
  }

  function renderForm(host) {
    const f = state.form;
    const isNew = state.editing == null;
    const text = (key, label, attrs, hint) => {
      const input = el('input', { type: 'text', value: f[key], ...(attrs || {}) });
      input.addEventListener('input', () => { f[key] = input.value; });
      return el('label', { class: 'conn-field' }, [el('span', { class: 'conn-label', text: label }), input, hint ? el('span', { class: 'conn-hint', text: hint }) : null]);
    };
    const area = (key, label, rows, hint) => {
      const input = el('textarea', { rows: String(rows) });
      input.value = f[key];
      input.addEventListener('input', () => { f[key] = input.value; });
      return el('label', { class: 'conn-field' }, [el('span', { class: 'conn-label', text: label }), input, hint ? el('span', { class: 'conn-hint', text: hint }) : null]);
    };
    const keyInput = el('input', { type: 'password', id: 'conn-key', autocomplete: 'off', spellcheck: false, placeholder: isNew ? 'Paste the API key' : 'Leave empty to keep the saved key' });
    keyInput.addEventListener('input', () => { f.api_key = keyInput.value; });
    const noKey = el('input', { type: 'checkbox', checked: !f.requires_key });
    noKey.addEventListener('change', () => { f.requires_key = !noKey.checked; });
    const clear = el('input', { type: 'checkbox', checked: f.clear_key });
    clear.addEventListener('change', () => { f.clear_key = clear.checked; });

    const quick = el('div', { class: 'conn-quick' }, QUICK.map((q) => el('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: q.label, onclick: () => {
      f.name = q.name; f.base_url = q.base_url; f.requires_key = q.requires_key; render();
    } })));

    const form = el('div', { class: 'conn-form', id: 'conn-form' }, [
      el('h4', { class: 'conn-title', text: isNew ? 'Add an API connection' : `Edit ${state.editing}` }),
      isNew ? el('div', { class: 'conn-field' }, [el('span', { class: 'conn-label', text: 'Start from' }), quick]) : null,
      text('name', 'Name', { id: 'conn-name', placeholder: 'e.g. openrouter' }, 'Models are called as name/model, for example openrouter/deepseek/deepseek-r1.'),
      text('base_url', 'Base URL', { id: 'conn-url', placeholder: 'https://openrouter.ai/api/v1' }, 'The address that ends in /v1 (Singularity adds /chat/completions). Use https for anything on the internet.'),
      el('label', { class: 'conn-field' }, [el('span', { class: 'conn-label', text: 'API key' }), keyInput,
        el('span', { class: 'conn-hint', text: 'Stored encrypted on this computer and never shown again.' })]),
      el('label', { class: 'preset-check conn-check' }, [noKey, el('span', { text: 'This provider needs no key (Ollama, LM Studio)' })]),
      isNew ? null : el('label', { class: 'preset-check conn-check' }, [clear, el('span', { text: 'Remove the saved key' })]),
      area('models', 'Models (one per line, optional)', 4, 'Filled in by "Test and load models". You can also type any model id in a request without listing it.'),
      area('headers', 'Extra headers (optional, one "Name: value" per line)', 2, 'For example HTTP-Referer or X-Title on OpenRouter. Never put the key here.'),
      el('div', { class: 'conn-actions' }, [
        el('button', { type: 'button', class: 'btn btn-primary btn-sm', id: 'conn-save', text: state.busy ? 'Saving…' : 'Save', disabled: state.busy, onclick: save }),
        el('button', { type: 'button', class: 'btn btn-secondary btn-sm', id: 'conn-cancel', text: 'Cancel', onclick: () => { state.form = null; state.editing = null; render(); } }),
      ]),
    ]);
    host.appendChild(form);
  }

  function render() {
    const host = host_();
    if (!host) return;
    host.textContent = '';
    renderList(host);
    if (state.form) renderForm(host);
    else host.appendChild(el('button', { type: 'button', class: 'btn btn-primary btn-sm', id: 'conn-add', text: 'Add a connection', onclick: () => { state.form = emptyForm(); state.editing = null; render(); } }));
  }

  async function load() {
    const data = await api('');
    state.list = data.connections || [];
    state.loaded = true;
    render();
  }

  function edit(c) { state.form = formFromConnection(c); state.editing = c.name; render(); }

  async function save() {
    const isNew = state.editing == null;
    state.busy = true; render();
    try {
      const body = payload(state.form, isNew);
      if (isNew) await api('', { method: 'POST', body: JSON.stringify(body) });
      else await api(`/${encodeURIComponent(state.editing)}`, { method: 'PUT', body: JSON.stringify(body) });
      state.form = null; state.editing = null;
      toast('Connection saved', 'success');
      state.busy = false;
      await load();
      refreshModelList();
    } catch (e) {
      state.busy = false; render();
      toast(e.message, 'error');
    }
  }

  async function loadModels(c) {
    toast(`Asking ${c.name} for its models…`, 'info');
    try {
      const data = await api(`/${encodeURIComponent(c.name)}/models`, { method: 'POST' });
      toast(`${c.name}: key and address work, ${data.count} models loaded`, 'success');
      await load();
      refreshModelList();
    } catch (e) { toast(e.message, 'error'); }
  }

  async function remove(c) {
    if (typeof global.confirm === 'function' && !global.confirm(`Delete the connection "${c.name}"? Its key is deleted too.`)) return;
    try { await api(`/${encodeURIComponent(c.name)}`, { method: 'DELETE' }); await load(); refreshModelList(); } catch (e) { toast(e.message, 'error'); }
  }

  function show() {
    if (!host_()) return;
    load().catch((e) => {
      const host = host_();
      host.textContent = '';
      host.appendChild(el('p', { class: 'conn-empty', text: e.message }));
    });
  }

  global.SingularityConnections.show = show;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show);
  else show();
})(typeof window !== 'undefined' ? window : globalThis);
