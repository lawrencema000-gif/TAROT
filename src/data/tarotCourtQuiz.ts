import type { QuizDefinition } from '../types';

// Tarot Court Card Match — 12 forced-choice questions that map you to one
// of the 16 court cards (Page/Knight/Queen/King × Wands/Cups/Swords/Pentacles).
//
// Each question offers 4 options. For element questions each option maps to
// a suit (fire/water/air/earth → wands/cups/swords/pentacles). For rank
// questions each option maps to a court rank (page/knight/queen/king).
// Scoring sums the points per dimension; the winning suit × winning rank
// determines the court card.
//
// Options use value 1..4 so they fit the existing QuizDefinition shape
// (value: number). The runner maps value → element/rank via the tables
// exported below and calculateCourtMatch().

export type CourtElement = 'wands' | 'cups' | 'swords' | 'pentacles';
export type CourtRank = 'page' | 'knight' | 'queen' | 'king';

// Element option order used by the data file — questions tagged dimension
// 'CE' (court-element). value 1=wands, 2=cups, 3=swords, 4=pentacles.
export const COURT_ELEMENT_BY_VALUE: Record<number, CourtElement> = {
  1: 'wands',
  2: 'cups',
  3: 'swords',
  4: 'pentacles',
};

// Rank option order used by the data file — questions tagged dimension 'CR'.
// value 1=page, 2=knight, 3=queen, 4=king.
export const COURT_RANK_BY_VALUE: Record<number, CourtRank> = {
  1: 'page',
  2: 'knight',
  3: 'queen',
  4: 'king',
};

export const tarotCourtQuiz: QuizDefinition = {
  id: 'court-match-v1',
  type: 'court-match',
  title: 'Tarot Court Card Match',
  description: 'Twelve cards. One verdict. Which of the sixteen court cards of the tarot best mirrors your current energy? This reading pairs elemental style (Wands / Cups / Swords / Pentacles) with rank (Page / Knight / Queen / King) so you get a living archetype — not just a trait.',
  questions: [
    // Element questions (dimension: CE) — which suit?
    { id: 'ce1', text: 'When faced with a problem, I first…', dimension: 'CE', options: [
      { value: 1, label: 'Burn through it with passion and force.' },
      { value: 2, label: 'Feel it in my body and follow my gut.' },
      { value: 3, label: 'Break it down and analyze every angle.' },
      { value: 4, label: 'Build a practical, step-by-step plan.' },
    ] },
    { id: 'ce2', text: 'My ideal day looks like…', dimension: 'CE', options: [
      { value: 1, label: 'Adventure — something bold and new.' },
      { value: 2, label: 'Cozy time with the people I love.' },
      { value: 3, label: 'Deep conversation about meaningful ideas.' },
      { value: 4, label: 'Building or making something tangible.' },
    ] },
    { id: 'ce3', text: 'Friends describe me as…', dimension: 'CE', options: [
      { value: 1, label: 'Energetic and bold.' },
      { value: 2, label: 'Warm and empathetic.' },
      { value: 3, label: 'Sharp and analytical.' },
      { value: 4, label: 'Reliable and grounded.' },
    ] },
    { id: 'ce4', text: 'I lose track of time when I\'m…', dimension: 'CE', options: [
      { value: 1, label: 'Creating, performing, or leading.' },
      { value: 2, label: 'Connecting deeply with someone.' },
      { value: 3, label: 'Writing, debating, or puzzling something out.' },
      { value: 4, label: 'Crafting, gardening, or working with my hands.' },
    ] },
    { id: 'ce5', text: 'Under stress I tend to…', dimension: 'CE', options: [
      { value: 1, label: 'Act out impulsively or explode.' },
      { value: 2, label: 'Withdraw into my feelings.' },
      { value: 3, label: 'Overthink and detach.' },
      { value: 4, label: 'Double down on rigid routines.' },
    ] },
    { id: 'ce6', text: 'What draws me most is…', dimension: 'CE', options: [
      { value: 1, label: 'Flames — inspiration, movement, spark.' },
      { value: 2, label: 'Water — emotion, depth, flow.' },
      { value: 3, label: 'Air — thought, language, clarity.' },
      { value: 4, label: 'Earth — craft, body, solidity.' },
    ] },

    // Rank questions (dimension: CR) — which rank?
    { id: 'cr1', text: 'My relationship with authority is…', dimension: 'CR', options: [
      { value: 1, label: 'I question it — I\'m still learning the ropes.' },
      { value: 2, label: 'I challenge it through action.' },
      { value: 3, label: 'I guide others around me.' },
      { value: 4, label: 'I\'ve become it — I set the standard.' },
    ] },
    { id: 'cr2', text: 'In groups I tend to…', dimension: 'CR', options: [
      { value: 1, label: 'Ask a lot of questions and soak it all in.' },
      { value: 2, label: 'Push everyone toward action.' },
      { value: 3, label: 'Hold space and listen deeply.' },
      { value: 4, label: 'Make the final call.' },
    ] },
    { id: 'cr3', text: 'My relationship with change is…', dimension: 'CR', options: [
      { value: 1, label: 'Exciting — I\'m curious and wide-eyed.' },
      { value: 2, label: 'I chase it — I want to make it happen.' },
      { value: 3, label: 'I adapt and nurture others through it.' },
      { value: 4, label: 'I steady the ship so nothing breaks.' },
    ] },
    { id: 'cr4', text: 'Experience has taught me…', dimension: 'CR', options: [
      { value: 1, label: 'I still have so much to learn.' },
      { value: 2, label: 'To trust my instincts and move.' },
      { value: 3, label: 'Empathy is strength.' },
      { value: 4, label: 'Structure and accountability matter.' },
    ] },
    { id: 'cr5', text: 'When I master something I…', dimension: 'CR', options: [
      { value: 1, label: 'Share the excitement of discovering it.' },
      { value: 2, label: 'Teach through doing — lead by example.' },
      { value: 3, label: 'Mentor gently, one person at a time.' },
      { value: 4, label: 'Set the bar others aspire to.' },
    ] },
    { id: 'cr6', text: 'My emotional style is…', dimension: 'CR', options: [
      { value: 1, label: 'Open and fresh — I feel things vividly.' },
      { value: 2, label: 'Intense and driven.' },
      { value: 3, label: 'Deep and containing — I hold others\' feelings too.' },
      { value: 4, label: 'Measured and sovereign.' },
    ] },
  ],
};

