import { useState, useEffect, useCallback } from 'react';
import { Crown, Lock, Play } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PaywallSheet } from './PaywallSheet';
import { WatchAdSheet } from './WatchAdSheet';
import type { PremiumFeature } from '../../services/premium';
import { PREMIUM_FEATURES, isFeatureUnlockable } from '../../services/premium';
import { localizedFeature, localizedFeatureName } from '../../i18n/localizePremium';
import { rewardedAdsService } from '../../services/rewardedAds';
import { isNative } from '../../utils/platform';
import { useT } from '../../i18n/useT';

interface PremiumGateProps {
  feature: PremiumFeature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showBadge?: boolean;
}

export function PremiumGate({ feature, children, fallback, showBadge = true }: PremiumGateProps) {
  const { t } = useT('app');
  const { profile, isAdmin } = useAuth();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showWatchAd, setShowWatchAd] = useState(false);
  const [hasTemporaryAccess, setHasTemporaryAccess] = useState(false);
  const [canWatch, setCanWatch] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (profile?.isPremium || isAdmin) return;
      const hasAccess = await rewardedAdsService.hasTemporaryAccess(feature);
      setHasTemporaryAccess(hasAccess);
      if (isNative() && isFeatureUnlockable(feature)) {
        const watchable = await rewardedAdsService.canWatchAd();
        setCanWatch(watchable);
      }
    };
    checkAccess();
  }, [feature, profile?.isPremium, isAdmin]);

  if (profile?.isPremium || isAdmin || hasTemporaryAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const handleClick = () => {
    if (isNative() && isFeatureUnlockable(feature) && canWatch) {
      setShowWatchAd(true);
    } else {
      setShowPaywall(true);
    }
  };

  const handleUnlocked = () => {
    setHasTemporaryAccess(true);
  };

  return (
    <>
      <div onClick={handleClick} className="cursor-pointer">
        {children}
        {showBadge && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-gold/20 border border-gold/30 rounded-full flex items-center gap-1">
            <Crown className="w-3 h-3 text-gold" />
            <span className="text-xs font-medium text-gold">{t('premium.badge')}</span>
          </div>
        )}
      </div>
      <PaywallSheet
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature={localizedFeatureName(feature)}
      />
      <WatchAdSheet
        open={showWatchAd}
        onClose={() => setShowWatchAd(false)}
        feature={feature}
        onUnlocked={handleUnlocked}
        onShowPaywall={() => {
          setShowWatchAd(false);
          setShowPaywall(true);
        }}
      />
    </>
  );
}

interface PremiumBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function PremiumBadge({ size = 'sm', className = '' }: PremiumBadgeProps) {
  const { t } = useT('app');
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 bg-gold/20 border border-gold/30 rounded-full ${className}`}>
      <Crown className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} style={{ color: 'rgb(212, 175, 55)' }} />
      <span className={`font-medium text-gold ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>{t('premium.badge')}</span>
    </span>
  );
}

interface PremiumLockOverlayProps {
  feature: PremiumFeature;
  onUnlock: () => void;
  showAdOption?: boolean;
  onWatchAd?: () => void;
}

export function PremiumLockOverlay({ feature, onUnlock, showAdOption, onWatchAd }: PremiumLockOverlayProps) {
  const { t } = useT('app');
  const featureDef = localizedFeature(PREMIUM_FEATURES[feature]);
  const [canWatch, setCanWatch] = useState(false);

  useEffect(() => {
    if (isNative() && isFeatureUnlockable(feature)) {
      rewardedAdsService.canWatchAd().then(setCanWatch);
    }
  }, [feature]);

  return (
    <div
      onClick={onUnlock}
      className="absolute inset-0 bg-mystic-950/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all hover:bg-mystic-950/70"
    >
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center mb-3">
        <Lock className="w-7 h-7 text-gold" />
      </div>
      <p className="font-medium text-mystic-100 text-center px-4">{featureDef.name}</p>
      <p className="text-sm text-mystic-400 text-center px-4 mt-1">{featureDef.description}</p>
      <div className="flex flex-col gap-2 mt-4">
        {showAdOption && canWatch && onWatchAd && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onWatchAd();
            }}
            className="px-4 py-2 bg-mystic-800 border border-gold/30 text-gold font-medium rounded-lg text-sm hover:bg-mystic-700 transition-colors flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {t('premium.gate.watchAdToTry')}
          </button>
        )}
        <button className="px-4 py-2 bg-gold text-mystic-950 font-medium rounded-lg text-sm hover:bg-gold-dark transition-colors">
          {t('premium.gate.unlockPremium')}
        </button>
      </div>
    </div>
  );
}

interface UsePremiumGateResult {
  isPremium: boolean;
  canAccess: boolean;
  hasTemporaryAccess: boolean;
  showPaywall: boolean;
  showWatchAd: boolean;
  openPaywall: () => void;
  closePaywall: () => void;
  openWatchAd: () => void;
  closeWatchAd: () => void;
  handleFeatureAccess: () => void;
  onUnlocked: () => void;
  checkTemporaryAccess: () => Promise<boolean>;
  consumeTemporaryAccess: () => Promise<boolean>;
}

export function usePremiumGate(feature?: PremiumFeature): UsePremiumGateResult {
  const { profile, isAdmin } = useAuth();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showWatchAd, setShowWatchAd] = useState(false);
  const [hasTemporaryAccess, setHasTemporaryAccess] = useState(false);

  const isPremium = (profile?.isPremium ?? false) || isAdmin;
  const canAccess = isPremium || !feature || hasTemporaryAccess;

  const checkTemporaryAccess = useCallback(async () => {
    if (!feature || isPremium) return false;
    const hasAccess = await rewardedAdsService.hasTemporaryAccess(feature);
    setHasTemporaryAccess(hasAccess);
    return hasAccess;
  }, [feature, isPremium]);

  const consumeTemporaryAccess = useCallback(async () => {
    if (!feature) return false;
    const consumed = await rewardedAdsService.consumeTemporaryAccess(feature);
    if (consumed) {
      setHasTemporaryAccess(false);
    }
    return consumed;
  }, [feature]);

  const [canWatch, setCanWatch] = useState(false);

  useEffect(() => {
    checkTemporaryAccess();
    if (!isPremium && feature && isNative() && isFeatureUnlockable(feature)) {
      rewardedAdsService.canWatchAd().then(setCanWatch);
    }
  }, [checkTemporaryAccess, isPremium, feature]);

  const handleFeatureAccess = useCallback(() => {
    if (isPremium || hasTemporaryAccess) return;

    if (feature && isNative() && isFeatureUnlockable(feature) && canWatch) {
      setShowWatchAd(true);
    } else {
      setShowPaywall(true);
    }
  }, [isPremium, hasTemporaryAccess, feature, canWatch]);

  const onUnlocked = useCallback(() => {
    setHasTemporaryAccess(true);
    setShowWatchAd(false);
  }, []);

  return {
    isPremium,
    canAccess,
    hasTemporaryAccess,
    showPaywall,
    showWatchAd,
    openPaywall: () => setShowPaywall(true),
    closePaywall: () => setShowPaywall(false),
    openWatchAd: () => setShowWatchAd(true),
    closeWatchAd: () => setShowWatchAd(false),
    handleFeatureAccess,
    onUnlocked,
    checkTemporaryAccess,
    consumeTemporaryAccess,
  };
}
