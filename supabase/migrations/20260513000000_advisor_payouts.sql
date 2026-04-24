-- ============================================================================
-- Advisor payouts — Stripe Connect accounts + Moonstone cashout ledger
-- ============================================================================
-- Per INCREMENTAL-ROADMAP.md Sprint 17: advisors earn via the Moonstone
-- credits they receive from clients (already tracked in moonstone_transactions
-- with kind='gift-receive'). This migration lets them CASH OUT those
-- Moonstones via Stripe Connect Express.
--
-- Cashout rate is configurable — we start at 10 Moonstones = $1.00 USD
-- (matching the inbound pricing). The platform takes a 30% split out of
-- the gross, leaving 70% for the advisor (standard for a talent marketplace
-- at this stage). Both values live here instead of being hardcoded in code.
--
-- Tables:
--   advisor_payout_accounts — one per advisor. Holds their stripe_account_id
--                             and onboarding status.
--   advisor_cashouts        — one row per cashout request. State machine:
--                             pending → processing → paid | failed.
--   v_advisor_cashout_eligibility — view computing current cashable balance.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.advisor_payout_accounts (
  user_id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id  text NOT NULL UNIQUE,
  onboarding_complete boolean NOT NULL DEFAULT false,
  payouts_enabled    boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.advisor_payout_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS advisor_payout_accounts_select_own ON public.advisor_payout_accounts;
CREATE POLICY advisor_payout_accounts_select_own
  ON public.advisor_payout_accounts FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- Writes only via service role (edge functions); no user INSERT/UPDATE policy.
GRANT SELECT ON public.advisor_payout_accounts TO authenticated;

CREATE TABLE IF NOT EXISTS public.advisor_cashouts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  moonstones_redeemed integer NOT NULL CHECK (moonstones_redeemed > 0),
  gross_cents         integer NOT NULL CHECK (gross_cents > 0),
  platform_fee_cents  integer NOT NULL CHECK (platform_fee_cents >= 0),
  payout_cents        integer NOT NULL CHECK (payout_cents > 0),
  currency            text NOT NULL DEFAULT 'usd',
  state               text NOT NULL DEFAULT 'pending' CHECK (state IN (
    'pending', 'processing', 'paid', 'failed'
  )),
  stripe_transfer_id  text,
  error_message       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  processed_at        timestamptz
);

CREATE INDEX IF NOT EXISTS advisor_cashouts_user_idx
  ON public.advisor_cashouts (user_id, created_at DESC);

ALTER TABLE public.advisor_cashouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS advisor_cashouts_select_own ON public.advisor_cashouts;
CREATE POLICY advisor_cashouts_select_own
  ON public.advisor_cashouts FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

GRANT SELECT ON public.advisor_cashouts TO authenticated;

-- ─── Cashable balance view ───────────────────────────────────────────────
-- Cashable Moonstones = all gift-receive transactions sum, minus what has
-- already been redeemed via cashouts. We can't derive this cleanly from
-- moonstone_balances because that table also accumulates spent-side
-- balances. So compute directly from the ledger.
CREATE OR REPLACE VIEW public.v_advisor_cashout_eligibility AS
SELECT
  u.id AS user_id,
  COALESCE(earned.total, 0)::bigint AS moonstones_earned,
  COALESCE(redeemed.total, 0)::bigint AS moonstones_redeemed,
  (COALESCE(earned.total, 0) - COALESCE(redeemed.total, 0))::bigint AS moonstones_cashable
FROM auth.users u
LEFT JOIN LATERAL (
  SELECT SUM(amount) AS total
  FROM public.moonstone_transactions
  WHERE user_id = u.id AND kind = 'gift-receive'
) earned ON true
LEFT JOIN LATERAL (
  SELECT SUM(moonstones_redeemed) AS total
  FROM public.advisor_cashouts
  WHERE user_id = u.id AND state IN ('pending', 'processing', 'paid')
) redeemed ON true
WHERE EXISTS (
  SELECT 1 FROM public.advisor_profiles p WHERE p.user_id = u.id
);

ALTER VIEW public.v_advisor_cashout_eligibility SET (security_invoker = true);
GRANT SELECT ON public.v_advisor_cashout_eligibility TO authenticated;

-- ─── RPC: request a cashout ──────────────────────────────────────────────
-- Inserts a 'pending' cashout row and debits the Moonstone earnings
-- atomically. The edge function is responsible for creating the Stripe
-- transfer and flipping state to 'processing' → 'paid' | 'failed'.

CREATE OR REPLACE FUNCTION public.advisor_cashout_request(p_moonstones integer)
RETURNS TABLE (cashout_id uuid, payout_cents integer, platform_fee_cents integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_is_advisor boolean;
  v_payout_acct RECORD;
  v_cashable bigint;
  v_gross_cents integer;
  v_fee_cents integer;
  v_payout_cents integer;
  v_cashout_id uuid;
  -- Tunables
  v_rate_cents_per_moonstone integer := 10;  -- 10 Moonstones = $1.00
  v_platform_fee_pct numeric := 0.30;        -- 30% platform split
  v_minimum_moonstones integer := 100;       -- minimum $10 cashout
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_moonstones < v_minimum_moonstones THEN
    RAISE EXCEPTION 'Minimum cashout is % Moonstones', v_minimum_moonstones;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.advisor_profiles WHERE user_id = v_user AND is_hidden = false)
    INTO v_is_advisor;
  IF NOT v_is_advisor THEN RAISE EXCEPTION 'Only advisors can cash out'; END IF;

  SELECT * INTO v_payout_acct FROM public.advisor_payout_accounts WHERE user_id = v_user;
  IF v_payout_acct IS NULL OR NOT v_payout_acct.payouts_enabled THEN
    RAISE EXCEPTION 'Complete Stripe Connect onboarding before cashing out';
  END IF;

  SELECT moonstones_cashable INTO v_cashable FROM public.v_advisor_cashout_eligibility WHERE user_id = v_user;
  IF COALESCE(v_cashable, 0) < p_moonstones THEN
    RAISE EXCEPTION 'Insufficient cashable Moonstones: have %, requested %', COALESCE(v_cashable, 0), p_moonstones;
  END IF;

  v_gross_cents := ((p_moonstones::numeric * v_rate_cents_per_moonstone) / 10)::integer;
  v_fee_cents   := CEIL(v_gross_cents * v_platform_fee_pct)::integer;
  v_payout_cents := v_gross_cents - v_fee_cents;

  INSERT INTO public.advisor_cashouts (
    user_id, moonstones_redeemed, gross_cents, platform_fee_cents, payout_cents, state
  ) VALUES (
    v_user, p_moonstones, v_gross_cents, v_fee_cents, v_payout_cents, 'pending'
  ) RETURNING id INTO v_cashout_id;

  RETURN QUERY SELECT v_cashout_id, v_payout_cents, v_fee_cents;
END;
$$;

GRANT EXECUTE ON FUNCTION public.advisor_cashout_request(integer) TO authenticated;
