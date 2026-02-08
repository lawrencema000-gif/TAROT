import type { QuizDefinition } from '../types';

export const enneagramQuiz: QuizDefinition = {
  id: 'enneagram-v1',
  type: 'enneagram',
  title: 'Enneagram Assessment',
  description: 'The Enneagram maps nine fundamental patterns of thinking, feeling, and behaving. Unlike personality quizzes that describe what you do, the Enneagram reveals why you do it—your core motivation, your deepest fear, and the automatic strategies you developed to navigate the world. You will receive your primary type, your wing, growth and stress paths, and a tarot archetype alignment that adds narrative depth to your pattern.',
  questions: [
    { id: 'en1', text: 'I strive for perfection and have high standards for myself and others.', dimension: 'type1', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en2', text: 'I often put others\' needs before my own and enjoy helping people.', dimension: 'type2', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en3', text: 'Achievement and success are very important to me.', dimension: 'type3', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en4', text: 'I often feel different from others and like something is missing in my life.', dimension: 'type4', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en5', text: 'I prefer to observe and understand before participating.', dimension: 'type5', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en6', text: 'I often anticipate potential problems and prepare for worst-case scenarios.', dimension: 'type6', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en7', text: 'I love variety and keeping my options open for new experiences.', dimension: 'type7', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en8', text: 'I am direct and assertive, and I don\'t back down from confrontation.', dimension: 'type8', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en9', text: 'I value peace and harmony above most things.', dimension: 'type9', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },

    { id: 'en10', text: 'I am very critical of myself when I make mistakes.', dimension: 'type1', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en11', text: 'I feel fulfilled when I can make a positive difference in someone\'s life.', dimension: 'type2', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en12', text: 'I adapt my presentation depending on who I\'m with.', dimension: 'type3', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en13', text: 'I am drawn to melancholy, beauty, and deep emotions.', dimension: 'type4', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en14', text: 'I need a lot of private time and space to think.', dimension: 'type5', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en15', text: 'I often question authority and established systems.', dimension: 'type6', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en16', text: 'I dislike being limited or constrained in any way.', dimension: 'type7', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en17', text: 'I naturally take charge in situations and protect those I care about.', dimension: 'type8', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en18', text: 'I tend to go along with others to avoid conflict.', dimension: 'type9', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },

    { id: 'en19', text: 'I have a strong sense of right and wrong.', dimension: 'type1', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en20', text: 'I sometimes struggle to say no to people.', dimension: 'type2', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en21', text: 'I am highly motivated by recognition and achievement.', dimension: 'type3', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en22', text: 'I often feel misunderstood by others.', dimension: 'type4', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en23', text: 'Knowledge and competence are extremely important to me.', dimension: 'type5', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en24', text: 'I value loyalty and commitment in relationships.', dimension: 'type6', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en25', text: 'I prefer to focus on the positive and avoid painful emotions.', dimension: 'type7', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en26', text: 'I have a strong presence and people often look to me for leadership.', dimension: 'type8', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en27', text: 'I can see multiple perspectives and understand different viewpoints.', dimension: 'type9', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },

    { id: 'en28', text: 'I often feel frustrated when things aren\'t done properly.', dimension: 'type1', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en29', text: 'I pride myself on being attuned to others\' needs and feelings.', dimension: 'type2', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en30', text: 'I work hard to project a successful image.', dimension: 'type3', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en31', text: 'I long for deep, authentic connection and self-expression.', dimension: 'type4', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en32', text: 'I feel drained by too much social interaction.', dimension: 'type5', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en33', text: 'I often worry about what could go wrong.', dimension: 'type6', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en34', text: 'I get bored easily and always seek new stimulation.', dimension: 'type7', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en35', text: 'I value strength and despise weakness or vulnerability.', dimension: 'type8', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en36', text: 'I sometimes struggle to assert my own priorities and preferences.', dimension: 'type9', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },

    { id: 'en37', text: 'I believe there is a right way to do things.', dimension: 'type1', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en38', text: 'I feel hurt when my help is not appreciated.', dimension: 'type2', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en39', text: 'Failure is one of my biggest fears.', dimension: 'type3', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en40', text: 'I am sensitive to criticism and rejection.', dimension: 'type4', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en41', text: 'I prefer to figure things out on my own rather than ask for help.', dimension: 'type5', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en42', text: 'I am skeptical and like to test people\'s trustworthiness.', dimension: 'type6', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en43', text: 'I am optimistic and see endless possibilities in life.', dimension: 'type7', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en44', text: 'I don\'t like feeling controlled or manipulated by others.', dimension: 'type8', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'en45', text: 'I often merge with others\' agendas and forget my own needs.', dimension: 'type9', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
  ],
};

export interface EnneagramResult {
  primaryType: number;
  wing: number | null;
  scores: Record<string, number>;
  tritype: [number, number, number];
}

export function calculateEnneagram(scores: Record<string, number>): EnneagramResult {
  const typeScores: Record<string, number> = {
    type1: 0, type2: 0, type3: 0, type4: 0, type5: 0,
    type6: 0, type7: 0, type8: 0, type9: 0,
  };

  Object.entries(scores).forEach(([key, value]) => {
    const question = enneagramQuiz.questions.find(q => q.id === key);
    if (question?.dimension) {
      typeScores[question.dimension] += value;
    }
  });

  const sorted = Object.entries(typeScores)
    .map(([type, score]) => ({ type: parseInt(type.replace('type', '')), score }))
    .sort((a, b) => b.score - a.score);

  const primaryType = sorted[0].type;

  const wingCandidates = [
    primaryType === 1 ? 9 : primaryType - 1,
    primaryType === 9 ? 1 : primaryType + 1,
  ];

  const wingScores = wingCandidates.map(w => ({
    wing: w,
    score: typeScores[`type${w}`],
  }));

  const wing = wingScores[0].score > wingScores[1].score ? wingScores[0].wing :
               wingScores[1].score > wingScores[0].score ? wingScores[1].wing : null;

  const heartTypes = [2, 3, 4];
  const headTypes = [5, 6, 7];
  const bodyTypes = [8, 9, 1];

  const getTopFromGroup = (group: number[]) =>
    group.reduce((max, type) =>
      typeScores[`type${type}`] > typeScores[`type${max}`] ? type : max, group[0]);

  const tritype: [number, number, number] = [
    getTopFromGroup(bodyTypes.includes(primaryType) ? bodyTypes : heartTypes.includes(primaryType) ? heartTypes : headTypes),
    getTopFromGroup(heartTypes.includes(primaryType) ? heartTypes : bodyTypes.includes(primaryType) ? bodyTypes : headTypes),
    getTopFromGroup(headTypes.includes(primaryType) ? headTypes : heartTypes.includes(primaryType) ? heartTypes : bodyTypes),
  ];

  return {
    primaryType,
    wing,
    scores: Object.fromEntries(
      Object.entries(typeScores).map(([k, v]) => [k.replace('type', ''), Math.round((v / 25) * 100)])
    ),
    tritype,
  };
}

export interface EnneagramTypeInfo {
  number: number;
  name: string;
  title: string;
  coreMotivation: string;
  coreFear: string;
  coreDesire: string;
  description: string;
  healthyTraits: string[];
  averageTraits: string[];
  unhealthyTraits: string[];
  growthPath: { direction: number; description: string };
  stressPath: { direction: number; description: string };
  wings: { wing: number; name: string; description: string }[];
  relationships: string;
  careers: string[];
  famousExamples: string[];
  growthPractices: string[];
  realLifeExamples: string[];
  miniRitual: string;
  journalPrompt: string;
  tarotArchetype: { card: string; reason: string };
}

export const enneagramDescriptions: Record<number, EnneagramTypeInfo> = {
  1: {
    number: 1,
    name: 'The Reformer',
    title: 'The Perfectionist',
    coreMotivation: 'To be good, right, and improve everything',
    coreFear: 'Being corrupt, evil, or defective',
    coreDesire: 'To have integrity and be balanced',
    description: 'Ones are principled, purposeful, self-controlled, and perfectionistic. They have a strong sense of right and wrong and strive to improve themselves and the world around them.',
    healthyTraits: ['Wise', 'Discerning', 'Realistic', 'Noble', 'Morally heroic'],
    averageTraits: ['Orderly', 'Self-righteous', 'Critical', 'Perfectionistic', 'Rigid'],
    unhealthyTraits: ['Judgmental', 'Inflexible', 'Obsessive', 'Punitive', 'Self-destructive'],
    growthPath: { direction: 7, description: 'Move toward spontaneity, joy, and relaxation of the healthy Seven' },
    stressPath: { direction: 4, description: 'Under stress, become moody, irrational, and self-critical like unhealthy Fours' },
    wings: [
      { wing: 9, name: 'The Idealist', description: 'More relaxed, objective, and idealistic' },
      { wing: 2, name: 'The Advocate', description: 'More warm, helpful, and people-oriented' },
    ],
    relationships: 'Ones are loyal, committed partners who work hard on relationships. They may need to learn to accept imperfection in themselves and others.',
    careers: ['Teacher', 'Judge', 'Quality Control', 'Editor', 'Ethical Consultant', 'Nonprofit Leader'],
    famousExamples: ['Mahatma Gandhi', 'Michelle Obama', 'Martha Stewart', 'Al Gore'],
    growthPractices: ['Practice self-compassion', 'Embrace imperfection', 'Allow yourself to play', 'Notice your inner critic'],
    realLifeExamples: ['You notice the crooked picture frame before you notice the painting', 'You have rewritten an email five times because the tone was not exactly right', 'You feel physically tense when things are disorganized or unfair', 'Your inner critic is louder than any external criticism you have ever received'],
    miniRitual: 'Place your hand on your chest and say: "I am allowed to be imperfect today. My worth is not measured by my correctness."',
    journalPrompt: 'Where is my inner critic being loudest right now? What would compassion say to me instead?',
    tarotArchetype: { card: 'Justice', reason: 'Justice reflects your deep commitment to fairness, integrity, and doing what is right. Your challenge is learning that mercy and imperfection are not the enemies of justice—they are its companions.' },
  },
  2: {
    number: 2,
    name: 'The Helper',
    title: 'The Giver',
    coreMotivation: 'To feel loved and needed',
    coreFear: 'Being unwanted or unworthy of love',
    coreDesire: 'To feel loved',
    description: 'Twos are generous, demonstrative, people-pleasing, and possessive. They are genuinely caring but may struggle to acknowledge their own needs.',
    healthyTraits: ['Loving', 'Caring', 'Adaptable', 'Insightful', 'Generous'],
    averageTraits: ['People-pleasing', 'Possessive', 'Intrusive', 'Demonstrative', 'Hovering'],
    unhealthyTraits: ['Manipulative', 'Self-deceptive', 'Entitled', 'Coercive', 'Victim mentality'],
    growthPath: { direction: 4, description: 'Move toward self-awareness, authenticity, and emotional depth of healthy Fours' },
    stressPath: { direction: 8, description: 'Under stress, become aggressive, dominating, and entitled like unhealthy Eights' },
    wings: [
      { wing: 1, name: 'The Servant', description: 'More critical, controlled, and principled' },
      { wing: 3, name: 'The Host/Hostess', description: 'More ambitious, image-conscious, and charming' },
    ],
    relationships: 'Twos are devoted, nurturing partners who may need to learn to receive as well as give, and to express their own needs.',
    careers: ['Nurse', 'Teacher', 'Counselor', 'Social Worker', 'Customer Service', 'Hospitality'],
    famousExamples: ['Mother Teresa', 'Dolly Parton', 'Bishop Desmond Tutu', 'Eleanor Roosevelt'],
    growthPractices: ['Identify your own needs', 'Practice receiving without giving back', 'Set healthy boundaries', 'Ask yourself why you\'re helping'],
    realLifeExamples: ['You know what everyone in the room needs before they ask', 'You have said "I am fine" while actively falling apart because someone else needed you', 'You feel anxious when you have nothing to give or no one to help', 'You remember small details about people that they have forgotten telling you'],
    miniRitual: 'Sit quietly and ask: "What do I need right now?" Do not answer with what someone else needs. Wait for your own answer. Honor it.',
    journalPrompt: 'When was the last time I did something purely for myself without justifying it as being "for someone else"?',
    tarotArchetype: { card: 'The Empress', reason: 'The Empress embodies nurturing abundance and unconditional care. Your challenge is learning to receive the love you so naturally give and to nourish yourself with the same devotion.' },
  },
  3: {
    number: 3,
    name: 'The Achiever',
    title: 'The Performer',
    coreMotivation: 'To feel valuable and worthwhile',
    coreFear: 'Being worthless or without inherent value',
    coreDesire: 'To feel valuable and worthwhile',
    description: 'Threes are adaptable, excelling, driven, and image-conscious. They are highly motivated by success and are excellent at reading what others value.',
    healthyTraits: ['Authentic', 'Self-accepting', 'Charming', 'Accomplished', 'Inspiring'],
    averageTraits: ['Competitive', 'Image-conscious', 'Efficient', 'Driven', 'Pragmatic'],
    unhealthyTraits: ['Deceptive', 'Narcissistic', 'Hostile', 'Exploitative', 'Vindictive'],
    growthPath: { direction: 6, description: 'Move toward commitment, loyalty, and connection of healthy Sixes' },
    stressPath: { direction: 9, description: 'Under stress, become disengaged, apathetic, and numb like unhealthy Nines' },
    wings: [
      { wing: 2, name: 'The Charmer', description: 'More warm, helpful, and people-focused' },
      { wing: 4, name: 'The Professional', description: 'More introspective, artistic, and emotionally aware' },
    ],
    relationships: 'Threes bring energy and ambition to relationships. They may need to learn to be vulnerable and present rather than always achieving.',
    careers: ['Executive', 'Sales', 'Marketing', 'Entrepreneur', 'Politician', 'Actor'],
    famousExamples: ['Oprah Winfrey', 'Tony Robbins', 'Tom Cruise', 'Taylor Swift'],
    growthPractices: ['Connect with your true feelings', 'Practice being rather than doing', 'Value yourself apart from achievements', 'Be authentic, not what others want'],
    realLifeExamples: ['You have achieved something impressive and immediately started planning the next achievement', 'You adjust your personality depending on who you are with to be what they value', 'You struggle to answer "who are you when you are not performing?"', 'You feel genuinely anxious when you are not productive, even on vacation'],
    miniRitual: 'Set a 5-minute timer and do nothing. No phone, no planning, no optimizing. Just exist. Notice the discomfort and sit with it.',
    journalPrompt: 'If no one was watching and no one would ever know, what would I spend my time doing? Is that different from what I do now?',
    tarotArchetype: { card: 'The Magician', reason: 'The Magician transforms intention into reality with skill and focus. Your challenge is learning that you are the magician, not the trick—your value exists before the performance begins.' },
  },
  4: {
    number: 4,
    name: 'The Individualist',
    title: 'The Romantic',
    coreMotivation: 'To find themselves and their significance',
    coreFear: 'Having no identity or personal significance',
    coreDesire: 'To find themselves and their significance',
    description: 'Fours are expressive, dramatic, self-absorbed, and temperamental. They are deeply attuned to beauty and authenticity and seek to create a unique identity.',
    healthyTraits: ['Creative', 'Inspired', 'Self-aware', 'Gentle', 'Transformative'],
    averageTraits: ['Melancholic', 'Self-absorbed', 'Withdrawn', 'Self-indulgent', 'Envious'],
    unhealthyTraits: ['Depressed', 'Self-destructive', 'Alienated', 'Tormented', 'Hopeless'],
    growthPath: { direction: 1, description: 'Move toward discipline, objectivity, and principled action of healthy Ones' },
    stressPath: { direction: 2, description: 'Under stress, become clingy, needy, and people-pleasing like unhealthy Twos' },
    wings: [
      { wing: 3, name: 'The Aristocrat', description: 'More ambitious, image-aware, and socially skilled' },
      { wing: 5, name: 'The Bohemian', description: 'More withdrawn, intellectual, and unconventional' },
    ],
    relationships: 'Fours seek deep, authentic connection. They may need to learn to appreciate what they have rather than longing for what\'s missing.',
    careers: ['Artist', 'Writer', 'Therapist', 'Designer', 'Musician', 'Actor'],
    famousExamples: ['Prince', 'Amy Winehouse', 'Frida Kahlo', 'Johnny Depp'],
    growthPractices: ['Practice gratitude for what you have', 'Take action despite feelings', 'Connect with others\' experiences', 'Balance emotion with reason'],
    realLifeExamples: ['You have felt homesick for a place you have never been', 'You are drawn to sad music even when you are happy because it feels more real', 'You have been told you are "too much" and "not enough" by the same person', 'You would rather feel pain than feel nothing at all'],
    miniRitual: 'Write one true sentence about how you feel right now. Do not make it beautiful. Do not edit it. Let it be raw and real and enough.',
    journalPrompt: 'What am I longing for that I already have but have not recognized? What would it feel like to want what I have?',
    tarotArchetype: { card: 'The Moon', reason: 'The Moon reflects the deep emotional landscape, the beauty of darkness, and the power of feeling what others avoid. Your challenge is learning that ordinary moments contain as much meaning as extraordinary ones.' },
  },
  5: {
    number: 5,
    name: 'The Investigator',
    title: 'The Observer',
    coreMotivation: 'To possess knowledge and understand the environment',
    coreFear: 'Being useless, helpless, or incapable',
    coreDesire: 'To be capable and competent',
    description: 'Fives are perceptive, innovative, secretive, and isolated. They have a need to understand and tend to withdraw to conserve their energy.',
    healthyTraits: ['Visionary', 'Objective', 'Open-minded', 'Perceptive', 'Pioneering'],
    averageTraits: ['Analytical', 'Detached', 'Preoccupied', 'High-strung', 'Provocative'],
    unhealthyTraits: ['Isolated', 'Nihilistic', 'Eccentric', 'Phobic', 'Delusional'],
    growthPath: { direction: 8, description: 'Move toward confidence, assertiveness, and engagement of healthy Eights' },
    stressPath: { direction: 7, description: 'Under stress, become scattered, hyperactive, and escapist like unhealthy Sevens' },
    wings: [
      { wing: 4, name: 'The Iconoclast', description: 'More creative, sensitive, and emotionally aware' },
      { wing: 6, name: 'The Problem Solver', description: 'More loyal, anxious, and focused on security' },
    ],
    relationships: 'Fives offer depth and insight in relationships. They may need to learn to share more of themselves and engage emotionally.',
    careers: ['Researcher', 'Scientist', 'Engineer', 'Professor', 'Analyst', 'Writer'],
    famousExamples: ['Albert Einstein', 'Bill Gates', 'Stephen Hawking', 'Tim Burton'],
    growthPractices: ['Share knowledge with others', 'Take action before feeling ready', 'Connect with your body', 'Express emotions to trusted people'],
    realLifeExamples: ['You have chosen to study a topic instead of attending a social event, and felt relieved', 'You mentally calculate how much energy a situation will cost before entering it', 'You know more about a subject than most experts but would never call yourself an expert', 'You feel drained by small talk but can discuss a topic you love for hours'],
    miniRitual: 'Share one thing you learned today with another person. Not to teach. Just to connect through something you care about.',
    journalPrompt: 'What am I preparing for that I am already ready for? What would it look like to act before I feel fully prepared?',
    tarotArchetype: { card: 'The Hermit', reason: 'The Hermit carries a lantern of knowledge into the darkness, seeking truth through solitude and contemplation. Your challenge is learning that sharing your light does not diminish it.' },
  },
  6: {
    number: 6,
    name: 'The Loyalist',
    title: 'The Skeptic',
    coreMotivation: 'To have security and support',
    coreFear: 'Being without support and guidance',
    coreDesire: 'To have security and support',
    description: 'Sixes are engaging, responsible, anxious, and suspicious. They are excellent at troubleshooting but can become paralyzed by doubt.',
    healthyTraits: ['Courageous', 'Loyal', 'Reliable', 'Hardworking', 'Self-confident'],
    averageTraits: ['Anxious', 'Suspicious', 'Ambivalent', 'Defensive', 'Evasive'],
    unhealthyTraits: ['Paranoid', 'Self-defeating', 'Overreacting', 'Panicky', 'Punitive'],
    growthPath: { direction: 9, description: 'Move toward acceptance, peace, and inner stability of healthy Nines' },
    stressPath: { direction: 3, description: 'Under stress, become competitive, arrogant, and image-focused like unhealthy Threes' },
    wings: [
      { wing: 5, name: 'The Defender', description: 'More introverted, intellectual, and independent' },
      { wing: 7, name: 'The Buddy', description: 'More outgoing, playful, and optimistic' },
    ],
    relationships: 'Sixes are loyal, committed partners who value trust. They may need to learn to trust themselves and not project fears onto partners.',
    careers: ['Security Analyst', 'Lawyer', 'Administrator', 'Teacher', 'Detective', 'Risk Manager'],
    famousExamples: ['Mark Twain', 'Princess Diana', 'Bruce Springsteen', 'Ellen DeGeneres'],
    growthPractices: ['Trust your own judgment', 'Take action despite fear', 'Challenge worst-case thinking', 'Build internal authority'],
    realLifeExamples: ['You have a backup plan for your backup plan', 'You can spot what could go wrong in any situation within 30 seconds', 'You test people\'s loyalty before trusting them, sometimes without realizing it', 'You oscillate between questioning authority and desperately wanting someone trustworthy to follow'],
    miniRitual: 'Name one thing you are afraid of right now. Then name one thing you would do if you were not afraid. Take one small step toward the second thing.',
    journalPrompt: 'What would I do today if I trusted myself completely? What is one decision I have been outsourcing to others that I could make on my own?',
    tarotArchetype: { card: 'The Chariot', reason: 'The Chariot moves forward through opposing forces with willpower and determination. Your challenge is learning that courage is not the absence of fear but the decision to act despite it.' },
  },
  7: {
    number: 7,
    name: 'The Enthusiast',
    title: 'The Epicure',
    coreMotivation: 'To be satisfied and content',
    coreFear: 'Being trapped in pain or deprivation',
    coreDesire: 'To be happy and free',
    description: 'Sevens are spontaneous, versatile, acquisitive, and scattered. They are optimistic and seek variety but may avoid pain and limitation.',
    healthyTraits: ['Joyful', 'Accomplished', 'Grateful', 'Present', 'Satisfied'],
    averageTraits: ['Hyperactive', 'Uninhibited', 'Excessive', 'Distracted', 'Restless'],
    unhealthyTraits: ['Escapist', 'Infantile', 'Impulsive', 'Erratic', 'Manic'],
    growthPath: { direction: 5, description: 'Move toward depth, focus, and contemplation of healthy Fives' },
    stressPath: { direction: 1, description: 'Under stress, become critical, perfectionistic, and rigid like unhealthy Ones' },
    wings: [
      { wing: 6, name: 'The Entertainer', description: 'More responsible, loyal, and anxious' },
      { wing: 8, name: 'The Realist', description: 'More assertive, materialistic, and competitive' },
    ],
    relationships: 'Sevens bring fun and adventure to relationships. They may need to learn to stay present during difficult times and process pain.',
    careers: ['Entrepreneur', 'Travel Writer', 'Event Planner', 'Marketing', 'Comedian', 'Chef'],
    famousExamples: ['Robin Williams', 'Jim Carrey', 'Richard Branson', 'Elton John'],
    growthPractices: ['Sit with uncomfortable feelings', 'Finish what you start', 'Practice gratitude for what you have', 'Develop depth over breadth'],
    realLifeExamples: ['You have started planning your next vacation while still on the current one', 'You reframe every negative experience as a "learning opportunity" sometimes before you have actually felt the pain', 'You have more tabs open in your brain than most people have on their browser', 'You are the person who keeps the energy up in any room but sometimes wonder who you are when the room is empty'],
    miniRitual: 'Sit with one uncomfortable feeling for 60 seconds without reframing, distracting, or planning. Just feel it. Notice that it does not destroy you.',
    journalPrompt: 'What am I running toward right now, and what am I running from? Are they the same thing?',
    tarotArchetype: { card: 'The Fool', reason: 'The Fool leaps into the unknown with joy and trust, embodying your love of possibility and adventure. Your challenge is learning that depth is not the opposite of joy—it is where the real joy lives.' },
  },
  8: {
    number: 8,
    name: 'The Challenger',
    title: 'The Boss',
    coreMotivation: 'To be self-reliant and in control',
    coreFear: 'Being harmed or controlled by others',
    coreDesire: 'To protect themselves and be in control',
    description: 'Eights are self-confident, decisive, willful, and confrontational. They are natural leaders who protect others but may struggle with vulnerability.',
    healthyTraits: ['Magnanimous', 'Heroic', 'Self-mastering', 'Decisive', 'Inspiring'],
    averageTraits: ['Dominating', 'Willful', 'Confrontational', 'Aggressive', 'Ruthless'],
    unhealthyTraits: ['Dictatorial', 'Destructive', 'Antisocial', 'Vengeful', 'Violent'],
    growthPath: { direction: 2, description: 'Move toward compassion, vulnerability, and care of healthy Twos' },
    stressPath: { direction: 5, description: 'Under stress, become withdrawn, secretive, and fearful like unhealthy Fives' },
    wings: [
      { wing: 7, name: 'The Maverick', description: 'More energetic, entertaining, and entrepreneurial' },
      { wing: 9, name: 'The Bear', description: 'More patient, receptive, and diplomatic' },
    ],
    relationships: 'Eights are protective, passionate partners. They may need to learn to be vulnerable and let others have power too.',
    careers: ['CEO', 'Entrepreneur', 'Trial Lawyer', 'Military Leader', 'Politician', 'Coach'],
    famousExamples: ['Martin Luther King Jr.', 'Serena Williams', 'Winston Churchill', 'Pink'],
    growthPractices: ['Practice vulnerability', 'Let others lead sometimes', 'Notice and soften your impact', 'Connect with tender emotions'],
    realLifeExamples: ['You have been called "intimidating" by people who later said they felt safe with you', 'You can sense weakness or dishonesty in a room within minutes', 'You protect people fiercely and then dismiss your own vulnerability as unimportant', 'You would rather be disliked for being real than liked for being fake'],
    miniRitual: 'Tell one person something you need help with today. Not because you cannot handle it alone. Because letting someone in is the bravest thing a protector can do.',
    journalPrompt: 'What am I protecting myself from by staying strong? What would happen if I let someone see the part of me I keep hidden?',
    tarotArchetype: { card: 'Strength', reason: 'Strength shows a figure gently taming a lion with compassion rather than force. Your challenge is learning that true power is not domination—it is the courage to be vulnerable.' },
  },
  9: {
    number: 9,
    name: 'The Peacemaker',
    title: 'The Mediator',
    coreMotivation: 'To have inner peace and harmony',
    coreFear: 'Loss and separation',
    coreDesire: 'To have inner stability and peace of mind',
    description: 'Nines are receptive, reassuring, complacent, and resigned. They seek harmony and merge with others but may lose touch with their own desires.',
    healthyTraits: ['Indomitable', 'Autonomous', 'Present', 'Embracing', 'Peaceful'],
    averageTraits: ['Disengaged', 'Appeasing', 'Passive', 'Complacent', 'Resigned'],
    unhealthyTraits: ['Dissociated', 'Neglectful', 'Stubborn', 'Depressed', 'Helpless'],
    growthPath: { direction: 3, description: 'Move toward energy, self-development, and achievement of healthy Threes' },
    stressPath: { direction: 6, description: 'Under stress, become anxious, reactive, and worried like unhealthy Sixes' },
    wings: [
      { wing: 8, name: 'The Referee', description: 'More assertive, grounded, and body-based' },
      { wing: 1, name: 'The Dreamer', description: 'More orderly, principled, and idealistic' },
    ],
    relationships: 'Nines are accepting, supportive partners who create harmony. They may need to learn to assert their own needs and stay present.',
    careers: ['Counselor', 'Diplomat', 'Human Resources', 'Mediator', 'Librarian', 'Editor'],
    famousExamples: ['Abraham Lincoln', 'Keanu Reeves', 'Queen Elizabeth II', 'Mr. Rogers'],
    growthPractices: ['Identify and express your own desires', 'Take action on your own behalf', 'Stay awake to conflict rather than numbing', 'Set and maintain priorities'],
    realLifeExamples: ['You have said "I do not mind, whatever you want" so many times you forgot what you actually want', 'You avoid conflict by going numb rather than by resolving it', 'People describe you as "easy-going" but do not realize how much you are holding back', 'You have merged so completely with someone else\'s preferences that you lost track of your own'],
    miniRitual: 'Name one thing you want today. Not what would be nice. Not what would make someone else happy. What you actually want. Then do it.',
    journalPrompt: 'What opinion, preference, or desire have I been suppressing to keep the peace? What would happen if I voiced it?',
    tarotArchetype: { card: 'Temperance', reason: 'Temperance represents balance, moderation, and the integration of opposing forces. Your challenge is learning that true peace is not the absence of conflict—it is the presence of your full, honest self.' },
  },
};
