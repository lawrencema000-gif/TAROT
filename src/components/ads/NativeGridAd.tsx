import { useEffect, useRef } from 'react';
import { ADSENSE_CLIENT, AD_SLOTS } from './config';
import { useShouldShowAds } from './useShouldShowAds';
import { ensureAdSense, pushAdSlot } from './adsense';

/**
 * Native grid ad — styled to visually match a blog post card so it doesn't
 * break the grid rhythm. Placed as every Nth card in the blog index.
 * Mounting it is what loads the AdSense tag (see ./adsense.ts).
 */
export function NativeGridAd() {
  const show = useShouldShowAds();
  const pushed = useRef(false);
  const slot = AD_SLOTS.blogGrid;

  useEffect(() => {
    if (!show) return;
    ensureAdSense();
    if (!slot || pushed.current) return;
    if (pushAdSlot()) pushed.current = true;
  }, [show, slot]);

  if (!show || !slot) return null;

  return (
    <div className="native-grid-ad" aria-label="Advertisement">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-format="fluid"
        data-ad-layout-key="-gw-3+1f-3d+2z"
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
      />
    </div>
  );
}
