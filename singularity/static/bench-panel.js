// ===================================================================
// Test bench mode of the Presets tab: scripted chats against a preset, checked against the request log
// ===================================================================
// The pure helpers are tested in tests/ui/bench-panel.test.js. Replies, queries and notes come from a model or the
// web and reach the page through textContent only.
(function (global) {
  'use strict';

  const STATUS = { pass: ['Pass', 'ok'], fail: ['Fail', 'bad'], error: ['Error', 'bad'] };
  const SEARCH_CHOICES = [['any', 'Do not check'], ['yes', 'It must search'], ['no', 'It must not search']];
  const MODEL_KEY = 'singularity_bench_model';

  // ---- pure helpers ----

  function statusLabel(status) { return (STATUS[status] || [status || '?', 'plain'])[0]; }
  function statusTone(status) { return (STATUS[status] || ['', 'plain'])[1]; }

  function summaryLine(run) {
    if (!run) return '';
    const s = run.summary || {};
    const base = `${s.pass || 0} passed, ${s.fail || 0} failed${s.error ? `, ${s.error} errors` : ''} (${s.done || 0} of ${s.total || 0} run)`;
    if (run.status === 'running') return `Running… ${base}`;
    if (run.status === 'cancelled') return `Cancelled. ${base}`;
    if (run.status === 'interrupted') return `Stopped when the server restarted. ${base}`;
    if (run.status === 'error') return `The run crashed. ${base}`;
    return base;
  }

  function lines(text) {
    return String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  }

  // The form's fields as the body the API wants.
  function scenarioPayload(f) {
    const messages = [];
    if (String(f.card || '').trim()) messages.push({ role: 'system', content: String(f.card) });
    messages.push({ role: 'user', content: String(f.message || '') });
    const seconds = Number(f.max_seconds);
    return {
      name: String(f.name || '').trim(),
      messages,
      expect: {
        search: f.search || 'any',
        query_any: lines(f.query_any),
        reply_any: lines(f.reply_any),
        reply_none: lines(f.reply_none),
        max_seconds: Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 120,
      },
    };
  }

  // The form for an existing custom test.
  function formFromScenario(sc) {
    const msgs = sc.messages || [];
    const sys = msgs[0] && msgs[0].role === 'system' ? msgs[0].content : '';
    const last = msgs[msgs.length - 1];
    const e = sc.expect || {};
    return {
      name: sc.name || '', card: sys, message: last ? last.content : '', search: e.search || 'any',
      query_any: (e.query_any || []).join('\n'), reply_any: (e.reply_any || []).join('\n'), reply_none: (e.reply_none || []).join('\n'),
      max_seconds: e.max_seconds || 120,
    };
  }

  function emptyForm() {
    return { name: '', card: '', message: '', search: 'any', query_any: '', reply_any: '', reply_none: '', max_seconds: 120 };
  }

  const helpers = { statusLabel, statusTone, summaryLine, scenarioPayload, formFromScenario, emptyForm, lines };
  global.SingularityBench = Object.assign(global.SingularityBench || {}, helpers);

  // ---- the panel (needs a page) ----
  if (typeof document === 'undefined' || !document.getElementById) return;

  const state = { presets: [], scenarios: { builtin: [], custom: [] }, picked: null, runs: [], run: null, running: null, form: null, formId: null, timer: null, card: '' };

  async function api(path, options) {
    const res = await fetch(`/api/bench${path}`, {
      ...(options || {}),
      headers: { 'Content-Type': 'application/json', ...((options && options.headers) || {}) },
    });
    let data = null;
    try { data = await res.json(); } catch (_) { /* no body */ }
    if (!res.ok) {
      const detail = data && (data.detail || (data.error && data.error.message) || data.error);
      throw new Error(res.status === 404 && (!detail || detail === 'Not Found')
        ? 'The Singularity server is older than this page. Restart it to use the test bench.'
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
  function root_() { return document.getElementById('pane-presets'); }
  function store(key, value) {
    try { if (value === undefined) return localStorage.getItem(key) || ''; localStorage.setItem(key, value); } catch (_) { /* no storage */ }
    return '';
  }

  function allScenarios() { return state.scenarios.builtin.concat(state.scenarios.custom); }

  // ---- sidebar ----

  function renderSidebar(root) {
    const box = root.querySelector('#bench-controls');
    box.textContent = '';
    const preset = el('select', { id: 'bench-preset' }, state.presets.map((p) => el('option', { value: p.name, text: p.name })));
    const wanted = store('singularity_bench_preset');
    if (wanted && state.presets.some((p) => p.name === wanted)) preset.value = wanted;
    preset.addEventListener('change', () => store('singularity_bench_preset', preset.value));
    const model = el('input', { type: 'text', id: 'bench-model', placeholder: 'Model, e.g. kimi-k3', value: store(MODEL_KEY) });
    model.addEventListener('input', () => store(MODEL_KEY, model.value.trim()));
    const card = el('textarea', { id: 'bench-card', rows: '4', placeholder: 'Optional. Leave empty to use a small made-up café character.' });
    card.value = state.card;
    card.addEventListener('input', () => { state.card = card.value; });
    const running = state.running != null;
    box.appendChild(el('label', { class: 'preset-field' }, [el('span', { class: 'preset-field-label', text: 'Preset to test' }), preset]));
    box.appendChild(el('label', { class: 'preset-field' }, [el('span', { class: 'preset-field-label', text: 'Model' }), model]));
    box.appendChild(el('details', { class: 'preset-field', open: !!state.card }, [el('summary', { class: 'preset-field-label', text: 'Character card (optional)' }), card]));
    box.appendChild(el('button', { type: 'button', class: 'btn btn-primary btn-sm', id: 'bench-run', text: running ? 'Running…' : 'Run the tests', disabled: running || !state.presets.length, onclick: start }));
    if (running) box.appendChild(el('button', { type: 'button', class: 'btn btn-secondary btn-sm', id: 'bench-cancel', text: 'Cancel', onclick: cancel }));
    box.appendChild(el('p', { class: 'preset-field-hint', text: 'Sends the ticked chats through the gateway like JanitorAI would, one after another, and checks each against the request log. It uses your provider quota. Nothing is faked.' }));

    const tests = root.querySelector('#bench-tests');
    tests.textContent = '';
    if (state.picked === null) state.picked = new Set(allScenarios().map((s) => s.id));
    tests.appendChild(el('h4', { class: 'log-step-title', text: 'Tests' }));
    allScenarios().forEach((s) => {
      const box_ = el('input', { type: 'checkbox', checked: state.picked.has(s.id) });
      box_.addEventListener('change', () => { if (box_.checked) state.picked.add(s.id); else state.picked.delete(s.id); });
      const label = el('label', { class: 'preset-check bench-test' }, [box_, el('span', { text: `${s.name}${s.builtin ? '' : ' (yours)'}` })]);
      const row = el('div', { class: 'bench-test-row' }, [label]);
      if (!s.builtin) row.appendChild(el('button', { type: 'button', class: 'preset-icon-btn', title: 'Edit this test', 'aria-label': `Edit ${s.name}`, text: '✎', onclick: () => editTest(s) }));
      tests.appendChild(row);
    });
    tests.appendChild(el('button', { type: 'button', class: 'btn btn-secondary btn-sm', id: 'bench-add', text: 'Add a test', onclick: () => editTest(null) }));

    const past = root.querySelector('#bench-past');
    past.textContent = '';
    past.appendChild(el('h4', { class: 'log-step-title', text: 'Earlier runs' }));
    if (!state.runs.length) past.appendChild(el('p', { class: 'presets-empty', text: 'No runs yet.' }));
    state.runs.forEach((r) => {
      const s = r.summary || {};
      past.appendChild(el('button', { type: 'button', class: `presets-list-item bench-run-item${state.run && state.run.id === r.id ? ' active' : ''}`, onclick: () => openRun(r.id) }, [
        el('span', { class: 'presets-list-name', text: `${r.model}@${r.preset}` }),
        el('span', { class: 'presets-list-meta', text: `${r.status === 'running' ? 'running' : `${s.pass || 0}/${s.total || 0} passed`} · ${new Date(r.created_at).toLocaleString()}` }),
      ]));
    });
  }

  // ---- results ----

  function resultCard(r) {
    const card = el('div', { class: `bench-result ${statusTone(r.status)}` }, [
      el('div', { class: 'bench-result-head' }, [
        el('span', { class: `log-badge ${statusTone(r.status)}`, text: statusLabel(r.status) }),
        el('strong', { text: ` ${r.name}` }),
        el('span', { class: 'presets-list-meta', text: r.ms != null ? `  ${(r.ms / 1000).toFixed(1)} s` : '' }),
      ]),
    ]);
    if (r.queries && r.queries.length) card.appendChild(el('div', { class: 'bench-queries', text: `Searched for: ${r.queries.join('  ·  ')}` }));
    (r.checks || []).forEach((c) => card.appendChild(el('div', { class: `bench-check ${c.ok ? 'ok' : 'bad'}` }, [
      el('span', { class: 'bench-check-mark', text: c.ok ? '✓' : '✗' }),
      el('span', { text: ` ${c.name}` }),
      c.detail ? el('span', { class: 'bench-check-detail', text: ` — ${c.detail}` }) : null,
    ])));
    (r.notes || []).forEach((n) => card.appendChild(el('div', { class: 'preset-field-hint', text: n })));
    if (r.reply) card.appendChild(el('details', { class: 'log-section' }, [el('summary', { text: 'Reply' }), el('pre', { class: 'log-pre', text: r.reply })]));
    if (r.log_id != null) {
      card.appendChild(el('button', { type: 'button', class: 'btn btn-secondary btn-sm bench-open-log', text: 'Open the log entry', onclick: () => openLog(r.log_id) }));
    }
    return card;
  }

  function openLog(id) {
    if (global.SingularityPresets && global.SingularityPresets.setMode) global.SingularityPresets.setMode('logs');
    if (global.SingularityRequestLog && global.SingularityRequestLog.showEntry) global.SingularityRequestLog.showEntry(id);
  }

  function renderEditor(root) {
    const host = root.querySelector('#bench-editor');
    host.textContent = '';
    if (state.form) { renderForm(host); return; }
    const run = state.run;
    if (!run) {
      host.appendChild(el('div', { class: 'presets-placeholder' }, [
        el('h3', { text: 'Test bench' }),
        el('p', { text: 'Pick a preset and a model, tick the tests, and run them. Each test is a short chat sent the way JanitorAI sends it. Afterwards every one is checked: did the model search when it should (and only then), did it search for the right thing, did the reply stay clean, was it fast enough. Add your own tests with "Add a test".' }),
      ]));
      return;
    }
    const s = run.settings || {};
    host.appendChild(el('div', { class: 'presets-editor-head' }, [
      el('h3', { text: `${run.model}@${run.preset}` }),
      el('div', { class: 'presets-editor-actions' }, [
        run.status === 'running' ? null : el('button', { type: 'button', class: 'btn btn-secondary btn-sm', id: 'bench-delete', text: 'Delete this run', onclick: () => removeRun(run.id) }),
      ]),
    ]));
    const failing = (run.summary || {}).fail || (run.summary || {}).error;
    host.appendChild(el('div', { class: `log-verdict ${run.status === 'running' ? 'warn' : failing ? 'bad' : 'ok'}`, id: 'bench-summary', text: summaryLine(run) }));
    host.appendChild(el('p', { class: 'preset-field-hint', text: `Preset when it ran: tools ${(s.tools || []).join(', ') || 'none'}, up to ${s.tool_max_steps || '?'} lookups, search focus ${s.focus || '?'}, ${s.card === 'custom' ? 'your character card' : 'the default character card'}.` }));
    (run.results || []).forEach((r) => host.appendChild(resultCard(r)));
  }

  function renderForm(host) {
    const f = state.form;
    const text = (key, label, extra) => {
      const input = el('input', { type: 'text', value: f[key], ...(extra || {}) });
      input.addEventListener('input', () => { f[key] = input.value; });
      return el('label', { class: 'preset-field' }, [el('span', { class: 'preset-field-label', text: label }), input]);
    };
    const area = (key, label, hint, rows) => {
      const input = el('textarea', { rows: String(rows || 3) });
      input.value = f[key];
      input.addEventListener('input', () => { f[key] = input.value; });
      return el('label', { class: 'preset-field' }, [el('span', { class: 'preset-field-label', text: label }), input, hint ? el('span', { class: 'preset-field-hint', text: hint }) : null]);
    };
    const searchSel = el('select', {}, SEARCH_CHOICES.map(([v, l]) => el('option', { value: v, text: l })));
    searchSel.value = f.search;
    searchSel.addEventListener('change', () => { f.search = searchSel.value; });
    host.appendChild(el('div', { class: 'presets-editor-head' }, [
      el('h3', { text: state.formId == null ? 'New test' : 'Edit test' }),
      el('div', { class: 'presets-editor-actions' }, [
        state.formId == null ? null : el('button', { type: 'button', class: 'btn btn-secondary btn-sm', id: 'bench-form-delete', text: 'Delete', onclick: removeTest }),
        el('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: 'Cancel', onclick: () => { state.form = null; renderEditor(root_()); } }),
        el('button', { type: 'button', class: 'btn btn-primary btn-sm', id: 'bench-form-save', text: 'Save test', onclick: saveTest }),
      ]),
    ]));
    host.appendChild(text('name', 'Name', { placeholder: 'e.g. Asks about a film' }));
    host.appendChild(area('card', 'Character card (optional)', 'Leave empty to use the card from the run.', 4));
    host.appendChild(area('message', 'What the user says', 'The chat ends with this message.', 3));
    host.appendChild(el('label', { class: 'preset-field' }, [el('span', { class: 'preset-field-label', text: 'Search' }), searchSel]));
    host.appendChild(area('query_any', 'The search must mention one of (one per line)', 'Only checked when the model must search.', 3));
    host.appendChild(area('reply_any', 'The reply must contain one of (one per line)', '', 3));
    host.appendChild(area('reply_none', 'The reply must not contain (one per line)', '', 3));
    host.appendChild(text('max_seconds', 'Slowest allowed (seconds)', { type: 'number', min: '5', max: '600' }));
  }

  // ---- actions ----

  function editTest(sc) {
    state.form = sc ? formFromScenario(sc) : emptyForm();
    state.formId = sc ? sc.db_id : null;
    renderEditor(root_());
  }

  async function saveTest() {
    try {
      const body = scenarioPayload(state.form);
      const saved = state.formId == null
        ? await api('/scenarios', { method: 'POST', body: JSON.stringify(body) })
        : await api(`/scenarios/${state.formId}`, { method: 'PUT', body: JSON.stringify(body) });
      state.form = null;
      await loadScenarios();
      if (state.picked) state.picked.add(saved.id);
      renderSidebar(root_());
      renderEditor(root_());
      toast('Test saved', 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function removeTest() {
    if (typeof global.confirm === 'function' && !global.confirm('Delete this test?')) return;
    try {
      await api(`/scenarios/${state.formId}`, { method: 'DELETE' });
      state.form = null;
      state.picked = null;
      await loadScenarios();
      renderSidebar(root_());
      renderEditor(root_());
    } catch (e) { toast(e.message, 'error'); }
  }

  async function loadScenarios() {
    state.scenarios = await api('/scenarios');
  }

  async function loadPresets() {
    const res = await fetch('/api/presets');
    const data = res.ok ? await res.json() : { presets: [] };
    state.presets = data.presets || [];
  }

  async function refreshRuns() {
    const data = await api('/runs');
    state.runs = data.runs || [];
    state.running = data.running == null ? null : data.running;
  }

  async function start() {
    const root = root_();
    const preset = root.querySelector('#bench-preset').value;
    const model = root.querySelector('#bench-model').value.trim();
    const card = root.querySelector('#bench-card').value;
    if (!model) { toast('Type the model to test, for example kimi-k3', 'error'); return; }
    try {
      const run = await api('/runs', { method: 'POST', body: JSON.stringify({ preset, model, card, scenarios: [...state.picked] }) });
      state.run = run;
      state.form = null;
      await refreshRuns();
      renderSidebar(root);
      renderEditor(root);
      poll();
    } catch (e) { toast(e.message, 'error'); }
  }

  async function cancel() {
    try { await api(`/runs/${state.running}/cancel`, { method: 'POST' }); toast('Cancelling after the current chat', 'info'); } catch (e) { toast(e.message, 'error'); }
  }

  async function openRun(id) {
    state.form = null;
    try { state.run = await api(`/runs/${id}`); } catch (e) { toast(e.message, 'error'); return; }
    renderSidebar(root_());
    renderEditor(root_());
    if (state.run.status === 'running') poll();
  }

  async function removeRun(id) {
    try {
      await api(`/runs/${id}`, { method: 'DELETE' });
      state.run = null;
      await refreshRuns();
      renderSidebar(root_());
      renderEditor(root_());
    } catch (e) { toast(e.message, 'error'); }
  }

  function poll() {
    if (state.timer) return;
    state.timer = setInterval(async () => {
      if (!state.run) return stopPoll();
      try {
        state.run = await api(`/runs/${state.run.id}`);
        await refreshRuns();
      } catch (_) { return stopPoll(); }
      const root = root_();
      renderSidebar(root);
      renderEditor(root);
      if (state.run.status !== 'running') stopPoll();
    }, 2000);
  }
  function stopPoll() { if (state.timer) { clearInterval(state.timer); state.timer = null; } }

  async function show() {
    const root = root_();
    if (!root || !root.querySelector('#bench-section')) return;
    try {
      await Promise.all([loadScenarios(), loadPresets(), refreshRuns()]);
    } catch (e) {
      const c = root.querySelector('#bench-controls');
      c.textContent = '';
      c.appendChild(el('p', { class: 'presets-empty', text: e.message }));
      return;
    }
    if (state.running != null && (!state.run || state.run.id !== state.running)) {
      try { state.run = await api(`/runs/${state.running}`); } catch (_) { /* shown later */ }
    }
    renderSidebar(root);
    renderEditor(root);
    if (state.run && state.run.status === 'running') poll();
  }

  global.SingularityBench.show = show;
})(typeof window !== 'undefined' ? window : globalThis);
