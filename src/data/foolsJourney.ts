// The Fool's Journey — 22 progression levels, each tied to a Major Arcana
// card. Ordered narrative: the Fool steps off the cliff (level 1) and
// returns home complete at the World (level 22). Used to render an
// avatar/level system that maps onto the user's existing profile.level.

export interface JourneyLevel {
  level: number;       // 1-22
  cardId: number;      // 0-21 — Major Arcana index
  cardName: string;
  title: string;       // The user's earned title at this level
  theme: string;       // Short tagline
  milestone: string;   // What the user has done to reach this rank
}

export const FOOLS_JOURNEY: JourneyLevel[] = [
  { level: 1, cardId: 0, cardName: 'The Fool', title: 'The Wandering Seeker', theme: 'You step into the unknown.', milestone: 'You\'ve started your daily ritual.' },
  { level: 2, cardId: 1, cardName: 'The Magician', title: 'The Channeler', theme: 'You learn to focus your will.', milestone: 'You\'ve drawn cards for a full week.' },
  { level: 3, cardId: 2, cardName: 'The High Priestess', title: 'The Listener', theme: 'You begin to trust intuition.', milestone: 'You\'ve journaled multiple readings.' },
  { level: 4, cardId: 3, cardName: 'The Empress', title: 'The Cultivator', theme: 'You nurture what wants to grow.', milestone: 'Your practice is taking root.' },
  { level: 5, cardId: 4, cardName: 'The Emperor', title: 'The Builder', theme: 'You build structure around the work.', milestone: 'You\'ve held a daily streak.' },
  { level: 6, cardId: 5, cardName: 'The Hierophant', title: 'The Student', theme: 'You learn the deeper teachings.', milestone: 'You\'ve studied multiple cards in depth.' },
  { level: 7, cardId: 6, cardName: 'The Lovers', title: 'The Heart-Aligned', theme: 'You make choices from values, not fear.', milestone: 'You\'ve done compatibility or relationship work.' },
  { level: 8, cardId: 7, cardName: 'The Chariot', title: 'The Disciplined Will', theme: 'You drive forward through opposition.', milestone: 'You\'ve overcome a dry spell in practice.' },
  { level: 9, cardId: 8, cardName: 'Strength', title: 'The Tamer', theme: 'You meet your inner beast with love.', milestone: 'You\'ve done shadow-work readings.' },
  { level: 10, cardId: 9, cardName: 'The Hermit', title: 'The Inner Light-Bearer', theme: 'You go inward and find the lantern.', milestone: 'You\'ve sat with difficult cards.' },
  { level: 11, cardId: 10, cardName: 'The Wheel of Fortune', title: 'The Cycle-Reader', theme: 'You see the wheel turning.', milestone: 'You\'ve tracked patterns across months.' },
  { level: 12, cardId: 11, cardName: 'Justice', title: 'The Truth-Teller', theme: 'You weigh fairly, including yourself.', milestone: 'You\'ve done karmic or cause-effect readings.' },
  { level: 13, cardId: 12, cardName: 'The Hanged Man', title: 'The Surrenderer', theme: 'You let go of needing to know.', milestone: 'You\'ve sat with uncertainty long enough to befriend it.' },
  { level: 14, cardId: 13, cardName: 'Death', title: 'The Transformer', theme: 'You let what must end, end.', milestone: 'You\'ve walked through a real ending.' },
  { level: 15, cardId: 14, cardName: 'Temperance', title: 'The Alchemist', theme: 'You blend opposites without diluting either.', milestone: 'You\'ve integrated readings into life choices.' },
  { level: 16, cardId: 15, cardName: 'The Devil', title: 'The Chain-Breaker', theme: 'You name the bondage you didn\'t choose.', milestone: 'You\'ve done deep shadow work.' },
  { level: 17, cardId: 16, cardName: 'The Tower', title: 'The Survived Lightning', theme: 'You\'ve been struck and remained standing.', milestone: 'You\'ve weathered a sudden upheaval.' },
  { level: 18, cardId: 17, cardName: 'The Star', title: 'The Hopeful', theme: 'You return to the river and drink.', milestone: 'You\'ve healed enough to hope again.' },
  { level: 19, cardId: 18, cardName: 'The Moon', title: 'The Dream-Walker', theme: 'You enter the unconscious without flinching.', milestone: 'You\'ve interpreted your dreams or done deep intuition work.' },
  { level: 20, cardId: 19, cardName: 'The Sun', title: 'The Radiant', theme: 'You become what you sought.', milestone: 'You shine a light others can read by.' },
  { level: 21, cardId: 20, cardName: 'Judgement', title: 'The Awakener', theme: 'You answer the call you nearly didn\'t hear.', milestone: 'You\'ve made a major life recommitment.' },
  { level: 22, cardId: 21, cardName: 'The World', title: 'The Returned Whole', theme: 'You complete the cycle and dance the next one.', milestone: 'You\'ve come home — different, complete, ready.' },
];

export function getJourneyLevel(level: number): JourneyLevel | null {
  return FOOLS_JOURNEY.find((l) => l.level === level) ?? null;
}

export function getCurrentJourney(profileLevel: number): {
  current: JourneyLevel;
  next: JourneyLevel | null;
  progress: number;        // 0-1 fraction toward next level
} {
  const safe = Math.max(1, Math.min(22, Math.floor(profileLevel || 1)));
  const current = getJourneyLevel(safe) ?? FOOLS_JOURNEY[0];
  const next = getJourneyLevel(safe + 1);
  const progress = next ? safe / 22 : 1;
  return { current, next, progress };
}
