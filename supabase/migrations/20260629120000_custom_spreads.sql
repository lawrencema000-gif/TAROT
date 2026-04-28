-- ─────────────────────────────────────────────────────────────────────
-- User-defined custom tarot spreads — 2026-04-29
--
-- Lets users design their own spreads beyond the built-in library.
-- Each spread has a name, description, and an ordered array of
-- positions stored as JSONB.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS custom_spreads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 500),
  positions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- ensure positions is a non-empty array of {name, meaning}
  CONSTRAINT positions_nonempty CHECK (jsonb_array_length(positions) BETWEEN 1 AND 13)
);
CREATE INDEX IF NOT EXISTS idx_custom_spreads_user ON custom_spreads (user_id, created_at DESC);

ALTER TABLE custom_spreads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own custom spreads"
  ON custom_spreads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own custom spreads"
  ON custom_spreads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own custom spreads"
  ON custom_spreads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own custom spreads"
  ON custom_spreads FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-bump updated_at on every UPDATE.
CREATE OR REPLACE FUNCTION custom_spreads_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_custom_spreads_updated_at ON custom_spreads;
CREATE TRIGGER trg_custom_spreads_updated_at
  BEFORE UPDATE ON custom_spreads
  FOR EACH ROW EXECUTE FUNCTION custom_spreads_set_updated_at();
