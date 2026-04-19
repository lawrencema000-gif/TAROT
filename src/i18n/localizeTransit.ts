import type { Planet, AspectType } from '../types/astrology';
import { getLocale, type SupportedLocale } from './config';
import jaTransits from './locales/ja/transits.json';
import koTransits from './locales/ko/transits.json';
import zhTransits from './locales/zh/transits.json';

interface TransitEntry {
  theme: string;
  feeling: string;
  advice: string;
  duration: string;
}

interface TransitBundle {
  interpretations: Record<string, TransitEntry>;
  transitPlanetThemes: Record<string, string>;
  natalPlanetThemes: Record<string, string>;
  aspectDurations: Record<string, Record<string, string>>;
  defaultTransitTheme: string;
  defaultNatalTheme: string;
  defaultDuration: string;
  genericTheme: string;
  genericFeelingHard: string;
  genericFeelingSoft: string;
  genericFeelingNeutral: string;
  genericAdviceHard: string;
  genericAdviceSoft: string;
  genericAdviceNeutral: string;
}

const BUNDLES: Partial<Record<SupportedLocale, TransitBundle>> = {
  ja: jaTransits as TransitBundle,
  ko: koTransits as TransitBundle,
  zh: zhTransits as TransitBundle,
};

export function getLocalizedTransit(
  transit: Planet,
  natal: Planet,
  type: AspectType,
): TransitEntry | null {
  const bundle = BUNDLES[getLocale()];
  if (!bundle) return null;
  return bundle.interpretations[`${transit}-${natal}-${type}`] ?? null;
}

export function getLocalizedGenericTransit(
  transit: Planet,
  natal: Planet,
  type: AspectType,
): TransitEntry | null {
  const bundle = BUNDLES[getLocale()];
  if (!bundle) return null;
  const transitTheme = bundle.transitPlanetThemes[transit] ?? bundle.defaultTransitTheme;
  const natalTheme = bundle.natalPlanetThemes[natal] ?? bundle.defaultNatalTheme;
  const duration = bundle.aspectDurations[transit]?.[type] ?? bundle.defaultDuration;
  const isHard = type === 'square' || type === 'opposition';
  const isSoft = type === 'trine' || type === 'sextile';

  const feeling = isHard ? bundle.genericFeelingHard
    : isSoft ? bundle.genericFeelingSoft
    : bundle.genericFeelingNeutral;
  const advice = isHard ? bundle.genericAdviceHard
    : isSoft ? bundle.genericAdviceSoft
    : bundle.genericAdviceNeutral;

  const fill = (tpl: string) => tpl
    .replace('{transit}', transit)
    .replace('{natal}', natal)
    .replace('{type}', type)
    .replace('{transitTheme}', transitTheme)
    .replace('{natalTheme}', natalTheme);

  return {
    theme: fill(bundle.genericTheme),
    feeling: fill(feeling),
    advice: fill(advice),
    duration,
  };
}
