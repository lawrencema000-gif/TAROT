-- Add UTM attribution columns to profiles for ad campaign tracking.
-- Set once on first signup from window.location captured in the client.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS first_referrer TEXT;

-- Index for slicing analytics by campaign without a full scan.
CREATE INDEX IF NOT EXISTS profiles_utm_campaign_idx
  ON public.profiles (utm_campaign)
  WHERE utm_campaign IS NOT NULL;
