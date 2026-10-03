// MoonstoneCostLine — small inline notice shown under AI-feature inputs so
// users know what an action costs before they trigger it.
//
// Hidden for premium users (their server-side bypass means they don't
// pay; showing a cost would be misleading).

import { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';
import { Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { moonstones } from '../../dal';
import { onBalanceChange } from '../../dal/moonstoneSpend';
import { ACTION_COST } from '../../dal/moonstoneSpend';
import { useT } from '../../i18n/useT';

interface Props {
  cost?: number;
  /**
   * What the Moonstones buy. `reading` (default): "Each reading uses 50
   * Moonstones". `conversation`: "A conversation uses 50 Moonstones, every
   * reply included" — the Companion's server charges once per
   * conversationId, not per message, and the line says so (R7, P7 #4).
   * `portrait`: "Painting the
   * portrait uses 150 Moonstones" — a picture is not a reading.
   */
  wording?: 'reading' | 'conversation' | 'portrait';
  className?: string;
}

export function MoonstoneCostLine({ cost = ACTION_COST, wording = 'reading', className = '' }: Props) {
  const { t } = useT('app');
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
  const gold = <span className="font-semibold text-gold" />;

  return (
    <div className={`flex items-center gap-2 text-meta text-mystic-400 ${className}`}>
      <Moon className="h-3.5 w-3.5 flex-none text-gold/70" aria-hidden />
      <span>
        {wording === 'conversation' ? (
          <Trans
            t={t}
            i18nKey="moonstones.costLinePerConversation"
            defaults="A conversation uses <gold>{{n}} Moonstones</gold>, every reply included"
            values={{ n: cost }}
            components={{ gold }}
          />
        ) : wording === 'portrait' ? (
          <Trans
            t={t}
            i18nKey="moonstones.costLinePortrait"
            defaults="Painting the portrait uses <gold>{{n}} Moonstones</gold>"
            values={{ n: cost }}
            components={{ gold }}
          />
        ) : (
          <Trans
            t={t}
            i18nKey="moonstones.costLine"
            defaults="Each reading uses <gold>{{n}} Moonstones</gold>"
            values={{ n: cost }}
            components={{ gold }}
          />
        )}
        {balance !== null && (
          <>
            {' · '}
            <span className={`tabular-nums ${insufficient ? 'text-coral' : ''}`}>
              {t('moonstones.youHave', { defaultValue: 'You have {{n}}', n: balance })}
            </span>
          </>
        )}
      </span>
    </div>
  );
}
