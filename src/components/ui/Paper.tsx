import type { HTMLAttributes, ReactNode } from 'react';

export interface PaperProps extends HTMLAttributes<HTMLElement> {
  /** The element. `section` by default; `article` for a whole reading or a blog body. */
  as?: 'section' | 'article' | 'div';
  /**
   * Square the bottom corners so a `<Disclaimer tail />` rendered directly
   * after this Paper sits flush and closes the sheet with its own bottom
   * radius (one dark block at the foot of the cream sheet). The Disclaimer
   * is a sibling, not a child, so the `.paper-prose` ink remaps never reach
   * its dark surface.
   */
  tail?: boolean;
  children: ReactNode;
}

/**
 * Paper — the reading surface.
 *
 * Anything a user reads for meaning sits on cream paper with ink text,
 * directly on the navy canvas, full-bleed to the shell's 16px gutter
 * (`-mx-4`) so the sheet edge is the screen edge. It applies the
 * `.paper-prose` scope (index.css), which remaps `.reading-lede` /
 * `.reading-copy` / `.reading-meta` / `.reading-caption`, headings,
 * `strong`, `a`, `blockquote` and `.font-display-eyebrow` onto the ink
 * roles, and turns any stray `text-gold` into ink-gold — gold #d4af37 is
 * 1.82:1 on paper and may never be text here. Gold FILLS with mystic-950
 * text (the Button) are fine on paper and unchanged.
 *
 * Where it applies — one region per screen, never inside a Card:
 *   1. the reading result body (TarotRevealView result, QuickReadingPage,
 *      Forecast weekly/monthly prose, TodayForYou summary, the three report
 *      pages, ResultLayout detail for quizzes) — usually via ResultSheet;
 *   2. card meaning text (TarotCardDetail tab panels, TarotCardMeaningPage);
 *   3. lessons and quiz questions (QuizzesPage question view, LessonFrame);
 *   4. learn-entry bodies and blog bodies (`.prose-reading`).
 *
 * Where it must not apply: Home (HomeHero, ritual cards), navigation
 * (Header, BottomNav), the reading table (select / shuffle / reveal faces
 * stay on navy), the paywall and every Sheet's chrome, inputs / chips /
 * tabs / buttons (they keep their navy and gold recipes), lists of tappable
 * rows, the share image (shareCard.ts stays dark), the landing page.
 *
 * The tokens gate allows `bg-paper` in this file only: do not hand-roll a
 * cream box — compose this.
 */
export function Paper({ as: Tag = 'section', tail = false, className = '', children, ...rest }: PaperProps) {
  return (
    <Tag
      className={`paper-prose bg-paper text-ink -mx-4 px-5 py-7 ${tail ? 'rounded-t-sheet' : 'rounded-sheet'} ${className}`.trim()}
      {...rest}
    >
      {children}
    </Tag>
  );
}
