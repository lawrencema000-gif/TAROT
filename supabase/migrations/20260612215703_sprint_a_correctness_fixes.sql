-- ============================================================================
-- Sprint A — correctness + economy integrity fixes
-- ============================================================================
-- Companion to the geocentric-astronomy edge-function fixes. Four parts:
--
--   1. Purge v1 natal charts + horoscope cache (they were computed with
--      heliocentric planet longitudes and an inverted Ascendant — every
--      stored chart is wrong; clients recompute on next visit).
--   2. Make the Moonstone spend RPC concurrency-safe (advisory lock —
--      the old read-then-write let parallel requests drive a balance
--      negative; moonstone_balances is a VIEW so FOR UPDATE can't work).
--   3. Harden the refund RPC: 15-minute refund window + audit logging.
--      (Full fix — server-side refunds only — is a follow-up; this bounds
--      the self-refund exploit and makes abuse visible.)
--   4. ai_usage_ledger: create the missing partitions (writes have been
--      failing since 2026-06-01) + a monthly pg_cron maintenance job so
--      this never recurs.
-- ============================================================================

-- ── Part 1: purge stale wrong-math charts + cached horoscope prose ────────
DELETE FROM public.astrology_natal_charts WHERE chart_version < 2;
DELETE FROM public.astrology_horoscope_cache;

-- ── Part 2: concurrency-safe spend RPC ────────────────────────────────────
-- Identical to the previous version EXCEPT: a per-user advisory
-- transaction lock serializes concurrent spends before the balance read,
-- closing the read-then-write race that allowed negative balances.
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

  -- Serialize all spends for this user within this transaction. Without
  -- this, two concurrent requests could both read balance=250, both pass
  -- the check below, and both debit — driving the balance negative.
  -- (moonstone_balances is a VIEW over the transactions ledger, so a
  -- row lock is not available; an advisory xact lock is the correct
  -- primitive.) Released automatically at COMMIT/ROLLBACK.
  PERFORM pg_advisory_xact_lock(hashtext('moonstone_spend'), hashtext(v_user_id::text));

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

  -- Free path: balance check + debit (now race-free under the lock).
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

-- ── Part 3: refund window + audit trail ───────────────────────────────────
-- The refund RPC is client-callable (the app refunds when an AI call
-- fails). Previously a user could spend, receive a SUCCESSFUL reading,
-- then call refund any time later — unlimited free readings. Legit
-- refunds fire within seconds of the spend (the AI call fails fast), so
-- a 15-minute window preserves every legitimate path while bounding the
-- exploit. Every refund is also written to audit_events so abuse
-- patterns (users who refund every spend) are visible in queries.
-- Follow-up (tracked): move debit+refund fully server-side into the AI
-- edge functions so the client can't call refund at all.
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
  v_spent_at timestamptz;
  v_dup_id   uuid;
  v_premium_log_id uuid;
  v_balance  integer;
  v_did      boolean := false;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) = 0 THEN
    RAISE EXCEPTION 'Missing idempotency_key';
  END IF;

  -- Serialize with spends for the same user (same lock key as the
  -- spend RPC) so refund/spend interleavings stay consistent.
  PERFORM pg_advisory_xact_lock(hashtext('moonstone_spend'), hashtext(v_user_id::text));

  -- 1. Free-user refund path: locate the original pay-per-action debit.
  SELECT id, amount, created_at INTO v_spend_id, v_amount, v_spent_at
    FROM public.moonstone_transactions
    WHERE user_id = v_user_id
      AND reference = p_idempotency_key
      AND kind = 'pay-per-action'
    LIMIT 1;

  IF v_spend_id IS NOT NULL THEN
    -- Refund window: legit failure-refunds arrive within seconds. A
    -- refund requested long after the spend is the self-refund exploit.
    IF v_spent_at < now() - interval '15 minutes' THEN
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
    IF v_dup_id IS NULL THEN
      INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
        VALUES (v_user_id, ABS(v_amount), 'refund', p_idempotency_key, 'AI action failed — refunded');
      -- Audit trail for abuse monitoring.
      INSERT INTO public.audit_events (user_id, event_name, payload)
        VALUES (v_user_id, 'moonstone_refund', jsonb_build_object(
          'idempotency_key', p_idempotency_key,
          'amount', ABS(v_amount),
          'spend_age_seconds', EXTRACT(EPOCH FROM (now() - v_spent_at))::integer
        ));
    END IF;
    v_did := true;
  END IF;

  -- 2. Premium-user refund path: delete the soft-cap log entry so the
  -- failed call doesn't count against the 50/24h limit. Same window.
  SELECT id INTO v_premium_log_id
    FROM public.premium_action_log
    WHERE user_id = v_user_id
      AND idempotency_key = p_idempotency_key
      AND performed_at > now() - interval '15 minutes'
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

-- ── Part 4: ai_usage_ledger partitions + monthly maintenance ──────────────
-- Writes have been failing since 2026-06-01: only the bootstrap month and
-- its successor were ever created and no maintenance job existed. Create
-- a maintenance function that ensures the current + next 3 months exist
-- (catching per-month errors so an overlapping legacy partition name
-- can't abort the rest), run it now, and schedule it monthly.
CREATE OR REPLACE FUNCTION public.ai_usage_ledger_ensure_partitions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  m      integer;
  m_start date;
  m_end   date;
  p_name  text;
BEGIN
  FOR m IN 0..3 LOOP
    m_start := date_trunc('month', now())::date + make_interval(months => m);
    m_end   := m_start + interval '1 month';
    p_name  := 'ai_usage_ledger_' || to_char(m_start, 'YYYY_MM');
    BEGIN
      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.ai_usage_ledger FOR VALUES FROM (%L) TO (%L)',
        p_name, m_start, m_end
      );
    EXCEPTION WHEN OTHERS THEN
      -- Most likely an existing partition under a different name already
      -- covers this range (bootstrap-era naming). That's fine — the goal
      -- is coverage, not naming. Continue with the next month.
      RAISE NOTICE 'ai_usage_ledger partition % skipped: %', p_name, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Run immediately — June (and any other missing months) get partitions now.
SELECT public.ai_usage_ledger_ensure_partitions();

-- Monthly maintenance: 1st of each month at 02:00 UTC, plus the run above.
-- Idempotent scheduling: unschedule an existing job of the same name first.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('ai-usage-ledger-partitions')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-usage-ledger-partitions');
    PERFORM cron.schedule(
      'ai-usage-ledger-partitions',
      '0 2 1 * *',
      'SELECT public.ai_usage_ledger_ensure_partitions()'
    );
  END IF;
END $$;
