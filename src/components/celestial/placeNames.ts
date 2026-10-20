import { getLocale, type SupportedLocale } from '../../i18n/config';

/**
 * Country names in the reader's language (p8 F25, F27).
 *
 * The curated city list (data/citiesGlobal.ts) carries English names and an
 * ISO 3166-1 code; the code is all Intl needs to say 日本, 일본 or 日本 /
 * 美国. City names stay as the list spells them: a name typed in the
 * reader's own script is answered by the place search instead (see
 * CelestialCitySearch).
 */
const displayNames = new Map<string, Intl.DisplayNames | null>();

function regionNames(locale: SupportedLocale): Intl.DisplayNames | null {
  let dn = displayNames.get(locale);
  if (dn === undefined) {
    try {
      dn = new Intl.DisplayNames([locale], { type: 'region' });
    } catch {
      dn = null;
    }
    displayNames.set(locale, dn);
  }
  return dn;
}

/** The country of `cc` in `locale`; the list's English `fallback` in English or where Intl cannot say. */
export function localizeCountry(cc: string, fallback: string, locale: SupportedLocale = getLocale()): string {
  if (locale === 'en' || !/^[A-Za-z]{2}$/.test(cc)) return fallback;
  try {
    return regionNames(locale)?.of(cc.toUpperCase()) || fallback;
  } catch {
    return fallback;
  }
}
