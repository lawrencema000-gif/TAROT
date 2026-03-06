-- ============================================================
-- Missing RPC functions for the achievements & XP system
-- ============================================================

-- Drop existing functions with incompatible return types
DROP FUNCTION IF EXISTS check_achievement_progress(uuid, text, int);
DROP FUNCTION IF EXISTS check_achievement_progress(uuid, text);
DROP FUNCTION IF EXISTS check_level_milestones(uuid, int, int, text);
DROP FUNCTION IF EXISTS unlock_achievement(uuid, uuid);
DROP FUNCTION IF EXISTS get_user_achievement_stats(uuid);
DROP FUNCTION IF EXISTS award_xp(uuid, text, int);
DROP FUNCTION IF EXISTS mark_achievement_notified(uuid, uuid);
DROP FUNCTION IF EXISTS initialize_user_achievements(uuid);

-- 1. mark_achievement_notified
CREATE OR REPLACE FUNCTION mark_achievement_notified(
  p_user_id uuid,
  p_achievement_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE user_achievements
  SET notified = true, updated_at = now()
  WHERE user_id = p_user_id AND achievement_id = p_achievement_id;
  RETURN FOUND;
END;
$$;

-- 2. initialize_user_achievements
-- Inserts a row in user_achievements for every active achievement the user doesn't have yet
CREATE OR REPLACE FUNCTION initialize_user_achievements(
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_achievements (user_id, achievement_id, progress, target, notified, metadata, created_at, updated_at)
  SELECT
    p_user_id,
    a.id,
    0,
    COALESCE((a.unlock_condition->>'target')::int, 1),
    false,
    '{}'::jsonb,
    now(),
    now()
  FROM achievements a
  WHERE a.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM user_achievements ua
      WHERE ua.user_id = p_user_id AND ua.achievement_id = a.id
    );
END;
$$;

-- 3. check_achievement_progress
-- Increments progress for all achievements matching the given activity_type
-- Returns rows for achievements that were just unlocked
CREATE OR REPLACE FUNCTION check_achievement_progress(
  p_user_id uuid,
  p_activity_type text,
  p_increment int DEFAULT 1
) RETURNS TABLE (
  achievement_id uuid,
  achievement_name text,
  xp_reward int,
  rarity text,
  newly_unlocked boolean
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Ensure user has rows for all achievements
  PERFORM initialize_user_achievements(p_user_id);

  -- Increment progress for matching achievements
  UPDATE user_achievements ua
  SET
    progress = LEAST(ua.progress + p_increment, ua.target),
    updated_at = now()
  FROM achievements a
  WHERE ua.achievement_id = a.id
    AND ua.user_id = p_user_id
    AND a.unlock_condition->>'activity_type' = p_activity_type
    AND a.is_active = true
    AND ua.unlocked_at IS NULL;

  -- Unlock achievements where progress >= target
  UPDATE user_achievements ua
  SET unlocked_at = now(), updated_at = now()
  FROM achievements a
  WHERE ua.achievement_id = a.id
    AND ua.user_id = p_user_id
    AND ua.progress >= ua.target
    AND ua.unlocked_at IS NULL
    AND a.is_active = true;

  -- Return newly unlocked achievements
  RETURN QUERY
  SELECT
    a.id AS achievement_id,
    a.name AS achievement_name,
    a.xp_reward,
    a.rarity::text,
    true AS newly_unlocked
  FROM user_achievements ua
  JOIN achievements a ON a.id = ua.achievement_id
  WHERE ua.user_id = p_user_id
    AND ua.unlocked_at IS NOT NULL
    AND ua.notified = false
    AND a.unlock_condition->>'activity_type' = p_activity_type;
END;
$$;

-- 4. unlock_achievement
CREATE OR REPLACE FUNCTION unlock_achievement(
  p_user_id uuid,
  p_achievement_id uuid
) RETURNS TABLE (
  success boolean,
  xp_awarded int,
  achievement_name text,
  rarity text
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_achievement achievements%ROWTYPE;
BEGIN
  SELECT * INTO v_achievement FROM achievements WHERE id = p_achievement_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, ''::text, ''::text;
    RETURN;
  END IF;

  -- Upsert user_achievement as unlocked
  INSERT INTO user_achievements (user_id, achievement_id, progress, target, unlocked_at, notified, metadata, created_at, updated_at)
  VALUES (
    p_user_id,
    p_achievement_id,
    COALESCE((v_achievement.unlock_condition->>'target')::int, 1),
    COALESCE((v_achievement.unlock_condition->>'target')::int, 1),
    now(),
    false,
    '{}'::jsonb,
    now(),
    now()
  )
  ON CONFLICT (user_id, achievement_id)
  DO UPDATE SET unlocked_at = COALESCE(user_achievements.unlocked_at, now()), progress = user_achievements.target, updated_at = now();

  RETURN QUERY SELECT true, v_achievement.xp_reward, v_achievement.name, v_achievement.rarity::text;
END;
$$;

-- 5. get_user_achievement_stats
CREATE OR REPLACE FUNCTION get_user_achievement_stats(
  p_user_id uuid
) RETURNS TABLE (
  total_achievements bigint,
  unlocked_achievements bigint,
  completion_percentage numeric,
  total_xp_from_achievements bigint,
  category_stats jsonb,
  rarity_stats jsonb
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total bigint;
  v_unlocked bigint;
  v_total_xp bigint;
  v_cat_stats jsonb;
  v_rar_stats jsonb;
BEGIN
  -- Overall stats
  SELECT
    COUNT(a.id),
    COUNT(ua.unlocked_at),
    COALESCE(SUM(CASE WHEN ua.unlocked_at IS NOT NULL THEN a.xp_reward ELSE 0 END), 0)
  INTO v_total, v_unlocked, v_total_xp
  FROM achievements a
  LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = p_user_id
  WHERE a.is_active = true;

  -- Category stats
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

  -- Rarity stats
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

-- 6. check_level_milestones
CREATE OR REPLACE FUNCTION check_level_milestones(
  p_user_id uuid,
  p_new_level int,
  p_total_xp int,
  p_seeker_rank text
) RETURNS TABLE (
  achievement_id uuid,
  achievement_name text,
  xp_reward int,
  rarity text,
  newly_unlocked boolean
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Check level-based achievements
  RETURN QUERY
  SELECT * FROM check_achievement_progress(p_user_id, 'level_reached', p_new_level);

  -- Check XP-based achievements
  RETURN QUERY
  SELECT * FROM check_achievement_progress(p_user_id, 'xp_earned', p_total_xp);

  -- Check rank-based achievements
  RETURN QUERY
  SELECT * FROM check_achievement_progress(p_user_id, 'rank_achieved', 1);
END;
$$;

-- 7. award_xp
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id uuid,
  p_activity_type text,
  p_xp_amount int
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_new_xp int;
  v_old_level int;
  v_new_level int;
  v_seeker_rank text;
  v_level_up boolean := false;
BEGIN
  -- Get current profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;

  v_old_level := COALESCE(v_profile.level, 1);
  v_new_xp := COALESCE(v_profile.xp, 0) + p_xp_amount;

  -- Determine new level from thresholds
  SELECT COALESCE(MAX(level), v_old_level) INTO v_new_level
  FROM level_thresholds
  WHERE xp_required <= v_new_xp;

  v_level_up := v_new_level > v_old_level;

  -- Determine seeker rank
  SELECT COALESCE(rank_name, 'Novice Seeker') INTO v_seeker_rank
  FROM seeker_ranks
  WHERE v_new_level BETWEEN min_level AND max_level
  LIMIT 1;

  -- Update profile
  UPDATE profiles
  SET xp = v_new_xp, level = v_new_level, seeker_rank = v_seeker_rank, updated_at = now()
  WHERE id = p_user_id;

  -- Log the XP activity
  INSERT INTO xp_activities (user_id, activity_type, xp_earned, created_at)
  VALUES (p_user_id, p_activity_type, p_xp_amount, now());

  RETURN jsonb_build_object(
    'xp_earned', p_xp_amount,
    'total_xp', v_new_xp,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'level_up', v_level_up,
    'seeker_rank', v_seeker_rank
  );
END;
$$;
