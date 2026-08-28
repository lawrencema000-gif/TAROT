import { describe, it, expect } from 'vitest';
import {
  findsContactDetails, assignStarPosition, buildLinks, WISH_THEMES,
  type Wish, type WishEcho,
} from '../../dal/wishes';

/**
 * Tests for the Wishing Sky.
 *
 * Two things here have real consequences and are tested accordingly.
 *
 * The CONTACT FILTER is the whole privacy design: a wish is public, and a
 * public statement of need next to a working phone number is how charity and
 * romance scams source their marks. The database enforces this too — the filter
 * exists twice on purpose — but a gap here is what a user actually hits first.
 *
 * The LINK GRAPH decides what the sky draws. A wrong edge would connect two
 * strangers' stars for no reason, which is the one thing that would make the
 * feature feel arbitrary rather than meaningful.
 */

function wish(over: Partial<Wish> = {}): Wish {
  return {
    id: 'w1', userId: 'u1', text: 'I wish for a quiet week', theme: 'other',
    starX: 0.5, starY: 0.5, starSeed: 1, openToHelp: false, wisherLabel: null,
    grantedAt: null, echoCount: 0, createdAt: '2026-08-17T00:00:00Z', ...over,
  };
}

describe('contact details never reach a public wish', () => {
  it('catches phone numbers in the shapes people actually type', () => {
    const PHONES = [
      'call me on 07700 900123',
      'my number is +44 7700 900123',
      'reach me: (555) 019-2837',
      '555-019-2837',
      'whatsapp 15550192837',
      'ring 020 7946 0958 any time',
      '+1 415 555 0132',
      'tel 0412.345.678',
    ];
    for (const t of PHONES) {
      expect([t, findsContactDetails(t)]).toEqual([t, 'phone']);
    }
  });

  it('catches email addresses', () => {
    const EMAILS = [
      'email me at hope@example.com',
      'HOPE.WISHES+star@example.co.uk please',
      'contact: a_b-c@sub.domain.org',
    ];
    for (const t of EMAILS) {
      expect([t, findsContactDetails(t)]).toEqual([t, 'email']);
    }
  });

  it('reports email first when a wish contains both', () => {
    expect(findsContactDetails('me@example.com or 07700 900123')).toBe('email');
  });

  it('leaves ordinary wishes alone', () => {
    const FINE = [
      'I wish for my mum to get better',
      'I wish I could find a job in 2026',
      'I wish my 3 kids stay close as they grow',
      'I wish to pass my exams this June',
      'I wish for 10 good years with my dog',
      'I wish I had 5 more hours in the day',
      'I wish my flat in Apartment 12 felt like home',
    ];
    for (const t of FINE) {
      expect([t, findsContactDetails(t)]).toEqual([t, null]);
    }
  });

  it('errs toward catching rather than missing', () => {
    // A false positive costs someone a rephrase. A false negative publishes a
    // phone number to every user of the app, permanently. So a long digit run
    // is refused even when it is probably innocent.
    expect(findsContactDetails('I wish for 1234567 stars')).toBe('phone');
  });

  it('handles empty and odd input without throwing', () => {
    for (const t of ['', '   ', '…', '🌟🌟🌟']) {
      expect([t, findsContactDetails(t)]).toEqual([t, null]);
    }
  });
});

describe('star placement', () => {
  it('is deterministic for a seed', () => {
    for (const seed of [1, 42, 9999, 100000]) {
      expect(assignStarPosition(seed)).toEqual(assignStarPosition(seed));
    }
  });

  it('always lands inside the map, off the clipped edges', () => {
    for (let seed = 0; seed < 3000; seed++) {
      const { x, y } = assignStarPosition(seed);
      expect(x).toBeGreaterThanOrEqual(0.02);
      expect(x).toBeLessThanOrEqual(0.98);
      expect(y).toBeGreaterThanOrEqual(0.02);
      expect(y).toBeLessThanOrEqual(0.98);
      expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
    }
  });

  it('scatters rather than stacking — no seed collides with a neighbour', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 500; seed++) {
      const { x, y } = assignStarPosition(seed);
      seen.add(`${x.toFixed(3)},${y.toFixed(3)}`);
    }
    // Allow a handful of coincidences; a broken hash would collapse to a few.
    expect(seen.size).toBeGreaterThan(480);
  });

  it('spreads across the whole width rather than hugging the middle', () => {
    let left = 0, right = 0;
    for (let seed = 0; seed < 1000; seed++) {
      const { x } = assignStarPosition(seed);
      if (x < 0.33) left++;
      if (x > 0.67) right++;
    }
    expect(left).toBeGreaterThan(200);
    expect(right).toBeGreaterThan(200);
  });
});

