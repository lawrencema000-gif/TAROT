/**
 * Drawing the cards.
 *
 * Selection used to be a scrolling grid of 78 identical tiles — three
 * columns, twenty-six rows, four thousand pixels of spreadsheet — where a
 * picked card turned into an empty square with a number on it, and nothing
 * said which position the next pick would fill.
 *
 * Now the deck is spread across the table: one overlapping row you scroll
 * along, the way a hand runs across a fanned deck. Above it wait the
 * spread's positions, named — Past, Present, Future — as empty slots. Draw
 * a card and it leaves the deck (a gap stays where it was) and lands in the
 * next open slot; tap a slot to put its card back. The reader always sees
 * what they have drawn and what remains to draw.
 *
 * Every card is the Arcana back at 2:3. The strip is 78 buttons and 78
 * images of one SVG, which the browser decodes once; nothing animates while
 * the reader is scrolling.
 */
import { ChevronLeft, Eye } from 'lucide-react';
import { Button } from '../../ui';
import { useT } from '../../../i18n/useT';
import { tap } from '../../../utils/haptics';

interface TarotSelectViewProps {
  deckCards: number[];
  selectedIndices: number[];
  needsMore: number;
  /** One label per spread position, in fill order. */
  positionLabels: string[];
  cardBackUrl: string | null | undefined;
  onBack: () => void;
  /** Toggles: a card already drawn goes back to the deck. */
  onCardSelect: (cardId: number) => void;
  onReveal: () => void;
}

export function TarotSelectView({
  deckCards,
  selectedIndices,
  needsMore,
  positionLabels,
  cardBackUrl,
  onBack,
  onCardSelect,
  onReveal,
}: TarotSelectViewProps) {
  const { t } = useT('app');
  const backSrc = cardBackUrl || '/card-backs/default.svg';
  const slots = positionLabels.length > 0 ? positionLabels : selectedIndices.map((_, i) => t('readings.selectView.cardN', { n: i + 1, defaultValue: `Card ${i + 1}` }));

  const pick = (cardId: number) => {
    tap();
    onCardSelect(cardId);
  };

  return (
    <div className="flex flex-col space-y-5">
      <button
        onClick={onBack}
        className="text-sm text-mystic-400 hover:text-mystic-300 transition-colors self-start"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden />
        {t('readings.back')}
      </button>

      <div className="text-center space-y-1">
        <h2 className="heading-display-lg text-mystic-100" aria-live="polite">
          {needsMore > 0
            ? t('readings.selectView.chooseMore', { count: needsMore })
            : t('readings.selectView.readyReveal')}
        </h2>
        <p className="text-ui text-mystic-400">{t('readings.selectView.trustIntuition')}</p>
      </div>

      {/* The spread's positions, waiting. */}
      <div
        className="flex justify-center gap-3 flex-wrap"
        role="list"
        aria-label={t('readings.selectView.positions', { defaultValue: 'Your spread' })}
      >
        {slots.map((label, i) => {
          const cardId = selectedIndices[i];
          const filled = cardId !== undefined;
          return (
            <div key={i} className="flex flex-col items-center gap-1.5 w-16" role="listitem">
              {filled ? (
                <button
                  type="button"
                  onClick={() => pick(cardId)}
                  aria-label={t('readings.selectView.returnCard', { position: label, defaultValue: `Return the card in ${label} to the deck` })}
                  className="relative w-16 aspect-[2/3] rounded-inset border border-gold overflow-hidden bg-mystic-850 transition-transform duration-fast motion-safe:active:scale-95 select-none touch-manipulation [-webkit-tap-highlight-color:transparent]"
                >
                  <img src={backSrc} alt="" decoding="async" className="w-full h-full object-cover pointer-events-none" draggable={false} />
                  <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gold text-mystic-950 text-caption font-semibold flex items-center justify-center" aria-hidden>
                    {i + 1}
                  </span>
                </button>
              ) : (
                <div
                  className={`w-16 aspect-[2/3] rounded-inset border border-dashed ${i === selectedIndices.length ? 'border-gold/60' : 'border-mystic-600'}`}
                  aria-hidden
                />
              )}
              <span className={`text-caption text-center leading-tight ${filled ? 'text-mystic-200' : 'text-mystic-500'}`}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* The deck, spread across the table. */}
      <div
        className="-mx-4 px-4 overflow-x-auto scrollbar-hide pb-2"
        role="list"
        aria-label={t('readings.selectView.deck', { defaultValue: 'The deck' })}
      >
        <div className="flex items-end pt-4 pl-1" style={{ width: 'max-content' }}>
          {deckCards.map((cardId, index) => {
            const drawn = selectedIndices.includes(cardId);
            return (
              <button
                key={cardId}
                type="button"
                role="listitem"
                onClick={() => pick(cardId)}
                disabled={drawn}
                aria-label={t('readings.selectView.cardOf', { n: index + 1, total: deckCards.length, defaultValue: `Card ${index + 1} of ${deckCards.length}` })}
                className={`relative shrink-0 w-16 aspect-[2/3] rounded-inset border overflow-hidden bg-mystic-850 select-none touch-manipulation [-webkit-tap-highlight-color:transparent]
                  transition-[transform,opacity,border-color] duration-fast ease-out
                  ${index > 0 ? '-ml-9' : ''}
                  ${drawn ? 'opacity-0 pointer-events-none border-transparent' : 'border-gold/25 [@media(hover:hover)]:hover:-translate-y-2 [@media(hover:hover)]:hover:border-gold/60 motion-safe:active:scale-95'}
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:z-10`}
                style={{
                  animation: index < 24 ? `arcana-spread 260ms ease-out ${index * 14}ms both` : undefined,
                }}
              >
                <img src={backSrc} alt="" decoding="async" loading={index < 12 ? 'eager' : 'lazy'} className="w-full h-full object-cover pointer-events-none" draggable={false} />
              </button>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes arcana-spread { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      <div
        className="fixed left-0 right-0 px-4 bg-gradient-to-t from-mystic-950 via-mystic-950 to-transparent pt-4 pb-4"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <Button variant="gold" fullWidth disabled={needsMore > 0} onClick={onReveal} size="lg">
          {needsMore > 0 ? t('readings.selectView.selectMore', { count: needsMore }) : t('readings.selectView.revealCards')}
          <Eye className="w-4 h-4" aria-hidden />
        </Button>
      </div>
      {/* room for the fixed CTA */}
      <div className="h-24" aria-hidden />
    </div>
  );
}
