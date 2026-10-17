import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadConversation,
  saveConversation,
  loadDailyCount,
  saveDailyCount,
  historyKey,
  conversationCovered,
  chargedAtAfterReply,
  mayBePaid,
  markPending,
  withoutPending,
  afterReply,
  historyToSend,
  MAX_SENT_MESSAGES,
  MAX_STORED_MESSAGES,
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
    expect(chargedAtAfterReply({ messages: msg, chargedAt: 5 }, { charged: true }, true, now)).toBe(now);
    expect(chargedAtAfterReply({ messages: msg, chargedAt: 5 }, { charged: false, conversationPaid: true }, true, now)).toBe(5);
    // An older server that says nothing: a message the conversation was not covered for was charged.
    expect(chargedAtAfterReply({ messages: msg }, {}, false, now)).toBe(now);
    expect(chargedAtAfterReply({ messages: msg, chargedAt: 5 }, {}, true, now)).toBe(5);
    // Nothing charged and nothing paid (the spend could not be reached): still not covered.
    expect(chargedAtAfterReply({ messages: msg }, { charged: false, conversationPaid: false }, false, now)).toBeUndefined();
  });
});

describe('p9 R09 — a reply lost after the charge: the free retry is covered, and is not held at the gate', () => {
  const msg = [{ role: 'user' as const, content: 'x', timestamp: 0 }];
  const now = Date.UTC(2026, 9, 17, 12);
  const MIN = 60_000;

  it('the retry that reports the conversation already paid dates the 24 hours from the lost send', () => {
    const sent = now - 2 * MIN;
    const at = chargedAtAfterReply({ messages: [], pendingSince: sent }, { charged: false, conversationPaid: true }, false, now);
    expect(at).toBe(sent);
    // …and the conversation it produces is covered: no price, no gate on the next message.
    const next = afterReply({ conversationId: A, messages: [], pendingSince: sent }, msg, { charged: false, conversationPaid: true }, false, now);
    expect(next.chargedAt).toBe(sent);
    expect(next.pendingSince).toBeUndefined();
    expect(conversationCovered({ ...next, messages: msg }, now)).toBe(true);
  });

  it('an earlier charge still inside the server’s 24 hours is the one that counts (never moved later)', () => {
    // Seen 23 h 57 min ago: the page reads it as lapsed (5-minute margin) while the server's session lives on.
    const old = now - CONVERSATION_COVER_MS + 3 * MIN;
    const at = chargedAtAfterReply({ messages: msg, chargedAt: old, pendingSince: now - MIN }, { charged: false, conversationPaid: true }, false, now);
    expect(at).toBe(old);
    expect(conversationCovered({ messages: msg, chargedAt: at }, now)).toBe(false);
  });

  it('not knowing when it was paid, nothing is assumed (priced as before)', () => {
    expect(chargedAtAfterReply({ messages: msg }, { charged: false, conversationPaid: true }, false, now)).toBeUndefined();
    // A mark older than the 24 hours cannot be the live charge.
    expect(chargedAtAfterReply({ messages: msg, pendingSince: now - 25 * HOUR }, { charged: false, conversationPaid: true }, false, now)).toBeUndefined();
  });

  it('a send is marked once (the first since the last reply), the mark can pay for 24 hours, and a balance refusal clears it', () => {
    const c = { conversationId: A, messages: msg };
    const marked = markPending(c, now);
    expect(marked.pendingSince).toBe(now);
    expect(markPending(marked, now + 5 * MIN).pendingSince).toBe(now);
    expect(mayBePaid(marked, now + HOUR)).toBe(true);
    expect(mayBePaid(marked, now + 24 * HOUR)).toBe(false);
    expect(markPending(marked, now + 25 * HOUR).pendingSince).toBe(now + 25 * HOUR);
    expect(mayBePaid(c, now)).toBe(false);
    expect(withoutPending({ ...marked, chargedAt: 7 })).toEqual({ conversationId: A, messages: msg, chargedAt: 7 });
  });

  it('the mark survives a reload, and a Tarot session whose opener may be paid is kept (it used to be dropped)', () => {
    const t0 = Date.now();
    saveConversation(A, 'sage', { conversationId: B, messages: msg, pendingSince: t0 - MIN });
    expect(loadConversation(A, 'sage').pendingSince).toBe(t0 - MIN);
    saveTarotSession(A, { cardId: 17, reversed: false, conversation: { conversationId: B, messages: [], pendingSince: t0 - MIN } });
    const s = loadTarotSession(A, t0);
    expect(s?.cardId).toBe(17);
    expect(s?.conversation.pendingSince).toBe(t0 - MIN);
    expect(loadTarotSession(A, t0 + 25 * HOUR)).toBeNull();
  });
});

describe('p9 R23 — every request carries a bounded window of the thread', () => {
  const thread = (n: number) => Array.from({ length: n }, (_, i) => ({ role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant', content: `m${i}`, timestamp: i }));

  it('a thread at the stored cap plus ten exchanges and a new message (101) is sent as its last 40, newest last', () => {
    const sent = historyToSend(thread(101));
    expect(sent).toHaveLength(MAX_SENT_MESSAGES);
    expect(MAX_SENT_MESSAGES).toBeLessThanOrEqual(100);
    expect(sent[sent.length - 1]).toEqual({ role: 'user', content: 'm100' });
    expect(historyToSend(thread(3))).toHaveLength(3);
  });

  it('each message stays within the function’s 4,000 characters, and the thread in memory is held to the stored cap', () => {
    const long = [{ role: 'assistant' as const, content: 'x'.repeat(5000), timestamp: 1 }, { role: 'user' as const, content: 'q', timestamp: 2 }];
    expect(historyToSend(long)[0].content).toHaveLength(4000);
    const next = afterReply({ conversationId: A, messages: [], chargedAt: 1 }, thread(MAX_STORED_MESSAGES + 3), { charged: false, conversationPaid: true }, true);
    expect(next.messages).toHaveLength(MAX_STORED_MESSAGES);
    expect(next.messages[0].content).toBe('m3');
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
