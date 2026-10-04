#!/usr/bin/env python3
"""
Default Presets Catalog
=======================
Curated community roleplay and UI presentation presets bundled by default with Singularity.

Includes:
  Core Roleplay Presets:
    - elise-ap: Elise's Advanced Prompts (APS) from JanitorAI community
    - stabs-edh: Stab's Execution Directive Hierarchy from SillyTavern community
    - kingbri-rp: KingBri Minimalistic Roleplay Guide
    - community-rp: Universal Community Roleplay Benchmark

  Community UI Presets:
    - vn-dialogue: Visual Novel dialogue bubbles, speaker nameplates, soft thought clouds
    - rpg-status-hud: RPG glassmorphism stat card HUD, health/mana pills, location headers
    - phone-chat-ui: Modern smartphone SMS/messenger chat bubbles (received & sent)
    - cyberpunk-hud: Sci-Fi holographic terminal logs, hazard alerts, neon accents
"""

from typing import Any, Dict, List

DEFAULT_PRESETS: List[Dict[str, Any]] = [
    # -------------------------------------------------------------------------
    # 1. Elise's Advanced Prompts (APS)
    # -------------------------------------------------------------------------
    {
        "name": "elise-ap",
        "description": "Elise's Advanced Prompts (APS) - The gold standard JanitorAI roleplay framework for lifelike character depth, natural dialogue flow, and zero puppeteering.",
        "char_name": "{{char}}",
        "user_name": "{{user}}",
        "placement": "merge",
        "separator": "\n\n",
        "blocks": [
            {
                "id": "b_elise_main",
                "name": "Elise's APS System Directive",
                "enabled": True,
                "role": "system",
                "position": "before",
                "depth": 0,
                "order": 100,
                "slot": "",
                "content": (
                    "[Roleplay Guidelines: Elise's Advanced Prompt System (APS)\n"
                    "- Perspective: Maintain strict third-person narration focused exclusively on {{char}} and their immediate environment.\n"
                    "- Anti-Puppeteering Mandate: Under NO circumstance depict, decide, verbalize, or narrate thoughts, emotions, speech, or actions for {{user}}. Allow {{user}} complete autonomy to react and decide their own course.\n"
                    "- Psychological Realism: Ground {{char}}'s reactions in their backstory, flaws, and current emotional state. Portray hesitation, mixed feelings, subtext, and reluctance where appropriate rather than instant compliance or synthetic affection.\n"
                    "- Speech & Dialogue: Craft dialogue with natural cadences, authentic pauses, and colloquial vocabulary suitable to {{char}}'s personality. Strictly avoid artificial clichés (e.g. 'a shiver down the spine', 'smirk widened', 'can't help but feel', 'predatory gaze').\n"
                    "- Sensory & Environment: Integrate organic environmental interactions—ambient sounds, lighting shifts, physical objects, posture changes, eye contact breaks—without drowning the action in purple prose.\n"
                    "- Pacing & Floor Giving: Each turn must advance the scene with meaningful narrative momentum, concluding at a natural conversational or situational pause that invites {{user}}'s response.]"
                ),
            }
        ],
        "regex_scripts": [],
        "lorebooks": [],
        "tools": [],
        "tool_max_steps": 3,
        "tool_guidance": "",
        "tool_guidance_on": True,
    },

    # -------------------------------------------------------------------------
    # 2. Stab's Execution Directive Hierarchy (Stabs-EDH)
    # -------------------------------------------------------------------------
    {
        "name": "stabs-edh",
        "description": "Stab's Execution Directive Hierarchy (EDH) - SillyTavern narrative coherence, scene progression, and anti-looping logic.",
        "char_name": "{{char}}",
        "user_name": "{{user}}",
        "placement": "merge",
        "separator": "\n\n",
        "blocks": [
            {
                "id": "b_stabs_main",
                "name": "Stabs EDH Hierarchy",
                "enabled": True,
                "role": "system",
                "position": "before",
                "depth": 0,
                "order": 100,
                "slot": "",
                "content": (
                    "[Execution Directive Hierarchy (EDH):\n"
                    "1. Spatial & Environmental Context: Anchor {{char}} in the physical setting. Note sensory triggers, proximity to {{user}}, and active environmental elements.\n"
                    "2. Character Agency: Execute actions solely through the psychological lens and motivations of {{char}}. Never predict, emulate, or overwrite {{user}}'s reactions.\n"
                    "3. Narrative Progression: Reject conversational stalemates and circular dialogue loops. Each message must alter the situation, provide new stakes, or shift the emotional dynamic.\n"
                    "4. Action Realism: Physical movements take realistic time and have consequences. Reactions must be earned organically through interaction.]"
                ),
            }
        ],
        "regex_scripts": [],
        "lorebooks": [],
        "tools": [],
        "tool_max_steps": 3,
        "tool_guidance": "",
        "tool_guidance_on": True,
    },

    # -------------------------------------------------------------------------
    # 3. KingBri Minimalistic Roleplay
    # -------------------------------------------------------------------------
    {
        "name": "kingbri-rp",
        "description": "KingBri Minimalistic Roleplay - Clean, high-signal instructions that keep modern LLMs focused without instruction conflict or token bloat.",
        "char_name": "{{char}}",
        "user_name": "{{user}}",
        "placement": "merge",
        "separator": "\n\n",
        "blocks": [
            {
                "id": "b_kingbri_main",
                "name": "KingBri Minimal Directives",
                "enabled": True,
                "role": "system",
                "position": "before",
                "depth": 0,
                "order": 100,
                "slot": "",
                "content": (
                    "[System: Roleplay strictly as {{char}}.\n"
                    "- Never write dialogue, thoughts, or actions for {{user}}.\n"
                    "- Keep tone grounded, dynamic, and authentic to {{char}}'s personality.\n"
                    "- Advance the narrative naturally with sensory depth.\n"
                    "- Conclude responses with an opening for {{user}} to act.]"
                ),
            }
        ],
        "regex_scripts": [],
        "lorebooks": [],
        "tools": [],
        "tool_max_steps": 3,
        "tool_guidance": "",
        "tool_guidance_on": True,
    },

    # -------------------------------------------------------------------------
    # 4. Universal Community Roleplay Benchmark
    # -------------------------------------------------------------------------
    {
        "name": "community-rp",
        "description": "Universal Community Roleplay Benchmark - Battle-tested standard prompt for zero user puppeteering, dynamic dialogue, and atmospheric depth.",
        "char_name": "{{char}}",
        "user_name": "{{user}}",
        "placement": "merge",
        "separator": "\n\n",
        "blocks": [
            {
                "id": "b_community_main",
                "name": "Universal RP Directives",
                "enabled": True,
                "role": "system",
                "position": "before",
                "depth": 0,
                "order": 100,
                "slot": "",
                "content": (
                    "[System directive: Maintain strict third-person narration for {{char}} and world environment.\n"
                    "- Under NO circumstance speak, think, emote, or decide actions on behalf of {{user}}. Narration belongs exclusively to {{char}}.\n"
                    "- Portray {{char}} with psychological realism, distinct colloquial voice, and moral consistency. Avoid generic purple prose or instant compliance.\n"
                    "- Advance the scene organically through sensory details, environment interaction, and realistic dialogue pauses.\n"
                    "- End responses at a natural pause or action that leaves the floor open for {{user}} to react.]"
                ),
            }
        ],
        "regex_scripts": [],
        "lorebooks": [],
        "tools": [],
        "tool_max_steps": 3,
        "tool_guidance": "",
        "tool_guidance_on": True,
    },

    # -------------------------------------------------------------------------
    # 5. Visual Novel UI Preset (vn-dialogue)
    # -------------------------------------------------------------------------
    {
        "name": "vn-dialogue",
        "description": "Visual Novel UI Preset - Glowing speech bubbles, character speaker nameplates, soft violet thought clouds, and scene transition dividers.",
        "char_name": "{{char}}",
        "user_name": "{{user}}",
        "placement": "merge",
        "separator": "\n\n",
        "blocks": [
            {
                "id": "b_vn_rules",
                "name": "Visual Novel Narrative Directives",
                "enabled": True,
                "role": "system",
                "position": "before",
                "depth": 0,
                "order": 100,
                "slot": "",
                "content": (
                    "[Style directive: Format narration in clean visual novel pacing.\n"
                    "- Put spoken dialogue in standard quotes (e.g. \"Hello.\").\n"
                    "- Put internal thoughts or unspoken feelings in asterisks (e.g. *What is this...?*).\n"
                    "- Maintain third-person perspective and never narrate actions for {{user}}.]"
                ),
            }
        ],
        "regex_scripts": [
            {
                "id": "r_vn_nameplate",
                "name": "Speaker Nameplate Badge",
                "find": r"/(?:^|\n)([A-Z][a-zA-Z0-9_ ]{1,25}):(?=\s)/g",
                "replace": r'\n<div class="st-speaker-tag" style="display:inline-flex;align-items:center;padding:2px 10px;margin:6px 0 2px 0;background:linear-gradient(135deg,rgba(244,63,94,0.2),rgba(251,113,133,0.25));border:1px solid rgba(244,63,94,0.5);border-radius:12px;color:#f43f5e;font-size:0.8rem;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">$1</div>\n',
                "placement": [2],
                "disabled": False,
                "markdown_only": True,
                "prompt_only": False,
                "run_on_edit": False,
                "substitute": 0,
            },
            {
                "id": "r_vn_quote",
                "name": "Dialogue Speech Box",
                "find": r'/(^|[\s\n>])"([^"<>\n]{2,})"/g',
                "replace": r'$1<span class="st-dialogue-quote" style="display:inline;background:rgba(244,63,94,0.06);border-left:3px solid #f43f5e;padding:2px 8px;margin:2px 0;border-radius:3px;color:#ffffff;box-shadow:0 1px 4px rgba(244,63,94,0.15);">&ldquo;$2&rdquo;</span>',
                "placement": [2],
                "disabled": False,
                "markdown_only": True,
                "prompt_only": False,
                "run_on_edit": False,
                "substitute": 0,
            },
            {
                "id": "r_vn_curly_quote",
                "name": "Dialogue Curly Quotes",
                "find": r'/(^|[\s\n>])“([^”<>\n]{2,})”/g',
                "replace": r'$1<span class="st-dialogue-quote" style="display:inline;background:rgba(244,63,94,0.06);border-left:3px solid #f43f5e;padding:2px 8px;margin:2px 0;border-radius:3px;color:#ffffff;box-shadow:0 1px 4px rgba(244,63,94,0.15);">&ldquo;$2&rdquo;</span>',
                "placement": [2],
                "disabled": False,
                "markdown_only": True,
                "prompt_only": False,
                "run_on_edit": False,
                "substitute": 0,
            },
            {
                "id": "r_vn_thoughts",
                "name": "Internal Monologue Cloud",
                "find": r'/(^|[\s\n>])\*([^*\n<>]{2,})\*/g',
                "replace": r'$1<span class="st-thought-bubble" style="display:inline;color:#c4b5fd;font-style:italic;background:rgba(196,181,253,0.08);padding:1px 6px;border-radius:4px;border:1px dashed rgba(196,181,253,0.3);">&sim; $2 &sim;</span>',
                "placement": [2],
                "disabled": False,
                "markdown_only": True,
                "prompt_only": False,
                "run_on_edit": False,
                "substitute": 0,
            },
            {
                "id": "r_vn_divider",
                "name": "Scene Transition Divider",
                "find": r"/(?:^|\n)\s*(?:\*\*\*|---|___)\s*(?:\n|$)/g",
                "replace": r'\n<div class="st-scene-divider" style="display:flex;align-items:center;justify-content:center;margin:16px 0;opacity:0.85;"><div style="flex:1;height:1px;background:linear-gradient(to right,transparent,rgba(244,63,94,0.6));"></div><div style="margin:0 10px;color:#f43f5e;font-size:0.8rem;">✦ ✧ ✦</div><div style="flex:1;height:1px;background:linear-gradient(to left,transparent,rgba(244,63,94,0.6));"></div></div>\n',
                "placement": [2],
                "disabled": False,
                "markdown_only": True,
                "prompt_only": False,
                "run_on_edit": False,
                "substitute": 0,
            },
        ],
        "lorebooks": [],
        "tools": [],
        "tool_max_steps": 3,
        "tool_guidance": "",
        "tool_guidance_on": True,
    },

    # -------------------------------------------------------------------------
    # 6. RPG Game HUD & Stat Cards (rpg-status-hud)
    # -------------------------------------------------------------------------
    {
        "name": "rpg-status-hud",
        "description": "RPG Game HUD Preset - Formats [Status: ...], [Stats: ...], and [Location: ...] into sleek glassmorphism gaming HUD cards and stat pills.",
        "char_name": "{{char}}",
        "user_name": "{{user}}",
        "placement": "merge",
        "separator": "\n\n",
        "blocks": [
            {
                "id": "b_rpg_rules",
                "name": "RPG Status Directives",
                "enabled": True,
                "role": "system",
                "position": "before",
                "depth": 0,
                "order": 100,
                "slot": "",
                "content": (
                    "[RPG Game Interface Rules:\n"
                    "- When entering a new setting or when game status shifts, you may include an atmospheric header in square brackets: [Location: Setting Name | Time: Time of Day].\n"
                    "- If tracking character conditions or RPG stats, append a status card at the end of responses: [Status: HP: X/X | MP: Y/Y | State: Condition].\n"
                    "- Never decide actions or speech for {{user}}.]"
                ),
            }
        ],
        "regex_scripts": [
            {
                "id": "r_rpg_hud",
                "name": "RPG Status HUD Card",
                "find": r"/\[(?:Status|Stats|State):\s*([^\]]+)\]/gi",
                "replace": r'<div class="st-rpg-hud" style="background:rgba(15,23,42,0.85);border:1px solid rgba(56,189,248,0.4);border-radius:12px;padding:12px 16px;margin:10px 0;box-shadow:0 8px 24px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.1);backdrop-filter:blur(10px);"><div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;color:#38bdf8;font-weight:800;">🛡️ RPG STATUS HUD</div><div style="font-family:monospace;font-size:0.85rem;color:#f1f5f9;line-height:1.6;">$1</div></div>',
                "placement": [2],
                "disabled": False,
                "markdown_only": True,
                "prompt_only": False,
                "run_on_edit": False,
                "substitute": 0,
            },
            {
                "id": "r_rpg_location",
                "name": "RPG Location & Time Banner",
                "find": r"/\[(?:Location|Scene|Time):\s*([^\]]+)\]/gi",
                "replace": r'<div class="st-location-hud" style="display:inline-flex;align-items:center;gap:8px;background:rgba(30,41,59,0.7);border-left:3px solid #38bdf8;padding:6px 14px;border-radius:4px 12px 12px 4px;margin:8px 0;font-size:0.8rem;color:#94a3b8;font-family:monospace;"><span style="color:#38bdf8;font-weight:700;">📍 SCENE</span> <span>$1</span></div>',
                "placement": [2],
                "disabled": False,
                "markdown_only": True,
                "prompt_only": False,
                "run_on_edit": False,
                "substitute": 0,
            },
            {
                "id": "r_rpg_pills",
                "name": "HP / MP Stat Pills",
                "find": r"/\[(HP|MP|EXP|STAMINA):\s*([^\]]+)\]/gi",
                "replace": r'<span class="st-stat-pill" style="display:inline-flex;align-items:center;gap:4px;background:rgba(2,132,199,0.2);border:1px solid rgba(2,132,199,0.4);padding:2px 8px;border-radius:12px;font-family:monospace;font-size:0.75rem;color:#38bdf8;font-weight:700;margin:2px 4px;">$1: $2</span>',
                "placement": [2],
                "disabled": False,
                "markdown_only": True,
                "prompt_only": False,
                "run_on_edit": False,
                "substitute": 0,
            },
        ],
        "lorebooks": [],
        "tools": [],
        "tool_max_steps": 3,
        "tool_guidance": "",
        "tool_guidance_on": True,
    },

    # -------------------------------------------------------------------------
    # 7. Modern Smartphone / Messenger UI (phone-chat-ui)
    # -------------------------------------------------------------------------
    {
        "name": "phone-chat-ui",
        "description": "Phone & Messenger Chat UI - Transforms [Text from Char: ...] and [Text to Char: ...] into authentic iOS/Discord smartphone chat bubbles.",
        "char_name": "{{char}}",
        "user_name": "{{user}}",
        "placement": "merge",
        "separator": "\n\n",
        "blocks": [
            {
                "id": "b_phone_rules",
                "name": "Smartphone Texting Rules",
                "enabled": True,
                "role": "system",
                "position": "before",
                "depth": 0,
                "order": 100,
                "slot": "",
                "content": (
                    "[Modern Messaging Format:\n"
                    "- When {{char}} sends a text or phone message, format it as: [Text from {{char}}: message content]\n"
                    "- When narrating an incoming text to {{char}}, format it as: [Text to {{char}}: message content]\n"
                    "- When system alerts or push notifications occur, format them as: [Notification: notification text]\n"
                    "- Regular face-to-face dialogue and narrative remain in standard markdown.]"
                ),
            }
        ],
        "regex_scripts": [
            {
                "id": "r_sms_received",
                "name": "Incoming Text Bubble",
                "find": r"/\[(?:Text|SMS|Message)\s+from\s+([^:\]]+):\s*([^\]]+)\]/gi",
                "replace": r'<div class="st-sms-wrap received" style="display:flex;flex-direction:column;align-items:flex-start;margin:8px 0;"><span style="font-size:0.7rem;color:#94a3b8;margin-left:10px;margin-bottom:3px;font-weight:600;">$1</span><div style="background:#27272a;color:#f4f4f5;padding:8px 14px;border-radius:16px 16px 16px 4px;max-width:80%;font-size:0.9rem;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.08);line-height:1.4;">$2</div></div>',
                "placement": [1, 2],
                "disabled": False,
                "markdown_only": True,
                "prompt_only": False,
                "run_on_edit": False,
                "substitute": 0,
            },
            {
                "id": "r_sms_sent",
                "name": "Outgoing Text Bubble",
                "find": r"/\[(?:Text|SMS|Message)\s+to\s+([^:\]]+):\s*([^\]]+)\]/gi",
                "replace": r'<div class="st-sms-wrap sent" style="display:flex;flex-direction:column;align-items:flex-end;margin:8px 0;"><span style="font-size:0.7rem;color:#94a3b8;margin-right:10px;margin-bottom:3px;font-weight:600;">To $1</span><div style="background:linear-gradient(135deg,#0284c7,#0369a1);color:#ffffff;padding:8px 14px;border-radius:16px 16px 4px 16px;max-width:80%;font-size:0.9rem;box-shadow:0 2px 6px rgba(2,132,199,0.3);line-height:1.4;">$2</div></div>',
                "placement": [1, 2],
                "disabled": False,
                "markdown_only": True,
                "prompt_only": False,
                "run_on_edit": False,
                "substitute": 0,
            },
            {
                "id": "r_sms_notification",
                "name": "Push Notification Pill",
                "find": r"/\[(?:Notification|Alert):\s*([^\]]+)\]/gi",
                "replace": r'<div class="st-sms-alert" style="display:flex;align-items:center;justify-content:center;gap:6px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:4px 12px;margin:8px auto;max-width:65%;font-size:0.75rem;color:#a1a1aa;text-align:center;">🔔 $1</div>',
                "placement": [1, 2],
                "disabled": False,
                "markdown_only": True,
                "prompt_only": False,
                "run_on_edit": False,
                "substitute": 0,
            },
        ],
        "lorebooks": [],
        "tools": [],
        "tool_max_steps": 3,
        "tool_guidance": "",
        "tool_guidance_on": True,
    },

    # -------------------------------------------------------------------------
    # 8. Cyberpunk Holographic Terminal (cyberpunk-hud)
    # -------------------------------------------------------------------------
    {
        "name": "cyberpunk-hud",
        "description": "Cyberpunk Holographic Terminal - Glowing neon cyan system logs, hazard anomaly alerts, and high-tech terminal accents.",
        "char_name": "{{char}}",
        "user_name": "{{user}}",
        "placement": "merge",
        "separator": "\n\n",
        "blocks": [
            {
                "id": "b_cyber_rules",
                "name": "Cyberpunk World Directives",
                "enabled": True,
                "role": "system",
                "position": "before",
                "depth": 0,
                "order": 100,
                "slot": "",
                "content": (
                    "[Cyberpunk Interface Directives:\n"
                    "- System broadcasts, HUD telemetry, and network communications may be emitted as: [SYSTEM: message] or [TERMINAL: log text].\n"
                    "- Security anomalies and hazardous alerts can be emitted as: [ALERT: threat details] or [WARNING: caution note].\n"
                    "- Dialogue remains in standard quotes and third-person narration applies strictly.]"
                ),
            }
        ],
        "regex_scripts": [
            {
                "id": "r_cyber_system",
                "name": "Holographic System Broadcast",
                "find": r"/\[(?:SYSTEM|NET|AI|TERMINAL):\s*([^\]]+)\]/gi",
                "replace": r'<div class="st-cyber-terminal" style="background:#090d16;border:1px solid #00f0ff;border-radius:4px;padding:8px 12px;margin:8px 0;box-shadow:0 0 12px rgba(0,240,255,0.25);font-family:monospace;font-size:0.8rem;color:#00f0ff;"><div style="font-size:0.65rem;letter-spacing:1.5px;color:#38bdf8;font-weight:800;margin-bottom:4px;">▶ NEURAL NET BROADCAST</div><div>$1</div></div>',
                "placement": [2],
                "disabled": False,
                "markdown_only": True,
                "prompt_only": False,
                "run_on_edit": False,
                "substitute": 0,
            },
            {
                "id": "r_cyber_warning",
                "name": "Hazard / Anomaly Alert",
                "find": r"/\[(?:WARNING|ALERT|HAZARD):\s*([^\]]+)\]/gi",
                "replace": r'<div class="st-cyber-warning" style="background:#180a0a;border:1px solid #ff0055;border-radius:4px;padding:8px 12px;margin:8px 0;box-shadow:0 0 12px rgba(255,0,85,0.25);font-family:monospace;font-size:0.8rem;color:#ff5577;"><div style="font-size:0.65rem;letter-spacing:1.5px;color:#ff0055;font-weight:800;margin-bottom:4px;">⚠ SYSTEM ANOMALY / HAZARD</div><div>$1</div></div>',
                "placement": [2],
                "disabled": False,
                "markdown_only": True,
                "prompt_only": False,
                "run_on_edit": False,
                "substitute": 0,
            },
            {
                "id": "r_cyber_quote",
                "name": "Neon Cyan Dialogue Accent",
                "find": r'/(^|[\s\n>])"([^"<>\n]{2,})"/g',
                "replace": r'$1<span class="st-cyber-quote" style="color:#e0f2fe;border-bottom:1px solid #00f0ff;padding:1px 4px;background:rgba(0,240,255,0.06);">&ldquo;$2&rdquo;</span>',
                "placement": [2],
                "disabled": False,
                "markdown_only": True,
                "prompt_only": False,
                "run_on_edit": False,
                "substitute": 0,
            },
        ],
        "lorebooks": [],
        "tools": [],
        "tool_max_steps": 3,
        "tool_guidance": "",
        "tool_guidance_on": True,
    },
]


def get_default_presets() -> List[Dict[str, Any]]:
    """Return all default presets."""
    return list(DEFAULT_PRESETS)
