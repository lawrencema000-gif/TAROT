-- ============================================================================
-- Moonstones audit fixes — 2026-04-25
-- ============================================================================
-- Two server-side bugs uncovered during the post-launch audit:
--
-- Bug #1: Failed AI calls leave a stale premium_action_log row, eating a
-- soft-cap slot for a reading the user never received. Fix: add an
-- idempotency_key column to premium_action_log so refund_action_spend can
-- delete the matching row when called.
--
-- Bug #2: Concurrent spend RPC calls (e.g. user mashing "Generate") could
-- both pass the idempotency check because each client call passes a fresh
-- key. There's nothing the server can do to dedupe across DIFFERENT keys —
-- the fix for that lives in the client hook (hook guard). This migration
-- only addresses the premium-refund hole.
-- ============================================================================

ALTER TABLE public.premium_action_log
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE INDEX IF NOT EXISTS premium_action_log_idem_idx
  ON public.premium_action_log (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Replace spend RPC: write idempotency_key into premium_action_log too.
CREATE OR REPLACE FUNCTION public.spend_moonstones_for_action(
  p_action_key      text,
  p_cost            integer DEFAULT 50,
  p_idempotency_key text DEFAULT NULL
)
RETURNS TABLE (
  allowed          boolean,
  new_balance      integer,
  premium_bypass   boolean,
  soft_cap_reached boolean,
  reset_at         timestamptz,
  daily_used       integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_premium   boolean;
  v_balance   integer;
  v_cap       integer := 50;
  v_used      integer;
  v_oldest    timestamptz;
  v_dup_count integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_action_key IS NULL OR length(p_action_key) = 0 THEN RAISE EXCEPTION 'Missing action_key'; END IF;
  IF p_cost <= 0 OR p_cost > 1000 THEN RAISE EXCEPTION 'Invalid cost: %', p_cost; END IF;

  v_premium := public.is_user_premium(v_user_id);

  -- Idempotency: if a transaction OR premium log entry already exists for
  -- this user + idempotency_key, return current state without re-charging.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT count(*) INTO v_dup_count
      FROM public.moonstone_transactions
      WHERE user_id = v_user_id AND reference = p_idempotency_key AND kind = 'pay-per-action';
    IF v_dup_count = 0 THEN
      SELECT count(*) INTO v_dup_count
        FROM public.premium_action_log
        WHERE user_id = v_user_id AND idempotency_key = p_idempotency_key;
    END IF;
    IF v_dup_count > 0 THEN
      SELECT COALESCE(balance, 0) INTO v_balance
        FROM public.moonstone_balances WHERE user_id = v_user_id;
      RETURN QUERY SELECT true, COALESCE(v_balance, 0), v_premium, false, NULL::timestamptz, 0;
      RETURN;
    END IF;
  END IF;

  -- Premium path: log the action (with idem key), check the soft cap.
  IF v_premium THEN
    SELECT count(*), MIN(performed_at) INTO v_used, v_oldest
      FROM public.premium_action_log
      WHERE user_id = v_user_id AND performed_at > now() - interval '24 hours';

    IF v_used >= v_cap THEN
      RETURN QUERY SELECT false, NULL::integer, true, true,
                          (v_oldest + interval '24 hours'),
                          v_used;
      RETURN;
    END IF;

    INSERT INTO public.premium_action_log (user_id, action_key, idempotency_key)
      VALUES (v_user_id, p_action_key, p_idempotency_key);
    RETURN QUERY SELECT true, NULL::integer, true, false, NULL::timestamptz, (v_used + 1);
    RETURN;
  END IF;

  -- Free path: balance check + debit.
  SELECT COALESCE(balance, 0) INTO v_balance
    FROM public.moonstone_balances WHERE user_id = v_user_id;
  v_balance := COALESCE(v_balance, 0);

  IF v_balance < p_cost THEN
    RETURN QUERY SELECT false, v_balance, false, false, NULL::timestamptz, 0;
    RETURN;
  END IF;

  INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
    VALUES (v_user_id, -p_cost, 'pay-per-action',
            COALESCE(p_idempotency_key, p_action_key),
            'Action: ' || p_action_key);

  RETURN QUERY SELECT true, (v_balance - p_cost), false, false, NULL::timestamptz, 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.spend_moonstones_for_action(text, integer, text) TO authenticated;

-- Replace refund RPC: also clean up premium_action_log entry for premium
-- users so the failed AI call doesn't keep eating their soft-cap slot.
CREATE OR REPLACE FUNCTION public.refund_action_spend(p_idempotency_key text)
RETURNS TABLE (refunded boolean, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_spend_id uuid;
  v_amount   integer;
  v_dup_id   uuid;
  v_premium_log_id uuid;
  v_balance  integer;
  v_did      boolean := false;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) = 0 THEN
    RAISE EXCEPTION 'Missing idempotency_key';
  END IF;

  -- 1. Free-user refund path: locate the original pay-per-action debit.
  SELECT id, amount INTO v_spend_id, v_amount
    FROM public.moonstone_transactions
    WHERE user_id = v_user_id
      AND reference = p_idempotency_key
      AND kind = 'pay-per-action'
    LIMIT 1;

  IF v_spend_id IS NOT NULL THEN
    -- Already refunded? Idempotent return.
    SELECT id INTO v_dup_id
      FROM public.moonstone_transactions
      WHERE user_id = v_user_id
        AND reference = p_idempotency_key
        AND kind = 'refund'
      LIMIT 1;
    IF v_dup_id IS NULL THEN
      INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
        VALUES (v_user_id, ABS(v_amount), 'refund', p_idempotency_key, 'AI action failed — refunded');
    END IF;
    v_did := true;
  END IF;

  -- 2. Premium-user refund path: delete the soft-cap log entry so the
  -- failed call doesn't count against the 50/24h limit.
  SELECT id INTO v_premium_log_id
    FROM public.premium_action_log
    WHERE user_id = v_user_id AND idempotency_key = p_idempotency_key
    LIMIT 1;
  IF v_premium_log_id IS NOT NULL THEN
    DELETE FROM public.premium_action_log WHERE id = v_premium_log_id;
    v_did := true;
  END IF;

  SELECT COALESCE(balance, 0) INTO v_balance
    FROM public.moonstone_balances WHERE user_id = v_user_id;
  RETURN QUERY SELECT v_did, COALESCE(v_balance, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.refund_action_spend(text) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE 'moonstone-audit-fixes: idem column on premium_action_log + refund cleans up soft-cap slot.';
END $$;
