"""
JanitorAI Autonomous Browser Token Extraction & Deployment Engine.

Discovers, decrypts, and extracts JanitorAI Supabase authentication tokens
from local Chromium-based browsers (Chrome, Chromium, Brave, Edge, Opera, Vivaldi)
and Mozilla Firefox profiles across Linux, Windows, and macOS.
"""

import os
import sys
import glob
import json
import time
import shutil
import base64
import hashlib
import sqlite3
import tempfile
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

# Ensure system dist-packages (containing system dbus and cryptography) are accessible from venvs
for dist_path in (
    '/usr/lib/python3/dist-packages',
    '/usr/local/lib/python3/dist-packages',
    f'/usr/lib/python{sys.version_info.major}.{sys.version_info.minor}/dist-packages'
):
    if os.path.isdir(dist_path) and dist_path not in sys.path:
        sys.path.append(dist_path)

logger = logging.getLogger("singularity.janitor")

# ----------------------------------------------------------------------
# Crypto / Secret Decryption Helpers
# ----------------------------------------------------------------------

def _get_linux_chrome_secret() -> bytes:
    """Retrieve Chrome Safe Storage master password via Freedesktop Secret Service over D-Bus."""
    try:
        import dbus
        bus = dbus.SessionBus()
        ss = bus.get_object('org.freedesktop.secrets', '/org/freedesktop/secrets')
        ss_iface = dbus.Interface(ss, 'org.freedesktop.Secret.Service')
        session_path = ss_iface.OpenSession('plain', '')[1]
        
        # Search for chrome or chromium keys
        for app_name in ('chrome', 'chromium', 'brave', 'google-chrome'):
            search_res = ss_iface.SearchItems({'application': app_name})
            items = search_res[0] if search_res and search_res[0] else (search_res[1] if search_res and len(search_res) > 1 else [])
            if items:
                item_obj = bus.get_object('org.freedesktop.secrets', items[0])
                item_iface = dbus.Interface(item_obj, 'org.freedesktop.Secret.Item')
                secret = item_iface.GetSecret(session_path)
                if secret and len(secret) > 2:
                    return bytes(secret[2])
    except Exception as exc:
        logger.debug(f"Secret Service D-Bus lookup failed: {exc}")

    # Standard Linux Chromium fallback password
    return b'peanuts'


