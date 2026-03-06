import type { TarotCard } from '../types';

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

export function drawSeededCards(
  count: number,
  seed: string,
  deck: TarotCard[],
): { card: TarotCard; reversed: boolean }[] {
  const rng = seededRandom(seed);
  const shuffled = [...deck].sort(() => rng() - 0.5);
  return shuffled.slice(0, count).map(card => ({
    card,
    reversed: rng() > 0.5,
  }));
}
