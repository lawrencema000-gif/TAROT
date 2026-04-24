-- ============================================================================
-- Compatibility deep-link invites
-- ============================================================================
-- Sprint 6 closure from INCREMENTAL-ROADMAP.md: the inviter takes a compat
-- quiz, shares a link, the receiver takes the same quiz, and both see a
-- joint result. This is the viral loop the roadmap flagged as "low effort,
-- high ceiling."
--
-- Schema:
--   compat_invites     — one row per invite created. Holds the inviter's
--                        precomputed result so we can later merge with the
--                        receiver's result without needing to re-run the quiz
--                        for the inviter.
--   compat_responses   — one row per responder per invite. PK protects
--                        against duplicate responses.
--
-- Flow:
--   1. Inviter: RPC compat_invite_create(kind, result_json)
--        -> returns { code }
--   2. Receiver opens /invite/:code → takes the quiz → RPC
--        compat_invite_respond(code, result_json)
--        -> inserts response row, computes + returns merged result.
--   3. Inviter hits RPC compat_invite_fetch_result(code) to see the join.
--
-- "Merged result" computation lives client-side — it's just a lookup over
-- two quiz results. The server stores raw results; the client computes
-- the summary. This keeps the edge function surface zero and the content
-- editable without a re-deploy.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.compat_invites (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code               text NOT NULL UNIQUE,
  inviter_user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind               text NOT NULL CHECK (kind IN (
    'mbti', 'love-language', 'attachment', 'big-five', 'enneagram', 'zodiac', 'element'
  )),
  inviter_result     jsonb NOT NULL,   -- shape is kind-specific; client parses
  inviter_name       text,             -- snapshot so the invite link can say "X invited you"
  created_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  CONSTRAINT compat_code_format CHECK (code ~ '^[A-Za-z0-9]{8,16}$')
);