def _decrypt_linux_cookie(enc_val: bytes, master_key: bytes) -> bytes:
    """Decrypt v10/v11 AES-128-CBC Linux Chromium cookie bytes."""
    if not enc_val:
        return b''
    prefix = enc_val[:3]
    raw = enc_val[3:] if prefix in (b'v10', b'v11') else enc_val

    try:
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.backends import default_backend

        salt = b'saltysalt'
        derived_key = hashlib.pbkdf2_hmac('sha1', master_key, salt, 1, 16)
        iv = b' ' * 16

        cipher = Cipher(algorithms.AES(derived_key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        padded = decryptor.update(raw) + decryptor.finalize()
        pad_len = padded[-1]
        data = padded[:-pad_len] if 0 < pad_len <= 16 else padded
        
        # Modern Chromium v11 prepends a 32-byte header/signature before the plaintext
        if prefix == b'v11' and len(data) > 32:
            data = data[32:]
        return data
    except Exception as exc:
        logger.debug(f"Linux cookie decryption error: {exc}")
        return b''


def _decrypt_windows_cookie(enc_val: bytes, local_state_path: str) -> bytes:
    """Decrypt Windows Chromium AES-256-GCM cookie using DPAPI master key from Local State."""
    if not enc_val:
        return b''
    try:
        import ctypes
        from ctypes import wintypes

        prefix = enc_val[:3]
        if prefix not in (b'v10', b'v20'):
            # Legacy DPAPI direct cookie
            class DATA_BLOB(ctypes.Structure):
                _fields_ = [('cbData', wintypes.DWORD), ('pbData', ctypes.POINTER(ctypes.c_char))]
            in_blob = DATA_BLOB(len(enc_val), ctypes.c_char_p(enc_val))
            out_blob = DATA_BLOB()
            if ctypes.windll.crypt32.CryptUnprotectData(ctypes.byref(in_blob), None, None, None, None, 0, ctypes.byref(out_blob)):
                res = ctypes.string_at(out_blob.pbData, out_blob.cbData)
                ctypes.windll.kernel32.LocalFree(out_blob.pbData)
                return res
            return b''

        # Read encrypted key from Local State
        if not os.path.exists(local_state_path):
            return b''
        with open(local_state_path, 'r', encoding='utf-8') as f:
            local_state = json.load(f)
        b64_key = local_state.get('os_crypt', {}).get('encrypted_key')
        if not b64_key:
            return b''

        encrypted_key = base64.b64decode(b64_key)[5:]  # Strip 'DPAPI' prefix
        class DATA_BLOB(ctypes.Structure):
            _fields_ = [('cbData', wintypes.DWORD), ('pbData', ctypes.POINTER(ctypes.c_char))]
        in_blob = DATA_BLOB(len(encrypted_key), ctypes.c_char_p(encrypted_key))
        out_blob = DATA_BLOB()
        if not ctypes.windll.crypt32.CryptUnprotectData(ctypes.byref(in_blob), None, None, None, None, 0, ctypes.byref(out_blob)):
            return b''
        master_key = ctypes.string_at(out_blob.pbData, out_blob.cbData)
        ctypes.windll.kernel32.LocalFree(out_blob.pbData)

        # AES-256-GCM decrypt: nonce=12 bytes (offset 3:15), ciphertext=offset 15:-16, tag=offset -16:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        nonce = enc_val[3:15]
        ciphertext_and_tag = enc_val[15:]
        aesgcm = AESGCM(master_key)
        return aesgcm.decrypt(nonce, ciphertext_and_tag, None)
    except Exception as exc:
        logger.debug(f"Windows cookie decryption error: {exc}")
        return b''


def _decrypt_macos_cookie(enc_val: bytes, master_password: str) -> bytes:
    """Decrypt macOS Chromium AES-128-CBC cookie using Keychain password."""
    if not enc_val:
        return b''
    prefix = enc_val[:3]
    raw = enc_val[3:] if prefix in (b'v10', b'v11') else enc_val
    try:
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.backends import default_backend

        salt = b'saltysalt'
        derived_key = hashlib.pbkdf2_hmac('sha1', master_password.encode('utf-8'), salt, 1003, 16)
        iv = b' ' * 16

        cipher = Cipher(algorithms.AES(derived_key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        padded = decryptor.update(raw) + decryptor.finalize()
        pad_len = padded[-1]
        data = padded[:-pad_len] if 0 < pad_len <= 16 else padded
        if prefix == b'v11' and len(data) > 32:
            data = data[32:]
        return data
    except Exception as exc:
        logger.debug(f"macOS cookie decryption error: {exc}")
        return b''


# ----------------------------------------------------------------------
# Browser Cookie DB Discovery & Token Parsing
# ----------------------------------------------------------------------

def _parse_supabase_cookie_payload(chunks: Dict[str, str]) -> Optional[Dict[str, Any]]:
    """Assemble and base64-decode Supabase auth token cookie chunks into a dict."""
    if not chunks:
        return None

    # Handle chunked cookie naming sb-auth-auth-token.0, sb-auth-auth-token.1, etc.
    combined = ''
    if 'sb-auth-auth-token.0' in chunks:
        keys = sorted([k for k in chunks if k.startswith('sb-auth-auth-token.')], key=lambda x: int(x.split('.')[-1]))
        combined = ''.join(chunks[k] for k in keys)
    elif 'sb-auth-auth-token' in chunks:
        combined = chunks['sb-auth-auth-token']
    else:
        # Generic prefix matching
        token_keys = sorted([k for k in chunks if 'auth-token' in k and 'verifier' not in k and 'flow' not in k])
        if token_keys:
            combined = ''.join(chunks[k] for k in token_keys)

    if not combined:
        return None

    if combined.startswith('base64-'):
        combined = combined[7:]
    
    # Pad base64 string
    clean_b64 = combined.strip()
    clean_b64 += '=' * (-len(clean_b64) % 4)

    try:
        raw_json = base64.b64decode(clean_b64).decode('utf-8', errors='ignore')
        data = json.loads(raw_json)
        return data if isinstance(data, dict) else None
    except Exception as exc:
        logger.debug(f"Failed to parse decoded Supabase payload: {exc}")
        return None


def _extract_from_sqlite_copy(db_path: str, is_firefox: bool = False, master_key: Any = None, local_state_path: str = "") -> Optional[Dict[str, Any]]:
    """Safely copy SQLite DB to a temp file and extract JanitorAI Supabase session token."""
    if not os.path.exists(db_path):
        return None

    temp_db = tempfile.mktemp(suffix=".sqlite")
    try:
        shutil.copy2(db_path, temp_db)
        conn = sqlite3.connect(temp_db, timeout=2.0)
        cur = conn.cursor()

        chunks: Dict[str, str] = {}

        if is_firefox:
            cur.execute(
                "SELECT name, value FROM moz_cookies "
                "WHERE host LIKE '%janitorai.com%' AND name LIKE '%auth-token%' "
                "ORDER BY name ASC"
            )
            rows = cur.fetchall()
            for name, val in rows:
                if 'code-verifier' not in name:
                    chunks[name] = val
        else:
            cur.execute(
                "SELECT name, encrypted_value, value FROM cookies "
                "WHERE host_key LIKE '%janitorai.com%' AND name LIKE '%auth-token%' "
                "ORDER BY name ASC"
            )
            rows = cur.fetchall()
            for name, enc_val, plain_val in rows:
                if 'code-verifier' in name:
                    continue
                if enc_val:
                    if sys.platform.startswith('linux'):
                        dec_bytes = _decrypt_linux_cookie(enc_val, master_key or b'peanuts')
                    elif sys.platform == 'win32':
                        dec_bytes = _decrypt_windows_cookie(enc_val, local_state_path)
                    elif sys.platform == 'darwin':
                        dec_bytes = _decrypt_macos_cookie(enc_val, master_key or '')
                    else:
                        dec_bytes = enc_val
                    chunks[name] = dec_bytes.decode('utf-8', errors='ignore')
                elif plain_val:
                    chunks[name] = plain_val

        conn.close()
        return _parse_supabase_cookie_payload(chunks)
    except Exception as exc:
        logger.debug(f"Error querying cookie DB {db_path}: {exc}")
        return None
    finally:
        if os.path.exists(temp_db):
            try:
                os.remove(temp_db)
            except Exception:
                pass


def discover_janitor_tokens() -> List[Dict[str, Any]]:
    """
    Search all known browser installations and profiles on this machine
    for JanitorAI Supabase tokens. Returns a list of candidate token metadata dicts.
    """
    candidates = []

    # 1. Linux Chrome / Chromium / Brave / Edge
    if sys.platform.startswith('linux'):
        master_key = _get_linux_chrome_secret()
        browser_patterns = [
            ("Google Chrome", "~/.config/google-chrome/*/Cookies"),
            ("Google Chrome", "~/.config/google-chrome/*/Network/Cookies"),
            ("Chromium", "~/.config/chromium/*/Cookies"),
            ("Chromium", "~/.config/chromium/*/Network/Cookies"),
            ("Brave", "~/.config/BraveSoftware/Brave-Browser/*/Cookies"),
            ("Brave", "~/.config/BraveSoftware/Brave-Browser/*/Network/Cookies"),
            ("Microsoft Edge", "~/.config/microsoft-edge/*/Cookies"),
            ("Microsoft Edge", "~/.config/microsoft-edge/*/Network/Cookies"),
            ("Opera", "~/.config/opera/*/Network/Cookies"),
            ("Vivaldi", "~/.config/vivaldi/*/Network/Cookies"),
        ]

        for browser_name, pat in browser_patterns:
            for p in glob.glob(os.path.expanduser(pat)):
                # extract profile name from path e.g. 'Default', 'Profile 1'
                parts = Path(p).parts
                profile_name = parts[-2] if parts[-1] == 'Cookies' else (parts[-3] if len(parts) >= 3 else 'Default')
                parsed = _extract_from_sqlite_copy(p, is_firefox=False, master_key=master_key)
                if parsed and parsed.get('access_token'):
                    candidates.append({
                        "browser": browser_name,
                        "profile": profile_name,
                        "db_path": p,
                        "data": parsed
                    })

        # Linux Firefox
        for p in glob.glob(os.path.expanduser("~/.mozilla/firefox/*.default*/cookies.sqlite")):
            profile_name = Path(p).parent.name
            parsed = _extract_from_sqlite_copy(p, is_firefox=True)
            if parsed and parsed.get('access_token'):
                candidates.append({
                    "browser": "Firefox",
                    "profile": profile_name,
                    "db_path": p,
                    "data": parsed
                })

    # 2. Windows Chrome / Brave / Edge / Firefox
    elif sys.platform == 'win32':
        appdata = os.environ.get('APPDATA', '')
        localappdata = os.environ.get('LOCALAPPDATA', '')

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
                profile_name = Path(p).parts[-3]
                parsed = _extract_from_sqlite_copy(p, is_firefox=False, local_state_path=local_state)
                if parsed and parsed.get('access_token'):
                    candidates.append({
                        "browser": browser_name,
                        "profile": profile_name,
                        "db_path": p,
                        "data": parsed
                    })

        # Windows Firefox
        if appdata:
            for p in glob.glob(os.path.join(appdata, r"Mozilla\Firefox\Profiles\*.default*\cookies.sqlite")):
                profile_name = Path(p).parent.name
                parsed = _extract_from_sqlite_copy(p, is_firefox=True)
                if parsed and parsed.get('access_token'):
                    candidates.append({
                        "browser": "Firefox",
                        "profile": profile_name,
                        "db_path": p,
                        "data": parsed
                    })

    # 3. macOS Chrome / Brave / Edge / Firefox
    elif sys.platform == 'darwin':
        import subprocess
        master_password = ""
        try:
            cmd = ['security', 'find-generic-password', '-w', '-s', 'Chrome Safe Storage']
            master_password = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode('utf-8').strip()
        except Exception:
            pass

        mac_patterns = [
            ("Google Chrome", "~/Library/Application Support/Google/Chrome/*/Cookies"),
            ("Google Chrome", "~/Library/Application Support/Google/Chrome/*/Network/Cookies"),
            ("Brave", "~/Library/Application Support/BraveSoftware/Brave-Browser/*/Cookies"),
            ("Brave", "~/Library/Application Support/BraveSoftware/Brave-Browser/*/Network/Cookies"),
            ("Microsoft Edge", "~/Library/Application Support/Microsoft Edge/*/Cookies"),
            ("Microsoft Edge", "~/Library/Application Support/Microsoft Edge/*/Network/Cookies"),
        ]

        for browser_name, pat in mac_patterns:
            for p in glob.glob(os.path.expanduser(pat)):
                parts = Path(p).parts
                profile_name = parts[-2] if parts[-1] == 'Cookies' else (parts[-3] if len(parts) >= 3 else 'Default')
                parsed = _extract_from_sqlite_copy(p, is_firefox=False, master_key=master_password)
                if parsed and parsed.get('access_token'):
                    candidates.append({
                        "browser": browser_name,
                        "profile": profile_name,
                        "db_path": p,
                        "data": parsed
                    })

        # macOS Firefox
        for p in glob.glob(os.path.expanduser("~/Library/Application Support/Firefox/Profiles/*.default*/cookies.sqlite")):
            profile_name = Path(p).parent.name
            parsed = _extract_from_sqlite_copy(p, is_firefox=True)
            if parsed and parsed.get('access_token'):
                candidates.append({
                    "browser": "Firefox",
                    "profile": profile_name,
                    "db_path": p,
                    "data": parsed
                })

    return candidates


def auto_fetch_janitor_token() -> Dict[str, Any]:
    """
    Auto-fetches the freshest, valid JanitorAI authentication token from local browsers.
    Returns structured result with token, expiration, remaining time, and browser origin.
    """
    now = time.time()
    candidates = discover_janitor_tokens()

    if not candidates:
        return {
            "ok": False,
            "status_code": 404,
            "detail": "No JanitorAI session cookies found in any local browser. Make sure you are signed into janitorai.com."
        }

    # Format and score candidates
    processed = []
    for c in candidates:
        d = c["data"]
        raw_token = d.get("access_token", "")
        expires_at = d.get("expires_at") or 0
        email = d.get("user", {}).get("email") or ""

        # Fallback to JWT exp claim if expires_at missing
        if not expires_at and raw_token:
            try:
                parts = raw_token.split(".")
                if len(parts) >= 2:
                    pad = parts[1] + "=" * (-len(parts[1]) % 4)
                    claims = json.loads(base64.urlsafe_b64decode(pad))
                    expires_at = claims.get("exp") or 0
                    if not email:
                        email = claims.get("email") or ""
            except Exception:
                pass

        is_valid = bool(expires_at and expires_at > now)
        remaining_sec = max(0, int(expires_at - now)) if expires_at else 0

        processed.append({
            "browser": c["browser"],
            "profile": c["profile"],
            "token": raw_token,
            "expires_at": expires_at,
            "is_valid": is_valid,
            "remaining_seconds": remaining_sec,
            "email": email
        })

    # Prioritize active unexpired tokens, then sort by highest remaining time / latest expiry
    valid_candidates = [p for p in processed if p["is_valid"]]
    if valid_candidates:
        valid_candidates.sort(key=lambda x: x["expires_at"], reverse=True)
        best = valid_candidates[0]
    else:
        # All tokens expired; pick the newest one so user can see it
        processed.sort(key=lambda x: x["expires_at"], reverse=True)
        best = processed[0]

    # Human-readable remaining time string
    sec = best["remaining_seconds"]
    if sec > 0:
        if sec < 3600:
            time_str = f"{sec // 60}m remaining"
        else:
            time_str = f"{sec // 3600}h {(sec % 3600) // 60}m remaining"
    else:
        time_str = "expired"

    return {
        "ok": True,
        "token": best["token"],
        "expires_at": best["expires_at"],
        "is_valid": best["is_valid"],
        "remaining_seconds": best["remaining_seconds"],
        "time_remaining_str": time_str,
        "email": best["email"],
        "browser": best["browser"],
        "profile": best["profile"],
        "total_sessions_found": len(processed),
        "detail": f"Auto-fetched from {best['browser']} ({best['profile']}) • {time_str}"
    }
