export type Planet = 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto';
export type ZodiacSign = 'Aries' | 'Taurus' | 'Gemini' | 'Cancer' | 'Leo' | 'Virgo' | 'Libra' | 'Scorpio' | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';
export type Element = 'Fire' | 'Earth' | 'Air' | 'Water';
export type Modality = 'Cardinal' | 'Fixed' | 'Mutable';
export type AspectType = 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile';
export type ChartMode = 'exact' | 'approximate' | 'unknown';
export type HoroscopeSubTab = 'today' | 'chart' | 'forecast' | 'explore';

export interface PlanetPlacement {
  planet: Planet;
  sign: ZodiacSign;
  degree: number;
  longitude?: number;
  house: number | null;
}

export interface Aspect {
  planet1: Planet;
  planet2: Planet;
  type: AspectType;
  orb: number;
  applying: boolean;
}

export interface BigThree {
  sun: { sign: ZodiacSign; degree: number; house: number | null };
  moon: { sign: ZodiacSign; degree: number; house: number | null };
  rising: { sign: ZodiacSign; degree: number } | null;
}

export interface DominantsData {
  elements: Record<Element, number>;
  modalities: Record<Modality, number>;
  chartRuler: Planet | null;
  dominantPlanets: Planet[];
}

export interface NatalChart {
  planets: PlanetPlacement[];
  houses: number[];
  ascendant: number | null;
  bigThree: BigThree;
  aspects: Aspect[];
  dominants: DominantsData;
  chartMode: ChartMode;
}

export interface TransitEvent {
  date: string;
  transitPlanet: Planet;
  natalPlanet: Planet;
  aspectType: AspectType;
  orb: number;
  transitSign: ZodiacSign;
  natalSign: ZodiacSign;
}

export interface DailyContent {
  date: string;
  theme: string;
  summary: string;
  moonSign: ZodiacSign;
  moonHouse: number | null;
  transitHighlights: { planet: Planet; aspect: AspectType; natalPlanet: Planet; brief: string }[];
  categories: { love: string; career: string; money: string; energy: string };
  doList: string[];
  avoidList: string[];
  powerMove: string;
  ritual: string;
  journalPrompt: string;
}

export interface WeeklyContent {
  weekStart: string;
  weekEnd: string;
  mainStoryline: string;
  keyMoments: { day: string; event: string; advice: string }[];
  bestDays: { activity: string; day: string }[];
}

export interface MonthlyContent {
  month: string;
  overview: string;
  newMoon: { date: string; sign: ZodiacSign; house: number | null; theme: string } | null;
  fullMoon: { date: string; sign: ZodiacSign; house: number | null; theme: string } | null;
  keyDates: { date: string; event: string }[];
  oneThingToDoThisMonth: string;
  outerPlanetTransits: { planet: Planet; sign: ZodiacSign; theme: string }[];
}

export const ZODIAC_SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

export const PLANETS: Planet[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
];

export const SIGN_SYMBOLS: Record<ZodiacSign, string> = {
  Aries: '\u2648', Taurus: '\u2649', Gemini: '\u264A', Cancer: '\u264B',
  Leo: '\u264C', Virgo: '\u264D', Libra: '\u264E', Scorpio: '\u264F',
  Sagittarius: '\u2650', Capricorn: '\u2651', Aquarius: '\u2652', Pisces: '\u2653',
};

export const PLANET_SYMBOLS: Record<Planet, string> = {
  Sun: '\u2609', Moon: '\u263D', Mercury: '\u263F', Venus: '\u2640',
  Mars: '\u2642', Jupiter: '\u2643', Saturn: '\u2644', Uranus: '\u2645',
  Neptune: '\u2646', Pluto: '\u2647',
};

export const SIGN_ELEMENTS: Record<ZodiacSign, Element> = {
  Aries: 'Fire', Taurus: 'Earth', Gemini: 'Air', Cancer: 'Water',
  Leo: 'Fire', Virgo: 'Earth', Libra: 'Air', Scorpio: 'Water',
  Sagittarius: 'Fire', Capricorn: 'Earth', Aquarius: 'Air', Pisces: 'Water',
};

export const SIGN_MODALITIES: Record<ZodiacSign, Modality> = {
  Aries: 'Cardinal', Taurus: 'Fixed', Gemini: 'Mutable', Cancer: 'Cardinal',
  Leo: 'Fixed', Virgo: 'Mutable', Libra: 'Cardinal', Scorpio: 'Fixed',
  Sagittarius: 'Mutable', Capricorn: 'Cardinal', Aquarius: 'Fixed', Pisces: 'Mutable',
};

export const HOUSE_THEMES: string[] = [
  'Self & Identity', 'Values & Possessions', 'Communication & Learning',
  'Home & Family', 'Creativity & Romance', 'Health & Service',
  'Partnerships', 'Transformation & Shared Resources', 'Philosophy & Travel',
  'Career & Public Image', 'Community & Aspirations', 'Spirituality & Subconscious',
];
