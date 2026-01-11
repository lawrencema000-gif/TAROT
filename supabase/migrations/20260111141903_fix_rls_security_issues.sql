/*
  # Fix Security Issues - RLS and Performance Optimization

  ## Summary
  This migration addresses critical security and performance issues identified in the database audit.

  ## 1. RLS Policy Performance Optimization
  
  ### premium_readings table
  - Fix three policies to use `(select auth.uid())` instead of `auth.uid()`
  - This prevents re-evaluation per row and improves query performance at scale
  - Affected policies:
    - Users can read own premium readings
    - Users can insert own premium readings
    - Users can delete own premium readings

  ## 2. RLS Policy Security Hardening
  
  ### tarot_cards table
  - Replace overly permissive policies that allow ANY authenticated user to modify cards
  - Restrict INSERT and UPDATE operations to admin users only
  - Public users retain read-only access
  - Policies now check for admin role instead of allowing all authenticated users

  ## 3. Performance - Remove Unused Indexes
  
  Drop indexes that are not being utilized to reduce storage overhead and improve write performance:
  - horoscope_history: idx_horoscope_history_user_date
  - journal_attachments: idx_journal_attachments_entry
  - journal_entries: idx_journal_entries_tags, idx_journal_entries_linked_horoscope
  - tarot_cards: idx_tarot_cards_arcana
  - quiz_definitions: idx_quiz_definitions_type
  - subscriptions: idx_subscriptions_user_status, idx_subscriptions_expires
  - audit_events: idx_audit_events_user, idx_audit_events_name, idx_audit_events_session
  - user_badges: idx_user_badges_user
  - quiz_results: idx_quiz_results_quiz_definition
  - user_preferences: idx_user_preferences_user_id
  - content_interactions: idx_content_interactions_user_id, idx_content_interactions_type, idx_content_interactions_created
  - premium_readings: idx_premium_readings_created_at
  - daily_readings_cache: idx_daily_readings_cache_date

  ## 4. Dashboard Configuration Required
  
  The following security settings must be configured in the Supabase Dashboard:
  
  ### Enable Password Breach Protection
  1. Go to Authentication → Providers → Email
  2. Enable "Check for leaked passwords (HaveIBeenPwned.org)"
  
  ### Fix Auth Connection Pool Strategy
  1. Go to Project Settings → Database
  2. Change Auth server connection allocation from fixed number to percentage-based
  3. This ensures connection scaling works properly with instance upgrades

  ## Notes
  - Admin users are identified by checking raw_user_meta_data->>'role' = 'admin'
  - All policies maintain backward compatibility for existing users
  - No data loss occurs during this migration
*/

-- ==============================================================================
-- 1. FIX RLS PERFORMANCE - premium_readings table
-- ==============================================================================

DROP POLICY IF EXISTS "Users can read own premium readings" ON public.premium_readings;
DROP POLICY IF EXISTS "Users can insert own premium readings" ON public.premium_readings;
DROP POLICY IF EXISTS "Users can delete own premium readings" ON public.premium_readings;

CREATE POLICY "Users can read own premium readings"
  ON public.premium_readings
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own premium readings"
  ON public.premium_readings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own premium readings"
  ON public.premium_readings
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ==============================================================================
-- 2. FIX RLS SECURITY - tarot_cards table (restrict to admins only)
-- ==============================================================================

DROP POLICY IF EXISTS "Authenticated users can insert tarot cards" ON public.tarot_cards;
DROP POLICY IF EXISTS "Authenticated users can update tarot cards" ON public.tarot_cards;

-- Only allow admin users to insert tarot cards
CREATE POLICY "Admin users can insert tarot cards"
  ON public.tarot_cards
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.jwt()->>'email') IN (
      SELECT email FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Only allow admin users to update tarot cards
CREATE POLICY "Admin users can update tarot cards"
  ON public.tarot_cards
  FOR UPDATE
  TO authenticated
  USING (
    (select auth.jwt()->>'email') IN (
      SELECT email FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    (select auth.jwt()->>'email') IN (
      SELECT email FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ==============================================================================
-- 3. REMOVE UNUSED INDEXES FOR PERFORMANCE
-- ==============================================================================

-- Drop unused indexes on horoscope_history
DROP INDEX IF EXISTS public.idx_horoscope_history_user_date;

-- Drop unused indexes on journal_attachments
DROP INDEX IF EXISTS public.idx_journal_attachments_entry;

-- Drop unused indexes on journal_entries
DROP INDEX IF EXISTS public.idx_journal_entries_tags;
DROP INDEX IF EXISTS public.idx_journal_entries_linked_horoscope;

-- Drop unused indexes on tarot_cards
DROP INDEX IF EXISTS public.idx_tarot_cards_arcana;

-- Drop unused indexes on quiz_definitions
DROP INDEX IF EXISTS public.idx_quiz_definitions_type;

-- Drop unused indexes on subscriptions
DROP INDEX IF EXISTS public.idx_subscriptions_user_status;
DROP INDEX IF EXISTS public.idx_subscriptions_expires;

-- Drop unused indexes on audit_events
DROP INDEX IF EXISTS public.idx_audit_events_user;
DROP INDEX IF EXISTS public.idx_audit_events_name;
DROP INDEX IF EXISTS public.idx_audit_events_session;

-- Drop unused indexes on user_badges
DROP INDEX IF EXISTS public.idx_user_badges_user;

-- Drop unused indexes on quiz_results
DROP INDEX IF EXISTS public.idx_quiz_results_quiz_definition;

-- Drop unused indexes on user_preferences
DROP INDEX IF EXISTS public.idx_user_preferences_user_id;

-- Drop unused indexes on content_interactions
DROP INDEX IF EXISTS public.idx_content_interactions_user_id;
DROP INDEX IF EXISTS public.idx_content_interactions_type;
DROP INDEX IF EXISTS public.idx_content_interactions_created;

-- Drop unused indexes on premium_readings
DROP INDEX IF EXISTS public.idx_premium_readings_created_at;

-- Drop unused indexes on daily_readings_cache
DROP INDEX IF EXISTS public.idx_daily_readings_cache_date;
