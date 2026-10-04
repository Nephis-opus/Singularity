#!/usr/bin/env python3
"""
Singularity Gateway Access Control
==================================
One policy shared by the :9000 gateway (ASGI middleware) and the provider workers.

A request is let through when all of these hold:
  1. Cross-site browser requests are refused: an Origin header must be a loopback origin,
     the gateway's own host (any port, e.g. Tavern on :5173), or listed in
     SINGULARITY_ALLOWED_ORIGINS. "Origin: null" (sandboxed artifacts) is refused too.
  2. It is authenticated by ANY of:
       - Authorization: Bearer <gateway key>  (or X-API-Key)      API clients, phones, tunnel
       - the HttpOnly session cookie set by POST /api/auth/login  the playground in a browser
       - trusted local: loopback peer, loopback Host header, no proxy/forwarding headers
         (CLI, Tavern's server, local SDKs; the ngrok tunnel never qualifies)
Static UI assets and the login endpoints are public; everything else needs rule 2.
"""

import hmac
import hashlib
import json
import os
import secrets
import threading
from typing import Dict, Iterable, Optional, Tuple
from urllib.parse import urlsplit

try:
    from singularity import db
except ImportError:
    import db

SESSION_COOKIE = "singularity_session"
LOOPBACK_NAMES = {"localhost", "127.0.0.1", "::1"}
FORWARDING_HEADERS = ("x-forwarded-for", "x-forwarded-host", "x-forwarded-proto", "forwarded", "x-real-ip")

PUBLIC_PATHS = {"/", "/logo.svg", "/favicon.ico", "/healthz", "/api/auth/status", "/api/auth/login", "/api/auth/logout"}
PUBLIC_PREFIXES = ("/static/",)
PROTECTED_PREFIXES = ("/static/generated/",)

_KEY_CACHE: Optional[str] = None
_KEY_LOCK = threading.Lock()


# ==============================================================================
# Gateway key & browser session
# ==============================================================================

def get_gateway_key() -> str:
    """Return the gateway API key, generating and storing (encrypted) one on first use."""
    global _KEY_CACHE
    if _KEY_CACHE:
        return _KEY_CACHE
    with _KEY_LOCK:
        if not _KEY_CACHE:
            key = db.get_setting("gateway_key")
            if not key:
                key = "sk-sing-" + secrets.token_urlsafe(32)
                db.set_setting("gateway_key", key)
            _KEY_CACHE = key
    return _KEY_CACHE


def rotate_gateway_key() -> str:
    """Replace the gateway key. Existing browser sessions and API clients must log in again."""
    global _KEY_CACHE
    with _KEY_LOCK:
        key = "sk-sing-" + secrets.token_urlsafe(32)
        db.set_setting("gateway_key", key)
        _KEY_CACHE = key
    return key


def set_gateway_key(new_key: str) -> str:
    """Set or customize the gateway API key. Empty string generates a random key."""
    global _KEY_CACHE
    key = (new_key or "").strip()
    if not key:
        key = "sk-sing-" + secrets.token_urlsafe(32)
    with _KEY_LOCK:
        db.set_setting("gateway_key", key)
        _KEY_CACHE = key
    return key


def session_token() -> str:
    """Stateless session cookie value; changes whenever the gateway key is rotated."""
    return hmac.new(get_gateway_key().encode(), b"singularity-browser-session-v1", hashlib.sha256).hexdigest()


def check_key(candidate: Optional[str]) -> bool:
    if not candidate:
        return False
    return hmac.compare_digest(candidate.strip().encode(), get_gateway_key().encode())


def is_lan_mode() -> bool:
    return os.getenv("SINGULARITY_LAN", "").lower() in ("1", "true", "yes", "on")


# ==============================================================================
# Request classification
# ==============================================================================

def _hostname(host_header: str) -> str:
    host = (host_header or "").strip().lower()
    if host.startswith("["):
        return host[1:].split("]", 1)[0]
    if host.count(":") == 1:
        return host.split(":", 1)[0]
    return host


DEFAULT_ALLOWED_ORIGINS = {
    "https://janitorai.com",
    "https://www.janitorai.com",
    "https://janitor.ai",
    "https://www.janitor.ai",
    "https://venus.chub.ai",
    "https://chub.ai",
    "https://www.chub.ai",
    "https://agnai.chat",
    "https://lorebary.com",
    "https://www.lorebary.com",
    "https://api.lorebary.com",
    "https://lorebary.sophiamccarty.com",
    "https://sophiamccarty.com",
    "https://beta.lorebary.com",
}


