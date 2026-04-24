-- ============================================================================
-- Moonstone top-up flag
-- ============================================================================
-- Gates the + button on MoonstoneWidget + the MoonstoneTopUpSheet. Once Play
-- Console + RevenueCat are configured with the four Moonstone pack products
-- and Stripe has the products seeded for web, flip this to 100%.
--
-- Keep OFF during initial rollout: without the store-side product config,
-- tapping Top Up would 404 in RevenueCat and the user would see "Pack not
-- available".
-- ============================================================================

INSERT INTO public.feature_flags (key, description, enabled, rollout_percent)
VALUES
  ('moonstone-topup',
   'MoonstoneWidget + button to open MoonstoneTopUpSheet. Requires Play Console + RevenueCat + Stripe config first.',
   false, 0)
ON CONFLICT (key) DO NOTHING;
