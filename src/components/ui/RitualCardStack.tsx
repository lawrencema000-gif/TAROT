import { useState, useRef, useCallback, ReactNode } from 'react';

interface RitualCard {
  id: string;
  content: ReactNode;
}

interface RitualCardStackProps {
  cards: RitualCard[];
  currentIndex: number;
  onCardChange: (index: number) => void;
  onCardViewed?: (index: number) => void;
}

export function RitualCardStack({
  cards,
  currentIndex,
  onCardChange,
  onCardViewed,
}: RitualCardStackProps) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStart.x;
    setDragOffset(diff);
  }, [touchStart]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart) return;

    const threshold = 80;
    if (dragOffset > threshold && currentIndex > 0) {
      onCardChange(currentIndex - 1);
    } else if (dragOffset < -threshold && currentIndex < cards.length - 1) {
      onCardChange(currentIndex + 1);
      onCardViewed?.(currentIndex + 1);
    }

    setTouchStart(null);
    setDragOffset(0);
    setIsDragging(false);
  }, [touchStart, dragOffset, currentIndex, cards.length, onCardChange, onCardViewed]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setTouchStart({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!touchStart || !isDragging) return;
    const diff = e.clientX - touchStart.x;
    setDragOffset(diff);
  }, [touchStart, isDragging]);

  const handleMouseUp = useCallback(() => {
    handleTouchEnd();
  }, [handleTouchEnd]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      handleTouchEnd();
    }
  }, [isDragging, handleTouchEnd]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden touch-manipulation select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative min-h-[320px]">
        {cards.map((card, index) => {
          const offset = index - currentIndex;
          const isActive = index === currentIndex;
          const translateX = offset * 100 + (isActive ? (dragOffset / 4) : 0);
          const scale = isActive ? 1 : 0.9;
          const opacity = Math.abs(offset) > 1 ? 0 : isActive ? 1 : 0.5;
          const zIndex = cards.length - Math.abs(offset);

          return (
            <div
              key={card.id}
              className={`
                absolute inset-0 transition-all
                ${isDragging ? 'duration-0' : 'duration-300 ease-out'}
              `}
              style={{
                transform: `translateX(${translateX}%) scale(${scale})`,
                opacity,
                zIndex,
                pointerEvents: isActive ? 'auto' : 'none',
              }}
            >
              <div className="w-full h-full bg-mystic-900/80 backdrop-blur-sm rounded-2xl border border-mystic-700/50 p-6 shadow-card">
                {card.content}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center gap-2 mt-4">
        {cards.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              onCardChange(index);
              if (index > currentIndex) onCardViewed?.(index);
            }}
            className={`
              h-2 rounded-full transition-all duration-300
              ${index === currentIndex ? 'w-6 bg-gold' : 'w-2 bg-mystic-600 hover:bg-mystic-500'}
            `}
            aria-label={`Go to card ${index + 1}`}
          />
        ))}
      </div>

      <div className="flex justify-center gap-2 mt-3">
        <span className="text-xs text-mystic-500">
          {currentIndex + 1} of {cards.length}
        </span>
      </div>
    </div>
  );
}
