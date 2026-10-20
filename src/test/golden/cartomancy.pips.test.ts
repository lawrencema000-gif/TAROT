import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PIP_LAYOUT, PIP_X, PIP_Y, FACE_H, pipsFor, pipSizeFor, ACE_PIP_SIZE, PIP_SIZE } from '../../data/cartomancy/pipLayout';
import { PLAYING_CARDS_ALL, PLAYING_RANKS, isCourtCard, isJoker } from '../../data/cartomancy/deck';
import { PlayingCardFace } from '../../components/cartomancy/PlayingCardFace';
import { SUIT_PATHS } from '../../components/cartomancy/SuitGlyph';
import type { PipRank } from '../../types/cartomancy';

/**
 * The pip lattice and the drawn face.
 *
 * The lattice is checked as geometry: a card of rank n carries n pips, the
 * lower half mirrors the upper half (every y has a partner at 300 − y) and
 * every pip below the middle is inverted. The one standard exception is the
 * Seven, whose odd pip sits in the upper half alone, as on any printed deck.
 *
 * The face is checked as markup: rendered for all 54 cards it carries the
 * right number of pips, two corner indices, a title tab at `full` and none
 * at `quiet`, and it is byte-identical across renders.
 */

const PIP_RANKS: PipRank[] = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const COLUMNS = Object.values(PIP_X) as number[];
const ROWS = Object.values(PIP_Y) as number[];
const count = (html: string, needle: string) => html.split(needle).length - 1;

describe('the pip lattice', () => {
  it('gives a card of rank n exactly n pips', () => {
    for (const rank of PIP_RANKS) {
      const n = PLAYING_RANKS.indexOf(rank) + 1;
      expect(PIP_LAYOUT[rank], rank).toHaveLength(n);
      expect(pipsFor(rank), rank).toHaveLength(n);
    }
    expect(pipsFor('jack')).toBeNull();
    expect(pipsFor('queen')).toBeNull();
    expect(pipsFor('king')).toBeNull();
    expect(pipsFor('joker')).toBeNull();
  });

  it('places every pip on the three columns and seven rows', () => {
    for (const rank of PIP_RANKS) {
      for (const p of PIP_LAYOUT[rank]) {
        expect(COLUMNS, `${rank} x=${p.x}`).toContain(p.x);
        expect(ROWS, `${rank} y=${p.y}`).toContain(p.y);
      }
    }
  });

  it('mirrors the lower half on the upper half, except the Seven’s odd pip', () => {
    for (const rank of PIP_RANKS) {
      const ys = PIP_LAYOUT[rank].map((p) => p.y).sort((a, b) => a - b);
      const mirrored = PIP_LAYOUT[rank].map((p) => FACE_H - p.y).sort((a, b) => a - b);
      if (rank === '7') {
        // six paired pips and the one at the upper-mid row with no partner
        const unpaired = ys.filter((y) => !mirrored.includes(y));
        expect(unpaired).toEqual([PIP_Y.upperMid]);
        expect(ys.filter((y) => mirrored.includes(y))).toHaveLength(6);
      } else {
        expect(ys, rank).toEqual(mirrored);
      }
    }
  });

  it('inverts exactly the pips below the middle', () => {
    for (const rank of PIP_RANKS) {
      for (const p of PIP_LAYOUT[rank]) expect(p.inverted, `${rank} y=${p.y}`).toBe(p.y > FACE_H / 2);
    }
  });

  it('never puts two pips in one place', () => {
    for (const rank of PIP_RANKS) {
      const places = PIP_LAYOUT[rank].map((p) => `${p.x}:${p.y}`);
      expect(new Set(places).size, rank).toBe(places.length);
    }
  });

  it('centres the Ace’s single large pip', () => {
    expect(PIP_LAYOUT.ace).toEqual([{ x: PIP_X.C, y: PIP_Y.r4, inverted: false }]);
    expect(pipSizeFor('ace')).toBe(ACE_PIP_SIZE);
    expect(pipSizeFor('2')).toBe(PIP_SIZE);
    expect(ACE_PIP_SIZE).toBeGreaterThan(PIP_SIZE);
  });

  it('matches the printed convention for the Eight, Nine and Ten', () => {
    const at = (rank: PipRank) => PIP_LAYOUT[rank].map((p) => [p.x, p.y]);
    expect(at('8')).toContainEqual([PIP_X.C, PIP_Y.upperMid]);
    expect(at('8')).toContainEqual([PIP_X.C, PIP_Y.lowerMid]);
    expect(at('9')).toContainEqual([PIP_X.C, PIP_Y.r4]);
    expect(at('10')).not.toContainEqual([PIP_X.C, PIP_Y.r4]);
    expect(at('10').filter(([x]) => x === PIP_X.C)).toHaveLength(2);
  });
});

describe('the suit paths', () => {
  it('are four closed, absolute-start d strings', () => {
    for (const [suit, d] of Object.entries(SUIT_PATHS)) {
      expect(d, suit).toMatch(/^M/);
      expect(d, suit).toMatch(/Z$/);
      expect(d.length, suit).toBeGreaterThan(20);
    }
  });
});

