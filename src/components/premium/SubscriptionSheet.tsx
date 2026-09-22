import { useState } from 'react';
import {
  Crown,
  Calendar,
  CreditCard,
  ExternalLink,
  RotateCcw,
  Compass,
  CheckCircle2,
  X,
  Layers,
  Heart,
  Brain,
  Moon,
  Ban,
  Users,
  Cloud,
  Smile,
  Mountain,
  Mail,
  Sun,
} from 'lucide-react';
import { Button, toast, OrnateDivider, MysticalStar, ListRow } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { getBillingService, type BillingService } from '../../services/billing';
import { getPlatform } from '../../utils/platform';
import { useT } from '../../i18n/useT';

interface SubscriptionSheetProps {
  open: boolean;
  onClose: () => void;
}

/** Only the web (Stripe) service can open a billing portal; the interface
 *  doesn't declare it, so it is probed rather than assumed. */
type PortalCapable = BillingService & { openCustomerPortal?: () => Promise<boolean> };

// The same list the paywall shows, so a subscriber sees exactly what they
// were promised; the labels come from premium.paywall.unlocks.*.
const premiumFeatures = [
  { icon: Ban, key: 'adFree' },
  { icon: Layers, key: 'allSpreads' },
  { icon: Heart, key: 'compatibility' },
  { icon: Users, key: 'partnerSynastry' },
  { icon: Brain, key: 'deepInterpretations' },
  { icon: Moon, key: 'birthChart' },
  { icon: Sun, key: 'horoscopeFull' },
  { icon: Compass, key: 'humanDesign' },
  { icon: Mountain, key: 'bazi' },
  { icon: Cloud, key: 'dreamAi' },
  { icon: Smile, key: 'moodLetter' },
  { icon: Mail, key: 'oracleChat' },
  { icon: Crown, key: 'shadowWork' },
] as const;

export function SubscriptionSheet({ open, onClose }: SubscriptionSheetProps) {
  const { t } = useT('app');
  const { profile, refreshProfile } = useAuth();
  const [restoring, setRestoring] = useState(false);
  // Where the subscription is billed decides where it can be managed:
  // Google Play on Android, the App Store on iOS, Stripe's portal on the web.
  const platform = getPlatform();

  if (!open) return null;

  const handleManageSubscription = async () => {
    if (platform === 'android') {
      window.open('https://play.google.com/store/account/subscriptions', '_blank');
      return;
    }
    if (platform === 'ios') {
      window.open('https://apps.apple.com/account/subscriptions', '_blank');
      return;
    }
    const billing = getBillingService() as PortalCapable;
    const opened = billing.openCustomerPortal ? await billing.openCustomerPortal() : false;
    if (!opened) {
      toast(
        t('premium.subscription.toasts.portalFailed', {
          defaultValue: 'Couldn’t open the billing portal. Check your connection and try again.',
        }),
        'error',
      );
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const billing = getBillingService();
      const purchases = await billing.restorePurchases();

      if (purchases.some(p => p.success)) {
        await refreshProfile();
        toast(
          t('premium.subscription.toasts.verified', { defaultValue: 'Your subscription is confirmed.' }),
          'success',
        );
      } else {
        toast(
          t('premium.subscription.toasts.active', {
            defaultValue: 'Nothing to update — your subscription is as shown.',
          }),
          'info',
        );
      }
    } catch {
      toast(
        t('premium.subscription.toasts.verifyFailed', {
          defaultValue: 'Couldn’t reach the store to check your subscription. Check your connection and try again.',
        }),
        'error',
      );
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-mystic-950 via-mystic-900 to-mystic-950 starfield-veil nebula-veil">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/10 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />
      </div>

      <div className="relative h-full flex flex-col overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-mystic-800/50 hover:bg-mystic-800 transition-colors"
          aria-label={t('common:actions.close', { defaultValue: 'Close' }) as string}
        >
          <X className="w-5 h-5 text-mystic-400" />
        </button>

        <div className="flex-1 flex flex-col items-center px-6 pt-12 pb-6">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gold via-gold-dark to-gold flex items-center justify-center">
              <Crown className="w-12 h-12 text-mystic-950" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <MysticalStar size={20} className="text-gold" />
            <h1 className="font-display-hero text-4xl text-mystic-100 text-center">
              {t('premium.subscription.heading', { defaultValue: 'Premium is on' })}
            </h1>
            <MysticalStar size={20} className="text-gold" />
          </div>
          <div className="mb-3 text-gold/60">
            <OrnateDivider width={160} />
          </div>

          <p className="text-mystic-300 text-center max-w-xs mb-8">
            {t('premium.subscription.subheading', {
              defaultValue: 'Every spread, chart and reading is open to you, with no ads and no Moonstones to spend.',
            })}
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

              <div className="pt-3 border-t border-gold/10">
                {/* -mx-4 cancels the row's own inset so the tiles line up
                    with the card content above. */}
                <div className="-mx-4">
                  <ListRow
                    size="md"
                    icon={<Calendar />}
                    label={t('premium.subscription.status')}
                    value={<span className="text-emerald-400 font-medium">{t('premium.subscription.statusActive')}</span>}
                  />
                  <ListRow
                    size="md"
                    icon={<CreditCard />}
                    label={t('premium.subscription.billing')}
                    value={<span className="text-mystic-300">{t(`premium.subscription.billingVia.${platform}`)}</span>}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm mb-8">
            <p className="text-xs font-medium text-mystic-500 uppercase tracking-wider text-center mb-4">
              {t('premium.subscription.yourBenefits', { defaultValue: 'Included in your plan' })}
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
                    <span className="text-sm text-mystic-200">{t(`premium.paywall.unlocks.${feature.key}.label`)}</span>
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
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {t(`premium.subscription.manage.${platform}`)}
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
              {t('premium.subscription.syncStatus', { defaultValue: 'Refresh my subscription' })}
            </button>
          </div>
        </div>

        <div className="px-6 pb-8 pt-4 border-t border-mystic-800/50">
          <p className="text-xs text-mystic-600 text-center leading-relaxed">
            {t(`premium.subscription.storeNote.${platform}`)}
          </p>
        </div>
      </div>
    </div>
  );
}
