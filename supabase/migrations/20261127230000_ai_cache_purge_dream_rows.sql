-- p12 premium-13 / D05 (WP-P0-09). The Dream page promises the dream is not
-- stored server-side. ai-dream-interpret no longer reads or writes the AI
-- cache shared by all members (keyed on the dream text, 7-day TTL); this
-- deletes the shared dream readings already stored and prunes expired rows
-- hourly instead of daily.
--
-- Apply only AFTER the new ai-dream-interpret is deployed (get_edge_function
-- shows no aiCacheStore): a purge run while the old function is live would be
-- refilled by it.

-- 1. The shared dream readings (model '<chain>-dream-vN'). Under D05 the
--    member's own retry copy keeps today's two days, so the per-request rows
--    stay: 'spend-replay' (the member's copy, keyed by a hash of member and
--    request) and 'spend-claim' (holds '{}', no content; it stops a retry of a
--    request that was already charged from running free).
DELETE FROM public.ai_response_cache
 WHERE function_name = 'ai-dream-interpret'
   AND model NOT IN ('spend-claim', 'spend-replay');

-- 2. Prune hourly instead of daily at 02:00 UTC. Same statement as before.
--    (Unschedule-then-schedule, as 20260626001100_ai_response_cache.sql; the
--    job gets a new jobid, so anything that watches it goes by name.)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-cache-prune') THEN
    PERFORM cron.unschedule('ai-cache-prune');
  END IF;
END $$;

SELECT cron.schedule(
  'ai-cache-prune',
  '7 * * * *', -- every hour at :07
  $$DELETE FROM public.ai_response_cache WHERE expires_at < now();$$
);
