-- ============================================================================
-- AI response cache + hard daily AI ceiling — 2026-04-26
-- ============================================================================
-- Two scaling protections rolled into one migration:
--
-- (a) ai_response_cache — every AI edge function checks this table before
--     calling the upstream model. Cache key is sha256(model + prompt + context),
--     value is the JSON response, TTL 7 days. At 50k DAU we expect 30-50% of
--     dream/quick-reading/companion queries to repeat (popular topics, common
--     dreams, identical natal charts) — caching those alone saves ~50% of
--     Gemini cost without changing user experience.
--
-- (b) ai_daily_usage — a hard ceiling on AI calls per user per UTC day,
--     enforced server-side. The premium soft cap (50/24h rolling) is the
--     PRODUCT limit; this is the ABUSE limit (200/day). A runaway bot or
--     compromised account can't blow the Gemini bill past the cap.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- a. AI response cache.
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_response_cache (
  cache_key   text PRIMARY KEY,         -- hex sha256(model + prompt + context)
  model       text NOT NULL,
  function_name text NOT NULL,          -- e.g. 'ai-dream-interpret'
  response    jsonb NOT NULL,
  hit_count   integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS ai_response_cache_expires_idx
  ON public.ai_response_cache (expires_at);
CREATE INDEX IF NOT EXISTS ai_response_cache_function_idx
  ON public.ai_response_cache (function_name, created_at DESC);

-- RLS: read-only to nobody. The edge functions use service-role and bypass RLS.
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;
-- No policies = deny all client access. Only SECURITY DEFINER functions can read/write.

-- Fast helper RPC: lookup or null.
CREATE OR REPLACE FUNCTION public.ai_cache_get(p_cache_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_response jsonb;
BEGIN
  UPDATE public.ai_response_cache
     SET hit_count = hit_count + 1
   WHERE cache_key = p_cache_key
     AND expires_at > now()
   RETURNING response INTO v_response;
  RETURN v_response;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_cache_get(text) TO authenticated;

-- Helper RPC: upsert + extend TTL.
CREATE OR REPLACE FUNCTION public.ai_cache_set(
  p_cache_key     text,
  p_model         text,
  p_function_name text,
  p_response      jsonb,
  p_ttl_days      integer DEFAULT 7
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.ai_response_cache (cache_key, model, function_name, response, expires_at)
  VALUES (p_cache_key, p_model, p_function_name, p_response, now() + make_interval(days => p_ttl_days))
  ON CONFLICT (cache_key) DO UPDATE SET
    response   = EXCLUDED.response,
    expires_at = EXCLUDED.expires_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_cache_set(text, text, text, jsonb, integer) TO authenticated;

-- Daily prune of expired rows (so the table doesn't grow forever).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-cache-prune') THEN
    PERFORM cron.unschedule('ai-cache-prune');
  END IF;
END $$;

SELECT cron.schedule(
  'ai-cache-prune',
  '0 2 * * *', -- daily 02:00 UTC (off-peak)
  $$DELETE FROM public.ai_response_cache WHERE expires_at < now();$$
);

-- ──────────────────────────────────────────────────────────────────────────
-- b. Hard daily AI usage ceiling per user.
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_daily_usage (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date   date NOT NULL DEFAULT CURRENT_DATE,
  call_count   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.ai_daily_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_daily_usage_select_own ON public.ai_daily_usage;
CREATE POLICY ai_daily_usage_select_own
  ON public.ai_daily_usage FOR SELECT
  USING (auth.uid() = user_id);

GRANT SELECT ON public.ai_daily_usage TO authenticated;

-- Atomic check-and-increment. Returns whether the call is allowed +
-- the current count. Edge functions call this before invoking the model.
-- Default ceiling: 200 calls per UTC day per user.
CREATE OR REPLACE FUNCTION public.ai_check_and_record_usage(
  p_user_id uuid,
  p_ceiling integer DEFAULT 200
)
RETURNS TABLE (allowed boolean, used integer, ceiling integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_count integer;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'p_user_id required'; END IF;

  INSERT INTO public.ai_daily_usage (user_id, usage_date, call_count)
  VALUES (p_user_id, v_today, 1)
  ON CONFLICT (user_id, usage_date) DO UPDATE SET
    call_count = public.ai_daily_usage.call_count + 1
  RETURNING call_count INTO v_count;

  IF v_count > p_ceiling THEN
    -- Roll back the increment so honest retries don't keep climbing.
    UPDATE public.ai_daily_usage
       SET call_count = call_count - 1
     WHERE user_id = p_user_id AND usage_date = v_today;
    RETURN QUERY SELECT false, p_ceiling, p_ceiling;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_count, p_ceiling;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_check_and_record_usage(uuid, integer) TO authenticated;

-- Prune ai_daily_usage rows older than 90 days (we only need recent data).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-usage-prune') THEN
    PERFORM cron.unschedule('ai-usage-prune');
  END IF;
END $$;

SELECT cron.schedule(
  'ai-usage-prune',
  '15 2 * * *', -- daily 02:15 UTC
  $$DELETE FROM public.ai_daily_usage WHERE usage_date < CURRENT_DATE - 90;$$
);

DO $$ BEGIN
  RAISE NOTICE 'ai-cache + ai-ceiling: cache + 200/day hard ceiling + daily prunes scheduled.';
END $$;
