// Sprint 3 batch — ten additional personality quizzes.
//
// All use a shared Likert 1-5 scale and a generic "dimensional" result
// shape so one renderer in QuizzesPage can display all of them. Each quiz
// exports:
//   - quiz definition (runs through existing quiz runner)
//   - RESULT_INFO dictionary (per-result name, tagline, summary, strengths,
//     shadow, affirmation)
//
// Scoring is `calculateExtraQuiz(id, answers)` below: the Likert mean per
// dimension decides the primary, exact and near ties are reported rather
// than resolved by declaration order, three shadow-flavoured quizzes have a
// `low` result when nothing is elevated, and quizzes whose categories are
// derived (boundaries, empath/HSP, self-compassion, wellness, the PHQ-2
// screener) have dedicated scorers.
//
// Locale keys: `extraQuizzes.<key>.{title,description,timeEstimate,whatYouGet}`,
// `extraQuizzes.<key>.questions.<id>.text`, and
// `extraQuizzes.<key>.results.<dim>.{name,tagline,summary,strengths,shadow,affirmation}`
// (localizeQuiz.ts and the quizzes/ result renderer read them; the English
// below is the defaultValue).

import type { QuizDefinition } from '../types';

// ---------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------

export interface DimensionalResultInfo {
  name: string;
  tagline: string;
  summary: string;
  strengths: string[];
  shadow: string[];
  affirmation: string;
}

export interface DimensionalResult<K extends string = string> {
  primary: K;
  /** Raw Likert sum per scored dimension (what the score bars show). */
  scores: Record<string, number>;
  /** Likert mean per scored dimension — the number the primary is decided on. */
  averages: Record<string, number>;
  /** Top two means within TIE_MARGIN (0.25 Likert points): the screen names both. */
  isTie: boolean;
  /** Top mean minus runner-up mean. */
  margin: number;
  /** The runner-up, for the "close call" line. */
  secondary?: K;
  /** Dedicated scorers attach facts the renderer reads (self-compassion's weakest component, the PHQ-2 total). */
  extra?: Record<string, string | number>;
}

export { TIE_MARGIN, LOW_SIGNAL } from './extraQuizzesPart2';

const likert = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' },
];

// ---------------------------------------------------------------
// Scoring helper — sums Likert values per dimension
// ---------------------------------------------------------------

/**
 * Sum per dimension, compare by Likert MEAN (so a dimension with fewer
 * items is not handicapped), and report the race honestly: `isTie` when the
 * top two means are within TIE_MARGIN, with the runner-up in `secondary`.
 * Declared order still decides which of two tied names is `primary`, but
 * the screen shows both instead of presenting the first as a verdict.
 */
export function calculateDimensional<K extends string>(
  quiz: QuizDefinition,
  answers: Record<string, number>,
  dimensions: K[],
): DimensionalResult<K> {
  const { scores, averages } = likertMeans(quiz, answers, dimensions);
  const ranked = rankDimensions(averages, dimensions);
  return { primary: ranked.primary, scores, averages, isTie: ranked.isTie, margin: ranked.margin, secondary: ranked.secondary };
}

// ---------------------------------------------------------------
// 1. Dark Triad
// ---------------------------------------------------------------
// Three shadow traits: Narcissism, Machiavellianism, Psychopathy.
// Non-clinical — framed as self-awareness for shadow work.

export type DarkTriadType = 'narcissism' | 'machiavellianism' | 'psychopathy' | 'low';

export const darkTriadQuiz: QuizDefinition = {
  id: 'dark-triad-v1',
  type: 'extra-dimensional',
  title: 'Dark Triad Shadow',
  description: "Three shadow traits psychologists call the 'dark triad' — narcissism, Machiavellianism, and psychopathy — exist to some degree in all of us. This fifteen-question reading surfaces where your shadow runs strongest. It's not a diagnosis; it's a mirror for self-awareness.",
  questions: [
    { id: 'n1', text: 'I tend to feel I deserve special treatment.', dimension: 'narcissism', options: likert },
    { id: 'n2', text: 'I like being the center of attention.', dimension: 'narcissism', options: likert },
    { id: 'n3', text: 'I expect to be recognised as exceptional.', dimension: 'narcissism', options: likert },
    { id: 'n4', text: 'I believe I am more talented than most people.', dimension: 'narcissism', options: likert },
    { id: 'n5', text: 'I sometimes think the rules don\'t apply to me.', dimension: 'narcissism', options: likert },
    { id: 'm1', text: 'I use flattery to get what I want from people.', dimension: 'machiavellianism', options: likert },
    { id: 'm2', text: 'I keep my real motives private when dealing with others.', dimension: 'machiavellianism', options: likert },
    { id: 'm3', text: 'I manipulate conversations to land where I want them to.', dimension: 'machiavellianism', options: likert },
    { id: 'm4', text: 'I tell people what they want to hear if it gets me what I need.', dimension: 'machiavellianism', options: likert },
    { id: 'm5', text: 'I believe most people can be bought at some price.', dimension: 'machiavellianism', options: likert },
    { id: 'p1', text: 'I don\'t worry much about other people\'s feelings.', dimension: 'psychopathy', options: likert },
    { id: 'p2', text: 'I take risks that most people would call reckless.', dimension: 'psychopathy', options: likert },
    { id: 'p3', text: 'Consequences don\'t hold me back the way they hold others back.', dimension: 'psychopathy', options: likert },
    { id: 'p4', text: 'I stay unmoved when someone cries in front of me.', dimension: 'psychopathy', options: likert },
    { id: 'p5', text: 'I find rules of conduct often arbitrary and ignorable.', dimension: 'psychopathy', options: likert },
  ],
};

export const DARK_TRIAD_INFO: Record<DarkTriadType, DimensionalResultInfo> = {
  narcissism: {
    name: 'Narcissistic Shadow',
    tagline: 'The hungry self — craves mirroring, fears insignificance.',
    summary: 'Your shadow is strongest around narcissism — the hunger to be seen, admired, special. This energy built whole empires and whole disasters. In its healthy form it is confidence, charisma, the courage to take up space. In its shadow it is a bottomless mirror that cannot be filled.',
    strengths: ['Confidence', 'Charisma', 'Capacity to take up space', 'Tolerance for visibility'],
    shadow: ['Hunger for admiration', 'Inability to hear criticism', 'Believing rules don\'t apply to you', 'Collapse when not reflected back'],
    affirmation: 'I take up my space — and I let others be as bright as I am.',
  },
  machiavellianism: {
    name: 'Machiavellian Shadow',
    tagline: 'The strategist — sees the game, plays several moves ahead.',
    summary: 'Your shadow leans toward strategy — reading the room, steering conversations, playing the long game. At its best this is wisdom and political skill. In shadow it corrodes intimacy: you stop trusting anyone to just be with you, because you are always several moves ahead.',
    strengths: ['Strategic thinking', 'Reading people', 'Long-term planning', 'Understanding of power'],
    shadow: ['Chronic suspicion of motives', 'Inability to be present — always calculating', 'Manipulating where vulnerability would serve', 'Loneliness under the strategy'],
    affirmation: 'I see the game — and I know when to put the chessboard down.',
  },
  psychopathy: {
    name: 'Psychopathic Shadow',
    tagline: 'The cold one — unencumbered by fear, unencumbered by bond.',
    summary: 'Your shadow runs coldest — low fear, low attachment, high willingness to break rules. The healthy version is the surgeon who does not freeze, the soldier who protects, the CEO who makes the hard call. In shadow, it is disconnection — the freezing of warmth that would have sustained you.',
    strengths: ['Courage under pressure', 'Capacity to make hard calls', 'Freedom from paralysis', 'Adventure'],
    shadow: ['Coldness where connection is asked for', 'Boredom with safety and stability', 'Ignoring consequences that affect others', 'Thrill-seeking at others\' cost'],
    affirmation: 'I have the cold — and I choose when to let warmth back in.',
  },
  low: {
    name: 'Low shadow signal',
    tagline: 'The mirror is quiet today.',
    summary: 'You endorsed little of any of the three traits, so the mirror is quiet today. That is not a verdict of sainthood: everyone carries some of each, and a low reading can also mean you answered as you would like to be rather than as you are. Come back on a harder day and see what shows.',
    strengths: ['Low need for admiration', 'Straight dealing', 'Warmth stays switched on'],
    shadow: ['A quiet mirror can also be a flattering one', 'An edge you under-rate is an edge you never examine'],
    affirmation: 'I look at my shadow without flinching, even when it is faint.',
  },
};

