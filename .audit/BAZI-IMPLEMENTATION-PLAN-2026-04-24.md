# Bazi (八字 / Four Pillars of Destiny) — Full Implementation Plan

**Goal:** bring our Bazi surface from a minimum-viable 4-pillar display up to parity with cece.com — and, where we can out-flank them with traditional-Chinese-market classics they skip, do that too.

**Status of what we ship today** (branch `feature/iching`, commit `6ee9740`, flag-gated, not yet on `main`):
- `src/data/bazi.ts` (280 lines): heavenly stems + earthly branches tables, stem→element + branch→element mapping, a *pragmatic* 4-pillar derivation using a lunar-new-year offset (not true solar-term boundaries), 10 Day Master archetypes with strengths / challenges / tarot pairing, 5-element balance bars.
- `src/pages/BaziPage.tsx` (306 lines): birth-data input → 4 pillars + element bars + Day Master card + guidance + shareable PNG.
- Flag `bazi`, currently admin-only; unflag will ship the existing surface to everyone.

**What cece ships** (from prior CN scrapes — `.audit/CECE-MISSING-FEATURES-FULL.md`, `.audit/CECE-MISSING-FEATURES-2026-04-24.md`):
- Classical full 八字 chart with pillars + hidden stems + nayin + 10 gods
- 大运 luck cycles + 流年 yearly luck
- Favorable element (用神) + strong/weak Day Master diagnosis
- Bazi-based 每日运势 (daily fortune) across 7-8 dimensions
- Bazi 合婚 (compatibility between two charts)
- Lucky color / direction / number driven by favorable element
- Unified 本命盘 scroll that stacks Bazi with natal chart + Ziwei + 28 mansions

---

## Phase 1 — DEPTH: ship what we already have, plus the 5 cheapest classical wins

**Why this phase:** our existing chart renders stems / branches / elements but skips the three classical layers (Ten Gods, Hidden Stems, Nayin) that every serious Chinese-market Bazi app includes. Adding these turns a toy chart into a credible one. All are pure lookup tables — no ephemeris needed.

### 1A. Ten Gods (十神) overlay on every pillar
- **Effort:** S (1-2 days)
- **Data:** add `SHEN_BY_RELATION` table in `src/data/bazi.ts` — 10 god names (正官/偏官/正财/偏财/食神/伤官/正印/偏印/比肩/劫财), each with a relationship function `(dayStemElement, otherStemElement, samePolarity) => godName`.
- **UI:** under each non-day pillar, render the Ten God label in the locale-native form (十神 in zh-CN, localized names in en/ja/ko).
- **Copy:** short one-line description per god — "正官: the structure-keeper of your chart. Favors discipline, law-abiding relationships, formal career paths."
- **Translations:** en / ja / ko / zh.

### 1B. Hidden Stems (藏干) per branch
- **Effort:** S (0.5 day)
- **Data:** add `HIDDEN_STEMS: Record<EarthlyBranch, HeavenlyStem[]>` — traditional table, 1–3 stems per branch.
- **UI:** below each branch glyph, tiny stacked column of hidden stems (greyed next to main branch element).

### 1C. Nayin (纳音) 60-cycle sound-element
- **Effort:** S (1 day)
- **Data:** `NAYIN: Record<\`${HeavenlyStem}${EarthlyBranch}\`, { zh: string; en: string }>` — e.g. `JiaZi → 海中金 / Gold in the Sea`.
- **UI:** below the Year pillar, show "Nayin: Gold in the Sea (海中金) — hidden brilliance; emerges after immersion."
- **Why it matters:** Chinese-market trust signal; also viral-shareable ("your year-pillar is Fire Under the Mountain" is the kind of line Xiaohongshu loves).

### 1D. Strong vs Weak Day Master (身强 / 身弱) diagnosis
- **Effort:** S (1 day)
- **Formula:** weighted-score across stems+branches+hidden stems matching the day-master element, vs those controlling / draining it. Classical thresholds for 身强 (strong), 身中和 (balanced), 身弱 (weak).
- **UI:** single badge at top of the chart. "Day Master: Yang Fire — Slightly Strong".
- **Why it matters:** gateway to 用神 (1E) and to personality depth.

