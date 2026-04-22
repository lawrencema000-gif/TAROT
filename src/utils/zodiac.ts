import type { ZodiacSign } from '../types';

interface ZodiacInfo {
  sign: ZodiacSign;
  name: string;
  symbol: string;
  element: 'fire' | 'earth' | 'air' | 'water';
  dateRange: string;
  traits: string[];
  ruler: string;
}

export const zodiacData: Record<ZodiacSign, ZodiacInfo> = {
  aries: {
    sign: 'aries',
    name: 'Aries',
    symbol: '♈',
    element: 'fire',
    dateRange: 'Mar 21 - Apr 19',
    traits: ['Bold', 'Ambitious', 'Energetic', 'Courageous'],
    ruler: 'Mars',
  },
  taurus: {
    sign: 'taurus',
    name: 'Taurus',
    symbol: '♉',
    element: 'earth',
    dateRange: 'Apr 20 - May 20',
    traits: ['Reliable', 'Patient', 'Devoted', 'Stable'],
    ruler: 'Venus',
  },
  gemini: {
    sign: 'gemini',
    name: 'Gemini',
    symbol: '♊',
    element: 'air',
    dateRange: 'May 21 - Jun 20',
    traits: ['Curious', 'Adaptable', 'Witty', 'Social'],
    ruler: 'Mercury',
  },
  cancer: {
    sign: 'cancer',
    name: 'Cancer',
    symbol: '♋',
    element: 'water',
    dateRange: 'Jun 21 - Jul 22',
    traits: ['Intuitive', 'Sentimental', 'Protective', 'Nurturing'],
    ruler: 'Moon',
  },
  leo: {
    sign: 'leo',
    name: 'Leo',
    symbol: '♌',
    element: 'fire',
    dateRange: 'Jul 23 - Aug 22',
    traits: ['Creative', 'Passionate', 'Generous', 'Confident'],
    ruler: 'Sun',
  },
  virgo: {
    sign: 'virgo',
    name: 'Virgo',
    symbol: '♍',
    element: 'earth',
    dateRange: 'Aug 23 - Sep 22',
    traits: ['Analytical', 'Practical', 'Kind', 'Hardworking'],
    ruler: 'Mercury',
  },
  libra: {
    sign: 'libra',
    name: 'Libra',
    symbol: '♎',
    element: 'air',
    dateRange: 'Sep 23 - Oct 22',
    traits: ['Diplomatic', 'Fair', 'Social', 'Gracious'],
    ruler: 'Venus',
  },
  scorpio: {
    sign: 'scorpio',
    name: 'Scorpio',
    symbol: '♏',
    element: 'water',
    dateRange: 'Oct 23 - Nov 21',
    traits: ['Passionate', 'Resourceful', 'Brave', 'Mysterious'],
    ruler: 'Pluto',
  },
  sagittarius: {
    sign: 'sagittarius',
    name: 'Sagittarius',
    symbol: '♐',
    element: 'fire',
    dateRange: 'Nov 22 - Dec 21',
    traits: ['Optimistic', 'Adventurous', 'Philosophical', 'Free-spirited'],
    ruler: 'Jupiter',
  },
  capricorn: {
    sign: 'capricorn',
    name: 'Capricorn',
    symbol: '♑',
    element: 'earth',
    dateRange: 'Dec 22 - Jan 19',
    traits: ['Disciplined', 'Responsible', 'Ambitious', 'Persistent'],
    ruler: 'Saturn',
  },
  aquarius: {
    sign: 'aquarius',
    name: 'Aquarius',
    symbol: '♒',
    element: 'air',
    dateRange: 'Jan 20 - Feb 18',
    traits: ['Progressive', 'Independent', 'Humanitarian', 'Original'],
    ruler: 'Uranus',
  },
  pisces: {
    sign: 'pisces',
    name: 'Pisces',
    symbol: '♓',
    element: 'water',
    dateRange: 'Feb 19 - Mar 20',
    traits: ['Compassionate', 'Intuitive', 'Artistic', 'Gentle'],
    ruler: 'Neptune',
  },
};

export function getZodiacSign(birthDate: string): ZodiacSign {
  const date = new Date(birthDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'taurus';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'gemini';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'cancer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'scorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'sagittarius';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'aquarius';
  return 'pisces';
}

export function getZodiacElement(sign: ZodiacSign): 'fire' | 'earth' | 'air' | 'water' {
  return zodiacData[sign].element;
}

export function getElementColor(element: 'fire' | 'earth' | 'air' | 'water'): string {
  const colors = {
    fire: 'text-orange-400',
    earth: 'text-emerald-400',
    air: 'text-sky-400',
    water: 'text-blue-400',
  };
  return colors[element];
}

export function getCompatibility(sign1: ZodiacSign, sign2: ZodiacSign): number {
  const element1 = zodiacData[sign1].element;
  const element2 = zodiacData[sign2].element;

  if (sign1 === sign2) return 85;

  if (element1 === element2) return 90;

  const complementary: Record<string, string[]> = {
    fire: ['air'],
    air: ['fire'],
    earth: ['water'],
    water: ['earth'],
  };

  if (complementary[element1].includes(element2)) return 80;

  const challenging: Record<string, string[]> = {
    fire: ['water'],
    water: ['fire'],
    earth: ['air'],
    air: ['earth'],
  };

  if (challenging[element1].includes(element2)) return 55;

  return 65;
}
