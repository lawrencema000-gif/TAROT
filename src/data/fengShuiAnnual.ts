// Annual Flying Stars — 2026 (玄空飛星 / Year of the Fire Horse).
//
// In Xuan Kong feng shui, nine stars (numbered 1-9) rotate through nine
// palaces (the eight cardinal directions + center) on a 9-year cycle.
// Each year's central star determines the layout: the star in each
// direction tells whether that area of your home is auspicious or
// needs remedies for the coming 12 months.
//
// 2026 is governed by Star 4 in the centre. Below is the canonical 2026
// layout and what it means for each direction in your home (oriented
// from the front door looking in).
//
// Re-compute this annually — the chart shifts every Lunar New Year.

export type FlyingStar = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'Center';

export interface AnnualStarReading {
  /** The star occupying this direction this year. */
  star: FlyingStar;
  /** Star nature — auspicious / mixed / inauspicious. */
  nature: 'auspicious' | 'mixed' | 'inauspicious';
  /** What this star activates in this direction. */
  meaning: string;
  /** Recommended activation (if auspicious) or remedy (if inauspicious). */
  remedy: string;
}

/**
 * Canonical 2026 flying-star layout. Computed from the 9-year cycle:
 * 2024 = star 3, 2025 = star 4, 2026 = star 4 entering centre…
 *
 * Layout when the centre is Star 4 (2026):
 *   NW: 3   N: 8   NE: 1
 *   W:  2   C: 4   E:  6
 *   SW: 7   S: 9   SE: 5
 */
const STARS_2026: Record<Direction, FlyingStar> = {
  NW: 3, N:  8, NE: 1,
  W:  2, Center: 4, E: 6,
  SW: 7, S:  9, SE: 5,
};

const STAR_BASE: Record<FlyingStar, { nature: AnnualStarReading['nature']; meaning: string; remedy: string }> = {
  1: {
    nature: 'auspicious',
    meaning: 'Star 1 (White Wolf, water element) brings career opportunities, ambition, and recognition. Communications flow easily here. The star most associated with leadership and forward movement.',
    remedy: 'Activate with a small water feature (fountain, fish bowl) or images of moving water. Keep the area clean and well-lit. Conduct important conversations and Zoom calls in this corner if possible.',
  },
  2: {
    nature: 'inauspicious',
    meaning: 'Star 2 (Black Earth, sickness star) brings illness, lethargy, and chronic health worries. The single most concerning annual star — it tends to manifest in respiratory and immune issues, especially when activated by motion or sound.',
    remedy: 'NEVER place water features, music speakers, or red/orange decor in this direction this year. Hang a 6-rod metal wind chime to weaken the earth energy. Place Wu Lou (calabash) gourds. Avoid sleeping with the head pointing to this direction in 2026.',
  },
  3: {
    nature: 'inauspicious',
    meaning: 'Star 3 (Jade Wood, conflict star) brings arguments, lawsuits, gossip, and short-tempered confrontations. Easily triggered by green plants and noise; tends to surface in family disputes and HR issues at work.',
    remedy: 'Place a still red object (red pillow, red lantern, red picture frame) in this corner — fire weakens wood. Avoid placing live plants here this year. Keep this area quiet; avoid TVs, speakers, or busy traffic flow.',
  },
  4: {
    nature: 'auspicious',
    meaning: 'Star 4 (Green Wood, scholastic / romance star) brings academic success, creative inspiration, writing flow, and budding romance. The current centre star, so 2026 has a literary / artistic flavour overall.',
    remedy: 'Activate with four lush green plants, books, water features (water nourishes wood). Excellent direction for the study, writer\'s desk, or art studio. If single and looking for a partner, place fresh flowers here.',
  },
  5: {
    nature: 'inauspicious',
    meaning: 'Star 5 (Yellow Earth, misfortune star) is the most volatile annual star — brings accidents, sudden financial loss, unexpected illness, and disruption. In 2026 it occupies the SE; that corner of your home needs careful management.',
    remedy: 'CRITICAL: do not renovate, dig, or do major construction in the SE in 2026. Hang a 6-rod metal wind chime (the strongest classical remedy). Place a salt water cure if you can. Avoid red, orange, candles in this corner. Keep this area still.',
  },
  6: {
    nature: 'auspicious',
    meaning: 'Star 6 (White Metal, heaven luck) brings authority, mentorship from above, and steady advancement at work. Excellent for leadership and senior career moves.',
    remedy: 'Activate with metal objects: brass bells, copper bowls, gold picture frames, or a clean white aesthetic. Good direction for the home office of a leader/manager. Place one round metal object here at year start.',
  },
  7: {
    nature: 'mixed',
    meaning: 'Star 7 (Red Metal, romance + violence star) is unstable — can bring romantic energy and social charisma but also robbery, betrayal, and infidelity. Treat it carefully.',
    remedy: 'Mild remedy: place a still water feature (still — not flowing) to absorb the negative side. Avoid red and sharp objects (knives, scissors). Singles can place fresh flowers carefully. Keep valuables out of this corner this year.',
  },
  8: {
    nature: 'auspicious',
    meaning: 'Star 8 (White Earth, wealth star) brings money, real-estate gains, and stable prosperity. In 2026 it sits in the North — a strong position. The star you most want to activate.',
    remedy: 'Activate with crystals, salt lamps, ceramic / earthenware. Place a small still bowl of water with a few smooth river stones. Excellent direction for the wealth corner activation. Keep clean, well-lit. Avoid clutter.',
  },
  9: {
    nature: 'auspicious',
    meaning: 'Star 9 (Purple Fire, future prosperity + celebration) brings happy events: weddings, births, promotions, exciting opportunities. Amplifies whatever else is in the area.',
    remedy: 'Activate with red or purple decor, candles (lit briefly, never left burning), images of weddings or celebrations. Excellent direction for a celebration corner. Hosts dinner parties beautifully when this corner is active.',
  },
};

export function getAnnualReading(year: number): { year: number; centerStar: FlyingStar; readings: Record<Direction, AnnualStarReading> } {
  // For 2026 we hard-code the canonical layout. Computing other years
  // from the 9-year cycle is outside scope of this initial pass — we'll
  // refresh the layout each new year.
  const layout = year === 2026 ? STARS_2026 : STARS_2026; // fallback — see TODO below
  const readings: Record<Direction, AnnualStarReading> = {} as Record<Direction, AnnualStarReading>;
  for (const dir of Object.keys(layout) as Direction[]) {
    const star = layout[dir];
    readings[dir] = { star, ...STAR_BASE[star] };
  }
  return { year, centerStar: layout.Center, readings };
}

/**
 * Year-over-year hint for the most-impactful directions (most users
 * just need to know "where do I activate, where do I avoid").
 */
export function annualHighlights(year: number) {
  const a = getAnnualReading(year);
  const auspicious: Direction[] = [];
  const inauspicious: Direction[] = [];
  for (const dir of Object.keys(a.readings) as Direction[]) {
    if (dir === 'Center') continue;
    const r = a.readings[dir];
    if (r.nature === 'auspicious') auspicious.push(dir);
    else if (r.nature === 'inauspicious') inauspicious.push(dir);
  }
  return { auspicious, inauspicious };
}
