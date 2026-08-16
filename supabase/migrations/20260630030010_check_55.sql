DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT id, status_code, LEFT(content::text, 16000) AS body
    FROM net._http_response
    WHERE id = 55
  LOOP
    RAISE NOTICE '=== status=% ===', r.status_code;
    RAISE NOTICE '%', r.body;
  END LOOP;
END $$;
