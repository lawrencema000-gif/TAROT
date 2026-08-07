-- ============================================================================
-- Community moderation ENFORCEMENT — closes a pre-launch bypass
-- ============================================================================
-- Found while auditing the community feature before enabling it.
--
-- The moderation machinery was all present (community-moderate edge function,
-- OpenAI screening, crisis detection, audit tables, a trigger forcing client
-- inserts to moderation_status='pending') — but NOTHING enforced the status at
-- READ time:
--
--   community_posts_select_visible  USING (is_hidden = false)
--
-- moderation_status was never consulted. So a post that screening flagged or
-- blocked was still publicly readable, and — worse — any client could POST
-- straight to /rest/v1/community_posts, skip the edge function entirely, and
-- their unscreened content would be visible to everyone. Moderation was
-- effectively client-side only, i.e. advisory.
--
-- This migration makes the status authoritative:
--   * public visibility now requires moderation_status = 'allowed'
--   * authors always see their own posts (so a pending/flagged post doesn't
--     silently vanish for the person who wrote it)
--   * comments get the same treatment
--
-- Paired with the edge-function change that makes community-moderate the
-- publisher (it runs as service_role, so the force-pending trigger does not
-- apply to it and it can set the true post-screening status).
-- ============================================================================

-- ── Posts ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS community_posts_select_visible ON public.community_posts;
CREATE POLICY community_posts_select_visible ON public.community_posts
  FOR SELECT USING (
    (is_hidden = false AND moderation_status = 'allowed')
    OR (SELECT auth.uid()) = user_id
  );

-- ── Comments ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS community_comments_select_visible ON public.community_comments;
CREATE POLICY community_comments_select_visible ON public.community_comments
  FOR SELECT USING (
    (is_hidden = false AND moderation_status = 'allowed')
    OR (SELECT auth.uid()) = user_id
  );

-- ── Pending is the safe default for anything the trigger touches ──────────
-- The column default was 'allowed' (pre-moderation-era). Any future insert
-- path that forgets to set a status should fail CLOSED, not open.
ALTER TABLE public.community_posts
  ALTER COLUMN moderation_status SET DEFAULT 'pending';
ALTER TABLE public.community_comments
  ALTER COLUMN moderation_status SET DEFAULT 'pending';

-- Supporting indexes for the new predicate.
CREATE INDEX IF NOT EXISTS idx_community_posts_visible
  ON public.community_posts (created_at DESC)
  WHERE is_hidden = false AND moderation_status = 'allowed';
CREATE INDEX IF NOT EXISTS idx_community_comments_visible
  ON public.community_comments (post_id, created_at)
  WHERE is_hidden = false AND moderation_status = 'allowed';
