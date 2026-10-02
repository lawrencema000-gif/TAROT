/*
  # Ritual rows are dated by the server

  ritual_streak() (20260928000000) derives profiles.streak from daily_rituals,
  and moonstone_award_streak_milestone() trusts profiles.streak. The rows
  themselves were client-authored end to end: the INSERT/UPDATE policies
  check only user_id, and `date` and `completed` were free. One bulk INSERT
  of 365 back-dated completed rows, one ritual_streak() call and six
  milestone calls would have minted 2,875 Moonstones per throwaway account.

  Three things close that:

    1. A BEFORE INSERT OR UPDATE trigger on daily_rituals. For a user session
       a new row's `date` must be within one day of the UTC date (the same
       window ritual_streak() enforces on p_today; a local calendar date is
       never further from UTC than that), `created_at` is the server clock,
       and an UPDATE cannot move a row to another day or another user.
    2. ritual_streak() counts only rows whose server-set created_at lies
       within a day of their `date`, so rows inserted before this trigger
       existed cannot be back-dated either.
    3. The two profile-count triggers from 20260928000001 become
       statement-level (one recount per user per statement) so deleting an
       account with many readings does not update the profile once per row.
*/

-- ── 1. The guard on daily_rituals ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_daily_rituals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_utc_today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  -- Service role, backfills, admins: pass.
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.date IS NULL OR NEW.date < v_utc_today - 1 OR NEW.date > v_utc_today + 1 THEN
      RAISE EXCEPTION 'daily_rituals.date must be within one day of the UTC date (got %, UTC today is %)',
        NEW.date, v_utc_today
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.created_at := now();
    RETURN NEW;
  END IF;

  -- UPDATE: a row stays on its day and with its owner; the clock is not the
  -- client's to set.
  NEW.date := OLD.date;
  NEW.user_id := OLD.user_id;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS daily_rituals_guard ON public.daily_rituals;
CREATE TRIGGER daily_rituals_guard
  BEFORE INSERT OR UPDATE ON public.daily_rituals
  FOR EACH ROW EXECUTE FUNCTION public.guard_daily_rituals();

REVOKE ALL ON FUNCTION public.guard_daily_rituals() FROM PUBLIC, anon, authenticated;

