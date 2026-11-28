-- ============================================================================
-- Replay-only (WP-F-04): the seo_blog_topics table, before its first fill
-- ============================================================================
-- 20260505121142_seo_blog_topics_replenish inserts into public.seo_blog_topics,
-- but the CREATE TABLE lives in 20260626000000_seo_blog_topics, whose stamp is
-- wrong: it was written and applied on 2026-04-26 (its own header says so), so
-- on production the table existed long before the replenish ran. A fresh
-- database replays in file order and stopped at the replenish.
--
-- This file repeats 20260626000000's DDL verbatim (table, indexes, RLS, policy,
-- grant; not its seed INSERT) so the table exists in time. 20260626000000 stays
-- as it is: on a fresh database its DDL is then a no-op and its seed still runs.
-- Production already has every object here: this file is recorded as applied
-- there with `migration repair`, never run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.seo_blog_topics (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category     text NOT NULL CHECK (category IN (
    'tarot-card',  'tarot-spread',  'zodiac',  'horoscope',
    'dream',       'mbti',          'human-design',
    'bazi',        'feng-shui',     'lunar',
    'numerology',  'general'
  )),
  topic        text NOT NULL,
  -- Hint passed to the LLM. Keeps style consistent and gives keyword
  -- guidance without prescribing every paragraph.
  brief        text NOT NULL,
  -- Primary keyword phrase the post should rank for. Used in title,
  -- meta description, and H1 (LLM gets this as a constraint).
  keyword      text NOT NULL,
  -- Long-tail variants — included as H2 sections in the article.
  related_keywords text[] DEFAULT '{}',
  -- Higher = picked sooner. Defaults to 100; bump for evergreen flagships.
  priority     integer NOT NULL DEFAULT 100,
  -- One row produces one post. After publish, used_at + post_id are filled.
  used_at      timestamptz,
  post_id      uuid REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seo_blog_topics_unused_idx
  ON public.seo_blog_topics (priority DESC, created_at)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS seo_blog_topics_category_idx
  ON public.seo_blog_topics (category);

-- RLS: read-only to admins; the edge function uses service role so it
-- bypasses RLS for inserts/updates.
ALTER TABLE public.seo_blog_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seo_blog_topics_admin_select ON public.seo_blog_topics;
CREATE POLICY seo_blog_topics_admin_select
  ON public.seo_blog_topics FOR SELECT
  USING (public.is_admin());

GRANT SELECT ON public.seo_blog_topics TO authenticated;
