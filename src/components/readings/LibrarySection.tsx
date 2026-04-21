import { useState, useEffect } from 'react';
import { useT } from '../../i18n/useT';
import {
  Bookmark,
  Sparkles,
  Star,
  Layers,
  Book,
  ChevronRight,
  Calendar,
  Trash2,
  Brain,
} from 'lucide-react';
import { Card, Button, Chip, Sheet, toast } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { savedHighlights as savedHighlightsDalRef, tarotReadings as tarotReadingsDal, premiumReadings as premiumReadingsDal } from '../../dal';
import { localizeCardNameSync } from '../../i18n/localizeCard';
import { localizeSignName } from '../../i18n/localizeNames';
import { getLocale } from '../../i18n/config';
import type { ZodiacSign as ZodiacSignPC } from '../../types/astrology';

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

interface TarotReading {
  id: string;
  date: string;
  spread_type: string;
  focus_area: string;
  cards: Array<{ cardName: string; reversed: boolean; position: string }>;
  created_at: string;
}

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

// Canonical guide IDs. Titles / descriptions / section content are all
// pulled from i18n (library.guides.<id>) at render time so every locale
// gets its own copy.
const GUIDE_IDS = [
  'tarot-basics', 'mbti-guide', 'love-languages', 'zodiac-elements',
  'moon-phases', 'crystals-guide', 'chakras', 'numerology',
] as const;