// ---------------------------------------------------------------
// 2. DISC (workplace behavioural profile)
// ---------------------------------------------------------------

export type DiscType = 'dominance' | 'influence' | 'steadiness' | 'conscientiousness';

export const discQuiz: QuizDefinition = {
  id: 'disc-v1',
  type: 'extra-dimensional',
  title: 'DISC Behavioural Profile',
  description: 'DISC is a four-quadrant model of workplace behaviour — Dominance, Influence, Steadiness, Conscientiousness. Twenty questions reveal which style leads for you and how you naturally contribute to a team.',
  questions: [
    { id: 'd1', text: 'I move fast and push past obstacles.', dimension: 'dominance', options: likert },
    { id: 'd2', text: 'I like to lead rather than follow.', dimension: 'dominance', options: likert },
    { id: 'd3', text: 'I\'m direct, even blunt, when the stakes are high.', dimension: 'dominance', options: likert },
    { id: 'd4', text: 'I make decisions quickly and push them through.', dimension: 'dominance', options: likert },
    { id: 'd5', text: 'I\'d rather act now and adjust later.', dimension: 'dominance', options: likert },
    { id: 'i1', text: 'I love being around people and feed off their energy.', dimension: 'influence', options: likert },
    { id: 'i2', text: 'I persuade easily with warmth and enthusiasm.', dimension: 'influence', options: likert },
    { id: 'i3', text: 'I\'m expressive and optimistic.', dimension: 'influence', options: likert },
    { id: 'i4', text: 'I make friends wherever I go.', dimension: 'influence', options: likert },
    { id: 'i5', text: 'I would rather win people over than instruct them.', dimension: 'influence', options: likert },
    { id: 's1', text: 'I value stability and long-term relationships.', dimension: 'steadiness', options: likert },
    { id: 's2', text: 'I\'m a patient listener who remembers details about people.', dimension: 'steadiness', options: likert },
    { id: 's3', text: 'I prefer predictable environments.', dimension: 'steadiness', options: likert },
    { id: 's4', text: 'I resolve conflict by finding middle ground.', dimension: 'steadiness', options: likert },
    { id: 's5', text: 'I dislike abrupt change.', dimension: 'steadiness', options: likert },
    { id: 'c1', text: 'I prioritise accuracy and getting the details right.', dimension: 'conscientiousness', options: likert },
    { id: 'c2', text: 'I prefer quality over speed.', dimension: 'conscientiousness', options: likert },
    { id: 'c3', text: 'I ask clarifying questions before committing.', dimension: 'conscientiousness', options: likert },
    { id: 'c4', text: 'I follow procedures even when they feel slow.', dimension: 'conscientiousness', options: likert },
    { id: 'c5', text: 'I analyse thoroughly before deciding.', dimension: 'conscientiousness', options: likert },
  ],
};

export const DISC_INFO: Record<DiscType, DimensionalResultInfo> = {
  dominance: {
    name: 'Dominance (D)',
    tagline: 'Results-driven, fast, decisive.',
    summary: 'You lead by moving. You set direction, break through barriers, and thrive on challenge. People trust you to make the call when a call is needed.',
    strengths: ['Decisiveness', 'Strategic vision', 'Risk tolerance', 'Results orientation'],
    shadow: ['Running over softer people', 'Impatience with process', 'Short temper under delay'],
    affirmation: 'I move with force — and I remember the people moving with me.',
  },
  influence: {
    name: 'Influence (I)',
    tagline: 'Warm, persuasive, people-fueled.',
    summary: 'You lead by connecting. Your energy is contagious. You inspire, build coalitions, and keep morale up through rough stretches.',
    strengths: ['Persuasion', 'Optimism', 'Network-building', 'Warm presence'],
    shadow: ['Avoiding hard conversations', 'Over-promising', 'Losing focus in social energy'],
    affirmation: 'My warmth is my lever — and I use it even in the hard conversations.',
  },
  steadiness: {
    name: 'Steadiness (S)',
    tagline: 'Patient, loyal, calmly reliable.',
    summary: 'You lead by staying. Teams rely on your consistency. You\'re the person who remembers what happened last time, who settles conflicts, who keeps the ship upright through storms.',
    strengths: ['Reliability', 'Deep listening', 'Mediation', 'Long-term loyalty'],
    shadow: ['Resisting necessary change', 'Bottling frustration', 'Under-asserting when you should'],
    affirmation: 'I am the calm — and I speak up when speaking up is needed.',
  },
  conscientiousness: {
    name: 'Conscientiousness (C)',
    tagline: 'Accurate, analytical, quality-driven.',
    summary: 'You lead by thinking. Your standards are high. You catch errors others miss, build systems that don\'t fall apart, and make sure the work actually works.',
    strengths: ['Analytical rigour', 'Attention to detail', 'Quality focus', 'Process design'],
    shadow: ['Perfectionism', 'Analysis paralysis', 'Coldness masked as rigour'],
    affirmation: 'My rigour protects the work — and I ship at 85% when 85% is right.',
  },
};

// ---------------------------------------------------------------
// 3. Money Personality
// ---------------------------------------------------------------

export type MoneyType = 'saver' | 'spender' | 'avoider' | 'monk' | 'status';

export const moneyQuiz: QuizDefinition = {
  id: 'money-personality-v1',
  type: 'extra-dimensional',
  title: 'Money Personality',
  description: 'Five distinct patterns of relating to money — the Saver, the Spender, the Avoider, the Monk, and the Status-Seeker. Fifteen questions to see which script your money self is running.',
  questions: [
    { id: 'sv1', text: 'I feel most at peace when my savings account is growing.', dimension: 'saver', options: likert },
    { id: 'sv2', text: 'I\'d rather skip a purchase I want than tap into savings.', dimension: 'saver', options: likert },
    { id: 'sv3', text: 'I comparison-shop for small purchases.', dimension: 'saver', options: likert },
    { id: 'sp1', text: 'If something will make today better, I buy it.', dimension: 'spender', options: likert },
    { id: 'sp2', text: 'If I can afford it now, I buy it now.', dimension: 'spender', options: likert },
    { id: 'sp3', text: 'Money is meant to be enjoyed, not hoarded.', dimension: 'spender', options: likert },
    { id: 'av1', text: 'Checking my bank balance makes me anxious.', dimension: 'avoider', options: likert },
    { id: 'av2', text: 'I let bills and statements pile up unopened.', dimension: 'avoider', options: likert },
    { id: 'av3', text: 'I could not say, even roughly, how much money I have right now.', dimension: 'avoider', options: likert },
    { id: 'mk1', text: 'I feel conflicted about having more money than others.', dimension: 'monk', options: likert },
    { id: 'mk2', text: 'I feel uneasy about wanting more money than I need.', dimension: 'monk', options: likert },
    { id: 'mk3', text: 'I underprice my own work.', dimension: 'monk', options: likert },
    { id: 'st1', text: 'I use what I buy to signal what kind of person I am.', dimension: 'status', options: likert },
    { id: 'st2', text: 'How I look to others shapes my spending.', dimension: 'status', options: likert },
    { id: 'st3', text: 'I\'d rather have the nicer option even if I strain the budget.', dimension: 'status', options: likert },
  ],
};

