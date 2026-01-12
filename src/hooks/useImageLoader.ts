import { useState, useEffect, useCallback } from 'react';
import { imageLoaderService } from '../services/imageLoader';

interface UseImageLoaderOptions {
  url?: string;
  useCache?: boolean;
  priority?: 'high' | 'normal' | 'low';
  fallback?: string;
}

interface UseImageLoaderResult {
  imageUrl: string;
  isLoading: boolean;
  progress: number;
  error: boolean;
  reload: () => void;
}

export function useImageLoader(options: UseImageLoaderOptions): UseImageLoaderResult {
  const { url, useCache = true, priority = 'normal', fallback } = options;

  const [imageUrl, setImageUrl] = useState<string>(
    fallback || imageLoaderService.getFallbackPlaceholder()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);
  const [loadKey, setLoadKey] = useState(0);

  const reload = useCallback(() => {
    setLoadKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!url) {
      setImageUrl(fallback || imageLoaderService.getFallbackPlaceholder());
      setIsLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(false);
    setProgress(0);

    imageLoaderService
      .loadImage(url, {
        useCache,
        priority,
        onProgress: (p) => {
          if (!cancelled) {
            setProgress(p);
          }
        },
      })
      .then((loadedUrl) => {
        if (!cancelled) {
          setImageUrl(loadedUrl);
          setIsLoading(false);
          setError(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Image load error:', err);
          setImageUrl(fallback || imageLoaderService.getFallbackPlaceholder());
          setIsLoading(false);
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url, useCache, priority, fallback, loadKey]);

  return {
    imageUrl,
    isLoading,
    progress,
    error,
    reload,
  };
}
