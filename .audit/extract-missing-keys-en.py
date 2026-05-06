#!/usr/bin/env python3
"""Print EN values for every missing key so I can translate them."""
import json
from pathlib import Path

BASE = Path(r"C:\Users\lmao\TAROT\src\i18n\locales")


def flatten(d, prefix=""):
    if isinstance(d, dict):
        for k, v in d.items():
            new_key = f"{prefix}.{k}" if prefix else k
            yield from flatten(v, new_key)
    else:
        yield (prefix, d)


def get_value(d, path):
    keys = path.split(".")
    cur = d
    for k in keys:
        if isinstance(cur, dict) and k in cur:
            cur = cur[k]
        else:
            return None
    return cur


with open(BASE / "en" / "app.json", encoding="utf-8") as f:
    en = json.load(f)
en_kv = dict(flatten(en))

with open(BASE / "zh" / "app.json", encoding="utf-8") as f:
    zh = json.load(f)
zh_keys = set(k for k, _ in flatten(zh))

missing = sorted(set(en_kv.keys()) - zh_keys)
print(f"# {len(missing)} missing keys")
print()
for k in missing:
    v = en_kv[k]
    if isinstance(v, list):
        print(f"# LIST: {k}")
        for item in v:
            print(f"#   - {item!r}")
    else:
        print(f"{k} = {v!r}")
