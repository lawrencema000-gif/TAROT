/*
  # Temporary insert policy for Temperance card

  1. Changes
    - Add temporary public INSERT policy for tarot_cards table
    - Allows inserting Temperance card data
    - Will be removed after insert completes

  2. Security
    - This is a temporary policy for administrative setup
    - Should be removed immediately after use
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'tarot_cards' 
    AND policyname = 'Temp public insert for setup'
  ) THEN
    CREATE POLICY "Temp public insert for setup"
      ON tarot_cards FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END $$;