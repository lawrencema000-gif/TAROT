/**
 * The Google Fonts query for each CJK locale: the sans its body text is set
 * in, and for Korean the serif its display text is set in too.
 *
 * One table, read twice: src/i18n/config.ts (loadCjkFonts) appends the
 * stylesheet once i18next settles on the language, and vite.config.ts
 * (localePreloadPlugin) inlines a `<link rel=preload as=style>` for the very
 * same URL from index.html, before the entry has parsed. A preload only pays
 * off when its URL is byte-for-byte the one requested later, so both build
 * it with cjkFontHref() from this table.
 *
 * Noto Serif KR (p10 d3-ko-10): a Korean heading sets its Hangul, and the
 * ASCII marks Korean punctuates with (「무엇에 집중할까요?」), in it — see
 * html:lang(ko) in index.css. Without it the Hangul of every Korean heading
 * fell to the body sans. 500 and 600 are Cormorant Garamond's own weights,
 * so whatever weight a heading asks for, its Hangul and its Latin letters
 * resolve to the same one. Google serves a Korean family as a variable
 * font cut into unicode-range slices: one file per slice holds both
 * weights, and a page fetches only the slices that hold the characters its
 * headings use (25–40 KB each). Japanese and Chinese headings keep the
 * platform's serif.
 */
export const CJK_FONTS: Record<string, string> = {
  ja: 'family=Noto+Sans+JP:wght@400;600',
  ko: 'family=Noto+Sans+KR:wght@400;600&family=Noto+Serif+KR:wght@500;600',
  zh: 'family=Noto+Sans+SC:wght@400;600',
};

export const CJK_FONT_CSS_BASE = 'https://fonts.googleapis.com/css2?';
export const CJK_FONT_CSS_SUFFIX = '&display=swap';

export function cjkFontHref(query: string): string {
  return `${CJK_FONT_CSS_BASE}${query}${CJK_FONT_CSS_SUFFIX}`;
}
