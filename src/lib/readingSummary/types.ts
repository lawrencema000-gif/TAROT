/**
 * The reading-summary engine's inputs and outputs (WP-NF-02).
 *
 * The engine reads the cards together: a short summary of two or three
 * sentences, and "the whole picture" in parts. It is computed from the
 * app's own card data (the bundled deck, the enrichment table, the card
 * pages' affirmations and questions), so it is free, instant and offline.
 * WP-NF-04 extends `SummaryPart['key']` with its cartomancy keys in its own
 * file; this file is not edited for that.
 */
import type { SupportedLocale } from '../../i18n/config';

export type { SupportedLocale };

export type Deck = 'tarot' | 'playing';

export type PositionRole =
  | 'heart'
  | 'crossing'
  | 'root'
  | 'past'
  | 'present'
  | 'future'
  | 'crown'
  | 'self'
  | 'other'
  | 'world'
  | 'hopes-fears'
  | 'outcome'
  | 'advice'
  | 'bond'
  | 'option'
  | 'step';

export interface SummaryInput {
  /** The id the flow cast: a legacy id, a catalogue slug, 'custom:<uuid>', or 'quick'. */
  spreadId: string;
  cards: Array<{ id: number; reversed: boolean }>;
  /** The positions as the reader sees them, in the reading's language (the screen's position labels). */
  positionLabels: string[];
  /** A Yes/No spread's answer as WP-P1-02 computes it (D13): its label in the reader's language. */
  answer?: { label: string } | null;
  locale: SupportedLocale;
}

export interface SummaryPart {
  key: 'story' | 'connections' | 'patterns' | 'turning' | 'todo' | 'layers';
  heading: string;
  lines: string[];
}

export interface ReadingSummary {
  /** Two or three sentences. */
  short: string[];
  /** The whole picture; empty parts left out. */
  parts: SummaryPart[];
  /** The card whose affirmation the short summary quotes (index), so a screen can print it once. */
  quotesAffirmationOf: number | null;
}

/** One card read alone: a tarot card (the single spread, the quick reading) or a playing card. */
export interface SingleInput {
  deck: Deck;
  id: number;
  reversed: boolean;
  locale: SupportedLocale;
}
