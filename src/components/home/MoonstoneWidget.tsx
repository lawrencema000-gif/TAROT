import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Gift, Plus } from 'lucide-react';
import { Card, Button, toast } from '../ui';
import { useT } from '../../i18n/useT';
import { useAuth } from '../../context/AuthContext';
import { useFeatureFlag } from '../../context/FeatureFlagContext';
import { moonstones } from '../../dal';
import { MoonstoneTopUpSheet } from '../moonstones/MoonstoneTopUpSheet';

/**
 * Compact Home-screen widget: shows Moonstone balance + claim button
 * when the daily check-in is available. One tap to claim.
 */
export function MoonstoneWidget() {
  const { t } = useT('app');
  const { user } = useAuth();
  const topUpEnabled = useFeatureFlag('moonstone-topup');
  const [balance, setBalance] = useState<number>(0);
  const [canClaim, setCanClaim] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const [balRes, checkedRes] = await Promise.all([
      moonstones.getBalance(user.id),
      moonstones.hasCheckedInToday(user.id),
    ]);
    if (balRes.ok) setBalance(balRes.data);
    if (checkedRes.ok) setCanClaim(!checkedRes.data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const claim = async () => {
    setClaiming(true);
    const res = await moonstones.doDailyCheckin();
    if (res.ok) {
      toast(
        t('moonstones.claimed', {
          defaultValue: '+{{n}} Moonstones · Day {{d}} streak',
          n: res.data.amountAwarded,
          d: res.data.streakDay,
        }),
        'success',
      );
      setBalance((b) => b + res.data.amountAwarded);
      setCanClaim(false);
    } else {
      toast(t('moonstones.claimFailed', { defaultValue: 'Could not claim today\'s reward' }), 'error');
    }
    setClaiming(false);
  };

  if (!user || loading) return null;

  return (
    <>
      <Card padding="md" className="bg-gradient-to-br from-gold/10 via-mystic-900 to-mystic-900 border-gold/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-xs text-mystic-500">
                {t('moonstones.balanceLabel', { defaultValue: 'Moonstones' })}
              </p>
              <p className="font-display text-xl text-gold">{balance}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canClaim ? (
              <Button variant="primary" onClick={claim} disabled={claiming} className="text-sm min-h-[40px]">
                <Gift className="w-4 h-4 mr-1" />
                {claiming
                  ? t('moonstones.claiming', { defaultValue: 'Claiming...' })
                  : t('moonstones.claimButton', { defaultValue: 'Claim daily' })}
              </Button>
            ) : (
              <p className="text-xs text-mystic-500 italic">
                {t('moonstones.alreadyClaimed', { defaultValue: 'Come back tomorrow' })}
              </p>
            )}
            {topUpEnabled && (
              <button
                onClick={() => setShowTopUp(true)}
                aria-label={t('moonstones.topUp', { defaultValue: 'Top up' }) as string}
                className="w-9 h-9 rounded-full bg-mystic-800 hover:bg-mystic-700 flex items-center justify-center text-gold transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </Card>

      <MoonstoneTopUpSheet
        open={showTopUp}
        onClose={() => setShowTopUp(false)}
        onCredited={refresh}
      />
    </>
  );
}
