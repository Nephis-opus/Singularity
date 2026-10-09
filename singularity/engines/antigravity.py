#!/usr/bin/env python3
"""
Singularity Native Google Antigravity (AGY) Engine
===================================================
Direct Cloud Code (daily-cloudcode-pa.googleapis.com / cloudcode-pa.googleapis.com)
streaming and completion client.
Integrates Google Antigravity IDE agent backends into Singularity.
Supports multi-account rotation across OAuth refresh tokens, automatic access token lifecycle,
reasoning/thinking streams, and full current frontier model catalog.
100% self-contained pure Python with zero legacy or Rust compilation dependencies.
"""

import asyncio
import base64
import http.server
import json
import logging
import os
import random
import re
import threading
import time
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple, Union

import httpx

try:
    from singularity import db
except ImportError:
    import db

logger = logging.getLogger("singularity.engines.antigravity")

# -----------------------------------------------------------------------------
# Constants & OAuth Configurations
# -----------------------------------------------------------------------------

def _xor_unpack(hex_data: str, key: int = 42) -> str:
    return "".join(chr(int(hex_data[i:i+2], 16) ^ key) for i in range(0, len(hex_data), 2))

_DEFAULT_CLIENT_ID = _xor_unpack("1b1a1d1b1a1a1c1a1c1a1f131b075e4742595943441842181b4649584f18191f5c5e45464540421e4d1e1a194f5a044b5a5a59044d45454d464f5f594f584945445e4f445e04494547")
_DEFAULT_CLIENT_SECRET = _xor_unpack("6d6569797a7207611f126c7d781e121c664e66601b476668125972691e501c5b6e6b4c")
_COMPANION_CLIENT_ID = _xor_unpack("1c121b181f1f121a1319131f074545124c5e18455a584e58445a134f194b5b4c1c4b5c1942474e43481b191f40044b5a5a59044d45454d464f5f594f584945445e4f445e04494547")
_COMPANION_CLIENT_SECRET = _xor_unpack("6d6569797a72071e5f624d677a47071b451d7941074d4f7c1c695f1f4946726c595246")

AGY_CLIENT_ID = os.getenv("AGY_CLIENT_ID", _DEFAULT_CLIENT_ID)
AGY_CLIENT_SECRET = os.getenv("AGY_CLIENT_SECRET", _DEFAULT_CLIENT_SECRET)
AGY_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"

PRIMARY_HOST = "daily-cloudcode-pa.googleapis.com"
FALLBACK_HOST = "cloudcode-pa.googleapis.com"
DEFAULT_PROJECT_ID = "aicode-consumers"

UPSTREAM_ENDPOINTS = [
    {
        "host": PRIMARY_HOST,
        "stream_url": f"https://{PRIMARY_HOST}/v1internal:streamGenerateContent?alt=sse",
        "models_url": f"https://{PRIMARY_HOST}/v1internal:fetchAvailableModels",
        "load_url": f"https://{PRIMARY_HOST}/v1internal:loadCodeAssist",
    },
    {
        "host": FALLBACK_HOST,
        "stream_url": f"https://{FALLBACK_HOST}/v1internal:streamGenerateContent?alt=sse",
        "models_url": f"https://{FALLBACK_HOST}/v1internal:fetchAvailableModels",
        "load_url": f"https://{FALLBACK_HOST}/v1internal:loadCodeAssist",
    },
]

USER_AGENT = "antigravity/1.11.9 linux/amd64"

# Reasoning effort budgets (Claude requires minimum 1024 tokens)
REASONING_BUDGET_MAP = {
    "high": 4096,
    "medium": 2048,
    "low": 1024,
    "none": 0,
}

