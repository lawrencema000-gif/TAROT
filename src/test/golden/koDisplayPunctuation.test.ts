import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postcss from 'postcss';
import { CJK_FONTS } from '../../i18n/cjkFonts';

/*
 * p10 d3-ko-10: the "?" of a Korean display heading — 「무엇에 집중할까요?」,
 * 「차단을 해제할까요?」, a journal prompt — was drawn in Cormorant Garamond
 * while the Hangul around it came from a CJK face: 8px wide against 11.4px
 * at 24px, small and thin after the sentence. Japanese and Chinese write the
 * full-width ？, which Cormorant lacks; Korean writes the ASCII mark, which
 * Cormorant has. Korean display text now reads --font-display from
 * html:lang(ko): 'Cormorant Letters' (Cormorant's own files without the
 * sentence marks) and then Noto Serif KR, which sets the Hangul and the
 * marks alike. The app loads that serif for Korean: named but never
 * fetched, it let every Korean heading's Hangul fall to the body sans.
 *
 * jsdom applies no stylesheet and shapes no text, so this works the choice
 * out the way the browser's font matching does: for each character, the
 * first family in the stack with a face that covers it — a @font-face by
 * its unicode-range, a CJK web font the locale loads (src/i18n/cjkFonts.ts),
 * and the platform's own faces for the rest.
 */

const CSS = readFileSync(join(__dirname, '..', '..', 'index.css'), 'utf8');
const TAILWIND = readFileSync(join(process.cwd(), 'tailwind.config.js'), 'utf8');
const sheet = postcss.parse(CSS);

type Range = [number, number];
type Face = { family: string; style: string; weight: string; src: string; ranges: Range[] | null };

const ranges = (value: string): Range[] =>
  value.split(',').map((r) => {
    const [a, b] = r.trim().replace(/^U\+/i, '').split('-');
    return [parseInt(a, 16), parseInt(b ?? a, 16)];
  });

