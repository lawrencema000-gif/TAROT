import { useState, useEffect, useCallback } from 'react';
import {
  ProgressiveImageState,
  getInitialImageState,
  createImageLoadPromise,
  isBundledImage,
} from '../utils/imageOptimization';
import { getBundledCardPath } from '../config/bundledImages';
import { imageLoaderService } from '../services/imageLoader';

interface UseProgressiveImageOptions {
  cardId?: number;
  cardName?: string;
  remoteUrl?: string;
  priority?: 'critical' | 'high' | 'normal' | 'low';
  skipCache?: boolean;
}

export function useProgressiveImage(options: UseProgressiveImageOptions) {
  const { cardId, remoteUrl, priority = 'normal', skipCache = false } = options;

  const [state, setState] = useState<ProgressiveImageState>(getInitialImageState);

  const loadImages = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let bundledUrl: string | null = null;

      if (cardId !== undefined) {
        bundledUrl = getBundledCardPath(cardId);
      }

      if (bundledUrl) {
        try {
          await createImageLoadPromise(bundledUrl);
          setState(prev => ({
            ...prev,
            highRes: bundledUrl,
            isLoading: false,
          }));
          return;
        } catch (error) {
          console.warn('Bundled image not available, falling back to remote:', error);
        }
      }

      if (remoteUrl) {
        const loadedUrl = await imageLoaderService.loadImage(remoteUrl, {
          useCache: !skipCache,
          priority,
        });

        setState(prev => ({
          ...prev,
          highRes: loadedUrl,
          isLoading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          highRes: imageLoaderService.getFallbackPlaceholder(),
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error('Failed to load image:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load image',
        isLoading: false,
        highRes: imageLoaderService.getFallbackPlaceholder(),
      }));
    }
  }, [cardId, remoteUrl, priority, skipCache]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const currentSrc =
    state.highRes || state.lowRes || state.placeholder;

  const isPlaceholder = currentSrc === state.placeholder;

  return {
    src: currentSrc,
    isLoading: state.isLoading,
    isPlaceholder,
    error: state.error,
    reload: loadImages,
  };
}

export function useCardBackImage(cardBackPath?: string) {
  const [imageSrc, setImageSrc] = useState<string>(
    imageLoaderService.getDefaultCardBack()
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!cardBackPath) {
      setImageSrc(imageLoaderService.getDefaultCardBack());
      return;
    }

    if (isBundledImage(cardBackPath)) {
      setImageSrc(cardBackPath);
      return;
    }

    setIsLoading(true);
    imageLoaderService
      .loadImage(cardBackPath)
      .then(setImageSrc)
      .catch(() => {
        setImageSrc(imageLoaderService.getDefaultCardBack());
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [cardBackPath]);

  return { src: imageSrc, isLoading };
}
