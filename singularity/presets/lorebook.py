#!/usr/bin/env python3
"""
Lorebooks
=========
A lorebook is a set of entries that are added to the prompt when the recent chat mentions them. This file holds
everything that does not touch the database: what an entry and a lorebook look like (and the checks), the import of
SillyTavern World Info files, and the activation itself.

Activation, in short (SillyTavern's rules, reimplemented from the file format; no SillyTavern source is used):
  1. The scan text is the newest N chat messages (user and assistant, not the character card). N is the entry's own
     scan depth, else the lorebook's.
  2. An entry fires when any primary key is found. If it has secondary keys they must also agree (any / not all /
     not any / all). A constant entry always fires. A probability below 100 is a dice roll.
  3. With recursion on, the text of fired entries is scanned again for more entries (at most three more passes).
  4. The highest `order` entries are admitted first until the character budget (token_budget x 4) is used; the first
     entry that does not fit stops the line.
Keys are plain text (case-insensitive unless the entry says otherwise, whole-word when set) or `/regex/flags` keys,
which run through jsre.py (an unsafe or untranslatable pattern is skipped and reported, never run wrongly).
"""

import random
import re
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple

try:
    from singularity.presets import jsre
except ImportError:
    from presets import jsre

NAME_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,39}$")

POSITIONS = ("before", "after", "an_top", "an_bottom", "depth", "em_top", "em_bottom")
LOGICS = ("and_any", "not_all", "not_any", "and_all")
ROLES = ("system", "user", "assistant")
AN_DEPTH = 4

DEFAULT_SCAN_DEPTH = 4
MAX_SCAN_DEPTH = 50
DEFAULT_TOKEN_BUDGET = 3000
MIN_TOKEN_BUDGET = 100
MAX_TOKEN_BUDGET = 20_000
CHARS_PER_TOKEN = 4
RECURSION_PASSES = 3

MAX_ENTRIES = 2000
MAX_ENTRY_CHARS = 20_000
MAX_TOTAL_CHARS = 4_000_000
MAX_KEYS = 500
MAX_KEY_CHARS = 200
MAX_ORDER = 100_000
DEFAULT_ORDER = 100

ST_POSITION = {0: "before", 1: "after", 2: "an_top", 3: "an_bottom", 4: "depth", 5: "em_top", 6: "em_bottom"}
V2_POSITION = {"before_char": "before", "after_char": "after"}
ST_LOGIC = {0: "and_any", 1: "not_all", 2: "not_any", 3: "and_all"}
ST_ROLE = {0: "system", 1: "user", 2: "assistant"}

LOREBOOK_FIELDS = ("name", "description", "scan_depth", "token_budget", "recursive", "entries")
READ_ONLY_FIELDS = ("id", "created_at", "updated_at", "entry_count", "enabled_count")


class LoreError(ValueError):
    """A lorebook or entry that cannot be stored or used. The message is meant for the person editing it."""


# ------------------------------------------------------------------ cleaning

def _text(value: Any, field_name: str, limit: int, where: str, default: str = "") -> str:
    if value is None:
        return default
    if not isinstance(value, str):
        raise LoreError(f"{where}: {field_name} must be text")
    if len(value) > limit:
        raise LoreError(f"{where}: {field_name} is longer than {limit} characters")
    return value


def _bool(value: Any, field_name: str, where: str, default: Optional[bool] = False) -> Optional[bool]:
    if value is None:
        return default
    if not isinstance(value, bool):
        raise LoreError(f"{where}: {field_name} must be true or false")
    return value


def _int(value: Any, field_name: str, low: int, high: int, where: str, default: Optional[int]) -> Optional[int]:
    if value is None or value == "":
        return default
    if isinstance(value, bool) or not isinstance(value, (int, float)) or int(value) != value:
        raise LoreError(f"{where}: {field_name} must be a whole number")
    value = int(value)
    if not low <= value <= high:
        raise LoreError(f"{where}: {field_name} must be between {low} and {high}")
    return value


def _keys(value: Any, field_name: str, where: str) -> List[str]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise LoreError(f"{where}: {field_name} must be a list")
    out = []
    for key in value:
        if not isinstance(key, str):
            raise LoreError(f"{where}: every key must be text")
        key = key.strip()
        if not key:
            continue
        if len(key) > MAX_KEY_CHARS:
            raise LoreError(f"{where}: a key is longer than {MAX_KEY_CHARS} characters")
        if key not in out:
            out.append(key)
    if len(out) > MAX_KEYS:
        raise LoreError(f"{where}: at most {MAX_KEYS} keys")
    return out


