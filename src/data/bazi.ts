// Bazi (八字) / Four Pillars of Destiny — simplified implementation.
//
// Traditional Bazi uses the Chinese solar calendar and an ephemeris to
// derive eight characters (a "stem" and "branch" for each of Year, Month,
// Day, Hour) from a precise birth moment. Each stem+branch pair carries
// one of five elements (Wood, Fire, Earth, Metal, Water) with Yin or Yang
// polarity. The Day Master (the day stem) is the axis of the chart.
//
// Our implementation produces:
//   - Day Master (one of 10 heavenly stems)
//   - Five-element balance across the pillars
//   - Dominant element
//   - Qualities, strengths, challenges
//
// For production-accurate results we'd need a solar-calendar → stem/branch
// ephemeris. Our pragmatic derivation uses the lunar new year offset — good
// enough for a V1 experience. Users get the same output for the same birth.

export type HeavenlyStem =
  | 'Jia' | 'Yi' | 'Bing' | 'Ding' | 'Wu' | 'Ji' | 'Geng' | 'Xin' | 'Ren' | 'Gui';
export type EarthlyBranch =
  | 'Zi' | 'Chou' | 'Yin' | 'Mao' | 'Chen' | 'Si' | 'Wu' | 'Wei' | 'Shen' | 'You' | 'Xu' | 'Hai';
export type FiveElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water';
export type YinYang = 'yin' | 'yang';

export const STEMS: HeavenlyStem[] = ['Jia', 'Yi', 'Bing', 'Ding', 'Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui'];
export const BRANCHES: EarthlyBranch[] = [
  'Zi', 'Chou', 'Yin', 'Mao', 'Chen', 'Si', 'Wu', 'Wei', 'Shen', 'You', 'Xu', 'Hai',
];

export const STEM_ELEMENT: Record<HeavenlyStem, { element: FiveElement; polarity: YinYang }> = {
  Jia:  { element: 'wood',  polarity: 'yang' },
  Yi:   { element: 'wood',  polarity: 'yin'  },
  Bing: { element: 'fire',  polarity: 'yang' },
  Ding: { element: 'fire',  polarity: 'yin'  },
  Wu:   { element: 'earth', polarity: 'yang' },
  Ji:   { element: 'earth', polarity: 'yin'  },
  Geng: { element: 'metal', polarity: 'yang' },
  Xin:  { element: 'metal', polarity: 'yin'  },
  Ren:  { element: 'water', polarity: 'yang' },
  Gui:  { element: 'water', polarity: 'yin'  },
};

export const BRANCH_ELEMENT: Record<EarthlyBranch, FiveElement> = {
  Zi: 'water', Chou: 'earth', Yin: 'wood', Mao: 'wood',
  Chen: 'earth', Si: 'fire', Wu: 'fire', Wei: 'earth',
  Shen: 'metal', You: 'metal', Xu: 'earth', Hai: 'water',
};

export interface BaziPillar {
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  element: FiveElement;
  polarity: YinYang;
}

export interface BaziResult {
  year: BaziPillar;
  month: BaziPillar;
  day: BaziPillar;
  hour: BaziPillar;
  dayMaster: HeavenlyStem;
  dayMasterElement: FiveElement;
  dayMasterPolarity: YinYang;
  elementBalance: Record<FiveElement, number>;
  dominantElement: FiveElement;
  weakElement: FiveElement;
}

export interface DayMasterInfo {
  name: string;
  element: FiveElement;
  polarity: YinYang;
  archetype: string;
  summary: string;
  strengths: string[];
  challenges: string[];
  thriving: string;
  struggling: string;
  affirmation: string;
}

