import { useEffect, useRef, useState } from 'react';
import { X, Check, Gift } from 'lucide-react';
import { Badge, Button, DeckFan } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { getBillingService, PRODUCT_IDS } from '../../services/billing';
import { useT } from '../../i18n/useT';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { PaywallSheet } from './PaywallSheet';

const SESSION_KEY = 'trialReminder.shownThisSession.v1';
/** Counts the sessions this browser has opened; the reminder waits for the second. */
const SESSION_COUNT_KEY = 'trialReminder.sessions.v1';
const SESSION_COUNTED_KEY = 'trialReminder.sessionCounted.v1';
const SHOW_AFTER_MS = 30_000;
/** How often to look again while something else is open. */
const RETRY_MS = 5_000;

/**
 * The yearly plan as the store reports it. The modal only promises a trial
 * when the store says one exists, and only quotes a price it has read; until
 * the product loads it says "the price shown in the store" instead.
 */
interface YearlyOffer {
  price: string;
  trialDays: number | null;
}

/**
 * Something modal is already up: a Sheet (which marks the body), the Earn
 * sheet's paywall, a report dialog, the crisis banner, WatchAdSheet. The
 * reminder never stacks a second upsell on top of any of them (R5 m-7).
 */
function somethingIsOpen(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.body.classList.contains('sheet-open')) return true;
  return document.querySelector('[role="dialog"], [aria-modal="true"]') !== null;
}

/**
 * Which session this is, counted once per tab session. The first session is
 * the one where the user is still finding their feet; the reminder is for
 * the second visit onwards.
 */
function sessionNumber(): number {
  try {
    if (sessionStorage.getItem(SESSION_COUNTED_KEY) !== '1') {
      const n = Number(localStorage.getItem(SESSION_COUNT_KEY) ?? '0') + 1;
      localStorage.setItem(SESSION_COUNT_KEY, String(n));
      sessionStorage.setItem(SESSION_COUNTED_KEY, '1');
      return n;
    }
    return Number(localStorage.getItem(SESSION_COUNT_KEY) ?? '1');
  } catch {
    // Storage unavailable: treat as a returning visitor so the reminder can
    // still be shown once, rather than never.
    return 2;
  }
}

/**
 * A centred modal rather than a Sheet on purpose: it appears thirty seconds
 * into a session over whatever is on screen, which may itself be a Sheet
 * (z-50 and up, two per level), so it sits above the lot at z-60. It still
 * behaves as a dialog — labelled, modal, focus held inside it and handed
 * back on close, dismissed by the scrim or Escape — and its entrance is the
 * shared slide-up, once.
 *
 * It waits for a free surface: if a sheet or dialog is open when the timer
 * lands, it checks again every few seconds and shows only once nothing else
 * is. And it waits for the second session, so a failed first action is never
 * followed by two upsells in a row.
 */
