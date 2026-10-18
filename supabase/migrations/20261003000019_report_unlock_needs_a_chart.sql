-- ============================================================================
-- No report unlock without a natal chart, for every client
-- ============================================================================
-- The natal report and the Year Ahead forecast are drawn from the member's
-- stored natal chart (astrology_natal_charts). Neither onboarding casts one
-- (only the Horoscope tab's setup does), and unlock_report_with_moonstones
-- never asked for it: a member with birth data and no chart paid 200 or 300
-- Moonstones and got "re-enter your birth data" — astrology-year-ahead
-- answers 404 NATAL_CHART_MISSING after the debit (p9 QS R-2, R-3, Q01).
-- The current client offers the unlock only beside a chart; Android v1.2.0
-- and any other caller do not, so the refusal belongs here, before the
-- debit.
--
-- The chart-based keys (natal-chart-pdf, year-ahead) are refused without a
-- chart: no transaction and no unlock row. The check reads what the readers
-- read (a row with natal_json), and comes after the idempotent branch, so a
-- member who already holds the unlock keeps it. The message carries
-- "natal chart required", which src/dal/reportUnlocks.ts maps to
-- 'chart-missing' (the page casts the chart and offers the unlock again).
--
-- Everything else is 20260922000000's body unchanged.
-- ============================================================================

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

  -- No chart, no sale: a chart-based report is refused before anything is
  -- recorded or debited (Premium included: its row would promise a report
  -- the server cannot draw).
  IF p_report_key IN ('natal-chart-pdf', 'year-ahead') AND NOT EXISTS (
    SELECT 1 FROM public.astrology_natal_charts
     WHERE user_id = v_user_id AND natal_json IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'natal chart required for %', p_report_key USING ERRCODE = 'P0001';
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

-- A REVOKE must name every grantee (Supabase grants functions to anon and
-- authenticated by default): only a signed-in member calls this.
REVOKE ALL ON FUNCTION public.unlock_report_with_moonstones(text, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_report_with_moonstones(text, text, integer)
  TO authenticated;
