import type { ReactNode } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { ResultSheet, Tag, KeywordRow, ReadingProse, AffirmationPanel, Disclosure } from '../../ui';
import { SUIT_GLYPHS, suitKeyFor } from '../../icons/SuitGlyphs';
import { useT } from '../../../i18n/useT';
import { useContentOverlay } from '../../../i18n/contentOverlay';
import type { TarotCard } from '../../../types';
import { aiReadingSections } from '../../cartomancy/cartoFlow';
import { FOCUS_AREA_I18N_KEY, type FocusArea } from './types';
import {
  affirmationFor,
  focusMeaningFor,
  hasMoreThan,
  joinSentences,
  sentencesOf,
  splitLede,
  summarySentencesFrom,
  synthesisFor,
  uprightFocusFor,
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
 *
 * A focus reading (Love, Career, Money) leads with the card's focus
 * meaning only when one is written for the card's orientation. Most love
 * and career texts read the upright card; a reversed card with no reversed
 * focus text leads with its reversed meaning, and the upright focus text
 * waits in the full meaning under a label that says so.
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
  // The affirmations' translations; the English stands until the overlay lands.
  const { overlay: enrichment } = useContentOverlay('enrichment');
  const first = cards[0];
  const Glyph = first ? SUIT_GLYPHS[suitKeyFor(first.card)] : null;
  const ai = aiInterpretation ? splitLede(aiInterpretation) : null;
  const summary = ai
    ? ai.lede
    : synthesisFor(cards, selectedFocus, (name, sentence) =>
        t('readings.result.cardLead', { name, sentence, defaultValue: '{{name}}: {{sentence}}' }),
      );
  const affirmation = first ? affirmationFor(first.card.id, enrichment) : undefined;
  const asked = Boolean(question && question.trim());
  // A saved row's focus is free text in the table: name it only when it is one of ours.
  const focusKey = selectedFocus ? FOCUS_AREA_I18N_KEY[selectedFocus] : undefined;
  const focusName = focusKey ? t(focusKey) : selectedFocus ?? '';

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
        ai.rest ? <AiReadingSections text={ai.rest} /> : null
      ) : (
        <div className="space-y-8">
          {cards.map(({ card, reversed }, i) => {
            const focusText = focusMeaningFor(card, selectedFocus, reversed);
            const uprightFocus = uprightFocusFor(card, selectedFocus, reversed);
            const traditional = reversed ? card.meaningReversed : card.meaningUpright;
            const lead = focusText ?? traditional;
            // The section continues where the summary stopped, so no sentence is printed twice.
            const taken = summarySentencesFrom(i, cards.length);
            const short = joinSentences(sentencesOf(lead).slice(taken, taken + 2));
            const more =
              hasMoreThan(lead, taken + 2) || Boolean(focusText) || Boolean(uprightFocus) || Boolean(card.reflectionPrompt);
            return (
              <section key={i} aria-label={`${getPositionLabel(i)}: ${card.name}`}>
                <div className="text-center">
                  <Tag tone="neutral" size="md">{getPositionLabel(i)}</Tag>
                  <h3 className="heading-display-md heading-strong text-title text-ink mt-3 lining-nums">{card.name}</h3>
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
                  <Disclosure surface="paper" variant="row" lazy
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
                      {uprightFocus && (
                        <div>
                          <p className="text-caption font-semibold uppercase tracking-[0.12em] text-ink-muted mb-2">
                            {t('readings.result.uprightFocusLabel', {
                              focus: focusName,
                              defaultValue: '{{focus}}, when the card is upright',
                            })}
                          </p>
                          <ReadingProse lede={false} text={uprightFocus} />
                        </div>
                      )}
                      {card.reflectionPrompt && (
                        <blockquote className="reading-quote">{card.reflectionPrompt}</blockquote>
                      )}
                    </div>
                  </Disclosure>
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

/**
 * An AI reading's body under its summary, as the model laid it out: each
 * block under its own heading — the numbering dropped, since the summary
 * took "1) Overview" and the rest read "2) Past — …", "3) Present — …" —
 * and a block of "- " lines as a list. It was printed raw: "2) Past — Ace
 * of Pentacles (Reversed)" with no 1), the actions as hyphens (p9 Q10).
 * The playing-card result reads the same shape the same way
 * (cartoFlow.aiReadingSections). `headingLevel`: the level under the
 * surface's own headings (h3 under the result sheet's h2).
 */
export function AiReadingSections({ text, headingLevel = 'h3' }: { text: string; headingLevel?: 'h3' | 'h4' | 'h5' }) {
  const sections = aiReadingSections(text);
  if (sections.length === 0) return null;
  const Heading = headingLevel;
  return (
    <div className="space-y-5">
      {sections.map((section, i) => (
        <section key={i}>
          {section.heading && <Heading className="text-ui font-semibold text-ink lining-nums">{section.heading}</Heading>}
          {section.items ? (
            <ul className={`reading-copy list-disc space-y-1.5 pl-5 marker:text-ink-muted ${section.heading ? 'mt-1' : ''}`}>
              {section.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          ) : section.body ? (
            <ReadingProse text={section.body} lede={false} className={section.heading ? 'mt-1' : ''} />
          ) : null}
        </section>
      ))}
    </div>
  );
}
