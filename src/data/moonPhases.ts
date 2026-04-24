/**
 * Moon phase data + guidance. Computes the current lunar phase from the
 * synodic period and returns an 8-phase classification with ritual prompts
 * for each. Client-only — no API calls.
 *
 * Reference full moon: 2000-01-06 18:14 UTC (canonical ephemeris anchor).
 * Synodic period: 29.53059 days.
 */

const REFERENCE_NEW_MOON_UTC = new Date('2000-01-06T18:14:00Z').getTime() - (14.7653 * 86400000);
const SYNODIC_MS = 29.53059 * 86400000;

export type MoonPhaseKey =
  | 'new'
  | 'waxing-crescent'
  | 'first-quarter'
  | 'waxing-gibbous'
  | 'full'
  | 'waning-gibbous'
  | 'last-quarter'
  | 'waning-crescent';

export interface MoonPhaseInfo {
  key: MoonPhaseKey;
  name: string;
  glyph: string;
  energy: string;
  guidance: string;
  ritual: string;
  journalPrompt: string;
  illumination: number;
  ageDays: number;
  nextPhase: { key: MoonPhaseKey; inDays: number };
}

const PHASE_META: Record<MoonPhaseKey, {
  name: string;
  glyph: string;
  energy: string;
  guidance: string;
  ritual: string;
  journalPrompt: string;
}> = {
  'new': {
    name: 'New Moon',
    glyph: '🌑',
    energy: 'Planting. The sky is empty so your intention can take root.',
    guidance: 'A quiet threshold. Name what you are beginning — not what is finished. Do not force clarity; just set direction.',
    ritual: 'Write three intentions for the coming cycle. Fold the paper, keep it somewhere private until the full moon.',
    journalPrompt: 'What am I ready to begin, even if I cannot yet see the whole path?',
  },
  'waxing-crescent': {
    name: 'Waxing Crescent',
    glyph: '🌒',
    energy: 'Building. Momentum is fragile but real.',
    guidance: 'Take the first small action toward what you named at the new moon. Consistency beats intensity here.',
    ritual: 'Light a candle and list three tiny steps you can take this week. Take the first one today.',
    journalPrompt: 'What one step, however small, moves me closer to the intention I planted?',
  },
  'first-quarter': {
    name: 'First Quarter',
    glyph: '🌓',
    energy: 'Decision. Half-light; the choice is visible.',
    guidance: 'Expect resistance now — this is when momentum meets doubt. Recommit or adjust; do not abandon.',
    ritual: 'Name one obstacle standing between you and your intention. Write the exact next action that moves past it.',
    journalPrompt: 'Where am I meeting resistance, and what does it want me to learn?',
  },
  'waxing-gibbous': {
    name: 'Waxing Gibbous',
    glyph: '🌔',
    energy: 'Refining. Almost full, not quite.',
    guidance: 'The result is close but needs polish. Do the boring, careful work now — editing, checking, repairing.',
    ritual: 'Review what you have built this cycle. What one detail, if improved, would change the whole?',
    journalPrompt: 'What am I almost finished with, and what final refinement does it need?',
  },
  'full': {
    name: 'Full Moon',
    glyph: '🌕',
    energy: 'Revelation. Everything is lit — including what you did not want to see.',
    guidance: 'Harvest what is ripe. Celebrate progress; acknowledge what is now clearly not working. Emotions run high — move slowly.',
    ritual: 'Under moonlight (or facing a window), name three things completed this cycle. Speak one truth you have been avoiding.',
    journalPrompt: 'What is the full moon showing me that I was not ready to see at the new moon?',
  },
  'waning-gibbous': {
    name: 'Waning Gibbous',
    glyph: '🌖',
    energy: 'Gratitude. The light recedes but the gift remains.',
    guidance: 'Share what you learned. Teach, thank, record. This is integration — not striving.',
    ritual: 'Send one message of thanks to someone who supported you this cycle. Write one lesson in your journal.',
    journalPrompt: 'What am I grateful for from this cycle, and who helped me get here?',
  },
  'last-quarter': {
    name: 'Last Quarter',
    glyph: '🌗',
    energy: 'Release. Half-dark; the choice is what to let go.',
    guidance: 'Clear space. Finish what is finishable; release what is not. Do not start new projects yet.',
    ritual: 'Name one habit, item, or commitment to release. Write it down, then cross it out.',
    journalPrompt: 'What is ready to be released so the next cycle can begin clean?',
  },
  'waning-crescent': {
    name: 'Waning Crescent',
    glyph: '🌘',
    energy: 'Rest. The moon is almost gone; so should your doing be.',
    guidance: 'Do less. Sleep more. Dream. This is not procrastination — it is the nervous system restoring before the next cycle.',
    ritual: 'Unplug for an hour. No screens, no productivity. Sit, walk, lie down. Notice what surfaces when you stop.',
    journalPrompt: 'What does my body or spirit need before I begin again?',
  },
};

