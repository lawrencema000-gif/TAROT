-- ─────────────────────────────────────────────────────────────────────
-- Admin grant: flip lawrence.ma000@gmail.com to premium.
--
-- Sets profiles.is_premium = true and is_ad_free = true. No subscription
-- row is created since this is not a paid Stripe / RC purchase — it's
-- a direct admin grant (account owner / development).
--
-- Note on durability:
--   - Web: this stays in place until a future Stripe webhook event or
--     manual flip changes it. The daily reconcile-premium-status job
--     does NOT downgrade is_premium=true → false, so admin grants
--     persist through that cycle.
--   - Mobile (Capacitor): the device-driven reconcile-premium-from-
--     device flow CAN downgrade if the RC SDK reports no active
--     entitlement on next app open. If lawrence opens the mobile app
--     without an active RC entitlement, this grant will be reverted.
--     If durability on mobile is needed, also create an entitlement
--     in the RevenueCat dashboard for this user, OR exempt admin
--     accounts from the device reconcile.
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_user_id uuid;
  v_was_premium boolean;
BEGIN
  SELECT u.id, p.is_premium
  INTO v_user_id, v_was_premium
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.email = 'lawrence.ma000@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '[grant-lawrence-premium] no auth.users row for lawrence.ma000@gmail.com';
  END IF;

  UPDATE public.profiles
  SET is_premium = TRUE,
      is_ad_free = TRUE,
      updated_at = now()
  WHERE id = v_user_id;

  RAISE NOTICE '[grant-lawrence-premium] user_id   = %', v_user_id;
  RAISE NOTICE '[grant-lawrence-premium] was_premium = %', v_was_premium;
  RAISE NOTICE '[grant-lawrence-premium] now is_premium = TRUE, is_ad_free = TRUE';
END $$;
