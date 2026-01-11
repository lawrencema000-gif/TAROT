/*
  # Add Highlights, Ritual Tracking, and Premium Features

  1. New Tables
    - `saved_highlights`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `highlight_type` (text: 'horoscope', 'tarot', 'prompt')
      - `date` (date)
      - `content` (jsonb)
      - `created_at` (timestamptz)
    
    - `daily_rituals`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `date` (date, unique per user)
      - `horoscope_viewed` (boolean)
      - `tarot_viewed` (boolean)
      - `prompt_viewed` (boolean)
      - `completed` (boolean)
      - `created_at` (timestamptz)

  2. Schema Changes
    - Add `last_ritual_date` to profiles for streak tracking
    - Add `notifications_enabled` to profiles

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage their own data
*/

-- Add new columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_ritual_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_ritual_date date;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'notifications_enabled'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notifications_enabled boolean DEFAULT true;
  END IF;
END $$;

-- Saved highlights table
CREATE TABLE IF NOT EXISTS saved_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  highlight_type text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  content jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_highlight_type CHECK (highlight_type IN ('horoscope', 'tarot', 'prompt'))
);

ALTER TABLE saved_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved highlights"
  ON saved_highlights FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved highlights"
  ON saved_highlights FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved highlights"
  ON saved_highlights FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Daily rituals table
CREATE TABLE IF NOT EXISTS daily_rituals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  horoscope_viewed boolean DEFAULT false,
  tarot_viewed boolean DEFAULT false,
  prompt_viewed boolean DEFAULT false,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE daily_rituals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily rituals"
  ON daily_rituals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily rituals"
  ON daily_rituals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily rituals"
  ON daily_rituals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_highlights_user_date ON saved_highlights(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_rituals_user_date ON daily_rituals(user_id, date DESC);
