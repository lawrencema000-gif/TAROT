// Life Path number calculator — pure derivation from a birth date, no quiz.
//
// Classical numerology: sum month + day + year digits, reducing to a single
// digit EXCEPT when any intermediate sum is a "master number" (11, 22, 33),
// which is preserved.

export type LifePath = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 11 | 22 | 33;

function sumDigits(n: number): number {
  return String(n).split('').reduce((acc, d) => acc + Number(d), 0);
}

function reduceToLifePath(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = sumDigits(n);
  }
  return n;
}

export function getLifePath(birthDate: string): LifePath | null {
  const m = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  if (!year || !month || !day) return null;

  const reducedYear = reduceToLifePath(sumDigits(year));
  const reducedMonth = reduceToLifePath(month);
  const reducedDay = reduceToLifePath(day);

  const total = reducedYear + reducedMonth + reducedDay;
  const lifePath = reduceToLifePath(total);

  if (lifePath < 1 || (lifePath > 9 && ![11, 22, 33].includes(lifePath))) return null;
  return lifePath as LifePath;
}

export interface LifePathInfo {
  number: LifePath;
  title: string;
  tagline: string;
  purpose: string;
  strengths: string[];
  challenges: string[];
  affirmation: string;
}

// English canonical content — translated versions live in locale JSON
// under app.quizzes.lifePath.{number}.*
export const LIFE_PATH_INFO: Record<LifePath, LifePathInfo> = {
  1: {
    number: 1,
    title: 'The Pioneer',
    tagline: 'Independence, initiative, leadership.',
    purpose: 'You are here to lead, originate, and carve paths where none existed. Your lesson is learning to trust your own direction without needing permission.',
    strengths: ['Self-reliance', 'Courage', 'Drive', 'Originality'],
    challenges: ['Impatience', 'Going it alone when collaboration would serve', 'Resistance to being helped'],
    affirmation: 'I set my own direction — and I let others walk alongside me.',
  },
  2: {
    number: 2,
    title: 'The Diplomat',
    tagline: 'Partnership, harmony, sensitivity.',
    purpose: 'You are here to harmonize — to hold the space between people, to read nuance, to build through connection rather than force. Your lesson is finding your own voice inside the bridge you build.',
    strengths: ['Empathy', 'Intuition', 'Cooperation', 'Patience'],
    challenges: ['Codependence', 'Over-accommodating', 'Avoiding healthy conflict'],
    affirmation: 'I hold the space between — and I stay myself inside the bridge.',
  },
  3: {
    number: 3,
    title: 'The Expresser',
    tagline: 'Creativity, communication, joy.',
    purpose: 'You are here to express, inspire, and spark joy. Language, art, performance, teaching — these are your native mediums. Your lesson is letting depth and discipline shape the gift.',
    strengths: ['Creativity', 'Charisma', 'Optimism', 'Expression'],
    challenges: ['Scattering energy', 'Avoiding hard feelings by staying bright', 'Superficial reach without depth'],
    affirmation: 'I create, express, and go deep — brightness and depth belong together.',
  },
  4: {
    number: 4,
    title: 'The Builder',
    tagline: 'Stability, craft, long-range order.',
    purpose: 'You are here to build what lasts. Systems, institutions, crafts, homes. Your lesson is allowing the work to breathe — rigidity is the enemy of durability.',
    strengths: ['Discipline', 'Reliability', 'Craftsmanship', 'Patience'],
    challenges: ['Over-rigidity', 'Workaholism', 'Fear of change'],
    affirmation: 'I build for the long road and allow the structure to evolve.',
  },
  5: {
    number: 5,
    title: 'The Explorer',
    tagline: 'Freedom, change, adventure.',
    purpose: 'You are here to experience. To move, travel, transform. You are the one who shows others that the life they have is not the only life possible. Your lesson is staying long enough to let experiences land.',
    strengths: ['Curiosity', 'Adaptability', 'Magnetism', 'Restless evolution'],
    challenges: ['Flightiness', 'Avoiding roots and depth', 'Chasing stimulation over substance'],
    affirmation: 'I travel widely — and I stay long enough to be changed.',
  },
  6: {
    number: 6,
    title: 'The Nurturer',
    tagline: 'Love, responsibility, service.',
    purpose: 'You are here to love and tend — family, community, the vulnerable, the home. Your lesson is loving without losing yourself inside the caretaking.',
    strengths: ['Compassion', 'Devotion', 'Responsibility', 'Artistic sense of beauty'],
    challenges: ['Over-giving', 'Martyrdom', 'Control disguised as care'],
    affirmation: 'I give from fullness and tend my own garden first.',
  },
  7: {
    number: 7,
    title: 'The Seeker',
    tagline: 'Wisdom, solitude, depth.',
    purpose: 'You are here to go deep. Study, reflect, uncover what is true. You bring the long-range wisdom that holds a community steady. Your lesson is sharing what you know instead of hoarding it.',
    strengths: ['Analytical mind', 'Intuition', 'Depth', 'Authenticity'],
    challenges: ['Isolation', 'Distrust', 'Intellectualising feeling', 'Spiritual perfectionism'],
    affirmation: 'I bring my depth into the world — wisdom is meant to be shared.',
  },
  8: {
    number: 8,
    title: 'The Architect',
    tagline: 'Power, abundance, stewardship.',
    purpose: 'You are here to lead at scale — to move resources, build enterprises, steward power responsibly. Your lesson is remembering that material mastery and spiritual integrity are one path, not two.',
    strengths: ['Vision', 'Executive ability', 'Resilience', 'Capacity for abundance'],
    challenges: ['Money-as-identity', 'Over-work', 'Using power for control', 'Fear of loss'],
    affirmation: 'I build wealth and power in service of what I love.',
  },
  9: {
    number: 9,
    title: 'The Humanitarian',
    tagline: 'Completion, compassion, wide love.',
    purpose: 'You are here to love broadly — causes, humanity, the planet. You finish what needs ending and give what needs giving. Your lesson is staying present inside your own life while also holding the bigger picture.',
    strengths: ['Idealism', 'Compassion', 'Wisdom', 'Endings and transitions'],
    challenges: ['Martyrdom', 'Emotional distance via "saving the world"', 'Grief carried too long'],
    affirmation: 'I love wide and I live close — both at once.',
  },
  11: {
    number: 11,
    title: 'The Intuitive Messenger',
    tagline: 'Vision, inspiration, spiritual sight.',
    purpose: 'A master path. You are here to see what others can\'t and translate it into language people can carry. Your lesson is grounding the vision — channel it, don\'t be consumed by it.',
    strengths: ['Vision', 'Spiritual attunement', 'Inspiration', 'Artistic sensitivity'],
    challenges: ['Nervous system overwhelm', 'Feeling like an outsider', 'Over-idealising'],
    affirmation: 'I channel the vision and stay rooted in my body.',
  },
  22: {
    number: 22,
    title: 'The Master Builder',
    tagline: 'Vision into form at large scale.',
    purpose: 'A master path. You are here to build something enduring — an institution, a body of work, a movement. Your lesson is trusting the scale of your own capability.',
    strengths: ['Vision + execution', 'Organisational genius', 'Long-range stamina'],
    challenges: ['Feeling the weight of your own potential', 'Self-doubt at pivotal moments', 'Sacrificing relationships for the work'],
    affirmation: 'I trust my capacity — and I build with others, not in isolation.',
  },
  33: {
    number: 33,
    title: 'The Master Teacher',
    tagline: 'Love in service at a collective scale.',
    purpose: 'The rarest master path. You are here to love, heal, and teach at a scale that shapes communities. Your lesson is self-care — you cannot pour from an empty cup, and your cup is asked for often.',
    strengths: ['Unconditional love', 'Healing presence', 'Teaching by being'],
    challenges: ['Martyrdom', 'Overwhelm', 'Forgetting to be a person, not just a role'],
    affirmation: 'I love and serve from fullness — my own life matters as much as anyone\'s.',
  },
};

export function getLifePathInfo(lifePath: LifePath): LifePathInfo {
  return LIFE_PATH_INFO[lifePath];
}
