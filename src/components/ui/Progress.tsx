import type { ReactNode } from 'react';

/**
 * Progress: how much of a thing is done, as a bar or a ring.
 *
 * There were twenty-eight hand-drawn bars on six track heights with five
 * different ideas about how the fill should move (and one that did not
 * move), plus four ring recipes. Two of the bars showed the same XP number
 * at different heights on different gradients. One primitive, one motion:
 * the fill transitions its width on the deliberate duration, and nothing
 * else transitions. Both shapes announce themselves as progress bars.
 */

export type ProgressTone = 'gold' | 'neutral' | 'teal' | 'coral' | 'blue' | 'violet' | 'rose';

const FILL: Record<ProgressTone, string> = {
  gold: 'bg-gold',
  neutral: 'bg-mystic-500',
  teal: 'bg-teal',
  coral: 'bg-coral',
  blue: 'bg-cosmic-blue',
  violet: 'bg-cosmic-violet',
  rose: 'bg-cosmic-rose',
};

const STROKE: Record<ProgressTone, string> = {
  gold: 'text-gold',
  neutral: 'text-mystic-500',
  teal: 'text-teal',
  coral: 'text-coral',
  blue: 'text-cosmic-blue',
  violet: 'text-cosmic-violet',
  rose: 'text-cosmic-rose',
};

export interface ProgressProps {
  value: number;
  max?: number;
  /** Track height: sm 6px, md 8px, lg 12px. */
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  tone?: ProgressTone;
  /** `gradient` keeps the gold sweep for the one bar that earns it (a level bar). Colour is `tone`. */
  variant?: 'gradient';
  /** Accessible name, e.g. "Level progress". */
  label?: string;
  className?: string;
}

const TRACK_H = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' };

function clamp(value: number, max: number) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.min(Math.max((value / max) * 100, 0), 100);
}

export function Progress({
  value,
  max = 100,
  size = 'md',
  showLabel,
  tone = 'gold',
  variant,
  label,
  className = '',
}: ProgressProps) {
  const percentage = clamp(value, max);
  const fill = variant === 'gradient' ? 'bg-gradient-to-r from-gold-dark via-gold to-gold-light' : FILL[tone];

  return (
    <div className={`w-full ${className}`.trim()}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(Math.max(value, 0), max)}
        className={`w-full bg-mystic-800 rounded-full overflow-hidden ${TRACK_H[size]}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-deliberate ease-out ${fill}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-meta text-mystic-400 text-right tabular-nums">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
}

export interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  tone?: ProgressTone;
  label?: string;
  children?: ReactNode;
}

export function ProgressRing({ value, max = 100, size = 80, strokeWidth = 6, tone = 'gold', label, children }: ProgressRingProps) {
  const percentage = clamp(value, max);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(Math.max(value, 0), max)}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          className="text-mystic-700"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`${STROKE[tone]} transition-[stroke-dashoffset] duration-deliberate ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
