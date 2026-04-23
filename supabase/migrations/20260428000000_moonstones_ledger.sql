-- Moonstones virtual currency — append-only ledger pattern
--
-- Philosophy: we NEVER mutate balances directly. Every change is an
-- insert into moonstone_transactions. A postgres VIEW computes current
-- balance from the sum of transactions. This gives:
--   - Auditable history (what happened, when, why)
--   - No race-condition balance-overwrite bugs
--   - Easy reversal (insert a negating transaction)
--
-- Transaction kinds:
--   purchase    — user bought Moonstones via Stripe/RevenueCat (+)
--   daily-checkin — daily login reward (+)
--   referral    — earned by inviting a friend (+)
--   streak      — streak-milestone bonus (+)
--   quiz-complete — small reward for finishing a quiz (+)
--   gift        — user sent coins to another user (−)
--   gift-receive — other user sent coins to this user (+)
--   advisor-session — spent on advisor chat time (−)
--   pay-per-report — spent on a premium report (−)
--   refund      — reversal (±)
--   admin-grant — manually given by admin (+)
--   admin-claw  — manually taken by admin (−)

CREATE TABLE IF NOT EXISTS public.moonstone_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  /** Positive credits, negative debits. Enforce sign by kind via trigger. */
  amount          INTEGER NOT NULL CHECK (amount <> 0),
  kind            TEXT NOT NULL CHECK (kind IN (
    'purchase', 'daily-checkin', 'referral', 'streak', 'quiz-complete',
    'gift', 'gift-receive', 'advisor-session', 'pay-per-report',
    'refund', 'admin-grant', 'admin-claw'
  )),
  /** Reference to whatever produced this transaction — stripe session,
      rc transaction, post id, session id, etc. Free text. */
  reference       TEXT,
  /** Human-readable context. Shown in ledger UI. */
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS moonstone_transactions_user_created_idx
  ON public.moonstone_transactions (user_id, created_at DESC);

-- Balance view — sum of all transactions per user
CREATE OR REPLACE VIEW public.moonstone_balances AS
SELECT
  user_id,
  COALESCE(SUM(amount), 0)::INTEGER AS balance,
  COUNT(*)::INTEGER AS transaction_count,
  MIN(created_at) AS first_transaction_at,
  MAX(created_at) AS last_transaction_at
FROM public.moonstone_transactions
GROUP BY user_id;

-- Daily check-in idempotency — one per user per UTC day
CREATE TABLE IF NOT EXISTS public.moonstone_daily_checkins (
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  streak_day      INTEGER NOT NULL DEFAULT 1,
  amount          INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, date)
);

-- RLS
ALTER TABLE public.moonstone_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moonstone_daily_checkins  ENABLE ROW LEVEL SECURITY;

-- Users can read their own transactions and their balance row
DROP POLICY IF EXISTS moonstone_transactions_select_own ON public.moonstone_transactions;
CREATE POLICY moonstone_transactions_select_own
  ON public.moonstone_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Insert-own with guardrails: amount must be POSITIVE for user-initiated
-- kinds (daily-checkin, quiz-complete, referral). Negative amounts (spends)
-- go through server-side edge functions that assert balance sufficiency
-- first. For V1 MVP we allow client inserts but enforce sign correctness
-- via a CHECK-style trigger.
CREATE OR REPLACE FUNCTION public.moonstone_enforce_sign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Credit-only kinds (client-initiated) — must have positive amount
  IF NEW.kind IN ('daily-checkin', 'quiz-complete', 'streak', 'gift-receive', 'admin-grant', 'purchase', 'referral', 'refund') THEN
    IF NEW.amount <= 0 THEN
      RAISE EXCEPTION 'Kind % requires positive amount, got %', NEW.kind, NEW.amount;
    END IF;
  END IF;
  -- Debit-only kinds — must be negative
  IF NEW.kind IN ('gift', 'advisor-session', 'pay-per-report', 'admin-claw') THEN
    IF NEW.amount >= 0 THEN
      RAISE EXCEPTION 'Kind % requires negative amount, got %', NEW.kind, NEW.amount;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS moonstone_enforce_sign_trigger ON public.moonstone_transactions;
