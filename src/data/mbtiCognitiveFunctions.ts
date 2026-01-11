export type CognitiveFunction = 'Ni' | 'Ne' | 'Si' | 'Se' | 'Ti' | 'Te' | 'Fi' | 'Fe';

export interface CognitiveFunctionInfo {
  name: string;
  fullName: string;
  description: string;
  strengths: string[];
  challenges: string[];
}

export const cognitiveFunctions: Record<CognitiveFunction, CognitiveFunctionInfo> = {
  Ni: {
    name: 'Ni',
    fullName: 'Introverted Intuition',
    description: 'Synthesizes patterns and insights into a singular vision of how things will unfold. Focuses on future implications and underlying meanings.',
    strengths: ['Long-term vision', 'Pattern recognition', 'Strategic thinking', 'Seeing the big picture'],
    challenges: ['May ignore present realities', 'Can seem detached', 'Difficulty explaining insights'],
  },
  Ne: {
    name: 'Ne',
    fullName: 'Extraverted Intuition',
    description: 'Explores possibilities, connections, and potential in the external world. Generates ideas and sees multiple paths forward.',
    strengths: ['Brainstorming', 'Seeing possibilities', 'Making connections', 'Innovation'],
    challenges: ['May struggle to commit', 'Can be scattered', 'Difficulty finishing projects'],
  },
  Si: {
    name: 'Si',
    fullName: 'Introverted Sensing',
    description: 'Stores detailed memories and compares present experiences to past ones. Values tradition, stability, and proven methods.',
    strengths: ['Attention to detail', 'Reliability', 'Learning from experience', 'Consistency'],
    challenges: ['May resist change', 'Can be overly cautious', 'Stuck in past patterns'],
  },
  Se: {
    name: 'Se',
    fullName: 'Extraverted Sensing',
    description: 'Engages fully with the present moment and physical environment. Notices sensory details and responds quickly to opportunities.',
    strengths: ['Present awareness', 'Quick reactions', 'Practical skills', 'Enjoying experiences'],
    challenges: ['May seek thrills', 'Can be impulsive', 'Difficulty with long-term planning'],
  },
  Ti: {
    name: 'Ti',
    fullName: 'Introverted Thinking',
    description: 'Builds internal logical frameworks and analyzes how things work. Seeks precision and consistency in understanding.',
    strengths: ['Logical analysis', 'Problem-solving', 'Independent thinking', 'Precision'],
    challenges: ['May seem cold', 'Can overanalyze', 'Difficulty with emotional situations'],
  },
  Te: {
    name: 'Te',
    fullName: 'Extraverted Thinking',
    description: 'Organizes the external world efficiently and makes objective decisions. Focuses on results, systems, and measurable outcomes.',
    strengths: ['Organization', 'Efficiency', 'Goal achievement', 'Decision-making'],
    challenges: ['May dismiss feelings', 'Can be controlling', 'Impatient with inefficiency'],
  },
  Fi: {
    name: 'Fi',
    fullName: 'Introverted Feeling',
    description: 'Develops deep personal values and makes decisions based on inner moral compass. Seeks authenticity and meaningful connections.',
    strengths: ['Strong values', 'Empathy', 'Authenticity', 'Depth of feeling'],
    challenges: ['May seem private', 'Can be stubborn about values', 'Difficulty expressing feelings'],
  },
  Fe: {
    name: 'Fe',
    fullName: 'Extraverted Feeling',
    description: 'Reads and responds to the emotional needs of others. Creates harmony and connection in groups and relationships.',
    strengths: ['Social harmony', 'Reading people', 'Building consensus', 'Expressing care'],
    challenges: ['May people-please', 'Can absorb others\' emotions', 'Difficulty with criticism'],
  },
};

export interface CognitiveFunctionStack {
  dominant: CognitiveFunction;
  auxiliary: CognitiveFunction;
  tertiary: CognitiveFunction;
  inferior: CognitiveFunction;
  shadow: [CognitiveFunction, CognitiveFunction, CognitiveFunction, CognitiveFunction];
}

