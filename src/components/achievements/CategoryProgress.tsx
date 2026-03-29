import * as LucideIcons from 'lucide-react';
import type { AchievementCategory } from '../../services/achievements';
import { getCategoryDisplayName, getCategoryIcon } from '../../services/achievements';

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
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <button
      onClick={onSelect}
      className={`
        flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-300
        ${isSelected
          ? 'bg-gold/10 border border-gold/30'
          : 'bg-mystic-800/30 border border-transparent hover:bg-mystic-700/30'
        }
      `}
    >
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-mystic-700/50"
          />
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`
              transition-all duration-700 ease-out
              ${isSelected ? 'text-gold' : 'text-mystic-400'}
            `}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className={`
            w-5 h-5 transition-colors duration-300
            ${isSelected ? 'text-gold' : 'text-mystic-400'}
          `} />
        </div>
      </div>

      <div className="text-center">
        <p className={`
          text-[10px] font-medium transition-colors duration-300
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