describe('the link graph', () => {
  const a = wish({ id: 'a', userId: 'ua', createdAt: '2026-01-01T00:00:00Z' });
  const b = wish({ id: 'b', userId: 'ub', createdAt: '2026-01-02T00:00:00Z' });
  const c = wish({ id: 'c', userId: 'uc', createdAt: '2026-01-03T00:00:00Z' });

  it('draws a line from the echoer’s star to the wish they echoed', () => {
    const links = buildLinks([a, b], [{ wishId: 'a', userId: 'ub' }]);
    expect(links).toHaveLength(1);
    expect([links[0].from.id, links[0].to.id]).toEqual(['b', 'a']);
  });

  it('draws nothing when the echoer has no star of their own', () => {
    // Echoing still counts — it just has no star to draw from, which is a quiet
    // reason to make one.
    const links = buildLinks([a], [{ wishId: 'a', userId: 'nobody' }]);
    expect(links).toEqual([]);
  });

  it('uses the echoer’s most recent star when they have several', () => {
    const older = wish({ id: 'old', userId: 'ub', createdAt: '2026-01-01T00:00:00Z' });
    const newer = wish({ id: 'new', userId: 'ub', createdAt: '2026-06-01T00:00:00Z' });
    const links = buildLinks([a, older, newer], [{ wishId: 'a', userId: 'ub' }]);
    expect(links).toHaveLength(1);
    expect(links[0].from.id).toBe('new');
  });

  it('never links a star to itself', () => {
    const links = buildLinks([a], [{ wishId: 'a', userId: 'ua' }]);
    expect(links).toEqual([]);
  });

  it('draws one line per pair, not two', () => {
    // Two people echoing each other is one thread between them, not a double.
    const echoes: WishEcho[] = [
      { wishId: 'a', userId: 'ub' },
      { wishId: 'b', userId: 'ua' },
    ];
    expect(buildLinks([a, b], echoes)).toHaveLength(1);
  });

  it('ignores an echo pointing at a wish that is not in the sky', () => {
    // A hidden or deleted wish must not produce a line to nowhere.
    const links = buildLinks([a, b], [{ wishId: 'deleted', userId: 'ub' }]);
    expect(links).toEqual([]);
  });

  it('handles a busy sky without duplicating edges', () => {
    const echoes: WishEcho[] = [
      { wishId: 'a', userId: 'ub' }, { wishId: 'a', userId: 'uc' },
      { wishId: 'b', userId: 'ua' }, { wishId: 'c', userId: 'ua' },
      { wishId: 'c', userId: 'ub' },
    ];
    const links = buildLinks([a, b, c], echoes);
    const keys = links.map((l) => [l.from.id, l.to.id].sort().join(':'));
    expect(new Set(keys).size).toBe(keys.length);
    expect(links.length).toBeGreaterThan(0);
  });

  it('copes with an empty sky', () => {
    expect(buildLinks([], [])).toEqual([]);
    expect(buildLinks([], [{ wishId: 'a', userId: 'ub' }])).toEqual([]);
  });
});

describe('themes', () => {
  it('gives every theme a label and a distinct hue', () => {
    expect(WISH_THEMES.length).toBeGreaterThanOrEqual(8);
    for (const t of WISH_THEMES) {
      expect(t.label.length).toBeGreaterThan(2);
      expect(t.hue).toBeGreaterThanOrEqual(0);
      expect(t.hue).toBeLessThan(360);
    }
    expect(new Set(WISH_THEMES.map((t) => t.hue)).size).toBe(WISH_THEMES.length);
    expect(new Set(WISH_THEMES.map((t) => t.key)).size).toBe(WISH_THEMES.length);
  });
});
