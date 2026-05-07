-- One-off read-only inspection migration. Prints the current state of
-- the lawrence.ma000@gmail.com user's premium-related fields via
-- RAISE NOTICE so the supabase CLI shows the result. Does not modify
-- anything. Safe to leave in place; will no-op on re-run.
DO $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_is_premium boolean;
  v_is_ad_free boolean;
  v_subscription_status text;
  v_subscription_started timestamptz;
  v_subscription_expires timestamptz;
  v_subscription_cancelled timestamptz;
  v_subscription_provider text;
  v_subscription_product text;
  v_now timestamptz := now();
BEGIN
  SELECT u.id, u.email, p.is_premium, p.is_ad_free,
         s.status, s.started_at, s.expires_at, s.cancelled_at, s.provider, s.product_id
  INTO v_user_id, v_email, v_is_premium, v_is_ad_free,
       v_subscription_status, v_subscription_started, v_subscription_expires,
       v_subscription_cancelled, v_subscription_provider, v_subscription_product
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN LATERAL (
    SELECT status, started_at, expires_at, cancelled_at, provider, product_id
    FROM public.subscriptions
    WHERE user_id = u.id
    ORDER BY COALESCE(expires_at, started_at, created_at) DESC NULLS LAST
    LIMIT 1
  ) s ON TRUE
  WHERE u.email = 'lawrence.ma000@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE '[lawrence-inspect] No auth.users row found for lawrence.ma000@gmail.com';
  ELSE
    RAISE NOTICE '[lawrence-inspect] now            = %', v_now;
    RAISE NOTICE '[lawrence-inspect] user_id        = %', v_user_id;
    RAISE NOTICE '[lawrence-inspect] email          = %', v_email;
    RAISE NOTICE '[lawrence-inspect] is_premium     = %', v_is_premium;
    RAISE NOTICE '[lawrence-inspect] is_ad_free     = %', v_is_ad_free;
    RAISE NOTICE '[lawrence-inspect] sub_status     = %', v_subscription_status;
    RAISE NOTICE '[lawrence-inspect] sub_started    = %', v_subscription_started;
    RAISE NOTICE '[lawrence-inspect] sub_expires    = %', v_subscription_expires;
    RAISE NOTICE '[lawrence-inspect] sub_cancelled  = %', v_subscription_cancelled;
    RAISE NOTICE '[lawrence-inspect] sub_provider   = %', v_subscription_provider;
    RAISE NOTICE '[lawrence-inspect] sub_product    = %', v_subscription_product;
    IF v_is_premium = TRUE AND v_subscription_expires IS NOT NULL AND v_subscription_expires < v_now THEN
      RAISE NOTICE '[lawrence-inspect] DRIFT DETECTED: is_premium=true but subscription expired %s ago',
        v_now - v_subscription_expires;
    END IF;
  END IF;
END $$;
