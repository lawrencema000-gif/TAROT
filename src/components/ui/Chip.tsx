import type { ReactNode } from 'react';
import { X, Heart, Briefcase, Compass, Flame, Zap, Users } from 'lucide-react';

/**
 * Three small round things, three jobs. They looked like one thing with
 * sixty-three hand-rolled spellings, so here is the rule:
 *
 *   Chip   a choice. You tap it and something is selected or filtered.
 *          It is a <button>, it has a focus ring, and its selected state
 *          is the ONE gold-tint treatment (bg-gold/20 on a gold/30
 *          hairline) — six variations of that were in circulation.
 *   Tag    a label. Keyword, element, zodiac sign. Read-only: a <span>,
 *          tinted in its tone, no border, nothing to press.
 *   Badge  a status. LIVE, PREMIUM, RARE, NEW. Uppercase, tracked, tiny;
 *          the thing you read before the thing it is stuck to.
 *
 * A chip given no handler renders as a Tag-shaped span rather than an inert
 * button: forty hand-rolled "chips" were keywords nobody could press.
 */

export type Tone = 'neutral' | 'gold' | 'teal' | 'coral' | 'blue' | 'violet' | 'rose';

const TINT: Record<Tone, string> = {
  neutral: 'bg-mystic-800 text-mystic-300',
  gold: 'bg-gold/10 text-gold',
  teal: 'bg-teal/10 text-teal',
  coral: 'bg-coral/10 text-coral',
  blue: 'bg-cosmic-blue/15 text-cosmic-blue',
  violet: 'bg-cosmic-violet/15 text-cosmic-violet',
  rose: 'bg-cosmic-rose/15 text-cosmic-rose',
};

type InsightCategory = 'love' | 'career' | 'clarity' | 'confidence' | 'growth' | 'connection';

interface ChipProps {
  label?: string;
  children?: ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  onClick?: () => void;
  onRemove?: () => void;
  variant?: 'default' | 'gold' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  /** Leading icon, sized to the chip. */
  icon?: ReactNode;
  /** A dead chip: still visible, not pressable, announced as disabled. */
  disabled?: boolean;
  /** Accessible name when the label is an icon or a glyph. */
  'aria-label'?: string;
  title?: string;
  className?: string;
}

interface InsightChipProps {
  category: InsightCategory;
  selected?: boolean;
  onSelect?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

// A chip is small, so it takes a slightly deeper press than a button (0.96 vs
// 0.97) to register at that size, and it is `motion-safe:` for the same reason:
// the global reduce-motion block zeroes the duration but not the transform.
const CHIP_MOTION =
  'transition-[transform,background-color,border-color,color] duration-fast ease-[cubic-bezier(0.22,0.8,0.25,1)] ' +
  'select-none touch-manipulation [-webkit-tap-highlight-color:transparent]';

const CHIP_PRESS = 'cursor-pointer motion-safe:active:scale-[0.96]';

// Chips are buttons and had no focus treatment at all — a keyboard user
// tabbing a filter row could not tell where they were. Rule: motion may never
// be the thing that hides focus, so the ring is stated explicitly and is not
// part of any transition that could fade it out.
const CHIP_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-mystic-950';

// One size scale for every chip, on the role type scale.
const CHIP_SIZE = {
  sm: 'px-2.5 py-1 text-caption gap-1',
  md: 'px-4 py-2 text-ui gap-1.5',
  lg: 'px-5 py-2.5 text-body gap-2',
};

const insightConfig: Record<InsightCategory, { label: string; icon: typeof Heart; color: string; bgColor: string; borderColor: string }> = {
  love: { label: 'Love', icon: Heart, color: 'text-coral', bgColor: 'bg-coral/10', borderColor: 'border-coral/30' },
  career: { label: 'Career', icon: Briefcase, color: 'text-cosmic-blue', bgColor: 'bg-cosmic-blue/10', borderColor: 'border-cosmic-blue/30' },
  clarity: { label: 'Clarity', icon: Compass, color: 'text-teal', bgColor: 'bg-teal/10', borderColor: 'border-teal/30' },
  confidence: { label: 'Confidence', icon: Flame, color: 'text-gold', bgColor: 'bg-gold/10', borderColor: 'border-gold/30' },
  growth: { label: 'Growth', icon: Zap, color: 'text-teal-light', bgColor: 'bg-teal-light/10', borderColor: 'border-teal-light/30' },
  connection: { label: 'Connection', icon: Users, color: 'text-cosmic-rose', bgColor: 'bg-cosmic-rose/10', borderColor: 'border-cosmic-rose/30' },
};

export function InsightChip({ category, selected, onSelect, size = 'md' }: InsightChipProps) {
  const config = insightConfig[category];
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`
        inline-flex items-center rounded-full font-medium border
        ${CHIP_MOTION} ${CHIP_FOCUS}
        ${CHIP_SIZE[size]}
        ${selected
          ? `${config.bgColor} ${config.color} ${config.borderColor}`
          : 'bg-mystic-800/50 text-mystic-400 border-mystic-700/50 [@media(hover:hover)]:[&:hover:not(:active)]:border-mystic-600'
        }
        ${onSelect ? CHIP_PRESS : ''}
      `}
    >
      <Icon className={`w-3.5 h-3.5 ${selected ? config.color : ''}`} aria-hidden />
      {config.label}
    </button>
  );
}

