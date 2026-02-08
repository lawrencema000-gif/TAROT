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
  'A wave of determination washes over you. Channel it before it fades into something lasting.',
  'The cosmos invites you to slow down and recalibrate. What felt urgent last week may not matter today.',
  'Today\'s energy is quiet but potent. Pay attention to what surfaces in stillness.',
  'An old pattern reveals itself with new clarity. You finally have the distance to see it for what it is.',
  'The stars favor integrity today. Say what you mean and mean what you say.',
  'Something you have been building is closer to completion than you realize. Keep going.',
  'A small act of courage today sets a larger change in motion. Trust the ripple effect.',
  'The universe rewards those who pause before reacting. Today, let your response be deliberate.',
  'Your instincts are sharper than usual. Honor them, even if they contradict the obvious path.',
  'The cosmic weather favors reflection over action. Gather information before making your next move.',
  'Today brings an opportunity to practice what you preach. Walk your talk with quiet confidence.',
  'You may feel pulled in two directions. The answer is not to choose sides but to find the third option.',
  'A door you thought was closed has a crack of light beneath it. Investigate.',
  'The stars suggest releasing one expectation that has been weighing on you. Freedom follows surrender.',
  'Something beautiful is forming in the background of your life. You do not need to force it into focus yet.',
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
  'The love you give today returns in unexpected forms. Be generous without keeping score.',
  'Vulnerability is your superpower in relationships today. Show someone the unpolished version.',
  'A conversation about needs—yours or theirs—has the power to shift the entire dynamic.',
  'Today\'s romantic energy favors depth over novelty. Go deeper with someone you already know.',
  'The stars highlight an imbalance in how you give and receive. Adjust gently.',
  'Love today is less about finding the right person and more about being the right person.',
  'Something unspoken between you and someone close is ready to surface. Create the space for it.',
  'Physical closeness heals something that words have not been able to reach. Lean in.',
  'Your heart knows what it wants before your mind catches up. Trust the feeling today.',
  'The cosmos supports setting a loving boundary—one that protects your peace without closing your heart.',
  'An act of forgiveness—toward yourself or someone else—unlocks a new level of intimacy today.',
  'Romance is not always dramatic. Today, love looks like reliability, attention, and follow-through.',
  'Your love language is speaking louder than usual. Pay attention to how you naturally express care.',
  'Someone in your life is loving you in a way you might be overlooking. Notice it today.',
  'The stars favor honest appreciation. Tell someone exactly what you value about them, with specifics.',
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
  'A skill you have been quietly developing is about to become relevant. Prepare to use it.',
  'Today favors strategic patience over aggressive action. The right moment to move will be obvious.',
  'A professional relationship needs attention. Invest time in a connection that supports your growth.',
  'The cosmos highlights a pattern in your work habits that is either serving you well or holding you back.',
  'An idea you dismissed weeks ago deserves a second look. Timing changes everything.',
  'Today\'s energy supports bold proposals and honest conversations with authority figures.',
  'Your reputation is quietly growing. What people say about you when you are not in the room matters today.',
  'The stars suggest delegating something you have been holding too tightly. Trust your team.',
  'A financial decision today benefits from research rather than gut instinct. Do the homework.',
  'Professional growth today comes from learning, not performing. Read, listen, absorb.',
  'The cosmos supports setting a work boundary that you have been avoiding. Your productivity will improve.',
  'Today\'s energy favors finishing over starting. Complete what is in progress before launching something new.',
  'A mentor or advisor has insight you need. Ask the question you have been sitting on.',
  'Your unique perspective is your greatest professional asset today. Do not dilute it to fit in.',
  'The stars align for a conversation about compensation, recognition, or advancement. Prepare your case.',
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
  'Quietly powerful - there is strength in your stillness today.',
  'Restless but purposeful - your energy is searching for the right outlet.',
  'Open and receptive - today you absorb wisdom from unexpected sources.',
  'Tender and raw - your sensitivity is a compass, not a weakness.',
  'Grounded and resolute - nothing shakes your foundation today.',
  'Playful and light - life does not always need to be serious.',
  'Contemplative and wise - you see patterns others miss.',
  'Energized and magnetic - people are drawn to your presence.',
  'Melancholic but productive - today you channel feeling into creation.',
  'Clear-headed and decisive - trust the clarity while it lasts.',
  'Protective and fierce - you guard what matters with quiet strength.',
  'Hopeful and forward-looking - something is shifting in your favor.',
  'Patient and steady - you understand that good things compound.',
  'Emotionally honest - today you feel exactly what you feel, without editing.',
  'Resilient and recovering - you are stronger than yesterday, and that is enough.',
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
  'Choose one relationship and invest 10 minutes of genuine attention in it today.',
  'Write down three things you need to hear right now, then read them out loud to yourself.',
  'Do one thing today that your future self will thank you for.',
  'Replace one complaint today with a request. Ask for what you need directly.',
  'Spend 5 minutes decluttering one digital space—inbox, photos, or bookmarks.',
  'Name one emotion you are carrying right now without judging it. Just name it.',
  'Tell someone what you appreciate about them, with one specific example.',
  'Make one decision you have been postponing. Choose, and release the alternatives.',
  'Do something physical for 10 minutes—walk, stretch, dance. Move the energy.',
  'Before bed tonight, write one sentence about what today taught you.',
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
    'My courage creates paths where none existed',
    'I channel my fire with purpose and precision',
    'My directness is a gift I offer the world',
    'I lead not because I need to, but because I can',
    'My passion is fuel, not fire I cannot control',
    'I am allowed to rest without losing my edge',
  ],
  taurus: [
    'I am grounded, stable, and secure',
    'I attract abundance in all forms',
    'I trust the natural rhythm of my life',
    'I create lasting beauty and comfort',
    'My patience creates what urgency cannot',
    'I deserve the beauty and comfort I create',
    'Change does not threaten me—it reveals new ground',
    'My devotion is rare and irreplaceable',
    'I release my grip on what needs to leave',
    'My steadiness is a form of quiet power',
  ],
  gemini: [
    'I communicate my truth with clarity and grace',
    'My curiosity opens doors to endless possibilities',
    'I adapt easily to new situations',
    'My mind is sharp and my words inspire',
    'My versatility is a strength, not instability',
    'I can go deep without losing my lightness',
    'My questions lead to truths others overlook',
    'I honor both sides of myself without conflict',
    'My words carry weight and wisdom today',
    'I choose focus without sacrificing freedom',
  ],
  cancer: [
    'I honor my emotions and intuition',
    'I create a safe, nurturing space for myself and others',
    'My sensitivity is my greatest strength',
    'I trust the wisdom of my heart',
    'My emotions are information, not obstacles',
    'I protect my energy as fiercely as I protect others',
    'My boundaries strengthen my capacity to love',
    'I am safe enough to feel everything fully',
    'My intuition has never led me astray',
    'I give from overflow, not from depletion',
  ],
  leo: [
    'I shine brightly and share my gifts generously',
    'I am confident, creative, and courageous',
    'I lead with my heart and inspire others',
    'My authentic self is magnificent',
    'I do not need applause to know my worth',
    'My generosity inspires generosity in return',
    'I am magnificent even in my quiet moments',
    'My light does not diminish when others shine',
    'I lead with my heart, not my need to be seen',
    'My confidence grows from self-knowledge, not external validation',
  ],
  virgo: [
    'I am organized, efficient, and purposeful',
    'I serve others while honoring myself',
    'My attention to detail creates excellence',
    'I am worthy of the care I give to others',
    'My imperfection does not reduce my value',
    'I am allowed to receive without earning it first',
    'My analysis serves me when I use it gently',
    'I release the need to fix what is not broken',
    'My care for others begins with care for myself',
    'Excellence is my nature—perfectionism is not',
  ],
  libra: [
    'I create harmony and balance in my life',
    'I attract loving, supportive relationships',
    'My fairness and grace inspire others',
    'I make decisions that honor all parts of myself',
    'My truth matters as much as the peace I keep',
    'I make decisions that honor my own needs',
    'My boundaries create better relationships, not weaker ones',
    'I am enough without anyone else\'s approval',
    'My sense of justice extends to how I treat myself',
    'I choose honesty over harmony when honesty heals',
  ],
  scorpio: [
    'I embrace transformation and emerge stronger',
    'I trust the intensity of my emotions',
    'I release what no longer serves my highest good',
    'My depth and passion are powerful gifts',
    'My intensity is a gift, not a burden',
    'I let go without needing to understand everything first',
    'My vulnerability is my most powerful weapon',
    'I trust without requiring proof at every turn',
    'My past has made me perceptive, not paranoid',
    'I transform pain into purpose with every breath',
  ],
  sagittarius: [
    'I am free to explore and expand my horizons',
    'I trust my journey and embrace adventure',
    'My optimism attracts positive experiences',
    'I am a seeker of truth and wisdom',
    'My restlessness leads me to where I need to be',
    'I honor my commitments without losing my freedom',
    'My optimism is earned through experience, not naivety',
    'I find depth in stillness, not just in motion',
    'My truth-telling is a gift when delivered with care',
    'I am free to stay as I am to go',
  ],
  capricorn: [
    'I achieve my goals through dedication and persistence',
    'I am building a legacy of lasting value',
    'My discipline leads to remarkable success',
    'I balance ambition with self-compassion',
    'I am more than what I produce',
    'My worth exists before my achievements',
    'I rest without guilt and rise without proving myself',
    'My emotional life matters as much as my professional life',
    'I build with love, not just ambition',
    'My discipline serves my joy, not just my goals',
  ],
  aquarius: [
    'I embrace my unique vision and innovative spirit',
    'I contribute meaningfully to the world around me',
    'My independence strengthens my connections',
    'I am a catalyst for positive change',
    'My emotions are real even when they feel inconvenient',
    'I connect deeply without losing my independence',
    'My vision inspires because I live it, not just speak it',
    'I belong without needing to conform',
    'My vulnerability does not compromise my strength',
    'I let people in without losing myself',
  ],
  pisces: [
    'I trust my intuition and creative imagination',
    'I am deeply connected to the universal flow',
    'My compassion heals myself and others',
    'I honor my sensitivity as a divine gift',
    'My boundaries protect my gifts, not limit them',
    'I am not responsible for absorbing everyone\'s pain',
    'My sensitivity is intelligence in another form',
    'I ground my dreams in action, one step at a time',
    'My inner world is rich and worthy of trust',
    'I choose clarity without losing compassion',
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
