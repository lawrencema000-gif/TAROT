-- ============================================================================
-- SEO blog topics — D34 rule check of the 90 topics added on 2026-11-22
-- ============================================================================
-- 19 briefs amended by Claude under the owner's delegation of 2026-11-17, in
-- PR #23 (fix/blog-topics-d34-rules).
--
-- The owner's decision D34 (plan/answers.md) sets the rules every blog topic
-- follows: (1) a live category; (2) one topic per keyword; (3) house-style
-- briefs; (4) no health, money or legal promise: no topics on illness,
-- diagnosis or treatment, pregnancy or fertility, mental-health conditions,
-- trauma or nightmares as symptoms, self-harm, money or investment outcomes,
-- gambling or legal questions, and dream topics stay symbolic; (5) no
-- competitor and no real living person; (6) no claim that a reading predicts
-- events with certainty; (7) preferably a topic the app has a page for.
--
-- All 90 rows of 20261122000000 were checked row by row (the PR description
-- lists each). 71 pass as written; the 19 below are amended. Every UPDATE is
-- limited to an unused row (used_at IS NULL), so a topic already published is
-- never rewritten. The generator's own topic drafter and its article prompt
-- now carry the same rules (topic-draft.ts, index.ts).
-- ============================================================================

-- Rule 4: dreams stay symbolic; distress topics carry one doctor line.
UPDATE public.seo_blog_topics SET brief = 'The chase dream read as a symbol: what you might be avoiding, who or what is chasing, where you run, and what changes if you turn around. Common variations and what they point to. Stays symbolic: never a symptom of anxiety or trauma; one plain line that nightmares which come regularly and affect sleep or daily life are worth raising with a doctor.'
WHERE keyword = 'dreaming about being chased' AND used_at IS NULL;

UPDATE public.seo_blog_topics SET brief = 'Pregnancy and birth dreams read as symbols of something new taking shape: a project, an identity, a change on the way. Variations (twins, labour, a stranger''s baby) and what they suggest. Strictly symbolic: never a sign of pregnancy, fertility or anything about health.'
WHERE keyword = 'pregnancy dream meaning' AND used_at IS NULL;

UPDATE public.seo_blog_topics SET
  topic = 'Nine of Swords: Worry in the Small Hours',
  brief = 'The Nine of Swords as worry and sleeplessness in tarot''s symbolism: the figure sitting up in bed, the nine swords on the dark wall. Telling fear from fact, upright vs reversed, and the reflective steps the card suggests (writing the worry down, naming what is real). No clinical claims about anxiety or insomnia; one plain line that lasting worry or sleeplessness is worth raising with a doctor.',
  related_keywords = ARRAY['nine of swords reversed', 'nine of swords love', 'nine of swords as feelings']
WHERE keyword = 'nine of swords meaning' AND used_at IS NULL;

UPDATE public.seo_blog_topics SET brief = 'The Five of Cups as loss and regret in tarot: three spilled cups, two still upright behind the mourning figure, the bridge home. Upright vs reversed, and what the card says about what remains, as the tradition reads it. Grief is the card''s theme, not counselling: no therapeutic claims.'
WHERE keyword = 'five of cups meaning' AND used_at IS NULL;

-- Rule 4: no self-harm search term; the nickname is not targeted.
UPDATE public.seo_blog_topics SET
  brief = 'The king of hearts as a kind, generous man or a steadying influence in cartomancy. What he means in love and family readings, how the cards beside him change him, and how his sword is drawn in many decks.',
  related_keywords = ARRAY['king of hearts cartomancy', 'king of hearts love', 'king of hearts as a person']
WHERE keyword = 'king of hearts meaning' AND used_at IS NULL;

-- Rule 4: money cards and numbers say what the tradition holds and promise no money result.
UPDATE public.seo_blog_topics SET brief = 'The Ace of Pentacles as a seed of material opportunity in tarot tradition: the coin from the cloud, the garden gate. Work and practical beginnings, upright vs reversed. Says what the tradition holds and promises no money result.'
WHERE keyword = 'ace of pentacles meaning' AND used_at IS NULL;

UPDATE public.seo_blog_topics SET brief = 'The Four of Pentacles as holding on: the coin held to the chest, the coins under the feet. Security versus scarcity in tarot''s symbolism, upright vs reversed, in love and work; reflective, with no money advice.'
WHERE keyword = 'four of pentacles meaning' AND used_at IS NULL;

