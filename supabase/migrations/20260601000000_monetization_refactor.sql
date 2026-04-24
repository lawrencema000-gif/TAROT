-- ============================================================================
-- Monetization refactor: rewarded ads credit Moonstones - 2026-04-25
-- ============================================================================
-- Changes the business model:
--   BEFORE — rewarded ads granted temporary single-feature unlocks via
--            `rewarded_ad_unlocks` table. Users watched ads to unlock ONE
--            reading/spread at a time. Separate à-la-carte Stripe purchases
--            at $6.99 / $9.99 / $12.99 for career / natal / year-ahead.
--   AFTER  — rewarded ads credit a flat +50 Moonstones per completed ad.
--            Moonstones are the universal unlock currency. Premium
--            subscription is the primary upgrade path and unlocks ALL
--            features. Per-report Stripe one-offs are removed from the
--            client UI (the create-report-checkout edge fn stays for
--            backwards-compat on any in-flight links but is deprecated).
--
-- This migration:
--   1. Adds 'rewarded-ad' to the allowed kinds in the client-side credit
--      policy so the client can insert directly (under the auth.uid()
--      constraint).
--   2. Adds a UNIQUE index on (user_id, kind, reference) to make the ad
--      credit idempotent per ad-event-id — a double-submit by the client
--      can't double-credit.
--   3. Creates a small RPC `moonstone_credit_for_ad(p_ad_event_id text)`
--      that SECURITY DEFINER-inserts +50, tolerates the unique violation
--      silently, and returns the new balance. This is the server-
--      authoritative path.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

-- 1. Expand the client-credit policy to include 'rewarded-ad'.
DROP POLICY IF EXISTS moonstone_transactions_insert_own_credits ON public.moonstone_transactions;
CREATE POLICY moonstone_transactions_insert_own_credits
  ON public.moonstone_transactions FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND kind IN ('daily-checkin', 'quiz-complete', 'referral', 'rewarded-ad')
  );

-- 2. Idempotency index. The ad-event-id is generated client-side at the
--    moment AdMob fires "Rewarded", and inserted as `reference`. A replay
--    of the same ad event (network retry, client double-submit) will
--    conflict on this partial unique index and be treated as a no-op.
CREATE UNIQUE INDEX IF NOT EXISTS moonstone_transactions_reward_idem
  ON public.moonstone_transactions (user_id, kind, reference)
  WHERE kind = 'rewarded-ad' AND reference IS NOT NULL;

-- 3. Server RPC for the ad credit. Called from the ad-events edge function
--    once the reward fires. Uses SECURITY DEFINER so it can insert on
--    behalf of the user even though rewarded-ad credits are now also
--    client-writable; this is belt-and-suspenders for the server path.
CREATE OR REPLACE FUNCTION public.moonstone_credit_for_ad(
  p_ad_event_id text,
  p_amount      integer DEFAULT 50
)
RETURNS TABLE (
  amount_credited integer,
  new_balance     integer,
  already_credited boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_inserted uuid;
  v_balance integer;
  v_already boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_amount <= 0 OR p_amount > 200 THEN
    -- Hard cap: 200 stones per single ad event. Defends against a tampered
    -- client sending p_amount=1e6. Normal value = 50.
    RAISE EXCEPTION 'Invalid amount (must be 1..200)';
  END IF;
  IF p_ad_event_id IS NULL OR length(p_ad_event_id) < 8 THEN
    RAISE EXCEPTION 'Invalid ad event id';
  END IF;

  -- Idempotent insert — the unique index (user_id, kind, reference) below
  -- will conflict on replay. ON CONFLICT DO NOTHING swallows silently.
  INSERT INTO public.moonstone_transactions
    (user_id, amount, kind, reference, note)
    VALUES (v_user_id, p_amount, 'rewarded-ad', p_ad_event_id, 'Rewarded ad')
    ON CONFLICT (user_id, kind, reference)
      WHERE kind = 'rewarded-ad' AND reference IS NOT NULL
    DO NOTHING
    RETURNING id INTO v_inserted;

  IF v_inserted IS NULL THEN
    v_already := true;
  END IF;

  SELECT COALESCE(balance, 0)::integer INTO v_balance
    FROM public.moonstone_balances WHERE user_id = v_user_id;

  RETURN QUERY SELECT
    (CASE WHEN v_already THEN 0 ELSE p_amount END)::integer,
    v_balance,
    v_already;
END;
$$;

GRANT EXECUTE ON FUNCTION public.moonstone_credit_for_ad(text, integer) TO authenticated;

COMMENT ON FUNCTION public.moonstone_credit_for_ad(text, integer) IS
  'Credit Moonstones for a completed rewarded ad. Idempotent per ad_event_id via the partial unique index on (user_id, kind, reference). Returns the new balance and whether this event had already been credited.';