def clean_entry(raw: Any, index: int) -> Dict[str, Any]:
    where = f"Entry {index + 1}"
    if not isinstance(raw, dict):
        raise LoreError(f"{where} must be an object")
    position = raw.get("position", "before")
    if position not in POSITIONS:
        raise LoreError(f"{where}: position must be one of {', '.join(POSITIONS)}")
    logic = raw.get("logic", "and_any")
    if logic not in LOGICS:
        raise LoreError(f"{where}: logic must be one of {', '.join(LOGICS)}")
    role = raw.get("role", "system")
    if role not in ROLES:
        raise LoreError(f"{where}: role must be one of {', '.join(ROLES)}")
    probability = _int(raw.get("probability"), "probability", 0, 100, where, 100)
    return {
        "id": _text(raw.get("id"), "id", 40, where) or f"e{index + 1}",
        "name": _text(raw.get("name"), "name", 200, where),
        "keys": _keys(raw.get("keys"), "keys", where),
        "secondary_keys": _keys(raw.get("secondary_keys"), "secondary_keys", where),
        "logic": logic,
        "constant": _bool(raw.get("constant"), "constant", where),
        "disabled": _bool(raw.get("disabled"), "disabled", where),
        "position": position,
        "depth": _int(raw.get("depth"), "depth", 0, 1000, where, AN_DEPTH),
        "role": role,
        "order": _int(raw.get("order"), "order", 0, MAX_ORDER, where, DEFAULT_ORDER),
        "probability": probability,
        "scan_depth": _int(raw.get("scan_depth"), "scan_depth", 1, MAX_SCAN_DEPTH, where, None),
        "case_sensitive": _bool(raw.get("case_sensitive"), "case_sensitive", where, None),
        "match_whole_words": _bool(raw.get("match_whole_words"), "match_whole_words", where, None),
        "prevent_recursion": _bool(raw.get("prevent_recursion"), "prevent_recursion", where),
        "exclude_recursion": _bool(raw.get("exclude_recursion"), "exclude_recursion", where),
        "delay_until_recursion": _bool(raw.get("delay_until_recursion"), "delay_until_recursion", where),
        "content": _text(raw.get("content"), "content", MAX_ENTRY_CHARS, where),
    }


def clean_entries(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, list):
        raise LoreError("entries must be a list")
    if len(raw) > MAX_ENTRIES:
        raise LoreError(f"A lorebook can have at most {MAX_ENTRIES} entries")
    entries = [clean_entry(item, i) for i, item in enumerate(raw)]
    seen = set()
    for e in entries:
        if e["id"] in seen:
            raise LoreError(f"Two entries share the id '{e['id']}'")
        seen.add(e["id"])
    if sum(len(e["content"]) for e in entries) > MAX_TOTAL_CHARS:
        raise LoreError(f"The entries together are longer than {MAX_TOTAL_CHARS} characters")
    return entries


def clean_lorebook(data: Any, partial: bool = False) -> Dict[str, Any]:
    """Validate a lorebook body. With `partial` only the fields that were sent are returned (for updates)."""
    if not isinstance(data, dict):
        raise LoreError("The lorebook must be an object")
    unknown = sorted(k for k in data if k not in LOREBOOK_FIELDS and k not in READ_ONLY_FIELDS)
    if unknown:
        raise LoreError(f"Unknown field: {', '.join(unknown)}")
    out: Dict[str, Any] = {}
    if "name" in data or not partial:
        name = data.get("name")
        if not isinstance(name, str) or not NAME_RE.match(name.strip().lower()):
            raise LoreError("name must be 1 to 40 characters: letters, numbers, - and _")
        out["name"] = name.strip().lower()
    if "description" in data or not partial:
        out["description"] = _text(data.get("description"), "description", 500, "Lorebook")
    if "scan_depth" in data or not partial:
        out["scan_depth"] = _int(data.get("scan_depth"), "scan_depth", 1, MAX_SCAN_DEPTH, "Lorebook", DEFAULT_SCAN_DEPTH)
    if "token_budget" in data or not partial:
        out["token_budget"] = _int(data.get("token_budget"), "token_budget", MIN_TOKEN_BUDGET, MAX_TOKEN_BUDGET, "Lorebook", DEFAULT_TOKEN_BUDGET)
    if "recursive" in data or not partial:
        out["recursive"] = _bool(data.get("recursive"), "recursive", "Lorebook")
    if "entries" in data or not partial:
        out["entries"] = clean_entries(data.get("entries", []))
    return out


