/*
  # Add Delete Policy for Backgrounds

  1. Changes
    - Add missing DELETE policy for backgrounds bucket
    - Users can delete their own background images
*/

-- Add delete policy for backgrounds (was missing from original migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own background'
  ) THEN
    CREATE POLICY "Users can delete their own background"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'backgrounds' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;
