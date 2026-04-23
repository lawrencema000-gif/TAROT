import { useState, useEffect, useCallback } from 'react';
import { Gift, Copy, Share2, Check, Sparkles } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button, Input, toast } from '../ui';
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
 */
export function ReferralSheet({ open, onClose }: ReferralSheetProps) {
  const { t } = useT('app');
  const { user } = useAuth();
  const [myCode, setMyCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
    const res = await referrals.getOrIssueCode();
    if (res.ok) setMyCode(res.data);
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
      toast(t('referral.copyFailed', { defaultValue: 'Could not copy' }), 'error');
    }
  };

  const handleShare = async () => {
    if (!myCode) return;
    const text = t('referral.shareText', {
      defaultValue:
        'I\'ve been using Arcana for tarot + astrology — use my code for 100 free Moonstones: {{url}}',
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
          defaultValue: '+{{n}} Moonstones — welcome!',
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
          ? 'You\'ve already redeemed a code.'
          : reason === 'not-found'
            ? 'Code not found.'
            : reason === 'self-redeem'
              ? 'You can\'t use your own code.'
              : reason === 'account-too-old'
                ? 'Referral codes only work in the first 30 days.'
                : 'Could not redeem code.';
      toast(t(msgKey, { defaultValue: defaultMsg }), 'error');
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('referral.title', { defaultValue: 'Invite & earn' })}>
      <div className="space-y-5 pb-4">
        <div className="text-center pt-2">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold/20 to-cosmic-violet/20 flex items-center justify-center mx-auto mb-3">
            <Gift className="w-7 h-7 text-gold" />
          </div>
          <h3 className="font-display text-xl text-mystic-100 mb-1">
            {t('referral.heading', { defaultValue: 'Share Arcana, earn Moonstones' })}
          </h3>
          <p className="text-sm text-mystic-400 leading-relaxed max-w-xs mx-auto">
            {t('referral.subtitle', {
              defaultValue:
                'Each friend who joins with your code earns you 100 Moonstones. They get 100 too.',
            })}
          </p>
        </div>

        <div className="bg-mystic-900/60 border border-gold/20 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-mystic-500 mb-1">
            {t('referral.yourCodeLabel', { defaultValue: 'Your code' })}
          </p>
          {loading && !myCode ? (
            <p className="text-sm text-mystic-400">{t('common:actions.loading', { defaultValue: 'Loading…' })}</p>
          ) : myCode ? (
            <div className="font-display text-2xl text-gold tracking-widest mb-3">{myCode}</div>
          ) : (
            <p className="text-sm text-mystic-400">—</p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={handleCopy} disabled={!myCode} className="min-h-[44px]">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {t('referral.copy', { defaultValue: 'Copy link' })}
            </Button>
            <Button variant="primary" fullWidth onClick={handleShare} disabled={!myCode} className="min-h-[44px]">
              <Share2 className="w-4 h-4 mr-2" />
              {t('referral.share', { defaultValue: 'Share' })}
            </Button>
          </div>
          {invitesCount !== null && invitesCount > 0 && (
            <p className="text-xs text-mystic-400 mt-3 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-gold" />
              {t('referral.invitesCount', {
                defaultValue: '{{n}} friends joined with your code',
                n: invitesCount,
              })}
            </p>
          )}
        </div>

        {canRedeem && (
          <div className="bg-mystic-900/40 border border-mystic-800 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-mystic-500 mb-1">
              {t('referral.redeemLabel', { defaultValue: 'Got a code?' })}
            </p>
            <p className="text-xs text-mystic-400 mb-3">
              {t('referral.redeemHelper', {
                defaultValue: 'Enter a friend\'s code in your first 30 days to claim 100 Moonstones.',
              })}
            </p>
            <div className="flex gap-2">
              <Input
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value.toUpperCase())}
                placeholder={t('referral.codePlaceholder', { defaultValue: 'ABCD1234' })}
                maxLength={16}
                className="flex-1 font-mono tracking-widest"
              />
              <Button
                variant="gold"
                onClick={handleRedeem}
                disabled={redeeming || inviteInput.trim().length < 6}
                className="min-h-[44px] px-5"
              >
                {redeeming
                  ? t('referral.redeeming', { defaultValue: 'Redeeming…' })
                  : t('referral.redeem', { defaultValue: 'Redeem' })}
              </Button>
            </div>
          </div>
        )}

        {redeemed && !canRedeem && (
          <div className="text-center text-xs text-mystic-500 italic">
            {t('referral.alreadyRedeemed', { defaultValue: 'You\'ve already redeemed a referral code.' })}
          </div>
        )}
      </div>
    </Sheet>
  );
}