### 1E. Favorable Element (用神) + lucky color / direction / number / career path
- **Effort:** S-M (2-3 days)
- **Formula:** for weak day-masters, the **same element + its producer** are favorable; for strong day-masters, the **controller + drainer** are favorable. (Classical rule; 70% accuracy in absence of 格局 格局 analysis, which is Phase 3.)
- **Deliverables:**
  - Lucky color (derived from favorable-element color mapping: wood=green, fire=red, earth=yellow/brown, metal=white/gold, water=black/blue).
  - Lucky direction (wood=east, fire=south, etc.).
  - Lucky numbers (1-2 wood, 3-4 fire, 5-6 earth, 7-8 metal, 9-0 water).
  - Career hint ("Fire-favored day masters thrive in performance, visibility, leadership roles").
- **UI:** a compact "Your favorable element is Fire" card with 4 chips (color swatch / direction arrow / numbers / career).
- **Viral hook:** this feeds 1F below.

### 1F. 五行穿衣 — Today's outfit color widget
- **Effort:** S (1 day if 1E lands first)
- **Formula:** `favorable-element(user) ∩ (day-energy today → produced/drained/matched element)` → recommended color.
- **UI:** home-screen widget card "Wear red today ♥" with a one-line *why*.
- **Why it's a priority:** Xiaohongshu search volume on 五行穿衣 is 500M+ views; this is the single most viral Bazi-derived widget in the Chinese market and cece reportedly *doesn't* ship it cleanly. Free wedge.

**Phase 1 total effort:** ~5–7 engineer-days. No ephemeris dependency, no new DB tables. Ships the chart from "toy" to "credible".

---

## Phase 2 — ACCURACY: real ephemeris, real solar terms

**Why this phase:** our V1 uses a lunar-new-year offset to derive the month pillar. Traditional Bazi switches month pillars at **solar terms** (立春 Feb-4, 惊蛰 Mar-5, 清明 Apr-5, etc.), not at the lunar new year. For someone born Feb-2, our chart and a real Bazi chart will *disagree on the month pillar*, which propagates to the year pillar as well. Any Chinese user who double-checks our chart against any other Bazi app will catch this. **P0 for credibility in CN market; P1 for non-CN.**

### 2A. Solar-term table (立春 → 大寒), 1900–2100
- **Effort:** M (3-4 days)
- **Options:**
  - **Library:** `lunar-javascript` npm package has an offline solar-term ephemeris already, tree-shakeable to ~30 KB. Preferred.
  - **Lookup table:** pre-compute 24 solar-terms × 200 years = 4800 dates, ship as a compressed JSON (~60 KB). Zero runtime cost.
- **Change:** replace our hash-offset month-pillar derivation with `solarTermToMonthPillar(birthMoment)`.

### 2B. True year pillar from Feb-4 (立春), not Jan-1
- **Effort:** S (0.5 day on top of 2A)
- **Bug we'd be fixing:** anyone born Jan-1 to Feb-3 currently gets the wrong year pillar.

### 2C. Hour pillar with real 12-hour-branch mapping
- **Effort:** S (0.5 day)
- **Data:** 23:00-00:59 = 子, 01:00-02:59 = 丑, … — already well-known. Also handle the "late-night 子时" (早子时 / 晚子时) convention (some traditions bump the day pillar at 23:00, others at 00:00 — offer a toggle).

### 2D. Timezone + true-solar-time correction
- **Effort:** M (2 days)
- **Why:** Bazi is sensitive to apparent solar time; a user born in Xinjiang at "6 AM Beijing time" is effectively 4:30 AM local solar time, which shifts the hour pillar. Classical practice corrects by longitude.
- **UI:** optional "use true solar time" toggle under advanced settings, default on for birthplaces outside the main timezone meridian.

### 2E. Leap month handling
- **Effort:** S (already handled by `lunar-javascript` if we go with it)

**Phase 2 total effort:** ~5–7 engineer-days. Unblocks trust from any Chinese user who compares charts.

---

## Phase 3 — DYNAMICS: the timing-based reads users actually return for

**Why this phase:** a static chart is read once. 大运 + 流年 are what brings users back monthly. This is the retention layer.

