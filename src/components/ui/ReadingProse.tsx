import type { ReactNode } from 'react';

interface ReadingProseProps {
  /** The reading — generated or authored — with paragraphs separated by blank lines. */
  text: string;
  /** Set the first paragraph as a lede with a drop cap. Default true. */
  lede?: boolean;
  className?: string;
  /** Trailing content rendered inside the measure, e.g. a closing line. */
  children?: ReactNode;
}

/**
 * Every generated reading used to be one `whitespace-pre-line` container:
 * a whole multi-paragraph interpretation as a single grey block with no
 * paragraph spacing, at 14px, in an ink dimmer than its own heading. Ten
 * call sites across eight surfaces — the most valuable text the product
 * produces, and the least designed.
 *
 * This splits on blank lines and renders real paragraphs on the body tier,
 * the first as a lede with the drop cap the design system defined and
 * nothing ever applied. Single newlines are honoured as paragraph breaks
 * only when the text has no blank lines at all, so a model that separates
 * paragraphs either way reads the same.
 */
export function ReadingProse({ text, lede = true, className = '', children }: ReadingProseProps) {
  let paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length <= 1 && text.includes('\n')) {
    paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  }
  return (
    <div className={`reading-copy ${className}`.trim()}>
      {paragraphs.map((p, i) => (
        <p key={i} className={i === 0 && lede ? 'reading-lede drop-cap' : undefined}>
          {p}
        </p>
      ))}
      {children}
    </div>
  );
}
