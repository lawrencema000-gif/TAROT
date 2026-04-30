-- ─────────────────────────────────────────────────────────────────────
-- Bazi AI readings cache — 2026-04-30
--
-- Stores the AI-generated narrative interpretation of a user's Bazi
-- chart. The chart itself never changes (it's birth-date-based) but
-- the annual-luck section depends on the calendar year, so we key
-- by (user_id, reading_year) and refresh once per year.
--
-- Premium-only feature. Generation is expensive (~$0.002 per reading
-- via Gemini 2.5 Flash, ~3000 tokens output). Cache lets us hit
-- Gemini at most once per user per year.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bazi_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  birth_date date NOT NULL,
  birth_time time,
  gender text CHECK (gender IN ('male', 'female')),
  reading_year integer NOT NULL,
  -- Structured AI output: { core_summary, personality, elements, career,
  -- wealth, relationships, family, hidden_stems, branch_relations, health,
  -- luck_pillar_reading, annual_reading, strategy, closing_summary }
  reading jsonb NOT NULL,
  -- Echo of the structured input so we can detect "user changed gender
  -- after first reading was cached" and re-generate accordingly
  input_signature text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reading_year)
);

CREATE INDEX IF NOT EXISTS idx_bazi_readings_user ON bazi_readings (user_id, reading_year DESC);

ALTER TABLE bazi_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own bazi readings"
  ON bazi_readings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Inserts only via service role (edge function). No direct client writes.
