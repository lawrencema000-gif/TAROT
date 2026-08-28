import { HTMLAttributes, ReactNode, forwardRef } from 'react';
import { EyebrowLabel, HairlineRule } from './Ornament';

/**
 * A titled region of a page that is not a box.
 *
 * This is the component whose absence produced the wall of cards. A page
 * that needs to say "here is a group of things, and here is what the
 * group is" had exactly one tool for the job, `Card`, so every group got
 * a border, a background and 20px of padding whether it wanted them or
 * not. Forty competing panel recipes grew out of that, and a screen with
 * six ideas on it reads as six identical slabs.
 *
 * `Section` gives the heading and the rhythm without the container. The
 * children can be anything: a grid, a scroller, a list of rows, or a
 * single `Card` where a card genuinely helps. Nesting a card inside a
 * section is fine. Nesting a section inside a card is a sign the section
 * should have been the outer element.
 *
 * `spacing` controls the gap below the heading block, not around the
 * section. Vertical rhythm between sections stays with the page, which
 * usually already sets `space-y-*`.
 */

export interface SectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Heading for the region. Omit for an untitled group that still wants the rhythm. */
  title?: ReactNode;
  /** Small gold kicker above the title. */
  eyebrow?: ReactNode;
  /** A line or two under the title, saying what the region is for. */
  description?: ReactNode;
  /** Right-hand slot level with the title. A "See all" link, a count, a toggle. */
  action?: ReactNode;
  /** Hairline above the heading, for separating stacked sections. Default false. */
  divider?: boolean;
  /** Heading level. Default `h2`. */
  headingLevel?: 'h2' | 'h3' | 'h4';
  /** Gap between the heading block and the content. Default `md`. */
  spacing?: 'sm' | 'md' | 'lg';
  /** Class applied to the content wrapper rather than the section element. */
  contentClassName?: string;
}

const spacingStyles: Record<NonNullable<SectionProps['spacing']>, string> = {
  sm: 'mt-2',
  md: 'mt-4',
  lg: 'mt-6',
};

// h2 and h3 share a size on purpose. The level is a document-structure
// decision (a section inside a section is still a section); the visual
// step is carried by the surrounding spacing, not by shrinking type
// until it stops being readable.
const headingStyles: Record<NonNullable<SectionProps['headingLevel']>, string> = {
  h2: 'heading-display-lg text-mystic-100',
  h3: 'heading-display-md text-mystic-100',
  h4: 'heading-display-md text-mystic-200',
};

export const Section = forwardRef<HTMLElement, SectionProps>(
  (
    {
      title,
      eyebrow,
      description,
      action,
      divider = false,
      headingLevel: Heading = 'h2',
      spacing = 'md',
      className = '',
      contentClassName = '',
      children,
      ...props
    },
    ref,
  ) => {
    const hasHeading = Boolean(title || eyebrow || description || action);

    return (
      <section ref={ref} className={className} {...props}>
        {divider && <HairlineRule tone="mystic" className="mb-5" />}

        {hasHeading && (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              {eyebrow && (
                <EyebrowLabel align="left" className="block">
                  {eyebrow}
                </EyebrowLabel>
              )}
              {title && <Heading className={headingStyles[Heading]}>{title}</Heading>}
              {description && (
                <p className="text-sm text-mystic-400 leading-relaxed max-w-prose">{description}</p>
              )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        )}

        {children != null && (
          <div className={`${hasHeading ? spacingStyles[spacing] : ''} ${contentClassName}`}>
            {children}
          </div>
        )}
      </section>
    );
  },
);

Section.displayName = 'Section';
