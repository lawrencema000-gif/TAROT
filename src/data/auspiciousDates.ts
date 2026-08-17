/**
 * 擇日 — the personal good-day finder.
 *
 * Chinese date selection asks a different question from astrology: not "what
 * are you like" but "when should you do this particular thing". It reads a
 * calendar day from two directions at once —
 *
 *   the ALMANAC layer, which is the same for everybody: which of the 二十八宿
 *   governs the day, and what that mansion is traditionally 宜 (favoured) and
 *   忌 (avoided) for;
 *
 *   the PERSONAL layer, which is yours alone: how the day's own stem-branch
 *   pillar relates to the pillars of your birth — a 沖 (clash) against your day
 *   or year branch is the single most-cited reason a traditional almanac tells
 *   someone to pick a different date.
 *
 * Every input here is already golden-tested elsewhere: mansions come from the
 * 值日 cycle in ./lunarMansions (whose anchor is checked against the weekday
 * lock over 4,000 days), day pillars from ./bazi (bounded by real solar terms),
 * and the branch relations are the classical 六沖/六合/三合 sets.
 *
 * WHAT THIS IS NOT. It is a traditional custom, presented as one. It says
 * nothing about health, money, law, or whether anything will actually work —
 * and the scoring below is a transparent, additive tally rather than an oracle,
 * so a user can always see exactly why a day scored the way it did.
 */

import {
  mansionForBirth, MANSION_ACTIVITIES, type Mansion, type MansionKey,
} from './lunarMansions';
import { computeBazi, BRANCHES, type EarthlyBranch, type BaziResult } from './bazi';

/* ────────────────────────────────────────────────────────────────────────
 * 1. Intentions — what the user is choosing a day for
 * ──────────────────────────────────────────────────────────────────────── */

export type Intention =
  | 'wedding' | 'travel' | 'business' | 'moving' | 'building'
  | 'signing' | 'study' | 'ceremony' | 'planting';

/**
 * Each intention maps onto the activity strings the mansion tables actually
 * use. Matching is by exact string against MANSION_ACTIVITIES, so a table edit
 * that renames an activity shows up as an intention quietly losing its matches
 * — which the golden tests assert against.
 */
export const INTENTIONS: Record<Intention, { label: string; cn: string; blurb: string; activities: string[] }> = {
  wedding: {
    label: 'Marriage', cn: '婚姻',
    blurb: 'Weddings, engagements, moving in together.',
    activities: ['Weddings'],
  },
  travel: {
    label: 'Travel', cn: '出行',
    blurb: 'Journeys, relocation abroad, setting out.',
    activities: ['Travel', 'Travelling south', 'Travelling north'],
  },
  business: {
    label: 'Opening a business', cn: '開市',
    blurb: 'Launching, opening a shop, first day of trading.',
    activities: ['Opening a business', 'Opening a shop'],
  },
  moving: {
    label: 'Moving house', cn: '入宅',
    blurb: 'Moving in, changing address.',
    activities: ['Moving house'],
  },
  building: {
    label: 'Building work', cn: '修造',
    blurb: 'Breaking ground, renovation, repairs.',
    activities: [
      'Building', 'Building and renovation', 'Building a house',
      'Repairing a house', 'New construction', 'Breaking ground on a build',
      'Raising pillars', 'Work at height', 'Digging a well',
    ],
  },
  signing: {
    label: 'Agreements', cn: '立契',
    blurb: 'Contracts, buying property, formal commitments.',
    activities: ['Buying land', 'Public and official business'],
  },
  study: {
    label: 'Study', cn: '入學',
    blurb: 'Starting a course, taking up a discipline.',
    // NB 'Taking up a new skill' used to be here. It was removed from 虛 when
    // that mansion's 宜 list was emptied (its primary source calls the day
    // 百事皆凶), so the string no longer exists in any table and matched nothing.
    activities: ['Starting school or study', 'Important consultations'],
  },
  ceremony: {
    label: 'Ceremony', cn: '祭祀',
    blurb: 'Rites, offerings, remembrance.',
    activities: ['Rituals and offerings', 'Funerals and burials', 'Funerals', 'Burials', 'Work on tombs and grave sites'],
  },
  planting: {
    label: 'Planting', cn: '播種',
    blurb: 'Sowing, gardens, anything you want to take root.',
    activities: ['Sowing and planting', 'Making a garden'],
  },
};

