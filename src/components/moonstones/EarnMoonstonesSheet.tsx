// EarnMoonstonesSheet — opened by useMoonstoneSpend when a free user
// can't afford an action (or when a premium user hits the 50/24h soft cap).
//
// Replaces MoonstoneTopUpSheet's purchase products with earning paths only.
// Direct Moonstone purchases were removed; Premium subscription is the only
// paid upgrade.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trans } from 'react-i18next';
import { Moon, CalendarCheck, Gift, Crown, Clock } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { isNative } from '../../utils/platform';
import { rewardedAdsService, MOONSTONES_PER_AD } from '../../services/rewardedAds';
import { doDailyCheckin, hasCheckedInToday } from '../../dal/moonstones';
import { ACTION_COST } from '../../dal/moonstoneSpend';
import { useT } from '../../i18n/useT';

export type EarnSheetReason = 'insufficient' | 'soft-cap' | 'browse' | null;

interface Props {
  open: boolean;
  onClose: () => void;
  reason: EarnSheetReason;
  balance: number | null;
  resetAt: string | null;
  onBalanceChange?: (newBalance: number) => void;
}

// The daily check-in's reward range, as the server pays it (5 on day one,
// rising with the streak to 50).
const CHECKIN_MIN = 5;
const CHECKIN_MAX = 50;

type Translate = (key: string, options?: Record<string, unknown>) => string;

function formatTimeUntil(iso: string, t: Translate): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return t('moonstones.earnSheet.now', { defaultValue: 'now' });
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return t('moonstones.earnSheet.timeHM', { defaultValue: '{{h}}h {{m}}m', h: hours, m: minutes });
  return t('moonstones.earnSheet.timeM', { defaultValue: '{{m}}m', m: minutes });
}

