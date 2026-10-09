# AI Agent Instructions for Singularity Workspace

## 🏷️ Repository Identity & Distinction
There are two distinct repositories/forks — maintaining clear separation is strictly mandatory:
- **NEPHIS-Sing (`https://github.com/Nephis-opus/Singularity`) [THIS WORKSPACE]**:
  - The canonical, active workspace repository.
  - Fully built and developed by Nephis / InsomniacZero.
  - Heavy focus on user-friendliness, streamlined pure-Python architecture (`StarletteGateway` / zero Rust compilation on mobile), unified Control Center & Playground UI, and Tavern integration.
- **NISTE-sing & DOMCORD-CARDS [ISOLATED REFERENCES]**:
  - `niste-sing/` and `Domcord-Cards/` are pulled/extracted strictly for reference, protocol inspection, or comparative reverse-engineering.
  - **Rule**: Never import, execute, or mix files from `niste-sing/`, `legacy/`, or `Domcord-Cards/` directly into NEPHIS-Sing runtime code. All runtime code must live purely in `singularity/`.

## ⚠️ Essential Project Rules
1. **NO GIT PUSH**: Never push code or tokens to GitHub (`git push` is forbidden unless explicitly asked by the user).
2. **NO BROWSER / CHROME AUTOMATION**: Do not open Chrome or use browser subagents unless explicitly instructed.
3. **PREFER REPO CLI (`./singular` or `./c2a`)**: When checking accounts, verifying quotas/limits, testing models, checking status, or toggling simulation mode, **DO NOT** write multi-line Python scratch scripts or raw curl commands. **Always use the built-in `./singular` (or `./c2a`) CLI tool**.
4. **NO LEGACY / NISTE-SING / DOMCORD-CARDS DEPENDENCIES**: The Singularity workspace is 100% self-contained in `singularity/`. Do not import, execute, or link against files from `legacy/`, `niste-sing/`, or `Domcord-Cards/`.
5. **ZERO RUST BUILD TOOLCHAINS ON MOBILE**: Singularity runs on pure Python with `StarletteGateway` and `uvicorn`. Never add `pydantic` or `fastapi` to `requirements.txt`. Startup dependency checks must verify pure packages (`starlette, uvicorn, httpx`) so phone installation completes in 3–5 seconds without Cargo/Rust compilation.
6. **ARCHITECTURE MANUAL**: Consult [ARCHITECTURE.md](file:///home/insomniac/Desktop/Janitor/ARCHITECTURE.md) for the full architectural blueprint, request lifecycle, engine protocol specifications, and data flow pipelines.

---

## 🚀 Singularity Unified CLI (`./singular` / `./c2a`) Quick Cheat Sheet
The unified tool is located directly in the repository root:
`./singular` (also symlinked as `./c2a` for backward compatibility)

You can run it directly from bash in the repository root:

```bash
cd "/home/insomniac/Desktop/UNI/Apps/Gemini Web2Api/Singularity"

# 1. Inspect Fleet Status & Database Vault
./singular status                    # Live status of all 8 providers & accounts summary
./singular status --json             # Compact JSON output for scripting

# 2. Live Limits & Quotas Across All Providers
./singular limits                    # ChatGPT, Claude, Gemini, Grok, Kimi, GLM, DeepSeek, Qwen quotas
./singular limits --json             # Structured JSON limits payload

# 3. Account Vault Management (SQLite)
./singular accounts                  # List all stacked accounts across providers
./singular accounts chatgpt          # Filter accounts by provider (chatgpt, kimi, claude, deepseek, etc.)
./singular import <path_or_json>     # Import credentials dump into SQLite vault
./singular export [backup.json]      # Export portable credential vault to JSON

# 4. Device Simulation Mode (Portable / Offline Testing)
./singular simulate on               # Enable simulation mode (test all 216 models without backends)
./singular simulate off              # Disable simulation mode (connect to live backends)
./singular simulate status           # Check current simulation state

# 5. Fast Model Inference & Testing
./singular chat "What is 2+2?" -m gpt-5-6-mini       # Quick streaming chat test
./singular chat "Hello" -m gemini-3.8-flash           # Gemini test
./singular chat "Explain quantum computing" --simulate # Force simulated completion

# 6. Gateway Server Control (Dual-boots Singularity :9000 + Tavern Studio :5173)
./start.sh                           # Linux / macOS / Termux
start.bat                            # Windows (native cmd/powershell)

# 7. Cloud Tunnel & Native Remote Mobile Access (ngrok)
./singular tunnel                    # Inspect tunnel state & public HTTPS URL
./singular tunnel start              # Expose gateway securely to the internet
./singular tunnel stop               # Stop active public tunnel
./singular tunnel install            # Auto-install native ngrok binary (Phone Termux / PC)
./singular tunnel token <token>      # Set ngrok authtoken
```

---

## 🛠️ Protocol for Adding a New AI Provider to Singularity

When expanding Singularity to support a new AI provider (e.g. 8th, 9th provider):

### 1. Zero Legacy Runtime Dependencies
- If a reference repo is cloned into `legacy/` (e.g. `legacy/<repo>`), use it **only** to study API contracts, signatures, and protocols.
- **Never** import, execute, or link against `legacy/`. All runtime code must live in `singularity/`.

### 2. Strict One-File Engine Rule (`singularity/engines/`)
- Every provider must have **strictly ONE file** in `singularity/engines/`: `singularity/engines/<provider>.py`.
- **Do not scatter auxiliary scripts** (no extra `.js`, `.py`, or `.sh` files in `engines/`).
- Any sub-processes (e.g. Node.js PoW solvers, WASM execution scripts) must be embedded as inline constants within `<provider>.py`.
- Binary assets (e.g. `.wasm` modules) belong in `singularity/data/` and **must be unignored** in `.gitignore` (`!singularity/data/*.wasm`) so they are tracked by git.

### 3. Exhaustive Model Discovery & Web Research
- **Never assume legacy models are the latest.** Always run targeted web searches for:
  - Current-year model releases (e.g. V4, V4.1, Flash, Pro, Reasoner).
  - Official API aliases and web endpoints.
  - Context window capacities, vision/multimodal capabilities, and thinking/CoT features.
- Register every model in `MODELS_CATALOG` in [`singularity/providers.py`](file:///home/insomniac/Desktop/UNI/Apps/Gemini%20Web2Api/Singularity/singularity/providers.py).
- Register all model prefixes and aliases in `resolve_model_provider()` in [`singularity/server.py`](file:///home/insomniac/Desktop/UNI/Apps/Gemini%20Web2Api/Singularity/singularity/server.py).

### 4. Realistic & Non-Hallucinated Limits
- Do not fabricate arbitrary limits. Query the provider's live user profile / limits API (`/users/current`, etc.) using credentials if available.
- Reflect exact capabilities (Reasoning, Web Search, File Upload size/count, Concurrency, Reset Windows) in `get_all_limits()` in [`singularity/providers.py`](file:///home/insomniac/Desktop/UNI/Apps/Gemini%20Web2Api/Singularity/singularity/providers.py).

### 5. SQLite Credential Vault Support
- Add the provider parser to `parse_credential()` in [`singularity/db.py`](file:///home/insomniac/Desktop/UNI/Apps/Gemini%20Web2Api/Singularity/singularity/db.py).
- Ensure it flexibly handles raw token strings, full JSON dumps, localStorage key-value objects (e.g. `{"value": "...", "__version": "0"}`), and JWTs.

### 6. Full Gateway & Control Center Integration
- Add provider configuration to `PROVIDERS_CONFIG` in `providers.py` (port, badge, color, host).
- Add SVG icon to `singularity/static/icons/<provider>.svg`.
- Update Control Center UI in `singularity/static/index.html` and `singularity/static/app.js` (filter pills, cookie stacker tabs, token guides).
- Test both simulated (`--simulate`) and live inference using `./singular chat`.
- Confirm fleet health via `./singular status` and `./singular limits`.

---

## 📝 Post-Mortem & Mistakes Log (Lessons Learned)

Keep these past failures in mind to avoid repeating them:

1. **Incomplete Model Discovery (Surface-Level Research)**:
   - *Mistake*: During DeepSeek integration, research stopped at the V3/R1 baseline found in the legacy reference repo, completely missing the newly released V4, V4-Pro, and V4.1-Flash models until the user pointed it out.
   - *Lesson*: Always execute thorough web searches focused specifically on the newest releases, current year changes, and active aliases before writing the model catalog.

2. **Engine Directory Clutter**:
   - *Mistake*: Created `deepseek_pow.js` and `deepseek_pow.py` in `singularity/engines/`, breaking the clean architecture where each provider has exactly one unified driver file.
   - *Lesson*: Keep `singularity/engines/` strictly one-file per provider (`<provider>.py`). Inline auxiliary Node.js or shell helpers directly in the Python module.

3. **Untracked Binary Assets in Git**:
   - *Mistake*: Placed the required WebAssembly binary in `singularity/data/` while `singularity/data/` was ignored in `.gitignore`, risking a broken deployment on fresh clones.
   - *Lesson*: Whenever placing native runtime assets in data folders, explicitly whitelist them in `.gitignore` (e.g. `!singularity/data/*.wasm`).

4. **Blindly Copying Outdated Reference Headers**:
   - *Mistake*: Copied old Android client headers (`DeepSeek/1.0.13 Android/35`) from the reference repo, causing the live API to reject requests with `CLIENT_VERSION_TOO_LOW`.
   - *Lesson*: Modern web APIs change client versions frequently. Always verify against current browser client headers (`x-client-platform: web`, modern User-Agents).

5. **Self-Recursive Worker Forwarding Loops**:
   - *Mistake*: Left an upstream check inside the engine that forwarded requests to port 8088 when the engine itself was running inside the 8088 worker, causing an infinite loop.
   - *Lesson*: Engine files are the backend implementations themselves; they must execute the native Web2API reverse-proxy logic directly.

6. **Dependency Creep & Mobile Rust Build Trap**:
   - *Mistake*: Inadvertently adding `fastapi` and `pydantic` to `requirements.txt`. On Android (Termux), `pip install` pulls `pydantic-core`, which attempts to compile Rust via `cargo`, hanging for hours on phones.
   - *Lesson*: Singularity runs on pure Python with `StarletteGateway` and `uvicorn`. Never add `pydantic` or `fastapi`. Keep `requirements.txt` strictly lightweight and pure Python so phone installations take 3–5 seconds.

7. **Termux Kernel vs Userspace Architecture Mismatch (`[Errno 8] Exec format error`)**:
   - *Mistake*: Relying solely on `uname -m` to select native binaries (e.g. ngrok) on Android Termux. On many phones, a 64-bit kernel (`aarch64`) runs a 32-bit Termux userspace (`arm` / `armhf`). Attempting to execute a 64-bit ELF binary on a 32-bit userland crashes with `[Errno 8] Exec format error`. Furthermore, checking `os.access(..., os.X_OK)` returns `True` even for mismatched ELF architectures.
   - *Lesson*: Detect userspace architecture using `dpkg --print-architecture` and pointer width (`sys.maxsize > 2**32`). Always test execution via `is_binary_runnable` (`ngrok version`) before using a binary, provide automatic fallback between 64-bit and 32-bit ARM, and auto-purge broken binaries on startup.

8. **Windows Batch Parenthesis & Ampersand Traps**:
   - *Mistake*: Placing raw parentheses inside CMD `if (...)` blocks in Windows `.bat` scripts (e.g. `echo Please install Node.js (v22+)`). In `cmd.exe`, an unescaped `)` prematurely terminates the `if` block and crashes with syntax errors.
   - *Lesson*: Never use raw parentheses inside `if (...)` blocks in `.bat` files. Use square brackets `[v22+]` or escape them `^)`. Always escape ampersands `^&` in echo statements.

9. **Universal GenUI Interception (`※genui※`) & Artifact Sandboxing**:
   - *Mistake*: ChatGPT web canvas outputs raw `※genui※{"app_block":...}※` JSON payloads directly into chat bubbles, and error boundaries placed below the fold hide React failures.
   - *Lesson*: Always route GenUI blocks through `singularity/artifacts.py` to auto-convert to `<antArtifact>`, use programmatic Babel compilation instead of DOM scanner scripts, and fix error boundaries at `top: 16px; z-index: 999999`. The artifact iframe must **never** get `allow-same-origin` (see lesson 24): keep `<base href>` + absolute `/static/vendor/*` paths with CDN fallbacks, and route every artifact type through `withSandboxShims()` so storage APIs work in the opaque origin.

10. **Canonical Dual-Launcher Invariant (`start.sh` and `start.bat`)**:
    - *Mistake*: Creating multiple ad-hoc startup scripts (`start_singularity.sh`, `singular.bat`) when users request running from arbitrary directories.
    - *Lesson*: Singularity maintains strictly two canonical launchers: `start.sh` (symlinked as `singular` for Unix/Termux) and `start.bat` for Windows. Both handle co-startup of Singularity and optional Tavern, auto-detect dependencies, and clean up child processes on exit. `start.command` is only a macOS double-click shim that `cd`s to the repo and `exec`s `start.sh`; never put launcher logic in it.

11. **Module-Level Imports for Archive Extraction Handlers (`tarfile`, `zipfile`)**:
    - *Mistake*: Calling `tarfile.open()` inside an installer helper without `import tarfile` at the top of the file, causing runtime crashes (`name 'tarfile' is not defined`) when unpacking `.tgz` binaries on Android/Linux.
    - *Lesson*: Always import standard library archive tools (`tarfile`, `zipfile`) at module level and run an AST-based undefined-variable check on any newly added functions before shipping.

12. **Termux Current Directory vs. Global PATH Command Execution**:
    - *Mistake*: Typing `singular` or `singularity` directly in `~/Singularity` before initial launch fails with `command not found` because `.` is not in `$PATH`.
    - *Lesson*: First-time boot requires `./start.sh` (or `bash install.sh`). `start.sh` automatically establishes global symlinks in `$PREFIX/bin/singular`, `$PREFIX/bin/singularity`, and `$PREFIX/bin/c2a` so subsequent executions work globally without `./`.

13. **ChatGPT Web Image Generation Block in Temporary Chats & Direct Estuary CDN 403**:
    - *Mistake*: Selecting image models like `gpt-image-2.5-flare` failed with *"image generation isn't available in this temporary chat"*. This was caused by hardcoding `history_and_training_disabled: True` in OpenAI payload (OpenAI strictly disables DALL-E in temporary chats) and direct browser loading of `backend-api/estuary` URLs which return 403 without session cookies.
    - *Lesson*: For image models, dynamically toggle `history_and_training_disabled: not is_image_model`, add `system_hints: ["picture_v2"]`, download the image binary in the authenticated session, persist to `singularity/static/generated/`, stream base64 data URIs, and auto-hide the conversation via `PATCH /backend-api/conversation/{conv_id}` with `{"is_visible": False}`.

14. **Generated Image Viewport UI & Clean Floating Action Overlays**:
    - *Mistake*: Encasing AI-generated images inside bloated cards with extra border outlines and footer caption bars ("Neural Synthesis", redundant prompt text).
    - *Lesson*: Present generated images cleanly with rounded corners (`border-radius: 16px`), no caption footer, and a sleek floating top-right frosted glass overlay containing only **Copy** (with checkmark feedback) and **Download** SVG buttons with tooltips.

15. **High-Definition WebGL Fluid Simulation & Theme Adaptive Palette**:
    - *Mistake*: Checking `document.body.getAttribute('data-theme')` instead of `document.documentElement.getAttribute('data-theme')`, causing light mode to falsely register as dark mode and rendering black patches instead of clean white; and hardcoding pitch black instead of the UI's theme primary dark `#141414`.
    - *Lesson*: For image generation loading, check theme on `document.documentElement` (`document.documentElement.getAttribute('data-theme') || document.body.getAttribute('data-theme')`). In Light Mode, replace all dark/black elements with pure white (`#ffffff`) and soft whitish (`#fcfbfa`) with terracotta `#d97757` streams folding and merging into white fluid (zero black patches!). In Dark Mode, use the UI's dark background `#141414` (from tokens `--bg-primary`) with luminous terracotta streams. Render with GPU-accelerated WebGL using analytical harmonic vortex potential flow at native Retina resolution with strictly autonomous motion, "Creating image" header, dynamic aspect ratio, and frosted progress pill. On completion, `finish()` deallocates WebGL shaders and the final image pop-fades in.

16. **Dark Mode User Bubbles & Whitened UI Action Controls**:
    - *Mistake*: Dark mode user messages blending into generic dark gray backgrounds, with action buttons and top header settings icons being too dim (`var(--text-muted)` = `#78716c`), causing poor contrast and muddy appearance.
    - *Lesson*: In dark mode, style user message bubbles with brand terracotta `#d97757` and crisp white text. Whiten response action buttons (`.response-actions`), user message hover controls (`.user-msg-actions`), and top header settings buttons (`.claude-icon-btn`, `.claude-avatar-btn`) to `rgba(255, 255, 255, 0.85-0.92)` / `#ffffff` on hover, while keeping date timestamps subtly muted (`var(--text-muted)`).

17. **Google Omni Multimodal & Veo Cinematic Video Model Integration**:
    - *Mistake*: Overlooking Google DeepMind's frontier generative media family beyond text (`Google Omni` and `Veo`), causing video and conversational multimodal queries to miss specialized model routing and capabilities.
    - *Lesson*: Register the complete **Google Omni** family (`gemini-omni-flash`, `gemini-omni-1.1-flash`, `gemini-omni-pro`, `google-omni`) and **Veo** family (`veo-3.1-generate-preview`, `veo-3.1-fast-generate-preview`, `veo-3.1-lite`, `veo-3.0`, `veo-2.0-generate-001`, `veo-2`) across `MODELS_CATALOG` (`singularity/providers.py`), `resolve_model_provider()` & `_get_simulated_response_payload()` (`singularity/server.py`), `MODEL_CONFIGS` (`singularity/engines/gemini.py`), and `get_all_limits()` with verified video quotas and any-to-any multimodal capabilities.

18. **Strict Real-Live Testing Rule & Elimination of Fake Simulated Responses**:
    - *Mistake*: Testing model endpoints and fixes using `--simulate` instead of authentic live upstream requests. The user explicitly forbids fake simulated responses.
    - *Lesson*: NEVER test with `--simulate`. Always execute real live test queries against the running server/engine using `./singular chat "<prompt>" -m <model>` to verify authentic network calls, cookie authentication, response tokens, and media downloads.

19. **Google Gemini Batchexecute SNlM0e XSRF Token & ALR Image Pipeline**:
    - *Mistake*: Gemini `StreamGenerate` calls failing with HTTP 400 (`[["er",null,null,null,null,400,null,null,null,3,[{"48448350":["xsrf","..."]}]]]`) and image generation failing with guest mode refusal ("It's possible you're signed out or image creation isn't available").
    - *Lesson*: Gemini's `StreamGenerate` endpoint strictly requires the `at` parameter (`SNlM0e` XSRF token) and modern `bl` build label. Dynamically extract `SNlM0e` and `bl` from `https://gemini.google.com/app` using active session cookies (`__Secure-1PSID`), auto-heal by extracting the new xsrf token from 400 response bodies if rotation occurs, and resolve generated `https://lh3.googleusercontent.com/gg-dl/...` images through authenticated App Layer Redirection (`=d-I?alr=yes`) hops to download the binary and stream high-definition base64 data URIs.

20. **Google Gemini `__Secure-1PSIDTS` Cookie Requirement & Multi-Account Rotation**:
    - *Mistake*: Omitting `__Secure-1PSIDTS` when copying Gemini cookies from browser DevTools, causing Google to treat the session as unauthenticated guest mode and refuse image generation ("Are you signed in? I can search for images, but can't seem to create any for you right now"). Furthermore, hardcoding `accounts[0]` in ascending order prevented newly pasted accounts from taking effect.
    - *Lesson*: Always sort vault accounts `ORDER BY id DESC` so recently pasted credentials take precedence. Require and validate `__Secure-1PSIDTS` alongside `__Secure-1PSID`, dynamically rotate across all accounts to locate an active authenticated `SNlM0e` session, surface UI/CLI warnings when `__Secure-1PSIDTS` is missing, and pre-emptively guide the user with a 30-second fix if an image model is requested while signed out.

21. **Google Gemini `SAPISIDHASH` Authentication & Full Cookie Bundle Support**:
    - *Mistake*: Assuming `__Secure-1PSID` and `__Secure-1PSIDTS` alone are always sufficient for Google's authenticated image endpoints. Google Web endpoints require the `Authorization: SAPISIDHASH <ts>_<sha1>` header (derived from the `SAPISID` cookie) and validate the complete cookie bundle (`SID`, `__Secure-1PSID`, `__Secure-1PSIDTS`, `SAPISID`, etc.). Prematurely returning an abort notice blocked live execution and auto-healing.
    - *Lesson*: Do not prematurely abort image requests before sending them to Gemini; allow requests to reach the backend so auto-healing and token recovery can execute. Extract `SAPISID`, `__Secure-1PAPISID`, or `__Secure-3PAPISID` from candidate cookies if present, and dynamically compute and attach the `Authorization: SAPISIDHASH <timestamp>_<sha1>` header for `https://gemini.google.com`. Recommend copying the full `Cookie:` header from the browser's Network tab (`F12` -> Network -> any Gemini request -> Request Headers -> Cookie). Only replace Google's signed-out / location refusal message if no generated images were emitted (`not emitted_images`).

22. **Unclosed Modal Parent Container & Global Delegation for Icon Buttons**:
    - *Mistake*: Clicking the top-right gear icon (`#btn-open-settings`) failed to show the Claude Settings Modal. A missing `</div>` on the preceding `#playground-lightbox` container caused `#claude-settings-modal` to be parsed as a child of `.lightbox-modal`, inheriting its closed state (`opacity: 0; pointer-events: none;`). Additionally, `initUserProfile` was not hoisted, and clicks on the inner SVG/path tags weren't delegating cleanly.
    - *Lesson*: Run strict tag balancing verification on HTML documents containing modal backdrops. Ensure all fixed modals are direct top-level siblings. Declare hoisted wrapper functions (`function initUserProfile() { return initClaudeSettings(); }`), invoke `initClaudeSettings()` directly in `DOMContentLoaded`, and attach global event delegation with `e.target.closest('#btn-open-settings, .claude-settings-gear-btn')` so clicks on child SVG icons and paths open modals reliably.

23. **Custom Model Selector Lifecycle Re-rendering & Segmented Theme Capsule Geometry**:
    - *Mistake*: The chat playground model switcher popover displayed an empty box below the search input because `renderCustomSelectOptions()` was only called once at startup without a re-render trigger on click, leaving it blank if `/api/models` completed asynchronously. Additionally, the popover stuck right to the button with an awkward offset, and the theme segmented control in Settings lacked explicit width, collapsing the indicator into a squished vertical oval.
    - *Lesson*: Always re-render custom dropdown contents (`renderCustomSelectOptions()`) upon opening the trigger, provide fallback loading states if catalogs are in flight, add checkmark indicators and provider chips for active models, offset popovers with clean 12px breathing room (`bottom: calc(100% + 12px)`), and enforce fixed minimum geometry (`width: 132px; height: 38px;`) on segmented controls so capsule indicators glide horizontally with correct aspect ratio.

24. **Gateway Security Invariants (Full Audit, 2026-09-26)**:
    - *Mistake*: Every `/api/*` route (including `/api/cookies/export`) was unauthenticated with `CORS *`, the gateway bound `0.0.0.0`, the ngrok tunnel had no auth, the artifact iframe had no sandbox (and `allow-same-origin` was mandated), Gemini sent Google cookies to any `.mp4` URL in model output, and tokens/session keys sat in plaintext (including in the `identifier` column). Any website, LAN peer, or prompt-injected artifact could steal every stored session.
    - *Lesson*: Keep `singularity/security.py` as the single access policy (loopback-trusted, gateway key or session cookie otherwise, foreign `Origin`/`Sec-Fetch-Site: cross-site` refused) and never add `CORSMiddleware(allow_origins=["*"])` back. Default binds are `127.0.0.1`; LAN is opt-in via `--lan`. Store secrets only through `db.save_account()` / `db.set_setting()` (which encrypt via `singularity/vault.py`); never write a secret-derived value into `identifier`. Artifacts render only inside the opaque-origin sandbox, never via `innerHTML` in the dashboard. Engines must allowlist hosts before attaching provider cookies to any URL taken from a response. `POST /api/config` only accepts keys in `API_WRITABLE_SETTINGS`.

25. **Expired ChatGPT Session Tokens (Sentinel 401) & Silent Full-Pool Failure**:
    - *Mistake*: All ChatGPT accounts in the vault had expired session tokens, causing every parallel image generation request to fail with `Sentinel handshake error: Sentinel prepare failed with HTTP 401: "Provided authentication token is expired. Please try signing in again."`. Because the engine tries all accounts in sequence and all fail, the entire pool silently fails and surfaces a generic 502.
    - *Lesson*: ChatGPT session tokens expire regularly. When a user reports all ChatGPT image/chat generation failing with 401, the fix is **user-side** — they must re-login to `chatgpt.com`, export fresh cookies/tokens via the Singularity Cookie Stacker, and re-paste into the vault. Do NOT attempt code fixes for authentication expiry. Diagnose token expiry immediately with `./singular accounts chatgpt` + `./singular limits` and tell the user which accounts need refreshing.

26. **Hardcoded Account Pool Count in Tavern UI Going Stale**:
    - *Mistake*: `GenerateExpressionSetDialog.tsx` had `(7 accounts pool)` hardcoded in the Parallel Processing label and `[1, 2, 3, 4, 7]` hardcoded in the concurrency button array. When the actual vault account count changed (e.g. only 6 accounts), the UI showed an incorrect number and allowed selecting more parallel streams than available accounts.
    - *Lesson*: Any UI label or button set that reflects the live account vault count **must** fetch the real count dynamically from `/api/services` (the `chatgpt.accounts` field). Use a `useEffect` on mount to hit `/api/services`, parse `data.services.find(s => s.id === 'chatgpt').accounts`, and store in a `useState`. Render the count only after it loads (hide until resolved). Cap the concurrency selector buttons to `maxConcurrency = gptAccountCount ?? fallback` so users can never attempt more parallel streams than they have accounts.

27. **Frontend JavaScript AST & Syntax Validation Before Shipping**:
    - *Mistake*: An unclosed parenthesis/bracket block inside an event handler in `singularity/static/app.js` caused a top-level `SyntaxError` at browser parse time, completely halting script execution and preventing event listeners (like the Settings gear icon modal trigger `#btn-open-settings`) from binding.
    - *Lesson*: Always run `node --check singularity/static/app.js` (or equivalent AST check) immediately after modifying frontend script files before concluding work. Verify that all initializers execute cleanly without unhandled syntax or runtime errors.

28. **Followed Creators Database Architecture, Native Janitor Profile Hierarchy & Cloud Vault Hygiene**:
    - *Mistake*: The "Followed Creators" page rendered raw UUIDs (e.g. `@22d035a7-fbd9-409a-b035-fe66a6b11c3f`), zero followers, and placeholder avatars; clicking creators loaded blank demo pages with 0 followers and 0 characters. This occurred because `singularity/connect.py` had no dedicated SQLite creator cache and only queried `cards-backend.domcord.org`, which frequently times out (>10s) or 404s on user profiles. On timeout, the frontend fell back to creating dummy placeholder records (`{id: rawId, username: rawId, displayName: rawId, followers: 0}`), which then synchronized up to Supabase, permanently corrupting the cloud vault with dummy placeholder profiles.
    - *Lesson*:
      1. **Dedicated SQLite Table**: Store creator profiles permanently in `connect_creators` (`id`, `username`, `name`, `avatar`, `bio`, `followers`, `total_bots`, `badges`, `style`, `updated_at`). Auto-seed/backfill from author metadata already present in `connect_cards`.
      2. **4-Tier Fast Fetch Hierarchy**: Upgraded `fetch_creator_profile(creator_id)` in `singularity/connect.py`: Tier 1 = Local SQLite (0ms), Tier 2 = Fast native Janitor endpoint `https://janitorai.com/mb/profiles/{creator_id}` (~300ms) with authentic `followers_count`, `user_name`, `avatar`, `badges`, and `about_me`, Tier 3 = Domcord backend (`cards-backend.domcord.org`, 6s timeout) for authored bots list, Tier 4 = Local authored cards in `connect_cards`.
      3. **Single Batch Endpoint**: Added `GET /api/connect/creators/batch?ids=...` to resolve all followed creators in a single HTTP request instead of issuing N parallel network requests.
      4. **Cloud Sync Cleansing**: In `server.py` and `supabase-sync.js`, reject and purge corrupted placeholder objects where `username == id` and `avatar` is blank, ensuring the Supabase vault retains only authentic creator identities.

29. **Zero-Flicker Stale-While-Revalidate (SWR) Rendering & Elimination of Periodic Screen Refresh**:
    - *Mistake*: The creators page and cards repeatedly flashed and wiped the DOM every 5 seconds, resetting scroll position and disrupting reading. This was caused by `supabase-sync.js` calling `applyCloudState()` on focus, visibility change, and interval syncs, which unconditionally called `renderCreatorsView(container)` whenever `currentView === 'creators'`, and `renderCreatorsView()` was wiping `container.innerHTML = ...` with skeleton placeholders on every execution.
    - *Lesson*:
      1. **Dirty-Checking in Cloud Sync**: Only trigger view re-renders if the incoming cloud data actually mutated (`hasFollowingChanged`, `hasCreatorProfilesChanged`, `hasLibraryChanged`).
      2. **Instant 0ms SWR Rendering**: `renderCreatorsView` and `renderCreatorDetailView` must check `creatorCache` and `botCache` on first paint and render known cards immediately at 0ms latency without displaying empty skeleton placeholders.
      3. **In-Place DOM Mutation**: When background batch fetches return fresh data, update `#creators-page-grid` in-place, and only mutate the DOM if `grid.innerHTML !== newHTML` to completely eliminate UI flicker.

30. **Creator Avatar CDN Namespace Isolation & Multi-Tier Client Auto-Heal**:
    - *Mistake*: Followed creator avatars (such as ZeroNine1 `1a91edf6-3464-41ca-b6e6-5073b406e971` with avatar hash `crH9B1J57oSzCwUhnvsV_.webp`) failed with 404 and rendered fallback placeholder icons. `singularity/connect.py` had mapped all bare hash filenames to `https://ella.janitorai.com/bot-avatars/{hash}`. However, Janitor's CDN strictly separates user/creator avatars (`/avatars/`, `/user-avatars/`, or `/profile-avatar-approved/`) from bot avatars (`/bot-avatars/` or `/media-approved/`). Requesting a creator's avatar under `/bot-avatars/` returns HTTP 404. Furthermore, the frontend `onerror` fallback only handled strings containing `/user-avatars/` or `/avatars/`, immediately jumping to `DEFAULT_AVATAR` when seeing `/bot-avatars/`.
    - *Lesson*:
      1. **Dedicated Creator Avatar Resolver**: Implement `resolve_creator_avatar_url(raw_url)` in `singularity/connect.py`: bare filenames resolve directly to `https://ella.janitorai.com/avatars/{hash}`, legacy `/bot-avatars/` paths are dynamically rewritten to `/avatars/`, and `data:image/` URIs are preserved untouched.
      2. **Database Auto-Migration**: On startup, run SQL migrations on `connect_creators` and `connect_cards` replacing `'/bot-avatars/'` with `'/avatars/'` across all existing creator rows.
      3. **Multi-Tier Client Auto-Heal**: In `singularity/static/connect-panel.js`, implement `SConnect.handleAvatarError(img)` which sequentially tests candidate CDN paths (`/bot-avatars/` -> `/avatars/` -> `/user-avatars/` -> `/profile-avatar-approved/`) before falling back to `DEFAULT_AVATAR`.

31. **Non-Blocking Tiered Backend Fetching & Latency Bottleneck Elimination**:
    - *Mistake*: The Followed Creators view took 9+ seconds on initial load despite native Janitor returning authentic profile data in ~300ms. Investigation revealed `fetch_creator_profile()` was synchronously awaiting Tier 3 (`cards-backend.domcord.org`) for 8.9s on every call even when native Janitor had already succeeded with full follower count, bio, name, and avatar.
    - *Lesson*:
      1. **Conditional Tier 3 Invocation**: Only query Tier 3 (Domcord) if essential profile data is missing or if no authored bots exist, skipping it entirely when native Janitor succeeds.
      2. **Strict Timeout Capping**: Cap external mirror timeouts at 1.5s so lagging community backends never block user navigation or batch profile resolution.
      3. **Cache-First 0ms Access**: Always query local SQLite `connect_creators` first so repeated visits load in 0ms without network overhead.

32. **Asymmetric Cloud Sync Downgrades, Synthetic Dummy Profile Fabrication & CSS Bio Leaks**:
    - *Mistake*: Followed creator cards (`ZeroNine1`, `fishywashy`) repeatedly flickered their bios and follower counts vanished into `• Creator` before reappearing, while `InsomniacZer0` remained completely stable. This occurred because `supabase-sync.js` and `server.py` had a legacy loop iterating over `savedBotsData` that fabricated synthetic dummy creator profiles with `bio: "Creator of ${bot.name}"` and `followers: 0` for any creator who authored a saved bot card in the user's library (`Still Yours, My Love.. | Nessa` by ZeroNine1, `Chudette's First Job | Jess` by fishywashy). InsomniacZer0 had no saved bots in the library, so no dummy profile was ever generated for him. These 0-follower profiles synchronized to Supabase, and on every sync interval or tab focus, `applyCloudState()` clobbered the authentic cached profiles because `existing.followers !== cp.followers` without checking for quality/fidelity downgrades. Additionally, `stripHTML()` stripped `<style>` tags but left the enclosed raw CSS rules (`body::after...`) leaking into the bio preview text.
    - *Lesson*:
      1. **Strict Prohibition on Synthetic Profile Fabrication**: Never manufacture dummy creator profiles with 0 followers or synthetic `"Creator of <bot>"` bios into cloud sync payloads or persistent storage. Cloud sync must strictly synchronize authentic creator identities from `connect_creators` / `creatorCache`.
      2. **Non-Destructive In-Memory Quality Guards (`cacheCreator` & `applyCloudState`)**: A low-fidelity or partial record must NEVER downgrade an authentic cached record. If an incoming record has `followers === 0` (or missing/synthetic bio) while the cached record has authentic `followers > 0` (or real bio), preserve the authentic cached fields.
      3. **SQL `ON CONFLICT` Quality Shield in `singularity/db.py`**: In `save_creator_profile`, ensure `followers` and `bio` updates protect authentic existing data from being overwritten by synthetic prefixes (`Creator of %` / `JanitorAI author of %`) or 0-follower records. Never call `save_creator_profile` from read-only fallback queries.
      4. **Embedded Style & Script Stripping in `stripHTML()`**: Janitor creators frequently use custom CSS and HTML in profile bios. Always strip `<style[^>]*>[\s\S]*?<\/style>` and `<script[^>]*>[\s\S]*?<\/script>` before tag stripping to prevent raw CSS code from leaking into card bio previews.
33. **Home Recent Chats Desktop Column Layout & Top-3 Ceiling Invariant**:
    - *Mistake*: The Discover/Home "Recent Chats" section displayed 4 cards (`.slice(0, 4)`). On desktop viewports where `.janitor-recent-chats-scroll` uses a 3-column auto-fill responsive grid (`minmax(360px, 1fr)`), 3 cards filled the top row, leaving the 4th card awkwardly dangling alone on the second row.
    - *Lesson*: When presenting preview session carousels on the main dashboard, enforce a strict top-3 ceiling (`.slice(0, 3)`) to maintain a clean, single-row layout that aligns with the 3-column responsive grid. Users who wish to browse additional historical sessions can click "View All" to access the full `/my-chats` view.

34. **Sticky Navigation Header Clipping & `scrollIntoView` Target Anchor Invariant**:
    - *Mistake*: When navigating between tabs/sections in S-Connect (Discover, Following Feed, Personas), the view consistently loaded scrolled down ~64px, clipping the top navigation bar, search inputs, page titles, and hero filters under the sticky navbar. This occurred because `resetScrollToTop()` had a fallback `document.getElementById('connect-main-view').scrollIntoView({ behavior: 'instant', block: 'start' })`. `#connect-main-view` sits beneath the 64px sticky header `<header class="cards-top-nav-bar">`. Aligning `#connect-main-view` to `block: 'start'` forced `.panel-viewport` to scroll down by 64px, pushing the top content behind the sticky navbar.
    - *Lesson*:
      1. **Never Scroll Inner Content Under Sticky Navbars**: Never call `scrollIntoView` on inner content containers (`#connect-main-view`, `.bot-detail-page`, `.back-nav-btn`) that sit below a sticky header.
      2. **Target Absolute Top Anchors ($Y=0$)**: If invoking `scrollIntoView`, target strictly `#cards-top-nav-bar` or `#pane-connect` (the true top element at $Y=0$).
      3. **Synchronous & RAF Scroll Reset**: Reset `scrollTop = 0` across all scroll ancestors (`.panel-viewport`, `#pane-connect`, `document.documentElement`, `window`) both synchronously and inside `requestAnimationFrame` to guarantee zero visual clipping or layout displacement.

35. **Recent Chats Netflix Video Thumbnail & "Continue Watching" Pattern**:
    - *Design*: Upgraded Home Recent Chats from bulky, boxy text-heavy blocks to widescreen 16:9 Netflix video thumbnails.
    - *Rule*:
      1. **16:9 Aspect Ratio & Full-Cover Artwork**: Cards use `aspect-ratio: 16 / 9; overflow: hidden;` with the character avatar filling the entire card (`object-fit: cover; object-position: center 25%`) and cinematic zoom on hover (`scale(1.06)`).
      2. **Frosted Glass Center Play Button**: Absolute-centered circular glassmorphic play button (`backdrop-filter: blur(8px)`, white play triangle) that scales on hover with Netflix red accent (`#E50914`).
      3. **Cinematic Bottom Vignette & Metadata**: Gradient overlay (`linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.92) 100%)`) holding single-line lock icon + bot title and relative timestamp + message count.
      4. **Netflix "Continue Watching" Red Progress Bar**: Persistent 3.5px red bar (`#E50914`) across the bottom edge with randomized/varied watch progress (20% to 92%) deterministically hashed per chat session.
      5. **Responsive Row Dynamics**: Responsive grid uses `data-count` (1 to 4) mapping seamlessly to up to 4 columns on desktop, 2 columns on tablet, and horizontal swipe on mobile.
      6. **Clean Home Discover Hierarchy**: Category filter chips bar removed in favor of clean omni-search leading straight into Recent Chats and "Trending this week".

36. **Following Feed Native Janitor Batch Architecture & Concurrency Scalability**:
    - *Mistake*: The Following Feed (`renderFollowingView` in `connect-panel.js`) was erratic, slow, and dropped creators: sometimes showing only 1 creator, sometimes 0 (blank screen), sometimes 2/5 or 4/5 of followed creators, taking 7+ seconds of blank skeleton cards. Furthermore, `.slice(0, 24)` hardcoded cap permanently discarded any followed creator beyond 24, breaking when users follow 70 or 100+ creators. This happened because the frontend issued $N$ parallel HTTP requests (`Promise.all(followingList.slice(0, 24).map(...))`) to `/api/connect/creators/{id}/bots`, which hit the slow, rate-limited Domcord community mirror (`cards-backend.domcord.org`) with a 7.0-second timeout. When multiple concurrent requests hit Domcord, they timed out, fell back to an empty SQLite table, and returned 0 bots.
    - *Lesson*:
      1. **Native Janitor Character Batching**: Janitor AI's native `/mb/characters` endpoint supports querying characters by creator using `mode=all&page={page}&sort=latest&user_id[]={id1}&user_id[]={id2}...` with validation cap `@ArrayMaxSize(64)`. Querying up to 50 creators in a single request completes in ~500–800ms.
      2. **Chunked Concurrency for 70 to 100+ Creators**: In `fetch_following_feed()` (`singularity/connect.py`), partition followed creator UUIDs into chunks of 50 (`CHUNK_SIZE = 50`) and fetch all chunks in parallel with `asyncio.gather()`. 100 creators require only 2 parallel requests instead of 100 browser requests, completing in <1 second.
      3. **Fair Round-Robin Interleaving**: Group returned characters by creator and round-robin interleave across all followed creators before slicing to limit. This guarantees high-volume authors do not crowd out creators with fewer releases, ensuring every followed creator is fairly represented in the feed.
      4. **Multi-Tier Fallback & Database Indexing**: Auto-persist all fetched bots to `connect_cards`. Index `connect_cards(creator_id)` and `connect_cards(updated_at DESC)`. If offline or on network failure, fall back instantly to `get_connect_cards_by_creators(clean_ids)`.
      5. **Single Batch Gateway Route & 0ms SWR Rendering**: Replace $N$ frontend fetch calls with a single `GET /api/connect/following/feed?limit=48&ids=...`. Render cached following bots immediately on first paint (0ms latency), and silently refresh in-place when the batch response arrives.
37. **Creator Multi-Page Catalog Scraping & Complete Character Pagination Architecture**:
    - *Mistake*: Creators on Janitor AI with >34 bots (e.g. 60, 112, 121+ cards) were truncated to page 1 or an arbitrary SQLite `LIMIT 60`. `fetch_creator_profile` only queried `/mb/profiles/{id}` (which contains 0 characters) and fell back to SQLite `LIMIT 60` or Domcord (which timed out). Meanwhile, `fetch_creator_bots` returned `len(norm_bots)` instead of the authentic `total` count and never scraped pages $2..N$. As a result, creator profiles showed at most 34 bots, hiding the rest of their creations from users.
    - *Lesson*:
      1. **Strict 34 Bots/Page Pagination**: Janitor AI strictly limits character responses to 34 items per page (`size: 34`). Overriding `size` or `limit` parameters is ignored by Janitor's backend.
      2. **Deterministic Total Discovery**: Page 1 (`https://janitorai.com/mb/characters?mode=all&page=1&sort=latest&user_id[]={id}`) returns `{ "total": 121, "size": 34, ... }`. Total pages is computed as `math.ceil(total / 34)`.
      3. **High-Speed Parallel Multi-Page Scraping (`scrape_all_creator_characters`)**: If `total > 34`, fire requests for pages $2..N$ concurrently using `asyncio.gather()`. Scraping 120+ cards across 4 pages takes only ~1.1 seconds.
      4. **Vault Persistence & Cache Invariant**: Upsert all scraped cards into SQLite `connect_cards` preserving unmasked stats. Persist `all_pages_scraped: True` in `connect_creators.raw_payload_json` so subsequent loads serve the entire catalog instantly at 0ms.
      5. **Removal of Hardcoded Caps**: Never hardcode `LIMIT 60` in creator queries; load all authored cards for complete representation.
      6. **UI Dynamic Count Reflection**: In `drawCreatorDetailPage`, display the exact count `${bots.length < totalCards ? `${bots.length} of ${totalCards}` : bots.length} publicly available cards` and render the full responsive grid.

38. **Xiaomi MiMo Cookie Quotes Sanitization, Key Aliasing & ModelConfig Contract**:
    - *Mistake*: When copying cookies from browser DevTools, values often contain surrounding quotes (e.g. `xiaomichatbot_serviceToken="lBp+..."` or `xiaomichatbot_ph="ol0U..."`). Passing literal quotes in cookie headers caused Xiaomi's `/open-apis/bot/chat` backend to reject requests with `HTTP 401: {"code":401,"loginUrl":"..."}`. Additionally, the cookie in DevTools can be named `xiaomichatbot_serviceToken` or `serviceToken`, and assuming the model parameter was `modelCode` resulted in `event:error data:{"type":"text","content":"模型名称错误"}`.
    - *Lesson*:
      1. **Strict Quote Stripping**: Always sanitize and strip surrounding quotes (`.strip('"\'')`) from cookie/token values in both `singularity/db.py` (`parse_credential`) and `singularity/engines/mimo.py` (`_parse_mimo_credentials`).
      2. **Token Key Aliasing**: Support both `serviceToken` and `xiaomichatbot_serviceToken` using regex `(?:xiaomichatbot_)?serviceToken=`, and send both keys in request cookies for seamless authentication.
      3. **ModelConfig Contract**: In Xiaomi AI Studio `/open-apis/bot/chat`, the model parameter inside `modelConfig` must strictly be `"model": <model_id>` (e.g. `"model": "mimo-v2.6-pro"`), NOT `"modelCode"`.
      4. **CLI Subcommand Registration in Launchers**: Whenever adding a subcommand to `singularity/cli.py` (like `autofetch`), always register it in the case statement of `start.sh` and `start.bat` to avoid triggering accidental server launch fallback.
39. **Clean Terminal Experience, Mobile Termux Responsive Layout & Access Log Muting**:
    - *Mistake*: Uvicorn defaulted to `access_log=True`, causing a continuous stream of `INFO: 127.0.0.1:xxx - "GET /api/... HTTP/1.1" 200 OK` from background polls (`/api/tunnel/status`, `/api/services`, cloud sync) to flood stdout, pushing server status off the screen. Additionally, fixed 66-character box borders (`"=" * 66`) shattered and wrapped into broken lines on narrow Termux mobile screens, and lingering processes holding port 9000 caused port conflicts.
    - *Lesson*:
      1. **Mute Uvicorn HTTP Access Logs**: Set `access_log=False` and `log_level="warning"` by default, disabling the `uvicorn.access` logger so background health checks and sync polls remain completely silent. Provide a `SINGULARITY_DEBUG=1` escape hatch for troubleshooting.
      2. **Frame-Free Responsive Terminal UI**: Never draw rigid fixed-width boxes (`"=" * 66` or `╭────╮`) that wrap and shatter on narrow 35–45 column Termux screens. Use clean left-aligned indentation (`  `), soft indicators (`● online`, `➜ Local:`, `• Vault:`), and short lines that wrap naturally on any display.
      3. **Multi-Tier Port Auto-Kill**: Before launching the server, inspect and reclaim port `9000`, `5173`, `3001`, and `3000` via `ss -lptn`, `fuser`, `lsof`, and process table matching to prevent `Address already in use` crashes.



