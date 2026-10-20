import { journalEntries } from '../dal';
import type { JournalEntryRow } from '../dal/journalEntries';
import { getLocale, type SupportedLocale } from '../i18n/config';
import { localizeCards } from '../i18n/localizeCard';
import { ensureCartomancyCorpus, localizePlayingCards } from '../i18n/localizePlayingCard';
import { localizeSignName } from '../i18n/localizeNames';
import { PLAYING_CARDS_ALL } from '../data/cartomancy/deck';
import { ZODIAC_SIGNS, type ZodiacSign } from '../types/astrology';
import type { TarotCard } from '../types';
import type { PlayingCard } from '../types/cartomancy';

/*
 * The header search (SearchSheet): the tarot and playing-card meanings, the
 * zodiac signs and the member's own journal, matched in the language the
 * app is in — 바보, 愚者 and 愚人 all find The Fool — and in English, which
 * any member may type. Each result names what it is (a card id, a playing
 * card's slug, a sign, an entry); the sheet opens its page.
 *
 * The sheet used to search nothing: "results will appear here" under every
 * query, three made-up recent searches and quick links that did nothing
 * (p10 d3-ko-13). Nothing called this module; its card search read the deck
 * from the database once, in whatever language the app was in that day,
 * and labelled its results in English.
 */

interface Hit {
  /** Unique within its kind. */
  id: string;
  /** In the reader's language: the card's or sign's name, an entry's title (empty when it has none). */
  title: string;
  relevance: number;
}

export type CardResult = Hit & { type: 'card'; cardId: number; suit?: TarotCard['suit'] };
export type PlayingCardResult = Hit & { type: 'playing-card'; slug: string; suit: PlayingCard['suit'] };
export type SignResult = Hit & { type: 'sign'; sign: ZodiacSign };
export type JournalResult = Hit & { type: 'journal'; date: string; excerpt: string };
export type SearchResult = CardResult | PlayingCardResult | SignResult | JournalResult;

export interface SearchResults {
  cards: CardResult[];
  playingCards: PlayingCardResult[];
  signs: SignResult[];
  journal: JournalResult[];
}

/** The most of each kind the sheet lists, best first: a whole suit fits. */
const LIMIT = 14;

/**
 * A string as the search compares it: NFKC (a full-width "ＦＯＯＬ" is
 * "FOOL"), lower case, no spaces — "완드3" finds 완드 3, "thefool" The Fool.
 */
export function foldForSearch(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
}

/** A whole name 100, the start of one 80, part of one 60, part of a keyword 50; 0 is no match. */
function relevanceOf(q: string, names: string[], keywords: string[] = []): number {
  let best = 0;
  for (const name of names) {
    const n = foldForSearch(name);
    if (!n) continue;
    if (n === q) return 100;
    if (n.startsWith(q)) best = Math.max(best, 80);
    else if (n.includes(q)) best = Math.max(best, 60);
  }
  if (best === 0 && keywords.some((k) => foldForSearch(k).includes(q))) best = 50;
  return best;
}

/** Best first; equals keep their order (the deck's, the zodiac's, the journal's newest first). */
function byRelevance<T extends Hit>(hits: T[]): T[] {
  return [...hits].sort((a, b) => b.relevance - a.relevance);
}

/** "The Star" is also "Star". */
function englishNames(name: string): string[] {
  const bare = name.replace(/^the\s+/i, '');
  return bare === name ? [name] : [name, bare];
}

/*
 * Names a reader types that the translations do not use, matched and never
 * shown. The corpus names each card one way, but Chinese books call The
 * Fool 愚人 as often as 愚者, Japanese ones the Hierophant 法王, Korean
 * readers write the English names in Hangul as often as not (타워 for 탑),
 * American English spells Judgment so, Japanese horoscopes write the signs
 * in kana (うお座) and Korean ones call Sagittarius 사수자리 as often as
 * 궁수자리. The English ones apply in every language.
 */
const TAROT_ALIASES: Partial<Record<SupportedLocale, Record<number, string[]>>> = {
  en: { 20: ['Judgment'] },
  ja: { 5: ['法王'] },
  ko: {
    1: ['매지션'], 2: ['하이 프리스티스'], 3: ['엠프레스'], 4: ['엠퍼러'], 5: ['하이어로펀트', '하이로펀트'],
    6: ['러버즈', '러버스'], 7: ['채리엇'], 8: ['스트렝스'], 9: ['허밋'], 10: ['휠 오브 포춘'], 11: ['저스티스'],
    12: ['행드맨'], 13: ['데스'], 14: ['템퍼런스'], 15: ['데빌'], 16: ['타워'], 17: ['스타'], 18: ['문'],
    19: ['썬'], 20: ['저지먼트'], 21: ['월드'],
  },
  zh: { 0: ['愚人'], 1: ['魔法师'], 2: ['女教皇'], 3: ['皇后'], 9: ['隐者'], 12: ['吊人'], 16: ['高塔'] },
};

