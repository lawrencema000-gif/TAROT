-- Replay-only (WP-F-04): production made these two partitions from now() on 2026-04-24
-- (20260424000000's DO block); a fresh database makes the current months instead, and
-- 20260530000000 names these two. Production already has both: this file is recorded as
-- applied there with `migration repair`, never run. 20260522010000 seals them (RLS + policy).
CREATE TABLE IF NOT EXISTS public.ai_usage_ledger_2026_04
  PARTITION OF public.ai_usage_ledger FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE IF NOT EXISTS public.ai_usage_ledger_2026_05
  PARTITION OF public.ai_usage_ledger FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
