# Sessions A–G Release — Full Roadmap Completion

**Branch:** `feature/iching`
**Last commit at release:** see `git log -1 feature/iching`
**Status of live DB:** migrations through `20260517_session_g_feature_flags.sql` applied to Supabase project `ulzlthhkqjuohzjangcq` (TAROT).
**Status of edge functions:** all 31 functions deployed.

The work across Sessions A–G completes every sprint in `.audit/INCREMENTAL-ROADMAP.md`, including the Sprint 20 optional. Every feature ships behind a feature flag and defaults OFF unless noted otherwise. Flip flags from the Supabase `feature_flags` table or the admin UI.

---

## 1. What shipped, by session

### Session A — Compliance + divination + extras
- `account-delete` edge function (Apple App Store self-service)
- `account-export` edge function (GDPR)
- Runes (Elder Futhark, 24 staves, 3-rune cast)
- Dice oracle (3d6, 16 readings)
- Moon phase widget on home (8-phase classifier)
- 7 more personality quizzes (Jungian, love styles, parenting, VARK, empath, self-compassion, PHQ-2)
- Pythagorean Expression / Soul Urge / Personality numbers on profile

### Session B — Safety + growth + monetization pillar 1
- Community moderation pipeline (OpenAI Moderation + crisis regex + admin audit trail)
- CrisisBanner component surfaced on self-harm ideation
- Referral program (100 Moonstones each side, 30-day freshness, single-redemption PK)
- Career Archetype deep report — pay-per-report #1 (150 Moonstones / $6.99). 16 MBTI archetypes × ~900 words.

