/*
  # Add XP and Level System

  ## Overview
  Implements a comprehensive experience point (XP) and leveling system with seeker ranks
  
  ## New Tables
  
  ### level_thresholds
  - Defines XP requirements for each level (1-50)
  - Uses exponential progression curve
  
  ### seeker_ranks  
  - Defines rank titles and level ranges
  - Novice (1-5), Apprentice (6-10), Adept (11-20), Master (21-35), Oracle (36-50)
  
  ### xp_activities
  - Tracks all XP-earning activities
  - Records activity_type, xp_earned, and timestamps
  
  ### app_settings
  - Stores global app configuration
  - Used for custom icon URLs and other settings
  
  ## Profile Updates
  - Add `xp` column (integer, default 0)
  - Add `seeker_rank` column (text, default 'Novice Seeker')
  
  ## Functions
  - calculate_level_from_xp(): Automatically determines level based on XP
  - award_xp(): Awards XP and triggers level-up calculation
  
  ## Security
  - All tables have RLS enabled
  - Users can only read their own XP activities
  - Only authenticated users can view level thresholds and ranks
  - App settings are readable by all authenticated users
*/

-- Add XP and seeker rank to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'xp'
  ) THEN
    ALTER TABLE profiles ADD COLUMN xp integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'seeker_rank'
  ) THEN
    ALTER TABLE profiles ADD COLUMN seeker_rank text DEFAULT 'Novice Seeker';
  END IF;
END $$;

-- Level thresholds table
CREATE TABLE IF NOT EXISTS level_thresholds (
  level integer PRIMARY KEY,
  xp_required integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE level_thresholds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Level thresholds readable by authenticated users" ON level_thresholds;
CREATE POLICY "Level thresholds readable by authenticated users"
  ON level_thresholds FOR SELECT
  TO authenticated
  USING (true);

-- Seeker ranks table
CREATE TABLE IF NOT EXISTS seeker_ranks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rank_name text NOT NULL,
  min_level integer NOT NULL,
  max_level integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE seeker_ranks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Seeker ranks readable by authenticated users" ON seeker_ranks;
CREATE POLICY "Seeker ranks readable by authenticated users"
  ON seeker_ranks FOR SELECT
  TO authenticated
  USING (true);

-- XP activities tracking table
CREATE TABLE IF NOT EXISTS xp_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (
    activity_type IN (
      'ritual_complete',
      'reading_saved',
      'journal_entry',
      'quiz_complete',
      'streak_milestone_7',
      'streak_milestone_30',
      'streak_milestone_100',
      'streak_milestone_365'
    )
  ),
  xp_earned integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE xp_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own XP activities" ON xp_activities;
CREATE POLICY "Users can view own XP activities"
  ON xp_activities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own XP activities" ON xp_activities;
CREATE POLICY "Users can insert own XP activities"
  ON xp_activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- App settings table for custom icons and config
CREATE TABLE IF NOT EXISTS app_settings (
  setting_key text PRIMARY KEY,
  setting_value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "App settings readable by authenticated users" ON app_settings;
CREATE POLICY "App settings readable by authenticated users"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage app settings" ON app_settings;
CREATE POLICY "Admins can manage app settings"
  ON app_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN (
        'lawrencecasullo@gmail.com',
        'admin@arcana.app'
      )
    )
  );

-- Seed level thresholds (exponential curve: level^2.5 * 100)
INSERT INTO level_thresholds (level, xp_required) VALUES
  (1, 0),
  (2, 280),
  (3, 700),
  (4, 1280),
  (5, 2000),
  (6, 2930),
  (7, 4050),
  (8, 5370),
  (9, 6910),
  (10, 8680),
  (11, 10700),
  (12, 12980),
  (13, 15530),
  (14, 18360),
  (15, 21490),
  (16, 24930),
  (17, 28700),
  (18, 32810),
  (19, 37280),
  (20, 42120),
  (21, 47350),
  (22, 52980),
  (23, 59030),
  (24, 65510),
  (25, 72440),
  (26, 79830),
  (27, 87700),
  (28, 96070),
  (29, 104950),
  (30, 114360),
  (31, 124310),
  (32, 134820),
  (33, 145910),
  (34, 157590),
  (35, 169880),
  (36, 182790),
  (37, 196340),
  (38, 210550),
  (39, 225440),
  (40, 241020),
  (41, 257320),
  (42, 274350),
  (43, 292130),
  (44, 310680),
  (45, 330020),
  (46, 350160),
  (47, 371130),
  (48, 392940),
  (49, 415620),
  (50, 439180)
