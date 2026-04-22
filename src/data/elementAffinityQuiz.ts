import type { QuizDefinition } from '../types';

// Element Affinity — 10 forced-choice questions across the four classical
// elements. Short + snackable. Each question has 4 options, one per element;
// the winning element is the primary affinity. Also exposes a helper that
// compares behavioural element vs astro-chart element so the result page
// can surface the "your chart says X, your behaviour says Y" insight.

export type Element = 'fire' | 'water' | 'air' | 'earth';

// Option value → element map (consistent across all questions).
export const ELEMENT_BY_VALUE: Record<number, Element> = {
  1: 'fire',
  2: 'water',
  3: 'air',
  4: 'earth',
};

export const elementAffinityQuiz: QuizDefinition = {
  id: 'element-affinity-v1',
  type: 'element-affinity',
  title: 'Element Affinity',
  description: 'Ten quick questions to discover which of the four classical elements most echoes how you actually live — fire, water, air, or earth. Pairs with your astrology chart\'s native element for a "chart says X, behaviour says Y" comparison.',
  questions: [
    { id: 'el1', text: 'My natural pace is best described as…', dimension: 'EL', options: [
      { value: 1, label: 'Fast and forward.' },
      { value: 2, label: 'Ebbs and flows with my mood.' },
      { value: 3, label: 'Mental before physical.' },
      { value: 4, label: 'Steady and unhurried.' },
    ] },
    { id: 'el2', text: 'What do you crave most when the day gets rough?', dimension: 'EL', options: [
      { value: 1, label: 'Movement — something physical or creative.' },
      { value: 2, label: 'Softness — a bath, a hug, good food.' },
      { value: 3, label: 'Information — a podcast, a conversation, a reframe.' },
      { value: 4, label: 'Grounding — routine, garden, body work.' },
    ] },
    { id: 'el3', text: 'My creative fuel is…', dimension: 'EL', options: [
      { value: 1, label: 'Passion — I make from heat.' },
      { value: 2, label: 'Emotion — I make from feeling.' },
      { value: 3, label: 'Ideas — I make from concepts.' },
      { value: 4, label: 'Craft — I make from refinement and skill.' },
    ] },
    { id: 'el4', text: 'A meaningful gift to me is…', dimension: 'EL', options: [
      { value: 1, label: 'An experience or adventure.' },
      { value: 2, label: 'A hand-written note or something sentimental.' },
      { value: 3, label: 'A book, a conversation, or a new idea.' },
      { value: 4, label: 'Something beautifully made or useful for my home.' },
    ] },
    { id: 'el5', text: 'I get stuck when…', dimension: 'EL', options: [
      { value: 1, label: 'I\'m forced to sit still for too long.' },
      { value: 2, label: 'I\'m disconnected from people I love.' },
      { value: 3, label: 'I don\'t understand what\'s going on.' },
      { value: 4, label: 'My routine / environment feels chaotic.' },
    ] },
    { id: 'el6', text: 'My ideal environment has…', dimension: 'EL', options: [
      { value: 1, label: 'Light, energy, movement.' },
      { value: 2, label: 'Water, softness, warmth.' },
      { value: 3, label: 'Books, conversation, airy space.' },
      { value: 4, label: 'Plants, texture, materials I can touch.' },
    ] },
    { id: 'el7', text: 'What do you spend money on most easily?', dimension: 'EL', options: [
      { value: 1, label: 'Experiences, travel, tickets.' },
      { value: 2, label: 'Beauty, care, gifts for loved ones.' },
      { value: 3, label: 'Books, courses, information.' },
      { value: 4, label: 'Home, quality tools, long-lasting items.' },
    ] },
    { id: 'el8', text: 'Under pressure, my default move is…', dimension: 'EL', options: [
      { value: 1, label: 'Push harder and move faster.' },
      { value: 2, label: 'Withdraw into feelings, people, comfort.' },
      { value: 3, label: 'Analyse and rework the strategy.' },
      { value: 4, label: 'Simplify, slow down, return to basics.' },
    ] },
    { id: 'el9', text: 'A compliment that would land hardest is…', dimension: 'EL', options: [
      { value: 1, label: '"You make things happen."' },
      { value: 2, label: '"You make people feel seen."' },
      { value: 3, label: '"You make things make sense."' },
      { value: 4, label: '"You make things last."' },
    ] },
    { id: 'el10', text: 'The season I love most is…', dimension: 'EL', options: [
      { value: 1, label: 'Summer — heat, long days, intensity.' },
      { value: 2, label: 'Autumn — the poetry of change.' },
      { value: 3, label: 'Spring — fresh ideas, new light.' },
      { value: 4, label: 'Winter — stillness, depth, root time.' },
    ] },
  ],
};

