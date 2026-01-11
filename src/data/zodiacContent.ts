import type { ZodiacSign } from '../types';

export interface ZodiacProfile {
  element: 'fire' | 'earth' | 'air' | 'water';
  modality: 'cardinal' | 'fixed' | 'mutable';
  rulingPlanet: string;
  strengths: string[];
  challenges: string[];
  loveStyle: string;
  careerStrengths: string[];
}

export const zodiacProfiles: Record<ZodiacSign, ZodiacProfile> = {
  aries: {
    element: 'fire',
    modality: 'cardinal',
    rulingPlanet: 'Mars',
    strengths: ['courageous', 'determined', 'confident', 'enthusiastic'],
    challenges: ['impatient', 'impulsive', 'competitive'],
    loveStyle: 'passionate and direct',
    careerStrengths: ['leadership', 'initiative', 'pioneering'],
  },
  taurus: {
    element: 'earth',
    modality: 'fixed',
    rulingPlanet: 'Venus',
    strengths: ['reliable', 'patient', 'practical', 'devoted'],
    challenges: ['stubborn', 'possessive', 'resistant to change'],
    loveStyle: 'sensual and devoted',
    careerStrengths: ['persistence', 'financial acumen', 'stability'],
  },
  gemini: {
    element: 'air',
    modality: 'mutable',
    rulingPlanet: 'Mercury',
    strengths: ['adaptable', 'outgoing', 'intelligent', 'curious'],
    challenges: ['inconsistent', 'indecisive', 'restless'],
    loveStyle: 'playful and communicative',
    careerStrengths: ['communication', 'versatility', 'networking'],
  },
  cancer: {
    element: 'water',
    modality: 'cardinal',
    rulingPlanet: 'Moon',
    strengths: ['tenacious', 'loyal', 'emotional', 'sympathetic'],
    challenges: ['moody', 'pessimistic', 'suspicious'],
    loveStyle: 'nurturing and protective',
    careerStrengths: ['intuition', 'caregiving', 'memory'],
  },
  leo: {
    element: 'fire',
    modality: 'fixed',
    rulingPlanet: 'Sun',
    strengths: ['creative', 'passionate', 'generous', 'warm-hearted'],
    challenges: ['arrogant', 'stubborn', 'self-centered'],
    loveStyle: 'dramatic and generous',
    careerStrengths: ['leadership', 'creativity', 'performance'],
  },
  virgo: {
    element: 'earth',
    modality: 'mutable',
    rulingPlanet: 'Mercury',
    strengths: ['loyal', 'analytical', 'kind', 'hardworking'],
    challenges: ['shyness', 'worry', 'overly critical'],
    loveStyle: 'thoughtful and devoted',
    careerStrengths: ['analysis', 'attention to detail', 'service'],
  },
  libra: {
    element: 'air',
    modality: 'cardinal',
    rulingPlanet: 'Venus',
    strengths: ['cooperative', 'diplomatic', 'gracious', 'fair-minded'],
    challenges: ['indecisive', 'avoids confrontation', 'self-pity'],
    loveStyle: 'romantic and harmonious',
    careerStrengths: ['diplomacy', 'aesthetics', 'partnership'],
  },
  scorpio: {
    element: 'water',
    modality: 'fixed',
    rulingPlanet: 'Pluto',
    strengths: ['resourceful', 'brave', 'passionate', 'stubborn'],
    challenges: ['distrusting', 'jealous', 'secretive'],
    loveStyle: 'intense and transformative',
    careerStrengths: ['investigation', 'strategy', 'transformation'],
  },
  sagittarius: {
    element: 'fire',
    modality: 'mutable',
    rulingPlanet: 'Jupiter',
    strengths: ['generous', 'idealistic', 'great sense of humor'],
    challenges: ['promises more than can deliver', 'impatient', 'tactless'],
    loveStyle: 'adventurous and philosophical',
    careerStrengths: ['teaching', 'exploration', 'expansion'],
  },
  capricorn: {
    element: 'earth',
    modality: 'cardinal',
    rulingPlanet: 'Saturn',
    strengths: ['responsible', 'disciplined', 'self-control', 'good managers'],
    challenges: ['know-it-all', 'unforgiving', 'condescending'],
    loveStyle: 'traditional and committed',
    careerStrengths: ['management', 'planning', 'achievement'],
  },
  aquarius: {
    element: 'air',
    modality: 'fixed',
    rulingPlanet: 'Uranus',
    strengths: ['progressive', 'original', 'independent', 'humanitarian'],
    challenges: ['runs from emotional expression', 'temperamental', 'uncompromising'],
    loveStyle: 'unconventional and intellectual',
    careerStrengths: ['innovation', 'technology', 'humanitarian work'],
  },
  pisces: {
    element: 'water',
    modality: 'mutable',
    rulingPlanet: 'Neptune',
    strengths: ['compassionate', 'artistic', 'intuitive', 'gentle'],
    challenges: ['fearful', 'overly trusting', 'desire to escape reality'],
    loveStyle: 'dreamy and devoted',
    careerStrengths: ['creativity', 'healing', 'spirituality'],
  },
};

