import { useState, useEffect, useCallback } from 'react';
import { Moon, Gift, Plus } from 'lucide-react';
import { Card, Button, toast } from '../ui';
import { useT } from '../../i18n/useT';
import { getLocale } from '../../i18n/config';
import { useAuth } from '../../context/AuthContext';
import { moonstones } from '../../dal';
import { onBalanceChange } from '../../dal/moonstoneSpend';
import { EarnMoonstonesSheet } from '../moonstones/EarnMoonstonesSheet';
import { checkinOpening, nextClaimLabel } from './checkinOpening';

/**
 * Compact Home-screen widget: shows Moonstone balance + claim button
 * when the daily check-in is available. One tap to claim.
 *
 * Premium users see ∞ instead of a numeric balance — they have
 * unlimited AI access (with a silent server-side soft cap).
 *
 * The "+" button opens the Earn-Moonstones sheet (watch ad / check-in /
 * upsell to premium). Direct Moonstone purchasing was removed.
 *
 * Layout: the balance column holds the label, the number and the day's
 * check-in — the claim button, or when the next claim opens. The claim used
 * to sit in the row beside the label and the "+", and at 390px in Japanese
 * the three squeezed each other until "ムーンストーン" and "今日の分を受け取る"
 * broke mid-word (p8 F71); in the column it has the card's width to itself
 * in every language. The number is set in Inter with lining, tabular
 * figures: the display serif's old-style "100" read as "IOO" (F59/F80).
 */
export function MoonstoneWidget() {
  const { t } = useT('app');
  const { user, profile } = useAuth();
  const isPremium = !!profile?.isPremium;
  const [balance, setBalance] = useState<number>(0);
  const [canClaim, setCanClaim] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [showEarn, setShowEarn] = useState(false);
  // Re-read when the clock moves on, so the "next claim" line is computed
  // from the time it is shown at, not the time the widget mounted.
  const [now, setNow] = useState(() => new Date());

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const [balRes, checkedRes] = await Promise.all([
      moonstones.getBalance(user.id),
      moonstones.hasCheckedInToday(user.id),
    ]);
    if (balRes.ok) setBalance(balRes.data);
    if (checkedRes.ok) setCanClaim(!checkedRes.data);
    setNow(new Date());
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  // Live balance updates: spend / refund / ad credit / daily check-in all
  // broadcast a `moonstone:balance` event with the new balance. Subscribe
  // so the widget never goes stale until re-mount.
  useEffect(() => {
    return onBalanceChange((newBalance) => setBalance(newBalance));
  }, []);

  // Claimed: offer the claim again when the next one opens (UTC midnight),
  // without waiting for a remount — Home can sit open across it.
  useEffect(() => {
    if (loading || canClaim || isPremium) return;
    const wait = Math.max(0, checkinOpening(now, getLocale()).at.getTime() - Date.now()) + 1500;
    const timer = window.setTimeout(() => { void refresh(); }, wait);
    return () => window.clearTimeout(timer);
  }, [loading, canClaim, isPremium, now, refresh]);

  const claim = async () => {
    setClaiming(true);
    const res = await moonstones.doDailyCheckin();
    if (res.ok && (res.data.alreadyCheckedIn || res.data.amountAwarded <= 0)) {
      // Claimed earlier today (another tab or device, or a widget left open
      // since before the claim): nothing was added, so never "+0 Moonstones".
      toast(t('moonstones.alreadyClaimedToday', { defaultValue: 'Already claimed today' }), 'info');
      setCanClaim(false);
      // The claim credited the balance wherever it happened; show that here.
      void refresh();
    } else if (res.ok) {
      toast(
        t('moonstones.claimed', {
          defaultValue: '+{{n}} Moonstones · Day {{d}} streak',
          n: res.data.amountAwarded,
          d: res.data.streakDay,
        }),
        'success',
      );
      // doDailyCheckin has already broadcast the new balance, which the
      // listener above applied; adding the award on top counted it twice.
      // Re-read instead, in case that broadcast's balance read failed.
      setCanClaim(false);
      void refresh();
    } else {
      toast(t('moonstones.claimFailed', { defaultValue: 'Could not claim today\'s reward' }), 'error');
    }
    setClaiming(false);
  };

  if (!user || loading) return null;

  return (
    <>
      <Card padding="md">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-control bg-gold/10 text-gold flex items-center justify-center">
            <Moon className="w-5 h-5" aria-hidden />
          </div>
          {/* auto-phrase: where a narrow phone still has to wrap a line here,
              Japanese breaks between phrases, never inside a word. */}
          <div className="min-w-0 flex-1 [word-break:auto-phrase] [overflow-wrap:anywhere]">
            <p className="text-meta text-mystic-400">
              {isPremium
                ? t('moonstones.premiumLabel', { defaultValue: 'Premium · all readings unlocked' })
                : t('moonstones.balanceLabel', { defaultValue: 'Moonstones' })}
            </p>
            <p className="font-body text-title font-semibold tabular-nums lining-nums text-gold">
              {isPremium ? '∞' : balance}
            </p>
            {!isPremium && canClaim && (
              <Button variant="primary" size="sm" onClick={claim} disabled={claiming} className="mt-3 max-w-full">
                <Gift className="w-4 h-4 shrink-0" aria-hidden />
                {claiming
                  ? t('moonstones.claiming', { defaultValue: 'Claiming...' })
                  : t('moonstones.claimButton', { defaultValue: 'Claim daily' })}
              </Button>
            )}
            {!isPremium && !canClaim && (
              <p className="text-meta text-mystic-500 mt-1">
                {nextClaimLabel(t, now, getLocale())}
              </p>
            )}
          </div>

          {!isPremium && (
            <button
              type="button"
              onClick={() => setShowEarn(true)}
              aria-label={t('moonstones.earn', { defaultValue: 'Earn moonstones' }) as string}
              className="w-11 h-11 shrink-0 -my-0.5 rounded-full bg-mystic-800 hover:bg-mystic-700 flex items-center justify-center text-gold transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden />
            </button>
          )}
        </div>
      </Card>

      <EarnMoonstonesSheet
        open={showEarn}
        onClose={() => { setShowEarn(false); refresh(); }}
        reason="browse"
        balance={balance}
        resetAt={null}
        onBalanceChange={(newBalance) => setBalance(newBalance)}
      />
    </>
  );
}
