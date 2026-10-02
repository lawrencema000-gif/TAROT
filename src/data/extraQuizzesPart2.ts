// Sprint 7 — 10 additional quizzes extending extraQuizzes.ts.
//
// Same Likert 1-5 + dimensional-result pattern. Exported alongside
// EXTRA_QUIZZES to keep the runner logic unchanged.

import type { QuizDefinition } from '../types';
// Type-only imports — keep them type-only: extraQuizzes.ts imports this
// module at runtime (EXTRA_QUIZZES_PART2), so a runtime import back the
// other way would create a circular dependency.
import type { DimensionalResult, DimensionalResultInfo } from './extraQuizzes';

const likert = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' },
];
// Reverse-keyed: "Strongly disagree" records 5. The option ORDER stays the
// same on screen; only the recorded value flips, so a yea-sayer no longer
// inflates every dimension together (F6).
const likertRev = [
  { value: 5, label: 'Strongly Disagree' },
  { value: 4, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 2, label: 'Agree' },
  { value: 1, label: 'Strongly Agree' },
];

// ---------------------------------------------------------------
// Shared scoring helpers (imported by extraQuizzes.ts and Part3 — this
// module is the leaf of the three, so it is the one that can be shared).
// ---------------------------------------------------------------

/** Two Likert means this close are a tie: the screen names both dimensions. */
export const TIE_MARGIN = 0.25;
/** Below this top mean nothing is elevated; shadow-flavoured quizzes return their `low` card. */
export const LOW_SIGNAL = 2.5;

/** Raw sum and Likert mean per dimension over the items that were answered. */
export function likertMeans<K extends string>(
  quiz: QuizDefinition,
  answers: Record<string, number>,
  dimensions: readonly K[],
): { scores: Record<K, number>; averages: Record<K, number>; counts: Record<K, number> } {
  const scores = Object.fromEntries(dimensions.map((d) => [d, 0])) as Record<K, number>;
  const counts = Object.fromEntries(dimensions.map((d) => [d, 0])) as Record<K, number>;
  for (const q of quiz.questions) {
    const v = answers[q.id];
    if (v === undefined || !q.dimension) continue;
    const dim = q.dimension as K;
    if (dim in scores) {
      scores[dim] += v;
      counts[dim] += 1;
    }
  }
  const averages = Object.fromEntries(
    dimensions.map((d) => [d, counts[d] > 0 ? scores[d] / counts[d] : 0]),
  ) as Record<K, number>;
  return { scores, averages, counts };
}

/**
 * Highest mean wins; declared order breaks an exact tie but the tie is
 * reported. `margin` is top minus runner-up; `isTie` when it is within
 * TIE_MARGIN.
 */
export function rankDimensions<K extends string>(
  averages: Record<K, number>,
  dimensions: readonly K[],
): { primary: K; secondary?: K; margin: number; isTie: boolean } {
  const ranked = [...dimensions].sort((a, b) => averages[b] - averages[a]);
  const primary = ranked[0];
  const secondary = ranked[1];
  const margin = secondary === undefined ? 0 : averages[primary] - averages[secondary];
  const isTie = secondary !== undefined && margin <= TIE_MARGIN;
  return { primary, secondary: isTie ? secondary : undefined, margin, isTie };
}

// 1. Jungian Cognitive Functions ----------------------------------
export type JungianFunc = 'Ni' | 'Ne' | 'Si' | 'Se' | 'Ti' | 'Te' | 'Fi' | 'Fe';

export const jungianQuiz: QuizDefinition = {
  id: 'jungian-functions-v1',
  type: 'extra-dimensional',
  title: 'Jungian Cognitive Functions',
  description: 'MBTI letters tell you the preference. Jungian functions tell you the *stack* — which mental process you lead with. Sixteen questions to find your dominant function.',
  questions: [
    { id: 'ni1', text: 'I often sense how a situation will end long before the evidence is in.', dimension: 'Ni', options: likert },
    { id: 'ni2', text: 'I get single, clear visions of how things will unfold long-term.', dimension: 'Ni', options: likert },
    { id: 'ne1', text: 'My mind jumps between unrelated ideas and finds connections others miss.', dimension: 'Ne', options: likert },
    { id: 'ne2', text: 'I thrive on brainstorming many possibilities — more than executing one.', dimension: 'Ne', options: likert },
    { id: 'si1', text: 'I remember sensory details (smells, textures, exact phrases) from long ago.', dimension: 'Si', options: likert },
    { id: 'si2', text: 'I prefer methods that have proven themselves over time.', dimension: 'Si', options: likert },
    { id: 'se1', text: 'I\'m sharp and present in my body — fast reflexes, direct engagement with the physical world.', dimension: 'Se', options: likert },
    { id: 'se2', text: 'I notice small physical details in a room — the light, a texture, who has moved.', dimension: 'Se', options: likert },
    { id: 'ti1', text: 'I quietly build logical frameworks in my head and test every claim against them.', dimension: 'Ti', options: likert },
    { id: 'ti2', text: 'An explanation has to be internally consistent before I accept it, no matter who says it.', dimension: 'Ti', options: likert },
    { id: 'te1', text: 'I organise the external world — projects, people, systems — into efficient structures.', dimension: 'Te', options: likert },
    { id: 'te2', text: 'I judge a plan by whether it gets results, not by how it feels.', dimension: 'Te', options: likert },
    { id: 'fi1', text: 'My values are deeply felt and non-negotiable, even if I don\'t explain them.', dimension: 'Fi', options: likert },
    { id: 'fi2', text: 'I decide what is right for me by how it sits with my conscience, not by what others expect.', dimension: 'Fi', options: likert },
    { id: 'fe1', text: 'I read a group\'s emotional weather fast and adjust to keep harmony.', dimension: 'Fe', options: likert },
    { id: 'fe2', text: 'I adjust my tone and words to what the people around me need to hear.', dimension: 'Fe', options: likert },
  ],
};

