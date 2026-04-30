// Mood Diary — 30-day mood curve with daily check-in.
//
// Persistence: localStorage per user. Each day gets one entry. Re-opening
// the same day overwrites the previous entry. The last 30 days worth of
// entries render as a curve on the Home screen + Profile.
//
// Future upgrade: migrate to Supabase table with RLS for cross-device
// sync. localStorage is a safe V1 because mood data is small, per-device
// is acceptable for most users, and we avoid a backend migration on
// first ship.

export type MoodCategory = 'calm' | 'charged' | 'drained' | 'steady' | 'anxious' | 'joyful' | 'heavy' | 'curious';

export interface MoodEntry {
  /** ISO date YYYY-MM-DD */
  date: string;
  /** One of the primary categories */
  category: MoodCategory;
  /** 1-5 intensity */
  intensity: 1 | 2 | 3 | 4 | 5;
  /** Optional free-text note */
  note?: string;
  /** Epoch ms when entry was saved */
  savedAt: number;
}

export interface MoodCategoryInfo {
  name: string;
  emoji: string;
  color: string;
  /** Suggested journal prompt for this mood */
  journalPrompt: string;
  /** Recommendation for this state */
  recommendation: string;
}

export const MOOD_CATEGORIES: Record<MoodCategory, MoodCategoryInfo> = {
  calm: {
    name: 'Calm',
    emoji: '🌊',
    color: 'cosmic-blue',
    journalPrompt: 'What is creating this quiet in me today? How can I protect it?',
    recommendation: 'Stay close to what made this calm possible — don\'t over-schedule the rest of your day.',
  },
  charged: {
    name: 'Charged',
    emoji: '⚡',
    color: 'gold',
    journalPrompt: 'What is this energy asking me to do? What am I being called toward?',
    recommendation: 'Channel the charge into one focused action, not three scattered ones.',
  },
  drained: {
    name: 'Drained',
    emoji: '🌙',
    color: 'mystic-500',
    journalPrompt: 'What drained me? What have I been carrying that is not mine to carry?',
    recommendation: 'This is not a day to push. Rest is the work. Do the minimum and come back tomorrow.',
  },
  steady: {
    name: 'Steady',
    emoji: '🌿',
    color: 'emerald-400',
    journalPrompt: 'What is the rhythm holding me up today? Can I let more of this into my life?',
    recommendation: 'A good day to pick up something requiring sustained effort. You have the ground.',
  },
  anxious: {
    name: 'Anxious',
    emoji: '🌬️',
    color: 'pink-400',
    journalPrompt: 'What specifically is my nervous system bracing for? What would it take to name the fear out loud?',
    recommendation: 'Breath slower than the thoughts. Five minutes of 4-7-8 breathing before any big decision.',
  },
  joyful: {
    name: 'Joyful',
    emoji: '🌞',
    color: 'gold',
    journalPrompt: 'What brought the joy? Write it down — so future-you has a map back.',
    recommendation: 'Let this be uncomplicated. Don\'t analyse joy; metabolise it.',
  },
  heavy: {
    name: 'Heavy',
    emoji: '🌧️',
    color: 'cosmic-violet',
    journalPrompt: 'What am I grieving, even quietly? What is this weight trying to tell me?',
    recommendation: 'Move your body — a walk, a stretch. Heaviness lifts through motion more reliably than through thought.',
  },
  curious: {
    name: 'Curious',
    emoji: '✨',
    color: 'cosmic-blue',
    journalPrompt: 'What is tugging at me? What question wants to be followed today?',
    recommendation: 'Follow the thread. Curiosity is rare — feed it while it\'s awake.',
  },
};

const STORAGE_KEY = 'arcana_mood_diary_v1';

export function loadMoodEntries(): MoodEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is MoodEntry => (
      e && typeof e.date === 'string' && typeof e.category === 'string' && typeof e.intensity === 'number'
    ));
  } catch {
    return [];
  }
}

export function saveMoodEntry(entry: Omit<MoodEntry, 'savedAt'>): MoodEntry {
  const full: MoodEntry = { ...entry, savedAt: Date.now() };
  const all = loadMoodEntries();
  // One entry per date — last write wins
  const filtered = all.filter((e) => e.date !== full.date);
  filtered.push(full);
  // Keep only last 90 days to bound storage size
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const trimmed = filtered.filter((e) => e.savedAt >= cutoff);
  trimmed.sort((a, b) => (a.date > b.date ? 1 : -1));
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore quota errors — mood diary is best-effort
  }
  return full;
}

export function getLast30Days(): MoodEntry[] {
  const all = loadMoodEntries();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return all.filter((e) => e.date >= cutoffStr);
}

export function getTodayEntry(): MoodEntry | null {
  const today = new Date().toISOString().slice(0, 10);
  const all = loadMoodEntries();
  return all.find((e) => e.date === today) ?? null;
}

// Numeric scale for curve rendering: higher = more "activated/up",
// lower = more "depleted/down". Used only for visual-y axis, not clinical.
const MOOD_Y_VALUE: Record<MoodCategory, number> = {
  joyful: 5,
  curious: 4,
  charged: 4,
  steady: 3,
  calm: 3,
  anxious: 2,
  heavy: 1,
  drained: 1,
};

export function entryToYValue(entry: MoodEntry): number {
  // Blend mood category with intensity (1-5).
  //
  // High-intensity positive moods push y HIGHER (more activated/up).
  // High-intensity negative moods push y LOWER (more depleted/down).
  // Symmetrical formula: signed adjustment proportional to (intensity - 3),
  // sign matched to the mood's direction. Bug pre-2026-04-30: the negative
  // branch flipped the sign so extreme-drained plotted ABOVE mild-drained.
  const base = MOOD_Y_VALUE[entry.category];
  const adjust = (entry.intensity - 3) * 0.3;
  if (base >= 3) return Math.min(5, base + adjust);
  return Math.max(1, base - adjust);
}

