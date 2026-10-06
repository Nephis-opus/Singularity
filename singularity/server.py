#!/usr/bin/env python3
"""
Singularity Unified AI Hub & Universal Gateway
Port 9000
"""

import asyncio
import base64
import copy
import json
import os
import time
import uuid
import re
import inspect
import socket
import subprocess
import sys
from pathlib import Path
from typing import Any, AsyncIterator, Dict, List, Optional
from urllib.parse import urlsplit

try:
    if os.getenv("NO_FASTAPI", "").strip() in ("1", "true", "yes"):
        raise ImportError("FastAPI disabled by NO_FASTAPI env var")
    from fastapi import FastAPI, HTTPException, Request, Response, status  # type: ignore[import-untyped]
    from fastapi.responses import FileResponse, JSONResponse, StreamingResponse  # type: ignore[import-untyped]
    from fastapi.staticfiles import StaticFiles  # type: ignore[import-untyped]

    app = FastAPI(title="Singularity Unified AI Gateway", version="1.0.0")
except Exception:
    # Lightweight pure-Python fallback for Termux / mobile (no Rust / Pydantic build needed!)
    from starlette.applications import Starlette
    from starlette.exceptions import HTTPException
    from starlette.requests import Request
    from starlette.responses import FileResponse, JSONResponse, Response, StreamingResponse
    from starlette.staticfiles import StaticFiles
    from starlette.routing import Route, Mount

    from contextlib import asynccontextmanager

    async def _http_exception_handler(request, exc):
        return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)

    @asynccontextmanager
    async def _gateway_lifespan(gateway_app):
        for handler in gateway_app._startup_handlers:
            try:
                if inspect.iscoroutinefunction(handler):
                    await handler()
                else:
                    handler()
            except Exception:
                pass
        yield
        for handler in gateway_app._shutdown_handlers:
            try:
                if inspect.iscoroutinefunction(handler):
                    await handler()
                else:
                    handler()
            except Exception:
                pass

    class StarletteGateway(Starlette):
        def __init__(self):
            self._startup_handlers = []
            self._shutdown_handlers = []
            super().__init__(
                exception_handlers={HTTPException: _http_exception_handler},
                lifespan=_gateway_lifespan,
            )

        def _route_decorator(self, path: str, methods: list):
            def decorator(func):
                sig = inspect.signature(func)
                async def handler(request):
                    kwargs = {}
                    for p in sig.parameters.values():
                        if p.name in ("request", "req"):
                            kwargs[p.name] = request
                        elif p.name in request.path_params:
                            kwargs[p.name] = request.path_params[p.name]
                        elif p.name in request.query_params:
                            kwargs[p.name] = request.query_params[p.name]
                        elif p.default is not inspect.Parameter.empty:
                            kwargs[p.name] = p.default
                    if inspect.iscoroutinefunction(func):
                        res = await func(**kwargs)
                    else:
                        res = func(**kwargs)
                    if isinstance(res, (dict, list)):
                        return JSONResponse(res)
                    return res
                self.router.routes.append(Route(path, handler, methods=methods))
                return func
            return decorator

        def get(self, path: str):
            return self._route_decorator(path, ["GET"])

        def post(self, path: str):
            return self._route_decorator(path, ["POST"])

        def delete(self, path: str):
            return self._route_decorator(path, ["DELETE"])

        def put(self, path: str):
            return self._route_decorator(path, ["PUT"])

        def patch(self, path: str):
            return self._route_decorator(path, ["PATCH"])

        def head(self, path: str):
            return self._route_decorator(path, ["HEAD", "GET"])

        def on_event(self, event_type: str):
            def decorator(func):
                if event_type == "startup":
                    self._startup_handlers.append(func)
                elif event_type == "shutdown":
                    self._shutdown_handlers.append(func)
                return func
            return decorator

    app = StarletteGateway()

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
STATIC_DIR = BASE_DIR / "static"

import sys
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import httpx
import uvicorn
import logging

import tunnel
import db
import providers
import security
try:
    from singularity import worker
except ImportError:
    import worker
try:
    from singularity import engines
except ImportError:
    import engines
try:
    from singularity import personas
except ImportError:
    import personas
try:
    from singularity import artifacts
except ImportError:
    import artifacts
try:
    from singularity import presets
    from singularity import requestlog
    from singularity import bench
    from singularity import connections as conn_rules
    from singularity.engines import openai_compat
except ImportError:
    import presets
    import requestlog
    import bench
    import connections as conn_rules
    from engines import openai_compat
try:
    from singularity import userscript
except ImportError:
    import userscript
try:
    from singularity import tools as chat_tools
    from singularity.tools import loop as tools_loop
    from singularity.tools import web_search as tools_web_search
    from singularity.tools import protocol as tools_protocol
except ImportError:
    import tools as chat_tools
    from tools import loop as tools_loop
    from tools import web_search as tools_web_search
    from tools import protocol as tools_protocol
from providers import (
    MODELS_CATALOG,
    PROVIDERS_CONFIG,
    get_all_limits,
    get_all_services_status,
    get_dynamic_models_catalog,
    get_pid_for_port,
    get_stored_cookies,
    remove_stacked_cookie,
    save_stacked_cookies,
    start_all_services,
    start_provider,
    stop_all_services,
    stop_provider,
)

# Authentication, origin checks and CORS for every route (see security.py for the policy).
app.add_middleware(security.SecurityMiddleware)


def resolve_model_provider(model_name: str) -> str:
    """Route a model name to its respective provider service."""
    m = (model_name or "").lower().strip()

    # 0. `connection/model` for one of the person's external API connections
    if "/" in m:
        try:
            if db.find_connection_for_model(model_name):
                return "external"
        except Exception:
            pass

    # 1. Search in catalog first for exact ID match
    for item in MODELS_CATALOG:
        if item["id"].lower() == m:
            return item["provider"]

    # 2. Explicit prefixes or known names
    if m.startswith("claude") or "fable" in m or "flable" in m or "opus" in m or "sonnet" in m or "haiku" in m:
        return "claude"
    if m.startswith("gemini") or m.startswith("imagen") or m.startswith("nano-banana") or m.startswith("veo") or m.startswith("google-omni") or m == "omni" or m.startswith("omni-"):
        return "gemini"
    if m.startswith("kimi") or m.startswith("moonshot"):
        return "kimi"
    if m.startswith("glm") or m.startswith("cogview"):
        return "glm"
    if m.startswith("grok") or m in ["fast", "heavy"]:
        return "grok"
    if m.startswith("deepseek") or m.startswith("ds-") or m.startswith("r1") or m.startswith("v3") or m.startswith("v4") or m.startswith("coder") or m == "flash":
        return "deepseek"
    if m.startswith("qwen") or m.startswith("tongyi") or m.startswith("wanx"):
        return "qwen"
    if m.startswith("gpt") or m.startswith("o1") or m.startswith("o3") or m.startswith("o4") or m in ["auto", "research", "flare", "astra", "luna", "sol", "terra", "sunburst"] or m.startswith("image-2.5"):
        return "chatgpt"

    # Fallback to chatgpt
    return "chatgpt"


# -------------------------------------------------------------------
# Universal OpenAI Gateway Endpoints (/v1)
# -------------------------------------------------------------------

@app.get("/v1/models")
@app.get("/models")
@app.get("/api/v1/models")
async def list_models():
    """Return unified OpenAI-compatible models list across all 8 providers + S-Connect Proxy."""
    now = int(time.time())
    data = []
    
    # Expose S-Connect Proxy models for JanitorAI custom LLM integration
    for proxy_m in ("s-connect-proxy", "cards-unmask-proxy"):
        data.append({
            "id": proxy_m,
            "object": "model",
            "created": now,
            "owned_by": "singularity-connect",
            "permission": [],
            "root": proxy_m,
            "parent": None,
            "locked": False,
            "reason": None,
            "capabilities": ["chat", "roleplay", "unmask"],
        })

    catalog = get_dynamic_models_catalog()
    for m in catalog:
        data.append({
            "id": m["id"],
            "object": "model",
            "created": now,
            "owned_by": m.get("connection") or m["provider"],
            "permission": [],
            "root": m["id"],
            "parent": None,
            "locked": m.get("locked", False),
            "reason": m.get("reason"),
            "capabilities": m.get("capabilities", []),
        })
    return {"object": "list", "data": data}


def is_simulation_mode() -> bool:
    """Check if device simulation mode is enabled."""
    return providers.is_simulation_active()


def _generate_simulated_image_svg(prompt: str) -> str:
    """Generate a crisp, authentic SVG image for simulation testing."""
    prompt_lower = (prompt or "").lower()
    if "apple" in prompt_lower:
        # High quality vector artwork of a glossy red Apple
        svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1c2333"/>
      <stop offset="100%" stop-color="#0b0e14"/>
    </radialGradient>
    <radialGradient id="appleGrad" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#ff6b6b"/>
      <stop offset="30%" stop-color="#e03131"/>
      <stop offset="70%" stop-color="#c92a2a"/>
      <stop offset="100%" stop-color="#5c0909"/>
    </radialGradient>
    <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#69db7c"/>
      <stop offset="60%" stop-color="#2f9e44"/>
      <stop offset="100%" stop-color="#1b5e20"/>
    </linearGradient>
    <linearGradient id="stemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a67c52"/>
      <stop offset="100%" stop-color="#4e3620"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#c92a2a" flood-opacity="0.4"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="28" fill="url(#bgGlow)"/>
  <ellipse cx="256" cy="420" rx="140" ry="24" fill="#000000" opacity="0.6"/>
  <!-- Stem -->
  <path d="M 256 160 C 254 110, 275 85, 298 70 C 294 76, 276 102, 270 160 Z" fill="url(#stemGrad)"/>
  <!-- Leaf -->
  <path d="M 270 120 C 330 90, 365 110, 370 140 C 335 155, 290 145, 270 120 Z" fill="url(#leafGrad)"/>
  <path d="M 275 122 Q 320 128 360 138" stroke="#8ce99a" stroke-width="2" fill="none" opacity="0.7"/>
  <!-- Apple Body -->
  <path d="M 256 185 C 230 160, 140 160, 130 250 C 120 340, 190 410, 256 410 C 322 410, 392 340, 382 250 C 372 160, 282 160, 256 185 Z" fill="url(#appleGrad)" filter="url(#glow)"/>
  <!-- Specular Highlights -->
  <ellipse cx="195" cy="225" rx="36" ry="58" transform="rotate(-30 195 225)" fill="#ffffff" opacity="0.32"/>
  <ellipse cx="180" cy="210" rx="14" ry="24" transform="rotate(-30 180 210)" fill="#ffffff" opacity="0.6"/>
  <!-- Bottom indents -->
  <path d="M 230 405 C 245 400, 267 400, 282 405" stroke="#380505" stroke-width="4" stroke-linecap="round" fill="none"/>
</svg>"""
    else:
        # Futuristic Cybernetic / Digital Art SVG
        svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d1117"/>
      <stop offset="100%" stop-color="#161b22"/>
    </linearGradient>
    <linearGradient id="neonCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f2fe"/>
      <stop offset="100%" stop-color="#4facfe"/>
    </linearGradient>
    <linearGradient id="neonPurple" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#b176f2"/>
      <stop offset="100%" stop-color="#f857a6"/>
    </linearGradient>
    <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" rx="28" fill="url(#bgGrad)"/>
  <circle cx="256" cy="256" r="160" fill="none" stroke="url(#neonCyan)" stroke-width="3" stroke-dasharray="12 8" opacity="0.4"/>
  <circle cx="256" cy="256" r="120" fill="none" stroke="url(#neonPurple)" stroke-width="5" filter="url(#neonGlow)"/>
  <polygon points="256,150 348,310 164,310" fill="none" stroke="url(#neonCyan)" stroke-width="4" filter="url(#neonGlow)"/>
  <circle cx="256" cy="256" r="48" fill="url(#neonPurple)" opacity="0.85" filter="url(#neonGlow)"/>
  <circle cx="256" cy="256" r="22" fill="#ffffff"/>
</svg>"""

    b64 = base64.b64encode(svg.encode("utf-8")).decode("utf-8")
    return f"data:image/svg+xml;base64,{b64}"


def _get_simulated_response_payload(model_name: str, provider_id: str, prompt_text: str = "") -> str:
    """Determine simulated response text (handling text, image, and video modalities)."""
    m_lower = (model_name or "").lower()
    p_lower = (prompt_text or "").lower()

    # Detect Video Modality
    if any(k in m_lower for k in ("video", "t2v", "wanx-2.1", "cogvideox", "kling", "sora", "runway", "veo")) or any(k in p_lower for k in ("video", "movie", "animation", "motion clip")):
        video_url = "/static/demo_video.mp4"
        return (
            f"🎬 **Singularity Cinematic Video Synthesis** (Simulated Response)\n\n"
            f"• **Model:** `{model_name}`\n"
            f"• **Prompt:** *\"{prompt_text or 'Autonomous dynamic frame sequence'}\"*\n"
            f"• **Specs:** 1080p HD • 24 FPS • Synchronized Stereo Audio\n\n"
            f"[Generated Video]({video_url})"
        )

    # Detect Image Modality
    if any(k in m_lower for k in ("image", "imagine", "cogview", "dall-e", "flux", "imagen", "sdxl", "wanx")) or any(k in p_lower for k in ("img", "image", "picture", "photo", "drawing", "illustration", "wallpaper")):
        img_url = _generate_simulated_image_svg(prompt_text)
        return (
            f"🎨 **Singularity Neural Image Synthesis** (Simulated Response)\n\n"
            f"• **Model:** `{model_name}`\n"
            f"• **Prompt:** *\"{prompt_text or 'Creative synthesis'}\"*\n"
            f"• **Resolution:** 1024x1024 High-Definition Vector Output\n\n"
            f"![Generated Image]({img_url})"
        )

    # Detect Artifact / App creation request in simulation mode
    if any(k in p_lower for k in ("artifact", "react", "component", "calculator", "game", "dashboard", "counter", "timer", "mermaid", "flowchart", "svg", "vector")):
        if "mermaid" in p_lower or "flowchart" in p_lower or "diagram" in p_lower:
            return (
                f"Here is the architecture diagram:\n\n"
                f'<antArtifact identifier="system-architecture" type="application/vnd.ant.mermaid" title="System Architecture Flowchart">\n'
                f"graph TD\n"
                f"    Client[Playground Web UI] -->|SSE / REST| Gateway[Singularity Gateway:9000]\n"
                f"    Gateway --> Router[Universal Model Router]\n"
                f"    Router --> Workers[Provider Workers 8000-8088]\n"
                f"    Router --> Sandbox[Universal Artifacts Engine]\n"
                f"    Sandbox --> Frame[Isolated iframe / React 18 / SVG]\n"
                f"</antArtifact>\n\n"
                f"The diagram above illustrates the Singularity architecture pipeline."
            )
        elif "svg" in p_lower or "icon" in p_lower or "vector" in p_lower:
            return (
                f"Here is the scalable vector graphic you requested:\n\n"
                f'<antArtifact identifier="singularity-core-logo" type="image/svg+xml" title="Singularity Cybernetic Core">\n'
                f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">\n'
                f'  <defs>\n'
                f'    <linearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="100%">\n'
                f'      <stop offset="0%" stop-color="#00f2fe"/>\n'
                f'      <stop offset="100%" stop-color="#4facfe"/>\n'
                f'    </linearGradient>\n'
                f'    <linearGradient id="accentPurple" x1="0%" y1="0%" x2="100%" y2="100%">\n'
                f'      <stop offset="0%" stop-color="#b176f2"/>\n'
                f'      <stop offset="100%" stop-color="#f857a6"/>\n'
                f'    </linearGradient>\n'
                f'    <filter id="bloom" x="-20%" y="-20%" width="140%" height="140%">\n'
                f'      <feGaussianBlur stdDeviation="8" result="blur"/>\n'
                f'      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>\n'
                f'    </filter>\n'
                f'  </defs>\n'
                f'  <rect width="100%" height="100%" rx="24" fill="#0b0f19"/>\n'
                f'  <circle cx="250" cy="250" r="160" stroke="url(#neonGlow)" stroke-width="3" fill="none" stroke-dasharray="10 6" opacity="0.6"/>\n'
                f'  <circle cx="250" cy="250" r="120" stroke="url(#accentPurple)" stroke-width="4" fill="none" filter="url(#bloom)"/>\n'
                f'  <polygon points="250,150 340,310 160,310" fill="none" stroke="url(#neonGlow)" stroke-width="4" filter="url(#bloom)"/>\n'
                f'  <circle cx="250" cy="250" r="32" fill="#00f2fe" filter="url(#bloom)"/>\n'
                f'  <text x="250" y="380" font-family="system-ui, sans-serif" font-size="18" font-weight="600" fill="#94a3b8" text-anchor="middle" letter-spacing="4">SINGULARITY ARTIFACTS</text>\n'
                f'</svg>\n'
                f"</antArtifact>\n\n"
                f"You can view and inspect the SVG in the artifact workbench."
            )
        else:
            return (
                "I've built an interactive React component for you:\n\n"
                '<antArtifact identifier="interactive-counter" type="application/vnd.ant.react" title="Interactive Glass Counter">\n'
                "import React, { useState } from 'react';\n"
                "import { Sparkles, Plus, Minus, RotateCcw, Zap } from 'lucide-react';\n\n"
                "export default function CounterApp() {\n"
                "  const [count, setCount] = useState(0);\n"
                "  return (\n"
                '    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">\n'
                '      <div className="w-full max-w-sm p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl flex flex-col items-center gap-6 backdrop-blur-xl">\n'
                '        <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-widest">\n'
                '          <Zap className="w-4 h-4" /> Singularity Universal Engine\n'
                "        </div>\n"
                '        <div className="text-7xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400 bg-clip-text text-transparent">\n'
                "          {count}\n"
                "        </div>\n"
                '        <div className="flex items-center gap-3 w-full justify-center">\n'
                '          <button onClick={() => setCount(c => c - 1)} className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all text-white">\n'
                '            <Minus className="w-5 h-5" />\n'
                "          </button>\n"
                '          <button onClick={() => setCount(0)} className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all text-slate-400 hover:text-white">\n'
                '            <RotateCcw className="w-5 h-5" />\n'
                "          </button>\n"
                '          <button onClick={() => setCount(c => c + 1)} className="p-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 transition-all text-slate-950 font-bold shadow-lg shadow-cyan-500/30">\n'
                '            <Plus className="w-5 h-5" />\n'
                "          </button>\n"
                "        </div>\n"
                "      </div>\n"
                "    </div>\n"
                "  );\n"
                "}\n"
                "</antArtifact>\n\n"
                "This component is rendered live in your interactive workbench on the right."
            )

    # Standard Text Response
    p_cfg = personas.get_persona_config(model_name) if personas else None
    if p_cfg:
        return (
            f"⚡ **Singularity Portable Gateway** (Simulated Response)\n\n"
            f"• **Model:** `{model_name}` ({p_cfg.name})\n"
            f"• **Provider:** `{provider_id.upper()}`\n"
            f"• **Architecture:** Frontier Neural Persona Engine\n\n"
            f"Hello! I am {p_cfg.name}. I am verified and running in Singularity Gateway."
        )

    return (
        f"⚡ **Singularity Portable Gateway** (Simulated Response)\n\n"
        f"• **Model:** `{model_name}`\n"
        f"• **Provider:** `{provider_id.upper()}`\n"
        f"• **Gateway Status:** 100% Self-Contained (Zero Legacy Dependencies)\n\n"
        f"Your device simulation is verified and running cleanly. Streaming SSE buffers, token rotation, and headers are functioning as expected."
    )


