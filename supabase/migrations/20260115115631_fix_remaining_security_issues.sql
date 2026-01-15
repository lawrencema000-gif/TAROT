/*
  # Fix Remaining Security and Performance Issues

  ## Summary
  This migration addresses security issues identified in the database audit.

  ## 1. Add Missing Foreign Key Indexes
  
  Foreign keys without covering indexes can lead to poor query performance:
  
  - audit_events.user_id
  - content_interactions.user_id
  - journal_attachments.journal_entry_id
  - journal_entries.linked_horoscope_id
  - quiz_results.quiz_definition_id
  - subscriptions.user_id

  ## 2. Optimize RLS Policies on tarot_cards Table
  
  The existing admin policies perform inefficient subqueries. Optimizing to use
  a more efficient check that evaluates once per query instead of per row.

  ## 3. Manual Configuration Required (Dashboard Only)
  
  ### A. Enable Password Breach Protection
  1. Go to Authentication -> Providers -> Email
  2. Enable "Check for leaked passwords"
  
  ### B. Fix Auth Connection Pool Strategy
  1. Go to Project Settings -> Database -> Connection Pooling
  2. Change from fixed (10) to percentage-based (10-15%)

  ## Notes
  - Foreign key indexes improve JOIN and CASCADE DELETE performance
  - RLS policy optimization reduces query evaluation overhead
*/

-- ==============================================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ==============================================================================

-- Index for audit_events.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id 
  ON public.audit_events(user_id);

-- Index for content_interactions.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_content_interactions_user_id 
  ON public.content_interactions(user_id);

-- Index for journal_attachments.journal_entry_id foreign key
CREATE INDEX IF NOT EXISTS idx_journal_attachments_journal_entry_id 
  ON public.journal_attachments(journal_entry_id);

-- Index for journal_entries.linked_horoscope_id foreign key
CREATE INDEX IF NOT EXISTS idx_journal_entries_linked_horoscope_id 
  ON public.journal_entries(linked_horoscope_id) 
  WHERE linked_horoscope_id IS NOT NULL;

-- Index for quiz_results.quiz_definition_id foreign key
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_definition_id 
  ON public.quiz_results(quiz_definition_id) 
  WHERE quiz_definition_id IS NOT NULL;

-- Index for subscriptions.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id 
  ON public.subscriptions(user_id);

-- ==============================================================================
-- 2. OPTIMIZE RLS POLICIES ON tarot_cards TABLE
-- ==============================================================================

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admin users can insert tarot cards" ON public.tarot_cards;
DROP POLICY IF EXISTS "Admin users can update tarot cards" ON public.tarot_cards;

-- Create optimized admin insert policy
-- Uses (select auth.jwt()) to evaluate once per query instead of per row
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

-- Create optimized admin update policy
-- Uses (select auth.jwt()) to evaluate once per query instead of per row
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
