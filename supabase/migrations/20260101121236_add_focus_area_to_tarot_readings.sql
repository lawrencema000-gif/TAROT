/*
  # Add focus_area to tarot_readings

  1. Changes
    - Add `focus_area` column to `tarot_readings` table to store the user's focus selection
    - Column is optional (nullable) since older readings won't have this

  2. Notes
    - This allows tracking what topic the user focused on during their reading
    - Values: Love, Career, Self, Money, Health, General
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tarot_readings' AND column_name = 'focus_area'
  ) THEN
    ALTER TABLE tarot_readings ADD COLUMN focus_area text;
  END IF;
END $$;