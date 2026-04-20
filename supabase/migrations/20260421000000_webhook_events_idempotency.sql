-- ============================================================================
-- Webhook idempotency ledger
-- ============================================================================
-- Why: Stripe and RevenueCat (and any retryable external webhook source)
-- can deliver the same event multiple times during network flakes, provider
-- retries, or scale-out events. Without an idempotency check the handlers
-- double-apply entitlements, double-insert audit rows, and muddy the
-- subscriptions table.
--
-- The pattern: before running the business logic, INSERT (source, event_id)
-- into this ledger. If the INSERT returns no row (ON CONFLICT DO NOTHING),
-- the event was already processed — return 200 {received:true, duplicate:true}
-- without side effects.
--
-- Retention: 30 days. Matches the astrology cache cleanup cadence and is long
-- enough to cover the longest provider retry window we've observed (Stripe's
-- 3-day exponential retry + operational slack).
--
-- Row size: tiny (~50 bytes). At 1M DAU with ~10% conversion and ~2 webhook
-- events per subscription lifecycle that's <1M rows/mo — trivial.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source       text        NOT NULL CHECK (source IN ('stripe','revenuecat','blog')),
  event_id     text        NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, event_id)
);

CREATE INDEX IF NOT EXISTS webhook_events_processed_at_idx
  ON public.webhook_events (processed_at);

-- Service-role only; there is no user-facing surface on this table.
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TTL cleanup: drop rows > 30 days old every day at 03:30 UTC.
-- Staggered 15m after the astrology cache cleanup so the two jobs don't
-- fight for the same autovacuum cycle.
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  jobid bigint;
BEGIN
  SELECT j.jobid INTO jobid FROM cron.job j WHERE j.jobname = 'webhook-events-cleanup';
  IF jobid IS NOT NULL THEN
    PERFORM cron.unschedule(jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'webhook-events-cleanup',
  '30 3 * * *',
  $$ DELETE FROM public.webhook_events
     WHERE processed_at < now() - interval '30 days' $$
);

COMMENT ON TABLE public.webhook_events IS
  'Idempotency ledger for external webhooks (stripe, revenuecat, blog). Retain 30 days.';
COMMENT ON COLUMN public.webhook_events.source IS
  'The external service that delivered the event.';
COMMENT ON COLUMN public.webhook_events.event_id IS
  'The provider-issued event identifier. Unique per (source, event_id).';
