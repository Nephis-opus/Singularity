#!/usr/bin/env bash
# Singularity Gateway Launcher

# Resolve real directory even when called through a symlink (e.g. $PREFIX/bin/singular)
if command -v realpath >/dev/null 2>&1; then
    SCRIPT_PATH="$(realpath "${BASH_SOURCE[0]}")"
    DIR="$(dirname "$SCRIPT_PATH")"
else
    SOURCE="${BASH_SOURCE[0]}"
    while [ -L "$SOURCE" ]; do
        DIR="$(cd -P "$(dirname "$SOURCE")" >/dev/null 2>&1 && pwd)"
        SOURCE="$(readlink "$SOURCE")"
        [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
    done
    DIR="$(cd -P "$(dirname "$SOURCE")" >/dev/null 2>&1 && pwd)"
fi

# Fallback path search if DIR/singularity is missing (handles complex Termux symlinks and varied clone locations)
if [ ! -d "$DIR/singularity" ]; then
    if [ -d "$PWD/singularity" ]; then
        DIR="$PWD"
    elif [ -d "$HOME/Singularity/singularity" ]; then
        DIR="$HOME/Singularity"
    elif [ -d "$HOME/singularity/singularity" ]; then
        DIR="$HOME/singularity"
    elif [ -d "$HOME/Desktop/Janitor/singularity" ]; then
        DIR="$HOME/Desktop/Janitor"
    elif [ -n "$PREFIX" ] && [ -d "$PREFIX/../home/Singularity/singularity" ]; then
        DIR="$PREFIX/../home/Singularity"
    elif [ -n "$PREFIX" ] && [ -d "$PREFIX/../home/singularity/singularity" ]; then
        DIR="$PREFIX/../home/singularity"
    fi
fi

# Ensure DIR points to the Git root if .git is elsewhere in tree
if [ ! -d "$DIR/.git" ] && command -v git >/dev/null 2>&1; then
    GIT_ROOT="$(git -C "$DIR" rev-parse --show-toplevel 2>/dev/null || git rev-parse --show-toplevel 2>/dev/null || echo "")"
    if [ -n "$GIT_ROOT" ] && [ -d "$GIT_ROOT/.git" ]; then
        DIR="$GIT_ROOT"
    fi
fi

# ==============================================================================
# 0. Auto-Updater (Automatically pull latest updates on startup)
# ==============================================================================
if [ "${SINGULARITY_NO_UPDATE:-0}" != "1" ] && [ "$1" != "--no-update" ]; then
    if command -v git >/dev/null 2>&1 && [ -d "$DIR/.git" ]; then
        (
            cd "$DIR"
            echo "  [🔄] Checking for Singularity updates..."
            # Fast network fetch of origin main without breaking shallow clone graphs
            git fetch --quiet origin main 2>/dev/null || git fetch --quiet origin 2>/dev/null || true
            # Ensure local branch is main and tracks origin/main (fixes detached HEAD / master / missing tracking)
            CUR_BRANCH="$(git branch --show-current 2>/dev/null || echo "")"
            if [ "$CUR_BRANCH" != "main" ]; then
                git checkout -B main origin/main 2>/dev/null || git branch -M main 2>/dev/null || true
            fi
            git branch --set-upstream-to=origin/main main 2>/dev/null || true

            LOCAL_REV="$(git rev-parse HEAD 2>/dev/null || echo "")"
            REMOTE_REV="$(git rev-parse FETCH_HEAD 2>/dev/null || git rev-parse origin/main 2>/dev/null || git rev-parse '@{u}' 2>/dev/null || echo "")"
            if [ -n "$LOCAL_REV" ] && [ -n "$REMOTE_REV" ] && [ "$LOCAL_REV" != "$REMOTE_REV" ]; then
                echo "  [🔄] New update found (${LOCAL_REV:0:7} -> ${REMOTE_REV:0:7})! Updating Singularity..."
                UPDATE_SUCCESS=0
                if git pull --ff-only origin main 2>/dev/null; then
                    UPDATE_SUCCESS=1
                elif git pull origin main 2>/dev/null; then
                    UPDATE_SUCCESS=1
                else
                    # Stash uncommitted changes and retry clean pull
                    git stash -q 2>/dev/null || true
                    if git pull origin main 2>/dev/null || git reset --hard origin/main 2>/dev/null; then
                        git stash pop -q 2>/dev/null || true
                        UPDATE_SUCCESS=1
                    fi
                fi

                if [ "$UPDATE_SUCCESS" = "1" ]; then
                    NEW_REV="$(git rev-parse HEAD 2>/dev/null || echo "$REMOTE_REV")"
                    echo "  [✨] Successfully updated Singularity to latest version (${NEW_REV:0:7})!"
                else
                    echo "  [!] Auto-update could not auto-merge. Run 'git pull' in Singularity directory."
                fi
            else
                if [ -n "$LOCAL_REV" ]; then
                    echo "  [✓] Singularity is up to date (${LOCAL_REV:0:7})."
                fi
            fi
        ) || true
    fi
fi

# Auto-link 'singular', 'singularity', and 'c2a' binaries into PATH if in Termux
if [ -n "$PREFIX" ] && [ -d "$PREFIX/bin" ]; then
    ln -sf "$DIR/start.sh" "$PREFIX/bin/singular" 2>/dev/null || true
    ln -sf "$DIR/start.sh" "$PREFIX/bin/singularity" 2>/dev/null || true
    ln -sf "$DIR/start.sh" "$PREFIX/bin/c2a" 2>/dev/null || true
    chmod +x "$PREFIX/bin/singular" "$PREFIX/bin/singularity" "$PREFIX/bin/c2a" 2>/dev/null || true
    if [ -f "$HOME/.bashrc" ]; then
        if ! grep -q "alias singularity=" "$HOME/.bashrc" 2>/dev/null; then
            echo "alias singular=\"$DIR/start.sh\"" >> "$HOME/.bashrc" 2>/dev/null || true
            echo "alias singularity=\"$DIR/start.sh\"" >> "$HOME/.bashrc" 2>/dev/null || true
        fi
    fi
fi

# Auto-link into ~/.local/bin for standard Linux/macOS users
if [ -z "$PREFIX" ] && [ -d "$HOME/.local/bin" ]; then
    ln -sf "$DIR/start.sh" "$HOME/.local/bin/singular" 2>/dev/null || true
    ln -sf "$DIR/start.sh" "$HOME/.local/bin/singularity" 2>/dev/null || true
    ln -sf "$DIR/start.sh" "$HOME/.local/bin/c2a" 2>/dev/null || true
    chmod +x "$HOME/.local/bin/singular" "$HOME/.local/bin/singularity" "$HOME/.local/bin/c2a" 2>/dev/null || true
fi

# Phone / Termux Native ngrok setup (Android ARM64/ARM)
if [ -n "$PREFIX" ]; then
    # Verify existing ngrok actually runs without Exec format error
    NGROK_RUNNABLE=0
    if command -v ngrok >/dev/null 2>&1; then
        if ngrok version >/dev/null 2>&1; then
            NGROK_RUNNABLE=1
        else
            echo "  [⚠️] Detected broken or architecture-mismatched ngrok in Termux. Removing..."
            rm -f "$PREFIX/bin/ngrok" "$DIR/singularity/bin/ngrok" 2>/dev/null || true
        fi
    fi

    if [ "$NGROK_RUNNABLE" -eq 0 ]; then
        echo "  [📱] Android/Termux detected: installing verified native ngrok binary..."
        (
            # Accurately detect userspace architecture (dpkg) rather than just kernel (uname -m)
            DPKG_ARCH="$(dpkg --print-architecture 2>/dev/null || uname -m)"
            NGROK_URL=""
            if [ "$DPKG_ARCH" = "aarch64" ] || [ "$DPKG_ARCH" = "arm64" ]; then
                NGROK_URL="https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm64.tgz"
            elif [[ "$DPKG_ARCH" == arm* ]]; then
                NGROK_URL="https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm.tgz"
            elif [ "$DPKG_ARCH" = "x86_64" ] || [ "$DPKG_ARCH" = "amd64" ]; then
                NGROK_URL="https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz"
            else
                NGROK_URL="https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm64.tgz"
            fi

            TMP_TGZ="/tmp/ngrok-termux-$$.tgz"
            if command -v curl >/dev/null 2>&1; then
                curl -sSL "$NGROK_URL" -o "$TMP_TGZ" 2>/dev/null
            elif command -v wget >/dev/null 2>&1; then
                wget -q "$NGROK_URL" -O "$TMP_TGZ" 2>/dev/null
            fi

            if [ -f "$TMP_TGZ" ]; then
                mkdir -p "$DIR/singularity/bin"
                tar -xzf "$TMP_TGZ" -C "$DIR/singularity/bin" ngrok 2>/dev/null || tar -xzf "$TMP_TGZ" -C "$DIR/singularity/bin" 2>/dev/null
                rm -f "$TMP_TGZ"
                if [ -f "$DIR/singularity/bin/ngrok" ]; then
                    chmod +x "$DIR/singularity/bin/ngrok"
                    # Test if the binary executes without Exec format error
                    if ! "$DIR/singularity/bin/ngrok" version >/dev/null 2>&1; then
                        echo "  [!] Primary binary incompatible with device. Falling back to alternative 32-bit ARM binary..."
                        ALT_URL="https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm.tgz"
                        if command -v curl >/dev/null 2>&1; then
                            curl -sSL "$ALT_URL" -o "/tmp/ngrok-alt.tgz" 2>/dev/null
                        elif command -v wget >/dev/null 2>&1; then
                            wget -q "$ALT_URL" -O "/tmp/ngrok-alt.tgz" 2>/dev/null
                        fi
                        if [ -f "/tmp/ngrok-alt.tgz" ]; then
                            tar -xzf "/tmp/ngrok-alt.tgz" -C "$DIR/singularity/bin" ngrok 2>/dev/null
                            chmod +x "$DIR/singularity/bin/ngrok"
                            rm -f "/tmp/ngrok-alt.tgz"
                        fi
                    fi

                    if "$DIR/singularity/bin/ngrok" version >/dev/null 2>&1; then
                        [ -d "$PREFIX/bin" ] && cp -f "$DIR/singularity/bin/ngrok" "$PREFIX/bin/ngrok" 2>/dev/null && chmod +x "$PREFIX/bin/ngrok" 2>/dev/null
                        echo "  [✓] Verified native ngrok successfully installed for Android!"
                    fi
                fi
            fi
        ) || true
    fi
fi

# Detect Python across Linux, macOS, Termux, and Windows (Git Bash/MSYS2/WSL)
PYTHON_BIN=""
if [ -x "$DIR/singularity/.venv/bin/python3" ]; then
    PYTHON_BIN="$DIR/singularity/.venv/bin/python3"
elif [ -x "$DIR/singularity/.venv/Scripts/python.exe" ]; then
    PYTHON_BIN="$DIR/singularity/.venv/Scripts/python.exe"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN="python"
elif command -v py >/dev/null 2>&1; then
    PYTHON_BIN="py"
fi

if [ -z "$PYTHON_BIN" ]; then
    echo "============================================================"
    echo "  [ERROR] Python was not found on your system!"
    echo "  Please install Python 3.10+ from https://www.python.org"
    echo "  On Windows: Ensure 'Add python.exe to PATH' is checked."
    echo "============================================================"
    read -p "Press Enter to close..." _ 2>/dev/null || sleep 5
    exit 1
fi

# Prevent instant terminal window closure on crash/error (common on Windows Git Bash)
trap 'EXIT_CODE=$?; if [ $EXIT_CODE -ne 0 ]; then echo ""; echo "Singularity exited with code $EXIT_CODE."; read -p "Press Enter to close..." _ 2>/dev/null || sleep 5; fi' EXIT

cd "$DIR/singularity" || exit 1

# Check basic dependencies (starlette, uvicorn, httpx)
if ! "$PYTHON_BIN" -c "import starlette, uvicorn, httpx" 2>/dev/null; then
    # Homebrew and Debian/Ubuntu Pythons refuse global pip installs (PEP 668), so install into a
    # private virtualenv like start.bat does. Falls back to the plain interpreter if venv is unavailable.
    VENV_DIR="$DIR/singularity/.venv"
    if [ ! -x "$VENV_DIR/bin/python3" ] && [ ! -x "$VENV_DIR/Scripts/python.exe" ]; then
        echo "  [*] Creating virtual environment in singularity/.venv..."
        "$PYTHON_BIN" -m venv "$VENV_DIR" >/dev/null 2>&1 || rm -rf "$VENV_DIR"
    fi
    if [ -x "$VENV_DIR/bin/python3" ]; then
        PYTHON_BIN="$VENV_DIR/bin/python3"
    elif [ -x "$VENV_DIR/Scripts/python.exe" ]; then
        PYTHON_BIN="$VENV_DIR/Scripts/python.exe"
    fi

    echo "  [*] Installing required dependencies from requirements.txt..."
    "$PYTHON_BIN" -m pip install -r "$DIR/requirements.txt" || true
    if ! "$PYTHON_BIN" -c "import starlette, uvicorn, httpx" 2>/dev/null; then
        echo "  [ERROR] Could not install Singularity's Python dependencies."
        echo "          Try manually: $PYTHON_BIN -m pip install -r \"$DIR/requirements.txt\""
        exit 1
    fi
fi

# --lan: listen on all interfaces so phones / other PCs can connect (they log in with the gateway key).
# --no-update: bypass automatic startup git pull.
# Default is this machine only.
ARGS=()
for arg in "$@"; do
    if [ "$arg" = "--lan" ]; then
        export SINGULARITY_LAN=1
    elif [ "$arg" = "--no-update" ]; then
        export SINGULARITY_NO_UPDATE=1
    else
        ARGS+=("$arg")
    fi
done
set -- ${ARGS[@]+"${ARGS[@]}"}

kill_port_listeners() {
    for port in "$@"; do
        # 1. fuser sends SIGKILL directly to processes using the port socket
        if command -v fuser >/dev/null 2>&1; then
            fuser -k -9 "${port}/tcp" >/dev/null 2>&1 || true
        fi
        # 2. lsof filtered specifically to LISTEN sockets (avoids touching client connections)
        if command -v lsof >/dev/null 2>&1; then
            lsof -sTCP:LISTEN -iTCP:"${port}" -t 2>/dev/null | xargs -r kill -9 >/dev/null 2>&1 || true
        fi
        # 3. ss socket statistics parser for listening PIDs on Linux
        if command -v ss >/dev/null 2>&1; then
            ss -lptn "sport = :${port}" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2 | xargs -r kill -9 >/dev/null 2>&1 || true
        fi
    done
}

# Route CLI commands vs server launch
case "$1" in
    status|limits|accounts|login|autofetch|import|export|simulate|host|chat|thinking|service|tunnel|key|bench|update|upgrade|-h|--help)
        exec "$PYTHON_BIN" cli.py "$@"
        ;;
    restart|server|"")
        IS_RESTART=0
        if [ "$1" = "restart" ]; then
            IS_RESTART=1
            shift
        elif [ "$1" = "server" ]; then
            shift
        fi

        # Cleanly terminate any stale processes holding port 9000 or Tavern ports (5173, 3001)
        GATEWAY_PORT="${PORT:-9000}"
        if [ "$IS_RESTART" = "1" ]; then
            echo "  [🔄] Restarting Singularity (clearing ports $GATEWAY_PORT, 5173, 3001)..."
        fi
        kill_port_listeners "$GATEWAY_PORT" 5173 3001 3000
        sleep 0.2

        # Auto-launch Tavern Studio if TAV-TEST or TAVERN directory exists
        TAVERN_DIR=""
        if [ -d "$DIR/TAVERN" ] && [ -f "$DIR/TAVERN/package.json" ]; then
            TAVERN_DIR="$DIR/TAVERN"
        elif [ -d "$DIR/TAV-TEST" ] && [ -f "$DIR/TAV-TEST/package.json" ]; then
            TAVERN_DIR="$DIR/TAV-TEST"
        fi

        TAVERN_PID=""
        if [ -n "$TAVERN_DIR" ]; then
            if ! (echo > /dev/tcp/127.0.0.1/5173) 2>/dev/null && ! nc -z 127.0.0.1 5173 2>/dev/null && ! nc -z 127.0.0.1 3001 2>/dev/null; then
                (
                    cd "$TAVERN_DIR"
                    export PATH="$HOME/.bun/bin:$PATH"
                    export NVM_DIR="$HOME/.nvm"
                    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 24 >/dev/null 2>&1 || true
                    for nvm_node in "$HOME/.nvm/versions/node"/v2[0-9]*/bin; do
                        [ -d "$nvm_node" ] && export PATH="$nvm_node:$PATH"
                    done
                    [ -d "$HOME/.local/share/fnm/current/bin" ] && export PATH="$HOME/.local/share/fnm/current/bin:$PATH"
                    # Tavern's API has no login: loopback only unless --lan was given.
                    if [ "${SINGULARITY_LAN:-}" = "1" ]; then
                        export API_HOST="0.0.0.0"
                    else
                        export API_HOST="127.0.0.1"
                    fi
                    unset RP_ALLOWED_ORIGINS

                    # Check for node or bun
                    RUNNER=""
                    if command -v bun >/dev/null 2>&1; then
                        RUNNER="bun"
                    elif command -v npm >/dev/null 2>&1; then
                        RUNNER="npm"
                    fi

                    if [ -n "$RUNNER" ]; then
                        echo "  [🏰] Starting Tavern Studio natively alongside Singularity..."
                        if [ ! -d "node_modules" ]; then
                            echo "  [🏰] Installing Tavern dependencies (first-time setup)..."
                            if [ "$RUNNER" = "bun" ]; then
                                bun install >/dev/null 2>&1 || true
                            else
                                npm install --silent >/dev/null 2>&1 || true
                            fi
                        fi
                        if [ "$RUNNER" = "bun" ]; then
                            bun run dev >/dev/null 2>&1
                        else
                            npm run dev >/dev/null 2>&1
                        fi
                    else
                        echo "  [!] Note: Node.js (v20+) or Bun is required to launch Tavern Studio."
                        echo "      Install Node.js from https://nodejs.org or Bun from https://bun.sh"
                    fi
                ) &
                TAVERN_PID=$!
            else
                echo "  [🏰] Tavern Studio is already running."
            fi
        fi

        cleanup() {
            if [ -n "$TAVERN_PID" ]; then
                kill "$TAVERN_PID" 2>/dev/null || true
            fi
        }
        trap cleanup INT TERM EXIT

        "$PYTHON_BIN" server.py "$@"
        EXIT_CODE=$?
        cleanup
        exit $EXIT_CODE
        ;;
    *)
        kill_port_listeners "${PORT:-9000}" 5173 3001 3000
        exec "$PYTHON_BIN" server.py "$@"
        ;;
esac

