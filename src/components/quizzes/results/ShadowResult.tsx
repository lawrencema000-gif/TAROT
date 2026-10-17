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
  SharedWith,
  StaleResult,
  VerdictActions,
  shareFileName,
  tiedKeys,
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
  // Every archetype in the unbroken tie (all seven on an all-Neutral run).
  const tied = tiedKeys<string>(key, result.tied, result.secondary, result.isTie).filter((k) => k in SHADOW_ARCHETYPES);
  const shared = tied.length >= 2;
  const tagline = localized('tagline', info.tagline);

  return (
    <ResultLayout
      eyebrow={quiz.title}
      glyph={<QuizIcons.ShadowMaskIcon />}
      verdict={name}
      subtitle={
        shared ? (
          <>
            <span className="block">{tagline}</span>
            <SharedWith names={tied.slice(1).map(nameOf)} />
          </>
        ) : (
          tagline
        )
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
          {shared && <CloseCall names={[name, ...tied.slice(1).map(nameOf)]} />}
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
