/**
 * Text helpers for the reading result: the short-by-default rule (R5 M-12).
 *
 * Every reading surface used to print a card's whole essay. The result
 * now shows the first two sentences and puts the rest behind "Read the
 * full meaning"; the summary at the head of the sheet is the AI reading's
 * first paragraph, or one sentence per card for a card reading.
 */
import { ct, type ContentOverlay } from '../../../i18n/contentOverlay';
import { getLocale, type SupportedLocale } from '../../../i18n/config';
import { majorEnrichment, minorEnrichment, type TarotEnrichment } from '../../../data/tarotEnrichment';
import { ALL_CARDS } from '../../../config/bundledImages';
import type { TarotCard } from '../../../types';
import type { FocusArea } from './types';

/** Split prose into sentences on . ! ? (and the CJK full stops), keeping the punctuation. */
export function sentencesOf(text: string): string[] {
  const out: string[] = [];
  const re = /[^.!?。！？]+[.!?。！？]+["”’)」』]?\s*|[^.!?。！？]+$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const s = m[0].trim();
    if (s) out.push(s);
  }
  return out;
}

/**
 * Sentences joined as their script sets them: Japanese and Chinese run
 * on after a full-width stop (。！？) with no space between sentences;
 * Latin and Korean, which end on a half-width stop, take one space.
 */
export function joinSentences(parts: string[]): string {
  let out = '';
  for (const raw of parts) {
    const s = raw.trim();
    if (!s) continue;
    if (!out) out = s;
    else out += /[。！？」』）]$/.test(out) ? s : ` ${s}`;
  }
  return out;
}

/** The first `n` sentences. */
export function firstSentences(text: string, n: number): string {
  return joinSentences(sentencesOf(text).slice(0, n));
}

/** True when the text has more than `n` sentences — i.e. there is a "full meaning" to open. */
export function hasMoreThan(text: string, n: number): boolean {
  return sentencesOf(text).length > n;
}

