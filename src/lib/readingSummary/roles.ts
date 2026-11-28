/**
 * A role for every position of every tarot spread, keyed by the id the flow
 * casts (WP-NF-02 step A3).
 *
 * The roles were read from each position's own meaning text (catalogue
 * spreads) and from the reading screen's names (legacy spreads). They never
 * depend on a name's wording, so renaming a position (D23 B) changes
 * nothing here. A custom spread (`custom:*`) and any spread missing from the
 * table read as all 'step'. roles.test.ts holds each entry's length to the
 * spread's card count, and fails for a spread added to the catalogue later.
 */
import type { PositionRole } from './types';

const R = (...roles: PositionRole[]): PositionRole[] => roles;
const steps = (n: number): PositionRole[] => Array.from({ length: n }, () => 'step' as const);

const SINGLE = R('heart');
const THREE = R('past', 'present', 'future');
const RELATIONSHIP = R('self', 'other', 'bond', 'crossing', 'advice');

export const TAROT_ROLES: Record<string, PositionRole[]> = {
  // The six legacy spreads (TarotSection's ids)
  single: SINGLE,
  'three-card': THREE,
  'celtic-cross': R('heart', 'crossing', 'root', 'past', 'crown', 'future', 'self', 'world', 'hopes-fears', 'outcome'),
  relationship: RELATIONSHIP,
  career: R('present', 'self', 'crossing', 'step', 'advice', 'outcome'),
  shadow: R('self', 'root', 'root', 'crossing', 'step', 'advice', 'advice'),
  // The quick reading's one card
  quick: SINGLE,

  // Catalogue slugs that are the same spread as a legacy id (spreadLabels.ts CATALOGUE_ALIAS)
  'one-card-daily': SINGLE,
  'three-card-past-present-future': THREE,
  'relationship-cross': RELATIONSHIP,

  // The catalogue (tarotSpreads.ts)
  horseshoe: R('past', 'present', 'future', 'self', 'world', 'advice', 'outcome'),
  soulmate: R('present', 'root', 'advice', 'other', 'future', 'crossing', 'outcome'),
  'love-yes-no': R('heart', 'outcome', 'advice'),
  'career-path': R('present', 'self', 'crossing', 'advice', 'outcome'),
  'job-decision': R('option', 'option', 'root', 'advice', 'outcome'),
  'money-flow': R('step', 'step', 'root', 'advice', 'outcome', 'present'),
  'mind-body-spirit': R('step', 'step', 'step'),
  'weekly-forecast': steps(7),
  'shadow-work': R('heart', 'self', 'past', 'root', 'advice'),
  'higher-self': R('present', 'step', 'crossing', 'advice'),
  'new-moon-intentions': R('heart', 'advice', 'step', 'step', 'crossing', 'outcome'),
  'full-moon-release': R('past', 'heart', 'hopes-fears', 'step', 'advice', 'outcome'),
  crossroads: R('present', 'option', 'option', 'root', 'advice'),
  'yes-no-pulse': R('heart', 'step', 'step', 'outcome', 'step'),

  // The Major Arcana spreads (majorArcanaSpreads.ts)
  'the-fool-spread': R('heart', 'advice', 'outcome'),
  'the-magician-spread': R('heart', 'step', 'self', 'outcome'),
  'the-high-priestess-spread': R('crown', 'root', 'crossing', 'root', 'advice'),
  'the-empress-spread': R('heart', 'advice', 'step', 'outcome', 'step'),
  'the-emperor-spread': R('heart', 'step', 'step', 'self', 'outcome'),
  'the-hierophant-spread': R('other', 'heart', 'advice', 'crossing', 'outcome'),
  'the-lovers-spread': R('self', 'other', 'bond', 'crossing', 'advice'),
  'the-chariot-spread': R('heart', 'crossing', 'self', 'past', 'advice'),
  'strength-spread': R('hopes-fears', 'advice', 'self', 'step', 'outcome'),
  'the-hermit-spread': R('step', 'heart', 'advice', 'step', 'outcome'),
  'the-wheel-of-fortune-spread': R('past', 'present', 'future', 'step', 'advice'),
  'justice-spread': R('heart', 'past', 'crossing', 'root', 'outcome'),
  'the-hanged-man-spread': R('advice', 'heart', 'crossing', 'step', 'step'),
  'death-spread': R('heart', 'root', 'step', 'outcome', 'advice'),
  'temperance-spread': R('heart', 'crossing', 'advice', 'step', 'outcome'),
  'the-devil-spread': R('heart', 'crossing', 'root', 'advice', 'outcome'),
  'the-tower-spread': R('heart', 'root', 'crossing', 'step', 'advice'),
  'the-star-spread': R('past', 'advice', 'step', 'step', 'outcome'),
  'the-moon-spread': R('heart', 'hopes-fears', 'crossing', 'step', 'advice', 'outcome'),
  'the-sun-spread': R('heart', 'self', 'step', 'step', 'outcome'),
  'judgement-spread': R('heart', 'step', 'advice', 'self', 'outcome'),
  'the-world-spread': R('past', 'self', 'step', 'future', 'outcome'),
};

/**
 * Pairs of roles read for elemental dignities. A spread missing here reads
 * its neighbours in order (1–2, 2–3, …).
 */
export const DIGNITY_PAIRS: Record<string, Array<[PositionRole, PositionRole]>> = {
  'celtic-cross': [
    ['heart', 'crossing'],
    ['heart', 'crown'],
    ['future', 'outcome'],
    ['self', 'outcome'],
    ['hopes-fears', 'outcome'],
  ],
  relationship: [
    ['self', 'other'],
    ['bond', 'crossing'],
  ],
  'relationship-cross': [
    ['self', 'other'],
    ['bond', 'crossing'],
  ],
  'the-lovers-spread': [
    ['self', 'other'],
    ['bond', 'crossing'],
  ],
  'job-decision': [['option', 'option']],
  crossroads: [['option', 'option']],
};

/** One role per card: the table's roles when the spread is known and the count matches, else all 'step'. */
export function rolesFor(spreadId: string, count: number): PositionRole[] {
  const known = TAROT_ROLES[spreadId];
  if (known && known.length === count) return known;
  // A one-card cast of an unknown or custom spread is still one card read alone.
  return steps(count);
}

/**
 * The index pairs whose elements are compared: the spread's role pairs
 * (the n-th and the next card of a repeated role for [option, option]), or
 * the neighbours in order.
 */
export function dignityIndexPairs(spreadId: string, roles: PositionRole[]): Array<[number, number]> {
  const pairs = TAROT_ROLES[spreadId] === roles ? DIGNITY_PAIRS[spreadId] : undefined;
  if (!pairs) return roles.slice(1).map((_, i) => [i, i + 1] as [number, number]);
  const out: Array<[number, number]> = [];
  for (const [a, b] of pairs) {
    const i = roles.indexOf(a);
    const j = a === b ? roles.indexOf(b, i + 1) : roles.indexOf(b);
    if (i >= 0 && j >= 0) out.push([i, j]);
  }
  return out;
}
