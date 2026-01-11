import type { ZodiacSign, EnhancedHoroscope } from '../types';

interface HoroscopeTemplate {
  general: string[];
  love: string[];
  career: string[];
  mood: string[];
  actionSteps: string[];
}

const generalTemplates = [
  'The stars align to bring new opportunities your way. Stay open to unexpected connections and trust your intuition.',
  'Today brings a surge of creative energy. Channel it into projects that have been waiting for your attention.',
  'A moment of clarity arrives, helping you see past situations from a new perspective. Use this insight wisely.',
  'The universe encourages you to take a bold step forward. What once seemed impossible now feels within reach.',
  'Patience is your ally today. The answers you seek are coming, but in their own divine timing.',
  'Your natural magnetism is amplified. Others are drawn to your energy and wisdom.',
  'A period of transformation begins. Embrace the changes, for they lead to growth.',
  'The cosmos supports deep reflection. Take time to understand your true desires.',
  'Unexpected news arrives that shifts your perspective. Remain adaptable and open-minded.',
  'Your inner strength is highlighted today. Trust that you have everything you need.',
];

const loveTemplates = [
  'Romance blooms in unexpected places. Keep your heart open to new possibilities.',
  'Deep conversations strengthen existing bonds. Share your authentic self with loved ones.',
  'Venus influences bring harmony to relationships. Express your affection freely.',
  'Single or partnered, self-love is the theme. Honor your own needs and boundaries.',
  'A meaningful connection deepens. Trust the natural flow of your relationships.',
  'Past relationship patterns come up for healing. Release what no longer serves you.',
  'Passion ignites when you least expect it. Follow your heart without hesitation.',
  'Communication is key in matters of the heart. Speak your truth with kindness.',
  'New romantic opportunities appear on the horizon. Be open to different types of connections.',
  'Existing relationships reach a new level of understanding. Celebrate this growth.',
];

const careerTemplates = [
  'Professional recognition is on the way. Your hard work is being noticed by important people.',
  'Creative solutions to work challenges come easily today. Trust your innovative ideas.',
  'Collaboration brings success. Team efforts yield better results than solo endeavors.',
  'A financial opportunity presents itself. Evaluate carefully but act decisively.',
  'Your leadership abilities shine. Others look to you for guidance and direction.',
  'Time to reassess your career path. Are you aligned with your true purpose?',
  'Networking brings valuable connections. Put yourself out there with confidence.',
  'A project reaches completion, bringing a sense of accomplishment and relief.',
  'New skills you\'ve been developing pay off in unexpected ways.',
  'Professional boundaries need attention. Protect your energy while remaining productive.',
];

const moodTemplates = [
  'Optimistic and energized - your spirits are high and everything feels possible.',
  'Reflective and introspective - a good day for journaling and self-discovery.',
  'Creative and inspired - artistic expression flows naturally.',
  'Calm and centered - inner peace guides your interactions.',
  'Determined and focused - you can accomplish great things today.',
  'Nostalgic and sentimental - memories offer comfort and wisdom.',
  'Adventurous and curious - explore something new.',
  'Nurturing and compassionate - your care for others shines through.',
  'Confident and charismatic - lead with your natural gifts.',
  'Peaceful and content - appreciate the simple joys around you.',
];

const actionStepTemplates = [
  'Take 5 minutes to journal about what you\'re grateful for today.',
  'Reach out to someone you\'ve been thinking about.',
  'Set one clear intention for the day and write it down.',
  'Spend 10 minutes in quiet meditation or reflection.',
  'Do one thing that scares you a little.',
  'Organize one small area of your space to clear mental clutter.',
  'Practice saying no to one thing that doesn\'t serve you.',
  'Send a message of appreciation to someone who matters.',
  'Take a walk outside and notice three beautiful things.',
  'Write down your biggest worry and one small action you can take.',
  'Create something with your hands, no matter how simple.',
  'Have a conversation where you only listen.',
  'Set a boundary that protects your energy.',
  'Celebrate a small win from this week.',
  'Visualize your ideal tomorrow for 3 minutes.',
];

const templates: HoroscopeTemplate = {
  general: generalTemplates,
  love: loveTemplates,
  career: careerTemplates,
  mood: moodTemplates,
  actionSteps: actionStepTemplates,
};

const signTags: Record<ZodiacSign, string[]> = {
  aries: ['action', 'courage', 'initiative', 'leadership', 'energy'],
  taurus: ['stability', 'comfort', 'patience', 'sensuality', 'persistence'],
  gemini: ['communication', 'curiosity', 'adaptability', 'wit', 'versatility'],
  cancer: ['nurturing', 'intuition', 'home', 'emotion', 'protection'],
  leo: ['creativity', 'confidence', 'generosity', 'drama', 'warmth'],
  virgo: ['analysis', 'service', 'health', 'detail', 'improvement'],
  libra: ['balance', 'harmony', 'partnership', 'beauty', 'diplomacy'],
  scorpio: ['transformation', 'depth', 'passion', 'mystery', 'intensity'],
  sagittarius: ['adventure', 'optimism', 'philosophy', 'freedom', 'expansion'],
  capricorn: ['ambition', 'discipline', 'structure', 'achievement', 'responsibility'],
  aquarius: ['innovation', 'independence', 'humanity', 'originality', 'vision'],
  pisces: ['intuition', 'creativity', 'compassion', 'dreams', 'spirituality'],
};

