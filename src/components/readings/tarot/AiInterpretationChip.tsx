/**
 * The AI interpretation chip on a reveal, with its price.
 *
 * generate-reading charges a free reader 50 Moonstones (ACTION_COST) for an
 * interpretation. The chip used to say only "Premium AI", and one tap spent
 * half a new reader's balance with no price shown (p8 F50, F79), where Quick
 * reading and every other AI input state the cost first (MoonstoneCostLine).
 * Now a free reader sees the price right under the chip, with their balance
 * beside it — coral when it will not cover the price, and the tap then opens
 * the earn sheet. Premium readers are not charged and see the chip alone.
 *
 * Shared by the tarot and the playing-card reveals. In the branch where the
 * reading has no AI interpretation yet:
 *
 *   <AiInterpretationChip isPremium={isPremium} loading={loadingAI} onClick={onGetAIInterpretation} />
 *
 * `ready` is for a reveal whose one chip also shows an interpretation that is
 * already here (the tarot reveal): "Show the AI reading", free, so unpriced.
 * `cost` defaults to what generate-reading charges.
 */
import { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';
import { Brain, Loader2, Moon } from 'lucide-react';
import { Chip } from '../../ui';
import { useT } from '../../../i18n/useT';
import { useAuth } from '../../../context/AuthContext';
import { moonstones } from '../../../dal';
import { ACTION_COST, onBalanceChange } from '../../../dal/moonstoneSpend';

export interface AiInterpretationChipProps {
  /** Premium readers are not charged: their chip names no price. */
  isPremium: boolean;
  /** The interpretation is being written: the chip is busy and ignores taps. */
  loading: boolean;
  onClick: () => void;
  /** The interpretation is already here: the chip shows it again, free. */
  ready?: boolean;
  /** Moonstones one interpretation costs. Default: ACTION_COST, generate-reading's price. */
  cost?: number;
}

/** The reader's balance while `userId` is set, kept current as it changes elsewhere. */
function useBalance(userId: string | undefined): number | null {
  const [balance, setBalance] = useState<number | null>(null);
  useEffect(() => {
    if (!userId) {
      setBalance(null);
      return;
    }
    let cancelled = false;
    moonstones.getBalance(userId).then((res) => {
      if (!cancelled && res.ok) setBalance(res.data);
    });
    const off = onBalanceChange((next) => {
      if (!cancelled) setBalance(next);
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [userId]);
  return balance;
}

export function AiInterpretationChip({ isPremium, loading, onClick, ready = false, cost = ACTION_COST }: AiInterpretationChipProps) {
  const { t } = useT('app');
  const { user } = useAuth();
  const priced = !isPremium && !ready;
  const balance = useBalance(priced ? user?.id : undefined);
  const short = balance !== null && balance < cost;

  return (
    <div className="flex flex-col items-end gap-1 min-w-0">
      <Chip
        variant="outline"
        size="sm"
        onClick={() => {
          if (!loading) onClick();
        }}
        disabled={loading}
        icon={loading ? <Loader2 className="animate-spin" /> : <Brain />}
        label={
          loading
            ? t('readings.revealView.generating')
            : ready
              ? t('readings.revealView.showAIReading', { defaultValue: 'Show the AI reading' })
              : t('readings.revealView.getAIInsight')
        }
      />
      {priced && (
        <p className="flex items-center justify-end gap-1 text-caption text-mystic-400 text-right">
          <Moon className="h-3 w-3 flex-none text-gold/70" aria-hidden />
          <span>
            <Trans
              t={t}
              i18nKey="readings.revealView.aiCost"
              defaults="Uses <gold>{{n}} Moonstones</gold>"
              values={{ n: cost }}
              components={{ gold: <span className="font-semibold text-gold" /> }}
            />
            {balance !== null && (
              <>
                {' · '}
                <span className={`tabular-nums ${short ? 'text-coral' : ''}`}>
                  {t('moonstones.youHave', { defaultValue: 'You have {{n}}', n: balance })}
                </span>
              </>
            )}
          </span>
        </p>
      )}
    </div>
  );
}
