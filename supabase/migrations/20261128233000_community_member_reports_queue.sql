/*
  # Member reports reach a moderator (WP-P0-20, social-ai-01 companion, D51)

  A member's report only added to community_posts.reported_count, and at five
  reports the post hid itself (community_update_report_count,
  20260427000000_community_feed.sql). Nothing showed the reports to a person:
  the Moderation panel reads community_flagged_queue(), which lists only rows
  the AI moderator set to 'flagged'. Comment reports changed nothing at all.

  1. community_update_report_count(): the post branch is kept as it was; a
     comment reported by five different members (pending reports) is hidden
     until a moderator looks, as a post already is (D51: hiding A, five).
  2. community_reported_queue(): admin-only. Every post and comment with a
     pending report, grouped, self-harm first. No reporter id, no author id.
  3. community_resolve_reports(kind, id, action): admin-only.
       dismiss  pending reports -> dismissed; the item stays as it is
       restore  pending reports -> dismissed; the item is shown again
     On dismiss and restore a post's reported_count goes back to 0, so it
     counts open reports only, as a comment does: it takes five new reports,
     not one, to hide it again after a moderator's decision.
       remove   pending reports -> actioned; the item is blocked and hidden
     Returns the number of reports it changed.
*/

-- ── 1. Comment reports count too ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.community_update_report_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_hide_at constant integer := 5;
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    UPDATE public.community_posts
    SET reported_count = reported_count + 1,
        is_hidden = CASE WHEN reported_count + 1 >= v_hide_at THEN true ELSE is_hidden END
    WHERE id = NEW.post_id;
  ELSIF NEW.comment_id IS NOT NULL THEN
    UPDATE public.community_comments
    SET is_hidden = true
    WHERE id = NEW.comment_id
      AND (
        SELECT count(DISTINCT r.reporter_id)
        FROM public.community_reports r
        WHERE r.comment_id = NEW.comment_id AND r.status = 'pending'
      ) >= v_hide_at;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 2. The queue ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.community_reported_queue()
RETURNS TABLE (
  kind text,
  id uuid,
  post_id uuid,
  topic text,
  content text,
  is_anonymous boolean,
  is_hidden boolean,
  reports integer,
  reasons text[],
  self_harm boolean,
  first_reported timestamptz,
  last_reported timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admins only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    WITH pending AS (
      SELECT CASE WHEN r.comment_id IS NOT NULL THEN 'comment' ELSE 'post' END AS kind,
             COALESCE(r.comment_id, r.post_id) AS item_id,
             r.reason,
             r.created_at
      FROM public.community_reports r
      WHERE r.status = 'pending'
    ),
    grouped AS (
      SELECT p.kind,
             p.item_id,
             count(*)::integer AS reports,
             array_agg(DISTINCT p.reason) AS reason_set,
             bool_or(p.reason = 'self-harm') AS self_harm,
             min(p.created_at) AS first_reported,
             max(p.created_at) AS last_reported
      FROM pending p
      GROUP BY p.kind, p.item_id
    ),
    items AS (
      SELECT 'post'::text AS kind, cp.id, NULL::uuid AS post_id, cp.topic, cp.content,
             cp.is_anonymous, cp.is_hidden
      FROM public.community_posts cp
      WHERE cp.id IN (SELECT g.item_id FROM grouped g WHERE g.kind = 'post')
      UNION ALL
      SELECT 'comment'::text, cc.id, cc.post_id, parent.topic, cc.content,
             cc.is_anonymous, cc.is_hidden
      FROM public.community_comments cc
      JOIN public.community_posts parent ON parent.id = cc.post_id
      WHERE cc.id IN (SELECT g.item_id FROM grouped g WHERE g.kind = 'comment')
    )
    SELECT i.kind, i.id, i.post_id, i.topic, i.content, i.is_anonymous, i.is_hidden,
           g.reports,
           -- the distinct reasons, in the order of community_reports' CHECK
           ARRAY(
             SELECT c.reason
             FROM unnest(ARRAY['spam', 'harassment', 'self-harm', 'explicit', 'misinformation', 'other']::text[])
                  WITH ORDINALITY AS c(reason, n)
             WHERE c.reason = ANY (g.reason_set)
             ORDER BY c.n
           ),
           g.self_harm, g.first_reported, g.last_reported
    FROM grouped g
    JOIN items i ON i.kind = g.kind AND i.id = g.item_id
    ORDER BY g.self_harm DESC, g.reports DESC, g.last_reported DESC
    LIMIT 100;
END;
$$;

-- ── 3. The decision ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.community_resolve_reports(
  p_kind text,
  p_id uuid,
  p_action text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_rows integer := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admins only' USING ERRCODE = '42501';
  END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('post', 'comment') THEN
    RAISE EXCEPTION 'p_kind must be post or comment' USING ERRCODE = '22023';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('dismiss', 'restore', 'remove') THEN
    RAISE EXCEPTION 'p_action must be dismiss, restore or remove' USING ERRCODE = '22023';
  END IF;

  IF p_kind = 'post' THEN
    UPDATE public.community_reports
    SET status = CASE WHEN p_action = 'remove' THEN 'actioned' ELSE 'dismissed' END
    WHERE post_id = p_id AND comment_id IS NULL AND status = 'pending';
  ELSE
    UPDATE public.community_reports
    SET status = CASE WHEN p_action = 'remove' THEN 'actioned' ELSE 'dismissed' END
    WHERE comment_id = p_id AND status = 'pending';
  END IF;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF p_action = 'restore' THEN
    IF p_kind = 'post' THEN
      -- Every pending report is closed above, so the post's count restarts at
      -- 0 (open reports only, as comments count): one later report cannot
      -- undo the moderator's decision.
      UPDATE public.community_posts SET is_hidden = false, reported_count = 0 WHERE id = p_id;
    ELSE
      UPDATE public.community_comments SET is_hidden = false WHERE id = p_id;
    END IF;
  ELSIF p_action = 'dismiss' THEN
    IF p_kind = 'post' THEN
      UPDATE public.community_posts SET reported_count = 0 WHERE id = p_id;
    END IF;
  ELSIF p_action = 'remove' THEN
    IF p_kind = 'post' THEN
      UPDATE public.community_posts
      SET moderation_status = 'blocked'::public.moderation_status, is_hidden = true
      WHERE id = p_id;
    ELSE
      UPDATE public.community_comments
      SET moderation_status = 'blocked'::public.moderation_status, is_hidden = true
      WHERE id = p_id;
    END IF;
  END IF;

  RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.community_reported_queue() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.community_resolve_reports(text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_reported_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_resolve_reports(text, uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
