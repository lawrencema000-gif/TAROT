/*
  # Add Background Image Support

  1. Changes
    - Add `background_url` column to profiles table
    - Create `backgrounds` storage bucket for user background images
    - Add RLS policies for background image storage

  2. Storage
    - Users can upload their own background images
    - Each user has their own folder in the backgrounds bucket
    - Images are publicly accessible once uploaded
*/

-- Add background_url column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'background_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN background_url text;
  END IF;
END $$;

-- Create storage bucket for backgrounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('backgrounds', 'backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for backgrounds bucket
CREATE POLICY "Users can upload their own background"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'backgrounds' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own background"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'backgrounds' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'backgrounds' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Anyone can view backgrounds"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'backgrounds');