/*
  # p_user_id RPCs act only for the caller

  award_xp(p_user_id, p_activity_type, p_xp_amount) — re-created verbatim by
  20260928000001 — never looked at auth.uid() and kept PostgreSQL's default
  EXECUTE TO PUBLIC (no GRANT or REVOKE anywhere in supabase/migrations).
  Probed live with the anon key on 2026-10-02: 200 {"error":"User not found"}
  — the function ran for an anonymous caller, and with a real id it grants XP,
  levels and seeker_rank to any user, in any amount (p7-leftovers §(d) row 5).

  The same shape repeats across the gamification surface. Audit of every
  function in supabase/migrations that takes a p_user_id:

    award_xp(uuid,text,int)                 PUBLIC, no owner check     → fixed here
    moonstone_daily_checkin(uuid DEFAULT NULL)  authenticated; COALESCE(p_user_id,
                                            auth.uid()) lets a session check in
                                            for any other user          → fixed here
    mark_achievement_notified(uuid,uuid)    PUBLIC, no owner check     → fixed here
    get_user_achievement_stats(uuid)        PUBLIC, reads any user     → fixed here
    unlock_achievement(uuid,uuid)           PUBLIC; unlocks any badge for
                                            the caller; no client caller → service_role only
    initialize_user_achievements(uuid),
    check_achievement_progress(uuid,…),
    check_level_milestones(uuid,…)          PUBLIC, no owner check     → 20261003000004
                                            (re-created there with new semantics)
    ai_check_and_record_usage(uuid,int)     authenticated; called only by the
                                            edge handler as service_role; a
                                            session could burn another user's
                                            daily AI ceiling               → service_role only
    record_ad_impression(…p_user_id…),
    get_ad_config(text,uuid),
    get_user_daily_ad_stats(uuid)           PUBLIC; called only by ad-config /
                                            ad-events as service_role      → service_role only
    delete_user_account(uuid)               already checks auth.uid()     → unchanged
    admin_moonstone_grant/claw(uuid,…)      already check is_admin()      → unchanged
    spend_moonstones_for_action_srv,
    refund_action_spend_srv, ai_search_memories  already revoked from PUBLIC → unchanged
    is_user_premium(uuid)                   read-only boolean, authenticated → unchanged (noted)
    calculate_user_level(uuid)              read-only integer              → unchanged (noted)

  Also: user_achievements had INSERT/UPDATE granted to authenticated with
  own-row policies, so a client could set unlocked_at on any badge directly
  (services/achievements.ts did exactly that for the card badges). Writes now
  go through the RPCs only; SELECT stays.

  One helper carries the rule: assert_acting_for(p_user_id) passes for the
  service role and migrations (auth.uid() IS NULL) and for admins, and
  otherwise requires p_user_id = auth.uid(). award_xp additionally stops
  trusting the amount in the request for a user session: the XP per activity
  is the server's table (mirrors XP_REWARDS in services/levelSystem.ts), so a
  tampered client cannot award itself 999999 XP for one reading.

  Every REVOKE names PUBLIC, anon and authenticated — a REVOKE that leaves
  PUBLIC in place is decorative (20260817020000).
*/

-- ── 0. The rule ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.assert_acting_for(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id required' USING ERRCODE = 'null_value_not_allowed';
  END IF;
  -- Service role, migrations, triggers fired without a user: pass.
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF COALESCE(public.is_admin(), false) THEN RETURN; END IF;
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only act for your own account'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_acting_for(uuid) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.assert_acting_for(uuid) IS
  'Raises insufficient_privilege unless the caller is the service role, an '
  'admin, or the user named by p_user_id. Called first thing by every RPC '
  'that takes a p_user_id.';

-- ── 1. award_xp ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id uuid,
  p_activity_type text,
  p_xp_amount int
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_amount int;
  v_new_xp int;
  v_old_level int;
  v_new_level int;
  v_seeker_rank text;
  v_level_up boolean := false;
BEGIN
  PERFORM public.assert_acting_for(p_user_id);

  -- A user session gets the server's XP table; the request's amount is only
  -- honoured for the service role and admins.
  IF auth.uid() IS NOT NULL AND NOT COALESCE(public.is_admin(), false) THEN
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

  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;

  v_old_level := COALESCE(v_profile.level, 1);
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
    'seeker_rank', v_seeker_rank
  );
