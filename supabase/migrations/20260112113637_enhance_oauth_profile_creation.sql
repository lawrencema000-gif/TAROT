/*
  # Enhance OAuth User Profile Creation

  1. Purpose
    - Improves OAuth user profile creation with better Google data extraction
    - Adds support for profile pictures from Google accounts
    - Enhances display name extraction to prefer full name over email

  2. Changes
    - Updates handle_new_user() function to extract avatar URL from Google profile
    - Improves display name logic to use full_name, name, or given_name from Google
    - Sets better defaults for OAuth users

  3. Security
    - Maintains SECURITY DEFINER for profile creation
    - Preserves existing RLS policies

  4. Notes
    - OAuth users start with onboarding_complete = false to collect birth data
    - Profile pictures from Google are stored in avatar_seed field as URL
    - Backwards compatible with existing profiles
*/

-- Update function to handle new user creation with enhanced OAuth support
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_display_name text;
  user_avatar text;
BEGIN
  -- Extract display name from Google metadata (prefer full name)
  user_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'given_name',
    split_part(NEW.email, '@', 1)
  );

  -- Extract avatar URL from Google metadata
  user_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

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
    subscribed_to_newsletter,
    avatar_seed
  )
  VALUES (
    NEW.id,
    NEW.email,
    user_display_name,
    '2000-01-01', -- Default birth date, user will update during onboarding
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC'),
    ARRAY[]::text[],
    'gentle',
    '09:00',
    true,
    false, -- OAuth users need to complete onboarding to provide birth date
    false,
    false,
    0,
    1,
    0,
    0,
    'dark',
    true,
    user_avatar -- Store Google profile picture URL
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    avatar_seed = EXCLUDED.avatar_seed,
    email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