// ─── Pattern derivation ──────────────────────────────────────────
// Client-side aggregation over the last 14 mood entries. Returns a
// set of observations the UI can surface as an "insight" card above
// the 30-day curve. No AI, no server call — just honest math over
// what the user already logged.

export type MoodDrift = 'rising' | 'falling' | 'steady';
export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface MoodPattern {
  /** Number of entries the pattern was computed from (min 3 for meaningful output). */
  sampleSize: number;
  /** Dominant category this week. Null if tied or too few entries. */
  dominantCategory: MoodCategory | null;
  /** Most common category in the prior week for comparison. */
  priorWeekDominant: MoodCategory | null;
  /** Whether this week shifted meaningfully vs. prior week. */
  categoryShifted: boolean;
  /** Week-over-week y-value delta; positive = lighter/brighter trend. */
  driftDelta: number;
  /** Coarse summary of the trend. */
  drift: MoodDrift;
  /** Average intensity this week, rounded to 1dp. */
  averageIntensity: number;
  /** Which day of the week tends to hit heaviest (lowest y-value). */
  heaviestDay: DayOfWeek | null;
  /** Which day of the week tends to feel lightest. */
  lightestDay: DayOfWeek | null;
  /** A plain-English one-line observation for the UI headline. */
  headline: string;
}

const DAY_NAMES: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function derivePattern(entries: MoodEntry[]): MoodPattern {
  // Sort descending by date so last 14 are most recent.
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
  const recent = sorted.slice(0, 14);
  const thisWeek = recent.slice(0, 7);
  const priorWeek = recent.slice(7, 14);

  const dominantCategory = dominant(thisWeek);
  const priorWeekDominant = dominant(priorWeek);
  const categoryShifted = !!dominantCategory && !!priorWeekDominant && dominantCategory !== priorWeekDominant;

  const thisY = avg(thisWeek.map((e) => entryToYValue(e)));
  const priorY = avg(priorWeek.map((e) => entryToYValue(e)));
  const driftDelta = priorWeek.length >= 3 ? Number((thisY - priorY).toFixed(2)) : 0;
  const drift: MoodDrift =
    driftDelta > 0.35 ? 'rising' : driftDelta < -0.35 ? 'falling' : 'steady';

  const averageIntensity = Number(avg(thisWeek.map((e) => e.intensity)).toFixed(1));

  const byDay: Record<DayOfWeek, number[]> = {
    Sun: [], Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [],
  };
  for (const e of recent) {
    const dayIndex = new Date(e.date + 'T00:00:00Z').getUTCDay();
    byDay[DAY_NAMES[dayIndex]].push(entryToYValue(e));
  }
  const dayAverages = (Object.entries(byDay) as [DayOfWeek, number[]][])
    .filter(([, vals]) => vals.length > 0)
    .map(([day, vals]) => ({ day, avg: avg(vals) }));
  let heaviestDay: DayOfWeek | null = null;
  let lightestDay: DayOfWeek | null = null;
  if (dayAverages.length >= 3) {
    heaviestDay = dayAverages.reduce((a, b) => (a.avg < b.avg ? a : b)).day;
    lightestDay = dayAverages.reduce((a, b) => (a.avg > b.avg ? a : b)).day;
    if (heaviestDay === lightestDay) {
      lightestDay = null;
      heaviestDay = null;
    }
  }

  const headline = buildHeadline({
    sample: thisWeek.length,
    drift,
    dominantCategory,
    priorWeekDominant,
    categoryShifted,
    heaviestDay,
  });

  return {
    sampleSize: thisWeek.length,
    dominantCategory,
    priorWeekDominant,
    categoryShifted,
    driftDelta,
    drift,
    averageIntensity,
    heaviestDay,
    lightestDay,
    headline,
  };
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function dominant(entries: MoodEntry[]): MoodCategory | null {
  if (entries.length === 0) return null;
  const counts = new Map<MoodCategory, number>();
  for (const e of entries) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  let winner: MoodCategory | null = null;
  let max = 0;
  let tie = false;
  for (const [cat, n] of counts) {
    if (n > max) { max = n; winner = cat; tie = false; }
    else if (n === max) tie = true;
  }
  return tie ? null : winner;
}

function buildHeadline(opts: {
  sample: number;
  drift: MoodDrift;
  dominantCategory: MoodCategory | null;
  priorWeekDominant: MoodCategory | null;
  categoryShifted: boolean;
  heaviestDay: DayOfWeek | null;
}): string {
  if (opts.sample < 3) {
    return 'Log a few more days to see a pattern emerge.';
  }
  if (opts.drift === 'rising' && opts.categoryShifted) {
    return `Lighter this week — moved from ${opts.priorWeekDominant} to ${opts.dominantCategory ?? 'mixed'}.`;
  }
  if (opts.drift === 'falling' && opts.categoryShifted) {
    return `Heavier this week — the dominant note shifted from ${opts.priorWeekDominant} to ${opts.dominantCategory ?? 'mixed'}.`;
  }
  if (opts.drift === 'rising') {
    return `Curve rising — this week feels lighter than last.`;
  }
  if (opts.drift === 'falling') {
    return `Curve dipping — this week has been heavier than last.`;
  }
  if (opts.dominantCategory) {
    return opts.heaviestDay
      ? `Mostly ${opts.dominantCategory} this week. ${opts.heaviestDay}s have been the heaviest.`
      : `Mostly ${opts.dominantCategory} this week. A steady note.`;
  }
  return 'A mixed week — no single mood has dominated.';
}
