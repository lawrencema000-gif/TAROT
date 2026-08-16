DO $$
DECLARE
  v_id bigint;
  v_status integer;
  v_body text;
  v_waited integer := 0;
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
  RAISE NOTICE 'Fired request id=%, polling for response...', v_id;

  WHILE v_waited < 90000 LOOP
    SELECT status_code, content::text INTO v_status, v_body FROM net._http_response WHERE id = v_id;
    EXIT WHEN v_status IS NOT NULL;
    PERFORM pg_sleep(3);
    v_waited := v_waited + 3000;
  END LOOP;

  RAISE NOTICE 'STATUS: %', COALESCE(v_status::text, '(timeout)');
  RAISE NOTICE 'BODY: %', LEFT(COALESCE(v_body, '(none)'), 6000);
END $$;
