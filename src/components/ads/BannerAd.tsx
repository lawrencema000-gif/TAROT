import { useEffect, useRef } from 'react';
import { adsService } from '../../services/ads';
import { isNative } from '../../utils/platform';

interface BannerAdProps {
  visible: boolean;
  isPremium: boolean;
  isAdFree: boolean;
}

export function BannerAd({ visible, isPremium, isAdFree }: BannerAdProps) {
  const isShowingRef = useRef(false);

  useEffect(() => {
    if (!isNative()) return;

    const shouldShow = visible && !isPremium && !isAdFree;

    if (shouldShow && !isShowingRef.current) {
      isShowingRef.current = true;
      adsService.showBanner();
    } else if (!shouldShow && isShowingRef.current) {
      isShowingRef.current = false;
      adsService.hideBanner();
    }

    return () => {
      if (isShowingRef.current) {
        isShowingRef.current = false;
        adsService.hideBanner();
      }
    };
  }, [visible, isPremium, isAdFree]);

  return null;
}
