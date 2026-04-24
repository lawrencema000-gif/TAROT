# Phase 1D — Cross-Feature Moonstone Flow Trace

**Scope:** verify every Moonstone-consuming and Moonstone-crediting surface debits/credits the ledger correctly, and trace how feature flags compose.
**Verdict:** 🟡 Two critical gaps (no top-up flow, no admin intervention RPCs). Core flows are otherwise consistent.

---

## Full ledger kind map

The `moonstone_transactions.kind` CHECK constraint permits 12 kinds. Where each is produced today:

| Kind | Produced by | Sign | Notes |
|---|---|---|---|
| `daily-checkin` | `moonstone_daily_checkin()` RPC (+ exploit via direct INSERT, see 1C F2) | + | 7-day ladder 5→50 |
| `quiz-complete` | Client direct INSERT in `dal/moonstones.ts:awardQuizCompletion` | + | 2 per completion; exploitable |
| `referral` | `referral_redeem()` RPC | + | 100 per side |
| `streak` | **Never produced** | + | Defined in constraint, no writer |
| `gift` | `live_room_tip()` RPC (tipper debit) | − | Tips to live room host |
| `gift-receive` | `live_room_tip()` + `live_room_replay_unlock_moonstones()` (host credit) | + | Counted toward cashout eligibility |
| `advisor-session` | `advisor_book_session()` RPC | − | Session booking debit |
| `pay-per-report` | `unlock_report_with_moonstones()`, `live_room_replay_unlock_moonstones()` (client debit) | − | Report + replay unlocks |
| `refund` | `advisor_session_cancel()` RPC | + | Full refund on cancel |
| `admin-grant` | **Never produced** | + | No admin RPC exists |
| `admin-claw` | **Never produced** | − | No admin RPC exists |
| `purchase` | **Never produced** | + | Paid top-up — not wired |

---

## Findings

### F1 🔴 P0 — No `purchase` flow: Moonstones cannot be bought
This is Phase 1A F3 restated from a ledger perspective. Every surface that SPENDS Moonstones exists. Zero surfaces credit them through a purchase. The closest the ledger comes to recognizing purchases is the CHECK constraint allowing the kind.

**Impact:**
- First user to hit a 300-Moonstone Year-Ahead paywall with <300 Moonstones earned = stuck
- All three pay-per-reports, advisor bookings, replay unlocks become gated on earn-only accumulation
- Top-line revenue from Moonstone packs ($2.99 / $7.99 / $16.99 / $39.99) = $0 until this exists

**Resolution:** Phase 2A F3 covers this — add Moonstone products to RevenueCat and extend both webhooks to credit.

### F2 🔴 P0 — No `admin-grant` / `admin-claw` RPCs for customer support
The CHECK constraint allows these kinds but there's no RPC for an admin to call. Today, if a user complains "my cashout failed but my balance didn't restore," the only remediation is manual SQL via the Supabase dashboard.

**Impact:** customer support has no safe tool. A well-meaning admin running raw UPDATE queries on the ledger bypasses triggers (sign enforcement) and creates inconsistent balances.

**Fix (Phase 2 follow-up, not urgent for launch but before first support incident):**
```sql
CREATE FUNCTION admin_moonstone_grant(p_user_id uuid, p_amount integer, p_note text) RETURNS ...
-- checks public.is_admin(), inserts positive transaction with kind='admin-grant'
CREATE FUNCTION admin_moonstone_claw(p_user_id uuid, p_amount integer, p_note text) RETURNS ...
-- similar, with kind='admin-claw'
```

### F3 🟡 P1 — `streak` kind is defined but never produced
The moonstones_ledger.sql kind list includes `streak` for milestone bonuses (day 7, 30, 100). No code produces this. Either:
- Intended: drop from constraint
- Forgotten: wire the existing `checkAndAwardStreakMilestone()` service to insert streak-kind transactions instead of XP only

Current behaviour: streak milestones only grant XP. Not a bug per se, but drift.

### F4 🟡 P1 — Live room tip flow double-credits the host's Moonstone ledger
**File:** [20260511000000_live_rooms.sql:120-140](../supabase/migrations/20260511000000_live_rooms.sql) — the `live_room_tip()` RPC

Flow when a listener tips a host 10 Moonstones:
1. Listener `gift` debit: -10
2. Host `gift-receive` credit: +10 ✅

Separately, when a replay unlock happens for a room with `replay_price_moonstones = 50`:
1. Listener `pay-per-report` debit: -50 ✅
2. Host `gift-receive` credit: +35 (70%) ✅

This is correct in isolation, but the `v_advisor_cashout_eligibility` view counts `gift-receive` for cashable balance. That means **tips to an advisor via their live room are cashable**, which is probably desired — but means **anyone who has ever hosted a live room can cash out tips**, not just advisors.

Re-checking the view definition in `20260513000000_advisor_payouts.sql:75`:
```sql
WHERE EXISTS (SELECT 1 FROM public.advisor_profiles p WHERE p.user_id = u.id)
```
✅ The view already filters to users with advisor profiles. Non-advisor live room hosts can't cash out even if they receive tips. Correct.

### F5 🟡 P1 — `referral_redeem()` orders ledger writes before the redemption PK, allowing double-credit on retry
Detailed in Phase 1C F7. Bundled there.

### F6 🟡 P1 — `advisor_session_cancel()` refunds on cancellation, but `advisor_session_end()` at 0-min elapsed does not
Current policy: cancel before `state='active'` → full refund. Once active, no refund. But what if advisor marks `active` then immediately `completed` (30 seconds in)? The session is consumed, client paid the full rate. No mechanism to refund partial.

