import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cartoSectionText, cartoSummary, cartoMainMeaning, isNeighbourBound, sentencesOf } from '../../components/cartomancy/cartoFlow';
import { getPlayingCardBySlug, PLAYING_CARDS_ALL } from '../../data/cartomancy';
import type { PlayingCard } from '../../types/cartomancy';

/*
 * p9 Q09: a card's section continues after the sentence the summary quoted
 * (F17). The Three of Hearts' love meaning is two sentences — "Shared
 * happiness: … celebrate together. Beside Spades it invites you to look
 * honestly at whether a third person, or a third thing, is taking up room
 * between you." — so on a love reading with no Spades out its whole section
 * was the Spades sentence: a third person, for "Will we patch things up
 * after the argument?" (QA m47-carto-0.png).
 *
 * A sentence that reads the card by its neighbours is now left to the full
 * meaning: neither the summary nor the short text prints it.
 */

const c = (slug: string): PlayingCard => {
  const card = getPlayingCardBySlug(slug);
  if (!card) throw new Error(slug);
  return card;
};
const FIELDS = ['meaningUpright', 'meaningReversed', 'loveMeaning', 'careerMeaning'] as const;
type Field = (typeof FIELDS)[number];
const cjk = (lng: string) =>
  JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', lng, 'cartomancy.json'), 'utf8')).cards as Record<string, Partial<Record<Field, string>>>;

/** Every sentence of every meaning a section can print, per locale. */
function corpus(lng: 'en' | 'ja' | 'ko' | 'zh'): Array<{ id: number; field: Field; sentence: string }> {
  const out: Array<{ id: number; field: Field; sentence: string }> = [];
  const local = lng === 'en' ? null : cjk(lng);
  for (const card of PLAYING_CARDS_ALL) {
    for (const field of FIELDS) {
      const text = local ? local[String(card.id)]?.[field] : card[field];
      if (typeof text !== 'string') continue;
      for (const sentence of sentencesOf(text)) out.push({ id: card.id, field, sentence });
    }
  }
  return out;
}

describe('p9 Q09 — a neighbour’s reading is not printed as the card’s own', () => {
  it('REPRO: Three Cards (love), Ace of Clubs · Three of Hearts · Two of Diamonds — the Three’s section has no Spades sentence', () => {
    const table = ['ace-of-clubs', 'three-of-hearts', 'two-of-diamonds'].map((s) => ({ card: c(s), reversed: false }));
    const main = cartoMainMeaning(table[1].card, false, 'love').text;
    expect(main).toContain('Beside Spades it invites you');
    const { short, more } = cartoSectionText(main, 1, 3);
    expect(short).not.toMatch(/Spades|third person/);
    // The whole meaning, the condition with it, is one tap away.
    expect(more).toBe(true);
    // And the summary quoted the sentence that holds on its own.
    expect(cartoSummary(null, table, 'love')).toContain('Shared happiness');
  });

  it('a lone card: the summary never quotes a neighbour’s reading, and the section is never one', () => {
    const three = cartoSummary(null, [{ card: c('three-of-hearts'), reversed: false }], 'love');
    expect(three).toBe('Shared happiness: a relationship that is fun as well as deep, an anniversary, a reason to celebrate together.');
    // Five of Hearts (love): its third sentence, "With gentle cards nearby…", was the whole section of a one-card draw.
    const five = cartoMainMeaning(c('five-of-hearts'), false, 'love').text;
    const { short, more } = cartoSectionText(five, 0, 1);
    expect(short).toBe('');
    expect(more).toBe(true);
    // Three of Hearts (general), alone: "Read with heavier cards…" is not printed, the next sentence that holds is.
    const general = cartoSectionText(c('three-of-hearts').meaningUpright, 0, 1);
    expect(general.short).not.toMatch(/heavier cards/);
    expect(general.short).toContain('On its own, it is a kind card.');
  });

  it('a meaning with no neighbour’s reading is cut exactly as before', () => {
    const text = c('ace-of-hearts').meaningUpright;
    const s = sentencesOf(text);
    expect(cartoSectionText(text, 1, 3)).toEqual({ short: `${s[1]} ${s[2]}`, more: s.length > 3 });
  });

  it('ja: the same table reads its Three of Hearts without the Spades sentence', () => {
    const ja = cjk('ja')['102'].loveMeaning!;
    const { short } = cartoSectionText(ja, 1, 3);
    expect(short).toBe('深いだけでなく楽しさもある関係、記念日、一緒にお祝いする理由。');
  });

  it('the patterns find the same neighbour sentences in all four corpora — no more, no fewer', () => {
    const where = (lng: 'en' | 'ja' | 'ko' | 'zh') =>
      corpus(lng).filter((x) => isNeighbourBound(x.sentence)).map((x) => `${x.id}.${x.field}`).sort();
    const en = where('en');
    expect(en).toEqual([
      '102.loveMeaning', // Beside Spades it invites you…
      '102.meaningUpright', // Read with heavier cards it can hint…
      '104.loveMeaning', // With gentle cards nearby it can also point…
      '108.meaningUpright', // The cards beside it describe the wish…
      '108.meaningUpright', // A Spade next to it does not cancel the wish…
      '120.meaningUpright', // …with the Nine of Hearts beside it the old books saw the dream job itself.
    ]);
    for (const lng of ['ja', 'ko', 'zh'] as const) expect(where(lng), lng).toEqual(en);
    // "a path with someone on it beside you" (Six of Clubs) is not a neighbour's reading.
    expect(isNeighbourBound('Sixes are paths, and the Six of Clubs is a path with someone on it beside you.')).toBe(false);
  });
});
