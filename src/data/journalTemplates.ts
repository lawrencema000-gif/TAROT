export interface JournalTemplate {
  id: string;
  title: string;
  description: string;
  category: 'daily' | 'weekly' | 'emotional' | 'growth' | 'relationships' | 'reflection';
  timeEstimate: string;
  prompts: string[];
  tags: string[];
  mbtiTypes?: string[];
  enneagramTypes?: number[];
}

export const journalTemplates: JournalTemplate[] = [
  {
    id: 'morning-intention',
    title: 'Morning Intention Setting',
    description: 'Start your day with clarity and purpose by setting intentions.',
    category: 'daily',
    timeEstimate: '5 min',
    prompts: [
      'What is one thing I want to accomplish today?',
      'How do I want to feel at the end of today?',
      'What is one thing I\'m grateful for this morning?',
      'What potential obstacles might I face, and how will I handle them?',
      'What is one act of kindness I can do for myself or others today?',
    ],
    tags: ['gratitude', 'growth'],
  },
  {
    id: 'evening-reflection',
    title: 'Evening Wind Down',
    description: 'Close your day with reflection and preparation for rest.',
    category: 'daily',
    timeEstimate: '5 min',
    prompts: [
      'What was the best part of my day?',
      'What did I learn or discover today?',
      'Is there anything I need to let go of before sleep?',
      'What am I looking forward to tomorrow?',
      'What would I do differently if I could relive today?',
    ],
    tags: ['gratitude', 'growth'],
  },
  {
    id: 'gratitude-deep',
    title: 'Gratitude Deep Dive',
    description: 'Go beyond surface-level gratitude to explore what truly enriches your life.',
    category: 'daily',
    timeEstimate: '10 min',
    prompts: [
      'Name three things you\'re grateful for today. For each, explain why it matters to you.',
      'Who is someone in your life that you appreciate? What would you tell them if you could?',
      'What is a challenge you\'ve faced that you\'re now grateful for? What did it teach you?',
      'What simple pleasure did you experience today that often goes unnoticed?',
      'What aspect of your body or health are you grateful for today?',
    ],
    tags: ['gratitude'],
  },
  {
    id: 'anxiety-release',
    title: 'Anxiety Release Writing',
    description: 'Process anxious thoughts and find calm through structured writing.',
    category: 'emotional',
    timeEstimate: '15 min',
    prompts: [
      'What is making me feel anxious right now? Write it all out without filtering.',
      'For each worry, ask: Is this within my control? If yes, what can I do? If no, can I let it go?',
      'What is the worst that could happen? What is the most likely outcome?',
      'What would I tell a friend who was feeling this way?',
      'What is one small thing I can do right now to feel more grounded?',
      'List three things that are going well in my life right now.',
    ],
    tags: ['anxiety'],
  },
  {
    id: 'anger-processing',
    title: 'Anger Processing',
    description: 'Safely explore and release anger through guided writing.',
    category: 'emotional',
    timeEstimate: '15 min',
    prompts: [
      'What happened that made me angry? Describe the situation in detail.',
      'What deeper feeling might be underneath the anger? (hurt, fear, disappointment, betrayal?)',
      'What need of mine was not met in this situation?',
      'What part of this situation was within my control, and what wasn\'t?',
      'If I could say anything to the person or situation (without consequences), what would it be?',
      'What do I need right now to feel better? How can I give this to myself?',
    ],
    tags: ['anxiety'],
  },
  {
    id: 'self-compassion',
    title: 'Self-Compassion Practice',
    description: 'Cultivate kindness toward yourself through gentle reflection.',
    category: 'emotional',
    timeEstimate: '10 min',
    prompts: [
      'What am I being hard on myself about right now?',
      'If my best friend was going through this, what would I say to them?',
      'What are three qualities I appreciate about myself?',
      'What is one way I can be kinder to myself today?',
      'Write a short letter to yourself from the perspective of someone who loves you unconditionally.',
    ],
    tags: ['love', 'growth'],
  },
  {
    id: 'weekly-review',
    title: 'Weekly Life Review',
    description: 'Reflect on your week and set intentions for the one ahead.',
    category: 'weekly',
    timeEstimate: '15 min',
    prompts: [
      'What were my three biggest wins this week?',
      'What challenged me, and what did I learn from it?',
      'How did I show up for myself and others this week?',
      'What do I want to do differently next week?',
      'What am I most excited about in the coming week?',
      'Rate your week (1-10) in these areas: Health, Relationships, Work/Purpose, Personal Growth. What would raise each by one point?',
    ],
    tags: ['growth'],
  },
  {
    id: 'relationship-reflection',
    title: 'Relationship Check-In',
    description: 'Explore and strengthen your important relationships.',
    category: 'relationships',
    timeEstimate: '15 min',
    prompts: [
      'Who are the most important people in my life right now? How have I shown them they matter?',
      'Is there a relationship that needs attention or repair? What would help?',
      'What do I appreciate about my closest relationship right now?',
      'What boundaries might I need to set or reinforce?',
      'How can I be a better friend/partner/family member?',
      'What kind of energy am I bringing to my relationships?',
    ],
    tags: ['love', 'family'],
  },
  {
    id: 'values-exploration',
    title: 'Values Exploration',
    description: 'Reconnect with what matters most to you and align your actions.',
    category: 'growth',
    timeEstimate: '20 min',
    prompts: [
      'What are the five values most important to me right now? (e.g., freedom, love, growth, creativity, security)',
      'For each value, am I living in alignment with it? What evidence do I see?',
      'Where is there a gap between my values and my actions?',
      'What is one change I could make to live more aligned with my top value?',
      'When do I feel most like myself? What values are being honored in those moments?',
    ],
    tags: ['growth'],
  },
  {
    id: 'future-self',
    title: 'Letter to Future Self',
    description: 'Connect with your future self to gain perspective and motivation.',
    category: 'growth',
    timeEstimate: '15 min',
    prompts: [
      'Imagine yourself one year from now, living your best life. Describe a day in that life.',
      'What has your future self accomplished that you\'re proud of?',
      'What advice would your future self give you about today\'s challenges?',
      'What habits did your future self develop that made the biggest difference?',
      'Write a letter FROM your future self to your current self.',
    ],
    tags: ['growth', 'dreams'],
  },
  {
    id: 'shadow-work',
    title: 'Shadow Work Exploration',
    description: 'Explore the hidden parts of yourself for deeper self-understanding.',
    category: 'growth',
    timeEstimate: '20 min',
    prompts: [
      'What quality in others irritates me most? Could this be something I deny in myself?',
      'What emotions do I try to hide from others? Why?',
      'What is something I\'ve been avoiding facing about myself?',
      'What would I do if no one would ever judge me?',
      'What part of myself did I have to hide or suppress growing up?',
      'How can I integrate this hidden part of myself in a healthy way?',
    ],
    tags: ['growth'],
  },
  {
    id: 'limiting-beliefs',
    title: 'Challenge Limiting Beliefs',
    description: 'Identify and transform beliefs that hold you back.',
    category: 'growth',
    timeEstimate: '15 min',
    prompts: [
      'What is a belief about myself that might be holding me back?',
      'Where did this belief come from? When did I first start believing it?',
      'What evidence contradicts this belief?',
      'What would be possible if I didn\'t believe this?',
      'What is a more empowering belief I could choose instead?',
      'What small action could I take to test the new belief?',
    ],
    tags: ['growth'],
  },
  {
    id: 'forgiveness',
    title: 'Forgiveness Practice',
    description: 'Release resentment and find peace through forgiveness.',
    category: 'emotional',
    timeEstimate: '20 min',
    prompts: [
      'Who am I holding resentment toward? What happened?',
      'How has holding onto this resentment affected me?',
      'Can I understand why the other person acted the way they did?',
      'What would it feel like to release this burden?',
      'What boundaries might I need to maintain even as I forgive?',
      'Write a letter of forgiveness (you don\'t have to send it).',
    ],
    tags: ['love', 'growth'],
  },
  {
    id: 'grief-processing',
    title: 'Grief & Loss Processing',
    description: 'Honor and process grief in a safe, supported way.',
    category: 'emotional',
    timeEstimate: '20 min',
    prompts: [
      'What or who am I grieving? Allow yourself to name it fully.',
      'What do I miss most?',
      'What feelings am I experiencing? (sadness, anger, guilt, relief, etc.)',
      'What would I say to them/it if I could?',
      'What is one way I can honor this loss?',
      'What support do I need right now? Who can I reach out to?',
    ],
    tags: ['love', 'family'],
  },
  {
    id: 'creative-vision',
    title: 'Creative Vision Board',
    description: 'Explore your dreams and desires through imaginative writing.',
    category: 'reflection',
    timeEstimate: '15 min',
    prompts: [
      'If money and time were no object, what would I spend my days doing?',
      'What did I love doing as a child that I\'ve stopped doing?',
      'What creative project have I been putting off?',
      'Describe your dream life in vivid detail: Where are you? What are you doing? Who is with you?',
      'What is one small step I could take toward this vision this week?',
    ],
    tags: ['dreams', 'growth'],
  },
  {
    id: 'body-connection',
    title: 'Body Connection',
    description: 'Reconnect with your physical self through mindful awareness.',
    category: 'daily',
    timeEstimate: '10 min',
    prompts: [
      'Do a body scan from head to toe. Where do you notice tension or discomfort?',
      'What is your body trying to tell you right now?',
      'How have you treated your body today? With kindness or neglect?',
      'What is one way you can nourish your body today?',
      'What are you grateful for about your body?',
    ],
    tags: ['health', 'gratitude'],
  },
  {
    id: 'boundary-setting',
    title: 'Boundary Exploration',
    description: 'Understand and strengthen your personal boundaries.',
    category: 'relationships',
    timeEstimate: '15 min',
    prompts: [
      'Where in my life do I feel drained or resentful?',
      'What boundary might need to be set or strengthened in this area?',
      'What fear comes up when I think about setting this boundary?',
      'What is the cost of NOT setting this boundary?',
      'How would I feel if I honored this boundary consistently?',
      'What is a kind but firm way I could communicate this boundary?',
    ],
    tags: ['love', 'growth'],
  },
  {
    id: 'moon-reflection',
    title: 'New Moon Intentions',
    description: 'Set intentions for the lunar cycle ahead.',
    category: 'reflection',
    timeEstimate: '15 min',
    prompts: [
      'What do I want to release from the previous cycle?',
      'What seeds of intention do I want to plant for this new cycle?',
      'What area of my life needs the most attention right now?',
      'What is one habit I want to cultivate this month?',
      'What support do I need to make this happen?',
      'Write a commitment to yourself for this lunar cycle.',
    ],
    tags: ['growth', 'dreams'],
  },
  {
    id: 'full-moon-release',
    title: 'Full Moon Release',
    description: 'Let go of what no longer serves you under the full moon.',
    category: 'reflection',
    timeEstimate: '15 min',
    prompts: [
      'What has come to completion or fruition in my life recently?',
      'What am I ready to release or let go of?',
      'What patterns, thoughts, or behaviors are no longer serving me?',
      'What would my life look like without this burden?',
      'What am I grateful for that this cycle has taught me?',
      'Write a release statement: "I release..."',
    ],
    tags: ['growth'],
  },
  {
    id: 'career-clarity',
    title: 'Career & Purpose Clarity',
    description: 'Explore your professional path and sense of purpose.',
    category: 'reflection',
    timeEstimate: '20 min',
    prompts: [
      'What aspects of my current work/career do I enjoy most?',
      'What drains my energy at work?',
      'If I could design my ideal work day, what would it look like?',
      'What unique skills or perspectives do I bring?',
      'What impact do I want to have through my work?',
      'What is one step I could take toward more fulfilling work?',
    ],
    tags: ['career', 'growth'],
  },
];

