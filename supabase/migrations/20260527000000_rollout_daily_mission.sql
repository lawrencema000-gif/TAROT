-- ============================================================================
-- Week-6 one-at-a-time rollout: Daily Energy Mission
-- ============================================================================
-- Home-screen habit-formation widget. One 30-second micro-commitment
-- per day, picked deterministically from a 40-prompt pool. Free for
-- everyone. Mark-done is client-side only (localStorage). Streak is
-- tracked locally; future phases can wire XP / moonstones into the
-- widget's `onDone` hook without changing the surface.
--
-- Idempotent. Re-running is safe.
-- ============================================================================

INSERT INTO public.feature_flags (key, description, enabled, rollout_percent, allowed_user_ids)
  VALUES (
    'daily-mission',
    'Daily Energy Mission — 30-second habit prompt on Home. 40-prompt pool, deterministic daily pick, local streak.',
    true,
    100,
    ARRAY[]::uuid[]
  )
  ON CONFLICT (key) DO UPDATE
    SET enabled = true,
        rollout_percent = 100,
        updated_at = now();
