import { useState } from 'react';
import {
  Crown,
  Sparkles,
  Heart,
  Star,
  X,
  Infinity,
  Layers,
  Brain,
  Moon,
  Lock,
  RotateCcw,
} from 'lucide-react';
import { Button, toast } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { getBillingService, PRODUCT_IDS } from '../../services/billing';

interface PaywallSheetProps {
  open: boolean;
  onClose: () => void;
  feature?: string;
}

const unlocks = [
  { icon: Layers, label: 'All Tarot Spreads', desc: 'Celtic Cross, 3-Card & more' },
  { icon: Infinity, label: 'Unlimited Saves', desc: 'Keep every insight forever' },
  { icon: Heart, label: 'Full Compatibility', desc: 'Deep partner analysis' },
  { icon: Brain, label: 'Deep Interpretations', desc: 'Personalized guidance' },
  { icon: Star, label: 'Guided Prompts', desc: 'AI-crafted reflections' },
  { icon: Moon, label: 'Birth Chart', desc: 'Your cosmic blueprint' },
];

type PlanId = 'trial' | 'monthly' | 'yearly';

const plans: { id: PlanId; label: string; price: string; period: string; badge?: string; productId: string }[] = [
  { id: 'trial', label: '7-Day Free Trial', price: 'Free', period: 'then $9.99/mo', badge: 'Recommended', productId: PRODUCT_IDS.PREMIUM_MONTHLY },
  { id: 'monthly', label: 'Monthly', price: '$9.99', period: '/month', productId: PRODUCT_IDS.PREMIUM_MONTHLY },
  { id: 'yearly', label: 'Yearly', price: '$49.99', period: '/year', badge: 'Save 58%', productId: PRODUCT_IDS.PREMIUM_YEARLY },
];

export function PaywallSheet({ open, onClose, feature }: PaywallSheetProps) {
  const { updateProfile, refreshProfile } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('trial');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  if (!open) return null;

  const handlePurchase = async () => {
    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return;

    setPurchasing(true);
    try {
      const billing = getBillingService();
      const result = await billing.purchase(plan.productId);

      if (result.success) {
        await updateProfile({ isPremium: true });
        await refreshProfile();
        toast('Welcome to Premium!', 'success');
        onClose();
      } else if (result.error) {
        if (result.error.includes('not configured')) {
          await updateProfile({ isPremium: true });
          await refreshProfile();
          toast('Premium activated (demo mode)', 'success');
          onClose();
        } else {
          toast(result.error, 'error');
        }
      }
    } catch {
      toast('Purchase failed', 'error');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const billing = getBillingService();
      const purchases = await billing.restorePurchases();

      if (purchases.some(p => p.success)) {
        await updateProfile({ isPremium: true });
        await refreshProfile();
        toast('Purchases restored!', 'success');
        onClose();
      } else {
        toast('No purchases found', 'info');
      }
    } catch {
      toast('Restore failed', 'error');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-mystic-950 via-mystic-900 to-mystic-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-cosmic-blue/10 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />
      </div>

      <div className="relative h-full flex flex-col overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-mystic-800/50 hover:bg-mystic-800 transition-colors"
        >
          <X className="w-5 h-5 text-mystic-400" />
        </button>

        <div className="flex-1 flex flex-col items-center px-6 pt-12 pb-6">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-gold via-gold-dark to-gold flex items-center justify-center shadow-2xl shadow-gold/20">
              <Crown className="w-12 h-12 text-mystic-950" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 bg-cosmic-blue rounded-full flex items-center justify-center animate-pulse">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>

          <h1 className="font-display text-3xl text-center text-mystic-100 mb-2">
            Unlock the Full Deck
          </h1>
          <p className="text-mystic-400 text-center max-w-xs mb-8">
            Deeper spreads, unlimited saves, compatibility insights & more
          </p>

          {feature && (
            <div className="flex items-center gap-2 px-4 py-2 bg-gold/10 border border-gold/20 rounded-full mb-6">
              <Lock className="w-4 h-4 text-gold" />
              <span className="text-sm text-gold">{feature} requires Premium</span>
            </div>
          )}

          <div className="w-full max-w-sm space-y-3 mb-8">
            <p className="text-xs font-medium text-mystic-500 uppercase tracking-wider text-center mb-4">
              What You Unlock
            </p>
            <div className="grid grid-cols-2 gap-3">
              {unlocks.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-mystic-800/40 backdrop-blur-sm rounded-xl border border-mystic-700/30"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-gold" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-mystic-100 truncate">{item.label}</p>
                      <p className="text-xs text-mystic-500 truncate">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-full max-w-sm space-y-3 mb-6">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`w-full p-4 rounded-2xl border-2 transition-all text-left relative ${
                  selectedPlan === plan.id
                    ? 'border-gold bg-gold/10 shadow-lg shadow-gold/10'
                    : 'border-mystic-700/50 bg-mystic-800/30 hover:border-mystic-600'
                }`}
              >
                {plan.badge && (
                  <span className={`absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    plan.badge === 'Recommended'
                      ? 'bg-gold text-mystic-950'
                      : 'bg-emerald-500 text-white'
                  }`}>
                    {plan.badge}
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPlan === plan.id ? 'border-gold' : 'border-mystic-600'
                    }`}>
                      {selectedPlan === plan.id && (
                        <div className="w-2.5 h-2.5 rounded-full bg-gold" />
                      )}
                    </div>
                    <span className={`font-medium ${selectedPlan === plan.id ? 'text-mystic-100' : 'text-mystic-300'}`}>
                      {plan.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-display ${selectedPlan === plan.id ? 'text-gold' : 'text-mystic-200'}`}>
                      {plan.price}
                    </span>
                    <span className="text-mystic-500 text-sm ml-1">{plan.period}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="w-full max-w-sm space-y-3">
            <Button
              variant="gold"
              fullWidth
              size="lg"
              onClick={handlePurchase}
              loading={purchasing}
              className="min-h-[56px] text-base font-semibold shadow-xl shadow-gold/20"
            >
              {selectedPlan === 'trial' ? 'Start Free Trial' : 'Continue'}
            </Button>

            <button
              onClick={handleRestore}
              disabled={restoring}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm text-mystic-400 hover:text-mystic-300 transition-colors disabled:opacity-50"
            >
              {restoring ? (
                <div className="w-4 h-4 border-2 border-mystic-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              Restore Purchase
            </button>
          </div>
        </div>

        <div className="px-6 pb-8 pt-4 border-t border-mystic-800/50">
          <p className="text-xs text-mystic-600 text-center leading-relaxed">
            Cancel anytime. {selectedPlan === 'trial' && 'Free trial converts to paid subscription. '}
            Payment will be charged to your account. Subscription automatically renews unless canceled at least 24 hours before the end of the current period.
          </p>
        </div>
      </div>
    </div>
  );
}
