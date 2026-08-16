DO $$
DECLARE v_id bigint;
BEGIN
  SELECT net.http_post(
    url := 'https://ulzlthhkqjuohzjangcq.supabase.co/functions/v1/bazi-interpret-test',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 90000
  ) INTO v_id;
  RAISE NOTICE 'Fired id=%', v_id;
END $$;
