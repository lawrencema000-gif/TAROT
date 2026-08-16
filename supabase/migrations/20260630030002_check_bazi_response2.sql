DO $$
DECLARE
  r record;
  v_count integer;
  v_table_exists boolean;
BEGIN
  -- Check both possible response table names
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'net' AND table_name = '_http_response'
  ) INTO v_table_exists;
  RAISE NOTICE 'net._http_response exists: %', v_table_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'net' AND table_name = 'http_response'
  ) INTO v_table_exists;
  RAISE NOTICE 'net.http_response exists: %', v_table_exists;

  -- Try the underscore version
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'net' AND table_name = '_http_response') THEN
    SELECT COUNT(*) INTO v_count FROM net._http_response;
    RAISE NOTICE 'rows in net._http_response: %', v_count;
    FOR r IN
      SELECT id, status_code, LEFT(content::text, 4000) AS body
      FROM net._http_response
      ORDER BY id DESC LIMIT 3
    LOOP
      RAISE NOTICE '_http_response id=% status=% body_preview=%', r.id, r.status_code, LEFT(r.body, 200);
    END LOOP;
  END IF;

  -- Try the no-underscore version
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'net' AND table_name = 'http_response') THEN
    SELECT COUNT(*) INTO v_count FROM net.http_response;
    RAISE NOTICE 'rows in net.http_response: %', v_count;
    FOR r IN
      SELECT id, status_code, LEFT(content::text, 4000) AS body
      FROM net.http_response
      ORDER BY id DESC LIMIT 3
    LOOP
      RAISE NOTICE 'http_response id=% status=% body_preview=%', r.id, r.status_code, LEFT(r.body, 200);
    END LOOP;
  END IF;
END $$;
