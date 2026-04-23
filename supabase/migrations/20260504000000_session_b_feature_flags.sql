-- ============================================================================
-- Session B feature flags — moderation, referrals, career report
-- ============================================================================
-- Session B ships: community moderation pipeline (safety-critical),
-- peer referral program, and the first pay-per-report (Career Archetype).
-- Every surface defaults OFF and flips individually.
--
-- Flag usage:
--   community-moderation-required — when ON, CommunityPage composer +
--                                    comments MUST call the edge function
--                                    before posting. Paired with the
--                                    `community` flag (already seeded).
--                                    Start ON; flip OFF only during
--                                    incident response.
--   referral                       — ReferralSheet button shows on ProfilePage.
--   career-report                  — ProfilePage entry + /reports/career route.
-- ============================================================================

INSERT INTO public.feature_flags (key, description, enabled, rollout_percent)
VALUES
  ('community-moderation-required',
   'Require server-side moderation before posts/comments write. Default ON — flip OFF only during incident response.',
   true, 100),
  ('referral',
   'Peer referral program — invite codes, 100 Moonstones per side.',
   false, 0),
  ('career-report',
   'Career Archetype deep report — first pay-per-report ($6.99 / 150 Moonstones).',
   false, 0)
ON CONFLICT (key) DO NOTHING;
