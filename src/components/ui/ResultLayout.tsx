import { HTMLAttributes, ReactNode, forwardRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Disclosure } from './Disclosure';
import { EyebrowLabel } from './Ornament';

/**
 * The answer first, then the working.
 *
 * Every result screen in the app has the same defect. A quiz result is
 * six to eleven stacked cards, and the sentence the user actually asked
 * for is somewhere in the third one. Bazi, Ziwei, Human Design and the
 * reports do the same thing: they present the analysis in the order it
 * was computed rather than in the order anyone reads it.
 *
 * This layout fixes the order. One verdict block that leads and can be
 * screenshotted on its own, the actions that belong to it, then the
 * detail behind a single disclosure. The detail is not cut; it moves
 * one tap away. A page keeps stacking whatever it likes inside
 * `children`, and the cost of that stack drops to nothing because it
 * starts closed.
 *
 * Pass `detailOpen`/`onDetailOpenChange` if the screen wants the full
 * reading expanded by default for returning users.
 */

export interface ResultLayoutProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Small gold kicker above the verdict. The quiz name, the spread, the date. */
  eyebrow?: ReactNode;
  /** The answer. One line, in the display serif. */
  verdict: ReactNode;
  /**
   * Heading level for the verdict. Defaults to h1: on a result screen the
   * verdict IS the page title, and the app shell no longer renders one (the
   * title-ownership pass removed it). Pass h2 only when the page already
   * has an h1 above the result.
   */
  as?: 'h1' | 'h2';
  /** A short qualifier under the verdict. The archetype, the element, the score. */
  subtitle?: ReactNode;
  /** The paragraph that earns the verdict. Two or three sentences, not the whole reading. */
  summary?: ReactNode;
  /** Sigil, emoji or type badge, rendered in a medallion above the verdict. */
  glyph?: ReactNode;
  /** Back handler, usually "start over" or "back to quizzes". */
  onBack?: () => void;
  backLabel?: string;
  /** Save, share, retake. Sits directly under the verdict block. */
  actions?: ReactNode;
  /** Label on the disclosure holding `children`. Default "Read the full reading". */
  detailLabel?: string;
  /** Trailing count or hint on the disclosure row. */
  detailMeta?: ReactNode;
  detailOpen?: boolean;
  defaultDetailOpen?: boolean;
  onDetailOpenChange?: (open: boolean) => void;
  /** Anything that belongs after the detail. Related readings, a disclaimer. */
  footer?: ReactNode;
}

export const ResultLayout = forwardRef<HTMLDivElement, ResultLayoutProps>(
  (
    {
      eyebrow,
      as: Heading = 'h1',
      verdict,
      subtitle,
      summary,
      glyph,
      onBack,
      backLabel = 'Back',
      actions,
      detailLabel = 'Read the full reading',
      detailMeta,
      detailOpen,
      defaultDetailOpen = false,
      onDetailOpenChange,
      footer,
      className = '',
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <div ref={ref} className={`space-y-5 ${className}`} {...props}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="
              inline-flex items-center gap-2 -ml-2 px-2 min-h-[44px] rounded-lg
              text-sm text-mystic-400 transition-colors hover:text-mystic-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50
              focus-visible:ring-offset-2 focus-visible:ring-offset-mystic-950
            "
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            {backLabel}
          </button>
        )}

        {/* The verdict block is the one place on a result screen that is
            allowed to be loud: a gold hairline and a black drop-shadow,
            no halo. Everything below it stays flat so this reads as the
            top of the hierarchy rather than one card among many. */}
        <section
          className="
            rounded-card border border-gold/25 bg-mystic-800
            px-6 py-8 space-y-3
          "
        >
          {glyph && (
            <div
              className="
                w-24 h-24 mx-auto rounded-full flex items-center justify-center
                bg-gradient-to-br from-gold/25 to-mystic-800 border border-gold/30
                text-gold font-display text-3xl
                [&>svg]:w-10 [&>svg]:h-10
              "
              aria-hidden
            >
              {glyph}
            </div>
          )}
          {eyebrow && <EyebrowLabel align="center" className="block text-center">{eyebrow}</EyebrowLabel>}
          <Heading className="heading-display-xl text-mystic-100 text-center">{verdict}</Heading>
          {subtitle && <p className="text-ui text-gold/80 text-center">{subtitle}</p>}
          {/* Centring stops at the single-line material above. The summary
              is prose and can wrap to three lines, so it is set as a
              left-aligned lede on the body tier; the measure sits centred
              under the verdict but the text inside it is ragged-right. */}
          {summary && (
            <div className="reading-copy text-left mx-auto pt-2">
              <p className="reading-lede">{summary}</p>
            </div>
          )}
        </section>

        {actions && <div className="flex gap-3">{actions}</div>}

        {children != null && (
          <Disclosure
            label={detailLabel}
            meta={detailMeta}
            open={detailOpen}
            defaultOpen={defaultDetailOpen}
            onOpenChange={onDetailOpenChange}
            lazy
            contentClassName="space-y-4 pt-1"
          >
            {children}
          </Disclosure>
        )}

        {footer}
      </div>
    );
  },
);

ResultLayout.displayName = 'ResultLayout';
