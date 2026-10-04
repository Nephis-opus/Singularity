#!/usr/bin/env python3
"""
Singularity Presets
===================
A preset is a named bundle of prompt blocks that the gateway applies to a request before it
reaches an engine. A client picks one by adding `@name` to the model: `kimi-k3@noir`.

  schema.py     what a preset looks like and how one is checked (pure; the database code lives in db.py)
  stage.py      the prompt stage: messages in, messages out (pure)
  macros.py     the {{...}} macros a block can use (variables, dice, names)
  lorebook.py   lorebooks: entries, SillyTavern World Info import, activation (pure)
  regex_scripts.py  find-and-replace scripts: storage rules, the prompt-side pass, what the userscript gets
  jsre.py       JavaScript regexes translated for Python (refuses what it cannot run faithfully)
  st_import.py  SillyTavern chat-completion preset -> preset + report (pure)

Nothing here touches the network or the database, so every rule can be tested alone.
"""

from .schema import PresetError, clean_preset, split_model_ref  # noqa: F401
from .stage import apply  # noqa: F401
from .regex_scripts import apply_prompt as apply_regex, display_payload  # noqa: F401
from .lorebook import LoreError, activate as activate_lore  # noqa: F401
from .st_import import convert as convert_st, preset_name_from  # noqa: F401
