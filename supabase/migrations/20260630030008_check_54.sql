DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT id, status_code, LEFT(content::text, 12000) AS body
    FROM net._http_response
    WHERE id = 54
  LOOP
    RAISE NOTICE '=== status=% ===', r.status_code;
    RAISE NOTICE '%', r.body;
  END LOOP;
END $$;
