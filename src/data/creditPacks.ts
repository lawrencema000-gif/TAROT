// Credit-pack catalog. Sized to mirror Labyrinthos's tiers but adapted
// for our Stripe pricing. Stripe price IDs are populated from env vars
// at the call site so this file stays public-safe.

export interface CreditPack {
  id: 'starter' | 'standard' | 'value';
  credits: number;
  priceLabel: string;
  pricePerCreditLabel: string;
  popular?: boolean;
  description: string;
  // The env-var name that holds the corresponding Stripe price ID.
  // Set on the server (edge function) — never read by the client.
  stripePriceEnv: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'starter',
    credits: 33,
    priceLabel: '$0.99',
    pricePerCreditLabel: '~3¢ each',
    description: 'A taste — try AI readings without committing.',
    stripePriceEnv: 'STRIPE_PRICE_CREDITS_33',
  },
  {
    id: 'standard',
    credits: 333,
    priceLabel: '$4.99',
    pricePerCreditLabel: '~1.5¢ each',
    popular: true,
    description: 'A month of regular AI use, by most patterns.',
    stripePriceEnv: 'STRIPE_PRICE_CREDITS_333',
  },
  {
    id: 'value',
    credits: 777,
    priceLabel: '$6.99',
    pricePerCreditLabel: '~0.9¢ each',
    description: 'For deep dives — multiple readings every day.',
    stripePriceEnv: 'STRIPE_PRICE_CREDITS_777',
  },
];

export function getCreditPack(id: CreditPack['id']): CreditPack | null {
  return CREDIT_PACKS.find((p) => p.id === id) ?? null;
}
