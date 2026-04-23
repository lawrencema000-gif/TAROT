-- ============================================================================
-- Pay-per-report unlocks
-- ============================================================================
-- Per INCREMENTAL-ROADMAP.md Sprint 12: à-la-carte premium reports. First
-- report: Career Archetype ($6.99 / 150 Moonstones). Table + RPC let us add
-- Year-Ahead Forecast and Full Natal Chart PDF later without schema changes.
--
-- Design:
--   - Single unlock table keyed by (user_id, report_key, reference).
--   - `reference` is report-specific — for the career archetype it's the MBTI
--     type ('INTJ', 'ENFP', etc), so a user's archetype is unlocked even if
--     they retake the MBTI and get the same result.
--   - Purchases happen via Moonstone spend (RPC) or via Stripe webhook
--     (separate handler inserts directly). Both go through the same table.
--
-- Why an RPC not direct INSERT: we need to atomically debit Moonstones AND
-- insert the unlock row. A failed debit cannot leave an unlock dangling.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.report_unlocks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_key    text NOT NULL CHECK (report_key IN (
    'career-archetype', 'year-ahead', 'natal-chart-pdf'
  )),
  reference     text NOT NULL,
  cost_currency text NOT NULL CHECK (cost_currency IN ('moonstones', 'usd')),
  cost_amount   integer NOT NULL CHECK (cost_amount >= 0),
  purchased_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, report_key, reference)
);

CREATE INDEX IF NOT EXISTS report_unlocks_user_idx
  ON public.report_unlocks (user_id, purchased_at DESC);

ALTER TABLE public.report_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS report_unlocks_select_own ON public.report_unlocks;
CREATE POLICY report_unlocks_select_own
  ON public.report_unlocks FOR SELECT
  USING (auth.uid() = user_id);

GRANT SELECT ON public.report_unlocks TO authenticated;

-- ─── RPC: atomic Moonstone-spend unlock ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.unlock_report_with_moonstones(
  p_report_key text,
  p_reference  text,
  p_cost       integer
)
RETURNS TABLE (
  unlocked     boolean,
  new_balance  integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance integer;
  v_existing uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_report_key NOT IN ('career-archetype', 'year-ahead', 'natal-chart-pdf') THEN
    RAISE EXCEPTION 'Unknown report key: %', p_report_key;
  END IF;
  IF p_cost <= 0 THEN RAISE EXCEPTION 'Invalid cost: %', p_cost; END IF;

  -- Idempotent: if already unlocked, return the current balance.
  SELECT id INTO v_existing FROM public.report_unlocks
    WHERE user_id = v_user_id AND report_key = p_report_key AND reference = p_reference;
  IF v_existing IS NOT NULL THEN
    SELECT COALESCE(balance, 0) INTO v_balance FROM public.moonstone_balances WHERE user_id = v_user_id;
    RETURN QUERY SELECT true, COALESCE(v_balance, 0);
    RETURN;
  END IF;

  -- Check balance
  SELECT COALESCE(balance, 0) INTO v_balance FROM public.moonstone_balances WHERE user_id = v_user_id;
  IF COALESCE(v_balance, 0) < p_cost THEN
    RAISE EXCEPTION 'Insufficient Moonstones: have %, need %', COALESCE(v_balance, 0), p_cost;
  END IF;

  -- Debit + unlock atomically
  INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
    VALUES (v_user_id, -p_cost, 'pay-per-report', p_reference,
            'Unlocked report: ' || p_report_key);

  INSERT INTO public.report_unlocks (user_id, report_key, reference, cost_currency, cost_amount)
    VALUES (v_user_id, p_report_key, p_reference, 'moonstones', p_cost);

  RETURN QUERY SELECT true, (COALESCE(v_balance, 0) - p_cost);
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlock_report_with_moonstones(text, text, integer) TO authenticated;
