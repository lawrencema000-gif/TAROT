// MoonstoneCostLine — small inline notice shown under AI-feature inputs so
// users know what an action costs before they trigger it.
//
// Hidden for premium users (their server-side bypass means they don't
// pay; showing a cost would be misleading).

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { moonstones } from '../../dal';
import { onBalanceChange } from '../../dal/moonstoneSpend';
import { ACTION_COST } from '../../dal/moonstoneSpend';

interface Props {
  cost?: number;
  className?: string;
}

export function MoonstoneCostLine({ cost = ACTION_COST, className = '' }: Props) {
  const { user, profile } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id || profile?.isPremium) return;
    let cancelled = false;
    moonstones.getBalance(user.id).then((res) => {
      if (!cancelled && res.ok) setBalance(res.data);
    });
    const off = onBalanceChange((newBalance) => {
      if (!cancelled) setBalance(newBalance);
    });
    return () => { cancelled = true; off(); };
  }, [user?.id, profile?.isPremium]);

  // Premium users don't pay — hide the cost line entirely.
  if (profile?.isPremium) return null;

  const insufficient = balance !== null && balance < cost;

  return (
    <div className={`flex items-center gap-2 text-xs text-mystic-400 ${className}`}>
      <Sparkles className="h-3.5 w-3.5 flex-none text-gold/70" />
      <span>
        Each reading uses <span className="font-semibold text-gold">{cost} moonstones</span>
        {balance !== null && (
          <>
            {' · '}
            <span className={insufficient ? 'text-pink-400' : ''}>
              You have {balance}
            </span>
          </>
        )}
      </span>
    </div>
  );
}
