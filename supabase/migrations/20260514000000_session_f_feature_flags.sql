-- ============================================================================
-- Session F feature flags
-- ============================================================================
-- advisor-voice   — LiveKit audio on advisor_sessions (requires LiveKit env).
-- chart-transits  — Transits-overlay variant on the natal chart wheel.
-- advisor-payouts — Stripe Connect cashout surface on advisor dashboard.
--                    (Schema + functions ship always; flag toggles UI.)
-- ============================================================================

INSERT INTO public.feature_flags (key, description, enabled, rollout_percent)
VALUES
  ('advisor-voice',
   'LiveKit voice on 1:1 advisor sessions. Requires LIVEKIT_API_KEY + LIVEKIT_WS_URL.',
   false, 0),
  ('chart-transits',
   'Transits overlay variant on the natal chart wheel. Pure read-side.',
   true, 100),
  ('advisor-payouts',
   'Stripe Connect cashout UI on the advisor dashboard. Requires stripe-webhook + account.updated wiring.',
   false, 0)
ON CONFLICT (key) DO NOTHING;
