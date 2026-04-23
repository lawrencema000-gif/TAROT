# Smoke-Test Checklist — Sessions A–G + Phase 2 fixes

**Branch:** `feature/iching`
**Verdict gate:** merge to `main` only after every box is checked or has a documented follow-up.

---

## Setup (do this once before testing)

### 1. Deploy preview build
```bash
cd C:/Users/lmao/TAROT
npm run build
netlify deploy --alias=audit-smoke --dir=dist
```
Or if you want a Vercel preview:
```bash
vercel --yes
```

Both preview URLs are isolated from production tarotlife.app — safe to test.

### 2. Enable every flag for your admin account only

Open the Supabase SQL editor:
https://supabase.com/dashboard/project/ulzlthhkqjuohzjangcq/sql

Paste and run the contents of [`enable-admin-flags.sql`](enable-admin-flags.sql). It adds your admin user to the `allowed_user_ids` array on every Sessions A–G feature flag. Regular users still see nothing (flags stay `enabled=false`).

Verify after running:
```sql
SELECT key, enabled, rollout_percent, array_length(allowed_user_ids, 1) AS admin_count
FROM public.feature_flags
WHERE key IN ('runes','dice','compat-invite','advisor-booking','career-report')
ORDER BY key;
```
Every row should show `admin_count >= 1`.

### 3. Set edge function env vars (Supabase dashboard → Edge Functions → Secrets)

Required for each feature group:

| Env | Needed for |
|---|---|
| `GEMINI_API_KEY` | All AI surfaces (companion, quick reading, journal coach, tarot companion, year-ahead, sandbox) |
| `OPENAI_API_KEY` | Community moderation (still works in crisis-regex-only mode without it) |
| `STRIPE_SECRET_KEY` | Pay-per-report Stripe checkout, Moonstone pack web checkout, advisor Connect |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |
| `REVENUECAT_API_KEY` (client env: `VITE_REVENUECAT_API_KEY`) | Native Moonstone pack + subscription purchases |
| `REVENUECAT_WEBHOOK_SECRET` | RevenueCat → Supabase webhook |
| `LIVEKIT_API_KEY` + `LIVEKIT_API_SECRET` + `LIVEKIT_WS_URL` | Voice on advisor sessions + live rooms |

Missing env for any surface → that surface returns 503 cleanly. Safe to test the other surfaces.

### 4. Make sure your admin user has all three kinds of data
- Complete the onboarding (display name, birth date, birth time, birth place)
- Take the MBTI quiz at least once so you have `mbtiType` on profile
- Go to Horoscope → Chart → "Compute my chart" so `astrology_natal_charts` has your row

---

## A. Basic ritual still works (pre-existing features — regression check)

- [ ] Sign in → onboarding completes cleanly
- [ ] Home → horoscope tile loads and shows today's content
- [ ] Home → tarot flip card animates and "saved to highlights" toast fires on save
- [ ] Home → daily ritual all three steps → streak increments
- [ ] Profile → sign out → sign back in → data persists

---

## B. Session A — compliance + divination + extras

### Account compliance (FIXED in Phase 2C)
- [ ] Settings → Export my data → download lands as a .json with your rows (was 500-ing; Phase 2C rewrote the function)
- [ ] Settings → Delete account → warning → confirm → account deleted, redirected to sign-in (was 500-ing)

### Divination surfaces
- [ ] Readings tab → Runes tab appears → cast 3 runes → past/present/future reveal + reversals
- [ ] Readings tab → Dice tab appears → roll 3d6 → sum + title + reading + prompt

### Home widgets
- [ ] Home → "Tonight's Moon" card shows current phase + guidance + ritual

### Numerology
- [ ] Profile → Cosmic Profile section shows Expression / Soul Urge / Personality numbers (when you have displayName + birthDate)

### 7 quizzes from Part 2 (Jungian, love styles, parenting, VARK, empath, self-compassion, PHQ-2)
- [ ] Quizzes tab → each quiz appears in the list
- [ ] Complete Jungian Cognitive Functions → see dimensional result page with name + tagline + strengths + shadow + affirmation

---

## C. Session B — safety + referrals + Career Archetype

### Community moderation
- [ ] Community tab → submit a post with benign content → posts immediately, appears in feed
- [ ] Community tab → submit a post containing a test word from the `CRISIS_PATTERNS` list (e.g. "I want to die") → CrisisBanner appears with 988 + Crisis Text Line + findahelpline.com
- [ ] Community tab → submit a post with OpenAI-flagged content (e.g. slur) → returns CONTENT_BLOCKED, toast says "conflicts with community guidelines"
- [ ] AdminPage → ModerationPanel shows the flagged event → Mark reviewed clears it
- [ ] AdminPage → Crisis flags (priority queue) shows the crisis row → Acknowledge

### Community moderation bypass test (NEW check — Phase 2C)
- [ ] In devtools console: `await supabase.from('community_posts').insert({ user_id: '<your uid>', topic: 'general', content: 'bypass test', is_anonymous: false })`
- [ ] Verify this post does NOT appear in the public feed (trigger forced `moderation_status='pending'`)
- [ ] `select moderation_status from community_posts where user_id='<your uid>' order by created_at desc limit 1` returns `pending`

