import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Bookmark, BookmarkCheck, Share2, HelpCircle, RotateCcw } from 'lucide-react';
import { MysticalStar } from '../ui/MysticalStar';
import { Tag } from '../ui';
import type { TarotCard } from '../../types';
import { useProgressiveImage, useCardBackImage } from '../../hooks/useProgressiveImage';
import { useT } from '../../i18n/useT';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

/*
 * Kept deliberately in step with the flip in
 * `readings/tarot/TarotRevealView.tsx` — the same gesture in two places
 * must feel like the same gesture. 520ms with a long ease-out tail: a
 * moment the user is watching on purpose, so it may run past the
 * UI-feedback budget, but 700ms (what this was) reads as sluggish.
 *
 * The global reduced-motion block in index.css pins transition-duration
 * with `!important`, which outranks these inline values, so the card
 * simply arrives face-up.
 */
const FLIP_MS = 520;
const FLIP_EASE = 'cubic-bezier(0.22, 0.68, 0.24, 1)';

/** Inline rather than a utility class: the 3D chain is load-bearing here,
 *  and a card that loses `backface-visibility` shows both faces at once. */
const BACKFACE: CSSProperties = {
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
};

interface TarotFlipCardProps {
  card: TarotCard;
  reversed: boolean;
  saved: boolean;
  onSave: () => void;
  onShare: () => void;
  onMeaning: () => void;
  cardBackUrl?: string;
}

