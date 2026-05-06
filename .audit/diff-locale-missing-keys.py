#!/usr/bin/env python3
"""Diff EN locale files against ja/ko/zh to find every missing key."""
import json
from pathlib import Path

BASE = Path(r"C:\Users\lmao\TAROT\src\i18n\locales")


def flatten(d, prefix=""):
    """Yield every leaf key path as a dot-separated string."""
    if isinstance(d, dict):
        for k, v in d.items():
            new_key = f"{prefix}.{k}" if prefix else k
            yield from flatten(v, new_key)
    elif isinstance(d, list):
        # Treat list items as terminals; record the array path itself
        yield prefix
    else:
        yield prefix


def get_value(d, path):
    """Look up a dotted key path in a nested dict."""
    keys = path.split(".")
    cur = d
    for k in keys:
        if isinstance(cur, dict) and k in cur:
            cur = cur[k]
        else:
            return None
    return cur


for json_file in ["app.json", "common.json", "landing.json"]:
    en_path = BASE / "en" / json_file
    if not en_path.exists():
        continue
    with open(en_path, encoding="utf-8") as f:
        en = json.load(f)
    en_keys = set(flatten(en))
    print(f"\n=== {json_file} ===  EN keys: {len(en_keys)}")
    for locale in ["ja", "ko", "zh"]:
        loc_path = BASE / locale / json_file
        if not loc_path.exists():
            print(f"  {locale}: file missing!")
            continue
        with open(loc_path, encoding="utf-8") as f:
            loc = json.load(f)
        loc_keys = set(flatten(loc))
        missing = sorted(en_keys - loc_keys)
        print(f"  {locale}: {len(missing)} missing keys")
        if missing:
            # Group by top-level prefix
            from collections import defaultdict
            grouped = defaultdict(list)
            for k in missing:
                top = k.split(".")[0]
                grouped[top].append(k)
            for top, keys in sorted(grouped.items()):
                print(f"    {top}: {len(keys)} keys")
                for k in keys[:3]:
                    val = get_value(en, k)
                    val_preview = str(val)[:60].replace("\n", " ")
                    print(f"      {k} = {val_preview!r}")
                if len(keys) > 3:
                    print(f"      … +{len(keys)-3} more")
