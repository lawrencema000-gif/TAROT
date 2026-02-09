/*
  # Add spread_type column to rewarded_ad_unlocks

  1. Modified Tables
    - `rewarded_ad_unlocks`
      - Added `spread_type` (text, nullable) - tracks the specific spread type
        that was unlocked (e.g., 'relationship', 'celtic-cross') so that
        unlocks for different spreads sharing the same feature are distinct

  2. Notes
    - This column is nullable because some unlocks (like extra_reading) have
      no associated spread type
    - Allows per-spread tracking instead of per-feature, preventing one ad
      from unlocking multiple spreads that share the same premium feature
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rewarded_ad_unlocks' AND column_name = 'spread_type'
  ) THEN
    ALTER TABLE rewarded_ad_unlocks ADD COLUMN spread_type text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rewarded_ad_unlocks_spread_type
  ON rewarded_ad_unlocks(user_id, feature, spread_type)
  WHERE used = false;
