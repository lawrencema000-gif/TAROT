import { useEffect, useState } from 'react';
import { Play, X, Coins, Crown, Sparkles } from 'lucide-react';
import { Button, toast, FourCornerFlourishes, OrnateDivider } from '../ui';
import { rewardedAdsService, MOONSTONES_PER_AD } from '../../services/rewardedAds';
import { spendForAction, ACTION_COST } from '../../dal/moonstoneSpend';
import { moonstones } from '../../dal';
import { onBalanceChange } from '../../dal/moonstoneSpend';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n/useT';
import { isNative } from '../../utils/platform';

/**
 * Earn-or-spend Moonstones sheet for premium-gated features.
 *
 * Two paths to unlock the feature:
 *   1. Watch a rewarded ad → +50 Moonstones credited (no auto-unlock).
 *      User must then tap "Spend X to unlock" if they're ready.
 *   2. Spend 50 Moonstones directly → debits the balance and fires
 *      `onSpent` so the parent can grant feature access for one use.
 *   3. Upgrade to premium for unlimited.
 *
 * Behaviour fix 2026-04-26: previously watching an ad credited Moonstones
 * AND auto-unlocked the feature (double benefit, no spend). Now ad-watch
 * is credits-only; spending is a separate explicit action.
 */

interface WatchAdSheetProps {
  open: boolean;
  onClose: () => void;
  /** Action key for the spend RPC. Defaults to 'feature-unlock'. */
  actionKey?: string;
  /** Cost in Moonstones to unlock via spend. Defaults to 50. */
  cost?: number;
  /** Legacy telemetry — kept for backward compat, unused by the new flow. */
  feature?: string;
  /** Legacy telemetry — kept for backward compat, unused by the new flow. */
  spreadType?: string;
  /** Legacy — fired for backward compat with callers that still listen. */
  onUnlocked?: () => void;
  /** Fires after a successful spend — parent grants the feature access. */
  onSpent?: () => void;
  /** Fires after a successful ad credit. Sheet stays open for follow-up. */
  onCredited?: (newBalance: number) => void;
  /** Called when the user taps "Upgrade to Premium" instead. */
  onShowPaywall: () => void;
}