export function TrialReminderModal() {
  const { user, profile } = useAuth();
  const { t } = useT('app');
  const [open, setOpen] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [yearly, setYearly] = useState<YearlyOffer | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus lands on the dialog itself, so the first thing announced is its
  // name (the headline) rather than "Close, button"; Tab then reaches the
  // close button, the CTA and "Not now" in turn, and nothing behind.
  const { isTop } = useFocusTrap(panelRef, open && !showPaywall, { initialFocus: panelRef });

  useEffect(() => {
    if (!user || !profile) return;
    if (profile.isPremium) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return;
    } catch {
      // sessionStorage unavailable — fall through, treat as not yet shown
    }
    if (sessionNumber() < 2) return;

    let timer = 0;
    const attempt = () => {
      if (somethingIsOpen()) {
        timer = window.setTimeout(attempt, RETRY_MS);
        return;
      }
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        // ignore quota / privacy-mode failures
      }
      setOpen(true);
    };
    timer = window.setTimeout(attempt, SHOW_AFTER_MS);

    return () => window.clearTimeout(timer);
  }, [user, profile]);

  // Read the yearly plan so the copy can quote the live price and the real
  // trial length. Starts with the timer above, so it has 30s to land.
  useEffect(() => {
    if (!user || !profile || profile.isPremium) return;
    let cancelled = false;
    (async () => {
      try {
        const billing = getBillingService();
        await billing.initialize();
        const products = await billing.getProducts([PRODUCT_IDS.PREMIUM_YEARLY]);
        const product = products.find(
          (p) => p.period === 'year' || /yearly|annual/.test(p.id.split(':')[0]),
        );
        if (!cancelled && product) {
          setYearly({
            price: product.price,
            trialDays: product.hasTrial && product.trialDays ? product.trialDays : null,
          });
        }
      } catch {
        // Store unreachable — the copy falls back to "the price shown in the store".
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, profile]);

  // Escape closes the reminder, as it does every other dialog in the app —
  // and only the reminder, when it is the dialog on top.
  useEffect(() => {
    if (!open || showPaywall || !isTop) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, showPaywall, isTop]);

  if (showPaywall) {
    return <PaywallSheet open onClose={() => { setShowPaywall(false); setOpen(false); }} />;
  }

  if (!open) return null;

  const trialDays = yearly?.trialDays ?? null;
  const hasTrial = trialDays !== null;

  const benefits = [
    t('premium.trialReminder.benefits.spreads', { defaultValue: 'Every tarot spread, Celtic Cross included' }),
    t('premium.trialReminder.benefits.chart', { defaultValue: 'Your full birth chart, planet by planet' }),
    t('premium.trialReminder.benefits.noAds', { defaultValue: 'No ads, and no Moonstones to spend' }),
  ];

  const subtitle = hasTrial
    ? t('premium.trialReminder.subtitle', {
        defaultValue:
          'Everything opens for {{days}} days, then {{price}} a year. Cancel before the trial ends and you pay nothing.',
        days: trialDays,
        price: yearly?.price,
      })
    : yearly
      ? t('premium.trialReminder.noTrial.subtitle', {
          defaultValue: '{{price}} a year, or pay monthly. Cancel anytime.',
          price: yearly.price,
        })
      : t('premium.trialReminder.noTrial.subtitleNoPrice', {
          defaultValue: 'Yearly or monthly, at the prices shown in the store. Cancel anytime.',
        });

  return (
    // The scrim is fill, not blur: an 85% canvas over the page separates the
    // card from it as well as a blur did and costs nothing per frame.
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-mystic-950/85"
      onClick={() => setOpen(false)}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-reminder-title"
        tabIndex={-1}
        className="relative w-full max-w-md bg-mystic-850 border border-gold/25 rounded-sheet overflow-hidden outline-none animate-slide-up"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t('common:actions.close', { defaultValue: 'Close' }) as string}
          className="
            absolute top-3 right-3 z-10 w-11 h-11 inline-flex items-center justify-center rounded-full
            hairline-gold-soft text-mystic-300 touch-manipulation [-webkit-tap-highlight-color:transparent]
            transition-[transform,color] duration-fast ease-out motion-safe:active:scale-[0.92] active:text-mystic-100
            [@media(hover:hover)]:[&:hover:not(:active)]:text-mystic-100
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50
            focus-visible:ring-offset-2 focus-visible:ring-offset-mystic-950
          "
        >
          <X className="w-5 h-5" aria-hidden />
        </button>

        <div className="px-6 pt-7 pb-6 flex flex-col items-center">
          <DeckFan size="sm" back={profile?.card_back_url} className="mb-3" />

          {hasTrial && (
            <Badge tone="violet" className="mb-3">
              <Gift className="w-3.5 h-3.5" aria-hidden />
              {t('premium.trialReminder.badge', { defaultValue: '{{days}} days free', days: trialDays })}
            </Badge>
          )}

          <h2
            id="trial-reminder-title"
            className="heading-display-lg text-center text-mystic-100 text-balance"
          >
            {hasTrial
              ? t('premium.trialReminder.title', { defaultValue: 'Try Premium free for {{days}} days', days: trialDays })
              : t('premium.trialReminder.noTrial.title', { defaultValue: 'Open everything with Premium' })}
          </h2>
          <p className="mt-2 text-ui text-mystic-300 text-center max-w-xs">
            {subtitle}
          </p>

          <ul className="w-full mt-5 space-y-2">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5 text-ui text-mystic-200">
                <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-gold/15 flex items-center justify-center" aria-hidden>
                  <Check className="w-3 h-3 text-gold" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>

          <div className="w-full mt-6 space-y-2">
            <Button variant="gold" fullWidth size="lg" onClick={() => setShowPaywall(true)} className="font-semibold">
              {hasTrial
                ? t('premium.trialReminder.cta', { defaultValue: 'Start free trial' })
                : t('premium.trialReminder.noTrial.cta', { defaultValue: 'See Premium plans' })}
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setOpen(false)}>
              {t('premium.trialReminder.dismiss', { defaultValue: 'Not now' })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