async def generate_simulated_stream(
    model_name: str,
    provider_id: str,
    prompt_text: str = "",
    thinking_budget: Optional[int] = None,
) -> AsyncIterator[bytes]:
    """Yield OpenAI-compatible SSE chunks for offline/device simulation testing."""
    created_ts = int(time.time())
    sim_id = f"chatcmpl-sim-{int(time.time()*1000)}"

    role_chunk = {
        "id": sim_id,
        "object": "chat.completion.chunk",
        "created": created_ts,
        "model": model_name,
        "choices": [{"index": 0, "delta": {"role": "assistant"}, "finish_reason": None}],
    }
    yield f"data: {json.dumps(role_chunk)}\n\n".encode("utf-8")
    await asyncio.sleep(0.04)

    # If thinking budget cap > 0, stream reasoning tokens first
    if thinking_budget is not None and thinking_budget > 0:
        sim_reasoning = (
            f"Thinking process for {model_name} (Thinking Budget Cap: {thinking_budget:,} tokens):\n"
            f"1. Parsing user input and model constraints\n"
            f"2. Formulating systematic reasoning graph\n"
            f"3. Validating response according to Singularity Gateway parameters\n\n"
        )
        for rw in sim_reasoning.split(" "):
            rc = {
                "id": sim_id,
                "object": "chat.completion.chunk",
                "created": created_ts,
                "model": model_name,
                "choices": [{"index": 0, "delta": {"reasoning_content": rw + " "}, "finish_reason": None}],
            }
            yield f"data: {json.dumps(rc)}\n\n".encode("utf-8")
            await asyncio.sleep(0.015)

    sim_text = _get_simulated_response_payload(model_name, provider_id, prompt_text)

    # Stream in natural chunk sizes
    words = sim_text.split(" ")
    for w in words:
        c = {
            "id": sim_id,
            "object": "chat.completion.chunk",
            "created": created_ts,
            "model": model_name,
            "choices": [{"index": 0, "delta": {"content": w + " "}, "finish_reason": None}],
        }
        yield f"data: {json.dumps(c)}\n\n".encode("utf-8")
        await asyncio.sleep(0.02)

    finish_chunk = {
        "id": sim_id,
        "object": "chat.completion.chunk",
        "created": created_ts,
        "model": model_name,
        "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
    }
    yield f"data: {json.dumps(finish_chunk)}\n\n".encode("utf-8")
    yield b"data: [DONE]\n\n"


async def smooth_chat_stream(
    source: AsyncIterator[Dict[str, Any]],
    target_interval: float = 0.035,
    max_chars: int = 40,
) -> AsyncIterator[Dict[str, Any]]:
    """Cadence smoother for LLM SSE token streams using a decoupled producer-consumer queue.

    Batches micro-chunks (1-character or sub-token deltas) into natural ~35ms / 28 FPS packets.
    Prevents high-frequency chunk storms (e.g. 100+ chunks/sec from Kimi / TensorRT-LLM)
    from freezing web browser clients (like Janitor AI) that execute heavy React DOM
    re-renders, markdown parsing, and regex passes on every incoming packet.
    """
    queue: asyncio.Queue = asyncio.Queue(maxsize=120)
    _SENTINEL = object()
    producer_exc: Optional[Exception] = None

    async def _producer():
        nonlocal producer_exc
        try:
            async for item in source:
                await queue.put(item)
        except Exception as e:
            producer_exc = e
        finally:
            await queue.put(_SENTINEL)

    producer_task = asyncio.create_task(_producer())

    last_flush = 0.0
    pending_chunk: Optional[Dict[str, Any]] = None
    pending_content: List[str] = []
    pending_reasoning: List[str] = []
    first_token_sent = False

    def _build_flush_chunk() -> Optional[Dict[str, Any]]:
        nonlocal pending_chunk, pending_content, pending_reasoning
        if not pending_chunk:
            return None
        c_text = "".join(pending_content)
        r_text = "".join(pending_reasoning)
        if not c_text and not r_text:
            out = pending_chunk
            pending_chunk = None
            return out

        out = copy.deepcopy(pending_chunk)
        choices = out.get("choices", [])
        if choices:
            delta = choices[0].get("delta", {})
            if c_text:
                delta["content"] = c_text
            elif "content" in delta:
                delta.pop("content", None)
            if r_text:
                delta["reasoning_content"] = r_text
            elif "reasoning_content" in delta:
                delta.pop("reasoning_content", None)
        pending_chunk = None
        pending_content = []
        pending_reasoning = []
        return out

    try:
        while True:
            if pending_content or pending_reasoning:
                now = time.monotonic()
                rem_time = max(0.005, target_interval - (now - last_flush))
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=rem_time)
                except asyncio.TimeoutError:
                    flush_chunk = _build_flush_chunk()
                    if flush_chunk:
                        last_flush = time.monotonic()
                        yield flush_chunk
                    continue
            else:
                item = await queue.get()

            if item is _SENTINEL:
                break

            chunk = item
            choices = chunk.get("choices", [])
            if not choices:
                flush_chunk = _build_flush_chunk()
                if flush_chunk:
                    last_flush = time.monotonic()
                    yield flush_chunk
                yield chunk
                continue

            choice = choices[0]
            delta = choice.get("delta", {})
            finish_reason = choice.get("finish_reason")

            is_role_only = "role" in delta and not delta.get("content") and not delta.get("reasoning_content")
            has_special = finish_reason is not None or delta.get("singularity_event") is not None or is_role_only

            if has_special:
                flush_chunk = _build_flush_chunk()
                if flush_chunk:
                    last_flush = time.monotonic()
                    yield flush_chunk
                yield chunk
                continue

            c_delta = delta.get("content")
            r_delta = delta.get("reasoning_content")

            if c_delta is None and r_delta is None:
                flush_chunk = _build_flush_chunk()
                if flush_chunk:
                    last_flush = time.monotonic()
                    yield flush_chunk
                yield chunk
                continue

            if c_delta and pending_reasoning:
                flush_chunk = _build_flush_chunk()
                if flush_chunk:
                    last_flush = time.monotonic()
                    yield flush_chunk

            if r_delta and pending_content:
                flush_chunk = _build_flush_chunk()
                if flush_chunk:
                    last_flush = time.monotonic()
                    yield flush_chunk

            if not pending_chunk:
                pending_chunk = chunk

            if c_delta:
                pending_content.append(c_delta)
            if r_delta:
                pending_reasoning.append(r_delta)

            if not first_token_sent:
                first_token_sent = True
                flush_chunk = _build_flush_chunk()
                if flush_chunk:
                    last_flush = time.monotonic()
                    yield flush_chunk
                continue

            now = time.monotonic()
            tot_chars = sum(len(x) for x in pending_content) + sum(len(x) for x in pending_reasoning)
            time_elapsed = (now - last_flush) >= target_interval
            size_reached = tot_chars >= max_chars

            if time_elapsed or size_reached:
                flush_chunk = _build_flush_chunk()
                if flush_chunk:
                    last_flush = time.monotonic()
                    yield flush_chunk

        flush_chunk = _build_flush_chunk()
        if flush_chunk:
            yield flush_chunk
    finally:
        if not producer_task.done():
            producer_task.cancel()
            try:
                await producer_task
            except (asyncio.CancelledError, Exception):
                pass
        aclose = getattr(source, "aclose", None)
        if aclose:
            try:
                await aclose()
            except Exception:
                pass


