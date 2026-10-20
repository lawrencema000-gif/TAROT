import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, Brain, Clock } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { HoroscopeWheelIcon, PlayingCardIcon, TarotCardIcon } from '../ui/NavIcons';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Section } from '../ui/Section';
import { ListRow, ListRowGroup, type ListRowProps } from '../ui/ListRow';
import { EmptyState } from '../ui/EmptyState';
import { ListSkeleton } from '../ui/Skeleton';
import { ZodiacGlyph } from '../icons/ZodiacIcons';
import { cardMeaningPath } from '../readings/tarot/cardSlug';
import { calendarDay } from '../readings/tarot/readingDates';
import { useAuth } from '../../context/AuthContext';
import { useFeatureFlag } from '../../context/FeatureFlagContext';
import { useT } from '../../i18n/useT';
import { getLocale } from '../../i18n/config';
import {
  clearRecentSearches,
  globalSearch,
  loadJournalForSearch,
  loadRecentSearches,
  rememberSearch,
  type SearchResult,
  type SearchResults,
} from '../../services/search';
import type { JournalEntryRow } from '../../dal/journalEntries';

interface SearchSheetProps {
  open: boolean;
  onClose: () => void;
}

interface QuickLink {
  icon: ComponentType<{ className?: string }>;
  labelKey: string;
  path: string;
  state?: { tab: string };
}

/** The screens a member reaches most from here. The journal's prompts are its Templates tab. */
const quickLinks: QuickLink[] = [
  { icon: HoroscopeWheelIcon, labelKey: 'search.quickLink.horoscope', path: '/horoscope' },
  { icon: BookOpen, labelKey: 'search.quickLink.journalPrompts', path: '/journal', state: { tab: 'templates' } },
  { icon: Brain, labelKey: 'search.quickLink.personalityQuiz', path: '/quizzes' },
];

/** The page a result opens: a card's or a sign's page; an entry in the journal, which reads `entryId`. */
function destination(result: SearchResult): { path: string; state?: { entryId: string } } {
  switch (result.type) {
    case 'card':
      return { path: cardMeaningPath(result.cardId) };
    case 'playing-card':
      return { path: `/cartomancy/cards/${result.slug}` };
    case 'sign':
      return { path: `/astrology/${result.sign.toLowerCase()}` };
    case 'journal':
      return { path: '/journal', state: { entryId: result.id } };
  }
}

/**
 * The header search: the tarot and playing-card meanings, the zodiac signs
 * and the member's journal, in the language the app is in (services/search).
 * A result opens its page and closes the sheet. "Recent searches" are this
 * member's own on this device — a search is kept when a result is opened or
 * the search key pressed — and can be cleared.
 *
 * It used to search nothing: every query read "results for … will appear
 * here", a member who had never searched saw three made-up recent searches,
 * and the quick links did nothing (p10 d3-ko-13).
 */
