-- ============================================================================
-- Sprint D — server-authoritative Moonstone spend (closes the refund exploit)
-- ============================================================================
-- Until now the debit + refund were CLIENT-driven: the app spent Moonstones,
-- invoked the AI, and refunded on failure. Because the client controlled the
-- refund, a user could spend -> receive a SUCCESSFUL reading -> call the
-- refund RPC (within the 15-min window, or directly with the correlation id
-- read off the response header) and keep both the reading and their stones.
--
-- This migration moves the authority server-side. The edge-function handler
-- now debits BEFORE running the AI and refunds itself only if the AI throws,
-- using these two SERVICE-ROLE-only RPCs. The client-callable spend/refund
-- RPCs are revoked so no browser can self-refund a delivered reading.
--
--   * spend_moonstones_for_action_srv(user, action, cost, idem) — service role
--   * refund_action_spend_srv(user, idem)                        — service role
--   * REVOKE only the client-callable REFUND from `authenticated`
--
-- We revoke refund but NOT spend: the exploit is the refund. The client spend
-- RPC stays granted because WatchAdSheet legitimately spends Moonstones to
-- unlock a premium reading (no refund involved, not abusable). action_gate_status
-- also stays client-callable — it's a READ-ONLY balance/soft-cap check the UI
-- uses to show the "earn more" sheet before invoking; it cannot debit.
--
-- Transition: the new web client's AI hook no longer client-debits (it does a
-- read-only gate check; the edge function debits). But a user on a STALE page
-- still runs the old hook, which client-debits AND now hits an edge function
-- that also server-debits — a double charge. spend_moonstones_for_action_srv
-- carries a transition guard that skips the server debit when a legacy
-- client-side debit for the SAME action already landed in the last 2 minutes.
-- New clients never create those legacy debits, so the guard only ever fires
-- for stale clients during the rollout and is inert thereafter.
--
-- Deploy order:
--   1. apply this migration   (refund revoked; _srv created with the guard)
--   2. deploy the AI edge functions  (they debit via _srv)
--   3. deploy the web client  (AI hook -> read-only gate check)
-- ============================================================================