@app.post("/v1/chat/completions")
@app.post("/chat/completions")
async def chat_completions(request: Request):
    """Universal router for chat completions across all providers + S-Connect Proxy Interceptor."""
    try:
        body = await request.json()
    except Exception:
        body = {}

    requested_model = body.get("model", "gpt-5-6-mini")
    incoming_messages = list(body.get("messages") or []) if isinstance(body.get("messages"), list) else []

    # -------------------------------------------------------------------------
    # S-Connect JanitorAI Custom Proxy Interceptor Engine
    # -------------------------------------------------------------------------
    if requested_model in ("s-connect-proxy", "cards-unmask-proxy") or requested_model.startswith("s-connect"):
        from singularity import connect
        resp_payload, intercept_id = connect.handle_incoming_proxy_completion(body)
        if body.get("stream"):
            async def sse_proxy_stream():
                content_txt = resp_payload["choices"][0]["message"]["content"]
                chunk = {
                    "id": resp_payload["id"],
                    "object": "chat.completion.chunk",
                    "created": resp_payload["created"],
                    "model": requested_model,
                    "choices": [{
                        "index": 0,
                        "delta": {"role": "assistant", "content": content_txt},
                        "finish_reason": "stop"
                    }]
                }
                yield f"data: {json.dumps(chunk)}\n\n"
                yield "data: [DONE]\n\n"
            return StreamingResponse(sse_proxy_stream(), media_type="text/event-stream")
        return JSONResponse(resp_payload)

    # Passive Intercept: If JanitorAI sends character prompts to any regular model, auto-capture it!
    try:
        from singularity import connect
        extracted = connect.extract_persona_from_messages(incoming_messages)
        if len(extracted.get("system_prompt", "").strip()) > 80:
            db.save_connect_intercept({
                "bot_name": extracted.get("bot_name", "Captured Character"),
                "system_prompt": extracted.get("system_prompt", ""),
                "user_prompt": extracted.get("user_prompt", ""),
                "model": requested_model,
                "detected_persona": extracted.get("system_prompt", "")[:500],
                "intercepted_at": time.time(),
                "raw_body": body
            })
    except Exception:
        pass

    pipeline_info: Dict[str, Any] = {}
    # `kimi-k3@noir`: everything below sees the bare model; the reply keeps the name the client sent.
    model_name, preset_name = presets.split_model_ref(requested_model)
    preset = None
    if preset_name is not None:
        preset = db.get_preset(preset_name)
        if not preset:
            shown = preset_name or "(empty)"
            return JSONResponse(status_code=400, content={"error": {
                "message": f"Unknown preset '{shown}'. Create it in the Presets tab, or drop the @{preset_name} from the model name.",
                "type": "unknown_preset", "code": "unknown_preset", "preset": preset_name}})
        body["model"] = model_name
        # Scripts first: they rewrite the chat history; the preset's own blocks are added afterwards.
        before_regex = body.get("messages", [])
        body["messages"] = presets.apply_regex(before_regex, preset)
        # Lorebooks scan the chat as the model will see it (after the regex pass).
        books = [b for b in (db.get_lorebook(n) for n in preset.get("lorebooks") or []) if b]
        lore_result = presets.activate_lore(body["messages"], books) if books else None
        body["messages"] = presets.apply(body.get("messages", []), preset, lore_result)
        pipeline_info = {
            "preset": preset["name"],
            "blocks_on": sum(1 for b in preset.get("blocks", []) if b.get("enabled", True)),
            "regex_messages_changed": sum(1 for a, b in zip(before_regex, body["messages"]) if a != b) if len(before_regex) == len(body["messages"]) else None,
            "lorebooks_linked": list(preset.get("lorebooks") or []),
            "lore_fired": [{k: f.get(k) for k in ("lorebook", "name", "position", "chars", "via")} for f in (lore_result.fired if lore_result else [])][:40],
            "lore_dropped": len(lore_result.dropped) if lore_result else 0,
            "lore_warnings": list(lore_result.warnings)[:10] if lore_result else [],
            "messages_after_preset": len(body["messages"]),
        }

    # Check persona mapping (e.g. GPT-6 Astra, Claude 5.1 Fable, Claude 5 Fable, and thinking variants)
    persona_cfg = personas.get_persona_config(model_name) if personas else None
    if persona_cfg:
        backend_model = persona_cfg.backend_model
        body["model"] = backend_model
        body["messages"] = personas.inject_persona_messages(body.get("messages", []), persona_cfg)
        if persona_cfg.thinking_budget and "thinking_budget" not in body:
            body["thinking_budget"] = persona_cfg.thinking_budget
    else:
        backend_model = model_name

    # Universal Artifacts system prompt injection (supports all models: GPT, Claude, Gemini, DeepSeek, Qwen, etc.)
    if "artifacts" in locals() or "artifacts" in globals():
        artifacts_enabled = body.get("artifacts") is True or request.headers.get("x-singularity-artifacts") == "true"
        if artifacts_enabled:
            body["messages"] = artifacts.inject_artifacts_prompt(body.get("messages", []), enabled=True)

    res = resolve_model_provider(model_name)
    if isinstance(res, tuple):
        provider_id, target_port = res
    else:
        provider_id = res
        meta_cfg = providers.PROVIDERS_CONFIG.get(provider_id, providers.PROVIDERS_CONFIG.get("chatgpt", {}))
        target_port = meta_cfg.get("port", 8000)

    # 1. Look up persistent model settings in Singularity SQLite DB
    model_cfg = db.get_model_settings(model_name)
    thinking_override = body.pop("singularity_thinking_override", None) is True
    thinking_cap = model_cfg.get("thinking_budget")
    if "thinking_budget" in body and (thinking_cap is None or thinking_override):
        thinking_cap = body.get("thinking_budget")

    # Enforce Thinking Budget Cap globally across all incoming gateway requests
    if thinking_cap is not None:
        try:
            thinking_cap_int = max(0, int(thinking_cap))
            body["thinking_budget"] = thinking_cap_int

            # Provider-specific parameter translation
            if provider_id in ("claude", "anthropic"):
                if thinking_cap_int <= 0:
                    body["thinking"] = {"type": "disabled"}
                else:
                    body["thinking"] = {
                        "type": "enabled",
                        "budget_tokens": thinking_cap_int,
                    }
                    if body.get("max_tokens") and int(body["max_tokens"]) <= thinking_cap_int:
                        body["max_tokens"] = thinking_cap_int + 4096
                    elif not body.get("max_tokens"):
                        body["max_tokens"] = thinking_cap_int + 4096

            elif provider_id in ("gemini", "google"):
                if thinking_cap_int <= 0:
                    body["thinking"] = {"type": "disabled"}
                else:
                    body["thinking"] = {"type": "enabled", "budget_tokens": thinking_cap_int}
                if "generationConfig" not in body or not isinstance(body["generationConfig"], dict):
                    body["generationConfig"] = {}
                body["generationConfig"]["thinkingConfig"] = {"thinkingBudget": thinking_cap_int}

            elif provider_id in ("chatgpt", "openai"):
                if thinking_cap_int <= 0:
                    body["reasoning_effort"] = "low"
                elif thinking_cap_int <= 4096:
                    body["reasoning_effort"] = "low"
                elif thinking_cap_int <= 16384:
                    body["reasoning_effort"] = "medium"
                else:
                    body["reasoning_effort"] = "high"
                body["max_completion_tokens"] = thinking_cap_int

            elif provider_id in ("deepseek", "deepseek-ai"):
                body["thinking_enabled"] = thinking_cap_int > 0
                body["thinking"] = thinking_cap_int > 0
                body["thinking_budget"] = thinking_cap_int

            elif provider_id in ("kimi", "moonshot"):
                body["thinking"] = thinking_cap_int > 0
                body["thinking_budget"] = thinking_cap_int

            elif provider_id in ("qwen", "qwen-ai", "tongyi"):
                body["thinking_enabled"] = thinking_cap_int > 0
                body["thinking_mode"] = "Auto" if thinking_cap_int > 0 else "Disabled"
                body["thinking_budget"] = thinking_cap_int

            elif provider_id in ("glm", "zhipu"):
                body["reasoning_effort"] = "low" if thinking_cap_int <= 4096 else "high" if thinking_cap_int > 16384 else "medium"
                body["thinking_budget"] = thinking_cap_int
        except Exception:
            pass

    # Model configuration fallbacks for max_tokens & temperature
    if "max_tokens" in model_cfg and "max_tokens" not in body:
        try:
            body["max_tokens"] = int(model_cfg["max_tokens"])
        except Exception:
            pass
    if "temperature" in model_cfg and "temperature" not in body:
        try:
            body["temperature"] = float(model_cfg["temperature"])
        except Exception:
            pass

    # Chat tools (web search and so on). Opt-in: nothing changes unless the request asks for them.
    tool_names = body.pop("singularity_tools", None)
    tool_max_steps = body.pop("singularity_max_steps", None)
    if tool_names is not None:
        known = {t.name for t in chat_tools.all_tools()}
        if not isinstance(tool_names, list) or any(not isinstance(n, str) for n in tool_names):
            return JSONResponse(status_code=400, content={"error": {
                "message": "singularity_tools must be a list of tool names.", "type": "invalid_request_error"}})
        unknown = sorted(set(tool_names) - known)
        if unknown:
            return JSONResponse(status_code=400, content={"error": {
                "message": f"Unknown tool: {', '.join(unknown)}. Available: {', '.join(sorted(known))}.",
                "type": "invalid_request_error"}})
    tool_names = list(dict.fromkeys(tool_names or []))
    tool_guidance = ""
    preset_tools = bool(preset and preset.get("tools") and not tool_names)
    if preset_tools:
        tool_names = list(preset["tools"])
        tool_max_steps = preset.get("tool_max_steps")
        if preset.get("tool_guidance_on", True):
            tool_guidance = (preset.get("tool_guidance") or "").strip() or tools_protocol.DEFAULT_GUIDANCE
        pipeline_info["search_focus"] = (
            "off" if not preset.get("tool_guidance_on", True)
            else "preset text" if (preset.get("tool_guidance") or "").strip() else "built-in text")
        pipeline_info["tool_max_steps"] = preset.get("tool_max_steps")
        pipeline_info["tools_from"] = "preset"
    elif tool_names:
        pipeline_info["tools_from"] = "request"

    # Forward kwargs to direct engines
    forward_kwargs = {
        k: v for k, v in body.items()
        if k not in ("messages", "model", "stream")
    }

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Singularity-Universal-Gateway/2.0",
    }

    # Pass through incoming authorization header or look up default account token
    incoming_auth = request.headers.get("Authorization")
    meta = providers.PROVIDERS_CONFIG.get(provider_id, {})
    external = None
    if provider_id == "external":
        external = db.find_connection_for_model(model_name)
        meta = {"name": external[0]["name"] if external else "external"}
    if incoming_auth:
        headers["Authorization"] = incoming_auth
    elif meta.get("auth_env"):
        env_token = os.getenv(meta["auth_env"])
        if env_token:
            headers["Authorization"] = f"Bearer {env_token}"
        elif meta.get("auth_header"):
            headers["Authorization"] = meta["auth_header"]
    elif meta.get("auth_header"):
        headers["Authorization"] = meta["auth_header"]

    is_stream = body.get("stream", False)
    simulate_requested = is_simulation_mode() or body.get("simulate", False)

    # Extract user prompt text for modality detection & simulation
    messages = body.get("messages", [])
    prompt_text = ""
    for m in reversed(messages):
        if m.get("role") == "user":
            content = m.get("content", "")
            if isinstance(content, str):
                prompt_text = content
            elif isinstance(content, list):
                prompt_text = " ".join(item.get("text", "") for item in content if isinstance(item, dict))
            break

    effective_thinking_budget = body.get("thinking_budget")

    if simulate_requested:
        if is_stream:
            return StreamingResponse(
                generate_simulated_stream(
                    model_name,
                    provider_id,
                    prompt_text=prompt_text,
                    thinking_budget=effective_thinking_budget,
                ),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                    "X-Singularity-Provider": provider_id,
                    "X-Singularity-Simulated": "true",
                },
            )
        else:
            sim_content = _get_simulated_response_payload(model_name, provider_id, prompt_text)
            choice_msg = {
                "role": "assistant",
                "content": sim_content,
            }
            if effective_thinking_budget and effective_thinking_budget > 0:
                choice_msg["reasoning_content"] = (
                    f"Simulated reasoning trace for {model_name} (Thinking budget cap: {effective_thinking_budget:,} tokens)"
                )
            return JSONResponse(
                status_code=200,
                content={
                    "id": f"chatcmpl-sim-{int(time.time()*1000)}",
                    "object": "chat.completion",
                    "created": int(time.time()),
                    "model": model_name,
                    "choices": [{
                        "index": 0,
                        "message": choice_msg,
                        "finish_reason": "stop",
                    }],
                    "usage": {"prompt_tokens": 10, "completion_tokens": 15, "total_tokens": 25},
                },
            )

    if external is not None and external[0]["requires_key"] and not external[0].get("api_key"):
        return JSONResponse(status_code=424, content={"error": {
            "message": f"{external[0]['name']} needs an API key. Add one under API connections in Cookie Stacker & Accounts.",
            "type": "missing_credentials", "code": "missing_credentials", "provider": "external"}})
    if providers.missing_credentials(provider_id):
        p_name = meta.get("name", provider_id)
        return JSONResponse(
            status_code=424,
            content={
                "error": {
                    "message": f"No {p_name} account is set up. Add one in Cookie Stacker & Accounts.",
                    "type": "missing_credentials",
                    "code": "missing_credentials",
                    "provider": provider_id,
                }
            },
        )

    # The request log keeps a full account of requests that use a preset or tools
    trace = None
    if (preset or tool_names) and db.request_log_settings()["enabled"]:
        pipeline_info["search_backend"] = (db.get_setting("search_backend", "auto") or "auto") if tool_names else None
        trace = requestlog.Trace(
            requested_model=str(requested_model), model=str(backend_model), preset=preset["name"] if preset else None,
            provider=provider_id, origin=request.headers.get("origin", ""), stream=bool(body.get("stream", False)),
            incoming=incoming_messages, tool_names=tool_names,
            tag=re.sub(r"[^A-Za-z0-9_.:-]", "", request.headers.get("x-singularity-tag", ""))[:80])
        trace.pipeline(**pipeline_info)

    def _save_trace():
        if trace is None or trace.finished:
            return
        trace.finished = True
        try:
            db.add_request_log(trace.record())
        except Exception:
            logging.getLogger("singularity.requestlog").exception("could not save the request log")

    async def _traced(stream, step):
        text, thoughts, failed = [], [], ""
        try:
            async for chunk in stream:
                choice = (chunk.get("choices") or [{}])[0]
                delta = choice.get("delta") or {}
                if isinstance(delta.get("content"), str):
                    if choice.get("finish_reason") == "error":
                        failed = delta["content"]
                    else:
                        text.append(delta["content"])
                if isinstance(delta.get("reasoning_content"), str):
                    thoughts.append(delta["reasoning_content"])
                if chunk.get("error"):
                    failed = str(chunk["error"])
                yield chunk
        finally:
            trace.output(step, "".join(text), "".join(thoughts), failed)
            aclose = getattr(stream, "aclose", None)
            if aclose:
                try:
                    await aclose()
                except Exception:
                    pass

    def _engine_stream(msgs):
        stream = engines.stream_chat(provider_id, backend_model, msgs, stream=True, **forward_kwargs)
        return _traced(stream, trace.sent(msgs)) if trace is not None else stream

    def _chat_source():
        if not tool_names:
            return _engine_stream(body.get("messages", []))
        return tools_loop.run(
            _engine_stream, body.get("messages", []), tool_names,
            model=requested_model, max_steps=tool_max_steps, get_setting=db.get_setting,
            cite=not preset_tools, guidance=tool_guidance,
        )

    # Direct in-process execution for all native engines
    if is_stream:
        async def direct_stream_generator() -> AsyncIterator[bytes]:
            rewriter = personas.PersonaStreamRewriter(persona_cfg) if persona_cfg else None
            smoothing_enabled = body.get("smooth", True) is not False and body.get("cadence_smoothing", True) is not False
            raw_source = _chat_source()
            source = smooth_chat_stream(raw_source, target_interval=0.035, max_chars=40) if smoothing_enabled else raw_source
            try:
                async for chunk in source:
                    if trace is not None:
                        trace.feed(chunk)
                    chunk["model"] = requested_model
                    choices = chunk.get("choices", [])
                    if choices:
                        delta = choices[0].get("delta", {})
                        if preset_tools and delta.pop("singularity_event", None) is not None and not delta:
                            continue
                        if "content" in delta and isinstance(delta["content"], str):
                            delta["content"] = re.sub(r"※[^\s]*", "", delta["content"])
                            delta["content"] = re.sub(r"\bcite[a-zA-Z0-9_]*turn[a-zA-Z0-9_]*\b", "", delta["content"])
                            delta["content"] = re.sub(r"\bturn\d+[a-zA-Z0-9_]*\b", "", delta["content"])
                            delta["content"] = re.sub(r"[\ue200-\ue20f]message_reaction[\ue200-\ue20f][^\ue200-\ue20f]*[\ue200-\ue20f]", "", delta["content"])
                            delta["content"] = re.sub(r"[\ue200-\ue20f]", "", delta["content"])
                    if rewriter:
                        choices = chunk.get("choices", [])
                        if choices:
                            delta = choices[0].get("delta", {})
                            finish_reason = choices[0].get("finish_reason")
                            if "content" in delta:
                                new_c = rewriter.process(delta["content"])
                                if finish_reason:
                                    new_c += rewriter.finish()
                                if new_c or finish_reason:
                                    delta["content"] = new_c
                                    yield f"data: {json.dumps(chunk)}\n\n".encode("utf-8")
                                continue
                            if finish_reason:
                                rem = rewriter.finish()
                                if rem:
                                    flush_chunk = {
                                        "id": chunk.get("id", f"chatcmpl-{uuid.uuid4().hex[:8]}"),
                                        "object": "chat.completion.chunk",
                                        "created": chunk.get("created", int(time.time())),
                                        "model": requested_model,
                                        "choices": [{"index": 0, "delta": {"content": rem}, "finish_reason": None}],
                                    }
                                    yield f"data: {json.dumps(flush_chunk)}\n\n".encode("utf-8")
                    yield f"data: {json.dumps(chunk)}\n\n".encode("utf-8")
                if rewriter:
                    rem = rewriter.finish()
                    if rem:
                        flush_chunk = {
                            "id": f"chatcmpl-{uuid.uuid4().hex[:8]}",
                            "object": "chat.completion.chunk",
                            "created": int(time.time()),
                            "model": requested_model,
                            "choices": [{"index": 0, "delta": {"content": rem}, "finish_reason": None}],
                        }
                        yield f"data: {json.dumps(flush_chunk)}\n\n".encode("utf-8")
                yield b"data: [DONE]\n\n"
            except Exception as inner_e:
                p_name = meta.get("name", provider_id)
                err_msg = f"Provider {p_name} error: {str(inner_e)}"
                if trace is not None:
                    trace.error = trace.error or err_msg
                yield f"data: {json.dumps({'error': err_msg})}\n\n".encode("utf-8")
                yield b"data: [DONE]\n\n"
            finally:
                aclose = getattr(source, "aclose", None)
                if aclose:
                    try:
                        await aclose()
                    except Exception:
                        pass
                if smoothing_enabled and raw_source != source:
                    raw_aclose = getattr(raw_source, "aclose", None)
                    if raw_aclose:
                        try:
                            await raw_aclose()
                        except Exception:
                            pass
                _save_trace()

        return StreamingResponse(
            direct_stream_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
                "X-Singularity-Provider": provider_id,
            },
        )
    elif tool_names:
        recorder = tools_loop.StepRecorder()
        try:
            source = _chat_source()
            try:
                async for chunk in source:
                    recorder.feed(chunk)
                    if trace is not None:
                        trace.feed(chunk)
            finally:
                await source.aclose()
        except Exception as inner_e:
            recorder.error = recorder.error or str(inner_e)
        if trace is not None:
            trace.error = trace.error or recorder.error
        _save_trace()
        if recorder.error:
            raise HTTPException(status_code=502, detail=f"Provider {meta.get('name', provider_id)} error: {recorder.error}")
        content = recorder.content
        if persona_cfg:
            content = personas.sanitize_text(content, persona_cfg)
        message = {"role": "assistant", "content": content}
        if not preset_tools:
            message["singularity_steps"] = recorder.steps
        if recorder.reasoning:
            message["reasoning_content"] = recorder.reasoning
        return JSONResponse(status_code=200, content={
            "id": f"chatcmpl-tools-{uuid.uuid4().hex[:12]}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": requested_model,
            "choices": [{"index": 0, "message": message, "finish_reason": "stop"}],
        })
    else:
        try:
            step = trace.sent(body.get("messages", [])) if trace is not None else 0
            data = await engines.generate_chat(provider_id, backend_model, body.get("messages", []), **forward_kwargs)
            if trace is not None:
                reply = ((data.get("choices") or [{}])[0].get("message") or {})
                trace.set_reply(reply.get("content") or "", reply.get("reasoning_content") or "")
                trace.output(step, trace.visible, trace.visible_reasoning)
                _save_trace()
            if preset:
                data["model"] = requested_model
            if persona_cfg:
                data["model"] = requested_model
                for c in data.get("choices", []):
                    if "message" in c and "content" in c["message"]:
                        c["message"]["content"] = personas.sanitize_text(c["message"]["content"], persona_cfg)
            return JSONResponse(status_code=200, content={
                **data,
                "model": requested_model,
            })
        except Exception as inner_e:
            if trace is not None:
                trace.error = str(inner_e)
                _save_trace()
            p_name = meta.get("name", provider_id)
            raise HTTPException(
                status_code=502,
                detail=f"Provider {p_name} error: {str(inner_e)}",
            )


    if is_stream:
        async def stream_generator() -> AsyncIterator[bytes]:
            client = httpx.AsyncClient(timeout=120.0)
            yielded_any_bytes = False
            rewriter = personas.PersonaStreamRewriter(persona_cfg) if persona_cfg else None
            try:
                async with client.stream("POST", target_url, json=body, headers=headers) as upstream:
                    if upstream.status_code < 400:
                        if persona_cfg:
                            async for line in upstream.aiter_lines():
                                if not line:
                                    continue
                                line = line.strip()
                                if line.startswith("data: "):
                                    data_str = line[6:].strip()
                                    if data_str == "[DONE]":
                                        break
                                    try:
                                        chunk = json.loads(data_str)
                                        chunk["model"] = requested_model
                                        choices = chunk.get("choices", [])
                                        if choices:
                                            delta = choices[0].get("delta", {})
                                            finish_reason = choices[0].get("finish_reason")
                                            if "content" in delta:
                                                new_c = rewriter.process(delta["content"])
                                                if new_c:
                                                    delta["content"] = new_c
                                                    yielded_any_bytes = True
                                                    yield f"data: {json.dumps(chunk)}\n\n".encode("utf-8")
                                                continue
                                            if finish_reason:
                                                rem = rewriter.finish()
                                                if rem:
                                                    flush_chunk = {
                                                        "id": chunk.get("id", f"chatcmpl-{uuid.uuid4().hex[:8]}"),
                                                        "object": "chat.completion.chunk",
                                                        "created": chunk.get("created", int(time.time())),
                                                        "model": requested_model,
                                                        "choices": [{"index": 0, "delta": {"content": rem}, "finish_reason": None}],
                                                    }
                                                    yielded_any_bytes = True
                                                    yield f"data: {json.dumps(flush_chunk)}\n\n".encode("utf-8")
                                        yielded_any_bytes = True
                                        yield f"data: {json.dumps(chunk)}\n\n".encode("utf-8")
                                    except Exception:
                                        yielded_any_bytes = True
                                        yield f"{line}\n\n".encode("utf-8")
                            if rewriter:
                                rem = rewriter.finish()
                                if rem:
                                    flush_chunk = {
                                        "id": f"chatcmpl-{uuid.uuid4().hex[:8]}",
                                        "object": "chat.completion.chunk",
                                        "created": int(time.time()),
                                        "model": requested_model,
                                        "choices": [{"index": 0, "delta": {"content": rem}, "finish_reason": None}],
                                    }
                                    yield f"data: {json.dumps(flush_chunk)}\n\n".encode("utf-8")
                            yield b"data: [DONE]\n\n"
                            return
                        else:
                            async for chunk in upstream.aiter_bytes():
                                if chunk:
                                    yielded_any_bytes = True
                                    yield chunk
                            return
            except Exception:
                pass
            finally:
                await client.aclose()

            # If bytes were already emitted to the client, DO NOT run fallback into the same stream!
            if yielded_any_bytes:
                yield b"data: [DONE]\n\n"
                return

            # Direct in-process native engine fallback (when upstream daemon is down or returned >= 400)
            try:
                smoothing_enabled = body.get("smooth", True) is not False and body.get("cadence_smoothing", True) is not False
                raw_fallback = engines.stream_chat(provider_id, backend_model, body.get("messages", []), stream=True, **forward_kwargs)
                fallback_source = smooth_chat_stream(raw_fallback, target_interval=0.035, max_chars=40) if smoothing_enabled else raw_fallback
                async for chunk in fallback_source:
                    chunk["model"] = requested_model
                    if rewriter:
                        choices = chunk.get("choices", [])
                        if choices:
                            delta = choices[0].get("delta", {})
                            finish_reason = choices[0].get("finish_reason")
                            if "content" in delta:
                                new_c = rewriter.process(delta["content"])
                                if new_c:
                                    delta["content"] = new_c
                                    yield f"data: {json.dumps(chunk)}\n\n".encode("utf-8")
                                continue
                            if finish_reason:
                                rem = rewriter.finish()
                                if rem:
                                    flush_chunk = {
                                        "id": chunk.get("id", f"chatcmpl-{uuid.uuid4().hex[:8]}"),
                                        "object": "chat.completion.chunk",
                                        "created": chunk.get("created", int(time.time())),
                                        "model": requested_model,
                                        "choices": [{"index": 0, "delta": {"content": rem}, "finish_reason": None}],
                                    }
                                    yield f"data: {json.dumps(flush_chunk)}\n\n".encode("utf-8")
                    yield f"data: {json.dumps(chunk)}\n\n".encode("utf-8")
                if rewriter:
                    rem = rewriter.finish()
                    if rem:
                        flush_chunk = {
                            "id": f"chatcmpl-{uuid.uuid4().hex[:8]}",
                            "object": "chat.completion.chunk",
                            "created": int(time.time()),
                            "model": requested_model,
                            "choices": [{"index": 0, "delta": {"content": rem}, "finish_reason": None}],
                        }
                        yield f"data: {json.dumps(flush_chunk)}\n\n".encode("utf-8")
                yield b"data: [DONE]\n\n"
                return
            except Exception as inner_e:
                p_name = meta.get("name", provider_id)
                err_msg = f"Provider {p_name} error: {str(inner_e)}"
                yield f"data: {json.dumps({'error': err_msg})}\n\n".encode("utf-8")
                yield b"data: [DONE]\n\n"
            finally:
                aclose = getattr(fallback_source, "aclose", None) if "fallback_source" in locals() else None
                if aclose:
                    try:
                        await aclose()
                    except Exception:
                        pass
                if "smoothing_enabled" in locals() and smoothing_enabled and "raw_fallback" in locals() and raw_fallback != fallback_source:
                    raw_aclose = getattr(raw_fallback, "aclose", None)
                    if raw_aclose:
                        try:
                            await raw_aclose()
                        except Exception:
                            pass

        return StreamingResponse(
            stream_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
                "X-Singularity-Provider": provider_id,
            },
        )

    # Non-streaming request
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            resp = await client.post(target_url, json=body, headers=headers)
            if resp.status_code < 400:
                try:
                    data = resp.json()
                    if persona_cfg:
                        data["model"] = requested_model
                        for c in data.get("choices", []):
                            if "message" in c and "content" in c["message"]:
                                c["message"]["content"] = personas.sanitize_text(c["message"]["content"], persona_cfg)
                    return JSONResponse(status_code=resp.status_code, content=data)
                except Exception:
                    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))
        except Exception:
            pass

    # Direct in-process native engine fallback
    try:
        data = await engines.generate_chat(provider_id, backend_model, body.get("messages", []), **forward_kwargs)
        if persona_cfg:
            data["model"] = requested_model
            for c in data.get("choices", []):
                if "message" in c and "content" in c["message"]:
                    c["message"]["content"] = personas.sanitize_text(c["message"]["content"], persona_cfg)
        return JSONResponse(status_code=200, content=data)
    except Exception as inner_e:
        raise HTTPException(
            status_code=502,
            detail=f"Provider {meta['name']} error: {str(inner_e)}",
        )


