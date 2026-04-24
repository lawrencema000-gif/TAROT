// Partner Compatibility — combines MBTI type compatibility with zodiac
// element compatibility to produce a nuanced reading.
//
// Both are heuristics (not science) — the value is surfacing conversation
// starters and self-awareness, not predicting relationships.

import { getZodiacSign, zodiacData } from '../utils/zodiac';
import type { ZodiacSign } from '../types';

// --- MBTI compatibility --- based on broadly-cited online MBTI lore.
// Each pairing produces a score (0-100) + a short note.

const MBTI_TYPES = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ISTP', 'ISFP', 'ESTJ', 'ESFJ', 'ESTP', 'ESFP'] as const;
export type MbtiType = typeof MBTI_TYPES[number];

/**
 * Compatibility heuristic based on cognitive-function complementarity.
 * Core rule: pairs that share the same N/S preference but differ on T/F,
 * and share J/P with moderate flexibility, tend to thrive. Opposite
 * introversion preference adds balance.
 */
export function mbtiCompatScore(a: MbtiType, b: MbtiType): number {
  let score = 50; // baseline

  const sameN = a[1] === b[1];
  score += sameN ? 15 : -10;

  const sameEI = a[0] === b[0];
  score += sameEI ? 5 : 8; // slight preference for opposite

  const sameTF = a[2] === b[2];
  score += sameTF ? 0 : 10; // opposite TF often balances

  const sameJP = a[3] === b[3];
  score += sameJP ? 7 : -2;

  // "Golden pairs" bonus — commonly cited ideal matches
  const golden = new Set(['INTJ-ENFP', 'INFJ-ENTP', 'INFP-ENTJ', 'INTP-ENFJ', 'ISTJ-ESFP', 'ISFJ-ESTP', 'ISFP-ESTJ', 'ISTP-ESFJ']);
  const pair1 = `${a}-${b}`;
  const pair2 = `${b}-${a}`;
  if (golden.has(pair1) || golden.has(pair2)) score += 15;

  // Same type — often works but can lack challenge
  if (a === b) score = 55;

  return Math.max(10, Math.min(95, score));
}

// --- Astro element compatibility ---
// Fire+Air = creative spark. Water+Earth = grounded nurture.
// Fire+Water = steam (passion + conflict). Earth+Air = logic vs body.
// Same element = resonance (good or boring).

const ELEMENT_PAIRS: Record<string, number> = {
  'fire-fire': 70, 'water-water': 70, 'air-air': 70, 'earth-earth': 70,
  'fire-air': 85, 'air-fire': 85,
  'water-earth': 85, 'earth-water': 85,
  'fire-water': 55, 'water-fire': 55,
  'fire-earth': 50, 'earth-fire': 50,
  'water-air': 55, 'air-water': 55,
  'earth-air': 60, 'air-earth': 60,
};

export function astroCompatScore(a: ZodiacSign, b: ZodiacSign): number {
  const elA = zodiacData[a].element;
  const elB = zodiacData[b].element;
  return ELEMENT_PAIRS[`${elA}-${elB}`] ?? 60;
}

// --- Combined reading ---

export interface CompatResult {
  overallScore: number;
  mbtiScore: number;
  astroScore: number;
  mbtiNote: string;
  astroNote: string;
  strengths: string[];
  growthEdges: string[];
  advice: string;
}

