import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import type { JournalEntryRow } from '../dal/journalEntries';

/*
 * p10 d3-ko-13: the header search never searched. Nothing called this
 * module, and its card search matched one language's names only, from a
 * database copy of the deck read once. The search now finds the tarot and
 * playing cards and the signs by the names the reader's language gives
 * them (바보, 愚者, 愚人 → The Fool) or the English ones, and the member's
 * journal; recent searches are the member's own, on this device.
 */

const listForUser = vi.fn();
vi.mock('../dal', () => ({ journalEntries: { listForUser: (...a: unknown[]) => listForUser(...a) } }));

import i18n from '../i18n/config';
import {
  foldForSearch,
  globalSearch,
  loadJournalForSearch,
  loadRecentSearches,
  rememberSearch,
  clearRecentSearches,
  recentSearchesKey,
  searchCards,
  searchPlayingCards,
  searchSigns,
  searchJournalEntries,
  RECENT_SEARCH_LIMIT,
} from './search';

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

const inLanguage = (lng: string) => i18n.changeLanguage(lng);

function entry(over: Partial<JournalEntryRow>): JournalEntryRow {
  return {
    id: 'e1',
    user_id: 'u1',
    title: null,
    content: '',
    mood: null,
    mood_tags: null,
    tags: null,
    prompt: null,
    date: '2026-10-07',
    linked_reading_id: null,
    is_locked: false,
    created_at: '2026-10-07T03:00:00Z',
    updated_at: '2026-10-07T03:00:00Z',
    ...over,
  };
}

afterAll(async () => {
  await inLanguage('en');
});

describe('tarot cards, in the reader’s language', () => {
  it.each([
    ['ko', '바보', '바보'],
    ['ja', '愚者', '愚者'],
    ['zh', '愚者', '愚者'],
    // The corpus says 愚者; Chinese books as often say 愚人.
    ['zh', '愚人', '愚者'],
    ['en', 'the fool', 'The Fool'],
  ])('%s: “%s” finds The Fool, named %s', async (lng, query, title) => {
    await inLanguage(lng);
    const [first] = await searchCards(query);
    expect(first).toMatchObject({ type: 'card', cardId: 0, title, relevance: 100 });
  });

  it('finds a card by its English name in any language, and names it in the reader’s', async () => {
    await inLanguage('ko');
    const [first] = await searchCards('fool');
    expect(first).toMatchObject({ cardId: 0, title: '바보' });
    const [tower] = await searchCards('Tower');
    expect(tower).toMatchObject({ cardId: 16, title: '탑' });
    // The English name in Hangul, as Korean readers often write it.
    expect((await searchCards('타워'))[0]).toMatchObject({ cardId: 16, title: '탑', relevance: 100 });
  });

  it('ignores width and spacing: “완드3” finds 완드 3, “ＴＨＥ　ＳＴＡＲ” The Star', async () => {
    await inLanguage('ko');
    expect((await searchCards('완드3'))[0]).toMatchObject({ cardId: 24, title: '완드 3' });
    await inLanguage('en');
    expect((await searchCards('ＴＨＥ　ＳＴＡＲ'))[0]).toMatchObject({ cardId: 17, title: 'The Star' });
  });

  it('lists a suit by its name, and finds Japanese suit synonyms', async () => {
    await inLanguage('ja');
    const wands = await searchCards('ワンド');
    expect(wands).toHaveLength(14);
    expect(wands.every((r) => r.suit === 'wands')).toBe(true);
    expect((await searchCards('金貨のエース'))[0]).toMatchObject({ title: 'ペンタクルのエース', suit: 'pentacles' });
  });

  it('matches the reader’s keywords below a name', async () => {
    await inLanguage('ja');
    const hits = await searchCards('新しい始まり');
    expect(hits.map((r) => r.cardId)).toContain(0);
    expect(hits.find((r) => r.cardId === 0)?.relevance).toBe(50);
  });

  it('finds nothing for nothing', async () => {
    await inLanguage('en');
    expect(await searchCards('   ')).toEqual([]);
    expect(await searchCards('qqqzzz')).toEqual([]);
  });
});

