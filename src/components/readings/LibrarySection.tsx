import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../i18n/useT';
import {
  Bookmark,
  Star,
  Layers,
  Book,
  ChevronRight,
  Calendar,
  Trash2,
  Brain,
} from 'lucide-react';
import { TarotCardIcon, PlayingCardIcon } from '../ui/NavIcons';
import { Card, Button, Chip, Tabs, Tag, Badge, Sheet, toast, ReadingProse, Paper } from '../ui';
import { SpreadGlyph } from '../icons/SpreadGlyph';
import { useAuth } from '../../context/AuthContext';
import { savedHighlights as savedHighlightsDalRef, tarotReadings as tarotReadingsDal, premiumReadings as premiumReadingsDal } from '../../dal';
import { localizeCardNameSync, prefetchCardNameIndex } from '../../i18n/localizeCard';
import { localizeSignName } from '../../i18n/localizeNames';
import { getLocale } from '../../i18n/config';
import { tArray } from '../../utils/tArray';
import { CARTO_LESSONS, getPlayingCard } from '../../data/cartomancy';
import type { ZodiacSign as ZodiacSignPC } from '../../types/astrology';
import {
  SavedReadingSheet,
  isPlayingReading,
  savedSpreadName,
  savedSpreadLayout,
  type SavedReadingRow,
} from './tarot/SavedReadingSheet';

type LibraryTab = 'saved' | 'guides' | 'ai-readings';
type SavedFilter = 'all' | 'tarot' | 'horoscope' | 'spreads';

const PAGE_SIZE = 20;

interface SavedItem {
  id: string;
  date: string;
  highlight_type: string;
  content: Record<string, unknown>;
  created_at: string;
}

type TarotReading = SavedReadingRow & { created_at: string };

interface PremiumReading {
  id: string;
  reading_type: string;
  content: string;
  context: {
    question?: string;
    focusArea?: string;
    usedLlm?: boolean;
  };
  cards: Array<{ id: number; name: string; reversed: boolean }>;
  created_at: string;
}

interface GuideSection { title: string; content: string; }
interface Guide { id: string; title: string; description: string; sections: GuideSection[]; }

/** What the confirm sheet is asking about. */
interface PendingDelete {
  type: 'highlight' | 'reading' | 'premium';
  id: string;
  label: string;
}

// Canonical guide IDs. Titles / descriptions / section content are all
// pulled from i18n (library.guides.<id>) at render time so every locale
// gets its own copy. `cartomancy-basics` is the exception: a digest of the
// playing-card lessons (src/data/cartomancy/lessons.ts), ending with a link
// to the full guide.
const GUIDE_IDS = [
  'tarot-basics', 'cartomancy-basics', 'mbti-guide', 'love-languages', 'zodiac-elements',
  'moon-phases', 'crystals-guide', 'chakras', 'numerology',
] as const;

/** Lessons 1–3 and 5: the deck, the suits, the numbers, red and black. */
const CARTO_DIGEST_SLUGS = ['the-deck-in-your-hand', 'the-four-suits', 'numbers-ace-to-ten', 'red-and-black'];

function cartomancyDigest(): GuideSection[] {
  return CARTO_DIGEST_SLUGS.map((slug) => {
    const lesson = CARTO_LESSONS.find((l) => l.slug === slug);
    if (!lesson) return { title: slug, content: '' };
    return { title: lesson.title, content: `${lesson.lede}\n\n${lesson.points.slice(0, 3).join(' ')}` };
  });
}

/** The 44px delete control every saved row carries (R5 M-8: visible, and it asks). */
function DeleteButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="shrink-0 w-11 h-11 -my-1 -mr-2 inline-flex items-center justify-center rounded-full text-mystic-400 transition-colors duration-fast [@media(hover:hover)]:[&:hover:not(:active)]:bg-coral/15 [@media(hover:hover)]:[&:hover:not(:active)]:text-coral active:text-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
    >
      <Trash2 className="w-4 h-4" aria-hidden />
    </button>
  );
}

