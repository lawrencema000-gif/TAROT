-- ============================================================================
-- pg_cron schedule for daily SEO/GEO blog generator — 2026-04-26
-- ============================================================================
-- Fires the `daily-seo-blog-generator` edge function once per day at 09:00
-- UTC (which is mid-day Europe, dawn Asia, late evening US — a reasonable
-- compromise that puts a fresh post live before any major-market workday
-- starts).
--
-- Auth: the cron job sends the CRON_SECRET in the Authorization header
-- (Bearer) AND in the `x-webhook-secret` header. The handler accepts
-- either via its `auth: "webhook"` mode.
--
-- Manual fire (for testing or manual catch-up):
--   select net.http_post(
--     url := 'https://ulzlthhkqjuohzjangcq.supabase.co/functions/v1/daily-seo-blog-generator',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-webhook-secret', current_setting('app.cron_secret', true)
--     ),
--     body := '{}'::jsonb
--   );
--
-- Setup: requires `pg_cron` and `pg_net` extensions enabled (Supabase has
-- both pre-enabled on Pro+ plans). The CRON_SECRET must be set as a
-- database GUC OR via Supabase Vault — we use the simpler GUC approach
-- via `supabase secrets set CRON_SECRET=...`.
-- ============================================================================

-- Ensure required extensions (Supabase usually pre-enables; idempotent here).
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

-- Initialise a Vault secret slot for CRON_SECRET if missing. The actual
-- value is set OUT-OF-BAND (not in this migration file — secrets must
-- never be committed). After running this migration, set the real value
-- via:
--
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'cron_secret'),
--     '<your-random-32+ char secret>'
--   );
--
-- AND set the same value in the edge function env:
--
--   supabase secrets set CRON_SECRET=<same-value>
--
-- Both must match for the cron to authenticate against the function.
DO $vault_init$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'cron_secret') THEN
    PERFORM vault.create_secret(
      'PLACEHOLDER_REPLACE_ME',
      'cron_secret',
      'Auth token for daily-seo-blog-generator pg_cron job'
    );
  END IF;
EXCEPTION
  WHEN insufficient_privilege OR undefined_table THEN
    RAISE NOTICE 'Vault not available; ensure CRON_SECRET is supplied another way.';
END $vault_init$;

-- Drop prior schedule if it exists (so re-runs of this migration update timing).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-seo-blog') THEN
    PERFORM cron.unschedule('daily-seo-blog');
  END IF;
END $$;

-- Schedule: every day at 09:00 UTC.
-- The cron syntax is `min hour day month dow` — same as standard cron.
SELECT cron.schedule(
  'daily-seo-blog',
  '0 9 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://ulzlthhkqjuohzjangcq.supabase.co/functions/v1/daily-seo-blog-generator',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) AS request_id;
  $cron$
);

-- Also schedule a weekly health check that pings the queue size and warns
-- (via Postgres NOTICE — Supabase logs surface these) if we have <14 days
-- of unused topics left.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'seo-blog-queue-watch') THEN
    PERFORM cron.unschedule('seo-blog-queue-watch');
  END IF;
END $$;

SELECT cron.schedule(
  'seo-blog-queue-watch',
  '0 9 * * 0', -- Sunday 09:00 UTC
  $cron$
  DO $watch$
  DECLARE v_remaining int;
  BEGIN
    SELECT count(*) INTO v_remaining FROM public.seo_blog_topics WHERE used_at IS NULL;
    IF v_remaining < 14 THEN
      RAISE WARNING 'seo-blog-queue: only % unused topics remaining — top up seo_blog_topics', v_remaining;
    END IF;
  END $watch$;
  $cron$
);

DO $$ BEGIN
  RAISE NOTICE 'seo-blog-cron: daily 09:00 UTC + weekly queue-watch scheduled.';
END $$;
