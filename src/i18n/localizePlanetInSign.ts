import type { Planet, ZodiacSign } from '../types/astrology';
import { getLocale, type SupportedLocale } from './config';
import jaPis from './locales/ja/planetInSign.json';
import koPis from './locales/ko/planetInSign.json';
import zhPis from './locales/zh/planetInSign.json';

interface PlanetInSignEntry {
  core: string;
  strengths: string[];
  blindSpots: string[];
  underStress: string[];
  growthPath: string[];
}

interface PlanetInSignBundle {
  interpretations: Record<string, PlanetInSignEntry>;
}

const BUNDLES: Partial<Record<SupportedLocale, PlanetInSignBundle>> = {
  ja: jaPis as PlanetInSignBundle,
  ko: koPis as PlanetInSignBundle,
  zh: zhPis as PlanetInSignBundle,
};

export function getLocalizedPlanetInSign(
  planet: Planet,
  sign: ZodiacSign,
): PlanetInSignEntry | null {
  const bundle = BUNDLES[getLocale()];
  if (!bundle) return null;
  // Sign keys in JSON are capitalized (Aries, Taurus, …) to match the English data.
  const capSign = sign.charAt(0).toUpperCase() + sign.slice(1);
  return bundle.interpretations[`${planet}-${capSign}`] ?? null;
}
