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
  ReadingFirst,
  ResultBody,
  ResultSection,
  ScoreRow,
  SharedWith,
  StaleResult,
  VerdictActions,
  shareFileName,
  tiedKeys,
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
 *
 * A tie names every result level at the top: in the close call, in a
 * "Shared with" line under the verdict, and in the bars. The card's
 * summary then leaves the verdict block for the body, read as the first of
 * the tied results — in the words written for a shared top where the
 * summary claims a sole one ("Your shadow is strongest around narcissism",
 * "Your core sensitivity is…", "Your default is…"): `summaryShared`.
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
  /**
   * What "Reading X first" says when the top is shared. A summary written
   * for a sole winner said the opposite of the tie right above it: three
   * shadows at 3.0, then "Your shadow is strongest around narcissism"
   * (p9 Q07, F65). Such a result has a version for a shared top; every
   * other summary reads as written.
   */
  const sharedSummary = localized('summaryShared', summary);
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
  // Self-compassion's "where to practise": up to three components at the
  // bottom, in the scorer's order, each a scored dimension.
  const isComponent = (v: unknown): v is string => typeof v === 'string' && entry.dimensions.includes(v);
  const extra = result.extra ?? {};
  const weakestList: string[] = [];
  for (const k of ['weakest', 'weakestAlso', 'weakestThird'] as const) {
    const v = extra[k];
    if (!isComponent(v) || weakestList.includes(v)) break;
    weakestList.push(v);
  }
  // A low or moderate band with no component below the rest still answers
  // "where to practise" — honestly: anywhere.
  const levelPractice = quiz.id === 'self-compassion-v1' && weakestList.length === 0 && (resultKey === 'low' || resultKey === 'moderate');
  const tied = tiedKeys(resultKey, result.tied, result.secondary, result.isTie).filter((d) => entry.dimensions.includes(d) || d in entry.info);
  const shared = tied.length >= 2;
  const emphasised = new Set([resultKey, ...tied, ...weakestList]);
  const isScreener = quiz.id === 'mood-screener-v1';
  const showCrisis = isScreener && (resultKey === 'seek-support' || resultKey === 'moderate');

  return (
    <ResultLayout
      eyebrow={quiz.title}
      glyph={<QuizGlyph icon={EXTRA_QUIZ_METADATA[quiz.id]?.icon ?? ''} />}
      verdict={name}
      subtitle={
        shared ? (
          <>
            <span className="block">{tagline}</span>
            <SharedWith names={tied.slice(1).map(dimName)} />
          </>
        ) : (
          tagline
        )
      }
      summary={shared ? undefined : summary}
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
                context={t('askOracle.context.quizResult', {
                  defaultValue: 'my {{quiz}} result: {{result}} ({{tagline}})',
                  quiz: quiz.title,
                  result: name,
                  tagline,
                })}
                label={t('quizzes.askOracleCta', { defaultValue: 'Read this result for me' })}
              />
            </AfterResult>
          }
        >
          {shared && <CloseCall names={[name, ...tied.slice(1).map(dimName)]} />}

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
                    emphasis={emphasised.has(d)}
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

          {shared && <ReadingFirst name={name}>{sharedSummary}</ReadingFirst>}

          {(weakestList.length > 0 || levelPractice) && (
            <ResultSection title={t('extraQuizzes.self-compassion.whereToPractise', { defaultValue: 'Where to practise' })}>
              <Prose>
                {weakestList.length === 3
                  ? t('extraQuizzes.self-compassion.weakestBodyThree', {
                      defaultValue: 'The three components pulling your total down are {{a}}, {{b}} and {{c}}. One small, deliberate practice in any of them moves the whole picture.',
                      a: dimName(weakestList[0]),
                      b: dimName(weakestList[1]),
                      c: dimName(weakestList[2]),
                    })
                  : weakestList.length === 2
                    ? t('extraQuizzes.self-compassion.weakestBodyTwo', {
                        defaultValue: 'The two components pulling your total down are {{a}} and {{b}}. One small, deliberate practice in either moves the whole picture.',
                        a: dimName(weakestList[0]),
                        b: dimName(weakestList[1]),
                      })
                    : weakestList.length === 1
                      ? t('extraQuizzes.self-compassion.weakestBody', {
                          defaultValue: 'The component pulling your total down is {{component}}. One small, deliberate practice there moves the whole picture.',
                          component: dimName(weakestList[0]),
                        })
                      : t('extraQuizzes.self-compassion.levelBody', {
                          defaultValue: 'No single component is lower than the rest, so there is no one place to start. One small, deliberate practice in any of them moves the whole picture.',
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
