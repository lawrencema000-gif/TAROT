/*
  # Add Card Back Cover Storage

  1. Storage
    - Create `card-backs` storage bucket for card back cover images
    - Set up public access policies for reading
    - Set up authenticated user policies for uploading
  
  2. Profile Enhancement
    - Add `card_back_url` column to profiles table
    - Users can customize their card back cover
  
  3. Security
    - Public read access (anyone can view card backs)
    - Authenticated users can upload their own card back
    - Users can update/delete their own card back
*/

-- Create storage bucket for card backs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'card-backs',
  'card-backs',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to card backs
CREATE POLICY "Public read access to card backs"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'card-backs');

-- Allow authenticated users to upload card backs
CREATE POLICY "Authenticated users can upload card backs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'card-backs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to update their own card backs
CREATE POLICY "Users can update own card backs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'card-backs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own card backs
CREATE POLICY "Users can delete own card backs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'card-backs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add card_back_url to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'card_back_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN card_back_url text;
  END IF;
END $$;
