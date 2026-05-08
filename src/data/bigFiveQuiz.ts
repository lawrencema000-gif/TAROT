import type { QuizDefinition } from '../types';

export const bigFiveQuiz: QuizDefinition = {
  id: 'big-five-v1',
  type: 'big-five',
  title: 'Big Five Personality Assessment',
  description: 'This assessment maps your personality across the five most scientifically validated dimensions of human personality. Rather than assigning a single type, the Big Five gives you a spectrum for each trait, revealing how you naturally process experiences, relate to others, manage responsibilities, and handle stress. You will receive a real-world interpretation of each trait score, specific strengths and pitfalls, lifestyle suggestions, and a growth lever for meaningful change.',
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
  /**
   * 1-99 percentage of max raw score per dimension. Despite the legacy
   * field name `percentiles`, these are NOT norm-referenced population
   * percentiles — they're raw-score-percentages clamped to 1-99. New
   * code should prefer `percentageScore`. Both fields point to the
   * same numbers; the alias exists for backwards-compat.
   */
  percentiles: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  /** Same numbers as `percentiles`, accurately named. */
  percentageScore: {
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

  // Track per-dimension question counts so we can normalize against the
  // actual maximum possible for each trait, not a hard-coded 50. Without
  // this, a user who skips even one Openness question (or if a future
  // refactor changes question counts) would have their Openness score
  // deflated by 10% per skipped question.
  const counts: Record<string, number> = {
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
      counts[question.dimension] += 1;
    }
  });

  Object.keys(dimensions).forEach(key => {
    // Likert max per question is 5; max raw score per dimension is
    // count*5. Fall back to 1 to avoid divide-by-zero if no questions
    // for a dimension were answered.
    const maxRaw = Math.max(1, counts[key] * 5);
    dimensions[key] = Math.round((dimensions[key] / maxRaw) * 100);
  });

  // Renamed `percentiles` → `percentageScore`. The previous label was
  // misleading: these are 0-100 trait percentages of max possible
  // raw score, NOT norm-referenced population percentiles. A score of
  // 70 means the user agreed with high-trait questions 70% as strongly
  // as they could, which is different from "ranking above 70% of the
  // population." Renaming makes the semantics honest.
  const clampPct = (score: number) => Math.min(99, Math.max(1, Math.round(score)));

  return {
    openness: dimensions.openness,
    conscientiousness: dimensions.conscientiousness,
    extraversion: dimensions.extraversion,
    agreeableness: dimensions.agreeableness,
    neuroticism: dimensions.neuroticism,
    percentageScore: {
      openness: clampPct(dimensions.openness),
      conscientiousness: clampPct(dimensions.conscientiousness),
      extraversion: clampPct(dimensions.extraversion),
      agreeableness: clampPct(dimensions.agreeableness),
      neuroticism: clampPct(dimensions.neuroticism),
    },
    // Backwards-compat alias — keep `percentiles` available for any
    // existing UI code that reads it. Both fields point to the same
    // object so updates in one are reflected in the other. Remove the
    // alias once all readers migrate to `percentageScore`.
    get percentiles() {
      return this.percentageScore;
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
  realLifeExamples: { high: string[]; low: string[] };
  growthLever: { high: string; low: string };
  lifestyleSuggestion: { high: string; low: string };
  tarotArchetype: { high: { card: string; reason: string }; low: { card: string; reason: string } };
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
    realLifeExamples: {
      high: ['You rearrange furniture for fun because the room "needed a new energy"', 'You can spend an hour down a Wikipedia rabbit hole and call it a good afternoon', 'You have strong opinions about art, music, or film that most people find surprising', 'You dream about living in another country at least once a month'],
      low: ['You have a favorite restaurant and you order the same thing every time', 'You find comfort in routine and feel unsettled when plans change', 'You trust experience over theory and prefer proven approaches', 'You value tradition and find meaning in the familiar'],
    },
    growthLever: {
      high: 'Your growth edge is grounding. You generate ideas effortlessly but may struggle to execute them. The practice of finishing what you start, even when the novelty fades, is where your real power lives.',
      low: 'Your growth edge is intentional experimentation. You do not need to become someone you are not, but choosing one new experience per month, no matter how small, expands your world in ways that compound over time.',
    },
    lifestyleSuggestion: {
      high: 'Build creative rituals with structure: a weekly writing session, a monthly museum visit, a quarterly solo adventure. Your openness thrives when it has containers to fill rather than unlimited space.',
      low: 'Try a "new thing Friday" where you do one small thing differently. A new recipe, a different route, a genre of music you normally skip. Small experiments build comfort with the unfamiliar.',
    },
    tarotArchetype: {
      high: { card: 'The Fool', reason: 'The Fool steps into the unknown with curiosity and trust, embodying your natural openness to experience and your willingness to explore without a map.' },
      low: { card: 'The Hierophant', reason: 'The Hierophant values tradition, structure, and proven wisdom, reflecting your preference for what is known and your strength in maintaining what works.' },
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
    realLifeExamples: {
      high: ['You make your bed every morning and it actually affects your mood', 'You have a to-do list system that other people find either impressive or exhausting', 'You feel physical discomfort when deadlines are approaching and work is unfinished', 'You are the person people trust to follow through, and you rarely disappoint'],
      low: ['You work in creative bursts and your best ideas come at unusual hours', 'Your desk is messy but you know where everything is', 'You adapt easily when plans change because you never over-planned in the first place', 'You are the person who says "we will figure it out" and usually does'],
    },
    growthLever: {
      high: 'Your growth edge is flexibility. You are masterful at executing plans, but life does not always follow plans. Learning to improvise, accept imperfection, and release control when it is not serving you will make your discipline even more powerful.',
      low: 'Your growth edge is small, consistent habits. You do not need to become rigid, but building one reliable routine, even something tiny like making your bed, creates a foundation that supports your spontaneous nature.',
    },
    lifestyleSuggestion: {
      high: 'Schedule unstructured time. Literally block off time in your calendar for "nothing." Your productivity will actually increase when you give your discipline regular rest.',
      low: 'Use a single simple list. Not an app, not a system. One piece of paper with three things to do today. Finish them before adding more. Build the muscle before building the system.',
    },
    tarotArchetype: {
      high: { card: 'The Hermit', reason: 'The Hermit moves with discipline and purpose through life, reflecting your methodical approach and your ability to achieve through steady, focused effort.' },
      low: { card: 'The Fool', reason: 'The Fool moves through life with spontaneous trust, reflecting your adaptable, go-with-the-flow nature and your ability to thrive without rigid plans.' },
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
    realLifeExamples: {
      high: ['You have texted three people before getting out of bed today', 'You genuinely enjoy small talk because every stranger is a potential connection', 'You feel restless and low when you spend too much time alone', 'You process your thoughts by talking them through with other people'],
      low: ['You need at least an hour of silence to feel like yourself after socializing', 'You have declined plans you genuinely wanted to attend because your social battery was empty', 'You prefer deep one-on-one conversations over group activities', 'You do your best thinking alone and sometimes resent being interrupted'],
    },
    growthLever: {
      high: 'Your growth edge is depth. You connect easily and widely, but your most meaningful relationships will come from slowing down and going deeper with fewer people rather than spreading your energy thin.',
      low: 'Your growth edge is selective visibility. You do not need to become an extrovert, but allowing yourself to be seen, sharing your thoughts, and initiating contact with people you value will prevent the isolation that introverts sometimes mistake for preference.',
    },
    lifestyleSuggestion: {
      high: 'Designate one quiet evening per week where you do not make plans. Use this time for reflection, reading, or creative work. Your social energy is a gift, but it needs a counterweight.',
      low: 'Commit to initiating one social contact per week that goes beyond obligation. A coffee with a friend, a phone call, a message that says "I was thinking about you." Small reaches prevent long retreats.',
    },
    tarotArchetype: {
      high: { card: 'The Sun', reason: 'The Sun radiates warmth, visibility, and joy, reflecting your natural ability to energize others and your need for social connection to feel alive.' },
      low: { card: 'The Hermit', reason: 'The Hermit carries a lantern of inner wisdom, reflecting your rich inner world and the strength you draw from solitude and reflection.' },
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
    realLifeExamples: {
      high: ['You apologize even when it is not your fault because you would rather keep the peace', 'You have said "I am fine" when you were not, more times than you can count', 'You can feel what someone else is feeling before they tell you', 'You are the friend everyone calls when they need to be heard without judgment'],
      low: ['You have been called "intimidating" by people who later said they respected you', 'You give honest feedback even when it makes people uncomfortable', 'You would rather be respected than liked', 'You see through flattery and politeness to what people actually want'],
    },
    growthLever: {
      high: 'Your growth edge is assertiveness. Your empathy is a genuine superpower, but it becomes self-destructive when you cannot say no, express disagreement, or put your own needs first. Learning to be kind and direct is the most compassionate thing you can do.',
      low: 'Your growth edge is empathic listening. You are right more often than people give you credit for, but being right while making others feel dismissed is a losing strategy. Pausing to consider how your message lands will make your directness far more effective.',
    },
    lifestyleSuggestion: {
      high: 'Practice saying no to one thing per week that you would normally agree to out of obligation. Notice that the relationship survives. Build evidence that your boundaries do not destroy connection.',
      low: 'Before giving feedback or a strong opinion, ask one question first. "How are you feeling about this?" or "What do you think?" Making space for others before inserting yourself changes the entire dynamic.',
    },
    tarotArchetype: {
      high: { card: 'The Empress', reason: 'The Empress nurtures and supports with unconditional warmth, reflecting your natural compassion and the challenge of giving without depleting yourself.' },
      low: { card: 'Justice', reason: 'Justice values truth, fairness, and direct accountability, reflecting your commitment to honesty over harmony and your strength in seeing things clearly.' },
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
    realLifeExamples: {
      high: ['You replay conversations in your head to check if you said something wrong', 'You feel your emotions at full volume and sometimes wish you could turn down the dial', 'A vague text from someone you care about can ruin your whole afternoon', 'You notice potential problems before anyone else does, which is both a gift and a burden'],
      low: ['People have called you "unflappable" or "steady" in a crisis', 'You recover quickly from setbacks and rarely dwell on mistakes', 'You sometimes wonder if you should feel more than you do', 'You are the calm one in the room when everything goes wrong'],
    },
    growthLever: {
      high: 'Your growth edge is emotional regulation, not suppression. You feel deeply and that is a real gift. The practice is not to feel less but to create space between feeling and reacting. Naming your emotions precisely reduces their intensity by up to 50 percent.',
      low: 'Your growth edge is emotional access. Your stability is genuine but may sometimes mask emotions you have learned to bypass. Periodically checking in with yourself by asking "what am I actually feeling right now?" prevents emotional buildup.',
    },
    lifestyleSuggestion: {
      high: 'Build a daily 5-minute grounding practice: box breathing, progressive muscle relaxation, or simply sitting with your hands on your lap and naming what you feel. This does not cure anxiety. It builds the muscle of returning to center.',
      low: 'Set a weekly emotional check-in with yourself. Write down three feelings you noticed this week, even small ones. This builds the awareness that prevents emotional distance from becoming emotional avoidance.',
    },
    tarotArchetype: {
      high: { card: 'The Moon', reason: 'The Moon reflects deep emotional sensitivity, the power of intuition, and the challenge of navigating uncertainty without losing yourself in the darkness.' },
      low: { card: 'The Emperor', reason: 'The Emperor embodies emotional stability and composure, reflecting your ability to remain grounded and the quiet authority that comes from inner calm.' },
    },
  },
};
