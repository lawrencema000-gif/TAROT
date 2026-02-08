import type { QuizDefinition } from '../types';

export const mbtiQuiz: QuizDefinition = {
  id: 'mbti-v1',
  type: 'mbti',
  title: 'Personality Type Assessment',
  description: 'This assessment explores the way you naturally process information, make decisions, and move through the world. Instead of judging personality as right or wrong, it highlights your default strengths, your blind spots under stress, and what you tend to need from relationships and environments to thrive. You will receive a personality profile with a stress signature, recovery strategies, relationship style notes, and a tarot archetype alignment for narrative depth.',
  questions: [
    { id: 'ei1', text: 'At a party, you tend to interact with many people, including strangers.', dimension: 'EI', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'ei2', text: 'You feel drained after spending time in large groups.', dimension: 'EI', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'ei3', text: 'You prefer to work in a team rather than alone.', dimension: 'EI', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'ei4', text: 'You often need time alone to recharge after social events.', dimension: 'EI', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'ei5', text: 'You enjoy being the center of attention.', dimension: 'EI', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'ei6', text: 'You prefer deep conversations with one person over group chats.', dimension: 'EI', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'ei7', text: 'You feel energized after meeting new people.', dimension: 'EI', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'ei8', text: 'You think before you speak in most situations.', dimension: 'EI', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'ei9', text: 'You enjoy initiating conversations with strangers.', dimension: 'EI', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'ei10', text: 'You prefer working in a quiet environment with minimal interruptions.', dimension: 'EI', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'ei11', text: 'You often process your thoughts by talking them out with others.', dimension: 'EI', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'ei12', text: 'You have a small circle of close friends rather than many acquaintances.', dimension: 'EI', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },

    { id: 'sn1', text: 'You focus more on present realities than future possibilities.', dimension: 'SN', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'sn2', text: 'You often think about how things could be improved.', dimension: 'SN', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'sn3', text: 'You prefer detailed instructions over general guidelines.', dimension: 'SN', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'sn4', text: 'You enjoy exploring abstract theories and ideas.', dimension: 'SN', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'sn5', text: 'You trust your direct experience more than theoretical concepts.', dimension: 'SN', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'sn6', text: 'You often see patterns and connections others miss.', dimension: 'SN', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'sn7', text: 'You prefer practical solutions over innovative ones.', dimension: 'SN', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'sn8', text: 'You enjoy imagining future possibilities and scenarios.', dimension: 'SN', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'sn9', text: 'You pay close attention to sensory details in your environment.', dimension: 'SN', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'sn10', text: 'You often think about the deeper meaning behind events.', dimension: 'SN', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'sn11', text: 'You prefer step-by-step approaches to problem-solving.', dimension: 'SN', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'sn12', text: 'You are more interested in what could be than what is.', dimension: 'SN', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },

    { id: 'tf1', text: 'You make decisions based on logic rather than feelings.', dimension: 'TF', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'tf2', text: 'You prioritize harmony and others\' feelings in your decisions.', dimension: 'TF', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'tf3', text: 'You value truth over tact.', dimension: 'TF', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'tf4', text: 'You consider how your actions affect others\' emotions.', dimension: 'TF', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'tf5', text: 'You prefer objective analysis over subjective interpretation.', dimension: 'TF', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'tf6', text: 'You find it easy to empathize with others\' feelings.', dimension: 'TF', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'tf7', text: 'You believe fairness is more important than mercy.', dimension: 'TF', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'tf8', text: 'You often make decisions based on your values and how they affect people.', dimension: 'TF', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'tf9', text: 'You prefer to give constructive criticism even if it might hurt someone.', dimension: 'TF', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'tf10', text: 'You often find yourself supporting others emotionally.', dimension: 'TF', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'tf11', text: 'You tend to analyze pros and cons before making choices.', dimension: 'TF', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'tf12', text: 'You believe understanding someone\'s perspective is key to resolving conflict.', dimension: 'TF', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },

    { id: 'jp1', text: 'You prefer to have a detailed plan before starting a project.', dimension: 'JP', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'jp2', text: 'You enjoy keeping your options open and being spontaneous.', dimension: 'JP', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'jp3', text: 'You feel stressed when things are disorganized.', dimension: 'JP', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'jp4', text: 'You often work in bursts of energy close to deadlines.', dimension: 'JP', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'jp5', text: 'You like to finish one task before starting another.', dimension: 'JP', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'jp6', text: 'You enjoy adapting to changing circumstances.', dimension: 'JP', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'jp7', text: 'You prefer having a set schedule over going with the flow.', dimension: 'JP', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'jp8', text: 'You are comfortable making last-minute changes to plans.', dimension: 'JP', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'jp9', text: 'You like to have clear expectations and deadlines.', dimension: 'JP', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'jp10', text: 'You prefer to explore multiple possibilities before deciding.', dimension: 'JP', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'jp11', text: 'You feel accomplished when you complete tasks ahead of schedule.', dimension: 'JP', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'jp12', text: 'You believe the best plans can change based on circumstances.', dimension: 'JP', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
  ],
};

export const loveLanguageQuiz: QuizDefinition = {
  id: 'love-language-v1',
  type: 'love-language',
  title: 'Love Language Assessment',
  description: 'This assessment helps you discover how you most naturally give and receive love. Many relationship conflicts are not a lack of love\u2014they are a mismatch of expression. One person is offering time, the other is needing words. You will receive a primary and secondary love language, what it looks like when healthy versus deprived, clear ways to ask for what you need, and partner tips so the people who love you do not have to guess.',
  questions: [
    { id: 'll1', text: 'I feel most loved when someone gives me a thoughtful gift.', dimension: 'gifts', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'll2', text: 'Hearing "I love you" and other words of affirmation means the world to me.', dimension: 'words', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'll3', text: 'I feel loved when someone helps me with tasks or chores.', dimension: 'acts', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'll4', text: 'Physical touch (hugs, holding hands) makes me feel connected.', dimension: 'touch', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'll5', text: 'I feel most loved when someone gives me their undivided attention.', dimension: 'time', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'll6', text: 'A surprise gift shows me someone was thinking of me.', dimension: 'gifts', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'll7', text: 'Compliments and encouragement boost my spirits.', dimension: 'words', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'll8', text: 'When someone does something helpful without being asked, I feel cared for.', dimension: 'acts', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'll9', text: 'I feel close to someone when we\'re physically close.', dimension: 'touch', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'll10', text: 'Quality one-on-one time is the best way to show me love.', dimension: 'time', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'll11', text: 'I appreciate when someone picks out a gift specifically for me.', dimension: 'gifts', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'll12', text: 'Written notes or messages make me feel appreciated.', dimension: 'words', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'll13', text: 'Having someone take care of errands or responsibilities for me is meaningful.', dimension: 'acts', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'll14', text: 'A warm embrace can instantly improve my mood.', dimension: 'touch', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'll15', text: 'Having someone\'s full attention during a conversation means everything to me.', dimension: 'time', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
  ],
};

export function calculateMBTI(scores: Record<string, number>): { type: string; dimensions: Record<string, number> } {
  let e = 0, i = 0, s = 0, n = 0, t = 0, f = 0, j = 0, p = 0;

  Object.entries(scores).forEach(([key, value]) => {
    if (key.startsWith('ei')) {
      const isEQuestion = ['ei1', 'ei3', 'ei5', 'ei7', 'ei9', 'ei11'].includes(key);
      if (isEQuestion) e += value;
      else i += (6 - value);
    } else if (key.startsWith('sn')) {
      const isSQuestion = ['sn1', 'sn3', 'sn5', 'sn7', 'sn9', 'sn11'].includes(key);
      if (isSQuestion) s += value;
      else n += (6 - value);
    } else if (key.startsWith('tf')) {
      const isTQuestion = ['tf1', 'tf3', 'tf5', 'tf7', 'tf9', 'tf11'].includes(key);
      if (isTQuestion) t += value;
      else f += (6 - value);
    } else if (key.startsWith('jp')) {
      const isJQuestion = ['jp1', 'jp3', 'jp5', 'jp7', 'jp9', 'jp11'].includes(key);
      if (isJQuestion) j += value;
      else p += (6 - value);
    }
  });

  const type =
    (e >= i ? 'E' : 'I') +
    (s >= n ? 'S' : 'N') +
    (t >= f ? 'T' : 'F') +
    (j >= p ? 'J' : 'P');

  return {
    type,
    dimensions: { E: e, I: i, S: s, N: n, T: t, F: f, J: j, P: p },
  };
}

export function calculateLoveLanguage(scores: Record<string, number>): { primary: string; scores: Record<string, number> } {
  const totals: Record<string, number> = {
    gifts: 0,
    words: 0,
    acts: 0,
    touch: 0,
    time: 0,
  };

  Object.entries(scores).forEach(([key, value]) => {
    const question = loveLanguageQuiz.questions.find(q => q.id === key);
    if (question?.dimension) {
      totals[question.dimension] += value;
    }
  });

  const primary = Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0];

  return { primary, scores: totals };
}

export interface MBTITypeInfo {
  title: string;
  subtitle: string;
  description: string;
  strengths: string[];
  blindSpots: string[];
  underStress: string[];
  inRelationships: string[];
  atWork: string[];
  growthQuests: { title: string; description: string }[];
  compatibility: string[];
  realLifeExamples: string[];
  stressSignature: string;
  recoveryPath: string;
  miniRitual: string;
  journalPrompt: string;
  tarotArchetype: { card: string; reason: string };
}

export const mbtiDescriptions: Record<string, MBTITypeInfo> = {
  INTJ: {
    title: 'The Architect',
    subtitle: 'Mastermind of Vision',
    description: 'Strategic, independent, and determined. You see possibilities everywhere and work tirelessly to achieve your vision.',
    strengths: ['Strategic long-term thinking', 'Independent problem-solving', 'High standards and determination', 'Innovative systems design'],
    blindSpots: ['May dismiss emotional considerations', 'Can appear cold or unapproachable', 'Struggles with small talk', 'May overlook others\' contributions'],
    underStress: ['Becomes overly critical of self and others', 'Withdraws into isolation', 'Fixates on worst-case scenarios', 'May indulge in sensory escapes'],
    inRelationships: ['Values intellectual connection deeply', 'Shows love through problem-solving', 'Needs significant alone time', 'Loyal once trust is established'],
    atWork: ['Excels at long-term strategy', 'Prefers autonomous projects', 'Natural at identifying inefficiencies', 'May clash with micromanagement'],
    growthQuests: [
      { title: 'Practice Vulnerability', description: 'Share one personal feeling with someone you trust this week' },
      { title: 'Embrace Imperfection', description: 'Complete a project at 80% instead of waiting for perfection' },
      { title: 'Connect Without Agenda', description: 'Have a conversation purely for enjoyment, not to solve anything' }
    ],
    compatibility: ['ENFP', 'ENTP', 'INTJ', 'ENTJ'],
    realLifeExamples: ['You plan vacations with spreadsheets and still enjoy them', 'You are the friend people call when they need a strategy, not a pep talk', 'You can spend an entire weekend deep in a project and feel recharged', 'You mentally redesign systems everywhere you go\u2014restaurants, workflows, apps'],
    stressSignature: 'Under stress, INTJs catastrophize and fixate on worst-case scenarios. The normally calm strategist becomes hyper-critical, withdrawn, and may indulge in uncharacteristic sensory escapes (binge-watching, overeating, impulsive purchases) to silence the mental noise.',
    recoveryPath: 'Return to solitude with a single clear problem to solve. Physical movement (walking, lifting) helps break the rumination loop. Write down the worst-case scenario, then write three realistic alternatives. Reconnect with your long-term vision.',
    miniRitual: 'Write down the one thing you can control today. Circle it. Let everything else wait.',
    journalPrompt: 'Where am I confusing perfectionism with standards? What would "good enough to move forward" look like?',
    tarotArchetype: { card: 'The Hermit', reason: 'The Hermit mirrors your gift for solitary insight and your power to illuminate what others overlook through quiet, focused wisdom.' },
  },
  INTP: {
    title: 'The Logician',
    subtitle: 'Architect of Ideas',
    description: 'Innovative, curious, and analytical. You love exploring ideas and finding elegant solutions to complex problems.',
    strengths: ['Exceptional analytical abilities', 'Creative problem-solving', 'Open to new perspectives', 'Objective and fair-minded'],
    blindSpots: ['May neglect practical implementation', 'Can seem detached or aloof', 'Struggles with emotional situations', 'Prone to analysis paralysis'],
    underStress: ['Becomes scattered and unfocused', 'May lash out emotionally', 'Withdraws from responsibilities', 'Overthinks to the point of inaction'],
    inRelationships: ['Craves intellectual stimulation', 'Shows love through ideas and solutions', 'Needs space to think', 'Values authenticity over convention'],
    atWork: ['Thrives on complex problems', 'Needs freedom to explore', 'Excellent at theoretical work', 'May struggle with deadlines'],
    growthQuests: [
      { title: 'Ship Something', description: 'Complete and share a project, even if it\'s not perfect' },
      { title: 'Feel First', description: 'When someone shares a problem, respond with empathy before solutions' },
      { title: 'Body Check', description: 'Set 3 daily reminders to notice how your body feels' }
    ],
    compatibility: ['ENTJ', 'ESTJ', 'INTP', 'INTJ'],
    realLifeExamples: ['You have 47 browser tabs open and can justify every one', 'You correct people not to be rude but because the wrong answer genuinely bothers you', 'You can explain quantum physics but struggle to explain why you are upset', 'You start more projects than you finish but each one taught you something valuable'],
    stressSignature: 'Under stress, INTPs become scattered, lose confidence in their usually sharp thinking, and may lash out emotionally in ways that surprise everyone, including themselves. The inner world that normally feels like a playground starts to feel like a trap.',
    recoveryPath: 'Give yourself permission to stop analyzing. Move your body, build something tangible with your hands, or explain a complex idea to someone who will listen. The goal is to reconnect thinking with the physical world.',
    miniRitual: 'Pick up something physical (a pen, a tool, a cup) and describe it in as much detail as possible for 60 seconds. Get out of your head and into your senses.',
    journalPrompt: 'What idea have I been perfecting in my head that would benefit from being imperfect in the real world?',
    tarotArchetype: { card: 'The Magician', reason: 'The Magician reflects your ability to transform raw ideas into reality when you focus your scattered brilliance into deliberate action.' },
  },
  ENTJ: {
    title: 'The Commander',
    subtitle: 'Force of Nature',
    description: 'Bold, imaginative, and strong-willed. You find ways to achieve your goals and inspire others to follow.',
    strengths: ['Natural leadership ability', 'Efficient and decisive', 'Confident in vision', 'Strategic planning mastery'],
    blindSpots: ['May steamroll others\' opinions', 'Can be impatient with inefficiency', 'Struggles to show vulnerability', 'May prioritize results over people'],
    underStress: ['Becomes controlling and demanding', 'May make hasty decisions', 'Feels isolated at the top', 'Health may suffer from overwork'],
    inRelationships: ['Takes charge of shared goals', 'Shows love through providing', 'Needs a partner who challenges them', 'Respects competence and ambition'],
    atWork: ['Born to lead teams and organizations', 'Excels at turning vision into reality', 'May need to develop patience', 'Inspires high performance in others'],
    growthQuests: [
      { title: 'Listen First', description: 'In your next meeting, don\'t speak until everyone else has' },
      { title: 'Delegate Fully', description: 'Assign a task and resist checking in for 48 hours' },
      { title: 'Celebrate Others', description: 'Publicly acknowledge a team member\'s contribution this week' }
    ],
    compatibility: ['INTP', 'ISTP', 'ENTJ', 'INTJ'],
    realLifeExamples: ['You run meetings even when you are not in charge', 'You have a 5-year plan and update it quarterly', 'People either find you inspiring or intimidating\u2014rarely anything in between', 'You show love by solving problems and building a future together'],
    stressSignature: 'Under stress, ENTJs become controlling, make decisions too quickly, and feel isolated by the weight of leadership. They may push people away precisely when they need support most, confusing vulnerability with weakness.',
    recoveryPath: 'Delegate something meaningful and resist checking in. Take a full day off without a productivity agenda. Talk to someone you respect as an equal\u2014not to strategize, just to be heard.',
    miniRitual: 'Close your eyes and ask: "What would I do today if I had nothing to prove?" Sit with the answer for 60 seconds.',
    journalPrompt: 'Am I leading from vision or from a need to control? What would trusting others more actually look like?',
    tarotArchetype: { card: 'The Emperor', reason: 'The Emperor embodies your natural authority and the challenge of wielding power with wisdom rather than force.' },
  },
  ENTP: {
    title: 'The Debater',
    subtitle: 'Spark of Innovation',
    description: 'Smart, curious, and energetic. You love intellectual challenges and finding creative solutions.',
    strengths: ['Quick, agile thinking', 'Charismatic communication', 'Innovative ideation', 'Adaptable to change'],
    blindSpots: ['May argue for sport, hurting others', 'Struggles to follow through', 'Can overlook important details', 'May dismiss emotional needs'],
    underStress: ['Becomes argumentative and scattered', 'May start many projects, finish none', 'Loses confidence in abilities', 'Withdraws into self-doubt'],
    inRelationships: ['Keeps things exciting and fresh', 'Shows love through banter and ideas', 'Needs intellectual equals', 'May struggle with routine expressions of affection'],
    atWork: ['Excellent at brainstorming', 'Thrives in dynamic environments', 'May need help with execution', 'Natural at seeing possibilities'],
    growthQuests: [
      { title: 'Finish One Thing', description: 'Pick your oldest unfinished project and complete it this week' },
      { title: 'Argue the Other Side', description: 'In your next debate, genuinely try to understand the opposing view' },
      { title: 'Consistency Challenge', description: 'Do one small task at the same time for 7 days straight' }
    ],
    compatibility: ['INFJ', 'INTJ', 'ENTP', 'ENFP'],
    realLifeExamples: ['You play devil\'s advocate even when you agree with the other person', 'You have started at least 3 businesses, side projects, or "big ideas" this year', 'You can charm a room and then forget everyone\'s name', 'You get bored the moment something stops being intellectually stimulating'],
    stressSignature: 'Under stress, ENTPs become argumentative, scattered, and start questioning their own competence. The normally confident debater turns inward with self-doubt, may start and abandon projects rapidly, and loses the thread of what actually matters.',
    recoveryPath: 'Pick one thing and finish it\u2014however small. Reconnect with a person who makes you laugh without performing. Write down what you actually believe (not what you can argue) about something that matters to you.',
    miniRitual: 'Set a 5-minute timer. Work on one single thing without switching. When it rings, notice how it felt to focus.',
    journalPrompt: 'What am I debating externally that is actually an internal question I have not answered yet?',
    tarotArchetype: { card: 'The Fool', reason: 'The Fool captures your gift for leaping into the unknown with enthusiasm and your ongoing lesson of balancing adventure with follow-through.' },
  },
  INFJ: {
    title: 'The Advocate',
    subtitle: 'Quiet Visionary',
    description: 'Insightful, principled, and compassionate. You seek meaning in all things and want to help others realize their potential.',
    strengths: ['Deep insight into people', 'Compassionate guidance', 'Visionary thinking', 'Determined idealism'],
    blindSpots: ['May absorb others\' emotions', 'Can be overly perfectionistic', 'Struggles to ask for help', 'May idealize people and situations'],
    underStress: ['Becomes overwhelmed by emotions', 'May withdraw completely', 'Loses sense of purpose', 'Can become uncharacteristically critical'],
    inRelationships: ['Seeks deep, meaningful connection', 'Shows love through understanding', 'Needs time to recharge alone', 'Highly loyal once committed'],
    atWork: ['Excels at roles with meaning', 'Natural counselor and advisor', 'May struggle with purely practical tasks', 'Brings harmony to teams'],
    growthQuests: [
      { title: 'Ask for Help', description: 'Identify one area where you\'re struggling and ask someone for support' },
      { title: 'Good Enough', description: 'Complete something and share it before it feels perfect' },
      { title: 'Self-Care First', description: 'Put your own needs first for one full day this week' }
    ],
    compatibility: ['ENTP', 'ENFP', 'INFJ', 'INTJ'],
    realLifeExamples: ['You know something is wrong with a friend before they tell you', 'You have a rich inner world that very few people have full access to', 'You often feel like you do not quite fit anywhere but are needed everywhere', 'You take on others\' emotions and need hours alone to decompress'],
    stressSignature: 'Under stress, INFJs become overwhelmed by absorbed emotions, lose their sense of purpose, and may withdraw completely or become uncharacteristically sharp and critical. The "door slam"\u2014cutting someone off entirely\u2014is a last-resort protection mechanism.',
    recoveryPath: 'Solitude is medicine, but isolation is not. Find one person who understands you and let them in. Journal to separate your feelings from others\' feelings. Return to your sense of purpose\u2014even re-reading your own past writing can help.',
    miniRitual: 'Place both hands on your chest. Breathe in and say silently: "This is mine." Breathe out and say: "That is theirs." Repeat 5 times.',
    journalPrompt: 'Whose feelings am I carrying right now that are not mine? What would I feel if I set them down?',
    tarotArchetype: { card: 'The High Priestess', reason: 'The High Priestess mirrors your deep intuition, your access to hidden knowledge, and the power you hold when you trust what you sense over what you are told.' },
  },
  INFP: {
    title: 'The Mediator',
    subtitle: 'Dreamer of Dreams',
    description: 'Poetic, kind, and altruistic. You see the best in people and are always eager to help a good cause.',
    strengths: ['Deep empathy and compassion', 'Creative expression', 'Strong personal values', 'Open-minded acceptance'],
    blindSpots: ['May avoid necessary conflict', 'Can be overly self-critical', 'Struggles with practical details', 'May lose touch with reality'],
    underStress: ['Becomes hypersensitive to criticism', 'May spiral into self-doubt', 'Withdraws from the world', 'Can become uncharacteristically harsh'],
    inRelationships: ['Seeks authentic, deep connection', 'Shows love through devoted attention', 'Needs acceptance of their inner world', 'Highly romantic and idealistic'],
    atWork: ['Thrives in creative, meaningful roles', 'Brings authenticity to teams', 'May struggle with rigid structures', 'Excellent at understanding others'],
    growthQuests: [
      { title: 'Take Action Today', description: 'Choose one small step toward a dream and do it now, not later' },
      { title: 'Embrace Feedback', description: 'Ask for honest feedback and find one useful insight in it' },
      { title: 'Speak Your Mind', description: 'Share an unpopular opinion in a safe space' }
    ],
    compatibility: ['ENFJ', 'ENTJ', 'INFP', 'INFJ'],
    realLifeExamples: ['You have cried during a commercial and felt no shame about it', 'You replay conversations in your head to understand them more deeply', 'You would rather be authentic and uncomfortable than fake and accepted', 'You have a creative project that means everything to you and terrifies you equally'],
    stressSignature: 'Under stress, INFPs become hypersensitive to criticism, spiral into self-doubt, and may withdraw from the world entirely. They can become uncharacteristically harsh\u2014the shadow of their normally gentle nature emerges as sharp judgment aimed at themselves or others.',
    recoveryPath: 'Create something\u2014anything\u2014without showing it to anyone. Spend time in nature. Re-read words that have moved you. Reconnect with the values that make you who you are, not the expectations that don\'t.',
    miniRitual: 'Write one sentence that is true about how you feel right now. Do not edit it. Do not judge it. Just let it exist.',
    journalPrompt: 'What dream am I protecting by keeping it private? What would happen if I shared it with one person I trust?',
    tarotArchetype: { card: 'The Star', reason: 'The Star reflects your gift for hope and healing\u2014your ability to hold onto beauty even in darkness and to remind others that vulnerability is strength.' },
  },
  ENFJ: {
    title: 'The Protagonist',
    subtitle: 'Inspirer of Growth',
    description: 'Charismatic, inspiring, and empathetic. You naturally guide others toward growth and achievement.',
    strengths: ['Natural people leadership', 'Empathetic communication', 'Reliable and committed', 'Inspiring presence'],
    blindSpots: ['May neglect own needs for others', 'Can be overly idealistic about people', 'Struggles with criticism', 'May become manipulative under stress'],
    underStress: ['Takes on everyone\'s problems', 'Becomes controlling in relationships', 'May feel unappreciated', 'Health suffers from giving too much'],
    inRelationships: ['Devoted and nurturing partner', 'Shows love through support and growth', 'Needs appreciation and affirmation', 'Creates harmony in the home'],
    atWork: ['Excellent at developing others', 'Brings teams together', 'May struggle with tough decisions', 'Natural teacher and mentor'],
    growthQuests: [
      { title: 'Say No', description: 'Decline one request this week to protect your energy' },
      { title: 'Receive Without Giving', description: 'Accept help or a gift without immediately reciprocating' },
      { title: 'Sit With Discomfort', description: 'When someone is struggling, be present without trying to fix it' }
    ],
    compatibility: ['INFP', 'ISFP', 'ENFJ', 'INFJ'],
    realLifeExamples: ['You remember what people told you months ago and check in on it', 'You organize group events and then forget to take care of yourself afterward', 'You can sense when someone is struggling before they say a word', 'You have been called "too much" by people who needed exactly what you offered'],
    stressSignature: 'Under stress, ENFJs take on everyone\'s problems, become controlling in their attempts to help, and may feel deeply unappreciated. The helper burns out and may become manipulative when direct communication fails.',
    recoveryPath: 'Say no to one request. Receive care without immediately reciprocating. Ask yourself: "Am I helping because they need it, or because I need to feel needed?" Let someone else lead for a day.',
    miniRitual: 'Sit quietly and ask: "What do I need right now\u2014not what does anyone else need?" Wait for the honest answer.',
    journalPrompt: 'When I help others, am I giving from overflow or from a well that is running dry? What refills me?',
    tarotArchetype: { card: 'The Empress', reason: 'The Empress reflects your nurturing power, your creative generosity, and the lesson of receiving as abundantly as you give.' },
  },
  ENFP: {
    title: 'The Campaigner',
    subtitle: 'Champion of Possibilities',
    description: 'Enthusiastic, creative, and sociable. You are free spirits who see life as full of possibilities.',
    strengths: ['Infectious enthusiasm', 'Creative vision', 'Deep empathy', 'Excellent communication'],
    blindSpots: ['May struggle with follow-through', 'Can be overly sensitive to criticism', 'Difficulty with routine', 'May overcommit'],
    underStress: ['Becomes scattered and anxious', 'May seek external validation', 'Loses touch with values', 'Can become uncharacteristically harsh'],
    inRelationships: ['Brings excitement and novelty', 'Shows love through attention and affirmation', 'Needs freedom within commitment', 'Deeply caring and supportive'],
    atWork: ['Excellent at inspiring others', 'Thrives on new projects', 'May struggle with details', 'Natural at building connections'],
    growthQuests: [
      { title: 'Complete Before Starting', description: 'Finish one existing project before starting anything new' },
      { title: 'Embrace Routine', description: 'Create and stick to a simple morning routine for one week' },
      { title: 'Depth Over Breadth', description: 'Spend quality time with one person instead of a group' }
    ],
    compatibility: ['INTJ', 'INFJ', 'ENFP', 'ENTP'],
    realLifeExamples: ['You have made a best friend in a grocery store checkout line', 'You have 12 hobbies and genuinely love all of them', 'You can go from deeply philosophical to hilariously goofy in the same sentence', 'You feel everything at full volume and would not trade it for anything'],
    stressSignature: 'Under stress, ENFPs become scattered, seek external validation frantically, and lose touch with their own values. The normally enthusiastic explorer becomes anxious, people-pleasing, and may make commitments they cannot keep.',
    recoveryPath: 'Finish one thing before starting anything new. Spend unstructured time with one person who sees you clearly. Return to a creative practice that is just for you\u2014not for an audience.',
    miniRitual: 'Name three things you are grateful for that have nothing to do with other people\'s opinions of you.',
    journalPrompt: 'What am I chasing right now\u2014and is it something I actually want, or something I think will make people love me?',
    tarotArchetype: { card: 'The Sun', reason: 'The Sun captures your radiant energy, your genuine joy, and the warmth you bring to every room\u2014along with the lesson of shining without burning out.' },
  },
  ISTJ: {
    title: 'The Logistician',
    subtitle: 'Pillar of Reliability',
    description: 'Practical, responsible, and reliable. You uphold traditions and work steadily toward your goals.',
    strengths: ['Exceptional reliability', 'Practical problem-solving', 'Dedicated work ethic', 'Honest and direct'],
    blindSpots: ['May resist necessary change', 'Can be inflexible in approach', 'Struggles with emotional expression', 'May judge unconventional choices'],
    underStress: ['Becomes rigid and controlling', 'May catastrophize about the future', 'Withdraws emotionally', 'Can become pessimistic'],
    inRelationships: ['Shows love through actions and commitment', 'Reliable and steady partner', 'Needs clear expectations', 'Values tradition and stability'],
    atWork: ['Excels at systematic tasks', 'Brings order to chaos', 'May struggle with ambiguity', 'Dependable team member'],
    growthQuests: [
      { title: 'Try Something New', description: 'Do one activity this week that\'s outside your comfort zone' },
      { title: 'Express Appreciation', description: 'Tell someone how you feel about them in words' },
      { title: 'Embrace Uncertainty', description: 'Make a decision without all the information' }
    ],
    compatibility: ['ESFP', 'ESTP', 'ISTJ', 'ISFJ'],
    realLifeExamples: ['You have a system for everything and it actually works', 'You remember details about conversations from years ago', 'You show love by being reliable, not by being dramatic', 'You feel genuinely stressed when plans change last minute'],
    stressSignature: 'Under stress, ISTJs become rigid, controlling, and catastrophize about the future. The normally steady planner loses trust in the process and may become pessimistic or withdraw emotionally, unable to express what they need.',
    recoveryPath: 'Do something with a clear, immediate result\u2014clean a room, complete a task, organize something tangible. Then talk to someone you trust about what is actually worrying you, even if it feels inefficient.',
    miniRitual: 'Write down three things that are working well in your life right now. Let the evidence of stability calm the anxiety.',
    journalPrompt: 'What am I trying to control that might benefit from flexibility? Where would "good enough" actually be enough?',
    tarotArchetype: { card: 'The Hierophant', reason: 'The Hierophant reflects your devotion to proven systems and your role as someone others rely on for steadiness and trustworthy guidance.' },
  },
  ISFJ: {
    title: 'The Defender',
    subtitle: 'Guardian of Care',
    description: 'Dedicated, warm, and conscientious. You protect and care for those you love with steadfast loyalty.',
    strengths: ['Supportive and nurturing', 'Reliable and thorough', 'Patient and observant', 'Deeply loyal'],
    blindSpots: ['May neglect own needs', 'Can be resistant to change', 'Struggles to say no', 'May hold onto grudges'],
    underStress: ['Becomes overly self-sacrificing', 'May become passive-aggressive', 'Feels unappreciated', 'Worries excessively'],
    inRelationships: ['Devoted and caring partner', 'Shows love through service', 'Needs stability and appreciation', 'Creates warm, comfortable home'],
    atWork: ['Excellent at supportive roles', 'Brings warmth to teams', 'May struggle with self-promotion', 'Reliable in crises'],
    growthQuests: [
      { title: 'Put Yourself First', description: 'Do something just for yourself with no benefit to others' },
      { title: 'Voice a Need', description: 'Ask for something you want without apologizing' },
      { title: 'Welcome Change', description: 'Intentionally change one small routine this week' }
    ],
    compatibility: ['ESFP', 'ESTP', 'ISFJ', 'ISTJ'],
    realLifeExamples: ['You remember everyone\'s coffee order and birthdate', 'You will sacrifice sleep to make sure someone you love is okay', 'You hold grudges quietly because you gave too many chances before speaking up', 'You feel invisible sometimes despite being the person holding everything together'],
    stressSignature: 'Under stress, ISFJs become overly self-sacrificing, passive-aggressive, and deeply worried. They feel unappreciated but struggle to ask for what they need directly, building resentment beneath a caring exterior.',
    recoveryPath: 'Do something purely for yourself with zero benefit to anyone else. Voice one need without apologizing for having it. Let something be imperfect and notice that the world does not end.',
    miniRitual: 'Look in a mirror and say: "My needs matter as much as anyone else\'s." Mean it.',
    journalPrompt: 'What am I doing for others that I wish someone would do for me? Can I ask for it directly?',
    tarotArchetype: { card: 'The Empress', reason: 'The Empress reflects your deep nurturing nature and the essential lesson that you deserve the same care and abundance you pour into others.' },
  },
  ESTJ: {
    title: 'The Executive',
    subtitle: 'Master of Order',
    description: 'Organized, logical, and assertive. You bring people together and manage effectively toward shared goals.',
    strengths: ['Strong organizational skills', 'Dedicated and hardworking', 'Honest and direct', 'Natural leadership'],
    blindSpots: ['May be inflexible', 'Can be judgmental of others', 'Struggles with emotions', 'May prioritize rules over people'],
    underStress: ['Becomes controlling and rigid', 'May lash out at inefficiency', 'Feels overwhelmed by disorder', 'Can become pessimistic'],
    inRelationships: ['Takes charge of practical matters', 'Shows love through providing', 'Needs respect and appreciation', 'Values traditional commitment'],
    atWork: ['Excels at managing projects and people', 'Brings structure to teams', 'May struggle with creativity', 'Reliable leader'],
    growthQuests: [
      { title: 'Bend the Rules', description: 'Let something slide that doesn\'t actually matter' },
      { title: 'Ask Questions', description: 'In your next conversation, only ask questions' },
      { title: 'Embrace Emotion', description: 'Share how you\'re really feeling with someone close' }
    ],
    compatibility: ['ISTP', 'INTP', 'ESTJ', 'ENTJ'],
    realLifeExamples: ['You are the person who takes charge when nobody else will', 'You have strong opinions about the "right way" to do most things', 'You show love through providing structure and stability', 'You feel personally offended by inefficiency'],
    stressSignature: 'Under stress, ESTJs become controlling, rigid, and may lash out at what they perceive as incompetence. The organized leader becomes a micromanager, struggling to trust anyone else to do things "correctly."',
    recoveryPath: 'Let something go that does not actually matter. Ask questions instead of giving instructions. Do something purely for fun with no productive outcome. Remind yourself that connection is not a project to manage.',
    miniRitual: 'Take 60 seconds to do absolutely nothing. No planning, no fixing, no organizing. Just breathe.',
    journalPrompt: 'Am I managing my life or living it? What would happen if I let go of control for one afternoon?',
    tarotArchetype: { card: 'The Emperor', reason: 'The Emperor mirrors your natural authority and organizational power, with the reminder that the strongest leaders know when to yield.' },
  },
  ESFJ: {
    title: 'The Consul',
    subtitle: 'Heart of Community',
    description: 'Caring, social, and tradition-loving. You are always eager to help and do your duty.',
    strengths: ['Warm and caring nature', 'Strong sense of duty', 'Practical helpfulness', 'Social awareness'],
    blindSpots: ['May need external validation', 'Can be sensitive to criticism', 'May struggle with change', 'Can be judgmental'],
    underStress: ['Becomes needy and clingy', 'May gossip or criticize', 'Feels rejected easily', 'Can become controlling'],
    inRelationships: ['Devoted and attentive partner', 'Shows love through care and service', 'Needs appreciation', 'Creates warm social environment'],
    atWork: ['Excellent at team harmony', 'Brings practical support', 'May struggle with conflict', 'Natural at customer relations'],
    growthQuests: [
      { title: 'Self-Validation', description: 'Make a decision based solely on what you want' },
      { title: 'Embrace Criticism', description: 'Ask for feedback and find the growth opportunity' },
      { title: 'Comfortable Alone', description: 'Spend an evening alone doing something you enjoy' }
    ],
    compatibility: ['ISFP', 'ISTP', 'ESFJ', 'ENFJ'],
    realLifeExamples: ['You know when something is wrong in a group before anyone speaks', 'You keep track of everyone\'s preferences and make sure they feel included', 'You take it personally when someone does not appreciate your effort', 'You are the social glue that holds friend groups and families together'],
    stressSignature: 'Under stress, ESFJs become needy, seek validation compulsively, and may gossip or become judgmental. The normally warm caretaker feels rejected and may try to control social dynamics to feel safe.',
    recoveryPath: 'Make a decision based solely on what you want, without considering anyone else\'s reaction. Spend an evening alone doing something you genuinely enjoy. Practice accepting that not everyone needs to like you for you to be valuable.',
    miniRitual: 'Put your hand on your heart and say: "I am enough without anyone\'s approval today."',
    journalPrompt: 'Whose opinion am I shaping my choices around? What would I choose if only my own opinion mattered?',
    tarotArchetype: { card: 'The Lovers', reason: 'The Lovers reflects your deep relational wisdom and the ongoing challenge of choosing authenticity over harmony when the two conflict.' },
  },
  ISTP: {
    title: 'The Virtuoso',
    subtitle: 'Master Craftsperson',
    description: 'Bold, practical, and experimental. You master tools and techniques with ease and love hands-on work.',
    strengths: ['Practical problem-solving', 'Cool under pressure', 'Adaptable and spontaneous', 'Skilled with tools and systems'],
    blindSpots: ['May seem emotionally distant', 'Can be uncommitted', 'Struggles with long-term planning', 'May take unnecessary risks'],
    underStress: ['Becomes withdrawn and cold', 'May act recklessly', 'Shuts down emotionally', 'Can become hypersensitive'],
    inRelationships: ['Shows love through actions', 'Needs space and freedom', 'Values shared activities', 'Loyal but independent'],
    atWork: ['Excels at technical problems', 'Thrives in crises', 'May struggle with routine', 'Brings practical solutions'],
    growthQuests: [
      { title: 'Plan Ahead', description: 'Create a plan for next month and share it with someone' },
      { title: 'Express Feelings', description: 'Tell someone how you feel about them using words' },
      { title: 'Commit to One Thing', description: 'Make a commitment and stick to it for 30 days' }
    ],
    compatibility: ['ESTJ', 'ESFJ', 'ISTP', 'ESTP'],
    realLifeExamples: ['You fix things nobody asked you to fix just because you saw how', 'You prefer action over conversation in almost every situation', 'You need space the way other people need affection', 'You are calm in a crisis and restless when things are too predictable'],
    stressSignature: 'Under stress, ISTPs withdraw emotionally, may act recklessly, and shut down all communication. The normally cool-headed problem solver becomes hypersensitive, reactive, or disappears entirely without explanation.',
    recoveryPath: 'Work with your hands\u2014build, repair, create something physical. Spend time alone but not isolated. When you are ready, express what you felt in simple, direct terms. You do not have to explain everything, just name it.',
    miniRitual: 'Pick up a tool or object and use it for its purpose for 60 seconds. Let the simplicity of doing ground you.',
    journalPrompt: 'What emotion have I been avoiding by staying busy? What would happen if I just sat with it for 5 minutes?',
    tarotArchetype: { card: 'The Chariot', reason: 'The Chariot reflects your mastery of practical challenges and the power that comes from directed, focused action over scattered reaction.' },
  },
  ISFP: {
    title: 'The Adventurer',
    subtitle: 'Artist of Life',
    description: 'Flexible, charming, and artistic. You explore life with curiosity and appreciate beauty in all forms.',
    strengths: ['Sensitive and artistic', 'Flexible and open', 'Passionate about values', 'Curious and exploratory'],
    blindSpots: ['May avoid conflict too much', 'Can be overly sensitive', 'Struggles with long-term planning', 'May undervalue own contributions'],
    underStress: ['Becomes withdrawn and moody', 'May be overly self-critical', 'Loses confidence', 'Can become passive-aggressive'],
    inRelationships: ['Deeply caring and supportive', 'Shows love through presence', 'Needs freedom and acceptance', 'Values harmony highly'],
    atWork: ['Thrives in creative roles', 'Brings aesthetic sensibility', 'May struggle with structure', 'Works well independently'],
    growthQuests: [
      { title: 'Speak Up', description: 'Share your opinion in a group setting' },
      { title: 'Set a Goal', description: 'Create a concrete 3-month goal and track progress' },
      { title: 'Face Conflict', description: 'Address a small disagreement directly instead of avoiding it' }
    ],
    compatibility: ['ENFJ', 'ESFJ', 'ISFP', 'INFP'],
    realLifeExamples: ['You notice beauty in places other people walk right past', 'You would rather show someone how you feel than tell them', 'You shut down in conflict but feel everything intensely afterward', 'You have a creative gift that you probably undervalue'],
    stressSignature: 'Under stress, ISFPs become withdrawn, moody, and overly self-critical. They may lose confidence in their creative gifts and become passive-aggressive rather than addressing conflict directly.',
    recoveryPath: 'Create something\u2014art, music, food, a walk through a beautiful space. Reconnect with sensory experiences that remind you who you are. When you are ready, share one honest feeling with someone safe.',
    miniRitual: 'Touch something beautiful\u2014a fabric, a flower, warm water\u2014and let the sensation remind you that you are alive and present.',
    journalPrompt: 'What am I feeling that I have not given myself permission to express? What would it look like to honor it?',
    tarotArchetype: { card: 'The Moon', reason: 'The Moon reflects your deep sensitivity and rich inner world\u2014the beauty and mystery of experiencing life through feeling rather than logic.' },
  },
  ESTP: {
    title: 'The Entrepreneur',
    subtitle: 'Master of Action',
    description: 'Smart, energetic, and perceptive. You thrive on action and bring excitement wherever you go.',
    strengths: ['Quick thinking and action', 'Perceptive and observant', 'Direct communication', 'Adaptable to any situation'],
    blindSpots: ['May neglect long-term consequences', 'Can be insensitive', 'Struggles with theory', 'May take too many risks'],
    underStress: ['Becomes impulsive and reckless', 'May blame others', 'Loses patience quickly', 'Can become pessimistic'],
    inRelationships: ['Brings excitement and fun', 'Shows love through experiences', 'Needs freedom and action', 'Lives in the present'],
    atWork: ['Excels in dynamic environments', 'Great in emergencies', 'May struggle with routine', 'Natural negotiator'],
    growthQuests: [
      { title: 'Think Before Acting', description: 'Wait 24 hours before making a significant decision' },
      { title: 'Consider Feelings', description: 'Before responding, ask how the other person might feel' },
      { title: 'Long-Term Vision', description: 'Create a 1-year plan for one area of your life' }
    ],
    compatibility: ['ISTJ', 'ISFJ', 'ESTP', 'ISTP'],
    realLifeExamples: ['You are the first person to act and the last person to sit still', 'You learn by doing, not by reading about doing', 'You can talk to anyone and make it feel natural', 'You get bored in about 10 seconds if something is not stimulating'],
    stressSignature: 'Under stress, ESTPs become impulsive, blame others, and lose patience with anything that requires slowing down. The action-oriented problem solver becomes reckless and may make decisions they regret later.',
    recoveryPath: 'Wait 24 hours before making any significant decision. Do something physically challenging to burn off the restless energy. Then sit with one person and actually listen\u2014not to fix, just to hear.',
    miniRitual: 'Stand still for 60 seconds. Feel your feet on the ground. Count your breaths. That is it.',
    journalPrompt: 'What am I running from by staying in constant motion? What would I find if I stopped long enough to look?',
    tarotArchetype: { card: 'The Tower', reason: 'The Tower reflects your relationship with sudden change and disruption\u2014your ability to thrive in chaos and the growth that comes from letting structures break when they need to.' },
  },
  ESFP: {
    title: 'The Entertainer',
    subtitle: 'Life of the Party',
    description: 'Spontaneous, energetic, and enthusiastic. You love being the center of attention and bringing joy to others.',
    strengths: ['Infectious enthusiasm', 'Practical and observant', 'Socially confident', 'Adaptable and spontaneous'],
    blindSpots: ['May avoid serious topics', 'Can be easily bored', 'Struggles with long-term planning', 'May seek too much attention'],
    underStress: ['Becomes scattered and anxious', 'May overindulge in pleasures', 'Feels trapped', 'Can become uncharacteristically negative'],
    inRelationships: ['Fun and affectionate partner', 'Shows love through experiences', 'Needs excitement and attention', 'Lives fully in the moment'],
    atWork: ['Excellent with people', 'Brings energy to teams', 'May struggle with details', 'Natural entertainer'],
    growthQuests: [
      { title: 'Embrace Depth', description: 'Have a deep, meaningful conversation about feelings' },
      { title: 'Delayed Gratification', description: 'Save up for something instead of buying it now' },
      { title: 'Alone Time', description: 'Spend a quiet evening reflecting on your goals' }
    ],
    compatibility: ['ISTJ', 'ISFJ', 'ESFP', 'ESTP'],
    realLifeExamples: ['You turn a boring Tuesday into something people remember', 'You feel things at full intensity and want everyone to feel alive too', 'You avoid heavy conversations but feel deeply when no one is watching', 'You are generous with your time, energy, and presence\u2014sometimes too generous'],
    stressSignature: 'Under stress, ESFPs become scattered, anxious, and may overindulge in pleasures to avoid painful feelings. The normally joyful entertainer becomes uncharacteristically negative and may feel trapped by commitments.',
    recoveryPath: 'Have one deep, meaningful conversation about feelings\u2014yours. Delay one gratification and notice that you survived. Spend a quiet evening reflecting on what brings you lasting joy versus temporary excitement.',
    miniRitual: 'Name one thing you feel grateful for that requires no audience. Let that gratitude be private and real.',
    journalPrompt: 'What am I performing for others that I could replace with something more honestly me?',
    tarotArchetype: { card: 'The Sun', reason: 'The Sun reflects your radiant, life-affirming energy and the lesson that true joy comes from depth of experience, not just breadth.' },
  },
};

export interface LoveLanguageInfo {
  title: string;
  description: string;
  whatItMeans: string;
  whatYouNeed: string[];
  whatToAvoid: string[];
  weeklyChecklist: { task: string; frequency: string }[];
  tips: string[];
  whenHealthy: string;
  whenDeprived: string;
  howToAskForIt: string[];
  partnerGuide: string;
  tarotArchetype: { card: string; reason: string };
}

export const loveLanguageDescriptions: Record<string, LoveLanguageInfo> = {
  gifts: {
    title: 'Receiving Gifts',
    description: 'You feel most loved when you receive thoughtful gifts. The perfect present shows that someone truly knows and appreciates you.',
    whatItMeans: 'For you, gifts are tangible symbols of love and thoughtfulness. It\'s not about materialism - it\'s about the care, effort, and thought that went into choosing something meaningful. A small token that shows someone was thinking of you can mean more than an expensive but generic present.',
    whatYouNeed: [
      'Thoughtful gifts that show you were on their mind',
      'Small surprises that demonstrate attention to your interests',
      'Meaningful souvenirs from trips or experiences',
      'Handmade items that took time and effort',
      'Gifts that reference inside jokes or shared memories'
    ],
    whatToAvoid: [
      'Forgotten birthdays or anniversaries',
      'Last-minute, thoughtless gifts',
      'Dismissing the importance of gift-giving',
      'Treating gifts as materialistic or shallow',
      'Forgetting to bring something back from trips'
    ],
    weeklyChecklist: [
      { task: 'Notice something your loved one mentions wanting', frequency: 'Daily' },
      { task: 'Bring home a small surprise (flowers, snack, book)', frequency: '1-2x' },
      { task: 'Create or make something by hand for someone', frequency: '1x' },
      { task: 'Plan a thoughtful gift for an upcoming occasion', frequency: '1x' }
    ],
    tips: ['Keep a wishlist', 'Notice small things your partner mentions', 'Value the thought behind gifts'],
    whenHealthy: 'When your gift-giving love language is well-nourished, you feel deeply seen and valued. Each thoughtful token confirms that someone noticed you, remembered you, and chose to act on it. You become more generous yourself, finding joy in the ritual of selecting and presenting meaningful objects. Gifts become a love language that flows both ways.',
    whenDeprived: 'When this love language goes unmet, you start to feel invisible. Forgotten birthdays or generic, last-minute presents feel like evidence that nobody is paying attention. You may withdraw, test others by hinting, or develop resentment that looks irrational to people who don\'t understand the symbolic weight objects carry for you.',
    howToAskForIt: ['I feel really loved when someone picks out something that reminds them of me, even if it is small.', 'It is not about expensive things. It is about knowing you thought of me when I was not there.', 'I would love it if we could start a tradition of small surprises for each other.'],
    partnerGuide: 'Keep a running list of things they mention wanting or admiring. Small, frequent, thoughtful gifts beat large, rare, expensive ones. Bring something back from a trip. Wrap it. The presentation matters because it signals effort. Never call their love language materialistic.',
    tarotArchetype: { card: 'Ace of Pentacles', reason: 'The Ace of Pentacles represents new beginnings in the material world, the tangible expression of care and intention that resonates with your need for symbolic tokens of love.' }
  },
  words: {
    title: 'Words of Affirmation',
    description: 'Verbal compliments, words of appreciation, and written notes make you feel valued and loved.',
    whatItMeans: 'Words carry incredible weight for you. Hearing "I love you," receiving genuine compliments, and getting encouragement fills your emotional tank. You remember what people say, both positive and negative, and words of affirmation help you feel secure and appreciated in your relationships.',
    whatYouNeed: [
      'Regular verbal expressions of love and appreciation',
      'Specific compliments about your qualities and efforts',
      'Encouraging words when facing challenges',
      'Written notes, texts, or letters expressing care',
      'Public acknowledgment and praise'
    ],
    whatToAvoid: [
      'Harsh criticism or negative comments',
      'Silent treatment or emotional withdrawal',
      'Sarcasm that cuts too deep',
      'Forgetting to say "I love you" regularly',
      'Taking your efforts for granted without acknowledgment'
    ],
    weeklyChecklist: [
      { task: 'Say "I love you" or "I appreciate you"', frequency: 'Daily' },
      { task: 'Give a specific, genuine compliment', frequency: 'Daily' },
      { task: 'Send an unexpected encouraging text', frequency: '2-3x' },
      { task: 'Write a heartfelt note or letter', frequency: '1x' }
    ],
    tips: ['Express gratitude daily', 'Give specific compliments', 'Leave encouraging notes'],
    whenHealthy: 'When your words of affirmation love language is well-fed, you feel confident, valued, and emotionally safe. Hearing genuine appreciation and encouragement fuels your ability to show up fully in relationships. You become more articulate about your own feelings and more generous with your words toward others.',
    whenDeprived: 'When this language goes unmet, silence feels deafening. You start reading tone, analyzing texts for hidden meaning, and interpreting the absence of praise as criticism. Harsh words cut deeper for you than for most people, and a single critical comment can undo weeks of feeling good about yourself.',
    howToAskForIt: ['When things are good between us, I would love to hear you say it out loud.', 'Words land really deeply for me. A short text saying you appreciate me can carry me through a whole day.', 'I would love more specific compliments rather than generic ones. Tell me what specifically you noticed.'],
    partnerGuide: 'Be specific and frequent. "You are amazing" is less powerful than "I noticed how patient you were with your mother today, and I admire that about you." Leave notes. Send texts. Say it out loud. Never use the silent treatment as punishment and avoid sarcasm that cuts too deep.',
    tarotArchetype: { card: 'The Magician', reason: 'The Magician wields the power of deliberate, focused speech. Your love language recognizes the truth that words are spells—they shape how we feel about ourselves and each other.' }
  },
  acts: {
    title: 'Acts of Service',
    description: 'Actions speak louder than words for you. When someone helps with tasks or takes responsibilities off your plate, you feel cared for.',
    whatItMeans: 'You believe love is shown through helpful actions. When someone takes the time to do something for you - especially without being asked - it speaks volumes about their care and consideration. Having responsibilities lifted or tasks completed makes you feel supported and valued.',
    whatYouNeed: [
      'Help with tasks and responsibilities without being asked',
      'Someone who notices what needs to be done',
      'Follow-through on promises and commitments',
      'Sharing the mental load of household management',
      'Actions that show consideration for your time and energy'
    ],
    whatToAvoid: [
      'Broken promises or unfulfilled commitments',
      'Adding to your workload without appreciation',
      'Expecting you to do everything yourself',
      'Laziness or lack of initiative',
      'Creating more work through carelessness'
    ],
    weeklyChecklist: [
      { task: 'Do a chore without being asked', frequency: 'Daily' },
      { task: 'Take something off their to-do list', frequency: '2-3x' },
      { task: 'Handle a task they\'ve been dreading', frequency: '1x' },
      { task: 'Follow through on a commitment you made', frequency: 'Always' }
    ],
    tips: ['Notice what needs doing', 'Offer help proactively', 'Complete tasks without being asked'],
    whenHealthy: 'When your acts of service love language is well-met, you feel supported and free. Knowing someone shares the weight of life with you creates deep trust. You feel like a team, and the practical care translates directly into emotional security. You reciprocate by anticipating others\' needs effortlessly.',
    whenDeprived: 'When this language goes unmet, you feel alone in the work of living. Unkept promises hit harder than broken words. You may become resentful, keeping a mental scorecard of who did what. The exhaustion of carrying everything alone eventually shows up as anger, withdrawal, or emotional shutdown.',
    howToAskForIt: ['It really means a lot when you handle something without me having to ask.', 'I feel most loved when we share the load. Can we split tasks in a way that feels fair to both of us?', 'When you follow through on something you promised, that is one of the most loving things you can do for me.'],
    partnerGuide: 'Actions speak louder than words for this person. Do not promise and forget. Notice what weighs on them and handle it without being asked. Follow through reliably. The quality and consistency of your actions are how they measure your love—not your words, not your gifts.',
    tarotArchetype: { card: 'Knight of Pentacles', reason: 'The Knight of Pentacles embodies reliable, steady devotion through action. Your love language values the person who shows up consistently and does the work of love without needing applause.' }
  },
  touch: {
    title: 'Physical Touch',
    description: 'Physical affection and closeness make you feel connected and loved. Hugs, hand-holding, and presence matter deeply.',
    whatItMeans: 'Physical connection is your primary way of feeling loved and secure. Hugs, hand-holding, sitting close together, and other forms of touch communicate care and presence in a way words cannot. Physical affection helps you feel emotionally connected and reassured.',
    whatYouNeed: [
      'Regular hugs, kisses, and physical affection',
      'Hand-holding and sitting close together',
      'Comfort through touch during difficult times',
      'Playful physical interaction',
      'Physical presence and proximity'
    ],
    whatToAvoid: [
      'Physical distance or coldness',
      'Forgetting to touch or hug regularly',
      'Rejecting physical advances',
      'Being too distracted for physical connection',
      'Using physical affection as leverage or punishment'
    ],
    weeklyChecklist: [
      { task: 'Give a meaningful hug or embrace', frequency: 'Daily' },
      { task: 'Hold hands or sit close during activities', frequency: 'Daily' },
      { task: 'Initiate a physical gesture of affection', frequency: 'Daily' },
      { task: 'Give a massage or back rub', frequency: '1-2x' }
    ],
    tips: ['Initiate physical affection', 'Be present and attentive', 'Create moments for closeness'],
    whenHealthy: 'When your physical touch love language is well-met, you feel grounded, safe, and connected. Physical closeness is how your nervous system regulates. A hand on your back, a long hug, or sitting close together communicates what words sometimes cannot. You feel fully present and emotionally available.',
    whenDeprived: 'When this language goes unmet, you feel disconnected and anxious even if everything else in the relationship seems fine. You may become clingy, withdrawing, or irritable without understanding why. Physical distance creates emotional distance for you, and you can feel genuinely touch-starved.',
    howToAskForIt: ['I need more physical closeness. Can we sit together on the couch tonight?', 'A hug when I come home would make my whole day better.', 'Physical touch is how I feel connected. It does not have to be elaborate—just close.'],
    partnerGuide: 'Initiate touch regularly. A hand on the small of their back, holding hands while walking, a long embrace when reuniting—these small gestures have enormous emotional weight. Never withhold physical affection as punishment. Make physical connection a daily habit, not a special occasion.',
    tarotArchetype: { card: 'The Empress', reason: 'The Empress represents embodied, sensory love—the warmth of presence and physical nurturing that your love language craves and naturally extends to others.' }
  },
  time: {
    title: 'Quality Time',
    description: 'Undivided attention is your love language. You feel most loved when someone gives you their full presence and focus.',
    whatItMeans: 'What you value most is focused, uninterrupted time together. It\'s not about the quantity of time, but the quality of attention. When someone puts away their phone, makes eye contact, and truly listens, you feel deeply loved and valued. Shared experiences and meaningful conversations fill your emotional cup.',
    whatYouNeed: [
      'Undivided attention during conversations',
      'Phone-free time together',
      'Shared activities and experiences',
      'Active listening and engagement',
      'Regular one-on-one time'
    ],
    whatToAvoid: [
      'Distracted conversations (checking phone, TV on)',
      'Canceled plans or broken commitments',
      'Being physically present but mentally elsewhere',
      'Prioritizing other activities over time together',
      'Multitasking during quality time'
    ],
    weeklyChecklist: [
      { task: 'Have a phone-free conversation', frequency: 'Daily' },
      { task: 'Do an activity together with full attention', frequency: '2-3x' },
      { task: 'Schedule a dedicated date or quality time block', frequency: '1x' },
      { task: 'Practice active listening without interrupting', frequency: 'Daily' }
    ],
    tips: ['Put away distractions', 'Plan dedicated time together', 'Be fully present'],
    whenHealthy: 'When your quality time love language is well-met, you feel deeply connected and valued. Undivided attention tells you that you are the priority. Shared experiences create the emotional memories you return to when life gets hard. You feel known, heard, and genuinely important to the people you love.',
    whenDeprived: 'When this language goes unmet, you feel like a footnote in someone else\'s busy schedule. Canceled plans, distracted conversations, and phone-checking during dinner all translate to the same message: you are not important enough. You may become clingy or, conversely, withdraw completely to protect yourself.',
    howToAskForIt: ['Can we have one evening a week that is just for us, with phones put away?', 'I feel most loved when you are fully present. Even 20 minutes of real attention means more than a whole distracted day together.', 'I would love to do more activities together where we are both engaged.'],
    partnerGuide: 'Put the phone away. Make eye contact. Listen without planning your response. Schedule regular one-on-one time and protect it like you would a work meeting. Quality matters more than quantity, but consistency matters most. Being physically present while mentally elsewhere is worse than being apart.',
    tarotArchetype: { card: 'The Lovers', reason: 'The Lovers card represents the choice to be truly present with another person, the sacred act of giving your full attention that your love language recognizes as the highest form of devotion.' }
  },
};

export const moodCheckQuiz: QuizDefinition = {
  id: 'mood-check-v1',
  type: 'big-five',
  title: 'Quick Mood Check',
  description: 'A fast emotional weather report to help you name what you are carrying today. Instead of judging your mood as good or bad, this check-in focuses on patterns: stress load, energy level, emotional sensitivity, and what your nervous system is asking for right now. You will get a mood profile, a best-next-step recommendation, and a journal prompt so you can turn today\'s mood into insight instead of rumination.',
  questions: [
    {
      id: 'mood1',
      text: 'How would you describe your energy level right now?',
      dimension: 'energy',
      options: [
        { value: 1, label: 'Exhausted' },
        { value: 2, label: 'Low energy' },
        { value: 3, label: 'Neutral' },
        { value: 4, label: 'Good energy' },
        { value: 5, label: 'Energized' },
      ]
    },
    {
      id: 'mood2',
      text: 'How are you feeling emotionally?',
      dimension: 'emotion',
      options: [
        { value: 1, label: 'Very stressed' },
        { value: 2, label: 'A bit anxious' },
        { value: 3, label: 'Calm' },
        { value: 4, label: 'Content' },
        { value: 5, label: 'Joyful' },
      ]
    },
    {
      id: 'mood3',
      text: 'How connected do you feel to others today?',
      dimension: 'connection',
      options: [
        { value: 1, label: 'Isolated' },
        { value: 2, label: 'Disconnected' },
        { value: 3, label: 'Neutral' },
        { value: 4, label: 'Connected' },
        { value: 5, label: 'Deeply connected' },
      ]
    },
    {
      id: 'mood4',
      text: 'How clear is your mind right now?',
      dimension: 'clarity',
      options: [
        { value: 1, label: 'Very foggy' },
        { value: 2, label: 'Scattered' },
        { value: 3, label: 'Neutral' },
        { value: 4, label: 'Focused' },
        { value: 5, label: 'Crystal clear' },
      ]
    },
    {
      id: 'mood5',
      text: 'What do you need most right now?',
      dimension: 'need',
      options: [
        { value: 1, label: 'Rest' },
        { value: 2, label: 'Support' },
        { value: 3, label: 'Space' },
        { value: 4, label: 'Action' },
        { value: 5, label: 'Connection' },
      ]
    },
  ],
};

export function calculateMoodCheck(scores: Record<string, number>): {
  overallMood: string;
  moodScore: number;
  dimensions: Record<string, number>;
  suggestion: string;
} {
  const dimensions: Record<string, number> = {
    energy: 0,
    emotion: 0,
    connection: 0,
    clarity: 0,
  };

  let needValue = 3;

  Object.entries(scores).forEach(([key, value]) => {
    const question = moodCheckQuiz.questions.find(q => q.id === key);
    if (question?.dimension && question.dimension !== 'need') {
      dimensions[question.dimension] = value;
    }
    if (question?.dimension === 'need') {
      needValue = value;
    }
  });

  const avgScore = Object.values(dimensions).reduce((a, b) => a + b, 0) / 4;

  let overallMood: string;
  if (avgScore >= 4) overallMood = 'Thriving';
  else if (avgScore >= 3.5) overallMood = 'Good';
  else if (avgScore >= 2.5) overallMood = 'Okay';
  else if (avgScore >= 1.5) overallMood = 'Struggling';
  else overallMood = 'Depleted';

  const needLabels = ['Rest', 'Support', 'Space', 'Action', 'Connection'];
  const need = needLabels[needValue - 1] || 'Balance';

  const suggestions: Record<string, string> = {
    Rest: 'Take a moment to breathe deeply. Consider a short nap or gentle stretching.',
    Support: 'Reach out to someone you trust. Sometimes sharing how we feel can lighten the load.',
    Space: 'Give yourself permission to step back. A quiet walk or journaling might help.',
    Action: 'Channel your energy into something productive. Movement or a creative task could help.',
    Connection: 'Text a friend or spend quality time with someone. Human connection heals.',
  };

  return {
    overallMood,
    moodScore: Math.round(avgScore * 20),
    dimensions,
    suggestion: suggestions[need] || 'Take a moment to check in with yourself and honor what you need.',
  };
}

export const moodDescriptions: Record<string, { emoji: string; color: string; message: string; recommendation: string; journalPrompt: string; tarotSuggestion: string }> = {
  Thriving: { emoji: '1f31f', color: 'text-emerald-400', message: 'You\'re in a great place! Use this energy wisely.', recommendation: 'Channel this energy into something meaningful. Start that project, have that conversation, or make that decision you have been putting off. High-energy days are rare—use them intentionally.', journalPrompt: 'What am I most proud of about the way I am showing up right now? How can I sustain this?', tarotSuggestion: 'The Sun – radiance, vitality, and clarity. This is your moment to shine.' },
  Good: { emoji: '1f60a', color: 'text-green-400', message: 'Things are going well. Keep nurturing what\'s working.', recommendation: 'Maintain your current rhythm. Notice what is contributing to this good feeling and do more of it. A good day is a great day to invest in the people and habits that sustain you.', journalPrompt: 'What three things are working well in my life right now? How can I protect and nurture them?', tarotSuggestion: 'The Star – hope, calm, and steady renewal. You are on the right path.' },
  Okay: { emoji: '1f610', color: 'text-yellow-400', message: 'You\'re managing. Small acts of self-care can help.', recommendation: 'Do one small thing for yourself that requires no effort to enjoy—a warm drink, a favorite song, a 10-minute walk. You do not need to feel great to take care of yourself. Small acts of kindness toward yourself add up.', journalPrompt: 'What is one thing I can do in the next hour that is just for me? What would feel genuinely nourishing right now?', tarotSuggestion: 'Temperance – balance and patience. This is a day for moderation, not big moves.' },
  Struggling: { emoji: '1f614', color: 'text-orange-400', message: 'It\'s okay to not be okay. Be gentle with yourself.', recommendation: 'Lower the bar for today. Cancel what you can. Eat something nourishing. Reach out to one person who makes you feel safe. You are not behind—you are processing. Give yourself permission to do the minimum.', journalPrompt: 'What am I carrying right now that feels heavy? Is there one piece of it I could set down, even temporarily?', tarotSuggestion: 'The Moon – uncertainty and hidden depths. Trust that clarity will return. Rest in the not-knowing.' },
  Depleted: { emoji: '1f62d', color: 'text-red-400', message: 'You need care right now. Prioritize rest and support.', recommendation: 'This is not a day for productivity. Your only job is to get through it gently. Sleep if you can. Eat something. Drink water. If you can, tell one person how you feel—you do not have to do this alone. Everything else can wait.', journalPrompt: 'What do I need most right now that I am not giving myself? Who in my life feels safe enough to ask for help?', tarotSuggestion: 'The Hermit – withdrawal and inner light. Even in your lowest moments, there is wisdom gathering inside you.' },
};

export const quizMetadata = {
  mbti: {
    timeEstimate: '10-15 min',
    whatYouGet: ['Your type profile with strengths + blind spots', 'Stress mode patterns + recovery strategies', 'Relationship style notes + communication tips', 'Tarot archetype alignment'],
    icon: 'brain',
    color: 'cosmic-blue',
  },
  'love-language': {
    timeEstimate: '5-7 min',
    whatYouGet: ['Primary + secondary love language', '"When healthy" vs "when deprived" insight', 'Clear ways to ask for love in your language', 'Partner tips for supporting you'],
    icon: 'heart',
    color: 'cosmic-rose',
  },
  'mood-check': {
    timeEstimate: '30 sec',
    whatYouGet: ['A mood profile (calm/charged/drained/steady)', 'A "best next step" recommendation', 'A journal prompt for your current state', 'Optional tarot archetype suggestion'],
    icon: 'smile',
    color: 'gold',
  },
  'big-five': {
    timeEstimate: '8-10 min',
    whatYouGet: ['Five trait scores with real-life interpretation', 'Strengths + potential pitfalls for each trait', 'Lifestyle and relationship suggestions', 'A "growth lever" for meaningful change'],
    icon: 'pentagon',
    color: 'emerald-400',
  },
  enneagram: {
    timeEstimate: '10-12 min',
    whatYouGet: ['Your Enneagram type + wing', 'Growth and stress direction paths', 'Core motivation, fear, and desire', 'Tarot archetype alignment'],
    icon: 'target',
    color: 'gold',
  },
  attachment: {
    timeEstimate: '5-7 min',
    whatYouGet: ['Your primary attachment pattern', 'Triggers + deactivation/activation behaviors', 'What you need from a partner to feel safe', 'A path toward secure attachment'],
    icon: 'link',
    color: 'pink-400',
  },
};
