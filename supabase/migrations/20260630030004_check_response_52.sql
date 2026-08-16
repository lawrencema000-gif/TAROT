DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id, status_code, LEFT(content::text, 8000) AS body
    FROM net._http_response
    WHERE id >= 52
    ORDER BY id DESC
    LIMIT 5
  LOOP
    RAISE NOTICE '=== id=% status=% ===', r.id, r.status_code;
    RAISE NOTICE '%', r.body;
  END LOOP;
END $$;
