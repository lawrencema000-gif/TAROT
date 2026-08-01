# Overtake Cece — competitive teardown & execution plan

**Date:** 2026-07-24 · **Target:** 测测 Cece (com.lingocc.cc5, LIGHTFUL AI, intl build 1.0.9 / CN flagship ~10.36)
**Method:** 10-agent scan — Play listing (en+zh incl. embedded reviews), Chinese sources (知乎/小红书/official), English sources + iOS listing, review mining, VIP/pricing teardown, livestream/course economy teardown, 六爻/择日 follow-up — plus a full read-only Arcana feature inventory. One follow-up agent (exact 20-chart-type enumeration) died mid-run; 14 of the 20 types were recovered from CN listings.

## Where Arcana ALREADY leads Cece

- Astrocartography: Celestial Map with 40 planetary lines, 207-city dataset, life-area filters, AI Travel Reading, and Find Your Place city-scoring — Cece has nothing comparable
- Deterministic real-ephemeris engine (astronomy-engine) with stable outputs and versioned interpretation text — directly counters Cece's #1 trust complaint (accuracy drift on every update)
- Public web SEO acquisition surface: 78 card-meaning pages, 42 spread pages, 150+ learn-hub entries, AI blog, URL-shareable readings — Cece has zero international web funnel
- Custom spread builder (up to 13 user-defined positions, saved and playable) — no Cece equivalent
- Self-serve I Ching (64 hexagrams, changing lines), Elder Futhark runes, and Feng Shui (Kua, Bagua, room guidance, annual stars) — Cece offers these only via paid experts or not at all
- Human Design with real computed gates/type/authority/profile and interactive 9-centre bodygraph
- Journal with 21 templates + AI journal coach, and Mood Diary with trend history + AI mood letter — Cece's 'mood curve' is a thin VIP perk
- AI Dream Interpreter (Jungian structured output with offline 168-symbol fallback) — absent in Cece
- Gamification: XP/levels, 48 achievements, streak milestones, Fool's Journey 22-level progression — Cece has none
- People module UX: unlimited saved people, per-person chart pages, AI focus-lens readings — vs Cece's crash-prone 档案/synastry flow on the intl build
- Clean daily-ritual home loop vs Cece's cluttered feed (a documented user complaint)
- Dark-first cosmic design language; Cece's top UX complaints are no dark mode and tiny fonts
- Working international monetization: RevenueCat + Stripe + trial + lifetime; Cece's overseas payments are broken and its Play build is frozen at 1.0.9
- Four-locale localization (en/ja/ko/zh) with localized decks, quizzes, and interpretation corpora — Cece's international content is effectively Chinese-only
- Ethical monetization posture: earn-only moonstones, forced ads disabled, transparent pricing — a trust moat against Cece's 800+ dark-pattern complaints and regulatory overhang

## Gap matrix (Cece feature → our status)