const FACES: Face[] = [];
sheet.walkAtRules('font-face', (at) => {
  const d: Record<string, string> = {};
  at.walkDecls((decl) => {
    d[decl.prop] = decl.value;
  });
  FACES.push({
    family: d['font-family'].replace(/['"]/g, ''),
    style: d['font-style'] ?? 'normal',
    weight: d['font-weight'] ?? '400',
    src: d.src,
    ranges: d['unicode-range'] ? ranges(d['unicode-range']) : null,
  });
});

const inRanges = (cp: number, rs: Range[]) => rs.some(([a, b]) => cp >= a && cp <= b);
/** What a Latin system face (Georgia, Noto Serif, the `serif` default for Latin) covers. */
const LATIN: Range[] = ranges('U+0000-02FF,U+2000-206F,U+20A0-20CF');

/**
 * The CJK web fonts a locale loads (src/i18n/cjkFonts.ts): each family its
 * Google Fonts query names, with the weights it asks for. The unicode-range
 * slices Google serves for the Korean families cover the Hangul and every
 * mark tested here.
 */
function loaded(lang: string): Map<string, number[]> {
  const families = new Map<string, number[]>();
  for (const [, family, weights] of (CJK_FONTS[lang] ?? '').matchAll(/family=([^:&]+):wght@([^&]+)/g)) {
    families.set(family.replace(/\+/g, ' '), weights.split(';').map(Number));
  }
  return families;
}

/** The family that draws `ch` in `stack`, for a page in `lang`, at the display weight (500, normal). */
function faceFor(stack: string[], ch: string, lang: string): string {
  const cp = ch.codePointAt(0)!;
  for (const family of stack) {
    const own = FACES.filter((f) => f.family === family && f.style === 'normal');
    if (own.length) {
      // A local() face without a unicode-range is a Latin system font under a metric-matched name.
      if (own.some((f) => (f.ranges ? inRanges(cp, f.ranges) : inRanges(cp, LATIN)))) return family;
      continue;
    }
    if (loaded(lang).has(family)) return family;
    if (family === 'Georgia' && inRanges(cp, LATIN)) return family;
    if (family === 'serif') return 'system';
  }
  return 'system';
}

/**
 * The weight CSS font matching takes, of those `available`, for a `desired`
 * one (CSS Fonts 4 §5.2): 400–500 looks up to 500 first, then down, then
 * up; below 400 looks down first; above 500, up first.
 */
function matchWeight(desired: number, available: number[]): number | undefined {
  const up = [...available].sort((a, b) => a - b);
  const down = [...up].reverse();
  const order =
    desired >= 400 && desired <= 500
      ? [...up.filter((w) => w >= desired && w <= 500), ...down.filter((w) => w < desired), ...up.filter((w) => w > 500)]
      : desired < 400
        ? [...down.filter((w) => w <= desired), ...up.filter((w) => w > desired)]
        : [...up.filter((w) => w >= desired), ...down.filter((w) => w < desired)];
  return order[0];
}

const families = (value: string) => value.split(',').map((f) => f.trim().replace(/^['"]|['"]$/g, ''));

/** --font-display as the document root computes it in `lang`: the last matching declaration. */
function displayStack(lang: string): string[] {
  document.documentElement.lang = lang;
  let value: string | undefined;
  sheet.walkRules((rule) => {
    rule.each((node) => {
      if (node.type === 'decl' && node.prop === '--font-display' && document.documentElement.matches(rule.selector)) value = node.value;
    });
  });
  expect(value, `--font-display in ${lang}`).toBeDefined();
  return families(value!);
}

/** font-family as index.css declares it on the first rule whose selector list names `selector`. */
function declaredFamily(selector: string): string | undefined {
  let value: string | undefined;
  sheet.walkRules((rule) => {
    if (value !== undefined || !rule.selectors.map((s) => s.trim()).includes(selector)) return;
    rule.each((node) => {
      if (node.type === 'decl' && node.prop === 'font-family') value = node.value;
    });
  });
  return value;
}

const ORIGINAL = ['Cormorant Garamond', 'Cormorant Fallback', 'Cormorant Fallback Android', 'Noto Serif JP', 'Noto Serif KR', 'Noto Serif SC', 'Georgia', 'serif'];
const expand = (rs: Range[]) => rs.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCodePoint(a + i))).join('');
/** The marks that punctuate a Korean sentence: ! " ' ( ) ? [ ] { } ~ ¡ « · » ¿, the dashes, the quotes, the ellipsis. */
const SENTENCE_MARKS = expand(ranges('U+0021-0022,U+0027-0029,U+003F,U+005B,U+005D,U+007B,U+007D-007E,U+00A1,U+00AB,U+00B7,U+00BB,U+00BF,U+2010-2015,U+2018-201F,U+2026'));
/** Letters, figures and the marks that sit inside them (a price, a time, a Latin name). */
const LETTERS_AND_FIGURES = 'Arcana MBTI ÉéÅ 0123456789 .,:;%$#&*+-/=@_|';

describe('Korean display text sets its marks in the Korean face (p10 d3-ko-10)', () => {
  it('every display class and the `font-display` utility read one token, --font-display', () => {
    for (const selector of ['.font-display-hero', '.heading-display-xl', '.heading-display-lg', '.heading-display-md', '.reading-quote', '.prose-reading h1', '.prose-reading h2', '.prose-reading h3', '.prose-reading blockquote']) {
      expect(declaredFamily(selector), selector).toBe('var(--font-display)');
    }
    expect(TAILWIND).toMatch(/\bdisplay:\s*\[\s*'var\(--font-display\)'\s*\]/);
  });

  it('ko: the Hangul of 「무엇에 집중할까요?」 and its "?" are drawn by one serif, Noto Serif KR', () => {
    const stack = displayStack('ko');
    const heading = '무엇에 집중할까요?';
    expect(faceFor(stack, '?', 'ko')).toBe(faceFor(stack, '요', 'ko'));
    // Not the body sans: a Korean heading stays a serif, as Japanese and Chinese ones do.
    for (const ch of heading.replace(/ /g, '')) expect(faceFor(stack, ch, 'ko'), ch).toBe('Noto Serif KR');
    for (const ch of SENTENCE_MARKS) expect(faceFor(stack, ch, 'ko'), ch).toBe('Noto Serif KR');
  });

  it('ko: the serif is loaded at Cormorant’s weights, so a heading’s Hangul and its letters resolve to the same one', () => {
    const serif = loaded('ko').get('Noto Serif KR');
    expect(serif, 'Noto Serif KR in the Korean font query').toBeDefined();
    const cormorant = [...new Set(FACES.filter((f) => f.family === 'Cormorant Letters' && f.style === 'normal').map((f) => Number(f.weight)))];
    expect(cormorant.sort((a, b) => a - b)).toEqual([500, 600]);
    // Any weight a heading asks for: .reading-quote's 400 (set at 500, as its
    // letters are), the display classes' 500, .heading-strong's 600 — none
    // synthesized — and whatever a utility beside `font-display` sets.
    for (let w = 100; w <= 900; w += 100) expect(matchWeight(w, serif!), `font-weight ${w}`).toBe(matchWeight(w, cormorant));
  });

  it('ko: letters, figures and the marks inside them stay in Cormorant, so "$19.99" or "Arcana" is one face', () => {
    const stack = displayStack('ko');
    for (const ch of LETTERS_AND_FIGURES) expect(faceFor(stack, ch, 'ko'), ch).toBe('Cormorant Letters');
  });

  it.each(['en', 'ja', 'zh'])('%s: the display stack is unchanged, and no serif is fetched for it', (lang) => {
    const stack = displayStack(lang);
    expect(stack).toEqual(ORIGINAL);
    for (const ch of `?!"'${LETTERS_AND_FIGURES}`) expect(faceFor(stack, ch, lang), ch).toBe('Cormorant Garamond');
    // A heading's kana and Han characters fall through to the platform's serif, as before.
    expect([...loaded(lang).keys()].filter((family) => /Serif/.test(family))).toEqual([]);
    const cjk: Record<string, string> = { en: '', ja: '何に集中しますか', zh: '你想专注于什么' };
    for (const ch of cjk[lang]) expect(faceFor(stack, ch, lang), ch).toBe('system');
  });

  it('Cormorant Letters is Cormorant Garamond’s own files, less the sentence marks and nothing else', () => {
    const letters = FACES.filter((f) => f.family === 'Cormorant Letters');
    // The latin faces at 500, 600 and the 400 italic, and the latin-ext faces at 500 and 600.
    expect(letters).toHaveLength(5);
    for (const face of letters) {
      const twin = FACES.find((f) => f.family === 'Cormorant Garamond' && f.src === face.src);
      expect(twin, face.src).toBeDefined();
      expect([face.style, face.weight]).toEqual([twin!.style, twin!.weight]);
      const covers = expand(face.ranges!);
      const twinCovers = expand(twin!.ranges!);
      // Nothing the twin lacks, and of what it has, only the marks are left out.
      expect([...covers].filter((ch) => !twinCovers.includes(ch))).toEqual([]);
      expect([...twinCovers].filter((ch) => !covers.includes(ch)).join('')).toBe([...SENTENCE_MARKS].filter((ch) => twinCovers.includes(ch)).join(''));
    }
  });
});
