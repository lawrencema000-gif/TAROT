-- ============================================================================
-- Audit P0 fixes — 2026-04-24
-- ============================================================================
-- Three issues surfaced by the production audit. All are idempotent.
--
-- 1. pgcrypto missing → gen_random_bytes() fails at runtime in 4 RPCs
--    (achievements table default, referral_get_or_issue, compat_invite_create,
--    affiliate_apply). Without this extension those functions throw on first
--    call. The share_code column default on the achievements table likely
--    wasn't hit yet because the table has existing rows, but any new row
--    would fail.
--
-- 2. Three feature-flag keys referenced in client code have no DB row, so
--    `useFeatureFlag()` defaults to false forever:
--    • `ayurveda-dosha`  — used in QuizzesPage, the Dosha quiz is built +
--      ready, so turn on at 100%
--    • `extra-quizzes`   — used in QuizzesPage, the 22-dimensional quizzes
--      pack is built + ready, so turn on at 100%
--    • `advisors`        — used in BottomNav to show the Advisors tab in
--      More menu. Advisor marketplace infra isn't complete (LiveKit env
--      not set, zero active advisors). Seed the row but keep admin-only
--      so the tab isn't dark for the Arcana team, but regular users don't
--      see a tab that goes nowhere.
--
-- 3. Ambiguous column refs inside two SECURITY DEFINER RPCs throw when the
--    plpgsql planner can't tell whether a bare `streak_day` / `id` refers
--    to the table column or to the RETURNS-TABLE column of the same name.
--    Both RPCs are currently broken — qualifying the references with the
--    table name fixes it.
-- ============================================================================

-- Fix 1: enable pgcrypto (safe; already has IF NOT EXISTS semantics).
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Fix 2a/2b/2c: seed the 3 missing feature-flag rows.
INSERT INTO public.feature_flags (key, description, enabled, rollout_percent, allowed_user_ids)
  VALUES
    ('ayurveda-dosha', 'Ayurveda Dosha quiz (Vata/Pitta/Kapha 30-question assessment). Free tier, ready.', true, 100, ARRAY[]::uuid[]),
    ('extra-quizzes',  '22 dimensional quizzes (Jungian, DISC, Love Styles, Anxiety, etc.). Free tier, ready.', true, 100, ARRAY[]::uuid[]),
    ('advisors',       'Advisor marketplace tab in More menu. Needs LiveKit env + active advisors before rollout to 100.', false, 0, ARRAY[]::uuid[])
  ON CONFLICT (key) DO UPDATE
    SET description = EXCLUDED.description,
        updated_at = now();

-- Fix 3a: moonstone_daily_checkin — qualify `streak_day` / `amount` refs when
-- short-circuiting on the "already checked in today" branch.
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
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Idempotent: if already checked in today, return that row.
  -- Qualify columns to the TABLE (not the RETURNS alias) to avoid the
  -- ambiguous-reference planner error that blocked the original function.
  IF EXISTS (SELECT 1 FROM public.moonstone_daily_checkins WHERE user_id = v_user_id AND date = v_today) THEN
    RETURN QUERY
      SELECT mdc.amount,
             mdc.streak_day,
             (mdc.streak_day > 1)
      FROM public.moonstone_daily_checkins mdc
      WHERE mdc.user_id = v_user_id
        AND mdc.date    = v_today;
    RETURN;
  END IF;

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

  -- Reward ladder: Day 1: 5, 2: 7, 3: 10, 4: 15, 5: 20, 6: 30, 7+: 50
  v_reward := CASE
    WHEN v_new_streak = 1 THEN 5
    WHEN v_new_streak = 2 THEN 7
    WHEN v_new_streak = 3 THEN 10
    WHEN v_new_streak = 4 THEN 15
    WHEN v_new_streak = 5 THEN 20
    WHEN v_new_streak = 6 THEN 30
    ELSE 50
  END;

  INSERT INTO public.moonstone_daily_checkins (user_id, date, streak_day, amount)
    VALUES (v_user_id, v_today, v_new_streak, v_reward);

  INSERT INTO public.moonstone_transactions (user_id, amount, kind, note)
    VALUES (v_user_id, v_reward, 'daily-checkin',
            CASE WHEN v_new_streak >= 7 THEN 'Week-streak reward'
                 ELSE 'Daily check-in day ' || v_new_streak::TEXT END);

  RETURN QUERY SELECT v_reward, v_new_streak, v_is_continuation;
END;
$$;

-- Fix 3b: affiliate_apply — qualify `RETURNING id` to the table's id column
-- so it's not ambiguous with the RETURNS-TABLE alias of the same name.
CREATE OR REPLACE FUNCTION public.affiliate_apply(
  p_audience      text,
  p_size_estimate text,
  p_platforms     text[]
)
RETURNS TABLE (status text, id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_row_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.affiliate_applications (user_id, audience, size_estimate, platforms)
    VALUES (v_user, p_audience, p_size_estimate, COALESCE(p_platforms, '{}'))
    ON CONFLICT (user_id) DO UPDATE
      SET audience = excluded.audience,
          size_estimate = excluded.size_estimate,
          platforms = excluded.platforms,
          status = 'pending',
          decided_at = NULL,
          decided_by = NULL
    RETURNING public.affiliate_applications.id INTO v_row_id;
  RETURN QUERY SELECT 'pending'::text, v_row_id;
END;
$$;
