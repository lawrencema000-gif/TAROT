-- ============================================================================
-- Community moderation pipeline
-- ============================================================================
-- Why: The community feed ships behind a flag but cannot be flipped on without
-- server-side moderation. Per INCREMENTAL-ROADMAP.md Sprint 9 "Don't launch
-- community without moderation" — this migration adds the three things that
-- need to be in place before the `community` flag goes to any real users:
--
--   1. moderation_status enum on posts and comments, so non-allowed items can
--      be filtered out of public feeds.
--   2. moderation_events audit table — every non-allow verdict from the
--      community-moderate edge function lands here. Used by the admin
--      dashboard for review, and by pg_cron for alert spikes.
--   3. crisis_flags table — separate, admin-restricted log of self-harm
--      ideation detections. High priority review queue; alert pipeline hook.
--
-- Additive-only. Safe to apply to live DB — default moderation_status is
-- 'allowed' so existing posts continue to display.
-- ============================================================================

-- ─── 1. moderation_status column on posts + comments ────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_status') THEN
    CREATE TYPE public.moderation_status AS ENUM (
      'allowed',    -- default, visible to everyone
      'flagged',    -- soft-flagged, visible to author + admins only
      'blocked',    -- hard-blocked, visible to no one (should never land here, but safety net)
      'pending'     -- moderation in progress (optimistic insert path — not currently used)
    );
  END IF;
END$$;

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS moderation_status public.moderation_status NOT NULL DEFAULT 'allowed',
  ADD COLUMN IF NOT EXISTS moderation_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS crisis_flagged boolean NOT NULL DEFAULT false;

ALTER TABLE public.community_comments
  ADD COLUMN IF NOT EXISTS moderation_status public.moderation_status NOT NULL DEFAULT 'allowed',
  ADD COLUMN IF NOT EXISTS moderation_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS crisis_flagged boolean NOT NULL DEFAULT false;

-- Update the existing public feed index so flagged + blocked posts don't
-- appear in feeds. The old index already filters on is_hidden; we layer
-- moderation_status on top without dropping it.
CREATE INDEX IF NOT EXISTS community_posts_topic_visible_idx
  ON public.community_posts (topic, created_at DESC)
  WHERE is_hidden = false AND moderation_status = 'allowed';

CREATE INDEX IF NOT EXISTS community_comments_post_visible_idx
  ON public.community_comments (post_id, created_at)
  WHERE is_hidden = false AND moderation_status = 'allowed';

-- ─── 2. moderation_events — full audit trail ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.moderation_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  surface         text NOT NULL CHECK (surface IN ('post', 'comment', 'whispering-well')),
  content_hash    text NOT NULL,  -- SHA-256 of content for dedup without storing PII
  verdict         text NOT NULL CHECK (verdict IN ('allow', 'review', 'block')),
  categories      text[] NOT NULL DEFAULT '{}',
  crisis_flagged  boolean NOT NULL DEFAULT false,
  reviewed        boolean NOT NULL DEFAULT false,
  reviewed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_events_created_idx
  ON public.moderation_events (created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_events_unreviewed_idx
  ON public.moderation_events (created_at DESC) WHERE reviewed = false;
CREATE INDEX IF NOT EXISTS moderation_events_crisis_idx
  ON public.moderation_events (created_at DESC) WHERE crisis_flagged = true;

ALTER TABLE public.moderation_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write moderation events. Service role always works
-- via its bypass. Regular users should never see these.
DROP POLICY IF EXISTS "moderation_events admin read" ON public.moderation_events;
CREATE POLICY "moderation_events admin read"
  ON public.moderation_events FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "moderation_events admin update" ON public.moderation_events;
CREATE POLICY "moderation_events admin update"
  ON public.moderation_events FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- ─── 3. crisis_flags — high-priority review queue ──────────────────────────

CREATE TABLE IF NOT EXISTS public.crisis_flags (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  surface          text NOT NULL CHECK (surface IN ('post', 'comment', 'whispering-well')),
  content_excerpt  text NOT NULL CHECK (char_length(content_excerpt) <= 500),
  acknowledged     boolean NOT NULL DEFAULT false,
  acknowledged_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at  timestamptz,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crisis_flags_pending_idx
  ON public.crisis_flags (created_at DESC) WHERE acknowledged = false;

ALTER TABLE public.crisis_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crisis_flags admin read" ON public.crisis_flags;
CREATE POLICY "crisis_flags admin read"
  ON public.crisis_flags FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "crisis_flags admin update" ON public.crisis_flags;
CREATE POLICY "crisis_flags admin update"
  ON public.crisis_flags FOR UPDATE
  TO authenticated
  USING (public.is_admin());
