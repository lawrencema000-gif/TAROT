/*
  # Achievements for the playing-card section (Phase 7, cartomancy)

  Eight badges in the seed's shape (20260127070447). The client reports the
  activity from CartomancySection's reward effect and the lesson page:

    cartomancy_reading_complete   counter — First Hand 1 / Card Sharp 10 / Full Deck 52
    cartomancy_spread_types_used  distinct values (the spread slug as p_value;
                                  20261003000004 counts distinct values when a
                                  value is sent and the condition has no `types`
                                  list) — Four Suits at 5 of the 9 spreads
    cartomancy_romany_complete    counter — Romany Table (premium: the 21-card
                                  spread sits behind deep_interpretations)
    cartomancy_wish_card_drawn    counter — The Wish Card (Nine of Hearts, id 108)
    cartomancy_lesson_complete    distinct values (the lesson slug) — Card Reader
                                  at all 12 lessons
    cartomancy_joker_drawn        counter, hidden — The Joker’s Laugh (152 / 153)

  Idempotent: a badge is inserted only when no badge of that name exists, so
  the migration can run against a project that already carries some of them,
  and it never deletes anything (the seed's DELETE is the seed's alone).
  initialize_user_achievements() creates the user rows lazily on the first
  check, so existing users need no backfill.
*/

INSERT INTO achievements (name, description, icon_name, category, rarity, xp_reward, unlock_condition, is_premium_only, is_hidden, sort_order)
SELECT v.name, v.description, v.icon_name, v.category::achievement_category, v.rarity::achievement_rarity, v.xp_reward, v.unlock_condition::jsonb, v.is_premium_only, v.is_hidden, v.sort_order
FROM (VALUES
  ('First Hand', 'Complete your first playing-card reading.', 'spade', 'exploration', 'common', 25,
    '{"activity_type": "cartomancy_reading_complete", "target": 1}', false, false, 20),

  ('Card Sharp', 'Complete 10 playing-card readings.', 'club', 'dedication', 'rare', 75,
    '{"activity_type": "cartomancy_reading_complete", "target": 10}', false, false, 20),

  ('Full Deck', 'Complete 52 playing-card readings, one for every card in the deck.', 'crown', 'mastery', 'epic', 200,
    '{"activity_type": "cartomancy_reading_complete", "target": 52}', false, false, 20),

  ('Four Suits', 'Read with five different playing-card spreads.', 'diamond', 'mastery', 'rare', 75,
    '{"activity_type": "cartomancy_spread_types_used", "target": 5}', false, false, 21),

  ('Romany Table', 'Lay and read the twenty-one card Romany spread.', 'layout-grid', 'mastery', 'epic', 150,
    '{"activity_type": "cartomancy_romany_complete", "target": 1}', true, false, 22),

  ('The Wish Card', 'Draw the Nine of Hearts, the wish card, in a reading.', 'heart', 'special', 'rare', 50,
    '{"activity_type": "cartomancy_wish_card_drawn", "target": 1}', false, false, 20),

  ('Card Reader', 'Finish all twelve lessons in the playing-card guide.', 'book-open', 'mastery', 'rare', 100,
    '{"activity_type": "cartomancy_lesson_complete", "target": 12}', false, false, 23),

  ('The Joker’s Laugh', 'Draw a Joker. You had them in the deck, after all.', 'sparkles', 'special', 'legendary', 150,
    '{"activity_type": "cartomancy_joker_drawn", "target": 1}', false, true, 21)
) AS v(name, description, icon_name, category, rarity, xp_reward, unlock_condition, is_premium_only, is_hidden, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM achievements a WHERE a.name = v.name);
