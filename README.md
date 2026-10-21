# <img src="singularity/static/logo.svg" width="36" height="36" alt="Singularity Logo" style="vertical-align: middle; margin-right: 8px;" /> Singularity

> **One localhost endpoint. Nine AI providers. 238+ models. $0 spent on API keys.**
> *(Because paying $20/mo to 5 different AI companies is a scam.)*

Singularity turns your regular free (and paid) web accounts into a single, high-speed OpenAI-compatible API endpoint at `http://localhost:9000/v1`. 

Stack your **Google Antigravity, Gemini Web, Claude, Kimi, GLM, DeepSeek, Qwen, Google AI Studio, and Xiaomi MiMo** accounts together, get live quota tracking, and play with interactive code artifacts in a sleek Claude-style interface.

---

## ⚡ TL;DR — For People Who Won't Read The Rest of This

If you have attention span issues, just do this:

### 🪟 Windows Users (Don't panic)
1. Install **[Python 3.10+](https://www.python.org/downloads/)** *(⚠️ CHECK THE BOX THAT SAYS "Add python.exe to PATH" OR NOTHING WILL WORK)*.
2. Download this repo, open the folder, and double-click **`start.bat`**.
3. Open `http://localhost:9000` in your browser. Done.

### 🐧 Linux / 🍎 Mac Users
```bash
git clone https://github.com/Nephis-opus/Singularity.git && cd Singularity && ./start.sh
```

### 📱 Android / Termux Chads
```bash
pkg update -y && pkg install -y python git && git clone https://github.com/Nephis-opus/Singularity.git && cd Singularity && ./start.sh
```

*(Once it's running, open `http://localhost:9000` in your browser)*

---

## 🚀 What Can You Actually Do With This?

| What you want to do | How to do it |
|---|---|
| **Chat with Gemini 4 Argon / Claude 3.7 / Claude Opus 5.5** | Open the **Playground** tab at `http://localhost:9000` |
| **Browse & Roleplay with Janitor AI Characters** | Open the **S-Connect** tab — instant search, SillyTavern card matrix & Tempest Studio |
| **Use it inside Cursor / VS Code / Cline** | Set Base URL to `http://localhost:9000/v1` (Native function calling & tools auto-bridged) |
| **Use it in Claude Code CLI & Desktop** | Run `./singular claudecode start` and point Claude Code to `http://localhost:6045` |
| **Use it in SillyTavern** | Set API to `OpenAI`, URL to `http://localhost:9000/v1/chat/completions` |
| **Run live React / HTML code previews** | Ask the AI to write an app in Playground — it renders live interactive **Artifacts** |
| **Extract browser cookies with 1 click** | Run `./singular autofetch gemini` or `./singular autofetch mimo` — zero manual DevTools copying |
| **Expose gateway to your phone via HTTPS** | Run `./singular tunnel start` — gives you an instant secure public ngrok HTTPS URL |
| **Check how many free messages you have left** | Check the **Limits & Quotas** tab |
| **Host it on your phone & use it from your PC** | Run `./start.sh --lan` and browse to `http://<PHONE_IP>:9000` |

---

## 🍪 Step 1: Feeding It Accounts (Takes 30 Seconds)

Out of the box, some providers (like GLM) have guest mode, but for the good stuff (Gemini, Claude, Antigravity, DeepSeek, MiMo), you can stack accounts in seconds:

1. **Option A (Instant 1-Click Auto-Fetch)**:
   ```bash
   ./singular autofetch gemini     # Discovers Gemini cookies directly from local browsers
   ./singular autofetch mimo       # Discovers Xiaomi MiMo tokens
   ./singular login                # Authenticate Google OAuth for Antigravity with 1 click
   ```
2. **Option B (Dashboard Stacker)**:
   - Open the dashboard at **`http://localhost:9000`** and click the **Cookie Stacker** tab.
   - Pick a provider (e.g. **Gemini**, **Claude**, **DeepSeek**, or **MiMo**).
   - Follow the 2-click guide shown right on screen (press `F12` in your browser, copy token/cookie, paste it).
   - Hit **Save**.

> 💡 **Pro-tip:** You can stack **multiple accounts** for the same provider. Singularity will automatically round-robin between them so you never hit rate limits.

---

## 🤖 The Model Lineup (238+ Models Across 9 Giants)

Singularity runs 9 independent backend workers:

| Provider | Port | Models | What's Inside? |
|---|---|---|---|
| **Google Antigravity** | 8090 | 22 | Gemini 4 Argon (High/Med/Low), Claude Opus 5.5, Claude Sonnet 5.5, Gemini 3.8 Flash, Local Language Server RPC & CloudCode |
| **Google Gemini Web** | 8084 | 19 | Gemini 4 Argon (Mode 8 / Argon4p0), Gemini 3.1 Pro, Gemini 3.8 Flash, Imagen 3, Veo 3.1 video, native thinking |
| **Google AI Studio** | 8091 | 25 | Gemini 2.5 Pro, Gemini 3.8 Flash, Flash-Lite, studio TTS audio speech generation |
| **Xiaomi MiMo** | 8092 | 6 | MiMo-V2.6-Pro (Reasoning, 1M context), MiMo-V2.6-Flash, MiMo-V2.5, native TTS speech synthesis & ASR voice transcription |
| **Claude** | 8080 | 22 | Claude 3.7 Sonnet (with Thinking/CoT), Claude 4 Opus/Sonnet, Fable |
| **Kimi** | 8086 | 31 | Kimi K3 Flagship, Thinking/Search, 200k huge context window |
| **GLM** | 8085 | 86 | GLM 5.3, GLM Thinking, CogView 4 image gen, GLM Turbo |
| **DeepSeek** | 8088 | 12 | DeepSeek V3, R1 Reasoner, DeepSeek V4, V4-Pro, V4.1-Flash |
| **Qwen** | 8089 | 15 | Qwen 2.5 (72B), Qwen Max, Qwen Coder (128k context) |

---

## 🔌 Connecting to Your Favorite Apps

Singularity acts like a local OpenAI API server. You can hook it up to literally anything that accepts OpenAI endpoints.

- **Base URL:** `http://localhost:9000/v1`
- **API Key:** `sk-singularity-local` *(or whatever you want on localhost)*

### 1. SillyTavern
- **API:** `Chat Completion (OpenAI)`
- **Server URL:** `http://localhost:9000/v1/chat/completions`
- **API Key:** `sk-singularity-local`
- **Model:** Type any model name (e.g. `gemini-4-argon`, `agy-claude-opus-5-5-high`, `claude-3-7-sonnet`, `deepseek-v4`)

### 2. Cursor / VS Code / Continue / Cline
- **Provider:** `OpenAI Compatible`
- **Base URL:** `http://localhost:9000/v1`
- **Model ID:** `gemini-4-argon` or `claude-3-7-sonnet` or `deepseek-v4`
- **Function Calling**: Fully supported! Singularity's `openai_tools_bridge` translates OpenAI tools into model-native instructions automatically.

### 3. Claude Code CLI & Desktop
- Run `./singular claudecode start`
- Point your environment to `http://127.0.0.1:6045`
- Seamlessly run Claude Code CLI coding tasks powered by your stacked Singularity models.

### 4. Python Code
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:9000/v1",
    api_key="sk-singularity-local"
)

response = client.chat.completions.create(
    model="gemini-4-argon",
    messages=[{"role": "user", "content": "Explain quantum physics like I am five"}],
    stream=True
)

for chunk in response:
    print(chunk.choices[0].delta.content or "", end="", flush=True)
```

### 5. cURL
```bash
curl http://localhost:9000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-singularity-local" \
  -d '{
    "model": "gemini-4-argon",
    "messages": [{"role": "user", "content": "Yo!"}],
    "stream": true
  }'