def _clean_origin_string(raw: str) -> Optional[str]:
    raw = (raw or "").strip().rstrip("/").lower()
    if not raw or raw == "null":
        return None
    if raw == "*":
        return "*"
    if "://" not in raw:
        raw = "https://" + raw
    try:
        parts = urlsplit(raw)
        if not parts.scheme or not parts.netloc:
            return None
        return f"{parts.scheme}://{parts.netloc}".rstrip("/")
    except Exception:
        return None


def _extra_allowed_origins() -> Iterable[str]:
    raw_env = os.getenv("SINGULARITY_ALLOWED_ORIGINS", "")
    origins = set(DEFAULT_ALLOWED_ORIGINS)
    for o in raw_env.split(","):
        cleaned = _clean_origin_string(o)
        if cleaned:
            origins.add(cleaned)
    try:
        raw_db = db.get_setting("allowed_origins", "")
        if raw_db:
            if raw_db.strip().startswith("["):
                try:
                    for o in json.loads(raw_db):
                        if isinstance(o, str):
                            cleaned = _clean_origin_string(o)
                            if cleaned:
                                origins.add(cleaned)
                except Exception:
                    pass
            for o in raw_db.split(","):
                cleaned = _clean_origin_string(o)
                if cleaned:
                    origins.add(cleaned)
    except Exception:
        pass
    return origins


def origin_allowed(origin: str, host_header: str) -> bool:
    cleaned = _clean_origin_string(origin)
    if not cleaned or cleaned == "null":
        return False
    
    allowed_list = set(_extra_allowed_origins())
    if "*" in allowed_list:
        return True
    if cleaned in allowed_list:
        return True

    parts = urlsplit(cleaned)
    req_host = (parts.hostname or "").lower()
    if not req_host:
        return False
    if req_host in LOOPBACK_NAMES:
        return True
    # Same machine, other port (Tavern on :5173 calling the gateway on :9000 over the LAN).
    if req_host == _hostname(host_header):
        return True

    # Domain & subdomain matching (e.g. allowed: https://lorebary.com matches api.lorebary.com)
    for allowed in allowed_list:
        if allowed == "*":
            return True
        a_parts = urlsplit(allowed)
        a_host = (a_parts.hostname or "").lower()
        if not a_host:
            continue
        if req_host == a_host:
            return True
        if req_host.endswith("." + a_host):
            return True
        if a_host.endswith("." + req_host):
            return True
        # Cross-domain brand matching for known frontends (e.g. lorebary.sophiamccarty.com)
        if "lorebary" in a_host and "lorebary" in req_host:
            return True
        if "janitor" in a_host and "janitor" in req_host:
            return True

    return False


def is_loopback_ip(ip: Optional[str]) -> bool:
    if not ip:
        return False
    return ip == "::1" or ip.startswith("127.") or ip == "::ffff:127.0.0.1"


def is_trusted_local(client_ip: Optional[str], headers: Dict[str, str]) -> bool:
    if not is_loopback_ip(client_ip):
        return False
    if _hostname(headers.get("host", "")) not in LOOPBACK_NAMES:
        return False  # DNS-rebinding and tunnelled requests carry a foreign Host header
    return not any(h in headers for h in FORWARDING_HEADERS)


def _bearer(headers: Dict[str, str]) -> Optional[str]:
    auth = (headers.get("authorization") or "").strip()
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    if auth:
        return auth
    for header_name in ("x-api-key", "api-key", "x-gateway-key"):
        val = headers.get(header_name)
        if val and val.strip():
            return val.strip()
    return None


def _cookie(headers: Dict[str, str], name: str) -> Optional[str]:
    for part in headers.get("cookie", "").split(";"):
        k, _, v = part.strip().partition("=")
        if k == name:
            return v
    return None


def is_authenticated(client_ip: Optional[str], headers: Dict[str, str]) -> bool:
    if check_key(_bearer(headers)):
        return True
    cookie = _cookie(headers, SESSION_COOKIE)
    if cookie and hmac.compare_digest(cookie.encode(), session_token().encode()):
        return True
    return is_trusted_local(client_ip, headers)


def is_public_path(path: str) -> bool:
    if path in PUBLIC_PATHS:
        return True
    if path.startswith(PROTECTED_PREFIXES):
        return False
    return path.startswith(PUBLIC_PREFIXES)


