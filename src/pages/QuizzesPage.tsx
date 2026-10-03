import { useEffect, useMemo, useState } from 'react';
import { Page, PageHeader, toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import { useFeatureFlag } from '../context/FeatureFlagContext';
import { supabase } from '../lib/supabase'; // profile writes (owned by the AuthContext pattern)
import { quizResults as quizResultsDal } from '../dal';
import { adsService } from '../services/ads';
import { awardXP } from '../services/levelSystem';
import { ratePromptService } from '../services/ratePrompt';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';
import { localizeQuiz, localizeQuizMetadata, localizeExtraQuizMetadata } from '../i18n/localizeQuiz';
import { mbtiQuiz, loveLanguageQuiz, moodCheckQuiz, quizMetadata } from '../data/quizzes';
import { bigFiveQuiz } from '../data/bigFiveQuiz';
import { enneagramQuiz } from '../data/enneagramQuiz';
import { attachmentQuiz } from '../data/attachmentQuiz';
import { mbtiQuickQuiz } from '../data/mbtiQuickQuiz';
import { tarotCourtQuiz } from '../data/tarotCourtQuiz';
import { shadowArchetypeQuiz } from '../data/shadowArchetypeQuiz';
import { elementAffinityQuiz } from '../data/elementAffinityQuiz';
import { ayurvedaQuiz } from '../data/ayurvedaQuiz';
import { EXTRA_QUIZZES, EXTRA_QUIZ_METADATA } from '../data/extraQuizzes';
import type { QuizDefinition } from '../types';
import { QuizList, type QuizListEntry } from '../components/quizzes/QuizList';
import { QuizQuestionView } from '../components/quizzes/QuizQuestionView';
import { QuizResultView } from '../components/quizzes/results';
import { scoreQuiz, quizTypeForDb } from '../components/quizzes/scoring';

/**
 * The quizzes page is a thin shell: the registry, the three states (list,
 * taking, results) and the side effects of finishing a quiz. Everything
 * that draws lives in src/components/quizzes — the list, the question
 * frame, one result renderer per quiz type — and everything that scores
 * lives in the data modules behind scoreQuiz.
 */

type QuizState = 'list' | 'taking' | 'results';

interface QuizProgress {
  quiz: QuizDefinition;
  currentQuestion: number;
  answers: Record<string, number>;
}

interface QuizResultData {
  id: string;
  quiz_type: string;
  quiz_id: string;
  result: string;
  scores: Record<string, unknown>;
  completed_at: string;
  label?: string;
}

const PROFILE_FIELD: Record<string, string> = {
  mbti: 'mbti_type',
  'love-language': 'love_language',
  enneagram: 'enneagram_type',
  attachment: 'attachment_style',
};

export function QuizzesPage() {
  const { t: tApp } = useT('app');
  // useTranslation re-renders on languageChanged, so reading the normalised
  // locale here is enough for the registry memo below to follow it.
  const locale = getLocale();
  const { user, profile, refreshProfile } = useAuth();
  const { triggerLevelUp, openRatePrompt } = useGamification();
  const [state, setState] = useState<QuizState>('list');
  const [progress, setProgress] = useState<QuizProgress | null>(null);
  const [result, setResult] = useState<{ quiz: QuizDefinition; result: unknown } | null>(null);
  const [pastResults, setPastResults] = useState<QuizResultData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadPastResults();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadPastResults = async () => {
    if (!user) return;
    const res = await quizResultsDal.listForUser(user.id);
    if (res.ok) setPastResults(res.data as unknown as QuizResultData[]);
    setLoading(false);
  };

  // Key on quiz_id, NOT quiz_type: several cards share a type (both MBTI
  // variants are 'mbti'; every extra quiz is 'extra-dimensional').
  // listForUser orders by completed_at DESC, so .find returns the latest.
  const getLastResult = (quizId: string): QuizResultData | undefined => pastResults.find((r) => r.quiz_id === quizId);

  const ayurvedaEnabled = useFeatureFlag('ayurveda-dosha');
  const extraQuizzesEnabled = useFeatureFlag('extra-quizzes');

  // Localised once per locale, not on every render (R6 A27: 2,872 lookups
  // per render before). counts.test.ts parses this literal registry — keep
  // `const quizzes = [`, the `...(flag ? [...] : [])` spreads for the
  // flag-gated entries and one `quiz: localizeQuiz(` per always-on entry.
  const quizzes = useMemo<QuizListEntry[]>(() => {
    const quizzes = [
      { quiz: localizeQuiz(moodCheckQuiz), metadata: localizeQuizMetadata('mood-check', quizMetadata['mood-check']) },
      ...(ayurvedaEnabled
        ? [{ quiz: localizeQuiz(ayurvedaQuiz), metadata: localizeQuizMetadata('ayurveda-dosha', quizMetadata['ayurveda-dosha']) }]
        : []),
      ...(extraQuizzesEnabled
        ? EXTRA_QUIZZES.map((q) => ({ quiz: localizeQuiz(q), metadata: localizeExtraQuizMetadata(q.id, EXTRA_QUIZ_METADATA[q.id]) }))
        : []),
      { quiz: localizeQuiz(mbtiQuickQuiz), metadata: localizeQuizMetadata('mbti-quick', quizMetadata['mbti-quick']) },
      { quiz: localizeQuiz(tarotCourtQuiz), metadata: localizeQuizMetadata('court-match', quizMetadata['court-match']) },
      { quiz: localizeQuiz(elementAffinityQuiz), metadata: localizeQuizMetadata('element-affinity', quizMetadata['element-affinity']) },
      { quiz: localizeQuiz(shadowArchetypeQuiz), metadata: localizeQuizMetadata('shadow-archetype', quizMetadata['shadow-archetype']) },
      { quiz: localizeQuiz(mbtiQuiz), metadata: localizeQuizMetadata('mbti', quizMetadata.mbti) },
      { quiz: localizeQuiz(loveLanguageQuiz), metadata: localizeQuizMetadata('love-language', quizMetadata['love-language']) },
      { quiz: localizeQuiz(bigFiveQuiz), metadata: localizeQuizMetadata('big-five', quizMetadata['big-five']) },
      { quiz: localizeQuiz(enneagramQuiz), metadata: localizeQuizMetadata('enneagram', quizMetadata.enneagram) },
      { quiz: localizeQuiz(attachmentQuiz), metadata: localizeQuizMetadata('attachment', quizMetadata.attachment) },
    ];
    return quizzes;
    // `locale` is the dependency that matters: localizeQuiz reads i18n itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, ayurvedaEnabled, extraQuizzesEnabled]);

  const startQuiz = (quiz: QuizDefinition) => {
    setProgress({ quiz, currentQuestion: 0, answers: {} });
    setResult(null);
    setState('taking');
    window.scrollTo({ top: 0 });
  };

  /** "See result": replay the stored scorer output through the same renderer. */
  const showSavedResult = (quiz: QuizDefinition) => {
    const last = getLastResult(quiz.id);
    if (!last) return startQuiz(quiz);
    setResult({ quiz, result: last.scores });
    setState('results');
    window.scrollTo({ top: 0 });
  };

  const resetQuiz = () => {
    setProgress(null);
    setResult(null);
    setState('list');
  };

  const saveToProfile = async (type: string, resultLabel: string, additionalData?: Record<string, unknown>) => {
    if (!user) return;
    setSaving(true);
    const updateData: Record<string, unknown> = { ...(additionalData ?? {}) };
    const field = PROFILE_FIELD[type];
    if (field) updateData[field] = resultLabel;
    if (Object.keys(updateData).length > 0) {
      await supabase.from('profiles').update(updateData).eq('id', user.id);
      toast(tApp('home.savedToHighlights'), 'success');
    }
    setSaving(false);
  };

  const answerQuestion = async (questionId: string, value: number) => {
    if (!progress) return;
    const newAnswers = { ...progress.answers, [questionId]: value };
    const nextQuestion = progress.currentQuestion + 1;

    if (nextQuestion < progress.quiz.questions.length) {
      setProgress({ ...progress, currentQuestion: nextQuestion, answers: newAnswers });
      return;
    }

    const scored = scoreQuiz(progress.quiz, newAnswers, tApp);
    if (!scored) {
      // Every registered type has a branch; reaching here is a dispatcher bug.
      if (import.meta.env.DEV) console.error(`[QuizzesPage] No scorer for quiz type "${progress.quiz.type}" (id "${progress.quiz.id}")`);
      resetQuiz();
      return;
    }

    if (user) {
      await quizResultsDal.insert({
        userId: user.id,
        quizType: quizTypeForDb(progress.quiz),
        quizId: progress.quiz.id,
        result: scored.label,
        scores: scored.result as Record<string, unknown>,
        label: scored.label,
      });
      loadPastResults();

      const xpResult = await awardXP(user.id, 'quiz_complete');
      if (xpResult) {
        // The level-up sheet already says "+N XP earned"; a toast on top of
        // it repeated the line and covered the sheet's button at 390px.
        if (xpResult.level_up) {
          triggerLevelUp({ newLevel: xpResult.new_level, seekerRank: xpResult.seeker_rank, xpEarned: xpResult.xp_earned });
        } else {
          toast(tApp('quizzes.xpEarned', { defaultValue: '+{{xp}} XP earned', xp: xpResult.xp_earned }), 'success');
        }
      }
      await refreshProfile();

      await adsService.checkAndShowAd(profile?.isPremium || false, 'quiz', profile?.isAdFree || false);

      await ratePromptService.incrementPositiveActions(user.id);
      if (await ratePromptService.shouldShowPrompt(user.id)) {
        await ratePromptService.recordPromptShown(user.id);
        openRatePrompt();
      }
    }

    setResult({ quiz: progress.quiz, result: scored.result });
    setState('results');
    window.scrollTo({ top: 0 });
  };

  if (state === 'taking' && progress) {
    return (
      <QuizQuestionView
        quiz={progress.quiz}
        index={progress.currentQuestion}
        answers={progress.answers}
        onAnswer={answerQuestion}
        onBack={resetQuiz}
      />
    );
  }

  if (state === 'results' && result) {
    return (
      <QuizResultView
        quiz={result.quiz}
        result={result.result}
        onBack={resetQuiz}
        onRetake={() => startQuiz(result.quiz)}
        saving={saving}
        onSaveToProfile={PROFILE_FIELD[result.quiz.type] ? saveToProfile : undefined}
      />
    );
  }

  return (
    <Page spacing="md">
      <PageHeader title={tApp('quizzes.title')} />
      <QuizList
        entries={quizzes}
        loading={loading}
        lastResultFor={getLastResult}
        onStart={startQuiz}
        onSeeResult={showSavedResult}
        locale={locale}
      />
    </Page>
  );
}