export const MONEY_INFO: Record<MoneyType, DimensionalResultInfo> = {
  saver: {
    name: 'The Saver',
    tagline: 'Security-first, long-horizon, careful.',
    summary: 'You feel safest when the cushion is growing. Savings aren\'t just numbers — they\'re proof you\'re okay. This gives you discipline and long-horizon thinking most people lack.',
    strengths: ['Discipline', 'Long-term thinking', 'Low financial anxiety when the cushion is fed', 'Retirement-readiness'],
    shadow: ['Under-investing in present joy', 'Hoarding beyond rational need', 'Anxiety when forced to spend'],
    affirmation: 'I build the cushion — and I live fully in the present it protects.',
  },
  spender: {
    name: 'The Spender',
    tagline: 'Present-focused, experience-rich, generous.',
    summary: 'Money is for living. You invest in experiences, share generously, and refuse to treat your one life as a retirement spreadsheet. The trade-off: financial margin can run thin.',
    strengths: ['Enjoyment of life', 'Generosity', 'Willingness to invest in experiences and growth'],
    shadow: ['Thin margin when emergencies hit', 'Underfunded future', 'Impulse buys that don\'t actually bring joy'],
    affirmation: 'I invest in life — and I build a foundation so the life keeps going.',
  },
  avoider: {
    name: 'The Avoider',
    tagline: 'Head in the sand — money is a thing that happens to you.',
    summary: 'Money stresses you, so you don\'t look. Bills pile up, numbers blur, fear builds. This is usually learned — a response to scarcity or chaos earlier in life. It is workable.',
    strengths: ['Non-materialism', 'Focus on non-financial values', 'Immunity to hustle-culture traps'],
    shadow: ['Missing opportunities', 'Late fees and interest compounding', 'Anxiety that grows because it isn\'t faced'],
    affirmation: 'I open the envelope. I face the number. What I look at stops running me.',
  },
  monk: {
    name: 'The Monk',
    tagline: 'Ethical conflict with wealth — "money is compromised".',
    summary: 'You have a moral/spiritual tension with money. This can be real wisdom — you\'re onto something about what money does to people. But it can also be a convenient script that stops you from ever having any.',
    strengths: ['Values-aligned life', 'Resistance to consumerism', 'Spiritual/ethical clarity'],
    shadow: ['Under-earning and then resenting it', 'Believing wealth and ethics are incompatible', 'Financial anxiety under a spiritual-sounding cover'],
    affirmation: 'I can be ethical and financially safe. Both / and.',
  },
  status: {
    name: 'The Status-Seeker',
    tagline: 'Uses money to signal identity and belonging.',
    summary: 'What you buy says something about who you are. At best this is aesthetic intelligence and social savvy. At worst, it is a treadmill that never stops — someone else always has more.',
    strengths: ['Aesthetic taste', 'Social intelligence', 'Willingness to invest in self-presentation'],
    shadow: ['Spending on image rather than enjoyment', 'Comparison treadmill', 'Debt from projecting what you don\'t have'],
    affirmation: 'I like beautiful things — and I no longer need them to prove who I am.',
  },
};

// ---------------------------------------------------------------
// 4. Boundaries
// ---------------------------------------------------------------

export type BoundaryType = 'rigid' | 'porous' | 'healthy' | 'situational';

export const boundariesQuiz: QuizDefinition = {
  id: 'boundaries-v1',
  type: 'extra-dimensional',
  title: 'Boundaries Check-In',
  description: 'Where are your boundaries strong, where are they weak, and where do they shift depending on who\'s asking? Sixteen questions across four patterns: rigid walls, porous openness, healthy flex, and situation-dependent.',
  questions: [
    { id: 'rg1', text: 'I keep people at arm\'s length even when I\'d like to be closer.', dimension: 'rigid', options: likert },
    { id: 'rg2', text: 'I find it hard to ask for help.', dimension: 'rigid', options: likert },
    { id: 'rg3', text: 'I rarely share my emotions with anyone.', dimension: 'rigid', options: likert },
    { id: 'rg4', text: 'I have strict rules about who gets access to me.', dimension: 'rigid', options: likert },
    { id: 'po1', text: 'I take on other people\'s problems as if they were my own.', dimension: 'porous', options: likert },
    { id: 'po2', text: 'I find it hard to say no to a request.', dimension: 'porous', options: likert },
    { id: 'po3', text: 'I over-share early in relationships.', dimension: 'porous', options: likert },
    { id: 'po4', text: 'My mood depends heavily on how others feel about me.', dimension: 'porous', options: likert },
    { id: 'hl1', text: 'I say no when I need to, without a long explanation.', dimension: 'healthy', options: likert },
    { id: 'hl2', text: 'I can support someone without absorbing their distress.', dimension: 'healthy', options: likert },
    { id: 'hl3', text: 'I share personal things at a pace that matches the relationship.', dimension: 'healthy', options: likert },
    { id: 'hl4', text: 'I notice when someone crosses a line and address it.', dimension: 'healthy', options: likert },
    { id: 'sn1', text: 'My boundaries depend on how powerful the other person is.', dimension: 'situational', options: likert },
    { id: 'sn2', text: 'I hold the line with strangers but cave with family.', dimension: 'situational', options: likert },
    { id: 'sn3', text: 'I have totally different rules in work vs. personal life.', dimension: 'situational', options: likert },
    { id: 'sn4', text: 'I fluctuate between too-open and too-closed depending on stress.', dimension: 'situational', options: likert },
  ],
};

export const BOUNDARIES_INFO: Record<BoundaryType, DimensionalResultInfo> = {
  rigid: {
    name: 'Rigid Walls',
    tagline: 'Protected — often over-protected — from being hurt.',
    summary: 'Your boundaries lean toward walls: firm, high, not often crossed. This means you don\'t get hurt easily. It also means connection has to work hard to reach you. The work is learning which walls still serve and which ones locked you in.',
    strengths: ['Safety', 'Clear lines', 'Non-reactivity', 'Independence'],
    shadow: ['Loneliness', 'Difficulty receiving love', 'Walls that stopped a past hurt but block present joy'],
    affirmation: 'My boundaries protect me and allow the right people in. I choose which walls stay and which come down.',
  },
  porous: {
    name: 'Porous Openness',
    tagline: 'Deeply open — often overwhelmed by what gets in.',
    summary: 'Your boundaries are permeable. You absorb what others feel. You over-share. You have trouble saying no. This gift of openness is real — and it needs a skin, not a wall, around it.',
    strengths: ['Empathy', 'Warmth', 'Trust in others', 'Easy vulnerability'],
    shadow: ['Compassion fatigue', 'Losing self in relationships', 'Over-sharing before it\'s safe', 'Resentment from saying yes too often'],
    affirmation: 'I feel it all — and I choose what I take in. Yes and no are both love.',
  },
  healthy: {
    name: 'Healthy Flex',
    tagline: 'Firm enough to hold you, soft enough to let people in.',
    summary: 'Your boundaries know how to move. You can say no without guilt, yes without losing yourself, and you notice quickly when something is off. This is the target state — which does not mean the work is over, but it means you have the skills.',
    strengths: ['Clear yes/no', 'Emotional regulation', 'Mature intimacy', 'Self-respect'],
    shadow: ['Occasionally rigid under stress', 'Holding healthy boundaries can exhaust you when around unhealthy ones'],
    affirmation: 'My yes is a yes. My no is a no. Both are complete sentences.',
  },
  situational: {
    name: 'Situation-Dependent',
    tagline: 'Different boundaries in different rooms.',
    summary: 'Your boundaries shift by context. Strong at work, porous with family. Firm with strangers, collapsing with loved ones. This is workable — but the unpredictability is a clue: somewhere, a certain situation overrides your stated values. Identify it, meet it, and your boundaries become consistent.',
    strengths: ['Adaptability', 'Context-sensitivity', 'Flexibility'],
    shadow: ['Inconsistency confuses people around you', 'Disowning a part of yourself in certain relationships', 'Exhaustion from code-switching'],
    affirmation: 'My values are the same everywhere. I find the places where I forget that — and I return.',
  },
};

/**
 * Healthy and situational boundaries are patterns derived from the other
 * two, not independent traits, and the four "healthy" items are the ones
 * everyone agrees with — so a max-wins scorer typed almost everyone
 * healthy. Decision order: situational when it is clearly endorsed (mean
 * ≥ 3.5) and leads; healthy when neither walls nor porousness are
 * elevated (both means ≤ 2.5); otherwise whichever of rigid / porous is
 * higher, flagged as a tie when they are within TIE_MARGIN.
 */
export function scoreBoundaries(answers: Record<string, number>): DimensionalResult<BoundaryType> {
  const dims: BoundaryType[] = ['rigid', 'porous', 'healthy', 'situational'];
  const { scores, averages: a } = likertMeans(boundariesQuiz, answers, dims);
  const lead = Math.max(a.rigid, a.porous, a.healthy, a.situational);
  let primary: BoundaryType;
  if (a.situational >= 3.5 && a.situational >= lead) primary = 'situational';
  else if (a.rigid <= 2.5 && a.porous <= 2.5) primary = 'healthy';
  else primary = a.rigid >= a.porous ? 'rigid' : 'porous';
  const wallsVsPores = Math.abs(a.rigid - a.porous);
  const isTie = (primary === 'rigid' || primary === 'porous') && wallsVsPores <= TIE_MARGIN;
  const secondary = isTie ? (primary === 'rigid' ? 'porous' : 'rigid') : undefined;
  return { primary, scores, averages: a, isTie, margin: primary === 'rigid' || primary === 'porous' ? wallsVsPores : 0, secondary };
}

// ---------------------------------------------------------------
// 5. Burnout Level (Maslach-informed, NOT a diagnostic tool)
// ---------------------------------------------------------------

export type BurnoutType = 'exhaustion' | 'cynicism' | 'efficacy-loss' | 'low';

