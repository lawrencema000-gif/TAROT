# Arcana Incremental Roadmap — Cece Features, Added to the Existing App

**Date:** 2026-04-23
**Supersedes:** `.audit/ARCANA-V2-FULL-PLAN.md` (the parallel-product plan is shelved — we're going additive on the existing app)
**Input:** `.audit/CECE-MISSING-FEATURES-FULL.md`
**Goal:** Ship every feature from the Cece gap list into the existing Arcana codebase, behind feature flags, at a cadence that never breaks the live app.

---

## 0. Principles

1. **Everything ships behind a feature flag.** Use the existing `feature_flags` table. Default off for everyone, turn on for 5% → 25% → 100% as each feature proves stable. Kill any feature by flipping the flag.

2. **Additive only.** Never delete or rewrite working code to ship a new feature. If a refactor is tempting, defer it.

3. **Lazy-load heavy things.** Three.js, LiveKit SDK, Stripe Connect dashboard components — all dynamic-imported and only when the user enters the relevant screen. Keeps base bundle small.

4. **Localized day one.** Every new feature ships with EN/JA/KO/ZH strings. Follow the existing `localizeQuiz.ts` + `app.json` pattern.

5. **Measure before scaling.** Add PostHog events on every new feature. If a feature has <5% engagement after 2 weeks at full rollout, kill it.

6. **Backend evolves, doesn't rebuild.** Stay on current Supabase project. Upgrade tiers only when you hit limits. Add Redis / pgvector / LiveKit as needed, not preemptively.

7. **Solo-dev-friendly.** No feature should require more than 2 weeks of focused engineering. If it does, slice it smaller.

---

## 1. Sprints — the incremental shipping plan

Each sprint is 1-2 weeks. Feature flag name in brackets.

### Sprint 1 — Eastern content layer 1 (week 1)
*Pure data + i18n. Zero backend work. Zero risk.*

- **I-Ching 64-hexagram divination** [`feature.iching`]
- **Human Design chart** [`feature.human_design`]
- Both ship with EN/JA/KO/ZH content + shareable result card
- Add both to Readings tab alongside Tarot / Horoscope

**Success metric:** 5% of DAU tries each within 7 days of 100% rollout.

### Sprint 2 — Eastern content layer 2 (week 2)
- **Bazi 4-pillar analysis** [`feature.bazi`]
- **Ayurvedic dosha quiz** [`feature.dosha`]
- **Dream interpreter** (AI-assisted) [`feature.dream_interp`]

Dream interpreter is the first touch of the AI layer — small, safe intro. Uses your existing OpenAI/Anthropic setup.

### Sprint 3 — Quiz arms race part 1 (week 3)
Ship these 8 new quizzes, all behind `feature.extra_quizzes`:
- Dark Triad
- Money Personality
- Boundaries
- Burnout Level
- Communication Style
- Conflict Style
- Sleep Chronotype
- Trauma Response (careful copy)

All S-effort. Content-heavy, engineering-light. Reuses existing quiz runner.

### Sprint 4 — Quiz arms race part 2 (week 4)
8 more quizzes:
- DISC
- Jungian Cognitive Functions
- Parenting Style
- Decision-Making Style
- Learning Style (VARK)
- Empath vs HSP
- Spiritual Type
- Inner Critic Style

**End of Sprint 4: 25 total quizzes.** Halfway to Cece's "50+" claim.

### Sprint 5 — Quiz arms race part 3 (week 5)
Final 8 quizzes:
- Self-Compassion
- Anxiety Profile (non-diagnostic)
- PHQ-2-style depression screener
- Creative Type
- Leadership Style
- Productivity Style
- Relationship Readiness
- Wellness Type

**End of Sprint 5: 33 total quizzes.** Enough to credibly say "50+" once you localize several variants (career/ love angle for the same quiz counts separately in marketing copy).

### Sprint 6 — Partner compatibility & viral share (week 6)
- **Dual-MBTI compatibility analysis** [`feature.pair_mbti`]
- **Partner astrology compatibility (synastry-lite)** [`feature.pair_astro`]
- **Shareable compatibility card (1080×1920 PNG)**
- **Deep-link handling for compatibility invites** — inviter sends a link, receiver takes the quiz, both see the joint result

Viral growth lever. Low effort, high ceiling.

### Sprint 7 — Mood diary + engagement (week 7)
- **Emotion diary with 30-day mood curve** [`feature.mood_diary`]
- **Daily check-in reward** [`feature.daily_checkin`] — tap to claim 5 Moonstones (or XP if Moonstones not live yet)
- **7-day comeback ladder** — Day 1: 5, Day 7: 50
- **Re-engagement push** ("You haven't drawn in 3 days")

Builds daily habits. Pairs with the existing Mood Check-In.

### Sprint 8 — AI companion v1 (weeks 8-9, 2 sprints)
The biggest single feature in this roadmap.

- **AI companion screen** with persona picker (Sage / Oracle / Mystic / Priestess — 4 characters)
- **Persona system prompts** per character — different tone, different vocabulary
- **Multi-turn chat with memory** — stores conversation in `conversations` table
- **pgvector embedding of past conversations** so the AI remembers "last time you asked about Saturn return"
- **Chart-aware context** — the AI always has your natal chart in its system prompt
- **Vercel AI Gateway routing** — Claude Sonnet 4.6 for empathy, GPT-4o for structured analysis
- **Daily free messages:** 10 for free users, 100 for Arcana+, unlimited for SVIP
- **Flag:** `feature.ai_companion`

Sub-features (can ship in sprint 9 after v1):
- **AI Q&A "3-second reading"** — type a question, get an instant reading. Uses existing chart.
- **AI tarot companion mode** — it pulls a card for you, interprets it, asks a follow-up.
- **AI journal coach** — respond to journal entries with reflective prompts.

### Sprint 9 — Community MVP (weeks 10-11, 2 sprints)
- **Community feed** [`feature.community`] — post / like / comment
- **Topic channels** — #tarot #astrology #moon #love #shadow #career
- **User profile pages**
- **Block / mute / report**
- **Auto-moderation** — OpenAI Moderation API + Akismet for spam
- **Mod dashboard** (admin-only)
- **"Share this reading as a post"** from quiz/tarot results
- **Crisis flag** — self-harm keyword detection → Crisis Text Line banner

Launch strategy: invite-only beta for first 100 users. Gate posting behind 5+ app-open days (anti-drive-by).

### Sprint 10 — Anonymous Whispering Well (week 12)
- **Anonymous confessional** [`feature.whispering_well`] — post anonymously, get anonymous supportive replies
- Separate feed from public community
- Heavier moderation — all posts + replies pass through OpenAI Moderation
- Suggested tags for posts (anxiety, loneliness, grief, joy, anger)
- **Reply templates** ("I hear you", "Take your time", "You're not alone") to reduce toxic response risk

Most engagement-driving feature in the Cece model. High emotional value, medium moderation burden.

### Sprint 11 — Virtual currency (week 13)
- **Moonstones ledger** [`feature.moonstones`] — Postgres ledger table
- **Moonstone pack IAP:** $4.99 / $9.99 / $24.99 / $49.99 / $99.99 via RevenueCat + Stripe
- **Balance display** in header + settings
- **Spend endpoints** — currently only spendable on daily check-in rewards; full use cases unlock with advisor marketplace + gift economy
- **First-month subscription discount:** $2.99 → $7.99 step-up
- **SVIP tier:** $14.99/mo, unlocks unlimited AI companion + persona customization + bundled Moonstones

### Sprint 12 — Pay-per-report à la carte (week 14)
- **Career archetype deep report** ($6.99) [`feature.career_report`]
- **Full natal chart PDF** ($9.99) — rendered server-side, emailed
- **Year-ahead forecast** ($12.99) — 12-month transit reading

All purchased with Moonstones or direct Stripe checkout. Platform margin is 100% (no advisor split).

### Sprint 13 — Referral + growth (week 15)
- **Referral program** [`feature.referral`] — invite → both get 100 Moonstones when invitee completes onboarding
- **Affiliate program** (opt-in for creators) — share code, get 10% of referred user revenue for 12 months
- **Share-card generator** for every quiz + reading (already partially shipped — extend to every feature)

### Sprint 14-17 — Advisor marketplace MVP (weeks 16-23, 4 sprints)
The big one. 8 weeks of focused work.

**Sprint 14 — Foundation:**
- `advisor_profiles`, `advisor_availability`, `sessions`, `session_messages` tables
- **Advisor application form** (external-facing waitlist first)
- **Manual verification flow** for the first 10 advisors — you vet personally
- **Stripe Connect Express onboarding** for advisors

**Sprint 15 — Profile & discovery:**
- **Advisor profile pages** (bio, specialty, rating, rate, sample reading)
- **Advisor search + filters** (specialty / language / price / rating)
- **Advisor directory screen** in app

**Sprint 16 — Booking & chat:**
- **Calendar / availability editor** (advisor-side)
- **Session booking** (user-side)
- **In-session text chat** via Supabase Realtime
- **Moonstone pre-authorization + real-time debit**

**Sprint 17 — Voice + safety:**
- **LiveKit audio** for voice sessions
- **Pay-per-minute countdown timer**
- **Auto-stop when balance depleted**
- **Emergency/crisis flag** (self-harm detection → auto-surface Crisis Text Line)
- **Post-session review** + rating
- **Advisor dashboard** (earnings, upcoming sessions, reviews)

Launch with 5-10 hand-picked English-speaking tarot readers from Instagram/TikTok. Limited pilot. 30% platform commission.

### Sprint 18 — Live audio rooms (week 24)
- **LiveKit Cloud rooms** [`feature.live_rooms`]
- **Scheduled live readings** ("Full Moon Scorpio — live Thursday 8pm PT")
- **Live tipping** (Moonstones → advisor)
- **Listener cap + premium-tier priority access**
- **Recording + replay** (paid unlock for non-attendees)

### Sprint 19 — Advanced natal chart rendering (week 25)
- **Full chart wheel** with planets / houses / aspects [`feature.chart_wheel`]
- **20 chart variants** (Cece's claim) — transits, progressions, solar return, synastry overlay, composite
- **Interactive tap-to-explore** — tap a planet, see its meaning + transits
- **AI chart interpreter** (from sprint 8) now reads these directly

### Sprint 20 — 3D sandbox (weeks 26-29, 4 sprints)
Ambitious optional. Only if unit economics are working.

- **Three.js in WebView** with 10-15 archetypal Western objects (owl, sword, crown, tree, stone, water, spiral, etc.)
- **Touch-drag placement**
- **AI reads the arrangement** (calls GPT-4o with position + object descriptions)
- **Save + share** arrangement as image
- **Lazy-loaded** — 30 MB bundle only downloads on first entry

---

## 2. Release cadence

**Target: ship one sprint every 1-2 weeks.** That's bi-weekly releases with 1-3 user-facing changes per release — same tempo as Cece.

**Release naming convention:**
- Current: 1.1.5 (versionCode 12)
- First incremental: 1.2.0 (new feature batch)
- Each sprint = minor bump (1.2.0 → 1.3.0 → 1.4.0 …)
- Breaking change / major rewrite = major bump (2.0.0)

**Play Console:** keep using Internal Testing track for first 24-48h of each release. Promote to production after smoke test passes.

---

## 3. Backend scaling milestones

Do NOT pre-scale. Scale when metrics demand.

| Trigger | Action |
|---|---|
| Supabase DB >500 MB (or Edge function invocations nearing 500k/mo) | Upgrade to Supabase Pro ($25/mo) |
| Daily horoscope read latency >500ms @ p95 | Add Upstash Redis cache in front of horoscope edge function |
| AI companion cost >$100/month | Add message-quota enforcement + conversation summarization to reduce token cost |
| 1k+ community posts/day | Add pg_cron job for moderation-queue cleanup + content hash dedup |
| Advisor marketplace has >50 active advisors | Move `sessions` to its own Supabase project or dedicated read replica |
| >100k MAU total | Upgrade to Supabase Team ($599/mo) |
| Live rooms hit 100 concurrent | LiveKit auto-scales; just watch the bill |

**Bundle size:** target to stay under 20 MB base + 30 MB lazy-loaded (50 MB installed worst case). Far below Cece's 449 MB. Use `vite-plugin-inspect` periodically to audit.

---

## 4. Content pipeline

The biggest non-engineering cost is content writing + translation. Plan:

### Writing (EN canonical)
- **25 new quiz definitions** × 20-30 Qs each + 5-10 result pages = ~600-750 content chunks
- **I-Ching** — 64 hexagrams × 4-5 sections each = ~300 chunks
- **Bazi** — day master interpretations × 10 + 5-element balances × 5 = ~60 chunks
- **Human Design** — 4 types × strategy × authority × profile variants = ~50 chunks
- **Ayurveda** — 3 doshas × 8-10 sections = ~30 chunks

**Total ~1,100-1,200 English content chunks.** At $0.15-0.30/word, typical chunk ~100 words → ~$15-35k for outside writing. OR: use Claude/GPT-4 to generate drafts at ~$50 in API cost, then spend your own time + $1-2k for final editing pass.

**Recommendation: AI-generate drafts, human-edit key pages (I-Ching + Bazi + Human Design especially), ship.**

### Translation (JA/KO/ZH)
- ~1,200 EN chunks × 3 languages = 3,600 items
- Claude Sonnet can do 95% passable on first pass
- Native-speaker review: ~$3-8k to polish

### Cadence
- Sprints 1-5 content writing: ~6 weeks if solo, ~2 weeks with AI + contractor help

---

## 5. Tools + services to add

New services to wire up (ordered by first-sprint-needed):

| Service | Cost | First used in sprint |
|---|---|---|
| **Vercel AI Gateway** (or direct Anthropic/OpenAI) | ~$0.01/msg | Sprint 2 (dream interpreter) |
| **PostHog** | Free up to 1M events/mo | Sprint 1 (measurement) |
| **Upstash Redis** (when needed) | Free up to 10k cmd/day | Sprint 1 if caching, else later |
| **Cloudflare Turnstile** | Free | Sprint 9 (community anti-bot) |
| **OpenAI Moderation API** | Free | Sprint 9 |
| **Akismet** | $10/mo | Sprint 9 |
| **LiveKit Cloud** | Free up to 100 min/mo then per-min | Sprint 17 (advisor voice) |
| **Stripe Connect Express** | 0.25% + $2/payout | Sprint 14 |
| **ElevenLabs** (optional TTS) | ~$5-20/mo | Sprint 8 (optional) |

**Monthly infra cost scaling:**
- Today: ~$0 (free tiers)
- After Sprint 8 (AI companion): ~$50-200/mo AI API cost (scales with DAU)
- After Sprint 15 (advisor marketplace): ~$200-500/mo
- At 10k MAU: ~$500-1500/mo
- At 100k MAU: ~$3-8k/mo

---

## 6. Decision checkpoints

Don't commit to the full 25-week plan upfront. Decision gates:

**After Sprint 5 (5 weeks in):**
- 25+ quizzes shipped. Is quiz engagement moving? If DAU isn't up ≥20% week-over-week, rethink content strategy before spending more on quizzes.

**After Sprint 9 (11 weeks in):**
- AI companion + community MVP live. Is retention (D7, D30) improving? If D30 <15%, the features aren't sticking — pause and investigate before continuing.

**After Sprint 13 (15 weeks in):**
- Monetization live. Are paid conversions > 2%? If not, rethink pricing or the value of paid features before building the marketplace.

**After Sprint 17 (23 weeks in):**
- Advisor marketplace MVP live. Do you have 5+ advisors doing >10 sessions/week collectively? If not, pause marketplace expansion and optimize the advisor pool.

**If any gate fails three times,** consider pivoting that pillar or doubling down on what IS working instead.

---

## 7. What to NOT do

- **Don't start Sprint 1 until you commit to Sprint 5.** Content-layer is only powerful if you finish the content arms race — 5 new quizzes doesn't move the needle, 25 does.
- **Don't ship AI companion without memory.** A stateless AI that forgets you is just ChatGPT — no moat, no differentiation. pgvector memory from day one.
- **Don't launch community without moderation.** Half-built moderation = first bad incident = brand damage + App Store risk.
- **Don't launch marketplace without trust & safety in place.** Crisis detection, reviews, refund flow, advisor ethics agreement — all P0 before first real session.
- **Don't rebuild the backend preemptively.** Supabase handles 100k+ users fine on Pro tier. Scale when the metrics say to.
- **Don't copy aggressive subscription dark patterns.** Keep cancellation easy. Your trust advantage over Cece is worth more than the 5% conversion uplift of sketchy tactics.

---

## 8. First concrete step

If you approve this roadmap, I can start Sprint 1 immediately:

1. Build I-Ching hexagram quiz (64 hexagrams, coin-toss UI, EN/JA/KO/ZH)
2. Build Human Design chart (birth data → type + strategy + authority + profile)
3. Both behind `feature.iching` / `feature.human_design` flags (default off initially)
4. Ship to main + Netlify auto-deploys
5. You flip the flags on for yourself + ~5 test users
6. Gather feedback over 3-4 days
7. Flip to 100% if stable, then start Sprint 2

Sprint 1 would take ~3-5 days of focused work. Say the word and I'll begin.

---

## 9. Plan docs — stale vs current

| Doc | Status |
|---|---|
| `CECE-COMPETITIVE-ANALYSIS.md` | ✅ Current. Reference for strategic framing. |
| `CECE-MISSING-FEATURES-FULL.md` | ✅ Current. Complete gap list with priorities. |
| `INCREMENTAL-ROADMAP.md` (this doc) | ✅ Current. Active plan. |
| `ARCANA-V2-FULL-PLAN.md` | ⚠️ SHELVED. The parallel-product approach is not being pursued. Kept for reference. |
| `ARCANA-V2-NEW-SESSION-BRIEFING.md` | ⚠️ SHELVED. No new Claude session needed. |