/* ────────────────────────────────────────────────────────────────────────
 * 2. Branch relations — the personal layer
 * ──────────────────────────────────────────────────────────────────────── */

/** 六沖 — the six clashes. Each branch opposes the one six places away. */
export function clashes(a: EarthlyBranch, b: EarthlyBranch): boolean {
  const d = Math.abs(BRANCHES.indexOf(a) - BRANCHES.indexOf(b));
  return d === 6;
}

/** 六合 — 子丑 寅亥 卯戌 辰酉 巳申 午未. */
const SIX_COMBINE: Record<string, string> = {
  Zi: 'Chou', Chou: 'Zi', Yin: 'Hai', Hai: 'Yin', Mao: 'Xu', Xu: 'Mao',
  Chen: 'You', You: 'Chen', Si: 'Shen', Shen: 'Si', Wu: 'Wei', Wei: 'Wu',
};
export function combines(a: EarthlyBranch, b: EarthlyBranch): boolean {
  return SIX_COMBINE[a] === b;
}

/** 三合 — the four frames. Two members of the same frame support each other. */
const FRAMES: EarthlyBranch[][] = [
  ['Shen', 'Zi', 'Chen'], ['Yin', 'Wu', 'Xu'],
  ['Si', 'You', 'Chou'], ['Hai', 'Mao', 'Wei'],
];
export function sameFrame(a: EarthlyBranch, b: EarthlyBranch): boolean {
  if (a === b) return false;
  return FRAMES.some((f) => f.includes(a) && f.includes(b));
}

/* ────────────────────────────────────────────────────────────────────────
 * 3. Scoring a single day
 * ──────────────────────────────────────────────────────────────────────── */

export interface DayReason {
  /** Positive helps, negative hinders. */
  weight: number;
  text: string;
  kind: 'mansion' | 'personal';
}

export interface DayScore {
  /** YYYY-MM-DD. */
  date: string;
  score: number;
  mansion: Mansion;
  dayBranch: EarthlyBranch;
  reasons: DayReason[];
  /** True when the day clashes with the user's own day or year branch. */
  personalClash: boolean;
}

const WEIGHTS = {
  activityFavoured: 3,
  activityAvoided: -4,
  mansionAuspicious: 1,
  mansionInauspicious: -1,
  dayClash: -5,
  yearClash: -3,
  dayCombine: 2,
  frameSupport: 1,
} as const;

/** Format a Date as YYYY-MM-DD in local civil terms. */
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Score one calendar day for one intention.
 *
 * `birth` is optional: with no birth chart the almanac layer still works, and
 * the result simply carries no personal reasons. That matters because date
 * selection is the one feature here that is useful before a user has entered
 * anything about themselves.
 */
