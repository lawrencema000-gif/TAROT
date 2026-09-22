import { useState, useEffect, useCallback } from 'react';
import {
  Crown,
  Compass,
  Heart,
  X,
  Layers,
  Brain,
  Moon,
  Lock,
  RotateCcw,
  Ban,
  AlertCircle,
  RefreshCw,
  Users,
  Cloud,
  Smile,
  Mountain,
  Mail,
  Sun,
} from 'lucide-react';
import { Button, toast, MysticalStar, Badge, Tag } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { getBillingService, PRODUCT_IDS, Product } from '../../services/billing';
import { isNative } from '../../utils/platform';
import { useT } from '../../i18n/useT';

interface PaywallSheetProps {
  open: boolean;
  onClose: () => void;
  /**
   * The localized name of the thing the user tapped (a tab label, a spread
   * name). When it matches one of the names in FEATURE_NAME_KEYS the sheet
   * leads with that feature's outcome; otherwise it shows the generic copy.
   */
  feature?: string;
}

/**
 * Call sites open this sheet with the localized NAME of what the user tapped,
 * so the copy is keyed by name: each entry lists the i18n keys whose value a
 * caller may pass, resolved through the same t() the caller used, which keeps
 * the match honest in every locale. Anything unmatched falls back to the
 * generic heading and subheading.
 */
type PaywallFeatureId =
  | 'celticCross'
  | 'relationship'
  | 'careerSpread'
  | 'shadow'
  | 'unlimitedReadings'
  | 'horoscopeChart'
  | 'horoscopeForecast'
  | 'horoscopeExplore'
  | 'humanDesign'
  | 'bazi'
  | 'dreams'
  | 'partnerSynastry'
  | 'celestialMap'
  | 'compatFull'
  | 'compatFriendship'
  | 'compatWork';

const FEATURE_NAME_KEYS: Record<PaywallFeatureId, readonly string[]> = {
  celticCross: ['readings.spreads.celticCross.name'],
  relationship: ['readings.spreads.relationship.name'],
  careerSpread: ['readings.spreads.careerSpread.name'],
  shadow: ['readings.spreads.shadow.name'],
  unlimitedReadings: ['readings.paywall.unlimited'],
  horoscopeChart: ['horoscope.tabs.chart', 'horoscope.paywallFeatures.birthChart'],
  horoscopeForecast: ['horoscope.tabs.forecast'],
  horoscopeExplore: ['horoscope.tabs.explore'],
  humanDesign: ['readings.tabs.humanDesign'],
  bazi: ['readings.tabs.bazi'],
  dreams: ['readings.tabs.dream'],
  partnerSynastry: ['readings.tabs.partner'],
  celestialMap: ['celestial.title'],
  compatFull: ['compatibility.paywallFeatures.full'],
  compatFriendship: ['compatibility.paywallFeatures.friendship'],
  compatWork: ['compatibility.paywallFeatures.work'],
};

function resolveFeatureId(
  feature: string | undefined,
  t: (key: string) => string,
): PaywallFeatureId | null {
  if (!feature) return null;
  for (const [id, keys] of Object.entries(FEATURE_NAME_KEYS)) {
    if (keys.some((key) => t(key) === feature)) return id as PaywallFeatureId;
  }
  return null;
}

