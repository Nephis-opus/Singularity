# <img src="singularity/static/logo.svg" width="36" height="36" alt="Singularity Logo" style="vertical-align: middle; margin-right: 8px;" /> Singularity

> **One localhost endpoint. Eight AI providers. 226+ models. $0 spent on API keys.**
> *(Because paying $20/mo to 5 different AI companies is a scam.)*

Singularity turns your regular free (and paid) web accounts into a single, high-speed OpenAI-compatible API endpoint at `http://localhost:9000/v1`. 

Stack your **ChatGPT, Claude, Gemini, Grok, Kimi, GLM, DeepSeek, and Qwen** accounts together, get live quota tracking, play with interactive code artifacts in a sleek Claude-style interface, or fire up the bundled **Tavern Studio** for visual novels and roleplay.

---

## ⚡ TL;DR — For People Who Won't Read The Rest of This

If you have attention span issues, just do this:

### 🪟 Windows Users (Don't panic)
1. Install **[Python 3.10+](https://www.python.org/downloads/)** *(⚠️ CHECK THE BOX THAT SAYS "Add python.exe to PATH" OR NOTHING WILL WORK)* and **[Node.js](https://nodejs.org/)**.
2. Download this repo, open the folder, and double-click **`start.bat`**.
3. Open `http://localhost:9000` in your browser. Done.

### 🐧 Linux / 🍎 Mac Users
```bash
git clone https://github.com/Nephis-opus/Singularity.git && cd Singularity && ./start.sh
```

### 📱 Android / Termux Chads
```bash
pkg update -y && pkg install -y python git nodejs-lts && git clone https://github.com/Nephis-opus/Singularity.git && cd Singularity && ./start.sh
```

*(Once it's running, open `http://localhost:9000` in your browser)*

---

## 🚀 What Can You Actually Do With This?

| What you want to do | How to do it |
|---|---|
| **Chat with Claude 3.7 / GPT-5 / DeepSeek V4** | Open the **Playground** tab at `http://localhost:9000` |
| **Play with AI Visual Novels / Roleplay** | Open **Tavern Studio** at `http://localhost:5173` (launches automatically!) |
| **Use it inside Cursor / VS Code / Cline** | Set Base URL to `http://localhost:9000/v1` (Model: anything you want) |
| **Use it in SillyTavern** | Set API to `OpenAI`, URL to `http://localhost:9000/v1/chat/completions` |
| **Run live React / HTML code previews** | Ask the AI to write an app in Playground — it renders live interactive **Artifacts** |
| **Check how many free messages you have left** | Check the **Limits & Quotas** tab |
| **Host it on your phone & use it from your PC** | Run `./start.sh --lan` and browse to `http://<PHONE_IP>:9000` |

---

## 🍪 Step 1: Feeding It Accounts (Takes 30 Seconds)

Out of the box, some providers (like GLM) have guest mode, but for the good stuff (Claude, ChatGPT, Gemini, DeepSeek), you just need to paste your session cookie or token once.

1. Open the dashboard at **`http://localhost:9000`** and click the **Cookie Stacker** tab.
2. Pick a provider (e.g. **ChatGPT** or **Claude**).
3. Follow the 2-click guide shown right there on the screen (press `F12` in your browser, copy token/cookie, paste it).
4. Hit **Save**. 

> 💡 **Pro-tip:** You can stack **multiple accounts** for the same provider. Singularity will automatically round-robin between them so you never hit rate limits.

---

## 🤖 The Model Lineup (226+ Models Across 8 Giants)

Singularity runs 8 independent backend workers:

| Provider | Port | Models | What's Inside? |
|---|---|---|---|
| **ChatGPT** | 8000 | 20 | GPT-5.6-Mini/Sol/Terra, GPT-6-Astra, GPT-Image-2.5, Vision |
| **Claude** | 8080 | 20 | Claude 3.7 Sonnet (with Thinking/CoT), Claude 4 Opus/Sonnet, Fable |
| **Gemini** | 8084 | 21 | Gemini 3.8 Flash, 3.1 Pro, Imagen 3, Google Omni & Veo |
| **DeepSeek** | 8088 | 12 | DeepSeek V3, R1 Reasoner, DeepSeek V4, V4-Pro, V4.1-Flash |
| **Grok** | 8087 | 8 | Grok 3, Grok 3 Mini, Grok Imagine (Real-time X/Twitter data) |
| **Kimi** | 8086 | 31 | Kimi K3 Flagship, Thinking/Search, 200k huge context window |
| **GLM** | 8085 | 86 | GLM 5.3, GLM Thinking, CogView 4 image gen, GLM Turbo |
| **Qwen** | 8089 | 18 | Qwen 2.5 (72B), Qwen Max, Qwen Coder (128k context) |

---

## 🔌 Connecting to Your Favorite Apps

Singularity acts like a local OpenAI API server. You can hook it up to literally anything that accepts OpenAI endpoints.

- **Base URL:** `http://localhost:9000/v1`
- **API Key:** `sk-singularity-local` *(or whatever you want on localhost)*

### 1. SillyTavern
- **API:** `Chat Completion (OpenAI)`
- **Server URL:** `http://localhost:9000/v1/chat/completions`
- **API Key:** `sk-singularity-local`
- **Model:** Type any model name (e.g. `claude-3-7-sonnet`, `deepseek-v4`, `gpt-5-6-mini`)

### 2. Cursor / VS Code / Continue / Cline
- **Provider:** `OpenAI Compatible`
- **Base URL:** `http://localhost:9000/v1`
- **Model ID:** `claude-3-7-sonnet` or `gemini-3.8-flash` or `deepseek-v4`

### 3. Python Code
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:9000/v1",
    api_key="sk-singularity-local"
)

response = client.chat.completions.create(
    model="claude-3-7-sonnet",
    messages=[{"role": "user", "content": "Explain quantum physics like I am five"}],
    stream=True
)

for chunk in response:
    print(chunk.choices[0].delta.content or "", end="", flush=True)
```

### 4. cURL
```bash
curl http://localhost:9000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-singularity-local" \
  -d '{
    "model": "deepseek-v4",
    "messages": [{"role": "user", "content": "Yo!"}],
    "stream": true
  }'
