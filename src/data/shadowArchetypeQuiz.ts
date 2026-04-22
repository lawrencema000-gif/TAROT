import type { QuizDefinition } from '../types';

// Shadow Archetype (Jungian, 7-archetype variant) — 21 questions, 3 per
// archetype. Uses a Likert 1–5 scale so existing UI works out of the box.
//
// The seven archetypes:
//   - Lover      : connection, sensuality, devotion
//   - Warrior    : courage, protection, discipline
//   - Magician   : insight, transformation, knowledge
//   - Sovereign  : leadership, stewardship, order
//   - Sage       : wisdom, detachment, teaching
//   - Innocent   : hope, simplicity, wonder
//   - Explorer   : freedom, curiosity, novelty
//
// dimension field = three-letter code so the runner can stay agnostic:
// LOV, WAR, MAG, SOV, SAG, INN, EXP.

export type ShadowArchetype = 'lover' | 'warrior' | 'magician' | 'sovereign' | 'sage' | 'innocent' | 'explorer';

export const SHADOW_DIMENSION_TO_ARCHETYPE: Record<string, ShadowArchetype> = {
  LOV: 'lover',
  WAR: 'warrior',
  MAG: 'magician',
  SOV: 'sovereign',
  SAG: 'sage',
  INN: 'innocent',
  EXP: 'explorer',
};

const likert = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' },
];

export const shadowArchetypeQuiz: QuizDefinition = {
  id: 'shadow-archetype-v1',
  type: 'shadow-archetype',
  title: 'Shadow Archetype',
  description: 'Which inner archetype is running the room right now? This reading maps you to one of the seven deep patterns — Lover, Warrior, Magician, Sovereign, Sage, Innocent, or Explorer — with the gift each one brings, the shadow it casts when wounded, and a path toward integration.',
  questions: [
    { id: 'lov1', text: 'Deep emotional intimacy is what makes life worth living.', dimension: 'LOV', options: likert },
    { id: 'lov2', text: 'I often feel other people\'s emotions as vividly as my own.', dimension: 'LOV', options: likert },
    { id: 'lov3', text: 'I give myself fully when I love someone or something.', dimension: 'LOV', options: likert },
    { id: 'war1', text: 'I am willing to fight — literally or metaphorically — for what I believe in.', dimension: 'WAR', options: likert },
    { id: 'war2', text: 'Discipline and follow-through are core to who I am.', dimension: 'WAR', options: likert },
    { id: 'war3', text: 'I step up to protect people who can\'t protect themselves.', dimension: 'WAR', options: likert },
    { id: 'mag1', text: 'I\'m drawn to hidden knowledge — the underneath of things.', dimension: 'MAG', options: likert },
    { id: 'mag2', text: 'I see patterns and connections others often miss.', dimension: 'MAG', options: likert },
    { id: 'mag3', text: 'Helping someone transform the way they see themselves is one of my deepest pleasures.', dimension: 'MAG', options: likert },
    { id: 'sov1', text: 'People naturally look to me to set the direction.', dimension: 'SOV', options: likert },
    { id: 'sov2', text: 'I feel responsible for the well-being of the systems I\'m part of.', dimension: 'SOV', options: likert },
    { id: 'sov3', text: 'I have a clear sense of what I am the standard-bearer for.', dimension: 'SOV', options: likert },
    { id: 'sag1', text: 'I\'m happier as a teacher / witness than as the main character.', dimension: 'SAG', options: likert },
    { id: 'sag2', text: 'I need long solitary stretches to think things through.', dimension: 'SAG', options: likert },
    { id: 'sag3', text: 'I value understanding a thing deeply more than acting on it quickly.', dimension: 'SAG', options: likert },
    { id: 'inn1', text: 'I lead with hope, even when things look hard.', dimension: 'INN', options: likert },
    { id: 'inn2', text: 'The simple pleasures (a walk, a meal, good light) matter enormously to me.', dimension: 'INN', options: likert },
    { id: 'inn3', text: 'I trust people by default, not by evidence.', dimension: 'INN', options: likert },
    { id: 'exp1', text: 'Routine feels like slow suffocation.', dimension: 'EXP', options: likert },
    { id: 'exp2', text: 'I\'ve reinvented my life more than once.', dimension: 'EXP', options: likert },
    { id: 'exp3', text: 'Being somewhere unfamiliar is one of my favourite feelings.', dimension: 'EXP', options: likert },
  ],
};

export interface ShadowResult {
  archetype: ShadowArchetype;
  scores: Record<ShadowArchetype, number>;
}

export function calculateShadowArchetype(answers: Record<string, number>): ShadowResult {
  const scores: Record<ShadowArchetype, number> = {
    lover: 0, warrior: 0, magician: 0, sovereign: 0, sage: 0, innocent: 0, explorer: 0,
  };
  for (const q of shadowArchetypeQuiz.questions) {
    const value = answers[q.id];
    if (value === undefined || !q.dimension) continue;
    const archetype = SHADOW_DIMENSION_TO_ARCHETYPE[q.dimension];
    if (archetype) scores[archetype] += value;
  }
  const winner = (Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]) as ShadowArchetype;
  return { archetype: winner, scores };
}

