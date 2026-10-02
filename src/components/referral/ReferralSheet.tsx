import { useState, useEffect, useCallback } from 'react';
import { Gift, Copy, Share2, Check, RefreshCw } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button, EyebrowLabel, Input, toast } from '../ui';
import { useT } from '../../i18n/useT';
import { useAuth } from '../../context/AuthContext';
import { referrals } from '../../dal';

interface ReferralSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Share-an-invite + redeem-a-code UI. Two views on one screen — your own
 * code up top (with copy + share sheet), redemption input below for new
 * users. We hide the redeem input for accounts older than 30 days since
 * the server will reject anyway.
 *
 * When the code cannot be issued, the sheet says so and shows the DAL's
 * error (R6 A2 found an em-dash with two disabled buttons and nothing to
 * tell the user, or support, what had gone wrong).
 */
export function ReferralSheet({ open, onClose }: ReferralSheetProps) {
  const { t } = useT('app');
  const { user } = useAuth();
  const [myCode, setMyCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const [invitesCount, setInvitesCount] = useState<number | null>(null);

  const accountAgeDays = user?.created_at
    ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000)
    : 0;
  const canRedeem = !redeemed && accountAgeDays <= 30;

  const loadCode = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    const res = await referrals.getOrIssueCode();
    if (res.ok) {
      setMyCode(res.data);
    } else {
      setMyCode(null);
      setLoadError(res.error);
    }
    setLoading(false);
  }, [user]);

  const loadInvites = useCallback(async () => {
    if (!user) return;
    const res = await referrals.fetchInvites();
    if (res.ok) {
      const mine = res.data.filter((r) => r.referrerId === user.id);
      setInvitesCount(mine.length);
      // If I was the invitee of a row, flag already-redeemed
      if (res.data.some((r) => r.inviteeId === user.id)) setRedeemed(true);
    }
  }, [user]);

  useEffect(() => {
    if (open) {
      loadCode();
      loadInvites();
    }
  }, [open, loadCode, loadInvites]);

  const inviteUrl = myCode ? `https://tarotlife.app/invite/${myCode}` : '';

  const handleCopy = async () => {
    if (!myCode) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast(t('referral.copied', { defaultValue: 'Link copied' }), 'success');
    } catch {
      toast(t('referral.copyFailed', { defaultValue: 'Couldn’t copy the code — select it and copy it manually.' }), 'error');
    }
  };

  const handleShare = async () => {
    if (!myCode) return;
    const text = t('referral.shareText', {
      defaultValue:
        'I’ve been using Arcana for tarot + astrology — use my code for 100 free Moonstones: {{url}}',
      url: inviteUrl,
    });
    if (navigator.share) {
      try {
        await navigator.share({ text, url: inviteUrl });
      } catch {
        await handleCopy();
      }
    } else {
      await handleCopy();
    }
  };

  const handleRedeem = async () => {
    if (!inviteInput.trim()) return;
    setRedeeming(true);
    const res = await referrals.redeemCode(inviteInput);
    setRedeeming(false);
    if (res.ok) {
      setRedeemed(true);
      setInviteInput('');
      toast(
        t('referral.redeemSuccess', {
          defaultValue: '+{{n}} Moonstones — welcome.',
          n: res.data.rewardAmount,
        }),
        'success',
      );
    } else {
      const reason = res.error;
      const msgKey =
        reason === 'already-redeemed'
          ? 'referral.errors.alreadyRedeemed'
          : reason === 'not-found'
            ? 'referral.errors.notFound'
            : reason === 'self-redeem'
              ? 'referral.errors.selfRedeem'
              : reason === 'account-too-old'
                ? 'referral.errors.accountTooOld'
                : 'referral.errors.generic';
      const defaultMsg =
        reason === 'already-redeemed'
          ? 'You’ve already redeemed a code.'
          : reason === 'not-found'
            ? 'Code not found.'
            : reason === 'self-redeem'
              ? 'You can’t use your own code.'
              : reason === 'account-too-old'
                ? 'Referral codes only work in the first 30 days.'
                : 'Couldn’t redeem that code — check it and try again.';
      toast(t(msgKey, { defaultValue: defaultMsg }), 'error');
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('referral.title', { defaultValue: 'Invite & earn' })}>
      <div className="space-y-5 pb-4">
        <div className="text-center pt-2">
          <div className="w-14 h-14 rounded-full bg-gold/10 text-gold flex items-center justify-center mx-auto mb-3" aria-hidden>
            <Gift className="w-7 h-7" />
          </div>
          <h3 className="heading-display-md heading-strong text-mystic-100 mb-1">
            {t('referral.heading', { defaultValue: 'Share Arcana, earn Moonstones' })}
          </h3>
          <p className="text-ui text-mystic-400 leading-relaxed max-w-xs mx-auto">
            {t('referral.subtitle', {
              defaultValue:
                'Each friend who joins with your code earns you 100 Moonstones. They get 100 too.',
            })}
          </p>
        </div>

        <div className="bg-mystic-850 border border-gold/20 rounded-card p-4">
          <EyebrowLabel align="left" className="block mb-1">
            {t('referral.yourCodeLabel', { defaultValue: 'Your code' })}
          </EyebrowLabel>
          {loading && !myCode ? (
            <p className="text-ui text-mystic-400">{t('common:actions.loading', { defaultValue: 'Loading…' })}</p>
          ) : myCode ? (
            <div className="text-display font-semibold tabular-nums tracking-[0.2em] text-gold mb-3">{myCode}</div>
          ) : (
            <div className="mb-3" role="alert">
              <p className="text-ui text-coral">
                {t('referral.codeUnavailable', { defaultValue: 'Couldn’t fetch your code right now.' })}
              </p>
              {loadError && (
                <p className="text-caption text-mystic-500 mt-1 break-words">{loadError}</p>
              )}
              <Button variant="ghost" size="sm" onClick={loadCode} className="mt-2 -ml-2">
                <RefreshCw className="w-4 h-4" aria-hidden />
                {t('common:actions.retry', { defaultValue: 'Try again' })}
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={handleCopy} disabled={!myCode}>
              {copied ? <Check className="w-4 h-4" aria-hidden /> : <Copy className="w-4 h-4" aria-hidden />}
              {t('referral.copy', { defaultValue: 'Copy link' })}
            </Button>
            <Button variant="gold" fullWidth onClick={handleShare} disabled={!myCode}>
              <Share2 className="w-4 h-4" aria-hidden />
              {t('referral.share', { defaultValue: 'Share my code' })}
            </Button>
          </div>
          {invitesCount !== null && invitesCount > 0 && (
            <p className="text-meta text-mystic-400 mt-3 flex items-center gap-1.5 tabular-nums">
              <Gift className="w-3 h-3 text-gold" aria-hidden />
              {t('referral.invitesCount', {
                defaultValue: '{{n}} friends joined with your code',
                n: invitesCount,
              })}
            </p>
          )}
        </div>

        {canRedeem && (
          <div className="bg-mystic-850 border border-mystic-700 rounded-card p-4">
            <EyebrowLabel align="left" className="block mb-1">
              {t('referral.redeemLabel', { defaultValue: 'Got a code?' })}
            </EyebrowLabel>
            <p className="text-meta text-mystic-400 mb-3">
              {t('referral.redeemHelper', {
                defaultValue: 'Enter a friend’s code in your first 30 days to claim 100 Moonstones.',
              })}
            </p>
            <div className="flex gap-2">
              <Input
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value.toUpperCase())}
                placeholder={t('referral.codePlaceholder', { defaultValue: 'ABCD1234' })}
                aria-label={t('referral.redeemLabel', { defaultValue: 'Got a code?' })}
                maxLength={16}
                className="flex-1 font-mono tracking-widest"
              />
              <Button
                variant="outline"
                onClick={handleRedeem}
                disabled={redeeming || inviteInput.trim().length < 6}
                className="px-5"
              >
                {redeeming
                  ? t('referral.redeeming', { defaultValue: 'Redeeming…' })
                  : t('referral.redeem', { defaultValue: 'Redeem this code' })}
              </Button>
            </div>
          </div>
        )}

        {redeemed && !canRedeem && (
          <div className="text-center text-caption text-mystic-500 italic">
            {t('referral.alreadyRedeemed', { defaultValue: 'You’ve already redeemed a referral code.' })}
          </div>
        )}
      </div>
    </Sheet>
  );
}
