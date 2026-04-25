-- ============================================================================
-- Refund RPC for failed AI actions — 2026-04-25
-- ============================================================================
-- When an AI edge function fails AFTER we've debited the user's Moonstones
-- via spend_moonstones_for_action, the page calls this RPC to restore them.
-- Idempotent on (user_id, reference) — double refund attempts are no-ops.
--
-- Premium users have no debit row, so refund_action_spend returns
-- refunded=false silently (the page can ignore that case).
-- ============================================================================

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
  v_balance  integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) = 0 THEN
    RAISE EXCEPTION 'Missing idempotency_key';
  END IF;

  -- Locate the original spend (may not exist for premium users — no debit).
  SELECT id, amount INTO v_spend_id, v_amount
    FROM public.moonstone_transactions
    WHERE user_id = v_user_id
      AND reference = p_idempotency_key
      AND kind = 'pay-per-action'
    LIMIT 1;

  IF v_spend_id IS NULL THEN
    SELECT COALESCE(balance, 0) INTO v_balance
      FROM public.moonstone_balances WHERE user_id = v_user_id;
    RETURN QUERY SELECT false, COALESCE(v_balance, 0);
    RETURN;
  END IF;

  -- Already refunded? Idempotent return.
  SELECT id INTO v_dup_id
    FROM public.moonstone_transactions
    WHERE user_id = v_user_id
      AND reference = p_idempotency_key
      AND kind = 'refund'
    LIMIT 1;
  IF v_dup_id IS NOT NULL THEN
    SELECT COALESCE(balance, 0) INTO v_balance
      FROM public.moonstone_balances WHERE user_id = v_user_id;
    RETURN QUERY SELECT true, COALESCE(v_balance, 0);
    RETURN;
  END IF;

  INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
    VALUES (v_user_id, ABS(v_amount), 'refund', p_idempotency_key, 'AI action failed — refunded');

  SELECT COALESCE(balance, 0) INTO v_balance
    FROM public.moonstone_balances WHERE user_id = v_user_id;
  RETURN QUERY SELECT true, COALESCE(v_balance, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.refund_action_spend(text) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE 'moonstone-refund-rpc: refund_action_spend(idem) live.';
END $$;
