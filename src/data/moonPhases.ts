/**
 * Moon phase data + guidance. Client-only: no API calls.
 *
 * The Moon is read from astronomy-engine, the same engine as
 * src/utils/solarTerms.ts and src/utils/chineseLunar.ts (no mean cycle).
 *
 * The rule the card follows (no single authority prescribes one):
 *  - A principal phase (New moon, First quarter, Full moon, Last quarter) is
 *    named on the reader's local calendar day that contains its instant, as
 *    calendars and almanac day listings do.
 *  - Every other day takes the intermediate name from the Moon–Sun
 *    elongation (Astronomy.MoonPhase): 0–90° waxing crescent, 90–180°
 *    waxing gibbous, 180–270° waning gibbous, 270–360° waning crescent.
 *  - "Next" is the first principal phase after now whose name differs from
 *    the one shown. So on a First Quarter day the card says "Next: Full moon
 *    …", never "Next: First quarter in 0.3 days" under a "First quarter" title.
 *  - Age is the time since the last new moon. Illumination is the lit
 *    fraction of the disc.
 */

import * as Astronomy from 'astronomy-engine';

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
  waxing: boolean;
  nextPhase: { key: MoonPhaseKey; inDays: number; at: Date };
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

/** The eight phases in cycle order. */
export const PHASE_ORDER: readonly MoonPhaseKey[] = [
  'new',
  'waxing-crescent',
  'first-quarter',
  'waxing-gibbous',
  'full',
  'waning-gibbous',
  'last-quarter',
  'waning-crescent',
];

const DAY_MS = 86_400_000;
/** SearchMoonQuarter's `quarter`: 0 new, 1 first quarter, 2 full, 3 last quarter. */
const QUARTER_KEY: readonly MoonPhaseKey[] = ['new', 'first-quarter', 'full', 'last-quarter'];

/** The calendar day an instant falls on for the reader (undefined = the device's zone). */
function localDay(d: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/**
 * The Moon at `date` for a reader in `timeZone` (default: the device's zone).
 * Returns null when the ephemeris cannot be computed: the card then shows
 * nothing rather than a wrong Moon.
 */
export function getMoonPhase(date: Date = new Date(), timeZone?: string): MoonPhaseInfo | null {
  try {
    const t = date.getTime();
    if (!Number.isFinite(t)) return null;
    const elongation = Astronomy.MoonPhase(date); // 0 new … 90 FQ … 180 full … 270 LQ
    // Latest new moon at or before `date` (lunations run 29.27–29.83 days, so 30 always reaches it).
    const lastNew = Astronomy.SearchMoonPhase(0, date, -30);
    if (!lastNew) return null;
    // Principal phases are 6.5–8.2 days apart, so one starting 9 days back is always before `date`.
    let q = Astronomy.SearchMoonQuarter(new Date(t - 9 * DAY_MS));
    let prev: Astronomy.MoonQuarter | null = null;
    const after: Astronomy.MoonQuarter[] = [];
    while (after.length < 2) {
      if (q.time.date.getTime() <= t) prev = q;
      else after.push(q);
      q = Astronomy.NextMoonQuarter(q);
    }
    const today = localDay(date, timeZone);
    let key: MoonPhaseKey;
    if (prev && localDay(prev.time.date, timeZone) === today) key = QUARTER_KEY[prev.quarter];
    else if (localDay(after[0].time.date, timeZone) === today) key = QUARTER_KEY[after[0].quarter];
    else
      key =
        elongation < 90
          ? 'waxing-crescent'
          : elongation < 180
            ? 'waxing-gibbous'
            : elongation < 270
              ? 'waning-gibbous'
              : 'waning-crescent';
    const next = QUARTER_KEY[after[0].quarter] === key ? after[1] : after[0];
    const meta = PHASE_META[key];
    const illumination = Astronomy.Illumination(Astronomy.Body.Moon, date).phase_fraction;
    return {
      key,
      ...meta, // name, glyph, energy, guidance, ritual, journalPrompt
      illumination: Math.round(illumination * 100) / 100,
      ageDays: Math.round(((t - lastNew.date.getTime()) / DAY_MS) * 10) / 10,
      waxing: elongation < 180,
      nextPhase: {
        key: QUARTER_KEY[next.quarter],
        inDays: Math.round(((next.time.date.getTime() - t) / DAY_MS) * 10) / 10,
        at: next.time.date,
      },
    };
  } catch {
    return null; // the card shows nothing rather than a wrong Moon
  }
}

export function getPhaseMeta(key: MoonPhaseKey) {
  return PHASE_META[key];
}
