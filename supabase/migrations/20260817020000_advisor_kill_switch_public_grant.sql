-- Corrective: the previous migration's REVOKE did not actually revoke anything.
--
-- 20260817010000 revoked EXECUTE on the advisor RPCs FROM authenticated. That
-- left the grant to PUBLIC untouched, and PUBLIC is what was actually carrying
-- the privilege. Probing production straight after that migration:
--
--   POST /rest/v1/rpc/advisor_cashout_request  {"p_moonstones":100}   as ANON
--     -> {"code":"P0001","message":"Not authenticated"}     (the FUNCTION ran)
--   POST /rest/v1/rpc/advisor_session_cancel   {"p_session_id":...}   as ANON
--     -> {"code":"P0001","message":"Session not found"}     (the FUNCTION ran)
--   POST /rest/v1/rpc/moonstone_award_streak_milestone      as ANON  [control]
--     -> {"code":"42501","message":"permission denied"}     (correctly blocked)
--
-- So the advisor money surface was callable by ANONYMOUS callers, not merely by
-- signed-in ones. This is the same Supabase grant trap that bites the other way
-- round — the defaults hand EXECUTE to PUBLIC as well as to anon/authenticated,
-- so a revoke has to name all three or it is decorative.
--
-- Worse in combination: advisor_session_start/end/cancel test participation with
--   IF v_user NOT IN (v_session.client_user_id, v_session.advisor_user_id)
-- and advisor_profiles.user_id is nullable. For an anonymous caller v_user is
-- NULL, so that expression is NULL, `IF NULL THEN` is false, and the guard never
-- fires. An anonymous caller holding a session UUID would sail past the
-- participant check. The functions are unreachable now, but fix the null-safety
-- as part of the rewrite regardless — see docs/advisor-preflight-audit.md.

REVOKE EXECUTE ON FUNCTION public.advisor_book_session(uuid, timestamptz, smallint, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.advisor_session_start(uuid)      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.advisor_session_end(uuid)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.advisor_session_cancel(uuid)     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.advisor_cashout_request(integer) FROM PUBLIC, anon, authenticated;

-- advisor_verification_decide gates on is_admin() internally (verified at
-- 20260516000000_advisor_verification.sql:120), but there is no reason for an
-- anonymous caller to reach an admin decision function at all.
REVOKE EXECUTE ON FUNCTION public.advisor_verification_decide(uuid, text, text) FROM PUBLIC, anon;

/* ── Re-enable alongside the launch checklist in 20260817010000 ──
GRANT EXECUTE ON FUNCTION public.advisor_book_session(uuid, timestamptz, smallint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advisor_session_start(uuid)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.advisor_session_end(uuid)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.advisor_session_cancel(uuid)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.advisor_cashout_request(integer) TO authenticated;
*/
