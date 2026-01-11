/*
  # Temporary Public Upload Policy for Image Migration
  
  This is a temporary policy to allow uploading images during migration.
  It will be removed immediately after the migration is complete.
*/

CREATE POLICY "Temporary public upload for migration"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'tarot-images');