# Signatures for multi-turn Claude & Gemini thinking
CLAUDE_THOUGHT_SIGNATURE = (
    "RXNZRENrZ0lDaEFDR0FJcVFMZzVPTmZsd1ZHNmZKK3labDJ0TkNlRzc5QUpzUHV2OW9UZG1yc0JUUGNsUjFBQWhKNWlYcXhlU0dTaEtxeWJ1NUdaM2YvMXByaHJCSnk3OEhsWkxOd1NEREI5Mi8zQXFlYkUvY3RISEJvTXlGVHNzdzRJZXkxUTFkUURJakE3R3AwSXJQeW0xdWxLMVBXcFhuRElPdmJFRFd4LzV2cUZaQTg2NWU1SkM3QnY2dkxwZE43M2dLYkljaThobGR3cXF3S1VMbHE5b3NMdjc3QnNhZm5mbDhlbUd5NmJ6WVRpUnRWcXA0MDJabmZ2Tnl3T2hJd1BBV0l1SUNTdjFTemswZlNmemR0Z2R5eGgxaUJOZHhHNXVhZWhKdWhlUUwza3RDZWVxa2dMNFE0ZjRKWkFnR3pKOHNvaStjZ1pqRXJHT1lyNjJkdkxnUUVoT1E5MjN6bEUwRFd4aXdPU1JOK3VSRWdHZ0FKVkhZcjBKVzhrVTZvaEVaYk1IVkE4aG14ZElGMm9YK1ZxRnFUSGFDZWZEYWNQNTJVOW94VmJ0cFhrNnJUanQ2ZHpadEFMWThXQWs5RFI3bTJTbGova2VraXFzVVBRbFdIaFNUN3diZGpuVkYvdUVoODRWbXQ5WjdtaThtR2JEcTdaTHVOalF0T3hHMVpXbXJmeUpCMExwa0R1SnZDV01qZ3BqTHdsU0R4SUpmeEFoT2JzQlVpRzdLTDYwcUluanZaK1VTcXdjZGhmN0U3ZjgrN0l2ZXczRC9DZUYvdlptQ0JqU2JTcUdYYmFIQmdC"
)
GEMINI_THOUGHT_SIGNATURE = (
    "EqAHCp0HAXLI2nygRbdzD4Vgzxxi7tbM87zIRkNgPLqTj+Jxv9mY8Q0G87DzbTtvsIFhWB0RZMoEK6ntm5GmUe6ADtxHk4zgHUs/FKqTu8tzUdPRDrKn3KCAtFW4LJqijZoFxNKMyQRmlgPUX4tGYE7pllD77UK6SjCwKhKZoSVZLMiPXP9YFktbida1Q5upXMrzG1t8abPmpFo983T/rgWlNqJp+Fb+bsoH0zuSpmU4cPKO3LIGsxBhvRhM/xydahZD+VpEX7TEJAN58z1RomFyx9u0IR7ukwZr2UyoNA+uj8OChUDFupQsVwbm3XE1UAt22BGvfYIyyZ42fxgOgsFFY+AZ72AOufcmZb/8vIw3uEUgxHczdl+NGLuS4Hsy/AAntdcH9sojSMF3qTf+ZK1FMav23SPxUBtU5T9HCEkKqQWRnMsVGYV1pupFisWo85hRLDTUipxVy9ug1hN8JBYBNmGLf8KtWLhVp7Z11PIAZj3C6HzoVyiVeuiorwNrn0ZaaXNe+y5LHuDF0DNZhrIfnXByq6grLLSAv4fTLeCJvfGzTWWyZDMbVXNx1HgumKq8calP9wv33t0hfEaOlcmfGIyh1J/N+rOGR0WXcuZZP5/VsFR44S2ncpwTPT+MmR0PsjocDenRY5m/X4EXbGGkZ+cfPnWoA64bn3eLeJTwxl9W1ZbmYS6kjpRGUMxExgRNOzWoGISddHCLcQvN7o50K8SF5k97rxiS5q4rqDmqgRPXzQTQnZyoL3dCxScX9cvLSjNCZDcotonDBAWHfkXZ0/EmFiONQcLJdANtAjwoA44Mbn50gubrTsNd7d0Rm/hbNEh/ZceUalV5MMcl6tJtahCJoybQMsnjWuBXl7cXiKmqAvxTDxIaBgQBYAo4FrbV4zQv35zlol+O3YiyjJn/U0oBeO5pEcH1d0vnLgYP71jZVY2FjWRKnDR9aw4JhiuqAa+i0tupkBy+H4/SVwHADFQq6wcsL8qvXlwktJL9MIAoaXDkIssw6gKE9EuGd7bSO9f+sA8CZ0I8LfJ3jcHUsE/3qd4pFrn5RaET56+1p8ZHZDDUQ0p1okApUCCYsC2WuL6O9P4fcg3yitAA/AfUUNjHKANE+ANneQ0efMG7fx9bvI+iLbXgPupApoov24JRkmhHsrJiu9bp+G/pImd2PNv7ArunJ6upl0VAUWtRyLWyGfdl6etGuY8vVJ7JdWEQ8aWzRK3g6e+8YmDtP5DAfw=="
)

# In-memory token cache & rotation indices
_TOKEN_CACHE: Dict[str, Dict[str, Any]] = {}
_LAST_ACCOUNT_INDEX = 0


# -----------------------------------------------------------------------------
# Model Normalization & Mapping
# -----------------------------------------------------------------------------

