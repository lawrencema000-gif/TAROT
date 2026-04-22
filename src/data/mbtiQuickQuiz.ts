import type { QuizDefinition } from '../types';

// Shorter 12-question MBTI variant for users who want a quick reading
// without the 70-question commitment. Reuses the same scoring engine
// (calculateMBTI) since dimension codes + Likert values are identical.
// Three balanced questions per dimension (EI/SN/TF/JP).
export const mbtiQuickQuiz: QuizDefinition = {
  id: 'mbti-quick-v1',
  type: 'mbti',
  title: 'Quick Personality Type',
  description: 'A fast 12-question read on how you recharge, perceive, decide, and structure your life. Great as an intro — upgrade to the full 70-question deep dive any time for a more precise result.',
  questions: [
    { id: 'qei1', text: 'I recharge best around energetic groups of people.', dimension: 'EI', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'qei2', text: 'After a long social event, I need solo time to recover.', dimension: 'EI', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'qei3', text: 'I process ideas best by talking them out with others.', dimension: 'EI', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'qsn1', text: 'I trust concrete facts and details more than hunches.', dimension: 'SN', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'qsn2', text: 'I love imagining future possibilities and abstract ideas.', dimension: 'SN', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'qsn3', text: 'Proven, practical methods appeal to me more than novel theories.', dimension: 'SN', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'qtf1', text: 'Logic and fairness matter more to me than sparing feelings when I decide.', dimension: 'TF', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'qtf2', text: 'My first thought when deciding is how it affects the people involved.', dimension: 'TF', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'qtf3', text: 'Getting to the objective truth matters more than keeping the peace.', dimension: 'TF', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'qjp1', text: 'I feel calmer when plans and schedules are set in advance.', dimension: 'JP', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'qjp2', text: 'I prefer to keep options open and see what unfolds.', dimension: 'JP', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'qjp3', text: 'Deadlines and structure bring out my best work.', dimension: 'JP', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
  ],
};
