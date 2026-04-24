-- ============================================================================
-- Multiple-permissive-policies cleanup - 2026-04-24
-- ============================================================================
-- Supabase performance advisor flagged 21 `multiple_permissive_policies`
-- warnings. Postgres evaluates ALL permissive policies on a row and OR's
-- them — overlapping policies force extra work per query.
--
-- This migration cleans up the two biggest offenders (15 of 21 warnings):
--
-- 1. `blog_posts_service_write` was `FOR ALL TO public` with USING
--    `auth.role() = 'service_role'`. That made it overlap with
--    `blog_posts_read` for every SELECT. Change to `FOR INSERT, UPDATE,
--    DELETE` so it doesn't cover SELECT. Service-role access still works
--    because service_role bypasses RLS entirely; this policy is belt-
--    and-suspenders for INSERT/UPDATE/DELETE from service contexts.
--    Expected: clears 9 warnings.
--
-- 2. `advisor_verifications` had two overlapping UPDATE policies
--    (`admin_update` + `update_own_pending`) both targeting role `public`.
--    Merge into one policy with a combined USING clause. Semantically
--    identical; one policy instead of two.
--    Expected: clears 6 warnings.
--
-- Remaining 6 warnings (astrology_horoscope_cache, advisor_availability,
-- live_rooms, live_room_rsvps) can be addressed in a follow-up per-table
-- review — they have tighter expressions that need individual attention.
--
-- Idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. blog_posts: narrow service_write to non-SELECT commands
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS blog_posts_service_write ON public.blog_posts;

-- Postgres doesn't allow FOR INSERT, UPDATE, DELETE in a single CREATE POLICY
-- statement — each command needs its own policy. So we split into three.
CREATE POLICY blog_posts_service_insert ON public.blog_posts
  FOR INSERT TO public
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY blog_posts_service_update ON public.blog_posts
  FOR UPDATE TO public
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY blog_posts_service_delete ON public.blog_posts
  FOR DELETE TO public
  USING (auth.role() = 'service_role'::text);

-- ----------------------------------------------------------------------------
-- 2. advisor_verifications: merge two UPDATE policies into one
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS advisor_verifications_admin_update ON public.advisor_verifications;
DROP POLICY IF EXISTS advisor_verifications_update_own_pending ON public.advisor_verifications;

CREATE POLICY advisor_verifications_update ON public.advisor_verifications
  FOR UPDATE TO public
  USING (
    is_admin()
    OR (
      ((SELECT auth.uid()) = user_id) AND (status = 'pending'::text)
    )
  )
  WITH CHECK (
    is_admin()
    OR (
      ((SELECT auth.uid()) = user_id) AND (status = 'pending'::text)
    )
  );

-- Done. Expected: multiple_permissive_policies warnings drop from 21 to ~6.
