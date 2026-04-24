import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, Share2, ArrowLeft } from 'lucide-react';
import { Card, Button, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { LOVE_TREE_QUIZ, ATTACHMENT_INFO, scoreLoveTree } from '../data/loveTree';
import { LoveTree } from '../components/ritual/LoveTree';
import { shareOrDownloadCard } from '../utils/shareCard';

/**
 * Love Tree — a 12-question attachment-style reading rendered as a
 * morphing SVG tree + written deep-read. Free tier.
 *
 * Flow:
 *   intro → quiz (one item at a time, 5-point Likert) → result (tree
 *   + description + strengths/growth + affirmation + share).
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
  const [stage, setStage] = useState<Stage>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const totalItems = LOVE_TREE_QUIZ.length;
  const progress = Math.round(((index) / totalItems) * 100);

  const result = useMemo(() => {
    if (stage !== 'result') return null;
    return scoreLoveTree(answers);
  }, [stage, answers]);

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
    }
  };

  const handleRestart = () => {
    setStage('intro');
    setIndex(0);
    setAnswers({});
  };

  const handleShare = async () => {
    if (!result) return;
    const info = ATTACHMENT_INFO[result.attachment];
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
      `arcana-love-tree-${result.attachment}.png`,
      shareText,
    );

    if (outcome === 'downloaded') {
      toast(t('common:actions.saved', { defaultValue: 'Saved' }), 'success');
    } else if (outcome === 'failed') {
      try {
        await navigator.clipboard?.writeText(shareText);
        toast(t('common:actions.copied', { defaultValue: 'Copied' }), 'success');
      } catch {
        toast(t('common:actions.shareFailed', { defaultValue: "Couldn't share. Try again." }), 'error');
      }
    }
  };

  // ── Intro stage ─────────────────────────────────────────────────
  if (stage === 'intro') {
    return (
      <div className="space-y-5 pb-6">
        <header className="text-center space-y-2 pt-2">
          <Heart className="w-10 h-10 text-pink-400 mx-auto" />
          <h1 className="font-display text-2xl text-mystic-100">
            {t('loveTree.title', { defaultValue: 'Love Tree' })}
          </h1>
          <p className="text-sm text-mystic-400 max-w-md mx-auto">
            {t('loveTree.intro', {
              defaultValue:
                '12 questions, 90 seconds, one tree. Your attachment style rendered as a living shape — and a plain-spoken read on how you love.',
            })}
          </p>
        </header>

        <Card padding="lg">
          <p className="text-xs text-mystic-500 uppercase tracking-widest mb-2">
            {t('loveTree.howItWorksLabel', { defaultValue: 'How it works' })}
          </p>
          <ul className="space-y-2 text-sm text-mystic-300 leading-relaxed">
            <li>• {t('loveTree.how1', { defaultValue: 'Rate 12 short statements from strongly disagree to strongly agree.' })}</li>
            <li>• {t('loveTree.how2', { defaultValue: 'We compute your anxiety + avoidance scores on the classical attachment grid.' })}</li>
            <li>• {t('loveTree.how3', { defaultValue: 'You land in one of four quadrants — rendered as a distinct, animated tree.' })}</li>
          </ul>
        </Card>

        <Button variant="gold" fullWidth onClick={() => setStage('quiz')} className="min-h-[52px]">
          <Sparkles className="w-4 h-4 mr-2" />
          {t('loveTree.startCta', { defaultValue: 'Begin' })}
        </Button>

        <p className="text-[11px] text-mystic-500 text-center italic px-4">
          {t('loveTree.disclaimer', {
            defaultValue: 'A tool for self-knowledge, not a clinical diagnosis. Attachment patterns can shift — this is a snapshot, not a verdict.',
          })}
        </p>
      </div>
    );
  }

  // ── Quiz stage ─────────────────────────────────────────────────
  if (stage === 'quiz') {
    const item = LOVE_TREE_QUIZ[index];
    return (
      <div className="space-y-6 pb-6">
        <div className="flex items-center justify-between">
          <button onClick={handleBack} className="flex items-center gap-1.5 text-mystic-400 hover:text-mystic-200 text-sm">
            <ArrowLeft className="w-4 h-4" />
            {t('loveTree.back', { defaultValue: 'Back' })}
          </button>
          <span className="text-xs text-mystic-500">
            {t('loveTree.progress', { defaultValue: '{{i}} of {{n}}', i: index + 1, n: totalItems })}
          </span>
        </div>

        <div className="relative h-1 bg-mystic-800 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-400 to-gold rounded-full"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

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
              <p className="text-[10px] uppercase tracking-widest text-pink-400 mb-2">
                {t(`loveTree.dimensions.${item.dimension}`, { defaultValue: item.dimension })}
              </p>
              <p className="font-display text-lg text-mystic-100 leading-relaxed">
                {t(`loveTree.items.${item.id}`, { defaultValue: item.prompt })}
              </p>
            </Card>

            <div className="space-y-2">
              {LIKERT.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleAnswer(opt.value)}
                  className="w-full text-left p-3 rounded-xl border border-mystic-700/40 bg-mystic-900/40 hover:bg-mystic-800/60 hover:border-gold/30 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-mystic-200">
                      {t(`loveTree.likert.${opt.value}`, { defaultValue: opt.label })}
                    </span>
                    <span className="text-xs text-mystic-500">{opt.value}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ── Result stage ───────────────────────────────────────────────
  if (!result) return null;
  const info = ATTACHMENT_INFO[result.attachment];

  return (
    <div className="space-y-5 pb-6">
      <button onClick={handleRestart} className="flex items-center gap-1.5 text-mystic-400 hover:text-mystic-200 text-sm">
        <ArrowLeft className="w-4 h-4" />
        {t('loveTree.retake', { defaultValue: 'Retake' })}
      </button>

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-5"
      >
        <Card variant="glow" padding="lg" className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-pink-400 mb-1">
            {t('loveTree.yourStyle', { defaultValue: 'Your attachment style' })}
          </p>
          <h2 className="font-display text-3xl text-mystic-100">
            {t(`loveTree.attachment.${result.attachment}.title`, { defaultValue: info.title })}
          </h2>
          <p className="text-sm italic text-gold mt-1">
            {t(`loveTree.attachment.${result.attachment}.archetype`, { defaultValue: info.archetype })}
          </p>
          <div className="mt-4">
            <LoveTree tree={info.tree} />
          </div>
          <div className="mt-3 flex justify-center gap-4 text-[11px] text-mystic-500">
            <span>{t('loveTree.anxietyLabel', { defaultValue: 'Anxiety' })}: {result.anxiety}</span>
            <span>{t('loveTree.avoidanceLabel', { defaultValue: 'Avoidance' })}: {result.avoidance}</span>
          </div>
        </Card>

        <Card padding="lg">
          <p className="text-sm text-mystic-300 leading-relaxed">
            {t(`loveTree.attachment.${result.attachment}.summary`, { defaultValue: info.summary })}
          </p>
        </Card>

        <Card padding="lg">
          <p className="text-[10px] uppercase tracking-widest text-emerald-400 mb-2">
            {t('loveTree.strengthsLabel', { defaultValue: 'Your natural strengths' })}
          </p>
          <ul className="space-y-2 text-sm text-mystic-200">
            {info.strengths.map((s, i) => (
              <li key={i} className="leading-relaxed">• {t(`loveTree.attachment.${result.attachment}.strengths.${i}`, { defaultValue: s })}</li>
            ))}
          </ul>
        </Card>

        <Card padding="lg">
          <p className="text-[10px] uppercase tracking-widest text-pink-400 mb-2">
            {t('loveTree.growthLabel', { defaultValue: 'Where to grow' })}
          </p>
          <ul className="space-y-2 text-sm text-mystic-200">
            {info.growth.map((g, i) => (
              <li key={i} className="leading-relaxed">• {t(`loveTree.attachment.${result.attachment}.growth.${i}`, { defaultValue: g })}</li>
            ))}
          </ul>
        </Card>

        <Card padding="lg" className="bg-gradient-to-br from-pink-500/5 to-mystic-900 border-pink-400/20">
          <p className="text-[10px] uppercase tracking-widest text-pink-400 mb-2">
            {t('loveTree.inLoveLabel', { defaultValue: 'In love' })}
          </p>
          <p className="text-sm text-mystic-200 leading-relaxed">
            {t(`loveTree.attachment.${result.attachment}.inLove`, { defaultValue: info.inLove })}
          </p>
        </Card>

        <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20 text-center">
          <p className="text-[10px] uppercase tracking-widest text-gold mb-2">
            {t('loveTree.affirmationLabel', { defaultValue: 'Your affirmation' })}
          </p>
          <p className="text-lg italic text-mystic-100 leading-relaxed">
            "{t(`loveTree.attachment.${result.attachment}.affirmation`, { defaultValue: info.affirmation })}"
          </p>
        </Card>

        <Button variant="gold" fullWidth onClick={handleShare} className="min-h-[52px]">
          <Share2 className="w-4 h-4 mr-2" />
          {t('loveTree.share', { defaultValue: 'Share my tree' })}
        </Button>
      </motion.div>
    </div>
  );
}

export default LoveTreePage;
