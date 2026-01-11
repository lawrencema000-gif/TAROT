/*
  # Initial Schema for Self-Discovery Hub

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `display_name` (text)
      - `birth_date` (date, required)
      - `birth_time` (time, optional)
      - `birth_place` (text, optional)
      - `timezone` (text)
      - `goals` (text array)
      - `onboarding_complete` (boolean)
      - `is_premium` (boolean)
      - `streak` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `journal_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `date` (date)
      - `content` (text)
      - `mood_tags` (text array)
      - `prompt` (text, optional)
      - `linked_reading_id` (uuid, optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `tarot_readings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `date` (date)
      - `spread_type` (text)
      - `cards` (jsonb)
      - `interpretation` (text)
      - `saved` (boolean)
      - `created_at` (timestamptz)
    
    - `quiz_results`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `quiz_type` (text)
      - `quiz_id` (text)
      - `result` (text)
      - `scores` (jsonb)
      - `completed_at` (timestamptz)
    
    - `horoscope_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `date` (date)
      - `sign` (text)
      - `content` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text NOT NULL DEFAULT '',
  birth_date date,
  birth_time time,
  birth_place text,
  timezone text DEFAULT 'UTC',
  goals text[] DEFAULT '{}',
  onboarding_complete boolean DEFAULT false,
  is_premium boolean DEFAULT false,
  streak integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Journal entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  content text NOT NULL DEFAULT '',
  mood_tags text[] DEFAULT '{}',
  prompt text,
  linked_reading_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journal entries"
  ON journal_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal entries"
  ON journal_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries"
  ON journal_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal entries"
  ON journal_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Tarot readings table
CREATE TABLE IF NOT EXISTS tarot_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  spread_type text NOT NULL DEFAULT 'single',
  cards jsonb NOT NULL DEFAULT '[]',
  interpretation text DEFAULT '',
  saved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tarot_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tarot readings"
  ON tarot_readings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tarot readings"
  ON tarot_readings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tarot readings"
  ON tarot_readings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tarot readings"
  ON tarot_readings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Quiz results table
CREATE TABLE IF NOT EXISTS quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_type text NOT NULL,
  quiz_id text NOT NULL,
  result text NOT NULL,
  scores jsonb NOT NULL DEFAULT '{}',
  completed_at timestamptz DEFAULT now()
);

ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz results"
  ON quiz_results FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz results"
  ON quiz_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own quiz results"
  ON quiz_results FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Horoscope history table
CREATE TABLE IF NOT EXISTS horoscope_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  sign text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE horoscope_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own horoscope history"
  ON horoscope_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own horoscope history"
  ON horoscope_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON journal_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_tarot_readings_user_date ON tarot_readings(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_type ON quiz_results(user_id, quiz_type);
CREATE INDEX IF NOT EXISTS idx_horoscope_history_user_date ON horoscope_history(user_id, date DESC);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_journal_entries_updated_at') THEN
    CREATE TRIGGER update_journal_entries_updated_at
      BEFORE UPDATE ON journal_entries
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
