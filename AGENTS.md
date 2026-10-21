# AI Agent Instructions for Singularity Workspace

## 🏷️ Repository Identity & Distinction
There are two distinct repositories/forks — maintaining clear separation is strictly mandatory:
- **NEPHIS-Sing (`https://github.com/Nephis-opus/Singularity`) [THIS WORKSPACE]**:
  - The canonical, active workspace repository.
  - Fully built and developed by Nephis / InsomniacZero.
  - Heavy focus on user-friendliness, streamlined pure-Python architecture (`StarletteGateway` / zero Rust compilation on mobile), unified Control Center & Playground UI, and SillyTavern character card integration.
- **NISTE-sing & DOMCORD-CARDS [ISOLATED REFERENCES]**:
  - `niste-sing/` and `Domcord-Cards/` are pulled/extracted strictly for reference, protocol inspection, or comparative reverse-engineering.
  - **Rule**: Never import, execute, or mix files from `niste-sing/`, `legacy/`, or `Domcord-Cards/` directly into NEPHIS-Sing runtime code. All runtime code must live purely in `singularity/`.

---

## ⚠️ Essential Project Rules
1. **NO GIT PUSH**: Never push code or tokens to GitHub (`git push` is forbidden unless explicitly asked by the user).
2. **NO BROWSER / CHROME AUTOMATION**: Do not open Chrome or use browser subagents unless explicitly instructed.
3. **PREFER REPO CLI (`./singular` or `./c2a`)**: When checking accounts, verifying quotas/limits, testing models, or checking status, **DO NOT** write multi-line Python scratch scripts or raw curl commands. **Always use the built-in `./singular` (or `./c2a`) CLI tool**.
4. **NO LEGACY / NISTE-SING / DOMCORD-CARDS DEPENDENCIES**: The Singularity workspace is 100% self-contained in `singularity/`. Do not import, execute, or link against files from `legacy/`, `niste-sing/`, or `Domcord-Cards/`.
5. **ZERO RUST BUILD TOOLCHAINS ON MOBILE**: Singularity runs on pure Python with `StarletteGateway` and `uvicorn`. Never add `pydantic` or `fastapi` to `requirements.txt`. Startup dependency checks must verify pure packages (`starlette, uvicorn, httpx`) so phone installation completes in 3–5 seconds without Cargo/Rust compilation.
6. **ARCHITECTURE MANUAL**: Consult [ARCHITECTURE.md](file:///home/insomniac/Desktop/Janitor/ARCHITECTURE.md) for the full architectural blueprint, request lifecycle, engine protocol specifications, and data flow pipelines.
7. **CANONICAL DUAL-LAUNCHER INVARIANT**: Strictly two launchers: `./start.sh` (Unix/macOS/Termux) and `start.bat` (Windows). `start.command` is only a macOS double-click shim that executes `start.sh`.

---

## ⚙️ Core Architectural & Operational Doctrines

### 1. The Clockwork Cog Doctrine (Systemic Dependency Awareness)
Every file, prompt, schema, and engine in this codebase is an interlocking gear.
- **Before modifying any component**, trace its upstream callers and downstream consumers (e.g. modifying a model name affects `MODELS_CATALOG`, `resolve_model_provider`, engine configs, and the frontend selector; modifying a database schema affects migrations, serializers, and sync loops).
- Never treat any script or file as an isolated silo. Think, trace, and verify dependencies across the entire pipeline.

### 2. The Root Cause Excision Doctrine (No Pink Elephant Patch Bloat)
- **The Chronic Failure Mode**: When an agent introduces a flawed behavior or buggy condition and the user complains, the agent piles on a negative constraint ("Anti-X Patch", e.g. *"Do NOT stare", "Never do X"* or negative prompt conditionals).
- **The Pink Elephant Problem**: Stating negative constraints forces the unwanted concept directly into an LLM's active attention window, doubles token bloat, and leaves brittle band-aids over flawed foundations.
- **The Mandatory Protocol**:
  1. Locate the **original root cause** line or faulty logic.
  2. **DELETE IT ENTIRELY.**
  3. Rewrite the behavior with **clean, positive, intentional grounding** (state what the system *should* do, not what it shouldn't).
  4. Zero negative patch clutter or layered band-aids.

### 3. Deterministic Ground Truth (Zero Hallucinated Metrics)
- Never guess, estimate, or state token counts, quotas, or response timings from thin air.
- Word counts $\neq$ BPE token counts (special tokens, punctuation, and markdown inflate tokens by 1.3–1.7x).
- Run deterministic tools (`tools/count_tokens.py`, `./singular limits`, or live CLI queries) to verify exact numbers before concluding a task.

### 4. Anti-Sycophancy & Technical Pushback
- You are strictly forbidden from acting as a passive "yes-man" or blindly implementing flawed instructions.
- If an instruction is **contradictory**, **technically harmful**, or **architecturally corrupting**:
  1. Politely and firmly challenge the premise.
  2. Clearly explain the technical conflict and what components will break.
  3. Prescribe the clean, robust architectural refactoring to achieve the user's underlying goal.

### 5. Strict Real-Live Verification (No Fake Simulations)
- NEVER test fixes or claim endpoints work using `--simulate` when verifying live provider functionality.
- Execute real upstream requests using `./singular chat "<prompt>" -m <model>` to confirm real HTTP transport, cookie auth, response tokens, and media downloads.

### 6. The 5-Step Pre-Flight Verification Checklist
Before concluding any feature, fix, or prompt change:
1. **Source Ground Truth**: Check actual novel canon, official API docs, or live server contracts.
2. **Dependency Trace**: Verify all linked files (configs, catalogs, frontend handlers, database queries).
3. **Syntax & AST Validation**: Run `node --check <file>.js` or `python3 -m py_compile <file>.py`.
4. **Deterministic Measurement**: Audit token counts, response codes, and schemas deterministically.
5. **Regression Check**: Ensure existing launchers, CLI subcommands, and desktop/mobile layouts remain unbroken.

---

## 🚀 Singularity Unified CLI (`./singular` / `./c2a`) Reference

The unified CLI tool is located in the repository root:
`./singular` (also symlinked as `./c2a`)

```bash
# 1. Inspect Fleet Status & Database Vault
./singular status                    # Live status of all providers & accounts summary
./singular status --json             # Compact JSON output for scripting

# 2. Live Limits & Quotas Across All Providers
./singular limits                    # Real-time limits & remaining quotas
./singular limits --json             # Structured JSON limits payload

# 3. Account Vault Management (SQLite)
./singular accounts                  # List all stacked accounts across providers
./singular accounts gemini           # Filter accounts by provider (gemini, antigravity, claude, kimi, etc.)
./singular import <path_or_json>     # Import credentials dump into SQLite vault
./singular export [backup.json]      # Export portable credential vault to JSON
./singular autofetch gemini          # 1-Click auto-discovery of Gemini cookies from local browsers
./singular autofetch mimo            # 1-Click auto-discovery of Xiaomi MiMo tokens
./singular login                     # 1-Click Google OAuth login for Antigravity

# 4. Fast Live Model Inference & Testing (Authentic upstream calls)
./singular chat "What is 2+2?" -m gemini-4-argon              # Quick streaming chat test
./singular chat "Explain quantum field theory" -m agy-claude-opus-5-5-high   # Antigravity test
./singular chat "Hello" -m gemini-3.8-flash                  # Gemini Flash test

# 5. Gateway Server Control (Singularity Gateway :9000)
./start.sh                           # Linux / macOS / Termux
start.bat                            # Windows (native cmd/powershell)
./singular restart                   # Clean port 9000 reclaim and gateway restart

# 6. Cloud Tunnel & Native Remote Mobile Access (ngrok)
./singular tunnel                    # Inspect tunnel state & public HTTPS URL
./singular tunnel start              # Expose gateway securely to the internet
./singular tunnel stop               # Stop active public tunnel
./singular tunnel install            # Auto-install native ngrok binary (Phone Termux / PC)
./singular tunnel token <token>      # Set ngrok authtoken

# 7. Claude Code Protocol Bridge (:6045)
./singular claudecode start          # Launch Anthropic Messages bridge for Claude Code CLI
./singular claudecode status         # Check bridge status
./singular claudecode stop           # Terminate bridge daemon
```

---

## 🛠️ Protocol for Adding a New AI Provider to Singularity

When expanding Singularity to support a new AI provider:

1. **Zero Legacy Runtime Dependencies**: Reference code in `legacy/` or `niste-sing/` is for reverse-engineering inspection only. Never import or link against them.
2. **Strict One-File Engine Rule (`singularity/engines/<provider>.py`)**:
   - Strictly ONE file per provider in `singularity/engines/`. No auxiliary `.js`, `.py`, or `.sh` files.
   - Any sub-processes (PoW solvers, WASM runners) must be embedded as inline constants.
   - Binary assets belong in `singularity/data/` and must be explicitly unignored in `.gitignore` (`!singularity/data/*.wasm`).
3. **Exhaustive Discovery & Active Aliases**: Web search current-year releases (e.g. V4, V4.1, Flash, Pro, Reasoner). Register in `MODELS_CATALOG` (`singularity/providers.py`) and alias resolvers in `singularity/server.py`.
4. **Realistic Limits**: Query live user profiles / limits endpoints. Never fabricate arbitrary quotas.
5. **Flexible Credential Parsing**: Add parser to `parse_credential()` in `singularity/db.py` handling raw tokens, full JSON dumps, localStorage key-value objects, and session cookies.
6. **Full Integration**: Add provider config to `PROVIDERS_CONFIG`, SVG icon to `singularity/static/icons/<provider>.svg`, and update UI filter pills and token guides. Validate with authentic `./singular chat` queries.

---

## 📝 Engineering Lessons & Post-Mortem Playbook

### 1. Authentication, Tokens & Cookies
- **Google Antigravity & AI Studio Lifecycle**: Dual-mode execution (CloudCode API + Local Language Server RPC). Prioritize cached local ports with sub-millisecond connection probing. Configure `read=600.0s` timeout with background 3-second SSE keepalives to support deep multi-minute reasoning traces. Manage OAuth refresh tokens with 1-click `./singular login`.
- **Google Gemini Authentication**: Requires `__Secure-1PSID` and `__Secure-1PSIDTS`. Extract `SNlM0e` XSRF token and `bl` build label from `/app`. Attach `Authorization: SAPISIDHASH <ts>_<sha1>` derived from `SAPISID`. Sort vault accounts `ORDER BY id DESC` so newest credentials take priority. Validate sessions via `/app` extraction instead of parameterless `batchexecute`.
- **cURL Header Dump & Token Ingestion Defense**: In `singularity/db.py` (`parse_credential`), specifically detect cURL commands and extract solely the `Cookie:` header value, rejecting arbitrary HTTP header lines (`-H "..."`) to prevent database vault pollution from phantom accounts.
- **Xiaomi MiMo Cookies**: Strip surrounding literal quotes (`.strip('"\'')`) from cookie values. Support both `serviceToken` and `xiaomichatbot_serviceToken`. Model parameter must strictly be `"model": <id>`.

### 2. Gateway Security & Sandbox Invariants
- **Access Control**: Keep `singularity/security.py` as the single access policy (loopback trusted, gateway key or session cookie otherwise). Never add `CORSMiddleware(allow_origins=["*"])`. Default bind is `127.0.0.1` (`--lan` is opt-in).
- **Artifact Sandboxing**: GenUI blocks (`※genui※`) must route through `singularity/artifacts.py` to `<antArtifact>`. The artifact iframe must **never** have `allow-same-origin`. Storage APIs run through `withSandboxShims()`. Secrets must be encrypted via `singularity/vault.py`—never store tokens in the `identifier` column.
- **Route Table Immutability**: Starlette compiles its route handlers into internal data structures at application instantiation. Modifying routes on `@app` requires a clean gateway restart (`./singular restart`), as module hot-reloading does not re-bind Starlette route tables.

### 3. Termux, Mobile & OS Compatibility
- **Zero Rust Compilation**: Keep `requirements.txt` strictly pure Python (`starlette, uvicorn, httpx`). Never introduce `pydantic` or `fastapi` which trigger `cargo` compilations on Termux.
- **Architecture Mismatch**: On Android Termux, 64-bit kernels (`aarch64`) often run 32-bit userlands (`armhf`). Always verify ELF runnable status (`ngrok version`) before executing downloaded binaries.
- **Windows Batch Traps**: Never use raw unescaped parentheses inside `if (...)` blocks in `.bat` files. Use square brackets `[v22+]` or escape them `^)`. Escape ampersands `^&`.
- **Responsive CLI**: Avoid rigid fixed-width text frames (`"=" * 66`) that wrap and shatter on narrow mobile terminals. Use clean indentation and soft status dots. Silence Uvicorn HTTP access logs by default to prevent stdout pollution.

### 4. Data Architecture, SWR & Cloud Sync
- **Creator & Bot Catalog Scraping**: Janitor AI caps character queries at 34 per page. Compute total pages deterministically (`ceil(total / 34)`) and fetch pages $2..N$ concurrently. Partition followed creator UUIDs into chunks of 50 to avoid request timeouts.
- **Zero-Flicker SWR Rendering**: Render cached SQLite data immediately at 0ms latency. Dirty-check cloud sync payloads before triggering view re-renders, and mutate DOM in-place only if contents changed.
- **Non-Destructive Quality Guards**: In-memory and database sync must never downgrade authentic profiles (`followers > 0`, real bio) with synthetic placeholder profiles (`followers: 0`, `"Creator of <bot>"`). Strip `<style>` and `<script>` blocks from creator bios before rendering previews.

### 5. Frontend & UI Contracts
- **Dynamic Account Pools**: Never hardcode account counts in UI dialogs (e.g. `(7 accounts pool)`). Fetch live counts dynamically from `/api/services` and cap concurrency selectors to available accounts.
- **AST Checks Before Conclusion**: Always run `node --check <file>.js` after modifying frontend scripts to catch unclosed brackets or syntax errors that kill browser execution.
- **Sticky Header Positioning**: Never call `scrollIntoView` on inner containers placed below sticky navigation bars, which clips top content. Target absolute top anchors ($Y=0$) and reset `scrollTop = 0` across scroll ancestors.
