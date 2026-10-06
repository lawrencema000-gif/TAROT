-- Journal word count in every language the app speaks (R7 #93; FX6 request).
--
-- calculate_journal_word_count() split an entry on whitespace. Japanese
-- and Chinese put no spaces between words, so a Japanese or Chinese entry
-- was one word however long it ran. The journal screen already counts from
-- the text (src/components/journal/wordCount.ts); this stored column, kept
-- for analytics, now follows the same rule as that file's
-- countWordsFallback, the fixed rule it uses when a WebView has no
-- Intl.Segmenter:
--
--   * every kana, CJK ideograph and Hangul syllable is one word. These are
--     the client's CJK_CHAR ranges, code point for code point: U+3040–30FF,
--     3400–4DBF, 4E00–9FFF, F900–FAFF and AC00–D7AF. (Korean therefore
--     counts per syllable, as the client fallback does.)
--   * everything else counts one word per run of letters and digits.
--     Whitespace, punctuation and symbols end a run, so "don't" is two
--     words, as it is in the client fallback.
--
-- "Letters and digits" is written as "not whitespace, punctuation or a
-- symbol", using explicit code-point ranges. That keeps the meaning the
-- same under any database locale; a C-locale [[:alpha:]] does not match
-- Cyrillic or Greek, for example.
--
-- Existing rows are recounted once. The updated_at trigger is switched off
-- for the recount, so the recount does not register as an edit.

CREATE OR REPLACE FUNCTION public.journal_word_count(p_text text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $fn$
  SELECT CASE
    WHEN p_text IS NULL OR btrim(p_text) = '' THEN 0
    ELSE
      -- one per kana, ideograph and Hangul syllable
      (char_length(p_text)
        - char_length(regexp_replace(p_text, '[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]', '', 'g')))
      -- one per run of letters and digits in the rest
      + (SELECT count(*)::integer
           FROM regexp_matches(
             regexp_replace(p_text, '[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]', ' ', 'g'),
             '[^\s\u0001-/:-@[-`{-¿×÷ -⁯₠-⃏←-⯿⸀-⹿　-〄〈-〠〰〶〷〽-〿︀-︟︰-﹯﻿！-／：-＠［-｀｛-･￠-￯￰-￿\U0001f000-\U0001faff\U000e0000-\U000e007f]+',
             'g'))
  END
$fn$;

COMMENT ON FUNCTION public.journal_word_count(text) IS
  'Words in a journal entry: one per kana / CJK ideograph / Hangul syllable, plus one per run of letters and digits. Same rule as countWordsFallback in src/components/journal/wordCount.ts.';

-- Called by the trigger below, never by a client.
REVOKE EXECUTE ON FUNCTION public.journal_word_count(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.calculate_journal_word_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  NEW.word_count := public.journal_word_count(NEW.content);
  RETURN NEW;
END;
$fn$;

-- The trigger itself (calculate_journal_word_count_trigger, BEFORE INSERT
-- OR UPDATE) is unchanged: it calls the function by name.

DO $$
DECLARE
  touch boolean := EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = 'public.journal_entries'::regclass
       AND tgname = 'update_journal_entries_updated_at'
       AND NOT tgisinternal
  );
BEGIN
  IF touch THEN
    EXECUTE 'ALTER TABLE public.journal_entries DISABLE TRIGGER update_journal_entries_updated_at';
  END IF;
  UPDATE public.journal_entries
     SET word_count = public.journal_word_count(content)
   WHERE word_count IS DISTINCT FROM public.journal_word_count(content);
  IF touch THEN
    EXECUTE 'ALTER TABLE public.journal_entries ENABLE TRIGGER update_journal_entries_updated_at';
  END IF;
END
$$;
