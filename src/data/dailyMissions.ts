/**
 * Daily Energy Missions — tiny, high-leverage habit prompts.
 *
 * The pool is ~40 missions grouped into 5 categories. The home widget
 * picks one per day per user using a deterministic hash of
 * `userId + yyyy-mm-dd`, so the mission is stable across sessions on
 * the same day (doesn't change on refresh) and rotates at midnight.
 *
 * Categories are weighted: gratitude + presence are lighter, body +
 * reflection are slightly heavier. Each mission is a 30-second
 * micro-commitment — the whole point is that it's easier to say yes
 * than to skip.
 */

export type MissionCategory = 'gratitude' | 'presence' | 'reflection' | 'body' | 'action';

export interface DailyMission {
  id: string;
  category: MissionCategory;
  prompt: string;
  /** Why this matters — tiny one-liner shown under the prompt. */
  why: string;
}

export const DAILY_MISSIONS: DailyMission[] = [
  // ── Gratitude (8) ─────────────────────────────────────────────────
  { id: 'g1', category: 'gratitude', prompt: 'Write down three things you\'re grateful for right now.', why: 'Naming them physically shifts your nervous system toward abundance.' },
  { id: 'g2', category: 'gratitude', prompt: 'Text someone a specific reason you appreciate them.', why: 'A tiny sincere gesture compounds the bond far beyond its cost.' },
  { id: 'g3', category: 'gratitude', prompt: 'Thank your body for one thing it did for you today.', why: 'The body carries you all day; acknowledgement is a form of care.' },
  { id: 'g4', category: 'gratitude', prompt: 'Write one line of gratitude to your past self.', why: 'The person you were did something that shaped who you are now.' },
  { id: 'g5', category: 'gratitude', prompt: 'Notice one ordinary thing in your space that you love.', why: 'Attention is the currency of appreciation.' },
  { id: 'g6', category: 'gratitude', prompt: 'Thank someone who helps you without being asked.', why: 'Invisible labor stays invisible unless you name it.' },
  { id: 'g7', category: 'gratitude', prompt: 'Look at your hands and appreciate what they do.', why: 'They write, hold, cook, type — all quietly, all day.' },
  { id: 'g8', category: 'gratitude', prompt: 'Say a quiet thank-you to a recent struggle.', why: 'Even the hard things taught you something you use now.' },

  // ── Presence (8) ──────────────────────────────────────────────────
  { id: 'p1', category: 'presence', prompt: 'Take three slow breaths with your eyes closed.', why: 'Three breaths is enough to shift your physiology.' },
  { id: 'p2', category: 'presence', prompt: 'Name five things you can see, four you can hear, three you can feel.', why: 'Classic 5-4-3 grounding — pulls you out of your head into the room.' },
  { id: 'p3', category: 'presence', prompt: 'Drink a glass of water slowly and actually taste it.', why: 'Most of the day is on autopilot; one mindful sip resets.' },
  { id: 'p4', category: 'presence', prompt: 'Step outside for 60 seconds. No phone.', why: 'Outdoor light and air do more than almost anything else in 60 seconds.' },
  { id: 'p5', category: 'presence', prompt: 'Sit quietly for two minutes. No task.', why: 'The nothing is the point.' },
  { id: 'p6', category: 'presence', prompt: 'Look up at the sky and stay there for a moment.', why: 'Horizon-looking physically widens your mental aperture.' },
  { id: 'p7', category: 'presence', prompt: 'Eat your next bite with full attention.', why: 'You eat every day anyway; attention doubles the pleasure.' },
  { id: 'p8', category: 'presence', prompt: 'Close your eyes and listen to the farthest sound you can hear.', why: 'Widens attention beyond the immediate.' },

  // ── Reflection (8) ────────────────────────────────────────────────
  { id: 'r1', category: 'reflection', prompt: 'What do you want more of in your life right now?', why: 'Naming the desire is the first step toward making room for it.' },
  { id: 'r2', category: 'reflection', prompt: 'What did you say yes to this week that you regret?', why: 'Audit what drains you — without judgement.' },
  { id: 'r3', category: 'reflection', prompt: 'Where are you spending energy that you don\'t care about?', why: 'Energy is finite. Reclaim it where it leaks.' },
  { id: 'r4', category: 'reflection', prompt: 'What would you do today if nobody was watching?', why: 'The answer often points to what you actually want.' },
  { id: 'r5', category: 'reflection', prompt: 'Who do you miss right now? Acknowledge it.', why: 'Naming the ache is half the healing.' },
  { id: 'r6', category: 'reflection', prompt: 'What\'s one thing you know you should say aloud but haven\'t?', why: 'The unsaid word tends to grow teeth.' },
  { id: 'r7', category: 'reflection', prompt: 'What did your 15-year-old self want that you still want?', why: 'The longest-held wants are usually the most honest.' },
  { id: 'r8', category: 'reflection', prompt: 'Imagine your life one year from today, on a good trajectory. Name one thing.', why: 'A vivid future is a compass.' },

  // ── Body (8) ──────────────────────────────────────────────────────
  { id: 'b1', category: 'body', prompt: 'Do three slow shoulder rolls in each direction.', why: 'Where your shoulders hold, your breath shallows.' },
  { id: 'b2', category: 'body', prompt: 'Stretch your hands and wrists for thirty seconds.', why: 'They type, tap, and swipe all day. Return them the favor.' },
  { id: 'b3', category: 'body', prompt: 'Stand up, reach overhead, exhale audibly.', why: 'Sometimes the nervous system just needs to exhale out loud.' },
  { id: 'b4', category: 'body', prompt: 'Walk around the block at a slow pace.', why: 'A slow walk is a different species from a fast walk.' },
  { id: 'b5', category: 'body', prompt: 'Drink one full glass of water right now.', why: 'Most of us are running on 70% hydration.' },
  { id: 'b6', category: 'body', prompt: 'Unclench your jaw. Then check it again in five minutes.', why: 'The jaw holds what the mouth won\'t say.' },
  { id: 'b7', category: 'body', prompt: 'Dance to one song.', why: 'Moves energy that words can\'t reach.' },
  { id: 'b8', category: 'body', prompt: 'Put your feet flat on the ground and feel the floor for a minute.', why: 'Grounding is literal — you are held by the earth.' },

  // ── Action (8) ────────────────────────────────────────────────────
  { id: 'a1', category: 'action', prompt: 'Send a message you\'ve been putting off.', why: 'The postponed thing grows heavier by the hour.' },
  { id: 'a2', category: 'action', prompt: 'Clear one small surface — desk, bedside table, a corner.', why: 'External order shifts internal weather.' },
  { id: 'a3', category: 'action', prompt: 'Make the bed. Thirty seconds. That\'s it.', why: 'A completed thing first thing sets the tone.' },
  { id: 'a4', category: 'action', prompt: 'Unsubscribe from one email list that doesn\'t serve you.', why: 'Every unsubscribe is a tiny vote for your attention.' },
  { id: 'a5', category: 'action', prompt: 'Pay one small bill or schedule one small task.', why: 'The pile in your head is mostly small things.' },
  { id: 'a6', category: 'action', prompt: 'Put away three things.', why: 'Three is achievable. Four feels like chores.' },
  { id: 'a7', category: 'action', prompt: 'Delete ten photos you no longer need.', why: 'Digital weight is real weight.' },
  { id: 'a8', category: 'action', prompt: 'Write one sentence of a thing you\'ve been putting off.', why: 'The first sentence is the whole battle.' },
];

/** Simple deterministic hash — same input always picks the same mission. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Pick today's mission for a given user (or anonymous fallback). */
export function pickDailyMission(userId: string | null, date = new Date()): DailyMission {
  const yyyyMmDd = date.toISOString().slice(0, 10);
  const seed = `${userId ?? 'anon'}_${yyyyMmDd}`;
  const idx = hash(seed) % DAILY_MISSIONS.length;
  return DAILY_MISSIONS[idx];
}
