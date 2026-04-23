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
  // Blend mood category with intensity (1-5)
  const base = MOOD_Y_VALUE[entry.category];
  // Slight adjustment: high-intensity positive moods push higher,
  // high-intensity negative moods push lower
  if (base >= 3) return Math.min(5, base + (entry.intensity - 3) * 0.3);
  return Math.max(1, base - (3 - entry.intensity) * 0.3);
}