const dayTags = [
  ['fresh-start', 'new-energy', 'momentum'],
  ['communication', 'connections', 'expression'],
  ['action', 'determination', 'courage'],
  ['wisdom', 'learning', 'expansion'],
  ['love', 'abundance', 'pleasure'],
  ['reflection', 'rest', 'boundaries'],
  ['spirituality', 'creativity', 'intuition'],
];

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

export function generateDailyHoroscope(sign: ZodiacSign, date: string): {
  general: string;
  love: string;
  career: string;
  energy: number;
  luckyNumber: number;
  luckyColor: string;
} {
  const dateNum = new Date(date).getTime();
  const signNum = sign.charCodeAt(0) + sign.charCodeAt(1);
  const seed = dateNum + signNum;
  const random = seededRandom(seed);

  const colors = ['Gold', 'Silver', 'Crimson', 'Azure', 'Emerald', 'Violet', 'Rose', 'Amber', 'Ivory', 'Obsidian'];

  return {
    general: templates.general[Math.floor(random() * templates.general.length)],
    love: templates.love[Math.floor(random() * templates.love.length)],
    career: templates.career[Math.floor(random() * templates.career.length)],
    energy: Math.floor(random() * 5) + 1,
    luckyNumber: Math.floor(random() * 99) + 1,
    luckyColor: colors[Math.floor(random() * colors.length)],
  };
}

export function generateEnhancedHoroscope(sign: ZodiacSign, date: string): EnhancedHoroscope {
  const dateNum = new Date(date).getTime();
  const signNum = sign.charCodeAt(0) + sign.charCodeAt(1);
  const seed = dateNum + signNum;
  const random = seededRandom(seed);

  const colors = ['Gold', 'Silver', 'Crimson', 'Azure', 'Emerald', 'Violet', 'Rose', 'Amber', 'Ivory', 'Obsidian'];
  const dayOfWeek = new Date(date).getDay();

  const signTagSet = signTags[sign];
  const dayTagSet = dayTags[dayOfWeek];
  const selectedSignTags = signTagSet.slice(0, 2 + Math.floor(random() * 2));
  const selectedDayTags = dayTagSet.slice(0, 1 + Math.floor(random() * 2));

  return {
    sign,
    date,
    general: templates.general[Math.floor(random() * templates.general.length)],
    love: templates.love[Math.floor(random() * templates.love.length)],
    career: templates.career[Math.floor(random() * templates.career.length)],
    mood: templates.mood[Math.floor(random() * templates.mood.length)],
    energy: Math.floor(random() * 5) + 1,
    luckyNumber: Math.floor(random() * 99) + 1,
    luckyColor: colors[Math.floor(random() * colors.length)],
    actionStep: templates.actionSteps[Math.floor(random() * templates.actionSteps.length)],
    tags: [...selectedSignTags, ...selectedDayTags],
  };
}

export const dailyPrompts = [
  'What intention do you want to set for today?',
  'What are you most grateful for right now?',
  'What fear are you ready to release?',
  'Describe a moment that brought you joy recently.',
  'What lesson has life been teaching you lately?',
  'If you could tell your past self one thing, what would it be?',
  'What does your ideal day look like?',
  'What boundary do you need to strengthen?',
  'Who in your life deserves more appreciation?',
  'What dream have you been postponing?',
  'How can you show yourself more compassion today?',
  'What pattern in your life are you ready to change?',
];

export const goalBasedPrompts: Record<string, string[]> = {
  love: [
    'What qualities do you most value in relationships?',
    'How can you show more love to yourself today?',
    'What does healthy love look like to you?',
    'What past relationship lesson are you grateful for?',
  ],
  career: [
    'What does success mean to you beyond money?',
    'What skill do you want to develop next?',
    'Where do you see yourself professionally in one year?',
    'What would you do if you knew you couldn\'t fail?',
  ],
  confidence: [
    'What accomplishment are you most proud of?',
    'What would you do if you fully believed in yourself?',
    'What negative self-talk pattern can you release today?',
    'Name three things you genuinely like about yourself.',
  ],
  healing: [
    'What emotion needs your attention right now?',
    'What wound from the past is ready to heal?',
    'How can you create more peace in your daily life?',
    'What do you need to forgive yourself for?',
  ],
  focus: [
    'What is the single most important thing you can do today?',
    'What distractions are keeping you from your goals?',
    'How can you create more space for deep work?',
    'What would you focus on if you had unlimited time?',
  ],
  purpose: [
    'What makes you lose track of time?',
    'How do you want to be remembered?',
    'What problem in the world do you most want to solve?',
    'What gifts do you have to offer the world?',
  ],
  stress: [
    'What is one thing you can let go of today?',
    'How does your body tell you it\'s stressed?',
    'What small act of self-care can you do right now?',
    'What worry can you release because it\'s out of your control?',
  ],
};