describe('playing cards and signs', () => {
  it('finds a playing card by its name in the reader’s language, with its slug', async () => {
    await inLanguage('ko');
    expect((await searchPlayingCards('하트 에이스'))[0]).toMatchObject({ type: 'playing-card', title: '하트 에이스', slug: 'ace-of-hearts', suit: 'hearts' });
    await inLanguage('zh');
    // 红心 in the corpus, 红桃 on the mainland's cards.
    expect((await searchPlayingCards('红桃A'))[0]).toMatchObject({ title: '红心A', slug: 'ace-of-hearts' });
    await inLanguage('en');
    expect((await searchPlayingCards('queen of spades'))[0]).toMatchObject({ title: 'Queen of Spades', slug: 'queen-of-spades' });
  });

  it('finds a sign by its name, its English name, or (Japanese) its kana', async () => {
    await inLanguage('ko');
    expect(searchSigns('양자리')[0]).toMatchObject({ type: 'sign', sign: 'Aries', title: '양자리', relevance: 100 });
    expect(searchSigns('pisces')[0]).toMatchObject({ sign: 'Pisces', title: '물고기자리' });
    await inLanguage('ja');
    expect(searchSigns('うお座')[0]).toMatchObject({ sign: 'Pisces', title: '魚座' });
    await inLanguage('zh');
    expect(searchSigns('双鱼')[0]).toMatchObject({ sign: 'Pisces', title: '双鱼座' });
  });

  it('leaves the playing cards out while their section is off', async () => {
    await inLanguage('en');
    const off = await globalSearch('ace', { playingCards: false });
    expect(off.playingCards).toEqual([]);
    expect(off.cards.length).toBeGreaterThan(0);
    const on = await globalSearch('ace', { playingCards: true });
    expect(on.playingCards.map((r) => r.slug)).toContain('ace-of-spades');
  });
});

describe('the member’s journal', () => {
  const entries = [
    entry({ id: 'e1', title: 'Promotion day', content: 'Spoke up in the meeting.', date: '2026-10-07' }),
    entry({ id: 'e2', content: 'Thinking about the promotion again, and about rest.', date: '2026-10-05' }),
    entry({ id: 'e3', content: 'Quiet day.', tags: ['gratitude'], date: '2026-10-01' }),
  ];

  it('finds entries by title, text and tag, a title first, with the entry’s day and opening words', () => {
    const hits = searchJournalEntries(entries, 'promotion');
    expect(hits.map((r) => r.id)).toEqual(['e1', 'e2']);
    expect(hits[0]).toMatchObject({ type: 'journal', title: 'Promotion day', date: '2026-10-07', excerpt: 'Spoke up in the meeting.' });
    expect(hits[1]).toMatchObject({ title: '', excerpt: 'Thinking about the promotion again, and about rest.' });
    expect(searchJournalEntries(entries, 'gratitude').map((r) => r.id)).toEqual(['e3']);
  });

  it('reads the member’s newest hundred entries, and says when it could not', async () => {
    listForUser.mockResolvedValueOnce({ ok: true, data: entries });
    expect(await loadJournalForSearch('u1')).toBe(entries);
    expect(listForUser).toHaveBeenCalledWith('u1', { limit: 100 });
    listForUser.mockResolvedValueOnce({ ok: false, error: 'offline' });
    expect(await loadJournalForSearch('u1')).toBeNull();
    listForUser.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await loadJournalForSearch('u1')).toBeNull();
  });

  it('joins the journal to the other results', async () => {
    await inLanguage('en');
    const found = await globalSearch('quiet', { journal: entries });
    expect(found.journal.map((r) => r.id)).toEqual(['e3']);
  });
});

describe('recent searches: this member’s, on this device', () => {
  const A = '00000000-0000-4000-8000-00000000000a';
  const B = '00000000-0000-4000-8000-00000000000b';

  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
  });

  it('starts empty: nothing is invented', () => {
    expect(loadRecentSearches(A)).toEqual([]);
    expect(loadRecentSearches(null)).toEqual([]);
  });

  it('keeps the newest first, once each, capped', () => {
    rememberSearch(A, '바보');
    rememberSearch(A, '  탑 ');
    expect(rememberSearch(A, '바보')).toEqual(['바보', '탑']);
    for (let i = 0; i < RECENT_SEARCH_LIMIT + 3; i++) rememberSearch(A, `q${i}`);
    const kept = loadRecentSearches(A);
    expect(kept).toHaveLength(RECENT_SEARCH_LIMIT);
    expect(kept[0]).toBe(`q${RECENT_SEARCH_LIMIT + 2}`);
  });

  it('is kept per account, and clears', () => {
    rememberSearch(A, 'the fool');
    expect(loadRecentSearches(B)).toEqual([]);
    rememberSearch(B, 'pisces');
    clearRecentSearches(A);
    expect(loadRecentSearches(A)).toEqual([]);
    expect(loadRecentSearches(B)).toEqual(['pisces']);
  });

  it('survives a corrupt or refused storage', () => {
    localStorage.setItem(recentSearchesKey(A), '{not json');
    expect(loadRecentSearches(A)).toEqual([]);
    localStorage.setItem(recentSearchesKey(A), JSON.stringify(['ok', 7, '', null]));
    expect(loadRecentSearches(A)).toEqual(['ok']);
    vi.stubGlobal('localStorage', { ...memoryStorage(), setItem: () => { throw new Error('quota'); } });
    expect(() => rememberSearch(A, 'x')).not.toThrow();
  });
});

describe('foldForSearch', () => {
  it('folds width, case and spaces', () => {
    expect(foldForSearch(' Ｔｈｅ  Fool ')).toBe('thefool');
    expect(foldForSearch('완드 3')).toBe('완드3');
  });
});
