import { getLocale, SUPPORTED_LOCALES, type SupportedLocale } from './config';

const HREFLANG_MARKER = 'data-arcana-hreflang';
const OG_LOCALE_MARKER = 'data-arcana-oglocale';

/** Map our short locale codes to Open Graph / Facebook full locale format. */
const OG_LOCALE: Record<SupportedLocale, string> = {
  en: 'en_US',
  ja: 'ja_JP',
  ko: 'ko_KR',
  zh: 'zh_CN',
};

/**
 * Keep the social-crawler locale tags in <head> in step with the active
 * language: `og:locale` for the language on screen and
 * `og:locale:alternate` for the others. Call from a top-level effect
 * whenever the route or active locale changes; tags written by this helper
 * are torn down first so we never leak stale entries.
 *
 * No hreflang `<link rel="alternate">` is written here any more. The old
 * version advertised `?lang=en|ja|ko|zh` as four alternates of every URL,
 * but a `?lang=` URL is a preference, not a page: it serves the identical
 * English HTML, and `setPageMeta` strips the query so its canonical is the
 * bare URL. Lighthouse failed `/?lang=ja` on exactly that ("canonical
 * points to another hreflang location"), generate-sitemap.mjs had already
 * stopped listing the variants, and Search Console had filed ~1,400 of
 * them as junk. This is decision A of the localisation plan: English-only
 * shells, one canonical, no fake alternates. When real localized URLs
 * exist (`/ja/astrology/aries`, with their own `<html lang>`, title and
 * self-canonical) the hreflang cluster belongs in the prerender, emitted
 * server-side with x-default — never mixed with the query form.
 *
 * `canonicalPath` is kept in the signature so the call site (App.tsx) is
 * unchanged; stale link tags from an earlier bundle are still removed.
 */
export function syncHreflangTags(canonicalPath: string): void {
  void canonicalPath;
  if (typeof document === 'undefined') return;

  // Tear down previous tags we placed so re-rendering doesn't leak.
  document
    .querySelectorAll(`link[${HREFLANG_MARKER}], meta[${OG_LOCALE_MARKER}]`)
    .forEach((el) => el.parentNode?.removeChild(el));

  const head = document.head;
  if (!head) return;

  // Open Graph locale: the primary og:locale reflects the active language,
  // og:locale:alternate lists the others. Social crawlers use this to pick
  // the right language when displaying link previews. setPageMeta also
  // writes a static `og:locale`; the one here is the live value and sits
  // after it, so a crawler reading the last wins.
  const active = getLocale();
  const primary = document.createElement('meta');
  primary.setAttribute('property', 'og:locale');
  primary.content = OG_LOCALE[active] ?? OG_LOCALE.en;
  primary.setAttribute(OG_LOCALE_MARKER, '');
  head.appendChild(primary);

  for (const locale of SUPPORTED_LOCALES) {
    if (locale === active) continue;
    const alt = document.createElement('meta');
    alt.setAttribute('property', 'og:locale:alternate');
    alt.content = OG_LOCALE[locale];
    alt.setAttribute(OG_LOCALE_MARKER, '');
    head.appendChild(alt);
  }
}
