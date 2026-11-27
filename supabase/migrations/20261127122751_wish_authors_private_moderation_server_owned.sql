/*
  # The Wishing Sky: no account ids, and moderation that stays put
  (social-ai-03, social-ai-06 / health-status-05)
  Members read their own rows of wishes and wish_echoes; the sky is read
  through id-free, owner-run views (wish_sky, wish_sky_links). Members hold
  no UPDATE on wishes; INSERT takes only the 8 columns clients send. Older
  clients keep working and show only the member's own stars until they update.
  Apply before the web deploy that reads the views.
*/

-- 1. Base tables: your own rows
DROP POLICY IF EXISTS wishes_select_visible ON public.wishes;
DROP POLICY IF EXISTS wishes_select_own ON public.wishes;
CREATE POLICY wishes_select_own ON public.wishes
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_admin());

DROP POLICY IF EXISTS wish_echoes_select_all ON public.wish_echoes;
DROP POLICY IF EXISTS wish_echoes_select_own ON public.wish_echoes;
CREATE POLICY wish_echoes_select_own ON public.wish_echoes
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Permissive policies OR together: drop any other read policy (one added in the dashboard, say).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.tablename, p.policyname FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename IN ('wishes', 'wish_echoes')
      AND p.cmd IN ('SELECT', 'ALL') AND p.permissive = 'PERMISSIVE'
      AND p.policyname NOT IN ('wishes_select_own', 'wish_echoes_select_own')
  LOOP
    RAISE NOTICE 'dropping read policy % on public.%', r.policyname, r.tablename;
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 2. Grants: name every grantee, or the revoke is decorative
REVOKE ALL ON public.wishes       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.wish_echoes  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.wish_reports FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.wish_offers  FROM PUBLIC, anon, authenticated;

GRANT SELECT, DELETE ON public.wishes TO authenticated;
-- Exactly the keys makeWish sends, on the web and in the synced Android bundle.
GRANT INSERT (user_id, text, theme, open_to_help, wisher_label, star_x, star_y, star_seed)
  ON public.wishes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.wish_echoes TO authenticated;
GRANT SELECT, INSERT ON public.wish_reports TO authenticated;
GRANT SELECT, INSERT ON public.wish_offers TO authenticated;
-- respondToOffer writes the status only: a wisher can no longer rewrite a helper's message or helper_id.
GRANT UPDATE (status) ON public.wish_offers TO authenticated;
GRANT ALL ON public.wishes, public.wish_echoes, public.wish_reports, public.wish_offers TO service_role;

-- 3. Moderation and counters belong to the server
DROP POLICY IF EXISTS wishes_update_own ON public.wishes;
DROP POLICY IF EXISTS wishes_admin_update ON public.wishes;
-- wish_echo_count_sync and wish_report_autohide are SECURITY DEFINER, owned
-- by postgres: they keep updating echo_count, report_count, is_hidden and
-- moderation_status without any member UPDATE.

CREATE OR REPLACE FUNCTION public.wish_guard_server_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Not SECURITY DEFINER on purpose: current_user is whoever ran the UPDATE.
  -- The echo/report triggers and the admin function run as postgres, and
  -- service_role is not listed, so they pass. A future member UPDATE grant
  -- (an "edit my wish" feature) still cannot touch these columns.
  IF current_user IN ('anon', 'authenticated') AND (
       NEW.id IS DISTINCT FROM OLD.id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.is_hidden IS DISTINCT FROM OLD.is_hidden
    OR NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
    OR NEW.report_count IS DISTINCT FROM OLD.report_count
    OR NEW.echo_count IS DISTINCT FROM OLD.echo_count
    OR NEW.granted_at IS DISTINCT FROM OLD.granted_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.star_x IS DISTINCT FROM OLD.star_x
    OR NEW.star_y IS DISTINCT FROM OLD.star_y
    OR NEW.star_seed IS DISTINCT FROM OLD.star_seed
  ) THEN
    RAISE EXCEPTION 'This part of a wish is set by the server, not by its author.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wish_guard_server_columns ON public.wishes;
CREATE TRIGGER wish_guard_server_columns
  BEFORE UPDATE ON public.wishes
  FOR EACH ROW EXECUTE FUNCTION public.wish_guard_server_columns();

-- Stars stay on the map (live rows: x 0.045-0.98, y 0.40-0.94); also refuses NaN and Infinity.
ALTER TABLE public.wishes DROP CONSTRAINT IF EXISTS wishes_star_on_map;
ALTER TABLE public.wishes ADD CONSTRAINT wishes_star_on_map
  CHECK (star_x BETWEEN 0 AND 1 AND star_y BETWEEN 0 AND 1);

-- 4. Offers: the policies stop reading wishes as the caller (who now sees only their own)
CREATE OR REPLACE FUNCTION public.wish_is_mine(p_wish_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.wishes w WHERE w.id = p_wish_id AND w.user_id = (SELECT auth.uid()));
$$;

