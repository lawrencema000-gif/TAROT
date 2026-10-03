import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { EmptyState, Input, Page, PageHeader, Sheet, Tabs } from '../components/ui';
import { PlayingCardIcon } from '../components/ui/NavIcons';
import { SuitGlyph } from '../components/cartomancy/SuitGlyph';
import { CardGrid } from '../components/cartomancy/CardGrid';
import { CartomancyCardDetail } from '../components/cartomancy/CartomancyCardDetail';
import { CARTO_SUITS, isCourtCard, isJoker, PLAYING_CARDS_ALL, PLAYING_SUITS } from '../data/cartomancy';
import type { PlayingCard, PlayingSuit } from '../types/cartomancy';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';
import { localizePlayingCard } from '../i18n/localizePlayingCard';
import { setPageMeta } from '../utils/seo';
import { CartomancyCorpusGate } from '../components/cartomancy/CartomancyCorpusGate';

/**
 * /cartomancy/cards — the library: a filter, suit tabs, and the faces in a
 * grid of four with no captions (the name is on the card). A tile opens
 * the card's detail sheet for a member and the card's own page for a
 * visitor (shot-07 pattern, §6.4).
 */

type Filter = 'all' | PlayingSuit | 'courts' | 'jokers';

const FILTERS: Filter[] = ['all', 'hearts', 'diamonds', 'clubs', 'spades', 'courts', 'jokers'];

function suitIcon(suit: PlayingSuit): ComponentType<{ className?: string }> {
  return function Icon({ className }: { className?: string }) {
    return <SuitGlyph suit={suit} size={16} className={className} />;
  };
}

const SUIT_ICONS = Object.fromEntries(PLAYING_SUITS.map((s) => [s, suitIcon(s)])) as Record<PlayingSuit, ComponentType<{ className?: string }>>;

function CartomancyCardsPageBody() {
  const { t } = useT('app');
  const navigate = useNavigate();
  const { user } = useAuth();
  const locale = getLocale();
  const localize = useCallback((card: PlayingCard) => localizePlayingCard(card, locale), [locale]);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [needle, setNeedle] = useState('');
  const [detail, setDetail] = useState<PlayingCard | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setNeedle(query.trim().toLowerCase()), 120);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPageMeta(
      t('cartomancy.seo.cardsTitle', { defaultValue: 'Playing Card Meanings — All 52 Cards and the Jokers' }),
      t('cartomancy.seo.cardsDesc', { defaultValue: 'The meaning of every playing card in cartomancy: Hearts, Diamonds, Clubs and Spades, Ace to King, with the two Jokers.' }),
    );
  }, [t]);

  const localized = useMemo(() => PLAYING_CARDS_ALL.map((card) => ({ card, view: localize(card) })), [localize]);

  const shown = useMemo(() => {
    const byFilter = localized.filter(({ card }) => {
      if (filter === 'all') return true;
      if (filter === 'courts') return isCourtCard(card);
      if (filter === 'jokers') return isJoker(card);
      return card.suit === filter;
    });
    if (!needle) return byFilter.map((x) => x.card);
    return byFilter
      .filter(({ view }) => view.name.toLowerCase().includes(needle) || view.keywords.some((k) => k.toLowerCase().includes(needle)))
      .map((x) => x.card);
  }, [localized, filter, needle]);

  const suitInfo = filter !== 'all' && filter !== 'courts' && filter !== 'jokers' ? CARTO_SUITS.find((s) => s.id === filter) : null;
  const intro =
    filter === 'courts'
      ? t('cartomancy.cards.courtsDesc', { defaultValue: 'Jacks, Queens and Kings: the people in a reading, by role rather than by looks.' })
      : filter === 'jokers'
        ? t('cartomancy.cards.jokersDesc', { defaultValue: 'Two optional cards: the wild card and the trickster. Off by default in a reading.' })
        : suitInfo
          ? t(`cartomancy.suits.${suitInfo.id}.desc`, { defaultValue: suitInfo.domain })
          : null;

  const labelFor = (f: Filter) =>
    f === 'all'
      ? t('cartomancy.cards.filterAll', { defaultValue: 'All' })
      : f === 'courts'
        ? t('cartomancy.cards.courts', { defaultValue: 'Courts' })
        : f === 'jokers'
          ? t('cartomancy.cards.jokers', { defaultValue: 'Jokers' })
          : t(`cartomancy.suits.${f}.title`, { defaultValue: f.charAt(0).toUpperCase() + f.slice(1) });

  const open = (card: PlayingCard) => {
    if (user) setDetail(card);
    else navigate(`/cartomancy/cards/${card.slug}`);
  };

  return (
    <Page spacing="md">
      <PageHeader
        eyebrow={t('cartomancy.cards.eyebrow', { defaultValue: '{{count}} cards', count: PLAYING_CARDS_ALL.length })}
        title={t('cartomancy.cards.hub', { defaultValue: 'Card meanings' })}
        backHref="/cartomancy"
        onBack={(e) => {
          e.preventDefault();
          navigate('/cartomancy');
        }}
        backLabel={t('cartomancy.title', { defaultValue: 'Playing cards' })}
      />

      <Input
        type="search"
        label={t('cartomancy.cards.filterLabel', { defaultValue: 'Filter cards' })}
        aria-label={t('cartomancy.cards.filterLabel', { defaultValue: 'Filter cards' })}
        placeholder={t('cartomancy.cards.filterPlaceholder', { defaultValue: 'Filter by name or keyword' })}
        icon={<Search className="w-4 h-4" aria-hidden />}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />

      <Tabs<Filter>
        fill
        size="sm"
        idPrefix="carto-cards"
        aria-label={t('cartomancy.cards.bySuit', { defaultValue: 'By suit' })}
        value={filter}
        onChange={(f) => {
          setFilter(f);
          setQuery('');
        }}
        items={FILTERS.map((f) =>
          f === 'all' || f === 'courts' || f === 'jokers'
            ? { id: f, label: labelFor(f) }
            : { id: f, label: <span className="sr-only">{labelFor(f)}</span>, icon: SUIT_ICONS[f], 'aria-label': labelFor(f) },
        )}
      />

      {intro && <p className="text-ui text-mystic-300">{intro}</p>}

      {shown.length === 0 ? (
        <EmptyState
          icon={<PlayingCardIcon />}
          title={t('cartomancy.cards.noMatch', { defaultValue: 'No card matches that' })}
          description={t('cartomancy.cards.noMatchHint', { defaultValue: 'Try a suit, a rank or a keyword like “money”.' })}
        />
      ) : (
        <CardGrid cards={shown} localize={localize} onSelect={open} hrefFor={(card) => `/cartomancy/cards/${card.slug}`} />
      )}

      <Sheet open={!!detail} onClose={() => setDetail(null)} title={detail ? localize(detail).name : undefined}>
        {detail && <CartomancyCardDetail card={detail} localize={localize} sequence={shown.length > 1 ? shown : undefined} onNavigate={setDetail} />}
      </Sheet>
    </Page>
  );
}

/** The page, once the playing-card corpus for the active locale is loaded (English: at once). */
export function CartomancyCardsPage() {
  return (
    <CartomancyCorpusGate>
      <CartomancyCardsPageBody />
    </CartomancyCorpusGate>
  );
}
