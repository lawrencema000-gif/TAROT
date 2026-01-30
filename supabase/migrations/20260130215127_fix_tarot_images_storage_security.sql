/*
  # Fix Tarot Images Storage Security

  1. Changes
    - Creates an admin check function based on email
    - Removes overly permissive INSERT policy that allows any authenticated user to upload
    - Removes overly permissive UPDATE policy that allows any authenticated user to modify
    - Removes overly permissive DELETE policy
    - Adds admin-only policies for INSERT, UPDATE, and DELETE operations
    - Keeps public read access for viewing images
  
  2. Security
    - Only admin users (identified by email) can modify tarot images
    - All users can still view/read images publicly
    - Prevents unauthorized modification or deletion of production artwork
*/

-- Create a function to check if the current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  RETURN user_email = 'lawrence.ma000@gmail.com';
END;
$$;

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload tarot images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update any tarot image" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their uploaded images" ON storage.objects;

-- Create admin-only policies for tarot-images bucket
CREATE POLICY "Only admins can upload tarot images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'tarot-images' AND is_admin());

CREATE POLICY "Only admins can update tarot images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'tarot-images' AND is_admin())
  WITH CHECK (bucket_id = 'tarot-images' AND is_admin());

CREATE POLICY "Only admins can delete tarot images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'tarot-images' AND is_admin());
