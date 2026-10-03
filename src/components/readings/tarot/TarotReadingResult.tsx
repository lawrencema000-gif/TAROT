import type { ReactNode } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { ResultSheet, Tag, KeywordRow, ReadingProse, AffirmationPanel } from '../../ui';
import { SUIT_GLYPHS, suitKeyFor } from '../../icons/SuitGlyphs';
import { useT } from '../../../i18n/useT';
import type { TarotCard } from '../../../types';
import type { FocusArea } from './types';
import { PaperDisclosure } from './PaperDisclosure';
import {
  affirmationFor,
  focusMeaningFor,
  hasMoreThan,
  sentencesOf,
  splitLede,
  summarySentencesFrom,
  synthesisFor,
} from './readingText';

/**
 * The reading result on paper — the body of the reveal and of a saved
 * reading reopened from the Library.
 *
 *   glyph (the first card's suit) → eyebrow → title → ✦ ✦ ✦ →
 *   "Reading summary" → the synthesis → per-card sections → affirmation
 *   → actions → Disclaimer
 *
 * Each card section is SHORT by default: position, name, orientation, the
 * keyword pills, the next two sentences after the ones the summary
 * already quoted (never the same sentence twice), and "Read the full meaning"
 * opening the rest (the focus meaning, the traditional meaning when the
 * focus one led, and the reflection prompt). With an AI interpretation on
 * screen the summary is its first paragraph and the body the rest.
 */
export interface TarotReadingResultProps {
  cards: { card: TarotCard; reversed: boolean }[];
  getPositionLabel: (index: number) => string;
  selectedFocus: FocusArea | null;
  /** The reader's question, when they typed one. */
  question?: string | null;
  /** The eyebrow when there is no question: "Love reading", or the spread's name. */
  eyebrow: string;
  /** The title when there is no question: the spread's name. */
  title: string;
  aiInterpretation?: string | null;
  /** h2 when the screen already has an h1 above the sheet. */
  headingLevel?: 'h1' | 'h2';
  /** The primary action(s), rendered after the affirmation. */
  actions?: ReactNode;
  className?: string;
}

export function TarotReadingResult({
  cards,
  getPositionLabel,
  selectedFocus,
  question,
  eyebrow,
  title,
  aiInterpretation,
  headingLevel = 'h2',
  actions,
  className = '',
}: TarotReadingResultProps) {
  const { t } = useT('app');
  const first = cards[0];
  const Glyph = first ? SUIT_GLYPHS[suitKeyFor(first.card)] : null;
  const ai = aiInterpretation ? splitLede(aiInterpretation) : null;
  const summary = ai ? ai.lede : synthesisFor(cards, selectedFocus);
  const affirmation = first ? affirmationFor(first.card.id) : undefined;
  const asked = Boolean(question && question.trim());

  return (
    <ResultSheet
      glyph={Glyph ? <Glyph /> : undefined}
      eyebrow={asked ? t('readings.result.yourQuestion', { defaultValue: 'Your question' }) : eyebrow}
      title={asked ? question!.trim() : title}
      summary={summary || undefined}
      headingLevel={headingLevel}
      disclaimer={ai ? 'ai' : 'tarot'}
      className={className}
    >
      {ai ? (
        ai.rest ? <ReadingProse lede={false} text={ai.rest} /> : null
      ) : (
        <div className="space-y-8">
          {cards.map(({ card, reversed }, i) => {
            const focusText = focusMeaningFor(card, selectedFocus, reversed);
            const traditional = reversed ? card.meaningReversed : card.meaningUpright;
            const lead = focusText ?? traditional;
            // The section continues where the summary stopped, so no sentence is printed twice.
            const taken = summarySentencesFrom(i, cards.length);
            const short = sentencesOf(lead).slice(taken, taken + 2).join(' ');
            const more = hasMoreThan(lead, taken + 2) || Boolean(focusText) || Boolean(card.reflectionPrompt);
            return (
              <section key={i} aria-label={`${getPositionLabel(i)}: ${card.name}`}>
                <div className="text-center">
                  <Tag tone="neutral" size="md">{getPositionLabel(i)}</Tag>
                  <h3 className="heading-display-md heading-strong text-title text-ink mt-3">{card.name}</h3>
                  <p
                    className={`mt-1 inline-flex items-center gap-1 text-meta font-medium ${
                      reversed ? 'text-ink-gold' : 'text-ink-teal'
                    }`}
                  >
                    {reversed ? <ArrowDown className="w-3.5 h-3.5" aria-hidden /> : <ArrowUp className="w-3.5 h-3.5" aria-hidden />}
                    {reversed ? t('readings.revealView.reversed') : t('readings.revealView.upright')}
                  </p>
                  {card.keywords?.length > 0 && <KeywordRow keywords={card.keywords.slice(0, 4)} className="mt-3" />}
                </div>
                {short && <ReadingProse lede={false} text={short} className="mt-4" />}
                {more && (
                  <PaperDisclosure
                    className="mt-4"
                    label={t('readings.result.readFullMeaning', { defaultValue: 'Read the full meaning' })}
                  >
                    <div className="space-y-4">
                      <ReadingProse lede={false} text={lead} />
                      {focusText && (
                        <div>
                          <p className="text-caption font-semibold uppercase tracking-[0.12em] text-ink-muted mb-2">
                            {reversed
                              ? t('tarot.reversedMeaning', { defaultValue: 'Reversed meaning' })
                              : t('tarot.uprightMeaning', { defaultValue: 'Upright meaning' })}
                          </p>
                          <ReadingProse lede={false} text={traditional} />
                        </div>
                      )}
                      {card.reflectionPrompt && (
                        <blockquote className="reading-quote">{card.reflectionPrompt}</blockquote>
                      )}
                    </div>
                  </PaperDisclosure>
                )}
              </section>
            );
          })}
        </div>
      )}
      {affirmation && <AffirmationPanel text={affirmation} className="mt-8" />}
      {actions && <div className="mt-6 space-y-3">{actions}</div>}
    </ResultSheet>
  );
}
