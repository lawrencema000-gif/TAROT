/*
  # Seed Achievement Definitions

  This migration seeds the initial achievement definitions across 5 categories:
  - Exploration: Discovering app features
  - Mastery: Skill and repetition-based achievements
  - Dedication: Streaks and consistency achievements
  - Milestones: Level and rank progression achievements
  - Special: Unique and hidden achievements

  Each achievement has:
  - Name and description
  - Icon (lucide-react icon name)
  - Category and rarity
  - XP reward
  - Unlock condition (JSON with activity_type, target, etc.)
  - Premium-only flag where applicable
*/

-- Clear existing achievements to prevent duplicates on re-run
DELETE FROM user_achievements;
DELETE FROM achievement_shares;
DELETE FROM achievements;

-- ==========================================
-- EXPLORATION CATEGORY - Discovering Features
-- ==========================================

INSERT INTO achievements (name, description, icon_name, category, rarity, xp_reward, unlock_condition, is_premium_only, sort_order) VALUES
('First Steps', 'Complete your first daily ritual and begin your mystical journey.', 'footprints', 'exploration', 'common', 25, 
  '{"activity_type": "ritual_complete", "target": 1}', false, 1),

('Card Curious', 'Draw your first tarot card and glimpse the mysteries within.', 'square', 'exploration', 'common', 25,
  '{"activity_type": "reading_complete", "target": 1}', false, 2),

('Soul Searcher', 'Complete your first personality quiz and discover yourself.', 'search', 'exploration', 'common', 25,
  '{"activity_type": "quiz_complete", "target": 1}', false, 3),

('Inner Voice', 'Write your first journal entry and begin your reflection practice.', 'pen-tool', 'exploration', 'common', 25,
  '{"activity_type": "journal_entry", "target": 1}', false, 4),

('Star Gazer', 'Read your first daily horoscope and align with the cosmos.', 'star', 'exploration', 'common', 25,
  '{"activity_type": "horoscope_viewed", "target": 1}', false, 5),

('Spread Explorer', 'Experience all tarot spread types: single, three-card, and Celtic Cross.', 'layout-grid', 'exploration', 'rare', 100,
  '{"activity_type": "spread_types_used", "target": 3, "types": ["single", "three-card", "celtic-cross"]}', true, 6),

('Quiz Master', 'Complete all available personality quiz types.', 'graduation-cap', 'exploration', 'epic', 250,
  '{"activity_type": "quiz_types_complete", "target": 5, "types": ["mbti", "love-language", "big-five", "enneagram", "attachment"]}', false, 7),

('Library Scholar', 'Explore the tarot library and view 22 different cards.', 'library', 'exploration', 'rare', 100,
  '{"activity_type": "cards_explored", "target": 22}', false, 8),

('Full Deck Explorer', 'View all 78 tarot cards in the library.', 'layers', 'exploration', 'epic', 300,
  '{"activity_type": "cards_explored", "target": 78}', false, 9);

-- ==========================================
-- MASTERY CATEGORY - Skill and Repetition
-- ==========================================

INSERT INTO achievements (name, description, icon_name, category, rarity, xp_reward, unlock_condition, is_premium_only, sort_order) VALUES
('Apprentice Reader', 'Complete 10 tarot readings and hone your intuition.', 'eye', 'mastery', 'common', 50,
  '{"activity_type": "reading_complete", "target": 10}', false, 1),

('Seasoned Reader', 'Complete 50 tarot readings as your skills deepen.', 'sparkles', 'mastery', 'rare', 150,
  '{"activity_type": "reading_complete", "target": 50}', false, 2),

('Master Reader', 'Complete 100 tarot readings and achieve true mastery.', 'wand-2', 'mastery', 'epic', 300,
  '{"activity_type": "reading_complete", "target": 100}', false, 3),

('Oracle Vision', 'Complete 500 tarot readings - you have become the oracle.', 'crown', 'mastery', 'legendary', 1000,
  '{"activity_type": "reading_complete", "target": 500}', false, 4),

