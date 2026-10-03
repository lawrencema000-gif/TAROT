/**
 * The deck on the table.
 *
 * The home stage of the reading flow: the daily-draw hero, the spread
 * picker and the way into the deck library. The overlays (browse Sheet,
 * card detail, watch-ad sheet) belong to the parent, which mounts them in
 * every stage.
 *
 * The hero is the Arcana back at the deck's true proportion (2:3), still.
 * A card at rest is what invites a hand.
 *
 * The picker is the whole catalogue — forty spreads — as rows under a row
 * of category chips: a glyph of the spread's shape, its name, one line,
 * and on the right either a chevron or the one reserved hue for
 * monetisation (a violet Badge: "Premium", or "Watch an ad" where an ad
 * can unlock one reading). It used to be a two-column grid of six cards.
 */
import { useState } from 'react';
import { ChevronRight, Grid3X3, Layers } from 'lucide-react';
import { Card, Badge, Chip, ListRow, ListRowGroup } from '../../ui';
import { SpreadGlyph } from '../../icons/SpreadGlyph';
import { useT } from '../../../i18n/useT';
import { isNative } from '../../../utils/platform';
import type { SpreadCategory } from '../../../data/tarotSpreads';
import type { PickerSpread } from './types';

const CATEGORIES: { id: SpreadCategory; key: string; fallback: string }[] = [
  { id: 'general', key: 'readings.categories.general', fallback: 'General' },
  { id: 'love', key: 'readings.categories.love', fallback: 'Love' },
  { id: 'career', key: 'readings.categories.career', fallback: 'Career' },
  { id: 'daily', key: 'readings.categories.daily', fallback: 'Daily' },
  { id: 'spiritual', key: 'readings.categories.spiritual', fallback: 'Spiritual' },
  { id: 'lunar', key: 'readings.categories.lunar', fallback: 'Lunar' },
  { id: 'decision', key: 'readings.categories.decision', fallback: 'Decision' },
];

interface TarotHomeViewProps {
  spreads: readonly PickerSpread[];
  isPremium: boolean;
  canWatchAd: boolean;
  cardBackUrl: string | null | undefined;
  hasTemporaryAccess: Record<string, boolean>;
  onStartDraw: () => void;
  onSpreadSelect: (spreadId: string) => void;
  onOpenBrowse: () => void;
}

export function TarotHomeView({
  spreads,
  isPremium,
  canWatchAd,
  cardBackUrl,
  hasTemporaryAccess,
  onStartDraw,
  onSpreadSelect,
  onOpenBrowse,
}: TarotHomeViewProps) {
  const { t } = useT('app');
  const backSrc = cardBackUrl || '/card-backs/default.svg';
  const [category, setCategory] = useState<SpreadCategory | 'all'>('all');
  const shown = category === 'all' ? spreads : spreads.filter((s) => s.category === category);

  return (
    <div className="space-y-6">
      <Card variant="glow" padding="lg" interactive onClick={onStartDraw} className="text-center">
        <div className="w-24 mx-auto mb-4 aspect-[2/3] rounded-card border border-gold/30 overflow-hidden bg-mystic-850">
          <img
            src={backSrc}
            alt=""
            decoding="async"
            className="w-full h-full object-cover pointer-events-none select-none"
            draggable={false}
          />
        </div>
        <h2 className="heading-display-md text-mystic-100">{t('readings.dailyDraw.title')}</h2>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-ui font-medium text-mystic-200">{t('readings.spreadsSection')}</h3>
          <span className="inline-flex items-center gap-1.5 text-meta text-mystic-500">
            <Layers className="w-4 h-4" aria-hidden />
            <span className="tabular-nums">{t('readings.spreadCount', { count: spreads.length, defaultValue: '{{count}} spreads' })}</span>
          </span>
        </div>

        {/* The category row scrolls; the gutter is the shell's. */}
        <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 w-max pb-1" role="group" aria-label={t('readings.spreadsSection')}>
            <Chip
              size="sm"
              label={t('readings.categories.all', { defaultValue: 'All' })}
              selected={category === 'all'}
              onSelect={() => setCategory('all')}
            />
            {CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                size="sm"
                label={t(c.key, { defaultValue: c.fallback })}
                selected={category === c.id}
                onSelect={() => setCategory(c.id)}
              />
            ))}
          </div>
        </div>

        <ListRowGroup>
          {shown.map((spread) => {
            const locked = !spread.free && !isPremium && !hasTemporaryAccess[spread.id];
            const unlocked = !spread.free && !isPremium && hasTemporaryAccess[spread.id];
            const trailing = locked ? (
              <Badge tone="violet">
                {isNative() && canWatchAd ? t('readings.status.try') : t('readings.status.premium', { defaultValue: 'Premium' })}
              </Badge>
            ) : unlocked ? (
              <Badge tone="teal">{t('readings.status.unlocked')}</Badge>
            ) : undefined;
            return (
              <ListRow
                key={spread.id}
                icon={<SpreadGlyph layout={spread.layout} className="text-gold" />}
                label={spread.name}
                meta={
                  <span className="line-clamp-2">
                    <span className="tabular-nums">{t('readings.cardCount', { count: spread.count, defaultValue: '{{count}} cards' })}</span>
                    {' · '}
                    {spread.description}
                  </span>
                }
                trailing={trailing}
                onClick={() => onSpreadSelect(spread.id)}
              />
            );
          })}
        </ListRowGroup>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-ui font-medium text-mystic-200">{t('readings.browse.title')}</h3>
          <Grid3X3 className="w-4 h-4 text-mystic-500" aria-hidden />
        </div>
        <Card
          interactive
          padding="md"
          onClick={onOpenBrowse}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            {/* Three backs, fanned a little: the deck, not a stack of tiles. */}
            <div className="flex -space-x-3 py-1">
              {[-6, 0, 6].map((deg, i) => (
                <div
                  key={i}
                  className="w-8 aspect-[2/3] rounded-inset border border-gold/25 overflow-hidden bg-mystic-850"
                  style={{ transform: `rotate(${deg}deg)`, zIndex: i }}
                  aria-hidden
                >
                  <img
                    src={backSrc}
                    alt=""
                    decoding="async"
                    className="w-full h-full object-cover pointer-events-none select-none"
                    draggable={false}
                  />
                </div>
              ))}
            </div>
            <div>
              <h4 className="text-ui font-medium text-mystic-100">{t('readings.browse.allCards')}</h4>
              <p className="text-meta text-mystic-400">{t('readings.browse.learnMeanings')}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-mystic-400" aria-hidden />
        </Card>
      </div>
    </div>
  );
}
