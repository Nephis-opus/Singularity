#!/usr/bin/env python3
"""
External provider connections: the checks and small helpers behind them.

A connection is a named OpenAI-compatible API (OpenAI, OpenRouter, DeepSeek, Groq, Ollama, LM Studio and so on):
a base URL, an API key kept encrypted, optional extra headers and a list of model ids. A request names a
connection's model as `connection/model` (for example `openrouter/deepseek/deepseek-r1`). The engine for it is
engines/openai_compat.py; this module is pure and has no I/O.
"""

import ipaddress
import re
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlsplit

NAME_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,29}$")
HEADER_RE = re.compile(r"^[A-Za-z0-9-]{1,60}$")
MAX_MODELS = 1000
MAX_MODEL_CHARS = 200
MAX_HEADERS = 10
MAX_KEY_CHARS = 1000

# Headers that carry credentials or control the transport: the key has its own field, the rest are ours.
FORBIDDEN_HEADERS = frozenset({
    "authorization", "proxy-authorization", "x-api-key", "api-key", "cookie", "host", "content-length", "content-type",
    "accept", "connection", "transfer-encoding", "upgrade", "te",
})
BLOCKED_HOSTS = frozenset({"metadata.google.internal", "metadata", "169.254.169.254", "100.100.100.200"})

# Request fields forwarded to the provider. Everything else a client sends (thinking switches, dashboard fields,
# tools) stays on the gateway.
FORWARDED_PARAMS = ("temperature", "top_p", "max_tokens", "stop", "presence_penalty", "frequency_penalty", "seed",
                    "reasoning_effort", "response_format", "logit_bias", "n", "user")


class ConnectionConfigError(ValueError):
    """A connection that cannot be saved. The message is meant for the person editing it."""


def host_is_private(host: str) -> bool:
    """True for localhost, private or link-local addresses, `.local` names and one-word LAN names."""
    host = (host or "").strip().lower().strip("[]")
    if not host:
        return False
    if host == "localhost" or host.endswith(".localhost") or host.endswith(".local"):
        return True
    try:
        ip = ipaddress.ip_address(host)
        return ip.is_private or ip.is_loopback or ip.is_link_local
    except ValueError:
        return "." not in host   # a bare LAN name such as `ollama-box`


def check_base_url(url: Any) -> str:
    """Return the URL without a trailing slash, or raise. Plain http is allowed only for local and LAN hosts, so a
    key never crosses the internet unencrypted."""
    if not isinstance(url, str) or not url.strip():
        raise ConnectionConfigError("base_url is required, for example https://openrouter.ai/api/v1")
    url = url.strip()
    if len(url) > 500:
        raise ConnectionConfigError("base_url is too long")
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise ConnectionConfigError("base_url must start with http:// or https://")
    if parts.username or parts.password:
        raise ConnectionConfigError("Put the key in the key field, not in the address")
    if parts.query or parts.fragment:
        raise ConnectionConfigError("base_url must not have a ? or # part")
    host = parts.hostname.lower()
    if host in BLOCKED_HOSTS:
        raise ConnectionConfigError("That address is a cloud metadata service, not an AI provider")
    if parts.scheme == "http" and not host_is_private(host):
        raise ConnectionConfigError("Use https:// for a provider on the internet (plain http is only for localhost and your own network)")
    return url.rstrip("/")


def _headers(raw: Any) -> Dict[str, str]:
    if raw in (None, ""):
        return {}
    if not isinstance(raw, dict) or len(raw) > MAX_HEADERS:
        raise ConnectionConfigError(f"headers must be an object with at most {MAX_HEADERS} entries")
    out = {}
    for k, v in raw.items():
        if not isinstance(k, str) or not HEADER_RE.match(k) or not isinstance(v, str) or len(v) > 300 or "\n" in v or "\r" in v:
            raise ConnectionConfigError("a header has a bad name or value")
        if k.lower() in FORBIDDEN_HEADERS:
            raise ConnectionConfigError(f"The {k} header cannot be set here. Use the key field for credentials")
        out[k] = v
    return out


