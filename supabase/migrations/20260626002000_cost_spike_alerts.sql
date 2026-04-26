-- ============================================================================
-- Cost-spike alerting — 2026-04-26
-- ============================================================================
-- The killswitch (feature_flags.ai-enabled) is the EMERGENCY mechanism.
-- This is the DETECTION mechanism. Without it, a runaway cost spike
-- (compromised key, viral traffic, abuse, prompt-injection loop) goes
-- unnoticed until the bill arrives.
--
-- A daily cron at 03:00 UTC computes yesterday's stats and compares them
-- to a 7-day rolling baseline. If anything is >= 3× the median, it writes
-- a row to `cost_alerts`. Admin UI / Sentry / Slack webhook can poll that
-- table. The cron itself doesn't email — that requires SMTP setup which
-- is blocked on user.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cost_alerts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_date    date NOT NULL,
  metric        text NOT NULL CHECK (metric IN (
    'ai_calls_total',
    'ai_calls_per_user_p99',
    'edge_fn_invocations',
    'stripe_subscriptions_created',
    'stripe_revenue_cents',
    'cache_miss_rate'
  )),
  observed      numeric NOT NULL,
  baseline      numeric NOT NULL,
  multiple      numeric NOT NULL,
  severity      text NOT NULL CHECK (severity IN ('warn', 'critical')),
  details       jsonb,
  acknowledged  boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cost_alerts_unack_idx
  ON public.cost_alerts (created_at DESC)
  WHERE acknowledged = false;

ALTER TABLE public.cost_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cost_alerts_admin_select ON public.cost_alerts;
CREATE POLICY cost_alerts_admin_select
  ON public.cost_alerts FOR SELECT
  USING (public.is_admin());

GRANT SELECT ON public.cost_alerts TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- The check function. Compares yesterday's totals to the 7-day median and
-- writes alerts for anything >=3× (warn) or >=10× (critical).
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.run_cost_spike_check()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_yesterday  date := CURRENT_DATE - 1;
  v_alerts     integer := 0;

  -- Yesterday's metrics.
  v_ai_calls           integer;
  v_top_user_calls     integer;

  -- 7-day baselines (median of the prior 7 days, excluding yesterday itself).
  v_ai_calls_baseline  numeric;
  v_top_user_baseline  numeric;
BEGIN
  -- 1. Total AI calls yesterday.
  SELECT COALESCE(SUM(call_count), 0)
    INTO v_ai_calls
    FROM public.ai_daily_usage
    WHERE usage_date = v_yesterday;

  -- 1b. Median of the prior 7 days.
  SELECT COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY total), 0)
    INTO v_ai_calls_baseline
    FROM (
      SELECT usage_date, SUM(call_count) AS total
        FROM public.ai_daily_usage
        WHERE usage_date >= v_yesterday - 7 AND usage_date < v_yesterday
        GROUP BY usage_date
    ) AS daily;

  IF v_ai_calls_baseline > 50 THEN
    -- Only fire alerts when baseline is meaningful (avoid noise on small sites).
    IF v_ai_calls >= v_ai_calls_baseline * 10 THEN
      INSERT INTO public.cost_alerts (alert_date, metric, observed, baseline, multiple, severity, details)
        VALUES (v_yesterday, 'ai_calls_total', v_ai_calls, v_ai_calls_baseline,
                round(v_ai_calls / v_ai_calls_baseline, 2), 'critical',
                jsonb_build_object('window', '7d_median'));
      v_alerts := v_alerts + 1;
    ELSIF v_ai_calls >= v_ai_calls_baseline * 3 THEN
      INSERT INTO public.cost_alerts (alert_date, metric, observed, baseline, multiple, severity, details)
        VALUES (v_yesterday, 'ai_calls_total', v_ai_calls, v_ai_calls_baseline,
                round(v_ai_calls / v_ai_calls_baseline, 2), 'warn',
                jsonb_build_object('window', '7d_median'));
      v_alerts := v_alerts + 1;
    END IF;
  END IF;

  -- 2. Per-user max — catches a single account hammering AI.
  SELECT COALESCE(MAX(call_count), 0)
    INTO v_top_user_calls
    FROM public.ai_daily_usage
    WHERE usage_date = v_yesterday;

  SELECT COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY call_count), 0)
    INTO v_top_user_baseline
    FROM public.ai_daily_usage
    WHERE usage_date >= v_yesterday - 7 AND usage_date < v_yesterday;

  IF v_top_user_baseline > 10 AND v_top_user_calls >= v_top_user_baseline * 3 THEN
    INSERT INTO public.cost_alerts (alert_date, metric, observed, baseline, multiple, severity, details)
      VALUES (v_yesterday, 'ai_calls_per_user_p99', v_top_user_calls, v_top_user_baseline,
              round(v_top_user_calls / v_top_user_baseline, 2), 'warn',
              jsonb_build_object('hint', 'Single user spending heavily — investigate'));
    v_alerts := v_alerts + 1;
  END IF;

  -- Could extend with stripe revenue, edge fn invocations, cache miss rate,
  -- etc. once those metrics are tracked. For now, AI usage is the primary
  -- cost lever.

  IF v_alerts > 0 THEN
    RAISE NOTICE 'cost-spike-check: % alerts written for %', v_alerts, v_yesterday;
  END IF;

  RETURN v_alerts;
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_cost_spike_check() TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- Schedule: daily 03:00 UTC.
-- ──────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cost-spike-check') THEN
    PERFORM cron.unschedule('cost-spike-check');
  END IF;
END $$;

SELECT cron.schedule(
  'cost-spike-check',
  '0 3 * * *',
  $$SELECT public.run_cost_spike_check();$$
);

DO $$ BEGIN
  RAISE NOTICE 'cost-spike-alerts: cost_alerts table + daily 03:00 UTC check scheduled.';
END $$;
