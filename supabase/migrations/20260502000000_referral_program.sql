-- ============================================================================
-- Referral program
-- ============================================================================
-- Per INCREMENTAL-ROADMAP.md Sprint 13: invite → both sides get 100 Moonstones
-- when the invitee completes onboarding. Affiliate share + 10% creator rev share
-- is a follow-on; this migration only covers the peer-to-peer reward.
--
-- Tables:
--   referral_codes   — one code per user (auto-issued on first request).
--                      codes are short, mixed-case, 8 chars. unique.
--   referral_redemptions — one row per (referrer_id, invitee_id). inserted by
--                          the claim RPC. PK prevents double-redeem.
--
-- Reward flow (all atomic via RPC):
--   1. invitee calls redeem_referral(code) exactly once, right after onboarding
--   2. RPC looks up code → referrer
--   3. RPC writes referral_redemptions row (PK guard prevents dupes)
--   4. RPC writes two moonstone_transactions rows (referrer + invitee, 100 each)
--   5. RPC returns { amount, referrer_display_name }
--
-- Fraud controls:
--   - Self-redeem blocked (referrer != invitee)
--   - One redemption per invitee lifetime (PK on invitee_id in redemptions)
--   - Only within 30 days of invitee account creation (stops farming old accounts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code         text NOT NULL UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_code_format CHECK (code ~ '^[A-Za-z0-9]{6,16}$')
);

CREATE INDEX IF NOT EXISTS referral_codes_code_idx ON public.referral_codes (code);

-- One redemption per invitee — PK enforces lifetime uniqueness on invitee_id
CREATE TABLE IF NOT EXISTS public.referral_redemptions (
  invitee_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code          text NOT NULL,
  reward_amount integer NOT NULL DEFAULT 100 CHECK (reward_amount > 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_referral CHECK (referrer_id <> invitee_id)
);

CREATE INDEX IF NOT EXISTS referral_redemptions_referrer_idx
  ON public.referral_redemptions (referrer_id, created_at DESC);

-- ─── RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE public.referral_codes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_redemptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own code
DROP POLICY IF EXISTS referral_codes_select_own ON public.referral_codes;
CREATE POLICY referral_codes_select_own
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own code (issue-on-demand path)
DROP POLICY IF EXISTS referral_codes_insert_own ON public.referral_codes;
CREATE POLICY referral_codes_insert_own
  ON public.referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Redemptions: user can see their own invitees (referrer_id = auth.uid()) or
-- the row where they were the invitee.
DROP POLICY IF EXISTS referral_redemptions_select_participant ON public.referral_redemptions;
CREATE POLICY referral_redemptions_select_participant
  ON public.referral_redemptions FOR SELECT
  USING (auth.uid() IN (referrer_id, invitee_id));

GRANT SELECT, INSERT ON public.referral_codes       TO authenticated;
GRANT SELECT          ON public.referral_redemptions TO authenticated;

-- ─── RPCs ────────────────────────────────────────────────────────────────

-- Issue-or-return-existing code for the caller.
CREATE OR REPLACE FUNCTION public.referral_get_or_issue()
RETURNS TABLE (code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
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

GRANT EXECUTE ON FUNCTION public.referral_get_or_issue() TO authenticated;

-- Atomic redemption. Rejects self-redeem, duplicates, expired accounts.
CREATE OR REPLACE FUNCTION public.referral_redeem(p_code text)
RETURNS TABLE (
  reward_amount integer,
  referrer_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_invitee_id uuid := auth.uid();
  v_invitee_created timestamptz;
  v_referrer_id uuid;
  v_referrer_name text;
  v_reward integer := 100;
BEGIN
  IF v_invitee_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_code IS NULL OR length(p_code) < 6 THEN RAISE EXCEPTION 'Invalid code format'; END IF;

  -- Check invitee account is <=30 days old (anti-farming)
  SELECT created_at INTO v_invitee_created FROM auth.users WHERE id = v_invitee_id;
  IF v_invitee_created IS NULL THEN RAISE EXCEPTION 'Account not found'; END IF;
  IF v_invitee_created < now() - interval '30 days' THEN
    RAISE EXCEPTION 'Account too old to redeem referral';
  END IF;

  -- Resolve code → referrer
  SELECT rc.user_id INTO v_referrer_id FROM public.referral_codes rc WHERE rc.code = p_code;
  IF v_referrer_id IS NULL THEN RAISE EXCEPTION 'Unknown referral code'; END IF;
  IF v_referrer_id = v_invitee_id THEN RAISE EXCEPTION 'Cannot redeem own code'; END IF;

  -- Insert redemption — PK collision = already redeemed
  BEGIN
    INSERT INTO public.referral_redemptions (invitee_id, referrer_id, code, reward_amount)
      VALUES (v_invitee_id, v_referrer_id, p_code, v_reward);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Already redeemed a referral code';
  END;

  -- Credit both sides
  INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
    VALUES (v_referrer_id, v_reward, 'referral', v_invitee_id::text, 'Referral reward — invitee joined');
  INSERT INTO public.moonstone_transactions (user_id, amount, kind, reference, note)
    VALUES (v_invitee_id,  v_reward, 'referral', v_referrer_id::text, 'Welcome reward — used a referral code');

  -- Look up a display name for the referrer (best-effort, empty string if none)
  SELECT COALESCE(raw_user_meta_data->>'display_name', '') INTO v_referrer_name
    FROM auth.users WHERE id = v_referrer_id;

  RETURN QUERY SELECT v_reward, v_referrer_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.referral_redeem(text) TO authenticated;
