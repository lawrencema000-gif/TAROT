import { Tag } from '../ui';
import { useT } from '../../i18n/useT';
import { isLikertQuestion } from '../../i18n/localizeQuiz';
import type { QuizDefinition } from '../../types';
import { LessonFrame, AnswerChoice } from '../learn/LessonFrame';
import { computeSneakPeek, ENCOURAGEMENT } from './sneakPeek';

export interface QuizQuestionViewProps {
  quiz: QuizDefinition;
  /** 0-based index of the question on screen. */
  index: number;
  answers: Record<string, number>;
  onAnswer: (questionId: string, value: number) => void;
  onBack: () => void;
}

/**
 * One question on the lesson frame: the stem is the concept, the options
 * are stacked AnswerChoice buttons on the paper, the "early reading" is a
 * gold Tag line above the paper (no gradient card), and the encouragement
 * line sits in the frame's hint slot.
 */
export function QuizQuestionView({ quiz, index, answers, onAnswer, onBack }: QuizQuestionViewProps) {
  const { t } = useT('app');
  const question = quiz.questions[index];
  const total = quiz.questions.length;
  const step = index + 1;

  const sneakPeek = computeSneakPeek(quiz, answers, step, total, t);
  const showEncouragement = !sneakPeek && total >= 12 && step % 6 === 0 && step < total;
  const encouragement = ENCOURAGEMENT[Math.floor(step / 6) % ENCOURAGEMENT.length];

  const likert = isLikertQuestion(question);
  const prompt = likert
    ? t('quizzes.lesson.promptAgree', { defaultValue: 'How much do you agree?' })
    : t('quizzes.lesson.promptChoose', { defaultValue: 'Choose the answer that fits you best.' });

  return (
    <LessonFrame
      step={step}
      total={total}
      progressLabel={t('quizzes.lesson.progress', { defaultValue: 'Quiz progress' })}
      onBack={onBack}
      backLabel={t('quizzes.backToQuizzes', { defaultValue: 'Back to quizzes' })}
      prompt={prompt}
      concept={question.text}
      above={
        sneakPeek ? (
          <div className="flex justify-center">
            <Tag tone="gold" size="md">
              {t('quizzes.sneakPeek.label', { defaultValue: 'Early reading:' })} {sneakPeek}
            </Tag>
          </div>
        ) : undefined
      }
      hint={showEncouragement ? t(`quizzes.encouragement.${encouragement.key}`, { defaultValue: encouragement.en }) : undefined}
    >
      {question.options.map((option) => (
        <AnswerChoice key={`${question.id}-${option.value}`} onClick={() => onAnswer(question.id, option.value)}>
          {option.label}
        </AnswerChoice>
      ))}
    </LessonFrame>
  );
}
