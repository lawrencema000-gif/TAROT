-- ============================================================================
-- Celestial Map rollout — astrocartography surface
-- ============================================================================
-- New tab in Readings: a world map drawn with 40 planetary lines (10
-- planets × 4 angles AC/DC/MC/IC) derived from the user's birth chart.
-- Free users see only Sun + Moon (the teaser). Premium unlocks all 40
-- lines, city interpretations, and AI travel readings; non-premium can
-- one-shot the AI Travel Reading for 250 Moonstones.
--
-- Idempotent. Re-running is safe.
-- ============================================================================

INSERT INTO public.feature_flags (key, description, enabled, rollout_percent, allowed_user_ids)
  VALUES (
    'celestial-map',
    'Celestial Map — astrocartography world map with 40 planetary lines, life-area filters, city insight panel, AI travel readings.',
    true,
    100,
    ARRAY[]::uuid[]
  )
  ON CONFLICT (key) DO UPDATE
    SET enabled = true,
        rollout_percent = 100,
        updated_at = now();