CREATE OR REPLACE FUNCTION public.wish_accepts_offer_from_me(p_wish_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.wishes w
    WHERE w.id = p_wish_id AND w.open_to_help = true AND w.is_hidden = false
      AND w.moderation_status = 'allowed' AND w.user_id <> (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.wish_is_mine(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wish_accepts_offer_from_me(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wish_is_mine(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wish_accepts_offer_from_me(uuid) TO authenticated;

DROP POLICY IF EXISTS wish_offers_select_parties ON public.wish_offers;
CREATE POLICY wish_offers_select_parties ON public.wish_offers
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = helper_id OR public.wish_is_mine(wish_id) OR public.is_admin());

DROP POLICY IF EXISTS wish_offers_insert_helper ON public.wish_offers;
CREATE POLICY wish_offers_insert_helper ON public.wish_offers
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = helper_id AND status = 'pending' AND public.wish_accepts_offer_from_me(wish_id));

DROP POLICY IF EXISTS wish_offers_update_wisher ON public.wish_offers;
CREATE POLICY wish_offers_update_wisher ON public.wish_offers
  FOR UPDATE TO authenticated
  USING (public.wish_is_mine(wish_id))
  WITH CHECK (public.wish_is_mine(wish_id));

-- 5. The sky, without account ids (owner-run views, like community_feed_posts)
CREATE OR REPLACE VIEW public.wish_sky
  (id, text, theme, star_x, star_y, star_seed, open_to_help, wisher_label,
   granted_at, echo_count, created_at, is_mine, echoed_by_me)
WITH (security_barrier = true) AS
SELECT
  w.id, w.text, w.theme, w.star_x, w.star_y, w.star_seed, w.open_to_help,
  w.wisher_label, w.granted_at, w.echo_count, w.created_at,
  COALESCE(w.user_id = me.uid, false),
  (me.uid IS NOT NULL AND EXISTS (
     SELECT 1 FROM public.wish_echoes e WHERE e.wish_id = w.id AND e.user_id = me.uid))
FROM public.wishes w
CROSS JOIN (SELECT auth.uid() AS uid) me
WHERE (w.is_hidden = false AND w.moderation_status = 'allowed') OR w.user_id = me.uid;

-- The bright lines: from each echoer's newest star in the viewer's sky to the
-- wish they echoed; both ends visible, never a star to itself, one row per pair.
-- buildLinks (src/dal/wishes.ts:292-313), moved here so no account id leaves the database.
CREATE OR REPLACE VIEW public.wish_sky_links (from_wish_id, to_wish_id)
WITH (security_barrier = true) AS
WITH me AS (SELECT auth.uid() AS uid),
sky AS (
  SELECT w.id, w.user_id, w.created_at FROM public.wishes w CROSS JOIN me
  WHERE (w.is_hidden = false AND w.moderation_status = 'allowed') OR w.user_id = me.uid
),
newest AS (
  SELECT DISTINCT ON (s.user_id) s.user_id, s.id AS wish_id
  FROM sky s ORDER BY s.user_id, s.created_at DESC, s.id DESC
),
pairs AS (
  SELECT n.wish_id AS from_wish_id, e.wish_id AS to_wish_id, e.created_at
  FROM public.wish_echoes e
  JOIN newest n ON n.user_id = e.user_id
  JOIN sky t ON t.id = e.wish_id
  WHERE n.wish_id <> e.wish_id
)
SELECT DISTINCT ON (LEAST(p.from_wish_id, p.to_wish_id), GREATEST(p.from_wish_id, p.to_wish_id))
  p.from_wish_id, p.to_wish_id
FROM pairs p
ORDER BY LEAST(p.from_wish_id, p.to_wish_id), GREATEST(p.from_wish_id, p.to_wish_id), p.created_at;

COMMENT ON VIEW public.wish_sky IS 'Wishing Sky read path. Owner-run: repeats the visibility of 20260817040000 and carries no account id (is_mine / echoed_by_me instead).';
COMMENT ON VIEW public.wish_sky_links IS 'Echo lines between stars, computed here so the client never needs account ids.';

REVOKE ALL ON public.wish_sky, public.wish_sky_links FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.wish_sky, public.wish_sky_links TO authenticated;
-- Interim: signed-out callers keep today's reach, minus the account ids.
-- D01 was answered "members only" (A); the next migration,
-- <timestamp>_wish_sky_members_only.sql (WS-25 option a), revokes this grant.
GRANT SELECT ON public.wish_sky, public.wish_sky_links TO anon;

-- 6. Admin review (no admin UI for wishes exists yet). Publishing resets
--    report_count, so three NEW reporters are needed to hide it again.
CREATE OR REPLACE FUNCTION public.wish_review_flagged(p_wish_id uuid, p_publish boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE v_rows integer := 0;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admins only' USING ERRCODE = '42501'; END IF;
  IF p_publish IS NULL THEN RAISE EXCEPTION 'p_publish is required' USING ERRCODE = '22023'; END IF;
  IF p_publish THEN
    UPDATE public.wishes SET is_hidden = false, moderation_status = 'allowed', report_count = 0
     WHERE id = p_wish_id AND moderation_status = 'flagged';
  ELSE
    UPDATE public.wishes SET is_hidden = true, moderation_status = 'blocked'
     WHERE id = p_wish_id AND moderation_status = 'flagged';
  END IF;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.wish_review_flagged(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wish_review_flagged(uuid, boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';