export function scoreDay(date: Date, intention: Intention, birth?: BaziResult | null): DayScore | null {
  if (!Number.isFinite(date.getTime())) return null;
  const iso = isoDate(date);

  // Resolve the mansion FROM THE CALENDAR DATE, not from the instant. The 值日
  // cycle turns over at CST midnight, so a Date at local midnight belongs to
  // the PREVIOUS CST day for anyone east of UTC+8 — which put a Tokyo user's
  // label and mansion a day apart. mansionForBirth reads a YYYY-MM-DD as CST
  // noon, so the date shown and the mansion described always agree.
  const mansion = mansionForBirth(iso);
  if (!mansion) return null;

  const dayChart = computeBazi(iso, '12:00');
  if (!dayChart) return null;

  const reasons: DayReason[] = [];
  let score = 0;

  // ── almanac layer ──
  const acts = MANSION_ACTIVITIES[mansion.key as MansionKey];
  const wanted = INTENTIONS[intention].activities;
  const favoured = acts.favourable.filter((a) => wanted.includes(a));
  const avoided = acts.unfavourable.filter((a) => wanted.includes(a));

  for (const a of favoured) {
    score += WEIGHTS.activityFavoured;
    reasons.push({ weight: WEIGHTS.activityFavoured, kind: 'mansion', text: `${mansion.cn} favours ${a.toLowerCase()}` });
  }
  for (const a of avoided) {
    score += WEIGHTS.activityAvoided;
    reasons.push({ weight: WEIGHTS.activityAvoided, kind: 'mansion', text: `${mansion.cn} counsels against ${a.toLowerCase()}` });
  }
  if (favoured.length === 0 && avoided.length === 0) {
    // No direct guidance — fall back to the mansion's overall standing, weighted
    // lightly so it never outweighs a direct 宜/忌.
    const w = mansion.fortune === 'auspicious' ? WEIGHTS.mansionAuspicious : WEIGHTS.mansionInauspicious;
    score += w;
    reasons.push({
      weight: w, kind: 'mansion',
      text: mansion.fortune === 'auspicious'
        ? `${mansion.cn} is a 吉宿 — generally favourable, with nothing specific recorded for this`
        : `${mansion.cn} is a 凶宿 — generally unfavourable, with nothing specific recorded for this`,
    });
  }

  // ── personal layer ──
  let personalClash = false;
  if (birth) {
    const d = dayChart.day.branch;
    if (clashes(d, birth.day.branch)) {
      personalClash = true;
      score += WEIGHTS.dayClash;
      reasons.push({ weight: WEIGHTS.dayClash, kind: 'personal', text: 'The day branch clashes with your own day pillar (日沖) — the classic reason to pick another date' });
    }
    if (clashes(d, birth.year.branch)) {
      personalClash = true;
      score += WEIGHTS.yearClash;
      reasons.push({ weight: WEIGHTS.yearClash, kind: 'personal', text: 'The day clashes with your year branch (沖太歲)' });
    }
    if (combines(d, birth.day.branch)) {
      score += WEIGHTS.dayCombine;
      reasons.push({ weight: WEIGHTS.dayCombine, kind: 'personal', text: 'The day combines with your day pillar (六合) — an easy, cooperative day for you' });
    }
    if (sameFrame(d, birth.day.branch)) {
      score += WEIGHTS.frameSupport;
      reasons.push({ weight: WEIGHTS.frameSupport, kind: 'personal', text: 'The day shares a 三合 frame with your day pillar — quietly supportive' });
    }
  }

  return { date: iso, score, mansion, dayBranch: dayChart.day.branch, reasons, personalClash };
}

/**
 * Score a window of days and return them in date order.
 *
 * Deliberately NOT pre-sorted by score: a caller almost always wants to show
 * the calendar in order and highlight the good days within it, and sorting here
 * would quietly discard that.
 */
export function scoreWindow(
  from: Date, days: number, intention: Intention, birth?: BaziResult | null,
): DayScore[] {
  const out: DayScore[] = [];
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime());
    d.setDate(d.getDate() + i);
    const s = scoreDay(d, intention, birth);
    if (s) out.push(s);
  }
  return out;
}

/** The best days in a window, strongest first. Ties break toward the earlier date. */
export function bestDays(scored: DayScore[], count = 5): DayScore[] {
  return [...scored]
    .sort((a, b) => (b.score - a.score) || a.date.localeCompare(b.date))
    .slice(0, count);
}

/** Days worth actively avoiding — a clash, or a direct 忌 against the intention. */
export function daysToAvoid(scored: DayScore[], count = 5): DayScore[] {
  return scored
    .filter((d) => d.personalClash || d.reasons.some((r) => r.kind === 'mansion' && r.weight <= WEIGHTS.activityAvoided))
    .sort((a, b) => (a.score - b.score) || a.date.localeCompare(b.date))
    .slice(0, count);
}

/* ────────────────────────────────────────────────────────────────────────
 * 4. Calendar export
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * A minimal RFC 5545 all-day VEVENT feed for the chosen days.
 *
 * Kept dependency-free and deliberately plain: escaped text, CRLF line endings,
 * and a UID derived from the date and intention so re-importing updates the
 * same event instead of duplicating it.
 */
export function toICS(days: DayScore[], intention: Intention): string {
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const stamp = '20260101T000000Z';
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Arcana//Auspicious Dates//EN', 'CALSCALE:GREGORIAN',
  ];
  for (const d of days) {
    const compact = d.date.replace(/-/g, '');
    const next = new Date(`${d.date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const endCompact = next.toISOString().slice(0, 10).replace(/-/g, '');
    lines.push(
      'BEGIN:VEVENT',
      `UID:arcana-${intention}-${compact}@tarotlife.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact}`,
      `DTEND;VALUE=DATE:${endCompact}`,
      `SUMMARY:${esc(`${INTENTIONS[intention].label} — ${d.mansion.cn} ${d.mansion.pinyin}`)}`,
      `DESCRIPTION:${esc(d.reasons.map((r) => r.text).join('\n'))}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
