import { useEffect, useState } from 'react';
import { Play, X, Coins, Crown } from 'lucide-react';
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
  /**
   * Hide the "spend Moonstones" action and offer earning only.
   *
   * The three report pages open this sheet from an "Earn 50 Moonstones —
   * watch ad" CTA and do their own unlocking through
   * reportUnlocks.unlockWithMoonstones, which charges the real price
   * (150/200/300) against the real report key. They passed no actionKey,
   * cost, onSpent or onUnlocked — so this sheet's spend button fell back to
   * its generic defaults and debited 50 Moonstones for 'feature-unlock',
   * then had no callback to unlock anything with. The user paid and got
   * nothing. Earning is the only thing that makes sense in that context.
   */
  earnOnly?: boolean;
  /** Fires after a successful spend — parent grants the feature access. */
  onSpent?: () => void;
  /** Fires after a successful ad credit. Sheet stays open for follow-up. */
  onCredited?: (newBalance: number) => void;
  /** Called when the user taps "Upgrade to Premium" instead. */
  onShowPaywall: () => void;
  /**
   * Localized name of the thing being unlocked ("Career Archetype"). The
   * headline reads "Unlock {{name}}"; without it, "Unlock this reading".
   */
  itemName?: string;
}

export function WatchAdSheet({
  open,
  onClose,
  actionKey = 'feature-unlock',
  cost = ACTION_COST,
  onUnlocked,
  earnOnly = false,
  onSpent,
  onCredited,
  onShowPaywall,
  itemName,
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
            earnOnly
              ? t('premium.watchAd.toasts.creditedEarnOnly', {
                  defaultValue: '{{n}} Moonstones added.',
                  n: MOONSTONES_PER_AD,
                })
              : t('premium.watchAd.toasts.credited', {
                  defaultValue: '{{n}} Moonstones added. Spend them below to unlock.',
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
              defaultValue: 'No ad is ready right now. Try again in a moment.',
            }),
            'error',
          );
          break;
        case 'persist-failed':
          toast(
            t('premium.watchAd.toasts.persistFailed', {
              defaultValue:
                'You watched the ad, but the Moonstones couldn’t be saved. Check your connection and try again.',
            }),
            'error',
          );
          break;
        case 'dismissed':
          break;
        case 'disabled':
          toast(
            t('premium.watchAd.toasts.adsDisabled', {
              defaultValue: 'Ads aren’t available on this device.',
            }),
            'error',
          );
          break;
      }
    } catch (error) {
      console.error('[WatchAdSheet] Error showing ad:', error);
      toast(
        t('premium.watchAd.toasts.error', {
          defaultValue: 'The ad couldn’t play. Check your connection and try again.',
        }),
        'error',
      );
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
          t('premium.watchAd.toasts.spendFailed', {
            defaultValue: 'Couldn’t spend your Moonstones — check your connection and try again.',
          }),
          'error',
        );
        return;
      }
      if (!res.data.allowed) {
        toast(
          t('premium.watchAd.toasts.insufficient', {
            defaultValue: 'You need {{n}} Moonstones for this. Watch an ad to earn more.',
            n: cost,
          }),
          'error',
        );
        return;
      }
      // Premium bypass: server didn't actually debit (free for premium users).
      // Either way, we've earned the right to grant access.
      toast(
        t('premium.watchAd.toasts.unlocked', { defaultValue: 'Unlocked. Your reading is open.' }),
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

      <div className="relative w-full max-w-sm bg-gradient-to-b from-mystic-900 to-mystic-950 rounded-sheet border border-gold/40 overflow-hidden animate-scale-in nebula-veil">
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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/25 to-mystic-800 flex items-center justify-center">
              <Coins className="w-8 h-8 text-gold" />
            </div>
          </div>

          <h2 className="font-display-hero text-2xl text-mystic-100 text-center mb-2">
            {itemName
              ? t('premium.watchAd.unlockNamed', { defaultValue: 'Unlock {{name}}', name: itemName })
              : t('premium.watchAd.unlockTitle', { defaultValue: 'Unlock this reading' })}
          </h2>
          <div className="flex justify-center mb-3 text-gold/60">
            <OrnateDivider width={140} />
          </div>

          <p className="text-sm text-mystic-300 text-center mb-2 leading-relaxed">
            {earnOnly
              ? t('premium.watchAd.earnOnlySubtitle', {
                  defaultValue:
                    'It costs {{cost}} Moonstones. Each short ad earns {{ad}}; once you have enough, unlock it from this page.',
                  cost,
                  ad: MOONSTONES_PER_AD,
                })
              : t('premium.watchAd.unlockSubtitle', {
                  defaultValue: 'Spend {{cost}} Moonstones to read it now, or watch a short ad to earn {{ad}} first.',
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
            {!earnOnly && (
              <Button
                variant="gold"
                fullWidth
                size="lg"
                onClick={handleSpend}
                loading={spendLoading}
                disabled={!canSpend || spendLoading}
              >
                <Coins className="w-5 h-5" />
                {t('premium.watchAd.spendCta', {
                  defaultValue: 'Spend {{n}} Moonstones to unlock',
                  n: cost,
                })}
              </Button>
            )}

            {adAvailable && (
              <Button
                variant="outline"
                fullWidth
                size="lg"
                onClick={handleWatchAd}
                loading={adLoading}
                disabled={adLoading}
              >
                <Play className="w-4 h-4" />
                {t('premium.watchAd.watchAdCta', {
                  defaultValue: 'Watch an ad, earn {{n}} Moonstones',
                  n: MOONSTONES_PER_AD,
                })}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              fullWidth
              onClick={handleUpgrade}
            >
              <Crown className="w-4 h-4" />
              {t('premium.watchAd.getUnlimited', {
                defaultValue: 'Or open everything with Premium',
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
                'With Premium there is nothing to spend: every spread, chart and reading is open, with no ads.',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
