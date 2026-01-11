/*
  # Add OAuth User Profile Auto-Creation Trigger
  
  1. Purpose
    - Automatically creates a profile entry when a new user signs up via OAuth (Google)
    - Ensures OAuth users have the same profile structure as email/password users
    
  2. New Functions
    - `handle_new_user()` - Trigger function that creates a profile when a new auth.users entry is created
    
  3. Security
    - Function runs with SECURITY DEFINER to bypass RLS for initial profile creation
    - Only creates profile if one doesn't already exist (idempotent)
    
  4. Notes
    - Extracts user email and metadata from auth.users
    - Sets sensible defaults for OAuth users
    - Uses UTC timezone by default
    - Marks user as not having completed onboarding (they'll need to fill in birth details)
*/

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert a new profile for the user
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    birth_date,
    timezone,
    goals,
    tone_preference,
    notification_time,
    notifications_enabled,
    onboarding_complete,
    is_premium,
    is_guest,
    streak,
    level,
    total_readings,
    total_journal_entries,
    theme,
    subscribed_to_newsletter
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    '2000-01-01', -- Default birth date, user will update during onboarding
    'UTC',
    ARRAY[]::text[],
    'gentle',
    '09:00',
    true,
    false, -- OAuth users need to complete onboarding
    false,
    false,
    0,
    1,
    0,
    0,
    'dark',
    true
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate inserts
  
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    DROP TRIGGER on_auth_user_created ON auth.users;
  END IF;
END $$;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;