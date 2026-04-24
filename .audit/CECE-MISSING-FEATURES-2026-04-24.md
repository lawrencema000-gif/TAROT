# Cece → Arcana Feature Delta — 2026-04-24 Refresh

**Scrape date:** 2026-04-24
**Base for comparison:**
- `.audit/CECE-MISSING-FEATURES-FULL.md` (prior inventory, 2026-04-23)
- `.audit/CECE-COMPETITIVE-ANALYSIS.md` (prior architecture analysis)
- `.audit/WEB-FEATURE-TEST-GUIDE.md` (Arcana live features as of 2026-04-24)

**Purpose:** Identify features Cece (测测, Beijing Light For You Tech / Xinyan Group) *confirmed* shipping in 2024-2025-2026 that Arcana still lacks, and flag any prior assumptions that turned out wrong. Anything not independently confirmed by a 2024+ source is marked **unverified**.

**Sources pulled today:**
- `cece.com` + `cece.com/introduce/` + `cece.com/product/`
- iOS App Store CN listing (id756771906) via MWM mirror
- `ai-bot.cn/cecelive/` (AI product card)
- `geekpark.net` longform features (AI 心情小镇 deep-dive, 2025 founder interview, 2025 user guide)
- `pingwest.com` 2024 annual report recap
- `tech.china.com` 2025 AI playbook
- WebSearch corroboration on subscription pricing and 2026 feature mentions

**What's CONFIRMED newly since the 2026-04-23 scrape:**
1. **"AI 心情小镇" (AI Mood Town)** — 6 named virtual-listener personas, launched Jul 2024, 300k+ users, uses OCR + emotion recognition on top of the Xinyuan LLM. This is the single biggest feature we hadn't catalogued before.
2. **Three named AI agent brands** — `测测 AI`, `测测灵犀` (Lingxi — "good at trivial everyday things"), `测测小智` (Xiaozhi — "good at future-gazing"), plus `明朗` (a specific Mood Town persona). This is persona-branded AI delivery, not a single chatbot.
3. **Specific features surfaced in 2024/2025 press:** `缘分指数合盘` (Destiny Index Synastry), `爱情树` (Love Tree attachment tree), `幸运地图` (Lucky Map — lucky cities / peach-blossom cities), `Pick卡` (pick-card gamified quiz), `每日锦囊` (Daily Pouch / daily tip), yearly "lucky color + representative character" ritual.
4. **3D sandbox scale:** 1.2M+ users by Jul 2025 — confirming it's a *primary* retention surface, not a novelty.
5. **Founder's 2025-2026 bet = "embodied intelligence":** AI that *proactively initiates* interaction, not passive response. Strategic direction, not a shipped feature yet.

**What DIDN'T verify today (leaving as unverified):**
- Apple Watch / iMessage / Siri / Shortcuts / Lock-Screen widget integration — no source mentions any of these. The CN app likely has none; our win is the opposite of a gap.
- Tarot as a core Cece surface. They talk astrology + MBTI + sandbox + AI agents endlessly; tarot appears nowhere in 2024/2025 materials. Cece is *not* a tarot-first app — Arcana's tarot depth remains a moat.
- True "Human Design chart" generator inside Cece. Rest of World (2023) claimed it; no 2024/2025 Chinese source confirms it's still a featured surface. Marked unverified pending fresh check.

---

## Legend

- **Status:** ❌ missing, ⚠️ partial, ✅ shipped (per `WEB-FEATURE-TEST-GUIDE.md`)
- **Effort:** S <1 day · M 1-5 days · L 1-4 weeks · XL 1-3 months
- **Priority:** P0 game-changer · P1 strong · P2 nice-to-have
- **Evidence:** source that *confirms* Cece ships it

---

## 1. Divination surfaces (types of readings Cece has that we don't)

