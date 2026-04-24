// Feng Shui Bagua — self-reflection quiz mapped onto the 9 life-area map.
//
// Traditional Bagua places 9 life-areas on a 3x3 grid aligned to the
// front door of a room or home. We offer a pragmatic reading: the user
// rates how each area of their life feels, and we highlight the
// under-supported areas + offer concrete Feng Shui-informed adjustments
// for each.

export type BaguaArea =
  | 'wealth'
  | 'fame'
  | 'relationships'
  | 'family'
  | 'health'
  | 'creativity'
  | 'knowledge'
  | 'career'
  | 'helpers';

export interface BaguaAreaInfo {
  name: string;
  element: string;
  color: string;
  direction: string;
  /** One-sentence definition of the life area */
  meaning: string;
  /** Feng Shui adjustments to nourish this area */
  adjustments: string[];
}

export const BAGUA_AREAS: Record<BaguaArea, BaguaAreaInfo> = {
  wealth: {
    name: 'Wealth / Abundance',
    element: 'Wood',
    color: 'Purple / Gold',
    direction: 'Back-left from the front door',
    meaning: 'Your relationship with material flow — money, abundance, possessions that sustain you.',
    adjustments: [
      'Place a healthy green plant (especially jade or money tree) in this corner',
      'Add purple or gold fabric — a pillow, scarf, or artwork',
      'Move a small running water element (fountain, picture of water flow) here',
      'Clear clutter — abundance cannot flow through blocked corners',
    ],
  },
  fame: {
    name: 'Fame / Reputation',
    element: 'Fire',
    color: 'Red',
    direction: 'Back-center',
    meaning: 'How you are seen, what you are known for, your public presence and recognition.',
    adjustments: [
      'Red and orange accents — candles, textiles, artwork',
      'Hang images of you in moments of accomplishment',
      'Place a mirror to reflect light and amplify presence',
      'Avoid clutter or broken items — they dampen your visibility',
    ],
  },
  relationships: {
    name: 'Relationships / Love',
    element: 'Earth',
    color: 'Pink / Red / White',
    direction: 'Back-right',
    meaning: 'Partnership, intimate relationships, the quality of bonded connection in your life.',
    adjustments: [
      'Items in pairs — two candles, two pillows, paired artwork',
      'Pink, red, and white accents',
      'Remove photos of ex-partners if present',
      'Avoid solo imagery or art that depicts isolation',
    ],
  },
  family: {
    name: 'Family / Ancestry',
    element: 'Wood',
    color: 'Green',
    direction: 'Middle-left',
    meaning: 'Your biological family, ancestors, your roots — the lineage you carry forward.',
    adjustments: [
      'Wooden furniture or decor, plants',
      'Family photos — especially elders and ancestors',
      'Green accents',
      'Anything that honours your roots',
    ],
  },
  health: {
    name: 'Health / Centre',
    element: 'Earth',
    color: 'Yellow / Earth tones',
    direction: 'Centre of the room',
    meaning: 'The literal and metaphorical centre of your life — wellbeing, vitality, grounding.',
    adjustments: [
      'Keep this area especially clear and spacious',
      'Earth tones — yellow, beige, terracotta',
      'Ceramic or clay objects',
      'Eliminate clutter here before anywhere else',
    ],
  },
  creativity: {
    name: 'Creativity / Children',
    element: 'Metal',
    color: 'White / Metallic',
    direction: 'Middle-right',
    meaning: 'Creative output, projects you birth, any literal or figurative children.',
    adjustments: [
      'White, gray, or metallic accents',
      'Round or circular objects',
      'Display creative works in progress or finished',
      'Metal wind chimes or bells',
    ],
  },
  knowledge: {
    name: 'Knowledge / Wisdom',
    element: 'Earth',
    color: 'Blue / Black / Green',
    direction: 'Front-left',
    meaning: 'Study, wisdom, self-cultivation, the pursuit of understanding.',
    adjustments: [
      'Books — especially a small library or reading nook',
      'Blue, black, or deep green accents',
      'A meditation cushion or quiet corner here',
      'Remove TVs and distractions from this zone',
    ],
  },
  career: {
    name: 'Career / Path',
    element: 'Water',
    color: 'Black / Dark Blue',
    direction: 'Front-center',
    meaning: 'Your work, your life purpose, the path you are walking.',
    adjustments: [
      'Dark blue or black accents',
      'Water elements — a fountain, a picture of the ocean',
      'Clear walkway from front door — do not block your path',
      'Mirrors to reflect opportunity back to you',
    ],
  },
  helpers: {
    name: 'Helpful People / Travel',
    element: 'Metal',
    color: 'Gray / White / Silver',
    direction: 'Front-right',
    meaning: 'Mentors, allies, the universe sending help to you. Also travel and expanded horizons.',
    adjustments: [
      'Gray, silver, or white accents',
      'Metal objects',
      'Images of mentors or places you want to travel',
      'A bell by the entrance to signal you\'re open to arrivals',
    ],
  },
};

export interface BaguaReading {
  /** Score 1-5 per area as rated by the user */
  scores: Record<BaguaArea, number>;
  /** The area scored lowest — the one most needing attention */
  focusArea: BaguaArea;
  /** Top strength area — highest-scoring */
  strongestArea: BaguaArea;
  /** Average score across all areas */
  overall: number;
}

export function computeBaguaReading(scores: Record<BaguaArea, number>): BaguaReading {
  const entries = Object.entries(scores) as [BaguaArea, number][];
  const sorted = entries.slice().sort((a, b) => a[1] - b[1]);
  const overall = entries.reduce((sum, [, v]) => sum + v, 0) / entries.length;
  return {
    scores,
    focusArea: sorted[0][0],
    strongestArea: sorted[sorted.length - 1][0],
    overall,
  };
}

export const BAGUA_AREA_ORDER: BaguaArea[] = [
  'wealth', 'fame', 'relationships',
  'family', 'health', 'creativity',
  'knowledge', 'career', 'helpers',
];
