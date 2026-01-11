/*
  # Create Tarot Cards Table

  1. New Tables
    - `tarot_cards`
      - `id` (integer, primary key) - Card ID (0-77)
      - `name` (text) - Card name
      - `arcana` (text) - Major or Minor arcana
      - `keywords` (text array) - Key concepts
      - `meaning_upright` (text) - Upright meaning
      - `meaning_reversed` (text) - Reversed meaning
      - `description` (text) - Visual description
      - `love_meaning` (text) - Love interpretation
      - `career_meaning` (text) - Career interpretation
      - `reflection_prompt` (text) - Self-reflection question
      - `image_url` (text) - Supabase Storage URL
      - `suit` (text, nullable) - For minor arcana only
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `tarot_cards` table
    - Add policy for public read access (cards are public reference data)
    - Add policy for authenticated admin users to manage cards

  3. Indexes
    - Index on arcana for filtering
    - Index on name for searching
*/

CREATE TABLE IF NOT EXISTS tarot_cards (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  arcana TEXT NOT NULL CHECK (arcana IN ('major', 'minor')),
  keywords TEXT[] NOT NULL DEFAULT '{}',
  meaning_upright TEXT NOT NULL DEFAULT '',
  meaning_reversed TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  love_meaning TEXT NOT NULL DEFAULT '',
  career_meaning TEXT NOT NULL DEFAULT '',
  reflection_prompt TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  suit TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tarot_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for tarot cards"
  ON tarot_cards
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert tarot cards"
  ON tarot_cards
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tarot cards"
  ON tarot_cards
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_tarot_cards_arcana ON tarot_cards(arcana);
CREATE INDEX IF NOT EXISTS idx_tarot_cards_name ON tarot_cards(name);
CREATE INDEX IF NOT EXISTS idx_tarot_cards_suit ON tarot_cards(suit) WHERE suit IS NOT NULL;