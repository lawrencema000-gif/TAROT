import { LOW_RES_PLACEHOLDER, hasLocalBundle } from '../config/bundledImages';

export interface ProgressiveImageState {
  placeholder: string;
  lowRes: string | null;
  highRes: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface ImageLoadStrategy {
  prioritizeBundled: boolean;
  usePlaceholder: boolean;
  preloadAdjacent: number;
}

export const DEFAULT_STRATEGY: ImageLoadStrategy = {
  prioritizeBundled: true,
  usePlaceholder: true,
  preloadAdjacent: 3,
};

export function getInitialImageState(): ProgressiveImageState {
  return {
    placeholder: LOW_RES_PLACEHOLDER,
    lowRes: null,
    highRes: null,
    isLoading: false,
    error: null,
  };
}

export async function checkImageExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

export function isBundledImage(url: string | undefined): boolean {
  if (!url) return false;
  return hasLocalBundle(url);
}

export function shouldPreload(index: number, currentIndex: number, adjacentCount: number): boolean {
  const distance = Math.abs(index - currentIndex);
  return distance <= adjacentCount;
}

export function createImageLoadPromise(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve(url);
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`));
    };

    img.src = url;
  });
}

export async function loadImageWithFallback(
  primaryUrl: string | undefined,
  fallbackUrl: string | undefined
): Promise<string> {
  if (!primaryUrl && !fallbackUrl) {
    throw new Error('No image URLs provided');
  }

  if (primaryUrl) {
    try {
      return await createImageLoadPromise(primaryUrl);
    } catch (error) {
      console.warn('Primary image load failed, trying fallback:', error);
    }
  }

  if (fallbackUrl) {
    try {
      return await createImageLoadPromise(fallbackUrl);
    } catch (error) {
      console.error('Fallback image load also failed:', error);
      throw error;
    }
  }

  throw new Error('All image load attempts failed');
}

export function generatePlaceholderSVG(width: number = 200, height: number = 300): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0a0a15;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad)"/>
      <path d="M${width/2} ${height*0.4}l${width*0.1} ${height*0.13}-${width*0.1} ${height*0.13}-${width*0.1}-${height*0.13}z"
            fill="#d4af37" opacity="0.2"/>
      <circle cx="${width/2}" cy="${height/2}" r="${width*0.1}" fill="#d4af37" opacity="0.15"/>
    </svg>
  `.trim();

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export interface ImageQueueItem {
  url: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
}

export class ImageLoadQueue {
  private queue: ImageQueueItem[] = [];
  private loading = new Set<string>();
  private maxConcurrent = 3;
  private isProcessing = false;

  add(url: string, priority: 'critical' | 'high' | 'normal' | 'low' = 'normal'): void {
    if (this.loading.has(url) || this.queue.some(item => item.url === url)) {
      return;
    }

    this.queue.push({ url, priority });
    this.sortQueue();

    if (!this.isProcessing) {
      this.process();
    }
  }

  private sortQueue(): void {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    this.queue.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  private async process(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0 && this.loading.size < this.maxConcurrent) {
      const item = this.queue.shift();
      if (!item) break;

      this.loading.add(item.url);

      createImageLoadPromise(item.url)
        .catch(error => {
          console.warn(`Failed to preload image: ${item.url}`, error);
        })
        .finally(() => {
          this.loading.delete(item.url);
          if (this.queue.length > 0) {
            this.process();
          }
        });
    }

    if (this.loading.size === 0 && this.queue.length === 0) {
      this.isProcessing = false;
    }
  }

  clear(): void {
    this.queue = [];
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

export const globalImageQueue = new ImageLoadQueue();
