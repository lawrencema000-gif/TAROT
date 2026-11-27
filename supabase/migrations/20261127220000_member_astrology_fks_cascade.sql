-- p12 gap-1-24 (WP-P0-18): members with a cast chart could not delete their
-- account. Three tables made outside the migrations referenced profiles(id)
-- with NO ACTION, delete_user_account never cleared them, and its DELETE FROM
-- profiles rolled the whole deletion back. They now follow the member like
-- every other member table: ON DELETE CASCADE from auth.users (the canonical
-- 20260420000000 declares the same for the cache).
DO $$
BEGIN
  IF to_regclass('public.astrology_natal_charts') IS NULL THEN
    CREATE TABLE public.astrology_natal_charts (
      user_id uuid PRIMARY KEY,
      chart_version integer NOT NULL DEFAULT 1,
      natal_json jsonb NOT NULL DEFAULT '{}'::jsonb,
      big_three_json jsonb NOT NULL DEFAULT '{}'::jsonb,
      dominants_json jsonb NOT NULL DEFAULT '{}'::jsonb,
      aspects_json jsonb NOT NULL DEFAULT '[]'::jsonb,
      computed_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE public.astrology_natal_charts ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can read own natal chart" ON public.astrology_natal_charts FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
    CREATE POLICY "Users can insert own natal chart" ON public.astrology_natal_charts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update own natal chart" ON public.astrology_natal_charts FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
  END IF;
  IF to_regclass('public.astrology_transit_events') IS NULL THEN
    CREATE TABLE public.astrology_transit_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      transit_date date NOT NULL,
      transit_planet text NOT NULL,
      natal_planet text NOT NULL,
      aspect_type text NOT NULL,
      orb numeric NOT NULL DEFAULT 0,
      description text NOT NULL DEFAULT '',
      significance integer NOT NULL DEFAULT 3,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE public.astrology_transit_events ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can read own transit events" ON public.astrology_transit_events FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
    CREATE POLICY "Users can insert own transit events" ON public.astrology_transit_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can delete own transit events" ON public.astrology_transit_events FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);
  END IF;
END $$;

ALTER TABLE public.astrology_natal_charts DROP CONSTRAINT IF EXISTS astrology_natal_charts_user_id_fkey;
ALTER TABLE public.astrology_natal_charts ADD CONSTRAINT astrology_natal_charts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.astrology_transit_events DROP CONSTRAINT IF EXISTS astrology_transit_events_user_id_fkey;
ALTER TABLE public.astrology_transit_events ADD CONSTRAINT astrology_transit_events_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.astrology_horoscope_cache DROP CONSTRAINT IF EXISTS astrology_horoscope_cache_user_id_fkey;
ALTER TABLE public.astrology_horoscope_cache ADD CONSTRAINT astrology_horoscope_cache_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
