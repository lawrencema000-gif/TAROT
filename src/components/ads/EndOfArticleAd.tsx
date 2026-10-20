import { useEffect, useRef } from 'react';
import { ADSENSE_CLIENT, AD_SLOTS } from './config';
import { useShouldShowAds } from './useShouldShowAds';
import { ensureAdSense, pushAdSlot } from './adsense';

/**
 * End-of-article display ad — responsive unit placed after the main content.
 * Highest-engagement position (reader has finished the article) with minimal
 * UX disruption. Mounting it is what loads the AdSense tag (see ./adsense.ts).
 */
export function EndOfArticleAd() {
  const show = useShouldShowAds();
  const pushed = useRef(false);
  const slot = AD_SLOTS.endOfArticle;

  useEffect(() => {
    if (!show) return;
    ensureAdSense();
    if (!slot || pushed.current) return;
    if (pushAdSlot()) pushed.current = true;
  }, [show, slot]);

  if (!show || !slot) return null;

  return (
    <div className="end-of-article-ad" aria-label="Advertisement">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
