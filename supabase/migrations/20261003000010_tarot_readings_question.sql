-- Saved readings keep the typed question.
--
-- The focus step lets the reader type a question ("Optional. It becomes the
-- title of your reading."), and the live reveal titles the result with it.
-- Saving dropped it: tarot_readings had nowhere to put it, so a reading
-- reopened from the Library came back titled with the spread's name and the
-- question the whole reading answered was gone.
--
-- One nullable column. The client (src/dal/tarotReadings.ts) sends it only
-- when the reader typed something, and retries without it on PGRST204 /
-- 42703, so the app works on either side of this migration. The 500-char
-- ceiling is well above the input's own limit (TarotFocusView caps it) and
-- exists so the column cannot become a free-text store.

ALTER TABLE public.tarot_readings
  ADD COLUMN IF NOT EXISTS question text
  CHECK (question IS NULL OR char_length(question) <= 500);

COMMENT ON COLUMN public.tarot_readings.question IS
  'The question the reader typed on the focus step, when they typed one. Shown as the title of the saved reading. NULL when none was asked.';

-- PostgREST caches the schema; tell it about the new column now rather than
-- on its next reload, so the first save after the push already carries it.
NOTIFY pgrst, 'reload schema';
