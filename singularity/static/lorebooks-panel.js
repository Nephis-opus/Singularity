// ===================================================================
// Lorebooks mode of the Presets tab: list, import, settings, entry editor, "try it"
// ===================================================================
// The pure helpers are tested in tests/ui/lorebooks-panel.test.js. Everything a user typed (and everything in an
// imported file) reaches the page through textContent or element properties, never innerHTML.
(function (global) {
  'use strict';

  const POSITIONS = [
    ['before', 'Above the card'],
    ['after', 'Right after the card'],
    ['depth', 'Inside the chat'],
    ['an_top', "Author's note, top"],
    ['an_bottom', "Author's note, bottom"],
    ['em_top', 'Example messages, top'],
    ['em_bottom', 'Example messages, bottom'],
  ];
  const LOGICS = [['and_any', 'and any of'], ['and_all', 'and all of'], ['not_any', 'and none of'], ['not_all', 'and not all of']];
  const ROLES = ['system', 'user', 'assistant'];
  const PAGE = 40;

  // ---- pure helpers ----

  function newEntry() {
    return {
      id: '', name: '', keys: [], secondary_keys: [], logic: 'and_any', constant: false, disabled: false, position: 'before',
      depth: 4, role: 'system', order: 100, probability: 100, scan_depth: null, case_sensitive: null, match_whole_words: null,
      prevent_recursion: false, exclude_recursion: false, delay_until_recursion: false, content: '',
    };
  }

  function keysToText(keys) {
    return (keys || []).join('\n');
  }
  function textToKeys(text) {
    const out = [];
    String(text || '').split('\n').forEach((line) => {
      const k = line.trim();
      if (k && !out.includes(k)) out.push(k);
    });
    return out;
  }

  // '' = use the lorebook's setting, 'yes' / 'no' = the entry decides.
  function triToValue(text) {
    return text === 'yes' ? true : text === 'no' ? false : null;
  }
  function valueToTri(value) {
    return value === true ? 'yes' : value === false ? 'no' : '';
  }

  function numberOrNull(text) {
    const t = String(text == null ? '' : text).trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

  function positionLabel(position) {
    const found = POSITIONS.find(([v]) => v === position);
    return found ? found[1] : position;
  }

  // What the server stores: only the entry fields, with numbers as numbers.
  function payloadEntry(d) {
    return {
      name: d.name || '',
      keys: Array.isArray(d.keys) ? d.keys : [],
      secondary_keys: Array.isArray(d.secondary_keys) ? d.secondary_keys : [],
      logic: d.logic || 'and_any',
      constant: !!d.constant,
      disabled: !!d.disabled,
      position: d.position || 'before',
      depth: Number.isFinite(Number(d.depth)) ? Number(d.depth) : 4,
      role: d.role || 'system',
      order: Number.isFinite(Number(d.order)) ? Number(d.order) : 100,
      probability: Number.isFinite(Number(d.probability)) ? Number(d.probability) : 100,
      scan_depth: d.scan_depth == null || d.scan_depth === '' ? null : Number(d.scan_depth),
      case_sensitive: d.case_sensitive === undefined ? null : d.case_sensitive,
      match_whole_words: d.match_whole_words === undefined ? null : d.match_whole_words,
      prevent_recursion: !!d.prevent_recursion,
      exclude_recursion: !!d.exclude_recursion,
      delay_until_recursion: !!d.delay_until_recursion,
      content: d.content || '',
    };
  }

  function entryTitle(e) {
    return e.name || (e.keys && e.keys[0]) || (e.constant ? '(always on)' : '(no name)');
  }

  function entrySummary(e) {
    const bits = [];
    if (e.constant) bits.push('always on');
    else if (e.keys && e.keys.length) bits.push(`keys: ${e.keys.slice(0, 4).join(', ')}${e.keys.length > 4 ? ` +${e.keys.length - 4}` : ''}`);
    if (e.secondary_keys && e.secondary_keys.length) bits.push(`${e.secondary_keys.length} secondary`);
    bits.push(e.position === 'depth' ? `inside the chat, depth ${e.depth}` : positionLabel(e.position).toLowerCase());
    bits.push(`order ${e.order}`);
    if (e.probability != null && e.probability < 100) bits.push(`${e.probability}%`);
    return bits.join(' · ');
  }

  // Entries that match the search words (name, keys, text), optionally hiding the switched-off ones.
  function filterEntries(entries, query, showOff) {
    const words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
    return (entries || []).filter((e) => {
      if (!showOff && e.disabled) return false;
      if (!words.length) return true;
      const hay = `${e.name || ''}\n${(e.keys || []).join(' ')}\n${(e.secondary_keys || []).join(' ')}\n${e.content || ''}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }

  function nameFromFile(filename) {
    const base = String(filename || '').trim().replace(/\.json$/i, '').toLowerCase().replace(/[^a-z0-9_]+/g, '-').replace(/^[-_]+|[-_]+$/g, '');
    return base.slice(0, 40).replace(/^[-_]+|[-_]+$/g, '') || 'lorebook';
  }

  function reportLines(report) {
    const r = report || {};
    const lines = [`${r.entries || 0} entries imported (${r.disabled || 0} switched off, ${r.constant || 0} always on, ${r.selective || 0} with secondary keys).`];
    if (r.regex_keys) lines.push(`${r.regex_keys} entr${r.regex_keys === 1 ? 'y uses' : 'ies use'} regex keys.`);
    if (r.empty_dropped) lines.push(`${r.empty_dropped} empty entr${r.empty_dropped === 1 ? 'y was' : 'ies were'} left out.`);
    if (r.groups_ignored) lines.push(`${r.groups_ignored} entr${r.groups_ignored === 1 ? 'y belongs' : 'ies belong'} to an inclusion group, which is not supported (they work on their own).`);
    if (r.timed_effects_ignored) lines.push(`${r.timed_effects_ignored} entr${r.timed_effects_ignored === 1 ? 'y has' : 'ies have'} sticky, cooldown or delay, which is not supported.`);
    if (r.outlet_entries) lines.push(`${r.outlet_entries} outlet entr${r.outlet_entries === 1 ? 'y was' : 'ies were'} switched off (an outlet has nowhere to go here).`);
    if (r.character_filters_ignored) lines.push(`${r.character_filters_ignored} character filter${r.character_filters_ignored === 1 ? ' is' : 's are'} ignored.`);
    (r.settings_clamped || []).forEach((c) => lines.push(`Setting adjusted: ${c}.`));
    return lines;
  }

  function testLines(result) {
    const r = result || {};
    const lines = (r.fired || []).map((f) => `✓ ${f.name || f.id} · ${positionLabel(f.position)} · order ${f.order} · ${f.via}`);
    (r.dropped || []).forEach((d) => lines.push(`✗ ${d.name || d.id} fired but did not fit the budget`));
    (r.warnings || []).forEach((w) => lines.push(`! ${w}`));
    if (!lines.length) lines.push('Nothing fires for that text.');
    return lines;
  }

  const helpers = {
    newEntry, keysToText, textToKeys, triToValue, valueToTri, numberOrNull, positionLabel, payloadEntry, entryTitle, entrySummary,
    filterEntries, nameFromFile, reportLines, testLines,
  };
  global.SingularityLorebooks = Object.assign(global.SingularityLorebooks || {}, helpers);

  // ---- the panel (needs a page) ----
  if (typeof document === 'undefined' || !document.getElementById) return;

  const state = {
    books: [], selected: null, book: null, draft: null, isNew: false, report: null, busy: false,
    query: '', showOff: true, shown: PAGE, editing: null, editDraft: null, testText: '', testResult: null,
  };

  async function api(path, options) {
    const res = await fetch(`/api/lorebooks${path}`, {
      ...(options || {}),
      headers: { 'Content-Type': 'application/json', ...((options && options.headers) || {}) },
    });
    let data = null;
    try { data = await res.json(); } catch (_) { /* no body */ }
    if (!res.ok) {
      const detail = data && (data.detail || data.error);
      throw new Error(typeof detail === 'string' && detail !== 'Not Found' ? detail
        : res.status === 404 && detail === 'Not Found' ? 'The Singularity server is older than this page. Restart it to use lorebooks.' : `HTTP ${res.status}`);
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

  function field(label, input, hint) {
    return el('label', { class: 'preset-field' }, [
      el('span', { class: 'preset-field-label', text: label }),
      input,
      hint ? el('span', { class: 'preset-field-hint', text: hint }) : null,
    ]);
  }

  function textInput(value, onInput, extra) {
    const input = el('input', { type: 'text', value: value == null ? '' : String(value), ...(extra || {}) });
    input.addEventListener('input', () => onInput(input.value));
    return input;
  }

  function numberInput(value, onInput, extra) {
    const input = el('input', { type: 'number', value: value == null ? '' : String(value), ...(extra || {}) });
    input.addEventListener('input', () => onInput(input.value));
    return input;
  }

  function select(options, value, onChange, extra) {
    const wrap = el('div', { class: 'claude-custom-select-wrap', ...(extra && extra.id ? { id: `${extra.id}-wrap` } : {}) });
    const norm = options.map((opt) => (Array.isArray(opt) ? opt : [opt, opt]));
    let current = value != null ? String(value) : (norm[0] ? String(norm[0][0]) : '');

    const getLabel = (v) => {
      const found = norm.find(([val]) => String(val) === String(v));
      return found ? (found[1] != null ? String(found[1]) : String(found[0])) : (norm[0] ? String(norm[0][1]) : '');
    };

    const labelSpan = el('span', { class: 'claude-custom-select-text', text: getLabel(current) });

    const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chevron.setAttribute('width', '12');
    chevron.setAttribute('height', '12');
    chevron.setAttribute('viewBox', '0 0 24 24');
    chevron.setAttribute('fill', 'none');
    chevron.setAttribute('stroke', 'currentColor');
    chevron.setAttribute('stroke-width', '2.5');
    chevron.setAttribute('stroke-linecap', 'round');
    chevron.setAttribute('stroke-linejoin', 'round');
    chevron.setAttribute('class', 'claude-select-chevron');
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute('points', '6 9 12 15 18 9');
    chevron.appendChild(poly);

    const btn = el('button', {
      type: 'button',
      class: 'claude-custom-select-btn',
      'aria-haspopup': 'listbox',
      'aria-expanded': 'false',
      ...(extra && extra.id ? { id: extra.id } : {}),
    }, [labelSpan, chevron]);

    const menu = el('div', { class: 'claude-custom-select-menu', role: 'listbox' });

    function makeCheck() {
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('class', 'option-check');
      s.setAttribute('width', '14');
      s.setAttribute('height', '14');
      s.setAttribute('viewBox', '0 0 24 24');
      s.setAttribute('fill', 'none');
      s.setAttribute('stroke', 'currentColor');
      s.setAttribute('stroke-width', '2.5');
      s.setAttribute('stroke-linecap', 'round');
      s.setAttribute('stroke-linejoin', 'round');
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      p.setAttribute('points', '20 6 9 17 4 12');
      s.appendChild(p);
      return s;
    }

    const items = [];

    norm.forEach(([val, lbl]) => {
      const isSel = String(val) === String(current);
      const optBtn = el('button', {
        type: 'button',
        class: `claude-select-option${isSel ? ' active' : ''}`,
        'data-value': String(val),
        onclick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          setVal(val, true);
          closeMenu();
        },
      }, [
        el('span', { text: lbl != null ? String(lbl) : String(val) }),
        makeCheck(),
      ]);
      items.push(optBtn);
      menu.appendChild(optBtn);
    });

    function setVal(v, notify) {
      current = String(v);
      wrap.dataset.value = current;
      btn.dataset.value = current;
      btn.value = current;
      labelSpan.textContent = getLabel(current);
      items.forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-value') === current);
      });
      if (notify) {
        if (typeof onChange === 'function') onChange(current);
        wrap.dispatchEvent(new Event('change', { bubbles: true }));
        btn.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    setVal(current, false);

    function closeMenu() {
      menu.classList.remove('open');
      wrap.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      wrap.closest('.lore-form')?.classList.remove('has-open-select');
      wrap.closest('.lore-entry')?.classList.remove('has-open-select');
      wrap.closest('.preset-field')?.classList.remove('has-open-select');
    }

    function openMenu() {
      document.querySelectorAll('.claude-custom-select-menu.open').forEach((m) => {
        if (m !== menu) {
          m.classList.remove('open');
          m.closest('.claude-custom-select-wrap')?.classList.remove('open');
          m.closest('.lore-form')?.classList.remove('has-open-select');
          m.closest('.lore-entry')?.classList.remove('has-open-select');
          m.closest('.preset-field')?.classList.remove('has-open-select');
        }
      });
      menu.classList.add('open');
      wrap.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      wrap.closest('.lore-form')?.classList.add('has-open-select');
      wrap.closest('.lore-entry')?.classList.add('has-open-select');
      wrap.closest('.preset-field')?.classList.add('has-open-select');
    }

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (menu.classList.contains('open')) closeMenu();
      else openMenu();
    });

    const onDocClick = (e) => {
      if (!wrap.isConnected) {
        document.removeEventListener('click', onDocClick);
        return;
      }
      if (!wrap.contains(e.target)) closeMenu();
    };
    document.addEventListener('click', onDocClick);

    wrap.appendChild(btn);
    wrap.appendChild(menu);

    Object.defineProperty(wrap, 'value', {
      get() { return current; },
      set(v) { setVal(v, false); },
      configurable: true,
      enumerable: true,
    });

    Object.defineProperty(btn, 'value', {
      get() { return current; },
      set(v) { setVal(v, false); },
      configurable: true,
      enumerable: true,
    });

    return wrap;
  }

  function check(label, checked, onChange) {
    const box = el('input', { type: 'checkbox', checked: !!checked });
    box.addEventListener('change', () => onChange(box.checked));
    return el('label', { class: 'preset-check' }, [box, el('span', { text: label })]);
  }

  function root_() { return document.getElementById('pane-presets'); }
  function editorHost() { return root_().querySelector('#lorebooks-editor'); }

  // ---- list ----

  function renderList() {
    const list = root_().querySelector('#lorebooks-list');
    list.textContent = '';
    if (!state.books.length && !state.isNew) list.appendChild(el('p', { class: 'presets-empty', text: 'No lorebooks yet.' }));
    state.books.forEach((b) => {
      const active = !state.isNew && state.selected === b.name;
      list.appendChild(el('button', { type: 'button', class: `presets-list-item${active ? ' active' : ''}`, onclick: () => openBook(b.name) }, [
        el('span', { class: 'presets-list-name', text: b.name }),
        el('span', { class: 'presets-list-meta', text: `${b.entry_count} entr${b.entry_count === 1 ? 'y' : 'ies'}` }),
      ]));
    });
  }

  // ---- editor ----

  function renderEntry(entry) {
    const editing = state.editing === entry.id;
    const row = el('div', { class: `lore-entry${entry.disabled ? ' disabled' : ''}${editing ? ' editing' : ''}` });
    const on = el('input', { type: 'checkbox', checked: !entry.disabled, title: 'Use this entry' });
    on.addEventListener('change', async () => {
      try {
        const saved = await api(`/${encodeURIComponent(state.selected)}/entries/${encodeURIComponent(entry.id)}`, { method: 'PUT', body: JSON.stringify({ disabled: !on.checked }) });
        Object.assign(entry, saved);
        row.classList.toggle('disabled', entry.disabled);
        refreshCounts();
      } catch (e) {
        on.checked = !on.checked;
        toast(e.message, 'error');
      }
    });
    row.appendChild(el('div', { class: 'lore-entry-head' }, [
      on,
      el('div', { class: 'lore-entry-main' }, [
        el('div', { class: 'lore-entry-name', text: entryTitle(entry) }),
        el('div', { class: 'preset-script-meta', text: entrySummary(entry) }),
      ]),
      el('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: editing ? 'Close' : 'Edit', onclick: () => {
        state.editing = editing ? null : entry.id;
        state.editDraft = editing ? null : JSON.parse(JSON.stringify(entry));
        renderEditor();
      } }),
    ]));
    if (editing) row.appendChild(renderEntryForm(state.editDraft, false));
    return row;
  }

  function renderEntryForm(d, isNewEntry) {
    const redraw = () => renderEditor();
    const form = el('div', { class: 'lore-form' });
    form.appendChild(el('div', { class: 'preset-grid' }, [
      field('Name', textInput(d.name, (v) => { d.name = v; }, { maxLength: 200, placeholder: 'A note for yourself' })),
      field('Where it goes', select(POSITIONS, d.position, (v) => { d.position = v; redraw(); })),
      d.position === 'depth' ? field('Messages from the end', numberInput(d.depth, (v) => { d.depth = v; }, { min: 0, max: 1000 }), '0 is after the newest message.') : null,
      d.position === 'depth' ? field('Sent as', select(ROLES.map((r) => [r, r]), d.role, (v) => { d.role = v; })) : null,
      field('Order', numberInput(d.order, (v) => { d.order = v; }, { min: 0, max: 100000 }), 'Higher goes later, and is kept first when space is short.'),
      field('Chance %', numberInput(d.probability, (v) => { d.probability = v; }, { min: 0, max: 100 })),
    ]));
    const keys = el('textarea', { rows: 4, value: keysToText(d.keys), placeholder: 'One key per line. /pattern/flags is a regex key.' });
    keys.addEventListener('input', () => { d.keys = textToKeys(keys.value); });
    const secondary = el('textarea', { rows: 3, value: keysToText(d.secondary_keys), placeholder: 'Optional. One per line.' });
    secondary.addEventListener('input', () => { d.secondary_keys = textToKeys(secondary.value); });
    form.appendChild(el('div', { class: 'preset-grid' }, [
      field('Keys', keys, 'The entry is added when any of these appears in the recent chat.'),
      el('div', { class: 'lore-secondary' }, [
        field('Secondary keys', secondary),
        field('Then require', select(LOGICS, d.logic, (v) => { d.logic = v; }), 'How the secondary keys must agree.'),
      ]),
    ]));
    const content = el('textarea', { rows: 8, value: d.content || '', placeholder: 'The text that is added. {{char}} and {{user}} are replaced.' });
    content.addEventListener('input', () => { d.content = content.value; });
    form.appendChild(content);
    const tri = (label, key) => field(label, select([['', 'Lorebook default'], ['yes', 'Yes'], ['no', 'No']], valueToTri(d[key]), (v) => { d[key] = triToValue(v); }));
    form.appendChild(el('div', { class: 'preset-grid' }, [
      field('Search how many messages', numberInput(d.scan_depth, (v) => { d.scan_depth = numberOrNull(v); }, { min: 1, max: 50, placeholder: 'Lorebook default' }), 'Leave empty to use the lorebook setting.'),
      tri('Match case', 'case_sensitive'),
      tri('Whole words only', 'match_whole_words'),
    ]));
    form.appendChild(el('div', { class: 'lore-checks' }, [
      check('Always on (no keys needed)', d.constant, (v) => { d.constant = v; }),
      check('Switched off', d.disabled, (v) => { d.disabled = v; }),
      check('Do not search this entry\'s text for more entries', d.prevent_recursion, (v) => { d.prevent_recursion = v; }),
      check('Only found by other entries\' text', d.delay_until_recursion, (v) => { d.delay_until_recursion = v; }),
      check('Not found by other entries\' text', d.exclude_recursion, (v) => { d.exclude_recursion = v; }),
    ]));
    form.appendChild(el('div', { class: 'presets-actions' }, [
      isNewEntry ? null : el('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: 'Delete entry', onclick: () => deleteEntry(d) }),
      el('button', { type: 'button', class: 'btn btn-primary btn-sm', text: 'Save entry', onclick: () => saveEntry(d, isNewEntry) }),
    ]));
    return form;
  }

  function refreshCounts() {
    if (!state.book) return;
    const off = state.book.entries.filter((e) => e.disabled).length;
    state.book.entry_count = state.book.entries.length;
    state.book.enabled_count = state.book.entries.length - off;
    const meta = root_().querySelector('.lore-count');
    if (meta) meta.textContent = `${state.book.enabled_count} on, ${off} off`;
    const found = state.books.find((b) => b.name === state.selected);
    if (found) { found.entry_count = state.book.entry_count; found.enabled_count = state.book.enabled_count; renderList(); }
  }

  function renderEditor() {
    const host = editorHost();
    host.textContent = '';
    const d = state.draft;
    if (!d) {
      host.appendChild(el('div', { class: 'presets-placeholder' }, [
        el('h3', { text: 'Lorebooks' }),
        el('p', { text: 'A lorebook holds notes about your world: places, people, rules. When the recent chat mentions an entry’s keys, its text is added to the prompt.' }),
        el('p', { text: 'Import a SillyTavern World Info file, or make a lorebook by hand. Then tick it in a preset (the Presets side) to use it with model@preset.' }),
      ]));
      return;
    }
    host.appendChild(el('div', { class: 'presets-editor-head' }, [
      el('h3', { text: state.isNew ? 'New lorebook' : d.name }),
      el('div', { class: 'presets-actions' }, [
        state.isNew ? null : el('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: 'Delete', onclick: removeBook }),
        el('button', { type: 'button', class: 'btn btn-primary btn-sm', id: 'lorebooks-save', text: state.busy ? 'Saving…' : 'Save settings', disabled: state.busy, onclick: saveSettings }),
      ]),
    ]));
    if (state.report) {
      host.appendChild(el('div', { class: 'presets-report' }, [
        el('div', { class: 'presets-report-head' }, [
          el('strong', { text: 'Imported from SillyTavern' }),
          el('button', { type: 'button', class: 'preset-icon-btn', title: 'Dismiss', 'aria-label': 'Dismiss', text: '✕', onclick: () => { state.report = null; renderEditor(); } }),
        ]),
        el('ul', {}, reportLines(state.report).map((line) => el('li', { text: line }))),
      ]));
    }
    host.appendChild(el('div', { class: 'preset-grid' }, [
      field('Name', textInput(d.name, (v) => { d.name = v; }, { maxLength: 40, placeholder: 'my-world' }), 'Letters, numbers, - and _.'),
      field('Note', textInput(d.description, (v) => { d.description = v; }, { maxLength: 500 })),
      field('Search how many messages', numberInput(d.scan_depth, (v) => { d.scan_depth = v; }, { min: 1, max: 50 }), 'Entries look for their keys in this many of the newest messages.'),
      field('Size limit (tokens)', numberInput(d.token_budget, (v) => { d.token_budget = v; }, { min: 100, max: 20000 }), 'About 4 characters per token. When it is full the highest order wins.'),
    ]));
    host.appendChild(el('div', { class: 'lore-checks' }, [
      check('Search the text of added entries for more entries', d.recursive, (v) => { d.recursive = v; }),
    ]));
    if (state.isNew) {
      host.appendChild(el('p', { class: 'preset-field-hint', text: 'Save the settings first, then add entries.' }));
      return;
    }

    // try it
    const area = el('textarea', { rows: 2, value: state.testText, placeholder: 'Type a line of chat to see which entries it would add' });
    area.addEventListener('input', () => { state.testText = area.value; });
    const results = el('ul', { class: 'lore-test-results' }, (state.testResult ? testLines(state.testResult) : []).map((l) => el('li', { text: l })));
    host.appendChild(el('div', { class: 'lore-test' }, [
      el('h4', { class: 'preset-blocks-title', text: 'Try it' }),
      area,
      el('button', { type: 'button', class: 'btn btn-secondary btn-sm', id: 'lorebooks-test', text: 'Test', onclick: runTest }),
      results,
    ]));

    // entries
    const filtered = filterEntries(state.book.entries, state.query, state.showOff);
    const search = textInput(state.query, (v) => { state.query = v; }, { type: 'search', placeholder: 'Search entries by name, key or text' });
    search.addEventListener('change', () => { state.shown = PAGE; renderEditor(); });
    search.addEventListener('keydown', (e) => { if (e.key === 'Enter') { state.shown = PAGE; renderEditor(); } });
    const off = state.book.entries.filter((e) => e.disabled).length;
    host.appendChild(el('div', { class: 'preset-blocks-bar' }, [
      el('h4', { class: 'preset-blocks-title', text: 'Entries' }),
      el('span', { class: 'preset-field-hint lore-count', text: `${state.book.entries.length - off} on, ${off} off` }),
      search,
      off ? check('Show switched-off', state.showOff, (v) => { state.showOff = v; state.shown = PAGE; renderEditor(); }) : null,
      el('button', { type: 'button', class: 'btn btn-secondary btn-sm', id: 'lorebooks-add-entry', text: 'Add entry', onclick: startNewEntry }),
    ]));
    if (state.editing === '__new__') host.appendChild(el('div', { class: 'lore-entry editing' }, [renderEntryForm(state.editDraft, true)]));
    if (!filtered.length) host.appendChild(el('p', { class: 'presets-empty', text: state.book.entries.length ? 'No entry matches.' : 'No entries yet.' }));
    filtered.slice(0, state.shown).forEach((e) => host.appendChild(renderEntry(e)));
    if (filtered.length > state.shown) {
      host.appendChild(el('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: `Show ${Math.min(PAGE, filtered.length - state.shown)} more (${filtered.length - state.shown} left)`, onclick: () => { state.shown += PAGE; renderEditor(); } }));
    }
  }

  function renderAll() {
    renderList();
    renderEditor();
  }

  // ---- actions ----

  async function openBook(name) {
    try {
      const book = await api(`/${encodeURIComponent(name)}`);
      state.selected = name;
      state.isNew = false;
      state.book = book;
      state.draft = { name: book.name, description: book.description, scan_depth: book.scan_depth, token_budget: book.token_budget, recursive: book.recursive };
      state.editing = null; state.editDraft = null; state.query = ''; state.shown = PAGE; state.showOff = true;
      state.testResult = null; state.report = null;
      renderAll();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  function startNewBook() {
    state.selected = null; state.isNew = true; state.book = { entries: [] };
    state.draft = { name: '', description: '', scan_depth: 4, token_budget: 3000, recursive: false };
    state.report = null; state.editing = null;
    renderAll();
  }

  function settingsPayload() {
    const d = state.draft;
    return {
      name: String(d.name || '').trim().toLowerCase(), description: d.description || '',
      scan_depth: Number(d.scan_depth), token_budget: Number(d.token_budget), recursive: !!d.recursive,
    };
  }

  async function saveSettings() {
    if (state.busy || !state.draft) return;
    state.busy = true;
    renderEditor();
    try {
      const body = JSON.stringify(settingsPayload());
      const saved = state.isNew
        ? await api('', { method: 'POST', body })
        : await api(`/${encodeURIComponent(state.selected)}`, { method: 'PUT', body });
      state.busy = false;
      await refresh(saved.name);
      toast('Lorebook saved.', 'success', 2000);
    } catch (e) {
      state.busy = false;
      renderEditor();
      toast(e.message, 'error');
    }
  }

  async function removeBook() {
    if (!state.selected || state.isNew) return;
    if (!global.confirm(`Delete the lorebook “${state.selected}” and its ${state.book.entries.length} entries? Presets that link it will lose the link.`)) return;
    try {
      await api(`/${encodeURIComponent(state.selected)}`, { method: 'DELETE' });
      state.selected = null; state.book = null; state.draft = null;
      await refresh();
      toast('Lorebook deleted.', 'success', 2000);
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  function startNewEntry() {
    state.editing = '__new__';
    state.editDraft = newEntry();
    renderEditor();
  }

  async function saveEntry(d, isNewEntry) {
    try {
      const body = JSON.stringify(payloadEntry(d));
      if (isNewEntry) {
        const saved = await api(`/${encodeURIComponent(state.selected)}/entries`, { method: 'POST', body });
        state.book.entries.push(saved);
      } else {
        const saved = await api(`/${encodeURIComponent(state.selected)}/entries/${encodeURIComponent(d.id)}`, { method: 'PUT', body });
        const i = state.book.entries.findIndex((e) => e.id === d.id);
        if (i >= 0) state.book.entries[i] = saved;
      }
      state.editing = null; state.editDraft = null;
      refreshCounts();
      renderEditor();
      toast('Entry saved.', 'success', 1800);
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function deleteEntry(d) {
    if (!global.confirm(`Delete the entry “${entryTitle(d)}”?`)) return;
    try {
      await api(`/${encodeURIComponent(state.selected)}/entries/${encodeURIComponent(d.id)}`, { method: 'DELETE' });
      state.book.entries = state.book.entries.filter((e) => e.id !== d.id);
      state.editing = null; state.editDraft = null;
      refreshCounts();
      renderEditor();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function runTest() {
    if (!state.testText.trim()) { toast('Type a line of chat first.', 'error'); return; }
    try {
      state.testResult = await api(`/${encodeURIComponent(state.selected)}/test`, { method: 'POST', body: JSON.stringify({ text: state.testText }) });
      renderEditor();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  const MAX_IMPORT_BYTES = 8 * 1024 * 1024;

  async function importFile(file) {
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) { toast('That file is too big to be a lorebook (over 8 MB).', 'error'); return; }
    let st;
    try {
      st = JSON.parse(await file.text());
    } catch (_) {
      toast('That file is not valid JSON. Export the lorebook from SillyTavern as a .json file.', 'error');
      return;
    }
    try {
      const result = await api('/import', { method: 'POST', body: JSON.stringify({ st, name: nameFromFile(file.name) }) });
      await refresh(result.lorebook.name);
      state.report = result.report;
      renderEditor();
      toast(`Imported “${result.lorebook.name}”.`, 'success', 2500);
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function refresh(pick) {
    const data = await api('');
    state.books = data.lorebooks || [];
    if (pick) {
      state.isNew = false;
      await openBook(pick);
      return;
    }
    if (state.selected && !state.books.some((b) => b.name === state.selected)) { state.selected = null; state.book = null; if (!state.isNew) state.draft = null; }
    renderAll();
  }

  function show() {
    const root = root_();
    if (!root || !root.querySelector('#lorebooks-section')) return;
    if (!root.dataset.lorebooksReady) {
      root.dataset.lorebooksReady = '1';
      root.querySelector('#lorebooks-new').addEventListener('click', startNewBook);
      const fileInput = root.querySelector('#lorebooks-import-file');
      root.querySelector('#lorebooks-import').addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => { const f = fileInput.files && fileInput.files[0]; fileInput.value = ''; importFile(f); });
    }
    refresh().catch((e) => {
      const list = root.querySelector('#lorebooks-list');
      list.textContent = '';
      list.appendChild(el('p', { class: 'presets-empty', text: e.message }));
    });
  }

  global.SingularityLorebooks.show = show;
})(typeof window !== 'undefined' ? window : globalThis);
