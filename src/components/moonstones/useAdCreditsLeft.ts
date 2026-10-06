// useAdCreditsLeft — how many rewarded ads can still earn Moonstones today,
// as the server last said, for every surface that offers "Watch an ad".
//
// The server credits at most six ads a UTC day (ad-reward, AD_DAILY_CAP).
// Once they are used up an ad earns nothing, so no screen may offer one:
// rewardedAdsService answers 0 then, and broadcasts `rewarded:credits`
// whenever the count changes (an ad credited, the cap hit). ad-config also
// carries the count, so it is fetched once on mount to learn it before the
// first ad of the session.

import { useEffect, useState } from 'react';
import { isNative } from '../../utils/platform';
import { rewardedAdsService } from '../../services/rewardedAds';
import { adConfigService } from '../../services/adConfig';

/**
 * Ads left today (0..6), or null when unknown (ad-config not loaded, signed
 * out). Always null on the web, which has no ads.
 */
export function useAdCreditsLeft(): number | null {
  const native = isNative();
  const [left, setLeft] = useState<number | null>(() => (native ? rewardedAdsService.getCreditsRemaining() : null));

  useEffect(() => {
    if (!native) return;
    let live = true;
    const read = () => {
      if (live) setLeft(rewardedAdsService.getCreditsRemaining());
    };
    read();
    adConfigService.fetchConfig().then(read, () => {});
    window.addEventListener('rewarded:credits', read);
    return () => {
      live = false;
      window.removeEventListener('rewarded:credits', read);
    };
  }, [native]);

  return left;
}

/** "Watch an ad" is offered only inside the native shell, and never once today's ad credits are used up. */
export function useCanOfferAd(): boolean {
  const left = useAdCreditsLeft();
  return isNative() && left !== 0;
}
