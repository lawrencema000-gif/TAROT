import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import i18n from '../../i18n/config';
import { PlayingCardFace } from '../../components/cartomancy/PlayingCardFace';
import { TAB, isLatinLabel, titleTabLabel, titleTabLayout } from '../../components/cartomancy/titleTab';
import { localizePlayingCard } from '../../i18n/localizePlayingCard';
import { PLAYING_CARDS_ALL } from '../../data/cartomancy';
import type { SupportedLocale } from '../../i18n/config';

/**
 * The title tab on a playing-card face, in every locale.
 *
 * It names the card in the reader's language (it printed "FOUR OF CLUBS"
 * above "クラブの4"), the same on a live table, a saved reading and a shared
 * one whatever `card` the caller holds, never squeezes CJK or Hangul glyphs
 * together, and stays clear of the bottom corner marks.
 */

const LOCALES = ['ja', 'ko', 'zh'] as const;
const read = (lng: string, ns: string) => JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', lng, `${ns}.json`), 'utf8'));

beforeAll(() => {
  for (const lng of LOCALES) {
    i18n.addResourceBundle(lng, 'cartomancy', read(lng, 'cartomancy'), true, true);
    i18n.addResourceBundle(lng, 'app', read(lng, 'app'), true, true);
  }
});
afterAll(() => {
  for (const lng of LOCALES) i18n.removeResourceBundle(lng, 'cartomancy');
});

const render = (card: (typeof PLAYING_CARDS_ALL)[number], locale: SupportedLocale, props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(createElement(PlayingCardFace, { card, locale, ...props }));
const tabText = (html: string) => html.match(/<g data-tab="1"[^>]*>.*?<text([^>]*)>([^<]*)<\/text>/)!;
const tabRectX = (html: string) => Number(html.match(/<g data-tab="1"[^>]*><rect x="([\d.]+)"/)![1]);

describe('the title tab', () => {
  it('prints the card’s name in the reader’s language', () => {
    const four = PLAYING_CARDS_ALL.find((c) => c.slug === 'four-of-clubs')!;
    expect(tabText(render(four, 'en'))[2]).toBe('FOUR OF CLUBS');
    for (const lng of LOCALES) {
      const html = render(four, lng);
      expect(tabText(html)[2], lng).toBe(localizePlayingCard(four, lng).name);
      expect(tabText(html)[2], lng).not.toMatch(/FOUR|CLUBS/);
    }
    const joker = PLAYING_CARDS_ALL.find((c) => c.slug === 'red-joker')!;
    expect(tabText(render(joker, 'en'))[2]).toBe('JOKER');
    expect(tabText(render(joker, 'ja'))[2]).toBe(read('ja', 'app').cartomancy.suits.joker);
  });

  it('draws the same face from the English card and from the localized one (live and saved agree)', () => {
    for (const lng of LOCALES) {
      for (const card of PLAYING_CARDS_ALL) {
        expect(render(localizePlayingCard(card, lng), lng), `${lng} ${card.slug}`).toBe(render(card, lng));
      }
    }
  });

  it('never compresses CJK or Hangul: no tracking, no textLength, and every corpus name fits at full size', () => {
    for (const lng of LOCALES) {
      for (const card of PLAYING_CARDS_ALL) {
        const label = titleTabLabel(card.id, lng);
        if (isLatinLabel(label)) continue;
        const layout = titleTabLayout(label);
        expect(layout.fontSize, `${lng} ${label}`).toBe(TAB.fontSize);
        expect(layout.letterSpacing).toBe(0);
        expect(layout.textW + TAB.padX * 2, `${lng} ${label}`).toBeLessThanOrEqual(TAB.maxW);
        const attrs = tabText(render(card, lng))[1];
        expect(attrs, `${lng} ${card.slug}`).not.toContain('textLength');
        expect(attrs).not.toContain('letter-spacing');
      }
    }
  });

  it('tracks Latin caps and only ever gives tracking up, never below zero', () => {
    for (const card of PLAYING_CARDS_ALL) {
      const layout = titleTabLayout(titleTabLabel(card.id, 'en'));
      expect(layout.letterSpacing, card.slug).toBeGreaterThanOrEqual(0);
      expect(layout.letterSpacing).toBeLessThanOrEqual(TAB.letterSpacing);
      expect(tabText(render(card, 'en'))[1]).toContain('textLength');
    }
    // a name far too long for the tab is set smaller rather than overlapping
    const long = titleTabLayout('WWWWWWWWWWWWWWWWWWWW');
    expect(long.fontSize).toBeLessThan(TAB.fontSize);
    expect(long.letterSpacing).toBe(0);
  });

  it('stays clear of the bottom corner marks on every card, in every locale (x ≥ 32)', () => {
    for (const lng of ['en', ...LOCALES] as const) {
      for (const card of PLAYING_CARDS_ALL) {
        const x = tabRectX(render(card, lng));
        expect(x, `${lng} ${card.slug}`).toBeGreaterThanOrEqual(32);
      }
    }
    // the four Diamonds the review measured at x < 30
    for (const slug of ['three-of-diamonds', 'seven-of-diamonds', 'eight-of-diamonds', 'queen-of-diamonds']) {
      const card = PLAYING_CARDS_ALL.find((c) => c.slug === slug)!;
      expect(titleTabLayout(titleTabLabel(card.id, 'en')).w).toBeLessThanOrEqual(136);
    }
  });
});