export function LibrarySection() {
  const { t } = useT('app');
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<LibraryTab>('saved');

  // Warm the tarot deck lookup cache so card name localization hits on
  // first paint of saved reading previews.
  useEffect(() => {
    prefetchCardNameIndex();
  }, []);

  const [savedFilter, setSavedFilter] = useState<SavedFilter>('all');
  const [savedHighlights, setSavedHighlights] = useState<SavedItem[]>([]);
  const [tarotReadings, setTarotReadings] = useState<TarotReading[]>([]);
  const [premiumReadings, setPremiumReadings] = useState<PremiumReading[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [selectedTarot, setSelectedTarot] = useState<TarotReading | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Build the guide list from i18n at render time so ja/ko/zh users see
  // localized titles, descriptions, and section content. Guide ids are the
  // stable identifier; everything else is translation-driven.
  const guides: Guide[] = GUIDE_IDS.map((id) => {
    if (id === 'cartomancy-basics') {
      return {
        id,
        title: t('library.guides.cartomancy-basics.title', { defaultValue: 'Playing-card basics' }),
        description: t('library.guides.cartomancy-basics.description', { defaultValue: 'Read an ordinary deck: suits, numbers, red and black' }),
        sections: cartomancyDigest(),
      };
    }
    const title = t(`library.guides.${id}.title`, { defaultValue: id });
    const description = t(`library.guides.${id}.description`, { defaultValue: '' });
    const sections = tArray<GuideSection>(t, `library.guides.${id}.sections`, []);
    return { id, title, description, sections };
  });
  const [selectedReading, setSelectedReading] = useState<PremiumReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreHighlights, setHasMoreHighlights] = useState(false);
  const [hasMoreReadings, setHasMoreReadings] = useState(false);
  const [hasMorePremium, setHasMorePremium] = useState(false);

  useEffect(() => {
    if (user) {
      loadSavedItems();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadSavedItems = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const [highlightsRes, readingsRes, premiumRes] = await Promise.all([
        savedHighlightsDalRef.listRawForUser(user.id, { limit: PAGE_SIZE }),
        tarotReadingsDal.listSaved(user.id, { limit: PAGE_SIZE }),
        premiumReadingsDal.listRawForUser(user.id, { limit: PAGE_SIZE }),
      ]);

      // Partial results are still rendered below, so only tell the user when
      // nothing at all came back. A single failed read is logged, not toasted.
      if (!highlightsRes.ok && !readingsRes.ok && !premiumRes.ok) {
        toast(t('library.toasts.loadSavedFailed', { defaultValue: 'Couldn’t load your saved items — check your connection and open the library again.' }), 'error');
      } else if (!highlightsRes.ok || !readingsRes.ok || !premiumRes.ok) {
        console.error('[Library] Some saved items did not load', {
          highlights: highlightsRes.ok,
          readings: readingsRes.ok,
          premium: premiumRes.ok,
        });
      }

      if (highlightsRes.ok) {
        setSavedHighlights(highlightsRes.data as SavedItem[]);
        setHasMoreHighlights(highlightsRes.data.length === PAGE_SIZE);
      }

      if (readingsRes.ok) {
        setTarotReadings(readingsRes.data as TarotReading[]);
        setHasMoreReadings(readingsRes.data.length === PAGE_SIZE);
      }

      if (premiumRes.ok) {
        setPremiumReadings(premiumRes.data as PremiumReading[]);
        setHasMorePremium(premiumRes.data.length === PAGE_SIZE);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async (type: 'highlights' | 'readings' | 'premium') => {
    if (!user) return;
    setLoadingMore(true);

    try {
      if (type === 'highlights') {
        const offset = savedHighlights.length;
        const res = await savedHighlightsDalRef.listRawForUser(user.id, { limit: PAGE_SIZE, offset });
        if (res.ok) {
          setSavedHighlights(prev => [...prev, ...(res.data as SavedItem[])]);
          setHasMoreHighlights(res.data.length === PAGE_SIZE);
        } else {
          toast(t('library.toasts.loadMoreSavedFailed', { defaultValue: 'Couldn’t load more saved items — check your connection and tap Load more again.' }), 'error');
        }
      } else if (type === 'readings') {
        const offset = tarotReadings.length;
        const res = await tarotReadingsDal.listSaved(user.id, { limit: PAGE_SIZE, offset });
        if (res.ok) {
          setTarotReadings(prev => [...prev, ...(res.data as TarotReading[])]);
          setHasMoreReadings(res.data.length === PAGE_SIZE);
        } else {
          toast(t('library.toasts.loadMoreSpreadsFailed', { defaultValue: 'Couldn’t load more spreads — check your connection and tap Load more again.' }), 'error');
        }
      } else {
        const offset = premiumReadings.length;
        const res = await premiumReadingsDal.listRawForUser(user.id, { limit: PAGE_SIZE, offset });
        if (res.ok) {
          setPremiumReadings(prev => [...prev, ...(res.data as PremiumReading[])]);
          setHasMorePremium(res.data.length === PAGE_SIZE);
        } else {
          toast(t('library.toasts.loadMoreReadingsFailed', { defaultValue: 'Couldn’t load more readings — check your connection and tap Load more again.' }), 'error');
        }
      }
    } finally {
      setLoadingMore(false);
    }
  };

  /**
   * Deleting is two steps: the row's control opens a confirm sheet (the same
   * pattern as a person's delete on PersonDetailPage), and the sheet's
   * destructive button does the delete. Nothing is removed on one tap.
   */
  const confirmDelete = async () => {
    if (!user || !pendingDelete) return;
    const { type, id } = pendingDelete;
    setDeleting(true);
    try {
      const res = type === 'highlight'
        ? await savedHighlightsDalRef.deleteById(id)
        : type === 'premium'
          ? await premiumReadingsDal.deleteByIdOnly(id)
          : await tarotReadingsDal.deleteById(id, user.id);

      if (!res.ok) {
        toast(t('library.toasts.deleteFailed', { defaultValue: 'Couldn’t delete that item — check your connection and try again.' }), 'error');
      } else {
        if (type === 'highlight') {
          setSavedHighlights(prev => prev.filter(h => h.id !== id));
        } else if (type === 'premium') {
          setPremiumReadings(prev => prev.filter(r => r.id !== id));
          if (selectedReading?.id === id) setSelectedReading(null);
        } else {
          setTarotReadings(prev => prev.filter(r => r.id !== id));
          if (selectedTarot?.id === id) setSelectedTarot(null);
        }
        toast(t('library.toasts.deleted'), 'success');
      }
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  const filteredHighlights = savedFilter === 'all'
    ? savedHighlights
    : savedHighlights.filter(h => h.highlight_type === savedFilter);

  const formatDate = (dateStr: string) => {
    const localeToBcp47: Record<string, string> = { en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN' };
    return new Date(dateStr).toLocaleDateString(localeToBcp47[getLocale()] ?? 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  /** A saved reading's card names for its row: localized tarot names, or the playing cards' names. */
  const savedCardNames = (reading: TarotReading): string[] => {
    const playing = isPlayingReading(reading);
    return (reading.cards ?? []).map((c) => {
      if (playing) {
        const pc = c.cardId !== undefined ? getPlayingCard(c.cardId) : undefined;
        return pc?.name ?? c.cardName;
      }
      return localizeCardNameSync(c.cardName);
    });
  };

  return (
    <div className="space-y-6">
      <Tabs
        fill={false}
        idPrefix="library"
        aria-label={t('readings.tabs.library')}
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { id: 'saved' as const, icon: Bookmark, label: t('library.tabs.saved', { defaultValue: 'Saved' }) },
          ...(profile?.isPremium
            ? [{ id: 'ai-readings' as const, icon: Brain, label: t('library.tabs.aiReadings', { defaultValue: 'AI Readings' }) }]
            : []),
          { id: 'guides' as const, icon: Book, label: t('library.tabs.guides', { defaultValue: 'Guides' }) },
        ]}
      />

      {activeTab === 'saved' && (
        <div className="space-y-4">
          <div className="relative -mx-4 px-4">
            <div
              className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scroll-smooth"
              style={{
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {(['all', 'tarot', 'horoscope', 'spreads'] as const).map(filter => (
                <Chip
                  key={filter}
                  size="sm"
                  selected={savedFilter === filter}
                  onSelect={() => setSavedFilter(filter)}
                  label={t(`library.filters.${filter}`, { defaultValue: filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1) })}
                />
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="loading-constellation mx-auto mb-4" />
              <p className="text-mystic-400">{t('library.loading')}</p>
            </div>
          ) : (
            <>
              {(savedFilter === 'all' || savedFilter === 'spreads') && tarotReadings.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-ui font-medium text-mystic-400 flex items-center gap-2">
                    <Layers className="w-4 h-4" aria-hidden />
                    {t('library.savedSpreads', { defaultValue: 'Saved Spreads' })}
                  </h3>
                  {tarotReadings.map(reading => {
                    const playing = isPlayingReading(reading);
                    const name = savedSpreadName(t, reading.spread_type);
                    const names = savedCardNames(reading);
                    return (
                      <Card key={reading.id} padding="md" className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedTarot(reading)}
                          aria-label={t('library.openReading', { defaultValue: 'Open {{name}} from {{date}}', name, date: formatDate(reading.date) })}
                          className="flex-1 min-w-0 flex items-start gap-3 text-left rounded-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                        >
                          <span className="w-12 h-12 shrink-0 rounded-inset bg-mystic-800 text-gold inline-flex items-center justify-center" aria-hidden>
                            {playing ? (
                              <PlayingCardIcon className="w-6 h-6" />
                            ) : (
                              <SpreadGlyph layout={savedSpreadLayout(reading.spread_type, reading.cards?.length ?? 0)} />
                            )}
                          </span>
                          <span className="flex-1 min-w-0 block">
                            <span className="flex items-center gap-2 mb-1 min-w-0">
                              <span className="text-ui font-medium text-mystic-100 truncate">{name}</span>
                              {reading.focus_area && (
                                <Tag tone="neutral" size="sm">
                                  {t(`readings.focusAreas.${reading.focus_area.toLowerCase()}`, { defaultValue: reading.focus_area })}
                                </Tag>
                              )}
                            </span>
                            <span className="block text-meta text-mystic-400 line-clamp-1">
                              {names.slice(0, 3).map((n, i) => `${n}${reading.cards[i]?.reversed ? ' (R)' : ''}`).join(', ')}
                              {names.length > 3 && ` +${names.length - 3}`}
                            </span>
                            <span className="mt-1 flex items-center gap-1 text-meta text-mystic-500">
                              <Calendar className="w-3 h-3" aria-hidden />
                              {formatDate(reading.date)}
                            </span>
                          </span>
                        </button>
                        <DeleteButton
                          label={t('library.deleteReading', { defaultValue: 'Delete {{name}}', name })}
                          onClick={() => setPendingDelete({ type: 'reading', id: reading.id, label: name })}
                        />
                      </Card>
                    );
                  })}
                  {hasMoreReadings && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadMore('readings')}
                      disabled={loadingMore}
                      className="w-full"
                    >
                      {loadingMore ? t('library.loading') : t('library.loadMoreSpreads')}
                    </Button>
                  )}
                </div>
              )}

              {(savedFilter === 'all' || savedFilter === 'tarot') &&
               filteredHighlights.filter(h => h.highlight_type === 'tarot').length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-ui font-medium text-mystic-400 flex items-center gap-2">
                    <TarotCardIcon className="w-4 h-4" />
                    {t('library.savedCards', { defaultValue: 'Saved Cards' })}
                  </h3>
                  {filteredHighlights
                    .filter(h => h.highlight_type === 'tarot')
                    .map(item => {
                      const content = item.content as { card?: { name: string }; reversed?: boolean };
                      const name = content.card?.name ? localizeCardNameSync(content.card.name) : '';
                      return (
                        <Card key={item.id} padding="md" className="flex items-center gap-3">
                          <span className="w-12 h-12 shrink-0 rounded-inset bg-mystic-800 text-gold inline-flex items-center justify-center" aria-hidden>
                            <TarotCardIcon className="w-5 h-5" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-ui font-medium text-mystic-100 truncate">
                              {name}
                              {content.reversed && <span className="text-mystic-400 ml-1">({t('readings.revealView.reversed')})</span>}
                            </h4>
                            <div className="flex items-center gap-1 text-meta text-mystic-500">
                              <Calendar className="w-3 h-3" aria-hidden />
                              {formatDate(item.date)}
                            </div>
                          </div>
                          <DeleteButton
                            label={t('library.deleteReading', { defaultValue: 'Delete {{name}}', name })}
                            onClick={() => setPendingDelete({ type: 'highlight', id: item.id, label: name })}
                          />
                        </Card>
                      );
                    })}
                </div>
              )}

              {(savedFilter === 'all' || savedFilter === 'horoscope') &&
               filteredHighlights.filter(h => h.highlight_type === 'horoscope').length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-ui font-medium text-mystic-400 flex items-center gap-2">
                    <Star className="w-4 h-4" aria-hidden />
                    {t('library.savedHoroscopes', { defaultValue: 'Saved Horoscopes' })}
                  </h3>
                  {filteredHighlights
                    .filter(h => h.highlight_type === 'horoscope')
                    .map(item => {
                      const content = item.content as { zodiacSign?: string; period?: string };
                      const sign = (() => {
                        if (!content.zodiacSign) return '';
                        // DB stores either 'gemini' or 'Gemini'; localizeSignName
                        // expects Pascal case. Normalise both.
                        const pascal = content.zodiacSign.charAt(0).toUpperCase() + content.zodiacSign.slice(1).toLowerCase();
                        return localizeSignName(pascal as ZodiacSignPC);
                      })();
                      const period = (() => {
                        const p = content.period;
                        if (!p) return t('library.periodDaily', { defaultValue: 'Daily' });
                        // Translate common period values stored in the DB
                        const key = p.toLowerCase();
                        if (key === 'today' || key === 'daily') return t('library.periodDaily', { defaultValue: 'Daily' });
                        if (key === 'weekly' || key === 'week') return t('library.periodWeekly', { defaultValue: 'Weekly' });
                        if (key === 'monthly' || key === 'month') return t('library.periodMonthly', { defaultValue: 'Monthly' });
                        return p;
                      })();
                      const name = `${sign} - ${period}`;
                      return (
                        <Card key={item.id} padding="md" className="flex items-center gap-3">
                          <span className="w-12 h-12 shrink-0 rounded-inset bg-mystic-800 text-gold inline-flex items-center justify-center" aria-hidden>
                            <Star className="w-5 h-5" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-ui font-medium text-mystic-100 truncate">{name}</h4>
                            <div className="flex items-center gap-1 text-meta text-mystic-500">
                              <Calendar className="w-3 h-3" aria-hidden />
                              {formatDate(item.date)}
                            </div>
                          </div>
                          <DeleteButton
                            label={t('library.deleteReading', { defaultValue: 'Delete {{name}}', name })}
                            onClick={() => setPendingDelete({ type: 'highlight', id: item.id, label: name })}
                          />
                        </Card>
                      );
                    })}
                </div>
              )}

              {hasMoreHighlights && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadMore('highlights')}
                  disabled={loadingMore}
                  className="w-full"
                >
                  {loadingMore ? t('library.loading') : t('library.loadMoreSaved')}
                </Button>
              )}

              {filteredHighlights.length === 0 && tarotReadings.length === 0 && (
                <div className="text-center py-12">
                  <Bookmark className="w-12 h-12 text-mystic-700 mx-auto mb-3" aria-hidden />
                  <h3 className="text-ui font-medium text-mystic-300 mb-1">{t('saved.empty')}</h3>
                  <p className="text-meta text-mystic-500">{t('saved.emptySubAlt')}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'ai-readings' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="loading-constellation mx-auto mb-4" />
              <p className="text-mystic-400">{t('library.loading')}</p>
            </div>
          ) : premiumReadings.length > 0 ? (
            <div className="space-y-3">
              {premiumReadings.map(reading => {
                const name = savedSpreadName(t, reading.reading_type);
                return (
                  <Card key={reading.id} padding="md" className="flex items-start gap-3">
                    <button
                      onClick={() => setSelectedReading(reading)}
                      className="flex-1 min-w-0 text-left flex items-start gap-3 rounded-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                    >
                      <span className="w-12 h-12 shrink-0 rounded-inset bg-mystic-800 text-gold inline-flex items-center justify-center" aria-hidden>
                        <Brain className="w-5 h-5" />
                      </span>
                      <span className="flex-1 min-w-0 block">
                        <span className="flex items-center gap-2 mb-1 min-w-0">
                          <span className="text-ui font-medium text-mystic-100 truncate">{name}</span>
                          {reading.context.usedLlm && (
                            <Badge tone="violet">AI</Badge>
                          )}
                          {reading.context.focusArea && (
                            <Tag tone="neutral" size="sm" className="capitalize">
                              {reading.context.focusArea}
                            </Tag>
                          )}
                        </span>
                        <span className="block text-meta text-mystic-400 line-clamp-1">
                          {reading.cards.slice(0, 3).map((card) => `${card.name}${card.reversed ? ' (R)' : ''}`).join(', ')}
                          {reading.cards.length > 3 && ` +${reading.cards.length - 3}`}
                        </span>
                        <span className="block text-meta text-mystic-400 line-clamp-2 mt-1">
                          {reading.content.slice(0, 150)}…
                        </span>
                        <span className="mt-1 flex items-center gap-1 text-meta text-mystic-500">
                          <Calendar className="w-3 h-3" aria-hidden />
                          {formatDate(reading.created_at)}
                        </span>
                      </span>
                    </button>
                    <DeleteButton
                      label={t('library.deleteReading', { defaultValue: 'Delete {{name}}', name })}
                      onClick={() => setPendingDelete({ type: 'premium', id: reading.id, label: name })}
                    />
                  </Card>
                );
              })}
              {hasMorePremium && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadMore('premium')}
                  disabled={loadingMore}
                  className="w-full"
                >
                  {loadingMore ? t('library.loading') : t('library.loadMoreReadings')}
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Brain className="w-12 h-12 text-mystic-700 mx-auto mb-3" aria-hidden />
              <h3 className="text-ui font-medium text-mystic-300 mb-1">{t('library.empty.noAIReadings')}</h3>
              <p className="text-meta text-mystic-500">{t('library.empty.getAIFromTarot')}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'guides' && (
        <div className="space-y-3">
          {guides.map(guide => (
            <Card
              key={guide.id}
              interactive
              padding="md"
              onClick={() => setSelectedGuide(guide)}
              className="flex items-center justify-between active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 shrink-0 rounded-inset bg-mystic-800 flex items-center justify-center">
                  {guide.id === 'cartomancy-basics' ? (
                    <PlayingCardIcon className="w-5 h-5 text-gold" />
                  ) : (
                    <Book className="w-5 h-5 text-gold" aria-hidden />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-ui font-medium text-mystic-100">{guide.title}</h4>
                  <p className="text-meta text-mystic-400">{guide.description}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 shrink-0 text-mystic-500" aria-hidden />
            </Card>
          ))}
        </div>
      )}

      <Sheet
        open={!!selectedGuide}
        onClose={() => setSelectedGuide(null)}
        title={selectedGuide?.title}
      >
        {selectedGuide && (
          <div className="space-y-6">
            <p className="reading-lede">{selectedGuide.description}</p>

            <Paper>
              <div className="space-y-6">
                {selectedGuide.sections.map((section, i) => (
                  <section key={i}>
                    <h3 className="heading-display-md heading-strong text-ink flex items-baseline gap-2">
                      <span className="text-caption font-body font-semibold tabular-nums text-ink-muted">{i + 1}</span>
                      {section.title}
                    </h3>
                    <ReadingProse
                      lede={false}
                      className="mt-2"
                      text={section.content || t('library.contentComingSoon')}
                    />
                  </section>
                ))}
              </div>
            </Paper>

            {selectedGuide.id === 'cartomancy-basics' ? (
              <Link
                to="/cartomancy/guide"
                className="block w-full text-center min-h-[48px] py-3 rounded-control bg-gold text-mystic-950 font-semibold text-ui no-underline"
              >
                {t('library.guides.cartomancy-basics.readFull', { defaultValue: 'Read the twelve lessons' })}
              </Link>
            ) : (
              <p className="text-meta text-mystic-400 text-center">{t('library.continueExploring')}</p>
            )}
          </div>
        )}
      </Sheet>

      <Sheet
        open={!!selectedTarot}
        onClose={() => setSelectedTarot(null)}
        title={selectedTarot ? savedSpreadName(t, selectedTarot.spread_type) : undefined}
      >
        {selectedTarot && <SavedReadingSheet reading={selectedTarot} dateLabel={formatDate(selectedTarot.date)} />}
      </Sheet>

      <Sheet
        open={!!selectedReading}
        onClose={() => setSelectedReading(null)}
        title={t('library.aiReading', { defaultValue: 'AI reading' })}
      >
        {selectedReading && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 shrink-0 rounded-inset bg-mystic-800 text-gold inline-flex items-center justify-center" aria-hidden>
                <Brain className="w-6 h-6" />
              </span>
              <div className="min-w-0">
                <h3 className="text-ui font-medium text-mystic-100 truncate">{savedSpreadName(t, selectedReading.reading_type)}</h3>
                <p className="text-meta text-mystic-400">
                  {(() => {
                    const localeToBcp47: Record<string, string> = { en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN' };
                    return new Date(selectedReading.created_at).toLocaleDateString(localeToBcp47[getLocale()] ?? 'en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    });
                  })()}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-display-eyebrow text-mystic-400 mb-3">{t('library.reading.cardsDrawn')}</h4>
              <div className="flex flex-wrap gap-2">
                {selectedReading.cards.map((card, i) => (
                  <Tag key={i} tone="neutral" size="md" icon={<TarotCardIcon className="w-3.5 h-3.5 text-gold" />}>
                    {card.name}
                    {card.reversed && <span className="text-mystic-400 ml-1">(R)</span>}
                  </Tag>
                ))}
              </div>
            </div>

            <Paper>
              {selectedReading.context.question && (
                <div className="mb-5">
                  <h4 className="font-display-eyebrow mb-1">{t('library.reading.yourQuestion')}</h4>
                  <p className="reading-lede">{selectedReading.context.question}</p>
                </div>
              )}
              <h4 className="font-display-eyebrow mb-3">{t('library.reading.interpretation')}</h4>
              <ReadingProse text={selectedReading.content} />
              {selectedReading.context.usedLlm && (
                <p className="reading-caption text-center mt-6">
                  {t('library.reading.generatedWithAi', { defaultValue: 'Written by a model, personalized to your profile' })}
                </p>
              )}
            </Paper>
          </div>
        )}
      </Sheet>

      <Sheet
        open={!!pendingDelete}
        onClose={() => { if (!deleting) setPendingDelete(null); }}
        title={t('library.deleteConfirmTitle', { defaultValue: 'Delete this?' })}
      >
        {pendingDelete && (
          <div className="space-y-5">
            <p className="text-ui text-mystic-300">
              {t('library.deleteConfirmBody', {
                defaultValue: '{{name}} will be removed from your library. This can’t be undone.',
                name: pendingDelete.label,
              })}
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setPendingDelete(null)} disabled={deleting}>
                {t('common:actions.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button variant="destructive" className="flex-1" onClick={confirmDelete} loading={deleting}>
                {t('common:actions.delete', { defaultValue: 'Delete' })}
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
