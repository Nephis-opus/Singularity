#!/usr/bin/env python3
"""
Singularity Native Gemini Engine
=================================
Direct Google Gemini Web (Batchexecute / assistant-bard) reverse-proxy client.
Supports guest mode (zero cookie) and authenticated mode (__Secure-1PSID).
100% self-contained pure Python with zero legacy dependencies.
"""

import asyncio
import base64
import glob
import hashlib
import json
import logging
import os
from pathlib import Path
import re
import shutil
import sqlite3
import sys
import tempfile
import time
import urllib.parse
import uuid
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple

import httpx

logger = logging.getLogger("singularity.gemini")

GEMINI_BL = os.getenv("GEMINI_BL", "boq_gemini-web-uiserver_20261014.09_p0")

# Wire Model Hashes for Google StreamGenerate endpoint (x-goog-ext-525001261-jspb)
# Captured deterministically from Google Gemini Web otAQ7b model roster:
MODEL_HASHES = {
    8: "95a4c0abcba24364",  # Gemini 4 Argon (Complex tasks / Argon4p0)
    5: "5bf011840784117a",  # Gemini Thinking Mode fallback
    3: "e6fa609c3fa255c0",  # Gemini 3.1 Pro (Advanced reasoning)
    1: "56fdd199312815e2",  # Gemini 3.8 Flash (All-around help)
    6: "8c46e95b1a07cecc",  # Gemini 3.5 Flash-Lite (Fastest answers)
}

MODEL_CONFIGS = {
    # Gemini 4 Argon (Mode 8) - Thinking tiers: Low (1), Medium (4), High (2)
    "gemini-4-argon": {"mode": 8, "think": 4},
    "gemini-4-argon-low": {"mode": 8, "think": 1},
    "gemini-4-argon-medium": {"mode": 8, "think": 4},
    "gemini-4-argon-high": {"mode": 8, "think": 2},

    # Gemini 3.1 Pro (Mode 3) - Thinking tiers: Low (1), Medium (4), High (2)
    "gemini-3.1-pro": {"mode": 3, "think": 4},
    "gemini-3.1-pro-low": {"mode": 3, "think": 1},
    "gemini-3.1-pro-medium": {"mode": 3, "think": 4},
    "gemini-3.1-pro-high": {"mode": 3, "think": 2},

    # Gemini 3.8 Flash (Mode 1) - Thinking tiers: Low (1), Medium (4), High (2)
    "gemini-3.8-flash": {"mode": 1, "think": 4},
    "gemini-3.8-flash-low": {"mode": 1, "think": 1},
    "gemini-3.8-flash-medium": {"mode": 1, "think": 4},
    "gemini-3.8-flash-high": {"mode": 1, "think": 2},

    # Gemini 3.5 Flash-Lite (Mode 6) - Thinking tiers: Low (1), Medium (4), High (2)
    "gemini-3.5-flash-lite": {"mode": 6, "think": 1},
    "gemini-3.5-flash-lite-low": {"mode": 6, "think": 1},
    "gemini-3.5-flash-lite-medium": {"mode": 6, "think": 4},
    "gemini-3.5-flash-lite-high": {"mode": 6, "think": 2},

    # Google Veo Video Generation Models
    "veo-3.1-generate-preview": {"mode": 1, "think": 1},
    "veo-3.1-fast-generate-preview": {"mode": 1, "think": 1},
    "veo-2.0-generate-001": {"mode": 1, "think": 1},

    # Imagen / Nano Banana Image Generation Models
    "nano-banana-2": {"mode": 1, "think": 1},
    "nano-banana-pro": {"mode": 3, "think": 1},
    "nano-banana-2-lite": {"mode": 6, "think": 1},
    "imagen-4.0-generate-proto": {"mode": 1, "think": 1},
}


def resolve_gemini_model_config(model: str, **kwargs) -> Tuple[int, int]:
    """
    Deterministically resolve Google Gemini Web model mode and thinking level.
    Google Gemini Web Modes:
      8 = Gemini 4 Argon (Complex tasks / Argon4p0)
      3 = Gemini 3.1 Pro (Advanced reasoning)
      1 = Gemini 3.8 Flash (All-around help)
      6 = Gemini 3.5 Flash-Lite (Fastest answers)
    Thinking Levels (inner[17] = [[think_mode]]):
      2 = High ("Extra thorough" / deep reasoning)
      4 = Medium ("Balanced depth" / default for Argon, Pro, Flash)
      1 = Low ("Quick and efficient" / default for Flash-Lite)
    """
    m = (model or "").lower().strip()

    if m in MODEL_CONFIGS:
        cfg = MODEL_CONFIGS[m]
        mode_id = cfg["mode"]
        think_mode = cfg["think"]
    elif "argon" in m or "gemini-4" in m or m.startswith("4"):
        mode_id = 8
        think_mode = 2 if "high" in m else (1 if "low" in m else 4)
    elif "pro" in m or "3.1" in m:
        mode_id = 3
        think_mode = 2 if "high" in m else (1 if "low" in m else 4)
    elif "lite" in m or "3.5" in m:
        mode_id = 6
        think_mode = 2 if "high" in m else (4 if "med" in m else 1)
    elif "flash" in m or "3.8" in m:
        mode_id = 1
        think_mode = 2 if "high" in m else (1 if "low" in m else 4)
    else:
        mode_id = 8 if any(k in m for k in ("reason", "think", "complex")) else 1
        think_mode = 4 if mode_id == 8 else 1

    # Apply kwargs overrides (reasoning_effort, thinking_budget, thinking dict)
    re_effort = kwargs.get("reasoning_effort")
    if re_effort:
        re_str = str(re_effort).lower()
        if re_str in ("high", "deep"):
            think_mode = 2
        elif re_str in ("medium", "med"):
            think_mode = 4
        elif re_str in ("low", "minimal"):
            think_mode = 1

    tb = kwargs.get("thinking_budget")
    if tb is not None:
        try:
            tb_val = int(tb)
            if tb_val == 0:
                think_mode = 4
            elif tb_val > 16384:
                think_mode = 0
            elif tb_val <= 4096:
                think_mode = 4
            else:
                think_mode = 2
        except Exception:
            pass
    elif kwargs.get("thinking") is not None:
        th = kwargs.get("thinking")
        if isinstance(th, dict):
            if th.get("type") == "disabled":
                think_mode = 4
            elif th.get("type") == "enabled":
                b = th.get("budget_tokens")
                if b is not None:
                    try:
                        b_val = int(b)
                        if b_val > 16384:
                            think_mode = 0
                        elif b_val <= 4096:
                            think_mode = 4
                        else:
                            think_mode = 2
                    except Exception:
                        think_mode = 0 if mode_id == 5 else 2
                else:
                    think_mode = 0 if mode_id == 5 else 2
        elif th is True:
            think_mode = 0 if mode_id == 5 else 2

    return mode_id, think_mode


