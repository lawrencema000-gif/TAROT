import type { Planet } from '../../types/astrology';
import type { SupportedLocale } from '../../i18n/config';
import { localizePlanetName } from '../../i18n/localizeNames';
import { localizeHanzi, hanziLang } from '../../i18n/localizeHanzi';
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
 * The mansion's single glyph (參) in the reader's script: 参 in Chinese and
 * Japanese, which is how their overlay titles (参宿) write it, and the
 * traditional form for English and Korean. `lang` marks the traditional form.
 */
export function mansionGlyph(mansion: Mansion, locale: SupportedLocale): { text: string; lang?: string } {
  return { text: localizeHanzi(mansion.cn, locale), lang: hanziLang(locale) };
}

/** The almanac's three-character name (參水猿 — mansion, luminary, animal) in the reader's script. */
export function mansionAlmanacName(mansion: Mansion, locale: SupportedLocale): string {
  return localizeHanzi(`${mansion.cn}${PLANET7_INFO[mansion.planet].cn}${mansion.animalCn}`, locale);
}

/**
 * A mansion's caption in the reader's language. Chinese and Japanese read the
 * almanac's own three-character name (胃土雉 — mansion, luminary, animal),
 * which is what Phase 7's "Wèi · Saturn" replaced (P7 #84/#170), in their own
 * script (参水猿, never 參水猿 over the title 参宿); English and Korean get
 * the romanised name and the planet in their own language.
 */
export function mansionCaption(mansion: Mansion, locale: SupportedLocale): { text: string; lang?: string } {
  if (locale === 'zh' || locale === 'ja') {
    return { text: mansionAlmanacName(mansion, locale), lang: hanziLang(locale) };
  }
  return { text: `${mansion.pinyin} · ${localizePlanetName(PLANET7_WESTERN[mansion.planet], locale)}` };
}
