-- ============================================================================
-- Week-3 one-at-a-time rollout: Soulmate Score
-- ============================================================================
-- Standalone compatibility read, free tier. Input: partner birth date
-- (+ optional time + name). Uses the existing `astrology-synastry` edge
-- function (now unblocked post-ecf65a9 — Deno.serve fix) and scores
-- cross-aspects into a single 0-100 number with a classical harmony /
-- friction weighting. Viral share card.
--
-- Flag `soulmate-score` gates only the home-tile entry point; the route
-- `/soulmate-score` itself is ungated so shared result URLs resolve for
-- anyone.
--
-- Rolled out to 100% immediately — same risk profile as Pick-a-Card:
-- no new server surface, leverages an existing edge function.
--
-- Idempotent. Re-running is safe.
-- ============================================================================

INSERT INTO public.feature_flags (key, description, enabled, rollout_percent, allowed_user_ids)
  VALUES (
    'soulmate-score',
    'Soulmate Score — Western-audience synastry reduced to a 0-100 number. Free tier, acquisition + virality surface.',
    true,
    100,
    ARRAY[]::uuid[]
  )
  ON CONFLICT (key) DO UPDATE
    SET enabled = true,
        rollout_percent = 100,
        updated_at = now();
