import type { CartoSpread, PlayingCard } from '../../types/cartomancy';
import {
  BLACK_JOKER_ID,
  getCartoSpread,
  isWishVerdict,
  isYesNoVerdict,
  playingDeckFor,
  PLAYING_DECK,
  RED_JOKER_ID,
  WISH_CARD_ID,
  findCombinations,
  wishVerdict,
  yesNoVerdict,
  type CombinationHit,
  type WishOutcome,
  type YesNoOutcome,
} from '../../data/cartomancy';
import { spreadTypeToFeature, type PremiumFeature } from '../../services/premium';
import { cartoLessonsKey } from '../../services/offline';
import { drawSeededCards } from '../../utils/cardDraw';
import { localDateStr } from '../../utils/localDate';

/**
 * The cartomancy reading flow, as data and pure functions.
 *
 * Everything CartomancySection decides that is not React lives here so the
 * golden tests (src/test/golden/cartomancy.flow.test.ts) can hold it: how
 * the deck is composed from the settings, when a card may be reversed,
 * what a position is called, which premium feature a spread sits behind,
 * what the verdict pill says, which achievement events a finished table
 * fires, and the per-viewer settings and lesson ticks in localStorage.
 */

// ---------------------------------------------------------------------------
// Settings (per viewer; localStorage is a convenience, not a record)
// ---------------------------------------------------------------------------

export interface CartoSettings {
  /** Shuffle the two Jokers in. Off by default: the tradition mostly omits them. */
  jokers: boolean;
  /** Read reversals. Off by default: pip cards are symmetric and most traditions do not. */
  reversals: boolean;
  /** Slug of the card that stands for the reader, or null. It is set aside, never drawn. */
  significator: string | null;
}

export const CARTO_SETTINGS_KEY = 'arcana_carto_settings';

export const DEFAULT_CARTO_SETTINGS: CartoSettings = { jokers: false, reversals: false, significator: null };

/** The subset of Storage these helpers use; the browser's localStorage by default, a stub in tests. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStore(): KeyValueStore | null {
  try {
    const store = typeof window !== 'undefined' ? window.localStorage : undefined;
    return store && typeof store.getItem === 'function' && typeof store.setItem === 'function' && typeof store.removeItem === 'function'
      ? store
      : null;
  } catch {
    return null;
  }
}

export function loadCartoSettings(store: KeyValueStore | null = browserStore()): CartoSettings {
  try {
    const raw = store ? store.getItem(CARTO_SETTINGS_KEY) : null;
    if (!raw) return DEFAULT_CARTO_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<CartoSettings>;
    return {
      jokers: parsed.jokers === true,
      reversals: parsed.reversals === true,
      significator: typeof parsed.significator === 'string' ? parsed.significator : null,
    };
  } catch {
    return DEFAULT_CARTO_SETTINGS;
  }
}

export function saveCartoSettings(settings: CartoSettings, store: KeyValueStore | null = browserStore()): void {
  try {
    store?.setItem(CARTO_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // private mode: the setting lives for the session only
  }
}

// ---------------------------------------------------------------------------
// The deck on the table
// ---------------------------------------------------------------------------

/**
 * The ids a reading shuffles: 52, or 54 with the Jokers, less the
 * significator (a card set aside to stand for the reader is not in play).
 */
export function cartoDeckIds(settings: Pick<CartoSettings, 'jokers' | 'significator'>): number[] {
  const deck = playingDeckFor({ jokers: settings.jokers });
  return deck.filter((card) => card.slug !== settings.significator).map((card) => card.id);
}

