import type { QuizDefinition, QuizQuestion } from '../types';
import i18n from './config';

/**
 * Localize a quiz definition's title, description, question text, and option
 * labels to the active UI locale.
 *
 * Key paths the renderer reads (the English TS text is always the fallback):
 *   curated quizzes   quizzes.definitions.<key>.{title,description}
 *                     quizzes.definitions.<key>.questions.<qid>.text
 *                     quizzes.definitions.<key>.questions.<qid>.options.<value>
 *   extra quizzes     extraQuizzes.<key>.{title,description}
 *                     extraQuizzes.<key>.questions.<qid>.text
 *                     extraQuizzes.<key>.questions.<qid>.options.<value>
 *   shared Likert     quizzes.likert.<1..5>    (every five-point agreement item,
 *                     keyed by the option's English label, not its value)
 *
 * Likert detection is PER QUESTION, not per quiz: the mood check's bespoke
 * five-option items ("Exhausted" … "Energized") used to be overwritten with
 * "Strongly disagree" … because the quiz happened to have five options
 * everywhere, and the PHQ-2 screener now mixes four-point frequency items
 * with ten Likert items.
 */
export function localizeQuiz(quiz: QuizDefinition): QuizDefinition {
  const t = (key: string, fallback: string): string => {
    const result = i18n.t(key, { ns: 'app' });
    // i18next returns the key itself when no translation is found
    return result === key ? fallback : result;
  };

  const basePath = quizBasePath(quiz);

  const title = basePath ? t(`${basePath}.title`, quiz.title) : quiz.title;
  const description = basePath ? t(`${basePath}.description`, quiz.description) : quiz.description;

  const localizedQuestions = quiz.questions.map((q) => {
    const questionText = basePath
      ? t(`${basePath}.questions.${q.id}.text`, q.text)
      : q.text;

    const likert = isLikertQuestion(q);
    const options = q.options.map((opt) => {
      // Per-quiz per-question option translation (forced-choice and bespoke items)
      if (basePath) {
        const perOptionKey = `${basePath}.questions.${q.id}.options.${opt.value}`;
        const translated = i18n.t(perOptionKey, { ns: 'app' });
        if (translated !== perOptionKey) {
          return { ...opt, label: translated };
        }
      }
      // Shared Likert labels (only for a real agreement item). The label is
      // chosen by what the option SAYS, never by the value it records: a
      // reverse-keyed item declares value 5 on "Strongly Disagree", and
      // reading quizzes.likert.5 for it drew "Strongly agree" on the option
      // that scores as disagreement, so every reverse-keyed item since
      // April 2026 was scored backwards.
      const scalePoint = likert ? LIKERT_SCALE.indexOf(opt.label.toLowerCase()) : -1;
      if (scalePoint >= 0) {
        return { ...opt, label: t(`quizzes.likert.${scalePoint + 1}`, opt.label) };
      }
      return opt;
    });

    return { ...q, text: questionText, options, likert };
  });

  return {
    ...quiz,
    title,
    description,
    questions: localizedQuestions,
  };
}

/** The agreement scale in drawing order; position + 1 is the quizzes.likert.<n> key. */
const LIKERT_SCALE = ['strongly disagree', 'disagree', 'neutral', 'agree', 'strongly agree'];
const LIKERT_LABELS = new Set(LIKERT_SCALE);

/** Five options whose English labels are the agreement scale, in either keying direction. */
export function isLikertQuestion(q: QuizQuestion): boolean {
  return q.options.length === 5 && q.options.every((o) => LIKERT_LABELS.has(o.label.toLowerCase()));
}

/** `quizzes.definitions.<key>` or `extraQuizzes.<key>` for a quiz, or null when it has no locale block. */
export function quizBasePath(quiz: Pick<QuizDefinition, 'id' | 'type'>): string | null {
  const extraKey = quiz.type === 'extra-dimensional' ? extraQuizDefinitionKey(quiz.id) : null;
  if (extraKey) return `extraQuizzes.${extraKey}`;
  const definitionKey = quizDefinitionKey(quiz.id, quiz.type);
  return definitionKey ? `quizzes.definitions.${definitionKey}` : null;
}

