-- ============================================================================
-- Replay-only (WP-F-04): the two astrology tables production made by hand
-- ============================================================================
-- astrology_natal_charts and astrology_transit_events were created on
-- production outside the migrations. 20260530000000_rls_initplan_optim puts
-- policies on both and 20260612215703 deletes from the first, so a fresh
-- database stopped at 20260530000000. This file declares them with
-- production's shape as read on 2026-11-17 (columns, defaults, keys, CHECK,
-- index; FKs to profiles(id) with no action, as production had them then;
-- 20261127220000_member_astrology_fks_cascade re-points them to auth.users
-- ON DELETE CASCADE), RLS on, and the two INSERT policies no migration has.
-- The SELECT, UPDATE and DELETE policies come from 20260530000000, next.
-- Production already has every object here: this file is recorded as applied
-- there with `migration repair`, never run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.astrology_natal_charts (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id),
  chart_version integer NOT NULL DEFAULT 1,
  natal_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  big_three_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  dominants_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  aspects_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.astrology_transit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  transit_date date NOT NULL,
  transit_planet text NOT NULL,
  natal_planet text NOT NULL,
  aspect_type text NOT NULL,
  orb numeric NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  significance integer NOT NULL DEFAULT 3 CHECK (significance BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transit_events_user_date
  ON public.astrology_transit_events (user_id, transit_date);

ALTER TABLE public.astrology_natal_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.astrology_transit_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'astrology_natal_charts'
      AND policyname = 'Users can insert own natal chart'
  ) THEN
    CREATE POLICY "Users can insert own natal chart" ON public.astrology_natal_charts
      FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'astrology_transit_events'
      AND policyname = 'Users can insert own transit events'
  ) THEN
    CREATE POLICY "Users can insert own transit events" ON public.astrology_transit_events
      FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
END $$;
