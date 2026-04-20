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
  shadowInsights,
  cautionInsights,
  miniRitualTemplates,
} from '../data/zodiacContent';
import { dailyI18n } from '../i18n/localizeDailyInsights';

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
  shadow: string;
  caution: string;
  miniRitual: string;
  mood: string;
  actionStep: string;
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

// English fallback vocabulary. At runtime we pull the locale-appropriate
// lists from dailyInsights.* in app.json via dailyI18n.*(fallback).
const COLORS_EN = [
  'Crimson', 'Gold', 'Silver', 'Azure', 'Emerald', 'Amber', 'Rose',
  'Ivory', 'Sapphire', 'Coral', 'Jade', 'Obsidian', 'Pearl', 'Copper',
  'Lavender', 'Turquoise', 'Burgundy', 'Champagne', 'Onyx', 'Marigold',
];

const FOCUS_AREAS_EN = [
  'personal growth', 'relationships', 'career advancement', 'self-discovery',
  'creative expression', 'emotional healing', 'spiritual development',
  'financial wisdom', 'health and vitality', 'meaningful connections',
];

const LOVE_ACTIONS_EN = [
  'expressing affection', 'deepening bonds', 'opening your heart',
  'honest communication', 'romantic gestures', 'quality time together',
];

const WORK_ACTIVITIES_EN = [
  'strategic planning', 'collaboration', 'creative problem-solving',
  'networking', 'skill development', 'leadership opportunities',
];

const SELF_CARE_EN = [
  'grounding meditation', 'creative expression', 'nature walks',
  'journaling', 'restorative rest', 'mindful movement',
];

const CAREER_ACTIONS_EN = [
  'taking initiative', 'building connections', 'showcasing expertise',
  'strategic planning', 'collaborative projects', 'skill development',
];

const MOOD_EN = [
  'Quietly powerful', 'Restless but purposeful', 'Open and receptive',
  'Tender and raw', 'Grounded and resolute', 'Playful and light',
  'Contemplative and wise', 'Energized and magnetic', 'Clear-headed and decisive',
  'Protective and fierce', 'Hopeful and forward-looking', 'Patient and steady',
  'Emotionally honest', 'Resilient and recovering', 'Creative and inspired',
];

const ACTION_STEPS_EN = [
  'Take 5 minutes to journal about what you are grateful for today.',
  'Reach out to someone you have been thinking about.',
  'Set one clear intention for the day and write it down.',
  'Spend 10 minutes in quiet meditation or reflection.',
  'Do one thing that scares you a little.',
  'Name one emotion you are carrying right now without judging it.',
  'Tell someone what you appreciate about them, with one specific example.',
  'Make one decision you have been postponing.',
  'Do something physical for 10 minutes—walk, stretch, dance.',
  'Before bed tonight, write one sentence about what today taught you.',
  'Replace one complaint today with a request for what you need.',
  'Choose one relationship and invest 10 minutes of genuine attention.',
];

