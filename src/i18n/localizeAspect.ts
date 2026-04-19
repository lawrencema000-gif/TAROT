import type { Planet, AspectType } from '../types/astrology';
import { getLocale, type SupportedLocale } from './config';
import jaAspects from './locales/ja/aspects.json';
import koAspects from './locales/ko/aspects.json';
import zhAspects from './locales/zh/aspects.json';

interface AspectBundle {
  interpretations: Record<string, { meaning: string; howItFeels: string }>;
  typeDescriptions: Record<string, string>;
  genericMeaning: string;
  genericHowItFeels: string;
  genericSupportiveFeel: string;
  genericChallengingFeel: string;
  defaultConnector: string;
}

const BUNDLES: Partial<Record<SupportedLocale, AspectBundle>> = {
  ja: jaAspects as AspectBundle,
  ko: koAspects as AspectBundle,
  zh: zhAspects as AspectBundle,
};

export function getLocalizedAspectInterp(
  p1: Planet,
  p2: Planet,
  type: AspectType,
): { meaning: string; howItFeels: string } | null {
  const bundle = BUNDLES[getLocale()];
  if (!bundle) return null;
  const interp = bundle.interpretations[`${p1}-${p2}-${type}`]
    ?? bundle.interpretations[`${p2}-${p1}-${type}`];
  return interp ?? null;
}

export function getLocalizedGenericAspectInterp(
  p1: Planet,
  p2: Planet,
  type: AspectType,
): { meaning: string; howItFeels: string } | null {
  const bundle = BUNDLES[getLocale()];
  if (!bundle) return null;
  const typeDesc = bundle.typeDescriptions[type] ?? bundle.defaultConnector;
  const isEasy = type === 'trine' || type === 'sextile';
  const feel = isEasy ? bundle.genericSupportiveFeel : bundle.genericChallengingFeel;
  return {
    meaning: bundle.genericMeaning
      .replace('{typeDesc}', typeDesc)
      .replace('{p1}', p1)
      .replace('{p2}', p2),
    howItFeels: bundle.genericHowItFeels
      .replace('{p1}', p1)
      .replace('{p2}', p2)
      .replace('{feel}', feel),
  };
}
