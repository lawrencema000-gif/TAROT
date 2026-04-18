import type { ZodiacSign } from '../types';
import type { ZodiacProfile } from '../data/zodiacContent';
import { getLocale, type SupportedLocale } from './config';
import jaZodiac from './locales/ja/zodiac.json';
import koZodiac from './locales/ko/zodiac.json';
import zhZodiac from './locales/zh/zodiac.json';

interface LocalizedProfileFields {
  strengths?: string[];
  challenges?: string[];
  loveStyle?: string;
  careerStrengths?: string[];
  fullDescription?: string;
  shadowPattern?: string;
  loveDeep?: string;
  careerDeep?: string;
  moneyPattern?: string;
  spiritualLesson?: string;
  tarotArchetypeReason?: string;
}

interface ZodiacBundle {
  profiles: Partial<Record<ZodiacSign, LocalizedProfileFields>>;
}

const BUNDLES: Partial<Record<SupportedLocale, ZodiacBundle>> = {
  ja: jaZodiac as ZodiacBundle,
  ko: koZodiac as ZodiacBundle,
  zh: zhZodiac as ZodiacBundle,
};

/**
 * Overlay localized strings onto a zodiac profile. Returns the original
 * profile unchanged for English or missing locales; other locales merge
 * only the prose/keyword fields, preserving structural fields
 * (element, modality, rulingPlanet, tarotArchetype.card) that are used
 * as lookup keys elsewhere in the app.
 */
export function localizeZodiacProfile(
  sign: ZodiacSign,
  profile: ZodiacProfile,
  locale: SupportedLocale = getLocale(),
): ZodiacProfile {
  if (locale === 'en') return profile;
  const bundle = BUNDLES[locale];
  if (!bundle?.profiles?.[sign]) return profile;

  const tr = bundle.profiles[sign]!;
  return {
    ...profile,
    strengths: tr.strengths ?? profile.strengths,
    challenges: tr.challenges ?? profile.challenges,
    loveStyle: tr.loveStyle ?? profile.loveStyle,
    careerStrengths: tr.careerStrengths ?? profile.careerStrengths,
    fullDescription: tr.fullDescription ?? profile.fullDescription,
    shadowPattern: tr.shadowPattern ?? profile.shadowPattern,
    loveDeep: tr.loveDeep ?? profile.loveDeep,
    careerDeep: tr.careerDeep ?? profile.careerDeep,
    moneyPattern: tr.moneyPattern ?? profile.moneyPattern,
    spiritualLesson: tr.spiritualLesson ?? profile.spiritualLesson,
    tarotArchetype: {
      ...profile.tarotArchetype,
      reason: tr.tarotArchetypeReason ?? profile.tarotArchetype.reason,
    },
  };
}
