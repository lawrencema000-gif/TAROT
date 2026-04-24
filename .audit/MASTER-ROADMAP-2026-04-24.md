# Arcana → Master Feature Roadmap (2026-04-24)

Consolidates:
- [CECE-COMPLETE-INVENTORY-2026-04-24.md](CECE-COMPLETE-INVENTORY-2026-04-24.md) (13 categories, ~500 lines, all surfaces + locales of 测测 cece.com)
- [CECE-MISSING-FEATURES-2026-04-24.md](CECE-MISSING-FEATURES-2026-04-24.md) (CN deep-scrape appended)
- [CECE-MISSING-FEATURES-FULL.md](CECE-MISSING-FEATURES-FULL.md) (23 Apr baseline)
- [BAZI-IMPLEMENTATION-PLAN-2026-04-24.md](BAZI-IMPLEMENTATION-PLAN-2026-04-24.md) (Bazi phased plan)
- [WEB-FEATURE-TEST-GUIDE.md](WEB-FEATURE-TEST-GUIDE.md) (what we currently ship)

**Headline:** a **lot** of the top-25 is already built and flag-gated for admin only. The single highest-leverage move is a flag rollout, not new engineering.

---

## Phase 0 — Flag rollouts (ZERO engineering, ~1-2 days of smoke-testing)

Everything below already ships on `feature/iching`. Flag is admin-only in prod. Plan: smoke-test on the `audit-smoke` Netlify preview (which now forces all flags on via `VITE_AUDIT_SMOKE=true`), then flip the DB `rollout_percent` to 100 for anything that passes.

| # | Feature | Flag | Status | Notes |
|---|---|---|---|---|
| 14 | I-Ching 64 hexagrams + coin toss | `iching` | Built | Just flag-flip |
| 15 | Human Design chart | `human-design` | Built | Just flag-flip |
| 16 | Whispering Well (anonymous confessional) | `whispering-well` | Built | Just flag-flip |
| 17 | Community feed | `community` | Built | Just flag-flip |
| 18 | Transit-on-natal daily | inside premium horoscope | Built | Already in chart wheel |
| 19 | Natal chart full graphic wheel | `natal-chart-report` | Built (premium) | Already renders SVG + tabs |
| 20 | Synastry chart | inside `natal-chart-report` | Built | Synastry tab on chart wheel |
| — | Bazi V1 (4 pillars + Day Master + element balance) | `bazi` | Built but shallow | See Phase 2 for upgrades |
| — | Runes, Dice, Mood diary, Partner compat, Dream interpreter, Feng Shui | 6 flags | Built | Just flag-flip |
| — | AI Companion (4 personas) | `ai-companion` | Built | Consider renaming per Phase 3 |
| — | 3-sec reading + Tarot companion | `ai-quick-reading`, `ai-tarot-companion` | Built | Just flag-flip |
| — | Moonstones + daily check-in + top-up | `moonstones`, `moonstone-topup` | Built | Needs Stripe products + RevenueCat config |
| — | Career / Year-Ahead / Natal reports (pay-per) | 3 flags | Built | Needs Stripe products |
| — | Referral + Compat invite | `referral`, `compat-invite` | Built | Just flag-flip |
| — | Live rooms (text) | `live-rooms` | Built | Voice needs LiveKit env |
| — | Sandbox (3D) | `sandbox` | Built | Just flag-flip |

**Phase 0 action list:**
1. Re-run the 3-agent QA smoke test against `audit-smoke--arcana-ritual-app.netlify.app` **with isolated browser contexts this time** (prior pass had cross-contamination). Log bugs to a new punch list.
2. Fix any P0 bugs surfaced.
3. Migration: bump `rollout_percent = 100` and `enabled = true` on each of the above flags, with explicit allowlists removed. One migration, ~30 flags.
4. Configure Stripe products for the 3 reports + 5 moonstone top-up tiers.
5. Configure RevenueCat offerings (web + iOS + Android).

**Time estimate:** 2-3 days including Stripe + RevenueCat config.

---

## Phase 1 — Bazi depth (1 engineer-week)

Fix the credibility gap on Bazi. See full plan at [BAZI-IMPLEMENTATION-PLAN-2026-04-24.md](BAZI-IMPLEMENTATION-PLAN-2026-04-24.md) for detail. First PR ships 5 classical layers on top of our existing V1:

