/*
  # Add birth coordinates to profiles

  1. Modified Tables
    - `profiles`
      - `birth_lat` (double precision, nullable) - latitude of birth location
      - `birth_lon` (double precision, nullable) - longitude of birth location

  2. Purpose
    - Store geocoded birth coordinates so horoscope features can use
      profile data directly without re-asking users for their birth info
    - Eliminates duplicate data collection between onboarding and horoscope setup
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'birth_lat'
  ) THEN
    ALTER TABLE profiles ADD COLUMN birth_lat double precision;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'birth_lon'
  ) THEN
    ALTER TABLE profiles ADD COLUMN birth_lon double precision;
  END IF;
END $$;
