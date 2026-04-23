-- ============================================================================
-- Phase 2B integration fixes
-- ============================================================================
-- Addresses Phase 1C-F8 (cashout race) and Phase 1D-F3 (streak kind
-- never produced). Phase 1D-F5 (referral retry) was a false alarm —
-- the existing referral_redeem RPC already inserts the redemption PK
-- guard first, with RAISE EXCEPTION rolling back on unique_violation,
-- so ledger credits never double-commit. No change needed there.
--
-- Changes:
--
-- 1. advisor_cashout_request() — two concurrent cashout requests from
--    the same advisor could both read eligibility=1000 and both insert
--    1000-Moonstone pending rows before either committed, paying 2×.
--    Wrap the eligibility check in a SELECT FOR UPDATE lock on the
--    advisor_payout_accounts row (unique per-advisor). This serializes
--    concurrent requests at the RPC level.
--
-- 2. moonstone_award_streak_milestone() — new RPC to award Moonstones
--    on streak milestones. The `streak` kind has always been in the
--    CHECK constraint but nothing produced it. Milestones: day 7, 30,
--    100 = 25, 100, 500 Moonstones respectively.
--
-- 3. Unique guard on streak awards so a milestone is only awarded once
--    per (user, streak_day) — prevents double-credit if the milestone
--    service fires twice in the same day.
-- ============================================================================

-- ─── 1. advisor_cashout_request lock ──────────────────────────────────────

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
  v_gross_cents integer;
  v_fee_cents integer;
  v_payout_cents integer;
  v_cashout_id uuid;
  v_rate_cents_per_moonstone integer := 10;
  v_platform_fee_pct numeric := 0.30;
  v_minimum_moonstones integer := 100;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_moonstones < v_minimum_moonstones THEN
    RAISE EXCEPTION 'Minimum cashout is % Moonstones', v_minimum_moonstones;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.advisor_profiles WHERE user_id = v_user AND is_hidden = false)
    INTO v_is_advisor;
  IF NOT v_is_advisor THEN RAISE EXCEPTION 'Only advisors can cash out'; END IF;

  -- Serialize concurrent requests: FOR UPDATE lock on the advisor's
  -- payout-accounts row. Two racing requests block each other, making
  -- the eligibility check + insert effectively atomic.
  SELECT * INTO v_payout_acct
    FROM public.advisor_payout_accounts
    WHERE user_id = v_user
    FOR UPDATE;
  IF v_payout_acct IS NULL OR NOT v_payout_acct.payouts_enabled THEN
    RAISE EXCEPTION 'Complete Stripe Connect onboarding before cashing out';
  END IF;

  SELECT moonstones_cashable INTO v_cashable
    FROM public.v_advisor_cashout_eligibility WHERE user_id = v_user;
  IF COALESCE(v_cashable, 0) < p_moonstones THEN
    RAISE EXCEPTION 'Insufficient cashable Moonstones: have %, requested %',
      COALESCE(v_cashable, 0), p_moonstones;
  END IF;

  v_gross_cents  := ((p_moonstones::numeric * v_rate_cents_per_moonstone) / 10)::integer;
  v_fee_cents    := CEIL(v_gross_cents * v_platform_fee_pct)::integer;
  v_payout_cents := v_gross_cents - v_fee_cents;

  INSERT INTO public.advisor_cashouts (
    user_id, moonstones_redeemed, gross_cents, platform_fee_cents, payout_cents, state
  ) VALUES (
    v_user, p_moonstones, v_gross_cents, v_fee_cents, v_payout_cents, 'pending'
  ) RETURNING id INTO v_cashout_id;

  RETURN QUERY SELECT v_cashout_id, v_payout_cents, v_fee_cents;
END;
$$;

GRANT EXECUTE ON FUNCTION public.advisor_cashout_request(integer) TO authenticated;

-- ─── 2. Streak milestones wire Moonstones to the ledger ──────────────────

-- Idempotency table: one row per (user, streak_day) so milestone reruns
-- are a no-op. Keeping separate from moonstone_transactions so the admin
-- can see "has this user earned the 30-day milestone" at a glance.
CREATE TABLE IF NOT EXISTS public.moonstone_streak_milestones (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_day   integer NOT NULL CHECK (streak_day > 0),
  amount       integer NOT NULL CHECK (amount > 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, streak_day)
);

ALTER TABLE public.moonstone_streak_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS moonstone_streak_milestones_select_own ON public.moonstone_streak_milestones;
CREATE POLICY moonstone_streak_milestones_select_own
  ON public.moonstone_streak_milestones FOR SELECT
  USING (auth.uid() = user_id);
GRANT SELECT ON public.moonstone_streak_milestones TO authenticated;
-- No INSERT policy — only the RPC (SECURITY DEFINER) writes.

CREATE OR REPLACE FUNCTION public.moonstone_award_streak_milestone(p_streak_day integer)
RETURNS TABLE (amount_awarded integer, is_duplicate boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_amount integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_streak_day IS NULL OR p_streak_day <= 0 OR p_streak_day > 10_000 THEN
    RAISE EXCEPTION 'Invalid streak day';
  END IF;

  -- Milestone ladder — tweak without redeploy by keeping the mapping here.
  v_amount := CASE
    WHEN p_streak_day = 7   THEN 25
    WHEN p_streak_day = 14  THEN 50
    WHEN p_streak_day = 30  THEN 100
    WHEN p_streak_day = 60  THEN 200
    WHEN p_streak_day = 100 THEN 500
    WHEN p_streak_day = 365 THEN 2000
    ELSE 0
  END;

  IF v_amount = 0 THEN
    -- Not a milestone day; silent no-op.
    RETURN QUERY SELECT 0::integer, false;
    RETURN;
  END IF;

  BEGIN
    INSERT INTO public.moonstone_streak_milestones (user_id, streak_day, amount)
      VALUES (v_user, p_streak_day, v_amount);
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT 0::integer, true;
    RETURN;
  END;

  INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
    VALUES (
      v_user, v_amount, 'streak',
      p_streak_day::text,
      'Day ' || p_streak_day || ' streak milestone'
    );

  RETURN QUERY SELECT v_amount, false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.moonstone_award_streak_milestone(integer) TO authenticated;
