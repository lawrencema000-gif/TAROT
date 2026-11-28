-- astrology_horoscope_cache: a cached reading belongs to one natal chart
-- (p12 WP-P2-06, gap-1-04).
-- After a member corrected their birth details, Horoscope Today kept the old
-- chart's transits, Moon house and theme until the day turned over (the
-- weekly and monthly tabs until the next Monday or the 1st): the row was
-- looked up by (user_id, date, type) alone. astrology-daily, -weekly and
-- -monthly now stamp each row with the chart it was built from and serve it
-- only while that is still the member's chart (_shared/horoscope-cache.ts
-- isFreshFor). A stamp is right in any order, where deleting rows on a recast
-- would race with a daily request that read the old chart.
-- Nullable, no backfill: a row written before this column is served while its
-- generated_at is at or after the chart's computed_at. No policy change (the
-- functions use the service client). Idempotent.
ALTER TABLE public.astrology_horoscope_cache
  ADD COLUMN IF NOT EXISTS chart_computed_at timestamptz;

COMMENT ON COLUMN public.astrology_horoscope_cache.chart_computed_at IS
  'the astrology_natal_charts.computed_at of the chart this reading was built from; a reading is served only while it matches';
