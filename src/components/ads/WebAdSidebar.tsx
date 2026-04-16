import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

/**
 * Sticky sidebar ad for desktop web only.
 * Shows a 160x600 (Wide Skyscraper) AdSense ad on the right side.
 * Only visible on screens wider than 1280px.
 */
export function WebAdSidebar() {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense not loaded or blocked
    }
  }, []);

  return (
    <div className="web-ad-sidebar">
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '160px', height: '600px' }}
        data-ad-client="ca-pub-9489106590476826"
        data-ad-slot="auto"
        data-ad-format="vertical"
        data-full-width-responsive="false"
      />
      <p className="web-ad-label">Advertisement</p>
    </div>
  );
}
