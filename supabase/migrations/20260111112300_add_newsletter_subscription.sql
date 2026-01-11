/*
  # Add Newsletter Subscription Column

  1. Changes to profiles table
    - `subscribed_to_newsletter` (boolean, default true) - Whether user wants marketing emails
    - `newsletter_subscribed_at` (timestamptz) - When they subscribed

  2. Notes
    - Default is true since checkbox will be auto-checked during signup
    - Only non-guest users with valid emails should receive newsletters
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscribed_to_newsletter'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscribed_to_newsletter boolean DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'newsletter_subscribed_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN newsletter_subscribed_at timestamptz;
  END IF;
END $$;