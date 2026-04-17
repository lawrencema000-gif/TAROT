import { useEffect, useRef } from 'react';
import { ADSENSE_CLIENT, AD_SLOTS } from './config';
import { useShouldShowAds } from './useShouldShowAds';

/**
 * End-of-article display ad — responsive unit placed after the main content.
 * Highest-engagement position (reader has finished the article) with minimal
 * UX disruption.
 */
export function EndOfArticleAd() {
  const show = useShouldShowAds();
  const pushed = useRef(false);
  const slot = AD_SLOTS.endOfArticle;

  useEffect(() => {
    if (!show || !slot || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense not loaded or blocked
    }
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
