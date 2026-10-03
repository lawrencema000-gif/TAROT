import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadMoodEntries,
  saveMoodEntry,
  replaceLocalMoodEntries,
  clearLegacyMoodCache,
  pendingMoodUploads,
  getTodayEntry,
  moodStorageKey,
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

  it('the legacy unscoped cache (writer unknowable) is never read, and sign-out deletes it', () => {
    const legacy: MoodEntry[] = [{ date: '2026-09-30', category: 'joyful', intensity: 5, note: 'whose?', savedAt: Date.now() }];
    localStorage.setItem(LEGACY, JSON.stringify(legacy));
    expect(loadMoodEntries(A)).toEqual([]);
    expect(loadMoodEntries(B)).toEqual([]);
    expect(loadMoodEntries(null)).toEqual([]);
    clearLegacyMoodCache();
    expect(localStorage.getItem(LEGACY)).toBeNull();
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
