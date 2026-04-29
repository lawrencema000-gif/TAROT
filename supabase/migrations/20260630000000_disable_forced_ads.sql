-- ─────────────────────────────────────────────────────────────────────
-- Disable forced ads (interstitial + app-open) — 2026-04-30
--
-- Per Labyrinthos competitive audit, ad-free positioning is the #1
-- differentiator competitors weaponize against ad-supported tarot apps.
-- Pausing forced ads via the existing feature flag — rewarded ads still
-- run because they're opt-in (users tap "watch to earn moonstones").
--
-- Idempotent: upsert + sets enabled=false. Re-running does no harm.
-- To turn ads back on: UPDATE public.feature_flags SET enabled=true,
-- rollout_percent=100 WHERE key='forced-ads-enabled'.
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO public.feature_flags (key, description, enabled, rollout_percent)
VALUES (
  'forced-ads-enabled',
  'Whether forced ads (interstitial + app-open) are shown. Rewarded ads remain on regardless. Toggled OFF 2026-04-30 for ad-free positioning.',
  false,
  0
)
ON CONFLICT (key) DO UPDATE
  SET enabled = false,
      rollout_percent = 0,
      description = EXCLUDED.description,
      updated_at = now();
