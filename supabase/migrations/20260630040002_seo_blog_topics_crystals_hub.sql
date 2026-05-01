-- ─────────────────────────────────────────────────────────────────────
-- Add `crystals` to the seo_blog_topics category whitelist + seed 24
-- topics targeting the new /crystals, /numerology, /glossary hubs that
-- shipped in dac1144 but never had blog-generator topics queued.
--
-- Priority 190 — slots between the priority-200 evergreen flagships
-- (Tower / Fool / Lovers / dream-snakes etc) and the priority-180 tier
-- so the daily generator processes flagships first, then crystals, then
-- the rest of the queue.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.seo_blog_topics
  DROP CONSTRAINT IF EXISTS seo_blog_topics_category_check;

ALTER TABLE public.seo_blog_topics
  ADD CONSTRAINT seo_blog_topics_category_check CHECK (
    category IN (
      'tarot-card',  'tarot-spread',  'zodiac',  'horoscope',
      'dream',       'mbti',          'human-design',
      'bazi',        'feng-shui',     'lunar',
      'numerology',  'crystals',      'general'
    )
  );

-- ─── Crystals (10 — high commercial intent, mid-low difficulty) ─────
INSERT INTO public.seo_blog_topics (category, topic, brief, keyword, related_keywords, priority) VALUES
  ('crystals', 'amethyst crystal meaning and uses',
   'Cover spiritual properties, chakras (crown, third eye), how to cleanse, how to use in meditation. Honest about the difference between energetic intent and physical mineral properties.',
   'amethyst meaning',
   ARRAY['amethyst properties','amethyst uses','amethyst chakra','how to cleanse amethyst'], 190),
  ('crystals', 'rose quartz meaning and how to use it',
   'The classic love stone. Heart chakra. Self-love practices, partner harmony, releasing grief. Cleansing methods. Honest scope: emotional support practice, not relationship cure.',
   'rose quartz meaning',
   ARRAY['rose quartz properties','rose quartz love','heart chakra crystals','how to use rose quartz'], 190),
  ('crystals', 'clear quartz meaning and uses',
   'The master healer. Amplifies intent. Programming a clear quartz. Pairing with other stones. Cleansing under moonlight or running water.',
   'clear quartz meaning',
   ARRAY['clear quartz uses','quartz properties','master healer crystal','programming crystals'], 190),
  ('crystals', 'black tourmaline for protection',
   'Protective grounding stone. Shielding from negative energy, EMF buffering claims (cite the science honestly — symbolic not measurable), placement at home entrances.',
   'black tourmaline meaning',
   ARRAY['black tourmaline protection','grounding crystals','crystals for negative energy','black tourmaline uses'], 190),
  ('crystals', 'citrine meaning and abundance work',
   'The merchants stone. Solar plexus, confidence, manifestation work. Distinguishing real citrine from heated amethyst. How to use in wealth corner alongside Feng Shui.',
   'citrine meaning',
   ARRAY['citrine properties','citrine uses','crystals for abundance','citrine vs heated amethyst'], 190),
  ('crystals', 'selenite cleansing and high vibration',
   'The self-cleansing crystal. How to cleanse other stones with selenite. Crown chakra connection. Why selenite shouldn''t get wet.',
   'selenite meaning',
   ARRAY['selenite uses','how to cleanse crystals','selenite charging plate','crown chakra crystals'], 190),
  ('crystals', 'obsidian meaning and shadow work',
   'Volcanic glass. Truth-revealing, shadow work, grounding. Different obsidian varieties (black, snowflake, mahogany, rainbow). When to step away from obsidian.',
   'obsidian meaning',
   ARRAY['obsidian properties','black obsidian uses','crystals for shadow work','snowflake obsidian'], 190),
  ('crystals', 'lapis lazuli for truth and communication',
   'Throat chakra, third eye. Ancient Egyptian use. Pairing with citrine for confidence + truth-telling. How to spot dyed howlite versus real lapis.',
   'lapis lazuli meaning',
   ARRAY['lapis lazuli properties','throat chakra crystals','crystals for confidence','real vs fake lapis lazuli'], 190),
  ('crystals', 'moonstone for intuition and feminine energy',
   'Lunar resonance. Sacred feminine. Intuition, dreams, fertility folk-tradition. Pairing with full moon rituals already covered on /lunar pages.',
   'moonstone meaning',
   ARRAY['moonstone properties','rainbow moonstone','crystals for intuition','crystals for women'], 190),
  ('crystals', 'crystals for anxiety: 7 stones that actually help',
   'Listicle. Each stone gets a paragraph: how to use, where to place, the practice attached. Honest framing — supportive ritual, not medical treatment.',
   'crystals for anxiety',
   ARRAY['anxiety crystals','calming crystals','crystals for sleep','grounding stones'], 190),

