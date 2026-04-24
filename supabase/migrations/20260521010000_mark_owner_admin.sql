-- ============================================================================
-- Mark app owner as admin + re-apply flag grants
-- ============================================================================
-- Phase 3 smoke-test prep:
--   1. Set raw_user_meta_data->>'role' = 'admin' on the app owner's account
--      (lawrence.ma000@gmail.com) so the is_admin() SECURITY DEFINER
--      function returns true for them.
--   2. Re-run the admin-flags grant so their user id lands in allowed_user_ids
--      on every Sessions A–G flag.
--
-- Idempotent. Re-running is safe.
-- ============================================================================

DO $$
DECLARE
  v_owner_email text := 'lawrence.ma000@gmail.com';
  v_owner_id uuid;
  v_admin_ids uuid[];
  v_flag text;
  v_flags text[] := ARRAY[
    'runes','dice','moon-phases',
    'community','whispering-well',
    'moonstones','daily-wisdom','daily-checkin',
    'iching','bazi','human-design','feng-shui','dream-interpreter',
    'mood-diary','partner-compat',
    'ai-companion','ai-quick-reading','ai-tarot-companion','journal-coach',
    'chart-wheel','chart-transits','chart-variants',
    'community-moderation-required',
    'referral','compat-invite','affiliate-program',
    'career-report','year-ahead-report','natal-chart-report',
    'advisor-booking','advisor-voice','advisor-payouts','advisor-verify',
    'live-rooms','live-rooms-voice','live-replays',
    'sandbox','moonstone-topup'
  ];
BEGIN
  -- Step 1 — find owner
  SELECT id INTO v_owner_id FROM auth.users WHERE lower(email) = lower(v_owner_email) LIMIT 1;
  IF v_owner_id IS NULL THEN
    RAISE NOTICE 'Owner account % not found — skipping admin grant.', v_owner_email;
    RETURN;
  END IF;

  -- Step 2 — mark them admin via raw_user_meta_data
  UPDATE auth.users
    SET raw_user_meta_data =
      COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
    WHERE id = v_owner_id;
  RAISE NOTICE 'Marked % (%) as admin.', v_owner_email, v_owner_id;

  -- Step 3 — collect every admin id (now including the owner)
  SELECT array_agg(id) INTO v_admin_ids
    FROM auth.users
    WHERE raw_user_meta_data->>'role' = 'admin';
  RAISE NOTICE 'Total admin users: %', array_length(v_admin_ids, 1);

  -- Step 4 — put admin ids on every Sessions A–G flag's allowed_user_ids
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

  RAISE NOTICE 'Applied admin grant to % Sessions A-G flags.', array_length(v_flags, 1);
END$$;
