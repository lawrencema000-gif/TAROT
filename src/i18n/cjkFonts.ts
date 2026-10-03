/**
 * The Google Fonts query for each CJK locale's sans.
 *
 * One table, read twice: src/i18n/config.ts (loadCjkFonts) appends the
 * stylesheet once i18next settles on the language, and vite.config.ts
 * (localePreloadPlugin) inlines a `<link rel=preload as=style>` for the very
 * same URL from index.html, before the entry has parsed. A preload only pays
 * off when its URL is byte-for-byte the one requested later, so both build
 * it with cjkFontHref() from this table.
 */
export const CJK_FONTS: Record<string, string> = {
  ja: 'family=Noto+Sans+JP:wght@400;600',
  ko: 'family=Noto+Sans+KR:wght@400;600',
  zh: 'family=Noto+Sans+SC:wght@400;600',
};

export const CJK_FONT_CSS_BASE = 'https://fonts.googleapis.com/css2?';
export const CJK_FONT_CSS_SUFFIX = '&display=swap';

export function cjkFontHref(query: string): string {
  return `${CJK_FONT_CSS_BASE}${query}${CJK_FONT_CSS_SUFFIX}`;
}
