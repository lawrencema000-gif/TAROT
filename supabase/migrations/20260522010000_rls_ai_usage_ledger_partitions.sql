-- ============================================================================
-- Enforce RLS on every `ai_usage_ledger_YYYY_MM` partition
-- ============================================================================
-- Supabase advisor (rls_disabled_in_public) flagged 2026_04 and 2026_05 as
-- RLS-disabled public tables. That's because PostgREST exposes each
-- partition as its own relation, so a direct
-- `GET /rest/v1/ai_usage_ledger_2026_04` would bypass the parent's RLS and
-- leak other users' AI-call rows.
--
-- Fix: enable RLS + apply the same "users view own" SELECT policy on every
-- existing partition. Future monthly partitions (created by pg_partman or
-- the DO-block fallback in 20260424000000_ai_usage_ledger.sql) should call
-- `public._ai_usage_ledger_seal_partition(new_partition::regclass)` right
-- after creation — we expose it as a helper for that purpose.
--
-- Idempotent. Re-running is safe.
-- ============================================================================

-- Helper: seal a single partition with RLS + matching SELECT policy.
CREATE OR REPLACE FUNCTION public._ai_usage_ledger_seal_partition(p_partition regclass)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_relname text;
BEGIN
  SELECT c.relname INTO v_relname
    FROM pg_class c
    WHERE c.oid = p_partition;

  IF v_relname IS NULL THEN
    RAISE EXCEPTION 'Partition % not found', p_partition;
  END IF;

  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_relname);
  EXECUTE format(
    'DROP POLICY IF EXISTS "Users can view own ai usage" ON public.%I',
    v_relname
  );
  EXECUTE format(
    'CREATE POLICY "Users can view own ai usage" ON public.%I '
    || 'FOR SELECT USING (auth.uid() = user_id)',
    v_relname
  );
END;
$$;

COMMENT ON FUNCTION public._ai_usage_ledger_seal_partition(regclass) IS
  'Enable RLS + recreate the per-user SELECT policy on a single ai_usage_ledger partition. Call after creating a new partition so PostgREST cannot expose it as an unprotected relation.';

-- Apply to every existing partition.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.oid AS partition_oid, c.relname
      FROM pg_inherits i
      JOIN pg_class c ON c.oid = i.inhrelid
      JOIN pg_class p ON p.oid = i.inhparent
      JOIN pg_namespace n ON n.oid = p.relnamespace
      WHERE n.nspname = 'public' AND p.relname = 'ai_usage_ledger'
  LOOP
    PERFORM public._ai_usage_ledger_seal_partition(r.partition_oid);
    RAISE NOTICE 'Sealed partition %', r.relname;
  END LOOP;
END $$;
