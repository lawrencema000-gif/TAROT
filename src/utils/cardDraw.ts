function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  // Mulberry32 PRNG
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Draw `count` cards from `deck` for `seed`, deterministically.
 *
 * Generic over the card type: the shuffle only moves references and reads
 * nothing but `id`-bearing objects, so the tarot deck and the playing deck
 * (`src/data/cartomancy`) share one draw. Same output for the same input,
 * whatever `T` is — see cardDraw.golden.test.ts.
 */
export function drawSeededCards<T extends { id: number }>(
  count: number,
  seed: string,
  deck: T[],
): { card: T; reversed: boolean }[] {
  const rng = seededRandom(seed);
  // Seeded Fisher-Yates shuffle: uniform over all permutations and fully
  // deterministic per seed, independent of the JS engine's sort algorithm
  // (the old comparator-based shuffle was biased AND engine-dependent).
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count).map(card => ({
    card,
    reversed: rng() > 0.5,
  }));
}
