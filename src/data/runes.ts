// Elder Futhark runes — 24 staves for divination cast.
//
// Tradition: 3-rune cast reads "past / present / future" or
// "situation / action / outcome". Runes can appear reversed ("merkstave")
// which softens or reverses the meaning.

export interface Rune {
  /** Rune name in Old Norse */
  name: string;
  /** Unicode character for the rune */
  glyph: string;
  /** Rune number in Elder Futhark order (1-24) */
  number: number;
  /** Core meaning (upright) */
  upright: string;
  /** Reversed (merkstave) meaning — some runes don't reverse */
  reversed?: string;
  /** Element + natural association */
  element: string;
  /** Interpretive paragraph */
  interpretation: string;
  /** Journal prompt for this rune */
  prompt: string;
}

// The 24 staves of the Elder Futhark, in their traditional three aett (groups of 8).
export const RUNES: Rune[] = [
  // Freyr's Aett
  { name: 'Fehu', glyph: 'ᚠ', number: 1, upright: 'Wealth, abundance, beginnings', reversed: 'Loss, scarcity, frustration', element: 'Fire · Cattle', interpretation: 'Fehu is movable wealth — cattle, currency, earned abundance that can circulate. It speaks of resources flowing in, but also the responsibility to steward and share what you gain.', prompt: 'What is flowing to me right now — and how am I tending its source so it keeps flowing?' },
  { name: 'Uruz', glyph: 'ᚢ', number: 2, upright: 'Primal strength, vitality, raw courage', reversed: 'Weakness, missed strength, illness', element: 'Earth · Aurochs', interpretation: 'Uruz is the wild bull — primal, untamed, foundational. You are being called to draw on strength you may not have realised you had.', prompt: 'Where is raw strength required of me right now? What have I been calling a weakness that is actually waiting power?' },
  { name: 'Thurisaz', glyph: 'ᚦ', number: 3, upright: 'A challenge, protection through testing, a thorn', reversed: 'Recklessness, choosing the wrong fight', element: 'Fire · Thorn', interpretation: 'Thurisaz is a gatekeeper rune. Sometimes a challenge is protecting you from something worse — the thorn keeps you from the wrong door.', prompt: 'What obstacle in my path might actually be a protection?' },
  { name: 'Ansuz', glyph: 'ᚨ', number: 4, upright: 'Message, wisdom from a mentor, divine voice', reversed: 'Misunderstanding, deception, poor advice', element: 'Air · Odin', interpretation: 'Ansuz is the rune of the mouth — divine word, ancestor voice, wisdom transmitted. A message is trying to reach you. Listen.', prompt: 'What message has been repeating in my life that I keep not quite hearing?' },
  { name: 'Raidho', glyph: 'ᚱ', number: 5, upright: 'Journey, right action, the rhythm of travel', reversed: 'Disruption, wrong direction, delays', element: 'Air · Wheel', interpretation: 'Raidho is the journey — not just distance, but the right sequence of motion. It asks: are you moving in the rhythm that belongs to you?', prompt: 'Am I moving at my own rhythm, or trying to match someone else\'s?' },
  { name: 'Kenaz', glyph: 'ᚲ', number: 6, upright: 'Illumination, creative fire, revealed knowledge', reversed: 'Darkness, lost inspiration, something extinguished', element: 'Fire · Torch', interpretation: 'Kenaz is the torch — what was hidden becomes visible. Creative inspiration, hidden truth, healing through seeing clearly.', prompt: 'What has been asking to be seen clearly that I\'ve been walking around in the dark about?' },
  { name: 'Gebo', glyph: 'ᚷ', number: 7, upright: 'Gift, exchange, partnership', element: 'Air · Gift', interpretation: 'Gebo has no reversal — gift is gift. It speaks of balanced exchange, meaningful gifts given or received, true partnership where both give what they can.', prompt: 'What am I being given right now — and what am I giving in return?' },
  { name: 'Wunjo', glyph: 'ᚹ', number: 8, upright: 'Joy, success, fellowship', reversed: 'Sorrow, alienation, false joy', element: 'Earth · Joy', interpretation: 'Wunjo is the rune of hard-earned joy — not frivolous happiness, but the deep satisfaction that comes after difficulty.', prompt: 'Where have I earned my joy — and am I letting myself feel it?' },

  // Heimdall's Aett
  { name: 'Hagalaz', glyph: 'ᚺ', number: 9, upright: 'Hail, uncontrollable disruption, transformation through crisis', element: 'Water · Hail', interpretation: 'Hagalaz cannot be reversed — when it lands, it lands. It\'s the storm you didn\'t see coming. Not destruction for destruction\'s sake: the ice melts into water that nourishes the ground.', prompt: 'What have I been trying to control that actually needs to crack open?' },
  { name: 'Nauthiz', glyph: 'ᚾ', number: 10, upright: 'Need, necessity, constraint as teacher', reversed: 'Unmet need, refusing the lesson of limitation', element: 'Fire · Need', interpretation: 'Nauthiz is the rune of necessity. The thing you lack is the thing teaching you. Friction-fire — the spark that comes only from pressure.', prompt: 'What am I lacking that may be teaching me something I couldn\'t learn in abundance?' },
  { name: 'Isa', glyph: 'ᛁ', number: 11, upright: 'Stillness, waiting, freeze', element: 'Water · Ice', interpretation: 'Isa is the frozen moment. Not always bad: sometimes the pause is exactly what\'s needed. But if it persists, it becomes paralysis. Read the context.', prompt: 'What is frozen in my life right now — and is the stillness restorative, or am I stuck?' },
  { name: 'Jera', glyph: 'ᛃ', number: 12, upright: 'Harvest, cycles, reward for patience', element: 'Earth · Year', interpretation: 'Jera is the turning year. What you planted is ripening, or what you\'re planting now will ripen in its time. Respect the cycle — you cannot rush the harvest.', prompt: 'What seed have I been tending — and is it time to harvest, or still time to water?' },
  { name: 'Eihwaz', glyph: 'ᛇ', number: 13, upright: 'Endurance, the world tree, strength through deep roots', element: 'All · Yew', interpretation: 'Eihwaz is the yew tree — roots in the underworld, branches in the heavens. You are more deeply rooted than you realise. Draw from your depth.', prompt: 'What deep root in me is still alive that I have been treating as dead?' },
  { name: 'Perthro', glyph: 'ᛈ', number: 14, upright: 'Mystery, fate, the dice cup', reversed: 'Unwanted revelation, secrets kept too long', element: 'Water · Lot cup', interpretation: 'Perthro is the cup from which the lots are drawn — mystery, synchronicity, the cosmic roll. Something is being revealed or waiting to be revealed.', prompt: 'What synchronicity have I been dismissing that might actually be a sign?' },
  { name: 'Algiz', glyph: 'ᛉ', number: 15, upright: 'Protection, divine guardianship, the sanctuary', reversed: 'Vulnerability, boundary breach', element: 'Air · Elk-sedge', interpretation: 'Algiz is the elk-sedge — sharp-leaved, guarding. Divine protection is available. Also: you are being asked to hold your own boundary.', prompt: 'Where do I need to hold stronger protection around what matters to me?' },
  { name: 'Sowilo', glyph: 'ᛋ', number: 16, upright: 'Sun, wholeness, triumph, clarity', element: 'Fire · Sun', interpretation: 'Sowilo is the sun — cannot be reversed. Warmth, wholeness, success through clarity. Things are lighting up.', prompt: 'What in my life is coming into full light right now?' },

  // Tyr's Aett
  { name: 'Tiwaz', glyph: 'ᛏ', number: 17, upright: 'Honour, justice, sacrifice for truth, warrior courage', reversed: 'Injustice, dishonour, failed courage', element: 'Air · Tyr\'s spear', interpretation: 'Tiwaz is the warrior of truth — Tyr sacrificed his hand to bind Fenrir. Justice that costs you. Courage that doesn\'t brag.', prompt: 'What is right to do, even though it costs me?' },
  { name: 'Berkano', glyph: 'ᛒ', number: 18, upright: 'Birth, renewal, feminine creative power', reversed: 'Stagnation, family disruption, fertility blocked', element: 'Earth · Birch', interpretation: 'Berkano is the birch — first tree after winter. New life, fresh start, feminine creativity. Something is being born through you.', prompt: 'What new thing is being born through me? Am I creating the conditions for it to thrive?' },
  { name: 'Ehwaz', glyph: 'ᛖ', number: 19, upright: 'Partnership, trusted companion, forward movement together', reversed: 'Unfaithful partnership, going alone when you shouldn\'t', element: 'Earth · Horse', interpretation: 'Ehwaz is the horse — rider and mount as one. Trusted partnership, perfect synchrony with someone or something. Not going it alone.', prompt: 'Who is my trusted companion for this stretch? Am I allowing them to carry their share?' },
  { name: 'Mannaz', glyph: 'ᛗ', number: 20, upright: 'Humanity, self-awareness, mirror of others', reversed: 'Self-delusion, isolation, inhumanity', element: 'Air · Mankind', interpretation: 'Mannaz is the human — our reflected self. We see ourselves in each other. You are being asked to be honest about who you are, to others and to yourself.', prompt: 'What am I seeing in others that is really about me?' },
  { name: 'Laguz', glyph: 'ᛚ', number: 21, upright: 'Water, flow, intuition, the unconscious', reversed: 'Confusion, blocked intuition, drowning', element: 'Water · Lake', interpretation: 'Laguz is the water — intuition, emotion, the deep currents beneath thought. Flow with what is, don\'t dam it.', prompt: 'What is my intuition telling me right now that my logic is overriding?' },
  { name: 'Ingwaz', glyph: 'ᛜ', number: 22, upright: 'Gestation, seed, inner completion', element: 'Earth · Ing (hero-god)', interpretation: 'Ingwaz is the seed held within — gestation, hidden completion before visible growth. What is gestating in you is ready for what comes next.', prompt: 'What is already complete inside me that I haven\'t brought into the world yet?' },
  { name: 'Dagaz', glyph: 'ᛞ', number: 23, upright: 'Dawn, breakthrough, transformation, balance', element: 'Fire · Day', interpretation: 'Dagaz cannot be reversed. The dawn. Breakthrough, enlightenment, the moment when everything shifts. Transformation without destruction — integration.', prompt: 'What breakthrough have I been unable to see because I was still in the night?' },
  { name: 'Othala', glyph: 'ᛟ', number: 24, upright: 'Inheritance, ancestral wisdom, home, sacred lineage', reversed: 'Rootlessness, lost connection to origins', element: 'Earth · Ancestral property', interpretation: 'Othala is the inherited estate — sacred ground, ancestors, what you carry forward from those who came before. Home in the deepest sense.', prompt: 'What have I inherited — not material, but essence — that is asking to be honoured?' },
];

export interface RuneCastResult {
  runes: Array<{ rune: Rune; reversed: boolean; position: 'past' | 'present' | 'future' }>;
}

export function castRunes(): RuneCastResult {
  // Draw 3 without replacement
  const indices = new Set<number>();
  while (indices.size < 3) {
    indices.add(Math.floor(Math.random() * RUNES.length));
  }
  const positions: Array<'past' | 'present' | 'future'> = ['past', 'present', 'future'];
  return {
    runes: Array.from(indices).map((i, idx) => ({
      rune: RUNES[i],
      // ~30% reversal rate (some runes aren't reversible but our UI can show them upright anyway)
      reversed: Math.random() < 0.3 && !!RUNES[i].reversed,
      position: positions[idx],
    })),
  };
}
