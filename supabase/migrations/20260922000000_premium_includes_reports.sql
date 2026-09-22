-- Premium includes every report.
--
-- The report pages gated on a report_unlocks row alone, the year-ahead
-- function returned 402 without one, and unlock_report_with_moonstones
-- charged subscribers like anyone else — so a Premium user who tapped the
-- report page's Premium button paid and stayed locked. The client and the
-- function now honour profiles.is_premium; this makes the RPC record a
-- zero-cost unlock for subscribers so every read path agrees.

-- A subscriber's unlock is recorded as its own currency.
ALTER TABLE public.report_unlocks DROP CONSTRAINT IF EXISTS report_unlocks_cost_currency_check;
ALTER TABLE public.report_unlocks
  ADD CONSTRAINT report_unlocks_cost_currency_check
  CHECK (cost_currency IN ('moonstones', 'usd', 'premium'));

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
  v_premium boolean;
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

  -- Premium includes every report: record the unlock at no charge so the
  -- read paths (and the idempotent branch above) see a row.
  SELECT COALESCE(is_premium, false) INTO v_premium
    FROM public.profiles WHERE id = v_user_id;
  IF v_premium THEN
    INSERT INTO public.report_unlocks (user_id, report_key, reference, cost_currency, cost_amount)
      VALUES (v_user_id, p_report_key, p_reference, 'premium', 0);
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
