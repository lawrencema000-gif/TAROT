/*
  # Achievement System - Complete Schema

  1. New Tables
    - `achievements`
      - `id` (uuid, primary key) - Unique identifier for each achievement
      - `name` (text) - Display name of the achievement
      - `description` (text) - Full description of what this achievement represents
      - `icon_name` (text) - Lucide icon name for display
      - `category` (text) - Category: exploration, mastery, dedication, milestones, special
      - `rarity` (text) - Rarity level: common, rare, epic, legendary
      - `xp_reward` (integer) - XP awarded when achievement is unlocked
      - `unlock_condition` (jsonb) - Flexible JSON structure defining unlock requirements
      - `is_premium_only` (boolean) - Whether this achievement requires premium features
      - `is_hidden` (boolean) - Whether to show this achievement before unlocking
      - `sort_order` (integer) - Display order within category
      - `is_active` (boolean) - Whether this achievement is currently available
      - `created_at` (timestamptz) - Creation timestamp
    
    - `user_achievements`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid) - Reference to user profile
      - `achievement_id` (uuid) - Reference to achievement definition
      - `progress` (integer) - Current progress toward goal
      - `target` (integer) - Target amount needed for completion
      - `unlocked_at` (timestamptz) - Timestamp when unlocked (null if locked)
      - `notified` (boolean) - Whether user has been shown the unlock celebration
      - `metadata` (jsonb) - Additional context data
      - `created_at` (timestamptz) - When tracking started
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `achievement_shares` (for future social features)
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid) - Reference to user
      - `achievement_id` (uuid) - Reference to achievement
      - `share_code` (text) - Unique shareable code
      - `share_platform` (text) - Platform shared to (nullable)
      - `shared_at` (timestamptz) - When shared

  2. Security
    - Enable RLS on all tables
    - Users can only view/update their own achievement progress
    - Achievement definitions readable by all authenticated users
    - Share records only accessible by owner

  3. Functions
    - `check_achievement_progress` - Check and update achievement progress
    - `unlock_achievement` - Unlock an achievement and award XP
    - `get_user_achievement_stats` - Get aggregated achievement statistics
    - `initialize_user_achievements` - Set up achievement tracking for new users
*/

-- Create achievement category enum type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'achievement_category') THEN
    CREATE TYPE achievement_category AS ENUM ('exploration', 'mastery', 'dedication', 'milestones', 'special');
  END IF;
END $$;

-- Create achievement rarity enum type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'achievement_rarity') THEN
    CREATE TYPE achievement_rarity AS ENUM ('common', 'rare', 'epic', 'legendary');
  END IF;
END $$;

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  icon_name text NOT NULL DEFAULT 'award',
  category achievement_category NOT NULL DEFAULT 'exploration',
  rarity achievement_rarity NOT NULL DEFAULT 'common',
  xp_reward integer NOT NULL DEFAULT 25,
  unlock_condition jsonb NOT NULL DEFAULT '{}',
  is_premium_only boolean NOT NULL DEFAULT false,
  is_hidden boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0,
  target integer NOT NULL DEFAULT 1,
  unlocked_at timestamptz,
  notified boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Create achievement_shares table for future social features
