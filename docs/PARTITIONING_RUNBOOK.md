# Partition `moonstone_transactions` Runbook

**When to do this:** when row count exceeds **10 million** OR when monthly insert rate exceeds **500k rows**. Until then, the materialised `moonstone_balance` table makes balance reads O(1) regardless of ledger size — partitioning is unnecessary.

Check size:
```sql
SELECT count(*) FROM public.moonstone_transactions;
SELECT pg_size_pretty(pg_relation_size('public.moonstone_transactions'));
```

## What partitioning gets you at 50k DAU

- Old months can be detached and dropped/archived → smaller backups, faster vacuum
- Index size per partition is bounded by month volume, not lifetime volume
- Postgres can constraint-exclude partitions on `WHERE created_at >= X` queries

## What partitioning costs

- Unique constraints `(user_id, kind, reference)` must include `created_at` — changes idempotency semantics across months
- Existing client code keeps working unchanged; pure DB-side change
- Migration is **NOT zero-downtime** at scale — needs a brief write lock

## Procedure (when ready)

### Pre-flight
1. Pick a maintenance window (low traffic, ~30 min)
2. Take a manual backup via Supabase dashboard
3. Set application to read-only or accept write-pause via the AI killswitch flag

### Migration

```sql
BEGIN;

-- Lock the table to prevent concurrent writes during the swap.
LOCK TABLE public.moonstone_transactions IN ACCESS EXCLUSIVE MODE;

-- Rename the existing table out of the way.
ALTER TABLE public.moonstone_transactions RENAME TO moonstone_transactions_old;

-- Create the new partitioned parent.
CREATE TABLE public.moonstone_transactions (
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount          INTEGER NOT NULL CHECK (amount <> 0),
  kind            TEXT NOT NULL CHECK (kind IN (
    'purchase', 'daily-checkin', 'referral', 'streak', 'quiz-complete',
    'gift', 'gift-receive', 'advisor-session', 'pay-per-report',
    'pay-per-action', 'rewarded-ad', 'refund', 'admin-grant', 'admin-claw'
  )),
  reference       TEXT,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)  -- partition key MUST be in PK
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for the next 24 months. Use a script — see below.
-- Then a default partition catches anything that lands outside the explicit ones.
CREATE TABLE public.moonstone_transactions_default
  PARTITION OF public.moonstone_transactions DEFAULT;

-- Backfill from old.
INSERT INTO public.moonstone_transactions
  SELECT * FROM public.moonstone_transactions_old;

-- Recreate indexes on the parent (Postgres creates per-partition indexes).
CREATE INDEX moonstone_transactions_user_created_idx
  ON public.moonstone_transactions (user_id, created_at DESC);
CREATE INDEX moonstone_transactions_user_reference_idx
  ON public.moonstone_transactions (user_id, reference)
  WHERE reference IS NOT NULL;

-- Idempotency uniques — note these now include created_at via PK.
-- Cross-month replay protection has to come from app-level idem keys
-- (which already use timestamps in the ID).
CREATE UNIQUE INDEX moonstone_transactions_reward_idem
  ON public.moonstone_transactions (user_id, kind, reference, created_at)
  WHERE kind = 'rewarded-ad' AND reference IS NOT NULL;

-- Reattach the trigger.
DROP TRIGGER IF EXISTS moonstone_apply_to_balance_trigger ON public.moonstone_transactions;
CREATE TRIGGER moonstone_apply_to_balance_trigger
  AFTER INSERT ON public.moonstone_transactions
  FOR EACH ROW EXECUTE FUNCTION public.moonstone_apply_to_balance();

DROP TRIGGER IF EXISTS moonstone_enforce_sign_trigger ON public.moonstone_transactions;
CREATE TRIGGER moonstone_enforce_sign_trigger
  BEFORE INSERT ON public.moonstone_transactions
  FOR EACH ROW EXECUTE FUNCTION public.moonstone_enforce_sign();

-- Reattach RLS policies.
ALTER TABLE public.moonstone_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY moonstone_transactions_select_own
  ON public.moonstone_transactions FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY moonstone_transactions_insert_own_credits
  ON public.moonstone_transactions FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND kind IN ('daily-checkin', 'quiz-complete', 'referral', 'rewarded-ad')
  );
GRANT SELECT, INSERT ON public.moonstone_transactions TO authenticated;

-- Refresh the moonstone_balances view.
DROP VIEW IF EXISTS public.moonstone_balances CASCADE;
CREATE VIEW public.moonstone_balances WITH (security_invoker = true) AS
  SELECT user_id, balance, transaction_count, last_transaction_at,
         last_transaction_at AS first_transaction_at
    FROM public.moonstone_balance;
GRANT SELECT ON public.moonstone_balances TO authenticated;

COMMIT;

-- Once verified, drop the old.
-- DROP TABLE public.moonstone_transactions_old;
```

### Monthly partition creation script

Run this on the 25th of every month to create next month's partition (set as a cron):

```sql
DO $$
DECLARE
  v_next_month_start date := date_trunc('month', CURRENT_DATE + interval '1 month');
  v_next_month_end   date := date_trunc('month', CURRENT_DATE + interval '2 month');
  v_partition_name   text := 'moonstone_transactions_' || to_char(v_next_month_start, 'YYYY_MM');
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.moonstone_transactions FOR VALUES FROM (%L) TO (%L);',
    v_partition_name, v_next_month_start, v_next_month_end
  );
END $$;
```

## Verification post-swap

```sql
-- Row counts should match.
SELECT count(*) FROM public.moonstone_transactions;
SELECT count(*) FROM public.moonstone_transactions_old;

-- Spot-check a recent insert lands in the correct partition.
SELECT tableoid::regclass AS partition, count(*)
  FROM public.moonstone_transactions
  GROUP BY tableoid;

-- moonstone_balance trigger still fires.
SELECT balance FROM public.moonstone_balance WHERE user_id = '<test-user>';
INSERT INTO public.moonstone_transactions (user_id, amount, kind, note)
  VALUES ('<test-user>', 1, 'admin-grant', 'partition test');
SELECT balance FROM public.moonstone_balance WHERE user_id = '<test-user>';
-- Should have incremented by 1.
```

## Rollback

If anything goes wrong before the COMMIT, just `ROLLBACK`. After commit but before dropping the old table:

```sql
BEGIN;
DROP TABLE public.moonstone_transactions CASCADE;
ALTER TABLE public.moonstone_transactions_old RENAME TO moonstone_transactions;
-- Recreate the trigger + policies as they were
COMMIT;
```
