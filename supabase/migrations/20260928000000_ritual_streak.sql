-- ============================================================================
-- The streak is the rituals, and a day is the user's day
-- ============================================================================
-- Three things disagreed about what profiles.streak meant:
--
--   1. The client bumped it on APP OPEN (AuthContext.fetchProfile), on the UTC
--      date: +1 if last_ritual_date was yesterday, else 1. So last_ritual_date
--      held the last OPEN, not a ritual, and the number beside the streak
--      constellation counted launches while the picture drew the nights a
--      ritual was actually completed. The two could disagree on screen.
--
--   2. That write never landed. Since 20260305100000 the BEFORE UPDATE trigger
--      protect_premium_fields reverts NEW.streak for any authenticated
--      non-admin, and a client UPDATE is exactly that. Only last_ritual_date
--      got through; the UI showed its own optimistic number until the next
--      profile fetch pulled the stored one back.
--
--   3. moonstone_award_streak_milestone() reads profiles.streak as the truth
--      and pays 7/14/30/60/100/365, while the client asked for 7/30/100/365
--      only, and only at the exact moment a ritual completed on that number.
--      14 and 60 were never claimed; a rung crossed any other way was lost.
--
-- One definition now, computed where the rows are: the streak is the number
-- of consecutive LOCAL calendar days, ending today or yesterday, on which
-- daily_rituals.completed is true. The client sends its local date (the same
-- date it writes into daily_rituals.date from now on), the server checks it is
-- within a day of the UTC date, recomputes, writes profiles.streak and
-- profiles.last_ritual_date (the last COMPLETED ritual, which is what the
-- column name says), and returns the new and previous values so the client
-- can award milestones by crossing rather than by equality.
--
-- Existing daily_rituals rows were keyed by the UTC date. A night completed
-- near UTC midnight may sit one day off once after the switch; rows are NOT
-- migrated, because nothing records which local day a UTC-keyed row meant.
--
-- The same computation lives client-side as streakFromNights() in
-- src/utils/ritualNights.ts, pinned by src/test/golden/streak.test.ts.
-- ============================================================================

-- ── 1. The protection trigger lets ritual_streak() through ─────────────────
-- Restated in full from 20260305100000 (the only later touch, 20260423000000,
-- set the search_path, which is kept). The one change: the two streak columns
-- are written when the transaction carries the ritual_streak marker. PostgREST
-- gives a client no way to set a GUC, so only server code can set it, and a
-- transaction-local setting dies with the request.
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
    NEW.total_readings := OLD.total_readings;
    NEW.total_journal_entries := OLD.total_journal_entries;
    -- The streak and its date belong to ritual_streak(). It marks its own
    -- transaction; nothing a client can send through PostgREST sets a GUC.
    IF current_setting('app.server_write', true) IS DISTINCT FROM 'on' THEN
      NEW.streak := OLD.streak;
      NEW.last_ritual_date := OLD.last_ritual_date;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 2. ritual_streak(p_today) ───────────────────────────────────────────────
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

  -- A local calendar date is at most one day from the UTC date (UTC-12 to
  -- UTC+14). Anything else is a wrong clock or a forged call.
  IF p_today IS NULL OR p_today < v_utc_today - 1 OR p_today > v_utc_today + 1 THEN
    RAISE EXCEPTION 'p_today must be within one day of the UTC date (got %, UTC today is %)',
      p_today, v_utc_today;
  END IF;

  -- The last completed ritual on or before today.
  SELECT max(d.date) INTO v_last
    FROM public.daily_rituals d
   WHERE d.user_id = v_user
     AND d.completed
     AND d.date <= p_today;

  -- A streak must reach today or yesterday; otherwise it is broken (0).
  -- Within one run of consecutive dates, (date + rank from the top) is a
  -- constant, so the length of the run ending at v_last is the number of
  -- completed rows that share v_last + 1. (user_id, date) is UNIQUE, so no
  -- date is counted twice.
  IF v_last IS NOT NULL AND v_last >= p_today - 1 THEN
    SELECT count(*)::integer INTO v_streak
      FROM (
        SELECT d.date + (row_number() OVER (ORDER BY d.date DESC))::integer AS island
          FROM public.daily_rituals d
         WHERE d.user_id = v_user
           AND d.completed
           AND d.date <= p_today
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

  -- Mark this transaction so protect_profile_premium_fields() lets the two
  -- columns through. Only write when something changed: an UPDATE that
  -- changes nothing still fires a realtime event and a profile refetch.
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

-- Name every grantee: a REVOKE that names only one role is decorative.
REVOKE ALL ON FUNCTION public.ritual_streak(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ritual_streak(date) TO authenticated;

COMMENT ON FUNCTION public.ritual_streak(date) IS
  'Recomputes the caller''s streak — consecutive local calendar days ending '
  'today or yesterday on which daily_rituals.completed is true — writes '
  'profiles.streak and profiles.last_ritual_date (the last completed ritual), '
  'and returns (streak, previous_streak, last_completed). p_today is the '
  'caller''s local date and must be within one day of the UTC date.';
