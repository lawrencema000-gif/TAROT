import { ResultLayout } from '../../ui';
import * as QuizIcons from '../../ui/QuizIcons';
import { useT } from '../../../i18n/useT';
import { tResultCopy } from '../../../i18n/localizeQuiz';
import { attachmentDescriptions, type AttachmentResult as AttachmentScore } from '../../../data/attachmentQuiz';
import {
  AfterResult,
  Bullets,
  PaperBar,
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

export function AttachmentResult({ quiz, result, onBack, onRetake, saving, onSaveToProfile }: QuizResultViewProps<AttachmentScore>) {
  const { t } = useT('app');
  const share = useQuizShare();
  const info = attachmentDescriptions[result.style];
  if (!info) return <StaleResult quiz={quiz} onBack={onBack} onRetake={onRetake} />;

  const copy = (field: string, fallback: string) => tResultCopy(`attachment.${result.style}.${field}`, fallback);
  const list = (field: string, fallback: readonly string[]) => tResultCopy(`attachment.${result.style}.${field}`, fallback);
  const section = (key: string, fallback: string) => t(`quizzes.resultSections.${key}`, { defaultValue: fallback });
  const name = copy('name', info.name);

  const axis = (key: 'anxiety' | 'avoidance', label: string, caption: string) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-ui">
        <span className="font-semibold text-ink">{label}</span>
        <span className="tabular-nums text-ink-muted">{result[key]}%</span>
      </div>
      <PaperBar value={result[key]} max={100} label={label} emphasis={result[key] > 50} />
      <p className="reading-meta">{caption}</p>
    </div>
  );

  return (
    <ResultLayout
      eyebrow={quiz.title}
      glyph={<QuizIcons.AttachmentRingsIcon />}
      verdict={name}
      subtitle={copy('subtitle', info.subtitle)}
      summary={copy('description', info.description)}
      onBack={onBack}
      backLabel={t('quizzes.backToQuizzes', { defaultValue: 'Back to quizzes' })}
      actions={
        <VerdictActions
          saving={saving}
          onSave={onSaveToProfile ? () => onSaveToProfile('attachment', result.style) : undefined}
          onShare={() =>
            share({
              quizTitle: quiz.title,
              resultName: name,
              affirmation: copy('miniRitual', info.miniRitual),
              fileName: shareFileName(quiz.id, result.style),
            })
          }
        />
      }
      footer={
        <ResultBody after={<AfterResult onRetake={onRetake} onBack={onBack} />}>
          <ResultSection title={section('yourDimensions', 'Your dimensions')}>
            <div className="space-y-4">
              {axis('anxiety', section('anxietyAxis', 'Anxiety'), section('fearOfAbandonmentAndNeedForReassurance', 'Fear of abandonment and need for reassurance'))}
              {axis('avoidance', section('avoidanceAxis', 'Avoidance'), section('discomfortWithClosenessAndDependence', 'Discomfort with closeness and dependence'))}
            </div>
          </ResultSection>

          <ResultSection title={section('inRelationships', 'In relationships')}>
            <Bullets items={list('inRelationships', info.inRelationships).slice(0, 4)} />
          </ResultSection>
          <ResultSection title={section('commonTriggers', 'Common triggers')}>
            <Bullets items={list('triggers', info.triggers)} />
          </ResultSection>
          <ResultSection title={section('healingPractices', 'Healing practices')}>
            <Bullets items={list('healingPractices', info.healingPractices)} />
          </ResultSection>
          <ResultSection title={section('whatYouNeedFromPartner', 'What you need from a partner')}>
            <Bullets items={list('whatYouNeedFromPartner', info.whatYouNeedFromPartner)} />
          </ResultSection>

          <ResultSection title={section('journalPrompts', 'Journal prompts')}>
            <div className="space-y-3">
              {list('journalPrompts', info.journalPrompts).slice(0, 3).map((p, i) => (
                <Quote key={i}>{p}</Quote>
              ))}
            </div>
          </ResultSection>

          <ResultSection title={section('pathToSecure', 'Path to secure')}>
            <Prose>{copy('pathToSecure', info.pathToSecure)}</Prose>
          </ResultSection>

          <ResultSection title={section('miniRitual', 'Mini ritual')}>
            <Prose>{copy('miniRitual', info.miniRitual)}</Prose>
          </ResultSection>

          <ResultSection title={section('tarotArchetype', 'Tarot archetype')}>
            <p className="heading-display-md text-ink">{copy('tarotArchetype.card', info.tarotArchetype.card)}</p>
            <Prose>{copy('tarotArchetype.reason', info.tarotArchetype.reason)}</Prose>
          </ResultSection>
        </ResultBody>
      }
    />
  );
}
