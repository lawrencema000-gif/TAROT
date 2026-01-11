/*
  # Remove temporary policies

  1. Changes
    - Remove temporary public upload policy from storage
    - Remove temporary public insert policy from tarot_cards

  2. Security
    - Restores secure RLS policies
    - Only authenticated users can upload and insert
*/

DROP POLICY IF EXISTS "Temp public upload for setup" ON storage.objects;
DROP POLICY IF EXISTS "Temp public insert for setup" ON tarot_cards;