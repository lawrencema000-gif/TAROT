-- ============================================================================
-- Session G feature flags
-- ============================================================================
-- chart-variants    — unlocks progressions / solar-return / synastry on the
--                      natal chart wheel. Pairs with the existing chart-transits.
-- live-replays      — shows the replay unlock card on completed live rooms.
-- advisor-verify    — shows the self-serve verification flow + admin queue.
-- sandbox           — Three.js archetypal sandbox preview.
-- ============================================================================

INSERT INTO public.feature_flags (key, description, enabled, rollout_percent)
VALUES
  ('chart-variants',
   'Progressions, solar return, and synastry variants on the natal chart wheel.',
   true, 100),
  ('live-replays',
   'Replay card on completed live rooms (paid + free unlock logic).',
   false, 0),
  ('advisor-verify',
   'Self-serve advisor verification flow with admin review.',
   false, 0),
  ('sandbox',
   'Archetypal Three.js sandbox — preview release, drag-drop coming.',
   false, 0)
ON CONFLICT (key) DO NOTHING;
