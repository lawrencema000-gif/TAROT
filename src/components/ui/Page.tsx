import type { HTMLAttributes } from 'react';

/**
 * Page: the column a screen's content stacks in.
 *
 * Forty-four pages opened with a bare `space-y-{4|5|6} pb-{6|28|32}` div —
 * nine combinations of two numbers, chosen per page. The bottom padding
 * was each page's private guess at how much room the fixed bottom nav
 * needs; three guessed differently and one guessed wrong (`pb-6` leaves
 * the last card under the nav). The shell owns that clearance — its
 * wrapper carries `pb-nav`, 6rem plus the safe-area inset — so a page
 * declares only its rhythm.
 *
 * Width is not a prop on purpose: the shell sets the measure, and the SEO
 * pages that re-declared `max-w-3xl mx-auto px-4` inside a `<main>` that
 * already had it were doubling up.
 */

export interface PageProps extends HTMLAttributes<HTMLDivElement> {
  /** Vertical rhythm between the page's top-level blocks. Default md (24px). */
  spacing?: 'sm' | 'md' | 'lg';
}

const SPACING = { sm: 'space-y-4', md: 'space-y-6', lg: 'space-y-8' };

export function Page({ spacing = 'md', className = '', children, ...props }: PageProps) {
  return (
    <div className={`${SPACING[spacing]} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
