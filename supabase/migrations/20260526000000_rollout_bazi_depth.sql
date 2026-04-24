-- ============================================================================
-- Week-5 one-at-a-time rollout: Bazi Phase 1 depth layers (PREMIUM)
-- ============================================================================
-- Per MASTER-ROADMAP and user decisions: Bazi depth is premium-gated.
-- Free tier keeps the existing chart + Day Master + 5-element balance.
-- Premium unlocks Phase-1 classical layers:
--   • Inner Forces (Ten Gods / 十神) per non-day pillar
--   • Hidden Influences (藏干) per branch
--   • Soul Sound (Nayin / 纳音) of the year pillar
--   • Chart strength diagnosis (Dominant / Balanced / Receptive)
--   • Supporting Element (用神) with lucky color / direction / numbers / career
--   • Today's Lucky Color widget (五行穿衣)
--
-- Flag `bazi-depth` gates rendering the deepening section at all.
-- Within the section, `profile.is_premium` is the final gate — non-
-- premium users see a teaser/upgrade CTA instead of the full read.
--
-- Rolled out to 100% at flag level; premium paywall already enforces
-- the per-user gate so we're safe flipping the flag on broadly.
--
-- Idempotent. Re-running is safe.
-- ============================================================================

INSERT INTO public.feature_flags (key, description, enabled, rollout_percent, allowed_user_ids)
  VALUES (
    'bazi-depth',
    'Bazi Phase-1 classical layers — Inner Forces / Hidden Influences / Nayin / Strength / Supporting Element / Today''s Lucky Color. Premium-gated within the surface.',
    true,
    100,
    ARRAY[]::uuid[]
  )
  ON CONFLICT (key) DO UPDATE
    SET enabled = true,
        rollout_percent = 100,
        updated_at = now();
