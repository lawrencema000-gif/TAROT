DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id, status_code, LEFT(content::text, 12000) AS body
    FROM net._http_response
    WHERE id = 53
    LIMIT 1
  LOOP
    RAISE NOTICE '=== id=% status=% ===', r.id, r.status_code;
    RAISE NOTICE '%', r.body;
  END LOOP;
END $$;
