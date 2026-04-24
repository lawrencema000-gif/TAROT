-- Community Feed + Anonymous Whispering Well
--
-- Schema for a simple post/comment/reaction community with:
--   - Topic channels (tarot / astrology / moon / love / shadow / career / general)
--   - Anonymous variant ("Whispering Well") via `is_anonymous` column
--   - Reactions (emoji-style)
--   - Comments with thread replies (one level deep for V1)
--   - Block + mute relationships
--   - Report flow for moderation
--
-- All tables are RLS-protected. Posts are public-read by default; users
-- only write their own. Reports write to a queue admins review.
--
-- Additive-only migration — safe to apply to live DB. Tables exist
-- empty until the `community` and `whispering-well` feature flags flip.

-- ------------------------------------------------------------------
-- 1. Posts
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic           TEXT NOT NULL CHECK (topic IN (
    'general', 'tarot', 'astrology', 'moon',
    'love', 'shadow', 'career', 'wellness', 'whispering-well'
  )),
  content         TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  is_anonymous    BOOLEAN NOT NULL DEFAULT false,
  reaction_count  INTEGER NOT NULL DEFAULT 0,
  comment_count   INTEGER NOT NULL DEFAULT 0,
  reported_count  INTEGER NOT NULL DEFAULT 0,
  is_hidden       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS community_posts_topic_created_idx
  ON public.community_posts (topic, created_at DESC)
  WHERE is_hidden = false;

CREATE INDEX IF NOT EXISTS community_posts_user_created_idx
  ON public.community_posts (user_id, created_at DESC);

-- ------------------------------------------------------------------
-- 2. Comments
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
  content         TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  is_anonymous    BOOLEAN NOT NULL DEFAULT false,
  is_hidden       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS community_comments_post_idx
  ON public.community_comments (post_id, created_at)
  WHERE is_hidden = false;

-- ------------------------------------------------------------------
-- 3. Reactions (one reaction per user per post)
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_reactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction        TEXT NOT NULL CHECK (reaction IN ('heart', 'sparkle', 'moon', 'eye', 'flame')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS community_reactions_post_idx
  ON public.community_reactions (post_id);

-- ------------------------------------------------------------------
-- 4. Reports (moderation queue)
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id         UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id      UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
  reason          TEXT NOT NULL CHECK (reason IN (
    'spam', 'harassment', 'self-harm', 'explicit', 'misinformation', 'other'
  )),
  details         TEXT CHECK (char_length(details) <= 500),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (post_id IS NOT NULL OR comment_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS community_reports_status_idx
  ON public.community_reports (status, created_at DESC);

-- ------------------------------------------------------------------
-- 5. Blocks (user-to-user filter)
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS community_blocks_blocker_idx
  ON public.community_blocks (blocker_id);

-- ------------------------------------------------------------------
-- 6. Triggers — keep counters fresh, touch updated_at
-- ------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.community_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_posts_touch_updated_at ON public.community_posts;
CREATE TRIGGER community_posts_touch_updated_at
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.community_touch_updated_at();

-- Reaction-count maintenance
CREATE OR REPLACE FUNCTION public.community_update_reaction_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET reaction_count = reaction_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET reaction_count = GREATEST(0, reaction_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS community_reactions_count_trigger ON public.community_reactions;
CREATE TRIGGER community_reactions_count_trigger
  AFTER INSERT OR DELETE ON public.community_reactions
  FOR EACH ROW EXECUTE FUNCTION public.community_update_reaction_count();

-- Comment-count maintenance
CREATE OR REPLACE FUNCTION public.community_update_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS community_comments_count_trigger ON public.community_comments;
CREATE TRIGGER community_comments_count_trigger
  AFTER INSERT OR DELETE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.community_update_comment_count();

-- Report-count maintenance (auto-hide at 5+ reports)
CREATE OR REPLACE FUNCTION public.community_update_report_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    UPDATE public.community_posts
    SET reported_count = reported_count + 1,
        is_hidden = CASE WHEN reported_count + 1 >= 5 THEN true ELSE is_hidden END
    WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_reports_count_trigger ON public.community_reports;
CREATE TRIGGER community_reports_count_trigger
  AFTER INSERT ON public.community_reports
  FOR EACH ROW EXECUTE FUNCTION public.community_update_report_count();

-- ------------------------------------------------------------------
-- 7. RLS policies
-- ------------------------------------------------------------------

ALTER TABLE public.community_posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_blocks    ENABLE ROW LEVEL SECURITY;

-- Posts: public read (non-hidden), authenticated write own
DROP POLICY IF EXISTS community_posts_select_visible ON public.community_posts;
CREATE POLICY community_posts_select_visible
  ON public.community_posts FOR SELECT
  USING (is_hidden = false);

DROP POLICY IF EXISTS community_posts_insert_own ON public.community_posts;
CREATE POLICY community_posts_insert_own
  ON public.community_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS community_posts_update_own ON public.community_posts;
CREATE POLICY community_posts_update_own
  ON public.community_posts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS community_posts_delete_own ON public.community_posts;
CREATE POLICY community_posts_delete_own
  ON public.community_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Comments: public read, auth write own, delete own
DROP POLICY IF EXISTS community_comments_select_visible ON public.community_comments;
CREATE POLICY community_comments_select_visible
  ON public.community_comments FOR SELECT
  USING (is_hidden = false);

DROP POLICY IF EXISTS community_comments_insert_own ON public.community_comments;
CREATE POLICY community_comments_insert_own
  ON public.community_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS community_comments_delete_own ON public.community_comments;
CREATE POLICY community_comments_delete_own
  ON public.community_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Reactions: public read, auth insert/delete own
DROP POLICY IF EXISTS community_reactions_select_all ON public.community_reactions;
CREATE POLICY community_reactions_select_all
  ON public.community_reactions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS community_reactions_insert_own ON public.community_reactions;
CREATE POLICY community_reactions_insert_own
  ON public.community_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS community_reactions_delete_own ON public.community_reactions;
CREATE POLICY community_reactions_delete_own
  ON public.community_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Reports: auth users can create, only the reporter can read their own
DROP POLICY IF EXISTS community_reports_select_own ON public.community_reports;
CREATE POLICY community_reports_select_own
  ON public.community_reports FOR SELECT
  USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS community_reports_insert_own ON public.community_reports;
CREATE POLICY community_reports_insert_own
  ON public.community_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Blocks: auth users can manage their own blocks
DROP POLICY IF EXISTS community_blocks_select_own ON public.community_blocks;
CREATE POLICY community_blocks_select_own
  ON public.community_blocks FOR SELECT
  USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS community_blocks_insert_own ON public.community_blocks;
CREATE POLICY community_blocks_insert_own
  ON public.community_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS community_blocks_delete_own ON public.community_blocks;
CREATE POLICY community_blocks_delete_own
  ON public.community_blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- ------------------------------------------------------------------
-- 8. Grants
-- ------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts     TO authenticated;
GRANT SELECT, INSERT, DELETE         ON public.community_comments  TO authenticated;
GRANT SELECT, INSERT, DELETE         ON public.community_reactions TO authenticated;
GRANT SELECT, INSERT                 ON public.community_reports   TO authenticated;
GRANT SELECT, INSERT, DELETE         ON public.community_blocks    TO authenticated;

-- Anon users get public read (non-hidden only via RLS)
GRANT SELECT ON public.community_posts     TO anon;
GRANT SELECT ON public.community_comments  TO anon;
GRANT SELECT ON public.community_reactions TO anon;
