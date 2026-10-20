-- Mood entries — the daily mood log becomes part of the account.
--
-- The diary was localStorage-only ("Your mood log lives on this device only.
-- It is not uploaded or synced."): a reinstall lost it, the account export
-- omitted it, and the weekly letter on a second device read an empty month.
-- It is the sibling of the journal, so it gets the journal's shape — one row
-- per user per local date, own-row RLS, cascade on account deletion — and the
-- client moves any device-only history into the table the first time it can
-- reach it (see src/pages/MoodDiaryPage.tsx and src/dal/moodEntries.ts).
--
-- Dates are the user's LOCAL calendar day (the client writes localDateStr()),
-- the same convention as daily_rituals, so the curve lines up with the days
-- the user lived. No date guard: the migration of old local history is a
-- legitimate back-dated write, and a mood is not a streak — it mints nothing.

CREATE TABLE IF NOT EXISTS public.mood_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date        date NOT NULL,
  -- The eight categories in src/data/moodDiary.ts. A row with an unknown
  -- mood would render as nothing; refuse it at the gate instead.
  mood        text NOT NULL CHECK (mood IN ('calm', 'charged', 'drained', 'steady', 'anxious', 'joyful', 'heavy', 'curious')),
  intensity   smallint NOT NULL DEFAULT 3 CHECK (intensity BETWEEN 1 AND 5),
  note        text CHECK (note IS NULL OR length(note) <= 200),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS mood_entries_user_date_idx
  ON public.mood_entries (user_id, date DESC);

-- Own rows only, on every verb. WITH CHECK on UPDATE as well as USING so a
-- row cannot be re-pointed at another user_id. Each policy is dropped first so
-- the file can be re-applied.
DROP POLICY IF EXISTS mood_entries_select_own ON public.mood_entries;
CREATE POLICY mood_entries_select_own
  ON public.mood_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS mood_entries_insert_own ON public.mood_entries;
CREATE POLICY mood_entries_insert_own
  ON public.mood_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS mood_entries_update_own ON public.mood_entries;
CREATE POLICY mood_entries_update_own
  ON public.mood_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS mood_entries_delete_own ON public.mood_entries;
CREATE POLICY mood_entries_delete_own
  ON public.mood_entries FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Signed-out callers have no business here at all: revoke from every grantee
-- the platform's default privileges hand a new table to, then grant back the
-- four verbs to signed-in users only.
REVOKE ALL ON public.mood_entries FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mood_entries TO authenticated;

-- updated_at follows the row, so "savedAt" on the client is the server's
-- clock rather than the device's.
CREATE OR REPLACE FUNCTION public.mood_entries_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS mood_entries_touch ON public.mood_entries;
CREATE TRIGGER mood_entries_touch
  BEFORE UPDATE ON public.mood_entries
  FOR EACH ROW EXECUTE FUNCTION public.mood_entries_touch_updated_at();

COMMENT ON TABLE public.mood_entries IS
  'Daily mood log: one row per user per local date. Mirrors the localStorage cache in src/data/moodDiary.ts; the client uploads device-only history on first contact.';
