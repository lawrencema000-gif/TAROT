/*
  # Enhance Journal Entries Table

  1. Changes to `journal_entries`
    - `title` (text, optional) - Entry title
    - `mood` (text) - Single emoji-based mood identifier
    - `tags` (text array) - Category tags like Love, Career, Anxiety
    - `linked_horoscope_id` (uuid) - Reference to horoscope_history
    - `is_locked` (boolean) - Premium feature for PIN-locked entries
    - `word_count` (integer) - Cached word count for analytics

  2. New Table: `journal_attachments`
    - Links journal entries to tarot readings and horoscopes
    - Enables "attach to entry" feature

  3. Security
    - RLS policies for the new attachments table
*/

-- Add new columns to journal_entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journal_entries' AND column_name = 'title'
  ) THEN
    ALTER TABLE journal_entries ADD COLUMN title text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journal_entries' AND column_name = 'mood'
  ) THEN
    ALTER TABLE journal_entries ADD COLUMN mood text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journal_entries' AND column_name = 'tags'
  ) THEN
    ALTER TABLE journal_entries ADD COLUMN tags text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journal_entries' AND column_name = 'linked_horoscope_id'
  ) THEN
    ALTER TABLE journal_entries ADD COLUMN linked_horoscope_id uuid REFERENCES horoscope_history(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journal_entries' AND column_name = 'is_locked'
  ) THEN
    ALTER TABLE journal_entries ADD COLUMN is_locked boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journal_entries' AND column_name = 'word_count'
  ) THEN
    ALTER TABLE journal_entries ADD COLUMN word_count integer DEFAULT 0;
  END IF;
END $$;

-- Create journal_attachments table for linking to readings/horoscopes
CREATE TABLE IF NOT EXISTS journal_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  attachment_type text NOT NULL CHECK (attachment_type IN ('tarot_reading', 'horoscope')),
  attachment_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE journal_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journal attachments"
  ON journal_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_attachments.journal_entry_id
      AND journal_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own journal attachments"
  ON journal_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_attachments.journal_entry_id
      AND journal_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own journal attachments"
  ON journal_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_attachments.journal_entry_id
      AND journal_entries.user_id = auth.uid()
    )
  );

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_journal_attachments_entry ON journal_attachments(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tags ON journal_entries USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_journal_entries_mood ON journal_entries(user_id, mood);

-- Create function to auto-calculate word count
CREATE OR REPLACE FUNCTION calculate_journal_word_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.word_count = array_length(regexp_split_to_array(trim(NEW.content), '\s+'), 1);
  IF NEW.word_count IS NULL THEN
    NEW.word_count = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for word count
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'calculate_journal_word_count_trigger') THEN
    CREATE TRIGGER calculate_journal_word_count_trigger
      BEFORE INSERT OR UPDATE ON journal_entries
      FOR EACH ROW
      EXECUTE FUNCTION calculate_journal_word_count();
  END IF;
END $$;
