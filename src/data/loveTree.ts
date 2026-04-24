/**
 * Love Tree — 12-question attachment-style assessment.
 *
 * Based on the classical four-quadrant attachment model (secure /
 * anxious-preoccupied / dismissive-avoidant / fearful-avoidant). The
 * questionnaire is a lightly adapted ECR-R trimmed to 12 items for a
 * ~90-second quiz. Items alternate between "anxiety" (6) and
 * "avoidance" (6) dimensions; each is answered on a 5-point Likert
 * scale. The pair of means is then classified into one of the four
 * quadrants using classical midpoints.
 *
 * This is a self-knowledge tool, not a clinical diagnosis. Copy makes
 * that distinction explicit at the result stage.
 */

export type Attachment = 'secure' | 'anxious' | 'avoidant' | 'fearful';

export type Dimension = 'anxiety' | 'avoidance';

export interface LoveTreeItem {
  id: string;
  dimension: Dimension;
  /** If true, a high Likert answer LOWERS the dimension score (reverse-coded). */
  reverse?: boolean;
  prompt: string;
}

export const LOVE_TREE_QUIZ: LoveTreeItem[] = [
  { id: 'a1', dimension: 'anxiety',   prompt: "I worry that partners won't care about me as much as I care about them." },
  { id: 'v1', dimension: 'avoidance', prompt: "I prefer not to show a partner how I feel deep down." },
  { id: 'a2', dimension: 'anxiety',   prompt: "I often worry a partner will leave me." },
  { id: 'v2', dimension: 'avoidance', prompt: "I find it difficult to depend on partners." },
  { id: 'a3', dimension: 'anxiety',   prompt: "I need a lot of reassurance that I'm loved." },
  { id: 'v3', dimension: 'avoidance', prompt: "I feel uncomfortable when someone wants to be very close to me." },
  { id: 'a4', dimension: 'anxiety',   reverse: true, prompt: "I'm comfortable when my partner wants a little space." },
  { id: 'v4', dimension: 'avoidance', prompt: "I try to avoid getting too emotionally connected." },
  { id: 'a5', dimension: 'anxiety',   prompt: "I overthink small changes in how a partner acts toward me." },
  { id: 'v5', dimension: 'avoidance', reverse: true, prompt: "I'm happy sharing personal thoughts and feelings with a partner." },
  { id: 'a6', dimension: 'anxiety',   reverse: true, prompt: "I rarely worry about being abandoned." },
  { id: 'v6', dimension: 'avoidance', prompt: "I'm the one who keeps an emotional distance in relationships." },
];

export interface AttachmentInfo {
  title: string;
  archetype: string;
  summary: string;
  strengths: string[];
  growth: string[];
  inLove: string;
  affirmation: string;
  /** Tree visual parameters tweaked per type — read by the SVG below. */
  tree: {
    trunkLean: number;         // -6..+6 degrees
    branchSpread: 'open' | 'tall' | 'sparse' | 'split';
    leafDensity: number;       // 0.2..1.0
    rootDepth: 'deep' | 'medium' | 'shallow';
    accentColor: string;       // hex
  };
}