### Session C — AI memory + remaining reports + mod dashboard
- pgvector memory for AI companion (`ai_conversation_memories` + Gemini text-embedding-004)
- `ai-companion-chat` rewritten on current handler with persist → embed → retrieve → inject → reply → background summarization
- Year-Ahead Forecast (pay-per-report #2, 300 Moonstones / $12.99) — 12 monthly briefings from outer-planet transits
- Full Natal Chart printable report (pay-per-report #3, 200 Moonstones / $9.99) — `window.print()` for PDF export
- `ModerationPanel` in AdminPage showing moderation_events + crisis_flags with acknowledge/mark-reviewed

### Session D — Quiz finisher + viral + advisor marketplace MVP
- 5 final quizzes (Anxiety Profile non-diagnostic, Leadership, Productivity, Relationship Readiness, Wellness Type) — 22 extras total
- Compatibility deep-link invites (`/invite/:code`) with joint-reading reveal
- Affiliate tier on referrals (schema + admin approval flow + accrual ledger)
- Advisor marketplace end-to-end (text-only): availability editor, booking RPC with atomic Moonstone debit, Realtime-backed chat, post-session rating

### Session E — AI sub-features + chart wheel + Stripe direct-pay + live rooms
- `ai-quick-reading` (3-second reading) + client page
- Tarot companion mode (draw → oracle-chat about the card)
- `ai-journal-coach` + inline editor integration
- Interactive SVG chart wheel component
- `create-report-checkout` Stripe one-off checkout for all three reports
- stripe-webhook branch for pay-per-report unlocks + 10% affiliate accrual
- Live rooms list + RSVP + Moonstone tips (voice deferred to Session F)

### Session F — LiveKit voice + advisor payouts + transits
- `livekit-token` edge function with per-room permission checks
- `useLiveKit` hook with lazy-loaded SDK (own `vendor-livekit` chunk, 360 KB)
- `VoiceStrip` component on advisor sessions + live rooms
- Advisor payouts: Stripe Connect Express onboarding + Moonstone cashout (10=$1, 70/30 split)
- `astrology-current-positions` edge function + transits overlay on chart wheel

### Session G — Chart variants + replays + verification + sandbox
- `astrology-progressions` (secondary progressions, day-for-a-year)
- `astrology-solar-return` (bisection search, 1-minute resolution)
- `astrology-synastry` (partner positions + ranked cross-aspects)
- 5-tab variant toggle on the natal chart wheel
- Live room replay unlocks (Moonstone paywall, 70% host share, auto-free for attended RSVPs)
- Advisor verification (self-serve ID + selfie upload → admin queue → auto-unhide on approval)
- Three.js archetypal sandbox preview (lazy `vendor-three` chunk, 667 KB)

---

## 2. Feature flags — the full list

Every new feature sits behind a flag in `public.feature_flags`. Flip to `enabled=true, rollout_percent=100` to go live for everyone.

| Flag | Default | Unlocks |
|---|---|---|
| `community` | OFF | Community feed tab |
| `whispering-well` | OFF | Anonymous community feed |
| `moonstones` | OFF | Moonstone widget on home |
| `daily-wisdom` | OFF | Daily wisdom card on home |
| `daily-checkin` | OFF | Daily check-in reward |
| `moon-phases` | OFF | Tonight's Moon card on home |
| `runes` | OFF | Runes tab in Readings |
| `dice` | OFF | Dice oracle tab in Readings |
| `iching` | OFF | I-Ching tab |
| `bazi` | OFF | Bazi tab |
| `human-design` | OFF | Human Design tab |
| `feng-shui` | OFF | Feng Shui bagua tab |
| `dream-interpreter` | OFF | Dream interpreter tab |
| `mood-diary` | OFF | Mood diary tab |
| `partner-compat` | OFF | Partner compatibility tab |
| `ai-companion` | OFF | 4-persona AI companion |
| `ai-quick-reading` | OFF | 3-second reading page |
| `ai-tarot-companion` | OFF | Tarot companion page |
| `journal-coach` | OFF | AI coach button inside journal editor |
| `chart-wheel` | **ON** | SVG wheel inside unlocked natal report |
| `chart-transits` | **ON** | Transits overlay on the wheel |
| `chart-variants` | **ON** | Progressions / solar return / synastry tabs |
| `community-moderation-required` | **ON** | Safety gate — keep ON always |
| `referral` | OFF | Invite & earn sheet on profile |
| `compat-invite` | OFF | Invite-friend sheet + `/invite/:code` |
| `affiliate-program` | OFF | Affiliate application UI (server schema unconditional) |
| `career-report` | OFF | Career archetype report entry |
| `year-ahead-report` | OFF | Year-ahead forecast entry |
| `natal-chart-report` | OFF | Natal chart printable entry |
| `advisor-booking` | OFF | Book-session button in advisor directory |
| `advisor-voice` | OFF | LiveKit voice on sessions (needs LiveKit env) |
| `advisor-payouts` | OFF | Stripe Connect cashout card (needs Stripe Connect env) |
| `advisor-verify` | OFF | `/advisors/verify` self-serve flow |
| `live-rooms` | OFF | `/live-rooms` listing |
| `live-rooms-voice` | OFF | Voice inside live rooms (needs LiveKit env) |
| `live-replays` | OFF | Replay card on completed rooms |
| `sandbox` | OFF | Three.js `/sandbox` preview |
| `tarot-section-split` | OFF | Internal refactor gate (no user-visible change) |
| `gemini-flash-default` | OFF | Cheaper AI model in generate-reading |

---

## 3. Environment variables required before flipping certain flags

| Flag | Required env (set in Supabase dashboard → Edge Functions → Secrets) |
|---|---|
| `advisor-voice`, `live-rooms-voice` | `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_WS_URL` |
| `advisor-payouts` | `STRIPE_SECRET_KEY` with Connect permissions; webhook listening to `account.updated` |
| Any Stripe direct-pay (reports) | `STRIPE_SECRET_KEY` + webhook listening to `checkout.session.completed` |
| `community-moderation-required` (recommended) | `OPENAI_API_KEY` — without it, the edge function still runs on the crisis-regex path but won't catch OpenAI category hits |
| AI features (companion, quick reading, journal coach, year-ahead, sandbox interpretation) | `GEMINI_API_KEY` |

---

## 4. Smoke-test checklist before merging `feature/iching` → `main`

Run through these after flipping each flag ON for your own test account:

**Basic ritual still works**
- [ ] Sign in, draw daily card, complete ritual, streak increments
- [ ] Horoscope tab loads daily content

**New surfaces**
- [ ] `/readings` → Runes tab — cast 3 runes, share
- [ ] `/readings` → Dice tab — roll 3d6, read
- [ ] Home → Tonight's Moon card shows current phase
- [ ] Home → 3-second reading tile routes to `/ai/quick`, submit a question, get reading
- [ ] Home → Tarot companion tile routes to `/ai/tarot`, auto-seeds first message, follow-up chats work
- [ ] `/companion` → AI companion — after 10+ user turns, a memory row appears in `ai_conversation_memories`
- [ ] Profile → Expression / Soul Urge / Personality numbers show
- [ ] Profile → Invite friends sheet — generate code, copy link
- [ ] Profile → Compatibility invite sheet — generate link, open in incognito, resolve joint reading
- [ ] Profile → Career Archetype Report — unlock with Moonstones, view report, hit share
- [ ] Profile → Year-Ahead Forecast — unlock, compute, see 12 monthly briefings
- [ ] Profile → Full Natal Chart — unlock, see wheel, toggle Natal / Transits / Progressions / Solar return / Synastry
  - [ ] Synastry tab — enter partner DOB, see cross-aspects
  - [ ] Print button triggers browser print-to-PDF
- [ ] Community feed — submit a post, see "under review" toast if a flagged word, confirm `moderation_events` row
- [ ] AdminPage → Moderation Queue — sees the event, mark reviewed clears it
- [ ] AdminPage → Advisor Verifications — approve a test verification, advisor is unhidden

**Monetization**
- [ ] Stripe one-off checkout for a report redirects cleanly, returns, unlock lands via webhook
- [ ] Advisor booking debits Moonstones; cancellation refunds
- [ ] Advisor cashout: onboarding link redirects to Stripe Connect, webhook flips `payouts_enabled`, cashout transfer succeeds on a test account

**Voice (if LIVEKIT env set)**
- [ ] `/advisors/session/:id` with state=active — tap Join voice, both participants connect
- [ ] `/live-rooms/:id` — host publishes, RSVPd user subscribes

**Sandbox**
- [ ] `/sandbox` renders WebGL plinth (first open triggers 667 KB `vendor-three` chunk load)
- [ ] Place 3 objects, tap Read the arrangement, see AI interpretation

---

## 5. Post-merge follow-ups (explicitly not in this release)

- RevenueCat mobile IAP for Moonstone packs (schema ready; store setup is separate)
- LiveKit Egress for automatic recording upload to storage (currently `live_rooms.recording_url` is manually populated by host/admin)
- Advisor sessions deep-link on native app (iOS/Android routing)
- Full JA/KO/ZH translations for Session A–G namespaces (stubs are in place; they fall back to English at runtime)
- Per-feature analytics events
- Scaling review when DAU crosses 10k (Supabase Pro upgrade threshold)

---

## 6. If something goes wrong

**Kill switch per feature:** flip its flag to `enabled=false` in `public.feature_flags`. Takes effect within 5 minutes (client refresh interval).

**Community emergency:** flip `community` OFF; `community-moderation-required` should stay ON even during incident response — that flag gates the `community-moderate` edge function from allowing un-moderated posts.

**Voice issues:** `advisor-voice` OFF; sessions fall back to text chat (which is unaffected because chat is a separate path via `session_messages` / Realtime).

**Stripe issues:** `advisor-payouts` OFF prevents new cashout requests; existing pending rows are safe. For direct-pay failures, users still have the Moonstone unlock path.

---

*Generated as part of the Session G finishing pass.*
