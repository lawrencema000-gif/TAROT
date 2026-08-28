-- Close the same gap in the database that the client filter had.
--
-- The original trigger matched a run of 8+ CHARACTERS: \+?\d[\d\s().-]{6,}\d.
-- That let a bare seven-digit number straight through — and seven digits is an
-- ordinary local phone number, not an edge case. A test on the client caught it
-- there; the database had the identical bug, and the database is the layer that
-- has to hold when the UI is bypassed.
--
-- Now it counts DIGITS rather than characters: strip the separators people
-- actually type inside a number, then look for seven consecutive digits. So
-- "555-019-2837", "555 019 2837", "(555) 0192837" and "5550192837" are all the
-- same thing to it.
--
-- Deliberately eager. A false positive costs someone a rephrase; a false
-- negative publishes a phone number, beside a stated need, to every user of the
-- app, permanently, and search engines index it.

CREATE OR REPLACE FUNCTION public.wish_reject_contact_details()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.text ~ '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}' THEN
    RAISE EXCEPTION 'A wish cannot contain an email address. Turn on "open to help" instead and people can reach you privately.'
      USING ERRCODE = '22023';
  END IF;

  IF regexp_replace(NEW.text, '[[:space:]().+,-]', '', 'g') ~ '[0-9]{7}' THEN
    RAISE EXCEPTION 'A wish cannot contain a phone number. Turn on "open to help" instead and people can reach you privately.'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;
