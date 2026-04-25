// EarnMoonstonesSheet — opened by useMoonstoneSpend when a free user
// can't afford an action (or when a premium user hits the 50/24h soft cap).
//
// Replaces MoonstoneTopUpSheet's purchase products with earning paths only.
// Direct Moonstone purchases were removed; Premium subscription is the only
// paid upgrade.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Gift, Crown, Clock } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { isNative } from '../../utils/platform';
import { rewardedAdsService, MOONSTONES_PER_AD } from '../../services/rewardedAds';
import { doDailyCheckin, hasCheckedInToday } from '../../dal/moonstones';
import { ACTION_COST } from '../../dal/moonstoneSpend';

export type EarnSheetReason = 'insufficient' | 'soft-cap' | 'browse' | null;

interface Props {
  open: boolean;
  onClose: () => void;
  reason: EarnSheetReason;
  balance: number | null;
  resetAt: string | null;
  onBalanceChange?: (newBalance: number) => void;
}

function formatTimeUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'now';
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function EarnMoonstonesSheet({ open, onClose, reason, balance, resetAt, onBalanceChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [adBusy, setAdBusy] = useState(false);
  const [checkinBusy, setCheckinBusy] = useState(false);
  const [checkinDone, setCheckinDone] = useState<boolean | null>(null);
  const [adAvailable, setAdAvailable] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    setFeedback(null);
    hasCheckedInToday(user.id).then((res) => {
      if (res.ok) setCheckinDone(res.data);
    });
    if (isNative()) {
      setAdAvailable(rewardedAdsService.isReady());
    }
  }, [open, user]);

  async function handleWatchAd() {
    if (!isNative()) return;
    setAdBusy(true);
    setFeedback(null);
    try {
      const outcome = await rewardedAdsService.showRewardedAd({
        onCredited: (newBalance) => onBalanceChange?.(newBalance),
      });
      if (outcome === 'credited') {
        setFeedback(`+${MOONSTONES_PER_AD} moonstones earned!`);
        setTimeout(onClose, 1200);
      } else if (outcome === 'not-ready') {
        setFeedback('Ad not ready — try again in a moment.');
      } else if (outcome === 'persist-failed') {
        setFeedback('Could not save reward — check your connection.');
      } else if (outcome === 'dismissed') {
        setFeedback('Ad cancelled. Watch the full ad to earn moonstones.');
      } else {
        setFeedback('Ads not available on this device.');
      }
    } finally {
      setAdBusy(false);
    }
  }

  async function handleCheckin() {
    setCheckinBusy(true);
    setFeedback(null);
    try {
      const res = await doDailyCheckin();
      if (res.ok) {
        setFeedback(`+${res.data.amountAwarded} moonstones (day ${res.data.streakDay})`);
        setCheckinDone(true);
        setTimeout(onClose, 1200);
      } else {
        setFeedback('Check-in failed. Try again later.');
      }
    } finally {
      setCheckinBusy(false);
    }
  }

  function handleGetPremium() {
    onClose();
    navigate('/profile?upgrade=1');
  }

  const isSoftCap = reason === 'soft-cap';
  const isBrowse = reason === 'browse';
  const title = isSoftCap ? 'Daily limit reached' : 'Earn moonstones';

  return (
    <Sheet open={open} onClose={onClose} title={title} variant="glow">
      <div className="space-y-5 px-1 pb-2">
        {/* Header line */}
        {isSoftCap ? (
          <div className="flex items-start gap-3 rounded-lg bg-mystic-800/50 p-4">
            <Clock className="mt-0.5 h-5 w-5 flex-none text-gold" />
            <div className="text-sm leading-relaxed text-mystic-100">
              You've performed many readings recently. Come back in{' '}
              <span className="font-semibold text-gold">
                {resetAt ? formatTimeUntil(resetAt) : 'a few hours'}
              </span>{' '}
              for fresh insight. Your premium access remains active.
            </div>
          </div>
        ) : isBrowse ? (
          <div className="flex items-start gap-3 rounded-lg bg-mystic-800/50 p-4">
            <Sparkles className="mt-0.5 h-5 w-5 flex-none text-gold" />
            <div className="text-sm leading-relaxed text-mystic-100">
              Each AI reading costs <span className="font-semibold text-gold">{ACTION_COST} moonstones</span>.
              {balance !== null && (
                <> You have <span className="font-semibold">{balance}</span>.</>
              )}{' '}
              Earn more below.
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg bg-mystic-800/50 p-4">
            <Sparkles className="mt-0.5 h-5 w-5 flex-none text-gold" />
            <div className="text-sm leading-relaxed text-mystic-100">
              You need <span className="font-semibold text-gold">{ACTION_COST} moonstones</span> for this reading.
              {balance !== null && (
                <> Current balance: <span className="font-semibold">{balance}</span>.</>
              )}
            </div>
          </div>
        )}

        {feedback && (
          <div className="rounded-lg bg-emerald-900/30 px-4 py-2 text-sm text-emerald-200">
            {feedback}
          </div>
        )}

        {!isSoftCap && (
          <div className="space-y-3">
            {/* Watch ad — native only */}
            {isNative() && (
              <button
                onClick={handleWatchAd}
                disabled={adBusy || !adAvailable}
                className="flex w-full items-center justify-between rounded-xl border border-gold/30 bg-mystic-800/60 p-4 text-left transition hover:border-gold/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <Gift className="h-5 w-5 text-gold" />
                  <div>
                    <div className="text-sm font-medium text-mystic-50">Watch a short video</div>
                    <div className="text-xs text-mystic-300">
                      {adAvailable ? `Earn +${MOONSTONES_PER_AD} moonstones` : 'No ad ready right now'}
                    </div>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gold">+{MOONSTONES_PER_AD}</span>
              </button>
            )}

            {/* Daily check-in */}
            {checkinDone === false && (
              <button
                onClick={handleCheckin}
                disabled={checkinBusy}
                className="flex w-full items-center justify-between rounded-xl border border-mystic-700/50 bg-mystic-800/60 p-4 text-left transition hover:border-gold/40 disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-mystic-200" />
                  <div>
                    <div className="text-sm font-medium text-mystic-50">Daily check-in</div>
                    <div className="text-xs text-mystic-300">5–50 moonstones based on streak</div>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gold">+5 to +50</span>
              </button>
            )}

            {checkinDone && (
              <div className="rounded-xl border border-mystic-700/30 bg-mystic-900/30 p-4 text-center text-xs text-mystic-400">
                Daily check-in already claimed today.
              </div>
            )}
          </div>
        )}

        {/* Premium upsell — always shown */}
        <button
          onClick={handleGetPremium}
          className="flex w-full items-center justify-between rounded-xl border border-gold/40 bg-gradient-to-r from-gold/10 to-mystic-800/60 p-4 text-left transition hover:border-gold/70"
        >
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-gold" />
            <div>
              <div className="text-sm font-medium text-gold">Get premium</div>
              <div className="text-xs text-mystic-200">Unlimited readings, no ads, all features</div>
            </div>
          </div>
          <span className="text-sm font-semibold text-gold">→</span>
        </button>

        <div className="pt-1">
          <Button onClick={onClose} variant="ghost" className="w-full">
            Maybe later
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
