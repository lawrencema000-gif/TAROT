-- ============================================================================
-- tarot-section-split feature flag
-- ============================================================================
-- Why: TarotSection.tsx is 1175 LOC with 5 view states + 14 handlers + ~20
-- state vars — a Phase 5 god-object per SCALABILITY-PLAN.md. The plan calls
-- for splitting it into sub-view components behind a feature flag, rolled
-- out incrementally.
--
-- This flag gates the split implementation. Start OFF; flip to a rollout
-- percent (10 / 50 / 100) after smoke-testing in prod. Both implementations
-- share the same public props + behavior; extraction is internal only.
-- ============================================================================

INSERT INTO public.feature_flags (key, description, enabled, rollout_percent)
VALUES (
  'tarot-section-split',
  'Use the split TarotSection implementation (extracted sub-view components). Safe to flip 0 → 10 → 100.',
  false,
  0
)
ON CONFLICT (key) DO NOTHING;