describe('the drawn face', () => {
  const render = (card: (typeof PLAYING_CARDS_ALL)[number], props: Record<string, unknown> = {}) =>
    renderToStaticMarkup(createElement(PlayingCardFace, { card, ...props }));

  it('renders every card with its pips, the corner index and one title tab', () => {
    for (const card of PLAYING_CARDS_ALL) {
      const html = render(card);
      expect(html, card.slug).toContain('viewBox="0 0 200 300"');
      // at `full` the tab owns the foot of the face, so the index is not repeated there
      expect(count(html, 'data-index="1"'), card.slug).toBe(1);
      expect(count(html, 'data-tab="1"'), card.slug).toBe(1);
      if (isCourtCard(card) || isJoker(card)) {
        expect(count(html, 'data-pip="1"'), card.slug).toBe(0);
        expect(count(html, 'data-emblem="'), card.slug).toBe(1);
      } else {
        expect(count(html, 'data-pip="1"'), card.slug).toBe(card.rankValue);
        expect(count(html, 'data-emblem="'), card.slug).toBe(0);
      }
      const title = isJoker(card) ? 'JOKER' : card.name.toUpperCase();
      expect(html, card.slug).toContain(`>${title}<`);
    }
  });

  it('drops the title tab at detail="quiet" and keeps everything else', () => {
    for (const card of PLAYING_CARDS_ALL) {
      const html = render(card, { detail: 'quiet' });
      expect(count(html, 'data-tab="1"'), card.slug).toBe(0);
      expect(count(html, 'data-index="1"'), card.slug).toBe(2);
      if (!isCourtCard(card) && !isJoker(card)) expect(count(html, 'data-pip="1"'), card.slug).toBe(card.rankValue);
    }
  });

  it('is byte-identical across renders', () => {
    for (const card of PLAYING_CARDS_ALL) {
      expect(render(card)).toBe(render(card));
      expect(render(card, { detail: 'quiet', reversed: true })).toBe(render(card, { detail: 'quiet', reversed: true }));
    }
  });

  it('turns a reversed face through 180° and turns the title tab back', () => {
    const card = PLAYING_CARDS_ALL[8]; // Nine of Hearts
    const upright = render(card);
    const reversed = render(card, { reversed: true });
    // upright: no half-turn at `full`; reversed: one, for the whole face
    expect(count(upright, 'rotate(180 100 150)')).toBe(0);
    expect(count(reversed, 'rotate(180 100 150)')).toBe(1);
    // at `quiet` the bottom-right index adds a half-turn of its own
    expect(count(render(card, { detail: 'quiet' }), 'rotate(180 100 150)')).toBe(1);
    expect(count(render(card, { detail: 'quiet', reversed: true }), 'rotate(180 100 150)')).toBe(2);
    expect(reversed).toMatch(/<g transform="rotate\(180 100 150\)"><g fill="none" stroke="currentColor"/);
    expect(reversed).toContain('rotate(180 100 266)');
    expect(upright).not.toContain('rotate(180 100 266)');
  });

  it('paints the surface by name and can leave it to the parent', () => {
    const card = PLAYING_CARDS_ALL[0];
    expect(render(card)).toContain('fill="rgb(var(--surface-card))"');
    expect(render(card, { surface: 'paper' })).toContain('fill="rgb(var(--paper-2))"');
    const none = render(card, { surface: 'none' });
    expect(none).not.toContain('var(--surface-');
    expect(none).not.toContain('var(--paper');
  });

  it('on paper, draws in the ink tier and never in gold or rose', () => {
    for (const card of PLAYING_CARDS_ALL) {
      const html = render(card, { surface: 'paper' });
      expect(html, card.slug).toContain('class="text-ink-gold"');
      expect(html, card.slug).not.toMatch(/class="text-(?:gold|cosmic-rose|coral)"/);
      if (card.slug === 'red-joker') expect(html).toContain('text-ink-coral');
      else if (card.color === 'red') expect(html, card.slug).toContain('text-ink-rose');
      else expect(html, card.slug).not.toContain('text-ink-rose');
    }
  });

  it('uses only token inks: rose for red suits, gold for black, coral for the Red Joker', () => {
    for (const card of PLAYING_CARDS_ALL) {
      const html = render(card);
      expect(html, card.slug).not.toMatch(/\b(?:text|fill|stroke)-(?:red|rose|yellow|amber|gray|slate)-\d{2,3}\b/);
      expect(html, card.slug).not.toMatch(/#[0-9a-f]{3,6}\b/i);
      if (card.slug === 'red-joker') expect(html).toContain('text-coral');
      else if (card.color === 'red') expect(html, card.slug).toContain('text-cosmic-rose');
      else expect(html, card.slug).not.toContain('text-cosmic-rose');
    }
  });

  it('shares the frame geometry with the card back', () => {
    const html = render(PLAYING_CARDS_ALL[0]);
    expect(html).toContain('<rect x="8" y="8" width="184" height="284" rx="10" stroke-width="1.4"');
    expect(html).toContain('<rect x="18" y="18" width="164" height="264" rx="6" stroke-width="0.9" opacity="0.7"');
    expect(count(html, 'r="4"')).toBe(4);
  });
});