# ------------------------------------------------------------------ SillyTavern import

def _clamp(value: Any, low: int, high: int, default: int) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default
    return max(low, min(high, number))


def _opt_bool(value: Any) -> Optional[bool]:
    return None if value is None else bool(value)


def _st_entry(raw: Dict[str, Any], index: int, report: Dict[str, Any]) -> Dict[str, Any]:
    ext = raw.get("extensions") if isinstance(raw.get("extensions"), dict) else {}

    def pick(*names, default=None):
        for source in (raw, ext):
            for n in names:
                if n in source and source[n] is not None:
                    return source[n]
        return default

    position_raw = pick("position", default=0)
    position = ST_POSITION.get(position_raw) if isinstance(position_raw, int) else V2_POSITION.get(str(position_raw))
    disabled = bool(pick("disable", default=False)) or pick("enabled", default=True) is False
    if position is None:
        position = "after"
        if position_raw == 7:
            report["outlet_entries"] += 1
            disabled = True
    keys = pick("key", "keys", default=[])
    secondary = pick("keysecondary", "secondary_keys", default=[])
    selective = bool(pick("selective", default=bool(secondary)))
    logic_raw = pick("selectiveLogic", "selective_logic", default=0)
    logic = ST_LOGIC.get(logic_raw, "and_any") if isinstance(logic_raw, int) else "and_any"
    role_raw = pick("role", default=0)
    role = ST_ROLE.get(role_raw, "system") if isinstance(role_raw, int) else "system"
    use_probability = pick("useProbability", default=True)
    probability = pick("probability", default=100)
    probability = _clamp(probability, 0, 100, 100) if use_probability else 100
    scan_depth = pick("scanDepth", "scan_depth", default=None)
    if pick("group") or pick("groupOverride"):
        report["groups_ignored"] += 1
    if any(pick(k) for k in ("sticky", "cooldown", "delay")):
        report["timed_effects_ignored"] += 1
    if pick("characterFilter") and isinstance(pick("characterFilter"), dict) and (
            pick("characterFilter").get("names") or pick("characterFilter").get("tags")):
        report["character_filters_ignored"] += 1
    name = str(raw.get("comment") or raw.get("name") or "")
    if any(isinstance(k, str) and re.fullmatch(r"/.+/[a-z]*", k.strip(), re.S) for k in (keys if isinstance(keys, list) else [])):
        report["regex_keys"] += 1
    return {
        "id": str(raw.get("uid", raw.get("id", index))),
        "name": name[:200],
        "keys": [k for k in keys if isinstance(k, str)] if isinstance(keys, list) else [],
        "secondary_keys": [k for k in secondary if isinstance(k, str)] if selective and isinstance(secondary, list) else [],
        "logic": logic,
        "constant": bool(pick("constant", default=False)),
        "disabled": disabled,
        "position": position,
        "depth": _clamp(pick("depth", default=AN_DEPTH), 0, 1000, AN_DEPTH),
        "role": role,
        "order": _clamp(pick("order", "insertion_order", "priority", default=DEFAULT_ORDER), 0, MAX_ORDER, DEFAULT_ORDER),
        "probability": probability,
        "scan_depth": _clamp(scan_depth, 1, MAX_SCAN_DEPTH, DEFAULT_SCAN_DEPTH) if scan_depth else None,
        "case_sensitive": _opt_bool(pick("caseSensitive", "case_sensitive", default=None)),
        "match_whole_words": _opt_bool(pick("matchWholeWords", "match_whole_words", default=None)),
        "prevent_recursion": bool(pick("preventRecursion", "prevent_recursion", default=False)),
        "exclude_recursion": bool(pick("excludeRecursion", "exclude_recursion", default=False)),
        "delay_until_recursion": bool(pick("delayUntilRecursion", "delay_until_recursion", default=False)),
        "content": str(raw.get("content") or ""),
    }


