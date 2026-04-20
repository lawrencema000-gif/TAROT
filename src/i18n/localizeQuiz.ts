import type { QuizDefinition } from '../types';
import i18n from './config';

/**
 * Localize a quiz definition's title, description, and Likert option labels
 * to the active UI locale. Individual question text is NOT translated yet —
 * that's a separate (much larger) content migration, so non-English locales
 * currently still see the question stems in English while the surrounding
 * scaffolding is translated.
 *
 * The quiz id determines which translation key to use. `likertKey` maps the
 * numeric option value (1–5) to a translated Likert label. Options whose
 * value falls outside 1–5 keep their original label (e.g. single-answer
 * quizzes like love language self-identification).
 */
export function localizeQuiz(quiz: QuizDefinition): QuizDefinition {
  const t = (key: string, fallback: string): string => {
    const result = i18n.t(key, { ns: 'app' });
    // i18next returns the key itself when no translation is found
    return result === key ? fallback : result;
  };

  const definitionKey = quizDefinitionKey(quiz.id, quiz.type);

  const title = definitionKey
    ? t(`quizzes.definitions.${definitionKey}.title`, quiz.title)
    : quiz.title;
  const description = definitionKey
    ? t(`quizzes.definitions.${definitionKey}.description`, quiz.description)
    : quiz.description;

  const localizedQuestions = quiz.questions.map((q) => ({
    ...q,
    options: q.options.map((opt) => {
      // Likert 1–5 options share a single translation block
      if (opt.value >= 1 && opt.value <= 5) {
        return { ...opt, label: t(`quizzes.likert.${opt.value}`, opt.label) };
      }
      return opt;
    }),
  }));

  return {
    ...quiz,
    title,
    description,
    questions: localizedQuestions,
  };
}

function quizDefinitionKey(id: string, type: string): string | null {
  // Keys match what exists in app.json quizzes.definitions.*
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
