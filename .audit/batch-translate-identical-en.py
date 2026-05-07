#!/usr/bin/env python3
"""
Batch-translate the identical-EN values to ja/ko/zh via gpt-5.

Strategy:
  - Read identical-en-{locale}.json (produced by identify-identical-en-values.py)
  - Group by namespace (top-level dot-prefix)
  - For each namespace, send a single gpt-5 call with all strings + context
    - System prompt: established translator tone for the app
    - User prompt: JSON of {path: en} pairs
    - Response format: JSON object with same paths → translated values
  - Apply via Python script directly into app.json
  - Idempotent — re-runs replace same keys

Cost estimate: ~$0.10 per locale, ~$0.30 total.
"""
import json
import os
import time
import urllib.request
from pathlib import Path

OPENAI_KEY = os.environ.get("OPENAI_API_KEY") or ""
if not OPENAI_KEY:
    raise SystemExit(
        "OPENAI_API_KEY env var not set. Run: $env:OPENAI_API_KEY = '<your-key>' "
        "(PowerShell) or export OPENAI_API_KEY=... (bash) before running this script."
    )
BASE = Path(r"C:\Users\lmao\TAROT\src\i18n\locales")

LOCALE_NAMES = {"zh": "Simplified Chinese", "ja": "Japanese", "ko": "Korean"}

SYSTEM_PROMPT = """You are translating short UI strings for Arcana, a mystical-but-modern
tarot, astrology, dream-work, and self-knowledge app. The brand voice is
calm, grounded, slightly literary; not woo-woo, not corporate.

Rules:
- Translate concisely; UI strings should fit in their original button/label width when possible
- Preserve {{variable}} placeholders verbatim (e.g. {{name}}, {{n}}, {{count}})
- Preserve newlines and any markdown if present
- Keep proper nouns untranslated when they're names of personality types,
  systems, or astrological terms (MBTI, OCEAN, Saturn, Mars, Eros, Vata,
  iOS, Stripe, etc.)
- Astrological/spiritual terms should use the conventional translation
  for the target language (e.g. 占星 / 占い for astrology, 塔罗 / タロット for tarot)
- For Chinese, use Simplified Chinese (not Traditional)
- For Japanese, use a natural mix of katakana/hiragana/kanji as appropriate
  (don't force katakana on everything)
- Output ONLY valid JSON matching the input schema — no commentary

Output JSON shape: {"path1": "translated1", "path2": "translated2", ...}
"""


def call_openai(messages):
    body = {
        "model": "gpt-5",
        "messages": messages,
        "max_completion_tokens": 16000,
        "reasoning_effort": "minimal",
        "response_format": {"type": "json_object"},
    }
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {OPENAI_KEY}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())


def chunk_namespace(ns_items, max_strings=80):
    """Split a namespace into chunks ≤ max_strings."""
    for i in range(0, len(ns_items), max_strings):
        yield ns_items[i:i + max_strings]


def translate_chunk(locale_name, ns, items):
    """Translate one chunk of strings — returns dict path→translated."""
    payload = {item["path"]: item["en"] for item in items}
    user_msg = (
        f"Target language: {locale_name}\n"
        f"Namespace: {ns}\n\n"
        f"Translate the values of the following JSON object. Keys are key paths "
        f"(do NOT translate), values are the strings to translate. Return JSON "
        f"with the same keys mapped to translated values.\n\n"
        f"{json.dumps(payload, ensure_ascii=False)}"
    )
    resp = call_openai(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ]
    )
    if "choices" not in resp:
        raise RuntimeError(f"OpenAI error: {resp}")
    text = resp["choices"][0]["message"]["content"]
    return json.loads(text)


def set_path(d, path, value):
    """Walk a dotted path including [n] for array indices and set the leaf."""
    import re
    parts = re.split(r"\.|\[|\]", path)
    parts = [p for p in parts if p]
    cur = d
    for i, p in enumerate(parts[:-1]):
        if isinstance(cur, list):
            cur = cur[int(p)]
        elif isinstance(cur, dict):
            cur = cur[p]
    last = parts[-1]
    if isinstance(cur, list):
        cur[int(last)] = value
    elif isinstance(cur, dict):
        cur[last] = value


for locale in ["zh", "ja", "ko"]:
    inv_path = Path(rf"C:\Users\lmao\TAROT\.audit\identical-en-{locale}.json")
    with open(inv_path, encoding="utf-8") as f:
        inventory = json.load(f)
    namespaces = inventory["by_namespace"]

    # Load locale app.json so we can write translated values into it
    app_path = BASE / locale / "app.json"
    with open(app_path, encoding="utf-8") as f:
        app = json.load(f)

    print(f"\n=== {locale} ({LOCALE_NAMES[locale]}) — {inventory['total']} strings ===")
    total_translated = 0
    for ns, items in sorted(namespaces.items()):
        print(f"  {ns}: {len(items)} strings…", end="", flush=True)
        chunks_processed = 0
        for chunk in chunk_namespace(items, max_strings=60):
            try:
                t0 = time.time()
                translations = translate_chunk(LOCALE_NAMES[locale], ns, chunk)
                elapsed = time.time() - t0
                for path, val in translations.items():
                    if isinstance(val, str) and val.strip():
                        set_path(app, path, val)
                        total_translated += 1
                chunks_processed += 1
                print(f" [chunk {chunks_processed}: {len(translations)}/{len(chunk)} in {elapsed:.1f}s]", end="", flush=True)
            except Exception as e:
                print(f" [chunk {chunks_processed+1}: ERROR {e}]", end="", flush=True)
                continue
        print()

    # Save back
    with open(app_path, "w", encoding="utf-8") as f:
        json.dump(app, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"  → wrote {total_translated} translations to {app_path.name}")