-- ── 2. ritual_streak() counts only rows the server dated ───────────────────
CREATE OR REPLACE FUNCTION public.ritual_streak(p_today date)
RETURNS TABLE (streak integer, previous_streak integer, last_completed date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user      uuid := auth.uid();
  v_utc_today date := (now() AT TIME ZONE 'UTC')::date;
  v_last      date;
  v_streak    integer := 0;
  v_previous  integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_today IS NULL OR p_today < v_utc_today - 1 OR p_today > v_utc_today + 1 THEN
    RAISE EXCEPTION 'p_today must be within one day of the UTC date (got %, UTC today is %)',
      p_today, v_utc_today;
  END IF;

  -- A row counts only if the server's clock agrees with its date: created_at
  -- is set by the guard trigger (and by the column default before it), so a
  -- row written today with a date from last year is not a ritual.
  SELECT max(d.date) INTO v_last
    FROM public.daily_rituals d
   WHERE d.user_id = v_user
     AND d.completed
     AND d.date <= p_today
     AND (d.created_at AT TIME ZONE 'UTC')::date BETWEEN d.date - 1 AND d.date + 1;

  IF v_last IS NOT NULL AND v_last >= p_today - 1 THEN
    SELECT count(*)::integer INTO v_streak
      FROM (
        SELECT d.date + (row_number() OVER (ORDER BY d.date DESC))::integer AS island
          FROM public.daily_rituals d
         WHERE d.user_id = v_user
           AND d.completed
           AND d.date <= p_today
           AND (d.created_at AT TIME ZONE 'UTC')::date BETWEEN d.date - 1 AND d.date + 1
      ) runs
     WHERE runs.island = v_last + 1;
  END IF;

  SELECT COALESCE(p.streak, 0) INTO v_previous
    FROM public.profiles p
   WHERE p.id = v_user
     FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  PERFORM set_config('app.server_write', 'on', true);
  UPDATE public.profiles p
     SET streak = v_streak,
         last_ritual_date = v_last
   WHERE p.id = v_user
     AND (p.streak IS DISTINCT FROM v_streak OR p.last_ritual_date IS DISTINCT FROM v_last);
  PERFORM set_config('app.server_write', 'off', true);

  RETURN QUERY SELECT v_streak, v_previous, v_last;
END;
$$;

REVOKE ALL ON FUNCTION public.ritual_streak(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ritual_streak(date) TO authenticated;

-- ── 3. Profile counts: once per user per statement ──────────────────────────
DROP TRIGGER IF EXISTS tarot_readings_count_profile ON public.tarot_readings;
DROP TRIGGER IF EXISTS journal_entries_count_profile ON public.journal_entries;
DROP FUNCTION IF EXISTS public.sync_profile_reading_count();
DROP FUNCTION IF EXISTS public.sync_profile_journal_count();

CREATE OR REPLACE FUNCTION public.sync_profile_reading_count_ins()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM set_config('app.server_write', 'on', true);
  UPDATE public.profiles p
     SET total_readings = (SELECT count(*) FROM public.tarot_readings r WHERE r.user_id = p.id)
   WHERE p.id IN (SELECT DISTINCT user_id FROM ins);
  PERFORM set_config('app.server_write', 'off', true);
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_reading_count_del()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM set_config('app.server_write', 'on', true);
  UPDATE public.profiles p
     SET total_readings = (SELECT count(*) FROM public.tarot_readings r WHERE r.user_id = p.id)
   WHERE p.id IN (SELECT DISTINCT user_id FROM del);
  PERFORM set_config('app.server_write', 'off', true);
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_journal_count_ins()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM set_config('app.server_write', 'on', true);
  UPDATE public.profiles p
     SET total_journal_entries = (SELECT count(*) FROM public.journal_entries j WHERE j.user_id = p.id)
   WHERE p.id IN (SELECT DISTINCT user_id FROM ins);
  PERFORM set_config('app.server_write', 'off', true);
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_journal_count_del()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM set_config('app.server_write', 'on', true);
  UPDATE public.profiles p
     SET total_journal_entries = (SELECT count(*) FROM public.journal_entries j WHERE j.user_id = p.id)
   WHERE p.id IN (SELECT DISTINCT user_id FROM del);
  PERFORM set_config('app.server_write', 'off', true);
  RETURN NULL;
END;
$$;

CREATE TRIGGER tarot_readings_count_profile_ins
  AFTER INSERT ON public.tarot_readings
  REFERENCING NEW TABLE AS ins
  FOR EACH STATEMENT EXECUTE FUNCTION public.sync_profile_reading_count_ins();
CREATE TRIGGER tarot_readings_count_profile_del
  AFTER DELETE ON public.tarot_readings
  REFERENCING OLD TABLE AS del
  FOR EACH STATEMENT EXECUTE FUNCTION public.sync_profile_reading_count_del();
CREATE TRIGGER journal_entries_count_profile_ins
  AFTER INSERT ON public.journal_entries
  REFERENCING NEW TABLE AS ins
  FOR EACH STATEMENT EXECUTE FUNCTION public.sync_profile_journal_count_ins();
CREATE TRIGGER journal_entries_count_profile_del
  AFTER DELETE ON public.journal_entries
  REFERENCING OLD TABLE AS del
  FOR EACH STATEMENT EXECUTE FUNCTION public.sync_profile_journal_count_del();

REVOKE ALL ON FUNCTION public.sync_profile_reading_count_ins() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_reading_count_del() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_journal_count_ins() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_journal_count_del() FROM PUBLIC, anon, authenticated;
