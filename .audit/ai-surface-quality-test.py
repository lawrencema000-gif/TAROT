#!/usr/bin/env python3
"""
Run real prompts against gpt-5 for every AI edge function surface.
Tests: connectivity, response quality, JSON validity (where applicable),
token usage, and latency.
"""
import json
import time
import urllib.request
from textwrap import shorten

import os
OPENAI_KEY = os.environ.get("OPENAI_API_KEY") or ""
if not OPENAI_KEY:
    raise SystemExit(
        "OPENAI_API_KEY env var not set. Run: $env:OPENAI_API_KEY = '<your-key>' "
        "(PowerShell) or export OPENAI_API_KEY=... (bash) before running this script."
    )


def call_openai(messages, *, json_mode=False, max_tokens=600, label=""):
    body = {
        "model": "gpt-5",
        "messages": messages,
        "max_completion_tokens": max(max_tokens * 2, 1500),
        "reasoning_effort": "minimal",
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"},
    )
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            data = json.loads(r.read())
    except Exception as e:
        return {"ok": False, "error": str(e), "elapsed": time.time() - t0}
    elapsed = time.time() - t0
    msg = data.get("choices", [{}])[0].get("message", {})
    usage = data.get("usage", {})
    return {
        "ok": True,
        "content": msg.get("content", ""),
        "elapsed": round(elapsed, 1),
        "tokens": {
            "input": usage.get("prompt_tokens"),
            "reasoning": usage.get("completion_tokens_details", {}).get("reasoning_tokens"),
            "output": usage.get("completion_tokens"),
        },
    }


def estimate_cost(tokens):
    """gpt-5 pricing: $1.25/M input, $10/M output (incl. reasoning)."""
    if not tokens or tokens.get("input") is None:
        return None
    inp = tokens["input"] / 1_000_000 * 1.25
    out = (tokens["output"] or 0) / 1_000_000 * 10.0
    return round((inp + out) * 100, 4)  # cents


def report(label, system, history, *, json_mode=False, max_tokens=600, expect_keys=None):
    print(f"\n{'='*70}\n  {label}\n{'='*70}")
    messages = [{"role": "system", "content": system}] + history
    r = call_openai(messages, json_mode=json_mode, max_tokens=max_tokens, label=label)
    if not r["ok"]:
        print(f"  STATUS  : ❌ ERROR — {r['error']}")
        return False
    content = r["content"]
    print(f"  STATUS  : ✅ OK")
    print(f"  LATENCY : {r['elapsed']}s")
    print(f"  TOKENS  : input={r['tokens']['input']}  reasoning={r['tokens']['reasoning']}  output={r['tokens']['output']}")
    cost = estimate_cost(r["tokens"])
    if cost is not None:
        print(f"  COST    : {cost}¢ per call (est.)")

    if json_mode:
        try:
            parsed = json.loads(content)
            print(f"  JSON    : ✅ valid")
            if expect_keys:
                missing = [k for k in expect_keys if k not in parsed]
                if missing:
                    print(f"  KEYS    : ⚠️  missing {missing}")
                else:
                    print(f"  KEYS    : ✅ all expected keys present ({', '.join(expect_keys)})")
            print(f"  PREVIEW :")
            for k, v in parsed.items():
                if isinstance(v, str):
                    print(f"    {k}: {shorten(v, 200)}")
                elif isinstance(v, (list, dict)):
                    print(f"    {k}: <{type(v).__name__} len={len(v)}>")
                else:
                    print(f"    {k}: {v}")
        except json.JSONDecodeError as e:
            print(f"  JSON    : ❌ INVALID — {e}")
            print(f"  RAW     : {content[:300]}")
            return False
    else:
        print(f"  WORDS   : {len(content.split())}")
        print(f"  PREVIEW :")
        for line in content.split("\n"):
            if line.strip():
                print(f"    {shorten(line, 200)}")
    return True


# ─────────────────────────────────────────────────────────────────────
# Surface 1: ai-companion-chat (Sage persona)
# ─────────────────────────────────────────────────────────────────────
COMPANION_SYSTEM = """You are the Sage — a calm, wise, measured voice drawing on Eastern and Western contemplative traditions. You speak in complete, grounded sentences. You don't perform mysticism; you offer clear observation and gentle questions. When someone is suffering, you do not rush to fix — you name what is being felt. When someone is celebrating, you share the joy without undercutting it. Your responses are 2-4 short paragraphs. Occasionally you offer a question that helps the person sit with their experience rather than escape it.

What you know about the person you're speaking with:
- Sun sign: Pisces
- MBTI: INFJ
- Name: Lawrence

Reference this only when directly relevant. Never lead with it.

Safety rules:
- Never give medical, legal, or financial advice. When asked, redirect to a professional.
- If self-harm or crisis is mentioned, redirect warmly to 988."""