export const JUNGIAN_INFO: Record<JungianFunc, DimensionalResultInfo> = {
  Ni: { name: 'Introverted Intuition (Ni)', tagline: 'Inner vision — sees the single thread through the tangle.', summary: 'Ni-dominants live in a single internal vision of how things will unfold. You often "just know" where something is heading. INFJs and INTJs lead with Ni.', strengths: ['Long-range foresight', 'Single-focus vision', 'Pattern synthesis'], shadow: ['Stubborn attachment to one interpretation', 'Missing present-moment data', 'Lonely in the private vision'], affirmation: 'I see what I see — and I check it against what is actually here.' },
  Ne: { name: 'Extraverted Intuition (Ne)', tagline: 'Outer possibility — many threads, all tugging at once.', summary: 'Ne sees possibilities everywhere. You jump between ideas, synthesise broad patterns, and think in "what if." ENTPs and ENFPs lead with Ne.', strengths: ['Ideation', 'Connection-making', 'Adaptability'], shadow: ['Finishing nothing', 'Restlessness', 'Novelty addiction'], affirmation: 'My hundred ideas are real — I choose one and see what it becomes.' },
  Si: { name: 'Introverted Sensing (Si)', tagline: 'Memory palace — the body of past experience.', summary: 'Si stores exact sensory detail of what happened before. You learn from "last time I did this" and you trust proven methods. ISTJs and ISFJs lead with Si.', strengths: ['Reliability', 'Detailed memory', 'Tradition-keeping'], shadow: ['Resistance to new methods', 'Nostalgia as strategy', 'Bodily contraction under novelty'], affirmation: 'I honour what I have learned — and I stay open to what my body hasn\'t felt yet.' },
  Se: { name: 'Extraverted Sensing (Se)', tagline: 'Present moment — sharp, alive, right here.', summary: 'Se is fully present in the physical now. Sharp reflexes, aesthetic intelligence, performance under pressure. ESTPs and ESFPs lead with Se.', strengths: ['Presence', 'Physical skill', 'Improvisation'], shadow: ['Impulse chasing', 'Missing long-range consequences', 'Restless without stimulation'], affirmation: 'I am here now — and I can also plan for a future I won\'t feel until it arrives.' },
  Ti: { name: 'Introverted Thinking (Ti)', tagline: 'Internal logic — "does this actually make sense?"', summary: 'Ti builds private frameworks and tests every claim against them. Truth-seeking through precision. INTPs and ISTPs lead with Ti.', strengths: ['Precision', 'Analytical rigour', 'Sceptical independence'], shadow: ['Over-analysis', 'Coldness', 'Refusing to commit until the framework is perfect'], affirmation: 'My rigour serves truth — and truth does not require everything to be resolved first.' },
  Te: { name: 'Extraverted Thinking (Te)', tagline: 'Systems — "how do we actually execute this?"', summary: 'Te organises the external world into efficient structures. Projects ship, teams deliver, and the messy becomes tidy. ENTJs and ESTJs lead with Te.', strengths: ['Execution', 'Organisation', 'Decisiveness'], shadow: ['Running over softer inputs', 'Mistaking efficient for right', 'Impatience'], affirmation: 'I organise the world toward outcomes — and I slow down when outcomes need something I can\'t organise.' },
  Fi: { name: 'Introverted Feeling (Fi)', tagline: 'Inner values — quiet, deep, non-negotiable.', summary: 'Fi is your internal compass of values. You know what is right for you even if you can\'t explain it. INFPs and ISFPs lead with Fi.', strengths: ['Integrity', 'Authenticity', 'Deep personal values'], shadow: ['Feeling misunderstood', 'Inability to explain your compass to others', 'Rigidity when your values feel threatened'], affirmation: 'My values are mine — I walk them into the world without needing everyone to share them.' },
  Fe: { name: 'Extraverted Feeling (Fe)', tagline: 'Shared harmony — the emotional weather of the room.', summary: 'Fe reads group emotional dynamics fast and works for harmony. Your decisions include everyone\'s feelings. ENFJs and ESFJs lead with Fe.', strengths: ['Emotional attunement', 'Group cohesion', 'Warm social leadership'], shadow: ['Losing self in others\' emotions', 'Avoiding necessary conflict', 'Exhaustion from emotional labour'], affirmation: 'I tend the room — and I remember my own feelings count in the weather too.' },
};

// 2. Love Styles (Esther Perel-informed) --------------------------
export type LoveStyle = 'eros' | 'philia' | 'storge' | 'agape';

export const loveStylesQuiz: QuizDefinition = {
  id: 'love-styles-v1',
  type: 'extra-dimensional',
  title: 'Love Styles',
  description: 'Four ancient ways of loving, from the Greeks: Eros (passion), Philia (friendship), Storge (family/familiar), Agape (unconditional). Twelve questions to find your dominant style.',
  questions: [
    { id: 'er1', text: 'When I fall, I fall hard — physical, passionate, consuming.', dimension: 'eros', options: likert },
    { id: 'er2', text: 'Sensual connection is essential for me to feel loved.', dimension: 'eros', options: likert },
    { id: 'er3', text: 'Desire — wanting and being wanted — is at the centre of love for me.', dimension: 'eros', options: likert },
    { id: 'ph1', text: 'I am most drawn to people I can talk with for hours.', dimension: 'philia', options: likert },
    { id: 'ph2', text: 'I need to respect someone as a person before I can love them as a partner.', dimension: 'philia', options: likert },
    { id: 'ph3', text: 'Shared values and conversation feed me more than grand romance.', dimension: 'philia', options: likert },
    { id: 'st1', text: 'Love grows slowly, through familiarity, not lightning strikes.', dimension: 'storge', options: likert },
    { id: 'st2', text: 'The love I trust most grows out of long familiarity rather than a sudden spark.', dimension: 'storge', options: likert },
    { id: 'st3', text: 'Comfortable, steady, familiar love is what I actually want.', dimension: 'storge', options: likert },
    { id: 'ag1', text: 'I love even when I don\'t get love back — it\'s a choice, not a transaction.', dimension: 'agape', options: likert },
    { id: 'ag2', text: 'My love is at its best when it expects nothing.', dimension: 'agape', options: likert },
    { id: 'ag3', text: 'I tend to see the divine or sacred in those I love.', dimension: 'agape', options: likert },
  ],
};

