-- Fix all Supabase Security Advisor warnings:
-- 1. Function Search Path Mutable (7 achievement/XP functions)
-- 2. Auth RLS Initialization Plan (wrap auth.uid() in subquery)
-- 3. Multiple Permissive Policies (consolidate blog_posts & ad_impressions SELECT)
-- 4. Leaked Password Protection

-- ============================================================
-- 1. FIX FUNCTION SEARCH PATH MUTABLE
-- Add SET search_path to all 7 achievement/XP functions
-- ============================================================

CREATE OR REPLACE FUNCTION mark_achievement_notified(
  p_user_id uuid,
  p_achievement_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE user_achievements
  SET notified = true, updated_at = now()
  WHERE user_id = p_user_id AND achievement_id = p_achievement_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION initialize_user_achievements(
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
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
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  PERFORM initialize_user_achievements(p_user_id);

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

  UPDATE user_achievements ua
  SET unlocked_at = now(), updated_at = now()
  FROM achievements a
  WHERE ua.achievement_id = a.id
    AND ua.user_id = p_user_id
    AND ua.progress >= ua.target
    AND ua.unlocked_at IS NULL
    AND a.is_active = true;

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

CREATE OR REPLACE FUNCTION unlock_achievement(
  p_user_id uuid,
  p_achievement_id uuid
) RETURNS TABLE (
  success boolean,
  xp_awarded int,
  achievement_name text,
  rarity text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_achievement achievements%ROWTYPE;
BEGIN
  SELECT * INTO v_achievement FROM achievements WHERE id = p_achievement_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, ''::text, ''::text;
    RETURN;
  END IF;

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
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM check_achievement_progress(p_user_id, 'level_reached', p_new_level);

  RETURN QUERY
  SELECT * FROM check_achievement_progress(p_user_id, 'xp_earned', p_total_xp);

  RETURN QUERY
  SELECT * FROM check_achievement_progress(p_user_id, 'rank_achieved', 1);
END;
$$;

CREATE OR REPLACE FUNCTION award_xp(
  p_user_id uuid,
  p_activity_type text,
  p_xp_amount int
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_new_xp int;
  v_old_level int;
  v_new_level int;
  v_seeker_rank text;
  v_level_up boolean := false;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;

  v_old_level := COALESCE(v_profile.level, 1);
  v_new_xp := COALESCE(v_profile.xp, 0) + p_xp_amount;

  SELECT COALESCE(MAX(level), v_old_level) INTO v_new_level
  FROM level_thresholds
  WHERE xp_required <= v_new_xp;

  v_level_up := v_new_level > v_old_level;

  SELECT COALESCE(rank_name, 'Novice Seeker') INTO v_seeker_rank
  FROM seeker_ranks
  WHERE v_new_level BETWEEN min_level AND max_level
  LIMIT 1;

  UPDATE profiles
  SET xp = v_new_xp, level = v_new_level, seeker_rank = v_seeker_rank, updated_at = now()
  WHERE id = p_user_id;

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

-- ============================================================
-- 2. FIX AUTH RLS INITIALIZATION PLAN
-- Wrap auth.uid() in (select ...) for proper query planning
-- ============================================================

-- achievement_shares
DROP POLICY IF EXISTS "Users can view own shares" ON achievement_shares;
DROP POLICY IF EXISTS "Users can create own shares" ON achievement_shares;
DROP POLICY IF EXISTS "Users can delete own shares" ON achievement_shares;

CREATE POLICY "Users can view own shares" ON achievement_shares
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own shares" ON achievement_shares
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own shares" ON achievement_shares
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- user_achievements
DROP POLICY IF EXISTS "Users can view own achievement progress" ON user_achievements;
DROP POLICY IF EXISTS "Users can insert own achievement progress" ON user_achievements;
DROP POLICY IF EXISTS "Users can update own achievement progress" ON user_achievements;

CREATE POLICY "Users can view own achievement progress" ON user_achievements
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own achievement progress" ON user_achievements
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own achievement progress" ON user_achievements
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- xp_activities
DROP POLICY IF EXISTS "Users can view own XP activities" ON xp_activities;
DROP POLICY IF EXISTS "Users can insert own XP activities" ON xp_activities;

CREATE POLICY "Users can view own XP activities" ON xp_activities
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own XP activities" ON xp_activities
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- rewarded_ad_unlocks
DROP POLICY IF EXISTS "Users can view own rewarded ad unlocks" ON rewarded_ad_unlocks;
DROP POLICY IF EXISTS "Users can insert own rewarded ad unlocks" ON rewarded_ad_unlocks;
DROP POLICY IF EXISTS "Users can update own rewarded ad unlocks" ON rewarded_ad_unlocks;

CREATE POLICY "Users can view own rewarded ad unlocks" ON rewarded_ad_unlocks
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own rewarded ad unlocks" ON rewarded_ad_unlocks
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own rewarded ad unlocks" ON rewarded_ad_unlocks
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ad_impressions (user policies)
DROP POLICY IF EXISTS "Users can insert own ad impressions" ON ad_impressions;
DROP POLICY IF EXISTS "Users can read own ad impressions" ON ad_impressions;

CREATE POLICY "Users can insert own ad impressions" ON ad_impressions
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can read own ad impressions" ON ad_impressions
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- 3. FIX MULTIPLE PERMISSIVE POLICIES
-- Consolidate multiple SELECT policies into one per table
-- ============================================================

-- ad_impressions: merge user + admin SELECT into one policy
DROP POLICY IF EXISTS "Users can read own ad impressions" ON ad_impressions;
DROP POLICY IF EXISTS "Admin can read all ad impressions" ON ad_impressions;

CREATE POLICY "Users and admins can read ad impressions" ON ad_impressions
  FOR SELECT TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR public.is_admin()
  );

-- blog_posts: merge public + admin SELECT into one policy
DROP POLICY IF EXISTS blog_posts_public_read ON blog_posts;
DROP POLICY IF EXISTS blog_posts_admin_read ON blog_posts;

CREATE POLICY blog_posts_read ON blog_posts
  FOR SELECT
  USING (
    published = true
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
  );

-- Also fix auth.uid() in remaining blog_posts admin policies
DROP POLICY IF EXISTS blog_posts_admin_update ON blog_posts;
DROP POLICY IF EXISTS blog_posts_admin_delete ON blog_posts;
DROP POLICY IF EXISTS blog_posts_admin_insert ON blog_posts;

CREATE POLICY blog_posts_admin_update ON blog_posts
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin'));

CREATE POLICY blog_posts_admin_delete ON blog_posts
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin'));

CREATE POLICY blog_posts_admin_insert ON blog_posts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin'));

-- ============================================================
-- 4. ENABLE LEAKED PASSWORD PROTECTION
-- ============================================================

-- Note: Leaked password protection must be enabled via the Supabase Dashboard:
-- Authentication > Settings > Security > Enable Leaked Password Protection
-- This cannot be done via SQL migration.
