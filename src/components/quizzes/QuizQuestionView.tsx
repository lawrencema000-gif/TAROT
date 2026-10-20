import { Tag } from '../ui';
import { useT } from '../../i18n/useT';
import { isLikertQuestion } from '../../i18n/localizeQuiz';
import type { QuizDefinition } from '../../types';
import { LessonFrame, AnswerChoice } from '../learn/LessonFrame';
import { computeSneakPeek, encouragementFor } from './sneakPeek';

export interface QuizQuestionViewProps {
  quiz: QuizDefinition;
  /** 0-based index of the question on screen. */
  index: number;
  answers: Record<string, number>;
  onAnswer: (questionId: string, value: number) => void;
  onBack: () => void;
  /**
   * The answer being submitted (the last question, while the result is
   * scored and saved). Every option is disabled and the chosen one shows
   * as selected, so a second tap cannot submit the quiz twice.
   */
  submitting?: { questionId: string; value: number } | null;
}

/**
 * One question on the lesson frame: the stem is the concept, the options
 * are stacked AnswerChoice buttons on the paper, the "early reading" is a
 * gold Tag line above the paper (no gradient card), and the encouragement
 * line sits in the frame's hint slot.
 *
 * The options are keyed by question, so they remount on every answer and
 * the focused button disappears; the frame moves focus to the new stem
 * (`focusKey`) so a keyboard or screen-reader user lands on — and hears —
 * the next question instead of <body>.
 */
export function QuizQuestionView({ quiz, index, answers, onAnswer, onBack, submitting = null }: QuizQuestionViewProps) {
  const { t } = useT('app');
  const question = quiz.questions[index];
  const total = quiz.questions.length;
  const step = index + 1;

  const sneakPeek = computeSneakPeek(quiz, answers, step, total, t);
  const encouragement = sneakPeek ? null : encouragementFor(step, total);

  // The localized question carries the flag (its labels may no longer be English).
  const likert = question.likert ?? isLikertQuestion(question);
  const prompt = likert
    ? t('quizzes.lesson.promptAgree', { defaultValue: 'How much do you agree?' })
    : t('quizzes.lesson.promptChoose', { defaultValue: 'Choose the answer that fits you best.' });
  const pending = submitting?.questionId === question.id ? submitting : null;

  return (
    <LessonFrame
      step={step}
      total={total}
      progressLabel={t('quizzes.lesson.progress', { defaultValue: 'Quiz progress' })}
      onBack={onBack}
      backLabel={t('quizzes.backToQuizzes', { defaultValue: 'Back to quizzes' })}
      prompt={prompt}
      concept={question.text}
      focusKey={question.id}
      above={
        sneakPeek ? (
          <div className="flex justify-center">
            <Tag tone="gold" size="md">
              {t('quizzes.sneakPeek.label', { defaultValue: 'Early reading:' })} {sneakPeek}
            </Tag>
          </div>
        ) : undefined
      }
      hint={encouragement ? t(`quizzes.encouragement.${encouragement.key}`, { defaultValue: encouragement.en }) : undefined}
    >
      {question.options.map((option) => (
        <AnswerChoice
          key={`${question.id}-${option.value}`}
          onClick={() => onAnswer(question.id, option.value)}
          disabled={pending !== null}
          selected={pending?.value === option.value}
        >
          {option.label}
        </AnswerChoice>
      ))}
    </LessonFrame>
  );
}
