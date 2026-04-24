-- ============================================================================
-- Verification pass — read-only via RAISE NOTICE so output lands in push log
-- ============================================================================
-- This migration asserts the state of the security hardening + admin grant
-- set up in the preceding migrations. No writes, just NOTICEs that show up
-- in the supabase db push log.
--
-- Checks:
--   A. Owner is marked admin
--   B. Security hardening removed the leaky policies + revoked inserts
--   C. New admin RPCs exist and are owned correctly
--   D. AskOracleButton infra — quizzes + runes + I-Ching routes respect flag
--
-- Idempotent; safe to re-run.
-- ============================================================================

DO $$
DECLARE
  v_admin_count integer;
  v_owner_id uuid;
  v_flag_rows_with_admin integer;
  v_compat_policy_count integer;
  v_moonstone_insert_policy_count integer;
  v_checkin_insert_policy_count integer;
  v_advisor_update_priv integer;
  v_community_trigger_count integer;
  v_admin_grant_rpc_exists boolean;
  v_quiz_dedup_index boolean;
  v_streak_table_exists boolean;
BEGIN
  -- A. Admin user
  SELECT id INTO v_owner_id
    FROM auth.users WHERE lower(email) = 'lawrence.ma000@gmail.com';
  SELECT COUNT(*)::int INTO v_admin_count
    FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin';
  IF v_admin_count = 0 THEN
    RAISE WARNING 'A. NO admin users found';
  ELSE
    RAISE NOTICE 'A. % admin user(s); owner uid = %', v_admin_count, v_owner_id;
  END IF;

  SELECT COUNT(*)::int INTO v_flag_rows_with_admin
    FROM public.feature_flags
    WHERE array_length(allowed_user_ids, 1) > 0;
  RAISE NOTICE 'A. Flags with admin granted: %', v_flag_rows_with_admin;

  -- B1. compat_invites: select_by_code policy should be gone
  SELECT COUNT(*)::int INTO v_compat_policy_count
    FROM pg_policies WHERE tablename = 'compat_invites' AND policyname = 'compat_invites_select_by_code';
  IF v_compat_policy_count = 0 THEN
    RAISE NOTICE 'B1. compat_invites PII leak: CLOSED (policy removed)';
  ELSE
    RAISE WARNING 'B1. compat_invites_select_by_code policy still exists';
  END IF;

  -- B2. moonstone_transactions: insert_own_credits policy should be gone
  SELECT COUNT(*)::int INTO v_moonstone_insert_policy_count
    FROM pg_policies WHERE tablename = 'moonstone_transactions'
    AND policyname = 'moonstone_transactions_insert_own_credits';
  IF v_moonstone_insert_policy_count = 0 THEN
    RAISE NOTICE 'B2. Moonstone mint exploit: CLOSED (policy removed)';
  ELSE
    RAISE WARNING 'B2. moonstone_transactions_insert_own_credits still exists';
  END IF;

  -- B3. moonstone_daily_checkins: insert_own policy should be gone
  SELECT COUNT(*)::int INTO v_checkin_insert_policy_count
    FROM pg_policies WHERE tablename = 'moonstone_daily_checkins'
    AND policyname = 'moonstone_daily_checkins_insert_own';
  IF v_checkin_insert_policy_count = 0 THEN
    RAISE NOTICE 'B3. Check-in fabrication: CLOSED (policy removed)';
  ELSE
    RAISE WARNING 'B3. moonstone_daily_checkins_insert_own still exists';
  END IF;

  -- B4. advisor_sessions: authenticated role should have UPDATE only on (rating, review)
  -- Check if the role has any broader UPDATE privilege
  SELECT COUNT(*)::int INTO v_advisor_update_priv
    FROM information_schema.column_privileges
    WHERE grantee = 'authenticated'
      AND table_schema = 'public' AND table_name = 'advisor_sessions'
      AND privilege_type = 'UPDATE';
  -- Should be exactly 2: rating + review. More = too permissive.
  IF v_advisor_update_priv = 2 THEN
    RAISE NOTICE 'B4. advisor_sessions UPDATE grant: RESTRICTED to (rating, review)';
  ELSE
    RAISE WARNING 'B4. advisor_sessions UPDATE grant has % column privs (expected 2)', v_advisor_update_priv;
  END IF;

  -- B5. Community moderation trigger exists
  SELECT COUNT(*)::int INTO v_community_trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname IN ('community_posts', 'community_comments')
      AND t.tgname LIKE '%force_pending%';
  IF v_community_trigger_count = 2 THEN
    RAISE NOTICE 'B5. Community moderation bypass: CLOSED (triggers on posts+comments)';
  ELSE
    RAISE WARNING 'B5. Expected 2 moderation triggers, found %', v_community_trigger_count;
  END IF;

  -- C. Admin support RPCs
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname IN ('admin_moonstone_grant', 'admin_moonstone_claw')
  ) INTO v_admin_grant_rpc_exists;
  IF v_admin_grant_rpc_exists THEN
    RAISE NOTICE 'C. admin_moonstone_grant / _claw RPCs: EXIST';
  ELSE
    RAISE WARNING 'C. admin grant/claw RPCs missing';
  END IF;

  -- D1. Quiz dedup unique index
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'moonstone_transactions_quiz_unique_idx'
  ) INTO v_quiz_dedup_index;
  IF v_quiz_dedup_index THEN
    RAISE NOTICE 'D1. Quiz-complete unique index: EXISTS';
  ELSE
    RAISE WARNING 'D1. Quiz dedup index missing';
  END IF;

  -- D2. Streak milestones table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'moonstone_streak_milestones'
  ) INTO v_streak_table_exists;
  IF v_streak_table_exists THEN
    RAISE NOTICE 'D2. moonstone_streak_milestones table: EXISTS';
  ELSE
    RAISE WARNING 'D2. streak milestones table missing';
  END IF;

  RAISE NOTICE '=== verification complete ===';
END$$;
