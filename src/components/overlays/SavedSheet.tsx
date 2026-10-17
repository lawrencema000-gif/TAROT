import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bookmark, Layers, Star } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { TarotCardIcon, PlayingCardIcon } from '../ui/NavIcons';
import { ListRow, ListRowGroup } from '../ui/ListRow';
import { EmptyState } from '../ui/EmptyState';
import { ListSkeleton } from '../ui/Skeleton';
import { Button } from '../ui/Button';
import { Section } from '../ui/Section';
import { SpreadGlyph } from '../icons/SpreadGlyph';
import { useAuth } from '../../context/AuthContext';
import { savedHighlights as savedHighlightsDal, tarotReadings as tarotReadingsDal } from '../../dal';
import { localizeCardName, localizeCardNameSync } from '../../i18n/localizeCard';
import { localizeSignName } from '../../i18n/localizeNames';
import { getPlayingCard } from '../../data/cartomancy';
import { localizePlayingCard, useCartomancyCorpus } from '../../i18n/localizePlayingCard';
import { calendarDay } from '../readings/tarot/readingDates';
import {
  SavedReadingSheet,
  isPlayingReading,
  savedSpreadName,
  savedSpreadLayout,
  type SavedReadingRow,
} from '../readings/tarot/SavedReadingSheet';
import { useT } from '../../i18n/useT';
import { getLocale } from '../../i18n/config';
import type { ZodiacSign } from '../../types/astrology';

interface SavedSheetProps {
  open: boolean;
  onClose: () => void;
}

/** As many of each kind as the Library's first page. */
const LIMIT = 20;

type SavedReading = SavedReadingRow & { created_at: string };

interface SavedHighlight {
  id: string;
  date: string;
  highlight_type: string;
  content: Record<string, unknown>;
}

