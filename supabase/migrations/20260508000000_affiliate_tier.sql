-- ============================================================================
-- Affiliate tier on referrals
-- ============================================================================
-- Sprint 13 closure. Peer referrals stay as-is (100 Moonstones per side at
-- invitee onboarding). Affiliates get a second revenue line: 10% share of
-- invitee revenue for 12 months. Payouts themselves are not wired to a real
-- processor in this migration — we record accruals and expose them via a
-- view the admin + affiliate can read. Stripe Connect payout integration is
-- a follow-on when the first affiliate is ready to cash out.
--
-- Schema:
--   referral_codes        add `tier text` ('peer' | 'affiliate') defaulted 'peer'
--   affiliate_applications an external-facing waitlist — admin approves by
--                         flipping referral_codes.tier to 'affiliate'
--   affiliate_earnings    accrual ledger: one row per invitee revenue event
--                         in the 12-month window after their signup
--   v_affiliate_totals    view: one row per affiliate with lifetime and
--                         unpaid balances
--
-- RLS:
--   Affiliates can SELECT their own referral_codes row (already), their own
--   affiliate_applications, and their own affiliate_earnings. Admins see all.
-- ============================================================================

-- 1. Add tier to existing referral_codes.
ALTER TABLE public.referral_codes
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'peer'
    CHECK (tier IN ('peer', 'affiliate'));

CREATE INDEX IF NOT EXISTS referral_codes_affiliate_idx
  ON public.referral_codes (tier) WHERE tier = 'affiliate';

-- 2. Application queue — anyone with a sizable audience can apply; admin vets.
CREATE TABLE IF NOT EXISTS public.affiliate_applications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audience      text NOT NULL CHECK (char_length(audience) BETWEEN 5 AND 500),
  size_estimate text,
  platforms     text[] NOT NULL DEFAULT '{}',
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected'
  )),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  decided_at    timestamptz,
  decided_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS affiliate_apps_status_idx
  ON public.affiliate_applications (status, created_at);

ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS affiliate_apps_select_own ON public.affiliate_applications;
CREATE POLICY affiliate_apps_select_own
  ON public.affiliate_applications FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS affiliate_apps_insert_own ON public.affiliate_applications;
CREATE POLICY affiliate_apps_insert_own
  ON public.affiliate_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS affiliate_apps_admin_update ON public.affiliate_applications;
CREATE POLICY affiliate_apps_admin_update
  ON public.affiliate_applications FOR UPDATE
  USING (public.is_admin());

GRANT SELECT, INSERT ON public.affiliate_applications TO authenticated;

-- 3. Accrual ledger
CREATE TABLE IF NOT EXISTS public.affiliate_earnings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source          text NOT NULL CHECK (source IN (
    'stripe-subscription', 'stripe-one-off', 'moonstone-pack', 'pay-per-report'
  )),
  source_ref      text,
  invitee_revenue_cents integer NOT NULL CHECK (invitee_revenue_cents > 0),
  affiliate_share_cents integer NOT NULL CHECK (affiliate_share_cents > 0),
  share_percent   numeric(5,2) NOT NULL DEFAULT 10.00,
  currency        text NOT NULL DEFAULT 'USD',
  paid_out        boolean NOT NULL DEFAULT false,
  paid_out_at     timestamptz,
  payout_ref      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS affiliate_earnings_referrer_idx
  ON public.affiliate_earnings (referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS affiliate_earnings_unpaid_idx
  ON public.affiliate_earnings (referrer_id) WHERE paid_out = false;

ALTER TABLE public.affiliate_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS affiliate_earnings_select_own ON public.affiliate_earnings;
CREATE POLICY affiliate_earnings_select_own
  ON public.affiliate_earnings FOR SELECT
  USING (auth.uid() = referrer_id OR public.is_admin());

GRANT SELECT ON public.affiliate_earnings TO authenticated;

-- 4. Summary view
CREATE OR REPLACE VIEW public.v_affiliate_totals AS
SELECT
  e.referrer_id,
  COUNT(*) AS event_count,
  COUNT(DISTINCT e.invitee_id) AS unique_invitees_earning,
  COALESCE(SUM(e.affiliate_share_cents) FILTER (WHERE paid_out = false), 0)::bigint AS unpaid_cents,
  COALESCE(SUM(e.affiliate_share_cents), 0)::bigint AS lifetime_cents,
  e.currency
FROM public.affiliate_earnings e
GROUP BY e.referrer_id, e.currency;

ALTER VIEW public.v_affiliate_totals SET (security_invoker = true);
GRANT SELECT ON public.v_affiliate_totals TO authenticated;

-- 5. RPC: affiliate application submit (pretty-print wrapper over insert)
CREATE OR REPLACE FUNCTION public.affiliate_apply(
  p_audience      text,
  p_size_estimate text,
  p_platforms     text[]
)
RETURNS TABLE (status text, id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_row_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.affiliate_applications (user_id, audience, size_estimate, platforms)
    VALUES (v_user, p_audience, p_size_estimate, COALESCE(p_platforms, '{}'))
    ON CONFLICT (user_id) DO UPDATE
      SET audience = excluded.audience,
          size_estimate = excluded.size_estimate,
          platforms = excluded.platforms,
          status = 'pending',
          decided_at = NULL,
          decided_by = NULL
    RETURNING id INTO v_row_id;
  RETURN QUERY SELECT 'pending'::text, v_row_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.affiliate_apply(text, text, text[]) TO authenticated;

-- 6. RPC: admin approve/reject (also flips the referral_codes.tier)
CREATE OR REPLACE FUNCTION public.affiliate_decide(
  p_application_id uuid,
  p_decision       text
)
RETURNS TABLE (status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
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

GRANT EXECUTE ON FUNCTION public.affiliate_decide(uuid, text) TO authenticated;
