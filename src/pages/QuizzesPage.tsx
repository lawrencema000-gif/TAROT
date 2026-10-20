import { useEffect, useMemo, useRef, useState } from 'react';
import { ListSkeleton, Page, PageHeader, toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import { useFeatureFlag } from '../context/FeatureFlagContext';
import { supabase } from '../lib/supabase'; // profile writes (owned by the AuthContext pattern)
import { quizResults as quizResultsDal } from '../dal';
import { adsService } from '../services/ads';
import { awardXP } from '../services/levelSystem';
import { checkAchievementProgress } from '../services/achievements';
import { ratePromptService } from '../services/ratePrompt';
import { useT } from '../i18n/useT';
import { getLocale, ensureRouteStrings, routeStringsReady } from '../i18n/config';
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
import type { QuizCategory } from '../data/quizzes';
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

/** The list's category tab survives a quiz and a trip to another tab (per browser session). */
const CATEGORY_KEY = 'arcana_quiz_category';
const CATEGORIES: readonly QuizCategory[] = ['personality', 'relationships', 'wellbeing', 'tarot-spirit'];
function readCategory(): QuizCategory {
  try {
    const v = sessionStorage.getItem(CATEGORY_KEY);
    return v && (CATEGORIES as readonly string[]).includes(v) ? (v as QuizCategory) : 'personality';
  } catch {
    return 'personality';
  }
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
  // The quiz strings are not in the boot bundle (R7 #139, vite.config.ts
  // routeNamespacePlugin): every state below waits for them, per locale.
  // Derived on every render, so a language switch shows the skeleton on its
  // first render rather than one frame of the new locale without its strings.
  // `attempted` opens the gate after a failed load too: the screen then
  // reads the English in its data modules (every t() carries a defaultValue).
  const [attempted, setAttempted] = useState<string | null>(null);
  const stringsReady = routeStringsReady('quizzes', locale) || attempted === locale;
  useEffect(() => {
    if (stringsReady) return;
    let live = true;
    void ensureRouteStrings('quizzes', locale).then(() => {
      if (live) setAttempted(locale);
    });
    return () => {
      live = false;
    };
  }, [locale, stringsReady]);
  const { user, profile, refreshProfile } = useAuth();
  const { triggerLevelUp, openRatePrompt } = useGamification();
  const [state, setState] = useState<QuizState>('list');
  const [progress, setProgress] = useState<QuizProgress | null>(null);
  const [result, setResult] = useState<{ quiz: QuizDefinition; result: unknown } | null>(null);
  const [pastResults, setPastResults] = useState<QuizResultData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // The current result has been written to the profile (the button turns into a receipt).
  const [savedToProfile, setSavedToProfile] = useState(false);
  const [category, setCategoryState] = useState<QuizCategory>(readCategory);
  const setCategory = (c: QuizCategory) => {
    setCategoryState(c);
    try {
      sessionStorage.setItem(CATEGORY_KEY, c);
    } catch {
      /* private mode: the tab still changes, it just is not remembered */
    }
  };
  // The last answer is being scored and saved. A ref, not only state: two
  // taps inside one frame both see the old state, and each used to insert
  // its own quiz_results row and award its own XP (R7 #103).
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState<{ questionId: string; value: number } | null>(null);

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
    // Localising before the strings land would only log a missing key per string.
    if (!stringsReady) return [];
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
  }, [locale, stringsReady, ayurvedaEnabled, extraQuizzesEnabled]);

  const startQuiz = (quiz: QuizDefinition) => {
    submittingRef.current = false;
    setSubmitting(null);
    setProgress({ quiz, currentQuestion: 0, answers: {} });
    setResult(null);
    setSavedToProfile(false);
    setState('taking');
    window.scrollTo({ top: 0 });
  };

  /** "See result": replay the stored scorer output through the same renderer. */
  const showSavedResult = (quiz: QuizDefinition) => {
    const last = getLastResult(quiz.id);
    if (!last) return startQuiz(quiz);
    setResult({ quiz, result: last.scores });
    setSavedToProfile(false);
    setState('results');
    window.scrollTo({ top: 0 });
  };

  const resetQuiz = () => {
    submittingRef.current = false;
    setSubmitting(null);
    setProgress(null);
    setResult(null);
    setState('list');
  };

  const saveToProfile = async (type: string, resultLabel: string, additionalData?: Record<string, unknown>) => {
    if (!user) return;
    const updateData: Record<string, unknown> = { ...(additionalData ?? {}) };
    const field = PROFILE_FIELD[type];
    if (field) updateData[field] = resultLabel;
    if (Object.keys(updateData).length === 0) return;
    setSaving(true);
    // `.select` so a write that matched no row (or was refused by a policy
    // that does not raise) reads as the failure it is, not as "saved".
    const { data, error } = await supabase.from('profiles').update(updateData).eq('id', user.id).select('id');
    setSaving(false);
    if (error || !data?.length) {
      toast(tApp('quizzes.saveToProfileFailed', { defaultValue: 'Could not save this to your profile. Try again.' }), 'error');
      return;
    }
    setSavedToProfile(true);
    toast(tApp('quizzes.savedToProfile', { defaultValue: 'Saved to your profile' }), 'success');
    void refreshProfile();
  };

  /**
   * What finishing a quiz earns, after the result is on screen: XP (and the
   * level-up sheet), the set badge for the personality quiz types, the
   * profile refresh, the interstitial and the rate prompt. None of it may
   * hold the result back, and none of it runs for a completion that was
   * not recorded.
   */
  const afterCompletion = async (userId: string, quiz: QuizDefinition) => {
    const xpResult = await awardXP(userId, 'quiz_complete');
    if (xpResult) {
      // The level-up sheet already says "+N XP earned"; a toast on top of
      // it repeated the line and covered the sheet's button at 390px.
      if (xpResult.level_up) {
        triggerLevelUp({ newLevel: xpResult.new_level, seekerRank: xpResult.seeker_rank, xpEarned: xpResult.xp_earned });
      } else {
        toast(tApp('quizzes.xpEarned', { defaultValue: '+{{xp}} XP earned', xp: xpResult.xp_earned }), 'success');
      }
    }
    // Quiz Master is a SET badge (20261003000004): the server counts the
    // types it lists (mbti, love-language, big-five, enneagram, attachment)
    // and ignores any other value, so every completion reports its type.
    void checkAchievementProgress(userId, 'quiz_types_complete', 1, quizTypeForDb(quiz));
    await refreshProfile();

    await adsService.checkAndShowAd(profile?.isPremium || false, 'quiz', profile?.isAdFree || false);

    await ratePromptService.incrementPositiveActions(userId);
    if (await ratePromptService.shouldShowPrompt(userId)) {
      await ratePromptService.recordPromptShown(userId);
      openRatePrompt();
    }
  };

  const answerQuestion = async (questionId: string, value: number) => {
    if (!progress || submittingRef.current) return;
    const newAnswers = { ...progress.answers, [questionId]: value };
    const nextQuestion = progress.currentQuestion + 1;

    if (nextQuestion < progress.quiz.questions.length) {
      setProgress({ ...progress, currentQuestion: nextQuestion, answers: newAnswers });
      return;
    }

    // The last answer: lock the screen before anything awaits.
    submittingRef.current = true;
    setSubmitting({ questionId, value });
    const quiz = progress.quiz;

    const scored = scoreQuiz(quiz, newAnswers, tApp);
    if (!scored) {
      // Every registered type has a branch; reaching here is a dispatcher bug.
      if (import.meta.env.DEV) console.error(`[QuizzesPage] No scorer for quiz type "${quiz.type}" (id "${quiz.id}")`);
      resetQuiz();
      return;
    }

    let recorded = false;
    if (user) {
      const saved = await quizResultsDal.insert({
        userId: user.id,
        quizType: quizTypeForDb(quiz),
        quizId: quiz.id,
        result: scored.label,
        scores: scored.result as Record<string, unknown>,
        label: scored.label,
      });
      recorded = saved.ok;
      if (saved.ok) loadPastResults();
      else toast(tApp('quizzes.resultNotSaved', { defaultValue: 'Your result could not be saved. You can still read it here.' }), 'error');
    }

    setResult({ quiz, result: scored.result });
    setSavedToProfile(false);
    setSubmitting(null);
    setState('results');
    window.scrollTo({ top: 0 });

    if (user && recorded) void afterCompletion(user.id, quiz);
  };

  if (!stringsReady) {
    // quizzes.title is a boot key, so the header never flashes a raw key.
    return (
      <Page spacing="md">
        <PageHeader title={tApp('quizzes.title')} />
        <ListSkeleton count={5} />
      </Page>
    );
  }

  if (state === 'taking' && progress) {
    return (
      <QuizQuestionView
        quiz={progress.quiz}
        index={progress.currentQuestion}
        answers={progress.answers}
        onAnswer={answerQuestion}
        onBack={resetQuiz}
        submitting={submitting}
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
        saved={savedToProfile}
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
        category={category}
        onCategoryChange={setCategory}
      />
    </Page>
  );
}
