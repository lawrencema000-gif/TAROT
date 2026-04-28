-- ─────────────────────────────────────────────────────────────────────
-- Daily SEO / GEO / Backlinks snapshot tables — 2026-04-29
--
-- Three append-only ledger tables that the daily-seo-snapshot,
-- daily-geo-mentions, and daily-backlinks-snapshot edge functions
-- write to once per day. Each row is a snapshot for a given day.
--
-- Read pattern: dashboards + email digests query the latest row(s);
-- nothing is mutated after insert. RLS locks reads to admin role only
-- since these contain sensitive ranking + competitor data.
-- ─────────────────────────────────────────────────────────────────────

-- 1. SEO daily snapshot (Google Search Console API)
CREATE TABLE IF NOT EXISTS seo_daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL UNIQUE,
  total_clicks integer NOT NULL DEFAULT 0,
  total_impressions integer NOT NULL DEFAULT 0,
  avg_ctr numeric(6,4) NOT NULL DEFAULT 0,           -- 0.0234 = 2.34%
  avg_position numeric(6,2) NOT NULL DEFAULT 0,
  top_queries jsonb NOT NULL DEFAULT '[]',           -- [{q, clicks, impr, ctr, pos}]
  top_pages jsonb NOT NULL DEFAULT '[]',             -- [{url, clicks, impr, ctr, pos}]
  raw_response jsonb,                                -- full GSC response for debug
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seo_daily_snapshot_date ON seo_daily_snapshots (snapshot_date DESC);

ALTER TABLE seo_daily_snapshots ENABLE ROW LEVEL SECURITY;

-- Admin-only read: rely on profiles.is_admin or service_role
CREATE POLICY "Admins read seo snapshots"
  ON seo_daily_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Inserts are service-role only (edge function uses service-role client)

-- 2. GEO mentions snapshot (queries against AI engines)
CREATE TABLE IF NOT EXISTS geo_daily_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
  engine text NOT NULL,                              -- 'gemini' | 'perplexity' | 'openai'
  query text NOT NULL,                               -- e.g. 'best tarot app'
  mentioned boolean NOT NULL DEFAULT false,          -- did response include 'Arcana' or 'tarotlife'?
  position integer,                                  -- nth result if listed
  cited_url text,                                    -- if engine cited a URL
  response_excerpt text,                             -- 500-char excerpt of the response
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (snapshot_date, engine, query)
);
CREATE INDEX IF NOT EXISTS idx_geo_daily_mentions_date_engine ON geo_daily_mentions (snapshot_date DESC, engine);
CREATE INDEX IF NOT EXISTS idx_geo_daily_mentions_query ON geo_daily_mentions (query);

ALTER TABLE geo_daily_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read geo mentions"
  ON geo_daily_mentions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 3. Backlinks snapshot (Bing Webmaster Tools API)
CREATE TABLE IF NOT EXISTS backlinks_daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL UNIQUE,
  total_backlinks integer NOT NULL DEFAULT 0,
  referring_domains integer NOT NULL DEFAULT 0,
  new_domains_today jsonb NOT NULL DEFAULT '[]',     -- domains that appeared since yesterday
  lost_domains_today jsonb NOT NULL DEFAULT '[]',    -- domains that disappeared since yesterday
  top_referring_domains jsonb NOT NULL DEFAULT '[]', -- [{domain, links, anchor_diversity}]
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_backlinks_daily_date ON backlinks_daily_snapshots (snapshot_date DESC);

ALTER TABLE backlinks_daily_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read backlink snapshots"
  ON backlinks_daily_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