/** Fisher–Yates, the same shuffle TarotSection uses. */
export function shuffleIds(ids: number[], rng: () => number = Math.random): number[] {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** The chance a dealt card lands reversed, when reversals are on (TarotSection.tsx:506). */
export const REVERSED_CHANCE = 0.35;

export interface DealtCard {
  card: PlayingCard;
  reversed: boolean;
  revealed: boolean;
}

/**
 * Deal the picked cards face down. A card can only be reversed when the
 * setting is on; with it off every card is upright whatever the dice say.
 */
export function dealCards(cards: PlayingCard[], reversals: boolean, rng: () => number = Math.random): DealtCard[] {
  return cards.map((card) => ({
    card,
    reversed: reversals && rng() < REVERSED_CHANCE,
    revealed: false,
  }));
}

// ---------------------------------------------------------------------------
// Spreads
// ---------------------------------------------------------------------------

export const DEFAULT_CARTO_SPREAD = 'carto-single';

/** The name of position `index` in `spread`, or a numbered fallback. */
export function cartoPositionLabel(spread: CartoSpread | null, index: number, fallback: (n: number) => string): string {
  const position = spread?.positions[index];
  return position?.name ?? fallback(index + 1);
}

/**
 * What position `index` of a table of `dealt` cards is called — one rule for
 * the live table, a saved reading and a shared link. The spread's own name
 * (pass the localized spread); but a table dealt with a different number of
 * cards than the spread names (the five-card Yes or No of a three-position
 * spread) is numbered card by card ("Card 4"): three named positions and
 * then two numbered ones read as a spread the reader never laid, and the
 * names of the three-card positions say things ("if the first two disagree,
 * decides the lean") that are not true of five. A spread the data no longer
 * has is "Position n". Never the label a saved row stored, which is frozen
 * in the language it was saved in.
 */
export function cartoTableLabel(
  spread: CartoSpread | null,
  dealt: number,
  index: number,
  numbered: (n: number) => string,
  generic: (n: number) => string,
): string {
  if (spread && spread.cardCount !== dealt) return numbered(index + 1);
  return cartoPositionLabel(spread, index, generic);
}

/**
 * The premium feature a spread sits behind, or null when it is free.
 * `spreadTypeToFeature` is the product's table (services/premium.ts) and
 * lists the nine carto-* slugs; a spread added to the data before it is
 * added there still lands behind `deep_interpretations` when it is not free
 * (the tier of the relationship, career and shadow spreads), never open.
 */
export function cartoSpreadFeature(spread: CartoSpread): PremiumFeature | null {
  const known = spreadTypeToFeature(spread.slug);
  if (known) return known;
  return spread.free ? null : 'deep_interpretations';
}

// ---------------------------------------------------------------------------
// Verdicts
// ---------------------------------------------------------------------------

export type CartoVerdict =
  | { kind: 'yes-no'; outcome: YesNoOutcome }
  | { kind: 'wish'; outcome: WishOutcome };

/** The rule-based verdict for a Wish or Yes or No table; null for any other spread. */
export function cartoVerdict(spread: CartoSpread, cards: PlayingCard[]): CartoVerdict | null {
  if (cards.length === 0 || !spread.verdict) return null;
  if (isYesNoVerdict(spread.verdict)) return { kind: 'yes-no', outcome: yesNoVerdict(cards, spread.verdict) };
  if (isWishVerdict(spread.verdict)) return { kind: 'wish', outcome: wishVerdict(cards, spread.verdict, spread.layout) };
  return null;
}

/** Whether a verdict leans toward a yes (teal), a no (coral) or sits between (gold). */
export function verdictTone(verdict: CartoVerdict): 'yes' | 'no' | 'between' {
  if (verdict.kind === 'yes-no') {
    const r = verdict.outcome.result;
    if (r === 'yes' || r === 'likely-yes') return 'yes';
    if (r === 'no' || r === 'likely-no') return 'no';
    return 'between';
  }
  const r = verdict.outcome.result;
  if (r === 'favored') return 'yes';
  if (r === 'not-now') return 'no';
  return 'between';
}

/**
 * The verdict as one English line for the AI prompt, so the model explains
 * the table's own answer rather than contradicting it:
 * "Leaning yes (2 of 3 red)" / "Favored, with a delay".
 */
export function verdictLine(verdict: CartoVerdict | null): string | undefined {
  if (!verdict) return undefined;
  if (verdict.kind === 'yes-no') {
    const o = verdict.outcome;
    const parts = [`${o.label} (${o.reds} of ${o.total} red)`];
    if (o.qualifier) parts.push('depends on a person or on time');
    return parts.join('; ');
  }
  return verdict.outcome.label;
}

/** Everything the tables say about the cards on this spread. */
export function cartoCombinations(spread: CartoSpread, cards: PlayingCard[]): CombinationHit[] {
  return findCombinations(cards, spread.layout, { suitMajorityMin: spread.suitMajorityMin });
}

/**
 * The hits in the order the AI request sends them (CartomancySection →
 * combinationHitsToLines, which keeps six). The reader's list ends with the
 * suit and colour majorities, after every same-rank set, neighbour rule and
 * pairing; on any table with six other findings — every Romany, most Wish
 * and Nine-Card Square tables — the model never heard "8 of 21 are Spades",
 * the season's subject the Romany's method has the reader name first, nor
 * "5 of 9 are red". The table-wide findings (two at most) go first; the
 * rest keep the reader's order. The reader's own list is not reordered.
 */
export function cartoCombinationsForAI(hits: CombinationHit[]): CombinationHit[] {
  return [...hits.filter((hit) => hit.kind === 'majority'), ...hits.filter((hit) => hit.kind !== 'majority')];
}

export interface CombinationLine {
  key: string;
  label: string;
  meaning: string;
}

/**
 * The combination list as the result prints it: one line per finding, with
 * a neighbour rule that fires for one card against several others (the Ace
 * of Spades touching three cards) folded into a single line that names the
 * others once, instead of the same meaning three times. `localize` gives a
 * hit's label and meaning in the active locale; `nameOf` a card's name in
 * it. An English label that ends with the partner's name keeps its phrase
 * ("Ace of Spades touching the Eight of Spades, the Seven of Diamonds and
 * the Two of Diamonds"); a translated label (the names joined by " · ")
 * gains the other names the same way.
 */
export function combinationLines(
  hits: CombinationHit[],
  localize: (hit: CombinationHit) => { label: string; meaning: string },
  nameOf: (id: number) => string,
  locale = 'en',
): CombinationLine[] {
  const lines: CombinationLine[] = [];
  const groups = new Map<string, { line: CombinationLine; partners: number[]; first: { label: string } }>();
  for (const hit of hits) {
    const own = localize(hit);
    const key = `${hit.id}:${hit.cardIds.join('-')}`;
    if (hit.kind !== 'neighbor' || hit.cardIds.length !== 2) {
      lines.push({ key, ...own });
      continue;
    }
    const groupKey = `${hit.id}:${hit.cardIds[0]}`;
    const group = groups.get(groupKey);
    if (!group) {
      const line = { key, ...own };
      groups.set(groupKey, { line, partners: [hit.cardIds[1]], first: { label: own.label } });
      lines.push(line);
      continue;
    }
    group.partners.push(hit.cardIds[1]);
  }
  for (const { line, partners, first } of groups.values()) {
    if (partners.length < 2) continue;
    line.key = `${line.key}+${partners.length}`;
    const names = partners.map(nameOf);
    if (locale === 'en' && first.label.endsWith(names[0])) {
      const head = first.label.slice(0, first.label.length - names[0].length);
      const rest = names.slice(1).map((n) => `the ${n}`);
      line.label = `${head}${[names[0], ...rest.slice(0, -1)].join(', ')} and ${rest[rest.length - 1]}`;
    } else {
      line.label = `${first.label} · ${names.slice(1).join(' · ')}`;
    }
  }
  // One rule firing for several anchors ("the difficulty is softened by
  // care" for two Hearts beside a Spade) reads once, its pairings joined.
  const neighbourLines = new Set([...groups.values()].map((g) => g.line));
  const byMeaning = new Map<string, CombinationLine>();
  const merged: CombinationLine[] = [];
  for (const line of lines) {
    if (!neighbourLines.has(line)) {
      merged.push(line);
      continue;
    }
    const same = byMeaning.get(line.meaning);
    if (same) {
      same.label = `${same.label}; ${line.label}`;
      same.key = `${same.key}|${line.key}`;
      continue;
    }
    byMeaning.set(line.meaning, line);
    merged.push(line);
  }
  return merged;
}

// ---------------------------------------------------------------------------
// The summary paragraph
// ---------------------------------------------------------------------------

const MARKDOWN_MARKS = /[*_#`]+/g;

/** The first paragraph of an AI reading, stripped of markdown marks. */
export function firstParagraph(text: string): string {
  const para = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(MARKDOWN_MARKS, '').trim())
    .find((p) => p.length > 0);
  return para ?? '';
}

/** Closing quotes and brackets stay with the sentence they close: " ' ” ’ ) ] 」 』 】 ） 〉 》 */
const SENTENCE_CLOSERS = '["\'\u201D\u2019)\\]\u300D\u300F\u3011\uFF09\u3009\u300B]*';
/** Full-width scripts: CJK punctuation and ideographs, kana, Hangul, full-width forms. */
const WIDE_CHARS = '\u3000-\u9FFF\uAC00-\uD7A3\uF900-\uFAFF\uFF00-\uFFEF';

/**
 * Where a sentence ends, in every locale the app speaks.
 *
 * - A Latin stop (. ! ? or an ellipsis) ends one only before whitespace,
 *   the end of the text, or a full-width character, so "3.5" and "e.g.x"
 *   never split, and Korean (which spaces after its full stop) splits as
 *   English does.
 * - A CJK stop (。 ． ｡ ！ ？) ends one wherever it stands: Japanese and
 *   Chinese set no space after it, and the next sentence may open with a
 *   digit or a Latin letter.
 */
const SENTENCE_END = new RegExp(
  `[.!?\u2026]+${SENTENCE_CLOSERS}(?=\\s|$|[${WIDE_CHARS}])|[\u3002\uFF0E\uFF61\uFF01\uFF1F]+${SENTENCE_CLOSERS}`,
  'g',
);

/** The text as sentences, each with its own punctuation. */
export function sentencesOf(text: string): string[] {
  const src = text.trim();
  const out: string[] = [];
  const re = new RegExp(SENTENCE_END.source, 'g');
  let start = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const end = m.index + m[0].length;
    const sentence = src.slice(start, end).trim();
    if (sentence) out.push(sentence);
    start = end;
  }
  const tail = src.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

/**
 * The first `count` sentences of a text, cut from the source so its own
 * spacing survives: none between Japanese or Chinese sentences, one space
 * after an English or Korean full stop. The one sentence splitter for
 * every playing-card surface (the result, the summary, a shared reading).
 */
export function firstSentences(text: string, count: number): string {
  const src = text.trim();
  if (count <= 0) return '';
  const re = new RegExp(SENTENCE_END.source, 'g');
  let seen = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    seen += 1;
    if (seen === count) return src.slice(0, m.index + m[0].length).trim();
  }
  return src;
}

