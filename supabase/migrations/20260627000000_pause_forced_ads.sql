-- ============================================================================
-- Pause forced ads (interstitial + app-open) — 2026-04-27
-- ============================================================================
-- The two ad surfaces this flag controls:
--   1. App-open ad — shown on cold start, before the user sees content
--   2. Interstitial ad — pop-up shown after N actions (reading, quiz, etc)
--
-- Rewarded ads (the watch-ad-to-earn-50-moonstones flow) are NOT
-- affected — they're user-initiated and opt-in.
--
-- The ads.ts service caches the flag for 5 min, so flipping this on
-- takes effect within minutes for new app sessions without a redeploy.
--
-- Re-enable when ready:
--   UPDATE public.feature_flags SET enabled = true WHERE key = 'forced-ads-enabled';
-- ============================================================================

INSERT INTO public.feature_flags (key, description, enabled, rollout_percent, allowed_user_ids)
VALUES (
  'forced-ads-enabled',
  'Master switch for app-open + interstitial ads. Rewarded ads (moonstone earn) are NOT gated by this. Toggle to true to re-enable forced ad surfaces.',
  false, -- starts paused per user request 2026-04-27
  0,
  '{}'
)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  -- Don't reset enabled if someone already toggled it; only update
  -- the description on conflict.
  updated_at  = now();

DO $$ BEGIN
  RAISE NOTICE 'forced-ads paused. Re-enable: UPDATE feature_flags SET enabled=true WHERE key=''forced-ads-enabled''.';
END $$;