export function Chip({
  label,
  children,
  selected,
  onSelect,
  onClick,
  onRemove,
  variant = 'default',
  size = 'md',
  icon,
  disabled,
  title,
  className = '',
  ...aria
}: ChipProps) {
  const baseStyles =
    `inline-flex items-center rounded-full font-medium flex-shrink-0 snap-start ${CHIP_MOTION}`;
  const iconNode = icon ? <span className="inline-flex shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5" aria-hidden>{icon}</span> : null;

  const variantStyles = {
    default: selected
      ? 'bg-gold/20 text-gold border border-gold/30'
      : 'bg-mystic-800 text-mystic-300 border border-mystic-600/50 [@media(hover:hover)]:[&:hover:not(:active)]:border-mystic-500',
    gold: 'bg-gold text-mystic-950',
    outline: selected
      ? 'bg-transparent text-gold border border-gold'
      : 'bg-transparent text-mystic-300 border border-mystic-600 [@media(hover:hover)]:[&:hover:not(:active)]:border-mystic-400',
  };

  const handleClick = onSelect || onClick;
  const classes = `${baseStyles} ${CHIP_SIZE[size]} ${variantStyles[variant]} ${className}`;

  // Inert: a label, not a control. No focus ring, no press, not a button.
  if (!handleClick && !onRemove) {
    return (
      <span className={classes} title={title} aria-label={aria['aria-label']}>
        {iconNode}
        {children || label}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={title}
      aria-label={aria['aria-label']}
      aria-pressed={selected !== undefined ? selected : undefined}
      className={`${classes} ${CHIP_FOCUS} ${handleClick && !disabled ? CHIP_PRESS : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {iconNode}
      {children || label}
      {/* inline-flex, not the default inline: transform has no effect on a
          non-replaced inline box, so the press would otherwise be silent. */}
      {onRemove && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 inline-flex items-center cursor-pointer transition-colors duration-fast ease-[cubic-bezier(0.22,0.8,0.25,1)] motion-safe:active:scale-90 [@media(hover:hover)]:[&:hover:not(:active)]:text-coral active:text-coral"
        >
          <X className="w-3 h-3" />
        </span>
      )}
    </button>
  );
}

interface ChipGroupProps {
  options: { label: string; value: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multiple?: boolean;
}

export function ChipGroup({ options, selected, onChange, multiple = false }: ChipGroupProps) {
  const handleSelect = (value: string) => {
    if (multiple) {
      if (selected.includes(value)) {
        onChange(selected.filter(v => v !== value));
      } else {
        onChange([...selected, value]);
      }
    } else {
      onChange([value]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(option => (
        <Chip
          key={option.value}
          label={option.label}
          selected={selected.includes(option.value)}
          onSelect={() => handleSelect(option.value)}
        />
      ))}
    </div>
  );
}

export interface TagProps {
  children: ReactNode;
  tone?: Tone;
  size?: 'sm' | 'md';
  icon?: ReactNode;
  className?: string;
}

/** A read-only label: keyword, element, sign, category. Tinted, borderless, a span. */
export function Tag({ children, tone = 'neutral', size = 'sm', icon, className = '' }: TagProps) {
  const sz = size === 'sm' ? 'px-2 py-0.5 text-caption gap-1' : 'px-2.5 py-1 text-meta gap-1.5';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sz} ${TINT[tone]} ${className}`.trim()}>
      {icon}
      {children}
    </span>
  );
}

export interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  /** A breathing dot before the label, for LIVE and other now-things. */
  pulse?: boolean;
  className?: string;
}

/** A status: LIVE, PREMIUM, RARE, NEW. Uppercase, tracked, tiny. */
export function Badge({ children, tone = 'gold', pulse = false, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-caption font-semibold uppercase tracking-wider ${TINT[tone]} ${className}`.trim()}
    >
      {pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" aria-hidden />}
      {children}
    </span>
  );
}
