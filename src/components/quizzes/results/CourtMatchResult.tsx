import { EyebrowLabel, ResultLayout } from '../../ui';
import { SUIT_GLYPHS } from '../../icons';
import { useT } from '../../../i18n/useT';
import { getCourtCardInfo, type CourtMatchResult as CourtScore } from '../../../data/tarotCourtQuiz';
import {
  AfterResult,
  Affirmation,
  Bullets,
  CloseCall,
  Prose,
  ResultBody,
  ResultSection,
  VerdictActions,
  shareFileName,
  useQuizShare,
  type QuizResultViewProps,
} from '../shared';

/** The keys sharing the top count, when exactly two do (the only unsettled split six answers allow). */
function tiedPair<K extends string>(scores: Record<K, number> | undefined): [K, K] | null {
  if (!scores) return null;
  const entries = Object.entries(scores) as [K, number][];
  const top = Math.max(...entries.map(([, v]) => v));
  const tied = entries.filter(([, v]) => v === top).map(([k]) => k);
  return tied.length === 2 ? [tied[0], tied[1]] : null;
}

/**
 * `elementTie` / `rankTie` mean the vote was split AND the tie-break
 * question (ce6 / cr5) chose neither side, so the card follows declaration
 * order. The note says exactly that — the old line claimed the card
 * "follows your answer to the tie-break question" in the one case where it
 * did not, and called a 2-2-1-1 vote "even" — and a CloseCall names the
 * other card the split allows, computed from the saved scores so a replayed
 * row reads the same.
 */
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
  const cardName = (rank: string, element: string) => {
    const k = `${rank}-of-${element}` as CourtScore['courtCard'];
    return t(`quizzes.courtCards.${k}.name`, { defaultValue: getCourtCardInfo(k).name });
  };
  const suits = result.elementTie ? tiedPair(result.elementScores) : null;
  const ranks = result.rankTie ? tiedPair(result.rankScores) : null;
  const otherSuit = suits ? (suits[0] === result.element ? suits[1] : suits[0]) : null;
  const otherRank = ranks ? (ranks[0] === result.rank ? ranks[1] : ranks[0]) : null;

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
          {result.elementTie && (
            <div className="space-y-3">
              <p className="reading-meta">
                {t('quizzes.resultSections.courtSuitUnsettled', {
                  defaultValue: 'Your answers leaned equally toward two suits, and the tie-break question pointed elsewhere.',
                })}
              </p>
              {otherSuit && <CloseCall names={[name, cardName(result.rank, otherSuit)]} />}
            </div>
          )}
          {result.rankTie && (
            <div className="space-y-3">
              <p className="reading-meta">
                {t('quizzes.resultSections.courtRankUnsettled', {
                  defaultValue: 'Your answers leaned equally toward two ranks, and the tie-break question pointed elsewhere.',
                })}
              </p>
              {otherRank && <CloseCall names={[name, cardName(otherRank, result.element)]} />}
            </div>
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
