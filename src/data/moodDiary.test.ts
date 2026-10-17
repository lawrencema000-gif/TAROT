import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadMoodEntries,
  saveMoodEntry,
  replaceLocalMoodEntries,
  clearLegacyMoodCache,
  pendingMoodUploads,
  getTodayEntry,
  moodStorageKey,
  loadLegacyMoodEntries,
  legacyMoodOffer,
  declineLegacyMood,
  type MoodEntry,
} from './moodDiary';
import { localDateStr } from '../utils/localDate';

// P7 review #1 (blocker): the mood cache was one device-global key, and the
// sync uploaded every cached day the signed-in account lacked — so account B
// received account A's moods and private notes. The cache is now per account.

/** Node 25 ships its own (file-less, broken) localStorage over jsdom's; give the code a real one. */
function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() { return store.size; },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  } as Storage;
}

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const LEGACY = 'arcana_mood_diary_v1';

describe('mood diary device cache is scoped to the account that wrote it', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    Object.defineProperty(window, 'localStorage', { value: globalThis.localStorage, configurable: true });
  });

  it('one account never reads another account’s days or notes', () => {
    saveMoodEntry(A, { date: localDateStr(), category: 'heavy', intensity: 4, note: 'private note of A' });
    expect(loadMoodEntries(A)).toHaveLength(1);
    expect(loadMoodEntries(B)).toEqual([]);
    expect(getTodayEntry(B)).toBeNull();
    expect(getTodayEntry(A)?.note).toBe('private note of A');
  });

  it('nothing from A is ever pending upload for B', () => {
    saveMoodEntry(A, { date: '2026-10-01', category: 'calm', intensity: 3, note: 'A only' });
    const pendingForB = pendingMoodUploads(loadMoodEntries(B), []);
    expect(pendingForB).toEqual([]);
    // …while A's own unsynced day is A's to upload.
    expect(pendingMoodUploads(loadMoodEntries(A), []).map((e) => e.note)).toEqual(['A only']);
  });

  it('the legacy unscoped cache (writer unknowable) is never read into an account by itself', () => {
    const legacy: MoodEntry[] = [{ date: '2026-09-30', category: 'joyful', intensity: 5, note: 'whose?', savedAt: Date.now() }];
    localStorage.setItem(LEGACY, JSON.stringify(legacy));
    expect(loadMoodEntries(A)).toEqual([]);
    expect(loadMoodEntries(B)).toEqual([]);
    expect(loadMoodEntries(null)).toEqual([]);
    expect(pendingMoodUploads(loadMoodEntries(A), [])).toEqual([]);
    clearLegacyMoodCache();
    expect(localStorage.getItem(LEGACY)).toBeNull();
  });

  // p8 F33: the legacy cache is the only copy of every diary the live app
  // kept. It is offered to each account that opens the diary — never taken,
  // never deleted unseen.
  it('every account is offered the old days until it answers; "not mine" deletes nothing and is that account’s answer only', () => {
    const legacy = [
      { date: '2026-09-28', category: 'calm', intensity: 2, note: 'private', savedAt: 100 },
      { date: '2026-09-29', category: 'heavy', intensity: 4, savedAt: 200 },
    ];
    localStorage.setItem(LEGACY, JSON.stringify(legacy));
    expect(legacyMoodOffer(A).map((e) => e.date)).toEqual(['2026-09-28', '2026-09-29']);
    expect(legacyMoodOffer(null)).toEqual([]);
    declineLegacyMood(A);
    expect(legacyMoodOffer(A)).toEqual([]);
    expect(legacyMoodOffer(B)).toHaveLength(2);
    expect(localStorage.getItem(LEGACY)).not.toBeNull();
    expect(loadMoodEntries(A)).toEqual([]);
  });

  it('reads the old build’s rows as the diary’s entries: bad rows dropped, one per date, intensity clamped', () => {
    localStorage.setItem(LEGACY, JSON.stringify([
      { date: '2026-09-01', category: 'calm', intensity: 3, savedAt: 1 },
      { date: '2026-09-01', category: 'joyful', intensity: 9, savedAt: 2, note: 'later' },
      { date: '2026-09-02', category: 'elated', intensity: 3, savedAt: 3 },
      { date: 'yesterday', category: 'calm', intensity: 3, savedAt: 4 },
      { date: '2026-09-03', category: 'steady', intensity: 2 },
      null,
    ]));
    const rows = loadLegacyMoodEntries();
    expect(rows.map((e) => [e.date, e.category, e.intensity, e.note])).toEqual([
      ['2026-09-01', 'joyful', 5, 'later'],
      ['2026-09-03', 'steady', 2, undefined],
    ]);
    expect(rows[1].savedAt).toBeGreaterThan(0);
    // The page uploads what the account's record lacks or holds older.
    expect(pendingMoodUploads(rows, [{ date: '2026-09-03', category: 'calm', intensity: 1, savedAt: Date.now() }]).map((e) => e.date))
      .toEqual(['2026-09-01']);
  });

  it('writes go only to the writing account’s key', () => {
    replaceLocalMoodEntries(B, [{ date: '2026-10-02', category: 'steady', intensity: 2, savedAt: Date.now() }]);
    expect(localStorage.getItem(moodStorageKey(B))).not.toBeNull();
    expect(localStorage.getItem(moodStorageKey(A))).toBeNull();
    expect(localStorage.getItem(LEGACY)).toBeNull();
  });

  it('a day newer on the device than on the server is re-uploaded; an equal one is not', () => {
    const now = Date.now();
    const local: MoodEntry[] = [
      { date: '2026-10-01', category: 'calm', intensity: 3, savedAt: now },
      { date: '2026-10-02', category: 'calm', intensity: 3, savedAt: now },
    ];
    const remote: MoodEntry[] = [
      { date: '2026-10-01', category: 'calm', intensity: 3, savedAt: now - 10 * 60_000 },
      { date: '2026-10-02', category: 'calm', intensity: 3, savedAt: now },
    ];
    expect(pendingMoodUploads(local, remote).map((e) => e.date)).toEqual(['2026-10-01']);
  });
});