export const LOVE_STYLES_INFO: Record<LoveStyle, DimensionalResultInfo> = {
  eros: { name: 'Eros', tagline: 'Passion, desire, the sacred fire.', summary: 'Your love is passionate, embodied, consuming. When you love, you love with your whole body and soul. This is the love of poets and lovers — electric, dangerous, life-giving.', strengths: ['Deep passion', 'Embodied presence', 'Willingness to feel fully'], shadow: ['Intensity that scares partners', 'Dependence on the "spark"', 'Shorter-lasting love if not balanced with other styles'], affirmation: 'My fire is a gift — and I tend it for the long road, not just the spark.' },
  philia: { name: 'Philia', tagline: 'Love between equals — deep friendship.', summary: 'Your love is built on respect, conversation, shared values, intellectual partnership. You want to be with someone you genuinely admire and who admires you. This is the love that ages best.', strengths: ['Durability', 'Mutual respect', 'Shared intellectual life'], shadow: ['Missing the erotic spark', 'Keeping relationships "safe" when they need heat', 'Treating a romantic partner like a friend alone'], affirmation: 'My friendship is the foundation — and I let the fire live alongside it.' },
  storge: { name: 'Storge', tagline: 'Familiar love — grows slowly, roots deep.', summary: 'Your love is the love of family, of gradual familiarity, of hearth and home. You tend to fall for people who become familiar to you over time — best friends who slowly become more, neighbours, colleagues.', strengths: ['Stability', 'Deep attachment', 'Trustworthy partnership'], shadow: ['Mistaking comfort for love', 'Staying too long in what\'s familiar', 'Risk-aversion around new connection'], affirmation: 'My love is the slow warmth — and I remember warmth can still surprise.' },
  agape: { name: 'Agape', tagline: 'Unconditional love — loving without demand.', summary: 'Your love does not depend on what you receive. You love as an act of giving, often finding the sacred in your partner. At best this is transcendent; at worst, one-sided.', strengths: ['Unconditional giving', 'Capacity for spiritual connection', 'Resilience through hard times'], shadow: ['One-sided relationships', 'Martyrdom', 'Not receiving what you need'], affirmation: 'I give love freely — and I also deserve to be loved back.' },
};

// 3. Parenting Style ----------------------------------------------
export type ParentingStyle = 'authoritative' | 'authoritarian' | 'permissive' | 'neglectful';

export const parentingQuiz: QuizDefinition = {
  id: 'parenting-style-v1',
  type: 'extra-dimensional',
  title: 'Parenting Style',
  description: 'Baumrind\'s four parenting styles crossed with modern research. Twelve questions to surface your default approach, whether you\'re parenting actual kids or metaphorically parenting people at work.',
  questions: [
    { id: 'av1', text: 'I set firm rules but explain the reasoning behind them.', dimension: 'authoritative', options: likert },
    { id: 'av2', text: 'I listen to disagreement and sometimes change my mind.', dimension: 'authoritative', options: likert },
    { id: 'av3', text: 'I hold high standards and offer warm support to reach them.', dimension: 'authoritative', options: likert },
    { id: 'ar1', text: 'Rules are rules — I shouldn\'t have to explain them.', dimension: 'authoritarian', options: likert },
    { id: 'ar2', text: 'Respect for authority is non-negotiable.', dimension: 'authoritarian', options: likert },
    { id: 'ar3', text: 'Discipline should be swift and consistent.', dimension: 'authoritarian', options: likert },
    { id: 'pm1', text: 'I avoid conflict by letting most things slide.', dimension: 'permissive', options: likert },
    { id: 'pm2', text: 'I want to be liked more than I want to be obeyed.', dimension: 'permissive', options: likert },
    { id: 'pm3', text: 'Rules feel like barriers to a good relationship.', dimension: 'permissive', options: likert },
    { id: 'ng1', text: 'I often do not know what the people I am responsible for are dealing with.', dimension: 'neglectful', options: likert },
    { id: 'ng2', text: 'I don\'t have much energy to follow up on things consistently.', dimension: 'neglectful', options: likert },
    { id: 'ng3', text: 'I am usually preoccupied with my own concerns and miss what others need from me.', dimension: 'neglectful', options: likert },
  ],
};

export const PARENTING_INFO: Record<ParentingStyle, DimensionalResultInfo> = {
  authoritative: { name: 'Authoritative', tagline: 'High warmth + high structure — research gold standard.', summary: 'You set firm boundaries AND explain them. You listen AND decide. Research consistently names this as the style that produces the most resilient children and high-functioning teams. It\'s also the hardest — it requires both warmth and spine.', strengths: ['Balance of support and standards', 'Builds secure attachment', 'Raises resilience'], shadow: ['Exhausting to sustain', 'Can slip into authoritarian under stress', 'High self-awareness required daily'], affirmation: 'I hold the line and I hold the hand. Both at once, because both matter.' },
  authoritarian: { name: 'Authoritarian', tagline: 'High structure + low warmth — demands obedience.', summary: 'You set rules and expect compliance. Obedience matters more than understanding. Short-term this produces compliance; long-term it produces kids/teams who either rebel or become anxious pleasers. Works in genuine crisis. Less in daily life.', strengths: ['Clear expectations', 'Fast compliance under crisis', 'Reliability'], shadow: ['Rebellion or fragility in those you raise', 'Relationships become transactional', 'Loneliness in the role'], affirmation: 'My firmness is a gift — and I soften it without losing it, because warmth doesn\'t weaken the rule.' },
  permissive: { name: 'Permissive', tagline: 'High warmth + low structure — avoids conflict.', summary: 'You prioritize closeness over rules. You want to be liked. Kids raised this way often struggle with boundaries and self-regulation because no one taught them the boundary from outside.', strengths: ['Warm presence', 'Easy rapport', 'Non-authoritarian'], shadow: ['Missing structure those you love actually need', 'Resentment building when you finally have to enforce', 'Their self-regulation underdeveloped'], affirmation: 'My love includes holding the line — saying no is also love.' },
  neglectful: { name: 'Neglectful', tagline: 'Low warmth + low structure — absent.', summary: 'You are often not fully present — overwhelm, work or your own history take up the room. This pattern has the hardest outcomes of the four, and it is also the one that shifts most when attention returns.', strengths: ['Independence they develop early', 'Low conflict (nothing to conflict about)'], shadow: ['Deep loneliness in those you raise', 'Attachment wounds that echo for life', 'Pattern may be inherited'], affirmation: 'Being present is the first gift — I show up for myself so I can show up for them.' },
};