export const mbtiCognitiveStacks: Record<string, CognitiveFunctionStack> = {
  INTJ: { dominant: 'Ni', auxiliary: 'Te', tertiary: 'Fi', inferior: 'Se', shadow: ['Ne', 'Ti', 'Fe', 'Si'] },
  INTP: { dominant: 'Ti', auxiliary: 'Ne', tertiary: 'Si', inferior: 'Fe', shadow: ['Te', 'Ni', 'Se', 'Fi'] },
  ENTJ: { dominant: 'Te', auxiliary: 'Ni', tertiary: 'Se', inferior: 'Fi', shadow: ['Ti', 'Ne', 'Si', 'Fe'] },
  ENTP: { dominant: 'Ne', auxiliary: 'Ti', tertiary: 'Fe', inferior: 'Si', shadow: ['Ni', 'Te', 'Fi', 'Se'] },
  INFJ: { dominant: 'Ni', auxiliary: 'Fe', tertiary: 'Ti', inferior: 'Se', shadow: ['Ne', 'Fi', 'Te', 'Si'] },
  INFP: { dominant: 'Fi', auxiliary: 'Ne', tertiary: 'Si', inferior: 'Te', shadow: ['Fe', 'Ni', 'Se', 'Ti'] },
  ENFJ: { dominant: 'Fe', auxiliary: 'Ni', tertiary: 'Se', inferior: 'Ti', shadow: ['Fi', 'Ne', 'Si', 'Te'] },
  ENFP: { dominant: 'Ne', auxiliary: 'Fi', tertiary: 'Te', inferior: 'Si', shadow: ['Ni', 'Fe', 'Ti', 'Se'] },
  ISTJ: { dominant: 'Si', auxiliary: 'Te', tertiary: 'Fi', inferior: 'Ne', shadow: ['Se', 'Ti', 'Fe', 'Ni'] },
  ISFJ: { dominant: 'Si', auxiliary: 'Fe', tertiary: 'Ti', inferior: 'Ne', shadow: ['Se', 'Fi', 'Te', 'Ni'] },
  ESTJ: { dominant: 'Te', auxiliary: 'Si', tertiary: 'Ne', inferior: 'Fi', shadow: ['Ti', 'Se', 'Ni', 'Fe'] },
  ESFJ: { dominant: 'Fe', auxiliary: 'Si', tertiary: 'Ne', inferior: 'Ti', shadow: ['Fi', 'Se', 'Ni', 'Te'] },
  ISTP: { dominant: 'Ti', auxiliary: 'Se', tertiary: 'Ni', inferior: 'Fe', shadow: ['Te', 'Si', 'Ne', 'Fi'] },
  ISFP: { dominant: 'Fi', auxiliary: 'Se', tertiary: 'Ni', inferior: 'Te', shadow: ['Fe', 'Si', 'Ne', 'Ti'] },
  ESTP: { dominant: 'Se', auxiliary: 'Ti', tertiary: 'Fe', inferior: 'Ni', shadow: ['Si', 'Te', 'Fi', 'Ne'] },
  ESFP: { dominant: 'Se', auxiliary: 'Fi', tertiary: 'Te', inferior: 'Ni', shadow: ['Si', 'Fe', 'Ti', 'Ne'] },
};

export interface MBTIExtendedInfo {
  famousExamples: string[];
  careers: string[];
  communicationStyle: string;
  learningStyle: string;
  stressResponse: string;
  idealEnvironment: string;
  coreMotivations: string[];
  coreFears: string[];
}