export const ATTACHMENT_INFO: Record<Attachment, AttachmentInfo> = {
  secure: {
    title: 'Secure',
    archetype: 'The steady canopy',
    summary:
      'You give and receive closeness without losing yourself. Ruptures don\'t feel catastrophic; repair feels possible. Partners tend to relax around you because your nervous system doesn\'t ask them to fix it.',
    strengths: [
      'You can say what you feel without it landing as an accusation.',
      'You don\'t confuse distance with rejection.',
      'You\'re capable of long-haul repair — you don\'t quit at the first hard thing.',
      'Your baseline is "we\'re okay," which gives partners the ground to be honest.',
    ],
    growth: [
      'Be careful not to over-function for less-secure partners.',
      'Your ease can read as unavailability to more anxious types. Reassurance, even when it feels obvious, still lands.',
    ],
    inLove:
      'You want a partner, not a project. What you offer is rare: a relationship where each person\'s interior world stays theirs, and the shared life is made from the overlap, not the dissolution.',
    affirmation: 'Love is a place I return to, not a thing I chase.',
    tree: { trunkLean: 0, branchSpread: 'open', leafDensity: 0.95, rootDepth: 'deep', accentColor: '#4ade80' },
  },
  anxious: {
    title: 'Anxious',
    archetype: 'The reaching branches',
    summary:
      'Your love runs warm — fast to bond, slow to quiet down. You read the weather of a partner\'s mood with high resolution. The gift: you notice what others miss. The cost: your nervous system often reads distance as danger.',
    strengths: [
      'You\'re deeply attuned — you see the micro-shifts in the people you love.',
      'You put effort in. You don\'t half-love.',
      'Intimacy isn\'t scary to you — you move toward it without flinching.',
      'You remember. Dates, stories, small promises — they stay with you.',
    ],
    growth: [
      'Your alarm system is sensitive. Before reacting, ask: is this danger, or is this activation?',
      'Self-soothing is a skill, not a weakness. Building it takes the pressure off partners to be your regulator.',
      'Ruminating rehearsal doesn\'t make you safer. It convinces your body the threat is real.',
    ],
    inLove:
      'You want someone who will stay when you\'re hard to be with. The paradox: the more you can be with yourself alone, the more you can be with them without clinging.',
    affirmation: 'My need for closeness is not too much — and I can hold myself.',
    tree: { trunkLean: 4, branchSpread: 'tall', leafDensity: 0.75, rootDepth: 'shallow', accentColor: '#f472b6' },
  },
  avoidant: {
    title: 'Avoidant',
    archetype: 'The deep-rooted grove',
    summary:
      'You\'re good on your own. You built that capacity early and you\'re not quick to hand it back. Closeness that arrives too fast can feel like a room with no exit — so you keep one open. It\'s protection, not coldness.',
    strengths: [
      'You know how to be with yourself. That\'s a real skill.',
      'You don\'t perform intimacy. When you show up, it\'s real.',
      'You won\'t stay in what doesn\'t actually work — you\'re honest with yourself about that.',
      'You don\'t outsource your regulation to partners.',
    ],
    growth: [
      'Watch for deactivation — when things get close, do you find new reasons they\'re wrong?',
      'Your "I\'m fine" is often a door you close on accident. Partners can\'t see past it.',
      'Vulnerability won\'t actually kill you. Practicing small doses builds the tolerance.',
    ],
    inLove:
      'You\'re looking for someone who won\'t demand you become different to stay with them. When you choose to let someone close — actually close — it\'s not a small thing.',
    affirmation: 'I can stay close without losing myself.',
    tree: { trunkLean: -2, branchSpread: 'sparse', leafDensity: 0.45, rootDepth: 'deep', accentColor: '#60a5fa' },
  },
  fearful: {
    title: 'Fearful-Avoidant',
    archetype: 'The split canopy',
    summary:
      'You want closeness and you\'re wary of it — both, at once, honestly. Your internal weather shifts fast because the system inside you is holding two truths: love is what I need, and love is what has hurt me. It\'s a hard place to live from. It\'s also a deeply honest one.',
    strengths: [
      'You see both sides of intimacy — its warmth and its risk. You\'re not naive.',
      'You feel deeply and notice nuance others miss.',
      'You\'ve survived enough to know what you\'re made of.',
      'When you heal, you bring the hard-won kind of secure.',
    ],
    growth: [
      'Your push-pull is real. Name it for yourself when it\'s happening — awareness interrupts it.',
      'The relief that comes from withdrawing is not the same as safety.',
      'Therapy — especially body-based modalities — is often the most direct path forward.',
    ],
    inLove:
      'You want someone patient enough to see the split and steady enough not to take it personally. Someone who can stay calm while you learn your way through the contradiction.',
    affirmation: 'I can be afraid and stay. I can want love and let it in.',
    tree: { trunkLean: 3, branchSpread: 'split', leafDensity: 0.55, rootDepth: 'medium', accentColor: '#c084fc' },
  },
};

/**
 * Score answers → attachment type.
 *
 * Answers arrive as a map of itemId → 1..5 (strongly disagree →
 * strongly agree). We compute mean anxiety + mean avoidance in the
 * 1..5 range, then classify using the midpoint (3.0):
 *
 *   anxiety  ≤ 3  AND  avoidance ≤ 3  → secure
 *   anxiety  >  3  AND  avoidance ≤ 3  → anxious
 *   anxiety  ≤ 3  AND  avoidance  > 3  → avoidant
 *   anxiety  >  3  AND  avoidance  > 3  → fearful
 */
export function scoreLoveTree(answers: Record<string, number>): {
  attachment: Attachment;
  anxiety: number;    // 1..5 scale
  avoidance: number;  // 1..5 scale
} {
  let aSum = 0, aCount = 0;
  let vSum = 0, vCount = 0;
  for (const item of LOVE_TREE_QUIZ) {
    const raw = answers[item.id];
    if (typeof raw !== 'number') continue;
    const value = item.reverse ? 6 - raw : raw;
    if (item.dimension === 'anxiety') { aSum += value; aCount++; }
    else                               { vSum += value; vCount++; }
  }
  const anxiety   = aCount ? aSum / aCount : 3;
  const avoidance = vCount ? vSum / vCount : 3;

  let attachment: Attachment;
  if (anxiety <= 3 && avoidance <= 3)      attachment = 'secure';
  else if (anxiety >  3 && avoidance <= 3) attachment = 'anxious';
  else if (anxiety <= 3 && avoidance >  3) attachment = 'avoidant';
  else                                     attachment = 'fearful';

  return {
    attachment,
    anxiety:   Math.round(anxiety * 10) / 10,
    avoidance: Math.round(avoidance * 10) / 10,
  };
}
