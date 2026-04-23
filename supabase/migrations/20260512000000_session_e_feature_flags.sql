-- ============================================================================
-- Session E feature flags
-- ============================================================================
-- AI sub-features (quick reading, tarot companion, journal coach) each flip
-- individually — we may want to roll quick reading wider before the others.
-- Live rooms ships as list+RSVP only; voice is deferred behind a future
-- live-rooms-voice flag when the LiveKit token service is up.
-- ============================================================================

INSERT INTO public.feature_flags (key, description, enabled, rollout_percent)
VALUES
  ('ai-quick-reading',
   'AI "3-second reading" — single-shot card + interpretation grounded in natal context.',
   false, 0),
  ('ai-tarot-companion',
   'AI tarot companion — draw a card, multi-turn chat about it with the oracle persona.',
   false, 0),
  ('journal-coach',
   'AI journal coach — reflective prompts on the user''s journal entry.',
   false, 0),
  ('chart-wheel',
   'Interactive SVG chart wheel inside the natal-chart report.',
   true, 100),
  ('live-rooms',
   'Live rooms listing + RSVP. Voice streaming arrives with live-rooms-voice flag.',
   false, 0),
  ('live-rooms-voice',
   'LiveKit audio streaming inside live rooms. Requires voice token service.',
   false, 0)
ON CONFLICT (key) DO NOTHING;