export function EarnMoonstonesSheet({ open, onClose, reason, balance, resetAt, onBalanceChange }: Props) {
  const { t } = useT('app');
  const tr: Translate = (key, options) => t(key, options) as string;
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
        setFeedback(tr('moonstones.earnSheet.adCredited', { defaultValue: '{{n}} Moonstones added.', n: MOONSTONES_PER_AD }));
        setTimeout(onClose, 1200);
      } else if (outcome === 'not-ready') {
        setFeedback(tr('moonstones.earnSheet.adNotReady', { defaultValue: 'No ad is ready yet — try again in a moment.' }));
      } else if (outcome === 'persist-failed') {
        setFeedback(
          tr('moonstones.earnSheet.adPersistFailed', {
            defaultValue: 'You watched the ad, but the Moonstones couldn’t be saved. Check your connection and try again.',
          }),
        );
      } else if (outcome === 'dismissed') {
        setFeedback(tr('moonstones.earnSheet.adDismissed', { defaultValue: 'Ad closed early — watch it to the end to earn Moonstones.' }));
      } else {
        setFeedback(tr('moonstones.earnSheet.adsUnavailable', { defaultValue: 'Ads aren’t available on this device.' }));
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
        setFeedback(
          tr('moonstones.earnSheet.checkinDone', {
            defaultValue: '{{n}} Moonstones added — day {{day}} of your streak.',
            n: res.data.amountAwarded,
            day: res.data.streakDay,
          }),
        );
        setCheckinDone(true);
        setTimeout(onClose, 1200);
      } else {
        setFeedback(tr('moonstones.earnSheet.checkinFailed', { defaultValue: 'Couldn’t check in. Check your connection and try again.' }));
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
  const title = isSoftCap
    ? tr('moonstones.earnSheet.titleSoftCap', { defaultValue: 'Daily limit reached' })
    : tr('moonstones.earnSheet.title', { defaultValue: 'Earn Moonstones' });
  const gold = <span className="font-semibold text-gold" />;
  const strong = <span className="font-semibold" />;

  return (
    <Sheet open={open} onClose={onClose} title={title} variant="glow">
      <div className="space-y-5 px-1 pb-24">
        {/* Header line */}
        {isSoftCap ? (
          <div className="flex items-start gap-3 rounded-lg bg-mystic-800/50 p-4">
            <Clock className="mt-0.5 h-5 w-5 flex-none text-gold" />
            <div className="text-sm leading-relaxed text-mystic-100">
              <Trans
                t={t}
                i18nKey="moonstones.earnSheet.softCapBody"
                defaults="You’ve done 50 readings in the last 24 hours — the limit that keeps AI quality high for everyone. Your next reading opens in <gold>{{when}}</gold>, and slots free up one at a time as older readings age out. Premium stays on throughout."
                values={{
                  when: resetAt
                    ? formatTimeUntil(resetAt, tr)
                    : tr('moonstones.earnSheet.softCapSoon', { defaultValue: 'a few hours' }),
                }}
                components={{ gold }}
              />
            </div>
          </div>
        ) : isBrowse ? (
          <div className="flex items-start gap-3 rounded-lg bg-mystic-800/50 p-4">
            <Moon className="mt-0.5 h-5 w-5 flex-none text-gold" />
            <div className="text-sm leading-relaxed text-mystic-100">
              <Trans
                t={t}
                i18nKey="moonstones.earnSheet.browseBody"
                defaults="Each AI reading costs <gold>{{cost}} Moonstones</gold>."
                values={{ cost: ACTION_COST }}
                components={{ gold }}
              />
              {balance !== null && (
                <>
                  {' '}
                  <Trans
                    t={t}
                    i18nKey="moonstones.earnSheet.youHave"
                    defaults="You have <strong>{{n}}</strong>."
                    values={{ n: balance }}
                    components={{ strong }}
                  />
                </>
              )}{' '}
              {tr('moonstones.earnSheet.earnBelow', { defaultValue: 'Earn more below.' })}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg bg-mystic-800/50 p-4">
            <Moon className="mt-0.5 h-5 w-5 flex-none text-gold" />
            <div className="text-sm leading-relaxed text-mystic-100">
              <Trans
                t={t}
                i18nKey="moonstones.earnSheet.insufficientBody"
                defaults="You need <gold>{{cost}} Moonstones</gold> for this reading."
                values={{ cost: ACTION_COST }}
                components={{ gold }}
              />
              {balance !== null && (
                <>
                  {' '}
                  <Trans
                    t={t}
                    i18nKey="moonstones.earnSheet.youHave"
                    defaults="You have <strong>{{n}}</strong>."
                    values={{ n: balance }}
                    components={{ strong }}
                  />
                </>
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
                    <div className="text-sm font-medium text-mystic-50">
                      {tr('moonstones.earnSheet.watchAdTitle', { defaultValue: 'Watch a short video' })}
                    </div>
                    <div className="text-xs text-mystic-300">
                      {adAvailable
                        ? tr('moonstones.earnSheet.watchAdSub', { defaultValue: 'Earn {{n}} Moonstones', n: MOONSTONES_PER_AD })
                        : tr('moonstones.earnSheet.watchAdNotReady', { defaultValue: 'No ad is ready right now' })}
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
                  <CalendarCheck className="h-5 w-5 text-mystic-200" />
                  <div>
                    <div className="text-sm font-medium text-mystic-50">
                      {tr('moonstones.earnSheet.checkinTitle', { defaultValue: 'Daily check-in' })}
                    </div>
                    <div className="text-xs text-mystic-300">
                      {tr('moonstones.earnSheet.checkinSub', {
                        defaultValue: '{{min}} to {{max}} Moonstones, rising with your streak',
                        min: CHECKIN_MIN,
                        max: CHECKIN_MAX,
                      })}
                    </div>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gold">
                  {tr('moonstones.earnSheet.checkinRange', { defaultValue: '+{{min}} to +{{max}}', min: CHECKIN_MIN, max: CHECKIN_MAX })}
                </span>
              </button>
            )}

            {checkinDone && (
              <div className="rounded-xl border border-mystic-700/30 bg-mystic-900/30 p-4 text-center text-xs text-mystic-400">
                {tr('moonstones.earnSheet.checkinClaimed', { defaultValue: 'You’ve already checked in today.' })}
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
              <div className="text-sm font-medium text-gold">
                {tr('moonstones.earnSheet.premiumTitle', { defaultValue: 'Get Premium' })}
              </div>
              <div className="text-xs text-mystic-200">
                {tr('moonstones.earnSheet.premiumSub', { defaultValue: 'No Moonstones to spend, no ads, every spread and chart' })}
              </div>
            </div>
          </div>
          <span className="text-sm font-semibold text-gold">→</span>
        </button>

        <div className="pt-1">
          <Button onClick={onClose} variant="ghost" className="w-full">
            {tr('moonstones.earnSheet.notNow', { defaultValue: 'Not now' })}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
