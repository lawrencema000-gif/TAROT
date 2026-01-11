/*
  # Temporary upload policy for Temperance card

  1. Changes
    - Add temporary public INSERT policy for tarot-images bucket
    - Allows uploading Temperance card image
    - Will be removed after upload completes

  2. Security
    - This is a temporary policy for administrative upload
    - Should be removed immediately after use
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Temp public upload for setup'
  ) THEN
    CREATE POLICY "Temp public upload for setup"
      ON storage.objects FOR INSERT
      TO public
      WITH CHECK (bucket_id = 'tarot-images');
  END IF;
END $$;