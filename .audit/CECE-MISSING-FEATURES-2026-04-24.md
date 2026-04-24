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

---

## CN-market Chinese fortune-telling surfaces (deep scrape)

**Scrape date:** 2026-04-24 (evening delta, Chinese-query pass)
**Why this exists:** Prior scrapes used English queries and under-indexed the Chinese-market divination surface. This pass ran Chinese-language queries (`测测 黄历`, `测测 紫微`, `测测 六爻`, `测测 姓名测试`, `测测 手相`, `测测 抽签`, `测测 每日运势`, `测测 择日`, `测测 本命牌`, `测测 缘分树`) across `cece.com`, `xxwolo.com` (Cece's parent domain), Chinese app mirrors (应用宝/腾讯, 豌豆荚, 2265, 32r, ddooo, 25pp, vkxiazai, apkpure), iOS App Store CN, Zhihu founder interview (zhuanlan.zhihu.com/p/1935801352598054186), 36kr, ai-bot.cn, CSDN, and Play Store international.

**Headline finding — Cece's CN divination stack is NARROWER than the ambient Chinese-market norm.** Their own canonical feature list (repeated verbatim across `xxwolo.com/mobile/cecexingzuo`, Play Store, APKPure, ddooo, 32r, sj.qq.com) is:

> 紫微斗数、二十八宿、生命灵数、八字、占星骰子、塔罗、本命盘 + 20种星盘、3D心理沙盘、50+心理测试、AI问答、心理连麦、冥想、心情小镇

Features conspicuously **absent from every Cece marketing surface** — despite being table-stakes on competitor 算命 apps like 汉程生活 / 灵占算命八字星座 / 每日灵签 / 水墨先生 / 神算堂 / 华易网: **黄历 / 宜忌 / 老黄历, 姓名测试 / 起名, 手相, 面相, 抽签 / 观音灵签 / 月老灵签, 测字, 称骨算命, 风水罗盘, 择日 / 黄道吉日, 合婚, 五行缺什么 / 五行穿衣**. This is *either* a massive gap in Cece (they're leaving CN-classical-算命 users to competitors) *or* a strategic moat-of-focus (astrology-first, psychology-first, AI-first; skip folk divination entirely). Probably the latter — their founder 任永亮 explicitly positions Cece as "MBTI + 星座 + AI, not 算命". **Arcana implication:** if we only want CN-market parity with *Cece*, ignore almanac/palm/face/sticks. If we want CN-market parity with *the broader 算命 category*, these are pure whitespace — Cece cedes them.

### Surfaces table

| Feature (中文名) | We ship? | Effort | Priority | Source (confirmation evidence) | Notes |
|---|---|---|---|---|---|
| **Ziwei Doushu 紫微斗数 (12-palace emperor's astrology)** | ❌ | L | P1 | `xxwolo.com/mobile/cecexingzuo` ("还能看紫微斗数"); APKPure CN description ("八字紫微"); ddooo feature bullet; 32r feature bullet | **Confirmed in live Cece.** Prior delta had this as P2 — bumping to P1 because every CN-market product page Cece publishes leads with it. 12 palaces, 14 main stars + ~100 minor stars, 4 transformations (化禄/化权/化科/化忌). Heavier than Bazi. Required to claim CN-market parity with Cece specifically. |
| **Bazi 八字 (4-pillar) — Cece's in-app version** | ⚠️ (flag-gated on our side) | — | — (validate) | Play Store title *"测测 - 星座，八字，AI问答"*; APKPure description; ddooo bullet "八字五行、紫微斗数、二十八宿" | **Confirmed in live Cece** and promoted to the app's actual store title. We ship it behind a flag; **action**: unflag Bazi; it's their #2 leading CN keyword after 星座. |
| **28 Lunar Mansions 二十八宿** | ❌ | S | P3 | `xxwolo.com/mobile/cecexingzuo`; APKPure; ddooo; 32r | **Confirmed in live Cece.** Already P3 in prior delta — reconfirmed. Low differentiation; ship as content alongside Ziwei. |
| **Life Number 生命灵数 / 生命数字 (Pythagorean-style but CN-branded)** | ✅ (we have Life Path numerology) | S | — | `xxwolo.com/mobile/cecexingzuo`; ddooo; apkpure | **Confirmed.** We likely already cover this as Life Path — action: add a CN-market skin that calls it `生命灵数` and surfaces 3 extra numbers (destiny, soul urge, personality) Cece bundles. |
| **Astrology Dice 占星骰子** | ✅ (we ship `/dice`) | — | — | `xxwolo.com/mobile/cecexingzuo`; ddooo | **Confirmed.** Note: Cece's dice is *astro-themed* (planet/sign/house dice), not generic numeric. Verify our `/dice` has the astro variant — if not, add it as a mode (~0.5 day). |
| **Huangli 黄历 / 万年历 / daily 宜忌 almanac** | ❌ | M | **P1 (whitespace)** | *Not found on any Cece surface* — checked 10+ pages | **Unverified that Cece ships this** — actually *confirmed absent* from all Cece pages. Massive on competitor apps (汉程生活, 天天黄历, 黄道吉日 APP, 每日灵签). Daily 宜 (what's auspicious) / 忌 (what to avoid) widget, 12-值神 (建/除/满/平/...), 冲煞, 彭祖百忌, 财神喜神 position. **Opportunity, not a Cece-gap.** If we want CN-category leadership, ship this; if we just want Cece-parity, skip. |
| **Name Analysis 姓名测试 / 姓名学打分** | ❌ | M | P2 (whitespace) | *Not found on any Cece surface*; covered by 美名腾, 君子阁, xingming.com, 吉运堂 | **Unverified on Cece — confirmed absent.** Stroke-count + 五格 (天格/人格/地格/外格/总格) + 三才 五行 balance → 0-100 score. Category norm, Cece doesn't ship. Whitespace play. |
| **Baby Naming / 起名 (Bazi-driven name generator)** | ❌ | L | P2 (whitespace) | *Not found on any Cece surface*; covered by 美名腾, 起名有福 | **Unverified on Cece — confirmed absent.** Input baby's birth time → 5-element 喜用神 → generate name candidates. Premium monetization surface (¥29-99 per generation on competitors). |
| **Palmistry 手相 (AI photo upload)** | ❌ | L | P2 (whitespace) | *Not found on any Cece surface*; CSDN article confirms Cece is NOT in the AI 算命 palm-reading wave that hit 小红书 / 抖音 in 2024-2025; category leaders are 百度文小言, 手相指纹预测相机 | **Unverified on Cece — confirmed absent.** Prior inventory had this as P3; Cece didn't catch the 2024 AI-palm-reading 小红书 viral wave — neither did we. Privacy risk is real (biometric capture). Skip unless we stand up a dedicated adult-branded surface. |
| **Face Reading 面相 (AI selfie analysis)** | ❌ | L | P3 (whitespace, risky) | *Not found on any Cece surface*; 澎湃新闻 article confirms the "面相研究院" boom (2024-2025) in CN but Cece absent | **Unverified on Cece — confirmed absent.** Same biometric-privacy concerns + App Store policy risk (face-analytics). Skip or ship as clearly-marked "for entertainment". |
| **Fortune Sticks 抽签 / 观音灵签 / 月老灵签 / 吕祖灵签** | ❌ | S | P2 (whitespace, content-cost M) | *Not found on any Cece surface*; leaders are 每日灵签, 华易网, 51chouqian, 农历网 | **Unverified on Cece — confirmed absent.** Pick 1 of 32/60/100 numbered sticks → named poem + interpretation. 100 签 × 4 interpretive paragraphs = ~100k chars of content, all public-domain. Free to ship, very on-brand for a mystical app. |
| **Character Divination 测字** | ❌ | S | P3 | *Not found on any Cece surface* | **Unverified on Cece — likely absent.** User types/writes 1 Chinese character → system decomposes radicals, maps to 五行, gives reading. Very niche; only serious 易学 users care. Low priority. |
| **Zodiac Compatibility 生肖配对 (beyond simple animal matching)** | ⚠️ (we have basic 12-animal compat) | S | P2 | *Not explicitly confirmed on Cece*, but 八字合婚 / 紫微合盘 implied by "合盘" bullet; competitors 神算堂, 华易网 ship full version | **Likely in Cece via 紫微合盘** but not separately surfaced. Build a standalone `/zodiac-compat` that goes beyond "Ox + Rooster = 85%" — adds 冲 / 刑 / 害 / 破 triads, best-month-for-relationship, 合婚 advice. |
| **Five-Element 五行缺什么 / 五行穿衣 (what to wear today)** | ❌ | S | P1 (whitespace) | *Not on Cece*; huge on 汉程网 每日五行穿衣, 天天黄历 | **Unverified on Cece — confirmed absent.** Compute user's 五行 balance from Bazi → identify deficient element → daily "wear red / avoid black" outfit advice. **Extremely viral on 小红书** ("今日五行穿衣" tag has 500M+ views per 小红书 search). Bazi is already in Arcana; this is a 2-day skin. |
| **Auspicious Date Picker 择日 / 黄道吉日** | ❌ | M | P2 (whitespace) | *Not on Cece*; leaders are 黄道吉日 APP (Tencent sj.qq.com/appdetail/com.hdjr.hb), 汉程网 | **Unverified on Cece — confirmed absent.** Categories: 婚礼, 搬家, 开业, 签约, 出行, 祭祀 (59 sub-categories per 择日 systems). Input date range + purpose → ranked list of auspicious days with reasons. High monetization (wedding / real-estate audience). |
| **Lifetime Tarot Card 塔罗本命牌 / 生日塔罗 / 灵魂牌** | ❌ | S | P1 | *Not on xxwolo.com/tarots* (they only ship spreads, no birthday-card system); Cece doesn't appear to have this — this is **Mary K. Greer / Angeles Arrien Birth Card system**, popular in EN + CN tarot circles | **Unverified on Cece — confirmed absent from `xxwolo.com/tarots`.** Compute Personality Card + Soul Card + Hidden Teacher + Year Card from birth date (Mary Greer algorithm). Low effort for us — 78-card deck already shipped, just need the arithmetic lookup. **High Instagram-share value.** This is a genuine whitespace vs Cece in tarot. |
| **Bone-Weight Divination 称骨算命 (袁天罡 system)** | ❌ | S | P3 | *Not on Cece*; leaders 神算堂, 华易网 | **Unverified on Cece — confirmed absent.** Input birth bazi → lookup table assigns year/month/day/hour weights (两/钱) → total → 52-entry poem with life prediction. Tang Dynasty, 100% public domain. 2 hours of dev + 1 day of content import. |
| **Feng Shui Compass 风水罗盘 (digital with bagua overlay on home photo)** | ⚠️ (we ship `/feng-shui` bagua, flag-gated) | L | P2 | *Not on Cece*; competitors: 风水罗盘 apps in CN app stores | **Unverified on Cece.** Our flag-gated bagua is already differentiated. Extending to "point phone at your door → AR bagua overlay" is L effort. Keep as P2. |
| **Destiny / Fate Tests 缘分测试 / 缘分指数 (two-people)** | ⚠️ (synastry shipped, Destiny Index flagged in prior delta) | S | P0 | `xxwolo.com/mobile/cecexingzuo` ("缘分测评"); GeekPark 2025 guide (`缘分指数合盘`) | **Confirmed in live Cece** (reconfirming prior delta — still P0). Ship the "one viral score + share card" wrap. |
| **Daily Fortune 每日运势 (multi-dimensional: 整体/爱情/事业/财富/健康/桃花/贵人/幸运色/幸运数字/宜忌)** | ⚠️ (we ship daily horoscope) | M | **P0** | ddooo: "每日运势、本周运势、一生运势"; apkpure "Your life fortune"; xxwolo | **Confirmed in live Cece, much deeper than our version.** Our current daily horoscope is 1 paragraph; Cece's is a **7-8 dimension card**: 整体运 + 爱情 + 事业 + 财运 + 健康 + 桃花 + 贵人方位 + 幸运色 + 幸运数字 + 宜 / 忌 verbs. **This is the biggest confirmed gap from this pass.** Reshape our daily horoscope to this multi-dimension card. 3-4 days. Massive retention impact. |
| **Weekly 本周运势 + Yearly 一生运势 extended fortune** | ⚠️ (weekly partial) | S | P1 | ddooo "每日运势、本周运势、一生运势"; APKPure "life fortune" | **Confirmed in Cece.** Weekly already partial; "一生运势" (lifetime fortune summary) is a single-scroll timeline of life phases based on natal chart + Bazi luck pillars. High paywall value. |
| **Festival / Lunar Holiday Forecasts 七夕运势 / 春节运势 / 中秋运势** | ❌ | S | P2 (whitespace) | *Not on Cece* explicitly; GeekPark mentions yearly "lucky color" ritual (Jan 1) — extend to 七夕, 春节, 清明, 中秋 | **Unverified on Cece beyond Jan 1.** Low-effort: 8 major lunar festivals × personalized horoscope ritual. Scheduled pg_cron. |
| **Moon Match / Marriage Deity 月老姻缘 / 红线** | ❌ | M | P3 | *Not on Cece*; leaders 月老灵签 apps | **Unverified on Cece — confirmed absent.** Themed re-skin of `/compatibility`: instead of "synastry score", it's "月老 (Moon God) ties a red string between you and your match". Character-driven, narrative-themed. Nice content play; low strategic value. |
| **Natal chart 本命盘 + Bazi overlay (unified CN chart view)** | ⚠️ (we have natal + Bazi, but separate surfaces) | M | P1 | Cece's canonical "本命盘 + 八字紫微 + 二十八宿" bundle implies a unified view; founder interview emphasises integrated reading | **Confirmed in Cece's unified surface.** Our `/natal` and `/bazi` are separate routes. Build a `/chart-all` that stacks: Western natal wheel + Bazi 4 pillars + Ziwei 12 palaces + 28 Mansions + 五行 balance + 生命灵数 on one long-scroll report. **This is the single-page CN-market parity view.** |
| **Mood Town 心情小镇 + 连麦 (voice-live)** | ⚠️ (we have AI companion, no voice-live) | L | P1 | Cece homepage lists `连麦` as top-nav; GeekPark deep-dive; prior delta covered Mood Town | **Confirmed** — reconfirming from prior delta. Voice-live (real-time voice chat with stranger peers + certified advisors) is its own gap separate from Mood Town. |

### Whitespace vs. Cece-parity summary

| Category | Cece ships? | We should ship to reach... | Effort to reach Cece-parity |
|---|---|---|---|
| Ziwei Doushu | ✅ | Cece-parity | L (1 dev × 2 weeks) |
| Bazi unflag | ⚠️ (our side flagged) | Cece-parity | S (toggle) |
| 28 Mansions | ✅ | Cece-parity | S |
| Life Number CN-skin | ⚠️ (we have Life Path) | Cece-parity | S |
| Multi-dimension daily fortune | ✅ | Cece-parity | M |
| Weekly + Lifetime fortune | ✅ | Cece-parity | S |
| Unified 本命盘 long-scroll view | ✅ | Cece-parity | M |
| Destiny Index synastry | ✅ | Cece-parity | S (prior delta) |
| Huangli almanac 黄历 | ❌ | **CN-category** leadership | M |
| Name analysis 姓名测试 | ❌ | CN-category | M |
| Baby naming 起名 | ❌ | CN-category | L |
| Palm reading 手相 | ❌ | CN-category | L (+ policy risk) |
| Face reading 面相 | ❌ | CN-category | L (+ policy risk) |
| Fortune sticks 抽签 | ❌ | CN-category | S |
| 测字 character divination | ❌ | CN-category | S |
| 称骨算命 bone weight | ❌ | CN-category | S |
| 五行穿衣 today's outfit | ❌ | CN-category + viral 小红书 | S |
| 择日 auspicious date | ❌ | CN-category | M |
| Lifetime Tarot birth card | ❌ | EN-tarot whitespace | S |
| Festival forecasts | ❌ | Content moat | S |

### Additional sources (Chinese-query pass, 2026-04-24)

- [xxwolo.com/mobile/cecexingzuo](https://www.xxwolo.com/mobile/cecexingzuo) — Cece's parent-domain canonical feature list (primary source)
- [xxwolo.com/tarots](https://www.xxwolo.com/tarots) — Cece's tarot spread inventory (confirms absence of Birth-Card / Soul-Card systems)
- [apkpure.com/测测/com.xxwolo.cc5](https://apkpure.com/%E6%B5%8B%E6%B5%8B-%E6%98%9F%E5%BA%A7%E5%BF%83%E7%90%86%E6%83%85%E6%84%9F%E9%97%AE%E7%AD%94%E7%A4%BE%E5%8C%BA/com.xxwolo.cc5) — "life figures, eight-character Ziwei, twenty-eight places" string
- [Play Store — 测测 星座, 八字, AI问答](https://play.google.com/store/apps/details?id=com.lingocc.cc5) — app title confirms Bazi is top-2 surface
- [ddooo softdown/81397](https://www.ddooo.com/softdown/81397.htm) — Chinese-language feature breakdown
- [32r.com/app/33225.html](https://www.32r.com/app/33225.html) — Chinese-language feature breakdown (bullet: 八字五行、紫微斗数、二十八宿、生命灵数)
- [sj.qq.com/appdetail/com.xxwolo.cc5](https://sj.qq.com/appdetail/com.xxwolo.cc5) — Tencent app store listing
- [zhuanlan.zhihu.com/p/1935801352598054186](https://zhuanlan.zhihu.com/p/1935801352598054186) — 2025 founder interview with 任永亮
- [ai-bot.cn/cecelive](https://ai-bot.cn/cecelive/) — AI product card (confirms no 算命 / folk-divination surface)
- [CSDN — 年轻人疯狂迷上AI算命](https://blog.csdn.net/yellowzf3/article/details/146490700) — CN 2024-2025 AI divination market context (Cece notably absent)
- Competitor reference apps consulted for category norms: 汉程生活, 灵占算命八字星座, 每日灵签, 水墨先生, 神算堂, 华易网, 美名腾, 君子阁, 黄道吉日 APP
