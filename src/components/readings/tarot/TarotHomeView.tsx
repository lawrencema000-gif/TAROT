/**
 * The deck on the table.
 *
 * The home stage of the reading flow: the daily-draw hero, the six-spread
 * grid, and the way into the browse deck. The overlays (browse Sheet, card
 * detail, watch-ad sheet) belong to the parent, which mounts them in every
 * stage.
 *
 * The hero is the Arcana back at the deck's true proportion (2:3), still.
 * It used to float on a four-second loop, and before that it was a pulsing
 * star on a gradient — a picture of magic rather than the object the reader
 * is about to pick up. A card at rest is what invites a hand.
 *
 * The spread badges are the Badge primitive in its two tones: gold for a
 * spread that can be tried with an ad, teal for one already unlocked.
 */
import { Layers, ChevronRight, Grid3X3, Lock, Play } from 'lucide-react';
import { Card, Badge } from '../../ui';
import { useT } from '../../../i18n/useT';
import { isNative } from '../../../utils/platform';

interface SpreadConfig {
  id: string;
  i18n: string;
  free: boolean;
  count: number;
}

interface TarotHomeViewProps {
  spreads: readonly SpreadConfig[];
  isPremium: boolean;
  canWatchAd: boolean;
  cardBackUrl: string | null | undefined;
  hasTemporaryAccess: Record<string, boolean>;
  spreadName: (s: SpreadConfig) => string;
  spreadDesc: (s: SpreadConfig) => string;
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
  spreadName,
  spreadDesc,
  onStartDraw,
  onSpreadSelect,
  onOpenBrowse,
}: TarotHomeViewProps) {
  const { t } = useT('app');
  const backSrc = cardBackUrl || '/card-backs/default.svg';

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

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-ui font-medium text-mystic-200">{t('readings.spreadsSection')}</h3>
          <Layers className="w-4 h-4 text-mystic-500" aria-hidden />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {spreads.map((spread) => {
            const locked = !spread.free && !isPremium && !hasTemporaryAccess[spread.id];
            const unlocked = !spread.free && hasTemporaryAccess[spread.id];
            return (
              <Card
                key={spread.id}
                interactive
                padding="md"
                onClick={() => onSpreadSelect(spread.id)}
                className="relative"
              >
                {locked && (
                  isNative() && canWatchAd ? (
                    <Badge tone="gold" className="absolute top-2 right-2">
                      <Play className="w-3 h-3" aria-hidden />
                      {t('readings.status.try')}
                    </Badge>
                  ) : (
                    <Lock className="absolute top-2 right-2 w-4 h-4 text-gold" aria-hidden />
                  )
                )}
                {unlocked && (
                  <Badge tone="teal" className="absolute top-2 right-2">
                    {t('readings.status.unlocked')}
                  </Badge>
                )}
                <h4 className="text-ui font-medium text-mystic-100">{spreadName(spread)}</h4>
                <p className="text-meta text-mystic-400 mt-1">{spreadDesc(spread)}</p>
              </Card>
            );
          })}
        </div>
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
