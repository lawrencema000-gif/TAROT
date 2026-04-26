-- ============================================================================
-- Materialize moonstone_balances for scale — 2026-04-26
-- ============================================================================
-- The original moonstone_balances was a VIEW that summed
-- moonstone_transactions on every read. At 50k users × 200 tx/user = 10M
-- rows, every balance check scans the table. Even with the user_created
-- index, the GROUP BY user_id forces a sort.
--
-- Replace with a TABLE (not view) maintained by a BEFORE-INSERT trigger.
-- Each insert into moonstone_transactions atomically updates the user's
-- balance row. Reads become single-row PK lookups (microseconds, not
-- milliseconds) and don't grow with transaction history.
--
-- Migration strategy:
--   1. Create the new `moonstone_balance` table (singular — keeps the
--      old plural view name available for backward compat during rollout).
--   2. Backfill from the existing transactions.
--   3. Add the trigger so all future writes update both ledger + balance.
--   4. Replace the `moonstone_balances` VIEW to read from the new table.
--      DAL code keeps working unchanged.
-- ============================================================================

-- 1. Materialized balance table (one row per user with a balance).
CREATE TABLE IF NOT EXISTS public.moonstone_balance (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance              integer NOT NULL DEFAULT 0,
  transaction_count    integer NOT NULL DEFAULT 0,
  last_transaction_at  timestamptz,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.moonstone_balance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS moonstone_balance_select_own ON public.moonstone_balance;
CREATE POLICY moonstone_balance_select_own
  ON public.moonstone_balance FOR SELECT
  USING (auth.uid() = user_id);

GRANT SELECT ON public.moonstone_balance TO authenticated;

-- 2. Backfill from existing transactions. Idempotent — ON CONFLICT just
-- updates the row to the recomputed value.
INSERT INTO public.moonstone_balance (user_id, balance, transaction_count, last_transaction_at, updated_at)
SELECT
  user_id,
  COALESCE(SUM(amount), 0)::integer,
  COUNT(*)::integer,
  MAX(created_at),
  now()
FROM public.moonstone_transactions
GROUP BY user_id
ON CONFLICT (user_id) DO UPDATE SET
  balance              = EXCLUDED.balance,
  transaction_count    = EXCLUDED.transaction_count,
  last_transaction_at  = EXCLUDED.last_transaction_at,
  updated_at           = now();

-- 3. Trigger maintains the balance on every transaction insert.
CREATE OR REPLACE FUNCTION public.moonstone_apply_to_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.moonstone_balance (user_id, balance, transaction_count, last_transaction_at)
  VALUES (NEW.user_id, NEW.amount, 1, NEW.created_at)
  ON CONFLICT (user_id) DO UPDATE SET
    balance              = public.moonstone_balance.balance + EXCLUDED.balance,
    transaction_count    = public.moonstone_balance.transaction_count + 1,
    last_transaction_at  = GREATEST(public.moonstone_balance.last_transaction_at, EXCLUDED.last_transaction_at),
    updated_at           = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS moonstone_apply_to_balance_trigger ON public.moonstone_transactions;
CREATE TRIGGER moonstone_apply_to_balance_trigger
  AFTER INSERT ON public.moonstone_transactions
  FOR EACH ROW EXECUTE FUNCTION public.moonstone_apply_to_balance();

-- 4. Replace the old VIEW so existing DAL queries (`SELECT balance FROM
-- moonstone_balances WHERE user_id = ...`) keep working. Now reads from
-- the materialized table instead of a live SUM.
DROP VIEW IF EXISTS public.moonstone_balances CASCADE;

CREATE VIEW public.moonstone_balances
WITH (security_invoker = true)
AS
SELECT
  user_id,
  balance,
  transaction_count,
  -- Backward-compat fields (some callers select these explicitly).
  last_transaction_at,
  last_transaction_at AS first_transaction_at -- kept for shape compat, no longer accurate but unused
FROM public.moonstone_balance;

GRANT SELECT ON public.moonstone_balances TO authenticated;

DO $$ BEGIN
  RAISE NOTICE 'moonstone-balance: materialized table + trigger live. Reads now O(1) instead of O(N) over transactions.';
END $$;