('Reflective Mind', 'Write 10 journal entries and deepen self-awareness.', 'book-open', 'mastery', 'common', 50,
  '{"activity_type": "journal_entry", "target": 10}', false, 5),

('Deep Thinker', 'Write 50 journal entries exploring your inner world.', 'brain', 'mastery', 'rare', 150,
  '{"activity_type": "journal_entry", "target": 50}', false, 6),

('Chronicler', 'Write 100 journal entries - your story unfolds beautifully.', 'scroll', 'mastery', 'epic', 300,
  '{"activity_type": "journal_entry", "target": 100}', false, 7),

('Ritual Devotee', 'Complete 25 daily rituals with mindful presence.', 'sunrise', 'mastery', 'common', 75,
  '{"activity_type": "ritual_complete", "target": 25}', false, 8),

('Ritual Master', 'Complete 100 daily rituals - the practice is now part of you.', 'sun', 'mastery', 'rare', 200,
  '{"activity_type": "ritual_complete", "target": 100}', false, 9),

('Celtic Cross Adept', 'Complete 10 Celtic Cross readings for deep insight.', 'compass', 'mastery', 'rare', 150,
  '{"activity_type": "celtic_cross_complete", "target": 10}', true, 10);

-- ==========================================
-- DEDICATION CATEGORY - Streaks and Consistency
-- ==========================================

INSERT INTO achievements (name, description, icon_name, category, rarity, xp_reward, unlock_condition, is_premium_only, sort_order) VALUES
('Week Warrior', 'Maintain a 7-day streak and build your spiritual discipline.', 'flame', 'dedication', 'common', 100,
  '{"activity_type": "streak_achieved", "target": 7}', false, 1),

('Fortnight Focus', 'Achieve a 14-day streak of consistent practice.', 'zap', 'dedication', 'common', 150,
  '{"activity_type": "streak_achieved", "target": 14}', false, 2),

('Monthly Mystic', 'Reach a 30-day streak - your dedication inspires.', 'moon', 'dedication', 'rare', 500,
  '{"activity_type": "streak_achieved", "target": 30}', false, 3),

('Seasonal Sage', 'Maintain a 90-day streak through an entire season.', 'leaf', 'dedication', 'epic', 1500,
  '{"activity_type": "streak_achieved", "target": 90}', false, 4),

('Century Seeker', 'Achieve a legendary 100-day streak of devotion.', 'trophy', 'dedication', 'epic', 2000,
  '{"activity_type": "streak_achieved", "target": 100}', false, 5),

('Eternal Flame', 'Maintain a 365-day streak - a full year of dedication!', 'infinity', 'dedication', 'legendary', 5000,
  '{"activity_type": "streak_achieved", "target": 365}', false, 6),

('Early Riser', 'Complete 10 rituals before 9 AM - embrace the dawn.', 'sunrise', 'dedication', 'common', 50,
  '{"activity_type": "morning_ritual", "target": 10}', false, 7),

('Night Owl', 'Complete 10 rituals after 9 PM - embrace the moonlight.', 'moon-star', 'dedication', 'common', 50,
  '{"activity_type": "evening_ritual", "target": 10}', false, 8),

('Weekend Warrior', 'Complete rituals on 10 different weekends.', 'calendar', 'dedication', 'rare', 100,
  '{"activity_type": "weekend_ritual", "target": 10}', false, 9);

-- ==========================================
-- MILESTONES CATEGORY - Level and Rank Progression
-- ==========================================

INSERT INTO achievements (name, description, icon_name, category, rarity, xp_reward, unlock_condition, is_premium_only, sort_order) VALUES
('Rising Star', 'Reach Level 5 and begin your ascent.', 'trending-up', 'milestones', 'common', 50,
  '{"activity_type": "level_reached", "target": 5}', false, 1),

('Climbing High', 'Reach Level 10 as your journey continues.', 'mountain', 'milestones', 'common', 75,
  '{"activity_type": "level_reached", "target": 10}', false, 2),

