import { ResultLayout } from '../../ui';
import * as QuizIcons from '../../ui/QuizIcons';
import { useT } from '../../../i18n/useT';
import { tResultCopy } from '../../../i18n/localizeQuiz';
import { loveLanguageDescriptions, type LoveLanguageResult as LoveLanguageScore } from '../../../data/quizzes';
import {
  AfterResult,
  Bullets,
  CloseCall,
  Prose,
  Quote,
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

export function LoveLanguageResult({ quiz, result, onBack, onRetake, saving, saved, onSaveToProfile }: QuizResultViewProps<LoveLanguageScore>) {
  const { t } = useT('app');
  const share = useQuizShare();
  const sorted = Object.entries(result.scores ?? {}).sort((a, b) => b[1] - a[1]);
  const primary = result.primary ?? sorted[0]?.[0];
  const info = primary ? loveLanguageDescriptions[primary] : undefined;
  if (!info) return <StaleResult quiz={quiz} onBack={onBack} onRetake={onRetake} />;

  const secondaryKey = result.coPrimary ?? sorted.find(([k]) => k !== primary)?.[0];
  const name = (key: string) => tResultCopy(`loveLanguage.${key}.title`, loveLanguageDescriptions[key]?.title ?? key);
  const copy = (field: string, fallback: string) => tResultCopy(`loveLanguage.${primary}.${field}`, fallback);
  const list = (field: string, fallback: readonly string[]) => tResultCopy(`loveLanguage.${primary}.${field}`, fallback);
  const section = (key: string, fallback: string) => t(`quizzes.resultSections.${key}`, { defaultValue: fallback });
  // Every language in the unbroken tie (all five on an all-Neutral run), not
  // just the one co-primary a two-name line had room for.
  const tied = tiedKeys(primary, result.tied, result.coPrimary, result.isTie).filter((k) => loveLanguageDescriptions[k]);
  const shared = tied.length >= 2;
  const whatItMeans = copy('whatItMeans', info.whatItMeans);

  return (
    <ResultLayout
      eyebrow={quiz.title}
      glyph={<QuizIcons.LoveLanguagesIcon />}
      verdict={name(primary)}
      subtitle={
        shared ? (
          <SharedWith names={tied.slice(1).map(name)} />
        ) : secondaryKey ? (
          t('quizzes.resultSections.secondaryIs', { defaultValue: 'Secondary: {{name}}', name: name(secondaryKey) })
        ) : undefined
      }
      summary={shared ? undefined : whatItMeans}
      onBack={onBack}
      backLabel={t('quizzes.backToQuizzes', { defaultValue: 'Back to quizzes' })}
      actions={
        <VerdictActions
          saving={saving}
          saved={saved}
          onSave={onSaveToProfile ? () => onSaveToProfile('love-language', primary) : undefined}
          onShare={() =>
            share({
              quizTitle: quiz.title,
              resultName: name(primary),
              affirmation: copy('description', info.description),
              fileName: shareFileName(quiz.id, primary),
            })
          }
        />
      }
      footer={
        <ResultBody after={<AfterResult onRetake={onRetake} onBack={onBack} />}>
          {shared && <CloseCall exact names={tied.map(name)} />}

          <ResultSection title={section('yourScores', 'Your scores')}>
            <div className="space-y-4">
              {sorted.map(([lang, score]) => (
                <ScoreRow key={lang} name={name(lang)} value={score} max={15} emphasis={lang === primary || tied.includes(lang)} />
              ))}
            </div>
          </ResultSection>

          {shared && <ReadingFirst name={name(primary)}>{whatItMeans}</ReadingFirst>}

          <ResultSection title={section('whatYouNeed', 'What you need')}>
            <Bullets items={list('whatYouNeed', info.whatYouNeed)} />
          </ResultSection>
          <ResultSection title={section('whatToAvoid', 'What to avoid')}>
            <Bullets items={list('whatToAvoid', info.whatToAvoid)} />
          </ResultSection>

          <ResultSection title={section('tryThisWeek', 'Try this week')}>
            <ul className="divide-y divide-paper-hairline">
              {info.weeklyChecklist.map((item, i) => (
                <li key={i} className="flex items-baseline justify-between gap-4 py-2">
                  <span className="reading-copy">{tResultCopy(`loveLanguage.${primary}.weeklyChecklist.${i}.task`, item.task)}</span>
                  <span className="shrink-0 text-meta tabular-nums text-ink-muted">
                    {tResultCopy(`loveLanguage.${primary}.weeklyChecklist.${i}.frequency`, item.frequency)}
                  </span>
                </li>
              ))}
            </ul>
          </ResultSection>

          <ResultSection title={section('whenThisLanguageIsWellFed', 'When this language is well-fed')}>
            <Prose>{copy('whenHealthy', info.whenHealthy)}</Prose>
          </ResultSection>
          <ResultSection title={section('whenThisLanguageGoesUnmet', 'When this language goes unmet')}>
            <Prose>{copy('whenDeprived', info.whenDeprived)}</Prose>
          </ResultSection>

          <ResultSection title={section('howToAskForIt', 'How to ask for it')}>
            <div className="space-y-3">
              {list('howToAskForIt', info.howToAskForIt).map((phrase, i) => (
                <Quote key={i}>{phrase}</Quote>
              ))}
            </div>
          </ResultSection>

          <ResultSection title={section('forYourPartner', 'For the people who love you')}>
            <Prose>{copy('partnerGuide', info.partnerGuide)}</Prose>
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
