import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadConversation,
  saveConversation,
  loadDailyCount,
  saveDailyCount,
  clearLegacyCompanionCache,
  historyKey,
} from './companionHistory';

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

describe('companion history is per account, with a stable conversation id', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    Object.defineProperty(window, 'localStorage', { value: globalThis.localStorage, configurable: true });
  });

  it('B never sees A’s conversation or message count', () => {
    const convo = loadConversation(A, 'sage');
    saveConversation(A, 'sage', { ...convo, messages: [{ role: 'user', content: 'private to A', timestamp: 1 }] });
    saveDailyCount(A, '2026-10-03', 7);
    expect(loadConversation(B, 'sage').messages).toEqual([]);
    expect(loadDailyCount(B, '2026-10-03')).toBe(0);
    expect(loadConversation(A, 'sage').messages[0].content).toBe('private to A');
    expect(loadDailyCount(A, '2026-10-03')).toBe(7);
    expect(loadDailyCount(A, '2026-10-04')).toBe(0);
  });

  it('the conversation id survives a reload until a new conversation starts', () => {
    const first = loadConversation(A, 'oracle');
    saveConversation(A, 'oracle', first);
    expect(loadConversation(A, 'oracle').conversationId).toBe(first.conversationId);
    expect(first.conversationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(loadConversation(A, 'mystic').conversationId).not.toBe(first.conversationId);
  });

  it('legacy device-global keys are never read and are cleared on sign-out', () => {
    localStorage.setItem('arcana_companion_v1_sage', JSON.stringify([{ role: 'user', content: 'whose?', timestamp: 1 }]));
    localStorage.setItem('arcana_companion_daily_2026-10-03', '9');
    expect(loadConversation(A, 'sage').messages).toEqual([]);
    clearLegacyCompanionCache();
    expect(localStorage.getItem('arcana_companion_v1_sage')).toBeNull();
    expect(localStorage.getItem('arcana_companion_daily_2026-10-03')).toBeNull();
    expect(historyKey(A, 'sage')).toContain(A);
  });
});
