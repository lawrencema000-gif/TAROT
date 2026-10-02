import { ResultLayout } from '../../ui';
import * as QuizIcons from '../../ui/QuizIcons';
import { useT } from '../../../i18n/useT';
import { SHADOW_ARCHETYPES, type ShadowResult as ShadowScore } from '../../../data/shadowArchetypeQuiz';
import {
  AfterResult,
  Affirmation,
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

export function ShadowResult({ quiz, result, onBack, onRetake }: QuizResultViewProps<ShadowScore>) {
  const { t } = useT('app');
  const share = useQuizShare();
  const info = SHADOW_ARCHETYPES[result.archetype];
  if (!info) return <StaleResult quiz={quiz} onBack={onBack} onRetake={onRetake} />;
  const key = result.archetype;
  const localized = (path: string, fallback: string) => t(`quizzes.shadowArchetypes.${key}.${path}`, { defaultValue: fallback });
  const nameOf = (k: string) => t(`quizzes.shadowArchetypes.${k}.name`, { defaultValue: SHADOW_ARCHETYPES[k as keyof typeof SHADOW_ARCHETYPES]?.name ?? k });
  const name = localized('name', info.name);
  const section = (k: string, fallback: string) => t(`quizzes.resultSections.${k}`, { defaultValue: fallback });

  return (
    <ResultLayout
      eyebrow={quiz.title}
      glyph={<QuizIcons.ShadowMaskIcon />}
      verdict={name}
      subtitle={localized('tagline', info.tagline)}
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
          {result.isTie && result.secondary && <CloseCall a={name} b={nameOf(result.secondary)} />}
          <ResultSection title={section('gift', 'The gift')}>
            <Prose>{localized('gift', info.gift)}</Prose>
          </ResultSection>
          <ResultSection title={section('shadow', 'Shadow side')}>
            <Prose>{localized('shadow', info.shadow)}</Prose>
          </ResultSection>
          <ResultSection title={section('integration', 'Integration')}>
            <Prose>{localized('integration', info.integration)}</Prose>
          </ResultSection>
          <Affirmation text={localized('affirmation', info.affirmation)} />
          <p className="reading-meta">
            {section('tarotPairing', 'Tarot pairing')}: <span className="text-ink-2">{localized('tarotPairing', info.tarotPairing)}</span>
          </p>
        </ResultBody>
      }
    />
  );
}
