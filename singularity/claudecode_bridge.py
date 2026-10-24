"""
Claude Code Bridge for Singularity
Anthropic-compatible Messages protocol bridge that translates Claude Code CLI and Claude Desktop
requests into OpenAI-compatible format for Singularity AI engines (Kimi, Gemini, Qwen, etc.).

Features:
- Native SSE event streaming (message_start, content_block_delta, thinking_delta, tool_use, message_stop)
- Thinking / reasoning signature emulation
- Multimodal Vision: auto-loads images and converts Anthropic base64 to OpenAI image_url
- Tool calling translation: translates <tool_call> tags from reasoning models to Anthropic tool_use
- Sandboxed working directory path translation
- Native WebSearch fallback (DuckDuckGo + Google News)
- Process lifecycle management (start/stop/restart/status)
"""

import argparse
import base64
import html
import io
import json
import mimetypes
import os
import re
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import socketserver
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

DATA_DIR = Path(__file__).resolve().parent / "data"
PID_FILE = DATA_DIR / "claudecode_bridge.pid"
LOG_FILE = DATA_DIR / "claudecode_bridge.log"
DEFAULT_PORT = 6045
DEFAULT_GATEWAY = os.environ.get("SINGULARITY_GATEWAY_URL", "http://127.0.0.1:9000")
NGROK_API_KEY = "Insom-Singularity"

DUMMY_THINKING_SIGNATURE = (
    "ErUBCkYICBgCIkD7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a"
    "9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a=="
)

_RECENT_SEARCH_SOURCES: Dict[str, str] = {}

MOCK_ACCOUNT = {
    "uuid": "guest-user",
    "email_address": "guest@local",
    "full_name": "Singularity User",
    "display_name": "Singularity",
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z",
    "is_verified": True,
    "onboarding_complete": True,
    "age_is_verified": True,
    "grove_locked_by_claude_science": False,
    "settings": {
        "enabled_experiments": []
    },
    "memberships": [
        {
            "role": "admin",
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z",
            "organization": {
                "uuid": "guest-org",
                "name": "Local Singularity",
                "settings": {},
                "capabilities": ["claude_pro", "cowork", "code", "artifacts"],
                "rate_limit_tier": "tier_default",
                "billing_type": "stripe",
                "has_hosted_code_environments": True
            }
        }
    ]
}

MOCK_BOOTSTRAP = {
    "account": MOCK_ACCOUNT,
    "growthbook": {
        "features": {},
        "hashing_algorithm": "sha256",
        "user": {}
    }
}


def build_routes(gateway_url: str = DEFAULT_GATEWAY) -> Dict[str, Dict[str, Any]]:
    gw = gateway_url.rstrip("/")
    api_key = os.environ.get("SINGULARITY_API_KEY", "sk-singularity-local")
    return {
        "claude-opus-4-6": {
            "display_name": "Claude Opus (Antigravity)",
            "base_url": gw,
            "model": "agy-claude-opus-5-5-medium",
            "api_key": api_key,
            "format": "openai",
        },
        "claude-opus-4-7": {
            "display_name": "Kimi K3 Thinking",
            "base_url": gw,
            "model": "kimi-k3-thinking-search",
            "api_key": api_key,
            "format": "openai",
        },
        "claude-opus-4-8": {
            "display_name": "Qwen 3.8 Max",
            "base_url": gw,
            "model": "qwen3.8-max",
            "api_key": api_key,
            "format": "openai",
        },
        "claude-sonnet-4-6": {
            "display_name": "Claude Sonnet (Antigravity)",
            "base_url": gw,
            "model": "agy-claude-sonnet-5-5-medium",
            "api_key": api_key,
            "format": "openai",
        },
        "claude-sonnet-4-5": {
            "display_name": "Kimi K3 Thinking",
            "base_url": gw,
            "model": "kimi-k3-thinking-search",
            "api_key": api_key,
            "format": "openai",
        },
        "qwen3.8-max": {
            "display_name": "Qwen 3.8 Max",
            "base_url": gw,
            "model": "qwen3.8-max",
            "api_key": api_key,
            "format": "openai",
        },
        "qwen-3.8-max": {
            "display_name": "Qwen 3.8 Max",
            "base_url": gw,
            "model": "qwen3.8-max",
            "api_key": api_key,
            "format": "openai",
        },
        "claude-opus-4-5": {
            "display_name": "Kimi K3 Thinking",
            "base_url": gw,
            "model": "kimi-k3-thinking-search",
            "api_key": api_key,
            "format": "openai",
        },
        "claude-haiku-4-5": {
            "display_name": "Kimi K3 Thinking",
            "base_url": gw,
            "model": "kimi-k3-thinking-search",
            "api_key": api_key,
            "format": "openai",
        },
        "kimi-k3-thinking-search": {
            "display_name": "Kimi K3 Thinking",
            "base_url": gw,
            "model": "kimi-k3-thinking-search",
            "api_key": api_key,
            "format": "openai",
        },
    }


def extract_visual_perception_sync(image_blocks, gateway_url):
    """Fast multimodal perception pass using Singularity Gemini / AI Studio."""
    if not image_blocks:
        return ""
    try:
        url = f"{gateway_url.rstrip('/')}/v1/chat/completions"
        payload = {
            "model": "gemini-3.8-flash",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Analyze this attached image in thorough visual detail. Describe the scene, subject, "
                                "any visible text (exact words), colors, layout, style, and key elements so another model has full visual perception."
                            ),
                        }
                    ] + image_blocks,
                }
            ],
            "stream": False,
            "max_tokens": 1024,
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json", "Authorization": "Bearer sk-singularity-local"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read().decode())
            return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"  -> [Visual Perception Error]: {e}")
        return ""


def send_sse(wfile, event, data):
    wfile.write(f"event: {event}\ndata: {json.dumps(data)}\n\n".encode())
    wfile.flush()


def _cache_search_source(title, url):
    if not title or not url or not url.startswith("http"):
        return
    t_c, u_c = title.strip(), url.strip()
    _RECENT_SEARCH_SOURCES[t_c.lower()] = u_c
    for p in re.split(r"[:\-|–—]", t_c):
        if len(p.strip()) >= 4:
            _RECENT_SEARCH_SOURCES[p.strip().lower()] = u_c
    try:
        dom = re.sub(r"^www\.", "", urllib.parse.urlparse(u_c).netloc.lower())
        if dom:
            _RECENT_SEARCH_SOURCES[dom] = u_c
            if len(dom.split(".")[0]) >= 3:
                _RECENT_SEARCH_SOURCES[dom.split(".")[0]] = u_c
    except Exception:
        pass


def extract_working_dir(system_text):
    m = re.search(r"Working directory:\s*`?(/[^`\s\n\r\)]+)", system_text or "", re.I)
    return m.group(1).strip().rstrip("/") if m else "."


def rewrite_sandbox_paths(obj, cwd):
    if not cwd or cwd == ".":
        return obj
    if isinstance(obj, str):
        s = re.sub(r"sandbox:///mnt/agents/output(?=/|$)", cwd, obj)
        s = re.sub(r"sandbox:///mnt/agents(?=/|$)", cwd, s)
        s = re.sub(r"/mnt/agents/output(?=/|$)", cwd, s)
        s = re.sub(r"/mnt/agents(?=/|$)", cwd, s)
        s = re.sub(r"/mnt/(?:data|workspace)(?=/|$)", cwd, s)
        return s
    if isinstance(obj, dict):
        return {k: rewrite_sandbox_paths(v, cwd) for k, v in obj.items()}
    if isinstance(obj, list):
        return [rewrite_sandbox_paths(x, cwd) for x in obj]
    return obj


