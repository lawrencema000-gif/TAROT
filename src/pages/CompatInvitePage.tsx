import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, ArrowRight, Sparkles, AlertCircle, UserPlus } from 'lucide-react';
import { Card, Button, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { compatInvites } from '../dal';
import type { CompatInvitePublic, CompatJointResult } from '../dal/compatInvites';
import { computeCompatibility, type MbtiType } from '../data/partnerCompat';
import { getZodiacSign } from '../utils/zodiac';

/**
 * Landing page for compat deep-link invites: /invite/:code
 *
 * Flow for the receiver:
 *   - If not signed in: route them through auth, return to this page.
 *   - Resolve the code → show "So-and-so wants to see how you vibe".
 *   - Pull the receiver's own existing quiz result (profile.mbtiType or
 *     birthDate for zodiac) and merge with the inviter's.
 *   - If the receiver hasn't taken the needed quiz yet, bounce to it.
 */

type InviteResult = {
  mbti?: MbtiType;
  birthDate?: string;
};

function extractResult(r: unknown): InviteResult {
  if (!r || typeof r !== 'object') return {};
  const o = r as Record<string, unknown>;
  return {
    mbti: typeof o.mbti === 'string' ? (o.mbti as MbtiType) : undefined,
    birthDate: typeof o.birthDate === 'string' ? (o.birthDate as string) : undefined,
  };
}

export function CompatInvitePage() {
  const { t } = useT('app');
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [invite, setInvite] = useState<CompatInvitePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [joined, setJoined] = useState<CompatJointResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInvite = useCallback(async () => {
    if (!code) return;
    setLoading(true);
    const res = await compatInvites.fetchPublicByCode(code);
    setLoading(false);
    if (!res.ok) {
      setError('generic');
      return;
    }
    if (!res.data) {
      setError('not-found');
      return;
    }
    setInvite(res.data);
  }, [code]);

  useEffect(() => { loadInvite(); }, [loadInvite]);

  const myResult = (): InviteResult | null => {
    if (!invite) return null;
    if (invite.kind === 'mbti') {
      if (!profile?.mbtiType) return null;
      return { mbti: profile.mbtiType as MbtiType };
    }
    if (invite.kind === 'zodiac' || invite.kind === 'element') {
      if (!profile?.birthDate) return null;
      return { birthDate: profile.birthDate };
    }
    return null;
  };

  const handleRespond = async () => {
    if (!invite) return;
    const mine = myResult();
    if (!mine) {
      // Bounce to quiz
      if (invite.kind === 'mbti') navigate('/quizzes?focus=mbti');
      else navigate('/profile');
      return;
    }
    setResponding(true);
    const res = await compatInvites.respond(invite.code, mine, profile?.displayName ?? null);
    setResponding(false);
    if (!res.ok) {
      const reason = res.error;
      if (reason === 'self-invite') toast(t('compatInvite.errors.selfInvite', { defaultValue: 'You can\'t respond to your own invite.' }), 'error');
      else if (reason === 'expired') toast(t('compatInvite.errors.expired', { defaultValue: 'This invite has expired.' }), 'error');
      else if (reason === 'not-found') toast(t('compatInvite.errors.notFound', { defaultValue: 'Invite not found.' }), 'error');
      else toast(t('compatInvite.errors.generic', { defaultValue: 'Could not respond.' }), 'error');
      return;
    }
    setJoined(res.data);
  };

  if (!user) {
    return (
      <Card padding="lg" variant="glow">
        <div className="flex items-start gap-3">
          <UserPlus className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display text-lg text-mystic-100 mb-1">
              {t('compatInvite.signInTitle', { defaultValue: 'Sign in to see your match' })}
            </h3>
            <p className="text-sm text-mystic-400 leading-relaxed mb-3">
              {t('compatInvite.signInBody', {
                defaultValue: 'Create a free account or sign in to take your side of the compatibility reading.',
              })}
            </p>
            <Button variant="gold" onClick={() => navigate('/')}>
              {t('compatInvite.signInCta', { defaultValue: 'Continue' })}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (loading) {
    return <div className="py-12 text-center text-mystic-500">{t('common:actions.loading', { defaultValue: 'Loading…' })}</div>;
  }

  if (error === 'not-found' || !invite) {
    return (
      <Card padding="lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-mystic-400">
            {t('compatInvite.notFound', { defaultValue: 'This invite could not be found or has expired.' })}
          </p>
        </div>
      </Card>
    );
  }

  if (invite.inviter_user_id === user.id) {
    return (
      <Card padding="lg" variant="glow">
        <p className="text-sm text-mystic-400">
          {t('compatInvite.ownInvite', {
            defaultValue: 'This is your own invite. Share the link with a friend or partner — they need to respond.',
          })}
        </p>
      </Card>
    );
  }

  if (joined) {
    return <CompatResultView joined={joined} />;
  }

  const mineResult = myResult();

  return (
    <div className="space-y-5 pb-6">
      <Card padding="lg" variant="glow" className="text-center">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold/25 to-pink-400/25 flex items-center justify-center mx-auto mb-3">
          <Heart className="w-6 h-6 text-pink-400" />
        </div>
        <h1 className="font-display text-xl text-mystic-100 mb-1">
          {invite.inviter_name
            ? t('compatInvite.fromNamed', { defaultValue: '{{name}} wants to see how you vibe', name: invite.inviter_name })
            : t('compatInvite.fromAnon', { defaultValue: 'Someone wants to see how you vibe' })}
        </h1>
        <p className="text-sm text-mystic-400 italic">
          {t(`compatInvite.kinds.${invite.kind}`, { defaultValue: invite.kind })}
        </p>
      </Card>

      {mineResult ? (
        <Card padding="lg">
          <p className="text-sm text-mystic-300 mb-4">
            {t('compatInvite.readyBody', {
              defaultValue: 'Your existing profile already has what this reading needs. Tap below to reveal the joint result.',
            })}
          </p>
          <Button variant="gold" fullWidth onClick={handleRespond} disabled={responding} className="min-h-[48px]">
            {responding
              ? t('compatInvite.revealing', { defaultValue: 'Revealing…' })
              : t('compatInvite.reveal', { defaultValue: 'Reveal our compatibility' })}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Card>
      ) : (
        <Card padding="lg">
          <p className="text-sm text-mystic-300 mb-3">
            {invite.kind === 'mbti'
              ? t('compatInvite.needMbti', { defaultValue: 'You need to take the personality quiz first.' })
              : t('compatInvite.needBirthDate', { defaultValue: 'Add your birth date in Profile first.' })}
          </p>
          <Button variant="gold" fullWidth onClick={handleRespond} className="min-h-[48px]">
            {invite.kind === 'mbti'
              ? t('compatInvite.goToQuiz', { defaultValue: 'Take the quiz' })
              : t('compatInvite.goToProfile', { defaultValue: 'Open Profile' })}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// Joint result view — merges inviter + responder into one summary
// ---------------------------------------------------------------
function CompatResultView({ joined }: { joined: CompatJointResult }) {
  const { t } = useT('app');
  const a = extractResult(joined.inviter_result);
  const b = extractResult(joined.responder_result);

  // For MBTI / zodiac kinds we can compute a real compatibility summary.
  // For other kinds we just show both sides.
  const compat = computeCompatibility({
    myMbti: a.mbti,
    partnerMbti: b.mbti,
    myBirthDate: a.birthDate,
    partnerBirthDate: b.birthDate,
  });

  const nameA = joined.inviter_name ?? t('compatInvite.inviterDefault', { defaultValue: 'Inviter' });
  const nameB = joined.responder_name ?? t('compatInvite.responderDefault', { defaultValue: 'You' });

  return (
    <div className="space-y-5 pb-6">
      <Card padding="lg" variant="glow" className="text-center bg-gradient-to-br from-pink-400/10 via-mystic-900 to-gold/5">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Heart className="w-5 h-5 text-pink-400" />
          <p className="text-[10px] uppercase tracking-widest text-pink-400">
            {t('compatInvite.resultLabel', { defaultValue: 'Compatibility' })}
          </p>
        </div>
        <h2 className="heading-display-lg text-mystic-100 mb-3">
          {nameA} <span className="text-gold">+</span> {nameB}
        </h2>
        {compat ? (
          <p className="font-display text-4xl text-gold mb-2">
            {compat.overallScore}%
          </p>
        ) : null}
      </Card>

      {compat && (
        <>
          {compat.mbtiNote && (
            <Card padding="lg">
              <h3 className="text-sm font-medium text-cosmic-blue tracking-wide mb-2">
                {t('compatInvite.mbtiSection', { defaultValue: 'Personality compatibility' })}
              </h3>
              <p className="text-sm text-mystic-300 leading-relaxed">{compat.mbtiNote}</p>
            </Card>
          )}
          {compat.astroNote && (
            <Card padding="lg">
              <h3 className="text-sm font-medium text-gold tracking-wide mb-2">
                {t('compatInvite.astroSection', { defaultValue: 'Astrological compatibility' })}
              </h3>
              <p className="text-sm text-mystic-300 leading-relaxed">{compat.astroNote}</p>
            </Card>
          )}
          <Card padding="lg">
            <h3 className="text-sm font-medium text-emerald-400 tracking-wide mb-3">
              {t('compatInvite.strengths', { defaultValue: 'Strengths' })}
            </h3>
            <ul className="space-y-2">
              {compat.strengths.map((s, i) => (
                <li key={i} className="text-sm text-mystic-300 pl-4 relative before:content-['✦'] before:absolute before:left-0 before:text-emerald-400">{s}</li>
              ))}
            </ul>
          </Card>
          <Card padding="lg">
            <h3 className="text-sm font-medium text-pink-400 tracking-wide mb-3">
              {t('compatInvite.growth', { defaultValue: 'Growth edges' })}
            </h3>
            <ul className="space-y-2">
              {compat.growthEdges.map((s, i) => (
                <li key={i} className="text-sm text-mystic-300 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-pink-400">{s}</li>
              ))}
            </ul>
          </Card>
          <Card padding="lg" className="bg-gradient-to-br from-gold/10 to-mystic-900 border-gold/30">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-gold" />
              <h3 className="text-sm font-medium text-gold tracking-wide">
                {t('compatInvite.advice', { defaultValue: 'For you two' })}
              </h3>
            </div>
            <p className="text-sm text-mystic-200 italic leading-relaxed">{compat.advice}</p>
          </Card>
        </>
      )}

      {!compat && (
        <Card padding="lg">
          <p className="text-sm text-mystic-400">
            {t('compatInvite.noScore', {
              defaultValue: 'Your responses are recorded. A richer joint reading is coming for this kind of quiz soon.',
            })}
          </p>
        </Card>
      )}

      {/* Small detail card so both sides see what was shared */}
      <Card padding="md" className="bg-mystic-800/40">
        <p className="text-[10px] uppercase tracking-widest text-mystic-500 mb-2">
          {t('compatInvite.yourSides', { defaultValue: 'What you shared' })}
        </p>
        <p className="text-xs text-mystic-300">
          <span className="text-mystic-500">{nameA}:</span>{' '}
          {a.mbti ?? (a.birthDate ? getZodiacSign(a.birthDate) : '—')}
        </p>
        <p className="text-xs text-mystic-300 mt-1">
          <span className="text-mystic-500">{nameB}:</span>{' '}
          {b.mbti ?? (b.birthDate ? getZodiacSign(b.birthDate) : '—')}
        </p>
      </Card>
    </div>
  );
}

export default CompatInvitePage;
