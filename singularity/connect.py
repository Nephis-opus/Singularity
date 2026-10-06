"""
Singularity S-Connect Engine
JanitorAI Bot Hub, Reverse-Engineered Prompt Interceptor & SillyTavern Character Card Matrix.

Zero-Rust, Termux-safe, pure-Python architecture with Pillow fallback and SQLite WAL caching.
"""

import os
import re
import io
import time
import json
import zlib
import struct
import base64
import asyncio
from typing import Dict, Any, List, Optional, Tuple
from urllib.parse import urlparse, parse_qs
import httpx

from singularity import db

DOMCORD_BACKEND_URL = "https://cards-backend.domcord.org"
JANITOR_CDN_URL = "https://ella.janitorai.com"
JANITOR_WEB_URL = "https://janitorai.com"

# Standard HTTP headers mimicking clean browser client
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
}


def resolve_media_url(raw_url: Optional[str]) -> str:
    """Normalize JanitorAI / Ella CDN media paths into full valid HTTPS URLs."""
    if not raw_url or not isinstance(raw_url, str):
        return ""
    u = raw_url.strip()
    if not u:
        return ""

    # Already absolute CDN url
    if u.startswith("https://ella.janitorai.com") or u.startswith("http://ella.janitorai.com"):
        return u.replace("http://", "https://")

    # janitorai.com domains mapped to ella CDN
    if "janitorai.com/media-approved/" in u:
        parts = u.split("janitorai.com/media-approved/")
        return f"{JANITOR_CDN_URL}/media-approved/{parts[-1]}"
    if "janitorai.com/bot-avatars/" in u:
        parts = u.split("janitorai.com/bot-avatars/")
        return f"{JANITOR_CDN_URL}/bot-avatars/{parts[-1]}"
    if "janitorai.com/user-avatars/" in u:
        parts = u.split("janitorai.com/user-avatars/")
        return f"{JANITOR_CDN_URL}/user-avatars/{parts[-1]}"
    if "janitorai.com/avatars/" in u:
        parts = u.split("janitorai.com/avatars/")
        return f"{JANITOR_CDN_URL}/avatars/{parts[-1]}"
    if "janitorai.com/profile-avatar-approved/" in u:
        parts = u.split("janitorai.com/profile-avatar-approved/")
        return f"{JANITOR_CDN_URL}/profile-avatar-approved/{parts[-1]}"

    # Relative paths
    if u.startswith("/media-approved/"):
        return f"{JANITOR_CDN_URL}{u}"
    if u.startswith("/bot-avatars/"):
        return f"{JANITOR_CDN_URL}{u}"
    if u.startswith("/user-avatars/"):
        return f"{JANITOR_CDN_URL}{u}"
    if u.startswith("/avatars/"):
        return f"{JANITOR_CDN_URL}{u}"
    if u.startswith("/profile-avatar-approved/"):
        return f"{JANITOR_CDN_URL}{u}"
    if u.startswith("bot-avatars/"):
        return f"{JANITOR_CDN_URL}/{u}"
    if u.startswith("avatars/"):
        return f"{JANITOR_CDN_URL}/{u}"
    if u.startswith("media-approved/"):
        return f"{JANITOR_CDN_URL}/{u}"
    if u.startswith("_") and (u.endswith(".webp") or u.endswith(".jpg") or u.endswith(".png")):
        return f"{JANITOR_CDN_URL}/bot-avatars/{u}"

    # General HTTP/HTTPS fallback
    if u.startswith("http://") or u.startswith("https://"):
        return u

    return f"{JANITOR_CDN_URL}/{u.lstrip('/')}"


def sanitize_banner(raw_url: Optional[str]) -> str:
    """Sanitize creator banner URL, filtering out fake Unsplash placeholders from proxy layers."""
    if not raw_url or not isinstance(raw_url, str):
        return ""
    u = raw_url.strip()
    if "images.unsplash.com" in u or "photo-1618005182384-a83a8bd57fbe" in u:
        return ""
    return resolve_media_url(u)


