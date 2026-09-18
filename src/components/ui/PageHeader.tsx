import { HTMLAttributes, ReactNode, forwardRef, type MouseEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import { EyebrowLabel, SectionDivider } from './Ornament';

/**
 * The top of a screen.
 *
 * 63 pages hand-wrote this block and 39 of them hand-rolled the back
 * button on top of it, so no two screens open the same way: some titles
 * are `heading-display-xl`, some are `text-2xl font-bold`, the back
 * affordance is a 16px hit area on one page and a 44px one on the next,
 * and the eyebrow appears above the title on Home but below it on
 * People. None of that variation carries meaning. It is just what
 * happens when the header is copy-pasted rather than imported.
 *
 * The shape is fixed here: back row, eyebrow, title, subtitle, optional
 * action on the right. Everything except `title` is optional, so a page
 * with nothing but a title still uses this and still lands on the same
 * baseline as its neighbours.
 *
 * Router-free by design. Pass `onBack` (usually `() => navigate(-1)`)
 * for a button, or `backHref` for a real link when the destination is a
 * known URL and middle-click should work. Pass both for a link that also
 * navigates client-side: the anchor keeps its href for crawlers and
 * modified clicks, and `onBack` receives the click to preventDefault and
 * push the route (LearnEntryTemplate does this).
 */

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** The screen title. Rendered in the display serif. */
  title: ReactNode;
  /** Small gold kicker above the title (`EyebrowLabel`). */
  eyebrow?: ReactNode;
  /** One line of muted body copy under the title. */
  subtitle?: ReactNode;
  /** Back handler. Renders a button. Ignored when `backHref` is set. */
  onBack?: (e: MouseEvent<HTMLElement>) => void;
  /** Back destination. Renders an anchor instead of a button. */
  backHref?: string;
  /** Text beside the back arrow. Default "Back". */
  backLabel?: string;
  /** Right-hand slot, level with the title. Buttons, a menu, a count. */
  action?: ReactNode;
  /** Icon rendered in a gold tile beside the title, as on Glossary and Spreads. */
  icon?: ReactNode;
  /** Heading level. Default `h1`; use `h2` when the page already has one. */
  as?: 'h1' | 'h2';
  align?: 'left' | 'center';
  /** Close the header with a `SectionDivider`. Default false. */
  divider?: boolean;
}

const backClass =
  'inline-flex items-center gap-2 -ml-2 px-2 min-h-[44px] rounded-lg ' +
  'text-sm text-mystic-400 transition-colors ' +
  'hover:text-mystic-200 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-mystic-950';

export const PageHeader = forwardRef<HTMLElement, PageHeaderProps>(
  (
    {
      title,
      eyebrow,
      subtitle,
      onBack,
      backHref,
      backLabel = 'Back',
      action,
      icon,
      as: Heading = 'h1',
      align = 'left',
      divider = false,
      className = '',
      ...props
    },
    ref,
  ) => {
    const centered = align === 'center';
    const showBack = Boolean(backHref || onBack);

    return (
      <header ref={ref} className={`space-y-3 ${className}`} {...props}>
        {showBack && (
          backHref ? (
            <a href={backHref} onClick={onBack} className={backClass}>
              <ArrowLeft className="w-4 h-4" aria-hidden />
              {backLabel}
            </a>
          ) : (
            <button type="button" onClick={onBack} className={backClass}>
              <ArrowLeft className="w-4 h-4" aria-hidden />
              {backLabel}
            </button>
          )
        )}

        <div
          className={`flex gap-4 ${centered ? 'flex-col items-center text-center' : 'items-start justify-between'}`}
        >
          <div className={`min-w-0 space-y-1.5 ${centered ? 'w-full' : 'flex-1'}`}>
            {eyebrow && (
              <EyebrowLabel align={centered ? 'center' : 'left'} className="block">
                {eyebrow}
              </EyebrowLabel>
            )}
            <div className={`flex items-center gap-3 ${centered ? 'justify-center' : ''}`}>
              {icon && (
                <span
                  className="w-10 h-10 shrink-0 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold [&>svg]:w-5 [&>svg]:h-5"
                  aria-hidden
                >
                  {icon}
                </span>
              )}
              <Heading className="heading-display-xl text-mystic-100 min-w-0">{title}</Heading>
            </div>
            {subtitle && (
              <p className={`text-sm text-mystic-400 leading-relaxed ${centered ? '' : 'max-w-prose'}`}>
                {subtitle}
              </p>
            )}
          </div>

          {action && <div className={`shrink-0 ${centered ? '' : 'pt-1'}`}>{action}</div>}
        </div>

        {divider && <SectionDivider tone="gold" />}
      </header>
    );
  },
);

PageHeader.displayName = 'PageHeader';
