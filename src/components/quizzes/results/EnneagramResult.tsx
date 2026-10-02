import { ResultLayout } from '../../ui';
import { useT } from '../../../i18n/useT';
import { tResultCopy } from '../../../i18n/localizeQuiz';
import { enneagramDescriptions, type EnneagramResult as EnneagramScore } from '../../../data/enneagramQuiz';
import {
  AfterResult,
  Bullets,
  CloseCall,
  Facts,
  Prose,
  Quote,
  ResultBody,
  ResultSection,
  StaleResult,
  VerdictActions,
  shareFileName,
  useQuizShare,
  type QuizResultViewProps,
} from '../shared';

export function EnneagramResult({ quiz, result, onBack, onRetake, saving, onSaveToProfile }: QuizResultViewProps<EnneagramScore>) {
  const { t } = useT('app');
  const share = useQuizShare();
  const n = result.primaryType;
  const info = enneagramDescriptions[n];
  if (!info) return <StaleResult quiz={quiz} onBack={onBack} onRetake={onRetake} />;

  const copy = (field: string, fallback: string) => tResultCopy(`enneagram.${n}.${field}`, fallback);
  const list = (field: string, fallback: readonly string[]) => tResultCopy(`enneagram.${n}.${field}`, fallback);
  const typeName = (k: number) => tResultCopy(`enneagram.${k}.name`, enneagramDescriptions[k]?.name ?? String(k));
  const typeLabel = (k: number) => t('quizzes.resultSections.enneagramType', { defaultValue: 'Type {{n}}', n: k });
  const section = (key: string, fallback: string) => t(`quizzes.resultSections.${key}`, { defaultValue: fallback });
  const name = copy('name', info.name);
  const wingName = result.wing ? typeName(result.wing) : null;

  return (
    <ResultLayout
      eyebrow={quiz.title}
      glyph={<span className="font-sans text-3xl font-semibold tabular-nums">{n}</span>}
      glyphHidden={false}
      verdict={<><span className="sr-only">{typeLabel(n)} · </span>{name}</>}
      subtitle={
        <>
          <span className="block">{copy('title', info.title)}</span>
          {result.wing && (
            <span className="block text-mystic-300">
              {t('quizzes.resultSections.wingIs', { defaultValue: 'Wing {{n}} · {{name}}', n: result.wing, name: wingName })}
            </span>
          )}
        </>
      }
      summary={copy('description', info.description)}
      onBack={onBack}
      backLabel={t('quizzes.backToQuizzes', { defaultValue: 'Back to quizzes' })}
      actions={
        <VerdictActions
          saving={saving}
          onSave={onSaveToProfile ? () => onSaveToProfile('enneagram', String(n), { enneagram_wing: result.wing }) : undefined}
          onShare={() =>
            share({
              quizTitle: quiz.title,
              resultName: `${typeLabel(n)}${result.wing ? `w${result.wing}` : ''} · ${name}`,
              affirmation: copy('miniRitual', info.miniRitual),
              fileName: shareFileName(quiz.id, `type-${n}`),
            })
          }
        />
      }
      footer={
        <ResultBody after={<AfterResult onRetake={onRetake} onBack={onBack} />}>
          {result.isTie && result.coPrimary && <CloseCall a={`${typeLabel(n)} ${name}`} b={`${typeLabel(result.coPrimary)} ${typeName(result.coPrimary)}`} />}

          <ResultSection title={section('corePattern', 'Core pattern')}>
            <Facts
              items={[
                { label: section('coreMotivation', 'Core motivation'), value: copy('coreMotivation', info.coreMotivation) },
                { label: section('coreFear', 'Core fear'), value: copy('coreFear', info.coreFear) },
                { label: section('coreDesire', 'Core desire'), value: copy('coreDesire', info.coreDesire) },
              ]}
            />
          </ResultSection>

          <ResultSection title={section('growthDirection', 'Growth direction')}>
            <p className="text-ui font-semibold text-ink tabular-nums">
              {typeLabel(n)} → {typeLabel(info.growthPath.direction)} · {typeName(info.growthPath.direction)}
            </p>
            <Prose>{copy('growthPath.description', info.growthPath.description)}</Prose>
          </ResultSection>

          <ResultSection title={section('stressDirection', 'Stress direction')}>
            <p className="text-ui font-semibold text-ink tabular-nums">
              {typeLabel(n)} → {typeLabel(info.stressPath.direction)} · {typeName(info.stressPath.direction)}
            </p>
            <Prose>{copy('stressPath.description', info.stressPath.description)}</Prose>
          </ResultSection>

          <ResultSection title={section('growthPractices', 'Growth practices')}>
            <Bullets items={list('growthPractices', info.growthPractices)} />
          </ResultSection>

          <ResultSection title={section('realLifeExamples', 'Real-life examples')}>
            <Bullets items={list('realLifeExamples', info.realLifeExamples)} />
          </ResultSection>

          <ResultSection title={section('tarotArchetype', 'Tarot archetype')}>
            <p className="heading-display-md text-ink">{copy('tarotArchetype.card', info.tarotArchetype.card)}</p>
            <Prose>{copy('tarotArchetype.reason', info.tarotArchetype.reason)}</Prose>
          </ResultSection>

          <ResultSection title={section('miniRitual', 'Mini ritual')}>
            <Prose>{copy('miniRitual', info.miniRitual)}</Prose>
            <p className="reading-meta pt-2">{section('journalPrompt', 'Journal prompt')}</p>
            <Quote>{copy('journalPrompt', info.journalPrompt)}</Quote>
          </ResultSection>

          {Array.isArray(result.tritype) && result.tritype.length === 3 && (
            <p className="reading-meta tabular-nums">
              {t('quizzes.resultSections.tritype', { defaultValue: 'Tritype {{a}}-{{b}}-{{c}}: your leading type in each centre (body, heart, head).', a: result.tritype[0], b: result.tritype[1], c: result.tritype[2] })}
            </p>
          )}
        </ResultBody>
      }
    />
  );
}
