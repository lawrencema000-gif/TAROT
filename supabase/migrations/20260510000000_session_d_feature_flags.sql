-- ============================================================================
-- Session D feature flags
-- ============================================================================
-- Session D ships five quizzes (feeds existing extra-quizzes surface — no
-- flag needed since existing quiz list is unconditional), compat deep-link
-- invites, the affiliate tier (schema-only; UI follow-on), and the advisor
-- booking + realtime chat MVP.
--
-- Defaults OFF. Safe to flip one at a time in production.
-- ============================================================================

INSERT INTO public.feature_flags (key, description, enabled, rollout_percent)
VALUES
  ('compat-invite',
   'Compatibility deep-link invites — share a code, take the quiz, see a joint reading.',
   false, 0),
  ('affiliate-program',
   'Affiliate tier on referrals — 10% rev share for 12 months. Applications + admin review.',
   false, 0),
  ('advisor-booking',
   'Advisor marketplace — live bookings with availability, Moonstone-paid text sessions.',
   false, 0)
ON CONFLICT (key) DO NOTHING;
