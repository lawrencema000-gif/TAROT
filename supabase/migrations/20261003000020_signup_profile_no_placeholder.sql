-- ============================================================================
-- Sign-up profile: no made-up birth date, no marketing opt-in nobody chose
-- ============================================================================
-- handle_new_user (20260112113637) wrote birth_date '2000-01-01' "until
-- onboarding". Every new account, email or OAuth, reached the onboarding
-- with its required "Birth date *" filled in as 01/01/2000, and a member who
-- tapped Continue was saved as a Capricorn born that day: every horoscope,
-- chart and match read it (p9 Q05). The Cosmic Birthday check read it too.
-- birth_date is nullable and every reader already treats NULL as "no birth
-- date yet": the birth_utc and birth_date_set_at triggers, the astrology
-- functions (BIRTH_DATE_MISSING), the client. The onboarding asks for the
-- date, and only its last step seals the profile, after the date is saved.
--
-- It also wrote subscribed_to_newsletter = true for every account. The email
-- sign-up overwrites it with its box (unticked by default, R6 A26); a Google
-- or Apple sign-up never sees the box and kept the opt-in, and the INSERT
-- fired on_newsletter_subscribe_send_welcome for every new account. Consent
-- is the box's to give: the email sign-up's upsert turns it on (false ->
-- true, which sends the welcome) only when the box is ticked. Existing
-- opt-ins are left as they are: resetting the ones no box gave is the
-- owner's decision, not this migration's.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = pg_catalog, public
LANGUAGE plpgsql
AS $$
DECLARE
  user_display_name text;
  user_avatar text;
BEGIN
  -- Display name from the OAuth metadata (prefer the full name).
  user_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'given_name',
    split_part(NEW.email, '@', 1)
  );

  -- Avatar URL from the OAuth metadata.
  user_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

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
    NULL,  -- the member gives it in onboarding; never made up
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC'),
    ARRAY[]::text[],
    'gentle',
    '09:00',
    true,
    false, -- onboarding collects the birth date
    false,
    false,
    0,
    1,
    0,
    0,
    'dark',
    false, -- only the sign-up box opts in
    user_avatar
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    avatar_seed = EXCLUDED.avatar_seed,
    email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

-- An insert that names no opt-in has none.
ALTER TABLE public.profiles ALTER COLUMN subscribed_to_newsletter SET DEFAULT false;

-- Rows still in onboarding that never answered: the placeholder is no date.
-- handleComplete writes the goals and the date in one update, so a row with
-- no goals has never given a date. A row with goals may hold a real
-- 2000-01-01 and is left alone; the onboarding asks for that date again.
UPDATE public.profiles
   SET birth_date = NULL
 WHERE onboarding_complete = false
   AND birth_date = DATE '2000-01-01'
   AND COALESCE(cardinality(goals), 0) = 0;
