# Advisor marketplace — pre-launch audit

**Date:** 2026-08-17  
**Verdict: NOT-CLOSE** — do not enable the `advisors` flag.  
**Method:** five parallel finders (authz/RLS, money integrity, Stripe Connect, trust/verification, gate bypass), each finding then re-derived from the code by an independent skeptic instructed to refute it. 51 raw findings, 33 survived, 0 outright refuted.

## Summary

Do not flip the flag. The advisor marketplace has never worked end-to-end, and the gap is not polish — the revenue leg does not exist. A booked session debits the client's Moonstones and credits nobody: advisor_book_session writes exactly one ledger row (the client's debit) and no counterpart credit exists anywhere in the tree (no trigger on advisor_sessions, no edge function, no cron). Meanwhile the cashable balance is defined only over kind='gift-receive', which is produced solely by live-room tips and replay purchases — never by an advisor session. So an advisor can give paid readings all day and their cashable balance stays 0 forever. Separately, the cashout RPC is 100% dead: the edge function calls it on the service-role client, so auth.uid() is NULL and the first guard ('Not authenticated') fires on every attempt, surfacing as a generic 500. That dead path is currently masking a double-payment defect — advisor_cashout_request never inserts a debit into moonstone_transactions, so the moment you fix the auth bug, every cashout pays the advisor in cash AND leaves the same Moonstones spendable in-app. These two must be fixed in the same change or you will start losing real money the day the payout path starts working. On top of that, the kill switch is not a kill switch: the flag gates one nav menu item, every /advisors route is registered unconditionally, no server-side RPC or edge function consults any flag, and any user can self-enable the UI with ?ff_advisors=on. If something goes wrong after launch, flipping the flag back removes a menu entry and nothing else. The bounded good news: the classic bypass shapes are NOT present here. advisor_verification_decide is correctly admin-guarded, and the self-update RLS policy's omitted WITH CHECK defaults to its USING clause, so a user cannot self-approve to 'approved'. Storage policies on the ID-document bucket are correctly scoped. And no user can create an advisor_profiles row at all (no INSERT policy, GRANT SELECT only), which is what currently contains the blast radius of several other defects — but also means advisor onboarding is manual DBA work you have not built yet.

## Blockers — must fix before the flag is flipped

### 1. Advisor sessions never credit the advisor — the client is debited, the Moonstones vanish from the economy, and the advisor's cashable balance stays 0 forever. The payout ledger is simply not wired to the product.

**Where:** `supabase/migrations/20260509000000_advisor_booking.sql:239`

**Fix:** Insert the advisor-side credit for the advisor's share of v_cost, keyed on the session id, at session completion (advisor_session_end, the correct revenue-recognition point) rather than at booking. Add a dedicated ledger kind for advisor earnings to the CHECK constraint and to moonstone_enforce_sign's credit list, and change v_advisor_cashout_eligibility to sum all advisor-earning kinds instead of only 'gift-receive'. Verify with one real end-to-end session before launch.

### 2. Cashing out never debits the advisor's Moonstones — they keep the coins AND get the cash. Every cashout is paid for twice: once in USD, once in delivered AI product.

**Where:** `supabase/migrations/20260520000000_integration_fixes.sql:81`

**Fix:** Inside advisor_cashout_request, in the same transaction as the advisor_cashouts INSERT, write a matching negative moonstone_transactions row (add a 'cashout' kind to the kind CHECK in 20260620000000_moonstones_relaunch.sql:49 and to the debit list in moonstone_enforce_sign at :69), and assert moonstone_balance.balance >= p_moonstones before inserting. MUST ship together with the auth.uid() fix below — fixing that one alone activates this loss.

### 3. advisor-cashout calls the RPC on the service-role client, so auth.uid() is NULL and every single cashout hard-fails with a generic 500. No advisor can ever be paid.

**Where:** `supabase/functions/advisor-cashout/index.ts:51`

**Fix:** ctx.supabase is the service-role client (handler.ts:218-222); the user-scoped client is the separate ctx.userSupabase (handler.ts:197-205). Either call the RPC on ctx.userSupabase so auth.uid() resolves, or add a service-only advisor_cashout_request_srv(p_user_id uuid) with EXECUTE revoked from anon/authenticated and passed ctx.userId explicitly. Fails closed today, so no money has leaked — but it is what hides the double-payment defect.

### 4. A NULL advisor user_id defeats the participant check — any authenticated user who knows a session UUID can cancel or end someone else's paid session, force-refunding the client and wiping advisors' calendars.

**Where:** `supabase/migrations/20260509000000_advisor_booking.sql:349`

