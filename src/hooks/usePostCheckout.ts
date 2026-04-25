// usePostCheckout — handles the brief window between Stripe checkout
// success redirect and the webhook flipping `profiles.is_premium`.
//
// Stripe redirects the user to `/?payment=success` after a successful
// payment. The webhook fires async (typically 1–3s) to set is_premium
// server-side. Without this hook, the user sees "Free" UI for that
// window and only sees premium after a manual refresh.
//
// Behaviour:
//   - On `?payment=success`: shows a "Processing subscription..." toast,
//     polls the profile every 2s for up to 30s. When is_premium flips
//     to true, shows a success toast and clears the query param.
//   - On `?payment=cancelled`: shows a single "Payment cancelled" toast
//     and clears the query param.
//   - In both cases, the URL is cleaned so the toast doesn't fire again
//     on the next mount/re-render.

import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30_000;

export function usePostCheckout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { t } = useT('app');
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('payment');
    if (!status) return;

    // Avoid running twice for the same query param (e.g. on a re-render
    // before navigation clears it).
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

    // Show processing feedback and start polling.
    toast(
      t('billing.processingPayment', { defaultValue: 'Processing your subscription… this may take a few seconds.' }),
      'info',
    );

    const start = Date.now();
    let stopped = false;

    const poll = async () => {
      if (stopped) return;
      await refreshProfile();
      // The next render will pick up the new profile from AuthContext —
      // we re-read it from the closure-captured ref by checking via a
      // separate effect below. Here we simply continue scheduling.
      if (Date.now() - start >= POLL_TIMEOUT_MS) {
        stopped = true;
        toast(
          t('billing.processingTimeout', {
            defaultValue: "Your payment is being processed. If premium doesn't appear shortly, refresh or contact support.",
          }),
          'info',
        );
        params.delete('payment');
        navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    };

    setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      stopped = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Separate effect: when the polling lands and isPremium flips to true
  // mid-flight, fire the success toast and clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('payment') !== 'success') return;
    if (!profile?.isPremium) return;
    toast(
      t('billing.premiumActivated', { defaultValue: 'Premium activated. Welcome!' }),
      'success',
    );
    params.delete('payment');
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.isPremium]);
}
