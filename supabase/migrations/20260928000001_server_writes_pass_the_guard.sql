/*
  # Server writes pass the profile guard (level, reading and journal counts)

  20260305100000 made protect_profile_premium_fields() revert level, streak,
  total_readings and total_journal_entries on any UPDATE where auth.uid() is
  set. auth.uid() is set inside a SECURITY DEFINER function called with a user
  JWT too, so the guard has been reverting the app's own server writes:

    - award_xp() computed a new level and returned level_up = true, then the
      trigger put the stored level back. Every user has been stuck at the
      level they held in March while their XP kept growing.
    - Nothing has ever written total_readings or total_journal_entries at all
      (no server function and, since March, no client write that survives),
      so the paywall's continuity line and the achievements stats read zeros.

  20260928000000 introduced a transaction-local marker, app.server_write, that
  the guard honours for streak and last_ritual_date. This migration:

    1. Lets the marker through for level, total_readings and
       total_journal_entries as well (is_premium / is_ad_free stay guarded:
       entitlements are written by webhooks running as service_role, where
       auth.uid() is null and the guard never applies).
    2. Re-creates award_xp() verbatim from 20260404000000 with the marker set
       around its profile UPDATE.
    3. Maintains the two counters from the tables themselves: AFTER
       INSERT/DELETE triggers on tarot_readings and journal_entries, SECURITY
       DEFINER, marker set; and a one-time backfill from the live counts.

  PostgREST exposes no way for a client to set a GUC, so the marker cannot be
  forged from outside a server function.
*/

-- ── 1. The guard honours the marker for every server-managed count ─────────
CREATE OR REPLACE FUNCTION public.protect_profile_premium_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Service role, webhooks, triggers fired without a user: pass.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_admin() THEN
    -- Entitlements: never from a user session.
    NEW.is_premium := OLD.is_premium;
    NEW.is_ad_free := OLD.is_ad_free;

    -- Gamification and the counts: only the app's own server functions,
    -- which mark their transaction. A client UPDATE through PostgREST
    -- cannot set the marker.
    IF current_setting('app.server_write', true) IS DISTINCT FROM 'on' THEN
      NEW.level := OLD.level;
      NEW.streak := OLD.streak;
      NEW.last_ritual_date := OLD.last_ritual_date;
      NEW.total_readings := OLD.total_readings;
      NEW.total_journal_entries := OLD.total_journal_entries;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 2. award_xp: the stored level moves again ───────────────────────────────
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id uuid,
  p_activity_type text,
  p_xp_amount int
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_new_xp int;
  v_old_level int;
  v_new_level int;
  v_seeker_rank text;
  v_level_up boolean := false;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;

  v_old_level := COALESCE(v_profile.level, 1);
  v_new_xp := COALESCE(v_profile.xp, 0) + p_xp_amount;

  SELECT COALESCE(MAX(level), v_old_level) INTO v_new_level
  FROM level_thresholds
  WHERE xp_required <= v_new_xp;

  v_level_up := v_new_level > v_old_level;

  SELECT COALESCE(rank_name, 'Novice Seeker') INTO v_seeker_rank
  FROM seeker_ranks
  WHERE v_new_level BETWEEN min_level AND max_level
  LIMIT 1;

  PERFORM set_config('app.server_write', 'on', true);
  UPDATE profiles
  SET xp = v_new_xp, level = v_new_level, seeker_rank = v_seeker_rank, updated_at = now()
  WHERE id = p_user_id;
  PERFORM set_config('app.server_write', 'off', true);

  INSERT INTO xp_activities (user_id, activity_type, xp_earned, created_at)
  VALUES (p_user_id, p_activity_type, p_xp_amount, now());

  RETURN jsonb_build_object(
    'xp_earned', p_xp_amount,
    'total_xp', v_new_xp,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'level_up', v_level_up,
    'seeker_rank', v_seeker_rank
  );
END;
$$;

-- ── 3. The counts come from the tables ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_profile_reading_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user uuid := COALESCE(NEW.user_id, OLD.user_id);
BEGIN
  PERFORM set_config('app.server_write', 'on', true);
  UPDATE public.profiles p
     SET total_readings = (SELECT count(*) FROM public.tarot_readings r WHERE r.user_id = v_user)
   WHERE p.id = v_user;
  PERFORM set_config('app.server_write', 'off', true);
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_journal_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user uuid := COALESCE(NEW.user_id, OLD.user_id);
BEGIN
  PERFORM set_config('app.server_write', 'on', true);
  UPDATE public.profiles p
     SET total_journal_entries = (SELECT count(*) FROM public.journal_entries j WHERE j.user_id = v_user)
   WHERE p.id = v_user;
  PERFORM set_config('app.server_write', 'off', true);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tarot_readings_count_profile ON public.tarot_readings;
CREATE TRIGGER tarot_readings_count_profile
  AFTER INSERT OR DELETE ON public.tarot_readings
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_reading_count();

DROP TRIGGER IF EXISTS journal_entries_count_profile ON public.journal_entries;
CREATE TRIGGER journal_entries_count_profile
  AFTER INSERT OR DELETE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_journal_count();

-- Trigger functions are not callable from the API.
REVOKE ALL ON FUNCTION public.sync_profile_reading_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_journal_count() FROM PUBLIC, anon, authenticated;

-- One-time backfill from the live counts. The migration runs without a user
-- session, so the guard passes without the marker.
UPDATE public.profiles p
   SET total_readings = COALESCE(c.n, 0)
  FROM (SELECT user_id, count(*) AS n FROM public.tarot_readings GROUP BY user_id) c
 WHERE c.user_id = p.id
   AND p.total_readings IS DISTINCT FROM COALESCE(c.n, 0);

UPDATE public.profiles p
   SET total_journal_entries = COALESCE(c.n, 0)
  FROM (SELECT user_id, count(*) AS n FROM public.journal_entries GROUP BY user_id) c
 WHERE c.user_id = p.id
   AND p.total_journal_entries IS DISTINCT FROM COALESCE(c.n, 0);

COMMENT ON FUNCTION public.protect_profile_premium_fields() IS
  'Guards server-managed profile columns against user-session writes. '
  'Entitlements (is_premium, is_ad_free) are never writable from a session; '
  'level, streak, last_ritual_date, total_readings and total_journal_entries '
  'are writable only inside a server function that sets the transaction-local '
  'marker app.server_write = on.';
