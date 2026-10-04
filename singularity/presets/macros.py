#!/usr/bin/env python3
"""
Preset macros
=============
The `{{...}}` macros that SillyTavern presets use, for the ones that have real data behind them here:

  {{char}} {{user}} {{newline}} {{trim}} {{// comment}}
  {{setvar::name::value}} {{getvar::name}} {{addvar::name::n}} {{incvar::name}} {{decvar::name}}
  {{random::a::b::c}} {{roll::2d6+1}} {{lastUserMessage}} {{time}} {{date}} {{isotime}} {{isodate}}

Anything else (for example {{#if}}) is left in the text exactly as written, and `unsupported()` names it.

How a block is rendered, and why it is safe:
  - Macros are resolved in one left-to-right pass, innermost first, so `{{setvar::a::{{random::1::2}}}}`
    works and variables change in reading order.
  - Whatever a macro produces is never scanned again. A user's last message, a variable value or a name
    can therefore never be read as a macro, and an unknown macro cannot make anything loop.
  - Variables live in one `Scope` per request (the prompt stage makes it); nothing is stored between
    requests, and chat messages are never scanned.
"""

import random
import re
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Set

TRIM = "\ue012"  # stands in for {{trim}} until the whole block is rendered
_MACRO_RE = re.compile(r"\{\{([^{}]*)\}\}")
_ROLL_RE = re.compile(r"^\s*(\d{0,3})\s*d\s*(\d{1,4})\s*(?:([+-])\s*(\d{1,6}))?\s*$|^\s*(\d{1,4})\s*$", re.IGNORECASE)

MAX_OUTPUT_CHARS = 400_000

SUPPORTED = {
    "char", "user", "newline", "trim", "//", "setvar", "getvar", "addvar", "incvar", "decvar",
    "random", "roll", "lastusermessage", "time", "date", "isotime", "isodate",
}


def _name(body: str) -> str:
    body = body.strip()
    if body.startswith("//"):
        return "//"
    return re.split(r"::|:|\s", body, maxsplit=1)[0].lower()


def unsupported(text: str) -> Set[str]:
    """The macro names in `text` that render() leaves alone, written as `{{name}}`."""
    found = set()
    for m in _MACRO_RE.finditer(text or ""):
        name = _name(m.group(1))
        if name and name not in SUPPORTED:
            found.add("{{" + name + "}}")
    return found


class Scope:
    """What a macro can see during one request."""

    def __init__(self, char_name: str = "", user_name: str = "", last_user: str = "",
                 rng: Optional[random.Random] = None, now: Optional[Callable[[], datetime]] = None):
        self.char_name = char_name or ""
        self.user_name = user_name or ""
        self.last_user = last_user or ""
        self.vars: Dict[str, str] = {}
        self.rng = rng or random.Random()
        self.now = now or datetime.now


def _number(value: str) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _fmt(n: float) -> str:
    return str(int(n)) if float(n).is_integer() else str(n)


def _args(body: str) -> List[str]:
    """`name::a::b` -> ['a', 'b']; the legacy `name:a,b` form gives ['a,b'] and the caller splits it."""
    body = body.strip()
    if "::" in body:
        return body.split("::")[1:]
    if ":" in body:
        return [body.split(":", 1)[1]]
    return []


def _resolve(body: str, scope: Scope) -> Optional[str]:
    """The text a macro stands for, or None when it is not one we know (it is then left as written)."""
    name = _name(body)
    args = _args(body)
    if name == "//":
        return ""
    if name == "newline":
        return "\n"
    if name == "trim":
        return TRIM
    if name == "char":
        return scope.char_name or None
    if name == "user":
        return scope.user_name or None
    if name == "lastusermessage":
        return scope.last_user
    if name == "getvar":
        return scope.vars.get(args[0], "") if args else None
    if name == "setvar":
        if not args:
            return None
        scope.vars[args[0]] = "::".join(args[1:])
        return ""
    if name == "addvar":
        if len(args) < 2:
            return None
        old, add = scope.vars.get(args[0], ""), "::".join(args[1:])
        a, b = _number(old), _number(add)
        scope.vars[args[0]] = _fmt(a + b) if a is not None and b is not None else old + add
        return ""
    if name in ("incvar", "decvar"):
        if not args:
            return None
        old = _number(scope.vars.get(args[0], "0")) or 0
        scope.vars[args[0]] = _fmt(old + (1 if name == "incvar" else -1))
        return scope.vars[args[0]]
    if name == "random":
        choices = args if len(args) > 1 else (args[0].split(",") if args else [])
        choices = [c for c in choices]
        return scope.rng.choice(choices).strip() if choices else None
    if name == "roll":
        m = _ROLL_RE.match(args[0]) if args else None
        if not m:
            return None
        if m.group(5):
            sides = int(m.group(5))
            count, bonus = 1, 0
        else:
            count = int(m.group(1) or 1)
            sides = int(m.group(2))
            bonus = (int(m.group(4)) if m.group(3) == "+" else -int(m.group(4))) if m.group(4) else 0
        if not 1 <= count <= 100 or not 1 <= sides <= 1000:
            return None
        return str(sum(scope.rng.randint(1, sides) for _ in range(count)) + bonus)
    if name == "time":
        return f"{scope.now():%H:%M}"
    if name == "date":
        now = scope.now()
        return f"{now:%B} {now.day}, {now.year}"
    if name == "isotime":
        return f"{scope.now():%H:%M:%S}"
    if name == "isodate":
        return f"{scope.now():%Y-%m-%d}"
    return None


def render(text: str, scope: Scope) -> str:
    """Resolve the macros in one block of preset text.

    One left-to-right pass: a macro is resolved when its closing braces are reached, so inner macros run
    first and side effects (setvar) happen in reading order. What a macro produces is never scanned again."""
    if not text or "{{" not in text:
        return text or ""
    stack: List[List[str]] = [[]]
    for token in re.split(r"(\{\{|\}\})", text):
        if token == "{{":
            stack.append([])
        elif token == "}}" and len(stack) > 1:
            body = "".join(stack.pop())
            value = _resolve(body, scope)
            stack[-1].append(value if value is not None else "{{" + body + "}}")
        else:
            stack[-1].append(token)
    while len(stack) > 1:  # a "{{" that never closed is plain text
        inner = "".join(stack.pop())
        stack[-1].append("{{" + inner)
    out = "".join(stack[0])[:MAX_OUTPUT_CHARS]
    return re.sub(r"\n*" + TRIM + r"\n*", "", out)
