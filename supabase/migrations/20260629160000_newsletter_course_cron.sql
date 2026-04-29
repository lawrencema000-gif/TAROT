-- ─────────────────────────────────────────────────────────────────────
-- pg_cron schedule for send-newsletter-course — 2026-04-29
--
-- Hourly cron. Picks up rows eligible for next lesson and dispatches
-- via Resend (no-ops gracefully without RESEND_API_KEY). 50-email cap
-- per run = up to 1,200/day, plenty of headroom.
-- ─────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-newsletter-course') THEN
    PERFORM cron.unschedule('send-newsletter-course');
  END IF;
END $$;

SELECT cron.schedule(
  'send-newsletter-course',
  '0 * * * *',  -- top of every hour
  $cron$
  SELECT net.http_post(
    url := 'https://ulzlthhkqjuohzjangcq.supabase.co/functions/v1/send-newsletter-course',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $cron$
);
