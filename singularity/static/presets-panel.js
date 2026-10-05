// ===================================================================
// Presets tab: list, edit and delete the presets the gateway applies to `model@name`
// ===================================================================
// The pure helpers (blank preset, block moves, separator text, the model string) are tested in
// tests/ui/presets-panel.test.js. Everything a user typed reaches the page through textContent or
// element properties, never innerHTML.
(function (global) {
  'use strict';

  const POSITIONS = [['before', 'Above the card'], ['after_card', 'Right after the card'], ['depth', 'Inside the chat'], ['after', 'After the chat']];
  const ROLES = ['system', 'user', 'assistant'];

  const TOOL_LABELS = { web_search: 'Web search', fetch_url: 'Read a web page' };

  function newBlock(n) {
    return { id: `b${Date.now().toString(36)}${n}`, name: '', enabled: true, role: 'system', content: '', position: 'before', depth: 2, order: 100 };
  }

  function newPreset() {
    return { name: '', description: '', blocks: [newBlock(1)], placement: 'merge', separator: '\n\n', char_name: '', user_name: '', regex_scripts: [], lorebooks: [], tools: [], tool_max_steps: 3, tool_guidance: '', tool_guidance_on: true };
  }

  // The separator is shown with \n for a line break, since a one-line field cannot hold one.
  function separatorToText(sep) {
    return String(sep == null ? '' : sep).replace(/\n/g, '\\n');
  }
  function textToSeparator(text) {
    return String(text == null ? '' : text).replace(/\\n/g, '\n');
  }

  // A new array with the block at `index` moved by `delta` places (the list is returned unchanged at the ends).
  function moveBlock(blocks, index, delta) {
    const to = index + delta;
    if (index < 0 || index >= blocks.length || to < 0 || to >= blocks.length) return blocks.slice();
    const next = blocks.slice();
    const [item] = next.splice(index, 1);
    next.splice(to, 0, item);
    return next;
  }

  function modelString(name) {
    return `${'your-model'}@${String(name || '').trim().toLowerCase() || 'name'}`;
  }

  // What the editor sends: the editable fields only.
  function payload(draft) {
    return {
      name: String(draft.name || '').trim().toLowerCase(),
      description: draft.description || '',
      blocks: (draft.blocks || []).map((b) => ({
        id: b.id, name: b.name || '', enabled: b.enabled !== false, role: b.role || 'system', slot: b.slot || '',
        content: b.slot ? '' : b.content || '', position: b.position || 'before',
        depth: Number.isFinite(Number(b.depth)) ? Number(b.depth) : 0,
        order: Number.isFinite(Number(b.order)) ? Number(b.order) : 100,
      })),
      placement: draft.placement || 'merge',
      separator: draft.separator == null ? '\n\n' : draft.separator,
      char_name: draft.char_name || '',
      user_name: draft.user_name || '',
      lorebooks: Array.isArray(draft.lorebooks) ? draft.lorebooks : [],
      tools: Array.isArray(draft.tools) ? draft.tools : [],
      tool_max_steps: Number.isFinite(Number(draft.tool_max_steps)) ? Number(draft.tool_max_steps) : 3,
      tool_guidance: draft.tool_guidance || '',
      tool_guidance_on: draft.tool_guidance_on !== false,
      regex_scripts: (draft.regex_scripts || []).map((r) => ({
        id: r.id, name: r.name || '', find: r.find || '', replace: r.replace || '', trim_strings: r.trim_strings || [],
        placement: r.placement || [2], disabled: !!r.disabled, markdown_only: !!r.markdown_only, prompt_only: !!r.prompt_only,
        run_on_edit: !!r.run_on_edit, substitute: r.substitute || 0,
        min_depth: r.min_depth == null ? null : Number(r.min_depth), max_depth: r.max_depth == null ? null : Number(r.max_depth),
      })),
    };
  }

  // Where a regex script runs: the two flags decide, as in SillyTavern.
  function scriptContext(r) {
    if (r.prompt_only && r.markdown_only) return 'Prompt + display';
    if (r.prompt_only) return 'Prompt';
    if (r.markdown_only) return 'Display';
    return 'Prompt + display';
  }

  function scriptWho(r) {
    const p = r.placement || [];
    const who = [p.includes(1) ? 'your messages' : null, p.includes(2) ? 'replies' : null].filter(Boolean);
    return who.length ? who.join(' and ') : 'other text';
  }

  function scriptDepth(r) {
    const lo = r.min_depth, hi = r.max_depth;
    if ((lo == null || lo < 0) && (hi == null || hi < 0)) return 'any depth';
    if (hi == null || hi < 0) return `depth ${lo}+`;
    if (lo == null || lo < 0) return `depth 0-${hi}`;
    return `depth ${lo}-${hi}`;
  }

  // `Izumi 0707 (English).json` -> `izumi-0707-english`; the same rule the server applies.
  function nameFromFile(filename) {
    const base = String(filename || '').trim().replace(/\.json$/i, '').toLowerCase().replace(/[^a-z0-9_]+/g, '-').replace(/^[-_]+|[-_]+$/g, '');
    return base.slice(0, 40).replace(/^[-_]+|[-_]+$/g, '') || 'imported';
  }

  // The import report as short lines for the page.
  function reportLines(report) {
    const r = report || {};
    const lines = [`${r.enabled || 0} blocks are on and ${r.disabled || 0} are switched off (kept so you can turn them on).`];
    if (r.empty_dropped) lines.push(`${r.empty_dropped} empty divider prompt${r.empty_dropped === 1 ? ' was' : 's were'} left out.`);
    if (r.names_needed) lines.push('Set “Character name” and “Your name” below: until then {{char}} and {{user}} stay as written.');
    if (r.regex_scripts) {
      lines.push(`${r.regex_scripts} regex script${r.regex_scripts === 1 ? '' : 's'} imported (${r.regex_scripts_enabled || 0} on): ${r.regex_prompt || 0} change what the model sees, ${r.regex_display || 0} restyle replies and need the JanitorAI userscript.`);
    }
    (r.regex_prompt_skipped || []).slice(0, 3).forEach((note) => lines.push(`Skipped on the prompt (cannot run safely here): ${note}`));
    if ((r.sampler_fields_dropped || []).length) lines.push(`Sampler settings are ignored (${r.sampler_fields_dropped.join(', ')}): the web chats behind Singularity cannot take them.`);
    if ((r.unsupported_macros || []).length) lines.push(`Macros left as written: ${r.unsupported_macros.join(' ')}`);
    if ((r.markers_dropped || []).length) lines.push(`Nothing to fill for: ${r.markers_dropped.join(', ')}.`);
    return lines;
  }

  // The blocks to show, as [index, block] so edits keep pointing at the real list.
  function visibleBlocks(blocks, filter, showDisabled) {
    const needle = String(filter || '').trim().toLowerCase();
    return (blocks || []).map((b, i) => [i, b]).filter(([, b]) => {
      if (!needle && !showDisabled && b.enabled === false) return false;
      if (!needle) return true;
      return `${b.name || ''}\n${b.content || ''}`.toLowerCase().includes(needle);
    });
  }

  const helpers = { newBlock, newPreset, separatorToText, textToSeparator, moveBlock, modelString, payload, nameFromFile, reportLines, visibleBlocks, scriptContext, scriptWho, scriptDepth };
  global.SingularityPresets = Object.assign(global.SingularityPresets || {}, helpers);

  // ---- The tab (needs a page) ----
  if (typeof document === 'undefined' || !document.getElementById) return;

  const state = { presets: [], selected: null, draft: null, isNew: false, loaded: false, busy: false, report: null, filter: '', showDisabled: true, lorebookList: [], toolList: [], defaultGuidance: '' };

  async function api(path, options) {
    const res = await fetch(`/api/presets${path}`, {
      ...(options || {}),
      headers: { 'Content-Type': 'application/json', ...((options && options.headers) || {}) },
    });
    let data = null;
    try { data = await res.json(); } catch (_) { /* no body */ }
    if (!res.ok) {
      const detail = data && (data.detail || data.error);
      throw new Error(typeof detail === 'string' && detail !== 'Not Found' ? detail
        : res.status === 404 && detail === 'Not Found' ? 'The Singularity server is older than this page. Restart it to use presets.' : `HTTP ${res.status}`);
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
    const input = el('input', { type: 'text', value: value || '', ...(extra || {}) });
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
      wrap.closest('.preset-block')?.classList.remove('has-open-select');
      wrap.closest('.preset-field')?.classList.remove('has-open-select');
    }

    function openMenu() {
      document.querySelectorAll('.claude-custom-select-menu.open').forEach((m) => {
        if (m !== menu) {
          m.classList.remove('open');
          m.closest('.claude-custom-select-wrap')?.classList.remove('open');
          m.closest('.preset-block')?.classList.remove('has-open-select');
          m.closest('.preset-field')?.classList.remove('has-open-select');
        }
      });
      menu.classList.add('open');
      wrap.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      wrap.closest('.preset-block')?.classList.add('has-open-select');
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

  function renderList(root) {
    const list = root.querySelector('#presets-list');
    list.textContent = '';
    if (!state.presets.length && !state.isNew) {
      list.appendChild(el('p', { class: 'presets-empty', text: 'No presets yet.' }));
    }
    state.presets.forEach((p) => {
      const active = !state.isNew && state.selected === p.name;
      list.appendChild(el('button', { type: 'button', class: `presets-list-item${active ? ' active' : ''}`, onclick: () => select_(p.name) }, [
        el('span', { class: 'presets-list-name', text: p.name }),
        el('span', { class: 'presets-list-meta', text: `${p.blocks.length} block${p.blocks.length === 1 ? '' : 's'}` }),
      ]));
    });
  }

  function renderBlock(draft, index, redraw, canMove) {
    const block = draft.blocks[index];
    const card = el('div', { class: `preset-block${block.enabled ? '' : ' disabled'}` });
    const enabled = el('input', { type: 'checkbox', checked: block.enabled, title: 'Use this block' });
    enabled.addEventListener('change', () => { block.enabled = enabled.checked; redraw(); });
    const depthBits = block.position === 'depth' ? [
      field('From the end', el('input', { type: 'number', min: 0, max: 1000, value: String(block.depth), oninput: (e) => { block.depth = Number(e.target.value); } }), 'Messages counted back from the last one.'),
      field('Order', el('input', { type: 'number', min: 0, max: 10000, value: String(block.order), oninput: (e) => { block.order = Number(e.target.value); } }), 'Higher goes first at the same spot.'),
    ] : [];
    const move = (delta) => () => { draft.blocks = moveBlock(draft.blocks, index, delta); redraw(); };
    card.appendChild(el('div', { class: 'preset-block-head' }, [
      enabled,
      textInput(block.name, (v) => { block.name = v; }, { placeholder: `Block ${index + 1}` }),
      el('button', { type: 'button', class: 'preset-icon-btn', title: 'Move up', 'aria-label': 'Move up', text: '↑', disabled: !canMove || index === 0, onclick: move(-1) }),
      el('button', { type: 'button', class: 'preset-icon-btn', title: 'Move down', 'aria-label': 'Move down', text: '↓', disabled: !canMove || index === draft.blocks.length - 1, onclick: move(1) }),
      el('button', { type: 'button', class: 'preset-icon-btn danger', title: 'Remove block', 'aria-label': 'Remove block', text: '✕', onclick: () => { draft.blocks.splice(index, 1); redraw(); } }),
    ]));
    card.appendChild(el('div', { class: 'preset-block-row' }, [
      field('Sent as', select(ROLES.map((r) => [r, r]), block.role, (v) => { block.role = v; })),
      field('Goes', select(POSITIONS, block.position, (v) => { block.position = v; redraw(); })),
      ...depthBits,
    ]));
    if (block.slot) {
      card.appendChild(el('p', { class: 'preset-field-hint', text: block.slot === 'lore_before'
        ? 'Lorebook text for “before the character” goes here when an entry fires. Nothing is added when none does.'
        : 'Lorebook text for “after the character” goes here when an entry fires. Nothing is added when none does.' }));
      return card;
    }
    const area = el('textarea', { rows: 5, value: block.content, placeholder: 'Text to add. {{char}}, {{user}} and {{newline}} are replaced.' });
    area.addEventListener('input', () => { block.content = area.value; });
    card.appendChild(area);
    return card;
  }

  function renderEditor(root) {
    const host = root.querySelector('#presets-editor');
    host.textContent = '';
    const draft = state.draft;
    if (!draft) {
      host.appendChild(el('div', { class: 'presets-placeholder' }, [
        el('h3', { text: 'Presets' }),
        el('p', { text: 'A preset adds your own text around what JanitorAI sends: a jailbreak, a style guide, a reminder near the end of the chat. Pick one on the left, or make a new one.' }),
        el('p', { text: 'To use it, add @name to the model in JanitorAI, for example kimi-k3@noir.' }),
      ]));
      return;
    }
    const redraw = () => renderEditor(root);
    const head = el('div', { class: 'presets-editor-head' }, [
      el('h3', { text: state.isNew ? 'New preset' : draft.name }),
      el('div', { class: 'presets-actions' }, [
        state.isNew ? null : el('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: 'Delete', onclick: remove }),
        el('button', { type: 'button', class: 'btn btn-primary btn-sm', id: 'presets-save', text: state.busy ? 'Saving…' : 'Save', disabled: state.busy, onclick: save }),
      ]),
    ]);
    host.appendChild(head);

    const use = el('div', { class: 'presets-use' });
    const useCode = el('code', { text: modelString(draft.name) });
    use.appendChild(el('span', { text: 'Model name for JanitorAI: ' }));
    use.appendChild(useCode);
    use.appendChild(el('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: 'Copy', onclick: () => {
      if (!draft.name.trim()) { toast('Give the preset a name first.', 'error'); return; }
      const text = modelString(draft.name).replace('your-model', '<model>');
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(
        () => toast(`Copied ${text}`, 'success', 2000), () => toast('Could not copy.', 'error'));
    } }));
    host.appendChild(use);

    const nameInput = textInput(draft.name, (v) => { draft.name = v; useCode.textContent = modelString(v); }, { placeholder: 'noir', maxLength: 40 });
    host.appendChild(el('div', { class: 'preset-grid' }, [
      field('Name', nameInput, 'Letters, numbers, - and _. This is what goes after @.'),
      field('Note', textInput(draft.description, (v) => { draft.description = v; }, { placeholder: 'What this preset is for', maxLength: 500 })),
      field('Character name', textInput(draft.char_name, (v) => { draft.char_name = v; }, { placeholder: 'Replaces {{char}}', maxLength: 80 })),
      field('Your name', textInput(draft.user_name, (v) => { draft.user_name = v; }, { placeholder: 'Replaces {{user}}', maxLength: 80 })),
      field('Placement', select([['merge', 'Merge into the character card'], ['separate', 'Separate messages']], draft.placement, (v) => { draft.placement = v; }),
        'Merge joins the “before” blocks into JanitorAI’s system message.'),
      field('Joiner', textInput(separatorToText(draft.separator), (v) => { draft.separator = textToSeparator(v); }, { maxLength: 80 }), 'Between merged blocks. \\n is a line break.'),
    ]));

    if (state.report) {
      host.insertBefore(el('div', { class: 'presets-report' }, [
        el('div', { class: 'presets-report-head' }, [
          el('strong', { text: 'Imported from SillyTavern' }),
          el('button', { type: 'button', class: 'preset-icon-btn', title: 'Dismiss', 'aria-label': 'Dismiss', text: '✕', onclick: () => { state.report = null; redraw(); } }),
        ]),
        el('ul', {}, reportLines(state.report).map((line) => el('li', { text: line }))),
      ]), head.nextSibling);
    }

    const linked = Array.isArray(draft.lorebooks) ? draft.lorebooks : (draft.lorebooks = []);
    const linkBox = el('div', { class: 'preset-links' });
    if (state.lorebookList.length) {
      state.lorebookList.forEach((b) => {
        const box = el('input', { type: 'checkbox', checked: linked.includes(b.name) });
        box.addEventListener('change', () => {
          const i = linked.indexOf(b.name);
          if (box.checked && i < 0) linked.push(b.name);
          if (!box.checked && i >= 0) linked.splice(i, 1);
        });
        linkBox.appendChild(el('label', { class: 'preset-check' }, [box, el('span', { text: `${b.name} (${b.entry_count})` })]));
      });
    } else {
      linkBox.appendChild(el('span', { class: 'preset-field-hint', text: 'No lorebooks yet. Make or import one in the Lorebooks mode, then tick it here.' }));
    }
    host.appendChild(el('div', { class: 'preset-field' }, [
      el('span', { class: 'preset-field-label', text: 'Lorebooks' }),
      linkBox,
      el('span', { class: 'preset-field-hint', text: 'Ticked lorebooks add entries to the prompt when the recent chat mentions them. Where they go is set by the “World info” blocks below; without those, above the card and just below it.' }),
    ]));

    const picked = Array.isArray(draft.tools) ? draft.tools : (draft.tools = []);
    const toolBox = el('div', { class: 'preset-links' });
    if (state.toolList.length) {
      state.toolList.forEach((t) => {
        const box = el('input', { type: 'checkbox', checked: picked.includes(t.name) });
        box.addEventListener('change', () => {
          const i = picked.indexOf(t.name);
          if (box.checked && i < 0) picked.push(t.name);
          if (!box.checked && i >= 0) picked.splice(i, 1);
        });
        toolBox.appendChild(el('label', { class: 'preset-check', title: t.description || '' }, [box, el('span', { text: TOOL_LABELS[t.name] || t.name })]));
      });
    } else {
      toolBox.appendChild(el('span', { class: 'preset-field-hint', text: 'The tool list could not be loaded.' }));
    }
    const stepsBox = select([1, 2, 3, 4, 5, 6].map((n) => [String(n), `${n} ${n === 1 ? 'lookup' : 'lookups'} per reply at most`]), String(draft.tool_max_steps || 3), (v) => { draft.tool_max_steps = Number(v); });
    host.appendChild(el('div', { class: 'preset-field' }, [
      el('span', { class: 'preset-field-label', text: 'Tools' }),
      toolBox,
      el('span', { class: 'preset-field-hint', text: 'Ticked tools let the model look things up before it answers, even from JanitorAI. The search runs on this gateway and the chat never shows it. The model is told to use them sparingly, to stay in character and to leave out source markers. A reply that needs a lookup arrives a few seconds later.' }),
      stepsBox,
    ]));

    // The search focus: the built-in text shows until it is edited; an empty stored text means "use the built-in one".
    const focusOn = el('input', { type: 'checkbox', checked: draft.tool_guidance_on !== false });
    const focusText = el('textarea', { class: 'preset-focus-text', rows: '7', spellcheck: 'false' });
    focusText.value = draft.tool_guidance || state.defaultGuidance;
    focusText.disabled = draft.tool_guidance_on === false;
    focusText.addEventListener('input', () => { draft.tool_guidance = focusText.value.trim() === state.defaultGuidance.trim() ? '' : focusText.value; });
    focusOn.addEventListener('change', () => { draft.tool_guidance_on = focusOn.checked; focusText.disabled = !focusOn.checked; });
    const focusReset = el('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: 'Use the built-in text' });
    focusReset.addEventListener('click', () => { draft.tool_guidance = ''; focusText.value = state.defaultGuidance; });
    host.appendChild(el('div', { class: 'preset-field preset-focus' }, [
      el('label', { class: 'preset-check' }, [focusOn, el('span', { text: 'Only search for certain subjects' })]),
      focusText,
      el('span', { class: 'preset-field-hint', text: 'Sent to the model with the tools. The built-in text limits searches to pop culture, songs and historical accuracy; change it to anything you like. Untick to let the model search whenever it judges a fact needs checking.' }),
      focusReset,
    ]));

    const off = draft.blocks.filter((b) => b.enabled === false).length;
    const shown = visibleBlocks(draft.blocks, state.filter, state.showDisabled);
    const showAll = !state.filter.trim() && (state.showDisabled || off === 0);
    const filterBox = textInput(state.filter, (v) => { state.filter = v; }, { type: 'search', placeholder: 'Find a block by name or text' });
    filterBox.addEventListener('change', redraw);
    filterBox.addEventListener('keydown', (e) => { if (e.key === 'Enter') redraw(); });
    const toggle = el('input', { type: 'checkbox', checked: state.showDisabled });
    toggle.addEventListener('change', () => { state.showDisabled = toggle.checked; redraw(); });
    host.appendChild(el('div', { class: 'preset-blocks-bar' }, [
      el('h4', { class: 'preset-blocks-title', text: `Blocks (${draft.blocks.length - off} on, ${off} off)` }),
      filterBox,
      off ? el('label', { class: 'preset-check' }, [toggle, el('span', { text: 'Show switched-off blocks' })]) : null,
    ]));
    if (!showAll) host.appendChild(el('p', { class: 'preset-field-hint', text: `Showing ${shown.length} of ${draft.blocks.length}. Moving blocks is off while the list is filtered.` }));
    shown.forEach(([i]) => host.appendChild(renderBlock(draft, i, redraw, showAll)));
    host.appendChild(el('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: 'Add a block', onclick: () => {
      draft.blocks.push(newBlock(draft.blocks.length + 1));
      redraw();
    } }));

    const scripts = draft.regex_scripts || [];
    if (scripts.length) {
      const onCount = scripts.filter((r) => !r.disabled).length;
      host.appendChild(el('h4', { class: 'preset-blocks-title', text: `Regex scripts (${onCount} on, ${scripts.length - onCount} off)` }));
      host.appendChild(el('p', { class: 'preset-field-hint', text: 'Prompt scripts clean the chat history before the model sees it. Display scripts restyle a reply on JanitorAI through the userscript. Turn them on or off here.' }));
      const list = el('div', { class: 'preset-scripts' });
      scripts.forEach((r) => {
        const on = el('input', { type: 'checkbox', checked: !r.disabled, title: 'Use this script' });
        on.addEventListener('change', () => { r.disabled = !on.checked; row.classList.toggle('disabled', r.disabled); });
        const skipped = r.prompt_status === 'skipped';
        const row = el('div', { class: `preset-script${r.disabled ? ' disabled' : ''}` }, [
          on,
          el('div', { class: 'preset-script-main' }, [
            el('div', { class: 'preset-script-name', text: r.name || r.id }),
            el('div', { class: 'preset-script-meta', text: `${scriptContext(r)} · ${scriptWho(r)} · ${scriptDepth(r)}` }),
            el('code', { class: 'preset-script-find', text: (r.find || '').length > 140 ? `${r.find.slice(0, 140)}…` : r.find || '' }),
            skipped ? el('div', { class: 'preset-script-warn', text: `Skipped on the prompt: ${r.prompt_note}` }) : null,
          ]),
        ]);
        list.appendChild(row);
      });
      host.appendChild(list);
    }
  }

  function renderAll(root) {
    renderList(root);
    renderEditor(root);
  }

  function root_() { return document.getElementById('pane-presets'); }

  function select_(name) {
    const found = state.presets.find((p) => p.name === name);
    if (!found) return;
    state.selected = name;
    state.isNew = false;
    state.draft = JSON.parse(JSON.stringify(found));
    state.filter = '';
    state.showDisabled = state.draft.blocks.length <= 40;
    state.report = null;
    renderAll(root_());
  }

  function startNew() {
    state.selected = null;
    state.isNew = true;
    state.draft = newPreset();
    state.filter = '';
    state.showDisabled = true;
    state.report = null;
    renderAll(root_());
  }

  async function save() {
    if (state.busy || !state.draft) return;
    state.busy = true;
    renderEditor(root_());
    try {
      const body = JSON.stringify(payload(state.draft));
      const saved = state.isNew
        ? await api('', { method: 'POST', body })
        : await api(`/${encodeURIComponent(state.selected)}`, { method: 'PUT', body });
      state.busy = false;
      await refresh(saved.name);
      toast('Preset saved.', 'success', 2000);
    } catch (e) {
      state.busy = false;
      renderEditor(root_());
      toast(e.message, 'error');
    }
  }

  const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

  async function importFile(file) {
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) { toast('That file is too big to be a preset (over 5 MB).', 'error'); return; }
    let st;
    try {
      st = JSON.parse(await file.text());
    } catch (_) {
      toast('That file is not valid JSON. Export the preset from SillyTavern as a .json file.', 'error');
      return;
    }
    try {
      const result = await api('/import', { method: 'POST', body: JSON.stringify({ st, name: nameFromFile(file.name) }) });
      await refresh(result.preset.name);
      state.report = result.report;
      state.filter = '';
      state.showDisabled = state.draft.blocks.length <= 40;
      renderEditor(root_());
      toast(`Imported “${result.preset.name}”.`, 'success', 2500);
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function remove() {
    if (!state.draft || state.isNew) return;
    if (!global.confirm(`Delete the preset “${state.draft.name}”? Requests that use it will fail until you make it again.`)) return;
    try {
      await api(`/${encodeURIComponent(state.selected)}`, { method: 'DELETE' });
      state.selected = null;
      state.draft = null;
      await refresh();
      toast('Preset deleted.', 'success', 2000);
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function refresh(pick) {
    const data = await api('');
    state.presets = data.presets || [];
    state.loaded = true;
    if (pick) {
      state.isNew = false;
      const found = state.presets.find((p) => p.name === pick);
      state.selected = found ? found.name : null;
      state.draft = found ? JSON.parse(JSON.stringify(found)) : null;
    } else if (state.selected && !state.presets.some((p) => p.name === state.selected)) {
      state.selected = null;
      if (!state.isNew) state.draft = null;
    }
    renderAll(root_());
  }

  function setMode(mode) {
    const root = root_();
    const panes = {
      presets: ['#presets-section', '#presets-editor'],
      lorebooks: ['#lorebooks-section', '#lorebooks-editor'],
      logs: ['#log-section', '#log-editor'],
      bench: ['#bench-section', '#bench-editor'],
    };
    Object.entries(panes).forEach(([name, sels]) => sels.forEach((sel) => {
      const node = root.querySelector(sel);
      if (node) node.hidden = name !== mode;
    }));
    root.querySelectorAll('.presets-mode').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
    if (mode === 'lorebooks') {
      if (global.SingularityLorebooks && global.SingularityLorebooks.show) global.SingularityLorebooks.show();
    } else if (mode === 'logs') {
      if (global.SingularityRequestLog && global.SingularityRequestLog.show) global.SingularityRequestLog.show();
    } else if (mode === 'bench') {
      if (global.SingularityBench && global.SingularityBench.show) global.SingularityBench.show();
    } else {
      loadLorebookNames().then(() => { if (state.draft) renderEditor(root); });
    }
  }

  async function loadToolNames() {
    try {
      const data = await api2('/api/tools');
      state.toolList = Array.isArray(data.tools) ? data.tools : [];
      state.defaultGuidance = typeof data.default_guidance === 'string' ? data.default_guidance : '';
    } catch (_) {
      state.toolList = [];
      state.defaultGuidance = '';
    }
  }

  async function loadLorebookNames() {
    try {
      const data = await api2('/api/lorebooks');
      state.lorebookList = data.lorebooks || [];
    } catch (_) {
      state.lorebookList = [];
    }
  }

  async function api2(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function show() {
    const root = root_();
    if (!root) return;
    loadLorebookNames();
    loadToolNames().then(() => { if (state.draft) renderEditor(root); });
    if (!root.dataset.ready) {
      root.dataset.ready = '1';
      root.querySelectorAll('.presets-mode').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
      root.querySelector('#presets-new').addEventListener('click', startNew);
      const fileInput = root.querySelector('#presets-import-file');
      root.querySelector('#presets-import').addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => { const f = fileInput.files && fileInput.files[0]; fileInput.value = ''; importFile(f); });
    }
    refresh().catch((e) => {
      state.loaded = false;
      root.querySelector('#presets-list').textContent = '';
      root.querySelector('#presets-list').appendChild(el('p', { class: 'presets-empty', text: e.message }));
    });
  }

  global.SingularityPresets.show = show;
  global.SingularityPresets.setMode = setMode;
})(typeof window !== 'undefined' ? window : globalThis);
