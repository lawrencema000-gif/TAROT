-- ============================================================================
-- Live room recordings + replay unlocks
-- ============================================================================
-- Extension of Session E's live_rooms. Adds:
--   1. Two fields on live_rooms for replay monetization:
--        replay_price_moonstones (nullable — null = free)
--        replay_duration_seconds (populated when recording lands)
--   2. live_room_replay_unlocks — one row per (room, user) once they have
--      access to the replay (either via RSVP+attendance OR paid unlock).
--
-- Recording upload path: LiveKit Egress → S3 → webhook hits our
-- stripe-webhook-like endpoint (NOT wired here — separate track). For now,
-- the recording_url column already exists from the previous migration; the
-- admin/host just updates it with the final URL.
-- ============================================================================

ALTER TABLE public.live_rooms
  ADD COLUMN IF NOT EXISTS replay_price_moonstones integer
    CHECK (replay_price_moonstones IS NULL OR replay_price_moonstones >= 0),
  ADD COLUMN IF NOT EXISTS replay_duration_seconds integer;

CREATE TABLE IF NOT EXISTS public.live_room_replay_unlocks (
  room_id        uuid NOT NULL REFERENCES public.live_rooms(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source         text NOT NULL CHECK (source IN ('attended', 'purchased-moonstones', 'purchased-stripe', 'comp')),
  moonstones_paid integer,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS live_room_replay_unlocks_user_idx
  ON public.live_room_replay_unlocks (user_id, created_at DESC);

ALTER TABLE public.live_room_replay_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS replay_unlocks_select_own ON public.live_room_replay_unlocks;
CREATE POLICY replay_unlocks_select_own
  ON public.live_room_replay_unlocks FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

GRANT SELECT ON public.live_room_replay_unlocks TO authenticated;

-- ─── RPC: unlock a replay using Moonstones ────────────────────────────────

CREATE OR REPLACE FUNCTION public.live_room_replay_unlock_moonstones(p_room_id uuid)
RETURNS TABLE (unlocked boolean, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_room RECORD;
  v_balance integer;
  v_existing RECORD;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id, host_user_id, replay_price_moonstones, recording_url, state
    INTO v_room
    FROM public.live_rooms
    WHERE id = p_room_id;
  IF v_room IS NULL THEN RAISE EXCEPTION 'Room not found'; END IF;
  IF v_room.recording_url IS NULL THEN RAISE EXCEPTION 'Replay not yet available'; END IF;
  IF v_room.replay_price_moonstones IS NULL THEN
    -- Free — just insert the comp unlock if missing.
    INSERT INTO public.live_room_replay_unlocks (room_id, user_id, source)
      VALUES (p_room_id, v_user, 'comp')
      ON CONFLICT (room_id, user_id) DO NOTHING;
    SELECT COALESCE(balance, 0) INTO v_balance FROM public.moonstone_balances WHERE user_id = v_user;
    RETURN QUERY SELECT true, COALESCE(v_balance, 0);
    RETURN;
  END IF;

  SELECT * INTO v_existing FROM public.live_room_replay_unlocks
    WHERE room_id = p_room_id AND user_id = v_user;
  IF v_existing IS NOT NULL THEN
    SELECT COALESCE(balance, 0) INTO v_balance FROM public.moonstone_balances WHERE user_id = v_user;
    RETURN QUERY SELECT true, COALESCE(v_balance, 0);
    RETURN;
  END IF;

  SELECT COALESCE(balance, 0) INTO v_balance FROM public.moonstone_balances WHERE user_id = v_user;
  IF COALESCE(v_balance, 0) < v_room.replay_price_moonstones THEN
    RAISE EXCEPTION 'Insufficient Moonstones: have %, need %', COALESCE(v_balance, 0), v_room.replay_price_moonstones;
  END IF;

  INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
    VALUES (v_user, -v_room.replay_price_moonstones, 'pay-per-report', p_room_id::text,
            'Live room replay unlock');
  -- Host gets 70% of the replay price as a gift-receive (30% platform).
  DECLARE v_host_share integer := FLOOR(v_room.replay_price_moonstones * 0.7)::integer;
  BEGIN
    IF v_host_share > 0 THEN
      INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
        VALUES (v_room.host_user_id, v_host_share, 'gift-receive', p_room_id::text,
                'Replay sale — host share');
    END IF;
  END;

  INSERT INTO public.live_room_replay_unlocks (room_id, user_id, source, moonstones_paid)
    VALUES (p_room_id, v_user, 'purchased-moonstones', v_room.replay_price_moonstones);

  RETURN QUERY SELECT true, (COALESCE(v_balance, 0) - v_room.replay_price_moonstones);
END;
$$;

GRANT EXECUTE ON FUNCTION public.live_room_replay_unlock_moonstones(uuid) TO authenticated;

-- ─── Grant attended-replay access automatically ───────────────────────────
-- When a user's RSVP row gets updated with attended=true, they get a free
-- replay unlock. A trigger is cleaner than asking the UI to remember.

CREATE OR REPLACE FUNCTION public.live_room_attend_grant_replay()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.attended IS true AND (OLD.attended IS DISTINCT FROM true) THEN
    INSERT INTO public.live_room_replay_unlocks (room_id, user_id, source)
      VALUES (NEW.room_id, NEW.user_id, 'attended')
      ON CONFLICT (room_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS live_room_attend_grant_replay_trigger ON public.live_room_rsvps;
CREATE TRIGGER live_room_attend_grant_replay_trigger
  AFTER UPDATE ON public.live_room_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.live_room_attend_grant_replay();
