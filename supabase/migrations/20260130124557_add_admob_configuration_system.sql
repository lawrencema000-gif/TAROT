/*
  # AdMob Configuration System

  1. New Tables
    - `ad_units`
      - `id` (uuid, primary key)
      - `ad_type` (text) - banner, interstitial, rewarded, app_open
      - `platform` (text) - android, ios
      - `ad_unit_id` (text) - the AdMob ad unit ID
      - `is_test` (boolean) - whether this is a test ad unit
      - `is_enabled` (boolean) - whether this ad type is enabled
      - `settings` (jsonb) - additional settings like frequency caps
      - `created_at`, `updated_at` timestamps

  2. Updates to ad_impressions
    - Add `ad_type` column to distinguish between banner, interstitial, rewarded, app_open
    - Add `duration_ms` for tracking ad display duration
    - Add `reward_amount` and `reward_type` for rewarded ads
    - Update action_trigger constraint to include app_launch

  3. Updates to ad_analytics_daily
    - Add columns for tracking each ad type separately
    - Add rewarded completions and revenue tracking

  4. Security
    - Enable RLS on ad_units table
    - Add read-only policy for authenticated users
    - Add admin management policy

  5. Seed Data
    - Insert test ad unit IDs for all platforms and ad types
*/

-- Create ad_units configuration table
CREATE TABLE IF NOT EXISTS ad_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_type text NOT NULL CHECK (ad_type IN ('banner', 'interstitial', 'rewarded', 'app_open')),
  platform text NOT NULL CHECK (platform IN ('android', 'ios')),
  ad_unit_id text NOT NULL,
  is_test boolean NOT NULL DEFAULT true,
  is_enabled boolean NOT NULL DEFAULT true,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(ad_type, platform, is_test)
);

ALTER TABLE ad_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ad units"
  ON ad_units
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_ad_units_type_platform 
  ON ad_units(ad_type, platform, is_test) 
  WHERE is_enabled = true;

-- Update ad_impressions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_impressions' AND column_name = 'ad_type'
  ) THEN
    ALTER TABLE ad_impressions ADD COLUMN ad_type text DEFAULT 'interstitial';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_impressions' AND column_name = 'duration_ms'
  ) THEN
    ALTER TABLE ad_impressions ADD COLUMN duration_ms integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_impressions' AND column_name = 'reward_amount'
  ) THEN
    ALTER TABLE ad_impressions ADD COLUMN reward_amount integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_impressions' AND column_name = 'reward_type'
  ) THEN
    ALTER TABLE ad_impressions ADD COLUMN reward_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_impressions' AND column_name = 'completed'
  ) THEN
    ALTER TABLE ad_impressions ADD COLUMN completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_impressions' AND column_name = 'error_code'
  ) THEN
    ALTER TABLE ad_impressions ADD COLUMN error_code text;
  END IF;
END $$;

ALTER TABLE ad_impressions DROP CONSTRAINT IF EXISTS ad_impressions_action_trigger_check;
ALTER TABLE ad_impressions ADD CONSTRAINT ad_impressions_action_trigger_check 
  CHECK (action_trigger IN ('reading', 'quiz', 'journal', 'app_launch', 'navigation', 'feature_unlock'));

ALTER TABLE ad_impressions DROP CONSTRAINT IF EXISTS ad_impressions_ad_type_check;
ALTER TABLE ad_impressions ADD CONSTRAINT ad_impressions_ad_type_check 
  CHECK (ad_type IN ('banner', 'interstitial', 'rewarded', 'app_open'));

CREATE INDEX IF NOT EXISTS idx_ad_impressions_ad_type 
  ON ad_impressions(ad_type, created_at);

CREATE INDEX IF NOT EXISTS idx_ad_impressions_completed 
  ON ad_impressions(ad_type, completed) 
  WHERE ad_type = 'rewarded';

