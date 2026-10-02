import type { QuizDefinition } from '../../types';
import { EXTRA_QUIZ_SCORING } from '../../data/extraQuizzes';

type T = (key: string, opts?: Record<string, unknown>) => string;

/**
 * Mid-quiz hint: at the 25 / 50 / 75 % crossings, a one-line reading of
 * where the answers so far are leaning. Fires once per quarter, never on
 * the five-question mood check, and only once at least two answers are in.
 * Extra-dimensional quizzes get a generic "leaning <dimension>" built from
 * the same Likert means the scorer uses.
 */
export function computeSneakPeek(
  quiz: QuizDefinition,
  answers: Record<string, number>,
  currentQ: number,
  total: number,
  t: T,
): string | null {
  if (quiz.id === 'mood-check-v1') return null;
  if (total < 8) return null;
  const percent = (currentQ / total) * 100;
  const prev = ((currentQ - 1) / total) * 100;
  const crossed = [25, 50, 75].some((mark) => percent >= mark && prev < mark);
  if (!crossed) return null;

  const answered = Object.keys(answers).length;
  if (answered < 2) return null;

  if (quiz.type === 'mbti') {
    const sums: Record<string, number> = { EI: 0, SN: 0, TF: 0, JP: 0 };
    const counts: Record<string, number> = { EI: 0, SN: 0, TF: 0, JP: 0 };
    quiz.questions.forEach((q) => {
      if (!q.dimension) return;
      const v = answers[q.id];
      if (v !== undefined) {
        sums[q.dimension] = (sums[q.dimension] || 0) + v;
        counts[q.dimension] = (counts[q.dimension] || 0) + 1;
      }
    });
    const leaning: string[] = [];
    for (const dim of ['EI', 'SN', 'TF', 'JP']) {
      if (!counts[dim]) continue;
      const avg = sums[dim] / counts[dim];
      if (avg >= 3.5) leaning.push(dim[0]);
      else if (avg <= 2.5) leaning.push(dim[1]);
    }
    if (leaning.length === 0) return null;
    return t('quizzes.sneakPeek.mbti', {
      letters: leaning.join(''),
      defaultValue: 'You are leaning {{letters}} so far — keep going to confirm.',
    });
  }

  if (quiz.type === 'court-match') {
    const elementCount: Record<string, number> = { wands: 0, cups: 0, swords: 0, pentacles: 0 };
    const elementMap: Record<number, string> = { 1: 'wands', 2: 'cups', 3: 'swords', 4: 'pentacles' };
    Object.entries(answers).forEach(([qid, v]) => {
      if (qid.startsWith('ce') && elementMap[v]) elementCount[elementMap[v]]++;
    });
    const topElement = Object.entries(elementCount).sort((a, b) => b[1] - a[1])[0];
    if (!topElement || topElement[1] === 0) return null;
    return t(`quizzes.sneakPeek.courtMatchElement.${topElement[0]}`, {
      defaultValue: `A ${topElement[0]} card is taking shape…`,
    });
  }

  if (quiz.type === 'extra-dimensional') {
    const entry = EXTRA_QUIZ_SCORING[quiz.id];
    if (!entry) return null;
    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};
    for (const q of quiz.questions) {
      const v = answers[q.id];
      if (v === undefined || !q.dimension || !entry.dimensions.includes(q.dimension)) continue;
      sums[q.dimension] = (sums[q.dimension] ?? 0) + v;
      counts[q.dimension] = (counts[q.dimension] ?? 0) + 1;
    }
    const ranked = Object.keys(sums).sort((a, b) => sums[b] / counts[b] - sums[a] / counts[a]);
    if (ranked.length < 2) return null;
    const lead = ranked[0];
    if (sums[lead] / counts[lead] < 3.5) return null;
    const quizKey = quiz.id.replace(/-v\d+$/, '');
    const name = t(`extraQuizzes.${quizKey}.results.${lead}.name`, {
      defaultValue: entry.info[lead]?.name ?? entry.dimensionLabels?.[lead] ?? lead,
    });
    return t('quizzes.sneakPeek.leaning', { defaultValue: 'Leaning {{name}} so far…', name });
  }

  const generic: Partial<Record<QuizDefinition['type'], [string, string]>> = {
    'love-language': ['quizzes.sneakPeek.loveLanguage', 'Your primary love language is starting to emerge…'],
    'shadow-archetype': ['quizzes.sneakPeek.shadowArchetype', 'An archetype pattern is forming…'],
    'element-affinity': ['quizzes.sneakPeek.elementAffinity', 'An elemental current is emerging…'],
    enneagram: ['quizzes.sneakPeek.enneagram', 'A type pattern is forming — keep going for your wing.'],
    attachment: ['quizzes.sneakPeek.attachment', 'Your attachment style is coming into focus…'],
    'big-five': ['quizzes.sneakPeek.bigFive', 'Your trait profile is taking shape…'],
    'ayurveda-dosha': ['quizzes.sneakPeek.ayurveda', 'Your constitution is taking shape…'],
  };
  const g = generic[quiz.type];
  return g ? t(g[0], { defaultValue: g[1] }) : null;
}

/** Ten lines, one per key, shown in the frame's hint slot every sixth question of a long quiz. */
export const ENCOURAGEMENT: { key: string; en: string }[] = [
  { key: 'e1', en: 'You are doing well. Keep going.' },
  { key: 'e2', en: 'Trust your instincts on these.' },
  { key: 'e3', en: 'There are no wrong answers here.' },
  { key: 'e4', en: 'Almost halfway there.' },
  { key: 'e5', en: 'You are making good progress.' },
  { key: 'e6', en: 'Stay with your first instinct.' },
  { key: 'e7', en: 'These answers will be worth it.' },
  { key: 'e8', en: 'Nearly there now.' },
  { key: 'e9', en: 'Honesty here gives you a truer result.' },
  { key: 'e10', en: 'Keep the momentum.' },
];
