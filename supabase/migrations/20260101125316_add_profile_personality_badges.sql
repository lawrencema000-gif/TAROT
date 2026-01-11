/*
  # Add Personality Badges and Level System to Profiles

  1. Changes to `profiles`
    - `mbti_type` (text) - User's MBTI personality type (e.g., "INFP")
    - `love_language` (text) - User's primary love language
    - `level` (integer) - User's engagement level based on activity
    - `total_readings` (integer) - Lifetime tarot readings count
    - `total_journal_entries` (integer) - Lifetime journal entries count
    - `avatar_seed` (text) - Unique seed for generating avatar
    - `theme` (text) - User's preferred theme (dark/light/auto)

  2. New Table: `user_badges`
    - Tracks unlocked badges/achievements

  3. Security
    - RLS policies for badges table
*/

-- Add new columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'mbti_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN mbti_type text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'love_language'
  ) THEN
    ALTER TABLE profiles ADD COLUMN love_language text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN level integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'total_readings'
  ) THEN
    ALTER TABLE profiles ADD COLUMN total_readings integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'total_journal_entries'
  ) THEN
    ALTER TABLE profiles ADD COLUMN total_journal_entries integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'avatar_seed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_seed text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'theme'
  ) THEN
    ALTER TABLE profiles ADD COLUMN theme text DEFAULT 'dark';
  END IF;
END $$;

-- Create user_badges table for achievement tracking
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type text NOT NULL,
  badge_name text NOT NULL,
  badge_description text DEFAULT '',
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges"
  ON user_badges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own badges"
  ON user_badges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create index for badge lookups
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);

-- Create function to calculate user level based on activity
CREATE OR REPLACE FUNCTION calculate_user_level(
  p_streak integer,
  p_total_readings integer,
  p_total_entries integer
) RETURNS integer AS $$
DECLARE
  v_points integer;
BEGIN
  v_points := (p_streak * 10) + (p_total_readings * 5) + (p_total_entries * 5);
  
  IF v_points >= 1000 THEN RETURN 10;
  ELSIF v_points >= 750 THEN RETURN 9;
  ELSIF v_points >= 500 THEN RETURN 8;
  ELSIF v_points >= 350 THEN RETURN 7;
  ELSIF v_points >= 250 THEN RETURN 6;
  ELSIF v_points >= 150 THEN RETURN 5;
  ELSIF v_points >= 100 THEN RETURN 4;
  ELSIF v_points >= 50 THEN RETURN 3;
  ELSIF v_points >= 20 THEN RETURN 2;
  ELSE RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql;
