import { useState } from 'react';
import { Crown, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PaywallSheet } from './PaywallSheet';
import type { PremiumFeature } from '../../services/premium';
import { PREMIUM_FEATURES } from '../../services/premium';

interface PremiumGateProps {
  feature: PremiumFeature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showBadge?: boolean;
}

export function PremiumGate({ feature, children, fallback, showBadge = true }: PremiumGateProps) {
  const { profile, isAdmin } = useAuth();
  const [showPaywall, setShowPaywall] = useState(false);

  if (profile?.isPremium || isAdmin) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <>
      <div
        onClick={() => setShowPaywall(true)}
        className="cursor-pointer"
      >
        {children}
        {showBadge && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-gold/20 border border-gold/30 rounded-full flex items-center gap-1">
            <Crown className="w-3 h-3 text-gold" />
            <span className="text-xs font-medium text-gold">Premium</span>
          </div>
        )}
      </div>
      <PaywallSheet
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature={PREMIUM_FEATURES[feature].name}
      />
    </>
  );
}

interface PremiumBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function PremiumBadge({ size = 'sm', className = '' }: PremiumBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 bg-gold/20 border border-gold/30 rounded-full ${className}`}>
      <Crown className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} style={{ color: 'rgb(212, 175, 55)' }} />
      <span className={`font-medium text-gold ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>Premium</span>
    </span>
  );
}

interface PremiumLockOverlayProps {
  feature: PremiumFeature;
  onUnlock: () => void;
}

export function PremiumLockOverlay({ feature, onUnlock }: PremiumLockOverlayProps) {
  const featureDef = PREMIUM_FEATURES[feature];

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
      <button className="mt-4 px-4 py-2 bg-gold text-mystic-950 font-medium rounded-lg text-sm hover:bg-gold-dark transition-colors">
        Unlock Premium
      </button>
    </div>
  );
}

interface UsePremiumGateResult {
  isPremium: boolean;
  canAccess: boolean;
  showPaywall: boolean;
  openPaywall: () => void;
  closePaywall: () => void;
}

export function usePremiumGate(feature?: PremiumFeature): UsePremiumGateResult {
  const { profile, isAdmin } = useAuth();
  const [showPaywall, setShowPaywall] = useState(false);

  const isPremium = (profile?.isPremium ?? false) || isAdmin;
  const canAccess = isPremium || !feature;

  return {
    isPremium,
    canAccess,
    showPaywall,
    openPaywall: () => setShowPaywall(true),
    closePaywall: () => setShowPaywall(false),
  };
}
