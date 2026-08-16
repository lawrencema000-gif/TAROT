DO $$
DECLARE r record;
BEGIN
  RAISE NOTICE 'checking _http_response for id >= 53...';
  FOR r IN
    SELECT id, status_code, LEFT(content::text, 16000) AS body, created
    FROM net._http_response
    WHERE id >= 53
    ORDER BY id DESC
    LIMIT 6
  LOOP
    RAISE NOTICE 'id=% status=% created=%', r.id, r.status_code, r.created;
    RAISE NOTICE 'body: %', r.body;
    RAISE NOTICE '---';
  END LOOP;
END $$;
