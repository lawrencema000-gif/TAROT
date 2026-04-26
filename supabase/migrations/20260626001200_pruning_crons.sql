-- ============================================================================
-- Pruning crons for unbounded-growth tables — 2026-04-26
-- ============================================================================
-- These tables grow forever without intervention. At 50k DAU each
-- becomes a real problem within months. Pruning crons keep them lean
-- without affecting product behaviour.
--
--   premium_action_log: 50/premium-user/day. The soft cap window is 24h
--     rolling, so 48h is more than enough buffer. At 10k premium users
--     that's 500k rows/day = 15M/month uncontrolled.
--
--   webhook_events: 5/paying-user/day for the idempotency table. 90d
--     lookback covers Stripe's longest retry window and is plenty for
--     debugging. At 5k paying users that's 25k/day = 750k/month.
--
--   audit_events: ~5/user/day. We keep a year for compliance/debugging.
--     50k DAU × 5 × 365 = 91M rows = real DB pressure.
--
--   rate_limit_events (if exists): 10/user/day. 30 days is plenty.
--
--   moonstone_transactions: NOT pruned. The append-only ledger is the
--     source of truth for balance reconciliation. If size becomes a
--     problem it should be partitioned by month, not pruned.
-- ============================================================================

-- premium_action_log — 48 hour TTL.
-- Runs every hour during off-peak (02-04 UTC).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune-premium-action-log') THEN
    PERFORM cron.unschedule('prune-premium-action-log');
  END IF;
END $$;

SELECT cron.schedule(
  'prune-premium-action-log',
  '30 2 * * *', -- daily 02:30 UTC
  $$DELETE FROM public.premium_action_log WHERE performed_at < now() - interval '48 hours';$$
);

-- webhook_events — 90 day TTL.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune-webhook-events') THEN
    PERFORM cron.unschedule('prune-webhook-events');
  END IF;
END $$;

SELECT cron.schedule(
  'prune-webhook-events',
  '45 2 * * *',
  $$DELETE FROM public.webhook_events WHERE created_at < now() - interval '90 days';$$
);

-- audit_events — 365 day TTL.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune-audit-events') THEN
    PERFORM cron.unschedule('prune-audit-events');
  END IF;
END $$;

-- Some installs may not have audit_events; guard with EXISTS.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_events') THEN
    PERFORM cron.schedule(
      'prune-audit-events',
      '0 3 * * *',
      $cron$DELETE FROM public.audit_events WHERE created_at < now() - interval '365 days';$cron$
    );
  END IF;
END $$;

-- rate_limit_events — 30 day TTL (if the table exists).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune-rate-limit-events') THEN
    PERFORM cron.unschedule('prune-rate-limit-events');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rate_limit_events') THEN
    PERFORM cron.schedule(
      'prune-rate-limit-events',
      '15 3 * * *',
      $cron$DELETE FROM public.rate_limit_events WHERE created_at < now() - interval '30 days';$cron$
    );
  END IF;
END $$;

DO $$ BEGIN
  RAISE NOTICE 'pruning-crons: premium_action_log 48h, webhook_events 90d, audit_events 365d, rate_limit_events 30d.';
END $$;
