import { useEffect, useRef } from 'react';
import { ADSENSE_CLIENT, AD_SLOTS } from './config';
import { useShouldShowAds } from './useShouldShowAds';

/**
 * In-article native ad — designed to sit between paragraphs of a blog post
 * or tarot card page. Uses AdSense's `fluid` / `in-article` layout which
 * blends typographically with surrounding prose.
 *
 * Renders nothing for premium / ad-free users, and nothing if the slot ID
 * env var is missing (letting Auto Ads fill the space instead).
 */
export function InArticleAd() {
  const show = useShouldShowAds();
  const pushed = useRef(false);
  const slot = AD_SLOTS.inArticle;

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
