import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadConversation,
  saveConversation,
  loadDailyCount,
  saveDailyCount,
  historyKey,
  conversationCovered,
  chargedAtAfterReply,
  CONVERSATION_COVER_MS,
  legacyCompanionOffer,
  declineLegacyCompanion,
  claimLegacyCompanion,
  clearLegacyCompanionCounters,
  loadTarotSession,
  saveTarotSession,
  clearTarotSession,
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
const HOUR = 60 * 60_000;

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  Object.defineProperty(window, 'localStorage', { value: globalThis.localStorage, configurable: true });
});

describe('companion history is per account, with a stable conversation id', () => {
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

  it('the time the conversation was charged is kept with it', () => {
    const c = loadConversation(A, 'sage');
    saveConversation(A, 'sage', { ...c, messages: [{ role: 'user', content: 'hi', timestamp: 1 }], chargedAt: 1234 });
    expect(loadConversation(A, 'sage').chargedAt).toBe(1234);
  });
});

describe('p8 F40 — a conversation is covered for 24 hours from its charge, then the next message is charged again', () => {
  const msg = [{ role: 'user' as const, content: 'x', timestamp: 0 }];
  const now = Date.UTC(2026, 9, 17, 12);

  it('covered inside the 24 hours, not after, and never without a charge seen', () => {
    expect(conversationCovered({ messages: msg, chargedAt: now - 1 * HOUR }, now)).toBe(true);
    expect(conversationCovered({ messages: msg, chargedAt: now - 23 * HOUR }, now)).toBe(true);
    // The window reads as closing a few minutes early: an early notice costs nothing.
    expect(conversationCovered({ messages: msg, chargedAt: now - CONVERSATION_COVER_MS + 60_000 }, now)).toBe(false);
    expect(conversationCovered({ messages: msg, chargedAt: now - 25 * HOUR }, now)).toBe(false);
    expect(conversationCovered({ messages: msg }, now)).toBe(false);
    expect(conversationCovered({ messages: [], chargedAt: now }, now)).toBe(false);
  });

  it('a reply that reports a charge starts the 24 hours; a free one keeps the charge it rode on', () => {
    expect(chargedAtAfterReply({ messages: msg, chargedAt: 5 }, true, true, now)).toBe(now);
    expect(chargedAtAfterReply({ messages: msg, chargedAt: 5 }, false, true, now)).toBe(5);
    // An older server that says nothing: a message the conversation was not covered for was charged.
    expect(chargedAtAfterReply({ messages: msg }, undefined, false, now)).toBe(now);
    expect(chargedAtAfterReply({ messages: msg, chargedAt: 5 }, undefined, true, now)).toBe(5);
  });
});