// The one list of what Premium opens; SubscriptionSheet reads the same keys.
// Every entry is backed by a gate in code: ads.ts checks isPremium, the
// spreads and tabs are premium-only, and the AI features skip the Moonstone
// debit for premium. A save limit and "guided prompts" used to be listed
// here, but neither exists in code, so neither is promised.
const unlocks = [
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

type PlanId = 'monthly' | 'yearly' | 'lifetime';

type PlanLabelKey = 'monthly' | 'yearly' | 'lifetime';
type PeriodKey = 'month' | 'year' | 'oneTime';
type BadgeKey = 'bestValue' | 'foreverAccess';

interface DisplayPlan {
  id: PlanId;
  labelKey: PlanLabelKey;
  price: string;
  periodKey: PeriodKey;
  badgeKey?: BadgeKey;
  productId: string;
  product?: Product;
}

const FALLBACK_PRICES: Record<string, string> = {
  [PRODUCT_IDS.PREMIUM_MONTHLY]: '$3.99',
  [PRODUCT_IDS.PREMIUM_YEARLY]: '$19.99',
  [PRODUCT_IDS.PREMIUM_LIFETIME]: '$29.99',
};

function matchesProductId(productId: string, targetId: string): boolean {
  const baseId = productId.split(':')[0];
  return baseId === targetId || productId === targetId;
}

function buildDisplayPlans(products: Product[]): DisplayPlan[] {
  const plans: DisplayPlan[] = [];

  const monthlyProduct = products.find(p =>
    matchesProductId(p.id, PRODUCT_IDS.PREMIUM_MONTHLY) ||
    p.id.startsWith(PRODUCT_IDS.PREMIUM_MONTHLY + ':') ||
    p.period === 'month' ||
    p.id.split(':')[0].includes('monthly')
  );

  const yearlyProduct = products.find(p =>
    matchesProductId(p.id, PRODUCT_IDS.PREMIUM_YEARLY) ||
    p.id.startsWith(PRODUCT_IDS.PREMIUM_YEARLY + ':') ||
    p.period === 'year' ||
    p.id.split(':')[0].includes('yearly') ||
    p.id.split(':')[0].includes('annual')
  );

  const lifetimeProduct = products.find(p =>
    matchesProductId(p.id, PRODUCT_IDS.PREMIUM_LIFETIME) ||
    p.id.startsWith(PRODUCT_IDS.PREMIUM_LIFETIME + ':') ||
    p.period === 'lifetime' ||
    p.isLifetime ||
    p.id.split(':')[0].includes('lifetime')
  );

  if (monthlyProduct) {
    plans.push({
      id: 'monthly',
      labelKey: 'monthly',
      price: monthlyProduct.price,
      periodKey: 'month',
      productId: monthlyProduct.id,
      product: monthlyProduct,
    });
  } else {
    plans.push({
      id: 'monthly',
      labelKey: 'monthly',
      price: FALLBACK_PRICES[PRODUCT_IDS.PREMIUM_MONTHLY],
      periodKey: 'month',
      productId: PRODUCT_IDS.PREMIUM_MONTHLY,
    });
  }

  if (yearlyProduct) {
    plans.push({
      id: 'yearly',
      labelKey: 'yearly',
      price: yearlyProduct.price,
      periodKey: 'year',
      badgeKey: 'bestValue',
      productId: yearlyProduct.id,
      product: yearlyProduct,
    });
  } else {
    plans.push({
      id: 'yearly',
      labelKey: 'yearly',
      price: FALLBACK_PRICES[PRODUCT_IDS.PREMIUM_YEARLY],
      periodKey: 'year',
      badgeKey: 'bestValue',
      productId: PRODUCT_IDS.PREMIUM_YEARLY,
    });
  }

  if (lifetimeProduct) {
    plans.push({
      id: 'lifetime',
      labelKey: 'lifetime',
      price: lifetimeProduct.price,
      periodKey: 'oneTime',
      badgeKey: 'foreverAccess',
      productId: lifetimeProduct.id,
      product: lifetimeProduct,
    });
  } else {
    plans.push({
      id: 'lifetime',
      labelKey: 'lifetime',
      price: FALLBACK_PRICES[PRODUCT_IDS.PREMIUM_LIFETIME],
      periodKey: 'oneTime',
      badgeKey: 'foreverAccess',
      productId: PRODUCT_IDS.PREMIUM_LIFETIME,
    });
  }

  return plans;
}

export function PaywallSheet({ open, onClose, feature }: PaywallSheetProps) {
  const { t } = useT('app');
  const { user, optimisticallyMarkPremium, pollProfileUntilPremium } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('yearly');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState<string | null>(null);
  const [displayPlans, setDisplayPlans] = useState<DisplayPlan[]>([]);
  const [hasRealProducts, setHasRealProducts] = useState(false);
  const featureId = resolveFeatureId(feature, (key) => t(key) as string);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    setProductError(null);

    try {
      const billing = getBillingService();
      await billing.initialize();
      const products = await billing.getProducts([
        PRODUCT_IDS.PREMIUM_MONTHLY,
        PRODUCT_IDS.PREMIUM_YEARLY,
        PRODUCT_IDS.PREMIUM_LIFETIME,
      ]);

      console.log('[Paywall] Loaded products:', products.map(p => ({
        id: p.id,
        baseId: p.id.split(':')[0],
        period: p.period,
        price: p.price,
        hasRcPackage: !!p.rcPackage,
      })));

      const plans = buildDisplayPlans(products);
      setDisplayPlans(plans);

      console.log('[Paywall] Built display plans:', plans.map(p => ({
        id: p.id,
        productId: p.productId,
        hasProduct: !!p.product,
        hasRcPackage: !!p.product?.rcPackage,
      })));

      // "Real products" means the user can actually purchase. On native that
      // requires a RevenueCat package; on web it just requires the product
      // catalog to have loaded (Stripe price IDs are resolved server-side at
      // checkout, not on the package object).
      const hasReal = isNative()
        ? plans.some(p => p.product?.rcPackage)
        : plans.some(p => !!p.product);
      setHasRealProducts(hasReal);

      if (!hasReal && products.length > 0) {
        if (isNative()) {
          console.warn('[Paywall] Products loaded but no rcPackage found - RevenueCat offerings may not be configured');
          console.warn('[Paywall] Expected IDs:', [PRODUCT_IDS.PREMIUM_MONTHLY, PRODUCT_IDS.PREMIUM_YEARLY, PRODUCT_IDS.PREMIUM_LIFETIME]);
          console.warn('[Paywall] Received IDs:', products.map(p => p.id));
        }
      }
    } catch (error) {
      console.error('[Paywall] Failed to load products:', error);
      setProductError(
        t('premium.paywall.errors.loadFailed', {
          defaultValue: 'Couldn’t load prices. Check your connection and try again.',
        }),
      );
      setDisplayPlans(buildDisplayPlans([]));
    } finally {
      setLoadingProducts(false);
    }
  }, [t]);

  useEffect(() => {
    if (open) {
      loadProducts();
    }
  }, [open, loadProducts]);

  if (!open) return null;

  const handlePurchase = async () => {
    const plan = displayPlans.find(p => p.id === selectedPlan);
    if (!plan) return;

    // RevenueCat offerings only matter on native — on web the purchase
    // routes through Stripe via the WebBillingService, which has no
    // rcPackage concept. Block only when we're on native and the RC
    // offerings aren't configured.
    if (isNative() && !plan.product?.rcPackage && !hasRealProducts) {
      toast(
        t('premium.paywall.toasts.productsUnavailable', {
          defaultValue: 'Purchases aren’t available in this build yet.',
        }),
        'error',
      );
      console.error('[Paywall] No rcPackage available for purchase. RevenueCat offerings may not be configured.');
      return;
    }

    setPurchasing(true);
    try {
      const billing = getBillingService();
      const result = await billing.purchase(plan.productId, plan.product);

      if (result.success) {
        // RevenueCat / Stripe has confirmed the purchase locally. Flip
        // is_premium in the in-memory profile IMMEDIATELY so every
        // PremiumGate, balance widget, and feature lock unlocks before
        // the user has time to notice. The server-side webhook will
        // update profiles.is_premium within ~5 seconds; we kick off a
        // background poll to confirm and (silently) keep state in sync.
        optimisticallyMarkPremium();
        toast(
          t('billing.premiumActivated', {
            defaultValue: 'Premium is on. Every reading is open to you.',
          }),
          'success',
        );
        onClose();

        if (user) {
          import('../../services/achievements').then(({ checkAchievementProgress }) => {
            checkAchievementProgress(user.id, 'premium_upgrade');
          });
        }

        // Background poll — corrects DB-side state if the webhook is
        // slow. No UI impact: the user already sees premium thanks to
        // the optimistic flip above.
        pollProfileUntilPremium(60_000, 2_000)
          .then((confirmed) => {
            if (!confirmed) {
              console.warn('[Paywall] DB premium flag did not propagate within 60s — webhook may be delayed');
            }
          })
          .catch(() => {/* swallow — UI is already correct */});
      } else if (result.error || result.errorKey) {
        const msg = result.errorKey ? t(result.errorKey, { defaultValue: result.error ?? '' }) : result.error ?? '';
        if (msg) toast(msg, 'error');
      }
    } catch {
      toast(
        t('premium.paywall.toasts.purchaseFailed', {
          defaultValue:
            'The purchase didn’t complete — check your connection and try again. If you were charged, use Restore below.',
        }),
        'error',
      );
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
        // Same optimistic-flip pattern as handlePurchase — RC has
        // confirmed the entitlement locally, so flip the UI immediately
        // and background-sync the DB.
        optimisticallyMarkPremium();
        toast(
          t('premium.paywall.toasts.purchasesRestored', {
            defaultValue: 'Premium restored — everything is open again.',
          }),
          'success',
        );
        onClose();
        pollProfileUntilPremium(60_000, 2_000).catch(() => undefined);
      } else {
        toast(
          t('premium.paywall.toasts.noPurchases', {
            defaultValue:
              'No Premium purchase found on this account. Make sure you’re signed in to the store account you bought with, then try again.',
          }),
          'info',
        );
      }
    } catch {
      toast(
        t('premium.paywall.toasts.restoreFailed', {
          defaultValue: 'Couldn’t reach the store to restore your purchase. Check your connection and try again.',
        }),
        'error',
      );
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
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
          className="absolute right-4 z-10 p-2.5 rounded-full bg-mystic-800/50 hover:bg-mystic-800 transition-colors"
          aria-label={t('common:actions.close', { defaultValue: 'Close' }) as string}
        >
          <X className="w-5 h-5 text-mystic-400" />
        </button>

        <div
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1.5rem)' }}
          className="flex-1 flex flex-col items-center px-6 pt-12"
        >
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gold via-gold-dark to-gold flex items-center justify-center">
              <Crown className="w-12 h-12 text-mystic-950" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 bg-cosmic-blue rounded-full flex items-center justify-center animate-pulse">
              <MysticalStar size={16} className="text-white" />
            </div>
          </div>

          <h1 className="font-display text-3xl text-center text-mystic-100 mb-2">
            {featureId
              ? t(`premium.paywall.byFeature.${featureId}.heading`)
              : t('premium.paywall.heading', { defaultValue: 'Open every reading' })}
          </h1>
          <p className="text-mystic-400 text-center max-w-xs mb-8">
            {featureId
              ? t(`premium.paywall.byFeature.${featureId}.outcome`)
              : t('premium.paywall.subheading', {
                  defaultValue:
                    'Every tarot spread, your full birth chart, partner synastry and the horoscope tabs — with no ads and no Moonstones to spend.',
                })}
          </p>

          {/* A matched feature is already named by the heading; the tag only
              carries a name the map doesn't know. */}
          {feature && !featureId && (
            <Tag tone="gold" size="md" icon={<Lock className="w-4 h-4" aria-hidden />} className="mb-6">
              {t('premium.paywall.featureRequires', { defaultValue: '{{feature}} opens with Premium', feature })}
            </Tag>
          )}

          <div className="w-full max-w-sm space-y-3 mb-8">
            <p className="text-xs font-medium text-mystic-500 uppercase tracking-wider text-center mb-4">
              {t('premium.paywall.whatYouUnlock', { defaultValue: 'What opens with Premium' })}
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
                      <p className="text-sm font-medium text-mystic-100 truncate">{t(`premium.paywall.unlocks.${item.key}.label`)}</p>
                      <p className="text-xs text-mystic-500 truncate">{t(`premium.paywall.unlocks.${item.key}.desc`)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {productError && (
            <div className="w-full max-w-sm mb-4">
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-red-300">{productError}</p>
                </div>
                <button
                  onClick={loadProducts}
                  className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                  aria-label={t('common:actions.retry', { defaultValue: 'Try again' }) as string}
                >
                  <RefreshCw className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          )}

          {!loadingProducts && !hasRealProducts && !productError && (
            <div className="w-full max-w-sm mb-4">
              <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-amber-300 font-medium mb-1">
                    {t('premium.paywall.errors.notAvailableTitle', {
                      defaultValue: 'Purchases aren’t available in this build yet',
                    })}
                  </p>
                  <p className="text-xs text-amber-400/80">
                    {t('premium.paywall.errors.notAvailableDesc', {
                      defaultValue:
                        'Everything free still works. If you already have Premium, restore it below.',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="w-full max-w-sm space-y-3 mb-6">
            {loadingProducts ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-mystic-400">{t('premium.paywall.loadingPrices')}</p>
              </div>
            ) : (
              displayPlans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`w-full p-4 rounded-2xl border-2 transition-all text-left relative ${
                    selectedPlan === plan.id
                      ? 'border-gold/50 bg-gold/10'
                      : 'border-mystic-700/50 bg-mystic-800/30 hover:border-mystic-600'
                  }`}
                >
                  {plan.badgeKey && (
                    // The ribbon straddles the card's top edge. A Badge is a
                    // translucent tint, so it sits on an opaque backing that
                    // hides the border line running behind it.
                    <span className="absolute -top-2.5 left-4 rounded-full bg-mystic-900">
                      <Badge tone={plan.badgeKey === 'bestValue' ? 'gold' : 'teal'}>
                        {t(`premium.paywall.badges.${plan.badgeKey}`)}
                      </Badge>
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
                      <div>
                        <span className={`font-medium ${selectedPlan === plan.id ? 'text-mystic-100' : 'text-mystic-300'}`}>
                          {t(`premium.paywall.plans.${plan.labelKey}`)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-display ${selectedPlan === plan.id ? 'text-gold' : 'text-mystic-200'}`}>
                        {plan.price}
                      </span>
                      <span className="text-mystic-500 text-sm ml-1">{t(`premium.paywall.periods.${plan.periodKey}`)}</span>
                    </div>
                  </div>
                  {plan.product?.hasTrial && plan.product?.trialDays ? (
                    <p className={`mt-2 ml-8 text-xs ${selectedPlan === plan.id ? 'text-emerald-300' : 'text-emerald-400/70'}`}>
                      {t('premium.paywall.trialLine', {
                        defaultValue: '{{days}}-day free trial. Cancel before it ends and you pay nothing.',
                        days: plan.product.trialDays,
                      })}
                    </p>
                  ) : null}
                </button>
              ))
            )}
          </div>

          <div className="w-full max-w-sm space-y-3">
            {/* When nothing can be bought, the amber notice above is the
                status; a button that cannot buy anything has no label that
                tells the truth, so it is not rendered. */}
            {(loadingProducts || hasRealProducts) && (
              <Button
                variant="gold"
                fullWidth
                size="lg"
                onClick={handlePurchase}
                loading={purchasing}
                disabled={loadingProducts || !hasRealProducts}
                className="text-base font-semibold"
              >
                {(() => {
                  const selected = displayPlans.find((p) => p.id === selectedPlan);
                  if (selectedPlan === 'lifetime') {
                    return t('premium.paywall.cta.getLifetime', { defaultValue: 'Unlock Premium for life' });
                  }
                  if (selected?.product?.hasTrial && selected.product.trialDays) {
                    return t('premium.paywall.cta.startTrial', {
                      defaultValue: 'Start your {{days}}-day free trial',
                      days: selected.product.trialDays,
                    });
                  }
                  if (featureId) return t(`premium.paywall.byFeature.${featureId}.cta`);
                  return t('premium.paywall.cta.subscribe', { defaultValue: 'Subscribe to Premium' });
                })()}
              </Button>
            )}

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
              {t('premium.paywall.restorePurchase', { defaultValue: 'Restore a previous purchase' })}
            </button>
          </div>
        </div>

        <div className="px-6 pb-8 pt-4 border-t border-mystic-800/50">
          <p className="text-xs text-mystic-600 text-center leading-relaxed">
            {selectedPlan === 'lifetime'
              ? t('premium.paywall.disclaimers.lifetime')
              : t('premium.paywall.disclaimers.subscription')}
          </p>
        </div>
      </div>
    </div>
  );
}
