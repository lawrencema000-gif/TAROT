-- ============================================================================
-- Hide Community + Whispering Well for now — 2026-04-25
-- ============================================================================
-- Per user direction: these two features are being hidden from the UI
-- for the current release. The code, pages, DAL, edge function, and DB
-- tables are all left intact so the features can be re-enabled later
-- without a schema or code change — just flip the flags back on.
--
-- What this migration does:
--   1. Ensures rows exist for `community` and `whispering-well` in the
--      feature_flags table (INSERT ... ON CONFLICT DO UPDATE).
--   2. Sets enabled=false, rollout_percent=0, allowed_user_ids='{}' so
--      the evaluator returns OFF for every user.
--   3. The BottomNav reads these flags via useFeatureFlag(); with both
--      off, neither menu entry renders. Direct URLs (/community,
--      /whispering-well) still resolve the route for admin/testing, but
--      no visible link reaches them.
--
-- To re-enable later:
--   UPDATE public.feature_flags SET enabled=true, rollout_percent=100
--   WHERE key IN ('community', 'whispering-well');
--
-- Idempotent. Safe to re-run.
-- ============================================================================

INSERT INTO public.feature_flags (key, description, enabled, rollout_percent, allowed_user_ids)
VALUES
  ('community',       'Community feed — hidden for now, re-enable in a later release.', false, 0, '{}'),
  ('whispering-well', 'Anonymous Whispering Well — hidden for now, re-enable in a later release.', false, 0, '{}')
ON CONFLICT (key) DO UPDATE SET
  enabled          = false,
  rollout_percent  = 0,
  allowed_user_ids = '{}',
  description      = EXCLUDED.description,
  updated_at       = now();

-- Sanity log — emits how many rows the UI layer will stop showing.
DO $$
DECLARE
  community_count bigint;
  whispering_count bigint;
BEGIN
  SELECT count(*) INTO community_count
    FROM public.community_posts
    WHERE topic <> 'whispering-well' AND is_hidden = false;
  SELECT count(*) INTO whispering_count
    FROM public.community_posts
    WHERE topic =  'whispering-well' AND is_hidden = false;
  RAISE NOTICE 'hide-community-features: flipped 2 flags off. Existing post rows preserved — % community, % whispering-well.',
    community_count, whispering_count;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'hide-community-features: flags flipped; community_posts table not present (fresh DB).';
END $$;
