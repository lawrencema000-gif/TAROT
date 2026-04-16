-- Seed 5 SEO blog articles
-- These are published articles for organic search traffic

INSERT INTO blog_posts (slug, title, excerpt, content, author, tags, published, published_at, updated_at)
VALUES
(
  'tarot-card-meanings-complete-guide',
  'The Complete Guide to Tarot Card Meanings: All 78 Cards Explained',
  'A beginner-friendly guide to all 78 tarot cards — their upright meanings, reversed meanings, and what they mean for love, career, and personal growth.',
  '<article class="blog-post">
<p class="lead"><em>Whether you''re a complete beginner or a seasoned reader, understanding the meaning behind each tarot card is the foundation of every reading. This guide covers all 78 cards in the traditional Rider-Waite tarot deck.</em></p>

<h2>The Structure of the Tarot Deck</h2>
<p>A standard tarot deck has 78 cards divided into two groups:</p>
<p><strong>Major Arcana (22 cards)</strong> — These represent life''s major themes, spiritual lessons, and turning points. When a Major Arcana card appears in your reading, pay close attention — it''s pointing to something significant.</p>
<p><strong>Minor Arcana (56 cards)</strong> — These reflect day-to-day experiences across four suits:</p>
<ul>
<li><strong>Wands</strong> — Passion, creativity, ambition, energy</li>
<li><strong>Cups</strong> — Emotions, relationships, intuition, feelings</li>
<li><strong>Swords</strong> — Intellect, conflict, truth, mental clarity</li>
<li><strong>Pentacles</strong> — Money, career, health, material world</li>
</ul>

<h2>The Major Arcana</h2>
<p><strong>0 — The Fool:</strong> New beginnings, innocence, spontaneity. A leap of faith into the unknown. Reversed: recklessness, fear of change.</p>
<p><strong>I — The Magician:</strong> Willpower, manifestation, resourcefulness. You have everything you need. Reversed: manipulation, untapped potential.</p>
<p><strong>II — The High Priestess:</strong> Intuition, mystery, inner wisdom. Trust what you feel, not just what you see. Reversed: secrets, disconnection from intuition.</p>
<p><strong>III — The Empress:</strong> Abundance, nurturing, fertility. Creative energy is flowing. Reversed: dependence, creative block.</p>
<p><strong>IV — The Emperor:</strong> Authority, structure, stability. Take charge of your situation. Reversed: rigidity, control issues.</p>
<p><strong>V — The Hierophant:</strong> Tradition, spiritual guidance, conformity. Seek wisdom from established sources. Reversed: rebellion, questioning authority.</p>
<p><strong>VI — The Lovers:</strong> Partnership, alignment, choices. A meaningful connection or decision. Reversed: disharmony, misalignment of values.</p>
<p><strong>VII — The Chariot:</strong> Determination, victory, willpower. You''re on the right path — keep pushing. Reversed: lack of direction, aggression.</p>
<p><strong>VIII — Strength:</strong> Inner courage, patience, compassion. Gentle strength overcomes all obstacles. Reversed: self-doubt, insecurity.</p>
<p><strong>IX — The Hermit:</strong> Solitude, reflection, inner guidance. Take time alone to find your answers. Reversed: isolation, loneliness.</p>
<p><strong>X — Wheel of Fortune:</strong> Cycles, destiny, turning points. Change is coming — embrace it. Reversed: resistance to change, bad luck.</p>
<p><strong>XI — Justice:</strong> Fairness, truth, accountability. The truth will come to light. Reversed: dishonesty, lack of accountability.</p>
<p><strong>XII — The Hanged Man:</strong> Surrender, new perspective, letting go. Sometimes you need to pause to see clearly. Reversed: stalling, resistance.</p>
<p><strong>XIII — Death:</strong> Transformation, endings, new beginnings. The old must go for the new to arrive. Reversed: fear of change, stagnation.</p>
<p><strong>XIV — Temperance:</strong> Balance, patience, moderation. Find your middle ground. Reversed: excess, imbalance.</p>
<p><strong>XV — The Devil:</strong> Bondage, materialism, shadow self. What''s holding you back? Reversed: liberation, reclaiming power.</p>
<p><strong>XVI — The Tower:</strong> Upheaval, revelation, breakthrough. Destruction that leads to freedom. Reversed: avoiding disaster, fear of change.</p>
<p><strong>XVII — The Star:</strong> Hope, renewal, inspiration. After the storm, healing begins. Reversed: despair, disconnection.</p>
<p><strong>XVIII — The Moon:</strong> Illusion, fear, intuition. Things aren''t what they seem — trust your gut. Reversed: clarity emerging, releasing fear.</p>
<p><strong>XIX — The Sun:</strong> Joy, success, vitality. Everything is coming together. Reversed: temporary setback, delayed success.</p>
<p><strong>XX — Judgement:</strong> Reflection, reckoning, inner calling. Answer the call to become who you''re meant to be. Reversed: self-doubt, ignoring the call.</p>
<p><strong>XXI — The World:</strong> Completion, integration, accomplishment. A major cycle is complete. Reversed: incomplete, seeking closure.</p>

<h2>How to Use This Guide</h2>
<p>The best way to learn tarot is through daily practice. Pull one card each morning, read its meaning, and reflect on how it applies to your day. Over time, you''ll develop your own intuitive relationship with the cards.</p>
<p>Try your first reading now — it''s free at <a href="https://tarotlife.app">tarotlife.app</a>.</p>
</article>',
  'Arcana',
  ARRAY['tarot', 'guide', 'meanings', 'major arcana', 'minor arcana'],
  true,
  now(),
  now()
),
(
  'celtic-cross-tarot-spread-guide',
  'What Is a Celtic Cross Tarot Spread? Complete Guide for Beginners',
  'The Celtic Cross is the most popular tarot spread in the world. Learn what each of the 10 positions means and how to interpret your reading.',
  '<article class="blog-post">
<p class="lead"><em>The Celtic Cross is a 10-card tarot spread that provides deep insight into any question or situation. It''s been used for centuries and remains the most popular spread among tarot readers worldwide.</em></p>

<h2>The 10 Positions</h2>
<ol>
<li><strong>The Present</strong> — Your current situation right now</li>
<li><strong>The Challenge</strong> — What''s crossing you or creating tension</li>
<li><strong>The Foundation</strong> — The root cause or unconscious influence</li>
<li><strong>The Recent Past</strong> — What''s just behind you</li>
<li><strong>The Crown</strong> — Your best possible outcome or aspiration</li>
<li><strong>The Near Future</strong> — What''s approaching in the next few weeks</li>
<li><strong>Your Attitude</strong> — How you see yourself in this situation</li>
<li><strong>External Influences</strong> — How others see you or affect the situation</li>
<li><strong>Hopes and Fears</strong> — What you''re hoping for or afraid of</li>
<li><strong>The Outcome</strong> — Where this path leads</li>
</ol>

<h2>How to Read It</h2>
<p>Start by focusing on your question. Shuffle the deck while holding that question in mind. Then lay out the cards in the traditional Celtic Cross pattern.</p>
<p><strong>Read the story, not just individual cards.</strong> The Celtic Cross tells a narrative — past flowing into present, internal meeting external, hopes confronting reality.</p>
<p><strong>Look for patterns:</strong></p>
<ul>
<li>Multiple Major Arcana cards = significant life event</li>
<li>Many cards from one suit = that area of life is dominant</li>
<li>Reversed cards = blocked energy or internal resistance</li>
</ul>

<h2>When to Use the Celtic Cross</h2>
<ul>
<li>Big life decisions (career change, relationship, move)</li>
<li>When you need comprehensive insight, not just a quick answer</li>
<li>Monthly or quarterly check-ins on your life direction</li>
<li>When a single card pull feels insufficient</li>
</ul>
<p>The Celtic Cross is available in the Arcana app — try it free at <a href="https://tarotlife.app">tarotlife.app</a>.</p>
</article>',
  'Arcana',
  ARRAY['tarot', 'celtic cross', 'spreads', 'guide', 'readings'],
  true,
  now(),
  now()
),
(
  'daily-horoscope-routine',
  'Your Daily Horoscope Routine: How 3 Minutes Can Change Your Day',
  'A simple 3-minute morning ritual using your horoscope, a tarot card, and a journal entry can transform how you start each day.',
  '<article class="blog-post">
<p class="lead"><em>Most people check their phone first thing in the morning. Social media, emails, news — all of it pulls you into other people''s priorities before you''ve even considered your own. What if you replaced that with 3 minutes of intentional self-reflection?</em></p>

<h2>The 3-Minute Daily Ritual</h2>
<h3>Step 1: Read Your Horoscope (1 minute)</h3>
<p>Not the generic newspaper kind. A personalized forecast based on your actual birth chart that tells you your energy level for the day, what to focus on, what to watch out for, and a daily affirmation.</p>

<h3>Step 2: Pull a Tarot Card (1 minute)</h3>
<p>One card. One message. Read the meaning and ask yourself: "How does this apply to my day?"</p>
<p>You don''t need to believe in mystical powers. Think of it as a daily prompt — a random mirror that shows you something you weren''t consciously thinking about.</p>

<h3>Step 3: Write One Sentence (1 minute)</h3>
<p>Open your journal and write one sentence about how you feel right now. That''s it. Not a paragraph, not a page — one honest sentence.</p>
<p>Over weeks and months, those sentences become a map of your emotional life. You''ll see patterns you never noticed.</p>

<h2>Why It Works</h2>
<p>This isn''t about predicting the future. It''s about starting your day with intentionality instead of reactivity.</p>
<p>Research shows that morning routines reduce anxiety and increase feelings of control. Adding a reflective element — even a brief one — strengthens self-awareness and emotional regulation.</p>

<h2>How to Start</h2>
<p>The Arcana app puts all three steps in one place. Open the app, complete your daily ritual, and maintain your streak. It''s free and takes less time than scrolling Instagram.</p>
<p>Start today at <a href="https://tarotlife.app">tarotlife.app</a>.</p>
</article>',
  'Arcana',
  ARRAY['horoscope', 'daily routine', 'self-care', 'astrology', 'mindfulness'],
  true,
  now(),
  now()
),
(
  'mbti-zodiac-personality-combination',
  'MBTI and Zodiac: What Your Personality Type + Sun Sign Says About You',
  E'Your MBTI type meets your zodiac sign — here''s what the combination reveals about your true personality.',
  '<article class="blog-post">
<p class="lead"><em>Your zodiac sign describes the energy you were born with. Your MBTI type describes how your mind processes the world. Together, they create a surprisingly accurate personality portrait.</em></p>

<h2>Fire Signs + MBTI</h2>
<h3>Aries</h3>
<ul><li><strong>ENTJ Aries:</strong> Unstoppable leader. Born to command.</li><li><strong>ENFP Aries:</strong> Chaotic enthusiasm personified.</li><li><strong>ISTP Aries:</strong> The quiet warrior. Strikes when least expected.</li></ul>
<h3>Leo</h3>
<ul><li><strong>ENFJ Leo:</strong> The magnetic mentor everyone gravitates toward.</li><li><strong>ESFP Leo:</strong> Pure performance energy. Life of every room.</li><li><strong>INTJ Leo:</strong> Strategic brilliance with dramatic flair.</li></ul>
<h3>Sagittarius</h3>
<ul><li><strong>ENTP Sagittarius:</strong> The philosopher who can''t sit still.</li><li><strong>INFP Sagittarius:</strong> Idealist wanderer chasing meaning.</li><li><strong>ESTP Sagittarius:</strong> Adventure incarnate. Zero fear.</li></ul>

<h2>Earth Signs + MBTI</h2>
<h3>Taurus</h3>
<ul><li><strong>ISFJ Taurus:</strong> The ultimate caretaker. Loyal to the bone.</li><li><strong>ESTJ Taurus:</strong> Builds empires slowly and permanently.</li><li><strong>INFP Taurus:</strong> Gentle artist with immovable values.</li></ul>
<h3>Virgo</h3>
<ul><li><strong>ISTJ Virgo:</strong> Peak precision. Nothing escapes their notice.</li><li><strong>INFJ Virgo:</strong> The analytical empath. Sees everything.</li><li><strong>ENTP Virgo:</strong> Brilliant chaos organized into systems.</li></ul>
<h3>Capricorn</h3>
<ul><li><strong>INTJ Capricorn:</strong> The master strategist.</li><li><strong>ENTJ Capricorn:</strong> Born CEO energy.</li><li><strong>ISFP Capricorn:</strong> Quiet ambition disguised as gentleness.</li></ul>

<h2>Water Signs + MBTI</h2>
<h3>Cancer</h3>
<ul><li><strong>ISFJ Cancer:</strong> Emotional fortress. Protects everyone.</li><li><strong>ENFJ Cancer:</strong> The nurturing leader.</li><li><strong>INFP Cancer:</strong> Feels everything on a cosmic level.</li></ul>
<h3>Scorpio</h3>
<ul><li><strong>INTJ Scorpio:</strong> Strategic intensity. Never reveals their hand.</li><li><strong>INFJ Scorpio:</strong> Sees through everyone.</li><li><strong>ENTJ Scorpio:</strong> Power and transformation combined.</li></ul>
<h3>Pisces</h3>
<ul><li><strong>INFP Pisces:</strong> The purest dreamer. Lives between worlds.</li><li><strong>ENFJ Pisces:</strong> Healing presence. Makes everyone feel seen.</li><li><strong>INTP Pisces:</strong> Analytical mystic. Logic meets intuition.</li></ul>

<h2>Find Your Combination</h2>
<p>Take both assessments for free in the Arcana app. Your MBTI quiz result is saved alongside your zodiac sign on your profile.</p>
<p>Discover your combination at <a href="https://tarotlife.app">tarotlife.app</a>.</p>
</article>',
  'Arcana',
  ARRAY['MBTI', 'zodiac', 'personality', 'astrology', 'psychology'],
  true,
  now(),
  now()
),
(
  'five-love-languages-explained',
  '5 Love Languages Explained: Which One Are You?',
  E'Understanding your love language transforms your relationships. Here''s what each one means and how to discover yours.',
  '<article class="blog-post">
<p class="lead"><em>The concept of love languages suggests that people express and receive love in five distinct ways. Knowing yours — and your partner''s — can dramatically improve your relationships.</em></p>

<h2>The 5 Love Languages</h2>
<h3>1. Words of Affirmation</h3>
<p>You feel most loved when someone tells you. Compliments, "I love you," encouraging texts, verbal appreciation — these fill your emotional tank.</p>
<p><em>Signs this is yours:</em> Criticism devastates you. You save meaningful texts. You remember exactly what people said to you.</p>

<h3>2. Quality Time</h3>
<p>You feel most loved through undivided attention. Not just being in the same room — being fully present, phones down, eyes meeting.</p>
<p><em>Signs this is yours:</em> Distracted conversations hurt. Cancelled plans feel personal. Your best memories are uninterrupted moments together.</p>

<h3>3. Acts of Service</h3>
<p>You feel most loved when someone does something for you. Making coffee, handling a task you''ve been dreading, showing up without being asked.</p>
<p><em>Signs this is yours:</em> Laziness frustrates you. You notice when someone goes out of their way. Actions genuinely speak louder than words for you.</p>

<h3>4. Physical Touch</h3>
<p>You feel most loved through physical connection. Hugs, hand-holding, a touch on the shoulder, sitting close — physical proximity is emotional proximity.</p>
<p><em>Signs this is yours:</em> You''re a hugger. Physical distance feels like emotional distance. A touch can calm you faster than words.</p>

<h3>5. Receiving Gifts</h3>
<p>You feel most loved through thoughtful gifts. Not expensive — thoughtful. It''s the proof that someone was thinking about you when you weren''t there.</p>
<p><em>Signs this is yours:</em> You keep meaningful gifts forever. You notice when someone remembers your preferences. The thought truly counts more than the price.</p>

<h2>Why It Matters</h2>
<p>Most relationship friction comes from mismatched love languages. You''re pouring love into your partner in YOUR language, but they need it in THEIRS. Understanding both languages creates a bridge.</p>

<h2>Discover Yours</h2>
<p>Take the free Love Language quiz in the Arcana app. Your results are saved to your profile and help personalize your experience.</p>
<p>Find out at <a href="https://tarotlife.app">tarotlife.app</a>.</p>
</article>',
  'Arcana',
  ARRAY['love language', 'relationships', 'personality quiz', 'self-discovery'],
  true,
  now(),
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content,
  tags = EXCLUDED.tags,
  published = true,
  published_at = COALESCE(blog_posts.published_at, now()),
  updated_at = now();
