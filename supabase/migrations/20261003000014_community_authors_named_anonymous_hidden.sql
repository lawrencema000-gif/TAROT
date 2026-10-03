/*
  # Community: name the authors who chose to be named, and hide the ones who did not

  ## The bug (P7 review #53)
  The feed embeds the author through profiles!community_*_user_id_profiles_fkey
  (20261003000002), but profiles RLS is own-row only, so the embed is null for
  every other member and the UI signs their posts "User". "Post anonymously"
  meant nothing, because nobody was ever named.

  ## Why a plain "expose display_name" fix is not enough
  Every member can read community_posts.user_id and community_comments.user_id
  on EVERY row, anonymous ones included (table-level SELECT, row policy only).
  The moment named posts show a name next to that same user_id, an anonymous
  Whispering Well post can be attributed by matching its user_id to the
  author's named posts. Showing names safely therefore requires that an
  anonymous row never reveals its author to anyone but the author.

  ## What this migration does
  1. public.community_feed_posts / public.community_feed_comments — the only
     read path for the feed. Owner-run views (they read user_id, which members
     no longer can), so each one repeats the row policy of its table verbatim
     (visible when not hidden and moderation_status = 'allowed', or own) and
     adds two things the policies never had:
       - author_id is NULL on an anonymous row unless the caller wrote it, and
         author_display_name / author_avatar_seed come only with a named row;
       - rows by authors the caller has blocked are left out (the client used
         to filter by user_id, which it no longer receives for anonymous rows).
     is_mine tells the client which rows are its own.
  2. user_id is no longer selectable on the base tables by anon/authenticated
     (column privileges: members keep the columns the app reads; user_id,
     reported_count, moderation_categories and crisis_flagged are not
     theirs to read). Row
     policies still reference user_id — policy expressions are not subject to
     the caller's column privileges — so delete-own and the force-pending
     insert path keep working. Service-role callers (community-moderate,
     account-export) are unaffected.
  3. public.community_block_author(post, comment) — block the author of a row
     you can see without ever learning who it is.
  4. The feed is members-only (every route is behind sign-in): anon loses
     SELECT on the base tables, and the views and the RPC are granted to
     authenticated only.
*/

-- ── 1. Read views ───────────────────────────────────────────────────────────

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
  CASE WHEN cp.is_anonymous AND cp.user_id IS DISTINCT FROM auth.uid() THEN NULL ELSE cp.user_id END AS author_id,
  (cp.user_id = auth.uid()) AS is_mine,
  CASE WHEN cp.is_anonymous THEN NULL ELSE p.display_name END AS author_display_name,
  CASE WHEN cp.is_anonymous THEN NULL ELSE p.avatar_seed END AS author_avatar_seed
FROM public.community_posts cp
LEFT JOIN public.profiles p ON p.id = cp.user_id
WHERE auth.uid() IS NOT NULL
  AND ((cp.is_hidden = false AND cp.moderation_status = 'allowed') OR cp.user_id = auth.uid())
  AND NOT EXISTS (
    SELECT 1 FROM public.community_blocks b
    WHERE b.blocker_id = auth.uid() AND b.blocked_id = cp.user_id
  );

COMMENT ON VIEW public.community_feed_posts IS
  'Feed read path. Owner-run: repeats community_posts_select_visible, hides anonymous authors and the caller''s blocked authors. See 20261003000014.';

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
  CASE WHEN cc.is_anonymous AND cc.user_id IS DISTINCT FROM auth.uid() THEN NULL ELSE cc.user_id END AS author_id,
  (cc.user_id = auth.uid()) AS is_mine,
  CASE WHEN cc.is_anonymous THEN NULL ELSE p.display_name END AS author_display_name,
  CASE WHEN cc.is_anonymous THEN NULL ELSE p.avatar_seed END AS author_avatar_seed
FROM public.community_comments cc
LEFT JOIN public.profiles p ON p.id = cc.user_id
WHERE auth.uid() IS NOT NULL
  AND ((cc.is_hidden = false AND cc.moderation_status = 'allowed') OR cc.user_id = auth.uid())
  AND NOT EXISTS (
    SELECT 1 FROM public.community_blocks b
    WHERE b.blocker_id = auth.uid() AND b.blocked_id = cc.user_id
  );

COMMENT ON VIEW public.community_feed_comments IS
  'Comment read path. Owner-run: repeats community_comments_select_visible, hides anonymous authors and the caller''s blocked authors. See 20261003000014.';

REVOKE ALL ON public.community_feed_posts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.community_feed_comments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.community_feed_posts TO authenticated;
GRANT SELECT ON public.community_feed_comments TO authenticated;

-- ── 2. user_id is not selectable by members on the base tables ─────────────

REVOKE SELECT ON public.community_posts FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, topic, content, is_anonymous, reaction_count, comment_count,
  is_hidden, created_at, updated_at, moderation_status
) ON public.community_posts TO authenticated;

REVOKE SELECT ON public.community_comments FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, post_id, parent_id, content, is_anonymous, is_hidden, created_at,
  moderation_status
) ON public.community_comments TO authenticated;

-- ── 3. Block the author of a row without learning who it is ─────────────────

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
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF (p_post_id IS NULL) = (p_comment_id IS NULL) THEN
    RAISE EXCEPTION 'pass exactly one of p_post_id, p_comment_id' USING ERRCODE = '22023';
  END IF;

  -- Only a row the caller can see (same predicate as the views).
  IF p_post_id IS NOT NULL THEN
    SELECT cp.user_id INTO v_author
    FROM public.community_posts cp
    WHERE cp.id = p_post_id
      AND ((cp.is_hidden = false AND cp.moderation_status = 'allowed') OR cp.user_id = v_me);
  ELSE
    SELECT cc.user_id INTO v_author
    FROM public.community_comments cc
    WHERE cc.id = p_comment_id
      AND ((cc.is_hidden = false AND cc.moderation_status = 'allowed') OR cc.user_id = v_me);
  END IF;

  IF v_author IS NULL OR v_author = v_me THEN
    RETURN false;
  END IF;

  INSERT INTO public.community_blocks (blocker_id, blocked_id)
  VALUES (v_me, v_author)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.community_block_author(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_block_author(uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
