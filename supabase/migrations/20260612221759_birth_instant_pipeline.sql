-- ============================================================================
-- Canonical birth-instant pipeline (Sprint B)
-- ============================================================================
-- Root cause being fixed (cross-cutting theme #2 from the correctness
-- audit): FIVE independent code paths treated the user's LOCAL birth
-- time as UTC — astrocartography lines, solar returns, progressions,
-- and assorted client math were all off by the birth-place UTC offset
-- (135° of longitude for a Japan birth).
--
-- The fix: ONE canonical `birth_utc` per user, computed in the database
-- (Postgres' tzdata handles historical DST correctly) and consumed by
-- every chart surface.
--
--   birth_tz   — IANA zone of the BIRTH PLACE. Set by the client when a
--                geocoded birthplace (lat/lon) is available; falls back
--                to the profile's device timezone, then UTC.
--   birth_utc  — timestamptz: the actual instant of birth. Maintained
--                by trigger whenever birth_date / birth_time / birth_tz
--                / timezone change. Missing birth_time → noon local
--                (documented, and the UI now says so honestly).
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_tz text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_utc timestamptz;

COMMENT ON COLUMN public.profiles.birth_tz IS
  'IANA timezone of the BIRTH PLACE (e.g. Asia/Tokyo). Preferred source for birth_utc; falls back to profiles.timezone (device tz), then UTC.';
COMMENT ON COLUMN public.profiles.birth_utc IS
  'Canonical UTC instant of birth, derived by trigger from birth_date + birth_time (noon default) interpreted in birth_tz/timezone. Read this; do not recompute locally.';

CREATE OR REPLACE FUNCTION public.profiles_compute_birth_utc()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_tz text;
BEGIN
  IF NEW.birth_date IS NULL THEN
    NEW.birth_utc := NULL;
    RETURN NEW;
  END IF;

  -- Timezone fallback chain: explicit birth-place tz → device tz → UTC.
  v_tz := COALESCE(NULLIF(NEW.birth_tz, ''), NULLIF(NEW.timezone, ''), 'UTC');

  -- Validate the zone name — a garbage tz must not abort profile writes.
  BEGIN
    PERFORM now() AT TIME ZONE v_tz;
  EXCEPTION WHEN OTHERS THEN
    v_tz := 'UTC';
  END;

  -- (date + time) is a LOCAL wall-clock timestamp; AT TIME ZONE
  -- interprets it in v_tz and yields the UTC instant. Postgres' tzdata
  -- applies the historically-correct offset incl. DST for the birth year.
  NEW.birth_utc :=
    (NEW.birth_date + COALESCE(NEW.birth_time, '12:00'::time)) AT TIME ZONE v_tz;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_birth_utc_trigger ON public.profiles;
CREATE TRIGGER profiles_birth_utc_trigger
  BEFORE INSERT OR UPDATE OF birth_date, birth_time, birth_tz, timezone
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_compute_birth_utc();

-- Backfill: a no-op self-assignment fires the trigger for every existing
-- profile with birth data. Their best-available tz today is the device
-- timezone (most users live near where they were born; the client will
-- upgrade birth_tz from geocoded coordinates as users touch their birth
-- place going forward).
UPDATE public.profiles
  SET birth_tz = birth_tz
  WHERE birth_date IS NOT NULL;