// 4. Learning Style (VARK) ----------------------------------------
export type VarkStyle = 'visual' | 'auditory' | 'reading' | 'kinesthetic';

export const learningQuiz: QuizDefinition = {
  id: 'learning-style-v1',
  type: 'extra-dimensional',
  title: 'Learning Style (VARK)',
  description: 'Four preferred channels for taking in information — Visual, Auditory, Reading/Writing, Kinesthetic. Twelve questions map your preference. Research does not show that matching teaching to a preferred style improves learning, so treat this as a map of what feels natural, not a prescription.',
  questions: [
    { id: 'vs1', text: 'Diagrams, charts, and mind maps help me understand better than text.', dimension: 'visual', options: likert },
    { id: 'vs2', text: 'I visualise what I read — I have to "see" it to get it.', dimension: 'visual', options: likert },
    { id: 'vs3', text: 'I remember where I saw something on a page long after.', dimension: 'visual', options: likert },
    { id: 'au1', text: 'I learn best when I can hear someone explain it.', dimension: 'auditory', options: likert },
    { id: 'au2', text: 'Podcasts and audiobooks stick with me more than reading.', dimension: 'auditory', options: likert },
    { id: 'au3', text: 'I think out loud — talking helps me figure things out.', dimension: 'auditory', options: likert },
    { id: 're1', text: 'I prefer to read about something rather than be shown.', dimension: 'reading', options: likert },
    { id: 're2', text: 'I take detailed written notes to really learn.', dimension: 'reading', options: likert },
    { id: 're3', text: 'Well-written documents teach me best.', dimension: 'reading', options: likert },
    { id: 'ki1', text: 'I learn best by doing it myself, hands-on.', dimension: 'kinesthetic', options: likert },
    { id: 'ki2', text: 'I fidget, pace, or use my body while thinking.', dimension: 'kinesthetic', options: likert },
    { id: 'ki3', text: 'Trial and error is my preferred way to figure things out.', dimension: 'kinesthetic', options: likert },
  ],
};

export const VARK_INFO: Record<VarkStyle, DimensionalResultInfo> = {
  visual: { name: 'Visual', tagline: 'You learn through pictures, diagrams, spatial layouts.', summary: 'You think in pictures. Charts, mind maps, infographics, and spatial arrangements are how you process information. Good notes for you are colour-coded, visual, hierarchical.', strengths: ['Pattern recognition', 'Spatial intelligence', 'Mental imagery'], shadow: ['Lose interest in dense plain text', 'Disoriented when information is purely verbal'], affirmation: 'I think in pictures — I build diagrams of what others explain in sentences.' },
  auditory: { name: 'Auditory', tagline: 'You learn through sound, conversation, listening.', summary: 'You learn by hearing. Lectures, podcasts, conversation, and thinking-out-loud are your best tools. Reading aloud helps you. Silent rooms slow you down.', strengths: ['Memory for dialogue', 'Rhythmic thinking', 'Listening comprehension'], shadow: ['Hard to focus in silence', 'Written-only material feels inert', 'Zoning out in visual-heavy environments'], affirmation: 'I learn through the voice — I read aloud, talk it through, listen carefully.' },
  reading: { name: 'Reading/Writing', tagline: 'You learn through written words.', summary: 'Text is your medium. Books, articles, written notes, and essays are how you build understanding. You prefer reading the manual to being shown.', strengths: ['Strong writing skills', 'Precision with language', 'Systematic study'], shadow: ['Can miss tactile/physical nuance', 'Intellectualise rather than embody', 'Slow to trust what is not written down'], affirmation: 'Text is my home — and I also step into the body and the room when the room has something to teach me.' },
  kinesthetic: { name: 'Kinesthetic', tagline: 'You learn by doing — body-first.', summary: 'You learn through doing. Experiments, simulations, lab work, building things. You think with your hands. Instructions help; doing it once helps more.', strengths: ['Deep muscle memory', 'Rapid iteration', 'Hands-on mastery'], shadow: ['Impatient with theory', 'Struggle in abstract-only environments', 'Sometimes skip necessary foundations to just start'], affirmation: 'My hands know — I learn by moving, making, failing, and moving again.' },
};

// 5. Empath vs HSP ------------------------------------------------
export type EmpathType = 'empath' | 'hsp' | 'both' | 'neither';

