import { useState } from 'react';
import { Sparkles, Bookmark, BookmarkCheck, Share2, HelpCircle, RotateCcw } from 'lucide-react';
import type { TarotCard } from '../../types';
import { useProgressiveImage, useCardBackImage } from '../../hooks/useProgressiveImage';

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
  const [isFlipped, setIsFlipped] = useState(false);
  const [showReversed, setShowReversed] = useState(reversed);

  const { src: cardImageUrl, isLoading: isCardLoading, isPlaceholder } = useProgressiveImage({
    cardId: card.id,
    cardName: card.name,
    remoteUrl: card.imageUrl,
    priority: isFlipped ? 'high' : 'normal',
  });

  const { src: backImageUrl } = useCardBackImage(cardBackUrl);

  const handleFlip = () => {
    if (!isFlipped) {
      setIsFlipped(true);
    }
  };

  const toggleReversed = () => {
    setShowReversed(prev => !prev);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs text-mystic-500 uppercase tracking-wider">Your Card</p>
          <h3 className="font-display text-lg text-mystic-100">Tap to reveal</h3>
        </div>
        {isFlipped && (
          <button
            onClick={toggleReversed}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
              showReversed
                ? 'bg-mystic-700 text-mystic-200'
                : 'bg-mystic-800/50 text-mystic-400 hover:bg-mystic-800'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            {showReversed ? 'Reversed' : 'Upright'}
          </button>
        )}
      </div>

      <div
        className="relative w-full aspect-[2.5/4] max-w-[180px] mx-auto perspective-1000 cursor-pointer"
        onClick={handleFlip}
      >
        <div
          className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          <div className="absolute inset-0 backface-hidden">
            <div className="relative w-full h-full bg-gradient-to-br from-mystic-700 via-mystic-800 to-mystic-900 rounded-xl border-2 border-gold/30 shadow-glow overflow-hidden">
              {cardBackUrl || backImageUrl ? (
                <img src={backImageUrl} alt="Card Back" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <>
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-4 border border-gold/40 rounded-lg" />
                    <div className="absolute inset-8 border border-gold/20 rounded" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center z-10">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gold/10 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-gold animate-pulse-slow" />
                      </div>
                      <p className="text-sm text-gold font-medium">Tap to reveal</p>
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

          <div className="absolute inset-0 backface-hidden rotate-y-180">
            <div className={`w-full h-full bg-gradient-to-br from-mystic-800 to-mystic-900 rounded-xl border-2 border-gold/40 shadow-glow overflow-hidden ${showReversed ? 'rotate-180' : ''}`}>
              {cardImageUrl ? (
                <>
                  <img
                    src={cardImageUrl}
                    alt={card.name}
                    className={`w-full h-full object-cover transition-opacity duration-500 ${
                      isCardLoading || isPlaceholder ? 'opacity-60' : 'opacity-100'
                    }`}
                  />
                  {isCardLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-gold animate-pulse" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-mystic-900/90 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-center">
                    <h4 className="font-display text-sm text-gold mb-0.5">{card.name}</h4>
                    <p className="text-xs text-mystic-300">
                      {card.arcana === 'major' ? 'Major Arcana' : `${card.suit} ${card.number}`}
                    </p>
                    {showReversed && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-mystic-700/80 rounded text-xs text-mystic-300">
                        Reversed
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-mystic-900/80 to-transparent" />
                  <div className="relative h-full flex flex-col items-center justify-center p-4 text-center">
                    <div className="mb-2">
                      <Sparkles className="w-10 h-10 text-gold mx-auto" />
                    </div>
                    <h4 className="font-display text-lg text-gold mb-1">{card.name}</h4>
                    <p className="text-xs text-mystic-400">
                      {card.arcana === 'major' ? 'Major Arcana' : `${card.suit} ${card.number}`}
                    </p>
                    {showReversed && (
                      <span className="mt-2 px-2 py-0.5 bg-mystic-700 rounded text-xs text-mystic-300">
                        Reversed
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {isFlipped && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center">
            <p className="text-mystic-300 text-sm leading-relaxed">
              {showReversed ? card.meaningReversed : card.meaningUpright}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {card.keywords.slice(0, 4).map((keyword, i) => (
              <span
                key={i}
                className="px-2.5 py-1 bg-mystic-800/50 border border-mystic-700/50 rounded-full text-xs text-mystic-300"
              >
                {keyword}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={(e) => { e.stopPropagation(); onSave(); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-all active:scale-95 ${
                saved
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'bg-mystic-800 text-mystic-300 hover:bg-mystic-700'
              }`}
            >
              {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              Save
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onShare(); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm bg-mystic-800 text-mystic-300 hover:bg-mystic-700 transition-all active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onMeaning(); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm bg-mystic-800 text-mystic-300 hover:bg-mystic-700 transition-all active:scale-95"
            >
              <HelpCircle className="w-4 h-4" />
              Meaning
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
