-- Make "the advisor marketplace is off" actually true on the server.
--
-- The `advisors` feature flag gated exactly one nav menu item. Every advisor
-- route was registered unconditionally (fixed separately in src/App.tsx), and
-- — the part that matters — NO server-side entry point consulted any flag.
-- advisor_book_session, advisor_session_start/end/cancel and
-- advisor_cashout_request were all GRANTed to `authenticated` with no gate, so
-- any signed-in user could call them straight from the browser console with the
-- flag off.
--
-- That is not a kill switch. This migration makes it one, two ways.
--
-- 1. A reusable guard, `assert_feature_enabled`, so a flag can be enforced
--    where it actually matters rather than in the client. It is deliberately
--    NOT yet wired into the advisor RPCs: those functions are being rewritten
--    anyway (a booked session credits nobody, and cashout is dead on
--    auth.uid()), and quietly re-issuing 400 lines of money code I am not
--    changing the behaviour of is how a subtle defect gets introduced. Wire the
--    PERFORM call in as part of that rewrite — see the checklist below.
--
-- 2. Until then, EXECUTE is revoked from `authenticated` on the five advisor
--    RPCs. This costs nothing: the marketplace has never worked end to end, so
--    there is no working behaviour to break. It is one line per function to
--    reverse.
--
-- LAUNCH CHECKLIST — all of this must happen before the flag is flipped:
--   [ ] Fix the seven blockers in docs/advisor-preflight-audit.md.
--   [ ] Add `PERFORM public.assert_feature_enabled('advisors');` as the first
--       statement of each advisor RPC, after the auth.uid() null check.
--   [ ] Re-GRANT EXECUTE on the five functions below to `authenticated`.
--   [ ] Add the same guard to the advisor-* edge functions.
--   [ ] Verify one real end-to-end session: book, complete, credit, cash out.
--
-- Reversing this migration is exactly the GRANT lines at the bottom, uncommented.

/* ────────────────────────────────────────────────────────────────────────
 * 1. The reusable server-side flag guard
 * ──────────────────────────────────────────────────────────────────────── */

CREATE OR REPLACE FUNCTION public.assert_feature_enabled(p_key text)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_enabled boolean;
BEGIN
  SELECT enabled INTO v_enabled
  FROM public.feature_flags
  WHERE key = p_key;

  -- Fails CLOSED: an unknown flag is an off flag. A typo in the key must not
  -- silently open a paid surface.
  IF COALESCE(v_enabled, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Feature % is not enabled', p_key
      USING ERRCODE = '42501';  -- insufficient_privilege
  END IF;
END;
$$;

COMMENT ON FUNCTION public.assert_feature_enabled(text) IS
  'Raises insufficient_privilege unless feature_flags.enabled is true for the '
  'given key. Gates on `enabled` only — rollout_percent is a client-side '
  'gradual-exposure dial, not a security boundary. Fails closed on an unknown key.';

REVOKE ALL ON FUNCTION public.assert_feature_enabled(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_feature_enabled(text) TO authenticated;

/* ────────────────────────────────────────────────────────────────────────
 * 2. Hard-off the advisor money surface
 * ──────────────────────────────────────────────────────────────────────── */

REVOKE EXECUTE ON FUNCTION public.advisor_book_session(uuid, timestamptz, smallint, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.advisor_session_start(uuid)  FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.advisor_session_end(uuid)    FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.advisor_session_cancel(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.advisor_cashout_request(integer) FROM authenticated;

-- advisor_verification_decide is the ADMIN decision function. It already checks
-- is_admin() internally, and revoking it would break the (not yet existing)
-- review workflow rather than protect anything, so it is left as-is.

/* ── To re-enable, uncomment and run alongside the launch checklist above ──
GRANT EXECUTE ON FUNCTION public.advisor_book_session(uuid, timestamptz, smallint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advisor_session_start(uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.advisor_session_end(uuid)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.advisor_session_cancel(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advisor_cashout_request(integer) TO authenticated;
*/