| Feature | Arcana | Effort | Priority | Evidence | Notes |
|---|---|---|---|---|---|
| **Destiny Index Synastry (`缘分指数合盘`)** | ⚠️ (synastry tab on chart wheel exists) | S | P1 | geekpark.net/348292, tech.china.com 2025 guide | Their version outputs a single **index score** + romantic/platonic breakdown, not just an aspect grid. Our synastry is data-rich but lacks the shareable one-number hook. Build a "Destiny Score" that wraps our synastry with a viral PNG share card. |
| **Love Tree (`爱情树`) attachment visualization** | ⚠️ (Attachment Style quiz shipped) | S | P2 | geekpark.net/348292 | Their quiz outputs a *growing tree graphic* per attachment type (anxious / avoidant / secure / disorganized). Visual metaphor, not new psychology. Re-skin our existing attachment result as an evolving tree illustration. |
| **Lucky Map (`幸运地图`)** | ❌ | M | P1 | geekpark.net/348292 | Input birth chart → map highlights "lucky cities", "peach-blossom cities" (romance), "career cities", "wealth cities". Uses astrocartography / local-space astrology. 20-30 cities per user, Google-Maps-embed. Highly shareable + unique spin on Astro Maps. |
| **Pick Card (`Pick卡`)** | ⚠️ (Tarot daily card shipped) | S | P2 | geekpark.net/348292 | Gamified "pick one of 3 face-down cards" mini-game with single-line oracle result. Daily ritual mechanic distinct from full tarot pull. Low content-cost, high novelty. |
| **Daily Pouch (`每日锦囊`)** | ⚠️ (Daily wisdom widget shipped) | S | P2 | pingwest.com 2024 recap | Sealed-envelope UX you tap open once/day, gives a line of advice + 1 action. More theatrical than our current daily-wisdom text tile. Re-skin existing widget as envelope animation. |
| **Yearly Lucky Color + Representative Character ritual** | ❌ | S | P1 | pingwest.com 2024 recap | One-off annual ritual: Jan 1 users get *their* lucky color for the year + an assigned archetype character. Massive share-to-social driver on Jan 1. Schedule a pg_cron yearly job. |
| **Twenty-Eight Lunar Mansions (`二十八宿`) readings** | ❌ | S | P3 | mwm.ai feature list | Already listed P3 in prior inventory — reconfirmed as *actively* in Cece's marketing copy. Moved up to verified. |
| **Ziwei Doushu (`紫微斗数`) chart** | ❌ | L | P2 | mwm.ai feature list | Classical Chinese "emperor's astrology" — 12-palace chart + 100+ stars. Heavier than Bazi. Prior inventory had Bazi; Ziwei is its bigger cousin. Required to claim full CN-market parity. |

---

## 2. AI features (conversational / image / voice)

The single biggest gap vs. our prior inventory. Cece's AI is *persona-branded* and *multi-agent*, not one chatbot.