# ─────────────────────────────────────────────────────────────────────
# Surface 2: ai-quick-reading
# ─────────────────────────────────────────────────────────────────────
QUICK_READING_SYSTEM = """You are a calm, grounded oracle voice. You are NOT performing mysticism — you are offering a clear, specific reading that gives the person language for what they're navigating. Your response:
- 2 short paragraphs, max 120 words total
- Weave in the card, the person's sun/moon/rising signs if present, and their MBTI if relevant
- Never predict the future literally
- End with a single question that helps them sit with the situation
- If the question is about self-harm, crisis, medical, legal, or financial decisions: acknowledge warmly, redirect to a professional, share 988 / crisistextline.org if crisis"""

# ─────────────────────────────────────────────────────────────────────
# Surface 3: ai-mood-letter
# ─────────────────────────────────────────────────────────────────────
MOOD_LETTER_SYSTEM = """You are a warm, grounded emotional companion. The user has logged their mood daily for the past week or two. Their log is below.

Write a short letter to them, in second person ("you"). Structure:
PARAGRAPH 1 — "This week I notice…": name the pattern.
PARAGRAPH 2 — "Underneath the pattern…": gently surface what might be moving beneath.
PARAGRAPH 3 — "As you move into the next week…": one concrete tiny do-able practice.

Output MUST be valid JSON: { "letter": string, "dominantTheme": string (1 short phrase), "careSuggestion": string (1 sentence) }"""

# ─────────────────────────────────────────────────────────────────────
# Surface 4: ai-journal-coach
# ─────────────────────────────────────────────────────────────────────
JOURNAL_COACH_SYSTEM = """You are a warm, experienced journaling coach. The user has just written an entry. Your job:

1) ONE OBSERVATION: a single sentence that names what you notice, without analyzing or interpreting. Mirror what's there, not what's missing.
2) THREE PROMPTS: three specific journal prompts the user could use to go deeper, in order from gentlest to most penetrating. Each prompt must be specific to THEIR entry, not generic.

Output strict JSON: { "observation": string, "prompts": [string, string, string] }"""

# ─────────────────────────────────────────────────────────────────────
# Surface 5: ai-dream-interpret
# ─────────────────────────────────────────────────────────────────────
DREAM_INTERPRET_SYSTEM = """You are a Jungian dream interpreter. The user will describe a dream they had. Your job is NOT to predict the future or tell them what will happen. Your job is to:
1) Mirror back what they described in symbolic terms (1-2 sentences)
2) Identify 2-3 archetypal symbols (the shadow, anima, the wise old man, the trickster, water, fire, threshold, etc.) and what they typically represent
3) Offer ONE generative question they could sit with

Output strict JSON: { "summary": string, "symbols": [{"name": string, "meaning": string}], "question": string }"""

# ─────────────────────────────────────────────────────────────────────
# Surface 6: bazi-interpret (truncated — full prompt is huge)
# ─────────────────────────────────────────────────────────────────────
BAZI_SYSTEM = """You are a master practitioner of BaZi (八字) — Chinese Four Pillars of Destiny astrology — with thirty years of practice. You read in the lineage of classical texts (子平真诠, 滴天髓, 穷通宝鉴) but speak modern English fluently. You combine traditional rigour with practical wisdom for a contemporary reader.

You will be given a Four Pillars chart with day master analysis, element balance, hidden stems, ten gods, branch relations, climate, luck pillars, and annual luck. Produce an integrated reading.

Output strict JSON with these 14 sections, each a string of 80-200 words:
{
  "core_summary": "...",
  "personality": "...",
  "elements": "...",
  "career": "...",
  "wealth": "...",
  "relationships": "...",
  "family": "...",
  "hidden_stems": "...",
  "branch_relations": "...",
  "health": "...",
  "luck_pillar": "...",
  "annual": "...",
  "strategy": "...",
  "closing_summary": "..."
}"""