export const mbtiExtendedDescriptions: Record<string, MBTIExtendedInfo> = {
  INTJ: {
    famousExamples: ['Elon Musk', 'Michelle Obama', 'Christopher Nolan', 'Isaac Newton'],
    careers: ['Scientist', 'Strategic Planner', 'Software Architect', 'Investment Analyst', 'Professor'],
    communicationStyle: 'Direct and precise. Prefers written communication with clear agendas. Values efficiency over small talk.',
    learningStyle: 'Conceptual learner who needs to understand the big picture first. Prefers self-directed study and theoretical frameworks.',
    stressResponse: 'Under stress, may become obsessive about details, indulge in sensory pleasures, or become uncharacteristically emotional.',
    idealEnvironment: 'Autonomous work with intellectual challenges. Minimal interruptions and bureaucracy. Competent colleagues who value efficiency.',
    coreMotivations: ['Achieving mastery', 'Implementing visions', 'Understanding complex systems', 'Making an impact'],
    coreFears: ['Being controlled', 'Appearing incompetent', 'Wasting potential', 'Chaos and inefficiency'],
  },
  INTP: {
    famousExamples: ['Albert Einstein', 'Bill Gates', 'Marie Curie', 'Abraham Lincoln'],
    careers: ['Research Scientist', 'Software Developer', 'Philosopher', 'Data Analyst', 'Technical Writer'],
    communicationStyle: 'Precise and analytical. May need time to formulate thoughts. Values intellectual accuracy over social niceties.',
    learningStyle: 'Independent learner who questions everything. Needs to understand underlying principles and logic.',
    stressResponse: 'Under stress, may become emotionally overwhelmed, hypersensitive to criticism, or obsess over small details.',
    idealEnvironment: 'Freedom to explore ideas without deadlines. Access to information and intellectual discourse. Minimal emotional demands.',
    coreMotivations: ['Understanding truth', 'Solving complex problems', 'Intellectual freedom', 'Creating elegant solutions'],
    coreFears: ['Being wrong', 'Intellectual stagnation', 'Emotional overwhelm', 'Forced conformity'],
  },
  ENTJ: {
    famousExamples: ['Steve Jobs', 'Margaret Thatcher', 'Napoleon Bonaparte', 'Adele'],
    careers: ['CEO', 'Entrepreneur', 'Attorney', 'Management Consultant', 'Political Leader'],
    communicationStyle: 'Direct and commanding. Focuses on objectives and results. May come across as intimidating.',
    learningStyle: 'Goal-oriented learner who wants practical applications. Prefers structured programs with clear outcomes.',
    stressResponse: 'Under stress, may become overly emotional, withdrawn, or hypersensitive to perceived rejection.',
    idealEnvironment: 'Leadership positions with clear authority. Challenging goals and competent teams. Results-driven culture.',
    coreMotivations: ['Achieving goals', 'Leading effectively', 'Building systems', 'Maximizing potential'],
    coreFears: ['Weakness', 'Losing control', 'Incompetence in others', 'Being undermined'],
  },
  ENTP: {
    famousExamples: ['Mark Twain', 'Thomas Edison', 'Celine Dion', 'Robert Downey Jr.'],
    careers: ['Entrepreneur', 'Lawyer', 'Creative Director', 'Consultant', 'Inventor'],
    communicationStyle: 'Enthusiastic and witty. Enjoys debate and intellectual sparring. May play devil\'s advocate.',
    learningStyle: 'Experiential learner who thrives on variety. Needs to see connections and possibilities.',
    stressResponse: 'Under stress, may become obsessive about routines, withdrawn, or stuck in negative memories.',
    idealEnvironment: 'Dynamic settings with intellectual stimulation. Freedom to innovate and challenge conventions. Varied projects.',
    coreMotivations: ['Exploring possibilities', 'Innovation', 'Intellectual stimulation', 'Proving cleverness'],
    coreFears: ['Boredom', 'Being trapped', 'Missing opportunities', 'Intellectual stagnation'],
  },
  INFJ: {
    famousExamples: ['Martin Luther King Jr.', 'Nelson Mandela', 'Lady Gaga', 'Carl Jung'],
    careers: ['Counselor', 'Writer', 'Psychologist', 'Nonprofit Director', 'Human Resources'],
    communicationStyle: 'Thoughtful and empathetic. Prefers meaningful one-on-one conversations. May struggle with superficial talk.',
    learningStyle: 'Holistic learner who connects ideas to values and meaning. Needs purpose behind learning.',
    stressResponse: 'Under stress, may become obsessed with external details, overindulge senses, or become uncharacteristically impulsive.',
    idealEnvironment: 'Meaningful work that helps others. Harmony and collaboration. Time for reflection and creativity.',
    coreMotivations: ['Making a difference', 'Understanding people deeply', 'Living authentically', 'Helping others grow'],
    coreFears: ['Meaninglessness', 'Conflict and discord', 'Being misunderstood', 'Failing their ideals'],
  },
  INFP: {
    famousExamples: ['William Shakespeare', 'Princess Diana', 'Johnny Depp', 'J.R.R. Tolkien'],
    careers: ['Writer', 'Therapist', 'Artist', 'Social Worker', 'UX Designer'],
    communicationStyle: 'Authentic and heartfelt. May struggle to express deep feelings verbally. Values genuine connection.',
    learningStyle: 'Values-driven learner who needs personal relevance. Creative and imaginative in processing information.',
    stressResponse: 'Under stress, may become hypercritical, obsessed with efficiency, or harshly judgmental of self and others.',
    idealEnvironment: 'Creative freedom and autonomy. Work aligned with values. Supportive, non-competitive atmosphere.',
    coreMotivations: ['Living authentically', 'Self-expression', 'Helping individuals', 'Finding meaning'],
    coreFears: ['Inauthenticity', 'Being ordinary', 'Losing identity', 'Moral failure'],
  },
  ENFJ: {
    famousExamples: ['Oprah Winfrey', 'Barack Obama', 'Jennifer Lawrence', 'Maya Angelou'],
    careers: ['Teacher', 'HR Manager', 'Life Coach', 'Sales Director', 'Public Relations'],
    communicationStyle: 'Warm and inspiring. Naturally attuned to others\' needs. Excellent at motivating groups.',
    learningStyle: 'Social learner who thrives in collaborative settings. Connects learning to helping others.',
    stressResponse: 'Under stress, may become overly critical, withdrawn, or obsessed with logical analysis.',
    idealEnvironment: 'People-focused roles with positive impact. Collaborative teams. Recognition for contributions.',
    coreMotivations: ['Helping others succeed', 'Creating harmony', 'Making connections', 'Positive influence'],
    coreFears: ['Rejection', 'Being alone', 'Failing others', 'Disconnection'],
  },
  ENFP: {
    famousExamples: ['Robin Williams', 'Will Smith', 'Ellen DeGeneres', 'Walt Disney'],
    careers: ['Marketing', 'Counseling', 'Event Planning', 'Journalism', 'Entrepreneurship'],
    communicationStyle: 'Enthusiastic and expressive. Loves storytelling and making connections. May jump between topics.',
    learningStyle: 'Enthusiastic learner who needs inspiration. Prefers interactive, creative learning environments.',
    stressResponse: 'Under stress, may become obsessive about details, withdrawn, or unusually critical.',
    idealEnvironment: 'Creative freedom and variety. Positive, supportive team culture. Opportunity for personal expression.',
    coreMotivations: ['Authenticity', 'Making connections', 'Inspiring others', 'Exploring possibilities'],
    coreFears: ['Being trapped', 'Losing identity', 'Missing out', 'Inauthenticity'],
  },
  ISTJ: {
    famousExamples: ['George Washington', 'Queen Elizabeth II', 'Warren Buffett', 'Angela Merkel'],
    careers: ['Accountant', 'Military Officer', 'Judge', 'Systems Administrator', 'Project Manager'],
    communicationStyle: 'Factual and straightforward. Values accuracy and reliability. May seem reserved initially.',
    learningStyle: 'Sequential learner who prefers structured, step-by-step instruction. Values practical application.',
    stressResponse: 'Under stress, may catastrophize about the future, become pessimistic, or see too many possibilities.',
    idealEnvironment: 'Clear expectations and procedures. Stable, predictable settings. Recognition for reliability.',
    coreMotivations: ['Duty and responsibility', 'Maintaining order', 'Reliability', 'Preserving traditions'],
    coreFears: ['Chaos', 'Irresponsibility', 'Change without reason', 'Unpredictability'],
  },
  ISFJ: {
    famousExamples: ['Mother Teresa', 'Beyonce', 'Kate Middleton', 'Vin Diesel'],
    careers: ['Nurse', 'Teacher', 'Social Worker', 'Administrator', 'Customer Service'],
    communicationStyle: 'Warm and supportive. Attentive listener who remembers details. May avoid conflict.',
    learningStyle: 'Practical learner who values real-world applications. Prefers structured, supportive environments.',
    stressResponse: 'Under stress, may become pessimistic about possibilities, critical of everything, or overwhelmed by fears.',
    idealEnvironment: 'Stable, harmonious settings. Clear roles and appreciation. Opportunity to help others.',
    coreMotivations: ['Helping others', 'Creating stability', 'Preserving traditions', 'Being needed'],
    coreFears: ['Change', 'Conflict', 'Being unappreciated', 'Failing loved ones'],
  },
  ESTJ: {
    famousExamples: ['Judge Judy', 'Michelle Obama', 'Frank Sinatra', 'Lyndon B. Johnson'],
    careers: ['Manager', 'Military Leader', 'Judge', 'School Principal', 'Business Executive'],
    communicationStyle: 'Direct and decisive. Focuses on facts and logistics. Values efficiency in communication.',
    learningStyle: 'Practical learner who wants clear objectives. Prefers organized, structured instruction.',
    stressResponse: 'Under stress, may become emotionally sensitive, worry about relationships, or feel unappreciated.',
    idealEnvironment: 'Clear hierarchy and rules. Measurable goals and results. Competent, hardworking colleagues.',
    coreMotivations: ['Order and structure', 'Achievement', 'Responsibility', 'Community standards'],
    coreFears: ['Chaos', 'Incompetence', 'Lack of control', 'Emotional vulnerability'],
  },
  ESFJ: {
    famousExamples: ['Taylor Swift', 'Jennifer Garner', 'Hugh Jackman', 'Ed Sheeran'],
    careers: ['Healthcare Worker', 'Event Planner', 'Teacher', 'Office Manager', 'Sales Representative'],
    communicationStyle: 'Warm and sociable. Remembers personal details about others. Values harmony in interactions.',
    learningStyle: 'Social learner who prefers collaborative environments. Needs personal connection to material.',
    stressResponse: 'Under stress, may become overly critical, analytical, or fixated on perceived logical flaws.',
    idealEnvironment: 'Harmonious, people-focused settings. Clear appreciation for contributions. Structured roles.',
    coreMotivations: ['Helping others', 'Social harmony', 'Being appreciated', 'Maintaining traditions'],
    coreFears: ['Rejection', 'Conflict', 'Being alone', 'Disapproval'],
  },
  ISTP: {
    famousExamples: ['Clint Eastwood', 'Michael Jordan', 'Scarlett Johansson', 'Bruce Lee'],
    careers: ['Engineer', 'Mechanic', 'Pilot', 'Forensic Scientist', 'Emergency Responder'],
    communicationStyle: 'Reserved and practical. Prefers action over words. Communicates when necessary.',
    learningStyle: 'Hands-on learner who needs to experiment. Prefers self-paced, practical instruction.',
    stressResponse: 'Under stress, may become emotionally overwhelmed, seek validation, or become uncharacteristically expressive.',
    idealEnvironment: 'Hands-on work with tangible results. Freedom and flexibility. Minimal bureaucracy.',
    coreMotivations: ['Mastery of skills', 'Independence', 'Understanding how things work', 'Efficiency'],
    coreFears: ['Being controlled', 'Incompetence', 'Emotional demands', 'Boredom'],
  },
  ISFP: {
    famousExamples: ['Michael Jackson', 'Marilyn Monroe', 'Lana Del Rey', 'Bob Dylan'],
    careers: ['Artist', 'Musician', 'Veterinarian', 'Chef', 'Physical Therapist'],
    communicationStyle: 'Gentle and authentic. Expresses through actions more than words. Values genuine connection.',
    learningStyle: 'Experiential learner who needs personal relevance. Thrives with creative freedom.',
    stressResponse: 'Under stress, may become harshly critical, obsessed with efficiency, or uncharacteristically controlling.',
    idealEnvironment: 'Creative freedom and flexibility. Harmonious settings. Work aligned with personal values.',
    coreMotivations: ['Authenticity', 'Beauty and aesthetics', 'Personal values', 'Helping individuals'],
    coreFears: ['Inauthenticity', 'Conflict', 'Being controlled', 'Losing freedom'],
  },
  ESTP: {
    famousExamples: ['Donald Trump', 'Madonna', 'Eddie Murphy', 'Ernest Hemingway'],
    careers: ['Entrepreneur', 'Sales Executive', 'Paramedic', 'Athletic Coach', 'Marketing Director'],
    communicationStyle: 'Direct and action-oriented. Persuasive and adaptable. Prefers getting to the point.',
    learningStyle: 'Active learner who needs hands-on experience. Dislikes lengthy theoretical discussions.',
    stressResponse: 'Under stress, may become paranoid about the future, pessimistic, or withdraw into dark predictions.',
    idealEnvironment: 'Dynamic, fast-paced settings. Tangible challenges and rewards. Freedom to take action.',
    coreMotivations: ['Action and excitement', 'Winning', 'Immediate results', 'Freedom'],
    coreFears: ['Boredom', 'Missing out', 'Being trapped', 'Inactivity'],
  },
  ESFP: {
    famousExamples: ['Marilyn Monroe', 'Justin Bieber', 'Nicki Minaj', 'Jamie Oliver'],
    careers: ['Entertainer', 'Event Coordinator', 'Flight Attendant', 'Fitness Instructor', 'Sales'],
    communicationStyle: 'Expressive and enthusiastic. Natural entertainer who engages easily with others.',
    learningStyle: 'Active learner who needs variety and fun. Prefers practical, hands-on experiences.',
    stressResponse: 'Under stress, may become pessimistic, paranoid about the future, or withdrawn and dark.',
    idealEnvironment: 'Fun, social settings. Variety and excitement. Opportunity for spontaneity.',
    coreMotivations: ['Fun and enjoyment', 'Connection with others', 'Living in the moment', 'Freedom'],
    coreFears: ['Boredom', 'Being alone', 'Missing out', 'Restriction'],
  },
};

