-- ─────────────────────────────────────────────────────────────────────
-- pg_cron schedule for daily-seo-boost edge function — 2026-04-29
--
-- Daily IndexNow batch ping covering the full evergreen URL inventory
-- (home, /blog, /tarot-meanings, the 78 tarot card meaning pages, and
-- the latest 50 published blog posts). Keeps Bing/Yandex/DuckDuckGo's
-- index of those pages fresh so ranking signals re-evaluate daily.
--
-- Auth: same CRON_SECRET vault entry as daily-seo-blog. The vault entry
-- is created by 20260626000200_seo_blog_cron.sql; this migration assumes
-- it's already populated.
--
-- Schedule: 04:00 UTC daily — chosen to spread load five hours before the
-- daily-seo-blog generator runs (09:00 UTC). Two separate IndexNow batches
-- per day stay well within Bing's same-host rate limit.
-- ─────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Drop prior schedule if it exists (so re-runs of this migration update timing).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-seo-boost') THEN
    PERFORM cron.unschedule('daily-seo-boost');
  END IF;
END $$;

SELECT cron.schedule(
  'daily-seo-boost',
  '0 4 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://ulzlthhkqjuohzjangcq.supabase.co/functions/v1/daily-seo-boost',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $cron$
);
