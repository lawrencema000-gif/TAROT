/*
  # Add Personality Quiz Fields to Profiles

  This migration adds new columns to the profiles table to store results
  from the enhanced personality quiz system.

  1. New Columns in `profiles`
    - `enneagram_type` (integer) - Primary Enneagram type (1-9)
    - `enneagram_wing` (integer) - Enneagram wing number
    - `attachment_style` (text) - Attachment style result
    - `big_five_scores` (jsonb) - Big Five OCEAN scores

  2. Changes
    - Adds nullable columns for optional quiz results
    - No data loss - all columns are optional

  3. Notes
    - Users can complete quizzes in any order
    - Results are stored when users choose to save to profile
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'enneagram_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN enneagram_type integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'enneagram_wing'
  ) THEN
    ALTER TABLE profiles ADD COLUMN enneagram_wing integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'attachment_style'
  ) THEN
    ALTER TABLE profiles ADD COLUMN attachment_style text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'big_five_scores'
  ) THEN
    ALTER TABLE profiles ADD COLUMN big_five_scores jsonb;
  END IF;
END $$;

ALTER TABLE quiz_definitions DROP CONSTRAINT IF EXISTS valid_quiz_type;

ALTER TABLE quiz_definitions 
ADD CONSTRAINT valid_quiz_type 
CHECK (type IN ('mbti', 'love_language', 'big_five', 'enneagram', 'attachment', 'communication', 'values', 'mood_check'));
