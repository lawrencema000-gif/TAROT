import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Zap, Check } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button, toast } from '../ui';
import { useT } from '../../i18n/useT';
import { supabase } from '../../lib/supabase';
import { getPlatform, isNative } from '../../utils/platform';
import { getBillingService, MOONSTONE_PACKS } from '../../services/billing';

interface MoonstoneTopUpSheetProps {
  open: boolean;
  onClose: () => void;
  /** Optional callback fired after a successful credit so parents can refresh balance. */
  onCredited?: () => void;
}

interface PackRow {
  productId: string;
  label: string;
  moonstones: number;
  priceLabel: string;
  highlight?: boolean;
}

const PACK_ORDER: PackRow[] = [
  { productId: 'arcana_moonstones_100',  label: 'Starter',  moonstones: 100,  priceLabel: '$2.99' },
  { productId: 'arcana_moonstones_300',  label: 'Regular',  moonstones: 300,  priceLabel: '$7.99',  highlight: true },
  { productId: 'arcana_moonstones_750',  label: 'Generous', moonstones: 750,  priceLabel: '$16.99' },
  { productId: 'arcana_moonstones_2000', label: 'Devotee',  moonstones: 2000, priceLabel: '$39.99' },
];

/**
 * Purchase path for Moonstone packs.
 *
 * - Native (Android/iOS): fetches live RevenueCat packages so prices match
 *   the store's local currency, then purchases via the billing service.
 * - Web: calls create-moonstone-checkout edge function and redirects to
 *   Stripe hosted checkout.
 *
 * On successful credit, the ledger entry lands via webhook and a toast
 * fires the optional onCredited callback so the parent can refresh balance.
 */
export function MoonstoneTopUpSheet({ open, onClose, onCredited }: MoonstoneTopUpSheetProps) {
  const { t } = useT('app');
  const [nativePrices, setNativePrices] = useState<Record<string, string>>({});
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const refreshNativePrices = useCallback(async () => {
    if (!isNative()) return;
    try {
      const ids = Object.keys(MOONSTONE_PACKS);
      const products = await getBillingService().getProducts(ids);
      const map: Record<string, string> = {};
      for (const p of products) {
        if (MOONSTONE_PACKS[p.id]) map[p.id] = p.price;
      }
      setNativePrices(map);
    } catch {
      // If RevenueCat can't load we fall back to the hardcoded USD labels.
    }
  }, []);

  useEffect(() => {
    if (open) refreshNativePrices();
  }, [open, refreshNativePrices]);

  const purchase = async (productId: string) => {
    setPurchasing(productId);
    try {
      if (isNative()) {
        const billing = getBillingService();
        const ids = Object.keys(MOONSTONE_PACKS);
        const products = await billing.getProducts(ids);
        const pack = products.find((p) => p.id === productId);
        if (!pack?.rcPackage) {
          toast(t('moonstoneTopUp.packNotFound', { defaultValue: 'Pack not available in store.' }), 'error');
          return;
        }
        const result = await billing.purchase(productId, pack);
        if (result.success) {
          toast(
            t('moonstoneTopUp.success', {
              defaultValue: '{{n}} Moonstones on the way — takes a few seconds to land.',
              n: MOONSTONE_PACKS[productId]?.moonstones ?? 0,
            }),
            'success',
          );
          onCredited?.();
          onClose();
        } else if (result.errorKey !== 'billing.cancelled') {
          toast(result.error || t('moonstoneTopUp.generic', { defaultValue: 'Purchase failed' }), 'error');
        }
      } else {
        const origin = window.location.origin;
        const { data, error } = await supabase.functions.invoke('create-moonstone-checkout', {
          body: {
            packId: productId,
            successUrl: `${origin}/?moonstones=success`,
            cancelUrl: `${origin}/?moonstones=cancelled`,
            clientPlatform: getPlatform(),
          },
        });
        if (error) {
          toast(t('moonstoneTopUp.stripeFailed', { defaultValue: 'Could not open checkout' }), 'error');
          return;
        }
        const payload = (data?.data ?? data) as { url?: string } | null;
        if (payload?.url) window.location.assign(payload.url);
      }
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('moonstoneTopUp.title', { defaultValue: 'Top up Moonstones' })}
      variant="glow"
    >
      <div className="space-y-3 pb-4">
        <div className="text-center pt-1">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold/25 to-cosmic-violet/25 flex items-center justify-center mx-auto mb-2">
            <Sparkles className="w-5 h-5 text-gold" />
          </div>
          <p className="text-sm text-mystic-400 leading-relaxed max-w-xs mx-auto">
            {t('moonstoneTopUp.subtitle', {
              defaultValue: 'Unlock readings, tip live hosts, and book advisor sessions.',
            })}
          </p>
        </div>

        <div className="space-y-2">
          {PACK_ORDER.map((p) => {
            const displayPrice = nativePrices[p.productId] ?? p.priceLabel;
            const isBuying = purchasing === p.productId;
            return (
              <button
                key={p.productId}
                onClick={() => purchase(p.productId)}
                disabled={purchasing !== null}
                className={`w-full p-3 rounded-xl border text-left transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${
                  p.highlight
                    ? 'bg-gradient-to-r from-gold/10 to-cosmic-violet/10 border-gold/40'
                    : 'bg-mystic-800/40 border-mystic-700/40 hover:border-mystic-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gold/15 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-5 h-5 text-gold" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-mystic-100">
                        {p.moonstones.toLocaleString()} Moonstones
                        {p.highlight && (
                          <span className="ml-2 text-[9px] uppercase tracking-wider text-gold">
                            {t('moonstoneTopUp.popular', { defaultValue: 'Popular' })}
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-mystic-500">
                        {t(`moonstoneTopUp.packLabel.${p.label.toLowerCase()}`, { defaultValue: p.label })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-mystic-200">{displayPrice}</span>
                    {isBuying && <Check className="w-4 h-4 text-emerald-400 animate-pulse" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {!isNative() && (
          <p className="text-[10px] text-center text-mystic-500 italic">
            {t('moonstoneTopUp.securePayment', {
              defaultValue: 'Secure checkout powered by Stripe. One-time purchase — cancel anytime.',
            })}
          </p>
        )}

        {isNative() && (
          <p className="text-[10px] text-center text-mystic-500 italic">
            {t('moonstoneTopUp.playStorePurchase', {
              defaultValue: 'Charged through Google Play. Manage purchases in your Google account.',
            })}
          </p>
        )}

        <Button variant="ghost" fullWidth onClick={onClose} className="mt-2">
          {t('common:actions.close', { defaultValue: 'Close' })}
        </Button>
      </div>
    </Sheet>
  );
}
