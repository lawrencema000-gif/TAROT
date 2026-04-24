-- ============================================================================
-- Week-2 one-at-a-time rollout: Pick-a-Card daily swipe
-- ============================================================================
-- Per MASTER-ROADMAP-2026-04-24.md, Week-2 ships the Pick-a-Card daily
-- draw — a pure free-tier acquisition / habit-formation surface, 30-
-- second daily ritual, no paywall.
--
-- Flag `pick-a-card` controls only the home-screen tile (the route
-- `/pick-a-card` is ungated so share links work even if the flag is
-- off). Rolled out to 100% immediately — low risk, no new server
-- surface, client-side only.
--
-- Idempotent. Re-running is safe.
-- ============================================================================

INSERT INTO public.feature_flags (key, description, enabled, rollout_percent, allowed_user_ids)
  VALUES (
    'pick-a-card',
    'Pick-a-Card daily swipe — 3 face-down cards, tap one, reveal with flip animation. Free tier, acquisition surface.',
    true,
    100,
    ARRAY[]::uuid[]
  )
  ON CONFLICT (key) DO UPDATE
    SET enabled = true,
        rollout_percent = 100,
        updated_at = now();
