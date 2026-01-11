/*
  # Create Storage Bucket for Tarot Card Images

  1. New Storage Bucket
    - `tarot-images` - Public bucket for storing tarot card artwork
  
  2. Security
    - Enable public access for reading images
    - Restrict uploads to authenticated users only
    - Allow users to upload images to the bucket
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tarot-images',
  'tarot-images',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for tarot images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'tarot-images');

CREATE POLICY "Authenticated users can upload tarot images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'tarot-images');

CREATE POLICY "Users can update their uploaded images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'tarot-images' AND auth.uid() = owner)
  WITH CHECK (bucket_id = 'tarot-images' AND auth.uid() = owner);

CREATE POLICY "Users can delete their uploaded images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'tarot-images' AND auth.uid() = owner);