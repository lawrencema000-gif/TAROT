/*
  # action_gate_status: the OUT column `balance` shadowed the table column

  action_gate_status(p_action_key, p_cost) (20260620000000:232) declares
  RETURNS TABLE (allowed, balance, …) and then runs

      SELECT COALESCE(balance, 0) INTO v_balance
        FROM public.moonstone_balances WHERE user_id = v_user_id;

  Inside PL/pgSQL every OUT column is a variable, so the bare `balance` is
  ambiguous and the planner raises 42702 "column reference "balance" is
  ambiguous". The premium branch returns before that line, which is why only
  free users ever saw it: every Moonstone-gated AI entry (Companion, Soulmate
  score, quick reading, person reading, dream, mood letter …) got a 400 from
  the read-only gate check, and useMoonstoneSpend mapped any RPC error to
  "insufficient" and opened the Earn sheet while the ledger held 50–100
  Moonstones (R5 B-2, R7 B2 — reproduced on tarotlife.app on 2026-10-02).

  The fix is the same function with the table aliased (mb.balance). Nothing
  else changes. The grants are restated so a later redefinition cannot widen
  them; a REVOKE has to name PUBLIC and anon or it is decorative.
*/

CREATE OR REPLACE FUNCTION public.action_gate_status(p_action_key text, p_cost integer DEFAULT 50)
RETURNS TABLE (
  allowed          boolean,
  balance          integer,
  premium_bypass   boolean,
  soft_cap_reached boolean,
  reset_at         timestamptz,
  daily_used       integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_premium boolean;
  v_balance integer;
  v_used    integer;
  v_oldest  timestamptz;
  v_cap     integer := 50;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_cost IS NULL OR p_cost <= 0 OR p_cost > 1000 THEN
    RAISE EXCEPTION 'Invalid cost: %', p_cost;
  END IF;

  v_premium := public.is_user_premium(v_user_id);

  IF v_premium THEN
    SELECT count(*), MIN(pal.performed_at) INTO v_used, v_oldest
      FROM public.premium_action_log pal
     WHERE pal.user_id = v_user_id
       AND pal.performed_at > now() - interval '24 hours';
    IF v_used >= v_cap THEN
      RETURN QUERY SELECT false, NULL::integer, true, true,
                          (v_oldest + interval '24 hours'), v_used;
    ELSE
      RETURN QUERY SELECT true, NULL::integer, true, false, NULL::timestamptz, COALESCE(v_used, 0);
    END IF;
    RETURN;
  END IF;

  -- The table is aliased: `balance` alone would be the OUT column above.
  SELECT COALESCE(mb.balance, 0) INTO v_balance
    FROM public.moonstone_balances mb
   WHERE mb.user_id = v_user_id;
  v_balance := COALESCE(v_balance, 0);

  RETURN QUERY SELECT (v_balance >= p_cost), v_balance, false, false, NULL::timestamptz, 0;
END;
$$;

REVOKE ALL ON FUNCTION public.action_gate_status(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.action_gate_status(text, integer) TO authenticated, service_role;

COMMENT ON FUNCTION public.action_gate_status(text, integer) IS
  'Read-only Moonstone gate check for the caller: can this action be afforded '
  '(or is the premium soft cap hit). Performs no debit; the edge function '
  'debits server-side. The balance lookup aliases moonstone_balances so the '
  'OUT column `balance` does not shadow it (42702, fixed 20261003000000).';
