/*
  # Old Android builds keep earning from ads; a session cannot mint XP; a
  # repeat check-in says it credited nothing

  ## 1. moonstone_credit_for_ad(text, integer) — a thin, bounded wrapper (p7 #32)
  20261003000005 revoked it from clients and moved the web/new-Android
  client to the ad-reward edge function. But the RELEASED Android app
  (v1.2.0, versionCode 18, 2026-07-28) bundles its web assets and credits
  every rewarded ad with `supabase.rpc('moonstone_credit_for_ad', {
  p_ad_event_id, p_amount: 50 })` — so since the revoke every ad on every
  installed copy ends in "the Moonstones couldn't be saved". Android is the
  only platform with rewarded ads.

  The function comes back for `authenticated`, as a wrapper with NO
  authority of its own: it ignores p_amount and calls
  moonstone_credit_for_ad_srv(auth.uid(), p_ad_event_id) — the exact path
  ad-reward takes: 50 per ad, at most 6 per UTC day, at least 20 s apart,
  idempotent per ad_event_id, under the same advisory lock. Exposure is
  unchanged (ad-reward is just as client-callable). It may be revoked again
  once the build that calls ad-reward has reached most users.

  ## 2. award_xp — XP for a session is bounded (p7 #113)
  20261003000003 stopped trusting the AMOUNT from a session but not the
  COUNT: a session could call award_xp('streak_milestone_365') as often as
  it liked, 5000 XP a call (proved: 10030 XP, level 10, four rank badges on
  a streak-0 account). Now, for a user session:
    - streak_milestone_N pays only for a rung the server recorded in
      moonstone_streak_milestones (moonstone_award_streak_milestone checks
      the rung against profiles.streak), and only once per rung;
    - every other activity has a per-UTC-day ceiling per user (one ritual a
      day; 20 readings; 20 saves; 10 journal entries; 10 quizzes; 3
      horoscopes; 10 posts; 30 comments) — generous for a person, a wall for
      a loop. Past it the call succeeds and pays 0 XP ('capped': true), so
      clients never see an error for an honest busy day.
  The service role and admins keep the old behaviour. The profile row is
  locked first, so concurrent calls cannot both pass a ceiling.
  xp_activities is the ledger those ceilings count, so clients may read it
  but no longer write it (no client ever did; award_xp and
  achievement_pay_xp write as SECURITY DEFINER).

  ## 3. moonstone_daily_checkin — a repeat says 0 (p7 #115)
  The already-checked-in branch returned the amount credited EARLIER today,
  and the client reads amount_awarded = 0 as "already checked in" — so a
  second tap (another tab, a second device) toasted "+100 Moonstones" and
  added 100 to the displayed balance while nothing was credited.

  Every REVOKE names PUBLIC, anon and authenticated (20260817020000).
*/