export interface ShadowArchetypeInfo {
  name: string;
  tagline: string;
  gift: string;
  shadow: string;
  integration: string;
  affirmation: string;
  tarotPairing: string;
}

// English canonical content — translated versions live in locale JSON.
export const SHADOW_ARCHETYPES: Record<ShadowArchetype, ShadowArchetypeInfo> = {
  lover: {
    name: 'The Lover',
    tagline: 'The one who stays open.',
    gift: 'You lead with connection. When you are in your power, life feels warm, sensual, and meaningful. You create belonging wherever you go.',
    shadow: 'When wounded, the Lover drowns — co-dependence, obsession, or losing yourself in someone else. The shadow can also show up as the opposite: shutting down entirely to avoid being hurt.',
    integration: 'Anchor in self-knowledge so your giving is a choice, not a compulsion. Practice loving without needing to merge.',
    affirmation: 'I open my heart from fullness, not fear — and I remain myself inside the love.',
    tarotPairing: 'The Lovers / Two of Cups',
  },
  warrior: {
    name: 'The Warrior',
    tagline: 'The one who acts for what matters.',
    gift: 'You bring discipline, courage, and follow-through. You protect what you love and move when others freeze. Your word is your weapon.',
    shadow: 'The wounded Warrior becomes the bully — fighting for the sake of fighting, turning every conversation into combat, or burning out in service of a cause. The shadow can also collapse into the coward who stays silent.',
    integration: 'Fight for, not just against. Rest is not retreat. The sword and the sheath both belong to the Warrior.',
    affirmation: 'I act with discipline and care — I know when to move and when to rest.',
    tarotPairing: 'The Chariot / Knight of Swords',
  },
  magician: {
    name: 'The Magician',
    tagline: 'The one who sees beneath.',
    gift: 'You read the hidden patterns. You transform — yourself, a room, a relationship, a problem — by seeing what others don\'t. Knowledge is your weapon and your gift.',
    shadow: 'The wounded Magician manipulates. Uses insight to control, withholds truth as power, or becomes a detached observer who refuses to live. The shadow can also be the charlatan — mistaking knowing about for knowing.',
    integration: 'Translate your insight into real service to other people. Teach what you know. Let yourself be transformed, not just be the one who transforms.',
    affirmation: 'I use my sight to illuminate, not to dominate.',
    tarotPairing: 'The Magician / The High Priestess',
  },
  sovereign: {
    name: 'The Sovereign',
    tagline: 'The one who sets the standard.',
    gift: 'You see the whole field and take responsibility for it. You create order, set vision, and hold the wellbeing of the group. Others find their place near you.',
    shadow: 'The wounded Sovereign becomes the tyrant — controlling, rigid, taking everything personally. Or collapses into the abdicator: refusing the throne out of fear of its weight.',
    integration: 'Lead for the people, not from the ego. Delegate. Let others be sovereigns too.',
    affirmation: 'I hold my power in service of something larger than myself.',
    tarotPairing: 'The Emperor / The Empress',
  },
  sage: {
    name: 'The Sage',
    tagline: 'The one who sees clearly from the edge.',
    gift: 'You stay calm in chaos. You ask the questions no one else is asking. You bring long-range wisdom and the patience to tell the truth without needing the credit.',
    shadow: 'The wounded Sage becomes the cynic — knowing, detached, refusing to act or feel. Or the ivory-tower recluse who won\'t come down from the mountain.',
    integration: 'Wisdom that stays inside you becomes bitter. Teach. Get close. Risk being wrong.',
    affirmation: 'I step down from the mountain and walk among the people I love.',
    tarotPairing: 'The Hermit / The Hierophant',
  },
  innocent: {
    name: 'The Innocent',
    tagline: 'The one who keeps faith.',
    gift: 'You protect hope. You see goodness where others see rot. Your trust, optimism, and simplicity are a gift to the people around you.',
    shadow: 'The wounded Innocent refuses to see shadow at all — naive to harm, stuck in fantasy, or trapped in a perpetual "it will be fine" that blocks real action.',
    integration: 'Keep your faith but earn your eyes. You can be hopeful AND clear-eyed. Both / and.',
    affirmation: 'I keep hope with open eyes.',
    tarotPairing: 'The Fool / The Star',
  },
  explorer: {
    name: 'The Explorer',
    tagline: 'The one who keeps moving.',
    gift: 'You find the edge. You know new territory is where you come alive, and you show others that the life they have is not the only life possible. Freedom is your medicine.',
    shadow: 'The wounded Explorer runs — from intimacy, from follow-through, from the ordinary life that would actually grow them. The shadow keeps leaving just before anything gets real.',
    integration: 'Stay. Go deep in one place. The new territory you haven\'t explored yet may be intimacy, not geography.',
    affirmation: 'I travel both outward and inward — some of my deepest exploration happens in staying.',
    tarotPairing: 'The Fool / Knight of Wands',
  },
};