def convert_anthropic_image_to_openai(b):
    if not isinstance(b, dict):
        return None
    btype = b.get("type")
    if btype == "image":
        src = b.get("source", {})
        if isinstance(src, dict):
            if src.get("type") == "base64" and src.get("data"):
                mtype = src.get("media_type", "image/png")
                return {"type": "image_url", "image_url": {"url": f"data:{mtype};base64,{src['data']}"}}
            if src.get("type") == "url" and src.get("url"):
                return {"type": "image_url", "image_url": {"url": src["url"]}}
        if b.get("url"):
            return {"type": "image_url", "image_url": {"url": b["url"]}}
    elif btype == "image_url" and b.get("image_url"):
        return b
    return None


def extract_local_images_from_text(text):
    if not text or not isinstance(text, str):
        return []
    blocks, seen = [], set()
    for m in re.finditer(r"(/[^\s`\"'<>()\[\]]+\.(?:png|jpg|jpeg|webp|gif))", text, re.I):
        p = m.group(1)
        if p not in seen and os.path.isfile(p):
            seen.add(p)
            try:
                mtype = mimetypes.guess_type(p)[0] or "image/png"
                with open(p, "rb") as f:
                    b64 = base64.b64encode(f.read()).decode("ascii")
                blocks.append({"type": "image_url", "image_url": {"url": f"data:{mtype};base64,{b64}"}})
            except Exception as e:
                print(f"  -> [Vision Auto-Load Error] {p}: {e}")
    return blocks


def prepend_text_to_oai_msg(msg, prefix):
    c = msg.get("content", "")
    if isinstance(c, list):
        for item in c:
            if isinstance(item, dict) and item.get("type") == "text":
                item["text"] = f"{prefix}\n---\n{item.get('text', '')}"
                return
        c.insert(0, {"type": "text", "text": prefix})
    else:
        msg["content"] = f"{prefix}\n---\n{c}"


def append_text_to_oai_msg(msg, suffix):
    c = msg.get("content", "")
    if isinstance(c, list):
        for item in reversed(c):
            if isinstance(item, dict) and item.get("type") == "text":
                item["text"] = f"{item.get('text', '')}{suffix}"
                return
        c.append({"type": "text", "text": suffix})
    else:
        msg["content"] = f"{c}{suffix}"


def robust_parse_tool_call(raw_json):
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_json.strip()).strip()
    try:
        data = json.loads(cleaned, strict=False)
        if isinstance(data, dict) and data.get("name"):
            t_name = data["name"]
            for k in ("input", "arguments", "parameters"):
                if k in data and isinstance(data[k], dict):
                    return t_name, data[k]
            if "input" in data and isinstance(data["input"], str):
                try:
                    return t_name, json.loads(data["input"], strict=False)
                except Exception:
                    return t_name, {"raw": data["input"]}
            return t_name, {k: v for k, v in data.items() if k != "name"}
    except Exception:
        pass

    nm = re.search(r'"name"\s*:\s*"([^"]+)"', cleaned)
    if not nm:
        return None, None
    t_name = nm.group(1)

    if t_name in ("Write", "file_write", "create_file"):
        fp_m = re.search(r'"(?:file_path|path)"\s*:\s*"([^"]+)"', cleaned)
        c_m = re.search(r'"content"\s*:\s*"(.*)', cleaned, re.S)
        if fp_m and c_m:
            c_raw = re.sub(r'"\s*\}\s*\}?\s*$', "", c_m.group(1))
            c_raw = c_raw.replace('\\"', '"').replace("\\n", "\n").replace("\\t", "\t")
            return t_name, {"file_path": fp_m.group(1), "content": c_raw}

    if "artifact" in t_name.lower() or "present" in t_name.lower():
        ext = {}
        for k in ("file_path", "path", "title", "type", "id", "artifact_id", "description", "name"):
            km = re.search(rf'"{k}"\s*:\s*"([^"]+)"', cleaned)
            if km:
                ext[k] = km.group(1)
        c_m = re.search(r'"content"\s*:\s*"(.*)', cleaned, re.S)
        if c_m:
            ext["content"] = re.sub(r'"\s*\}\s*\}?\s*$', "", c_m.group(1)).replace('\\"', '"').replace("\\n", "\n")
        if ext:
            return t_name, ext

    if t_name == "Bash":
        cm = re.search(r'"command"\s*:\s*"((?:\\.|[^"\\])*)"', cleaned, re.S)
        if cm:
            return t_name, {"command": cm.group(1).replace('\\"', '"').replace("\\n", "\n")}

    if t_name in ("Skill", "SlashCommand"):
        sm = re.search(r'"(?:skill|command)"\s*:\s*"([^"]+)"', cleaned)
        if sm:
            return t_name, {"skill": sm.group(1)}

    return None, None


