-- Add archived column to blog_posts for hiding old posts from listing
-- while keeping them accessible via direct URL (preserves SEO)
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Update the published index to also filter by archived
DROP INDEX IF EXISTS idx_blog_posts_published;
CREATE INDEX idx_blog_posts_published ON blog_posts (published, archived, published_at DESC);
