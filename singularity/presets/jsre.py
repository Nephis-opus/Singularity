#!/usr/bin/env python3
"""
JavaScript regular expressions in Python
========================================
SillyTavern regex scripts are written for JavaScript (`/pattern/flags`). The gateway runs the ones that
rewrite the prompt, with Python's standard `re`, so a pattern is translated first. Whatever cannot be
translated faithfully is refused (`RegexError`) and that script is skipped, never run wrongly.

Translated: flags g i m s (u d v are accepted and ignored), `\\d \\w \\b \\B \\s`, `.` and `$` (JS line
terminators), `(?<name>...)` and `\\k<name>`, `\\u{...}`, `[^]`, `[]`, escapes Python reads differently.
Refused: `\\p{...}` properties, the sticky flag, and anything `re` itself rejects (for example a lookbehind
without a fixed width).

Python's matcher cannot be interrupted, so `is_risky()` refuses patterns whose shape allows catastrophic
backtracking (a repeated group that contains a repeat). Bounded repeats such as `[\\s\\S]{0,4096}` are fine.
"""

import re
from functools import lru_cache
from typing import Tuple

LINE_TERMINATORS = "\n\r  "
WORD = "A-Za-z0-9_"
JS_SPACE_EXTRA = "﻿"
MAX_PATTERN_CHARS = 8000


class RegexError(ValueError):
    """A pattern that cannot be used here. The message says why."""


def parse_find(find: str) -> Tuple[str, str]:
    """`/pattern/flags` -> (pattern, flags). Anything else is a bare pattern. Mirrors how SillyTavern reads it."""
    text = find if isinstance(find, str) else ""
    m = re.search(r"(/?)(.+)\1([a-z]*)", text, re.IGNORECASE)
    if not m:
        raise RegexError("empty pattern")
    flags = m.group(3)
    if flags and not re.match(r"^(?!.*?(.).*?\1)[gmixXsuUAJ]+$", flags):
        return text, ""  # not a flag list: the whole text is the pattern
    return m.group(2), flags


def _check_flags(flags: str) -> None:
    for f in flags:
        if f not in "gimsuyd v".replace(" ", ""):
            raise RegexError(f"the flag '{f}' does not exist in JavaScript")
    if "y" in flags:
        raise RegexError("the sticky flag (y) is not supported")


def translate(pattern: str, flags: str) -> str:
    """The same pattern as Python `re` syntax."""
    dotall, multiline = "s" in flags, "m" in flags
    out = []
    i, n = 0, len(pattern)
    in_class = False
    pending_dash_guard = False
    while i < n:
        c = pattern[i]
        if c == "\\":
            if i + 1 >= n:
                raise RegexError("pattern ends with a backslash")
            e = pattern[i + 1]
            i += 2
            pending_dash_guard = False
            if e in "dw":
                body = "0-9" if e == "d" else WORD
                out.append(body if in_class else f"[{body}]")
                pending_dash_guard = in_class
            elif e in "DW":
                if in_class:
                    raise RegexError(f"\\{e} inside a character class is not supported")
                out.append("[^0-9]" if e == "D" else f"[^{WORD}]")
            elif e == "s":
                out.append("\\s" + JS_SPACE_EXTRA if in_class else f"[\\s{JS_SPACE_EXTRA}]")
                pending_dash_guard = in_class
            elif e == "S":
                if in_class:
                    out.append("\\S")
                else:
                    out.append(f"[^\\s{JS_SPACE_EXTRA}]")
            elif e == "b":
                out.append("\\x08" if in_class else f"(?:(?<=[{WORD}])(?![{WORD}])|(?<![{WORD}])(?=[{WORD}]))")
            elif e == "B":
                if in_class:
                    raise RegexError("\\B inside a character class")
                out.append(f"(?:(?<=[{WORD}])(?=[{WORD}])|(?<![{WORD}])(?![{WORD}]))")
            elif e == "u":
                if i < n and pattern[i] == "{":
                    end = pattern.find("}", i)
                    hexa = pattern[i + 1:end] if end != -1 else ""
                    if end == -1 or not re.fullmatch(r"[0-9a-fA-F]{1,6}", hexa) or int(hexa, 16) > 0x10FFFF:
                        raise RegexError("bad \\u{...} escape")
                    out.append("\\U%08x" % int(hexa, 16))
                    i = end + 1
                else:
                    hexa = pattern[i:i + 4]
                    if not re.fullmatch(r"[0-9a-fA-F]{4}", hexa):
                        raise RegexError("bad \\u escape")
                    out.append("\\u" + hexa)
                    i += 4
            elif e == "k":
                m = re.match(r"<([A-Za-z_]\w*)>", pattern[i:])
                if not m:
                    raise RegexError("bad \\k<name> reference")
                out.append(f"(?P={m.group(1)})")
                i += m.end()
            elif e in "pP":
                raise RegexError("unicode property escapes (\\p{...}) are not supported")
            elif e == "c" and i < n and pattern[i].isalpha():
                out.append(re.escape(chr(ord(pattern[i]) % 32)))
                i += 1
            elif e in "fnrtv0":
                out.append("\\" + e)
            elif e == "x":
                hexa = pattern[i:i + 2]
                if not re.fullmatch(r"[0-9a-fA-F]{2}", hexa):
                    out.append("x")
                else:
                    out.append("\\x" + hexa)
                    i += 2
            elif e.isdigit():
                out.append("\\" + e)
            elif e.isalpha():
                out.append(re.escape(e))  # JavaScript reads an unknown letter escape as the letter itself
            else:
                out.append(re.escape(e))
            continue
        if in_class:
            if c == "]":
                in_class = False
                out.append("]")
            elif c == "[":
                out.append("\\[")
            elif c == "-" and pending_dash_guard and i + 1 < n and pattern[i + 1] != "]":
                out.append("\\-")
            elif c in "&|~":
                out.append("\\" + c)
            else:
                out.append(c)
            pending_dash_guard = False
            i += 1
            continue
        pending_dash_guard = False
        if c == "[":
            if pattern.startswith("[^]", i):
                out.append("[\\s\\S]")
                i += 3
                continue
            if pattern.startswith("[]", i):
                out.append("(?!)")
                i += 2
                continue
            in_class = True
            out.append("[")
            i += 1
            if i < n and pattern[i] == "^":
                out.append("^")
                i += 1
            continue
        if c == "(" and pattern.startswith("(?<", i) and i + 3 < n and pattern[i + 3] not in "=!":
            out.append("(?P<")
            i += 3
            continue
        if c == ".":
            out.append("." if dotall else f"[^{LINE_TERMINATORS}]")
            i += 1
            continue
        if c == "$" and not multiline:
            out.append("\\Z")
            i += 1
            continue
        out.append(c)
        i += 1
    if in_class:
        raise RegexError("unterminated character class")
    return "".join(out)