export interface AiSection {
  /** The block's own heading, numbering and markdown removed ("The situation — Seven of Clubs"). */
  heading?: string;
  /** The block under the heading, markdown marks removed (a list keeps its "- " markers here). */
  body: string;
  /**
   * The body as list items, when every line of it is one ("- Build a
   * one-pager." → "Build a one-pager."): markers, numbers and markdown
   * removed. Absent for prose.
   */
  items?: string[];
}

const HEADING_NUMBER = /^\s*(?:#{1,6}\s*)?(?:\d{1,2}\s*[.)．）]\s*)?/;
/**
 * A list item's marker: "- ", "* ", a bullet (• ‧ ∙ ◦ the small square,
 * the katakana middle dot ・), an en or em dash, or a number ("1. ", "2) ",
 * full-width "３．"). The marks are escaped: the tokens gate reads a
 * literal square as an emoji icon.
 */
const LIST_MARKER = /^\s*(?:[-*+]\s+|[\u2022\u2027\u2219\u25E6\u25AA\u30FB\u2013\u2014]\s*|\d{1,2}\s*[.)\uFF0E\uFF09\u3001]\s*)/;

/**
 * A line the model wrote as a heading: short, unpunctuated, alone on its
 * line. Ending in a stop of any script (. ! ? ; , and 。！？、；，) makes it
 * a sentence; a marker makes it a list item. A trailing colon is dropped.
 */
