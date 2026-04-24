import { supabase } from '../lib/supabase';
import { getPlatform } from '../utils/platform';

export type ReportKey = 'career-archetype' | 'natal-chart-pdf' | 'year-ahead';

/**
 * Kicks off a Stripe Checkout session for a one-off report unlock.
 * Redirects the browser to Stripe's hosted page.
 *
 * On return (success_url), the webhook has already inserted the unlock
 * row; the client only needs to re-check via `reportUnlocks.isUnlocked`.
 */
export async function startReportCheckout(opts: {
  reportKey: ReportKey;
  reference: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tarotlife.app';
  const { reportKey, reference } = opts;

  const successUrl = `${origin}/reports/${reportKey === 'natal-chart-pdf' ? 'natal-chart' : reportKey === 'year-ahead' ? 'year-ahead' : 'career'}?unlock=success`;
  const cancelUrl  = `${origin}/reports/${reportKey === 'natal-chart-pdf' ? 'natal-chart' : reportKey === 'year-ahead' ? 'year-ahead' : 'career'}?unlock=cancelled`;

  const { data, error } = await supabase.functions.invoke('create-report-checkout', {
    body: { reportKey, reference, successUrl, cancelUrl, clientPlatform: getPlatform() },
  });

  if (error) {
    const anyErr = error as { context?: { status?: number }; message?: string };
    if (anyErr?.context?.status === 409) return { ok: false, error: 'already-unlocked' };
    return { ok: false, error: anyErr?.message ?? 'stripe-failed' };
  }

  const payload = (data?.data ?? data) as { url?: string } | null;
  if (!payload?.url) return { ok: false, error: 'no-url' };
  window.location.assign(payload.url);
  return { ok: true };
}
