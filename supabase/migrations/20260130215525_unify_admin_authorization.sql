/*
  # Unify Admin Authorization

  ## Summary
  This migration ensures all admin authorization checks use a single source of truth:
  the `is_admin()` function which checks for `lawrence.ma000@gmail.com`.

  ## Changes
  
  1. Update `is_admin()` function to be STABLE for better performance
  2. Fix app_settings policies to use `is_admin()` instead of old email list
  3. Fix custom-icons storage policies to use `is_admin()` instead of old email list
  4. Ensure all admin checks are consistent across the database

  ## Security
  - Single source of truth for admin authorization
  - No more inconsistent email checks
  - Admin email: lawrence.ma000@gmail.com
*/

-- Update is_admin function to be STABLE for performance
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
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

-- Fix app_settings policy to use is_admin()
DROP POLICY IF EXISTS "Admins can manage app settings" ON app_settings;

CREATE POLICY "Admins can read app settings"
  ON app_settings
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert app settings"
  ON app_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update app settings"
  ON app_settings
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete app settings"
  ON app_settings
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Fix custom-icons storage policies to use is_admin()
DROP POLICY IF EXISTS "Admins can upload custom icons" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete custom icons" ON storage.objects;

CREATE POLICY "Admins can upload custom icons"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'custom-icons' AND is_admin());

CREATE POLICY "Admins can update custom icons"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'custom-icons' AND is_admin())
  WITH CHECK (bucket_id = 'custom-icons' AND is_admin());

CREATE POLICY "Admins can delete custom icons"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'custom-icons' AND is_admin());