function headingOf(line: string): string | null {
  const bare = line.replace(MARKDOWN_MARKS, '').trim();
  if (!bare || bare.length > 64) return null;
  if (/[.!?;,。！？、；，]$/.test(bare) || /^[-•・]/.test(bare)) return null;
  const cleaned = bare.replace(HEADING_NUMBER, '').replace(/[:：]$/, '').trim();
  return cleaned || null;
}

/** The block's lines as list items when every one is an item; null for prose. */
function listItemsOf(lines: string[]): string[] | null {
  const rows = lines.map((l) => l.trim()).filter(Boolean);
  if (rows.length === 0 || !rows.every((l) => LIST_MARKER.test(l))) return null;
  const items = rows.map((l) => l.replace(LIST_MARKER, '').replace(MARKDOWN_MARKS, '').trim()).filter(Boolean);
  return items.length > 0 ? items : null;
}

/**
 * An AI reading as blocks: the generators write "1) Overview" then the
 * paragraph, "2) The situation — Seven of Clubs" then its paragraph,
 * "3 Practical Actions" then bullets. Each blank-line block whose first line
 * reads as a heading (and has a body under it) becomes {heading, body}; a
 * heading standing alone in its block heads the block after it (as the
 * tarot summary reads it, readingText.splitLede); any other block is body
 * alone. A body whose every line is a list item also comes as `items`, and
 * a heading that only counts them ("3 Practical Actions" over three
 * bullets) loses the count, which the list now shows. Markdown marks are
 * dropped.
 */