def from_st(data: Any, name: str = "") -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """A SillyTavern World Info file (`entries` as an object) or a character book (`entries` as a list) ->
    (lorebook body, report). Raises LoreError when the file is not a lorebook."""
    if not isinstance(data, dict):
        raise LoreError("This does not look like a SillyTavern World Info file")
    entries = data.get("entries")
    if isinstance(entries, dict):
        entries = list(entries.values())
    if not isinstance(entries, list) or not entries:
        raise LoreError("This does not look like a SillyTavern World Info file (no entries)")
    report: Dict[str, Any] = {
        "entries": 0, "disabled": 0, "constant": 0, "selective": 0, "regex_keys": 0, "empty_dropped": 0,
        "groups_ignored": 0, "timed_effects_ignored": 0, "character_filters_ignored": 0, "outlet_entries": 0,
        "positions": {}, "settings_clamped": [],
    }
    converted = []
    for index, raw in enumerate(e for e in entries if isinstance(e, dict)):
        entry = _st_entry(raw, index, report)
        if not entry["content"].strip():
            report["empty_dropped"] += 1
            continue
        converted.append(entry)
    if not converted:
        raise LoreError("This World Info file has no entries with text")
    seen, unique = set(), []
    for i, e in enumerate(converted):
        while e["id"] in seen:
            e["id"] = f"{e['id']}_{i}"
        seen.add(e["id"])
        unique.append(e)
    for e in unique:
        report["entries"] += 1
        report["disabled"] += 1 if e["disabled"] else 0
        report["constant"] += 1 if e["constant"] else 0
        report["selective"] += 1 if e["secondary_keys"] else 0
        report["positions"][e["position"]] = report["positions"].get(e["position"], 0) + 1

    def setting(key: str, low: int, high: int, default: int) -> int:
        raw_value = data.get(key)
        if raw_value in (None, "", 0):
            return default
        clamped = _clamp(raw_value, low, high, default)
        if clamped != raw_value:
            report["settings_clamped"].append(f"{key} {raw_value} -> {clamped}")
        return clamped

    lorebook = {
        "name": name or "imported",
        "description": str(data.get("description") or "")[:500],
        "scan_depth": setting("scan_depth", 1, MAX_SCAN_DEPTH, DEFAULT_SCAN_DEPTH),
        "token_budget": setting("token_budget", MIN_TOKEN_BUDGET, MAX_TOKEN_BUDGET, DEFAULT_TOKEN_BUDGET),
        "recursive": bool(data.get("recursive_scanning") or data.get("recursive")),
        "entries": unique,
    }
    return lorebook, report


def lorebook_name_from(text: str) -> str:
    base = re.sub(r"\.json$", "", str(text or "").strip(), flags=re.IGNORECASE).lower()
    base = re.sub(r"[^a-z0-9_]+", "-", base).strip("-_")
    return base[:40].strip("-_") or "lorebook"


# ------------------------------------------------------------------ matching

@lru_cache(maxsize=2048)
def _plain_pattern(key: str, whole_words: bool, case_sensitive: bool) -> "re.Pattern[str]":
    flags = 0 if case_sensitive else re.IGNORECASE
    escaped = re.escape(key)
    # A single word is matched as a whole word; a phrase is matched wherever it appears (SillyTavern's rule).
    if whole_words and not re.search(r"\s", key):
        return re.compile(r"(?:^|\W)" + escaped + r"(?:$|\W)", flags)
    return re.compile(escaped, flags)


def _is_regex_key(key: str) -> bool:
    return bool(re.fullmatch(r"/.+/[a-z]*", key, re.S))


def key_matches(key: str, text: str, case_sensitive: bool = False, whole_words: bool = False,
                warnings: Optional[List[str]] = None) -> bool:
    key = key.strip()
    if not key or not text:
        return False
    if _is_regex_key(key):
        try:
            pattern, _ = jsre.compile_js(key)
        except jsre.RegexError as e:
            if warnings is not None and f"Regex key {key[:60]}: {e}" not in warnings:
                warnings.append(f"Regex key {key[:60]}: {e}")
            return False
        return bool(pattern.search(text))
    return bool(_plain_pattern(key, whole_words, case_sensitive).search(text))


def _entry_matches(entry: Dict[str, Any], buffer: str, warnings: List[str]) -> bool:
    cs = bool(entry.get("case_sensitive"))
    ww = bool(entry.get("match_whole_words"))
    if not any(key_matches(k, buffer, cs, ww, warnings) for k in entry.get("keys") or []):
        return False
    secondary = entry.get("secondary_keys") or []
    if not secondary:
        return True
    hits = [key_matches(k, buffer, cs, ww, warnings) for k in secondary]
    logic = entry.get("logic", "and_any")
    if logic == "and_any":
        return any(hits)
    if logic == "and_all":
        return all(hits)
    if logic == "not_any":
        return not any(hits)
    return not all(hits)  # not_all


# ------------------------------------------------------------------ activation

