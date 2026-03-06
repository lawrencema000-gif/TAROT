import { useEffect, useMemo, useRef } from 'react';
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
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isNative()) return;

    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }

    if (shouldShow) {
      const attemptShow = async (attempt = 1) => {
        try {
          await adsService.showBanner();
        } catch {
          if (attempt < 3) {
            retryTimer.current = setTimeout(() => attemptShow(attempt + 1), attempt * 2000);
          }
        }
      };
      attemptShow();
    } else {
      adsService.hideBanner();
    }

    return () => {
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
    };
  }, [shouldShow]);

  useEffect(() => {
    if (!isNative()) return;
    return () => {
      adsService.hideBanner();
    };
  }, []);

  return null;
}