-- ── Service-role spend ────────────────────────────────────────────────────
-- Mirror of spend_moonstones_for_action but takes an explicit user id (the
-- handler runs as service_role, so auth.uid() is null) and tags free-user
-- debits with an 'AI action:' note to distinguish them from legacy client
-- debits ('Action:'). Premium users are logged for the 50/24h soft cap but
-- not debited; insufficient balance / soft cap returns allowed=false.
CREATE OR REPLACE FUNCTION public.spend_moonstones_for_action_srv(
  p_user_id         uuid,
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
  v_premium   boolean;
  v_balance   integer;
  v_cap       integer := 50;
  v_used      integer;
  v_oldest    timestamptz;
  v_dup_count integer;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Missing user_id'; END IF;
  IF p_action_key IS NULL OR length(p_action_key) = 0 THEN RAISE EXCEPTION 'Missing action_key'; END IF;
  IF p_cost <= 0 OR p_cost > 1000 THEN RAISE EXCEPTION 'Invalid cost: %', p_cost; END IF;

  -- Serialize this user's spends (same advisory key the client RPC uses).
  PERFORM pg_advisory_xact_lock(hashtext('moonstone_spend'), hashtext(p_user_id::text));

  v_premium := public.is_user_premium(p_user_id);

  -- Transition guard (rollout-only; inert once stale clients age out).
  -- A stale client still runs the old hook, which CLIENT-debits via
  -- spend_moonstones_for_action (note 'Action: <key>'). If such a debit for
  -- THIS action just landed, the old app already charged the user — don't
  -- charge again. New clients never client-debit AI actions, and server
  -- debits use a distinct note ('AI action: <key>'), so this only ever
  -- matches a stale client's own legacy debit.
  IF EXISTS (
    SELECT 1 FROM public.moonstone_transactions
    WHERE user_id = p_user_id
      AND kind = 'pay-per-action'
      AND note = 'Action: ' || p_action_key
      AND created_at > now() - interval '2 minutes'
  ) THEN
    SELECT COALESCE(balance, 0) INTO v_balance
      FROM public.moonstone_balances WHERE user_id = p_user_id;
    RETURN QUERY SELECT true, COALESCE(v_balance, 0), v_premium, false, NULL::timestamptz, 0;
    RETURN;
  END IF;

  -- Idempotency: a retried request (same correlation id) must not re-charge.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT count(*) INTO v_dup_count
      FROM public.moonstone_transactions
      WHERE user_id = p_user_id AND reference = p_idempotency_key AND kind = 'pay-per-action';
    IF v_dup_count = 0 THEN
      SELECT count(*) INTO v_dup_count
        FROM public.premium_action_log
        WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
    END IF;
    IF v_dup_count > 0 THEN
      SELECT COALESCE(balance, 0) INTO v_balance
        FROM public.moonstone_balances WHERE user_id = p_user_id;
      RETURN QUERY SELECT true, COALESCE(v_balance, 0), v_premium, false, NULL::timestamptz, 0;
      RETURN;
    END IF;
  END IF;

  -- Premium path: log for the soft cap, no debit.
  IF v_premium THEN
    SELECT count(*), MIN(performed_at) INTO v_used, v_oldest
      FROM public.premium_action_log
      WHERE user_id = p_user_id AND performed_at > now() - interval '24 hours';
    IF v_used >= v_cap THEN
      RETURN QUERY SELECT false, NULL::integer, true, true, (v_oldest + interval '24 hours'), v_used;
      RETURN;
    END IF;
    INSERT INTO public.premium_action_log (user_id, action_key, idempotency_key)
      VALUES (p_user_id, p_action_key, p_idempotency_key);
    RETURN QUERY SELECT true, NULL::integer, true, false, NULL::timestamptz, (v_used + 1);
    RETURN;
  END IF;

  -- Free path: balance check + debit (race-free under the advisory lock).
  SELECT COALESCE(balance, 0) INTO v_balance
    FROM public.moonstone_balances WHERE user_id = p_user_id;
  v_balance := COALESCE(v_balance, 0);

  IF v_balance < p_cost THEN
    RETURN QUERY SELECT false, v_balance, false, false, NULL::timestamptz, 0;
    RETURN;
  END IF;

  INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
    VALUES (p_user_id, -p_cost, 'pay-per-action',
            COALESCE(p_idempotency_key, p_action_key),
            'AI action: ' || p_action_key);

  RETURN QUERY SELECT true, (v_balance - p_cost), false, false, NULL::timestamptz, 0;
END;
$$;

-- Lock to service_role ONLY. These take an arbitrary p_user_id, so a client
-- grant would let any user mutate any other user's balance. Supabase default
-- privileges grant EXECUTE directly to anon+authenticated at creation time, so
-- REVOKE FROM PUBLIC alone is NOT enough — revoke the direct grants too.
REVOKE EXECUTE ON FUNCTION public.spend_moonstones_for_action_srv(uuid, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_moonstones_for_action_srv(uuid, text, integer, text) TO service_role;

-- ── Service-role refund ────────────────────────────────────────────────────
-- The handler calls this ONLY when its own AI run throws, so there is no
-- 15-minute window or abuse surface — the server is the only caller and it
-- refunds the exact spend it just made. Idempotent (won't double-refund).
CREATE OR REPLACE FUNCTION public.refund_action_spend_srv(
  p_user_id         uuid,
  p_idempotency_key text
)
RETURNS TABLE (refunded boolean, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_spend_id       uuid;
  v_amount         integer;
  v_dup_id         uuid;
  v_premium_log_id uuid;
  v_balance        integer;
  v_did            boolean := false;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Missing user_id'; END IF;
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) = 0 THEN
    RAISE EXCEPTION 'Missing idempotency_key';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('moonstone_spend'), hashtext(p_user_id::text));

  -- Free-user debit -> credit it back.
  SELECT id, amount INTO v_spend_id, v_amount
    FROM public.moonstone_transactions
    WHERE user_id = p_user_id
      AND reference = p_idempotency_key
      AND kind = 'pay-per-action'
    LIMIT 1;

  IF v_spend_id IS NOT NULL THEN
    SELECT id INTO v_dup_id
      FROM public.moonstone_transactions
      WHERE user_id = p_user_id
        AND reference = p_idempotency_key
        AND kind = 'refund'
      LIMIT 1;
    IF v_dup_id IS NULL THEN
      INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
        VALUES (p_user_id, ABS(v_amount), 'refund', p_idempotency_key, 'AI action failed - server refund');
    END IF;
    v_did := true;
  END IF;

  -- Premium soft-cap log -> remove so the failed call doesn't count.
  SELECT id INTO v_premium_log_id
    FROM public.premium_action_log
    WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key
    LIMIT 1;
  IF v_premium_log_id IS NOT NULL THEN
    DELETE FROM public.premium_action_log WHERE id = v_premium_log_id;
    v_did := true;
  END IF;

  SELECT COALESCE(balance, 0) INTO v_balance
    FROM public.moonstone_balances WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_did, COALESCE(v_balance, 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refund_action_spend_srv(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_action_spend_srv(uuid, text) TO service_role;

-- ── Revoke the client-callable REFUND ─────────────────────────────────────
-- The refund is the exploit vector — revoke it so no browser can refund a
-- delivered reading (not even by reading the correlation id off the response
-- header). The AI edge functions refund server-side via refund_action_spend_srv.
--
-- spend_moonstones_for_action stays granted: WatchAdSheet legitimately spends
-- to unlock premium readings (no refund, not abusable). action_gate_status
-- stays granted (read-only check).
-- Revoke the direct anon+authenticated grants AND PUBLIC (Supabase default
-- privileges grant directly to anon/authenticated, so FROM authenticated alone
-- leaves the call reachable). service_role keeps it for the handler.
REVOKE EXECUTE ON FUNCTION public.refund_action_spend(text) FROM PUBLIC, anon, authenticated;