export const elementThemes = {
  fire: {
    energy: 'dynamic and action-oriented',
    advice: 'Channel your passion into meaningful pursuits',
    challenge: 'Practice patience and consider others\' perspectives',
  },
  earth: {
    energy: 'grounded and practical',
    advice: 'Build steadily toward your goals',
    challenge: 'Embrace change as an opportunity for growth',
  },
  air: {
    energy: 'intellectual and communicative',
    advice: 'Share your ideas and connect with others',
    challenge: 'Balance thinking with feeling and action',
  },
  water: {
    energy: 'emotional and intuitive',
    advice: 'Trust your inner wisdom and emotional intelligence',
    challenge: 'Set healthy boundaries while remaining compassionate',
  },
};

export const planetaryInfluences = {
  sun: {
    theme: 'vitality and self-expression',
    positive: 'Your authentic self shines brightly today',
    focus: 'identity, creativity, and leadership',
  },
  moon: {
    theme: 'emotions and intuition',
    positive: 'Your emotional wisdom guides you well',
    focus: 'feelings, home, and nurturing',
  },
  mercury: {
    theme: 'communication and thinking',
    positive: 'Clear communication opens doors',
    focus: 'ideas, learning, and connections',
  },
  venus: {
    theme: 'love and beauty',
    positive: 'Harmony and beauty surround you',
    focus: 'relationships, aesthetics, and values',
  },
  mars: {
    theme: 'action and energy',
    positive: 'Your drive and determination are strong',
    focus: 'initiative, courage, and ambition',
  },
  jupiter: {
    theme: 'expansion and luck',
    positive: 'Abundance and opportunity flow toward you',
    focus: 'growth, optimism, and wisdom',
  },
  saturn: {
    theme: 'structure and discipline',
    positive: 'Your efforts build lasting foundations',
    focus: 'responsibility, achievement, and mastery',
  },
  uranus: {
    theme: 'innovation and change',
    positive: 'Unexpected breakthroughs are possible',
    focus: 'originality, freedom, and revolution',
  },
  neptune: {
    theme: 'dreams and spirituality',
    positive: 'Your imagination and intuition are heightened',
    focus: 'creativity, compassion, and transcendence',
  },
  pluto: {
    theme: 'transformation and power',
    positive: 'Deep transformation brings renewal',
    focus: 'rebirth, intensity, and hidden truths',
  },
};

export const dailyThemesByDay: Record<number, { theme: string; focus: string; energy: string }> = {
  0: { theme: 'reflection', focus: 'rest and spiritual renewal', energy: 'contemplative' },
  1: { theme: 'new beginnings', focus: 'setting intentions and fresh starts', energy: 'initiating' },
  2: { theme: 'action', focus: 'courage and determination', energy: 'dynamic' },
  3: { theme: 'communication', focus: 'ideas and connections', energy: 'expressive' },
  4: { theme: 'expansion', focus: 'growth and abundance', energy: 'optimistic' },
  5: { theme: 'love', focus: 'relationships and pleasure', energy: 'harmonious' },
  6: { theme: 'discipline', focus: 'structure and achievement', energy: 'grounded' },
};

