-- ─────────────────────────────────────────────────────────────────────
-- Newsletter course delivery — 2026-04-29
--
-- Adds:
--   - unsubscribe_token to newsletter_signups (per-row UUID, used in
--     one-click unsubscribe links inside lesson emails)
--   - send_after column for delayed-send lessons (computed in cron)
--   - Index for the cron's eligibility query
-- ─────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'newsletter_signups' AND column_name = 'unsubscribe_token'
  ) THEN
    ALTER TABLE newsletter_signups
      ADD COLUMN unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid();
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_signups_unsub_token
  ON newsletter_signups (unsubscribe_token);

-- Index to make the cron's eligibility query cheap (find rows ready
-- for next lesson). emails_sent + last_emailed_at + unsubscribed_at.
CREATE INDEX IF NOT EXISTS idx_newsletter_signups_cron
  ON newsletter_signups (emails_sent, last_emailed_at)
  WHERE unsubscribed_at IS NULL AND emails_sent < 3;

-- RPC for the unsubscribe flow. Validates token + sets unsubscribed_at.
-- SECURITY DEFINER so anon can call it via supabase.rpc().
CREATE OR REPLACE FUNCTION newsletter_unsubscribe(p_token uuid)
RETURNS jsonb AS $$
DECLARE
  v_email text;
BEGIN
  UPDATE newsletter_signups
    SET unsubscribed_at = now()
    WHERE unsubscribe_token = p_token
      AND unsubscribed_at IS NULL
    RETURNING email INTO v_email;
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_or_already_unsubscribed');
  END IF;
  RETURN jsonb_build_object('ok', true, 'email', v_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION newsletter_unsubscribe(uuid) TO anon, authenticated;
