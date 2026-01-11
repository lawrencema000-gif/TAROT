import type { ZodiacSign, Goal } from '../types';
import {
  zodiacProfiles,
  elementThemes,
  planetaryInfluences,
  dailyThemesByDay,
  generalInsights,
  loveInsights,
  careerInsights,
  wellnessInsights,
  reflectionPrompts,
} from '../data/zodiacContent';

export interface DailyReading {
  sign: ZodiacSign;
  date: string;
  general: string;
  love: string;
  career: string;
  wellness: string;
  reflection: string;
  luckyNumber: number;
  luckyColor: string;
  energy: number;
  focusArea: string;
  planetaryInfluence: string;
}

export interface ReadingContext {
  sign: ZodiacSign;
  date: string;
  goals?: Goal[];
  focusArea?: 'love' | 'career' | 'general';
}

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function generateSeed(sign: ZodiacSign, date: string): number {
  const dateNum = new Date(date).getTime();
  const signNum = sign.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return dateNum + signNum * 1000;
}

function selectFromArray<T>(array: T[], random: () => number): T {
  return array[Math.floor(random() * array.length)];
}

const colors = [
  'Crimson', 'Gold', 'Silver', 'Azure', 'Emerald', 'Amber', 'Rose',
  'Ivory', 'Sapphire', 'Coral', 'Jade', 'Obsidian', 'Pearl', 'Copper',
  'Lavender', 'Turquoise', 'Burgundy', 'Champagne', 'Onyx', 'Marigold',
];

const focusAreas = [
  'personal growth', 'relationships', 'career advancement', 'self-discovery',
  'creative expression', 'emotional healing', 'spiritual development',
  'financial wisdom', 'health and vitality', 'meaningful connections',
];

const loveActions = [
  'expressing affection', 'deepening bonds', 'opening your heart',
  'honest communication', 'romantic gestures', 'quality time together',
];

const workActivities = [
  'strategic planning', 'collaboration', 'creative problem-solving',
  'networking', 'skill development', 'leadership opportunities',
];

const selfCareActivities = [
  'grounding meditation', 'creative expression', 'nature walks',
  'journaling', 'restorative rest', 'mindful movement',
];

const careerActions = [
  'taking initiative', 'building connections', 'showcasing expertise',
  'strategic planning', 'collaborative projects', 'skill development',
];

function interpolateTemplate(
  template: string,
  context: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => context[key] || key);
}

function buildContext(
  sign: ZodiacSign,
  date: Date,
  random: () => number
): Record<string, string> {
  const profile = zodiacProfiles[sign];
  const dayTheme = dailyThemesByDay[date.getDay()];
  const element = elementThemes[profile.element];
  const planetKey = profile.rulingPlanet.toLowerCase() as keyof typeof planetaryInfluences;
  const planet = planetaryInfluences[planetKey] || planetaryInfluences.sun;

  return {
    sign: sign.charAt(0).toUpperCase() + sign.slice(1),
    element: profile.element,
    modality: profile.modality,
    planet: profile.rulingPlanet,
    strength: selectFromArray(profile.strengths, random),
    challenge: selectFromArray(profile.challenges, random),
    loveStyle: profile.loveStyle,
    careerStrength: selectFromArray(profile.careerStrengths, random),
    talent: selectFromArray(profile.careerStrengths, random),
    gift: selectFromArray(profile.strengths, random),
    charm: selectFromArray(profile.strengths, random),
    skill: selectFromArray(profile.careerStrengths, random),
    quality: element.energy,
    dayTheme: dayTheme.theme,
    theme: planet.theme,
    focus: dayTheme.focus,
    action: dayTheme.energy,
    area: selectFromArray(focusAreas, random),
    goal: selectFromArray(focusAreas, random),
    destination: selectFromArray(focusAreas, random),
    activity: selectFromArray(workActivities, random),
    pursuit: selectFromArray(focusAreas, random),
    loveAction: selectFromArray(loveActions, random),
    aspiration: selectFromArray(['deeper connection', 'romantic harmony', 'authentic love'], random),
    workActivity: selectFromArray(workActivities, random),
    approach: selectFromArray(['authentic expression', 'dedicated effort', 'strategic thinking'], random),
    careerAction: selectFromArray(careerActions, random),
    selfCareActivity: selectFromArray(selfCareActivities, random),
    wellnessAction: selectFromArray(selfCareActivities, random),
    healingActivity: selectFromArray(['reflection', 'release', 'restoration'], random),
    nurturing: selectFromArray(['rest', 'movement', 'creativity'], random),
    healthFocus: selectFromArray(['balance', 'vitality', 'mindfulness'], random),
  };
}

