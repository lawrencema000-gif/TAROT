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
  // user-uploaded image, solid). The fill is opaque `mystic-900` rather than
  // a blur over whatever is behind: elevation is fill. 44×44 touch target.
  const iconBtn =
    'p-3 rounded-control hairline-gold-soft text-mystic-300 bg-mystic-900 ' +
    'transition-all duration-base active:scale-95 ' +
    'hover:text-mystic-100 hover:border-gold/30 hover:bg-mystic-850';

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
