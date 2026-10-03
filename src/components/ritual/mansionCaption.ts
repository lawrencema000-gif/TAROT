import type { Planet } from '../../types/astrology';
import type { SupportedLocale } from '../../i18n/config';
import { localizePlanetName } from '../../i18n/localizeNames';
import { PLANET7_INFO, type Mansion, type Planet7 } from '../../data/lunarMansions';

/** The 七曜 luminary → the Western planet it names, for a localised planet word. */
const PLANET7_WESTERN: Record<Planet7, Planet> = {
  sun: 'Sun',
  moon: 'Moon',
  fire: 'Mars',
  water: 'Mercury',
  wood: 'Jupiter',
  metal: 'Venus',
  earth: 'Saturn',
};

/**
 * A mansion's caption in the reader's language. Chinese and Japanese read the
 * almanac's own three-character name (胃土雉 — mansion, luminary, animal),
 * which is what Phase 7's "Wèi · Saturn" replaced (P7 #84/#170); English and
 * Korean get the romanised name and the planet in their own language.
 */
export function mansionCaption(mansion: Mansion, locale: SupportedLocale): { text: string; lang?: string } {
  if (locale === 'zh' || locale === 'ja') {
    return { text: `${mansion.cn}${PLANET7_INFO[mansion.planet].cn}${mansion.animalCn}`, lang: 'zh-Hant' };
  }
  return { text: `${mansion.pinyin} · ${localizePlanetName(PLANET7_WESTERN[mansion.planet], locale)}` };
}