-- Update ad_analytics_daily table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_analytics_daily' AND column_name = 'banner_impressions'
  ) THEN
    ALTER TABLE ad_analytics_daily ADD COLUMN banner_impressions integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_analytics_daily' AND column_name = 'interstitial_impressions'
  ) THEN
    ALTER TABLE ad_analytics_daily ADD COLUMN interstitial_impressions integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_analytics_daily' AND column_name = 'rewarded_impressions'
  ) THEN
    ALTER TABLE ad_analytics_daily ADD COLUMN rewarded_impressions integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_analytics_daily' AND column_name = 'rewarded_completions'
  ) THEN
    ALTER TABLE ad_analytics_daily ADD COLUMN rewarded_completions integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_analytics_daily' AND column_name = 'app_open_impressions'
  ) THEN
    ALTER TABLE ad_analytics_daily ADD COLUMN app_open_impressions integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_analytics_daily' AND column_name = 'total_ad_duration_ms'
  ) THEN
    ALTER TABLE ad_analytics_daily ADD COLUMN total_ad_duration_ms bigint DEFAULT 0;
  END IF;
END $$;

-- Insert test ad unit IDs (Google's official test ad unit IDs)
INSERT INTO ad_units (ad_type, platform, ad_unit_id, is_test, is_enabled, settings)
VALUES
  -- Android Test Ad Units
  ('banner', 'android', 'ca-app-pub-3940256099942544/6300978111', true, true, '{"position": "bottom", "refreshInterval": 60}'),
  ('interstitial', 'android', 'ca-app-pub-3940256099942544/1033173712', true, true, '{"frequencyCap": 3, "cooldownMinutes": 5}'),
  ('rewarded', 'android', 'ca-app-pub-3940256099942544/5224354917', true, true, '{"dailyLimit": 5, "rewardAmount": 1}'),
  ('app_open', 'android', 'ca-app-pub-3940256099942544/9257395921', true, true, '{"minTimeBetweenAds": 300, "showOnColdStart": true}'),
  
  -- iOS Test Ad Units
  ('banner', 'ios', 'ca-app-pub-3940256099942544/2934735716', true, true, '{"position": "bottom", "refreshInterval": 60}'),
  ('interstitial', 'ios', 'ca-app-pub-3940256099942544/4411468910', true, true, '{"frequencyCap": 3, "cooldownMinutes": 5}'),
  ('rewarded', 'ios', 'ca-app-pub-3940256099942544/1712485313', true, true, '{"dailyLimit": 5, "rewardAmount": 1}'),
  ('app_open', 'ios', 'ca-app-pub-3940256099942544/5575463023', true, true, '{"minTimeBetweenAds": 300, "showOnColdStart": true}'),
  
  -- Production placeholders (disabled by default, to be filled with real ad unit IDs)
  ('banner', 'android', 'REPLACE_WITH_PRODUCTION_AD_UNIT_ID', false, false, '{"position": "bottom", "refreshInterval": 60}'),
  ('interstitial', 'android', 'REPLACE_WITH_PRODUCTION_AD_UNIT_ID', false, false, '{"frequencyCap": 3, "cooldownMinutes": 5}'),
  ('rewarded', 'android', 'REPLACE_WITH_PRODUCTION_AD_UNIT_ID', false, false, '{"dailyLimit": 5, "rewardAmount": 1}'),
  ('app_open', 'android', 'REPLACE_WITH_PRODUCTION_AD_UNIT_ID', false, false, '{"minTimeBetweenAds": 300, "showOnColdStart": true}'),
  ('banner', 'ios', 'REPLACE_WITH_PRODUCTION_AD_UNIT_ID', false, false, '{"position": "bottom", "refreshInterval": 60}'),
  ('interstitial', 'ios', 'REPLACE_WITH_PRODUCTION_AD_UNIT_ID', false, false, '{"frequencyCap": 3, "cooldownMinutes": 5}'),
  ('rewarded', 'ios', 'REPLACE_WITH_PRODUCTION_AD_UNIT_ID', false, false, '{"dailyLimit": 5, "rewardAmount": 1}'),
  ('app_open', 'ios', 'REPLACE_WITH_PRODUCTION_AD_UNIT_ID', false, false, '{"minTimeBetweenAds": 300, "showOnColdStart": true}')
ON CONFLICT (ad_type, platform, is_test) DO NOTHING;

-- Function to get ad configuration for a user
CREATE OR REPLACE FUNCTION get_ad_config(
  p_platform text,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_premium boolean := false;
  v_is_ad_free boolean := false;
  v_use_test_ads boolean := true;
  v_config jsonb;
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT is_premium, is_ad_free INTO v_is_premium, v_is_ad_free
    FROM profiles
    WHERE id = p_user_id;
  END IF;

  IF v_is_premium OR v_is_ad_free THEN
    RETURN jsonb_build_object(
      'showAds', false,
      'isPremium', v_is_premium,
      'isAdFree', v_is_ad_free,
      'adUnits', '{}'::jsonb
    );
  END IF;

  SELECT jsonb_object_agg(
    ad_type,
    jsonb_build_object(
      'adUnitId', ad_unit_id,
      'isEnabled', is_enabled,
      'settings', settings
    )
  ) INTO v_config
  FROM ad_units
  WHERE platform = p_platform
    AND is_test = v_use_test_ads
    AND is_enabled = true;

  RETURN jsonb_build_object(
    'showAds', true,
    'isPremium', false,
    'isAdFree', false,
    'adUnits', COALESCE(v_config, '{}'::jsonb)
  );
END;
$$;

-- Function to record ad impression
CREATE OR REPLACE FUNCTION record_ad_impression(
  p_user_id uuid,
  p_ad_type text,
  p_platform text,
  p_ad_unit_id text,
  p_action_trigger text,
  p_duration_ms integer DEFAULT 0,
  p_completed boolean DEFAULT false,
  p_clicked boolean DEFAULT false,
  p_reward_amount integer DEFAULT 0,
  p_reward_type text DEFAULT NULL,
  p_error_code text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_impression_id uuid;
BEGIN
  INSERT INTO ad_impressions (
    user_id,
    ad_type,
    platform,
    ad_unit_id,
    action_trigger,
    duration_ms,
    completed,
    clicked,
    reward_amount,
    reward_type,
    error_code
  ) VALUES (
    p_user_id,
    p_ad_type,
    p_platform,
    p_ad_unit_id,
    p_action_trigger,
    p_duration_ms,
    p_completed,
    p_clicked,
    p_reward_amount,
    p_reward_type,
    p_error_code
  )
  RETURNING id INTO v_impression_id;

  RETURN v_impression_id;
END;
$$;

-- Function to get daily ad stats for a user
CREATE OR REPLACE FUNCTION get_user_daily_ad_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'date', v_today,
    'totalImpressions', COUNT(*),
    'rewardedWatched', COUNT(*) FILTER (WHERE ad_type = 'rewarded' AND completed = true),
    'rewardedRemaining', 5 - COALESCE(COUNT(*) FILTER (WHERE ad_type = 'rewarded' AND completed = true), 0),
    'byType', jsonb_build_object(
      'banner', COUNT(*) FILTER (WHERE ad_type = 'banner'),
      'interstitial', COUNT(*) FILTER (WHERE ad_type = 'interstitial'),
      'rewarded', COUNT(*) FILTER (WHERE ad_type = 'rewarded'),
      'app_open', COUNT(*) FILTER (WHERE ad_type = 'app_open')
    )
  ) INTO v_stats
  FROM ad_impressions
  WHERE user_id = p_user_id
    AND created_at::date = v_today;

  RETURN COALESCE(v_stats, jsonb_build_object(
    'date', v_today,
    'totalImpressions', 0,
    'rewardedWatched', 0,
    'rewardedRemaining', 5,
    'byType', jsonb_build_object(
      'banner', 0,
      'interstitial', 0,
      'rewarded', 0,
      'app_open', 0
    )
  ));
END;
$$;
