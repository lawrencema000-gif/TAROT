-- ─────────────────────────────────────────────────────────────────────
-- Sync vault.cron_secret with the CRON_SECRET edge-function env var.
--
-- Background: every pg_cron job in this project triggers an edge fn
-- via net.http_post + an X-Webhook-Secret header pulled from
-- `vault.decrypted_secrets WHERE name = 'cron_secret'`. The edge
-- functions then verify that header against `Deno.env.get('CRON_SECRET')`.
-- If the two diverge — vault entry missing, or secret rotated in only
-- one place — every cron-triggered call returns 401 silently. The
-- jobs continue to fire on schedule, but no work happens. The
-- newsletter-course pipeline was the visible casualty: signups
-- accumulated but emails never sent.
--
-- This migration writes a placeholder into vault.secrets so the row
-- exists; the actual value is set out-of-band (after this migration
-- applies, the operator runs a one-shot UPDATE with the same value
-- they passed to `supabase secrets set CRON_SECRET=...`).
--
-- We use a placeholder + UPDATE pattern rather than embedding the
-- secret in the migration because:
--   (a) migration files are checked into git — secrets must not be
--   (b) on every redeploy we want the secret to persist, not get
--       rewritten to whatever's hard-coded in the migration
--   (c) vault.update_secret() is idempotent so the operator can run
--       it as often as needed without side effects
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'cron_secret';
  IF v_id IS NULL THEN
    -- First-time creation. Placeholder value — operator MUST run the
    -- UPDATE below immediately after this migration applies.
    PERFORM vault.create_secret(
      'PLACEHOLDER_RUN_UPDATE_AFTER_MIGRATION_TO_SET_REAL_SECRET',
      'cron_secret',
      'Webhook secret shared between pg_cron http_post calls and edge function CRON_SECRET env var. Must match exactly.'
    );
  END IF;
END $$;

-- After this migration applies, run (substituting the real value):
--
--   SELECT vault.update_secret(
--     (SELECT id FROM vault.secrets WHERE name = 'cron_secret'),
--     '<paste CRON_SECRET value here>',
--     'cron_secret',
--     'Webhook secret shared with edge fn CRON_SECRET env var.'
--   );
