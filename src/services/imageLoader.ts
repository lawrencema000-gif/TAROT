import { imageCacheService } from './imageCache';
import { hasLocalBundle, LOW_RES_PLACEHOLDER } from '../config/bundledImages';
import { globalImageQueue, createImageLoadPromise } from '../utils/imageOptimization';

const DEFAULT_CARD_BACK = '/card-backs/default.svg';
const FALLBACK_PLACEHOLDER = LOW_RES_PLACEHOLDER;

interface ImageLoadOptions {
  useCache?: boolean;
  priority?: 'critical' | 'high' | 'normal' | 'low';
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
      priority = 'normal',
      onProgress,
    } = options;

    if (!url) {
      return FALLBACK_PLACEHOLDER;
    }

    if (hasLocalBundle(url)) {
      try {
        await createImageLoadPromise(url);
        return url;
      } catch (error) {
        console.warn('Bundled image failed to load:', url, error);
        return FALLBACK_PLACEHOLDER;
      }
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

  async preloadImages(urls: string[], priority: 'critical' | 'high' | 'normal' | 'low' = 'low'): Promise<void> {
    const bundledUrls: string[] = [];
    const remoteUrls: string[] = [];

    urls.forEach(url => {
      if (hasLocalBundle(url)) {
        bundledUrls.push(url);
      } else {
        remoteUrls.push(url);
      }
    });

    bundledUrls.forEach(url => {
      createImageLoadPromise(url).catch(err => {
        console.warn('Failed to preload bundled image:', url, err);
      });
    });

    remoteUrls.forEach(url => {
      globalImageQueue.add(url, priority);
      this.preloadQueue.add(url);
    });

    if (!this.isPreloading && this.preloadQueue.size > 0) {
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
