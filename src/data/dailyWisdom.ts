// Daily Wisdom — rotating Taoist / Zen / Tao Te Ching quotes.
//
// Selection is deterministic per day (not random) so a user who opens
// the app twice in one day sees the same quote. Keyed to the day-of-year
// so the feed cycles annually.
//
// Content pulled from public-domain translations of Dao De Jing
// (Stephen Mitchell-style phrasing, paraphrased), Zhuangzi, and Zen
// koans. All quotes are in the public domain or fair-use adaptations.

export interface WisdomQuote {
  id: string;
  text: string;
  source: string;
  tradition: 'taoist' | 'zen' | 'confucian' | 'buddhist' | 'hindu';
  reflection: string;
}

export const WISDOM_QUOTES: WisdomQuote[] = [
  { id: 'ddj-1',  text: 'The Tao that can be spoken is not the eternal Tao.',                             source: 'Dao De Jing, Ch. 1',  tradition: 'taoist',   reflection: 'What in your life is trying to be reduced to words that won\'t fit?' },
  { id: 'ddj-11', text: 'The wheel\'s usefulness comes from the hollow at its centre. We work with being, but emptiness is what we use.', source: 'Dao De Jing, Ch. 11', tradition: 'taoist', reflection: 'Where does your empty space live? How are you tending the hollow at your centre?' },
  { id: 'ddj-22', text: 'Yield and overcome. Bend and be straight. Empty and be full.',                   source: 'Dao De Jing, Ch. 22', tradition: 'taoist',   reflection: 'What would yielding reveal that forcing is hiding?' },
  { id: 'ddj-33', text: 'Knowing others is wisdom; knowing yourself is enlightenment.',                   source: 'Dao De Jing, Ch. 33', tradition: 'taoist',   reflection: 'What do you know about others that you have not yet known about yourself?' },
  { id: 'ddj-44', text: 'Fame or self, which matters more? Self or wealth, which is more precious?',      source: 'Dao De Jing, Ch. 44', tradition: 'taoist',   reflection: 'Check your week. Where did your attention actually go? Does it match your answer?' },
  { id: 'ddj-56', text: 'Those who know do not speak. Those who speak do not know.',                      source: 'Dao De Jing, Ch. 56', tradition: 'taoist',   reflection: 'Where have you been explaining something you could have let be?' },
  { id: 'ddj-64', text: 'A journey of a thousand miles begins beneath one\'s feet.',                      source: 'Dao De Jing, Ch. 64', tradition: 'taoist',   reflection: 'What is the one-step version of the thing you\'re overwhelmed by?' },
  { id: 'ddj-76', text: 'The hard and stiff will break. The soft and supple will prevail.',               source: 'Dao De Jing, Ch. 76', tradition: 'taoist',   reflection: 'Where are you being hard when softness would actually hold?' },
  { id: 'zz-1',   text: 'Once Zhuang Zhou dreamed he was a butterfly. Suddenly he awoke and was Zhou again. He did not know whether Zhou had dreamed he was a butterfly or the butterfly was now dreaming it was Zhou.', source: 'Zhuangzi, Ch. 2', tradition: 'taoist', reflection: 'Which parts of the life you\'re living did you actually choose, and which are dreams you never woke from?' },
  { id: 'zz-2',   text: 'The pipes of heaven blow through ten thousand different holes. Each one sounds different. But who is doing the blowing?', source: 'Zhuangzi, Ch. 2', tradition: 'taoist', reflection: 'The voice you speak with — whose is it really?' },
  { id: 'zen-1',  text: 'Before enlightenment: chop wood, carry water. After enlightenment: chop wood, carry water.', source: 'Zen proverb', tradition: 'zen',  reflection: 'What changes about your life is not your life — it\'s your relationship to it.' },
  { id: 'zen-2',  text: 'If you meet the Buddha on the road, kill him.',                                  source: 'Linji',               tradition: 'zen',      reflection: 'What idol on your path has stopped being a guide and become an obstacle?' },
  { id: 'zen-3',  text: 'The obstacle is the path.',                                                      source: 'Zen proverb',         tradition: 'zen',      reflection: 'The thing blocking you is almost always pointing at the next teaching.' },
  { id: 'zen-4',  text: 'Sit. Rest. Work. Alone with yourself, never weary.',                             source: 'Dogen',               tradition: 'zen',      reflection: 'When was the last time you were alone with yourself without reaching for stimulation?' },
  { id: 'zen-5',  text: 'Fall seven times, stand up eight.',                                              source: 'Japanese proverb',    tradition: 'zen',      reflection: 'Which fall is this for you? And how will you stand up?' },
  { id: 'zen-6',  text: 'Let go, or be dragged.',                                                         source: 'Zen proverb',         tradition: 'zen',      reflection: 'What is trying to drag you right now? What would letting go look like?' },
  { id: 'zen-7',  text: 'You can only lose what you cling to.',                                           source: 'Attributed to the Buddha', tradition: 'buddhist', reflection: 'What are you gripping? And what if holding loosely would let you keep it longer?' },
  { id: 'zen-8',  text: 'Empty your cup so that it may be filled.',                                       source: 'Zen proverb',         tradition: 'zen',      reflection: 'Where are you so full of opinions that no new understanding can land?' },
  { id: 'zen-9',  text: 'The quieter you become, the more you can hear.',                                 source: 'Ram Dass',            tradition: 'hindu',    reflection: 'What might you hear today if you stopped adding to the noise?' },
  { id: 'bud-1',  text: 'Peace comes from within. Do not seek it without.',                               source: 'Attributed to the Buddha', tradition: 'buddhist', reflection: 'Where are you searching outside yourself for something that has always been inside?' },
  { id: 'bud-2',  text: 'Holding on to anger is like drinking poison and expecting the other person to die.', source: 'Attributed to the Buddha', tradition: 'buddhist', reflection: 'Who are you holding anger toward — and who is it actually costing?' },
  { id: 'bud-3',  text: 'No one saves us but ourselves. No one can and no one may. We ourselves must walk the path.', source: 'Dhammapada', tradition: 'buddhist', reflection: 'What are you waiting to be saved from, that only walking forward will actually resolve?' },
  { id: 'conf-1', text: 'The superior man is modest in his speech but exceeds in his actions.',          source: 'Confucius, Analects', tradition: 'confucian',reflection: 'What have you been promising in words that you could just do?' },
  { id: 'conf-2', text: 'When you know a thing, to hold that you know it; when you do not know, to allow that you do not know — this is knowledge.', source: 'Confucius', tradition: 'confucian', reflection: 'Where are you pretending to know something you don\'t? And where are you doubting something you actually do?' },
  { id: 'conf-3', text: 'It does not matter how slowly you go, so long as you do not stop.',             source: 'Attributed to Confucius', tradition: 'confucian', reflection: 'What small steady thing are you allowed to keep doing, even when it\'s slow?' },
  { id: 'hindu-1', text: 'You are what your deep driving desire is. As your desire, so is your will. As your will, so is your deed.', source: 'Upanishads', tradition: 'hindu', reflection: 'Beneath your to-do list — what is the deepest desire shaping you today?' },
  { id: 'hindu-2', text: 'The mind is everything. What you think you become.',                            source: 'Attributed to the Buddha', tradition: 'buddhist', reflection: 'What thought, repeated daily, is shaping what you are becoming?' },
];

export function getDailyQuote(date?: Date): WisdomQuote {
  const d = date ?? new Date();
  // Day-of-year index 0-364 → quote index
  const start = new Date(d.getFullYear(), 0, 0);
  const diffMs = d.getTime() - start.getTime();
  const dayOfYear = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return WISDOM_QUOTES[dayOfYear % WISDOM_QUOTES.length];
}
