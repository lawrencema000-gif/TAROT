import { ADSENSE_CLIENT } from './config';
import { isNative } from '../../utils/platform';

/**
 * The AdSense loader, owned by the ad components.
 *
 * `adsbygoogle.js` used to be the first `<script async>` in index.html, so
 * every visitor on every route — the landing, the signed-in app, the
 * onboarding — downloaded 56 KB that pulled a further 164 KB and a
 * doubleclick iframe before the entry chunk had even been requested, and
 * the only pages with an ad slot were the public SEO pages. Lighthouse put
 * ~1.1 s of main-thread time on the landing at its door.
 *
 * Now the tag is injected the first time an ad component mounts (and only
 * when the viewer should see ads), so the pages without an ad never pay for
 * it. AdSense Auto Ads therefore also run only on pages that render an ad
 * component: the public blog / learn / card-meaning shell. Native uses
 * AdMob, never this.
 */

export const ADSENSE_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

let injected = false;

/** Add the AdSense script to <head> once. Safe to call from every ad component's effect. */
export function ensureAdSense(): void {
  if (injected || typeof document === 'undefined' || isNative()) return;
  injected = true;
  if (document.querySelector('script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = ADSENSE_SRC;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}

/**
 * Queue a fill for the `<ins class="adsbygoogle">` this component just
 * rendered. The queue is processed when (or after) the script loads, so the
 * order — ensure the tag, then push — does not depend on the network.
 */
export function pushAdSlot(): boolean {
  try {
    ensureAdSense();
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    return true;
  } catch {
    // AdSense blocked or unavailable — the slot stays empty.
    return false;
  }
}
