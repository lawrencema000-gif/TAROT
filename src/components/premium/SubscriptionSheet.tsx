import { useEffect, useState } from 'react';
import { Calendar, CreditCard, ExternalLink, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Button, toast, Sheet, DeckFan, Card, ListRow, Tag, EyebrowLabel } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { getBillingService, PRODUCT_IDS, type BillingService } from '../../services/billing';
import { getPlatform } from '../../utils/platform';
import { useT } from '../../i18n/useT';
import { getLocale } from '../../i18n/config';

interface SubscriptionSheetProps {
  open: boolean;
  onClose: () => void;
}

/** Only the web (Stripe) service can open a billing portal; the interface
 *  doesn't declare it, so it is probed rather than assumed. */
type PortalCapable = BillingService & { openCustomerPortal?: () => Promise<boolean> };

// The same list the paywall shows, so a subscriber sees exactly what they
// were promised; the labels come from premium.paywall.unlocks.*.
const INCLUDED = [
  'adFree',
  'allSpreads',
  'compatibility',
  'partnerSynastry',
  'deepInterpretations',
  'birthChart',
  'horoscopeFull',
  'humanDesign',
  'bazi',
  'dreamAi',
  'moodLetter',
  'oracleChat',
  'shadowWork',
  'celestialMap',
  'reports',
] as const;

/** English for the two entries added in Phase 5c (mirrors PaywallSheet). */
const INCLUDED_DEFAULTS: Partial<Record<(typeof INCLUDED)[number], string>> = {
  celestialMap: 'Celestial Map',
  reports: 'Deep reports',
};

/**
 * What the store knows about the active entitlement. Read from RevenueCat on
 * native; the web service has no customer info, so on the web the sheet
 * states only what the profile knows (that Premium is on) and where it is
 * billed. Nothing here is guessed: a row renders only from a value the store
 * returned.
 */
interface Entitlement {
  planId: 'monthly' | 'yearly' | 'lifetime' | null;
  expiresAt: string | null;
  willRenew: boolean;
  isTrial: boolean;
}

function planIdFor(productId: string): Entitlement['planId'] {
  const base = productId.split(':')[0].toLowerCase();
  if (base === PRODUCT_IDS.PREMIUM_LIFETIME || base.includes('lifetime')) return 'lifetime';
  if (base === PRODUCT_IDS.PREMIUM_YEARLY || base.includes('yearly') || base.includes('annual')) return 'yearly';
  if (base === PRODUCT_IDS.PREMIUM_MONTHLY || base.includes('monthly')) return 'monthly';
  return null;
}

function formatDate(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium' }).format(d);
  } catch {
    return null;
  }
}