export function aiReadingSections(text: string): AiSection[] {
  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  const sections: AiSection[] = [];
  let pending: string | null = null;
  blocks.forEach((block, b) => {
    const lines = block.split('\n');
    const alone = lines.length === 1 ? headingOf(lines[0]) : null;
    if (alone && b < blocks.length - 1) {
      if (pending) sections.push({ heading: pending, body: '' });
      pending = alone;
      return;
    }
    const own = lines.length > 1 ? headingOf(lines[0]) : null;
    const rest = own ? lines.slice(1) : lines;
    let heading = own ?? pending;
    if (own && pending) sections.push({ heading: pending, body: '' });
    pending = null;
    const body = rest.join('\n').replace(MARKDOWN_MARKS, '').trim();
    const items = listItemsOf(rest);
    const count = heading ? /^(\d{1,2})\s+(?=\p{Lu})/u.exec(heading) : null;
    if (heading && count && items && items.length === Number(count[1])) heading = heading.slice(count[0].length);
    sections.push({ ...(heading ? { heading } : {}), body, ...(items ? { items } : {}) });
  });
  if (pending) sections.push({ heading: pending, body: '' });
  return sections;
}

/**
 * The reading's summary — its first block with a body, without its heading
 * ("1) Overview") — and the sections after it (aiReadingSections).
 */
export function splitAiReading(text: string): { lede: string; sections: AiSection[] } {
  const sections = aiReadingSections(text);
  const first = sections.find((s) => s.body.length > 0);
  if (!first) return { lede: '', sections: [] };
  return { lede: first.body, sections: sections.filter((s) => s !== first && (s.body || s.heading)) };
}

