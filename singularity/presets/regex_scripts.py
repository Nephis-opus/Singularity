#!/usr/bin/env python3
"""
Regex scripts
=============
SillyTavern-style find-and-replace scripts that belong to a preset.

Where a script runs (the two flags decide, as in SillyTavern):
  prompt_only    rewrites the chat history on its way to the model       (the gateway, this file)
  markdown_only  rewrites the text for display                           (the userscript on JanitorAI)
  neither flag   rewrites the stored message, which here means both places

A script has a `placement`: 1 = what the user typed, 2 = what the model wrote. `min_depth` / `max_depth`
count messages back from the newest one (0 = the newest). Behaviour is reimplemented from the file format;
no SillyTavern source is used.

Safety: captured chat text is never read as a macro (macros are rendered on the replacement template
first, then the captures are put in), and patterns that could backtrack catastrophically are refused
(see jsre.py).
"""

import re
from typing import Any, Dict, List, Optional

try:
    from singularity.presets import jsre, macros
except ImportError:
    from presets import jsre, macros

MAX_SCRIPTS = 300
MAX_FIND_CHARS = jsre.MAX_PATTERN_CHARS
MAX_REPLACE_CHARS = 100_000
MAX_TOTAL_CHARS = 2_000_000
MAX_TEXT_CHARS = 300_000   # a message longer than this is left alone by the prompt-side pass
PLACEMENT_USER, PLACEMENT_AI = 1, 2
KNOWN_PLACEMENTS = (0, 1, 2, 3, 5, 6)
ROLE_PLACEMENT = {"user": PLACEMENT_USER, "assistant": PLACEMENT_AI}


class RegexScriptError(ValueError):
    """A script that cannot be stored. The message is meant for the person editing it."""


# ------------------------------------------------------------------ cleaning

def _text(value: Any, field: str, limit: int, where: str) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        raise RegexScriptError(f"{where}: {field} must be text")
    if len(value) > limit:
        raise RegexScriptError(f"{where}: {field} is longer than {limit} characters")
    return value


def _flag(value: Any, field: str, where: str) -> bool:
    if value is None:
        return False
    if not isinstance(value, bool):
        raise RegexScriptError(f"{where}: {field} must be true or false")
    return value


def _depth(value: Any, field: str, where: str) -> Optional[int]:
    if value is None or value == "":
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)) or int(value) != value:
        raise RegexScriptError(f"{where}: {field} must be a whole number or empty")
    value = int(value)
    if not -1 <= value <= 10_000:
        raise RegexScriptError(f"{where}: {field} must be between -1 and 10000")
    return value


def clean_script(raw: Any, index: int) -> Dict[str, Any]:
    where = f"Regex script {index + 1}"
    if not isinstance(raw, dict):
        raise RegexScriptError(f"{where} must be an object")
    placement = raw.get("placement", [PLACEMENT_AI])
    if not isinstance(placement, list) or not all(isinstance(p, int) and not isinstance(p, bool) for p in placement):
        raise RegexScriptError(f"{where}: placement must be a list of numbers")
    substitute = raw.get("substitute", 0)
    if substitute not in (0, 1, 2) or isinstance(substitute, bool):
        raise RegexScriptError(f"{where}: substitute must be 0, 1 or 2")
    trim = raw.get("trim_strings", [])
    if not isinstance(trim, list) or len(trim) > 50 or not all(isinstance(t, str) and len(t) <= 200 for t in trim):
        raise RegexScriptError(f"{where}: trim_strings must be a list of up to 50 short texts")
    script_id = _text(raw.get("id"), "id", 80, where) or f"r{index + 1}"
    return {
        "id": script_id,
        "name": _text(raw.get("name"), "name", 160, where),
        "find": _text(raw.get("find"), "find", MAX_FIND_CHARS, where),
        "replace": _text(raw.get("replace"), "replace", MAX_REPLACE_CHARS, where),
        "trim_strings": list(trim),
        "placement": sorted({p for p in placement if p in KNOWN_PLACEMENTS}),
        "disabled": _flag(raw.get("disabled"), "disabled", where),
        "markdown_only": _flag(raw.get("markdown_only"), "markdown_only", where),
        "prompt_only": _flag(raw.get("prompt_only"), "prompt_only", where),
        "run_on_edit": _flag(raw.get("run_on_edit"), "run_on_edit", where),
        "substitute": substitute,
        "min_depth": _depth(raw.get("min_depth"), "min_depth", where),
        "max_depth": _depth(raw.get("max_depth"), "max_depth", where),
    }


