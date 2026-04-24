// Ayurvedic dosha quiz — 30 questions across the three doshas (Vata, Pitta,
// Kapha). Uses a forced-choice (1 of 3) per question so the runner can
// sum per-dosha points cleanly.
//
// Scoring: each question has 3 options (value 1=Vata, 2=Pitta, 3=Kapha).
// The dominant dosha at the end is the result. Multiple doshas close in
// score indicate a "dual-dosha" constitution (e.g. Vata-Pitta) — we
// surface both when the top two are within 3 points.

import type { QuizDefinition } from '../types';

export type Dosha = 'vata' | 'pitta' | 'kapha';

export const DOSHA_BY_VALUE: Record<number, Dosha> = {
  1: 'vata',
  2: 'pitta',
  3: 'kapha',
};

export const ayurvedaQuiz: QuizDefinition = {
  id: 'ayurveda-dosha-v1',
  type: 'ayurveda-dosha',
  title: 'Ayurvedic Dosha',
  description: 'Thirty questions on body, mind, and habits to reveal your dominant dosha — Vata (air/space), Pitta (fire/water), or Kapha (earth/water). Ayurveda is the traditional Indian system of mind-body wellness; your dosha shows the default way your nature expresses itself and what tends to throw it out of balance.',
  questions: [
    { id: 'ay1', text: 'My body frame is best described as…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Thin, light, wiry — I struggle to put on weight.' },
      { value: 2, label: 'Medium, well-proportioned, muscular.' },
      { value: 3, label: 'Solid, broad, strong — I put on weight easily.' },
    ]},
    { id: 'ay2', text: 'My skin tends to be…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Dry, thin, often cool to touch.' },
      { value: 2, label: 'Sensitive, warm, prone to redness or breakouts.' },
      { value: 3, label: 'Smooth, thick, oily, cool.' },
    ]},
    { id: 'ay3', text: 'My hair is…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Dry, coarse, or frizzy.' },
      { value: 2, label: 'Fine, straight, oily at the root; thinning or early greying.' },
      { value: 3, label: 'Thick, lustrous, wavy.' },
    ]},
    { id: 'ay4', text: 'My appetite is…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Irregular — sometimes ravenous, sometimes forget to eat.' },
      { value: 2, label: 'Strong and sharp — I get irritable when hungry.' },
      { value: 3, label: 'Steady but slow — I can skip meals without feeling much.' },
    ]},
    { id: 'ay5', text: 'My digestion is…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Variable, often bloated or constipated.' },
      { value: 2, label: 'Fast, sometimes with heartburn or loose stools.' },
      { value: 3, label: 'Slow, heavy after meals.' },
    ]},
    { id: 'ay6', text: 'My energy through the day is…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Comes in bursts, then crashes.' },
      { value: 2, label: 'Strong and focused when I have a goal.' },
      { value: 3, label: 'Steady and enduring.' },
    ]},
    { id: 'ay7', text: 'My sleep is…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Light, often interrupted by thoughts.' },
      { value: 2, label: 'Sound but short — I wake up alert.' },
      { value: 3, label: 'Deep and long — I can oversleep easily.' },
    ]},
    { id: 'ay8', text: 'Under stress I tend to become…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Anxious, scattered, worried.' },
      { value: 2, label: 'Irritable, critical, impatient.' },
      { value: 3, label: 'Withdrawn, sluggish, avoidant.' },
    ]},
    { id: 'ay9', text: 'My memory is…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Quick to learn, quick to forget.' },
      { value: 2, label: 'Sharp and accurate.' },
      { value: 3, label: 'Slow to take in, strong once I have it.' },
    ]},
    { id: 'ay10', text: 'My speech tends to be…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Quick, lots of words, tangents.' },
      { value: 2, label: 'Precise, direct, sometimes sharp.' },
      { value: 3, label: 'Slow, thoughtful, calm.' },
    ]},
    { id: 'ay11', text: 'My preferred climate is…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Warm and humid — I hate the cold.' },
      { value: 2, label: 'Cool and breezy — I overheat easily.' },
      { value: 3, label: 'Warm and dry — I dislike cold damp weather.' },
    ]},
    { id: 'ay12', text: 'When I exercise I prefer…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Variety — yoga one day, dance the next.' },
      { value: 2, label: 'Competition — running, cycling, intensity.' },
      { value: 3, label: 'Sustained effort — hiking, swimming, long walks.' },
    ]},
    { id: 'ay13', text: 'My natural rhythm of doing things is…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Fast but inconsistent.' },
      { value: 2, label: 'Intense and efficient.' },
      { value: 3, label: 'Steady and methodical.' },
    ]},
    { id: 'ay14', text: 'When making decisions I…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Change my mind often.' },
      { value: 2, label: 'Decide quickly and stick to it.' },
      { value: 3, label: 'Take my time; hard to shift once decided.' },
    ]},
    { id: 'ay15', text: 'My preferred tastes are…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Sweet, sour, salty — warm moist foods.' },
      { value: 2, label: 'Sweet, bitter, astringent — cooling foods.' },
      { value: 3, label: 'Pungent, bitter, astringent — light warm foods.' },
    ]},
    { id: 'ay16', text: 'How I spend money:', dimension: 'DOSHA', options: [
      { value: 1, label: 'Impulsive, on small things, then regret.' },
      { value: 2, label: 'Planned but on quality and status items.' },
      { value: 3, label: 'Careful, I save and accumulate.' },
    ]},
    { id: 'ay17', text: 'My typical mood is…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Changeable — happy one minute, anxious the next.' },
      { value: 2, label: 'Focused and intense.' },
      { value: 3, label: 'Calm and stable.' },
    ]},
    { id: 'ay18', text: 'In conflict I…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Get overwhelmed and flee.' },
      { value: 2, label: 'Engage directly and forcefully.' },
      { value: 3, label: 'Withdraw and avoid.' },
    ]},
    { id: 'ay19', text: 'My body temperature tends to be…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Cold hands and feet.' },
      { value: 2, label: 'Warm, often sweaty.' },
      { value: 3, label: 'Cool and steady.' },
    ]},
    { id: 'ay20', text: 'When bored I…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Seek novelty, travel, change.' },
      { value: 2, label: 'Find a challenge or goal.' },
      { value: 3, label: 'Nap, eat, or stay comfortable.' },
    ]},
    { id: 'ay21', text: 'My laugh is…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Quick, high, easily triggered.' },
      { value: 2, label: 'Sharp, sometimes sarcastic.' },
      { value: 3, label: 'Deep, hearty, slow to start.' },
    ]},
    { id: 'ay22', text: 'My tolerance for pain is…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Low — I feel things intensely.' },
      { value: 2, label: 'Medium — I push through.' },
      { value: 3, label: 'High — I endure.' },
    ]},
    { id: 'ay23', text: 'I dream…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Vividly, often about flying or fleeing.' },
      { value: 2, label: 'Passionately, sometimes about conflict or fire.' },
      { value: 3, label: 'Peacefully, about water, romance, or home.' },
    ]},
    { id: 'ay24', text: 'My skin in winter…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Gets very dry and cracked.' },
      { value: 2, label: 'Stays mostly okay.' },
      { value: 3, label: 'Feels a bit puffy or oily.' },
    ]},
    { id: 'ay25', text: 'I tend to want to…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Move, dance, explore.' },
      { value: 2, label: 'Achieve, win, lead.' },
      { value: 3, label: 'Settle, nurture, rest.' },
    ]},
    { id: 'ay26', text: 'My way of learning is…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Quick pickup, quick forget.' },
      { value: 2, label: 'Focused study, sharp recall.' },
      { value: 3, label: 'Slow but permanent.' },
    ]},
    { id: 'ay27', text: 'My relationship to routine is…', dimension: 'DOSHA', options: [
      { value: 1, label: 'I resist it but I thrive with it.' },
      { value: 2, label: 'I structure my own.' },
      { value: 3, label: 'I love it — routine feels like home.' },
    ]},
    { id: 'ay28', text: 'My emotional style is…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Expressive, variable, often anxious.' },
      { value: 2, label: 'Intense, often angry or passionate.' },
      { value: 3, label: 'Steady, sometimes slow to express.' },
    ]},
    { id: 'ay29', text: 'My physical endurance is…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Short bursts then exhaustion.' },
      { value: 2, label: 'Strong when motivated.' },
      { value: 3, label: 'Remarkable — I last.' },
    ]},
    { id: 'ay30', text: 'My relationship with silence is…', dimension: 'DOSHA', options: [
      { value: 1, label: 'Hard — my mind chatters.' },
      { value: 2, label: 'Useful briefly for focus.' },
      { value: 3, label: 'Deeply restorative.' },
    ]},
  ],
};