export function SearchSheet({ open, onClose }: SearchSheetProps) {
  const { t } = useT(['app', 'common']);
  const { user } = useAuth();
  const navigate = useNavigate();
  const playingCards = useFeatureFlag('cartomancy');
  const locale = getLocale();
  const userId = user?.id ?? null;
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  // The member's newest entries, read on the first search of each opening:
  // undefined until they are in, null when they could not be read.
  const [journal, setJournal] = useState<JournalEntryRow[] | null | undefined>(undefined);
  const journalRead = useRef<Promise<void> | null>(null);
  const [found, setFound] = useState<{ query: string; results: SearchResults } | null>(null);
  const q = query.trim();

  // Every opening starts clean (an empty box, this member's own searches,
  // the journal read afresh), before paint, so the last query never flashes.
  useLayoutEffect(() => {
    if (!open) return;
    setQuery('');
    setFound(null);
    setJournal(undefined);
    journalRead.current = null;
    setRecent(loadRecentSearches(userId));
  }, [open, userId]);

  const readJournal = useCallback(() => {
    if (!userId) return;
    const read: Promise<void> = loadJournalForSearch(userId).then((rows) => {
      if (journalRead.current === read) setJournal(rows);
    });
    journalRead.current = read;
  }, [userId]);

  useEffect(() => {
    if (open && q && journal === undefined && !journalRead.current) readJournal();
  }, [open, q, journal, readJournal]);

  // The cards and signs come in at once; the journal's entries join the
  // results when they arrive. A language change searches again.
  useEffect(() => {
    if (!q) return;
    let live = true;
    void globalSearch(q, { playingCards, journal }).then((results) => {
      if (live) setFound({ query: q, results });
    });
    return () => {
      live = false;
    };
  }, [q, playingCards, journal, locale]);

  const results = found?.results ?? null;
  const total = results ? results.cards.length + results.playingCards.length + results.signs.length + results.journal.length : 0;
  // Nothing more is coming for this query: its results are in, and so is the journal (or it failed).
  const settled = !!found && found.query === q && !(userId && journal === undefined);

  const dateFmt = useMemo(() => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }), [locale]);

  const openResult = (result: SearchResult) => {
    setRecent(rememberSearch(userId, q));
    const { path, state } = destination(result);
    onClose();
    navigate(path, state ? { state } : undefined);
  };

  const openLink = (link: QuickLink) => {
    onClose();
    navigate(link.path, link.state ? { state: link.state } : undefined);
  };

  const clearRecent = () => {
    clearRecentSearches(userId);
    setRecent([]);
  };

  const retryJournal = () => {
    journalRead.current = null;
    setJournal(undefined);
  };

  const row = (r: SearchResult): Pick<ListRowProps, 'icon' | 'tone' | 'label' | 'meta'> => {
    switch (r.type) {
      case 'card':
        return {
          icon: <TarotCardIcon />,
          tone: 'gold',
          label: r.title,
          meta: r.suit ? t('tarot.suitMinorLabel', { suit: t(`tarot.${r.suit}`) }) : t('tarot.majorArcana'),
        };
      case 'playing-card':
        return {
          icon: <PlayingCardIcon />,
          tone: 'blue',
          label: r.title,
          meta: r.suit === 'joker' ? t('cartomancy.suits.joker', { defaultValue: 'Joker' }) : t(`cartomancy.suits.${r.suit}.title`),
        };
      case 'sign':
        return { icon: <ZodiacGlyph sign={r.sign} aria-hidden />, tone: 'violet', label: r.title };
      case 'journal': {
        const day = dateFmt.format(calendarDay(r.date));
        return {
          icon: <BookOpen />,
          tone: 'teal',
          label: r.title || r.excerpt || day,
          meta: (
            <>
              <span className="block tabular-nums">{day}</span>
              {r.title && r.excerpt && <span className="block truncate">{r.excerpt}</span>}
            </>
          ),
        };
      }
    }
  };

  const group = (title: string, items: SearchResult[]) =>
    items.length > 0 && (
      <Section headingLevel="h3" spacing="sm" title={title}>
        <ListRowGroup>
          {items.map((r) => (
            <ListRow key={`${r.type}:${r.id}`} {...row(r)} onClick={() => openResult(r)} />
          ))}
        </ListRowGroup>
      </Section>
    );

  return (
    <Sheet open={open} onClose={onClose} title={t('common:nav.search')}>
      <div className="space-y-6">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (q) setRecent(rememberSearch(userId, q));
          }}
        >
          <Input
            type="search"
            placeholder={t('search.placeholder')}
            aria-label={t('common:nav.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            icon={<Search className="w-5 h-5" aria-hidden />}
            enterKeyHint="search"
            autoComplete="off"
            autoFocus
          />
        </form>

        <p className="sr-only" role="status">
          {q && settled ? t('search.resultCount', { count: total, defaultValue: '{{count}} results' }) : ''}
        </p>

        {!q ? (
          <>
            {recent.length > 0 && (
              <Section
                headingLevel="h3"
                spacing="sm"
                title={
                  <span className="inline-flex items-center gap-2">
                    <Clock className="w-4 h-4" aria-hidden />
                    {t('search.recentSearches')}
                  </span>
                }
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearRecent}
                    aria-label={t('search.clearRecentLabel', { defaultValue: 'Clear recent searches' })}
                  >
                    {t('search.clearRecent', { defaultValue: 'Clear' })}
                  </Button>
                }
              >
                <ListRowGroup>
                  {recent.map((search) => (
                    <ListRow key={search} label={search} trailing="none" onClick={() => setQuery(search)} />
                  ))}
                </ListRowGroup>
              </Section>
            )}

            <Section headingLevel="h3" spacing="sm" title={t('search.quickLinks')}>
              <ListRowGroup>
                {quickLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <ListRow key={link.labelKey} icon={<Icon />} tone="gold" label={t(link.labelKey)} onClick={() => openLink(link)} />
                  );
                })}
              </ListRowGroup>
            </Section>
          </>
        ) : !results || (total === 0 && !settled) ? (
          <div role="status" aria-busy="true" aria-label={t('common:labels.loading', { defaultValue: 'Loading…' })}>
            <ListSkeleton count={3} />
          </div>
        ) : total === 0 ? (
          <EmptyState
            variant="inline"
            icon={<Search />}
            title={t('search.noResults', { query: q, defaultValue: 'Nothing matches ‘{{query}}’' })}
            description={t('search.noResultsHint', { defaultValue: 'Try a card’s name, a zodiac sign or a word from your journal.' })}
          />
        ) : (
          <div className="space-y-6">
            {group(t('search.groups.tarot', { defaultValue: 'Tarot cards' }), results.cards)}
            {group(t('search.groups.playing', { defaultValue: 'Playing cards' }), results.playingCards)}
            {group(t('search.groups.signs', { defaultValue: 'Zodiac signs' }), results.signs)}
            {group(t('search.groups.journal', { defaultValue: 'Your journal' }), results.journal)}
          </div>
        )}

        {q && journal === null && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-meta text-mystic-400">
              {t('search.journalFailed', { defaultValue: 'Couldn’t search your journal — check your connection.' })}
            </p>
            <Button variant="ghost" size="sm" onClick={retryJournal}>
              {t('common:actions.retry', { defaultValue: 'Try again' })}
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