export const burnoutQuiz: QuizDefinition = {
  id: 'burnout-v1',
  type: 'extra-dimensional',
  title: 'Burnout Check',
  description: 'Burnout has three measurable dimensions: exhaustion (drained energy), cynicism (distance from the work), and loss of efficacy (I\'m not effective anymore). Twelve questions give you a read on where you are today. This is not a diagnosis — it\'s a mirror.',
  questions: [
    // Original wording, not the Maslach Burnout Inventory (a licensed
    // instrument); the three dimensions are Maslach's, the items are ours.
    { id: 'ex1', text: 'My work leaves me emotionally wrung out.', dimension: 'exhaustion', options: likert },
    { id: 'ex2', text: 'Mornings feel heavy because of what the day holds.', dimension: 'exhaustion', options: likert },
    { id: 'ex3', text: 'Getting through a full day takes everything I have.', dimension: 'exhaustion', options: likert },
    { id: 'ex4', text: 'By evening I have nothing left for anything else.', dimension: 'exhaustion', options: likert },
    { id: 'cy1', text: 'The work I once cared about has stopped mattering to me.', dimension: 'cynicism', options: likert },
    { id: 'cy2', text: 'I have become more sceptical about whether my work makes any difference.', dimension: 'cynicism', options: likert },
    { id: 'cy3', text: 'I would rather just get my tasks done and be left alone.', dimension: 'cynicism', options: likert },
    { id: 'cy4', text: 'I question whether what I do has any real value.', dimension: 'cynicism', options: likert },
    { id: 'ef1', text: 'I am getting less done than I used to, and it bothers me.', dimension: 'efficacy-loss', options: likert },
    { id: 'ef2', text: 'It feels like my efforts no longer lead anywhere.', dimension: 'efficacy-loss', options: likert },
    { id: 'ef3', text: 'I have lost confidence in my ability to do my job well.', dimension: 'efficacy-loss', options: likert },
    { id: 'ef4', text: 'I feel I have little control over how my work goes.', dimension: 'efficacy-loss', options: likert },
  ],
};

export const BURNOUT_INFO: Record<BurnoutType, DimensionalResultInfo> = {
  exhaustion: {
    name: 'Exhaustion-Dominant Burnout',
    tagline: 'The tank is empty. Energy is the first thing to rebuild.',
    summary: 'Your burnout expresses as pure depletion. You can still see the value of your work, still care about the outcomes — you just don\'t have the energy left to deliver. This is the most reversible form of burnout if caught here.',
    strengths: ['You still care — that matters', 'You haven\'t disconnected from your values yet'],
    shadow: ['Pushing through will make it worse', 'Short fuse', 'Sleep and rest no longer refill you the way they used to'],
    affirmation: 'My body has given me a signal. I listen to it. Rest is the work right now.',
  },
  cynicism: {
    name: 'Cynicism-Dominant Burnout',
    tagline: 'You\'ve detached. The work stopped mattering.',
    summary: 'Your burnout is in your relationship to the work itself. You still have some energy, but you\'ve emotionally checked out. The fire went out. Doing the work feels hollow. This is a warning sign — the longer cynicism sits, the harder it is to reconnect.',
    strengths: ['You can see clearly what is broken — cynicism is often accurate observation'],
    shadow: ['Numbness seeping into other parts of your life', 'Sarcasm where care used to live', 'Hopelessness about change'],
    affirmation: 'My cynicism is real information. It\'s telling me something I can\'t ignore any longer.',
  },
  'efficacy-loss': {
    name: 'Efficacy-Loss Burnout',
    tagline: 'You doubt your own capability.',
    summary: 'Your burnout shows up as questioning whether you\'re any good at this anymore. This is the most painful form because it attacks self-concept. It also has the most compact fix: wins. Not "prove yourself" wins — small visible completions that remind you you can still finish things.',
    strengths: ['Self-reflection', 'Willingness to question yourself'],
    shadow: ['Imposter spiral', 'Avoiding challenging work because you fear failing', 'Deep loneliness — you don\'t tell anyone you feel this way'],
    affirmation: 'I remember what I\'ve done. I take one win today, real and visible, and I let it count.',
  },
  low: {
    name: 'Running warm, not burnt out',
    tagline: 'None of the three dimensions is elevated.',
    summary: 'None of the three dimensions is elevated: you still have energy for the day, the work still means something, and you still trust yourself to do it. Keep the habits that are working — rest, boundaries, a sense of why — because burnout arrives slowly and leaves slowly.',
    strengths: ['Energy is available', 'The work still matters to you', 'You trust your own competence'],
    shadow: ['Low today is not low forever — check in again in a month', 'A good reading can tempt you to skip the rest that produced it'],
    affirmation: 'I protect what is working before anything breaks.',
  },
};

// ---------------------------------------------------------------
// 6. Communication Style
// ---------------------------------------------------------------

export type CommType = 'passive' | 'aggressive' | 'passive-aggressive' | 'assertive';

export const communicationQuiz: QuizDefinition = {
  id: 'communication-v1',
  type: 'extra-dimensional',
  title: 'Communication Style',
  description: 'When things get difficult, four styles tend to emerge: passive (hide), aggressive (attack), passive-aggressive (indirect sabotage), or assertive (clear + respectful). Twelve questions to see which is your default and which is available when you\'re regulated.',
  questions: [
    { id: 'ps1', text: 'I stay silent even when I disagree, to avoid conflict.', dimension: 'passive', options: likert },
    { id: 'ps2', text: 'I apologise for things that weren\'t my fault.', dimension: 'passive', options: likert },
    { id: 'ps3', text: 'I let others make decisions for me to keep the peace.', dimension: 'passive', options: likert },
    { id: 'ag1', text: 'I raise my voice when I feel crossed.', dimension: 'aggressive', options: likert },
    { id: 'ag2', text: 'I interrupt others to make my point.', dimension: 'aggressive', options: likert },
    { id: 'ag3', text: 'I use biting remarks or sarcasm to win arguments.', dimension: 'aggressive', options: likert },
    { id: 'pa1', text: 'I say "I\'m fine" when I\'m not.', dimension: 'passive-aggressive', options: likert },
    { id: 'pa2', text: 'I use the silent treatment to signal displeasure.', dimension: 'passive-aggressive', options: likert },
    { id: 'pa3', text: 'I forget or delay things on purpose when I\'m resentful.', dimension: 'passive-aggressive', options: likert },
    { id: 'as1', text: 'I state what I want directly, without apologising for wanting it.', dimension: 'assertive', options: likert },
    { id: 'as2', text: 'I listen fully before responding, even when I disagree.', dimension: 'assertive', options: likert },
    { id: 'as3', text: 'I can say no firmly while staying warm.', dimension: 'assertive', options: likert },
  ],
};

export const COMM_INFO: Record<CommType, DimensionalResultInfo> = {
  passive: {
    name: 'Passive',
    tagline: 'Silence over safety — your needs come last.',
    summary: 'Your default is to keep the peace by keeping quiet. This often develops in environments where speaking up had bad consequences. Short-term, it reduces conflict. Long-term, it builds resentment and disconnects you from what you actually want.',
    strengths: ['Sensitivity to others\' needs', 'Easy-going reputation', 'Restraint'],
    shadow: ['Resentment build-up', 'Your real self stops showing up', 'Others never learn what you actually want'],
    affirmation: 'My needs matter as much as anyone else\'s. I practice saying them out loud.',
  },
  aggressive: {
    name: 'Aggressive',
    tagline: 'Force first — my needs override yours.',
    summary: 'You push. You raise your voice. You override others to get where you need to go. This gets results in some settings (and fails badly in others). Under the force is usually fear that if you don\'t push you\'ll be overrun.',
    strengths: ['Gets things moving', 'Direct — people know where they stand', 'High energy'],
    shadow: ['Damaging relationships', 'Being feared rather than respected', 'Burning bridges you will need'],
    affirmation: 'My power is real — and I wield it precisely. I don\'t need to overpower to be heard.',
  },
  'passive-aggressive': {
    name: 'Passive-Aggressive',
    tagline: 'Indirect resistance — saying no with my actions.',
    summary: 'You can\'t (or don\'t) say what you\'re feeling directly — so it comes out sideways. The silent treatment, "forgetting", veiled comments. This is the most corrosive style because the other person senses the hostility but can\'t address it.',
    strengths: ['Sensitivity to environments where directness is punished'],
    shadow: ['Corrodes relationships slowly', 'Nobody around you knows what\'s wrong', 'You don\'t fully admit the anger even to yourself'],
    affirmation: 'My anger is clean information. I say it directly — or I let it go.',
  },
  assertive: {
    name: 'Assertive',
    tagline: 'Clear and respectful — my needs and yours, both.',
    summary: 'You say what you mean. You listen before you respond. You can say no without apologising and yes without dissolving. This is the target state — and it is a practice, not a personality. Notice which situations pull you out of it.',
    strengths: ['Clean communication', 'Mutual respect', 'Honest relationships'],
    shadow: ['Can occasionally slip to aggressive under threat, or passive with specific people', 'Sometimes feels exhausting to hold'],
    affirmation: 'I stand in my truth and honour yours. Both can be real at once.',
  },
};