export function WatchAdSheet({
  open,
  onClose,
  actionKey = 'feature-unlock',
  cost = ACTION_COST,
  onUnlocked,
  onSpent,
  onCredited,
  onShowPaywall,
}: WatchAdSheetProps) {
  const { t } = useT('app');
  const { user } = useAuth();
  const [adLoading, setAdLoading] = useState(false);
  const [spendLoading, setSpendLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    moonstones.getBalance(user.id).then((res) => {
      if (!cancelled && res.ok) setBalance(res.data);
    });
    const off = onBalanceChange((newBalance) => {
      if (!cancelled) setBalance(newBalance);
    });
    return () => { cancelled = true; off(); };
  }, [open, user?.id]);

  if (!open) return null;

  const handleWatchAd = async () => {
    setAdLoading(true);
    try {
      const outcome = await rewardedAdsService.showRewardedAd({
        onCredited: (newBalance) => {
          setBalance(newBalance);
          onCredited?.(newBalance);
        },
      });

      switch (outcome) {
        case 'credited':
          toast(
            t('premium.watchAd.toasts.credited', {
              defaultValue: '+{{n}} Moonstones added. Tap "Spend" to unlock.',
              n: MOONSTONES_PER_AD,
            }),
            'success',
          );
          // NOTE: deliberately do NOT call onUnlocked here. Earning Moonstones
          // and using them are now two separate steps. Parent only grants
          // access on a successful spend (handleSpend below).
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
              defaultValue: "Ad watched, but we couldn't credit your balance. Check your connection.",
            }),
            'error',
          );
          break;
        case 'dismissed':
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
      setAdLoading(false);
    }
  };

  const handleSpend = async () => {
    setSpendLoading(true);
    try {
      const idem = `${actionKey}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const res = await spendForAction(actionKey, cost, idem);
      if (!res.ok) {
        toast(
          t('premium.watchAd.toasts.spendFailed', { defaultValue: 'Could not spend Moonstones. Try again.' }),
          'error',
        );
        return;
      }
      if (!res.data.allowed) {
        toast(
          t('premium.watchAd.toasts.insufficient', {
            defaultValue: 'You need {{n}} Moonstones to unlock this. Watch an ad to earn more.',
            n: cost,
          }),
          'error',
        );
        return;
      }
      // Premium bypass: server didn't actually debit (free for premium users).
      // Either way, we've earned the right to grant access.
      toast(
        t('premium.watchAd.toasts.unlocked', { defaultValue: 'Unlocked. Enjoy your reading.' }),
        'success',
      );
      onSpent?.();
      onUnlocked?.(); // legacy callback
      onClose();
    } finally {
      setSpendLoading(false);
    }
  };

  const handleUpgrade = () => {
    onClose();
    onShowPaywall();
  };

  const canSpend = balance !== null && balance >= cost;
  const adAvailable = isNative();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-mystic-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm bg-gradient-to-b from-mystic-900 to-mystic-950 rounded-3xl border border-gold/40 shadow-2xl shadow-glow-md overflow-hidden animate-scale-in nebula-veil">
        <div className="absolute inset-[3px] rounded-[calc(1.5rem-3px)] border border-gold/15 pointer-events-none" />
        <FourCornerFlourishes className="text-gold/60 z-10" size={28} />
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-gold/10 to-transparent" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-mystic-800/50 hover:bg-mystic-800 transition-colors"
          aria-label={t('common:actions.close', { defaultValue: 'Close' }) as string}
        >
          <X className="w-4 h-4 text-mystic-400" />
        </button>

        <div className="relative px-6 pt-8 pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/25 to-mystic-800 flex items-center justify-center shadow-glow">
              <Coins className="w-8 h-8 text-gold" />
            </div>
          </div>

          <h2 className="font-display-hero text-2xl text-gold-foil text-center mb-2">
            {t('premium.watchAd.unlockTitle', { defaultValue: 'Unlock this reading' })}
          </h2>
          <div className="flex justify-center mb-3 text-gold/60">
            <OrnateDivider width={140} />
          </div>

          <p className="text-sm text-mystic-300 text-center mb-2 leading-relaxed">
            {t('premium.watchAd.unlockSubtitle', {
              defaultValue: 'Spend {{cost}} Moonstones, or watch a short ad to earn {{ad}} first.',
              cost,
              ad: MOONSTONES_PER_AD,
            })}
          </p>

          {balance !== null && (
            <p className="text-xs text-mystic-500 text-center mb-5">
              {t('premium.watchAd.currentBalance', {
                defaultValue: 'You have {{n}} Moonstones',
                n: balance,
              })}
            </p>
          )}

          <div className="space-y-3">
            {/* Primary action: spend if affordable, otherwise watch ad. */}
            <Button
              variant="gold"
              fullWidth
              size="lg"
              onClick={handleSpend}
              loading={spendLoading}
              disabled={!canSpend || spendLoading}
              className="min-h-[52px]"
            >
              <Sparkles className="w-5 h-5" />
              {t('premium.watchAd.spendCta', {
                defaultValue: 'Spend {{n}} Moonstones to unlock',
                n: cost,
              })}
            </Button>

            {adAvailable && (
              <Button
                variant="outline"
                fullWidth
                size="lg"
                onClick={handleWatchAd}
                loading={adLoading}
                disabled={adLoading}
                className="min-h-[48px]"
              >
                <Play className="w-4 h-4" />
                {t('premium.watchAd.watchAdCta', {
                  defaultValue: 'Watch ad → +{{n}} Moonstones',
                  n: MOONSTONES_PER_AD,
                })}
              </Button>
            )}

            <Button
              variant="ghost"
              fullWidth
              onClick={handleUpgrade}
              className="min-h-[40px]"
            >
              <Crown className="w-4 h-4" />
              {t('premium.watchAd.getUnlimited', {
                defaultValue: 'Or upgrade for unlimited access',
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
                'Premium unlocks every feature with no ads — usually better value than spending Moonstones one at a time.',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
