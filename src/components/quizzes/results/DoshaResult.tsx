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
  ReadingFirst,
  ResultBody,
  ResultSection,
  ScoreRow,
  SharedWith,
  StaleResult,
  VerdictActions,
  shareFileName,
  tiedKeys,
  useQuizShare,
  type QuizResultViewProps,
} from '../shared';

const DOSHAS: readonly Dosha[] = ['vata', 'pitta', 'kapha'];

/**
 * A tie at the top names every tied dosha (close call, "Shared with", the
 * bars) and reads the first one's card as "first", not as the one leading.
 * In the exact three-way tie (10/10/10) the tridoshic block above already
 * says all three are level, so the close call and the "Shared with" line
 * are not repeated there; the bars and the heading still say it.
 */
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
  const tied = tiedKeys<Dosha>(key, result.tied, result.coPrimary, result.isTie).filter((d) => DOSHA_INFO[d]);
  const shared = tied.length >= 2;
  // 10/10/10: every dosha level, which the tridoshic copy already says.
  const allLevel = tied.length === DOSHAS.length;
  const others = tied.slice(1).map(nameOf);

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
          {shared && !allLevel && <SharedWith names={others} />}
          <span className="block">{tridoshic ? t('ayurveda.tridoshic.tagline', { defaultValue: TRIDOSHIC_INFO.tagline }) : localized('tagline', info.tagline)}</span>
        </>
      }
      summary={
        tridoshic
          ? t('ayurveda.tridoshic.summary', { defaultValue: TRIDOSHIC_INFO.summary })
          : shared
            ? undefined
            : localized('summary', info.summary)
      }
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
          {shared && !allLevel && <CloseCall exact names={[name, ...others]} />}

          <ResultSection title={t('ayurveda.scoresLabel', { defaultValue: 'Your dosha balance' })}>
            <div className="space-y-4">
              {DOSHAS.map((d) => (
                <ScoreRow
                  key={d}
                  icon={<DoshaGlyph dosha={d} />}
                  name={nameOf(d)}
                  value={result.scores?.[d] ?? 0}
                  max={30}
                  emphasis={d === key || tied.includes(d)}
                />
              ))}
            </div>
          </ResultSection>

          {shared ? (
            <ReadingFirst name={name}>{localized('summary', info.summary)}</ReadingFirst>
          ) : (
            tridoshic && (
              <ResultSection title={t('ayurveda.tridoshic.readingAs', { defaultValue: 'Reading {{dosha}} as the one leading today', dosha: name })}>
                <Prose>{localized('summary', info.summary)}</Prose>
              </ResultSection>
            )
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