_SESSION_CACHE: Dict[str, Dict[str, Any]] = {}


def _clean_cookie_str(raw: Optional[str]) -> str:
    """Sanitize raw cookie string by stripping header labels and line breaks."""
    if not raw:
        return ""
    c = raw.strip()
    if c.lower().startswith("cookie:"):
        c = c[7:].strip()
    c = re.sub(r'[\r\n]+', '; ', c)
    return c


async def _get_gemini_session_context(cookie_str: Optional[str]) -> Tuple[str, str]:
    """Retrieve or dynamically extract SNlM0e XSRF token and active build label for Google Gemini."""
    clean_cookie = _clean_cookie_str(cookie_str)
    cache_key = clean_cookie or "guest"
    now = time.time()
    cached = _SESSION_CACHE.get(cache_key)
    if cached and (now - cached.get("ts", 0) < 600.0) and cached.get("snlm0e"):
        return cached["snlm0e"], cached["bl"]

    snlm0e = ""
    bl = os.getenv("GEMINI_BL", "boq_gemini-web-uiserver_20261014.09_p0")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer": "https://gemini.google.com/app",
        "Accept-Language": "en-US,en;q=0.9",
    }
    if clean_cookie:
        headers["Cookie"] = clean_cookie

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get("https://gemini.google.com/app", headers=headers)
            if resp.status_code == 200:
                sn_match = re.findall(r'"SNlM0e":"([^"]+)"', resp.text)
                if sn_match:
                    snlm0e = sn_match[0]
                bl_match = re.findall(r'"cfb2h":"([^"]+)"', resp.text)
                if bl_match:
                    bl = bl_match[0]
    except Exception:
        pass

    if snlm0e or bl:
        _SESSION_CACHE[cache_key] = {"snlm0e": snlm0e, "bl": bl, "ts": now}
    return snlm0e, bl


async def probe_gemini_session(cookie_str: str) -> Tuple[bool, str]:
    """Test whether a Gemini session is valid and authenticated via Google WebChannel context."""
    clean_cookie = _clean_cookie_str(cookie_str)
    if not clean_cookie:
        return False, "Empty cookie string"

    # API key check
    if clean_cookie.startswith("AIzaSy") or clean_cookie.startswith("AQ."):
        return True, "Valid Google Gemini API Key"

    if "__Secure-1PSID" not in clean_cookie:
        return False, "Missing __Secure-1PSID session cookie"

    try:
        snlm0e, bl = await _get_gemini_session_context(clean_cookie)
        if snlm0e:
            return True, "Active Google WebChannel session"
        return False, "Session expired or unauthorized (Google rejected cookie)"
    except Exception as e:
        return False, f"Probe error: {str(e)[:80]}"



# Generated media is only ever fetched from Google-operated hosts over HTTPS. The Google cookie
# bundle rides along on every hop, so a URL outside this list (e.g. one quoted in the model's
# reply) must never be requested.
_GOOGLE_MEDIA_SUFFIXES = (".google.com", ".googleusercontent.com", ".googlevideo.com", ".gstatic.com", ".ggpht.com")


def _is_google_media_url(url: str) -> bool:
    try:
        parts = urllib.parse.urlsplit(url)
    except ValueError:
        return False
    host = (parts.hostname or "").lower()
    return parts.scheme == "https" and any(host == sfx[1:] or host.endswith(sfx) for sfx in _GOOGLE_MEDIA_SUFFIXES)


