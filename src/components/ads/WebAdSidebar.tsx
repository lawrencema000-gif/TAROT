import { useEffect, useRef } from 'react';
import { ADSENSE_CLIENT, AD_SLOTS } from './config';
import { useShouldShowAds } from './useShouldShowAds';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

type Side = 'left' | 'right';

interface WebAdSidebarProps {
  side: Side;
}

/**
 * Sticky sidebar ad — one on each flank of the content column.
 * 160x600 Wide Skyscraper. Only visible on screens ≥ 1400px where there's
 * enough horizontal room that the ad doesn't crowd the content (see CSS).
 * Hidden for premium / ad-free users.
 */
export function WebAdSidebar({ side }: WebAdSidebarProps) {
  const show = useShouldShowAds();
  const pushed = useRef(false);
  const slot = side === 'left' ? AD_SLOTS.sidebarLeft : AD_SLOTS.sidebarRight;

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
