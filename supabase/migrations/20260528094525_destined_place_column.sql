-- ============================================================================
-- Add destined_place column to profiles for "Find Your Place" persistence
-- ============================================================================
-- The Celestial Map flagship feature lets premium users save the city the
-- scoring algorithm picked for them. One destined place per user (v3 may
-- expand to a shortlist; for v2 a single slot is enough and keeps the UX
-- focused).
--
-- Shape (free-form JSON, no constraints needed):
--   {
--     "city":   { "name", "country", "cc", "lat", "lon" },
--     "intent": "love" | "career" | "travel" | "healing" | "home" | "growth" | "all",
--     "savedAt": ISO-8601 timestamp
--   }
--
-- RLS: the existing profiles policy (`auth.uid() = id`) already covers this
-- column — users can only read/write their own row. No new policy needed.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS destined_place jsonb;

COMMENT ON COLUMN public.profiles.destined_place IS
  'Celestial Map "destined place" the user saved from the Find Your Place reveal. JSON: { city: { name, country, cc, lat, lon }, intent, savedAt }.';