export interface ElementAffinityResult {
  primary: Element;
  scores: Record<Element, number>;
}

export function calculateElementAffinity(answers: Record<string, number>): ElementAffinityResult {
  const scores: Record<Element, number> = { fire: 0, water: 0, air: 0, earth: 0 };
  for (const value of Object.values(answers)) {
    const element = ELEMENT_BY_VALUE[value];
    if (element) scores[element] += 1;
  }
  const primary = (Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]) as Element;
  return { primary, scores };
}

export interface ElementInfo {
  name: string;
  tagline: string;
  description: string;
  strengths: string[];
  shadow: string[];
  whenDominant: string;
  affirmation: string;
}

export const ELEMENT_INFO: Record<Element, ElementInfo> = {
  fire: {
    name: 'Fire',
    tagline: 'Spark, passion, forward motion.',
    description: 'Fire lives through passion and velocity. You create from heat — inspired action, bold initiative, the will to begin. When you are in your element, life feels intense, creative, and directional.',
    strengths: ['Initiative', 'Courage', 'Charisma', 'Creative drive'],
    shadow: ['Burnout', 'Impatience', 'Scattered follow-through', 'Explosive temper'],
    whenDominant: 'You start more than you finish — not a weakness, a signature. Build structure around you that finishes for you, or partner with an Earth-leaning teammate.',
    affirmation: 'My spark is valuable — I honour both when to ignite and when to rest the embers.',
  },
  water: {
    name: 'Water',
    tagline: 'Feeling, intuition, connection.',
    description: 'Water lives through emotion and attunement. You know the room before anyone speaks. You create from feeling, love from depth, and heal by holding space. You are porous by design.',
    strengths: ['Empathy', 'Intuition', 'Emotional depth', 'Capacity for intimacy'],
    shadow: ['Overwhelm', 'Absorbing others\' feelings', 'Moodiness', 'Merger / loss of self'],
    whenDominant: 'Your gift is your permeability — also your hardest edge. Learn to tend your own cup first. Water without banks becomes a flood.',
    affirmation: 'I feel everything and I stay myself.',
  },
  air: {
    name: 'Air',
    tagline: 'Thought, language, clarity.',
    description: 'Air lives through mind. You connect ideas, name what others can\'t, and move by understanding. Conversations, books, language, breath — these are your medicine and your medium.',
    strengths: ['Clarity', 'Curiosity', 'Communication', 'Adaptability'],
    shadow: ['Overthinking', 'Detachment from the body', 'Intellectualising emotion', 'Difficulty landing a decision'],
    whenDominant: 'Get in your body. Let thoughts turn into action without needing another round of analysis. The mind is a great servant and a terrible master.',
    affirmation: 'I think to understand, and I live to land.',
  },
  earth: {
    name: 'Earth',
    tagline: 'Craft, body, steady building.',
    description: 'Earth lives through matter. You create with your hands, know through your body, and build for the long road. Stability is not boring to you — it is the ground for everything else.',
    strengths: ['Patience', 'Craftsmanship', 'Reliability', 'Sensory wisdom'],
    shadow: ['Rigidity', 'Resistance to change', 'Materialism', 'Shutting down when plans break'],
    whenDominant: 'Your gift is durability. Your risk is staying too long. Let some things end so new things can root.',
    affirmation: 'I build for the long road and allow seasons to turn.',
  },
};
