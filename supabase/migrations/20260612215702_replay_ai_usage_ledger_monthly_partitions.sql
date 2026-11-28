-- Replay-only (WP-F-04): production made the monthly ai_usage_ledger partitions on
-- their own days, from now(): 20260612215703 made 2026_06..2026_09 on 2026-06-12, and
-- the monthly pg_cron job 'ai-usage-ledger-partitions' (1st of the month, current
-- month + 3) has made one more each month since, so production holds every month
-- from 2026_04 on (20261020000000 counts the eight unsealed ones, 2026_06..2027_01,
-- on 2026-10-20). A fresh database replays those date-based statements on the day
-- it runs, so it only gets the replay month + 3 and misses the months in between;
-- `db diff` then finds them as tables production has and stops (migra cannot
-- write RLS for a partition: "Not implemented" in alter_rls_statement).
--
-- This file makes the replay hold what the cron has made on production: every
-- month from 2026_06 to the replay month + 3, under the cron's names and bounds.
-- 20261020000000 later enables RLS on all of them, as it did on production.
-- Only 2026_04 and 2026_05 existed when 20260522010000 sealed the partitions, so
-- only they carry its "Users can view own ai usage" policy on production; the
-- replay's own date-based partitions got it too, and lose it here.
--
-- Production already has all of these: this file is recorded as applied there
-- with `migration repair`, never run.
DO $$
DECLARE
  m_start date := DATE '2026-06-01';
  m_last  date := (date_trunc('month', now()) + interval '3 months')::date;
  p_name  text;
  r       record;
BEGIN
  WHILE m_start <= m_last LOOP
    p_name := 'ai_usage_ledger_' || to_char(m_start, 'YYYY_MM');
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.ai_usage_ledger FOR VALUES FROM (%L) TO (%L)',
      p_name, m_start, (m_start + interval '1 month')::date
    );
    m_start := (m_start + interval '1 month')::date;
  END LOOP;

  FOR r IN
    SELECT c.relname
      FROM pg_inherits i
      JOIN pg_class c ON c.oid = i.inhrelid
     WHERE i.inhparent = 'public.ai_usage_ledger'::regclass
       AND c.relname NOT IN ('ai_usage_ledger_2026_04', 'ai_usage_ledger_2026_05')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own ai usage" ON public.%I', r.relname);
  END LOOP;
END $$;
