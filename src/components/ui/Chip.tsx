import { X, Heart, Briefcase, Compass, Flame, Zap, Users } from 'lucide-react';

type InsightCategory = 'love' | 'career' | 'clarity' | 'confidence' | 'growth' | 'connection';

interface ChipProps {
  label?: string;
  children?: React.ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  onClick?: () => void;
  onRemove?: () => void;
  variant?: 'default' | 'gold' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

interface InsightChipProps {
  category: InsightCategory;
  selected?: boolean;
  onSelect?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

// Motion tokens — literals, pending the theme tokens. See Button.tsx for the
// full note. fast = 120ms, out = cubic-bezier(0.22,0.8,0.25,1).
//
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

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        inline-flex items-center rounded-full font-medium border
        ${CHIP_MOTION} ${CHIP_FOCUS}
        ${sizeStyles[size]}
        ${selected
          ? `${config.bgColor} ${config.color} ${config.borderColor}`
          : 'bg-mystic-800/50 text-mystic-400 border-mystic-700/50 [@media(hover:hover)]:[&:hover:not(:active)]:border-mystic-600'
        }
        ${onSelect ? CHIP_PRESS : ''}
      `}
    >
      <Icon className={`w-3.5 h-3.5 ${selected ? config.color : ''}`} />
      {config.label}
    </button>
  );
}

export function Chip({ label, children, selected, onSelect, onClick, onRemove, variant = 'default', size = 'md' }: ChipProps) {
  // The press used to fire on every chip including the inert ones, so a
  // read-only tag shrank when you poked it and promised an action it did not
  // have. It is now attached to `handleClick`.
  const baseStyles =
    `inline-flex items-center gap-1.5 rounded-full font-medium flex-shrink-0 snap-start ${CHIP_MOTION} ${CHIP_FOCUS}`;

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

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

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${handleClick ? CHIP_PRESS : ''}`}
    >
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
