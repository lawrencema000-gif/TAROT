import { useEffect, useState } from 'react';
import { X, Sparkles, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CREDIT_PACKS } from '../../data/creditPacks';
import { startCreditPackCheckout, getCreditBalance, type CreditBalance } from '../../services/credits';
import { toast } from '../ui';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreditPacksSheet({ open, onClose }: Props) {
  const { user } = useAuth();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [balance, setBalance] = useState<CreditBalance | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    getCreditBalance(user.id).then((b) => { if (!cancelled) setBalance(b); });
    return () => { cancelled = true; };
  }, [open, user]);

  if (!open) return null;

  const handleBuy = async (packId: 'starter' | 'standard' | 'value') => {
    if (!user) {
      toast('Sign in to buy credits', 'error');
      return;
    }
    setPurchasing(packId);
    const { url, error } = await startCreditPackCheckout(packId);
    setPurchasing(null);
    if (error) {
      toast(error, 'error');
      return;
    }
    if (url) window.location.href = url;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-mystic-950/80 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-gradient-to-br from-mystic-900 via-mystic-900 to-mystic-950 border border-gold/30 rounded-3xl shadow-2xl shadow-gold/10 p-6" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 p-2 rounded-full bg-mystic-800/60 hover:bg-mystic-800">
          <X className="w-4 h-4 text-mystic-300" />
        </button>

        <header className="mb-6 text-center pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            <span className="text-xs uppercase tracking-wider text-gold">Credit Packs</span>
          </div>
          <h2 className="font-display text-2xl text-mystic-100 mb-1">Get more AI readings</h2>
          <p className="text-sm text-mystic-400">One-time purchase. No subscription required.</p>
          {balance && (
            <p className="text-xs text-mystic-500 mt-2">
              Current balance: <span className="text-gold font-semibold">{balance.balance}</span> credits
            </p>
          )}
        </header>

        <div className="space-y-3">
          {CREDIT_PACKS.map((pack) => (
            <button
              key={pack.id}
              onClick={() => handleBuy(pack.id)}
              disabled={purchasing !== null}
              className={`w-full text-left rounded-2xl border p-4 transition-colors ${
                pack.popular
                  ? 'border-gold/50 bg-gold/10 hover:bg-gold/15'
                  : 'border-mystic-800/60 bg-mystic-900/40 hover:border-gold/30'
              } disabled:opacity-50`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display text-lg text-mystic-100">{pack.credits} credits</span>
                    {pack.popular && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/20 text-gold uppercase tracking-wider">Popular</span>}
                  </div>
                  <p className="text-xs text-mystic-400 mb-1">{pack.description}</p>
                  <p className="text-[10px] text-mystic-500 uppercase tracking-wider">{pack.pricePerCreditLabel}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-display text-xl text-gold">{pack.priceLabel}</span>
                  {purchasing === pack.id && <Loader2 className="w-4 h-4 text-gold animate-spin" />}
                </div>
              </div>
            </button>
          ))}
        </div>

        <ul className="mt-5 space-y-1.5 text-xs text-mystic-400">
          <li className="flex items-center gap-2"><Check className="w-3 h-3 text-gold" /> Credits never expire</li>
          <li className="flex items-center gap-2"><Check className="w-3 h-3 text-gold" /> Use on AI readings, dream interpretation, oracle chat</li>
          <li className="flex items-center gap-2"><Check className="w-3 h-3 text-gold" /> Stack with Premium subscription</li>
        </ul>
      </div>
    </div>
  );
}