ON CONFLICT (level) DO NOTHING;

-- Seed seeker ranks
INSERT INTO seeker_ranks (rank_name, min_level, max_level) VALUES
  ('Novice Seeker', 1, 5),
  ('Apprentice Seeker', 6, 10),
  ('Adept Seeker', 11, 20),
  ('Master Seeker', 21, 35),
  ('Oracle Seeker', 36, 50)
ON CONFLICT DO NOTHING;

-- Function to calculate level from XP
CREATE OR REPLACE FUNCTION calculate_level_from_xp(user_xp integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calculated_level integer;
BEGIN
  SELECT COALESCE(MAX(level), 1)
  INTO calculated_level
  FROM level_thresholds
  WHERE xp_required <= user_xp;
  
  RETURN calculated_level;
END;
$$;

-- Function to get seeker rank from level
CREATE OR REPLACE FUNCTION get_seeker_rank(user_level integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rank_name text;
BEGIN
  SELECT seeker_ranks.rank_name
  INTO rank_name
  FROM seeker_ranks
  WHERE user_level >= min_level AND user_level <= max_level
  LIMIT 1;
  
  RETURN COALESCE(rank_name, 'Novice Seeker');
END;
$$;

-- Function to award XP
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id uuid,
  p_activity_type text,
  p_xp_amount integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_level integer;
  new_level integer;
  new_xp integer;
  new_rank text;
  level_up boolean := false;
BEGIN
  -- Get current level
  SELECT level INTO old_level
  FROM profiles
  WHERE id = p_user_id;
  
  -- Add XP
  UPDATE profiles
  SET xp = xp + p_xp_amount
  WHERE id = p_user_id
  RETURNING xp INTO new_xp;
  
  -- Calculate new level
  new_level := calculate_level_from_xp(new_xp);
  
  -- Check if leveled up
  IF new_level > old_level THEN
    level_up := true;
    new_rank := get_seeker_rank(new_level);
    
    -- Update level and rank
    UPDATE profiles
    SET level = new_level, seeker_rank = new_rank
    WHERE id = p_user_id;
  END IF;
  
  -- Log activity
  INSERT INTO xp_activities (user_id, activity_type, xp_earned)
  VALUES (p_user_id, p_activity_type, p_xp_amount);
  
  -- Return result
  RETURN json_build_object(
    'xp_earned', p_xp_amount,
    'total_xp', new_xp,
    'old_level', old_level,
    'new_level', new_level,
    'level_up', level_up,
    'seeker_rank', COALESCE(new_rank, get_seeker_rank(old_level))
  );
END;
$$;

-- Create storage bucket for custom icons (if not exists)
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('custom-icons', 'custom-icons', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Storage policies for custom icons
DROP POLICY IF EXISTS "Custom icons are publicly accessible" ON storage.objects;
CREATE POLICY "Custom icons are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'custom-icons');

DROP POLICY IF EXISTS "Admins can upload custom icons" ON storage.objects;
CREATE POLICY "Admins can upload custom icons"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'custom-icons' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN (
        'lawrencecasullo@gmail.com',
        'admin@arcana.app'
      )
    )
  );

DROP POLICY IF EXISTS "Admins can delete custom icons" ON storage.objects;
CREATE POLICY "Admins can delete custom icons"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'custom-icons' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN (
        'lawrencecasullo@gmail.com',
        'admin@arcana.app'
      )
    )
  );