async def _download_gemini_media(media_url: str, cookie_str: Optional[str], is_video: bool = False) -> Optional[str]:
    """Download Google Gemini generated image or video via authenticated ALR redirection hops."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer": "https://gemini.google.com/",
    }
    if cookie_str:
        headers["Cookie"] = cookie_str

    curr = media_url
    if "=d-I?alr=yes" not in curr and not is_video:
        curr = curr + "=d-I?alr=yes"

    try:
        # Redirects are followed by hand so every hop is checked against the Google allowlist.
        async with httpx.AsyncClient(headers=headers, follow_redirects=False, timeout=httpx.Timeout(60.0, connect=10.0)) as client:
            for _ in range(8):
                if not _is_google_media_url(curr):
                    return None
                r = await client.get(curr)
                if r.is_redirect and r.headers.get("location"):
                    curr = urllib.parse.urljoin(curr, r.headers["location"])
                    continue
                ct = r.headers.get("content-type", "").lower()
                if is_video or "video/" in ct or curr.endswith((".mp4", ".webm")):
                    file_id = f"gemini_vid_{uuid.uuid4().hex[:12]}"
                    gen_dir = Path(__file__).resolve().parent.parent / "static" / "generated"
                    gen_dir.mkdir(parents=True, exist_ok=True)
                    out_path = gen_dir / f"{file_id}.mp4"
                    out_path.write_bytes(r.content)
                    return f"/static/generated/{file_id}.mp4"
                elif "image/" in ct or len(r.content) > 10000:
                    file_id = f"gemini_{uuid.uuid4().hex[:12]}"
                    gen_dir = Path(__file__).resolve().parent.parent / "static" / "generated"
                    gen_dir.mkdir(parents=True, exist_ok=True)
                    out_path = gen_dir / f"{file_id}.png"
                    out_path.write_bytes(r.content)
                    b64 = base64.b64encode(r.content).decode("utf-8")
                    return f"data:image/png;base64,{b64}"
                nxt = r.text.strip()
                if nxt.startswith("http"):
                    curr = nxt
                else:
                    break
    except Exception:
        pass
    return None

_download_gemini_image = _download_gemini_media


def _clean_gemini_text(text: str, strip: bool = True) -> str:
    """Clean internal Google Gemini artifacts, chips, and internal placeholders."""
    text = text.replace("video_placeholder", "").replace("image_placeholder", "")
    text = re.sub(
        r'```(?:python|javascript|text)\?code_(?:reference|stdout)&code_event_index=\d+\n.*?```\n?',
        '', text, flags=re.DOTALL
    )
    text = re.sub(
        r'</?(?:Elic[ia]t|Suggest|FollowUp|ActionCard|RelatedQueries)[A-Za-z0-9_]*[^>]*>.*?(?:</(?:Elic[ia]t|Suggest|FollowUp|ActionCard|RelatedQueries)[A-Za-z0-9_]*>|$)|</?(?:Elic[ia]t|Suggest|FollowUp|ActionCard|RelatedQueries)[A-Za-z0-9_]*[^>]*/?>',
        '', text, flags=re.DOTALL | re.IGNORECASE
    )
    text = re.sub(
        r'<[A-Za-z0-9_-]+[^>]*\b(?:label|query)=[\'"][^\'"]*[\'"][^>]*>.*?</[A-Za-z0-9_-]+>',
        '', text, flags=re.DOTALL | re.IGNORECASE
    )
    text = re.sub(
        r'<[A-Za-z0-9_-]+[^>]*\b(?:label|query)=[\'"][^\'"]*[\'"][^>]*/?>',
        '', text, flags=re.IGNORECASE
    )
    text = re.sub(r'</?(?:[A-Za-z0-9_]*(?:Elic|Sugg|Follow|Action)[A-Za-z0-9_]*)[^>]*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'<[A-Za-z0-9_]+[^>]*$', '', text)
    text = re.sub(r'^(?:\[(?:Assistant|Model)\]:?|(?:Assistant|Model):)\s*', '', text, flags=re.IGNORECASE)
    return text.strip() if strip else text


def _format_messages_to_prompt(messages: List[Dict[str, Any]]) -> str:
    parts = []
    for m in messages:
        role = m.get("role", "user")
        content = m.get("content", "")
        if isinstance(content, list):
            sub_txt = []
            for item in content:
                if isinstance(item, dict) and item.get("type") == "text":
                    sub_txt.append(item.get("text", ""))
                elif isinstance(item, str):
                    sub_txt.append(item)
            content = " ".join(sub_txt)
        content_str = str(content).strip()
        if not content_str:
            continue
        if role == "system":
            parts.append(f"[System Instructions: {content_str}]")
        elif role == "assistant":
            parts.append(f"[Assistant]: {content_str}")
        else:
            parts.append(f"[User]: {content_str}")
    return "\n\n".join(parts) if parts else "Hello"


def _extract_images_from_messages(messages: List[Dict[str, Any]]) -> List[Tuple[bytes, str, str]]:
    """
    Extract attached images from OpenAI/Anthropic messages format.
    Returns: list of (image_bytes, mime_type, file_name)
    """
    extracted = []
    for m in messages:
        content = m.get("content", "")
        items = content if isinstance(content, list) else []
        for item in items:
            if not isinstance(item, dict):
                continue
            itype = item.get("type", "")
            img_url = ""
            media_type = "image/png"

            if itype == "image_url":
                iu = item.get("image_url", {})
                img_url = iu.get("url", "") if isinstance(iu, dict) else str(iu)
            elif itype == "image":
                src = item.get("source", {})
                if isinstance(src, dict) and src.get("type") == "base64" and src.get("data"):
                    media_type = src.get("media_type", "image/png")
                    img_url = f"data:{media_type};base64,{src['data']}"
                elif item.get("url"):
                    img_url = item.get("url")

            if not img_url:
                continue

            try:
                if img_url.startswith("data:"):
                    header, b64 = img_url.split(",", 1)
                    if ";" in header:
                        media_type = header.split(";")[0].replace("data:", "").strip() or "image/png"
                    img_bytes = base64.b64decode(b64)
                    ext = media_type.split("/")[-1].replace("jpeg", "jpg")
                    extracted.append((img_bytes, media_type, f"input_file_{len(extracted)}.{ext}"))
                elif img_url.startswith("http://") or img_url.startswith("https://"):
                    with httpx.Client(timeout=15.0) as client:
                        resp = client.get(img_url)
                        if resp.status_code == 200:
                            ct = resp.headers.get("content-type", "image/png").split(";")[0].strip()
                            ext = ct.split("/")[-1].replace("jpeg", "jpg")
                            extracted.append((resp.content, ct, f"input_file_{len(extracted)}.{ext}"))
                elif os.path.isfile(img_url):
                    import mimetypes
                    ct = mimetypes.guess_type(img_url)[0] or "image/png"
                    ext = ct.split("/")[-1].replace("jpeg", "jpg")
                    with open(img_url, "rb") as f:
                        extracted.append((f.read(), ct, f"input_file_{len(extracted)}.{ext}"))
            except Exception as e:
                print(f"[Gemini Vision Extraction Error]: {e}")

    return extracted


async def _upload_gemini_image(
    image_bytes: bytes,
    mime_type: str = "image/png",
    file_name: str = "image.png",
    cookie: str = "",
) -> Optional[str]:
    """Upload image to Google Scotty resumable upload endpoint and return /contrib_service/ttl_1d/... ID."""
    headers = {
        "authority": "content-push.googleapis.com",
        "accept": "*/*",
        "authorization": "Basic c2F2ZXM6cyNMdGhlNmxzd2F2b0RsN3J1d1U=",
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        "origin": "https://gemini.google.com",
        "push-id": "feeds/mcudyrk2a4khkz",
        "referer": "https://gemini.google.com/",
        "x-goog-upload-command": "start",
        "x-goog-upload-header-content-length": str(len(image_bytes)),
        "x-goog-upload-protocol": "resumable",
        "x-tenant-id": "bard-storage",
    }
    if cookie:
        headers["cookie"] = cookie

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=10.0)) as client:
            init_resp = await client.post("https://content-push.googleapis.com/upload/", headers=headers)
            if init_resp.status_code >= 400:
                print(f"[Gemini Scotty Start Error {init_resp.status_code}]: {init_resp.text[:200]}")
                return None
            upload_url = init_resp.headers.get("x-goog-upload-url")
            if not upload_url:
                print("[Gemini Scotty Start Error]: No x-goog-upload-url header returned")
                return None

            up_headers = {
                "Content-Length": str(len(image_bytes)),
                "X-Goog-Upload-Offset": "0",
                "X-Goog-Upload-Command": "upload, finalize",
            }
            if cookie:
                up_headers["cookie"] = cookie

            finalize_resp = await client.post(upload_url, headers=up_headers, content=image_bytes)
            if finalize_resp.status_code >= 400:
                print(f"[Gemini Scotty Finalize Error {finalize_resp.status_code}]: {finalize_resp.text[:200]}")
                return None

            img_id = finalize_resp.text.strip()
            if img_id.startswith("/contrib_service/"):
                return img_id
            m = re.search(r"(/contrib_service/[^\s\"'<>]+)", img_id)
            if m:
                return m.group(1)
            return img_id if img_id else None
    except Exception as e:
        print(f"[Gemini Scotty Exception]: {e}")
        return None


async def stream_gemini_chat(
    model: str,
    messages: List[Dict[str, Any]],
    cookie_str: Optional[str] = None,
    accounts: Optional[List[Dict[str, Any]]] = None,
    stream: bool = True,
    **kwargs,
) -> AsyncIterator[Dict[str, Any]]:
    """Stream chat completions from Google Gemini Web API with authentic session & image generation support."""
    # Resolve candidate cookies from parameters or active SQLite vault accounts
    candidates: List[str] = []
    if cookie_str:
        candidates.append(cookie_str)
    if accounts:
        for acc in accounts:
            tok = acc.get("token")
            if tok and acc.get("status") == "active" and tok not in candidates:
                candidates.append(tok)
    try:
        from singularity import db
        accs = db.get_accounts("gemini")
        for acc in accs:
            tok = acc.get("token")
            if tok and acc.get("status") == "active" and tok not in candidates:
                candidates.append(tok)
    except Exception:
        pass

    is_image_model = any(k in model.lower() for k in ("nano-banana", "imagen", "image"))
    is_video_model = any(k in model.lower() for k in ("veo", "video"))

    # Clean and filter candidate cookies
    candidates = [_clean_cookie_str(c) for c in candidates if _clean_cookie_str(c)]

    chosen_cookie = candidates[0] if candidates else ""
    snlm0e = ""
    bl = os.getenv("GEMINI_BL", "boq_gemini-web-uiserver_20261014.09_p0")

    # Try candidate cookies in priority order to find an active authenticated session
    for cand in candidates:
        s, b = await _get_gemini_session_context(cand)
        if s:
            chosen_cookie = cand
            snlm0e = s
            bl = b
            break
        elif not bl and b:
            bl = b

    help_instruction = (
        "⚠️ **Google Gemini Image Generation Notice**\n\n"
        "Google Gemini returned: *\"I can search for images, but can't create any for you right now. It's possible you're signed out or image creation isn't available in your location yet.\"*\n\n"
        "### 🔍 Why this happens:\n"
        "1. **Full Cookie Requirement**: Google Gemini's image generation (Imagen) requires authentication via `__Secure-1PSID`, `__Secure-1PSIDTS`, AND `SAPISID` (for SAPISIDHASH token verification).\n"
        "2. **Copied from Wrong Page**: Cookies must be copied from **gemini.google.com** while signed in — NOT from `google.com` search.\n"
        "3. **Account / Workspace Restrictions**: School, Google Workspace, or under-18 accounts have Imagen disabled by Google.\n\n"
        "### 🔑 How to resolve in 30 seconds:\n"
        "1. Open [gemini.google.com](https://gemini.google.com) in your browser and sign in.\n"
        "2. Open DevTools (`F12`), go to the **Network** tab, type any message in Gemini, and click on the `StreamGenerate` or `batchexecute` request.\n"
        "3. In the Request Headers, copy the entire **Cookie** header (which includes `__Secure-1PSID`, `__Secure-1PSIDTS`, and `SAPISID`).\n"
        "4. Paste it into Singularity Control Center -> **Cookie Stacker** -> **Gemini** tab and save!"
    )

    video_help_instruction = (
        "⚠️ **Google Gemini Video Generation Notice**\n\n"
        "Google returned: *\"I'm here to help, but you'll need to upgrade your subscription first.\"*\n\n"
        "### 🔍 Why Google Returned This:\n"
        "1. **Google One AI Premium vs Google Storage/Pro**: Google strictly restricts native video & motion generation (Veo) on `gemini.google.com` to accounts with an active **Google One AI Premium** ($19.99/mo) plan with Gemini Advanced enabled. Standard Google One storage plans (100GB, 2TB 'Pro' storage) or basic Workspace tiers do not include Veo video generation.\n"
        "2. **Session Cookies**: If you do have a Google One AI Premium subscription, verify in browser DevTools that your active session cookies in **Cookie Stacker** are exported from that exact account with 'Gemini Advanced' active in the top-left switcher.\n"
        "3. **Instant Free Animation Alternative**: If you want an animated dragon without an AI Premium subscription, prompt Gemini for code-based animation:\n"
        "   > *\"Create an animated SVG of the dragon with flapping wings and glowing lightning effects\"*\n"
        "   Gemini 3.8 Flash will natively write and render full animated SVG/Canvas code!"
    )

    chat_id = f"chatcmpl-gemini-{uuid.uuid4().hex[:12]}"
    created_ts = int(time.time())

    model_id, think_mode = resolve_gemini_model_config(model, **kwargs)

    prompt = _format_messages_to_prompt(messages)

    # Extract attached images and upload via Scotty resumable protocol
    images = _extract_images_from_messages(messages)
    uploaded_files = []
    if images:
        for img_bytes, mime_type, fn in images:
            img_id = await _upload_gemini_image(img_bytes, mime_type=mime_type, file_name=fn, cookie=chosen_cookie)
            if img_id:
                uploaded_files.append([[img_id], fn])
            else:
                print(f"[Gemini Vision] Warning: Failed to upload {fn} to Scotty")

        # If Scotty upload failed or returned no IDs, transparently fall back to AI Studio Vision
        if not uploaded_files:
            try:
                from .aistudio import stream_aistudio_chat
                print("[Gemini Vision] Scotty upload unavailable, falling back to Google AI Studio vision...")
                async for chunk in stream_aistudio_chat("ais-gemini-3.8-flash", messages, stream=stream, **kwargs):
                    yield chunk
                return
            except Exception as e:
                print(f"[Gemini Vision AI Studio Fallback Error]: {e}")

    inner = [None] * 80
    if uploaded_files:
        inner[0] = [prompt, 0, None, uploaded_files, None, None, 0]
    else:
        inner[0] = [prompt, 0, None, None, None, None, 0]
    inner[1] = ["en"]
    inner[2] = ["", "", "", None, None, None, None, None, None, ""]
    inner[6] = [0]
    inner[7] = 1
    inner[10] = 1
    inner[11] = 0
    inner[17] = [[think_mode]]
    inner[18] = 0
    inner[27] = 1
    inner[30] = [4]
    inner[53] = 0
    inner[59] = str(uuid.uuid4())
    inner[61] = []
    inner[68] = 1
    inner[79] = model_id

    outer = [None, json.dumps(inner)]

    model_hash = MODEL_HASHES.get(model_id, "95a4c0abcba24364")

    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": "https://gemini.google.com",
        "Referer": "https://gemini.google.com/app",
        "X-Same-Domain": "1",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "x-goog-ext-525001261-jspb": json.dumps([1, None, None, None, model_hash, None, None, 0, [think_mode], None, None, 3]),
    }
    if chosen_cookie:
        headers["Cookie"] = chosen_cookie
        # Compute SAPISIDHASH if SAPISID is available in cookies
        sapisid_m = re.search(r'(?:SAPISID|__Secure-1PAPISID|__Secure-3PAPISID)=([^;]+)', chosen_cookie)
        if sapisid_m:
            sapisid = sapisid_m.group(1).strip()
            ts = int(time.time())
            h = hashlib.sha1(f"{ts} {sapisid} https://gemini.google.com".encode()).hexdigest()
            headers["Authorization"] = f"SAPISIDHASH {ts}_{h}"

    # Initial assistant chunk
    yield {
        "id": chat_id,
        "object": "chat.completion.chunk",
        "created": created_ts,
        "model": model,
        "choices": [{"index": 0, "delta": {"role": "assistant"}, "finish_reason": None}],
    }

    prev_text = ""
    yielded_any = False
    emitted_images = set()
    emitted_videos = set()

    for attempt in range(2):
        params = {"f.req": json.dumps(outer)}
        if snlm0e:
            params["at"] = snlm0e
        body = urllib.parse.urlencode(params)
        reqid = int(time.time()) % 1000000

        url = (
            f"https://gemini.google.com/_/BardChatUi/data/"
            "assistant.lamda.BardFrontendService/StreamGenerate"
            f"?bl={bl}&hl=en&_reqid={reqid}&rt=c"
        )

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=15.0), follow_redirects=True) as client:
                async with client.stream("POST", url, content=body.encode("utf-8"), headers=headers) as resp:
                    if resp.status_code >= 400:
                        err_txt = (await resp.aread()).decode("utf-8", errors="ignore")
                        # Auto-heal: If Google returns a new XSRF token in error 400, capture and retry
                        xsrf_match = re.findall(r'\["xsrf","([^"]+)"\]', err_txt)
                        if xsrf_match and attempt == 0:
                            snlm0e = xsrf_match[0]
                            cache_key = cookie_str or "guest"
                            _SESSION_CACHE[cache_key] = {"snlm0e": snlm0e, "bl": bl, "ts": time.time()}
                            continue

                        if uploaded_files:
                            try:
                                from .aistudio import stream_aistudio_chat
                                print("[Gemini Vision] StreamGenerate returned 4xx with images, falling back to Google AI Studio vision...")
                                async for chunk in stream_aistudio_chat("ais-gemini-3.8-flash", messages, stream=stream, **kwargs):
                                    yield chunk
                                return
                            except Exception as e:
                                print(f"[Gemini Vision AI Studio Fallback Error]: {e}")

                        yield {
                            "id": chat_id,
                            "object": "chat.completion.chunk",
                            "created": created_ts,
                            "model": model,
                            "choices": [{
                                "index": 0,
                                "delta": {"content": f"\n\n[Gemini Web Error {resp.status_code}: {err_txt[:140]}]"},
                                "finish_reason": "error",
                            }],
                        }
                        return

                    buf = ""
                    async for chunk in resp.aiter_text():
                        buf += chunk
                        while "\n" in buf:
                            line, buf = buf.split("\n", 1)
                            if '"wrb.fr"' not in line or len(line) < 200:
                                continue

                            # Detect generated image assets in line
                            img_matches = re.findall(r'https://lh3\.googleusercontent\.com/gg-dl/([A-Za-z0-9_-]+)', line)
                            for file_key in img_matches:
                                full_img_url = f"https://lh3.googleusercontent.com/gg-dl/{file_key}"
                                if full_img_url not in emitted_images:
                                    emitted_images.add(full_img_url)
                                    data_uri = await _download_gemini_media(full_img_url, chosen_cookie, is_video=False)
                                    if data_uri:
                                        yield {
                                            "id": chat_id,
                                            "object": "chat.completion.chunk",
                                            "created": created_ts,
                                            "model": model,
                                            "choices": [{
                                                "index": 0,
                                                "delta": {"content": f"\n\n![Generated Image]({data_uri})\n\n"},
                                                "finish_reason": None,
                                            }],
                                        }
                                        yielded_any = True

                            # Detect generated video assets in line
                            vid_matches = re.findall(r'https?://[^\s"<>]+(?:\.mp4|\.webm|gg-video|video_generation_content)[^\s"<>]*', line)
                            for full_vid_url in vid_matches:
                                if full_vid_url not in emitted_videos:
                                    emitted_videos.add(full_vid_url)
                                    vid_uri = await _download_gemini_media(full_vid_url, chosen_cookie, is_video=True)
                                    if vid_uri:
                                        yield {
                                            "id": chat_id,
                                            "object": "chat.completion.chunk",
                                            "created": created_ts,
                                            "model": model,
                                            "choices": [{
                                                "index": 0,
                                                "delta": {"content": f"\n\n![Generated Video]({vid_uri})\n\n"},
                                                "finish_reason": None,
                                            }],
                                        }
                                        yielded_any = True

                            try:
                                arr = json.loads(line)
                                inner_str = arr[0][2]
                                if not inner_str or len(inner_str) < 50:
                                    continue
                                inner2 = json.loads(inner_str)
                                if isinstance(inner2, list) and len(inner2) > 4 and inner2[4]:
                                    for part in inner2[4]:
                                        if isinstance(part, list) and len(part) > 1 and part[1] and isinstance(part[1], list):
                                            for t in part[1]:
                                                if isinstance(t, str):
                                                    if t.strip() in ("video_placeholder", "image_placeholder"):
                                                        continue
                                                    # Strip raw internal image/video placeholder urls
                                                    t_cleaned = re.sub(r'http://googleusercontent\.com/(?:image|video)_generation_content/[0-9_]+', '', t)
                                                    t_cleaned = t_cleaned.replace("video_placeholder", "").replace("image_placeholder", "")

                                                    if is_image_model and not emitted_images and any(ref in t_cleaned for ref in ("signed out", "can't seem to create", "can't create it right now", "image creation isn't available")):
                                                        t_cleaned = help_instruction
                                                    elif is_video_model and not emitted_videos and any(ref in t_cleaned.lower() for ref in ("upgrade your subscription", "subscriptions/", "can't create that video", "create that video for you", "google one ai premium")):
                                                        t_cleaned = video_help_instruction

                                                    clean_full = _clean_gemini_text(t_cleaned, strip=False)
                                                    clean_prev = _clean_gemini_text(prev_text, strip=False)
                                                    if clean_full.startswith(clean_prev):
                                                        delta = clean_full[len(clean_prev):]
                                                    elif len(clean_full) > len(clean_prev) and clean_prev in clean_full:
                                                        delta = clean_full[clean_full.index(clean_prev) + len(clean_prev):]
                                                    else:
                                                        delta = clean_full

                                                    if delta and delta.strip():
                                                        yield {
                                                            "id": chat_id,
                                                            "object": "chat.completion.chunk",
                                                            "created": created_ts,
                                                            "model": model,
                                                            "choices": [{"index": 0, "delta": {"content": delta}, "finish_reason": None}],
                                                        }
                                                        yielded_any = True
                                                    prev_text = t_cleaned
                            except Exception:
                                pass
            break
        except Exception as e:
            if attempt == 0:
                continue
            if not yielded_any:
                yield {
                    "id": chat_id,
                    "object": "chat.completion.chunk",
                    "created": created_ts,
                    "model": model,
                    "choices": [{
                        "index": 0,
                        "delta": {"content": f"\n\n[Gemini Engine Error: {str(e)}]"},
                        "finish_reason": "error",
                    }],
                }
                return

    if not yielded_any:
        fallback_msg = video_help_instruction if is_video_model else (help_instruction if is_image_model else "")
        if fallback_msg:
            yield {
                "id": chat_id,
                "object": "chat.completion.chunk",
                "created": created_ts,
                "model": model,
                "choices": [{
                    "index": 0,
                    "delta": {"content": fallback_msg},
                    "finish_reason": None,
                }],
            }

    # Final stop chunk
    yield {
        "id": chat_id,
        "object": "chat.completion.chunk",
        "created": created_ts,
        "model": model,
        "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
    }


def _extract_gemini_from_sqlite(
    db_path: str, is_firefox: bool = False, master_key: Any = None, local_state_path: str = ""
) -> Optional[Dict[str, str]]:
    """Extract Google Gemini session cookies from a browser SQLite cookie database."""
    if not os.path.exists(db_path):
        return None

    temp_db = tempfile.mktemp(suffix=".sqlite")
    try:
        shutil.copy2(db_path, temp_db)
        conn = sqlite3.connect(temp_db, timeout=2.0)
        cur = conn.cursor()
        cookies: Dict[str, str] = {}

        if is_firefox:
            cur.execute(
                "SELECT name, value FROM moz_cookies "
                "WHERE (host LIKE '%google.com' OR host LIKE '%gemini.google.com%') "
                "  AND name IN ('__Secure-1PSID', '__Secure-1PSIDTS', 'SAPISID', 'SID', '__Secure-1PAPISID') "
                "ORDER BY creationTime DESC"
            )
            rows = cur.fetchall()
            for name, val in rows:
                if name not in cookies and val:
                    cookies[name] = val.strip()
        else:
            cur.execute(
                "SELECT name, encrypted_value, value, creation_utc FROM cookies "
                "WHERE (host_key LIKE '%google.com' OR host_key LIKE '%google%') "
                "  AND name IN ('__Secure-1PSID', '__Secure-1PSIDTS', 'SAPISID', 'SID', '__Secure-1PAPISID') "
                "ORDER BY creation_utc DESC"
            )
            rows = cur.fetchall()
            for name, enc_val, plain_val, _c_utc in rows:
                if name in cookies:
                    continue
                if enc_val:
                    if sys.platform.startswith("linux"):
                        try:
                            from singularity.mimo import _decrypt_linux_cookie
                        except ImportError:
                            from mimo import _decrypt_linux_cookie
                        dec_bytes = _decrypt_linux_cookie(enc_val, master_key or b"peanuts")
                    elif sys.platform == "win32":
                        try:
                            from singularity.mimo import _decrypt_windows_cookie
                        except ImportError:
                            from mimo import _decrypt_windows_cookie
                        dec_bytes = _decrypt_windows_cookie(enc_val, local_state_path)
                    elif sys.platform == "darwin":
                        try:
                            from singularity.mimo import _decrypt_macos_cookie
                        except ImportError:
                            from mimo import _decrypt_macos_cookie
                        dec_bytes = _decrypt_macos_cookie(enc_val, master_key or "")
                    else:
                        dec_bytes = enc_val
                    val_str = dec_bytes.decode("utf-8", errors="ignore").strip()
                    if val_str:
                        cookies[name] = val_str
                elif plain_val:
                    cookies[name] = plain_val.strip()

        conn.close()
        if cookies.get("__Secure-1PSID") and cookies.get("__Secure-1PSIDTS"):
            return cookies
        return None
    except Exception as exc:
        logger.debug(f"Error querying cookie DB {db_path}: {exc}")
        return None
    finally:
        if os.path.exists(temp_db):
            try:
                os.remove(temp_db)
            except Exception:
                pass


def discover_gemini_tokens() -> List[Dict[str, Any]]:
    """
    Scans local browser profiles (Chrome, Brave, Edge, Chromium, Firefox) across
    Linux, Windows, and macOS to extract live Gemini session cookies.
    Captures __Secure-1PSID, __Secure-1PSIDTS, SAPISID, and SID.
    """
    candidates = []

    # 1. Linux
    if sys.platform.startswith("linux"):
        try:
            from singularity.mimo import _get_linux_chrome_secret
        except ImportError:
            from mimo import _get_linux_chrome_secret
        master_key = _get_linux_chrome_secret()
        browser_patterns = [
            ("Google Chrome", "~/.config/google-chrome/*/Cookies"),
            ("Google Chrome", "~/.config/google-chrome/*/Network/Cookies"),
            ("Brave", "~/.config/BraveSoftware/Brave-Browser/*/Cookies"),
            ("Brave", "~/.config/BraveSoftware/Brave-Browser/*/Network/Cookies"),
            ("Microsoft Edge", "~/.config/microsoft-edge/*/Cookies"),
            ("Microsoft Edge", "~/.config/microsoft-edge/*/Network/Cookies"),
            ("Chromium", "~/.config/chromium/*/Cookies"),
            ("Chromium", "~/.config/chromium/*/Network/Cookies"),
        ]

        for browser_name, pat in browser_patterns:
            for p in glob.glob(os.path.expanduser(pat)):
                parts = Path(p).parts
                profile_name = parts[-2] if parts[-1] == "Cookies" else (parts[-3] if len(parts) >= 3 else "Default")
                parsed = _extract_gemini_from_sqlite(p, is_firefox=False, master_key=master_key)
                if parsed and parsed.get("__Secure-1PSID") and parsed.get("__Secure-1PSIDTS"):
                    candidates.append({
                        "browser": browser_name,
                        "profile": profile_name,
                        "db_path": p,
                        "cookies": parsed,
                    })

        for p in glob.glob(os.path.expanduser("~/.mozilla/firefox/*.default*/cookies.sqlite")):
            profile_name = Path(p).parent.name
            parsed = _extract_gemini_from_sqlite(p, is_firefox=True)
            if parsed and parsed.get("__Secure-1PSID") and parsed.get("__Secure-1PSIDTS"):
                candidates.append({
                    "browser": "Firefox",
                    "profile": profile_name,
                    "db_path": p,
                    "cookies": parsed,
                })

    # 2. Windows
    elif sys.platform == "win32":
        appdata = os.environ.get("APPDATA", "")
        localappdata = os.environ.get("LOCALAPPDATA", "")

        win_browsers = [
            ("Google Chrome", os.path.join(localappdata, r"Google\Chrome\User Data"), r"*\Network\Cookies"),
            ("Brave", os.path.join(localappdata, r"BraveSoftware\Brave-Browser\User Data"), r"*\Network\Cookies"),
            ("Microsoft Edge", os.path.join(localappdata, r"Microsoft\Edge\User Data"), r"*\Network\Cookies"),
        ]

        for browser_name, user_data_dir, cookie_subpath in win_browsers:
            if not os.path.exists(user_data_dir):
                continue
            local_state = os.path.join(user_data_dir, "Local State")
            for p in glob.glob(os.path.join(user_data_dir, cookie_subpath)):
                profile_name = Path(p).parts[-3] if len(Path(p).parts) >= 3 else "Default"
                parsed = _extract_gemini_from_sqlite(p, is_firefox=False, local_state_path=local_state)
                if parsed and parsed.get("__Secure-1PSID") and parsed.get("__Secure-1PSIDTS"):
                    candidates.append({
                        "browser": browser_name,
                        "profile": profile_name,
                        "db_path": p,
                        "cookies": parsed,
                    })

        if appdata:
            for p in glob.glob(os.path.join(appdata, r"Mozilla\Firefox\Profiles\*.default*\cookies.sqlite")):
                profile_name = Path(p).parent.name
                parsed = _extract_gemini_from_sqlite(p, is_firefox=True)
                if parsed and parsed.get("__Secure-1PSID") and parsed.get("__Secure-1PSIDTS"):
                    candidates.append({
                        "browser": "Firefox",
                        "profile": profile_name,
                        "db_path": p,
                        "cookies": parsed,
                    })

    # 3. macOS
    elif sys.platform == "darwin":
        import subprocess
        master_password = ""
        try:
            cmd = ["security", "find-generic-password", "-w", "-s", "Chrome Safe Storage"]
            master_password = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode("utf-8").strip()
        except Exception:
            pass

        mac_patterns = [
            ("Google Chrome", "~/Library/Application Support/Google/Chrome/*/Cookies"),
            ("Google Chrome", "~/Library/Application Support/Google/Chrome/*/Network/Cookies"),
            ("Brave", "~/Library/Application Support/BraveSoftware/Brave-Browser/*/Cookies"),
            ("Brave", "~/Library/Application Support/BraveSoftware/Brave-Browser/*/Network/Cookies"),
            ("Microsoft Edge", "~/Library/Application Support/Microsoft Edge/*/Cookies"),
        ]
        for browser_name, pat in mac_patterns:
            for p in glob.glob(os.path.expanduser(pat)):
                parts = Path(p).parts
                profile_name = parts[-2] if parts[-1] == "Cookies" else "Default"
                parsed = _extract_gemini_from_sqlite(p, is_firefox=False, master_key=master_password)
                if parsed and parsed.get("__Secure-1PSID") and parsed.get("__Secure-1PSIDTS"):
                    candidates.append({
                        "browser": browser_name,
                        "profile": profile_name,
                        "db_path": p,
                        "cookies": parsed,
                    })

    return candidates


def auto_fetch_gemini_token(save_to_db: bool = True) -> Dict[str, Any]:
    """
    Discovers the freshest Google Gemini session tokens (__Secure-1PSID and __Secure-1PSIDTS)
    from local browser cookie stores and optionally stacks them into the SQLite vault.
    """
    candidates = discover_gemini_tokens()
    if not candidates:
        return {
            "ok": False,
            "status_code": 404,
            "detail": "No Google Gemini session cookies found in local browsers. Make sure you are signed in at gemini.google.com in Chrome, Brave, Edge, or Firefox.",
        }

    # Best candidate: preference for Profile 12 or profile with valid active session
    best = candidates[0]
    for c in candidates:
        if "Profile 12" in c.get("profile", ""):
            best = c
            break

    c_dict = best["cookies"]
    cookie_str = "; ".join([f"{k}={v}" for k, v in c_dict.items()])
    psid = c_dict.get("__Secure-1PSID", "")

    if save_to_db:
        try:
            try:
                from singularity import db
            except ImportError:
                import db
            db.init_db()
            db.save_account(
                provider="gemini",
                raw_credential=cookie_str,
                name=f"Gemini ({best['browser']} - {best['profile']})",
                plan="Google AI Pro (Gemini Web)",
                status="active",
            )
        except Exception as exc:
            logger.warning(f"Failed to auto-save Gemini credential to SQLite vault: {exc}")

    masked = f"{psid[:8]}...{psid[-4:]}" if len(psid) > 16 else "***"
    return {
        "ok": True,
        "browser": best["browser"],
        "profile": best["profile"],
        "cookie_string": cookie_str,
        "masked_token": masked,
        "has_psidts": True,
        "has_sapisid": bool(c_dict.get("SAPISID")),
        "message": f"Successfully auto-fetched Gemini session from {best['browser']} ({best['profile']})! Loaded __Secure-1PSID and __Secure-1PSIDTS.",
    }


