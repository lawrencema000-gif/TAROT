-- ============================================================================
-- ai_usage_ledger — per-call cost observability for Gemini (and future LLMs)
-- ============================================================================
-- Why: SCALABILITY-PLAN.md Part 2 fragility #2 — Gemini spend is currently
-- unobservable. `generate-reading` discards `data.usage`, there is no ledger,
-- no ceiling, no ability to attribute a runaway bill to a model / user / day.
-- A single viral day could silently cost $10–15k.
--
-- This migration creates an append-only ledger: every external LLM call writes
-- one row with tokens, estimated cost, model, function name, user, and
-- correlation ID. Downstream this unlocks:
--   • "your AI usage this month" screen (user-facing)
--   • aggregate cost dashboards (model × day)
--   • pg_cron alarms once daily totals cross a budget threshold
--   • per-user abuse detection
--
-- Design notes:
--   • Native Postgres range-partitioning by `created_at`, monthly partitions.
--     A write during month-boundary rollover would fail if the next partition
--     doesn't exist, so we pre-create current + next month here and rely on a
--     rolling maintenance job (see Part 5 Phase 5) to add future partitions.
--   • RLS: users SELECT their own rows; INSERTs are service-role-only. The
--     edge function uses `ctx.supabase` (service role) to write; end users
--     cannot forge ledger rows from the browser.
--   • Indexes on (user_id, created_at DESC) and (model, created_at DESC) —
--     these are the two pivot axes: per-user monthly usage and aggregate
--     model cost.
--   • Retention: keep 13 months of per-call detail (one full year + rolling
--     month); after that we either drop rows or roll into monthly aggregates
--     (aggregate rollup is a stretch goal — see comment at bottom).
--
-- Size projection AT 1M DAU:
--   1M users × 1 reading/day × 365 days = ~365M rows/yr at worst.
--   Monthly partitions cap a single table to ~30M rows which is comfortable;
--   archival/aggregation after 13 months keeps on-disk footprint bounded.
-- ============================================================================

-- ── Parent table (range-partitioned by created_at, monthly) ─────────────────
CREATE TABLE IF NOT EXISTS public.ai_usage_ledger (
  id                 uuid           NOT NULL DEFAULT gen_random_uuid(),
  user_id            uuid           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model              text           NOT NULL,
  prompt_tokens      integer        NOT NULL DEFAULT 0,
  completion_tokens  integer        NOT NULL DEFAULT 0,
  total_tokens       integer        NOT NULL DEFAULT 0,
  -- cost_cents has 4 decimal places to preserve precision for tiny per-call
  -- costs (fractions of a cent per Gemini Flash call).
  cost_cents         numeric(10,4)  NOT NULL DEFAULT 0,
  correlation_id     text           NOT NULL,
  function_name      text           NOT NULL,
  created_at         timestamptz    NOT NULL DEFAULT now(),
  -- PRIMARY KEY must include the partition key on partitioned tables.
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- ── Partitions: current month + next month ─────────────────────────────────
-- We check for pg_partman first (managed Supabase usually doesn't have it,
-- but worth checking for future-compat). Manual partitions are the fallback
-- and are what we actually use today. A rolling cron job (or Phase 5 follow-up)
-- should pre-create partitions 2–3 months ahead so writes never fail at a
-- month boundary.
DO $$
DECLARE
  has_partman boolean := EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_partman');
  cur_start   date    := date_trunc('month', now())::date;
  cur_end     date    := (date_trunc('month', now()) + interval '1 month')::date;
  next_start  date    := cur_end;
  next_end    date    := (date_trunc('month', now()) + interval '2 months')::date;
  cur_name    text    := format('ai_usage_ledger_%s', to_char(cur_start, 'YYYY_MM'));
  next_name   text    := format('ai_usage_ledger_%s', to_char(next_start, 'YYYY_MM'));
BEGIN
  IF has_partman THEN
    -- Prefer pg_partman where available: it handles future partition creation
    -- automatically on its own schedule.
    PERFORM partman.create_parent(
      p_parent_table  := 'public.ai_usage_ledger',
      p_control       := 'created_at',
      p_type          := 'native',
      p_interval      := '1 month',
      p_premake       := 2
    );
  ELSE
    -- Manual fallback: pre-create the current month and the next month so a
    -- write at 23:59:59 UTC on the last of the month doesn't fail.
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.ai_usage_ledger FOR VALUES FROM (%L) TO (%L)',
      cur_name, cur_start, cur_end
    );
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.ai_usage_ledger FOR VALUES FROM (%L) TO (%L)',
      next_name, next_start, next_end
    );
  END IF;