export function quizDefinitionKey(id: string, type: string): string | null {
  // Keys match what exists in app.json quizzes.definitions.*
  if (id.startsWith('mbti-quick')) return 'mbtiQuick';
  if (id.startsWith('court-match') || type === 'court-match') return 'courtMatch';
  if (id.startsWith('mbti')) return 'mbti';
  if (id.startsWith('love-language')) return 'loveLanguage';
  if (id.startsWith('enneagram')) return 'enneagram';
  if (id.startsWith('big-five') || type === 'bigfive') return 'bigfive';
  if (id.startsWith('attachment')) return 'attachment';
  if (id.startsWith('mood')) return 'mood';
  // The JSON blocks for these three are camelCase / hyphenated; they carried
  // full ja/ko/zh stems that were never shown because this map returned
  // null for them (R3 F1).
  if (id.startsWith('shadow-archetype')) return 'shadowArchetype';
  if (id.startsWith('element-affinity')) return 'elementAffinity';
  if (id.startsWith('ayurveda')) return 'ayurveda-dosha';
  return null;
}

/**
 * Sprint-3 extra quizzes use a different i18n namespace (`extraQuizzes.<id>.*`)
 * — they are numerous and batched. Keep them separate from the curated
 * `quizzes.definitions.*` block.
 */
export function extraQuizDefinitionKey(id: string): string | null {
  if (id.endsWith('-v1') || id.endsWith('-v2')) {
    return id.replace(/-v\d+$/, '');
  }
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
    typeKey === 'shadow-archetype' ? 'shadowArchetype' :
    typeKey === 'element-affinity' ? 'elementAffinity' :
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

/**
 * Localize the metadata (timeEstimate + whatYouGet) for a Sprint-3 EXTRA
 * quiz (dark-triad, money-personality, boundaries, burnout, communication,
 * etc.). These live under the `extraQuizzes.<key>.*` namespace in the
 * locale JSON files instead of the `quizzes.definitions.*` namespace
 * used by the curated 11. Falls back to the EN values from
 * EXTRA_QUIZ_METADATA when the locale entry is missing.
 */
export function localizeExtraQuizMetadata<T extends { timeEstimate: string; whatYouGet: readonly string[] }>(
  quizId: string,
  fallback: T,
): T {
  // Strip the version suffix: "money-personality-v1" → "money-personality"
  const key = quizId.replace(/-v\d+$/, '');
  const timeEstimate = i18n.t(
    `extraQuizzes.${key}.timeEstimate`,
    { ns: 'app', defaultValue: fallback.timeEstimate },
  );
  const whatYouGetRaw = i18n.t(
    `extraQuizzes.${key}.whatYouGet`,
    { ns: 'app', returnObjects: true, defaultValue: fallback.whatYouGet },
  );
  const whatYouGet = Array.isArray(whatYouGetRaw) ? (whatYouGetRaw as string[]) : fallback.whatYouGet;
  return { ...fallback, timeEstimate, whatYouGet };
}

/**
 * Result copy for the curated dictionaries (mbtiDescriptions,
 * loveLanguageDescriptions, bigFiveDescriptions, enneagramDescriptions,
 * attachmentDescriptions, moodDescriptions). Keys live under
 * `quizzes.resultCopy.<dictionary>.<type>.<field>` — NOT `quizzes.results`,
 * which is already the string "Results" in every locale — and the TS text
 * is the defaultValue, so the screen reads before any translation lands.
 *
 *   tResultCopy('mbti.INTJ.title', info.title)            → string
 *   tResultCopy('mbti.INTJ.strengths', info.strengths)    → string[]
 *
 * An array fallback asks i18next for an object; anything that is not an
 * array of strings falls back to the TS value, so a half-translated block
 * can never hand the renderer an object to `.map` over.
 */
export function tResultCopy(path: string, fallback: string): string;
export function tResultCopy(path: string, fallback: readonly string[]): string[];
export function tResultCopy(path: string, fallback: string | readonly string[]): string | string[] {
  const key = `quizzes.resultCopy.${path}`;
  if (typeof fallback === 'string') {
    return i18n.t(key, { ns: 'app', defaultValue: fallback });
  }
  const raw = i18n.t(key, { ns: 'app', returnObjects: true, defaultValue: fallback as string[] });
  return Array.isArray(raw) && raw.every((x) => typeof x === 'string') ? (raw as string[]) : [...fallback];
}
