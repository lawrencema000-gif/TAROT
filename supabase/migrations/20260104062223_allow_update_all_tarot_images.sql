/*
  # Allow Authenticated Users to Update Any Tarot Image

  1. Changes
    - Add policy to allow authenticated users to update any file in tarot-images bucket
    - This allows fixing images that were uploaded by system/migrations
  
  2. Security
    - Only authenticated users can update
    - Restricted to tarot-images bucket only
*/

-- Drop the restrictive update policy
DROP POLICY IF EXISTS "Users can update their uploaded images" ON storage.objects;

-- Add a more permissive policy for authenticated users to update any tarot image
CREATE POLICY "Authenticated users can update any tarot image"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'tarot-images')
  WITH CHECK (bucket_id = 'tarot-images');