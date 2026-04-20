import { useState, useEffect } from 'react';
import { Play, X, Gift, Clock, Crown, Sparkles, BookOpen } from 'lucide-react';
import { Button, toast } from '../ui';
import { rewardedAdsService } from '../../services/rewardedAds';
import { PREMIUM_FEATURES, type PremiumFeature } from '../../services/premium';
import { localizedFeature } from '../../i18n/localizePremium';
import { useT } from '../../i18n/useT';

interface WatchAdSheetProps {
  open: boolean;
  onClose: () => void;
  feature: PremiumFeature;
  spreadType?: string;
  onUnlocked: () => void;
  onShowPaywall: () => void;
}

const FEATURE_CONTEXT: Partial<Record<PremiumFeature, { contextKey: string; icon: typeof Gift }>> = {
  extra_reading: {
    contextKey: 'extraReading',
    icon: Sparkles,
  },
  deep_interpretations: {
    contextKey: 'deepInterpretations',
    icon: BookOpen,
  },
};

export function WatchAdSheet({
  open,
  onClose,
  feature,
  spreadType,
  onUnlocked,
  onShowPaywall,
}: WatchAdSheetProps) {
  const { t } = useT('app');
  const [loading, setLoading] = useState(false);
  const [remainingUnlocks, setRemainingUnlocks] = useState(0);

  useEffect(() => {
    if (open) {
      rewardedAdsService.getRemainingUnlocks().then(setRemainingUnlocks);
    }
  }, [open]);
  const featureDef = localizedFeature(PREMIUM_FEATURES[feature]);
  const context = FEATURE_CONTEXT[feature];

  if (!open) return null;

  const title = context
    ? t(`premium.watchAd.contexts.${context.contextKey}.title`)
    : t('premium.watchAd.defaultTitle', { feature: featureDef.name });
  const subtitle = context
    ? t(`premium.watchAd.contexts.${context.contextKey}.subtitle`)
    : t('premium.watchAd.defaultSubtitle');
  const Icon = context?.icon || Gift;

  const handleWatchAd = async () => {
    setLoading(true);
    try {
      const success = await rewardedAdsService.showRewardedAd(feature, spreadType);

      if (success) {
        toast(t('premium.watchAd.toasts.unlocked'), 'success');
        onUnlocked();
        onClose();
      } else {
        toast(t('premium.watchAd.toasts.notAvailable'), 'error');
      }
    } catch (error) {
      console.error('[WatchAdSheet] Error showing ad:', error);
      toast(t('premium.watchAd.toasts.error'), 'error');
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
        >
          <X className="w-4 h-4 text-mystic-400" />
        </button>

        <div className="relative px-6 pt-8 pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center">
              <Icon className="w-8 h-8 text-gold" />
            </div>
          </div>

          <h2 className="font-display text-xl text-center text-mystic-100 mb-2">
            {title}
          </h2>

          <p className="text-sm text-mystic-400 text-center mb-4">
            {subtitle}
          </p>

          <div className="flex items-center justify-center gap-2 px-3 py-2 bg-mystic-800/50 rounded-full mb-6">
            <Clock className="w-4 h-4 text-mystic-500" />
            <span className="text-sm text-mystic-300">
              {t('premium.watchAd.unlocksRemaining', { remaining: remainingUnlocks, total: 5 })}
            </span>
          </div>

          <div className="space-y-3">
            {remainingUnlocks > 0 ? (
              <Button
                variant="gold"
                fullWidth
                size="lg"
                onClick={handleWatchAd}
                loading={loading}
                className="min-h-[52px]"
              >
                <Play className="w-5 h-5" />
                {t('premium.watchAd.watchAdToUnlock')}
              </Button>
            ) : (
              <div className="text-center py-3">
                <p className="text-sm text-mystic-400 mb-2">
                  {t('premium.watchAd.usedAllUnlocks')}
                </p>
                <p className="text-xs text-mystic-500">
                  {t('premium.watchAd.comeBackTomorrow')}
                </p>
              </div>
            )}

            <Button
              variant="outline"
              fullWidth
              onClick={handleUpgrade}
              className="min-h-[44px]"
            >
              <Crown className="w-4 h-4" />
              {t('premium.watchAd.getUnlimited')}
            </Button>

            <button
              onClick={onClose}
              className="w-full py-2 text-sm text-mystic-500 hover:text-mystic-400 transition-colors"
            >
              {t('premium.watchAd.notNow')}
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 pt-2 border-t border-mystic-800/50">
          <p className="text-xs text-mystic-600 text-center">
            {t('premium.watchAd.footerDisclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
}