/**
 * The meaning a card is read by on this table: the focus's own meaning
 * (love, career) when the card has one, else its upright or reversed
 * meaning. `focused` says which, so the result can add the reversed
 * meaning under a focused one.
 */
export function cartoMainMeaning(card: PlayingCard, reversed: boolean, focus: CartoFocus): { text: string; focused: boolean } {
  const focused = focus === 'love' ? card.loveMeaning : focus === 'career' ? card.careerMeaning : undefined;
  if (focused) return { text: focused, focused: true };
  return { text: reversed ? card.meaningReversed ?? card.meaningUpright : card.meaningUpright, focused: false };
}

/** Sentences run together: no space after a CJK stop or closer, one after anything else. */
export function joinSentences(parts: string[]): string {
  let out = '';
  for (const raw of parts) {
    const s = raw.trim();
    if (!s) continue;
    if (!out) out = s;
    else out += /[。．｡！？」』】）]$/.test(out) ? s : ` ${s}`;
  }
  return out;
}

/**
 * How many leading sentences of card `index`'s meaning the summary has
 * already quoted (cartoSynthesis): two for a lone card, one each for the
 * first three cards of a table, none after that. The tarot result's rule
 * (readingText.summarySentencesFrom), for the same reason.
 */
export function cartoSummarySentencesFrom(index: number, count: number): number {
  if (count === 1) return 2;
  return index < 3 ? 1 : 0;
}

/**
 * A sentence that reads the card by what lies beside it: "Beside Spades it
 * invites you to look honestly at whether a third person… is taking up room
 * between you", "Read with heavier cards it can hint at…", "A Spade next to
 * it does not cancel the wish", "With gentle cards nearby…". The summary and
 * the short text under a card are what the card says on its own; they do
 * not see the table, and such a sentence there reads as this table's
 * reading whatever lies beside the card — under a love question with no
 * Spades out, the Three of Hearts' whole section was the third-person
 * sentence (p9 Q09). It stays in the full meaning, where it reads as the
 * condition it is. One pattern set per script; the golden test holds them
 * to every meaning of the four corpora, no more and no fewer.
 */
const NEIGHBOUR_BOUND: readonly RegExp[] = [
  /\b(?:beside|next to)\s+(?:it|them|spades|hearts|clubs|diamonds)\b/i,
  /\b(?:heavier|gentle|gentler|softer|kinder|darker|lighter)\s+cards\b/i,
  /重いカード|穏やかなカード|そばに出|隣にある|隣に(?:スペード|ハート|クラブ|ダイヤ)/,
  /무거운 카드|부드러운 카드|곁에 놓|옆에 (?:놓|스페이드|하트|클로버|다이아)/,
  /沉重的牌|周围若有|相邻|旁边的牌|旁边出现|在它旁边/,
];

/** True when the sentence reads the card by its neighbours (see NEIGHBOUR_BOUND). */
export function isNeighbourBound(sentence: string): boolean {
  return NEIGHBOUR_BOUND.some((re) => re.test(sentence));
}

/** A meaning's sentences that hold whatever lies beside the card. */
function ownSentences(text: string): string[] {
  return sentencesOf(text).filter((s) => !isNeighbourBound(s));
}

/**
 * The first `count` sentences of a card's meaning as a summary quotes it:
 * those that hold on their own (ownSentences). Cut from the source, as
 * firstSentences does, when none of them reads the neighbours.
 */
function quotedSentences(text: string, count: number): string {
  if (!sentencesOf(text).slice(0, count).some(isNeighbourBound)) return firstSentences(text, count);
  return joinSentences(ownSentences(text).slice(0, count));
}

