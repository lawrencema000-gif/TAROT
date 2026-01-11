import type { QuizDefinition } from '../types';

export const attachmentQuiz: QuizDefinition = {
  id: 'attachment-v1',
  type: 'big-five',
  title: 'Attachment Style Assessment',
  description: 'Understand your attachment style and how it influences your relationships and connections with others.',
  questions: [
    { id: 'at1', text: 'I find it easy to get close to others.', dimension: 'avoidance', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'at2', text: 'I worry that romantic partners won\'t care about me as much as I care about them.', dimension: 'anxiety', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'at3', text: 'I prefer not to be too close to romantic partners.', dimension: 'avoidance', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'at4', text: 'I worry a lot about my relationships.', dimension: 'anxiety', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'at5', text: 'I feel comfortable depending on romantic partners.', dimension: 'avoidance', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'at6', text: 'I often wish that my partner\'s feelings for me were as strong as my feelings for them.', dimension: 'anxiety', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'at7', text: 'I am nervous when partners get too close to me.', dimension: 'avoidance', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'at8', text: 'I worry about being abandoned.', dimension: 'anxiety', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },

    { id: 'at9', text: 'I am comfortable having others depend on me.', dimension: 'avoidance', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'at10', text: 'I often want to get closer than my partner wants to be.', dimension: 'anxiety', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'at11', text: 'I find it difficult to trust others completely.', dimension: 'avoidance', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'at12', text: 'I need a lot of reassurance that I am loved.', dimension: 'anxiety', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'at13', text: 'I find it difficult to allow myself to depend on others.', dimension: 'avoidance', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'at14', text: 'I sometimes feel that I force others to show more feeling and commitment.', dimension: 'anxiety', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'at15', text: 'I\'m uncomfortable being close to others.', dimension: 'avoidance', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'at16', text: 'My desire to be very close sometimes scares people away.', dimension: 'anxiety', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },

    { id: 'at17', text: 'I am comfortable sharing my thoughts and feelings with others.', dimension: 'avoidance', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'at18', text: 'I get frustrated when my partner is not available when I need them.', dimension: 'anxiety', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'at19', text: 'I prefer not to show others how I feel deep down.', dimension: 'avoidance', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'at20', text: 'I worry that I will be hurt if I allow myself to become too close.', dimension: 'anxiety', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'at21', text: 'I value my independence more than my relationships.', dimension: 'avoidance', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'at22', text: 'I feel like I care more about others than they care about me.', dimension: 'anxiety', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'at23', text: 'I feel uncomfortable when someone wants to get emotionally close.', dimension: 'avoidance', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'at24', text: 'I often wonder whether my partner truly loves me.', dimension: 'anxiety', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },

    { id: 'at25', text: 'I turn to my partner for many things, including comfort and reassurance.', dimension: 'avoidance', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'at26', text: 'When I\'m not in a relationship, I feel somewhat anxious and incomplete.', dimension: 'anxiety', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'at27', text: 'I feel comfortable asking others for help.', dimension: 'avoidance', options: [{ value: 5, label: 'Strongly Disagree' }, { value: 4, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 2, label: 'Agree' }, { value: 1, label: 'Strongly Agree' }] },
    { id: 'at28', text: 'I get jealous easily.', dimension: 'anxiety', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'at29', text: 'I am self-sufficient and don\'t need others to feel happy.', dimension: 'avoidance', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
    { id: 'at30', text: 'I feel anxious when my partner spends time away from me.', dimension: 'anxiety', options: [{ value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' }, { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' }, { value: 5, label: 'Strongly Agree' }] },
  ],
};

export type AttachmentStyle = 'secure' | 'anxious' | 'avoidant' | 'fearful-avoidant';

export interface AttachmentResult {
  style: AttachmentStyle;
  anxiety: number;
  avoidance: number;
  percentages: {
    secure: number;
    anxious: number;
    avoidant: number;
    fearfulAvoidant: number;
  };
}

export function calculateAttachment(scores: Record<string, number>): AttachmentResult {
  let anxietyTotal = 0;
  let avoidanceTotal = 0;
  let anxietyCount = 0;
  let avoidanceCount = 0;

  Object.entries(scores).forEach(([key, value]) => {
    const question = attachmentQuiz.questions.find(q => q.id === key);
    if (question?.dimension === 'anxiety') {
      anxietyTotal += value;
      anxietyCount++;
    } else if (question?.dimension === 'avoidance') {
      avoidanceTotal += value;
      avoidanceCount++;
    }
  });

  const anxiety = anxietyCount > 0 ? Math.round((anxietyTotal / (anxietyCount * 5)) * 100) : 50;
  const avoidance = avoidanceCount > 0 ? Math.round((avoidanceTotal / (avoidanceCount * 5)) * 100) : 50;

  const anxietyThreshold = 50;
  const avoidanceThreshold = 50;

  let style: AttachmentStyle;
  if (anxiety < anxietyThreshold && avoidance < avoidanceThreshold) {
    style = 'secure';
  } else if (anxiety >= anxietyThreshold && avoidance < avoidanceThreshold) {
    style = 'anxious';
  } else if (anxiety < anxietyThreshold && avoidance >= avoidanceThreshold) {
    style = 'avoidant';
  } else {
    style = 'fearful-avoidant';
  }

  const secureScore = Math.max(0, 100 - (anxiety + avoidance) / 2);
  const anxiousScore = anxiety * (1 - avoidance / 200);
  const avoidantScore = avoidance * (1 - anxiety / 200);
  const fearfulScore = (anxiety + avoidance) / 2;

  const total = secureScore + anxiousScore + avoidantScore + fearfulScore;

  return {
    style,
    anxiety,
    avoidance,
    percentages: {
      secure: Math.round((secureScore / total) * 100),
      anxious: Math.round((anxiousScore / total) * 100),
      avoidant: Math.round((avoidantScore / total) * 100),
      fearfulAvoidant: Math.round((fearfulScore / total) * 100),
    },
  };
}

export interface AttachmentStyleInfo {
  name: string;
  subtitle: string;
  description: string;
  characteristics: string[];
  inRelationships: string[];
  triggers: string[];
  healingPractices: string[];
  partnerTips: string[];
  journalPrompts: string[];
}

export const attachmentDescriptions: Record<AttachmentStyle, AttachmentStyleInfo> = {
  secure: {
    name: 'Secure Attachment',
    subtitle: 'Comfortable with Intimacy & Independence',
    description: 'You have a healthy balance of intimacy and independence. You feel comfortable with emotional closeness and can depend on others while also being self-sufficient. You communicate your needs effectively and handle conflict constructively.',
    characteristics: [
      'Comfortable with intimacy and closeness',
      'Able to depend on others and have others depend on you',
      'Communicate needs and feelings clearly',
      'Handle conflict in a constructive manner',
      'Resilient in the face of relationship challenges',
      'Have positive views of self and others',
    ],
    inRelationships: [
      'Create stable, supportive partnerships',
      'Balance togetherness with healthy independence',
      'Respond sensitively to partner\'s needs',
      'Trust your partner and the relationship',
      'Work through conflicts without excessive anxiety',
      'Maintain connection during disagreements',
    ],
    triggers: [
      'Generally resilient to relationship stressors',
      'May feel unsettled by unpredictable partner behavior',
      'Can be affected by partners with insecure attachment',
    ],
    healingPractices: [
      'Continue practicing open communication',
      'Support partners in developing security',
      'Model healthy relationship behaviors',
      'Maintain self-care and personal growth',
    ],
    partnerTips: [
      'Appreciate their emotional availability',
      'Match their level of communication',
      'Don\'t mistake their calmness for not caring',
      'Learn from their conflict resolution skills',
    ],
    journalPrompts: [
      'What aspects of my relationships am I most grateful for?',
      'How can I continue to grow and support my partner\'s growth?',
      'What healthy relationship patterns have I developed?',
    ],
  },
  anxious: {
    name: 'Anxious Attachment',
    subtitle: 'Preoccupied with Relationships',
    description: 'You crave intimacy and closeness but often worry about your relationships. You may need more reassurance than others and can become preoccupied with your partner\'s feelings and commitment. Your strong desire for connection is a gift when channeled healthily.',
    characteristics: [
      'Strong desire for closeness and intimacy',
      'Worry about partner\'s feelings and commitment',
      'Highly attuned to relationship cues',
      'May need frequent reassurance',
      'Sensitive to changes in partner\'s mood or behavior',
      'Fear of abandonment or rejection',
    ],
    inRelationships: [
      'Deeply invested in your relationships',
      'May become preoccupied with partner\'s responses',
      'Sensitive to perceived distance or withdrawal',
      'Tend to prioritize relationship over other areas',
      'May struggle with jealousy or possessiveness',
      'Seek constant connection and reassurance',
    ],
    triggers: [
      'Partner being unavailable or distant',
      'Slow responses to messages',
      'Partners needing alone time',
      'Uncertainty about partner\'s feelings',
      'Conflict or disagreements',
    ],
    healingPractices: [
      'Develop self-soothing techniques',
      'Build a strong sense of self outside relationships',
      'Practice tolerating uncertainty',
      'Challenge anxious thoughts with evidence',
      'Communicate needs without blame',
      'Cultivate friendships and personal interests',
    ],
    partnerTips: [
      'Provide consistent reassurance',
      'Communicate clearly about your feelings',
      'Be reliable and follow through on commitments',
      'Don\'t dismiss their need for closeness',
      'Create predictable patterns of connection',
    ],
    journalPrompts: [
      'What triggers my anxiety in relationships? What do I really need in those moments?',
      'How can I soothe myself when I feel insecure?',
      'What evidence shows that I am loved and valued?',
      'How can I build my sense of self outside of relationships?',
    ],
  },
  avoidant: {
    name: 'Avoidant Attachment',
    subtitle: 'Dismissive of Intimacy',
    description: 'You value independence and self-sufficiency highly. While you may desire connection, you often feel uncomfortable with too much closeness. You may distance yourself when relationships get intense and prefer to handle things on your own.',
    characteristics: [
      'Strong need for independence and self-reliance',
      'Discomfort with emotional closeness',
      'May seem emotionally distant or unavailable',
      'Difficulty depending on others',
      'Suppress or minimize emotional needs',
      'Value personal space and autonomy highly',
    ],
    inRelationships: [
      'May keep partners at arm\'s length emotionally',
      'Uncomfortable with partner\'s need for closeness',
      'Tend to withdraw during conflict or intense emotions',
      'May idealize past relationships or keep options open',
      'Struggle to express feelings and needs',
      'May seem self-sufficient to a fault',
    ],
    triggers: [
      'Partners wanting too much closeness',
      'Feeling pressured to commit or share feelings',
      'High emotional demands from partner',
      'Loss of personal space or independence',
      'Intense emotional discussions',
    ],
    healingPractices: [
      'Practice identifying and naming emotions',
      'Take small steps toward vulnerability',
      'Challenge the belief that you don\'t need others',
      'Recognize the value of interdependence',
      'Stay present during emotional conversations',
      'Notice when you\'re withdrawing and pause',
    ],
    partnerTips: [
      'Give them space without taking it personally',
      'Don\'t chase or pressure for closeness',
      'Appreciate their need for independence',
      'Be patient with emotional expression',
      'Make emotional discussions feel safe',
    ],
    journalPrompts: [
      'What do I fear about getting close to someone?',
      'When did I learn that independence was safer than connection?',
      'What would it feel like to let someone truly know me?',
      'How might vulnerability actually strengthen my relationships?',
    ],
  },
  'fearful-avoidant': {
    name: 'Fearful-Avoidant Attachment',
    subtitle: 'Disorganized Pattern',
    description: 'You experience a push-pull dynamic in relationships, wanting closeness but also fearing it. You may oscillate between anxiety and avoidance, sometimes seeking connection and other times pushing it away. This pattern often stems from past experiences of hurt.',
    characteristics: [
      'Simultaneous desire for and fear of intimacy',
      'Unpredictable responses to closeness',
      'May swing between anxious and avoidant behaviors',
      'Difficulty trusting others despite wanting connection',
      'May have experienced relationship trauma',
      'Conflicted feelings about relationships',
    ],
    inRelationships: [
      'May send mixed signals to partners',
      'Struggle with consistent emotional availability',
      'Fear both abandonment and engulfment',
      'May sabotage relationships when they get too close',
      'Difficulty with emotional regulation in conflicts',
      'Can feel overwhelmed by relationship intensity',
    ],
    triggers: [
      'Getting too close (activates avoidance)',
      'Partner pulling away (activates anxiety)',
      'Past relationship patterns repeating',
      'Feeling vulnerable or out of control',
      'Reminders of past relationship pain',
    ],
    healingPractices: [
      'Work with a therapist on attachment patterns',
      'Practice grounding techniques for emotional regulation',
      'Build awareness of your push-pull patterns',
      'Develop a consistent self-care routine',
      'Learn to recognize when past wounds are being triggered',
      'Take relationships slowly and intentionally',
    ],
    partnerTips: [
      'Be patient and consistent in your responses',
      'Don\'t take their mixed signals personally',
      'Create a safe, predictable environment',
      'Encourage professional support if appropriate',
      'Maintain your own boundaries while being supportive',
    ],
    journalPrompts: [
      'What are my mixed feelings about relationships? Where do they come from?',
      'When do I want to get closer, and when do I want to pull away?',
      'What would a safe, healthy relationship look like for me?',
      'How can I be more consistent in showing up for myself and others?',
    ],
  },
};

export interface AttachmentCompatibility {
  pairing: string;
  dynamic: string;
  strengths: string[];
  challenges: string[];
  tips: string[];
}

export const attachmentCompatibilityMatrix: Record<string, AttachmentCompatibility> = {
  'secure-secure': {
    pairing: 'Secure + Secure',
    dynamic: 'The Gold Standard',
    strengths: ['Natural emotional attunement', 'Healthy conflict resolution', 'Stable and supportive'],
    challenges: ['May lack exciting drama', 'Can become complacent'],
    tips: ['Continue growing together', 'Don\'t take the relationship for granted'],
  },
  'secure-anxious': {
    pairing: 'Secure + Anxious',
    dynamic: 'Healing Partnership',
    strengths: ['Secure partner can provide stability', 'Anxious partner brings passion'],
    challenges: ['Secure partner may feel overwhelmed', 'Anxious partner may not fully trust security'],
    tips: ['Be patient with the healing process', 'Maintain consistent reassurance'],
  },
  'secure-avoidant': {
    pairing: 'Secure + Avoidant',
    dynamic: 'Patient Connection',
    strengths: ['Secure partner won\'t chase or withdraw', 'Avoidant can feel safe to open up'],
    challenges: ['May feel like different emotional languages', 'Progress can be slow'],
    tips: ['Appreciate small steps toward vulnerability', 'Maintain independence while staying connected'],
  },
  'anxious-avoidant': {
    pairing: 'Anxious + Avoidant',
    dynamic: 'The Anxious-Avoidant Trap',
    strengths: ['Intense chemistry and attraction', 'Opportunities for deep growth'],
    challenges: ['Creates painful push-pull dynamic', 'Each triggers the other\'s worst fears'],
    tips: ['Recognize the pattern consciously', 'Both must work on moving toward secure', 'Consider couples therapy'],
  },
  'anxious-anxious': {
    pairing: 'Anxious + Anxious',
    dynamic: 'Intense Connection',
    strengths: ['Deep emotional understanding', 'High investment in relationship'],
    challenges: ['Can amplify each other\'s anxiety', 'May lack stability'],
    tips: ['Build security outside the relationship', 'Practice self-soothing together'],
  },
  'avoidant-avoidant': {
    pairing: 'Avoidant + Avoidant',
    dynamic: 'Parallel Lives',
    strengths: ['Respect for independence', 'Low drama'],
    challenges: ['May lack emotional depth', 'Can drift apart'],
    tips: ['Schedule intentional connection time', 'Practice small acts of vulnerability'],
  },
};
