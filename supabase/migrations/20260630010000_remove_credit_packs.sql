-- ─────────────────────────────────────────────────────────────────────
-- Remove credit-pack monetization — 2026-04-30
--
-- Decision: subscription-only model. Credit packs added complexity
-- without clear strategic upside (per-feature consumables overlap with
-- "Premium = unlimited everything" anyway). Cleanly drop the schema.
--
-- Removes:
--   - signup-bonus trigger (no point granting credits with no spend path)
--   - spend_credits, grant_credits RPCs
--   - credit_ledger, user_credits tables
--
-- Reversible: re-running 20260629130000_credit_packs.sql restores schema.
-- ─────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_grant_signup_credits ON profiles;
DROP FUNCTION IF EXISTS grant_signup_credits();
DROP FUNCTION IF EXISTS spend_credits(uuid, integer, text, jsonb);
DROP FUNCTION IF EXISTS grant_credits(uuid, integer, text, jsonb);
DROP TABLE IF EXISTS credit_ledger;
DROP TABLE IF EXISTS user_credits;
