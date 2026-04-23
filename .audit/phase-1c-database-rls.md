# Phase 1C — Database + RLS Audit

**Scope:** 30 new tables, 26 new RPCs, 4 new views, across migrations `20260427` → `20260517`.
**Verdict:** 🔴 Four P0 security holes. Otherwise the schema is sound.

---

## Structural summary

| Check | Pass/Fail |
|---|---|
| RLS enabled on every new table | ✅ 30/30 |
| At least one SELECT policy on every new table | ✅ 30/30 |
| SECURITY DEFINER + SET search_path on every new RPC | ✅ 26/26 |
| `security_invoker = true` on new views | ✅ 4/4 (moonstone_balances, compat_invite_public, v_affiliate_totals, v_advisor_cashout_eligibility) |
| FK ON DELETE appropriate (CASCADE for owned, SET NULL for audit, RESTRICT for guarded) | ✅ consistent |
| Indexes on common query columns | ✅ 40 new indexes |
| Trigger functions use SECURITY DEFINER | ✅ all 8 (community counters, moonstone enforce, advisor profile updated, live room attend grant, etc.) |

The *patterns* are correct. The *specific policies* for 4 high-value surfaces are wrong.

---

## Findings

### F1 🔴 P0 — `compat_invites` leaks `inviter_result` to every authenticated user
**File:** [20260507000000_compat_invites.sql:85](../supabase/migrations/20260507000000_compat_invites.sql)

```sql
CREATE POLICY compat_invites_select_by_code
  ON public.compat_invites FOR SELECT
  TO authenticated
  USING (true);
```

**Plus:** `GRANT SELECT ON public.compat_invites TO authenticated` (all columns).

The migration's own comment admits the issue and tries to work around it with a narrower view (`compat_invite_public`), but the workaround is defensive-only — Postgres RLS policies OR together, and column-level restrictions require explicit column grants, not comments.

**Exploit:**
```ts
// Any signed-in user, in their browser console:
supabase.from('compat_invites').select('inviter_user_id, inviter_result').limit(10000)
// → dumps every invite's inviter MBTI + birth date.
```

**Impact:** PII leak. Every compat invite's inviter_result contains the inviter's MBTI and/or birth date. A dump of the full table reveals personally identifying info of every inviter.

**Fix:** drop the `_select_by_code` policy. Only the inviter owns their row; everyone else queries via the `compat_invite_public` view which exposes only safe columns.

```sql
DROP POLICY compat_invites_select_by_code ON public.compat_invites;
-- compat_invites_select_inviter already exists → inviter-only row read is preserved.
```

Client-side: `fetchPublicByCode` already queries the view, so no client change needed.

### F2 🔴 P0 — Users can mint arbitrary Moonstones via direct INSERT
**File:** [20260428000000_moonstones_ledger.sql:112](../supabase/migrations/20260428000000_moonstones_ledger.sql)

```sql
CREATE POLICY moonstone_transactions_insert_own_credits
  ON public.moonstone_transactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND kind IN ('daily-checkin', 'quiz-complete', 'referral')
  );
```

**Exploit:**
```ts
// Any signed-in user:
supabase.from('moonstone_transactions').insert({
  user_id: '<my uid>',
  amount: 999999,
  kind: 'referral',      // or 'quiz-complete', or 'daily-checkin'
  note: 'lol'
})
// → balance instantly up by 999,999.
```

**Impact:** The economic exploit is total. Moonstones buy:
- Pay-per-reports (careers, year-ahead, natal chart)
- Advisor sessions
- Live room replays + tips
Each has real cost to the platform (AI calls, advisor time). A malicious user gets unlimited free access to every paid feature.

**Why the `moonstone_enforce_sign` trigger doesn't help:** it only asserts that credit-kind rows have `amount > 0`. No cap, no reference-row check.

**Fix (proposed):**
1. **Revoke direct INSERT** from authenticated; restrict to service_role:
   ```sql
   REVOKE INSERT ON public.moonstone_transactions FROM authenticated;
   DROP POLICY moonstone_transactions_insert_own_credits ON public.moonstone_transactions;
   ```
