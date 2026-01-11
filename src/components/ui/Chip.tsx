import { X, Heart, Briefcase, Compass, Sparkles, Zap, Users } from 'lucide-react';

type InsightCategory = 'love' | 'career' | 'clarity' | 'confidence' | 'growth' | 'connection';

interface ChipProps {
  label?: string;
  children?: React.ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  onClick?: () => void;
  onRemove?: () => void;
  variant?: 'default' | 'gold' | 'outline';
  size?: 'sm' | 'md';
}

interface InsightChipProps {
  category: InsightCategory;
  selected?: boolean;
  onSelect?: () => void;
  size?: 'sm' | 'md';
}

const insightConfig: Record<InsightCategory, { label: string; icon: typeof Heart; color: string; bgColor: string; borderColor: string }> = {
  love: { label: 'Love', icon: Heart, color: 'text-coral', bgColor: 'bg-coral/10', borderColor: 'border-coral/30' },
  career: { label: 'Career', icon: Briefcase, color: 'text-cosmic-blue', bgColor: 'bg-cosmic-blue/10', borderColor: 'border-cosmic-blue/30' },
  clarity: { label: 'Clarity', icon: Compass, color: 'text-teal', bgColor: 'bg-teal/10', borderColor: 'border-teal/30' },
  confidence: { label: 'Confidence', icon: Sparkles, color: 'text-gold', bgColor: 'bg-gold/10', borderColor: 'border-gold/30' },
  growth: { label: 'Growth', icon: Zap, color: 'text-teal-light', bgColor: 'bg-teal-light/10', borderColor: 'border-teal-light/30' },
  connection: { label: 'Connection', icon: Users, color: 'text-cosmic-rose', bgColor: 'bg-cosmic-rose/10', borderColor: 'border-cosmic-rose/30' },
};

export function InsightChip({ category, selected, onSelect, size = 'md' }: InsightChipProps) {
  const config = insightConfig[category];
  const Icon = config.icon;

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        inline-flex items-center rounded-full font-medium transition-all duration-200 border
        ${sizeStyles[size]}
        ${selected
          ? `${config.bgColor} ${config.color} ${config.borderColor}`
          : 'bg-mystic-800/50 text-mystic-400 border-mystic-700/50 hover:border-mystic-600'
        }
        ${onSelect ? 'cursor-pointer active:scale-95' : ''}
      `}
    >
      <Icon className={`w-3.5 h-3.5 ${selected ? config.color : ''}`} />
      {config.label}
    </button>
  );
}

export function Chip({ label, children, selected, onSelect, onClick, onRemove, variant = 'default', size = 'md' }: ChipProps) {
  const baseStyles = 'inline-flex items-center gap-1.5 rounded-full font-medium transition-all duration-200 active:scale-95 flex-shrink-0 snap-start';

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
  };

  const variantStyles = {
    default: selected
      ? 'bg-gold/20 text-gold border border-gold/30'
      : 'bg-mystic-800 text-mystic-300 border border-mystic-600/50 hover:border-mystic-500',
    gold: 'bg-gold text-mystic-950',
    outline: selected
      ? 'bg-transparent text-gold border border-gold'
      : 'bg-transparent text-mystic-300 border border-mystic-600 hover:border-mystic-400',
  };

  const handleClick = onSelect || onClick;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${handleClick ? 'cursor-pointer' : ''}`}
    >
      {children || label}
      {onRemove && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:text-coral cursor-pointer"
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
