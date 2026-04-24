-- Advisor Marketplace — MVP surface
--
-- V1 scope (this migration):
--   - advisor_profiles: public-readable directory of vetted readers
--   - advisor_interest: users express interest in a reading (captures
--     leads; real booking + payment arrives in Sprint 7)
--
-- Deliberately NO payment integration in this migration. Stripe Connect,
-- LiveKit sessions, and the pay-per-minute billing cycle land in a
-- dedicated follow-up sprint once we have 5-10 actual advisors signed up.

CREATE TABLE IF NOT EXISTS public.advisor_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  /** The platform user id (if the advisor also has a consumer account) */
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  slug            TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  headline        TEXT NOT NULL CHECK (char_length(headline) BETWEEN 10 AND 120),
  bio             TEXT NOT NULL CHECK (char_length(bio) BETWEEN 100 AND 3000),
  avatar_url      TEXT,
  specialties     TEXT[] NOT NULL DEFAULT '{}',
  /** Languages the advisor can give sessions in (EN / JA / KO / ZH / ...) */
  languages       TEXT[] NOT NULL DEFAULT ARRAY['en'],
  /** Years of experience (for display) */
  years_experience INTEGER CHECK (years_experience IS NULL OR years_experience >= 0),
  /** Hourly rate in USD cents. Informational only in V1 — no billing yet. */
  hourly_rate_cents INTEGER CHECK (hourly_rate_cents IS NULL OR hourly_rate_cents >= 0),
  /** 1-5 aggregate rating */
  rating_avg      DECIMAL(3,2) CHECK (rating_avg IS NULL OR (rating_avg >= 0 AND rating_avg <= 5)),
  rating_count    INTEGER NOT NULL DEFAULT 0,
  /** Hide from public directory */
  is_hidden       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS advisor_profiles_public_idx
  ON public.advisor_profiles (rating_avg DESC NULLS LAST)
  WHERE is_hidden = false;

-- Touch updated_at
CREATE OR REPLACE FUNCTION public.advisor_profiles_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS advisor_profiles_touch_updated ON public.advisor_profiles;
CREATE TRIGGER advisor_profiles_touch_updated
  BEFORE UPDATE ON public.advisor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.advisor_profiles_touch_updated_at();

-- Interest / waiting-list captures
CREATE TABLE IF NOT EXISTS public.advisor_interest (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  advisor_id      UUID NOT NULL REFERENCES public.advisor_profiles(id) ON DELETE CASCADE,
  /** What the user wants help with — free text, short */
  topic           TEXT CHECK (topic IS NULL OR char_length(topic) <= 500),
  /** Session type the user is interested in */
  session_type    TEXT NOT NULL DEFAULT 'reading' CHECK (session_type IN ('reading', 'counseling', 'chart-interpretation', 'other')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'completed', 'cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, advisor_id, created_at)
);

CREATE INDEX IF NOT EXISTS advisor_interest_user_idx
  ON public.advisor_interest (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS advisor_interest_advisor_idx
  ON public.advisor_interest (advisor_id, status);

-- RLS
ALTER TABLE public.advisor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_interest ENABLE ROW LEVEL SECURITY;

-- Public read of non-hidden advisor profiles (anyone, auth or anon)
DROP POLICY IF EXISTS advisor_profiles_select_visible ON public.advisor_profiles;
CREATE POLICY advisor_profiles_select_visible
  ON public.advisor_profiles FOR SELECT
  USING (is_hidden = false);

-- Users can create/view their own interest records
DROP POLICY IF EXISTS advisor_interest_select_own ON public.advisor_interest;
CREATE POLICY advisor_interest_select_own
  ON public.advisor_interest FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS advisor_interest_insert_own ON public.advisor_interest;
CREATE POLICY advisor_interest_insert_own
  ON public.advisor_interest FOR INSERT
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT ON public.advisor_profiles TO anon, authenticated;
GRANT SELECT, INSERT ON public.advisor_interest TO authenticated;

-- Seed a few placeholder advisors so the directory isn't empty on launch.
-- These get hidden by the admin once real advisors sign up.
INSERT INTO public.advisor_profiles (slug, display_name, headline, bio, specialties, languages, years_experience, hourly_rate_cents, rating_avg, rating_count, is_hidden)
VALUES
  (
    'seraphina-of-the-tides',
    'Seraphina',
    'Tarot + astrology reader · gentle, truth-telling',
    'Seraphina has been reading cards and birth charts for fifteen years, working primarily with people in transition — breakups, career pivots, the middle of the night questions. Her style is direct but never cold. She reads with a focus on "what is actually yours to carry, and what was handed to you by somebody else." Sessions weave tarot with the client''s natal chart when that helps, and she will tell you when to put the cards down and just talk.',
    ARRAY['tarot', 'astrology', 'shadow-work', 'breakup-recovery'],
    ARRAY['en'],
    15,
    7500,
    4.9,
    124,
    true
  ),
  (
    'ronan-of-the-north-star',
    'Ronan',
    'Natal chart reader + I-Ching scholar',
    'Ronan specialises in long-form natal chart readings and I-Ching consultation. He approaches astrology the way a historian approaches old manuscripts — with rigour, respect, and a willingness to disagree with any tradition when his experience pushes back. Best for: people who want depth over reassurance, who are in a major life transition, or who are drawn to non-Western systems (Bazi, I-Ching, Human Design).',
    ARRAY['natal-chart', 'i-ching', 'bazi', 'career'],
    ARRAY['en', 'zh'],
    12,
    9000,
    4.8,
    87,
    true
  ),
  (
    'aiko-with-the-moon-keys',
    'Aiko',
    'Dream interpretation + Jungian-informed reader',
    'Aiko works at the intersection of dream interpretation, tarot, and Jungian psychology. She''s particularly skilled at reading for creative blocks, recurring dream patterns, and shadow integration. Her sessions usually start with the dream or creative problem, pull 3-5 cards, and weave an interpretation that feels like having a gentle but insightful friend work with you on what''s actually happening underneath.',
    ARRAY['dreams', 'tarot', 'shadow-work', 'creativity'],
    ARRAY['en', 'ja'],
    8,
    6500,
    4.9,
    56,
    true
  );
