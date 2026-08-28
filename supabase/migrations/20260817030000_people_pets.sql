-- Pets as People.
--
-- A pet has a birth (or adoption) date and a temperament, and owners read
-- charts for them the same way they do for a partner — so the natural home is
-- the existing people table rather than a parallel one. Two changes:
--
--   * 'pet' joins the relationship CHECK. The constraint has to be dropped and
--     re-added; Postgres has no ALTER ... ADD VALUE for a CHECK.
--   * a nullable `species` column, because the reading genuinely differs: an
--     Aries cat and an Aries dog are not the same animal, and the content layer
--     keys off it. NULL is fine and reads as an unspecified companion.
--
-- Everything else already works for pets unchanged: birth_time stays nullable
-- (most adopted animals have no known hour), and the birth_utc trigger falls
-- back to noon exactly as it does for a person with no recorded time.

ALTER TABLE public.people DROP CONSTRAINT IF EXISTS people_relationship_check;
ALTER TABLE public.people
  ADD CONSTRAINT people_relationship_check
  CHECK (relationship IN ('self','partner','family','friend','other','pet'));

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS species text
  CHECK (species IS NULL OR species IN
    ('dog','cat','bird','rabbit','horse','reptile','fish','smallPet','other'));

COMMENT ON COLUMN public.people.species IS
  'Set only when relationship = ''pet''. NULL reads as an unspecified companion.';
