/*
  # Community: name the authors who chose to be named, keep the anonymous ones anonymous

  ## The bug (P7 review #53)
  The feed embeds the author through profiles!community_*_user_id_profiles_fkey
  (20261003000002), but profiles RLS is own-row only, so the embed is null for
  every other member and the UI signs their posts "User". "Post anonymously"
  meant nothing, because nobody was ever named.

  ## Names need anonymity first
  Before this migration every member can read community_posts.user_id and
  community_comments.user_id on every row, anonymous ones included. Next to a
  name on the named rows, that id attributes every Whispering Well post.

  ## The rule this migration enforces
  An anonymous post or comment never reveals its author to anyone but the
  author and the service role: not through the base tables, the views, the
  block tables, an RPC result, an error text, the account export, or a change
  in which rows the viewer sees.

  The first draft of this file broke that rule and the shipped clients
  (P8 F00, F35, F36): its block RPC wrote the resolved anonymous author into
  community_blocks, where the blocker reads blocked_id back (block, select,
  unblock: three REST calls named any whisperer); its views hid a blocked
  named author's anonymous rows (an oracle); and its column revoke on user_id
  failed every feed and comment query of the live web bundle and Android
  v1.2.0. This version replaces it.

  ## What it does
  1. Base tables: a member reads named visible rows and their own rows. Other
     members' anonymous rows are not returned at all, so user_id stays
     selectable (the shipped clients select it) without naming anyone. anon
     has no SELECT policy left: it reads nothing (empty result, no error).
     Any other permissive read policy on posts, comments or reactions is
     dropped (with a NOTICE naming it): one would OR the anonymous rows back.
  2. community_reactions: a member reads only their own reactions (both client
     generations only ever ask for those). Every reactor's id was readable by
     anyone, anon included.
  3. community_posts is no longer member-updatable. No client updates a post;
     the update-own policy let an author PATCH their own flagged or pending
     post to moderation_status = 'allowed', un-hide a reported one, or rewrite
     it after it was approved.
  4. public.community_anonymous_blocks: a block made from an anonymous row.
     Members cannot read or write it; the RPCs below do. It hides only that
     author's anonymous content. A block made from a named row stays in
     community_blocks and hides only named content. So blocking a named
     author never changes which anonymous rows the blocker sees, and blocking
     from an anonymous row never changes which named rows they see. A
     separate table (rather than a hidden column on community_blocks) also
     means a member's direct insert into community_blocks can never collide
     with, and so never test for, an anonymous block.
  5. public.community_feed_posts / public.community_feed_comments: the read
     path of the new client. Owner-run views (they must return other members'
     anonymous rows, which the base policy now withholds), so each repeats the
     visibility predicate of 20260807120000 (visible when not hidden and
     moderation_status = 'allowed', or own), plus:
       - author_id, author_display_name and author_avatar_seed only on named
         rows; NULL on every anonymous row, the caller's own included (is_mine
         says which rows are theirs);
       - the caller's blocks, applied as in 4.
     Supabase's advisor reports both as security-definer views; that is the
     point of them, and each one filters by auth.uid() itself.
  6. RPCs (authenticated only):
       community_block_author(post | comment) — block whoever wrote a row the
         caller can see, without learning who it is. Same answer for named and
         anonymous rows; a failure never echoes the row.
       community_my_blocks() — the caller's blocks, keyed by block id. An
         anonymous block carries no author. A named block carries the member's
         id (already readable in community_blocks) and their display name only
         when they have visible named content, so the list is never a way to
         look up the name behind an arbitrary id.
       community_unblock(block_id) — either kind.
  7. Moderation: community_flagged_queue() and community_review_flagged(kind,
     id, publish), admins only (public.is_admin(), as the moderation_events
     and crisis_flags policies). A flagged post or comment was visible to its
     author only, and nothing could publish it. Publish sets 'allowed'; keep
     hidden sets 'blocked' (the author still sees their own row). The queue
     returns no author ids.

  ## Accepted property
  Blocking from an anonymous row hides that author's other anonymous rows too:
  that is what blocking an anonymous harasser means, and it tells the blocker
  those rows share an author. It never tells them who the author is.

  ## Compatibility
  The live web bundle and Android v1.2.0 (both CommunityPage-FnWd-z1C.js)
  select id, user_id, … profiles:user_id(display_name, avatar_seed) from both
  tables, read and insert their own community_blocks, read their own
  reactions, delete and insert their own reactions, insert reports, and
  publish through community-moderate (service role). Every one of those
  queries still succeeds. They no longer receive other members' anonymous
  rows: their Whispering Well shows the reader's own whispers until they
  update.

  ## Deploy order
  Either order is safe: nothing fails either way. The Phase 7 client reads the
  views and falls back to the base tables (filtering blocked authors itself,
  offering "Block user" on named rows only) while they are missing, and picks
  them up within ten minutes of the push. The old clients keep working once
  this is in, degraded as above. Best right after the web deploy: then no web
  visitor ever sees the old bundle's degraded Whispering Well.
*/

