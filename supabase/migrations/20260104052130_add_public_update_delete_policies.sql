/*
  # Add Temporary Public Update and Delete Policies
  
  Temporary policies to allow updating and deleting images during migration.
*/

CREATE POLICY "Temporary public update for migration"
  ON storage.objects
  FOR UPDATE
  TO public
  USING (bucket_id = 'tarot-images')
  WITH CHECK (bucket_id = 'tarot-images');

CREATE POLICY "Temporary public delete for migration"
  ON storage.objects
  FOR DELETE
  TO public
  USING (bucket_id = 'tarot-images');