// ---------------------------------------------------------------
// 7. Conflict Style (Thomas-Kilmann)
// ---------------------------------------------------------------

export type ConflictType = 'competing' | 'collaborating' | 'compromising' | 'avoiding' | 'accommodating';

export const conflictQuiz: QuizDefinition = {
  id: 'conflict-v1',
  type: 'extra-dimensional',
  title: 'Conflict Style',
  description: 'The Thomas-Kilmann model identifies five modes for handling conflict: competing, collaborating, compromising, avoiding, accommodating. Fifteen questions to see your preferred response — and which modes you might need to practice.',
  questions: [
    { id: 'cp1', text: 'I argue hard for what I think is right.', dimension: 'competing', options: likert },
    { id: 'cp2', text: 'I\'d rather win than keep the peace.', dimension: 'competing', options: likert },
    { id: 'cp3', text: 'I make strong cases and don\'t back down easily.', dimension: 'competing', options: likert },
    { id: 'cl1', text: 'I work to find solutions that meet everyone\'s needs.', dimension: 'collaborating', options: likert },
    { id: 'cl2', text: 'I dig into the real problem behind the surface disagreement.', dimension: 'collaborating', options: likert },
    { id: 'cl3', text: 'I keep talking until we find something that works for both of us.', dimension: 'collaborating', options: likert },
    { id: 'cm1', text: 'I\'m quick to offer a compromise to settle things.', dimension: 'compromising', options: likert },
    { id: 'cm2', text: 'I think meeting halfway is usually fair.', dimension: 'compromising', options: likert },
    { id: 'cm3', text: 'I\'d rather both of us get partial wins than fight for total.', dimension: 'compromising', options: likert },
    { id: 'av1', text: 'I avoid people I\'m in conflict with until the tension fades.', dimension: 'avoiding', options: likert },
    { id: 'av2', text: 'I don\'t bring up issues that might cause friction.', dimension: 'avoiding', options: likert },
    { id: 'av3', text: 'I hope disagreements resolve themselves over time.', dimension: 'avoiding', options: likert },
    { id: 'ac1', text: 'I give in to keep the relationship intact.', dimension: 'accommodating', options: likert },
    { id: 'ac2', text: 'I let others have their way when they feel strongly.', dimension: 'accommodating', options: likert },
    { id: 'ac3', text: 'I find it hard to put my needs above someone else\'s.', dimension: 'accommodating', options: likert },
  ],
};

export const CONFLICT_INFO: Record<ConflictType, DimensionalResultInfo> = {
  competing: {
    name: 'Competing',
    tagline: 'Assertive, uncooperative — fights for own position.',
    summary: 'Your default mode is to fight for what you believe is right. Great when the stakes are high and you have the right answer. Dangerous when it\'s low-stakes or you don\'t actually have the right answer.',
    strengths: ['Decisiveness in crisis', 'Moral clarity', 'Willingness to fight'],
    shadow: ['Damaged relationships', 'Winning battles but losing wars', 'Blind spots about your own fallibility'],
    affirmation: 'I fight when it matters — and I lay down the sword most of the time.',
  },
  collaborating: {
    name: 'Collaborating',
    tagline: 'Assertive + cooperative — works for both to win.',
    summary: 'You dig into the real problem and look for solutions that satisfy everyone. This is usually the best mode when relationships matter and time allows. It does cost — time, patience, emotional labour.',
    strengths: ['Win-win mindset', 'Deep problem-solving', 'Strengthens relationships'],
    shadow: ['Slow when speed is needed', 'Exhausting to do constantly', 'Can over-process small issues'],
    affirmation: 'I work for solutions that serve everyone — and I know when to move faster.',
  },
  compromising: {
    name: 'Compromising',
    tagline: 'Moderately assertive + cooperative — meet in the middle.',
    summary: 'You look for the midpoint. This is pragmatic, faster than full collaboration, and keeps relationships workable. The risk: both sides feel a little robbed, and the real problem underneath stays unaddressed.',
    strengths: ['Pragmatic', 'Fair-feeling outcomes', 'Efficient'],
    shadow: ['No one feels fully heard', 'Real root problem stays unsolved', 'Creeping cynicism about "fair"'],
    affirmation: 'I find workable middles — and I dig deeper when middle isn\'t good enough.',
  },
  avoiding: {
    name: 'Avoiding',
    tagline: 'Unassertive, uncooperative — steps away.',
    summary: 'You prefer to not engage. This is right when the issue is minor, the relationship matters more than the issue, or you need time. It\'s wrong when the avoided thing is actually important — it compounds underneath.',
    strengths: ['Wisdom about which fights to avoid', 'Strategic patience'],
    shadow: ['Small things grow', 'Resentment', 'Relationships slowly corrode from un-addressed issues'],
    affirmation: 'I choose my fights — and I name the ones that need naming, even when it\'s uncomfortable.',
  },
  accommodating: {
    name: 'Accommodating',
    tagline: 'Unassertive, cooperative — gives in to keep peace.',
    summary: 'You tend to give in. For relationships or people you love, this is a real gift. It becomes a problem when it\'s automatic — when you lose track of what you actually need.',
    strengths: ['Generous spirit', 'Harmony-keeping', 'Low-ego'],
    shadow: ['Lost self', 'Resentment that accumulates', 'Others never learn your real preferences'],
    affirmation: 'My giving is a choice, not a reflex. I check what I need before I yield.',
  },
};

// ---------------------------------------------------------------
// 8. Sleep Chronotype (Breus model)
// ---------------------------------------------------------------

export type ChronoType = 'lion' | 'bear' | 'wolf' | 'dolphin';

export const sleepQuiz: QuizDefinition = {
  id: 'chronotype-v1',
  type: 'extra-dimensional',
  title: 'Sleep Chronotype',
  description: 'Dr. Michael Breus\' chronotype model identifies four sleep-wake personalities: the Lion (morning), the Bear (daytime), the Wolf (evening), and the Dolphin (restless). Sixteen questions reveal which rhythm is yours — and when your real peak hours are.',
  questions: [
    { id: 'lo1', text: 'I wake up naturally before 6 AM feeling rested.', dimension: 'lion', options: likert },
    { id: 'lo2', text: 'My most productive hours are 6-10 AM.', dimension: 'lion', options: likert },
    { id: 'lo3', text: 'I fade fast in the evening and am usually asleep by 10 PM.', dimension: 'lion', options: likert },
    { id: 'lo4', text: 'I wake up hungry.', dimension: 'lion', options: likert },
    { id: 'be1', text: 'I wake between 7 and 9 AM without trouble.', dimension: 'bear', options: likert },
    { id: 'be2', text: 'My best hours are 10 AM to 2 PM.', dimension: 'bear', options: likert },
    { id: 'be3', text: 'I hit a natural slump around 3-4 PM.', dimension: 'bear', options: likert },
    { id: 'be4', text: 'I sleep deeply for 7-8 hours.', dimension: 'bear', options: likert },
    { id: 'wo1', text: 'I struggle to wake before 8 AM no matter what time I slept.', dimension: 'wolf', options: likert },
    { id: 'wo2', text: 'My productive window doesn\'t open until afternoon or evening.', dimension: 'wolf', options: likert },
    { id: 'wo3', text: 'I feel most alive late at night, past 10 PM.', dimension: 'wolf', options: likert },
    { id: 'wo4', text: 'Even after a full night\'s sleep, I am slow and groggy for the first hours of the morning.', dimension: 'wolf', options: likert },
    { id: 'do1', text: 'I wake up multiple times a night even when tired.', dimension: 'dolphin', options: likert },
    { id: 'do2', text: 'I have a sensitive nervous system — light, sound, thoughts wake me.', dimension: 'dolphin', options: likert },
    { id: 'do3', text: 'I feel sleepy early in the evening, then wide awake again around 10 PM.', dimension: 'dolphin', options: likert },
    { id: 'do4', text: 'I lie awake replaying the day even when I am exhausted.', dimension: 'dolphin', options: likert },
  ],
};

