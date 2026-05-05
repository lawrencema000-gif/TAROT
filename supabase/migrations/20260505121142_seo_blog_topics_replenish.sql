-- ============================================================================
-- SEO blog topics — replenish queue (2026-05-05)
-- ============================================================================
-- The daily-seo-blog-generator pulls one row per day from
-- public.seo_blog_topics WHERE used_at IS NULL. The original 2026-04-26 seed
-- of ~72 topics + the crystals hub addition were exhausted by 2026-04-26
-- (last published_at on blog_posts), and the queue has been empty since
-- (cron fires daily but throws QUEUE_EMPTY → silent failure).
--
-- This migration adds 30 fresh evergreen topics covering the same
-- categories the app supports, so the queue has another ~30 days of runway.
-- Briefs follow the existing house style: concise, keyword-honest, evergreen.
-- ============================================================================

INSERT INTO public.seo_blog_topics (category, topic, brief, keyword, related_keywords, priority) VALUES

-- ─── Tarot card (Minor Arcana deep dives — high search volume) ─────
('tarot-card', 'Ace of Cups — Emotional New Beginnings', 'The Ace of Cups as a fresh emotional opening — new love, creative awakening, spiritual receptivity. Cover symbolism (the dove, five streams, lotus), upright vs reversed, and how it shows up in love/career/spiritual readings.', 'ace of cups meaning', ARRAY['ace of cups reversed', 'ace of cups love', 'ace of cups feelings'], 150),
('tarot-card', 'Three of Swords — Heartbreak and What Comes After', 'The Three of Swords as the moment grief breaks through, not as a permanent state. Symbolism (storm clouds, three blades, heart), upright vs reversed, when it advises sitting with pain vs moving through it.', 'three of swords meaning', ARRAY['three of swords love', 'three of swords reversed', 'three of swords heartbreak'], 150),
('tarot-card', 'Ten of Pentacles — Legacy, Family, and Long Wealth', 'The Ten of Pentacles as established abundance, generational stability, family legacy. Upright vs reversed, the elderly figure and the dogs, what it advises in money/career readings.', 'ten of pentacles meaning', ARRAY['ten of pentacles reversed', 'ten of pentacles love', 'ten of pentacles family'], 140),
('tarot-card', 'Knight of Wands — Bold Moves and Burning Out', 'The Knight of Wands as charging passion, the rush of inspiration that risks self-immolation. Symbolism, reversed (delays, frustration), when it''s a green light vs a warning.', 'knight of wands meaning', ARRAY['knight of wands reversed', 'knight of wands love', 'knight of wands as a person'], 130),
('tarot-card', 'Two of Pentacles — Juggling Without Dropping', 'The Two of Pentacles as balance under pressure, financial juggling, and adaptive flow. Upright/reversed, the figure''s lemniscate, what to drop when overwhelmed.', 'two of pentacles meaning', ARRAY['two of pentacles reversed', 'two of pentacles work life balance', 'two of pentacles money'], 130),
('tarot-card', 'The Star — Hope After the Tower', 'The Star as quiet healing after upheaval, faith renewed, the star of guidance. Symbolism (the kneeling figure, two pitchers, the bird), reversed, advice it offers.', 'the star tarot meaning', ARRAY['the star reversed', 'the star love', 'the star healing'], 160),
('tarot-card', 'Page of Cups — Whimsical Messages and Inner Child', 'The Page of Cups as creative impulse, intuitive messages, the artist''s inner child. The fish in the chalice, what it signals in love (a tender admirer or a tender longing), reversed meaning.', 'page of cups meaning', ARRAY['page of cups reversed', 'page of cups love', 'page of cups message'], 130),
('tarot-card', 'Five of Pentacles — Hard Times and Hidden Help', 'The Five of Pentacles as material hardship paired with overlooked support (the lit window). Symbolism, upright vs reversed, when it''s about money and when it''s about isolation.', 'five of pentacles meaning', ARRAY['five of pentacles reversed', 'five of pentacles love', 'five of pentacles loss'], 130),

