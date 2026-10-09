"""
Singularity Xiaomi MiMo Autonomous Token Extraction & Auto-Refresh Engine.

Discovers, decrypts, and extracts Xiaomi MiMo authentication tokens
(serviceToken, userId, xiaomichatbot_ph, passToken) from local Chromium-based browsers
(Chrome, Chromium, Brave, Edge, Opera, Vivaldi) and Mozilla Firefox across Linux, Windows, macOS.
Also provides automatic background renewal of 24-hour serviceTokens via Xiaomi Passport serviceLogin.
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
import httpx

for dist_path in (
    '/usr/lib/python3/dist-packages',
    '/usr/local/lib/python3/dist-packages',
    f'/usr/lib/python{sys.version_info.major}.{sys.version_info.minor}/dist-packages'
):
    if os.path.isdir(dist_path) and dist_path not in sys.path:
        sys.path.append(dist_path)

logger = logging.getLogger("singularity.mimo")


def _get_linux_chrome_secret() -> bytes:
    """Retrieve Chrome Safe Storage master password via D-Bus Secret Service."""
    try:
        import dbus
        bus = dbus.SessionBus()
        ss = bus.get_object('org.freedesktop.secrets', '/org/freedesktop/secrets')
        ss_iface = dbus.Interface(ss, 'org.freedesktop.Secret.Service')
        session_path = ss_iface.OpenSession('plain', '')[1]

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

        if prefix == b'v11' and len(data) > 32:
            data = data[32:]
        return data
    except Exception as exc:
        logger.debug(f"Linux cookie decryption error: {exc}")
        return b''


def _decrypt_windows_cookie(enc_val: bytes, local_state_path: str) -> bytes:
    """Decrypt Windows Chromium AES-256-GCM cookie using DPAPI key."""
    if not enc_val:
        return b''
    try:
        import ctypes
        from ctypes import wintypes

        prefix = enc_val[:3]
        if prefix not in (b'v10', b'v20'):
            class DATA_BLOB(ctypes.Structure):
                _fields_ = [('cbData', wintypes.DWORD), ('pbData', ctypes.POINTER(ctypes.c_char))]
            in_blob = DATA_BLOB(len(enc_val), ctypes.c_char_p(enc_val))
            out_blob = DATA_BLOB()
            if ctypes.windll.crypt32.CryptUnprotectData(ctypes.byref(in_blob), None, None, None, None, 0, ctypes.byref(out_blob)):
                res = ctypes.string_at(out_blob.pbData, out_blob.cbData)
                ctypes.windll.kernel32.LocalFree(out_blob.pbData)
                return res
            return b''

        if not os.path.exists(local_state_path):
            return b''
        with open(local_state_path, 'r', encoding='utf-8') as f:
            local_state = json.load(f)
        b64_key = local_state.get('os_crypt', {}).get('encrypted_key')
        if not b64_key:
            return b''

        encrypted_key = base64.b64decode(b64_key)[5:]
        class DATA_BLOB(ctypes.Structure):
            _fields_ = [('cbData', wintypes.DWORD), ('pbData', ctypes.POINTER(ctypes.c_char))]
        in_blob = DATA_BLOB(len(encrypted_key), ctypes.c_char_p(encrypted_key))
        out_blob = DATA_BLOB()
        if not ctypes.windll.crypt32.CryptUnprotectData(ctypes.byref(in_blob), None, None, None, None, 0, ctypes.byref(out_blob)):
            return b''
        master_key = ctypes.string_at(out_blob.pbData, out_blob.cbData)
        ctypes.windll.kernel32.LocalFree(out_blob.pbData)

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
        return data
    except Exception as exc:
        logger.debug(f"macOS cookie decryption error: {exc}")
        return b''


def _extract_mimo_from_sqlite(db_path: str, is_firefox: bool = False, master_key: Any = None, local_state_path: str = "") -> Optional[Dict[str, str]]:
    """Extract Xiaomi MiMo cookies from a browser SQLite cookie database."""
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
                "WHERE (host LIKE '%xiaomimimo.com%' OR host LIKE '%xiaomi.com%') "
                "  AND name IN ('serviceToken', 'userId', 'xiaomichatbot_ph', 'passToken') "
                "ORDER BY name ASC"
            )
            rows = cur.fetchall()
            for name, val in rows:
                if val:
                    cookies[name] = val
        else:
            cur.execute(
                "SELECT name, encrypted_value, value FROM cookies "
                "WHERE (host_key LIKE '%xiaomimimo.com%' OR host_key LIKE '%xiaomi.com%') "
                "  AND name IN ('serviceToken', 'userId', 'xiaomichatbot_ph', 'passToken') "
                "ORDER BY name ASC"
            )
            rows = cur.fetchall()
            for name, enc_val, plain_val in rows:
                if enc_val:
                    if sys.platform.startswith('linux'):
                        dec_bytes = _decrypt_linux_cookie(enc_val, master_key or b'peanuts')
                    elif sys.platform == 'win32':
                        dec_bytes = _decrypt_windows_cookie(enc_val, local_state_path)
                    elif sys.platform == 'darwin':
                        dec_bytes = _decrypt_macos_cookie(enc_val, master_key or '')
                    else:
                        dec_bytes = enc_val
                    val_str = dec_bytes.decode('utf-8', errors='ignore').strip()
                    if val_str:
                        cookies[name] = val_str
                elif plain_val:
                    cookies[name] = plain_val.strip()

        conn.close()

        # Need at least serviceToken to be considered valid
        if cookies.get("serviceToken"):
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


def discover_mimo_tokens() -> List[Dict[str, Any]]:
    """Scan all known browser profiles on this machine for Xiaomi MiMo session tokens."""
    candidates = []

    # 1. Linux
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
                parts = Path(p).parts
                profile_name = parts[-2] if parts[-1] == 'Cookies' else (parts[-3] if len(parts) >= 3 else 'Default')
                parsed = _extract_mimo_from_sqlite(p, is_firefox=False, master_key=master_key)
                if parsed and parsed.get('serviceToken'):
                    candidates.append({
                        "browser": browser_name,
                        "profile": profile_name,
                        "db_path": p,
                        "cookies": parsed,
                    })

        # Linux Firefox
        for p in glob.glob(os.path.expanduser("~/.mozilla/firefox/*.default*/cookies.sqlite")):
            profile_name = Path(p).parent.name
            parsed = _extract_mimo_from_sqlite(p, is_firefox=True)
            if parsed and parsed.get('serviceToken'):
                candidates.append({
                    "browser": "Firefox",
                    "profile": profile_name,
                    "db_path": p,
                    "cookies": parsed,
                })

    # 2. Windows
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
                parsed = _extract_mimo_from_sqlite(p, is_firefox=False, local_state_path=local_state)
                if parsed and parsed.get('serviceToken'):
                    candidates.append({
                        "browser": browser_name,
                        "profile": profile_name,
                        "db_path": p,
                        "cookies": parsed,
                    })

        if appdata:
            for p in glob.glob(os.path.join(appdata, r"Mozilla\Firefox\Profiles\*.default*\cookies.sqlite")):
                profile_name = Path(p).parent.name
                parsed = _extract_mimo_from_sqlite(p, is_firefox=True)
                if parsed and parsed.get('serviceToken'):
                    candidates.append({
                        "browser": "Firefox",
                        "profile": profile_name,
                        "db_path": p,
                        "cookies": parsed,
                    })

    # 3. macOS
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
                parsed = _extract_mimo_from_sqlite(p, is_firefox=False, master_key=master_password)
                if parsed and parsed.get('serviceToken'):
                    candidates.append({
                        "browser": browser_name,
                        "profile": profile_name,
                        "db_path": p,
                        "cookies": parsed,
                    })

        for p in glob.glob(os.path.expanduser("~/Library/Application Support/Firefox/Profiles/*.default*/cookies.sqlite")):
            profile_name = Path(p).parent.name
            parsed = _extract_mimo_from_sqlite(p, is_firefox=True)
            if parsed and parsed.get('serviceToken'):
                candidates.append({
                    "browser": "Firefox",
                    "profile": profile_name,
                    "db_path": p,
                    "cookies": parsed,
                })

    return candidates


async def refresh_service_token_from_pass_token(pass_token: str, user_id: str) -> Optional[Dict[str, str]]:
    """
    Exchange long-lived Xiaomi passToken for a fresh 24h serviceToken.
    Calls Xiaomi Passport serviceLogin for service 'xiaomichatbot'.
    """
    if not pass_token or not user_id:
        return None

    url = "https://account.xiaomi.com/pass/serviceLogin"
    params = {
        "sid": "xiaomichatbot",
        "_json": "true",
        "passive": "true",
    }
    cookies = {
        "passToken": pass_token,
        "userId": str(user_id),
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer": "https://aistudio.xiaomimimo.com/",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(url, params=params, cookies=cookies, headers=headers)
            service_token = resp.cookies.get("serviceToken")
            ph = resp.cookies.get("xiaomichatbot_ph")

            if service_token:
                return {
                    "serviceToken": service_token,
                    "userId": str(user_id),
                    "xiaomichatbot_ph": ph or "",
                    "passToken": pass_token,
                }
    except Exception as exc:
        logger.debug(f"ServiceToken refresh via passToken failed: {exc}")

    return None


def auto_fetch_mimo_token(save_to_db: bool = True) -> Dict[str, Any]:
    """
    Discovers the freshest Xiaomi MiMo tokens from local browser profiles,
    validates them, and optionally saves them into the Singularity SQLite credential vault.
    """
    candidates = discover_mimo_tokens()

    if not candidates:
        return {
            "ok": False,
            "status_code": 404,
            "detail": "No Xiaomi MiMo session cookies found in any local browser. Make sure you are logged into aistudio.xiaomimimo.com in Chrome, Brave, Edge, or Firefox."
        }

    # Best candidate: preference for Chrome/Brave/Firefox with complete cookies
    best = candidates[0]
    for c in candidates:
        c_data = c.get("cookies", {})
        if c_data.get("serviceToken") and c_data.get("userId") and c_data.get("xiaomichatbot_ph"):
            best = c
            break

    cookies_dict = best["cookies"]
    st = cookies_dict.get("serviceToken", "")
    uid = cookies_dict.get("userId", "")
    ph = cookies_dict.get("xiaomichatbot_ph", "")
    pass_token = cookies_dict.get("passToken", "")

    cookie_str = f"serviceToken={st}; userId={uid}; xiaomichatbot_ph={ph}"
    if pass_token:
        cookie_str += f"; passToken={pass_token}"

    saved = False
    if save_to_db:
        try:
            from singularity import db
            db.init_db()
            db.add_account(
                provider="mimo",
                identifier=uid or f"mimo_{st[:12]}",
                name=f"MiMo ({uid})" if uid else "Xiaomi MiMo (Auto-Detected)",
                token=cookie_str,
                plan="free",
                status="active",
                metadata={
                    "serviceToken": st,
                    "userId": uid,
                    "xiaomichatbot_ph": ph,
                    "passToken": pass_token,
                    "source": f"autofetch:{best['browser']}",
                    "profile": best.get("profile", "Default"),
                    "updated_at": int(time.time()),
                }
            )
            saved = True
        except Exception as exc:
            logger.warning(f"Failed to auto-save MiMo credential to SQLite vault: {exc}")

    masked_token = f"{st[:10]}...{st[-6:]}" if len(st) > 16 else "***"
    return {
        "ok": True,
        "browser": best["browser"],
        "profile": best.get("profile", "Default"),
        "user_id": uid,
        "token_masked": masked_token,
        "token": cookie_str,
        "has_pass_token": bool(pass_token),
        "saved_to_vault": saved,
        "cookie_string": cookie_str,
    }
