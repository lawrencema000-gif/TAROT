import { describe, it, expect } from 'vitest';
import {
  decodeReading,
  encodeReading,
  sharedDeck,
  TAROT_SHARE_VERSION,
  PLAYING_SHARE_VERSION,
  type SharedReadingPayload,
} from '../../services/shareableReadings';

/**
 * The share-link contract in both directions.
 *
 * An installed Android build owns tarotlife.app/reading through App Links,
 * so a link made by this web build is opened by whatever app version the
 * recipient has. Below is the decoder every pre-Phase-7 build ships, frozen
 * verbatim (cbccc546). A tarot link must decode on it; a playing-card link
 * must be refused by it (the old app cannot draw ids 100..153), and every
 * link an old build ever made must still decode here.
 */

function legacyFromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  return decodeURIComponent(escape(window.atob(b64)));
}

function legacyDecodeReading(token: string): SharedReadingPayload | null {
  try {
    const json = legacyFromBase64Url(token);
    const parsed = JSON.parse(json) as SharedReadingPayload;
    if (parsed.v !== 1) return null;
    if (typeof parsed.s !== 'string') return null;
    if (!Array.isArray(parsed.c)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Tokens the pre-Phase-7 encoder produced for these inputs, frozen. */
const LEGACY_TAROT_TOKEN =
  'eyJ2IjoxLCJzIjoidGhyZWUtY2FyZC1wYXN0LXByZXNlbnQtZnV0dXJlIiwiYyI6W1swLDFdLFsyMSwwXSxbMTMsMF1dLCJxIjoiV2lsbCBpdCB3b3JrIG91dD8iLCJkIjoiMjAyNi0wOS0wMSJ9';
const LEGACY_TAROT_INPUT = {
  spreadSlug: 'three-card-past-present-future',
  cards: [
    { id: 0, reversed: true },
    { id: 21, reversed: false },
    { id: 13, reversed: false },
  ],
  question: 'Will it work out?',
  date: '2026-09-01',
};
const LEGACY_JA_TOKEN = 'eyJ2IjoxLCJzIjoic2luZ2xlLWNhcmQiLCJjIjpbWzc3LDBdXSwicSI6IuS7leS6i-OBr-OBhuOBvuOBj-OBhOOBj--8nyJ9';
const LEGACY_JA_INPUT = { spreadSlug: 'single-card', cards: [{ id: 77, reversed: false }], question: '仕事はうまくいく？' };

describe('share links: new web build -> installed (older) app', () => {
  it('a tarot reading is emitted exactly as the old encoder emitted it', () => {
    expect(TAROT_SHARE_VERSION).toBe(1);
    expect(encodeReading(LEGACY_TAROT_INPUT)).toBe(LEGACY_TAROT_TOKEN);
    expect(encodeReading(LEGACY_JA_INPUT)).toBe(LEGACY_JA_TOKEN);
    // An explicit kind: 'tarot' changes nothing either.
    expect(encodeReading({ ...LEGACY_TAROT_INPUT, kind: 'tarot' })).toBe(LEGACY_TAROT_TOKEN);
  });

  it('every tarot token shape decodes on the old decoder', () => {
    const shapes = [
      { spreadSlug: 'single-card', cards: [{ id: 5, reversed: false }] },
      { spreadSlug: 'celtic-cross', cards: Array.from({ length: 10 }, (_, i) => ({ id: i * 7, reversed: i % 2 === 0 })) },
      { spreadSlug: 'pick-a-card', cards: [{ id: 40, reversed: true }], question: 'x'.repeat(400) },
      { spreadSlug: 'three-card', cards: [{ id: 1, reversed: false }], date: '2026-10-03T08:00:00.000Z' },
      { spreadSlug: 'three-card', cards: [{ id: 2, reversed: false }], question: '이 관계는 어떻게 될까요?' },
    ];
    for (const input of shapes) {
      const old = legacyDecodeReading(encodeReading(input));
      expect(old, input.spreadSlug).not.toBeNull();
      expect(old!.v).toBe(1);
      expect(old!.k).toBeUndefined();
      expect(old!.c).toEqual(input.cards.map((c) => [c.id, c.reversed ? 1 : 0]));
    }
  });

  it('a playing-card reading is v2, which an old app refuses instead of laying tarot cards for it', () => {
    expect(PLAYING_SHARE_VERSION).toBe(2);
    const token = encodeReading({ spreadSlug: 'carto-wish', cards: [{ id: 108, reversed: false }], kind: 'playing' });
    expect(legacyDecodeReading(token)).toBeNull();
    expect(decodeReading(token)).toMatchObject({ v: 2, k: 'p', s: 'carto-wish', c: [[108, 0]] });
  });
});

describe('share links: links an older build made -> this build', () => {
  it('decodes the frozen v1 tarot tokens unchanged', () => {
    const decoded = decodeReading(LEGACY_TAROT_TOKEN);
    expect(decoded).toEqual({
      v: 1,
      s: 'three-card-past-present-future',
      c: [[0, 1], [21, 0], [13, 0]],
      q: 'Will it work out?',
      d: '2026-09-01',
    });
    expect(sharedDeck(decoded!)).toBe('tarot');
    expect(decodeReading(LEGACY_JA_TOKEN)?.q).toBe('仕事はうまくいく？');
  });

  it('round-trips both kinds and reads the deck from k or from a carto- slug', () => {
    const tarot = decodeReading(encodeReading(LEGACY_TAROT_INPUT))!;
    expect(sharedDeck(tarot)).toBe('tarot');
    const playing = decodeReading(encodeReading({ spreadSlug: 'carto-three', cards: [{ id: 100, reversed: true }], kind: 'playing' }))!;
    expect(sharedDeck(playing)).toBe('playing');
    const preK = window.btoa(JSON.stringify({ v: 1, s: 'carto-single', c: [[100, 0]] })).replace(/=+$/, '');
    expect(sharedDeck(decodeReading(preK)!)).toBe('playing');
  });

  it('refuses unknown versions and unknown decks', () => {
    expect(decodeReading(window.btoa(JSON.stringify({ v: 3, s: 'x', c: [] })))).toBeNull();
    expect(decodeReading(window.btoa(JSON.stringify({ v: 2, s: 'x', c: [], k: 'z' })))).toBeNull();
    expect(decodeReading('not-a-token')).toBeNull();
  });
});
