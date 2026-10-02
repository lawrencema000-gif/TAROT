import { ResultLayout, Tag } from '../../ui';
import * as QuizIcons from '../../ui/QuizIcons';
import { useT } from '../../../i18n/useT';
import { tResultCopy } from '../../../i18n/localizeQuiz';
import { bigFiveBand, bigFiveDescriptions, type BigFiveBand, type BigFiveResult as BigFiveScore } from '../../../data/bigFiveQuiz';
import {
  AfterResult,
  Bullets,
  PaperBar,
  Prose,
  ResultBody,
  ResultSection,
  VerdictActions,
  shareFileName,
  useQuizShare,
  type QuizResultViewProps,
} from '../shared';

const TRAITS = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'] as const;

const BAND_LABEL: Record<BigFiveBand, [string, string]> = {
  high: ['leansHigh', 'Leans high'],
  low: ['leansLow', 'Leans low'],
  balanced: ['balancedRange', 'Balanced'],
};

/**
 * Five spectra, not a type. Scores are percentages of the Likert span
 * (neutral = 50), so the bands leave a middle: > 55 leans high, < 45 leans
 * low, otherwise balanced — and a neutral respondent reads as balanced
 * on every trait rather than "higher than average" on all five (R3 F7).
 */
export function BigFiveResult({ quiz, result, onBack, onRetake }: QuizResultViewProps<BigFiveScore>) {
  const { t } = useT('app');
  const share = useQuizShare();
  const section = (key: string, fallback: string) => t(`quizzes.resultSections.${key}`, { defaultValue: fallback });

  const traitName = (trait: string) =>
    trait === 'neuroticism'
      ? section('emotionalStability', 'Emotional stability')
      : tResultCopy(`bigFive.${trait}.fullName`, bigFiveDescriptions[trait].fullName);
  const letters = TRAITS.map((k) => `${bigFiveDescriptions[k].name} ${result[k] ?? 50}`).join(' · ');
  const title = section('bigFiveProfile', 'Your Big Five profile');

  return (
    <ResultLayout
      eyebrow={quiz.title}
      glyph={<QuizIcons.BigFivePentagonIcon />}
      verdict={title}
      subtitle={<span className="font-sans tabular-nums">{letters}</span>}
      summary={t('quizzes.resultCopy.bigFive.intro', {
        defaultValue: 'Five spectra rather than a type. Each score is where your answers sat between the two ends of a trait, with the middle marked as balanced.',
      })}
      onBack={onBack}
      backLabel={t('quizzes.backToQuizzes', { defaultValue: 'Back to quizzes' })}
      actions={
        <VerdictActions
          onShare={() =>
            share({ quizTitle: quiz.title, resultName: letters, fileName: shareFileName(quiz.id, 'profile') })
          }
        />
      }
      footer={
        <ResultBody after={<AfterResult onRetake={onRetake} onBack={onBack} />}>
          {TRAITS.map((trait) => {
            const score = result[trait] ?? 50;
            const band = bigFiveBand(score);
            const info = bigFiveDescriptions[trait];
            const copy = (field: string, fallback: string) => tResultCopy(`bigFive.${trait}.${field}`, fallback);
            const list = (field: string, fallback: readonly string[]) => tResultCopy(`bigFive.${trait}.${field}`, fallback);
            const description =
              band === 'high' ? copy('highDescription', info.highDescription)
              : band === 'low' ? copy('lowDescription', info.lowDescription)
              : copy('balancedDescription', info.balancedDescription);
            const pole = band === 'low' ? 'low' : 'high';
            const [bandKey, bandEn] = BAND_LABEL[band];
            return (
              <ResultSection key={trait} title={traitName(trait)}>
                <div className="flex items-center justify-between gap-3">
                  <Tag tone={band === 'balanced' ? 'neutral' : 'gold'} size="sm">{section(bandKey, bandEn)}</Tag>
                  <span className="text-ui font-semibold tabular-nums text-ink">{score}</span>
                </div>
                <PaperBar value={score} max={100} label={traitName(trait)} emphasis={band !== 'balanced'} />
                <Prose>{description}</Prose>
                {band !== 'balanced' && (
                  <>
                    <p className="reading-meta pt-1">{section('growthTips', 'Growth tips')}</p>
                    <Bullets items={list(`growthTips.${pole}`, info.growthTips[pole]).slice(0, 2)} />
                    <p className="reading-meta pt-1">{section('growthLever', 'Growth lever')}</p>
                    <Prose>{copy(`growthLever.${pole}`, info.growthLever[pole])}</Prose>
                    <p className="reading-meta pt-1">{section('tarotArchetype', 'Tarot archetype')}</p>
                    <p className="text-ui font-semibold text-ink">{copy(`tarotArchetype.${pole}.card`, info.tarotArchetype[pole].card)}</p>
                    <Prose>{copy(`tarotArchetype.${pole}.reason`, info.tarotArchetype[pole].reason)}</Prose>
                  </>
                )}
              </ResultSection>
            );
          })}
        </ResultBody>
      }
    />
  );
}