**Fix:** advisor_profiles.user_id is nullable and ON DELETE SET NULL (20260429000000:15), and the seed rows omit it entirely (:104) — the pattern your admin will copy when hand-creating advisors. When advisor_user_id IS NULL, `v_user NOT IN (client_id, NULL)` evaluates to NULL and plpgsql treats IF NULL as false, so the exception never fires. Replace every IN/NOT IN participant test (lines 275, 312, 349) with null-safe IS DISTINCT FROM comparisons, and add NOT NULL to advisor_profiles.user_id for any advisor that can take bookings.

### 5. moonstone_award_streak_milestone trusts a caller-supplied streak day — any new account mints 2,875 free Moonstones from the browser console, ~57 free AI readings per throwaway signup, billed to you as inference cost.

**Where:** `supabase/migrations/20260520000000_integration_fixes.sql:130`

**Fix:** The function is SECURITY DEFINER, GRANTed to authenticated (:165), validates only 0 < p_streak_day <= 10000 (:125), and never reads the user's real streak. Derive the streak server-side inside the function and require p_streak_day <= the stored value, or move it to a *_srv variant with EXECUTE revoked from anon/authenticated. This does not convert to USD today (cashing out needs an admin-created advisor_profiles row) but it becomes a cash-out path the moment an approved advisor uses a second account to tip themselves via live_room_tip.

### 6. The advisor dashboard always shows 0 cashable earnings — the eligibility view is unreadable by users and the error is silently coerced to 0, permanently disabling the Cash out button.

**Where:** `supabase/migrations/20260513000000_advisor_payouts.sql:81`

**Fix:** The view selects FROM auth.users with security_invoker = true (:96), and `authenticated` has no SELECT on auth.users, so the client read 403s; AdvisorDashboardPage.tsx:96 does `setCashable(Number(eligRes.data?.moonstones_cashable ?? 0))` without inspecting the error, and :309 disables the button on cashable < 100. Drive the view from advisor_profiles.user_id instead of auth.users (it is already the WHERE EXISTS filter), and surface the error in the UI instead of showing an advisor an authoritative, wrong 0.

### 7. The feature flag is not a kill switch — it hides one nav item while every route, RPC and edge function stays live, and any user can re-enable the UI with a URL parameter.

**Where:** `src/App.tsx:581`

**Fix:** Routes at :581,588,589,594,596 are registered unconditionally; the only flag consumer is BottomNav.tsx:54. No server-side entry point checks any flag — advisor_book_session, advisor_session_start/end/cancel and advisor_cashout_request are all GRANTed to authenticated with no gate, and handler.ts gates only on opts.ai (:310-326). featureFlagEval.ts:50-52 honours ?ff_<key>=on before anything else. Gate the routes on the flag, enforce the flag inside the money RPCs and the advisor edge functions, and strip the query-param override in production builds. Also note the seeded 'advisor-verify' flag is read nowhere in src/, so /advisors/verify is entirely ungated — any authenticated user can upload a government ID today, with the flag off.

## Before any real volume

- Stripe transfers are created with no idempotency key (advisor-cashout/index.ts:91-100). A network timeout and client retry can send the same payout twice — real money out the door, unrecoverable without chasing the advisor. Pass idempotencyKey: cashoutId before you have any meaningful cashout volume.
- There is no refund or dispute path once a session starts. advisor_session_cancel only works while state = 'scheduled' (20260509000000:352) — after that, a no-show advisor, a client who gets nothing, or a session that never happens has no in-product remedy and no partial refund. You will handle these by hand at first; that does not scale past a handful of sessions.
- advisor_session_start has no time guard despite its comment claiming 'either party can open it within 5 minutes of scheduled_at' (20260509000000:257). The function checks participation and state but never compares scheduled_at to now(), so a scheduled session can be flipped to 'active' arbitrarily early — which also makes it uncancellable and therefore unrefundable.
- Advisor onboarding is entirely manual. advisor_profiles has no INSERT policy and only GRANT SELECT (20260429000000:83-99); the only INSERT in the tree is the seed. Approving a verification just flips is_hidden on a pre-existing row (20260516000000:135-137), so if no row exists the approval silently does nothing. Someone must hand-write DB rows for every advisor — fine for three, untenable at thirty, and the likely source of the NULL user_id blocker above.
- A user can still UPDATE their own pending verification row's document paths and legal name while it sits in review (20260516000000:92-95). Self-approval is correctly blocked, but a reviewer can approve after the documents were swapped. Low risk at low volume; close it with a WITH CHECK that freezes the document fields once submitted.
- The three seeded placeholder advisors carry fabricated ratings and review counts (4.9/124, 4.8/87, 4.9/56 at 20260429000000:104-144). They are is_hidden = true today. Do not unhide them to make the directory look populated — that is invented social proof attached to paid personal services.

