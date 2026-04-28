// Credit balance + ledger client service.
//
// Reads from user_credits / credit_ledger (RLS-scoped). Mutations go
// through edge functions / RPCs only — never via direct client INSERTs.

import { supabase } from '../lib/supabase';

export interface CreditBalance {
  balance: number;
  lifetimePurchased: number;
  lifetimeSpent: number;
  lifetimeGranted: number;
}

export interface CreditLedgerEntry {
  id: string;
  delta: number;
  reason: string;
  meta: Record<string, unknown>;
  createdAt: string;
}

export async function getCreditBalance(userId: string): Promise<CreditBalance> {
  const { data } = await supabase
    .from('user_credits')
    .select('balance, lifetime_purchased, lifetime_spent, lifetime_granted')
    .eq('user_id', userId)
    .maybeSingle();
  return {
    balance: data?.balance ?? 0,
    lifetimePurchased: data?.lifetime_purchased ?? 0,
    lifetimeSpent: data?.lifetime_spent ?? 0,
    lifetimeGranted: data?.lifetime_granted ?? 0,
  };
}

export async function getRecentLedger(userId: string, limit = 20): Promise<CreditLedgerEntry[]> {
  const { data } = await supabase
    .from('credit_ledger')
    .select('id, delta, reason, meta, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    id: r.id,
    delta: r.delta,
    reason: r.reason,
    meta: (r.meta as Record<string, unknown>) ?? {},
    createdAt: r.created_at,
  }));
}

// Initiates a Stripe checkout for the given pack via the existing
// create-checkout-session edge function. Server resolves the actual
// Stripe price ID from STRIPE_PRICE_CREDITS_* env vars.
export async function startCreditPackCheckout(packId: 'starter' | 'standard' | 'value'): Promise<{ url?: string; error?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { error: 'Not signed in' };

  const supabaseUrl = (import.meta as unknown as { env: Record<string, string> }).env.VITE_SUPABASE_URL;
  const url = `${supabaseUrl}/functions/v1/create-checkout-session`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productId: `credit_pack_${packId}`,
      successUrl: `${window.location.origin}/?credits=success`,
      cancelUrl: `${window.location.origin}/?credits=cancelled`,
    }),
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j?.error?.message || msg;
    } catch { /* */ }
    return { error: msg };
  }

  const data = await res.json();
  return { url: data?.url as string | undefined };
}
