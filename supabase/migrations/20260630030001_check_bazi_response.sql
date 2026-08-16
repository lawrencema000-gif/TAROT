-- Check pg_net response queue for the recent bazi-interpret-test call.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id, status_code, LEFT(content, 6000) AS body, created
    FROM net._http_response
    WHERE created > now() - interval '10 minutes'
    ORDER BY id DESC
    LIMIT 5
  LOOP
    RAISE NOTICE '-- RESPONSE id=% status=% created=% --', r.id, r.status_code, r.created;
    RAISE NOTICE 'BODY: %', r.body;
  END LOOP;
END $$;
