// Chinese zodiac (animal sign) derived from birth year.
//
// Uses the modern simplified rule: year mod 12 maps to one of the 12 animals.
// This is an approximation — the traditional Chinese New Year falls in
// late Jan / mid Feb, so births between Jan 1 and Chinese New Year should
// technically belong to the PREVIOUS year's sign. For a first pass we use
// the calendar year; a follow-up can refine with a CNY lookup table if
// users report edge cases.

export type ChineseZodiacAnimal =
  | 'rat' | 'ox' | 'tiger' | 'rabbit' | 'dragon' | 'snake'
  | 'horse' | 'goat' | 'monkey' | 'rooster' | 'dog' | 'pig';

// 1900 was the Year of the Rat in the traditional 12-year cycle.
const CYCLE_START_YEAR = 1900;
const ANIMALS: ChineseZodiacAnimal[] = [
  'rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake',
  'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig',
];

export function getChineseZodiac(birthDate: string): ChineseZodiacAnimal | null {
  const m = birthDate.match(/^(\d{4})-/);
  if (!m) return null;
  const year = Number(m[1]);
  if (!year || year < 1900) return null;
  const index = (year - CYCLE_START_YEAR) % 12;
  return ANIMALS[((index % 12) + 12) % 12];
}

export interface ChineseZodiacInfo {
  animal: ChineseZodiacAnimal;
  emoji: string;
  element: 'wood' | 'fire' | 'earth' | 'metal' | 'water';
  traits: string[];
  tagline: string;
}

// Element rotation in Chinese astrology follows a 10-year cycle (5 elements
// × 2 polarities). Simplified here: returns the governing element by year.
function getYearElement(year: number): 'wood' | 'fire' | 'earth' | 'metal' | 'water' {
  const elements = ['metal', 'metal', 'water', 'water', 'wood', 'wood', 'fire', 'fire', 'earth', 'earth'] as const;
  const index = ((year - 1900) % 10 + 10) % 10;
  return elements[index];
}

export function getChineseZodiacInfo(birthDate: string): ChineseZodiacInfo | null {
  const m = birthDate.match(/^(\d{4})-/);
  if (!m) return null;
  const year = Number(m[1]);
  const animal = getChineseZodiac(birthDate);
  if (!animal) return null;

  const emojiMap: Record<ChineseZodiacAnimal, string> = {
    rat: '🐀', ox: '🐂', tiger: '🐅', rabbit: '🐇', dragon: '🐉', snake: '🐍',
    horse: '🐎', goat: '🐐', monkey: '🐒', rooster: '🐓', dog: '🐕', pig: '🐖',
  };

  const taglineMap: Record<ChineseZodiacAnimal, string> = {
    rat: 'Quick, resourceful, adaptable.',
    ox: 'Steady, enduring, strong of will.',
    tiger: 'Brave, magnetic, unpredictable.',
    rabbit: 'Gentle, intuitive, diplomatic.',
    dragon: 'Powerful, visionary, generous.',
    snake: 'Wise, enigmatic, deeply perceptive.',
    horse: 'Free-spirited, energetic, bold.',
    goat: 'Creative, empathetic, kind.',
    monkey: 'Clever, playful, inventive.',
    rooster: 'Honest, proud, meticulously observant.',
    dog: 'Loyal, protective, fair.',
    pig: 'Warm-hearted, generous, abundant.',
  };

  const traitsMap: Record<ChineseZodiacAnimal, string[]> = {
    rat: ['Adaptable', 'Witty', 'Resourceful'],
    ox: ['Patient', 'Reliable', 'Determined'],
    tiger: ['Courageous', 'Charismatic', 'Independent'],
    rabbit: ['Gentle', 'Artistic', 'Empathic'],
    dragon: ['Visionary', 'Magnetic', 'Generous'],
    snake: ['Wise', 'Strategic', 'Deep'],
    horse: ['Free', 'Warm', 'Adventurous'],
    goat: ['Creative', 'Caring', 'Peaceable'],
    monkey: ['Inventive', 'Curious', 'Playful'],
    rooster: ['Honest', 'Observant', 'Proud'],
    dog: ['Loyal', 'Protective', 'Fair'],
    pig: ['Generous', 'Warm', 'Abundant'],
  };

  return {
    animal,
    emoji: emojiMap[animal],
    element: getYearElement(year),
    traits: traitsMap[animal],
    tagline: taglineMap[animal],
  };
}