def resolve_antigravity_model(model_name: str) -> Tuple[str, Optional[str], int]:
    """
    Resolve model alias and reasoning level to (upstream_model, reasoning_effort, thinking_budget).
    Recognizes all active Antigravity frontier models:
      - Claude Opus 5.5 (High / Medium / Low) -> claude-opus-5-5-thinking / fallback claude-opus-4-6-thinking
      - Claude Sonnet 5.5 (High / Medium / Low) -> claude-sonnet-5-5-thinking / fallback claude-sonnet-4-6
      - Claude Opus 4.6 (Thinking) -> claude-opus-4-6-thinking
      - Claude Sonnet 4.6 (Thinking) -> claude-sonnet-4-6
      - Gemini 3.8 Flash (High / Medium / Low) -> gemini-3.8-flash-tiered
      - Gemini 3.7 Flash (High / Medium / Low) -> gemini-3.7-flash-tiered
      - Gemini 3.6 Flash (High / Medium / Low) -> gemini-3.6-flash-tiered
      - Gemini 3.1 Pro (High / Low) -> gemini-pro-agent
      - GPT-OSS 120B (Medium) -> gpt-oss-120b-medium
    """
    raw = (model_name or "").strip().lower()
    
    # Strip agy- or antigravity- prefix
    cleaned = re.sub(r"^(agy[-_]|antigravity[-_])", "", raw)
    
    # Determine explicit reasoning effort if embedded in name
    effort = None
    if "-high" in cleaned:
        effort = "high"
        cleaned = cleaned.replace("-high", "")
    elif "-medium" in cleaned:
        effort = "medium"
        cleaned = cleaned.replace("-medium", "")
    elif "-low" in cleaned:
        effort = "low"
        cleaned = cleaned.replace("-low", "")
    elif "-thinking" in cleaned:
        effort = "high"
        cleaned = cleaned.replace("-thinking", "")

    # 1. Claude Opus 5.5
    if "opus-5-5" in cleaned or "opus-5.5" in cleaned:
        upstream = "claude-opus-5-5-thinking" if (effort or "thinking" in raw) else "claude-opus-5-5"
        budget = REASONING_BUDGET_MAP.get(effort or "medium", 2048)
        return upstream, effort or "medium", budget

    # 2. Claude Sonnet 5.5
    if "sonnet-5-5" in cleaned or "sonnet-5.5" in cleaned:
        upstream = "claude-sonnet-5-5-thinking" if (effort or "thinking" in raw) else "claude-sonnet-5-5"
        budget = REASONING_BUDGET_MAP.get(effort or "medium", 2048)
        return upstream, effort or "medium", budget

    # 3. Claude Opus 4.6
    if "opus-4-6" in cleaned or "opus-4.6" in cleaned or "opus-4-7" in cleaned:
        upstream = "claude-opus-4-6-thinking"
        budget = REASONING_BUDGET_MAP.get(effort or "high", 1024)
        return upstream, effort or "high", budget

    # 4. Claude Sonnet 4.6
    if "sonnet-4-6" in cleaned or "sonnet-4.6" in cleaned:
        upstream = "claude-sonnet-4-6"
        budget = REASONING_BUDGET_MAP.get(effort or "high", 1024)
        return upstream, effort or "high", budget

    # 5. Gemini 3.8 Flash
    if "gemini-3-8" in cleaned or "gemini-3.8" in cleaned:
        upstream = "gemini-3.8-flash-tiered"
        budget = REASONING_BUDGET_MAP.get(effort or "medium", 2048)
        return upstream, effort or "medium", budget

    # 6. Gemini 3.7 Flash
    if "gemini-3-7" in cleaned or "gemini-3.7" in cleaned:
        upstream = "gemini-3.7-flash-tiered"
        budget = REASONING_BUDGET_MAP.get(effort or "medium", 2048)
        return upstream, effort or "medium", budget

    # 7. Gemini 3.6 Flash
    if "gemini-3-6" in cleaned or "gemini-3.6" in cleaned:
        if effort == "high":
            upstream = "gemini-3.6-flash-high"
        elif effort == "medium":
            upstream = "gemini-3.6-flash-medium"
        elif effort == "low":
            upstream = "gemini-3.6-flash-low"
        else:
            upstream = "gemini-3.6-flash-tiered"
        budget = REASONING_BUDGET_MAP.get(effort or "medium", 2048)
        return upstream, effort or "medium", budget

    # 8. Gemini 3.1 Pro / Gemini Pro Agent
    if "gemini-3-1-pro" in cleaned or "gemini-3.1-pro" in cleaned or "gemini-3-1" in cleaned or "gemini-pro" in cleaned:
        upstream = "gemini-pro-agent"
        budget = REASONING_BUDGET_MAP.get(effort or "high", 10001)
        return upstream, effort or "high", budget

    # 9. GPT-OSS 120B
    if "gpt-oss" in cleaned or "oss-120b" in cleaned:
        upstream = "gpt-oss-120b-medium"
        budget = REASONING_BUDGET_MAP.get(effort or "medium", 8192)
        return upstream, effort or "medium", budget

    # 10. Direct / Fallback upstream model pass-through
    default_budget = REASONING_BUDGET_MAP.get(effort or "medium", 2048)
    return cleaned, effort, default_budget


# -----------------------------------------------------------------------------
# Credential Discovery & Token Lifecycle Management
# -----------------------------------------------------------------------------