### Moonstone mint bypass test (NEW check — Phase 2C)
- [ ] In devtools console: `await supabase.from('moonstone_transactions').insert({ user_id: '<your uid>', amount: 10000, kind: 'referral' })`
- [ ] Verify returns `permission denied for table moonstone_transactions` (direct INSERT is revoked)

### Referral program
- [ ] Profile → "Invite friends" opens sheet → Your code appears
- [ ] Copy link → paste in private window → sign up with a NEW email → see your code auto-redeemed → +100 Moonstones each side after onboarding

### Career Archetype Report
- [ ] Profile → "Career Archetype Report" entry visible (requires MBTI)
- [ ] Tap → unlock for 150 Moonstones (or Stripe on web)
- [ ] Report renders with best-fit roles + drains + collaboration + blind spots + 90-day plan

---

## D. Session C — AI memory + chart variants + remaining reports

### AI companion memory (pgvector)
- [ ] Companion → Send 12+ messages across 1 persona (Sage)
- [ ] SQL check: `select count(*) from ai_conversation_memories where user_id='<your uid>'` returns at least 1
- [ ] Send a new message referencing an old topic → assistant weaves in the memory ("What you told me last time about your sister...")

### Year-Ahead Forecast
- [ ] Profile → Year Ahead Forecast → unlock 300 Moonstones
- [ ] 12 monthly briefings render, current year + 12 months
- [ ] Each month card has a theme + up to 4 transit events
- [ ] Click a transit event → explanation unfolds

### Natal Chart Report + Chart Wheel
- [ ] Profile → Full Natal Chart → unlock 200 Moonstones
- [ ] Chart wheel renders at top — tap planets, houses, aspect lines → details appear
- [ ] Toggle tabs: Natal / Transits / Progressions / Solar Return / Synastry
  - [ ] Transits tab shows current planet ring on the wheel
  - [ ] Progressions tab computes age-based positions
  - [ ] Solar Return tab uses current year
  - [ ] Synastry tab prompts for partner birth date; fill in → wheel overlays partner planets + cross-aspects list below
- [ ] Save-as-PDF button triggers browser print → PDF exports correctly

### Admin Moderation Dashboard + Advisor Verification
- [ ] AdminPage → AdvisorVerificationPanel renders (even if empty)
- [ ] Submit a test verification from a dummy account → appears in queue → approve → advisor_profiles.is_hidden flips false

---

## E. Session D — quiz finisher + viral + advisor marketplace

### 5 Sprint 5 quizzes (Anxiety, Leadership, Productivity, Relationship Readiness, Wellness)
- [ ] Each appears in Quizzes tab
- [ ] Complete Anxiety Profile → PHQ-2-style non-diagnostic result

### Compat invite
- [ ] Profile → "Compatibility invite" sheet → Pick kind (MBTI or zodiac) → Generate link
- [ ] Open link in a new private window with another account → auto-reveals joint reading

### AskOracleButton (NEW — Phase 2F)
- [ ] Quiz result → "Read this result for me" card below affirmation → tap → oracle reading opens
- [ ] Tarot card meaning page → "Read this card for me" card → tap → oracle reading
- [ ] Runes page after cast → "Read the cast as a whole" card → oracle interprets the 3-rune combo
- [ ] I-Ching page after hexagram reveal → "Read this hexagram for me" card → oracle interprets

### Advisor marketplace (text MVP)
- [ ] Advisors tab → see 3 seeded advisors
- [ ] Tap advisor → see profile + Book button (flag on)
- [ ] Book → pick 30 min, pick an available slot → cost shows in Moonstones
- [ ] Confirm booking → Moonstones debited → navigate to session page
- [ ] Session page → start session → chat → message appears in realtime for both sides
- [ ] End session → rate with stars + optional review → review saves

### Advisor verification (self-serve)
- [ ] `/advisors/verify` → upload test ID image + selfie video → submit → pending
- [ ] AdminPage → AdvisorVerificationPanel → preview shows both files via signed URLs → approve → advisor becomes visible in /advisors

---

## F. Session E — AI sub-features + Stripe + live rooms

### AI sub-features
- [ ] Home → "3-second reading" tile → `/ai/quick` → ask "What should I focus on this week?" → reading + card render
- [ ] Home → "Tarot companion" tile → `/ai/tarot` → card auto-drawn → oracle chat continues
- [ ] Journal → add entry → "Ask the journal coach" button → 1 observation + 2–3 prompts render

### Stripe direct-pay (WEB ONLY — Phase 2A gate)
- [ ] Open on desktop browser
- [ ] Profile → Career Archetype Report (with 0 Moonstones) → unlock card shows Moonstone CTA + "Or pay $6.99 with card" link
- [ ] Click Stripe link → Stripe Checkout opens in same tab → use test card 4242 4242 4242 4242 → success redirect
- [ ] Wait ~3s for webhook → unlock lands → report renders

