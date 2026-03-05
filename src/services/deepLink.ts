/**
 * Deep link handler for content sharing URLs.
 *
 * Supported routes:
 *   https://arcana.app/reading/:id
 *   https://arcana.app/card/:cardId
 *   https://arcana.app/horoscope/:sign
 */

export interface DeepLinkRoute {
  type: 'reading' | 'card' | 'horoscope' | 'unknown';
  id?: string;
}

const DEEP_LINK_HOST = 'arcana.app';

export function parseDeepLink(url: string): DeepLinkRoute | null {
  try {
    const parsed = new URL(url);

    // Only handle our domain or custom scheme
    if (parsed.host !== DEEP_LINK_HOST && parsed.protocol !== 'com.arcana.app:') {
      return null;
    }

    // Skip auth callback URLs
    if (parsed.pathname.startsWith('/auth') || parsed.host === 'auth') {
      return null;
    }

    const segments = parsed.pathname.split('/').filter(Boolean);

    if (segments.length < 2) {
      return { type: 'unknown' };
    }

    switch (segments[0]) {
      case 'reading':
        return { type: 'reading', id: segments[1] };
      case 'card':
        return { type: 'card', id: segments[1] };
      case 'horoscope':
        return { type: 'horoscope', id: segments[1] };
      default:
        return { type: 'unknown' };
    }
  } catch {
    return null;
  }
}

export function generateShareUrl(type: 'reading' | 'card' | 'horoscope', id: string): string {
  return `https://${DEEP_LINK_HOST}/${type}/${encodeURIComponent(id)}`;
}