def fetch_search_results(query, max_results=6):
    items = []
    try:
        post_data = urllib.parse.urlencode({"q": query}).encode("utf-8")
        req = urllib.request.Request(
            "https://html.duckduckgo.com/html/",
            data=post_data,
            headers={
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )
        with urllib.request.urlopen(req, timeout=6) as resp:
            page = resp.read().decode("utf-8", errors="ignore")
        links = re.findall(r'<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', page, re.S)
        snips = re.findall(r'<a[^>]*class="result__snippet"[^>]*>(.*?)</a>', page, re.S)
        for i in range(min(len(links), max_results)):
            href, title = links[i]
            m = re.search(r"uddg=([^&]+)", href)
            if m:
                href = urllib.parse.unquote(m.group(1))
            t_c = html.unescape(re.sub(r"<[^>]+>", "", title)).strip()
            s_c = html.unescape(re.sub(r"<[^>]+>", "", snips[i] if i < len(snips) else "")).strip()
            if href.startswith("http"):
                items.append({"title": t_c, "url": href, "snippet": s_c})
    except Exception:
        pass

    if not items:
        try:
            rss_url = "https://news.google.com/rss/search?q=" + urllib.parse.quote(query)
            with urllib.request.urlopen(
                urllib.request.Request(rss_url, headers={"User-Agent": "Mozilla/5.0"}), timeout=6
            ) as resp:
                xml = resp.read().decode("utf-8", errors="ignore")
            entries = re.findall(
                r"<item>.*?<title>(.*?)</title>.*?<link>(.*?)</link>.*?(?:<description>(.*?)</description>)?.*?</item>",
                xml,
                re.S,
            )
            for i in range(min(len(entries), max_results)):
                t_r, l_r, d_r = entries[i]
                items.append(
                    {
                        "title": html.unescape(re.sub(r"<[^>]+>", "", t_r)).strip(),
                        "url": l_r.strip(),
                        "snippet": html.unescape(re.sub(r"<[^>]+>", "", d_r or "")).strip(),
                    }
                )
        except Exception:
            pass

    for it in items:
        _cache_search_source(it.get("title", ""), it.get("url", ""))
    return items


def extract_all_text(messages, system_val=None):
    parts = []
    if system_val:
        parts.append(
            system_val
            if isinstance(system_val, str)
            else "\n".join(b.get("text", "") for b in system_val if isinstance(b, dict))
        )
    for m in messages or []:
        c = m.get("content", "")
        if isinstance(c, str):
            parts.append(c)
        elif isinstance(c, list):
            parts.extend(b.get("text", "") for b in c if isinstance(b, dict) and b.get("type") == "text")
    return "\n".join(parts)


def handle_native_web_search_subrequest(handler, data, requested_model):
    full_text = extract_all_text(data.get("messages", []))
    m = re.search(r"Perform a web search for the query:\s*(.+)", full_text, re.I)
    query = m.group(1).strip() if m else full_text.strip().split("\n")[-1][:120]
    results = fetch_search_results(query)
    srv_id = f"srvtoolu_{int(time.time() * 1000)}"

    ws_blocks = [
        {"type": "web_search_result", "title": r["title"], "url": r["url"], "encrypted_content": "dGV4dA==", "page_age": "recent"}
        for r in results
    ]
    summary = (
        f'Web search findings for "{query}":\n'
        + "\n".join(f"- [{r['title']}]({r['url']}): {r['snippet']}" for r in results)
        if results
        else f"No results found for {query}."
    )

    if not data.get("stream", True):
        handler.send_response(200)
        handler.send_header("Content-Type", "application/json")
        handler.end_headers()
        handler.wfile.write(
            json.dumps(
                {
                    "id": f"msg_ws_{int(time.time()*1000)}",
                    "type": "message",
                    "role": "assistant",
                    "model": requested_model,
                    "content": [
                        {"type": "server_tool_use", "id": srv_id, "name": "web_search", "input": {"query": query}},
                        {"type": "web_search_tool_result", "tool_use_id": srv_id, "content": ws_blocks},
                        {"type": "text", "text": summary},
                    ],
                    "stop_reason": "end_turn",
                    "usage": {"input_tokens": 25, "output_tokens": 120, "server_tool_use": {"web_search_requests": 1}},
                }
            ).encode()
        )
        return

    handler.send_response(200)
    handler.send_header("Content-Type", "text/event-stream")
    handler.send_header("Cache-Control", "no-cache")
    handler.send_header("Connection", "close")
    handler.end_headers()

    send_sse(
        handler.wfile,
        "message_start",
        {
            "type": "message_start",
            "message": {
                "id": f"msg_ws_{int(time.time()*1000)}",
                "type": "message",
                "role": "assistant",
                "model": requested_model,
                "content": [],
                "stop_reason": None,
                "stop_sequence": None,
                "usage": {"input_tokens": 25, "output_tokens": 1, "server_tool_use": {"web_search_requests": 1}},
            },
        },
    )
    send_sse(
        handler.wfile,
        "content_block_start",
        {"type": "content_block_start", "index": 0, "content_block": {"type": "server_tool_use", "id": srv_id, "name": "web_search", "input": {}}},
    )
    send_sse(
        handler.wfile,
        "content_block_delta",
        {"type": "content_block_delta", "index": 0, "delta": {"type": "input_json_delta", "partial_json": json.dumps({"query": query})}},
    )
    send_sse(handler.wfile, "content_block_stop", {"type": "content_block_stop", "index": 0})
    send_sse(
        handler.wfile,
        "content_block_start",
        {"type": "content_block_start", "index": 1, "content_block": {"type": "web_search_tool_result", "tool_use_id": srv_id, "content": ws_blocks}},
    )
    send_sse(handler.wfile, "content_block_stop", {"type": "content_block_stop", "index": 1})
    send_sse(handler.wfile, "content_block_start", {"type": "content_block_start", "index": 2, "content_block": {"type": "text", "text": ""}})
    send_sse(handler.wfile, "content_block_delta", {"type": "content_block_delta", "index": 2, "delta": {"type": "text_delta", "text": summary}})
    send_sse(handler.wfile, "content_block_stop", {"type": "content_block_stop", "index": 2})
    send_sse(
        handler.wfile,
        "message_delta",
        {"type": "message_delta", "delta": {"stop_reason": "end_turn", "stop_sequence": None}, "usage": {"output_tokens": 120, "server_tool_use": {"web_search_requests": 1}}},
    )
    send_sse(handler.wfile, "message_stop", {"type": "message_stop"})


def prepare_claude_payload(data):
    raw_sys = extract_all_text([], data.get("system"))
    cwd = extract_working_dir(raw_sys)
    data["_local_cwd"] = cwd

    is_cowork = "local-agent-mode-sessions" in cwd or "cowork" in raw_sys.lower() or "create_artifact" in raw_sys.lower()
    if is_cowork:
        data["system"] = raw_sys
    else:
        env_m = re.search(r"<env>.*?</env>", raw_sys, re.S)
        env_block = env_m.group(0) if env_m else f"<env>\nWorking directory: {cwd}\n</env>"
        data["system"] = (
            "You are an expert AI assistant running inside Claude Code on the user's Linux machine.\n"
            f"Your ONLY real local working directory is: {cwd}\n"
            "Ignore `nobody nogroup` entries in `ls -la`.\n"
            f"{env_block}"
        ).strip()

    for m in data.get("messages", []):
        if isinstance(m.get("content"), list):
            cleaned = [b for b in m["content"] if not (isinstance(b, dict) and b.get("type") in ("thinking", "redacted_thinking"))]
            m["content"] = cleaned if cleaned else [{"type": "text", "text": "."}]

    if "tools" in data and isinstance(data["tools"], list):
        slim = []
        for t in data["tools"]:
            if not isinstance(t, dict) or str(t.get("type", "")).startswith("web_search"):
                continue
            name = t.get("name", "")
            if not name:
                continue
            raw_desc = (t.get("description") or "").strip()
            desc = (
                raw_desc[:4000]
                if (name.lower() in ("skill", "slashcommand") or "artifact" in name.lower() or "present" in name.lower())
                else raw_desc[:350]
            )
            slim.append({"name": name, "description": desc, "input_schema": t.get("input_schema", {})})
        data["tools"] = slim


def send_instant_text_response(handler, model_name, text, is_stream):
    if not is_stream:
        handler.send_response(200)
        handler.send_header("Content-Type", "application/json")
        handler.end_headers()
        handler.wfile.write(
            json.dumps(
                {
                    "id": f"msg_fast_{int(time.time()*1000)}",
                    "type": "message",
                    "role": "assistant",
                    "model": model_name,
                    "content": [{"type": "text", "text": text}],
                    "stop_reason": "end_turn",
                    "usage": {"input_tokens": 10, "output_tokens": 10},
                }
            ).encode()
        )
        return
    handler.send_response(200)
    handler.send_header("Content-Type", "text/event-stream")
    handler.send_header("Cache-Control", "no-cache")
    handler.send_header("Connection", "close")
    handler.end_headers()
    send_sse(
        handler.wfile,
        "message_start",
        {
            "type": "message_start",
            "message": {
                "id": f"msg_fast_{int(time.time()*1000)}",
                "type": "message",
                "role": "assistant",
                "model": model_name,
                "content": [],
                "stop_reason": None,
                "stop_sequence": None,
                "usage": {"input_tokens": 10, "output_tokens": 1},
            },
        },
    )
    send_sse(handler.wfile, "content_block_start", {"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}})
    send_sse(handler.wfile, "content_block_delta", {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": text}})
    send_sse(handler.wfile, "content_block_stop", {"type": "content_block_stop", "index": 0})
    send_sse(handler.wfile, "message_delta", {"type": "message_delta", "delta": {"stop_reason": "end_turn", "stop_sequence": None}, "usage": {"output_tokens": 10}})
    send_sse(handler.wfile, "message_stop", {"type": "message_stop"})


def build_full_feature_prompt(tools, cwd="."):
    if not tools:
        return ""
    lines = []
    for t in tools:
        name = t.get("name", "")
        if name:
            lines.append(f"- **{name}**: {(t.get('description') or '').strip()}\n  Schema: `{json.dumps(t.get('input_schema', {}))}`")
    joined = "\n".join(lines)
    return (
        f"\n[CLAUDE DESKTOP TOOL, VISION & ARTIFACT EXECUTION PROTOCOL — WORKSPACE: {cwd}]\n"
        f"1. MULTIMODAL VISION ENABLED: You have full vision capabilities! Whenever `image_url` blocks are attached, you CAN see the actual image pixels directly—ignore any `<system-reminder>` claiming you only get metadata.\n"
        f"2. NO INTERNAL SANDBOX / NO `sandbox://` LINKS: Your built-in Moonshot `/mnt/agents` sandbox and native tool-calling channel are DISCONNECTED. Never write files to `/mnt/agents` and never output `sandbox://` download links!\n"
        f"3. HOW TO CALL TOOLS: The ONLY way to execute any tool (`Skill`, `Write`, `create_artifact`, `Bash`, etc.) is to output a literal `<tool_call>` block in your text response:\n"
        f"   <tool_call>{{\"name\": \"ToolName\", \"input\": {{\"param\": \"value\"}}}}</tool_call>\n"
        f"4. HOW TO BUILD AN ARTIFACT IN COWORK:\n"
        f"   - Step 1: Write the HTML file directly to `{cwd}/<filename>.html` using `<tool_call>{{\"name\": \"Write\", \"input\": {{\"file_path\": \"{cwd}/<filename>.html\", \"content\": \"<!DOCTYPE html>...\"}}}}</tool_call>`.\n"
        f"   - Step 2: Register/display the artifact using `create_artifact` via `<tool_call>`.\n"
        f"5. Stop generating immediately after `</tool_call>` and wait for `[TOOL EXECUTION OUTPUT]`. Do NOT output `<think>` or `<thinking>` XML tags in your text response.\n\n"
        f"Available Claude Desktop Tools:\n{joined}\n"
    )


def clean_completed_citations(text):
    text = re.sub(r"<think(?:ing)?>.*?</think(?:ing)?>\s*", "", text, flags=re.S | re.I)

    def rep_pua(m):
        urls = re.findall(r"https?://[^\s\ue201\ue202\)]+", m.group(0))
        return f" ([Source]({urls[0]}))" if urls else ""

    text = re.sub(r"[\ue200\uE200][^\ue201\uE201]*[\ue201\uE201]", rep_pua, text)
    text = re.sub(r"[^]*", rep_pua, text)

    def rep_cite(m):
        inner = m.group(1).strip()
        md_links = re.findall(r"\[([^\]]+)\]\((https?://[^\)]+)\)", inner)
        if md_links:
            return " (" + ", ".join(f"[{t}]({u})" for t, u in md_links) + ")"
        raw_urls = re.findall(r"https?://[^\s,\)]+", inner)
        if raw_urls:
            return " (" + ", ".join(f"[Link]({u})" for u in raw_urls) + ")"
        return ""

    return re.sub(r"\[cite:\s*((?:\[[^\]]*\]|[^\]])+)\]", rep_cite, text)


def get_partial_tag_len(s):
    for target in (
        "<tool_call>",
        "<think>",
        "<thinking>",
        "<Image",
        "[cite:",
        "\ue200",
        "\uE200",
        "",
        "sandbox:///mnt/agents",
        "/mnt/agents/output",
        "/mnt/agents",
    ):
        for length in range(len(target) - 1, 0, -1):
            if s.endswith(target[:length]):
                return length
    return 0


class ClaudeBridgeProxy(BaseHTTPRequestHandler):
    gateway_url: str = DEFAULT_GATEWAY

    def log_message(self, format, *args):
        pass

    def do_HEAD(self):
        self.send_response(200)
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_GET(self):
        url_path = urllib.parse.urlparse(self.path).path
        print(f"[ClaudeBridge GET] {url_path}")

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        if "melange/read" in url_path or url_path.endswith("/melange/read"):
            doc = {
                "path": "/memory.json",
                "size_bytes": 2,
                "updated_at": "2026-01-01T00:00:00Z",
                "content": "{}",
                "display_name": "Claude"
            }
            self.wfile.write(json.dumps(doc).encode())
            return

        if url_path.endswith("/bootstrap") or "/api/bootstrap" in url_path:
            self.wfile.write(json.dumps(MOCK_BOOTSTRAP).encode())
            return

        if url_path.endswith("/users/me") or url_path == "/api/account":
            self.wfile.write(json.dumps(MOCK_ACCOUNT).encode())
            return

        if url_path.endswith("/organizations") or url_path == "/api/organizations":
            self.wfile.write(json.dumps([MOCK_ACCOUNT["memberships"][0]["organization"]]).encode())
            return

        if "chat_conversations" in url_path:
            if url_path.endswith("/chat_conversations"):
                self.wfile.write(b"[]")
                return
            conv_uuid = url_path.split("/")[-1]
            convo = {
                "uuid": conv_uuid,
                "name": "New Chat",
                "summary": "",
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
                "settings": {},
                "chat_messages": []
            }
            self.wfile.write(json.dumps(convo).encode())
            return

        if any(k in url_path for k in ("projects", "skills", "conversations_v2", "channels")):
            self.wfile.write(b"[]")
            return

        if any(k in url_path for k in ("settings", "reflections", "election", "notification", "prepaid", "credits", "model_selector")):
            self.wfile.write(b"{}")
            return

        if url_path.startswith("/api/"):
            self.wfile.write(b"{}")
            return

        routes = build_routes(self.gateway_url)
        keys = ["claude-sonnet-4-5", "claude-opus-4-6", "claude-opus-4-7", "claude-opus-4-8", "claude-sonnet-4-6"]
        resp_data = {
            "status": "online",
            "service": "ClaudeCode Bridge",
            "gateway": self.gateway_url,
            "data": [{"id": k, "type": "model", "display_name": routes[k]["display_name"]} for k in keys if k in routes],
        }
        self.wfile.write(json.dumps(resp_data).encode())

    def do_POST(self):
        self.close_connection = True
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            data = json.loads(body)
        except Exception:
            data = {}

        url_path = urllib.parse.urlparse(self.path).path
        print(f"[ClaudeBridge POST] {url_path}")

        if "melange/read" in url_path or url_path.endswith("/melange/read"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            doc = {
                "path": "/memory.json",
                "size_bytes": 2,
                "updated_at": "2026-01-01T00:00:00Z",
                "content": "{}",
                "display_name": "Claude"
            }
            self.wfile.write(json.dumps(doc).encode())
            return

        if url_path.endswith("/chat_conversations"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            convo = {
                "uuid": f"convo-{int(time.time())}",
                "name": "New Chat",
                "summary": "",
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
                "settings": {},
                "chat_messages": []
            }
            self.wfile.write(json.dumps(convo).encode())
            return

        if "count_tokens" in self.path:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"input_tokens": 50}).encode())
            return

        # Defensive guard: Non-completion POST endpoints must never fall through to LLM chat completions!
        if not any(k in url_path for k in ("completion", "messages", "retry")):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            if any(k in url_path for k in ("projects", "skills", "conversations_v2", "channels")):
                self.wfile.write(b"[]")
            else:
                self.wfile.write(b"{}")
            return

        messages = data.get("messages", [])
        if "completion" in url_path or "retry" in url_path:
            prompt_text = data.get("prompt", "")
            if not prompt_text and "message" in data:
                prompt_text = data["message"].get("text", "")
            if not prompt_text and "text" in data:
                prompt_text = data.get("text", "")
            if not messages and prompt_text:
                messages = [{"role": "user", "content": prompt_text}]
                data["messages"] = messages

        requested_model = data.get("model", "claude-sonnet-4-5")
        is_stream = data.get("stream", True)
        tools = data.get("tools", [])

        if data.get("max_tokens", 999) <= 5 and not is_stream:
            send_instant_text_response(self, requested_model, "ok", False)
            return

        if len(tools) == 1 and isinstance(tools[0], dict) and str(tools[0].get("type", "")).startswith("web_search"):
            handle_native_web_search_subrequest(self, data, requested_model)
            return

        if not tools:
            full_txt = extract_all_text(messages, data.get("system"))
            lower_txt = full_txt.lower()
            if "is_new_topic" in lower_txt:
                send_instant_text_response(self, requested_model, '{"is_new_topic": false, "title": null}', is_stream)
                return
            if "filepaths" in lower_txt or "extract any file paths" in lower_txt:
                send_instant_text_response(self, requested_model, "<filepaths></filepaths>", is_stream)
                return
            if "policy_spec" in lower_txt or "command_prefix" in lower_txt or "prefix" in lower_txt:
                send_instant_text_response(self, requested_model, "none", is_stream)
                return
            if "web page content:" in lower_txt and "---" in full_txt:
                parts = full_txt.split("---")
                send_instant_text_response(
                    self,
                    requested_model,
                    parts[1].strip()[:8000] if len(parts) >= 3 else full_txt[:8000],
                    is_stream,
                )
                return
            if any(k in lower_txt for k in ("session title", "conversation title", "title for this session", "summarize into a short title", "title:", "short title", "name for this conversation")):
                send_instant_text_response(self, requested_model, "Coding Session", is_stream)
                return

        last_msg_raw = extract_all_text(messages[-1:] if messages else []).lower()
        if "prompt suggestion" in last_msg_raw or "suggest next" in last_msg_raw or "what the user might" in last_msg_raw:
            send_instant_text_response(self, requested_model, "", is_stream)
            return

        req_lower = requested_model.lower()
        routes = build_routes(self.gateway_url)
        route = routes.get(requested_model)
        if not route:
            if "qwen" in req_lower or "4-8" in req_lower:
                route = routes["claude-opus-4-8"]
            elif "kimi" in req_lower or "4-7" in req_lower or "haiku" in req_lower or "4-5" in req_lower:
                route = routes["claude-opus-4-7"]
            elif "flash" in req_lower or "4-6-flash" in req_lower or "sonnet-4-6" in req_lower:
                route = routes.get("claude-sonnet-4-6", routes["claude-opus-4-6"])
            elif "argon" in req_lower or "gemini" in req_lower or "4-6" in req_lower:
                route = routes["claude-opus-4-6"]
            elif "sonnet" in req_lower or "opus" in req_lower:
                route = routes["claude-opus-4-6"]
            else:
                route = routes["claude-opus-4-6"]

        data["model"] = route["model"]
        prepare_claude_payload(data)

        tool_names = [t.get("name") for t in data.get("tools", []) if isinstance(t, dict)]
        if route.get("format") == "openai":
            data.pop("thinking", None)
            data.pop("output_config", None)
            print(f"[ClaudeCode -> Singularity OpenAI] {route['model']} (tools={tool_names})")
            self.handle_openai_route(data, route, requested_model)
        else:
            data.pop("_local_cwd", None)
            data.pop("thinking", None)
            data.pop("output_config", None)
            print(f"[ClaudeCode -> Anthropic Direct] {route['model']} (tools={tool_names})")
            self.handle_anthropic_route(data, route)

    def handle_anthropic_route(self, data, route):
        data["stream"] = True
        req = urllib.request.Request(f"{route['base_url']}/v1/messages", data=json.dumps(data).encode(), method="POST")
        req.add_header("Content-Type", "application/json")
        req.add_header("anthropic-version", self.headers.get("anthropic-version", "2023-06-01"))
        if route.get("api_key"):
            req.add_header("Authorization", f"Bearer {route['api_key']}")
            req.add_header("x-api-key", route["api_key"])
        else:
            if "Authorization" in self.headers:
                req.add_header("Authorization", self.headers["Authorization"])
            if "x-api-key" in self.headers:
                req.add_header("x-api-key", self.headers["x-api-key"])
        req.add_header("User-Agent", "Anthropic/Python 0.45.0")

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(b": connected\n\n")
        self.wfile.flush()

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                while raw_line := resp.readline():
                    self.wfile.write(raw_line)
                    self.wfile.flush()
        except urllib.error.HTTPError as e:
            err_body = e.read().decode(errors="ignore")
            print(f"[Anthropic Direct HTTP Error {e.code}]: {err_body}")
            send_sse(
                self.wfile,
                "error",
                {"type": "error", "error": {"type": "api_error", "message": f"Anthropic Direct Error {e.code}: {err_body[:300]}"}},
            )
        except Exception as e:
            print(f"[Anthropic Direct Stream Error]: {e}")

    def handle_openai_route(self, anthropic_data, route, requested_model):
        cwd = anthropic_data.pop("_local_cwd", ".")
        sys_text = anthropic_data.get("system", "")
        tools = anthropic_data.get("tools", [])
        feature_prompt = build_full_feature_prompt(tools, cwd=cwd)

        oai_messages = [{"role": "system", "content": (sys_text + "\n" + feature_prompt).strip()}]
        total_images_attached = 0

        for m in anthropic_data.get("messages", []):
            role = m.get("role", "user")
            content = m.get("content", "")
            image_blocks = []

            if isinstance(content, list):
                parts = []
                for b in content:
                    if not isinstance(b, dict):
                        continue
                    btype = b.get("type")
                    if btype == "text":
                        txt = b.get("text", "").strip()
                        if txt:
                            parts.append(rewrite_sandbox_paths(txt, cwd))
                    elif btype in ("image", "image_url"):
                        img_b = convert_anthropic_image_to_openai(b)
                        if img_b:
                            image_blocks.append(img_b)
                    elif btype == "tool_use":
                        tc_input = rewrite_sandbox_paths(b.get("input", {}), cwd)
                        parts.append(f"<tool_call>{json.dumps({'name': b.get('name'), 'input': tc_input})}</tool_call>")
                    elif btype == "tool_result":
                        res_content = b.get("content", "")
                        if isinstance(res_content, list):
                            text_subs = []
                            for sub in res_content:
                                if not isinstance(sub, dict):
                                    continue
                                if sub.get("type") == "text":
                                    text_subs.append(sub.get("text", ""))
                                elif sub.get("type") in ("image", "image_url"):
                                    img_sub = convert_anthropic_image_to_openai(sub)
                                    if img_sub:
                                        image_blocks.append(img_sub)
                            res_content = "\n".join(text_subs)
                        res_str = str(res_content)
                        if len(res_str) > 6000:
                            res_str = res_str[:6000] + "\n...[truncated]..."
                        status = "ERROR" if b.get("is_error", False) else "SUCCESS"
                        parts.append(
                            f"[TOOL EXECUTION OUTPUT ({status})]:\n{res_str}\n"
                            f"[END OF TOOL OUTPUT — Now output the next `<tool_call>` or answer the user.]"
                        )
                text_joined = "\n\n".join(p for p in parts if p)
            elif isinstance(content, str):
                text_joined = rewrite_sandbox_paths(content, cwd)
            else:
                text_joined = ""

            if not image_blocks and role == "user" and text_joined:
                image_blocks.extend(extract_local_images_from_text(text_joined))

            if image_blocks:
                total_images_attached += len(image_blocks)
                text_joined = re.sub(r"[^\n]*cannot see the actual image[^\n]*", "", text_joined, flags=re.I)
                multimodal_content = [{"type": "text", "text": text_joined or "Please view and analyze the attached image(s)."}] + image_blocks
                oai_messages.append({"role": role, "content": multimodal_content})
            elif text_joined:
                oai_messages.append({"role": role, "content": text_joined})

        all_attached_image_blocks = []
        for om in oai_messages:
            c = om.get("content", [])
            if isinstance(c, list):
                for b in c:
                    if isinstance(b, dict) and b.get("type") in ("image_url", "image"):
                        all_attached_image_blocks.append(b)

        # Multimodal Vision handling across non-native vision engines (e.g. Qwen)
        if total_images_attached > 0 and not any(k in str(route.get("model", "")).lower() for k in ("gemini", "ais-", "agy-", "kimi")):
            print(f"  -> [Multimodal Vision Perception Pass for {route.get('model')}]...")
            vis_desc = extract_visual_perception_sync(all_attached_image_blocks, self.gateway_url)
            if vis_desc:
                append_text_to_oai_msg(
                    oai_messages[-1],
                    f"\n\n[Attached Image Visual Content & Inspection Analysis:\n{vis_desc}\n\nUse the above visual perception analysis to answer the user's questions about the image accurately.]"
                )

        if tools and len(oai_messages) > 1 and oai_messages[1]["role"] == "user":
            prepend_text_to_oai_msg(oai_messages[1], feature_prompt.strip())

        if tools and len(oai_messages) > 1 and oai_messages[-1]["role"] == "user":
            vision_note = (
                "\n4. IMAGE ATTACHED: The user's image is directly attached via multimodal vision—look at the image pixels and answer directly!"
                if total_images_attached > 0
                else ""
            )
            append_text_to_oai_msg(
                oai_messages[-1],
                f"\n\n[CRITICAL EXECUTION OVERRIDE:\n"
                f"1. NEVER use your internal `/mnt/agents` sandbox or native function-calling channel—it is invisible to the user! NEVER output `sandbox://` links!\n"
                f"2. To create a file, load a skill, or create an artifact, you MUST write a literal `<tool_call>{{\"name\": \"...\", \"input\": {{...}}}}</tool_call>` tag directly in your response text!\n"
                f"3. Save all files inside `{cwd}` (e.g. `{cwd}/demo.html`) using `Write`, and then register artifacts using `create_artifact` (or `Skill`) via `<tool_call>`.{vision_note}]",
            )

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "close")
        self.end_headers()

        send_sse(
            self.wfile,
            "message_start",
            {
                "type": "message_start",
                "message": {
                    "id": f"msg_{int(time.time()*1000)}",
                    "type": "message",
                    "role": "assistant",
                    "model": requested_model,
                    "content": [],
                    "stop_reason": None,
                    "stop_sequence": None,
                    "usage": {"input_tokens": 80, "output_tokens": 1},
                },
            },
        )

        req_max = max(anthropic_data.get("max_tokens", 8192), 16384)
        block_idx, used_client_tool, assistant_text = self.stream_openai_turn(
            oai_messages, route, 0, req_max, cwd=cwd, allow_thinking=True
        )

        if not used_client_tool and tools and assistant_text:
            lower_out = assistant_text.strip().lower()
            if any(
                p in lower_out
                for p in (
                    "let me build",
                    "let me create",
                    "let me write",
                    "let me load",
                    "i'll build",
                    "i'll create",
                    "i'll write",
                    "i will create",
                    "first, then",
                    "html file first",
                    "sandbox://",
                    "/mnt/agents",
                    "download and open it",
                )
            ):
                print("  -> [Auto-Continuing] Model did not emit <tool_call>; forcing immediate <tool_call>...")
                oai_messages.append({"role": "assistant", "content": assistant_text})
                oai_messages.append(
                    {
                        "role": "user",
                        "content": f'ERROR: You did NOT output a `<tool_call>` block! Output ONLY the literal `<tool_call>{{"name": "Write", "input": {{"file_path": "{cwd}/example.html", "content": "<!DOCTYPE html>..."}}}}</tool_call>` (or `Skill` / `create_artifact`) right now!',
                    }
                )
                block_idx, used_client_tool, _ = self.stream_openai_turn(
                    oai_messages, route, block_idx, req_max, cwd=cwd, allow_thinking=False
                )

        if block_idx == 0:
            send_sse(self.wfile, "content_block_start", {"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}})
            send_sse(self.wfile, "content_block_stop", {"type": "content_block_stop", "index": 0})

        send_sse(
            self.wfile,
            "message_delta",
            {"type": "message_delta", "delta": {"stop_reason": "tool_use" if used_client_tool else "end_turn", "stop_sequence": None}, "usage": {"output_tokens": 120}},
        )
        send_sse(self.wfile, "message_stop", {"type": "message_stop"})

    def stream_openai_turn(self, oai_messages, route, block_idx, max_tokens, cwd=".", allow_thinking=True):
        req = urllib.request.Request(
            f"{route['base_url']}/v1/chat/completions",
            data=json.dumps({"model": route["model"], "messages": oai_messages, "stream": True, "max_tokens": max_tokens}).encode(),
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {route['api_key'] or ''}",
                "ngrok-skip-browser-warning": "true",
                "User-Agent": "OpenAI/Python",
            },
        )

        thinking_block_open = False
        text_block_open = False
        tool_block_started = False
        started_tool_id = None
        started_tool_name = None
        used_client_tool = False
        collected_text = []
        native_tool_calls = {}
        buf = ""
        t0 = time.time()
        first_token_logged = False

        def flush_thinking(think_txt):
            nonlocal block_idx, thinking_block_open
            if not think_txt or not allow_thinking:
                return
            if not thinking_block_open:
                send_sse(
                    self.wfile,
                    "content_block_start",
                    {"type": "content_block_start", "index": block_idx, "content_block": {"type": "thinking", "thinking": ""}},
                )
                thinking_block_open = True
            send_sse(
                self.wfile,
                "content_block_delta",
                {"type": "content_block_delta", "index": block_idx, "delta": {"type": "thinking_delta", "thinking": think_txt}},
            )

        def close_thinking_block():
            nonlocal block_idx, thinking_block_open
            if thinking_block_open:
                send_sse(
                    self.wfile,
                    "content_block_delta",
                    {"type": "content_block_delta", "index": block_idx, "delta": {"type": "signature_delta", "signature": DUMMY_THINKING_SIGNATURE}},
                )
                send_sse(self.wfile, "content_block_stop", {"type": "content_block_stop", "index": block_idx})
                thinking_block_open = False
                block_idx += 1

        def flush_text(txt):
            nonlocal block_idx, text_block_open
            if not txt:
                return
            close_thinking_block()
            txt = rewrite_sandbox_paths(txt, cwd)
            collected_text.append(txt)
            if not text_block_open:
                send_sse(
                    self.wfile,
                    "content_block_start",
                    {"type": "content_block_start", "index": block_idx, "content_block": {"type": "text", "text": ""}},
                )
                text_block_open = True
            send_sse(
                self.wfile,
                "content_block_delta",
                {"type": "content_block_delta", "index": block_idx, "delta": {"type": "text_delta", "text": txt}},
            )

        def close_text_block():
            nonlocal block_idx, text_block_open
            if text_block_open:
                send_sse(self.wfile, "content_block_stop", {"type": "content_block_stop", "index": block_idx})
                text_block_open = False
                block_idx += 1

        def finish_tool_block(raw_tc_json):
            nonlocal block_idx, tool_block_started, started_tool_id, started_tool_name, used_client_tool
            t_name, t_input = robust_parse_tool_call(raw_tc_json)
            if t_name:
                close_thinking_block()
                close_text_block()
                t_input = rewrite_sandbox_paths(t_input or {}, cwd)
                tid = started_tool_id or f"toolu_{int(time.time() * 1000)}_{block_idx}"
                if not tool_block_started:
                    send_sse(
                        self.wfile,
                        "content_block_start",
                        {"type": "content_block_start", "index": block_idx, "content_block": {"type": "tool_use", "id": tid, "name": t_name, "input": {}}},
                    )
                send_sse(
                    self.wfile,
                    "content_block_delta",
                    {"type": "content_block_delta", "index": block_idx, "delta": {"type": "input_json_delta", "partial_json": json.dumps(t_input)}},
                )
                send_sse(self.wfile, "content_block_stop", {"type": "content_block_stop", "index": block_idx})
                block_idx += 1
                tool_block_started = False
                used_client_tool = True
                print(f"  -> [Tool Call Completed] {t_name} ({time.time() - t0:.1f}s)")
                return True
            if tool_block_started:
                send_sse(self.wfile, "content_block_stop", {"type": "content_block_stop", "index": block_idx})
                block_idx += 1
                tool_block_started = False
            flush_text(raw_tc_json)
            return False

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                while raw_line := resp.readline():
                    line = raw_line.decode("utf-8", errors="ignore").strip()
                    if not line.startswith("data:"):
                        continue
                    payload = line[5:].strip()
                    if payload == "[DONE]":
                        break
                    try:
                        chunk = json.loads(payload)
                        choice = chunk.get("choices", [{}])[0]
                        delta = choice.get("delta", {})
                        finish_reason = choice.get("finish_reason")
                    except Exception:
                        continue

                    reasoning = delta.get("reasoning_content") or delta.get("reasoning") or delta.get("thought") or ""
                    if reasoning and not text_block_open and not tool_block_started:
                        if not first_token_logged:
                            first_token_logged = True
                        flush_thinking(reasoning)

                    if "tool_calls" in delta and delta["tool_calls"]:
                        for tc in delta["tool_calls"]:
                            idx = tc.get("index", 0)
                            if idx not in native_tool_calls:
                                native_tool_calls[idx] = {"id": tc.get("id"), "name": "", "args": ""}
                            fn = tc.get("function", {})
                            if fn.get("name"):
                                native_tool_calls[idx]["name"] += fn["name"]
                            if fn.get("arguments"):
                                native_tool_calls[idx]["args"] += fn["arguments"]

                    text = delta.get("content") or ""
                    if text:
                        if not first_token_logged:
                            first_token_logged = True
                        try:
                            resp.fp.raw._sock.settimeout(8.0)
                        except Exception:
                            pass

                        buf += text
                        buf = re.sub(r"<Image[^>]*>", "", buf)
                        buf = re.sub(r"<think(?:ing)?>.*?</think(?:ing)?>\s*", "", buf, flags=re.S | re.I)

                        while buf:
                            think_open = re.search(r"<think(?:ing)?>", buf, re.I)
                            if think_open and not re.search(r"</think(?:ing)?>", buf, re.I):
                                if think_open.start() > 0:
                                    flush_text(clean_completed_citations(buf[: think_open.start()]))
                                    buf = buf[think_open.start() :]
                                break

                            tc_idx = buf.find("<tool_call>")
                            if tc_idx != -1:
                                if tc_idx > 0:
                                    flush_text(clean_completed_citations(buf[:tc_idx]))
                                    buf = buf[tc_idx:]
                                    tc_idx = 0

                                if not tool_block_started:
                                    nm = re.search(r'<tool_call>\s*\{\s*"name"\s*:\s*"([^"]+)"', buf)
                                    if nm:
                                        started_tool_name = nm.group(1)
                                        started_tool_id = f"toolu_{int(time.time() * 1000)}_{block_idx}"
                                        close_thinking_block()
                                        close_text_block()
                                        send_sse(
                                            self.wfile,
                                            "content_block_start",
                                            {
                                                "type": "content_block_start",
                                                "index": block_idx,
                                                "content_block": {"type": "tool_use", "id": started_tool_id, "name": started_tool_name, "input": {}},
                                            },
                                        )
                                        tool_block_started = True

                                end_idx = buf.find("</tool_call>")
                                if end_idx == -1:
                                    break

                                raw_json = buf[len("<tool_call>") : end_idx].strip()
                                buf = buf[end_idx + len("</tool_call>") :]
                                finish_tool_block(raw_json)
                                try:
                                    resp.close()
                                except Exception:
                                    pass
                                break

                            buf = clean_completed_citations(buf)
                            cite_idx = buf.find("[cite:")
                            pua_start = -1
                            for p_char in ("\ue200", "\uE200", ""):
                                idx = buf.find(p_char)
                                if idx != -1 and (pua_start == -1 or idx < pua_start):
                                    pua_start = idx

                            unclosed_start = -1
                            if cite_idx != -1 and buf.find("]", cite_idx) == -1:
                                unclosed_start = cite_idx
                            if pua_start != -1 and not any(buf.find(ec, pua_start) != -1 for ec in ("\ue201", "\uE201", "")):
                                unclosed_start = pua_start if unclosed_start == -1 else min(unclosed_start, pua_start)

                            if unclosed_start != -1:
                                if unclosed_start > 0:
                                    flush_text(buf[:unclosed_start])
                                    buf = buf[unclosed_start:]
                                break

                            keep = get_partial_tag_len(buf)
                            if keep > 0:
                                if len(buf) > keep:
                                    flush_text(buf[:-keep])
                                    buf = buf[-keep:]
                                break
                            else:
                                flush_text(buf)
                                buf = ""

                    if used_client_tool or finish_reason:
                        break
        except (TimeoutError, socket.timeout):
            pass
        except Exception as e:
            print(f"[OpenAI Stream Error]: {e}")

        if buf and not used_client_tool:
            if "<tool_call>" in buf:
                tc_pos = buf.find("<tool_call>")
                if tc_pos > 0:
                    flush_text(clean_completed_citations(buf[:tc_pos]))
                finish_tool_block(buf[tc_pos + len("<tool_call>") :].replace("</tool_call>", "").strip())
            else:
                buf = re.sub(r"<Image[^>]*>", "", buf)
                buf = re.sub(r"</?think(?:ing)?>", "", buf, flags=re.I)
                buf = clean_completed_citations(buf)
                buf = re.sub(r"\[cite:.*$", "", buf)
                buf = re.sub(r"[\ue200\uE200].*$", "", buf)
                buf = re.sub(r"[\ue200-\ue207]", "", buf)
                if buf:
                    flush_text(buf)

        for idx in sorted(native_tool_calls.keys()):
            tc = native_tool_calls[idx]
            if tc["name"]:
                close_thinking_block()
                close_text_block()
                try:
                    parsed_args = json.loads(tc["args"], strict=False) if tc["args"] else {}
                except Exception:
                    parsed_args = {"raw": tc["args"]}
                parsed_args = rewrite_sandbox_paths(parsed_args, cwd)
                tid = tc["id"] or f"toolu_{int(time.time() * 1000)}_{block_idx}"
                send_sse(
                    self.wfile,
                    "content_block_start",
                    {"type": "content_block_start", "index": block_idx, "content_block": {"type": "tool_use", "id": tid, "name": tc["name"], "input": {}}},
                )
                send_sse(
                    self.wfile,
                    "content_block_delta",
                    {"type": "content_block_delta", "index": block_idx, "delta": {"type": "input_json_delta", "partial_json": json.dumps(parsed_args)}},
                )
                send_sse(self.wfile, "content_block_stop", {"type": "content_block_stop", "index": block_idx})
                block_idx += 1
                used_client_tool = True

        close_thinking_block()
        close_text_block()
        return block_idx, used_client_tool, "".join(collected_text)


# =====================================================================
# Process Lifecycle Management for Singularity Server & CLI
# =====================================================================

def is_port_open(port: int, host: str = "127.0.0.1") -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.6)
            return s.connect_ex((host, port)) == 0
    except Exception:
        return False


def get_bridge_pid() -> Optional[int]:
    if not PID_FILE.exists():
        return None
    try:
        pid = int(PID_FILE.read_text().strip())
        if sys.platform != "win32":
            os.kill(pid, 0)
        return pid
    except (ValueError, OSError):
        if PID_FILE.exists():
            try:
                PID_FILE.unlink()
            except Exception:
                pass
        return None


def get_bridge_status(port: int = DEFAULT_PORT) -> Dict[str, Any]:
    online = is_port_open(port)
    pid = get_bridge_pid()
    routes = build_routes()

    models_info = [
        {"id": "claude-opus-4-7", "target": "Kimi K3 Thinking & Search", "provider": "Kimi", "desc": "Ultra Reasoning (200k)"},
        {"id": "claude-opus-4-6", "target": "Claude Opus 5.5 (Antigravity)", "provider": "Antigravity", "desc": "Flagship High-Intelligence Reasoning"},
        {"id": "claude-sonnet-4-6", "target": "Claude Sonnet 5.5 (Antigravity)", "provider": "Antigravity", "desc": "Fast High-Efficiency Coding"},
        {"id": "claude-opus-4-8", "target": "Qwen 3.8 Max", "provider": "Qwen", "desc": "Advanced Code & Math"},
    ]

    return {
        "status": "online" if online else "stopped",
        "running": online,
        "port": port,
        "pid": pid if online else None,
        "endpoint": f"http://127.0.0.1:{port}",
        "gateway": DEFAULT_GATEWAY,
        "models": models_info,
    }


_inproc_bridge_httpd: Optional[ThreadingHTTPServer] = None
_inproc_bridge_thread: Optional[threading.Thread] = None


def start_bridge_thread(port: int = DEFAULT_PORT, gateway_url: str = DEFAULT_GATEWAY) -> Dict[str, Any]:
    """Start Claude Code & Mobile Bridge as an in-process daemon thread (zero external sub-process required)."""
    global _inproc_bridge_httpd, _inproc_bridge_thread
    if is_port_open(port):
        return {**get_bridge_status(port), "message": "Claude Code Bridge is already running."}

    class ConfiguredProxy(ClaudeBridgeProxy):
        pass
    ConfiguredProxy.gateway_url = gateway_url

    socketserver.TCPServer.allow_reuse_address = True
    httpd = ThreadingHTTPServer(("0.0.0.0", port), ConfiguredProxy)
    _inproc_bridge_httpd = httpd

    def _serve():
        try:
            httpd.serve_forever()
        except Exception:
            pass

    _inproc_bridge_thread = threading.Thread(target=_serve, daemon=True, name="ClaudeCodeBridge")
    _inproc_bridge_thread.start()

    for _ in range(25):
        time.sleep(0.1)
        if is_port_open(port):
            break

    return get_bridge_status(port)


def start_bridge(port: int = DEFAULT_PORT, gateway_url: str = DEFAULT_GATEWAY) -> Dict[str, Any]:
    current = get_bridge_status(port)
    if current["running"]:
        return {**current, "message": "Claude Code Bridge is already running."}

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    bridge_script = Path(__file__).resolve()

    log_f = open(LOG_FILE, "a")
    extra_kwargs: Dict[str, Any] = {}
    if sys.platform != "win32":
        extra_kwargs["start_new_session"] = True
    else:
        extra_kwargs["creationflags"] = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)

    proc = subprocess.Popen(
        [sys.executable, str(bridge_script), "--port", str(port), "--gateway", gateway_url],
        stdout=log_f,
        stderr=subprocess.STDOUT,
        cwd=str(Path(__file__).resolve().parent.parent),
        **extra_kwargs,
    )

    PID_FILE.write_text(str(proc.pid))

    # Wait up to 3s for port to open
    for _ in range(30):
        time.sleep(0.1)
        if is_port_open(port):
            break

    status = get_bridge_status(port)
    return {**status, "message": f"Claude Code Bridge started on http://127.0.0.1:{port}"}


def stop_bridge(port: int = DEFAULT_PORT) -> Dict[str, Any]:
    global _inproc_bridge_httpd
    if _inproc_bridge_httpd:
        try:
            _inproc_bridge_httpd.shutdown()
            _inproc_bridge_httpd.server_close()
        except Exception:
            pass
        _inproc_bridge_httpd = None

    pid = get_bridge_pid()
    if pid:
        try:
            if sys.platform != "win32":
                os.kill(pid, signal.SIGTERM)
            else:
                subprocess.run(["taskkill", "/F", "/PID", str(pid)], capture_output=True)
        except Exception:
            pass

    if PID_FILE.exists():
        try:
            PID_FILE.unlink()
        except Exception:
            pass

    # Give port time to release
    for _ in range(15):
        time.sleep(0.1)
        if not is_port_open(port):
            break

    status = get_bridge_status(port)
    return {**status, "message": "Claude Code Bridge stopped."}


def restart_bridge(port: int = DEFAULT_PORT, gateway_url: str = DEFAULT_GATEWAY) -> Dict[str, Any]:
    stop_bridge(port)
    time.sleep(0.5)
    return start_bridge(port, gateway_url)


def run_server(port: int = DEFAULT_PORT, gateway: str = DEFAULT_GATEWAY):
    class ConfiguredProxy(ClaudeBridgeProxy):
        gateway_url = gateway

    server_address = ("127.0.0.1", port)
    httpd = ThreadingHTTPServer(server_address, ConfiguredProxy)
    print(f"============================================================")
    print(f"⚡ Claude Code Bridge running on http://127.0.0.1:{port}")
    print(f"🎯 Target Singularity Gateway: {gateway}")
    print(f"============================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Bridge] Shutting down...")
        httpd.server_close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Claude Code Bridge for Singularity")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="Port to listen on (default: 6045)")
    parser.add_argument("--gateway", type=str, default=DEFAULT_GATEWAY, help="Singularity gateway URL (default: http://127.0.0.1:9000)")
    args = parser.parse_args()
    run_server(port=args.port, gateway=args.gateway)
