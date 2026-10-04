#!/usr/bin/env python3
"""What a preset is, and the checks every preset passes before it is stored."""

import re
from typing import Any, Dict, Optional, Tuple

try:
    from singularity.presets import regex_scripts
    from singularity import tools as chat_tools
    from singularity.tools import protocol
except ImportError:
    from presets import regex_scripts
    import tools as chat_tools
    from tools import protocol

NAME_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,39}$")

MAX_BLOCKS = 400
MAX_BLOCK_CHARS = 40_000
MAX_TOTAL_CHARS = 500_000

ROLES = ("system", "user", "assistant")
POSITIONS = ("before", "after_card", "after", "depth")
PLACEMENTS = ("merge", "separate")
DEFAULT_SEPARATOR = "\n\n"
DEFAULT_ORDER = 100

EDITABLE_FIELDS = ("name", "description", "blocks", "placement", "separator", "char_name", "user_name", "regex_scripts", "lorebooks", "tools", "tool_max_steps", "tool_guidance", "tool_guidance_on")
SLOTS = ("", "lore_before", "lore_after")
MAX_LOREBOOKS = 20
MAX_PRESET_TOOLS = 8
DEFAULT_TOOL_STEPS = 3
MAX_TOOL_STEPS = 6
READ_ONLY_FIELDS = ("id", "created_at", "updated_at")


class PresetError(ValueError):
    """A preset or model reference that cannot be used. The message is meant for the person editing it."""


def split_model_ref(ref: Any) -> Tuple[Any, Optional[str]]:
    """`kimi-k3@noir` -> (`kimi-k3`, `noir`); a plain model -> (model, None).

    The preset name is lower-cased and may be empty (`kimi-k3@`), which the caller reports as unknown.
    Anything that is not a string is returned untouched so the caller's own checks still apply."""
    if not isinstance(ref, str) or "@" not in ref:
        return ref, None
    model, _, name = ref.rpartition("@")
    return model.strip(), name.strip().lower()


def _text(value: Any, field: str, limit: int, default: str = "") -> str:
    if value is None:
        return default
    if not isinstance(value, str):
        raise PresetError(f"{field} must be text")
    if len(value) > limit:
        raise PresetError(f"{field} is longer than {limit} characters")
    return value


def _int(value: Any, field: str, low: int, high: int, default: int) -> int:
    if value is None:
        return default
    if isinstance(value, bool) or not isinstance(value, (int, float)) or int(value) != value:
        raise PresetError(f"{field} must be a whole number")
    value = int(value)
    if not low <= value <= high:
        raise PresetError(f"{field} must be between {low} and {high}")
    return value


def clean_block(raw: Any, index: int) -> Dict[str, Any]:
    where = f"Block {index + 1}"
    if not isinstance(raw, dict):
        raise PresetError(f"{where} must be an object")
    role = raw.get("role", "system")
    if role not in ROLES:
        raise PresetError(f"{where}: role must be one of {', '.join(ROLES)}")
    position = raw.get("position", "before")
    if position not in POSITIONS:
        raise PresetError(f"{where}: position must be one of {', '.join(POSITIONS)}")
    enabled = raw.get("enabled", True)
    if not isinstance(enabled, bool):
        raise PresetError(f"{where}: enabled must be true or false")
    slot = raw.get("slot", "") or ""
    if slot not in SLOTS:
        raise PresetError(f"{where}: slot must be empty, lore_before or lore_after")
    block_id = _text(raw.get("id"), f"{where} id", 40) or f"b{index + 1}"
    return {
        "slot": slot,
        "id": block_id,
        "name": _text(raw.get("name"), f"{where} name", 80),
        "enabled": enabled,
        "role": role,
        "content": _text(raw.get("content"), f"{where} content", MAX_BLOCK_CHARS),
        "position": position,
        "depth": _int(raw.get("depth"), f"{where} depth", 0, 1000, 0),
        "order": _int(raw.get("order"), f"{where} order", 0, 10_000, DEFAULT_ORDER),
    }


def clean_blocks(raw: Any) -> list:
    if not isinstance(raw, list):
        raise PresetError("blocks must be a list")
    if len(raw) > MAX_BLOCKS:
        raise PresetError(f"A preset can have at most {MAX_BLOCKS} blocks")
    blocks = [clean_block(item, i) for i, item in enumerate(raw)]
    seen = set()
    for block in blocks:
        if block["id"] in seen:
            raise PresetError(f"Two blocks share the id '{block['id']}'")
        seen.add(block["id"])
    if sum(len(b["content"]) for b in blocks) > MAX_TOTAL_CHARS:
        raise PresetError(f"The blocks together are longer than {MAX_TOTAL_CHARS} characters")
    return blocks


