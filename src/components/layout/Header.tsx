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
  // Shared icon-button class. `hairline-gold-soft` adds a 1px low-opacity
  // gold border that survives against any background (Celestial,
  // user-uploaded image, solid). Slightly larger touch target than the
  // pre-redesign 36×36; we want 40×40 minimum for thumb comfort.
  const iconBtn =
    'p-2.5 rounded-xl hairline-gold-soft text-mystic-300 ' +
    'transition-all duration-200 active:scale-95 backdrop-blur-sm ' +
    'hover:text-mystic-100 hover:border-gold/30 hover:bg-mystic-900/50';

  return (
    <header className="flex items-end justify-between mb-6">
      {showTitle && title ? (
        <div className="min-w-0 flex-1 pr-3">
          <h1 className="heading-display-lg text-mystic-100 truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-mystic-400 mt-1 truncate">{subtitle}</p>
          )}
        </div>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onSearchClick}
          className={iconBtn}
          aria-label={t('nav.search')}
        >
          <Search className="w-5 h-5" />
        </button>
        <button
          onClick={onSavedClick}
          className={`${iconBtn} hover:!text-gold`}
          aria-label={t('nav.saved')}
        >
          <Star className="w-5 h-5" />
        </button>
        <button
          onClick={onSettingsClick}
          className={iconBtn}
          aria-label={t('nav.settings')}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