export const empathQuiz: QuizDefinition = {
  id: 'empath-hsp-v1',
  type: 'extra-dimensional',
  title: 'Empath vs. Highly Sensitive Person',
  description: 'The words "empath" and "HSP" are often used interchangeably but describe different phenomena. Twelve questions to help you see which one fits (you might be neither, one, or both).',
  questions: [
    { id: 'em1', text: 'I feel other people\'s emotions in my body as if they were my own.', dimension: 'empath', options: likert },
    { id: 'em2', text: 'I can walk into a room and feel the emotional charge before anyone speaks.', dimension: 'empath', options: likert },
    { id: 'em3', text: 'Being around people in pain exhausts me even if I don\'t interact much.', dimension: 'empath', options: likert },
    { id: 'hs1', text: 'Loud sounds, bright lights, strong smells overwhelm me more than most.', dimension: 'hsp', options: likert },
    { id: 'hs2', text: 'I notice subtleties (shifts in tone, small changes in environment) that others miss.', dimension: 'hsp', options: likert },
    { id: 'hs3', text: 'I need more alone time than average to regulate.', dimension: 'hsp', options: likert },
    // "both" and "neither" are DERIVED from the two traits, not traits of
    // their own, so these six items feed empath or hsp (three of them
    // reverse-keyed) and scoreEmpathHsp decides the quadrant.
    { id: 'bt1', text: 'Crowded places overwhelm my senses.', dimension: 'hsp', options: likert },
    { id: 'bt2', text: 'I need downtime after busy environments to recover fully.', dimension: 'hsp', options: likert },
    { id: 'bt3', text: 'Stories of other people\'s suffering can colour my whole day.', dimension: 'empath', options: likert },
    { id: 'nn1', text: 'Loud, crowded, intense situations energise me.', dimension: 'hsp', options: likertRev },
    { id: 'nn2', text: 'I do not pick up on other people\'s moods until they tell me.', dimension: 'empath', options: likertRev },
    { id: 'nn3', text: 'I can take a lot of sensory input without needing recovery time.', dimension: 'hsp', options: likertRev },
  ],
};

/**
 * Empath = mean of the five emotional-contagion items, HSP = mean of the
 * seven sensory-processing items (both include their reverse-keyed
 * items). Both when both means exceed 3.5; neither when both are at or
 * below 3; otherwise the higher trait, with a tie flagged when they are
 * within TIE_MARGIN.
 */
export function scoreEmpathHsp(answers: Record<string, number>): DimensionalResult<EmpathType> {
  const dims = ['empath', 'hsp'] as const;
  const { scores, averages } = likertMeans(empathQuiz, answers, dims);
  const { empath, hsp } = averages;
  let primary: EmpathType;
  if (empath > 3.5 && hsp > 3.5) primary = 'both';
  else if (empath <= 3 && hsp <= 3) primary = 'neither';
  else primary = empath >= hsp ? 'empath' : 'hsp';
  const margin = Math.abs(empath - hsp);
  const isTie = (primary === 'empath' || primary === 'hsp') && margin <= TIE_MARGIN;
  const secondary: EmpathType | undefined = isTie ? (primary === 'empath' ? 'hsp' : 'empath') : undefined;
  return { primary, scores, averages, isTie, margin, secondary };
}

export const EMPATH_INFO: Record<EmpathType, DimensionalResultInfo> = {
  empath: { name: 'Empath', tagline: 'You absorb emotional fields, not just sensory input.', summary: 'Your core sensitivity is EMOTIONAL. You pick up other people\'s feelings and often carry them as your own. This is a gift and a burden. Learning to distinguish "mine" from "theirs" is the practice.', strengths: ['Deep attunement to others', 'Natural healer presence', 'Strong intuition about people'], shadow: ['Carrying other people\'s emotions home', 'Boundary confusion', 'Exhaustion from unprocessed emotional absorption'], affirmation: 'I feel what others feel — and I can return what isn\'t mine.' },
  hsp: { name: 'Highly Sensitive Person (HSP)', tagline: 'You process sensory input deeply.', summary: 'Your core sensitivity is SENSORY + INFORMATIONAL. You notice subtleties, process deeply, and get overwhelmed by high-stimulation environments. ~20% of people are HSPs. It\'s a neurological trait, not a flaw.', strengths: ['Depth of processing', 'Aesthetic sensitivity', 'Thoughtful decision-making'], shadow: ['Overwhelm in loud/bright environments', 'Need for recovery time', 'Easy to mislabel as "shy" or "anxious"'], affirmation: 'My nervous system needs what it needs — I design my life around what actually works for me.' },
  both: { name: 'Both Empath + HSP', tagline: 'Emotional absorption plus deep sensory processing.', summary: 'You have both traits. Emotional fields AND sensory environments hit you hard. This is a rich and demanding combination. Most "I\'m so exhausted after parties" people sit here.', strengths: ['Profound attunement', 'Artistic depth', 'Healing presence'], shadow: ['Deep exhaustion', 'Chronic overwhelm if you don\'t actively manage it', 'Life design must be careful'], affirmation: 'I am built for depth — I protect my rhythm so the depth keeps giving.' },
  neither: { name: 'Neither — Resilient Sensitivity', tagline: 'You\'re relatively resilient to emotional and sensory input.', summary: 'You\'re not highly sensitive in the empath or HSP sense. You handle emotional and sensory intensity well. This doesn\'t mean you don\'t care — it means you\'re not flooded by what floods others.', strengths: ['Resilience in high-stimulation environments', 'Less prone to overwhelm', 'Can be a stabiliser for more sensitive people'], shadow: ['Might underestimate what others are handling', 'Can be dismissive of sensitivity in others'], affirmation: 'My resilience is real — and I respect that others experience more than I feel.' },
};

// 6. Self-Compassion ----------------------------------------------
// Neff's six components (self-kindness ↔ self-judgment, common humanity ↔
// isolation, mindfulness ↔ over-identification), original wording. The
// result is a banded TOTAL, as the construct is defined, plus the weakest
// component as the place to practise.
export type SelfCompassionType = 'low' | 'moderate' | 'high';
export type SelfCompassionComponent = 'self-kind' | 'self-judging' | 'mindful' | 'over-identified' | 'common-humanity' | 'isolation';

