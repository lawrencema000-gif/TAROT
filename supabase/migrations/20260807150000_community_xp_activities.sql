-- ============================================================================
-- XP for community participation
-- ============================================================================
-- xp_activities.activity_type is CHECK-constrained to a fixed list, so the
-- new community actions must be added there before awardXP() can record them
-- (otherwise every community XP call fails the insert silently).
--
-- Values mirror the existing economy: a post is worth about a journal entry
-- (15), a comment is a lighter touch (5).
-- ============================================================================

ALTER TABLE public.xp_activities DROP CONSTRAINT IF EXISTS xp_activities_activity_type_check;
ALTER TABLE public.xp_activities ADD CONSTRAINT xp_activities_activity_type_check
  CHECK (activity_type = ANY (ARRAY[
    'ritual_complete'::text, 'reading_saved'::text, 'reading_complete'::text,
    'journal_entry'::text, 'quiz_complete'::text, 'horoscope_viewed'::text,
    'streak_milestone_7'::text, 'streak_milestone_30'::text,
    'streak_milestone_100'::text, 'streak_milestone_365'::text,
    -- community participation
    'community_post'::text, 'community_comment'::text
  ]));
