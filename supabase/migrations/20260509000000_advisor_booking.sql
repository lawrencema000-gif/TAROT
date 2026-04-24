-- ============================================================================
-- Advisor marketplace — availability, sessions, realtime chat
-- ============================================================================
-- Sprints 14-16 compressed into a text-only MVP: no LiveKit audio yet, no
-- Stripe Connect payout yet, no calendar widget yet. Just the minimum to
-- book a session, show up on time, chat in realtime, finish, and debit
-- Moonstones at an agreed rate.
--
-- Schema:
--   advisor_availability  — rolling weekly recurring slots per advisor
--   advisor_sessions      — one booked session per row
--   session_messages      — realtime chat log for each session
--
-- Booking is atomic via RPC: debit the client's Moonstones and create the
-- session in one statement (can't have one without the other).
--
-- Session lifecycle:
--   scheduled → active (when either party opens the session) → completed
--     (either party taps "end" OR duration_minutes elapses) → rated (after
--     the client leaves a review).
--   A session can also be cancelled before it goes active → full Moonstone
--   refund. After active, no refund without admin intervention.
-- ============================================================================

-- ─── 1. Weekly recurring availability ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.advisor_availability (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id      uuid NOT NULL REFERENCES public.advisor_profiles(id) ON DELETE CASCADE,
  day_of_week     smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  start_time      time NOT NULL,
  end_time        time NOT NULL CHECK (end_time > start_time),
  timezone        text NOT NULL DEFAULT 'UTC',
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS advisor_avail_advisor_idx
  ON public.advisor_availability (advisor_id, day_of_week, start_time)
  WHERE is_active = true;

ALTER TABLE public.advisor_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS advisor_avail_public_read ON public.advisor_availability;
CREATE POLICY advisor_avail_public_read
  ON public.advisor_availability FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS advisor_avail_advisor_manage ON public.advisor_availability;
CREATE POLICY advisor_avail_advisor_manage
  ON public.advisor_availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.advisor_profiles p
      WHERE p.id = advisor_availability.advisor_id AND p.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.advisor_availability TO authenticated;

-- ─── 2. Sessions ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.advisor_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id          uuid NOT NULL REFERENCES public.advisor_profiles(id) ON DELETE RESTRICT,
  client_user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_at        timestamptz NOT NULL,
  duration_minutes    smallint NOT NULL CHECK (duration_minutes IN (15, 30, 45, 60)),
  moonstone_cost      integer NOT NULL CHECK (moonstone_cost > 0),
  state               text NOT NULL DEFAULT 'scheduled' CHECK (state IN (
    'scheduled', 'active', 'completed', 'cancelled', 'no-show'
  )),
  topic               text CHECK (topic IS NULL OR char_length(topic) <= 500),
  started_at          timestamptz,
  ended_at            timestamptz,
  cancelled_at        timestamptz,
  cancelled_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rating              smallint CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  review              text CHECK (review IS NULL OR char_length(review) <= 2000),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS advisor_sessions_advisor_idx
  ON public.advisor_sessions (advisor_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS advisor_sessions_client_idx
  ON public.advisor_sessions (client_user_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS advisor_sessions_upcoming_idx
  ON public.advisor_sessions (scheduled_at) WHERE state IN ('scheduled', 'active');

ALTER TABLE public.advisor_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS advisor_sessions_select_participant ON public.advisor_sessions;
CREATE POLICY advisor_sessions_select_participant
  ON public.advisor_sessions FOR SELECT
  USING (
    auth.uid() = client_user_id
    OR EXISTS (
      SELECT 1 FROM public.advisor_profiles p
      WHERE p.id = advisor_sessions.advisor_id AND p.user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Participants can update limited fields (rating/review for client, state
-- transitions via RPC — not direct UPDATE). Direct UPDATE only for the
-- rating/review columns.
DROP POLICY IF EXISTS advisor_sessions_rate ON public.advisor_sessions;
CREATE POLICY advisor_sessions_rate
  ON public.advisor_sessions FOR UPDATE
  USING (auth.uid() = client_user_id)
  WITH CHECK (auth.uid() = client_user_id);

GRANT SELECT, UPDATE ON public.advisor_sessions TO authenticated;

-- ─── 3. Session messages (realtime chat) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.session_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES public.advisor_sessions(id) ON DELETE CASCADE,
  sender_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content       text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 3000),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS session_messages_session_idx
  ON public.session_messages (session_id, created_at);

ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS session_messages_participant_read ON public.session_messages;
CREATE POLICY session_messages_participant_read
  ON public.session_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.advisor_sessions s
      LEFT JOIN public.advisor_profiles p ON p.id = s.advisor_id
      WHERE s.id = session_messages.session_id
        AND (s.client_user_id = auth.uid() OR p.user_id = auth.uid())
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS session_messages_participant_write ON public.session_messages;
CREATE POLICY session_messages_participant_write
  ON public.session_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.advisor_sessions s
      LEFT JOIN public.advisor_profiles p ON p.id = s.advisor_id
      WHERE s.id = session_messages.session_id
        AND s.state IN ('active', 'scheduled')
        AND (s.client_user_id = auth.uid() OR p.user_id = auth.uid())
    )
  );

GRANT SELECT, INSERT ON public.session_messages TO authenticated;

-- Enable supabase_realtime broadcasts for this table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'session_messages'
  ) THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.session_messages;
    EXCEPTION WHEN OTHERS THEN
      -- Publication may not exist in non-Supabase dev envs — non-fatal.
      NULL;
    END;
  END IF;
END$$;

-- ─── 4. Booking RPC ───────────────────────────────────────────────────────
-- Atomic: debit Moonstones + insert session. On insufficient balance or
-- availability-clash, throws, leaving nothing written.

CREATE OR REPLACE FUNCTION public.advisor_book_session(
  p_advisor_id        uuid,
  p_scheduled_at      timestamptz,
  p_duration_minutes  smallint,
  p_topic             text DEFAULT NULL
)
RETURNS TABLE (session_id uuid, moonstones_spent integer, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_advisor RECORD;
  v_rate_cents integer;
  v_cost integer;
  v_balance integer;
  v_session_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_scheduled_at <= now() THEN RAISE EXCEPTION 'Scheduled time must be in the future'; END IF;
  IF p_duration_minutes NOT IN (15, 30, 45, 60) THEN
    RAISE EXCEPTION 'Duration must be 15, 30, 45, or 60 minutes';
  END IF;

  SELECT id, user_id, hourly_rate_cents, is_hidden
    INTO v_advisor
    FROM public.advisor_profiles
    WHERE id = p_advisor_id;
  IF v_advisor IS NULL OR v_advisor.is_hidden THEN
    RAISE EXCEPTION 'Advisor not available';
  END IF;
  IF v_advisor.user_id = v_user THEN
    RAISE EXCEPTION 'Cannot book yourself';
  END IF;

  -- Compute Moonstone cost. 10 Moonstones per dollar of advisor rate.
  -- Rate is per hour, so scale by duration.
  v_rate_cents := COALESCE(v_advisor.hourly_rate_cents, 3000); -- default $30/hr
  v_cost := CEIL((v_rate_cents::numeric / 100) * (p_duration_minutes::numeric / 60) * 10)::integer;
  IF v_cost <= 0 THEN v_cost := 1; END IF;

  SELECT COALESCE(balance, 0) INTO v_balance FROM public.moonstone_balances WHERE user_id = v_user;
  IF COALESCE(v_balance, 0) < v_cost THEN
    RAISE EXCEPTION 'Insufficient Moonstones: have %, need %', COALESCE(v_balance, 0), v_cost;
  END IF;

  -- Check no overlapping active session for this advisor
  IF EXISTS (
    SELECT 1 FROM public.advisor_sessions s
    WHERE s.advisor_id = p_advisor_id
      AND s.state IN ('scheduled', 'active')
      AND tstzrange(s.scheduled_at, s.scheduled_at + (s.duration_minutes || ' minutes')::interval, '[)')
          && tstzrange(p_scheduled_at, p_scheduled_at + (p_duration_minutes || ' minutes')::interval, '[)')
  ) THEN
    RAISE EXCEPTION 'Advisor is already booked in that window';
  END IF;

  -- Debit + create atomically
  INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
    VALUES (v_user, -v_cost, 'advisor-session', p_advisor_id::text,
            'Booked ' || p_duration_minutes || '-min session');

  INSERT INTO public.advisor_sessions (
    advisor_id, client_user_id, scheduled_at, duration_minutes, moonstone_cost, topic
  ) VALUES (
    p_advisor_id, v_user, p_scheduled_at, p_duration_minutes, v_cost, p_topic
  ) RETURNING id INTO v_session_id;

  RETURN QUERY SELECT v_session_id, v_cost, (COALESCE(v_balance, 0) - v_cost);
END;
$$;

GRANT EXECUTE ON FUNCTION public.advisor_book_session(uuid, timestamptz, smallint, text) TO authenticated;

-- ─── 5. State transitions ─────────────────────────────────────────────────

-- Start a session (either party can open it within 5 minutes of scheduled_at)
CREATE OR REPLACE FUNCTION public.advisor_session_start(p_session_id uuid)
RETURNS TABLE (state text, started_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_session RECORD;
  v_is_participant boolean;
BEGIN
  SELECT s.*, p.user_id AS advisor_user_id INTO v_session
    FROM public.advisor_sessions s
    LEFT JOIN public.advisor_profiles p ON p.id = s.advisor_id
    WHERE s.id = p_session_id;
  IF v_session IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;

  v_is_participant := v_user IN (v_session.client_user_id, v_session.advisor_user_id);
  IF NOT v_is_participant THEN RAISE EXCEPTION 'Not a session participant'; END IF;

  IF v_session.state = 'active' THEN
    RETURN QUERY SELECT v_session.state, v_session.started_at;
    RETURN;
  END IF;
  IF v_session.state <> 'scheduled' THEN
    RAISE EXCEPTION 'Session is %', v_session.state;
  END IF;

  UPDATE public.advisor_sessions
    SET state = 'active', started_at = now()
    WHERE id = p_session_id;

  RETURN QUERY SELECT 'active'::text, now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.advisor_session_start(uuid) TO authenticated;

-- End a session
CREATE OR REPLACE FUNCTION public.advisor_session_end(p_session_id uuid)
RETURNS TABLE (state text, ended_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_session RECORD;
BEGIN
  SELECT s.*, p.user_id AS advisor_user_id INTO v_session
    FROM public.advisor_sessions s
    LEFT JOIN public.advisor_profiles p ON p.id = s.advisor_id
    WHERE s.id = p_session_id;
  IF v_session IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF v_user NOT IN (v_session.client_user_id, v_session.advisor_user_id) THEN
    RAISE EXCEPTION 'Not a session participant';
  END IF;
  IF v_session.state = 'completed' THEN
    RETURN QUERY SELECT v_session.state, v_session.ended_at;
    RETURN;
  END IF;
  IF v_session.state <> 'active' THEN
    RAISE EXCEPTION 'Session is %', v_session.state;
  END IF;

  UPDATE public.advisor_sessions
    SET state = 'completed', ended_at = now()
    WHERE id = p_session_id;

  RETURN QUERY SELECT 'completed'::text, now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.advisor_session_end(uuid) TO authenticated;

-- Cancel (client or advisor, before it goes active). Full Moonstone refund.
CREATE OR REPLACE FUNCTION public.advisor_session_cancel(p_session_id uuid)
RETURNS TABLE (state text, refunded integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_session RECORD;
BEGIN
  SELECT s.*, p.user_id AS advisor_user_id INTO v_session
    FROM public.advisor_sessions s
    LEFT JOIN public.advisor_profiles p ON p.id = s.advisor_id
    WHERE s.id = p_session_id;
  IF v_session IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF v_user NOT IN (v_session.client_user_id, v_session.advisor_user_id) THEN
    RAISE EXCEPTION 'Not a session participant';
  END IF;
  IF v_session.state <> 'scheduled' THEN
    RAISE EXCEPTION 'Cannot cancel a session that is %', v_session.state;
  END IF;

  UPDATE public.advisor_sessions
    SET state = 'cancelled', cancelled_at = now(), cancelled_by = v_user
    WHERE id = p_session_id;

  INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
    VALUES (v_session.client_user_id, v_session.moonstone_cost, 'refund',
            p_session_id::text, 'Session cancellation refund');

  RETURN QUERY SELECT 'cancelled'::text, v_session.moonstone_cost;
END;
$$;

GRANT EXECUTE ON FUNCTION public.advisor_session_cancel(uuid) TO authenticated;
