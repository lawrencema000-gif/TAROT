/*
  # Add Onboarding Tone and Notification Time Fields

  1. Changes to profiles table
    - `tone_preference` (text) - User's preferred communication style
      - Values: 'gentle', 'direct', 'playful'
      - Default: 'gentle'
    - `notification_time` (time) - Preferred time for daily reminder
      - Default: '09:00'
    - `is_guest` (boolean) - Whether user is a guest (not signed up)
      - Default: false

  2. Security
    - No changes to RLS policies needed (existing policies cover these columns)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'tone_preference'
  ) THEN
    ALTER TABLE profiles ADD COLUMN tone_preference text DEFAULT 'gentle';
    ALTER TABLE profiles ADD CONSTRAINT profiles_tone_preference_check 
      CHECK (tone_preference = ANY (ARRAY['gentle'::text, 'direct'::text, 'playful'::text]));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'notification_time'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notification_time time DEFAULT '09:00';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_guest'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_guest boolean DEFAULT false;
  END IF;
END $$;