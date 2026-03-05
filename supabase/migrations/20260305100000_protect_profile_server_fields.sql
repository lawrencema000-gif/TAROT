/*
  # Expand profile field protection (BUG-06)

  Extends the existing premium field trigger to also protect
  server-managed gamification fields: level, streak,
  total_readings, total_journal_entries.

  These should only be modified by server-side triggers/functions,
  never by client-side upserts.
*/

-- Replace the UPDATE trigger to protect all server-managed fields
CREATE OR REPLACE FUNCTION public.protect_profile_premium_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Allow service_role / server-side calls (webhooks, triggers)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Non-admin users cannot modify protected fields
  IF NOT public.is_admin() THEN
    NEW.is_premium := OLD.is_premium;
    NEW.is_ad_free := OLD.is_ad_free;
    NEW.level := OLD.level;
    NEW.streak := OLD.streak;
    NEW.total_readings := OLD.total_readings;
    NEW.total_journal_entries := OLD.total_journal_entries;
  END IF;

  RETURN NEW;
END;
$$;

-- Replace the INSERT trigger to protect all server-managed fields
CREATE OR REPLACE FUNCTION public.protect_profile_premium_fields_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Allow service_role / server-side calls
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Non-admin users get safe defaults
  IF NOT public.is_admin() THEN
    NEW.is_premium := false;
    NEW.is_ad_free := false;
    NEW.level := COALESCE(NEW.level, 1);
    NEW.streak := 0;
    NEW.total_readings := 0;
    NEW.total_journal_entries := 0;
  END IF;

  RETURN NEW;
END;
$$;