@dataclass
class LoreResult:
    texts: Dict[str, List[str]] = field(default_factory=lambda: {p: [] for p in POSITIONS if p != "depth"})
    depth: List[Dict[str, Any]] = field(default_factory=list)   # {text, depth, role}, lowest order first
    fired: List[Dict[str, Any]] = field(default_factory=list)   # what was added, for the dashboard
    dropped: List[Dict[str, Any]] = field(default_factory=list)  # fired but over the budget
    warnings: List[str] = field(default_factory=list)

    def empty(self) -> bool:
        return not self.depth and not any(self.texts.values())


def chat_texts(messages: List[Dict[str, Any]]) -> List[str]:
    """The text of every user and assistant message, oldest first (the character card is not scanned)."""
    out = []
    for m in messages or []:
        if not isinstance(m, dict) or m.get("role") not in ("user", "assistant"):
            continue
        content = m.get("content")
        if isinstance(content, list):
            content = " ".join(p.get("text", "") for p in content if isinstance(p, dict) and p.get("type") == "text")
        out.append(content if isinstance(content, str) else "")
    return out


def _activate_book(book: Dict[str, Any], texts: List[str], rng: random.Random, result: LoreResult) -> None:
    entries = [e for e in book.get("entries") or [] if not e.get("disabled") and (e.get("content") or "").strip()]
    if not entries:
        return
    default_depth = book.get("scan_depth") or DEFAULT_SCAN_DEPTH
    buffers: Dict[int, str] = {}

    def buffer(depth: int) -> str:
        if depth not in buffers:
            buffers[depth] = "\n".join(texts[-depth:]) if texts else ""
        return buffers[depth]

    activated: Dict[str, Tuple[Dict[str, Any], str]] = {}
    rolled = set()
    recursion_text = ""
    passes = 1 + (RECURSION_PASSES if book.get("recursive") else 0)
    for p in range(passes):
        fresh = []
        for e in entries:
            if e["id"] in activated or e["id"] in rolled:
                continue
            if p == 0 and e.get("delay_until_recursion"):
                continue
            if p > 0 and e.get("exclude_recursion"):
                continue
            depth = e.get("scan_depth") or default_depth
            scan = buffer(depth) + (("\n" + recursion_text) if p > 0 else "")
            via = "constant" if e.get("constant") else ("keys" if p == 0 else "recursion")
            if not e.get("constant") and not _entry_matches(e, scan, result.warnings):
                continue
            chance = e.get("probability", 100)
            if chance is not None and chance < 100 and rng.random() * 100 >= chance:
                rolled.add(e["id"])
                continue
            activated[e["id"]] = (e, via)
            fresh.append(e)
        added = "\n".join(e["content"] for e in fresh if not e.get("prevent_recursion"))
        if not fresh or not added.strip():
            break
        recursion_text = (recursion_text + "\n" + added).strip("\n")

    order_index = {e["id"]: i for i, e in enumerate(entries)}
    ranked = sorted(activated.values(), key=lambda item: (-item[0].get("order", DEFAULT_ORDER), order_index[item[0]["id"]]))
    budget = int(book.get("token_budget") or DEFAULT_TOKEN_BUDGET) * CHARS_PER_TOKEN
    used = 0
    admitted = []
    full = False
    for e, via in ranked:
        size = len(e["content"])
        if full or used + size > budget:
            full = True
            result.dropped.append({"lorebook": book.get("name"), "id": e["id"], "name": e.get("name", ""), "chars": size})
            continue
        used += size
        admitted.append((e, via))
    # In the prompt the lowest order comes first and the highest last (SillyTavern's own join order).
    admitted.sort(key=lambda item: (item[0].get("order", DEFAULT_ORDER), order_index[item[0]["id"]]))
    for e, via in admitted:
        text = e["content"]
        if e["position"] == "depth":
            result.depth.append({"text": text, "depth": e.get("depth", AN_DEPTH), "role": e.get("role", "system")})
        else:
            result.texts[e["position"]].append(text)
        result.fired.append({"lorebook": book.get("name"), "id": e["id"], "name": e.get("name", ""), "position": e["position"],
                             "order": e.get("order", DEFAULT_ORDER), "chars": len(text), "via": via})


def activate(messages: List[Dict[str, Any]], books: List[Dict[str, Any]], rng: Optional[random.Random] = None) -> LoreResult:
    """Which entries of `books` the chat in `messages` fires, ready for the prompt stage."""
    result = LoreResult()
    rng = rng or random.Random()
    texts = chat_texts(messages)
    for book in books or []:
        if isinstance(book, dict):
            _activate_book(book, texts, rng, result)
    return result
