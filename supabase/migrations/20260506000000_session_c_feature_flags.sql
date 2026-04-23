-- ============================================================================
-- Session C feature flags — AI memory + two more pay-per-reports
-- ============================================================================
-- AI companion memory is unflagged at the table-level (the migration always
-- creates the tables and indexes) but the edge function's retrieval + summary
-- behavior activates automatically when the tables are populated. No runtime
-- toggle needed — it's strictly additive.
--
-- The two new pay-per-reports each get their own flag so we can soft-launch.
-- ============================================================================

INSERT INTO public.feature_flags (key, description, enabled, rollout_percent)
VALUES
  ('year-ahead-report',
   'Year-Ahead Forecast — pay-per-report #2. 12 months of transits, 300 Moonstones / $12.99.',
   false, 0),
  ('natal-chart-report',
   'Full Natal Chart printable report — pay-per-report #3. 200 Moonstones / $9.99.',
   false, 0)
ON CONFLICT (key) DO NOTHING;
