-- ============================================================================
-- Community: 12 zodiac sign zones
-- ============================================================================
-- Cece's community is organised around per-sign zones (白羊座/金牛座…), which
-- gives every user an obvious "my room" to post in and makes the feed feel
-- personal rather than one undifferentiated stream. This widens the topic
-- CHECK constraint to accept the 12 signs alongside the existing topics.
--
-- Sign zones are plain topics (no new table): the feed filter, RLS,
-- moderation pipeline, reactions, comments and reporting all work unchanged.
-- ============================================================================

ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS community_posts_topic_check;
ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_topic_check
  CHECK (topic IN (
    -- original topics
    'general', 'tarot', 'astrology', 'moon',
    'love', 'shadow', 'career', 'wellness', 'whispering-well',
    -- zodiac sign zones
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
  ));

-- Feed queries filter by topic; keep that fast now that the cardinality grew.
CREATE INDEX IF NOT EXISTS idx_community_posts_topic_created
  ON public.community_posts (topic, created_at DESC)
  WHERE is_hidden = false AND moderation_status = 'allowed';
