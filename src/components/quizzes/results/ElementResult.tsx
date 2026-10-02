import { ResultLayout } from '../../ui';
import { useT } from '../../../i18n/useT';
import { useAuth } from '../../../context/AuthContext';
import { getZodiacElement, getZodiacSign } from '../../../utils/zodiac';
import { ELEMENT_INFO, type Element, type ElementAffinityResult as ElementScore } from '../../../data/elementAffinityQuiz';
import { ElementGlyph } from '../icons';
import {
  AfterResult,
  Affirmation,
  Bullets,
  CloseCall,
  Prose,
  ResultBody,
  ResultSection,
  StaleResult,
  VerdictActions,
  shareFileName,
  useQuizShare,
  type QuizResultViewProps,
} from '../shared';

export function ElementResult({ quiz, result, onBack, onRetake }: QuizResultViewProps<ElementScore>) {
  const { t } = useT('app');
  const { profile } = useAuth();
  const share = useQuizShare();
  const info = ELEMENT_INFO[result.primary];
  if (!info) return <StaleResult quiz={quiz} onBack={onBack} onRetake={onRetake} />;
  const key = result.primary;
  const localized = (path: string, fallback: string) => t(`quizzes.elements.${key}.${path}`, { defaultValue: fallback });
  const nameOf = (e: string) => t(`quizzes.elements.${e}.name`, { defaultValue: ELEMENT_INFO[e as Element]?.name ?? e });
  const name = nameOf(key);
  const strengths = t(`quizzes.elements.${key}.strengths`, { returnObjects: true, defaultValue: info.strengths }) as string[];
  const shadow = t(`quizzes.elements.${key}.shadow`, { returnObjects: true, defaultValue: info.shadow }) as string[];
  const section = (k: string, fallback: string) => t(`quizzes.resultSections.${k}`, { defaultValue: fallback });

  // Behavioural element vs the chart's native element (from the birth date).
  const natal = profile?.birthDate ? getZodiacElement(getZodiacSign(profile.birthDate)) : null;
  const match = natal !== null && natal === key;

  return (
    <ResultLayout
      eyebrow={quiz.title}
      glyph={<ElementGlyph element={key} />}
      verdict={name}
      subtitle={localized('tagline', info.tagline)}
      summary={localized('description', info.description)}
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
          {result.isTie && result.coPrimary && <CloseCall a={name} b={nameOf(result.coPrimary)} />}

          {natal && (
            <ResultSection title={t('quizzes.elements.chartVsBehaviour', { defaultValue: 'Chart vs. behaviour' })}>
              <Prose>
                {match
                  ? t('quizzes.elements.matchNote', { defaultValue: 'Your behavioural element matches your astrology chart — you are living in alignment with your native energy.', element: name })
                  : t('quizzes.elements.differNote', { defaultValue: 'Your chart says {{natal}} but your behaviour says {{behaviour}} — worth noticing where you are stretching.', natal: nameOf(natal), behaviour: name })}
              </Prose>
            </ResultSection>
          )}

          <ResultSection title={section('strengths', 'Strengths')}>
            <Bullets items={strengths} />
          </ResultSection>
          <ResultSection title={section('shadow', 'Shadow side')}>
            <Bullets items={shadow} />
          </ResultSection>
          <ResultSection title={section('whenDominant', 'When this element is dominant')}>
            <Prose>{localized('whenDominant', info.whenDominant)}</Prose>
          </ResultSection>
          <Affirmation text={localized('affirmation', info.affirmation)} />
        </ResultBody>
      }
    />
  );
}
