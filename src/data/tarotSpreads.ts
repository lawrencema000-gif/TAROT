// Tarot Spreads Library
// Comprehensive metadata for 18 named spreads, used to power the /spreads hub
// and per-spread detail pages on tarotlife.app.

export type SpreadCategory =
  | 'general'
  | 'love'
  | 'career'
  | 'daily'
  | 'spiritual'
  | 'lunar'
  | 'decision';

export interface SpreadPosition {
  position: number;
  name: string;
  meaning: string;
}

export interface TarotSpread {
  slug: string;
  name: string;
  category: SpreadCategory;
  cardCount: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  durationMin: number;
  shortDescription: string;
  longDescription: string;
  bestFor: string[];
  whenToUse: string;
  history?: string;
  positions: SpreadPosition[];
  exampleQuestions: string[];
  faqs: Array<{ q: string; a: string }>;
  relatedSpreads: string[];
}

export const tarotSpreads: TarotSpread[] = [
  // ----------------------------------------------------------------------
  // GENERAL
  // ----------------------------------------------------------------------
  {
    slug: 'one-card-daily',
    name: 'One Card Daily',
    category: 'general',
    cardCount: 1,
    difficulty: 'beginner',
    durationMin: 5,
    shortDescription:
      'The simplest daily check-in — one card to set the tone for your day.',
    longDescription:
      'A single card pulled with intention, the One Card Daily is the most accessible spread in tarot. It offers a clear, focused signal — a theme to watch for, an energy to lean into, or a quiet warning to keep in mind. Beginners use it to build a daily relationship with the deck, while seasoned readers use it as a morning compass. Five minutes, one card, one honest reflection.',
    bestFor: [
      'Building a consistent daily tarot habit',
      'Getting a quick energetic read on the day ahead',
      'Beginners who feel overwhelmed by larger spreads',
      'A focusing question when your mind is scattered',
      'Pairing with a journal entry over morning coffee',
    ],
    whenToUse:
      'Pull this card first thing in the morning, before checking your phone or scrolling. The clearer your headspace, the cleaner the signal. It is also useful as a mid-day reset when you feel pulled in too many directions.',
    history:
      'Daily single-card draws became popular in the late twentieth century as tarot moved from divinatory tool to reflective practice. Teachers like Rachel Pollack encouraged a "card a day" habit as the fastest path to fluency in the deck.',
    positions: [
      {
        position: 1,
        name: "Today's keynote",
        meaning:
          'The dominant energy, lesson, or invitation present in your day. Treat it as a lens to view events through, not a fixed prediction.',
      },
    ],
    exampleQuestions: [
      'What energy should I lean into today?',
      'What is the one thing I should watch for today?',
      'What does my higher self want me to remember today?',
      'How can I best meet today as it actually is?',
      'What lesson is trying to reach me right now?',
    ],
    faqs: [
      {
        q: 'Should I pull a new card if I do not like the one I get?',
        a: 'No. The first card is the honest one. Pulling again to chase a better answer trains the deck — and your mind — to deliver noise instead of signal. Sit with the uncomfortable card and ask why it landed.',
      },
      {
        q: 'Can I use this spread for a yes or no question?',
        a: 'You can, but it is not its strength. The One Card Daily is a thematic reading, not a verdict. For binary answers try the Love Yes/No or Yes-No Pulse spreads instead.',
      },
      {
        q: 'What if the same card keeps appearing day after day?',
        a: 'A repeating card means the lesson has not yet landed. Stop pulling new cards on the topic and start journaling: what does this card keep pointing at that you have been avoiding?',
      },
      {
        q: 'Does it matter if the card comes out reversed?',
        a: 'Yes, if you read reversals. A reversed card on a daily pull often points to internal work, blocked energy, or a lesson asking to be integrated rather than acted upon outwardly.',
      },
      {
        q: 'How long should I sit with the card?',
        a: 'At least two minutes of quiet observation before any interpretation. Notice the image first — colors, posture, symbols — before reaching for memorized meanings.',
      },
    ],
    relatedSpreads: [
      'three-card-past-present-future',
      'mind-body-spirit',
      'weekly-forecast',
    ],
  },
  {
    slug: 'three-card-past-present-future',
    name: 'Three Card: Past, Present, Future',
    category: 'general',
    cardCount: 3,
    difficulty: 'beginner',
    durationMin: 10,
    shortDescription:
      'The classic three-card timeline — where you came from, where you are, where you are headed.',
    longDescription:
      'The most recognized spread in tarot. Three cards, laid left to right, trace a single arc through time. It is small enough to read in one breath but rich enough to surface real momentum — what you are still carrying, what is alive in this moment, and the most likely trajectory if nothing changes. Use it as an honest pulse-check on any situation that has a beginning, middle, and end.',
    bestFor: [
      'Understanding how a situation got here',
      'Tracking momentum on a project or relationship',
      'A first reading on a new question',
      'When you want depth without committing to ten cards',
      'Quick clarity on whether to keep going or course-correct',
    ],
    whenToUse:
      'Reach for this spread when a situation has a clear timeline — a relationship at a turning point, a job you are weighing, a creative project that has stalled. It works best when you can name the topic in one sentence before shuffling.',
    history:
      'The three-card spread predates modern tarot and shows up across divinatory traditions. Its popularity in tarot specifically was cemented by twentieth-century occult writers who treated past/present/future as the simplest model of cause and effect.',
    positions: [
      {
        position: 1,
        name: 'What you are carrying from the past',
        meaning:
          'The root cause, formative event, or lingering pattern still shaping the situation. Not just what happened, but what you took from it.',
      },
      {
        position: 2,
        name: 'Where you stand right now',
        meaning:
          'The honest energy of the present moment — including what you may be avoiding seeing. This card is the most actionable of the three.',
      },
      {
        position: 3,
        name: 'Where this is heading if you stay the current course',
        meaning:
          'The most probable trajectory based on current momentum. Not a fixed fate — a forecast that updates the moment you change your behavior.',
      },
    ],
    exampleQuestions: [
      'How is my relationship with my partner actually evolving?',
      'What is the trajectory of this new job?',
      'Why does this same conflict keep coming back?',
      'What is the story arc of my creative project right now?',
      'How is my financial situation moving?',
    ],
    faqs: [
      {
        q: 'How far back is "past" — last week or last decade?',
        a: 'It depends on the question. The deck answers the timeframe of what you asked. For a job dispute, "past" might be last month; for a love pattern, it might be your childhood.',
      },
      {
        q: 'Is the future card a prediction or a possibility?',
        a: 'A possibility. Tarot reads momentum, not fate. The future card shows where the current arrow is pointing. Change your behavior and you change the arc.',
      },
      {
        q: 'What if past and future look almost identical?',
        a: 'A strong signal that the pattern is repeating. You are about to live the same lesson again unless something in the present card is acted on.',
      },
      {
        q: 'Can I use this for someone else?',
        a: 'Yes, but ask their permission first. Reading for someone without consent collapses the energy and dilutes the signal. With consent, focus on their question, not your opinion of it.',
      },
      {
        q: 'Should I read each card alone or as a story?',
        a: 'Both. Read each card on its own first, then re-read the three as a single sentence. The story between the cards is often where the real insight lives.',
      },
      {
        q: 'What if a card looks like it is in the wrong position?',
        a: 'It is not. Trust the layout. A "future" card that feels like the past usually means the future is asking you to revisit something unfinished.',
      },
    ],
    relatedSpreads: ['one-card-daily', 'celtic-cross', 'horseshoe'],
  },
  {
    slug: 'celtic-cross',
    name: 'Celtic Cross',
    category: 'general',
    cardCount: 10,
    difficulty: 'advanced',
    durationMin: 45,
    shortDescription:
      'The deepest classic spread — ten cards mapping every angle of a single situation.',
    longDescription:
      'The Celtic Cross is the cathedral of tarot spreads. Ten cards, arranged in a cross and a staff, map a situation from every meaningful angle: the heart of the matter, what crosses it, what holds it down, what crowns it, the recent past and near future, and a vertical staff covering self, environment, hopes/fears, and outcome. It rewards experienced readers who can hold a lot of information without rushing to conclusions, and it is famously unforgiving when used to dodge a question. Used well, it is the most complete picture tarot can offer in a single sitting.',
    bestFor: [
      'Major life decisions you have already turned over alone',
      'Long-running situations with multiple stakeholders',
      'When you want every angle, not a quick snapshot',
      'Annual or quarterly life-mapping sessions',
      'Writing it all out in a journal afterward',
    ],
    whenToUse:
      'Use the Celtic Cross when you have time, attention, and a clear single question. It is too large for casual daily use and too rich to rush. Set aside at least forty-five quiet minutes and have something to write with.',
    history:
      'Popularized by A.E. Waite in the early twentieth century in The Pictorial Key to the Tarot, the Celtic Cross has roots in older Hermetic and Golden Dawn lodges. Despite its name, the connection to actual Celtic mysticism is more atmospheric than historical, but the structure has proven remarkably durable across schools of tarot.',
    positions: [
      {
        position: 1,
        name: 'The heart of the matter',
        meaning:
          'The core energy of the situation — what is actually being asked, beneath the words. Everything else is read in relation to this card.',
      },
      {
        position: 2,
        name: 'What crosses you',
        meaning:
          'The immediate challenge, opposing force, or tension acting on the heart card. Sometimes an obstacle, sometimes the very thing that gives the situation its shape.',
      },
      {
        position: 3,
        name: 'What lies beneath',
        meaning:
          'The subconscious foundation — beliefs, fears, or formative experiences holding the situation in place. Often the most uncomfortable card to look at.',
      },
      {
        position: 4,
        name: 'What is passing away',
        meaning:
          'The recent past — what is already in motion behind you and beginning to recede. Useful for understanding what you no longer need to fight.',
      },
      {
        position: 5,
        name: 'What is in the air',
        meaning:
          'Conscious goals, ideals, or what you believe you are aiming for. Compare this with the heart card to see whether your intention matches the actual situation.',
      },
      {
        position: 6,
        name: 'What is approaching',
        meaning:
          'The near future — events, energies, or invitations entering your life within weeks, not years. Read alongside card 10 for a fuller picture.',
      },
      {
        position: 7,
        name: 'How you are showing up',
        meaning:
          'Your current stance, role, or attitude toward the situation. Often more revealing than people expect — and often the only card you can actually change.',
      },
      {
        position: 8,
        name: 'The world around you',
        meaning:
          'The people, environment, and external pressures shaping the situation. Useful for separating your own material from inherited noise.',
      },
      {
        position: 9,
        name: 'Your hopes and fears',
        meaning:
          'What you most want and most dread — sometimes the same card. Reveals the emotional charge driving your interpretation of the other cards.',
      },
      {
        position: 10,
        name: 'The likely outcome',
        meaning:
          'The trajectory if the current pattern holds. Not a final verdict — a forecast that updates the moment you change anything in cards 7 or 9.',
      },
    ],
    exampleQuestions: [
      'Should I leave this relationship or stay and work on it?',
      'What is really going on with my career right now?',
      'How do I navigate this conflict with my family?',
      'Why do I keep recreating the same situation in my life?',
      'What is the full picture of this move I am considering?',
    ],
    faqs: [
      {
        q: 'How do I read all ten cards without feeling overwhelmed?',
        a: 'Read in stages. Start with the cross (cards 1 and 2) for the core dynamic, then the vertical line of the cross (cards 3, 1, 5) for foundation and aspiration, then the horizontal (cards 4, 1, 6) for time, then the staff (7 to 10) for context and outcome. Each stage is a complete mini-reading.',
      },
      {
        q: 'What if my hopes-and-fears card and outcome card contradict each other?',
        a: 'That is often the point. The contradiction is the lesson — your fear may be inflating a future that the cards do not actually support, or your hope may be skipping past a real warning. Both are worth examining.',
      },
      {
        q: 'Can I use the Celtic Cross for daily questions?',
        a: 'It is overkill. Save it for situations large enough to deserve forty-five minutes of focused attention. For daily use, pull One Card Daily or a Three Card spread.',
      },
      {
        q: 'How accurate are the timing cards (4 and 6)?',
        a: 'Tarot is generally weak at exact timing but strong at sequence. Treat card 4 as "what has just stopped mattering" and card 6 as "what is about to start mattering" rather than fixed weeks or months.',
      },
      {
        q: 'Why does my outcome card feel disconnected from the rest?',
        a: 'It is showing the destination of the current pattern, not the destination you imagined. Read it through the lens of cards 7 and 9 — your stance and your inner charge — and the disconnect usually resolves.',
      },
      {
        q: 'Should I shuffle once or between sections?',
        a: 'Once. The whole spread is a single field of information. Re-shuffling mid-read fragments the picture and trains the deck to give you what you want instead of what is true.',
      },
    ],
    relatedSpreads: [
      'three-card-past-present-future',
      'horseshoe',
      'crossroads',
    ],
  },
  {
    slug: 'horseshoe',
    name: 'Horseshoe',
    category: 'general',
    cardCount: 7,
    difficulty: 'intermediate',
    durationMin: 25,
    shortDescription:
      'A seven-card arc — the situation, its forces, the people involved, and the path to take.',
    longDescription:
      'Shaped like a shoe arching from past to future, the Horseshoe is the spread to reach for when a Three Card reading feels too thin and a Celtic Cross feels too heavy. Seven cards trace a complete situation: how it began, where it stands now, what is coming, who is influencing it, what is blocking you, what to do, and the likely result. It is the workhorse spread for life decisions you can name in a single sentence but cannot solve in a single thought.',
    bestFor: [
      'A situation that has a clear question but fuzzy details',
      'Reading on a relationship with a third party in the mix',
      'Mid-sized career or financial decisions',
      'When you want practical advice, not just diagnosis',
      'Following up on a Three Card reading that left questions',
    ],
    whenToUse:
      'Use the Horseshoe once a question has matured past the daily-pull stage but before it becomes a full life-mapping session. It is especially good when you suspect external influences (a partner, a boss, a parent) are shaping the situation alongside your own actions.',
    positions: [
      {
        position: 1,
        name: 'How this began',
        meaning:
          'The seed of the current situation — the moment, decision, or pattern that set the wheel in motion. Often older than you expect.',
      },
      {
        position: 2,
        name: 'Where you are now',
        meaning:
          'The honest present — the lived reality of the situation, not the version you tell others. The rest of the spread is read in relation to this card.',
      },
      {
        position: 3,
        name: 'What is coming next',
        meaning:
          'The near future — the event, energy, or opening already approaching. Read alongside card 7 for the longer arc.',
      },
      {
        position: 4,
        name: 'What you bring to the situation',
        meaning:
          'Your gifts, blind spots, and habitual stance. Reveals where your own behavior is amplifying or muting what the situation needs.',
      },
      {
        position: 5,
        name: 'External influences and people',
        meaning:
          'The forces outside your control — other people, environments, timing. Useful for separating what is yours from what belongs to someone else.',
      },
      {
        position: 6,
        name: 'What you should do next',
        meaning:
          'The most aligned next action. Not a strategy — a stance. Tarot points at posture, you choose the tactics.',
      },
      {
        position: 7,
        name: 'The likely outcome',
        meaning:
          'The result if you follow the advice in card 6. A forecast, not a fixed future — and the most likely to shift if you change your stance.',
      },
    ],
    exampleQuestions: [
      'How do I navigate this tension at work without making it worse?',
      'Should I take this leap or stay where I am?',
      'What is going on between me and my best friend lately?',
      'How do I handle the next phase of this move?',
      'What do I need to understand about my finances right now?',
    ],
    faqs: [
      {
        q: 'How is this different from a Celtic Cross?',
        a: 'The Horseshoe is more linear and more action-oriented. The Celtic Cross excavates a situation from every angle; the Horseshoe asks "what do I do now" and walks you through the answer in seven steps.',
      },
      {
        q: 'What if the advice card and the outcome card seem to contradict?',
        a: 'Read it as a fork. The advice card shows the path that leads to the outcome card. If they feel disconnected, the outcome is likely the result of ignoring the advice.',
      },
      {
        q: 'Can I use this for a question about another person?',
        a: 'Yes — card 5 is built for it. Phrase the question around your relationship to that person rather than their inner life, which tarot reads less reliably than your own.',
      },
      {
        q: 'How long does the "near future" card cover?',
        a: 'Roughly the next four to six weeks for most questions. For long-arc questions like a career change, treat it as the next chapter rather than the next month.',
      },
      {
        q: 'Should I act on the advice card immediately?',
        a: 'Sit with it for at least a day. Tarot advice that bypasses reflection tends to bypass results too. Journal first, then act.',
      },
    ],
    relatedSpreads: [
      'celtic-cross',
      'three-card-past-present-future',
      'crossroads',
    ],
  },

  // ----------------------------------------------------------------------
  // LOVE
  // ----------------------------------------------------------------------
  {
    slug: 'relationship-cross',
    name: 'Relationship Cross',
    category: 'love',
    cardCount: 5,
    difficulty: 'intermediate',
    durationMin: 20,
    shortDescription:
      'Five cards mapping you, them, the connection, the challenge, and the outcome.',
    longDescription:
      'The Relationship Cross is the cleanest way to read on a partnership without losing yourself in projection. Five cards: one for you, one for them, one for the connection between you, one for the challenge facing it, and one for the outcome. It treats the relationship as a third entity — a "we" with its own energy — and reveals where you and they are actually meeting versus where you are passing each other in the dark.',
    bestFor: [
      'Reading on an existing relationship that feels stuck',
      'Understanding why a connection runs hot and cold',
      'Pre-conversation clarity before a tough talk',
      'Friendship and family dynamics, not only romance',
      'Comparing your inner state with theirs',
    ],
    whenToUse:
      'Use this spread when the relationship is real and ongoing — you are dating, partnered, married, deeply friends, or co-parenting. It is less useful for crushes, situationships, or strangers, where there is not yet enough relational fabric to read.',
    positions: [
      {
        position: 1,
        name: 'You in this relationship',
        meaning:
          'How you are actually showing up — your role, mood, and energetic stance, separate from how you imagine yourself behaving.',
      },
      {
        position: 2,
        name: 'Them in this relationship',
        meaning:
          'How the other person is showing up. Read it lightly — tarot reads relationships better than it reads minds, so treat this as their stance toward the connection, not a verdict on them.',
      },
      {
        position: 3,
        name: 'The connection between you',
        meaning:
          'The "we" — the energy that exists only when both of you are in the room. Often very different from either individual card.',
      },
      {
        position: 4,
        name: 'The challenge between you',
        meaning:
          'The tension, mismatch, or unspoken issue that the connection is currently working with. Sometimes the very thing keeping the relationship alive.',
      },
      {
        position: 5,
        name: 'Where this is heading',
        meaning:
          'The trajectory of the connection if both of you keep meeting it the way cards 1 and 2 describe. Read this lightly — relationships are co-created, so the future shifts when either person shifts.',
      },
    ],
    exampleQuestions: [
      'What is really going on between me and my partner?',
      'Why has my friendship with X felt off lately?',
      'How is my relationship with my mother actually working?',
      'Are we growing together or apart?',
      'What is the real challenge in this connection?',
    ],
    faqs: [
      {
        q: 'Can I use this spread for a third-party question — like reading on someone else\'s relationship?',
        a: 'It is not its strength. Tarot reads sharpest when you are in the field. For an outside relationship, read on your relationship to the situation, not on the other couple.',
      },
      {
        q: 'What if their card looks much harsher than mine?',
        a: 'Check your own card again. People rarely show up much better than the person they are reading on, and a harsh "them" card often mirrors something we are not ready to see in our own.',
      },
      {
        q: 'Does the outcome card mean we are destined to break up if it is bad?',
        a: 'No. It shows the trajectory of the current pattern. Relationships are responsive — the moment either of you genuinely changes the way you meet the connection, the forecast updates.',
      },
      {
        q: 'How often should I run this spread on the same relationship?',
        a: 'No more than once a month for the same question. Repeat readings within days dilute the signal and tend to mirror your anxiety rather than the relationship.',
      },
      {
        q: 'Can I read this for a relationship that has not started yet?',
        a: 'Use the Soulmate spread instead. The Relationship Cross needs an actual living connection to read on — it is built to map a "we" that already exists.',
      },
    ],
    relatedSpreads: ['soulmate', 'love-yes-no', 'three-card-past-present-future'],
  },
  {
    slug: 'soulmate',
    name: 'Soulmate Spread',
    category: 'love',
    cardCount: 7,
    difficulty: 'intermediate',
    durationMin: 30,
    shortDescription:
      'Seven cards exploring the love that is coming, who you must become to meet it, and the lessons en route.',
    longDescription:
      'The Soulmate Spread is for the question underneath the question — not "when will I meet them" but "what kind of love am I actually preparing for, and what is in the way." Seven cards trace your current relationship to love itself, the patterns you bring, the type of partner moving toward you, the timing, and the inner work you are being asked to do. It treats soulmate not as a fated person but as a relationship you are actively becoming ready for.',
    bestFor: [
      'When you are single and want clarity, not just hope',
      'Recovering from a breakup and asking what is next',
      'Examining the patterns you keep recreating in love',
      'Understanding what kind of partner is actually right for you',
      'Distinguishing a soulmate connection from a karmic loop',
    ],
    whenToUse:
      'Use this spread during a quiet phase of your love life — not in the heat of a new crush, when projection runs high, but in the calmer moments where real reflection is possible. New Moon and post-breakup are particularly fertile times for it.',
    positions: [
      {
        position: 1,
        name: 'Your current relationship to love',
        meaning:
          'How you are actually relating to love right now — guarded, open, exhausted, hopeful, performing. The honest emotional baseline that everything else is read against.',
      },
      {
        position: 2,
        name: 'The pattern you keep repeating',
        meaning:
          'The relational loop that has shown up across multiple connections. Naming it is half the work of breaking it.',
      },
      {
        position: 3,
        name: 'Who you must become to meet them',
        meaning:
          'The inner shift, capacity, or maturity being asked of you. Tarot rarely shows a soulmate before this card has been integrated.',
      },
      {
        position: 4,
        name: 'The energy of the partner approaching',
        meaning:
          'The qualities, stance, or archetype of the partner moving toward you. Read this as a flavor, not a profile — tarot does not deliver names or eye colors.',
      },
      {
        position: 5,
        name: 'How you will meet',
        meaning:
          'The context of the meeting — the kind of environment, mood, or life-phase in which the connection becomes possible. Often surprisingly ordinary.',
      },
      {
        position: 6,
        name: 'The first real test',
        meaning:
          'The early challenge that will let you know whether this is a soulmate connection or another iteration of the old pattern.',
      },
      {
        position: 7,
        name: 'The deeper purpose of this love',
        meaning:
          'What this relationship is meant to grow in you. Not necessarily forever — soulmates can be season-long, and the soul-work is always the point.',
      },
    ],
    exampleQuestions: [
      'What is in the way of me meeting the right person?',
      'Why do I keep attracting the same kind of partner?',
      'Am I ready for a real relationship right now?',
      'What kind of love is actually moving toward me?',
      'What is my current love life trying to teach me?',
    ],
    faqs: [
      {
        q: 'Will this spread tell me when I will meet them?',
        a: 'No. Tarot is unreliable on exact dates. It will tell you what has to happen first, which is far more useful than a calendar marker.',
      },
      {
        q: 'Does "soulmate" mean one fated person?',
        a: 'Not in this spread. Soulmate here means a relationship that grows the soul. You may have several across a lifetime, and the lessons in card 7 are the truest signal that someone fits the role.',
      },
      {
        q: 'What if card 4 looks nothing like the people I usually date?',
        a: 'That is often the point. The pattern card (2) shows who you have been choosing. The approaching partner card (4) often shows who is finally available once the pattern is broken.',
      },
      {
        q: 'Can I ask this spread about a specific person I already know?',
        a: 'Use the Relationship Cross instead. The Soulmate Spread is for love in general — pinning it to one person tends to produce projection rather than insight.',
      },
      {
        q: 'How often should I run this spread?',
        a: 'No more than once every two to three months. The lessons in cards 2 and 3 take time to integrate, and re-pulling too quickly produces noise instead of progress.',
      },
      {
        q: 'What if I am already in a relationship — can I still use it?',
        a: 'Yes, but reframe it as "is this person my current soulmate connection." The Relationship Cross is usually a better fit, but the Soulmate Spread can clarify whether the soul-work in card 7 is actually happening between you.',
      },
    ],
    relatedSpreads: ['relationship-cross', 'love-yes-no', 'higher-self'],
  },
  {
    slug: 'love-yes-no',
    name: 'Love Yes/No',
    category: 'love',
    cardCount: 3,
    difficulty: 'beginner',
    durationMin: 8,
    shortDescription:
      'Three cards for a focused yes-or-no answer to a single love question.',
    longDescription:
      'The Love Yes/No is a focused, binary spread for the moments when you do not need a story — you need an answer. Three cards: the energy of the situation, the answer, and the context that shapes it. It works best when the question is genuinely yes-or-no and when you can accept a "no" as gracefully as a "yes." If the question has nuance, use the Relationship Cross instead.',
    bestFor: [
      'A specific binary love question (text them, accept the date, etc.)',
      'When you have been overthinking a small choice',
      'Quick check-ins between bigger readings',
      'Confirming a gut feeling you already have',
      'Pre-action gut-check before sending the message',
    ],
    whenToUse:
      'Reach for this spread when the question is small enough to fit in one sentence and the answer is genuinely binary. If you find yourself wanting a "maybe," your question is not actually yes-no and a different spread will serve you better.',
    positions: [
      {
        position: 1,
        name: 'The energy of the question',
        meaning:
          'The vibe surrounding the situation right now — anxious, fated, fizzling, charged. Sets the tone for how to read the answer card.',
      },
      {
        position: 2,
        name: 'The answer',
        meaning:
          'A leaning yes or no based on the card pulled. Upright tends toward yes, reversed or challenging cards tend toward no — but read the image, not just the label.',
      },
      {
        position: 3,
        name: 'What you need to know about the answer',
        meaning:
          'The qualifier — the condition, warning, or reframe that shapes how to act on the answer. Often the most useful card of the three.',
      },
    ],
    exampleQuestions: [
      'Should I text them first?',
      'Is this person actually interested in me?',
      'Should I accept this date?',
      'Is now a good time to bring up the relationship talk?',
      'Should I unblock them?',
    ],
    faqs: [
      {
        q: 'How do I know if the answer is yes or no?',
        a: 'Read the card image first, then the traditional meaning. Bright, forward-moving, light cards lean yes; heavy, reversed, blocked cards lean no. The third card often resolves any ambiguity.',
      },
      {
        q: 'What if I get the same answer to a question I keep asking?',
        a: 'Stop asking. Repeated yes-no readings on the same question erode the deck and your trust in it. The first answer is the answer.',
      },
      {
        q: 'Can I use this for non-love yes-no questions?',
        a: 'Use the Yes-No Pulse spread instead — it is built for general binary questions with more nuance. The Love Yes/No is tuned specifically to romantic and relational energy.',
      },
      {
        q: 'What if the answer is yes but the context card is harsh?',
        a: 'The answer is "yes, but" — yes the action will happen, but the context card is warning you about how it will land. Heed it.',
      },
      {
        q: 'Should I ask the same question twice if I do not like the answer?',
        a: 'No. Sit with the answer for at least twenty-four hours. Asking twice within a day collapses the integrity of the spread.',
      },
    ],
    relatedSpreads: ['relationship-cross', 'yes-no-pulse', 'one-card-daily'],
  },

  // ----------------------------------------------------------------------
  // CAREER
  // ----------------------------------------------------------------------
  {
    slug: 'career-path',
    name: 'Career Path',
    category: 'career',
    cardCount: 5,
    difficulty: 'intermediate',
    durationMin: 20,
    shortDescription:
      'Five cards illuminating where your career stands, what is blocking it, and where it is asking you to go.',
    longDescription:
      'The Career Path spread is for the moments when you can feel the friction in your work life but cannot quite name it. Five cards trace your current professional reality, the gifts you are not yet using, the block you keep hitting, the next aligned step, and the longer-term direction your work is being pulled toward. It is less about a single job and more about the underlying career arc you are actually living.',
    bestFor: [
      'Annual or quarterly career reviews',
      'When you sense you are in the wrong role but cannot name why',
      'After a promotion, layoff, or major project ending',
      'Distinguishing a calling from a comfortable habit',
      'Mid-career professionals questioning the trajectory',
    ],
    whenToUse:
      'Use this spread when you have at least an hour of quiet and a journal. It is best on a weekend morning, not in the middle of a stressful workday — clarity about a career arc is hard to find while still inside the urgency of the week.',
    positions: [
      {
        position: 1,
        name: 'Where you stand professionally',
        meaning:
          'Your honest current state — energy levels, sense of purpose, alignment between role and identity. Not the version you put in your bio.',
      },
      {
        position: 2,
        name: 'A gift you are underusing',
        meaning:
          'A skill, instinct, or natural strength your current role does not draw on. Often the very thing that would change everything if it had room.',
      },
      {
        position: 3,
        name: 'The block in the way',
        meaning:
          'The internal or external obstacle keeping the gift in card 2 from coming through. Sometimes a fear, sometimes a structure.',
      },
      {
        position: 4,
        name: 'Your next aligned step',
        meaning:
          'The most useful action you can take from where you stand right now. Usually smaller and more specific than you expect.',
      },
      {
        position: 5,
        name: 'The direction your career is calling toward',
        meaning:
          'The longer arc — the kind of work, role, or impact pulling on you across years, not weeks. Read it as a compass, not a job title.',
      },
    ],
    exampleQuestions: [
      'Am I in the right career?',
      'What is keeping me stuck at this level?',
      'What is my real professional gift, the one I keep ignoring?',
      'Where is my career actually trying to take me?',
      'What is the smartest next move from where I am?',
    ],
    faqs: [
      {
        q: 'How is this different from a Job Decision spread?',
        a: 'Career Path looks at the arc; Job Decision compares two specific options. If you have a concrete offer in front of you, use Job Decision. If you are zoomed out and asking "where is this all going," use Career Path.',
      },
      {
        q: 'What if card 5 looks nothing like my current industry?',
        a: 'Take it as a signal, not a sentence. Career direction often shows up as energy and impact rather than a specific role — translate it into the language of your industry before assuming you have to start over.',
      },
      {
        q: 'My block card and my next-step card seem to contradict. Why?',
        a: 'They are often the same thing seen from two angles. The block describes the wall, the next step describes the door in it. Read them together rather than separately.',
      },
      {
        q: 'Should I make a major decision based on this reading alone?',
        a: 'No. Use it to clarify what you already half-know, then take it into journaling, conversations, and ideally a second reading a few weeks later before you act.',
      },
      {
        q: 'How often should I run this spread?',
        a: 'Once a quarter is plenty. Career arcs move slowly, and re-pulling too often creates restlessness without insight.',
      },
    ],
    relatedSpreads: ['job-decision', 'money-flow', 'crossroads'],
  },
  {
    slug: 'job-decision',
    name: 'Job Decision',
    category: 'career',
    cardCount: 5,
    difficulty: 'intermediate',
    durationMin: 20,
    shortDescription:
      'Five cards comparing your current job and a new opportunity side by side.',
    longDescription:
      'The Job Decision spread is built for the specific moment when you have an offer in hand, a current role in the other, and a genuine choice between them. Five cards: the energy of staying, the energy of leaving, the hidden factor, what each path is actually asking of you, and the outcome that respects your real growth. It is a comparison spread, not a verdict — its job is to surface what your gut already half-knows so you can choose with both data and intuition aligned.',
    bestFor: [
      'A real offer versus your current role',
      'Considering a lateral move within the same company',
      'Weighing freelance versus full-time',
      'Pre-resignation gut check',
      'Comparing two final-round opportunities',
    ],
    whenToUse:
      'Use this spread once both options are concrete enough to describe in a sentence each — title, scope, context. Vague "what if I left" energy will produce vague cards. Sleep on the spread before acting on it.',
    positions: [
      {
        position: 1,
        name: 'The energy of your current role',
        meaning:
          'The honest frequency of staying — what your body knows about this job, separate from the story you tell about it.',
      },
      {
        position: 2,
        name: 'The energy of the new opportunity',
        meaning:
          'The honest frequency of the new role — its true texture, beyond the recruiter pitch and the offer letter.',
      },
      {
        position: 3,
        name: 'The hidden factor',
        meaning:
          'The variable you have not been weighing — a person, a timing issue, a deeper motive, a sunk cost. Often the most important card.',
      },
      {
        position: 4,
        name: 'What each path is asking of you',
        meaning:
          'The growth, sacrifice, or shadow-work the choice itself requires. Not which path is "right" — what choosing demands.',
      },
      {
        position: 5,
        name: 'The outcome that honors your growth',
        meaning:
          'The trajectory if you choose in alignment with cards 3 and 4. Less about which option "wins" and more about which version of you the cards are pointing toward.',
      },
    ],
    exampleQuestions: [
      'Should I take the new job or stay where I am?',
      'Should I leave my full-time role to freelance?',
      'Is this lateral move actually a step forward?',
      'Should I accept the counter-offer?',
      'Should I take the lower-paying job that excites me more?',
    ],
    faqs: [
      {
        q: 'What if both option cards (1 and 2) look equally good — or equally bad?',
        a: 'Read card 3, the hidden factor. When the surface is even, the tiebreaker almost always lives in the variable you have not been weighing.',
      },
      {
        q: 'Should I use this spread before I have an actual offer?',
        a: 'No. Without two concrete options, the spread loses its grip. Use Career Path instead — it is built for the open-ended phase.',
      },
      {
        q: 'What if the "growth" path is also the harder path?',
        a: 'Almost always is. Card 4 names the cost; it does not pay it. Your job is to decide whether you are ready to pay it now or whether the timing is wrong.',
      },
      {
        q: 'Can I rerun this spread once I get more information?',
        a: 'Yes — once. New material information (a final number, a new boss confirmed) is a legitimate reason to re-pull. Re-running because you do not like the answer is not.',
      },
      {
        q: 'How much should I trust this spread over the practical numbers?',
        a: 'Use both. The spread is for the parts of the decision that do not show up on a spreadsheet. If the numbers say no and the cards say yes, you are reading either the spread or the spreadsheet wrong.',
      },
    ],
    relatedSpreads: ['career-path', 'crossroads', 'money-flow'],
  },
  {
    slug: 'money-flow',
    name: 'Money Flow',
    category: 'career',
    cardCount: 6,
    difficulty: 'intermediate',
    durationMin: 25,
    shortDescription:
      'Six cards mapping income, expenses, hidden leaks, advice, outcome, and the present truth of your finances.',
    longDescription:
      'Money Flow is a spread for the people who have read enough Three Card spreads on money and want a real diagnostic. Six cards trace the actual mechanics of your relationship with money: where it is coming in, where it is going out, what is leaking that you do not see, what advice the cards are offering, the trajectory if you act on the advice, and a candid snapshot of your present financial life. It is the closest tarot gets to a financial physical exam.',
    bestFor: [
      'A financial reset after a chaotic year',
      'Understanding why money keeps slipping through your fingers',
      'Pre-budget planning for a new quarter or year',
      'Untangling emotion from numbers',
      'Identifying invisible drains on income or energy',
    ],
    whenToUse:
      'Use this spread when you have your actual financial picture in front of you — bank balance, recent statements, current obligations. The cards work best when paired with reality, not used to avoid it.',
    positions: [
      {
        position: 1,
        name: 'The state of your income',
        meaning:
          'The energy of how money is coming in — strong, scattered, undervalued, dependent on a single source. The starting point of the diagnosis.',
      },
      {
        position: 2,
        name: 'The state of your expenses',
        meaning:
          'How money is going out — purposefully, anxiously, status-driven, leaking. Read alongside card 1 to see the actual gap.',
      },
      {
        position: 3,
        name: 'The hidden drain',
        meaning:
          'The invisible leak — a pattern, person, or commitment quietly pulling money or energy in a way the spreadsheet does not show.',
      },
      {
        position: 4,
        name: 'The advice the cards are offering',
        meaning:
          'The shift, action, or stance most likely to move the needle. Often unglamorous and unsexy; almost always practical.',
      },
      {
        position: 5,
        name: 'The outcome if you take the advice',
        meaning:
          'The trajectory of your finances if card 4 is acted on. A forecast, not a guarantee — and the most flexible card in the spread.',
      },
      {
        position: 6,
        name: 'The present truth',
        meaning:
          'A grounding snapshot of where you really are right now — useful as a reality check after the other five cards have made you hopeful or anxious.',
      },
    ],
    exampleQuestions: [
      'Why am I making more money but feeling more broke?',
      'Where is the leak in my finances?',
      'How do I get out of this debt cycle?',
      'What is my real relationship with money right now?',
      'What financial move should I focus on this quarter?',
    ],
    faqs: [
      {
        q: 'Will this spread predict whether I will get rich?',
        a: 'No. Tarot is poor at numerical prediction and excellent at pattern. The point of this spread is to make the pattern visible so the numbers can move.',
      },
      {
        q: 'My income card looks great but my outcome card is heavy. Why?',
        a: 'Almost always the hidden drain card (3). High income with poor outcome is the classic signature of a leak — a habit, relationship, or commitment quietly siphoning the gains.',
      },
      {
        q: 'Should I use this spread to decide whether to make a specific purchase?',
        a: 'No — use Yes-No Pulse for that. Money Flow is for systemic questions about your financial life, not single transactions.',
      },
      {
        q: 'What if the advice card asks for something that feels too small to matter?',
        a: 'Tarot rarely advises grand gestures on money. Small structural shifts (one habit, one boundary, one cancelled subscription) compound faster than dramatic ones.',
      },
      {
        q: 'How often should I run this spread?',
        a: 'Quarterly. Monthly is too often — financial patterns need at least a few weeks to shift before a re-read shows real change.',
      },
    ],
    relatedSpreads: ['career-path', 'job-decision', 'crossroads'],
  },

  // ----------------------------------------------------------------------
  // DAILY
  // ----------------------------------------------------------------------
  {
    slug: 'mind-body-spirit',
    name: 'Mind, Body, Spirit',
    category: 'daily',
    cardCount: 3,
    difficulty: 'beginner',
    durationMin: 12,
    shortDescription:
      'Three cards for a holistic check-in across your mental, physical, and spiritual layers.',
    longDescription:
      'Mind, Body, Spirit is a daily-life triangulation spread. Three cards check in with each layer of your experience: what your mind is actually doing today, what your body is asking for, and what your spirit is reaching toward. Used regularly, it becomes a near-meditative practice — a way to notice when one layer is dragging the other two. It is small enough to do in twelve minutes and deep enough to surface real misalignment between thought, sensation, and intuition.',
    bestFor: [
      'Mornings when you feel out of sync with yourself',
      'After a long week of work and overstimulation',
      'Beginners who want more than One Card Daily',
      'A weekly Sunday-night reset',
      'Pairing with a short meditation or stretch',
    ],
    whenToUse:
      'Use this spread when you suspect one layer of your life is overcompensating for another — racing mind in a tired body, busy schedule starving your spirit. It works particularly well as a Sunday check-in to set the tone for the week.',
    positions: [
      {
        position: 1,
        name: 'What your mind is doing',
        meaning:
          'The actual texture of your thoughts right now — sharp, foggy, looping, present. Names the mental weather you are operating in.',
      },
      {
        position: 2,
        name: 'What your body is asking for',
        meaning:
          'The need underneath the noise — rest, movement, food, touch, stillness. Often the layer you are most actively ignoring.',
      },
      {
        position: 3,
        name: 'What your spirit is reaching toward',
        meaning:
          'The longer thread — the meaning, connection, or aliveness you are quietly hungry for. The card most likely to surprise you.',
      },
    ],
    exampleQuestions: [
      'How am I really doing today, all the way down?',
      'Where am I out of sync with myself this week?',
      'What does each layer of me need right now?',
      'What is my body trying to tell me that I keep missing?',
      'What is my soul actually asking for under all this noise?',
    ],
    faqs: [
      {
        q: 'What if all three cards point to the same thing?',
        a: 'A strong, unified signal. When mind, body, and spirit agree, the action they point toward is almost always correct — and almost always one you have been postponing.',
      },
      {
        q: 'What if one card looks great and the other two look heavy?',
        a: 'You are leaning on one layer to compensate for the other two. A radiant mind card with a depleted body card usually means you are thinking your way through exhaustion.',
      },
      {
        q: 'Can I use this for someone else?',
        a: 'Less effective. Mind, body, spirit lives inside you — reading it on someone else collapses into projection quickly. Stick to yourself.',
      },
      {
        q: 'How does this differ from One Card Daily?',
        a: 'One Card Daily gives you a theme; Mind, Body, Spirit gives you a triangulation. Use the daily card for tone and this one for self-attunement.',
      },
      {
        q: 'Should I act on the body card immediately?',
        a: 'Where possible, yes. The body card is the most actionable of the three and often the layer most starved for response.',
      },
    ],
    relatedSpreads: ['one-card-daily', 'higher-self', 'weekly-forecast'],
  },
  {
    slug: 'weekly-forecast',
    name: 'Weekly Forecast',
    category: 'daily',
    cardCount: 7,
    difficulty: 'intermediate',
    durationMin: 25,
    shortDescription:
      'Seven cards, one for each day of the upcoming week — a working calendar of energy.',
    longDescription:
      'The Weekly Forecast lays out one card for each day of the coming week, turning your tarot deck into a working calendar of energy. It is not about predicting events; it is about meeting each day with the right posture. Mondays might demand initiative, Wednesdays might call for rest, Fridays might warrant caution. Read on a Sunday night with a journal, the spread becomes a planning tool that respects both your schedule and your inner weather.',
    bestFor: [
      'A Sunday night reset before the week begins',
      'Weeks with a heavy or unusual calendar',
      'Spotting the day to schedule a hard conversation',
      'Pairing tarot with practical planning',
      'Anyone who plans by week, not by day',
    ],
    whenToUse:
      'Best pulled on a Sunday evening before the week starts, with your calendar visible. The spread loses some power once the week is already in motion — by Wednesday, the unread cards have less room to be acted on.',
    positions: [
      {
        position: 1,
        name: 'Monday — opening tone',
        meaning:
          'The energy that wants to set up the week. Pay attention to whether Monday is asking for momentum or for grounding before momentum.',
      },
      {
        position: 2,
        name: 'Tuesday — building',
        meaning:
          'Where the week starts to take shape. Often the day for the work that requires sustained focus rather than fresh starts.',
      },
      {
        position: 3,
        name: 'Wednesday — pivot point',
        meaning:
          'The hinge of the week. Worth checking your direction here — small course corrections on Wednesday compound by Friday.',
      },
      {
        position: 4,
        name: 'Thursday — depth',
        meaning:
          'The day the week tends to ask for honesty — about energy, capacity, and what is actually working. Good day for a hard conversation if the card supports it.',
      },
      {
        position: 5,
        name: 'Friday — closing',
        meaning:
          'How the work-week wraps. Tells you whether to push through to finish or release something unfinished.',
      },
      {
        position: 6,
        name: 'Saturday — restoration',
        meaning:
          'The energy of how rest, play, and recovery want to show up. Often warns when "rest" is actually avoidance.',
      },
      {
        position: 7,
        name: 'Sunday — integration',
        meaning:
          'The closing card of the week — what you are meant to integrate, journal, or take into the week ahead.',
      },
    ],
    exampleQuestions: [
      'How is my week shaping up energetically?',
      'Which day should I schedule the difficult meeting?',
      'When is the best time to ask for what I want this week?',
      'Where will I have to be careful this week?',
      'How can I move through this week with intention?',
    ],
    faqs: [
      {
        q: 'Should I read each card the night before, or all at once?',
        a: 'All at once on Sunday gives you the full arc; reading each card the night before adds nuance. The strongest practice is both — overview Sunday, deep dive each evening.',
      },
      {
        q: 'What if a heavy card lands on a day I cannot move?',
        a: 'You do not have to move the day — you adjust the posture. A heavy card on a fixed meeting day is asking for more grounding before the meeting, not for the meeting to be cancelled.',
      },
      {
        q: 'Does this spread predict events?',
        a: 'No. It maps energy, not appointments. Treat each card as a forecast of inner weather rather than outer events.',
      },
      {
        q: 'What if my Saturday and Sunday cards both look heavy?',
        a: 'A signal that the week ahead needs more recovery than you have been giving yourself. Treat it as data — and consider a real day off.',
      },
      {
        q: 'Can I run this spread mid-week?',
        a: 'You can, but pull only for the days remaining. A four-card mini-forecast on Wednesday is more honest than re-pulling for the days already lived.',
      },
    ],
    relatedSpreads: ['one-card-daily', 'mind-body-spirit', 'three-card-past-present-future'],
  },

  // ----------------------------------------------------------------------
  // SPIRITUAL
  // ----------------------------------------------------------------------
  {
    slug: 'shadow-work',
    name: 'Shadow Work',
    category: 'spiritual',
    cardCount: 5,
    difficulty: 'advanced',
    durationMin: 35,
    shortDescription:
      'Five cards illuminating what you have disowned, why, and how to integrate it.',
    longDescription:
      'Shadow Work is a confronting spread, in the Jungian sense — it reaches for the parts of yourself you have hidden, exiled, or projected onto others. Five cards trace the shadow, the mask that hides it, the moment it formed, what it is actually trying to protect, and the path of integration. It is not for casual evenings; it is for the work that produces real, lasting change. Pair it with a journal and ideally a therapist or trusted friend.',
    bestFor: [
      'Repeating patterns that you cannot seem to break',
      'Reactions disproportionate to their trigger',
      'A specific shadow you have already started naming',
      'Work alongside therapy or somatic practice',
      'Times when you have stopped making progress on the same issue',
    ],
    whenToUse:
      'Use this spread when you are stable enough to look at hard material — not in the middle of a crisis, but in the quieter season after one. Set aside at least an hour, and have a way to ground yourself afterward (a walk, a friend to call, a journal).',
    history:
      'Tarot shadow work owes much to Carl Jung\'s idea of the shadow — the disowned parts of the self that resurface as projection. Modern shadow spreads emerged in the late twentieth century as therapy-influenced tarot writers like Mary K. Greer popularized integrative readings.',
    positions: [
      {
        position: 1,
        name: 'The shadow you are carrying',
        meaning:
          'The disowned trait, emotion, or part of yourself currently active beneath your awareness. Often the trait you most criticize in others.',
      },
      {
        position: 2,
        name: 'The mask you wear over it',
        meaning:
          'The persona, behavior, or compensation you use to hide the shadow — including from yourself. Naming the mask softens it.',
      },
      {
        position: 3,
        name: 'When the shadow formed',
        meaning:
          'The era, event, or relationship in which this part was first exiled. Not necessarily a single moment — sometimes a long-running condition.',
      },
      {
        position: 4,
        name: 'What the shadow is trying to protect',
        meaning:
          'The deeper love, dignity, or safety that the shadow originally formed to defend. Usually moving once you see it.',
      },
      {
        position: 5,
        name: 'The path of integration',
        meaning:
          'The first concrete step of welcoming this part back — often small, embodied, and unglamorous. The work of years, started today.',
      },
    ],
    exampleQuestions: [
      'What part of me am I disowning right now?',
      'Why do I keep reacting so strongly to this person?',
      'What pattern keeps running my life?',
      'What am I afraid to admit about myself?',
      'How do I begin integrating the parts I have been hiding?',
    ],
    faqs: [
      {
        q: 'What if the shadow card looks like a "good" card?',
        a: 'Common. Many shadows are disowned positive traits — assertiveness, sexuality, ambition, joy. The exile, not the moral valence, is what makes it shadow.',
      },
      {
        q: 'Should I act on the integration card right away?',
        a: 'Slowly. Shadow integration moves at the pace of nervous system safety. Read it, journal it, and let the action emerge over weeks rather than hours.',
      },
      {
        q: 'Can I do this spread alone?',
        a: 'Yes, but the work goes deeper with a therapist or a trusted friend in the loop. Tarot can name the shadow; relationship is what integrates it.',
      },
      {
        q: 'What if the formation card points to a memory I do not remember?',
        a: 'You do not have to recover a memory. Shadow work proceeds by feeling and pattern, not by detective work. Sit with the era the card suggests rather than chasing a specific event.',
      },
      {
        q: 'How often should I run this spread?',
        a: 'No more than once every couple of months for the same shadow. Real integration is slow, and re-pulling too quickly creates analysis instead of change.',
      },
      {
        q: 'What if I get triggered by what comes up?',
        a: 'Stop the reading, ground yourself, and reach out to a person you trust. Tarot is a tool, not a substitute for support — and shadow work in particular benefits from human company.',
      },
    ],
    relatedSpreads: ['higher-self', 'full-moon-release', 'celtic-cross'],
  },
  {
    slug: 'higher-self',
    name: 'Higher Self Guidance',
    category: 'spiritual',
    cardCount: 4,
    difficulty: 'intermediate',
    durationMin: 20,
    shortDescription:
      'Four cards channeling guidance from the wisest, most expanded version of you.',
    longDescription:
      'The Higher Self spread treats your future, integrated self as a real source of guidance — the version of you who has already lived through the question you are asking. Four cards: where your higher self currently meets you, the message it is offering, the obstacle between you, and the practice that keeps the connection alive. It is gentler than Shadow Work but not less serious — its job is to remind you of what you already know on your best days.',
    bestFor: [
      'Reconnecting after a period of being lost in noise',
      'Pre-meditation or ritual readings',
      'When you need encouragement, not diagnosis',
      'Paired with a regular spiritual practice',
      'Birthdays, new years, or other threshold moments',
    ],
    whenToUse:
      'Use this spread in a quiet, undistracted setting — early morning, candle lit, phone elsewhere. It works best when you slow your shuffle and breathe deliberately before pulling, treating the spread as a conversation rather than a query.',
    positions: [
      {
        position: 1,
        name: 'Where your higher self meets you now',
        meaning:
          'The current state of the connection — strong, fraying, dormant, opening. The honest baseline of the relationship.',
      },
      {
        position: 2,
        name: 'The message it is offering',
        meaning:
          'The truth your higher self most wants you to hear right now. Often something you already half-know but have stopped trusting.',
      },
      {
        position: 3,
        name: 'The obstacle between you',
        meaning:
          'The static, fear, or distraction blocking clearer reception. Usually relational or somatic, rarely intellectual.',
      },
      {
        position: 4,
        name: 'The practice that keeps the channel open',
        meaning:
          'The simple, repeatable action that maintains the connection. Often something modest you have done before and let slip.',
      },
    ],
    exampleQuestions: [
      'What does my higher self want me to know right now?',
      'How do I trust myself again?',
      'What is the truth underneath all this noise?',
      'What practice will reconnect me to my deeper knowing?',
      'What am I refusing to hear from myself?',
    ],
    faqs: [
      {
        q: 'Is "higher self" a religious concept?',
        a: 'In this spread, no. Higher self can mean the wiser version of you, your future self, your soul, your conscience, or simply the part of you that already knows. Use whatever frame fits your beliefs.',
      },
      {
        q: 'What if the message card feels generic?',
        a: 'Sit with it longer. Higher-self messages are often disarmingly simple — "rest," "tell the truth," "begin again." Their power is in being heard, not in being clever.',
      },
      {
        q: 'How is this different from Shadow Work?',
        a: 'Higher Self speaks from your most integrated place; Shadow Work speaks from your most exiled place. They are complementary — many people pull both in the same week.',
      },
      {
        q: 'Should I journal the message verbatim?',
        a: 'Yes. Translating the card into a single sentence in your own voice is the easiest way to keep the message alive past the reading.',
      },
      {
        q: 'Can I ask follow-up questions?',
        a: 'One, maximum. Pull a single clarifying card and stop there. Higher Self readings lose their signal quickly when interrogated.',
      },
    ],
    relatedSpreads: ['shadow-work', 'mind-body-spirit', 'new-moon-intentions'],
  },

  // ----------------------------------------------------------------------
  // LUNAR
  // ----------------------------------------------------------------------
  {
    slug: 'new-moon-intentions',
    name: 'New Moon Intentions',
    category: 'lunar',
    cardCount: 6,
    difficulty: 'intermediate',
    durationMin: 25,
    shortDescription:
      'Six cards to seed the next lunar cycle with aligned, embodied intentions.',
    longDescription:
      'The New Moon Intentions spread is for the dark of the moon — the quiet beginning of a fresh cycle. Six cards help you seed the next four weeks: the energy of the new cycle, what to plant, what to release before planting, the support arriving, the obstacle to expect, and the harvest worth aiming for. It is a planning spread with a sacred edge — practical enough to inform real choices, ritual enough to feel like a beginning.',
    bestFor: [
      'New Moon ritual or journaling',
      'Setting monthly intentions that actually stick',
      'After a chaotic cycle, ready to begin again',
      'Pairing with a moon-phase journaling practice',
      'When generic goal-setting has stopped landing',
    ],
    whenToUse:
      'Use this spread on the day of the New Moon or within forty-eight hours after. The energy is freshest in that window. Light a candle, write your intentions clearly, and revisit the spread at the Full Moon to check progress.',
    history:
      'New Moon ritual work has roots across many traditions — Hindu, Jewish, Wiccan, and indigenous lunar practices. Tarot-based moon work is more recent, popularized by writers like Yasmin Boland in the early twenty-first century, but it draws on much older patterns of planting and releasing in rhythm with the moon.',
    positions: [
      {
        position: 1,
        name: 'The energy of the new cycle',
        meaning:
          'The dominant theme of the next four weeks. Sets the tone for which intentions are likely to take root.',
      },
      {
        position: 2,
        name: 'What to plant',
        meaning:
          'The specific intention, project, or way of being most aligned with this cycle. Choose one — moon cycles reward focus.',
      },
      {
        position: 3,
        name: 'What to release before planting',
        meaning:
          'The pattern, belief, or habit that has to leave to make space for the intention. Often the harder of the two actions.',
      },
      {
        position: 4,
        name: 'The support arriving',
        meaning:
          'The unexpected help, encounter, or resource showing up to back the intention. Worth watching for and saying yes to.',
      },
      {
        position: 5,
        name: 'The obstacle to expect',
        meaning:
          'The friction the cycle will offer — the test that proves the intention is real. Naming it early disarms half its power.',
      },
      {
        position: 6,
        name: 'The harvest at the Full Moon',
        meaning:
          'The fruit available at the cycle\'s peak if the planting and releasing happen now. Read this on the New Moon and revisit it on the Full.',
      },
    ],
    exampleQuestions: [
      'What is the most powerful intention I can set this cycle?',
      'What do I need to release to begin again?',
      'What is the energy of this lunar cycle for me?',
      'What is trying to be born in my life right now?',
      'How do I align this month with what I actually want?',
    ],
    faqs: [
      {
        q: 'Do I need to know astrology to use this spread?',
        a: 'No. Knowing which sign the New Moon falls in adds nuance, but the spread works on its own. The card in position 1 will tell you the flavor of the cycle regardless.',
      },
      {
        q: 'Can I plant more than one intention?',
        a: 'You can, but you will dilute the cycle. Moon cycles are about focused magic; one clear intention almost always outperforms three vague ones.',
      },
      {
        q: 'What if the harvest card looks weak?',
        a: 'Two possibilities — the planting and releasing in cards 2 and 3 have not yet been done, or the intention itself is misaligned with the cycle. Re-read cards 1 and 2 against your stated intention.',
      },
      {
        q: 'When exactly should I pull this spread?',
        a: 'Within twenty-four hours of the exact New Moon is ideal. If you miss it, pull within forty-eight hours. After that, the energy thins — wait for the next cycle.',
      },
      {
        q: 'Should I pair it with the Full Moon Release spread?',
        a: 'Yes. They are designed as a cycle — plant on the New Moon, release on the Full. Together they form a complete monthly rhythm.',
      },
    ],
    relatedSpreads: ['full-moon-release', 'higher-self', 'weekly-forecast'],
  },
  {
    slug: 'full-moon-release',
    name: 'Full Moon Release',
    category: 'lunar',
    cardCount: 6,
    difficulty: 'intermediate',
    durationMin: 25,
    shortDescription:
      'Six cards to honor what has bloomed and release what no longer fits.',
    longDescription:
      'The Full Moon Release spread is the sister to New Moon Intentions — the harvest, the reckoning, and the letting-go. Six cards review what has actually bloomed this cycle, what is asking to be released, what you are afraid to release, the gift of the release, the next gentle step, and the integration to carry forward. It is part celebration, part shedding — and unusually honest, the way Full Moon energy tends to be.',
    bestFor: [
      'Full Moon ritual or journaling',
      'Closing out a project, relationship, or season',
      'After a month of meaningful inner work',
      'Pairing with a body-based release practice',
      'When you can sense something needs to leave but cannot name it',
    ],
    whenToUse:
      'Use this spread on or within forty-eight hours of the Full Moon. Pair it with a small ritual — a written burn list, a long shower, an actual goodbye — to give the release somewhere to go. Best done in the evening rather than the morning.',
    positions: [
      {
        position: 1,
        name: 'What has bloomed this cycle',
        meaning:
          'The growth, gain, or completion worth naming and celebrating before anything else. Skipping this card cheapens the rest of the spread.',
      },
      {
        position: 2,
        name: 'What is asking to be released',
        meaning:
          'The pattern, belief, relationship, or commitment that has reached the end of its usefulness. Often something you have been postponing letting go of.',
      },
      {
        position: 3,
        name: 'What you are afraid to release',
        meaning:
          'The reason the release has not happened yet — the fear, story, or imagined cost holding it in place. Naming it loosens its grip.',
      },
      {
        position: 4,
        name: 'The gift waiting on the other side',
        meaning:
          'The space, energy, or opening that becomes available once the release happens. Often the very thing you have been wishing for.',
      },
      {
        position: 5,
        name: 'The next gentle step',
        meaning:
          'A small, doable action toward the release — usually emotional rather than logistical, somatic rather than analytical.',
      },
      {
        position: 6,
        name: 'What to carry forward',
        meaning:
          'The lesson, gift, or quiet wisdom from this cycle that travels with you into the next. The opposite of release — the keeping.',
      },
    ],
    exampleQuestions: [
      'What is asking to leave my life right now?',
      'What have I actually grown this month?',
      'What am I clinging to that no longer serves me?',
      'What is the gift waiting for me if I let go?',
      'What lesson am I taking into the next cycle?',
    ],
    faqs: [
      {
        q: 'What if the bloom card feels underwhelming?',
        a: 'Look smaller. Full Moon harvests are often inner — a softened reaction, a clearer boundary, a steady hour of rest. They do not always look like external wins.',
      },
      {
        q: 'How do I actually release something?',
        a: 'Make it physical. Write it down and burn the paper, say it aloud, leave a voice note you do not send. Releases that stay in your head rarely complete.',
      },
      {
        q: 'What if I am afraid to release the thing in card 2?',
        a: 'Card 3 is your friend. Naming the fear is often more important than the release itself. Sometimes the fear releases first, and the rest follows on its own.',
      },
      {
        q: 'Can I do this spread without having done a New Moon spread?',
        a: 'Yes. Full Moon Release stands alone. Pairing it with New Moon Intentions deepens the rhythm but is not required.',
      },
      {
        q: 'How often should I do release work?',
        a: 'Once a cycle is plenty. Releasing too often becomes its own kind of avoidance — sometimes the work is to sit with what is, not to keep letting go.',
      },
    ],
    relatedSpreads: ['new-moon-intentions', 'shadow-work', 'higher-self'],
  },

  // ----------------------------------------------------------------------
  // DECISION
  // ----------------------------------------------------------------------
  {
    slug: 'crossroads',
    name: 'Crossroads',
    category: 'decision',
    cardCount: 5,
    difficulty: 'intermediate',
    durationMin: 20,
    shortDescription:
      'Five cards comparing Path A, Path B, and the advice that honors who you actually are.',
    longDescription:
      'The Crossroads spread is the classic decision-comparison: two paths laid out side by side, with the present moment between them and a piece of advice running underneath. Five cards: the standing point, the energy of Path A, the energy of Path B, the hidden factor most people miss, and the advice for choosing. It is built for the moments when both options have genuine merit and the friction is in the choosing itself, not the analysis.',
    bestFor: [
      'A real two-option decision (move or stay, accept or decline)',
      'When pros-and-cons lists have stopped helping',
      'Decisions where the right answer depends on who you are becoming',
      'Pairing with a long walk afterward',
      'When you suspect you already know but cannot admit it',
    ],
    whenToUse:
      'Use this spread when both paths are concrete, both paths are genuinely available, and the question is not "which is better in the abstract" but "which is better for me, now." Vague hypotheticals weaken the spread; real choices sharpen it.',
    positions: [
      {
        position: 1,
        name: 'Where you stand right now',
        meaning:
          'The honest emotional and energetic baseline at the moment of choice. The lens through which both paths must be read.',
      },
      {
        position: 2,
        name: 'Path A and what it offers',
        meaning:
          'The energy, gift, and cost of choosing Path A. Read for texture, not verdict — every path has a price as well as a prize.',
      },
      {
        position: 3,
        name: 'Path B and what it offers',
        meaning:
          'The same for Path B. Read it with the same honesty as Path A — easy to romanticize one and demonize the other when the choice is difficult.',
      },
      {
        position: 4,
        name: 'The hidden factor',
        meaning:
          'The variable you have not been weighing — a third person, a piece of timing, a secondary motive, a sunk cost. Often the deciding card.',
      },
      {
        position: 5,
        name: 'The advice for choosing',
        meaning:
          'The stance, not the verdict. Tarot rarely names the path; it names the posture from which the right path becomes obvious.',
      },
    ],
    exampleQuestions: [
      'Should I stay in this city or move?',
      'Should I accept this offer or hold out?',
      'Should I commit to this relationship or end it?',
      'Should I take the leap or wait another year?',
      'Should I keep working at this or pivot completely?',
    ],
    faqs: [
      {
        q: 'What if Path A and Path B look equally appealing?',
        a: 'Card 4, the hidden factor, is your tiebreaker. When the surface is balanced, the deciding variable almost always lives in something you have not been weighing.',
      },
      {
        q: 'What if the advice card seems unrelated to either path?',
        a: 'It usually is not. The advice card describes the stance from which both paths can be read clearly. Apply it to your own posture before applying it to the choice.',
      },
      {
        q: 'Can I use this for a three-option decision?',
        a: 'Use Job Decision or a custom spread. Crossroads is built for two paths — three options compressed into two collapse the spread\'s clarity.',
      },
      {
        q: 'Should I act on the spread immediately?',
        a: 'No. Sit with it for at least forty-eight hours. The clarity from a Crossroads spread tends to deepen the day after, not the hour of.',
      },
      {
        q: 'What if I want to re-pull because I do not like the answer?',
        a: 'A clear sign the answer is right. Spreads pulled in resistance to the first answer rarely give better information.',
      },
    ],
    relatedSpreads: ['job-decision', 'yes-no-pulse', 'horseshoe'],
  },
  {
    slug: 'yes-no-pulse',
    name: 'Yes-No Pulse',
    category: 'decision',
    cardCount: 5,
    difficulty: 'beginner',
    durationMin: 12,
    shortDescription:
      'A nuanced yes-or-no — five cards for the questions that need more than a binary.',
    longDescription:
      'Yes-No Pulse is for the questions where a flat yes-or-no is not quite enough. Five cards: a tone card, three answer cards (which together form a leaning), a context card, and a timing card. The combined weight of upright versus reversed and constructive versus challenging cards yields a richer answer than a single pull — yes, but not yet; no, unless this changes; almost yes, watch this. It is the spread to use when you trust your deck enough to let it argue with itself.',
    bestFor: [
      'Yes-no questions that feel too important for a single card',
      'Decisions where timing matters as much as the answer',
      'When you want a leaning rather than a verdict',
      'Sanity-checking a strong gut feeling',
      'Big-stakes binary questions',
    ],
    whenToUse:
      'Use this spread when the question is genuinely binary but the stakes are real enough to want a fuller picture. It is also useful when a single-card pull has felt unsatisfying or unclear.',
    positions: [
      {
        position: 1,
        name: 'The tone of the question',
        meaning:
          'The emotional and energetic charge around the question itself. Useful for noticing whether you are asking from clarity or from anxiety.',
      },
      {
        position: 2,
        name: 'Yes voice',
        meaning:
          'The first of three answer cards. Treat upright, light, forward-moving cards as supporting yes.',
      },
      {
        position: 3,
        name: 'No voice',
        meaning:
          'The second answer card, read with equal honesty. Reversed, blocked, or heavy cards lean toward no.',
      },
      {
        position: 4,
        name: 'The deciding voice',
        meaning:
          'The third answer card, which tips the leaning. Look at this card last — it often resolves the tension between cards 2 and 3.',
      },
      {
        position: 5,
        name: 'The context and timing',
        meaning:
          'The qualifier — the condition that shapes how to act on the answer. Often clarifies "yes, but not yet" or "no, unless x changes."',
      },
    ],
    exampleQuestions: [
      'Should I send this email today?',
      'Will this project actually launch on time?',
      'Should I commit to this opportunity?',
      'Is now the right moment to start?',
      'Should I have this conversation this week?',
    ],
    faqs: [
      {
        q: 'How do I count the leaning across cards 2, 3, and 4?',
        a: 'Look at how many cards feel light/forward versus heavy/blocked. Two of three light is a soft yes; three of three light is a strong yes; one of three light is leaning no with a caveat.',
      },
      {
        q: 'What if the tone card looks anxious?',
        a: 'Pause and breathe. An anxious tone card often means the question is being asked from fear rather than clarity. Re-read the answer cards through that lens — sometimes the cards are answering the fear, not the question.',
      },
      {
        q: 'How is this different from the Love Yes/No spread?',
        a: 'Love Yes/No is tuned for romantic energy and is shorter; Yes-No Pulse is general-purpose and more nuanced. Use Yes-No Pulse for non-love binary questions and bigger-stakes decisions.',
      },
      {
        q: 'What if all five cards seem to disagree?',
        a: 'A signal that the question is not actually binary. Reframe it as a Crossroads or Horseshoe spread instead — you may be hiding a multi-option choice inside a yes-no question.',
      },
      {
        q: 'Can I run this spread on the same question twice?',
        a: 'Once is the rule. The first answer is the answer. Running it twice in the same week trains both you and the deck to chase the answer you want.',
      },
      {
        q: 'What if the context card asks for something I cannot do?',
        a: 'Then the answer is no for now. Yes-No Pulse readings are honest about preconditions — if you cannot meet the qualifier, the leaning shifts even if cards 2 to 4 looked positive.',
      },
    ],
    relatedSpreads: ['love-yes-no', 'crossroads', 'one-card-daily'],
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getSpreadBySlug(slug: string): TarotSpread | null {
  return tarotSpreads.find((spread) => spread.slug === slug) ?? null;
}

export function getSpreadsByCategory(
  category: SpreadCategory,
): TarotSpread[] {
  return tarotSpreads.filter((spread) => spread.category === category);
}