export const SELF_COMPASSION_COMPONENTS: readonly SelfCompassionComponent[] = [
  'self-kind', 'self-judging', 'common-humanity', 'isolation', 'mindful', 'over-identified',
];

/** Bar labels for the six components (the result cards are keyed by band, not component). */
export const SELF_COMPASSION_COMPONENT_LABELS: Record<SelfCompassionComponent, string> = {
  'self-kind': 'Self-kindness',
  'self-judging': 'Self-judgment',
  'common-humanity': 'Common humanity',
  isolation: 'Isolation',
  mindful: 'Mindfulness',
  'over-identified': 'Over-identification',
};

export const selfCompassionQuiz: QuizDefinition = {
  id: 'self-compassion-v1',
  type: 'extra-dimensional',
  title: 'Self-Compassion',
  description: 'Based on Kristin Neff\'s model of self-compassion. Sixteen questions on how you actually treat yourself when you are struggling — and which part of that is the place to practise.',
  questions: [
    { id: 'sk1', text: 'When I fall short, I speak to myself the way I would to someone I love.', dimension: 'self-kind', options: likert },
    { id: 'sk2', text: 'When I am struggling, I treat myself as kindly as I would treat a close friend.', dimension: 'self-kind', options: likert },
    { id: 'sk3', text: 'In hard times I try to be gentle with myself.', dimension: 'self-kind', options: likert },
    { id: 'sj1', text: 'I come down hard on myself for my flaws.', dimension: 'self-judging', options: likert },
    { id: 'sj2', text: 'When I notice something I dislike about myself, I feel let down by who I am.', dimension: 'self-judging', options: likert },
    { id: 'sj3', text: 'I have little patience with the parts of me I do not like.', dimension: 'self-judging', options: likert },
    { id: 'ch1', text: 'When I struggle, I remind myself that struggling is part of being human.', dimension: 'common-humanity', options: likert },
    { id: 'ch2', text: 'When I fail, I remember that other people fail too.', dimension: 'common-humanity', options: likert },
    { id: 'is1', text: 'When I am down, it feels like everyone else is doing better than me.', dimension: 'isolation', options: likert },
    { id: 'is2', text: 'When I fail, I feel alone in it.', dimension: 'isolation', options: likert },
    { id: 'mn1', text: 'When a difficult feeling arises, I try to hold it steadily rather than push it away.', dimension: 'mindful', options: likert },
    { id: 'mn2', text: 'When I am upset, I try to step back and see the bigger picture.', dimension: 'mindful', options: likert },
    { id: 'mn3', text: 'I can notice a painful feeling without being carried off by it.', dimension: 'mindful', options: likert },
    { id: 'oi1', text: 'When something goes wrong, I tend to make it bigger than it is.', dimension: 'over-identified', options: likert },
    { id: 'oi2', text: 'When I feel low, I fixate on everything that is wrong with my life.', dimension: 'over-identified', options: likert },
    { id: 'oi3', text: 'When I am struggling, my feelings run away with me.', dimension: 'over-identified', options: likert },
  ],
};

export const SELF_COMPASSION_INFO: Record<SelfCompassionType, DimensionalResultInfo> = {
  low: {
    name: 'Low self-compassion',
    tagline: 'The inner voice is mostly a critic right now.',
    summary: 'When things go wrong you tend to come down hard on yourself, feel alone in it and get carried off by the feeling. That is the most common starting point, and it is learnable: self-compassion is a skill, not a temperament. The component below is where the practice will pay off first.',
    strengths: ['High standards — the drive is real', 'Honest with yourself about what hurts'],
    shadow: ['Shame spirals that slow recovery', 'Treating a bad moment as evidence about your worth', 'Isolation when you most need company'],
    affirmation: 'I can hold a high standard and still be on my own side.',
  },
  moderate: {
    name: 'Growing self-compassion',
    tagline: 'Kind on some days, hard on others.',
    summary: 'You already treat yourself with some care, and you also still slip into judgment, isolation or over-identification when the pressure rises. Most people live here. The component below is the one pulling your total down — a small, deliberate practice there moves the whole picture.',
    strengths: ['Access to kindness when you remember to use it', 'Some perspective on hard feelings', 'Willingness to look at how you treat yourself'],
    shadow: ['Kindness that depends on the day going well', 'Perspective that evaporates under stress'],
    affirmation: 'The way I speak to myself is a habit, and habits can change.',
  },
  high: {
    name: 'Steady self-compassion',
    tagline: 'You meet yourself the way you would meet a friend.',
    summary: 'You speak to yourself kindly when you fall short, you remember that struggling is part of being human, and you can hold a hard feeling without drowning in it. That is a developed skill, not complacency — self-compassion is care plus honesty, and your answers show both.',
    strengths: ['Fast emotional recovery', 'Honest self-assessment without self-attack', 'A model of self-care for the people around you'],
    shadow: ['Can tip into letting yourself off too easily — check the standards are still there', 'Others may read your calm as not caring'],
    affirmation: 'I am on my own side — and I still ask the most of myself.',
  },
};

/**
 * Total = mean of the three positive component means and the three
 * reversed negative component means (6 − mean), banded low (< 2.5),
 * moderate, high (> 3.5). `extra.weakest` is the component with the lowest
 * compassion-coded mean — the "where to practise" card; `extra.total` is
 * the banded number to one decimal.
 */
