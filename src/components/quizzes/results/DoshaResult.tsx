import { ResultLayout } from '../../ui';
import { useT } from '../../../i18n/useT';
import { DOSHA_INFO, TRIDOSHIC_INFO, type Dosha, type DoshaResult as DoshaScore } from '../../../data/ayurvedaQuiz';
import { DoshaGlyph } from '../icons';
import {
  AfterResult,
  Affirmation,
  Bullets,
  CloseCall,
  Prose,
  ResultBody,
  ResultSection,
  ScoreRow,
  StaleResult,
  VerdictActions,
  shareFileName,
  useQuizShare,
  type QuizResultViewProps,
} from '../shared';

const DOSHAS: readonly Dosha[] = ['vata', 'pitta', 'kapha'];

export function DoshaResult({ quiz, result, onBack, onRetake }: QuizResultViewProps<DoshaScore>) {
  const { t } = useT('app');
  const share = useQuizShare();
  const info = DOSHA_INFO[result.primary];
  if (!info) return <StaleResult quiz={quiz} onBack={onBack} onRetake={onRetake} />;
  const key = result.primary;
  const localized = (path: string, fallback: string) => t(`ayurveda.doshas.${key}.${path}`, { defaultValue: fallback });
  const nameOf = (d: Dosha) => t(`ayurveda.doshas.${d}.name`, { defaultValue: DOSHA_INFO[d].name });
  const name = nameOf(key);
  // A list from the locale only when it IS a list of strings (a half-merged block arrives as an object).
  const list = (field: 'dietTips' | 'lifestyleTips') => {
    const raw: unknown = t(`ayurveda.doshas.${key}.${field}`, { returnObjects: true, defaultValue: info[field] });
    return Array.isArray(raw) && raw.every((x) => typeof x === 'string') ? (raw as string[]) : info[field];
  };
  const dietTips = list('dietTips');
  const lifestyleTips = list('lifestyleTips');
  const tridoshic = result.tridoshic === true;

  return (
    <ResultLayout
      eyebrow={tridoshic ? t('ayurveda.tridoshic.name', { defaultValue: TRIDOSHIC_INFO.name }) : localized('elements', info.elements)}
      glyph={<DoshaGlyph dosha={key} />}
      verdict={name}
      subtitle={
        <>
          {result.secondary && !tridoshic && (
            <span className="block">
              {t('ayurveda.withSecondary', { defaultValue: 'with secondary {{sec}}', sec: nameOf(result.secondary) })}
            </span>
          )}
          <span className="block">{tridoshic ? t('ayurveda.tridoshic.tagline', { defaultValue: TRIDOSHIC_INFO.tagline }) : localized('tagline', info.tagline)}</span>
        </>
      }
      summary={tridoshic ? t('ayurveda.tridoshic.summary', { defaultValue: TRIDOSHIC_INFO.summary }) : localized('summary', info.summary)}
      onBack={onBack}
      backLabel={t('quizzes.backToQuizzes', { defaultValue: 'Back to quizzes' })}
      actions={
        <VerdictActions
          onShare={() =>
            share({
              quizTitle: quiz.title,
              resultName: tridoshic ? `${t('ayurveda.tridoshic.name', { defaultValue: TRIDOSHIC_INFO.name })} · ${name}` : name,
              affirmation: localized('affirmation', info.affirmation),
              fileName: shareFileName(quiz.id, key),
            })
          }
        />
      }
      footer={
        <ResultBody after={<AfterResult onRetake={onRetake} onBack={onBack} />}>
          {result.isTie && result.coPrimary && DOSHA_INFO[result.coPrimary] && <CloseCall a={name} b={nameOf(result.coPrimary)} />}

          <ResultSection title={t('ayurveda.scoresLabel', { defaultValue: 'Your dosha balance' })}>
            <div className="space-y-4">
              {DOSHAS.map((d) => (
                <ScoreRow
                  key={d}
                  icon={<DoshaGlyph dosha={d} />}
                  name={nameOf(d)}
                  value={result.scores?.[d] ?? 0}
                  max={30}
                  emphasis={d === key}
                />
              ))}
            </div>
          </ResultSection>

          {tridoshic && (
            <ResultSection title={t('ayurveda.tridoshic.readingAs', { defaultValue: 'Reading {{dosha}} as the one leading today', dosha: name })}>
              <Prose>{localized('summary', info.summary)}</Prose>
            </ResultSection>
          )}

          <ResultSection title={t('ayurveda.thrivingLabel', { defaultValue: 'When you are in balance' })}>
            <Prose>{localized('thriving', info.thriving)}</Prose>
          </ResultSection>
          <ResultSection title={t('ayurveda.imbalancedLabel', { defaultValue: 'When you are out of balance' })}>
            <Prose>{localized('outOfBalance', info.outOfBalance)}</Prose>
          </ResultSection>
          <ResultSection title={t('ayurveda.dietLabel', { defaultValue: 'Diet that suits you' })}>
            <Bullets items={dietTips} />
          </ResultSection>
          <ResultSection title={t('ayurveda.lifestyleLabel', { defaultValue: 'Lifestyle that balances you' })}>
            <Bullets items={lifestyleTips} />
          </ResultSection>
          <Affirmation text={localized('affirmation', info.affirmation)} />
        </ResultBody>
      }
    />
  );
}
