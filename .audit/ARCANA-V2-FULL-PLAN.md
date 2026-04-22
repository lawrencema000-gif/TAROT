# Arcana v2 — Parallel "Copy Cece, Re-Skin for the West" Plan

**Date:** 2026-04-23
**Posture:** Full port of Cece's feature set (including their "do not copy" items), repositioned for Western users, shipped as a *separate* product so the live Arcana app is not touched until v2 proves itself.
**Goal:** Test-run the full-fat model in isolation. If it sticks, merge winning pieces back into Arcana. If it flops, walk away with nothing broken.

---

## 1. Isolation architecture — nothing collides

The live product uses:

| Resource | Live (keep untouched) |
|---|---|
| GitHub repo | `lawrencema000-gif/TAROT` |
| Git branch | `main` |
| Package ID | `com.arcana.app` |
| Web domain | `tarotlife.app` |
| Supabase project | `ulzlthhkqjuohzjangcq` |
| Netlify site | `arcana-ritual-app` |
| Sentry project | `javascript-react` (proj id `4511259488878592`) |
| RevenueCat app ID | existing |
| AdMob app ID | `ca-app-pub-9489106590476826~4064386281` |
| Google Cloud OAuth clients | existing two Android clients |
| Play Console app | Arcana (com.arcana.app) |

For v2, every one of those gets a **parallel twin**. Nothing shared:

| Resource | v2 (new, isolated) |
|---|---|
| GitHub repo | `lawrencema000-gif/arcana-v2` (new) |
| Package ID | `com.arcana.pro` (new — different bundle id) |
| Web domain | TBD — proposals: `try-arcana.app`, `arcana-oracle.com`, `arcana.pro` |
| Supabase project | New project, different ref |
| Netlify/Vercel site | New site |
| Sentry project | New project |
| RevenueCat app ID | New app entry in RC dashboard |
| AdMob app ID | New app in AdMob (can reuse account) |
| Google Cloud OAuth | New Android client (new SHA-1 = new keystore) |
| Play Console app | New app listing for internal testing |

### Why a separate repo (not a branch or monorepo)

- **Fork history is useless** — v2 will diverge massively. Clean slate is faster than git surgery.
- **Deploy pipelines stay simple** — each repo has one Netlify build, one Play Console, one Sentry. Less "which build went where" confusion.
- **Secrets don't cross** — v2 experiments with new Stripe keys, new API credentials, new DB schemas. Accidents in v2 can't touch the live product.
- **You can abandon it cleanly** — if v2 flops, delete the repo, cancel the domain. Zero cleanup in the live codebase.

### The one thing that gets shared

**The user account.** If the test is successful, users who sign in to v2 with the same Google/email already on Arcana should eventually merge. For the test phase: treat them as separate accounts. Worry about cross-product sync only if the test wins.

---

## 2. Western repositioning — every Chinese-specific element mapped out

| Cece (China-native) | v2 (Western-facing) |
|---|---|
| WeChat login | Google · Apple · Email · Discord OAuth |
| WeChat Pay / Alipay | Stripe (web) · Apple Pay · Google Pay · RevenueCat (apps) |
| WeChat share | Native OS share sheet · Instagram Stories · TikTok · iMessage |
| Weibo promotion | Twitter/X · Instagram · TikTok · Reddit |
| WeChat mini-program | Progressive web app / Capacitor wrapper |
| Chinese LLM (state-registered "Xingyuan") | OpenAI GPT-4o / Anthropic Claude Sonnet 4.6 via AI Gateway |
| Alipay / UnionPay payout | Stripe Connect Express (pays advisors in 40+ countries) |
| 360/Baidu app stores | Apple App Store · Google Play · F-Droid (optional) |
| Bilibili/Douyin video | YouTube Shorts · TikTok · Instagram Reels |
| "Aid Heart Initiative" CSR | Partnerships: NAMI · Crisis Text Line · Headspace Foundation |
| State-registered therapist list | BACP (UK) · APA (US) · licensed-therapist verification via Calm-style opt-in |
| ¥ pricing (9.9 / 25 / 69 / 178) | $ pricing ($2.99 intro / $7.99 monthly / $14.99 SVIP / $49.99 yearly) |
| 3D sandbox (Chinese iconography) | 3D sandbox (Western archetypal objects + natural elements) |
| "Feudal superstition" dodge via "pan-psychological" framing | Unnecessary in West — but borrow the **"wellness first, mysticism second"** brand voice for App Store review safety |