| Feature | Arcana | Effort | Priority | Evidence | Notes |
|---|---|---|---|---|---|
| **AI Mood Town (`AI 心情小镇`) — 6 named listener personas** | ⚠️ (we have 4 personas: Sage/Oracle/Mystic/Priestess) | M | **P0** | geekpark.net/340288 (deep-dive), pingwest 2024 recap | We already ship persona companions but Cece's pivot is **thematic environment-based**. You don't pick a persona abstractly — you enter a *"town"* with rooms, each room is a listener with a full back-story (明朗 = pro-psychologist + relationship advisor; 知心姐姐 = warm elder sister; 理性学长 = rational mentor; plus 3 more). Re-skin our `/companion` route as an environment with room-selection UI. ~3-5 days of UI work on existing AI infra. |
| **Emotion recognition on free-text input** | ❌ | S | P1 | geekpark.net/340288 | Users type what happened; system extracts sentiment/emotion tags *before* sending to LLM; tags drive which persona speaks + the tone of response. Anthropic/Gemini already classify emotion well — just add a classification pass in `services/api/ai` pipeline. |
| **OCR emotion extraction from screenshots** | ❌ | M | P1 | geekpark.net/340288 | Upload a screenshot of a WhatsApp/text conversation → AI reads it → gives a "what this person meant" + "how you could respond" reading. Viral feature. Gemini Vision handles this in one call. |
| **Persona-branded agent lineup (Lingxi, Xiaozhi)** | ⚠️ | M | P1 | geekpark.net/352673 (founder), tech.china.com 2025 | Rather than "Companion", ship branded *characters*: one "everyday trivial" advisor, one "future-gazing" oracle, one "rational analyst". Market each like a product with an avatar + back-story page. Better App-Store screenshots. |
| **"Proactively-initiated" AI conversations (embodied intelligence)** | ❌ | M | P1 | geekpark.net/352673 founder interview | Cece's stated 2025-2026 roadmap: AI messages *you* first — "hey you haven't told me about your day", "I noticed your horoscope is rough tomorrow, want to talk?" Needs push-notification infra hooked into Gemini conversation starters. Retention rocket. |
| **AI Q&A is their #1-used feature** (1 billion answers in 2024) | ⚠️ (`3-second reading` shipped) | — | P1 confirm | pingwest 2024 | Our 3-second reading matches their flow. *Action:* promote it to home-tile hero placement + App Store primary screenshot. Prior inventory underweighted this — it's *the* Cece habit-forming loop, not AI companion. |
| **Voice-reply listener (10-sec minimum voice answers)** | ❌ | M | P2 | mwm.ai | In community Q&A, *answerers* can record 10s+ voice notes instead of text. Gives a more personal feel to the "ask a community expert" flow. Requires audio-message infra. |

---

## 3. Monetization hooks (paywalls, bundles, trials, promos)

| Feature | Arcana | Effort | Priority | Evidence | Notes |
|---|---|---|---|---|---|
| **First-month ¥9.9 → ¥25 step-up promo** (~$1.40 → $3.50 US) | ⚠️ (monthly exists) | S | **P0** | MWM listing, App Store CN | Confirmed actively running. Our subscription has no intro promo. Low-effort RevenueCat config change — 40-60% trial-to-paid uplift typical. |
| **Quarterly tier (¥58 / ~$8)** | ❌ | S | P1 | MWM listing | Middle tier between monthly and annual. Reduces churn vs. monthly, lower commitment barrier than annual. |
| **SVIP super-premium (¥69/mo ~ $9.80)** | ❌ | S | P1 | prior App Store listing | Bundles advisor-chat minutes + priority AI + cosmetics. Matches our `advisor-voice`/Moonstone roadmap — just needs a SKU + bundle config once marketplace ships. |
| **Coin packs at ¥6 entry point** (~$0.85) | ⚠️ (Moonstones shipped, pricing ladder TBD) | S | P0 | prior App Store listing | Their cheapest pack is $0.85. Ours should match — this is the impulse-buy anchor. Configure 5-tier ladder ($0.99 / $2.99 / $4.99 / $9.99 / $49.99). |
| **Bounty-per-question community Q&A** | ❌ | M | P2 | mwm.ai | Users pay ¥3+ to *ask* a paid question in the community; top answerers earn the bounty. Asker also tips extra for better answer. Completely novel monetization loop — users paying *users* with platform rake. |
| **Paywall specific to chart report categories** (career, love, money, health) | ⚠️ (Career report, Year Ahead, Natal shipped) | S | P1 | geekpark.net 2025 guide | We have 3 paid reports. Cece slices further: *love* report, *career* report, *wealth* report, *health* report, *family* report. Each is a $4.99-$6.99 à-la-carte. ~1 day/report after natal template exists. |

---

## 4. Community / social

