import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sprout, Share2, ArrowLeft, RotateCcw } from 'lucide-react';
import { Card, Button, Page, PageHeader, Progress, ResultLayout, toast, ReadingProse, AffirmationPanel, Disclaimer } from '../components/ui';
import { useT } from '../i18n/useT';
import {
  LOVE_TREE_QUIZ,
  ATTACHMENT_INFO,
  ATTACHMENT_STYLE_OF,
  attachmentFromStyle,
  scoreLoveTree,
  type Attachment,
} from '../data/loveTree';
import { LoveTree } from '../components/ritual/LoveTree';
import { shareOrDownloadCard } from '../utils/shareCard';
import { useAuth } from '../context/AuthContext';
import { quizResults as quizResultsDal } from '../dal';
import { supabase } from '../lib/supabase';

/**
 * Love Tree — a 12-question attachment-style reading rendered as a
 * morphing SVG tree + written deep-read. Free tier.
 *
 * Flow:
 *   intro → quiz (one item at a time, 5-point Likert) → result (tree
 *   + description + strengths/growth + affirmation + share).
 *
 * The result persists: the quadrant is written to profiles.attachment_style
 * (the same column the attachment quiz writes, with the same labels), so a
 * return visit opens on "Your tree" with a Retake, instead of the intro as
 * if nothing had happened (R7).
 *
 * The tree is pure SVG + framer-motion, branches/trunk-lean/leaf
 * density derived from attachment type. Shareable result card hooks
 * into the common `shareOrDownloadCard` utility with a `quote`
 * variant.
 */

type Stage = 'intro' | 'quiz' | 'result';

const LIKERT: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Strongly disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly agree' },
];

