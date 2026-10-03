/*
  # A replayed spend key never runs the model for free, and never refunds

  spend_moonstones_for_action_srv answered a duplicate idempotency key with
  allowed=true and no charge, and the edge handler could not tell that answer
  from a fresh debit: it ran `run` again (a new AI reading for free) and kept
  the key, so a replay that failed refunded the ORIGINAL debit of a reading
  already delivered. Proved in production (p7 review #31): three different
  ai-person-reading results and a refund for one -50 debit; three generate-
  reading replays after the daily limit each refunded a delivered reading.

  1. spend_moonstones_for_action_srv gains an OUT column `charged`: true only
     when THIS call debited (free user) or took a soft-cap slot (Premium).
     A duplicate key returns charged=false. The handler (functions/_shared/
     handler.ts, deployed with this change) then serves the stored response
     of the first run, or 409 while it is in flight — never a second run,
     never a refund — and refunds on failure only a debit its own call made.
     Until this migration lands, the handler falls back to reading the ledger
     before the call (sequential replays are already closed; the column
     closes the concurrent race).

  2. The 2026-06-30 "transition guard" is removed. It skipped the server
     debit for 2 minutes after any legacy client debit noted
     'Action: <key>' — and spend_moonstones_for_action is still client-
     callable (WatchAdSheet), so a 50-stone client debit for
     'tarot-ai-interpret' bought two minutes of free server readings of that
     action. Every client that ever client-debited AI actions predates the
     shipped Android build (v1.2.0, 2026-07-28, whose AI hook is a read-only
     gate check), so the guard protects nobody now.

  3. ai_cache_get / ai_cache_set were GRANTed to authenticated (and PUBLIC by
     default) since 20260626001100. No client calls them; every caller is an
     edge function on the service role. A signed-in user could overwrite any
     cached AI answer that other users are served (generate-reading's keys
     are a sha256 of a predictable prompt) — and the replay store now lives in
     the same table. Service role only.

  Every REVOKE names PUBLIC, anon and authenticated (20260817020000).
*/

-- ── 1 + 2. The spend RPC says whether it charged; no transition guard ───────
DROP FUNCTION IF EXISTS public.spend_moonstones_for_action_srv(uuid, text, integer, text);

CREATE FUNCTION public.spend_moonstones_for_action_srv(
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
  daily_used       integer,
  charged          boolean
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

  -- Idempotency: a repeated key was already charged by an earlier call.
  -- Report it as allowed but NOT charged; the caller must not run the
  -- action again for free, and must not refund on its behalf.
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
      RETURN QUERY SELECT true, COALESCE(v_balance, 0), v_premium, false, NULL::timestamptz, 0, false;
      RETURN;
    END IF;
  END IF;

  -- Premium path: log for the soft cap, no debit.
  IF v_premium THEN
    SELECT count(*), MIN(performed_at) INTO v_used, v_oldest
      FROM public.premium_action_log
      WHERE user_id = p_user_id AND performed_at > now() - interval '24 hours';
    IF v_used >= v_cap THEN
      RETURN QUERY SELECT false, NULL::integer, true, true, (v_oldest + interval '24 hours'), v_used, false;
      RETURN;
    END IF;
    INSERT INTO public.premium_action_log (user_id, action_key, idempotency_key)
      VALUES (p_user_id, p_action_key, p_idempotency_key);
    RETURN QUERY SELECT true, NULL::integer, true, false, NULL::timestamptz, (v_used + 1), true;
    RETURN;
  END IF;

  -- Free path: balance check + debit (race-free under the advisory lock).
  SELECT COALESCE(balance, 0) INTO v_balance
    FROM public.moonstone_balances WHERE user_id = p_user_id;
  v_balance := COALESCE(v_balance, 0);

  IF v_balance < p_cost THEN
    RETURN QUERY SELECT false, v_balance, false, false, NULL::timestamptz, 0, false;
    RETURN;
  END IF;

  INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
    VALUES (p_user_id, -p_cost, 'pay-per-action',
            COALESCE(p_idempotency_key, p_action_key),
            'AI action: ' || p_action_key);

  RETURN QUERY SELECT true, (v_balance - p_cost), false, false, NULL::timestamptz, 0, true;
END;
$$;

REVOKE ALL ON FUNCTION public.spend_moonstones_for_action_srv(uuid, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_moonstones_for_action_srv(uuid, text, integer, text) TO service_role;

COMMENT ON FUNCTION public.spend_moonstones_for_action_srv(uuid, text, integer, text) IS
  'Service-role Moonstone debit for an AI action (Premium: a soft-cap slot). '
  'Idempotent on p_idempotency_key: a repeated key returns allowed=true, '
  'charged=false — the caller serves the stored result of the first call and '
  'must not run the action again or refund it.';

-- ── 3. The AI cache is the server's ─────────────────────────────────────────
REVOKE ALL ON FUNCTION public.ai_cache_get(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_cache_get(text) TO service_role;
REVOKE ALL ON FUNCTION public.ai_cache_set(text, text, text, jsonb, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_cache_set(text, text, text, jsonb, integer) TO service_role;

-- The replay store's rows are short-lived; the daily prune (ai-cache-prune,
-- 02:00 UTC) already deletes every expired row of ai_response_cache.