def clean_scripts(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, list):
        raise RegexScriptError("regex_scripts must be a list")
    if len(raw) > MAX_SCRIPTS:
        raise RegexScriptError(f"A preset can have at most {MAX_SCRIPTS} regex scripts")
    scripts = [clean_script(item, i) for i, item in enumerate(raw)]
    seen = set()
    for s in scripts:
        if s["id"] in seen:
            raise RegexScriptError(f"Two regex scripts share the id '{s['id']}'")
        seen.add(s["id"])
    if sum(len(s["find"]) + len(s["replace"]) for s in scripts) > MAX_TOTAL_CHARS:
        raise RegexScriptError(f"The regex scripts together are longer than {MAX_TOTAL_CHARS} characters")
    return scripts


def from_st(raw: Any, index: int) -> Dict[str, Any]:
    """One entry of a SillyTavern `extensions.regex_scripts` list, in our shape (not yet cleaned)."""
    raw = raw if isinstance(raw, dict) else {}
    trim = raw.get("trimStrings")
    depth = lambda v: v if isinstance(v, (int, float)) and not isinstance(v, bool) else None  # noqa: E731
    return {
        "id": f"r{index + 1}",
        "name": str(raw.get("scriptName") or "")[:160],
        "find": raw.get("findRegex") if isinstance(raw.get("findRegex"), str) else "",
        "replace": raw.get("replaceString") if isinstance(raw.get("replaceString"), str) else "",
        "trim_strings": [t for t in trim if isinstance(t, str)][:50] if isinstance(trim, list) else [],
        "placement": [p for p in (raw.get("placement") or []) if isinstance(p, int) and not isinstance(p, bool)] or [PLACEMENT_AI],
        "disabled": bool(raw.get("disabled")),
        "markdown_only": bool(raw.get("markdownOnly")),
        "prompt_only": bool(raw.get("promptOnly")),
        "run_on_edit": bool(raw.get("runOnEdit")),
        "substitute": raw.get("substituteRegex") if raw.get("substituteRegex") in (0, 1, 2) else 0,
        "min_depth": depth(raw.get("minDepth")),
        "max_depth": depth(raw.get("maxDepth")),
    }


# ------------------------------------------------------------------ where a script runs

def runs_on_prompt(script: Dict[str, Any]) -> bool:
    return bool(script.get("prompt_only")) or not script.get("markdown_only")


def runs_on_display(script: Dict[str, Any]) -> bool:
    return bool(script.get("markdown_only")) or not script.get("prompt_only")


def prompt_status(script: Dict[str, Any]) -> Dict[str, str]:
    """Can the gateway run this script on the prompt? ('ok', 'skipped' with a reason, or 'n/a' when it is display-only)."""
    if not runs_on_prompt(script):
        return {"status": "n/a", "note": "display only"}
    try:
        jsre.compile_js(script.get("find") or "")
    except jsre.RegexError as e:
        return {"status": "skipped", "note": str(e)}
    return {"status": "ok", "note": ""}


