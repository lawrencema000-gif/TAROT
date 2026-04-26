-- ============================================================================
-- Blog cover image storage bucket — 2026-04-26
-- ============================================================================
-- Public-read bucket for AI-generated cover images attached to blog posts.
-- Writes are restricted to service-role (the daily-seo-blog-generator edge
-- function runs as service role and uploads here before inserting the
-- blog_posts row that references the URL).
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-covers',
  'blog-covers',
  true,
  5242880, -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public                  = EXCLUDED.public,
  file_size_limit         = EXCLUDED.file_size_limit,
  allowed_mime_types      = EXCLUDED.allowed_mime_types;

-- Public can read every object.
DROP POLICY IF EXISTS "blog-covers public read" ON storage.objects;
CREATE POLICY "blog-covers public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-covers');

-- No client write policy — only service-role uploads.

DO $$ BEGIN
  RAISE NOTICE 'blog-covers bucket created — public read, 5 MB limit, image/* mime types.';
END $$;
