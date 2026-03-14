import { useState, useEffect } from 'react';
import { Play, X, Gift, Clock, Crown, Sparkles, BookOpen } from 'lucide-react';
import { Button, toast } from '../ui';
import { rewardedAdsService } from '../../services/rewardedAds';
import { PREMIUM_FEATURES, type PremiumFeature } from '../../services/premium';

interface WatchAdSheetProps {
  open: boolean;
  onClose: () => void;
  feature: PremiumFeature;
  spreadType?: string;
  onUnlocked: () => void;
  onShowPaywall: () => void;
}

const FEATURE_CONTEXT: Partial<Record<PremiumFeature, { title: string; subtitle: string; icon: typeof Gift }>> = {
  extra_reading: {
    title: 'Get an Extra Reading',
    subtitle: 'Watch a short ad to unlock one more tarot reading today',
    icon: Sparkles,
  },
  deep_interpretations: {
    title: 'Unlock Extended Interpretation',
    subtitle: 'Watch a short ad for a deeper look into your cards',
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
  const [loading, setLoading] = useState(false);
  const [remainingUnlocks, setRemainingUnlocks] = useState(0);

  useEffect(() => {
    if (open) {
      rewardedAdsService.getRemainingUnlocks().then(setRemainingUnlocks);
    }
  }, [open]);
  const featureDef = PREMIUM_FEATURES[feature];
  const context = FEATURE_CONTEXT[feature];

  if (!open) return null;

  const title = context?.title || `Try ${featureDef.name}`;
  const subtitle = context?.subtitle || 'Watch a short ad to unlock this premium feature for one use';
  const Icon = context?.icon || Gift;

  const handleWatchAd = async () => {
    setLoading(true);
    try {
      const success = await rewardedAdsService.showRewardedAd(feature, spreadType);

      if (success) {
        toast('Feature unlocked! Enjoy your free trial.', 'success');
        onUnlocked();
        onClose();
      } else {
        toast('Ad not available. Please try again.', 'error');
      }
    } catch (error) {
      console.error('[WatchAdSheet] Error showing ad:', error);
      toast('Something went wrong. Please try again.', 'error');
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
              {remainingUnlocks} of {5} free unlocks remaining today
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
                Watch Ad to Unlock
              </Button>
            ) : (
              <div className="text-center py-3">
                <p className="text-sm text-mystic-400 mb-2">
                  You've used all free unlocks for today
                </p>
                <p className="text-xs text-mystic-500">
                  Come back tomorrow or upgrade to Premium
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
              Get Unlimited Access
            </Button>

            <button
              onClick={onClose}
              className="w-full py-2 text-sm text-mystic-500 hover:text-mystic-400 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 pt-2 border-t border-mystic-800/50">
          <p className="text-xs text-mystic-600 text-center">
            Premium members get unlimited access to all features with no ads
          </p>
        </div>
      </div>
    </div>
  );
}