export function scoreSelfCompassion(answers: Record<string, number>): DimensionalResult<SelfCompassionType> {
  const { scores, averages } = likertMeans(selfCompassionQuiz, answers, SELF_COMPASSION_COMPONENTS);
  const negative = new Set<SelfCompassionComponent>(['self-judging', 'isolation', 'over-identified']);
  const coded = Object.fromEntries(
    SELF_COMPASSION_COMPONENTS.map((c) => [c, negative.has(c) ? 6 - averages[c] : averages[c]]),
  ) as Record<SelfCompassionComponent, number>;
  const positives = (['self-kind', 'common-humanity', 'mindful'] as const).map((c) => coded[c]);
  const negatives = (['self-judging', 'isolation', 'over-identified'] as const).map((c) => coded[c]);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const total = (mean(positives) + mean(negatives)) / 2;
  const primary: SelfCompassionType = total < 2.5 ? 'low' : total > 3.5 ? 'high' : 'moderate';
  const weakest = SELF_COMPASSION_COMPONENTS.reduce((w, c) => (coded[c] < coded[w] ? c : w), SELF_COMPASSION_COMPONENTS[0]);
  return {
    primary,
    scores,
    averages,
    isTie: false,
    margin: 0,
    extra: { weakest, total: Math.round(total * 10) / 10 },
  };
}

// 7. PHQ-2-style Depression Screener (clearly marked non-diagnostic)
export type PHQ2Result = 'low' | 'mild' | 'moderate' | 'seek-support';

/**
 * The two PHQ-2 core items keep the instrument's own four-point FREQUENCY
 * scale (0-3 → recorded 1-4) instead of an agreement Likert, so "Neutral"
 * can no longer be read as "more than half the days". localizeQuiz applies
 * the shared Likert labels per question, so the other ten items keep them.
 */
export const PHQ_FREQUENCY = [
  { value: 1, label: 'Not at all' },
  { value: 2, label: 'Several days' },
  { value: 3, label: 'More than half the days' },
  { value: 4, label: 'Nearly every day' },
];

/**
 * Crisis resources for the screener's two higher results. English carries
 * the US lines; the locale key `extraQuizzes.mood-screener.crisis` holds the
 * per-country numbers (ja: いのちの電話 0570-783-556, ko: 109, zh: 北京心理危机研究与干预中心
 * 010-82951332 — to be verified by the owner before shipping).
 */
export const MOOD_SCREENER_CRISIS =
  'If you are in crisis right now: in the US, call or text 988 (Suicide and Crisis Lifeline) or text HOME to 741741 (Crisis Text Line). Elsewhere, contact your local emergency number or mental-health service. You are not alone.';

export const phq2Quiz: QuizDefinition = {
  id: 'mood-screener-v1',
  type: 'extra-dimensional',
  title: 'Mood Check — 2-week screener',
  description: 'A short self-reflection built around the two PHQ-2 questions used in wellness screenings, plus ten reflections on the same two weeks. Not a diagnosis — if your result is high, please reach out to a professional.',
  questions: [
    { id: 'lw1', text: 'Over the last two weeks, how often have you felt down, depressed or hopeless?', dimension: 'seek-support', options: PHQ_FREQUENCY },
    { id: 'lw2', text: 'Over the last two weeks, how often have you had little interest or pleasure in doing things?', dimension: 'seek-support', options: PHQ_FREQUENCY },
    { id: 'lw3', text: 'I have trouble sleeping, or I sleep too much, most nights.', dimension: 'moderate', options: likert },
    { id: 'lw4', text: 'I feel tired or low-energy much of the day.', dimension: 'moderate', options: likert },
    { id: 'lw5', text: 'I\'ve been eating much more or much less than usual.', dimension: 'moderate', options: likert },
    { id: 'mi1', text: 'I sometimes feel flat or numb, even about things I usually enjoy.', dimension: 'mild', options: likert },
    { id: 'mi2', text: 'My concentration is noticeably off lately.', dimension: 'mild', options: likert },
    { id: 'mi3', text: 'I feel more irritable than usual.', dimension: 'mild', options: likert },
    { id: 'mi4', text: 'I have stretches of being very self-critical.', dimension: 'mild', options: likert },
    { id: 'lo1', text: 'Over the last two weeks I have had more good days than difficult ones.', dimension: 'low', options: likert },
    { id: 'lo2', text: 'Over the last two weeks I have been able to enjoy small things.', dimension: 'low', options: likert },
    { id: 'lo3', text: 'Over the last two weeks I have felt connected to the people around me.', dimension: 'low', options: likert },
  ],
};

export const PHQ2_INFO: Record<PHQ2Result, DimensionalResultInfo> = {
  low: { name: 'Low signal — baseline', tagline: 'Most signals suggest you\'re doing okay.', summary: 'Your answers suggest you\'re largely doing okay lately. The quiz can\'t see everything, and "okay" is not the same as "great" — but you\'re in a relatively regulated place. Keep tending what\'s working.', strengths: ['Regulation', 'Baseline steadiness', 'Connection to daily pleasures'], shadow: ['Can miss slow drift — check in periodically', 'Don\'t wait until things are bad to tend your wellbeing'], affirmation: 'I am mostly okay — and I tend my wellbeing like a garden, not an emergency.' },
  mild: { name: 'Mild signal', tagline: 'Some low mood is present — worth attending.', summary: 'Your answers suggest mild symptoms of low mood or low-grade depression. This is very common and is very workable. It does not mean you have a diagnosis. Simple interventions — movement, sunlight, connection, sleep hygiene — often shift this. If it persists past a few weeks, reach out.', strengths: ['Self-awareness that you\'re in a dip', 'Capacity to still engage'], shadow: ['Trying to power through without addressing', 'Self-criticism masking genuine tiredness', 'Writing off what good help could do'], affirmation: 'I\'m in a dip. I address it gently, with basic care, and I reach out if it doesn\'t lift.' },
  moderate: { name: 'Moderate signal', tagline: 'Multiple symptoms present — professional support worth considering.', summary: 'Several symptoms of sustained low mood show up in your answers. This deserves more attention than self-help alone can give. Consider talking to a therapist, GP, or mental-health service. You are not broken. This is workable and you deserve support.', strengths: ['Willingness to check in with yourself — that\'s real'], shadow: ['Isolation makes this worse', 'Waiting too long to reach out', 'Self-blame for being in this state'], affirmation: 'This is a load I don\'t have to carry alone. I reach out — today.' },
  'seek-support': { name: 'Higher signal — reach out', tagline: 'Strong signals of sustained low mood — please talk to someone.', summary: 'Your answers show strong signals of persistent low mood. This is not a diagnosis, but it is a clear invitation to reach out to professional support — a GP, a therapist or a local mental-health service. The crisis resources below are for right now, if right now is hard.', strengths: ['Being honest in this screener — that\'s strength'], shadow: ['The voice saying "I\'m fine, I don\'t need help" is often the voice that needs it most'], affirmation: 'I reach for real support. I call. I text. I ask. I am worth the reach.' },
};