/**
 * A card's section under the summary: it continues where the summary
 * stopped, so no sentence is printed twice. `short` is the next two
 * sentences after the ones the summary quoted (empty when nothing is left:
 * a one-card reading whose meaning is two sentences long); `more` says the
 * meaning holds more than the summary and `short` printed — later
 * sentences, or one that reads the card by its neighbours, which neither
 * prints (isNeighbourBound) — for the "Read the full meaning" fold. The
 * playing-card result printed the summary's sentences again under every
 * card: a one-card reading showed the same paragraph twice (p8 F17).
 */
export function cartoSectionText(text: string, index: number, count: number): { short: string; more: boolean } {
  const all = sentencesOf(text);
  const own = all.filter((s) => !isNeighbourBound(s));
  const taken = cartoSummarySentencesFrom(index, count);
  const shown = own.slice(taken, taken + 2);
  const printed = Math.min(own.length, taken) + shown.length;
  return { short: joinSentences(shown), more: all.length > printed };
}

/** "Four of Clubs: …" — how a summary sentence is led by its card's name; the result passes the locale's form. */
const defaultLead = (name: string, sentence: string) => `${name}: ${sentence}`;

/**
 * The summary of the cards on the table, as the tarot result builds its
 * own (readingText.synthesisFor): for one card its first two sentences; for
 * more, one sentence per card for the first three, led by the card's name
 * when the sentence does not already say it. Pass localized cards. Each
 * card's section then starts after what this quoted (cartoSectionText).
 */
export function cartoSynthesis(
  cards: Array<{ card: PlayingCard; reversed: boolean }>,
  focus: CartoFocus,
  lead: (name: string, sentence: string) => string = defaultLead,
): string {
  if (cards.length === 0) return '';
  const quoted = (index: number) => {
    const { card, reversed } = cards[index];
    return quotedSentences(cartoMainMeaning(card, reversed, focus).text, cartoSummarySentencesFrom(index, cards.length));
  };
  if (cards.length === 1) return quoted(0);
  return joinSentences(
    cards.slice(0, 3).map(({ card }, i) => {
      const first = quoted(i);
      return first.toLowerCase().includes(card.name.toLowerCase()) ? first : lead(card.name, first);
    }),
  );
}

/**
 * The reading summary: the AI's opening paragraph when there is one (its
 * "Overview" heading dropped), else the synthesis of the cards drawn. It
 * used to be the spread's reading method, which is the same how-to text
 * whatever the cards say.
 */
export function cartoSummary(
  aiText: string | null,
  cards: Array<{ card: PlayingCard; reversed: boolean }>,
  focus: CartoFocus,
  lead?: (name: string, sentence: string) => string,
): string {
  if (aiText) {
    const { lede } = splitAiReading(aiText);
    if (lede) return lede;
  }
  return cartoSynthesis(cards, focus, lead);
}

// ---------------------------------------------------------------------------
// AI request
// ---------------------------------------------------------------------------

export type CartoFocus = 'love' | 'career' | 'general';

export const MAX_POSITION_LABEL = 40;
export const MAX_PLAYING_CARDS = 21;

