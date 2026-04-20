-- ============================================================================
-- Canonicalize the astrology_horoscope_cache table
-- ============================================================================
-- Why: This table was created ad-hoc by three edge functions (astrology-daily,
-- astrology-weekly, astrology-monthly) via implicit .upsert() calls. There was
-- no migration file, no explicit schema, no RLS, no TTL, no cleanup story.
-- Left unchecked it projects to ~1.1B rows / ~4-5 TB at 1M DAU × 365 days ×
-- (daily + weekly + monthly) × 4 locales.
--
-- This migration:
--   1. Creates the table idempotently with the exact shape the edge functions
--      already write (so existing ad-hoc rows survive).
--   2. Adds RLS so users only see their own cache rows.
--   3. Adds the composite unique index the upsert onConflict depends on.
--   4. Adds a nightly cleanup via pg_cron to drop rows older than 30 days —
--      cache is regenerated on demand by the edge function on cache miss.
--
-- Size projection AT 1M DAU WITH 30-DAY TTL (instead of unbounded):
--   1M users × (1 daily + 1 weekly + 1 monthly row each refresh) × 4 locales
--   active-refresh ≈ 120M rows steady-state — ~1 order of magnitude smaller.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.astrology_horoscope_cache (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- `date` meaning varies by `type`:
  --   type='daily'     → calendar date     (YYYY-MM-DD)
  --   type='weekly:*'  → ISO week Monday   (YYYY-MM-DD)
  --   type='monthly:*' → first of month    (YYYY-MM-01)
  date        date        NOT NULL,
  -- `type` embeds the locale after a colon for non-English cache:
  --   'daily', 'daily:ja', 'daily:ko', 'daily:zh'
  --   'weekly', 'weekly:ja', ...
  --   'monthly', 'monthly:ja', ...
  type        text        NOT NULL,
  content_json jsonb      NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date, type)
);

-- Supporting index for the nightly cleanup DELETE.
CREATE INDEX IF NOT EXISTS astrology_horoscope_cache_generated_at_idx
  ON public.astrology_horoscope_cache (generated_at);

-- RLS: users read/write only their own cache rows. Edge functions use the
-- service role key so they bypass RLS automatically.
ALTER TABLE public.astrology_horoscope_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own cache" ON public.astrology_horoscope_cache;
CREATE POLICY "Users can view own cache"
  ON public.astrology_horoscope_cache FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own cache" ON public.astrology_horoscope_cache;
CREATE POLICY "Users can insert own cache"
  ON public.astrology_horoscope_cache FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own cache" ON public.astrology_horoscope_cache;
CREATE POLICY "Users can update own cache"
  ON public.astrology_horoscope_cache FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own cache" ON public.astrology_horoscope_cache;
CREATE POLICY "Users can delete own cache"
  ON public.astrology_horoscope_cache FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- TTL cleanup: drop rows > 30 days old every day at 03:15 UTC
-- ============================================================================
-- Uses pg_cron. Enable extension if not already on.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Idempotent: unschedule if a previous job with the same name exists.
DO $$
DECLARE
  jobid bigint;
BEGIN
  SELECT j.jobid INTO jobid FROM cron.job j WHERE j.jobname = 'astrology-cache-cleanup';
  IF jobid IS NOT NULL THEN
    PERFORM cron.unschedule(jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'astrology-cache-cleanup',
  '15 3 * * *',
  $$ DELETE FROM public.astrology_horoscope_cache
     WHERE generated_at < now() - interval '30 days' $$
);

-- Table + column comments so future devs understand intent.
COMMENT ON TABLE  public.astrology_horoscope_cache IS
  'Per-user cache for astrology-{daily,weekly,monthly} edge functions. TTL 30 days via pg_cron.';
COMMENT ON COLUMN public.astrology_horoscope_cache.type IS
  'One of daily, weekly, monthly — optionally suffixed ":<locale>" for ja/ko/zh cache variants.';
COMMENT ON COLUMN public.astrology_horoscope_cache.content_json IS
  'Full response body returned to the client — shape depends on type.';
