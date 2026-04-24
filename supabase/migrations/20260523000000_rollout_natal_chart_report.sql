-- ============================================================================
-- Week-1 one-at-a-time rollout: Full Natal Chart Report
-- ============================================================================
-- Per MASTER-ROADMAP-2026-04-24.md, the first feature to flip to 100% is the
-- Full Natal Chart Report. It's already code-complete, paywalled at 200
-- moonstones / $9.99, and QA'd end-to-end (see QA-PUNCH-LIST + QA-FIXES of
-- 2026-04-24). All supporting edge functions are deployed + active.
--
-- This migration flips THREE flags together — the base report + its two
-- advanced-tab flags — because users who pay for the chart expect the
-- complete wheel experience (natal / transits today / progressions /
-- solar return / synastry). Shipping just the base flag would paywall
-- a chart with the extra tabs hidden.
--
-- Idempotent. Re-running is safe.
-- ============================================================================

DO $$
DECLARE
  v_flag text;
  v_flags text[] := ARRAY['natal-chart-report', 'chart-transits', 'chart-variants'];
BEGIN
  FOREACH v_flag IN ARRAY v_flags LOOP
    UPDATE public.feature_flags
      SET enabled = true,
          rollout_percent = 100,
          updated_at = now()
      WHERE key = v_flag;

    IF NOT FOUND THEN
      INSERT INTO public.feature_flags (key, description, enabled, rollout_percent, allowed_user_ids)
        VALUES (v_flag, 'Week-1 rollout — natal chart report', true, 100, ARRAY[]::uuid[])
        ON CONFLICT (key) DO UPDATE
          SET enabled = true,
              rollout_percent = 100,
              updated_at = now();
    END IF;

    RAISE NOTICE 'Flipped flag % to 100%% rollout', v_flag;
  END LOOP;
END$$;
