import { useState, useEffect } from 'react';
import {
  Brain,
  Heart,
  Smile,
  ChevronRight,
  CheckCircle,
  ArrowLeft,
  Clock,
  Sparkles,
  RefreshCw,
  Calendar,
  Zap,
  Users,
  Focus,
  Battery,
  Bookmark,
  Share2,
  AlertTriangle,
  Briefcase,
  Target,
  HeartHandshake,
  XCircle,
  ListChecks,
  Lock,
  ChevronDown,
  ChevronUp,
  Pentagon,
  Link,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Shield,
  Lightbulb,
  Compass,
  BookOpen,
} from 'lucide-react';
import { Card, Button, Progress, toast } from '../components/ui';
import * as QuizIcons from '../components/ui/QuizIcons';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import { supabase } from '../lib/supabase'; // still used for profile writes (owned by AuthContext pattern)
import { quizResults as quizResultsDal } from '../dal';
import { adsService } from '../services/ads';
import { awardXP } from '../services/levelSystem';
import { ratePromptService } from '../services/ratePrompt';
import { useT } from '../i18n/useT';
import { localizeQuiz, localizeQuizMetadata, localizeExtraQuizMetadata } from '../i18n/localizeQuiz';
import {
  mbtiQuiz,
  loveLanguageQuiz,
  moodCheckQuiz,
  calculateMBTI,
  calculateLoveLanguage,
  calculateMoodCheck,
  mbtiDescriptions,
  loveLanguageDescriptions,
  moodDescriptions,
  quizMetadata,
} from '../data/quizzes';
import { bigFiveQuiz, calculateBigFive, bigFiveDescriptions } from '../data/bigFiveQuiz';
import { enneagramQuiz, calculateEnneagram, enneagramDescriptions } from '../data/enneagramQuiz';
import { attachmentQuiz, calculateAttachment, attachmentDescriptions } from '../data/attachmentQuiz';
import { mbtiQuickQuiz } from '../data/mbtiQuickQuiz';
import { tarotCourtQuiz, calculateCourtMatch, getCourtCardInfo } from '../data/tarotCourtQuiz';
import { shadowArchetypeQuiz, calculateShadowArchetype, SHADOW_ARCHETYPES } from '../data/shadowArchetypeQuiz';
import { elementAffinityQuiz, calculateElementAffinity, ELEMENT_INFO } from '../data/elementAffinityQuiz';
import { ayurvedaQuiz, calculateDosha, DOSHA_INFO } from '../data/ayurvedaQuiz';
import {
  EXTRA_QUIZZES,
  EXTRA_QUIZ_METADATA,
  EXTRA_QUIZ_SCORING,
  calculateExtraQuiz,
  type DimensionalResult,
} from '../data/extraQuizzes';
import { useFeatureFlag } from '../context/FeatureFlagContext';
import { AskOracleButton } from '../components/oracle/AskOracleButton';
import { renderShareCard, shareOrDownload } from '../utils/shareableResultCard';
import { getZodiacElement, getZodiacSign } from '../utils/zodiac';

import type { QuizDefinition } from '../types';

type QuizState = 'list' | 'taking' | 'results';

interface QuizProgress {
  quiz: QuizDefinition;
  currentQuestion: number;
  answers: Record<string, number>;
}

interface QuizResultData {
  id: string;
  quiz_type: string;
  result: string;
  scores: Record<string, number>;
  completed_at: string;
  label?: string;
}

// Custom per-quiz glyphs — each designed around what the quiz actually
// measures, not a generic lucide icon. See src/components/ui/QuizIcons.tsx
// for the design rationale per icon. The legacy lucide keys (brain, heart,
// smile, pentagon, target, link) are kept as fallbacks for any future
// quiz that hasn't been given a custom icon yet.
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  // Curated 11 (custom)
  'mbti-quadrant': QuizIcons.MbtiQuadrantIcon,
  'mbti-quick': QuizIcons.MbtiQuickIcon,
  'love-languages': QuizIcons.LoveLanguagesIcon,
  'mood-wave': QuizIcons.MoodWaveIcon,
  'attachment-rings': QuizIcons.AttachmentRingsIcon,
  'big-five-pentagon': QuizIcons.BigFivePentagonIcon,
  'four-elements': QuizIcons.FourElementsIcon,
  'enneagram': QuizIcons.EnneagramIcon,
  'shadow-mask': QuizIcons.ShadowMaskIcon,
  'tarot-court': QuizIcons.TarotCourtIcon,
  'ayurveda-dosha': QuizIcons.AyurvedaDoshaIcon,
  // Sprint-3 EXTRA quizzes — custom icon per quiz so every quiz card
  // shows a unique glyph that signals what it measures (instead of the
  // generic Sparkles fallback). Each key here matches the icon: string
  // in EXTRA_QUIZ_METADATA in src/data/extraQuizzes.ts. Collision-prone
  // keys (moon/heart used by multiple quizzes) were renamed to unique
  // ids so each quiz can have its own glyph.
  'dark-triad': QuizIcons.DarkTriadIcon,                           // dark-triad-v1
  briefcase: QuizIcons.DiscIcon,                                   // disc-v1
  'dollar-sign': QuizIcons.MoneyScriptIcon,                        // money-personality-v1
  shield: QuizIcons.BoundariesIcon,                                // boundaries-v1
  flame: QuizIcons.BurnoutIcon,                                    // burnout-v1
  'message-circle': QuizIcons.CommunicationIcon,                   // communication-v1
  swords: QuizIcons.ConflictIcon,                                  // conflict-v1
  chronotype: QuizIcons.ChronotypeIcon,                            // chronotype-v1
  palette: QuizIcons.CreativeTypeIcon,                             // creative-type-v1
  sparkles: QuizIcons.SpiritualTypeIcon,                           // spiritual-type-v1
  'jungian-functions': QuizIcons.JungianFunctionsIcon,             // jungian-functions-v1
  'love-styles-icon': QuizIcons.LoveStylesIcon,                    // love-styles-v1
  home: QuizIcons.ParentingStyleIcon,                              // parenting-style-v1
  'book-open': QuizIcons.LearningStyleIcon,                        // learning-style-v1
  'empath-hsp-icon': QuizIcons.EmpathHspIcon,                      // empath-hsp-v1
  'self-compassion-icon': QuizIcons.SelfCompassionIcon,            // self-compassion-v1
  activity: QuizIcons.MoodScreenerIcon,                            // mood-screener-v1
  wind: QuizIcons.AnxietyProfileIcon,                              // anxiety-profile-v1
  compass: QuizIcons.LeadershipIcon,                               // leadership-style-v1
  settings: QuizIcons.ProductivityIcon,                            // productivity-style-v1
  'relationship-readiness-icon': QuizIcons.RelationshipReadinessIcon, // relationship-readiness-v1
  leaf: QuizIcons.WellnessTypeIcon,                                // wellness-type-v1
  // Legacy lucide fallbacks (for any unmapped key)
  brain: Brain,
  heart: Heart,
  smile: Smile,
  pentagon: Pentagon,
  target: Target,
  link: Link,
};

const encouragementMessages = [
  "You're doing great, keep going!",
  "Trust your instincts on these.",
  "There are no wrong answers here.",
  "Almost halfway there!",
  "You're making excellent progress.",
  "Stay with your first instinct.",
  "These insights will be valuable.",
  "You've got this!",
  "Your honesty leads to better results.",
  "Keep up the momentum!",
];

/**
 * Mid-quiz hint: at ~25/50/75% progress, peek at the leading dimension
 * based on answers so far. Returns a short localized string or null.
 *
 * Deliberately only fires at threshold crossings so it appears once per
 * quarter — not every question. Mood-check is skipped (too short).
 */
function computeSneakPeek(
  quiz: QuizDefinition,
  answers: Record<string, number>,
  currentQ: number,
  total: number,
  tApp: (key: string, opts?: Record<string, unknown>) => string,
): string | null {
  if (quiz.id === 'mood-check-v1') return null;
  if (total < 8) return null;
  const percent = (currentQ / total) * 100;
  // Fire only when we JUST crossed 25/50/75
  const hit25 = percent >= 25 && (currentQ - 1) / total * 100 < 25;
  const hit50 = percent >= 50 && (currentQ - 1) / total * 100 < 50;
  const hit75 = percent >= 75 && (currentQ - 1) / total * 100 < 75;
  if (!hit25 && !hit50 && !hit75) return null;

  const answered = Object.keys(answers).length;
  if (answered < 2) return null;

  if (quiz.type === 'mbti') {
    const sums: Record<string, number> = { EI: 0, SN: 0, TF: 0, JP: 0 };
    const counts: Record<string, number> = { EI: 0, SN: 0, TF: 0, JP: 0 };
    quiz.questions.forEach((q) => {
      if (!q.dimension) return;
      const v = answers[q.id];
      if (v !== undefined) {
        sums[q.dimension] = (sums[q.dimension] || 0) + v;
        counts[q.dimension] = (counts[q.dimension] || 0) + 1;
      }
    });
    const leaning: string[] = [];
    for (const dim of ['EI', 'SN', 'TF', 'JP']) {
      if (!counts[dim]) continue;
      const avg = sums[dim] / counts[dim];
      if (avg >= 3.5) leaning.push(dim[1]);
      else if (avg <= 2.5) leaning.push(dim[0]);
    }
    if (leaning.length === 0) return null;
    return tApp('quizzes.sneakPeek.mbti', {
      letters: leaning.join(''),
      defaultValue: `You're leaning ${leaning.join('')} so far — keep going to confirm.`,
    });
  }

  if (quiz.type === 'court-match') {
    const elementCount: Record<string, number> = { wands: 0, cups: 0, swords: 0, pentacles: 0 };
    const rankCount: Record<string, number> = { page: 0, knight: 0, queen: 0, king: 0 };
    const elementMap: Record<number, string> = { 1: 'wands', 2: 'cups', 3: 'swords', 4: 'pentacles' };
    const rankMap: Record<number, string> = { 1: 'page', 2: 'knight', 3: 'queen', 4: 'king' };
    Object.entries(answers).forEach(([qid, v]) => {
      if (qid.startsWith('ce') && elementMap[v]) elementCount[elementMap[v]]++;
      if (qid.startsWith('cr') && rankMap[v]) rankCount[rankMap[v]]++;
    });
    const topElement = Object.entries(elementCount).sort((a, b) => b[1] - a[1])[0];
    if (!topElement || topElement[1] === 0) return null;
    return tApp(`quizzes.sneakPeek.courtMatchElement.${topElement[0]}`, {
      defaultValue: `A ${topElement[0]} card is taking shape...`,
    });
  }

  if (quiz.type === 'love-language') {
    return tApp('quizzes.sneakPeek.loveLanguage', {
      defaultValue: 'Your primary love language is starting to emerge...',
    });
  }

  if (quiz.type === 'shadow-archetype') {
    return tApp('quizzes.sneakPeek.shadowArchetype', {
      defaultValue: 'An archetype pattern is forming...',
    });
  }

  if (quiz.type === 'element-affinity') {
    return tApp('quizzes.sneakPeek.elementAffinity', {
      defaultValue: 'An elemental current is emerging...',
    });
  }

  if (quiz.type === 'enneagram') {
    return tApp('quizzes.sneakPeek.enneagram', {
      defaultValue: 'A type pattern is forming — keep going for your wing.',
    });
  }

  if (quiz.type === 'attachment') {
    return tApp('quizzes.sneakPeek.attachment', {
      defaultValue: 'Your attachment style is coming into focus...',
    });
  }

  if (quiz.type === 'big-five') {
    return tApp('quizzes.sneakPeek.bigFive', {
      defaultValue: 'Your trait profile is taking shape...',
    });
  }

  return null;
}

