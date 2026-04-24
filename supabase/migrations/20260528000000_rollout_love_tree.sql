-- ============================================================================
-- Week-7 one-at-a-time rollout: Love Tree attachment visualizer
-- ============================================================================
-- 12-question ECR-R-adapted attachment assessment → one of four
-- classical attachment types (secure / anxious / avoidant / fearful),
-- rendered as a distinct animated SVG tree. Free tier.
--
-- Pure client-side. No server compute, no new edge function. Result
-- not persisted yet (could be added later alongside journal).
--
-- Idempotent. Re-running is safe.
-- ============================================================================

INSERT INTO public.feature_flags (key, description, enabled, rollout_percent, allowed_user_ids)
  VALUES (
    'love-tree',
    'Love Tree — 12-question attachment quiz → animated SVG tree per type. Free tier.',
    true,
    100,
    ARRAY[]::uuid[]
  )
  ON CONFLICT (key) DO UPDATE
    SET enabled = true,
        rollout_percent = 100,
        updated_at = now();
