import { EyebrowLabel, ResultLayout } from '../../ui';
import { useT } from '../../../i18n/useT';
import { AskOracleButton } from '../../oracle/AskOracleButton';
import { EXTRA_QUIZ_METADATA, EXTRA_QUIZ_SCORING, type DimensionalResult } from '../../../data/extraQuizzes';
import { MOOD_SCREENER_CRISIS } from '../../../data/extraQuizzesPart2';
import { QuizGlyph } from '../icons';
import {
  AfterResult,
  Affirmation,
  Bullets,
  CloseCall,
  Prose,
  ResultBody,
  ResultSection,
  ScoreRow,
  StaleResult,
  VerdictActions,
  shareFileName,
  useQuizShare,
  type QuizResultViewProps,
} from '../shared';

/**
 * The one renderer for the twenty-two dimensional quizzes. Reads
 * `extraQuizzes.<key>.results.<dim>.*` with the data module as fallback,
 * draws the scored dimensions as bars (Likert means when the scorer
 * supplied them, raw sums for older saved results), names a close call,
 * and carries the two quiz-specific panels: self-compassion's weakest
 * component and the mood screener's crisis resources.
 */
export function ExtraResult({ quiz, result, onBack, onRetake }: QuizResultViewProps<DimensionalResult>) {
  const { t } = useT('app');
  const share = useQuizShare();
  const entry = EXTRA_QUIZ_SCORING[quiz.id];
  const info = entry?.info[result.primary];
  if (!entry || !info) return <StaleResult quiz={quiz} onBack={onBack} onRetake={onRetake} />;

  const quizKey = quiz.id.replace(/-v\d+$/, '');
  const resultKey = result.primary;
  const localized = (path: string, fallback: string) => t(`extraQuizzes.${quizKey}.results.${resultKey}.${path}`, { defaultValue: fallback });
  const name = localized('name', info.name);
  const tagline = localized('tagline', info.tagline);
  const summary = localized('summary', info.summary);
  const strengths = t(`extraQuizzes.${quizKey}.results.${resultKey}.strengths`, { returnObjects: true, defaultValue: info.strengths }) as string[];
  const shadow = t(`extraQuizzes.${quizKey}.results.${resultKey}.shadow`, { returnObjects: true, defaultValue: info.shadow }) as string[];
  const affirmation = localized('affirmation', info.affirmation);
  const dimName = (d: string) =>
    t(`extraQuizzes.${quizKey}.results.${d}.name`, {
      defaultValue: entry.info[d]?.name ?? t(`extraQuizzes.${quizKey}.dimensions.${d}`, { defaultValue: entry.dimensionLabels?.[d] ?? d }),
    });
  const section = (k: string, fallback: string) => t(`quizzes.resultSections.${k}`, { defaultValue: fallback });

  const averages = result.averages;
  const rawMax = Math.max(1, ...entry.dimensions.map((d) => result.scores?.[d] ?? 0));
  const weakest = typeof result.extra?.weakest === 'string' ? result.extra.weakest : null;
  const isScreener = quiz.id === 'mood-screener-v1';
  const showCrisis = isScreener && (resultKey === 'seek-support' || resultKey === 'moderate');

  return (
    <ResultLayout
      eyebrow={quiz.title}
      glyph={<QuizGlyph icon={EXTRA_QUIZ_METADATA[quiz.id]?.icon ?? ''} />}
      verdict={name}
      subtitle={tagline}
      summary={summary}
      onBack={onBack}
      backLabel={t('quizzes.backToQuizzes', { defaultValue: 'Back to quizzes' })}
      actions={
        <VerdictActions
          onShare={() => share({ quizTitle: quiz.title, resultName: name, affirmation, fileName: shareFileName(quiz.id, resultKey) })}
        />
      }
      footer={
        <ResultBody
          after={
            <AfterResult onRetake={onRetake} onBack={onBack}>
              <AskOracleButton
                variant="card"
                context={`my ${quiz.title} result: ${name} (${tagline})`}
                label={t('quizzes.askOracleCta', { defaultValue: 'Read this result for me' })}
              />
            </AfterResult>
          }
        >
          {result.isTie && result.secondary && <CloseCall a={name} b={dimName(result.secondary)} />}

          {showCrisis && (
            <aside className="rounded-control border border-ink-coral/40 bg-ink/5 px-4 py-3" aria-label={t('extraQuizzes.mood-screener.crisisLabel', { defaultValue: 'Crisis resources' })}>
              <EyebrowLabel tone="ink" align="left" className="text-ink-coral">
                {t('extraQuizzes.mood-screener.crisisLabel', { defaultValue: 'Crisis resources' })}
              </EyebrowLabel>
              <p className="reading-copy mt-1">{t('extraQuizzes.mood-screener.crisis', { defaultValue: MOOD_SCREENER_CRISIS })}</p>
            </aside>
          )}

          <ResultSection title={t('extraQuizzes.common.scoreDistribution', { defaultValue: 'Score distribution' })}>
            <div className="space-y-2.5">
              {entry.dimensions.map((d) => {
                const avg = averages?.[d];
                const raw = result.scores?.[d] ?? 0;
                return (
                  <ScoreRow
                    key={d}
                    name={dimName(d)}
                    value={avg !== undefined ? avg : raw}
                    max={avg !== undefined ? 5 : rawMax}
                    display={avg !== undefined ? avg.toFixed(1) : raw}
                    emphasis={d === resultKey || d === weakest}
                  />
                );
              })}
            </div>
            {averages && <p className="reading-meta">{t('extraQuizzes.common.scoreScale', { defaultValue: 'Average agreement per dimension, out of 5.' })}</p>}
          </ResultSection>

          {weakest && (
            <ResultSection title={t('extraQuizzes.self-compassion.whereToPractise', { defaultValue: 'Where to practise' })}>
              <Prose>
                {t('extraQuizzes.self-compassion.weakestBody', {
                  defaultValue: 'The component pulling your total down is {{component}}. One small, deliberate practice there moves the whole picture.',
                  component: dimName(weakest),
                })}
              </Prose>
            </ResultSection>
          )}

          <ResultSection title={section('strengths', 'Strengths')}>
            <Bullets items={strengths} />
          </ResultSection>
          <ResultSection title={section('shadow', 'Shadow side')}>
            <Bullets items={shadow} />
          </ResultSection>
          <Affirmation text={affirmation} />
        </ResultBody>
      }
    />
  );
}
