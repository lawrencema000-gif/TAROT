/*
  # Add Birth Date Validation Constraints

  1. Changes
    - Fix existing invalid birth dates in the database
    - Add CHECK constraint to profiles table to ensure birth_date is within valid range
    - Ensures birth date is not in the future
    - Ensures birth date is not more than 120 years in the past
    - Prevents invalid dates from being stored even if frontend validation is bypassed

  2. Security
    - Protects data integrity at the database level
    - Prevents unrealistic birth dates like year 4534 or 543534
*/

-- First, fix any existing invalid birth dates by setting them to NULL
UPDATE profiles
SET birth_date = NULL
WHERE 
  birth_date > CURRENT_DATE 
  OR birth_date < (CURRENT_DATE - INTERVAL '120 years')
  OR EXTRACT(YEAR FROM birth_date) > 2100
  OR EXTRACT(YEAR FROM birth_date) < 1900;

-- Add constraint to ensure birth_date is within a realistic range
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_birth_date_valid_range'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_birth_date_valid_range
    CHECK (
      birth_date IS NULL OR (
        birth_date <= CURRENT_DATE
        AND birth_date >= (CURRENT_DATE - INTERVAL '120 years')
        AND EXTRACT(YEAR FROM birth_date) >= 1900
        AND EXTRACT(YEAR FROM birth_date) <= 2100
      )
    );
  END IF;
END $$;

-- Add constraint to ensure minimum age of 13 years
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_minimum_age'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_minimum_age
    CHECK (
      birth_date IS NULL OR (
        birth_date <= (CURRENT_DATE - INTERVAL '13 years')
      )
    );
  END IF;
END $$;