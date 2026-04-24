-- ============================================================================
-- Hide Moonstones feature for now — 2026-04-25
-- ============================================================================
-- Per user direction: Moonstones (virtual currency) is being hidden from the
-- UI because the payment setup is not yet complete and the spending surfaces
-- (what uses Moonstones) are not finalized. Will be re-enabled in a future
-- update once both are ready.
--
-- What this migration does:
--   1. Inserts/updates the `moonstones` flag to OFF (enabled=false,
--      rollout_percent=0, allowed_user_ids='{}'). Clients already gate the
--      MoonstoneWidget on HomePage via useFeatureFlag('moonstones'), so
--      flipping this flag hides that entry point immediately.
--   2. Flips companion flags `moonstone-topup` and `rewarded-ad` off so
--      purchase + earning paths also disappear.
--
-- Code for Moonstones (DAL, RPCs, credit ledger, topup sheet, watch-ad
-- sheet) is left intact — nothing is dropped. Re-enabling is one UPDATE:
--   UPDATE public.feature_flags
--   SET enabled=true, rollout_percent=100
--   WHERE key IN ('moonstones', 'moonstone-topup', 'rewarded-ad');
--
-- Idempotent. Safe to re-run.
-- ============================================================================

INSERT INTO public.feature_flags (key, description, enabled, rollout_percent, allowed_user_ids)
VALUES
  ('moonstones',       'Moonstones virtual currency — hidden until payment + spending surfaces are finalized.', false, 0, '{}'),
  ('moonstone-topup',  'Moonstones in-app purchase — hidden until billing is ready.', false, 0, '{}'),
  ('rewarded-ad',      'Rewarded-ad Moonstone earning — hidden while Moonstones are off.', false, 0, '{}')
ON CONFLICT (key) DO UPDATE SET
  enabled          = false,
  rollout_percent  = 0,
  allowed_user_ids = '{}',
  description      = EXCLUDED.description,
  updated_at       = now();

DO $$
BEGIN
  RAISE NOTICE 'hide-moonstones: flipped moonstones + moonstone-topup + rewarded-ad flags off. Balances in moonstone_balances preserved.';
END $$;
