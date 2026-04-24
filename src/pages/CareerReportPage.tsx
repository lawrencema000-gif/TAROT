import { useState, useEffect, useCallback } from 'react';
import { Briefcase, Lock, Sparkles, CheckCircle2, AlertCircle, TrendingUp, Users, Eye, Calendar, Quote } from 'lucide-react';
import { Card, Button, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { reportUnlocks, moonstones } from '../dal';
import { startReportCheckout } from '../services/reportCheckout';
import { canPayWithCard } from '../utils/platform';
import {
  getCareerArchetype,
  CAREER_REPORT_COST_MOONSTONES,
  CAREER_REPORT_COST_USD,
} from '../data/careerArchetypes';
import { renderShareCard, shareOrDownload } from '../utils/shareableResultCard';

/**
 * Career Archetype Deep Report — first pay-per-report.
 *
 * Locked by default. Unlock either:
 *   - pay 150 Moonstones (atomic RPC, debits ledger + inserts unlock row)
 *   - (future) pay $6.99 via Stripe — webhook inserts directly
 *
 * Report content is rendered client-side from CAREER_ARCHETYPES[mbti].
 * No LLM call, no per-generation cost — 100% platform margin.
 */
export function CareerReportPage() {
  const { t } = useT('app');
  const { profile, user } = useAuth();
  const mbti = profile?.mbtiType ?? null;
  const archetype = getCareerArchetype(mbti);

  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const checkUnlock = useCallback(async () => {
    if (!user || !mbti) {
      setChecking(false);
      return;
    }
    setChecking(true);
    const [unlockRes, balanceRes] = await Promise.all([
      reportUnlocks.isUnlocked('career-archetype', mbti),
      moonstones.getBalance(user.id),
    ]);
    if (unlockRes.ok) setUnlocked(unlockRes.data);
    if (balanceRes.ok) setBalance(balanceRes.data);
    setChecking(false);
  }, [user, mbti]);

  useEffect(() => { checkUnlock(); }, [checkUnlock]);

  const handleUnlockMoonstones = async () => {
    if (!mbti) return;
    setUnlocking(true);
    const res = await reportUnlocks.unlockWithMoonstones(
      'career-archetype',
      mbti,
      CAREER_REPORT_COST_MOONSTONES,
    );
    setUnlocking(false);
    if (res.ok) {
      setUnlocked(true);
      setBalance(res.data.newBalance);
      toast(t('careerReport.unlocked', { defaultValue: 'Report unlocked' }), 'success');
    } else if (res.error === 'insufficient-balance') {
      toast(
        t('careerReport.insufficientBalance', {
          defaultValue: 'Not enough Moonstones — top up from the home widget, or earn via daily check-in and invites',
        }),
        'error',
      );
    } else {
      toast(t('careerReport.unlockFailed', { defaultValue: 'Could not unlock' }), 'error');
    }
  };

  const handleShare = async () => {
    if (!archetype) return;
    try {
      const blob = await renderShareCard({
        title: archetype.name,
        subtitle: `${archetype.mbti} · ${t('careerReport.shareLabel', { defaultValue: 'Career Archetype' })}`,
        tagline: archetype.tagline,
        affirmation: archetype.affirmation,
        brand: 'Arcana · Career Archetype',
      });
      const outcome = await shareOrDownload(
        blob,
        `arcana-career-${archetype.mbti.toLowerCase()}.png`,
        `${archetype.name} — my career archetype`,
      );
      if (outcome === 'downloaded') {
        toast(t('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
      }
    } catch {
      toast(t('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
    }
  };

  if (!mbti || !archetype) {
    return (
      <div className="space-y-4 pb-6">
        <div className="flex items-center gap-3">
          <Briefcase className="w-6 h-6 text-gold" />
          <h1 className="font-display text-2xl text-mystic-100">
            {t('careerReport.title', { defaultValue: 'Career Archetype' })}
          </h1>
        </div>
        <Card padding="lg" variant="glow">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display text-lg text-mystic-100 mb-1">
                {t('careerReport.needsMbti', { defaultValue: 'Take the personality quiz first' })}
              </h3>
              <p className="text-sm text-mystic-400 leading-relaxed">
                {t('careerReport.needsMbtiBody', {
                  defaultValue:
                    'This report is derived from your MBTI personality type. Complete the 12-question Quick Personality quiz (or the full 70-question version) and your archetype will unlock.',
                })}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="py-12 text-center text-mystic-500">
        {t('common:actions.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="space-y-4 pb-6">
        <div className="flex items-center gap-3">
          <Briefcase className="w-6 h-6 text-gold" />
          <h1 className="font-display text-2xl text-mystic-100">
            {t('careerReport.title', { defaultValue: 'Career Archetype' })}
          </h1>
        </div>

        <Card padding="lg" variant="glow" className="text-center">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold/25 to-cosmic-violet/25 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-gold" />
          </div>
          <h2 className="font-display text-xl text-mystic-100 mb-1">
            {archetype.name}
          </h2>
          <p className="text-sm text-mystic-400 italic mb-4">
            {archetype.tagline}
          </p>
          <p className="text-xs text-mystic-500 leading-relaxed max-w-xs mx-auto mb-5">
            {t('careerReport.locked.body', {
              defaultValue:
                'A ~900-word coaching-grade report tailored to your type — best-fit roles, drains, collaboration patterns, blind spots, and a first-90-days plan.',
            })}
          </p>

          <ul className="text-xs text-mystic-400 text-left space-y-2 mb-5 max-w-[260px] mx-auto">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-gold mt-0.5 flex-shrink-0" />
              {t('careerReport.locked.feat1', { defaultValue: '10 best-fit roles across industries' })}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-gold mt-0.5 flex-shrink-0" />
              {t('careerReport.locked.feat2', { defaultValue: 'Which environments drain you' })}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-gold mt-0.5 flex-shrink-0" />
              {t('careerReport.locked.feat3', { defaultValue: 'Your collaboration counterweight' })}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-gold mt-0.5 flex-shrink-0" />
              {t('careerReport.locked.feat4', { defaultValue: 'First-90-days plan in a new role' })}
            </li>
          </ul>

          {/* Same paywall hierarchy as Natal Chart + Year Ahead (fixed
              2026-04-24): Stripe primary, Moonstones secondary, helper
              card when zero. */}
          {canPayWithCard() && (
            <Button
              variant="gold"
              fullWidth
              onClick={async () => {
                setCheckoutLoading(true);
                try {
                  const res = await startReportCheckout({ reportKey: 'career-archetype', reference: mbti });
                  if (!res.ok && res.error !== 'already-unlocked') {
                    toast(
                      t('careerReport.stripeFailed', { defaultValue: "Couldn't start checkout. Check your connection and try again." }),
                      'error',
                    );
                  }
                } catch (e) {
                  console.error('[Career] Stripe checkout failed:', e);
                  toast(
                    t('careerReport.stripeFailed', { defaultValue: "Couldn't start checkout. Check your connection and try again." }),
                    'error',
                  );
                } finally {
                  setCheckoutLoading(false);
                }
              }}
              disabled={checkoutLoading}
              loading={checkoutLoading}
              className="min-h-[52px]"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {t('careerReport.payWithStripe', {
                defaultValue: 'Unlock for ${{price}}',
                price: CAREER_REPORT_COST_USD.toFixed(2),
              })}
            </Button>
          )}

          {balance !== null && balance >= CAREER_REPORT_COST_MOONSTONES ? (
            <Button
              variant="outline"
              fullWidth
              onClick={handleUnlockMoonstones}
              disabled={unlocking}
              loading={unlocking}
              className="min-h-[48px] mt-3"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {t('careerReport.unlockCta', {
                defaultValue: 'Unlock with {{n}} Moonstones',
                n: CAREER_REPORT_COST_MOONSTONES,
              })}
            </Button>
          ) : (
            <div className="mt-3 p-3 rounded-xl bg-mystic-900/40 border border-mystic-700/30">
              <p className="text-xs text-mystic-300 mb-1">
                {t('careerReport.orEarnMoonstones', {
                  defaultValue: 'Or unlock with {{n}} Moonstones',
                  n: CAREER_REPORT_COST_MOONSTONES,
                })}
              </p>
              <p className="text-[11px] text-mystic-500">
                {t('careerReport.balanceShort', { defaultValue: 'Balance: {{n}}', n: balance ?? 0 })}
                {' · '}
                {t('careerReport.earnHint', { defaultValue: 'Earn via daily check-in + inviting friends.' })}
              </p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Unlocked — render the full report.
  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center gap-3">
        <Briefcase className="w-6 h-6 text-gold" />
        <h1 className="font-display text-2xl text-mystic-100">
          {archetype.name}
        </h1>
      </div>

      <Card padding="lg" variant="glow" className="bg-gradient-to-br from-gold/5 via-mystic-900 to-mystic-900">
        <p className="text-[10px] uppercase tracking-widest text-gold mb-1">
          {archetype.mbti} · {t('careerReport.shareLabel', { defaultValue: 'Career Archetype' })}
        </p>
        <p className="font-display text-lg text-mystic-100 italic mb-3">
          "{archetype.tagline}"
        </p>
        <p className="text-sm text-mystic-300 leading-relaxed">
          {archetype.summary}
        </p>
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-gold" />
          <h3 className="text-sm font-medium text-gold tracking-wide">
            {t('careerReport.bestFit', { defaultValue: 'Best-fit roles' })}
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {archetype.bestFitRoles.map((role, i) => (
            <div key={i} className="text-xs text-mystic-200 bg-mystic-800/40 rounded-lg px-3 py-2">
              {role}
            </div>
          ))}
        </div>
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-pink-400" />
          <h3 className="text-sm font-medium text-pink-400 tracking-wide">
            {t('careerReport.drains', { defaultValue: 'Environments that drain you' })}
          </h3>
        </div>
        <ul className="space-y-2">
          {archetype.environmentsThatDrain.map((item, i) => (
            <li key={i} className="text-sm text-mystic-300 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-pink-400">
              {item}
            </li>
          ))}
        </ul>
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-cosmic-blue" />
          <h3 className="text-sm font-medium text-cosmic-blue tracking-wide">
            {t('careerReport.collaboration', { defaultValue: 'Collaboration pattern' })}
          </h3>
        </div>
        <p className="text-sm text-mystic-300 leading-relaxed">
          {archetype.collaborationPattern}
        </p>
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-cosmic-violet" />
          <h3 className="text-sm font-medium text-cosmic-violet tracking-wide">
            {t('careerReport.blindSpots', { defaultValue: 'Blind spots' })}
          </h3>
        </div>
        <ul className="space-y-2">
          {archetype.blindSpots.map((item, i) => (
            <li key={i} className="text-sm text-mystic-300 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-cosmic-violet">
              {item}
            </li>
          ))}
        </ul>
      </Card>

      <Card padding="lg" className="bg-gradient-to-br from-cosmic-blue/5 to-mystic-900/80 border-cosmic-blue/20">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-cosmic-blue" />
          <h3 className="text-sm font-medium text-cosmic-blue tracking-wide">
            {t('careerReport.ninetyDays', { defaultValue: 'First 90 days' })}
          </h3>
        </div>
        <div className="space-y-4">
          {archetype.firstNinetyDays.map((phase) => (
            <div key={phase.month} className="pl-4 border-l-2 border-cosmic-blue/30">
              <p className="text-[10px] uppercase tracking-widest text-mystic-500 mb-1">
                {t('careerReport.monthLabel', { defaultValue: 'Month {{n}}', n: phase.month })}
              </p>
              <p className="text-sm font-medium text-mystic-100 mb-2">{phase.focus}</p>
              <ul className="space-y-1.5">
                {phase.actions.map((action, i) => (
                  <li key={i} className="text-xs text-mystic-400 leading-relaxed">
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-2 mb-3">
          <Quote className="w-4 h-4 text-gold" />
          <h3 className="text-sm font-medium text-gold tracking-wide">
            {t('careerReport.reflection', { defaultValue: 'Sit with these questions' })}
          </h3>
        </div>
        <ul className="space-y-3">
          {archetype.reflectionQuestions.map((q, i) => (
            <li key={i} className="text-sm text-mystic-300 italic leading-relaxed">
              {i + 1}. {q}
            </li>
          ))}
        </ul>
      </Card>

      <Card padding="lg" className="bg-gradient-to-br from-gold/10 to-mystic-900 border-gold/30 text-center">
        <Sparkles className="w-5 h-5 text-gold mx-auto mb-2" />
        <p className="text-sm text-mystic-200 italic leading-relaxed">
          "{archetype.affirmation}"
        </p>
      </Card>

      <Button variant="outline" fullWidth onClick={handleShare} className="min-h-[44px]">
        <Sparkles className="w-4 h-4 mr-2" />
        {t('careerReport.share', { defaultValue: 'Share my archetype' })}
      </Button>
    </div>
  );
}

export default CareerReportPage;
