import { useState } from 'react';
import {
  Crown,
  Calendar,
  CreditCard,
  ExternalLink,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  X,
  Layers,
  Infinity as InfinityIcon,
  Heart,
  Brain,
  Star,
  Moon,
  Ban,
} from 'lucide-react';
import { Button, toast } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { getBillingService } from '../../services/billing';
import { isNative, isAndroid } from '../../utils/platform';
import { useT } from '../../i18n/useT';

interface SubscriptionSheetProps {
  open: boolean;
  onClose: () => void;
}

const premiumFeatures = [
  { icon: Ban, key: 'adFree' },
  { icon: Layers, key: 'allSpreads' },
  { icon: InfinityIcon, key: 'unlimitedSaves' },
  { icon: Heart, key: 'compatibility' },
  { icon: Brain, key: 'deepInterpretations' },
  { icon: Star, key: 'guidedPrompts' },
  { icon: Moon, key: 'birthChart' },
] as const;

export function SubscriptionSheet({ open, onClose }: SubscriptionSheetProps) {
  const { t } = useT('app');
  const { profile, refreshProfile } = useAuth();
  const [restoring, setRestoring] = useState(false);

  if (!open) return null;

  const handleManageSubscription = () => {
    if (isNative() && isAndroid()) {
      window.open('https://play.google.com/store/account/subscriptions', '_blank');
    } else {
      window.open('https://play.google.com/store/account/subscriptions', '_blank');
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const billing = getBillingService();
      const purchases = await billing.restorePurchases();

      if (purchases.some(p => p.success)) {
        await refreshProfile();
        toast(t('premium.subscription.toasts.verified'), 'success');
      } else {
        toast(t('premium.subscription.toasts.active'), 'info');
      }
    } catch {
      toast(t('premium.subscription.toasts.verifyFailed'), 'error');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-mystic-950 via-mystic-900 to-mystic-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/10 via-transparent to-transparent" />
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
            <div className="absolute -top-1 -right-1 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-gold" />
            <h1 className="font-display text-3xl text-center text-mystic-100">
              {t('premium.subscription.heading')}
            </h1>
            <Sparkles className="w-5 h-5 text-gold" />
          </div>

          <p className="text-mystic-400 text-center max-w-xs mb-8">
            {t('premium.subscription.subheading')}
          </p>

          <div className="w-full max-w-sm mb-8">
            <div className="p-5 bg-gradient-to-br from-gold/10 to-gold/5 border border-gold/20 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h3 className="font-semibold text-mystic-100">{t('premium.subscription.planTitle')}</h3>
                  <p className="text-sm text-mystic-400">
                    {profile?.displayName || t('premium.subscription.memberFallback')}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-gold/10">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-mystic-400">
                    <Calendar className="w-4 h-4" />
                    <span>{t('premium.subscription.status')}</span>
                  </div>
                  <span className="text-emerald-400 font-medium">{t('premium.subscription.statusActive')}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-mystic-400">
                    <CreditCard className="w-4 h-4" />
                    <span>{t('premium.subscription.billing')}</span>
                  </div>
                  <span className="text-mystic-300">{t('premium.subscription.billingGooglePlay')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm mb-8">
            <p className="text-xs font-medium text-mystic-500 uppercase tracking-wider text-center mb-4">
              {t('premium.subscription.yourBenefits')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {premiumFeatures.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 p-3 bg-mystic-800/40 backdrop-blur-sm rounded-xl border border-mystic-700/30"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-sm text-mystic-200">{t(`premium.subscription.features.${feature.key}`)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-full max-w-sm space-y-3">
            <Button
              variant="outline"
              fullWidth
              size="lg"
              onClick={handleManageSubscription}
              className="min-h-[52px]"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {t('premium.subscription.manageOnGooglePlay')}
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
              {t('premium.subscription.syncStatus')}
            </button>
          </div>
        </div>

        <div className="px-6 pb-8 pt-4 border-t border-mystic-800/50">
          <p className="text-xs text-mystic-600 text-center leading-relaxed">
            {t('premium.subscription.disclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
}
