/**
 * Text helpers for the reading result: the short-by-default rule (R5 M-12).
 *
 * Every reading surface used to print a card's whole essay. The result
 * now shows the first two sentences and puts the rest behind "Read the
 * full meaning"; the summary at the head of the sheet is the AI reading's
 * first paragraph, or one sentence per card for a card reading.
 */
import { ALL_CARDS } from '../../../config/bundledImages';
import { getEnrichment } from '../../../data/tarotEnrichment';
import type { TarotCard } from '../../../types';
import type { FocusArea } from './types';

/** Split prose into sentences on . ! ? (and the CJK full stops), keeping the punctuation. */
export function sentencesOf(text: string): string[] {
  const out: string[] = [];
  const re = /[^.!?。！？]+[.!?。！？]+["”’)]?\s*|[^.!?。！？]+$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const s = m[0].trim();
    if (s) out.push(s);
  }
  return out;
}

/** The first `n` sentences. */
export function firstSentences(text: string, n: number): string {
  return sentencesOf(text).slice(0, n).join(' ');
}

/** True when the text has more than `n` sentences — i.e. there is a "full meaning" to open. */
export function hasMoreThan(text: string, n: number): boolean {
  return sentencesOf(text).length > n;
}

/** The first paragraph of a multi-paragraph reading, and the rest. */
export function splitLede(text: string): { lede: string; rest: string } {
  const parts = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { lede: '', rest: '' };
  return { lede: parts[0], rest: parts.slice(1).join('\n\n') };
}

/** The focus meaning for a card, when the focus has one written. */
export function focusMeaningFor(card: TarotCard, focus: FocusArea | null): string | undefined {
  if (focus === 'Love') return card.loveMeaning || undefined;
  if (focus === 'Career' || focus === 'Money') return card.careerMeaning || undefined;
  return undefined;
}

/** The meaning the result leads with: the focus meaning, else upright / reversed. */
export function leadMeaningFor(card: TarotCard, reversed: boolean, focus: FocusArea | null): string {
  return focusMeaningFor(card, focus) ?? (reversed ? card.meaningReversed : card.meaningUpright);
}

/** The card's affirmation (tarotEnrichment), looked up by id so a localized name still resolves. */
export function affirmationFor(cardId: number): string | undefined {
  const slug = ALL_CARDS.find((c) => c.id === cardId)?.slug;
  return slug ? getEnrichment(slug)?.affirmation : undefined;
}

/**
 * The spread's one-line synthesis for the summary block: for one card its
 * first two sentences; for more, one sentence per card for the first
 * three, each led by the card's name.
 */
export function synthesisFor(
  cards: { card: TarotCard; reversed: boolean }[],
  focus: FocusArea | null,
): string {
  if (cards.length === 0) return '';
  if (cards.length === 1) {
    return firstSentences(leadMeaningFor(cards[0].card, cards[0].reversed, focus), 2);
  }
  return cards
    .slice(0, 3)
    .map(({ card, reversed }) => `${card.name}: ${firstSentences(leadMeaningFor(card, reversed, focus), 1)}`)
    .join(' ');
}
