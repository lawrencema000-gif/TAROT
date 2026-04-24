import { useState } from 'react';
import { Play, X, Coins, Crown } from 'lucide-react';
import { Button, toast } from '../ui';
import { rewardedAdsService, MOONSTONES_PER_AD } from '../../services/rewardedAds';
import { useT } from '../../i18n/useT';

/**
 * Earn-Moonstones-by-watching-ad sheet.
 *
 * Refactored 2026-04-25. Previously this sheet granted a single-use
 * feature unlock per ad. Now every ad credits +50 Moonstones (the
 * universal currency). Users spend Moonstones on reports OR subscribe
 * to Premium for unlimited access.
 *
 * Legacy prop API kept intact for backward compatibility with existing
 * callers — `feature`, `spreadType`, `onUnlocked` are accepted but only
 * used for telemetry + to fire the callback after the credit lands.
 * New callers should use the simpler `onCredited(newBalance)` callback.
 */

interface WatchAdSheetProps {
  open: boolean;
  onClose: () => void;
  /** Legacy — unused by the new credit flow; callers may leave absent. */
  feature?: string;
  /** Legacy — unused. */
  spreadType?: string;
  /**
   * Legacy — fired after a successful ad reward. Callers that used to
   * re-check feature access on this callback should instead check the
   * Moonstone balance or use `onCredited` below.
   */
  onUnlocked?: () => void;
  /** New — fires with the updated Moonstone balance after credit. */
  onCredited?: (newBalance: number) => void;
  /** Called when the user taps "Upgrade to Premium" instead. */
  onShowPaywall: () => void;
}

export function WatchAdSheet({
  open,
  onClose,
  onUnlocked,
  onCredited,
  onShowPaywall,
}: WatchAdSheetProps) {
  const { t } = useT('app');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleWatchAd = async () => {
    setLoading(true);
    try {
      const outcome = await rewardedAdsService.showRewardedAd({
        onCredited: (balance) => onCredited?.(balance),
      });

      switch (outcome) {
        case 'credited':
          toast(
            t('premium.watchAd.toasts.credited', {
              defaultValue: '+{{n}} Moonstones added to your balance',
              n: MOONSTONES_PER_AD,
            }),
            'success',
          );
          onUnlocked?.();
          onClose();
          break;
        case 'not-ready':
          toast(
            t('premium.watchAd.toasts.notAvailable', {
              defaultValue: 'Ad not available right now. Try again in a moment.',
            }),
            'error',
          );
          break;
        case 'persist-failed':
          toast(
            t('premium.watchAd.toasts.persistFailed', {
              defaultValue: "Ad watched, but we couldn't credit your balance. Check your connection and try again.",
            }),
            'error',
          );
          break;
        case 'dismissed':
          // Silent — user intentionally skipped.
          break;
        case 'disabled':
          toast(
            t('premium.watchAd.toasts.notAvailable', {
              defaultValue: 'Ad not available right now. Try again in a moment.',
            }),
            'error',
          );
          break;
      }
    } catch (error) {
      console.error('[WatchAdSheet] Error showing ad:', error);
      toast(t('premium.watchAd.toasts.error', { defaultValue: 'Something went wrong. Please try again.' }), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    onClose();
    onShowPaywall();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-mystic-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm bg-gradient-to-b from-mystic-900 to-mystic-950 rounded-3xl border border-mystic-700/50 shadow-2xl overflow-hidden animate-scale-in">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-gold/10 to-transparent" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-mystic-800/50 hover:bg-mystic-800 transition-colors"
          aria-label={t('common:actions.close', { defaultValue: 'Close' }) as string}
        >
          <X className="w-4 h-4 text-mystic-400" />
        </button>

        <div className="relative px-6 pt-8 pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center">
              <Coins className="w-8 h-8 text-gold" />
            </div>
          </div>

          <h2 className="font-display text-xl text-center text-mystic-100 mb-2">
            {t('premium.watchAd.earnTitle', {
              defaultValue: 'Earn {{n}} Moonstones',
              n: MOONSTONES_PER_AD,
            })}
          </h2>

          <p className="text-sm text-mystic-400 text-center mb-6 leading-relaxed">
            {t('premium.watchAd.earnSubtitle', {
              defaultValue:
                'Watch a short ad and get {{n}} Moonstones added to your balance. Spend them on reports or any feature.',
              n: MOONSTONES_PER_AD,
            })}
          </p>

          <div className="space-y-3">
            <Button
              variant="gold"
              fullWidth
              size="lg"
              onClick={handleWatchAd}
              loading={loading}
              className="min-h-[52px]"
            >
              <Play className="w-5 h-5" />
              {t('premium.watchAd.watchAdCta', {
                defaultValue: 'Watch ad → +{{n}} Moonstones',
                n: MOONSTONES_PER_AD,
              })}
            </Button>

            <Button
              variant="outline"
              fullWidth
              onClick={handleUpgrade}
              className="min-h-[44px]"
            >
              <Crown className="w-4 h-4" />
              {t('premium.watchAd.getUnlimited', {
                defaultValue: 'Or upgrade — unlock everything',
              })}
            </Button>

            <button
              onClick={onClose}
              className="w-full py-2 text-sm text-mystic-500 hover:text-mystic-400 transition-colors"
            >
              {t('premium.watchAd.notNow', { defaultValue: 'Not now' })}
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 pt-2 border-t border-mystic-800/50">
          <p className="text-xs text-mystic-600 text-center leading-relaxed">
            {t('premium.watchAd.footerDisclaimer', {
              defaultValue:
                'Premium unlocks every feature with no ads — usually better value than paying per report.',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