-- ─── Numerology (8 — life path / angel numbers, very high search volume) ─
  ('numerology', 'life path number meaning explained',
   'How to calculate from birth date (worked example). What each life path 1-9 + master numbers 11/22/33 mean at a glance. Link to /numerology/[number] leaf pages already on site.',
   'life path number',
   ARRAY['how to calculate life path number','life path number meanings','numerology life path','master numbers'], 190),
  ('numerology', 'life path number 7 meaning',
   'The seeker. Career, relationships, growth edges. Famous 7s. Soul urge + destiny pairings.',
   'life path 7',
   ARRAY['life path number 7','7 life path meaning','numerology 7','seeker number'], 190),
  ('numerology', 'life path number 9 meaning',
   'The humanitarian. Closure energy, service work, common emotional patterns. Famous 9s.',
   'life path 9',
   ARRAY['life path number 9','9 life path meaning','numerology 9','humanitarian number'], 190),
  ('numerology', 'angel number 1111 meaning',
   'Why people see it. Common interpretations across spiritual traditions. What to journal when it appears. Relationship + career nuance.',
   'angel number 1111',
   ARRAY['1111 meaning','seeing 1111','what does 1111 mean','11:11 meaning'], 190),
  ('numerology', 'angel number 333 meaning',
   'Triple 3 — creativity, ascended masters, alignment. When it shows up at thresholds. Honest interpretation guide.',
   'angel number 333',
   ARRAY['333 meaning','seeing 333','what does 333 mean','333 spiritual meaning'], 190),
  ('numerology', 'angel number 444 meaning',
   'Stability, foundation, support from beyond. Career + relationship readings. Difference between repeating 444 and seeing it once.',
   'angel number 444',
   ARRAY['444 meaning','seeing 444','what does 444 mean','444 angel meaning'], 190),
  ('numerology', 'destiny number versus life path number',
   'Common confusion. How destiny (expression) is calculated from name versus life path from date. Worked example for both.',
   'destiny number vs life path',
   ARRAY['destiny number meaning','expression number','numerology calculation','soul urge number'], 190),
  ('numerology', 'numerology compatibility: pairing life path numbers',
   'Compatibility grid for the 9 life paths. Strong / challenging pairings. Honest framing — heuristic, not deterministic. Cross-link to Partner Compatibility page.',
   'numerology compatibility',
   ARRAY['life path compatibility','numerology love compatibility','life path number relationships','numerology and love'], 190),

-- ─── Glossary deep-dives (6 — high informational intent, low difficulty) ─
  ('general', 'what is bazi: a beginners guide',
   'The Four Pillars of Destiny explained without jargon. How a chart is built (year, month, day, hour pillars). Day master concept. CTA to free Bazi reading on tarotlife.',
   'what is bazi',
   ARRAY['bazi explained','four pillars of destiny','chinese astrology','bazi for beginners'], 190),
  ('general', 'what is human design',
   'The 5 types (Manifestor, Generator, MG, Projector, Reflector). Strategy + Authority. How a chart is computed (real ephemeris, 88 day arc). CTA to free HD chart.',
   'what is human design',
   ARRAY['human design explained','human design types','human design strategy','human design authority'], 190),
  ('general', 'tarot vs oracle cards: whats the difference',
   '78-card structured deck (tarot) vs free-form decks (oracle). When each is better. Famous decks of each type. Honest about overlap.',
   'tarot vs oracle cards',
   ARRAY['oracle cards meaning','difference between tarot and oracle','types of divination decks','best oracle decks'], 190),
  ('general', 'what is the i-ching: ancient chinese divination explained',
   'The Book of Changes. 64 hexagrams. Coin toss method (3-coin) versus yarrow stalks. King Wen sequence. Cross-link to free I-Ching reading.',
   'what is iching',
   ARRAY['iching explained','book of changes','64 hexagrams','i ching divination'], 190),
  ('general', 'what is mbti: the 16 personality types explained',
   'Briggs-Myers framework. The 4 dichotomies (E/I, S/N, T/F, J/P). 16 types at a glance. Free MBTI test offered on tarotlife.',
   'what is mbti',
   ARRAY['mbti explained','16 personality types','myers briggs','personality test'], 190),
  ('general', 'how to do a tarot reading for yourself',
   'Step-by-step beginner guide: deck choice, shuffle, question framing, 3-card spread, basic interpretation. Common pitfalls. CTA to free reading.',
   'how to do a tarot reading',
   ARRAY['tarot for beginners','self tarot reading','3 card tarot spread','how to read tarot'], 190);

-- ─────────────────────────────────────────────────────────────────────
-- Result: queue grows from 71 → 95 unused topics. Daily generator now
-- produces ~3 months of content covering crystals + numerology +
-- glossary in addition to the existing tarot / dream / zodiac mix.
-- All drafted with gpt-5 per the migration upstream of this one.
-- ─────────────────────────────────────────────────────────────────────
