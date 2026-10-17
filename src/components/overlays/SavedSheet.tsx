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
import { localizeCard } from '../../i18n/localizeCard';
import { localizeSignName } from '../../i18n/localizeNames';
import { getPlayingCard } from '../../data/cartomancy';
import { localizePlayingCard, useCartomancyCorpus } from '../../i18n/localizePlayingCard';
import { calendarDay } from '../readings/tarot/readingDates';
import { canonicalCardName, cardIdFromName } from '../readings/tarot/cardSlug';
import {
  SavedReadingSheet,
  isPlayingReading,
  savedSpreadName,
  savedSpreadLayout,
  type SavedReadingRow,
} from '../readings/tarot/SavedReadingSheet';
import { useT } from '../../i18n/useT';
import { getLocale } from '../../i18n/config';
import type { TarotCard } from '../../types';
import type { ZodiacSign } from '../../types/astrology';

interface SavedSheetProps {
  open: boolean;
  onClose: () => void;
}

type TFn = (key: string, opts?: Record<string, unknown>) => string;

/*
 * How a saved item is named, shared with the Library's Saved and AI Readings
 * tabs (LibrarySection), so the two lists cannot drift apart again: this
 * sheet was copied from the Library and kept its English "(R)" and " - ".
 */

/** Every shape a saved card has been written in: a reading's row, an AI reading's, a saved card's. */
export interface SavedCardRef {
  cardId?: number;
  id?: number;
  cardName?: string;
  name?: string;
}

/**
 * A saved card's name in the reader's language, by its id. The id is the
 * card; the stored name may not be in the reader's language: the
 * pre-Phase-7 client and the Android v1.2.0 app saved the name on screen
 * (女帝, ワンドの9), and an English-name lookup handed that back as it was —
 * an English Library listed 女帝 while the sheet the row opened, resolved by
 * id, said The Empress (p9 R14). The stored name is read only for a row
 * without an id (an English one still finds it).
 */
export function savedCardName(card: SavedCardRef, playing: boolean): string {
  const id = typeof card.cardId === 'number' ? card.cardId : typeof card.id === 'number' ? card.id : undefined;
  const stored = card.cardName ?? card.name ?? '';
  if (playing) {
    const pc = id !== undefined ? getPlayingCard(id) : undefined;
    return pc ? localizePlayingCard(pc).name : stored;
  }
  const tarotId = id !== undefined && id >= 0 && id <= 77 ? id : cardIdFromName(stored);
  if (tarotId === undefined) return stored;
  // The corpus is read by id, so the lazily loaded deck is not needed.
  return localizeCard({ id: tarotId, name: canonicalCardName(tarotId) } as TarotCard).name;
}

/**
 * A saved reading's card line, as its row shows it: the first three names,
 * a reversal marked and the names joined as the reader's language writes
 * them, then "+N". It was `${name} (R)` joined with ", " in every
 * language, beside the 逆位置 of a saved card on the same sheet (p9 R16).
 */
export function savedCardLine(t: TFn, cards: Array<{ name: string; reversed?: boolean }>): string {
  const shown = cards
    .slice(0, 3)
    .map((c) => (c.reversed ? t('library.cardReversedShort', { name: c.name, defaultValue: '{{name}} (R)' }) : c.name))
    .join(t('journal.cardSeparator', { defaultValue: ', ' }));
  return cards.length > 3 ? `${shown} +${cards.length - 3}` : shown;
}

/** A saved card's label: its name, and the reversal in the reader's words. */
export function savedCardLabel(t: TFn, name: string, reversed: boolean | undefined): string {
  return reversed ? t('library.cardReversed', { name, defaultValue: '{{name}} (Reversed)' }) : name;
}

/** A saved horoscope's label: its sign and period, joined as the reader's language joins them (not " - "). */
export function savedHoroscopeLabel(t: TFn, content: { zodiacSign?: string; period?: string } | null): string {
  const raw = content?.zodiacSign ?? '';
  // Stored as 'gemini' or 'Gemini'.
  const sign = raw ? localizeSignName((raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()) as ZodiacSign) : '';
  const p = (content?.period ?? '').toLowerCase();
  const period = !p || p === 'today' || p === 'daily'
    ? t('library.periodDaily', { defaultValue: 'Daily' })
    : p === 'weekly' || p === 'week'
      ? t('library.periodWeekly', { defaultValue: 'Weekly' })
      : p === 'monthly' || p === 'month'
        ? t('library.periodMonthly', { defaultValue: 'Monthly' })
        : content?.period ?? '';
  return sign ? t('library.savedHoroscopeLabel', { sign, period, defaultValue: '{{sign}} · {{period}}' }) : period;
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
    // The card names need no deck: savedCardName reads them by id from the
    // locale's corpus, which is in memory with the language.
    const [readingsRes, highlightsRes] = await Promise.all([
      tarotReadingsDal.listSaved(user.id, { limit: LIMIT }),
      savedHighlightsDal.listRawForUser(user.id, { limit: LIMIT }),
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

  // The reading opens in a Sheet of its own beside the list, and closes with
  // it. Android Back closes the shell's overlay (`open` → false): the list
  // went and the reading stayed up over the screen underneath, and the next
  // Back, finding no overlay, exited the app with it still drawn (p9 R25).
  useEffect(() => {
    if (!open) setSelected(null);
  }, [open]);

  const cartoReady = useCartomancyCorpus(readings.some((r) => isPlayingReading(r)));

  /** The day as the reader's calendar names it (calendarDay: a date-only value is that day, not UTC midnight). */
  const formatDate = (value: string) =>
    calendarDay(value).toLocaleDateString(BCP47[getLocale()] ?? 'en-US', { month: 'short', day: 'numeric' });
  /** A saved reading is dated by the moment it was saved; `date` held the UTC day before p8. */
  const readingDay = (r: SavedReading) => r.created_at || r.date;

  const cardNames = (r: SavedReading): string => {
    const playing = isPlayingReading(r);
    return savedCardLine(t, (r.cards ?? []).map((c) => ({ name: savedCardName(c, playing), reversed: c.reversed })));
  };

  const cards = highlights.filter((h) => h.highlight_type === 'tarot');
  const horoscopes = highlights.filter((h) => h.highlight_type === 'horoscope');

  const cardLabel = (h: SavedHighlight) => {
    const content = h.content as { card?: SavedCardRef; reversed?: boolean } | null;
    return savedCardLabel(t, content?.card ? savedCardName(content.card, false) : '', content?.reversed);
  };

  const horoscopeLabel = (h: SavedHighlight) => savedHoroscopeLabel(t, h.content as { zodiacSign?: string; period?: string } | null);

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
