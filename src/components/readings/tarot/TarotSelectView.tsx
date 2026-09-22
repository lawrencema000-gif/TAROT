/**
 * TarotSection card selection grid — extracted from TarotSection.tsx as
 * part of the `tarot-section-split` rollout.
 *
 * User taps N cards from a shuffled 78-card grid (N varies per spread).
 * Selected cards show their pick order; the CTA stays disabled until N
 * are chosen.
 */
import { ChevronLeft, Eye } from 'lucide-react';
import { Button } from '../../ui';
import { useT } from '../../../i18n/useT';

interface TarotSelectViewProps {
  deckCards: number[];
  selectedIndices: number[];
  needsMore: number;
  cardBackUrl: string | null | undefined;
  onBack: () => void;
  onCardSelect: (cardId: number) => void;
  onReveal: () => void;
}

export function TarotSelectView({
  deckCards,
  selectedIndices,
  needsMore,
  cardBackUrl,
  onBack,
  onCardSelect,
  onReveal,
}: TarotSelectViewProps) {
  const { t } = useT('app');

  return (
    <div className="flex flex-col h-full space-y-4">
      <button
        onClick={onBack}
        className="text-sm text-mystic-400 hover:text-mystic-300 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden />
        {t('readings.back')}
      </button>

      <div className="text-center space-y-2 sticky top-0 bg-mystic-950 z-10 pb-3">
        <h2 className="font-display text-xl text-mystic-100">
          {needsMore > 0
            ? t('readings.selectView.chooseMore', { count: needsMore })
            : t('readings.selectView.readyReveal')}
        </h2>
        <p className="text-mystic-400 text-sm">{t('readings.selectView.trustIntuition')}</p>
      </div>

      <div className="flex-1 overflow-y-auto -mx-4 px-4 pb-40">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {deckCards.map((cardId, index) => {
            const isSelected = selectedIndices.includes(cardId);
            const selectionOrder = selectedIndices.indexOf(cardId) + 1;

            return (
              <button
                key={cardId}
                onClick={() => onCardSelect(cardId)}
                className="relative group animate-fade-in"
                style={{
                  animationDuration: '260ms',
                  animationDelay: `${Math.min(index, 20) * 16}ms`,
                  animationFillMode: 'both',
                }}
              >
                <div
                  className={`
                    aspect-[2/3] rounded-lg border-2 overflow-hidden
                    transition-[transform,border-color,background-color] duration-base ease-out
                    ${isSelected
                      ? 'border-gold bg-gold/10 scale-[1.06] -translate-y-1'
                      : 'border-mystic-600 bg-gradient-to-br from-mystic-800 to-mystic-900 hover:border-gold/50 hover:scale-105'
                    }
                    flex items-center justify-center
                    active:scale-95 relative
                  `}
                >
                  {!isSelected && (
                    <img
                      src={cardBackUrl || '/card-backs/default.svg'}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                      draggable={false}
                    />
                  )}
                  <div className="relative z-10">
                    {/*
                      Always mounted, scaled to nothing when unpicked. A
                      badge that mounts on selection can only appear; one
                      that scales can also *leave*, so un-picking a card
                      reads as an undo rather than as a disappearance.
                      The back-out curve gives the pick a bit of weight.
                    */}
                    <div
                      className={`w-7 h-7 rounded-full bg-gold flex items-center justify-center text-mystic-950 font-bold text-sm transition-transform duration-base ${
                        isSelected ? 'scale-100' : 'scale-0'
                      }`}
                      style={{
                        transitionTimingFunction: isSelected
                          ? 'cubic-bezier(0.34, 1.56, 0.64, 1)'
                          : 'cubic-bezier(0.4, 0, 1, 1)',
                      }}
                      aria-hidden={!isSelected}
                    >
                      {selectionOrder > 0 ? selectionOrder : ''}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/*
        CTA sits above the BottomNav. `bottom-20` alone wasn't enough on
        devices with a gesture home-indicator — the inset-bottom safe area
        would push the nav up and clip the button. Anchor via calc so the
        CTA always clears nav + safe area.
      */}
      <div
        className="fixed left-0 right-0 px-4 bg-gradient-to-t from-mystic-950 via-mystic-950 to-transparent pt-4 pb-4"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <Button
          variant="gold"
          fullWidth
          disabled={needsMore > 0}
          onClick={onReveal}
          size="lg"
        >
          {needsMore > 0 ? t('readings.selectView.selectMore', { count: needsMore }) : t('readings.selectView.revealCards')}
          <Eye className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