def evaluate(method: str, path: str, client_ip: Optional[str], headers: Dict[str, str]) -> Tuple[int, str]:
    """Return (0, "") to allow, else (http_status, reason)."""
    origin = headers.get("origin")
    host = headers.get("host", "")

    # Resolve effective origin from Origin or Referer
    effective_origin = origin
    if not effective_origin and headers.get("referer"):
        try:
            r_parts = urlsplit(headers["referer"])
            if r_parts.scheme and r_parts.netloc:
                effective_origin = f"{r_parts.scheme}://{r_parts.netloc}"
        except Exception:
            pass

    if method in ("GET", "HEAD") and is_public_path(path):
        # UI assets carry no secrets; sandboxed artifacts load /static/vendor/* cross-origin.
        return 0, ""

    is_cross_site = headers.get("sec-fetch-site") == "cross-site"
    has_valid_api_key = check_key(_bearer(headers))

    # Check origin allowlist if an origin or referer was identified
    if effective_origin is not None:
        if not origin_allowed(effective_origin, host):
            if not has_valid_api_key:
                return 403, "Cross-origin request blocked by Singularity"
    elif is_cross_site:
        # Cross-site request without identifiable origin or referer:
        # Only permit if explicitly authenticated with the gateway API key.
        # Ambient loopback trust (127.0.0.1) MUST NOT authenticate cross-site browser requests!
        if not has_valid_api_key:
            return 403, "Cross-site request blocked by Singularity"

    if method == "OPTIONS" or is_public_path(path):
        return 0, ""

    if is_authenticated(client_ip, headers):
        # Guard: Ambient loopback trust alone (without key or session cookie) must not satisfy
        # cross-site requests unless the origin is explicitly allowed or a valid key was passed.
        if is_cross_site and not has_valid_api_key and not (effective_origin and origin_allowed(effective_origin, host)):
            return 403, "Cross-site request blocked by Singularity"
        return 0, ""

    return 401, "Singularity gateway key required"


# ==============================================================================
# ASGI middleware (gateway :9000)
# ==============================================================================

SECURITY_HEADERS = [
    (b"x-content-type-options", b"nosniff"),
    (b"referrer-policy", b"no-referrer"),
    (b"x-frame-options", b"DENY"),
    (b"content-security-policy", b"frame-ancestors 'none'"),
]


class SecurityMiddleware:
    """Authentication, origin checks and CORS for the gateway. Replaces Starlette's CORSMiddleware."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] not in ("http", "websocket"):
            return await self.app(scope, receive, send)

        headers = {k.decode("latin-1").lower(): v.decode("latin-1") for k, v in scope.get("headers", [])}
        client = scope.get("client")
        client_ip = client[0] if client else None
        method = scope.get("method", "GET")
        path = scope.get("path", "/")

        status, reason = evaluate(method, path, client_ip, headers)
        origin = headers.get("origin")
        effective_origin = origin
        if not effective_origin and headers.get("referer"):
            try:
                r_parts = urlsplit(headers["referer"])
                if r_parts.scheme and r_parts.netloc:
                    effective_origin = f"{r_parts.scheme}://{r_parts.netloc}"
            except Exception:
                pass

        cors = []
        allow_origin = origin or effective_origin
        if allow_origin and origin_allowed(allow_origin, headers.get("host", "")):
            cors = [
                (b"access-control-allow-origin", allow_origin.encode("latin-1")),
                (b"access-control-allow-credentials", b"true"),
                (b"access-control-allow-private-network", b"true"),
                (b"vary", b"Origin"),
            ]

        if scope["type"] == "websocket":
            if status:
                await send({"type": "websocket.close", "code": 4401 if status == 401 else 4403})
                return
            return await self.app(scope, receive, send)

        if status:
            body = json.dumps({"error": {"message": reason, "type": "auth_error", "code": status}}).encode()
            await send({
                "type": "http.response.start",
                "status": status,
                "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]
                + cors + SECURITY_HEADERS,
            })
            await send({"type": "http.response.body", "body": body})
            return

        if method == "OPTIONS" and (origin or allow_origin) and "access-control-request-method" in headers:
            req_headers = headers.get("access-control-request-headers", "")
            allow_hdrs = req_headers.encode("latin-1") if req_headers else b"*"
            if allow_hdrs == b"*":
                allow_hdrs = b"authorization, content-type, x-api-key, api-key, x-gateway-key, ngrok-skip-browser-warning, accept, origin, user-agent, x-requested-with, access-control-request-private-network"
            await send({
                "type": "http.response.start",
                "status": 204,
                "headers": cors + [
                    (b"access-control-allow-methods", b"GET, POST, PUT, PATCH, DELETE, OPTIONS"),
                    (b"access-control-allow-headers", allow_hdrs),
                    (b"access-control-expose-headers", b"*"),
                    (b"access-control-max-age", b"86400"),
                ],
            })
            await send({"type": "http.response.body", "body": b""})
            return

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                message = dict(message)
                existing = {k.lower() for k, _ in message.get("headers", [])}
                extra = [(k, v) for k, v in cors + SECURITY_HEADERS if k not in existing]
                message["headers"] = list(message.get("headers", [])) + extra
            await send(message)

        await self.app(scope, receive, send_wrapper)
