/*
  # Feature flag for the playing-card cartomancy section

  Phase 7 adds a cartomancy section (readings, 54 card meanings, 12 lessons)
  gated behind a `cartomancy` flag. useFeatureFlag() treats a missing row as
  off forever (20260529000000 §2), so the row is seeded on at 100 %. Pattern:
  20260512000000_session_e_feature_flags.sql. ON CONFLICT DO NOTHING keeps
  any value the owner has already set.
*/

INSERT INTO public.feature_flags (key, description, enabled, rollout_percent)
VALUES
  ('cartomancy', 'Playing-card cartomancy section: readings, 54 card meanings, 12 lessons', true, 100)
ON CONFLICT (key) DO NOTHING;