| Feature | Arcana | Effort | Priority | Evidence | Notes |
|---|---|---|---|---|---|
| **Interactive discussion threads attached to each quiz result** | ❌ | M | **P0** | geekpark.net/348292 (2025 guide) | When you finish MBTI, the result page has a *permanent discussion thread for your type*. All INTPs see the same thread. Turns single-use quizzes into daily revisit loops. Big retention hook we're missing. |
| **Friend MBTI distribution viewer** | ❌ | M | P1 | multiple sources | Connect contacts → pie chart of "your friends are 40% INTP, 20% INFJ...". Viral share. Requires contact-upload permission + an MBTI-share token system. Prior inventory listed as P2 — bump to P1 given it's hit 11.7M participants. |
| **Dual MBTI compatibility via friend-share link** | ⚠️ (we have `compat-invite` flag) | S | P0 | geekpark.net/348292 | Ship the invite link flow end-to-end. Pre-fill partner's quiz from their invite; on completion show compat result + affiliate back to asker. Our flag is on — need UI polish. |
| **Quiz-result "year in review" shareable image** | ❌ | S | P1 | pingwest 2024 | Every Jan, Cece publishes a personalized year-report (feature usage + MBTI + mood summary). Annual Spotify-Wrapped-style hit. Easy w/ existing user data. |
| **Share-to-WeChat tokenized quiz link** | ❌ (localized — we need **share-to-iMessage / WhatsApp / Insta** equivalents) | S | P0 | geekpark.net/348292 | Their viral loop = WeChat. Ours has to be iMessage + WhatsApp + Instagram Stories. One-tap share with dynamically rendered OG image + deep link into our quiz. |

---

## 5. Daily engagement (streaks, notifications, widgets, lock screens)

| Feature | Arcana | Effort | Priority | Evidence | Notes |
|---|---|---|---|---|---|
| **Daily Pouch (`每日锦囊`) — sealed envelope UX** | ⚠️ (Daily wisdom widget shipped as plain text) | S | P2 | pingwest 2024 | See §1. Re-skin. |
| **Behavior-based push send-window** | ⚠️ (we have `personalized push notifications` as partial) | S | P1 | prior inventory | Confirmed Cece does this. Open rate 50% at 7pm+ per founder. Do a simple per-user-timezone + click-time model. PostHog can drive it. |
| **Proactive AI push** ("I noticed your horoscope is rough") | ❌ | M | P1 | geekpark.net/352673 | See §2. |
| **Yearly "lucky color + character" drop** (Jan 1 ritual) | ❌ | S | P1 | pingwest 2024 | See §1. |
| **Apple Watch complication / lock-screen widget** | ❌ (Cece has none either) | L | P2 | *no Cece evidence — Western-market differentiator* | Cece is app-only. iOS users expect Lock-Screen widgets in 2026. Shipping 3 widget sizes + 1 Lock-Screen font-weight widget for "today's moon" / "card of the day" / "mood tap" would *beat* Cece in the iOS market entirely. |
| **Siri Shortcut "What's my horoscope today"** | ❌ (Cece has none either) | S | P2 | *no Cece evidence — Western-market differentiator* | Same. Cheap AppIntents wrapper on the existing daily-horoscope endpoint. |
| **Live Activity during Full Moon / Mercury Retrograde** | ❌ | M | P3 | *no Cece evidence* | Novelty. Live Activity countdown on Lock Screen to next astro event. |
| **iMessage sticker pack / extension** | ❌ | M | P3 | *no Cece evidence — Western-market differentiator* | 12 zodiac + 22 Major Arcana stickers as a free iMessage extension = App Store discovery surface. |

**Key insight:** Cece has *zero* evidence of Apple-platform deep-integration features (Watch, Siri, iMessage, Lock Screen, Live Activities). They're Android-first and Chinese-market-first. Every iOS-platform feature we ship is a *pure* competitive advantage — not a gap to close, a moat to build.

---

## 6. Personalization (onboarding, quizzes, profiles)

| Feature | Arcana | Effort | Priority | Evidence | Notes |
|---|---|---|---|---|---|
| **Interactive discussion area per MBTI type** | ❌ | M | P0 | see §4 | |
| **Re-run MBTI simplified 12-Q version** | ✅ | — | — | pingwest 2024 (Cece shipped a simplified MBTI in Jan 2025) | We already have quick version — confirm it's surfaced on home. |
| **Mood Town room-selection as personalized entry** | ❌ | M | P1 | geekpark.net/340288 | After onboarding, user picks which AI "room" to enter based on what they want to talk about (work stress / romance / loneliness / self-doubt / decision / future). Becomes a long-term preference signal. |