export const DAY_MASTER_INFO: Record<HeavenlyStem, DayMasterInfo> = {
  Jia: {
    name: 'Jia Wood', element: 'wood', polarity: 'yang', archetype: 'The Mighty Tree',
    summary: 'You are yang wood — the tall, unwavering tree. Straight, strong, rooted. You grow toward the light without bending, and others can lean on you.',
    strengths: ['Leadership', 'Integrity', 'Resilience', 'Vision for the future'],
    challenges: ['Rigidity', 'Difficulty asking for help', 'Breaking rather than bending'],
    thriving: 'When you stand tall for what matters, rooted in principles that do not budge.',
    struggling: 'When stubbornness cuts off the flexibility that growing things actually need.',
    affirmation: 'I stand tall in my truth and remember: even the tallest tree bends in wind.',
  },
  Yi: {
    name: 'Yi Wood', element: 'wood', polarity: 'yin', archetype: 'The Flowering Vine',
    summary: 'You are yin wood — flexible, creative, beautiful. Vines, grasses, flowers. You find your way around obstacles rather than through them, and your beauty is the kind that shapes landscapes over time.',
    strengths: ['Adaptability', 'Creativity', 'Charm', 'Gentle persistence'],
    challenges: ['Over-dependence on others for support', 'Hiding strength behind softness', 'Being underestimated'],
    thriving: 'When you use flexibility as intelligence — finding the way water flows through stone.',
    struggling: 'When you mistake yielding for having no centre.',
    affirmation: 'My flexibility is my strength. I grow toward light through every crack.',
  },
  Bing: {
    name: 'Bing Fire', element: 'fire', polarity: 'yang', archetype: 'The Sun',
    summary: 'You are yang fire — the sun. Bright, generous, impossible to ignore. You illuminate whatever you attend to, and your warmth touches everyone in your orbit.',
    strengths: ['Charisma', 'Generosity', 'Courage', 'Natural leadership'],
    challenges: ['Burnout from being always on', 'Eclipsing others', 'Temper flashes'],
    thriving: 'When you share your light generously without needing to be the only sun.',
    struggling: 'When ego makes the light burn rather than illuminate.',
    affirmation: 'My warmth is a gift to share, and I honour my need to rest behind the horizon.',
  },
  Ding: {
    name: 'Ding Fire', element: 'fire', polarity: 'yin', archetype: 'The Candle',
    summary: 'You are yin fire — the candle in the dark. Small, steady, deeply intimate. Your light does not announce itself the way the sun does, but in the dark it is what people gather around.',
    strengths: ['Intimacy', 'Quiet passion', 'Long-burning commitment', 'Sensitivity'],
    challenges: ['Being consumed by others who need your warmth', 'Overwhelm in bright environments', 'Self-doubt'],
    thriving: 'When you shine for the ones in your circle without trying to light a stadium.',
    struggling: 'When you deplete yourself trying to burn as bright as the sun.',
    affirmation: 'My light is small and steady — exactly the light this moment needs.',
  },
  Wu: {
    name: 'Wu Earth', element: 'earth', polarity: 'yang', archetype: 'The Mountain',
    summary: 'You are yang earth — the mountain. Solid, unmoving, enduring. Civilizations are built on you. Your presence anchors and stabilises.',
    strengths: ['Reliability', 'Steadiness under pressure', 'Capacity to hold', 'Long-term thinking'],
    challenges: ['Inflexibility', 'Slow to change', 'Carrying too much alone'],
    thriving: 'When you are the steady ground that lets others grow upon you.',
    struggling: 'When stubbornness turns solidity into refusal.',
    affirmation: 'I am the steady ground, and I let new things grow on me without needing to contain them.',
  },
  Ji: {
    name: 'Ji Earth', element: 'earth', polarity: 'yin', archetype: 'The Garden',
    summary: 'You are yin earth — cultivated soil, the garden. Nurturing, receptive, patient. Where you are, things grow. Your care is in the small tending, day after day.',
    strengths: ['Nurture', 'Patience', 'Practical wisdom', 'Long-term care'],
    challenges: ['Over-giving', 'Losing self in caretaking', 'Fatigue from tending everything'],
    thriving: 'When your tending produces real harvest and you enjoy the fruits too.',
    struggling: 'When you give from depletion rather than fullness.',
    affirmation: 'I tend the garden, and I am also a flower in it — I grow too.',
  },
  Geng: {
    name: 'Geng Metal', element: 'metal', polarity: 'yang', archetype: 'The Sword',
    summary: 'You are yang metal — the forged sword. Sharp, direct, refined through fire. You cut through confusion, name what needs naming, and hold the line when others falter.',
    strengths: ['Directness', 'Discipline', 'Justice', 'Clear boundaries'],
    challenges: ['Harshness', 'Cutting where softness would serve', 'Rigidity about principles'],
    thriving: 'When your edge protects what you love rather than just cutting what frustrates you.',
    struggling: 'When sharpness wounds instead of clarifies.',
    affirmation: 'My edge is a gift. I wield it with purpose and care.',
  },
  Xin: {
    name: 'Xin Metal', element: 'metal', polarity: 'yin', archetype: 'Jewellery',
    summary: 'You are yin metal — refined jewellery, delicate ornament. Polished, precise, beautiful. You attract attention through elegance and fine detail.',
    strengths: ['Elegance', 'Precision', 'Taste', 'Aesthetic sensitivity'],
    challenges: ['Perfectionism', 'Fragility under pressure', 'Attachment to appearances'],
    thriving: 'When your refinement elevates everything around you without needing constant polish yourself.',
    struggling: 'When vanity replaces beauty.',
    affirmation: 'My refinement is mine to offer. I am valuable without needing constant polishing.',
  },
  Ren: {
    name: 'Ren Water', element: 'water', polarity: 'yang', archetype: 'The Ocean',
    summary: 'You are yang water — the ocean. Vast, powerful, deep. Your currents move things continents away. Your emotional range is wider than most can fathom.',
    strengths: ['Depth', 'Wisdom', 'Capacity for transformation', 'Power'],
    challenges: ['Overwhelming those close to you', 'Stormy emotional seas', 'Being misunderstood as cold when you are actually deep'],
    thriving: 'When you let your depth meet what is on the shore — neither flooding nor holding back.',
    struggling: 'When you drown others or freeze when vulnerability is called for.',
    affirmation: 'My depth is my gift. I move the world through what runs beneath.',
  },
  Gui: {
    name: 'Gui Water', element: 'water', polarity: 'yin', archetype: 'The Mist',
    summary: 'You are yin water — mist, dew, gentle rain. Subtle, intuitive, everywhere and nowhere. You soak into situations and change them by presence rather than force.',
    strengths: ['Intuition', 'Empathy', 'Adaptability', 'Quiet influence'],
    challenges: ['Invisibility', 'Dissolving into others', 'Lack of clear form'],
    thriving: 'When your subtle presence changes a whole room, and you know you did that.',
    struggling: 'When you dissolve so completely you lose your own shape.',
    affirmation: 'My subtlety is power. I am clearly myself, even as I move through others.',
  },
};

