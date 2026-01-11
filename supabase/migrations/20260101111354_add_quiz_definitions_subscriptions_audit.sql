/*
  # Add Quiz Definitions, Subscriptions, and Audit Events

  This migration adds the remaining tables to complete the data model for the
  self-discovery app, including quiz templates, billing/subscription tracking,
  and event auditing for analytics.

  1. New Tables

    - `quiz_definitions`
      - `id` (uuid, primary key) - Unique identifier for the quiz
      - `type` (text) - Quiz category: 'mbti', 'love_language', 'big_five', 'enneagram', 'attachment'
      - `version` (integer) - Version number for quiz updates
      - `title` (text) - Display title of the quiz
      - `description` (text) - Brief description of what the quiz measures
      - `questions` (jsonb) - Array of question objects with text, options, and scoring
      - `result_mappings` (jsonb) - Maps scores to result labels and descriptions
      - `is_premium` (boolean) - Whether this quiz requires premium access
      - `is_active` (boolean) - Whether this quiz is currently available
      - `created_at` (timestamptz) - When the quiz was created
      - `updated_at` (timestamptz) - When the quiz was last modified

    - `subscriptions`
      - `id` (uuid, primary key) - Unique subscription record ID
      - `user_id` (uuid, references profiles) - The user who owns this subscription
      - `provider` (text) - Payment provider: 'samsung', 'google', 'stripe', 'web'
      - `product_id` (text) - The product/plan identifier from the store
      - `status` (text) - Current status: 'active', 'cancelled', 'expired', 'pending', 'trial'
      - `period` (text) - Billing period: 'weekly', 'monthly', 'yearly', 'lifetime'
      - `started_at` (timestamptz) - When the subscription started
      - `expires_at` (timestamptz) - When the subscription expires
      - `cancelled_at` (timestamptz) - When the user cancelled (if applicable)
      - `transaction_id` (text) - Store transaction/purchase ID
      - `receipt_data` (text) - Encrypted receipt for verification
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

    - `audit_events`
      - `id` (uuid, primary key) - Unique event ID
      - `user_id` (uuid, references profiles, nullable) - User who triggered the event
      - `event_name` (text) - Event identifier like 'quiz_completed', 'reading_saved'
      - `payload` (jsonb) - Additional event data and context
      - `session_id` (text) - Client session identifier for grouping
      - `device_info` (jsonb) - Device/browser information
      - `ip_address` (inet) - Client IP (for fraud detection)
      - `created_at` (timestamptz) - When the event occurred

  2. Schema Changes
    - Add `tokens_used` column to horoscope_history for AI usage tracking
    - Add `quiz_definition_id` column to quiz_results to link to definitions

  3. Security
    - Enable RLS on all new tables
    - quiz_definitions: Public read access for active quizzes, no user modifications
    - subscriptions: Users can only view/manage their own subscriptions
    - audit_events: Users can insert their own events, only service role can read all

  4. Indexes
    - Optimized indexes for common query patterns
    - Subscription lookups by user and status
    - Audit event queries by user, event name, and time range
*/

-- Quiz Definitions table (admin-managed quiz templates)
CREATE TABLE IF NOT EXISTS quiz_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  questions jsonb NOT NULL DEFAULT '[]',
  result_mappings jsonb NOT NULL DEFAULT '{}',
  is_premium boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_quiz_type CHECK (type IN ('mbti', 'love_language', 'big_five', 'enneagram', 'attachment', 'communication', 'values')),
  CONSTRAINT unique_quiz_type_version UNIQUE (type, version)
);

ALTER TABLE quiz_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active quiz definitions"
  ON quiz_definitions FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Subscriptions table (billing and entitlements)
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider text NOT NULL,
  product_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  period text NOT NULL,
  started_at timestamptz,
  expires_at timestamptz,
  cancelled_at timestamptz,
  transaction_id text,
  receipt_data text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_provider CHECK (provider IN ('samsung', 'google', 'stripe', 'apple', 'web', 'promo')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'cancelled', 'expired', 'pending', 'trial', 'grace_period')),
  CONSTRAINT valid_period CHECK (period IN ('weekly', 'monthly', 'yearly', 'lifetime'))
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Audit Events table (analytics and event tracking)
CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  payload jsonb DEFAULT '{}',
  session_id text,
  device_info jsonb DEFAULT '{}',
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own audit events"
  ON audit_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view own audit events"
  ON audit_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Add tokens_used to horoscope_history for AI usage tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'horoscope_history' AND column_name = 'tokens_used'
  ) THEN
    ALTER TABLE horoscope_history ADD COLUMN tokens_used integer DEFAULT 0;
  END IF;
END $$;

-- Add quiz_definition_id to quiz_results to link with definitions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_results' AND column_name = 'quiz_definition_id'
  ) THEN
    ALTER TABLE quiz_results ADD COLUMN quiz_definition_id uuid REFERENCES quiz_definitions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add label column to quiz_results for storing result type label
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_results' AND column_name = 'label'
  ) THEN
    ALTER TABLE quiz_results ADD COLUMN label text;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_definitions_type ON quiz_definitions(type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_audit_events_user ON audit_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_name ON audit_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_session ON audit_events(session_id) WHERE session_id IS NOT NULL;

-- Trigger for updated_at on quiz_definitions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_quiz_definitions_updated_at') THEN
    CREATE TRIGGER update_quiz_definitions_updated_at
      BEFORE UPDATE ON quiz_definitions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Trigger for updated_at on subscriptions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subscriptions_updated_at') THEN
    CREATE TRIGGER update_subscriptions_updated_at
      BEFORE UPDATE ON subscriptions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Function to check if user has active premium subscription
CREATE OR REPLACE FUNCTION has_active_subscription(check_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = check_user_id
      AND status IN ('active', 'trial', 'grace_period')
      AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync premium status from subscription
CREATE OR REPLACE FUNCTION sync_premium_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET is_premium = has_active_subscription(NEW.user_id),
      updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-sync premium status when subscription changes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sync_premium_on_subscription_change') THEN
    CREATE TRIGGER sync_premium_on_subscription_change
      AFTER INSERT OR UPDATE ON subscriptions
      FOR EACH ROW
      EXECUTE FUNCTION sync_premium_status();
  END IF;
END $$;
