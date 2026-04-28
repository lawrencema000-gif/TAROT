// usePostCheckout — handles the brief window between Stripe checkout
// success redirect and the webhook flipping `profiles.is_premium`.
//
// Stripe redirects the user to `/?payment=success` after a successful
// payment. The webhook fires async (typically 1–3s) to set is_premium
// server-side. We poll the DB until it lands and surface premium UI
// the moment it does.
//
// Behaviour:
//   - On `?payment=success`: shows a "Processing subscription..." toast,
//     polls the profile every 2s for up to 60s. When is_premium flips
//     to true, shows a success toast and clears the query param.
//   - On `?payment=cancelled`: shows a single "Payment cancelled" toast
//     and clears the query param.
//   - In both cases, the URL is cleaned so the toast doesn't fire again
//     on the next mount/re-render.
//
// Note: we deliberately do NOT optimistically flip is_premium on the web
// side from the URL alone, since `/?payment=success` could be hit by a
// malicious user manually. Polling against the actual DB is the safe
// signal. (Native flow is different — RC's local customerInfo is signed
// + verified, so PaywallSheet does flip optimistically.)

import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';

const POLL_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 2_000;

export function usePostCheckout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, pollProfileUntilPremium } = useAuth();
  const { t } = useT('app');
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('payment');
    if (!status) return;

    const stamp = `${status}:${location.pathname}`;
    if (handledRef.current === stamp) return;
    handledRef.current = stamp;

    if (status === 'cancelled') {
      toast(
        t('billing.paymentCancelled', { defaultValue: 'Payment cancelled — no charge was made.' }),
        'info',
      );
      params.delete('payment');
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
      return;
    }

    if (status !== 'success') return;

    // Already premium? Clean up and celebrate.
    if (profile?.isPremium) {
      toast(
        t('billing.premiumActivated', { defaultValue: 'Premium activated. Welcome!' }),
        'success',
      );
      params.delete('payment');
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
      return;
    }

    toast(
      t('billing.processingPayment', { defaultValue: 'Processing your subscription… this may take a few seconds.' }),
      'info',
    );

    let cancelled = false;
    pollProfileUntilPremium(POLL_TIMEOUT_MS, POLL_INTERVAL_MS)
      .then((confirmed) => {
        if (cancelled) return;
        const params2 = new URLSearchParams(location.search);
        params2.delete('payment');
        navigate({ pathname: location.pathname, search: params2.toString() }, { replace: true });
        if (confirmed) {
          toast(
            t('billing.premiumActivated', { defaultValue: 'Premium activated. Welcome!' }),
            'success',
          );
        } else {
          toast(
            t('billing.processingTimeout', {
              defaultValue: "Your payment is being processed. If premium doesn't appear shortly, refresh or contact support.",
            }),
            'info',
          );
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);
}
