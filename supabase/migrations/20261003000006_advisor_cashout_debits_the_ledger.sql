/*
  # Advisor cashout: debit the ledger, run as the advisor, read the right table

  The advisor marketplace is off (flag off, EXECUTE revoked by 20260817020000),
  so these are pure-code fixes with no live behaviour to break — the three
  blockers from p7-leftovers §(d) rows 2, 3 and 6 that need no owner decision:

  2. advisor_cashout_request(p_moonstones) (20260520000000:31) inserted only
     the advisor_cashouts row. No moonstone_transactions row was written, so
     the advisor's Moonstone balance never went down; there was no 'cashout'
     kind in the CHECK (20260620000000:49) or the sign trigger (:69). Now: a
     new kind 'cashout' (negative), the balance is read FOR UPDATE and must
     cover the request, and the debit is written in the same transaction
     with the cashout id as its reference. Because the ledger is now
     debited, a failed Stripe transfer must give the stones back:
     advisor_cashout_fail_srv(p_cashout_id, p_error) flips the row to
     'failed' and writes the compensating 'refund' row atomically (once —
     it only acts on a pending/processing row). The edge function calls it
     instead of a bare UPDATE.

  3. supabase/functions/advisor-cashout/index.ts called the RPC on the
     service-role client, where auth.uid() is NULL and the function raised
     'Not authenticated' for everyone. The function now calls it on
     ctx.userSupabase (the advisor's JWT), so auth.uid() is the advisor and
     the kill switch (EXECUTE revoked from authenticated) keeps applying
     until the launch checklist re-grants it. It also passes
     idempotencyKey = cashout id to stripe.transfers.create.

  6. v_advisor_cashout_eligibility (20260513000000:75) selected FROM
     auth.users with security_invoker = true, which is a 403 for
     `authenticated`; the dashboard coerced the error to 0 and the button was
     disabled forever. The view now drives from advisor_profiles.user_id.

  Not changed (owner decisions, §(d) rows 1, 4, 7): sessions still credit no
  advisor-earning kind; NULL advisor user_id in the participant checks; the
  flag is not wired into the RPCs.
*/

-- ── 1. The 'cashout' kind: negative ─────────────────────────────────────────
ALTER TABLE public.moonstone_transactions
  DROP CONSTRAINT IF EXISTS moonstone_transactions_kind_check;

ALTER TABLE public.moonstone_transactions
  ADD CONSTRAINT moonstone_transactions_kind_check CHECK (kind IN (
    'purchase', 'daily-checkin', 'referral', 'streak', 'quiz-complete',
    'gift', 'gift-receive', 'advisor-session', 'pay-per-report',
    'pay-per-action',
    'rewarded-ad',
    'cashout',
    'refund', 'admin-grant', 'admin-claw'
  ));

CREATE OR REPLACE FUNCTION public.moonstone_enforce_sign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.kind IN ('daily-checkin', 'quiz-complete', 'streak', 'gift-receive', 'admin-grant', 'purchase', 'referral', 'refund', 'rewarded-ad') THEN
    IF NEW.amount <= 0 THEN
      RAISE EXCEPTION 'Kind % requires positive amount, got %', NEW.kind, NEW.amount;
    END IF;
  END IF;
  IF NEW.kind IN ('gift', 'advisor-session', 'pay-per-report', 'pay-per-action', 'admin-claw', 'cashout') THEN
    IF NEW.amount >= 0 THEN
      RAISE EXCEPTION 'Kind % requires negative amount, got %', NEW.kind, NEW.amount;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 2. The eligibility view reads advisor_profiles ──────────────────────────
CREATE OR REPLACE VIEW public.v_advisor_cashout_eligibility
WITH (security_invoker = true)
AS
SELECT
  ap.user_id,
  COALESCE(earned.total, 0)::bigint AS moonstones_earned,
  COALESCE(redeemed.total, 0)::bigint AS moonstones_redeemed,
  (COALESCE(earned.total, 0) - COALESCE(redeemed.total, 0))::bigint AS moonstones_cashable
FROM public.advisor_profiles ap
LEFT JOIN LATERAL (
  SELECT SUM(t.amount) AS total
  FROM public.moonstone_transactions t
  WHERE t.user_id = ap.user_id AND t.kind = 'gift-receive'
) earned ON true
LEFT JOIN LATERAL (
  SELECT SUM(c.moonstones_redeemed) AS total
  FROM public.advisor_cashouts c
  WHERE c.user_id = ap.user_id AND c.state IN ('pending', 'processing', 'paid')
) redeemed ON true
WHERE ap.user_id IS NOT NULL;

