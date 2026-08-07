-- ============================================================================
-- Fix the community force-pending trigger (it never actually fired)
-- ============================================================================
-- The 2026-05-19 security-hardening migration added a trigger meant to force
-- every client-side INSERT to moderation_status='pending' so unscreened
-- content could not reach the public feed. It guarded on:
--
--     IF current_user = 'authenticated' OR current_user = 'anon' THEN
--
-- but the function is SECURITY DEFINER, and inside a SECURITY DEFINER function
-- `current_user` is the function OWNER (postgres), never the calling role. The
-- branch was therefore dead: client inserts kept whatever moderation_status
-- they submitted. Verified against production — a direct
-- POST /rest/v1/community_posts with moderation_status='allowed' was stored as
-- 'allowed' and was readable by another user.
--
-- Fix: decide from the JWT role via auth.role(), and fail CLOSED — anything
-- that is not explicitly service_role gets forced to 'pending'. Only the
-- community-moderate edge function (service_role) can set a real status.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.community_force_pending_on_user_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role text;
BEGIN
  -- auth.role() reads the JWT claim: 'authenticated' | 'anon' for client
  -- requests, 'service_role' for our edge functions. NULL/unknown → treat as
  -- untrusted. (Do NOT use current_user here: SECURITY DEFINER makes it the
  -- function owner, which is what broke the original guard.)
  BEGIN
    v_role := coalesce(auth.role(), '');
  EXCEPTION WHEN OTHERS THEN
    v_role := '';
  END;

  IF v_role <> 'service_role' THEN
    NEW.moderation_status := 'pending';
    NEW.moderation_categories := '{}';
    NEW.crisis_flagged := false;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-attach (CREATE OR REPLACE keeps existing triggers pointed at the new body,
-- but be explicit so a fresh database gets them too).
DROP TRIGGER IF EXISTS community_posts_force_pending ON public.community_posts;
CREATE TRIGGER community_posts_force_pending
  BEFORE INSERT ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.community_force_pending_on_user_insert();

DROP TRIGGER IF EXISTS community_comments_force_pending ON public.community_comments;
CREATE TRIGGER community_comments_force_pending
  BEFORE INSERT ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.community_force_pending_on_user_insert();

-- The community has never been enabled for users (feature flag off since
-- launch), so nothing currently marked 'allowed' was screened by a working
-- pipeline. Reset to pending: content becomes visible only after it goes
-- through community-moderate. Fails safe rather than trusting old rows.
UPDATE public.community_posts    SET moderation_status = 'pending' WHERE moderation_status = 'allowed';
UPDATE public.community_comments SET moderation_status = 'pending' WHERE moderation_status = 'allowed';