export function SubscriptionSheet({ open, onClose }: SubscriptionSheetProps) {
  const { t } = useT('app');
  const { profile, refreshProfile } = useAuth();
  const [restoring, setRestoring] = useState(false);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  // Where the subscription is billed decides where it can be managed:
  // Google Play on Android, the App Store on iOS, Stripe's portal on the web.
  const platform = getPlatform();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const info = await getBillingService().getCustomerInfo();
        if (cancelled || !info) return;
        const active = info.entitlements?.active ?? {};
        const ent = active.premium ?? Object.values(active)[0];
        if (!ent) return;
        setEntitlement({
          planId: planIdFor(ent.productIdentifier),
          expiresAt: ent.expirationDate,
          willRenew: ent.willRenew,
          isTrial: String(ent.periodType).toUpperCase() === 'TRIAL',
        });
      } catch {
        // Store unreachable — the sheet shows what the profile knows.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

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

  // ── Plan facts ───────────────────────────────────────────────────────
  const planName = entitlement?.planId
    ? t(`premium.paywall.plans.${entitlement.planId}`)
    : t('premium.subscription.planTitle');

  const renewalDate = entitlement?.expiresAt ? formatDate(entitlement.expiresAt) : null;
  const renewalLine = (() => {
    if (!entitlement) return null;
    if (entitlement.planId === 'lifetime' || (!entitlement.expiresAt && !entitlement.isTrial)) {
      return t('premium.subscription.renewal.never', { defaultValue: 'Paid once, nothing renews' });
    }
    if (!renewalDate) return null;
    if (entitlement.isTrial) {
      return t('premium.subscription.renewal.trialEnds', { defaultValue: 'Trial ends {{date}}', date: renewalDate });
    }
    return entitlement.willRenew
      ? t('premium.subscription.renewal.renews', { defaultValue: 'Renews {{date}}', date: renewalDate })
      : t('premium.subscription.renewal.ends', { defaultValue: 'Ends {{date}}', date: renewalDate });
  })();

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('premium.subscription.heading', { defaultValue: 'Premium is on' })}
      variant="glow"
    >
      <div className="mx-auto w-full max-w-sm">
        <div className="flex justify-center mb-4">
          <DeckFan size="sm" back={profile?.card_back_url} />
        </div>

        <p className="text-body text-mystic-300 text-center">
          {t('premium.subscription.subheading', {
            defaultValue: 'Every spread, chart and reading is open to you, with no ads and no Moonstones to spend.',
          })}
        </p>

        {/* ── The plan, as facts ─────────────────────────────────── */}
        <Card variant="accent" padding="none" className="mt-6 overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <EyebrowLabel align="left" className="block">
              {t('premium.subscription.plan', { defaultValue: 'Your plan' })}
            </EyebrowLabel>
            <p className="mt-1 heading-display-md text-mystic-100">{planName}</p>
            <p className="text-meta text-mystic-400">
              {profile?.displayName || t('premium.subscription.memberFallback')}
            </p>
          </div>
          <div className="border-t border-mystic-700/60 divide-y divide-mystic-700/60">
              <ListRow
                size="md"
                tone="teal"
                icon={<CheckCircle2 />}
                label={t('premium.subscription.status')}
                value={<span className="text-teal font-medium">{t('premium.subscription.statusActive')}</span>}
              />
              {renewalLine && (
                <ListRow
                  size="md"
                  icon={<Calendar />}
                  label={t('premium.subscription.renewal.label', { defaultValue: 'Renewal' })}
                  value={<span className="text-mystic-300">{renewalLine}</span>}
                />
              )}
              <ListRow
                size="md"
                icon={<CreditCard />}
                label={t('premium.subscription.billing')}
                value={<span className="text-mystic-300">{t(`premium.subscription.billingVia.${platform}`)}</span>}
              />
          </div>
        </Card>

        {/* ── What the plan includes ─────────────────────────────── */}
        <div className="mt-6">
          <EyebrowLabel align="left" className="block mb-2">
            {t('premium.subscription.yourBenefits', { defaultValue: 'Included in your plan' })}
          </EyebrowLabel>
          <ul className="flex flex-wrap gap-2" aria-label={t('premium.subscription.yourBenefits', { defaultValue: 'Included in your plan' }) as string}>
            {INCLUDED.map((key) => (
              <li key={key}>
                <Tag tone="neutral" size="md">
                  {t(`premium.paywall.unlocks.${key}.label`, { defaultValue: INCLUDED_DEFAULTS[key] })}
                </Tag>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Actions ────────────────────────────────────────────── */}
        <div className="mt-6 space-y-2">
          <Button variant="outline" fullWidth size="lg" onClick={handleManageSubscription}>
            <ExternalLink className="w-4 h-4" aria-hidden />
            {t(`premium.subscription.manage.${platform}`)}
          </Button>

          <Button variant="ghost" fullWidth onClick={handleRestore} loading={restoring} disabled={restoring}>
            {!restoring && <RotateCcw className="w-4 h-4" aria-hidden />}
            {t('premium.subscription.syncStatus', { defaultValue: 'Refresh my subscription' })}
          </Button>
        </div>

        <p className="mt-4 text-caption text-mystic-500 text-center">
          {t(`premium.subscription.storeNote.${platform}`)}
        </p>
      </div>
    </Sheet>
  );
}
