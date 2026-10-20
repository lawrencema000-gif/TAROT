/*
  Server-only SECURITY DEFINER functions were still callable by anyone.

  Six functions are meant for the server alone: the edge functions call them
  with the service-role client (_shared/handler.ts), pg_cron and migrations
  run them as postgres, and no client code calls them. Yet anon and
  authenticated could execute every one of them through /rest/v1/rpc. Their
  migrations revoked EXECUTE from PUBLIC only; on Supabase anon and
  authenticated hold grants of their own (the schema's default privileges),
  so `REVOKE ... FROM PUBLIC` left both in place, and 20261003000003 listed
  ai_search_memories as "already revoked from PUBLIC" on that strength.

    ai_search_memories(uuid, text, vector, integer)
        returned the summaries of any member's Companion conversations to
        anyone holding the public anon key and that member's id
    ai_mark_turns_summarized(uuid[])
        marked any conversation turns as summarized
    _ai_usage_ledger_seal_partition(regclass)
        ran ALTER TABLE ... ENABLE ROW LEVEL SECURITY and CREATE POLICY on any
        public table with a user_id column
    ai_usage_ledger_ensure_partitions()   the monthly partition job (pg_cron)
    calculate_daily_ad_revenue()          an aggregation nothing calls
    run_cost_spike_check()                the nightly cost alert (pg_cron)

  Also:
  - The monthly ai_usage_ledger partitions made after 2026-05 were never
    sealed (the seal ran once, in 20260522010000), so the security advisor
    lists eight public tables without RLS. PostgREST does not expose
    partitions and reads through the parent use the parent's policies, so
    nothing was readable; RLS is enabled on every partition now, and the job
    enables it on each partition it makes.
  - newsletter_unsubscribe(uuid) (SECURITY DEFINER, called signed out from the
    unsubscribe link) and custom_spreads_set_updated_at() had no fixed
    search_path.

  src/test/golden/definerGrants.test.ts replays every migration's function
  grants and fails on a SECURITY DEFINER function anon can call that is not
  on its reviewed list, and on a callable function that takes a member's id
  without checking the caller.
*/

-- ── 1. The partition job enables RLS on each partition it makes ─────────────
CREATE OR REPLACE FUNCTION public.ai_usage_ledger_ensure_partitions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  m      integer;
  m_start date;
  m_end   date;
  p_name  text;
BEGIN
  FOR m IN 0..3 LOOP
    m_start := date_trunc('month', now())::date + make_interval(months => m);
    m_end   := m_start + interval '1 month';
    p_name  := 'ai_usage_ledger_' || to_char(m_start, 'YYYY_MM');
    BEGIN
      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.ai_usage_ledger FOR VALUES FROM (%L) TO (%L)',
        p_name, m_start, m_end
      );
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_name);
    EXCEPTION WHEN OTHERS THEN
      -- Most likely an existing partition under a different name already
      -- covers this range (bootstrap-era naming). That's fine — the goal
      -- is coverage, not naming. Continue with the next month.
      RAISE NOTICE 'ai_usage_ledger partition % skipped: %', p_name, SQLERRM;
    END;
  END LOOP;
END;
$function$;

-- ── 2. Every existing partition gets RLS ────────────────────────────────────
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT i.inhrelid::regclass AS part
      FROM pg_inherits i
     WHERE i.inhparent = 'public.ai_usage_ledger'::regclass
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', r.part);
  END LOOP;
END $$;

-- ── 3. A fixed search_path ──────────────────────────────────────────────────
ALTER FUNCTION public.newsletter_unsubscribe(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.custom_spreads_set_updated_at() SET search_path = pg_catalog, public;

-- ── 4. Server-only: never a client call ─────────────────────────────────────
REVOKE ALL ON FUNCTION public.ai_search_memories(uuid, text, vector, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_mark_turns_summarized(uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._ai_usage_ledger_seal_partition(regclass) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_usage_ledger_ensure_partitions() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calculate_daily_ad_revenue() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.run_cost_spike_check() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.ai_search_memories(uuid, text, vector, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_mark_turns_summarized(uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public._ai_usage_ledger_seal_partition(regclass) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_usage_ledger_ensure_partitions() TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_daily_ad_revenue() TO service_role;
GRANT EXECUTE ON FUNCTION public.run_cost_spike_check() TO service_role;