def clean_preset(data: Any, partial: bool = False) -> Dict[str, Any]:
    """Validate a preset body. With `partial` only the fields that were sent are returned (for updates);
    otherwise every editable field is returned with its default filled in."""
    if not isinstance(data, dict):
        raise PresetError("The preset must be an object")
    unknown = sorted(k for k in data if k not in EDITABLE_FIELDS and k not in READ_ONLY_FIELDS)
    if unknown:
        raise PresetError(f"Unknown field: {', '.join(unknown)}")
    out: Dict[str, Any] = {}
    if "name" in data or not partial:
        name = data.get("name")
        if not isinstance(name, str) or not NAME_RE.match(name.strip().lower()):
            raise PresetError("name must be 1 to 40 characters: letters, numbers, - and _")
        out["name"] = name.strip().lower()
    if "description" in data or not partial:
        out["description"] = _text(data.get("description"), "description", 500)
    if "blocks" in data or not partial:
        out["blocks"] = clean_blocks(data.get("blocks", []))
    if "placement" in data or not partial:
        placement = data.get("placement", "merge")
        if placement not in PLACEMENTS:
            raise PresetError(f"placement must be one of {', '.join(PLACEMENTS)}")
        out["placement"] = placement
    if "separator" in data or not partial:
        out["separator"] = _text(data.get("separator"), "separator", 40, DEFAULT_SEPARATOR)
    for field in ("char_name", "user_name"):
        if field in data or not partial:
            out[field] = _text(data.get(field), field, 80).strip()
    if "lorebooks" in data or not partial:
        links = data.get("lorebooks", [])
        if not isinstance(links, list) or not all(isinstance(n, str) for n in links):
            raise PresetError("lorebooks must be a list of lorebook names")
        names = []
        for n in links:
            n = n.strip().lower()
            if not NAME_RE.match(n):
                raise PresetError(f"'{n}' is not a lorebook name")
            if n not in names:
                names.append(n)
        if len(names) > MAX_LOREBOOKS:
            raise PresetError(f"A preset can link at most {MAX_LOREBOOKS} lorebooks")
        out["lorebooks"] = names
    if "tools" in data or not partial:
        raw_tools = data.get("tools", [])
        if not isinstance(raw_tools, list) or not all(isinstance(n, str) for n in raw_tools):
            raise PresetError("tools must be a list of tool names")
        names = list(dict.fromkeys(n.strip() for n in raw_tools))
        if len(names) > MAX_PRESET_TOOLS:
            raise PresetError(f"A preset can use at most {MAX_PRESET_TOOLS} tools")
        known = {t.name for t in chat_tools.all_tools()}
        unknown = [n for n in names if n not in known]
        if unknown:
            raise PresetError(f"Unknown tool: {', '.join(unknown)}. Available: {', '.join(sorted(known))}")
        out["tools"] = names
    if "tool_max_steps" in data or not partial:
        steps = data.get("tool_max_steps", DEFAULT_TOOL_STEPS)
        if isinstance(steps, bool) or not isinstance(steps, int) or not 1 <= steps <= MAX_TOOL_STEPS:
            raise PresetError(f"tool_max_steps must be a whole number from 1 to {MAX_TOOL_STEPS}")
        out["tool_max_steps"] = steps
    if "tool_guidance" in data or not partial:
        text = data.get("tool_guidance", "")
        if not isinstance(text, str):
            raise PresetError("tool_guidance must be text")
        if len(text) > protocol.MAX_GUIDANCE_CHARS:
            raise PresetError(f"tool_guidance can be at most {protocol.MAX_GUIDANCE_CHARS} characters")
        out["tool_guidance"] = text.strip()   # empty means: use the built-in text
    if "tool_guidance_on" in data or not partial:
        on = data.get("tool_guidance_on", True)
        if not isinstance(on, bool):
            raise PresetError("tool_guidance_on must be true or false")
        out["tool_guidance_on"] = on
    if "regex_scripts" in data or not partial:
        try:
            out["regex_scripts"] = regex_scripts.clean_scripts(data.get("regex_scripts", []))
        except regex_scripts.RegexScriptError as e:
            raise PresetError(str(e))
    return out