CREATE TRIGGER moonstone_enforce_sign_trigger
  BEFORE INSERT ON public.moonstone_transactions
  FOR EACH ROW EXECUTE FUNCTION public.moonstone_enforce_sign();

-- Insert policy: user may only insert transactions for themselves, and
-- only the client-initiated credit kinds. Server edge functions (SECURITY
-- DEFINER) insert the rest.
DROP POLICY IF EXISTS moonstone_transactions_insert_own_credits ON public.moonstone_transactions;
CREATE POLICY moonstone_transactions_insert_own_credits
  ON public.moonstone_transactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND kind IN ('daily-checkin', 'quiz-complete', 'referral')
  );

-- Balance view — readable only by the owner. We use a security_invoker
-- view so Postgres applies the underlying table RLS.
ALTER VIEW public.moonstone_balances SET (security_invoker = true);
GRANT SELECT ON public.moonstone_balances TO authenticated;

DROP POLICY IF EXISTS moonstone_daily_checkins_select_own ON public.moonstone_daily_checkins;
CREATE POLICY moonstone_daily_checkins_select_own
  ON public.moonstone_daily_checkins FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS moonstone_daily_checkins_insert_own ON public.moonstone_daily_checkins;
CREATE POLICY moonstone_daily_checkins_insert_own
  ON public.moonstone_daily_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Grants
GRANT SELECT, INSERT ON public.moonstone_transactions   TO authenticated;
GRANT SELECT, INSERT ON public.moonstone_daily_checkins TO authenticated;

-- RPC: atomic daily check-in. Validates streak continuity, computes
-- reward (5 → 50 ladder over 7 days), creates checkin row + ledger
-- transaction atomically, returns the transaction.
CREATE OR REPLACE FUNCTION public.moonstone_daily_checkin(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  amount_awarded INTEGER,
  streak_day INTEGER,
  is_streak_continuation BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id UUID;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - 1;
  v_yesterday_row RECORD;
  v_new_streak INTEGER;
  v_reward INTEGER;
  v_is_continuation BOOLEAN;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Idempotent: if already checked in today, return that row
  IF EXISTS (SELECT 1 FROM public.moonstone_daily_checkins WHERE user_id = v_user_id AND date = v_today) THEN
    RETURN QUERY SELECT amount, streak_day, (streak_day > 1) FROM public.moonstone_daily_checkins WHERE user_id = v_user_id AND date = v_today;
    RETURN;
  END IF;

  -- Streak continuation check
  SELECT * INTO v_yesterday_row FROM public.moonstone_daily_checkins
    WHERE user_id = v_user_id AND date = v_yesterday;
  IF v_yesterday_row IS NULL THEN
    v_new_streak := 1;
    v_is_continuation := false;
  ELSE
    v_new_streak := v_yesterday_row.streak_day + 1;
    v_is_continuation := true;
  END IF;

  -- Reward ladder: Day 1: 5, 2: 7, 3: 10, 4: 15, 5: 20, 6: 30, 7+: 50
  v_reward := CASE
    WHEN v_new_streak = 1 THEN 5
    WHEN v_new_streak = 2 THEN 7
    WHEN v_new_streak = 3 THEN 10
    WHEN v_new_streak = 4 THEN 15
    WHEN v_new_streak = 5 THEN 20
    WHEN v_new_streak = 6 THEN 30
    ELSE 50
  END;

  INSERT INTO public.moonstone_daily_checkins (user_id, date, streak_day, amount)
    VALUES (v_user_id, v_today, v_new_streak, v_reward);

  INSERT INTO public.moonstone_transactions (user_id, amount, kind, note)
    VALUES (v_user_id, v_reward, 'daily-checkin',
            CASE WHEN v_new_streak >= 7 THEN 'Week-streak reward'
                 ELSE 'Daily check-in day ' || v_new_streak::TEXT END);

  RETURN QUERY SELECT v_reward, v_new_streak, v_is_continuation;
END;
$$;

GRANT EXECUTE ON FUNCTION public.moonstone_daily_checkin(UUID) TO authenticated;
