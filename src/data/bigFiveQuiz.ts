import type { QuizDefinition } from '../types';

export const bigFiveQuiz: QuizDefinition = {
  id: 'big-five-v1',
  type: 'big-five',
  title: 'Big Five Personality Assessment',
  description: 'Discover your scores across the five major dimensions of personality: Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism.',
  questions: [
    { id: 'o1', text: 'I enjoy trying new and different experiences.', dimension: 'openness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'o2', text: 'I have a vivid imagination.', dimension: 'openness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'o3', text: 'I prefer routine over variety.', dimension: 'openness', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'o4', text: 'I am interested in abstract ideas and concepts.', dimension: 'openness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'o5', text: 'I appreciate art, music, and creative expression.', dimension: 'openness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'o6', text: 'I prefer sticking to what I know rather than exploring new things.', dimension: 'openness', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'o7', text: 'I enjoy thinking about philosophical questions.', dimension: 'openness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'o8', text: 'I get excited by new ideas and possibilities.', dimension: 'openness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'o9', text: 'I find beauty in things that others might overlook.', dimension: 'openness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'o10', text: 'I am open to reconsidering my values and beliefs.', dimension: 'openness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },

    { id: 'c1', text: 'I am always prepared and organized.', dimension: 'conscientiousness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'c2', text: 'I pay attention to details.', dimension: 'conscientiousness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'c3', text: 'I often leave tasks unfinished.', dimension: 'conscientiousness', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'c4', text: 'I follow through on my commitments.', dimension: 'conscientiousness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'c5', text: 'I set clear goals and work toward them systematically.', dimension: 'conscientiousness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'c6', text: 'I tend to procrastinate on important tasks.', dimension: 'conscientiousness', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'c7', text: 'I am reliable and dependable.', dimension: 'conscientiousness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'c8', text: 'I think carefully before making decisions.', dimension: 'conscientiousness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'c9', text: 'I keep my belongings neat and organized.', dimension: 'conscientiousness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'c10', text: 'I have strong self-discipline.', dimension: 'conscientiousness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },

    { id: 'e1', text: 'I feel comfortable in social situations.', dimension: 'extraversion', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'e2', text: 'I prefer spending time alone rather than with others.', dimension: 'extraversion', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'e3', text: 'I enjoy being the center of attention.', dimension: 'extraversion', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'e4', text: 'I find it easy to start conversations with strangers.', dimension: 'extraversion', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'e5', text: 'I feel energized after social events.', dimension: 'extraversion', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'e6', text: 'I tend to be quiet in group settings.', dimension: 'extraversion', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'e7', text: 'I like meeting new people.', dimension: 'extraversion', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'e8', text: 'I am talkative and expressive.', dimension: 'extraversion', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'e9', text: 'I enjoy parties and social gatherings.', dimension: 'extraversion', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'e10', text: 'I have a wide circle of acquaintances.', dimension: 'extraversion', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },

    { id: 'a1', text: 'I am interested in other people\'s problems.', dimension: 'agreeableness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'a2', text: 'I trust others easily.', dimension: 'agreeableness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'a3', text: 'I can be cold and distant.', dimension: 'agreeableness', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'a4', text: 'I try to be helpful and considerate of others.', dimension: 'agreeableness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'a5', text: 'I avoid arguments and conflicts.', dimension: 'agreeableness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'a6', text: 'I sometimes put my needs above others\'.', dimension: 'agreeableness', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'a7', text: 'I am forgiving and understanding.', dimension: 'agreeableness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'a8', text: 'I feel sympathy for those who are less fortunate.', dimension: 'agreeableness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'a9', text: 'I value cooperation over competition.', dimension: 'agreeableness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'a10', text: 'I treat everyone with kindness and respect.', dimension: 'agreeableness', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },

    { id: 'n1', text: 'I often feel anxious or worried.', dimension: 'neuroticism', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'n2', text: 'I remain calm under pressure.', dimension: 'neuroticism', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'n3', text: 'I experience frequent mood swings.', dimension: 'neuroticism', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'n4', text: 'I get stressed easily.', dimension: 'neuroticism', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'n5', text: 'I rarely feel depressed or down.', dimension: 'neuroticism', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'n6', text: 'I often feel insecure about myself.', dimension: 'neuroticism', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'n7', text: 'I handle setbacks well.', dimension: 'neuroticism', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'n8', text: 'I tend to dwell on negative experiences.', dimension: 'neuroticism', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'n9', text: 'I get easily irritated or frustrated.', dimension: 'neuroticism', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'n10', text: 'I feel emotionally stable most of the time.', dimension: 'neuroticism', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
  ],
};

export interface BigFiveResult {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  percentiles: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
}

export function calculateBigFive(scores: Record<string, number>): BigFiveResult {
  const dimensions: Record<string, number> = {
    openness: 0,
    conscientiousness: 0,
    extraversion: 0,
    agreeableness: 0,
    neuroticism: 0,
  };

  Object.entries(scores).forEach(([key, value]) => {
    const question = bigFiveQuiz.questions.find(q => q.id === key);
    if (question?.dimension) {
      dimensions[question.dimension] += value;
    }
  });

  Object.keys(dimensions).forEach(key => {
    dimensions[key] = Math.round((dimensions[key] / 50) * 100);
  });

  const toPercentile = (score: number) => Math.min(99, Math.max(1, Math.round(score)));

  return {
    openness: dimensions.openness,
    conscientiousness: dimensions.conscientiousness,
    extraversion: dimensions.extraversion,
    agreeableness: dimensions.agreeableness,
    neuroticism: dimensions.neuroticism,
    percentiles: {
      openness: toPercentile(dimensions.openness),
      conscientiousness: toPercentile(dimensions.conscientiousness),
      extraversion: toPercentile(dimensions.extraversion),
      agreeableness: toPercentile(dimensions.agreeableness),
      neuroticism: toPercentile(dimensions.neuroticism),
    },
  };
}

export interface BigFiveDimensionInfo {
  name: string;
  fullName: string;
  description: string;
  highDescription: string;
  lowDescription: string;
  facets: { name: string; description: string }[];
  careers: { high: string[]; low: string[] };
  relationships: { high: string; low: string };
  growthTips: { high: string[]; low: string[] };
}

export const bigFiveDescriptions: Record<string, BigFiveDimensionInfo> = {
  openness: {
    name: 'O',
    fullName: 'Openness to Experience',
    description: 'Reflects imagination, creativity, and willingness to explore new ideas and experiences.',
    highDescription: 'You are curious, creative, and open to new experiences. You appreciate art, seek out variety, and enjoy exploring abstract concepts and unconventional ideas.',
    lowDescription: 'You prefer familiarity, routine, and practical approaches. You value tradition and tend to be more conventional in your thinking and preferences.',
    facets: [
      { name: 'Fantasy', description: 'Vivid imagination and rich inner world' },
      { name: 'Aesthetics', description: 'Appreciation for art and beauty' },
      { name: 'Feelings', description: 'Awareness and expression of emotions' },
      { name: 'Actions', description: 'Willingness to try new activities' },
      { name: 'Ideas', description: 'Intellectual curiosity and openness to new concepts' },
      { name: 'Values', description: 'Readiness to reexamine beliefs and values' },
    ],
    careers: {
      high: ['Artist', 'Writer', 'Scientist', 'Entrepreneur', 'Designer', 'Philosopher'],
      low: ['Accountant', 'Administrator', 'Banker', 'Police Officer', 'Factory Worker'],
    },
    relationships: {
      high: 'You bring creativity and novelty to relationships. You enjoy deep conversations and exploring new experiences together.',
      low: 'You provide stability and predictability in relationships. You value shared routines and traditional expressions of love.',
    },
    growthTips: {
      high: ['Ground your ideas in practical action', 'Appreciate the value of routine', 'Focus on finishing projects'],
      low: ['Try one new experience per month', 'Read books outside your comfort zone', 'Practice brainstorming without judgment'],
    },
  },
  conscientiousness: {
    name: 'C',
    fullName: 'Conscientiousness',
    description: 'Reflects organization, dependability, self-discipline, and goal-directed behavior.',
    highDescription: 'You are organized, reliable, and goal-oriented. You plan ahead, pay attention to details, and follow through on commitments.',
    lowDescription: 'You are flexible, spontaneous, and adaptable. You prefer to go with the flow rather than following strict schedules or plans.',
    facets: [
      { name: 'Competence', description: 'Belief in your own capability' },
      { name: 'Order', description: 'Organization and tidiness' },
      { name: 'Dutifulness', description: 'Adherence to ethical principles and obligations' },
      { name: 'Achievement Striving', description: 'Drive toward accomplishing goals' },
      { name: 'Self-Discipline', description: 'Ability to persist on tasks' },
      { name: 'Deliberation', description: 'Thinking before acting' },
    ],
    careers: {
      high: ['Project Manager', 'Surgeon', 'Lawyer', 'Engineer', 'Financial Analyst', 'Military Officer'],
      low: ['Artist', 'Musician', 'Freelancer', 'Emergency Responder', 'Sales'],
    },
    relationships: {
      high: 'You are dependable and committed. You show love through reliability and follow-through on promises.',
      low: 'You bring spontaneity and flexibility to relationships. You adapt easily but may struggle with long-term commitments.',
    },
    growthTips: {
      high: ['Learn to relax and be spontaneous', 'Accept imperfection', 'Delegate more to others'],
      low: ['Use a calendar or planner', 'Set small, achievable goals', 'Create simple routines'],
    },
  },
  extraversion: {
    name: 'E',
    fullName: 'Extraversion',
    description: 'Reflects sociability, assertiveness, positive emotions, and energy derived from external stimulation.',
    highDescription: 'You are outgoing, energetic, and thrive in social situations. You enjoy meeting new people and feel energized by social interaction.',
    lowDescription: 'You prefer solitude or small groups. You recharge through quiet time alone and may find extensive socializing draining.',
    facets: [
      { name: 'Warmth', description: 'Friendliness and affection toward others' },
      { name: 'Gregariousness', description: 'Preference for social company' },
      { name: 'Assertiveness', description: 'Tendency to take charge and lead' },
      { name: 'Activity', description: 'Pace of living and energy level' },
      { name: 'Excitement-Seeking', description: 'Need for stimulation and thrills' },
      { name: 'Positive Emotions', description: 'Tendency to experience positive feelings' },
    ],
    careers: {
      high: ['Sales', 'Marketing', 'Public Relations', 'Event Planning', 'Teaching', 'Politics'],
      low: ['Writer', 'Researcher', 'Programmer', 'Analyst', 'Librarian', 'Accountant'],
    },
    relationships: {
      high: 'You bring energy and social connection to relationships. You enjoy shared activities and introducing partners to friends.',
      low: 'You offer depth and meaningful one-on-one connection. You value quality time alone together.',
    },
    growthTips: {
      high: ['Practice active listening', 'Enjoy quiet activities', 'Give others space to talk'],
      low: ['Push yourself to attend one social event monthly', 'Practice small talk', 'Share your thoughts more openly'],
    },
  },
  agreeableness: {
    name: 'A',
    fullName: 'Agreeableness',
    description: 'Reflects compassion, cooperation, trust, and concern for social harmony.',
    highDescription: 'You are warm, trusting, and cooperative. You prioritize getting along with others and are often seen as kind and considerate.',
    lowDescription: 'You are direct, competitive, and skeptical. You prioritize truth over harmony and may challenge others more readily.',
    facets: [
      { name: 'Trust', description: 'Belief in others\' honesty and good intentions' },
      { name: 'Straightforwardness', description: 'Sincerity in dealing with others' },
      { name: 'Altruism', description: 'Concern for others\' welfare' },
      { name: 'Compliance', description: 'Tendency to defer to others and avoid conflict' },
      { name: 'Modesty', description: 'Humble and unassuming attitude' },
      { name: 'Tender-Mindedness', description: 'Sympathy and concern for others' },
    ],
    careers: {
      high: ['Counselor', 'Nurse', 'Teacher', 'Social Worker', 'Non-profit Manager', 'HR Specialist'],
      low: ['Lawyer', 'Executive', 'Surgeon', 'Critic', 'Military Leader', 'Entrepreneur'],
    },
    relationships: {
      high: 'You create harmony and are supportive and nurturing. You may need to practice asserting your own needs.',
      low: 'You are honest and direct. You may need to practice empathy and considering others\' perspectives.',
    },
    growthTips: {
      high: ['Practice saying no', 'Express your own needs', 'Set healthy boundaries'],
      low: ['Practice empathy exercises', 'Consider others\' feelings before speaking', 'Look for compromise'],
    },
  },
  neuroticism: {
    name: 'N',
    fullName: 'Neuroticism (Emotional Stability)',
    description: 'Reflects emotional reactivity, tendency toward negative emotions, and vulnerability to stress.',
    highDescription: 'You experience emotions intensely and may be more prone to stress, anxiety, and mood fluctuations. You are emotionally sensitive.',
    lowDescription: 'You are emotionally stable and resilient. You remain calm under pressure and bounce back quickly from setbacks.',
    facets: [
      { name: 'Anxiety', description: 'Tendency to worry and feel apprehensive' },
      { name: 'Angry Hostility', description: 'Tendency to experience anger and frustration' },
      { name: 'Depression', description: 'Tendency to experience sadness and hopelessness' },
      { name: 'Self-Consciousness', description: 'Sensitivity to embarrassment and social evaluation' },
      { name: 'Impulsiveness', description: 'Difficulty controlling urges and desires' },
      { name: 'Vulnerability', description: 'Difficulty coping with stress' },
    ],
    careers: {
      high: ['Artist', 'Writer', 'Therapist', 'Activist', 'Creative Director'],
      low: ['Pilot', 'Surgeon', 'Air Traffic Controller', 'Emergency Responder', 'Executive'],
    },
    relationships: {
      high: 'You are emotionally expressive and deeply connected. You may need support during stressful times.',
      low: 'You provide stability and calm in relationships. You may need to practice expressing vulnerability.',
    },
    growthTips: {
      high: ['Practice mindfulness daily', 'Build a self-care routine', 'Challenge negative thought patterns'],
      low: ['Allow yourself to feel emotions', 'Practice vulnerability', 'Check in with your emotional state'],
    },
  },
};
