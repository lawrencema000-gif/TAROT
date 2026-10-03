// EarnMoonstonesSheet — opened by useMoonstoneSpend when a free user
// can't afford an action (or when a premium user hits the 50/24h soft cap).
//
// Replaces MoonstoneTopUpSheet's purchase products with earning paths only.
// Direct Moonstone purchases were removed; Premium subscription is the only
// paid upgrade — and it opens here, in place: "Get Premium" used to navigate
// to /profile?upgrade=1, which dropped the user on Profile mid-task and left
// "Not now" with nowhere sensible to return to (R7).

import { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';
import { Moon, CalendarCheck, Gift, Crown, Clock } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { ListRow, ListRowGroup } from '../ui/ListRow';
import { useAuth } from '../../context/AuthContext';
import { isNative } from '../../utils/platform';
import { rewardedAdsService, MOONSTONES_PER_AD } from '../../services/rewardedAds';
import { doDailyCheckin, hasCheckedInToday } from '../../dal/moonstones';
import { ACTION_COST } from '../../dal/moonstoneSpend';
import { useT } from '../../i18n/useT';
import { PaywallSheet } from '../premium/PaywallSheet';

export type EarnSheetReason = 'insufficient' | 'soft-cap' | 'browse' | null;

interface Props {
  open: boolean;
  onClose: () => void;
  reason: EarnSheetReason;
  balance: number | null;
  resetAt: string | null;
  /**
   * What the blocked action costs. Defaults to the standard reading price;
   * useMoonstoneSpend passes its own `cost` so a 150-Moonstone portrait does
   * not read "You need 50 Moonstones".
   */
  cost?: number;
  onBalanceChange?: (newBalance: number) => void;
}

// The daily check-in's reward ladder, as the server pays it: 100 on the very
// first check-in (the welcome bonus), then 5 a day rising with the streak to 50.
const CHECKIN_WELCOME = 100;
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

export function EarnMoonstonesSheet({ open, onClose, reason, balance, resetAt, cost = ACTION_COST, onBalanceChange }: Props) {
  const { t } = useT('app');
  const tr: Translate = (key, options) => t(key, options) as string;
  const { user, profile } = useAuth();
  const [adBusy, setAdBusy] = useState(false);
  const [checkinBusy, setCheckinBusy] = useState(false);
  const [checkinDone, setCheckinDone] = useState<boolean | null>(null);
  const [adAvailable, setAdAvailable] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const native = isNative();

  useEffect(() => {
    if (!open || !user) return;
    setFeedback(null);
    hasCheckedInToday(user.id).then((res) => {
      if (res.ok) setCheckinDone(res.data);
    });
    if (native) {
      setAdAvailable(rewardedAdsService.isReady());
    }
  }, [open, user, native]);

  async function handleWatchAd() {
    if (!native) return;
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
        // Tell the hook the new balance: its header line updates, and when
        // the check-in covers the action it closes the sheet so the user can
        // retry. Otherwise the sheet lingers so the line above can be read.
        if (res.data.amountAwarded > 0) onBalanceChange?.((balance ?? 0) + res.data.amountAwarded);
        setTimeout(onClose, 1600);
      } else {
        setFeedback(tr('moonstones.earnSheet.checkinFailed', { defaultValue: 'Couldn’t check in. Check your connection and try again.' }));
      }
    } finally {
      setCheckinBusy(false);
    }
  }

  // The paywall stacks over this sheet. When it closes on a successful
  // purchase the gate no longer applies, so the earn sheet goes with it.
  function handlePaywallClose() {
    setShowPaywall(false);
    if (profile?.isPremium) onClose();
  }

  const isSoftCap = reason === 'soft-cap';
  const isBrowse = reason === 'browse';
  const title = isSoftCap
    ? tr('moonstones.earnSheet.titleSoftCap', { defaultValue: 'Daily limit reached' })
    : tr('moonstones.earnSheet.title', { defaultValue: 'Earn Moonstones' });
  const gold = <span className="font-semibold text-gold" />;
  const strong = <span className="font-semibold" />;

  // What the user can actually do from here. On the web there is no ad to
  // watch, so "Earn more below" promised a row that was never there (R6
  // A15); the line now names the one path that exists today.
  const nextStep = native
    ? tr('moonstones.earnSheet.earnBelow', { defaultValue: 'Earn more below.' })
    : checkinDone
      ? tr('moonstones.earnSheet.nextStepTomorrow', { defaultValue: 'Come back tomorrow for your check-in, or go Premium.' })
      : tr('moonstones.earnSheet.nextStepCheckin', { defaultValue: 'Check in below for today’s Moonstones, or go Premium.' });

  return (
    <>
      <Sheet open={open} onClose={onClose} title={title} variant="glow">
        <div className="space-y-5 px-1 pb-6">
          {/* Header line */}
          {isSoftCap ? (
            <div className="flex items-start gap-3 rounded-control bg-mystic-800/50 p-4">
              <Clock className="mt-0.5 h-5 w-5 flex-none text-gold" aria-hidden />
              <div className="text-ui leading-relaxed text-mystic-100">
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
          ) : (
            <div className="flex items-start gap-3 rounded-control bg-mystic-800/50 p-4">
              <Moon className="mt-0.5 h-5 w-5 flex-none text-gold" aria-hidden />
              <div className="text-ui leading-relaxed text-mystic-100">
                {isBrowse ? (
                  <Trans
                    t={t}
                    i18nKey="moonstones.earnSheet.browseBody"
                    defaults="Each AI reading costs <gold>{{cost}} Moonstones</gold>."
                    values={{ cost }}
                    components={{ gold }}
                  />
                ) : (
                  <Trans
                    t={t}
                    i18nKey="moonstones.earnSheet.insufficientBody"
                    defaults="You need <gold>{{cost}} Moonstones</gold> to continue."
                    values={{ cost }}
                    components={{ gold }}
                  />
                )}
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
                {nextStep}
              </div>
            </div>
          )}

          {feedback && (
            <div className="rounded-control bg-teal/10 border border-teal/25 px-4 py-2 text-ui text-teal" role="status">
              {feedback}
            </div>
          )}

          {!isSoftCap && (
            <ListRowGroup>
              {/* Watch ad — native only */}
              {native && (
                <ListRow
                  icon={<Gift />}
                  tone="gold"
                  label={tr('moonstones.earnSheet.watchAdTitle', { defaultValue: 'Watch a short video' })}
                  meta={
                    adAvailable
                      ? tr('moonstones.earnSheet.watchAdSub', { defaultValue: 'Earn {{n}} Moonstones', n: MOONSTONES_PER_AD })
                      : tr('moonstones.earnSheet.watchAdNotReady', { defaultValue: 'No ad is ready right now' })
                  }
                  value={<span className="text-gold font-semibold tabular-nums">+{MOONSTONES_PER_AD}</span>}
                  onClick={handleWatchAd}
                  disabled={adBusy || !adAvailable}
                />
              )}

              {/* Daily check-in */}
              {checkinDone === false && (
                <ListRow
                  icon={<CalendarCheck />}
                  tone="teal"
                  label={tr('moonstones.earnSheet.checkinTitle', { defaultValue: 'Daily check-in' })}
                  meta={tr('moonstones.earnSheet.checkinSub', {
                    defaultValue: 'First check-in: {{welcome}} welcome Moonstones, then {{min}}–{{max}} a day',
                    welcome: CHECKIN_WELCOME,
                    min: CHECKIN_MIN,
                    max: CHECKIN_MAX,
                  })}
                  onClick={handleCheckin}
                  disabled={checkinBusy}
                />
              )}

              {checkinDone && (
                <ListRow
                  icon={<CalendarCheck />}
                  label={tr('moonstones.earnSheet.checkinClaimed', { defaultValue: 'You’ve already checked in today' })}
                  meta={tr('moonstones.earnSheet.checkinTomorrow', { defaultValue: 'Your next check-in opens tomorrow' })}
                />
              )}

              {/* Premium — opens the paywall over this sheet, not another screen */}
              <ListRow
                icon={<Crown />}
                tone="violet"
                label={tr('moonstones.earnSheet.premiumTitle', { defaultValue: 'Get Premium' })}
                meta={tr('moonstones.earnSheet.premiumSub', { defaultValue: 'No Moonstones to spend, no ads, every spread and chart' })}
                onClick={() => setShowPaywall(true)}
              />
            </ListRowGroup>
          )}

          {/* The soft cap is mostly met by Premium members, who need no
              upsell to the plan they already hold. */}
          {isSoftCap && !profile?.isPremium && (
            <ListRowGroup>
              <ListRow
                icon={<Crown />}
                tone="violet"
                label={tr('moonstones.earnSheet.premiumTitle', { defaultValue: 'Get Premium' })}
                meta={tr('moonstones.earnSheet.premiumSub', { defaultValue: 'No Moonstones to spend, no ads, every spread and chart' })}
                onClick={() => setShowPaywall(true)}
              />
            </ListRowGroup>
          )}

          <Button onClick={onClose} variant="ghost" className="w-full">
            {tr('moonstones.earnSheet.notNow', { defaultValue: 'Not now' })}
          </Button>
        </div>
      </Sheet>
      <PaywallSheet open={showPaywall} onClose={handlePaywallClose} />
    </>
  );
}