```

---

## 💻 CLI Cheatsheet (Flexing in Terminal)

If you prefer using the terminal like a hacker:

```bash
# Check if all 8 providers are alive and see your account counts
./singular status

# Check your live message limits and image gen credits
./singular limits

# Test a model directly with streaming text in your terminal
./singular chat "Why is the sky blue?" -m claude-3-7-sonnet
./singular chat "Write a python snake game" -m deepseek-v4

# Turn on fake simulation mode (test without internet/accounts)
./singular simulate on
./singular simulate off

# List or export your accounts
./singular accounts
./singular export my_backup.json
```

*(Windows users: replace `./singular` with `start.bat`, e.g. `start.bat status`)*

---

## 🔒 Security & Privacy (The Non-Boring Version)

- **Everything runs on your machine.** Your cookies and accounts never leave your PC/phone.
- **Encrypted at rest.** Your credentials vault is encrypted using OS-native keychains (Windows DPAPI, macOS Keychain, Linux Secret Service).
- **Default is Localhost only (`127.0.0.1`).** Random people on your WiFi cannot access your gateway unless you explicitly launch with `--lan` (`./start.sh --lan`).
- **Sandboxed Artifacts.** When the AI generates React or HTML widgets, they run inside an isolated sandbox so they can't snoop on your browser cookies.

---

## ❓ FAQ & Troubleshooting (Read Before Asking For Help!)

#### 1. "It crashed on Windows when I opened `start.bat`!"
Did you check **"Add python.exe to PATH"** when installing Python? If you forgot, uninstall Python and reinstall it, and make sure that checkbox at the bottom of the installer is checked!

#### 2. "Gemini says 'Are you signed in? I can search for images but cant create...'!"
Google needs both `__Secure-1PSID` and `__Secure-1PSIDTS` cookies. The easiest fix: open `gemini.google.com`, press `F12` -> **Network** tab -> refresh -> click any request -> copy the entire `Cookie:` header from Request Headers and paste that into Singularity's Gemini cookie stacker.

#### 3. "Can I access this on my phone while Singularity runs on my PC?"
Yes! Launch with:
```bash
./start.sh --lan
# (Windows: start.bat --lan)
```
Then find your PC's local IP address (e.g. `192.168.1.50`) and open `http://192.168.1.50:9000` on your phone browser.

#### 4. "Can I run Singularity on my phone (Android Termux) and connect from my laptop?"
Yes! Just run `./start.sh --lan` in Termux, check your phone's IP, and open `http://<PHONE_IP>:9000` on your laptop browser.

#### 5. "Do I need to pay for anything?"
No. It works with standard free accounts across all 8 providers.

---

## 📁 Repository Layout

```
Singularity/
├── singularity/                         # The magic backend & web UI
│   ├── engines/                         # 8 provider drivers (ChatGPT, Claude, Gemini, etc.)
│   ├── static/                          # Control center, Claude-style UI & Playground
│   ├── artifacts.py                     # Live React / HTML code sandbox
│   ├── db.py                            # SQLite encrypted credential vault
│   ├── providers.py                     # 226+ model catalog & live limit aggregators
│   └── server.py                        # FastAPI / ASGI Universal Gateway (:9000)
├── TAVERN/                              # Bundled Tavern Studio Visual Novel client (:5173)
├── start.sh                             # Linux / macOS / Termux 1-click launcher & CLI
├── start.bat                            # Windows 1-click launcher & CLI
├── singular -> start.sh                 # Global CLI shortcut
└── requirements.txt                     # Lightweight pure-Python dependencies
```

---

## 📄 License

MIT License. Built by **[Nephis](https://github.com/Nephis-opus)**.

