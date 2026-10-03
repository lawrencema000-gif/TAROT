import { ProgressRing, ResultLayout } from '../../ui';
import { useT } from '../../../i18n/useT';
import { moodDescriptions, MOOD_DIMENSIONS, MOOD_SUGGESTIONS, type MoodCheckResult as MoodScore } from '../../../data/quizzes';
import {
  AfterResult,
  MOOD_INK,
  Prose,
  Quote,
  ResultBody,
  ResultSection,
  ScoreRow,
  StaleResult,
  VerdictActions,
  shareFileName,
  useQuizShare,
  type QuizResultViewProps,
} from '../shared';

const RING_TONE = { high: 'teal', steady: 'gold', low: 'coral' } as const;

/**
 * The five-question mood check. The verdict word, its message and the
 * four cards are keyed `quizzes.mood.<verdict>.*` (R8 (e)1) with the
 * English in moodDescriptions as the fallback.
 */
export function MoodCheckResult({ quiz, result, onBack, onRetake }: QuizResultViewProps<MoodScore>) {
  const { t } = useT('app');
  const share = useQuizShare();
  const info = moodDescriptions[result.overallMood];
  if (!info) return <StaleResult quiz={quiz} onBack={onBack} onRetake={onRetake} />;

  const verdictKey = result.overallMood.toLowerCase();
  const label = t(`quizzes.mood.${verdictKey}.label`, { defaultValue: result.overallMood });
  const copy = (field: keyof typeof info, fallback: string) => t(`quizzes.mood.${verdictKey}.${field}`, { defaultValue: fallback });
  const need = result.need ?? 'balance';
  const suggestion = t(`quizzes.mood.suggestions.${need}`, { defaultValue: result.suggestion ?? MOOD_SUGGESTIONS[need] });
  const section = (key: string, fallback: string) => t(`quizzes.resultSections.${key}`, { defaultValue: fallback });

  return (
    <ResultLayout
      eyebrow={quiz.title}
      glyph={
        <ProgressRing value={result.moodScore} size={80} strokeWidth={6} tone={RING_TONE[info.tone]} label={t('quizzes.mood.scoreLabel', { defaultValue: 'Mood score' })}>
          <span className={`font-sans text-xl font-semibold tabular-nums ${MOOD_INK[info.tone]}`}>{result.moodScore}%</span>
        </ProgressRing>
      }
      glyphHidden={false}
      verdict={label}
      summary={copy('message', info.message)}
      onBack={onBack}
      backLabel={t('quizzes.backToQuizzes', { defaultValue: 'Back to quizzes' })}
      actions={
        <VerdictActions
          onShare={() =>
            share({
              quizTitle: quiz.title,
              resultName: label,
              affirmation: copy('message', info.message),
              fileName: shareFileName(quiz.id, verdictKey),
            })
          }
        />
      }
      footer={
        <ResultBody after={<AfterResult onRetake={onRetake} onBack={onBack} />}>
          <ResultSection title={section('yourDimensions', 'Your dimensions')}>
            <div className="space-y-4">
              {MOOD_DIMENSIONS.map((dim) => (
                <ScoreRow
                  key={dim}
                  name={t(`quizzes.mood.dimensions.${dim}`, { defaultValue: dim.charAt(0).toUpperCase() + dim.slice(1) })}
                  value={result.dimensions?.[dim] ?? 0}
                  max={5}
                  display={`${result.dimensions?.[dim] ?? 0}/5`}
                  emphasis={(result.dimensions?.[dim] ?? 0) >= 4}
                />
              ))}
            </div>
          </ResultSection>

          <ResultSection title={section('suggestionForYou', 'Suggestion for you')}>
            <Prose>{suggestion}</Prose>
          </ResultSection>

          <ResultSection title={section('whatToDoToday', 'What to do today')}>
            <Prose>{copy('recommendation', info.recommendation)}</Prose>
          </ResultSection>

          <ResultSection title={section('reflection', 'Reflection')}>
            <Quote>{copy('journalPrompt', info.journalPrompt)}</Quote>
          </ResultSection>

          <ResultSection title={section('tarotEnergy', 'Tarot energy')}>
            <Prose>{copy('tarotSuggestion', info.tarotSuggestion)}</Prose>
          </ResultSection>
        </ResultBody>
      }
    />
  );
}