export const generalInsights = [
  'The cosmic energies align to support your {focus} today.',
  'Trust the universe as it guides you toward {theme}.',
  'Your {strength} serves you well in today\'s energies.',
  'The stars encourage you to embrace your {element} nature.',
  'Today\'s planetary influences highlight your natural {talent}.',
  'A moment of {dayTheme} energy creates space for growth.',
  'Your ruling planet {planet} strengthens your resolve today.',
  'The {modality} energy of your sign helps you {action}.',
  'Cosmic wisdom suggests focusing on {area} today.',
  'The universe supports your journey toward {goal}.',
  'Your {element} element brings {quality} to your endeavors.',
  'Today calls for embracing your {strength} nature.',
  'The stars illuminate your path toward {destination}.',
  'Planetary alignments favor {activity} and {pursuit}.',
  'Your natural {gift} is amplified by today\'s energies.',
];

export const loveInsights = [
  'Your {loveStyle} approach to love attracts meaningful connections.',
  'Venus energy enhances your natural charm and magnetism.',
  'Emotional authenticity deepens your romantic bonds today.',
  'Your {element} nature brings {quality} to relationships.',
  'The stars support heartfelt communication with loved ones.',
  'Romance flourishes when you embrace your {strength}.',
  'Trust your intuition in matters of the heart.',
  'Today favors {loveAction} in your romantic life.',
  'Your {sign} energy creates magnetic attraction.',
  'Love deepens through patience and understanding.',
  'Venus encourages you to express affection openly.',
  'Romantic opportunities align with your authentic self.',
  'Your natural {charm} draws positive attention today.',
  'Emotional bonds strengthen through honest expression.',
  'The cosmos supports romantic {aspiration}.',
];

export const careerInsights = [
  'Your {careerStrength} brings professional opportunities today.',
  'The stars favor {workActivity} in your career path.',
  'Your {element} nature supports steady professional growth.',
  'Saturn energy rewards your dedication and discipline.',
  'Jupiter brings expansion to your professional endeavors.',
  'Trust your {sign} instincts in business decisions.',
  'Your natural {talent} opens doors today.',
  'Career advancement comes through {approach}.',
  'Professional recognition awaits your {quality}.',
  'The cosmos supports ambitious pursuits and goals.',
  'Mercury favors important communications at work.',
  'Your {strength} positions you for success.',
  'Today\'s energy supports {careerAction}.',
  'Professional partnerships benefit from your {skill}.',
  'The stars align for meaningful career progress.',
];

export const wellnessInsights = [
  'Honor your {element} nature with {selfCareActivity}.',
  'Your energy benefits from {wellnessAction} today.',
  'Balance your {sign} tendencies with mindful rest.',
  'The moon phase supports {healingActivity}.',
  'Physical vitality increases through {activity}.',
  'Emotional wellness comes from honoring your needs.',
  'Your {element} element thrives with {nurturing}.',
  'Today favors {healthFocus} for optimal balance.',
  'Mind-body connection strengthens through awareness.',
  'Self-care rituals align with cosmic energies today.',
];

export const reflectionPrompts = [
  'How can you honor your {sign} nature more fully today?',
  'What would embracing your {strength} look like right now?',
  'Where might your {challenge} be holding you back?',
  'How does your {element} element guide your decisions?',
  'What message does {planet} have for you today?',
  'In what ways can you lean into {dayTheme} energy?',
  'What would your highest self choose in this moment?',
  'How can you transform {challenge} into strength?',
  'What is your intuition telling you about {area}?',
  'Where in your life is {theme} most needed?',
];

export function getZodiacProfile(sign: ZodiacSign): ZodiacProfile {
  return zodiacProfiles[sign];
}

export function getElementTheme(element: 'fire' | 'earth' | 'air' | 'water') {
  return elementThemes[element];
}

export function getDayTheme(date: Date) {
  return dailyThemesByDay[date.getDay()];
}