export function getDailyPrompt(date: string): string {
  const dateNum = new Date(date).getTime();
  const random = seededRandom(dateNum);
  return dailyPrompts[Math.floor(random() * dailyPrompts.length)];
}

export function getPersonalizedPrompt(date: string, goals: string[]): string {
  const dateNum = new Date(date).getTime();
  const random = seededRandom(dateNum);

  if (goals.length > 0) {
    const primaryGoal = goals[Math.floor(random() * goals.length)];
    const prompts = goalBasedPrompts[primaryGoal];
    if (prompts && prompts.length > 0) {
      return prompts[Math.floor(random() * prompts.length)];
    }
  }

  return dailyPrompts[Math.floor(random() * dailyPrompts.length)];
}

export function getHoroscopeTags(sign: ZodiacSign): string[] {
  return signTags[sign] || [];
}

const planetaryTransits = [
  'Mercury enhances communication - express yourself clearly',
  'Venus brings harmony to relationships - open your heart',
  'Mars energizes your ambitions - take decisive action',
  'Jupiter expands opportunities - think big',
  'Saturn teaches valuable lessons - embrace discipline',
  'Uranus sparks innovation - welcome the unexpected',
  'Neptune heightens intuition - trust your inner voice',
  'Pluto transforms deeply - let go of what no longer serves',
  'The Moon affects emotions - honor your feelings',
  'The Sun illuminates your path - step into your power',
];

const affirmationsBySign: Record<ZodiacSign, string[]> = {
  aries: [
    'I embrace my courage and take bold action',
    'My passion ignites positive change in my life',
    'I am a natural leader and pioneer',
    'I trust my instincts and act with confidence',
  ],
  taurus: [
    'I am grounded, stable, and secure',
    'I attract abundance in all forms',
    'I trust the natural rhythm of my life',
    'I create lasting beauty and comfort',
  ],
  gemini: [
    'I communicate my truth with clarity and grace',
    'My curiosity opens doors to endless possibilities',
    'I adapt easily to new situations',
    'My mind is sharp and my words inspire',
  ],
  cancer: [
    'I honor my emotions and intuition',
    'I create a safe, nurturing space for myself and others',
    'My sensitivity is my greatest strength',
    'I trust the wisdom of my heart',
  ],
  leo: [
    'I shine brightly and share my gifts generously',
    'I am confident, creative, and courageous',
    'I lead with my heart and inspire others',
    'My authentic self is magnificent',
  ],
  virgo: [
    'I am organized, efficient, and purposeful',
    'I serve others while honoring myself',
    'My attention to detail creates excellence',
    'I am worthy of the care I give to others',
  ],
  libra: [
    'I create harmony and balance in my life',
    'I attract loving, supportive relationships',
    'My fairness and grace inspire others',
    'I make decisions that honor all parts of myself',
  ],
  scorpio: [
    'I embrace transformation and emerge stronger',
    'I trust the intensity of my emotions',
    'I release what no longer serves my highest good',
    'My depth and passion are powerful gifts',
  ],
  sagittarius: [
    'I am free to explore and expand my horizons',
    'I trust my journey and embrace adventure',
    'My optimism attracts positive experiences',
    'I am a seeker of truth and wisdom',
  ],
  capricorn: [
    'I achieve my goals through dedication and persistence',
    'I am building a legacy of lasting value',
    'My discipline leads to remarkable success',
    'I balance ambition with self-compassion',
  ],
  aquarius: [
    'I embrace my unique vision and innovative spirit',
    'I contribute meaningfully to the world around me',
    'My independence strengthens my connections',
    'I am a catalyst for positive change',
  ],
  pisces: [
    'I trust my intuition and creative imagination',
    'I am deeply connected to the universal flow',
    'My compassion heals myself and others',
    'I honor my sensitivity as a divine gift',
  ],
};

export function getPlanetaryTransit(date: string): string {
  const dateNum = new Date(date).getTime();
  const random = seededRandom(dateNum);
  return planetaryTransits[Math.floor(random() * planetaryTransits.length)];
}

export function getDailyAffirmation(sign: ZodiacSign, date: string): string {
  const dateNum = new Date(date).getTime();
  const random = seededRandom(dateNum);
  const affirmations = affirmationsBySign[sign];
  return affirmations[Math.floor(random() * affirmations.length)];
}

export function getLuckyNumbers(date: string, count: number = 6): number[] {
  const dateNum = new Date(date).getTime();
  const random = seededRandom(dateNum);
  const numbers: number[] = [];

  while (numbers.length < count) {
    const num = Math.floor(random() * 49) + 1;
    if (!numbers.includes(num)) {
      numbers.push(num);
    }
  }

  return numbers.sort((a, b) => a - b);
}