GRANT SELECT ON public.v_advisor_cashout_eligibility TO authenticated;

-- ── 3. The request debits the ledger in the same transaction ───────────────
CREATE OR REPLACE FUNCTION public.advisor_cashout_request(p_moonstones integer)
RETURNS TABLE (cashout_id uuid, payout_cents integer, platform_fee_cents integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_is_advisor boolean;
  v_payout_acct RECORD;
  v_cashable bigint;
  v_balance integer;
  v_gross_cents integer;
  v_fee_cents integer;
  v_payout_cents integer;
  v_cashout_id uuid;
  v_rate_cents_per_moonstone integer := 10;
  v_platform_fee_pct numeric := 0.30;
  v_minimum_moonstones integer := 100;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_moonstones IS NULL OR p_moonstones < v_minimum_moonstones THEN
    RAISE EXCEPTION 'Minimum cashout is % Moonstones', v_minimum_moonstones;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.advisor_profiles ap WHERE ap.user_id = v_user AND ap.is_hidden = false)
    INTO v_is_advisor;
  IF NOT v_is_advisor THEN RAISE EXCEPTION 'Only advisors can cash out'; END IF;

  -- Serialize concurrent requests on the advisor's payout-accounts row.
  SELECT * INTO v_payout_acct
    FROM public.advisor_payout_accounts
    WHERE user_id = v_user
    FOR UPDATE;
  IF v_payout_acct IS NULL OR NOT v_payout_acct.payouts_enabled THEN
    RAISE EXCEPTION 'Complete Stripe Connect onboarding before cashing out';
  END IF;

  SELECT e.moonstones_cashable INTO v_cashable
    FROM public.v_advisor_cashout_eligibility e WHERE e.user_id = v_user;
  IF COALESCE(v_cashable, 0) < p_moonstones THEN
    RAISE EXCEPTION 'Insufficient cashable Moonstones: have %, requested %',
      COALESCE(v_cashable, 0), p_moonstones;
  END IF;

  -- The ledger must actually hold the stones being cashed out.
  SELECT mb.balance INTO v_balance
    FROM public.moonstone_balance mb WHERE mb.user_id = v_user FOR UPDATE;
  IF COALESCE(v_balance, 0) < p_moonstones THEN
    RAISE EXCEPTION 'Insufficient Moonstone balance: have %, requested %',
      COALESCE(v_balance, 0), p_moonstones;
  END IF;

  v_gross_cents  := ((p_moonstones::numeric * v_rate_cents_per_moonstone) / 10)::integer;
  v_fee_cents    := CEIL(v_gross_cents * v_platform_fee_pct)::integer;
  v_payout_cents := v_gross_cents - v_fee_cents;

  INSERT INTO public.advisor_cashouts (
    user_id, moonstones_redeemed, gross_cents, platform_fee_cents, payout_cents, state
  ) VALUES (
    v_user, p_moonstones, v_gross_cents, v_fee_cents, v_payout_cents, 'pending'
  ) RETURNING id INTO v_cashout_id;

  INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
  VALUES (v_user, -p_moonstones, 'cashout', v_cashout_id::text, 'Cashout request');

  RETURN QUERY SELECT v_cashout_id, v_payout_cents, v_fee_cents;
END;
$$;

-- Kill switch stays: re-grant with the launch checklist in 20260817010000.
REVOKE ALL ON FUNCTION public.advisor_cashout_request(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.advisor_cashout_request(integer) TO service_role;

-- ── 4. A failed transfer gives the stones back, once ────────────────────────
CREATE OR REPLACE FUNCTION public.advisor_cashout_fail_srv(p_cashout_id uuid, p_error text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  UPDATE public.advisor_cashouts c
     SET state = 'failed',
         error_message = left(COALESCE(p_error, 'Transfer failed'), 500),
         processed_at = now()
   WHERE c.id = p_cashout_id
     AND c.state IN ('pending', 'processing')
  RETURNING c.user_id, c.moonstones_redeemed INTO v_row;
  IF NOT FOUND THEN RETURN false; END IF;

  INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
  VALUES (v_row.user_id, v_row.moonstones_redeemed, 'refund',
          'cashout:' || p_cashout_id::text, 'Cashout failed — Moonstones returned');
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.advisor_cashout_fail_srv(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.advisor_cashout_fail_srv(uuid, text) TO service_role;