END;
$$;

REVOKE ALL ON FUNCTION public.award_xp(uuid, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid, text, int) TO authenticated, service_role;

-- ── 2. moonstone_daily_checkin ──────────────────────────────────────────────
-- Body from 20260620000300 with two changes: a given p_user_id must be the
-- caller, and the "already checked in" early return qualifies its columns
-- (streak_day is also an OUT column — the same 42702 as action_gate_status,
-- which 20260529000000 had fixed and 20260620000300 reintroduced).
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

  -- Idempotent: if already checked in today, return that row.
  IF EXISTS (SELECT 1 FROM public.moonstone_daily_checkins mdc WHERE mdc.user_id = v_user_id AND mdc.date = v_today) THEN
    RETURN QUERY
      SELECT mdc.amount, mdc.streak_day, (mdc.streak_day > 1)
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

REVOKE ALL ON FUNCTION public.moonstone_daily_checkin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moonstone_daily_checkin(UUID) TO authenticated, service_role;

-- ── 3. mark_achievement_notified ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_achievement_notified(
  p_user_id uuid,
  p_achievement_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  PERFORM public.assert_acting_for(p_user_id);
  UPDATE user_achievements
  SET notified = true, updated_at = now()
  WHERE user_id = p_user_id AND achievement_id = p_achievement_id;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_achievement_notified(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_achievement_notified(uuid, uuid) TO authenticated, service_role;

-- ── 4. get_user_achievement_stats ───────────────────────────────────────────
-- The 20260127 version returned integer columns; 20260306000001 dropped and
-- re-created it with bigint. DROP first so this runs on either history.
DROP FUNCTION IF EXISTS public.get_user_achievement_stats(uuid);
CREATE OR REPLACE FUNCTION public.get_user_achievement_stats(
  p_user_id uuid
) RETURNS TABLE (
  total_achievements bigint,
  unlocked_achievements bigint,
  completion_percentage numeric,
  total_xp_from_achievements bigint,
  category_stats jsonb,
  rarity_stats jsonb
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_total bigint;
  v_unlocked bigint;
  v_total_xp bigint;
  v_cat_stats jsonb;
  v_rar_stats jsonb;
BEGIN
  PERFORM public.assert_acting_for(p_user_id);

  SELECT
    COUNT(a.id),
    COUNT(ua.unlocked_at),
    COALESCE(SUM(CASE WHEN ua.unlocked_at IS NOT NULL THEN a.xp_reward ELSE 0 END), 0)
  INTO v_total, v_unlocked, v_total_xp
  FROM achievements a
  LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = p_user_id
  WHERE a.is_active = true;

  SELECT COALESCE(jsonb_object_agg(cat, obj), '{}'::jsonb)
  INTO v_cat_stats
  FROM (
    SELECT
      a.category::text AS cat,
      jsonb_build_object('total', COUNT(a.id), 'unlocked', COUNT(ua.unlocked_at)) AS obj
    FROM achievements a
    LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = p_user_id
    WHERE a.is_active = true
    GROUP BY a.category
  ) sub;

  SELECT COALESCE(jsonb_object_agg(rar, obj), '{}'::jsonb)
  INTO v_rar_stats
  FROM (
    SELECT
      a.rarity::text AS rar,
      jsonb_build_object('total', COUNT(a.id), 'unlocked', COUNT(ua.unlocked_at)) AS obj
    FROM achievements a
    LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = p_user_id
    WHERE a.is_active = true
    GROUP BY a.rarity
  ) sub;

  RETURN QUERY SELECT
    v_total,
    v_unlocked,
    CASE WHEN v_total > 0 THEN ROUND((v_unlocked::numeric / v_total::numeric) * 100, 1) ELSE 0::numeric END,
    v_total_xp,
    v_cat_stats,
    v_rar_stats;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_achievement_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_achievement_stats(uuid) TO authenticated, service_role;

-- ── 5. Service-role-only: never a client call ───────────────────────────────
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN (
         'unlock_achievement',
         'ai_check_and_record_usage',
         'record_ad_impression',
         'get_ad_config',
         'get_user_daily_ad_stats'
       )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- ── 6. user_achievements: clients read, the RPCs write ─────────────────────
REVOKE INSERT, UPDATE, DELETE ON public.user_achievements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_achievements TO authenticated;