CREATE TABLE IF NOT EXISTS achievement_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  share_code text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  share_platform text,
  shared_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_rarity ON achievements(rarity);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON achievements(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON user_achievements(user_id, unlocked_at) WHERE unlocked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_achievements_not_notified ON user_achievements(user_id, notified) WHERE unlocked_at IS NOT NULL AND notified = false;
CREATE INDEX IF NOT EXISTS idx_achievement_shares_user ON achievement_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_achievement_shares_code ON achievement_shares(share_code);

-- Enable RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievements (readable by all authenticated users)
CREATE POLICY "Authenticated users can view active achievements"
  ON achievements FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view own achievement progress"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievement progress"
  ON user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievement progress"
  ON user_achievements FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for achievement_shares
CREATE POLICY "Users can view own shares"
  ON achievement_shares FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own shares"
  ON achievement_shares FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own shares"
  ON achievement_shares FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to initialize achievements for a new user
CREATE OR REPLACE FUNCTION initialize_user_achievements(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_achievements (user_id, achievement_id, target)
  SELECT 
    p_user_id,
    a.id,
    COALESCE((a.unlock_condition->>'target')::integer, 1)
  FROM achievements a
  WHERE a.is_active = true
  ON CONFLICT (user_id, achievement_id) DO NOTHING;
END;
$$;

-- Function to check and update achievement progress
CREATE OR REPLACE FUNCTION check_achievement_progress(
  p_user_id uuid,
  p_activity_type text,
  p_increment integer DEFAULT 1
)
RETURNS TABLE(
  achievement_id uuid,
  achievement_name text,
  xp_reward integer,
  rarity achievement_rarity,
  newly_unlocked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_achievement RECORD;
  v_current_progress integer;
  v_target integer;
  v_profile RECORD;
BEGIN
  -- Get user profile for context
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  
  -- Loop through relevant achievements based on activity type
  FOR v_achievement IN
    SELECT a.*
    FROM achievements a
    WHERE a.is_active = true
    AND (
      a.unlock_condition->>'activity_type' = p_activity_type
      OR a.unlock_condition->>'trigger' = p_activity_type
    )
  LOOP
    -- Get or create user achievement record
    INSERT INTO user_achievements (user_id, achievement_id, target)
    VALUES (
      p_user_id, 
      v_achievement.id, 
      COALESCE((v_achievement.unlock_condition->>'target')::integer, 1)
    )
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
    
    -- Get current progress
    SELECT ua.progress, ua.target INTO v_current_progress, v_target
    FROM user_achievements ua
    WHERE ua.user_id = p_user_id AND ua.achievement_id = v_achievement.id;
    
    -- Skip if already unlocked
    IF EXISTS (
      SELECT 1 FROM user_achievements ua
      WHERE ua.user_id = p_user_id 
      AND ua.achievement_id = v_achievement.id 
      AND ua.unlocked_at IS NOT NULL
    ) THEN
      CONTINUE;
    END IF;
    
    -- Update progress
    UPDATE user_achievements
    SET 
      progress = LEAST(progress + p_increment, target),
      updated_at = now()
    WHERE user_id = p_user_id AND achievement_id = v_achievement.id;
    
    -- Check if now unlocked
    IF v_current_progress + p_increment >= v_target THEN
      -- Unlock the achievement
      UPDATE user_achievements
      SET unlocked_at = now(), progress = target
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id;
      
      -- Award XP
      UPDATE profiles
      SET xp = COALESCE(xp, 0) + v_achievement.xp_reward
      WHERE id = p_user_id;
      
      -- Return this achievement as newly unlocked
      achievement_id := v_achievement.id;
      achievement_name := v_achievement.name;
      xp_reward := v_achievement.xp_reward;
      rarity := v_achievement.rarity;
      newly_unlocked := true;
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- Function to manually unlock an achievement
CREATE OR REPLACE FUNCTION unlock_achievement(
  p_user_id uuid,
  p_achievement_id uuid
)
RETURNS TABLE(
  success boolean,
  xp_awarded integer,
  achievement_name text,
  rarity achievement_rarity
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_achievement RECORD;
BEGIN
  -- Get achievement details
  SELECT * INTO v_achievement FROM achievements WHERE id = p_achievement_id AND is_active = true;
  
  IF NOT FOUND THEN
    success := false;
    xp_awarded := 0;
    achievement_name := '';
    rarity := 'common';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Check if already unlocked
  IF EXISTS (
    SELECT 1 FROM user_achievements 
    WHERE user_id = p_user_id 
    AND achievement_id = p_achievement_id 
    AND unlocked_at IS NOT NULL
  ) THEN
    success := false;
    xp_awarded := 0;
    achievement_name := v_achievement.name;
    rarity := v_achievement.rarity;
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Unlock the achievement
  INSERT INTO user_achievements (user_id, achievement_id, progress, target, unlocked_at)
  VALUES (
    p_user_id, 
    p_achievement_id, 
    COALESCE((v_achievement.unlock_condition->>'target')::integer, 1),
    COALESCE((v_achievement.unlock_condition->>'target')::integer, 1),
    now()
  )
  ON CONFLICT (user_id, achievement_id) 
  DO UPDATE SET unlocked_at = now(), progress = user_achievements.target;
  
  -- Award XP
  UPDATE profiles
  SET xp = COALESCE(xp, 0) + v_achievement.xp_reward
  WHERE id = p_user_id;
  
  success := true;
  xp_awarded := v_achievement.xp_reward;
  achievement_name := v_achievement.name;
  rarity := v_achievement.rarity;
  RETURN NEXT;
END;
$$;

-- Function to get user achievement statistics
CREATE OR REPLACE FUNCTION get_user_achievement_stats(p_user_id uuid)
RETURNS TABLE(
  total_achievements integer,
  unlocked_achievements integer,
  completion_percentage numeric,
  total_xp_from_achievements integer,
  category_stats jsonb,
  rarity_stats jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::integer FROM achievements WHERE is_active = true) as total_achievements,
    (SELECT COUNT(*)::integer FROM user_achievements WHERE user_id = p_user_id AND unlocked_at IS NOT NULL) as unlocked_achievements,
    ROUND(
      (SELECT COUNT(*)::numeric FROM user_achievements WHERE user_id = p_user_id AND unlocked_at IS NOT NULL) /
      NULLIF((SELECT COUNT(*)::numeric FROM achievements WHERE is_active = true), 0) * 100,
      1
    ) as completion_percentage,
    COALESCE(
      (SELECT SUM(a.xp_reward)::integer 
       FROM user_achievements ua 
       JOIN achievements a ON a.id = ua.achievement_id 
       WHERE ua.user_id = p_user_id AND ua.unlocked_at IS NOT NULL),
      0
    ) as total_xp_from_achievements,
    (
      SELECT jsonb_object_agg(
        cat.category,
        jsonb_build_object(
          'total', cat.total,
          'unlocked', cat.unlocked
        )
      )
      FROM (
        SELECT 
          a.category::text,
          COUNT(*)::integer as total,
          COUNT(CASE WHEN ua.unlocked_at IS NOT NULL THEN 1 END)::integer as unlocked
        FROM achievements a
        LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = p_user_id
        WHERE a.is_active = true
        GROUP BY a.category
      ) cat
    ) as category_stats,
    (
      SELECT jsonb_object_agg(
        rar.rarity,
        jsonb_build_object(
          'total', rar.total,
          'unlocked', rar.unlocked
        )
      )
      FROM (
        SELECT 
          a.rarity::text,
          COUNT(*)::integer as total,
          COUNT(CASE WHEN ua.unlocked_at IS NOT NULL THEN 1 END)::integer as unlocked
        FROM achievements a
        LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = p_user_id
        WHERE a.is_active = true
        GROUP BY a.rarity
      ) rar
    ) as rarity_stats;
END;
$$;

-- Function to mark achievement as notified
CREATE OR REPLACE FUNCTION mark_achievement_notified(
  p_user_id uuid,
  p_achievement_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_achievements
  SET notified = true
  WHERE user_id = p_user_id AND achievement_id = p_achievement_id;
  
  RETURN FOUND;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_achievements_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_achievements_updated_at ON user_achievements;
CREATE TRIGGER user_achievements_updated_at
  BEFORE UPDATE ON user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_user_achievements_updated_at();
