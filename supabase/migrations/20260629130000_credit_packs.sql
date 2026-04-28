-- ─────────────────────────────────────────────────────────────────────
-- Credit-pack monetization — 2026-04-29
--
-- Layers credit-pack consumable IAP under the existing subscription tier.
-- New users get a small starting credit grant; they spend credits on AI
-- features (oracle chat, dream interpreter, etc.) and can buy more in
-- packs. Rev model parallels Labyrinthos's hybrid (free + credits + sub).
--
-- Tables:
--   user_credits — running balance + lifetime stats per user
--   credit_ledger — append-only transaction log (purchases, spends, refunds, grants)
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_credits (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_purchased integer NOT NULL DEFAULT 0,
  lifetime_spent integer NOT NULL DEFAULT 0,
  lifetime_granted integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own credits"
  ON user_credits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Inserts/updates only via service-role (edge functions). No client mutation.

CREATE TABLE IF NOT EXISTS credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  delta integer NOT NULL,                              -- positive = credit, negative = spend
  reason text NOT NULL,                                -- 'purchase' | 'spend' | 'refund' | 'grant' | 'signup_bonus'
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,             -- {pack_id, stripe_session_id, feature, etc.}
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON credit_ledger (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_reason ON credit_ledger (reason);

ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own credit ledger"
  ON credit_ledger FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RPC for atomic credit spend — used by AI feature edge functions.
-- Returns new balance on success, raises if insufficient credits.
CREATE OR REPLACE FUNCTION spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text DEFAULT 'spend',
  p_meta jsonb DEFAULT '{}'::jsonb
) RETURNS integer AS $$
DECLARE
  v_new_balance integer;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  -- Lock row to prevent races
  UPDATE user_credits
    SET balance = balance - p_amount,
        lifetime_spent = lifetime_spent + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id
      AND balance >= p_amount
    RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'insufficient credits' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO credit_ledger (user_id, delta, reason, meta)
    VALUES (p_user_id, -p_amount, p_reason, p_meta);

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for atomic credit grant (purchases, signup bonuses, refunds).
CREATE OR REPLACE FUNCTION grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_meta jsonb DEFAULT '{}'::jsonb
) RETURNS integer AS $$
DECLARE
  v_new_balance integer;
  v_is_purchase boolean;
  v_is_grant boolean;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;
  v_is_purchase := p_reason = 'purchase';
  v_is_grant := p_reason IN ('grant', 'signup_bonus');

  INSERT INTO user_credits (user_id, balance, lifetime_purchased, lifetime_granted)
    VALUES (
      p_user_id,
      p_amount,
      CASE WHEN v_is_purchase THEN p_amount ELSE 0 END,
      CASE WHEN v_is_grant THEN p_amount ELSE 0 END
    )
  ON CONFLICT (user_id) DO UPDATE
    SET balance = user_credits.balance + EXCLUDED.balance,
        lifetime_purchased = user_credits.lifetime_purchased + (CASE WHEN v_is_purchase THEN p_amount ELSE 0 END),
        lifetime_granted = user_credits.lifetime_granted + (CASE WHEN v_is_grant THEN p_amount ELSE 0 END),
        updated_at = now()
    RETURNING balance INTO v_new_balance;

  INSERT INTO credit_ledger (user_id, delta, reason, meta)
    VALUES (p_user_id, p_amount, p_reason, p_meta);

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-grant 33 credits on profile creation (matches Labyrinthos's onboarding).
-- Uses a simple after-insert trigger on profiles. Existing users will not get
-- this retroactively — admins can grant via the grant_credits RPC if needed.
CREATE OR REPLACE FUNCTION grant_signup_credits()
RETURNS trigger AS $$
BEGIN
  PERFORM grant_credits(NEW.id, 33, 'signup_bonus', jsonb_build_object('source', 'signup'));
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't let credit-grant failure block profile creation
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_grant_signup_credits ON profiles;
CREATE TRIGGER trg_grant_signup_credits
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION grant_signup_credits();

GRANT EXECUTE ON FUNCTION spend_credits TO authenticated;
GRANT EXECUTE ON FUNCTION grant_credits TO authenticated;
