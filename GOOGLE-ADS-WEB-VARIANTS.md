# TarotLife — Google Web Ads Creative Variants

Five creative angles to A/B test on Google Ads (Search + Performance Max). Each variant targets a distinct intent so you can see which audience converts best before scaling budget.

## How to use this doc

1. Copy each variant's headlines/descriptions into a new **ad** inside one **ad group** per angle.
2. Set the **Final URL** exactly as shown — the UTM tagging feeds our Supabase attribution so we can measure which angle converts best (see `profiles.utm_campaign`).
3. Run all 5 for 7-10 days at equal daily budget (~$3-5 each). Pause the bottom 2 by CPA. Scale the winner.
4. Primary conversion goal: `free_reading_drawn` for first 3 days (fills fast), then swap to `sign_up` once it has ~30 conversions, then `purchase` once that has ~30.

## Google Ads field limits (2026-04)
- **3 headlines required**, max 30 chars each (15 optional)
- **2 descriptions required**, max 90 chars each (4 optional)
- **Display path:** `tarotlife.app/{path1}/{path2}` — path slots max 15 chars each

---

## Variant 1 — "Ask the Cards" (question-seekers)

**Who:** people searching for answers — decisions, uncertainty, confusion.

| Field | Copy | Chars |
|---|---|---|
| Headline 1 | Ask the Cards a Question | 24 |
| Headline 2 | Free Tarot Reading Online | 25 |
| Headline 3 | No Signup. Draw Instantly. | 26 |
| Description 1 | Get clarity on love, career, or a decision. Draw a free card — no email needed. | 80 |
| Description 2 | Personalized meanings, yes/no answers, and daily guidance. Start in seconds. | 77 |

**Final URL:** `https://tarotlife.app/?utm_source=google&utm_medium=cpc&utm_campaign=ask_cards&utm_content=v1`
**Display path:** `tarotlife.app/free-reading/ask`
**Keyword themes:** "free tarot reading", "ask tarot", "tarot yes or no", "one card reading", "should I tarot"

---

## Variant 2 — "Love Reading" (relationship intent)

**Who:** highest-volume tarot search bucket. Relationship anxiety, crush ambiguity, reconciliation.

| Field | Copy | Chars |
|---|---|---|
| Headline 1 | Free Love Tarot Reading | 23 |
| Headline 2 | Does He Think About You? | 24 |
| Headline 3 | Pick a Card. Get Answers. | 25 |
| Description 1 | Instant tarot reading for love and relationships. No signup. No credit card. | 77 |
| Description 2 | Clarity on feelings, timing, and what the cards see for your connection. | 73 |

**Final URL:** `https://tarotlife.app/?utm_source=google&utm_medium=cpc&utm_campaign=love_reading&utm_content=v1`
**Display path:** `tarotlife.app/love/tarot`
**Keyword themes:** "love tarot reading", "relationship tarot", "does he love me tarot", "tarot reading online free love"

---

## Variant 3 — "Daily Ritual" (habit / wellness angle)

**Who:** meditation and mindfulness crossovers, people seeking routine and self-reflection.

| Field | Copy | Chars |
|---|---|---|
| Headline 1 | Your Daily Tarot Ritual | 23 |
| Headline 2 | 3 Minutes. Every Morning. | 25 |
| Headline 3 | Know Yourself Better Daily | 26 |
| Description 1 | Daily tarot, horoscopes, and reflective journaling — beautifully crafted. | 73 |
| Description 2 | Start each day with clarity. Free forever. Works on any device. | 63 |

**Final URL:** `https://tarotlife.app/?utm_source=google&utm_medium=cpc&utm_campaign=daily_ritual&utm_content=v1`
**Display path:** `tarotlife.app/daily/ritual`
**Keyword themes:** "daily tarot", "morning tarot ritual", "tarot journal app", "mindfulness tarot"

---

## Variant 4 — "Career Decision" (practical intent)

**Who:** people at career inflection points. Higher commercial intent, often higher LTV.

