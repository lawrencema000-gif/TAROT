/**
 * TarotSection home view — extracted from the monolithic TarotSection.tsx
 * as part of the `tarot-section-split` rollout.
 *
 * Covers the Daily Draw CTA, the 6-spread picker grid, and the "Browse
 * all cards" entry card. The browse deck Sheet, card detail Sheet, and
 * watch-ad Sheet stay inline in the parent because they're modal
 * overlays that can be triggered from other views too.
 */
import { Layers, ChevronRight, Grid3X3, Lock, Play } from 'lucide-react';
import { Card } from '../../ui';
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

  return (
    <div className="space-y-6">
      <Card
        variant="glow"
        padding="lg"
        interactive
        onClick={onStartDraw}
        className="text-center active:scale-[0.98] transition-transform hover:shadow-gold"
      >
        <div className="w-20 h-28 mx-auto mb-4 rounded-xl border-2 border-gold/30 flex items-center justify-center shadow-glow hover:scale-105 transition-transform overflow-hidden animate-float-gentle">
          <img
            src={cardBackUrl || '/card-backs/default.svg'}
            alt=""
            className="w-full h-full object-cover pointer-events-none select-none"
            draggable={false}
          />
        </div>
        <h2 className="font-display text-xl text-mystic-100 mb-1">{t('readings.dailyDraw.title')}</h2>
        <p className="text-mystic-400 text-sm">{t('readings.dailyDraw.subtitle')}</p>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-mystic-200">{t('readings.spreadsSection')}</h3>
          <Layers className="w-4 h-4 text-mystic-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {spreads.map((spread) => (
            <Card
              key={spread.id}
              interactive
              padding="md"
              onClick={() => onSpreadSelect(spread.id)}
              className="relative active:scale-[0.98] transition-all hover:border-gold/30"
            >
              {!spread.free && !isPremium && !hasTemporaryAccess[spread.id] && (
                isNative() && canWatchAd ? (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-mystic-800/80 rounded-full">
                    <Play className="w-3 h-3 text-gold" />
                    <span className="text-[10px] text-gold">{t('readings.status.try')}</span>
                  </div>
                ) : (
                  <Lock className="absolute top-2 right-2 w-4 h-4 text-gold" />
                )
              )}
              {!spread.free && hasTemporaryAccess[spread.id] && (
                <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                  <span className="text-[10px] text-emerald-400">{t('readings.status.unlocked')}</span>
                </div>
              )}
              <h4 className="font-medium text-mystic-100 text-sm">{spreadName(spread)}</h4>
              <p className="text-xs text-mystic-400 mt-1">{spreadDesc(spread)}</p>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-mystic-200">{t('readings.browse.title')}</h3>
          <Grid3X3 className="w-4 h-4 text-mystic-500" />
        </div>
        <Card
          interactive
          padding="md"
          onClick={onOpenBrowse}
          className="flex items-center justify-between active:scale-[0.98] transition-all hover:border-gold/30"
        >
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-8 h-11 rounded border border-mystic-600 hover:border-gold/40 transition-colors overflow-hidden"
                >
                  <img
                    src={cardBackUrl || '/card-backs/default.svg'}
                    alt=""
                    className="w-full h-full object-cover pointer-events-none select-none"
                    draggable={false}
                  />
                </div>
              ))}
            </div>
            <div>
              <h4 className="font-medium text-mystic-100 text-sm">{t('readings.browse.allCards')}</h4>
              <p className="text-xs text-mystic-400">{t('readings.browse.learnMeanings')}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-mystic-400" />
        </Card>
      </div>
    </div>
  );
}
