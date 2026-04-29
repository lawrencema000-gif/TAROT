-- ─────────────────────────────────────────────────────────────────────
-- Pre-signup newsletter / email-course captures — 2026-04-29
--
-- For lead-magnet flows where we want an email BEFORE the user creates
-- a full account. The 3-part free email course on the landing page
-- writes here. Daily-seo-blog-style cron will eventually email the
-- course to recent subscribers (and future broadcasts).
--
-- Distinct from profiles.subscribed_to_newsletter (which is for users
-- with full accounts). Once a captured email signs up, the row stays —
-- analytics still useful for "ad → email → account" funnel tracking.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS newsletter_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  source text NOT NULL DEFAULT 'landing_page',     -- 'landing_page' | 'tarot_card_page' | 'blog_post' etc.
  course_lead_magnet text,                          -- e.g. "tarot-keywords-3-part" — which course they signed up for
  utm_source text,
  utm_medium text,
  utm_campaign text,
  emails_sent integer NOT NULL DEFAULT 0,           -- how many course emails delivered
  unsubscribed_at timestamptz,                      -- null = still subscribed
  converted_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,  -- when they later sign up, link
  created_at timestamptz NOT NULL DEFAULT now(),
  last_emailed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_newsletter_signups_email ON newsletter_signups (email);
CREATE INDEX IF NOT EXISTS idx_newsletter_signups_unsubscribed ON newsletter_signups (unsubscribed_at) WHERE unsubscribed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_newsletter_signups_source ON newsletter_signups (source, created_at DESC);

ALTER TABLE newsletter_signups ENABLE ROW LEVEL SECURITY;

-- Anonymous users can INSERT (lead-magnet capture). They cannot SELECT
-- (privacy) and cannot UPDATE (only the cron / admin can mutate).
CREATE POLICY "Anon insert newsletter signup"
  ON newsletter_signups FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins can read for analytics
CREATE POLICY "Admins read newsletter signups"
  ON newsletter_signups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
