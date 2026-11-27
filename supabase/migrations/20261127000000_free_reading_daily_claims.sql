-- p12 tarot-09 / D08 A (WP-P0-12). The paywall promises three free readings a
-- day per account, tarot and playing cards together; the count lived only on
-- the device. Each free deal now claims one here first. One row per member per
-- LOCAL day (the date the device names, within a day of the UTC date, as
-- ritual_streak() accepts), holding a count and nothing else. Members read
-- their own row; only claim_free_reading writes. Rows go two days later.
CREATE TABLE IF NOT EXISTS public.free_reading_claims (
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reading_date date        NOT NULL,
  used         integer     NOT NULL DEFAULT 0 CHECK (used >= 0),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, reading_date)
);
ALTER TABLE public.free_reading_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS free_reading_claims_select_own ON public.free_reading_claims;
CREATE POLICY free_reading_claims_select_own ON public.free_reading_claims
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
REVOKE ALL ON public.free_reading_claims FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.free_reading_claims TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_free_reading(p_local_date date)
RETURNS TABLE (allowed boolean, used_today integer, daily_limit integer, premium boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user      uuid := auth.uid();
  v_utc_today date := (now() AT TIME ZONE 'UTC')::date;
  -- FREE_TIER.dailyReadings (src/services/premium.ts); freeReadingClaims.test.ts holds them equal.
  v_limit     constant integer := 3;
  v_used      integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_local_date IS NULL OR p_local_date < v_utc_today - 1 OR p_local_date > v_utc_today + 1 THEN
    RAISE EXCEPTION 'p_local_date must be within one day of the UTC date (got %, UTC today is %)', p_local_date, v_utc_today;
  END IF;
  -- Premium has no daily limit and is not counted.
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_user AND COALESCE(p.is_premium, false)) THEN
    RETURN QUERY SELECT true, 0, v_limit, true;
    RETURN;
  END IF;
  -- One statement claims atomically: the day's first claim inserts 1, a later
  -- one adds 1 only while the count is under the limit. The row lock
  -- serialises concurrent claims: ten at once give exactly three.
  INSERT INTO public.free_reading_claims AS c (user_id, reading_date, used, updated_at)
  VALUES (v_user, p_local_date, 1, now())
  ON CONFLICT (user_id, reading_date) DO UPDATE
     SET used = c.used + 1, updated_at = now()
   WHERE c.used < v_limit
  RETURNING c.used INTO v_used;
  IF v_used IS NULL THEN
    -- The day's allowance is spent; nothing was counted.
    RETURN QUERY SELECT false, v_limit, v_limit, false;
    RETURN;
  END IF;
  RETURN QUERY SELECT true, v_used, v_limit, false;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_free_reading(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_free_reading(date) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'free-reading-claims-prune') THEN
    PERFORM cron.unschedule('free-reading-claims-prune');
  END IF;
END $$;
SELECT cron.schedule(
  'free-reading-claims-prune',
  '23 3 * * *',
  $$DELETE FROM public.free_reading_claims WHERE reading_date < (now() AT TIME ZONE 'UTC')::date - 2;$$
);