const MARKDOWN_MARKS = /[*_#`]+/g;
const HEADING_NUMBER = /^\s*(?:#{1,6}\s*)?(?:\d{1,2}\s*[.)]\s*)?/;

/** A line the model wrote as a heading ("Overview", "1) Overview", "## The cards"): short, unpunctuated. */
function isHeadingLine(line: string): boolean {
  const bare = line.replace(MARKDOWN_MARKS, '').trim();
  if (!bare || bare.length > 64) return false;
  if (/[.!?;,。！？、]$/.test(bare) || /^[-•]/.test(bare)) return false;
  return Boolean(bare.replace(HEADING_NUMBER, '').replace(/[:：]$/, '').trim());
}

/**
 * The first paragraph of a multi-paragraph reading, and the rest.
 *
 * The AI reading opens with a heading ("Overview", "1) A short overview"),
 * either on its own line above the paragraph or as a block of its own; the
 * lede is the paragraph without it and without markdown marks, since the
 * summary is set as one plain paragraph (a heading glued to the sentence
 * read "Overview Temperance upright asks…").
 */
export function splitLede(text: string): { lede: string; rest: string } {
  const parts = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  let i = 0;
  // A block that is a heading and nothing else belongs to the paragraph after it.
  while (i < parts.length - 1 && !parts[i].includes('\n') && isHeadingLine(parts[i])) i++;
  if (i >= parts.length) return { lede: '', rest: '' };
  const lines = parts[i].split('\n');
  const body = lines.length > 1 && isHeadingLine(lines[0]) ? lines.slice(1) : lines;
  const lede = body.join(' ').replace(MARKDOWN_MARKS, '').replace(/\s+/g, ' ').trim();
  return { lede, rest: parts.slice(i + 1).join('\n\n') };
}

/*
 * Some love / career meanings in the card table carry both orientations in
 * one string: an introduction, then "UPRIGHT LOVE MEANING: …" and
 * "REVERSED LOVE MEANING: …" (the love and career texts of ids 32–44, 26
 * fields, as of Phase 7). Printing the whole string put shouted labels
 * mid-paragraph and gave a reversed card its upright reading first.
 *
 * The introduction is not neutral. Every one in production reads the
 * upright card ("In matters of love and relationships, the Nine of Cups
 * brings exceptionally positive energy, suggesting emotional fulfillment,
 * romantic wishes coming true…"), so it belongs to the upright reading: a
 * reversed card's focus text is its REVERSED section alone (p8 O#43 — the
 * summary of a reversed Nine of Cups quoted that sentence).
 */
const ORIENTATION_LABEL = /(?:^|\n+)[ \t]*(UPRIGHT|REVERSED)\s+(?:[A-Z]+\s+)*MEANING:\s*/;

/*
 * Most of the rest (45 love and 45 career meanings in production) are
 * written upright first and turn to the reversed card part-way, without a
 * label: "When The Fool appears reversed in love matters, …", "When
 * reversed in career readings, The Emperor …", "The High Priestess
 * reversed in love matters …". The turn is the first sentence that OPENS
 * on the reversal; everything from it on is the reversed reading. A
 * sentence that merely mentions a reversal later on ("upright or
 * reversed") is not a turn. The CJK patterns cover a translation that
 * carries the reversed reading the same way.
 */
const REVERSAL_OPENER = new RegExp(
  [
    String.raw`^(?:When|If|Whenever)\b[^.!?]{0,80}?\breversed\b`,
    String.raw`^(?:The|A|This) reversed\b`,
    String.raw`^Reversed\b`,
    String.raw`^In (?:its |the )?reversed? (?:position|orientation)`,
    String.raw`^[A-Z][^.!?]{0,50}?\breversed,? in (?:love|career|romantic|professional|work|financial|money|relationship)`,
    String.raw`^[^。！？.]{0,24}(?:逆位置|逆位|역방향|역위치)`,
  ].join('|'),
);

export interface FocusSections {
  /** The whole of a string that names no orientation and turns to none: written for the upright card. Empty otherwise. */
  intro: string;
  /** The upright reading — a labelled string's introduction included, since it reads the upright card. */
  upright?: string;
  reversed?: string;
}

/**
 * A focus meaning cut by orientation: at its labels when it has them (the
 * introduction joining the upright part), at the turn to the reversed card
 * when it has one, else whole (`intro` only — written for the upright card).
 */
export function focusSections(text: string): FocusSections {
  const labelled = meaningSections(text);
  if (labelled.upright !== undefined || labelled.reversed !== undefined) {
    const upright = [labelled.intro, labelled.upright].filter(Boolean).join('\n\n');
    return { intro: '', upright: upright || undefined, reversed: labelled.reversed };
  }

  const trimmed = text.trim();
  // The turn usually opens a paragraph; failing that, a sentence inside one.
  const paragraphs = trimmed.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  for (let i = 1; i < paragraphs.length; i++) {
    if (REVERSAL_OPENER.test(paragraphs[i])) {
      return {
        intro: '',
        upright: paragraphs.slice(0, i).join('\n\n'),
        reversed: paragraphs.slice(i).join('\n\n'),
      };
    }
  }
  for (let p = 0; p < paragraphs.length; p++) {
    const sentences = sentencesOf(paragraphs[p]);
    const at = sentences.findIndex((s, i) => (i > 0 || p > 0) && REVERSAL_OPENER.test(s));
    if (at < 0) continue;
    const before = [...paragraphs.slice(0, p), joinSentences(sentences.slice(0, at))].filter(Boolean);
    const after = [joinSentences(sentences.slice(at)), ...paragraphs.slice(p + 1)].filter(Boolean);
    return { intro: '', upright: before.join('\n\n'), reversed: after.join('\n\n') };
  }
  return { intro: trimmed };
}

/**
 * The part of a labelled focus meaning that belongs to this orientation,
 * labels removed: upright, the introduction and the UPRIGHT section;
 * reversed, the REVERSED section alone (the introduction reads the upright
 * card). Text without the labels is returned as it is.
 */
export function orientedMeaning(text: string, reversed: boolean): string {
  const parts = text.split(new RegExp(ORIENTATION_LABEL.source, 'g'));
  if (parts.length < 3) return text;
  const s = focusSections(text);
  return (reversed ? s.reversed : s.upright) ?? '';
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

function rawFocus(card: TarotCard, focus: FocusArea | null): string | undefined {
  const raw = focus === 'Love' ? card.loveMeaning : focus === 'Career' || focus === 'Money' ? card.careerMeaning : undefined;
  return raw && raw.trim() ? raw : undefined;
}

/** The text of one orientation of a focus meaning, or undefined when that orientation is not written. */
export function focusTextFor(text: string, reversed: boolean): string | undefined {
  const s = focusSections(text);
  const own = reversed ? s.reversed : s.upright;
  // An upright-only string (no labels, no turn) is all intro: it reads the upright card only.
  if (reversed && !own) return undefined;
  return [s.intro, own].filter(Boolean).join('\n\n') || undefined;
}

/**
 * The focus meaning for a card in THIS orientation, when the focus has one
 * written for it. A reversed card whose love / career text speaks only of
 * the upright card has none: that text would read the card the wrong way
 * up (it said "The Lovers upright brings…" over a reversed Lovers), so the
 * reading leads with the card's reversed meaning instead.
 */
export function focusMeaningFor(card: TarotCard, focus: FocusArea | null, reversed = false): string | undefined {
  const raw = rawFocus(card, focus);
  return raw ? focusTextFor(raw, reversed) : undefined;
}

/**
 * The upright focus text for a reversed card that has no reversed one —
 * offered in the full meaning as the upright reading, labelled so, never as
 * the reading of this card.
 */
export function uprightFocusFor(card: TarotCard, focus: FocusArea | null, reversed: boolean): string | undefined {
  if (!reversed) return undefined;
  const raw = rawFocus(card, focus);
  if (!raw || focusTextFor(raw, true)) return undefined;
  return focusTextFor(raw, false);
}

/** The meaning the result leads with: the focus meaning for this orientation, else upright / reversed. */
export function leadMeaningFor(card: TarotCard, reversed: boolean, focus: FocusArea | null): string {
  return focusMeaningFor(card, focus, reversed) ?? (reversed ? card.meaningReversed : card.meaningUpright);
}

/** The enrichment entry for a card id: the Major Arcana by id, the Minor by its slug. */
export function enrichmentFor(cardId: number): TarotEnrichment | null {
  if (cardId >= 0 && cardId <= 21) return majorEnrichment[cardId] ?? null;
  const slug = ALL_CARDS.find((c) => c.id === cardId)?.slug;
  return slug ? minorEnrichment[slug] ?? null : null;
}

/**
 * The card's affirmation, by id, in the reader's language: the English in
 * English; in ja/ko/zh the `enrichment` content overlay's
 * `<id>.affirmation`, or nothing until the overlay has it — an English line
 * in the display serif under a translated reading is worse than none (the
 * panel is an ornament, not information). Pass the overlay from
 * `useContentOverlay('enrichment')`. QuickReadingPage reads the same key.
 */
export function affirmationFor(
  cardId: number,
  overlay?: ContentOverlay | null,
  locale: SupportedLocale = getLocale(),
): string | undefined {
  const en = enrichmentFor(cardId)?.affirmation;
  if (!en) return undefined;
  if (locale === 'en') return en;
  return ct(overlay, `${cardId}.affirmation`, '') || undefined;
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

/** "The Lovers: …" — the default way a summary sentence is led by its card's name. */
const defaultLead = (name: string, sentence: string) => `${name}: ${sentence}`;

/**
 * The spread's one-line synthesis for the summary block: for one card its
 * first two sentences; for more, one sentence per card for the first
 * three, led by the card's name when the sentence does not already say it.
 * `lead` formats that lead for the locale (ja "名前：文").
 */
export function synthesisFor(
  cards: { card: TarotCard; reversed: boolean }[],
  focus: FocusArea | null,
  lead: (name: string, sentence: string) => string = defaultLead,
): string {
  if (cards.length === 0) return '';
  if (cards.length === 1) {
    return firstSentences(leadMeaningFor(cards[0].card, cards[0].reversed, focus), 2);
  }
  return joinSentences(
    cards.slice(0, 3).map(({ card, reversed }) => {
      const first = firstSentences(leadMeaningFor(card, reversed, focus), 1);
      // Most meanings already name their card; only lead with it when this one does not.
      return first.toLowerCase().includes(card.name.toLowerCase()) ? first : lead(card.name, first);
    }),
  );
}
