/**
 * Card references, lists, counts and sentence finishing per language
 * (WP-NF-02 A5). WP-NF-04 reuses these for the playing cards.
 *
 * - en: a Major is its name ("The Moon", "Strength"); a Minor is "the Two of
 *   Cups", capitalized at the start of a sentence; "(reversed)" after a
 *   reversed card; "the Knight of Wands (Fire, reversed)" with an element.
 * - ja: a Major in 「」 (「月」), a Minor bare (カップの2); 「（逆位置）」 after a
 *   reversed card.
 * - ko: bare names (달, 컵 2); "(역방향)" after a reversed card. Particles are
 *   written in the templates as two-form markers and resolved after filling.
 * - zh: bare names (月亮, 圣杯二); 「（逆位）」 after a reversed card.
 */
import { joinSentences } from '../../components/readings/tarot/readingText';
import { resolveKoParticles } from '../../i18n/koJosa';
import type { SupportedLocale } from '../../i18n/config';
import { phrase } from './loadPhrases';
import type { PhraseKey } from './phrases.en';

export { joinSentences };

export interface RefCard {
  /** The card's name in the reading's language. */
  name: string;
  major: boolean;
  reversed: boolean;
  /** The element's display word, for `refWithElement`. */
  element?: string;
}

export function upperFirst(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Lowercase an English item's first letter unless it is "I" or an acronym. */
export function lowerFirst(s: string): string {
  return /^(I|[A-Z]{2,})\b/.test(s) ? s : s ? s[0].toLowerCase() + s.slice(1) : s;
}

/** The bare reference: en "the Two of Cups" / "The Moon"; ja 「月」 / カップの2; ko and zh the name. */
export function bareRef(locale: SupportedLocale, c: Pick<RefCard, 'name' | 'major'>): string {
  if (locale === 'en') return c.major ? c.name : `the ${c.name}`;
  if (locale === 'ja') return c.major ? `「${c.name}」` : c.name;
  return c.name;
}

/** The reference with its orientation: "the Three of Swords (reversed)". */
export function cardRef(locale: SupportedLocale, c: RefCard, orientation = true): string {
  const base = bareRef(locale, c);
  return orientation && c.reversed ? fill(phrase(locale, 'ref.reversed'), { card: base }) : base;
}

/** The reference with its element, the orientation in the same parentheses: "the Knight of Wands (Fire, reversed)". */
export function refWithElement(locale: SupportedLocale, c: RefCard): string {
  const key: PhraseKey = c.reversed ? 'ref.elementReversed' : 'ref.element';
  return fill(phrase(locale, key), { card: bareRef(locale, c), element: c.element ?? '' });
}

/** English possessive of a reference: "the Two of Cups’", "The Tower’s". Other languages take the reference as is. */
export function possessiveRef(locale: SupportedLocale, c: Pick<RefCard, 'name' | 'major'>): string {
  const base = bareRef(locale, c);
  if (locale !== 'en') return base;
  return `${base}’${c.name.endsWith('s') ? '' : 's'}`;
}

/** A list: en "A, B and C"; ja 「A、B、C」; ko "A, B, C"; zh 「A、B和C」. */
export function listJoin(locale: SupportedLocale, items: string[]): string {
  if (items.length <= 1) return items.join('');
  switch (locale) {
    case 'en':
      return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
    case 'ja':
      return items.join('、');
    case 'ko':
      return items.join(', ');
    case 'zh':
      return `${items.slice(0, -1).join('、')}和${items[items.length - 1]}`;
  }
}

/** A count: en words for one to ten, digits above ("five of ten", "eight of 21"); ja, ko and zh digits. */
export function countWord(locale: SupportedLocale, n: number): string {
  if (locale === 'en' && n >= 1 && n <= 10) return phrase('en', `count.${n}` as PhraseKey);
  return String(n);
}

/** Fill the {{name}} slots of a template. A slot with no value is left empty. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => (vars[k] === undefined ? '' : String(vars[k])));
}

/**
 * A finished sentence: en capitalized at its start; ko with every two-form
 * particle marker resolved by the word before it.
 */
export function finish(locale: SupportedLocale, s: string): string {
  if (locale === 'en') return upperFirst(s);
  if (locale === 'ko') return resolveKoParticles(s);
  return s;
}

/** Fill a template and finish the sentence. */
export function say(locale: SupportedLocale, key: PhraseKey, vars: Record<string, string | number> = {}): string {
  return finish(locale, fill(phrase(locale, key), vars));
}

/**
 * A sentence set inside another one ("Your attitude is the card you can
 * change: for the Knight of Wands (reversed), …"): en lowers a template's
 * opening "For"; a card name keeps its capital.
 */
export function embedded(locale: SupportedLocale, s: string): string {
  return locale === 'en' && /^For\b/.test(s) ? `f${s.slice(1)}` : s;
}

/** The first two items joined with the locale's "and": en "A and B", ja 「AとB」, ko "A과(와) B", zh 「A与B」. */
export function andPair(locale: SupportedLocale, a: string, b: string): string {
  switch (locale) {
    case 'en':
      return `${a} and ${b}`;
    case 'ja':
      return `${a}と${b}`;
    case 'ko':
      return resolveKoParticles(`${a}과(와) ${b}`);
    case 'zh':
      return `${a}与${b}`;
  }
}
