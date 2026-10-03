import type { QuizDefinition } from '../../types';
import { CLINICAL_SCREENERS, EXTRA_QUIZ_SCORING, calculateExtraQuiz, hasDedicatedScorer } from '../../data/extraQuizzes';
import { extraResultName } from './extraNames';

type T = (key: string, opts?: Record<string, unknown>) => string;

/** A Likert mean that counts as endorsing a dimension ("Agree" on average, give or take). */
const LEANING = 3.5;

/**
 * Mid-quiz hint: at the 25 / 50 / 75 % crossings, a one-line reading of
 * where the answers so far are leaning. Fires once per quarter, never on
 * the five-question mood check, and only once at least two answers are in.
 *
 * Extra-dimensional quizzes run THE SCORER the result screen will run, on
 * the answers so far, so the early reading can only name a result the
 * quiz can actually return:
 *  - never on the PHQ-2 mood screener: its result is a validated cutoff on
 *    two items, and a teaser built from anything else told a positive
 *    screen "Moderate signal so far";
 *  - a quiz with a derived result (boundaries, empath/HSP, self-compassion,
 *    wellness) waits until every scored dimension has an answer — before
 *    that its scorer would be reading zeros as answers;
 *  - "highest mean wins" quizzes name the leader once it is endorsed
 *    (mean ≥ 3.5) and not a tie;
 *  - the name comes through extraResultName, the result screen's chain.
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
    if (CLINICAL_SCREENERS.has(quiz.id)) return null;
    const entry = EXTRA_QUIZ_SCORING[quiz.id];
    if (!entry) return null;
    const answeredDims = new Set<string>();
    for (const q of quiz.questions) {
      if (answers[q.id] !== undefined && q.dimension && entry.dimensions.includes(q.dimension)) answeredDims.add(q.dimension);
    }
    const needed = hasDedicatedScorer(quiz.id) ? entry.dimensions.length : 2;
    if (answeredDims.size < needed) return null;
    const r = calculateExtraQuiz(quiz.id, answers);
    if (!r || r.isTie || r.primary === entry.lowResult) return null;
    // A dimension the scorer merely ranks first is named only once it is
    // endorsed; a derived result (a band, "both", "healthy flex") is the
    // scorer's own verdict and stands as it is.
    const isDimension = entry.dimensions.includes(r.primary);
    if (isDimension && !hasDedicatedScorer(quiz.id) && (r.averages[r.primary] ?? 0) < LEANING) return null;
    const name = extraResultName(quiz.id, r.primary, t);
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

/** Ten lines, one per key. Two of them claim a position and are only drawn there. */
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

/** Lines that say where the person is; drawn only where they are true. */
const ALMOST_HALFWAY = 'e4';
const NEARLY_THERE = 'e8';

/**
 * The encouragement line for the question on screen (1-based `step` of
 * `total`), or null. Shown every sixth question of a quiz of twelve or
 * more, never on the last one. "Almost halfway there." only between 40 %
 * and 50 % of the way, "Nearly there now." only from 80 %; everywhere else
 * a line that claims no position, in rotation. (The old pick by
 * `step / 6` drew "Almost halfway there." at question 18 of 20.)
 */
export function encouragementFor(step: number, total: number): { key: string; en: string } | null {
  if (total < 12 || step % 6 !== 0 || step >= total) return null;
  const progress = step / total;
  const byKey = (k: string) => ENCOURAGEMENT.find((e) => e.key === k) ?? null;
  if (progress >= 0.4 && progress < 0.5) return byKey(ALMOST_HALFWAY);
  if (progress >= 0.8) return byKey(NEARLY_THERE);
  const neutral = ENCOURAGEMENT.filter((e) => e.key !== ALMOST_HALFWAY && e.key !== NEARLY_THERE);
  return neutral[(step / 6 - 1) % neutral.length];
}