export interface CourtMatchResult {
  courtCard: `${CourtRank}-of-${CourtElement}`;
  element: CourtElement;
  rank: CourtRank;
  elementScores: Record<CourtElement, number>;
  rankScores: Record<CourtRank, number>;
}

export function calculateCourtMatch(answers: Record<string, number>): CourtMatchResult {
  const elementScores: Record<CourtElement, number> = {
    wands: 0, cups: 0, swords: 0, pentacles: 0,
  };
  const rankScores: Record<CourtRank, number> = {
    page: 0, knight: 0, queen: 0, king: 0,
  };

  for (const [qid, value] of Object.entries(answers)) {
    if (qid.startsWith('ce')) {
      const element = COURT_ELEMENT_BY_VALUE[value];
      if (element) elementScores[element] += 1;
    } else if (qid.startsWith('cr')) {
      const rank = COURT_RANK_BY_VALUE[value];
      if (rank) rankScores[rank] += 1;
    }
  }

  const element = (Object.entries(elementScores).reduce(
    (acc, [k, v]) => (v > acc.v ? { k, v } : acc),
    { k: 'wands', v: -1 },
  ).k) as CourtElement;

  const rank = (Object.entries(rankScores).reduce(
    (acc, [k, v]) => (v > acc.v ? { k, v } : acc),
    { k: 'page', v: -1 },
  ).k) as CourtRank;

  return {
    courtCard: `${rank}-of-${element}`,
    element,
    rank,
    elementScores,
    rankScores,
  };
}

export interface CourtCardInfo {
  name: string;
  tagline: string;
  archetype: string;
  strengths: string[];
  shadow: string[];
  whenDrawn: string;
  affirmation: string;
}

