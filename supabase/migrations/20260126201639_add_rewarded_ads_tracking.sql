/*
  # Add Rewarded Ads Tracking System

  1. New Tables
    - `rewarded_ad_unlocks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `feature` (text) - the premium feature that was temporarily unlocked
      - `unlocked_at` (timestamptz) - when the unlock was granted
      - `expires_at` (timestamptz) - when the unlock expires (1 hour after unlock)
      - `used` (boolean) - whether the unlock has been consumed
      - `ad_unit_id` (text) - which ad unit was watched

  2. Security
    - Enable RLS on `rewarded_ad_unlocks` table
    - Add policies for users to read/insert their own unlocks

  3. Notes
    - Users can watch up to 5 rewarded ads per day
    - Each unlock grants ONE use of a premium feature
    - Unlocks expire after 1 hour if not used
*/

CREATE TABLE IF NOT EXISTS rewarded_ad_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  used boolean NOT NULL DEFAULT false,
  ad_unit_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rewarded_ad_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rewarded ad unlocks"
  ON rewarded_ad_unlocks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rewarded ad unlocks"
  ON rewarded_ad_unlocks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rewarded ad unlocks"
  ON rewarded_ad_unlocks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_rewarded_ad_unlocks_user_feature 
  ON rewarded_ad_unlocks(user_id, feature);

CREATE INDEX IF NOT EXISTS idx_rewarded_ad_unlocks_expires 
  ON rewarded_ad_unlocks(user_id, expires_at) 
  WHERE used = false;

CREATE INDEX IF NOT EXISTS idx_rewarded_ad_unlocks_daily 
  ON rewarded_ad_unlocks(user_id, unlocked_at);
