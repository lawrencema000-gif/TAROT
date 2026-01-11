/*
  # Fix Security and Performance Issues

  This migration addresses several security and performance optimizations:

  1. Missing Foreign Key Indexes
    - Add index on `journal_entries.linked_horoscope_id`
    - Add index on `quiz_results.quiz_definition_id`

  2. RLS Policy Optimization
    - Replace `auth.uid()` with `(select auth.uid())` in all policies
    - This prevents re-evaluation per row and improves query performance
    - Affected tables: profiles, journal_entries, tarot_readings, quiz_results,
      horoscope_history, saved_highlights, daily_rituals, subscriptions,
      user_preferences, audit_events, journal_attachments, user_badges,
      content_interactions

  3. Function Search Path Security
    - Set immutable search_path on all functions to prevent search_path injection
    - Affected functions: sync_premium_status, calculate_journal_word_count,
      update_updated_at_column, has_active_subscription, calculate_user_level
*/

-- 1. Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_journal_entries_linked_horoscope
  ON public.journal_entries(linked_horoscope_id);

CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_definition
  ON public.quiz_results(quiz_definition_id);

-- 2. Recreate RLS policies with optimized auth.uid() calls

-- profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- journal_entries table
DROP POLICY IF EXISTS "Users can view own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can insert own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can update own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can delete own journal entries" ON public.journal_entries;

CREATE POLICY "Users can view own journal entries"
  ON public.journal_entries FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own journal entries"
  ON public.journal_entries FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own journal entries"
  ON public.journal_entries FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own journal entries"
  ON public.journal_entries FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- tarot_readings table
DROP POLICY IF EXISTS "Users can view own tarot readings" ON public.tarot_readings;
DROP POLICY IF EXISTS "Users can insert own tarot readings" ON public.tarot_readings;
DROP POLICY IF EXISTS "Users can update own tarot readings" ON public.tarot_readings;
DROP POLICY IF EXISTS "Users can delete own tarot readings" ON public.tarot_readings;

CREATE POLICY "Users can view own tarot readings"
  ON public.tarot_readings FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own tarot readings"
  ON public.tarot_readings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own tarot readings"
  ON public.tarot_readings FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own tarot readings"
  ON public.tarot_readings FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- quiz_results table
DROP POLICY IF EXISTS "Users can view own quiz results" ON public.quiz_results;
DROP POLICY IF EXISTS "Users can insert own quiz results" ON public.quiz_results;
DROP POLICY IF EXISTS "Users can delete own quiz results" ON public.quiz_results;

CREATE POLICY "Users can view own quiz results"
  ON public.quiz_results FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own quiz results"
  ON public.quiz_results FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own quiz results"
  ON public.quiz_results FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- horoscope_history table
DROP POLICY IF EXISTS "Users can view own horoscope history" ON public.horoscope_history;
DROP POLICY IF EXISTS "Users can insert own horoscope history" ON public.horoscope_history;

CREATE POLICY "Users can view own horoscope history"
  ON public.horoscope_history FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own horoscope history"
  ON public.horoscope_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- saved_highlights table
DROP POLICY IF EXISTS "Users can view own saved highlights" ON public.saved_highlights;
DROP POLICY IF EXISTS "Users can insert own saved highlights" ON public.saved_highlights;
DROP POLICY IF EXISTS "Users can delete own saved highlights" ON public.saved_highlights;

CREATE POLICY "Users can view own saved highlights"
  ON public.saved_highlights FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own saved highlights"
  ON public.saved_highlights FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own saved highlights"
  ON public.saved_highlights FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- daily_rituals table
DROP POLICY IF EXISTS "Users can view own daily rituals" ON public.daily_rituals;
DROP POLICY IF EXISTS "Users can insert own daily rituals" ON public.daily_rituals;
DROP POLICY IF EXISTS "Users can update own daily rituals" ON public.daily_rituals;

CREATE POLICY "Users can view own daily rituals"
  ON public.daily_rituals FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own daily rituals"
  ON public.daily_rituals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own daily rituals"
  ON public.daily_rituals FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- subscriptions table
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;

CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own subscriptions"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own subscriptions"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- user_preferences table
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;

CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- audit_events table
DROP POLICY IF EXISTS "Users can view own audit events" ON public.audit_events;
DROP POLICY IF EXISTS "Users can insert own audit events" ON public.audit_events;

CREATE POLICY "Users can view own audit events"
  ON public.audit_events FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own audit events"
  ON public.audit_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- journal_attachments table (uses subquery for ownership check)
DROP POLICY IF EXISTS "Users can view own journal attachments" ON public.journal_attachments;
DROP POLICY IF EXISTS "Users can insert own journal attachments" ON public.journal_attachments;
DROP POLICY IF EXISTS "Users can delete own journal attachments" ON public.journal_attachments;

CREATE POLICY "Users can view own journal attachments"
  ON public.journal_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.journal_entries
      WHERE journal_entries.id = journal_attachments.journal_entry_id
      AND journal_entries.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own journal attachments"
  ON public.journal_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.journal_entries
      WHERE journal_entries.id = journal_attachments.journal_entry_id
      AND journal_entries.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own journal attachments"
  ON public.journal_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.journal_entries
      WHERE journal_entries.id = journal_attachments.journal_entry_id
      AND journal_entries.user_id = (select auth.uid())
    )
  );

-- user_badges table
DROP POLICY IF EXISTS "Users can view own badges" ON public.user_badges;
DROP POLICY IF EXISTS "Users can insert own badges" ON public.user_badges;

CREATE POLICY "Users can view own badges"
  ON public.user_badges FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own badges"
  ON public.user_badges FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- content_interactions table
DROP POLICY IF EXISTS "Users can view own interactions" ON public.content_interactions;
DROP POLICY IF EXISTS "Users can insert own interactions" ON public.content_interactions;

CREATE POLICY "Users can view own interactions"
  ON public.content_interactions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own interactions"
  ON public.content_interactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- 3. Fix function search_path mutability

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_journal_word_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.content IS NOT NULL THEN
    NEW.word_count = array_length(regexp_split_to_array(trim(NEW.content), '\s+'), 1);
  ELSE
    NEW.word_count = 0;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_premium_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET is_premium = (NEW.status = 'active' AND NEW.expires_at > now())
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Drop and recreate has_active_subscription with new parameter name
DROP FUNCTION IF EXISTS public.has_active_subscription(uuid);

CREATE FUNCTION public.has_active_subscription(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND expires_at > now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_user_level(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