### Stripe direct-pay blocked on native (Phase 2A gate)
- [ ] Open Android APK / Capacitor dev build
- [ ] Profile → Career Archetype Report → unlock card shows Moonstone CTA **only** (no Stripe link)
- [ ] Same for Year Ahead and Natal Chart
- [ ] Advisor Dashboard → Payouts card is hidden

### Affiliate accrual
- [ ] Create a new referred account → Stripe-pay for a report → check `affiliate_earnings` for a row with referrer_id + 10% share cents

### Live rooms (voice deferred)
- [ ] `/live-rooms` → list renders
- [ ] Admin SQL: `INSERT INTO public.live_rooms (host_user_id, title, scheduled_at) VALUES ('<admin uid>', 'Test Full Moon', now() + interval '5 minutes');`
- [ ] Refresh `/live-rooms` → scheduled room visible
- [ ] Tap room → RSVP → confirmation toast

---

## G. Session F — LiveKit voice + payouts + chart transits overlay

### LiveKit voice (needs env set)
- [ ] Book an advisor session with yourself as both parties (test account as client + admin as advisor)
- [ ] Start session → Join voice button appears → both connect → mic toggle works → audio plays
- [ ] End session → voice disconnects cleanly

### Advisor payouts (needs Stripe Connect enabled)
- [ ] Advisor dashboard → Payouts card → Set up payouts → Stripe Connect onboarding
- [ ] Complete onboarding → webhook flips payouts_enabled=true
- [ ] Request cashout 100 Moonstones → transfer created in Stripe → cashout state=paid

### Chart transits overlay
- [ ] Natal chart report → Transits tab → current planet ring appears as dashed outer ring on wheel

---

## H. Session G — chart variants + replays + verification + sandbox

### Chart variants (progressions / solar return / synastry) — covered in D.

### Live room replays
- [ ] Admin SQL: set `update live_rooms set recording_url='https://example.com/sample.mp3', replay_price_moonstones=50 where id=<room>;`
- [ ] Navigate to `/live-rooms/<id>` → Replay card with unlock CTA
- [ ] Unlock for 50 Moonstones → audio element appears

### Three.js sandbox
- [ ] `/sandbox` → plinth renders with auto-rotating camera (first open triggers 667 KB vendor-three chunk load)
- [ ] Place 3 objects → spiral placement visible
- [ ] "Read the arrangement" → AI interpretation appears
- [ ] Navigate away and back → no error, memory doesn't balloon (Phase 2E fix: geometries disposed)

### Sandbox WebGL fallback (Phase 2E)
- [ ] In devtools, disable WebGL via chrome://flags → reload sandbox
- [ ] Page shows "3D preview is not available" card instead of crashing

---

## I. Security hardening regression tests (Phase 2C)

Test these from devtools console with an authenticated session:

- [ ] `await supabase.from('compat_invites').select('inviter_result').limit(5)` → returns ONLY your own invites (not leaks from others)
- [ ] `await supabase.from('moonstone_transactions').insert({...})` → `permission denied`
- [ ] `await supabase.from('moonstone_daily_checkins').insert({...})` → `permission denied`
- [ ] `await supabase.from('advisor_sessions').update({ moonstone_cost: 0 }).eq('id', '<my session id>')` → updates 0 rows (column not in grant)
- [ ] `await supabase.from('advisor_sessions').update({ rating: 5, review: 'great' }).eq('id', '<my session id>')` → updates 1 row (allowed columns)

---

## J. Moonstone top-up flow (Phase 2A)

### Native (Android APK)
- [ ] Home → Moonstone widget + button → sheet opens
- [ ] 4 packs render with Play-Store local-currency pricing
- [ ] Tap a pack → Play Billing dialog → complete test purchase
- [ ] Within ~5 seconds, RevenueCat webhook fires → ledger credits → balance updates

### Web
- [ ] Home → Moonstone widget + button → sheet opens
- [ ] 4 packs render with $ USD pricing
- [ ] Tap a pack → Stripe Checkout opens → test card → success
- [ ] Webhook fires → ledger credits → balance updates

---

## K. Cross-feature integration regression

- [ ] Complete 7-day check-in streak → day 7 toast says "+25 Moonstones" (streak milestone Phase 2B)
- [ ] Cancel an advisor session → Moonstones refunded via `refund` transaction
- [ ] Redeem a referral → both sides have `referral` transactions → retry redemption → "already redeemed" error, NO double credit
- [ ] Book two advisor sessions concurrently in two tabs (for the same advisor, same slot) → one succeeds, one fails with slot-taken

---

## Pass criteria for merging `feature/iching` → `main`

- [ ] Sections A, I, J, K fully passing (regression + security + monetization)
- [ ] At least 80% of B–H passing (known env-gated holes documented for follow-up)
- [ ] No P0 regression from the current production build

If anything fails unexpectedly, open an issue referencing the specific section+checkbox. Phase 4 will ship a release note with any known follow-ups.
