-- p12 premium-12 (WP-P0-06). Both payment webhooks upsert public.subscriptions
-- ON CONFLICT (transaction_id), but no unique index exists on that column, so
-- every upsert fails with 42P10 and is only logged: no subscription row can
-- ever be written. The table held 0 rows on 2026-11-15, so this cannot fail
-- on existing data. NULLs stay allowed (NULLS DISTINCT is the default).
-- A plain (non-partial) constraint: PostgREST's on_conflict=transaction_id
-- cannot name a partial index's predicate.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.subscriptions'::regclass
       AND conname = 'subscriptions_transaction_id_key'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_transaction_id_key UNIQUE (transaction_id);
  END IF;
END $$;