export const CHRONOTYPE_INFO: Record<ChronoType, DimensionalResultInfo> = {
  lion: {
    name: 'The Lion',
    tagline: 'Early riser, peak morning, sunset energy.',
    summary: 'You wake easily, get your best work done before noon, and fade by 9 PM. About 15% of people are lions. Your secret: build your hardest work into 6-10 AM, do maintenance work midday, and honour the early bedtime.',
    strengths: ['Reliable morning energy', 'Mornings are sacred', 'Consistent schedule'],
    shadow: ['Evening social life suffers', 'Can feel like an outsider in a night-owl culture'],
    affirmation: 'My early light is a gift. I schedule my life around when my lion hunts.',
  },
  bear: {
    name: 'The Bear',
    tagline: 'Solar-rhythm — rises with the sun, peaks midday.',
    summary: 'You follow the sun. Asleep by 11, up around 7-8, peak focus 10 AM-2 PM, natural dip 3-4 PM, fade by 10 PM. About 55% of people are bears. Most work and school schedules are built around this rhythm.',
    strengths: ['Mainstream-friendly rhythm', 'Easy adaptability', 'Good sleep most nights'],
    shadow: ['The 3-4 PM slump is real — honour it', 'Can drift into night-owl patterns under stress'],
    affirmation: 'My rhythm is steady. I ride the sun, rest when it dips, and sleep when it sets.',
  },
  wolf: {
    name: 'The Wolf',
    tagline: 'Late night predator — peak creative at 9 PM.',
    summary: 'You are biologically programmed to be at peak alertness late at night. Mornings punish you. About 15% of people are wolves. This is not a defect — your natural rhythm just clashes with school-and-office schedules.',
    strengths: ['Creative peak at night', 'Deep focus when the world is quiet', 'Night thinking different from day thinking'],
    shadow: ['Morning misery', 'Social rhythm conflict with partners/kids on normal schedules', 'Risk of chronic sleep deprivation'],
    affirmation: 'My rhythm is not broken. I design the life I can design around it — and I negotiate the rest.',
  },
  dolphin: {
    name: 'The Dolphin',
    tagline: 'Light sleeper, vigilant nervous system.',
    summary: 'You sleep the way dolphins do — half-awake. Sensitive to light, sound, thoughts. Wake multiple times a night. Often labeled "insomniac". About 10% of people are dolphins. Breus describes dolphins as perceptive, detail-focused and often anxious. Routine is medicine.',
    strengths: ['Creative problem-solving', 'High awareness', 'Strong detail memory'],
    shadow: ['Sleep deprivation', 'Anxiety spiral', 'Wired-but-tired during the day'],
    affirmation: 'My nervous system needs gentle ritual. I build a sleep practice and honour how sensitive I am.',
  },
};

// ---------------------------------------------------------------
// 9. Creative Type
// ---------------------------------------------------------------

export type CreativeType = 'maker' | 'dreamer' | 'performer' | 'organiser' | 'analyser';

export const creativeQuiz: QuizDefinition = {
  id: 'creative-type-v1',
  type: 'extra-dimensional',
  title: 'Creative Type',
  description: 'Five ways of being creative — five roles in the creative process. Fifteen questions to see which role you take on naturally, and which others you might partner with.',
  questions: [
    { id: 'mk1', text: 'I create with my hands — building, crafting, making tangibles.', dimension: 'maker', options: likert },
    { id: 'mk2', text: 'I think best when I\'m doing, not when I\'m planning.', dimension: 'maker', options: likert },
    { id: 'mk3', text: 'I would rather make a rough version than describe the idea.', dimension: 'maker', options: likert },
    { id: 'dr1', text: 'I imagine worlds and possibilities more easily than concrete things.', dimension: 'dreamer', options: likert },
    { id: 'dr2', text: 'I have a thousand ideas for every one I complete.', dimension: 'dreamer', options: likert },
    { id: 'dr3', text: 'I\'m inspired by visions, not instructions.', dimension: 'dreamer', options: likert },
    { id: 'pf1', text: 'I come alive in front of an audience.', dimension: 'performer', options: likert },
    { id: 'pf2', text: 'I create by improvising in real-time.', dimension: 'performer', options: likert },
    { id: 'pf3', text: 'I think through my body and voice.', dimension: 'performer', options: likert },
    { id: 'or1', text: 'I\'m the person who makes sure creative projects actually finish.', dimension: 'organiser', options: likert },
    { id: 'or2', text: 'I turn chaos into structure.', dimension: 'organiser', options: likert },
    { id: 'or3', text: 'I love the craft of making someone else\'s vision real.', dimension: 'organiser', options: likert },
    { id: 'an1', text: 'I find creativity in patterns — in systems, data, ideas.', dimension: 'analyser', options: likert },
    { id: 'an2', text: 'I enjoy taking something apart to see how it works more than using it.', dimension: 'analyser', options: likert },
    { id: 'an3', text: 'My creativity shows up in the elegance of a solution.', dimension: 'analyser', options: likert },
  ],
};

export const CREATIVE_INFO: Record<CreativeType, DimensionalResultInfo> = {
  maker: {
    name: 'The Maker',
    tagline: 'Hands first — creates by building real things.',
    summary: 'You create with your hands. Tangibles matter: objects, drawings, code, a cooked meal. Your thinking happens through doing. Ideas without prototypes feel unreal to you.',
    strengths: ['Finishes things', 'Craftsmanship', 'Learning through doing'],
    shadow: ['Impatient with purely abstract work', 'Can dive in before the idea is ready', 'Resistance to planning'],
    affirmation: 'My hands know. I make to find out what I think.',
  },
  dreamer: {
    name: 'The Dreamer',
    tagline: 'Vision-rich — sees worlds before they exist.',
    summary: 'Your creative gift is vision. You see possibilities. Worlds appear to you. The work is finding partners who help you ground these visions — Makers, Organisers, Performers — so the ideas take form.',
    strengths: ['Inspirational vision', 'Sees what doesn\'t exist yet', 'Inspires others'],
    shadow: ['Thousand ideas, ten finished things', 'Frustration when reality falls short', 'Starting more than you finish'],
    affirmation: 'My visions are real information. I partner so they land in the world.',
  },
  performer: {
    name: 'The Performer',
    tagline: 'Improviser — creates live, in front of, or with others.',
    summary: 'You create in real time. On stage, in conversation, in a workshop. Your body and voice are instruments. The audience/partner is part of the work — your creativity is relational.',
    strengths: ['Improvisation', 'Energy-reading', 'Presence'],
    shadow: ['Creativity dims when alone', 'Dependence on audience response', 'Hard to preserve what you do'],
    affirmation: 'My medium is the moment. I create with whoever is in the room.',
  },
  organiser: {
    name: 'The Organiser',
    tagline: 'Finisher — turns chaos into shipped work.',
    summary: 'You make creative projects actually happen. You take other people\'s visions (or your own) and you structure, schedule, execute, deliver. The creative world would mostly never ship without organisers.',
    strengths: ['Finishing power', 'Structure', 'Reliability'],
    shadow: ['Under-credited', 'Can mistake structure for creativity', 'Overwhelm from carrying others\' chaos'],
    affirmation: 'My structure is creativity. Without the Organiser, nothing crosses the finish line.',
  },
  analyser: {
    name: 'The Analyser',
    tagline: 'Pattern-finder — beauty in systems, code, ideas.',
    summary: 'Your creativity lives in patterns. You find the elegant solution, the clean structure, the satisfying symmetry. Engineers, designers, researchers, strategists — many of the world\'s deepest creatives work here.',
    strengths: ['Pattern recognition', 'Elegance-seeking', 'Systems thinking'],
    shadow: ['Over-analysing instead of acting', 'Can dismiss messy/intuitive work', 'Analysis paralysis'],
    affirmation: 'My creativity is pattern. Elegance is my medium.',
  },
};

// ---------------------------------------------------------------
// 10. Spiritual Type
// ---------------------------------------------------------------

export type SpiritualType = 'mystic' | 'ritualist' | 'seeker' | 'servant' | 'warrior';

