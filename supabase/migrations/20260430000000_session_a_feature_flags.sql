-- ============================================================================
-- Session A feature flags — divination, numerology, moon phases, quiz expansion
-- ============================================================================
-- Why: Session A adds Runes, Dice, extra quizzes (Part 2), extended numerology,
-- and the Tonight's Moon home widget. Every surface ships dark. Flip one at a
-- time in production after smoke-testing on preview.
--
-- Matching client hooks live in:
--   - ReadingsPage.tsx         'runes', 'dice'
--   - HomePage.tsx             'moon-phases'
--   - CosmicProfileSection.tsx (numerology is unconditional — no flag)
-- ============================================================================

INSERT INTO public.feature_flags (key, description, enabled, rollout_percent)
VALUES
  ('runes',
   'Elder Futhark rune reading tab in ReadingsPage. 24 staves, 3-rune cast.',
   false, 0),
  ('dice',
   'Three-dice oracle tab in ReadingsPage. 16 possible readings (sums 3–18).',
   false, 0),
  ('moon-phases',
   'Tonight''s Moon card on home screen — current lunar phase + ritual prompt.',
   false, 0)
ON CONFLICT (key) DO NOTHING;