export function LoveTreePage() {
  const { t } = useT('app');
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [stage, setStage] = useState<Stage>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  // Guards the one-time persist per completed run (React re-renders /
  // StrictMode double-invoke would otherwise double-insert).
  const savedRef = useRef(false);
  // Set when the user chooses to retake: the saved tree stays on the
  // profile until a new run replaces it, but the page shows the quiz.
  const [retaking, setRetaking] = useState(false);

  const totalItems = LOVE_TREE_QUIZ.length;
  const progress = Math.round(((index) / totalItems) * 100);

  const result = useMemo(() => {
    if (stage !== 'result') return null;
    return scoreLoveTree(answers);
  }, [stage, answers]);

  // The quadrant already on the profile (from a previous run, or from the
  // attachment quiz, which uses the same four labels). AuthContext does not
  // map profiles.attachment_style into `profile` yet (request filed), so the
  // column is read here as well; whichever source has it wins.
  const [storedStyle, setStoredStyle] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('attachment_style')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setStoredStyle((data as { attachment_style: string | null }).attachment_style);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);
  const savedAttachment = useMemo<Attachment | null>(
    () => attachmentFromStyle(profile?.attachmentStyle) ?? attachmentFromStyle(storedStyle),
    [profile?.attachmentStyle, storedStyle],
  );

  // Persist the result on first entry to the result stage: a quiz_results
  // row (quiz_type 'love-tree', mirroring every other quiz) and the quadrant
  // on the profile. Fire-and-forget; no-op when signed out.
  useEffect(() => {
    if (stage !== 'result' || !result || !user || savedRef.current) return;
    savedRef.current = true;
    void quizResultsDal.insert({
      userId: user.id,
      quizType: 'love-tree',
      quizId: 'love-tree-v1',
      result: result.attachment,
      scores: result as unknown as Record<string, unknown>,
      label: ATTACHMENT_INFO[result.attachment].title,
    });
    const style = ATTACHMENT_STYLE_OF[result.attachment];
    void (async () => {
      // updateProfile({ attachmentStyle }) is the canonical path, but
      // AuthContext's writable-field map does not carry attachment_style yet
      // (request filed with the orchestrator), so the column is written the
      // way QuizzesPage writes it and the profile is re-read so the saved
      // tree shows on the next visit.
      const { error } = await supabase.from('profiles').update({ attachment_style: style }).eq('id', user.id);
      if (error) {
        console.warn('[LoveTree] could not persist attachment_style:', error.message);
        return;
      }
      setStoredStyle(style);
      await refreshProfile();
    })();
  }, [stage, result, user, refreshProfile]);

  const handleAnswer = (value: number) => {
    const item = LOVE_TREE_QUIZ[index];
    const next = { ...answers, [item.id]: value };
    setAnswers(next);
    if (index + 1 < totalItems) {
      setIndex(index + 1);
    } else {
      setStage('result');
    }
  };

  const handleBack = () => {
    if (stage === 'quiz' && index > 0) {
      setIndex(index - 1);
    } else {
      setStage('intro');
      setIndex(0);
      setAnswers({});
      savedRef.current = false;
    }
  };

  const handleRestart = () => {
    setRetaking(true);
    setStage('intro');
    setIndex(0);
    setAnswers({});
    savedRef.current = false;
  };

  const shareAttachment = async (attachment: Attachment) => {
    const info = ATTACHMENT_INFO[attachment];
    const shareText = t('loveTree.shareText', {
      defaultValue: 'My Arcana Love Tree: {{title}} — {{archetype}}. Find yours at arcana.app/love-tree',
      title: info.title,
      archetype: info.archetype,
    }) as string;

    const outcome = await shareOrDownloadCard(
      {
        variant: 'quote',
        headline: info.title,
        body: info.archetype,
      },
      `arcana-love-tree-${attachment}.png`,
      shareText,
    );

    if (outcome === 'downloaded') {
      toast(t('common:actions.saved', { defaultValue: 'Saved' }), 'success');
    } else if (outcome === 'failed') {
      try {
        await navigator.clipboard?.writeText(shareText);
        toast(t('common:actions.copied', { defaultValue: 'Copied' }), 'success');
      } catch {
        toast(t('common:actions.shareFailed', { defaultValue: 'Couldn’t share. Try again.' }), 'error');
      }
    }
  };

  // ── Saved tree (a return visit) ────────────────────────────────
  if (stage === 'intro' && savedAttachment && !retaking) {
    return (
      <AttachmentResult
        attachment={savedAttachment}
        eyebrow={t('loveTree.yourTree', { defaultValue: 'Your tree' })}
        onBack={() => navigate(-1)}
        onRetake={handleRestart}
        onShare={() => shareAttachment(savedAttachment)}
        t={t}
      />
    );
  }

  // ── Intro stage ─────────────────────────────────────────────────
  if (stage === 'intro') {
    return (
      <Page spacing="md">
        <PageHeader
          align="center"
          icon={<Heart />}
          title={t('loveTree.title', { defaultValue: 'Love Tree' })}
          subtitle={t('loveTree.intro', {
            defaultValue:
              '12 questions, 90 seconds, one tree. Your attachment style rendered as a living shape — and a plain-spoken read on how you love.',
          })}
        />

        <Card padding="lg">
          <p className="font-display-eyebrow mb-2">
            {t('loveTree.howItWorksLabel', { defaultValue: 'How it works' })}
          </p>
          <ul className="space-y-2 text-ui text-mystic-300 list-disc pl-5">
            <li>{t('loveTree.how1', { defaultValue: 'Rate 12 short statements from strongly disagree to strongly agree.' })}</li>
            <li>{t('loveTree.how2', { defaultValue: 'We compute your anxiety + avoidance scores on the classical attachment grid.' })}</li>
            <li>{t('loveTree.how3', { defaultValue: 'You land in one of four quadrants — rendered as a distinct, animated tree.' })}</li>
          </ul>
        </Card>

        <Button variant="gold" size="lg" fullWidth onClick={() => setStage('quiz')}>
          <Sprout className="w-4 h-4" aria-hidden />
          {retaking
            ? t('loveTree.retakeCta', { defaultValue: 'Grow a new tree' })
            : t('loveTree.startCta', { defaultValue: 'Grow my tree' })}
        </Button>

        {retaking && savedAttachment && (
          <Button variant="ghost" fullWidth onClick={() => setRetaking(false)}>
            <ArrowLeft className="w-4 h-4" aria-hidden />
            {t('loveTree.backToSaved', { defaultValue: 'Back to my tree' })}
          </Button>
        )}

        <Disclaimer kind="quiz" />
      </Page>
    );
  }

  // ── Quiz stage ─────────────────────────────────────────────────
  if (stage === 'quiz') {
    const item = LOVE_TREE_QUIZ[index];
    return (
      <Page spacing="md">
        <div className="flex items-center justify-between">
          <button type="button" onClick={handleBack} className="flex items-center gap-1.5 min-h-[44px] text-mystic-400 hover:text-mystic-200 text-ui">
            <ArrowLeft className="w-4 h-4" aria-hidden />
            {t('loveTree.back', { defaultValue: 'Back' })}
          </button>
          <span className="text-meta text-mystic-400 tabular-nums">
            {t('loveTree.progress', { defaultValue: '{{i}} of {{n}}', i: index + 1, n: totalItems })}
          </span>
        </div>

        <Progress
          value={progress}
          size="sm"
          label={t('loveTree.progress', { defaultValue: '{{i}} of {{n}}', i: index + 1, n: totalItems }) as string}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            <Card padding="lg" className="text-center">
              <p className="font-display-eyebrow mb-2">
                {t(`loveTree.dimensions.${item.dimension}`, { defaultValue: item.dimension })}
              </p>
              <p className="heading-display-md text-mystic-100 text-balance">
                {t(`loveTree.items.${item.id}`, { defaultValue: item.prompt })}
              </p>
            </Card>

            <div className="space-y-2" role="group" aria-label={t(`loveTree.items.${item.id}`, { defaultValue: item.prompt }) as string}>
              {LIKERT.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleAnswer(opt.value)}
                  className="w-full text-left p-3 min-h-[48px] rounded-control border border-mystic-700/40 bg-mystic-900/40 hover:bg-mystic-800/60 hover:border-gold/30 motion-safe:active:scale-[0.98] transition-[background-color,border-color,transform] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-ui text-mystic-200">
                      {t(`loveTree.likert.${opt.value}`, { defaultValue: opt.label })}
                    </span>
                    <span className="text-meta text-mystic-500 tabular-nums">{opt.value}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </Page>
    );
  }

  // ── Result stage ───────────────────────────────────────────────
  if (!result) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <AttachmentResult
        attachment={result.attachment}
        scores={{ anxiety: result.anxiety, avoidance: result.avoidance }}
        eyebrow={t('loveTree.yourStyle', { defaultValue: 'Your attachment style' })}
        onBack={() => navigate(-1)}
        onRetake={handleRestart}
        onShare={() => shareAttachment(result.attachment)}
        t={t}
      />
    </motion.div>
  );
}

