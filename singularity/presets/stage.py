#!/usr/bin/env python3
"""
The prompt stage
================
`apply(messages, preset, lore=None)` returns the messages the engine should receive. It is a pure function: the
input list and its messages are never changed.

  before      above the character card (JanitorAI's system message). With `merge` placement the system
              blocks are joined into that message; with `separate` each one is its own message.
  after_card  right after the card, before the chat. `merge` appends them to the card's message.
  after       after the last message.
  depth N     N messages from the end of the history (0 = last position), never above the first history message.

Macros (see macros.py) are rendered inside block text only, in block order, with one variable scope per
request. Chat messages are never scanned, so nobody can plant a macro in what they type.
"""

from typing import Any, Dict, List

try:
    from singularity.presets import macros
except ImportError:
    from presets import macros

SYSTEM_ROLES = ("system", "developer")


def _as_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(p.get("text", "") for p in content if isinstance(p, dict) and p.get("type") == "text")
    return ""


def _is_card(message: Any) -> bool:
    return isinstance(message, dict) and message.get("role") in SYSTEM_ROLES


def _wrap(message: Dict[str, Any], prefix: str, suffix: str, separator: str) -> Dict[str, Any]:
    """A copy of a system message with text before and/or after its content (a string, or content parts)."""
    content = message.get("content")
    out = dict(message)
    if isinstance(content, list):
        parts = [dict(p) if isinstance(p, dict) else p for p in content]
        if prefix:
            parts.insert(0, {"type": "text", "text": prefix + (separator if parts else "")})
        if suffix:
            parts.append({"type": "text", "text": (separator if parts else "") + suffix})
        out["content"] = parts
    else:
        existing = content if isinstance(content, str) else ""
        out["content"] = separator.join(t for t in (prefix, existing, suffix) if t)
    return out


def _leading_system_count(messages: List[Dict[str, Any]]) -> int:
    count = 0
    for m in messages:
        if _is_card(m):
            count += 1
        else:
            break
    return count


def _last_user_text(messages: List[Dict[str, Any]]) -> str:
    for m in reversed(messages):
        if isinstance(m, dict) and m.get("role") == "user":
            return _as_text(m.get("content"))
    return ""


def _lore_block(position: str, role: str = "system", depth: int = 0, order: int = 100, name: str = "World info") -> Dict[str, Any]:
    return {"id": "lore", "name": name, "enabled": True, "role": role, "position": position, "depth": depth, "order": order, "slot": ""}


def _live_blocks(preset: Dict[str, Any], messages: List[Dict[str, Any]], lore: Any = None) -> List[Dict[str, Any]]:
    """The enabled blocks that still have text after macros, in list order. Macros run in that order
    with one shared scope, so a variable set in one block can be read in a later one.

    `lore` (lorebook.LoreResult) adds the activated lorebook entries: a block with a `slot` of lore_before /
    lore_after takes the entries' text where the preset put it; without such a block the before-text goes to
    the top and the after-text right below the card. Depth entries become depth blocks; author's-note entries
    sit at depth 4; example-message entries join the after text."""
    scope = macros.Scope(preset.get("char_name") or "", preset.get("user_name") or "", _last_user_text(messages))
    blocks = preset.get("blocks") or []
    has_lore = bool(lore) and not lore.empty()
    before_raw = "\n".join(lore.texts["before"]) if has_lore else ""
    after_raw = "\n".join(lore.texts["after"] + lore.texts["em_top"] + lore.texts["em_bottom"]) if has_lore else ""
    live: List[Dict[str, Any]] = []

    def add(block: Dict[str, Any], content: str, index: int) -> None:
        text = macros.render(content or "", scope)
        if text.strip():
            live.append({**block, "text": text, "index": index})

    if before_raw and not any(b.get("slot") == "lore_before" for b in blocks):
        add(_lore_block("before", name="World info (before)"), before_raw, -1)
    for index, block in enumerate(blocks):
        if not block.get("enabled", True):
            continue
        slot = block.get("slot") or ""
        content = before_raw if slot == "lore_before" else after_raw if slot == "lore_after" else block.get("content") or ""
        add(block, content, index)
    base = len(blocks)
    if after_raw and not any(b.get("slot") == "lore_after" for b in blocks):
        add(_lore_block("after_card", name="World info (after)"), after_raw, base)
    if has_lore:
        for k, item in enumerate(lore.depth):
            add(_lore_block("depth", item.get("role", "system"), int(item.get("depth", 4)), 0), item["text"], base + 1 + k)
        top, bottom = "\n".join(lore.texts["an_top"]), "\n".join(lore.texts["an_bottom"])
        if top:
            add(_lore_block("depth", depth=4, order=0, name="World info (note top)"), top, base + 1_000)
        if bottom:
            add(_lore_block("depth", depth=4, order=0, name="World info (note bottom)"), bottom, base + 1_001)
    return live


def _message(block: Dict[str, Any]) -> Dict[str, Any]:
    return {"role": block.get("role", "system"), "content": block["text"]}


def apply(messages: List[Dict[str, Any]], preset: Dict[str, Any], lore: Any = None) -> List[Dict[str, Any]]:
    msgs = [dict(m) if isinstance(m, dict) else m for m in messages or []]
    blocks = _live_blocks(preset, msgs, lore)
    if not blocks:
        return msgs

    merge = preset.get("placement", "merge") == "merge"
    separator = preset.get("separator") if preset.get("separator") is not None else "\n\n"

    def where(b):
        return b.get("position", "before")

    before = [b for b in blocks if where(b) == "before"]
    card_after = [b for b in blocks if where(b) == "after_card"]
    after = [b for b in blocks if where(b) == "after"]
    depth = [b for b in blocks if where(b) == "depth"]

    def is_system(b):
        return b.get("role", "system") == "system"

    # Around the card. In merge mode the system blocks become text on the card's message; everything
    # else becomes messages of its own (above the card, or between the card and the chat).
    top: List[Dict[str, Any]] = []
    below: List[Dict[str, Any]] = []
    if merge:
        prefix = separator.join(b["text"] for b in before if is_system(b))
        suffix = separator.join(b["text"] for b in card_after if is_system(b))
        if prefix or suffix:
            if msgs and _is_card(msgs[0]):
                msgs[0] = _wrap(msgs[0], prefix, suffix, separator)
            else:
                msgs.insert(0, {"role": "system", "content": separator.join(t for t in (prefix, suffix) if t)})
        below = [b for b in before + card_after if not is_system(b)]
    else:
        top = [b for b in before if is_system(b)]
        below = [b for b in before if not is_system(b)] + card_after
    below.sort(key=lambda b: b["index"])
    head = _leading_system_count(msgs)
    msgs = [_message(b) for b in top] + msgs[:head] + [_message(b) for b in below] + msgs[head:]
    head += len(top) + len(below)

    # Inside the history, counted from the end.
    if depth:
        history = msgs[head:]
        inserts = []
        for index, block in enumerate(depth):
            position = min(max(len(history) - int(block.get("depth", 0)), 0), len(history))
            inserts.append((position, -int(block.get("depth", 0)), -int(block.get("order", 100)), index, block))
        inserts.sort(key=lambda item: item[:4])
        rebuilt: List[Dict[str, Any]] = []
        cursor = 0
        for position in range(len(history) + 1):
            while cursor < len(inserts) and inserts[cursor][0] == position:
                rebuilt.append(_message(inserts[cursor][4]))
                cursor += 1
            if position < len(history):
                rebuilt.append(history[position])
        msgs = msgs[:head] + rebuilt

    # After the last message.
    msgs.extend(_message(b) for b in after)
    return msgs