### Eastern elements we KEEP (the "something new for westerners" angle)

These are genuinely underexposed in Western app market and give us differentiation:

| Feature | Why it works for Western audience |
|---|---|
| **I-Ching divination** | Mysterious, structured, less pop than tarot. Serious seekers love it. Hermann Hesse & Carl Jung endorsed it — credible lineage. |
| **Bazi (Chinese 4-pillar astrology)** | Nearly unknown outside CN/KR. Deep system. Fresh content for users who've exhausted Western astrology. |
| **Feng Shui room analyzer** (camera → feng shui advice) | Novelty hook. Instagrammable. |
| **Chinese zodiac + compatibility** | Already built. |
| **Sand tray / sandplay therapy** | Originated from Margaret Lowenfeld (UK) but popularized through Japanese Kalff tradition. Unique. |
| **Taoist quote of the day** | Dao De Jing, Zhuangzi. Hallmark-level wisdom, zero religious baggage. |
| **Ayurvedic dosha** | Indian, but same "Eastern import" category. Hugely popular in wellness already. |
| **Zen koans as reflection prompts** | Journal prompts wrapped in Buddhist koan tradition. |
| **Shiatsu/acupressure point guide** | Body-work exploration, pairs with horoscope content. |
| **Moon-phase rituals from multiple traditions** | Taoist, Hindu, Wiccan side-by-side. |

**The pitch for Western users:** "Tarot + astrology you already know, plus the depth systems the West never got taught." Think: a wellness-literate Gen Z / Millennial user who's done their Co-Star horoscope, wants more.

---

## 3. The full feature list — what we're building

Organized by build phase. All phases run in v2 repo only.

### Phase 0 — Infrastructure bootstrap (1 week)

- [ ] New GitHub repo with starter scaffolding
- [ ] New Supabase project provisioned, migrations copied from v1 as baseline
- [ ] New Netlify site with GitHub auto-deploy
- [ ] New Sentry project with DSN wired to new Netlify env
- [ ] New Google Cloud project + OAuth Android client + new keystore (fresh SHA-1)
- [ ] New AdMob + RevenueCat apps
- [ ] New Play Console listing — Internal Testing track only
- [ ] Capacitor project configured with new bundle ID
- [ ] Copy Arcana v1 source as starting point
- [ ] Bump all version numbers to 0.1.0 — this is a new product, new version lineage

### Phase 1 — Content expansion (2-3 weeks)

Everything on Cece's content side that we don't have.

- [ ] **Human Design charts** — birth data → energy type (Generator/Manifestor/Projector/Reflector) + strategy + authority + profile + incarnation cross
- [ ] **I-Ching hexagram** — 3-coin toss UI, 64 hexagrams with change lines, full interpretations
- [ ] **Bazi 4-pillar** — year/month/day/hour pillars with 5-element balance, day master analysis
- [ ] **Ayurvedic dosha quiz** — 30 Qs, Vata/Pitta/Kapha
- [ ] **Feng Shui Bagua room-map** — upload room photo or draw, get Bagua overlay + advice
- [ ] **50+ personality tests target:**
  - What we have: 9 (MBTI full/quick, Big Five, Enneagram, Attachment, Love Language, Mood, Court Match, Shadow, Element)
  - Add: Dark Triad, DISC, 4-Love-Styles, Jungian Functions, Big Five facets (subscales), Introversion levels, Emotional IQ, Parenting style, Communication style, Conflict style, Decision-making style, Money personality, Grief style, Boundaries quiz, Social anxiety, Burnout level, Stress recovery, Learning style, Sleep chronotype, Sexual personality (adult), Creative type, Leadership style, Empath vs Highly Sensitive, Anger style, Self-worth, Spiritual type, Wellness type, Career archetype, Relationship readiness, Productivity style, Motivation style, Failure response, Trauma response (PTSD-informed, not a diagnosis), Inner critic style, Self-compassion, Anxiety profile, Depression screener (PHQ-2 informed, not diagnostic), Attachment + partner compatibility
