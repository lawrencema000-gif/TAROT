/**
 * Deep link handler for content sharing URLs.
 *
 * Supported routes:
 *   https://tarotlife.app/reading/:id
 *   https://tarotlife.app/card/:cardId
 *   https://tarotlife.app/horoscope/:sign
 */

export interface DeepLinkRoute {
  type: 'reading' | 'card' | 'horoscope' | 'unknown';
  id?: string;
}

// The live web app (and every share URL built via window.location.origin)
// lives on tarotlife.app, and the Android app opens its links (the App Links
// in AndroidManifest.xml). The host was arcana.app, which is not ours, so a
// share URL built here sent friends to someone else's server (p10).
const DEEP_LINK_HOST = 'tarotlife.app';
const DEEP_LINK_HOSTS = [DEEP_LINK_HOST, 'www.tarotlife.app'];

export function parseDeepLink(url: string): DeepLinkRoute | null {
  try {
    const parsed = new URL(url);

    // Only handle our domains or custom scheme
    if (!DEEP_LINK_HOSTS.includes(parsed.host) && parsed.protocol !== 'com.arcana.app:') {
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
