-- ─────────────────────────────────────────────────────────────────────
-- Invalidate any cached bazi_readings rows generated before the
-- 2026-04-30 fix to the day-pillar + month-default bugs.
--
-- Pre-fix readings were based on a chart that was wrong by 32 days on
-- the day pillar (and any dates Jan 1-5 had wrong month pillar). Any
-- premium user who generated a reading before today saw an interpretation
-- of an inaccurate chart. Truncating the cache forces re-generation
-- against the corrected chart on next page load.
--
-- No data loss: readings re-generate automatically when the user views
-- the BaziPage. The cache table preserves its schema and RLS policies.
-- ─────────────────────────────────────────────────────────────────────

DELETE FROM bazi_readings WHERE created_at < now();