## Operational — not code

- Funding gap: payouts are Stripe transfers drawn from your platform balance (advisor-cashout/index.ts:91), but Moonstones are sold through both Stripe checkout (create-moonstone-checkout) and mobile IAP via RevenueCat (revenuecat-webhook). Revenue that arrives through Google Play or Apple lands with them, not in your Stripe balance. If most Moonstone sales are in-app, your Stripe balance can be empty while you owe advisors cash — transfers will fail on insufficient funds. Confirm the funding route before you promise anyone a payout.
- Play Store / App Store billing: paying human advisors real cash for in-app currency bought through IAP is exactly the territory the stores scrutinize. Advisor sessions are real-world services delivered by a person, which usually must NOT go through IAP — but here they are priced in Moonstones bought via IAP. Get a written read on this before launch; a policy strike puts the whole app at risk, not just the marketplace.
- Stripe Connect setup: the Express account flow requests only the transfers capability (advisor-stripe-onboard/index.ts:88). You need the Connect platform enabled, a completed platform profile, and confirmation that you accept the loss-liability model for Express accounts in every country your advisors live in. The code assumes USD hardcoded at transfer time regardless of advisor location.
- Nobody is assigned to review verifications. The pipeline expects an admin to inspect a government ID and a selfie video and call advisor_verification_decide. Decide who does this, where those documents may legally be stored and for how long, and what your retention/deletion policy is — you are collecting government ID from strangers into a Supabase bucket with no stated retention.
- Write an actual refund policy before taking a single payment: what happens on a no-show, a session that ends after two minutes, or a client who says the reading was worthless. The code has no answer and neither does the product. Also decide whether Moonstones are refundable for cash at all — right now the 30% platform fee and 10-Moonstones-per-dollar rate are hardcoded in the RPC (20260520000000:46-48), not configurable.
- Strangers giving paid personal readings needs a conduct and safety floor: an advisor code of conduct, a way for a client to report an advisor mid-session, a hard rule against medical/legal/financial advice, and someone who can suspend an advisor immediately. The only suspension lever that exists today is manually setting is_hidden — which does not touch already-booked sessions.

## Already actioned

- **The advisor money RPCs are now hard-off at the database.** `advisor_book_session`,
  `advisor_session_start/end/cancel` and `advisor_cashout_request` have EXECUTE revoked
  from `PUBLIC`, `anon` and `authenticated`. Re-enabling is five GRANT lines, listed in
  `supabase/migrations/20260817010000_advisor_kill_switch.sql` alongside a launch checklist.
  A reusable `assert_feature_enabled(key)` guard now exists to enforce a flag server-side;
  it is deliberately not yet wired into the advisor RPCs, because those functions are being
  rewritten anyway and re-issuing money code whose behaviour I am not changing is how a
  subtle defect gets introduced. Wire it in during that rewrite.

  **This took two attempts, and the first one was worse than useless.** Revoking only
  `FROM authenticated` left the `PUBLIC` grant in place, and PUBLIC was what actually
  carried the privilege. Probing production afterwards showed `advisor_cashout_request`
  and `advisor_session_cancel` *executing for an ANONYMOUS caller* — they reached their own
  internal guards ("Not authenticated", "Session not found") rather than being refused. So
  the advisor money surface was callable without an account at all, not merely with one.
  Combined with blocker 4 (the NULL participant check, which an anonymous caller's NULL
  `auth.uid()` sails straight through) an anonymous stranger holding a session UUID could
  have cancelled other people's sessions. Fixed in
  `20260817020000_advisor_kill_switch_public_grant.sql`; re-probed and all five now return
  `42501 permission denied`.

  The lesson generalises: on Supabase a REVOKE must name `PUBLIC, anon, authenticated` or
  it is decorative. This is the same trap in reverse as the one that caught the `_srv`
  moonstone functions earlier.


- **Advisor routes are now gated on the flag** (`src/App.tsx`). They were registered unconditionally, so `/advisors/verify` — which uploads a government ID — was reachable in production with the flag off. This closes the reachable-by-URL path only; the RPCs and edge functions still have no server-side gate.
- **The Moonstone minting hole is closed** (`supabase/migrations/20260817000000_fix_streak_milestone_minting.sql`, applied to production). `moonstone_award_streak_milestone` took the milestone day from the caller and never read the real streak, so any new account could mint 2,875 Moonstones in six calls — roughly 57 free AI actions per throwaway signup, each a real inference bill. It now verifies against the server-maintained `profiles.streak` and fails closed.
