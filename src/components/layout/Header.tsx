import { Search, Star, Settings } from 'lucide-react';
import { useT } from '../../i18n/useT';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onSearchClick: () => void;
  onSavedClick: () => void;
  onSettingsClick: () => void;
  showTitle?: boolean;
}

export function Header({
  title,
  subtitle,
  onSearchClick,
  onSavedClick,
  onSettingsClick,
  showTitle = true,
}: HeaderProps) {
  const { t } = useT();
  return (
    <header className="flex items-center justify-between mb-6">
      {showTitle && title ? (
        <div>
          <h1 className="font-display text-2xl font-semibold text-mystic-100">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-mystic-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={onSearchClick}
          className="p-2.5 rounded-xl text-mystic-400 hover:text-mystic-200 hover:bg-mystic-800/50 transition-all duration-200 active:scale-95"
          aria-label={t('nav.search')}
        >
          <Search className="w-5 h-5" />
        </button>
        <button
          onClick={onSavedClick}
          className="p-2.5 rounded-xl text-mystic-400 hover:text-gold hover:bg-mystic-800/50 transition-all duration-200 active:scale-95"
          aria-label={t('nav.saved')}
        >
          <Star className="w-5 h-5" />
        </button>
        <button
          onClick={onSettingsClick}
          className="p-2.5 rounded-xl text-mystic-400 hover:text-mystic-200 hover:bg-mystic-800/50 transition-all duration-200 active:scale-95"
          aria-label={t('nav.settings')}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