-- ── 1. The released Android build's ad credit, through the bounded path ────
CREATE OR REPLACE FUNCTION public.moonstone_credit_for_ad(
  p_ad_event_id text,
  p_amount      integer DEFAULT 50
)
RETURNS TABLE (
  amount_credited  integer,
  new_balance      integer,
  already_credited boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  -- p_amount is ignored on purpose: the amount, the daily cap, the gap and
  -- the idempotency are all moonstone_credit_for_ad_srv's.
  RETURN QUERY
    SELECT s.amount_credited, s.new_balance, s.already_credited
      FROM public.moonstone_credit_for_ad_srv(v_user, p_ad_event_id) s;
END;
$$;

REVOKE ALL ON FUNCTION public.moonstone_credit_for_ad(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.moonstone_credit_for_ad(text, integer) TO authenticated, service_role;

COMMENT ON FUNCTION public.moonstone_credit_for_ad(text, integer) IS
  'Compatibility path for the released Android build (v1.2.0): credits the '
  'caller for a rewarded ad through moonstone_credit_for_ad_srv — 50 '
  'Moonstones whatever p_amount says, at most 6 per UTC day, 20 s apart, '
  'idempotent per ad_event_id. New clients call the ad-reward edge function.';

-- ── 2. award_xp: bounded for a session ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id uuid,
  p_activity_type text,
  p_xp_amount int
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_profile      profiles%ROWTYPE;
  v_session      boolean := (auth.uid() IS NOT NULL AND NOT COALESCE(public.is_admin(), false));
  v_amount       int;
  v_cap          int;
  v_today        int;
  v_rung         int;
  v_utc_midnight timestamptz := (date_trunc('day', now() AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC';
  v_new_xp       int;
  v_old_level    int;
  v_new_level    int;
  v_seeker_rank  text;
  v_level_up     boolean := false;
BEGIN
  PERFORM public.assert_acting_for(p_user_id);

  -- A user session gets the server's XP table; the request's amount is only
  -- honoured for the service role and admins.
  IF v_session THEN
    v_amount := CASE p_activity_type
      WHEN 'ritual_complete'      THEN 50
      WHEN 'reading_saved'        THEN 10
      WHEN 'reading_complete'     THEN 5
      WHEN 'journal_entry'        THEN 15
      WHEN 'quiz_complete'        THEN 25
      WHEN 'horoscope_viewed'     THEN 5
      WHEN 'streak_milestone_7'   THEN 100
      WHEN 'streak_milestone_30'  THEN 500
      WHEN 'streak_milestone_100' THEN 2000
      WHEN 'streak_milestone_365' THEN 5000
      WHEN 'community_post'       THEN 15
      WHEN 'community_comment'    THEN 5
      ELSE NULL
    END;
    IF v_amount IS NULL THEN
      RAISE EXCEPTION 'Unknown activity type: %', p_activity_type
        USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    v_amount := p_xp_amount;
  END IF;
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'XP amount must be positive' USING ERRCODE = 'check_violation';
  END IF;

  -- Lock the profile first: the ceilings below are read-then-write.
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  v_old_level := COALESCE(v_profile.level, 1);

  IF v_session THEN
    IF p_activity_type LIKE 'streak_milestone_%' THEN
      -- Only a rung the server recorded (it checked profiles.streak), once.
      v_rung := substring(p_activity_type FROM 'streak_milestone_([0-9]+)')::int;
      IF NOT EXISTS (
           SELECT 1 FROM public.moonstone_streak_milestones m
            WHERE m.user_id = p_user_id AND m.streak_day = v_rung
         )
         OR EXISTS (
           SELECT 1 FROM public.xp_activities x
            WHERE x.user_id = p_user_id AND x.activity_type = p_activity_type
         ) THEN
        v_amount := 0;
      END IF;
    ELSE
      v_cap := CASE p_activity_type
        WHEN 'ritual_complete'   THEN 1
        WHEN 'reading_complete'  THEN 20
        WHEN 'reading_saved'     THEN 20
        WHEN 'journal_entry'     THEN 10
        WHEN 'quiz_complete'     THEN 10
        WHEN 'horoscope_viewed'  THEN 3
        WHEN 'community_post'    THEN 10
        WHEN 'community_comment' THEN 30
        ELSE 0
      END;
      SELECT count(*) INTO v_today
        FROM public.xp_activities x
       WHERE x.user_id = p_user_id
         AND x.activity_type = p_activity_type
         AND x.created_at >= v_utc_midnight;
      IF v_today >= v_cap THEN
        v_amount := 0;
      END IF;
    END IF;

    IF v_amount = 0 THEN
      RETURN jsonb_build_object(
        'xp_earned', 0,
        'total_xp', COALESCE(v_profile.xp, 0),
        'old_level', v_old_level,
        'new_level', v_old_level,
        'level_up', false,
        'seeker_rank', COALESCE(v_profile.seeker_rank, 'Novice Seeker'),
        'capped', true
      );
    END IF;
  END IF;

  v_new_xp := COALESCE(v_profile.xp, 0) + v_amount;

  SELECT COALESCE(MAX(level), v_old_level) INTO v_new_level
  FROM level_thresholds
  WHERE xp_required <= v_new_xp;

  v_level_up := v_new_level > v_old_level;

  SELECT COALESCE(rank_name, 'Novice Seeker') INTO v_seeker_rank
  FROM seeker_ranks
  WHERE v_new_level BETWEEN min_level AND max_level
  LIMIT 1;

  PERFORM set_config('app.server_write', 'on', true);
  UPDATE profiles
  SET xp = v_new_xp, level = v_new_level, seeker_rank = v_seeker_rank, updated_at = now()
  WHERE id = p_user_id;
  PERFORM set_config('app.server_write', 'off', true);

  INSERT INTO xp_activities (user_id, activity_type, xp_earned, created_at)
  VALUES (p_user_id, p_activity_type, v_amount, now());

  RETURN jsonb_build_object(
    'xp_earned', v_amount,
    'total_xp', v_new_xp,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'level_up', v_level_up,
    'seeker_rank', v_seeker_rank,
    'capped', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.award_xp(uuid, text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid, text, int) TO authenticated, service_role;

-- The XP ledger: read by the owner, written only by the SECURITY DEFINER RPCs.
DROP POLICY IF EXISTS "Users can insert own XP activities" ON public.xp_activities;
REVOKE INSERT, UPDATE, DELETE ON public.xp_activities FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.xp_activities TO authenticated;

CREATE INDEX IF NOT EXISTS xp_activities_user_type_time_idx
  ON public.xp_activities (user_id, activity_type, created_at DESC);

-- ── 3. moonstone_daily_checkin: a repeat credits — and reports — nothing ────
-- Body from 20261003000003 with one change: the already-checked-in branch
-- returns amount_awarded 0 (the client's "already checked in" signal).
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
  IF p_user_id IS NOT NULL THEN
    PERFORM public.assert_acting_for(p_user_id);
  END IF;
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Idempotent: already checked in today → nothing credited, say so (0),
  -- with today's streak state.
  IF EXISTS (SELECT 1 FROM public.moonstone_daily_checkins mdc WHERE mdc.user_id = v_user_id AND mdc.date = v_today) THEN
    RETURN QUERY
      SELECT 0, mdc.streak_day, (mdc.streak_day > 1)
        FROM public.moonstone_daily_checkins mdc
       WHERE mdc.user_id = v_user_id AND mdc.date = v_today;
    RETURN;
  END IF;

  -- Detect first-ever check-in for this user.
  v_is_first_ever := NOT EXISTS (SELECT 1 FROM public.moonstone_daily_checkins mdc WHERE mdc.user_id = v_user_id);

  -- Streak continuation check
  SELECT * INTO v_yesterday_row FROM public.moonstone_daily_checkins mdc
    WHERE mdc.user_id = v_user_id AND mdc.date = v_yesterday;
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

REVOKE ALL ON FUNCTION public.moonstone_daily_checkin(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.moonstone_daily_checkin(UUID) TO authenticated, service_role;
