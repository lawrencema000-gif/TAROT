/*
  # Remove Temporary Migration Policies
  
  Removes the temporary public upload/update/delete policies that were added for image migration.
*/

DROP POLICY IF EXISTS "Temporary public upload for migration" ON storage.objects;
DROP POLICY IF EXISTS "Temporary public update for migration" ON storage.objects;
DROP POLICY IF EXISTS "Temporary public delete for migration" ON storage.objects;