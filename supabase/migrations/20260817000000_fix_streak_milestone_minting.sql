-- Fix: moonstone_award_streak_milestone minted Moonstones on demand.
--
-- The function took the milestone day FROM THE CALLER and validated only that
-- it was between 1 and 10,000. It never read the user's actual streak. The
-- ladder pays 25 + 50 + 100 + 200 + 500 + 2000, so any authenticated account —
-- including one created a second ago — could mint 2,875 Moonstones with six
-- calls from the browser console:
--
--   for (const d of [7,14,30,60,100,365])
--     await supabase.rpc('moonstone_award_streak_milestone', { p_streak_day: d });
--
-- At the server-authoritative spend rate that is roughly 57 free AI actions per
-- throwaway signup, each one a real inference bill. The (user_id, streak_day)
-- primary key stopped the SAME day being claimed twice, which is what made this
-- look bounded; it never bounded anything, because the six days are distinct.
--
-- The fix is to stop trusting the argument: derive the streak from the profile
-- the server already maintains and refuse to award a milestone the user has not
-- actually reached. Everything else — the ladder, the idempotency key, the
-- duplicate handling, the return shape — is unchanged, so a legitimate client
-- calling with its real streak sees exactly the behaviour it saw before.
--
-- Fails CLOSED: a missing profile awards nothing rather than defaulting to a
-- generous value.

CREATE OR REPLACE FUNCTION public.moonstone_award_streak_milestone(p_streak_day integer)
RETURNS TABLE (amount_awarded integer, is_duplicate boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_amount integer;
  v_actual_streak integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_streak_day IS NULL OR p_streak_day <= 0 OR p_streak_day > 10_000 THEN
    RAISE EXCEPTION 'Invalid streak day';
  END IF;

  -- The streak is server-maintained; the caller's claim about it is not
  -- evidence. COALESCE to 0 so a missing profile awards nothing.
  SELECT COALESCE(streak, 0) INTO v_actual_streak
  FROM public.profiles
  WHERE id = v_user;

  IF v_actual_streak IS NULL OR p_streak_day > v_actual_streak THEN
    -- Not reached. Report it the same way an unrecognised rung is reported,
    -- so a client that optimistically fires on every day-change is unaffected.
    RETURN QUERY SELECT 0::integer, false;
    RETURN;
  END IF;

  -- Milestone ladder — tweak without redeploy by keeping the mapping here.
  v_amount := CASE
    WHEN p_streak_day = 7   THEN 25
    WHEN p_streak_day = 14  THEN 50
    WHEN p_streak_day = 30  THEN 100
    WHEN p_streak_day = 60  THEN 200
    WHEN p_streak_day = 100 THEN 500
    WHEN p_streak_day = 365 THEN 2000
    ELSE 0
  END;

  IF v_amount = 0 THEN
    -- Not a milestone day; silent no-op.
    RETURN QUERY SELECT 0::integer, false;
    RETURN;
  END IF;

  -- (user_id, streak_day) is the primary key, so a repeat claim is a no-op.
  BEGIN
    INSERT INTO public.moonstone_streak_milestones (user_id, streak_day, amount)
    VALUES (v_user, p_streak_day, v_amount);
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT 0::integer, true;
    RETURN;
  END;

  INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
    VALUES (
      v_user, v_amount, 'streak',
      p_streak_day::text,
      'Day ' || p_streak_day || ' streak milestone'
    );

  RETURN QUERY SELECT v_amount, false;
END;
$$;

-- Unchanged from the original grant; restated so this migration is complete
-- on its own.
REVOKE ALL ON FUNCTION public.moonstone_award_streak_milestone(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moonstone_award_streak_milestone(integer) TO authenticated;

COMMENT ON FUNCTION public.moonstone_award_streak_milestone(integer) IS
  'Awards a streak-milestone Moonstone bonus. The milestone day is verified '
  'against the server-maintained profiles.streak — the caller''s argument is '
  'a request, not evidence. Awards 0 for a day the user has not reached.';
