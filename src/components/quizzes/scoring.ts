import type { QuizDefinition } from '../../types';
import { calculateMBTI, calculateLoveLanguage, calculateMoodCheck } from '../../data/quizzes';
import { calculateBigFive } from '../../data/bigFiveQuiz';
import { calculateEnneagram } from '../../data/enneagramQuiz';
import { calculateAttachment } from '../../data/attachmentQuiz';
import { calculateCourtMatch } from '../../data/tarotCourtQuiz';
import { calculateShadowArchetype } from '../../data/shadowArchetypeQuiz';
import { calculateElementAffinity } from '../../data/elementAffinityQuiz';
import { calculateDosha } from '../../data/ayurvedaQuiz';
import { calculateExtraQuiz } from '../../data/extraQuizzes';

export interface ScoredQuiz {
  /** The scorer's full return, persisted as quiz_results.scores and replayed by "See result". */
  result: unknown;
  /** The short label persisted as quiz_results.result / .label and shown on the list chip. */
  label: string;
}

/**
 * One dispatcher, by quiz type. `calculateExtraQuiz` routes the
 * extra-dimensional quizzes with dedicated scorers (the PHQ-2 screener,
 * empath/HSP, self-compassion, boundaries, wellness) itself.
 */
export function scoreQuiz(
  quiz: QuizDefinition,
  answers: Record<string, number>,
  t: (key: string, opts?: Record<string, unknown>) => string,
): ScoredQuiz | null {
  switch (quiz.type) {
    case 'mbti': {
      // The definition is passed so the quick quiz's prefixed ids (qei1…)
      // score by dimension instead of silently scoring zero.
      const r = calculateMBTI(answers, quiz);
      return { result: r, label: r.type };
    }
    case 'court-match': {
      const r = calculateCourtMatch(answers);
      return { result: r, label: r.courtCard };
    }
    case 'shadow-archetype': {
      const r = calculateShadowArchetype(answers);
      return { result: r, label: r.archetype };
    }
    case 'element-affinity': {
      const r = calculateElementAffinity(answers);
      return { result: r, label: r.primary };
    }
    case 'ayurveda-dosha': {
      const r = calculateDosha(answers);
      return { result: r, label: r.primary };
    }
    case 'extra-dimensional': {
      const r = calculateExtraQuiz(quiz.id, answers);
      return r ? { result: r, label: r.primary } : null;
    }
    case 'love-language': {
      const r = calculateLoveLanguage(answers);
      return { result: r, label: r.primary };
    }
    case 'attachment': {
      const r = calculateAttachment(answers);
      return { result: r, label: r.style };
    }
    case 'mood-check': {
      const r = calculateMoodCheck(answers);
      return { result: r, label: r.overallMood };
    }
    case 'big-five': {
      const r = calculateBigFive(answers);
      return { result: r, label: t('quizzes.resultSections.bigFiveProfile', { defaultValue: 'Big Five profile' }) };
    }
    case 'enneagram': {
      const r = calculateEnneagram(answers);
      const type = t('quizzes.resultSections.enneagramType', { defaultValue: 'Type {{n}}', n: r.primaryType });
      return { result: r, label: `${type}${r.wing ? `w${r.wing}` : ''}` };
    }
    default:
      return null;
  }
}

/** The quiz_type column: the profile fields key on these names. */
export function quizTypeForDb(quiz: QuizDefinition): string {
  if (quiz.id === 'mood-check-v1') return 'mood-check';
  if (quiz.id === 'attachment-v1') return 'attachment';
  return quiz.type;
}
