import { imageCacheService } from './imageCache';

const DEFAULT_CARD_BACK = '/card-backs/default.svg';
const FALLBACK_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"%3E%3Crect width="200" height="300" fill="%231a1a2e"/%3E%3Cpath d="M100 120l20 40-20 40-20-40z" fill="%23d4af37" opacity="0.3"/%3E%3C/svg%3E';

interface ImageLoadOptions {
  useCache?: boolean;
  priority?: 'high' | 'normal' | 'low';
  onProgress?: (progress: number) => void;
}

class ImageLoaderService {
  private loadingPromises: Map<string, Promise<string>> = new Map();
  private preloadQueue: Set<string> = new Set();
  private isPreloading = false;

  async loadImage(
    url: string | undefined,
    options: ImageLoadOptions = {}
  ): Promise<string> {
    const {
      useCache = true,
      onProgress,
    } = options;

    if (!url) {
      return FALLBACK_PLACEHOLDER;
    }

    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    const loadPromise = this.performLoad(url, useCache, onProgress);
    this.loadingPromises.set(url, loadPromise);

    try {
      const result = await loadPromise;
      return result;
    } finally {
      this.loadingPromises.delete(url);
    }
  }

  private async performLoad(
    url: string,
    useCache: boolean,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      onProgress?.(0.1);

      if (useCache) {
        const cachedBlob = await imageCacheService.getCachedImage(url);
        if (cachedBlob) {
          onProgress?.(1);
          return URL.createObjectURL(cachedBlob);
        }
      }

      onProgress?.(0.3);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      onProgress?.(0.6);

      const blob = await response.blob();
      onProgress?.(0.8);

      if (useCache) {
        await imageCacheService.cacheImage(url, blob);
      }

      onProgress?.(1);
      return URL.createObjectURL(blob);
    } catch (error) {
      console.warn('Failed to load image from URL:', url, error);
      return FALLBACK_PLACEHOLDER;
    }
  }

  async preloadImages(urls: string[]): Promise<void> {
    for (const url of urls) {
      this.preloadQueue.add(url);
    }

    if (!this.isPreloading) {
      this.processPreloadQueue();
    }
  }

  private async processPreloadQueue(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.size === 0) return;

    this.isPreloading = true;

    const batch = Array.from(this.preloadQueue).slice(0, 3);
    this.preloadQueue = new Set(Array.from(this.preloadQueue).slice(3));

    await Promise.all(
      batch.map(url => this.loadImage(url, { useCache: true, priority: 'low' }))
    );

    this.isPreloading = false;

    if (this.preloadQueue.size > 0) {
      setTimeout(() => this.processPreloadQueue(), 100);
    }
  }

  getDefaultCardBack(): string {
    return DEFAULT_CARD_BACK;
  }

  getFallbackPlaceholder(): string {
    return FALLBACK_PLACEHOLDER;
  }

  clearCache(): Promise<void> {
    return imageCacheService.clearAllCache();
  }

  clearExpiredCache(): Promise<void> {
    return imageCacheService.clearExpiredCache();
  }
}

export const imageLoaderService = new ImageLoaderService();
