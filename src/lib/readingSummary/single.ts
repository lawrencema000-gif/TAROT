/**
 * One card read alone (WP-NF-02 A6 case 1, A7 "One card", A8): a tarot card
 * in layers (Major or suit and number, then its orientation), and a playing
 * card for the quick reading in Lesson 8's three layers (suit, number,
 * color).
 */
import { getPlayingCard } from '../../data/cartomancy/deck';
import { CARTO_NUMBERS, CARTO_SUITS } from '../../data/cartomancy/tables.en';
import i18n, { CARTO_CORPUS_NS, type SupportedLocale } from '../../i18n/config';
import { localizePlayingCard } from '../../i18n/localizePlayingCard';
import { sentencesOf } from '../../components/readings/tarot/readingText';
import type { PlayingCard } from '../../types/cartomancy';
import { cardRef, bareRef, embedded, fill, lowerFirst, say, template } from './format';
import { phrase } from './loadPhrases';
import type { PhraseKey } from './phrases.en';
import { firstQuestion, tarotFacts, type TarotFacts } from './tarot';
import type { ReadingSummary, SingleInput, SummaryPart } from './types';

/** The card's advice in its own words: the affirmation, upright or through its upright words when reversed. */
export function adviceSentence(locale: SupportedLocale, c: TarotFacts, inside = false): string {
  const key: PhraseKey = c.reversed ? 'advice.reversed' : 'advice.upright';
  const vars = { card: bareRef(locale, c), affirmation: c.affirmation };
  // Set inside another English sentence, the advice is not capitalized: a
  // Minor keeps "the Knight of Wands advises", a Major keeps its own capital
  // ("The Moon advises"), and the reversed template's "For" is lowered.
  if (inside && locale === 'en') return embedded(locale, fill(template(locale, key), vars));
  const s = say(locale, key, vars);
  return inside ? embedded(locale, s) : s;
}

export function questionPart(locale: SupportedLocale, question: string): SummaryPart | null {
  if (!question) return null;
  return { key: 'todo', heading: phrase(locale, 'heading.todo'), lines: [say(locale, 'todo.question', { question })] };
}

/** A tarot card's layers: Major Arcana and element, or suit and number; then its orientation. */
export function tarotLayers(locale: SupportedLocale, c: TarotFacts): string[] {
  const lines: string[] = [];
  if (c.major || !c.suit || c.number === null) {
    lines.push(say(locale, 'layer.major', { element: c.element ?? '' }));
  } else {
    lines.push(
      say(locale, 'layer.suit', {
        suit: phrase(locale, `suit.${c.suit}` as PhraseKey),
        element: c.element ?? '',
        domain: phrase(locale, `suit.${c.suit}.domain` as PhraseKey),
      }),
      say(locale, 'layer.number', {
        rank: phrase(locale, `rank.${c.number}` as PhraseKey),
        theme: phrase(locale, `theme.${c.number}` as PhraseKey),
      }),
    );
  }
  lines.push(say(locale, c.reversed ? 'layer.reversed' : 'layer.upright'));
  return lines;
}

/** One tarot card's summary from its facts. */
export function singleTarotFromFacts(locale: SupportedLocale, c: TarotFacts): ReadingSummary {
  const short = [
    say(locale, 'short.one', { card: cardRef(locale, c), essence: c.essence.text }),
    c.essence.second,
    adviceSentence(locale, c),
  ].filter(Boolean);
  const parts: SummaryPart[] = [{ key: 'layers', heading: phrase(locale, 'heading.layers'), lines: tarotLayers(locale, c) }];
  const todo = questionPart(locale, c.question);
  if (todo) parts.push(todo);
  return { short, parts, quotesAffirmationOf: 0 };
}

// ── A playing card ─────────────────────────────────────────────────────

interface CartoCorpus {
  suits?: Record<string, { name?: string; verb?: string }>;
  numbers?: Record<string, { key?: string }>;
}

function cartoCorpus(locale: SupportedLocale): CartoCorpus | null {
  if (locale === 'en') return null;
  return (i18n.getResourceBundle(locale, CARTO_CORPUS_NS) as CartoCorpus | undefined) ?? null;
}

const noStop = (s: string) => s.trim().replace(/[.!?。！？]+$/, '');

/** A playing card's reference: en "the Ace of Hearts (reversed)"; ja, ko and zh the name. */
function playingRef(locale: SupportedLocale, card: PlayingCard, reversed: boolean): string {
  const base = locale === 'en' ? `the ${card.name}` : card.name;
  return reversed ? say(locale, 'ref.reversed', { card: base }) : base;
}

/** The first clause of a number's key: "Beginnings; a single thing arriving; …" → "beginnings". */
function firstClause(locale: SupportedLocale, key: string): string {
  const first = key.split(/\s*(?:;|；|、|·)\s*/)[0] ?? key;
  return locale === 'en' ? lowerFirst(first.trim()) : first.trim();
}

export function summarizePlayingCard(id: number, reversed: boolean, locale: SupportedLocale): ReadingSummary {
  const en = getPlayingCard(id);
  if (!en) return { short: [], parts: [], quotesAffirmationOf: null };
  const card = localizePlayingCard(en, locale);
  const lead = reversed ? card.meaningReversed : card.quickMeaning;
  const essenceRaw = noStop(sentencesOf(lead ?? '')[0] ?? lead ?? '');
  const essence = locale === 'en' ? lowerFirst(essenceRaw) : essenceRaw;
  const short = [say(locale, 'playing.one', { card: playingRef(locale, card, reversed), essence })];

  if (en.suit === 'joker') {
    const kw = card.keywords[0] ?? '';
    short.push(say(locale, 'playing.joker', { keyword: locale === 'en' ? lowerFirst(kw) : kw }));
  } else {
    const corpus = cartoCorpus(locale);
    const suitEn = CARTO_SUITS.find((s) => s.id === en.suit);
    const numberEn = CARTO_NUMBERS.find((n) => n.rank === en.rank);
    const color = en.color === 'red' ? 'red' : 'black';
    short.push(
      say(locale, 'playing.layers', {
        suit: corpus?.suits?.[en.suit]?.name ?? suitEn?.name ?? '',
        verb: corpus?.suits?.[en.suit]?.verb ?? suitEn?.verb ?? '',
        rank: phrase(locale, `playing.rank.${en.rank}` as PhraseKey),
        key: firstClause(locale, corpus?.numbers?.[en.rank]?.key ?? numberEn?.key ?? ''),
        color: phrase(locale, `playing.color.${color}` as PhraseKey),
        mood: phrase(locale, `playing.mood.${color}` as PhraseKey),
      }),
    );
  }
  if (card.adviceMeaning) short.push(say(locale, 'playing.advice', { advice: card.adviceMeaning }));

  const parts: SummaryPart[] = [];
  const todo = questionPart(locale, firstQuestion(card.reflectionPrompt ?? ''));
  if (todo) parts.push(todo);
  return { short, parts, quotesAffirmationOf: null };
}

/** One card read alone: a tarot card (layers, advice, question) or a playing card (Lesson 8's layers). */
export function summarizeSingle(input: SingleInput): ReadingSummary {
  if (input.deck === 'playing') return summarizePlayingCard(input.id, input.reversed, input.locale);
  const facts = tarotFacts(input.id, input.reversed, input.locale);
  if (!facts) return { short: [], parts: [], quotesAffirmationOf: null };
  return singleTarotFromFacts(input.locale, facts);
}
