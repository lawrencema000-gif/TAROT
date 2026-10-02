import { useEffect, useRef } from 'react';
import { ADSENSE_CLIENT, AD_SLOTS } from './config';
import { useShouldShowAds } from './useShouldShowAds';
import { ensureAdSense, pushAdSlot } from './adsense';

type Side = 'left' | 'right';

interface WebAdSidebarProps {
  side: Side;
}

/**
 * Sticky sidebar ad — one on each flank of the content column.
 * 160x600 Wide Skyscraper. Only visible on screens ≥ 1400px where there's
 * enough horizontal room that the ad doesn't crowd the content (see CSS).
 * Hidden for premium / ad-free users.
 *
 * This is the one ad component the app mounts today (the public SEO shell
 * in App.tsx), so it is also what brings the AdSense tag onto the page:
 * `ensureAdSense` runs for every viewer who should see ads, with or without
 * a slot id, so Auto Ads keep running on the public pages after the tag
 * left index.html.
 */
export function WebAdSidebar({ side }: WebAdSidebarProps) {
  const show = useShouldShowAds();
  const pushed = useRef(false);
  const slot = side === 'left' ? AD_SLOTS.sidebarLeft : AD_SLOTS.sidebarRight;

  useEffect(() => {
    if (!show) return;
    ensureAdSense();
    if (!slot || pushed.current) return;
    if (pushAdSlot()) pushed.current = true;
  }, [show, slot]);

  if (!show || !slot) return null;

  return (
    <div className={`web-ad-sidebar web-ad-sidebar-${side}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '160px', height: '600px' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format="vertical"
        data-full-width-responsive="false"
      />
      <p className="web-ad-label">Advertisement</p>
    </div>
  );
}
