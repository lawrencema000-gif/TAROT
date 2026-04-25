-- ============================================================================
-- Moonstones audit polish — 2026-04-25
-- ============================================================================
-- Two follow-ups from the deep audit:
--
-- 1. Day-1 dead end: a new user's first check-in awarded 5 ms, but every
--    AI reading costs 50 ms — meaning a fresh account couldn't use a single
--    reading until day 7 of streak (or until they watched ~10 ads on
--    native). Welcome bonus: 100 ms on the user's first-ever check-in.
--
-- 2. Defense-in-depth: premium_action_log relies on the absence of an
--    INSERT/UPDATE/DELETE policy under RLS to deny user writes. Adding
--    explicit deny-all policies makes the intent clear and protects
--    against accidental policy churn in future migrations.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Welcome bonus on first-ever daily check-in.
--
-- We detect "first ever" by absence of any prior moonstone_daily_checkins
-- row for the user. Returning users with a broken streak still get the
-- normal day-1 ladder (5 ms) because they have older check-in rows.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.moonstone_daily_checkin(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  amount_awarded INTEGER,
  streak_day INTEGER,
  is_streak_continuation BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id UUID;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - 1;
  v_yesterday_row RECORD;
  v_new_streak INTEGER;
  v_reward INTEGER;
  v_is_continuation BOOLEAN;
  v_is_first_ever BOOLEAN;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Idempotent: if already checked in today, return that row.
  IF EXISTS (SELECT 1 FROM public.moonstone_daily_checkins WHERE user_id = v_user_id AND date = v_today) THEN
    RETURN QUERY SELECT amount, streak_day, (streak_day > 1) FROM public.moonstone_daily_checkins WHERE user_id = v_user_id AND date = v_today;
    RETURN;
  END IF;

  -- Detect first-ever check-in for this user.
  v_is_first_ever := NOT EXISTS (SELECT 1 FROM public.moonstone_daily_checkins WHERE user_id = v_user_id);

  -- Streak continuation check
  SELECT * INTO v_yesterday_row FROM public.moonstone_daily_checkins
    WHERE user_id = v_user_id AND date = v_yesterday;
  IF v_yesterday_row IS NULL THEN
    v_new_streak := 1;
    v_is_continuation := false;
  ELSE
    v_new_streak := v_yesterday_row.streak_day + 1;
    v_is_continuation := true;
  END IF;

  -- Reward ladder. First-ever check-in: 100 ms welcome bonus (enough for
  -- 2 AI readings, removes the day-1 dead end). Otherwise: 5/7/10/15/20/30/50.
  IF v_is_first_ever THEN
    v_reward := 100;
  ELSE
    v_reward := CASE
      WHEN v_new_streak = 1 THEN 5
      WHEN v_new_streak = 2 THEN 7
      WHEN v_new_streak = 3 THEN 10
      WHEN v_new_streak = 4 THEN 15
      WHEN v_new_streak = 5 THEN 20
      WHEN v_new_streak = 6 THEN 30
      ELSE 50
    END;
  END IF;

  INSERT INTO public.moonstone_daily_checkins (user_id, date, streak_day, amount)
    VALUES (v_user_id, v_today, v_new_streak, v_reward);

  INSERT INTO public.moonstone_transactions (user_id, amount, kind, note)
    VALUES (v_user_id, v_reward, 'daily-checkin',
            CASE
              WHEN v_is_first_ever THEN 'Welcome bonus — first check-in'
              WHEN v_new_streak >= 7 THEN 'Week-streak reward'
              ELSE 'Daily check-in day ' || v_new_streak::TEXT
            END);

  RETURN QUERY SELECT v_reward, v_new_streak, v_is_continuation;
END;
$$;

GRANT EXECUTE ON FUNCTION public.moonstone_daily_checkin(UUID) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Defense-in-depth: explicit deny-all on premium_action_log writes.
--
-- The SECURITY DEFINER RPCs (spend_moonstones_for_action,
-- refund_action_spend) bypass RLS and remain authoritative. A regular
-- authenticated user can SELECT their own rows, but cannot INSERT,
-- UPDATE or DELETE — preventing soft-cap evasion via direct table access.
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS premium_action_log_no_insert ON public.premium_action_log;
CREATE POLICY premium_action_log_no_insert
  ON public.premium_action_log FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS premium_action_log_no_update ON public.premium_action_log;
CREATE POLICY premium_action_log_no_update
  ON public.premium_action_log FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS premium_action_log_no_delete ON public.premium_action_log;
CREATE POLICY premium_action_log_no_delete
  ON public.premium_action_log FOR DELETE
  USING (false);

DO $$ BEGIN
  RAISE NOTICE 'moonstone-audit-polish: 100ms welcome bonus + premium_action_log explicit deny-all writes.';
END $$;
