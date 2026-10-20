/*
  # gen_random_bytes() is in schema `extensions`, not on these functions' path

  20260529000000 installed pgcrypto WITH SCHEMA extensions (the Supabase
  convention), but the four callers of gen_random_bytes() were written with
  SET search_path = pg_catalog, public:

    - referral_get_or_issue()            20260502000000:83
    - compat_invite_create(text,jsonb,text) 20260507000000:125
    - affiliate_decide(uuid,text)        20260508000000:160 (the admin
      approval issues a referral code; affiliate_apply, named in the 20260529
      header, never calls gen_random_bytes and is left as it is)
    - achievement_shares.share_code DEFAULT 20260127070336:106

  So every call raised 42883 "function gen_random_bytes(integer) does not
  exist": the Referral sheet showed "YOUR CODE —" with Copy/Share disabled,
  "Generate invite link" did nothing and /invite/:code could only ever say
  "This invite could not be found" (R6 A2, R7 B4 — live on tarotlife.app).

  Fix: the same function bodies with `extensions` appended to the search
  path (the migrations after 20260502/0507/0508 did not redefine them — the
  bodies below are the latest), and the column default qualified. Grants are
  restated with PUBLIC and anon named.
*/

-- ── referral_get_or_issue ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.referral_get_or_issue()
RETURNS TABLE (code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing text;
  v_new_code text;
  v_attempts integer := 0;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT rc.code INTO v_existing FROM public.referral_codes rc WHERE rc.user_id = v_user_id;
  IF v_existing IS NOT NULL THEN
    RETURN QUERY SELECT v_existing;
    RETURN;
  END IF;

  -- Generate a short, readable code. Retry on collision (rare).
  LOOP
    v_attempts := v_attempts + 1;
    v_new_code := upper(substring(replace(encode(gen_random_bytes(6), 'base64'), '/', 'A'), 1, 8));
    v_new_code := replace(replace(v_new_code, '+', 'B'), '=', 'C');
    BEGIN
      INSERT INTO public.referral_codes (user_id, code) VALUES (v_user_id, v_new_code);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempts > 10 THEN RAISE EXCEPTION 'Could not issue code after 10 attempts'; END IF;
    END;
  END LOOP;

  RETURN QUERY SELECT v_new_code;
END;
$$;

REVOKE ALL ON FUNCTION public.referral_get_or_issue() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.referral_get_or_issue() TO authenticated, service_role;

-- ── compat_invite_create ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compat_invite_create(
  p_kind text,
  p_result jsonb,
  p_inviter_name text DEFAULT NULL
)
RETURNS TABLE (code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_code text;
  v_attempts int := 0;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_kind NOT IN ('mbti','love-language','attachment','big-five','enneagram','zodiac','element') THEN
    RAISE EXCEPTION 'Invalid invite kind: %', p_kind;
  END IF;

  LOOP
    v_attempts := v_attempts + 1;
    v_code := upper(substring(replace(replace(
      encode(gen_random_bytes(8), 'base64'), '/', 'A'), '+', 'B'), 1, 10));
    v_code := replace(v_code, '=', 'C');
    BEGIN
      INSERT INTO public.compat_invites (code, inviter_user_id, kind, inviter_result, inviter_name)
        VALUES (v_code, v_user, p_kind, p_result, p_inviter_name);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempts > 10 THEN RAISE EXCEPTION 'Could not issue code'; END IF;
    END;
  END LOOP;

  RETURN QUERY SELECT v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.compat_invite_create(text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compat_invite_create(text, jsonb, text) TO authenticated, service_role;

-- ── affiliate_decide (admin approval issues a code) ───────────────────────
CREATE OR REPLACE FUNCTION public.affiliate_decide(
  p_application_id uuid,
  p_decision       text
)
RETURNS TABLE (status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_app RECORD;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_decision NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Invalid decision'; END IF;

  SELECT * INTO v_app FROM public.affiliate_applications WHERE id = p_application_id;
  IF v_app IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;

  UPDATE public.affiliate_applications
    SET status = p_decision,
        decided_at = now(),
        decided_by = v_user
    WHERE id = p_application_id;

  IF p_decision = 'approved' THEN
    -- Ensure the user has a code; promote to affiliate tier.
    INSERT INTO public.referral_codes (user_id, code)
      VALUES (
        v_app.user_id,
        upper(substring(replace(replace(
          encode(gen_random_bytes(6), 'base64'), '/', 'A'), '+', 'B'), 1, 8))
      )
      ON CONFLICT (user_id) DO NOTHING;
    UPDATE public.referral_codes SET tier = 'affiliate' WHERE user_id = v_app.user_id;
  END IF;

  RETURN QUERY SELECT p_decision;
END;
$$;

REVOKE ALL ON FUNCTION public.affiliate_decide(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.affiliate_decide(uuid, text) TO authenticated, service_role;

-- ── achievement_shares.share_code default ─────────────────────────────────
ALTER TABLE public.achievement_shares
  ALTER COLUMN share_code SET DEFAULT encode(extensions.gen_random_bytes(8), 'hex');
