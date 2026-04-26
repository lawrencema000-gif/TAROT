-- ============================================================================
-- Seed the AI killswitch flag — 2026-04-26
-- ============================================================================
-- Every edge function configured with `ai: true` checks this flag at the
-- start of every request. Flipping it OFF instantly cuts all AI traffic
-- (no redeploy needed). Use cases: Gemini outage, cost spike triage,
-- prompt-injection emergency, etc.
--
-- To pause all AI:
--   UPDATE public.feature_flags SET enabled = false WHERE key = 'ai-enabled';
--
-- To resume:
--   UPDATE public.feature_flags SET enabled = true WHERE key = 'ai-enabled';
-- ============================================================================

INSERT INTO public.feature_flags (key, description, enabled, rollout_percent, allowed_user_ids)
VALUES (
  'ai-enabled',
  'Master killswitch for all AI edge functions. Flip OFF to instantly halt traffic to Gemini/Imagen/etc. without redeploying.',
  true,
  100,
  '{}'
)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at  = now();

DO $$ BEGIN
  RAISE NOTICE 'ai-killswitch: feature_flag seeded ON. Flip via UPDATE feature_flags SET enabled=false WHERE key=''ai-enabled''.';
END $$;