def clean_models(raw: Any) -> List[str]:
    if raw in (None, ""):
        return []
    if not isinstance(raw, list) or not all(isinstance(m, str) for m in raw):
        raise ConnectionConfigError("models must be a list of model ids")
    out: List[str] = []
    for m in raw:
        m = m.strip()
        if not m:
            continue
        if len(m) > MAX_MODEL_CHARS or any(ch in m for ch in "\r\n\t @"):
            raise ConnectionConfigError(f"'{m[:40]}' is not a usable model id (no spaces or @)")
        if m not in out:
            out.append(m)
    if len(out) > MAX_MODELS:
        out = out[:MAX_MODELS]
    return out


def clean_connection(data: Any, partial: bool = False) -> Dict[str, Any]:
    """Validate a connection body. With `partial` only the fields that were sent come back (for updates).
    `api_key` is returned only when it was sent: leaving it out keeps the stored key."""
    if not isinstance(data, dict):
        raise ConnectionConfigError("The connection must be an object")
    allowed = {"name", "base_url", "api_key", "requires_key", "headers", "models", "enabled"}
    unknown = sorted(k for k in data if k not in allowed)
    if unknown:
        raise ConnectionConfigError(f"Unknown field: {', '.join(unknown)}")
    out: Dict[str, Any] = {}
    if "name" in data or not partial:
        name = data.get("name")
        if not isinstance(name, str) or not NAME_RE.match(name.strip().lower()):
            raise ConnectionConfigError("name must be 1 to 30 characters: letters, numbers, - and _")
        out["name"] = name.strip().lower()
    if "base_url" in data or not partial:
        out["base_url"] = check_base_url(data.get("base_url"))
    if "api_key" in data:
        key = data.get("api_key")
        if key is not None and not isinstance(key, str):
            raise ConnectionConfigError("api_key must be text")
        key = (key or "").strip()
        if len(key) > MAX_KEY_CHARS or any(ch in key for ch in "\r\n"):
            raise ConnectionConfigError("That does not look like an API key")
        out["api_key"] = key
    for flag in ("requires_key", "enabled"):
        if flag in data or not partial:
            value = data.get(flag, True)
            if not isinstance(value, bool):
                raise ConnectionConfigError(f"{flag} must be true or false")
            out[flag] = value
    if "headers" in data or not partial:
        out["headers"] = _headers(data.get("headers"))
    if "models" in data or not partial:
        out["models"] = clean_models(data.get("models"))
    return out


def split_model(model: Any, names: List[str]) -> Optional[Tuple[str, str]]:
    """`openrouter/deepseek/deepseek-r1` -> (`openrouter`, `deepseek/deepseek-r1`) when `openrouter` is a known connection."""
    if not isinstance(model, str) or "/" not in model:
        return None
    prefix, _, rest = model.partition("/")
    prefix = prefix.strip().lower()
    if prefix in names and rest.strip():
        return prefix, rest.strip()
    return None


def parse_models(payload: Any) -> List[str]:
    """Model ids from a `GET /models` answer: OpenAI's {"data": [{"id": ...}]}, a bare list, or Ollama's {"models": [{"name": ...}]}."""
    rows: Any = payload
    if isinstance(payload, dict):
        rows = payload.get("data") if isinstance(payload.get("data"), list) else payload.get("models")
    ids: List[str] = []
    for row in rows if isinstance(rows, list) else []:
        mid = row if isinstance(row, str) else (row.get("id") or row.get("name") or row.get("model")) if isinstance(row, dict) else None
        if isinstance(mid, str) and mid.strip() and not any(ch in mid for ch in "\r\n\t @") and len(mid) <= MAX_MODEL_CHARS and mid not in ids:
            ids.append(mid.strip())
    return ids[:MAX_MODELS]


def redact(text: Any, secrets: List[str]) -> str:
    """Remove any secret (the key, and Bearer tokens) from text that may be shown to a person or logged."""
    out = str(text or "")
    for s in secrets:
        if s and len(s) >= 6:
            out = out.replace(s, "***")
    return re.sub(r"(?i)(bearer\s+)[A-Za-z0-9._~+/=-]{8,}", r"\1***", out)