2. **Move the one remaining client-side insert** (quiz completion award in [dal/moonstones.ts:89](../src/dal/moonstones.ts#L89)) to a new `moonstone_award_quiz_completion(quiz_id)` RPC that:
   - Checks no prior `quiz-complete` transaction exists with that `quiz_id` reference
   - Caps amount at 2
   - Inserts the ledger row
3. Daily check-in and referral already use SECURITY DEFINER RPCs (`moonstone_daily_checkin()`, `referral_redeem()`) so they continue to work.

### F3 🔴 P0 — Users can fabricate check-in history via direct INSERT
**File:** [20260428000000_moonstones_ledger.sql:131](../supabase/migrations/20260428000000_moonstones_ledger.sql)

```sql
CREATE POLICY moonstone_daily_checkins_insert_own
  ON public.moonstone_daily_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**Exploit:** a user can INSERT directly into `moonstone_daily_checkins` with arbitrary `streak_day` and `amount`. The PK `(user_id, date)` limits them to one per day, BUT:
- Back-filling historical dates is allowed
- `streak_day` is not validated against actual continuous history
- `amount` can be set to the 7-day milestone (50) every day

Compounds with F2 because the user can then fabricate matching `moonstone_transactions` rows.

**Fix:** revoke direct INSERT and make the RPC the only insertion path (it already is for legitimate users — the policy just allows a bypass).

```sql
REVOKE INSERT ON public.moonstone_daily_checkins FROM authenticated;
DROP POLICY moonstone_daily_checkins_insert_own ON public.moonstone_daily_checkins;
```

### F4 🔴 P0 — `advisor_sessions` UPDATE grant allows clients to rewrite entire session rows
**File:** [20260509000000_advisor_booking.sql:108](../supabase/migrations/20260509000000_advisor_booking.sql)

```sql
CREATE POLICY advisor_sessions_rate
  ON public.advisor_sessions FOR UPDATE
  USING (auth.uid() = client_user_id)
  WITH CHECK (auth.uid() = client_user_id);

GRANT SELECT, UPDATE ON public.advisor_sessions TO authenticated;
```

**Comment says** "Direct UPDATE only for the rating/review columns" but the policy and grant allow UPDATE on *every* column.

**Exploit:** a client can update their own sessions to:
- `state='completed'` without ever calling `advisor_session_start` / `advisor_session_end`
- `started_at`/`ended_at` to arbitrary times
- `moonstone_cost = 0` retroactively (doesn't refund the debit but misleads advisor dashboards)
- `advisor_id` to a different advisor (!) — attaching their session to someone else's profile
- `duration_minutes` = 60 on a 15-min booking (increases advisor earnings view)

**Fix:** replace the table-wide grant with column-specific privilege:

```sql
REVOKE UPDATE ON public.advisor_sessions FROM authenticated;
GRANT SELECT ON public.advisor_sessions TO authenticated;
GRANT UPDATE (rating, review) ON public.advisor_sessions TO authenticated;
-- policy remains for row-level check
```

### F5 🟡 P1 — `live_rooms_host_manage` policy lets any auth user INSERT as host
**File:** [20260511000000_live_rooms.sql:79](../supabase/migrations/20260511000000_live_rooms.sql)

```sql
CREATE POLICY live_rooms_host_manage
  ON public.live_rooms FOR ALL
  USING (auth.uid() = host_user_id OR public.is_admin());
```

`FOR ALL` with only `USING` — for INSERT, Postgres falls back to using USING as WITH CHECK. That's actually correct: a user can INSERT only rows where `host_user_id = auth.uid()`.

So any authenticated user can create a live room with themselves as host. **Is this intended?** Right now there's no UI for non-admin room creation, so it's not exploited in the wild. If product wants "admins-only create rooms", tighten to:

```sql
WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM advisor_profiles WHERE user_id = auth.uid()))
```

Non-critical but worth deciding.

### F6 🟡 P1 — `advisor_availability` FOR ALL allows INSERT by any auth user who spoofs advisor_id
**File:** [20260509000000_advisor_booking.sql:51](../supabase/migrations/20260509000000_advisor_booking.sql)

Same pattern as F5. The `EXISTS (SELECT ... WHERE user_id = auth.uid())` subquery in USING guards correctly for INSERT (as WITH CHECK fallback). A user can only create availability rows for advisor profiles they own.

BUT: `setAvailabilitySlots()` in the DAL does `DELETE ... WHERE advisor_id = advisorId` first, then INSERT. The DELETE is protected by the same policy (only the advisor owning the profile can delete). ✅ safe.

### F7 🟡 P1 — `referral_redeem()` is not idempotent across retries
**File:** [20260502000000_referral_program.sql:121](../supabase/migrations/20260502000000_referral_program.sql)

The RPC inserts two ledger rows (referrer + invitee credits) followed by a redemption row. If the client retries on network timeout, the PK on `referral_redemptions (invitee_id)` catches the dupe and throws — but the two `moonstone_transactions` rows are already written. **The invitee and referrer each get double-credited.**

**Fix:** wrap the whole RPC in `BEGIN / EXCEPTION WHEN unique_violation` around the redemption INSERT, inserting redemption FIRST then ledger rows, so a dupe throws before any Moonstones are minted.

### F8 🟡 P1 — `advisor_cashout_request()` + `advisor-cashout` edge function have a narrow race
**File:** [20260513000000_advisor_payouts.sql:75](../supabase/migrations/20260513000000_advisor_payouts.sql)

The cashout eligibility view sums `gift-receive` transactions minus pending/processing/paid cashouts. The RPC reads eligibility then INSERTs a pending cashout. Two concurrent requests from the same advisor racing by <1ms can both read `cashable=1000`, both pass the check, both insert pending rows for 1000 each. Platform disburses 2×payouts for 1×earnings.

**Fix:** wrap the eligibility check + insert in a SELECT FOR UPDATE on `advisor_payout_accounts` (single row per advisor) to serialize.

### F9 🟡 P2 — `advisor_sessions.client_user_id ON DELETE CASCADE` loses tax/payout records
If a client deletes their account, their past session rows are deleted. The advisor's `gift-receive` Moonstone rows remain with a dangling `reference` field but lose linkage. For advisors that cashed out earnings from those sessions, tax records become harder to reconstruct.

**Fix (not urgent):** switch to `ON DELETE SET NULL` and add a `deleted` flag. Advisors keep session rows; the client is just anonymized.

### F10 🟢 OK — Advisor verification storage bucket policies
Private bucket, MIME-type allowlist, storage RLS scopes by `(storage.foldername(name))[1] = auth.uid()::text`. Admin read allowed via `public.is_admin()`. Correct.

### F11 🟢 OK — Community feed policies compose correctly
- Posts: public read (excluding hidden), insert own, update own, delete own ✅
- Comments: same ✅
- Reactions: public read, insert/delete own ✅
- Reports / Blocks: own-only ✅
- Plus the new `moderation_status` partial index on the public feed makes flagged / blocked posts invisible even to other authenticated users ✅

### F12 🟢 OK — AI conversation tables are service-role write
No user INSERT policy on `ai_conversation_turns` or `ai_conversation_memories` — writes only via edge function. Reads scoped to own rows. ✅

---

## Fix priorities

| ID | Severity | Fix complexity | Blocks release? |
|----|----------|----------------|-----------------|
| F1 | 🔴 P0 | XS (drop one policy) | YES — PII leak |
| F2 | 🔴 P0 | S (revoke + new RPC for quiz) | YES — breaks monetization |
| F3 | 🔴 P0 | XS (revoke + drop policy) | YES — bundled with F2 |
| F4 | 🔴 P0 | XS (column-specific grant) | YES — data-integrity |
| F5 | 🟡 P1 | XS | No — no exploit path currently |
| F6 | 🟡 P1 | — (already safe) | No |
| F7 | 🟡 P1 | S | No — rare race |
| F8 | 🟡 P1 | S | No — race is narrow |
| F9 | 🟡 P2 | S | No |

**Recommendation:** F1-F4 MUST ship before any feature flag that touches Moonstones or PII is flipped ON for real users. Total fix surface is a single follow-up migration (~40 lines of SQL) and one new RPC. I'll bundle these in Phase 2D.
