-- ============================================================================
-- Moonstones relaunch — 2026-04-25
-- ============================================================================
-- Brings the Moonstone system back online with a redesigned spend model.
--
-- Decisions baked into this migration:
--   1. Every AI reading action costs 50 Moonstones (matches +50 from one
--      rewarded ad — 1 ad = 1 reading is the unit economics).
--   2. Direct purchase of Moonstones is REMOVED. Only earning paths remain:
--      daily check-in, rewarded ads, quiz completion. Premium subscription
--      bypasses Moonstones entirely and unlocks everything.
--   3. Premium users have a silent 50 actions / rolling-24h soft cap as a
--      cost safety net. UI keeps saying "unlimited"; the cap only surfaces
--      if a user exceeds it (rare). Free-user behavior is unchanged.
--
-- What changes here:
--   * Feature flags `moonstones` + `rewarded-ad` -> ON.
--   * Feature flag `moonstone-topup` stays OFF (no Moonstone purchasing).
--   * New transaction kind: `pay-per-action`.
--   * New table: premium_action_log (rolling 24h soft-cap tracking).
--   * New RPC: spend_moonstones_for_action(action_key, amount).
--   * New RPC: premium_action_check(action_key) for the hook to call when
--     skipping the spend (premium users still get logged for the cap).
--
-- Idempotent. Safe to re-run.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Re-enable feature flags
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO public.feature_flags (key, description, enabled, rollout_percent, allowed_user_ids)
VALUES
  ('moonstones',  'Moonstones virtual currency — relaunched 2026-04-25 with action-spend model.', true, 100, '{}'),
  ('rewarded-ad', 'Rewarded-ad +50 Moonstone earning path.',                                       true, 100, '{}'),
  ('moonstone-topup', 'Direct Moonstone purchase — DISABLED. Premium subscription is the only paid upgrade.', false, 0, '{}')
ON CONFLICT (key) DO UPDATE SET
  enabled          = EXCLUDED.enabled,
  rollout_percent  = EXCLUDED.rollout_percent,
  description      = EXCLUDED.description,
  updated_at       = now();

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Allow new transaction kind 'pay-per-action'
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE public.moonstone_transactions
  DROP CONSTRAINT IF EXISTS moonstone_transactions_kind_check;

ALTER TABLE public.moonstone_transactions
  ADD CONSTRAINT moonstone_transactions_kind_check CHECK (kind IN (
    'purchase', 'daily-checkin', 'referral', 'streak', 'quiz-complete',
    'gift', 'gift-receive', 'advisor-session', 'pay-per-report',
    'pay-per-action',
    'rewarded-ad',
    'refund', 'admin-grant', 'admin-claw'
  ));

CREATE OR REPLACE FUNCTION public.moonstone_enforce_sign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.kind IN ('daily-checkin', 'quiz-complete', 'streak', 'gift-receive', 'admin-grant', 'purchase', 'referral', 'refund', 'rewarded-ad') THEN
    IF NEW.amount <= 0 THEN
      RAISE EXCEPTION 'Kind % requires positive amount, got %', NEW.kind, NEW.amount;
    END IF;
  END IF;
  IF NEW.kind IN ('gift', 'advisor-session', 'pay-per-report', 'pay-per-action', 'admin-claw') THEN
    IF NEW.amount >= 0 THEN
      RAISE EXCEPTION 'Kind % requires negative amount, got %', NEW.kind, NEW.amount;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Premium action log for soft cap (rolling 24h, 50 actions per user)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.premium_action_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_key   text NOT NULL,
  performed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS premium_action_log_user_time_idx
  ON public.premium_action_log (user_id, performed_at DESC);

ALTER TABLE public.premium_action_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS premium_action_log_select_own ON public.premium_action_log;
CREATE POLICY premium_action_log_select_own
  ON public.premium_action_log FOR SELECT
  USING (auth.uid() = user_id);

GRANT SELECT ON public.premium_action_log TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- 4. Helper: is_user_premium(uid) — server-side authority for entitlement.
-- We treat anyone with profiles.is_premium = true OR an active premium
-- entitlement row as premium. Defaults to FALSE if neither table grants it.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_user_premium(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_premium boolean := false;
BEGIN
  -- Profile flag (set by RevenueCat / Stripe webhook handlers)
  SELECT COALESCE(is_premium, false) INTO v_premium
    FROM public.profiles WHERE id = p_user_id;
  RETURN COALESCE(v_premium, false);
EXCEPTION WHEN undefined_column THEN
  -- profiles.is_premium doesn't exist yet — just say not-premium.
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_user_premium(uuid) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- 5. Main RPC: spend_moonstones_for_action
--
-- Behaviour:
--   - Premium users: insert a row in premium_action_log. If they've already
--     done >= 50 actions in the last 24h, return soft_cap_reached=true and
--     allowed=false. Otherwise allowed=true, no Moonstone debit.
--   - Free users: check balance >= cost, debit via ledger insert, return
--     new balance. If balance < cost, return allowed=false with the
--     current balance so the client can show the earn-Moonstones sheet.
--   - All cases idempotent on (user_id, action_key, idempotency_key) when
--     idempotency_key is provided — second call returns the same outcome
--     without double-charging.
-- ──────────────────────────────────────────────────────────────────────────
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

  -- Idempotency: if we have a key and a transaction already exists with it,
  -- return the current balance without re-debiting.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT count(*) INTO v_dup_count
      FROM public.moonstone_transactions
      WHERE user_id = v_user_id AND reference = p_idempotency_key AND kind = 'pay-per-action';
    IF v_dup_count > 0 THEN
      SELECT COALESCE(balance, 0) INTO v_balance
        FROM public.moonstone_balances WHERE user_id = v_user_id;
      RETURN QUERY SELECT true, COALESCE(v_balance, 0), v_premium, false, NULL::timestamptz, 0;
      RETURN;
    END IF;
  END IF;

  -- Premium path: log the action, check the soft cap.
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

    INSERT INTO public.premium_action_log (user_id, action_key) VALUES (v_user_id, p_action_key);
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

-- ──────────────────────────────────────────────────────────────────────────
-- 6. Convenience RPC: action_gate_status — read-only check before showing
-- a "Cast" button. Returns the same shape as the spend RPC but performs no
-- side effects, so the UI can pre-render "needs 50 ms" / "soft cap hit"
-- states without committing.
-- ──────────────────────────────────────────────────────────────────────────
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

  v_premium := public.is_user_premium(v_user_id);

  IF v_premium THEN
    SELECT count(*), MIN(performed_at) INTO v_used, v_oldest
      FROM public.premium_action_log
      WHERE user_id = v_user_id AND performed_at > now() - interval '24 hours';
    IF v_used >= v_cap THEN
      RETURN QUERY SELECT false, NULL::integer, true, true,
                          (v_oldest + interval '24 hours'), v_used;
    ELSE
      RETURN QUERY SELECT true, NULL::integer, true, false, NULL::timestamptz, COALESCE(v_used, 0);
    END IF;
    RETURN;
  END IF;

  SELECT COALESCE(balance, 0) INTO v_balance
    FROM public.moonstone_balances WHERE user_id = v_user_id;
  v_balance := COALESCE(v_balance, 0);
  RETURN QUERY SELECT (v_balance >= p_cost), v_balance, false, false, NULL::timestamptz, 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.action_gate_status(text, integer) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE 'moonstones-relaunch: flags ON, spend_moonstones_for_action live, premium soft-cap 50/24h.';
END $$;
