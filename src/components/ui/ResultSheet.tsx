import type { ReactNode } from 'react';
import { useT } from '../../i18n/useT';
import { Paper } from './Paper';
import { Disclaimer, type DisclaimerKind } from './Disclaimer';
import { EyebrowLabel, StarDivider } from './Ornament';

export interface ResultSheetProps {
  /**
   * A 28px line glyph above the eyebrow: a suit glyph for a card
   * (SuitGlyphs), the sun for a horoscope, a key for a question — drawn in
   * src/components/icons, never an emoji. Decorative; hidden from AT.
   */
  glyph?: ReactNode;
  /** The context label: "Your question", "{name}’s question", "Today, {sign}". */
  eyebrow: string;
  /** The question as typed, or the concept. Renders in the bold display serif. */
  title: string;
  /**
   * Two to four sentences: for an AI reading its first paragraph, for a
   * card reading the spread's one-line synthesis. Omit and the summary
   * block (heading + lede) is not rendered.
   */
  summary?: string;
  /** Heading over the summary. Default "Reading summary" (common:resultSheet.summaryHeading). */
  summaryHeading?: string;
  /** Which Disclaimer closes the sheet. Omit for a sheet that is not the end of a reading. */
  disclaimer?: DisclaimerKind;
  /**
   * The body: per-card sections, KeywordRows, ReadingProse, the
   * AffirmationPanel, the actions. Buttons keep their own fills on paper.
   */
  children?: ReactNode;
  /**
   * h1 by default: on a result screen the title IS the page title (the
   * same rule as ResultLayout). Pass h2 only when the page already has an
   * h1 above the sheet; the summary heading then steps down to h3.
   */
  headingLevel?: 'h1' | 'h2';
  className?: string;
}

/**
 * ResultSheet — the reading result, in the order anyone reads it.
 *
 *   glyph → eyebrow (ink) → title (bold serif) → ✦ ✦ ✦ →
 *   "Reading summary" → lede → body → Disclaimer
 *
 * Composes Paper, EyebrowLabel, StarDivider and Disclaimer. One per
 * screen, directly on the canvas, after the chrome and the reading table
 * (the faces stay on navy above it). Use it for: the tarot reveal result,
 * QuickReadingPage, TodayForYou's theme and summary, Forecast, the report
 * pages. Not for: quiz verdicts (ResultLayout owns the navy verdict block
 * and takes a `footer={<Disclaimer kind="quiz" />}`), card meanings
 * (Paper + KeywordRow + AffirmationPanel directly), or anything that is
 * not the end of a reading.
 */
export function ResultSheet({
  glyph,
  eyebrow,
  title,
  summary,
  summaryHeading,
  disclaimer,
  children,
  headingLevel = 'h1',
  className = '',
}: ResultSheetProps) {
  const { t } = useT('common');
  const Title = headingLevel;
  const Summary = headingLevel === 'h1' ? 'h2' : 'h3';
  return (
    <>
      <Paper as="article" tail={Boolean(disclaimer)} className={className}>
        <header className="text-center">
          {glyph && (
            <div
              className="mx-auto mb-3 flex h-7 w-7 items-center justify-center text-gold [&>svg]:h-7 [&>svg]:w-7"
              aria-hidden
            >
              {glyph}
            </div>
          )}
          <EyebrowLabel tone="ink">{eyebrow}</EyebrowLabel>
          <Title className="heading-display-lg heading-strong text-ink text-center mt-2 text-balance">{title}</Title>
        </header>
        <StarDivider />
        {summary && (
          <section className="text-center">
            <Summary className="heading-display-md heading-strong text-ink text-center">
              {summaryHeading ?? t('resultSheet.summaryHeading', { defaultValue: 'Reading summary' })}
            </Summary>
            <p className="reading-lede mx-auto mt-3">{summary}</p>
          </section>
        )}
        {/* One reading column: the body sits under the centred header at the
            prose measure instead of hugging the sheet's left edge on desktop. */}
        {children && <div className={`mx-auto max-w-[66ch] ${summary ? 'mt-7' : ''}`.trim()}>{children}</div>}
      </Paper>
      {disclaimer && <Disclaimer kind={disclaimer} tail />}
    </>
  );
}
