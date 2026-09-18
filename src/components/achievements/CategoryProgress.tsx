import * as LucideIcons from 'lucide-react';
import type { AchievementCategory } from '../../services/achievements';
import { getCategoryDisplayName, getCategoryIcon } from '../../services/achievements';
import { ProgressRing } from '../ui';

interface CategoryProgressProps {
  category: AchievementCategory;
  unlocked: number;
  total: number;
  isSelected?: boolean;
  onSelect?: () => void;
}

function getIcon(iconName: string): React.ElementType {
  const pascalCase = iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  const icons = LucideIcons as unknown as Record<string, React.ElementType>;
  return icons[pascalCase] || LucideIcons.Circle;
}

export function CategoryProgress({
  category,
  unlocked,
  total,
  isSelected = false,
  onSelect,
}: CategoryProgressProps) {
  const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;
  const Icon = getIcon(getCategoryIcon(category));

  return (
    <button
      onClick={onSelect}
      className={`
        flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-slow
        ${isSelected
          ? 'bg-gold/10 border border-gold/30'
          : 'bg-mystic-800/30 border border-transparent hover:bg-mystic-700/30'
        }
      `}
    >
      <ProgressRing
        value={percentage}
        size={40}
        strokeWidth={3}
        tone={isSelected ? 'gold' : 'neutral'}
        label={getCategoryDisplayName(category)}
      >
        <Icon className={`
          w-5 h-5 transition-colors duration-slow
          ${isSelected ? 'text-gold' : 'text-mystic-400'}
        `} />
      </ProgressRing>

      <div className="text-center">
        <p className={`
          text-[10px] font-medium transition-colors duration-slow
          ${isSelected ? 'text-gold' : 'text-mystic-400'}
        `}>
          {getCategoryDisplayName(category)}
        </p>
        <p className="text-[10px] text-mystic-500">
          {unlocked}/{total}
        </p>
      </div>
    </button>
  );
}