1. **Ten Gods (十神)** table on each non-day pillar — S
2. **Hidden Stems (藏干)** below each branch — S
3. **Nayin (纳音)** 60-cycle sound-element for the Year pillar — S
4. **Strong/Weak Day Master (身强/身弱)** diagnosis badge — S
5. **Favorable Element (用神)** + lucky color / direction / number / career — S-M
6. **五行穿衣 Today's outfit** widget on Home — S (depends on #5)

Phase 1 of the Bazi plan; Phases 2-5 (ephemeris accuracy, 大运/流年, 合婚, baby naming, 60-甲子 collection) queue behind.

**Why this Phase goes second** (not last): the 五行穿衣 daily outfit widget is in the top-25 list as a retention hook, and Bazi Phase 1 is the cheapest path to it.

---

## Phase 2 — Top-25 net-new features from the cece complete inventory

Ordered by fun-factor × shipping-simplicity. `[FLAG]` = already built, rollout in Phase 0. `[NEW]` = net-new build.

### Divination
| # | Feature | Tag | Effort |
|---|---|---|---|
| 1 | **Lucky Map** (astrocartography-lite) | NEW | M |
| 1b | **Peach-Blossom City** (love-lines on map) | NEW | S (shares Lucky Map's Google-Maps embed) |
| 14 | I-Ching 64 hexagrams | FLAG | — |
| 15 | Human Design | FLAG | — |
| 18 | Transit-on-natal daily chart | FLAG | — |
| 19 | Natal full-wheel render | FLAG | — |
| 20 | Synastry compat chart | FLAG | — |

### AI
| # | Feature | Tag | Effort |
|---|---|---|---|
| 3 | **AI 3-second smart Q&A** (type Q → instant reading) | FLAG (ai-quick-reading) | — |
| 4 | **AI persona "Companion Little Star"** with pgvector memory | PARTIAL | M to name + polish a single hero persona vs our 4 generic ones |
| — | **Proactive AI morning/evening check-in push** (Cece's killer feature) | NEW | M — scheduled edge function + OneSignal push |

### Quizzes + Fun
| # | Feature | Tag | Effort |
|---|---|---|---|
| 2 | **Dual-MBTI compat share-link** (pre-filled invite) | FLAG (compat-invite needs polish) | S |
| 7 | **Pick-a-Card daily swipe** (single-card, 30-sec) | NEW | S |
| 8 | **Love Tree attachment visualizer** (gamified attachment-style) | NEW | S |
| 21 | **Soulmate score 0-100** share card | NEW | S (uses synastry we already compute) |
| 22 | **Auto-shareable cosmic card after every reading** (PNG export) | NEW | S |
| 24 | **Daily 3-question micro-quiz** (tiny habit) | NEW | M — needs weekly-aggregate insight view |
| 25 | **Career / Occupational Talent Report** ($9.99 à la carte) | PARTIAL | M — we have Career Archetype Report; rebrand + extend |

### Daily engagement
| # | Feature | Tag | Effort |
|---|---|---|---|
| 5 | **Emotion diary — 30-day mood curve** | PARTIAL | M — we have mood-diary single-day; extend to chart |
| 6 | **Daily AI morning check-in push** (duplicate of AI section) | NEW | M |
| 23 | **Daily Energy Mission** ("today: write 3 gratitudes") | NEW | S |

### Social
| # | Feature | Tag | Effort |
|---|---|---|---|
| 9 | **Friend circle MBTI distribution chart** | NEW | M — requires friend lists (we don't have) |
| 16 | **Whispering Well anonymous** | FLAG | — |
| 17 | **Community feed + topic channels** | FLAG | — |

### Monetization
| # | Feature | Tag | Effort |
|---|---|---|---|
| 10 | **Moonstones + 5-tier pack ladder** ($0.85 / $2.99 / $6.99 / $12.99 / $24.99) | PARTIAL | S in code, L in Stripe+RC config |
| 11 | **Intro-month subscription discount** (~$1.49 → $7.99 step-up) | NEW | S in code, M in RC config |
| 12 | **Pay-per-report** (career / year-ahead / natal) | FLAG | — |
| 13 | **Referral bonus** (give + get coins) | FLAG | — |

---

## Phase 3 — Additional Bazi phases

Per [BAZI-IMPLEMENTATION-PLAN-2026-04-24.md](BAZI-IMPLEMENTATION-PLAN-2026-04-24.md):
- Phase 2 — Solar-term ephemeris (1 wk) — fixes accuracy
- Phase 3 — 大运 / 流年 / today's luck (1.5 wk) — retention layer
- Phase 4 — 合婚 + AI-Bazi + Bazi→tarot bridge (1 wk)
- Phase 5 — benched (baby naming, 12 life stages, 黄道吉日, 60 甲子 collection)

---

## Phase 4 — Classical Chinese surface (cece WHITESPACE — they skip these)

From CN deep scrape — Cece intentionally skips folk divination. Opportunity to out-flank in the Chinese market:
- **Huangli 黄历** daily almanac (宜/忌) — P1, S
- **Fortune sticks 抽签** (Guanyin / Yue Lao / Lü Zu) — P2, S (public-domain content)
- **称骨算命** bone-weight — P2, S
- **姓名测试** name-stroke analysis — P2, M
- **择日** auspicious-day picker (Bazi-driven) — P1, M (ties to Bazi Phase 3)

---

## Phase 5 — iOS platform moat (cece has ZERO)

Cece ships nothing for iOS deep-integration. Every one is a pure moat, not a gap. Opportunistic:
- Home Screen widget (daily card + mood)
- Lock Screen widget (daily oracle)
- Live Activities (reading-in-progress, advisor session, meditation timer)
- Dynamic Island
- Siri Shortcut ("Siri, draw my daily card")
- iMessage app / sticker pack
- Apple Watch complication
- Vision Pro app (cece has this — we don't)

---

## Recommended sequencing

**Week 1 — Phase 0 flag rollout.** Biggest ROI. 10+ top-25 features go live with ~3 days of smoke + Stripe config.
**Week 2 — Bazi Phase 1 first PR.** 5 classical layers + 五行穿衣 widget.
**Week 3 — Pick-a-Card + Love Tree + Soulmate score + Shareable cosmic card + Daily Energy Mission.** Five single-day PRs stacked — the "fun" wedge.
**Week 4 — Proactive AI check-in push + Persona renaming + Emotion-diary 30-day chart.**
**Week 5 — Lucky Map + Peach-Blossom City.**
**Weeks 6-8 — Bazi Phase 2 (ephemeris) + Phase 3 (大运/流年).**
**Weeks 9-10 — Bazi 合婚 + Friend Circle MBTI + Huangli.**

---

## Items explicitly SKIPPED (don't build)

- Cece's 20+ chart variants (Astrolog/Janus/etc.) — pro-astrology niche
- Face / palm / numerology (姓名) pro-grade — unless user demands
- Cece's 8000-expert voice-advisor marketplace — we do live rooms + advisor booking, not 1:1 phone-calls
- Cece's long-form video lessons (they have a modest library; 36kr article downplays) — revisit in 2027 if content ROI proves out elsewhere

---

## User decisions (locked 2026-04-24)

1. **Market: Western only.** Eastern mysticism stays as a flavor, not a focus. Translate Bazi/I-Ching into accessible Western-audience language. Drop the hard CN-only folk surfaces: 黄历 almanac, 抽签 fortune sticks, 姓名 name analysis, 择日 date picker, 称骨 bone-weight, 手相 palm, 面相 face. Skip Ziwei Doushu entirely.
2. **Bazi depth is premium.** Free tier = chart + Day Master + 5-element balance. Premium = Ten Gods, Favorable Element, 大运 (rename → "Major Life Cycles"), 流年 (rename → "Year Ahead"), 合婚 compat (rename → "Soul Pairing").
3. **Rollout cadence: one feature at a time.** No mass flag flip. Each flag goes through smoke → small rollout → 100%, one per week.

## Western-audience naming rewrite

Use these in UI copy. Internal code keeps Chinese terms for engineer clarity.

| Chinese classical | Western-audience name |
|---|---|
| 八字 (Bazi) | "Four Pillars" / "Elemental Chart" |
| 日主 Day Master | "Inner Element" / "Core Element" |
| 十神 Ten Gods | "Inner Forces" / "Character Archetypes" |
| 纳音 Nayin | "Soul Sound" (optional; or just skip) |
| 藏干 Hidden Stems | "Hidden Influences" |
| 身强/身弱 | "Dominant / Receptive Chart" |
| 用神 Favorable Element | "Your Supporting Element" |
| 大运 Major Luck Cycles | "Major Life Cycles" |
| 流年 Annual Luck | "Year Ahead" |
| 合婚 Bazi Compat | "Soul Pairing" |
| 五行穿衣 Today's Outfit | "Today's Lucky Color" (drop the Chinese framing) |

**Reframe principle:** lean on the universal archetypes (Wood / Fire / Earth / Metal / Water as elements — these resonate with Western users who already know "elements" from astrology). Drop anything that requires explaining Chinese folk culture.

## Revised sequencing (given user decisions)

Old "Phase 0 mass flag flip" is gone — replaced by a one-at-a-time list.

### The one-at-a-time flag rollout queue

Feature flipped → smoke on prod 48h → if clean, next. If bugs, fix before moving on. ~1 feature per week.

**Ordered by (Western-appeal × simplicity × low-risk)** — ship this order:

1. **Natal chart full-wheel render** (`natal-chart-report`) — universally Western, already built, premium. *Already partially shipping via paywall.*
2. **Transits-on-natal tab** — same wheel, Western, already built.
3. **Synastry (2-person compat chart)** — romance angle, Western, already built.
4. **Runes cast** (`runes`) — Norse/Elder Futhark, Western-friendly mysticism. Already built.
5. **Dice oracle** (`dice`) — generic oracle, already built.
6. **Whispering Well anonymous feed** (`whispering-well`) — community + mental health angle, Western-appropriate. Already built.
7. **Community feed** (`community`) — foundation. Already built.
8. **Pick-a-Card daily swipe** — NEW, 1-day build, top-25 fun feature.
9. **Auto-shareable cosmic card (PNG export on reading complete)** — NEW, 1-day, high viral hook.
10. **Daily Energy Mission** — NEW, 1-day, gamification.
11. **I-Ching 64 hexagrams** (`iching`) — Eastern but Western-popularized (Jung, PKD, Sagan). Already built.
12. **Human Design chart** (`human-design`) — Western-created Eastern fusion. Already built.
13. **Bazi V1 + Phase-1 upgrades, premium only** — ship as a premium feature after upgrade. ~1 week build + 1 week soak.
14. **AI 3-sec reading, AI tarot companion, AI journal coach** — already built, roll out individually.
15. **Mood diary** (`mood-diary`) — extend to 30-day curve. Already built.
16. **Partner compat quiz** (`partner-compat`) — already built.
17. **Dream interpreter** (`dream-interpreter`) — already built.
18. **Soulmate score 0-100 share card** — NEW, 1-day.
19. **Love Tree attachment visualizer** — NEW, 1-2 days.
20. **Proactive AI morning/evening check-in push** — NEW, 2-3 days (edge cron + OneSignal).
21. **Moonstones + daily check-in + top-up** — we have it; needs Stripe products + RC config.
22. **Referral + Compat invite** — polish the dual-MBTI compat share.
23. **Lucky Map + astrocartography-lite** — NEW, 3-5 days.
24. **Feng Shui Bagua** (`feng-shui`) — SOFT DEMOTE. Keep it built but low-priority; Western users mostly know "feng shui" as a joke. Possibly relabel as "Your Space's Energy Map".
25. **Ayurveda Dosha quiz** — Eastern but popularized in Western wellness circles.

### Features explicitly DROPPED (per user decision: Western-only)

- Huangli 黄历 daily almanac (宜/忌)
- Fortune sticks 抽签
- Bone-weight 称骨算命
- Name-stroke analysis 姓名测试
- Auspicious-date picker 择日
- Palm reading 手相
- Face reading 面相
- Ziwei Doushu 紫微斗数
- Lunar Mansions 二十八宿
- Chinese-language-only marketing surfaces
- Cece's 20+ pro-astrology chart variants (Astrolog/Janus/Winstar style)

---

## Bazi plan — paywall decisions

Layered free → premium:

**FREE tier (Bazi page, no upsell friction):**
- Four-pillar chart visual
- Day Master (rebranded "Inner Element")
- Five-element balance bars
- One-line archetypal personality ("Yang Fire: the inspirer")

**PREMIUM tier (Moonstones 150 OR $6.99 unlock, OR included in subscription):**
- Ten Gods / Inner Forces table
- Hidden Influences (hidden stems)
- Strong / Receptive chart diagnosis
- Supporting Element (用神) with lucky color / direction / number / career hints
- Today's Lucky Color widget
- Major Life Cycles (大运 timeline)
- Year Ahead (流年 reading, 12-month breakdown premium, 1-line headline free)
- Today's energy overlay on chart
- Soul Pairing compat with another person

**SKIP (per user decision):**
- Baby / pen naming (姓名)
- 黄道吉日 auspicious-date picker
- 12 Life Stages (长生十二宫)
- 60 甲子 collection gamification (this one was fun but too Chinese-niche)

First Bazi PR = the Phase 1 classical layers from [BAZI-IMPLEMENTATION-PLAN-2026-04-24.md](BAZI-IMPLEMENTATION-PLAN-2026-04-24.md), all behind the premium gate. ~1 week.
