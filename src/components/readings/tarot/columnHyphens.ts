/**
 * Break points for the English position names the select view sets in its
 * 74 px columns (TarotSelectView).
 *
 * Four words of the position names are wider than a column at the caption
 * size (12 px Inter, every name of every spread measured in Chromium):
 * "Subconscious" 80 px, "professionally" 79.2, "Consequence" 78.8,
 * "surroundings" 74.9. A word cannot wrap, so it spilled out of both sides
 * of its column, off centre between its neighbours (pre-release pass).
 *
 * `hyphens: auto` is not the fix. Chromium never hyphenates a capitalised
 * word (the proper-noun rule), and "Subconscious" and "Consequence" open
 * their names; and where it does hyphenate it fills lines greedily, so it
 * also split words that fit a line of their own ("Best possi-/ble
 * outcome"). These four carry their break points as soft hyphens
 * (U+00AD) instead: honoured by every browser, and drawn as a hyphen only
 * where the line breaks. Only words wider than a column belong here — a
 * soft hyphen is taken greedily too, so "unconscious" (72.0 px) on the list
 * would read "What the un-/conscious knows".
 *
 * Display only: the name a reading saves, a screen reader announces and
 * the interpretation is asked about stays the plain string.
 */

const SOFT_HYPHEN = '­';

/** Dictionary break points (Merriam-Webster), lower case. */
const BREAKS: Record<string, string> = {
  subconscious: 'sub-con-scious',
  professionally: 'pro-fes-sion-al-ly',
  consequence: 'con-se-quence',
  surroundings: 'sur-round-ings',
};

/** `label` with soft hyphens inside its words too wide for a column; every other character as it was. */
export function withColumnHyphens(label: string): string {
  return label.replace(/\p{L}+/gu, (word) => {
    const pattern = BREAKS[word.toLowerCase()];
    if (!pattern) return word;
    let i = 0;
    return [...pattern].map((ch) => (ch === '-' ? SOFT_HYPHEN : word[i++])).join('');
  });
}
