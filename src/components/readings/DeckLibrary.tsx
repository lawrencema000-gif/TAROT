import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Disclosure, Input, PageHeader, Tabs, TarotFace } from '../ui';
import { SUIT_GLYPHS, type SuitKey } from '../icons/SuitGlyphs';
import { useT } from '../../i18n/useT';
import type { TarotCard } from '../../types';

/**
 * DeckLibrary — the 78 cards as a library.
 *
 *   header ("Card meanings" · eyebrow "78 cards") → a search field →
 *   suit tabs (All · crown · wand · cup · sword · pentacle) → one lede
 *   line about the suit, with "About the suit" opening the rest →
 *   a three-column grid of faces, nothing else.
 *
 * Each tile is a TarotFace and only a TarotFace: no surface box, no
 * caption — the name is on the plate (R5 m-10). The grid is three across
 * on a phone (tiles ≈111px), four at `sm`, six at `lg`. Used by the public
 * /tarot-meanings page (tiles navigate) and by the reading flow's browse
 * sheet (tiles open the card detail); the caller decides what a tap does.
 *
 * The search matches the localized name and keywords, 120ms after the
 * last keystroke, and is cleared when the suit changes.
 */

export type DeckFilter = 'all' | SuitKey;

const FILTERS: DeckFilter[] = ['all', 'major', 'wands', 'cups', 'swords', 'pentacles'];

const SUIT_LABEL_KEY: Record<SuitKey, string> = {
  major: 'tarot.majorArcana',
  wands: 'tarot.wands',
  cups: 'tarot.cups',
  swords: 'tarot.swords',
  pentacles: 'tarot.pentacles',
};

const DEBOUNCE_MS = 120;

export interface DeckLibraryProps {
  /** The deck, localized by the caller (localizeCards / getAllTarotCards). */
  cards: TarotCard[];
  onSelect: (card: TarotCard) => void;
  /** Render the PageHeader. Off inside a Sheet, which carries its own title. */
  showHeader?: boolean;
  /** The starting suit (a deep link from a breadcrumb). */
  initialFilter?: DeckFilter;
  /** Something after the grid: the public page's closing call to action. */
  footer?: ReactNode;
  className?: string;
}

function matches(card: TarotCard, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  if (card.name.toLowerCase().includes(needle)) return true;
  return card.keywords.some((k) => k.toLowerCase().includes(needle));
}

export function DeckLibrary({
  cards,
  onSelect,
  showHeader = false,
  initialFilter = 'all',
  footer,
  className = '',
}: DeckLibraryProps) {
  const { t } = useT('app');
  const [filter, setFilter] = useState<DeckFilter>(initialFilter);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query]);

  const changeFilter = (next: DeckFilter) => {
    setFilter(next);
    setQuery('');
    setDebounced('');
  };

  const shown = useMemo(() => {
    const bySuit =
      filter === 'all'
        ? cards
        : filter === 'major'
          ? cards.filter((c) => c.arcana === 'major')
          : cards.filter((c) => c.suit === filter);
    return bySuit.filter((c) => matches(c, debounced));
  }, [cards, filter, debounced]);

  const tabs = FILTERS.map((id) => {
    if (id === 'all') return { id, label: t('tarot.allCards', { defaultValue: 'All' }) };
    const Glyph = SUIT_GLYPHS[id];
    return {
      id,
      label: <Glyph className="w-5 h-5" />,
      'aria-label': t(SUIT_LABEL_KEY[id]),
    };
  });

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      {showHeader && (
        <PageHeader
          eyebrow={t('tarot.deckCount', { defaultValue: '78 cards' })}
          title={t('tarot.libraryTitle', { defaultValue: 'Card meanings' })}
        />
      )}

      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('tarot.filterCards', { defaultValue: 'Filter cards' })}
        aria-label={t('tarot.filterCards', { defaultValue: 'Filter cards' })}
        icon={<Search className="w-4 h-4" aria-hidden />}
        autoComplete="off"
        enterKeyHint="search"
      />

      <Tabs<DeckFilter>
        fill
        size="sm"
        idPrefix="deck"
        aria-label={t('tarot.suits.label', { defaultValue: 'Suit' })}
        value={filter}
        onChange={changeFilter}
        items={tabs}
      />

      {filter !== 'all' && (
        <div className="space-y-2">
          <p className="reading-lede">{t(`tarot.suits.${filter}.subtitle`)}</p>
          <Disclosure variant="row" label={t('tarot.aboutSuit', { defaultValue: 'About the suit' })}>
            <p className="reading-copy">{t(`tarot.suits.${filter}.desc`)}</p>
          </Disclosure>
        </div>
      )}

      {shown.length === 0 ? (
        <p className="text-ui text-mystic-400 text-center py-10">
          {t('tarot.noMatches', { defaultValue: 'No card matches that.' })}
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6" aria-label={t('tarot.libraryTitle', { defaultValue: 'Card meanings' })}>
          {shown.map((card) => (
            <li key={card.id} className="min-w-0">
              <button
                type="button"
                onClick={() => onSelect(card)}
                aria-label={card.name}
                className="block w-full rounded-inset transition-transform duration-fast motion-safe:hover:scale-[1.03] motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
              >
                <TarotFace card={card} size="fill" loading="lazy" alt="" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {footer}
    </div>
  );
}