const PHASE_ORDER: MoonPhaseKey[] = [
  'new',
  'waxing-crescent',
  'first-quarter',
  'waxing-gibbous',
  'full',
  'waning-gibbous',
  'last-quarter',
  'waning-crescent',
];

function classifyPhase(ageDays: number): MoonPhaseKey {
  const cycle = 29.53059;
  if (ageDays < 1.84566) return 'new';
  if (ageDays < 5.53699) return 'waxing-crescent';
  if (ageDays < 9.22831) return 'first-quarter';
  if (ageDays < 12.91963) return 'waxing-gibbous';
  if (ageDays < 16.61096) return 'full';
  if (ageDays < 20.30228) return 'waning-gibbous';
  if (ageDays < 23.99361) return 'last-quarter';
  if (ageDays < 27.68493) return 'waning-crescent';
  if (ageDays < cycle) return 'new';
  return 'new';
}

function daysUntilNextPhase(ageDays: number, currentKey: MoonPhaseKey): number {
  const boundaries: Record<MoonPhaseKey, number> = {
    'new': 1.84566,
    'waxing-crescent': 5.53699,
    'first-quarter': 9.22831,
    'waxing-gibbous': 12.91963,
    'full': 16.61096,
    'waning-gibbous': 20.30228,
    'last-quarter': 23.99361,
    'waning-crescent': 27.68493,
  };
  const boundary = boundaries[currentKey];
  const days = boundary - ageDays;
  return Math.max(0, Math.round(days * 10) / 10);
}

export function getMoonPhase(date: Date = new Date()): MoonPhaseInfo {
  const diff = date.getTime() - REFERENCE_NEW_MOON_UTC;
  const phase = ((diff % SYNODIC_MS) + SYNODIC_MS) % SYNODIC_MS;
  const ageDays = phase / 86400000;
  const key = classifyPhase(ageDays);
  const meta = PHASE_META[key];

  // Illumination is 0 at new, 1 at full, back to 0. Approximated with a cosine.
  const illumination = Math.max(0, Math.min(1, (1 - Math.cos((ageDays / 29.53059) * 2 * Math.PI)) / 2));

  const currentIdx = PHASE_ORDER.indexOf(key);
  const nextKey = PHASE_ORDER[(currentIdx + 1) % PHASE_ORDER.length];
  const inDays = daysUntilNextPhase(ageDays, key);

  return {
    key,
    name: meta.name,
    glyph: meta.glyph,
    energy: meta.energy,
    guidance: meta.guidance,
    ritual: meta.ritual,
    journalPrompt: meta.journalPrompt,
    illumination: Math.round(illumination * 100) / 100,
    ageDays: Math.round(ageDays * 10) / 10,
    nextPhase: { key: nextKey, inDays },
  };
}

export function getPhaseMeta(key: MoonPhaseKey) {
  return PHASE_META[key];
}