END $$;

-- ── Indexes (inherited by every partition) ─────────────────────────────────
-- Per-user monthly-usage query: WHERE user_id = ? AND created_at >= ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS ai_usage_ledger_user_created_idx
  ON public.ai_usage_ledger (user_id, created_at DESC);

-- Aggregate cost-dashboard query: model × day totals.
CREATE INDEX IF NOT EXISTS ai_usage_ledger_model_created_idx
  ON public.ai_usage_ledger (model, created_at DESC);

-- Correlation-id lookup: "show me the single LLM call behind this trace".
CREATE INDEX IF NOT EXISTS ai_usage_ledger_correlation_id_idx
  ON public.ai_usage_ledger (correlation_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.ai_usage_ledger ENABLE ROW LEVEL SECURITY;

-- Users can read their own ledger rows (feeds the eventual "your AI usage" UI).
DROP POLICY IF EXISTS "Users can view own ai usage" ON public.ai_usage_ledger;
CREATE POLICY "Users can view own ai usage"
  ON public.ai_usage_ledger FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- No INSERT / UPDATE / DELETE policies for `authenticated` — the edge function
-- writes via service-role (which bypasses RLS). Anonymous/authenticated users
-- have no direct write path into the ledger.

-- ── Retention: drop rows older than 13 months ──────────────────────────────
-- Stretch goal (not implemented in this migration): roll older rows into a
-- monthly aggregate table (user_id, model, year_month, total_tokens, total_cost_cents)
-- before dropping the per-call detail. For now the simple rule applies:
-- detail keeps 13 months, then is dropped. If pg_cron is unavailable on this
-- deployment, the scheduled job silently no-ops and we handle retention out of
-- band — see the DO block below.
DO $$
DECLARE
  has_pg_cron boolean := EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron');
BEGIN
  IF NOT has_pg_cron THEN
    -- Managed Supabase has pg_cron; if we somehow land somewhere it doesn't
    -- (local dev, custom Postgres), skip scheduling. The table still works.
    RAISE NOTICE 'pg_cron not installed; ai_usage_ledger 13-month retention not scheduled';
  ELSE
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  END IF;
END $$;

DO $$
DECLARE
  jobid bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT j.jobid INTO jobid FROM cron.job j WHERE j.jobname = 'ai-usage-ledger-cleanup';
    IF jobid IS NOT NULL THEN
      PERFORM cron.unschedule(jobid);
    END IF;

    PERFORM cron.schedule(
      'ai-usage-ledger-cleanup',
      '30 3 * * *',
      $cron$ DELETE FROM public.ai_usage_ledger
             WHERE created_at < now() - interval '13 months' $cron$
    );
  END IF;
END $$;

-- ── Comments ────────────────────────────────────────────────────────────────
COMMENT ON TABLE public.ai_usage_ledger IS
  'Per-call ledger of external LLM usage (Gemini today, future providers welcome). '
  'Range-partitioned monthly by created_at. RLS: users read their own rows; '
  'INSERT is service-role-only (edge functions only). Retention: 13 months of '
  'per-call detail via pg_cron job ai-usage-ledger-cleanup; after that rows '
  'are dropped (stretch goal is to aggregate into monthly rollups first).';
COMMENT ON COLUMN public.ai_usage_ledger.model IS
  'LLM model identifier, e.g. gemini-1.5-flash, gemini-2.5-pro.';
COMMENT ON COLUMN public.ai_usage_ledger.prompt_tokens IS
  'Input token count reported by the provider (Gemini usageMetadata.promptTokenCount).';
COMMENT ON COLUMN public.ai_usage_ledger.completion_tokens IS
  'Output token count reported by the provider (Gemini usageMetadata.candidatesTokenCount).';
COMMENT ON COLUMN public.ai_usage_ledger.total_tokens IS
  'Provider-reported total tokens (usageMetadata.totalTokenCount). Redundant with '
  'prompt+completion but preserved as reported for audit.';
COMMENT ON COLUMN public.ai_usage_ledger.cost_cents IS
  'Estimated cost in cents (4-decimal precision) computed from model-specific rates. '
  'Zero if the model is unknown to the cost table — tokens are still preserved.';
COMMENT ON COLUMN public.ai_usage_ledger.correlation_id IS
  'Request correlation ID — joins to the edge-function log line for this call.';
COMMENT ON COLUMN public.ai_usage_ledger.function_name IS
  'Edge function that made the call, e.g. generate-reading.';
