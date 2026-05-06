-- ─────────────────────────────────────────────────────────────────────
-- Enable Postgres logical replication of `profiles` UPDATE events to
-- Supabase Realtime so the client gets pushed when is_premium flips.
--
-- Why: AuthContext now subscribes to UPDATE events on this user's own
-- profiles row. Without adding the table to the supabase_realtime
-- publication, subscribers would receive nothing — the whole point of
-- the realtime channel falls flat.
--
-- The fix for the web "subscription cancelled but UI still shows
-- premium" bug depends on this push working. Stripe webhook flips
-- is_premium=false in DB → realtime push → AuthContext re-fetches
-- profile → UI immediately re-locks premium tabs.
--
-- REPLICA IDENTITY FULL ensures the UPDATE payload includes the OLD
-- row, not just the changed columns. The client never reads OLD —
-- it just re-fetches via fetchProfile() — but FULL is safer for any
-- future consumer that wants a diff. (DEFAULT only sends the primary
-- key in OLD; FULL sends every column.)
-- ─────────────────────────────────────────────────────────────────────

-- Add profiles to the realtime publication. Idempotent — if already
-- in the publication this no-ops via the EXCEPTION block.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION
  WHEN duplicate_object THEN
    -- Already published; nothing to do.
    NULL;
END $$;

ALTER TABLE public.profiles REPLICA IDENTITY FULL;