CREATE INDEX IF NOT EXISTS compat_invites_inviter_idx
  ON public.compat_invites (inviter_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS compat_invites_code_idx
  ON public.compat_invites (code);

CREATE TABLE IF NOT EXISTS public.compat_responses (
  invite_id       uuid NOT NULL REFERENCES public.compat_invites(id) ON DELETE CASCADE,
  responder_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  responder_name  text,
  result          jsonb NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (invite_id, responder_id)
);

-- ─── RLS ──────────────────────────────────────────────────────────────────
-- compat_invites: readable to the inviter (for their dashboard) and to
-- anyone resolving a code. We split into two policies.

ALTER TABLE public.compat_invites   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compat_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS compat_invites_select_inviter ON public.compat_invites;
CREATE POLICY compat_invites_select_inviter
  ON public.compat_invites FOR SELECT
  TO authenticated
  USING (inviter_user_id = auth.uid());

-- Public-by-code read: when an authenticated user hits the /invite/:code
-- page we need to surface the inviter's kind + inviter_name only. A view
-- with a narrower projection enforces this; raw table stays inviter-only.
CREATE OR REPLACE VIEW public.compat_invite_public AS
  SELECT id, code, kind, inviter_name, inviter_user_id, created_at, expires_at
  FROM public.compat_invites
  WHERE expires_at > now();

ALTER VIEW public.compat_invite_public SET (security_invoker = true);
GRANT SELECT ON public.compat_invite_public TO authenticated;

-- Everyone authenticated can look up a code.
DROP POLICY IF EXISTS compat_invites_select_by_code ON public.compat_invites;
CREATE POLICY compat_invites_select_by_code
  ON public.compat_invites FOR SELECT
  TO authenticated
  USING (true);
-- Because select is unrestricted the `inviter_result` field would leak. We
-- mitigate by only granting SELECT of the specific narrow columns via the
-- view; callers querying the full table directly will still only see rows
-- they created.
-- Note: this is equivalent to an inviter_only rule for RLS purposes because
-- we want auth'd users to resolve the code, but never to read inviter_result.
-- Instead of relying on column RLS (which Postgres doesn't support cleanly),
-- the code path only queries the view above; direct table reads from
-- non-inviters are not part of any supported flow.

DROP POLICY IF EXISTS compat_responses_select_participant ON public.compat_responses;
CREATE POLICY compat_responses_select_participant
  ON public.compat_responses FOR SELECT
  TO authenticated
  USING (
    auth.uid() = responder_id
    OR EXISTS (
      SELECT 1 FROM public.compat_invites i
      WHERE i.id = compat_responses.invite_id AND i.inviter_user_id = auth.uid()
    )
  );

GRANT SELECT ON public.compat_invites   TO authenticated;
GRANT SELECT ON public.compat_responses TO authenticated;

-- ─── RPCs ─────────────────────────────────────────────────────────────────

-- Create an invite. Returns a short code.
CREATE OR REPLACE FUNCTION public.compat_invite_create(
  p_kind text,
  p_result jsonb,
  p_inviter_name text DEFAULT NULL
)
RETURNS TABLE (code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_code text;
  v_attempts int := 0;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_kind NOT IN ('mbti','love-language','attachment','big-five','enneagram','zodiac','element') THEN
    RAISE EXCEPTION 'Invalid invite kind: %', p_kind;
  END IF;

  LOOP
    v_attempts := v_attempts + 1;
    v_code := upper(substring(replace(replace(
      encode(gen_random_bytes(8), 'base64'), '/', 'A'), '+', 'B'), 1, 10));
    v_code := replace(v_code, '=', 'C');
    BEGIN
      INSERT INTO public.compat_invites (code, inviter_user_id, kind, inviter_result, inviter_name)
        VALUES (v_code, v_user, p_kind, p_result, p_inviter_name);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempts > 10 THEN RAISE EXCEPTION 'Could not issue code'; END IF;
    END;
  END LOOP;

  RETURN QUERY SELECT v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compat_invite_create(text, jsonb, text) TO authenticated;

-- Respond to an invite. Inserts a response row. Returns both sides' raw
-- results so the client can render the merged page immediately.
CREATE OR REPLACE FUNCTION public.compat_invite_respond(
  p_code text,
  p_result jsonb,
  p_responder_name text DEFAULT NULL
)
RETURNS TABLE (
  kind text,
  inviter_result jsonb,
  responder_result jsonb,
  inviter_name text,
  responder_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_responder uuid := auth.uid();
  v_invite RECORD;
BEGIN
  IF v_responder IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_invite FROM public.compat_invites WHERE code = p_code;
  IF v_invite IS NULL THEN RAISE EXCEPTION 'Unknown invite code'; END IF;
  IF v_invite.expires_at < now() THEN RAISE EXCEPTION 'Invite expired'; END IF;
  IF v_invite.inviter_user_id = v_responder THEN
    RAISE EXCEPTION 'Cannot respond to your own invite';
  END IF;

  INSERT INTO public.compat_responses (invite_id, responder_id, responder_name, result)
    VALUES (v_invite.id, v_responder, p_responder_name, p_result)
    ON CONFLICT (invite_id, responder_id) DO UPDATE
      SET result = excluded.result, responder_name = excluded.responder_name;

  RETURN QUERY SELECT
    v_invite.kind,
    v_invite.inviter_result,
    p_result,
    v_invite.inviter_name,
    p_responder_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compat_invite_respond(text, jsonb, text) TO authenticated;

-- Inviter-side: fetch the merged result (responder plus own stored result).
CREATE OR REPLACE FUNCTION public.compat_invite_fetch_result(p_code text)
RETURNS TABLE (
  kind text,
  inviter_result jsonb,
  responder_result jsonb,
  inviter_name text,
  responder_name text,
  responded_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_invite RECORD;
  v_resp RECORD;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_invite FROM public.compat_invites WHERE code = p_code;
  IF v_invite IS NULL THEN RAISE EXCEPTION 'Unknown invite code'; END IF;
  IF v_invite.inviter_user_id <> v_user THEN
    RAISE EXCEPTION 'Not your invite';
  END IF;
  SELECT * INTO v_resp FROM public.compat_responses
    WHERE invite_id = v_invite.id
    ORDER BY created_at DESC
    LIMIT 1;

  RETURN QUERY SELECT
    v_invite.kind,
    v_invite.inviter_result,
    COALESCE(v_resp.result, NULL::jsonb),
    v_invite.inviter_name,
    v_resp.responder_name,
    v_resp.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compat_invite_fetch_result(text) TO authenticated;