export function LibrarySection() {
  const { t } = useT('app');
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<LibraryTab>('saved');
  const [savedFilter, setSavedFilter] = useState<SavedFilter>('all');
  const [savedHighlights, setSavedHighlights] = useState<SavedItem[]>([]);
  const [tarotReadings, setTarotReadings] = useState<TarotReading[]>([]);
  const [premiumReadings, setPremiumReadings] = useState<PremiumReading[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);

  // Build the guide list from i18n at render time so ja/ko/zh users see
  // localized titles, descriptions, and section content. Guide ids are the
  // stable identifier; everything else is translation-driven.
  const guides: Guide[] = GUIDE_IDS.map((id) => {
    const title = t(`library.guides.${id}.title`, { defaultValue: id });
    const description = t(`library.guides.${id}.description`, { defaultValue: '' });
    const rawSections = t(`library.guides.${id}.sections`, { returnObjects: true, defaultValue: [] });
    const sections: GuideSection[] = Array.isArray(rawSections)
      ? (rawSections as GuideSection[])
      : [];
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

      if (!highlightsRes.ok || !readingsRes.ok || !premiumRes.ok) {
        toast(t('library.toasts.loadSavedFailed'), 'error');
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
          toast(t('library.toasts.loadMoreFailed'), 'error');
        }
      } else if (type === 'readings') {
        const offset = tarotReadings.length;
        const res = await tarotReadingsDal.listSaved(user.id, { limit: PAGE_SIZE, offset });
        if (res.ok) {
          setTarotReadings(prev => [...prev, ...(res.data as TarotReading[])]);
          setHasMoreReadings(res.data.length === PAGE_SIZE);
        } else {
          toast(t('library.toasts.loadMoreFailed'), 'error');
        }
      } else {
        const offset = premiumReadings.length;
        const res = await premiumReadingsDal.listRawForUser(user.id, { limit: PAGE_SIZE, offset });
        if (res.ok) {
          setPremiumReadings(prev => [...prev, ...(res.data as PremiumReading[])]);
          setHasMorePremium(res.data.length === PAGE_SIZE);
        } else {
          toast(t('library.toasts.loadMoreFailed'), 'error');
        }
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDelete = async (type: 'highlight' | 'reading' | 'premium', id: string) => {
    const res = type === 'highlight'
      ? await savedHighlightsDalRef.deleteById(id)
      : type === 'premium'
        ? await premiumReadingsDal.deleteByIdOnly(id)
        : await tarotReadingsDal.deleteById(id);

    if (!res.ok) {
      toast(t('library.toasts.deleteFailed'), 'error');
    } else {
      if (type === 'highlight') {
        setSavedHighlights(prev => prev.filter(h => h.id !== id));
      } else if (type === 'premium') {
        setPremiumReadings(prev => prev.filter(r => r.id !== id));
      } else {
        setTarotReadings(prev => prev.filter(r => r.id !== id));
      }
      toast(t('library.toasts.deleted'), 'success');
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

  return (
    <div className="space-y-6">
      <div className="relative -mx-4 px-4">
        <div
          className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scroll-smooth"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          <Chip selected={activeTab === 'saved'} onClick={() => setActiveTab('saved')}>
            <Bookmark className="w-3.5 h-3.5" />
            {t('library.tabs.saved', { defaultValue: 'Saved' })}
          </Chip>
          {profile?.isPremium && (
            <Chip selected={activeTab === 'ai-readings'} onClick={() => setActiveTab('ai-readings')}>
              <Brain className="w-3.5 h-3.5" />
              {t('library.tabs.aiReadings', { defaultValue: 'AI Readings' })}
            </Chip>
          )}
          <Chip selected={activeTab === 'guides'} onClick={() => setActiveTab('guides')}>
            <Book className="w-3.5 h-3.5" />
            {t('library.tabs.guides', { defaultValue: 'Guides' })}
          </Chip>
        </div>
      </div>

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
                <button
                  key={filter}
                  onClick={() => setSavedFilter(filter)}
                  className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors flex-shrink-0 snap-start ${
                    savedFilter === filter
                      ? 'bg-mystic-700 text-mystic-100'
                      : 'text-mystic-400 hover:text-mystic-300'
                  }`}
                >
                  {t(`library.filters.${filter}`, { defaultValue: filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1) })}
                </button>
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
                  <h3 className="text-sm font-medium text-mystic-400 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    {t('library.savedSpreads', { defaultValue: 'Saved Spreads' })}
                  </h3>
                  {tarotReadings.map(reading => (
                    <Card key={reading.id} padding="md" className="relative group">
                      <button
                        onClick={() => handleDelete('reading', reading.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-mystic-800/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/50"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-mystic-400" />
                      </button>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-mystic-800/50 border border-mystic-700/30 overflow-hidden flex-shrink-0">
                          {profile?.card_back_url ? (
                            <img
                              src={profile.card_back_url}
                              alt="Card back"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gold/10 flex items-center justify-center">
                              <Layers className="w-5 h-5 text-gold" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-mystic-100 text-sm">
                              {(() => {
                                const k = {
                                  'single': 'single',
                                  'three-card': 'threeCard',
                                  'celtic-cross': 'celticCross',
                                  'relationship': 'relationship',
                                  'career': 'careerSpread',
                                  'shadow': 'shadow',
                                }[reading.spread_type];
                                return k ? t(`readings.spreads.${k}.name`) : reading.spread_type;
                              })()}
                            </h4>
                            {reading.focus_area && (
                              <span className="px-2 py-0.5 bg-mystic-800 rounded text-xs text-mystic-400">
                                {t(`readings.focusAreas.${reading.focus_area.toLowerCase()}`, { defaultValue: reading.focus_area })}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {reading.cards.slice(0, 3).map((card, i) => (
                              <span key={i} className="text-xs text-mystic-400">
                                {localizeCardNameSync(card.cardName)}{card.reversed ? ' (R)' : ''}{i < Math.min(reading.cards.length - 1, 2) ? ',' : ''}
                              </span>
                            ))}
                            {reading.cards.length > 3 && (
                              <span className="text-xs text-mystic-500">+{reading.cards.length - 3} more</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-mystic-500">
                            <Calendar className="w-3 h-3" />
                            {formatDate(reading.date)}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
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
                  <h3 className="text-sm font-medium text-mystic-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {t('library.savedCards', { defaultValue: 'Saved Cards' })}
                  </h3>
                  {filteredHighlights
                    .filter(h => h.highlight_type === 'tarot')
                    .map(item => {
                      const content = item.content as { card?: { name: string }; reversed?: boolean };
                      return (
                        <Card key={item.id} padding="md" className="relative group">
                          <button
                            onClick={() => handleDelete('highlight', item.id)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-mystic-800/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/50"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-mystic-400" />
                          </button>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-mystic-800/50 border border-mystic-700/30 overflow-hidden flex-shrink-0">
                              {profile?.card_back_url ? (
                                <img
                                  src={profile.card_back_url}
                                  alt="Card back"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gold/10 flex items-center justify-center">
                                  <Sparkles className="w-5 h-5 text-gold" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-mystic-100 text-sm">
                                {content.card?.name}
                                {content.reversed && <span className="text-mystic-400 ml-1">(Reversed)</span>}
                              </h4>
                              <div className="flex items-center gap-1 text-xs text-mystic-500">
                                <Calendar className="w-3 h-3" />
                                {formatDate(item.date)}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              )}

              {(savedFilter === 'all' || savedFilter === 'horoscope') &&
               filteredHighlights.filter(h => h.highlight_type === 'horoscope').length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-mystic-400 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    {t('library.savedHoroscopes', { defaultValue: 'Saved Horoscopes' })}
                  </h3>
                  {filteredHighlights
                    .filter(h => h.highlight_type === 'horoscope')
                    .map(item => {
                      const content = item.content as { zodiacSign?: string; period?: string };
                      return (
                        <Card key={item.id} padding="md" className="relative group">
                          <button
                            onClick={() => handleDelete('highlight', item.id)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-mystic-800/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/50"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-mystic-400" />
                          </button>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                              <Star className="w-5 h-5 text-gold" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-mystic-100 text-sm">
                                {content.zodiacSign ? localizeSignName(content.zodiacSign as ZodiacSignPC) : ''} - {content.period ?? t('library.periodDaily', { defaultValue: 'Daily' })}
                              </h4>
                              <div className="flex items-center gap-1 text-xs text-mystic-500">
                                <Calendar className="w-3 h-3" />
                                {formatDate(item.date)}
                              </div>
                            </div>
                          </div>
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
                  <Bookmark className="w-12 h-12 text-mystic-700 mx-auto mb-3" />
                  <h3 className="font-medium text-mystic-300 mb-1">{t('saved.empty')}</h3>
                  <p className="text-sm text-mystic-500">{t('saved.emptySubAlt')}</p>
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
              {premiumReadings.map(reading => (
                <Card key={reading.id} padding="md" className="relative group">
                  <button
                    onClick={() => handleDelete('premium', reading.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-mystic-800/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/50 z-10"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-mystic-400" />
                  </button>
                  <button
                    onClick={() => setSelectedReading(reading)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-mystic-800/50 border border-gold/20 overflow-hidden flex-shrink-0">
                        {profile?.card_back_url ? (
                          <img
                            src={profile.card_back_url}
                            alt="Card back"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gold/20 to-cosmic-blue/20 flex items-center justify-center">
                            <Brain className="w-5 h-5 text-gold" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-mystic-100 text-sm">
                            {(() => {
                              const spreadKey = {
                                'single': 'single',
                                'three-card': 'threeCard',
                                'celtic-cross': 'celticCross',
                                'relationship': 'relationship',
                                'career': 'careerSpread',
                                'shadow': 'shadow',
                              }[reading.reading_type];
                              return spreadKey
                                ? t(`readings.spreads.${spreadKey}.name`)
                                : reading.reading_type;
                            })()}
                          </h4>
                          {reading.context.usedLlm && (
                            <span className="px-2 py-0.5 bg-gold/10 border border-gold/20 rounded text-xs text-gold">
                              AI
                            </span>
                          )}
                          {reading.context.focusArea && (
                            <span className="px-2 py-0.5 bg-mystic-800 rounded text-xs text-mystic-400 capitalize">
                              {reading.context.focusArea}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {reading.cards.slice(0, 3).map((card, i) => (
                            <span key={i} className="text-xs text-mystic-400">
                              {card.name}{card.reversed ? ' (R)' : ''}{i < Math.min(reading.cards.length - 1, 2) ? ',' : ''}
                            </span>
                          ))}
                          {reading.cards.length > 3 && (
                            <span className="text-xs text-mystic-500">+{reading.cards.length - 3} more</span>
                          )}
                        </div>
                        <p className="text-xs text-mystic-500 mb-2">
                          {reading.content.slice(0, 150)}...
                        </p>
                        <div className="flex items-center gap-1 text-xs text-mystic-500">
                          <Calendar className="w-3 h-3" />
                          {formatDate(reading.created_at)}
                        </div>
                      </div>
                    </div>
                  </button>
                </Card>
              ))}
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
              <Brain className="w-12 h-12 text-mystic-700 mx-auto mb-3" />
              <h3 className="font-medium text-mystic-300 mb-1">{t('library.empty.noAIReadings')}</h3>
              <p className="text-sm text-mystic-500">{t('library.empty.getAIFromTarot')}</p>
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-mystic-800 flex items-center justify-center">
                  <Book className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h4 className="font-medium text-mystic-100 text-sm">{guide.title}</h4>
                  <p className="text-xs text-mystic-400">{guide.description}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-mystic-500" />
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
            <p className="text-mystic-400">{selectedGuide.description}</p>

            <div className="space-y-4">
              {selectedGuide.sections.map((section, i) => (
                <div
                  key={i}
                  className="p-4 bg-mystic-800/50 border border-mystic-700 rounded-xl"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-7 h-7 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-sm text-gold font-medium">
                      {i + 1}
                    </span>
                    <h4 className="font-medium text-mystic-100">{section.title}</h4>
                  </div>
                  <p className="text-sm text-mystic-300 leading-relaxed pl-10">
                    {section.content || t('library.contentComingSoon')}
                  </p>
                </div>
              ))}
            </div>

            <Card padding="md" className="bg-gradient-to-r from-gold/5 to-cosmic-blue/5 border-gold/20">
              <p className="text-xs text-mystic-400 text-center">
                {t('library.continueExploring')}
              </p>
            </Card>
          </div>
        )}
      </Sheet>

      <Sheet
        open={!!selectedReading}
        onClose={() => setSelectedReading(null)}
        title="AI Reading"
      >
        {selectedReading && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gold/10 to-cosmic-blue/10 border border-gold/20 rounded-xl">
              <Brain className="w-6 h-6 text-gold flex-shrink-0" />
              <div>
                <h3 className="font-medium text-mystic-100">
                  {(() => {
                    const k = {
                      'single': 'single',
                      'three-card': 'threeCard',
                      'celtic-cross': 'celticCross',
                      'relationship': 'relationship',
                      'career': 'careerSpread',
                      'shadow': 'shadow',
                    }[selectedReading.reading_type];
                    return k ? t(`readings.spreads.${k}.name`) : selectedReading.reading_type;
                  })()}
                </h3>
                <p className="text-xs text-mystic-400">
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

            {selectedReading.context.question && (
              <Card padding="md" className="bg-mystic-800/50">
                <h4 className="text-xs font-medium text-mystic-400 uppercase tracking-wider mb-2">{t('library.reading.yourQuestion')}</h4>
                <p className="text-sm text-mystic-200">{selectedReading.context.question}</p>
              </Card>
            )}

            <div>
              <h4 className="text-xs font-medium text-mystic-400 uppercase tracking-wider mb-3">{t('library.reading.cardsDrawn')}</h4>
              <div className="flex flex-wrap gap-2">
                {selectedReading.cards.map((card, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-mystic-800/50 rounded-lg">
                    <Sparkles className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                    <span className="text-sm text-mystic-200">
                      {card.name}
                      {card.reversed && <span className="text-mystic-400 ml-1">(R)</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-medium text-mystic-400 uppercase tracking-wider mb-3">{t('library.reading.interpretation')}</h4>
              <Card padding="lg" className="bg-gradient-to-br from-gold/5 via-cosmic-blue/5 to-gold/5 border-gold/20">
                <div className="text-sm text-mystic-200 leading-relaxed whitespace-pre-line">
                  {selectedReading.content}
                </div>
              </Card>
            </div>

            {selectedReading.context.usedLlm && (
              <Card padding="sm" className="bg-mystic-800/30 border-mystic-700">
                <p className="text-xs text-mystic-500 text-center">
                  Generated with AI • Personalized to your profile
                </p>
              </Card>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
