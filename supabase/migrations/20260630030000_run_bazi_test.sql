-- One-shot harness call. Fires bazi-interpret-test once and surfaces
-- the response in the migration logs. Migration is idempotent / safe
-- to re-run; doesn't change schema. Will be deleted after verification.

DO $$
DECLARE
  v_request_id bigint;
  v_response_status integer;
  v_response_body text;
  v_max_wait_ms integer := 60000;  -- 60s timeout (Gemini takes ~10s)
  v_waited_ms integer := 0;
BEGIN
  SELECT net.http_post(
    url := 'https://ulzlthhkqjuohzjangcq.supabase.co/functions/v1/bazi-interpret-test',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) INTO v_request_id;

  -- Poll for response
  WHILE v_waited_ms < v_max_wait_ms LOOP
    SELECT status_code, content INTO v_response_status, v_response_body
    FROM net._http_response WHERE id = v_request_id;
    EXIT WHEN v_response_status IS NOT NULL;
    PERFORM pg_sleep(2);
    v_waited_ms := v_waited_ms + 2000;
  END LOOP;

  RAISE NOTICE 'BAZI_TEST_STATUS: %', v_response_status;
  RAISE NOTICE 'BAZI_TEST_BODY: %', LEFT(COALESCE(v_response_body, '(no response)'), 4000);
END $$;