---

## 7. Content (educational, courses, classes, blog)

**Status:** No fresh evidence Cece ships structured courses / classes. Prior inventory had this as P3. *Confirming* as P3 — they monetize through human advisors, not through courses. Do **not** invest here.

| Feature | Arcana | Effort | Priority | Evidence | Notes |
|---|---|---|---|---|---|
| Blog-as-entry-point (SEO) | ✅ (tarotlife.app shipped) | — | — | *no Cece evidence* | Our moat. Cece has zero SEO footprint in EN. |
| Video lessons / courses | ❌ | XL | DROP | **unverified** | No 2024+ source. Skip. |
| Guided audio meditations | ❌ | L | P2 | cece.com homepage mentions `冥想` (meditation) | Unverified how deep. Cheap to ship as a library of 10 guided-audio files keyed to mood. |

---

## 8. Platform features (Apple Watch, widgets, iMessage, Siri, lock-screen)

**Summary:** Covered above in §5. Cece ships none; these are *opportunities*, not gaps. Listed as P2-P3 because we should ship community + Mood Town + marketplace first — but they become important for App Store Editorial features in 2026.

---

## Priority rollup — top-10 P0/P1 missing features ranked by (impact × confidence) / effort

1. **AI Mood Town (themed-environment AI companions)** — P0, M — we have the AI infra, we lack the thematic UX wrapping. ROI: very high.
2. **Quiz-result interactive discussion threads** — P0, M — single best community wedge; converts quiz-takers into daily-returners.
3. **First-month intro subscription ($1.49)** — P0, S — RevenueCat config. ~4 hours. 40-60% trial-to-paid uplift.
4. **Dual MBTI compat invite flow polished end-to-end** — P0, S — flag already on; finish the share loop, viral acquisition channel.
5. **Coin-pack entry at $0.85** — P0, S — impulse-purchase anchor, ladder to Moonstone pricing.
6. **Destiny Index Synastry score + share PNG** — P1, S — wraps existing synastry in a viral one-number + shareable card.
7. **Lucky Map (astrocartography Google-Map embed)** — P1, M — unique-in-Western-market feature; high screenshot appeal.
8. **Yearly "lucky color + archetype" Jan 1 drop** — P1, S — guaranteed ~3-5x DAU spike on Jan 1 + massive organic social.
9. **Proactive AI push notifications** — P1, M — Cece's 2025-2026 bet; copy it before they dominate the category.
10. **OCR emotion extraction from screenshots** — P1, M — viral-by-default "decode his text" feature; hits Gen Z relationship-advice market hard.

**Above-but-Apple-native (bonus moat, not a Cece gap):**

- Lock-Screen widgets + Siri Shortcut + iMessage sticker pack. Cece has none of these. These plus the top-10 put us meaningfully ahead of Cece *on iOS only*, which is the premium-paying half of our market.

---

## Sources

- [cece.com](https://www.cece.com/)
- [cece.com/introduce](https://www.cece.com/introduce/)
- [cece.com/product](https://www.cece.com/product/)
- [App Store listing via MWM mirror](https://mwm.ai/apps/ce-ce-nu-xing-qing-gan-qing-su-zhi-bo-she-qu/756771906)
- [ai-bot.cn/cecelive](https://ai-bot.cn/cecelive/)
- [GeekPark — AI 心情小镇 deep-dive](https://www.geekpark.net/news/340288)
- [GeekPark — 2025 user guide](https://www.geekpark.net/news/348292)
- [GeekPark — founder interview 2025](https://www.geekpark.net/news/352673)
- [PingWest — 2024 annual report recap](https://www.pingwest.com/a/301427)
- [tech.china.com — 2025 AI playbook](https://tech.china.com/articles/20250417/202504171661508.html)
- [Rest of World — 2023 Tencent/Cece investigative](https://restofworld.org/2023/tencent-cece-spirituality-app/)
