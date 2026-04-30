-- Forced clear of bazi_readings cache. Idempotent — safe to re-run.
DO $$
DECLARE v_count integer;
BEGIN
  DELETE FROM bazi_readings;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Cleared % cached bazi readings', v_count;
END $$;