/**
 * The tree, read. Shared between a fresh result (with the two scores) and a
 * saved one shown on return (the scores are not stored on the profile, so
 * the line is omitted rather than invented).
 */
function AttachmentResult({
  attachment,
  scores,
  eyebrow,
  onBack,
  onRetake,
  onShare,
  t,
}: {
  attachment: Attachment;
  scores?: { anxiety: number; avoidance: number };
  eyebrow: string;
  /** The header's back arrow leaves the page; Retake is the button below. */
  onBack: () => void;
  onRetake: () => void;
  onShare: () => void;
  t: (key: string, opts?: Record<string, unknown>) => unknown;
}) {
  const info = ATTACHMENT_INFO[attachment];
  const tx = (key: string, opts?: Record<string, unknown>) => t(key, opts) as string;
  return (
    <ResultLayout
      onBack={onBack}
      backLabel={tx('common:actions.back', { defaultValue: 'Back' })}
      eyebrow={eyebrow}
      verdict={tx(`loveTree.attachment.${attachment}.title`, { defaultValue: info.title })}
      subtitle={
        <span className="italic">
          {tx(`loveTree.attachment.${attachment}.archetype`, { defaultValue: info.archetype })}
        </span>
      }
      summary={tx(`loveTree.attachment.${attachment}.summary`, { defaultValue: info.summary })}
      actions={
        <>
          <Button variant="outline" onClick={onRetake} className="flex-1">
            <RotateCcw className="w-4 h-4" aria-hidden />
            {tx('loveTree.retake', { defaultValue: 'Retake' })}
          </Button>
          <Button variant="gold" onClick={onShare} className="flex-1">
            <Share2 className="w-4 h-4" aria-hidden />
            {tx('loveTree.share', { defaultValue: 'Share my tree' })}
          </Button>
        </>
      }
      defaultDetailOpen
      footer={<Disclaimer kind="quiz" />}
    >
      <Card padding="lg" className="text-center">
        <LoveTree tree={info.tree} />
        {scores && (
          <div className="mt-3 flex justify-center gap-4 text-meta text-mystic-400 tabular-nums">
            <span>{tx('loveTree.anxietyLabel', { defaultValue: 'Anxiety' })}: {scores.anxiety}</span>
            <span>{tx('loveTree.avoidanceLabel', { defaultValue: 'Avoidance' })}: {scores.avoidance}</span>
          </div>
        )}
      </Card>

      <Card padding="lg">
        <p className="font-display-eyebrow mb-2">
          {tx('loveTree.strengthsLabel', { defaultValue: 'Your natural strengths' })}
        </p>
        <ul className="reading-copy space-y-2 list-disc pl-5">
          {info.strengths.map((s, i) => (
            <li key={i}>{tx(`loveTree.attachment.${attachment}.strengths.${i}`, { defaultValue: s })}</li>
          ))}
        </ul>
      </Card>

      <Card padding="lg">
        <p className="font-display-eyebrow mb-2">
          {tx('loveTree.growthLabel', { defaultValue: 'Where to grow' })}
        </p>
        <ul className="reading-copy space-y-2 list-disc pl-5">
          {info.growth.map((g, i) => (
            <li key={i}>{tx(`loveTree.attachment.${attachment}.growth.${i}`, { defaultValue: g })}</li>
          ))}
        </ul>
      </Card>

      <Card padding="lg" className="bg-cosmic-rose/10 border-cosmic-rose/25">
        <p className="font-display-eyebrow mb-2">
          {tx('loveTree.inLoveLabel', { defaultValue: 'In love' })}
        </p>
        <ReadingProse text={tx(`loveTree.attachment.${attachment}.inLove`, { defaultValue: info.inLove })} lede={false} />
      </Card>

      <AffirmationPanel
        surface="canvas"
        text={tx(`loveTree.attachment.${attachment}.affirmation`, { defaultValue: info.affirmation })}
      />
    </ResultLayout>
  );
}

export default LoveTreePage;