| Gap | Cece feature | Cece depth | Arcana status |
|---|---|---|---|
| **critical** | Paid human expert Q&A marketplace (voice grab-answer, chart attached) | ~20-26k certified 达人; question + chart posts to 抢答区, voice answers in ~1 min, from ¥3 to 30+ coins; the pivot that saved the company; platform takes 30-50% | PARTIAL(advisor directory + profiles + interest capture live; booking, voice, payouts, verification all built but flagged OFF; no async voice-answer Q&A model a |
| **large** | 20-chart-type personal suite (transits, 2nd/3rd progressions, solar/lunar returns, solar arc, Firdaria, mundane sky chart) | Flagship marketing claim '覆盖20种星盘'; 14 named types enumerated in CN listings; free to view, interpretation monetized | PARTIAL(5 types live: natal, transits, secondary progressions, solar return, synastry — all real ephemeris; missing lunar return, tertiary progressions, solar a |
| **large** | AI soulmate portrait (正缘画像) | Image-gen of destined partner from birth data — Cece's documented viral hook for its US/overseas push (800k users headline) | MISSING(Soulmate Score is score+aspects only, no generated portrait image) |
| **large** | Test-taker community + per-test discussion zones + sign zones + chart-sharing posts | 12 sign zones, interest groups, discussion areas attached to test results, chart posts feeding paid expert answers — one of three interaction pillars | PARTIAL(full community feed with 8 topics, reactions, AI moderation pipeline BUILT but flag OFF; no per-test/per-card threads or sign zones) |
| **large** | Per-minute metered live voice consults (连麦) with 10-tier pricing | 0.5-58.56 coins/min across 10 expert levels, 普麦/私麦 modes, surge pricing, 免密支付 auto-deduct (their top complaint source); the highest-margin surface | PARTIAL(LiveKit voice + advisor session pages built, OFF; no per-minute metering, tier ladder, or live billing UI) |
| **moderate** | Relationship chart suite: 比较盘/组合盘/组合推运/时空盘/马盘 (synastry, composite, progressed composite, Davison, Marks) | Five distinct two-person chart techniques with membership-gated interpretation text; covers every mainstream relationship method | PARTIAL(synastry only — People compare, partner-compat adhoc, Soulmate Score; no composite/Davison/progressed-composite/Marks) |
| **moderate** | Zi Wei Dou Shu chart | Ziwei charting with interpretations; accurate legacy implementation (users noticed a regression, proving engagement) | MISSING |
| **moderate** | Unified AI Q&A hub — 3-second answers across all divination tools + daily quota | One AI surface routing star dice/tarot/bazi/natal chart questions, 3s response claim, ~50k users/day on 小测AI; quota (2/day free) drives membership | PARTIAL(pieces exist — AI Quick Reading 3-sec single-shot with natal memory, Tarot Companion, AI Companion, contextual AskOracle buttons — but no single cross-t |
| **moderate** | 16-personality/MBTI with social graph overlay | Revamped test + WeChat-friend compatibility scores + friend-circle 16-type distribution visualization — test results as social objects | PARTIAL(full+quick MBTI, cognitive-function compat layer; compat-invite deep links built but OFF; no friend-distribution graph) |
| **moderate** | 3D psychological sandplay | ~1,000 sand figures, analysis of choice + spatial placement, 4 themes, ~10k uses/day, paid pro interpretation | MISSING |
| **moderate** | Anonymous confession tree hole (心理树洞) / venting | Anonymous emotional posting + 1:1 倾诉 listening services, 7x24 framing — the wedge that justified the psychology pivot | PARTIAL(Whispering Well anonymous mode fully built with distinct palette, flag OFF; no paid listener tier) |
| **moderate** | 24h livestream/audio rooms with gifting | Around-the-clock streamed readings, virtual gifts, group salons; top streamers >¥100k/mo | PARTIAL(Live Rooms MVP: scheduled audio events + RSVP + VoiceStrip, OFF; no gifting/tips economy) |
| **moderate** | Expert certification + supply-side pipeline (exams, tiers, console app) | Credential + 4 AI-graded exams, 10-level ladder gating price, real-time earnings console (测测达人版), internal course academy — leaky (¥2k proxy-exam black market) | PARTIAL(advisor-verify + advisor dashboard pages built, OFF; no exams, tiering, or earnings console) |
| **small** | Transit-computed daily fortune with 0-100 score + daily/weekly/monthly/yearly dimensions | Personal daily score computed from natal+transits, love/career/wealth dimensions; the emotional retention hook users check daily (and complain manufactures anxi | PARTIAL(personalized daily via astrology-daily, weekly/monthly forecasts, personal transit calendar; no headline numeric daily score) |
| **small** | Daily lucky color + shareable lucky map | Granular daily lucky color users dress by; lucky map shared socially (documented acquisition vector) | PARTIAL(Bazi-depth Today's Lucky Color exists; no daily shareable lucky-map artifact) |
| **small** | BaZi module with practitioner-level fields | 取格 (structure), 身强身弱, 喜用神, 空亡, 神煞 lists, five-element analysis — users police these at expert level in reviews | PARTIAL(pillars, day master, ten gods, hidden stems, nayin, strength, supporting element, lucky color + AI reading; missing shensha, kongwang, formal structure  |
| **small** | 28 Lunar Mansions (二十八宿) | Birth-date mansion reading with detailed explanations — a rarity differentiator | MISSING |
| **small** | Astro dice (占星骰子: planet/sign/house) with AI interpretation | Western astro-dice casting wired into AI Q&A and community expert interpretation | PARTIAL(generic 3-dice numeric oracle with 16 readings; not planet/sign/house astro dice, no AI layer) |
| **small** | Personalized AI question recommendations (猜你所想) | Engine suggests questions personalized to user profile/chart to drive engagement | PARTIAL(AskOracle seeds contextual questions from cards/hexagrams/aspects; no personalized suggestion engine from chart+behavior) |
| **small** | Named AI companion personas with memory (小星, AI 分身) | Roster of AI agents, persistent-memory claims, proactive re-engagement (with documented boundary problems) | PARTIAL(4 personas with per-persona 40-msg local history; no persistent server-side memory or proactive outreach) |
| **small** | 50+ psychological test library | 50+ tests (some with Tsinghua psych input), each generating algorithmic reports; the free viral entry point | PARTIAL(33 quizzes with hints, localization, XP, share, personalization feeds — quality comparable, count lower) |
| **small** | Meditation content | First-class module on official site alongside sandbox/tests/community | MISSING |
| **none** | Natal chart engine (free, pro-grade interpretations) | Free natal chart from birth data with planets/houses/aspects and detailed written interpretations; true-solar-time option; positioned against Astrolog32/Janus/W | PARITY |
| **none** | 12-sign pairing compatibility content | Entry-level sign-to-sign love index with interpretation | PARITY |
| **none** | VIP/SVIP dual membership | VIP ¥9.9 first month→¥25/mo, ¥178/yr; SVIP ¥69/mo (delta undocumented); gates deeper interpretations + AI quota | PARITY(Premium $3.99/mo, $19.99/yr with 3-day trial, $29.99 lifetime; RevenueCat + Stripe; unlocks all AI/reports/tabs — simpler and cheaper) |
| **none** | Coin economy (测测币) with purchase packs ¥6-698 | Dual exchange rate, refunds-in-coins, hidden rates, 免密支付 — 800+ Black Cat complaints, whale cases to ¥300k/yr; a regulatory liability | PARTIAL(moonstones earn-only by deliberate design — rewarded ads, check-in, quizzes; topup flag OFF; server-side spend RPC) — intentional ethical divergence, no |
| **none** | Algorithmic paid personal reports | 'Professional knowledge + refined algorithms' reports, tens-to-hundreds RMB, cross-sold from tests/charts/live rooms | PARITY(Natal Deep Report $9.99, Year-Ahead $12.99, Career Archetype $6.99; moonstone or cash; premium bypass) |
| **we-lead** | Saved profile archives (档案) + friend synastry | Save person profiles, run 缘分合盘 against them; notoriously crash-prone on the intl Play build (3 black-screen reviews) | AHEAD(People module: unlimited saved people with relationship tags, per-person full natal chart pages, full synastry compare, moonstone-gated AI person reading  |
| **we-lead** | Life-number numerology | Single life-path number with detailed interpretation | AHEAD(Life Path + Expression + Soul Urge + Personality numbers in Cosmic Profile, plus 14-entry numerology learn hub) |
| **we-lead** | Tarot (draw UI + AI interpretation + human readers) | Tap-to-draw card UI, AI reading in Q&A flow, tarot as top paid-expert category; accuracy praised, anxiety-bait upsell copy criticized | AHEAD(42 spreads incl. Celtic Cross, custom 13-position spread builder, 78 SEO card pages with custom art, dual AI/traditional interpretations, shareable readin |
| **we-lead** | I Ching hexagrams | Hexagram casting exists mainly via practitioners/expert consults; no strong self-serve tool documented | AHEAD(full 64-hexagram library, animated 3-coin cast, changing lines to transformed hexagram, Ask-Oracle follow-up) |
| **we-lead** | Human Design charts | Generates human design charts alongside horoscopes (per Rest of World); depth unclear | AHEAD(real astronomy-engine computation: 64 gates, 26 activations, type/strategy/authority/profile, interactive 9-centre bodygraph SVG, channels) |
| **we-lead** | Free-tools acquisition funnel | Free charts/bazi reports and tests as top-of-funnel; interpretation is the paywall | AHEAD(free tier plus a public web SEO surface Cece lacks internationally: 78 card pages, 42 spread pages, 150+ learn entries, blog generator, shareable reading  |
| **we-lead** | Home content feed | Editorial/recommendation feed — users complain of 'junk info' clutter | AHEAD(clean daily-ritual loop: tarot flip, horoscope, journal prompt, moon phase, daily mission, streaks — retention-designed, not feed-cluttered) |
| **we-lead** | Dark mode + typography polish | No true dark mode (4+ independent complaints, 'blinding at night'), tiny fonts | AHEAD(dark cosmic visual identity by default; no equivalent complaint surface) |
| **we-lead** | International build parity + overseas payments | Play build frozen at 1.0.9 vs flagship 10.50, broken overseas membership payments, forced login, Chinese-only content — their exposed flank | AHEAD(single up-to-date codebase web+Android, working RevenueCat/Stripe billing, public logged-out routes, en/ja/ko/zh localization) |
| **we-lead** | Output stability & trust (algorithm versioning) | Loudest review theme: every update visibly changes sun signs, 神煞, 喜用神, daily scores — users actively police drift and lose trust | AHEAD(deterministic astronomy-engine computation with hand-written versioned interpretation corpora; no drift complaint class) |

## Execution plan — 10 phases

### Phase 1: Chart-suite parity blitz — honestly claim '20+ chart types'  ·  3-4 weeks

Cece's flagship claim is '20 chart types'; Arcana already owns the ephemeris engine, wheel renderer, and interpretation corpus, so each new type is a thin edge function + overlay — the cheapest path to neutralizing their headline differentiator and beating their relationship-chart suite (which is paywalled and text-only) with our interactive graphs.

- Add lunar return edge function + UI (clone solar-return pattern)
- Add tertiary progressions and solar arc directions (parameterize existing progressions function)
- Add Firdaria time-lord calculator with timeline visualization
- Add composite (midpoint) and Davison charts to People compare (reuse synastry cross-aspect renderer)
- Add progressed composite as a composite variant
- Add 'sky right now' mundane chart (astrology-current-positions already exists — needs a wheel view)
- Render all new types through the existing NatalWheel overlay-ring + AspectGrid + ElementBalance components
- Marketing copy + SEO pages per chart type

### Phase 2: Oracle Hub: unified 3-second AI Q&A + daily score engine  ·  2-3 weeks

Matches Cece's core interaction model (fast AI answers across all tools + a daily number users check compulsively) while fixing their documented failures: no cross-session grounding, quota frustration, and anxiety-bait scoring. Builds entirely on the existing AI stack and moonstone metering.

- Build one Oracle hub routing questions across tarot/astro-dice/I Ching/bazi/natal context (compose existing ai-quick-reading, tarot companion, AskOracle plumbing)
- Personalized question-suggestion engine from natal signals + quiz results + recent activity ('guess what you want to ask')
- Upgrade Dice page to true astro dice (planet/sign/house) with AI interpretation
- Daily Cosmic Score 0-100 computed from personal transits with a transparent 'why this score' aspect breakdown (anti-anxiety framing — Cece's score is a complaint magnet)
- Unify lucky color into the daily ritual card + shareable daily card image
- Persistent server-side companion memory (opt-in) so personas recall past sessions

### Phase 3: Soulmate Portrait + viral social loops  ·  2-3 weeks

The soulmate portrait is Cece's proven US-expansion viral hook and our single largest MISSING item; Arcana already has the score math, share infra, and invite system built — this phase converts them into a growth loop without cloning WeChat.

- AI soulmate portrait image generation seeded from natal/synastry signals, attached to the existing Soulmate Score share card
- Flip ON referral (100 moonstones/side) and compat-invite deep links
- Friend circle v1: accepted invites build a friend list showing MBTI type, element, and sun sign distribution graphs (contacts/share-link based — the Western adaptation of Cece's WeChat graph)
- One-tap friend synastry from the friend list (reuses People compare)
- Share-card templates for portrait, score, MBTI type, and daily score

### Phase 4: Community launch (flip the dark features ON)  ·  2-3 weeks build + ongoing ops

Community is one of Cece's three pillars and our version is fully built but disabled — the highest-leverage flip in the codebase. Per-test discussion zones and sign zones are the two Cece patterns our feed lacks; both are thin additions to the existing topic system.

- Enable community + Whispering Well flags (moderation pipeline already ON)
- Add per-quiz and per-card discussion threads (Cece's test-discussion zones)
- Add 12 zodiac sign zones as pinned topics
- Allow attaching a reading/chart snapshot to posts (chart-sharing posts)
- Seed content + daily prompt automation; crisis banner QA
- Community achievements + XP hooks

### Phase 5: Eastern depth pack — close the remaining calc gaps  ·  4-6 weeks

Ziwei and mansions are the only divination systems where Arcana is outright MISSING vs Cece; bazi is already close. Shipping these with verifiable accuracy and stable outputs attacks the exact trust wound Cece's reviews expose, and serves our existing CJK locales.

- Zi Wei Dou Shu chart: 12 palaces, 14 major stars, four transformations, palace interpretations + AI reading (mirror BaziPage architecture)
- BaZi upgrade: luck-pillar (大运) timeline graph, shensha list, kongwang, formal structure (取格) determination
- 28 Lunar Mansions birth reading + daily mansion in the ritual loop
- Golden-test all new Eastern calculations against published reference charts (weaponize Cece's accuracy-drift failure)
- Localize for zh/ja/ko locales already shipped

### Phase 6: Human layer v1 — the ethical advisor marketplace  ·  4-6 weeks + supply recruitment

The expert marketplace is Cece's revenue moat and our one CRITICAL gap; the scaffolding already exists behind flags. Differentiator is trust: upfront pricing, real refunds, and visible vetting — the inverse of the dark patterns generating Cece's 800+ complaints.

- Go live: advisor booking + verification + Stripe Connect payouts (all built, flagged OFF)
- Add async Q&A: user posts question with chart attached, advisors answer in text/voice within SLA (Cece's 抢答区 adapted)
- Advisor tier ladder (verified → pro → master) gating listing placement, not hidden prices
- Transparent upfront per-item pricing in cash or moonstones; cash refunds (never currency-locked)
- Advisor earnings dashboard (reuse AdvisorDashboardPage)
- Recruit initial 20-50 advisors from tarot/astrology creator communities

### Phase 7: Live audio v2 — metered sessions and salons  ·  3-4 weeks

Completes marketplace depth to match Cece's 连麦 (their highest-margin surface) while designing directly against their top complaints: hidden rates, no remaining-time display, and auto-deduct. The visible meter is both an ethical stance and a marketable feature.

- Per-minute metered 1:1 voice sessions (LiveKit) with an always-visible spend/time counter and hard budget caps set before connecting
- Scheduled group audio salons with paid host Q&A slots (upgrade Live Rooms MVP)
- Optional tipping (flat tips, no gift-SKU economy)
- Session replays for hosts (live-replays flag exists)
- Advisor availability + surge-free consistent pricing

### Phase 8: Psychology breadth — tests, sandplay, calm  ·  4-5 weeks

Matches Cece's 'pan-psychology' breadth claim (50+ tests, sandplay ~10k uses/day) with cheaper, mostly content-driven work on the existing quiz engine; sandplay-lite would be a genuine first for Western-market apps.

- Expand quiz library 33 → 50+ (values, career anchors, stress styles, chronotype, friendship, grief, self-esteem, motivation…)
- MBTI/element friend-distribution graphs on profile (feeds Phase 3 friend circle)
- Sandplay-lite: drag-and-drop symbolic scene builder with AI interpretation of choice + placement, 4 themes, with save (fixing Cece's lost-work bug)
- Guided meditation/audio content tied to daily ritual and moon phases
- Mood curve upgrade: richer trend visualization + weekly AI mood letter cadence

### Phase 9: Graph depth + stability polish  ·  3-4 weeks

Wins the 'graphs' axis outright: Cece's depth is mostly text behind paywalls while Arcana already has the strongest visualization stack in the category — this phase makes every new Phase 1/5 computation visually interactive and locks in the stability story Cece keeps fumbling.

- Time-lord/Firdaria and luck-pillar horizontal timeline components (shared design)
- Transit-intensity heatmap calendar (upgrade transit calendar to a graph)
- Composite/Davison wheel overlays on the astrolabe ChartWheel
- Animated daily-score gauge + 30-day score sparkline
- Chart settings: house system selection, true-solar-time toggle for bazi, orb preferences
- Versioned interpretation text with changelog note when content updates (trust feature)
- Performance + dark/light QA pass on all chart components

### Phase 10: Open-flank verticals Cece deliberately avoided  ·  2-3 weeks

Cece left 六爻, date-selection, naming, and pet astrology to niche apps due to CN compliance positioning; a Western app faces no such constraint. Cheap wins on existing engines that make Arcana strictly broader than the flagship, not just the Play port.

- Liu Yao (六爻) casting mode layered on the existing I Ching engine (najia lines, six relatives, moving-line judgment)
- Auspicious dates: personal 'good day' finder from transits + Chinese almanac 宜/忌 layer, with calendar export
- Pet astrology charts (novelty natal chart for pets via People with species tag) — pure share bait
- Palm/face scan explicitly rejected (biometric/compliance risk — same call Cece made)
- Name-number analysis added to Cosmic Profile (numerology extension)

## Key strategic reads

1. **Cece's intl build is abandoned** (1.0.9 vs CN 10.36; broken payments, crash-prone synastry, no dark mode, forced login). The bar to overtake *the app your users can actually install* is far lower than the CN flagship's spec sheet.
2. **Their moat is the human expert marketplace + the 20-chart claim; their weakness is trust** (accuracy drift, dark-pattern billing complaints, cluttered feed). Every phase above pairs a feature-match with a trust differentiator.
3. **Much of our 'missing' is actually built and flagged OFF** (community, whispering well, advisors, live rooms, referrals, compat invites) — phases 3/4/6/7 are launches, not builds.

*Full research JSON: workflow wf_7a8fe80d-db4 (tasks/wk1wd5lzo.output). Related: docs/arcana-2.0-cosmos-update-plan.md, docs/arcana-2.0-scan-findings.json.*