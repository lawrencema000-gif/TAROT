/*
  # Add User Preferences and Content Tracking

  1. New Tables
    - `user_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `frequent_tags` (text array) - most common journal tags
      - `saved_themes` (text array) - recently saved content themes
      - `preferred_spread` (text) - favorite tarot spread type
      - `favorite_cards` (int array) - favorite tarot card IDs
      - `engagement_data` (jsonb) - engagement patterns
      - `last_computed_at` (timestamptz) - when preferences were last computed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `content_interactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `content_type` (text) - horoscope, tarot, prompt, compatibility
      - `content_id` (text) - identifier for specific content
      - `interaction_type` (text) - view, save, share, complete
      - `metadata` (jsonb) - additional context
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own data
*/

CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  frequent_tags text[] DEFAULT '{}',
  saved_themes text[] DEFAULT '{}',
  preferred_spread text DEFAULT 'single',
  favorite_cards int[] DEFAULT '{}',
  engagement_data jsonb DEFAULT '{"mostActiveDay": 0, "mostActiveHour": 9, "preferredReadingTime": "morning"}',
  last_computed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS content_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  content_id text,
  interaction_type text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_content_interactions_user_id ON content_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_content_interactions_type ON content_interactions(content_type, interaction_type);
CREATE INDEX IF NOT EXISTS idx_content_interactions_created ON content_interactions(created_at DESC);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_interactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_preferences' AND policyname = 'Users can view own preferences'
  ) THEN
    CREATE POLICY "Users can view own preferences"
      ON user_preferences
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_preferences' AND policyname = 'Users can insert own preferences'
  ) THEN
    CREATE POLICY "Users can insert own preferences"
      ON user_preferences
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_preferences' AND policyname = 'Users can update own preferences'
  ) THEN
    CREATE POLICY "Users can update own preferences"
      ON user_preferences
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'content_interactions' AND policyname = 'Users can view own interactions'
  ) THEN
    CREATE POLICY "Users can view own interactions"
      ON content_interactions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'content_interactions' AND policyname = 'Users can insert own interactions'
  ) THEN
    CREATE POLICY "Users can insert own interactions"
      ON content_interactions
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
