#!/usr/bin/env python3
"""
SillyTavern chat-completion preset import
=========================================
`convert(data, name)` turns the JSON that SillyTavern exports for a chat-completion preset into a preset
(see schema.py) and a report of what could not come along. Pure: nothing is stored here.

How the file maps:
  prompt_order      one entry is used (character_id 100001, else the first). It sets the order and which
                    prompts are on.
  chatHistory       splits the order. Prompts after it become `after` blocks.
  charDescription   JanitorAI's character card. Prompts before it become `before` blocks, prompts between
                    it and chatHistory become `after_card` blocks.
  worldInfoBefore / worldInfoAfter  become lorebook slot blocks in the zone they sat in (see lorebook.py).
  other markers     (personality, scenario, persona, examples) have nothing to fill: dropped.
  prompts           kept in order, with their on/off switch, so the dashboard can turn modules on and off.
                    Prompts without text (the divider lines) are dropped.
  injection_position 1 means "inside the chat": `depth` with injection_depth and injection_order.
  squash_system_messages  on: system blocks are merged into the card with a line break; off: separate messages.

Regex scripts (`extensions.regex_scripts`) come along: the prompt ones run in the gateway, the display ones are
served to the userscript. Not applied: sampler settings (web engines cannot honour them), prefill and the other
SillyTavern-only fields. Behaviour is reimplemented from the file format; no
SillyTavern source is used.
"""

import re
from typing import Any, Dict, List, Tuple

try:
    from singularity.presets import jsre, macros, regex_scripts, schema
except ImportError:
    from presets import jsre, macros, regex_scripts, schema

PROMPT_ORDER_DEFAULT_CHARACTER = 100001
SAMPLER_FIELDS = ("temperature", "top_p", "top_k", "top_a", "min_p", "repetition_penalty",
                  "frequency_penalty", "presence_penalty", "seed", "n")
NOT_APPLIED_FIELDS = ("assistant_prefill", "continue_prefill", "impersonation_prompt", "continue_nudge_prompt")


def preset_name_from(text: str) -> str:
    """A usable preset name from a file name: `Izumi 0707 (English).json` -> `izumi-0707-english`."""
    base = re.sub(r"\.json$", "", str(text or "").strip(), flags=re.IGNORECASE).lower()
    base = re.sub(r"[^a-z0-9_]+", "-", base).strip("-_")
    return base[:40].strip("-_") or "imported"


def _pick_order(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    orders = [o for o in data.get("prompt_order") or [] if isinstance(o, dict) and isinstance(o.get("order"), list)]
    if not orders:
        raise schema.PresetError("This file has no prompt_order, so there is nothing to import")
    for entry in orders:
        if entry.get("character_id") == PROMPT_ORDER_DEFAULT_CHARACTER:
            return entry["order"]
    return orders[0]["order"]


def _int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def convert(data: Any, name: str = "") -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Returns (preset body, report). Raises PresetError when the file is not a usable preset."""
    if not isinstance(data, dict) or not isinstance(data.get("prompts"), list):
        raise schema.PresetError("This does not look like a SillyTavern chat-completion preset (no prompts list)")
    prompts = {p["identifier"]: p for p in data["prompts"] if isinstance(p, dict) and isinstance(p.get("identifier"), str)}
    order = _pick_order(data)

    zone = "before"
    seen_card = seen_history = False
    blocks: List[Dict[str, Any]] = []
    report: Dict[str, Any] = {
        "prompts_in_file": len(prompts), "blocks": 0, "enabled": 0, "disabled": 0, "empty_dropped": 0,
        "missing_dropped": 0, "lorebook_slots": 0, "markers_dropped": [], "unsupported_macros": [], "sampler_fields_dropped": [],
        "not_applied_fields": [], "regex_scripts": 0, "regex_scripts_enabled": 0,
    }
    unsupported: set = set()
    for entry in order:
        if not isinstance(entry, dict):
            continue
        identifier = entry.get("identifier")
        prompt = prompts.get(identifier)
        if prompt is None:
            report["missing_dropped"] += 1
            continue
        if prompt.get("marker"):
            if identifier == "chatHistory":
                zone, seen_history = "after", True
            elif identifier == "charDescription":
                if not seen_history:
                    zone, seen_card = "after_card", True
            elif identifier in ("worldInfoBefore", "worldInfoAfter"):
                # Where the preset puts the lorebook text. It stays empty until a lorebook is linked.
                slot = "lore_before" if identifier == "worldInfoBefore" else "lore_after"
                blocks.append({
                    "id": f"b{len(blocks) + 1}", "name": "World info (before)" if slot == "lore_before" else "World info (after)",
                    "enabled": bool(entry.get("enabled")), "role": "system", "content": "", "slot": slot,
                    "position": zone, "depth": 4, "order": schema.DEFAULT_ORDER,
                })
                report["lorebook_slots"] += 1
            else:
                report["markers_dropped"].append(identifier)
            continue
        content = prompt.get("content")
        if not isinstance(content, str) or not content.strip():
            report["empty_dropped"] += 1
            continue
        role = prompt.get("role") if prompt.get("role") in schema.ROLES else "system"
        inside_chat = _int(prompt.get("injection_position"), 0) == 1
        enabled = bool(entry.get("enabled"))
        blocks.append({
            "id": f"b{len(blocks) + 1}",
            "name": str(prompt.get("name") or "")[:80],
            "enabled": enabled,
            "role": role,
            "content": content,
            "position": "depth" if inside_chat else zone,
            "depth": max(0, min(_int(prompt.get("injection_depth"), 4), 1000)),
            "order": max(0, min(_int(prompt.get("injection_order"), schema.DEFAULT_ORDER), 10_000)),
        })
        report["enabled" if enabled else "disabled"] += 1
        unsupported |= macros.unsupported(content)
    if not blocks:
        raise schema.PresetError("This preset has no prompts with text in its prompt order")

    report["blocks"] = len(blocks)
    report["unsupported_macros"] = sorted(unsupported)
    report["sampler_fields_dropped"] = [k for k in SAMPLER_FIELDS if data.get(k) not in (None, "")]
    report["not_applied_fields"] = [k for k in NOT_APPLIED_FIELDS if data.get(k)]
    regex = (data.get("extensions") or {}).get("regex_scripts") if isinstance(data.get("extensions"), dict) else None
    scripts = [regex_scripts.from_st(r, i) for i, r in enumerate(regex)] if isinstance(regex, list) else []
    report["regex_scripts"] = len(scripts)
    report["regex_scripts_enabled"] = sum(1 for r in scripts if not r["disabled"])
    report["regex_prompt"] = sum(1 for r in scripts if not r["disabled"] and regex_scripts.runs_on_prompt(r))
    report["regex_display"] = sum(1 for r in scripts if not r["disabled"] and regex_scripts.runs_on_display(r))
    report["regex_prompt_skipped"] = [
        f"{r['name'] or r['id']}: {info['note']}" for r in scripts
        if not r["disabled"] and (info := regex_scripts.prompt_status(r))["status"] == "skipped"
    ]
    report["names_needed"] = any("{{char}}" in b["content"].lower() or "{{user}}" in b["content"].lower() for b in blocks)

    squash = data.get("squash_system_messages", True) is not False
    preset = {
        "name": name or "imported",
        "description": f"Imported from SillyTavern: {report['enabled']} blocks on, {report['disabled']} off.",
        "blocks": blocks,
        "placement": "merge" if squash else "separate",
        "separator": "\n",
        "char_name": "",
        "user_name": "",
        "regex_scripts": scripts,
    }
    return preset, report