export interface DoshaResult {
  primary: Dosha;
  secondary?: Dosha;
  scores: Record<Dosha, number>;
}

export function calculateDosha(answers: Record<string, number>): DoshaResult {
  const scores: Record<Dosha, number> = { vata: 0, pitta: 0, kapha: 0 };
  for (const value of Object.values(answers)) {
    const dosha = DOSHA_BY_VALUE[value];
    if (dosha) scores[dosha]++;
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]) as [Dosha, number][];
  const primary = sorted[0][0];
  const secondary = sorted[0][1] - sorted[1][1] <= 3 ? sorted[1][0] : undefined;
  return { primary, secondary, scores };
}

export interface DoshaInfo {
  name: string;
  elements: string;
  tagline: string;
  summary: string;
  thriving: string;
  outOfBalance: string;
  dietTips: string[];
  lifestyleTips: string[];
  affirmation: string;
}

export const DOSHA_INFO: Record<Dosha, DoshaInfo> = {
  vata: {
    name: 'Vata',
    elements: 'Air + Space',
    tagline: 'The wind — quick, creative, changing.',
    summary: 'Vata rules movement, circulation, breath, and thought. When balanced, you are creative, adaptable, and full of fresh ideas — the wind that carries things into new territory. When imbalanced, that same wind scatters you: anxiety, dryness, poor sleep, irregular digestion, overwhelm from too much stimulation.',
    thriving: 'Warm, nourishing, grounded, routine. Your gift is lightness and creativity — but only when anchored by consistency.',
    outOfBalance: 'Anxiety, constipation, dry skin, insomnia, feeling scattered or depleted, irregular appetite.',
    dietTips: [
      'Warm, cooked, moist foods — soups, stews, warm grains',
      'Sweet, sour, salty tastes — healthy fats, ripe fruits, nuts',
      'Avoid raw foods, cold drinks, excessive caffeine, frozen desserts',
      'Eat regularly at the same times — skipping meals worsens Vata',
    ],
    lifestyleTips: [
      'Routine is medicine — consistent sleep, meals, movement',
      'Warm oil self-massage (abhyanga) with sesame oil before shower',
      'Gentle yoga, walking, tai chi — avoid over-exertion',
      'Early bed, warm environment',
      'Limit screens and stimulation, especially at night',
    ],
    affirmation: 'I slow down. I stay warm. I return to my rhythm — and my creativity becomes a gift.',
  },
  pitta: {
    name: 'Pitta',
    elements: 'Fire + Water',
    tagline: 'The flame — sharp, driven, transformative.',
    summary: 'Pitta rules metabolism, digestion, intellect, and transformation. When balanced, you are focused, courageous, a natural leader with sharp discernment. When imbalanced, the same fire burns too hot: irritability, inflammation, perfectionism, burnout, a tendency to criticize self and others harshly.',
    thriving: 'Cool, calm, with purposeful work that serves a cause larger than yourself. Your fire illuminates.',
    outOfBalance: 'Irritability, heartburn, skin rashes, inflammation, perfectionism, burnout, harsh self-judgement, excessive competition.',
    dietTips: [
      'Cooling foods — cucumbers, melons, leafy greens, coconut',
      'Sweet, bitter, astringent tastes — avoid spicy, salty, sour excess',
      'Eat at regular times — hunger makes Pitta worse',
      'Limit red meat, alcohol, caffeine, fried foods',
      'Hydrate — cool (not cold) water throughout the day',
    ],
    lifestyleTips: [
      'Moderate intensity — you will push yourself too hard by default',
      'Cooling exercise — swimming, moonlit walks, gentle cycling',
      'Cool environments, shady spots in summer',
      'Coconut oil self-massage',
      'Release the need to win every conversation — pause before responding when heated',
    ],
    affirmation: 'My fire illuminates. I let myself cool so the flame does not burn the hand that holds it.',
  },
  kapha: {
    name: 'Kapha',
    elements: 'Earth + Water',
    tagline: 'The earth — steady, nurturing, enduring.',
    summary: 'Kapha rules structure, lubrication, immunity, and endurance. When balanced, you are calm, loyal, compassionate, with rock-solid stamina — the steady ground everyone relies on. When imbalanced, the ground becomes a swamp: weight gain, congestion, lethargy, stuck patterns, difficulty starting new things.',
    thriving: 'Movement, variety, warmth, stimulation. Your natural stability pairs beautifully with regular novelty.',
    outOfBalance: 'Weight gain, congestion, excessive sleep, lethargy, depression, clinging to patterns that no longer serve, emotional over-eating.',
    dietTips: [
      'Light, warm, pungent foods — ginger, black pepper, cinnamon',
      'Pungent, bitter, astringent tastes — reduce sweet, salty, sour',
      'Eat your biggest meal at midday when digestion is strongest',
      'Limit dairy, wheat, sugar, cold drinks, heavy oily foods',
      'Intermittent fasting or skipping breakfast once a week can help',
    ],
    lifestyleTips: [
      'Move every day — even 20 minutes makes a difference for Kapha',
      'Vigorous exercise — running, dance, hot yoga',
      'Rise early (pre-6am ideal), avoid daytime naps',
      'Dry brushing before shower to stimulate circulation',
      'Variety matters — break routine regularly',
      'Declutter your space monthly — Kapha accumulates',
    ],
    affirmation: 'My steadiness is my gift. I move, I warm, I light my own fire — and I let the ground bloom.',
  },
};
