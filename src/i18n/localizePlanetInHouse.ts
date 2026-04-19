import type { Planet } from '../types/astrology';
import { getLocale, type SupportedLocale } from './config';
import jaPih from './locales/ja/planetInHouse.json';
import koPih from './locales/ko/planetInHouse.json';
import zhPih from './locales/zh/planetInHouse.json';

interface PlanetInHouseEntry {
  expression: string;
  themes: string[];
  healthy: string;
  unhealthy: string;
}

interface PlanetInHouseBundle {
  interpretations: Record<string, PlanetInHouseEntry>;
  planetKeywords: Record<string, string>;
  houseKeywords: Record<string, string>;
  genericExpression: string;
  genericThemePlanetInHouse: string;
  genericThemeGrowth: string;
  genericThemeIntegrate: string;
  genericHealthy: string;
  genericUnhealthy: string;
  defaultPlanetKey: string;
  defaultHouseKey: string;
}

const BUNDLES: Partial<Record<SupportedLocale, PlanetInHouseBundle>> = {
  ja: jaPih as PlanetInHouseBundle,
  ko: koPih as PlanetInHouseBundle,
  zh: zhPih as PlanetInHouseBundle,
};

export function getLocalizedPlanetInHouse(
  planet: Planet,
  house: number,
): PlanetInHouseEntry | null {
  const bundle = BUNDLES[getLocale()];
  if (!bundle) return null;
  return bundle.interpretations[`${planet}-${house}`] ?? null;
}

export function getLocalizedGenericPlanetInHouse(
  planet: Planet,
  house: number,
): PlanetInHouseEntry | null {
  const bundle = BUNDLES[getLocale()];
  if (!bundle) return null;
  const pKey = bundle.planetKeywords[planet] ?? bundle.defaultPlanetKey;
  const hKey = bundle.houseKeywords[String(house)] ?? bundle.defaultHouseKey;

  const fill = (tpl: string) => tpl
    .replace('{pKey}', pKey)
    .replace('{hKey}', hKey)
    .replace('{planet}', planet)
    .replace('{house}', String(house));

  return {
    expression: fill(bundle.genericExpression),
    themes: [
      fill(bundle.genericThemePlanetInHouse),
      fill(bundle.genericThemeGrowth),
      fill(bundle.genericThemeIntegrate),
    ],
    healthy: fill(bundle.genericHealthy),
    unhealthy: fill(bundle.genericUnhealthy),
  };
}