('Breaking Through', 'Reach Level 20 and discover new horizons.', 'rocket', 'milestones', 'rare', 100,
  '{"activity_type": "level_reached", "target": 20}', false, 3),

('Apprentice Awakened', 'Achieve the Apprentice Seeker rank.', 'award', 'milestones', 'rare', 100,
  '{"activity_type": "rank_achieved", "target": 1, "rank": "Apprentice Seeker"}', false, 4),

('Adept Ascended', 'Achieve the Adept Seeker rank.', 'shield', 'milestones', 'epic', 250,
  '{"activity_type": "rank_achieved", "target": 1, "rank": "Adept Seeker"}', false, 5),

('Master Manifestor', 'Achieve the Master Seeker rank.', 'gem', 'milestones', 'epic', 500,
  '{"activity_type": "rank_achieved", "target": 1, "rank": "Master Seeker"}', false, 6),

('Oracle Achieved', 'Reach the legendary Oracle Seeker rank.', 'crown', 'milestones', 'legendary', 1000,
  '{"activity_type": "rank_achieved", "target": 1, "rank": "Oracle Seeker"}', false, 7),

('XP Collector', 'Earn a total of 10,000 XP through your activities.', 'coins', 'milestones', 'rare', 200,
  '{"activity_type": "total_xp", "target": 10000}', false, 8),

('XP Legend', 'Earn an incredible 50,000 total XP.', 'gem', 'milestones', 'legendary', 500,
  '{"activity_type": "total_xp", "target": 50000}', false, 9),

('Level 50 Club', 'Reach the prestigious Level 50.', 'badge', 'milestones', 'legendary', 750,
  '{"activity_type": "level_reached", "target": 50}', false, 10);

-- ==========================================
-- SPECIAL CATEGORY - Unique and Hidden
-- ==========================================

INSERT INTO achievements (name, description, icon_name, category, rarity, xp_reward, unlock_condition, is_premium_only, is_hidden, sort_order) VALUES
('Cosmic Birthday', 'Use the app on your birthday and receive celestial blessings.', 'cake', 'special', 'rare', 200,
  '{"activity_type": "birthday_login", "target": 1}', false, false, 1),

('Full Moon Reader', 'Complete a tarot reading during a full moon.', 'moon', 'special', 'rare', 150,
  '{"activity_type": "full_moon_reading", "target": 1}', false, false, 2),

('New Beginnings', 'Complete a reading on New Years Day.', 'sparkles', 'special', 'rare', 150,
  '{"activity_type": "new_year_reading", "target": 1}', false, false, 3),

('Premium Patron', 'Upgrade to premium and unlock your full potential.', 'crown', 'special', 'epic', 500,
  '{"activity_type": "premium_upgrade", "target": 1}', true, false, 4),

('Zodiac Scholar', 'Read about all 12 zodiac signs in the compatibility section.', 'circle-dot', 'special', 'rare', 150,
  '{"activity_type": "zodiac_signs_viewed", "target": 12}', false, false, 5),

('Card Collector', 'Save 25 different tarot readings to your collection.', 'bookmark', 'special', 'rare', 150,
  '{"activity_type": "reading_saved", "target": 25}', false, false, 6),

('Night Seeker', 'Complete a reading between midnight and 3 AM.', 'moon-star', 'special', 'rare', 100,
  '{"activity_type": "witching_hour_reading", "target": 1}', false, true, 7),

('Lucky Seven', 'Draw The Chariot card 7 times across your readings.', 'trophy', 'special', 'epic', 200,
  '{"activity_type": "specific_card_drawn", "target": 7, "card": "The Chariot"}', false, true, 8),

('Tower Moment', 'Draw The Tower card - sometimes destruction brings renewal.', 'building-2', 'special', 'rare', 75,
  '{"activity_type": "specific_card_drawn", "target": 1, "card": "The Tower"}', false, true, 9),

('Fools Journey', 'Draw The Fool card 3 times - embrace new beginnings.', 'smile', 'special', 'rare', 100,
  '{"activity_type": "specific_card_drawn", "target": 3, "card": "The Fool"}', false, true, 10);
