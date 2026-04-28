-- ─────────────────────────────────────────────────────────────────────
-- pg_cron schedules for daily SEO snapshot + email digest pipeline
-- — 2026-04-29
--
-- Daily cadence (all UTC):
--   04:00  daily-seo-boost            (already scheduled — IndexNow batch)
--   08:00  daily-geo-mentions         (queries AI engines for ~20 queries)
--   08:30  daily-seo-snapshot         (pulls GSC API, lag-aware date)
--   09:00  daily-seo-blog-generator   (already scheduled — new blog post)
--   09:15  daily-backlinks-snapshot   (Bing Webmaster Tools)
--   09:30  daily-seo-digest           (emails summary to admin)
--
-- All four new jobs use the existing `cron_secret` vault entry created
-- by 20260626000200_seo_blog_cron.sql.
-- ─────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Drop prior schedules if they exist
DO $$
DECLARE
  jobs text[] := ARRAY['daily-geo-mentions', 'daily-seo-snapshot', 'daily-backlinks-snapshot', 'daily-seo-digest'];
  j text;
BEGIN
  FOREACH j IN ARRAY jobs LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = j) THEN
      PERFORM cron.unschedule(j);
    END IF;
  END LOOP;
END $$;

-- Schedule daily-geo-mentions (08:00 UTC)
SELECT cron.schedule(
  'daily-geo-mentions',
  '0 8 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://ulzlthhkqjuohzjangcq.supabase.co/functions/v1/daily-geo-mentions',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  ) AS request_id;
  $cron$
);

-- Schedule daily-seo-snapshot (08:30 UTC)
SELECT cron.schedule(
  'daily-seo-snapshot',
  '30 8 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://ulzlthhkqjuohzjangcq.supabase.co/functions/v1/daily-seo-snapshot',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $cron$
);

-- Schedule daily-backlinks-snapshot (09:15 UTC)
SELECT cron.schedule(
  'daily-backlinks-snapshot',
  '15 9 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://ulzlthhkqjuohzjangcq.supabase.co/functions/v1/daily-backlinks-snapshot',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $cron$
);

-- Schedule daily-seo-digest (09:30 UTC)
SELECT cron.schedule(
  'daily-seo-digest',
  '30 9 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://ulzlthhkqjuohzjangcq.supabase.co/functions/v1/daily-seo-digest',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $cron$
);