-- ─── Tarot spreads (people search for specific spreads constantly) ─
('tarot-spread', 'The 3-Card Past-Present-Future Spread', 'The classic 3-card spread for general readings. How to lay it out, how to interpret each position, sample reading walkthrough, and when to use it.', '3 card tarot spread', ARRAY['past present future spread', 'three card tarot reading', 'simple tarot spread'], 180),
('tarot-spread', 'Celtic Cross — The Ten-Card Master Spread', 'A complete walkthrough of the Celtic Cross — what each of the ten positions represents, how to read the cross + staff, and a sample reading. The deepest single spread in tarot.', 'celtic cross tarot spread', ARRAY['celtic cross meaning', 'celtic cross positions', '10 card tarot reading'], 170),
('tarot-spread', 'Yes-or-No Tarot — How to Get a Real Answer', 'Three reliable yes/no tarot methods (single card, three-card, full deck). Which cards lean yes, which lean no, and why "maybe" is sometimes the most honest answer.', 'yes or no tarot', ARRAY['tarot yes or no spread', 'yes no tarot single card', 'yes no tarot accuracy'], 160),

-- ─── Zodiac signs (behavioral patterns — very searched) ────────────
('zodiac', 'Why Scorpios Get Misunderstood', 'Real talk on Scorpio energy — the intensity, the loyalty, the rumored "obsession" tropes, and what scorpios actually want from love and friendship. Cuts past the cliches.', 'scorpio personality traits', ARRAY['scorpio zodiac sign', 'scorpio in love', 'understanding scorpios'], 150),
('zodiac', 'Capricorn Career Path: Slow Build, Long Reward', 'Why Capricorns thrive in long arcs and structures, careers where they shine, and how to spot the difference between healthy ambition and Capricorn burnout.', 'capricorn career', ARRAY['capricorn personality', 'capricorn work style', 'capricorn jobs'], 140),
('zodiac', 'Pisces in Love — The Romantic Who Forgets Themselves', 'Pisces love patterns: empathy as gift and trap, why pisces partners sometimes lose themselves, and how to love a pisces without overwhelming them.', 'pisces in love', ARRAY['pisces compatibility', 'pisces relationships', 'dating a pisces'], 140),
('zodiac', 'Gemini Friendship — Why Two People Are Always Better Than One', 'Gemini''s curiosity-driven friendships, what it actually means to be "two-faced" (it''s not what you think), and how to be the friend a gemini stays loyal to.', 'gemini friendship', ARRAY['gemini personality', 'gemini friend', 'gemini compatibility friendship'], 130),
('zodiac', 'Aries: First to Move, Last to Apologize', 'Aries as initiator energy — the impulsive bravery, the temper, the genuine warmth most people miss. How to work with an aries instead of against them.', 'aries personality', ARRAY['aries traits', 'aries in love', 'aries anger'], 140),

-- ─── Horoscope / transits (evergreen aspects) ───────────────────────
('horoscope', 'Mercury Retrograde — What''s Real and What''s Hype', 'Stripping the panic from Mercury Retrograde. What actually happens (and doesn''t), how it shows up in tech/communication/travel, and how to actually plan around it.', 'mercury retrograde meaning', ARRAY['mercury retrograde 2026', 'mercury retrograde effects', 'mercury retrograde survival'], 170),
('horoscope', 'Saturn Return — Your Late-20s Reckoning', 'Why your late twenties feel like an existential reset. The astrology of saturn return, what it tends to break and rebuild, and how to use it intentionally.', 'saturn return meaning', ARRAY['saturn return age', 'saturn return relationships', 'saturn return career'], 170),
('horoscope', 'Full Moon Manifestation — A Practical Guide', 'How full moons actually fit into manifestation work — release vs intention-setting, which lunar mansions support which goals, a 4-step practice to try.', 'full moon manifestation', ARRAY['full moon ritual', 'full moon meaning', 'full moon energy'], 160),
('horoscope', 'New Moon in Each Sign — A Year of Resets', 'How each monthly new moon flavors the next four weeks based on its zodiac sign. Quick guide to riding the new-moon cycle for goal-setting throughout the year.', 'new moon in zodiac signs', ARRAY['new moon meaning', 'new moon ritual by sign', 'new moon intentions'], 140),