export const templateCategories = {
  daily: { name: 'Daily', icon: 'sun', color: 'gold' },
  weekly: { name: 'Weekly', icon: 'calendar', color: 'cosmic-blue' },
  emotional: { name: 'Emotional', icon: 'heart', color: 'cosmic-rose' },
  growth: { name: 'Growth', icon: 'trending-up', color: 'emerald-400' },
  relationships: { name: 'Relationships', icon: 'users', color: 'pink-400' },
  reflection: { name: 'Reflection', icon: 'moon', color: 'mystic-300' },
};

export function getTemplatesForPersonality(mbtiType?: string, enneagramType?: number): JournalTemplate[] {
  const recommendations: JournalTemplate[] = [];

  const introverted = mbtiType?.startsWith('I');
  const feeling = mbtiType?.includes('F');
  const intuitive = mbtiType?.includes('N');

  if (introverted) {
    recommendations.push(
      journalTemplates.find(t => t.id === 'evening-reflection')!,
      journalTemplates.find(t => t.id === 'self-compassion')!
    );
  }

  if (feeling) {
    recommendations.push(
      journalTemplates.find(t => t.id === 'relationship-reflection')!,
      journalTemplates.find(t => t.id === 'gratitude-deep')!
    );
  }

  if (intuitive) {
    recommendations.push(
      journalTemplates.find(t => t.id === 'future-self')!,
      journalTemplates.find(t => t.id === 'creative-vision')!
    );
  }

  if (enneagramType === 1) {
    recommendations.push(journalTemplates.find(t => t.id === 'self-compassion')!);
  }
  if (enneagramType === 4) {
    recommendations.push(journalTemplates.find(t => t.id === 'shadow-work')!);
  }
  if (enneagramType === 6) {
    recommendations.push(journalTemplates.find(t => t.id === 'anxiety-release')!);
  }

  return [...new Set(recommendations.filter(Boolean))].slice(0, 5);
}
