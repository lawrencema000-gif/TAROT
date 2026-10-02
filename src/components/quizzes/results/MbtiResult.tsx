import { ResultLayout, Tag } from '../../ui';
import { useT } from '../../../i18n/useT';
import { tResultCopy } from '../../../i18n/localizeQuiz';
import { mbtiDescriptions, type MBTIAxis, type MBTIResult as MBTIScore } from '../../../data/quizzes';
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

const AXES: { axis: MBTIAxis; a: string; b: string }[] = [
  { axis: 'EI', a: 'E', b: 'I' },
  { axis: 'SN', a: 'S', b: 'N' },
  { axis: 'TF', a: 'T', b: 'F' },
  { axis: 'JP', a: 'J', b: 'P' },
];

/**
 * The 16-type result (full and quick quiz). The axis strengths lead the
 * paper so a coin-flip letter reads as a coin flip (R3 §2.1): each axis
 * shows both poles' share and a "Borderline" tag when the scorer says so.
 */
export function MbtiResult({ quiz, result, onBack, onRetake, saving, onSaveToProfile }: QuizResultViewProps<MBTIScore>) {
  const { t } = useT('app');
  const share = useQuizShare();
  const info = mbtiDescriptions[result.type];
  if (!info) return <StaleResult quiz={quiz} onBack={onBack} onRetake={onRetake} />;

  const copy = (field: string, fallback: string) => tResultCopy(`mbti.${result.type}.${field}`, fallback);
  const list = (field: string, fallback: readonly string[]) => tResultCopy(`mbti.${result.type}.${field}`, fallback);
  const title = copy('title', info.title);
  const section = (key: string, fallback: string) => t(`quizzes.resultSections.${key}`, { defaultValue: fallback });

  const dims = result.dimensions ?? {};
  const borderline = result.borderline ?? ({} as Partial<Record<MBTIAxis, boolean>>);

  return (
    <ResultLayout
      eyebrow={quiz.title}
      glyph={result.type}
      glyphHidden={false}
      verdict={title}
      subtitle={copy('subtitle', info.subtitle)}
      summary={copy('description', info.description)}
      onBack={onBack}
      backLabel={t('quizzes.backToQuizzes', { defaultValue: 'Back to quizzes' })}
      actions={
        <VerdictActions
          saving={saving}
          onSave={onSaveToProfile ? () => onSaveToProfile('mbti', result.type) : undefined}
          onShare={() =>
            share({
              quizTitle: quiz.title,
              resultName: `${result.type} · ${title}`,
              affirmation: copy('miniRitual', info.miniRitual),
              fileName: shareFileName(quiz.id, result.type),
            })
          }
        />
      }
      footer={
        <ResultBody after={<AfterResult onRetake={onRetake} onBack={onBack} />}>
          <ResultSection title={section('axisStrengths', 'Where you lean')}>
            <div className="space-y-4">
              {AXES.map(({ axis, a, b }) => {
                const first = dims[a] ?? 0;
                const second = dims[b] ?? 0;
                const total = first + second;
                const pctA = total > 0 ? Math.round((first / total) * 100) : 50;
                const lead = first >= second ? a : b;
                return (
                  <div key={axis} className="space-y-1.5">
                    <div className="flex items-center justify-between text-ui tabular-nums">
                      <span className={lead === a ? 'font-semibold text-ink' : 'text-ink-muted'}>
                        {a} {pctA}%
                      </span>
                      {borderline[axis] && (
                        <Tag tone="gold" size="sm">{section('borderline', 'Borderline')}</Tag>
                      )}
                      <span className={lead === b ? 'font-semibold text-ink' : 'text-ink-muted'}>
                        {b} {100 - pctA}%
                      </span>
                    </div>
                    <PaperBar value={pctA} max={100} label={`${a} / ${b}`} emphasis />
                  </div>
                );
              })}
            </div>
          </ResultSection>

          <ResultSection title={section('strengths', 'Strengths')}>
            <Bullets items={list('strengths', info.strengths)} />
          </ResultSection>
          <ResultSection title={section('blindSpots', 'Blind spots')}>
            <Bullets items={list('blindSpots', info.blindSpots)} />
          </ResultSection>
          <ResultSection title={section('underStress', 'Under stress')}>
            <Bullets items={list('underStress', info.underStress)} />
          </ResultSection>
          <ResultSection title={section('inRelationships', 'In relationships')}>
            <Bullets items={list('inRelationships', info.inRelationships)} />
          </ResultSection>
          <ResultSection title={section('atWork', 'At work')}>
            <Bullets items={list('atWork', info.atWork)} />
          </ResultSection>

          <ResultSection title={section('growthQuests', 'Growth quests')}>
            <div className="space-y-3">
              {info.growthQuests.map((quest, i) => (
                <div key={i}>
                  <p className="text-ui font-semibold text-ink">{tResultCopy(`mbti.${result.type}.growthQuests.${i}.title`, quest.title)}</p>
                  <Prose>{tResultCopy(`mbti.${result.type}.growthQuests.${i}.description`, quest.description)}</Prose>
                </div>
              ))}
            </div>
          </ResultSection>

          <ResultSection title={section('stressSignature', 'Stress signature')}>
            <Prose>{copy('stressSignature', info.stressSignature)}</Prose>
            <p className="reading-meta pt-2">{section('recoveryPath', 'Recovery path')}</p>
            <Prose>{copy('recoveryPath', info.recoveryPath)}</Prose>
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

          <ResultSection title={section('pairedWith', 'Types people often pair you with')}>
            <div className="flex flex-wrap gap-2">
              {info.compatibility.map((type) => (
                <Tag key={type} tone="blue" size="md">{type}</Tag>
              ))}
            </div>
            <p className="reading-meta">{section('pairedWithNote', 'Folk wisdom, not a finding — the best pairing is the one you are in.')}</p>
          </ResultSection>
        </ResultBody>
      }
    />
  );
}
