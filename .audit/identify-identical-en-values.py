#!/usr/bin/env python3
"""
For each non-EN locale, find every key whose value === EN value AND
looks like English (heuristic: >50% ASCII letters AND length >= 3 AND
contains at least one a-z letter). Skip values that are obviously
proper nouns / abbreviations / template-only.

Produces a JSON file per locale with the full set of strings to
translate, grouped by top-level namespace for batched LLM input.
"""
import json
import re
from pathlib import Path
from collections import defaultdict

BASE = Path(r"C:\Users\lmao\TAROT\src\i18n\locales")


def is_english_looking(s: str) -> bool:
    """Heuristic: real English UI string vs proper noun / abbreviation."""
    if not isinstance(s, str):
        return False
    if len(s) < 3:
        return False
    # Must contain at least one a-z letter
    if not re.search(r"[a-z]", s):
        return False
    # ASCII proportion > 50%
    ascii_letters = len(re.findall(r"[a-zA-Z]", s))
    if ascii_letters / max(1, len(s)) < 0.5:
        return False
    # Skip pure URL-ish strings, emails, file extensions
    if s.startswith("http") or "@" in s and "." in s:
        return False
    # Skip pure template tokens like "{{n}}"
    if re.fullmatch(r"\{\{[^}]+\}\}", s):
        return False
    # Skip values that are likely brand/proper-noun (single capitalized word, < 12 chars)
    if re.fullmatch(r"[A-Z][a-zA-Z]{0,11}", s) and s in {
        "Arcana", "iOS", "Android", "Google", "Apple", "Stripe", "PayPal",
        "Inter", "Cormorant", "Bazi", "MBTI", "DISC", "OCEAN", "VARK",
        "Eros", "Philia", "Storge", "Agape", "Vata", "Pitta", "Kapha",
        "Saturn", "Mars", "Venus", "Mercury", "Jupiter", "Pluto", "Neptune",
        "Sun", "Moon", "URL",
    }:
        return False
    return True


def flatten(d, prefix=""):
    if isinstance(d, dict):
        for k, v in d.items():
            yield from flatten(v, f"{prefix}.{k}" if prefix else k)
    elif isinstance(d, list):
        for i, item in enumerate(d):
            yield from flatten(item, f"{prefix}[{i}]")
    else:
        yield (prefix, d)


with open(BASE / "en" / "app.json", encoding="utf-8") as f:
    en_data = json.load(f)
en_kv = dict(flatten(en_data))


def get_value_at_path(d, path):
    """Get the value at a flattened path (handles arrays)."""
    parts = re.split(r"\.|\[|\]", path)
    parts = [p for p in parts if p]
    cur = d
    for p in parts:
        if isinstance(cur, list):
            cur = cur[int(p)]
        elif isinstance(cur, dict):
            if p not in cur:
                return None
            cur = cur[p]
        else:
            return None
    return cur


for locale in ["zh", "ja", "ko"]:
    with open(BASE / locale / "app.json", encoding="utf-8") as f:
        loc_data = json.load(f)
    identical = []
    for path, en_val in en_kv.items():
        loc_val = get_value_at_path(loc_data, path)
        if loc_val is None:
            continue
        if not isinstance(loc_val, str):
            continue
        if loc_val != en_val:
            continue
        if not is_english_looking(loc_val):
            continue
        identical.append({"path": path, "en": en_val})

    # Group by top-level namespace
    grouped = defaultdict(list)
    for item in identical:
        ns = item["path"].split(".")[0]
        grouped[ns].append(item)

    out = {"total": len(identical), "by_namespace": {ns: items for ns, items in sorted(grouped.items())}}
    out_path = BASE.parent / f"../.audit/identical-en-{locale}.json"
    out_path.resolve()
    full = Path(rf"C:\Users\lmao\TAROT\.audit\identical-en-{locale}.json")
    with open(full, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"  {locale}: {len(identical)} identical-EN strings, {len(grouped)} namespaces")
    for ns, items in sorted(grouped.items(), key=lambda kv: -len(kv[1]))[:8]:
        print(f"    {ns}: {len(items)} strings")
