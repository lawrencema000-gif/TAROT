import { useEffect, useRef } from 'react';
import { ADSENSE_CLIENT, AD_SLOTS } from './config';
import { useShouldShowAds } from './useShouldShowAds';
import { ensureAdSense, pushAdSlot } from './adsense';

/**
 * In-article native ad — designed to sit between paragraphs of a blog post
 * or tarot card page. Uses AdSense's `fluid` / `in-article` layout which
 * blends typographically with surrounding prose.
 *
 * Renders nothing for premium / ad-free users, and nothing if the slot ID
 * env var is missing (letting Auto Ads fill the space instead). Mounting it
 * is what loads the AdSense tag (see ./adsense.ts).
 */
export function InArticleAd() {
  const show = useShouldShowAds();
  const pushed = useRef(false);
  const slot = AD_SLOTS.inArticle;

  useEffect(() => {
    if (!show) return;
    ensureAdSense();
    if (!slot || pushed.current) return;
    if (pushAdSlot()) pushed.current = true;
  }, [show, slot]);

  if (!show || !slot) return null;

  return (
    <div className="in-article-ad" aria-label="Advertisement">
      <ins
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center' }}
        data-ad-layout="in-article"
        data-ad-format="fluid"
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
      />
    </div>
  );
}