const BCP47: Record<string, string> = { en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN' };

/**
 * The header ☆ sheet: what the member saved, from the records the Library's
 * Saved tab reads (saved tarot and playing-card readings, saved cards, saved
 * horoscopes). It used to render three made-up rows with English dates
 * ("Dec 28, 2025") that did nothing when tapped, while Profile → Saved
 * listed only the highlights and the Library listed the readings: three
 * "saved" surfaces that disagreed (p8 F69). Profile → Saved and Home's
 * "See all" open this sheet too. A reading opens the same detail the
 * Library shows; deleting stays in the Library, one tap away.
 */
export function SavedSheet({ open, onClose }: SavedSheetProps) {
  const { t } = useT('app');
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [readings, setReadings] = useState<SavedReading[]>([]);
  const [highlights, setHighlights] = useState<SavedHighlight[]>([]);
  const [selected, setSelected] = useState<SavedReading | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setStatus('loading');
    const [readingsRes, highlightsRes] = await Promise.all([
      tarotReadingsDal.listSaved(user.id, { limit: LIMIT }),
      savedHighlightsDal.listRawForUser(user.id, { limit: LIMIT }),
      // The deck index the card names are read through (a lazy chunk):
      // in memory before the rows render, or they would stay English.
      localizeCardName('The Fool').catch(() => ''),
    ]);
    if (!readingsRes.ok && !highlightsRes.ok) {
      setStatus('error');
      return;
    }
    setReadings(readingsRes.ok ? (readingsRes.data as unknown as SavedReading[]) : []);
    setHighlights(highlightsRes.ok ? highlightsRes.data : []);
    setStatus('ready');
  }, [user]);

  // Read fresh every time the sheet opens: something saved a minute ago is there.
  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  const cartoReady = useCartomancyCorpus(readings.some((r) => isPlayingReading(r)));

  /** The day as the reader's calendar names it (calendarDay: a date-only value is that day, not UTC midnight). */
  const formatDate = (value: string) =>
    calendarDay(value).toLocaleDateString(BCP47[getLocale()] ?? 'en-US', { month: 'short', day: 'numeric' });
  /** A saved reading is dated by the moment it was saved; `date` held the UTC day before p8. */
  const readingDay = (r: SavedReading) => r.created_at || r.date;

  const cardNames = (r: SavedReading): string => {
    const playing = isPlayingReading(r);
    const names = (r.cards ?? []).map((c) => {
      if (playing) {
        const pc = c.cardId !== undefined ? getPlayingCard(c.cardId) : undefined;
        return pc ? localizePlayingCard(pc).name : c.cardName;
      }
      return localizeCardNameSync(c.cardName);
    });
    const shown = names.slice(0, 3).map((n, i) => `${n}${r.cards[i]?.reversed ? ' (R)' : ''}`).join(', ');
    return names.length > 3 ? `${shown} +${names.length - 3}` : shown;
  };

  const cards = highlights.filter((h) => h.highlight_type === 'tarot');
  const horoscopes = highlights.filter((h) => h.highlight_type === 'horoscope');

  const cardLabel = (h: SavedHighlight) => {
    const content = h.content as { card?: { name?: string }; reversed?: boolean };
    const name = content.card?.name ? localizeCardNameSync(content.card.name) : '';
    return content.reversed ? `${name} (${t('readings.revealView.reversed')})` : name;
  };

  const horoscopeLabel = (h: SavedHighlight) => {
    const content = h.content as { zodiacSign?: string; period?: string };
    const raw = content.zodiacSign ?? '';
    // Stored as 'gemini' or 'Gemini'.
    const sign = raw ? localizeSignName((raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()) as ZodiacSign) : '';
    const p = (content.period ?? '').toLowerCase();
    const period = p === 'weekly' || p === 'week'
      ? t('library.periodWeekly', { defaultValue: 'Weekly' })
      : p === 'monthly' || p === 'month'
        ? t('library.periodMonthly', { defaultValue: 'Monthly' })
        : t('library.periodDaily', { defaultValue: 'Daily' });
    return sign ? `${sign} - ${period}` : period;
  };

  const empty = status === 'ready' && readings.length === 0 && cards.length === 0 && horoscopes.length === 0;
  // On /readings the Library is a tab of the page underneath.
  const showLibraryLink = location.pathname !== '/readings';

  const openLibrary = () => {
    onClose();
    navigate('/readings', { state: { tab: 'library' } });
  };

  return (
    <>
      <Sheet open={open} onClose={onClose} title={t('saved.title')}>
        {status === 'loading' ? (
          <div role="status" aria-busy="true" aria-label={t('common:labels.loading', { defaultValue: 'Loading…' })}>
            <ListSkeleton count={3} />
          </div>
        ) : status === 'error' ? (
          <EmptyState
            variant="inline"
            icon={<Bookmark />}
            title={t('saved.loadFailed', { defaultValue: 'Couldn’t load your saved items — check your connection and try again.' })}
            action={
              <Button variant="secondary" size="sm" onClick={() => void load()}>
                {t('common:actions.retry', { defaultValue: 'Try again' })}
              </Button>
            }
          />
        ) : empty ? (
          <EmptyState
            variant="inline"
            icon={<Bookmark />}
            title={t('saved.empty')}
            description={t('saved.emptySubAlt')}
          />
        ) : (
          <div className="space-y-6">
            {readings.length > 0 && (
              <Section
                headingLevel="h3"
                spacing="sm"
                title={
                  <span className="inline-flex items-center gap-2">
                    <Layers className="w-4 h-4" aria-hidden />
                    {t('library.savedSpreads', { defaultValue: 'Saved spreads' })}
                  </span>
                }
              >
                <ListRowGroup>
                  {readings.map((r) => {
                    const playing = isPlayingReading(r);
                    const name = savedSpreadName(t, r.spread_type);
                    const asked = r.question?.trim() || null;
                    return (
                      <ListRow
                        key={r.id}
                        tone="gold"
                        icon={playing ? <PlayingCardIcon /> : <SpreadGlyph layout={savedSpreadLayout(r.spread_type, r.cards?.length ?? 0)} />}
                        label={asked ?? name}
                        meta={playing && !cartoReady ? undefined : cardNames(r)}
                        value={<span className="tabular-nums">{formatDate(readingDay(r))}</span>}
                        onClick={() => setSelected(r)}
                        aria-label={t('library.openReading', { defaultValue: 'Open {{name}} from {{date}}', name: asked ?? name, date: formatDate(readingDay(r)) })}
                      />
                    );
                  })}
                </ListRowGroup>
              </Section>
            )}

            {cards.length > 0 && (
              <Section
                headingLevel="h3"
                spacing="sm"
                title={
                  <span className="inline-flex items-center gap-2">
                    <TarotCardIcon className="w-4 h-4" />
                    {t('library.savedCards', { defaultValue: 'Saved cards' })}
                  </span>
                }
              >
                <ListRowGroup>
                  {cards.map((h) => (
                    <ListRow
                      key={h.id}
                      tone="blue"
                      icon={<TarotCardIcon />}
                      label={cardLabel(h)}
                      value={<span className="tabular-nums">{formatDate(h.date)}</span>}
                    />
                  ))}
                </ListRowGroup>
              </Section>
            )}

            {horoscopes.length > 0 && (
              <Section
                headingLevel="h3"
                spacing="sm"
                title={
                  <span className="inline-flex items-center gap-2">
                    <Star className="w-4 h-4" aria-hidden />
                    {t('library.savedHoroscopes', { defaultValue: 'Saved horoscopes' })}
                  </span>
                }
              >
                <ListRowGroup>
                  {horoscopes.map((h) => (
                    <ListRow
                      key={h.id}
                      tone="violet"
                      icon={<Star />}
                      label={horoscopeLabel(h)}
                      value={<span className="tabular-nums">{formatDate(h.date)}</span>}
                    />
                  ))}
                </ListRowGroup>
              </Section>
            )}
          </div>
        )}

        {showLibraryLink && status !== 'loading' && (
          <Button variant="ghost" fullWidth className="mt-6" onClick={openLibrary}>
            {t('saved.openLibrary', { defaultValue: 'Open your Library' })}
          </Button>
        )}
      </Sheet>

      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? savedSpreadName(t, selected.spread_type) : undefined}
      >
        {selected && (
          isPlayingReading(selected) && !cartoReady ? (
            <div role="status" aria-busy="true" aria-label={t('common:labels.loading', { defaultValue: 'Loading…' })}>
              <ListSkeleton count={2} />
            </div>
          ) : (
            <SavedReadingSheet reading={selected} dateLabel={formatDate(readingDay(selected))} />
          )
        )}
      </Sheet>
    </>
  );
}
