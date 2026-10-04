// ===================================================================
// Request log mode of the Presets tab: did a search happen, what was asked, what did the model get
// ===================================================================
// The pure helpers are tested in tests/ui/logs-panel.test.js. Everything in a log (chat text, web results, model
// output) reaches the page through textContent, never innerHTML, and web addresses are shown as text, not links.
(function (global) {
  'use strict';

  const OUTCOMES = {
    searched: ['Searched', 'ok'],
    search_failed: ['Search failed', 'bad'],
    no_search: ['Did not search', 'warn'],
    answered: ['Answered', 'plain'],
    error: ['Error', 'bad'],
  };

  // ---- pure helpers ----

  function outcomeLabel(outcome) {
    return (OUTCOMES[outcome] || [outcome || '?', 'plain'])[0];
  }
  function outcomeTone(outcome) {
    return (OUTCOMES[outcome] || ['', 'plain'])[1];
  }

  // One sentence a person can read to learn whether the search worked.
  function verdict(log) {
    if (!log) return '';
    if (log.outcome === 'error') return `The request failed: ${log.error || 'unknown error'}`;
    if (log.outcome === 'searched') {
      const ok = log.searches_ok;
      const failed = log.searches - ok;
      return `The model searched ${log.searches} time${log.searches === 1 ? '' : 's'}; ${ok} worked${failed ? `, ${failed} failed` : ''}.`;
    }
    if (log.outcome === 'search_failed') return `The model tried to search ${log.searches} time${log.searches === 1 ? '' : 's'} but nothing worked, so it answered without results.`;
    if (log.outcome === 'no_search') return 'Tools were on, but the model answered without searching.';
    return 'No tools were on for this request.';
  }

  function timeLabel(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso || '');
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function msLabel(ms) {
    if (ms == null) return '';
    return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`;
  }

  function shorten(text, n) {
    const t = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
    return t.length > n ? `${t.slice(0, n - 1)}…` : t;
  }

  function modelLine(log) {
    return log.preset ? `${log.model}@${log.preset}` : log.model || log.requested_model || '?';
  }

  const helpers = { outcomeLabel, outcomeTone, verdict, timeLabel, msLabel, shorten, modelLine };
  global.SingularityRequestLog = Object.assign(global.SingularityRequestLog || {}, helpers);

  // ---- the panel (needs a page) ----
  if (typeof document === 'undefined' || !document.getElementById) return;

  const state = { logs: [], settings: { enabled: true, keep: 200 }, selected: null, detail: null, onlySearches: false, busy: false };

  async function api(path, options) {
    const res = await fetch(`/api/request-logs${path}`, {
      ...(options || {}),
      headers: { 'Content-Type': 'application/json', ...((options && options.headers) || {}) },
    });
    let data = null;
    try { data = await res.json(); } catch (_) { /* no body */ }
    if (!res.ok) {
      const detail = data && (data.detail || (data.error && data.error.message) || data.error);
      throw new Error(res.status === 404 && (!detail || detail === 'Not Found')
        ? 'The Singularity server is older than this page. Restart it to use the request log.'
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

  function pre(text, extra) {
    return el('pre', { class: `log-pre ${extra || ''}`.trim(), text: text == null || text === '' ? '(empty)' : String(text) });
  }
  function row(label, value) {
    return el('div', { class: 'log-row' }, [el('span', { class: 'log-row-label', text: label }), el('span', { class: 'log-row-value', text: value })]);
  }
  function section(title, children, open) {
    const d = el('details', { class: 'log-section', open: !!open }, [el('summary', { text: title })]);
    children.forEach((c) => c && d.appendChild(c));
    return d;
  }

  function messagesBlock(messages) {
    return el('div', { class: 'log-messages' }, (messages || []).map((m) => el('div', { class: `log-msg role-${m.role}` }, [
      el('div', { class: 'log-msg-head', text: `${m.role} · ${m.chars.toLocaleString()} characters` }),
      pre(m.content),
    ])));
  }

  function stepCard(step, isLast) {
    const kids = [];
    const added = step.sent.length;
    const label = step.step === 1
      ? `Sent to the model: ${step.sent_total} message${step.sent_total === 1 ? '' : 's'}`
      : `Sent to the model: ${added} new message${added === 1 ? '' : 's'} on top of the ${step.sent_from} before`;
    kids.push(section(label, [messagesBlock(step.sent)], step.step > 1));
    if (step.reasoning) kids.push(section(`Model thinking (${(step.reasoning_chars || step.reasoning.length).toLocaleString()} characters)`, [pre(step.reasoning)], false));
    kids.push(section(`Model wrote${step.ms_model != null ? ` (${msLabel(step.ms_model)})` : ''}`, [pre(step.output)], !!step.call || isLast));
    if (step.model_error) kids.push(el('div', { class: 'log-callout bad', text: `The provider reported: ${step.model_error}` }));
    if (step.call) {
      const q = step.call.arguments || {};
      kids.push(el('div', { class: 'log-callout' }, [
        el('strong', { text: `Tool call: ${step.call.name}` }),
        pre(JSON.stringify(q, null, 2)),
      ]));
    }
    if (step.tool) {
      const t = step.tool;
      const bits = [t.ok ? 'worked' : 'failed'];
      if (t.backend) bits.push(`via ${t.backend}`);
      if (t.summary) bits.push(t.summary);
      if (t.ms != null) bits.push(msLabel(t.ms));
      const box = el('div', { class: `log-callout ${t.ok ? 'ok' : 'bad'}` }, [el('strong', { text: `Result: ${bits.join(' · ')}` })]);
      if (t.error) box.appendChild(pre(t.error));
      const d = t.detail || {};
      if (Array.isArray(d.tried) && d.tried.length) box.appendChild(row('Backends tried', d.tried.join(', ')));
      if (d.cached) box.appendChild(row('From cache', 'yes (an identical search a moment ago)'));
      if (Array.isArray(d.notes) && d.notes.length) box.appendChild(row('Fallbacks', d.notes.join('; ')));
      (t.sources || []).forEach((s) => box.appendChild(el('div', { class: 'log-source' }, [
        el('div', { class: 'log-source-title', text: `[${s.n}] ${s.title}` }),
        el('div', { class: 'log-source-url', text: s.url }),
        s.snippet ? el('div', { class: 'log-source-snippet', text: s.snippet }) : null,
      ])));
      kids.push(box);
    }
    if (step.limit_reached) kids.push(el('div', { class: 'log-callout warn', text: 'The search limit was reached; the model was told to answer with what it had.' }));
    return el('div', { class: 'log-step' }, [el('h4', { class: 'log-step-title', text: `Call ${step.step} to the model` }), ...kids]);
  }

  function renderDetail(root) {
    const host = root.querySelector('#log-editor');
    host.textContent = '';
    const log = state.detail;
    if (!log) {
      host.appendChild(el('div', { class: 'presets-placeholder' }, [
        el('h3', { text: 'Request log' }),
        el('p', { text: 'Pick a request on the left to see what the model was sent, what it searched for and what came back. Requests that use a preset or tools are logged; plain chats are not.' }),
      ]));
      return;
    }
    const t = log.trace || {};
    const req = t.request || {};
    const pipe = t.pipeline || {};

    host.appendChild(el('div', { class: 'presets-editor-head' }, [
      el('h3', { text: `${modelLine(log)}` }),
      el('div', { class: 'presets-editor-actions' }, [
        el('button', { type: 'button', class: 'btn btn-secondary btn-sm', id: 'log-copy', text: 'Copy as JSON', onclick: async () => {
          try { await navigator.clipboard.writeText(JSON.stringify(log, null, 2)); toast('Copied the whole log entry', 'success'); } catch (_) { toast('Could not copy', 'error'); }
        } }),
        el('button', { type: 'button', class: 'btn btn-secondary btn-sm', id: 'log-delete', text: 'Delete', onclick: () => removeOne(log.id) }),
      ]),
    ]));

    host.appendChild(el('div', { class: `log-verdict ${outcomeTone(log.outcome)}`, id: 'log-verdict', text: verdict(log) }));

    host.appendChild(section('Request', [
      row('Time', timeLabel(log.created_at)),
      row('Model sent by the client', log.requested_model || ''),
      row('Routed to', `${log.model} on ${log.provider}`),
      row('From', log.origin || 'local / no origin'),
      row('Streaming', log.stream ? 'yes' : 'no'),
      row('Took', msLabel(log.ms)),
      row('Messages received', `${(req.incoming || {}).messages || 0} (${Object.entries((req.incoming || {}).roles || {}).map(([r, n]) => `${n} ${r}`).join(', ') || 'none'})`),
    ], true));

    const pipeRows = [];
    if (pipe.preset) pipeRows.push(row('Preset', `${pipe.preset} (${pipe.blocks_on} block${pipe.blocks_on === 1 ? '' : 's'} on)`));
    if (pipe.regex_messages_changed != null) pipeRows.push(row('Regex rewrote', `${pipe.regex_messages_changed} message${pipe.regex_messages_changed === 1 ? '' : 's'}`));
    if ((pipe.lorebooks_linked || []).length) {
      pipeRows.push(row('Lorebooks linked', pipe.lorebooks_linked.join(', ')));
      pipeRows.push(row('Lorebook entries added', (pipe.lore_fired || []).length ? pipe.lore_fired.map((f) => `${f.name || '(unnamed)'} [${f.lorebook}]`).join('; ') : 'none matched'));
      if (pipe.lore_dropped) pipeRows.push(row('Over the token budget', `${pipe.lore_dropped} entr${pipe.lore_dropped === 1 ? 'y' : 'ies'} left out`));
      (pipe.lore_warnings || []).forEach((w) => pipeRows.push(row('Lorebook warning', w)));
    }
    if (pipe.messages_after_preset != null) pipeRows.push(row('Messages after the preset', String(pipe.messages_after_preset)));
    const toolNames = req.tools || [];
    pipeRows.push(row('Tools', toolNames.length ? `${toolNames.join(', ')} (from the ${pipe.tools_from || '?'})` : 'none'));
    if (toolNames.length) {
      if (pipe.tool_max_steps) pipeRows.push(row('Lookups allowed', String(pipe.tool_max_steps)));
      if (pipe.search_focus) pipeRows.push(row('Search focus', pipe.search_focus));
      if (pipe.search_backend) pipeRows.push(row('Search backend setting', pipe.search_backend));
    }
    host.appendChild(section('What the gateway did first', pipeRows, true));

    const steps = t.steps || [];
    steps.forEach((s, i) => host.appendChild(stepCard(s, i === steps.length - 1)));

    const reply = t.reply || {};
    host.appendChild(el('div', { class: 'log-step' }, [
      el('h4', { class: 'log-step-title', text: `What the client received (${(reply.chars || 0).toLocaleString()} characters)` }),
      reply.reasoning ? section('Thinking shown in the thinking box', [pre(reply.reasoning)], false) : null,
      pre(reply.content),
      el('p', { class: 'preset-field-hint', text: 'This is the text as the model produced it, before persona clean-up.' }),
    ]));
  }

  function renderList(root) {
    const list = root.querySelector('#log-list');
    list.textContent = '';
    const shown = state.onlySearches ? state.logs.filter((l) => l.searches > 0) : state.logs;
    if (!shown.length) {
      list.appendChild(el('p', { class: 'presets-empty', text: state.logs.length ? 'No request searched.' : 'Nothing logged yet. Send a request with a preset or tools.' }));
      return;
    }
    shown.forEach((l) => {
      const item = el('button', { type: 'button', class: `presets-list-item log-item${state.selected === l.id ? ' active' : ''}`, onclick: () => open(l.id) }, [
        el('span', { class: 'presets-list-name' }, [
          el('span', { class: `log-badge ${outcomeTone(l.outcome)}`, text: outcomeLabel(l.outcome) }),
          el('span', { text: ` ${modelLine(l)}` }),
        ]),
        el('span', { class: 'presets-list-meta', text: `${timeLabel(l.created_at)} · ${msLabel(l.ms)}` }),
        l.queries.length ? el('span', { class: 'presets-list-meta log-queries', text: `🔎 ${l.queries.map((q) => shorten(q, 40)).join(' · ')}` }) : null,
      ]);
      list.appendChild(item);
    });
  }

  function renderSettings(root) {
    const box = root.querySelector('#log-settings');
    box.textContent = '';
    const on = el('input', { type: 'checkbox', checked: state.settings.enabled });
    on.addEventListener('change', async () => {
      try { state.settings = await api('/settings', { method: 'PUT', body: JSON.stringify({ enabled: on.checked }) }); } catch (e) { toast(e.message, 'error'); on.checked = state.settings.enabled; }
    });
    const only = el('input', { type: 'checkbox', checked: state.onlySearches });
    only.addEventListener('change', () => { state.onlySearches = only.checked; renderList(root); });
    box.appendChild(el('label', { class: 'preset-check' }, [on, el('span', { text: `Keep a log (newest ${state.settings.keep})` })]));
    box.appendChild(el('label', { class: 'preset-check' }, [only, el('span', { text: 'Only requests that searched' })]));
  }

  async function open(id) {
    state.selected = id;
    renderList(root_());
    try {
      state.detail = await api(`/${id}`);
    } catch (e) {
      state.detail = null;
      toast(e.message, 'error');
    }
    renderDetail(root_());
  }

  async function removeOne(id) {
    try {
      await api(`/${id}`, { method: 'DELETE' });
      state.selected = null;
      state.detail = null;
      await refresh();
    } catch (e) { toast(e.message, 'error'); }
  }

  async function clearAll() {
    if (typeof global.confirm === 'function' && !global.confirm('Delete every log entry?')) return;
    try {
      await api('', { method: 'DELETE' });
      state.selected = null;
      state.detail = null;
      await refresh();
    } catch (e) { toast(e.message, 'error'); }
  }

  async function refresh() {
    const root = root_();
    const data = await api('?limit=100');
    state.logs = data.logs || [];
    state.settings = data.settings || state.settings;
    if (state.selected && !state.logs.some((l) => l.id === state.selected)) { state.selected = null; state.detail = null; }
    renderSettings(root);
    renderList(root);
    renderDetail(root);
  }

  function show() {
    const root = root_();
    if (!root || !root.querySelector('#log-section')) return;
    if (!root.dataset.logReady) {
      root.dataset.logReady = '1';
      root.querySelector('#log-refresh').addEventListener('click', () => refresh().catch((e) => toast(e.message, 'error')));
      root.querySelector('#log-clear').addEventListener('click', clearAll);
    }
    refresh().catch((e) => {
      const list = root.querySelector('#log-list');
      list.textContent = '';
      list.appendChild(el('p', { class: 'presets-empty', text: e.message }));
    });
  }

  // Used by the test bench to jump to the entry behind a result.
  async function showEntry(id) {
    show();
    await open(id);
  }

  global.SingularityRequestLog.show = show;
  global.SingularityRequestLog.showEntry = showEntry;
})(typeof window !== 'undefined' ? window : globalThis);
