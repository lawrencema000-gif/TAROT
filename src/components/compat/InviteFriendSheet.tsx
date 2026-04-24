import { useState, useEffect, useCallback } from 'react';
import { Heart, Copy, Share2, Check, Link as LinkIcon } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button, toast } from '../ui';
import { useT } from '../../i18n/useT';
import { useAuth } from '../../context/AuthContext';
import { compatInvites } from '../../dal';
import type { CompatKind } from '../../dal/compatInvites';
import type { MbtiType } from '../../data/partnerCompat';

interface InviteFriendSheetProps {
  open: boolean;
  onClose: () => void;
  /** If caller has a specific kind in mind, pass it. Otherwise user picks. */
  defaultKind?: CompatKind;
}

/**
 * Sheet for the inviter. Generates a deep-link invite code based on either
 * the user's MBTI (if known) or their birth date (zodiac/element). Copies
 * the link to clipboard or triggers the native share sheet.
 */
export function InviteFriendSheet({ open, onClose, defaultKind }: InviteFriendSheetProps) {
  const { t } = useT('app');
  const { profile } = useAuth();
  const [kind, setKind] = useState<CompatKind>(
    defaultKind ?? (profile?.mbtiType ? 'mbti' : 'zodiac'),
  );
  const [code, setCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasMbti = !!profile?.mbtiType;
  const hasBirthDate = !!profile?.birthDate;

  useEffect(() => {
    if (!open) {
      setCode(null);
      setCopied(false);
    }
  }, [open]);

  const generate = useCallback(async () => {
    setGenerating(true);
    const resultPayload =
      kind === 'mbti'
        ? { mbti: profile?.mbtiType as MbtiType }
        : { birthDate: profile?.birthDate };
    const res = await compatInvites.createInvite(
      kind,
      resultPayload,
      profile?.displayName ?? null,
    );
    setGenerating(false);
    if (res.ok) {
      setCode(res.data.code);
    } else {
      toast(t('compatInvite.createFailed', { defaultValue: 'Could not create invite' }), 'error');
    }
  }, [kind, profile, t]);

  const inviteUrl = code ? `https://tarotlife.app/invite/${code}` : '';

  const handleCopy = async () => {
    if (!inviteUrl) return;
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
    if (!inviteUrl) return;
    const text = t('compatInvite.shareText', {
      defaultValue: 'Take this compatibility reading with me on Arcana: {{url}}',
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

  return (
    <Sheet open={open} onClose={onClose} title={t('compatInvite.createTitle', { defaultValue: 'Invite someone' })}>
      <div className="space-y-4 pb-4">
        <div className="text-center pt-1">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400/20 to-gold/15 flex items-center justify-center mx-auto mb-2">
            <Heart className="w-5 h-5 text-pink-400" />
          </div>
          <p className="text-sm text-mystic-400 leading-relaxed max-w-xs mx-auto">
            {t('compatInvite.createSubtitle', {
              defaultValue: 'Send a link. They take their side; you both see the joint reading.',
            })}
          </p>
        </div>

        {!code && (
          <>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-mystic-500 mb-2">
                {t('compatInvite.pickKind', { defaultValue: 'Compatibility kind' })}
              </p>
              <div className="flex gap-2">
                {hasMbti && (
                  <button
                    onClick={() => setKind('mbti')}
                    className={`flex-1 px-3 py-2.5 text-xs rounded-xl border transition-all ${
                      kind === 'mbti'
                        ? 'bg-gold/15 text-gold border-gold/40'
                        : 'bg-mystic-800/40 text-mystic-300 border-mystic-700/40'
                    }`}
                  >
                    {t('compatInvite.kinds.mbti', { defaultValue: 'Personality (MBTI)' })}
                  </button>
                )}
                {hasBirthDate && (
                  <button
                    onClick={() => setKind('zodiac')}
                    className={`flex-1 px-3 py-2.5 text-xs rounded-xl border transition-all ${
                      kind === 'zodiac'
                        ? 'bg-gold/15 text-gold border-gold/40'
                        : 'bg-mystic-800/40 text-mystic-300 border-mystic-700/40'
                    }`}
                  >
                    {t('compatInvite.kinds.zodiac', { defaultValue: 'Zodiac' })}
                  </button>
                )}
              </div>
              {!hasMbti && !hasBirthDate && (
                <p className="text-xs text-mystic-500 mt-2">
                  {t('compatInvite.nothingToShare', {
                    defaultValue: 'Take the personality quiz or add your birth date first.',
                  })}
                </p>
              )}
            </div>

            <Button
              variant="gold"
              fullWidth
              onClick={generate}
              disabled={generating || (!hasMbti && !hasBirthDate)}
              className="min-h-[48px]"
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              {generating
                ? t('compatInvite.generating', { defaultValue: 'Generating…' })
                : t('compatInvite.generateLink', { defaultValue: 'Generate invite link' })}
            </Button>
          </>
        )}

        {code && (
          <div className="bg-mystic-900/60 border border-gold/20 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-mystic-500 mb-1">
              {t('compatInvite.yourLink', { defaultValue: 'Your invite link' })}
            </p>
            <p className="font-mono text-xs text-gold break-all mb-3">{inviteUrl}</p>
            <div className="flex gap-2">
              <Button variant="outline" fullWidth onClick={handleCopy} className="min-h-[44px]">
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {t('referral.copy', { defaultValue: 'Copy link' })}
              </Button>
              <Button variant="primary" fullWidth onClick={handleShare} className="min-h-[44px]">
                <Share2 className="w-4 h-4 mr-2" />
                {t('referral.share', { defaultValue: 'Share' })}
              </Button>
            </div>
            <p className="text-[10px] text-mystic-500 mt-3 text-center">
              {t('compatInvite.expiresNote', { defaultValue: 'Link expires in 90 days.' })}
            </p>
          </div>
        )}
      </div>
    </Sheet>
  );
}