describe('p8 F33 — the old device-global conversations are offered, never taken, never deleted unseen', () => {
  const legacy = (content: string) => JSON.stringify([
    { role: 'user', content, timestamp: 1 },
    { role: 'assistant', content: `reply to ${content}`, timestamp: 2 },
  ]);

  it('they are never read into an account by themselves', () => {
    localStorage.setItem('arcana_companion_v1_sage', legacy('whose?'));
    expect(loadConversation(A, 'sage').messages).toEqual([]);
    expect(localStorage.getItem('arcana_companion_v1_sage')).not.toBeNull();
  });

  it('every account is asked until it answers; "not mine" is that account’s answer only, and deletes nothing', () => {
    localStorage.setItem('arcana_companion_v1_sage', legacy('s'));
    localStorage.setItem('arcana_companion_v1_oracle', legacy('o'));
    localStorage.setItem('arcana_companion_v1_mystic', '"not an array"');
    expect(legacyCompanionOffer(A)).toEqual(['sage', 'oracle']);
    expect(legacyCompanionOffer(null)).toEqual([]);
    declineLegacyCompanion(A);
    expect(legacyCompanionOffer(A)).toEqual([]);
    expect(legacyCompanionOffer(B)).toEqual(['sage', 'oracle']);
    expect(localStorage.getItem('arcana_companion_v1_sage')).not.toBeNull();
  });

  it('claimed, they go in front of the account’s conversation (its id and charge kept), and the device copy goes', () => {
    localStorage.setItem('arcana_companion_v1_sage', legacy('old question'));
    localStorage.setItem('arcana_companion_daily_2026-10-01', '4');
    const current = loadConversation(A, 'sage');
    saveConversation(A, 'sage', { ...current, messages: [{ role: 'user', content: 'new question', timestamp: 9 }], chargedAt: 77 });
    expect(claimLegacyCompanion(A)).toEqual(['sage']);
    const after = loadConversation(A, 'sage');
    expect(after.messages.map((m) => m.content)).toEqual(['old question', 'reply to old question', 'new question']);
    expect(after.conversationId).toBe(current.conversationId);
    expect(after.chargedAt).toBe(77);
    expect(localStorage.getItem('arcana_companion_v1_sage')).toBeNull();
    expect(localStorage.getItem('arcana_companion_daily_2026-10-01')).toBeNull();
    // B got nothing; and nothing is offered any more.
    expect(loadConversation(B, 'sage').messages).toEqual([]);
    expect(legacyCompanionOffer(B)).toEqual([]);
  });

  it('a claimed conversation with no charge seen shows its price on the next message', () => {
    localStorage.setItem('arcana_companion_v1_priestess', legacy('p'));
    claimLegacyCompanion(A);
    const c = loadConversation(A, 'priestess');
    expect(c.messages).toHaveLength(2);
    expect(c.chargedAt).toBeUndefined();
    expect(conversationCovered(c)).toBe(false);
  });

  it('a whole old conversation (40 messages) fits beside a current one: nothing is trimmed', () => {
    const forty = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}`, timestamp: i }));
    localStorage.setItem('arcana_companion_v1_sage', JSON.stringify(forty));
    const current = loadConversation(A, 'sage');
    const mine = Array.from({ length: 30 }, (_, i) => ({ role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant', content: `n${i}`, timestamp: 100 + i }));
    saveConversation(A, 'sage', { ...current, messages: mine });
    claimLegacyCompanion(A);
    const after = loadConversation(A, 'sage').messages;
    expect(after).toHaveLength(70);
    expect(after[0].content).toBe('m0');
    expect(after[69].content).toBe('n29');
  });

  it('claiming twice (a delete that did not land) does not double the messages', () => {
    const value = legacy('once');
    localStorage.setItem('arcana_companion_v1_sage', value);
    claimLegacyCompanion(A);
    localStorage.setItem('arcana_companion_v1_sage', value);
    claimLegacyCompanion(A);
    expect(loadConversation(A, 'sage').messages.map((m) => m.content)).toEqual(['once', 'reply to once']);
  });

  it('sign-out’s clean-up drops only the old content-free counters, never a conversation', () => {
    localStorage.setItem('arcana_companion_v1_oracle', legacy('keep me'));
    localStorage.setItem('arcana_companion_daily_2026-10-03', '9');
    clearLegacyCompanionCounters();
    expect(localStorage.getItem('arcana_companion_daily_2026-10-03')).toBeNull();
    expect(localStorage.getItem('arcana_companion_v1_oracle')).not.toBeNull();
    expect(historyKey(A, 'sage')).toContain(A);
  });
});

describe('p8 F02/F10 — the Tarot companion keeps a paid conversation while its charge covers it', () => {
  const convo = (chargedAt?: number) => ({
    conversationId: '11111111-1111-4111-8111-111111111111',
    messages: [
      { role: 'user' as const, content: 'I drew the Star', timestamp: 1 },
      { role: 'assistant' as const, content: 'Hope.', timestamp: 2 },
    ],
    ...(chargedAt === undefined ? {} : { chargedAt }),
  });

  it('comes back with the same card and conversation id inside the 24 hours', () => {
    const now = Date.now();
    saveTarotSession(A, { cardId: 17, reversed: true, conversation: convo(now - HOUR) });
    const s = loadTarotSession(A, now);
    expect(s?.cardId).toBe(17);
    expect(s?.reversed).toBe(true);
    expect(s?.conversation.conversationId).toBe('11111111-1111-4111-8111-111111111111');
    expect(loadTarotSession(B, now)).toBeNull();
  });

  it('is dropped once the charge no longer covers it, or when no charge was seen', () => {
    const now = Date.now();
    saveTarotSession(A, { cardId: 17, reversed: false, conversation: convo(now - 25 * HOUR) });
    expect(loadTarotSession(A, now)).toBeNull();
    saveTarotSession(A, { cardId: 3, reversed: false, conversation: convo() });
    expect(loadTarotSession(A, now)).toBeNull();
    saveTarotSession(A, { cardId: 3, reversed: false, conversation: convo(now) });
    clearTarotSession(A);
    expect(loadTarotSession(A, now)).toBeNull();
  });
});
