-- ============================================================================
-- Security hardening — fixes P0s from Phase 1C + 1D audit
-- ============================================================================
-- Four economic / PII exploits closed:
--   1. compat_invites: drop the `USING (true)` select-by-code policy that
--      let any authenticated user dump every invite's inviter_result PII.
--      The compat_invite_public view already hides sensitive columns;
--      client code only queries via the view so no client change is needed.
--   2. moonstone_transactions: revoke direct INSERT. Users could mint
--      arbitrary Moonstones via client-side inserts with kinds allowed by
--      the old policy. Daily check-in and referral already use
--      SECURITY DEFINER RPCs; we add a new moonstone_award_quiz_completion
--      RPC to cover the quiz-complete code path.
--   3. moonstone_daily_checkins: revoke direct INSERT. Fabricated history
--      was possible with arbitrary streak_day and amount.
--   4. advisor_sessions: the blanket UPDATE grant let clients rewrite
--      every column (state, moonstone_cost, advisor_id, etc). Swap to
--      column-specific grant for only rating and review.
--
-- Additive only for features; destructive on policies (DROP POLICY) but
-- each drop is immediately replaced where still needed. Order matters:
-- revoke + drop + grant + recreate.
-- ============================================================================

-- ─── 1. compat_invites PII leak ───────────────────────────────────────────

DROP POLICY IF EXISTS compat_invites_select_by_code ON public.compat_invites;
-- `compat_invites_select_inviter` (auth.uid() = inviter_user_id) remains —
-- the inviter still reads their own row. Responders and joint-result
-- viewers query the compat_invite_public view, which hides inviter_result.

-- ─── 2. moonstone_transactions: block client mint ────────────────────────

DROP POLICY IF EXISTS moonstone_transactions_insert_own_credits ON public.moonstone_transactions;
REVOKE INSERT ON public.moonstone_transactions FROM authenticated;

-- Unique index on (user_id, reference) for quiz-complete kind — stops
-- resubmission of the same quiz from awarding Moonstones twice.
CREATE UNIQUE INDEX IF NOT EXISTS moonstone_transactions_quiz_unique_idx
  ON public.moonstone_transactions (user_id, reference)
  WHERE kind = 'quiz-complete';

-- New SECURITY DEFINER RPC for quiz completion. Replaces the direct INSERT
-- in dal/moonstones.ts:awardQuizCompletion.
CREATE OR REPLACE FUNCTION public.moonstone_award_quiz_completion(
  p_quiz_id text,
  p_amount  integer DEFAULT 2
)
RETURNS TABLE (amount_awarded integer, is_duplicate boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 10 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;
  IF p_quiz_id IS NULL OR length(p_quiz_id) < 1 OR length(p_quiz_id) > 64 THEN
    RAISE EXCEPTION 'Invalid quiz id';
  END IF;

  BEGIN
    INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
      VALUES (v_user, p_amount, 'quiz-complete', p_quiz_id, 'Quiz completed');
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT 0::integer, true;
    RETURN;
  END;

  RETURN QUERY SELECT p_amount, false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.moonstone_award_quiz_completion(text, integer) TO authenticated;

-- ─── 3. moonstone_daily_checkins: block client insert ────────────────────

DROP POLICY IF EXISTS moonstone_daily_checkins_insert_own ON public.moonstone_daily_checkins;
REVOKE INSERT ON public.moonstone_daily_checkins FROM authenticated;
-- moonstone_daily_checkin() RPC already inserts via SECURITY DEFINER; this
-- is the only legitimate path for a check-in. Users keep SELECT on own.

-- ─── 4. advisor_sessions: column-specific UPDATE grant ───────────────────

REVOKE UPDATE ON public.advisor_sessions FROM authenticated;
GRANT SELECT ON public.advisor_sessions TO authenticated;
GRANT UPDATE (rating, review) ON public.advisor_sessions TO authenticated;
-- The advisor_sessions_rate RLS policy remains — it enforces that only
-- the client on the row can perform the (now column-limited) UPDATE.

-- ─── 5. Community moderation bypass — add trigger-enforced default ───────

-- Before this fix, a client could INSERT a community_posts row directly
-- with moderation_status='allowed' without ever calling community-moderate.
-- We can't make the edge function the only write path without breaking
-- offline-drafts and optimistic UI, but we CAN enforce that INSERTs from
-- the user role always land as 'pending' and only service-role can set
-- any other value. A trigger force-normalizes NEW.moderation_status.

CREATE OR REPLACE FUNCTION public.community_force_pending_on_user_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- If invoked by a normal authenticated user (not service_role),
  -- force status to 'pending' regardless of what they submitted.
  IF current_user = 'authenticated' OR current_user = 'anon' THEN
    NEW.moderation_status := 'pending';
    NEW.moderation_categories := '{}';
    NEW.crisis_flagged := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_posts_force_pending ON public.community_posts;
CREATE TRIGGER community_posts_force_pending
  BEFORE INSERT ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.community_force_pending_on_user_insert();

DROP TRIGGER IF EXISTS community_comments_force_pending ON public.community_comments;
CREATE TRIGGER community_comments_force_pending
  BEFORE INSERT ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.community_force_pending_on_user_insert();

-- This makes the community-moderate edge function the ONLY path that can
-- insert allowed/flagged posts (it runs with service_role). Direct client
-- INSERTs still succeed, but the post sits in 'pending' and doesn't appear
-- in the public feed (the visible index filters on moderation_status =
-- 'allowed'). A background job or the moderate function itself can pick
-- up pending rows and promote them.

-- ─── 6. Admin Moonstone grant / claw RPCs for support ops ────────────────

CREATE OR REPLACE FUNCTION public.admin_moonstone_grant(
  p_user_id uuid,
  p_amount  integer,
  p_note    text
)
RETURNS TABLE (transaction_id uuid, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_txn_id uuid;
  v_balance integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100_000 THEN
    RAISE EXCEPTION 'Invalid grant amount';
  END IF;

  INSERT INTO public.moonstone_transactions (user_id, amount, kind, note)
    VALUES (p_user_id, p_amount, 'admin-grant', p_note)
    RETURNING id INTO v_txn_id;

  SELECT COALESCE(balance, 0) INTO v_balance
    FROM public.moonstone_balances WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_txn_id, COALESCE(v_balance, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_moonstone_claw(
  p_user_id uuid,
  p_amount  integer,
  p_note    text
)
RETURNS TABLE (transaction_id uuid, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_txn_id uuid;
  v_balance integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100_000 THEN
    RAISE EXCEPTION 'Invalid claw amount';
  END IF;

  INSERT INTO public.moonstone_transactions (user_id, amount, kind, note)
    VALUES (p_user_id, -p_amount, 'admin-claw', p_note)
    RETURNING id INTO v_txn_id;

  SELECT COALESCE(balance, 0) INTO v_balance
    FROM public.moonstone_balances WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_txn_id, COALESCE(v_balance, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_moonstone_grant(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_moonstone_claw(uuid, integer, text) TO authenticated;
