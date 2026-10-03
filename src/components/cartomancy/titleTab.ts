import i18n, { getLocale, type SupportedLocale } from '../../i18n/config';
import { getPlayingCard } from '../../data/cartomancy/deck';
import { FACE_W } from '../../data/cartomancy/pipLayout';
import { localizePlayingCard } from '../../i18n/localizePlayingCard';

/**
 * The title tab at the foot of a playing-card face: its label and its
 * geometry, shared by the drawn face (PlayingCardFace, SVG) and the share
 * card (shareCard.ts, canvas) so the two never disagree.
 *
 * The label comes from the card's id and the active locale, never from the
 * `card` object a caller happens to hold. A live reading passes the English
 * card and a saved or shared one the localized card; both now print the
 * same name ("FOUR OF CLUBS" in English, "クラブの4" in Japanese).
 *
 * Latin labels are set in Inter caps with 1.4 units of tracking, and a long
 * name gives up tracking first (textLength), then size. CJK and Hangul are
 * set at one em per glyph with no tracking: a full-width glyph has no side
 * bearing to give, so spacing is never compressed (it would make glyphs
 * touch); a label too wide for the tab is set smaller instead. Every name
 * in the ja/ko/zh corpora fits at full size (nine glyphs at most).
 */

export const TAB = {
  y: 256,
  h: 20,
  rx: 4,
  baseline: 270,
  fontSize: 10,
  letterSpacing: 1.4,
  padX: 7,
  minW: 72,
  /**
   * 136 keeps the tab's left edge at x = 32, clear of the bottom corner
   * marks (circles of r = 4 at x = 26 and 174, stroke to 30.6).
   */
  maxW: 136,
} as const;

/** The smallest the label is set, in face units, before it would stop reading. */
export const TAB_MIN_FONT = 7;

/** Full-width scripts: CJK ideographs and punctuation, kana, Hangul, full-width forms. */
export function isWideChar(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0;
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x20000 && cp <= 0x3fffd)
  );
}

/** True when the label is set as Latin caps (tracked), false for CJK and Hangul. */
export function isLatinLabel(label: string): boolean {
  for (const ch of label) if (isWideChar(ch)) return false;
  return true;
}

/** The tab's label for a card, in the active locale. Jokers read "Joker" in every locale's word. */
export function titleTabLabel(cardId: number, locale: SupportedLocale = getLocale()): string {
  const card = getPlayingCard(cardId);
  if (!card) return '';
  const name =
    card.suit === 'joker'
      ? String(i18n.t('app:cartomancy.suits.joker', { lng: locale, defaultValue: 'Joker' }))
      : localizePlayingCard(card, locale).name;
  return isLatinLabel(name) ? name.toUpperCase() : name;
}

/**
 * Advance width of one character at 10 units: Inter 600 caps for Latin
 * (narrow I/J, wide M/W, the rest around 0.7 em), one em for a wide glyph.
 */
export function estimateCharWidth(ch: string): number {
  if (isWideChar(ch)) return 10;
  if (ch === ' ') return 3;
  if (ch === 'I' || ch === 'J') return 3.4;
  if (ch === 'M' || ch === 'W') return 9.4;
  if (ch === 'L' || ch === 'F' || ch === 'T' || ch === 'E') return 6.3;
  if (/[0-9]/.test(ch)) return 6.2;
  return 7.3;
}

/** The label's untracked width at 10 units, by the table above. */
export function estimateLabelWidth(label: string): number {
  let w = 0;
  for (const ch of label) w += estimateCharWidth(ch);
  return w;
}

export interface TitleTabLayout {
  text: string;
  /** Width of the tab rectangle. */
  w: number;
  /** Left edge of the tab rectangle. */
  x: number;
  fontSize: number;
  /** Tracking between glyphs; 0 for CJK and Hangul. */
  letterSpacing: number;
  /** The set width of the text, tracking included. */
  textW: number;
  latin: boolean;
}

/**
 * Lay the tab out for `label`. `untrackedWidth(text, fontSize)` measures
 * the glyphs alone: the estimate for SVG, ctx.measureText for canvas.
 */
export function titleTabLayout(
  label: string,
  untrackedWidth: (text: string, fontSize: number) => number = (text, size) => (estimateLabelWidth(text) * size) / TAB.fontSize,
): TitleTabLayout {
  const text = label;
  const latin = isLatinLabel(text);
  const gaps = Math.max(0, [...text].length - 1);
  const inner = TAB.maxW - TAB.padX * 2;
  let fontSize: number = TAB.fontSize;
  let letterSpacing: number = latin ? TAB.letterSpacing : 0;
  let base = untrackedWidth(text, fontSize);
  if (base + letterSpacing * gaps > inner) {
    if (latin && base <= inner && gaps > 0) {
      // give up tracking first, never below zero
      letterSpacing = Math.max(0, (inner - base) / gaps);
    } else {
      letterSpacing = 0;
      fontSize = Math.max(TAB_MIN_FONT, (TAB.fontSize * inner) / base);
      base = untrackedWidth(text, fontSize);
    }
  }
  const textW = base + letterSpacing * gaps;
  const w = Math.min(TAB.maxW, Math.max(TAB.minW, Math.round(textW + TAB.padX * 2)));
  return { text, w, x: FACE_W / 2 - w / 2, fontSize, letterSpacing, textW, latin };
}
