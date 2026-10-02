import { EyebrowLabel, ResultLayout } from '../../ui';
import { SUIT_GLYPHS } from '../../icons';
import { useT } from '../../../i18n/useT';
import { getCourtCardInfo, type CourtMatchResult as CourtScore } from '../../../data/tarotCourtQuiz';
import {
  AfterResult,
  Affirmation,
  Bullets,
  Prose,
  ResultBody,
  ResultSection,
  VerdictActions,
  shareFileName,
  useQuizShare,
  type QuizResultViewProps,
} from '../shared';

export function CourtMatchResult({ quiz, result, onBack, onRetake }: QuizResultViewProps<CourtScore>) {
  const { t } = useT('app');
  const share = useQuizShare();
  const info = getCourtCardInfo(result.courtCard);
  const key = result.courtCard;
  const localized = (path: string, fallback: string) => t(`quizzes.courtCards.${key}.${path}`, { defaultValue: fallback });
  const name = localized('name', info.name);
  const tagline = localized('tagline', info.tagline);
  const archetype = localized('archetype', info.archetype);
  const strengths = t(`quizzes.courtCards.${key}.strengths`, { returnObjects: true, defaultValue: info.strengths }) as string[];
  const shadow = t(`quizzes.courtCards.${key}.shadow`, { returnObjects: true, defaultValue: info.shadow }) as string[];
  const section = (k: string, fallback: string) => t(`quizzes.resultSections.${k}`, { defaultValue: fallback });
  const Suit = SUIT_GLYPHS[result.element] ?? SUIT_GLYPHS.major;
  const split = result.elementTie || result.rankTie;

  return (
    <ResultLayout
      eyebrow={quiz.title}
      glyph={<Suit />}
      verdict={name}
      subtitle={
        <>
          <EyebrowLabel className="block">{archetype}</EyebrowLabel>
          <span className="block">{tagline}</span>
        </>
      }
      onBack={onBack}
      backLabel={t('quizzes.backToQuizzes', { defaultValue: 'Back to quizzes' })}
      actions={
        <VerdictActions
          onShare={() =>
            share({
              quizTitle: quiz.title,
              resultName: name,
              affirmation: localized('affirmation', info.affirmation),
              fileName: shareFileName(quiz.id, key),
            })
          }
        />
      }
      footer={
        <ResultBody after={<AfterResult onRetake={onRetake} onBack={onBack} />}>
          {split && (
            <p className="reading-meta">
              {t('quizzes.resultSections.courtSplit', {
                defaultValue: 'Your answers split evenly on {{what}}; the card above follows your answer to the tie-break question.',
                what: result.elementTie && result.rankTie
                  ? t('quizzes.resultSections.courtSplitBoth', { defaultValue: 'both suit and rank' })
                  : result.elementTie
                    ? t('quizzes.resultSections.courtSplitSuit', { defaultValue: 'suit' })
                    : t('quizzes.resultSections.courtSplitRank', { defaultValue: 'rank' }),
              })}
            </p>
          )}

          <ResultSection title={section('whenDrawn', 'When this card appears')}>
            <Prose>{localized('whenDrawn', info.whenDrawn)}</Prose>
          </ResultSection>
          <ResultSection title={section('strengths', 'Strengths')}>
            <Bullets items={strengths} />
          </ResultSection>
          <ResultSection title={section('shadow', 'Shadow side')}>
            <Bullets items={shadow} />
          </ResultSection>
          <Affirmation text={localized('affirmation', info.affirmation)} />
        </ResultBody>
      }
    />
  );
}