### 3A. 大运 (Major Luck Cycles) — 10-year destiny periods
- **Effort:** M (3-4 days)
- **Formula:** starting stem+branch = month pillar + offset (calculated from gender + year-stem polarity); step forward or backward by 1 stem/branch each 10 years. Traditional calculation, well-documented.
- **UI:** horizontal timeline — user's current age has a marker, with all 8-10 luck cycles as colored blocks. Tap a cycle to see its 10-year narrative (derived from the 10-gods relationship between cycle stem+branch and the day master).
- **Why it matters:** this is the feature cece users screenshot and share most; one user can plan "I'm entering 正官 大运 at 38, good time for career" etc.

### 3B. 流年 (Annual Luck) — current year's pillar against the chart
- **Effort:** M (2-3 days)
- **Formula:** take current year's stem+branch, compute 10-gods relationship to Day Master, plus clash/harmony with existing branches.
- **UI:** card for "2026 — 丙午 — 偏财 year. Outcome: wealth opportunities via initiative. Watch for: 午-冲-子 clash with your day branch; avoid major moves in July."
- **Monetization hook:** make the full 12-month breakdown premium; show the 1-line headline free.

### 3C. 流月 (Monthly luck) — premium upsell
- **Effort:** S on top of 3B (just month granularity)
- **Premium gate:** year ahead forecast bundle.

### 3D. Today's Bazi energy — widget
- **Effort:** S (1 day)
- **Formula:** today's day stem+branch vs user's day master → 10-god label + 1-line recommendation.
- **UI:** tiny daily card on home screen — "Today is 甲子 — 七杀 day for you. Channel intensity into one hard problem."

### 3E. 刑冲合害 — branch interaction flags
- **Effort:** S (1-2 days)
- **Data:** small tables — 冲 (6 clashes), 合 (6 harmonies), 害 (6 harms), 刑 (4 punishments). Flag any branch in the daily/yearly/luck pillars that interacts with any branch in the natal chart.
- **UI:** tiny icons under the clashing pillars.

**Phase 3 total effort:** ~7–10 engineer-days.

---

## Phase 4 — SOCIAL + AI: what makes users come back with friends

### 4A. Bazi 合婚 (compatibility between two Bazi charts)
- **Effort:** M (3-4 days)
- **Input:** user's chart + partner's birth date (optionally full time + place).
- **Output:** overall score 0-100 + breakdown (day-branch harmony, element complement, 10-god dynamic, clash flags). Shareable PNG.
- **Monetization:** free result with blurred bottom half; full analysis at 300 moonstones OR $4.99.
- **Why:** 合婚 is the #1 paid service in Chinese 算命 apps. Cece has a version; we can match.

### 4B. AI companion — Bazi-aware
- **Effort:** M (3 days)
- **Change:** pipe user's Bazi result (Day Master, favorable element, current 大运, current 流年) into the AI companion system prompt. User can ask "What does my Bazi say about career right now?" and get a grounded, chart-consistent answer.
- **Why:** ties together two things we already ship and gives the companion genuine personal data to work with.

### 4C. 合盘 group chart — friend / family / team
- **Effort:** M (3-4 days)
- **UI:** add 3-5 people's Bazis to a group chart; system finds the dominant element of the group, identifies clashes, suggests roles.
- **Fun angle:** "your friend group is fire-heavy — you're the water that grounds them".

### 4D. Bazi → tarot bridge card
- **Effort:** S (1 day)
- **Logic:** each Day Master maps to 1-2 tarot archetypes (already half-done in our `DAY_MASTER_INFO.tarotPairing`). Surface it on both the Bazi page and the tarot card's detail page.

**Phase 4 total effort:** ~8–12 engineer-days.

---

## Phase 5 — ADJACENT / FUN: the long tail that makes us wider than cece

### 5A. Baby / pen / brand naming generator (起名)
- **Effort:** L (6-8 days) — biggest of Phase 5 because of the Chinese character stroke + 五格 analysis.
- **Logic:** user supplies surname + gender + Bazi → system computes needed element → suggests 20 name candidates with stroke counts + element + meaning.
- **Why:** 起名 is a huge paid category in China (typical price ¥68-398); we could ship a free-tier suggestion + premium "curated report".

