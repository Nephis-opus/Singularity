# 🌌 Singularity Architecture Guide
> **The definitive technical manual and structural blueprint for Singularity: Universal Web2API AI Gateway, Multi-Account Stacker, and Interactive Generative UI Hub.**

---

## 📑 Table of Contents
1. [System Overview & Mission](#1-system-overview--mission)
2. [High-Level Architecture & Topology](#2-high-level-architecture--topology)
3. [Core Non-Negotiable Invariants](#3-core-non-negotiable-invariants)
4. [Repository Directory & File Anatomy](#4-repository-directory--file-anatomy)
5. [End-to-End Request & Data Flow Pipeline](#5-end-to-end-request--data-flow-pipeline)
6. [Provider Engines Deep-Dive (`singularity/engines/`)](#6-provider-engines-deep-dive-singularityengines)
7. [Credential Vault & Multi-Account Stacking (`singularity/db.py`)](#7-credential-vault--multi-account-stacking-singularitydbpy)
8. [Universal Artifacts & GenUI Sandboxing Engine](#8-universal-artifacts--genui-sandboxing-engine)
9. [Personas & Dynamic Identity Rewriter (`singularity/personas.py`)](#9-personas--dynamic-identity-rewriter-singularitypersonaspy)
10. [Cloud Tunneling & Native Mobile Access (`singularity/tunnel.py`)](#10-cloud-tunneling--native-mobile-access-singularitytunnelpy)
11. [Universal Command Line Interface (`./singular` / `./c2a`)](#11-universal-command-line-interface-singular--c2a)
12. [Frontend Architecture & Design System (`singularity/static/`)](#12-frontend-architecture--design-system-singularitystatic)
13. [S-Connect & Janitor AI Matrix (`singularity/connect.py`)](#13-s-connect--janitor-ai-matrix-singularityconnectpy)
14. [Claude Code Protocol Bridge (`singularity/claudecode_bridge.py`)](#14-claude-code-protocol-bridge-singularityclaudecode_bridgepy)
15. [OpenAI Native Tools Bridge (`singularity/openai_tools_bridge.py`)](#15-openai-native-tools-bridge-singularityopenai_tools_bridgepy)
16. [Agent Protocols: Adding Providers & Extending Models](#16-agent-protocols-adding-providers--extending-models)

---

## 1. System Overview & Mission

**Singularity** is a high-performance, self-contained AI reverse-proxy gateway and orchestration platform. It transforms standard browser sessions, OAuth refresh tokens, and authenticated web endpoints of top frontier AI providers into a single, standardized, zero-latency **OpenAI-compatible REST and SSE streaming API** (`http://127.0.0.1:9000/v1`).

### Primary Capabilities:
- **9 Frontier AI Providers**: Full Web2API reverse-proxy drivers for **Google Antigravity**, **Google Gemini Web**, **Google AI Studio**, **Xiaomi MiMo**, **Claude**, **Kimi**, **GLM**, **DeepSeek**, and **Qwen**.
- **238+ Frontier Models**: Native support for Gemini 4 Argon (High/Med/Low), Claude Opus 5.5, Claude Sonnet 5.5, Claude 3.7 Sonnet (Thinking CoT), MiMo-V2.6-Pro (1M context), DeepSeek V3/R1/V4, Qwen 2.5/Max/Coder, Kimi K3, GLM 5.3, and Veo 3.1 video generation.
- **Universal Multi-Account Stacking**: SQLite-backed credential vault with dynamic round-robin rotation, auto-healing, and rate-limit mitigation across unlimited accounts.
- **1-Click Browser Cookie & OAuth Auto-Extraction**: Discovers Gemini cookies, MiMo tokens, and Antigravity Google OAuth credentials with zero manual DevTools friction (`./singular autofetch <provider>`).
- **S-Connect Janitor AI Matrix & Tempest Bio Studio**: Full character card hub, SillyTavern PNG matrix parser, and reverse-engineered prompt interceptor (`singularity/connect.py`).
- **Claude Code CLI & IDE Tools Bridge**: Translates Anthropic Messages protocol (`:6045`) and OpenAI native function calling tools to web LLM backends without altering roleplay prompts.
- **Universal Interactive GenUI & Artifacts**: Standalone side-by-side rendering sandbox supporting React 18, HTML5/CSS3/ES6, SVG, and Mermaid diagrams with automatic conversion of ChatGPT `※genui※` payloads into `<antArtifact>` specifications.
- **Native Cross-Platform Runtime**: Runs identically on **Linux**, **macOS**, **Windows**, and **Android (Termux)** with zero compilation overhead.
- **Authentic Upstream Inferences**: Bypasses official paid API key paywalls by authentically driving web endpoints with session tokens, handling WebAssembly/Node.js Proof-of-Work (PoW) challenges, XSRF/ALR hops, and dynamic cookie refreshes.

---

## 2. High-Level Architecture & Topology

```mermaid
graph TD
    subgraph Clients["Clients & Interfaces"]
        UI["Singularity Playground (Port 9000)<br/>Vanilla ES6 + Claude Aesthetics"]
        SConnect["S-Connect & Tempest Studio<br/>Janitor AI Bot Hub & Card Matrix"]
        ClaudeCode["Claude Code CLI & Desktop<br/>Anthropic Messages Bridge (:6045)"]
        ExtApps["External Tools & IDEs<br/>(Cursor, Cline, SillyTavern, LangChain)"]
        CLI["Singularity CLI Tool<br/>(./singular / ./c2a)"]
    end

    subgraph Gateway["Singularity Universal Gateway (:9000)"]
        Server["StarletteGateway Router<br/>(singularity/server.py)"]
        ModelRouter["resolve_model_provider()<br/>(238+ Models Routed)"]
        ToolsBridge["OpenAI Tools Bridge<br/>(singularity/openai_tools_bridge.py)"]
        PersonaEng["Dynamic Persona Engine<br/>(singularity/personas.py)"]
        ArtifactsEng["Artifacts Prompt Injector<br/>(singularity/artifacts.py)"]
        ThinkingTrans["Thinking Budget Cap Translator<br/>(Claude, Gemini, Antigravity, DeepSeek)"]
        Smoother["Cadence Stream Smoother<br/>(35ms / 28 FPS Token Delivery)"]
    end

    subgraph DataPlane["Storage & System State"]
        DB[("SQLite WAL Vault<br/>singularity/data/singularity.db")]
        ProvidersMeta["MODELS_CATALOG & PROVIDERS_CONFIG<br/>(singularity/providers.py)"]
        TunnelMgr["Ngrok Tunnel Manager<br/>(singularity/tunnel.py)"]
    end

    subgraph InferenceEngines["Direct In-Process Engines (singularity/engines/)"]
        EngAntigravity["antigravity.py (:8090)<br/>Local Language Server RPC / CloudCode"]
        EngGemini["gemini.py (:8084)<br/>Argon4p0 Mode 8 / SNlM0e XSRF / ALR"]
        EngAIStudio["aistudio.py (:8091)<br/>ProxyStreamedCall / Studio TTS MP3"]
        EngMiMo["mimo.py (:8092)<br/>MiMo-V2.6-Pro / Audio TTS & ASR"]
        EngClaude["claude.py (:8080)<br/>sessionKey / Org Discovery / SSE"]
        EngGLM["glm.py (:8085)<br/>Zhipu Token / CogView"]
        EngKimi["kimi.py (:8086)<br/>JWT Refresh / K2 Reasoning"]
        EngDeepSeek["deepseek.py (:8088)<br/>WASM PoW / Node.js Runner"]
        EngQwen["qwen.py (:8089)<br/>chat.qwen.ai Bearer / 1M Context"]
    end

    subgraph WebBackends["Upstream AI Platforms & RPCs"]
        WebAntigravity["Local RPC :3000-65535 / CloudCode API"]
        WebGemini["gemini.google.com/batchexecute"]
        WebAIStudio["alkalimakersuite-pa.clients6.google.com"]
        WebMiMo["aistudio.xiaomimimo.com/open-apis"]
        WebClaude["claude.ai/api"]
        WebGLM["chatglm.cn/backend-api"]
        WebKimi["kimi.moonshot.cn/api"]
        WebDeepSeek["chat.deepseek.com/api"]
        WebQwen["chat.qwen.ai/api"]
    end

    UI -->|HTTP / SSE / REST| Server
    SConnect -->|Internal API /v1| Server
    ClaudeCode -->|Anthropic /v1/messages| Server
    ExtApps -->|OpenAI /v1 API| Server
    CLI -->|IPC / DB Query| DataPlane
    CLI -->|Inference Query| Server

    Server --> ModelRouter
    ModelRouter --> ToolsBridge
    ModelRouter --> PersonaEng
    ModelRouter --> ArtifactsEng
    ModelRouter --> ThinkingTrans
    ModelRouter --> Smoother

    Server <-->|Query Accounts & Settings| DB
    Server <-->|Provider Metadata & Limits| ProvidersMeta
    Server <-->|Public HTTPS Exposure| TunnelMgr

    Server -->|Direct stream_chat() call| EngAntigravity
    Server -->|Direct stream_chat() call| EngGemini
    Server -->|Direct stream_chat() call| EngAIStudio
    Server -->|Direct stream_chat() call| EngMiMo
    Server -->|Direct stream_chat() call| EngClaude
    Server -->|Direct stream_chat() call| EngGLM
    Server -->|Direct stream_chat() call| EngKimi
    Server -->|Direct stream_chat() call| EngDeepSeek
    Server -->|Direct stream_chat() call| EngQwen

    EngAntigravity -->|HTTP / SSE| WebAntigravity
    EngGemini -->|TLS / httpx / ALR| WebGemini
    EngAIStudio -->|TLS / httpx| WebAIStudio
    EngMiMo -->|TLS / httpx| WebMiMo
    EngClaude -->|TLS / httpx| WebClaude
    EngGLM -->|TLS / httpx| WebGLM
    EngKimi -->|TLS / httpx| WebKimi
    EngDeepSeek -->|Node PoW / curl_cffi| WebDeepSeek
    EngQwen -->|TLS / httpx| WebQwen
```

---

## 3. Core Non-Negotiable Invariants

Any AI agent modifying or expanding this codebase **must strictly follow these foundational rules**:

1. **NO GIT PUSH**: Never issue `git push` or push tokens/secrets to remote repositories.
2. **NO BROWSER / CHROME AUTOMATION**: Do not launch Playwright, Puppeteer, or Chrome subagents unless explicitly ordered by the user.
3. **ZERO RUST BUILD TOOLCHAINS ON MOBILE**:
   - The entire gateway runtime relies on pure Python: `starlette`, `uvicorn`, `httpx`, `curl_cffi`, and `websockets`.
   - **Never add `pydantic` or `fastapi` to [`requirements.txt`](file:///home/insomniac/Desktop/Janitor/requirements.txt)**.
   - On Android Termux, compiling `pydantic-core` triggers a Rust/Cargo build that hangs mobile devices. Singularity's `StarletteGateway` provides a drop-in pure Python replacement with instant 3-second phone installations.
4. **NO LEGACY DEPENDENCIES**:
   - The Singularity workspace is 100% self-contained in `singularity/`.
   - **Never import, execute, or link against files in `legacy/`**. `legacy/` is purely an inactive reference archive.
5. **STRICT ONE-FILE ENGINE RULE (`singularity/engines/`)**:
   - Every provider driver lives in **strictly ONE file**: `singularity/engines/<provider>.py`.
   - No scattered `.js`, `.py`, or `.sh` files in `engines/`.
   - Any helper scripts (such as Node.js PoW solvers) must be embedded as inline constants within `<provider>.py`.
   - Binary assets (e.g. `.wasm` modules) reside in `singularity/data/` and must be unignored in `.gitignore` (`!singularity/data/*.wasm`).
6. **PREFER REPOSITORY CLI (`./singular` / `./c2a`)**:
   - Do not write throwaway Python test scripts to test models or check limits. Always use `./singular status`, `./singular limits`, or `./singular chat`.
7. **CANONICAL DUAL-LAUNCHER INVARIANT**:
   - Strictly two launch scripts: [`start.sh`](file:///home/insomniac/Desktop/Janitor/start.sh) (symlinked to `singular` and `c2a` for Unix/macOS/Termux) and [`start.bat`](file:///home/insomniac/Desktop/Janitor/start.bat) (for Windows).
8. **REAL LIVE TESTING (NO FAKE SIMULATION)**:
   - Unless specifically testing offline UI behavior with `--simulate`, all model verification must use real live upstream requests to verify tokens, cookies, and HTTP handshakes.

---

## 4. Repository Directory & File Anatomy

```
Singularity/
├── ARCHITECTURE.md              <-- This document (Comprehensive architectural blueprint)
├── AGENTS.md                    <-- Core agent operational rules, CLI quick cheat sheet & lessons
├── MISTAKES.md                  <-- Historic mistake log & post-mortem analysis (27+ recorded lessons)
├── DESIGN-SYS.md                <-- Frontend UI tokens, motion design guidelines & aesthetic rules
├── README.md                    <-- Public project documentation & quickstart guide
├── requirements.txt             <-- Minimal pure-Python dependency manifest (httpx, starlette, uvicorn...)
├── start.sh                     <-- Canonical POSIX/Termux launcher & process manager
├── start.bat                    <-- Canonical Windows CMD launcher
├── install.sh                   <-- One-line bootstrap script for fresh machines
├── singular -> start.sh         <-- Symlink to launcher & CLI
├── c2a -> start.sh              <-- Backward-compatibility symlink
├── logo.svg                     <-- Singularity brand vector mark
├── legacy/                      <-- ARCHIVE ONLY: Deprecated reference code (DO NOT IMPORT OR EXECUTE)
│
├── singularity/                 <-- CORE RUNTIME PACKAGE (100% self-contained)
│   ├── server.py                <-- Port 9000 Starlette Gateway, OpenAI REST/SSE routes & middleware
│   ├── worker.py                <-- Multi-threaded provider daemon runner (Ports 8080, 8084-8092)
│   ├── providers.py             <-- Master Catalog (238 models), provider configurations & live limits
│   ├── db.py                    <-- SQLite WAL Credential Vault, token parsers & account stacking
│   ├── cli.py                   <-- Unified CLI tool implementation (status, limits, accounts, chat)
│   ├── connect.py               <-- S-Connect Janitor AI Hub, prompt interceptor & card matrix
│   ├── claudecode_bridge.py     <-- Claude Code CLI & Desktop Messages protocol bridge (:6045)
│   ├── openai_tools_bridge.py   <-- Tool calling / function translation bridge for web LLMs
│   ├── artifacts.py             <-- GenUI interception, <antArtifact> injector & Babel sandboxer
│   ├── personas.py              <-- Dynamic model persona mapping (Astra, Fable) & stream rewriters
│   ├── tunnel.py                <-- Native ngrok daemon manager with 32/64-bit Termux self-healing
│   ├── security.py              <-- Access policy: loopback trust, gateway key, session cookie, CORS
│   ├── vault.py                 <-- Stdlib-only vault encryption + OS keychain / key-file master key storage
│   │
│   ├── engines/                 <-- STRICT ONE-FILE PER PROVIDER INFERENCE DRIVERS
│   │   ├── __init__.py          <-- stream_chat() & generate_chat() universal dispatchers
│   │   ├── antigravity.py       <-- Google Antigravity (Local RPC :3000-65535 & CloudCode) (:8090)
│   │   ├── gemini.py            <-- Google Gemini Batchexecute & Argon4p0 Mode 8 (:8084)
│   │   ├── aistudio.py          <-- Google AI Studio (MakerSuite) & TTS Audio MP3 (:8091)
│   │   ├── mimo.py              <-- Xiaomi MiMo AI Studio, TTS Speech & Voice ASR (:8092)
│   │   ├── claude.py            <-- Anthropic Claude Web2API (sessionKey, Org discovery, Thinking) (:8080)
│   │   ├── kimi.py              <-- Moonshot Kimi Web2API (JWT auto-refresh, K2 thinking traces) (:8086)
│   │   ├── glm.py               <-- Zhipu AI GLM Web2API (Refresh tokens, CogView generation) (:8085)
│   │   ├── deepseek.py          <-- DeepSeek AI Web2API (Inline Node.js PoW, WASM runner, R1/V4) (:8088)
│   │   └── qwen.py              <-- Alibaba Qwen Web2API (chat.qwen.ai session tokens, 1M context) (:8089)
│   │
│   ├── data/                    <-- PERSISTENT APPLICATION STORAGE
│   │   ├── singularity.db       <-- SQLite vault (credentials, model settings, creator cards)
│   │   ├── singularity.db-wal   <-- SQLite Write-Ahead Log
│   │   └── deepseek_pow.wasm    <-- Native WebAssembly module for DeepSeek PoW solver
│   │
│   ├── bin/                     <-- Native runtime binaries (ngrok for auto-tunneling)
│   │
│   └── static/                  <-- PURE ES6 FRONTEND PLAYGROUND & CONTROL CENTER
│       ├── index.html           <-- Claude-aesthetic UI, Lightbox modals, Settings dialog, Workbench
│       ├── app.js               <-- Client orchestrator (SSE, Markdown, Model Picker, Settings sync)
│       ├── connect-panel.js     <-- S-Connect Janitor card browser, SillyTavern importer & chat UI
│       ├── style.css            <-- Master typography, dark/light theme variables, message bubbles
│       ├── tokens.css           <-- Design tokens (Anthropic Terracotta, background tints, geometry)
│       ├── glass-dock.js        <-- Floating glass dock logic (status polling, quick modals)
│       ├── glass-dock.css       <-- Frosted glass dock styles, segmented theme switchers
│       ├── icons/               <-- High-definition SVG icons for each provider
│       └── fonts/               <-- Authentic Anthropic and typography webfonts
```

---

## 5. End-to-End Request & Data Flow Pipeline

When a client sends a request to `POST http://127.0.0.1:9000/v1/chat/completions`:

```
Client Request
      │
      ▼
[server.py] StarletteGateway Handler
      │
      ├─► 1. Model Resolution: resolve_model_provider(model_name)
      │      - Catalog lookup (MODELS_CATALOG in providers.py)
      │      - Prefix/alias pattern matching (e.g. "agy-", "gemini-4-argon", "mimo-")
      │
      ├─► 2. OpenAI Function Calling & Tools Bridge:
      │      - If request contains `tools` or `functions`:
      │        • Translates schema into strict <tool_call> instruction prompt.
      │        • Injects into system messages via openai_tools_bridge.py.
      │        • Intercepts emitted <tool_call> tokens and maps back to OpenAI tool_calls deltas.
      │
      ├─► 3. Persona Engine Interception: personas.get_persona_config(model_name)
      │      - If persona (e.g. GPT-6 Astra, Claude 5 Fable): map to backend model,
      │        inject identity prompt, activate stream sanitization rewriter.
      │
      ├─► 4. Universal Artifacts Prompt Injection: artifacts.inject_artifacts_prompt()
      │      - Injects clean XML guidelines teaching the model to output <antArtifact>.
      │
      ├─► 5. User Profile Name Personalization:
      │      - Checks `user_name` or `x-singularity-user-name` header.
      │      - Injects system prompt ensuring the model knows the user's name across all providers.
      │
      ├─► 6. Thinking Budget Cap & Effort Translation:
      │      - Translates unified `thinking_budget` / `reasoning_effort` into provider-specific syntax:
      │        • Google Antigravity: {"effort": "high" | "medium" | "low"} or local enum
      │        • Google Gemini Web: {"mode": 8, "think": 2 | 4 | 1} (High/Med/Low)
      │        • Claude: {"thinking": {"type": "enabled", "budget_tokens": N}}
      │        • DeepSeek / Qwen / Kimi: {"thinking_enabled": true}
      │        • Xiaomi MiMo: <think> stream capture
      │
      ├─► 7. Direct In-Process Dispatch: engines.stream_chat(provider_id, model, ...)
      │      - Retrieves stacked credentials from SQLite DB (`ORDER BY id DESC`).
      │      - Executes driver in `singularity/engines/<provider>.py`.
      │
      ├─► 8. SSE Post-Processing & Cadence Stream Smoothing:
      │      - Strips search citation noise (`cite...turn...`, `[cite: 1]`).
      │      - Automatically converts ChatGPT `※genui※` blocks to `<antArtifact>`.
      │      - smooth_chat_stream buffers irregular network packets to steady 35ms / 28 FPS cadence.
      │      - Passes tokens through PersonaStreamRewriter if persona is active.
      │
      ▼
Client Streaming Output (SSE `data: {...}`)
```

---

## 6. Provider Engines Deep-Dive (`singularity/engines/`)

Each engine in [`singularity/engines/`](file:///home/insomniac/Desktop/Janitor/singularity/engines/) is a self-contained reverse proxy implementing the provider's native protocol.

### 1. Google Antigravity (`antigravity.py` — Port 8090)
- **Dual-Mode Architecture**:
  - **CloudCode Remote Mode**: Dispatches directly to Google's internal CloudCode infrastructure (`daily-cloudcode-pa.googleapis.com` / `cloudcode-pa.googleapis.com`) using authentic OAuth access tokens (`ya29...`) refreshed via Google client IDs.
  - **Local Language Server RPC Mode**: Automatically discovers running Google Antigravity local language server RPC daemons across dynamic localhost ports (`:3000-65535`), prioritizing cached active ports with sub-millisecond connection probing.
- **Frontier Model Roster**: Full support for `gemini-4-argon` (High/Medium/Low reasoning tiers), `claude-opus-5-5` (High/Med/Low), `claude-sonnet-5-5`, `gemini-3.8-flash-tiered`, and `gemini-3.5-flash`.
- **Resilient Timeout & Keepalive Architecture**: Configured with a `read=600.0s` (10-minute) execution window and background 3-second SSE `: keepalive\n\n` comments, preventing client drops during deep multi-minute reasoning traces.
- **Smart Fallback**: Automatically downgrades Gemini 4 Argon requests on non-whitelisted free tier accounts to Gemini 3.8 Flash without breaking conversational flow.

### 2. Google Gemini Web (`gemini.py` — Port 8084)
- **Protocol**: Reverse proxies Google Gemini's Batchexecute RPC (`https://gemini.google.com/_/BardChatUi/data/batchexecute`).
- **Gemini 4 Argon Web Driver**: Direct support for authentic wire Mode 8 (`95a4c0abcba24364` / `Argon4p0`), with policy `launch_ultra_mode_pro_policy` and granular thinking tiers: Low (1), Medium (4), High (2).
- **Dynamic XSRF & Build Label Scraping**: Automatically extracts active `SNlM0e` XSRF tokens and `bl` build labels from `https://gemini.google.com/app`. Self-heals instantly if Google rotates build versions.
- **SAPISIDHASH Authentication**: Dynamically computes `Authorization: SAPISIDHASH <timestamp>_<sha1>` from session cookies (`SAPISID` / `__Secure-1PAPISID`).
- **High-Definition Media Pipeline**: Resolves generated image candidates through authenticated App Layer Redirection (ALR) hops (`=d-I?alr=yes`) to download full-resolution binaries and stream base64 images.
- **1-Click Auto-Fetch**: Native extraction of `__Secure-1PSID` and `__Secure-1PSIDTS` from local browser SQLite stores (`./singular autofetch gemini`).

### 3. Google AI Studio (`aistudio.py` — Port 8091)
- **Protocol**: Reverse proxies Google AI Studio (MakerSuite) at `https://alkalimakersuite-pa.clients6.google.com`.
- **Dual-Channel Quota Execution**: Employs both Build channel (`ProxyStreamedCall`) and Playground channel (`GenerateContent`) with automatic quota failover.
- **Studio TTS Audio Synthesis**: Generates studio-grade audio speech with Gemini 3.8 Flash TTS and Flash-Lite TTS, converting raw WAV stream bytes to high-fidelity 192k MP3 in-memory via ffmpeg.
- **Authentication**: Seamlessly extracts Google client API keys (`AIzaSy...`) or authenticates via Google `SAPISIDHASH` cookie bundles.

### 4. Xiaomi MiMo AI (`mimo.py` — Port 8092)
- **Protocol**: Reverse proxies Xiaomi AI Studio (`https://aistudio.xiaomimimo.com/open-apis/bot/chat`).
- **Flagship Reasoning & Context**: Native support for `mimo-v2.6-pro` (1M token context window) and `mimo-v2.6-flash`.
- **Deep Reasoning Trace Separation**: Intercepts native `<think>` blocks and streams them into standard OpenAI `reasoning_content` deltas.
- **Audio TTS & Voice ASR**: Built-in speech synthesis (OpenAI `/v1/audio/speech` compatible, mapping Alloy, Echo, Fable to native Xiaomi voices) and speech-to-text voice transcription (`/v1/audio/transcriptions`).
- **Quote-Stripped Cookie Sanitization**: Automatically handles `serviceToken` / `xiaomichatbot_serviceToken` with quote stripping (`.strip('"\'')`) and 24-hour `passToken` background auto-renewal.

### 5. Anthropic Claude (`claude.py` — Port 8080)
- **Protocol**: Reverse proxies `https://claude.ai/api/organizations/{org_id}/chat_conversations/{chat_id}/completion`.
- **Authentication**: Uses `sessionKey` (`sk-ant-sid02-...`).
- **Dynamic Organization Discovery**: Automatically queries `GET /api/organizations` on startup to bind to the user's active organization UUID.
- **Streaming & Reasoning**: Parses raw Anthropic SSE streams, capturing `completion` chunks and extracting `<antThinking>` reasoning blocks.

### 6. Moonshot Kimi (`kimi.py` — Port 8086)
- **Protocol**: Reverse proxies `https://kimi.moonshot.cn/api/chat/stream`.
- **Token Refresh**: Uses persistent JWT refresh tokens to dynamically fetch short-lived access tokens via `POST /api/auth/token/refresh`.
- **Reasoning**: Parses K1.5 and K2 extended thinking traces and strips redundant web search citations.

### 7. Zhipu AI GLM (`glm.py` — Port 8085)
- **Protocol**: Reverse proxies `https://chatglm.cn/chatglm/backend-api/assistant/stream`.
- **Authentication**: GLM refresh tokens.
- **Multimodal**: Handles GLM-4.5/5.3 text streaming and CogView 4 image generation requests.

### 8. DeepSeek (`deepseek.py` — Port 8088)
- **Protocol**: Reverse proxies `https://chat.deepseek.com/api/v0/chat/completion`.
- **Inline WebAssembly PoW Solver**: Contains an inline Node.js runner script that executes against the tracked binary [`singularity/data/deepseek_pow.wasm`](file:///home/insomniac/Desktop/Janitor/singularity/data/deepseek_pow.wasm) to solve cryptographic PoW challenges in ~15ms.
- **Authentication**: DeepSeek userToken (JWT Bearer).
- **Reasoning**: Streams native `reasoning_content` deltas for DeepSeek-R1 and V4/V4.1 models.

### 9. Alibaba Qwen (`qwen.py` — Port 8089)
- **Protocol**: Reverse proxies `https://chat.qwen.ai/api/v1/chat/completions`.
- **Authentication**: Accepts Bearer tokens, cookie strings, or localStorage objects.
- **Features**: Supports Qwen 2.5, Qwen Max, and Qwen Coder with full 1M token context windows, streaming reasoning traces, and search citations.

---

## 7. Credential Vault & Multi-Account Stacking (`singularity/db.py`)

Singularity stores credentials in a zero-dependency, local SQLite database operating in **Write-Ahead Logging (WAL)** mode at `singularity/data/singularity.db`.

### Database Schema
```sql
CREATE TABLE IF NOT EXISTS credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,         -- 'chatgpt', 'claude', 'gemini', 'deepseek', etc.
    identifier TEXT NOT NULL,       -- unique user ID, email hash, or token fingerprint
    name TEXT,                      -- optional human-readable label
    token TEXT NOT NULL,            -- sanitized token string, cookie bundle, or JSON dump
    plan TEXT DEFAULT 'free',       -- 'free', 'plus', 'pro', 'team'
    status TEXT DEFAULT 'active',   -- 'active', 'rate_limited', 'invalid'
    metadata TEXT,                  -- JSON metadata (org_id, refresh_token, expiry)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, identifier)
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Encryption at Rest (`singularity/vault.py`)
- `token`, `metadata` and secret settings (`gateway_key`) are stored as `enc:v1:` values: keyed-BLAKE2b CTR keystream + HMAC-SHA256 (encrypt-then-MAC), standard library only so Termux installs stay pure-Python.
- The master key comes from `SINGULARITY_VAULT_KEY`, else the macOS Keychain / Linux Secret Service / Windows DPAPI, else `singularity/data/vault.key` (`0600`). A new key is only created for a vault with no encrypted data, so a locked keychain can never orphan tokens.
- `identifier` stays plaintext for de-duplication; `_redact_identifier()` replaces any secret-derived identifier (session keys, token prefixes) with a `<provider>_<sha256[:16]>` fingerprint.
- Legacy plaintext rows are migrated in place on first `init_db()`. The DB file is `0600`, the data dir `0700`.

### Stacking & Rotation Rules
- **Stacking**: Users can paste multiple accounts per provider.
- **Priority**: Database queries retrieve accounts with `ORDER BY id DESC`. Newly pasted credentials automatically take precedence.
- **Auto-Healing**: If an account encounters a rate limit (HTTP 429) or token expiration (HTTP 401), the engine flags its status in the DB and fails over to the next stacked account.
- **Universal Parser**: `parse_credential()` automatically handles raw JWT strings, Bearer tokens, browser `Cookie:` headers, and multi-line JSON dumps.

---

## 8. Universal Artifacts & GenUI Sandboxing Engine

Singularity provides first-class support for **Interactive Artifacts** across all models.

```
AI Model Stream
      │
      ├─► Normal Text / Markdown ─────────────► Chat Bubble
      │
      └─► <antArtifact identifier="..." type="...">
               │
               ▼
      Singularity Artifact Parser (app.js)
               │
               ▼
      Side-by-Side Interactive Workbench (iframe `about:srcdoc`)
         ├─ React 18 (Babel Standalone)
         ├─ Tailwind CSS Utility Classes
         ├─ Lucide React Icons & Recharts
         ├─ HTML5 / CSS3 / Vanilla JS
         ├─ Scalable Vector Graphics (SVG)
         └─ Mermaid Diagrams (mermaid.js)
```

### Supported Artifact Formats:
1. `application/vnd.ant.react`: Interactive React components rendered live via Babel Standalone in the browser.
2. `text/html`: Single-file HTML/CSS/JavaScript web applications.
3. `image/svg+xml`: Vector artwork rendered with native pan/zoom.
4. `application/vnd.ant.mermaid`: Clean architectural and process flowcharts.
5. `application/vnd.ant.code`: Standalone code snippets with syntax highlighting.
6. `text/markdown`: Structured multi-section documents.

### GenUI Interception (`※genui※`)
OpenAI ChatGPT Canvas outputs internal JSON blocks formatted as `※genui※{"app_block":...}※`. The Singularity server automatically intercepts these blocks via [`artifacts.py`](file:///home/insomniac/Desktop/Janitor/singularity/artifacts.py) and converts them into standard `<antArtifact>` tags, ensuring full rendering compatibility across the interface.

---

## 9. Personas & Dynamic Identity Rewriter (`singularity/personas.py`)

To deliver access to unreleased frontier models while maintaining authentic behavior, Singularity uses a **Persona Engine**:

- **Model Alias Routing**: A request for `gpt-6-astra` routes internally to a high-capability backend model (`gpt-5-6-mini` or `gpt-5.6-sol`), but the persona engine injects specialized system identity rules.
- **Real-Time Stream Rewriter (`PersonaStreamRewriter`)**: Analyzes streaming SSE token buffers to replace model self-identification phrases (e.g. converting *"I am GPT-5.6"* into *"I am GPT-6 Astra"*) without breaking latency or chunk boundaries.
- **Guaranteed Isolation**: Standard vanilla models (e.g. `claude-3-7-sonnet`, `gemini-2.5-pro`) bypass the persona rewriter entirely.

---

## 10. Cloud Tunneling & Native Mobile Access (`singularity/tunnel.py`)

### Access Control (`singularity/security.py`)
`SecurityMiddleware` wraps every gateway route and the workers use the same policy:
1. A foreign `Origin` (including `null` from sandboxed artifacts) or `Sec-Fetch-Site: cross-site` is refused with 403. Loopback origins and the gateway's own host on another port (Tavern) are allowed, plus `SINGULARITY_ALLOWED_ORIGINS`.
2. Otherwise the request needs one of: `Authorization: Bearer <gateway key>`, the HttpOnly `singularity_session` cookie from `POST /api/auth/login`, or a trusted-local connection (loopback peer, loopback `Host`, no forwarding headers). Tunnel traffic carries the ngrok `Host` and `X-Forwarded-For`, so it always needs the key.
3. The UI shell (`/`, `/static/*` except `/static/generated/*`) and the auth endpoints are public.

The gateway binds `127.0.0.1` unless started with `--lan` / `SINGULARITY_LAN=1` (or an explicit `HOST`). Tavern follows the same flag.

Singularity allows developers to access their desktop server from anywhere on a phone or tablet through an integrated ngrok tunnel manager.

### Architecture Self-Healing (Preventing `[Errno 8] Exec format error`):
On Android Termux, devices frequently run a **64-bit Linux kernel (`aarch64`)** paired with a **32-bit userspace (`arm` / `armhf`)**. A naive `uname -m` check downloads an incompatible 64-bit ELF binary, which crashes with `Exec format error`.

Singularity resolves this by:
1. Inspecting `dpkg --print-architecture` and pointer width (`sys.maxsize > 2**32`).
2. Validating execution via `is_binary_runnable()` (`ngrok version`).
3. Automatically falling back between 64-bit and 32-bit ARM binaries.
4. Auto-purging broken binaries on startup.

---

## 11. Universal Command Line Interface (`./singular` / `./c2a`)

The repository root includes a unified CLI executable.

```bash
cd "/home/insomniac/Desktop/Janitor"

# Inspect fleet health, gateway port, and database stats
./singular status
./singular status --json

# Query live quotas and remaining limits across all 9 providers
./singular limits
./singular limits --json

# Manage SQLite credential vault
./singular accounts                     # List all stacked accounts
./singular accounts gemini              # Filter by provider
./singular import <credentials.json>    # Bulk import credentials
./singular export [backup.json]         # Backup vault to JSON

# 1-Click cookie & token auto-fetch from local browsers
./singular autofetch gemini             # Auto-extracts __Secure-1PSID and __Secure-1PSIDTS
./singular autofetch mimo               # Auto-extracts Xiaomi MiMo service tokens

# Official Google OAuth login for Antigravity
./singular login

# Toggle offline simulation mode
./singular simulate on
./singular simulate off
./singular simulate status

# Quick model inference test (streaming)
./singular chat "Hello" -m gemini-4-argon
./singular chat "Write a fibonacci function" -m agy-claude-opus-5-5-high
./singular chat "Explain black holes" -m claude-3-7-sonnet

# Manage Claude Code bridge (:6045)
./singular claudecode start
./singular claudecode status
./singular claudecode stop

# Manage ngrok cloud tunnel
./singular tunnel                       # Inspect active public HTTPS URL
./singular tunnel start                 # Start background tunnel
./singular tunnel stop                  # Stop active tunnel
./singular tunnel install               # Install native binary for current OS/architecture
./singular tunnel token <token>         # Save ngrok auth token

# Access key management & restart
./singular key                          # Show, set or rotate gateway access key
./singular restart                      # Reclaim and restart port 9000
```

---

## 12. Frontend Architecture & Design System (`singularity/static/`)

The Singularity web UI is built with vanilla ES6 and CSS, adhering to Anthropic's design principles.

- **Theme Engine**: Dual-mode theme system (Light Mode / Dark Mode) powered by CSS custom properties in [`tokens.css`](file:///home/insomniac/Desktop/Janitor/singularity/static/tokens.css) and [`style.css`](file:///home/insomniac/Desktop/Janitor/singularity/static/style.css).
- **Floating Glass Dock (`glass-dock.js`)**: Frosted glass HUD providing quick access to Gateway status, fleet limits, cookie stacking modals, and segmented theme toggles.
- **Custom Model Selector**: Popover with instant search filtering, provider badges, checkmark indicators, and automatic catalog re-rendering.
- **Claude Settings Modal**: Profile customization (avatar upload, user display name persisted to SQLite and injected into model system prompts), temperature controls, thinking caps, and voice selection.
- **WebGL Harmonic Fluid Simulation**: When generating images, the UI renders an analytical harmonic vortex fluid simulation on an HTML5 WebGL canvas. In Light Mode, it folds terracotta streams into pure white; in Dark Mode, it streams luminous terracotta into deep `#141414`.

---

## 13. S-Connect & Janitor AI Matrix (`singularity/connect.py`)

Located in [`singularity/connect.py`](file:///home/insomniac/Desktop/Janitor/singularity/connect.py), this engine powers the Janitor AI character ecosystem and SillyTavern character card matrix with zero compilation overhead:

- **Character Card Discovery & Search**: Native Janitor character catalog search, trending bot discovery, and creator profile browsing.
- **SillyTavern PNG Matrix Parser**: Decodes standard SillyTavern character card PNG chunks (`chara` / `tEXT`) in pure Python using `struct`, `zlib`, and fallback decompression without requiring Rust dependencies.
- **Tempest Visual Bio Studio**: Interactive visual canvas designer allowing users to construct, preview, and export rich character cards with structured bio layouts.
- **Custom Proxy & Reverse-Engineered Prompt Interceptor**: Intercepts character prompts, system directives, and conversational histories sent to `/v1/chat/completions` from external frontends, capturing authentic persona configurations and eliminating CORS barriers.
- **Multi-Tier Creator Profile Cache**:
  - *Tier 1*: Local SQLite cache (`connect_creators`, 0ms latency).
  - *Tier 2*: Native Janitor profile endpoint (`https://janitorai.com/mb/profiles/{id}`, ~300ms) with authentic follower counts, bios, and badges.
  - *Tier 3*: Domcord mirror fallback (`cards-backend.domcord.org`, capped at 1.5s timeout).
- **34 Bots/Page Deterministic Pagination**: Janitor AI caps character responses at 34 items per page. The engine computes total pages deterministically (`ceil(total / 34)`) and fetches pages $2..N$ concurrently via `asyncio.gather()`, chunking creator UUIDs in batches of 50 to prevent network timeouts.

---

## 14. Claude Code Protocol Bridge (`singularity/claudecode_bridge.py`)

Located in [`singularity/claudecode_bridge.py`](file:///home/insomniac/Desktop/Janitor/singularity/claudecode_bridge.py), this daemon runs on port `6045` and translates the official Anthropic Messages protocol for coding agents:

- **Anthropic Messages Emulation**: Implements `POST /v1/messages` with complete SSE streaming event sequences (`message_start`, `content_block_start`, `content_block_delta`, `thinking_delta`, `tool_use`, `message_delta`, `message_stop`).
- **Claude Code CLI & Claude Desktop Integration**: Allows developers to drive CLI coding agents (`claude`) powered entirely by Singularity's free backend models (Kimi, DeepSeek, Antigravity, Gemini).
- **Thinking & Signature Emulation**: Generates compatible thinking blocks and cryptographic signatures so clients don't reject non-Claude responses.
- **Multimodal Image Support**: Translates Anthropic base64 image content blocks to OpenAI `image_url` format automatically.
- **Integrated Fallback WebSearch**: Native DuckDuckGo and Google News search fallback for coding queries.

---

## 15. OpenAI Native Tools Bridge (`singularity/openai_tools_bridge.py`)

Located in [`singularity/openai_tools_bridge.py`](file:///home/insomniac/Desktop/Janitor/singularity/openai_tools_bridge.py), this bridge equips web LLM backends with native function calling capabilities:

- **Zero-Pollution Invariant**: If an incoming request does not contain `tools` or `functions`, this module is an absolute NO-OP. Roleplay, Janitor, SillyTavern, and creative chats remain 100% untouched.
- **Tool Schema Translation**: Formats incoming OpenAI JSON Schema tools and functions into a strict, unambiguous `<tool_call>` system prompt instruction.
- **Real-Time Token Interception**: Analyzes SSE streams for `<tool_call>` blocks and dynamically formats them into standard OpenAI `tool_calls` delta payloads with deterministic call IDs (`call_<uuid>`).
- **IDE Agent Compatibility**: Enables tool use in IDE extensions such as Cline, Roo Code, and Cursor against free models that lack native OpenAI function calling support.

---

## 16. Agent Protocols: Adding Providers & Extending Models

When instructed to add support for a new AI provider (e.g. 10th provider):

### Step 1: Create Single-File Engine
Create `singularity/engines/<provider>.py`. Ensure all logic (authentication, PoW solving, streaming SSE, and image extraction) lives in this single file.

### Step 2: Register in Engine Dispatcher
Add import and routing cases to `stream_chat()` and `generate_chat()` in [`singularity/engines/__init__.py`](file:///home/insomniac/Desktop/Janitor/singularity/engines/__init__.py).

### Step 3: Register Provider Configuration & Models
In [`singularity/providers.py`](file:///home/insomniac/Desktop/Janitor/singularity/providers.py):
- Add entry to `PROVIDERS_CONFIG` (ID, name, default port, badge, brand color, cookie types).
- Add models to `MODELS_CATALOG`. Search the web to identify current-year frontier releases.
- Implement live limits checking in `get_all_limits()`.

### Step 4: Add Model Resolution & Routing
In [`singularity/server.py`](file:///home/insomniac/Desktop/Janitor/singularity/server.py):
- Update `resolve_model_provider()` with model prefix matching rules.
- Add provider-specific thinking budget translation rules.

### Step 5: Update Credential Vault
In [`singularity/db.py`](file:///home/insomniac/Desktop/Janitor/singularity/db.py):
- Update `parse_credential()` to extract credentials from tokens, session strings, or JSON dumps.

### Step 6: Frontend & UI Assets
- Add brand SVG icon to `singularity/static/icons/<provider>.svg`.
- Add provider filter pills to the Model Picker and Cookie Stacker in [`singularity/static/index.html`](file:///home/insomniac/Desktop/Janitor/singularity/static/index.html).

### Step 7: Verify with Authentic Live Requests
- Stack valid credentials in the database vault using `./singular accounts`.
- Execute a live test inference using `./singular chat "Hello" -m <model-id>`.
- Verify response tokens, latency, and absence of upstream errors.