/** The localized position labels as generate-reading accepts them: ≤ 21, ≤ 40 chars each. */
export function cartoPositionsForAI(labels: string[]): string[] {
  return labels.slice(0, MAX_PLAYING_CARDS).map((label) => label.slice(0, MAX_POSITION_LABEL));
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export interface AchievementEvent {
  activityType: string;
  value?: string;
}

/** The events a completed table reports (migration 20261003000008). */
export function cartoAchievementEvents(spreadSlug: string, cards: PlayingCard[]): AchievementEvent[] {
  const events: AchievementEvent[] = [
    { activityType: 'cartomancy_reading_complete' },
    { activityType: 'cartomancy_spread_types_used', value: spreadSlug },
  ];
  if (cards.some((c) => c.id === WISH_CARD_ID)) events.push({ activityType: 'cartomancy_wish_card_drawn' });
  if (cards.some((c) => c.id === RED_JOKER_ID || c.id === BLACK_JOKER_ID)) events.push({ activityType: 'cartomancy_joker_drawn' });
  if (spreadSlug === 'carto-romany') events.push({ activityType: 'cartomancy_romany_complete' });
  return events;
}

// ---------------------------------------------------------------------------
// Card of the day
// ---------------------------------------------------------------------------

/** One card from the 52 for this reader and this local day. Jokers never lead a day. */
export function cartoCardOfTheDay(userId: string | null | undefined, date: string = localDateStr()): { card: PlayingCard; reversed: boolean } {
  const seed = `${userId || 'anonymous'}:${date}:carto`;
  return drawSeededCards(1, seed, PLAYING_DECK)[0];
}

// ---------------------------------------------------------------------------
// Lessons (per account)
// ---------------------------------------------------------------------------

/**
 * The device's key: a signed-out viewer's ticks, and everyone's before the
 * ticks were kept per account. Signed in, ticks live under
 * `cartoLessonsKey(userId)` (services/offline.ts); one device used to show
 * the last reader's "4 of 12 lessons done" to the next account (p8 F52).
 */
export const CARTO_LESSONS_KEY = cartoLessonsKey(null);

function parseLessons(raw: string | null): Set<string> {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : []);
  } catch {
    return new Set();
  }
}

/**
 * The lessons this account has ticked (the device's when signed out). The
 * first read for an account that has none adopts the device's ticks, once:
 * they were made on this phone before ticks were kept per account (or while
 * signed out), and the device key is removed so no other account adopts
 * them too.
 */
export function loadLessonsDone(userId?: string | null, store: KeyValueStore | null = browserStore()): Set<string> {
  if (!store) return new Set();
  try {
    const key = cartoLessonsKey(userId);
    const own = store.getItem(key);
    if (own !== null || !userId) return parseLessons(own);
    const device = store.getItem(CARTO_LESSONS_KEY);
    if (device === null) return new Set();
    try {
      store.setItem(key, device);
      store.removeItem(CARTO_LESSONS_KEY);
    } catch {
      // private mode: read the device's ticks this time, adopt them next time
    }
    return parseLessons(device);
  } catch {
    return new Set();
  }
}

export function setLessonDone(
  slug: string,
  done: boolean,
  userId?: string | null,
  store: KeyValueStore | null = browserStore(),
): Set<string> {
  const next = loadLessonsDone(userId, store);
  if (done) next.add(slug);
  else next.delete(slug);
  try {
    store?.setItem(cartoLessonsKey(userId), JSON.stringify([...next]));
  } catch {
    // private mode
  }
  return next;
}

// The free tier's daily allowance is counted in services/offline.ts
// (getDailyReadingCount / incrementDailyReadingCount, per account), the one
// count TarotSection and CartomancySection share.

// ---------------------------------------------------------------------------
// Saved readings
// ---------------------------------------------------------------------------

/** The row a saved playing-card reading stores in tarot_readings.cards. */
export interface SavedPlayingCard {
  cardId: number;
  cardName: string;
  reversed: boolean;
  position: string;
  /** Lets the library route the name through the playing deck, not the tarot index. */
  deck: 'playing';
}

export function toSavedCards(dealt: DealtCard[], labelFor: (index: number) => string): SavedPlayingCard[] {
  return dealt.map((d, i) => ({
    cardId: d.card.id,
    cardName: d.card.name,
    reversed: d.reversed,
    position: labelFor(i),
    deck: 'playing',
  }));
}

/** The spread for a slug, or the one-card reading when the slug is not a playing-card spread. */
export function cartoSpreadOrDefault(slug: string | null | undefined): CartoSpread {
  const spread = slug ? getCartoSpread(slug) : null;
  return spread ?? (getCartoSpread(DEFAULT_CARTO_SPREAD) as CartoSpread);
}