**Spec question:** should we debit based on actual duration? Roadmap implies yes for voice sessions. Text-only sessions debit full regardless of duration.

**Decision to make:** leave as-is for MVP (simpler, matches text-session semantics). Flag for Phase 2 if product disagrees.

### F7 🟡 P1 — Quiz completion has no uniqueness guard
`awardQuizCompletion(userId, reference)` inserts a `quiz-complete` transaction with `reference=<quizId>` but there's no unique index on `(user_id, reference, kind)`. A user can complete the same quiz 1000 times in a session and get +2000 Moonstones.

**Fix (bundled with Phase 1C F2 fix — move to RPC):**
```sql
CREATE UNIQUE INDEX moonstone_transactions_quiz_unique_idx
  ON public.moonstone_transactions (user_id, reference)
  WHERE kind = 'quiz-complete';
```
RPC checks conflict and returns early (no ledger insert) on dupe.

### F8 🟡 P2 — Ledger never receives a `purchase` so the view's `transaction_count` understates activity
Cosmetic — `moonstone_balances` view shows transaction_count based on ledger rows. Once purchases are wired, this becomes accurate. Non-issue.

---

## Flag composition check

### Community + moderation
- `community` (default OFF) + `community-moderation-required` (default ON)
- If `community` is ON but `community-moderation-required` is OFF: posts write without any server-side moderation pass, with only client-side regex screen. Crisis keywords caught by the client only, and client can be bypassed.
- **Finding:** `community-moderation-required` default is correctly ON. But the flag doesn't actually GATE the edge function invocation — the edge function always runs when called. The flag just tells the client to call it. A malicious client that doesn't invoke `community-moderate` can INSERT directly via the RLS policy.

**Let me verify:** `community_posts_insert_own` policy allows `auth.uid() = user_id` INSERT with no moderation check. A user can post without calling the moderation function.

🔴 **Escalation to Phase 1C F13** — community moderation is client-enforced only. A bypass attacker can post anything.

**Fix:** the `community_posts` INSERT policy should require `moderation_status IS DISTINCT FROM 'blocked'`, or the INSERT should go through a SECURITY DEFINER RPC that atomically calls the moderation function and inserts.

### Flag hierarchy (`advisor-voice` requires `advisor-booking`; `live-rooms-voice` requires `live-rooms`)
- `advisor-voice` enables the voice strip inside `AdvisorSessionPage`. If `advisor-booking` is OFF, the user never reaches the session page — flag composes correctly.
- `live-rooms-voice` gates the VoiceStrip inside LiveRoomPage. If `live-rooms` is OFF, the list page doesn't render — safe.

Both compose correctly.

### `chart-variants` requires valid natal chart data
- `chart-variants` flag is ON by default (read-side only, low risk)
- Variants are gated inside `NatalChartReportPage` which ALSO requires `natal-chart-report` unlock. So chart-variants only *actually* runs inside an unlocked paid report. If `natal-chart-report` is OFF, users never see the variants toggle.

✅ Safe composition.

---

## New escalation from flag check

### F13 🔴 P0 — Community moderation is bypassable
**Files:** [20260427000000_community_feed.sql](../supabase/migrations/20260427000000_community_feed.sql) INSERT policy, [services/moderation.ts](../src/services/moderation.ts), [pages/CommunityPage.tsx](../src/pages/CommunityPage.tsx)

Current path:
1. User types a post
2. Client calls `moderateContent()` → `community-moderate` edge function
3. If verdict is `block`, client shows error and doesn't submit
4. Otherwise client calls `community.createPost()` → direct INSERT with RLS check

**Bypass:** open devtools, paste `supabase.from('community_posts').insert({ user_id: '<me>', topic: 'general', content: '<any content>', is_anonymous: false })`. No moderation runs. The post lands with `moderation_status='allowed'` (default) and appears in the feed.

The `community-moderation-required` flag is purely a client-side display toggle. It tells the client to *call* moderation. It doesn't *enforce* that the server saw a moderation verdict.

**Fix:** the only correct solution is to move post/comment inserts into SECURITY DEFINER RPCs that call the moderation pipeline inline. Or put moderation inline as a BEFORE INSERT trigger (expensive — triggers can't call edge functions directly, and OpenAI API calls from inside Postgres are gross).

**Best pragmatic fix:**
1. Drop `community_posts_insert_own` and `community_comments_insert_own` INSERT policies
2. Add `community_post()` and `community_comment()` SECURITY DEFINER RPCs which:
   - Require the moderation verdict as a parameter (signed / HMAC-protected)
   - OR embed a call to OpenAI Moderation via `net.http_post` + `pg_net` extension
3. Client calls the RPC instead of direct INSERT

Simpler, shorter-term fix: the edge function `community-moderate` currently only returns a verdict. Change it to **also perform the post insertion** using service-role credentials, and revoke direct INSERT from authenticated. Every post goes through the function, verdict and insert happen together.

This will be bundled in Phase 2A/2B.

---

## Summary for Phase 2 priority

| ID | Severity | Effort | Bundle with |
|----|----------|--------|-------------|
| F1 (no purchase flow) | 🔴 P0 | M | Phase 2A F3 |
| F2 (no admin RPCs) | 🔴 P0 before first support incident | S | Phase 2B |
| F3 (streak never fired) | 🟡 P1 | XS | Phase 2B |
| F5 (referral double-credit on retry) | 🟡 P1 | S | Phase 2D |
| F7 (quiz-complete dedup) | 🟡 P1 | XS | bundled in Phase 1C F2 fix |
| F13 (community moderation bypass) | 🔴 P0 | M | Phase 2B |

F1, F2, F13 are the blockers. Rest are P1 cleanup.
