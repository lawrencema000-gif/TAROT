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

/*
 * Some love / career meanings in the card table carry both orientations in
 * one string: an introduction, then "UPRIGHT LOVE MEANING: …" and
 * "REVERSED LOVE MEANING: …" (13 of the 78, as of Phase 7). Printing the
 * whole string put shouted labels mid-paragraph and gave a reversed card
 * its upright reading first.
 */
const ORIENTATION_LABEL = /(?:^|\n+)[ \t]*(UPRIGHT|REVERSED)\s+(?:[A-Z]+\s+)*MEANING:\s*/;

/**
 * The part of a focus meaning that belongs to this orientation: the
 * introduction plus the matching labelled section, labels removed. Text
 * without the labels is returned as it is.
 */
export function orientedMeaning(text: string, reversed: boolean): string {
  const parts = text.split(new RegExp(ORIENTATION_LABEL.source, 'g'));
  if (parts.length < 3) return text;
  const intro = parts[0].trim();
  let picked = '';
  for (let i = 1; i + 1 < parts.length; i += 2) {
    if ((parts[i] === 'REVERSED') === reversed) picked = parts[i + 1].trim();
  }
  return [intro, picked].filter(Boolean).join('\n\n');
}

/** A focus meaning cut at its labels: the introduction, and each orientation's part when written. */
export function meaningSections(text: string): { intro: string; upright?: string; reversed?: string } {
  const parts = text.split(new RegExp(ORIENTATION_LABEL.source, 'g'));
  if (parts.length < 3) return { intro: text.trim() };
  const out: { intro: string; upright?: string; reversed?: string } = { intro: parts[0].trim() };
  for (let i = 1; i + 1 < parts.length; i += 2) {
    if (parts[i] === 'REVERSED') out.reversed = parts[i + 1].trim();
    else out.upright = parts[i + 1].trim();
  }
  return out;
}

/** The focus meaning for a card in this orientation, when the focus has one written. */
export function focusMeaningFor(card: TarotCard, focus: FocusArea | null, reversed = false): string | undefined {
  const raw =
    focus === 'Love' ? card.loveMeaning : focus === 'Career' || focus === 'Money' ? card.careerMeaning : undefined;
  return raw ? orientedMeaning(raw, reversed) : undefined;
}

/** The meaning the result leads with: the focus meaning, else upright / reversed. */
export function leadMeaningFor(card: TarotCard, reversed: boolean, focus: FocusArea | null): string {
  return focusMeaningFor(card, focus, reversed) ?? (reversed ? card.meaningReversed : card.meaningUpright);
}

/** The card's affirmation (tarotEnrichment), looked up by id so a localized name still resolves. */
export function affirmationFor(cardId: number): string | undefined {
  const slug = ALL_CARDS.find((c) => c.id === cardId)?.slug;
  return slug ? getEnrichment(slug)?.affirmation : undefined;
}

/**
 * How many leading sentences of card `index`'s meaning the summary has
 * already quoted (see synthesisFor): two for a lone card, one each for the
 * first three cards of a spread, none after that. The card's section
 * starts after them.
 */
export function summarySentencesFrom(index: number, count: number): number {
  if (count === 1) return 2;
  return index < 3 ? 1 : 0;
}

/**
 * The spread's one-line synthesis for the summary block: for one card its
 * first two sentences; for more, one sentence per card for the first
 * three, led by the card's name when the sentence does not already say it.
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
    .map(({ card, reversed }) => {
      const first = firstSentences(leadMeaningFor(card, reversed, focus), 1);
      // Most meanings already name their card; only lead with it when this one does not.
      return first.toLowerCase().includes(card.name.toLowerCase()) ? first : `${card.name}: ${first}`;
    })
    .join(' ');
}