UPDATE public.seo_blog_topics SET brief = 'The Six of Pentacles as giving, receiving and the balance of power: the merchant, the scales, the two kneeling figures. Upright vs reversed, in relationships and work, as the tradition reads it; no money advice.'
WHERE keyword = 'six of pentacles meaning' AND used_at IS NULL;

UPDATE public.seo_blog_topics SET brief = 'The Seven of Pentacles as patience and the long view: the farmer resting on the hoe, the coins ripening on the vine. Taking stock of slow work, upright vs reversed, as the tradition reads it; no money or investment advice.'
WHERE keyword = 'seven of pentacles meaning' AND used_at IS NULL;

UPDATE public.seo_blog_topics SET brief = 'The Nine of Pentacles as independence and comfort earned: the woman in the vineyard, the hooded falcon. Self-sufficiency and self-worth, upright vs reversed, as the tradition reads them; no money result promised.'
WHERE keyword = 'nine of pentacles meaning' AND used_at IS NULL;

UPDATE public.seo_blog_topics SET brief = 'The King of Pentacles as steady stewardship: the vines, the bull heads, the castle. What the tradition holds about provision and work built to last, as feelings, as a person, upright vs reversed; no money or business result promised.'
WHERE keyword = 'king of pentacles meaning' AND used_at IS NULL;

UPDATE public.seo_blog_topics SET brief = 'The diamonds suit as the cartomancy suit of money, trade, practical news and ambition, as the tradition reads it. How diamonds read in career and money questions and what a cluster of diamonds signals, without promising any money result.'
WHERE keyword = 'diamonds suit meaning' AND used_at IS NULL;

UPDATE public.seo_blog_topics SET brief = 'The 888 sequence and the number 8''s traditional link to material flow, power and cycles. What it is said to mean for work, money and love, as a prompt for reflection: no money or investment result is promised and no get-rich hype.'
WHERE keyword = 'angel number 888' AND used_at IS NULL;

-- Rule 6: tradition, never a forecast.
UPDATE public.seo_blog_topics SET brief = 'The nine of spades, often called the hardest card in the deck, read without fear: what it warns of, when it points to a necessary ending, and the cards that soften it. It never foretells illness or death, and no reading claims certainty.'
WHERE keyword = 'nine of spades meaning' AND used_at IS NULL;

UPDATE public.seo_blog_topics SET brief = 'Where the ace of spades got its grim reputation, and what it means in cartomancy: a decisive ending, a hard truth, a powerful beginning. How its neighbours change the message. It is never a prediction of death, and no reading claims certainty.'
WHERE keyword = 'ace of spades meaning' AND used_at IS NULL;

UPDATE public.seo_blog_topics SET brief = 'The Nine of Cups as contentment and a wish fulfilled: the satisfied figure before the row of cups. Upright vs reversed, and why readers treat it as a yes card: tradition, not a guarantee.'
WHERE keyword = 'nine of cups meaning' AND used_at IS NULL;

UPDATE public.seo_blog_topics SET
  topic = 'Angel Number 555: A Sign of Change',
  brief = 'The 555 sequence as a traditional sign of change and movement: what it is said to mean, how it reads in love and career, and how to meet change with intention. A prompt for reflection, never a prediction.'
WHERE keyword = 'angel number 555' AND used_at IS NULL;

UPDATE public.seo_blog_topics SET brief = 'Tarot and playing cards compared honestly: deck structure, the missing Major Arcana, how the suits correspond (hearts and cups, diamonds and pentacles, clubs and wands, spades and swords), and which suits which kind of reader. Honest about accuracy: a reading is a tool for reflection, not a forecast.'
WHERE keyword = 'cartomancy vs tarot' AND used_at IS NULL;

-- Rule 4: questions that belong with a professional are named as such.
UPDATE public.seo_blog_topics SET brief = 'How to phrase a tarot question so the answer is usable: open questions, your own agency, a clear timeframe. Good questions for love, career and growth, and the kinds to avoid, including health, legal and money-outcome questions, which belong with a professional.'
WHERE keyword = 'questions to ask tarot' AND used_at IS NULL;
