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

## Open questions for the user

1. **Which market are we prioritizing?** CN-parity build and OUT-FLANK build are different 3-month roadmaps (Cece skips 黄历/手相/面相/抽签/姓名/择日 — that's our whitespace).
2. **Free vs paid for Bazi?** Cece paywalls Bazi depth. We could free-tier the chart and paywall 大运/流年/合婚.
3. **How fast do you want to flip flags?** Phase 0 can be done in 3 days; more cautious rollout via `rollout_percent = 10 → 50 → 100` takes 1-2 weeks.