def is_risky(pattern: str) -> bool:
    """True when a repeated group contains another unbounded repeat (the shape of catastrophic backtracking)."""
    stack = [False]  # per open group: does it contain an unbounded repeat?
    i, n = 0, len(pattern)

    def quantifier(at: int):
        """(is_unbounded, length) of a quantifier starting at `at`, or (None, 0)."""
        if at >= n:
            return None, 0
        q = pattern[at]
        if q in "*+":
            length = 2 if at + 1 < n and pattern[at + 1] in "?+" else 1
            return True, length
        if q == "?":
            return False, 1
        m = re.match(r"\{(\d+)(,(\d*))?\}", pattern[at:])
        if m:
            unbounded = bool(m.group(2)) and m.group(3) == ""
            length = m.end() + (1 if at + m.end() < n and pattern[at + m.end()] == "?" else 0)
            return unbounded, length
        return None, 0

    while i < n:
        c = pattern[i]
        if c == "\\":
            i += 2
            unbounded, length = quantifier(i)
            if unbounded:
                stack[-1] = True
            i += length
            continue
        if c == "[":
            i += 1
            if i < n and pattern[i] == "^":
                i += 1
            while i < n and pattern[i] != "]":
                i += 2 if pattern[i] == "\\" else 1
            i += 1
            unbounded, length = quantifier(i)
            if unbounded:
                stack[-1] = True
            i += length
            continue
        if c == "(":
            stack.append(False)
            i += 1
            continue
        if c == ")":
            inner = stack.pop() if len(stack) > 1 else False
            i += 1
            unbounded, length = quantifier(i)
            if unbounded and inner:
                return True
            stack[-1] = stack[-1] or inner or bool(unbounded)
            i += length
            continue
        unbounded, length = quantifier(i + 1)
        if unbounded:
            stack[-1] = True
        i += 1 + length
    return False


@lru_cache(maxsize=512)
def compile_js(find: str) -> Tuple["re.Pattern[str]", bool]:
    """(compiled pattern, global?) for a `/pattern/flags` string. Raises RegexError."""
    if not isinstance(find, str) or not find.strip():
        raise RegexError("empty pattern")
    if len(find) > MAX_PATTERN_CHARS:
        raise RegexError("pattern is too long")
    pattern, flags = parse_find(find)
    _check_flags(flags)
    if is_risky(pattern):
        raise RegexError("pattern could backtrack catastrophically (a repeated group that contains a repeat)")
    py_flags = 0
    if "i" in flags:
        py_flags |= re.IGNORECASE
    if "m" in flags:
        py_flags |= re.MULTILINE
    if "s" in flags:
        py_flags |= re.DOTALL
    try:
        return re.compile(translate(pattern, flags), py_flags), "g" in flags
    except re.error as e:
        raise RegexError(f"Python cannot run this pattern: {e}")
    except (OverflowError, RecursionError):
        raise RegexError("pattern is too complex")