export const spiritualQuiz: QuizDefinition = {
  id: 'spiritual-type-v1',
  type: 'extra-dimensional',
  title: 'Spiritual Type',
  description: 'Five ways of relating to the sacred, across all traditions: the Mystic (direct experience), the Ritualist (ceremony and form), the Seeker (study and questioning), the Servant (devotion through action), the Warrior (spiritual discipline as path). Fifteen questions to locate your home.',
  questions: [
    { id: 'ms1', text: 'I\'ve had experiences that felt directly spiritual — not mediated by tradition.', dimension: 'mystic', options: likert },
    { id: 'ms2', text: 'I feel closest to the sacred in silence.', dimension: 'mystic', options: likert },
    { id: 'ms3', text: 'Words feel inadequate for what I mean when I talk about the spiritual.', dimension: 'mystic', options: likert },
    { id: 'rt1', text: 'Ceremony, ritual, and tradition feed me.', dimension: 'ritualist', options: likert },
    { id: 'rt2', text: 'I find the sacred in candles, altars, prayers, repeated forms.', dimension: 'ritualist', options: likert },
    { id: 'rt3', text: 'I care about doing the practice right, not just vaguely.', dimension: 'ritualist', options: likert },
    { id: 'sk1', text: 'I\'m drawn to study spiritual texts and traditions.', dimension: 'seeker', options: likert },
    { id: 'sk2', text: 'I want to understand, not just feel.', dimension: 'seeker', options: likert },
    { id: 'sk3', text: 'I change traditions as I grow, without feeling unfaithful.', dimension: 'seeker', options: likert },
    { id: 'sv1', text: 'My spirituality lives in how I treat people.', dimension: 'servant', options: likert },
    { id: 'sv2', text: 'I feel most aligned when I\'m in service to others.', dimension: 'servant', options: likert },
    { id: 'sv3', text: 'Love-in-action is more real to me than belief.', dimension: 'servant', options: likert },
    { id: 'wr1', text: 'Discipline and practice — daily meditation, fasting, training — feels sacred.', dimension: 'warrior', options: likert },
    { id: 'wr2', text: 'I pursue spiritual growth the way others pursue athletic training.', dimension: 'warrior', options: likert },
    { id: 'wr3', text: 'An hour of disciplined practice feeds me more than an hour of reading about it.', dimension: 'warrior', options: likert },
  ],
};

export const SPIRITUAL_INFO: Record<SpiritualType, DimensionalResultInfo> = {
  mystic: {
    name: 'The Mystic',
    tagline: 'Direct experience — what words cannot hold.',
    summary: 'You have had or deeply want direct experience of the sacred — unmediated by dogma. Silence, nature, plant medicine, meditation, certain love. Your challenge: you can\'t explain your experiences to people who haven\'t had their own.',
    strengths: ['Direct knowing', 'Humility before mystery', 'Trust of experience'],
    shadow: ['Dismissing traditions that others need', 'Inability to share what you know', 'Isolation'],
    affirmation: 'What I know, I know directly. I hold it in silence and share it where it\'s welcome.',
  },
  ritualist: {
    name: 'The Ritualist',
    tagline: 'Sacred in form — candles, altars, ceremonies.',
    summary: 'The forms hold the meaning. Repeated prayer, ritual, ceremony, embodied tradition — these are your home. You know why liturgy exists. You feel the ancestor-chain of people who did this gesture before.',
    strengths: ['Continuity with tradition', 'Embodied practice', 'Depth through repetition'],
    shadow: ['Form without meaning (going through motions)', 'Judgement of less-structured paths', 'Rigidity'],
    affirmation: 'The forms hold. I make them living, not frozen.',
  },
  seeker: {
    name: 'The Seeker',
    tagline: 'Student of traditions — never quite done.',
    summary: 'You study. You read across traditions. You compare, question, collect. Each phase of your life has a different teacher. Your gift: you don\'t get trapped in any one box. Your risk: you skim many and land in none.',
    strengths: ['Intellectual rigour', 'Wide perspective', 'Questioning spirit'],
    shadow: ['Knowing about vs. knowing', 'Commitment-phobia', 'Using study to avoid practice'],
    affirmation: 'I study — and I also sit. Reading is not practice. Both matter.',
  },
  servant: {
    name: 'The Servant',
    tagline: 'Love in action — spirituality is what you do.',
    summary: 'Your path is service. Caring for the sick, raising kids, feeding hungry people, tending the dying. You find the sacred in the washing-up and the difficult conversation. You often have no patience for spiritual language — it\'s all just love expressed in action.',
    strengths: ['Embodied love', 'Integrity — walking the talk', 'Presence in the everyday'],
    shadow: ['Burnout from over-giving', 'Undervaluing your own spiritual nourishment', 'Martyrdom'],
    affirmation: 'My love is my practice. I receive as fully as I give.',
  },
  warrior: {
    name: 'The Warrior',
    tagline: 'Discipline as path — daily practice, no bypass.',
    summary: 'Your path is discipline. Daily sit. Fasting. Training. You understand that spiritual development is not about feelings — it\'s about what you do every morning at 5 AM. Your path looks grim to outsiders and is actually joyful to you.',
    strengths: ['Consistency', 'Embodied discipline', 'Depth through practice'],
    shadow: ['Spiritual athleticism — practice as ego', 'Judgement of less disciplined paths', 'Forgetting that discipline is a means, not the goal'],
    affirmation: 'My discipline is devotion. The practice is the path — and the path is also the love.',
  },
};

// ---------------------------------------------------------------
// Lookup tables (by quiz id) for the generic result renderer
// ---------------------------------------------------------------

import {
  EXTRA_QUIZZES_PART2,
  TIE_MARGIN,
  LOW_SIGNAL,
  likertMeans,
  rankDimensions,
  scoreMoodScreener,
  scoreEmpathHsp,
  scoreSelfCompassion,
} from './extraQuizzesPart2';
import { EXTRA_QUIZZES_PART3, scoreWellnessType } from './extraQuizzesPart3';
import type { QuizCategory } from './quizzes';

export const EXTRA_QUIZZES: QuizDefinition[] = [
  darkTriadQuiz,
  discQuiz,
  moneyQuiz,
  boundariesQuiz,
  burnoutQuiz,
  communicationQuiz,
  conflictQuiz,
  sleepQuiz,
  creativeQuiz,
  spiritualQuiz,
  ...Object.values(EXTRA_QUIZZES_PART2).map((e) => e.quiz),
  ...Object.values(EXTRA_QUIZZES_PART3).map((e) => e.quiz),
];

export interface ExtraQuizMetadata {
  timeEstimate: string;
  whatYouGet: string[];
  icon: string;
  color: string;
  category: QuizCategory;
}

const CATEGORY: Record<string, QuizCategory> = {
  'dark-triad-v1': 'personality',
  'disc-v1': 'personality',
  'money-personality-v1': 'personality',
  'boundaries-v1': 'relationships',
  'burnout-v1': 'wellbeing',
  'communication-v1': 'relationships',
  'conflict-v1': 'relationships',
  'chronotype-v1': 'wellbeing',
  'creative-type-v1': 'personality',
  'spiritual-type-v1': 'tarot-spirit',
  'jungian-functions-v1': 'personality',
  'love-styles-v1': 'relationships',
  'parenting-style-v1': 'relationships',
  'learning-style-v1': 'personality',
  'empath-hsp-v1': 'wellbeing',
  'self-compassion-v1': 'wellbeing',
  'mood-screener-v1': 'wellbeing',
  'anxiety-profile-v1': 'wellbeing',
  'leadership-style-v1': 'personality',
  'productivity-style-v1': 'personality',
  'relationship-readiness-v1': 'relationships',
  'wellness-type-v1': 'wellbeing',
};

