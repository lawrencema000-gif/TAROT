/*
  # Ad Analytics Schema

  1. New Tables
    - `ad_impressions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `platform` (text) - 'android' or 'ios'
      - `action_trigger` (text) - 'reading', 'quiz', or 'journal'
      - `ad_unit_id` (text) - AdMob ad unit ID
      - `dismissed` (boolean) - Whether the ad was dismissed
      - `clicked` (boolean) - Whether the ad was clicked
      - `created_at` (timestamptz)
      
    - `ad_analytics_daily`
      - `id` (uuid, primary key)
      - `date` (date, unique) - The date of the analytics
      - `total_impressions` (integer) - Total ad impressions
      - `total_clicks` (integer) - Total ad clicks
      - `android_impressions` (integer)
      - `ios_impressions` (integer)
      - `reading_triggers` (integer)
      - `quiz_triggers` (integer)
      - `journal_triggers` (integer)
      - `estimated_revenue` (decimal) - Estimated revenue in USD
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `ad_impressions` table
    - Enable RLS on `ad_analytics_daily` table
    - Add policy for authenticated users to insert their own impressions
    - Add policy for authenticated users to read their own impressions
    - Add policy for admin users to read all analytics data (by email check)

  3. Functions
    - `calculate_daily_ad_revenue()` - Aggregates daily ad statistics
    - `update_ad_impression_status()` - Updates dismissed/clicked status

  4. Indexes
    - Index on `ad_impressions.user_id` for fast user queries
    - Index on `ad_impressions.created_at` for time-based queries
    - Index on `ad_impressions.platform` for platform filtering
    - Index on `ad_analytics_daily.date` for date-based queries
*/

CREATE TABLE IF NOT EXISTS ad_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('android', 'ios')),
  action_trigger text NOT NULL CHECK (action_trigger IN ('reading', 'quiz', 'journal')),
  ad_unit_id text NOT NULL,
  dismissed boolean DEFAULT false,
  clicked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own ad impressions"
  ON ad_impressions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own ad impressions"
  ON ad_impressions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can read all ad impressions"
  ON ad_impressions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = 'lawrence.ma000@gmail.com'
    )
  );

CREATE INDEX IF NOT EXISTS idx_ad_impressions_user_id ON ad_impressions(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_created_at ON ad_impressions(created_at);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_platform ON ad_impressions(platform);

CREATE TABLE IF NOT EXISTS ad_analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  total_impressions integer DEFAULT 0,
  total_clicks integer DEFAULT 0,
  android_impressions integer DEFAULT 0,
  ios_impressions integer DEFAULT 0,
  reading_triggers integer DEFAULT 0,
  quiz_triggers integer DEFAULT 0,
  journal_triggers integer DEFAULT 0,
  estimated_revenue decimal(10, 2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ad_analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read all daily analytics"
  ON ad_analytics_daily
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = 'lawrence.ma000@gmail.com'
    )
  );

CREATE INDEX IF NOT EXISTS idx_ad_analytics_daily_date ON ad_analytics_daily(date);

CREATE OR REPLACE FUNCTION calculate_daily_ad_revenue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date := CURRENT_DATE;
  v_impressions integer;
  v_clicks integer;
  v_android_impressions integer;
  v_ios_impressions integer;
  v_reading_triggers integer;
  v_quiz_triggers integer;
  v_journal_triggers integer;
  v_revenue decimal(10, 2);
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE clicked = true),
    COUNT(*) FILTER (WHERE platform = 'android'),
    COUNT(*) FILTER (WHERE platform = 'ios'),
    COUNT(*) FILTER (WHERE action_trigger = 'reading'),
    COUNT(*) FILTER (WHERE action_trigger = 'quiz'),
    COUNT(*) FILTER (WHERE action_trigger = 'journal')
  INTO
    v_impressions,
    v_clicks,
    v_android_impressions,
    v_ios_impressions,
    v_reading_triggers,
    v_quiz_triggers,
    v_journal_triggers
  FROM ad_impressions
  WHERE DATE(created_at) = v_date;

  v_revenue := (v_impressions * 0.01) + (v_clicks * 0.10);

  INSERT INTO ad_analytics_daily (
    date,
    total_impressions,
    total_clicks,
    android_impressions,
    ios_impressions,
    reading_triggers,
    quiz_triggers,
    journal_triggers,
    estimated_revenue,
    updated_at
  )
  VALUES (
    v_date,
    v_impressions,
    v_clicks,
    v_android_impressions,
    v_ios_impressions,
    v_reading_triggers,
    v_quiz_triggers,
    v_journal_triggers,
    v_revenue,
    now()
  )
  ON CONFLICT (date)
  DO UPDATE SET
    total_impressions = v_impressions,
    total_clicks = v_clicks,
    android_impressions = v_android_impressions,
    ios_impressions = v_ios_impressions,
    reading_triggers = v_reading_triggers,
    quiz_triggers = v_quiz_triggers,
    journal_triggers = v_journal_triggers,
    estimated_revenue = v_revenue,
    updated_at = now();
END;
$$;