// ---------------------------------------------------------------
// Dedicated Mood Screener scorer (safety-relevant)
// ---------------------------------------------------------------
// The generic calculateDimensional "max average wins" typing understated
// risk: a user endorsing BOTH core depression items could still be
// routed to "Low signal" if their 'low'-dimension answers averaged
// higher, and exact ties resolved to the least-severe dimension. This
// scorer applies the validated PHQ-2 cutoff first, then falls back to
// average-typing with ties resolving TOWARD the more supportive result.

// The two core mood items that correspond to the actual PHQ-2 instrument
// ("felt down or depressed" + "little interest or pleasure").
const PHQ2_CORE_ITEM_IDS = ['lw1', 'lw2'] as const;

// The two core items are recorded on the PHQ frequency scale itself
// (1 "Not at all" … 4 "Nearly every day"), so the PHQ score is value − 1:
//   1 → 0, 2 → 1, 3 → 2, 4 → 3. Clamped in case an old five-point answer
// is replayed from a stored result.
const toPhq2 = (value: number): number => Math.min(3, Math.max(0, value - 1));

export function scoreMoodScreener(
  answers: Record<string, number>,
): DimensionalResult<PHQ2Result> {
  // Ascending severity order — used for tie-breaking below.
  const dimensions: PHQ2Result[] = ['low', 'mild', 'moderate', 'seek-support'];

  // Raw per-dimension sums, same shape calculateDimensional returns, so
  // the generic extra-dimensional results screen (score-distribution
  // bars) keeps working unchanged.
  const scores: Record<PHQ2Result, number> = { low: 0, mild: 0, moderate: 0, 'seek-support': 0 };
  const counts: Record<PHQ2Result, number> = { low: 0, mild: 0, moderate: 0, 'seek-support': 0 };
  for (const q of phq2Quiz.questions) {
    const v = answers[q.id];
    if (v === undefined || !q.dimension) continue;
    const dim = q.dimension as PHQ2Result;
    if (dim in scores) {
      scores[dim] += v;
      counts[dim] += 1;
    }
  }

  // Validated PHQ-2 cutoff first: each core item scored 0-3, summed to
  // 0-6; a total >= 3 is a positive screen and always routes to the
  // supportive result, regardless of how positively the other items
  // were answered.
  const phq2Total = PHQ2_CORE_ITEM_IDS.reduce(
    (total, id) => total + (answers[id] !== undefined ? toPhq2(answers[id]) : 0),
    0,
  );
  const averages = Object.fromEntries(
    dimensions.map((d) => [d, counts[d] > 0 ? scores[d] / counts[d] : 0]),
  ) as Record<PHQ2Result, number>;
  if (phq2Total >= 3) {
    return { primary: 'seek-support', scores, averages, isTie: false, margin: 0, extra: { phq2Total } };
  }

  // Below the cutoff: per-question-average typing (as the generic scorer
  // does), but iterating in ascending severity with >= so an exact tie
  // resolves toward the MORE supportive/severe result, never away. Ties
  // are therefore resolved, not reported.
  let primary: PHQ2Result = dimensions[0];
  for (const d of dimensions) {
    if (averages[d] >= averages[primary]) primary = d;
  }
  const others = dimensions.filter((d) => d !== primary).map((d) => averages[d]);
  const margin = averages[primary] - Math.max(...others);
  return { primary, scores, averages, isTie: false, margin, extra: { phq2Total } };
}

// Combined export table — extraQuizzes.ts's EXTRA_QUIZ_SCORING will be
// extended at the registration site to include these.
// `dimensions` are the SCORED dimensions (the score bars); `info` may hold
// more result keys than that (both / neither, the self-compassion bands).
export const EXTRA_QUIZZES_PART2 = {
  'jungian-functions-v1':   { quiz: jungianQuiz,         dimensions: ['Ni','Ne','Si','Se','Ti','Te','Fi','Fe'] as const, info: JUNGIAN_INFO as Record<string, DimensionalResultInfo> },
  'love-styles-v1':         { quiz: loveStylesQuiz,      dimensions: ['eros','philia','storge','agape'] as const,        info: LOVE_STYLES_INFO as Record<string, DimensionalResultInfo> },
  'parenting-style-v1':     { quiz: parentingQuiz,       dimensions: ['authoritative','authoritarian','permissive','neglectful'] as const, info: PARENTING_INFO as Record<string, DimensionalResultInfo> },
  'learning-style-v1':      { quiz: learningQuiz,        dimensions: ['visual','auditory','reading','kinesthetic'] as const, info: VARK_INFO as Record<string, DimensionalResultInfo> },
  'empath-hsp-v1':          { quiz: empathQuiz,          dimensions: ['empath','hsp'] as const,                          info: EMPATH_INFO as Record<string, DimensionalResultInfo> },
  'self-compassion-v1':     { quiz: selfCompassionQuiz,  dimensions: SELF_COMPASSION_COMPONENTS,                         info: SELF_COMPASSION_INFO as Record<string, DimensionalResultInfo>, dimensionLabels: SELF_COMPASSION_COMPONENT_LABELS as Record<string, string> },
  'mood-screener-v1':       { quiz: phq2Quiz,            dimensions: ['low','mild','moderate','seek-support'] as const, info: PHQ2_INFO as Record<string, DimensionalResultInfo> },
};
