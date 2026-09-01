-- ============================================================================
-- Two ways a signed-in user could pay themselves
-- ============================================================================
-- Both found 2026-09-01 by auditing the payment surface, and both verified
-- against the live database rather than inferred from the schema.
--
-- 1. FREE PREMIUM. `subscriptions` carried "Users can insert own
--    subscriptions" / "Users can update own subscriptions" policies whose
--    only test is `user_id = auth.uid()`, and the table-level INSERT
--    privilege really is granted — probed with the anon key, which came back
--    "new row violates row-level security policy", NOT "permission denied
--    for table". That distinction is the whole finding: RLS was the only
--    thing standing in the way, and RLS is satisfiable by any authenticated
--    user for their own row.
--
--    `has_active_subscription()` then trusts that row outright:
--      EXISTS (SELECT 1 FROM subscriptions
--              WHERE user_id = ... AND status = 'active' AND expires_at > now())
--
--    So one POST to /rest/v1/subscriptions with status='active' and a distant
--    expires_at bought Premium for nothing.
--
--    Nothing legitimate loses anything here. The only client reference to
--    this table is a SELECT (src/services/billingGuard.ts:31); every writer
--    is an edge function on the service-role key, which bypasses RLS.
--
-- 2. 1-MOONSTONE REPORTS. `unlock_report_with_moonstones` allowlists the
--    report key but takes the PRICE from the caller and checks only
--    `p_cost > 0`. A 300-stone report unlocked for 1.
--
-- The REVOKEs below name PUBLIC, anon AND authenticated. A REVOKE that names
-- only `authenticated` is decorative — this project has shipped that mistake
-- before.
-- ============================================================================

-- ── 1. subscriptions is server-written only ─────────────────────────────
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;

REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM PUBLIC, anon, authenticated;

-- Reading your own subscription stays: billingGuard needs it.
GRANT SELECT ON public.subscriptions TO authenticated;

-- ── 2. the server owns the price ────────────────────────────────────────
-- Signature is unchanged so the existing client call keeps working, but
-- p_cost is now advisory only: the price comes from this function. If a
-- caller disagrees with the real price we fail loudly rather than silently
-- charging the caller's number, so a genuine price change surfaces as an
-- error in logs instead of as free reports.
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
  v_price   integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- The price is the server's to decide. Mirrors the client constants
  -- CAREER_REPORT_COST_MOONSTONES (150), NATAL_COST (200) and
  -- YEAR_AHEAD_COST (300); the allowlist of keys is unchanged.
  v_price := CASE p_report_key
    WHEN 'career-archetype' THEN 150
    WHEN 'natal-chart-pdf'  THEN 200
    WHEN 'year-ahead'       THEN 300
    ELSE NULL
  END;
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Unknown report key: %', p_report_key;
  END IF;

  -- p_cost is now advisory. Disagreeing with the server is an error rather
  -- than a silent charge at the caller's number, so a genuine price change
  -- shows up in the logs instead of as free reports.
  IF p_cost IS DISTINCT FROM v_price THEN
    RAISE EXCEPTION 'Price mismatch for %: client sent %, server price is %',
      p_report_key, p_cost, v_price;
  END IF;

  -- Idempotent: already unlocked -> report success with the current balance.
  SELECT id INTO v_existing FROM public.report_unlocks
    WHERE user_id = v_user_id AND report_key = p_report_key AND reference = p_reference;
  IF v_existing IS NOT NULL THEN
    SELECT COALESCE(balance, 0) INTO v_balance
      FROM public.moonstone_balances WHERE user_id = v_user_id;
    RETURN QUERY SELECT true, COALESCE(v_balance, 0);
    RETURN;
  END IF;

  SELECT COALESCE(balance, 0) INTO v_balance
    FROM public.moonstone_balances WHERE user_id = v_user_id;
  IF COALESCE(v_balance, 0) < v_price THEN
    RAISE EXCEPTION 'Insufficient Moonstones: have %, need %', COALESCE(v_balance, 0), v_price;
  END IF;

  INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
    VALUES (v_user_id, -v_price, 'pay-per-report', p_reference,
            'Unlocked report: ' || p_report_key);

  INSERT INTO public.report_unlocks (user_id, report_key, reference, cost_currency, cost_amount)
    VALUES (v_user_id, p_report_key, p_reference, 'moonstones', v_price);

  RETURN QUERY SELECT true, (COALESCE(v_balance, 0) - v_price);
END;
$$;

REVOKE ALL ON FUNCTION public.unlock_report_with_moonstones(text, text, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlock_report_with_moonstones(text, text, integer)
  TO authenticated;
