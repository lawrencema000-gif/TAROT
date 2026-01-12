import { useEffect } from 'react';
import { imageLoaderService } from '../services/imageLoader';

export function useImagePreloader(urls: string[], enabled = true): void {
  useEffect(() => {
    if (!enabled || urls.length === 0) return;

    const validUrls = urls.filter(url => url && typeof url === 'string');
    if (validUrls.length === 0) return;

    const timer = setTimeout(() => {
      imageLoaderService.preloadImages(validUrls);
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [urls, enabled]);
}