- [ ] **Occupational / career report** — combines MBTI + chart + goals. Premium à la carte.
- [ ] **Daily Taoist wisdom** — Dao De Jing rotation
- [ ] **Zen koan journal prompts** — one per day
- [ ] **Moon phase rituals** — multi-tradition

### Phase 2 — Community + social (4-6 weeks)

- [ ] **Community feed** — post / like / comment / share
- [ ] **Topic channels** — Tarot, Astrology, Moon rituals, I-Ching, Journaling, Meditation, Career readings, Love readings
- [ ] **Anonymous confessional** — "Whispering Well" (rename from "tree hole")
- [ ] **Interest-based matching** — find people with similar chart/MBTI
- [ ] **Private DMs** (text only initially)
- [ ] **Profile pages** with follow/followed counts
- [ ] **Quote/card sharing to feed** — auto-share your tarot result as a post
- [ ] **Moderation** — Akismet + OpenAI Moderation API + user report + admin dashboard
- [ ] **Block / mute users**
- [ ] **Daily post notifications** with behavioural throttling

### Phase 3 — AI layer (3-4 weeks)

- [ ] **AI companion with persona** — choose from 3-4 characters (Sage · Oracle · Mystic · Priestess). Named, avatared, voiced (optional TTS). Multi-turn memory per user.
- [ ] **Persona memory** — the AI remembers your chart, recent readings, past conversations. pgvector over conversation history + user profile.
- [ ] **AI tarot companion** — pulls a card, interprets it, asks you a follow-up. Conversational.
- [ ] **AI Q&A** — "What does it mean that my Moon squares Saturn?" → chart-aware answer
- [ ] **AI dream interpreter** — describe a dream, get archetypal analysis
- [ ] **AI journal coach** — responds to journal entries with reflective prompts
- [ ] **Sandplay-lite 2D** — drag symbol stickers onto a background, AI reads the arrangement (vs Cece's full 3D — ours is 2D but same principle)
- [ ] **LLM routing** — use Anthropic Claude for emotional nuance, GPT-4o for structured chart analysis, via Vercel AI Gateway for failover

### Phase 4 — Advisor marketplace (8-12 weeks — the money feature)

This is the one that demands the most care.

- [ ] **Advisor onboarding** — application form + identity verification + skills test (tarot knowledge + ethical scenarios) + Stripe Connect Express setup
- [ ] **Advisor profiles** — bio, credentials, specialties, rating, hourly rate, sample reading
- [ ] **Advisor dashboard** — live bookings, waiting queue, earnings, payout status, reviews
- [ ] **Pay-per-minute chat** — pre-buy coins, burns-down in real-time during session. Platform takes 30%.
- [ ] **Pay-per-session booking** — $30/30min, $50/60min fixed-price slots
- [ ] **In-session chat + voice** — LiveKit for real-time audio/text (managed, not self-hosted)
- [ ] **Post-session follow-up** — advisor sends written recap + follow-up prompt
- [ ] **Reviews + ratings** — users rate after session
- [ ] **Advisor search + filter** — by specialty (tarot / astrology / I-Ching / love / career / shadow work), by price, by language, by rating
- [ ] **Scheduling** — advisors block time, users book slots
- [ ] **Emergency/crisis flag** — if user mentions self-harm, auto-surface Crisis Text Line + session ends gracefully
- [ ] **Advisor AI Copilot** — GPT wraps session notes, suggests questions, summarizes chart highlights — **only for advisors, not shown to user**

### Phase 5 — Monetization infrastructure (2 weeks)

- [ ] **Virtual currency** — "Moonstones". 100 / 550 / 1,200 / 3,000 / 7,500 / 16,000 tiers
- [ ] **Intro offer** — $2.99 first month, $7.99 normal monthly, $49.99 yearly
- [ ] **SVIP tier** — $14.99/month or $149/year. Includes 60 min/month of advisor time.
- [ ] **Pay-per-report** — deep career reading ($6.99), full natal chart PDF ($9.99), year-ahead forecast ($12.99)
- [ ] **Gift economy in live rooms** — viewers tip streamers with Moonstones
- [ ] **Stripe Connect for advisor payouts** — automated weekly disbursement
- [ ] **Affiliate program** — users get 10% of anyone they refer for 12 months

### Phase 6 — Live streaming (1 month)

- [ ] **Live audio rooms** — host by advisor, listeners pay to join or free + tipping. LiveKit/Agora SDK.
- [ ] **Live tarot reading streams** — reader pulls for audience, audience asks questions via tips
- [ ] **Scheduled group readings** — "Full moon Scorpio reading — live Thursday 8pm PT"
- [ ] **Live workshop** — "Learn I-Ching in 60 minutes" ticketed stream
- [ ] **Stream replay** — on-demand after live ends (paid unlock for non-attendees)

### Phase 7 — The 3D sandbox (ambitious, 6-8 weeks)

Three.js in WebView — not Unity. Ships as ~30 MB asset bundle, far smaller than Cece's native 3D.

- [ ] 3D sand tray with Western archetypal objects (owl, sword, crown, tree, stone, water, spiral) + natural elements (fire, water, earth, air) + shadow objects
- [ ] User arranges objects via touch drag
- [ ] AI reads the arrangement — symbolism + spatial relationships
- [ ] Save arrangement → share as image → discuss in feed

### Phase 8 — Separate practitioner B2B app (only after Phase 4 scales)

- [ ] Arcana Practitioner app — separate AAB, tools for certified readers
- [ ] Advanced client management
- [ ] Written readings with rich editor
- [ ] Client relationship CRM
- [ ] Tax forms + payout reports

---

## 4. Tech stack — specific 2026 choices

### Frontend
- **React 19 + Vite 7** (current)
- **Capacitor 8** for iOS + Android wrap (current)
- **Tailwind + shadcn/ui** — upgrade from current custom styling for speed
- **Three.js** for 3D sandbox
- **TanStack Query** for cache-aware data fetching (replaces your custom hooks)
- **Zustand** for client state (lighter than Redux)
- **React Native Skia / Moti** if we want 60fps animations in the WebView

### Backend
- **Supabase** (Postgres + Auth + Realtime + Storage + Edge Functions) as core
- **pgvector** extension for AI memory / advisor matching embeddings
- **pg_cron** for scheduled horoscope generation + cache warmup
- **Supabase Realtime** for chat presence, live room state, notifications
- **Inngest** or **Trigger.dev** for long-running jobs (AI chart generation, video rendering)
- **Upstash Redis** as hot cache layer in front of daily-horoscope reads (same trick as Cece)

### AI
- **Vercel AI Gateway** — single API routing to Anthropic + OpenAI with automatic failover and cost tracking
- **Claude Sonnet 4.6** as primary — empathy + nuance
- **GPT-4o** for structured tasks (chart parsing, schema extraction)
- **Text-embedding-3-large** for semantic search / advisor matching
- **ElevenLabs TTS** for AI companion voices (optional)
- **OpenAI Whisper** for voice input on AI companion

### Real-time infrastructure
- **LiveKit Cloud** — WebRTC audio rooms, 1:1 video, recording, tiered pricing
- (fallback: Agora or Twilio Voice)

### Payment
- **RevenueCat** for iOS + Android IAP (current setup)
- **Stripe** for web checkout, subscriptions, Moonstone packs
- **Stripe Connect Express** for advisor payouts (auto-KYC, international)

### Infrastructure
- **Netlify** for web (current) or Vercel (consider switching for better AI SDK + edge compute integration)
- **Cloudflare R2** or **Supabase Storage** for media
- **Cloudflare Turnstile** for anti-bot on community posts

### Analytics + ops
- **PostHog** — product analytics, session recordings, feature flags
- **Sentry** (already wired) — errors + perf
- **Linear** — issue tracking
- **Inngest** scheduled recovery jobs

### DB schema additions vs current
- `community_posts`, `community_comments`, `community_reactions`
- `advisor_profiles`, `advisor_availability`, `advisor_ratings`
- `sessions` (chat/call history), `session_messages`, `session_payments`
- `moonstones_ledger` (virtual currency transactions)
- `conversations` (AI companion + human DMs unified)
- `conversation_messages` with pgvector embedding column
- `live_rooms`, `room_listeners`, `room_tips`
- `sandtray_saves`

---

## 5. Western vs Eastern content split — concrete numbers

Of the total content footprint, propose:

- **60% universal Western wellness/spirituality** — tarot, astrology, MBTI, Enneagram, love language, shadow work, journaling, moon phases, crystals, chakras, meditation, affirmations
- **30% Eastern systems** — I-Ching, Bazi, Chinese zodiac, Ayurveda, Feng Shui, Taoist quotes, Zen koans, shiatsu, sandplay
- **10% cultural bridges** — "The Western equivalent of Bazi is birth-chart time slices"; "I-Ching vs tarot: different questions, same practice"

Visual language:
- Avoid aggressive Chinoiserie (red + gold lacquer + dragons)
- Lean on shared cross-cultural symbols: moon, stars, sun, water, tree, stone, thread, circle
- Color palette: deep midnight + gold (current Arcana) stays
- Typography: current font stack works — but add a secondary accent font inspired by traditional block-printed books (e.g., "Baskerville" serif for long-form, "Cormorant" for headers)

---

## 6. Monetization model — how the unit economics work

### Free tier (80% of users)
- 1 tarot draw / day
- 1 horoscope / day
- All quizzes (but gated result sections)
- AI companion: 10 messages / day
- Community read-only + post 3x/day
- Ads: banner + 1 interstitial per session

### Paid tier — Arcana+ ($7.99/mo)
- Unlimited tarot + horoscope
- All quiz results
- AI companion: 100 messages / day
- Community full posting
- No ads
- 10 Moonstones / month included

### Premium tier — Arcana SVIP ($14.99/mo)
- Everything in +
- AI companion: unlimited + persona customization
- 60 Moonstones / month (enough for ~30 min advisor chat at mid-tier rate)
- Live room VIP badge
- Priority advisor booking
- Early access to new quizzes

### À la carte
- Moonstones: $4.99 → 100 / $9.99 → 220 / $24.99 → 600 / $49.99 → 1,300 / $99.99 → 3,000
- Career reading report: $6.99
- Year-ahead forecast: $12.99
- Full natal chart PDF: $9.99
- Live room ticket: $1.99–$9.99 per event

### Advisor revenue split
- Advisor keeps 70% of session fee
- Platform keeps 30%
- Stripe processing ~2.9% + 30¢ comes out of platform's 30%
- Net platform margin: ~25-27%

### Projected unit economics (conservative)
- Average user ARPU if conversion matches Cece at-launch: $3.40/mo
- If advisor marketplace takes off (3% of users do 20 min/mo of advisor time):
  - 3% × $1/min × 20 min × 30% = $0.18/user/mo ARPU uplift
  - Doesn't sound huge — but whale users pull it up to $0.60+/user/mo
- Target at 12 months: 50k MAU, $3.80 blended ARPU, $190k MRR = $2.3M ARR

---

## 7. Timeline — realistic

| Month | Ship |
|---|---|
| **0 (weeks 1-2)** | Phase 0 done. v2 repo live. Dev env + staging running. No user-visible features yet. |
| **1** | Phase 1 content (all the quizzes + Eastern systems). Internal-test AAB uploaded to Play. |
| **2** | Phase 2 community MVP (feed + posts + comments + moderation). Invite-only beta, 50-100 users. |
| **3** | Phase 3 AI layer. Personas shipped. AI companion with memory live. |
| **4** | Phase 5 monetization infra. Moonstones + premium tiers live. Billing tested end-to-end. |
| **5-6** | Phase 4 advisor marketplace (MVP). 10 hand-picked advisors. Limited live rollout. Phase 6 live rooms kick off. |
| **7-8** | Phase 7 3D sandbox. Phase 8 practitioner app foundation. |
| **9-12** | Iteration + growth + content expansion. Marketing push. |

**Checkpoint decisions:**
- End of Month 2: if community feed has <200 DAU, kill community and refocus. Don't sink months into a ghost town.
- End of Month 4: if advisor marketplace has <5 advisors doing >10 sessions/mo, rethink the pricing or pool.
- End of Month 6: if unit economics aren't trending to positive, either double on what's working or merge the winners back into live Arcana and sunset v2.

---

## 8. Team needs — honest

You cannot build this alone in 12 months. Even with AI pair-programming help. Here's what this actually takes:

- **You (product + direction)** — full-time equivalent
- **One senior full-stack engineer** (advisor marketplace is non-trivial — payments + real-time + trust/safety)
- **One designer** part-time (UI systems, visual language for Eastern elements)
- **Content contractor** — writes the 30+ new personality quizzes + I-Ching interpretations + Bazi content. Probably $5-15k for first content batch.
- **Translation** — JA/KO/ZH native-speaker review for all new content. $3-10k depending on volume.
- **Community manager** (month 2 onward) — moderates the forum, seeds posts, onboards first 1000 users. $1-3k/mo.
- **Advisor recruiter** (month 5 onward) — finds + onboards readers. Often the first advisors recruit others.

**Total 12-month cash burn (lean):** $40-80k for contractors + engineer, plus ~$500-2k/mo cloud costs. Less if you engineer more yourself.

If you're staying solo: the timeline stretches to 18-24 months and some phases (3D sandbox, live video, advisor marketplace) are pushed indefinitely.

---

## 9. What I can do *right now* to start

Give me the green light and I can:

1. **Today** — create the new GitHub repo, clone current TAROT as starting point, rename every package/domain reference, scaffold the new Supabase project (via CLI), wire Netlify.
2. **Day 2-3** — scaffold Phase 1: Human Design + I-Ching + Bazi + 5-8 new personality quizzes.
3. **Week 1** — have a deployable v2 web app at a new URL, installable Android AAB via Play Internal Testing, signed in with Google.
4. **Week 2** — ship the community feed MVP (read + post + comment + basic mod tools).

This stops being a planning doc and becomes a build.

---

## 10. Decisions I need from you before starting

1. **Brand name for v2.** A few options:
   - **Oracle** — strong, generic. Already trademarked in tech (Oracle Corp).
   - **Cinnabar** — Taoist alchemy / red mineral. Mystical + Eastern.
   - **Veil** — minimalist, mysterious.
   - **Tessera** — Latin for mosaic piece. Intellectually appealing.
   - **Sybil** — Greek prophetess.
   - **Inkwell** — journaling-led.
   - **Arcana+** / **Arcana Pro** — continuation. Safe but derivative.
   - **Your own suggestion.**

2. **Domain you're willing to buy.** Approx $10-30/year each. Budget one primary + one backup.

3. **Are we committing to the advisor marketplace as the core bet?** If yes, we prioritize Phase 4 over Phase 7. If no, we spend the 6-8 weeks on 3D + community instead. The marketplace is the biggest revenue lever, but the biggest operational lift.

4. **iOS at launch, or Android-only first?** iOS adds 3-4 weeks of cert/signing setup + App Store review risk but is unavoidable eventually. My recommendation: Android-only first, iOS after Month 3.

5. **How much of Arcana v1 gets merged back?** If v2 succeeds, do we kill v1 and migrate users? Or keep v1 as the "free wellness edition" and v2 as "Arcana Pro" with advisor access? My recommendation: second path. v1 = lean free app. v2 = the deeper / paid / advisor-enabled product.

6. **Budget for contractors in months 1-3.** Bare minimum ~$5-10k for content writing + native-speaker translation. Can you commit that?

Once I have these six answers I'll start Phase 0.
