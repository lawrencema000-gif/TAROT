-- Allow admin users (verified via check_is_admin RPC) to manage blog posts
-- This covers SELECT (all posts, not just published), UPDATE, DELETE, INSERT

-- Admin can read ALL posts (including unpublished/archived)
CREATE POLICY blog_posts_admin_read ON blog_posts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Admin can update posts (archive, unpublish, etc.)
CREATE POLICY blog_posts_admin_update ON blog_posts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Admin can delete posts
CREATE POLICY blog_posts_admin_delete ON blog_posts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Admin can insert posts
CREATE POLICY blog_posts_admin_insert ON blog_posts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
