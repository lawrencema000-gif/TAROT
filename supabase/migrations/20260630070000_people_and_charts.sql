-- ============================================================================
-- Arcana 2.0 — "People": chart friends & family (Cece-style)
-- ============================================================================
-- Lets a user save other people's birth data and view their natal charts +
-- compatibility. Mirrors the profiles birth-instant pipeline (Sprint B): a
-- trigger computes birth_utc from (birth_date + birth_time) AT TIME ZONE the
-- birth-place timezone, so all downstream chart math is timezone-correct.
--
--   * people table (owner-scoped, RLS, 50/user cap)
--   * people_compute_birth_utc() trigger (birth_tz fallback chain)
--   * chart jsonb cache (filled by the astrology-person-chart edge fn)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.people (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  relationship text NOT NULL DEFAULT 'friend'
               CHECK (relationship IN ('self','partner','family','friend','other')),
  birth_date   date NOT NULL,
  birth_time   time,                    -- null = time unknown (chart uses noon)
  birth_tz     text,                    -- IANA zone of the birth place
  birth_utc    timestamptz,             -- trigger-computed canonical instant
  birth_place  text,
  birth_lat    double precision,
  birth_lon    double precision,
  chart        jsonb,                   -- cached natal chart (planets/houses/aspects)
  chart_version integer NOT NULL DEFAULT 0,
  notes        text CHECK (notes IS NULL OR length(notes) <= 2000),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_people_user ON public.people(user_id, created_at DESC);

-- ── birth_utc trigger (mirrors profiles_compute_birth_utc) ─────────────────
CREATE OR REPLACE FUNCTION public.people_compute_birth_utc()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_tz text;
BEGIN
  v_tz := COALESCE(NULLIF(NEW.birth_tz, ''), 'UTC');
  -- Guard against an invalid IANA zone slipping in.
  BEGIN
    PERFORM now() AT TIME ZONE v_tz;
  EXCEPTION WHEN OTHERS THEN
    v_tz := 'UTC';
  END;
  NEW.birth_utc := (NEW.birth_date + COALESCE(NEW.birth_time, '12:00'::time)) AT TIME ZONE v_tz;
  NEW.updated_at := now();
  -- Any edit to birth data invalidates the cached chart.
  IF TG_OP = 'UPDATE' AND (
       NEW.birth_date IS DISTINCT FROM OLD.birth_date OR
       NEW.birth_time IS DISTINCT FROM OLD.birth_time OR
       NEW.birth_tz   IS DISTINCT FROM OLD.birth_tz
     ) THEN
    NEW.chart := NULL;
    NEW.chart_version := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS people_birth_utc_trigger ON public.people;
CREATE TRIGGER people_birth_utc_trigger
  BEFORE INSERT OR UPDATE OF birth_date, birth_time, birth_tz ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.people_compute_birth_utc();

-- ── 50-per-user cap ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.people_enforce_cap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.people WHERE user_id = NEW.user_id;
  IF v_count >= 50 THEN
    RAISE EXCEPTION 'PEOPLE_LIMIT: max 50 saved people per user';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS people_cap_trigger ON public.people;
CREATE TRIGGER people_cap_trigger
  BEFORE INSERT ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.people_enforce_cap();

-- ── RLS: owner-only ────────────────────────────────────────────────────────
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS people_select_own ON public.people;
CREATE POLICY people_select_own ON public.people
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS people_insert_own ON public.people;
CREATE POLICY people_insert_own ON public.people
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS people_update_own ON public.people;
CREATE POLICY people_update_own ON public.people
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS people_delete_own ON public.people;
CREATE POLICY people_delete_own ON public.people
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.people TO authenticated;