-- ─── Dream interpretation (high-volume search) ──────────────────────
('dream', 'Dreams About Teeth Falling Out — What They Actually Mean', 'Dreams about losing teeth are one of the most common archetypal dreams. What jungian and modern dream analysis say, when it''s about anxiety vs about life transition.', 'dreams about teeth falling out', ARRAY['teeth falling out dream meaning', 'losing teeth dream', 'tooth dream interpretation'], 180),
('dream', 'Flying in Dreams — Freedom or Avoidance?', 'The two main schools on flying dreams — jungian (transcendence, ego release) and behaviourist (control, freedom desire). When it''s a healthy signal vs avoidance.', 'flying dream meaning', ARRAY['dreams about flying', 'flying in dream interpretation', 'dream of flying'], 160),
('dream', 'Recurring Dreams — Why Your Mind Keeps Replaying', 'Why some dreams repeat for years. What unresolved material the psyche tends to surface, when to take it seriously, and a journaling practice for breaking the loop.', 'recurring dreams meaning', ARRAY['why do i have recurring dreams', 'recurring dream interpretation', 'same dream repeating'], 150),

-- ─── MBTI (specific types — very searched) ──────────────────────────
('mbti', 'INFJ — The Empath Who Burns Out', 'Why INFJs feel everything and how to spot the burnout pattern early. Real-life examples, healthy boundaries, and the tarot archetype that matches the type.', 'infj personality', ARRAY['infj traits', 'infj burnout', 'infj relationships'], 140),
('mbti', 'ENTP — Why Ideas Beat Execution (and How to Fix It)', 'The ENTP''s idea-machine brain and the follow-through problem. Strategies that actually work for ENTPs, and the relationships that support their pattern.', 'entp personality', ARRAY['entp traits', 'entp follow through', 'entp careers'], 130),
('mbti', 'ISTJ — The Quiet Backbone', 'Why ISTJs are the most underestimated personality type. How they actually express care, what burns them out (it''s not what people think), and how to work with one.', 'istj personality', ARRAY['istj traits', 'istj relationships', 'istj at work'], 130),

-- ─── Numerology ─────────────────────────────────────────────────────
('numerology', 'Life Path Number 7 — The Seeker', 'Life Path 7 as the introvert philosopher / spiritual investigator. How to calculate, what 7 energy actually means in career and love, and the shadow side.', 'life path number 7', ARRAY['life path 7 meaning', 'life path 7 career', 'numerology 7'], 140),
('numerology', 'Angel Number 1111 — Beyond the Trend', 'What 1111 has historically meant across systems, what current angel-number culture has done to (and for) it, and how to read 1111 sightings without spiraling.', 'angel number 1111 meaning', ARRAY['1111 meaning', 'angel number 1111 love', 'why do i see 1111'], 160),

-- ─── Lunar / moon phases ────────────────────────────────────────────
('lunar', 'The 8 Moon Phases — A Practical Almanac', 'A walk through new moon, waxing crescent, first quarter, waxing gibbous, full moon, waning gibbous, last quarter, waning crescent. What each phase asks of you energetically.', 'moon phases meaning', ARRAY['moon phases explained', '8 moon phases', 'moon phase rituals'], 150),

-- ─── Bazi (Four Pillars Chinese astrology) ──────────────────────────
('bazi', 'What Is BaZi? The Beginner''s Guide to Four Pillars', 'BaZi (八字) explained for total beginners — what the Four Pillars represent (year, month, day, hour), what a Day Master is, and what BaZi can tell you that western astrology can''t.', 'what is bazi', ARRAY['bazi meaning', 'four pillars of destiny', 'chinese astrology bazi'], 150),

-- ─── Feng Shui ──────────────────────────────────────────────────────
('feng-shui', 'Feng Shui Bedroom — The 7 Rules That Actually Matter', 'Cut through the over-prescribed feng shui internet noise. The seven actual bedroom rules that classical practitioners agree on (mirror placement, bed position, color, clutter, electronics, nightstand symmetry, door alignment).', 'feng shui bedroom', ARRAY['feng shui bedroom rules', 'feng shui bedroom layout', 'feng shui bed position'], 150);
