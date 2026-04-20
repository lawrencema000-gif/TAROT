-- ============================================================================
-- Harden SET search_path on SECURITY DEFINER functions
-- ============================================================================
-- Why: The v2 backend audit (db-audit-v2.md M3) flagged that three
-- SECURITY DEFINER trigger functions use `SET search_path = public`. A
-- schema-swap attacker who can insert a table into a schema that appears
-- before `public` in the search_path could shadow functions like
-- `gen_random_uuid` or `jsonb_build_object`. Setting `search_path = ''`
-- (empty) with fully qualified references is the textbook hardening,
-- but the existing function bodies reference `profiles`, `NEW.*`, etc.
-- unqualified. A safe middle ground that works without rewriting the
-- bodies: pin to `pg_catalog, public` so system catalog resolution
-- comes first and user-schema shadow is impossible.
--
-- We only harden functions that still use the vulnerable pattern. The
-- newer ones (check_level_milestones in 20260404000000) already use the
-- hardened form.
--
-- Idempotent: ALTER FUNCTION ... SET search_path is safe to re-run.
-- ============================================================================

-- handle_new_user (auth.users INSERT trigger)
ALTER FUNCTION public.handle_new_user()
  SET search_path = pg_catalog, public;

-- send_welcome_email_trigger (auth.users INSERT trigger; fires net.http_post)
-- Note this one needs net schema on the path since it calls net.http_post.
ALTER FUNCTION public.send_welcome_email_trigger()
  SET search_path = pg_catalog, public, net;

-- Also harden the achievement + XP trigger helpers the audit flagged by proxy.
DO $$
DECLARE
  fn_name text;
  fn_names text[] := ARRAY[
    'award_xp',
    'award_badge',
    'check_achievement_progress',
    'check_streak_achievements',
    'update_user_streak',
    'increment_streak_on_ritual',
    'check_and_award_streak_milestone',
    'increment_login_streak',
    'record_daily_session',
    'log_auth_event',
    'delete_user_account',
    'get_ad_config',
    'get_user_daily_ad_stats',
    'record_ad_event',
    'initialize_user_achievements'
  ];
BEGIN
  FOREACH fn_name IN ARRAY fn_names LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION public.%I() SET search_path = pg_catalog, public', fn_name);
    EXCEPTION
      WHEN undefined_function THEN
        -- Function signature differs or doesn't exist with that name — try
        -- to find any overload and harden it.
        DECLARE
          r record;
        BEGIN
          FOR r IN
            SELECT oid::regprocedure AS sig
              FROM pg_proc
             WHERE pronamespace = 'public'::regnamespace
               AND proname = fn_name
          LOOP
            EXECUTE format('ALTER FUNCTION %s SET search_path = pg_catalog, public', r.sig);
          END LOOP;
        END;
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not harden %: %', fn_name, SQLERRM;
    END;
  END LOOP;
END $$;