const META: Record<string, Omit<ExtraQuizMetadata, 'category'>> = {
  'dark-triad-v1':         { timeEstimate: '4 min', whatYouGet: ['Your dominant shadow trait', 'Healthy and shadow forms of each', 'Integration affirmation'], icon: 'dark-triad', color: 'cosmic-rose' },
  'disc-v1':               { timeEstimate: '5 min', whatYouGet: ['Your workplace D/I/S/C profile', 'Strengths and blind spots', 'How to collaborate with other styles'], icon: 'briefcase', color: 'cosmic-blue' },
  'money-personality-v1':  { timeEstimate: '4 min', whatYouGet: ['Your money script', 'When it serves you and when it doesn\'t', 'Reframe affirmation'], icon: 'dollar-sign', color: 'teal' },
  'boundaries-v1':         { timeEstimate: '4 min', whatYouGet: ['Where your boundaries are firm, porous, or situational', 'Strengths of each pattern', 'One concrete practice to try'], icon: 'shield', color: 'cosmic-violet' },
  'burnout-v1':            { timeEstimate: '3 min', whatYouGet: ['Exhaustion vs cynicism vs efficacy-loss profile', 'Which dimension needs your attention first', 'A next-step affirmation'], icon: 'flame', color: 'coral' },
  'communication-v1':      { timeEstimate: '3 min', whatYouGet: ['Your default style under stress', 'When you flex to assertive', 'A practice for the hard conversations'], icon: 'message-circle', color: 'cosmic-blue' },
  'conflict-v1':           { timeEstimate: '4 min', whatYouGet: ['Your Thomas-Kilmann conflict mode', 'When each mode serves you', 'Which modes to practice'], icon: 'swords', color: 'cosmic-rose' },
  'chronotype-v1':         { timeEstimate: '4 min', whatYouGet: ['Your Breus chronotype — Lion/Bear/Wolf/Dolphin', 'Your natural peak hours', 'Sleep + schedule tips that actually suit you'], icon: 'chronotype', color: 'cosmic-blue' },
  'creative-type-v1':      { timeEstimate: '4 min', whatYouGet: ['Your role in the creative process', 'Who you partner best with', 'Where you might get stuck'], icon: 'palette', color: 'teal' },
  'spiritual-type-v1':     { timeEstimate: '4 min', whatYouGet: ['Your path of practice — Mystic / Ritualist / Seeker / Servant / Warrior', 'Strengths and shadows of your path', 'Affirmation for the next step'], icon: 'sparkles', color: 'gold' },
  'jungian-functions-v1':  { timeEstimate: '3 min', whatYouGet: ['Your dominant Jungian cognitive function', 'How it shapes your MBTI', 'Shadow + integration'], icon: 'jungian-functions', color: 'cosmic-blue' },
  'love-styles-v1':        { timeEstimate: '3 min', whatYouGet: ['Which of 4 Greek love styles you lead with', 'Strengths + shadow', 'Affirmation to carry'], icon: 'love-styles-icon', color: 'cosmic-rose' },
  'parenting-style-v1':    { timeEstimate: '3 min', whatYouGet: ['Your default style (authoritative / authoritarian / permissive / neglectful)', 'What research says', 'Affirmation'], icon: 'home', color: 'teal' },
  'learning-style-v1':     { timeEstimate: '3 min', whatYouGet: ['Your VARK style', 'How you best take in information', 'Study + work tips'], icon: 'book-open', color: 'gold' },
  'empath-hsp-v1':         { timeEstimate: '3 min', whatYouGet: ['Empath, HSP, both, or neither', 'What each means neurologically', 'Practical self-care'], icon: 'empath-hsp-icon', color: 'cosmic-violet' },
  'self-compassion-v1':    { timeEstimate: '3 min', whatYouGet: ['Your dominant self-compassion stance', 'Where you self-judge vs self-kind', 'Next-step affirmation'], icon: 'self-compassion-icon', color: 'cosmic-rose' },
  'mood-screener-v1':      { timeEstimate: '3 min', whatYouGet: ['A 2-week mood signal read', 'NON-diagnostic self-reflection', 'Crisis resources if needed'], icon: 'activity', color: 'cosmic-blue' },
  'anxiety-profile-v1':       { timeEstimate: '3 min', whatYouGet: ['Where anxiety shows up for you', 'What tools tend to work', 'Non-diagnostic self-reflection'],   icon: 'wind',         color: 'cosmic-blue' },
  'leadership-style-v1':      { timeEstimate: '3 min', whatYouGet: ['Your default leadership mode', 'Who to pair with', 'Where the style breaks'],                     icon: 'compass',      color: 'gold' },
  'productivity-style-v1':    { timeEstimate: '3 min', whatYouGet: ['Your work-rhythm profile', 'Ideal environment', 'What to stop forcing'],                          icon: 'settings',     color: 'teal' },
  'relationship-readiness-v1':{ timeEstimate: '3 min', whatYouGet: ['Where you are in readiness', 'What to tend first', 'Non-judgmental mirror'],                      icon: 'relationship-readiness-icon', color: 'cosmic-rose' },
  'wellness-type-v1':         { timeEstimate: '3 min', whatYouGet: ['How you best restore', 'Which tools work for you', 'How to design your week'],                    icon: 'leaf',         color: 'teal' },
};

export const EXTRA_QUIZ_METADATA: Record<string, ExtraQuizMetadata> = Object.fromEntries(
  Object.entries(META).map(([id, m]) => [id, { ...m, category: CATEGORY[id] ?? 'personality' }]),
);

/**
 * Per-quiz scoring entry. `dimensions` are the scored dimensions — the
 * ones the score bars draw. `info` holds a card for every result key, which
 * may include keys that are not dimensions (`low`, `both`, `neither`,
 * `balanced`, the self-compassion bands). No emoji: the quiz's drawn glyph
 * (metadata.icon → QuizIcons) is the medallion.
 */
export interface QuizScoringEntry {
  dimensions: readonly string[];
  info: Record<string, DimensionalResultInfo>;
  /** Returned instead of the top dimension when the highest Likert mean is below LOW_SIGNAL. */
  lowResult?: string;
  /** Bar labels for dimensions that are not result keys (self-compassion's six components). */
  dimensionLabels?: Record<string, string>;
}

export const EXTRA_QUIZ_SCORING: Record<string, QuizScoringEntry> = {
  'dark-triad-v1':        { dimensions: ['narcissism', 'machiavellianism', 'psychopathy'], info: DARK_TRIAD_INFO, lowResult: 'low' },
  'disc-v1':              { dimensions: ['dominance', 'influence', 'steadiness', 'conscientiousness'], info: DISC_INFO },
  'money-personality-v1': { dimensions: ['saver', 'spender', 'avoider', 'monk', 'status'], info: MONEY_INFO },
  'boundaries-v1':        { dimensions: ['rigid', 'porous', 'healthy', 'situational'], info: BOUNDARIES_INFO },
  'burnout-v1':           { dimensions: ['exhaustion', 'cynicism', 'efficacy-loss'], info: BURNOUT_INFO, lowResult: 'low' },
  'communication-v1':     { dimensions: ['passive', 'aggressive', 'passive-aggressive', 'assertive'], info: COMM_INFO },
  'conflict-v1':          { dimensions: ['competing', 'collaborating', 'compromising', 'avoiding', 'accommodating'], info: CONFLICT_INFO },
  'chronotype-v1':        { dimensions: ['lion', 'bear', 'wolf', 'dolphin'], info: CHRONOTYPE_INFO },
  'creative-type-v1':     { dimensions: ['maker', 'dreamer', 'performer', 'organiser', 'analyser'], info: CREATIVE_INFO },
  'spiritual-type-v1':    { dimensions: ['mystic', 'ritualist', 'seeker', 'servant', 'warrior'], info: SPIRITUAL_INFO },
  ...Object.fromEntries(
    Object.entries(EXTRA_QUIZZES_PART2).map(([id, cfg]) => [
      id,
      {
        dimensions: cfg.dimensions as unknown as readonly string[],
        info: cfg.info,
        lowResult: 'lowResult' in cfg ? cfg.lowResult : undefined,
        dimensionLabels: 'dimensionLabels' in cfg ? cfg.dimensionLabels : undefined,
      },
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(EXTRA_QUIZZES_PART3).map(([id, cfg]) => [
      id,
      {
        dimensions: cfg.dimensions as unknown as readonly string[],
        info: cfg.info,
        lowResult: 'lowResult' in cfg ? cfg.lowResult : undefined,
      },
    ]),
  ),
};

/**
 * Quizzes whose result is not "the dimension with the highest mean": the
 * PHQ-2 screener (validated cutoff first), empath/HSP (both / neither are
 * derived), self-compassion (a total, banded), boundaries (healthy and
 * situational are derived) and wellness (balanced is derived).
 */
const DEDICATED_SCORERS: Record<string, (answers: Record<string, number>) => DimensionalResult> = {
  'mood-screener-v1': scoreMoodScreener,
  'empath-hsp-v1': scoreEmpathHsp,
  'self-compassion-v1': scoreSelfCompassion,
  'boundaries-v1': scoreBoundaries,
  'wellness-type-v1': scoreWellnessType,
};

export function calculateExtraQuiz(quizId: string, answers: Record<string, number>): DimensionalResult | null {
  const entry = EXTRA_QUIZ_SCORING[quizId];
  if (!entry) return null;
  const dedicated = DEDICATED_SCORERS[quizId];
  if (dedicated) return dedicated(answers);
  const quiz = EXTRA_QUIZZES.find((q) => q.id === quizId);
  if (!quiz) return null;
  const result = calculateDimensional(quiz, answers, entry.dimensions as string[]);
  // A flat or all-low profile is not "strongest around narcissism"; when
  // nothing is elevated the honest answer is the low card.
  if (entry.lowResult && result.averages[result.primary] < LOW_SIGNAL) {
    return { ...result, primary: entry.lowResult, isTie: false, secondary: undefined };
  }
  return result;
}
