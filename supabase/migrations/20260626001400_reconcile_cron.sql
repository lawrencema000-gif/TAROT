-- ============================================================================
-- Schedule the daily premium-reconcile cron — 2026-04-26
-- ============================================================================
-- Fires the `reconcile-premium-status` edge function once per day at 04:00
-- UTC (off-peak, after most overnight Stripe webhook processing has
-- settled). Catches drift where a paying user has profiles.is_premium=
-- false because a webhook missed.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reconcile-premium') THEN
    PERFORM cron.unschedule('reconcile-premium');
  END IF;
END $$;

SELECT cron.schedule(
  'reconcile-premium',
  '0 4 * * *', -- daily 04:00 UTC
  $cron$
  SELECT net.http_post(
    url := 'https://ulzlthhkqjuohzjangcq.supabase.co/functions/v1/reconcile-premium-status',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  ) AS request_id;
  $cron$
);

DO $$ BEGIN
  RAISE NOTICE 'reconcile-premium: scheduled daily 04:00 UTC.';
END $$;
