/*
  # Add Ad-Free Column to Profiles

  1. Changes
    - Adds `is_ad_free` boolean column to `profiles` table
    - Default value is `false`
    - This column tracks users who have purchased the ad removal only option
    - Separate from `is_premium` which grants full premium features

  2. Notes
    - Users with `is_ad_free = true` will not see ads but won't have premium features
    - Users with `is_premium = true` automatically get ad-free experience + all premium features
    - The app checks both flags to determine if ads should be shown
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_ad_free'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_ad_free boolean DEFAULT false NOT NULL;
  END IF;
END $$;