export function computeCompatibility(params: {
  myMbti?: MbtiType;
  partnerMbti?: MbtiType;
  myBirthDate?: string;
  partnerBirthDate?: string;
}): CompatResult | null {
  const { myMbti, partnerMbti, myBirthDate, partnerBirthDate } = params;

  if (!myMbti && !myBirthDate) return null;
  if (!partnerMbti && !partnerBirthDate) return null;

  const mbtiScore = myMbti && partnerMbti ? mbtiCompatScore(myMbti, partnerMbti) : 0;
  const mySign = myBirthDate ? getZodiacSign(myBirthDate) : null;
  const partnerSign = partnerBirthDate ? getZodiacSign(partnerBirthDate) : null;
  const astroScore = mySign && partnerSign ? astroCompatScore(mySign, partnerSign) : 0;

  const activeScores = [mbtiScore, astroScore].filter((s) => s > 0);
  const overallScore = activeScores.length > 0
    ? Math.round(activeScores.reduce((a, b) => a + b, 0) / activeScores.length)
    : 0;

  // Notes
  let mbtiNote = '';
  if (myMbti && partnerMbti) {
    const sameN = myMbti[1] === partnerMbti[1];
    const sameTF = myMbti[2] === partnerMbti[2];
    if (myMbti === partnerMbti) {
      mbtiNote = `You share the same type (${myMbti}). Deep understanding, natural resonance — watch for a shared blind spot neither of you catches.`;
    } else if (sameN && !sameTF) {
      mbtiNote = `You perceive the world similarly (both ${myMbti[1] === 'N' ? 'intuitive' : 'sensing'}) but decide differently (${myMbti[2]} vs ${partnerMbti[2]}). This is one of the classic strong-pairing patterns.`;
    } else if (!sameN) {
      mbtiNote = `You perceive very differently — one concrete (S), one abstract (N). High-potential pairing if you both stay curious about how the other sees.`;
    } else {
      mbtiNote = `You share both perception and judgment functions. Similar worldview — also similar blind spots.`;
    }
  }

  let astroNote = '';
  if (mySign && partnerSign) {
    const elA = zodiacData[mySign].element;
    const elB = zodiacData[partnerSign].element;
    if (elA === elB) {
      astroNote = `Both ${elA}. Deep resonance, easy shared language. Watch for an echo chamber — the other element might be missing from the relationship.`;
    } else if ((elA === 'fire' && elB === 'air') || (elA === 'air' && elB === 'fire')) {
      astroNote = `Fire and air — air feeds fire, fire energises air. This is the inspiration pairing: ideas + action.`;
    } else if ((elA === 'water' && elB === 'earth') || (elA === 'earth' && elB === 'water')) {
      astroNote = `Water and earth — earth holds water, water softens earth. This is the nurture pairing: emotional depth + grounded presence.`;
    } else if ((elA === 'fire' && elB === 'water') || (elA === 'water' && elB === 'fire')) {
      astroNote = `Fire and water — steam pairing. Intense, passionate, also friction-prone. The heat can be transformative or scorching depending on the self-awareness of both.`;
    } else {
      astroNote = `Elements differ — the pairing asks for translation between different modes of being. Real potential once you learn to read each other's native language.`;
    }
  }

  const strengths: string[] = [];
  const growthEdges: string[] = [];
  let advice = '';

  if (overallScore >= 80) {
    strengths.push('Strong natural alignment', 'Easy shared language', 'Mutual understanding comes quickly');
    growthEdges.push('Risk of becoming an echo chamber', 'Must keep challenging each other to grow');
    advice = 'The compatibility is real — don\'t coast on it. The best high-fit relationships stay alive because both people keep growing.';
  } else if (overallScore >= 60) {
    strengths.push('Complementary differences', 'Balanced perspectives', 'Capacity to teach each other');
    growthEdges.push('Translation work required', 'Misunderstandings in first 90 days of the relationship');
    advice = 'This is the middle zone — most real relationships live here. The work is learning each other\'s native language without needing the other to speak yours.';
  } else {
    strengths.push('Opposite strengths that can compensate weaknesses', 'Rich potential for growth if both are committed');
    growthEdges.push('Significant translation required', 'Conflict patterns will emerge around core differences', 'Needs explicit communication agreements');
    advice = 'Lower-fit pairings can absolutely work — but only with both people committed to the repair work. This is a relationship that will stretch you if you let it.';
  }

  return {
    overallScore,
    mbtiScore,
    astroScore,
    mbtiNote,
    astroNote,
    strengths,
    growthEdges,
    advice,
  };
}

export { MBTI_TYPES };
