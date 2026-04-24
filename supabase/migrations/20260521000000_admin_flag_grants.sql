-- ============================================================================
-- Phase 3 smoke-test helper: enable every Sessions A–G flag for admin-only
-- ============================================================================
-- Run this in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/ulzlthhkqjuohzjangcq/sql
--
-- What it does:
--   For every flag added in Sessions A–G, sets allowed_user_ids to include
--   the admin user so that YOUR admin account sees every feature while
--   regular users see nothing (flags stay enabled=false, rollout_percent=0).
--
-- After smoke-testing with the admin, flip individual flags to
--   (enabled=true, rollout_percent=100) to release to everyone.
--
-- To undo: re-run with admin_user_ids=ARRAY[]::uuid[] to clear.
-- ============================================================================

DO $$
DECLARE
  v_admin_ids uuid[];
  v_flag text;
  v_flags text[] := ARRAY[
    -- Sessions A–G flags shipped:
    'runes',
    'dice',
    'moon-phases',
    'community',
    'whispering-well',
    'moonstones',
    'daily-wisdom',
    'daily-checkin',
    'iching',
    'bazi',
    'human-design',
    'feng-shui',
    'dream-interpreter',
    'mood-diary',
    'partner-compat',
    'ai-companion',
    'ai-quick-reading',
    'ai-tarot-companion',
    'journal-coach',
    'chart-wheel',
    'chart-transits',
    'chart-variants',
    'community-moderation-required',
    'referral',
    'compat-invite',
    'affiliate-program',
    'career-report',
    'year-ahead-report',
    'natal-chart-report',
    'advisor-booking',
    'advisor-voice',
    'advisor-payouts',
    'advisor-verify',
    'live-rooms',
    'live-rooms-voice',
    'live-replays',
    'sandbox',
    'moonstone-topup'
  ];
BEGIN
  -- Collect every admin's user id (checks raw_user_meta_data->>'role').
  SELECT array_agg(id) INTO v_admin_ids
    FROM auth.users
    WHERE raw_user_meta_data->>'role' = 'admin';

  IF v_admin_ids IS NULL OR array_length(v_admin_ids, 1) IS NULL THEN
    RAISE WARNING 'No admin users found. Set raw_user_meta_data->>role=admin on at least one user first.';
    RETURN;
  END IF;

  RAISE NOTICE 'Granting % admin(s) access to all Sessions A–G flags', array_length(v_admin_ids, 1);

  -- Apply to every flag. ON CONFLICT DO NOTHING avoids overwriting if
  -- someone's seeded a custom description. We just update the allow list.
  FOREACH v_flag IN ARRAY v_flags LOOP
    UPDATE public.feature_flags
      SET allowed_user_ids = v_admin_ids,
          updated_at = now()
      WHERE key = v_flag;

    IF NOT FOUND THEN
      INSERT INTO public.feature_flags (key, description, enabled, rollout_percent, allowed_user_ids)
        VALUES (v_flag, 'Auto-registered for admin smoke test', false, 0, v_admin_ids)
        ON CONFLICT (key) DO UPDATE
          SET allowed_user_ids = EXCLUDED.allowed_user_ids,
              updated_at = now();
    END IF;
  END LOOP;

  RAISE NOTICE 'Done. Admin users now see every Sessions A–G feature.';
END$$;

-- Verify — should list every flag with your admin id in allowed_user_ids:
-- SELECT key, enabled, rollout_percent, array_length(allowed_user_ids, 1) AS admin_count
-- FROM public.feature_flags
-- ORDER BY key;
