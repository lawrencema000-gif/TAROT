/**
 * A placeholder block for a reading that is still being written onto the
 * paper sheet.
 *
 * The shared `<Skeleton>` is a navy sweep made for the navy canvas; on
 * cream it reads as a row of dark bars, and it loops — and nothing on a
 * reading surface loops. This one is the paper hairline tone, still. The
 * quick reading and the rune cast both draw their loading sheet with it.
 */
export function PaperBlock({ w, h, className = '' }: { w: number | string; h: number; className?: string }) {
  return (
    <div
      aria-hidden
      className={`bg-paper-hairline rounded-inset ${className}`.trim()}
      style={{ width: typeof w === 'number' ? `${w}px` : w, height: `${h}px` }}
    />
  );
}
