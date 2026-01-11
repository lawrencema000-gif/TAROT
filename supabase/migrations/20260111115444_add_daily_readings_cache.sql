/*
  # Add Daily Readings Cache and Premium Content Tables

  1. New Tables
    - `daily_readings_cache`
      - `id` (uuid, primary key)
      - `sign` (text) - zodiac sign
      - `date` (date) - reading date
      - `content` (jsonb) - cached reading content
      - `created_at` (timestamptz)
    - `premium_readings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `reading_type` (text) - type of premium reading
      - `context` (jsonb) - user context for the reading
      - `content` (text) - LLM-generated content
      - `cards` (jsonb) - tarot cards involved if applicable
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Public read access for daily_readings_cache
    - User-specific access for premium_readings

  3. Performance
    - Unique constraint on sign+date for cache
    - Index on user_id for premium_readings
*/

CREATE TABLE IF NOT EXISTS daily_readings_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sign text NOT NULL,
  date date NOT NULL,
  content jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_sign_date UNIQUE (sign, date)
);

CREATE TABLE IF NOT EXISTS premium_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reading_type text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  content text NOT NULL,
  cards jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_premium_readings_user_id ON premium_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_readings_created_at ON premium_readings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_readings_cache_date ON daily_readings_cache(date);

ALTER TABLE daily_readings_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read daily readings cache"
  ON daily_readings_cache
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can read own premium readings"
  ON premium_readings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own premium readings"
  ON premium_readings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own premium readings"
  ON premium_readings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