@app.post("/v1/images/generations")
async def image_generations(request: Request):
    """Route image generation requests to Gemini, Grok, or GLM."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    model = body.get("model", "gemini-3.8-flash")
    provider_id = resolve_model_provider(model)
    meta = PROVIDERS_CONFIG.get(provider_id, PROVIDERS_CONFIG["gemini"])

    simulate_requested = is_simulation_mode() or body.get("simulate", False)
    if simulate_requested:
        return JSONResponse(status_code=200, content={
            "created": int(time.time()),
            "data": [{
                "url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1024&q=80",
                "revised_prompt": body.get("prompt", "A high-fidelity futuristic rendering generated by Singularity")
            }]
        })

    target_port = meta["port"]
    target_host = providers.get_provider_host(provider_id)
    target_url = f"http://{target_host}:{target_port}/v1/images/generations"
    headers = {"Content-Type": "application/json"}
    if meta["auth_header"]:
        headers["Authorization"] = meta["auth_header"]

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            resp = await client.post(target_url, json=body, headers=headers)
            try:
                return JSONResponse(status_code=resp.status_code, content=resp.json())
            except Exception:
                return Response(content=resp.content, status_code=resp.status_code)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Image generation failed: {str(e)}")


# -------------------------------------------------------------------
# Singularity Management APIs (/api)
# -------------------------------------------------------------------

@app.get("/healthz")
async def health():
    return {"status": "ok", "app": "Singularity", "version": "1.0.0", "port": 9000}


# -------------------------------------------------------------------
# Gateway Authentication (browser session login for off-machine access)
# -------------------------------------------------------------------

@app.get("/api/auth/status")
async def api_auth_status(request: Request):
    headers = dict(request.headers)
    client_ip = request.client.host if request.client else None
    return {
        "authenticated": security.is_authenticated(client_ip, headers),
        "local": security.is_trusted_local(client_ip, headers),
        "lan_mode": security.is_lan_mode(),
    }


@app.post("/api/auth/login")
async def api_auth_login(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    key = str(body.get("key", "")) if isinstance(body, dict) else ""
    if not security.check_key(key):
        await asyncio.sleep(0.5)
        return JSONResponse({"status": "error", "message": "Invalid gateway key"}, status_code=401)
    secure = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
    resp = JSONResponse({"status": "ok", "token": security.session_token(), "key": key.strip()})
    resp.set_cookie(
        security.SESSION_COOKIE,
        security.session_token(),
        max_age=60 * 60 * 24 * 365,
        httponly=True,
        samesite="lax",
        secure=secure,
        path="/",
    )
    return resp


@app.post("/api/auth/logout")
async def api_auth_logout():
    resp = JSONResponse({"status": "ok"})
    resp.delete_cookie(security.SESSION_COOKIE, path="/")
    return resp


@app.get("/api/services")
async def api_get_services():
    services = await get_all_services_status()
    # Also attach Singularity itself
    singularity_info = {
        "id": "singularity",
        "name": "Singularity Hub",
        "badge": "Core Gateway",
        "port": 9000,
        "color": "#D97757",
        "pid": os.getpid(),
        "running": True,
        "latency_ms": 0.5,
        "health_path": "/healthz",
        "cookie_label": "System Master Gateway",
    }
    return {"services": services, "hub": singularity_info}


def get_lan_ip() -> str:
    """Detect the host machine's primary local network IP."""
    import socket
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.settimeout(0.2)
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"


@app.get("/api/tavern/status")
async def api_tavern_status(request: Request):
    """Detect if Tavern Web Studio is running on default or alternate ports."""
    import socket

    def is_port_open(port: int) -> bool:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.2)
                return s.connect_ex(("127.0.0.1", port)) == 0
        except Exception:
            return False

    lan_ip = get_lan_ip()
    req_host = request.headers.get("host", "localhost:9000").split(":")[0]
    scheme = request.url.scheme or "http"
    effective_host = req_host
    if effective_host in ("0.0.0.0", "::", ""):
        effective_host = "localhost"

    # Check port 5173 (Vite dev) or 3001 (standalone Express)
    active_client = None
    if is_port_open(5173):
        active_client = 5173
    elif is_port_open(3001):
        active_client = 3001
    elif is_port_open(5180):
        active_client = 5180

    if active_client:
        return {
            "running": True,
            "port": active_client,
            "client_url": f"{scheme}://{effective_host}:{active_client}",
            "api_url": f"{scheme}://{effective_host}:3001",
            "lan_url": f"http://{lan_ip}:{active_client}",
            "lan_ip": lan_ip,
        }

    return {
        "running": False,
        "port": 5173,
        "client_url": f"{scheme}://{effective_host}:5173",
        "api_url": f"{scheme}://{effective_host}:3001",
        "lan_url": f"http://{lan_ip}:5173",
        "lan_ip": lan_ip,
    }


@app.post("/api/tavern/start")
async def api_tavern_start(request: Request = None):
    """Start Tavern Studio natively in the background if not already running."""
    import socket, subprocess, os, shutil

    def is_port_open(port: int) -> bool:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.2)
                return s.connect_ex(("127.0.0.1", port)) == 0
        except Exception:
            return False

    req_host = "localhost"
    scheme = "http"
    if request:
        try:
            req_host = request.headers.get("host", "localhost:9000").split(":")[0]
            scheme = request.url.scheme or "http"
        except Exception:
            pass
    effective_host = req_host
    if effective_host in ("0.0.0.0", "::", ""):
        effective_host = "localhost"

    if is_port_open(5173):
        return {"status": "already_running", "port": 5173, "client_url": f"{scheme}://{effective_host}:5173"}
    if is_port_open(3001):
        return {"status": "already_running", "port": 3001, "client_url": f"{scheme}://{effective_host}:3001"}

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    tav_dir = None
    for candidate in ["TAVERN", "TAV-TEST"]:
        d = os.path.join(root_dir, candidate)
        if os.path.isdir(d) and os.path.isfile(os.path.join(d, "package.json")):
            tav_dir = d
            break

    if not tav_dir:
        return {"status": "error", "error": "Tavern directory not found"}

    env = dict(os.environ)
    # Tavern's API has no login: keep it on loopback unless the user opted into LAN mode.
    env["API_HOST"] = "0.0.0.0" if security.is_lan_mode() else "127.0.0.1"
    env.pop("RP_ALLOWED_ORIGINS", None)

    # Detect modern Node.js or Bun across nvm, fnm, local paths
    extra_paths = []
    bun_bin = os.path.expanduser("~/.bun/bin")
    if os.path.isdir(bun_bin):
        extra_paths.append(bun_bin)

    nvm_dir = os.path.expanduser("~/.nvm/versions/node")
    if os.path.isdir(nvm_dir):
        try:
            versions = sorted(os.listdir(nvm_dir), reverse=True)
            for v in versions:
                p = os.path.join(nvm_dir, v, "bin")
                if os.path.isdir(p):
                    extra_paths.append(p)
        except Exception:
            pass

    fnm_dir = os.path.expanduser("~/.local/share/fnm/current/bin")
    if os.path.isdir(fnm_dir):
        extra_paths.append(fnm_dir)

    if sys.platform == "win32":
        win_candidates = [
            os.path.join(os.environ.get("ProgramFiles", r"C:\Program Files"), "nodejs"),
            os.path.join(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)"), "nodejs"),
            os.path.join(os.environ.get("APPDATA", ""), "npm"),
            os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs", "node"),
            os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs", "nodejs"),
            os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs", "bun"),
            os.path.join(os.environ.get("USERPROFILE", ""), ".bun", "bin"),
            os.path.join(os.environ.get("USERPROFILE", ""), "scoop", "shims"),
            os.environ.get("NVM_SYMLINK", ""),
            os.environ.get("NVM_HOME", ""),
            r"C:\ProgramData\chocolatey\bin",
            r"C:\tools\node",
        ]
        for p in win_candidates:
            if p and os.path.isdir(p) and p not in extra_paths:
                extra_paths.append(p)

    if extra_paths:
        env["PATH"] = os.pathsep.join(extra_paths) + os.pathsep + env.get("PATH", "")

    # Resolve exact runner path (supports bun.exe, npm.cmd, npm.exe)
    runner = (
        shutil.which("bun", path=env.get("PATH"))
        or shutil.which("bun.exe", path=env.get("PATH"))
        or shutil.which("npm", path=env.get("PATH"))
        or shutil.which("npm.cmd", path=env.get("PATH"))
        or shutil.which("npm.exe", path=env.get("PATH"))
    )

    if not runner and sys.platform == "win32":
        for cand_dir in extra_paths:
            for bin_name in ["bun.exe", "npm.cmd", "npm.exe"]:
                target = os.path.join(cand_dir, bin_name)
                if os.path.isfile(target):
                    runner = target
                    break
            if runner:
                break

    if not runner:
        return {
            "status": "error",
            "error": "Node.js (v20+) or Bun is required to launch Tavern Studio. Please install from https://nodejs.org",
        }

    # Windowless process flags for Windows
    startupinfo = None
    creationflags = 0
    if sys.platform == "win32":
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        startupinfo.wShowWindow = 0  # SW_HIDE
        creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)

    # Launch Tavern server natively in background
    try:
        if sys.platform == "win32":
            tav_bat = os.path.join(tav_dir, "run_tavern.bat")
            if os.path.isfile(tav_bat):
                cmd_str = f'cmd.exe /c "call "{tav_bat}""'
            else:
                cmd_str = f'"{runner}" run dev'
            subprocess.Popen(
                cmd_str,
                cwd=tav_dir,
                env=env,
                shell=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                stdin=subprocess.DEVNULL,
                startupinfo=startupinfo,
                creationflags=creationflags,
            )
        else:
            nm_path = os.path.join(tav_dir, "node_modules")
            if not os.path.isdir(nm_path):
                try:
                    subprocess.run(
                        [runner, "install"],
                        cwd=tav_dir,
                        env=env,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        timeout=180,
                    )
                except Exception:
                    pass

            subprocess.Popen(
                [runner, "run", "dev"],
                cwd=tav_dir,
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                stdin=subprocess.DEVNULL,
                start_new_session=True,
            )

    except Exception as e:
        return {"status": "error", "error": str(e)}

    # Wait up to 3 seconds for port to open
    for _ in range(10):
        await asyncio.sleep(0.3)
        if is_port_open(5173):
            return {"status": "started", "port": 5173, "client_url": f"{scheme}://{effective_host}:5173"}
        if is_port_open(3001):
            return {"status": "started", "port": 3001, "client_url": f"{scheme}://{effective_host}:3001"}

    return {"status": "started", "port": 5173, "client_url": f"{scheme}://{effective_host}:5173"}


