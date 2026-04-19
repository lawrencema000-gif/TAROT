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
 * Inject (or replace) hreflang <link> tags AND Open Graph og:locale meta
 * tags in <head> so search engines and social crawlers know the URL exists
 * in every supported locale. Call from a top-level effect whenever the
 * route or active locale changes; tags written by this helper are torn
 * down first so we never leak stale entries.
 */
export function syncHreflangTags(canonicalPath: string): void {
  if (typeof document === 'undefined') return;

  // Tear down previous tags we placed so re-rendering doesn't leak.
  document
    .querySelectorAll(`link[${HREFLANG_MARKER}], meta[${OG_LOCALE_MARKER}]`)
    .forEach((el) => el.parentNode?.removeChild(el));

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tarotlife.app';
  const base = `${origin}${canonicalPath || '/'}`;
  const sep = base.includes('?') ? '&' : '?';

  const head = document.head;
  if (!head) return;

  const addLink = (hreflang: string, href: string) => {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.setAttribute('hreflang', hreflang);
    link.href = href;
    link.setAttribute(HREFLANG_MARKER, '');
    head.appendChild(link);
  };

  for (const locale of SUPPORTED_LOCALES) {
    addLink(locale, `${base}${sep}lang=${locale}`);
  }
  addLink('x-default', base);

  // Open Graph locale: the primary og:locale reflects the active language,
  // og:locale:alternate lists the others. Social crawlers use this to pick
  // the right language when displaying link previews.
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