/** Other words for a suit, swapped into the names that carry it: 金貨のエース finds ペンタクルのエース, 红桃A finds 红心A. */
const SUIT_SYNONYMS: Partial<Record<SupportedLocale, ReadonlyArray<readonly [string, readonly string[]]>>> = {
  ja: [['ペンタクル', ['金貨', 'コイン']], ['ワンド', ['棒']], ['ソード', ['剣']], ['カップ', ['聖杯']]],
  ko: [['클로버', ['클럽']]],
  zh: [['星币', ['钱币', '金币']], ['红心', ['红桃']], ['梅花', ['草花']], ['方块', ['方片']]],
};

const SIGN_ALIASES: Partial<Record<SupportedLocale, Partial<Record<ZodiacSign, string[]>>>> = {
  ja: {
    Aries: ['おひつじ座'], Taurus: ['おうし座'], Gemini: ['ふたご座'], Cancer: ['かに座'],
    Leo: ['しし座'], Virgo: ['おとめ座'], Libra: ['てんびん座'], Scorpio: ['さそり座'],
    Sagittarius: ['いて座'], Capricorn: ['やぎ座'], Aquarius: ['みずがめ座'], Pisces: ['うお座'],
  },
  ko: { Sagittarius: ['사수자리'] },
};

/** A localized card name with each synonym of its suit swapped in. */
function suitSpellings(name: string, locale: SupportedLocale): string[] {
  const out: string[] = [];
  for (const [word, others] of SUIT_SYNONYMS[locale] ?? []) {
    if (name.includes(word)) for (const other of others) out.push(name.replace(word, other));
  }
  return out;
}

/**
 * The ways Chinese writes each pip rank. The tarot corpus numbers the pips
 * in hanzi (权杖三) and the playing cards in digits (红心4); readers type
 * either for both, and the ace as A as well (权杖A).
 */
const ZH_RANKS: readonly (readonly string[])[] = [
  ['一', '1', 'A'], ['二', '2'], ['三', '3'], ['四', '4'], ['五', '5'],
  ['六', '6'], ['七', '7'], ['八', '8'], ['九', '9'], ['十', '10'],
];

/**
 * A localized suit card's name with its rank written the reader's other
 * way: 权杖3 finds 权杖三 and 红心四 红心4; ワンド3 finds ワンドの3 and
 * ハート4 ハートの4, Japanese readers leaving out the の between suit and
 * rank. Korean needs none: 완드3 is 완드 3 once spaces fold.
 */
function rankSpellings(name: string, locale: SupportedLocale): string[] {
  if (locale === 'ja') {
    const bare = name.replace('の', '');
    return bare === name ? [] : [bare];
  }
  if (locale === 'zh') {
    for (const forms of ZH_RANKS) {
      const written = forms.find((form) => name.endsWith(form));
      if (written) return forms.filter((form) => form !== written).map((form) => name.slice(0, -written.length) + form);
    }
  }
  return [];
}

/** A suit card's localized name, each synonym of its suit, and each of those with the rank written the other way. */
function suitCardSpellings(name: string, locale: SupportedLocale): string[] {
  const suits = [name, ...suitSpellings(name, locale)];
  return [...suits, ...suits.flatMap((spelling) => rankSpellings(spelling, locale))];
}

/** The 78 tarot cards, by name (the reader's, English, the aliases) and the reader's keywords. */
export async function searchCards(query: string): Promise<CardResult[]> {
  const q = foldForSearch(query);
  if (!q) return [];
  const locale = getLocale();
  // The deck ships with the app, as the card pages read it; the database
  // copy was a round trip for the same names.
  const { fullDeck } = await import('../data/tarotDeck');
  const shown = localizeCards(fullDeck, locale);
  const hits: CardResult[] = [];
  fullDeck.forEach((en, i) => {
    const card = shown[i];
    const names = [
      // A major arcanum has no suit or rank to spell otherwise: 運命の輪 keeps its の.
      ...(en.suit ? suitCardSpellings(card.name, locale) : [card.name]),
      ...englishNames(en.name),
      ...(TAROT_ALIASES.en?.[en.id] ?? []),
      ...(locale === 'en' ? [] : TAROT_ALIASES[locale]?.[en.id] ?? []),
    ];
    const relevance = relevanceOf(q, names, card.keywords);
    if (relevance > 0) hits.push({ type: 'card', id: String(en.id), title: card.name, relevance, cardId: en.id, suit: en.suit });
  });
  return byRelevance(hits).slice(0, LIMIT);
}

/** The 54 playing cards. ja/ko/zh read the names from the cartomancy corpus, fetched here on the first search. */
export async function searchPlayingCards(query: string): Promise<PlayingCardResult[]> {
  const q = foldForSearch(query);
  if (!q) return [];
  await ensureCartomancyCorpus();
  const locale = getLocale();
  const shown = localizePlayingCards(PLAYING_CARDS_ALL, locale);
  const hits: PlayingCardResult[] = [];
  PLAYING_CARDS_ALL.forEach((en, i) => {
    const card = shown[i];
    const names = [...suitCardSpellings(card.name, locale), ...englishNames(en.name)];
    const relevance = relevanceOf(q, names, card.keywords);
    if (relevance > 0) hits.push({ type: 'playing-card', id: String(en.id), title: card.name, relevance, slug: en.slug, suit: en.suit });
  });
  return byRelevance(hits).slice(0, LIMIT);
}

