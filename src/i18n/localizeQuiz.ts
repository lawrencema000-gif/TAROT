import type { QuizDefinition } from '../types';
import i18n from './config';

/**
 * Localize a quiz definition's title, description, question text, and option
 * labels to the active UI locale.
 *
 * The older quizzes (full MBTI, Big Five, Enneagram, Attachment) only have
 * translations for title/description/Likert labels — their individual
 * question stems currently still render in English because translating
 * ~200 items to 4 locales is a separate content job.
 *
 * Newer quizzes (Quick MBTI, Tarot Court Match) ship with per-question
 * translations under `quizzes.definitions.<id>.questions.<qid>.text` and
 * per-option labels under `quizzes.definitions.<id>.questions.<qid>.options.<value>`.
 */
export function localizeQuiz(quiz: QuizDefinition): QuizDefinition {
  const t = (key: string, fallback: string): string => {
    const result = i18n.t(key, { ns: 'app' });
    // i18next returns the key itself when no translation is found
    return result === key ? fallback : result;
  };

  const definitionKey = quizDefinitionKey(quiz.id, quiz.type);
  const isLikertQuiz = quiz.questions.every((q) => q.options.length === 5);

  const title = definitionKey
    ? t(`quizzes.definitions.${definitionKey}.title`, quiz.title)
    : quiz.title;
  const description = definitionKey
    ? t(`quizzes.definitions.${definitionKey}.description`, quiz.description)
    : quiz.description;

  const localizedQuestions = quiz.questions.map((q) => {
    const questionText = definitionKey
      ? t(`quizzes.definitions.${definitionKey}.questions.${q.id}.text`, q.text)
      : q.text;

    const options = q.options.map((opt) => {
      // Per-quiz per-question option translation (forced-choice quizzes)
      if (definitionKey) {
        const perOptionKey = `quizzes.definitions.${definitionKey}.questions.${q.id}.options.${opt.value}`;
        const translated = i18n.t(perOptionKey, { ns: 'app' });
        if (translated !== perOptionKey) {
          return { ...opt, label: translated };
        }
      }
      // Shared Likert 1–5 labels (applies only to classic Likert quizzes)
      if (isLikertQuiz && opt.value >= 1 && opt.value <= 5) {
        return { ...opt, label: t(`quizzes.likert.${opt.value}`, opt.label) };
      }
      return opt;
    });

    return { ...q, text: questionText, options };
  });

  return {
    ...quiz,
    title,
    description,
    questions: localizedQuestions,
  };
}

function quizDefinitionKey(id: string, type: string): string | null {
  // Keys match what exists in app.json quizzes.definitions.*
  if (id.startsWith('mbti-quick')) return 'mbtiQuick';
  if (id.startsWith('court-match') || type === 'court-match') return 'courtMatch';
  if (id.startsWith('mbti')) return 'mbti';
  if (id.startsWith('love-language')) return 'loveLanguage';
  if (id.startsWith('enneagram')) return 'enneagram';
  if (id.startsWith('big-five') || type === 'bigfive') return 'bigfive';
  if (id.startsWith('attachment')) return 'attachment';
  if (id.startsWith('mood')) return 'mood';
  return null;
}

/**
 * Return the locale-appropriate `timeEstimate` and `whatYouGet` for a quiz
 * type key (as stored in quizMetadata in data/quizzes.ts — e.g. 'mood-check',
 * 'big-five'). Falls back to the data-file value if the translation is
 * missing.
 */
export function localizeQuizMetadata<T extends { timeEstimate: string; whatYouGet: readonly string[] }>(
  typeKey: string,
  fallback: T,
): T {
  const definitionKey =
    typeKey === 'mood-check' ? 'mood' :
    typeKey === 'love-language' ? 'loveLanguage' :
    typeKey === 'big-five' ? 'bigfive' :
    typeKey === 'mbti-quick' ? 'mbtiQuick' :
    typeKey === 'court-match' ? 'courtMatch' :
    typeKey;
  const timeEstimate = i18n.t(
    `quizzes.definitions.${definitionKey}.timeEstimate`,
    { ns: 'app', defaultValue: fallback.timeEstimate },
  );
  const whatYouGetRaw = i18n.t(
    `quizzes.definitions.${definitionKey}.whatYouGet`,
    { ns: 'app', returnObjects: true, defaultValue: fallback.whatYouGet },
  );
  const whatYouGet = Array.isArray(whatYouGetRaw) ? (whatYouGetRaw as string[]) : fallback.whatYouGet;
  return { ...fallback, timeEstimate, whatYouGet };
}
