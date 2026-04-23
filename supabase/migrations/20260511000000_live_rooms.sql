-- ============================================================================
-- Live rooms — scheduled group events (schema MVP)
-- ============================================================================
-- Sprint 18 from INCREMENTAL-ROADMAP.md. This migration installs the schema
-- needed for scheduled live rooms (Full Moon Scorpio live, Mercury retrograde
-- live, etc). Voice itself (LiveKit Cloud) is NOT wired up in this migration —
-- a token-mint edge function and LiveKit project setup come with the audio
-- enablement work. For now, the schema + RSVPs + listing are live so:
--   (a) admins can schedule rooms
--   (b) users can RSVP
--   (c) tipping + recording are placeholdered
--
-- Design:
--   live_rooms — one per scheduled event. Stores host, time, topic, a
--                short description, and a livekit_room_id that becomes
--                populated when we mint a token.
--   live_room_rsvps — one per user per room.
--   live_room_tips — tips from listener to host (Moonstones). Records
--                    during-session generosity.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.live_rooms (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text NOT NULL CHECK (char_length(title) BETWEEN 4 AND 120),
  description     text CHECK (description IS NULL OR char_length(description) <= 1000),
  scheduled_at    timestamptz NOT NULL,
  duration_minutes smallint NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 15 AND 240),
  capacity        integer NOT NULL DEFAULT 200 CHECK (capacity > 0),
  state           text NOT NULL DEFAULT 'scheduled' CHECK (state IN (
    'scheduled', 'live', 'completed', 'cancelled'
  )),
  livekit_room_id text,
  recording_url   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_rooms_upcoming_idx
  ON public.live_rooms (scheduled_at DESC)
  WHERE state IN ('scheduled', 'live');

CREATE TABLE IF NOT EXISTS public.live_room_rsvps (
  room_id        uuid NOT NULL REFERENCES public.live_rooms(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attended       boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS live_room_rsvps_user_idx
  ON public.live_room_rsvps (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.live_room_tips (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         uuid NOT NULL REFERENCES public.live_rooms(id) ON DELETE CASCADE,
  tipper_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  moonstones      integer NOT NULL CHECK (moonstones > 0),
  note            text CHECK (note IS NULL OR char_length(note) <= 200),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_room_tips_room_idx
  ON public.live_room_tips (room_id, created_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────

ALTER TABLE public.live_rooms       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_room_rsvps  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_room_tips   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS live_rooms_public_read ON public.live_rooms;
CREATE POLICY live_rooms_public_read
  ON public.live_rooms FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS live_rooms_host_manage ON public.live_rooms;
CREATE POLICY live_rooms_host_manage
  ON public.live_rooms FOR ALL
  USING (auth.uid() = host_user_id OR public.is_admin());

DROP POLICY IF EXISTS live_room_rsvps_own ON public.live_room_rsvps;
CREATE POLICY live_room_rsvps_own
  ON public.live_room_rsvps FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS live_room_rsvps_host_read ON public.live_room_rsvps;
CREATE POLICY live_room_rsvps_host_read
  ON public.live_room_rsvps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.live_rooms r
      WHERE r.id = live_room_rsvps.room_id AND r.host_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS live_room_tips_participant ON public.live_room_tips;
CREATE POLICY live_room_tips_participant
  ON public.live_room_tips FOR SELECT
  USING (
    auth.uid() IN (tipper_user_id, host_user_id)
    OR public.is_admin()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_rooms TO authenticated;
GRANT SELECT, INSERT, DELETE         ON public.live_room_rsvps TO authenticated;
GRANT SELECT                         ON public.live_room_tips TO authenticated;

-- ─── RPC: tip the host during/after a room ────────────────────────────────

CREATE OR REPLACE FUNCTION public.live_room_tip(
  p_room_id   uuid,
  p_moonstones integer,
  p_note      text DEFAULT NULL
)
RETURNS TABLE (tip_id uuid, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_room RECORD;
  v_balance integer;
  v_tip_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_moonstones <= 0 THEN RAISE EXCEPTION 'Tip must be positive'; END IF;

  SELECT id, host_user_id INTO v_room FROM public.live_rooms WHERE id = p_room_id;
  IF v_room IS NULL THEN RAISE EXCEPTION 'Room not found'; END IF;
  IF v_room.host_user_id = v_user THEN RAISE EXCEPTION 'Cannot tip yourself'; END IF;

  SELECT COALESCE(balance, 0) INTO v_balance FROM public.moonstone_balances WHERE user_id = v_user;
  IF COALESCE(v_balance, 0) < p_moonstones THEN
    RAISE EXCEPTION 'Insufficient Moonstones: have %, need %', COALESCE(v_balance, 0), p_moonstones;
  END IF;

  INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
    VALUES (v_user, -p_moonstones, 'gift', v_room.host_user_id::text, 'Live room tip');
  INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
    VALUES (v_room.host_user_id, p_moonstones, 'gift-receive', v_user::text, 'Live room tip received');

  INSERT INTO public.live_room_tips (room_id, tipper_user_id, host_user_id, moonstones, note)
    VALUES (p_room_id, v_user, v_room.host_user_id, p_moonstones, p_note)
    RETURNING id INTO v_tip_id;

  RETURN QUERY SELECT v_tip_id, (COALESCE(v_balance, 0) - p_moonstones);
END;
$$;

GRANT EXECUTE ON FUNCTION public.live_room_tip(uuid, integer, text) TO authenticated;
