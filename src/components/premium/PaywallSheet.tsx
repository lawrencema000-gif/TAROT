import { useState, useEffect, useCallback, type ComponentType, type ReactNode, type KeyboardEvent, useRef } from 'react';
import {
  Ban,
  Brain,
  Cloud,
  Globe2,
  Heart,
  Layers,
  Lock,
  MessageCircle,
  Moon,
  Mountain,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Smile,
  Sun,
  Users,
  AlertCircle,
} from 'lucide-react';
import { Button, toast, Badge, Tag, Sheet, DeckFan, Card, EyebrowLabel } from '../ui';
import { TarotCardIcon, HoroscopeWheelIcon } from '../ui/NavIcons';
import { useAuth } from '../../context/AuthContext';
import { getBillingService, PRODUCT_IDS, type Product } from '../../services/billing';
import { isNative } from '../../utils/platform';
import { useT } from '../../i18n/useT';
import { getLocale } from '../../i18n/config';

interface PaywallSheetProps {
  open: boolean;
  onClose: () => void;
  /**
   * The localized name of the thing the user tapped (a tab label, a spread
   * name). When it matches one of the names in FEATURE_NAME_KEYS the sheet
   * leads with that feature's outcome; otherwise it shows the generic copy.
   */
  feature?: string;
  /**
   * Proof. The user's own locked content, rendered at the top of the sheet
   * where a stock crown used to sit: a masked natal wheel, the headings a
   * report will contain, a count of the lines hidden on their map. When a
   * call site has nothing of the user's to show, the deck fans open instead
   * — the one image the product is about.
   */
  preview?: ReactNode;
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
  | 'compatWork'
  | 'natalReport'
  | 'careerReport'
  | 'yearAhead';

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
  // The three deep reports. Premium includes every report (each page's
  // checkUnlock treats isPremium as an unlock), so their titles resolve here
  // rather than falling through to the generic copy.
  natalReport: ['natalReport.title'],
  careerReport: ['careerReport.title'],
  yearAhead: ['yearAhead.title'],
};

/**
 * English for the three feature entries added in Phase 5c. The keys are read
 * through a template literal, so a per-key defaultValue has to come from a
 * table; the same strings are recorded in the phase's key delta for merging
 * into the locale files.
 */
