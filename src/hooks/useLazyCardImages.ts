import { useEffect, useRef } from 'react';
import { imageLoaderService } from '../services/imageLoader';
import { shouldPreload } from '../utils/imageOptimization';

interface CardImageData {
  url: string | undefined;
  index: number;
}

interface UseLazyCardImagesOptions {
  cards: CardImageData[];
  currentIndex?: number;
  adjacentCount?: number;
  enabled?: boolean;
}

export function useLazyCardImages(options: UseLazyCardImagesOptions) {
  const {
    cards,
    currentIndex = 0,
    adjacentCount = 3,
    enabled = true,
  } = options;

  const previousIndexRef = useRef<number>(currentIndex);
  const preloadedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!enabled || cards.length === 0) {
      return;
    }

    const urlsToPreload: string[] = [];

    cards.forEach((card, index) => {
      if (!card.url) return;

      const shouldLoad = shouldPreload(index, currentIndex, adjacentCount);

      if (shouldLoad && !preloadedRef.current.has(index)) {
        urlsToPreload.push(card.url);
        preloadedRef.current.add(index);
      }
    });

    if (urlsToPreload.length > 0) {
      const priority = currentIndex === 0 ? 'high' : 'normal';
      imageLoaderService.preloadImages(urlsToPreload, priority);
    }

    previousIndexRef.current = currentIndex;
  }, [cards, currentIndex, adjacentCount, enabled]);

  const preloadCard = (index: number) => {
    const card = cards[index];
    if (card?.url && !preloadedRef.current.has(index)) {
      imageLoaderService.preloadImages([card.url], 'high');
      preloadedRef.current.add(index);
    }
  };

  const clearPreloadCache = () => {
    preloadedRef.current.clear();
  };

  return {
    preloadCard,
    clearPreloadCache,
  };
}

interface UseVisibleCardsOptions {
  totalCards: number;
  visibleCount?: number;
  currentIndex?: number;
}

export function useVisibleCards(options: UseVisibleCardsOptions) {
  const { totalCards, visibleCount = 5, currentIndex = 0 } = options;

  const startIndex = Math.max(0, currentIndex - Math.floor(visibleCount / 2));
  const endIndex = Math.min(totalCards, startIndex + visibleCount);

  const visibleIndices = Array.from(
    { length: endIndex - startIndex },
    (_, i) => startIndex + i
  );

  return {
    visibleIndices,
    startIndex,
    endIndex,
    isVisible: (index: number) =>
      index >= startIndex && index < endIndex,
  };
}