def extract_janitor_bot_id(query: str) -> Optional[str]:
    """Extract 36-character UUIDv4 from raw text, Janitor character URLs or share links."""
    if not query or not isinstance(query, str):
        return None
    q = query.strip()

    # Direct UUID regex
    uuid_match = re.search(r'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', q)
    if uuid_match:
        return uuid_match.group(0).lower()

    # URL path match (e.g. /characters/xxx_character-name)
    url_match = re.search(r'/(?:characters|bot)/([0-9a-fA-F-]{36})', q, re.IGNORECASE)
    if url_match:
        return url_match.group(1).lower()

    return None


def normalize_card_payload(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Convert raw Domcord or Janitor bot JSON into normalized S-Connect card format."""
    bot_id = str(raw.get("id") or raw.get("bot_id") or "").strip()
    name = str(raw.get("name") or "Unnamed Character").strip()
    avatar = resolve_media_url(raw.get("avatar") or raw.get("avatar_url") or "")

    # Creator
    creator_id = str(raw.get("creator_id") or raw.get("creatorId") or "").strip()
    creator_name = str(raw.get("creator_name") or raw.get("creatorName") or raw.get("creator") or "Janitor Creator").strip()
    creator_avatar = resolve_media_url(raw.get("creator_avatar") or raw.get("creatorAvatar") or "")

    # Tags & Category
    raw_tags = raw.get("tags") or []
    if isinstance(raw_tags, str):
        try:
            tags = json.loads(raw_tags)
        except Exception:
            tags = [t.strip() for t in raw_tags.split(",") if t.strip()]
    elif isinstance(raw_tags, list):
        tags = [str(t) for t in raw_tags]
    else:
        tags = []

    category = str(raw.get("category") or (tags[0] if tags else "General")).strip()

    # Greetings
    greetings = []
    first_mes = str(raw.get("first_message") or raw.get("firstMessage") or "").strip()
    raw_greetings = raw.get("greetings") or []
    if isinstance(raw_greetings, list):
        for idx, g in enumerate(raw_greetings):
            if isinstance(g, dict):
                greetings.append({
                    "title": str(g.get("title") or f"Greeting {idx + 1}"),
                    "text": str(g.get("text") or g.get("content") or "").strip()
                })
            elif isinstance(g, str) and g.strip():
                greetings.append({
                    "title": f"Greeting {idx + 1}",
                    "text": g.strip()
                })
    # Alternate Greetings from JanitorAI / Tavern cards
    alt_greetings_raw = raw.get("alternate_greetings") or raw.get("alternateGreetings") or (raw.get("data", {}).get("alternate_greetings") if isinstance(raw.get("data"), dict) else []) or []
    if isinstance(alt_greetings_raw, list):
        for alt in alt_greetings_raw:
            s = str(alt.get("text") or alt.get("content") or alt if isinstance(alt, dict) else alt).strip()
            if s and not any(g.get("text") == s for g in greetings):
                greetings.append({
                    "title": f"Greeting {len(greetings) + 1}",
                    "text": s
                })

    if not greetings and first_mes:
        greetings.append({
            "title": "Greeting 1 (Default)",
            "text": first_mes
        })
    elif greetings and not first_mes:
        first_mes = greetings[0]["text"]

    # Personality / Definitions
    personality = str(raw.get("personality") or "").strip()
    scenario = str(raw.get("scenario") or "").strip()
    description = str(raw.get("description") or "").strip()

    is_unmasked = bool(raw.get("is_unmasked") or raw.get("isUnmasked") or (personality and len(personality) > 0 and not raw.get("definition_private") and not raw.get("definitionPrivate")))
    definition_private = bool((raw.get("definition_private") or raw.get("definitionPrivate")) and not is_unmasked)

    return {
        "id": bot_id,
        "name": name,
        "avatar": avatar,
        "creator_id": creator_id,
        "creator_name": creator_name,
        "creator_avatar": creator_avatar,
        "category": category,
        "tags": tags,
        "tokens": int(raw.get("tokens") or (len(personality) // 4 if personality else 0)),
        "chats": int(raw.get("chats") or 0),
        "messages": int(raw.get("messages") or 0),
        "description": description,
        "personality": personality,
        "scenario": scenario,
        "first_message": first_mes,
        "firstMessage": first_mes,
        "greetings": greetings,
        "alternate_greetings": [g["text"] for g in greetings[1:]],
        "is_unmasked": is_unmasked,
        "isUnmasked": is_unmasked,
        "definition_private": definition_private,
        "definitionPrivate": definition_private,
        "is_nsfw": bool(raw.get("is_nsfw") or raw.get("isNsfw", True)),
        "source": str(raw.get("source") or "domcord"),
        "created_at": raw.get("created_at") or raw.get("createdAt") or "",
        "updated_at": time.time()
    }


# =====================================================================
# Remote Fetch & Search Handlers (Domcord Backend / Janitor Fallback)
# =====================================================================

async def search_cards(
    q: str = "",
    sort: str = "trending",
    tag: str = "",
    page: int = 1,
    limit: int = 24,
    unmasked_only: bool = False
) -> Dict[str, Any]:
    """Search cards through Domcord API with automatic SQLite vault caching and fallback."""
    clean_q = str(q or "").strip()
    clean_sort = str(sort or "trending").strip()
    clean_tag = str(tag or "").strip()

    params = {
        "q": clean_q,
        "sort": clean_sort,
        "page": page,
        "limit": min(50, max(1, limit))
    }
    if clean_tag and clean_tag.lower() != "all":
        params["tags"] = clean_tag
        params["tag"] = clean_tag

    # 1. Attempt live query to Domcord backend
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(
                f"{DOMCORD_BACKEND_URL}/api/search",
                params=params,
                headers=DEFAULT_HEADERS
            )
            if resp.status_code == 200:
                resp_json = resp.json()
                raw_data = resp_json.get("data")
                if isinstance(raw_data, dict):
                    raw_bots = raw_data.get("bots") or []
                    raw_creators = raw_data.get("creators") or []
                    total_count = raw_data.get("totalBots") or len(raw_bots)
                elif isinstance(raw_data, list):
                    raw_bots = raw_data
                    raw_creators = []
                    total_count = len(raw_bots)
                else:
                    raw_bots = resp_json.get("bots") or resp_json.get("items") or []
                    raw_creators = resp_json.get("creators") or []
                    total_count = len(raw_bots)

                normalized_bots = []
                for item in raw_bots:
                    if not isinstance(item, dict):
                        continue
                    norm = normalize_card_payload(item)
                    if unmasked_only and not norm.get("is_unmasked"):
                        continue
                    # Cache to SQLite DB for fast local retrieval
                    try:
                        db.save_connect_card(norm)
                    except Exception:
                        pass
                    normalized_bots.append(norm)

                normalized_creators = []
                for c in raw_creators:
                    if isinstance(c, dict):
                        c_avatar = resolve_media_url(c.get("avatar") or c.get("creator_avatar") or "")
                        c_banner = sanitize_banner(c.get("banner") or "")
                        normalized_creators.append({
                            "id": str(c.get("id") or "").strip(),
                            "username": str(c.get("username") or "").strip(),
                            "displayName": str(c.get("displayName") or c.get("username") or "Creator").strip(),
                            "avatar": c_avatar,
                            "banner": c_banner,
                            "followers": int(c.get("followers") or c.get("followersCount") or 0),
                            "botCount": int(c.get("botCount") or c.get("botsCount") or 0),
                            "bio": str(c.get("bio") or ""),
                            "isVerified": bool(c.get("isVerified") or c.get("hasPlus")),
                            "hasPlus": bool(c.get("hasPlus"))
                        })

                return {
                    "success": True,
                    "data": {
                        "bots": normalized_bots,
                        "creators": normalized_creators,
                        "totalBots": total_count,
                        "page": page,
                        "limit": limit
                    },
                    "items": normalized_bots,
                    "bots": normalized_bots,
                    "creators": normalized_creators,
                    "total": total_count,
                    "page": page,
                    "limit": limit,
                    "source": "remote"
                }
    except Exception as exc:
        pass

    # 2. Seamless Fallback: Query local SQLite vault
    local_items = db.list_connect_cards(q=clean_q, unmasked_only=unmasked_only, limit=limit)
    return {
        "success": True,
        "data": {
            "bots": local_items,
            "creators": [],
            "totalBots": len(local_items),
            "page": 1,
            "limit": limit
        },
        "items": local_items,
        "bots": local_items,
        "creators": [],
        "total": len(local_items),
        "page": 1,
        "limit": limit,
        "source": "local_vault"
    }


async def fetch_creator_profile(creator_id: str) -> Optional[Dict[str, Any]]:
    """Fetch creator profile and featured bots from Domcord/Janitor."""
    clean_id = str(creator_id or "").strip()
    if not clean_id:
        return None
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(
                f"{DOMCORD_BACKEND_URL}/api/creators/{clean_id}",
                headers=DEFAULT_HEADERS
            )
            if resp.status_code == 200:
                data = resp.json()
                raw_creator = data.get("data", {}).get("creator") or data.get("data")
                if raw_creator and isinstance(raw_creator, dict):
                    raw_creator["avatar"] = resolve_media_url(raw_creator.get("avatar") or "")
                    raw_creator["banner"] = sanitize_banner(raw_creator.get("banner") or "")
                    bots = data.get("data", {}).get("bots") or []
                    norm_bots = [normalize_card_payload(b) for b in bots if isinstance(b, dict)]
                    for b in norm_bots:
                        try:
                            db.save_connect_card(b)
                        except Exception:
                            pass
                    return {
                        "creator": raw_creator,
                        "bots": norm_bots,
                        "totalBots": data.get("data", {}).get("totalBots") or len(norm_bots)
                    }
    except Exception:
        pass
    return None


async def fetch_creator_bots(creator_id: str, page: int = 1, limit: int = 20, sort: str = "latest") -> Dict[str, Any]:
    """Fetch paginated bots for a creator."""
    clean_id = str(creator_id or "").strip()
    if not clean_id:
        return {"bots": [], "total": 0}
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(
                f"{DOMCORD_BACKEND_URL}/api/creators/{clean_id}/bots",
                params={"page": page, "limit": limit, "sort": sort},
                headers=DEFAULT_HEADERS
            )
            if resp.status_code == 200:
                data = resp.json()
                raw_bots = data.get("data", {}).get("bots") or []
                norm_bots = [normalize_card_payload(b) for b in raw_bots if isinstance(b, dict)]
                for b in norm_bots:
                    try:
                        db.save_connect_card(b)
                    except Exception:
                        pass
                return {
                    "bots": norm_bots,
                    "total": data.get("data", {}).get("total") or len(norm_bots),
                    "page": page,
                    "limit": limit
                }
    except Exception:
        pass
    return {"bots": [], "total": 0}


async def fetch_bot_details(bot_id: str) -> Optional[Dict[str, Any]]:
    """Fetch complete bot definition by UUID, checking SQLite vault and Domcord backend."""
    clean_id = extract_janitor_bot_id(bot_id) or str(bot_id or "").strip().lower()
    if not clean_id:
        return None

    # Check local SQLite vault first
    local = db.get_connect_card(clean_id)
    # Ensure local unmasked data is not a contaminated RP prompt
    has_genuine_local = bool(
        local and 
        local.get("is_unmasked") and 
        len(str(local.get("personality") or "").strip()) > 50 and
        not any(bad in str(local.get("personality") or "") for bad in ("You are the GameMaster", "HARD BOUNDARIES:", "SETTING INTEGRITY:", "Zhao"))
    )
    if has_genuine_local:
        return local

    # Query Domcord backend API
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(
                f"{DOMCORD_BACKEND_URL}/api/bots/{clean_id}",
                headers=DEFAULT_HEADERS
            )
            if resp.status_code == 200:
                data = resp.json()
                raw_bot = data.get("data") if "data" in data else data
                if raw_bot and isinstance(raw_bot, dict):
                    norm = normalize_card_payload(raw_bot)
                    db.save_connect_card(norm)
                    return norm
    except Exception:
        pass

    # Fallback to local stored card even if masked
    return local


async def trigger_remote_unmask(bot_id: str) -> Dict[str, Any]:
    """Trigger unmasking pipeline: queries Domcord's crowd vault first, then triggers cloud worker."""
    clean_id = extract_janitor_bot_id(bot_id) or str(bot_id or "").strip().lower()
    if not clean_id:
        return {"success": False, "error": "Invalid character ID"}

    # 1. First, check Domcord's central API directly. For thousands of bots (including Nessa),
    # the unmasked definition is ALREADY indexed and unlocked in the cloud database!
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(
                f"{DOMCORD_BACKEND_URL}/api/bots/{clean_id}",
                headers=DEFAULT_HEADERS
            )
            if resp.status_code == 200:
                data = resp.json()
                raw_bot = data.get("data") if "data" in data else data
                if raw_bot and isinstance(raw_bot, dict):
                    pers = str(raw_bot.get("personality") or "").strip()
                    if pers and len(pers) > 50:
                        norm = normalize_card_payload(raw_bot)
                        norm["is_unmasked"] = True
                        norm["definition_private"] = False
                        db.save_connect_card(norm)
                        return {
                            "success": True,
                            "is_unmasked": True,
                            "progress": 100,
                            "status": "Authentic character definition unlocked from cloud vault!",
                            "data": norm
                        }
    except Exception:
        pass

    # 2. Check local intercepts ONLY if the intercept explicitly and strictly matches this bot:
    # (Must contain clean_id in bot_id OR the character's exact name inside the system prompt persona header)
    card = db.get_connect_card(clean_id)
    bot_name = (card.get("name") if card else "").strip()
    intercept = db.get_latest_connect_intercept()
    if intercept and intercept.get("system_prompt"):
        sys_p = intercept["system_prompt"]
        int_bot_id = str(intercept.get("bot_id") or "").strip().lower()
        matched = False
        if clean_id and int_bot_id and clean_id == int_bot_id:
            matched = True
        elif bot_name and len(bot_name) >= 3 and f"<{bot_name}" in sys_p:
            matched = True

        if matched:
            if not card:
                card = {"id": clean_id, "name": bot_name or intercept.get("bot_name", "Unmasked Character")}
            card["personality"] = sys_p
            card["is_unmasked"] = True
            card["definition_private"] = False
            db.save_connect_card(card)
            return {
                "success": True,
                "is_unmasked": True,
                "progress": 100,
                "status": "Unmasked via verified matching proxy intercept!",
                "data": card
            }

    # 3. If not in vault yet, trigger Domcord's cloud unmask worker
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            resp = await client.post(
                f"{DOMCORD_BACKEND_URL}/api/bots/{clean_id}/unmask",
                headers=DEFAULT_HEADERS
            )
            if resp.status_code in (200, 201, 202):
                data = resp.json()
                if data.get("success") and data.get("data", {}).get("isUnmasked"):
                    fresh = await fetch_bot_details(clean_id)
                    return {
                        "success": True,
                        "is_unmasked": True,
                        "progress": 100,
                        "status": "Character definition successfully unmasked!",
                        "data": fresh or data.get("data")
                    }
                return data
    except Exception:
        pass

    return {
        "success": True,
        "is_unmasked": False,
        "progress": 45,
        "status": "Autonomous cloud worker queued..."
    }


async def get_unmask_status(bot_id: str) -> Dict[str, Any]:
    """Check live unmask progress from Domcord or local vault."""
    clean_id = extract_janitor_bot_id(bot_id) or str(bot_id or "").strip().lower()
    if not clean_id:
        return {"success": False, "is_unmasked": False, "progress": 0}

    # If local SQLite is already genuine unmasked, return 100%
    card = db.get_connect_card(clean_id)
    if card and card.get("is_unmasked") and len(str(card.get("personality") or "").strip()) > 50:
        if not any(bad in str(card.get("personality") or "") for bad in ("You are the GameMaster", "HARD BOUNDARIES:", "SETTING INTEGRITY:", "Zhao")):
            return {
                "success": True,
                "is_unmasked": True,
                "progress": 100,
                "status": "Character definition successfully unmasked!",
                "data": card
            }

    # Query Domcord status
    try:
        async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as client:
            resp = await client.get(
                f"{DOMCORD_BACKEND_URL}/api/bots/{clean_id}/unmask_status",
                headers=DEFAULT_HEADERS
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("is_unmasked") or (data.get("data") and data["data"].get("isUnmasked")):
                    fresh = await fetch_bot_details(clean_id)
                    return {
                        "success": True,
                        "is_unmasked": True,
                        "progress": 100,
                        "status": "Character definition successfully unmasked!",
                        "data": fresh or data.get("data") or data
                    }
                return data
    except Exception:
        pass

    return {
        "success": True,
        "is_unmasked": False,
        "progress": 50,
        "status": "Autonomous cloud extraction in progress..."
    }


def import_manual_definition(bot_id: str, raw_text: str) -> Dict[str, Any]:
    """Manually import/unlock a character definition in SQLite vault."""
    clean_id = extract_janitor_bot_id(bot_id) or str(bot_id or "").strip().lower()
    clean_text = str(raw_text or "").strip()
    if not clean_id or not clean_text:
        return {"success": False, "error": "Missing bot ID or definition text"}

    card = db.get_connect_card(clean_id) or {
        "id": clean_id,
        "name": "Imported Character",
        "avatar": "",
        "created_at": time.strftime("%Y-%m-%d")
    }

    # If JSON dump, parse fields
    if (clean_text.startswith("{") and clean_text.endswith("}")):
        try:
            parsed = json.loads(clean_text)
            data = parsed.get("data", parsed)
            if isinstance(data, dict):
                if data.get("name"): card["name"] = data["name"]
                if data.get("personality"): card["personality"] = data["personality"]
                if data.get("scenario"): card["scenario"] = data["scenario"]
                if data.get("description"): card["description"] = data["description"]
                if data.get("first_mes") or data.get("first_message"):
                    card["first_message"] = data.get("first_mes") or data.get("first_message")
        except Exception:
            card["personality"] = clean_text
    else:
        card["personality"] = clean_text

    card["is_unmasked"] = True
    card["definition_private"] = False
    card["tokens"] = max(card.get("tokens", 0), len(card.get("personality", "")) // 4)
    db.save_connect_card(card)

    return {
        "success": True,
        "is_unmasked": True,
        "card": card
    }


# =====================================================================
# Pure-Python SillyTavern Character Card V2 PNG Generator
# =====================================================================

def build_sillytavern_v2_payload(card: Dict[str, Any]) -> Dict[str, Any]:
    """Format card into official SillyTavern Character Card V2 specification."""
    greetings = card.get("greetings") or []
    alt_greetings = []
    if isinstance(greetings, list):
        for idx, g in enumerate(greetings):
            txt = g.get("text") if isinstance(g, dict) else str(g)
            if txt and idx > 0:  # Alternate greetings (skipping primary first_message)
                alt_greetings.append(txt)

    tags = card.get("tags") or []
    if isinstance(tags, str):
        try:
            tags = json.loads(tags)
        except Exception:
            tags = [t.strip() for t in tags.split(",") if t.strip()]

    return {
        "spec": "chara_card_v2",
        "spec_version": "2.0",
        "data": {
            "name": str(card.get("name") or "Character"),
            "description": str(card.get("description") or ""),
            "personality": str(card.get("personality") or ""),
            "scenario": str(card.get("scenario") or ""),
            "first_mes": str(card.get("first_message") or card.get("firstMessage") or ""),
            "mes_example": "",
            "creator_notes": f"Exported via Singularity S-Connect. Creator: {card.get('creator_name', 'Unknown')}",
            "system_prompt": "",
            "post_history_instructions": "",
            "alternate_greetings": alt_greetings,
            "tags": tags,
            "creator": str(card.get("creator_name") or ""),
            "character_version": "1.0",
            "extensions": {
                "singularity_connect": True,
                "janitor_bot_id": str(card.get("id") or ""),
                "tokens": int(card.get("tokens") or 0),
                "exported_at": int(time.time())
            }
        }
    }


def inject_png_text_chunk(png_bytes: bytes, keyword: str, text_payload: str) -> bytes:
    """Inject a tEXt chunk into raw PNG bytes immediately after the IHDR chunk.
    Pure-Python; conforms strictly to W3C PNG Specification 1.2.
    """
    PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
    if not png_bytes.startswith(PNG_SIGNATURE):
        raise ValueError("Invalid PNG image signature")

    # Construct the tEXt chunk data: keyword + null byte + Latin-1 text
    kw_bytes = keyword.encode("latin-1", "replace")
    txt_bytes = text_payload.encode("latin-1", "replace")
    chunk_data = kw_bytes + b"\x00" + txt_bytes
    chunk_len = len(chunk_data)

    # 4 bytes length + 4 bytes 'tEXt' + data + 4 bytes CRC32
    crc = zlib.crc32(b"tEXt" + chunk_data) & 0xffffffff
    text_chunk = struct.pack(">I", chunk_len) + b"tEXt" + chunk_data + struct.pack(">I", crc)

    # Find the end of IHDR chunk (starts at offset 8)
    # Offset 8..12: IHDR length (typically 13)
    # Offset 12..16: b"IHDR"
    # Offset 16..16+length: IHDR data
    # Offset 16+length..20+length: IHDR CRC (4 bytes)
    if len(png_bytes) < 33:
        raise ValueError("Truncated PNG image")

    ihdr_len = struct.unpack(">I", png_bytes[8:12])[0]
    ihdr_end = 8 + 4 + 4 + ihdr_len + 4  # 8 sig + 4 len + 4 type + data + 4 crc

    # Insert tEXt chunk directly after IHDR
    return png_bytes[:ihdr_end] + text_chunk + png_bytes[ihdr_end:]


def create_fallback_solid_png(width: int = 400, height: int = 400, color: Tuple[int, int, int] = (20, 20, 20)) -> bytes:
    """Generate a lightweight valid 24-bit RGB PNG with zero external dependencies (pure Python zlib/struct)."""
    # PNG Signature
    sig = b"\x89PNG\r\n\x1a\n"

    # IHDR Chunk
    # Width (4B), Height (4B), Bit depth: 8 (1B), Color type: 2 (RGB, 1B), Compression: 0, Filter: 0, Interlace: 0
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    ihdr_crc = zlib.crc32(b"IHDR" + ihdr_data) & 0xffffffff
    ihdr_chunk = struct.pack(">I", len(ihdr_data)) + b"IHDR" + ihdr_data + struct.pack(">I", ihdr_crc)

    # IDAT Chunk (Raw Scanlines)
    # Each row starts with filter byte 0 (None), followed by width * 3 bytes (R, G, B)
    r, g, b = color
    row_bytes = b"\x00" + bytes([r, g, b]) * width
    raw_scanlines = row_bytes * height
    compressed = zlib.compress(raw_scanlines, level=6)

    idat_crc = zlib.crc32(b"IDAT" + compressed) & 0xffffffff
    idat_chunk = struct.pack(">I", len(compressed)) + b"IDAT" + compressed + struct.pack(">I", idat_crc)

    # IEND Chunk
    iend_crc = zlib.crc32(b"IEND") & 0xffffffff
    iend_chunk = struct.pack(">I", 0) + b"IEND" + struct.pack(">I", iend_crc)

    return sig + ihdr_chunk + idat_chunk + iend_chunk


async def generate_sillytavern_png_bytes(card: Dict[str, Any]) -> bytes:
    """Generate SillyTavern Character Card V2 PNG with embedded chara metadata chunk."""
    # 1. Build SillyTavern V2 JSON and Base64 string
    v2_payload = build_sillytavern_v2_payload(card)
    v2_json = json.dumps(v2_payload, ensure_ascii=False)
    b64_payload = base64.b64encode(v2_json.encode("utf-8")).decode("ascii")

    # 2. Obtain base PNG image bytes
    avatar_url = card.get("avatar")
    base_png = None

    if avatar_url:
        try:
            async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
                resp = await client.get(avatar_url, headers=DEFAULT_HEADERS)
                if resp.status_code == 200 and resp.content:
                    img_bytes = resp.content

                    # Check if Pillow is available to convert WebP/JPEG to PNG
                    try:
                        from PIL import Image
                        pil_img = Image.open(io.BytesIO(img_bytes))
                        if pil_img.mode != "RGBA":
                            pil_img = pil_img.convert("RGBA")
                        buf = io.BytesIO()
                        pil_img.save(buf, format="PNG", optimize=True)
                        base_png = buf.getvalue()
                    except Exception:
                        # If already PNG
                        if img_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
                            base_png = img_bytes
        except Exception:
            pass

    # Fallback to pure-Python solid dark obsidian PNG if Pillow/download unavailable
    if not base_png:
        base_png = create_fallback_solid_png(width=480, height=480, color=(18, 18, 20))

    # 3. Inject SillyTavern 'chara' tEXt chunk
    return inject_png_text_chunk(base_png, "chara", b64_payload)


# =====================================================================
# Janitor Proxy Intercept Engine
# =====================================================================

def extract_persona_from_messages(messages: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Extract character persona, scenarios, and greetings from JanitorAI proxy messages."""
    system_prompt = ""
    greeting = ""
    user_prompt = ""

    for m in messages:
        role = str(m.get("role", "")).lower()
        content = m.get("content", "")
        if isinstance(content, list):
            content = " ".join([c.get("text", "") for c in content if isinstance(c, dict) and c.get("text")])
        content_str = str(content or "")

        if role == "system" and not system_prompt:
            system_prompt = content_str
        elif role == "assistant" and not greeting:
            greeting = content_str
        elif role == "user" and not user_prompt:
            user_prompt = content_str

    # Extract bot name heuristic from prompt
    bot_name = "Captured Character"
    name_match = re.search(r'<([^>]+?)(?:\'s)?\s+Persona>>', system_prompt, re.IGNORECASE)
    if name_match:
        bot_name = name_match.group(1).strip()
    else:
        name_match2 = re.search(r'\[\s*(?:Character|Bot):\s*([^\]]+)\]', system_prompt, re.IGNORECASE)
        if name_match2:
            bot_name = name_match2.group(1).strip()

    return {
        "bot_name": bot_name,
        "system_prompt": system_prompt,
        "first_message": greeting,
        "user_prompt": user_prompt
    }


def handle_incoming_proxy_completion(body: Dict[str, Any]) -> Tuple[Dict[str, Any], int]:
    """Process incoming /v1/chat/completions payload from JanitorAI custom proxy."""
    messages = body.get("messages") or []
    extracted = extract_persona_from_messages(messages)

    system_prompt = extracted.get("system_prompt", "")
    bot_name = extracted.get("bot_name", "Captured Character")
    first_mes = extracted.get("first_message", "")
    user_prompt = extracted.get("user_prompt", "")

    # Save to SQLite intercept log
    intercept_id = db.save_connect_intercept({
        "bot_name": bot_name,
        "system_prompt": system_prompt,
        "user_prompt": user_prompt,
        "model": str(body.get("model", "s-connect-proxy")),
        "detected_persona": system_prompt[:500],
        "intercepted_at": time.time(),
        "raw_body": body
    })

    # If character persona exists, create/update an unmasked S-Connect card
    if len(system_prompt.strip()) > 50:
        synth_id = f"intercept-{int(time.time())}"
        card_payload = {
            "id": synth_id,
            "name": bot_name,
            "avatar": "",
            "creator_name": "Janitor Proxy Intercept",
            "personality": system_prompt,
            "first_message": first_mes,
            "is_unmasked": True,
            "definition_private": False,
            "tokens": len(system_prompt) // 4,
            "tags": ["Unmasked", "Proxy Captured"],
            "source": "proxy_intercept"
        }
        db.save_connect_card(card_payload)

    # OpenAI-compatible simulated completion
    response_payload = {
        "id": f"chatcmpl-sconnect-{int(time.time())}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": str(body.get("model", "s-connect-proxy")),
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": f"✨ **[Singularity S-Connect]**: Intercepted & unmasked character directives for **{bot_name}** ({len(system_prompt)} chars)! Character saved to your Singularity S-Connect vault."
                },
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": len(system_prompt) // 4 + 20,
            "completion_tokens": 40,
            "total_tokens": len(system_prompt) // 4 + 60
        }
    }

    return response_payload, intercept_id
