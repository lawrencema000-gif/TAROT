import { EyebrowLabel, ResultLayout } from '../../ui';
import { useT } from '../../../i18n/useT';
import { AskOracleButton } from '../../oracle/AskOracleButton';
import { EXTRA_QUIZ_METADATA, EXTRA_QUIZ_SCORING, WELLBEING_SCREENERS, type DimensionalResult } from '../../../data/extraQuizzes';
import { MOOD_SCREENER_CRISIS } from '../../../data/extraQuizzesPart2';
import { QuizGlyph } from '../icons';
import { dimensionScaleMax, extraResultName } from '../extraNames';
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
  // A list from the locale only when it IS a list of strings: a half-merged
  // block can arrive as an object keyed "0", "1"… and `.map` would throw.
  const list = (field: 'strengths' | 'shadow') => {
    const raw: unknown = t(`extraQuizzes.${quizKey}.results.${resultKey}.${field}`, { returnObjects: true, defaultValue: info[field] });
    return Array.isArray(raw) && raw.every((x) => typeof x === 'string') ? (raw as string[]) : info[field];
  };
  const strengths = list('strengths');
  const shadow = list('shadow');
  const affirmation = localized('affirmation', info.affirmation);
  const dimName = (d: string) => extraResultName(quiz.id, d, t);
  const section = (k: string, fallback: string) => t(`quizzes.resultSections.${k}`, { defaultValue: fallback });

  const averages = result.averages;
  const rawMax = Math.max(1, ...entry.dimensions.map((d) => result.scores?.[d] ?? 0));
  const scaleMax = dimensionScaleMax(quiz, entry.dimensions);
  const mixedScales = new Set(entry.dimensions.map((d) => scaleMax[d])).size > 1;
  const weakest = typeof result.extra?.weakest === 'string' && entry.dimensions.includes(result.extra.weakest) ? result.extra.weakest : null;
  const weakestAlso =
    weakest && typeof result.extra?.weakestAlso === 'string' && entry.dimensions.includes(result.extra.weakestAlso) ? result.extra.weakestAlso : null;
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
          disclaimer={WELLBEING_SCREENERS.has(quiz.id) ? 'wellbeing' : 'quiz'}
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
            <div className="space-y-4">
              {entry.dimensions.map((d) => {
                const raw = result.scores?.[d] ?? 0;
                const max = scaleMax[d];
                // A replayed answer recorded on an older, longer scale never draws past the end.
                const avg = averages?.[d] !== undefined ? Math.min(averages[d], max) : undefined;
                return (
                  <ScoreRow
                    key={d}
                    name={dimName(d)}
                    value={avg !== undefined ? avg : raw}
                    max={avg !== undefined ? max : rawMax}
                    display={avg !== undefined ? (mixedScales ? `${avg.toFixed(1)} / ${max}` : avg.toFixed(1)) : raw}
                    emphasis={d === resultKey || d === weakest || d === weakestAlso}
                  />
                );
              })}
            </div>
            {averages && (
              <p className="reading-meta">
                {mixedScales
                  ? t('extraQuizzes.common.scoreScaleMixed', {
                      defaultValue: 'Average answer per group of questions. How-often questions are scored out of 4, agreement questions out of 5.',
                    })
                  : t('extraQuizzes.common.scoreScale', { defaultValue: 'Average agreement per dimension, out of 5.' })}
              </p>
            )}
          </ResultSection>

          {weakest && (
            <ResultSection title={t('extraQuizzes.self-compassion.whereToPractise', { defaultValue: 'Where to practise' })}>
              <Prose>
                {weakestAlso
                  ? t('extraQuizzes.self-compassion.weakestBodyTwo', {
                      defaultValue: 'The two components pulling your total down are {{a}} and {{b}}. One small, deliberate practice in either moves the whole picture.',
                      a: dimName(weakest),
                      b: dimName(weakestAlso),
                    })
                  : t('extraQuizzes.self-compassion.weakestBody', {
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