```

---

## 💻 CLI Cheatsheet (Flexing in Terminal)

If you prefer using the terminal like a hacker:

```bash
# Check if all 9 providers are alive and inspect account counts
./singular status

# Query real-time limits, remaining quotas & image gen credits
./singular limits

# Test a model directly with streaming text in your terminal
./singular chat "Why is the sky blue?" -m gemini-4-argon
./singular chat "Explain general relativity" -m agy-claude-opus-5-5-high
./singular chat "Write a python snake game" -m claude-3-7-sonnet

# 1-Click cookie & token auto-fetch from local browsers (Chrome, Brave, Edge, Firefox)
./singular autofetch gemini
./singular autofetch mimo

# Manage Google OAuth login for Antigravity with 1 click
./singular login

# Expose gateway securely to the internet for phone / remote access
./singular tunnel start                 # Spawns ngrok public HTTPS tunnel
./singular tunnel                       # Shows active public URL
./singular tunnel stop

# Manage Claude Code bridge (:6045)
./singular claudecode start
./singular claudecode status

# Show, set, or rotate your gateway security key
./singular key

# List or export your accounts
./singular accounts
./singular export my_backup.json

# Restart gateway cleanly (clears and reclaims port 9000)
./singular restart
```

*(Windows users: replace `./singular` with `start.bat`, e.g. `start.bat status`)*

---

## 🔒 Security & Privacy (The Non-Boring Version)

- **Everything runs on your machine.** Your cookies and accounts never leave your PC/phone.
- **Encrypted at rest.** Your credentials vault is encrypted using OS-native keychains (Windows DPAPI, macOS Keychain, Linux Secret Service) via standard library pure Python (`singularity/vault.py`).
- **Default is Localhost only (`127.0.0.1`).** Random people on your WiFi cannot access your gateway unless you explicitly launch with `--lan` (`./start.sh --lan`).
- **Sandboxed Artifacts.** When the AI generates React or HTML widgets, they run inside an isolated sandbox (`about:srcdoc` without `allow-same-origin`) so they can never touch your session cookies or local storage.

---

## ❓ FAQ & Troubleshooting (Read Before Asking For Help!)

#### 1. "It crashed on Windows when I opened `start.bat`!"
Did you check **"Add python.exe to PATH"** when installing Python? If you forgot, uninstall Python and reinstall it, and make sure that checkbox at the bottom of the installer is checked!

#### 2. "Gemini says 'Are you signed in? I can search for images but cant create...'!"
Google requires both `__Secure-1PSID` and `__Secure-1PSIDTS` cookies. The easiest fix: run `./singular autofetch gemini` in your terminal to grab both automatically from your browser, or open `gemini.google.com`, press `F12` -> **Network** tab -> refresh -> click any request -> copy the entire `Cookie:` header and paste that into Singularity's Gemini cookie stacker.

#### 3. "Can I access this on my phone while Singularity runs on my PC?"
Yes! You have two ways:
- **Local WiFi**: Launch with `./start.sh --lan` (Windows: `start.bat --lan`), find your PC's local IP (e.g. `192.168.1.50`), and open `http://192.168.1.50:9000` on your phone browser.
- **Anywhere via Tunnel**: Run `./singular tunnel start`, copy the public HTTPS URL, and access it from any cellular or remote network with your gateway key.