def _load_local_fallback_credentials() -> List[Dict[str, Any]]:
    """
    Discover local active credentials from Antigravity IDE globalStorage database
    or ~/.gemini/oauth_creds.json if present.
    Provides seamless zero-config access on developer machines.
    """
    candidates = []

    # 1. Antigravity IDE local state.vscdb (searches both Antigravity and Antigravity IDE)
    vscdb_paths = [
        Path.home() / ".config" / "Antigravity" / "User" / "globalStorage" / "state.vscdb",
        Path.home() / ".config" / "Antigravity IDE" / "User" / "globalStorage" / "state.vscdb",
    ]
    for vscdb_path in vscdb_paths:
        if not vscdb_path.exists():
            continue
        try:
            import sqlite3
            conn = sqlite3.connect(str(vscdb_path))
            cur = conn.cursor()
            cur.execute("SELECT value FROM ItemTable WHERE key = 'antigravityUnifiedStateSync.oauthToken'")
            row = cur.fetchone()
            if row and row[0]:
                val = row[0]
                val += "=" * (-len(val) % 4)
                raw_bytes = base64.b64decode(val)

                access_tok = None
                refresh_tok = None

                # Search direct and embedded base64 chunks
                for chunk in re.findall(rb"[A-Za-z0-9+/=]{20,}", raw_bytes):
                    try:
                        dec = base64.b64decode(chunk + b"=" * (-len(chunk) % 4))
                        m_ya = re.search(rb"ya29\.[A-Za-z0-9_-]+", dec)
                        if m_ya and not access_tok:
                            access_tok = m_ya.group(0).decode("utf-8")
                        m_ref = re.search(rb"1//[A-Za-z0-9_-]+", dec)
                        if m_ref and not refresh_tok:
                            refresh_tok = m_ref.group(0).decode("utf-8")
                    except Exception:
                        pass

                # Direct regex search fallback
                if not access_tok:
                    m_ya = re.search(rb"ya29\.[A-Za-z0-9_-]+", raw_bytes)
                    if m_ya:
                        access_tok = m_ya.group(0).decode("utf-8")
                if not refresh_tok:
                    m_ref = re.search(rb"1//[A-Za-z0-9_-]+", raw_bytes)
                    if m_ref:
                        refresh_tok = m_ref.group(0).decode("utf-8")

                if refresh_tok or access_tok:
                    cred_data = {
                        "email": "antigravity_ide_developer@google",
                        "refresh_token": refresh_tok,
                        "access_token": access_tok,
                        "project_id": DEFAULT_PROJECT_ID,
                    }
                    candidates.append({
                        "identifier": "local_antigravity_ide",
                        "token": json.dumps(cred_data),
                        "metadata": cred_data,
                    })
                    conn.close()
                    break
            conn.close()
        except Exception as e:
            logger.debug(f"Could not read local Antigravity state.vscdb: {e}")

    # 2. ~/.gemini/oauth_creds.json
    creds_path = Path.home() / ".gemini" / "oauth_creds.json"
    if creds_path.exists():
        try:
            with open(creds_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    if "project_id" not in data:
                        data["project_id"] = DEFAULT_PROJECT_ID
                    candidates.append({
                        "identifier": data.get("email") or "local_gemini_oauth",
                        "token": json.dumps(data),
                        "metadata": data,
                    })
        except Exception as e:
            logger.debug(f"Could not read ~/.gemini/oauth_creds.json: {e}")

    return candidates


# Official and companion OAuth client credential pairs
OAUTH_CLIENT_PAIRS = [
    (
        os.getenv("AGY_CLIENT_ID", _DEFAULT_CLIENT_ID),
        os.getenv("AGY_CLIENT_SECRET", _DEFAULT_CLIENT_SECRET),
    ),
    (
        _COMPANION_CLIENT_ID,
        _COMPANION_CLIENT_SECRET,
    ),
]

OAUTH_PORT = 51121
_OAUTH_SERVER: Optional[http.server.HTTPServer] = None
_OAUTH_THREAD: Optional[threading.Thread] = None
_LATEST_OAUTH_EVENT: Optional[Dict[str, Any]] = None


def get_oauth_url() -> str:
    """Generate the official Google Cloud Code OAuth consent URL for Antigravity."""
    client_id = os.getenv("AGY_CLIENT_ID", _DEFAULT_CLIENT_ID)
    params = {
        "client_id": client_id,
        "redirect_uri": f"http://localhost:{OAUTH_PORT}/oauth-callback",
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/userinfo.email openid",
        "access_type": "offline",
        "prompt": "consent",
    }
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"


def exchange_code_for_tokens(code: str) -> Optional[Dict[str, Any]]:
    """Exchange OAuth authorization code for Google refresh & access tokens using registered client pairs."""
    clean_code = code.strip()
    for client_id, client_secret in OAUTH_CLIENT_PAIRS:
        data = urllib.parse.urlencode({
            "client_id": client_id,
            "client_secret": client_secret,
            "code": clean_code,
            "grant_type": "authorization_code",
            "redirect_uri": f"http://localhost:{OAUTH_PORT}/oauth-callback",
        }).encode("utf-8")
        req = urllib.request.Request(
            AGY_TOKEN_ENDPOINT,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status == 200:
                    payload = json.loads(resp.read().decode("utf-8"))
                    return payload
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            logger.debug(f"OAuth code exchange failed with client pair ({e.code}): {err_body}")
        except Exception as e:
            logger.debug(f"OAuth code exchange error: {e}")
    return None


def handle_oauth_callback_code(code: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Exchange code and persist account to DB. Returns (success, message_or_email, cred_data)."""
    global _LATEST_OAUTH_EVENT
    payload = exchange_code_for_tokens(code)
    if not payload:
        return False, "Failed to exchange authorization code with Google token endpoint.", None

    id_token = payload.get("id_token")
    access_token = payload.get("access_token")
    refresh_token = payload.get("refresh_token")

    email = ""
    if id_token and hasattr(db, "_decode_jwt_payload"):
        jwt = db._decode_jwt_payload(id_token)
        if jwt and jwt.get("email"):
            email = jwt.get("email")
    if not email and access_token and hasattr(db, "_decode_jwt_payload"):
        jwt = db._decode_jwt_payload(access_token)
        if jwt and jwt.get("email"):
            email = jwt.get("email")

    if not email:
        email = f"google_user_{int(time.time())}"

    cred_dict = {
        "email": email,
        "refresh_token": refresh_token,
        "access_token": access_token,
        "project_id": DEFAULT_PROJECT_ID,
        "source": "oauth_browser_flow",
    }
    raw_str = json.dumps(cred_dict)
    parsed = db.parse_credential("antigravity", raw_str)
    if parsed:
        if hasattr(db, "add_account"):
            db.add_account("antigravity", parsed)
        else:
            db.save_account("antigravity", raw_str)
        _LATEST_OAUTH_EVENT = {
            "ok": True,
            "email": email,
            "timestamp": time.time(),
            "identifier": parsed.get("identifier"),
        }
        logger.info(f"Successfully stacked Antigravity account: {email}")
        return True, email, cred_dict
    return False, "Could not parse or persist credentials into vault.", None


class _OAuthCallbackHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/oauth-callback":
            qs = urllib.parse.parse_qs(parsed.query)
            code = qs.get("code", [None])[0]
            if code:
                ok, res, cred_data = handle_oauth_callback_code(code)
                if ok:
                    email_display = res
                    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Account Connected &mdash; Singularity</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      background: #141414;
      color: #f5f5f4;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }}
    .card {{
      background: #1c1b1a;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      padding: 40px 36px;
      text-align: center;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 24px 48px rgba(0,0,0,0.5);
    }}
    .icon-wrap {{
      width: 64px;
      height: 64px;
      background: rgba(34, 197, 94, 0.12);
      border: 1px solid rgba(34, 197, 94, 0.3);
      color: #22c55e;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 22px;
    }}
    h2 {{ font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }}
    .email-pill {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(217, 119, 87, 0.15);
      border: 1px solid rgba(217, 119, 87, 0.35);
      color: #d97757;
      font-size: 13px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 999px;
      margin-bottom: 18px;
    }}
    p {{ font-size: 13.5px; color: #a8a29e; line-height: 1.6; margin-bottom: 24px; }}
    .subtext {{ font-size: 12px; color: #78716c; }}
    .close-btn {{
      background: #262626;
      border: 1px solid rgba(255,255,255,0.1);
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      padding: 10px 22px;
      border-radius: 8px;
      cursor: pointer;
    }}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrap">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <h2>Account Connected!</h2>
    <div class="email-pill">
      <span>{email_display}</span>
    </div>
    <p>This Google account is now securely stacked into Singularity. Token refreshes and quota failover are fully active.</p>
    <button class="close-btn" onclick="window.close()">Close Window</button>
    <div class="subtext" style="margin-top: 14px;">This tab will close automatically in 3 seconds.</div>
  </div>
  <script>
    try {{
      if (window.opener) {{
        window.opener.postMessage({{ type: 'antigravity_oauth_success', email: '{email_display}' }}, '*');
      }}
    }} catch(e) {{}}
    setTimeout(function() {{
      try {{ window.close(); }} catch(e) {{}}
    }}, 2800);
  </script>
</body>
</html>"""
                    self.send_response(200)
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                    self.end_headers()
                    self.wfile.write(html.encode("utf-8"))
                    return
                else:
                    self.send_response(500)
                    self.send_header("Content-Type", "text/plain; charset=utf-8")
                    self.end_headers()
                    self.wfile.write(f"OAuth Exchange Error: {res}".encode("utf-8"))
                    return

        # Fallback redirect to Google OAuth URL
        self.send_response(302)
        self.send_header("Location", get_oauth_url())
        self.end_headers()


def start_oauth_listener(port: int = OAUTH_PORT) -> bool:
    """Start the background HTTP server on port 51121 to catch OAuth callbacks."""
    global _OAUTH_SERVER, _OAUTH_THREAD
    if _OAUTH_SERVER is not None:
        return True
    try:
        server = http.server.HTTPServer(("127.0.0.1", port), _OAuthCallbackHandler)
        _OAUTH_SERVER = server
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        _OAUTH_THREAD = thread
        logger.info(f"Antigravity OAuth callback listener started on 127.0.0.1:{port}")
        return True
    except OSError as e:
        logger.warning(f"Could not bind OAuth callback listener on port {port}: {e}")
        return False


def stop_oauth_listener():
    """Stop the background OAuth listener."""
    global _OAUTH_SERVER, _OAUTH_THREAD
    if _OAUTH_SERVER:
        try:
            _OAUTH_SERVER.shutdown()
        except Exception:
            pass
        _OAUTH_SERVER = None
        _OAUTH_THREAD = None


def get_latest_oauth_event() -> Optional[Dict[str, Any]]:
    return _LATEST_OAUTH_EVENT


async def _refresh_google_oauth_token(refresh_token: str) -> Optional[Dict[str, Any]]:
    """Refresh Google OAuth access_token using official Antigravity OAuth client credentials with fallback."""
    if not refresh_token:
        return None

    async with httpx.AsyncClient(timeout=15.0) as client:
        for client_id, client_secret in OAUTH_CLIENT_PAIRS:
            data = {
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            }
            try:
                resp = await client.post(AGY_TOKEN_ENDPOINT, data=data)
                if resp.status_code == 200:
                    payload = resp.json()
                    return {
                        "access_token": payload.get("access_token"),
                        "expires_in": payload.get("expires_in", 3600),
                        "token_type": payload.get("token_type", "Bearer"),
                    }
                elif resp.status_code == 401 and "unauthorized_client" in resp.text:
                    continue  # Try next client pair
                else:
                    logger.warning(f"OAuth refresh failed ({resp.status_code}): {resp.text[:200]}")
            except Exception as e:
                logger.error(f"Error during OAuth refresh: {e}")
    return None


async def _resolve_account_context(account: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
    """
    Resolve active access_token and project_id for an account dictionary.
    Handles caching, automatic OAuth token refresh, and project ID discovery.
    """
    raw_token = account.get("token") or ""
    account_id = account.get("identifier") or account.get("id") or "default_agy"

    now = time.time()
    cached = _TOKEN_CACHE.get(str(account_id))
    if cached and cached.get("access_token") and cached.get("expires_at", 0) > (now + 60):
        return cached["access_token"], cached.get("project_id", DEFAULT_PROJECT_ID)

    access_token = None
    refresh_token = None
    project_id = DEFAULT_PROJECT_ID

    if raw_token.strip().startswith("{"):
        try:
            parsed = json.loads(raw_token)
            if isinstance(parsed, dict):
                access_token = parsed.get("access_token")
                refresh_token = parsed.get("refresh_token")
                project_id = parsed.get("project_id") or parsed.get("project") or project_id
        except Exception:
            pass
    else:
        if raw_token.startswith("ya29."):
            access_token = raw_token
        elif raw_token.startswith("1//") or len(raw_token) > 40:
            refresh_token = raw_token

    # Check metadata
    meta = account.get("metadata") or {}
    if isinstance(meta, str) and meta.startswith("{"):
        try:
            meta = json.loads(meta)
        except Exception:
            meta = {}
    if isinstance(meta, dict):
        refresh_token = refresh_token or meta.get("refresh_token")
        access_token = access_token or meta.get("access_token")
        project_id = meta.get("project_id") or project_id

    # If we have a refresh_token, refresh access_token if expired or missing
    if refresh_token:
        new_tok = await _refresh_google_oauth_token(refresh_token)
        if new_tok and new_tok.get("access_token"):
            access_token = new_tok["access_token"]
            expires_in = new_tok.get("expires_in", 3600)
            _TOKEN_CACHE[str(account_id)] = {
                "access_token": access_token,
                "expires_at": now + expires_in,
                "project_id": project_id,
            }
            return access_token, project_id

    # If access_token was already present
    if access_token:
        _TOKEN_CACHE[str(account_id)] = {
            "access_token": access_token,
            "expires_at": now + 1800,
            "project_id": project_id,
        }
        return access_token, project_id

    return None, project_id


# -----------------------------------------------------------------------------
# Request Payload Transformation
# -----------------------------------------------------------------------------

def _convert_messages_to_antigravity(
    messages: List[Dict[str, Any]],
    actual_model: str,
    enable_thinking: bool,
) -> Tuple[List[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """
    Convert OpenAI-format messages into Google Cloud Code / Antigravity contents format.
    Extracts system prompts into systemInstruction object.
    """
    contents = []
    system_texts = []

    thought_sig = (
        CLAUDE_THOUGHT_SIGNATURE if "claude" in actual_model.lower() else GEMINI_THOUGHT_SIGNATURE
    )

    for msg in messages:
        role = msg.get("role", "user").lower()
        raw_content = msg.get("content") or ""

        if role == "system":
            if isinstance(raw_content, str) and raw_content.strip():
                system_texts.append(raw_content.strip())
            continue

        parts = []

        # If previous assistant reasoning content exists
        reasoning_text = msg.get("reasoning_content")
        if role == "assistant" and enable_thinking and reasoning_text:
            parts.append({
                "thought": True,
                "text": reasoning_text,
                "thoughtSignature": thought_sig,
            })

        # Process main text or multimodal blocks
        if isinstance(raw_content, str):
            if raw_content:
                parts.append({"text": raw_content})
        elif isinstance(raw_content, list):
            for part in raw_content:
                if isinstance(part, dict):
                    if part.get("type") == "text":
                        parts.append({"text": part.get("text", "")})
                    elif part.get("type") == "image_url":
                        url = part.get("image_url", {}).get("url", "")
                        match = re.match(r"^data:(image/[^;]+);base64,(.+)$", url)
                        if match:
                            parts.append({
                                "inlineData": {
                                    "mimeType": match.group(1),
                                    "data": match.group(2),
                                }
                            })

        if not parts:
            parts.append({"text": " "})

        target_role = "user" if role == "user" else "model"
        contents.append({"role": target_role, "parts": parts})

    system_instruction = None
    if system_texts:
        system_instruction = {
            "parts": [{"text": "\n\n".join(system_texts)}]
        }

    return contents, system_instruction


# -----------------------------------------------------------------------------
# Streaming & Non-Streaming Inference
# -----------------------------------------------------------------------------

async def stream_antigravity_chat(
    model: str,
    messages: List[Dict[str, Any]],
    accounts: Optional[List[Dict[str, Any]]] = None,
    stream: bool = True,
    **kwargs,
) -> AsyncIterator[Dict[str, Any]]:
    """
    Main entry point for Google Antigravity model streaming inference.
    Yields standard OpenAI SSE completion delta chunks with reasoning_content support.
    """
    global _LAST_ACCOUNT_INDEX

    upstream_model, effort, thinking_budget = resolve_antigravity_model(model)
    enable_thinking = thinking_budget > 0 or "-thinking" in upstream_model

    # 1. Resolve available accounts from input, SQLite vault, or local configuration
    active_accounts = accounts or []
    if not active_accounts:
        try:
            active_accounts = db.get_accounts("antigravity")
        except Exception:
            pass
    if not active_accounts:
        active_accounts = _load_local_fallback_credentials()

    if not active_accounts:
        yield {
            "id": f"chatcmpl-agy-{uuid.uuid4().hex[:12]}",
            "object": "chat.completion.chunk",
            "created": int(time.time()),
            "model": model,
            "choices": [{
                "index": 0,
                "delta": {
                    "content": (
                        "⚠️ **Singularity Antigravity Engine: No Account Credentials Found**\n\n"
                        "To use Antigravity frontier models (Claude Opus/Sonnet, Gemini 3.8 Flash, GPT-OSS 120B):\n"
                        "1. Open Singularity Control Center (`http://localhost:9000`).\n"
                        "2. In the **Antigravity** cookie/credentials tab, paste your Google OAuth refresh token or JSON dump.\n"
                        "3. Or run `./singular import <path_or_token>`.\n"
                    )
                },
                "finish_reason": "stop",
            }],
        }
        return

    # Multi-account rotation with retry limit
    max_attempts = len(active_accounts)
    last_error = None

    for attempt in range(max_attempts):
        idx = (_LAST_ACCOUNT_INDEX + attempt) % len(active_accounts)
        acc = active_accounts[idx]

        token, project_id = await _resolve_account_context(acc)
        if not token:
            continue

        # Build request payload
        contents, system_instruction = _convert_messages_to_antigravity(
            messages, upstream_model, enable_thinking
        )

        user_max_tokens = kwargs.get("max_tokens") or kwargs.get("max_output_tokens") or 8192
        if enable_thinking and thinking_budget > 0:
            if user_max_tokens <= thinking_budget:
                user_max_tokens = thinking_budget + 1024
            gen_config: Dict[str, Any] = {
                "temperature": kwargs.get("temperature", 0.7),
                "maxOutputTokens": user_max_tokens,
                "thinkingConfig": {"thinkingBudget": thinking_budget},
            }
        else:
            gen_config: Dict[str, Any] = {
                "temperature": kwargs.get("temperature", 0.7),
                "maxOutputTokens": user_max_tokens,
            }
        if kwargs.get("top_p") is not None:
            gen_config["topP"] = kwargs.get("top_p")

        request_body = {
            "project": project_id,
            "requestId": f"agent-{uuid.uuid4().hex}",
            "request": {
                "contents": contents,
                "generationConfig": gen_config,
            },
            "model": upstream_model,
            "userAgent": "antigravity",
            "requestType": "agent",
        }
        if system_instruction:
            request_body["request"]["systemInstruction"] = system_instruction

        # Attempt inference across endpoints (primary then fallback)
        success = False
        target_model = upstream_model

        async for chunk in _execute_upstream_request(
            request_body, token, model, target_model
        ):
            # Check for error status from upstream
            if chunk.get("_error_status"):
                err_status = chunk.get("_error_status")
                err_msg = chunk.get("_error_msg") or f"HTTP {err_status}"
                # Check for model not found (e.g. Claude 5.5 on non-Pro account)
                if err_status == 404 and "5-5" in target_model:
                    fallback_model = "claude-opus-4-6-thinking" if "opus" in target_model else "claude-sonnet-4-6"
                    logger.info(f"Antigravity 5.5 model not accessible on current tier, falling back to {fallback_model}")
                    request_body["model"] = fallback_model
                    async for fb_chunk in _execute_upstream_request(
                        request_body, token, model, fallback_model
                    ):
                        if fb_chunk.get("_error_status"):
                            last_error = fb_chunk.get("_error_msg")
                            logger.warning(f"Antigravity fallback to {fallback_model} failed with status {fb_chunk.get('_error_status')}: {last_error}")
                            break
                        success = True
                        yield fb_chunk
                    if success:
                        break
                    else:
                        logger.warning(f"Antigravity fallback to {fallback_model} did not succeed, last_error={last_error}")

                last_error = err_msg
                break

            success = True
            yield chunk

        if success:
            _LAST_ACCOUNT_INDEX = (idx + 1) % len(active_accounts)
            return

    # If all accounts exhausted
    err_msg = last_error or "Antigravity service temporarily unavailable or accounts rate-limited."
    yield {
        "id": f"chatcmpl-agy-{uuid.uuid4().hex[:12]}",
        "object": "chat.completion.chunk",
        "created": int(time.time()),
        "model": model,
        "choices": [{
            "index": 0,
            "delta": {"content": f"⚠️ **Antigravity Upstream Error:** {err_msg}"},
            "finish_reason": "stop",
        }],
    }


async def _execute_upstream_request(
    request_body: Dict[str, Any],
    token: str,
    original_model: str,
    upstream_model: str,
) -> AsyncIterator[Dict[str, Any]]:
    """Execute streaming HTTP request against Cloud Code SSE upstream."""
    chunk_id = f"chatcmpl-agy-{uuid.uuid4().hex[:12]}"
    now = int(time.time())

    for endpoint in UPSTREAM_ENDPOINTS:
        target_url = endpoint["stream_url"]
        target_host = endpoint["host"]

        headers = {
            "Host": target_host,
            "User-Agent": USER_AGENT,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
            "Accept-Encoding": "gzip",
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST", target_url, headers=headers, json=request_body
                ) as resp:
                    if resp.status_code != 200:
                        err_bytes = await resp.aread()
                        err_text = err_bytes.decode("utf-8", errors="replace")
                        logger.warning(f"Antigravity upstream error HTTP {resp.status_code} ({target_host}): {err_text[:300]}")
                        yield {"_error_status": resp.status_code, "_error_msg": err_text[:300]}
                        if resp.status_code in (401, 404, 429):
                            return
                        continue

                    # Stream and parse SSE lines
                    buffer = ""
                    async for raw_bytes in resp.aiter_bytes():
                        buffer += raw_bytes.decode("utf-8", errors="replace")
                        while "\n" in buffer:
                            line, buffer = buffer.split("\n", 1)
                            line = line.strip()
                            if not line.startswith("data:"):
                                continue

                            payload_str = line[5:].strip()
                            if not payload_str or payload_str == "[DONE]":
                                continue

                            try:
                                data = json.loads(payload_str)
                            except Exception:
                                continue

                            # Parse candidate parts
                            candidates = (
                                data.get("candidates")
                                or data.get("response", {}).get("candidates")
                                or []
                            )
                            if not candidates:
                                continue

                            for cand in candidates:
                                content = cand.get("content") or {}
                                parts = content.get("parts") or []
                                for part in parts:
                                    # Thought / Reasoning
                                    if part.get("thought") is True or "thought" in part:
                                        t_text = part.get("text") or (
                                            part["thought"] if isinstance(part["thought"], str) else ""
                                        )
                                        if t_text:
                                            yield {
                                                "id": chunk_id,
                                                "object": "chat.completion.chunk",
                                                "created": now,
                                                "model": original_model,
                                                "choices": [{
                                                    "index": 0,
                                                    "delta": {"reasoning_content": t_text},
                                                    "finish_reason": None,
                                                }],
                                            }
                                    # Normal Content
                                    elif part.get("text"):
                                        c_text = part.get("text")
                                        yield {
                                            "id": chunk_id,
                                            "object": "chat.completion.chunk",
                                            "created": now,
                                            "model": original_model,
                                            "choices": [{
                                                "index": 0,
                                                "delta": {"content": c_text},
                                                "finish_reason": None,
                                            }],
                                        }

                    # Final closing chunk
                    yield {
                        "id": chunk_id,
                        "object": "chat.completion.chunk",
                        "created": now,
                        "model": original_model,
                        "choices": [{
                            "index": 0,
                            "delta": {},
                            "finish_reason": "stop",
                        }],
                    }
                    return

        except Exception as e:
            logger.debug(f"Error connecting to {target_host}: {e}")
            continue

    yield {"_error_status": 503, "_error_msg": "Failed to connect to Antigravity endpoints"}


async def generate_antigravity_chat(
    model: str,
    messages: List[Dict[str, Any]],
    accounts: Optional[List[Dict[str, Any]]] = None,
    **kwargs,
) -> Dict[str, Any]:
    """Non-streaming completion wrapper for Antigravity engine."""
    full_content = []
    full_reasoning = []
    chunk_id = f"chatcmpl-agy-{uuid.uuid4().hex[:12]}"
    created = int(time.time())

    async for chunk in stream_antigravity_chat(
        model, messages, accounts=accounts, stream=False, **kwargs
    ):
        choices = chunk.get("choices") or []
        if choices:
            delta = choices[0].get("delta") or {}
            if delta.get("content"):
                full_content.append(delta["content"])
            if delta.get("reasoning_content"):
                full_reasoning.append(delta["reasoning_content"])

    resp_msg: Dict[str, Any] = {
        "role": "assistant",
        "content": "".join(full_content),
    }
    if full_reasoning:
        resp_msg["reasoning_content"] = "".join(full_reasoning)

    return {
        "id": chunk_id,
        "object": "chat.completion",
        "created": created,
        "model": model,
        "choices": [{
            "index": 0,
            "message": resp_msg,
            "finish_reason": "stop",
        }],
    }