const BY_FEATURE_DEFAULTS: Partial<Record<PaywallFeatureId, { heading: string; outcome: string; cta: string }>> = {
  natalReport: {
    heading: 'Read your full natal chart',
    outcome:
      'Every planet in its sign and house, every aspect with its orb, and a report you can print. Premium opens it, with no Moonstones to spend.',
    cta: 'Unlock my natal report',
  },
  careerReport: {
    heading: 'Read your Career Archetype report',
    outcome:
      'Best-fit roles, the environments that drain you, your blind spots and a first-90-days plan, written for your type. Premium opens it, with no Moonstones to spend.',
    cta: 'Unlock my career report',
  },
  yearAhead: {
    heading: 'Read your year ahead',
    outcome:
      'Twelve monthly briefings on the transits to your own chart, with the dates each one runs. Premium opens it, with no Moonstones to spend.',
    cta: 'Unlock my year ahead',
  },
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
// spreads and tabs are premium-only, the AI features skip the Moonstone
// debit for premium, CelestialMapPage draws Sun and Moon only for free
// accounts, and the three report pages treat isPremium as an unlock.
type UnlockKey =
  | 'adFree'
  | 'allSpreads'
  | 'compatibility'
  | 'partnerSynastry'
  | 'deepInterpretations'
  | 'birthChart'
  | 'horoscopeFull'
  | 'humanDesign'
  | 'bazi'
  | 'dreamAi'
  | 'moodLetter'
  | 'oracleChat'
  | 'shadowWork'
  | 'celestialMap'
  | 'reports';

type UnlockIcon = ComponentType<{ className?: string }>;

const UNLOCK_ICONS: Record<UnlockKey, UnlockIcon> = {
  adFree: Ban,
  allSpreads: TarotCardIcon,
  compatibility: Heart,
  partnerSynastry: Users,
  deepInterpretations: Brain,
  birthChart: HoroscopeWheelIcon,
  horoscopeFull: Sun,
  humanDesign: Layers,
  bazi: Mountain,
  dreamAi: Cloud,
  moodLetter: Smile,
  oracleChat: MessageCircle,
  shadowWork: Moon,
  celestialMap: Globe2,
  reports: ScrollText,
};

/** English for the two unlock entries added in Phase 5c (see BY_FEATURE_DEFAULTS). */
const UNLOCK_DEFAULTS: Partial<Record<UnlockKey, { label: string; desc: string }>> = {
  celestialMap: { label: 'Celestial Map', desc: 'All 40 planetary lines and city readings' },
  reports: { label: 'Deep reports', desc: 'Natal, career and year ahead, no Moonstones to spend' },
};

/** Which line leads when the sheet knows what the user tapped. */
const FEATURE_UNLOCK: Record<PaywallFeatureId, UnlockKey> = {
  celticCross: 'allSpreads',
  relationship: 'allSpreads',
  careerSpread: 'allSpreads',
  shadow: 'shadowWork',
  unlimitedReadings: 'allSpreads',
  horoscopeChart: 'birthChart',
  horoscopeForecast: 'horoscopeFull',
  horoscopeExplore: 'horoscopeFull',
  humanDesign: 'humanDesign',
  bazi: 'bazi',
  dreams: 'dreamAi',
  partnerSynastry: 'partnerSynastry',
  celestialMap: 'celestialMap',
  compatFull: 'compatibility',
  compatFriendship: 'compatibility',
  compatWork: 'compatibility',
  natalReport: 'reports',
  careerReport: 'reports',
  yearAhead: 'reports',
};

/**
 * The offer, in five lines. Thirteen tiles in a two-column grid cut every
 * description to a fragment on a phone; five rows that wrap can be read.
 * The matched feature leads, the rest fill from the broadest promises.
 */
const DEFAULT_ORDER: UnlockKey[] = ['allSpreads', 'birthChart', 'deepInterpretations', 'adFree', 'horoscopeFull'];
const BENEFIT_COUNT = 5;

function benefitsFor(featureId: PaywallFeatureId | null): UnlockKey[] {
  const out: UnlockKey[] = featureId ? [FEATURE_UNLOCK[featureId]] : [];
  for (const key of DEFAULT_ORDER) {
    if (out.length >= BENEFIT_COUNT) break;
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

type PlanId = 'monthly' | 'yearly' | 'lifetime';

type PlanLabelKey = 'monthly' | 'yearly' | 'lifetime';
type PeriodKey = 'month' | 'year' | 'oneTime';
type BadgeKey = 'bestValue' | 'foreverAccess';

interface DisplayPlan {
  id: PlanId;
  labelKey: PlanLabelKey;
  price: string;
  /** Numeric price in `currency`, for the per-month and savings arithmetic. */
  amount: number;
  currency: string;
  periodKey: PeriodKey;
  badgeKey?: BadgeKey;
  productId: string;
  product?: Product;
}

const FALLBACK_CURRENCY = 'USD';

const FALLBACK_PRICES: Record<string, { price: string; amount: number }> = {
  [PRODUCT_IDS.PREMIUM_MONTHLY]: { price: '$3.99', amount: 3.99 },
  [PRODUCT_IDS.PREMIUM_YEARLY]: { price: '$19.99', amount: 19.99 },
  [PRODUCT_IDS.PREMIUM_LIFETIME]: { price: '$29.99', amount: 29.99 },
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

  const fromProduct = (
    id: PlanId,
    periodKey: PeriodKey,
    product: Product,
    badgeKey?: BadgeKey,
  ): DisplayPlan => ({
    id,
    labelKey: id,
    price: product.price,
    amount: product.priceAmount,
    currency: product.currency || FALLBACK_CURRENCY,
    periodKey,
    badgeKey,
    productId: product.id,
    product,
  });

  const fromFallback = (id: PlanId, periodKey: PeriodKey, productId: string, badgeKey?: BadgeKey): DisplayPlan => ({
    id,
    labelKey: id,
    price: FALLBACK_PRICES[productId].price,
    amount: FALLBACK_PRICES[productId].amount,
    currency: FALLBACK_CURRENCY,
    periodKey,
    badgeKey,
    productId,
  });

  plans.push(
    monthlyProduct
      ? fromProduct('monthly', 'month', monthlyProduct)
      : fromFallback('monthly', 'month', PRODUCT_IDS.PREMIUM_MONTHLY),
  );
  plans.push(
    yearlyProduct
      ? fromProduct('yearly', 'year', yearlyProduct, 'bestValue')
      : fromFallback('yearly', 'year', PRODUCT_IDS.PREMIUM_YEARLY, 'bestValue'),
  );
  // Lifetime is listed only when the store actually sells it. The two
  // subscriptions are the offer; a one-off price that the store has not
  // confirmed is not something the sheet should quote from a constant.
  if (lifetimeProduct) {
    plans.push(fromProduct('lifetime', 'oneTime', lifetimeProduct, 'foreverAccess'));
  }

  return plans;
}

function formatMoney(amount: number, currency: string): string | null {
  try {
    return new Intl.NumberFormat(getLocale(), { style: 'currency', currency }).format(amount);
  } catch {
    return null;
  }
}

/**
 * The yearly plan's monthly equivalent and how much it saves against twelve
 * months of the monthly plan. Both come from the products' own amounts; when
 * the store is unavailable the fallback prices work it out (58%). Nothing is
 * shown if the two plans are quoted in different currencies.
 */
function yearlyValue(plans: DisplayPlan[]): { perMonth: string | null; savePercent: number | null } {
  const monthly = plans.find((p) => p.id === 'monthly');
  const yearly = plans.find((p) => p.id === 'yearly');
  if (!yearly || yearly.amount <= 0) return { perMonth: null, savePercent: null };
  const perMonth = formatMoney(yearly.amount / 12, yearly.currency);
  const comparable =
    monthly && monthly.amount > 0 && monthly.currency === yearly.currency && Boolean(monthly.product) === Boolean(yearly.product);
  const savePercent = comparable ? Math.round((1 - yearly.amount / (monthly.amount * 12)) * 100) : null;
  return { perMonth, savePercent: savePercent && savePercent > 0 ? savePercent : null };
}

/** "12 readings, 4 journal entries and a 9-day streak", in the user's locale. */
function joinList(items: string[], fallbackAnd: string): string {
  const ListFormat = (Intl as unknown as {
    ListFormat?: new (locale: string, opts: { style: string; type: string }) => { format(items: string[]): string };
  }).ListFormat;
  if (ListFormat) {
    try {
      return new ListFormat(getLocale(), { style: 'long', type: 'conjunction' }).format(items);
    } catch {
      // fall through to the plain join
    }
  }
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')}${fallbackAnd}${items[items.length - 1]}`;
}

export function PaywallSheet({ open, onClose, feature, preview }: PaywallSheetProps) {
  const { t } = useT('app');
  const { user, profile, optimisticallyMarkPremium, pollProfileUntilPremium } = useAuth();
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

      const plans = buildDisplayPlans(products);
      setDisplayPlans(plans);

      // "Real products" means the user can actually purchase. On native that
      // requires a RevenueCat package; on web it just requires the product
      // catalog to have loaded (Stripe price IDs are resolved server-side at
      // checkout, not on the package object).
      const hasReal = isNative()
        ? plans.some(p => p.product?.rcPackage)
        : plans.some(p => !!p.product);
      setHasRealProducts(hasReal);

      if (!hasReal && products.length > 0 && isNative()) {
        console.warn('[Paywall] Products loaded but no rcPackage found - RevenueCat offerings may not be configured');
        console.warn('[Paywall] Expected IDs:', [PRODUCT_IDS.PREMIUM_MONTHLY, PRODUCT_IDS.PREMIUM_YEARLY, PRODUCT_IDS.PREMIUM_LIFETIME]);
        console.warn('[Paywall] Received IDs:', products.map(p => p.id));
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

  // A selected lifetime plan that the store then stops listing would leave
  // the CTA pointing at nothing; fall back to the yearly row.
  useEffect(() => {
    if (!loadingProducts && displayPlans.length && !displayPlans.some((p) => p.id === selectedPlan)) {
      setSelectedPlan('yearly');
    }
  }, [loadingProducts, displayPlans, selectedPlan]);

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

  // ── Copy ─────────────────────────────────────────────────────────────
  const byFeature = featureId ? BY_FEATURE_DEFAULTS[featureId] : undefined;
  const heading = featureId
    ? t(`premium.paywall.byFeature.${featureId}.heading`, { defaultValue: byFeature?.heading })
    : t('premium.paywall.heading', { defaultValue: 'Open every reading' });
  const outcome = featureId
    ? t(`premium.paywall.byFeature.${featureId}.outcome`, { defaultValue: byFeature?.outcome })
    : t('premium.paywall.subheading', {
        defaultValue:
          'Every tarot spread, your full birth chart, partner synastry and the horoscope tabs — with no ads and no Moonstones to spend.',
      });

  // Continuity: what the user already has, from the profile counters the
  // server maintains. Nothing is invented — a line is written only for a
  // count above zero, and the sentence is omitted when all three are zero.
  const continuityItems: string[] = [];
  const readings = profile?.totalReadings ?? 0;
  const entries = profile?.totalJournalEntries ?? 0;
  const streak = profile?.streak ?? 0;
  if (readings > 0) {
    continuityItems.push(
      t('premium.paywall.continuity.readings', {
        count: readings,
        defaultValue: readings === 1 ? '{{count}} reading' : '{{count}} readings',
      }),
    );
  }
  if (entries > 0) {
    continuityItems.push(
      t('premium.paywall.continuity.entries', {
        count: entries,
        defaultValue: entries === 1 ? '{{count}} journal entry' : '{{count}} journal entries',
      }),
    );
  }
  if (streak > 0) {
    continuityItems.push(
      t('premium.paywall.continuity.streak', { count: streak, defaultValue: '{{count}}-day streak' }),
    );
  }
  // One singular item ("your 1 reading", "your 7-day streak") takes the
  // singular verb; everything else is plural.
  const singleSingular =
    continuityItems.length === 1 &&
    ((readings === 1 && entries === 0 && streak === 0) ||
      (entries === 1 && readings === 0 && streak === 0) ||
      (streak > 0 && readings === 0 && entries === 0));
  const continuityLine = continuityItems.length
    ? t(singleSingular ? 'premium.paywall.continuity.lineOne' : 'premium.paywall.continuity.line', {
        defaultValue: singleSingular ? 'Your {{items}} stays. Premium builds on it.' : 'Your {{items}} stay. Premium builds on them.',
        items: joinList(continuityItems, t('premium.paywall.continuity.and', { defaultValue: ' and ' })),
      })
    : null;

  const benefits = benefitsFor(featureId);
  const { perMonth, savePercent } = yearlyValue(displayPlans);
  const selected = displayPlans.find((p) => p.id === selectedPlan);

  const ctaLabel = (() => {
    if (selectedPlan === 'lifetime') {
      return t('premium.paywall.cta.getLifetime', { defaultValue: 'Unlock Premium for life' });
    }
    if (selected?.product?.hasTrial && selected.product.trialDays) {
      return t('premium.paywall.cta.startTrial', {
        defaultValue: 'Start your {{days}}-day free trial',
        days: selected.product.trialDays,
      });
    }
    if (featureId) return t(`premium.paywall.byFeature.${featureId}.cta`, { defaultValue: byFeature?.cta });
    return t('premium.paywall.cta.subscribe', { defaultValue: 'Subscribe to Premium' });
  })();

  // A radio group is one tab stop: the checked plan carries tabIndex 0, the
  // others -1, and the arrow keys move both the check and the focus.
  const planRefs = useRef<Partial<Record<PlanId, HTMLDivElement | null>>>({});
  const onPlanKey = (e: KeyboardEvent<HTMLDivElement>, id: PlanId) => {
    const ids = displayPlans.map((pl) => pl.id);
    const at = ids.indexOf(id);
    let next: PlanId | null = null;
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        setSelectedPlan(id);
        return;
      case 'ArrowDown':
      case 'ArrowRight':
        next = ids[(at + 1) % ids.length];
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        next = ids[(at - 1 + ids.length) % ids.length];
        break;
      case 'Home':
        next = ids[0];
        break;
      case 'End':
        next = ids[ids.length - 1];
        break;
      default:
        return;
    }
    e.preventDefault();
    if (next) {
      setSelectedPlan(next);
      planRefs.current[next]?.focus();
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('premium.paywall.sheetTitle', { defaultValue: 'Premium' })}
      variant="glow"
    >
      <div className="mx-auto w-full max-w-sm">
        {/* ── Proof ──────────────────────────────────────────────── */}
        <div className="flex justify-center mb-5">
          {preview ?? <DeckFan size="md" back={profile?.card_back_url} />}
        </div>

        <h3 className="heading-display-lg text-mystic-100 text-center text-balance">
          {heading}
        </h3>
        <p className="mt-2 text-body text-mystic-300 text-center">
          {outcome}
        </p>
        {continuityLine && (
          <p className="mt-3 text-meta text-mystic-400 text-center">
            {continuityLine}
          </p>
        )}

        {/* A matched feature is already named by the heading; the tag only
            carries a name the map doesn't know. */}
        {feature && !featureId && (
          <div className="flex justify-center mt-4">
            <Tag tone="gold" size="md" icon={<Lock className="w-4 h-4" aria-hidden />}>
              {t('premium.paywall.featureRequires', { defaultValue: '{{feature}} opens with Premium', feature })}
            </Tag>
          </div>
        )}

        {/* ── The offer ──────────────────────────────────────────── */}
        <div className="mt-7">
          <EyebrowLabel align="left" className="block mb-2">
            {t('premium.paywall.whatYouUnlock', { defaultValue: 'What opens with Premium' })}
          </EyebrowLabel>
          <ul className="space-y-1">
            {benefits.map((key, i) => {
              const Icon = UNLOCK_ICONS[key];
              const lead = i === 0 && featureId !== null;
              const defaults = UNLOCK_DEFAULTS[key];
              return (
                <li
                  key={key}
                  className={`flex items-start gap-3 px-3 py-2.5 rounded-card ${lead ? 'bg-gold/10' : ''}`}
                >
                  <span
                    className={`shrink-0 w-10 h-10 rounded-control flex items-center justify-center ${
                      lead ? 'bg-gold/15 text-gold' : 'bg-mystic-800 text-mystic-300'
                    }`}
                    aria-hidden
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="min-w-0 flex-1 pt-0.5">
                    <span className={`block text-ui font-medium ${lead ? 'text-gold' : 'text-mystic-100'}`}>
                      {t(`premium.paywall.unlocks.${key}.label`, { defaultValue: defaults?.label })}
                    </span>
                    <span className="block text-meta text-mystic-400">
                      {t(`premium.paywall.unlocks.${key}.desc`, { defaultValue: defaults?.desc })}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ── Store states ───────────────────────────────────────── */}
        {productError && (
          <Card padding="sm" className="mt-6 flex items-center gap-3 border-coral/30">
            <AlertCircle className="w-5 h-5 text-coral shrink-0" aria-hidden />
            <p className="flex-1 min-w-0 text-ui text-mystic-200">{productError}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadProducts}
              aria-label={t('common:actions.retry', { defaultValue: 'Try again' }) as string}
              className="shrink-0 min-h-[44px] min-w-[44px] px-2"
            >
              <RefreshCw className="w-4 h-4" aria-hidden />
            </Button>
          </Card>
        )}

        {!loadingProducts && !hasRealProducts && !productError && (
          <Card padding="sm" className="mt-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-gold shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-ui font-medium text-mystic-100">
                {t('premium.paywall.errors.notAvailableTitle', {
                  defaultValue: 'Purchases aren’t available in this build yet',
                })}
              </p>
              <p className="mt-1 text-meta text-mystic-400">
                {t('premium.paywall.errors.notAvailableDesc', {
                  defaultValue: 'Everything free still works. If you already have Premium, restore it below.',
                })}
              </p>
            </div>
          </Card>
        )}

        {/* ── Plans ──────────────────────────────────────────────── */}
        <div className="mt-6">
          {loadingProducts ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mb-3" aria-hidden />
              <p className="text-meta text-mystic-400">{t('premium.paywall.loadingPrices')}</p>
            </div>
          ) : (
            <div
              role="radiogroup"
              aria-label={t('premium.paywall.plansLabel', { defaultValue: 'Plans' }) as string}
              className="space-y-3"
            >
              {displayPlans.map((plan) => {
                const active = selectedPlan === plan.id;
                const showSave = plan.id === 'yearly' && savePercent !== null;
                return (
                  <Card
                    key={plan.id}
                    ref={(el) => { planRefs.current[plan.id] = el; }}
                    variant={active ? 'accent' : 'default'}
                    padding="none"
                    role="radio"
                    aria-checked={active}
                    tabIndex={active ? 0 : -1}
                    onClick={() => setSelectedPlan(plan.id)}
                    onKeyDown={(e) => onPlanKey(e, plan.id)}
                    className={`
                      cursor-pointer select-none touch-manipulation [-webkit-tap-highlight-color:transparent]
                      transition-[border-color,background-color] duration-fast ease-out
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50
                      focus-visible:ring-offset-2 focus-visible:ring-offset-mystic-950
                      ${active ? 'bg-gold/10' : ''}
                    `}
                  >
                    <div className="flex items-start gap-3 p-4 min-h-[44px]">
                      <span
                        className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          active ? 'border-gold' : 'border-mystic-600'
                        }`}
                        aria-hidden
                      >
                        {active && <span className="w-2.5 h-2.5 rounded-full bg-gold" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className={`text-ui font-medium ${active ? 'text-mystic-100' : 'text-mystic-300'}`}>
                            {t(`premium.paywall.plans.${plan.labelKey}`)}
                          </span>
                          {showSave && (
                            <Badge tone="gold">
                              {t('premium.paywall.badges.save', { defaultValue: 'Save {{percent}}%', percent: savePercent })}
                            </Badge>
                          )}
                          {plan.badgeKey === 'foreverAccess' && (
                            <Badge tone="teal">{t('premium.paywall.badges.foreverAccess')}</Badge>
                          )}
                        </div>
                        {plan.id === 'yearly' && perMonth && (
                          <p className="mt-0.5 text-meta text-mystic-400">
                            {t('premium.paywall.perMonthEquivalent', { defaultValue: '{{price}} per month', price: perMonth })}
                          </p>
                        )}
                        {plan.product?.hasTrial && plan.product?.trialDays ? (
                          <p className={`mt-1 text-meta ${active ? 'text-teal' : 'text-teal/80'}`}>
                            {t('premium.paywall.trialLine', {
                              defaultValue: '{{days}}-day free trial. Cancel before it ends and you pay nothing.',
                              days: plan.product.trialDays,
                            })}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`font-display text-title ${active ? 'text-gold' : 'text-mystic-200'}`}>
                          {plan.price}
                        </span>
                        <span className="block text-meta text-mystic-500">
                          {t(`premium.paywall.periods.${plan.periodKey}`)}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Actions ────────────────────────────────────────────── */}
        <div className="mt-6 space-y-2">
          {/* When nothing can be bought, the notice above is the status; a
              button that cannot buy anything has no label that tells the
              truth, so it is not rendered. */}
          {(loadingProducts || hasRealProducts) && (
            <Button
              variant="gold"
              fullWidth
              size="lg"
              onClick={handlePurchase}
              loading={purchasing}
              disabled={loadingProducts || !hasRealProducts}
              className="font-semibold"
            >
              {ctaLabel}
            </Button>
          )}

          <Button variant="ghost" fullWidth onClick={handleRestore} loading={restoring} disabled={restoring}>
            {!restoring && <RotateCcw className="w-4 h-4" aria-hidden />}
            {t('premium.paywall.restorePurchase', { defaultValue: 'Restore purchases' })}
          </Button>
        </div>

        <p className="mt-4 text-caption text-mystic-500 text-center">
          {selectedPlan === 'lifetime'
            ? t('premium.paywall.disclaimers.lifetime')
            : t('premium.paywall.disclaimers.subscription')}
        </p>
      </div>
    </Sheet>
  );
}
