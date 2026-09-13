import { Search, Star, Settings } from 'lucide-react';
import { useT } from '../../i18n/useT';

interface HeaderProps {
  onSearchClick: () => void;
  onSavedClick: () => void;
  onSettingsClick: () => void;
}

export function Header({
  onSearchClick,
  onSavedClick,
  onSettingsClick,
}: HeaderProps) {
  const { t } = useT();
  // Shared icon-button class. `hairline-gold-soft` adds a 1px low-opacity
  // gold border that survives against any background (Celestial,
  // user-uploaded image, solid). Slightly larger touch target than the
  // pre-redesign 36×36; we want 40×40 minimum for thumb comfort.
  const iconBtn =
    'p-2.5 rounded-xl hairline-gold-soft text-mystic-300 ' +
    'transition-all duration-base active:scale-95 backdrop-blur-sm ' +
    'hover:text-mystic-100 hover:border-gold/30 hover:bg-mystic-900/50';

  return (
    <header className="flex items-end justify-between mb-6">
      {/* The shell used to render its own h1 + tagline here, above a page
          that then rendered a second h1 — four of five primary tabs titled
          themselves twice, and every deep route wore "Today / Your daily
          ritual awaits" over its own header. PageHeader owns the title now;
          this row is the three actions and nothing else. */}
      <div />

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
