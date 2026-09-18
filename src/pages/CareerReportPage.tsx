import { useState, useEffect, useCallback } from 'react';
import { Briefcase, Lock, Moon, Gift, Share2, CheckCircle2, AlertCircle, Crown } from 'lucide-react';
import { Card, Button, toast, PageHeader, Section, EmptyState, ResultLayout, ReadingProse } from '../components/ui';
import { MysticalStar } from '../components/ui/MysticalStar';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { useFeatureFlag } from '../context/FeatureFlagContext';
import { reportUnlocks, moonstones } from '../dal';
import { PaywallSheet, WatchAdSheet } from '../components/premium';
import { OrnateDivider } from '../components/ui';
import {
  getCareerArchetype,
  CAREER_REPORT_COST_MOONSTONES,
} from '../data/careerArchetypes';
import { renderShareCard, shareOrDownload } from '../utils/shareableResultCard';

/**
 * Career Archetype Deep Report — 150 Moonstones or Premium subscription.
 *
 * Monetization refactor 2026-04-25: one-off Stripe per-report purchases
 * removed. Premium unlocks every feature; Moonstones are the per-report
 * unlock currency; every rewarded ad credits +50 Moonstones.
 *
 * Report content is rendered client-side from CAREER_ARCHETYPES[mbti].
 * No LLM call, no per-generation cost.
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
  const [showSubscription, setShowSubscription] = useState(false);
  const [showWatchAd, setShowWatchAd] = useState(false);
  const moonstonesEnabled = useFeatureFlag('moonstones');

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
        <PageHeader
          icon={<Briefcase />}
          title={t('careerReport.title', { defaultValue: 'Career Archetype' })}
        />
        <EmptyState
          icon={<AlertCircle />}
          title={t('careerReport.needsMbti', { defaultValue: 'Take the personality quiz first' })}
          description={t('careerReport.needsMbtiBody', {
            defaultValue:
              'This report is derived from your MBTI personality type. Complete the 12-question Quick Personality quiz (or the full 70-question version) and your archetype will unlock.',
          })}
        />
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
        <PageHeader
          icon={<Briefcase />}
          title={t('careerReport.title', { defaultValue: 'Career Archetype' })}
        />

        <Card padding="lg" variant="ornate" className="text-center nebula-veil">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold/25 to-cosmic-violet/25 flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Lock className="w-6 h-6 text-gold" />
          </div>
          <h2 className="heading-display-lg text-mystic-100 mb-2">
            {archetype.name}
          </h2>
          <div className="flex justify-center mb-3 text-gold/60">
            <OrnateDivider width={120} />
          </div>
          <p className="text-ui text-mystic-200 italic mb-4">
            {archetype.tagline}
          </p>
          <p className="text-ui text-mystic-300 text-left max-w-xs mx-auto mb-5">
            {t('careerReport.locked.body', {
              defaultValue:
                'A ~900-word coaching-grade report tailored to your type — best-fit roles, drains, collaboration patterns, blind spots, and a first-90-days plan.',
            })}
          </p>

          <ul className="text-ui text-mystic-300 text-left space-y-2 mb-5 max-w-[260px] mx-auto">
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

          {/*
            Monetization refactor 2026-04-25 — two-option paywall:
              1. PRIMARY: Upgrade to Premium → unlocks EVERY feature
              2. SECONDARY: Unlock with Moonstones (or earn them via ads)
            One-off Stripe per-report purchases have been removed to
            keep the transactional surface small + unambiguous.
          */}
          <Button
            variant="gold"
            fullWidth
            onClick={() => setShowSubscription(true)}
            size="lg"
          >
            <Crown className="w-4 h-4 mr-2" />
            {t('careerReport.upgradeToPremium', {
              defaultValue: 'Upgrade to Premium — unlocks everything',
            })}
          </Button>

          {moonstonesEnabled && (balance !== null && balance >= CAREER_REPORT_COST_MOONSTONES ? (
            <Button
              variant="outline"
              fullWidth
              onClick={handleUnlockMoonstones}
              disabled={unlocking}
              loading={unlocking}
              className="mt-3"
            >
              <Moon className="w-4 h-4 mr-2" />
              {t('careerReport.unlockCta', {
                defaultValue: 'Unlock with {{n}} Moonstones',
                n: CAREER_REPORT_COST_MOONSTONES,
              })}
            </Button>
          ) : (
            <div className="mt-3 p-3 rounded-xl bg-mystic-900/40 border border-mystic-700/30 text-left">
              <p className="text-ui text-mystic-200 mb-2">
                {t('careerReport.orEarnMoonstones', {
                  defaultValue: 'Or unlock with {{n}} Moonstones',
                  n: CAREER_REPORT_COST_MOONSTONES,
                })}
              </p>
              <p className="text-meta text-mystic-400 mb-3">
                {t('careerReport.balanceShort', { defaultValue: 'Balance: {{n}}', n: balance ?? 0 })}
                {' · '}
                {t('careerReport.earnHint', {
                  defaultValue: 'Earn Moonstones via daily check-in, watching ads, or inviting friends.',
                })}
              </p>
              <Button
                variant="outline"
                fullWidth
                size="sm"
                onClick={() => setShowWatchAd(true)}
              >
                <Gift className="w-3.5 h-3.5 mr-1.5" />
                {t('careerReport.earnNow', {
                  defaultValue: 'Earn 50 Moonstones — watch ad',
                })}
              </Button>
            </div>
          ))}
        </Card>

        {/* PaywallSheet, not SubscriptionSheet. SubscriptionSheet is the
            already-subscribed MANAGEMENT screen: it hardcodes
            Status = "Active", offers "Manage on Google Play", and never
            calls billing.purchase() at all. Pointing the upgrade CTA at
            it told a non-paying user they were already premium and gave
            them no way to buy — which is the likeliest reason the
            subscriptions table is empty. */}
        <PaywallSheet
          open={showSubscription}
          onClose={() => setShowSubscription(false)}
          feature="career-report"
        />
        {moonstonesEnabled && (
          <WatchAdSheet
            open={showWatchAd}
            onClose={() => setShowWatchAd(false)}
            onCredited={(newBalance) => setBalance(newBalance)}
            onShowPaywall={() => setShowSubscription(true)}
            earnOnly
          />
        )}
      </div>
    );
  }

  // Unlocked — render the full report.
  return (
    <ResultLayout
      className="pb-6"
      eyebrow={`${archetype.mbti} · ${t('careerReport.shareLabel', { defaultValue: 'Career Archetype' })}`}
      verdict={archetype.name}
      subtitle={`"${archetype.tagline}"`}
      summary={archetype.summary}
      glyph={<Briefcase />}
      actions={
        <Button variant="outline" fullWidth onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" />
          {t('careerReport.share', { defaultValue: 'Share my archetype' })}
        </Button>
      }
      detailLabel={t('careerReport.fullReport', { defaultValue: 'The full report' })}
      defaultDetailOpen
    >
      <Section
        headingLevel="h3"
        spacing="sm"
        title={t('careerReport.bestFit', { defaultValue: 'Best-fit roles' })}
      >
        <div className="grid grid-cols-2 gap-2">
          {archetype.bestFitRoles.map((role, i) => (
            <div key={i} className="text-ui text-mystic-100 bg-mystic-800/40 rounded-lg px-3 py-2">
              {role}
            </div>
          ))}
        </div>
      </Section>

      <Section
        headingLevel="h3"
        spacing="sm"
        title={t('careerReport.drains', { defaultValue: 'Environments that drain you' })}
      >
        <ul className="reading-copy space-y-2">
          {archetype.environmentsThatDrain.map((item, i) => (
            <li key={i} className="pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-mystic-400">
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section
        headingLevel="h3"
        spacing="sm"
        title={t('careerReport.collaboration', { defaultValue: 'Collaboration pattern' })}
      >
        <ReadingProse text={archetype.collaborationPattern} lede={false} />
      </Section>

      <Section
        headingLevel="h3"
        spacing="sm"
        title={t('careerReport.blindSpots', { defaultValue: 'Blind spots' })}
      >
        <ul className="reading-copy space-y-2">
          {archetype.blindSpots.map((item, i) => (
            <li key={i} className="pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-mystic-400">
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Card padding="lg" className="bg-gradient-to-br from-cosmic-blue/5 to-mystic-900/80 border-cosmic-blue/20">
        <h3 className="heading-display-md text-mystic-100 mb-3">
          {t('careerReport.ninetyDays', { defaultValue: 'First 90 days' })}
        </h3>
        <div className="space-y-4">
          {archetype.firstNinetyDays.map((phase) => (
            <div key={phase.month} className="pl-4 border-l-2 border-cosmic-blue/30">
              <p className="font-display-eyebrow mb-1">
                {t('careerReport.monthLabel', { defaultValue: 'Month {{n}}', n: phase.month })}
              </p>
              <p className="text-body font-medium text-mystic-100 mb-2">{phase.focus}</p>
              <ul className="reading-copy space-y-1.5">
                {phase.actions.map((action, i) => (
                  <li key={i}>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Section
        headingLevel="h3"
        spacing="sm"
        title={t('careerReport.reflection', { defaultValue: 'Sit with these questions' })}
      >
        <ul className="reading-copy space-y-3">
          {archetype.reflectionQuestions.map((q, i) => (
            <li key={i} className="italic">
              {i + 1}. {q}
            </li>
          ))}
        </ul>
      </Section>

      {/* The affirmation is the report's one pull-quote. It used to be a
          14px italic line centred in a card, which wraps to three lines on
          a phone; .reading-quote gives it the serif, the gold rule and a
          left edge instead of quote marks. */}
      <Card padding="lg" className="bg-gradient-to-br from-gold/10 to-mystic-900 border-gold/30">
        <MysticalStar size={20} halo={false} className="block text-gold mb-2" />
        <p className="reading-quote my-0">
          {archetype.affirmation}
        </p>
      </Card>
    </ResultLayout>
  );
}

export default CareerReportPage;
