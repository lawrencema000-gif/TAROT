-- Take anon off the private wish tables explicitly.
--
-- RLS already filters them to nothing for an anonymous caller — an offer is
-- readable only by its helper and its wisher, so anon gets an empty array. But
-- Supabase's default privileges hand new public-schema tables a grant to anon
-- and authenticated whether you asked for one or not, and this session already
-- learned once that leaning on a single layer here is how something stays
-- reachable that everyone believed was closed.
--
-- Offers and reports are two-party private data. They should be a permission
-- error for anon, not an empty result that depends on a policy staying correct.
-- The public sky itself (wishes, echoes) keeps its anon SELECT deliberately, so
-- the map can be admired before signing up.

REVOKE ALL ON public.wish_offers  FROM PUBLIC, anon;
REVOKE ALL ON public.wish_reports FROM PUBLIC, anon;

-- Restate what authenticated needs, so this migration is complete on its own.
GRANT SELECT, INSERT, UPDATE ON public.wish_offers  TO authenticated;
GRANT SELECT, INSERT         ON public.wish_reports TO authenticated;