export function TarotFlipCard({
  card,
  reversed,
  saved,
  onSave,
  onShare,
  onMeaning,
  cardBackUrl,
}: TarotFlipCardProps) {
  const { t } = useT('app');
  // `${card.suit} ${card.number}` used to be printed here. `number` is optional
  // on TarotCard and unset for the bundled deck, so every minor arcana read
  // "wands undefined" — and lowercase, unstyled. Same key TarotCardDetail uses.
  const suitLabel = card.suit
    ? t('tarot.detail.minorArcanaLabel', {
        suit: `${card.suit.charAt(0).toUpperCase()}${card.suit.slice(1)}`,
      })
    : '';
  const [isFlipped, setIsFlipped] = useState(false);
  const [showReversed, setShowReversed] = useState(reversed);

  const { src: cardImageUrl, isLoading: isCardLoading, isPlaceholder } = useProgressiveImage({
    cardId: card.id,
    cardName: card.name,
    remoteUrl: card.imageUrl,
    priority: isFlipped ? 'high' : 'normal',
  });

  const { src: backImageUrl } = useCardBackImage(cardBackUrl);

  const reduceMotion = !!useReducedMotion();
  // Held so an unmount mid-flip cannot buzz a phone whose card is gone.
  const edgeHaptic = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(edgeHaptic.current), []);

  const handleFlip = () => {
    if (isFlipped) return;
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    setIsFlipped(true);
    // Second tap of haptic lands as the card passes edge-on, so the thump
    // coincides with the turn rather than trailing it.
    //
    // Only if there IS a turn. Under reduced motion the CSS pins the
    // duration and the card arrives face-up immediately, so this fired a
    // second buzz a quarter-second after a card that had already stopped
    // moving — the exact disembodied twitch the setting exists to remove.
    if (reduceMotion) return;
    window.clearTimeout(edgeHaptic.current);
    edgeHaptic.current = window.setTimeout(() => {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
    }, FLIP_MS / 2);
  };

  const toggleReversed = () => {
    setShowReversed(prev => !prev);
  };

  const cardDescription = isFlipped
    ? `${card.name}, ${showReversed ? 'reversed' : 'upright'}`
    : 'Tarot card face down. Tap to reveal';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs text-mystic-500 uppercase tracking-wider">{t('home.ritualCards.yourCard')}</p>
          <h3 className="font-display text-lg text-mystic-100">{t('home.ritualCards.tapToReveal')}</h3>
        </div>
        {isFlipped && (
          <button
            onClick={toggleReversed}
            aria-label={`Switch to ${showReversed ? 'upright' : 'reversed'} orientation`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
              showReversed
                ? 'bg-mystic-700 text-mystic-200'
                : 'bg-mystic-800/50 text-mystic-400 hover:bg-mystic-800'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            {showReversed ? t('home.ritualCards.reversed') : t('home.ritualCards.upright')}
          </button>
        )}
      </div>

      <div
        className={`relative w-full aspect-[2.5/4] max-w-[180px] mx-auto cursor-pointer transition-transform duration-base ease-out ${
          isFlipped ? '' : 'active:scale-[0.97]'
        }`}
        style={{ perspective: '1000px' }}
        onClick={handleFlip}
        role="button"
        tabIndex={0}
        aria-label={cardDescription}
        aria-live="polite"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFlip(); } }}
      >
        <div
          className="relative w-full h-full"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transition: `transform ${FLIP_MS}ms ${FLIP_EASE}`,
          }}
        >
          <div className="absolute inset-0" style={BACKFACE}>
            <div className="relative w-full h-full bg-gradient-to-br from-mystic-700 via-mystic-800 to-mystic-900 rounded-xl border-2 border-gold/30 overflow-hidden">
              {cardBackUrl || backImageUrl ? (
                <img src={backImageUrl} alt="Card Back" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <>
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-4 border border-gold/40 rounded-lg" />
                    <div className="absolute inset-8 border border-gold/20 rounded-lg" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center z-10">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gold/10 flex items-center justify-center">
                        <MysticalStar size={32} halo={false} className="text-gold animate-pulse-slow" />
                      </div>
                      <p className="text-sm text-gold font-medium">{t('home.ritualCards.tapToReveal')}</p>
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="h-1 bg-mystic-700 rounded-full overflow-hidden">
                      <div className="h-full w-1/3 bg-gold/30 rounded-full" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="absolute inset-0" style={{ ...BACKFACE, transform: 'rotateY(180deg)' }}>
            {/*
              Upright ⇄ reversed used to snap. It is a change of meaning,
              not a repaint, so the card now turns to get there — 300ms,
              ease-out, transform only.
            */}
            {/* Upright ⇄ reversed turns the ARTWORK, not the card. This wrapper used
                  to carry the rotate-180, so the caption — name, suit, the "Reversed"
                  badge itself — went upside down with the picture. The chrome stays
                  put; only the image (or its placeholder art) turns. */}
              <div className="w-full h-full bg-gradient-to-br from-mystic-800 to-mystic-900 rounded-xl border-2 border-gold/40 overflow-hidden">
              {cardImageUrl ? (
                <>
                  <img
                    src={cardImageUrl}
                    alt={card.name}
                    className={`w-full h-full object-cover transition-[opacity,transform] duration-slow ease-out ${
                      isCardLoading || isPlaceholder ? 'opacity-60' : 'opacity-100'
                    } ${showReversed ? 'rotate-180' : ''}`}
                  />
                  {isCardLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <MysticalStar size={40} halo={false} className="text-gold animate-pulse" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-mystic-900/90 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-center">
                    <h4 className="font-display text-sm text-gold mb-0.5">{card.name}</h4>
                    <p className="text-xs text-mystic-300">
                      {card.arcana === 'major' ? t('home.ritualCards.majorArcana') : suitLabel}
                    </p>
                    {showReversed && (
                      <Tag tone="neutral" size="sm" className="mt-1">
                        {t('home.ritualCards.reversed')}
                      </Tag>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-mystic-900/80 to-transparent" />
                  <div className="relative h-full flex flex-col items-center justify-center p-4 text-center">
                    <div className={`mb-2 transition-transform duration-slow ease-out ${showReversed ? 'rotate-180' : ''}`}>
                      <MysticalStar size={40} halo={false} className="text-gold mx-auto" />
                    </div>
                    <h4 className="font-display text-lg text-gold mb-1">{card.name}</h4>
                    <p className="text-xs text-mystic-400">
                      {card.arcana === 'major' ? t('home.ritualCards.majorArcana') : suitLabel}
                    </p>
                    {showReversed && (
                      <Tag tone="neutral" size="sm" className="mt-2">
                        {t('home.ritualCards.reversed')}
                      </Tag>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Screen reader announcement for card reveal */}
      <div className="sr-only" aria-live="assertive" role="status">
        {isFlipped && `Card revealed: ${card.name}, ${showReversed ? 'reversed' : 'upright'}. ${showReversed ? card.meaningReversed : card.meaningUpright}`}
      </div>

      {isFlipped && (
        <div
          className="space-y-4 animate-fade-in"
          style={{ animationDuration: '280ms', animationDelay: `${FLIP_MS - 160}ms`, animationFillMode: 'both' }}
        >
          <div className="text-center">
            <p className="text-mystic-300 text-sm leading-relaxed">
              {showReversed ? card.meaningReversed : card.meaningUpright}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {card.keywords.slice(0, 4).map((keyword, i) => (
              <Tag key={i} tone="neutral" size="md">
                {keyword}
              </Tag>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={(e) => { e.stopPropagation(); onSave(); }}
              aria-label={saved ? `Unsave ${card.name}` : `Save ${card.name}`}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-all active:scale-95 ${
                saved
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'bg-mystic-800 text-mystic-300 hover:bg-mystic-700'
              }`}
            >
              {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              {t('home.ritualCards.save')}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onShare(); }}
              aria-label={`Share ${card.name}`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm bg-mystic-800 text-mystic-300 hover:bg-mystic-700 transition-all active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              {t('home.ritualCards.share')}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onMeaning(); }}
              aria-label={`View meaning of ${card.name}`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm bg-mystic-800 text-mystic-300 hover:bg-mystic-700 transition-all active:scale-95"
            >
              <HelpCircle className="w-4 h-4" />
              {t('home.ritualCards.meaning')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