export function generateDailyReading(ctx: ReadingContext): DailyReading {
  const { sign, date, goals = [] } = ctx;
  const seed = generateSeed(sign, date);
  const random = seededRandom(seed);
  const dateObj = new Date(date);
  const context = buildContext(sign, dateObj, random);
  const profile = zodiacProfiles[sign];
  const dayTheme = dailyThemesByDay[dateObj.getDay()];

  const generalTemplate = selectFromArray(generalInsights, random);
  const loveTemplate = selectFromArray(loveInsights, random);
  const careerTemplate = selectFromArray(careerInsights, random);
  const wellnessTemplate = selectFromArray(wellnessInsights, random);
  const reflectionTemplate = selectFromArray(reflectionPrompts, random);

  let focusArea = dayTheme.focus;
  if (goals.includes('love')) focusArea = 'relationships and connection';
  else if (goals.includes('career')) focusArea = 'professional growth';
  else if (goals.includes('healing')) focusArea = 'emotional wellness';

  const planetKey = profile.rulingPlanet.toLowerCase() as keyof typeof planetaryInfluences;
  const planet = planetaryInfluences[planetKey] || planetaryInfluences.sun;

  return {
    sign,
    date,
    general: interpolateTemplate(generalTemplate, context),
    love: interpolateTemplate(loveTemplate, context),
    career: interpolateTemplate(careerTemplate, context),
    wellness: interpolateTemplate(wellnessTemplate, context),
    reflection: interpolateTemplate(reflectionTemplate, context),
    luckyNumber: Math.floor(random() * 99) + 1,
    luckyColor: selectFromArray(colors, random),
    energy: Math.floor(random() * 5) + 1,
    focusArea,
    planetaryInfluence: planet.positive,
  };
}

export function generateExtendedReading(
  sign: ZodiacSign,
  date: string,
  focusArea: 'love' | 'career' | 'general'
): string[] {
  const seed = generateSeed(sign, date) + focusArea.charCodeAt(0);
  const random = seededRandom(seed);
  const dateObj = new Date(date);
  const context = buildContext(sign, dateObj, random);

  const templates = focusArea === 'love'
    ? loveInsights
    : focusArea === 'career'
      ? careerInsights
      : generalInsights;

  const readings: string[] = [];
  const usedIndices = new Set<number>();

  while (readings.length < 3 && usedIndices.size < templates.length) {
    const index = Math.floor(random() * templates.length);
    if (!usedIndices.has(index)) {
      usedIndices.add(index);
      readings.push(interpolateTemplate(templates[index], context));
    }
  }

  return readings;
}

export function generateWeeklyOverview(sign: ZodiacSign, startDate: string): {
  theme: string;
  focus: string;
  advice: string;
  dailyHighlights: { day: string; insight: string }[];
} {
  const seed = generateSeed(sign, startDate);
  const random = seededRandom(seed);
  const profile = zodiacProfiles[sign];
  const element = elementThemes[profile.element];

  const weekThemes = [
    'transformation and growth',
    'connection and harmony',
    'achievement and recognition',
    'reflection and renewal',
    'creativity and expression',
    'stability and foundation',
    'adventure and discovery',
  ];

  const dailyHighlights: { day: string; insight: string }[] = [];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const startDateObj = new Date(startDate);

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(startDateObj);
    dayDate.setDate(dayDate.getDate() + i);
    const dayTheme = dailyThemesByDay[dayDate.getDay()];
    dailyHighlights.push({
      day: days[dayDate.getDay()],
      insight: `Focus on ${dayTheme.focus}`,
    });
  }

  return {
    theme: selectFromArray(weekThemes, random),
    focus: element.advice,
    advice: element.challenge,
    dailyHighlights,
  };
}
