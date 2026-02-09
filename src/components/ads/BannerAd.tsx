import { useEffect, useMemo } from 'react';
import { adsService } from '../../services/ads';
import { isNative } from '../../utils/platform';

interface BannerAdProps {
  visible: boolean;
  isPremium: boolean;
  isAdFree: boolean;
}

export function BannerAd({ visible, isPremium, isAdFree }: BannerAdProps) {
  const shouldShow = useMemo(
    () => isNative() && visible && !isPremium && !isAdFree,
    [visible, isPremium, isAdFree]
  );

  useEffect(() => {
    if (!isNative()) return;

    if (shouldShow) {
      adsService.showBanner();
    } else {
      adsService.hideBanner();
    }
  }, [shouldShow]);

  useEffect(() => {
    if (!isNative()) return;
    return () => {
      adsService.hideBanner();
    };
  }, []);

  return null;
}
