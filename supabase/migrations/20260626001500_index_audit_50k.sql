-- ============================================================================
-- Index audit for 50k DAU readiness — 2026-04-26
-- ============================================================================
-- Reviewed every query path in the edge functions + DAL and added indexes
-- for the few that would do a full scan at scale. Most hot tables already
-- had appropriate indexes — these are targeted gaps.
-- ============================================================================

-- 1. profiles(is_premium=true) — used by reconcile-premium-status to find
--    "DB says premium but no Stripe sub". Without this index, that query
--    is a full table scan.
CREATE INDEX IF NOT EXISTS profiles_is_premium_idx
  ON public.profiles (is_premium)
  WHERE is_premium = true;

-- 2. moonstone_transactions(user_id, reference) — used by the spend RPC's
--    idempotency check (WHERE user_id = X AND reference = Y AND kind = 'pay-per-action').
--    Currently relies on the (user_id, created_at) index which forces a scan
--    of all that user's transactions. At 50k DAU × 200 tx each = real cost.
CREATE INDEX IF NOT EXISTS moonstone_transactions_user_reference_idx
  ON public.moonstone_transactions (user_id, reference)
  WHERE reference IS NOT NULL;

-- 3. blog_posts(cover_image IS NULL) — used by backfill-blog-covers to find
--    posts missing covers. At a few thousand posts a partial index keeps
--    the query trivial.
CREATE INDEX IF NOT EXISTS blog_posts_no_cover_idx
  ON public.blog_posts (published_at DESC)
  WHERE cover_image IS NULL AND published = true;

-- 4. subscriptions(user_id, status) — used by the reconcile job and
--    PremiumGate. Verify it exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
    -- Existing index name varies; create our own with a unique name.
    CREATE INDEX IF NOT EXISTS subscriptions_user_status_50k_idx
      ON public.subscriptions (user_id, status, updated_at DESC);
  END IF;
END $$;

-- 5. ai_daily_usage prune query — already PK on (user_id, usage_date), so
--    DELETE WHERE usage_date < X uses the index automatically. No new
--    index needed.

-- 6. moonstone_balance — single-row PK lookup. No further indexes needed.

DO $$ BEGIN
  RAISE NOTICE 'index-audit-50k: added partial indexes for profiles.is_premium, moonstone_transactions(user_id,reference), blog_posts(no cover), subscriptions(user_id,status).';
END $$;