| Field | Copy | Chars |
|---|---|---|
| Headline 1 | Tarot for Career Decisions | 26 |
| Headline 2 | Should I Take the Job? | 22 |
| Headline 3 | Free Reading. Honest Answer. | 28 |
| Description 1 | Stuck on a big decision? Draw a card and get a clear perspective in seconds. | 77 |
| Description 2 | Used by 50k+ seekers for career, love, and life guidance. No spam, ever. | 72 |

**Final URL:** `https://tarotlife.app/?utm_source=google&utm_medium=cpc&utm_campaign=career_decision&utm_content=v1`
**Display path:** `tarotlife.app/career/guidance`
**Keyword themes:** "career tarot reading", "should I change jobs tarot", "work decision tarot"

---

## Variant 5 — "Card of the Day" (curiosity / entertainment)

**Who:** low-commitment browsers who respond to novelty. Good for display + discovery placements.

| Field | Copy | Chars |
|---|---|---|
| Headline 1 | Your Card of the Day | 20 |
| Headline 2 | What Does Today Hold? | 21 |
| Headline 3 | Free. Instant. No Signup. | 25 |
| Description 1 | Pull your card, read the meaning, and start your day with intention. | 69 |
| Description 2 | Tarot, horoscopes, and personality insights. All free on any device. | 69 |

**Final URL:** `https://tarotlife.app/?utm_source=google&utm_medium=cpc&utm_campaign=card_of_day&utm_content=v1`
**Display path:** `tarotlife.app/card/today`
**Keyword themes:** "card of the day", "daily tarot card", "today's tarot", "pick a card"

---

## Assets for Performance Max / Display

If you run Performance Max or Display instead of pure Search, you'll need images + a short video. Use these concepts:

### Image set (1:1 and 1.91:1 ratios)
1. **Three face-down cards** with a gold glow — matches the hero demo. Strong CTR.
2. **The Lovers card** full-bleed with gold text overlay "Free Love Tarot" — variant 2 angle.
3. **Morning light + hand drawing a card** — variant 3 (daily ritual).
4. **The Emperor** on a dark background with the text "Should I take the job?" — variant 4.
5. **The Sun card** with "Your card today" — variant 5.

Cards images are already in [public/bundled-cards/](TAROT/public/bundled-cards/) — reuse directly.

### Short video (15s vertical, for YouTube/Shorts)
- 0-3s: three face-down cards rotating, shuffle sound
- 3-6s: "Ask a question. Any question."
- 6-10s: finger taps a card → reveal The Star → gold glow
- 10-13s: keywords animate in ("Hope, Renewal, Guidance")
- 13-15s: logo + "tarotlife.app — Free tarot that actually gets it"

Can be produced in Canva or CapCut from the existing card images in ~30 minutes.

---

## Tracking each variant

Your UTMs flow into `profiles.utm_campaign` via the attribution we wired earlier. Weekly query to see winners:

```sql
SELECT
  utm_campaign,
  COUNT(*) as signups,
  COUNT(*) FILTER (WHERE is_premium) as premium,
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_premium) / NULLIF(COUNT(*), 0), 1) as premium_pct
FROM profiles
WHERE utm_source = 'google'
  AND created_at > now() - interval '14 days'
GROUP BY utm_campaign
ORDER BY signups DESC;
```

Also monitor in Google Ads: **Campaigns → Columns → add Conversions by conversion action** to see `free_reading_drawn` vs `sign_up` vs `purchase` rates per variant.

---

## Decision rules after 7 days

- **Pause variant** if: CPA > 3× your blended average OR zero conversions after 200 clicks.
- **Scale variant** if: CPA within 80% of target AND at least 10 conversions.
- **Iterate** headlines/descriptions on top 2 variants before scaling budget — responsive search ads reward variety.

Top-performing angle becomes the seed for Performance Max; long-tail angles (like specific zodiac signs, specific cards) can be spun out as separate ad groups from that base.