-- ── 1. Base tables: named rows, plus your own ───────────────────────────────

-- Table-level SELECT for members, as 20260427000000 granted it. (Restates it
-- in case a database ever ran the first draft, which replaced it with a
-- column list that left out user_id.)
GRANT SELECT ON public.community_posts TO authenticated;
GRANT SELECT ON public.community_comments TO authenticated;

DROP POLICY IF EXISTS community_posts_select_visible ON public.community_posts;
CREATE POLICY community_posts_select_visible ON public.community_posts
  FOR SELECT TO authenticated
  USING (
    (is_hidden = false AND moderation_status = 'allowed' AND is_anonymous = false)
    OR (SELECT auth.uid()) = user_id
  );

DROP POLICY IF EXISTS community_comments_select_visible ON public.community_comments;
CREATE POLICY community_comments_select_visible ON public.community_comments
  FOR SELECT TO authenticated
  USING (
    (is_hidden = false AND moderation_status = 'allowed' AND is_anonymous = false)
    OR (SELECT auth.uid()) = user_id
  );

-- ── 2. Reactions: your own ──────────────────────────────────────────────────

DROP POLICY IF EXISTS community_reactions_select_all ON public.community_reactions;
DROP POLICY IF EXISTS community_reactions_select_own ON public.community_reactions;
CREATE POLICY community_reactions_select_own ON public.community_reactions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Permissive policies OR together: any other read policy on these tables
-- (one added in the dashboard, say) would hand the anonymous rows straight
-- back. The three above are the whole read surface; drop anything else that
-- can read. Restrictive policies only narrow access and are left alone.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.tablename, p.policyname
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename IN ('community_posts', 'community_comments', 'community_reactions')
      AND p.cmd IN ('SELECT', 'ALL')
      AND p.permissive = 'PERMISSIVE'
      AND p.policyname NOT IN (
        'community_posts_select_visible',
        'community_comments_select_visible',
        'community_reactions_select_own'
      )
  LOOP
    RAISE NOTICE '20261003000014: dropping read policy % on public.%', r.policyname, r.tablename;
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ── 3. Posts are not member-updatable ───────────────────────────────────────

DROP POLICY IF EXISTS community_posts_update_own ON public.community_posts;
REVOKE UPDATE ON public.community_posts FROM PUBLIC, anon, authenticated;

