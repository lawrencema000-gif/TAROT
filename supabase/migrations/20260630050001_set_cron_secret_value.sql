-- ONE-SHOT migration: this ran once at deploy time to set
-- vault.cron_secret to match the CRON_SECRET edge-function env var.
-- The actual value lived here briefly during application and has been
-- scrubbed from git history after the fact. The vault value persists.
-- Re-running is a no-op (the SELECT is idempotent if the value matches).
SELECT 1 AS noop;