### 5B. 长生十二宫 (12 Life-Stage cycle)
- **Effort:** S (1 day once 2A lands)
- **Data:** each stem cycles through 12 stages (长生, 沐浴, 冠带, 临官, 帝旺, 衰, 病, 死, 墓, 绝, 胎, 养). Fixed table.
- **UI:** small arc display showing which stage the day-master is in at the year pillar.

### 5C. 十神 personality & relationship deep-dive (expand 1A)
- **Effort:** M (3 days)
- **Depth:** per-10-god detailed 600-word profile (career, wealth, love, shadow side). Lock behind premium.

### 5D. Today's 黄道吉日 (auspicious-day picker) driven by user's Bazi
- **Effort:** M (3 days) — needs 2A + 3E.
- **UI:** "best days to: launch / sign / travel / marry" — a 30-day window picker.
- **Why:** directly cannibalizes the standalone 黄历 apps; pulls utility into our ecosystem.

### 5E. 一生运势 Lifetime Fortune long-scroll
- **Effort:** S (1-2 days once 3A + 3B exist)
- **UI:** combine natal chart narrative + every 大运 + notable 流年 markers into a scrollable "your life in ten-year beats" story.
- **Monetization:** premium PDF export = $9.99 (same tier as our existing natal-chart report).

### 5F. Zhen Zhi 真值 Bazi 60 甲子 collection
- **Effort:** M (3 days)
- **Gamification:** 60-pair stems×branches — show which ones the user has "unlocked" (appeared in their chart, or matched with a friend via 4A). Pokemon-style grid.
- **Why:** adds a collection layer that directly feeds social features (see 4A).

**Phase 5 total effort:** ~15–20 engineer-days. Pick cherry by market priority.

---

## Out-of-scope for this plan (but flagged)

- **Ziwei Doushu (紫微斗数)** — a completely separate divination system. Prior scrape P1. Belongs in its own plan.
- **28 Lunar Mansions (二十八宿)** — companion feature to Bazi. Small effort but drags in a second ephemeris. Park for now.
- **Full 格局 (pattern) analysis** — advanced Bazi (正官格, 七杀格, 食神格 etc.) requires AI-grade interpretation. Phase 6+.
- **Real-time 时柱 refresh every 2 hours** — micro-feature for power users. After Phase 3.
- **Bazi-to-Ziwei cross-reference** — premium feature, needs Ziwei first.

---

## Recommended order

1. **Phase 1 (1A → 1F)** — 1 week of eng. Ships a believable chart + the 五行穿衣 viral widget.
2. **Phase 2 (2A, 2B, 2C)** — 1 week. Unblocks CN-market trust.
3. **Phase 3 (3A, 3B, 3D)** — 1.5 weeks. Adds the retention loop (大运 + 流年 + daily widget).
4. **Phase 4A** — 0.5 week. Adds the social / compatibility angle.
5. **Phase 4B** — 0.5 week. AI companion knows your chart.
6. Rest of Phase 5 — bench. Pull features as needed.

**Total: ~4–5 engineer-weeks for Phase 1–4A-B.**

---

## Dependencies

- `lunar-javascript` npm package OR a pre-baked 200-year solar-term JSON (pick one in Phase 2A).
- No new DB tables; Bazi stays computed client-side from `profile.birthDate` / `birthTime` / `birthLat` / `birthLon`.
- Premium gates reuse existing `PaywallSheet` + moonstone unlock flow.
- No ephemeris for true-solar-time correction (Phase 2D) — we can use longitude + a standard equation-of-time approximation (~5 KB).
- i18n: every new Phase-1 feature needs en / ja / ko / zh translations in `src/i18n/locales/*/app.json`.

## First PR (so we can start)

Target the `feature/bazi-classical` branch off `feature/iching`. Ship the 5 smallest Phase-1 wins in one PR: **Ten Gods + Hidden Stems + Nayin + Strong/Weak label + Favorable Element**. That's 4-5 days of eng, one review round, and unlocks every follow-on phase. Unflag `bazi` at the same time (it's already built; just flipping the rollout to 100%).