-- ── 4. Blocks made from anonymous rows ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_anonymous_blocks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The row the block was made from (support only; never returned to members).
  source_post_id    uuid REFERENCES public.community_posts(id) ON DELETE SET NULL,
  source_comment_id uuid REFERENCES public.community_comments(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

COMMENT ON TABLE public.community_anonymous_blocks IS
  'Blocks made from an anonymous post or comment. Members never read blocked_id: the feed views apply these to anonymous rows only, and community_my_blocks / community_unblock work by block id. See 20261003000014.';

ALTER TABLE public.community_anonymous_blocks ENABLE ROW LEVEL SECURITY;
-- No policies: members reach it only through the SECURITY DEFINER functions.
REVOKE ALL ON public.community_anonymous_blocks FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.community_anonymous_blocks TO service_role;

-- ── 5. Read views ───────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.community_feed_posts
WITH (security_barrier = true) AS
SELECT
  cp.id,
  cp.topic,
  cp.content,
  cp.is_anonymous,
  cp.reaction_count,
  cp.comment_count,
  cp.is_hidden,
  cp.moderation_status,
  cp.created_at,
  cp.updated_at,
  CASE WHEN cp.is_anonymous THEN NULL ELSE cp.user_id END AS author_id,
  (cp.user_id = me.uid) AS is_mine,
  CASE WHEN cp.is_anonymous THEN NULL ELSE p.display_name END AS author_display_name,
  CASE WHEN cp.is_anonymous THEN NULL ELSE p.avatar_seed END AS author_avatar_seed
FROM public.community_posts cp
CROSS JOIN (SELECT auth.uid() AS uid) me
LEFT JOIN public.profiles p ON p.id = cp.user_id AND cp.is_anonymous = false
WHERE me.uid IS NOT NULL
  AND ((cp.is_hidden = false AND cp.moderation_status = 'allowed') OR cp.user_id = me.uid)
  AND NOT EXISTS (
    SELECT 1 FROM public.community_blocks b
    WHERE cp.is_anonymous = false AND b.blocker_id = me.uid AND b.blocked_id = cp.user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.community_anonymous_blocks ab
    WHERE cp.is_anonymous = true AND ab.blocker_id = me.uid AND ab.blocked_id = cp.user_id
  );

COMMENT ON VIEW public.community_feed_posts IS
  'Feed read path. Owner-run: repeats the visibility of community_posts_select_visible (20260807120000), names only named rows, applies the caller''s named blocks to named rows and anonymous blocks to anonymous rows. See 20261003000014.';

CREATE OR REPLACE VIEW public.community_feed_comments
WITH (security_barrier = true) AS
SELECT
  cc.id,
  cc.post_id,
  cc.parent_id,
  cc.content,
  cc.is_anonymous,
  cc.is_hidden,
  cc.moderation_status,
  cc.created_at,
  CASE WHEN cc.is_anonymous THEN NULL ELSE cc.user_id END AS author_id,
  (cc.user_id = me.uid) AS is_mine,
  CASE WHEN cc.is_anonymous THEN NULL ELSE p.display_name END AS author_display_name,
  CASE WHEN cc.is_anonymous THEN NULL ELSE p.avatar_seed END AS author_avatar_seed
FROM public.community_comments cc
CROSS JOIN (SELECT auth.uid() AS uid) me
LEFT JOIN public.profiles p ON p.id = cc.user_id AND cc.is_anonymous = false
WHERE me.uid IS NOT NULL
  AND ((cc.is_hidden = false AND cc.moderation_status = 'allowed') OR cc.user_id = me.uid)
  AND NOT EXISTS (
    SELECT 1 FROM public.community_blocks b
    WHERE cc.is_anonymous = false AND b.blocker_id = me.uid AND b.blocked_id = cc.user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.community_anonymous_blocks ab
    WHERE cc.is_anonymous = true AND ab.blocker_id = me.uid AND ab.blocked_id = cc.user_id
  );

COMMENT ON VIEW public.community_feed_comments IS
  'Comment read path. Owner-run: repeats the visibility of community_comments_select_visible (20260807120000), names only named rows, applies the caller''s blocks as community_feed_posts does. See 20261003000014.';

REVOKE ALL ON public.community_feed_posts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.community_feed_comments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.community_feed_posts TO authenticated;
GRANT SELECT ON public.community_feed_comments TO authenticated;

-- ── 6. Blocking without learning who it is ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.community_block_author(
  p_post_id uuid DEFAULT NULL,
  p_comment_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_author uuid;
  v_anonymous boolean;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF (p_post_id IS NULL) = (p_comment_id IS NULL) THEN
    RAISE EXCEPTION 'pass exactly one of p_post_id, p_comment_id' USING ERRCODE = '22023';
  END IF;

  -- Only a row anyone may see. The caller's own rows answer false below.
  IF p_post_id IS NOT NULL THEN
    SELECT cp.user_id, cp.is_anonymous INTO v_author, v_anonymous
    FROM public.community_posts cp
    WHERE cp.id = p_post_id AND cp.is_hidden = false AND cp.moderation_status = 'allowed';
  ELSE
    SELECT cc.user_id, cc.is_anonymous INTO v_author, v_anonymous
    FROM public.community_comments cc
    WHERE cc.id = p_comment_id AND cc.is_hidden = false AND cc.moderation_status = 'allowed';
  END IF;

  IF v_author IS NULL OR v_author = v_me THEN
    RETURN false;
  END IF;

  -- A constraint or foreign-key error would quote the row, author id and all,
  -- back to the caller. None is expected; if one happens, say nothing.
  BEGIN
    IF v_anonymous THEN
      INSERT INTO public.community_anonymous_blocks (blocker_id, blocked_id, source_post_id, source_comment_id)
      VALUES (v_me, v_author, p_post_id, p_comment_id)
      ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
    ELSE
      INSERT INTO public.community_blocks (blocker_id, blocked_id)
      VALUES (v_me, v_author)
      ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'could not block' USING ERRCODE = 'P0001';
  END;
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.community_block_author(uuid, uuid) IS
  'Block the author of a visible post or comment without revealing them: named rows go to community_blocks, anonymous rows to community_anonymous_blocks. See 20261003000014.';

CREATE OR REPLACE FUNCTION public.community_my_blocks()
RETURNS TABLE (
  block_id uuid,
  kind text,
  blocked_id uuid,
  blocked_display_name text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    b.id,
    'named'::text,
    b.blocked_id,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM public.community_posts x
        WHERE x.user_id = b.blocked_id AND x.is_anonymous = false
          AND x.is_hidden = false AND x.moderation_status = 'allowed'
      ) OR EXISTS (
        SELECT 1 FROM public.community_comments y
        WHERE y.user_id = b.blocked_id AND y.is_anonymous = false
          AND y.is_hidden = false AND y.moderation_status = 'allowed'
      )
      THEN p.display_name
    END,
    b.created_at
  FROM public.community_blocks b
  LEFT JOIN public.profiles p ON p.id = b.blocked_id
  WHERE b.blocker_id = auth.uid()
  UNION ALL
  SELECT ab.id, 'anonymous'::text, NULL::uuid, NULL::text, ab.created_at
  FROM public.community_anonymous_blocks ab
  WHERE ab.blocker_id = auth.uid()
  ORDER BY 5 DESC;
$$;

CREATE OR REPLACE FUNCTION public.community_unblock(p_block_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_named integer := 0;
  v_anonymous integer := 0;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.community_blocks WHERE id = p_block_id AND blocker_id = v_me;
  GET DIAGNOSTICS v_named = ROW_COUNT;
  DELETE FROM public.community_anonymous_blocks WHERE id = p_block_id AND blocker_id = v_me;
  GET DIAGNOSTICS v_anonymous = ROW_COUNT;
  RETURN (v_named + v_anonymous) > 0;
END;
$$;

-- ── 7. Moderators decide on flagged rows ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.community_flagged_queue()
RETURNS TABLE (
  kind text,
  id uuid,
  post_id uuid,
  topic text,
  content text,
  is_anonymous boolean,
  categories text[],
  crisis_flagged boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admins only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT q.kind, q.id, q.post_id, q.topic, q.content, q.is_anonymous, q.categories, q.crisis_flagged, q.created_at
    FROM (
      SELECT 'post'::text AS kind, cp.id, NULL::uuid AS post_id, cp.topic, cp.content, cp.is_anonymous,
             cp.moderation_categories AS categories, cp.crisis_flagged, cp.created_at
      FROM public.community_posts cp
      WHERE cp.moderation_status = 'flagged'
      UNION ALL
      SELECT 'comment'::text, cc.id, cc.post_id, parent.topic, cc.content, cc.is_anonymous,
             cc.moderation_categories, cc.crisis_flagged, cc.created_at
      FROM public.community_comments cc
      JOIN public.community_posts parent ON parent.id = cc.post_id
      WHERE cc.moderation_status = 'flagged'
    ) q
    ORDER BY q.created_at ASC
    LIMIT 100;
END;
$$;

CREATE OR REPLACE FUNCTION public.community_review_flagged(
  p_kind text,
  p_id uuid,
  p_publish boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_status public.moderation_status :=
    CASE WHEN p_publish THEN 'allowed'::public.moderation_status ELSE 'blocked'::public.moderation_status END;
  v_rows integer := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admins only' USING ERRCODE = '42501';
  END IF;
  IF p_publish IS NULL THEN
    RAISE EXCEPTION 'p_publish is required' USING ERRCODE = '22023';
  END IF;
  IF p_kind = 'post' THEN
    UPDATE public.community_posts SET moderation_status = v_status
    WHERE id = p_id AND moderation_status = 'flagged';
  ELSIF p_kind = 'comment' THEN
    UPDATE public.community_comments SET moderation_status = v_status
    WHERE id = p_id AND moderation_status = 'flagged';
  ELSE
    RAISE EXCEPTION 'p_kind must be post or comment' USING ERRCODE = '22023';
  END IF;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.community_block_author(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.community_my_blocks() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.community_unblock(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.community_flagged_queue() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.community_review_flagged(text, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_block_author(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_my_blocks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_unblock(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_flagged_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_review_flagged(text, uuid, boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';
