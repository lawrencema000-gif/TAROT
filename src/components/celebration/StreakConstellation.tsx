import { useMemo } from 'react';

/**
 * The streak as a constellation.
 *
 * A streak used to be a number next to a flame, and its celebration a
 * shower of random tri-colour stars — the two most generic ways to say
 * "you came back". But the product has the real record: one row per night
 * in daily_rituals, with the three parts of the ritual as three flags.
 * That is a sky. Each night is a star, lit by how much of the ritual was
 * done: a full four-point star for a completed night, a smaller dim one for
 * a partial, a faint point for a night missed. Consecutive lit nights are
 * joined by hairlines, so a streak reads as a figure, and the gap where it
 * broke is visible as a gap.
 *
 * Deterministic: the star positions come from the day index, not from
 * Math.random, so the figure is the same every time it is opened. Drawn in
 * currentColor, one path for the lines and one group for the stars; a
 * fortnight costs nothing.
 */

export interface ConstellationNight {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** 0 = missed, 1–3 = parts done. */
  parts: 0 | 1 | 2 | 3;
  completed: boolean;
}

export interface StreakConstellationProps {
  nights: ConstellationNight[];
  /** ISO date of today, to mark the current night. */
  today: string;
  className?: string;
  /** Height in viewBox units; the width is 320. */
  height?: number;
  /**
   * Accessible name. Without it the figure is decorative (aria-hidden): the
   * caption beside it already says how many nights were completed, and a
   * screen reader should hear that once, in the user's language.
   */
  label?: string;
}

const W = 320;

function star(cx: number, cy: number, r: number): string {
  const i = r * 0.34;
  return `M${cx} ${cy - r}L${cx + i} ${cy - i}L${cx + r} ${cy}L${cx + i} ${cy + i}L${cx} ${cy + r}L${cx - i} ${cy + i}L${cx - r} ${cy}L${cx - i} ${cy - i}Z`;
}

/** A quiet, fixed wander for the y positions so the figure is not a straight line. */
const WANDER = [0.42, 0.68, 0.3, 0.58, 0.76, 0.46, 0.24, 0.62, 0.38, 0.72, 0.5, 0.28, 0.66, 0.44, 0.7, 0.34, 0.56, 0.26, 0.6, 0.48, 0.74, 0.36];

export function StreakConstellation({ nights, today, className = '', height = 140, label }: StreakConstellationProps) {
  const { lines, stars } = useMemo(() => {
    const n = Math.max(nights.length, 1);
    const pad = 22;
    const step = n > 1 ? (W - pad * 2) / (n - 1) : 0;
    const pts = nights.map((night, i) => ({
      x: pad + i * step,
      y: 18 + WANDER[i % WANDER.length] * (height - 36),
      lit: night.parts > 0,
      night,
    }));
    const segs: string[] = [];
    for (let i = 1; i < pts.length; i++) {
      if (pts[i - 1].lit && pts[i].lit) segs.push(`M${pts[i - 1].x.toFixed(1)} ${pts[i - 1].y.toFixed(1)}L${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`);
    }
    return { lines: segs.join(''), stars: pts };
  }, [nights, height]);

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      className={className}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: false })}
    >
      <g fill="none" stroke="currentColor">
        <path d={lines} strokeWidth="0.8" opacity="0.5" strokeLinecap="round" />
      </g>
      <g>
        {stars.map(({ x, y, night }, i) => {
          const isToday = night.date === today;
          if (night.parts === 0) {
            return <circle key={i} cx={x} cy={y} r={isToday ? 2.2 : 1.4} fill="currentColor" opacity={isToday ? 0.55 : 0.25} />;
          }
          const r = night.completed ? 7 : 4.5;
          return (
            <g key={i} opacity={night.completed ? 1 : 0.7}>
              {isToday && <circle cx={x} cy={y} r={r + 5} fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.5" strokeDasharray="1.5 2.5" />}
              <path d={star(x, y, r)} fill="currentColor" fillOpacity={night.completed ? 0.9 : 0.35} stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