export function QuizzesPage() {
  const { t: tApp } = useT('app');
  const { user, profile, refreshProfile } = useAuth();
  const { triggerLevelUp, openRatePrompt } = useGamification();
  const [state, setState] = useState<QuizState>('list');
  const [progress, setProgress] = useState<QuizProgress | null>(null);
  const [result, setResult] = useState<{ quiz: QuizDefinition; result: unknown } | null>(null);
  const [pastResults, setPastResults] = useState<QuizResultData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadPastResults();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadPastResults = async () => {
    if (!user) return;

    const res = await quizResultsDal.listForUser(user.id);
    if (res.ok) {
      setPastResults(res.data as unknown as QuizResultData[]);
    }
    setLoading(false);
  };

  const getLastResult = (quizType: string): QuizResultData | undefined => {
    return pastResults.find(r => r.quiz_type === quizType);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const ayurvedaEnabled = useFeatureFlag('ayurveda-dosha');
  const extraQuizzesEnabled = useFeatureFlag('extra-quizzes');

  const quizzes = [
    {
      quiz: localizeQuiz(moodCheckQuiz),
      type: 'mood-check',
      metadata: localizeQuizMetadata('mood-check', quizMetadata['mood-check']),
    },
    ...(ayurvedaEnabled ? [{
      quiz: localizeQuiz(ayurvedaQuiz),
      type: 'ayurveda-dosha',
      metadata: localizeQuizMetadata('ayurveda-dosha', quizMetadata['ayurveda-dosha']),
    }] : []),
    ...(extraQuizzesEnabled ? EXTRA_QUIZZES.map((q) => ({
      quiz: localizeQuiz(q),
      type: 'extra-dimensional',
      // Route extra-quiz metadata through localizeExtraQuizMetadata so
      // timeEstimate + whatYouGet pick up the locale value when present.
      // Without this, JP/KR/ZH users saw English "Your money script" etc.
      // even though the quiz title/description were translated.
      metadata: localizeExtraQuizMetadata(q.id, EXTRA_QUIZ_METADATA[q.id]),
    })) : []),
    {
      quiz: localizeQuiz(mbtiQuickQuiz),
      type: 'mbti',
      metadata: localizeQuizMetadata('mbti-quick', quizMetadata['mbti-quick']),
    },
    {
      quiz: localizeQuiz(tarotCourtQuiz),
      type: 'court-match',
      metadata: localizeQuizMetadata('court-match', quizMetadata['court-match']),
    },
    {
      quiz: localizeQuiz(elementAffinityQuiz),
      type: 'element-affinity',
      metadata: localizeQuizMetadata('element-affinity', quizMetadata['element-affinity']),
    },
    {
      quiz: localizeQuiz(shadowArchetypeQuiz),
      type: 'shadow-archetype',
      metadata: localizeQuizMetadata('shadow-archetype', quizMetadata['shadow-archetype']),
    },
    {
      quiz: localizeQuiz(mbtiQuiz),
      type: 'mbti',
      metadata: localizeQuizMetadata('mbti', quizMetadata.mbti),
    },
    {
      quiz: localizeQuiz(loveLanguageQuiz),
      type: 'love-language',
      metadata: localizeQuizMetadata('love-language', quizMetadata['love-language']),
    },
    {
      quiz: localizeQuiz(bigFiveQuiz),
      type: 'big-five',
      metadata: localizeQuizMetadata('big-five', quizMetadata['big-five']),
    },
    {
      quiz: localizeQuiz(enneagramQuiz),
      type: 'enneagram',
      metadata: localizeQuizMetadata('enneagram', quizMetadata.enneagram),
    },
    {
      quiz: localizeQuiz(attachmentQuiz),
      type: 'attachment',
      metadata: localizeQuizMetadata('attachment', quizMetadata.attachment),
    },
  ];

  const startQuiz = (quiz: QuizDefinition) => {
    // Swap in localized title, description, and Likert labels for the
    // active locale before handing the definition to the quiz runner.
    setProgress({ quiz: localizeQuiz(quiz), currentQuestion: 0, answers: {} });
    setState('taking');
  };

  const saveToProfile = async (type: string, resultLabel: string, additionalData?: Record<string, unknown>) => {
    if (!user) return;
    setSaving(true);

    const fieldMap: Record<string, string> = {
      mbti: 'mbti_type',
      'love-language': 'love_language',
      enneagram: 'enneagram_type',
      attachment: 'attachment_style',
    };

    const field = fieldMap[type];
    const updateData: Record<string, unknown> = {};

    if (field) {
      updateData[field] = resultLabel;
    }

    if (additionalData) {
      Object.assign(updateData, additionalData);
    }

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);
      toast(tApp('home.savedToHighlights'), 'success');
    }
    setSaving(false);
  };

  const shareResult = async (type: string, resultLabel: string) => {
    const shareText = type === 'mbti'
      ? `I just discovered I'm an ${resultLabel} personality type! Take the quiz to find yours.`
      : `My primary love language is ${resultLabel}! Discover yours too.`;

    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
      } catch {
        await navigator.clipboard.writeText(shareText);
        toast(tApp('home.copiedToClipboard'), 'success');
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast('Copied to clipboard!', 'success');
    }
  };

  const answerQuestion = async (questionId: string, value: number) => {
    if (!progress) return;

    const newAnswers = { ...progress.answers, [questionId]: value };
    const nextQuestion = progress.currentQuestion + 1;

    if (nextQuestion >= progress.quiz.questions.length) {
      let calculatedResult;
      let resultLabel = '';

      if (progress.quiz.type === 'mbti') {
        calculatedResult = calculateMBTI(newAnswers);
        resultLabel = calculatedResult.type;
      } else if (progress.quiz.type === 'court-match') {
        calculatedResult = calculateCourtMatch(newAnswers);
        resultLabel = calculatedResult.courtCard;
      } else if (progress.quiz.type === 'shadow-archetype') {
        calculatedResult = calculateShadowArchetype(newAnswers);
        resultLabel = calculatedResult.archetype;
      } else if (progress.quiz.type === 'element-affinity') {
        calculatedResult = calculateElementAffinity(newAnswers);
        resultLabel = calculatedResult.primary;
      } else if (progress.quiz.type === 'ayurveda-dosha') {
        calculatedResult = calculateDosha(newAnswers);
        resultLabel = calculatedResult.primary;
      } else if (progress.quiz.type === 'extra-dimensional') {
        const extra = calculateExtraQuiz(progress.quiz.id, newAnswers);
        if (extra) {
          calculatedResult = extra;
          resultLabel = extra.primary;
        }
      } else if (progress.quiz.type === 'love-language') {
        calculatedResult = calculateLoveLanguage(newAnswers);
        resultLabel = calculatedResult.primary;
      } else if (progress.quiz.type === 'big-five') {
        if (progress.quiz.id === 'mood-check-v1') {
          calculatedResult = calculateMoodCheck(newAnswers);
          resultLabel = calculatedResult.overallMood;
        } else if (progress.quiz.id === 'attachment-v1') {
          calculatedResult = calculateAttachment(newAnswers);
          resultLabel = calculatedResult.style;
        } else {
          calculatedResult = calculateBigFive(newAnswers);
          resultLabel = tApp('quizzes.resultSections.bigFiveProfile');
        }
      } else if (progress.quiz.type === 'enneagram') {
        calculatedResult = calculateEnneagram(newAnswers);
        resultLabel = `${tApp('quizzes.resultSections.enneagramType', { defaultValue: 'Type {{n}}', n: calculatedResult.primaryType })}${calculatedResult.wing ? `w${calculatedResult.wing}` : ''}`;
      } else {
        calculatedResult = calculateMoodCheck(newAnswers);
        resultLabel = calculatedResult.overallMood;
      }

      if (user) {
        const quizType = progress.quiz.id === 'mood-check-v1' ? 'mood-check' :
                         progress.quiz.id === 'attachment-v1' ? 'attachment' :
                         progress.quiz.type;
        await quizResultsDal.insert({
          userId: user.id,
          quizType,
          quizId: progress.quiz.id,
          result: resultLabel,
          scores: calculatedResult as unknown as Record<string, unknown>,
          label: resultLabel,
        });
        loadPastResults();

        const xpResult = await awardXP(user.id, 'quiz_complete');
        if (xpResult) {
          toast(`+${xpResult.xp_earned} XP earned!`, 'success');
          if (xpResult.level_up) {
            triggerLevelUp({
              newLevel: xpResult.new_level,
              seekerRank: xpResult.seeker_rank,
              xpEarned: xpResult.xp_earned,
            });
          }
        }
        await refreshProfile();

        await adsService.checkAndShowAd(profile?.isPremium || false, 'quiz', profile?.isAdFree || false);

        await ratePromptService.incrementPositiveActions(user.id);
        const shouldShowRate = await ratePromptService.shouldShowPrompt(user.id);
        if (shouldShowRate) {
          await ratePromptService.recordPromptShown(user.id);
          openRatePrompt();
        }
      }

      setResult({ quiz: progress.quiz, result: calculatedResult });
      setState('results');
    } else {
      setProgress({ ...progress, currentQuestion: nextQuestion, answers: newAnswers });
    }
  };

  const resetQuiz = () => {
    setProgress(null);
    setResult(null);
    setState('list');
    setExpandedSections({});
  };

  if (state === 'taking' && progress) {
    const question = progress.quiz.questions[progress.currentQuestion];
    const totalQuestions = progress.quiz.questions.length;
    const currentQ = progress.currentQuestion + 1;
    const progressPercent = (currentQ / totalQuestions) * 100;
    const isMoodCheck = progress.quiz.id === 'mood-check-v1';
    const isMBTI = progress.quiz.type === 'mbti';

    const showEncouragement = isMBTI && currentQ % 6 === 0 && currentQ < totalQuestions;
    const encouragement = encouragementMessages[Math.floor(currentQ / 6) % encouragementMessages.length];

    // Mid-quiz sneak-peek: show the leaning dimension at 25/50/75% marks.
    // Skipped for the 30-second mood check (too short to bother).
    const sneakPeek = computeSneakPeek(progress.quiz, progress.answers, currentQ, totalQuestions, tApp);

    return (
      <div className="space-y-6 pb-6">
        <div className="flex items-center gap-4">
          <button onClick={resetQuiz} className="p-2 -ml-2 hover:bg-mystic-800 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-mystic-400" />
          </button>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-mystic-200">{currentQ} / {totalQuestions}</p>
              <p className="text-xs text-mystic-500">{Math.round(progressPercent)}%</p>
            </div>
            <Progress value={progressPercent} variant="gold" size="sm" />
          </div>
        </div>

        {sneakPeek && (
          <Card padding="md" className="bg-gradient-to-r from-gold/10 via-mystic-900 to-mystic-900 border-gold/20 animate-fade-in">
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-gold shrink-0" />
              <p className="text-sm text-mystic-200 leading-relaxed">
                <span className="text-gold/80">{tApp('quizzes.sneakPeek.label', { defaultValue: 'Early reading:' })}</span>{' '}
                {sneakPeek}
              </p>
            </div>
          </Card>
        )}

        {showEncouragement && !sneakPeek && (
          <div className="text-center py-2">
            <p className="text-sm text-gold/80 italic">{encouragement}</p>
          </div>
        )}

        <Card variant="glow" padding="lg">
          <h2 className="font-display text-xl text-mystic-100 mb-8 leading-relaxed">
            {question.text}
          </h2>

          <div className="space-y-3">
            {question.options.map(option => (
              <button
                key={option.value}
                onClick={() => answerQuestion(question.id, option.value)}
                className={`w-full p-4 text-left border rounded-xl transition-all active:scale-[0.98] ${
                  isMoodCheck
                    ? 'bg-mystic-800/30 hover:bg-gold/10 border-mystic-700 hover:border-gold/30'
                    : 'bg-mystic-800/50 hover:bg-mystic-700/50 border-mystic-600/50 hover:border-gold/30'
                }`}
              >
                <span className="text-mystic-200">{option.label}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (state === 'results' && result) {
    if (result.quiz.id === 'mood-check-v1') {
      const moodResult = result.result as ReturnType<typeof calculateMoodCheck>;
      const moodInfo = moodDescriptions[moodResult.overallMood];

      return (
        <div className="space-y-6 pb-6">
          <button onClick={resetQuiz} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Quizzes
          </button>

          <Card variant="glow" padding="lg" className="text-center">
            <div className={`w-20 h-20 mx-auto mb-4 rounded-full bg-mystic-800 flex items-center justify-center ${moodInfo.color}`}>
              <Smile className="w-10 h-10" />
            </div>
            <h2 className="heading-display-lg text-mystic-100 mb-2">{moodResult.overallMood}</h2>
            <p className="text-mystic-300">{moodInfo.message}</p>

            <div className="mt-6 flex justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="8" className="text-mystic-800" />
                  <circle
                    cx="64" cy="64" r="56" fill="none" stroke="url(#moodGradient)" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(moodResult.moodScore / 100) * 352} 352`}
                  />
                  <defs>
                    <linearGradient id="moodGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#d4af37" />
                      <stop offset="100%" stopColor="#f5d67b" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-display text-gold">{moodResult.moodScore}%</span>
                </div>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <h3 className="font-medium text-mystic-200 mb-4">Your Dimensions</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(moodResult.dimensions).map(([dim, value]) => {
                const icons: Record<string, React.ComponentType<{ className?: string }>> = {
                  energy: Battery,
                  emotion: Heart,
                  connection: Users,
                  clarity: Focus,
                };
                const Icon = icons[dim] || Sparkles;
                return (
                  <div key={dim} className="flex items-center gap-3 p-3 bg-mystic-800/30 rounded-xl">
                    <Icon className="w-5 h-5 text-gold" />
                    <div className="flex-1">
                      <p className="text-xs text-mystic-500 capitalize">{dim}</p>
                      <div className="flex items-center gap-2">
                        <Progress value={(value / 5) * 100} variant="gold" size="sm" className="flex-1" />
                        <span className="text-sm text-mystic-300">{value}/5</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card padding="lg" className="bg-gold/5 border-gold/20">
            <h3 className="font-medium text-gold mb-2">Suggestion for You</h3>
            <p className="text-mystic-300">{moodResult.suggestion}</p>
          </Card>

          {moodInfo.recommendation && (
            <Card padding="lg">
              <h3 className="font-medium text-mystic-200 mb-3">What to Do Today</h3>
              <p className="text-mystic-300 text-sm leading-relaxed">{moodInfo.recommendation}</p>
            </Card>
          )}

          {moodInfo.journalPrompt && (
            <Card padding="lg">
              <div className="flex items-center gap-3 mb-3">
                <BookOpen className="w-5 h-5 text-gold" />
                <h3 className="font-medium text-mystic-200">Reflection</h3>
              </div>
              <p className="text-mystic-300 text-sm italic leading-relaxed">{moodInfo.journalPrompt}</p>
            </Card>
          )}

          {moodInfo.tarotSuggestion && (
            <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-5 h-5 text-gold" />
                <h3 className="font-medium text-gold">Tarot Energy</h3>
              </div>
              <p className="text-mystic-300 text-sm leading-relaxed">{moodInfo.tarotSuggestion}</p>
            </Card>
          )}

          <Button variant="outline" fullWidth onClick={resetQuiz} className="min-h-[48px]">
            {tApp('quizzes.takeAnother', { defaultValue: 'Take Another Quiz' })}
          </Button>
        </div>
      );
    }

    if (result.quiz.type === 'extra-dimensional') {
      const extraResult = result.result as DimensionalResult;
      const scoringEntry = EXTRA_QUIZ_SCORING[result.quiz.id];
      if (!scoringEntry) return null;
      const info = scoringEntry.info[extraResult.primary];
      if (!info) return null;
      const quizKey = result.quiz.id.replace(/-v\d+$/, '');
      const resultKey = extraResult.primary;

      const localized = (path: string, fallback: string) =>
        tApp(`extraQuizzes.${quizKey}.results.${resultKey}.${path}`, { defaultValue: fallback }) as string;
      const name = localized('name', info.name);
      const tagline = localized('tagline', info.tagline);
      const summary = localized('summary', info.summary);
      const strengths = tApp(`extraQuizzes.${quizKey}.results.${resultKey}.strengths`, {
        returnObjects: true,
        defaultValue: info.strengths,
      }) as string[];
      const shadow = tApp(`extraQuizzes.${quizKey}.results.${resultKey}.shadow`, {
        returnObjects: true,
        defaultValue: info.shadow,
      }) as string[];
      const affirmation = localized('affirmation', info.affirmation);

      const maxScore = Math.max(...Object.values(extraResult.scores));

      const handleShare = async () => {
        try {
          const blob = await renderShareCard({
            title: name,
            subtitle: result.quiz.title,
            tagline,
            affirmation,
            brand: `Arcana · ${result.quiz.title}`,
          });
          const out = await shareOrDownload(blob, `arcana-${result.quiz.id}-${resultKey}.png`, `My ${result.quiz.title}: ${name}`);
          if (out === 'downloaded') toast(tApp('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
        } catch {
          toast(tApp('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
        }
      };

      return (
        <div className="space-y-4 pb-6">
          <button onClick={resetQuiz} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {tApp('quizzes.backToQuizzes', { defaultValue: 'Back to Quizzes' })}
          </button>

          <Card variant="glow" padding="lg" className="text-center">
            <div className="text-5xl mb-3">{scoringEntry.emoji}</div>
            <h2 className="heading-display-xl text-mystic-100">{name}</h2>
            <p className="text-gold/80 text-sm mt-3 italic">"{tagline}"</p>
          </Card>

          <Card padding="lg">
            <p className="text-mystic-300 text-sm leading-relaxed">{summary}</p>
          </Card>

          <Card padding="lg">
            <h3 className="font-medium text-mystic-200 mb-3">
              {tApp('extraQuizzes.common.scoreDistribution', { defaultValue: 'Score distribution' })}
            </h3>
            <div className="space-y-2">
              {scoringEntry.dimensions.map((d) => {
                const score = extraResult.scores[d] ?? 0;
                const isPrimary = d === extraResult.primary;
                const dimName = tApp(`extraQuizzes.${quizKey}.results.${d}.name`, {
                  defaultValue: scoringEntry.info[d]?.name ?? d,
                }) as string;
                return (
                  <div key={d} className="flex items-center gap-3">
                    <span className={`text-xs flex-1 ${isPrimary ? 'text-gold font-medium' : 'text-mystic-400'}`}>
                      {dimName}
                    </span>
                    <div className="flex-1 bg-mystic-800/40 rounded-full h-2 overflow-hidden max-w-[140px]">
                      <div
                        className={`h-full ${isPrimary ? 'bg-gold' : 'bg-mystic-600'}`}
                        style={{ width: `${maxScore > 0 ? (score / maxScore) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-mystic-500 w-6 text-right">{score}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card padding="lg">
              <h3 className="font-medium text-emerald-400 mb-3">
                {tApp('quizzes.resultSections.strengths', { defaultValue: 'Strengths' })}
              </h3>
              <ul className="space-y-2 text-mystic-300 text-sm">
                {strengths.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </Card>
            <Card padding="lg">
              <h3 className="font-medium text-pink-400 mb-3">
                {tApp('quizzes.resultSections.shadow', { defaultValue: 'Shadow side' })}
              </h3>
              <ul className="space-y-2 text-mystic-300 text-sm">
                {shadow.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </Card>
          </div>

          <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
            <h3 className="font-medium text-gold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {tApp('quizzes.resultSections.affirmation', { defaultValue: 'Your affirmation' })}
            </h3>
            <p className="text-mystic-200 italic leading-relaxed">"{affirmation}"</p>
          </Card>

          <AskOracleButton
            variant="card"
            context={`my ${result.quiz.title} result: ${name} (${tagline})`}
            label={tApp('quizzes.askOracleCta', { defaultValue: 'Read this result for me' }) as string}
          />

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" fullWidth className="min-h-[48px]" onClick={handleShare}>
              <Sparkles className="w-4 h-4 mr-2" />
              {tApp('quizzes.share.button', { defaultValue: 'Share' })}
            </Button>
            <Button variant="outline" fullWidth onClick={resetQuiz} className="min-h-[48px]">
              {tApp('quizzes.takeAnother', { defaultValue: 'Take Another' })}
            </Button>
          </div>
        </div>
      );
    }

    if (result.quiz.type === 'ayurveda-dosha') {
      const ayResult = result.result as ReturnType<typeof calculateDosha>;
      const primaryInfo = DOSHA_INFO[ayResult.primary];
      const secondaryInfo = ayResult.secondary ? DOSHA_INFO[ayResult.secondary] : null;
      const key = ayResult.primary;

      const localized = (path: string, fallback: string) =>
        tApp(`ayurveda.doshas.${key}.${path}`, { defaultValue: fallback }) as string;
      const primaryName = localized('name', primaryInfo.name);
      const elements = localized('elements', primaryInfo.elements);
      const tagline = localized('tagline', primaryInfo.tagline);
      const summary = localized('summary', primaryInfo.summary);
      const thriving = localized('thriving', primaryInfo.thriving);
      const outOfBalance = localized('outOfBalance', primaryInfo.outOfBalance);
      const dietTips = tApp(`ayurveda.doshas.${key}.dietTips`, {
        returnObjects: true,
        defaultValue: primaryInfo.dietTips,
      }) as string[];
      const lifestyleTips = tApp(`ayurveda.doshas.${key}.lifestyleTips`, {
        returnObjects: true,
        defaultValue: primaryInfo.lifestyleTips,
      }) as string[];
      const affirmation = localized('affirmation', primaryInfo.affirmation);

      const emoji: Record<string, string> = { vata: '🌬️', pitta: '🔥', kapha: '⛰️' };

      return (
        <div className="space-y-4 pb-6">
          <button onClick={resetQuiz} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {tApp('quizzes.backToQuizzes', { defaultValue: 'Back to Quizzes' })}
          </button>

          <Card variant="glow" padding="lg" className="text-center">
            <div className="text-6xl mb-3">{emoji[key] || '✦'}</div>
            <p className="text-xs text-mystic-500 tracking-widest uppercase">{elements}</p>
            <h2 className="heading-display-xl text-mystic-100 mt-2">{primaryName}</h2>
            {secondaryInfo && (
              <p className="text-sm text-cosmic-blue mt-2">
                {tApp('ayurveda.withSecondary', {
                  defaultValue: 'with secondary {{sec}}',
                  sec: tApp(`ayurveda.doshas.${ayResult.secondary}.name`, {
                    defaultValue: secondaryInfo.name,
                  }),
                })}
              </p>
            )}
            <p className="text-gold/80 text-sm mt-3 italic">"{tagline}"</p>
          </Card>

          <Card padding="lg">
            <p className="text-mystic-300 text-sm leading-relaxed">{summary}</p>
          </Card>

          <Card padding="lg">
            <h3 className="font-medium text-mystic-200 mb-3">
              {tApp('ayurveda.scoresLabel', { defaultValue: 'Your dosha balance' })}
            </h3>
            <div className="space-y-2">
              {(['vata', 'pitta', 'kapha'] as const).map((d) => (
                <div key={d} className="flex items-center gap-3">
                  <span className="text-lg w-8 text-center">{emoji[d]}</span>
                  <span className="text-sm text-mystic-300 flex-1">
                    {tApp(`ayurveda.doshas.${d}.name`, { defaultValue: DOSHA_INFO[d].name })}
                  </span>
                  <div className="flex-1 bg-mystic-800/40 rounded-full h-2 overflow-hidden max-w-[140px]">
                    <div
                      className={`h-full ${ayResult.primary === d ? 'bg-gold' : 'bg-mystic-600'}`}
                      style={{ width: `${(ayResult.scores[d] / 30) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-mystic-500 w-6 text-right">{ayResult.scores[d]}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="lg">
            <h3 className="font-medium text-emerald-400 mb-2">
              {tApp('ayurveda.thrivingLabel', { defaultValue: 'When you\'re in balance' })}
            </h3>
            <p className="text-mystic-300 text-sm leading-relaxed mb-4">{thriving}</p>
            <h3 className="font-medium text-pink-400 mb-2">
              {tApp('ayurveda.imbalancedLabel', { defaultValue: 'When you\'re out of balance' })}
            </h3>
            <p className="text-mystic-300 text-sm leading-relaxed">{outOfBalance}</p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card padding="lg">
              <h3 className="font-medium text-gold mb-3">
                {tApp('ayurveda.dietLabel', { defaultValue: 'Diet that suits you' })}
              </h3>
              <ul className="space-y-2 text-mystic-300 text-sm">
                {dietTips.map((tip, i) => <li key={i}>• {tip}</li>)}
              </ul>
            </Card>
            <Card padding="lg">
              <h3 className="font-medium text-gold mb-3">
                {tApp('ayurveda.lifestyleLabel', { defaultValue: 'Lifestyle that balances you' })}
              </h3>
              <ul className="space-y-2 text-mystic-300 text-sm">
                {lifestyleTips.map((tip, i) => <li key={i}>• {tip}</li>)}
              </ul>
            </Card>
          </div>

          <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
            <h3 className="font-medium text-gold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {tApp('ayurveda.affirmationLabel', { defaultValue: 'Your affirmation' })}
            </h3>
            <p className="text-mystic-200 italic leading-relaxed">"{affirmation}"</p>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              fullWidth
              className="min-h-[48px]"
              onClick={async () => {
                try {
                  const blob = await renderShareCard({
                    title: primaryName,
                    subtitle: elements,
                    tagline,
                    affirmation,
                    brand: 'Arcana · Ayurveda',
                  });
                  const out = await shareOrDownload(blob, `arcana-ayurveda-${key}.png`, `My Ayurvedic dosha: ${primaryName}`);
                  if (out === 'downloaded') toast(tApp('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
                } catch {
                  toast(tApp('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
                }
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {tApp('quizzes.share.button', { defaultValue: 'Share' })}
            </Button>
            <Button variant="outline" fullWidth onClick={resetQuiz} className="min-h-[48px]">
              {tApp('quizzes.takeAnother', { defaultValue: 'Take Another' })}
            </Button>
          </div>
        </div>
      );
    }

    if (result.quiz.type === 'shadow-archetype') {
      const shadowResult = result.result as ReturnType<typeof calculateShadowArchetype>;
      const info = SHADOW_ARCHETYPES[shadowResult.archetype];
      const key = shadowResult.archetype;
      const localized = (path: string, fallback: string) =>
        tApp(`quizzes.shadowArchetypes.${key}.${path}`, { defaultValue: fallback }) as string;
      const name = localized('name', info.name);
      const tagline = localized('tagline', info.tagline);
      const gift = localized('gift', info.gift);
      const shadow = localized('shadow', info.shadow);
      const integration = localized('integration', info.integration);
      const affirmation = localized('affirmation', info.affirmation);
      const tarotPairing = localized('tarotPairing', info.tarotPairing);

      return (
        <div className="space-y-4 pb-6">
          <button onClick={resetQuiz} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {tApp('quizzes.backToQuizzes', { defaultValue: 'Back to Quizzes' })}
          </button>

          <Card variant="glow" padding="lg" className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-gold/30 to-mystic-800 flex items-center justify-center border-2 border-gold/30">
              <Sparkles className="w-10 h-10 text-gold" />
            </div>
            <h2 className="heading-display-xl text-mystic-100">{name}</h2>
            <p className="text-gold/80 text-sm mt-2 italic">"{tagline}"</p>
          </Card>

          <Card padding="lg">
            <h3 className="font-medium text-emerald-400 mb-3">{tApp('quizzes.resultSections.gift', { defaultValue: 'The gift' })}</h3>
            <p className="text-mystic-300 text-sm leading-relaxed">{gift}</p>
          </Card>

          <Card padding="lg">
            <h3 className="font-medium text-pink-400 mb-3">{tApp('quizzes.resultSections.shadow', { defaultValue: 'Shadow side' })}</h3>
            <p className="text-mystic-300 text-sm leading-relaxed">{shadow}</p>
          </Card>

          <Card padding="lg">
            <h3 className="font-medium text-cosmic-blue mb-3">{tApp('quizzes.resultSections.integration', { defaultValue: 'Integration' })}</h3>
            <p className="text-mystic-300 text-sm leading-relaxed">{integration}</p>
          </Card>

          <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
            <h3 className="font-medium text-gold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {tApp('quizzes.resultSections.affirmation', { defaultValue: 'Your affirmation' })}
            </h3>
            <p className="text-mystic-200 italic leading-relaxed mb-4">"{affirmation}"</p>
            <p className="text-xs text-mystic-500">
              {tApp('quizzes.resultSections.tarotPairing', { defaultValue: 'Tarot pairing' })}: <span className="text-gold/80">{tarotPairing}</span>
            </p>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              fullWidth
              className="min-h-[48px]"
              onClick={async () => {
                try {
                  const blob = await renderShareCard({
                    title: name,
                    subtitle: tagline,
                    tagline: tarotPairing,
                    affirmation,
                    brand: 'Arcana · Shadow Archetype',
                  });
                  const outcome = await shareOrDownload(blob, `arcana-shadow-${key}.png`, `My shadow archetype is ${name}. ${tagline}`);
                  if (outcome === 'downloaded') toast(tApp('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
                } catch {
                  toast(tApp('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
                }
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {tApp('quizzes.share.button', { defaultValue: 'Share' })}
            </Button>
            <Button variant="outline" fullWidth onClick={resetQuiz} className="min-h-[48px]">
              {tApp('quizzes.takeAnother', { defaultValue: 'Take Another' })}
            </Button>
          </div>
        </div>
      );
    }

    if (result.quiz.type === 'element-affinity') {
      const elResult = result.result as ReturnType<typeof calculateElementAffinity>;
      const info = ELEMENT_INFO[elResult.primary];
      const key = elResult.primary;
      const localized = (path: string, fallback: string) =>
        tApp(`quizzes.elements.${key}.${path}`, { defaultValue: fallback }) as string;
      const name = localized('name', info.name);
      const tagline = localized('tagline', info.tagline);
      const description = localized('description', info.description);
      const strengths = tApp(`quizzes.elements.${key}.strengths`, { returnObjects: true, defaultValue: info.strengths }) as string[];
      const shadow = tApp(`quizzes.elements.${key}.shadow`, { returnObjects: true, defaultValue: info.shadow }) as string[];
      const whenDominant = localized('whenDominant', info.whenDominant);
      const affirmation = localized('affirmation', info.affirmation);

      // Compare behavioural element vs astro chart element (derived from birth date)
      const natalElement = profile?.birthDate ? getZodiacElement(getZodiacSign(profile.birthDate)) : null;
      const elementsMatch = natalElement && natalElement === elResult.primary;

      const glyphMap: Record<string, string> = { fire: '🔥', water: '🌊', air: '🌬️', earth: '🌱' };

      return (
        <div className="space-y-4 pb-6">
          <button onClick={resetQuiz} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {tApp('quizzes.backToQuizzes', { defaultValue: 'Back to Quizzes' })}
          </button>

          <Card variant="glow" padding="lg" className="text-center">
            <div className="text-6xl mb-3">{glyphMap[key] || '✦'}</div>
            <h2 className="heading-display-xl text-mystic-100">{name}</h2>
            <p className="text-gold/80 text-sm mt-2 italic">"{tagline}"</p>
          </Card>

          <Card padding="lg">
            <p className="text-mystic-300 text-sm leading-relaxed">{description}</p>
          </Card>

          {natalElement && (
            <Card padding="lg" className={elementsMatch ? 'border-emerald-400/30' : 'border-cosmic-blue/30'}>
              <h3 className="font-medium text-gold mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {tApp('quizzes.elements.chartVsBehaviour', { defaultValue: 'Chart vs. behaviour' })}
              </h3>
              <p className="text-sm text-mystic-300 leading-relaxed">
                {elementsMatch
                  ? tApp('quizzes.elements.matchNote', { defaultValue: 'Your behavioural element matches your astrology chart — you\'re living in alignment with your native energy.', element: name })
                  : tApp('quizzes.elements.differNote', { defaultValue: 'Your chart says {{natal}} but your behaviour says {{behaviour}} — worth noticing where you\'re stretching.', natal: natalElement, behaviour: name })}
              </p>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card padding="lg">
              <h3 className="font-medium text-emerald-400 mb-3">{tApp('quizzes.resultSections.strengths', { defaultValue: 'Strengths' })}</h3>
              <ul className="space-y-2 text-mystic-300 text-sm">
                {strengths.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </Card>
            <Card padding="lg">
              <h3 className="font-medium text-pink-400 mb-3">{tApp('quizzes.resultSections.shadow', { defaultValue: 'Shadow side' })}</h3>
              <ul className="space-y-2 text-mystic-300 text-sm">
                {shadow.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </Card>
          </div>

          <Card padding="lg">
            <h3 className="font-medium text-cosmic-blue mb-3">{tApp('quizzes.resultSections.whenDominant', { defaultValue: 'When this element is dominant' })}</h3>
            <p className="text-mystic-300 text-sm leading-relaxed">{whenDominant}</p>
          </Card>

          <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
            <h3 className="font-medium text-gold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {tApp('quizzes.resultSections.affirmation', { defaultValue: 'Your affirmation' })}
            </h3>
            <p className="text-mystic-200 italic leading-relaxed">"{affirmation}"</p>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              fullWidth
              className="min-h-[48px]"
              onClick={async () => {
                try {
                  const blob = await renderShareCard({
                    title: name,
                    subtitle: tagline,
                    tagline: affirmation,
                    affirmation: whenDominant,
                    brand: 'Arcana · Element Affinity',
                  });
                  const outcome = await shareOrDownload(blob, `arcana-element-${key}.png`, `My element is ${name}. ${tagline}`);
                  if (outcome === 'downloaded') toast(tApp('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
                } catch {
                  toast(tApp('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
                }
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {tApp('quizzes.share.button', { defaultValue: 'Share' })}
            </Button>
            <Button variant="outline" fullWidth onClick={resetQuiz} className="min-h-[48px]">
              {tApp('quizzes.takeAnother', { defaultValue: 'Take Another' })}
            </Button>
          </div>
        </div>
      );
    }

    if (result.quiz.type === 'court-match') {
      const courtResult = result.result as ReturnType<typeof calculateCourtMatch>;
      const info = getCourtCardInfo(courtResult.courtCard);
      const cardKey = courtResult.courtCard;
      const localized = (path: string, fallback: string | string[]) =>
        tApp(`quizzes.courtCards.${cardKey}.${path}`, { defaultValue: fallback });
      const name = localized('name', info.name) as string;
      const tagline = localized('tagline', info.tagline) as string;
      const archetype = localized('archetype', info.archetype) as string;
      const strengths = tApp(`quizzes.courtCards.${cardKey}.strengths`, { returnObjects: true, defaultValue: info.strengths }) as string[];
      const shadow = tApp(`quizzes.courtCards.${cardKey}.shadow`, { returnObjects: true, defaultValue: info.shadow }) as string[];
      const whenDrawn = localized('whenDrawn', info.whenDrawn) as string;
      const affirmation = localized('affirmation', info.affirmation) as string;

      return (
        <div className="space-y-4 pb-6">
          <button onClick={resetQuiz} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {tApp('quizzes.backToQuizzes', { defaultValue: 'Back to Quizzes' })}
          </button>

          <Card variant="glow" padding="lg" className="text-center">
            <div className="mx-auto mb-4 w-28 h-40 rounded-xl bg-gradient-to-br from-gold/30 via-mystic-800 to-mystic-900 border-2 border-gold/30 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.2)_0%,transparent_70%)]" />
              <div className="relative">
                <Sparkles className="w-8 h-8 text-gold mx-auto mb-1" />
                <span className="text-xs tracking-widest text-gold/70 uppercase">{archetype}</span>
              </div>
            </div>
            <h2 className="heading-display-xl text-mystic-100">{name}</h2>
            <p className="text-gold/80 text-sm mt-2 italic">"{tagline}"</p>
          </Card>

          <Card padding="lg">
            <h3 className="font-medium text-mystic-200 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold" />
              {tApp('quizzes.resultSections.whenDrawn', { defaultValue: 'When this card appears' })}
            </h3>
            <p className="text-mystic-300 text-sm leading-relaxed">{whenDrawn}</p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card padding="lg">
              <h3 className="font-medium text-emerald-400 mb-3">
                {tApp('quizzes.resultSections.strengths', { defaultValue: 'Strengths' })}
              </h3>
              <ul className="space-y-2 text-mystic-300 text-sm">
                {strengths.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </Card>
            <Card padding="lg">
              <h3 className="font-medium text-pink-400 mb-3">
                {tApp('quizzes.resultSections.shadow', { defaultValue: 'Shadow side' })}
              </h3>
              <ul className="space-y-2 text-mystic-300 text-sm">
                {shadow.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </Card>
          </div>

          <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
            <h3 className="font-medium text-gold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {tApp('quizzes.resultSections.affirmation', { defaultValue: 'Your affirmation' })}
            </h3>
            <p className="text-mystic-200 italic leading-relaxed">"{affirmation}"</p>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              fullWidth
              className="min-h-[48px]"
              onClick={async () => {
                try {
                  const blob = await renderShareCard({
                    title: name,
                    subtitle: archetype,
                    tagline,
                    affirmation,
                    brand: 'Arcana · Tarot Court Card Match',
                  });
                  const outcome = await shareOrDownload(
                    blob,
                    `arcana-${cardKey}.png`,
                    `My tarot court card is the ${name}. ${tagline}`,
                  );
                  if (outcome === 'downloaded') {
                    toast(tApp('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
                  }
                } catch {
                  toast(tApp('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
                }
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {tApp('quizzes.share.button', { defaultValue: 'Share' })}
            </Button>
            <Button variant="outline" fullWidth onClick={resetQuiz} className="min-h-[48px]">
              {tApp('quizzes.takeAnother', { defaultValue: 'Take Another' })}
            </Button>
          </div>
        </div>
      );
    }

    if (result.quiz.type === 'mbti') {
      const mbtiResult = result.result as { type: string; dimensions: Record<string, number> };
      const typeInfo = mbtiDescriptions[mbtiResult.type];

      const CollapsibleSection = ({
        title,
        icon: Icon,
        sectionKey,
        children,
      }: {
        title: string;
        icon: React.ComponentType<{ className?: string }>;
        sectionKey: string;
        children: React.ReactNode;
      }) => {
        const isExpanded = expandedSections[sectionKey] ?? true;
        return (
          <Card padding="lg">
            <button
              onClick={() => toggleSection(sectionKey)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-gold" />
                <h3 className="font-medium text-mystic-200">{title}</h3>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-mystic-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-mystic-500" />
              )}
            </button>
            {isExpanded && <div className="mt-4">{children}</div>}
          </Card>
        );
      };

      return (
        <div className="space-y-4 pb-6">
          <button onClick={resetQuiz} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Quizzes
          </button>

          <Card variant="glow" padding="lg" className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-gold/30 to-mystic-800 flex items-center justify-center border-2 border-gold/30">
              <span className="font-display text-3xl text-gold">{mbtiResult.type}</span>
            </div>
            <h2 className="heading-display-lg text-mystic-100">{typeInfo?.title}</h2>
            <p className="text-gold/80 text-sm mb-3">{typeInfo?.subtitle}</p>
            <p className="text-mystic-300 leading-relaxed">{typeInfo?.description}</p>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => saveToProfile('mbti', mbtiResult.type)}
              disabled={saving}
              className="min-h-[44px]"
            >
              <Bookmark className="w-4 h-4 mr-2" />
              Save to Profile
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => shareResult('mbti', mbtiResult.type)}
              className="min-h-[44px]"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>

          <CollapsibleSection title="Strengths" icon={Sparkles} sectionKey="strengths">
            <ul className="space-y-2">
              {typeInfo?.strengths.map((strength, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-mystic-300 text-sm">{strength}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title={tApp('quizzes.resultSections.blindSpots')} icon={AlertTriangle} sectionKey="blindspots">
            <ul className="space-y-2">
              {typeInfo?.blindSpots.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-4 h-4 rounded-full bg-orange-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  </div>
                  <span className="text-mystic-300 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title={tApp('quizzes.resultSections.underStress')} icon={Zap} sectionKey="stress">
            <ul className="space-y-2">
              {typeInfo?.underStress.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-4 h-4 rounded-full bg-red-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  </div>
                  <span className="text-mystic-300 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title={tApp('quizzes.resultSections.inRelationships')} icon={HeartHandshake} sectionKey="relationships">
            <ul className="space-y-2">
              {typeInfo?.inRelationships.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Heart className="w-4 h-4 text-cosmic-rose flex-shrink-0 mt-0.5" />
                  <span className="text-mystic-300 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title={tApp('quizzes.resultSections.atWork')} icon={Briefcase} sectionKey="work">
            <ul className="space-y-2">
              {typeInfo?.atWork.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-4 h-4 rounded-full bg-cosmic-blue/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-cosmic-blue" />
                  </div>
                  <span className="text-mystic-300 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title={tApp('quizzes.resultSections.growthQuests')} icon={Target} sectionKey="growth">
            <div className="space-y-4">
              {typeInfo?.growthQuests.map((quest, i) => (
                <div key={i} className="p-4 bg-gold/5 border border-gold/20 rounded-xl">
                  <h4 className="font-medium text-gold text-sm mb-1">{quest.title}</h4>
                  <p className="text-mystic-400 text-sm">{quest.description}</p>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {typeInfo?.stressSignature && (
            <CollapsibleSection title={tApp('quizzes.resultSections.stressSignature')} icon={Zap} sectionKey="stressSignature">
              <p className="text-mystic-300 text-sm leading-relaxed">{typeInfo.stressSignature}</p>
              {typeInfo.recoveryPath && (
                <div className="mt-4 p-4 bg-emerald-900/20 border border-emerald-500/20 rounded-xl">
                  <p className="text-xs text-emerald-400 uppercase tracking-wide mb-2">{tApp('quizzes.resultSections.recoveryPath')}</p>
                  <p className="text-mystic-300 text-sm">{typeInfo.recoveryPath}</p>
                </div>
              )}
            </CollapsibleSection>
          )}

          {typeInfo?.realLifeExamples && typeInfo.realLifeExamples.length > 0 && (
            <CollapsibleSection title={tApp('quizzes.resultSections.realLifeExamples')} icon={Compass} sectionKey="realLife">
              <ul className="space-y-2">
                {typeInfo.realLifeExamples.map((example, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0 mt-2" />
                    <span className="text-mystic-300 text-sm">{example}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}

          {typeInfo?.tarotArchetype && (
            <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-5 h-5 text-gold" />
                <h3 className="font-medium text-gold">Tarot Archetype</h3>
              </div>
              <p className="text-lg font-display text-mystic-100 mb-2">{typeInfo.tarotArchetype.card}</p>
              <p className="text-mystic-400 text-sm leading-relaxed">{typeInfo.tarotArchetype.reason}</p>
            </Card>
          )}

          {typeInfo?.miniRitual && (
            <Card padding="lg" className="bg-gold/5 border-gold/20">
              <div className="flex items-center gap-3 mb-3">
                <BookOpen className="w-5 h-5 text-gold" />
                <h3 className="font-medium text-gold">Mini Ritual</h3>
              </div>
              <p className="text-mystic-300 text-sm leading-relaxed italic">{typeInfo.miniRitual}</p>
              {typeInfo.journalPrompt && (
                <div className="mt-4 p-3 bg-mystic-800/50 rounded-lg">
                  <p className="text-xs text-mystic-500 uppercase tracking-wide mb-1">Journal Prompt</p>
                  <p className="text-mystic-300 text-sm italic">{typeInfo.journalPrompt}</p>
                </div>
              )}
            </Card>
          )}

          <Card padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-gold" />
              <h3 className="font-medium text-mystic-200">{tApp('quizzes.resultSections.compatibleTypes', { defaultValue: 'Compatible Types' })}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {typeInfo?.compatibility.map((type, i) => (
                <span key={i} className="px-4 py-2 bg-cosmic-blue/20 text-cosmic-blue rounded-full text-sm font-medium">
                  {type}
                </span>
              ))}
            </div>
          </Card>

          <Button variant="outline" fullWidth onClick={resetQuiz} className="min-h-[48px]">
            {tApp('quizzes.takeAnother', { defaultValue: 'Take Another Quiz' })}
          </Button>
        </div>
      );
    }

    if (result.quiz.id === 'big-five-v1') {
      const bfResult = result.result as ReturnType<typeof calculateBigFive>;
      const dimensions = [
        { key: 'openness', label: 'Openness', color: 'cosmic-blue' },
        { key: 'conscientiousness', label: 'Conscientiousness', color: 'emerald-400' },
        { key: 'extraversion', label: 'Extraversion', color: 'gold' },
        { key: 'agreeableness', label: 'Agreeableness', color: 'cosmic-rose' },
        { key: 'neuroticism', label: tApp('quizzes.resultSections.emotionalStability'), color: 'mystic-300' },
      ];

      return (
        <div className="space-y-4 pb-6">
          <button onClick={resetQuiz} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Quizzes
          </button>

          <Card variant="glow" padding="lg" className="text-center">
            <Pentagon className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h2 className="heading-display-lg text-mystic-100 mb-2">Your Big Five Profile</h2>
            <p className="text-mystic-400 text-sm">Five dimensions that define your personality</p>
          </Card>

          <Card padding="lg">
            <h3 className="font-medium text-mystic-200 mb-4">Your Trait Scores</h3>
            <div className="space-y-4">
              {dimensions.map(({ key, label, color }) => {
                const score = bfResult[key as keyof typeof bfResult] as number;
                const isHigh = score >= 60;
                const isLow = score <= 40;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-mystic-300">{label}</span>
                      <span className={`text-${color}`}>{score}%</span>
                    </div>
                    <Progress value={score} variant={score >= 50 ? 'gold' : 'default'} size="sm" />
                    <p className="text-xs text-mystic-500 mt-1">
                      {isHigh ? tApp('quizzes.resultSections.higherThanAverage') : isLow ? tApp('quizzes.resultSections.lowerThanAverage') : tApp('quizzes.resultSections.averageRange')}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>

          {dimensions.map(({ key, label }) => {
            const score = bfResult[key as keyof typeof bfResult] as number;
            const info = bigFiveDescriptions[key];
            const isHigh = score >= 50;
            return (
              <Card key={key} padding="lg">
                <div className="flex items-center gap-3 mb-3">
                  {isHigh ? <TrendingUp className="w-5 h-5 text-emerald-400" /> : <TrendingDown className="w-5 h-5 text-cosmic-blue" />}
                  <h3 className="font-medium text-mystic-200">{label}</h3>
                </div>
                <p className="text-mystic-400 text-sm mb-4">
                  {isHigh ? info.highDescription : info.lowDescription}
                </p>
                <div className="space-y-2">
                  <p className="text-xs text-mystic-500 uppercase">Growth Tips</p>
                  {(isHigh ? info.growthTips.high : info.growthTips.low).slice(0, 2).map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                      <span className="text-mystic-300 text-sm">{tip}</span>
                    </div>
                  ))}
                </div>
                {info.growthLever && (
                  <div className="mt-4 p-3 bg-gold/5 border border-gold/20 rounded-lg">
                    <p className="text-xs text-gold uppercase tracking-wide mb-1">Growth Lever</p>
                    <p className="text-mystic-300 text-sm">{isHigh ? info.growthLever.high : info.growthLever.low}</p>
                  </div>
                )}
                {info.tarotArchetype && (
                  <div className="mt-4 p-3 bg-mystic-800/50 rounded-lg">
                    <p className="text-xs text-mystic-500 uppercase tracking-wide mb-1">Tarot Archetype</p>
                    <p className="text-sm text-gold font-medium">{isHigh ? info.tarotArchetype.high.card : info.tarotArchetype.low.card}</p>
                    <p className="text-mystic-400 text-xs mt-1">{isHigh ? info.tarotArchetype.high.reason : info.tarotArchetype.low.reason}</p>
                  </div>
                )}
              </Card>
            );
          })}

          <Button variant="outline" fullWidth onClick={resetQuiz} className="min-h-[48px]">
            {tApp('quizzes.takeAnother', { defaultValue: 'Take Another Quiz' })}
          </Button>
        </div>
      );
    }

    if (result.quiz.type === 'enneagram') {
      const enResult = result.result as ReturnType<typeof calculateEnneagram>;
      const typeInfo = enneagramDescriptions[enResult.primaryType];
      const wingInfo = enResult.wing ? enneagramDescriptions[enResult.wing] : null;

      return (
        <div className="space-y-4 pb-6">
          <button onClick={resetQuiz} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Quizzes
          </button>

          <Card variant="glow" padding="lg" className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-gold/30 to-mystic-800 flex items-center justify-center border-2 border-gold/30">
              <span className="font-display text-4xl text-gold">{enResult.primaryType}</span>
            </div>
            <h2 className="heading-display-lg text-mystic-100">{typeInfo.name}</h2>
            <p className="text-gold/80 text-sm mb-2">{typeInfo.title}</p>
            {enResult.wing && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-mystic-800/50 rounded-full">
                <span className="text-xs text-mystic-500">Wing:</span>
                <span className="text-sm text-mystic-300">{enResult.wing} - {wingInfo?.name}</span>
              </div>
            )}
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => saveToProfile('enneagram', String(enResult.primaryType), { enneagram_wing: enResult.wing })}
              disabled={saving}
              className="min-h-[44px]"
            >
              <Bookmark className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => shareResult('enneagram', `Type ${enResult.primaryType} (${typeInfo.name})`)}
              className="min-h-[44px]"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>

          <Card padding="lg">
            <h3 className="font-medium text-mystic-200 mb-3">Core Pattern</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-gold flex-shrink-0" />
                <div>
                  <p className="text-xs text-mystic-500">Core Motivation</p>
                  <p className="text-mystic-300 text-sm">{typeInfo.coreMotivation}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-mystic-500">Core Fear</p>
                  <p className="text-mystic-300 text-sm">{typeInfo.coreFear}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Heart className="w-5 h-5 text-cosmic-rose flex-shrink-0" />
                <div>
                  <p className="text-xs text-mystic-500">Core Desire</p>
                  <p className="text-mystic-300 text-sm">{typeInfo.coreDesire}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <p className="text-mystic-300 leading-relaxed">{typeInfo.description}</p>
          </Card>

          <Card padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h3 className="font-medium text-mystic-200">Growth Direction</h3>
            </div>
            <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-mystic-400">{tApp('quizzes.resultSections.enneagramType', { defaultValue: 'Type {{n}}', n: enResult.primaryType })}</span>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-medium">{tApp('quizzes.resultSections.enneagramType', { defaultValue: 'Type {{n}}', n: typeInfo.growthPath.direction })}</span>
              </div>
              <p className="text-mystic-300 text-sm">{typeInfo.growthPath.description}</p>
            </div>
          </Card>

          <Card padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <TrendingDown className="w-5 h-5 text-orange-400" />
              <h3 className="font-medium text-mystic-200">Stress Direction</h3>
            </div>
            <div className="p-4 bg-orange-900/20 border border-orange-500/30 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-mystic-400">{tApp('quizzes.resultSections.enneagramType', { defaultValue: 'Type {{n}}', n: enResult.primaryType })}</span>
                <ArrowRight className="w-4 h-4 text-orange-400" />
                <span className="text-orange-400 font-medium">{tApp('quizzes.resultSections.enneagramType', { defaultValue: 'Type {{n}}', n: typeInfo.stressPath.direction })}</span>
              </div>
              <p className="text-mystic-300 text-sm">{typeInfo.stressPath.description}</p>
            </div>
          </Card>

          <Card padding="lg" className="bg-gold/5 border-gold/20">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="w-5 h-5 text-gold" />
              <h3 className="font-medium text-gold">Growth Practices</h3>
            </div>
            <ul className="space-y-2">
              {typeInfo.growthPractices.map((practice, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                  <span className="text-mystic-300 text-sm">{practice}</span>
                </li>
              ))}
            </ul>
          </Card>

          {typeInfo.realLifeExamples && typeInfo.realLifeExamples.length > 0 && (
            <Card padding="lg">
              <div className="flex items-center gap-3 mb-4">
                <Compass className="w-5 h-5 text-mystic-300" />
                <h3 className="font-medium text-mystic-200">Real Life Examples</h3>
              </div>
              <ul className="space-y-2">
                {typeInfo.realLifeExamples.map((example, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0 mt-2" />
                    <span className="text-mystic-300 text-sm">{example}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {typeInfo.tarotArchetype && (
            <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-5 h-5 text-gold" />
                <h3 className="font-medium text-gold">Tarot Archetype</h3>
              </div>
              <p className="text-lg font-display text-mystic-100 mb-2">{typeInfo.tarotArchetype.card}</p>
              <p className="text-mystic-400 text-sm leading-relaxed">{typeInfo.tarotArchetype.reason}</p>
            </Card>
          )}

          {typeInfo.miniRitual && (
            <Card padding="lg" className="bg-gold/5 border-gold/20">
              <div className="flex items-center gap-3 mb-3">
                <BookOpen className="w-5 h-5 text-gold" />
                <h3 className="font-medium text-gold">Mini Ritual</h3>
              </div>
              <p className="text-mystic-300 text-sm leading-relaxed italic">{typeInfo.miniRitual}</p>
              {typeInfo.journalPrompt && (
                <div className="mt-4 p-3 bg-mystic-800/50 rounded-lg">
                  <p className="text-xs text-mystic-500 uppercase tracking-wide mb-1">Journal Prompt</p>
                  <p className="text-mystic-300 text-sm italic">{typeInfo.journalPrompt}</p>
                </div>
              )}
            </Card>
          )}

          <Button variant="outline" fullWidth onClick={resetQuiz} className="min-h-[48px]">
            {tApp('quizzes.takeAnother', { defaultValue: 'Take Another Quiz' })}
          </Button>
        </div>
      );
    }

    if (result.quiz.id === 'attachment-v1') {
      const atResult = result.result as ReturnType<typeof calculateAttachment>;
      const styleInfo = attachmentDescriptions[atResult.style];

      const styleColors: Record<string, string> = {
        secure: 'emerald-400',
        anxious: 'cosmic-rose',
        avoidant: 'cosmic-blue',
        'fearful-avoidant': 'orange-400',
      };

      return (
        <div className="space-y-4 pb-6">
          <button onClick={resetQuiz} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Quizzes
          </button>

          <Card variant="glow" padding="lg" className="text-center">
            <Shield className={`w-16 h-16 text-${styleColors[atResult.style]} mx-auto mb-4`} />
            <p className="text-sm text-mystic-500 mb-1">Your Attachment Style</p>
            <h2 className="heading-display-lg text-mystic-100 mb-2">{styleInfo.name}</h2>
            <p className="text-mystic-400 text-sm">{styleInfo.subtitle}</p>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => saveToProfile('attachment', atResult.style)}
              disabled={saving}
              className="min-h-[44px]"
            >
              <Bookmark className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => shareResult('attachment', styleInfo.name)}
              className="min-h-[44px]"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>

          <Card padding="lg">
            <h3 className="font-medium text-mystic-200 mb-4">Your Dimensions</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-mystic-300">Anxiety</span>
                  <span className="text-cosmic-rose">{atResult.anxiety}%</span>
                </div>
                <Progress value={atResult.anxiety} variant="default" size="sm" />
                <p className="text-xs text-mystic-500 mt-1">Fear of abandonment and need for reassurance</p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-mystic-300">Avoidance</span>
                  <span className="text-cosmic-blue">{atResult.avoidance}%</span>
                </div>
                <Progress value={atResult.avoidance} variant="default" size="sm" />
                <p className="text-xs text-mystic-500 mt-1">Discomfort with closeness and dependence</p>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <h3 className="font-medium text-mystic-200 mb-3">What This Means</h3>
            <p className="text-mystic-400 text-sm leading-relaxed">{styleInfo.description}</p>
          </Card>

          <Card padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <HeartHandshake className="w-5 h-5 text-cosmic-rose" />
              <h3 className="font-medium text-mystic-200">In Relationships</h3>
            </div>
            <ul className="space-y-2">
              {styleInfo.inRelationships.slice(0, 4).map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Heart className="w-4 h-4 text-cosmic-rose flex-shrink-0 mt-0.5" />
                  <span className="text-mystic-300 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <h3 className="font-medium text-mystic-200">Common Triggers</h3>
            </div>
            <ul className="space-y-2">
              {styleInfo.triggers.map((trigger, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 mt-2" />
                  <span className="text-mystic-300 text-sm">{trigger}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="lg" className="bg-gold/5 border-gold/20">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="w-5 h-5 text-gold" />
              <h3 className="font-medium text-gold">Healing Practices</h3>
            </div>
            <ul className="space-y-2">
              {styleInfo.healingPractices.map((practice, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                  <span className="text-mystic-300 text-sm">{practice}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <Focus className="w-5 h-5 text-mystic-400" />
              <h3 className="font-medium text-mystic-200">Journal Prompts</h3>
            </div>
            <div className="space-y-3">
              {styleInfo.journalPrompts.slice(0, 3).map((prompt, i) => (
                <div key={i} className="p-3 bg-mystic-800/50 rounded-lg">
                  <p className="text-mystic-300 text-sm italic">{prompt}</p>
                </div>
              ))}
            </div>
          </Card>

          {styleInfo.pathToSecure && (
            <Card padding="lg">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h3 className="font-medium text-mystic-200">Path to Secure</h3>
              </div>
              <p className="text-mystic-300 text-sm leading-relaxed">{styleInfo.pathToSecure}</p>
            </Card>
          )}

          {styleInfo.miniRitual && (
            <Card padding="lg" className="bg-gold/5 border-gold/20">
              <div className="flex items-center gap-3 mb-3">
                <BookOpen className="w-5 h-5 text-gold" />
                <h3 className="font-medium text-gold">Mini Ritual</h3>
              </div>
              <p className="text-mystic-300 text-sm leading-relaxed italic">{styleInfo.miniRitual}</p>
            </Card>
          )}

          {styleInfo.tarotArchetype && (
            <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-5 h-5 text-gold" />
                <h3 className="font-medium text-gold">Tarot Archetype</h3>
              </div>
              <p className="text-lg font-display text-mystic-100 mb-2">{styleInfo.tarotArchetype.card}</p>
              <p className="text-mystic-400 text-sm leading-relaxed">{styleInfo.tarotArchetype.reason}</p>
            </Card>
          )}

          <Button variant="outline" fullWidth onClick={resetQuiz} className="min-h-[48px]">
            {tApp('quizzes.takeAnother', { defaultValue: 'Take Another Quiz' })}
          </Button>
        </div>
      );
    }

    const llResult = result.result as { primary: string; scores: Record<string, number> };
    const sortedLanguages = Object.entries(llResult.scores).sort((a, b) => b[1] - a[1]);
    const primaryLang = sortedLanguages[0][0];
    const secondaryLang = sortedLanguages[1][0];
    const primaryInfo = loveLanguageDescriptions[primaryLang];
    const secondaryInfo = loveLanguageDescriptions[secondaryLang];

    return (
      <div className="space-y-4 pb-6">
        <button onClick={resetQuiz} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Quizzes
        </button>

        <Card variant="glow" padding="lg" className="text-center">
          <Heart className="w-16 h-16 text-cosmic-rose mx-auto mb-4" />
          <p className="text-sm text-mystic-500 mb-1">Your Primary Love Language</p>
          <h2 className="heading-display-lg text-mystic-100 mb-4">{primaryInfo?.title}</h2>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-mystic-800/50 rounded-full">
            <span className="text-xs text-mystic-500">Secondary:</span>
            <span className="text-sm text-mystic-300">{secondaryInfo?.title}</span>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="outline"
            fullWidth
            onClick={() => saveToProfile('love-language', primaryLang)}
            disabled={saving}
            className="min-h-[44px]"
          >
            <Bookmark className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => shareResult('love-language', primaryInfo?.title || primaryLang)}
            className="min-h-[44px]"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button
            variant="outline"
            fullWidth
            className="min-h-[44px] opacity-60"
            disabled
          >
            <Lock className="w-4 h-4 mr-2" />
            Compare
          </Button>
        </div>

        <Card padding="lg">
          <h3 className="font-medium text-mystic-200 mb-4">Your Scores</h3>
          <div className="space-y-4">
            {sortedLanguages.map(([lang, score], index) => {
              const info = loveLanguageDescriptions[lang];
              const isPrimary = index === 0;
              return (
                <div key={lang}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={isPrimary ? 'text-gold font-medium' : 'text-mystic-300'}>
                      {info?.title || lang}
                      {isPrimary && ' (Primary)'}
                      {index === 1 && ' (Secondary)'}
                    </span>
                    <span className="text-gold">{score}</span>
                  </div>
                  <Progress value={score} max={15} variant={isPrimary ? 'gold' : 'default'} size="sm" />
                </div>
              );
            })}
          </div>
        </Card>

        <Card padding="lg">
          <h3 className="font-medium text-mystic-200 mb-3">What It Means</h3>
          <p className="text-mystic-400 text-sm leading-relaxed">{primaryInfo?.whatItMeans}</p>
        </Card>

        <Card padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="font-medium text-mystic-200">What You Need</h3>
          </div>
          <ul className="space-y-2">
            {primaryInfo?.whatYouNeed.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 mt-2" />
                <span className="text-mystic-300 text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <XCircle className="w-5 h-5 text-red-400" />
            <h3 className="font-medium text-mystic-200">What to Avoid</h3>
          </div>
          <ul className="space-y-2">
            {primaryInfo?.whatToAvoid.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-2" />
                <span className="text-mystic-300 text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card padding="lg" className="bg-gold/5 border-gold/20">
          <div className="flex items-center gap-3 mb-4">
            <ListChecks className="w-5 h-5 text-gold" />
            <h3 className="font-medium text-gold">Try This Week</h3>
          </div>
          <div className="space-y-3">
            {primaryInfo?.weeklyChecklist.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-mystic-900/50 rounded-lg">
                <span className="text-mystic-300 text-sm flex-1">{item.task}</span>
                <span className="text-xs text-gold/70 ml-3 whitespace-nowrap">{item.frequency}</span>
              </div>
            ))}
          </div>
        </Card>

        {primaryInfo?.whenHealthy && (
          <Card padding="lg">
            <h3 className="font-medium text-emerald-400 mb-3">When This Language Is Well-Fed</h3>
            <p className="text-mystic-300 text-sm leading-relaxed">{primaryInfo.whenHealthy}</p>
          </Card>
        )}

        {primaryInfo?.whenDeprived && (
          <Card padding="lg">
            <h3 className="font-medium text-orange-400 mb-3">When This Language Goes Unmet</h3>
            <p className="text-mystic-300 text-sm leading-relaxed">{primaryInfo.whenDeprived}</p>
          </Card>
        )}

        {primaryInfo?.howToAskForIt && primaryInfo.howToAskForIt.length > 0 && (
          <Card padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <Heart className="w-5 h-5 text-cosmic-rose" />
              <h3 className="font-medium text-mystic-200">How to Ask for It</h3>
            </div>
            <div className="space-y-3">
              {primaryInfo.howToAskForIt.map((phrase, i) => (
                <div key={i} className="p-3 bg-mystic-800/50 rounded-lg">
                  <p className="text-mystic-300 text-sm italic">&ldquo;{phrase}&rdquo;</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {primaryInfo?.tarotArchetype && (
          <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="w-5 h-5 text-gold" />
              <h3 className="font-medium text-gold">Tarot Archetype</h3>
            </div>
            <p className="text-lg font-display text-mystic-100 mb-2">{primaryInfo.tarotArchetype.card}</p>
            <p className="text-mystic-400 text-sm leading-relaxed">{primaryInfo.tarotArchetype.reason}</p>
          </Card>
        )}

        <Button variant="outline" fullWidth onClick={resetQuiz} className="min-h-[48px]">
          Take Another Quiz
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="heading-display-lg text-mystic-100">{tApp('quizzes.title')}</h1>
        <p className="text-mystic-400 mt-1">{tApp('quizzes.subtitle')}</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="loading-constellation mx-auto mb-4" />
          <p className="text-mystic-400">{tApp('quizzes.loading', { defaultValue: 'Loading...' })}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quizzes.map(({ quiz, type, metadata }) => {
            const Icon = iconMap[metadata.icon] || Sparkles;
            const lastResult = getLastResult(type);
            const hasResult = !!lastResult;

            return (
              <Card
                key={quiz.id}
                interactive
                padding="lg"
                onClick={() => startQuiz(quiz)}
                className="active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-mystic-800 flex items-center justify-center flex-shrink-0 text-${metadata.color}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-mystic-100">{quiz.title}</h3>
                      {hasResult ? (
                        <RefreshCw className="w-4 h-4 text-mystic-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-mystic-500" />
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-mystic-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {metadata.timeEstimate}
                      </span>
                      {hasResult && lastResult.completed_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(lastResult.completed_at)}
                        </span>
                      )}
                    </div>

                    {hasResult && lastResult.label && (
                      <div className="mb-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gold/10 text-gold">
                          <Zap className="w-3 h-3" />
                          {/* DB labels may still contain the English "Type N" prefix from prior
                              quiz runs before the enneagramType i18n lookup landed — translate
                              it on render so historical results don't stay English. */}
                          {lastResult.label.replace(/^Type\s+(\d+)/, (_m, n) => tApp('quizzes.resultSections.enneagramType', { defaultValue: 'Type {{n}}', n }))}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {metadata.whatYouGet.slice(0, 3).map((item, i) => (
                        <span key={i} className="px-2 py-0.5 bg-mystic-800/50 rounded text-xs text-mystic-400">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

        </div>
      )}
    </div>
  );
}