// All 16 court cards. Used for result rendering + i18n keys.
export const COURT_CARDS: CourtCardInfo[] = [
  { name: 'Page of Wands', tagline: 'The curious spark.', archetype: 'Beginner adventurer', strengths: ['Enthusiasm', 'Fresh ideas', 'Contagious energy'], shadow: ['Impulsiveness', 'Half-finished projects', 'Flakiness'], whenDrawn: 'A new creative fire is lighting — explore it before planning it.', affirmation: 'I follow what lights me up without needing it to be perfect yet.' },
  { name: 'Knight of Wands', tagline: 'The bold quester.', archetype: 'Action-driven pioneer', strengths: ['Momentum', 'Courage', 'Charisma'], shadow: ['Recklessness', 'Burnout', 'Impatience'], whenDrawn: 'Move — but watch the cost of speed. The fire wants direction.', affirmation: 'I move with passion and pace myself for the long road.' },
  { name: 'Queen of Wands', tagline: 'The radiant sovereign.', archetype: 'Magnetic leader', strengths: ['Confidence', 'Warmth', 'Creative authority'], shadow: ['Ego flare-ups', 'Jealousy', 'Attention-dependence'], whenDrawn: 'Step fully into your light. Others follow the one who burns clearly.', affirmation: 'My presence is my power — I take up the space that is mine.' },
  { name: 'King of Wands', tagline: 'The visionary founder.', archetype: 'Mature creator', strengths: ['Vision', 'Leadership', 'Sustained passion'], shadow: ['Tyranny', 'Over-control', 'Pride'], whenDrawn: 'You are ready to build long-range. Lead from purpose, not pressure.', affirmation: 'I lead with clear vision and trust others to carry their part.' },
  { name: 'Page of Cups', tagline: 'The open-hearted dreamer.', archetype: 'Intuitive newcomer', strengths: ['Imagination', 'Empathy', 'Emotional openness'], shadow: ['Naivety', 'Over-sensitivity', 'Escapism'], whenDrawn: 'A tender feeling or creative spark wants attention — honour it.', affirmation: 'I let my softness be a source of information, not a liability.' },
  { name: 'Knight of Cups', tagline: 'The romantic quester.', archetype: 'Heart-led seeker', strengths: ['Deep feeling', 'Artistry', 'Devotion'], shadow: ['Idealization', 'Moodiness', 'Avoidance of hard truths'], whenDrawn: 'Follow the feeling — but ground it with action, not fantasy alone.', affirmation: 'I pursue what I love with both heart and feet on the ground.' },
  { name: 'Queen of Cups', tagline: 'The empath-oracle.', archetype: 'Emotional sage', strengths: ['Intuition', 'Compassion', 'Emotional holding'], shadow: ['Absorbing others\' pain', 'Martyrdom', 'Loss of self'], whenDrawn: 'Your emotional intelligence is a gift. Also — tend your own cup first.', affirmation: 'I feel deeply and also know where I end and others begin.' },
  { name: 'King of Cups', tagline: 'The steady current.', archetype: 'Compassionate authority', strengths: ['Emotional maturity', 'Counsel', 'Resilience under pressure'], shadow: ['Suppressed feelings', 'Over-caretaking', 'Quiet resentment'], whenDrawn: 'You are the calm others rely on — make sure you have somewhere to feel, too.', affirmation: 'I hold space for others because I know how to hold space for myself.' },
  { name: 'Page of Swords', tagline: 'The sharp apprentice.', archetype: 'Curious thinker', strengths: ['Quick mind', 'Curiosity', 'Questioning spirit'], shadow: ['Gossip', 'Overthinking', 'Cutting words'], whenDrawn: 'A new idea wants investigating — ask before you assume.', affirmation: 'I ask questions before I draw conclusions.' },
  { name: 'Knight of Swords', tagline: 'The charging mind.', archetype: 'Relentless debater', strengths: ['Clarity', 'Drive', 'Moral conviction'], shadow: ['Arrogance', 'Tunnel vision', 'Verbal harm'], whenDrawn: 'Your truth is strong — deliver it without running people over.', affirmation: 'I speak truth with both edge and care.' },
  { name: 'Queen of Swords', tagline: 'The clear-eyed witness.', archetype: 'Discerning wise one', strengths: ['Clarity', 'Boundaries', 'Honest insight'], shadow: ['Coldness', 'Harsh judgement', 'Isolation'], whenDrawn: 'Your clarity is needed — let honesty and warmth arrive together.', affirmation: 'I see clearly and speak kindly.' },
  { name: 'King of Swords', tagline: 'The sovereign intellect.', archetype: 'Principled authority', strengths: ['Strategic thinking', 'Fairness', 'Decisiveness'], shadow: ['Rigidity', 'Emotional distance', 'Abstraction'], whenDrawn: 'You are the one others trust to cut clean — lead from ethics, not ego.', affirmation: 'I decide from principle and remain open to new evidence.' },
  { name: 'Page of Pentacles', tagline: 'The eager builder.', archetype: 'Patient student', strengths: ['Willingness to learn', 'Practicality', 'Follow-through'], shadow: ['Perfectionism', 'Slowness to start', 'Penny-pinching'], whenDrawn: 'A new skill or venture is worth investing in — start small, stay steady.', affirmation: 'I begin where I am and trust the accumulation of small steps.' },
  { name: 'Knight of Pentacles', tagline: 'The determined worker.', archetype: 'Reliable executor', strengths: ['Consistency', 'Discipline', 'Trustworthiness'], shadow: ['Rigidity', 'Workaholism', 'Fear of risk'], whenDrawn: 'Steady wins here — but occasionally, the slow path needs a shake.', affirmation: 'I honour my discipline and allow myself moments of play.' },
  { name: 'Queen of Pentacles', tagline: 'The abundant provider.', archetype: 'Nurturing creator', strengths: ['Generosity', 'Practical care', 'Sensory wisdom'], shadow: ['Over-giving', 'Material anxiety', 'Losing self in caretaking'], whenDrawn: 'You tend to everyone\'s garden — remember to plant in your own.', affirmation: 'I give from fullness, not from fear.' },
  { name: 'King of Pentacles', tagline: 'The mountain.', archetype: 'Established master', strengths: ['Wealth-building', 'Legacy', 'Grounded leadership'], shadow: ['Materialism', 'Control', 'Stubbornness'], whenDrawn: 'You have built something real — now shape what it means, not just what it has.', affirmation: 'I measure wealth by what I protect and what I give, not only by what I hold.' },
];

export function getCourtCardInfo(card: CourtMatchResult['courtCard']): CourtCardInfo {
  const name = card
    .split('-of-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' of ');
  const found = COURT_CARDS.find((c) => c.name === name);
  if (found) return found;
  return COURT_CARDS[0];
}