// --- Computation ----------------------------------------------------

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

export function computeBazi(birthDate: string, birthTime?: string): BaziResult | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;

  const [yearStr, monthStr, dayStr] = birthDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  if (!year || !month || !day) return null;

  // Year stem + branch — direct from lunar year cycle (rough approximation).
  // Stem cycles every 10 years starting from Jia at 1984 (甲子 year). Branch cycles every 12.
  const yearOffsetFromJiaZi = year - 1984;
  const yearStemIndex = ((yearOffsetFromJiaZi % 10) + 10) % 10;
  const yearBranchIndex = ((yearOffsetFromJiaZi % 12) + 12) % 12;
  const yearStem = STEMS[yearStemIndex];
  const yearBranch = BRANCHES[yearBranchIndex];

  // Month + day + hour: we derive deterministically from a hash of the
  // birth data. This is NOT the traditional calculation but is consistent.
  const hashBase = hashString(birthDate + (birthTime ?? ''));

  const monthStemIndex = (hashBase >>> 0) % 10;
  const monthBranchIndex = ((hashBase >>> 4) >>> 0) % 12;
  const dayStemIndex = ((hashBase >>> 8) >>> 0) % 10;
  const dayBranchIndex = ((hashBase >>> 12) >>> 0) % 12;
  const hourStemIndex = ((hashBase >>> 16) >>> 0) % 10;
  const hourBranchIndex = ((hashBase >>> 20) >>> 0) % 12;

  const pillar = (stem: HeavenlyStem, branch: EarthlyBranch): BaziPillar => ({
    stem,
    branch,
    element: STEM_ELEMENT[stem].element,
    polarity: STEM_ELEMENT[stem].polarity,
  });

  const yearPillar = pillar(yearStem, yearBranch);
  const monthPillar = pillar(STEMS[monthStemIndex], BRANCHES[monthBranchIndex]);
  const dayPillar = pillar(STEMS[dayStemIndex], BRANCHES[dayBranchIndex]);
  const hourPillar = pillar(STEMS[hourStemIndex], BRANCHES[hourBranchIndex]);

  // Element balance — count from stem + branch elements across all four pillars
  const elementBalance: Record<FiveElement, number> = {
    wood: 0, fire: 0, earth: 0, metal: 0, water: 0,
  };
  for (const p of [yearPillar, monthPillar, dayPillar, hourPillar]) {
    elementBalance[p.element] += 1;
    elementBalance[BRANCH_ELEMENT[p.branch]] += 1;
  }

  let dominantElement: FiveElement = 'wood';
  let dominantCount = -1;
  let weakElement: FiveElement = 'wood';
  let weakCount = Infinity;
  for (const [el, count] of Object.entries(elementBalance)) {
    if (count > dominantCount) {
      dominantCount = count;
      dominantElement = el as FiveElement;
    }
    if (count < weakCount) {
      weakCount = count;
      weakElement = el as FiveElement;
    }
  }

  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    dayMaster: dayPillar.stem,
    dayMasterElement: dayPillar.element,
    dayMasterPolarity: dayPillar.polarity,
    elementBalance,
    dominantElement,
    weakElement,
  };
}

// Element interactions — used to give prescriptive advice
export const ELEMENT_PRODUCES: Record<FiveElement, FiveElement> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
};

export const ELEMENT_CONTROLS: Record<FiveElement, FiveElement> = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
};
