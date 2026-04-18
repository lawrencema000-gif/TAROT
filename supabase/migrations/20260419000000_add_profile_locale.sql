-- Add locale column to profiles so each user's language choice is persisted
-- across devices and sessions. Phase 0 of the i18n rollout.
--
-- Allowed values match our four supported locales. The CHECK constraint
-- prevents stray values (e.g. 'zh-TW') from being written before we support
-- them properly — we'll relax this when the language set grows.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS locale TEXT
  DEFAULT 'en'
  CHECK (locale IN ('en', 'ja', 'ko', 'zh'));

-- Partial index: most rows will have the default 'en' value, so indexing
-- only the non-default lets the planner cheaply answer "how many users
-- picked a non-default locale" without scanning.
CREATE INDEX IF NOT EXISTS profiles_locale_idx
  ON public.profiles (locale)
  WHERE locale <> 'en';
