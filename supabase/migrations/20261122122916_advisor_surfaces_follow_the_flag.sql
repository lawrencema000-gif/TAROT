/*
  # The advisors and live-rooms flags hold on the server too (social-ai-02)

  Production builds stop honouring ?ff_<key> (featureFlagEval.overridesAllowed).
  This file makes the flags hold where no browser decides: a direct API call,
  a smoke or preview build (they use this project), an old Android bundle.
  The five advisor money RPCs stay closed (20260817020000). Flag values are
  not touched.

  It also keeps the flags' allow-lists private (FWP-02). The table is renamed
  feature_flag_settings and closed to clients; feature_flags becomes a view
  with the same columns, whose allowed_user_ids shows only the caller's own
  id, and only when the caller is on the list. The client, and every
  installed build, keep their query and get the same answer for themselves.
  Change flags and allow-lists in feature_flag_settings from now on.
*/

-- 0. Allow-lists stay private (FWP-02). This comes first, so that
--    feature_on_for_me (section 1) is created against feature_flag_settings.

ALTER TABLE public.feature_flags RENAME TO feature_flag_settings;
REVOKE ALL ON public.feature_flag_settings FROM PUBLIC, anon, authenticated;

-- Owner-run view under the old name: every column as before, but the allow-list shows
-- only the caller's own id, and only when the caller is on it (FWP-02).
CREATE VIEW public.feature_flags WITH (security_barrier = true) AS
  SELECT key, description, enabled, rollout_percent,
         CASE WHEN (SELECT auth.uid()) = ANY (allowed_user_ids)
              THEN ARRAY[(SELECT auth.uid())]::uuid[] ELSE '{}'::uuid[] END AS allowed_user_ids,
         created_at, updated_at
    FROM public.feature_flag_settings;

-- Read-only for clients. A new relation in public starts with ALL for anon and
-- authenticated (Supabase's default privileges), and this view reads the table
-- as its owner, past the table's RLS, so the REVOKE comes before the GRANT.
REVOKE ALL ON public.feature_flags FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.feature_flags TO anon, authenticated, service_role;

COMMENT ON TABLE public.feature_flag_settings IS
  'Feature flags. Change enabled, rollout_percent and allowed_user_ids here. Clients read the feature_flags view, which shows each member only their own place on an allow-list (FWP-02).';
COMMENT ON VIEW public.feature_flags IS
  'Read-only view of feature_flag_settings for clients: allowed_user_ids holds only the caller''s own id, and only when the caller is on the list (FWP-02). Change flags in feature_flag_settings.';

-- 1. The client's evaluation (src/utils/featureFlagEval.ts evaluate(), and
--    supabase/functions/_shared/feature-flags.ts isFlagEnabled()), in SQL,
--    minus the dev-only ?ff_ overrides and smoke mode, plus admins.

CREATE OR REPLACE FUNCTION public.feature_bucket(p_subject text, p_key text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = pg_catalog
AS $$
DECLARE
  -- 32-bit FNV-1a over `${subject}:${key}`, as userBucket() computes it:
  -- offset basis 2166136261, prime 16777619, modulo 2^32, then % 100.
  -- ascii() is the code point, equal to JS charCodeAt for the ASCII uuids
  -- and keys hashed here.
  h bigint := 2166136261;
  s text := p_subject || ':' || p_key;
BEGIN
  FOR i IN 1 .. length(s) LOOP
    h := ((h # ascii(substr(s, i, 1))::bigint) * 16777619) & 4294967295;
  END LOOP;
  RETURN (h % 100)::integer;
END;
$$;

-- Only its owner calls it (from feature_on_for_me, which runs as its owner).
REVOKE ALL ON FUNCTION public.feature_bucket(text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.feature_on_for_me(p_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  -- On for an admin (so the owner can test with the flag off), for a member
  -- on the allow-list, for everyone at enabled + 100 %, and for the members
  -- whose bucket falls under a partial rollout. A boolean, never an error,
  -- so a policy refuses cleanly; it never returns an id. Unknown key = off.
  SELECT COALESCE(public.is_admin(), false) OR EXISTS (
    SELECT 1
    FROM public.feature_flag_settings f
    CROSS JOIN (SELECT auth.uid() AS uid) me
    WHERE f.key = p_key
      AND (
        (me.uid IS NOT NULL AND me.uid = ANY (f.allowed_user_ids))
        OR (f.enabled AND f.rollout_percent >= 100)
        OR (me.uid IS NOT NULL AND f.rollout_percent > 0
            AND public.feature_bucket(me.uid::text, f.key) < f.rollout_percent)
      )
  );
$$;

REVOKE ALL ON FUNCTION public.feature_on_for_me(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.feature_on_for_me(text) TO authenticated;

-- 2. ID and selfie uploads only while 'advisors' is on for the caller.
--    "verification read own" and "verification delete own" stay as they are.
DROP POLICY IF EXISTS "verification upload own" ON storage.objects;
CREATE POLICY "verification upload own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'advisor-verification'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND public.feature_on_for_me('advisors')
  );

-- 3. A submission starts pending and unreviewed, and only while 'advisors' is on.
--    AdvisorVerifyPage.tsx already sends status 'pending' and no reviewer fields.
DROP POLICY IF EXISTS advisor_verifications_insert_own ON public.advisor_verifications;
CREATE POLICY advisor_verifications_insert_own
  ON public.advisor_verifications FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND status = 'pending'
    AND admin_notes IS NULL
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND public.feature_on_for_me('advisors')
  );

REVOKE ALL ON public.advisor_verifications FROM PUBLIC, anon;
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.advisor_verifications FROM authenticated;

-- 4. Live rooms: only an admin creates a room (no client does); a host edits
--    and deletes their own. live_rooms_public_read (SELECT, authenticated) stays.
DROP POLICY IF EXISTS live_rooms_host_manage ON public.live_rooms;
DROP POLICY IF EXISTS live_rooms_host_update ON public.live_rooms;
DROP POLICY IF EXISTS live_rooms_host_delete ON public.live_rooms;
DROP POLICY IF EXISTS live_rooms_admin_insert ON public.live_rooms;
CREATE POLICY live_rooms_host_update ON public.live_rooms
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = host_user_id OR public.is_admin())
  WITH CHECK ((SELECT auth.uid()) = host_user_id OR public.is_admin());
CREATE POLICY live_rooms_host_delete ON public.live_rooms
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = host_user_id OR public.is_admin());
CREATE POLICY live_rooms_admin_insert ON public.live_rooms
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
REVOKE ALL ON public.live_rooms FROM PUBLIC, anon;

-- 5. The two Moonstone RPCs refuse while 'live-rooms' is off for the caller.
--    Each is its first definition, copied verbatim (20260511000000_live_rooms.sql
--    and 20260515000000_live_room_recordings.sql), with only the three-line gate
--    added after the sign-in check. The same signatures, so CREATE OR REPLACE
--    keeps their grants. The message and errcode match assert_feature_enabled
--    (20260817010000), which reads `enabled` only; feature_on_for_me is used
--    instead so that server and UI agree on partial rollouts and allow-lists.

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
  IF NOT public.feature_on_for_me('live-rooms') THEN
    RAISE EXCEPTION 'Feature live-rooms is not enabled' USING ERRCODE = '42501';
  END IF;
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
  IF NOT public.feature_on_for_me('live-rooms') THEN
    RAISE EXCEPTION 'Feature live-rooms is not enabled' USING ERRCODE = '42501';
  END IF;
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

NOTIFY pgrst, 'reload schema';
