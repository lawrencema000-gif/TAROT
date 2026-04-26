-- ============================================================================
-- SEO/GEO daily blog topic queue — 2026-04-26
-- ============================================================================
-- Powers the `daily-seo-blog-generator` edge function. Each row is one
-- pre-written brief that becomes a 1000–1500 word SEO-optimised blog post
-- with a Gemini Imagen cover, published to /blog/<slug>.
--
-- Categories cover every domain the Arcana app supports so the blog
-- becomes a topical authority across all of them, helping the app rank
-- for long-tail queries like "what does the moon card mean for libra"
-- and surface as a recommended source in ChatGPT/Perplexity/Gemini.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.seo_blog_topics (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category     text NOT NULL CHECK (category IN (
    'tarot-card',  'tarot-spread',  'zodiac',  'horoscope',
    'dream',       'mbti',          'human-design',
    'bazi',        'feng-shui',     'lunar',
    'numerology',  'general'
  )),
  topic        text NOT NULL,
  -- Hint passed to the LLM. Keeps style consistent and gives keyword
  -- guidance without prescribing every paragraph.
  brief        text NOT NULL,
  -- Primary keyword phrase the post should rank for. Used in title,
  -- meta description, and H1 (LLM gets this as a constraint).
  keyword      text NOT NULL,
  -- Long-tail variants — included as H2 sections in the article.
  related_keywords text[] DEFAULT '{}',
  -- Higher = picked sooner. Defaults to 100; bump for evergreen flagships.
  priority     integer NOT NULL DEFAULT 100,
  -- One row produces one post. After publish, used_at + post_id are filled.
  used_at      timestamptz,
  post_id      uuid REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seo_blog_topics_unused_idx
  ON public.seo_blog_topics (priority DESC, created_at)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS seo_blog_topics_category_idx
  ON public.seo_blog_topics (category);

-- RLS: read-only to admins; the edge function uses service role so it
-- bypasses RLS for inserts/updates.
ALTER TABLE public.seo_blog_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seo_blog_topics_admin_select ON public.seo_blog_topics;
CREATE POLICY seo_blog_topics_admin_select
  ON public.seo_blog_topics FOR SELECT
  USING (public.is_admin());

GRANT SELECT ON public.seo_blog_topics TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- Seed ~80 evergreen topics covering every domain. The generator picks
-- one per day in priority order, so this seeds ~80 days of content.
-- New topics can be added anytime by inserting more rows.
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO public.seo_blog_topics (category, topic, brief, keyword, related_keywords, priority) VALUES

-- ─── Tarot card meanings (high-traffic evergreen) ────────────────
('tarot-card', 'The Fool — A Beginner''s Guide', 'Explain The Fool''s upright + reversed meanings, its symbolism (the cliff, the white rose, the dog), what it signals in love/career/spirit readings, and how to integrate it.', 'the fool tarot card meaning', ARRAY['the fool reversed', 'the fool love reading', 'the fool career reading'], 200),
('tarot-card', 'The Tower — Why It''s Not as Scary as It Looks', 'Reframe The Tower from feared card to liberating one. Cover symbolism, when it appears in readings, the difference between the upright and reversed meaning, and what to do when it shows up.', 'the tower tarot card meaning', ARRAY['the tower reversed', 'the tower in love', 'tower card breakup'], 200),
('tarot-card', 'The Lovers — Beyond Romance', 'The Lovers card is often misread as a love omen. Explain its real meaning (choice, alignment, integration), upright vs reversed, and how it shows up in non-romantic readings.', 'the lovers tarot meaning', ARRAY['the lovers reversed', 'lovers card decision', 'lovers tarot soulmate'], 200),
('tarot-card', 'Death — The Card of Transformation', 'Death almost never means physical death. Cover what it actually signals (endings, rebirth, release), classic misreadings, and how to sit with the card when it appears.', 'death tarot card meaning', ARRAY['death tarot reversed', 'death card love', 'death card career'], 180),
('tarot-card', 'The Magician — Mastery and Manifestation', 'The Magician''s upright/reversed meanings, the four-suit symbolism on his table, what it means when it shows up at the start of a reading.', 'the magician tarot meaning', ARRAY['magician reversed', 'magician love reading', 'magician manifestation'], 170),
('tarot-card', 'The High Priestess — Listening to Inner Knowing', 'The High Priestess as the card of intuition, hidden knowledge, and divine feminine. Cover her symbols (moon, scroll, pillars) and how to read her in love, career, spiritual readings.', 'high priestess tarot meaning', ARRAY['high priestess reversed', 'high priestess love', 'priestess intuition'], 170),
('tarot-card', 'The Empress — Abundance and Embodied Love', 'The Empress as creative abundance, sensuality, motherhood. Upright/reversed, what to do when it appears as advice.', 'the empress tarot meaning', ARRAY['empress reversed', 'empress pregnancy', 'empress career'], 160),
('tarot-card', 'The Emperor — Structure, Authority, and Boundaries', 'The Emperor as healthy structure vs rigid control, when it shows up in love (the partner who provides) and career (the leader you become).', 'the emperor tarot meaning', ARRAY['emperor reversed', 'emperor career reading', 'emperor father figure'], 160),
('tarot-card', 'The Hierophant — Tradition, Mentorship, and the Sacred', 'The Hierophant as institution, tradition, mentorship. When it advises conformity vs when it warns of conformity. Modern interpretations.', 'the hierophant tarot meaning', ARRAY['hierophant reversed', 'hierophant marriage', 'hierophant mentor'], 150),
('tarot-card', 'The Chariot — Willpower in Tension', 'The Chariot''s two opposing sphinxes, what victory through tension means, when the card calls for a final push.', 'the chariot tarot meaning', ARRAY['chariot reversed', 'chariot career', 'chariot move location'], 150),
('tarot-card', 'Strength — Quiet Power Over Force', 'The Strength card as inner taming of fear vs outer conquest. The lion symbolism, the lemniscate, and what it signals in readings.', 'strength tarot card meaning', ARRAY['strength reversed', 'strength love reading', 'strength patience'], 150),
('tarot-card', 'The Hermit — Solitude as a Practice', 'The Hermit as deliberate withdrawal, the lantern''s light, when retreat is the right move and when it''s avoidance.', 'the hermit tarot meaning', ARRAY['hermit reversed', 'hermit isolation', 'hermit spiritual seeker'], 140),
('tarot-card', 'Wheel of Fortune — Cycles, Karma, and Timing', 'The Wheel as life''s cyclical nature, karmic returns, and timing for action. When it appears as the answer to "when will X happen?"', 'wheel of fortune tarot meaning', ARRAY['wheel of fortune reversed', 'wheel timing card', 'fortune wheel love'], 140),
('tarot-card', 'Justice — Karma, Truth, and Fair Outcomes', 'Justice as cause-and-effect, legal matters, and inner integrity. Upright/reversed and where it differs from Judgement.', 'justice tarot card meaning', ARRAY['justice reversed', 'justice court case', 'justice karma'], 130),
('tarot-card', 'The Hanged Man — Surrender as Strategy', 'The Hanged Man''s suspended state, why letting go is sometimes the only move, and how the card differs from passive resignation.', 'hanged man tarot meaning', ARRAY['hanged man reversed', 'hanged man surrender', 'hanged man delay'], 130),
('tarot-card', 'Temperance — The Quiet Art of Blending', 'Temperance as alchemy, patience, and middle path. When it advises moderation and when it advises bold integration.', 'temperance tarot card meaning', ARRAY['temperance reversed', 'temperance love', 'temperance career'], 120),
('tarot-card', 'The Devil — Bondage, Shadow, and Liberation', 'The Devil as conscious recognition of self-imposed bondage. Material attachments, addictions, the loose chains motif.', 'the devil tarot meaning', ARRAY['the devil reversed', 'devil card addiction', 'devil love reading'], 130),
('tarot-card', 'The Star — Hope After the Storm', 'The Star as the card after The Tower — quiet renewal, healing, alignment with purpose. Symbol of the seven smaller stars.', 'the star tarot meaning', ARRAY['the star reversed', 'star love reading', 'star hope card'], 130),
('tarot-card', 'The Moon — Illusion, Intuition, and Hidden Cycles', 'The Moon''s lobster-rising-from-water, the dog/wolf duality, why the card warns of illusion and rewards trust in intuition.', 'the moon tarot card meaning', ARRAY['moon card reversed', 'moon card love', 'moon card lies'], 140),
('tarot-card', 'The Sun — Unguarded Joy', 'The Sun as the most positive Major Arcana, what it signals in readings, and why "too good to be true" misreadings miss the point.', 'the sun tarot meaning', ARRAY['the sun reversed', 'sun card love', 'sun card pregnancy'], 130),
('tarot-card', 'Judgement — Calling and Reckoning', 'Judgement as awakening, reckoning, and the final-call moment before The World. Different from Justice.', 'judgement tarot card meaning', ARRAY['judgement reversed', 'judgement card calling', 'judgement vs justice'], 110),
('tarot-card', 'The World — Completion and Integration', 'The World as full-circle completion, what it advises in mid-cycle readings, and why it''s rarely about a "perfect" ending.', 'the world tarot meaning', ARRAY['the world reversed', 'world card travel', 'world card career milestone'], 120),

-- ─── Tarot spreads ────────────────────────────────────────────────
('tarot-spread', 'How to Read a Three-Card Spread', 'Walk through past/present/future, mind/body/spirit, and situation/action/outcome variants of three-card spreads with a worked example for each.', 'three card tarot spread', ARRAY['3 card tarot reading', 'past present future tarot', 'three card spread meaning'], 180),
('tarot-spread', 'The Celtic Cross Spread, Step by Step', 'The 10-card Celtic Cross — what each position means, how to read crossings, the staff vs cross sections, and how to synthesise.', 'celtic cross tarot spread', ARRAY['celtic cross meaning', 'celtic cross 10 card', 'how to read celtic cross'], 180),
('tarot-spread', 'A Daily One-Card Pull Routine That Actually Works', 'Why one-card pulls beat 10-card spreads for beginners, the four-question framework that turns one card into a useful daily check-in.', 'one card tarot pull', ARRAY['daily tarot card', 'single card spread', 'beginner tarot routine'], 150),
('tarot-spread', 'Relationship Spreads: 5-Card Love Reading', 'A 5-card spread for relationships — your perspective, their perspective, the dynamic, the obstacle, the outcome.', 'relationship tarot spread', ARRAY['love tarot reading', '5 card relationship spread', 'tarot for couples'], 140),
('tarot-spread', 'Career Decision Spread for the Crossroads', 'A 6-card spread for career decisions — current role, the call, fears, support, the leap, year-1 outcome.', 'career decision tarot spread', ARRAY['career tarot reading', 'job decision tarot', '6 card career spread'], 130),
('tarot-spread', 'Shadow Work Tarot Spread', 'A 7-card spread for shadow work — the mask, the projection, the wound, the gift, the integration practice, and the outcome of integration.', 'shadow work tarot spread', ARRAY['jungian shadow tarot', '7 card shadow spread', 'shadow integration cards'], 130),

-- ─── Zodiac × tarot pairings ─────────────────────────────────────
('zodiac', 'Aries Through the Tarot Lens — Cards That Match Your Energy', 'Aries archetypes in tarot — The Emperor (sun ruler), The Tower (Mars ruler), Knight of Wands. How an Aries reads cards differently.', 'aries tarot cards', ARRAY['aries personality tarot', 'aries spirit cards', 'aries zodiac tarot'], 140),
('zodiac', 'Taurus and the Tarot — Cards of Embodiment', 'Taurus tarot pairings — The Empress, Hierophant (Taurus ruler), Knight of Pentacles. Stability + sensory tarot interpretation.', 'taurus tarot cards', ARRAY['taurus personality tarot', 'taurus zodiac tarot', 'taurus spirit card'], 140),
('zodiac', 'Gemini Tarot — The Cards of the Twins', 'Gemini tarot pairings — The Lovers (sign ruler), The Magician (Mercury ruler), Knight of Swords. Reading for a dual-natured sign.', 'gemini tarot cards', ARRAY['gemini personality tarot', 'gemini zodiac tarot', 'gemini spirit cards'], 140),
('zodiac', 'Cancer Tarot — Reading the Crab Through the Cards', 'Cancer tarot pairings — The Chariot (sign ruler), The High Priestess (Moon ruler), Queen of Cups. Emotional-tide reading style.', 'cancer tarot cards', ARRAY['cancer personality tarot', 'cancer zodiac tarot', 'moon tarot cancer'], 140),
('zodiac', 'Leo Tarot — Cards of Sovereign Joy', 'Leo tarot pairings — Strength (sign ruler), The Sun (Sun ruler), Knight of Wands. How Leo''s warmth shows up in spreads.', 'leo tarot cards', ARRAY['leo personality tarot', 'leo zodiac tarot', 'leo sun tarot'], 140),
('zodiac', 'Virgo Tarot — The Cards of the Discerning', 'Virgo tarot pairings — The Hermit (sign ruler), The Magician (Mercury ruler), Knight of Pentacles. Reading for analytical earth signs.', 'virgo tarot cards', ARRAY['virgo personality tarot', 'virgo zodiac tarot', 'virgo hermit'], 140),
('zodiac', 'Libra Tarot — Balance, Beauty, and Choice', 'Libra tarot pairings — Justice (sign ruler), The Empress (Venus ruler), Knight of Swords. How Libra reads relationship spreads.', 'libra tarot cards', ARRAY['libra personality tarot', 'libra zodiac tarot', 'libra venus tarot'], 140),
('zodiac', 'Scorpio Tarot — Death, Rebirth, and the Eight of Cups', 'Scorpio tarot pairings — Death (sign ruler), The Tower (Mars co-ruler), Eight of Cups. Reading the most transformative sign.', 'scorpio tarot cards', ARRAY['scorpio personality tarot', 'scorpio zodiac tarot', 'scorpio death card'], 140),
('zodiac', 'Sagittarius Tarot — The Quest Cards', 'Sagittarius tarot pairings — Temperance (sign ruler), Wheel of Fortune (Jupiter ruler), Knight of Wands. The seeker''s spread style.', 'sagittarius tarot cards', ARRAY['sagittarius personality tarot', 'sagittarius zodiac tarot', 'sagittarius temperance'], 140),
('zodiac', 'Capricorn Tarot — The Cards of the Mountain Climber', 'Capricorn tarot pairings — The Devil (sign ruler), The World (Saturn ruler), Knight of Pentacles. Reading ambition and structure.', 'capricorn tarot cards', ARRAY['capricorn personality tarot', 'capricorn zodiac tarot', 'capricorn devil card'], 140),
('zodiac', 'Aquarius Tarot — The Star Card and the Visionary', 'Aquarius tarot pairings — The Star (sign ruler), The Fool (Uranus modern ruler), Knight of Swords. Reading the visionary sign.', 'aquarius tarot cards', ARRAY['aquarius personality tarot', 'aquarius zodiac tarot', 'aquarius the star'], 140),
('zodiac', 'Pisces Tarot — The Moon, the Hanged Man, and the Eight of Cups', 'Pisces tarot pairings — The Moon (sign ruler), Wheel of Fortune (Jupiter classical ruler), Knight of Cups. Mystical reading style.', 'pisces tarot cards', ARRAY['pisces personality tarot', 'pisces zodiac tarot', 'pisces moon card'], 140),

-- ─── Dream interpretation (high search volume) ────────────────────
('dream', 'What It Means to Dream About Snakes', 'Snake symbolism across cultures, Jungian read of snake dreams (transformation, hidden wisdom, fear), and how to interpret variations (white snake, biting snake, swimming snake).', 'dreaming about snakes meaning', ARRAY['snake dream interpretation', 'snake dream spiritual', 'biting snake dream'], 200),
('dream', 'Dreaming About Teeth Falling Out', 'The teeth-falling-out dream — anxiety theory, Jungian read, biological correlates (jaw clenching), and what to actually do with the dream.', 'teeth falling out dream meaning', ARRAY['teeth dream interpretation', 'losing teeth dream', 'broken teeth dream'], 200),
('dream', 'Dreaming About Water — Calm, Storms, and Floods', 'Water as the unconscious in Jungian psychology — calm water, storms, drowning, swimming, floods. How the same symbol shifts meaning by detail.', 'dreaming about water meaning', ARRAY['water dream interpretation', 'flood dream meaning', 'drowning dream'], 180),
('dream', 'Dreams of Falling — Why They Wake You Up', 'The hypnic jerk, the falling dream as anxiety release, Jungian read of falling as ego dissolution, and how to lucid-dream out of falling.', 'falling dream meaning', ARRAY['dream about falling', 'fall dream interpretation', 'falling from height dream'], 180),
('dream', 'Dreaming About a Dead Loved One', 'The bereavement-dream phenomenon, what cultures across the world believe these dreams mean, and how to integrate them in grief work.', 'dreaming about deceased meaning', ARRAY['dead loved one dream', 'visitation dream', 'dream about dead person'], 170),
('dream', 'Lucid Dreaming for Beginners — 4 Techniques That Work', 'MILD, WBTB, Reality Checks, WILD — explain each technique with realistic timelines, common pitfalls, and which works for which sleeper.', 'how to lucid dream', ARRAY['lucid dreaming techniques', 'MILD technique', 'reality check dream'], 160),
('dream', 'Recurring Dreams — Why They Happen and How to End Them', 'Recurring dream theory (unresolved processing), 5 common recurring dreams + their typical Jungian roots, and a 3-step practice to break the loop.', 'recurring dreams meaning', ARRAY['why do i have recurring dreams', 'same dream every night', 'recurring nightmare cure'], 150),
('dream', 'Dream Symbols — A Beginner''s Lexicon of 20 Common Images', 'Quick reference for 20 common dream symbols (snake, water, falling, teeth, naked, chase, fire, baby, house, car, etc.) with one-paragraph Jungian reads.', 'dream symbols meaning', ARRAY['dream interpretation list', 'common dream meanings', 'dream dictionary'], 150),

-- ─── Lunar / horoscope content (timely) ───────────────────────────
('lunar', 'Full Moon Rituals That Aren''t Cringe', 'A grounded full-moon practice — release work, charge water, write a "what I''m letting go" letter and burn it. No incense required.', 'full moon ritual', ARRAY['full moon practice', 'full moon spiritual ritual', 'release ritual moon'], 130),
('lunar', 'New Moon Intentions — How to Write Ones That Stick', 'New moon intention setting that survives the month — the SMART rule reframed, why feelings beat outcomes, and how to revisit at the next full moon.', 'new moon intentions', ARRAY['new moon ritual', 'how to set intentions', 'new moon manifestation'], 130),
('lunar', 'What is Mercury Retrograde Actually?', 'The astronomical event vs the astrological interpretation, why "communication breakdowns" is the famous one, and what to actually do (and not do) during retrograde.', 'mercury retrograde meaning', ARRAY['mercury retrograde 2026', 'mercury retrograde dates', 'mercury retrograde survival'], 150),

-- ─── MBTI × tarot ─────────────────────────────────────────────────
('mbti', 'INFJ Tarot — The Cards of the Mystical Counselor', 'INFJ tarot personality — The High Priestess as core archetype, secondary cards, and how INFJs typically misread tarot (over-symbolising).', 'infj tarot personality', ARRAY['infj tarot card', 'introverted intuitive tarot', 'infj high priestess'], 110),
('mbti', 'ENFP Tarot — The Cards of the Inspired Champion', 'ENFP tarot personality — The Star as core archetype, the Knight of Wands as shadow, how an ENFP energizes a reading.', 'enfp tarot personality', ARRAY['enfp tarot card', 'enfp star card', 'extraverted intuitive tarot'], 110),
('mbti', 'INTJ Tarot — The Cards of the Strategic Visionary', 'INTJ tarot personality — The Hermit as core archetype, the Magician as growth edge, why INTJs distrust tarot until they realise it''s a thinking tool.', 'intj tarot personality', ARRAY['intj tarot card', 'intj hermit card', 'introverted thinking tarot'], 110),
('mbti', 'INFP Tarot — Cards of the Quiet Idealist', 'INFP tarot personality — The Moon and The Hanged Man as core archetypes, why INFPs read tarot devotionally rather than predictively.', 'infp tarot personality', ARRAY['infp tarot card', 'infp moon card', 'infp tarot reading'], 110),

-- ─── Human Design ─────────────────────────────────────────────────
('human-design', 'The 5 Human Design Types Explained Simply', 'Manifestor, Generator, Manifesting Generator, Projector, Reflector — what each type''s strategy and signature feel like, with one daily-life example per type.', 'human design types', ARRAY['manifestor generator projector reflector', 'hd types explained', 'what is my human design type'], 160),
('human-design', 'Generator Strategy — Wait to Respond, Then Move', 'The Generator strategy in plain English — what "wait to respond" means in practice (job changes, dating, daily decisions), the sacral yes/no.', 'generator human design strategy', ARRAY['sacral response', 'generator energy type', 'wait to respond hd'], 140),
('human-design', 'Projector Burnout — Why You''re Tired and What to Do', 'Projector burnout pattern, the "wait for the invitation" reframe, and the 3-month cycle of recognition that powers a projector''s energy.', 'projector burnout human design', ARRAY['projector strategy', 'human design projector tired', 'projector invitation'], 140),
('human-design', 'Human Design vs Astrology — How They Differ', 'HD as a synthesis system (astrology + i ching + kabbalah + chakras + biology), what overlaps with astrology, and what HD adds that astrology doesn''t.', 'human design vs astrology', ARRAY['hd astrology difference', 'is human design real', 'human design accuracy'], 130),

-- ─── Bazi (Chinese astrology) ─────────────────────────────────────
('bazi', 'What is Bazi? A Beginner''s Guide to the Four Pillars', 'Bazi explained — the year/month/day/hour pillars, ten gods, the day master, and how it differs from Western astrology.', 'what is bazi astrology', ARRAY['bazi four pillars', 'chinese four pillars astrology', 'bazi day master'], 140),
('bazi', 'Your Bazi Day Master — What it Says About You', 'The 10 day-master types (Jia, Yi, Bing, etc.) and how each translates to a personality archetype. Worked examples.', 'bazi day master meaning', ARRAY['bazi day master types', 'jia wood day master', 'bazi personality'], 130),
('bazi', 'Luck Pillars — How Bazi Maps Your Life Decade by Decade', 'The 10-year luck pillar concept, how direction is determined, and what to do when you enter a new pillar.', 'bazi luck pillars', ARRAY['10 year luck pillar', 'bazi life decade', 'da yun pillar'], 120),

-- ─── Feng Shui ────────────────────────────────────────────────────
('feng-shui', 'Feng Shui for Bedrooms — 7 Quick Wins', 'Bedroom feng shui — bed position, mirror placement, electronics, color, plants. Rules with the why behind each.', 'bedroom feng shui', ARRAY['feng shui bed placement', 'feng shui bedroom rules', 'feng shui sleep'], 140),
('feng-shui', 'Your Personal Kua Number — How to Calculate and Use It', 'Kua number formula by birth year + gender, the East/West group split, and how to use the four favourable directions for desk, bed, front door.', 'kua number feng shui', ARRAY['personal kua number', 'feng shui directions', 'east west group kua'], 130),
('feng-shui', 'Feng Shui Your Office Desk — 5 Rules That Actually Help Productivity', 'Desk facing direction, the "command position", clutter, plants, lighting, and how to feng shui a corporate office where you can''t move much.', 'feng shui office desk', ARRAY['feng shui desk position', 'office feng shui rules', 'command position desk'], 120),

-- ─── Numerology ───────────────────────────────────────────────────
('numerology', 'How to Calculate Your Life Path Number', 'Life path number formula from birthdate, what each 1–9 (and 11/22/33 master numbers) means, and limitations of numerology.', 'life path number calculator', ARRAY['life path number meaning', 'numerology birth date', 'how to calculate life path'], 140),
('numerology', 'Angel Numbers — What 111, 222, 333, 444, 555 Mean', 'Quick guide to the most-searched angel numbers, the source of the modern interpretations, and what the symbols actually map to in numerology.', 'angel numbers meaning', ARRAY['111 meaning', '222 meaning', '333 meaning', '444 meaning'], 150),

-- ─── General / beginner-friendly evergreens ───────────────────────
('general', 'How to Read Tarot Cards — A Complete Beginner''s Guide', 'Pick a deck, cleanse it, frame a question, draw cards, read positions, and synthesise. The 5-step beginner workflow.', 'how to read tarot cards', ARRAY['beginner tarot reading', 'tarot for beginners', 'learn tarot guide'], 250),
('general', 'How to Cleanse a Tarot Deck — 5 Methods', 'Why and when to cleanse, then the 5 most common methods (smoke, moonlight, salt, sound, intention) with realistic time estimates.', 'how to cleanse tarot cards', ARRAY['cleanse tarot deck', 'tarot card cleansing', 'new tarot deck'], 130),
('general', 'Should You Buy Your Own Tarot Deck?', 'Debunk the "tarot must be gifted" myth, when buying your own is fine, and how to pick a beginner-friendly deck.', 'should you buy your own tarot deck', ARRAY['first tarot deck', 'gifted tarot myth', 'buying tarot deck'], 110),
('general', 'Tarot vs Oracle Cards — Which Should You Use?', 'The 78-card vs free-form distinction, when oracle works better than tarot, and a 3-question framework for picking.', 'tarot vs oracle cards', ARRAY['oracle deck vs tarot', 'difference oracle tarot', 'which tarot deck'], 110),
('general', 'How to Journal a Tarot Reading', 'A repeatable tarot journal format — date, question, cards, gut read, after-the-fact analysis. Why journaling beats memorising.', 'tarot journal template', ARRAY['how to journal tarot', 'tarot reflection practice', 'tarot diary'], 100)

ON CONFLICT DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE 'seo-blog-topics: seeded ~75 topics covering tarot, zodiac, dreams, lunar, mbti, human-design, bazi, feng-shui, numerology, general.';
END $$;