@app.post("/api/services/start_all")
async def api_start_all():
    return start_all_services()


@app.post("/api/services/stop_all")
async def api_stop_all():
    return stop_all_services()


@app.post("/api/services/{provider_id}/start")
async def api_start_service(provider_id: str):
    res = start_provider(provider_id)
    return res


@app.post("/api/services/{provider_id}/stop")
async def api_stop_service(provider_id: str):
    res = stop_provider(provider_id)
    return res


@app.post("/api/services/{provider_id}/restart")
async def api_restart_service(provider_id: str):
    stop_provider(provider_id)
    time.sleep(1.0)
    return start_provider(provider_id)


@app.get("/api/simulation")
async def api_get_simulation():
    active = providers.is_simulation_active()
    return {
        "enabled": active,
        "mode": "simulated" if active else "live",
        "description": "Device Simulation Mode allows testing UI, models, and clients without local backends.",
    }


@app.post("/api/simulation")
async def api_toggle_simulation(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    enabled = body.get("enabled")
    if enabled is None:
        enabled = not providers.is_simulation_active()
    db.set_setting("simulation_mode", "1" if enabled else "0")
    return {
        "status": "ok",
        "enabled": bool(enabled),
        "mode": "simulated" if enabled else "live",
    }


@app.get("/api/config")
async def api_get_config():
    return {
        "simulation_mode": providers.is_simulation_active(),
        "remote_host": db.get_setting("remote_host", "127.0.0.1"),
        "settings": db.get_all_settings(),
        "vault_stats": db.get_stats(),
    }


# Settings the HTTP API may change. Everything else (provider PIDs, provider hosts)
# is written only by Singularity itself or the local CLI.
API_WRITABLE_SETTINGS = {"simulation_mode", "allowed_origins", "gateway_key"}


@app.get("/api/security/allowed-origins")
async def api_get_allowed_origins():
    origins = list(security._extra_allowed_origins())
    return {"allowed_origins": sorted(origins)}


@app.post("/api/security/allowed-origins")
async def api_add_allowed_origin(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    raw = body.get("origin", "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="origin string is required")
    
    cleaned = security._clean_origin_string(raw)
    if not cleaned:
        raise HTTPException(status_code=400, detail="Invalid origin format. Please enter a valid URL (e.g. https://lorebary.com)")
    
    current_raw = db.get_setting("allowed_origins", "")
    current_list = []
    for o in current_raw.split(","):
        c = security._clean_origin_string(o)
        if c and c not in current_list:
            current_list.append(c)
    
    candidates = [cleaned]
    # If a subdomain or domain was added (e.g. https://api.lorebary.com), also add root domain
    parts = urlsplit(cleaned)
    if parts.hostname and parts.hostname.count(".") >= 2:
        root_host = ".".join(parts.hostname.split(".")[-2:])
        root_origin = f"{parts.scheme}://{root_host}"
        if root_origin not in candidates and root_origin not in current_list:
            candidates.append(root_origin)

    if parts.hostname and "lorebary" in parts.hostname:
        for extra in ("https://lorebary.com", "https://lorebary.sophiamccarty.com", "https://sophiamccarty.com"):
            if extra not in candidates and extra not in current_list:
                candidates.append(extra)

    if parts.hostname and "janitor" in parts.hostname:
        for extra in ("https://janitorai.com", "https://www.janitorai.com", "https://janitor.ai"):
            if extra not in candidates and extra not in current_list:
                candidates.append(extra)

    for cand in candidates:
        if cand not in current_list:
            current_list.append(cand)

    db.set_setting("allowed_origins", ",".join(current_list))
    return {
        "status": "ok",
        "added": cleaned,
        "allowed_origins": sorted(list(security._extra_allowed_origins()))
    }


@app.delete("/api/security/allowed-origins")
async def api_delete_allowed_origin(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    raw = body.get("origin", "").strip()
    if not raw and "origin" in request.query_params:
        raw = request.query_params["origin"].strip()
    
    if not raw:
        raise HTTPException(status_code=400, detail="origin string is required")
    
    cleaned = security._clean_origin_string(raw) or raw.lower().rstrip("/")
    
    current_raw = db.get_setting("allowed_origins", "")
    current_list = []
    for o in current_raw.split(","):
        c = security._clean_origin_string(o) or o.strip().rstrip("/").lower()
        if c and c != cleaned and o.strip().rstrip("/").lower() != raw.lower().rstrip("/"):
            if c not in current_list:
                current_list.append(c)

    db.set_setting("allowed_origins", ",".join(current_list))
    return {
        "status": "ok",
        "deleted": cleaned,
        "allowed_origins": sorted(list(security._extra_allowed_origins()))
    }


@app.get("/api/security/gateway-key")
async def api_get_gateway_key():
    return {
        "status": "ok",
        "gateway_key": security.get_gateway_key()
    }


@app.post("/api/security/gateway-key")
async def api_set_gateway_key(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    action = body.get("action", "")
    if action == "rotate":
        new_key = security.rotate_gateway_key()
    else:
        raw_key = body.get("gateway_key", "")
        new_key = security.set_gateway_key(raw_key)
        
    return {
        "status": "ok",
        "gateway_key": new_key
    }


@app.post("/api/config")
async def api_set_config(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Expected a JSON object")
    rejected = sorted(k for k in body if k not in API_WRITABLE_SETTINGS)
    if rejected:
        raise HTTPException(status_code=400, detail=f"Settings not writable via API: {', '.join(rejected)}")
    for k, v in body.items():
        db.set_setting(k, str(v))
    return {
        "status": "ok",
        "settings": db.get_all_settings(),
    }


@app.get("/api/limits")
async def api_get_limits():
    return await get_all_limits()


@app.get("/api/models")
async def api_get_models():
    return {"models": get_dynamic_models_catalog()}


@app.get("/api/model-settings")
async def api_get_model_settings(model: Optional[str] = None):
    """Retrieve customized settings (thinking_budget cap, max_tokens, etc.) for models."""
    if model:
        return {"status": "ok", "model": model, "settings": db.get_model_settings(model)}
    return {"status": "ok", "settings": db.get_all_model_settings()}


@app.post("/api/model-settings")
async def api_save_model_settings(request: Request):
    """Persist thinking budget cap, max output tokens, and parameters for a model."""
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    model = (data.get("model") or "").strip()
    if not model:
        raise HTTPException(status_code=400, detail="Missing required 'model' field")

    cfg = {}
    if "thinking_budget" in data:
        try:
            cfg["thinking_budget"] = max(0, min(65536, int(data["thinking_budget"])))
        except (ValueError, TypeError):
            pass
    if "max_tokens" in data:
        try:
            cfg["max_tokens"] = max(1, min(131072, int(data["max_tokens"])))
        except (ValueError, TypeError):
            pass
    if "temperature" in data:
        try:
            cfg["temperature"] = round(max(0.0, min(2.0, float(data["temperature"]))), 2)
        except (ValueError, TypeError):
            pass
    if "system_prompt" in data:
        cfg["system_prompt"] = str(data["system_prompt"]).strip()

    apply_globally = data.get("apply_globally") is True or model.lower() in ("global", "default", "*")
    if apply_globally:
        db.set_global_settings(cfg)
    db.set_model_settings(model, cfg, sync_family=True)

    budget_val = cfg.get("thinking_budget")
    budget_label = f"{budget_val:,} tokens" if budget_val is not None and budget_val > 0 else "Off"
    if apply_globally:
        msg = f"Enforced globally across ALL models (Thinking cap: {budget_label})."
    else:
        msg = f"Enforced for '{model}' and all family aliases (Thinking cap: {budget_label})."

    return {
        "status": "ok",
        "message": msg,
        "settings": cfg,
    }


@app.delete("/api/model-settings")
async def api_delete_model_settings(request: Request, model: Optional[str] = None):
    """Reset model settings to default."""
    target_model = model
    if not target_model:
        try:
            body = await request.json()
            target_model = body.get("model")
        except Exception:
            pass
    if not target_model:
        raise HTTPException(status_code=400, detail="Missing model name")
    db.delete_model_settings(target_model)
    return {"status": "ok", "message": f"Model settings for '{target_model}' reset to defaults."}



@app.get("/api/accounts/validate")
async def api_validate_accounts(request: Request):
    """
    Probe each stacked account for the given provider and return live token validity.

    For ChatGPT: decodes the JWT exp field (instant, no network) or hits
    /api/auth/session for session-token based accounts.
    For Gemini: tries extracting SNlM0e from gemini.google.com with the stored cookie.
    For all others: returns db status as-is.

    Response: { "accounts": [{ "id", "identifier", "name", "plan", "valid": bool, "reason": str, "expires_at": int|null }] }
    """
    provider = request.query_params.get("provider", "chatgpt").lower().strip()
    try:
        accounts = db.get_accounts(provider)
    except Exception as e:
        return JSONResponse({"error": f"DB error: {str(e)}"}, status_code=500)

    results = []

    def _decode_jwt_local(token: str):
        """Decode JWT payload without verifying signature."""
        try:
            parts = token.split(".")
            if len(parts) < 2:
                return None
            padded = parts[1] + "=" * (-len(parts[1]) % 4)
            return json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))
        except Exception:
            return None

    if provider == "chatgpt":
        from singularity.engines.chatgpt import extract_chatgpt_credentials
        now = time.time()

        for acc in accounts:
            acc_id = acc.get("id")
            ident = acc.get("identifier") or acc.get("name") or str(acc_id)
            raw_token = acc.get("token", "")
            valid = False
            reason = "Unknown"
            expires_at = None

            try:
                creds = extract_chatgpt_credentials(raw_token)
                access_token = creds.get("access_token", "")
                session_token = creds.get("session_token", "")

                if access_token:
                    jwt = _decode_jwt_local(access_token)
                    if jwt:
                        exp = float(jwt.get("exp", 0))
                        expires_at = int(exp)
                        if exp > now + 30:
                            valid = True
                            reason = "Token valid"
                        else:
                            reason = "Access token expired"
                    else:
                        valid = True
                        reason = "Could not decode JWT (assuming valid)"
                elif session_token:
                    try:
                        async with httpx.AsyncClient(
                            timeout=10.0,
                            follow_redirects=True,
                            headers={
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
                                "Cookie": f"__Secure-next-auth.session-token={session_token}",
                                "Accept": "application/json",
                            }
                        ) as client:
                            r = await client.get("https://chatgpt.com/api/auth/session")
                            if r.status_code == 200:
                                data = r.json()
                                new_at = data.get("accessToken")
                                if new_at:
                                    jwt = _decode_jwt_local(new_at)
                                    if jwt:
                                        exp = float(jwt.get("exp", now + 3600))
                                        expires_at = int(exp)
                                    valid = True
                                    reason = "Session active"
                                else:
                                    reason = "Session expired or no access token returned"
                            elif r.status_code == 401:
                                reason = "Session token expired (401)"
                            else:
                                reason = f"Auth check returned HTTP {r.status_code}"
                    except Exception as probe_err:
                        reason = f"Network probe failed: {str(probe_err)[:80]}"
                else:
                    jwt = _decode_jwt_local(raw_token)
                    if jwt:
                        exp = float(jwt.get("exp", 0))
                        expires_at = int(exp)
                        if exp > now + 30:
                            valid = True
                            reason = "Raw token valid"
                        else:
                            reason = "Raw token expired"
                    else:
                        valid = True
                        reason = "Cannot decode (assuming active)"
            except Exception as e:
                reason = f"Validation error: {str(e)[:100]}"

            results.append({
                "id": acc_id,
                "identifier": ident,
                "name": acc.get("name") or ident,
                "plan": acc.get("plan", "FREE"),
                "valid": valid,
                "reason": reason,
                "expires_at": expires_at,
            })

    elif provider == "gemini":
        from singularity.engines.gemini import _get_gemini_session_context
        for acc in accounts:
            acc_id = acc.get("id")
            ident = acc.get("identifier") or acc.get("name") or str(acc_id)
            cookie_str = acc.get("token", "")
            valid = False
            reason = "Unknown"
            try:
                snlm0e, bl = await _get_gemini_session_context(cookie_str)
                if snlm0e:
                    valid = True
                    reason = "SNlM0e session active"
                else:
                    reason = "Could not extract SNlM0e — cookie likely expired or missing __Secure-1PSIDTS"
            except Exception as e:
                reason = f"Probe error: {str(e)[:100]}"
            results.append({
                "id": acc_id,
                "identifier": ident,
                "name": acc.get("name") or ident,
                "plan": acc.get("plan", "FREE"),
                "valid": valid,
                "reason": reason,
                "expires_at": None,
            })

    else:
        for acc in accounts:
            results.append({
                "id": acc.get("id"),
                "identifier": acc.get("identifier") or acc.get("name", ""),
                "name": acc.get("name", ""),
                "plan": acc.get("plan", "FREE"),
                "valid": acc.get("status", "active").lower() == "active",
                "reason": "Active in database",
                "expires_at": None,
            })

    return {"accounts": results}


@app.get("/api/cookies")
async def api_get_cookies():
    return get_stored_cookies()


@app.get("/api/cookies/export")
async def api_export_cookies():
    return db.export_all_json()


@app.post("/api/cookies/import")
async def api_import_cookies(request: Request):
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    try:
        res = db.import_all_json(data)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/cookies/{provider_id}")
async def api_save_cookies(provider_id: str, request: Request):
    body = await request.json()
    accounts = body.get("accounts", [])
    if isinstance(accounts, str):
        # Split by newlines (strictly NOT by comma)
        accounts = [line.strip() for line in accounts.splitlines() if line.strip()]
    res = save_stacked_cookies(provider_id, accounts)
    return res


@app.post("/api/cookies/{provider_id}/remove")
@app.delete("/api/cookies/{provider_id}")
async def api_remove_cookie(provider_id: str, request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    identifier = body.get("identifier")
    index = body.get("index")
    account_id = body.get("id")
    res = remove_stacked_cookie(provider_id, identifier=identifier, index=account_id if account_id is not None else index)
    return res


# -------------------------------------------------------------------
# Request Logs, API Connections, Test Bench, Tools Endpoints
# -------------------------------------------------------------------

async def _json_object(request: Request) -> Dict[str, Any]:
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="JSON body must be an object")
    return body


def _log_id(raw) -> Optional[int]:
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return None
    return value if value > 0 else None


@app.get("/api/request-logs")
async def api_list_request_logs(request: Request):
    q = request.query_params
    try:
        limit = int(q.get("limit", "50"))
    except ValueError:
        limit = 50
    outcome = q.get("outcome", "")
    if outcome and outcome not in requestlog.OUTCOMES:
        return JSONResponse(status_code=400, content={"error": {"message": f"outcome must be one of {', '.join(requestlog.OUTCOMES)}", "type": "invalid_request_error"}})
    only_tools = q.get("tools", "") in ("1", "true")
    return {"logs": db.list_request_logs(limit, only_tools, outcome), "settings": db.request_log_settings()}


@app.get("/api/request-logs/settings")
async def api_request_log_settings():
    return db.request_log_settings()


@app.put("/api/request-logs/settings")
async def api_set_request_log_settings(request: Request):
    body = await _json_object(request)
    try:
        return db.set_request_log_settings(body.get("enabled"), body.get("keep"))
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": {"message": str(e), "type": "invalid_request_error"}})


@app.get("/api/request-logs/{log_id}")
async def api_get_request_log(log_id: str):
    entry = db.get_request_log(_log_id(log_id) or 0)
    if not entry:
        return JSONResponse(status_code=404, content={"error": {"message": "No such log entry.", "type": "not_found"}})
    return entry


@app.delete("/api/request-logs/{log_id}")
async def api_delete_request_log(log_id: str):
    if not db.delete_request_log(_log_id(log_id) or 0):
        return JSONResponse(status_code=404, content={"error": {"message": "No such log entry.", "type": "not_found"}})
    return {"ok": True}


@app.delete("/api/request-logs")
async def api_clear_request_logs():
    return {"ok": True, "deleted": db.clear_request_logs()}


# External provider connections (OpenAI-compatible APIs)
@app.get("/api/connections")
async def api_list_connections():
    return {"connections": db.list_connections()}


@app.post("/api/connections")
async def api_create_connection(request: Request):
    body = await _json_object(request)
    try:
        return JSONResponse(db.create_connection(body), status_code=201)
    except conn_rules.ConnectionConfigError as e:
        return JSONResponse(status_code=409 if "already exists" in str(e) else 400, content={"error": {"message": str(e), "type": "invalid_request_error"}})


@app.put("/api/connections/{name}")
async def api_update_connection(name: str, request: Request):
    body = await _json_object(request)
    try:
        updated = db.update_connection(name, body)
    except conn_rules.ConnectionConfigError as e:
        return JSONResponse(status_code=409 if "already exists" in str(e) else 400, content={"error": {"message": str(e), "type": "invalid_request_error"}})
    return updated or JSONResponse(status_code=404, content={"error": {"message": "No such connection.", "type": "not_found"}})


@app.delete("/api/connections/{name}")
async def api_delete_connection(name: str):
    if not db.delete_connection(name):
        return JSONResponse(status_code=404, content={"error": {"message": "No such connection.", "type": "not_found"}})
    return {"ok": True}


@app.post("/api/connections/{name}/models")
async def api_refresh_connection_models(name: str):
    conn = db.get_connection(name, with_key=True)
    if not conn:
        return JSONResponse(status_code=404, content={"error": {"message": "No such connection.", "type": "not_found"}})
    try:
        ids = await openai_compat.fetch_models(conn)
    except conn_rules.ConnectionConfigError as e:
        return JSONResponse(status_code=502, content={"error": {"message": str(e), "type": "provider_error"}})
    db.set_connection_models(conn["name"], ids)
    return {"connection": db.get_connection(conn["name"]), "count": len(ids)}


# Test bench
_BENCH: Dict[str, Any] = {"task": None, "run_id": None, "cancel": False}
_bench_sender = None


def _bench_error(message: str, status: int = 400):
    return JSONResponse(status_code=status, content={"error": {"message": message, "type": "invalid_request_error"}})


@app.get("/api/bench/scenarios")
async def api_bench_scenarios():
    return {"builtin": bench.builtin_scenarios(), "custom": db.list_bench_scenarios(), "default_card": bench.DEFAULT_CARD}


@app.post("/api/bench/scenarios")
async def api_create_bench_scenario(request: Request):
    body = await _json_object(request)
    try:
        return JSONResponse(db.create_bench_scenario(body), status_code=201)
    except bench.BenchError as e:
        return _bench_error(str(e))


@app.put("/api/bench/scenarios/{scenario_id}")
async def api_update_bench_scenario(scenario_id: str, request: Request):
    body = await _json_object(request)
    try:
        updated = db.update_bench_scenario(_log_id(scenario_id) or 0, body)
    except bench.BenchError as e:
        return _bench_error(str(e))
    return updated or _bench_error("No such test.", 404)


@app.delete("/api/bench/scenarios/{scenario_id}")
async def api_delete_bench_scenario(scenario_id: str):
    return {"ok": True} if db.delete_bench_scenario(_log_id(scenario_id) or 0) else _bench_error("No such test.", 404)


@app.get("/api/bench/runs")
async def api_list_bench_runs():
    return {"runs": db.list_bench_runs(), "running": _BENCH["run_id"]}


@app.get("/api/bench/runs/{run_id}")
async def api_get_bench_run(run_id: str):
    run = db.get_bench_run(_log_id(run_id) or 0)
    return run or _bench_error("No such run.", 404)


@app.delete("/api/bench/runs/{run_id}")
async def api_delete_bench_run(run_id: str):
    return {"ok": True} if db.delete_bench_run(_log_id(run_id) or 0) else _bench_error("No such run, or it is still running.", 404)


@app.post("/api/bench/runs/{run_id}/cancel")
async def api_cancel_bench_run(run_id: str):
    if _BENCH["run_id"] is None or _BENCH["run_id"] != _log_id(run_id):
        return _bench_error("That run is not running.", 404)
    _BENCH["cancel"] = True
    return {"ok": True}


async def _bench_job(run_id: int, scenarios, model: str, preset: Dict[str, Any], card: str, sender):
    results: List[Dict[str, Any]] = []

    def on_result(result):
        results.append(result)
        db.save_bench_run(run_id, results)

    def find_log(tag):
        rows = db.list_request_logs(1, tag=tag)
        return db.get_request_log(rows[0]["id"]) if rows else None

    status = "done"
    try:
        await bench.run_scenarios(
            scenarios=scenarios, model=model, preset=preset, card=card, run_tag=f"bench-{run_id}", send=sender,
            find_log=find_log, on_result=on_result, cancelled=lambda: _BENCH["cancel"])
        if _BENCH["cancel"]:
            status = "cancelled"
    except Exception:
        logging.getLogger("singularity.bench").exception("bench run %s crashed", run_id)
        status = "error"
    finally:
        db.save_bench_run(run_id, results, status)
        _BENCH.update(task=None, run_id=None, cancel=False)


@app.post("/api/bench/runs")
async def api_start_bench_run(request: Request):
    body = await _json_object(request)
    if _BENCH["run_id"] is not None:
        return _bench_error("A test run is already going. Wait for it or cancel it.", 409)
    req_preset = body.get("preset")
    if (not req_preset or not str(req_preset).strip()) and db.list_presets():
        req_preset = db.list_presets()[0]["name"]
    preset = db.get_preset(req_preset) if isinstance(req_preset, str) else None
    if not preset:
        return _bench_error("Pick a preset that exists.")
    model = body.get("model")
    if not isinstance(model, str) or not model.strip() or "@" in model or len(model) > 80:
        return _bench_error("model must be a model name without an @ (the preset is added for you).")
    model = model.strip()
    if not db.request_log_settings()["enabled"]:
        return _bench_error("Switch the request log on first: the test checks each chat against it.")
    card = body.get("card", "")
    if not isinstance(card, str) or len(card) > 20_000:
        return _bench_error("card must be text of at most 20,000 characters.")
    pool = bench.builtin_scenarios() + db.list_bench_scenarios()
    wanted = body.get("scenarios")
    if wanted is not None:
        if not isinstance(wanted, list) or not all(isinstance(w, str) for w in wanted):
            return _bench_error("scenarios must be a list of test ids.")
        unknown = sorted(set(wanted) - {s["id"] for s in pool})
        if unknown:
            return _bench_error(f"Unknown test: {', '.join(unknown)}")
        pool = [s for s in pool if s["id"] in set(wanted)]
    if not pool:
        return _bench_error("Pick at least one test.")
    settings = {"tools": preset.get("tools", []), "tool_max_steps": preset.get("tool_max_steps"),
                "focus": "off" if not preset.get("tool_guidance_on", True) else "preset text" if (preset.get("tool_guidance") or "").strip() else "built-in text",
                "card": "custom" if card.strip() else "default"}
    run_id = db.create_bench_run(preset["name"], model, len(pool), settings)
    port = (request.scope.get("server") or (None, 9000))[1] or 9000
    sender = _bench_sender or (lambda model_ref, messages, tag: bench.http_sender(f"http://127.0.0.1:{port}", model_ref, messages, tag, 150.0))
    _BENCH.update(run_id=run_id, cancel=False, task=asyncio.create_task(_bench_job(run_id, pool, model, preset, card, sender)))
    return JSONResponse(db.get_bench_run(run_id), status_code=202)


@app.get("/api/tools")
async def api_get_tools():
    """Tools the chat can use, and which search backend would answer. Never includes the key."""
    search = tools_web_search.active_backend(db.get_setting)
    search["key_saved"] = bool((db.get_setting("search_api_key", "") or "").strip())
    search["backend_setting"] = (db.get_setting("search_backend", "auto") or "auto").lower()
    return {"tools": chat_tools.describe(), "search": search, "default_guidance": tools_protocol.DEFAULT_GUIDANCE}


# -------------------------------------------------------------------
# Presets, Lorebooks, Userscripts, and Chat History Endpoints
# -------------------------------------------------------------------

def _with_script_status(preset):
    """A preset for the dashboard: each regex script also says whether the gateway can run it on the prompt."""
    return {**preset, "regex_scripts": presets.regex_scripts.annotate(preset.get("regex_scripts") or [])}


@app.get("/v1/presets/{name}/display-scripts")
async def v1_preset_display_scripts(name: str):
    preset = db.get_preset(name)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    return presets.display_payload(preset)


@app.get("/userscripts/singularity-regex.user.js")
async def userscript_file(request: Request):
    host = request.headers.get("host") or "localhost:9000"
    scheme = "https" if request.headers.get("x-forwarded-proto") == "https" or request.url.scheme == "https" else "http"
    base_url = f"{scheme}://{host}"
    try:
        t_stat = tunnel.get_tunnel_status()
        ngrok_url = (t_stat.get("public_url") or "") if t_stat.get("status") == "online" else ""
    except Exception:
        ngrok_url = ""
    return Response(content=userscript.build(base_url, ngrok_url=ngrok_url), media_type="text/javascript",
                    headers={"Cache-Control": "no-store"})


def _lore_status(error: Exception) -> int:
    return 409 if "already exists" in str(error) else 400


@app.get("/api/lorebooks")
async def api_list_lorebooks():
    return {"lorebooks": db.list_lorebooks()}


@app.post("/api/lorebooks")
async def api_create_lorebook(request: Request):
    body = await _json_object(request)
    try:
        return JSONResponse(db.create_lorebook(body), status_code=201)
    except presets.LoreError as e:
        raise HTTPException(status_code=_lore_status(e), detail=str(e))


@app.post("/api/lorebooks/import")
async def api_import_lorebook(request: Request):
    body = await _json_object(request)
    name = body.get("name")
    if name is not None and not isinstance(name, str):
        raise HTTPException(status_code=400, detail="name must be text")
    name = (name or "").strip().lower()
    if not presets.lorebook.NAME_RE.match(name):
        name = presets.lorebook.lorebook_name_from(name)
    try:
        converted, report = presets.lorebook.from_st(body.get("st"), name)
        created = db.create_lorebook(converted)
    except presets.LoreError as e:
        raise HTTPException(status_code=_lore_status(e), detail=str(e))
    created.pop("entries", None)
    return JSONResponse({"lorebook": created, "report": report}, status_code=201)


@app.get("/api/lorebooks/{name}")
async def api_get_lorebook(name: str):
    book = db.get_lorebook(name)
    if not book:
        raise HTTPException(status_code=404, detail="Lorebook not found")
    return book


@app.put("/api/lorebooks/{name}")
async def api_update_lorebook(name: str, request: Request):
    body = await _json_object(request)
    try:
        book = db.update_lorebook(name, body)
    except presets.LoreError as e:
        raise HTTPException(status_code=_lore_status(e), detail=str(e))
    if not book:
        raise HTTPException(status_code=404, detail="Lorebook not found")
    return book


@app.delete("/api/lorebooks/{name}")
async def api_delete_lorebook(name: str):
    if not db.delete_lorebook(name):
        raise HTTPException(status_code=404, detail="Lorebook not found")
    return {"deleted": True}


@app.post("/api/lorebooks/{name}/entries")
async def api_add_lorebook_entry(name: str, request: Request):
    body = await _json_object(request)
    try:
        entry = db.add_lorebook_entry(name, body)
    except presets.LoreError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if entry is None:
        raise HTTPException(status_code=404, detail="Lorebook not found")
    return JSONResponse(entry, status_code=201)


@app.put("/api/lorebooks/{name}/entries/{entry_id}")
async def api_update_lorebook_entry(name: str, entry_id: str, request: Request):
    body = await _json_object(request)
    try:
        entry = db.update_lorebook_entry(name, entry_id, body)
    except presets.LoreError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if entry is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


@app.delete("/api/lorebooks/{name}/entries/{entry_id}")
async def api_delete_lorebook_entry(name: str, entry_id: str):
    if not db.delete_lorebook_entry(name, entry_id):
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"deleted": True}


@app.post("/api/lorebooks/{name}/test")
async def api_test_lorebook(name: str, request: Request):
    body = await _json_object(request)
    book = db.get_lorebook(name)
    if not book:
        raise HTTPException(status_code=404, detail="Lorebook not found")
    messages = body.get("messages")
    if messages is None and isinstance(body.get("text"), str):
        messages = [{"role": "user", "content": body["text"]}]
    if not isinstance(messages, list):
        raise HTTPException(status_code=400, detail="Send messages (a list) or text")
    certain = {**book, "entries": [{**e, "probability": 100} for e in book["entries"]]}
    result = presets.activate_lore(messages, [certain])
    return {"fired": result.fired, "dropped": result.dropped, "warnings": result.warnings,
            "texts": result.texts, "depth": result.depth}


@app.get("/api/presets")
async def api_list_presets():
    return {"presets": [_with_script_status(p) for p in db.list_presets()]}


@app.post("/api/presets")
async def api_create_preset(request: Request):
    body = await _json_object(request)
    try:
        return JSONResponse(db.create_preset(body), status_code=201)
    except presets.PresetError as e:
        raise HTTPException(status_code=409 if "already exists" in str(e) else 400, detail=str(e))


@app.post("/api/presets/import")
async def api_import_preset(request: Request):
    body = await _json_object(request)
    name = body.get("name")
    if name is not None and not isinstance(name, str):
        raise HTTPException(status_code=400, detail="name must be text")
    name = (name or "").strip().lower()
    if not presets.schema.NAME_RE.match(name):
        name = presets.preset_name_from(name)
    try:
        converted, report = presets.convert_st(body.get("st"), name)
        return JSONResponse({"preset": db.create_preset(converted), "report": report}, status_code=201)
    except presets.PresetError as e:
        raise HTTPException(status_code=409 if "already exists" in str(e) else 400, detail=str(e))


@app.get("/api/presets/{name}")
async def api_get_preset(name: str):
    preset = db.get_preset(name)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    return _with_script_status(preset)


@app.put("/api/presets/{name}")
async def api_update_preset(name: str, request: Request):
    body = await _json_object(request)
    try:
        preset = db.update_preset(name, body)
    except presets.PresetError as e:
        raise HTTPException(status_code=409 if "already exists" in str(e) else 400, detail=str(e))
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    return preset


@app.delete("/api/presets/{name}")
async def api_delete_preset(name: str):
    if not db.delete_preset(name):
        raise HTTPException(status_code=404, detail="Preset not found")
    return {"deleted": True}


@app.get("/api/chats")
async def api_list_chats(request: Request):
    archived = (request.query_params.get("archived") or "exclude").lower()
    archived = {"1": "include", "true": "include", "0": "exclude", "false": "exclude"}.get(archived, archived)
    try:
        return {"chats": db.list_chats(query=request.query_params.get("q"), archived=archived)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/chats")
async def api_create_chat(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    title = body.get("title") if isinstance(body, dict) else None
    return JSONResponse(db.create_chat(title if isinstance(title, str) else None), status_code=201)


@app.get("/api/chats/{chat_id}")
async def api_get_chat(chat_id: str):
    chat = db.get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat


@app.put("/api/chats/{chat_id}")
async def api_update_chat(chat_id: str, request: Request):
    body = await _json_object(request)
    known = ("title", "generated_title", "tools", "settings", "pinned", "archived")
    if not any(k in body for k in known):
        raise HTTPException(status_code=400, detail="Send a title, generated_title, tools, settings, pinned or archived")
    if "title" in body:
        title = body.get("title")
        if not isinstance(title, str) or not title.strip():
            raise HTTPException(status_code=400, detail="title must be a non-empty string")
        if not db.rename_chat(chat_id, title):
            raise HTTPException(status_code=404, detail="Chat not found")
    if "tools" in body:
        try:
            found = db.set_chat_tools(chat_id, body["tools"])
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        if not found:
            raise HTTPException(status_code=404, detail="Chat not found")
    if "settings" in body:
        try:
            found = db.set_chat_settings(chat_id, body["settings"])
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        if not found:
            raise HTTPException(status_code=404, detail="Chat not found")
    if "pinned" in body or "archived" in body:
        try:
            found = db.set_chat_flags(chat_id, body.get("pinned"), body.get("archived"))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        if not found:
            raise HTTPException(status_code=404, detail="Chat not found")
    result = {"status": "ok"}
    if "generated_title" in body:
        generated = body.get("generated_title")
        if not isinstance(generated, str):
            raise HTTPException(status_code=400, detail="generated_title must be a string")
        applied = db.apply_generated_title(chat_id, generated)
        if applied is None:
            raise HTTPException(status_code=404, detail="Chat not found")
        result["applied"] = applied
    return result


@app.delete("/api/chats/{chat_id}")
async def api_delete_chat(chat_id: str, request: Request):
    now = (request.query_params.get("now") or "").lower() in ("1", "true")
    if not db.delete_chat(chat_id, now=now):
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"status": "ok", "restorable_seconds": 0 if now else db.DELETED_CHAT_KEEP_SECONDS}


@app.post("/api/chats/{chat_id}/restore")
async def api_restore_chat(chat_id: str):
    if not db.restore_chat(chat_id):
        raise HTTPException(status_code=404, detail="Chat not found or already removed")
    return {"status": "ok"}


@app.put("/api/chats/{chat_id}/messages")
async def api_save_chat_messages(chat_id: str, request: Request):
    body = await _json_object(request)
    try:
        saved = db.save_chat_nodes(chat_id, body.get("from_index", 0), body.get("messages", []))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if saved is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"status": "ok", **saved}


@app.patch("/api/chats/{chat_id}/messages/{node_id}")
async def api_extend_chat_message(chat_id: str, node_id: str, request: Request):
    body = await _json_object(request)
    if not node_id.isdigit():
        raise HTTPException(status_code=404, detail="Message not found")
    try:
        saved = db.extend_chat_message(
            chat_id, int(node_id), body.get("content"), body.get("elapsed_ms"), body.get("thought_ms"),
            body.get("reasoning"), body.get("cut_off"),
        )
    except db.ChatConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if saved is None:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"status": "ok", **saved}


@app.put("/api/chats/{chat_id}/active")
async def api_set_active_message(chat_id: str, request: Request):
    body = await _json_object(request)
    try:
        found = db.set_active_node(chat_id, body.get("node_id"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not found:
        raise HTTPException(status_code=404, detail="Message not found")
    return db.get_chat(chat_id)




# -------------------------------------------------------------------
# Cloud Tunnel (ngrok) Endpoints
# -------------------------------------------------------------------

@app.get("/api/tunnel/status")
async def api_get_tunnel_status():
    return tunnel.get_tunnel_status()


@app.post("/api/tunnel/start")
async def api_start_tunnel():
    return tunnel.start_tunnel(port=9000)


@app.post("/api/tunnel/stop")
async def api_stop_tunnel():
    return tunnel.stop_tunnel()


@app.post("/api/tunnel/authtoken")
async def api_save_authtoken(request: Request):
    body = await request.json()
    token = body.get("token") or body.get("authtoken") or ""
    return tunnel.save_authtoken(token)


@app.post("/api/tunnel/install")
async def api_install_tunnel(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    force = bool(body.get("force", False))
    return tunnel.install_ngrok(force=force)


def _extract_clean_jwt(token_str: str) -> str:
    s = token_str.strip()
    if s.startswith("Bearer "):
        s = s[7:].strip()
    import re, base64
    m = re.search(r'(eyJhbGci[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)', s)
    if m:
        return m.group(1)
    clean_b64 = s.replace("base64-", "").replace("-", "+").replace("_", "/")
    clean_b64 += "=" * (-len(clean_b64) % 4)
    try:
        decoded = base64.b64decode(clean_b64).decode("utf-8", errors="ignore")
        m2 = re.search(r'(eyJhbGci[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)', decoded)
        if m2:
            return m2.group(1)
    except Exception:
        pass
    return s


@app.post("/api/janitor/autofetch")
async def api_janitor_autofetch(request: Request):
    """Auto-fetches the freshest valid JanitorAI access token from local browsers."""
    try:
        from singularity.janitor import auto_fetch_janitor_token
        result = auto_fetch_janitor_token()
        status_code = 200 if result.get("ok") else 404
        return JSONResponse(result, status_code=status_code)
    except Exception as exc:
        return JSONResponse({
            "ok": False,
            "status_code": 500,
            "detail": f"Failed to auto-fetch browser token: {str(exc)}"
        }, status_code=500)


@app.post("/api/janitor/deploy")
async def api_janitor_deploy(request: Request):
    """Directly deploy/patch character description on JanitorAI using user UUID and Access Token."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    char_uuid = str(body.get("uuid", "")).strip()
    raw_token = str(body.get("token", "")).strip()
    token = _extract_clean_jwt(raw_token)
    description = body.get("description", "")

    if not char_uuid:
        raise HTTPException(status_code=400, detail="Missing character UUID")
    if not token:
        raise HTTPException(status_code=400, detail="Missing JanitorAI Access Token")
    if not description:
        raise HTTPException(status_code=400, detail="Bio description content is empty")

    # Pre-validate JWT expiration to give instant actionable guidance
    try:
        parts = token.split(".")
        if len(parts) >= 2:
            import json as _json, base64 as _b64, time as _time
            b64_str = parts[1] + "=" * (-len(parts[1]) % 4)
            jwt_claims = _json.loads(_b64.urlsafe_b64decode(b64_str))
            exp_ts = jwt_claims.get("exp")
            if exp_ts and _time.time() > exp_ts:
                exp_dt = _time.strftime("%Y-%m-%d %H:%M:%S UTC", _time.gmtime(exp_ts))
                return JSONResponse({
                    "ok": False,
                    "status_code": 401,
                    "detail": f"JanitorAI Access Token expired on {exp_dt}. Supabase tokens only last 1–3 hours. Please refresh your token on janitorai.com or use the 'Copy Console Script' directly in your browser on janitorai.com."
                }, status_code=401)
    except Exception:
        pass

    url = f"https://janitorai.com/mb/characters/{char_uuid}"
    headers = {
        "content-type": "application/json",
        "authorization": f"Bearer {token}",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.patch(url, headers=headers, json={"description": description})
            try:
                resp_data = resp.json()
            except Exception:
                resp_data = {"raw": resp.text}

            if resp.status_code == 401:
                detail_msg = "JanitorAI returned 401 (Unauthorized). Your Access Token has expired or is invalid. Please copy a fresh token from janitorai.com or use the self-healing 'Copy Console Script'."
            elif resp.is_success:
                detail_msg = "Bio successfully deployed to JanitorAI!"
            else:
                detail_msg = f"JanitorAI returned HTTP {resp.status_code}: {resp.text[:200]}"

            return JSONResponse({
                "ok": resp.is_success,
                "status_code": resp.status_code,
                "data": resp_data,
                "detail": detail_msg
            }, status_code=resp.status_code if not resp.is_success else 200)
    except Exception as exc:
        return JSONResponse({
            "ok": False,
            "status_code": 502,
            "detail": f"Network error contacting JanitorAI: {str(exc)}"
        }, status_code=502)


# -------------------------------------------------------------------
# S-Connect: JanitorAI Bot Hub, Prompt Interceptor & SillyTavern Matrix
# -------------------------------------------------------------------

@app.get("/api/connect/search")
async def api_connect_search(request: Request):
    q = request.query_params.get("q", "")
    sort = request.query_params.get("sort", "trending")
    tag = request.query_params.get("tag", "")
    page = int(request.query_params.get("page", 1))
    limit = int(request.query_params.get("limit", 24))
    unmasked = request.query_params.get("unmasked", "").lower() in ("1", "true")
    from singularity import connect
    res = await connect.search_cards(q=q, sort=sort, tag=tag, page=page, limit=limit, unmasked_only=unmasked)
    return JSONResponse(res)


@app.get("/api/connect/bot/{bot_id}")
async def api_connect_get_bot(bot_id: str):
    from singularity import connect
    bot = await connect.fetch_bot_details(bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Character bot not found")
    return JSONResponse({"success": True, "data": bot})


@app.post("/api/connect/bot/{bot_id}/unmask")
async def api_connect_unmask_bot(bot_id: str):
    from singularity import connect
    res = await connect.trigger_remote_unmask(bot_id)
    return JSONResponse(res)


@app.get("/api/connect/bot/{bot_id}/unmask_status")
async def api_connect_unmask_status(bot_id: str):
    from singularity import connect
    res = await connect.get_unmask_status(bot_id)
    return JSONResponse(res)


@app.post("/api/connect/bot/{bot_id}/import")
async def api_connect_import_definition(bot_id: str, request: Request):
    try:
        body = await request.json()
        definition = body.get("definition") or body.get("personality") or ""
    except Exception:
        definition = ""
    from singularity import connect
    res = connect.import_manual_definition(bot_id, str(definition))
    return JSONResponse(res)


@app.get("/api/connect/bot/{bot_id}/download_png")
async def api_connect_download_png(bot_id: str):
    from singularity import connect
    bot = await connect.fetch_bot_details(bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Character bot not found")
    png_bytes = await connect.generate_sillytavern_png_bytes(bot)
    safe_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', bot.get("name", "character"))[:40]
    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}_card.png"',
            "Content-Type": "image/png"
        }
    )


@app.get("/api/connect/bot/{bot_id}/json")
async def api_connect_download_json(bot_id: str):
    from singularity import connect
    bot = await connect.fetch_bot_details(bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Character bot not found")
    v2_payload = connect.build_sillytavern_v2_payload(bot)
    safe_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', bot.get("name", "character"))[:40]
    return JSONResponse(
        v2_payload,
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}_v2.json"'
        }
    )


@app.post("/api/connect/save")
async def api_connect_save_card(request: Request):
    try:
        card = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    from singularity import connect
    norm = connect.normalize_card_payload(card)
    bot_id = norm.get("id") or str(card.get("id") or "")
    db.save_connect_bookmark(bot_id, norm)
    return JSONResponse({"success": True, "saved": True, "id": bot_id})


@app.delete("/api/connect/save/{bot_id}")
async def api_connect_unsave_card(bot_id: str):
    deleted = db.delete_connect_bookmark(bot_id)
    return JSONResponse({"success": True, "unsaved": deleted, "id": bot_id})


@app.delete("/api/connect/card/{bot_id}")
async def api_connect_delete_card(bot_id: str):
    deleted = db.delete_connect_card(bot_id)
    return JSONResponse({"success": True, "deleted": deleted})


@app.get("/api/cloud/config")
async def api_cloud_config():
    url = os.getenv("SUPABASE_URL") or db.get_setting("supabase_url", "https://ugbjziwpbdhgqovnlfvs.supabase.co")
    key = os.getenv("SUPABASE_KEY") or db.get_setting("supabase_key", "")
    return JSONResponse({"url": url, "key": key})


@app.post("/api/cloud/config")
async def api_cloud_config_set(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    url = (body.get("url") or "").strip()
    key = (body.get("key") or "").strip()
    if url:
        db.set_setting("supabase_url", url)
    if key:
        db.set_setting("supabase_key", key)
    return JSONResponse({"success": True})


@app.get("/api/connect/library")
async def api_connect_library(request: Request):
    q = request.query_params.get("q", "")
    limit = int(request.query_params.get("limit", 60))
    cards = db.list_saved_connect_cards(q=q, limit=limit)
    return JSONResponse({"success": True, "items": cards, "total": len(cards)})


@app.get("/api/connect/resolve")
async def api_connect_resolve(request: Request):
    q = request.query_params.get("q", "")
    if not q:
        raise HTTPException(status_code=400, detail="Missing query")
    from singularity import connect
    bot_id = connect.extract_janitor_bot_id(q)
    if bot_id:
        bot = await connect.fetch_bot_details(bot_id)
        if bot:
            return JSONResponse({"success": True, "type": "bot", "data": bot})
    # If not a direct UUID, search for it
    search_res = await connect.search_cards(q=q, limit=1)
    if search_res.get("items"):
        return JSONResponse({"success": True, "type": "bot", "data": search_res["items"][0]})
    return JSONResponse({"success": False, "type": "unknown", "query": q})


@app.get("/api/connect/creators/{creator_id}")
async def api_connect_get_creator(creator_id: str):
    from singularity import connect
    creator_data = await connect.fetch_creator_profile(creator_id)
    if not creator_data:
        raise HTTPException(status_code=404, detail="Creator not found")
    return JSONResponse({"success": True, "data": creator_data})


@app.get("/api/connect/creators/{creator_id}/bots")
async def api_connect_get_creator_bots(creator_id: str, request: Request):
    page = int(request.query_params.get("page", 1))
    limit = int(request.query_params.get("limit", 20))
    sort = request.query_params.get("sort", "latest")
    from singularity import connect
    data = await connect.fetch_creator_bots(creator_id, page=page, limit=limit, sort=sort)
    return JSONResponse({"success": True, "data": data})


@app.get("/api/connect/proxy/info")
async def api_connect_proxy_info(request: Request):
    lan_ip = get_lan_ip()
    port = int(os.getenv("PORT", "9000"))
    return JSONResponse({
        "status": "ready",
        "local_url": f"http://127.0.0.1:{port}/v1",
        "lan_url": f"http://{lan_ip}:{port}/v1",
        "model": "s-connect-proxy",
        "supported_models": ["s-connect-proxy", "cards-unmask-proxy"],
        "intercept_count": len(db.list_connect_intercepts(limit=100))
    })


@app.get("/api/connect/proxy/intercepts")
async def api_connect_proxy_intercepts(request: Request):
    limit = int(request.query_params.get("limit", 30))
    intercepts = db.list_connect_intercepts(limit=limit)
    return JSONResponse({"success": True, "intercepts": intercepts})


@app.delete("/api/connect/proxy/intercepts")
async def api_connect_clear_intercepts():
    db.clear_connect_intercepts()
    return JSONResponse({"success": True, "cleared": True})


# -------------------------------------------------------------------
# S-Connect Cloud & Cross-Device State Synchronization
# -------------------------------------------------------------------

@app.get("/api/connect/sync")
async def api_connect_sync_get():
    """Retrieve full persistent state bundle (chat sessions, personas, vault)."""
    data = db.get_full_connect_sync_payload()
    return JSONResponse({"success": True, "data": data})


@app.post("/api/connect/sync")
async def api_connect_sync_post(request: Request):
    """Merge incoming state bundle into local SQLite database."""
    try:
        payload = await request.json()
    except Exception:
        return JSONResponse({"success": False, "error": "Invalid JSON body"}, status_code=400)
    
    if not isinstance(payload, dict):
        return JSONResponse({"success": False, "error": "Payload must be an object"}, status_code=400)
    
    merged = db.merge_connect_sync_payload(payload)
    return JSONResponse({"success": True, "data": merged})


@app.post("/api/connect/sync/session")
async def api_connect_sync_session_save(request: Request):
    """Save or update an individual chat session and its full message history."""
    try:
        session_data = await request.json()
    except Exception:
        return JSONResponse({"success": False, "error": "Invalid JSON body"}, status_code=400)
    
    if not isinstance(session_data, dict) or not (session_data.get("id") or session_data.get("session_id")):
        return JSONResponse({"success": False, "error": "Session must contain 'id' or 'session_id'"}, status_code=400)
    
    db.save_connect_session(session_data)
    sess_id = session_data.get("id") or session_data.get("session_id")
    return JSONResponse({"success": True, "session_id": sess_id})


@app.get("/api/connect/sync/sessions")
async def api_connect_sync_sessions_list(request: Request):
    """List all stored S-Connect sessions, optionally filtered by bot_id."""
    bot_id = request.query_params.get("bot_id")
    sessions = db.get_connect_sessions(bot_id=bot_id)
    return JSONResponse({"success": True, "sessions": sessions})


@app.get("/api/connect/sync/session/{session_id}")
async def api_connect_sync_session_get(request: Request):
    """Get single session by ID."""
    session_id = request.path_params.get("session_id", "")
    sess = db.get_connect_session_by_id(session_id)
    if not sess:
        return JSONResponse({"success": False, "error": "Session not found"}, status_code=404)
    return JSONResponse({"success": True, "session": sess})


@app.delete("/api/connect/sync/session/{session_id}")
async def api_connect_sync_session_delete(request: Request):
    """Delete a single session by ID."""
    session_id = request.path_params.get("session_id", "")
    ok = db.delete_connect_session(session_id)
    return JSONResponse({"success": ok, "session_id": session_id})


@app.post("/api/connect/sync/remote")
async def api_connect_sync_remote(request: Request):
    """Sync state with a remote Singularity server (e.g. phone syncing with laptop or vice-versa)."""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"success": False, "error": "Invalid JSON"}, status_code=400)

    remote_url = str(body.get("remote_url", "")).strip().rstrip("/")
    gateway_key = str(body.get("gateway_key", "")).strip() or security.get_gateway_key()
    mode = str(body.get("mode", "pull")).lower().strip()

    if not remote_url.startswith(("http://", "https://")):
        return JSONResponse({"success": False, "error": "Invalid remote URL (must start with http:// or https://)"}, status_code=400)

    headers = {
        "Authorization": f"Bearer {gateway_key}",
        "X-Gateway-Key": gateway_key,
        "User-Agent": "Singularity-CloudSync/1.0"
    }

    pulled_count = 0
    pushed_count = 0

    try:
        async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
            if mode in ("pull", "both"):
                r = await client.get(f"{remote_url}/api/connect/sync", headers=headers)
                if r.status_code != 200:
                    return JSONResponse({
                        "success": False,
                        "error": f"Remote server returned HTTP {r.status_code}: {r.text[:200]}"
                    }, status_code=502)
                data = r.json()
                incoming = data.get("data", data)
                if isinstance(incoming, dict):
                    db.merge_connect_sync_payload(incoming)
                    pulled_count = len(incoming.get("sessions", []))

            if mode in ("push", "both"):
                local_bundle = db.get_full_connect_sync_payload()
                pushed_count = len(local_bundle.get("sessions", []))
                r = await client.post(f"{remote_url}/api/connect/sync", headers=headers, json=local_bundle)
                if r.status_code != 200:
                    return JSONResponse({
                        "success": False,
                        "error": f"Remote server rejected push with HTTP {r.status_code}: {r.text[:200]}"
                    }, status_code=502)

        return JSONResponse({
            "success": True,
            "message": f"Sync successful ({mode})",
            "pulled_sessions": pulled_count,
            "pushed_sessions": pushed_count,
            "current_total_sessions": len(db.get_connect_sessions())
        })
    except Exception as e:
        logger.error(f"[Sync] Remote sync failed: {e}")
        return JSONResponse({"success": False, "error": f"Connection error: {str(e)}"}, status_code=500)


# -------------------------------------------------------------------
# System Version Control & Update Engine (GitHub Sync & Cache-Buster)
# -------------------------------------------------------------------

@app.get("/api/system/version")
async def api_system_version():
    """Returns local git commit details, branch, remote origin status, and commit log."""
    repo_dir = str(ROOT_DIR)
    
    local_hash = ""
    short_hash = ""
    commit_date = ""
    commit_message = ""
    author = ""
    branch = "main"
    recent_commits = []
    
    try:
        # Get current branch
        br_res = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=repo_dir, capture_output=True, text=True, timeout=3)
        if br_res.returncode == 0:
            branch = br_res.stdout.strip() or "main"
            
        # Get HEAD commit details
        head_res = subprocess.run(["git", "log", "-1", "--format=%H|%h|%an|%ci|%s"], cwd=repo_dir, capture_output=True, text=True, timeout=3)
        if head_res.returncode == 0 and head_res.stdout.strip():
            parts = head_res.stdout.strip().split("|", 4)
            if len(parts) == 5:
                local_hash, short_hash, author, commit_date, commit_message = parts
            else:
                local_hash = head_res.stdout.strip()
                short_hash = local_hash[:7]
                
        # Get recent commit log (up to 12 commits)
        log_res = subprocess.run(["git", "log", "-12", "--format=%H|%h|%an|%ci|%s"], cwd=repo_dir, capture_output=True, text=True, timeout=4)
        if log_res.returncode == 0:
            for line in log_res.stdout.strip().splitlines():
                if not line.strip():
                    continue
                lp = line.split("|", 4)
                if len(lp) == 5:
                    recent_commits.append({
                        "hash": lp[0],
                        "short": lp[1],
                        "author": lp[2],
                        "date": lp[3],
                        "message": lp[4]
                    })
    except Exception as e:
        local_hash = local_hash or "unknown"
        short_hash = short_hash or "v2.5"

    # Query GitHub remote
    remote_hash = ""
    remote_short = ""
    is_latest = True
    commits_behind = 0
    remote_error = None
    
    try:
        # Check origin HEAD via git ls-remote
        ls_res = subprocess.run(["git", "ls-remote", "origin", f"refs/heads/{branch}"], cwd=repo_dir, capture_output=True, text=True, timeout=6)
        if ls_res.returncode == 0 and ls_res.stdout.strip():
            first_line = ls_res.stdout.strip().splitlines()[0]
            remote_hash = first_line.split()[0].strip()
            remote_short = remote_hash[:7]
            if local_hash and remote_hash:
                if local_hash == remote_hash:
                    is_latest = True
                    commits_behind = 0
                else:
                    is_latest = False
                    cnt_res = subprocess.run(["git", "rev-list", "--count", f"HEAD..{remote_hash}"], cwd=repo_dir, capture_output=True, text=True, timeout=3)
                    if cnt_res.returncode == 0 and cnt_res.stdout.strip().isdigit():
                        commits_behind = int(cnt_res.stdout.strip())
                    else:
                        commits_behind = 1
        elif ls_res.returncode != 0:
            remote_error = ls_res.stderr.strip() or "Remote origin unreachable"
            is_latest = None
    except subprocess.TimeoutExpired:
        remote_error = "GitHub check timed out (offline or slow connection)"
        is_latest = None
    except Exception as exc:
        remote_error = str(exc)
        is_latest = None

    return JSONResponse({
        "ok": True,
        "version_name": "v2.5.0-Sing",
        "branch": branch,
        "local_commit": local_hash,
        "short_commit": short_hash,
        "commit_date": commit_date,
        "commit_message": commit_message,
        "author": author,
        "remote_commit": remote_hash,
        "remote_short": remote_short,
        "is_latest": is_latest,
        "commits_behind": commits_behind,
        "remote_repo": "Nephis-opus/Singularity",
        "remote_error": remote_error,
        "recent_commits": recent_commits,
        "cache_token": int(time.time()),
    })


@app.post("/api/system/update")
async def api_system_update():
    """Pulls latest files from GitHub origin/main, verifies integrity, and prepares cache-busted reload."""
    repo_dir = str(ROOT_DIR)
    logs = []
    
    logs.append(f"Initiating Singularity core sync for {repo_dir}...")
    logs.append("Target remote: https://github.com/Nephis-opus/Singularity.git [main]")
    
    old_hash = ""
    new_hash = ""
    
    try:
        # Get old HEAD
        h_res = subprocess.run(["git", "rev-parse", "HEAD"], cwd=repo_dir, capture_output=True, text=True, timeout=3)
        if h_res.returncode == 0:
            old_hash = h_res.stdout.strip()
            logs.append(f"Current local HEAD: {old_hash[:7]}")

        # Check working tree status
        stashed = False
        st_res = subprocess.run(["git", "status", "--porcelain"], cwd=repo_dir, capture_output=True, text=True, timeout=3)
        if st_res.returncode == 0 and st_res.stdout.strip():
            logs.append("Notice: Local uncommitted files detected. Preserving workspace state...")
            s_res = subprocess.run(["git", "stash", "save", "singularity-auto-update"], cwd=repo_dir, capture_output=True, text=True, timeout=4)
            stashed = (s_res.returncode == 0)

        # Execute git fetch
        logs.append("Fetching latest refs from origin/main...")
        f_res = subprocess.run(["git", "fetch", "origin", "main"], cwd=repo_dir, capture_output=True, text=True, timeout=12)
        if f_res.returncode != 0:
            err = f_res.stderr.strip() or f_res.stdout.strip()
            logs.append(f"[!] Fetch failed: {err}")
            if stashed:
                subprocess.run(["git", "stash", "pop"], cwd=repo_dir, capture_output=True, text=True, timeout=4)
            return JSONResponse({"ok": False, "error": err, "logs": logs}, status_code=500)
            
        # Execute git pull
        logs.append("Pulling updates from origin/main...")
        p_res = subprocess.run(["git", "pull", "origin", "main"], cwd=repo_dir, capture_output=True, text=True, timeout=15)
        for line in (p_res.stdout + "\n" + p_res.stderr).splitlines():
            if line.strip():
                logs.append(f"  {line.strip()}")
                
        if stashed:
            subprocess.run(["git", "stash", "pop"], cwd=repo_dir, capture_output=True, text=True, timeout=4)

        # Get new HEAD
        nh_res = subprocess.run(["git", "rev-parse", "HEAD"], cwd=repo_dir, capture_output=True, text=True, timeout=3)
        if nh_res.returncode == 0:
            new_hash = nh_res.stdout.strip()
            logs.append(f"New local HEAD: {new_hash[:7]}")

        updated = (old_hash != new_hash)
        if updated:
            logs.append(f"✓ Singularity updated successfully ({old_hash[:7]} -> {new_hash[:7]}).")
        else:
            logs.append("✓ Singularity is already on the latest revision.")
            
        logs.append("Generating cache-bypass token and preparing instant reload...")
        cache_buster = f"v{int(time.time())}_{new_hash[:7]}"
        logs.append(f"Active cache-buster token: {cache_buster}")
        
        return JSONResponse({
            "ok": True,
            "updated": updated,
            "old_commit": old_hash,
            "new_commit": new_hash,
            "short_commit": new_hash[:7],
            "cache_token": cache_buster,
            "logs": logs
        })
    except Exception as exc:
        logs.append(f"[!] Update execution failed: {str(exc)}")
        return JSONResponse({
            "ok": False,
            "error": str(exc),
            "logs": logs
        }, status_code=500)


# -------------------------------------------------------------------
# Static Frontend Serving
# -------------------------------------------------------------------

@app.get("/")
@app.head("/")
async def serve_index():
    index_path = STATIC_DIR / "index.html"
    return FileResponse(
        index_path,
        media_type="text/html",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@app.get("/logo.svg")
@app.head("/logo.svg")
async def serve_logo():
    logo_path = STATIC_DIR / "logo.svg"
    return FileResponse(logo_path, media_type="image/svg+xml")


@app.get("/favicon.ico")
@app.head("/favicon.ico")
async def serve_favicon():
    logo_path = STATIC_DIR / "logo.svg"
    return FileResponse(logo_path, media_type="image/svg+xml")


# Mount static assets directory
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


def _ensure_packages():
    """Warn when optional packages like curl_cffi (TLS impersonation) are missing."""
    try:
        import curl_cffi  # noqa: F401
    except ImportError:
        print("  [!] curl_cffi is not installed; ChatGPT/DeepSeek may be blocked. "
              "Run: python -m pip install -r requirements.txt", flush=True)


@app.on_event("startup")
async def on_startup():
    """Start supervisor watchdog and auto-launch in-process workers (chatgpt, kimi, grok, glm, deepseek, qwen) if offline."""
    _ensure_packages()
    try:
        worker.ensure_supervisor_running()
        for p in ["chatgpt", "kimi", "grok", "glm", "deepseek", "qwen"]:
            try:
                start_provider(p)
            except Exception:
                pass
    except Exception:
        pass
    try:
        await api_tavern_start()
    except Exception:
        pass


def free_listening_ports(ports: List[int]):
    """Terminate stale processes listening on specified ports so uvicorn and Tavern can bind cleanly."""
    current_pid = os.getpid()
    for p in ports:
        # Check if port is occupied first
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.15)
                if s.connect_ex(("127.0.0.1", p)) != 0:
                    continue
        except Exception:
            pass

        if sys.platform == "win32":
            try:
                out = subprocess.check_output(f'netstat -ano | findstr /R /C:":{p} .*LISTENING"', shell=True, text=True, stderr=subprocess.DEVNULL)
                for line in out.strip().splitlines():
                    parts = line.strip().split()
                    if parts:
                        pid = parts[-1]
                        if pid.isdigit() and int(pid) != current_pid and int(pid) != 0:
                            subprocess.run(f"taskkill /F /PID {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception:
                pass
        else:
            try:
                subprocess.run(["fuser", "-k", "-9", f"{p}/tcp"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception:
                pass
            try:
                subprocess.run(f"lsof -sTCP:LISTEN -iTCP:{p} -t | xargs -r kill -9", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception:
                pass
    time.sleep(0.2)


def main():
    if "--lan" in sys.argv[1:]:
        os.environ["SINGULARITY_LAN"] = "1"
    lan_mode = security.is_lan_mode()
    host = os.getenv("HOST") or ("0.0.0.0" if lan_mode else "127.0.0.1")
    port = int(os.getenv("PORT", "9000"))

    # Free port 9000 (gateway) and Tavern ports (5173, 3001) if occupied by stale processes
    free_listening_ports([port, 5173, 3001])

    try:
        db.init_db()
        gateway_key = security.get_gateway_key()
    except Exception as e:
        print(f"\n  [!] Could not open the credential vault: {e}\n", flush=True)
        sys.exit(1)

    print("\n" + "=" * 66, flush=True)
    print("  🚀 SINGULARITY UNIFIED AI GATEWAY & TAVERN WEB STUDIO", flush=True)
    print("=" * 66, flush=True)
    print(f"  📍 Localhost Dashboard:  http://localhost:{port}", flush=True)
    print(f"  📍 Localhost Tavern:     http://localhost:5173", flush=True)
    print("  " + "-" * 62, flush=True)
    if host in ("127.0.0.1", "localhost", "::1"):
        print("  🔒 Listening on this machine only. For phone / LAN access run:", flush=True)
        print("     ./start.sh --lan        (Windows: start.bat --lan)", flush=True)
    else:
        lan_ip = get_lan_ip()
        print("  📱 PHONE / TABLET / LAN ACCESS (Connect to same Wi-Fi):", flush=True)
        print(f"  📲 Mobile Dashboard:     http://{lan_ip}:{port}", flush=True)
        print(f"  📲 Mobile Tavern:        http://{lan_ip}:5173", flush=True)
        print("  ⚠️  NOTE FOR PHONES: Do NOT type '0.0.0.0' on your mobile browser!", flush=True)
        print(f"     Always use the LAN IP: http://{lan_ip}:5173", flush=True)
        print("  🔑 Other devices must log in with the gateway key:", flush=True)
        print(f"     {gateway_key}", flush=True)
        print("  ⚠️  Tavern Studio has no login; anyone on this network can open it.", flush=True)
    print("=" * 66 + "\n", flush=True)

    try:
        worker.ensure_supervisor_running()
        for p in ["chatgpt", "kimi", "grok", "glm", "deepseek", "qwen"]:
            try:
                start_provider(p)
            except Exception:
                pass
    except Exception:
        pass
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    main()