export interface CompatibilityDetails {
  overall: 'Excellent' | 'Good' | 'Moderate' | 'Challenging';
  score: number;
  strengths: string[];
  challenges: string[];
  tips: string[];
}

export function getCompatibility(type1: string, type2: string): CompatibilityDetails {
  const compatibilityMatrix: Record<string, Record<string, CompatibilityDetails>> = {
    INTJ: {
      ENFP: { overall: 'Excellent', score: 95, strengths: ['Intellectual stimulation', 'Complementary perspectives', 'Mutual growth'], challenges: ['Different energy levels', 'Planning vs spontaneity'], tips: ['Appreciate different approaches', 'Balance structure and freedom'] },
      ENTP: { overall: 'Excellent', score: 90, strengths: ['Intellectual debates', 'Strategic thinking', 'Mutual respect'], challenges: ['Both can be stubborn', 'Finishing projects'], tips: ['Take turns leading', 'Set shared goals'] },
      INFP: { overall: 'Good', score: 80, strengths: ['Deep conversations', 'Shared introversion', 'Mutual values'], challenges: ['Logic vs feelings', 'Different priorities'], tips: ['Balance head and heart', 'Respect different needs'] },
      INTJ: { overall: 'Good', score: 75, strengths: ['Mutual understanding', 'Shared values', 'Intellectual connection'], challenges: ['Both need space', 'Competition possible'], tips: ['Divide territories', 'Appreciate similarities'] },
    },
    INFJ: {
      ENTP: { overall: 'Excellent', score: 95, strengths: ['Intellectual depth', 'Complementary skills', 'Mutual fascination'], challenges: ['Different social needs', 'Conflict styles'], tips: ['Appreciate differences', 'Communicate openly'] },
      ENFP: { overall: 'Excellent', score: 92, strengths: ['Deep connection', 'Shared idealism', 'Emotional understanding'], challenges: ['Both can be sensitive', 'Different energy levels'], tips: ['Support each other', 'Balance depth and lightness'] },
      INFP: { overall: 'Good', score: 85, strengths: ['Emotional depth', 'Shared values', 'Understanding'], challenges: ['Both avoid conflict', 'Similar blind spots'], tips: ['Practice directness', 'Balance inward focus'] },
      INFJ: { overall: 'Good', score: 80, strengths: ['Deep understanding', 'Shared vision', 'Emotional connection'], challenges: ['Both need alone time', 'Mirroring issues'], tips: ['Maintain individuality', 'Communicate needs'] },
    },
  };

  const defaultCompatibility: CompatibilityDetails = {
    overall: 'Moderate',
    score: 70,
    strengths: ['Opportunity for growth', 'Different perspectives', 'Balanced relationship'],
    challenges: ['Communication differences', 'Different needs', 'Adjustment required'],
    tips: ['Be patient', 'Communicate openly', 'Appreciate differences'],
  };

  return compatibilityMatrix[type1]?.[type2] || compatibilityMatrix[type2]?.[type1] || defaultCompatibility;
}