def annotate(scripts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Scripts with a read-only `prompt_status` / `prompt_note` for the dashboard."""
    out = []
    for s in scripts:
        info = prompt_status(s)
        out.append({**s, "prompt_status": info["status"], "prompt_note": info["note"]})
    return out


def display_payload(preset: Dict[str, Any]) -> Dict[str, Any]:
    """What the userscript needs: the enabled display scripts and the two names."""
    scripts = [s for s in preset.get("regex_scripts") or [] if not s.get("disabled") and runs_on_display(s)]
    return {"name": preset.get("name"), "char_name": preset.get("char_name") or "", "user_name": preset.get("user_name") or "",
            "scripts": scripts}


# ------------------------------------------------------------------ running one script

_GROUP_REF = re.compile(r"\$(\d+)|\$<([^>]+)>")


def apply_script(script: Dict[str, Any], text: str, char_name: str = "", user_name: str = "") -> str:
    """The text after one script. A script that cannot run leaves the text as it was."""
    if script.get("disabled") or not text or not script.get("find"):
        return text
    scope = macros.Scope(char_name, user_name)
    find = script["find"]
    mode = script.get("substitute", 0)
    if mode in (1, 2):
        # {{char}} / {{user}} inside the pattern itself. Mode 2 escapes the substituted text.
        names = {"char": char_name, "user": user_name}
        find = re.sub(r"\{\{\s*(char|user)\s*\}\}",
                      lambda m: (re.sub(r"([.^$*+?{}\[\]\\/|()])", r"\\\1", names[m.group(1).lower()]) if mode == 2 else names[m.group(1).lower()]) or m.group(0),
                      find, flags=re.IGNORECASE)
    try:
        pattern, is_global = jsre.compile_js(find)
    except jsre.RegexError:
        return text
    template = macros.render(re.sub(r"\{\{match\}\}", "$0", script.get("replace") or "", flags=re.IGNORECASE), scope)
    trim = [macros.render(t, scope) for t in script.get("trim_strings") or [] if t]

    def replacement(match: "re.Match[str]") -> str:
        def group(m2: "re.Match[str]") -> str:
            if m2.group(1) is not None:
                n = int(m2.group(1))
                value = match.group(0) if n == 0 else (match.group(n) if n <= (pattern.groups or 0) else None)
            else:
                value = match.groupdict().get(m2.group(2))
            if not value:
                return ""
            for t in trim:
                value = value.replace(t, "")
            return value

        return _GROUP_REF.sub(group, template)

    try:
        return pattern.sub(replacement, text, count=0 if is_global else 1)
    except (re.error, RecursionError):
        return text


def _depth_allows(script: Dict[str, Any], depth: Optional[int]) -> bool:
    if depth is None:
        return True
    low, high = script.get("min_depth"), script.get("max_depth")
    if low is not None and low >= -1 and depth < low:
        return False
    if high is not None and high >= 0 and depth > high:
        return False
    return True


def run_scripts(text: str, scripts: List[Dict[str, Any]], placement: int, context: str,
                depth: Optional[int] = None, char_name: str = "", user_name: str = "") -> str:
    """Apply every script that fits (`context` is 'prompt' or 'display') in list order."""
    runs = runs_on_prompt if context == "prompt" else runs_on_display
    for script in scripts:
        if script.get("disabled") or not runs(script) or placement not in (script.get("placement") or []):
            continue
        if not _depth_allows(script, depth):
            continue
        text = apply_script(script, text, char_name, user_name)
    return text


# ------------------------------------------------------------------ the prompt-side pass

def apply_prompt(messages: List[Dict[str, Any]], preset: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Run the preset's prompt scripts over the chat messages (user and assistant, not the system card).
    Depth 0 is the newest message. A message a script empties completely is dropped."""
    scripts = [s for s in preset.get("regex_scripts") or [] if not s.get("disabled") and runs_on_prompt(s)]
    msgs = [dict(m) if isinstance(m, dict) else m for m in messages or []]
    if not scripts:
        return msgs
    chat = [i for i, m in enumerate(msgs) if isinstance(m, dict) and m.get("role") in ROLE_PLACEMENT]
    char_name, user_name = preset.get("char_name") or "", preset.get("user_name") or ""
    drop = set()
    for position, index in enumerate(chat):
        message = msgs[index]
        depth = len(chat) - 1 - position
        placement = ROLE_PLACEMENT[message["role"]]

        def run(text: str) -> str:
            if len(text) > MAX_TEXT_CHARS:
                return text
            return run_scripts(text, scripts, placement, "prompt", depth, char_name, user_name)

        content = message.get("content")
        if isinstance(content, str):
            new = run(content)
            if content.strip() and not new.strip():
                drop.add(index)
            message["content"] = new
        elif isinstance(content, list):
            parts = []
            for part in content:
                if isinstance(part, dict) and part.get("type") == "text" and isinstance(part.get("text"), str):
                    part = {**part, "text": run(part["text"])}
                parts.append(part)
            message["content"] = parts
    return [m for i, m in enumerate(msgs) if i not in drop]
