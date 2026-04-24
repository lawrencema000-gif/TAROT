import { Info, Sparkles } from 'lucide-react';
import type { TarotCard } from '../../types';
import { getBundledCardPath } from '../../config/bundledImages';

interface CelticCrossLayoutProps {
  drawnCards: { card: TarotCard; reversed: boolean; revealed: boolean }[];
  onRevealCard: (index: number) => void;
  onCardClick: (card: TarotCard, reversed: boolean) => void;
  getPositionLabel: (index: number) => string;
  cardBackUrl?: string;
}

export function CelticCrossLayout({
  drawnCards,
  onRevealCard,
  onCardClick,
  getPositionLabel,
  cardBackUrl,
}: CelticCrossLayoutProps) {
  const getCardImage = (card: TarotCard): string | undefined => {
    const bundledPath = getBundledCardPath(card.id);
    return bundledPath || card.imageUrl;
  };

  const renderCard = (drawn: { card: TarotCard; reversed: boolean; revealed: boolean }, index: number) => (
    <div key={index} className="relative group">
      <button
        onClick={() => drawn.revealed ? onCardClick(drawn.card, drawn.reversed) : onRevealCard(index)}
        className="relative perspective-1000 w-full h-full"
      >
        <div
          className={`
            w-full h-full
            rounded-lg border transition-all duration-700 overflow-hidden
            ${drawn.revealed
              ? 'border-gold/40 shadow-glow animate-flip-in'
              : 'bg-gradient-to-br from-mystic-800 to-mystic-900 border-mystic-600 hover:border-gold/30 cursor-pointer hover:scale-105'
            }
            flex items-center justify-center relative
          `}
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {drawn.revealed ? (
            getCardImage(drawn.card) ? (
              <img
                src={getCardImage(drawn.card)}
                alt={drawn.card.name}
                className={`w-full h-full object-cover ${drawn.reversed ? 'rotate-180' : ''}`}
              />
            ) : (
              <div className={`text-center p-1 bg-gradient-to-br from-mystic-700 to-mystic-900 w-full h-full flex flex-col items-center justify-center ${drawn.reversed ? 'rotate-180' : ''}`}>
                <Sparkles className="w-4 h-4 text-gold mx-auto mb-1" />
                <p className="text-[0.6rem] text-mystic-300 line-clamp-2 px-1">{drawn.card.name}</p>
              </div>
            )
          ) : (
            <img
              src={cardBackUrl || '/card-backs/default.svg'}
              alt=""
              className="w-full h-full object-cover pointer-events-none select-none"
              draggable={false}
            />
          )}

          {!drawn.revealed && (
            <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/5 rounded-lg transition-all duration-300" />
          )}
        </div>
        {drawn.revealed && (
          <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-mystic-900/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-gold/30 shadow-lg">
            <Info className="w-2.5 h-2.5 text-gold" />
          </div>
        )}
      </button>
      <p className="text-[0.65rem] text-mystic-400 mt-1 text-center leading-tight">
        {getPositionLabel(index)}
      </p>
    </div>
  );

  return (
    <div className="relative w-full max-w-4xl mx-auto px-2">
      <div className="relative flex items-center justify-center gap-4 md:gap-8">
        <div className="relative" style={{ width: '220px', height: '320px' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute" style={{ width: '56px', height: '84px', left: '82px', top: '118px' }}>
              {renderCard(drawnCards[0], 0)}
            </div>

            <div
              className="absolute z-10"
              style={{
                width: '56px',
                height: '84px',
                left: '82px',
                top: '118px',
                transform: 'rotate(90deg)',
              }}
            >
              {renderCard(drawnCards[1], 1)}
            </div>

            <div className="absolute" style={{ width: '56px', height: '84px', left: '82px', top: '220px' }}>
              {renderCard(drawnCards[2], 2)}
            </div>

            <div className="absolute" style={{ width: '56px', height: '84px', left: '10px', top: '118px' }}>
              {renderCard(drawnCards[3], 3)}
            </div>

            <div className="absolute" style={{ width: '56px', height: '84px', left: '82px', top: '16px' }}>
              {renderCard(drawnCards[4], 4)}
            </div>

            <div className="absolute" style={{ width: '56px', height: '84px', left: '154px', top: '118px' }}>
              {renderCard(drawnCards[5], 5)}
            </div>
          </div>

          <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 220 320" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="110" y1="40" x2="110" y2="280" stroke="currentColor" strokeWidth="1" className="text-gold/10" strokeDasharray="4 4" />
              <line x1="30" y1="160" x2="190" y2="160" stroke="currentColor" strokeWidth="1" className="text-gold/10" strokeDasharray="4 4" />
            </svg>
          </div>
        </div>

        {/*
          Traditional Celtic Cross staff is read BOTTOM-to-TOP:
            idx 6 (Your attitude)       → bottom of staff
            idx 7 (External influences) → ↑
            idx 8 (Hopes and fears)     → ↑
            idx 9 (Final outcome)       → top of staff
          `flex-col-reverse` renders the array bottom-up so visual order
          matches the position semantics.
        */}
        <div className="flex flex-col-reverse gap-3" style={{ width: '56px' }}>
          {[6, 7, 8, 9].map((idx) => (
            <div key={idx} style={{ width: '56px', height: '84px' }}>
              {renderCard(drawnCards[idx], idx)}
            </div>
          ))}
        </div>
      </div>

      <div className="text-center mt-6">
        <p className="text-xs text-mystic-500 italic">
          The Cross & Staff — Ancient Celtic wisdom revealed
        </p>
      </div>
    </div>
  );
}