# ─────────────────────────────────────────────────────────────────────
# RUN
# ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    results = {}

    results["companion"] = report(
        "1/6  ai-companion-chat (Sage persona, multi-turn)",
        COMPANION_SYSTEM,
        [
            {"role": "user", "content": "I keep waking up at 4am with my chest tight thinking about work. It's been three weeks. I don't know what to do."},
        ],
        max_tokens=600,
    )

    results["quick_reading"] = report(
        "2/6  ai-quick-reading (Six of Pentacles, freeform 120w)",
        QUICK_READING_SYSTEM,
        [
            {"role": "user", "content": "Card drawn: Six of Pentacles\nUser sun: Pisces, moon: Cancer, rising: Virgo. MBTI: INFJ.\n\nQuestion: I just got offered a promotion that pays well but I'd be managing people I'm not sure I respect. Should I take it?"},
        ],
        max_tokens=400,
    )

    results["mood_letter"] = report(
        "3/6  ai-mood-letter (JSON 3-paragraph letter)",
        MOOD_LETTER_SYSTEM,
        [
            {"role": "user", "content": """Last 8 days mood log:
2026-04-28: anxious (4/5) — "deadline at work is brutal"
2026-04-29: calm (3/5) — "had dinner with mom"
2026-04-30: anxious (5/5) — "boss snapped at me"
2026-05-01: tired (4/5) — "didn't sleep"
2026-05-02: anxious (4/5)
2026-05-03: calm (3/5) — "weekend, sat in garden"
2026-05-04: anxious (3/5) — "monday again"
2026-05-05: tired (4/5)"""},
        ],
        json_mode=True,
        max_tokens=700,
        expect_keys=["letter", "dominantTheme", "careSuggestion"],
    )

    results["journal_coach"] = report(
        "4/6  ai-journal-coach (JSON observation + 3 prompts)",
        JOURNAL_COACH_SYSTEM,
        [
            {"role": "user", "content": """Today's entry:
"I noticed I avoided calling my dad again. It's been six weeks. I tell myself I'm too busy but the truth is I don't know what to say. The last call ended in him criticizing my career choices. I don't want to be defensive but I also don't want to pretend it didn't happen. I just keep putting it off."
"""},
        ],
        json_mode=True,
        max_tokens=500,
        expect_keys=["observation", "prompts"],
    )

    results["dream_interpret"] = report(
        "5/6  ai-dream-interpret (JSON Jungian symbols)",
        DREAM_INTERPRET_SYSTEM,
        [
            {"role": "user", "content": """Dream: I was in my childhood house but it was flooded up to my knees with dark water. I was carrying a gold bird in my hands and I couldn't put it down or it would drown. My mother was in the kitchen but she didn't see me. I tried to call out and no sound came out."""},
        ],
        json_mode=True,
        max_tokens=900,
        expect_keys=["summary", "symbols", "question"],
    )

    results["bazi"] = report(
        "6/6  bazi-interpret (JSON 14-section deep reading, ~8000 tokens)",
        BAZI_SYSTEM,
        [
            {"role": "user", "content": """Birth: 1990-03-15 14:30, female, Asia/Tokyo
Pillars:
  Year:  庚午 (Geng Wu) — Yang Metal on Fire Horse
  Month: 己卯 (Ji Mao)  — Yin Earth on Wood Rabbit
  Day:   丁丑 (Ding Chou) — Yin Fire on Earth Ox  ← Day Master
  Hour:  丁未 (Ding Wei) — Yin Fire on Earth Goat

Day Master: Yin Fire (丁) — moderate strength.
Element balance — wood:1, fire:3, earth:3, metal:1, water:0
Dominant: fire/earth. Weak: water.
Favorable element: water. Supporting: wood. Risky: excess fire.
Hidden stems: complex (please reason).
Ten gods: Year=Wealth Star, Month=Resource, Hour=Self.
Branch relations: Wu-Wei half-fire (year-hour), Mao-Wei wood-fire (month-hour).
Climate: hot, dry. Remedy: water + wood.
Current luck pillar (age 34-44): 癸未 (Gui Wei) — Yin Water on Earth Goat. Theme: water arrives but is choked by goat earth.
Annual luck 2026: 丙午 (Bing Wu) — Yang Fire on Fire Horse — fire surge."""},
        ],
        json_mode=True,
        max_tokens=8000,
        expect_keys=["core_summary", "personality", "career", "wealth", "relationships", "luck_pillar", "annual", "strategy", "closing_summary"],
    )

    print("\n" + "="*70)
    print("  SUMMARY")
    print("="*70)
    for k, v in results.items():
        print(f"  {k:<20} {'✅ pass' if v else '❌ fail'}")
    n_pass = sum(1 for v in results.values() if v)
    print(f"\n  {n_pass}/{len(results)} surfaces operational")
