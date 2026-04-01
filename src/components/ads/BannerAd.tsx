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
  const wasShowing = useRef(false);

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
          wasShowing.current = true;
        } catch {
          if (attempt < 3) {
            retryTimer.current = setTimeout(() => attemptShow(attempt + 1), attempt * 2000);
          } else {
            // All retries failed — make sure native banner view is fully removed
            adsService.removeBanner();
            wasShowing.current = false;
          }
        }
      };
      attemptShow();
    } else if (wasShowing.current) {
      // Only remove if we previously showed a banner
      adsService.removeBanner();
      wasShowing.current = false;
    }

    return () => {
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
    };
  }, [shouldShow]);

  // Cleanup on unmount
  useEffect(() => {
    if (!isNative()) return;
    return () => {
      adsService.removeBanner();
      wasShowing.current = false;
    };
  }, []);

  return null;
}