#### 4. "Can I run Singularity on my phone (Android Termux) and connect from my laptop?"
Yes! Just run `./start.sh --lan` in Termux, check your phone's IP, and open `http://<PHONE_IP>:9000` on your laptop browser. Installation takes 3–5 seconds flat with zero Rust compilation.

#### 5. "Do I need to pay for anything?"
No. It works with standard free accounts across all 9 providers.

---

## 📁 Repository Layout

```
Singularity/
├── singularity/                         # Pure-Python backend & web UI
│   ├── engines/                         # Strict 1-file provider drivers
│   │   ├── antigravity.py               # Google Antigravity (Local RPC / CloudCode) (:8090)
│   │   ├── gemini.py                    # Google Gemini Web Batchexecute (:8084)
│   │   ├── aistudio.py                  # Google AI Studio & TTS speech (:8091)
│   │   ├── mimo.py                      # Xiaomi MiMo Studio & Voice (:8092)
│   │   ├── claude.py                    # Anthropic Claude Web2API (:8080)
│   │   ├── kimi.py                      # Moonshot Kimi Web2API (:8086)
│   │   ├── glm.py                       # Zhipu AI GLM & CogView (:8085)
│   │   ├── deepseek.py                  # DeepSeek AI & WASM PoW (:8088)
│   │   └── qwen.py                      # Alibaba Qwen Web2API (:8089)
│   ├── static/                          # Pure ES6 Control Center, Playground & S-Connect
│   ├── connect.py                       # S-Connect Janitor AI Hub & prompt interceptor
│   ├── claudecode_bridge.py             # Claude Code CLI & Desktop protocol bridge (:6045)
│   ├── openai_tools_bridge.py           # Universal function calling / tool bridge
│   ├── artifacts.py                     # Live React / HTML code sandbox & GenUI interceptor
│   ├── db.py                            # SQLite WAL encrypted credential vault
│   ├── vault.py                         # Pure Python stdlib encryption at rest
│   ├── tunnel.py                        # Ngrok cloud tunnel manager (32/64-bit auto-healing)
│   ├── providers.py                     # Master 238-model catalog & live limit aggregators
│   └── server.py                        # Starlette / ASGI Universal Gateway (:9000)
├── start.sh                             # Linux / macOS / Termux 1-click launcher & CLI
├── start.bat                            # Windows 1-click launcher & CLI
├── singular -> start.sh                 # Global CLI shortcut
├── c2a -> start.sh                      # Backward-compatible CLI shortcut
└── requirements.txt                     # Lightweight pure-Python dependencies (zero Rust)
```

---

## 📄 License

MIT License. Built by **[Nephis](https://github.com/Nephis-opus)**.

