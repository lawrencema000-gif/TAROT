// Dice Oracle — Greek/Roman astragaloi tradition, simplified.
//
// Roll three six-sided dice, sum 3-18. Each sum gets a short reading.
// Historical practice used astragaloi (knucklebones) with four-sided
// rolls; three standard dice approximate the tradition for modern use.

export interface DiceReading {
  sum: number;
  rolls: [number, number, number];
  title: string;
  reading: string;
  prompt: string;
}

const SUM_MEANINGS: Record<number, { title: string; reading: string; prompt: string }> = {
  3:  { title: 'A Quiet Beginning',    reading: 'The smallest possible roll. Something subtle is starting — don\'t miss it by looking for drama.', prompt: 'What small new thing in my life deserves attention?' },
  4:  { title: 'Hold Your Ground',     reading: 'A call to stay where you are. The situation is fragile; movement would destabilise it.', prompt: 'Where am I tempted to move that would actually be premature?' },
  5:  { title: 'A Letter Arrives',     reading: 'News comes — or already has. Watch messages, conversations, synchronicities over the next few days.', prompt: 'What message have I dismissed recently that might have been important?' },
  6:  { title: 'The Path Forks',       reading: 'A choice is near. The dice say: consult your own voice before anyone else\'s.', prompt: 'What choice am I facing — and whose voice keeps drowning out my own?' },
  7:  { title: 'Unexpected Help',      reading: 'Something you need is already on its way from a source you aren\'t looking toward.', prompt: 'Where am I looking only to the usual places for help?' },
  8:  { title: 'Patience',             reading: 'The answer you want will not arrive on your schedule. Keep acting well while you wait.', prompt: 'What am I trying to rush that would be better if I waited?' },
  9:  { title: 'Honest Labour',        reading: 'Simple, persistent effort is the reading. No tricks. Show up every day.', prompt: 'What practice am I about to abandon that actually just needs more time?' },
  10: { title: 'Balance Point',        reading: 'You are at a pivot. Neither here nor there. Notice what the balance is asking you to weigh.', prompt: 'If I set everything down for one minute, what would matter most?' },
  11: { title: 'Spark',                reading: 'Quick action is possible now. A window is open — but brief. Move in the next few days.', prompt: 'What opportunity is currently open that I\'ve been hesitating on?' },
  12: { title: 'Full House',           reading: 'Abundance, but also responsibility. The full cup must not spill.', prompt: 'What am I receiving right now that I haven\'t quite acknowledged?' },
  13: { title: 'The Threshold',        reading: 'Thirteen is traditionally liminal — not unlucky, just in-between. You are neither there nor here.', prompt: 'What is ending and what is beginning in me right now?' },
  14: { title: 'Tested Strength',      reading: 'Your resolve is being measured. Not cruelly — this is the teaching.', prompt: 'What quality in me is being forged right now?' },
  15: { title: 'Council',              reading: 'Seek a third perspective. You cannot see this one alone — and that is not a weakness.', prompt: 'Who has perspective on my situation that I haven\'t asked?' },
  16: { title: 'Triumph Earned',       reading: 'Success is visible. The feeling is real. Don\'t minimise it.', prompt: 'What have I accomplished that I haven\'t let myself fully acknowledge?' },
  17: { title: 'Proceed Boldly',       reading: 'The dice favour courage here. Not recklessness — but a clean, decisive step forward.', prompt: 'What bold move have I been putting off, and what am I actually afraid of?' },
  18: { title: 'Peak Power',           reading: 'The highest roll. All dice on six. Full alignment between what you want and what the moment offers. Do not squander it.', prompt: 'How do I use the rare alignment of this moment without burning it?' },
};

export function rollDice(): DiceReading {
  const r1 = Math.floor(Math.random() * 6) + 1;
  const r2 = Math.floor(Math.random() * 6) + 1;
  const r3 = Math.floor(Math.random() * 6) + 1;
  const sum = r1 + r2 + r3;
  const meaning = SUM_MEANINGS[sum];
  return {
    sum,
    rolls: [r1, r2, r3],
    title: meaning.title,
    reading: meaning.reading,
    prompt: meaning.prompt,
  };
}
