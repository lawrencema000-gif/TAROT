import type { QuizDefinition } from '../../types';
import { EXTRA_QUIZ_SCORING } from '../../data/extraQuizzes';

type T = (key: string, opts?: Record<string, unknown>) => string;

/** `extraQuizzes.<key>` for an extra quiz id ("boundaries-v1" → "boundaries"). */
export function extraQuizKey(quizId: string): string {
  return quizId.replace(/-v\d+$/, '');
}

/**
 * The name of an extra quiz's result key or scored dimension, the one way
 * every surface asks for it (result screen, score bars, early reading,
 * list chip):
 *
 *   1. extraQuizzes.<key>.results.<k>.name   — a result card
 *   2. extraQuizzes.<key>.dimensions.<k>     — a scored component that is
 *                                              not a card (self-compassion)
 *   3. the data module's English (card name, then dimension label, then k)
 *
 * Step 1 is asked only when the card exists in the data module and step 2
 * only when the data module labels the dimension, so a component never
 * asks for a card that does not exist (and never logs a missing key).
 */
export function extraResultName(quizId: string, k: string, t: T): string {
  const entry = EXTRA_QUIZ_SCORING[quizId];
  const quizKey = extraQuizKey(quizId);
  const card = entry?.info[k];
  if (card) return t(`extraQuizzes.${quizKey}.results.${k}.name`, { defaultValue: card.name });
  const label = entry?.dimensionLabels?.[k];
  if (label) return t(`extraQuizzes.${quizKey}.dimensions.${k}`, { defaultValue: label });
  return k;
}

/**
 * The top of the answer scale each scored dimension is recorded on — the
 * largest option value among its questions. Every Likert item tops out at
 * 5, but the PHQ-2 core items are recorded on the instrument's own 1-4
 * frequency scale, and drawing them "out of 5" put the screener's own
 * verdict bar (4.0, the worst possible answer) below the 5.0 Likert bars.
 */
export function dimensionScaleMax(quiz: QuizDefinition, dimensions: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of dimensions) out[d] = 0;
  for (const q of quiz.questions) {
    if (!q.dimension || !(q.dimension in out)) continue;
    for (const o of q.options) out[q.dimension] = Math.max(out[q.dimension], o.value);
  }
  for (const d of dimensions) if (out[d] <= 0) out[d] = 5;
  return out;
}
