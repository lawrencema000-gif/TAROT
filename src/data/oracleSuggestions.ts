/**
 * Oracle hub — "guess what you want to ask" suggestion chips.
 *
 * Voice: Arcana — warm, direct, a little mystical, never clinical.
 * Rules: each question ≤60 chars, first-person, emotionally real —
 * the things people actually type at 1am, not textbook prompts.
 */

export type OracleContext =
  | 'general'
  | 'love'
  | 'career'
  | 'tarot'
  | 'astrology'
  | 'bazi'
  | 'dice'
  | 'iching';

export const ORACLE_SUGGESTIONS: Record<OracleContext, string[]> = {
  general: [
    'Why do I feel stuck lately?',
    'What should I focus on this month?',
    'Am I on the right path?',
    "What am I not seeing about my situation?",
    'How do I stop overthinking everything?',
    "What's draining my energy right now?",
    'Is it time for a big change?',
    'What do I need to let go of?',
    'Why does everything feel heavy right now?',
    "What's going well that I keep ignoring?",
  ],
  love: [
    'Do they still think about me?',
    'Is this relationship worth fighting for?',
    'Why do I keep attracting the same type?',
    'Should I text my ex?',
    'Are we just friends, or something more?',
    'When will I meet someone real?',
    'How do I know if they actually care?',
    'Is it too soon to say I love you?',
    'Why am I scared to let someone in?',
    'Should I give them another chance?',
  ],
  career: [
    'Should I quit my job?',
    'Is this the right time to change careers?',
    'Why do I feel invisible at work?',
    'Should I ask for a raise this month?',
    'Is my side project worth pursuing?',
    'How do I deal with a difficult boss?',
    'Am I burning out or just tired?',
    'Will this interview go my way?',
    'Take the risky offer, or stay safe?',
    "What's blocking my next step at work?",
  ],
  tarot: [
    'What energy surrounds me today?',
    'What does my heart already know?',
    "Show me what I'm avoiding.",
    "What's the lesson in this situation?",
    "What's coming into my life next?",
    'What do they feel about me, truly?',
    'Pull a card for my week ahead.',
    'What should I release before the new moon?',
    'Where is this connection headed?',
    'What hidden strength can I lean on?',
  ],
  astrology: [
    'Why does this week feel heavy?',
    'What is Mercury retrograde doing to me?',
    'What does my chart say about love?',
    'Why do I clash with certain signs?',
    "What's the full moon stirring up for me?",
    'Is Saturn testing me right now?',
    'When will my luck shift this year?',
    'What career suits my birth chart?',
    'Why am I so emotional lately?',
    'What transit should I watch this month?',
  ],
  bazi: [
    'What element am I missing?',
    'Am I in a good luck cycle right now?',
    'When does my next luck pillar begin?',
    'Is this year favorable for money?',
    'What does my Day Master say about me?',
    'Which direction supports my career?',
    'Why do some years feel harder than others?',
    'Is this a year to push, or to wait?',
    'What color and element strengthen me?',
    'When is a lucky window to start something?',
  ],
  dice: [
    'Should I text them tonight?',
    'Will tomorrow go my way?',
    'Yes or no: should I do it?',
    'Is today a good day to ask?',
    'Should I say yes to the invite?',
    'Will the news be good?',
    'Do they miss me?',
    'Should I buy it or wait?',
    'Is it worth one more try?',
    "Quick roll: how's this week looking?",
  ],
  iching: [
    'Should I act now, or wait for the moment?',
    'What is this change trying to teach me?',
    'How should I handle this conflict?',
    'Is it wiser to hold on or let go?',
    'What happens if I stay the course?',
    'How do I move through this uncertainty?',
    'What attitude serves me best right now?',
    'Is this ending actually a beginning?',
    'Where should I yield, and where stand firm?',
    'What does this moment ask of me?',
  ],
};

/**
 * Anti-anxiety framings shown under the Daily Cosmic Score.
 * One line each, ≤90 chars. The score is weather, never a verdict.
 */
export const DAILY_SCORE_FRAMES: string[] = [
  'A low-energy sky is an invitation to rest, not a warning.',
  'Scores describe the weather, not your worth. You choose how to walk in it.',
  "Rough days build the patience that smooth days can't.",
  "A high score isn't a promise — it's a tailwind. You still steer.",
  'The stars set the mood; you set the meaning.',
  'Low tide reveals the shore. Quiet days show you what matters.',
];
