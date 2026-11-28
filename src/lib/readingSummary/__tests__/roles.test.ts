import { describe, it, expect } from 'vitest';
import { allSpreads, getSpreadBySlug } from '../../../data/tarotSpreads';
import { getSpreadCardCount } from '../../../services/readingInterpretation';
import { DIGNITY_PAIRS, TAROT_ROLES, dignityIndexPairs, rolesFor } from '../roles';

const LEGACY = ['single', 'three-card', 'celtic-cross', 'relationship', 'career', 'shadow'];

describe('TAROT_ROLES', () => {
  it('holds the six legacy ids and every catalogue slug on main', () => {
    for (const id of LEGACY) expect(TAROT_ROLES[id], id).toBeDefined();
    // A spread added to the catalogue later fails here; read its roles from its positions' meanings.
    for (const s of allSpreads) expect(TAROT_ROLES[s.slug], s.slug).toBeDefined();
  });

  it('gives every spread as many roles as it has cards', () => {
    for (const id of LEGACY) expect(TAROT_ROLES[id].length, id).toBe(getSpreadCardCount(id));
    for (const [id, roles] of Object.entries(TAROT_ROLES)) {
      const spread = getSpreadBySlug(id);
      if (spread) expect(roles.length, id).toBe(spread.cardCount);
    }
    expect(TAROT_ROLES.quick).toEqual(['heart']);
  });

  it('reads a custom or unknown spread as steps', () => {
    expect(rolesFor('custom:1234', 4)).toEqual(['step', 'step', 'step', 'step']);
    expect(rolesFor('not-a-spread', 2)).toEqual(['step', 'step']);
    expect(rolesFor('celtic-cross', 10)).toBe(TAROT_ROLES['celtic-cross']);
  });
});

describe('DIGNITY_PAIRS', () => {
  it('names only roles its spread has', () => {
    for (const [id, pairs] of Object.entries(DIGNITY_PAIRS)) {
      const roles = TAROT_ROLES[id];
      expect(roles, id).toBeDefined();
      for (const [a, b] of pairs) {
        expect(roles, `${id} ${a}`).toContain(a);
        expect(roles, `${id} ${b}`).toContain(b);
        if (a === b) expect(roles.filter((r) => r === a).length, `${id} two ${a}`).toBeGreaterThanOrEqual(2);
      }
      expect(dignityIndexPairs(id, roles).length, id).toBe(pairs.length);
    }
  });

  it('pairs the Celtic Cross by its positions, two options with each other, and other spreads by neighbours', () => {
    expect(dignityIndexPairs('celtic-cross', TAROT_ROLES['celtic-cross'])).toEqual([[0, 1], [0, 4], [5, 9], [6, 9], [8, 9]]);
    expect(dignityIndexPairs('job-decision', TAROT_ROLES['job-decision'])).toEqual([[0, 1]]);
    expect(dignityIndexPairs('three-card', TAROT_ROLES['three-card'])).toEqual([[0, 1], [1, 2]]);
    expect(dignityIndexPairs('custom:x', rolesFor('custom:x', 4))).toEqual([[0, 1], [1, 2], [2, 3]]);
  });
});