const ASPIRATIONS_EN = ['deeper connection', 'romantic harmony', 'authentic love'];
const APPROACHES_EN = ['authentic expression', 'dedicated effort', 'strategic thinking'];
const HEALING_EN = ['reflection', 'release', 'restoration'];
const NURTURING_EN = ['rest', 'movement', 'creativity'];
const HEALTH_FOCUS_EN = ['balance', 'vitality', 'mindfulness'];

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
  const enDayTheme = dailyThemesByDay[date.getDay()];
  const enElement = elementThemes[profile.element];
  const planetKey = profile.rulingPlanet.toLowerCase() as keyof typeof planetaryInfluences;
  const enPlanet = planetaryInfluences[planetKey] || planetaryInfluences.sun;

  // Pull the locale-appropriate strings from app.json (dailyInsights.*).
  // Each getter falls back to the English data-file value when the locale
  // bundle is missing an entry.
  const dayTheme = dailyI18n.dayTheme(date.getDay(), enDayTheme);
  const element = dailyI18n.element(profile.element, enElement);
  const planet = dailyI18n.planet(planetKey, enPlanet);

  const focusAreas       = dailyI18n.focusAreas(FOCUS_AREAS_EN);
  const loveActions      = dailyI18n.loveActions(LOVE_ACTIONS_EN);
  const workActivities   = dailyI18n.workActivities(WORK_ACTIVITIES_EN);
  const selfCareActivities = dailyI18n.selfCareActivities(SELF_CARE_EN);
  const careerActions    = dailyI18n.careerActions(CAREER_ACTIONS_EN);
  const aspirations      = dailyI18n.aspirations(ASPIRATIONS_EN);
  const approaches       = dailyI18n.approaches(APPROACHES_EN);
  const healingActivities= dailyI18n.healingActivities(HEALING_EN);
  const nurturing        = dailyI18n.nurturing(NURTURING_EN);
  const healthFocuses    = dailyI18n.healthFocuses(HEALTH_FOCUS_EN);

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
    aspiration: selectFromArray(aspirations, random),
    workActivity: selectFromArray(workActivities, random),
    approach: selectFromArray(approaches, random),
    careerAction: selectFromArray(careerActions, random),
    selfCareActivity: selectFromArray(selfCareActivities, random),
    wellnessAction: selectFromArray(selfCareActivities, random),
    healingActivity: selectFromArray(healingActivities, random),
    nurturing: selectFromArray(nurturing, random),
    healthFocus: selectFromArray(healthFocuses, random),
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

  const generalTemplate    = selectFromArray(dailyI18n.general(generalInsights), random);
  const loveTemplate       = selectFromArray(dailyI18n.love(loveInsights), random);
  const careerTemplate     = selectFromArray(dailyI18n.career(careerInsights), random);
  const wellnessTemplate   = selectFromArray(dailyI18n.wellness(wellnessInsights), random);
  const reflectionTemplate = selectFromArray(dailyI18n.reflection(reflectionPrompts), random);
  const shadowTemplate     = selectFromArray(dailyI18n.shadow(shadowInsights), random);
  const cautionTemplate    = selectFromArray(dailyI18n.caution(cautionInsights), random);
  const ritualTemplate     = selectFromArray(dailyI18n.ritual(miniRitualTemplates), random);

  const localizedDayTheme = dailyI18n.dayTheme(dateObj.getDay(), dayTheme);
  const planetKey = profile.rulingPlanet.toLowerCase() as keyof typeof planetaryInfluences;
  const enPlanet = planetaryInfluences[planetKey] || planetaryInfluences.sun;
  const localizedPlanet = dailyI18n.planet(planetKey, enPlanet);

  let focusArea = localizedDayTheme.focus;
  const focusAreasL = dailyI18n.focusAreas(FOCUS_AREAS_EN);
  if (goals.includes('love')) focusArea = focusAreasL[1] ?? focusArea;
  else if (goals.includes('career')) focusArea = focusAreasL[2] ?? focusArea;
  else if (goals.includes('healing')) focusArea = focusAreasL[5] ?? focusArea;

  return {
    sign,
    date,
    general: interpolateTemplate(generalTemplate, context),
    love: interpolateTemplate(loveTemplate, context),
    career: interpolateTemplate(careerTemplate, context),
    wellness: interpolateTemplate(wellnessTemplate, context),
    reflection: interpolateTemplate(reflectionTemplate, context),
    luckyNumber: Math.floor(random() * 99) + 1,
    luckyColor: selectFromArray(dailyI18n.colors(COLORS_EN), random),
    energy: Math.floor(random() * 5) + 1,
    focusArea,
    planetaryInfluence: localizedPlanet.positive,
    shadow: interpolateTemplate(shadowTemplate, context),
    caution: interpolateTemplate(cautionTemplate, context),
    miniRitual: interpolateTemplate(ritualTemplate, context),
    mood: selectFromArray(dailyI18n.moodDescriptors(MOOD_EN), random),
    actionStep: selectFromArray(dailyI18n.actionSteps(ACTION_STEPS_EN), random),
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
    ? dailyI18n.love(loveInsights)
    : focusArea === 'career'
      ? dailyI18n.career(careerInsights)
      : dailyI18n.general(generalInsights);

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
