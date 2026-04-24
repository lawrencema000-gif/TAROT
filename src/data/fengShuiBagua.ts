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
  /** Reading surfaced when this area is the user's lowest-scoring (≤2). */
  lowReading: string;
  /** Reading surfaced when this area is the user's highest-scoring (≥4). */
  highReading: string;
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
    lowReading: 'When the wealth corner feels depleted, the underlying question is rarely "how do I get more?" It is usually "where am I refusing to let value circulate?" A dying plant, an overflowing pile of unopened mail, or old receipts stuffed in a drawer in this corner all say the same thing: stagnant flow. Start by clearing the physical space — even 20 minutes — then add one living green thing. Notice whether you begin to handle money differently this week; the physical shift often arrives first in your actions before it shows up in your bank account.',
    highReading: 'A well-nourished wealth corner rarely means you are rich — it means your relationship to abundance is healthy. You value what you have, you let it circulate through generosity and bills and good food, and you do not grip. Protect this by not letting it calcify into complacency: the corner stays alive when you periodically refresh it. Move one object. Buy fresh flowers. Give away something you no longer need. Abundance that stops moving stops being abundance.',
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
    lowReading: 'A weak fame area usually means you have been making yourself small. Not always through fear — sometimes through busyness, sometimes through an old story that staying invisible is safer. Check what hangs in this section of your room. If it is someone else\'s art, someone else\'s photos, or nothing at all, the visual message matches the internal one. Place one image that shows you doing the work you want to be known for. Then ask someone you trust to name one strength they see in you — and actually let it in.',
    highReading: 'Strong fame corners belong to people who have made peace with being seen. You are not performing; you are simply present, and others are noticing. The risk here is confusing attention with nourishment — gold tarnishes if it never rests. Give yourself moments of deliberate privacy this week. Refill in darkness so the light you offer publicly stays authentic. The mark of healthy reputation is a life that runs on its own fuel, not on applause.',
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
    lowReading: 'A quiet relationships corner often mirrors a quiet inner life of belonging. The question to sit with: are you genuinely alone, or just not letting anyone in? Look at what sits in this corner. Solo photos, harsh textures, anything that symbolically says "one." Replace a single object with something that depicts pairing — two cups, two candles, an image of two animals together. Small, specific, not overblown. The corner is a metaphor your unconscious uses; change the metaphor and notice what softens inside you.',
    highReading: 'A nourished relationship corner reflects relationships that are tended. Not perfect — tended. You show up, they show up, the ordinary care gets done. Here the risk is taking this for granted, letting the steady goodness become wallpaper. Do one small act of named appreciation this week — say what you notice, thank them for a specific thing they may not know you see. The corner stays strong when the appreciation stays explicit.',
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
    lowReading: 'A neglected family corner often signals unresolved or unspoken material with the people who raised you. That is not always dramatic — sometimes it is simply the absence of warmth, the default distance. This corner does not require you to make peace with everyone; it asks you to own your lineage. Place a single object that connects you to an ancestor you would have liked to know — a photograph, a recipe, their profession in miniature. You are not required to honour them all. Choose one relative to whom you feel neutral-to-warm, and start there.',
    highReading: 'A thriving family corner does not mean your family is perfect — it means you have integrated where you come from. You do not run from it, you do not romanticise it. Elders\' photos, family plants, shared recipes all live here comfortably. The care now is to transmit something forward: what are you passing on, and is it what you would have wanted to receive? Write one sentence about what you hope your descendants remember of you. Place it in this corner, even folded small.',
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
    lowReading: 'When the centre is weak, everything else wobbles. This is not usually about gym routines — it is about whether you have a felt sense of ground under you. Look at the literal centre of your main room. Is it crowded with furniture, electronics, piles? The central square-metre deserves to be mostly empty — a rug, space, breath. Clear it this week. Then notice: when you sit or stand in that open centre for a full minute, what in your body changes? The centre of the room mirrors the centre of you.',
    highReading: 'A grounded health centre is the quiet foundation that makes everything else possible. You have habits, you tend the body, you notice when something is off before it becomes a crisis. Don\'t let this drift. Health only stays healthy when it is tended — weekly, monthly, not once a year. Identify the one practice that most reliably returns you to yourself, and protect it from whatever is trying to crowd it out. The centre holds everything only while you are still standing in it.',
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
    lowReading: 'A low creativity score often has less to do with talent and more to do with permission. Somewhere along the line you were told what you make is not worth showing. This area asks you to reverse that quietly. Display one unfinished creative work in progress — a sketch, a draft, a rough shape of something. Not your best output; an honest one. Visible evidence of your own making resets the inner narrative from "I am not creative" to "I am creating." That is a foundational shift, and the room can help you rehearse it.',
    highReading: 'A flourishing creativity corner means something is actively being made through you, and you are letting it be seen. The risk is that creative output becomes performance — output for others rather than expression of self. Protect your studio hours. Make one thing this week that nobody will ever see. The practice of private making refills the well that public creativity draws from.',
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
    lowReading: 'A hungry knowledge corner often signals that you have stopped reading the things that feed you and started consuming things that merely occupy you. Scrolling is not study. Open one book you have been meaning to finish but haven\'t. Place it face-up in this corner with a bookmark at your real progress. Return to it for ten minutes this week. A corner devoted to learning asks you to practise actual learning — not the idea of being someone who learns.',
    highReading: 'A rich knowledge corner reflects a mind that is being tended. You read, you sit quietly, you let yourself not know things without panic. The discipline here is to keep converting intake into understanding. Summarise one idea you\'ve learned recently in your own words — one paragraph — and return to it a week later. Wisdom is not knowledge accumulated; it is knowledge that has become yours.',
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
    lowReading: 'A stuck career corner is usually less about the wrong job and more about the wrong story you are telling yourself about work. Check the walkway from your front door inward: is it clear, or is there a pile of shoes, a bag that never moves, a stack of bills blocking the path? Clear that literal obstruction. Then sit with this: if you removed all the "shoulds" about your career, what would you actually want to be doing in the next six months? Write one true sentence. The path opens to those who can name where they want to walk.',
    highReading: 'A flowing career corner means your work aligns with your direction — or at least you have stopped fighting with it. The risk here is success that quietly consumes the rest of you. Look at the adjacent corners on the map: are wealth, family, and health being tended too, or is the career area the only one getting water? A life is not a career. Replenish the other zones this month so the path you are walking continues to go somewhere you actually want to arrive.',
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
    lowReading: 'A dormant helpers area usually mirrors the belief that you must figure everything out alone. You may feel isolated, or competent to a fault, or both. The remedy is practical and uncomfortable: ask for help with one specific thing this week. Name it, tell one person, receive what they offer. Each time you receive help with grace, the corner quietly refills. Place an image of a mentor or a place you want to visit in this corner as a visual reminder that good people and good experiences are genuinely available to you.',
    highReading: 'A thriving helpers corner means your network is alive — mentors, friends, well-timed strangers have shown up, and you have learned to let them. The work here is reciprocity. Who is helping you right now that you have not thanked recently? Who used to help you that you have quietly lost touch with? A single message this week — short, specific, warm — keeps the metal in this corner bright. Help received without help returned becomes debt; help exchanged becomes relationship.',
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