/** The twelve signs. */
export function searchSigns(query: string): SignResult[] {
  const q = foldForSearch(query);
  if (!q) return [];
  const locale = getLocale();
  const hits: SignResult[] = [];
  for (const sign of ZODIAC_SIGNS) {
    const title = localizeSignName(sign, locale);
    const relevance = relevanceOf(q, [title, sign, ...(SIGN_ALIASES[locale]?.[sign] ?? [])]);
    if (relevance > 0) hits.push({ type: 'sign', id: sign, title, relevance, sign });
  }
  return byRelevance(hits);
}

/** How many of the member's newest entries the search reads. The journal's own search reads only the page it has loaded. */
const JOURNAL_SCAN = 100;

/** The member's newest entries, newest first, to search; null when they could not be read. */
export async function loadJournalForSearch(userId: string): Promise<JournalEntryRow[] | null> {
  try {
    const res = await journalEntries.listForUser(userId, { limit: JOURNAL_SCAN });
    return res.ok ? res.data : null;
  } catch {
    return null;
  }
}

/** An entry's opening words on one line, for its result. */
function excerptOf(content: string, max = 90): string {
  const line = content.replace(/\s+/g, ' ').trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

/** Entries whose title, text, prompt or tags hold the query; a title match first. */
export function searchJournalEntries(entries: JournalEntryRow[], query: string): JournalResult[] {
  const q = foldForSearch(query);
  if (!q) return [];
  const hits: JournalResult[] = [];
  for (const entry of entries) {
    const title = entry.title?.trim() ?? '';
    const content = entry.content ?? '';
    const relevance =
      title && foldForSearch(title).includes(q) ? 70
      : foldForSearch(content).includes(q) ? 60
      : entry.prompt && foldForSearch(entry.prompt).includes(q) ? 55
      : (entry.tags ?? []).some((tag) => foldForSearch(tag).includes(q)) ? 50
      : 0;
    if (relevance > 0) hits.push({ type: 'journal', id: entry.id, title, relevance, date: entry.date, excerpt: excerptOf(content) });
  }
  return byRelevance(hits).slice(0, LIMIT);
}

/**
 * Everything the header search finds for `query`, by kind. Playing cards
 * only while their section is on (flag `cartomancy`: their pages are gated
 * on it); the journal from the entries the caller loaded.
 */
export async function globalSearch(
  query: string,
  options: { playingCards?: boolean; journal?: JournalEntryRow[] | null } = {},
): Promise<SearchResults> {
  const [cards, playingCards] = await Promise.all([
    // A deck chunk that will not load (a release since the app opened)
    // leaves the other kinds to answer instead of failing the search.
    searchCards(query).catch((): CardResult[] => []),
    options.playingCards ? searchPlayingCards(query) : Promise.resolve([]),
  ]);
  return {
    cards,
    playingCards,
    signs: searchSigns(query),
    journal: options.journal ? searchJournalEntries(options.journal, query) : [],
  };
}

// ── Recent searches ────────────────────────────────────────────────────

const RECENT_PREFIX = 'arcana_recent_searches:';
/** How many recent searches a member keeps. */
export const RECENT_SEARCH_LIMIT = 6;

/** The device's list for one account. Exported for tests. */
export function recentSearchesKey(userId: string): string {
  return RECENT_PREFIX + userId;
}

/** What this member searched on this device, newest first. No account, or nothing stored: none. */
export function loadRecentSearches(userId: string | null | undefined): string[] {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw = window.localStorage.getItem(recentSearchesKey(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === 'string' && s.trim() !== '').slice(0, RECENT_SEARCH_LIMIT);
  } catch {
    return [];
  }
}

/**
 * Keeps `query` as this member's newest search (the same search again moves
 * up instead of repeating) and returns the list. A storage that refuses the
 * write (private mode, a full quota) keeps nothing, quietly.
 */
export function rememberSearch(userId: string | null | undefined, query: string): string[] {
  const q = query.trim().slice(0, 100);
  if (!userId || !q) return loadRecentSearches(userId);
  const next = [q, ...loadRecentSearches(userId).filter((s) => foldForSearch(s) !== foldForSearch(q))].slice(0, RECENT_SEARCH_LIMIT);
  try {
    window.localStorage.setItem(recentSearchesKey(userId), JSON.stringify(next));
  } catch {
    /* not kept */
  }
  return next;
}

export function clearRecentSearches(userId: string | null | undefined): void {
  if (!userId) return;
  try {
    window.localStorage.removeItem(recentSearchesKey(userId));
  } catch {
    /* nothing to clear */
  }
}
