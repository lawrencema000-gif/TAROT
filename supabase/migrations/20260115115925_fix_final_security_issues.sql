/*
  # Fix Final Security Issues

  ## Summary
  This migration addresses the remaining security and performance issues.

  ## 1. Remove Unused Indexes
  
  The following indexes were added for foreign keys but are not being used by queries.
  Removing them to reduce storage overhead and improve write performance:
  
  - idx_audit_events_user_id
  - idx_content_interactions_user_id
  - idx_journal_attachments_journal_entry_id
  - idx_journal_entries_linked_horoscope_id
  - idx_quiz_results_quiz_definition_id
  - idx_subscriptions_user_id

  ## 2. Fix RLS Performance on tarot_cards Table
  
  Create a helper function to check admin status that evaluates once per query
  instead of per row, then use this function in the RLS policies.

  ## 3. Fix calculate_user_level Function Search Path
  
  Update the function to use proper search_path configuration that prevents
  search_path injection while allowing access to necessary schemas.

  ## 4. Manual Configuration Required (Dashboard Only)
  
  ### A. Enable Password Breach Protection
  1. Go to Authentication -> Providers -> Email
  2. Enable "Check for leaked passwords"
  
  ### B. Fix Auth Connection Pool Strategy
  1. Go to Project Settings -> Database -> Connection Pooling
  2. Change from fixed (10) to percentage-based (10-15%)
*/

-- ==============================================================================
-- 1. REMOVE UNUSED INDEXES
-- ==============================================================================

DROP INDEX IF EXISTS public.idx_audit_events_user_id;
DROP INDEX IF EXISTS public.idx_content_interactions_user_id;
DROP INDEX IF EXISTS public.idx_journal_attachments_journal_entry_id;
DROP INDEX IF EXISTS public.idx_journal_entries_linked_horoscope_id;
DROP INDEX IF EXISTS public.idx_quiz_results_quiz_definition_id;
DROP INDEX IF EXISTS public.idx_subscriptions_user_id;

-- ==============================================================================
-- 2. CREATE ADMIN CHECK FUNCTION AND OPTIMIZE RLS POLICIES
-- ==============================================================================

-- Create a STABLE function to check if current user is admin
-- STABLE functions are evaluated once per statement, not per row
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'admin'
  );
END;
$$;

-- Drop existing admin policies on tarot_cards
DROP POLICY IF EXISTS "Admin users can insert tarot cards" ON public.tarot_cards;
DROP POLICY IF EXISTS "Admin users can update tarot cards" ON public.tarot_cards;

-- Create optimized admin insert policy using the helper function
CREATE POLICY "Admin users can insert tarot cards"
  ON public.tarot_cards
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Create optimized admin update policy using the helper function
CREATE POLICY "Admin users can update tarot cards"
  ON public.tarot_cards
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ==============================================================================
-- 3. FIX calculate_user_level FUNCTION SEARCH PATH
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.calculate_user_level(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  total_xp integer;
BEGIN
  SELECT COALESCE(
    (SELECT COUNT(*) * 10 FROM public.journal_entries WHERE user_id = p_user_id) +
    (SELECT COUNT(*) * 15 FROM public.tarot_readings WHERE user_id = p_user_id) +
    (SELECT COUNT(*) * 20 FROM public.quiz_results WHERE user_id = p_user_id) +
    (SELECT COUNT(*) * 5 FROM public.daily_rituals WHERE user_id = p_user_id AND completed = true),
    0
  ) INTO total_xp;
  
  RETURN GREATEST(1, FLOOR(SQRT(total_xp / 50.0))::integer + 1);
END;
$$;
